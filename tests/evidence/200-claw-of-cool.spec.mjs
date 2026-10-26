// Evidence for Claw of Cool, built from game idea #200.
// Run: npm run evidence -- tests/evidence/200-claw-of-cool
// The game clock is held and stepped by hand (__claw.hold / __claw.step) and the random numbers are
// seeded (__claw.seed), so every run fills the machine the same way and every grab ends the same way.
import { test, expect, games } from "./evidence.mjs";

const GAME = "games/claw-of-cool/";
const cw = (page, fn, arg) => page.evaluate(fn, arg);

test.describe.configure({ timeout: 90_000 });

async function open(page) {
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
  await cw(page, () => { __claw.hold(true); __claw.seed(200); });
}
async function press(page, isMobile, locator) {
  if (isMobile) await page.locator(locator).tap(); else await page.locator(locator).click();
}
async function start(page, isMobile) {
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#title")).toBeHidden();
  expect(await cw(page, () => __claw.game.screen)).toBe("play");
}
// prizes the claw can reach: on top, or on the floor with nothing resting on them
const reachable = page => cw(page, () => { const ps = __claw.prizes();
  return ps.filter(p => p.layer === 1 || !ps.some(q => q.layer === 1 && Math.hypot(q.x - p.x, q.y - p.y) < 13)); });
// one try: put a coin in with DROP, wait for the timer, line up, DROP, and let the claw finish
async function tryAt(page, x, y, drop = () => page.keyboard.press("Space")) {
  await drop();
  await cw(page, () => __claw.step(2));
  expect(await cw(page, () => __claw.st.phase)).toBe("play");
  await cw(page, ([x, y]) => __claw.aim(x, y), [x, y]);
  await drop();
  expect(await cw(page, () => __claw.st.phase)).toBe("lower");
}
const state = page => cw(page, () => { const s = __claw.st; return { phase: s.phase, coins: s.coins, score: s.score, round: s.round, won: s.won.slice(), prizes: s.prizes.length, x: s.claw.x, y: s.claw.y, msg: s.msg }; });

test("the title screen shows the game, its four coolness tiers and the best score, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator("#title .logo")).toContainText("CLAW");
  await expect(page.locator("#title .by")).toHaveText("Designed by Jeremy");
  await expect(page.locator("#title .chips4 span")).toHaveText(["COOL 10", "COOLER 25", "SUPER COOL 60", "COOLEST 150"]);
  await expect(page.locator("#t-best")).toHaveText("0");
  await expect(page.locator("#fig #art")).not.toBeEmpty();
  await expect(page.locator("#shelf .slot")).toHaveCount(12);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  expect(await page.locator("a[href^=http]").count()).toBe(0);
  note("4 tiers (10, 25, 60, 150 points), 12 prizes on the shelf, best score 0; no requests outside the site, no outside links, no sideways scrolling");
  await shot("title");
  expect(browserErrors).toEqual([]);
});

test("DROP puts in a coin, the timer starts, and the keypad and keyboard steer the claw", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  await press(page, isMobile, ".kpad .go");
  expect((await state(page)).coins).toBe(9);
  await cw(page, () => __claw.step(2));
  let s = await state(page);
  expect(s.phase).toBe("play");
  // 0.75 s for the coin to drop and 0.9 s of GET READY, so the 15 s timer has run about 0.35 s
  expect(await cw(page, () => __claw.st.time)).toBeCloseTo(15 - 0.367, 2);
  const y0 = s.y, x0 = s.x;
  // three taps on the pad's left key: one step (6 units) each
  for (let i = 0; i < 3; i++) await press(page, isMobile, ".kpad .k[aria-label=Left]");
  await cw(page, () => __claw.step(1));
  s = await state(page);
  expect(s.y).toBeCloseTo(y0 + 18, 5);
  // holding a key keeps the claw moving: W (forward) for half a second
  await page.keyboard.down("w");
  await cw(page, () => __claw.step(0.5));
  await page.keyboard.up("w");
  await cw(page, () => __claw.step(0.5));
  s = await state(page);
  expect(x0 - s.x).toBeGreaterThan(12);
  await expect(page.locator("#aim")).not.toBeEmpty();
  note(`a coin went in (10 to 9 coins) and the 15 s timer started; 3 taps on ◀ moved the claw ${(s.y - y0).toFixed(0)} units left; holding W moved it ${(x0 - s.x).toFixed(1)} units forward; the aim line reads "${await page.locator("#aim").textContent()}"`);
  await shot("steering");
  expect(browserErrors).toEqual([]);
});

test("a centred grab carries a prize to the chute and scores its tier's points, and it goes on the collection shelf", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  const target = (await reachable(page)).find(p => p.tier === 2);
  expect(target).toBeTruthy();
  await tryAt(page, target.x, target.y, () => press(page, isMobile, ".kpad .go"));
  await cw(page, () => __claw.step(2.6));
  expect(await cw(page, () => __claw.st.drop.grip)).toBe("hold");
  await cw(page, () => __claw.step(1.6));
  const s = await state(page);
  expect(s.score).toBe(60);
  expect(s.coins).toBe(10);               // 9 after the coin, +1 back for a SUPER COOL prize
  expect(s.won).toEqual([target.kind]);
  await expect(page.locator("#banner")).toHaveClass(/show/);
  await expect(page.locator("#banner b")).toHaveText("+60 SUPER COOL!");
  await expect(page.locator(`#shelf .slot[data-kind=${target.kind}]`)).toHaveClass(/won/);
  await expect(page.locator(`#shelf .slot[data-kind=${target.kind}] .cnt`)).toHaveText("x1");
  await expect(page.locator("#shelf-n")).toContainText("1 won this game");
  note(`grabbed the ${target.kind} dead centre: it held, rode to the chute, scored 60 and gave a coin back (10 coins); the shelf shows it x1`);
  await shot("win");
  await cw(page, () => __claw.step(3));
  expect((await state(page)).phase).toBe("idle");
  expect(await cw(page, () => __claw.st.bay.length)).toBe(0);
  expect(browserErrors).toEqual([]);
});

test("an off-centre grab slips out on the way and the prize falls back into the pile", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  const target = (await reachable(page)).find(p => p.tier === 0 && p.x > 30 && p.x < 60);
  expect(target).toBeTruthy();
  await tryAt(page, target.x - 7.5, target.y);
  expect(await cw(page, () => __claw.under())).toMatchObject({ id: target.id });
  await cw(page, () => __claw.step(1.0));
  expect(await cw(page, () => __claw.st.drop.grip)).toBe("slip");
  await cw(page, () => __claw.step(2.4));
  let s = await state(page);
  expect(s.msg).toEqual(["SO", "CLOSE"]);
  await expect(page.locator("#banner b")).toHaveText("So close!");
  await shot("slip");
  await cw(page, () => __claw.step(4));
  s = await state(page);
  expect(s.score).toBe(0);
  expect(s.prizes).toBe(27);
  expect(s.coins).toBe(9);
  note(`dropped 7.5 units off the centre of a ${target.kind}: the claw closed on it, it slipped out on the way up ("SO CLOSE" on the display), and all 27 prizes are back in the machine; 0 points, 9 coins left`);
  expect(browserErrors).toEqual([]);
});

test("five wins refill the machine for round 2, with more of the coolest prizes and a shorter timer", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  const before = await cw(page, () => __claw.prizes().reduce((a, p) => (a[p.tier]++, a), [0, 0, 0, 0]));
  for (let i = 0; i < 5; i++) {
    const target = (await reachable(page)).find(p => p.tier === 0);
    await tryAt(page, target.x, target.y);
    // step a second at a time until the claw is home and the prize is on the shelf (and, after the fifth, the refill starts)
    for (let k = 0; k < 12 && await cw(page, () => __claw.st.round) === 1; k++) {
      await cw(page, () => __claw.step(1));
      if (i < 4 && await cw(page, () => __claw.st.phase === "idle" && !__claw.st.bay.length && !__claw.st.falls.length && __claw.st.won.length)) break;
    }
  }
  await cw(page, () => __claw.step(0.3));
  let s = await state(page);
  expect(s.won.length).toBe(5);
  expect(s.round).toBe(2);
  await expect(page.locator("#banner b")).toHaveText("Round 2!");
  await shot("round-2");
  await cw(page, () => __claw.step(4));
  const after = await cw(page, () => __claw.prizes().reduce((a, p) => (a[p.tier]++, a), [0, 0, 0, 0]));
  expect(after).toEqual([10, 10, 5, 2]);
  expect(before).toEqual([15, 8, 3, 1]);
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(2));
  expect(await cw(page, () => __claw.st.time)).toBeCloseTo(13 - 0.367, 2);
  s = await state(page);
  note(`5 cool prizes won (score ${s.score}); the machine refilled for round 2: by tier (cool, cooler, super cool, coolest) it went from ${before.join(", ")} to ${after.join(", ")}; the timer is 13 s now (15 s in round 1)`);
  expect(browserErrors).toEqual([]);
});

test("P pauses and freezes the game, Esc resumes, and Start over brings back 10 coins", async ({ page, isMobile, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(2.5));
  const t0 = await cw(page, () => __claw.st.time);
  await page.keyboard.press("p");
  await expect(page.locator("#pause")).toBeVisible();
  await expect(page.locator("#p-info")).toHaveText("Round 1 · 0 points · 9 coins left");
  await cw(page, () => __claw.step(3));
  expect(await cw(page, () => __claw.st.time)).toBe(t0);
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeHidden();
  await cw(page, () => __claw.step(1));
  expect(await cw(page, () => __claw.st.time)).toBeCloseTo(t0 - 1, 3);
  await press(page, isMobile, "#btns .act[data-k=pause]");
  await expect(page.locator("#pause")).toBeVisible();
  await press(page, isMobile, "#restart-btn");
  await expect(page.locator("#pause")).toBeHidden();
  const s = await state(page);
  expect(s).toMatchObject({ coins: 10, score: 0, round: 1, phase: "idle", prizes: 27 });
  note(`paused with ${t0.toFixed(1)} s on the timer and 3 s of stepping changed nothing; after Esc it counted down again; the Pause button then Start over gave a fresh machine with 10 coins`);
  expect(browserErrors).toEqual([]);
});

test("running out of coins ends the game, the best score and found prizes survive a reload, and it still plays with storage blocked", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  await cw(page, () => { __claw.st.coins = 1; });
  const target = (await reachable(page)).find(p => p.tier === 1);
  await tryAt(page, target.x, target.y);
  await cw(page, () => __claw.step(10));
  await expect(page.locator("#over")).toBeVisible();
  await expect(page.locator("#o-score")).toHaveText("25");
  await expect(page.locator("#o-new")).toBeVisible();
  await expect(page.locator("#o-won svg")).toHaveCount(1);
  await shot("game-over");
  await page.reload();
  await expect(page.locator("#play-btn")).toBeVisible();
  await expect(page.locator("#t-best")).toHaveText("25");
  await expect(page.locator("#t-found")).toHaveText("1");
  await expect(page.locator(`#shelf .slot[data-kind=${target.kind}]`)).toHaveClass(/found/);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.claw-of-cool.")).toBe(true);
  // blocked storage: every read and write throws, and the game still plays
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  await page.reload();
  await expect(page.locator("#play-btn")).toBeVisible();
  await cw(page, () => { __claw.hold(true); __claw.seed(200); });
  await start(page, isMobile);
  const t2 = (await reachable(page)).find(p => p.tier === 0);
  await tryAt(page, t2.x, t2.y);
  await cw(page, () => __claw.step(9));
  expect((await state(page)).score).toBe(10);
  note(`one coin left: a ${target.kind} won 25, then OUT OF COINS with NEW BEST; after a reload the title shows best 25 and 1/12 found; save keys: ${keys.join(", ")}; with storage blocked a new game still played and scored`);
  expect(browserErrors).toEqual([]);
});

test("Claw of Cool has a card in the arcade and plays in its frame", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#claw-of-cool"]');
  await expect(card).toBeVisible();
  expect(games.findIndex(g => g.slug === "claw-of-cool")).toBe(0);
  const picks = games.filter(g => g.editorsChoice === true).length;
  const order = await page.locator("#shelf .cart").evaluateAll(cs => cs.map(c => c.getAttribute("href")));
  expect(order.indexOf("#claw-of-cool")).toBeGreaterThanOrEqual(picks);
  await expect(card.locator("h2")).toHaveText("Claw of Cool");
  await expect(card).toContainText("Made by Jeremy");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Claw of Cool");
  const frame = page.frameLocator("#frame");
  if (isMobile) await frame.locator("#play-btn").tap(); else await frame.locator("#play-btn").click();
  await expect(frame.locator("#title")).toBeHidden();
  await expect(frame.locator(".kpad .go")).toBeVisible();
  note(`card at position ${order.indexOf("#claw-of-cool") + 1}, after the ${picks} Editor's Choice card(s), with its 800x450 cover and "Made by Jeremy"; PLAY in the frame starts the game`);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
