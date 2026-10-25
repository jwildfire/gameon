// Talking to GitHub as the GameOn GitHub App (gameon-bot), with WebCrypto only.
//
//   1. Sign a short JWT with the app's private key (RS256). The key must be PKCS#8
//      ("-----BEGIN PRIVATE KEY-----"); GitHub hands out PKCS#1, so convert it first with
//      openssl pkcs8 -topk8 -nocrypt (intake/README.md).
//   2. Swap the JWT for an installation token, narrowed to the repos and permissions asked for.
//   3. Call the REST API with that token.

const API = "https://api.github.com";
const enc = new TextEncoder();

export function base64url(bytes) {
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pemToDer(pem) {
  if (typeof pem !== "string" || !pem.trim()) throw new Error("APP_PRIVATE_KEY is missing");
  const text = pem.replace(/\\n/g, "\n"); // a key pasted with literal \n still works
  if (/BEGIN RSA PRIVATE KEY/.test(text)) {
    throw new Error("APP_PRIVATE_KEY is PKCS#1. Convert it with: openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem");
  }
  const m = /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/.exec(text);
  if (!m) throw new Error("APP_PRIVATE_KEY isn't a PKCS#8 PEM (-----BEGIN PRIVATE KEY-----)");
  const bin = atob(m[1].replace(/\s+/g, ""));
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

const keyCache = new Map();
async function signingKey(pem) {
  if (!keyCache.has(pem)) {
    keyCache.set(pem, crypto.subtle.importKey("pkcs8", pemToDer(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]));
  }
  try { return await keyCache.get(pem); } catch (e) { keyCache.delete(pem); throw e; }
}

// GitHub wants iat a little in the past (clock drift) and exp at most 10 minutes ahead.
export async function appJwt(appId, pem, nowMs) {
  if (!appId) throw new Error("APP_ID is missing");
  const now = Math.floor(nowMs / 1000);
  const header = base64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(enc.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) })));
  const data = `${header}.${payload}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await signingKey(pem), enc.encode(data));
  return `${data}.${base64url(sig)}`;
}

function headers(auth) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": auth,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gameon-intake"
  };
}

export class GitHubError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Installation tokens last an hour; keep each one until five minutes before it runs out.
const tokenCache = new Map();
export function clearTokenCache() { tokenCache.clear(); keyCache.clear(); }

export async function installationToken(env, deps, scope) {
  const key = JSON.stringify(scope);
  const hit = tokenCache.get(key);
  const now = deps.now();
  if (hit && hit.expires - now > 5 * 60 * 1000) return hit.token;
  if (!env.INSTALLATION_ID) throw new Error("INSTALLATION_ID is missing");
  const jwt = await appJwt(env.APP_ID, env.APP_PRIVATE_KEY, now);
  const res = await deps.fetch(`${API}/app/installations/${encodeURIComponent(env.INSTALLATION_ID)}/access_tokens`, {
    method: "POST",
    headers: { ...headers(`Bearer ${jwt}`), "Content-Type": "application/json" },
    body: JSON.stringify(scope)
  });
  if (!res.ok) throw new GitHubError(`installation token: HTTP ${res.status}`, res.status);
  const data = await res.json();
  const expires = Date.parse(data.expires_at) || now + 50 * 60 * 1000;
  tokenCache.set(key, { token: data.token, expires });
  return data.token;
}

export function repoName(fullName) {
  return String(fullName).split("/")[1];
}

export async function api(deps, token, path, { method = "GET", body } = {}) {
  const init = { method, headers: headers(token ? `Bearer ${token}` : undefined) };
  if (!token) delete init.headers.Authorization;
  if (body !== undefined) { init.body = JSON.stringify(body); init.headers["Content-Type"] = "application/json"; }
  const res = await deps.fetch(`${API}${path}`, init);
  if (!res.ok) throw new GitHubError(`${method} ${path}: HTTP ${res.status}`, res.status);
  return res.json();
}

// The token for filing ideas: Issues read and write on the ideas repo, nothing else.
export function ideasToken(env, deps) {
  return installationToken(env, deps, { repositories: [repoName(env.IDEAS_REPO)], permissions: { issues: "write" } });
}

export async function createIssue(env, deps, issue) {
  const token = await ideasToken(env, deps);
  return api(deps, token, `/repos/${env.IDEAS_REPO}/issues`, { method: "POST", body: issue });
}
