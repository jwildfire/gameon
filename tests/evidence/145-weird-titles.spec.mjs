// Evidence for #145: in Weird mode the big GameOn logo rotates through playful "___On" titles;
// Normal mode always reads "GameOn".
// Run: npm run evidence -- tests/evidence/145-weird-titles
import { test, expect } from "./evidence.mjs";

const ORANGE = "rgb(255, 107, 74)";
const title = page => page.locator("#wordmark").textContent();

async function noSidewaysScroll(page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra).toBeLessThanOrEqual(0);
}

test("Normal mode shows GameOn and it never changes", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./?mode=normal&titleInterval=0.5");
  await expect(page.locator("#wordmark")).toHaveText("GameOn");
  await expect(page.getByRole("heading", { level: 1, name: "GameOn" })).toBeVisible();
  for (let k = 0; k < 6; k++) {
    await page.waitForTimeout(500);
    expect(await title(page)).toBe("GameOn");
  }
  await expect(page.locator("#wordmark .wm-on")).toHaveCSS("color", ORANGE);
  note("GameOn for 3 s with the interval shortened to 0.5 s (?titleInterval=0.5): no change");
  await shot("normal");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("Weird mode starts on GameOn, then swaps in a new ___On title half a beat after the tagline", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./?mode=weird");
  const titles = await page.evaluate(() => window.gameonTitles);
  expect(titles[0]).toBe("GameOn");
  expect(titles.length).toBeGreaterThanOrEqual(30);
  expect(new Set(titles).size).toBe(titles.length);
  for (const t of titles) expect(t).toMatch(/^[A-Z][a-z]+On$/);
  expect(await title(page)).toBe("GameOn");
  // Default timing: the first swap comes at 3.25 s (half of the tagline's 6.5 s), then every 6.5 s.
  // Wait until 2.5 s after navigation started (the timer starts later than that, never earlier).
  await page.waitForFunction(() => performance.now() >= 2500, null, { polling: 50 });
  expect(await title(page)).toBe("GameOn");
  await expect.poll(() => title(page), { timeout: 3000 }).toBe(titles[1]);
  // Still two-tone and still called GameOn for screen readers.
  await expect(page.locator("#wordmark .wm-on")).toHaveText("On");
  await expect(page.locator("#wordmark .wm-on")).toHaveCSS("color", ORANGE);
  await expect(page.getByRole("heading", { level: 1, name: "GameOn" })).toBeVisible();
  await page.waitForTimeout(600); // let the wobble finish
  note(`${titles.length} titles; GameOn held for 2.5 s, then became ${titles[1]} on the default 6.5 s timer's half beat; heading still named GameOn`);
  await shot("weird");
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});

test("switching modes starts and stops the rotation without a reload, and Normal restores GameOn", async ({ page, note, browserErrors }) => {
  await page.goto("./?mode=normal&titleInterval=0.5");
  await page.locator('[data-mode-set="weird"]').click();
  await expect.poll(() => title(page), { timeout: 3000 }).not.toBe("GameOn");
  const seen = new Set();
  for (let k = 0; k < 6; k++) { seen.add(await title(page)); await page.waitForTimeout(300); }
  expect(seen.size).toBeGreaterThan(1);
  await page.locator('[data-mode-set="normal"]').click();
  expect(await title(page)).toBe("GameOn");
  for (let k = 0; k < 6; k++) {
    await page.waitForTimeout(400);
    expect(await title(page)).toBe("GameOn");
  }
  note(`Weird showed ${[...seen].join(", ")}; back in Normal it read GameOn at once and held for 2.4 s`);
  expect(browserErrors).toEqual([]);
});

test("every title fits: no sideways scroll, no wrapping, and the header doesn't move", async ({ page, shot, note, browserErrors }, info) => {
  await page.goto("./?mode=weird&titleInterval=9999");
  await page.evaluate(() => document.fonts.ready);
  const measure = () => page.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    const h = document.getElementById("wordmark"), range = document.createRange();
    range.selectNodeContents(h);
    return {
      text: h.textContent, word: r("#wordmark"), ink: range.getBoundingClientRect().width,
      mast: r(".masthead").height, lede: r("#tagline"), make: r("#make-btn"), gh: r("#gh-home"),
      scroll: document.documentElement.scrollWidth, width: innerWidth
    };
  });
  const first = await measure();
  const titles = await page.evaluate(() => window.gameonTitles);
  let widest = first;
  for (let k = 0; k < titles.length; k++) {
    const m = await measure();
    expect(m.text).toBe(titles[k]);
    expect(m.scroll).toBeLessThanOrEqual(m.width);
    expect(m.word.right).toBeLessThanOrEqual(m.width);
    expect(m.ink).toBeLessThanOrEqual(m.word.width + 1); // the title fits inside the heading's box
    expect(Math.abs(m.word.height - first.word.height)).toBeLessThanOrEqual(1); // one line, never wrapped
    expect(Math.abs(m.mast - first.mast)).toBeLessThanOrEqual(1);
    expect(Math.abs(m.lede.x - first.lede.x)).toBeLessThanOrEqual(1); // the tagline doesn't shuffle sideways
    if (info.project.name === "phone") {
      expect(m.word.x + m.ink).toBeLessThanOrEqual(m.gh.x); // clear of the GitHub button in the corner
    }
    if (info.project.name === "desktop") {
      // The one-row header from #136 still holds: tagline, button and GitHub sit in the logo's band.
      for (const b of [m.lede, m.make, m.gh]) {
        expect(b.y + b.height / 2).toBeGreaterThan(m.word.y);
        expect(b.y + b.height / 2).toBeLessThan(m.word.bottom);
      }
    }
    if (m.ink > widest.ink) widest = m;
    await page.evaluate(() => window.gameonNextTitle());
  }
  await page.evaluate(t => {
    const w = document.getElementById("wm-word");
    w.textContent = t.slice(0, -2);
  }, widest.text);
  note(`${first.width}px: all ${titles.length} titles fit on one line; widest is ${widest.text} at ${Math.round(widest.ink)}px; header ${Math.round(first.mast)}px tall throughout`);
  await shot("widest");
  expect(browserErrors).toEqual([]);
});

test("with reduced motion the title still changes in Weird mode, with no wobble", async ({ page, note, browserErrors }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./?mode=weird&titleInterval=0.5");
  await expect.poll(() => title(page), { timeout: 3000 }).not.toBe("GameOn");
  const changed = await title(page);
  const anims = [];
  for (let k = 0; k < 10; k++) {
    anims.push(await page.evaluate(() => document.getElementById("wm-word").getAnimations().length));
    await page.waitForTimeout(100);
  }
  expect(anims.every(n => n === 0)).toBe(true);
  expect(await title(page)).not.toBe(changed);
  await page.locator('[data-mode-set="normal"]').click();
  expect(await title(page)).toBe("GameOn");
  note(`reduced motion: the title changed (to ${changed}) and kept changing, with no animation running; Normal restored GameOn`);
  await noSidewaysScroll(page);
  expect(browserErrors).toEqual([]);
});
