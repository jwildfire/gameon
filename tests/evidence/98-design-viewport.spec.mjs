// Evidence for #98: the design pages lay out at phone width on GitHub Pages.
// Run: npm run evidence -- 98-design-viewport
import { test, expect } from "./evidence.mjs";

const pages = [
  ["blueprint", "artifacts/2026-10-22-gameon-design/", "GameOn Blueprint"],
  ["pipeline", "artifacts/2026-10-23-new-game-pipeline/", "Make a New Game"]
];

for (const [name, url, title] of pages) {
  test(`the ${title} page has a viewport tag and fits the screen`, async ({ page, shot, note, browserErrors }) => {
    await page.goto(url);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/);
    const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    expect(scroll).toBeLessThanOrEqual(width);
    note(`${width}px wide, nothing scrolls sideways`);
    await shot(name);
    expect(browserErrors).toEqual([]);
  });
}
