// Evidence for #82: the New Game page sends through the intake service when one is
// configured, and behaves exactly as in Phase 0 when it isn't. The intake is faked with
// Playwright route interception; so is Cloudflare's Turnstile widget.
// Run: npm run evidence -- tests/evidence/82-intake-page
import { test, expect } from "./evidence.mjs";

const INTAKE = "https://intake.gameon.test";
const SITE_KEY = "1x00000000000000000000AA"; // Cloudflare's public always-passes test site key
const IDEA = "a game where a robot cat surfs on a giant pancake across the sky and dodges syrup storms";
const CODE = "test-family-code-1";

// Point the page at the fake intake, with a stand-in Turnstile that hands out a token.
async function configure(page, { siteKey = SITE_KEY } = {}) {
  await page.route("**/new/intake-config.js", route => route.fulfill({
    contentType: "text/javascript",
    body: `window.GAMEON_INTAKE = { url: ${JSON.stringify(INTAKE + "/")}, turnstileSiteKey: ${JSON.stringify(siteKey)} };`
  }));
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js**", route => route.fulfill({
    contentType: "text/javascript",
    body: `(function () {
      var onload = new URL(document.currentScript.src).searchParams.get("onload");
      window.__resets = 0;
      window.turnstile = {
        render: function (sel, o) {
          var box = typeof sel === "string" ? document.querySelector(sel) : sel;
          box.innerHTML = '<label style="display:inline-flex;align-items:center;gap:10px;border:1px solid #bbb;border-radius:6px;padding:14px 16px;background:#fafafa;font:15px system-ui;color:#222"><input type="checkbox" id="fake-turnstile" style="width:22px;height:22px"> I\\'m not a robot <small style="color:#888">(test stand-in)</small></label>';
          window.__sitekey = o.sitekey;
          box.querySelector("input").addEventListener("change", function () { o.callback("fake-turnstile-token"); });
          return "w1";
        },
        reset: function () { window.__resets++; var i = document.getElementById("fake-turnstile"); if (i) i.checked = false; }
      };
      if (onload && window[onload]) window[onload]();
    })();`
  }));
}

// The fake intake. `ideas` answers POST /ideas; `queue` is GET /queue's list.
async function fakeIntake(page, { ideas = () => ({ status: 201, body: { ok: true, number: 7, status: "status: submitted", submitter: "known" } }), queue = [] } = {}) {
  const posts = [];
  const github = [];
  page.on("request", r => { if (r.url().startsWith("https://api.github.com/")) github.push(r.url()); });
  await page.route(`${INTAKE}/**`, async route => {
    const req = route.request();
    const cors = { "Access-Control-Allow-Origin": new URL(page.url()).origin, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (req.url() === `${INTAKE}/ideas` && req.method() === "POST") {
      const body = JSON.parse(req.postData());
      posts.push(body);
      const r = ideas(body);
      if (r === "abort") return route.abort();
      return route.fulfill({ status: r.status, headers: cors, contentType: "application/json", body: JSON.stringify(r.body) });
    }
    if (req.url() === `${INTAKE}/queue`) {
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ ok: true, at: new Date().toISOString(), ideas: queue }) });
    }
    return route.fulfill({ status: 404, headers: cors, body: "{}" });
  });
  return { posts, github };
}

async function noOpenedWindows(page) {
  await page.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
}

async function typeIdea(page, text = IDEA, nick = "Bean") {
  await page.locator("#tab-type").click();
  await page.locator("#idea").fill(text);
  await page.locator("#maker").fill(nick);
}

async function fits(page) {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(scroll, "no sideways scrolling").toBeLessThanOrEqual(inner);
}

test("with a family code, Send posts the idea and the code, and it shows as Just sent", async ({ page, shot, note, browserErrors }) => {
  await noOpenedWindows(page);
  await configure(page);
  const intake = await fakeIntake(page);
  await page.goto("new/");
  await expect(page.locator("#family")).toBeVisible();
  await expect(page.locator("#robot")).toBeVisible();
  await page.locator("#family-code").fill(CODE);
  await typeIdea(page);
  await expect(page.locator("#count")).toHaveText(/^\d+ \/ 1000 words$/);
  await fits(page);
  await shot("family-code");

  await page.locator("#family-save").click();
  await expect(page.locator("#family-saved")).toBeVisible();
  await expect(page.locator("#robot")).toBeHidden();
  await page.locator("#send").click();
  await expect(page.locator("#handoff-msg")).toHaveText("Sent to the Matrix! It's in the idea line now.");

  expect(intake.posts).toEqual([{ idea: IDEA, maker: "Bean", told_by: "typing", code: CODE }]);
  expect(await page.evaluate(() => window.__opened)).toEqual([]);
  await expect(page.locator("#issue-link")).toBeHidden();
  const first = page.locator("#ideas .idea").first();
  await expect(first).toContainText("Got it!");
  await expect(first).toContainText("Just sent.");
  await expect(first).toContainText("Bean");
  await expect(page.locator("#ideas")).not.toContainText("robot cat");
  note(`body sent: ${JSON.stringify(intake.posts[0]).replace(IDEA, "<idea>")}`);
  await fits(page);
  await shot("sent-known", { fullPage: true });
  expect(browserErrors).toEqual([]);
});

test("the family code is remembered on this device until a grown-up forgets it", async ({ page, shot, note, browserErrors }) => {
  await configure(page);
  await fakeIntake(page);
  await page.goto("new/");
  await page.locator("#family-code").fill(CODE);
  await page.locator("#family-save").click();
  await page.reload();
  await expect(page.locator("#family-saved")).toBeVisible();
  await expect(page.locator("#family-entry")).toBeHidden();
  await expect(page.locator("#robot")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("gameon.arcade.familyCode"))).toBe(CODE);
  note("saved as gameon.arcade.familyCode; still there after a reload");
  await fits(page);
  await shot("code-remembered");
  await page.locator("#family-forget").click();
  await expect(page.locator("#family-entry")).toBeVisible();
  await expect(page.locator("#robot")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("gameon.arcade.familyCode"))).toBeNull();
  expect(browserErrors).toEqual([]);
});

test("without a code, the robot check shows and its token is sent instead", async ({ page, shot, note, browserErrors }) => {
  await noOpenedWindows(page);
  await configure(page);
  const intake = await fakeIntake(page, { ideas: () => ({ status: 201, body: { ok: true, number: 8, status: "status: submitted", submitter: "unknown" } }) });
  await page.goto("new/");
  await expect(page.locator("#fake-turnstile")).toBeVisible();
  expect(await page.evaluate(() => window.__sitekey)).toBe(SITE_KEY);
  await typeIdea(page, IDEA, "Zed");
  await page.locator("#send").click();
  await expect(page.locator("#send-msg")).toHaveText("Tap the \"I'm not a robot\" box first.");
  expect(intake.posts).toEqual([]);
  await fits(page);
  await shot("robot-check");

  await page.locator("#fake-turnstile").check();
  await page.locator("#send").click();
  await expect(page.locator("#handoff-msg")).toContainText("A grown-up checks it before it gets built.");
  expect(intake.posts).toEqual([{ idea: IDEA, maker: "Zed", told_by: "typing", turnstile: "fake-turnstile-token" }]);
  expect(await page.evaluate(() => window.__resets)).toBe(1); // tokens are single-use
  note(`body sent: ${JSON.stringify(intake.posts[0]).replace(IDEA, "<idea>")}`);
  await shot("sent-unknown");
  expect(browserErrors).toEqual([]);
});

test("an update idea sends the game and version too", async ({ page, browserErrors }) => {
  await configure(page);
  const intake = await fakeIntake(page);
  await page.addInitScript(c => localStorage.setItem("gameon.arcade.familyCode", c), CODE);
  await page.goto("new/?game=fancy-food-fight&version=jeremy.v1");
  await expect(page.locator("#making")).toHaveValue("fancy-food-fight");
  await typeIdea(page, "make every food hot sauce and the guests sneeze fire when they get splatted", "NotClay");
  await page.locator("#send").click();
  await expect(page.locator("#handoff")).toBeVisible();
  expect(intake.posts[0]).toMatchObject({ game: "fancy-food-fight", version: "jeremy.v1", maker: "NotClay", code: CODE });
  await expect(page.locator("#ideas .idea").first()).toContainText("Update to Fancy Food Fight");
  expect(browserErrors).toEqual([]);
});

test("refusals read in plain kid-friendly words, and a wrong code is forgotten", async ({ page, shot, note, browserErrors }) => {
  await configure(page);
  let answer = { status: 429, body: { ok: false, error: "limit_family", message: "That's all the ideas for today! Save your next one for tomorrow." } };
  const intake = await fakeIntake(page, { ideas: () => answer });
  await page.addInitScript(c => localStorage.setItem("gameon.arcade.familyCode", c), CODE);
  await page.goto("new/");
  await typeIdea(page);
  await page.locator("#send").click();
  await expect(page.locator("#send-msg")).toHaveText("That's all the ideas for today! Save your next one for tomorrow.");
  await expect(page.locator("#send")).toBeVisible();
  await expect(page.locator("#send")).toHaveText("Send to the Matrix");
  await expect(page.locator("#idea")).toHaveValue(IDEA);
  await fits(page);
  await shot("refused");

  answer = { status: 403, body: { ok: false, error: "bad_code", message: "That family code doesn't look right. Ask your grown-up to check it." } };
  await page.locator("#send").click();
  await expect(page.locator("#send-msg")).toHaveText("That family code doesn't look right. Ask your grown-up to check it.");
  await expect(page.locator("#family-entry")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("gameon.arcade.familyCode"))).toBeNull();

  answer = "abort";
  await page.locator("#family-code").fill(CODE);
  await page.locator("#family-save").click();
  await page.locator("#send").click();
  await expect(page.locator("#send-msg")).toHaveText("Couldn't reach the idea machine. Check the internet and try again.");
  note(`${intake.posts.length} tries: daily limit, wrong code, no internet`);
  // The aborted request is the only console error, and it's the browser's own network line.
  expect(browserErrors.filter(e => !/Failed to load resource|ERR_FAILED/.test(e))).toEqual([]);
});

test("the idea line reads /queue, never GitHub, and shows no idea words", async ({ page, shot, note, browserErrors }) => {
  await configure(page);
  const now = Date.now();
  const at = mins => new Date(now - mins * 60000).toISOString();
  const intake = await fakeIntake(page, {
    queue: [
      { source: "private", number: 4, created: at(1), status: "status: submitted", maker: "Someone", update: false, game: "", title: null, one_liner: null, question: null, reason: null, version: null, just_sent: true },
      { source: "private", number: 3, created: at(30), status: "status: needs more", maker: "Rocket", update: false, game: "", title: "Space Lettuce", one_liner: null, question: "What does the snail do when it wins?", reason: null, version: null, just_sent: false },
      { source: "private", number: 2, created: at(90), status: "status: building", maker: "Bean", update: false, game: "", title: "Penguin Pizza Sled", one_liner: "Race a sled downhill delivering pizzas before the toppings slide off.", question: null, reason: null, version: null, just_sent: false },
      { source: "public", number: 41, created: at(60 * 30), status: "status: published", maker: "Ryan's crew", update: false, game: "", title: "MazeAThon", one_liner: "Collect shapes, unlock rooms, outsmart very cute monsters.", question: null, reason: null, version: null, just_sent: false }
    ]
  });
  await page.goto("new/");
  const items = page.locator("#ideas .idea");
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText("A new idea");
  await expect(items.nth(0)).toContainText("Just sent. A short description shows up once it's been read.");
  await expect(items.nth(0)).toContainText("Someone");
  await expect(items.nth(1)).toContainText("What does the snail do when it wins?");
  await expect(items.nth(2)).toContainText("Penguin Pizza Sled");
  await expect(items.nth(2)).toContainText("Being built");
  await expect(items.nth(3).locator("a.play")).toHaveAttribute("href", "../#mazeathon");
  expect(intake.github).toEqual([]);
  note("4 ideas from GET /queue; 0 requests to api.github.com");
  await fits(page);
  await page.locator("#line").scrollIntoViewIfNeeded();
  await shot("idea-line");
  expect(browserErrors).toEqual([]);
});

test("with no intake configured, the page is the Phase 0 page", async ({ page, shot, note, browserErrors }) => {
  await noOpenedWindows(page);
  const github = [];
  page.on("request", r => { if (r.url().startsWith("https://api.github.com/")) github.push(r.url()); });
  await page.goto("new/");
  expect(await page.evaluate(() => window.GAMEON_INTAKE.url)).toBe(""); // the site key alone changes nothing
  await expect(page.locator("#family")).toBeHidden();
  await expect(page.locator("#robot")).toBeHidden();
  await expect(page.locator("script#turnstile-js")).toHaveCount(0);
  await expect(page.locator("#step-send")).toHaveText("Send it to the Matrix, and someone signs it off on GitHub.");
  await typeIdea(page);
  await expect(page.locator("#count")).toHaveText(`${IDEA.length} / 1000`);
  await page.locator("#send").click();
  await expect(page.locator("#handoff-msg")).toContainText("presses Submit");
  await expect(page.locator("#link-help")).toBeVisible();
  const url = new URL(await page.evaluate(() => window.__opened[0]));
  expect(url.origin + url.pathname).toBe("https://github.com/jwildfire/gameon/issues/new");
  expect(url.searchParams.get("idea")).toBe(IDEA);
  expect(url.searchParams.get("labels")).toBe("game-idea,status: submitted");
  await expect(page.locator("#issue-link")).toHaveAttribute("href", url.href);
  expect(github.length).toBeGreaterThan(0);
  note("Send opens GitHub's Game idea form; the idea line reads the GitHub API");
  await fits(page);
  await shot("unconfigured");
  expect(browserErrors).toEqual([]);
});
