// Checking a Google ID token from Google Identity Services ("Sign in with Google").
//
// The page gets the token from Google and posts it to POST /auth/google. No Google secret is
// needed: the token is an RS256 JWT signed with one of Google's published keys (the JWKS),
// and it's for us only if its `aud` is our client ID (GOOGLE_CLIENT_ID in wrangler.toml).
import { fromBase64url } from "./session.js";

export const GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const SKEW = 60; // seconds of clock drift allowed
const dec = new TextDecoder();

// Google rotates its keys every few weeks and says how long to keep them (Cache-Control).
let jwksCache = null; // { keys: Map kid -> CryptoKey promise, expires, fetched }
export function clearJwksCache() { jwksCache = null; }

async function loadJwks(deps) {
  const res = await deps.fetch(GOOGLE_JWKS);
  if (!res.ok) throw new Error(`Google JWKS: HTTP ${res.status}`);
  const data = await res.json();
  const m = /max-age=(\d+)/.exec(res.headers.get("Cache-Control") || "");
  const seconds = Math.min(m ? parseInt(m[1], 10) : 3600, 24 * 3600);
  const keys = new Map();
  for (const jwk of (data && data.keys) || []) {
    if (jwk && jwk.kty === "RSA" && jwk.kid && (!jwk.alg || jwk.alg === "RS256")) {
      keys.set(jwk.kid, crypto.subtle.importKey("jwk", { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]));
    }
  }
  jwksCache = { keys, expires: deps.now() + seconds * 1000, fetched: deps.now() };
  return jwksCache;
}

async function keyFor(deps, kid) {
  let cache = jwksCache;
  if (!cache || cache.expires <= deps.now()) cache = await loadJwks(deps);
  // A kid we haven't seen may be a fresh rotation: refetch, but at most once a minute.
  if (!cache.keys.has(kid) && deps.now() - cache.fetched > 60 * 1000) cache = await loadJwks(deps);
  return cache.keys.has(kid) ? cache.keys.get(kid) : null;
}

function part(text) {
  return JSON.parse(dec.decode(fromBase64url(text)));
}

// Returns { ok: true, identity } or { ok: false, why }. why is for logs and tests only.
export async function verifyGoogleToken(env, deps, token) {
  const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  if (!clientId) return { ok: false, why: "not_configured" };
  if (typeof token !== "string" || token.length > 8192) return { ok: false, why: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, why: "malformed" };
  let header, claims;
  try { header = part(parts[0]); claims = part(parts[1]); } catch (e) { return { ok: false, why: "malformed" }; }
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string") return { ok: false, why: "alg" };

  const key = await keyFor(deps, header.kid);
  if (!key) return { ok: false, why: "unknown_key" };
  let good = false;
  try {
    good = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", await key, fromBase64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch (e) { good = false; }
  if (!good) return { ok: false, why: "signature" };

  const now = Math.floor(deps.now() / 1000);
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(clientId)) return { ok: false, why: "aud" };
  if (!ISSUERS.includes(claims.iss)) return { ok: false, why: "iss" };
  if (typeof claims.exp !== "number" || claims.exp + SKEW <= now) return { ok: false, why: "expired" };
  if (typeof claims.iat === "number" && claims.iat - SKEW > now) return { ok: false, why: "future" };
  if (claims.email_verified !== true && claims.email_verified !== "true") return { ok: false, why: "email_unverified" };
  if (typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string" || !claims.email) return { ok: false, why: "claims" };

  return {
    ok: true,
    identity: {
      provider: "google",
      sub: claims.sub,
      email: claims.email,
      name: claims.name || claims.given_name || claims.email.split("@")[0]
    }
  };
}
