// Evidence for Delve Squad, built from game idea jwildfire/gameon-ideas#7.
// Run: npm run evidence -- tests/evidence/ideas-7-delve-squad
// The game clock is held and stepped by hand (__ds.hold / __ds.step) and each run's dice are
// seeded (__ds.seed), so every run sees the same squad names, loot, floors and fights.
import { test, expect, games } from "./evidence.mjs";

const GAME = "games/delve-squad/";
const ds = (page, fn, arg) => page.evaluate(fn, arg);
const state = page => ds(page, () => __ds.state);

test.describe.configure({ timeout: 90_000 });

// Open the game with the clock held, and pick a seeded squad of Fighter, Cleric and Wizard.
async function open(page) {
  await page.goto(GAME);
  await expect(page.locator("#start-btn")).toBeVisible();
  await ds(page, () => { __ds.hold(true); __ds.seed(42); });
}
async function squad(page) {
  await page.locator("#start-btn").click();
  for (const k of ["fighter", "cleric", "wizard"]) await page.locator(`.cls[data-cls="${k}"]`).click();
  await page.locator("#party-go").click();
  await expect(page.locator("#gear")).toBeVisible();
}

test("the title screen opens in a torch-lit hall, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(GAME);
  await expect(page.locator(".logo")).toHaveAttribute("aria-label", "Delve Squad");
  await expect(page.locator("#title")).toContainText("Designed by Jeremy");
  await expect(page.locator("#title-best")).toHaveText("No delves yet");
  await page.waitForTimeout(400);   // let the torches and embers draw a few frames
  await shot("title");
  const site = new URL(page.url()).origin;
  const outside = requested.filter(u => !u.startsWith(site) && !u.startsWith("data:"));
  expect(outside).toEqual([]);
  note(`${requested.length} requests, all to this site`);
  expect(browserErrors).toEqual([]);
});

test("the heroes clear the first Old Cellar room, and its monsters poof into sparks", async ({ page, shot, note, browserErrors, isMobile }) => {
  await open(page);
  await squad(page);
  await ds(page, () => __ds.autoGear());
  await page.locator("#gear-go").click();
  await expect(page.locator("#delve")).toBeVisible();
  let s = await state(page);
  expect(s.floor).toBe(1); expect(s.room).toBe(0); expect(s.rooms).toBeGreaterThanOrEqual(3);
  expect(s.party.every(h => h.items.some(Boolean))).toBe(true);   // they carry what they took
  const monsters = s.monsters.length;
  expect(monsters).toBeGreaterThan(0);
  // tall phone screens get a tall room; wide screens a wide one
  const box = await page.locator("#arena").boundingBox();
  if (isMobile) expect(box.height).toBeGreaterThan(box.width); else expect(box.width).toBeGreaterThan(box.height);
  await ds(page, () => __ds.step(3.4));
  s = await state(page);
  expect(s.phase).toBe("fight");
  await shot("fight");
  expect(await ds(page, () => __ds.fight())).toBe("clear");
  s = await state(page);
  expect(s.stats.poofs).toBeGreaterThanOrEqual(monsters);
  expect(s.heroesUp).toBeGreaterThan(0);
  // the squad walks out and into room 2
  await ds(page, () => __ds.step(2.3));
  s = await state(page);
  expect(s.room).toBe(1);
  await expect(page.locator("#d-room")).toContainText("Room 2/");
  // the speed button cycles 1x, 2x, 3x
  await page.locator("#speed").click(); await page.locator("#speed").click();
  await expect(page.locator("#speed")).toHaveText("3×");
  note(`room 1 had ${monsters} monsters; the heroes cleared it and ${s.stats.poofs} poofed; arena ${Math.round(box.width)}x${Math.round(box.height)}`);
  expect(browserErrors).toEqual([]);
});

test("the Rat King waits in the last room of Floor 5, and beating him puts a Legendary card at the next campfire", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  await open(page);
  await squad(page);
  expect(await ds(page, () => __ds.toFloor(5))).toBe(true);
  await expect(page.locator("#gear-tags .boss")).toContainText("The Rat King");
  await ds(page, () => __ds.autoGear());
  await page.locator("#gear-go").click();
  await ds(page, () => { while (__ds.state.room < 2 && __ds.state.screen === "delve") { __ds.fight(); __ds.step(2.3); } });
  let s = await state(page);
  expect(s.room).toBe(2); expect(s.boss).toBe(true);
  expect(s.monsters).toContain("The Rat King");
  await expect(page.locator("#d-room")).toContainText("Boss room!");
  await ds(page, () => __ds.step(6));
  await shot("boss");
  expect(await ds(page, () => __ds.fight())).toBe("clear");
  await ds(page, () => __ds.step(2.3));
  s = await state(page);
  expect(s.screen).toBe("gear"); expect(s.floor).toBe(6); expect(s.stats.bosses).toBe(1);
  expect(s.loot.some(i => i.rarity === "legendary")).toBe(true);
  await expect(page.locator(".item.legendary")).toHaveCount(s.loot.filter(i => i.rarity === "legendary").length);
  expect(s.party.every(h => h.level === 6 && !h.down)).toBe(true);
  await shot("after-boss");
  note(`squad levels ${s.party.map(h => h.level).join("/")}; next campfire's Legendary: ${s.loot.filter(i => i.rarity === "legendary").map(i => i.name).join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("the game pauses, starts over and goes back to the title", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await squad(page);
  await page.locator("#gear-go").click();
  await ds(page, () => { __ds.step(2.5); __ds.hold(false); });
  await page.waitForTimeout(300);
  await page.keyboard.press("p");
  await expect(page.locator("#pause")).toBeVisible();
  const t1 = await ds(page, () => __ds.state);
  await page.waitForTimeout(500);
  const t2 = await ds(page, () => __ds.state);
  expect(t2.paused).toBe(true);
  expect(t2.fightTime).toBeGreaterThan(0);
  expect(t2.clock).toBe(t1.clock);                                      // nothing moves while paused
  await shot("paused");
  await page.locator("#resume-btn").click();
  await expect(page.locator("#pause")).toBeHidden();
  await page.locator("#d-menu").click();
  await page.locator("#restart-btn").click();
  await expect(page.locator("#party")).toBeVisible();
  await expect(page.locator(".slot.full")).toHaveCount(3);              // the same classes are ready to go again
  await page.locator("#party-back").click();
  await expect(page.locator("#title")).toBeVisible();
  note("P paused (the fight stood still for half a second), Keep going resumed, Start over went to the squad screen with the last squad, ✕ went to the title");
  expect(browserErrors).toEqual([]);
});

test("at the campfire each hero takes one item, and the card shows what it changes", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await squad(page);
  const s0 = await state(page);
  expect(s0.loot).toHaveLength(5);                           // two more cards than heroes
  await expect(page.locator(".hero")).toHaveCount(3);
  await expect(page.locator("#gear-go")).toHaveText("Delve to Floor 1");
  // tap the Wizard, then a weapon
  await page.locator(".hero").nth(2).click();
  const weapon = s0.loot.findIndex(i => i.slot === "weapon");
  await expect(page.locator(".item").nth(weapon).locator(".cmp")).toContainText("For " + s0.party[2].name);
  await page.locator(".item").nth(weapon).click();
  let s = await state(page);
  expect(s.choice[2]).toBe(weapon);
  await expect(page.locator(".hero").nth(2).locator(".new")).toContainText(s0.loot[weapon].name);
  await expect(page.locator(".hero").nth(2).locator(".st .up").first()).toBeVisible();   // ATK goes up
  // the next hero still empty-handed (the Fighter) is picked for you; → and ← move between heroes
  expect(s.sel).toBe(0);
  await page.keyboard.press("ArrowRight");
  expect((await state(page)).sel).toBe(1);
  await page.keyboard.press("ArrowLeft");
  expect((await state(page)).sel).toBe(0);
  const armor = s0.loot.findIndex(i => i.slot === "armor");
  await page.keyboard.press(String(armor + 1));
  s = await state(page);
  expect(s.choice[0]).toBe(armor);
  // giving the Wizard's card to the Cleric takes it off the Wizard: one item each
  await page.locator(".hero").nth(1).click();
  await page.locator(".item").nth(weapon).click();
  s = await state(page);
  expect(s.choice[1]).toBe(weapon); expect(s.choice[2]).toBe(-1);
  await page.locator(".hero").nth(2).click();
  await expect(page.locator(".item").nth(weapon)).toHaveClass(/taken/);
  await shot("campfire");
  note(`loot: ${s0.loot.map(i => `${i.name} (${i.rarity} ${i.slot})`).join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("floors come from the run's seed: the same seed makes the same floor, a new seed a new one", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  const r = await ds(page, () => {
    const pick = f => JSON.stringify(f.rooms.map(rm => [rm.x, rm.y, rm.pack, !!rm.boss]));
    const a = pick(DS.makeFloor(42, 3)), b = pick(DS.makeFloor(42, 3)), c = pick(DS.makeFloor(43, 3));
    const boss = [1, 2, 3, 4, 5, 6, 10, 15].map(n => DS.makeFloor(42, n).rooms.some(rm => rm.boss));
    return { same: a === b, differ: a !== c, boss, rooms: DS.makeFloor(42, 3).rooms.length };
  });
  expect(r.same).toBe(true);
  expect(r.differ).toBe(true);
  expect(r.boss).toEqual([false, false, false, false, true, false, true, true]);
  await squad(page);
  await ds(page, () => __ds.autoGear());
  await page.locator("#gear-go").click();
  await expect(page.locator("#minimap")).toBeVisible();
  await ds(page, () => __ds.step(0.8));
  await shot("floor-map");
  note(`floor 3 has ${r.rooms} rooms; seeds 42 and 43 lay it out differently; the Rat King, Bone King and Frost Wyrm rooms are on floors 5, 10 and 15, and floors 1-4 and 6 have none`);
  expect(browserErrors).toEqual([]);
});

test("when all three heroes are down the delve is over, and Floor 3 is kept as the deepest", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await squad(page);
  expect(await ds(page, () => __ds.toFloor(3))).toBe(true);
  await page.locator("#gear-go").click();
  await ds(page, () => { __ds.step(2); __ds.wipe(); __ds.step(0.1); });
  expect((await state(page)).phase).toBe("lost");
  await ds(page, () => __ds.step(2.6));
  await expect(page.locator("#over")).toBeVisible();
  await expect(page.locator("#over-floor")).toHaveText("Floor 3");
  await expect(page.locator("#over-best")).toHaveText("New deepest delve!");
  const keys = await ds(page, () => Object.keys(localStorage));
  expect(keys.every(k => k.startsWith("gameon.delve-squad."))).toBe(true);
  expect(await ds(page, () => localStorage.getItem("gameon.delve-squad.best"))).toBe("3");
  await shot("game-over");
  // same squad, new delve: back to a fresh Floor 1 campfire with the same classes
  await page.locator("#again-btn").click();
  let s = await state(page);
  expect(s.screen).toBe("gear"); expect(s.floor).toBe(1); expect(s.party.map(h => h.cls)).toEqual(["fighter", "cleric", "wizard"]);
  // the best depth is still there after a reload
  await page.reload();
  await expect(page.locator("#title-best")).toHaveText("Deepest delve: Floor 3");
  // and with storage blocked the game still starts and plays
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  await page.reload();
  await ds(page, () => { __ds.hold(true); __ds.seed(42); });
  await squad(page);
  await page.locator("#gear-go").click();
  expect(await ds(page, () => __ds.fight())).toBe("clear");
  note(`keys saved: ${keys.join(", ")}; with storage blocked a new run still cleared its first room`);
  expect(browserErrors).toEqual([]);
});

test("a squad of three is picked by tapping classes or with the number keys", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("#party")).toBeVisible();
  await expect(page.locator(".cls")).toHaveCount(4);
  await expect(page.locator("#party-go")).toBeDisabled();
  await page.keyboard.press("1"); await page.keyboard.press("2");
  await page.locator('.cls[data-cls="wizard"]').click();
  await expect(page.locator(".slot.full")).toHaveCount(3);
  expect((await state(page)).picks).toEqual(["fighter", "rogue", "wizard"]);
  await page.locator(".slot.full").nth(1).click();           // send the Rogue home
  await page.keyboard.press("3");                           // and bring a Cleric
  expect((await state(page)).picks).toEqual(["fighter", "wizard", "cleric"]);
  await expect(page.locator("#party-go")).toBeEnabled();
  await shot("squad");
  note("keys 1 and 2 added a Fighter and a Rogue, a tap added a Wizard; tapping the Rogue removed it and key 3 added a Cleric");
  expect(browserErrors).toEqual([]);
});

// Editor's Choice cards come first in the arcade; the newest pipeline game comes next.
test("Delve Squad has a card right after the Editor's Choice games and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#delve-squad"]');
  await expect(card).toBeVisible();
  const picks = games.filter(g => g.editorsChoice === true).length;
  const mine = games.findIndex(g => g.slug === "delve-squad");
  expect(mine).toBeGreaterThanOrEqual(0);
  const next = games.slice(mine + 1).find(g => !g.editorsChoice && !g.versions);
  const order = await page.locator("#shelf .cart").evaluateAll(cs => cs.map(c => c.getAttribute("href")));
  expect(order.indexOf("#delve-squad")).toBeGreaterThanOrEqual(picks);
  if (next) expect(order.indexOf("#delve-squad")).toBeLessThan(order.indexOf("#" + next.slug));
  await expect(card.locator("h2")).toHaveText("Delve Squad");
  await expect(card).toContainText("Made by Jeremy");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Delve Squad");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/delve-squad");
  const frame = page.frameLocator("#frame");
  await frame.locator("#start-btn").click();
  await frame.locator("#random-btn").click();
  await frame.locator("#party-go").click();
  await expect(frame.locator("#gear")).toBeVisible();
  await frame.locator("#gear-go").click();
  await expect(frame.locator("#delve")).toBeVisible();
  await page.waitForTimeout(1500);
  note(`card at position ${order.indexOf("#delve-squad") + 1}, after the ${picks} Editor's Choice card(s)${next ? " and ahead of " + next.slug : ""}, with its 800x450 cover and "Made by Jeremy"; inside the frame it went title, random squad, campfire, first room`);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
