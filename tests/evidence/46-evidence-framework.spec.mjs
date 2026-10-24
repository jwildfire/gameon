// Evidence for the evidence framework task (#46): what the arcade and the New Game page on
// dev do today.
// Run: npm run evidence -- 46-evidence-framework
import { test, expect, games } from "./evidence.mjs";

const home = "./";
const local = games.find(g => g.slug === "mazeathon"); // served from this repo; its checks use MazeAThon's own screens

test("the arcade home shows one card per game in games.json", async ({ page, shot, note, browserErrors }) => {
  await page.goto(home);
  const cards = page.locator("#shelf .cart");
  await expect(cards).toHaveCount(games.length);
  for (const g of games) {
    await expect(cards.filter({ has: page.getByRole("heading", { name: g.title, exact: true }) })).toHaveCount(1);
  }
  await expect(cards.first().locator(".cover img")).toHaveJSProperty("complete", true);
  note(`${games.length} cards, one for each game in games.json`);
  await shot("home");
  expect(browserErrors).toEqual([]);
});

test(`${local.title} plays inside the arcade frame`, async ({ page, shot, note, browserErrors }) => {
  await page.goto(home);
  await page.locator(`#shelf .cart[href="#${local.slug}"]`).click();
  await expect(page.locator("#player")).toBeVisible();
  await expect(page.locator("#bar-title")).toHaveText(local.title);
  await expect(page.locator("#frame")).toHaveAttribute("src", local.url);

  const game = page.frameLocator("#frame");
  await expect(game.getByRole("heading", { name: /Small shapes/ })).toBeVisible();
  await shot("game-title");

  await game.locator("#begin").click();
  await expect(game.locator("#overlay")).toBeHidden();
  // The clock only runs while the game loop is playing.
  await expect(game.locator("#timer")).not.toHaveText("0:00", { timeout: 5_000 });
  note(`clock reads ${await game.locator("#timer").textContent()} after starting`);
  await shot("game-playing");
  expect(browserErrors).toEqual([]);
});

test("the switcher opens from a game and changes to another game", async ({ page, shot, browserErrors }) => {
  const other = games.find(g => g.slug !== local.slug);
  await page.goto(`${home}#${local.slug}`);
  await expect(page.locator("#bar-title")).toHaveText(local.title);

  await page.locator("#switch-btn").click();
  await expect(page.locator("#switcher")).toBeVisible();
  await expect(page.locator("#switch-grid .mini")).toHaveCount(games.length);
  await expect(page.locator(`#switch-grid .mini[data-slug="${local.slug}"]`)).toHaveAttribute("aria-current", "true");
  await shot("switcher");

  await page.locator(`#switch-grid .mini[data-slug="${other.slug}"]`).click();
  await expect(page.locator("#switcher")).toBeHidden();
  await expect(page.locator("#bar-title")).toHaveText(other.title);
  await expect(page.locator("#frame")).toHaveAttribute("src", other.url);
  await expect(page).toHaveURL(new RegExp(`#${other.slug}$`));
  await shot("switched");
  expect(browserErrors).toEqual([]);
});

test("nothing scrolls sideways and the player buttons stay on screen", async ({ page, shot, note }, testInfo) => {
  const phone = testInfo.project.name === "phone";
  const noSidewaysScroll = async () => {
    const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
    expect(scroll, "page is wider than the screen").toBeLessThanOrEqual(width);
    return width;
  };

  await page.goto(home);
  await expect(page.locator("#shelf .cart")).toHaveCount(games.length);
  await noSidewaysScroll();

  await page.locator(`#shelf .cart[href="#${local.slug}"]`).click();
  await expect(page.locator("#player")).toBeVisible();
  const width = await noSidewaysScroll();
  for (const id of ["#home-btn", "#bar-title", "#switch-btn", "#own-btn"]) {
    const box = await page.locator(id).boundingBox();
    expect(box, `${id} is not on screen`).not.toBeNull();
    expect(box.x, `${id} starts off the left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${id} runs off the right edge`).toBeLessThanOrEqual(width);
  }
  // On a phone the bar drops its button words to make room for the game's name.
  if (phone) await expect(page.locator("#switch-btn .label")).toBeHidden();
  else await expect(page.locator("#switch-btn .label")).toBeVisible();
  note(`${width}px wide, bar buttons ${phone ? "icon-only" : "with words"}`);
  await shot("player");
});

test("the New Game page turns a typed idea into a Game idea form for a grown-up", async ({ page, shot, note, browserErrors }) => {
  // Record where Send would go instead of opening GitHub.
  await page.addInitScript(() => { window.open = url => { window.__opened = url; return null; }; });
  await page.goto("new/");
  await expect(page.getByRole("heading", { name: "What's your game?" })).toBeVisible();
  await expect(page.locator("#send")).toBeDisabled();
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, "page is wider than the screen").toBeLessThanOrEqual(width);
  await shot("new-game");

  const idea = "A game where a penguin delivers pizza across a frozen lake and dodges seals";
  await page.locator("#tab-type").click();
  await page.locator("#idea").fill(idea);
  await page.locator("#maker").fill("Tester");
  await expect(page.locator("#send")).toBeEnabled();
  await page.locator("#send").click();

  await expect(page.locator("#handoff")).toBeVisible();
  const opened = new URL(await page.evaluate(() => window.__opened));
  expect(opened.origin + opened.pathname).toBe("https://github.com/jwildfire/gameon/issues/new");
  expect(Object.fromEntries(opened.searchParams)).toEqual({
    template: "game-idea.yml", title: "Game idea from Tester", idea, maker: "Tester", told_by: "typing",
    // The fallback when GitHub opens a blank issue instead of the form (#100)
    body: `### The idea, word for word\n\n${idea}\n\n### Made by\n\nTester\n\n### Told by\n\ntyping\n`,
    labels: "game-idea,status: submitted"
  });
  await expect(page.locator("#issue-link")).toHaveAttribute("href", opened.href);
  note("Send opens the Game idea form with the idea, the nickname and told_by=typing filled in");
  await shot("new-game-sent");
  expect(browserErrors).toEqual([]);
});
