// Evidence for game idea #103, Fancy Food Fight ("Fancy people foodfight! Messiest wins").
// Run: npm run evidence -- 103-fancy-food-fight
import { test, expect } from "./evidence.mjs";

const GAME = "games/fancy-food-fight/";

async function start(page) {
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
  await page.locator("#play-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  await page.evaluate(() => window.__fff.calm()); // guests hold still so each check is deterministic
}
const fff = (page, expr, arg) => page.evaluate(expr, arg);

test("the title screen opens and the game starts with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(GAME);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Fancy Food Fight");
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#hud-round")).toHaveText("Round 1 of 3");
  await expect(page.locator("#tray .food")).toHaveCount(4);
  await expect(page.locator("#duck-btn")).toBeVisible();
  expect(await fff(page, () => __fff.mode)).toBe("play");
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note("4 foods on the tray, Duck button, Round 1 of 3; no requests outside the site");
  await shot("playing");
  expect(browserErrors).toEqual([]);
});

test("throwing food splats a fancy guest and scores, and a real tap throws", async ({ page, shot, note, browserErrors }) => {
  await start(page);
  const guests = await fff(page, () => __fff.guests);
  await fff(page, x => __fff.throwAt(x, 250), guests[1].x);
  await expect.poll(() => fff(page, () => __fff.guests[1].splats), { timeout: 3000 }).toBeGreaterThan(0);
  const scored = await fff(page, () => __fff.score);
  expect(scored).toBeGreaterThanOrEqual(25);

  const before = await fff(page, () => __fff.splats);
  await page.waitForTimeout(400);
  const box = await page.locator("#game").boundingBox();
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await expect.poll(() => fff(page, () => __fff.splats), { timeout: 3000 }).toBeGreaterThan(before);
  note(`a guest splat scored ${scored}; a click on the wall made a new splat`);
  await shot("splat");
  expect(browserErrors).toEqual([]);
});

test("three hits bring the chandelier down for a huge mess", async ({ page, shot, note, browserErrors }) => {
  await start(page);
  const mess0 = await fff(page, () => __fff.mess);
  for (let i = 0; i < 3; i++) { await fff(page, () => __fff.throwAt(480, 80)); await page.waitForTimeout(700); await fff(page, () => __fff.calm()); }
  await expect.poll(() => fff(page, () => __fff.chandelier().gone), { timeout: 4000 }).toBe(true);
  const mess1 = await fff(page, () => __fff.mess), score = await fff(page, () => __fff.score);
  expect(mess1).toBeGreaterThan(mess0 + 10);
  expect(score).toBeGreaterThanOrEqual(150);
  note(`Mess Meter ${mess0}% → ${mess1}%, score ${score}`);
  await page.waitForTimeout(900);
  await shot("chandelier");
  expect(browserErrors).toEqual([]);
});

test("Duck makes a guest's throw miss, and without it you get splatted", async ({ page, shot, note, browserErrors }) => {
  await start(page);
  await page.keyboard.down("Shift");
  await fff(page, () => __fff.guestThrowsNow());
  await page.waitForTimeout(1300);
  expect(await fff(page, () => __fff.playerSplatted)).toBe(false);
  await page.keyboard.up("Shift");
  await fff(page, () => __fff.calm());

  await fff(page, () => __fff.guestThrowsNow());
  await expect.poll(() => fff(page, () => __fff.playerSplatted), { timeout: 3000 }).toBe(true);
  note("ducking: the pie flew over; not ducking: SPLAT");
  await page.waitForTimeout(150);
  await shot("splatted");
  expect(browserErrors).toEqual([]);
});

test("each round ends with the Messiest crown, and the next round starts", async ({ page, shot, note, browserErrors }) => {
  await start(page);
  const g = await fff(page, () => __fff.guests);
  for (const x of [g[0].x, g[2].x]) { await fff(page, x => __fff.throwAt(x, 250), x); await page.waitForTimeout(400); }
  await fff(page, () => __fff.endRound());
  await expect(page.locator("#round-screen")).toBeVisible();
  await expect(page.locator("#round-board > div")).toHaveCount(5);
  await expect(page.locator("#round-line")).toContainText("crown");
  await expect(page.locator("#round-board > div.win")).toContainText("👑");
  note(await page.locator("#round-line").textContent());
  await shot("round-over");
  await page.locator("#next-btn").click();
  await expect(page.locator("#hud-round")).toHaveText("Round 2 of 3");
  expect(browserErrors).toEqual([]);
});

test("saves only under gameon.fancy-food-fight.", async ({ page }) => {
  await start(page);
  await page.locator("#sound-btn").click();
  await fff(page, () => __fff.endRound());
  await expect(page.locator("#round-screen")).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.fancy-food-fight.")).toBe(true);
});

test("Fancy Food Fight has a card in the arcade and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#fancy-food-fight"]');
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("Fancy Food Fight");
  await card.scrollIntoViewIfNeeded();   // its cover loads lazily, and newer cards push it down the page
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Fancy Food Fight");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/fancy-food-fight");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".title-big")).toHaveText("Fancy Food Fight");
  await frame.locator("#play-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  note("card first in the arcade; plays inside the frame; GitHub button opens its folder");
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
