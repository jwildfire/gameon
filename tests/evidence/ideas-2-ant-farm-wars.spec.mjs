// Evidence for Ant Farm Wars, built from game idea jwildfire/gameon-ideas#2.
// Run: npm run evidence -- tests/evidence/ideas-2-ant-farm-wars
// The farm runs on its own seeded random numbers, and most checks hold the game clock and
// step it by hand (__afw.hold / __afw.step), so every run sees the same farm.
import { test, expect } from "./evidence.mjs";

const GAME = "games/ant-farm-wars/";
const afw = (page, expr, arg) => page.evaluate(expr, arg);

test.describe.configure({ timeout: 120_000 });

// Open the game, seed the farm and start a game; the clock is held unless told otherwise.
async function startGame(page, seed = 6, hold = true) {
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
  await afw(page, ([seed, hold]) => { __afw.seed(seed); __afw.hold(hold); __afw.start(); }, [seed, hold]);
  await expect(page.locator("#draft")).toBeVisible();
}
const tunnels = page => afw(page, () => { const s = __afw.state; let n = 0; for (let k = 0; k < s.cells.length; k++) if (s.cells[k] === 1) n++; return n; });

test("the title screen opens and a game starts with 3 cards to pick, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(GAME);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".logo .ant")).toHaveText("Ant Farm");
  await expect(page.locator(".logo .wars")).toHaveText("Wars!");
  await expect(page.locator("#title-screen")).toContainText("Designed by Jeremy");
  await page.waitForTimeout(800); // the robot colonies start digging behind the menu
  expect(await afw(page, () => __afw.state.ants.length)).toBeGreaterThan(10);
  await shot("title");
  await afw(page, () => __afw.seed(6));
  await page.locator("#play-btn").click();
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator("#draft-title")).toHaveText("Round 1: pick one");
  await expect(page.locator("#cards .pick")).toHaveCount(3);
  await expect(page.locator("#hud-rn")).toHaveText("1");
  await expect(page.locator("#queens .qchip")).toHaveCount(4);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  const cards = await page.locator("#cards .pick b").allTextContents();
  note(`round 1 offers: ${cards.join(", ")}; 14 cards in all (${await afw(page, () => __afw.E.CARDS.length)}); no requests outside the site; no sideways scrolling`);
  await shot("draft");
  expect(browserErrors).toEqual([]);
});

test("picking a card starts the round: every rival picks too, and the ants dig glowing tunnels on their own", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startGame(page, 6, false);
  const before = await tunnels(page);
  if (isMobile) await page.locator("#cards .pick").nth(0).tap();
  else await page.keyboard.press("1");
  await expect(page.locator("#draft")).toBeHidden();
  expect(await afw(page, () => __afw.mode)).toBe("battle");
  const picks = await afw(page, () => __afw.state.colonies.map(c => c.picks.length));
  expect(picks).toEqual([1, 1, 1, 1]);
  await afw(page, () => __afw.hold(true));
  await afw(page, () => __afw.step(18));
  const after = await tunnels(page);
  expect(after).toBeGreaterThan(before + 20);
  const food = await afw(page, () => __afw.state.colonies.map(c => Math.round(c.food)));
  const rivals = await afw(page, () => __afw.state.colonies.slice(1).map(c => c.short + " took " + __afw.E.CARD[c.picks[0]].name));
  await expect(page.locator("#hud-time")).not.toHaveAttribute("style", /width: 0%/);
  note(`${isMobile ? "tapped the first card" : "pressed 1"}; ${rivals.join(", ")}; after 18 seconds the colonies had dug ${after - before} new tunnel cells (food: ${food.join("/")})`);
  await shot("battle");
  expect(browserErrors).toEqual([]);
});

test("tapping a rival's nest sends your soldiers there, tapping elsewhere plants a flag, and dragging looks around", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startGame(page);
  await afw(page, () => { __afw.pick(0); __afw.step(0.2); });
  // tap the Blue Diggers' nest (bottom left, on screen at both widths)
  let at = await afw(page, () => __afw.cellCenter(4, 21));
  if (isMobile) await page.touchscreen.tap(at[0], at[1]); else await page.mouse.click(at[0], at[1]);
  expect(await afw(page, () => __afw.state.colonies[0].target)).toBe(2);
  await expect(page.locator("#tip")).toHaveText("Attack the Blue Diggers!");
  // and a spot in the dirt
  at = await afw(page, () => __afw.cellCenter(9, 12));
  if (isMobile) await page.touchscreen.tap(at[0], at[1]); else await page.mouse.click(at[0], at[1]);
  expect(await afw(page, () => __afw.state.colonies[0].rally)).toEqual([9, 12]);
  await afw(page, () => __afw.step(0.1));
  await shot("rally");
  // tap the flag again to take it away
  if (isMobile) await page.touchscreen.tap(at[0], at[1]); else await page.mouse.click(at[0], at[1]);
  expect(await afw(page, () => __afw.state.colonies[0].rally)).toBe(null);
  // drag to look around (only needed where the farm is bigger than the screen)
  const pannable = await afw(page, () => __afw.view.pannable);
  let moved = "the whole farm fits, so there's nothing to drag";
  if (pannable) {
    const x0 = await afw(page, () => __afw.view.ox);
    await page.mouse.move(300, 450); await page.mouse.down(); await page.mouse.move(200, 450, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(100);
    const x1 = await afw(page, () => __afw.view.ox);
    expect(x1).toBeLessThan(x0 - 50);
    expect(await afw(page, () => __afw.state.colonies[0].rally)).toBe(null); // a drag isn't a tap
    moved = `dragging left moved the farm ${Math.round(x0 - x1)}px`;
  }
  note(`tapping Blue's nest made it the target; tapping the dirt planted a flag at 9,12 and tapping it again took it away; ${moved}`);
  expect(browserErrors).toEqual([]);
});

test("all four powers work from their buttons: fire, glue, cave-in and flying scouts", async ({ page, shot, note, browserErrors }) => {
  await startGame(page);
  await afw(page, () => { __afw.pick(0); __afw.step(20); const me = __afw.state.colonies[0]; me.powers = { fire: 1, glue: 1, cave: 1, fly: 1 }; me.cd = {}; __afw.step(0.05); });
  await expect(page.locator("#powers .pw")).toHaveCount(4);
  // put a bunch of Blue's ants in a tunnel near our nest and aim there
  const spot = await afw(page, () => {
    const s = __afw.state;
    let k = -1;
    for (let y = 8; y < 16 && k < 0; y++) for (let x = 2; x < 8; x++) if (s.cells[y * 40 + x] === 1) { k = y * 40 + x; break; }
    const x = k % 40, y = Math.floor(k / 40);
    s.ants.filter(a => a.c === 2).slice(0, 4).forEach(a => { a.cx = x; a.cy = y; a.x = x; a.y = y; a.nx = -1; a.hp = a.max; });
    return [x, y];
  });
  const use = async (id) => {
    await page.locator(`#powers .pw[data-id="${id}"]`).click();
    await expect(page.locator(`#powers .pw[data-id="${id}"]`)).toHaveClass(/armed/);
    const at = await afw(page, s => __afw.cellCenter(s[0], s[1]), spot);
    await page.mouse.click(at[0], at[1]);
    expect(await afw(page, id => __afw.state.colonies[0].cd[id], id)).toBeGreaterThan(0);
  };
  const hpBefore = await afw(page, s => __afw.state.ants.filter(a => a.c === 2 && a.x === s[0] && a.y === s[1]).reduce((t, a) => t + a.hp, 0), spot);
  await use("fire");
  const hpAfter = await afw(page, s => __afw.state.ants.filter(a => a.c === 2 && Math.abs(a.x - s[0]) < 1 && Math.abs(a.y - s[1]) < 1).reduce((t, a) => t + Math.max(0, a.hp), 0), spot);
  expect(hpAfter).toBeLessThan(hpBefore);
  await use("glue");
  expect(await afw(page, () => __afw.state.glue.length)).toBe(1);
  const t0 = await tunnels(page);
  await use("cave");
  expect(await tunnels(page)).toBeLessThan(t0);
  const flyersBefore = await afw(page, () => __afw.state.ants.filter(a => a.c === 0 && a.fly).length);
  await use("fly");
  expect(await afw(page, () => __afw.state.ants.filter(a => a.c === 0 && a.fly).length)).toBe(flyersBefore + 2);
  await afw(page, () => __afw.step(0.4));
  await expect(page.locator("#powers .pw.ready")).toHaveCount(0); // all four recharging
  note(`at cell ${spot.join(",")}: fire took Blue's ants from ${Math.round(hpBefore)} to ${Math.round(hpAfter)} health, glue made a puddle, the cave-in filled ${t0 - await tunnels(page)}+ tunnel cells back in, and 2 flying scouts took off; all four buttons show their recharge`);
  await shot("powers");
  expect(browserErrors).toEqual([]);
});

test("a round ends with a new pick that shows what the rivals took, and taking a queen's chamber knocks a colony out", async ({ page, shot, note, browserErrors }) => {
  await startGame(page);
  await afw(page, () => { __afw.pick(0); __afw.step(30); });
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator("#draft-title")).toHaveText("Round 2: pick one");
  await expect(page.locator("#draft-line")).toContainText("Last round the rivals took:");
  await expect(page.locator("#hud-rn")).toHaveText("2");
  const line = await page.locator("#draft-line").textContent();
  await page.locator("#cards .pick").nth(1).click();
  await expect(page.locator("#draft")).toBeHidden();
  // one of our soldiers stands in Red's chamber, and Red's queen is nearly done
  await afw(page, () => {
    const s = __afw.state, red = s.colonies[1];
    s.ants.filter(a => a.c === 1).forEach(a => { a.hp = 0; });
    red.q.hp = 3; red.food = 0; red.hatchT = 99;
    const a = s.ants.find(a => a.c === 0 && a.kind === "s");
    a.cx = red.q.x - 1; a.cy = red.q.y; a.x = a.cx; a.y = a.cy; a.nx = -1; a.cd = 0; a.hp = a.max = 200;
    __afw.step(2);
  });
  expect(await afw(page, () => __afw.state.colonies[1].alive)).toBe(false);
  await expect(page.locator("#queens .qchip").nth(1)).toHaveClass(/out/);
  await expect(page.locator("#tip")).toHaveText("The Red Biters are knocked out!");
  await shot("knocked-out");
  note(`round 2 pick showed “${line.trim()}”; a gold soldier in Red's chamber bit the queen and the Red Biters were knocked out`);
  expect(browserErrors).toEqual([]);
});

test("the robot player can win, the win is saved only under gameon.ant-farm-wars., and losing shows your place", async ({ page, shot, note, browserErrors }) => {
  await page.goto(GAME);
  // Balance: the robot plays 20 whole games through the real engine, picking sensibly and using powers.
  const runs = await afw(page, () => Array.from({ length: 20 }, (_, i) => AFWBot.run(i + 1, "smart", true)));
  const wins = runs.filter(r => r.won).length;
  expect(wins).toBeGreaterThanOrEqual(10);
  runs.forEach(r => expect(r.over).toBe(true));
  // and once in the game itself
  await afw(page, () => { __afw.seed(6); __afw.hold(true); __afw.bot(true); __afw.start(); });
  await afw(page, () => {
    const s = () => __afw.state;
    for (let i = 0; i < 400 && __afw.mode !== "over"; i++) {
      if (__afw.mode === "draft") __afw.pick(__afw.E.choose(s(), 0, s().offers, "smart"));
      else __afw.step(2);
    }
  });
  await expect(page.locator("#end-screen")).toBeVisible();
  await expect(page.locator("#end-big")).toHaveText("You win!");
  await expect(page.locator("#places > div")).toHaveCount(4);
  const rounds = await afw(page, () => __afw.state.round);
  await shot("win");
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.ant-farm-wars.")).toBe(true);
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem("gameon.ant-farm-wars.record")));
  expect(rec.wins).toBe(1);
  expect(rec.fewestRounds).toBe(rounds);
  await expect(page.locator("#title-best")).toContainText(`won in ${rounds} round`);
  // losing: an enemy soldier finishes off our queen
  await afw(page, () => { __afw.seed(6); __afw.hold(true); __afw.start(); __afw.pick(0); });
  await afw(page, () => {
    const s = __afw.state, me = s.colonies[0];
    me.q.hp = 3; me.food = 0; me.hatchT = 99;
    s.ants.filter(a => a.c === 0).forEach(a => { a.hp = 0; });
    const a = s.ants.find(a => a.c === 1 && a.kind === "s");
    a.cx = me.q.x + 1; a.cy = me.q.y; a.x = a.cx; a.y = a.cy; a.nx = -1; a.cd = 0; a.hp = a.max = 200;
    __afw.step(2);
  });
  await expect(page.locator("#end-screen")).toBeVisible();
  await expect(page.locator("#end-big")).toHaveText("Knocked out!");
  await expect(page.locator("#end-line")).toContainText("You came 4th");
  note(`robot won ${wins} of 20 whole games (rounds: ${runs.map(r => (r.won ? "W" : "L") + r.rounds).join(" ")}); in the game it won seed 6 in ${rounds} rounds; after a reload the title shows the record and the only keys are ${keys.join(", ")}; a queen bitten to nothing in round 1 shows “Knocked out!” and 4th place`);
  expect(browserErrors).toEqual([]);
});

test("pause stops the farm, Start over starts a new game, speed-up works, and it plays when saving is blocked", async ({ page, note, browserErrors }) => {
  await startGame(page, 6, false);
  await page.locator("#cards .pick").nth(0).click();
  await page.waitForTimeout(500);
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  const frozen = await afw(page, () => __afw.state.t);
  await page.waitForTimeout(500);
  expect(await afw(page, () => __afw.state.t)).toBe(frozen);
  await page.locator("#resume-btn").click();
  await page.waitForTimeout(300);
  expect(await afw(page, () => __afw.state.t)).toBeGreaterThan(frozen);
  await page.locator("#speed-btn").click();
  await expect(page.locator("#speed-btn")).toHaveText("2×");
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.locator("#restart-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  await expect(page.locator("#draft-title")).toHaveText("Round 1: pick one");
  expect(await afw(page, () => __afw.state.t)).toBe(0);

  const blocked = await page.context().newPage();
  const errs = [];
  blocked.on("pageerror", e => errs.push(e.message));
  await blocked.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("storage blocked"); } }); });
  await blocked.goto(GAME);
  await blocked.locator("#play-btn").click();
  await blocked.locator("#cards .pick").nth(0).click();
  await blocked.waitForTimeout(600);
  expect(await blocked.evaluate(() => __afw.state.t)).toBeGreaterThan(0.2);
  expect(errs).toEqual([]);
  note(`paused at ${frozen.toFixed(2)}s and the clock stayed put; resuming ran it on; the speed button went to 2×; Start over went back to a fresh round 1 pick; with localStorage throwing, a game still started and ran`);
  expect(browserErrors).toEqual([]);
});

// The card is found by its slug, not its place on the shelf: newer games and Editor's Choice picks move it (#194).
test("Ant Farm Wars has a card in the arcade and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#ant-farm-wars"]');
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("Ant Farm Wars");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Ant Farm Wars");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/ant-farm-wars");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".logo .wars")).toHaveText("Wars!");
  await frame.locator("#play-btn").click();
  await expect(frame.locator("#draft")).toBeVisible();
  await frame.locator("#cards .pick").nth(0).click();
  await expect(frame.locator("#hud")).toBeVisible();
  note(`card on the shelf with its 800x450 cover; plays inside the frame; GitHub button opens its folder`);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
