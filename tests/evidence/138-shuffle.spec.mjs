// Evidence for #138: the shuffle button in the bottom-right corner changes the background.
// Run: npm run evidence -- tests/evidence/138-shuffle
import { test, expect } from "./evidence.mjs";

const wall = page => page.evaluate(() => ({ id: document.documentElement.getAttribute("data-wall"), bg: getComputedStyle(document.body).backgroundColor, img: getComputedStyle(document.body).backgroundImage }));
function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test("in Normal, shuffle changes the wall, and the pick sticks and follows to the New Game page", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const btn = page.locator(".gob-ctl [data-shuffle]");
  await expect(page.locator(".gob-next")).toBeHidden();
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute("aria-label", "Shuffle the background");
  const before = await wall(page);
  expect(before.id).toBe("sunny");
  await btn.click();
  const after = await wall(page);
  expect(after.id).not.toBe(before.id);
  expect(after.bg + after.img).not.toBe(before.bg + before.img);
  await shot("normal-shuffled");
  await page.reload();
  expect((await wall(page)).id).toBe(after.id);
  await page.goto("new/");
  expect((await wall(page)).id).toBe(after.id);
  await shot("new-game-same-wall");
  note(`sunny → ${after.id}; kept after a reload and on the New Game page`);
  expect(browserErrors).toEqual([]);
});

test("every wall is light enough for the dark text (contrast at least 7:1)", async ({ page, note }) => {
  await page.goto("./");
  const ids = await page.evaluate(() => window.gameonMode.walls);
  expect(ids.length).toBeGreaterThanOrEqual(10);
  const ink = luminance("rgb(29,26,47)");
  const seen = new Set();
  // Shuffle picks at random, so allow plenty of tries (60 missed a wall about one run in 15).
  for (let i = 0; i < 400 && seen.size < ids.length; i++) {
    await page.evaluate(() => window.gameonMode.shuffle());
    const w = await wall(page);
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    const ratio = (luminance(w.bg) + 0.05) / (ink + 0.05);
    expect(ratio, `${w.id} contrast`).toBeGreaterThanOrEqual(7);
  }
  expect(seen.size).toBe(ids.length);
  note(`${ids.length} walls, all at least 7:1 against the dark text`);
});

test("in Weird, shuffle moves to the next background", async ({ page, note, browserErrors }) => {
  await page.goto("./?mode=weird&bgInterval=600");
  await expect.poll(() => page.evaluate(() => window.GameOnBackgrounds && window.GameOnBackgrounds.runner && window.GameOnBackgrounds.runner.id), { timeout: 10000 }).toBeTruthy();
  const first = await page.evaluate(() => window.GameOnBackgrounds.runner.id);
  await expect(page.locator(".gob-next")).toBeVisible();
  await page.locator(".gob-ctl [data-shuffle]").click();
  await expect.poll(() => page.evaluate(() => window.GameOnBackgrounds.runner.id), { timeout: 5000 }).not.toBe(first);
  note(`${first} → ${await page.evaluate(() => window.GameOnBackgrounds.runner.id)}`);
  expect(browserErrors).toEqual([]);
});

test("Shuffle sits in the bottom-right corner, on screen, and hides while a game plays", async ({ page, shot, note }) => {
  await page.goto("./");
  const width = await page.evaluate(() => innerWidth), height = await page.evaluate(() => innerHeight);
  const c = await page.locator(".gob-ctl").boundingBox();
  expect(c.x + c.width).toBeGreaterThan(width - 40);
  expect(c.y + c.height).toBeGreaterThan(height - 40);
  for (const sel of [".gob-ctl", ".mode-switch", "#make-btn", "#gh-home"]) {
    const b = await page.locator(sel).boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, sel).toBeLessThanOrEqual(width + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.goto("new/");
  const s = await page.locator(".mode-switch").boundingBox();
  expect(s.x + s.width).toBeLessThanOrEqual(width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.goto("./#mazeathon");
  await expect(page.locator("#player")).toBeVisible();
  await expect(page.locator(".gob-ctl")).toBeHidden();
  note(`${width}px: Shuffle in the bottom-right corner, everything on screen, hidden in the game player`);
  await page.goto("./");
  await shot("fits");
});
