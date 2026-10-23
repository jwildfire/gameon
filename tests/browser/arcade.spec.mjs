import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const games = JSON.parse(readFileSync(new URL("../../games.json", import.meta.url), "utf8"));

// Local arcade functionality must not depend on live game hosts or Google Fonts.
// Link reachability is checked separately after the Pages deployment.
test.beforeEach(async ({ page }) => {
  await page.route("**/favicon.ico", route => route.fulfill({ status: 204, body: "" }));
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  for (const game of games) {
    await page.route(game.url, route => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<!doctype html><html><body><h1>Test game: ' + game.slug + '</h1></body></html>'
    }));
  }
});

test("home, all game launches, switching and return navigation have no browser errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.locator("#home")).toBeVisible();
  await expect(page.locator("#shelf .cart")).toHaveCount(games.length);

  for (const game of games) {
    await page.locator('#shelf .cart[href="#' + game.slug + '"]').click();
    await expect(page.locator("#player")).toBeVisible();
    await expect(page.locator("#bar-title")).toHaveText(game.title);
    await expect(page.locator("#frame")).toHaveAttribute("src", game.url);
    await expect(page.frameLocator("#frame").getByRole("heading", { name: "Test game: " + game.slug })).toBeVisible();
    await page.locator("#home-btn").click();
    await expect(page.locator("#home")).toBeVisible();
    expect(await page.locator("#frame").getAttribute("src")).toBeNull();
  }

  await page.locator('#shelf .cart[href="#' + games[0].slug + '"]').click();
  await page.locator("#switch-btn").click();
  await expect(page.locator("#switcher")).toBeVisible();
  await expect(page.locator("#switch-grid .mini")).toHaveCount(games.length);
  await page.locator('#switch-grid .mini[data-slug="' + games[1].slug + '"]').click();
  await expect(page.locator("#frame")).toHaveAttribute("src", games[1].url);
  await expect(page.frameLocator("#frame").getByRole("heading", { name: "Test game: " + games[1].slug })).toBeVisible();
  await page.locator("#home-btn").click();
  await expect(page.locator("#home")).toBeVisible();

  expect(errors).toEqual([]);
});

test("phone player buttons and game switcher stay inside the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "Phone-specific layout check");

  await page.goto("/");
  await page.locator('#shelf .cart[href="#' + games[0].slug + '"]').click();
  await expect(page.locator("#player")).toBeVisible();

  const width = await page.evaluate(() => window.innerWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  for (const selector of ["#home-btn", "#switch-btn", "#own-btn"]) {
    const rect = await page.locator(selector).boundingBox();
    expect(rect).not.toBeNull();
    expect(rect.x).toBeGreaterThanOrEqual(-1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
  }

  await page.locator("#switch-btn").click();
  await expect(page.locator("#switcher")).toBeVisible();
  await expect(page.locator("#switch-grid .mini")).toHaveCount(games.length);
  await expect(page.locator("#switch-grid .mini").first()).toBeInViewport();
  await page.locator('#switch-grid .mini[data-slug="' + games[1].slug + '"]').click();
  await expect(page.locator("#bar-title")).toHaveText(games[1].title);
  await page.locator("#home-btn").click();
  await expect(page.locator("#home")).toBeVisible();
});
