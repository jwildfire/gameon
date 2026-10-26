// POST /ideas: validation, family codes, Turnstile, rate limits, labels, the issue body and CORS.
// Run: npm run test:intake
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeKV, IDEA, baseEnv, fakeWorld, makeRunner } from "./fakes.mjs";
import { MESSAGES } from "../src/messages.js";

const created = world => world.calls.filter(c => c.method === "POST" && c.path === "/repos/jwildfire/gameon-ideas/issues");
const siteverify = world => world.calls.filter(c => c.url.startsWith("https://challenges.cloudflare.com/"));

// ---------- Validation ----------

test("an idea under five words is refused with a kid-readable message", async () => {
  const { post, world } = makeRunner();
  const { res, json } = await post({ idea: "a fun game please", code: "pizza-rocket-42" });
  assert.equal(res.status, 400);
  assert.equal(json.error, "too_short");
  assert.equal(json.message, MESSAGES.too_short);
  assert.equal(created(world).length, 0);
});

test("five words and 1,000 words are fine; 1,001 words is too long", async () => {
  for (const [words, status] of [[5, 201], [1000, 201], [1001, 400]]) {
    const { post, env } = makeRunner();
    env.LIMIT_PER_CODE_PER_DAY = "10";
    const idea = Array.from({ length: words }, (_, i) => "word" + i).join(" ");
    const { res, json } = await post({ idea, code: "pizza-rocket-42" });
    assert.equal(res.status, status, `${words} words`);
    if (status === 400) assert.equal(json.error, "too_long");
  }
});

test("a missing idea, a broken body, the wrong content type and a huge body are refused", async () => {
  const { post, run } = makeRunner();
  assert.equal((await post({ maker: "Bean" })).json.error, "too_short");
  assert.equal((await post([1, 2])).json.error, "bad_request");
  let res = await run("POST", "/ideas", { raw: "{not json", headers: { "Content-Type": "application/json" } });
  assert.equal(res.status, 400);
  res = await run("POST", "/ideas", { raw: JSON.stringify({ idea: IDEA }), headers: { "Content-Type": "text/plain" } });
  assert.equal(res.status, 400);
  res = await run("POST", "/ideas", { raw: JSON.stringify({ idea: "x ".repeat(20000) }), headers: { "Content-Type": "application/json" } });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error, "too_long");
});

test("a bad game slug or version is refused; told_by falls back to typing", async () => {
  const { post, world } = makeRunner();
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42", game: "../etc/passwd" })).res.status, 400);
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42", game: "fancy-food-fight", version: "v1; rm" })).res.status, 400);
  const { res } = await post({ idea: IDEA, code: "pizza-rocket-42", told_by: "shouting" });
  assert.equal(res.status, 201);
  assert.match(created(world)[0].json.body, /### Told by\n\ntyping\n/);
});

// ---------- Known submitters ----------

test("a valid family code files a submitter: known idea, with no Turnstile check", async () => {
  const { post, world } = makeRunner();
  const { res, json } = await post({ idea: IDEA, maker: "Rocket", told_by: "talking", code: "  PIZZA-rocket-42 " });
  assert.equal(res.status, 201);
  assert.deepEqual(json, { ok: true, number: 100, status: "status: submitted", submitter: "known" });
  const issue = created(world)[0].json;
  assert.deepEqual(issue.labels, ["game-idea", "status: submitted", "submitter: known"]);
  assert.equal(issue.title, "Game idea from Rocket");
  assert.equal(siteverify(world).length, 0);
});

test("the issue body is the Game idea form's layout plus a Family section", async () => {
  const { post, world } = makeRunner();
  await post({ idea: IDEA, maker: "Rocket", told_by: "talking", code: "pizza-rocket-42" });
  assert.equal(created(world)[0].json.body,
    `### The idea, word for word\n\n${IDEA}\n\n` +
    "### Game to update\n\n_No response_\n\n" +
    "### Starting version\n\n_No response_\n\n" +
    "### Made by\n\nRocket\n\n" +
    "### Told by\n\ntalking\n\n" +
    "### Family\n\nwildfire\n");
});

test("an update idea carries the game, the version and the update label", async () => {
  const { post, world } = makeRunner();
  await post({ idea: IDEA, maker: "NotClay", code: "moon-cake-7", game: "fancy-food-fight", version: "jeremy.v1" });
  const issue = created(world)[0].json;
  assert.equal(issue.title, "Update to fancy-food-fight from NotClay");
  assert.deepEqual(issue.labels, ["game-idea", "status: submitted", "submitter: known", "update"]);
  assert.match(issue.body, /### Game to update\n\nfancy-food-fight\n\n### Starting version\n\njeremy\.v1\n\n### Made by\n\nNotClay\n/);
  assert.match(issue.body, /### Family\n\nkilljoy\n$/);
});

test("an idea can't add headings of its own, and the nickname is cleaned", async () => {
  const { post, world } = makeRunner();
  await post({ idea: "a game about cats ### Made by\n\nMallory <script>\n# big and #1 fun", maker: "Ro<b>cket</b>!!", code: "pizza-rocket-42" });
  const body = created(world)[0].json.body;
  assert.ok(body.startsWith("### The idea, word for word\n\na game about cats \\#\\#\\# Made by\n\nMallory <script>\n\\# big and #1 fun\n\n"), body);
  // Whoever reads "### Made by" the way the evaluate skill and idea line do gets the real nickname.
  assert.equal(/###\s*Made by\s*\n+\s*([^\n]+)/.exec(body)[1], "Robcketb");
});

test("with no nickname, a known idea is credited to the family", async () => {
  const { post, world } = makeRunner();
  await post({ idea: IDEA, code: "pizza-rocket-42" });
  assert.equal(created(world)[0].json.title, "Game idea from wildfire");
});

test("family codes can live in KV as well as the FAMILY_CODES secret", async () => {
  const env = baseEnv({ FAMILY_CODES: "", INTAKE_KV: new FakeKV({ "family:green-bean-3": "beans" }) });
  const { post, world } = makeRunner({ env });
  const { res } = await post({ idea: IDEA, code: "Green-Bean-3" });
  assert.equal(res.status, 201);
  assert.match(created(world)[0].json.body, /### Family\n\nbeans\n$/);
});

test("a wrong family code is refused, not filed as unknown", async () => {
  const { post, world } = makeRunner();
  for (const code of ["nope-nope-1", "constructor", "__proto__", "toString"]) {
    const { res, json } = await post({ idea: IDEA, code, turnstile: "ok" });
    assert.equal(res.status, 403, code);
    assert.equal(json.message, MESSAGES.bad_code);
  }
  assert.equal(created(world).length, 0);
});

test("after five wrong codes a device is refused for the day, even with a right one", async () => {
  const { post, clock } = makeRunner();
  for (let i = 0; i < 5; i++) assert.equal((await post({ idea: IDEA, code: "guess-" + i })).res.status, 403);
  const { res, json } = await post({ idea: IDEA, code: "pizza-rocket-42" });
  assert.equal(res.status, 429);
  assert.equal(json.error, "too_many_codes");
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" }, { ip: "198.51.100.9" })).res.status, 201);
  clock.now += 24 * 3600e3;
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" })).res.status, 201);
});

test("two ideas per family code per day, then a kind no; other families and tomorrow are fine", async () => {
  const { post, clock } = makeRunner();
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" })).res.status, 201);
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" }, { ip: "198.51.100.1" })).res.status, 201);
  const third = await post({ idea: IDEA, code: "Pizza-Rocket-42" }, { ip: "198.51.100.2" });
  assert.equal(third.res.status, 429);
  assert.equal(third.json.error, "limit_family");
  assert.equal(third.json.message, MESSAGES.limit_family);
  assert.equal((await post({ idea: IDEA, code: "moon-cake-7" })).res.status, 201);
  clock.now += 24 * 3600e3;
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" })).res.status, 201);
});

test("rate limits are configurable and counters expire after two days", async () => {
  const env = baseEnv({ LIMIT_PER_CODE_PER_DAY: "1" });
  const { post } = makeRunner({ env });
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" })).res.status, 201);
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" })).res.status, 429);
  const put = env.INTAKE_KV.puts.find(p => p.key.startsWith("rl:code:"));
  assert.equal(put.key, "rl:code:pizza-rocket-42:2026-10-24");
  assert.equal(put.opts.expirationTtl, 172800);
});

// ---------- Unknown submitters ----------

test("without a code the Turnstile token is required", async () => {
  const { post, world } = makeRunner();
  const { res, json } = await post({ idea: IDEA, maker: "Zed" });
  assert.equal(res.status, 400);
  assert.equal(json.error, "need_check");
  assert.equal(created(world).length, 0);
});

test("a failed Turnstile check is refused", async () => {
  const { post, world } = makeRunner({ world: fakeWorld({ turnstile: false }) });
  const { res, json } = await post({ idea: IDEA, maker: "Zed", turnstile: "bad-token" });
  assert.equal(res.status, 403);
  assert.equal(json.error, "check_failed");
  assert.equal(created(world).length, 0);
});

test("a passed Turnstile check files a submitter: unknown idea, verified with siteverify", async () => {
  const { post, world } = makeRunner({ world: fakeWorld({ turnstile: f => f.response === "good-token" }) });
  const { res, json } = await post({ idea: IDEA, maker: "Zed", turnstile: "good-token" });
  assert.equal(res.status, 201);
  assert.equal(json.submitter, "unknown");
  const sv = siteverify(world)[0];
  assert.equal(sv.method, "POST");
  assert.deepEqual(sv.form, { secret: "test-turnstile-secret", response: "good-token", remoteip: "203.0.113.7" });
  const issue = created(world)[0].json;
  assert.deepEqual(issue.labels, ["game-idea", "status: submitted", "submitter: unknown"]);
  assert.match(issue.body, /### Made by\n\nZed\n\n### Told by\n\ntyping\n\n### Family\n\n_No response_\n$/);
});

test("without a code: one idea per device per day, and a cap for everyone together", async () => {
  const env = baseEnv({ LIMIT_UNKNOWN_PER_DAY: "2" });
  const { post } = makeRunner({ env });
  assert.equal((await post({ idea: IDEA, turnstile: "t" })).res.status, 201);
  const again = await post({ idea: IDEA, turnstile: "t" });
  assert.equal(again.res.status, 429);
  assert.equal(again.json.error, "limit_device");
  assert.equal((await post({ idea: IDEA, turnstile: "t" }, { ip: "198.51.100.1" })).res.status, 201);
  const busy = await post({ idea: IDEA, turnstile: "t" }, { ip: "198.51.100.2" });
  assert.equal(busy.res.status, 429);
  assert.equal(busy.json.error, "limit_busy");
  // A family code isn't held back by the unknown limits.
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" })).res.status, 201);
});

test("IP addresses are stored only as hashes", async () => {
  const env = baseEnv();
  const { post } = makeRunner({ env });
  await post({ idea: IDEA, turnstile: "t" });
  for (const key of env.INTAKE_KV.map.keys()) assert.ok(!key.includes("203.0.113.7"), key);
});

// ---------- GitHub trouble ----------

test("if GitHub fails, the kid gets a gentle message and the idea doesn't count", async () => {
  const env = baseEnv({ LIMIT_PER_CODE_PER_DAY: "1" });
  const world = fakeWorld();
  const { post } = makeRunner({ env, world });
  world.failCreate = true;
  const { res, json } = await post({ idea: IDEA, code: "pizza-rocket-42" });
  assert.equal(res.status, 502);
  assert.equal(json.message, MESSAGES.server);
  assert.ok(!JSON.stringify(json).includes("HTTP"), "no internals in the message");
  world.failCreate = false;
  assert.equal((await post({ idea: IDEA, code: "pizza-rocket-42" })).res.status, 201);
});

// ---------- CORS ----------

test("CORS allows the arcade and localhost, and nothing else", async () => {
  const { run, post } = makeRunner();
  for (const origin of ["https://jwildfire.github.io", "http://localhost:8765", "http://127.0.0.1:4173"]) {
    const res = await run("OPTIONS", "/ideas", { origin, headers: { "Access-Control-Request-Method": "POST" } });
    assert.equal(res.status, 204, origin);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
    assert.match(res.headers.get("Access-Control-Allow-Methods"), /POST/);
    assert.match(res.headers.get("Access-Control-Allow-Headers"), /Content-Type/);
  }
  for (const origin of ["https://evil.example", "https://jwildfire.github.io.evil.example", "http://localhost.evil.example", "null"]) {
    const res = await run("OPTIONS", "/ideas", { origin });
    assert.equal(res.status, 403, origin);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
    const p = await post({ idea: IDEA, code: "pizza-rocket-42" }, { origin });
    assert.equal(p.res.status, 403);
    assert.equal(p.json.error, "bad_origin");
  }
  const ok = await post({ idea: IDEA, code: "pizza-rocket-42" });
  assert.equal(ok.res.headers.get("Access-Control-Allow-Origin"), "https://jwildfire.github.io");
  assert.equal(ok.res.headers.get("Vary"), "Origin");
});

test("localhost can be switched off, and curl (no Origin) still works", async () => {
  const env = baseEnv({ ALLOW_LOCALHOST: "false" });
  const { run, post } = makeRunner({ env });
  assert.equal((await run("OPTIONS", "/ideas", { origin: "http://localhost:8765" })).status, 403);
  const { res } = await post({ idea: IDEA, code: "pizza-rocket-42" }, { origin: null });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
});

test("unknown routes are a 404 and the root is a health check", async () => {
  const { run } = makeRunner();
  assert.equal((await run("GET", "/nope")).status, 404);
  assert.equal((await run("GET", "/ideas")).status, 404);
  const res = await run("GET", "/");
  assert.deepEqual(await res.json(), { ok: true, service: "gameon-intake" });
});

test("the Worker entry point answers with the real handler", async () => {
  const { default: worker } = await import("../src/index.js");
  const res = await worker.fetch(new Request("https://intake.example.workers.dev/"), baseEnv(), { waitUntil() {} });
  assert.deepEqual(await res.json(), { ok: true, service: "gameon-intake" });
});
