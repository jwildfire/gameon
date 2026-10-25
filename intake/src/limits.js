// Daily limits, family codes and the Turnstile check.
//
// Counters live in the INTAKE_KV namespace as rl:<kind>:<who>:<YYYY-MM-DD>, expiring after
// two days. KV is eventually consistent, so two ideas sent in the same second can both
// get through; for a family arcade that's fine. IP addresses are stored only as hashes.

const DEFAULTS = {
  LIMIT_PER_CODE_PER_DAY: 2,        // ideas per family code
  LIMIT_PER_IP_UNKNOWN_PER_DAY: 1,  // ideas without a code, per device (IP)
  LIMIT_UNKNOWN_PER_DAY: 10,        // ideas without a code, from everyone together
  LIMIT_BAD_CODES_PER_IP_PER_DAY: 5 // wrong family codes per device before it's refused
};

export function limit(env, name) {
  const n = parseInt(env[name], 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULTS[name];
}

export function day(nowMs) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function ipKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  return (await sha256(`gameon-intake:${ip}`)).slice(0, 32);
}

function counterKey(kind, who, nowMs) {
  return `rl:${kind}:${who}:${day(nowMs)}`;
}

export async function count(env, kind, who, nowMs) {
  if (!env.INTAKE_KV) return 0;
  return parseInt(await env.INTAKE_KV.get(counterKey(kind, who, nowMs)), 10) || 0;
}

export async function bump(env, kind, who, nowMs) {
  if (!env.INTAKE_KV) return;
  const key = counterKey(kind, who, nowMs);
  const n = (parseInt(await env.INTAKE_KV.get(key), 10) || 0) + 1;
  await env.INTAKE_KV.put(key, String(n), { expirationTtl: 2 * 24 * 60 * 60 });
}

// Family codes: the FAMILY_CODES secret, a JSON object of code -> family nickname, or a KV
// key family:<code> holding the nickname. Codes compare in lower case. Never commit a code.
export async function familyFor(env, code) {
  if (!code) return "";
  if (env.FAMILY_CODES) {
    let map = {};
    try { map = JSON.parse(env.FAMILY_CODES); } catch (e) { map = {}; }
    for (const [k, v] of Object.entries(map && typeof map === "object" ? map : {})) {
      if (typeof v === "string" && v && k.trim().toLowerCase() === code) return v;
    }
  }
  if (env.INTAKE_KV) {
    const v = await env.INTAKE_KV.get(`family:${code}`);
    if (typeof v === "string" && v) return v;
  }
  return "";
}

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function turnstileOk(env, deps, token, request) {
  if (!env.TURNSTILE_SECRET) throw new Error("TURNSTILE_SECRET is missing");
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);
  const res = await deps.fetch(SITEVERIFY, { method: "POST", body: form });
  // Log Cloudflare's reason when the check fails (the codes aren't secret), so a wrong
  // TURNSTILE_SECRET shows up as "invalid-input-secret" in `wrangler tail`.
  let data = null;
  try { data = await res.json(); } catch (e) {}
  const ok = res.ok && !!data && data.success === true;
  if (!ok) console.log("turnstile failed", res.status, JSON.stringify((data && data["error-codes"]) || []));
  return ok;
}
