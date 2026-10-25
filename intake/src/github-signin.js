// "Sign in with GitHub", through the GameOn GitHub App's user authorization.
//
//   GET /auth/github/start?return=<New Game page>
//       -> sets a short cookie with a random nonce, and sends the browser to GitHub with a
//          signed `state` holding the nonce and where to go back to.
//   GET /auth/github/callback?code=…&state=…
//       -> checks the state's signature, expiry and nonce (against the cookie, so a link
//          someone else started can't sign you in as them), swaps the code for a user token
//          with GITHUB_CLIENT_SECRET, reads the user's id, login and name, throws the token
//          away, and sends the browser back to the page with #gameon_session=<session token>.
//
// Errors go back to the page as #gameon_signin_error=<code>. GITHUB_CLIENT_ID (public) is in
// wrangler.toml; GITHUB_CLIENT_SECRET and SESSION_SECRET are Worker secrets.
import { base64url } from "./github.js";
import { issueSession, sign, verify } from "./session.js";

const AUTHORIZE = "https://github.com/login/oauth/authorize";
const TOKEN = "https://github.com/login/oauth/access_token";
const API = "https://api.github.com";
const COOKIE = "gameon_gh_state";
const STATE_MINUTES = 10;
const DEFAULT_RETURNS = "https://jwildfire.github.io/gameon/new/,https://jwildfire.github.io/gameon/dev/new/";
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

// The only places a session token is ever sent: the New Game page on main and on dev (and,
// for testing, any page on localhost unless ALLOW_LOCALHOST is "false").
export function returnUrl(env, value) {
  if (typeof value !== "string" || value.length > 500) return "";
  let u;
  try { u = new URL(value); } catch (e) { return ""; }
  if (u.username || u.password) return "";
  const clean = u.origin + u.pathname.replace(/index\.html$/, "");
  const list = String(env.SIGNIN_RETURN_URLS || DEFAULT_RETURNS).split(",").map(s => s.trim()).filter(Boolean);
  if (list.includes(clean)) return clean;
  if (env.ALLOW_LOCALHOST !== "false" && LOCAL.test(u.origin)) return clean;
  return "";
}

function redirect(location, extra = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", ...extra }
  });
}

function backWithError(ret, code) {
  return redirect(`${ret}#gameon_signin_error=${code}`, { "Set-Cookie": clearCookie() });
}

function clearCookie() {
  return `${COOKIE}=; Max-Age=0; Path=/auth/github; HttpOnly; Secure; SameSite=Lax`;
}

function plain(status, text) {
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

function readCookie(request, name) {
  const all = request.headers.get("Cookie") || "";
  for (const piece of all.split(";")) {
    const i = piece.indexOf("=");
    if (i > 0 && piece.slice(0, i).trim() === name) return piece.slice(i + 1).trim();
  }
  return "";
}

export function configured(env) {
  return !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET);
}

function callbackUrl(env, request) {
  return env.GITHUB_CALLBACK_URL || new URL("/auth/github/callback", request.url).href;
}

export async function githubStart(request, env, deps) {
  const ret = returnUrl(env, new URL(request.url).searchParams.get("return"));
  if (!ret) return plain(400, "Sign-in has to start from the GameOn New Game page.");
  if (!configured(env)) return backWithError(ret, "unavailable");
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(18)));
  const exp = Math.floor(deps.now() / 1000) + STATE_MINUTES * 60;
  const state = await sign("state", env.SESSION_SECRET, { n: nonce, r: ret, exp });
  const to = new URL(AUTHORIZE);
  to.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  to.searchParams.set("redirect_uri", callbackUrl(env, request));
  to.searchParams.set("state", state);
  return redirect(to.href, {
    "Set-Cookie": `${COOKIE}=${nonce}; Max-Age=${STATE_MINUTES * 60}; Path=/auth/github; HttpOnly; Secure; SameSite=Lax`
  });
}

export async function githubCallback(request, env, ctx, deps) {
  const q = new URL(request.url).searchParams;
  if (!env.SESSION_SECRET) return plain(503, "Sign-in isn't set up yet. Go back to GameOn and just send your idea.");
  const state = await verify("state", env.SESSION_SECRET, q.get("state") || "", deps.now());
  const ret = state && returnUrl(env, state.r);
  if (!ret) return plain(400, "That sign-in link has expired or isn't ours. Go back to GameOn and try again.");
  const nonce = readCookie(request, COOKIE);
  if (!nonce || nonce !== state.n) return backWithError(ret, "state");
  if (q.get("error")) return backWithError(ret, "cancelled");
  const code = q.get("code");
  if (!code || code.length > 200) return backWithError(ret, "state");
  if (!configured(env)) return backWithError(ret, "unavailable");

  let user;
  try {
    const res = await deps.fetch(TOKEN, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "User-Agent": "gameon-intake" },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: callbackUrl(env, request) })
    });
    const tok = res.ok ? await res.json() : null;
    if (!tok || !tok.access_token) {
      console.error("intake: GitHub code exchange failed:", tok && tok.error);
      return backWithError(ret, "github");
    }
    const ures = await deps.fetch(`${API}/user`, {
      headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${tok.access_token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "gameon-intake" }
    });
    user = ures.ok ? await ures.json() : null;
    // We only needed the token to learn who this is. Revoke it (best effort).
    const revoke = deps.fetch(`${API}/applications/${encodeURIComponent(env.GITHUB_CLIENT_ID)}/token`, {
      method: "DELETE",
      headers: { "Accept": "application/vnd.github+json", "Authorization": "Basic " + btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`), "Content-Type": "application/json", "User-Agent": "gameon-intake" },
      body: JSON.stringify({ access_token: tok.access_token })
    }).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(revoke);
  } catch (e) {
    console.error("intake: GitHub sign-in failed:", e && e.message);
    return backWithError(ret, "github");
  }
  if (!user || typeof user.id !== "number" || typeof user.login !== "string") return backWithError(ret, "github");

  const { token } = await issueSession(env, { provider: "github", sub: String(user.id), login: user.login, name: user.name || user.login }, deps.now());
  return redirect(`${ret}#gameon_session=${token}`, { "Set-Cookie": clearCookie() });
}
