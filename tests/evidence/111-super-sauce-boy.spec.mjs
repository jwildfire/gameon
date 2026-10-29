// Evidence for game idea #111, Super Sauce Boy ("Super sauce boy. It's kinda like super meat boy, but with hot sauce.").
// Run: npm run evidence -- 111-super-sauce-boy
import { readFileSync } from "node:fs";
import { test, expect } from "./evidence.mjs";

const GAME = "games/super-sauce-boy/";
// Winning runs found by games/super-sauce-boy/tools/solve.mjs, using the game's own engine.
const solutions = JSON.parse(readFileSync(new URL("../../games/super-sauce-boy/tools/solutions.json", import.meta.url), "utf8"));
const ssb = (page, expr, arg) => page.evaluate(expr, arg);

// Some checks play through levels in real time; give them room on a busy CI machine.
test.describe.configure({ timeout: 60_000 });

async function startLevel(page, n) {
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
  await page.locator("#play-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  if (n !== 1) await ssb(page, n => __ssb.start(n), n);
  await expect(page.locator("#hud-level")).toContainText(`${n}.`);
}

test("the title screen opens and level 1 starts, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(GAME);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Sauce Boy");
  await expect(page.locator("#title-screen .muted")).toContainText("Designed by NotClay");
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#hud-level")).toHaveText("1. First Drip");
  await expect(page.locator("#hud-splats")).toHaveText("💥 0");
  expect(await ssb(page, () => __ssb.mode)).toBe("play");
  expect(await ssb(page, () => __ssb.levelCount)).toBe(12);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note("12 levels, HUD shows level, timer and splats; no requests outside the site; no sideways scrolling");
  await shot("playing");
  expect(browserErrors).toEqual([]);
});

test("Sauce Boy runs and jumps with the real controls: the keyboard on a laptop, the touch buttons on a phone", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startLevel(page, 1);
  const x0 = await ssb(page, () => __ssb.player.x);
  let topY = 999;
  if (isMobile) {
    await expect(page.locator("#pad")).toBeVisible();
    const right = await page.locator("#btn-right").boundingBox(), jump = await page.locator("#btn-jump").boundingBox();
    await page.locator("#btn-right").dispatchEvent("pointerdown", { pointerId: 11, isPrimary: true, clientX: right.x + 20, clientY: right.y + 20 });
    await page.waitForTimeout(450);
    await page.locator("#btn-jump").dispatchEvent("pointerdown", { pointerId: 12, clientX: jump.x + 20, clientY: jump.y + 20 });
    for (let i = 0; i < 6; i++) { topY = Math.min(topY, await ssb(page, () => __ssb.player.y)); await page.waitForTimeout(40); }
    await shot("controls");
    await page.evaluate(() => { for (const id of [11, 12]) window.dispatchEvent(new PointerEvent("pointerup", { pointerId: id })); });
  } else {
    await expect(page.locator("#pad")).toBeHidden();
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(450);
    await page.keyboard.down("Space");
    for (let i = 0; i < 6; i++) { topY = Math.min(topY, await ssb(page, () => __ssb.player.y)); await page.waitForTimeout(40); }
    await shot("controls");
    await page.keyboard.up("Space"); await page.keyboard.up("ArrowRight");
  }
  const x1 = await ssb(page, () => __ssb.player.x);
  expect(x1).toBeGreaterThan(x0 + 100);
  expect(topY).toBeLessThan(430);  // standing height is 460
  note(`${isMobile ? "touch buttons" : "keyboard"}: ran from x ${Math.round(x0)} to ${Math.round(x1)} and jumped up to y ${Math.round(topY)}; sauce trail on the floor`);
  expect(browserErrors).toEqual([]);
});

test("level 1 can be beaten by holding right and pressing jump in real time", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 1);
  await page.keyboard.down("ArrowRight");
  // A person's rule, checked every 30 ms: when you're on the ground and there's a hole or a
  // step just ahead, press jump and hold it a moment.
  const lookAhead = () => {
    const p = __ssb.player, E = SSBEngine, L = SSB_LEVELS[0];
    const c = Math.floor((p.x + 20 + 22) / E.T), feet = Math.floor((p.y + 19) / E.T);
    const at = (c, r) => !!E.SOLID[(L.map[r] || "")[c]];
    return { grounded: p.grounded, jump: p.grounded && (at(c, feet) || !at(c, feet + 1)) };
  };
  let jumps = 0, dir = "ArrowRight";
  for (let i = 0; i < 200 && !(await ssb(page, () => __ssb.won)); i++) {
    // overshot the nachos? walk back to them, like a person would
    const want = (await ssb(page, () => __ssb.player.x)) > 27 * 30 + 10 ? "ArrowLeft" : "ArrowRight";
    if (want !== dir) { await page.keyboard.up(dir); await page.keyboard.down(want); dir = want; }
    if (dir === "ArrowRight" && (await page.evaluate(lookAhead)).jump) {
      await page.keyboard.down("Space"); await page.waitForTimeout(200); await page.keyboard.up("Space"); jumps++;
    }
    await page.waitForTimeout(30);
  }
  await page.keyboard.up(dir);
  expect(await ssb(page, () => __ssb.won)).toBe(true);
  await expect(page.locator("#done-screen")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#done-best-line")).toContainText("New best time!");
  const t = await page.locator("#done-time").textContent();
  note(`nachos sauced in ${t} with ${jumps} jumps and ${await ssb(page, () => __ssb.splats)} splats`);
  await shot("level-done");
  expect(browserErrors).toEqual([]);
});

test("every one of the 12 levels can be beaten in the real game", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 1);
  const times = [];
  for (let n = 1; n <= 12; n++) {
    const s = solutions[n];
    expect(s, `a winning run for level ${n}`).toBeTruthy();
    await ssb(page, n => __ssb.start(n), n);
    if (n === 6) {
      // stop partway up the chimney for a picture of a wall-jump
      const mid = await ssb(page, s => __ssb.play(s.inputs, s.step, Math.floor(s.inputs.length * 0.45)), s);
      expect(mid.dead).toBe(null);
      await ssb(page, () => { __ssb.freeze(true); document.getElementById("tip").classList.add("fade"); });
      await page.waitForTimeout(450);
      expect(await ssb(page, () => __ssb.splats)).toBe(0);
      await shot("wall-jump");
    }
    const res = await ssb(page, s => __ssb.play(s.inputs, s.step), s);
    expect(res.won, `level ${n} ${s.name}`).toBe(true);
    times.push(`${n} ${s.name} ${res.t}s`);
  }
  await expect(page.locator("#done-screen")).toBeVisible();
  await page.locator("#next-btn").click();
  await expect(page.locator("#end-screen")).toBeVisible();
  note("won: " + times.join(", "));
  await shot("all-levels");
  expect(browserErrors).toEqual([]);
});

test("running into a fork splats Sauce Boy and he pops straight back at the start", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 3);
  const start = await ssb(page, () => __ssb.player);
  await page.keyboard.down("ArrowRight");
  for (let i = 0; i < 200 && (await ssb(page, () => __ssb.splats)) === 0; i++) await page.waitForTimeout(15);
  await page.keyboard.up("ArrowRight");
  const splats = await ssb(page, () => __ssb.splats);
  expect(splats).toBeGreaterThanOrEqual(1); // a slow machine might let him run into it twice
  await page.waitForTimeout(120);
  await shot("splat");
  await expect(page.locator("#hud-splats")).toHaveText(/💥 [1-9]/);
  await expect.poll(async () => {
    const p = await ssb(page, () => ({ dead: __ssb.dead, x: __ssb.player.x }));
    return p.dead === null && Math.abs(p.x - start.x) < 2;
  }, { timeout: 3000 }).toBe(true);
  note(`SPLAT! counter at ${splats}, then back at the start (x ${Math.round(start.x)}) about a third of a second later`);
  expect(browserErrors).toEqual([]);
});

test("the game pauses, and Restart starts the level over", async ({ page, shot, note, browserErrors }) => {
  await startLevel(page, 2);
  const start = await ssb(page, () => __ssb.player.x);
  await page.keyboard.down("ArrowRight"); await page.waitForTimeout(600); await page.keyboard.up("ArrowRight");
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  const frozen = await ssb(page, () => __ssb.time);
  await page.waitForTimeout(300);
  expect(await ssb(page, () => __ssb.time)).toBe(frozen);
  await shot("paused");
  await page.locator("#restart-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  const after = await ssb(page, () => ({ t: __ssb.time, x: __ssb.player.x, mode: __ssb.mode }));
  expect(after.mode).toBe("play");
  expect(after.t).toBeLessThan(frozen);
  expect(Math.abs(after.x - start)).toBeLessThan(1);
  note(`paused at ${frozen.toFixed(2)}s and the clock stayed put; Restart put Sauce Boy back at the start with a fresh clock`);
  expect(browserErrors).toEqual([]);
});

test("best times are saved, only under gameon.super-sauce-boy.", async ({ page, note }) => {
  await startLevel(page, 1);
  const res = await ssb(page, s => __ssb.play(s.inputs, s.step), solutions[1]);
  expect(res.won).toBe(true);
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.super-sauce-boy.")).toBe(true);
  await page.locator("#levels-btn").click();
  await expect(page.locator(".lvl").first()).toContainText(String(res.t.toFixed(2)));
  await expect(page.locator(".lvl").nth(1)).toBeEnabled();
  await expect(page.locator(".lvl").nth(2)).toBeDisabled();
  note(`keys: ${keys.join(", ")}; level 1 best ${res.t}s still there after a reload`);
});

// The card is found by its slug, not its place on the shelf: newer games and Editor's Choice picks move it (#194).
test("Super Sauce Boy has a card in the arcade and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#super-sauce-boy"]');
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("Super Sauce Boy");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Super Sauce Boy");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/super-sauce-boy");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".title-big")).toHaveText("Sauce Boy");
  await frame.locator("#play-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  note("card on the shelf with its 800x450 cover; plays inside the frame; GitHub button opens its folder");
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
