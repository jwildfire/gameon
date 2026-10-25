// GET /queue redaction and caching, and signing in to GitHub as the app (JWT and token).
// Run: npm run test:intake
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { FakeCache, IDEA, baseEnv, fakeWorld, keys, makeRunner } from "./fakes.mjs";
import { appJwt, pemToDer } from "../src/github.js";

const RAW = {
  evaluated: "a game where my brother Jake from Oakwood School gets chased by a giant sandwich",
  fresh: "a secret raw idea about a dragon who runs a bakery on the moon with eleven cats",
  unknown: "a stranger's idea about a robot that paints every house in town bright purple",
  failed: "an idea the safety gate failed because it names a real person in a mean way",
  publicOld: "an old public idea about a penguin delivering pizza on a sled down a mountain",
  test: "a test idea that should never show up in the idea line at all, not ever"
};

function issue(number, created, labels, raw, maker = "Rocket", extra = "") {
  return {
    number, created_at: created, labels: labels.map(name => ({ name })),
    body: `### The idea, word for word\n\n${raw}\n\n${extra}### Made by\n\n${maker}\n\n### Told by\n\ntalking\n\n### Family\n\nwildfire\n`
  };
}
function comment(number, ev, assoc = "OWNER", type = "User", repo = "jwildfire/gameon-ideas") {
  return {
    issue_url: `https://api.github.com/repos/${repo}/issues/${number}`,
    author_association: assoc, user: { type },
    body: `<!-- gameon-eval ${JSON.stringify(ev)} -->\n**Go.**\n\n### Build brief\n- **The idea, word for word:** > ${RAW.evaluated}`
  };
}

function world() {
  return fakeWorld({
    github: {
      repos: {
        "jwildfire/gameon-ideas": {
          issues: [
            issue(6, "2026-10-24T18:00:00Z", ["game-idea", "status: submitted", "test", "submitter: known"], RAW.test),
            issue(5, "2026-10-24T17:00:00Z", ["game-idea", "status: needs approval", "submitter: known"], RAW.failed),
            issue(4, "2026-10-24T16:00:00Z", ["game-idea", "status: submitted", "submitter: unknown"], RAW.unknown, "Real Name Here"),
            issue(3, "2026-10-24T15:00:00Z", ["game-idea", "status: submitted", "submitter: known"], RAW.fresh, "Bean"),
            issue(2, "2026-10-24T14:00:00Z", ["game-idea", "status: approved", "submitter: unknown"], RAW.unknown, "Zed"),
            issue(1, "2026-10-24T09:00:00Z", ["game-idea", "status: building", "submitter: known", "update"], RAW.evaluated, "Rocket",
              "### Game to update\n\nfancy-food-fight\n\n### Starting version\n\njeremy.v1\n\n"),
            { number: 9, created_at: "2026-10-24T19:00:00Z", labels: [{ name: "game-idea" }], pull_request: {}, body: RAW.test }
          ],
          comments: [
            comment(3, { title: "Sneaky Fake Title", one_liner: "Not from the eval" }, "NONE"),
            comment(5, { gate: "fail", verdict: "no-go", title: "Mean Title", one_liner: "Mean one-liner", reason: "We can't make games about real people." }),
            comment(2, { gate: "pass", verdict: "go", title: "Purple Paint Bot", one_liner: "Paint the whole town purple before sundown." }, "NONE", "Bot"),
            comment(1, { gate: "pass", verdict: "go", title: "Fancy Food Fight", one_liner: "Splat the guests with sandwiches.", update: true, version: "rocket.v1", fork: true })
          ]
        },
        "jwildfire/gameon": {
          issues: [issue(41, "2026-10-23T12:00:00Z", ["game-idea", "status: published"], RAW.publicOld, "Ryan's crew")],
          comments: [comment(41, { gate: "pass", title: "Penguin Pizza Sled", one_liner: "Race a sled downhill delivering pizzas." }, "COLLABORATOR", "User", "jwildfire/gameon")]
        }
      }
    }
  });
}

async function queue(over = {}, w = world(), cache = null) {
  const r = makeRunner({ env: baseEnv({ PUBLIC_IDEAS_REPO: "jwildfire/gameon", ...over }), world: w, cache });
  const res = await r.run("GET", "/queue");
  return { res, text: await res.clone().text(), json: await res.json(), r };
}

test("the queue never contains an idea's words", async () => {
  const { res, text } = await queue();
  assert.equal(res.status, 200);
  for (const [name, raw] of Object.entries(RAW)) {
    assert.ok(!text.includes(raw), `raw text of ${name} leaked`);
    assert.ok(!text.includes(raw.split(" ").slice(3, 8).join(" ")), `part of ${name} leaked`);
  }
  assert.ok(!text.includes("Jake") && !text.includes("Oakwood"));
  assert.ok(!text.includes("wildfire"), "the family stays private");
});

test("evaluated ideas show the eval's title and one-liner; fresh ones are Just sent", async () => {
  const { json } = await queue();
  const by = Object.fromEntries(json.ideas.map(i => [`${i.source}#${i.number}`, i]));
  assert.deepEqual(Object.keys(by), ["private#5", "private#4", "private#3", "private#2", "private#1", "public#41"], "newest first, test ideas and PRs left out");
  assert.deepEqual(by["private#1"], {
    source: "private", number: 1, created: "2026-10-24T09:00:00Z", status: "status: building", maker: "Rocket",
    update: true, game: "fancy-food-fight", title: "Fancy Food Fight", one_liner: "Splat the guests with sandwiches.",
    question: null, reason: null, version: "rocket.v1", just_sent: false
  });
  assert.equal(by["private#3"].just_sent, true);
  assert.equal(by["private#3"].title, null, "an eval comment from someone without access doesn't count");
  assert.equal(by["private#3"].maker, "Bean");
  assert.equal(by["public#41"].title, "Penguin Pizza Sled");
  assert.equal(by["public#41"].maker, "Ryan's crew");
});

test("a failed safety gate hides the title and one-liner", async () => {
  const { json } = await queue();
  const it = json.ideas.find(i => i.number === 5);
  assert.equal(it.title, null);
  assert.equal(it.one_liner, null);
  assert.equal(it.status, "status: needs approval");
});

test("an unknown submitter's nickname shows only once a grown-up has approved it", async () => {
  const { json } = await queue();
  assert.equal(json.ideas.find(i => i.number === 4).maker, "Someone");
  const approved = json.ideas.find(i => i.number === 2);
  assert.equal(approved.maker, "Zed");
  assert.equal(approved.title, "Purple Paint Bot", "the bot's eval comment counts");
});

test("the queue is cached for about a minute", async () => {
  const w = world();
  const cache = new FakeCache();
  const first = await queue({}, w, cache);
  assert.equal(first.res.headers.get("Cache-Control"), "public, max-age=60");
  assert.equal(first.res.headers.get("Access-Control-Allow-Origin"), "https://jwildfire.github.io");
  const n = w.calls.length;
  const again = await first.r.run("GET", "/queue");
  assert.equal(w.calls.length, n, "no GitHub calls on a cache hit");
  assert.deepEqual(await again.json(), first.json);
});

test("the private repo is read with a narrow token; a missing public repo doesn't break the line", async () => {
  const w = world();
  w.repos["jwildfire/gameon"] = { fail: true };
  const { json } = await queue({}, w);
  assert.equal(json.ok, true);
  assert.ok(json.ideas.every(i => i.source === "private"));
  const tokenCalls = w.calls.filter(c => c.path.startsWith("/app/installations/"));
  assert.deepEqual(tokenCalls.map(c => c.json), [
    { repositories: ["gameon-ideas"], permissions: { issues: "write" } },
    { repositories: ["gameon"], permissions: { issues: "read" } }
  ]);
});

test("if the private repo can't be read, the queue says so kindly", async () => {
  const w = world();
  w.repos["jwildfire/gameon-ideas"] = { fail: true };
  const { res, json } = await queue({ PUBLIC_IDEAS_REPO: "" }, w);
  assert.equal(res.status, 502);
  assert.equal(json.error, "queue_down");
});

// ---------- Signing in as the GitHub App ----------

function decode(part) { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")); }

test("the app JWT is RS256, signed with the PKCS#8 key and verifiable with its public key", async () => {
  const now = Date.parse("2026-10-24T18:04:00Z");
  const jwt = await appJwt("12345", keys.privateKey, now);
  const [h, p, s] = jwt.split(".");
  assert.deepEqual(decode(h), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(decode(p), { iat: now / 1000 - 60, exp: now / 1000 + 540, iss: "12345" });
  assert.ok(verify("RSA-SHA256", Buffer.from(`${h}.${p}`), createPublicKey(keys.publicKey), Buffer.from(s, "base64url")));
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey;
  assert.ok(!verify("RSA-SHA256", Buffer.from(`${h}.${p}`), other, Buffer.from(s, "base64url")));
});

test("a key pasted with literal \\n still works; a PKCS#1 key says how to convert it", async () => {
  const flat = keys.privateKey.replace(/\n/g, "\\n");
  assert.ok((await appJwt("1", flat, Date.now())).split(".").length === 3);
  const pkcs1 = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } }).privateKey;
  assert.throws(() => pemToDer(pkcs1), /openssl pkcs8 -topk8 -nocrypt/);
  assert.throws(() => pemToDer(""), /missing/);
});

test("filing an idea swaps the JWT for an installation token once, then reuses it", async () => {
  const w = fakeWorld();
  const { post } = makeRunner({ world: w });
  await post({ idea: IDEA, code: "pizza-rocket-42" });
  await post({ idea: IDEA, code: "moon-cake-7" });
  const tokenCalls = w.calls.filter(c => c.path === "/app/installations/67890/access_tokens");
  assert.equal(tokenCalls.length, 1);
  const auth = tokenCalls[0].headers.Authorization;
  assert.match(auth, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(decode(auth.split(" ")[1].split(".")[1]).iss, "12345");
  assert.deepEqual(tokenCalls[0].json, { repositories: ["gameon-ideas"], permissions: { issues: "write" } });
  const creates = w.calls.filter(c => c.path === "/repos/jwildfire/gameon-ideas/issues" && c.method === "POST");
  assert.equal(creates.length, 2);
  for (const c of creates) {
    assert.match(c.headers.Authorization, /^Bearer ghs_fake_/);
    assert.equal(c.headers["User-Agent"], "gameon-intake");
    assert.equal(c.headers["X-GitHub-Api-Version"], "2022-11-28");
  }
});

test("if the app can't get a token, the kid gets the gentle server message", async () => {
  const w = fakeWorld({ github: { tokenStatus: 401 } });
  const { post } = makeRunner({ world: w });
  const { res, json } = await post({ idea: IDEA, code: "pizza-rocket-42" });
  assert.equal(res.status, 502);
  assert.equal(json.error, "server");
});
