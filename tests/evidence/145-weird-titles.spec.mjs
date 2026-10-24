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
  // A fake clock makes the default timing checkable on a slow machine.
  const t0 = new Date("2026-01-01T12:00:00Z");
  await page.clock.install({ time: t0 });
  await page.clock.pauseAt(new Date(t0.getTime() + 60_000)); // paused before the page loads: no timers yet
  await page.goto("./?mode=weird");
  const titles = await page.evaluate(() => window.gameonTitles);
  expect(titles[0]).toBe("GameOn");
  expect(titles.length).toBeGreaterThanOrEqual(30);
  expect(new Set(titles).size).toBe(titles.length);
  for (const t of titles) expect(t).toMatch(/^[A-Z][a-z]+On$/);
  expect(await title(page)).toBe("GameOn");
  // Default timing: the first swap lands at 3.25 s (half of the tagline's 6.5 s), then every 6.5 s.
  await page.clock.runFor(3000);
  expect(await title(page)).toBe("GameOn");
  await page.clock.runFor(1000);
  expect(await title(page)).toBe(titles[1]);
  await page.clock.runFor(5500);
  expect(await title(page)).toBe(titles[1]);
  await page.clock.runFor(1000);
  expect(await title(page)).toBe(titles[2]);
  // Still two-tone and still called GameOn for screen readers.
  await expect(page.locator("#wordmark .wm-on")).toHaveText("On");
  await expect(page.locator("#wordmark .wm-on")).toHaveCSS("color", ORANGE);
  await expect(page.getByRole("heading", { level: 1, name: "GameOn" })).toBeVisible();
  await page.clock.resume();
  await page.waitForTimeout(600); // let the wobble finish
  note(`${titles.length} titles; GameOn held past 3 s, became ${titles[1]} by 4 s, held, then ${titles[2]} by 10.5 s (6.5 s later); heading still named GameOn`);
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
  const widths = info.project.name === "desktop" ? [1600, 1280] : [375];
  let widest;
  for (const width of widths) {
    if (info.project.name === "desktop") await page.setViewportSize({ width, height: 800 });
    await page.goto("./?mode=weird&titleInterval=9999");
    await page.evaluate(() => document.fonts.ready);
    // Show every title in turn and measure the header each time, all inside the page.
    const all = await page.evaluate(() => {
      const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
      const h = document.getElementById("wordmark"), out = [];
      for (let k = 0; k < window.gameonTitles.length; k++) {
        const range = document.createRange();
        range.selectNodeContents(h);
        out.push({
          text: h.textContent, word: r("#wordmark"), ink: range.getBoundingClientRect().width,
          mast: r(".masthead").height, lede: r("#tagline"), make: r("#make-btn"), gh: r("#gh-home"),
          scroll: document.documentElement.scrollWidth, width: innerWidth
        });
        window.gameonNextTitle();
      }
      return out;
    });
    const titles = await page.evaluate(() => window.gameonTitles);
    const first = all[0];
    widest = first;
    all.forEach((m, k) => {
      expect(m.text).toBe(titles[k]);
      expect(m.scroll).toBeLessThanOrEqual(m.width);
      expect(m.word.right).toBeLessThanOrEqual(m.width);
      expect(m.ink).toBeLessThanOrEqual(m.word.width + 1); // the title fits inside the heading's box
      expect(Math.abs(m.word.height - first.word.height)).toBeLessThanOrEqual(1); // one line, never wrapped
      expect(Math.abs(m.mast - first.mast)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.lede.x - first.lede.x)).toBeLessThanOrEqual(1); // the tagline doesn't shuffle sideways
      if (info.project.name === "phone") {
        expect(m.word.x + m.ink).toBeLessThanOrEqual(m.gh.x); // clear of the GitHub button in the corner
      } else {
        // The one-row header from #136 still holds: tagline, button and GitHub sit in the logo's band.
        for (const b of [m.lede, m.make, m.gh]) {
          expect(b.y + b.height / 2).toBeGreaterThan(m.word.y);
          expect(b.y + b.height / 2).toBeLessThan(m.word.bottom);
        }
      }
      if (m.ink > widest.ink) widest = m;
    });
    note(`${first.width}px: all ${titles.length} titles fit on one line${info.project.name === "desktop" ? " in the one-row header" : ", clear of GitHub"}; widest is ${widest.text} at ${Math.round(widest.ink)}px; header ${Math.round(first.mast)}px tall throughout`);
  }
  await page.evaluate(t => { document.getElementById("wm-word").textContent = t.slice(0, -2); }, widest.text);
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
