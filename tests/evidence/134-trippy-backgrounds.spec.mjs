// Evidence for #134: Weird and Normal modes. Normal is today's arcade; Weird cycles trippy
// animated backgrounds behind the arcade and the New Game page, with rotating taglines.
// Run: npm run evidence -- tests/evidence/134-trippy-backgrounds
import { readFileSync } from "node:fs";
import { test, expect, games } from "./evidence.mjs";

// Headless Chromium without a GPU only gets WebGL through SwiftShader, which newer versions
// want asked for by name. Real browsers without WebGL fall back to the canvas-only picks.
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

const source = readFileSync(new URL("../../assets/backgrounds.js", import.meta.url), "utf8");
const picks = JSON.parse(source.match(/var PICKS = (\[[^\]]*\])/)[1].replace(/\s+/g, " "));
const FIXED = "Think of a Game? Make it, play it, change it!";
const CARD = "rgb(255, 253, 246)", WALL = "rgb(255, 210, 63)";

async function ready(page) {
  await page.waitForFunction(() => window.GameOnBackgrounds && window.GameOnBackgrounds.runner);
}

// How many different colours the background canvas shows, and a fingerprint of its pixels.
async function canvasStats(page) {
  return page.evaluate(() => {
    const c = document.querySelector("canvas.gob-canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    let hash = 0;
    for (let i = 0; i < d.length; i += 4 * 97) {
      seen.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3));
      hash = (hash * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0;
    }
    return { colours: seen.size, hash, w: c.width, h: c.height };
  });
}

async function noSidewaysScroll(page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

const mode = page => page.evaluate(() => document.documentElement.getAttribute("data-mode"));
const state = page => page.evaluate(() => document.documentElement.getAttribute("data-bg-state"));
const current = page => page.evaluate(() => document.documentElement.getAttribute("data-bg"));
const frames = page => page.evaluate(() => window.GameOnBackgrounds.runner.frames);
const tagline = page => page.locator("#tagline").textContent();
const saved = page => page.evaluate(() => localStorage.getItem("gameon.arcade.mode"));

test("the default is Normal: the yellow wall, the fixed tagline, nothing drawing", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await ready(page);
  expect(await mode(page)).toBe("normal");
  expect(await state(page)).toBe("normal");
  await expect(page.locator("canvas.gob-canvas")).toBeHidden();
  await expect(page.locator(".gob-next")).toBeHidden();
  await expect(page.locator("body")).toHaveCSS("background-color", WALL);
  await expect(page.locator(".lede")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator('[data-mode-set="normal"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-mode-set="weird"]')).toHaveAttribute("aria-pressed", "false");
  expect(await tagline(page)).toBe(FIXED);
  await page.waitForTimeout(7000); // longer than one tagline turn
  expect(await tagline(page)).toBe(FIXED);
  expect(await frames(page)).toBe(0);
  expect(await page.evaluate(() => window.GameOnBackgrounds.runner.order)).toBe(null); // WebGL never touched
  note(`Normal: wall #ffd23f, no frames drawn in 7 s, tagline held on "${FIXED}"`);
  await shot("normal");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("switching to Weird starts the backgrounds and rotating taglines, no reload", async ({ page, shot, note, browserErrors }, info) => {
  await page.goto("./");
  await ready(page);
  await page.evaluate(() => { window.__modes = []; document.addEventListener("gameon:mode", e => window.__modes.push(e.detail.mode)); });
  const loads = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  await page.locator('[data-mode-set="weird"]').click();
  expect(await page.evaluate(() => window.__modes)).toEqual(["weird"]);
  expect(await mode(page)).toBe("weird");
  expect(await saved(page)).toBe("weird");
  await expect(page.locator('[data-mode-set="weird"]')).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => state(page)).toBe("running");
  await page.waitForTimeout(1200);
  const s = await canvasStats(page);
  expect(s.colours).toBeGreaterThan(8);
  expect(await page.evaluate(() => window.GameOnBackgrounds.runner.order)).toEqual(picks);
  expect(await page.evaluate(() => window.GameOnBackgrounds.hasGL())).toBe(true);
  expect(s.w).toBeLessThanOrEqual(page.viewportSize().width); // CSS pixels at most; shaders at half that
  // Words on the wall get a card; the game cards are solid already.
  for (const sel of [".lede", ".foot", ".cart"]) await expect(page.locator(sel).first()).toHaveCSS("background-color", CARD);
  await expect(page.locator(".gob-next")).toBeVisible();
  const first = await tagline(page);
  await expect.poll(() => tagline(page), { timeout: 9000 }).not.toBe(first);
  const f0 = await frames(page);
  await page.waitForTimeout(2000);
  const fps = ((await frames(page)) - f0) / 2;
  if (info.project.name === "phone") expect(fps).toBeLessThanOrEqual(33);
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(loads);
  note(`Weird: ${await current(page)} on a ${s.w}x${s.h} canvas (${s.colours} colours), about ${Math.round(fps)} fps; tagline moved on from "${first}"`);
  await shot("weird");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("Weird survives a reload and carries to the New Game page", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await ready(page);
  await page.locator('[data-mode-set="weird"]').click();
  await page.reload();
  await ready(page);
  expect(await mode(page)).toBe("weird");
  await expect.poll(() => state(page)).toBe("running");
  await page.goto("new/");
  await ready(page);
  expect(await mode(page)).toBe("weird");
  await expect(page.locator('[data-mode-set="weird"]')).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => state(page)).toBe("running");
  await page.waitForTimeout(1000);
  expect((await canvasStats(page)).colours).toBeGreaterThan(8);
  await expect(page.locator("h1")).toHaveCSS("background-color", CARD);
  await expect(page.locator(".card").first()).toHaveCSS("background-color", CARD);
  await expect(page.locator(".gob-next")).toBeVisible();
  note(`after a reload: Weird; New Game page: Weird, showing ${await current(page)}`);
  await shot("new-game-weird");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("switching back to Normal stops everything", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./?mode=weird");
  await ready(page);
  await expect.poll(() => state(page)).toBe("running");
  await page.locator('[data-mode-set="normal"]').click();
  expect(await mode(page)).toBe("normal");
  expect(await state(page)).toBe("normal");
  await expect(page.locator("canvas.gob-canvas")).toBeHidden();
  await expect(page.locator(".gob-next")).toBeHidden();
  await expect(page.locator(".lede")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(await tagline(page)).toBe(FIXED);
  expect(await current(page)).toBe(null);
  const f0 = await frames(page);
  await page.waitForTimeout(7000);
  expect(await frames(page)).toBe(f0);
  expect(await tagline(page)).toBe(FIXED);
  await page.goto("new/");
  expect(await mode(page)).toBe("normal");
  await expect(page.locator("canvas.gob-canvas")).toBeHidden();
  await expect(page.locator("body")).toHaveCSS("background-color", WALL);
  note("Normal again: canvas hidden, no frames in 7 s, fixed tagline, and the New Game page follows");
  await shot("new-game-normal");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("in Weird mode the cycle crossfades to the next background by itself", async ({ page, note, browserErrors }) => {
  await page.goto("./?mode=weird&bgInterval=2");
  await ready(page);
  const first = await current(page);
  await expect.poll(() => current(page), { timeout: 10_000 }).not.toBe(first);
  const second = await current(page);
  expect(picks.indexOf(second)).toBe((picks.indexOf(first) + 1) % picks.length);
  note(`${first} moved on to ${second} (interval shortened to 2 s with ?bgInterval=2; normally 30 to 45 s)`);
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("the skip button changes the background", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./?mode=weird&bgInterval=9999");
  await ready(page);
  const before = await current(page);
  await page.locator(".gob-next").click();
  await expect.poll(() => current(page)).not.toBe(before);
  const after = await current(page);
  await page.waitForTimeout(1000);
  note(`skip: ${before} → ${after}`);
  await shot("skip");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("reduced motion in Weird mode gets a still frame and one tagline", async ({ page, shot, note, browserErrors }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./?mode=weird");
  await ready(page);
  expect(await state(page)).toBe("still");
  const a = await canvasStats(page);
  expect(a.colours).toBeGreaterThan(8);
  const line = await tagline(page);
  const f0 = await frames(page);
  await page.waitForTimeout(7000);
  expect((await canvasStats(page)).hash).toBe(a.hash);
  expect(await frames(page)).toBe(f0);
  expect(await tagline(page)).toBe(line);
  // Skip still works, as a new still frame.
  const before = await current(page);
  await page.locator(".gob-next").click();
  expect(await current(page)).not.toBe(before);
  expect(await state(page)).toBe("still");
  note(`still frame of ${await current(page)}: no frames and the same pixels and tagline ("${line}") for 7 s`);
  await shot("reduced-motion");
  expect(browserErrors).toEqual([]);
});

test("the background pauses and the skip button hides while a game plays", async ({ page, note, browserErrors }) => {
  const g = games.find(x => !x.versions || x.versions.length < 2);
  await page.goto("./?mode=weird");
  await ready(page);
  await expect.poll(() => state(page)).toBe("running");
  await page.goto(`./?mode=weird#${g.slug}`);
  await expect(page.locator("#player")).toBeVisible();
  await expect.poll(() => state(page)).toBe("paused");
  await expect(page.locator(".gob-next")).toBeHidden();
  const f0 = await frames(page);
  await page.waitForTimeout(1200);
  expect(await frames(page)).toBe(f0);
  await page.locator("#home-btn").click();
  await expect(page.locator("#home")).toBeVisible();
  await expect.poll(() => state(page)).toBe("running");
  await expect(page.locator(".gob-next")).toBeVisible();
  note(`playing ${g.title}: paused, no frames drawn in 1.2 s, skip hidden; back home it runs again`);
  expect(browserErrors).toEqual([]);
});

test("each of the ten Weird picks behind the arcade", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(90_000);
  for (const [i, id] of picks.slice(0, 10).entries()) { // the #134 ten; #141 checks the rest
    await page.goto(`./?mode=weird&bg=${id}&bgInterval=9999`);
    await ready(page);
    expect(await current(page)).toBe(id);
    await page.waitForTimeout(1500);
    expect((await canvasStats(page)).colours).toBeGreaterThan(8);
    await shot(`pick-${String(i + 1).padStart(2, "0")}-${id}`);
  }
  note(picks.slice(0, 10).join(", "));
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});
