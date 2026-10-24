// Evidence for #115: versions in the arcade (picker on start, dropdown in the player bar,
// remembered pick, deep links) and the Update button. See docs/game-versions.md.
// Run: npm run evidence -- 115-arcade-versions
import { readFileSync } from "node:fs";
import { test, expect } from "./evidence.mjs";

const real = JSON.parse(readFileSync(new URL("../../games.json", import.meta.url), "utf8"));
// A test list: Fancy Food Fight with a creator's update and a fork. Everything else as on dev.
const withVersions = real.map(g => g.slug !== "fancy-food-fight" ? g : {
  ...g,
  url: "games/fancy-food-fight/jeremy.v2/",
  default: "jeremy.v2",
  versions: [
    { id: "jeremy.v1", url: "games/fancy-food-fight/", made: "2026-10-23", note: "The first version" },
    { id: "jeremy.v2", url: "games/fancy-food-fight/jeremy.v2/", made: "2026-10-24", note: "The guests fight back harder", from: "jeremy.v1", idea: 900 },
    { id: "notclay.v1", url: "games/fancy-food-fight/notclay.v1/", made: "2026-10-24", note: "Everything is hot sauce", from: "jeremy.v2", idea: 901 }
  ]
});
const standIn = name => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;display:grid;place-items:center;height:100vh;background:#ffd23f;font:800 24px system-ui"><h1>Stand-in: ${name}</h1>`;

async function useVersions(page) {
  await page.route("**/games.json", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(withVersions) }));
  for (const v of ["jeremy.v2", "notclay.v1"]) {
    await page.route(`**/games/fancy-food-fight/${v}/`, r => r.fulfill({ status: 200, contentType: "text/html", body: standIn(v) }));
  }
}
async function fits(page) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  for (const id of ["#home-btn", "#switch-btn", "#ver-select", "#update-btn", "#gh-btn", "#own-btn"]) {
    const b = await page.locator(id).boundingBox();
    if (b) expect(b.x + b.width).toBeLessThanOrEqual(width + 1);
  }
}

test("a game with versions says how many, and asks which one when it starts", async ({ page, shot, note, browserErrors }) => {
  await useVersions(page);
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#fancy-food-fight"]');
  await expect(card.locator(".tag", { hasText: "3 versions" })).toBeVisible();
  await expect(page.locator('#shelf .cart[href="#mazeathon"] .tag', { hasText: "versions" })).toHaveCount(0);
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(items.nth(1)).toContainText("jeremy.v1");
  await expect(items.nth(2)).toContainText("notclay.v1");
  await expect(items.nth(2)).toContainText("Made by notclay, started from jeremy.v2");
  note("order: jeremy.v2 (Latest), jeremy.v1, then the fork notclay.v1");
  await shot("chooser");
  expect(browserErrors).toEqual([]);
});

test("picking a fork plays it, with the version, Update and GitHub links all following it", async ({ page, shot, note, browserErrors }) => {
  await useVersions(page);
  await page.goto("./#fancy-food-fight");
  await page.locator('#ver-list .ver-item[data-version="notclay.v1"]').click();
  await expect(page).toHaveURL(/#fancy-food-fight@notclay\.v1$/);
  await expect(page.locator("#frame")).toHaveAttribute("src", "games/fancy-food-fight/notclay.v1/");
  await expect(page.frameLocator("#frame").getByRole("heading", { name: "Stand-in: notclay.v1" })).toBeVisible();
  await expect(page.locator("#ver-select")).toBeVisible();
  await expect(page.locator("#ver-select")).toHaveValue("notclay.v1");
  await expect(page.locator("#update-btn")).toHaveAttribute("href", "new/?game=fancy-food-fight&version=notclay.v1");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/fancy-food-fight/notclay.v1");
  await fits(page);
  note("frame, version dropdown, Update and GitHub all point at notclay.v1");
  await shot("playing-fork");
  expect(browserErrors).toEqual([]);
});

test("the player bar's dropdown switches versions", async ({ page, shot, browserErrors }) => {
  await useVersions(page);
  await page.goto("./#fancy-food-fight@jeremy.v2");
  await expect(page.locator("#chooser")).toBeHidden();
  await expect(page.locator("#frame")).toHaveAttribute("src", "games/fancy-food-fight/jeremy.v2/");
  await page.locator("#ver-select").selectOption("jeremy.v1");
  await expect(page).toHaveURL(/#fancy-food-fight@jeremy\.v1$/);
  await expect(page.locator("#frame")).toHaveAttribute("src", "games/fancy-food-fight/");
  await expect(page.frameLocator("#frame").locator(".title-big")).toHaveText("Fancy Food Fight");
  await expect(page.locator("#update-btn")).toHaveAttribute("href", "new/?game=fancy-food-fight&version=jeremy.v1");
  await shot("switched-version");
  expect(browserErrors).toEqual([]);
});

test("the arcade remembers the last pick, and Cancel goes back", async ({ page, note, browserErrors }) => {
  await useVersions(page);
  await page.goto("./#fancy-food-fight@notclay.v1");
  await expect(page.locator("#frame")).toHaveAttribute("src", "games/fancy-food-fight/notclay.v1/");
  await page.locator("#home-btn").click();
  await expect(page.locator("#home")).toBeVisible();
  await page.locator('#shelf .cart[href="#fancy-food-fight"]').click();
  const fork = page.locator('#ver-list .ver-item[data-version="notclay.v1"]');
  await expect(fork).toContainText("Last played");
  await expect(fork).toHaveAttribute("aria-current", "true");
  await page.locator("#close-choose").click();
  await expect(page.locator("#chooser")).toBeHidden();
  await expect(page.locator("#home")).toBeVisible();
  note("notclay.v1 marked Last played; Cancel returned to the arcade");
  expect(browserErrors).toEqual([]);
});

test("a game with one version plays straight away, and Update opens the New Game page with it picked", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await page.locator('#shelf .cart[href="#mazeathon"]').click();
  await expect(page.locator("#chooser")).toBeHidden();
  await expect(page.locator("#bar-title")).toHaveText("MazeAThon");
  await expect(page.locator("#ver-select")).toBeHidden();
  await expect(page.locator("#update-btn")).toHaveAttribute("href", "new/?game=mazeathon&version=ryan.v1");
  await fits(page);
  await shot("one-version");
  await page.locator("#update-btn").click();
  await expect(page).toHaveURL(/\/new\/\?game=mazeathon&version=ryan\.v1$/);
  await expect(page.locator("h1")).toBeVisible();
  note("MazeAThon (creator ryan) is ryan.v1; Update → new/?game=mazeathon&version=ryan.v1");
  expect(browserErrors).toEqual([]);
});
