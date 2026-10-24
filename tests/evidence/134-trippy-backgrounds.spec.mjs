// Evidence for #134: trippy animated backgrounds that cycle behind the arcade and the New Game page.
// Run: npm run evidence -- tests/evidence/134-trippy-backgrounds
import { readFileSync } from "node:fs";
import { test, expect, games } from "./evidence.mjs";

// Headless Chromium without a GPU only gets WebGL through SwiftShader, which newer versions
// want asked for by name. Real browsers without WebGL fall back to the canvas-only picks.
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

const source = readFileSync(new URL("../../assets/backgrounds.js", import.meta.url), "utf8");
const picks = JSON.parse(source.match(/var PICKS = (\[[^\]]*\])/)[1].replace(/\s+/g, " "));

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

const state = page => page.evaluate(() => document.documentElement.getAttribute("data-bg-state"));
const current = page => page.evaluate(() => document.documentElement.getAttribute("data-bg"));
const frames = page => page.evaluate(() => window.GameOnBackgrounds.runner.frames);

test("a trippy background draws behind the arcade, light on frames", async ({ page, shot, note, browserErrors }, info) => {
  await page.goto("./");
  await ready(page);
  await expect.poll(() => state(page)).toBe("running");
  await page.waitForTimeout(1200);
  const s = await canvasStats(page);
  expect(s.colours).toBeGreaterThan(8);
  const order = await page.evaluate(() => window.GameOnBackgrounds.runner.order);
  expect(order).toEqual(picks);
  expect(await page.evaluate(() => window.GameOnBackgrounds.hasGL())).toBe(true);
  // The canvas is CSS-pixel sized at most, and the cards stay solid on top of it.
  const vp = page.viewportSize();
  expect(s.w).toBeLessThanOrEqual(vp.width);
  await expect(page.locator(".cart").first()).toHaveCSS("background-color", "rgb(255, 253, 246)");
  await expect(page.locator(".lede")).toHaveCSS("background-color", "rgb(255, 253, 246)");
  await expect(page.locator(".foot")).toHaveCSS("background-color", "rgb(255, 253, 246)");
  const f0 = await frames(page);
  await page.waitForTimeout(2000);
  const fps = ((await frames(page)) - f0) / 2;
  if (info.project.name === "phone") expect(fps).toBeLessThanOrEqual(33);
  note(`showing ${await current(page)}, ${s.colours} colours on a ${s.w}x${s.h} canvas, about ${Math.round(fps)} fps`);
  await shot("arcade");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("the cycle crossfades to the next background by itself", async ({ page, note, browserErrors }) => {
  await page.goto("./?bgInterval=2");
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
  await page.goto("./?bgInterval=9999");
  await ready(page);
  const ctl = page.locator(".gob-ctl");
  await expect(ctl).toBeVisible();
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

test("off brings back the yellow wall and stays off after a reload", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await ready(page);
  await page.locator(".gob-toggle").click();
  await expect(page.locator("canvas.gob-canvas")).toBeHidden();
  expect(await state(page)).toBe("off");
  expect(await page.evaluate(() => localStorage.getItem("gameon.arcade.bg"))).toBe("off");
  await page.reload();
  await ready(page);
  await expect(page.locator("canvas.gob-canvas")).toBeHidden();
  expect(await state(page)).toBe("off");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 210, 63)");
  await expect(page.locator(".gob-toggle")).toHaveText("Trippy!");
  await expect(page.locator(".gob-next")).toBeHidden();
  note("after a reload: canvas hidden, wall back to #ffd23f, gameon.arcade.bg = off");
  await shot("off");
  await page.locator(".gob-toggle").click();
  await expect(page.locator("canvas.gob-canvas")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("gameon.arcade.bg"))).toBe("on");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("reduced motion gets a still frame", async ({ page, shot, note, browserErrors }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await ready(page);
  expect(await state(page)).toBe("still");
  const a = await canvasStats(page);
  expect(a.colours).toBeGreaterThan(8);
  const f0 = await frames(page);
  await page.waitForTimeout(1500);
  const b = await canvasStats(page);
  expect(b.hash).toBe(a.hash);
  expect(await frames(page)).toBe(f0);
  // Skip still works, as a new still frame.
  const before = await current(page);
  await page.locator(".gob-next").click();
  expect(await current(page)).not.toBe(before);
  expect(await state(page)).toBe("still");
  note(`still frame of ${await current(page)}: no frames drawn in 1.5 s, pixels unchanged`);
  await shot("reduced-motion");
  expect(browserErrors).toEqual([]);
});

test("the background pauses and the control hides while a game plays", async ({ page, note, browserErrors }) => {
  const g = games.find(x => !x.versions || x.versions.length < 2);
  await page.goto("./");
  await ready(page);
  await expect.poll(() => state(page)).toBe("running");
  await page.goto(`./#${g.slug}`);
  await expect(page.locator("#player")).toBeVisible();
  await expect.poll(() => state(page)).toBe("paused");
  await expect(page.locator(".gob-ctl")).toBeHidden();
  const f0 = await frames(page);
  await page.waitForTimeout(1200);
  expect(await frames(page)).toBe(f0);
  await page.locator("#home-btn").click();
  await expect(page.locator("#home")).toBeVisible();
  await expect.poll(() => state(page)).toBe("running");
  await expect(page.locator(".gob-ctl")).toBeVisible();
  note(`playing ${g.title}: paused, no frames drawn in 1.2 s, control hidden; back home it runs again`);
  expect(browserErrors).toEqual([]);
});

test("the New Game page cycles the same backgrounds behind its cards", async ({ page, shot, note, browserErrors }) => {
  await page.goto("new/");
  await ready(page);
  await expect.poll(() => state(page)).toBe("running");
  await page.waitForTimeout(1000);
  const s = await canvasStats(page);
  expect(s.colours).toBeGreaterThan(8);
  await expect(page.locator(".gob-ctl")).toBeVisible();
  await expect(page.locator("h1")).toHaveCSS("background-color", "rgb(255, 253, 246)");
  await expect(page.locator(".card").first()).toHaveCSS("background-color", "rgb(255, 253, 246)");
  note(`showing ${await current(page)}`);
  await shot("new-game");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("each of the ten picks behind the arcade", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(90_000);
  for (const [i, id] of picks.entries()) {
    await page.goto(`./?bg=${id}&bgInterval=9999`);
    await ready(page);
    expect(await current(page)).toBe(id);
    await page.waitForTimeout(1500);
    expect((await canvasStats(page)).colours).toBeGreaterThan(8);
    await shot(`pick-${String(i + 1).padStart(2, "0")}-${id}`);
  }
  note(picks.join(", "));
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});
