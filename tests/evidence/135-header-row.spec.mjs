// Evidence for #135: the arcade header is one compact row on wide screens, stacked on phones.
// Run: npm run evidence -- tests/evidence/135-header-row
import { test, expect } from "./evidence.mjs";

async function header(page) {
  return page.evaluate(() => {
    const box = s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right }; };
    return { masthead: box(".masthead"), word: box(".wordmark"), lede: box(".lede"), make: box("#make-btn"), gh: box("#gh-home"), width: innerWidth, scroll: document.documentElement.scrollWidth };
  });
}
const mid = b => b.y + b.h / 2;

for (const width of [1600, 1280]) {
  test(`at ${width} wide the header is one row with GitHub at the right`, async ({ page, shot, note, browserErrors }, info) => {
    test.skip(info.project.name === "phone", "wide-screen layout");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    const h = await header(page);
    // Logo, tagline, button and GitHub share one row: their middles sit inside the logo's band.
    for (const k of ["lede", "make", "gh"]) {
      expect(mid(h[k])).toBeGreaterThan(h.word.y);
      expect(mid(h[k])).toBeLessThan(h.word.bottom);
    }
    expect(h.lede.x).toBeGreaterThan(h.word.right);
    expect(h.make.x).toBeGreaterThan(h.lede.x);
    expect(h.gh.right).toBeGreaterThan(h.make.right);
    expect(h.masthead.h).toBeLessThan(150);
    expect(h.scroll).toBeLessThanOrEqual(h.width);
    note(`${width}px: header ${Math.round(h.masthead.h)}px tall, one row`);
    await shot(`wide-${width}`);
    expect(browserErrors).toEqual([]);
  });
}

test("on a phone the header stacks and nothing overflows", async ({ page, shot, note, browserErrors }, info) => {
  test.skip(info.project.name !== "phone", "phone layout");
  await page.goto("./");
  const h = await header(page);
  expect(h.lede.y).toBeGreaterThan(h.word.y);
  expect(h.make.y).toBeGreaterThan(h.lede.y);
  for (const k of ["word", "lede", "make", "gh"]) expect(h[k].right).toBeLessThanOrEqual(h.width + 1);
  expect(h.scroll).toBeLessThanOrEqual(h.width);
  note(`${h.width}px: stacked, header ${Math.round(h.masthead.h)}px tall`);
  await shot("phone");
  expect(browserErrors).toEqual([]);
});
