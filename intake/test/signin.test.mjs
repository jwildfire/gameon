// Sign-in (Google and GitHub), session tokens, and the allowlist issues.
// Run: npm run test:intake
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { GOOGLE_CLIENT_ID, IDEA, fakeWorld, googleToken, makeRunner, signinEnv } from "./fakes.mjs";
import { issueSession, readSession, sign } from "../src/session.js";
import { decide } from "../src/allowlist.js";
import { MESSAGES } from "../src/messages.js";

const NOW = Date.parse("2026-10-24T18:04:00Z");
const IDEAS = "/repos/jwildfire/gameon-ideas/issues";
const filed = world => world.calls.filter(c => c.method === "POST" && c.path === IDEAS).map(c => c.json);
const ideasFiled = world => filed(world).filter(i => i.labels.includes("game-idea"));
const allowlistFiled = world => filed(world).filter(i => i.labels.includes("allowlist"));
const siteverify = world => world.calls.filter(c => c.url.startsWith("https://challenges.cloudflare.com/"));

function runner(over = {}) {
  return makeRunner({ env: signinEnv(over.env), world: over.world || fakeWorld(), now: over.now || NOW });
}

async function googleSignIn(r, credential = googleToken()) {
  const res = await r.run("POST", "/auth/google", { body: { credential } });
  return { res, json: await res.json() };
}

// ---------- Google ----------

test("a good Google ID token gets a session token and the sender's name", async () => {
  const r = runner();
  const { res, json } = await googleSignIn(r);
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.provider, "google");
  assert.equal(json.name, "Pat Grownup");
  assert.match(json.session, /^s1\.[\w-]+\.[\w-]+$/);
  const who = await readSession(r.env, json.session, NOW);
  assert.deepEqual(who, { provider: "google", sub: "110000000000000000001", name: "Pat Grownup", email: "grownup@example.com", login: "" });
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://jwildfire.github.io");
});

test("Google's keys are fetched once and cached", async () => {
  const r = runner();
  await googleSignIn(r);
  await googleSignIn(r);
  r.clock.now += 60 * 60 * 1000;
  await googleSignIn(r, googleToken({}, { nowSec: Math.floor(r.clock.now / 1000) }));
  assert.equal(r.world.jwksFetches, 1);
});

test("a Google token with the wrong aud, iss, an expiry in the past or an unverified email is refused", async () => {
  const cases = {
    "wrong aud": googleToken({ aud: "someone-else.apps.googleusercontent.com" }),
    "wrong iss": googleToken({ iss: "https://evil.example" }),
    "expired": googleToken({ exp: Math.floor(NOW / 1000) - 120, iat: Math.floor(NOW / 1000) - 4000 }),
    "email not verified": googleToken({ email_verified: false }),
    "no email_verified": googleToken({ email_verified: undefined })
  };
  for (const [name, credential] of Object.entries(cases)) {
    const r = runner();
    const { res, json } = await googleSignIn(r, credential);
    assert.equal(res.status, 401, name);
    assert.equal(json.error, "signin_failed", name);
    assert.equal(json.message, MESSAGES.signin_failed, name);
    assert.equal(json.session, undefined, name);
  }
});

test("a Google token signed by another key, with an unknown kid, alg none or garbled is refused", async () => {
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const good = googleToken();
  const [h, p] = good.split(".");
  const cases = {
    "other key": googleToken({}, { key: other.privateKey }),
    "unknown kid": googleToken({}, { kid: "nope" }),
    "alg none": `${Buffer.from(JSON.stringify({ alg: "none", kid: "test-kid" })).toString("base64url")}.${p}.`,
    "claims swapped": `${h}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url")), aud: GOOGLE_CLIENT_ID, email: "boss@example.com" })).toString("base64url")}.${good.split(".")[2]}`,
    "garbled": "not.a.token"
  };
  for (const [name, credential] of Object.entries(cases)) {
    const { res } = await googleSignIn(runner(), credential);
    assert.equal(res.status, 401, name);
  }
});

test("with no Google client ID or session secret, Google sign-in is off", async () => {
  for (const env of [{ GOOGLE_CLIENT_ID: "" }, { SESSION_SECRET: "" }]) {
    const { res, json } = await googleSignIn(runner({ env }));
    assert.equal(res.status, 503);
    assert.equal(json.error, "signin_off");
  }
});

// ---------- GitHub ----------

async function githubStart(r, ret = "https://jwildfire.github.io/gameon/new/") {
  const res = await r.run("GET", "/auth/github/start?return=" + encodeURIComponent(ret), { origin: null });
  const cookie = (res.headers.get("Set-Cookie") || "").split(";")[0];
  const to = res.headers.get("Location") ? new URL(res.headers.get("Location")) : null;
  return { res, cookie, to, state: to && to.searchParams.get("state") };
}

function callback(r, query, cookie) {
  return r.run("GET", "/auth/github/callback?" + new URLSearchParams(query), { origin: null, headers: cookie ? { Cookie: cookie } : {} });
}

test("GitHub sign-in starts at GitHub's authorize page with the app's client ID, a state and a state cookie", async () => {
  const r = runner();
  const { res, cookie, to, state } = await githubStart(r);
  assert.equal(res.status, 302);
  assert.equal(to.origin + to.pathname, "https://github.com/login/oauth/authorize");
  assert.equal(to.searchParams.get("client_id"), "Iv23liwSYtQ7ujJXX9Oy");
  assert.equal(to.searchParams.get("redirect_uri"), "https://intake.example.workers.dev/auth/github/callback");
  assert.ok(state && state.length > 40);
  assert.match(cookie, /^gameon_gh_state=[\w-]{20,}$/);
  assert.match(res.headers.get("Set-Cookie"), /HttpOnly; Secure; SameSite=Lax/);
});

test("GitHub sign-in only returns to the New Game page", async () => {
  const r = runner({ env: { ALLOW_LOCALHOST: "false" } });
  for (const ret of ["https://jwildfire.github.io/gameon/new/", "https://jwildfire.github.io/gameon/dev/new/", "https://jwildfire.github.io/gameon/new/index.html"]) {
    assert.equal((await githubStart(r, ret)).res.status, 302, ret);
  }
  for (const ret of ["https://evil.example/gameon/new/", "https://jwildfire.github.io/gameon/", "http://localhost:8080/new/", "javascript:alert(1)", ""]) {
    const { res } = await githubStart(r, ret);
    assert.equal(res.status, 400, ret);
  }
});

test("a good GitHub callback sends the page a session token in the fragment, and revokes GitHub's token", async () => {
  const r = runner();
  const { cookie, state } = await githubStart(r, "https://jwildfire.github.io/gameon/dev/new/");
  const res = await callback(r, { code: "good-code", state }, cookie);
  assert.equal(res.status, 302);
  const loc = res.headers.get("Location");
  assert.match(loc, /^https:\/\/jwildfire\.github\.io\/gameon\/dev\/new\/#gameon_session=s1\./);
  const who = await readSession(r.env, loc.split("#gameon_session=")[1], NOW);
  assert.deepEqual(who, { provider: "github", sub: "4242", name: "Gee Grownup", email: "", login: "grownup-gh" });
  assert.deepEqual(r.world.revoked, ["ghu_fake_4242"]);
  assert.match(res.headers.get("Set-Cookie"), /^gameon_gh_state=; Max-Age=0/);
  assert.equal(res.headers.get("Referrer-Policy"), "no-referrer");
  const exchange = r.world.calls.find(c => c.url === "https://github.com/login/oauth/access_token");
  assert.equal(exchange.json.client_secret, "test-gh-client-secret");
});

test("GitHub sign-in keeps the page's query, so an update idea comes back to the same game", async () => {
  const r = runner();
  const { cookie, state } = await githubStart(r, "https://jwildfire.github.io/gameon/new/?game=fancy-food-fight#old");
  const loc = (await callback(r, { code: "good-code", state }, cookie)).headers.get("Location");
  assert.match(loc, /^https:\/\/jwildfire\.github\.io\/gameon\/new\/\?game=fancy-food-fight#gameon_session=s1\./);
});

test("GitHub's state is checked: missing, tampered, expired, or without its cookie", async () => {
  const r = runner();
  const { cookie, state } = await githubStart(r);
  const exchanges = () => r.world.calls.filter(c => c.url === "https://github.com/login/oauth/access_token").length;

  // No state, or a state that isn't ours: there's nowhere safe to go back to.
  assert.equal((await callback(r, { code: "good-code" }, cookie)).status, 400);
  const [payload, sig] = state.split(".");
  const evil = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url")), r: "https://evil.example/" })).toString("base64url");
  assert.equal((await callback(r, { code: "good-code", state: `${evil}.${sig}` }, cookie)).status, 400);
  const forged = await sign("state", "a-different-secret-entirely-123456", { n: "x", r: "https://jwildfire.github.io/gameon/new/", exp: NOW / 1000 + 600 });
  assert.equal((await callback(r, { code: "good-code", state: forged }, cookie)).status, 400);

  // Our state, but someone else's browser (no cookie, or another cookie).
  let res = await callback(r, { code: "good-code", state });
  assert.equal(res.headers.get("Location"), "https://jwildfire.github.io/gameon/new/#gameon_signin_error=state");
  res = await callback(r, { code: "good-code", state }, "gameon_gh_state=somebody-elses-nonce");
  assert.equal(res.headers.get("Location"), "https://jwildfire.github.io/gameon/new/#gameon_signin_error=state");
  assert.equal(exchanges(), 0, "the code is never exchanged without a matching state");

  // Expired after ten minutes.
  r.clock.now += 11 * 60 * 1000;
  assert.equal((await callback(r, { code: "good-code", state }, cookie)).status, 400);
  assert.equal(exchanges(), 0);
});

test("a GitHub sign-in the grown-up cancelled, or a code GitHub won't take, goes back with an error", async () => {
  const r = runner();
  const { cookie, state } = await githubStart(r);
  let res = await callback(r, { error: "access_denied", state }, cookie);
  assert.equal(res.headers.get("Location"), "https://jwildfire.github.io/gameon/new/#gameon_signin_error=cancelled");
  res = await callback(r, { code: "bad-code", state }, cookie);
  assert.equal(res.headers.get("Location"), "https://jwildfire.github.io/gameon/new/#gameon_signin_error=github");
});

test("without the GitHub client secret, sign-in goes straight back saying it's unavailable", async () => {
  const r = runner({ env: { GITHUB_CLIENT_SECRET: "" } });
  const { res } = await githubStart(r);
  assert.equal(res.headers.get("Location"), "https://jwildfire.github.io/gameon/new/#gameon_signin_error=unavailable");
});

// ---------- Session tokens ----------

test("session tokens: good, tampered, signed with another secret, expired after 30 days", async () => {
  const env = signinEnv();
  const { token } = await issueSession(env, { provider: "google", sub: "1", name: "Pat", email: "p@example.com" }, NOW);
  assert.equal((await readSession(env, token, NOW)).sub, "1");
  assert.equal((await readSession(env, token, NOW + 29 * 86400e3)).sub, "1");
  assert.equal(await readSession(env, token, NOW + 31 * 86400e3), null);

  const [, payload, sig] = token.split(".");
  const swapped = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url")), sub: "2" })).toString("base64url");
  assert.equal(await readSession(env, `s1.${swapped}.${sig}`, NOW), null);
  assert.equal(await readSession(env, `s1.${payload}.${sig.slice(0, -2)}AA`, NOW), null);
  assert.equal(await readSession(signinEnv({ SESSION_SECRET: "another-secret-also-32-characters!!" }), token, NOW), null);
  assert.equal(await readSession(env, "garbage", NOW), null);
});

test("an idea with a good session skips the robot check", async () => {
  const r = runner();
  const { json: s } = await googleSignIn(r);
  const { res, json } = await r.post({ idea: IDEA, maker: "Rocket", session: s.session });
  assert.equal(res.status, 201);
  assert.deepEqual(json, { ok: true, number: 100, status: "status: submitted", submitter: "unknown", signed_in: true });
  assert.equal(siteverify(r.world).length, 0);
});

test("an idea with a tampered or expired session is refused so the page can sign out", async () => {
  const r = runner();
  const { json: s } = await googleSignIn(r);
  let { res, json } = await r.post({ idea: IDEA, session: s.session.slice(0, -3) + "abc" });
  assert.equal(res.status, 401);
  assert.equal(json.error, "signed_out");
  r.clock.now += 31 * 86400e3;
  ({ res, json } = await r.post({ idea: IDEA, session: s.session }));
  assert.equal(res.status, 401);
  assert.equal(json.message, MESSAGES.signed_out);
  assert.equal(ideasFiled(r.world).length, 0);
});

test("anonymous ideas still need the robot check", async () => {
  const r = runner();
  assert.equal((await r.post({ idea: IDEA })).json.error, "need_check");
  const { json } = await r.post({ idea: IDEA, turnstile: "tok" });
  assert.equal(json.submitter, "unknown");
  assert.equal(json.signed_in, undefined);
  assert.equal(allowlistFiled(r.world).length, 0);
});

// ---------- The allowlist ----------

test("the first signed-in idea opens one allowlist issue; the second adds a comment instead", async () => {
  const r = runner();
  const { json: s } = await googleSignIn(r);
  await r.post({ idea: IDEA, maker: "Rocket", session: s.session });

  const allow = allowlistFiled(r.world);
  assert.equal(allow.length, 1);
  assert.equal(allow[0].title, "Allow Pat Grownup to send ideas?");
  assert.deepEqual(allow[0].labels, ["allowlist", "allowlist: pending"]);
  assert.ok(!allow[0].labels.includes("game-idea"));
  assert.match(allow[0].body, /\| Signed in with \| Google \|/);
  assert.match(allow[0].body, /\| Email \| `grownup@example.com` \|/);
  assert.match(allow[0].body, /\| Name \| `Pat Grownup` \|/);
  assert.match(allow[0].body, /\| First idea \| #100 \|/);
  assert.equal(r.env.INTAKE_KV.map.get("allow:issue:google:110000000000000000001"), "101");

  const idea = ideasFiled(r.world)[0];
  assert.deepEqual(idea.labels, ["game-idea", "status: submitted", "submitter: unknown"]);
  assert.match(idea.body, /### Signed in\n\nWith Google · first idea/);
  assert.doesNotMatch(idea.body, /grownup@example\.com|Pat Grownup/, "the email and name stay in the allowlist issue");

  const second = await r.post({ idea: IDEA + " and a volcano", maker: "Rocket", session: s.session });
  assert.equal(second.res.status, 201);
  assert.equal(allowlistFiled(r.world).length, 1, "no second allowlist issue");
  assert.deepEqual(r.world.comments, [{ number: 101, body: "Another idea from this sender: #102 (filed as `submitter: unknown`).\n\n---\nFiled by the GameOn intake service." }]);
  assert.match(ideasFiled(r.world)[1].body, /### Signed in\n\nWith Google · allowlist #101 \(pending\)/);
});

test("a GitHub sender's allowlist issue names their login", async () => {
  const r = runner();
  const { cookie, state } = await githubStart(r);
  const loc = (await callback(r, { code: "good-code", state }, cookie)).headers.get("Location");
  await r.post({ idea: IDEA, session: loc.split("#gameon_session=")[1] });
  const allow = allowlistFiled(r.world)[0];
  assert.equal(allow.title, "Allow Gee Grownup to send ideas?");
  assert.match(allow.body, /\| GitHub login \| `grownup-gh` \|/);
  assert.match(allow.body, /\| Id \| `github:4242` \|/);
});

async function senderWithIssue(events, labels, over = {}) {
  const r = runner(over);
  const { json: s } = await googleSignIn(r);
  await r.post({ idea: IDEA, maker: "Rocket", session: s.session });
  const issue = r.world.issues.find(i => i.labels.includes("allowlist"));
  issue.labels = labels;
  r.world.events[issue.number] = events;
  return { r, s, issue };
}

const labeled = (name, login, at = "2026-10-24T19:00:00Z", event = "labeled") => ({ event, label: { name }, actor: { login }, created_at: at });

test("an allowed sender's next idea is submitter: known", async () => {
  const { r, s } = await senderWithIssue([labeled("allowlist: allowed", "jwildfire")], ["allowlist", "allowlist: allowed"]);
  const { json } = await r.post({ idea: IDEA + " with lava", maker: "Rocket", session: s.session });
  assert.equal(json.submitter, "known");
  const idea = ideasFiled(r.world)[1];
  assert.deepEqual(idea.labels, ["game-idea", "status: submitted", "submitter: known"]);
  assert.match(idea.body, /allowlist #101 \(allowed\)/);
  assert.match(r.world.comments[0].body, /submitter: known/);
  assert.equal(r.env.INTAKE_KV.map.get("allow:decision:google:110000000000000000001"), "allowed");
  assert.equal(r.env.INTAKE_KV.puts.find(p => p.key.startsWith("allow:decision:")).opts.expirationTtl, 600);
});

test("Ryan (killjoy00) can allow too", async () => {
  const { r, s } = await senderWithIssue([labeled("allowlist: allowed", "killjoy00")], ["allowlist", "allowlist: allowed"]);
  assert.equal((await r.post({ idea: IDEA + " with lava", session: s.session })).json.submitter, "known");
});

test("an allowed label added by anyone else is ignored", async () => {
  for (const login of ["grownup-gh", "gameon-arcade-bot[bot]", "jwildfire-fake"]) {
    const { r, s } = await senderWithIssue([labeled("allowlist: allowed", login)], ["allowlist", "allowlist: allowed"]);
    const { json } = await r.post({ idea: IDEA + " with lava", session: s.session });
    assert.equal(json.submitter, "unknown", login);
    assert.deepEqual(ideasFiled(r.world)[1].labels, ["game-idea", "status: submitted", "submitter: unknown"]);
  }
});

test("denied wins; a removed allowed label stops counting", async () => {
  let { r, s } = await senderWithIssue(
    [labeled("allowlist: allowed", "jwildfire"), labeled("allowlist: denied", "killjoy00", "2026-10-24T19:05:00Z")],
    ["allowlist", "allowlist: allowed", "allowlist: denied"]);
  assert.equal((await r.post({ idea: IDEA + " with lava", session: s.session })).json.submitter, "unknown");

  ({ r, s } = await senderWithIssue([labeled("allowlist: allowed", "jwildfire")], ["allowlist"]));
  assert.equal((await r.post({ idea: IDEA + " with lava", session: s.session })).json.submitter, "unknown");
});

test("decide(): only the last labelling of a decision label counts", () => {
  const trusted = ["jwildfire", "killjoy00"];
  const on = ["allowlist", "allowlist: allowed"];
  assert.equal(decide([labeled("allowlist: allowed", "jwildfire")], on, trusted), "allowed");
  assert.equal(decide([labeled("allowlist: allowed", "JWildfire")], on, trusted), "allowed");
  assert.equal(decide([
    labeled("allowlist: allowed", "jwildfire", "2026-10-24T19:00:00Z"),
    labeled("allowlist: allowed", "jwildfire", "2026-10-24T19:01:00Z", "unlabeled"),
    labeled("allowlist: allowed", "stranger", "2026-10-24T19:02:00Z")
  ], on, trusted), "pending");
  assert.equal(decide([], on, trusted), "pending");
});

test("the decision is cached for ten minutes, then read again", async () => {
  const { r, s, issue } = await senderWithIssue([], ["allowlist", "allowlist: pending"]);
  const reads = () => r.world.calls.filter(c => c.method === "GET" && c.path === `${IDEAS}/${issue.number}`).length;
  r.env.LIMIT_PER_SIGNIN_PER_DAY = "10";
  await r.post({ idea: IDEA + " one", session: s.session });
  assert.equal(reads(), 1);
  issue.labels = ["allowlist", "allowlist: allowed"];
  r.world.events[issue.number] = [labeled("allowlist: allowed", "jwildfire")];
  // FakeKV doesn't expire keys, so drop the cached answer as KV would after ten minutes.
  assert.equal((await r.post({ idea: IDEA + " two", session: s.session })).json.submitter, "unknown", "cached");
  r.env.INTAKE_KV.map.delete("allow:decision:google:110000000000000000001");
  assert.equal((await r.post({ idea: IDEA + " three", session: s.session })).json.submitter, "known");
  assert.equal(reads(), 2);
});

test("signed-in senders have their own daily limit", async () => {
  const r = runner({ env: { LIMIT_PER_SIGNIN_PER_DAY: "2" } });
  const { json: s } = await googleSignIn(r);
  assert.equal((await r.post({ idea: IDEA + " a", session: s.session })).res.status, 201);
  assert.equal((await r.post({ idea: IDEA + " b", session: s.session })).res.status, 201);
  const { res, json } = await r.post({ idea: IDEA + " c", session: s.session });
  assert.equal(res.status, 429);
  assert.equal(json.error, "limit_signin");
});

// ---------- Privacy ----------

test("nothing private from sign-in reaches /queue", async () => {
  const r = runner();
  const { json: s } = await googleSignIn(r);
  await r.post({ idea: IDEA, maker: "Rocket", session: s.session });
  const { cookie, state } = await githubStart(r);
  const loc = (await callback(r, { code: "good-code", state }, cookie)).headers.get("Location");
  await r.post({ idea: IDEA + " too", maker: "Bean", session: loc.split("#gameon_session=")[1] });
  // Say Jeremy allowed the Google sender, so their nickname shows.
  r.world.issues.find(i => i.number === 101).labels = ["allowlist", "allowlist: allowed"];
  r.world.repos["jwildfire/gameon-ideas"] = { issues: r.world.issues.filter(i => i.labels.includes("game-idea")).map(i => ({ ...i, created_at: "2026-10-24T18:04:00Z", labels: i.labels.map(name => ({ name })) })), comments: [] };

  const res = await r.run("GET", "/queue");
  const text = await res.text();
  const q = JSON.parse(text);
  assert.equal(q.ideas.length, 2, "only the two ideas, never the allowlist issues");
  for (const secret of ["grownup@example.com", "Pat Grownup", "grownup-gh", "Gee Grownup", "110000000000000000001", "4242", "allowlist", "Signed in"]) {
    assert.ok(!text.includes(secret), `/queue mentions ${secret}`);
  }
});
