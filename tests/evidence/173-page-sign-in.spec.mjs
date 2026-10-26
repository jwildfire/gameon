// Evidence for #173: optional "Sign in with Google" and "Sign in with GitHub" on the New Game
// page. Google Identity Services, Cloudflare's Turnstile widget and the intake Worker are all
// faked with Playwright route interception.
// Run: npm run evidence -- tests/evidence/173-page-sign-in
import { readFileSync } from "node:fs";
import { test, expect } from "./evidence.mjs";

const INTAKE = "https://intake.gameon.test";
const IDEA = "a game where a robot cat surfs on a giant pancake across the sky and dodges syrup storms";
const GOOGLE_ID = "1234-test.apps.googleusercontent.com";

// A session token shaped like the Worker's: s1.<base64url JSON>.<signature>. The page reads
// only the middle part, to show the name; the fake signature is never checked here.
function sessionFor(who) {
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  return `s1.${Buffer.from(JSON.stringify({ ...who, iat: exp - 30 * 86400, exp })).toString("base64url")}.fake-signature`;
}
const GOOGLE_SESSION = sessionFor({ p: "google", sub: "110000000000000000001", name: "Pat Grownup", email: "grownup@example.com" });
const GITHUB_SESSION = sessionFor({ p: "github", sub: "4242", name: "Gee Grownup", login: "grownup-gh" });

// Point the page at the fake intake, with the providers asked for.
async function configure(page, { google = true, github = true } = {}) {
  const cfg = { url: INTAKE, turnstileSiteKey: "1x00000000000000000000AA", familyCodes: false };
  if (google) cfg.googleClientId = GOOGLE_ID;
  if (github) cfg.githubSignIn = true;
  await page.route("**/new/intake-config.js", route => route.fulfill({
    contentType: "text/javascript",
    body: `window.GAMEON_INTAKE = ${JSON.stringify(cfg)};`
  }));
  // Turnstile stand-in: a checkbox that hands out a token.
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js**", route => route.fulfill({
    contentType: "text/javascript",
    body: `(function () {
      var onload = new URL(document.currentScript.src).searchParams.get("onload");
      window.turnstile = {
        render: function (sel, o) {
          var box = typeof sel === "string" ? document.querySelector(sel) : sel;
          box.innerHTML = '<label style="display:inline-flex;align-items:center;gap:10px;border:1px solid #bbb;border-radius:6px;padding:14px 16px;background:#fafafa;font:15px system-ui;color:#222"><input type="checkbox" id="fake-turnstile" style="width:22px;height:22px"> I\\'m not a robot <small style="color:#888">(test stand-in)</small></label>';
          box.querySelector("input").addEventListener("change", function () { o.callback("fake-turnstile-token"); });
          return "w1";
        },
        reset: function () { var i = document.getElementById("fake-turnstile"); if (i) i.checked = false; }
      };
      if (onload && window[onload]) window[onload]();
    })();`
  }));
  // Google Identity Services stand-in: renderButton draws a button that "signs in".
  await page.route("https://accounts.google.com/gsi/client", route => route.fulfill({
    contentType: "text/javascript",
    body: `window.google = { accounts: { id: {
      initialize: function (o) { window.__gis = o; },
      renderButton: function (el, opts) {
        window.__gisButton = opts;
        el.innerHTML = '<button type="button" id="fake-google" title="test stand-in" style="display:inline-flex;align-items:center;gap:10px;height:40px;padding:0 16px;border:1px solid #dadce0;border-radius:20px;background:#fff;font:500 14px system-ui;color:#3c4043;cursor:pointer"><b style="color:#4285f4;font:700 18px system-ui">G</b>Sign in with Google</button>';
        el.querySelector("button").addEventListener("click", function () { window.__gis.callback({ credential: "fake-google-id-token", select_by: "btn" }); });
      },
      disableAutoSelect: function () { window.__gisSignedOut = true; }
    } } };`
  }));
}

// The fake Worker: POST /ideas, POST /auth/google, GET /auth/github/start, GET /queue.
async function fakeIntake(page, { ideas = () => ({ status: 201, body: { ok: true, number: 9, status: "status: submitted", submitter: "unknown", signed_in: true } }) } = {}) {
  const posts = [], google = [], starts = [];
  await page.route(`${INTAKE}/**`, async route => {
    const req = route.request();
    const url = new URL(req.url());
    const cors = { "Access-Control-Allow-Origin": new URL(page.url()).origin, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
    const json = (status, body) => route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === "/ideas" && req.method() === "POST") {
      const body = JSON.parse(req.postData());
      posts.push(body);
      const r = ideas(body);
      return json(r.status, r.body);
    }
    if (url.pathname === "/auth/google" && req.method() === "POST") {
      google.push(JSON.parse(req.postData()));
      return json(200, { ok: true, provider: "google", name: "Pat Grownup", session: GOOGLE_SESSION });
    }
    if (url.pathname === "/auth/github/start") {
      // Stands in for the trip to GitHub and back through /auth/github/callback.
      const ret = url.searchParams.get("return");
      starts.push(ret);
      return route.fulfill({ status: 302, headers: { Location: `${ret}#gameon_session=${GITHUB_SESSION}` } });
    }
    if (url.pathname === "/queue") return json(200, { ok: true, at: new Date().toISOString(), ideas: [] });
    return route.fulfill({ status: 404, headers: cors, body: "{}" });
  });
  return { posts, google, starts };
}

async function fits(page) {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(scroll, "no sideways scrolling").toBeLessThanOrEqual(inner);
}

async function typeIdea(page, text = IDEA, nick = "Bean") {
  await page.locator("#tab-type").click();
  await page.locator("#idea").fill(text);
  await page.locator("#maker").fill(nick);
}

test("with no sign-in configured, the page shows no sign-in and loads nothing from Google", async ({ page, shot, note, browserErrors }) => {
  await configure(page, { google: false, github: false });
  await fakeIntake(page);
  await page.goto("new/");
  await expect(page.locator("#fake-turnstile")).toBeVisible();
  await expect(page.locator("#signin")).toBeHidden();
  await expect(page.locator("script#google-gsi")).toHaveCount(0);
  await expect(page.getByText("Sign in with").filter({ visible: true })).toHaveCount(0);

  // And with no intake at all, even if providers are named: sign-in needs the Worker.
  await page.route("**/new/intake-config.js", route => route.fulfill({
    contentType: "text/javascript", body: 'window.GAMEON_INTAKE = { url: "", googleClientId: "' + GOOGLE_ID + '", githubSignIn: true };' }));
  await page.reload();
  expect(await page.evaluate(() => window.GAMEON_INTAKE.url)).toBe("");
  await expect(page.locator("#signin")).toBeHidden();
  await expect(page.locator("script#google-gsi")).toHaveCount(0);
  note("intake on with no providers, and intake off with providers named: no sign-in box, no Google script");
  await fits(page);
  await shot("no-providers");
  expect(browserErrors).toEqual([]);
});

test("with sign-in on, sending without signing in is unchanged: robot check, Turnstile token", async ({ page, shot, note, browserErrors }) => {
  await configure(page);
  const intake = await fakeIntake(page, { ideas: () => ({ status: 201, body: { ok: true, number: 8, status: "status: submitted", submitter: "unknown" } }) });
  await page.goto("new/");
  await expect(page.locator("#signin")).toBeVisible();
  await expect(page.locator("#signin")).toContainText("It's optional, so you can also just send it.");
  await expect(page.locator("#fake-google")).toBeVisible();
  await expect(page.locator("#github-signin")).toBeVisible();
  await expect(page.locator("#signed-in")).toBeHidden();
  await expect(page.locator("#fake-turnstile")).toBeVisible();
  expect(await page.evaluate(() => window.__gis.client_id)).toBe(GOOGLE_ID);
  await typeIdea(page);
  await fits(page);
  await page.locator("#send").scrollIntoViewIfNeeded();
  await shot("signed-out");

  await page.locator("#send").click();
  await expect(page.locator("#send-msg")).toHaveText("Tap the \"I'm not a robot\" box first.");
  await page.locator("#fake-turnstile").check();
  await page.locator("#send").click();
  await expect(page.locator("#handoff-msg")).toContainText("A grown-up checks it before it gets built.");
  expect(intake.posts).toEqual([{ idea: IDEA, maker: "Bean", told_by: "typing", turnstile: "fake-turnstile-token" }]);
  expect(intake.google).toEqual([]);
  note(`body sent: ${JSON.stringify(intake.posts[0]).replace(IDEA, "<idea>")}`);
  expect(browserErrors).toEqual([]);
});

test("Google sign-in shows Signed in as, skips the robot check and sends the session token", async ({ page, shot, note, browserErrors }) => {
  await configure(page);
  const intake = await fakeIntake(page);
  await page.goto("new/");
  await typeIdea(page);
  await page.locator("#fake-google").click();
  await expect(page.locator("#signed-in")).toHaveText(/Signed in as Pat Grownup\s*Sign out/);
  await expect(page.locator("#signin-out")).toBeHidden();
  await expect(page.locator("#robot")).toBeHidden();
  expect(intake.google).toEqual([{ credential: "fake-google-id-token" }]);
  await fits(page);
  await page.locator("#send").scrollIntoViewIfNeeded();
  await shot("google-signed-in");

  await page.locator("#send").click();
  await expect(page.locator("#handoff")).toBeVisible();
  expect(intake.posts).toEqual([{ idea: IDEA, maker: "Bean", told_by: "typing", session: GOOGLE_SESSION }]);
  note("POST /auth/google gets {credential}; POST /ideas gets {idea, maker, told_by, session} and no turnstile");

  // Remembered on this device.
  await page.reload();
  await expect(page.locator("#signed-in")).toContainText("Signed in as Pat Grownup");
  await expect(page.locator("#robot")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("gameon.arcade.signin"))).toBe(GOOGLE_SESSION);
  note("after a reload: still signed in (gameon.arcade.signin), still no robot check");
  expect(browserErrors).toEqual([]);
});

test("GitHub sign-in comes back with the token in the fragment, which leaves the address at once", async ({ page, shot, note, browserErrors }) => {
  await configure(page);
  const intake = await fakeIntake(page);
  await page.goto("new/?from=evidence");
  await typeIdea(page, IDEA, "Rocket");
  await page.locator("#github-signin").click();
  await page.waitForURL(u => u.pathname.endsWith("/new/") && !u.href.includes(INTAKE));
  await expect(page.locator("#signed-in")).toContainText("Signed in as Gee Grownup");

  const start = new URL(intake.starts[0]);
  expect(start.pathname).toMatch(/\/new\/$/);
  expect(start.search).toBe("?from=evidence");
  const href = await page.evaluate(() => location.href);
  expect(href).not.toContain("gameon_session");
  expect(href).not.toContain("#");
  expect(href).toMatch(/\/new\/\?from=evidence$/);
  // What the kid typed survived the trip.
  await expect(page.locator("#idea")).toHaveValue(IDEA);
  await expect(page.locator("#maker")).toHaveValue("Rocket");
  await expect(page.locator("#robot")).toBeHidden();
  await fits(page);
  await page.locator("#send").scrollIntoViewIfNeeded();
  await shot("github-signed-in");

  await page.locator("#send").click();
  await expect(page.locator("#handoff")).toBeVisible();
  expect(intake.posts).toEqual([{ idea: IDEA, maker: "Rocket", told_by: "typing", session: GITHUB_SESSION }]);
  note(`address after the return: ${new URL(href).pathname}${new URL(href).search} (no fragment); the idea and nickname were kept`);

  // A cancelled sign-in comes back with an error, which leaves the address too.
  await page.locator("#signout").click();
  await page.goto("new/#gameon_signin_error=cancelled");
  await expect(page.locator("#send-msg")).toHaveText("Sign-in cancelled. You can still just send it.");
  expect(await page.evaluate(() => location.hash)).toBe("");
  await expect(page.locator("#fake-turnstile")).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("Sign out forgets the session and brings back the robot check", async ({ page, shot, note, browserErrors }) => {
  await configure(page);
  const intake = await fakeIntake(page);
  await page.addInitScript(token => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("gameon.arcade.signin", token); sessionStorage.setItem("seeded", "1"); } }, GOOGLE_SESSION);
  await page.goto("new/");
  await expect(page.locator("#signed-in")).toContainText("Signed in as Pat Grownup");
  await expect(page.locator("#robot")).toBeHidden();
  await page.locator("#signout").click();
  await expect(page.locator("#signed-in")).toBeHidden();
  await expect(page.locator("#fake-google")).toBeVisible();
  await expect(page.locator("#github-signin")).toBeVisible();
  await expect(page.locator("#fake-turnstile")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("gameon.arcade.signin"))).toBeNull();
  await page.reload();
  await expect(page.locator("#signed-in")).toBeHidden();
  await expect(page.locator("#fake-turnstile")).toBeVisible();
  note("Sign out clears gameon.arcade.signin; after a reload the robot check is back");

  // A session the Worker refuses (expired, or the secret changed) signs out too.
  await page.evaluate(token => localStorage.setItem("gameon.arcade.signin", token), GOOGLE_SESSION);
  await page.reload();
  await page.unroute(`${INTAKE}/**`);
  const refusing = await fakeIntake(page, { ideas: () => ({ status: 401, body: { ok: false, error: "signed_out", message: "You've been signed out. Sign in again, or just send it." } }) });
  await typeIdea(page);
  await page.locator("#send").click();
  await expect(page.locator("#send-msg")).toHaveText("You've been signed out. Sign in again, or just send it.");
  await expect(page.locator("#signed-in")).toBeHidden();
  await expect(page.locator("#fake-turnstile")).toBeVisible();
  await expect(page.locator("#idea")).toHaveValue(IDEA);
  expect(refusing.posts[0].session).toBe(GOOGLE_SESSION);
  expect(intake.posts).toEqual([]);
  note("a signed_out refusal from the Worker signs out, keeps the idea, and shows the robot check");
  await fits(page);
  await page.locator("#send").scrollIntoViewIfNeeded();
  await shot("signed-out-again");
  // The browser logs the Worker's 401 as a failed resource; nothing else.
  expect(browserErrors.filter(e => !/Failed to load resource/.test(e))).toEqual([]);
});

test("the committed config turns on Google and GitHub sign-in", async ({ note }) => {
  const src = readFileSync(new URL("../../new/intake-config.js", import.meta.url), "utf8");
  const window = {};
  new Function("window", src)(window);
  expect(window.GAMEON_INTAKE.url).toBe("https://gameon-intake.jwildfire.workers.dev");
  expect(window.GAMEON_INTAKE.familyCodes).toBe(false);
  expect(window.GAMEON_INTAKE.googleClientId).toBe("72221777467-bqbv0k3q66n8u81qul1dlroupt7f5dc6.apps.googleusercontent.com");
  expect(window.GAMEON_INTAKE.githubSignIn).toBe(true);
  note("new/intake-config.js: url and familyCodes false unchanged; the GameOn Google client ID and githubSignIn true (Jeremy set the Worker up, 2026-10-24)");
});
