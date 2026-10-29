// Evidence for #130: a game controller drives the arcade. A stubbed navigator.getGamepads (one
// standard-mapping pad, shared by the arcade and the game in its frame) and a gamepadconnected
// event stand in for a real controller.
// Run: npm run evidence -- 130-gamepad-arcade
import { readFileSync } from "node:fs";
import { test, expect } from "./evidence.mjs";

const real = JSON.parse(readFileSync(new URL("../../games.json", import.meta.url), "utf8"));
const pick = slug => real.find(g => g.slug === slug);
// Four real games (for their covers) pointed at stand-in pages, one of them with two versions.
const at = (slug, ver) => `pad-test/${slug}/${ver}/`;
const list = [
  { ...pick("mazeathon"), url: at("mazeathon", "jeremy.v1"), versions: undefined, default: undefined },
  { ...pick("trampoline-battle"), url: at("trampoline-battle", "jeremy.v2"), default: "jeremy.v2", versions: [
    { id: "jeremy.v1", url: at("trampoline-battle", "jeremy.v1"), note: "The first version" },
    { id: "jeremy.v2", url: at("trampoline-battle", "jeremy.v2"), note: "Bouncier", from: "jeremy.v1" }
  ] },
  { ...pick("fancy-food-fight"), url: at("fancy-food-fight", "jeremy.v1"), versions: undefined, default: undefined },
  { ...pick("super-sauce-boy"), url: at("super-sauce-boy", "jeremy.v1"), versions: undefined, default: undefined }
].map(g => ({ ...g, editorsChoice: false }));

// A stand-in game that reads the controller itself and counts A presses.
const standIn = (title, ver) => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="margin:0;display:grid;place-items:center;height:100vh;background:#7fd1ff;font:800 22px system-ui;text-align:center">
<div><h1 id="title" style="margin:0 0 8px">${title} · ${ver}</h1><p id="count" style="margin:0">A presses: 0</p></div>
<script>
  let n = 0, was = null; // a button already held when the game starts doesn't count
  (function loop() {
    const p = Array.from(navigator.getGamepads() || []).find(Boolean);
    const down = !!(p && p.buttons[0].pressed);
    if (down && was === false) document.getElementById("count").textContent = "A presses: " + (++n);
    was = down;
    requestAnimationFrame(loop);
  })();
</script>`;

const BTN = { a: 0, b: 1, y: 3, select: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };

async function setUp(page) {
  await page.route("**/games.json", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(list) }));
  await page.route("**/pad-test/**", r => {
    const [, slug, ver] = new URL(r.request().url()).pathname.match(/pad-test\/([^/]+)\/([^/]+)\//);
    return r.fulfill({ status: 200, contentType: "text/html", body: standIn(pick(slug).title, ver) });
  });
  // Every frame sees the same pad: the top page holds its state in window.__pad.
  await page.addInitScript(() => {
    if (window === window.top) window.__pad = { connected: false, buttons: Array(17).fill(false), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => {
      let s = null;
      try { s = window.top.__pad; } catch (e) {}
      if (!s || !s.connected) return [null, null, null, null];
      return [{
        id: "Test pad (STANDARD GAMEPAD)", index: 0, connected: true, mapping: "standard", timestamp: performance.now(),
        axes: s.axes.slice(), buttons: s.buttons.map(p => ({ pressed: p, touched: p, value: p ? 1 : 0 }))
      }, null, null, null];
    };
  });
}
async function connect(page) {
  await page.evaluate(() => {
    window.__pad.connected = true;
    const e = new Event("gamepadconnected");
    e.gamepad = navigator.getGamepads()[0];
    window.dispatchEvent(e);
  });
}
// Hold the buttons for a few frames, then let go for a few more.
async function press(page, ...names) {
  await page.evaluate(async idx => {
    const frames = n => new Promise(done => { const tick = () => (n-- > 0 ? requestAnimationFrame(tick) : done()); tick(); });
    idx.forEach(i => { window.__pad.buttons[i] = true; });
    await frames(3);
    idx.forEach(i => { window.__pad.buttons[i] = false; });
    await frames(3);
  }, names.map(n => BTN[n]));
}
const ring = page => page.locator(".gp-focus");
const hints = page => page.locator("#pad-hints");

test("the hints and focus ring show only once a controller is connected", async ({ page, shot, note, browserErrors }, testInfo) => {
  await setUp(page);
  await page.goto("./");
  await expect(page.locator("#shelf .cart")).toHaveCount(list.length);
  await page.waitForTimeout(1200); // past the arcade's once-a-second check for controllers
  await expect(hints(page)).toBeHidden();
  await expect(ring(page)).toHaveCount(0);

  await connect(page);
  await expect(hints(page)).toBeVisible();
  await expect(hints(page)).toHaveAttribute("data-ctx", "home");
  await expect(hints(page)).toContainText("Play");
  await expect(ring(page)).toHaveAttribute("href", "#mazeathon");
  // Desktop has three cards to a row, the phone one: the next card is right, or down.
  const next = testInfo.project.name === "desktop" ? "right" : "down";
  await press(page, next);
  await expect(ring(page)).toHaveAttribute("href", "#trampoline-battle");
  const shows = next === "right" ? '"Move · A Play"' : '"A Play" (phones leave out Move)';
  note(`connected: hints show ${shows}; ${next} on the D-pad moves the ring from MazeAThon to Trampoline Battle`);
  await shot("home");

  await page.evaluate(() => {
    window.__pad.connected = false;
    window.dispatchEvent(new Event("gamepaddisconnected"));
  });
  await expect(hints(page)).toBeHidden();
  await expect(ring(page)).toHaveCount(0);
  note("disconnected: hints and ring gone");
  expect(browserErrors).toEqual([]);
});

test("with only a controller you can pick a game, pick a version, play, switch games and come back", async ({ page, shot, note, browserErrors }, testInfo) => {
  await setUp(page);
  await page.goto("./");
  await expect(page.locator("#shelf .cart")).toHaveCount(list.length);
  await connect(page);
  await expect(ring(page)).toHaveAttribute("href", "#mazeathon");
  const game = page.frameLocator("#frame");

  // Pick a game with two versions, then pick its first version.
  await press(page, testInfo.project.name === "desktop" ? "right" : "down");
  await press(page, "a");
  await expect(page.locator("#chooser")).toBeVisible();
  await expect(ring(page)).toHaveAttribute("data-version", "jeremy.v2");
  await press(page, "down");
  await expect(ring(page)).toHaveAttribute("data-version", "jeremy.v1");
  await expect(hints(page)).toHaveAttribute("data-ctx", "chooser");
  await shot("chooser");
  await press(page, "a");
  await expect(page).toHaveURL(/#trampoline-battle@jeremy\.v1$/);
  await expect(game.locator("#title")).toHaveText("Trampoline Battle · jeremy.v1");
  note("A on Trampoline Battle opens Which version?; Down, A plays jeremy.v1");

  // Playing: the game gets the buttons, the arcade keeps out of the way.
  await expect(hints(page)).toHaveAttribute("data-ctx", "game");
  await expect(hints(page)).toContainText("Arcade menu");
  await expect(hints(page)).not.toHaveClass(/faded/);
  await press(page, "a");
  await press(page, "a");
  await press(page, "b");
  await press(page, "y");
  await expect(game.locator("#count")).toHaveText("A presses: 2");
  await expect(page).toHaveURL(/#trampoline-battle@jeremy\.v1$/);
  await expect(page.locator("#switcher")).toBeHidden();
  await expect(ring(page)).toHaveCount(0);
  note("in the game, A A B Y reach the game (it counts 2 A presses) and the arcade does nothing");
  await shot("playing");

  // Start+Select brings up the bar: the version menu there opens the chooser.
  await press(page, "start", "select");
  await expect(hints(page)).toHaveAttribute("data-ctx", "bar");
  await expect(ring(page)).toHaveId("home-btn");
  await press(page, "right");
  await expect(ring(page)).toHaveId("switch-btn");
  await press(page, "right");
  await expect(ring(page)).toHaveId("ver-select");
  await shot("bar");
  await press(page, "a");
  await expect(page.locator("#chooser")).toBeVisible();
  await expect(ring(page)).toHaveAttribute("data-version", "jeremy.v1");
  await press(page, "up");
  await press(page, "a");
  await expect(page).toHaveURL(/#trampoline-battle@jeremy\.v2$/);
  await expect(game.locator("#title")).toHaveText("Trampoline Battle · jeremy.v2");
  await expect(hints(page)).toHaveAttribute("data-ctx", "game");
  note("Start+Select, Right, Right, A on the version menu, Up, A switches to jeremy.v2");

  // Start+Select, Y opens the switcher on the game you're playing; pick another.
  await press(page, "start", "select");
  await press(page, "y");
  await expect(page.locator("#switcher")).toBeVisible();
  await expect(ring(page)).toHaveAttribute("data-slug", "trampoline-battle");
  await press(page, "left");
  await expect(ring(page)).toHaveAttribute("data-slug", "mazeathon");
  await shot("switcher");
  await press(page, "a");
  await expect(page).toHaveURL(/#mazeathon$/);
  await expect(game.locator("#title")).toHaveText("MazeAThon · jeremy.v1");
  await expect(page.locator("#switcher")).toBeHidden();
  note("Start+Select, Y, Left, A switches to MazeAThon");

  // Start+Select, A on Arcade: back on the shelf, ringed on the game just played.
  await press(page, "start", "select");
  await expect(ring(page)).toHaveId("home-btn");
  await press(page, "a");
  await expect(page.locator("#home")).toBeVisible();
  await expect(page.locator("#player")).toBeHidden();
  await expect(ring(page)).toHaveAttribute("href", "#mazeathon");
  await expect(hints(page)).toHaveAttribute("data-ctx", "home");
  note("Start+Select, A goes back to the arcade, with the ring on MazeAThon");
  await shot("back-home");
  expect(browserErrors).toEqual([]);
});

test("B backs out of each menu, and touch still works with a controller connected", async ({ page, note, browserErrors }, testInfo) => {
  await setUp(page);
  await page.goto("./");
  await expect(page.locator("#shelf .cart")).toHaveCount(list.length);
  await connect(page);
  await press(page, testInfo.project.name === "desktop" ? "right" : "down");

  await press(page, "a");
  await expect(page.locator("#chooser")).toBeVisible();
  await press(page, "b");
  await expect(page.locator("#chooser")).toBeHidden();
  await expect(page.locator("#home")).toBeVisible();
  await expect(ring(page)).toHaveAttribute("href", "#trampoline-battle");
  note("B in the version chooser goes back to the shelf");

  await press(page, "a");
  await press(page, "a");
  await expect(page).toHaveURL(/#trampoline-battle@jeremy\.v2$/);
  await press(page, "start", "select");
  await expect(hints(page)).toHaveAttribute("data-ctx", "bar");
  await press(page, "b");
  await expect(hints(page)).toHaveAttribute("data-ctx", "game");
  await expect(ring(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe("frame");
  note("B in the bar goes back to the game, which has focus again");

  await press(page, "start", "select");
  await press(page, "y");
  await expect(page.locator("#switcher")).toBeVisible();
  await press(page, "b");
  await expect(page.locator("#switcher")).toBeHidden();
  await expect(hints(page)).toHaveAttribute("data-ctx", "game");
  note("B in the switcher goes back to the game");

  await page.locator("#switch-btn").click();
  await expect(page.locator("#switcher")).toBeVisible();
  await page.locator('#switch-grid .mini[data-slug="super-sauce-boy"]').click();
  await expect(page).toHaveURL(/#super-sauce-boy$/);
  await page.locator("#home-btn").click();
  await expect(page.locator("#home")).toBeVisible();
  note("tapping Games, a game and Arcade still works with a controller connected");
  expect(browserErrors).toEqual([]);
});
