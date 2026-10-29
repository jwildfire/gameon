// Evidence for game idea #168, Devil's Burger Station ("a burger station in hell where you have
// to make sure the food you're preparing has hot sauce on it or the devils that ordered the food
// will be pissed off.", approved to be goofy cartoon devils who get "steaming mad" in the game).
// Run: npm run evidence -- tests/evidence/168-devils-burger-station
import { test, expect } from "./evidence.mjs";

const GAME = "games/devils-burger-station/";
const SLUG = "devils-burger-station";
const dbs = (page, expr, arg) => page.evaluate(expr, arg);

// Some checks play whole shifts; give them room on a busy machine.
test.describe.configure({ timeout: 120_000 });

// Fixed orders, so every run sees the same devils.
async function open(page) {
  await page.addInitScript(() => { window.DBS_SEED = 1; });
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
}

async function playShift1(page) {
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-title")).toHaveText("Shift 1: Breakfast Burgers");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  await expect.poll(() => dbs(page, () => __dbs.state.slots.findIndex(d => d && d.state === "wait")), { timeout: 15_000 }).toBeGreaterThanOrEqual(0);
  return dbs(page, () => { const i = __dbs.state.slots.findIndex(d => d && d.state === "wait"); const d = __dbs.state.slots[i]; return { slot: i, layers: d.orders[0].layers, sauce: d.orders[0].sauce, name: d.name }; });
}

const KEY = { bun: "1", patty: "2", cheese: "3", lettuce: "4", tomato: "5", onion: "6", pickles: "7", peppers: "8", mild: "m", fiery: "f", lava: "l" };

// Stack a burger with the real controls: keys on a laptop, the tray buttons on a phone.
async function cook(page, isMobile, layers, sauce) {
  for (const id of [...layers, ...(sauce ? [sauce] : [])]) {
    if (isMobile) await page.locator(`#tray .tbtn[data-id="${id}"]`).tap();
    else await page.keyboard.press(KEY[id]);
  }
}

// Tap the devil in a slot on the canvas (a phone tap or a mouse click).
async function tapDevil(page, isMobile, slot) {
  const box = await page.locator("#game").boundingBox();
  const p = await dbs(page, i => ({ x: __dbs.slotX(i), y: (__dbs.layout.counterY - 50) * __dbs.layout.scale }), slot);
  if (isMobile) await page.touchscreen.tap(box.x + p.x, box.y + p.y);
  else await page.mouse.click(box.x + p.x, box.y + p.y);
}

test("the title screen opens and shift 1 starts, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-small")).toHaveText("DEVIL'S");
  await expect(page.locator(".title-big")).toHaveText("Burger Station");
  await expect(page.locator("#title-screen .muted").last()).toContainText("Designed by NotClay");
  await page.waitForTimeout(800); // let the robot cook start behind the menu
  await shot("title");
  await playShift1(page);
  await expect(page.locator("#hud-devils")).toContainText("0/6");
  expect(await dbs(page, () => __dbs.mode)).toBe("play");
  expect(await dbs(page, () => [__dbs.shifts, __dbs.ingredients, __dbs.sauces])).toEqual([5, 8, 3]);
  await expect(page.locator("#tray .tbtn.ing")).toHaveCount(8);
  await expect(page.locator("#tray .tbtn.sauce")).toHaveCount(3);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note("5 shifts, 8 ingredient buttons and 3 hot sauces (Mild, Fiery, LAVA); a devil walks up with a ticket; no requests outside the site; no sideways scrolling");
  await shot("playing");
  expect(browserErrors).toEqual([]);
});

test("a burger stacked like its ticket, with the right hot sauce, makes the devil happy and pays a tip", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  const order = await playShift1(page);
  await cook(page, isMobile, order.layers, order.sauce);
  expect(await dbs(page, () => ({ layers: __dbs.state.plate.layers, sauce: __dbs.state.plate.sauce }))).toEqual({ layers: order.layers, sauce: order.sauce });
  await tapDevil(page, isMobile, order.slot);
  await expect.poll(() => dbs(page, () => __dbs.state.perfect)).toBe(1);
  const st = await dbs(page, i => ({ state: __dbs.state.slots[i] && __dbs.state.slots[i].state, coins: __dbs.state.coins, tips: __dbs.state.tips, steam: __dbs.state.steam }), order.slot);
  expect(st.state).toBe("happy");
  expect(st.tips).toBeGreaterThan(0);
  expect(st.steam).toBe(0);
  await expect(page.locator("#coins")).toHaveText(String(st.coins));
  await expect(page.locator("#hud-devils")).toContainText("1/6");
  await page.waitForTimeout(250);
  note(`${isMobile ? "tapped the tray buttons, then tapped the devil" : "pressed the number keys and a sauce letter, then clicked the devil"}: ${order.layers.join(" + ")} with ${order.sauce.toUpperCase()} sauce for ${order.name}; paid ${st.coins} coins including a ${st.tips} coin tip`);
  await shot("served");
  expect(browserErrors).toEqual([]);
});

test("no hot sauce or the wrong one makes a devil steaming mad, and three of them end the shift", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  // First devil: the right burger, but no hot sauce at all.
  const first = await playShift1(page);
  await cook(page, isMobile, first.layers, null);
  if (isMobile) await page.locator("#serve-btn").tap(); else await page.keyboard.press("Enter");
  await expect.poll(() => dbs(page, () => __dbs.state.steam)).toBe(1);
  const mad = await dbs(page, i => { const d = __dbs.state.slots[i]; return { state: d.state, reason: d.reason }; }, first.slot);
  expect(mad).toEqual({ state: "mad", reason: "nosauce" });
  await expect(page.locator("#hud-steam .puff.used")).toHaveCount(1);
  await page.waitForTimeout(300);
  await shot("steaming-mad");
  // Next devil: the right burger with the wrong sauce (called up now rather than after the usual gap).
  await dbs(page, () => { __dbs.state.nextArrival = 0; });
  await expect.poll(() => dbs(page, () => __dbs.state.slots.findIndex(d => d && d.state === "wait")), { timeout: 20_000 }).toBeGreaterThanOrEqual(0);
  const second = await dbs(page, () => { const i = __dbs.state.slots.findIndex(d => d && d.state === "wait"); const o = __dbs.state.slots[i].orders[0]; return { slot: i, layers: o.layers, sauce: o.sauce }; });
  const wrong = second.sauce === "lava" ? "mild" : "lava";
  await cook(page, isMobile, second.layers, wrong);
  await tapDevil(page, isMobile, second.slot);
  await expect.poll(() => dbs(page, () => __dbs.state.steam)).toBe(2);
  expect(await dbs(page, i => __dbs.state.slots[i].reason, second.slot)).toBe("wrongsauce");
  // A third devil runs out of patience: the kitchen's too steamy and the shift is over.
  await dbs(page, () => { __dbs.state.nextArrival = 0; });
  await expect.poll(() => dbs(page, () => __dbs.state.slots.findIndex(d => d && d.state === "wait")), { timeout: 20_000 }).toBeGreaterThanOrEqual(0);
  await dbs(page, () => { __dbs.state.slots.find(d => d && d.state === "wait").patience = 0.05; });
  await expect(page.locator("#fail-screen")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("#fail-screen")).toContainText("steaming mad");
  await page.locator("#fail-retry-btn").click();
  await expect(page.locator("#intro-title")).toHaveText("Shift 1: Breakfast Burgers");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  expect(await dbs(page, () => ({ mode: __dbs.mode, steam: __dbs.state.steam, shift: __dbs.state.shift }))).toEqual({ mode: "play", steam: 0, shift: 1 });
  note(`no sauce on ${first.layers.join("+")}: steaming mad; ${wrong.toUpperCase()} instead of ${second.sauce.toUpperCase()}: steaming mad; a third ran out of patience and the shift ended with "Too steamy in here!"; Try again started shift 1 fresh`);
  expect(browserErrors).toEqual([]);
});

test("the game's words are goofy: devils get steaming mad, and there's no swearing anywhere", async ({ page, note }) => {
  const files = ["index.html", "game.js", "engine.js", "art.js", "bot.js"];
  let all = "";
  for (const f of files) {
    const res = await page.request.get(GAME + f);
    expect(res.ok()).toBe(true);
    all += await res.text();
  }
  for (const word of ["hell", "pissed", "damn", "crap", "heck"]) expect(all, word).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
  expect(all).toMatch(/steaming mad/i);
  note(`${files.join(", ")}: "steaming mad" is there; none of hell, pissed, damn, crap or heck`);
});

test("every one of the 5 shifts can be beaten in the real game, and each is busier than the last", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(400_000);
  await open(page);
  await playShift1(page);
  const results = [];
  for (let n = 1; n <= 5; n++) {
    // The robot cook from bot.js taps once every 0.6 game seconds, sped up 60 times.
    await dbs(page, n => { __dbs.start(n, 1); __dbs.bot(true, 60, 0.6); }, n);
    await expect.poll(() => dbs(page, () => __dbs.mode), { timeout: 120_000 }).toMatch(/clear|fail|win/);
    const r = await dbs(page, () => ({ mode: __dbs.mode, coins: __dbs.state.coins, par: __dbs.state.par, steam: __dbs.state.steam, total: __dbs.state.total,
      slots: __dbs.state.slots.length, patience: __dbs.state.S.patience, gap: __dbs.state.S.gap, perfect: __dbs.state.perfect, t: Math.round(__dbs.state.t) }));
    expect(r.mode, `shift ${n}`).toBe(n < 5 ? "clear" : "win");
    results.push(r);
  }
  for (let i = 1; i < 5; i++) {
    expect(results[i].total).toBeGreaterThan(results[i - 1].total);
    expect(results[i].slots).toBeGreaterThanOrEqual(results[i - 1].slots);
    expect(results[i].patience).toBeLessThan(results[i - 1].patience);
    expect(results[i].gap).toBeLessThanOrEqual(results[i - 1].gap);
  }
  await expect(page.locator("#win-screen")).toBeVisible();
  await expect(page.locator("#win-screen h2")).toHaveText("Big Boss Blaze is happy!");
  note("shift: devils, at the counter at once, patience, coins, steaming mad, game seconds: " + results.map((r, i) => `${i + 1}: ${r.total} devils, ${r.slots} at once, ${r.patience}s, ${r.coins} coins, ${r.steam} steamed, ${r.t}s`).join("; "));
  await shot("all-shifts");
  expect(browserErrors).toEqual([]);
});

test("later shifts bring fussy devils, double orders, and Big Boss Blaze at the end", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await playShift1(page);
  await dbs(page, () => __dbs.start(4, 1));
  const s4 = await dbs(page, () => ({ doubles: __dbs.state.queue.filter(d => d.orders.length === 2).length, fussy: __dbs.state.queue.filter(d => d.fussy).length }));
  expect(s4.doubles).toBeGreaterThan(0);
  expect(s4.fussy).toBeGreaterThan(0);
  await dbs(page, () => __dbs.start(5, 1));
  const q = await dbs(page, () => __dbs.state.queue.map(d => ({ boss: d.boss, name: d.name, orders: d.orders.length })));
  expect(q[q.length - 1]).toEqual({ boss: true, name: "Big Boss Blaze", orders: 2 });
  expect(q.filter(d => d.boss)).toHaveLength(1);
  // skip to the boss: he waits for an empty counter, then takes the middle spot
  await dbs(page, () => { __dbs.state.queue = __dbs.state.queue.slice(-1); });
  await expect.poll(() => dbs(page, () => { const d = __dbs.state.slots[1]; return d && d.boss && d.state; }), { timeout: 10_000 }).toBe("wait");
  await expect(page.locator("#toast")).toHaveText("BIG BOSS BLAZE IS HERE!");
  // serve his first burger: the ticket ticks it off and he waits for the second
  const o = await dbs(page, () => __dbs.state.slots[1].orders[0]);
  await dbs(page, o => { const s = __dbs.state; o.layers.forEach(id => DBS.add(s, id)); DBS.sauce(s, o.sauce); DBS.serve(s, 1); }, o);
  expect(await dbs(page, () => ({ done: __dbs.state.slots[1].orders.map(o => o.done), state: __dbs.state.slots[1].state }))).toEqual({ done: [true, false], state: "wait" });
  note(`shift 4: ${s4.doubles} double orders and ${s4.fussy} fussy devils; shift 5: ${q.length - 1} devils, then Big Boss Blaze with 2 burgers on one ticket (the first one ticked off here)`);
  await page.waitForTimeout(300);
  await shot("boss");
  expect(browserErrors).toEqual([]);
});

test("the game pauses, and Restart starts the shift over", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await playShift1(page);
  await dbs(page, () => { DBS.add(__dbs.state, "bun"); });
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  const frozen = await dbs(page, () => __dbs.state.t);
  await page.waitForTimeout(400);
  expect(await dbs(page, () => __dbs.state.t)).toBe(frozen);
  await shot("paused");
  await page.locator("#resume-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  await expect.poll(() => dbs(page, () => __dbs.state.t)).toBeGreaterThan(frozen);
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.locator("#restart-btn").click();
  await expect(page.locator("#intro-screen")).toBeVisible();
  await page.locator("#go-btn").click();
  const fresh = await dbs(page, () => ({ t: __dbs.state.t, layers: __dbs.state.plate.layers.length, mode: __dbs.mode }));
  expect(fresh.mode).toBe("play");
  expect(fresh.t).toBeLessThan(frozen);
  expect(fresh.layers).toBe(0);
  note(`paused at ${frozen.toFixed(2)}s and the clock stayed put; Keep cooking ran it again; P paused, and Restart shift brought back the shift intro with a fresh clock and an empty plate`);
  expect(browserErrors).toEqual([]);
});

test("the best score and unlocked shifts are saved only under gameon.devils-burger-station.", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await playShift1(page);
  await dbs(page, () => __dbs.bot(true, 60, 0.6));
  await expect(page.locator("#clear-screen")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#clear-stars .off")).toHaveCount(0);
  const coins = await dbs(page, () => __dbs.state.coins);
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.devils-burger-station.")).toBe(true);
  await expect(page.locator("#best-line")).toHaveText(`Best score: ${coins}`);
  await expect(page.locator('#shift-row button[data-shift="1"]')).toContainText("★★★");
  await expect(page.locator('#shift-row button[data-shift="2"]')).toBeEnabled();
  await expect(page.locator('#shift-row button[data-shift="3"]')).toBeDisabled();
  note(`keys: ${keys.join(", ")}; after a reload the title shows best score ${coins}, 3 stars on shift 1 and shift 2 unlocked`);
  await shot("saved");
  expect(browserErrors).toEqual([]);
});

test("the game still plays when the browser blocks saving", async ({ page, note, browserErrors }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("storage blocked"); } });
  });
  await open(page);
  await playShift1(page);
  await dbs(page, () => __dbs.bot(true, 60, 0.6));
  await expect(page.locator("#clear-screen")).toBeVisible({ timeout: 60_000 });
  note("with localStorage throwing, the title screen opened and shift 1 played through to Shift clear");
  expect(browserErrors).toEqual([]);
});

// The card is found by its slug, not its place on the shelf: newer games and Editor's Choice picks move it (#194).
test("Devil's Burger Station has a card in the arcade and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("Devil's Burger Station");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Devil's Burger Station");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/devils-burger-station");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".title-big")).toHaveText("Burger Station");
  await frame.locator("#play-btn").click();
  await frame.locator("#go-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  note(`card on the shelf with its 800x450 cover; plays inside the frame; GitHub button opens its folder`);
  await page.waitForTimeout(600);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
