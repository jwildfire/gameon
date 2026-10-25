// Fakes for the intake tests: GitHub, Turnstile, KV and the Cache API.
import { generateKeyPairSync, sign as rsaSign } from "node:crypto";
import { clearTokenCache } from "../src/github.js";
import { clearJwksCache } from "../src/google.js";
import { handle } from "../src/handler.js";

export const keys = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

export class FakeKV {
  constructor(seed = {}) { this.map = new Map(Object.entries(seed)); this.puts = []; }
  async get(key) { return this.map.has(key) ? this.map.get(key) : null; }
  async put(key, value, opts) { this.map.set(key, String(value)); this.puts.push({ key, value: String(value), opts }); }
  async delete(key) { this.map.delete(key); }
}

// A stand-in for Google's signing key, published as a JWKS with kid "test-kid".
export const googleKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
export const GOOGLE_CLIENT_ID = "1234-test.apps.googleusercontent.com";
const b64u = buf => Buffer.from(buf).toString("base64url");

export function googleJwks() {
  const jwk = googleKeys.publicKey.export({ format: "jwk" });
  return { keys: [{ ...jwk, kid: "test-kid", alg: "RS256", use: "sig" }] };
}

// A Google ID token. over changes claims; key and kid let a test sign it wrongly.
export function googleToken(over = {}, { nowSec = Math.floor(Date.parse("2026-10-24T18:04:00Z") / 1000), key = googleKeys.privateKey, kid = "test-kid", alg = "RS256" } = {}) {
  const claims = {
    iss: "https://accounts.google.com", aud: GOOGLE_CLIENT_ID, sub: "110000000000000000001",
    email: "grownup@example.com", email_verified: true, name: "Pat Grownup",
    iat: nowSec - 30, exp: nowSec + 3600, ...over
  };
  for (const k of Object.keys(claims)) if (claims[k] === undefined) delete claims[k];
  const data = `${b64u(JSON.stringify({ alg, kid, typ: "JWT" }))}.${b64u(JSON.stringify(claims))}`;
  return `${data}.${b64u(rsaSign("sha256", Buffer.from(data), key))}`;
}

export class FakeCache {
  constructor() { this.store = new Map(); }
  async match(key) { return this.store.has(key) ? new Response(this.store.get(key)) : undefined; }
  async put(key, res) { this.store.set(key, await res.text()); }
}

// A tiny GitHub and Turnstile. Every call is recorded in `calls`.
export function fakeWorld({ turnstile = true, github = {} } = {}) {
  const calls = [];
  const issues = [];
  const state = {
    calls,
    issues,
    failCreate: false,
    repos: github.repos || {},          // "owner/name" -> { issues: [...], comments: [...] }, or { fail: true }
    tokenStatus: github.tokenStatus || 201,
    events: {},                         // issue number -> its events, for the allowlist
    comments: [],                       // comments the Worker posted: { number, body }
    jwksFetches: 0,
    // GitHub sign-in: codes GitHub would accept, and the user each one belongs to.
    oauthCodes: { "good-code": { id: 4242, login: "grownup-gh", name: "Gee Grownup" } },
    revoked: []
  };
  state.fetch = async (url, init = {}) => {
    const u = new URL(typeof url === "string" ? url : url.url);
    const call = { url: u.href, path: u.pathname + u.search, method: init.method || "GET", headers: init.headers || {}, body: init.body };
    calls.push(call);
    if (u.host === "challenges.cloudflare.com") {
      const form = init.body;
      call.form = Object.fromEntries(form.entries());
      return Response.json({ success: typeof turnstile === "function" ? turnstile(call.form) : turnstile });
    }
    if (u.host === "www.googleapis.com" && u.pathname === "/oauth2/v3/certs") {
      state.jwksFetches++;
      return Response.json(googleJwks(), { headers: { "Cache-Control": "public, max-age=20000" } });
    }
    if (u.host === "github.com" && u.pathname === "/login/oauth/access_token") {
      call.json = JSON.parse(init.body);
      const user = state.oauthCodes[call.json.code];
      if (!user || call.json.client_secret !== "test-gh-client-secret") return Response.json({ error: "bad_verification_code" });
      return Response.json({ access_token: "ghu_fake_" + user.id, token_type: "bearer" });
    }
    if (u.host !== "api.github.com") throw new Error("unexpected fetch " + u.href);
    if (u.pathname === "/user") {
      const auth = (init.headers || {}).Authorization || "";
      const user = Object.values(state.oauthCodes).find(x => auth === "Bearer ghu_fake_" + x.id);
      return user ? Response.json(user) : new Response("{}", { status: 401 });
    }
    if (/^\/applications\/[^/]+\/token$/.test(u.pathname) && call.method === "DELETE") {
      state.revoked.push(JSON.parse(init.body).access_token);
      return new Response(null, { status: 204 });
    }
    const one = /^\/repos\/([^/]+\/[^/]+)\/issues\/(\d+)(\/events|\/comments)?$/.exec(u.pathname);
    if (one) {
      const n = Number(one[2]);
      const issue = issues.find(i => i.number === n);
      if (!issue) return new Response("{}", { status: 404 });
      if (!one[3] && call.method === "GET") return Response.json({ ...issue, labels: (issue.labels || []).map(name => ({ name })) });
      if (one[3] === "/events" && call.method === "GET") return Response.json(state.events[n] || []);
      if (one[3] === "/comments" && call.method === "POST") {
        call.json = JSON.parse(init.body);
        state.comments.push({ number: n, body: call.json.body });
        return Response.json({ id: state.comments.length }, { status: 201 });
      }
    }
    const m = /^\/app\/installations\/([^/]+)\/access_tokens$/.exec(u.pathname);
    if (m && call.method === "POST") {
      call.json = JSON.parse(init.body);
      if (state.tokenStatus !== 201) return new Response("{}", { status: state.tokenStatus });
      return Response.json({ token: "ghs_fake_" + calls.length, expires_at: new Date(Date.now() + 3600e3).toISOString() }, { status: 201 });
    }
    const r = /^\/repos\/([^/]+\/[^/]+)\/(issues|issues\/comments)$/.exec(u.pathname);
    if (r && call.method === "POST" && r[2] === "issues") {
      if (state.failCreate) return new Response("{}", { status: 500 });
      call.json = JSON.parse(init.body);
      const issue = { number: 100 + issues.length, ...call.json };
      issues.push(issue);
      return Response.json(issue, { status: 201 });
    }
    if (r && call.method === "GET") {
      const repo = state.repos[r[1]];
      if (!repo || repo.fail) return new Response("{}", { status: 404 });
      return Response.json(r[2] === "issues" ? repo.issues || [] : repo.comments || []);
    }
    return new Response("{}", { status: 404 });
  };
  return state;
}

export function baseEnv(over = {}) {
  return {
    APP_ID: "12345",
    INSTALLATION_ID: "67890",
    APP_PRIVATE_KEY: keys.privateKey,
    TURNSTILE_SECRET: "test-turnstile-secret",
    FAMILY_CODES: JSON.stringify({ "Pizza-Rocket-42": "wildfire", "moon-cake-7": "killjoy" }),
    IDEAS_REPO: "jwildfire/gameon-ideas",
    PUBLIC_IDEAS_REPO: "",
    ALLOWED_ORIGINS: "https://jwildfire.github.io",
    INTAKE_KV: new FakeKV(),
    ...over
  };
}

export const ORIGIN = "https://jwildfire.github.io";

// The sign-in settings, as Jeremy will set them (test values only).
export function signinEnv(over = {}) {
  return baseEnv({
    GOOGLE_CLIENT_ID,
    GITHUB_CLIENT_ID: "Iv23liwSYtQ7ujJXX9Oy",
    GITHUB_CLIENT_SECRET: "test-gh-client-secret",
    SESSION_SECRET: "test-session-secret-at-least-32-chars",
    ...over
  });
}

export function makeRunner({ env = baseEnv(), world = fakeWorld(), now = Date.parse("2026-10-24T18:04:00Z"), cache = null } = {}) {
  clearTokenCache();
  clearJwksCache();
  const clock = { now };
  const deps = { fetch: world.fetch, now: () => clock.now, cache };
  const run = (method, path, { body, origin = ORIGIN, ip = "203.0.113.7", headers = {}, raw } = {}) => {
    const h = { ...headers };
    if (origin) h.Origin = origin;
    if (ip) h["CF-Connecting-IP"] = ip;
    let payload;
    if (raw !== undefined) payload = raw;
    else if (body !== undefined) { payload = JSON.stringify(body); h["Content-Type"] = h["Content-Type"] || "application/json"; }
    const req = new Request("https://intake.example.workers.dev" + path, { method, headers: h, body: payload });
    return handle(req, env, { waitUntil: p => p }, deps);
  };
  const post = async (body, opts = {}) => {
    const res = await run("POST", "/ideas", { body, ...opts });
    return { res, json: await res.json() };
  };
  return { env, world, deps, clock, run, post };
}

export const IDEA = "a game where a penguin delivers pizza on a sled and the toppings fall off if you go too fast";
