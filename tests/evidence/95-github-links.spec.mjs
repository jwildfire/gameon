// Evidence for the GitHub links task (#95): one tap from the arcade, the player and the New Game
// page reaches GitHub, and the player's link follows the game being played.
// Run: npm run evidence -- 95-github-links
import { test, expect, games } from "./evidence.mjs";

const REPO = "https://github.com/jwildfire/gameon";
const sourceOf = g => /^https?:/.test(g.url) ? g.repo : `${REPO}/tree/main/${g.url.replace(/\/$/, "")}`;
const local = games.find(g => !/^https?:/.test(g.url));   // MazeAThon, in this repo
// A game with its own repo, or, now that every game is served from GameOn (#124), another
// one-version game, so the check still proves the button follows the game being played.
const hosted = games.find(g => /^https?:/.test(g.url))
  || games.find(g => g.slug !== local.slug && (g.versions || []).length < 2);

async function fitsOnScreen(page) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
}

test("the arcade home links to the GameOn repo", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const link = page.locator("#gh-home");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", REPO);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(page.locator("#make-btn")).toBeVisible();
  await fitsOnScreen(page);
  note(`GitHub link → ${REPO}`);
  await shot("home");
  expect(browserErrors).toEqual([]);
});

test("the player's GitHub button opens the current game's code", async ({ page, shot, note, browserErrors }) => {
  await page.goto(`./#${hosted.slug}`);
  await expect(page.locator("#bar-title")).toHaveText(hosted.title);
  const btn = page.locator("#gh-btn");
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute("href", sourceOf(hosted));
  const box = await btn.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
  await shot("player-hosted");

  await page.locator("#switch-btn").click();
  await page.locator(`#switch-grid .mini[data-slug="${local.slug}"]`).click();
  await expect(page.locator("#bar-title")).toHaveText(local.title);
  await expect(btn).toHaveAttribute("href", sourceOf(local));
  await fitsOnScreen(page);
  note(`${hosted.title} → ${sourceOf(hosted)}; after switching, ${local.title} → ${sourceOf(local)}`);
  await shot("player-in-repo");
  expect(browserErrors).toEqual([]);
});

test("every game's GitHub button points at its own code", async ({ page, note }) => {
  for (const g of games) {
    // A game with versions asks which one first; its #slug@default link plays the default straight away.
    await page.goto(`./#${g.slug}${g.versions ? `@${g.default}` : ""}`);
    await expect(page.locator("#bar-title")).toHaveText(g.title);
    await expect(page.locator("#gh-btn")).toHaveAttribute("href", sourceOf(g));
  }
  note(`${games.length} of ${games.length} games link to their code`);
});

test("the New Game page links to the GameOn repo", async ({ page, shot, browserErrors }) => {
  await page.goto("new/");
  const link = page.locator("#gh-link");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", REPO);
  await expect(page.locator(".back")).toBeVisible();
  await fitsOnScreen(page);
  await shot("new-game");
  expect(browserErrors).toEqual([]);
});
