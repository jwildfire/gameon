// Evidence for game idea #155, Big Weird Dig ("you excavate weird stuff with a bulldozer. kind of like dig dug?").
// Run: npm run evidence -- tests/evidence/155-big-weird-dig
import { test, expect } from "./evidence.mjs";

const GAME = "games/big-weird-dig/";
const bwd = (page, expr, arg) => page.evaluate(expr, arg);

// Some checks play whole levels in real time; give them room on a busy machine.
test.describe.configure({ timeout: 120_000 });

async function startLevel(page, n) {
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
  await page.locator("#play-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  if (n !== 1) await bwd(page, n => __bwd.start(n), n);
  await expect(page.locator("#hud-level")).toContainText(`${n}.`);
}

test("the title screen opens and level 1 starts, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(GAME);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("WEIRD");
  await expect(page.locator("#title-screen .muted")).toContainText("Designed by Jeremy");
  await page.waitForTimeout(600); // let the robot start digging behind the menu
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#hud-level")).toHaveText("1. Backyard Topsoil · 10 ft");
  await expect(page.locator("#fuel-label")).toHaveText("FUEL 100");
  await expect(page.locator("#hud-finds canvas")).toHaveCount(3);
  expect(await bwd(page, () => __bwd.mode)).toBe("play");
  expect(await bwd(page, () => __bwd.levelCount)).toBe(8);
  expect(await bwd(page, () => __bwd.itemCount)).toBe(30);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note("8 levels and 30 weird things; HUD shows the level, fuel and the 3 things to find; no requests outside the site; no sideways scrolling");
  await shot("playing");
  expect(browserErrors).toEqual([]);
});

test("the bulldozer digs a real tunnel with the real controls: the keyboard on a laptop, the arrow pad on a phone", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startLevel(page, 1);
  const before = await bwd(page, () => ({ x: __bwd.state.dozer.x, y: __bwd.state.dozer.y, fuel: __bwd.state.fuel }));
  if (isMobile) {
    await expect(page.locator("#dpad")).toBeVisible();
    const arm = async d => { const b = await page.locator(`#dpad .arm[data-dir="${d}"]`).boundingBox(); return { clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 }; };
    await page.locator("#dpad").dispatchEvent("pointerdown", { pointerId: 21, isPrimary: true, ...(await arm("d")) });
    await page.waitForTimeout(1300);
    // slide the thumb over to the right arm without lifting it
    await page.locator("#dpad").dispatchEvent("pointermove", { pointerId: 21, ...(await arm("r")) });
    await page.waitForTimeout(700);
    await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 21 })));
  } else {
    await expect(page.locator("#dpad")).toBeHidden();
    await page.keyboard.down("ArrowDown"); await page.waitForTimeout(1300); await page.keyboard.up("ArrowDown");
    await page.keyboard.down("ArrowRight"); await page.waitForTimeout(700); await page.keyboard.up("ArrowRight");
  }
  await page.waitForTimeout(150);
  const after = await bwd(page, () => ({ x: __bwd.state.dozer.x, y: __bwd.state.dozer.y, fuel: __bwd.state.fuel, dug: __bwd.state.dug }));
  expect(after.y).toBeGreaterThan(before.y + 2);   // dug down at least 2 rows
  expect(after.x).toBeGreaterThan(before.x + 0.5); // then turned and dug sideways
  expect(after.dug).toBeGreaterThanOrEqual(3);
  expect(after.fuel).toBeLessThan(before.fuel);
  note(`${isMobile ? "arrow pad (one thumb, slid from down to right)" : "arrow keys"}: dug ${after.dug} cells, down to row ${Math.round(after.y)} and across to column ${Math.round(after.x)}; fuel ${Math.round(before.fuel)} → ${Math.round(after.fuel)}`);
  await shot("tunnel");
  expect(browserErrors).toEqual([]);
});

test("a weird find pops out with a TA-DA and a joke, and goes into the Weird Museum", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 1);
  await bwd(page, () => __bwd.bot(true, 2, true)); // the robot driver, but it stops for each reveal like a player
  await expect(page.locator("#reveal-screen")).toBeVisible({ timeout: 30_000 });
  const name = await page.locator("#reveal-name").textContent();
  expect(["Rubber Duck", "Giant Sock", "Toaster"]).toContain(name);
  await expect(page.locator("#reveal-joke")).not.toBeEmpty();
  await expect(page.locator("#reveal-new")).toBeVisible();
  const museum = await bwd(page, () => __bwd.museum);
  expect(museum.length).toBe(1);
  await page.waitForTimeout(600); // let it finish popping out
  await shot("reveal");
  await page.locator("#reveal-btn").click();
  await expect(page.locator("#reveal-screen")).toBeHidden();
  expect(await bwd(page, () => __bwd.mode)).toBe("play");
  note(`found the ${name} (“${await page.locator("#reveal-joke").textContent()}”); museum now holds ${museum.join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("a boulder wobbles and falls when you dig out the dirt under it, and the blade shoves a mole back", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 1);
  // Stop the clock and restart the level with the moles' dice fixed, then step the real game loop
  // by hand (1/60 s a tick) while holding the real keys, so a slow frame can't change what happens.
  await bwd(page, () => { __bwd.freeze(true); __bwd.start(1, 183); });
  // Step one tick at a time until something is true; returns how many ticks it took, or -1 if it never was.
  const ticksUntil = (what, arg, max = 300) => bwd(page, ([what, arg, max]) => {
    const done = { wobble: s => s.boulders[arg].state === "wobble", past: s => s.dozer.x >= arg, gone: s => s.boulders[arg].gone }[what];
    for (let n = 0; n <= max; n++) { if (done(__bwd.state)) return n; __bwd.step(1); }
    return -1;
  }, [what, arg, max]);
  // Put the bulldozer in a freshly dug spot right under a boulder, then drive away from it.
  const b = await bwd(page, () => {
    const s = __bwd.state, b = s.boulders.find(b => b.c > 0 && b.c < BWD.COLS - 1 && s.grid[(b.r + 2) * BWD.COLS + b.c] !== BWD.OPEN);
    s.grid[(b.r + 1) * BWD.COLS + b.c] = BWD.OPEN;
    s.dozer.x = b.c; s.dozer.y = b.r + 1;
    return { c: b.c, r: b.r, i: s.boulders.indexOf(b) };
  });
  await bwd(page, () => __bwd.step(60)); // a whole second with the bulldozer parked under it
  expect(await bwd(page, i => __bwd.state.boulders[i].state, b.i)).toBe("rest"); // the bulldozer is holding it up
  await page.keyboard.down("ArrowRight");
  const toWobble = await ticksUntil("wobble", b.i);
  expect(toWobble).toBeGreaterThan(0);
  const toNext = await ticksUntil("past", b.c + 1); // keep driving into the next column, out from under it
  expect(toNext).toBeGreaterThanOrEqual(0);
  await page.keyboard.up("ArrowRight");
  const toGone = await ticksUntil("gone", b.i);
  expect(toGone).toBeGreaterThanOrEqual(0);
  const fell = await bwd(page, i => ({ fallen: __bwd.state.boulders[i].fallen, bonks: __bwd.state.bonks }), b.i);
  expect(fell.fallen).toBeGreaterThanOrEqual(1); // it fell at least a row and broke, KRUNCH
  expect(fell.bonks).toBe(0);                     // and nothing landed on the bulldozer
  // Now a mole: park at the end of its tunnel with the mole right in front, facing it, and push the blade.
  const m = await bwd(page, () => {
    const s = __bwd.state, m = s.moles[0], r = Math.round(m.y), open = c => s.grid[r * BWD.COLS + c] === BWD.OPEN;
    let end = Math.round(m.x); while (open(end - 1)) end--; // the left end of the mole's tunnel
    s.dozer.x = end; s.dozer.y = r; s.dozer.dir = "r"; s.dozer.face = 1;
    m.x = end + 1; m.y = r; m.giggle = 3; m.dizzy = 0; m.knock = 0; s.dozer.invuln = 3; // the mole holds still
    return { x: end + 1, room: open(end + 2) };
  });
  expect(m.room).toBe(true); // tunnel left to shove it along
  await page.keyboard.press("Space");
  await bwd(page, () => __bwd.step(1));
  expect(await bwd(page, () => __bwd.state.moles[0].dizzy > 0)).toBe(true);
  await bwd(page, () => __bwd.step(24)); // 0.4 s for the shove to play out
  const mx = await bwd(page, () => __bwd.state.moles[0].x);
  expect(await bwd(page, () => __bwd.state.moles[0].dizzy > 0)).toBe(true);
  expect(mx).toBeGreaterThan(m.x + 0.5); // pushed along its tunnel, away from the blade
  await shot("boulder-and-mole");
  note(`boulder at column ${b.c}, row ${b.r} stayed put while the bulldozer held it up, wobbled ${(toWobble / 60).toFixed(2)}s after it drove off, then fell and went KRUNCH ${((toNext + toGone) / 60).toFixed(2)}s later; the blade shoved the mole from column ${m.x} to ${mx.toFixed(1)} and left it dizzy`);
  expect(browserErrors).toEqual([]);
});

test("every one of the 8 levels can be beaten in the real game", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(300_000);
  await startLevel(page, 1);
  const results = [];
  for (let n = 1; n <= 8; n++) {
    // The robot driver from bot.js plays through the real game loop, sped up.
    await bwd(page, n => { __bwd.start(n); __bwd.bot(true, 8); }, n);
    await expect.poll(() => bwd(page, () => __bwd.mode), { timeout: 90_000 }).toMatch(/done|empty/);
    const r = await bwd(page, () => ({ mode: __bwd.mode, fuel: Math.round(__bwd.state.fuel), t: Math.round(__bwd.state.t), start: __bwd.state.L.fuel }));
    expect(r.mode, `level ${n}`).toBe("done");
    results.push(`${n}: ${r.t}s, fuel ${r.start} → ${r.fuel}`);
  }
  await page.locator("#next-btn").click();
  await expect(page.locator("#end-screen")).toBeVisible();
  await expect(page.locator("#end-count")).toHaveText("30 of 30 weird things in the museum");
  note("won every level (game seconds, starting fuel → fuel left): " + results.join("; "));
  await shot("all-levels");
  expect(browserErrors).toEqual([]);
});

test("the game pauses, Restart starts the level over, and running out of fuel offers a retry", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 2);
  await page.keyboard.down("ArrowDown"); await page.waitForTimeout(700); await page.keyboard.up("ArrowDown");
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  const frozen = await bwd(page, () => __bwd.state.t);
  await page.waitForTimeout(300);
  expect(await bwd(page, () => __bwd.state.t)).toBe(frozen);
  await shot("paused");
  await page.locator("#restart-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  const fresh = await bwd(page, () => ({ t: __bwd.state.t, y: __bwd.state.dozer.y, mode: __bwd.mode }));
  expect(fresh.mode).toBe("play");
  expect(fresh.t).toBeLessThan(frozen);
  expect(fresh.y).toBe(0);
  await bwd(page, () => { __bwd.state.fuel = 0.4; });
  await expect(page.locator("#empty-screen")).toBeVisible({ timeout: 5000 });
  await page.locator("#empty-retry-btn").click();
  await expect(page.locator("#fuel-label")).toHaveText("FUEL 85");
  note(`paused at ${frozen.toFixed(2)}s and the clock stayed put; Restart put the bulldozer back on top with a fresh clock; an empty tank showed “Out of fuel!” and Try again refilled it`);
  expect(browserErrors).toEqual([]);
});

test("finds and progress are saved only under gameon.big-weird-dig., and the museum shows them after a reload", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 1);
  await bwd(page, () => __bwd.bot(true, 8));
  await expect(page.locator("#done-screen")).toBeVisible({ timeout: 60_000 });
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.big-weird-dig.")).toBe(true);
  await page.locator("#museum-btn").click();
  await expect(page.locator("#museum-count")).toHaveText("3 of 30 weird things dug up");
  await page.locator(".slot").first().click();
  await expect(page.locator("#museum-caption")).toContainText("Rubber Duck");
  await page.locator("#museum-back").click();
  await page.locator("#levels-btn").click();
  await expect(page.locator(".lvl").nth(1)).toBeEnabled();
  await expect(page.locator(".lvl").nth(2)).toBeDisabled();
  await page.locator("#levels-back").click();
  await page.locator("#museum-btn").click();
  await page.locator(".slot").first().click();
  note(`keys: ${keys.join(", ")}; after a reload the museum shelf has the duck, sock and toaster, and level 2 is unlocked`);
  await shot("museum");
  expect(browserErrors).toEqual([]);
});

test("the game still plays when the browser blocks saving", async ({ page, note, browserErrors }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("storage blocked"); } });
  });
  await startLevel(page, 1);
  await page.keyboard.down("ArrowDown"); await page.waitForTimeout(500); await page.keyboard.up("ArrowDown");
  expect(await bwd(page, () => __bwd.state.dug)).toBeGreaterThan(0);
  note("with localStorage throwing, the title screen opened and level 1 played");
  expect(browserErrors).toEqual([]);
});

// The card is found by its slug, not its place on the shelf: newer games and Editor's Choice picks move it (#194).
test("Big Weird Dig has a card in the arcade and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#big-weird-dig"]');
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("Big Weird Dig");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Big Weird Dig");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/big-weird-dig");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".title-big")).toHaveText("WEIRD");
  await frame.locator("#play-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  note(`card on the shelf with its 800x450 cover; plays inside the frame; GitHub button opens its folder`);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
