// Evidence for game idea #217: Big Weird Dig jeremy.v2, Jeremy's phone-and-keyboard pass (the phone bar from #187:
// 48 x 48 buttons 8 px clear of each other and the edges at 375 px, WASD as well as the arrows, and Enter or Space
// pressing the main button on each screen). The creator's update, started from jeremy.v1 at games/big-weird-dig/,
// and the new default. Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/217-big-weird-dig-jeremy-v2
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "big-weird-dig";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const bwd = (page, expr, arg) => page.evaluate(expr, arg);
const mode = page => bwd(page, () => __bwd.mode);

test.describe.configure({ timeout: 120_000 });

const box = (page, sel) => page.locator(sel).evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: innerWidth - r.right }; });
// a real tap on the phone (page.touchscreen), a click on the laptop
async function press(page, isMobile, sel) {
  if (!isMobile) return page.locator(sel).click();
  const b = await box(page, sel);
  await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2);
}
// The d-pad is one control that reads where the thumb is on it, so its hit box is the whole pad.
const dpad = async page => (await page.locator("#dpad").isVisible()) ? [{ name: "d-pad", ...(await box(page, "#dpad")) }] : [];
// Hold the d-pad's down arm with a finger (pointer events, as the game reads them).
async function holdDpad(page, dir, ms) {
  const b = await page.locator(`#dpad .arm[data-dir="${dir}"]`).boundingBox();
  await page.locator("#dpad").dispatchEvent("pointerdown", { pointerId: 31, isPrimary: true, pointerType: "touch", clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 });
  await page.waitForTimeout(ms);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 31 })));
}
async function title(page) {
  await page.goto(V2);
  await expect(page.locator("#play-btn")).toBeVisible();
  await page.waitForTimeout(500); // Enter and Space wait a moment after a screen opens
}
// clear level 1: every find counts as dug up, and the game finishes the level itself
async function clearLevel(page) {
  await bwd(page, () => __bwd.state.finds.forEach(f => { f.got = true; }));
  await expect(page.locator("#done-screen")).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(500);
}

test("jeremy.v2 opens to its title screen and starts level 1, with nothing loaded from the internet", async ({ page, isMobile, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(V2);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("WEIRD");
  await expect(page.locator("#title-screen .muted")).toContainText("Designed by Jeremy");
  await page.waitForTimeout(600); // the robot digs behind the menu
  await shot("title");
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#hud-level")).toHaveText("1. Backyard Topsoil · 10 ft");
  await expect(page.locator("#fuel-label")).toHaveText(/^FUEL (100|9\d)$/); // a full tank, less what the first moments used
  expect(await mode(page)).toBe("play");
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`${isMobile ? "tapped" : "clicked"} Dig! and level 1 started; no requests outside the site; no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("every button meets the phone bar: Pause is 48 x 48 and 8 px from the edges, and Sound, Back, Levels and Title screen are 48 px tall", async ({ page, isMobile, shot, note, browserErrors }) => {
  const lines = [];
  const measure = async (screen, drawn = []) => {
    const { targets, problems } = await touchTargets(page, { drawn });
    expect(problems, `${screen}: ${problems.join("; ")}`).toEqual([]);
    expect(targets.length).toBeGreaterThan(0);
    lines.push(`${screen}: ${targets.length} (smallest side ${Math.min(...targets.map(t => Math.min(t.w, t.h)))} px)`);
  };
  const tall = async sels => { const out = []; for (const s of sels) { const b = await box(page, s); expect(b.h).toBeGreaterThanOrEqual(48); expect(b.w).toBeGreaterThanOrEqual(48); out.push(`${s} ${Math.round(b.w)}x${Math.round(b.h)}`); } return out; };
  const sizes = [];
  // title: Dig!, Levels, Weird Museum, Sound
  await title(page);
  sizes.push(...await tall(["#play-btn", "#levels-btn", "#museum-btn", "#sound-btn"]));
  await measure("title");
  // Sound works by touch: off, then on again
  await press(page, isMobile, "#sound-btn");
  await expect(page.locator("#sound-btn")).toHaveText("Sound: off");
  await press(page, isMobile, "#sound-btn");
  await expect(page.locator("#sound-btn")).toHaveText("Sound: on");
  // the level picker and its Back button
  await press(page, isMobile, "#levels-btn");
  await expect(page.locator("#levels-screen")).toBeVisible();
  sizes.push(...await tall(["#levels-back"]));
  await measure("levels");
  await press(page, isMobile, "#levels-back");
  // the museum shelf and its Back button
  await press(page, isMobile, "#museum-btn");
  await expect(page.locator("#museum-screen")).toBeVisible();
  sizes.push(...await tall(["#museum-back", ".slot >> nth=0"]));
  await measure("museum");
  await press(page, isMobile, ".slot >> nth=0");
  await expect(page.locator("#museum-caption")).toContainText("Still buried somewhere in level 1.");
  await shot("museum");
  await press(page, isMobile, "#museum-back");
  // in play: Pause (and on a phone the d-pad and PUSH)
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#hud")).toBeVisible();
  const pa = await box(page, "#pause-btn");
  expect([pa.w, pa.h]).toEqual([48, 48]);
  expect(pa.y).toBeGreaterThanOrEqual(8);
  expect(pa.right).toBeGreaterThanOrEqual(8);
  if (isMobile) {
    await expect(page.locator("#dpad")).toBeVisible();
    const y0 = await bwd(page, () => __bwd.state.dozer.y);
    await holdDpad(page, "d", 900);
    expect(await bwd(page, () => __bwd.state.dozer.y)).toBeGreaterThan(y0 + 1);
  }
  await measure("playing", await dpad(page));
  await shot("playing");
  // Pause, by touch, stops the game; its screen has Keep digging, Restart level, Levels, Title screen and Sound
  await press(page, isMobile, "#pause-btn");
  await expect(page.locator("#pause-screen")).toBeVisible();
  expect(await mode(page)).toBe("paused");
  sizes.push(...await tall(["#resume-btn", "#restart-btn", "#pause-levels-btn", "#pause-title-btn", "#pause-sound-btn"]));
  await measure("paused");
  await shot("paused");
  await press(page, isMobile, "#resume-btn");
  await expect(page.locator("#pause-screen")).toBeHidden();
  expect(await mode(page)).toBe("play");
  // level done: Dig deeper, Play again, Weird Museum, Levels
  await clearLevel(page);
  sizes.push(...await tall(["#next-btn", "#retry-btn", "#done-museum-btn", "#done-levels-btn"]));
  await measure("level done");
  await shot("done");
  // out of fuel: Try again, Levels
  await press(page, isMobile, "#next-btn");
  await expect(page.locator("#hud-level")).toContainText("2.");
  await bwd(page, () => { __bwd.state.fuel = 0.4; });
  await expect(page.locator("#empty-screen")).toBeVisible({ timeout: 15_000 });
  sizes.push(...await tall(["#empty-retry-btn", "#empty-levels-btn"]));
  await measure("out of fuel");
  note(`Pause ${pa.w}x${pa.h}, ${Math.round(pa.right)} px from the right edge and ${Math.round(pa.y)} px from the top. ${sizes.join(", ")}. touchTargets() found no problems: ${lines.join("; ")}. Sound, Levels, Back, a museum slot, Dig!, Pause, Keep digging and Dig deeper each did their job when ${isMobile ? "tapped" : "clicked"}${isMobile ? "; the d-pad drove the bulldozer down" : ""}`);
  expect(browserErrors).toEqual([]);
});

test("Enter and Space each press the main button on the title, pause, level-done and out-of-fuel screens", async ({ page, shot, note, browserErrors }) => {
  const log = [];
  for (const key of ["Enter", " "]) {
    const name = key === " " ? "Space" : key;
    // title: Dig! (from a fresh save, so Dig! starts at level 1)
    await page.goto(V2);
    await page.evaluate(() => localStorage.clear());
    await title(page);
    await page.keyboard.press(key);
    await expect(page.locator("#hud")).toBeVisible();
    expect(await mode(page)).toBe("play");
    await expect(page.locator("#hud-level")).toContainText("1.");
    // pause: Keep digging
    await page.keyboard.press("p");
    await expect(page.locator("#pause-screen")).toBeVisible();
    await page.waitForTimeout(500);
    const t0 = await bwd(page, () => __bwd.state.t);
    await page.keyboard.press(key);
    await expect(page.locator("#pause-screen")).toBeHidden();
    expect(await mode(page)).toBe("play");
    await page.waitForTimeout(200);
    expect(await bwd(page, () => __bwd.state.t)).toBeGreaterThan(t0); // the clock runs again
    // level done: Dig deeper
    await clearLevel(page);
    if (key === "Enter") await shot("enter-done");
    await page.keyboard.press(key);
    await expect(page.locator("#done-screen")).toBeHidden();
    await expect(page.locator("#hud-level")).toContainText("2.");
    // out of fuel: Try again
    await bwd(page, () => { __bwd.state.fuel = 0.4; });
    await expect(page.locator("#empty-screen")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await page.keyboard.press(key);
    await expect(page.locator("#empty-screen")).toBeHidden();
    await expect(page.locator("#fuel-label")).not.toHaveText("FUEL 0");
    expect(await mode(page)).toBe("play");
    log.push(`${name}: title → level 1, pause → playing, level done → level 2, out of fuel → level 2 again with a full tank`);
  }
  // A button the player has tabbed to wins over the main one: Tab to Restart level and press Enter.
  await page.keyboard.down("ArrowDown"); await page.waitForTimeout(600); await page.keyboard.up("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-screen")).toBeVisible();
  const before = await bwd(page, () => __bwd.state.t);
  await page.locator("#restart-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#pause-screen")).toBeHidden();
  expect(await bwd(page, () => __bwd.state.t)).toBeLessThan(before);
  expect(await bwd(page, () => __bwd.state.dozer.y)).toBe(0);
  // and a blade press (Space) the moment a level ends doesn't skip its screen
  await bwd(page, async () => {
    __bwd.state.finds.forEach(f => { f.got = true; });
    while (__bwd.mode !== "done") await new Promise(r => requestAnimationFrame(r));
    dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
  });
  await page.waitForTimeout(150);
  await expect(page.locator("#done-screen")).toBeVisible();
  expect(await mode(page)).toBe("done");
  log.push("with Restart level focused, Enter restarted the level instead; a Space pressed as the done screen opened left it open");
  note(log.join(". "));
  expect(browserErrors).toEqual([]);
});

test("WASD and the arrow keys both drive the bulldozer the same way, and P pauses", async ({ page, shot, note, browserErrors }) => {
  await title(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("#hud")).toBeVisible();
  const at = () => bwd(page, () => (d => ({ x: d.x, y: d.y, dir: d.dir }))(__bwd.state.dozer));
  const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(150); };
  const fmt = p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  const got = [];
  // Each key starts from the same spot: a fresh level 1 (same seed), dug 2 or 3 rows down from column 2,
  // so no key starts against a wall or the surface.
  for (const [key, dx, dy] of [["s", 0, 1], ["ArrowDown", 0, 1], ["d", 1, 0], ["ArrowRight", 1, 0], ["a", -1, 0], ["ArrowLeft", -1, 0], ["w", 0, -1], ["ArrowUp", 0, -1]]) {
    await bwd(page, () => __bwd.start(1, 217));
    await hold("ArrowDown", 600);
    const a = await at();
    expect(a.x).toBe(2);
    expect(a.y).toBeGreaterThan(1);
    await hold(key, 400);
    const b = await at();
    if (dx) expect(Math.sign(b.x - a.x), `${key} moved the bulldozer sideways`).toBe(dx);
    if (dy) expect(Math.sign(b.y - a.y), `${key} moved the bulldozer up or down`).toBe(dy);
    got.push(`${key}: ${fmt(a)} → ${fmt(b)}`);
  }
  await shot("keys");
  await page.keyboard.press("P");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.keyboard.press("P");
  await expect(page.locator("#pause-screen")).toBeHidden();
  note(`from the same spot each time (x, y): ${got.join("; ")}. P paused and P again carried on`);
  expect(browserErrors).toEqual([]);
});

// The idea says to keep everything else the same: Pause's extra room mustn't come out of the level's name.
test("the HUD's level name has at least jeremy.v1's room on every level at 375 and 320 px, with fuel, finds and the board no smaller", async ({ page, shot, note, browserErrors }) => {
  const measure = async (url, w, h) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(url);
    await expect(page.locator("#play-btn")).toBeVisible();
    const out = [];
    for (let n = 1; n <= 8; n++) {
      out.push(await bwd(page, n => {
        __bwd.start(n);
        const r = id => document.getElementById(id).getBoundingClientRect(), l = document.getElementById("hud-level");
        return { w: l.clientWidth, cut: l.scrollWidth > l.clientWidth, text: l.textContent, fuel: Math.round(r("fuel").width), finds: Math.round(r("hud-finds").width), board: [Math.round(r("stage").width), Math.round(r("stage").height)] };
      }, n));
    }
    return out;
  };
  const lines = [];
  for (const [w, h] of [[375, 812], [320, 640]]) {
    const v1 = await measure(V1, w, h), v2 = await measure(V2, w, h);
    for (let i = 0; i < 8; i++) {
      expect(v2[i].w, `level ${i + 1} at ${w} px`).toBeGreaterThanOrEqual(v1[i].w);
      expect(v2[i].fuel).toBeGreaterThanOrEqual(v1[i].fuel);
      expect(v2[i].finds).toBeGreaterThanOrEqual(v1[i].finds);
      expect(v2[i].cut, `level ${i + 1}'s name is whole at ${w} px`).toBe(false);
    }
    expect(v2[0].board[0]).toBeGreaterThanOrEqual(v1[0].board[0]);
    expect(v2[0].board[1]).toBeGreaterThanOrEqual(v1[0].board[1]);
    lines.push(`${w} px, #hud-level v1 → v2: ${v1.map((r, i) => `${i + 1}: ${r.w}${r.cut ? " (cut)" : ""} → ${v2[i].w}${v2[i].cut ? " (cut)" : ""}`).join(", ")}; fuel ${v1[0].fuel} → ${v2[0].fuel}; board ${v1[0].board.join("x")} → ${v2[0].board.join("x")}`);
    if (w === 375) await shot("hud-375"); // level 8, the longest name
    // the two-row HUD still meets the phone bar
    const { problems } = await touchTargets(page);
    expect(problems).toEqual([]);
  }
  note(lines.join(". ") + ". Every name shows whole in v2");
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1's saves carry over: v2 shows its museum, levels and sound setting, and v1 reads back what v2 adds", async ({ page, isMobile, shot, note, browserErrors }) => {
  const V1SAVES = {
    "gameon.big-weird-dig.museum": JSON.stringify(["duck", "sock", "toaster"]),
    "gameon.big-weird-dig.progress": JSON.stringify({ unlocked: 2, stars: { 1: 3 } }),
    "gameon.big-weird-dig.sound": "false"
  };
  await page.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem("seeded", "1"); } }, V1SAVES);
  await title(page);
  await expect(page.locator("#sound-btn")).toHaveText("Sound: off");
  await press(page, isMobile, "#museum-btn");
  await expect(page.locator("#museum-count")).toHaveText("3 of 30 weird things dug up");
  await press(page, isMobile, ".slot >> nth=0");
  await expect(page.locator("#museum-caption")).toContainText("Rubber Duck");
  await shot("v1-saves");
  await press(page, isMobile, "#museum-back");
  await press(page, isMobile, "#levels-btn");
  await expect(page.locator(".lvl").nth(0)).toContainText("★★★");
  await expect(page.locator(".lvl").nth(1)).toBeEnabled();
  await expect(page.locator(".lvl").nth(2)).toBeDisabled();
  // Dig! carries on from level 2, the first one not cleared; clearing it unlocks level 3
  await press(page, isMobile, "#levels-back");
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#hud-level")).toContainText("2.");
  await clearLevel(page);
  const all = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(Object.keys(all).sort()).toEqual(Object.keys(V1SAVES).sort());
  const progress = JSON.parse(all["gameon.big-weird-dig.progress"]);
  expect(progress.unlocked).toBe(3);
  expect(progress.stars["1"]).toBe(3);
  expect(all["gameon.big-weird-dig.sound"]).toBe("false");
  // jeremy.v1 reads it
  await page.goto(V1);
  await expect(page.locator("#sound-btn")).toHaveText("Sound: off");
  await page.locator("#levels-btn").click();
  await expect(page.locator(".lvl").nth(2)).toBeEnabled();
  note(`seeded jeremy.v1's museum (duck, sock, toaster), level 2 unlocked with 3 stars on level 1, and sound off: v2 showed all three; Dig! went on at level 2, and clearing it unlocked level 3 under the same keys (${Object.keys(all).join(", ")}; nothing new); jeremy.v1 then showed level 3 unlocked and sound off`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/big-weird-dig/, unchanged", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto(V1);
  await expect(page.locator(".title-big")).toHaveText("WEIRD");
  await page.locator("#play-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  await page.keyboard.down("ArrowDown"); await page.waitForTimeout(500); await page.keyboard.up("ArrowDown");
  expect(await bwd(page, () => __bwd.state.dug)).toBeGreaterThan(0);
  const pause = await box(page, "#pause-btn");
  expect(pause.w).toBeLessThan(48); // jeremy.v1 is frozen as it was
  const v1 = games.find(g => g.slug === SLUG).versions.find(v => v.id === "jeremy.v1");
  expect(v1.url).toBe(V1);
  note(`jeremy.v1 at ${v1.url}: its title, Dig!, and the arrow keys dug a tunnel; its Pause button is still ${Math.round(pause.w)}x${Math.round(pause.h)}, as before`);
  await shot("v1-plays");
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Big Weird Dig plays jeremy.v2 by default and the picker still offers jeremy.v1", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto("./");
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.default).toBe("jeremy.v2");
  expect(entry.url).toBe(V2);
  expect(entry.versions.map(v => v.id)).toEqual(["jeremy.v1", "jeremy.v2"]);
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("2 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Bigger buttons, Enter to go");
  await expect(items.nth(1)).toContainText("jeremy.v1");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".title-big")).toHaveText("WEIRD");
  expect(await frame.locator("#play-btn").evaluate(b => b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
  if (isMobile) await frame.locator("#play-btn").tap(); else await frame.locator("#play-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  expect(await page.frameLocator("#frame").locator("#play-btn").evaluate(() => location.pathname)).toMatch(/\/games\/big-weird-dig\/$/);
  note("card (2 versions) → picker: jeremy.v2 first with its note, then jeremy.v1 → jeremy.v2 plays in the frame; #big-weird-dig@jeremy.v1 opens jeremy.v1");
  expect(browserErrors).toEqual([]);
});
