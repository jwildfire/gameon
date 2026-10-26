// The intake service's routes:
//
//   POST /ideas   file a kid's idea in the private ideas repo
//   GET  /queue   the idea line, without any idea's words, cached for about a minute
//   POST /auth/google           check a Google ID token, answer with a session token
//   GET  /auth/github/start     send the browser to GitHub to sign in
//   GET  /auth/github/callback  back from GitHub: on to the page with a session token
//   GET  /        a health check
//
// deps holds everything from outside (fetch, the clock, the cache) so tests can fake it.
import { MAX_BODY_BYTES, buildIssue, validateIdea } from "./idea.js";
import { createIssue, ideasToken } from "./github.js";
import { bump, count, familyFor, ipKey, limit, turnstileOk } from "./limits.js";
import { refusal } from "./messages.js";
import { buildQueue } from "./queue.js";
import { identityKey, issueSession, readSession } from "./session.js";
import { verifyGoogleToken } from "./google.js";
import { githubCallback, githubStart } from "./github-signin.js";
import { lookup, noteIdea, openIssue, providerName } from "./allowlist.js";

const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
const QUEUE_CACHE_KEY = "https://gameon-intake.internal/queue/v1";

export function allowedOrigin(env, origin) {
  if (!origin) return false;
  const list = String(env.ALLOWED_ORIGINS || "https://jwildfire.github.io").split(",").map(s => s.trim()).filter(Boolean);
  if (list.includes(origin)) return true;
  return env.ALLOW_LOCALHOST !== "false" && LOCALHOST.test(origin);
}

function corsHeaders(env, request) {
  const origin = request.headers.get("Origin");
  const h = { "Vary": "Origin" };
  if (allowedOrigin(env, origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

function json(env, request, status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(env, request), ...extra }
  });
}

function send(env, request, r) {
  return json(env, request, r.status, r.body, { "Cache-Control": "no-store" });
}

export async function handle(request, env, ctx, deps) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: allowedOrigin(env, origin) ? 204 : 403, headers: corsHeaders(env, request) });
  }
  // GitHub sign-in is a page the browser goes to, not a call from the page; its own state
  // check protects it.
  if (path === "/auth/github/start" && request.method === "GET") return githubStart(request, env, deps);
  if (path === "/auth/github/callback" && request.method === "GET") return githubCallback(request, env, ctx, deps);
  // Browsers always send Origin on a POST; curl doesn't, and that's fine for checking.
  if (origin && !allowedOrigin(env, origin)) return send(env, request, refusal("bad_origin", 403));

  if (path === "/ideas" && request.method === "POST") return postIdea(request, env, deps);
  if (path === "/queue" && request.method === "GET") return getQueue(request, env, ctx, deps);
  if (path === "/auth/google" && request.method === "POST") return postGoogle(request, env, deps);
  if (path === "/" && request.method === "GET") return json(env, request, 200, { ok: true, service: "gameon-intake" });
  return send(env, request, refusal("not_found", 404));
}

async function readJson(request) {
  if (!/application\/json/i.test(request.headers.get("Content-Type") || "")) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { tooBig: true };
  try { return { value: JSON.parse(text) }; } catch (e) { return null; }
}

async function postIdea(request, env, deps) {
  const parsed = await readJson(request);
  if (!parsed) return send(env, request, refusal("bad_request", 400));
  if (parsed.tooBig) return send(env, request, refusal("too_long", 413));
  const checked = validateIdea(parsed.value);
  if (!checked.ok) return send(env, request, refusal(checked.error, 400));
  const idea = checked.idea;

  const now = deps.now();
  const device = await ipKey(request);
  let family = "";
  let who = null, allow = null, token = null;

  if (idea.code) {
    if (await count(env, "badcode", device, now) >= limit(env, "LIMIT_BAD_CODES_PER_IP_PER_DAY")) {
      return send(env, request, refusal("too_many_codes", 429));
    }
    family = await familyFor(env, idea.code);
    if (!family) {
      await bump(env, "badcode", device, now);
      return send(env, request, refusal("bad_code", 403));
    }
    if (await count(env, "code", idea.code, now) >= limit(env, "LIMIT_PER_CODE_PER_DAY")) {
      return send(env, request, refusal("limit_family", 429));
    }
  } else if (idea.session) {
    // Signed in with Google or GitHub: the session token stands in for the robot check.
    try { who = env.SESSION_SECRET ? await readSession(env, idea.session, now) : null; } catch (e) { who = null; }
    if (!who) return send(env, request, refusal("signed_out", 401));
    if (await count(env, "signin", identityKey(who), now) >= limit(env, "LIMIT_PER_SIGNIN_PER_DAY")) {
      return send(env, request, refusal("limit_signin", 429));
    }
    try {
      token = await ideasToken(env, deps);
      allow = await lookup(env, deps, token, who);
    } catch (e) {
      console.error("intake: reading the allowlist failed:", e && e.message);
      return send(env, request, refusal("server", 502));
    }
    // Ideas nobody has vouched for yet share the daily cap with anonymous ones.
    if (allow.decision !== "allowed" && await count(env, "unknown-all", "all", now) >= limit(env, "LIMIT_UNKNOWN_PER_DAY")) {
      return send(env, request, refusal("limit_busy", 429));
    }
  } else {
    if (await count(env, "unknown-ip", device, now) >= limit(env, "LIMIT_PER_IP_UNKNOWN_PER_DAY")) {
      return send(env, request, refusal("limit_device", 429));
    }
    if (await count(env, "unknown-all", "all", now) >= limit(env, "LIMIT_UNKNOWN_PER_DAY")) {
      return send(env, request, refusal("limit_busy", 429));
    }
    if (!idea.turnstile) return send(env, request, refusal("need_check", 400));
    let passed = false;
    try { passed = await turnstileOk(env, deps, idea.turnstile, request); } catch (e) { return send(env, request, refusal("server", 500)); }
    if (!passed) return send(env, request, refusal("check_failed", 403));
  }

  const known = !!family || !!(allow && allow.decision === "allowed");
  let signedIn = null;
  if (who) {
    const where = allow.issue
      ? `allowlist #${allow.issue} (${allow.decision})`
      : "first idea from them, so a new allowlist issue links here";
    signedIn = { known, line: `With ${providerName(who)} · ${where}` };
  }

  let created;
  try {
    created = await createIssue(env, deps, buildIssue(idea, family, signedIn));
  } catch (e) {
    console.error("intake: filing the idea failed:", e && e.message);
    return send(env, request, refusal("server", 502));
  }

  // Count it only once it's filed, so a GitHub hiccup doesn't use up a kid's idea.
  if (family) await bump(env, "code", idea.code, now);
  else if (who) {
    await bump(env, "signin", identityKey(who), now);
    if (!known) await bump(env, "unknown-all", "all", now);
    if (allow.issue) await noteIdea(env, deps, token, allow.issue, created.number, allow.decision);
    else await openIssue(env, deps, token, who, created.number);
  } else { await bump(env, "unknown-ip", device, now); await bump(env, "unknown-all", "all", now); }

  const body = { ok: true, number: created.number, status: "status: submitted", submitter: known ? "known" : "unknown" };
  if (who) body.signed_in = true;
  return send(env, request, { status: 201, body });
}

// POST /auth/google {"credential": "<Google ID token>"} -> {"ok":true,"session":"s1.…","name":"…"}
async function postGoogle(request, env, deps) {
  if (!env.GOOGLE_CLIENT_ID || !env.SESSION_SECRET) return send(env, request, refusal("signin_off", 503));
  const parsed = await readJson(request);
  if (!parsed || parsed.tooBig || !parsed.value || typeof parsed.value.credential !== "string") {
    return send(env, request, refusal("bad_request", 400));
  }
  let checked;
  try {
    checked = await verifyGoogleToken(env, deps, parsed.value.credential);
  } catch (e) {
    console.error("intake: checking the Google token failed:", e && e.message);
    return send(env, request, refusal("server", 502));
  }
  if (!checked.ok) {
    console.log("intake: Google sign-in refused:", checked.why);
    return send(env, request, refusal("signin_failed", 401));
  }
  const { token, data } = await issueSession(env, checked.identity, deps.now());
  return send(env, request, { status: 200, body: { ok: true, provider: "google", name: data.name, session: token } });
}

async function getQueue(request, env, ctx, deps) {
  const seconds = Math.max(0, parseInt(env.QUEUE_CACHE_SECONDS, 10) || 60);
  const cache = deps.cache;
  let body = null;
  if (cache && seconds) {
    const hit = await cache.match(QUEUE_CACHE_KEY);
    if (hit) body = await hit.text();
  }
  if (!body) {
    try {
      body = JSON.stringify(await buildQueue(env, deps));
    } catch (e) {
      console.error("intake: reading the queue failed:", e && e.message);
      return send(env, request, refusal("queue_down", 502));
    }
    if (cache && seconds) {
      const put = cache.put(QUEUE_CACHE_KEY, new Response(body, {
        headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${seconds}` }
      }));
      if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
    }
  }
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${seconds}`, ...corsHeaders(env, request) }
  });
}
