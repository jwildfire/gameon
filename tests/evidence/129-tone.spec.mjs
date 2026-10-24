// Evidence for #129: the Game Night tone on the arcade and the New Game page.
// Run: npm run evidence -- tests/evidence/129-tone
import { test, expect, games } from "./evidence.mjs";

test("the arcade reads as Game Night: tagline, button, credits, footer", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await expect(page.locator(".lede")).toHaveText("Think of a Game? Make it. Then make it better.");
  await expect(page.locator("#make-btn")).toHaveText("Make a game");
  await expect(page.locator(".foot")).toContainText("Every game here started as someone's idea");
  const credits = await page.locator("#shelf .credit").allTextContents();
  expect(credits.length).toBe(games.length);
  for (const c of credits) expect(c).toMatch(/^Made by /);
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/our kids|grown-up/i);
  note(`${credits.length} cards, every credit reads "Made by …"`);
  await shot("arcade");
  expect(browserErrors).toEqual([]);
});

test("the New Game page reads as Game Night, statuses included", async ({ page, shot, note, browserErrors }) => {
  const issue = (n, status, extra = []) => ({ number: n, created_at: new Date(Date.now() - n * 60000).toISOString(), body: "### Made by\n\nBean\n", labels: [{ name: "game-idea" }, { name: status }, ...extra] });
  await page.route("https://api.github.com/**", r => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify(r.request().url().includes("/comments") ? [] : [issue(1, "status: submitted"), issue(2, "status: needs approval"), issue(3, "status: approved"), issue(4, "status: published")]) }));
  await page.goto("new/");
  await expect(page.locator("#heading")).toHaveText("What should we play?");
  await expect(page.locator("#send")).toHaveText("Send to the Matrix");
  const chips = page.locator("#ideas .status");
  await expect(chips).toHaveCount(4);
  await expect(chips.nth(0)).toHaveText("Got it!");
  await expect(chips.nth(1)).toHaveText("Waiting for a human");
  await expect(chips.nth(2)).toHaveText("In the queue");
  await expect(chips.nth(3)).toHaveText("Game on!");
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/grown-up/i);
  note("statuses: Got it!, Waiting for a human, In the queue, Game on!");
  await shot("new-game");
  expect(browserErrors).toEqual([]);
});
