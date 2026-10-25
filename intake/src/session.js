// Session tokens: the Worker's own proof that someone signed in with Google or GitHub.
//
//   s1.<payload>.<signature>
//
// payload is base64url JSON { p: "google"|"github", sub, name, email | login, iat, exp } and
// signature is HMAC-SHA256 over "session.<payload>" with the SESSION_SECRET secret. The page
// keeps the token on the device and sends it with each idea in place of a Turnstile token.
// It holds the sender's own email or login, which only ever goes into the private
// gameon-ideas repo, never /queue.
//
// The same signing protects the GitHub sign-in's `state` ("state.<payload>").
import { base64url } from "./github.js";

export const SESSION_DAYS = 30;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function fromBase64url(text) {
  const b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const keyCache = new Map();
function hmacKey(secret) {
  if (typeof secret !== "string" || secret.length < 16) throw new Error("SESSION_SECRET is missing or too short");
  if (!keyCache.has(secret)) {
    keyCache.set(secret, crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]));
  }
  return keyCache.get(secret);
}

// sign("session", {...}) -> "<payload>.<signature>"
export async function sign(purpose, secret, data) {
  const payload = base64url(enc.encode(JSON.stringify(data)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${purpose}.${payload}`));
  return `${payload}.${base64url(sig)}`;
}

// Returns the data, or null if the signature doesn't match or it has expired (exp, in seconds).
export async function verify(purpose, secret, token, nowMs) {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  let ok = false, data = null;
  try {
    // crypto.subtle.verify compares in constant time.
    ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64url(parts[1]), enc.encode(`${purpose}.${parts[0]}`));
    if (ok) data = JSON.parse(dec.decode(fromBase64url(parts[0])));
  } catch (e) {
    if (/SESSION_SECRET/.test(e && e.message)) throw e;
    return null;
  }
  if (!ok || !data || typeof data !== "object") return null;
  if (!(typeof data.exp === "number" && data.exp * 1000 > nowMs)) return null;
  return data;
}

// Display names come from Google or GitHub, so keep them short and plain.
export function cleanName(value, max = 60) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f<>`]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

// identity: { provider, sub, name, email } or { provider, sub, name, login }
export async function issueSession(env, identity, nowMs) {
  const now = Math.floor(nowMs / 1000);
  const data = { p: identity.provider, sub: String(identity.sub), name: cleanName(identity.name) || identity.login || "Someone", iat: now, exp: now + SESSION_DAYS * 86400 };
  if (identity.email) data.email = String(identity.email).slice(0, 200);
  if (identity.login) data.login = String(identity.login).slice(0, 60);
  return { token: `s1.${await sign("session", env.SESSION_SECRET, data)}`, data };
}

// Returns { provider, sub, name, email, login } or null.
export async function readSession(env, token, nowMs) {
  if (typeof token !== "string" || !token.startsWith("s1.")) return null;
  const data = await verify("session", env.SESSION_SECRET, token.slice(3), nowMs);
  if (!data || !["google", "github"].includes(data.p) || typeof data.sub !== "string" || !data.sub) return null;
  return {
    provider: data.p,
    sub: data.sub,
    name: cleanName(data.name) || "Someone",
    email: typeof data.email === "string" ? data.email : "",
    login: typeof data.login === "string" ? data.login : ""
  };
}

export function identityKey(who) {
  return `${who.provider}:${who.sub}`;
}
