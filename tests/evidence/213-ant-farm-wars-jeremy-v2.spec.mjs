// Evidence for game idea #213: Ant Farm Wars jeremy.v2, Jeremy's phone-and-keyboard pass (the phone bar from
// #187: 48 x 48 buttons 8 px clear of each other and the edges at 375 px, WASD as well as the arrows, and a
// keyboard cursor where Enter does what a tap does). The creator's update, started from jeremy.v1 at
// games/ant-farm-wars/, and the new default. Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/213-ant-farm-wars-jeremy-v2
// The farm is seeded (__afw.seed) and most checks hold the game clock (__afw.hold / __afw.step), so every run
// sees the same farm. The keyboard cursor and the scrolling run on the page's own frame clock, so those
// checks press real keys and give the farm a moment to scroll.
import { test, expect, games } from "./evidence.mjs";

const SLUG = "ant-farm-wars";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const afw = (page, expr, arg) => page.evaluate(expr, arg);

test.describe.configure({ timeout: 120_000 });

// The phone bar (#187): every control a finger can reach is at least 48 x 48 CSS px, 8 px clear of its
// neighbours and of the screen's edges. The same measure as touchTargets() in the phone-friendly games task's
// evidence helper (#227), copied here because that helper isn't on dev yet.
const BAR = { min: 48, gap: 8, edge: 8 };
async function touchTargets(page) {
  const found = await page.evaluate(() => {
    const sel = 'button,a[href],input:not([type=hidden]),select,textarea,[role=button],[onclick],[tabindex]:not([tabindex="-1"]),summary,label';
    const els = new Set(document.querySelectorAll(sel));
    for (const el of document.querySelectorAll("body *")) if (getComputedStyle(el).cursor === "pointer") els.add(el);
    const out = [];
    for (const el of els) {
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
      let up = el.parentElement, nested = false;
      while (up) { if (els.has(up)) { nested = true; break; } up = up.parentElement; }
      if (nested) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (r.width < 1 || r.height < 1 || cs.visibility === "hidden" || +cs.opacity === 0) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || !(el === hit || el.contains(hit))) continue;
      if (r.width * r.height >= innerWidth * innerHeight / 3) continue;
      let scrolls = document.scrollingElement.scrollHeight > innerHeight + 1;
      for (let p = el.parentElement; p && !scrolls; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        scrolls = (oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight + 1;
      }
      const name = (el.getAttribute("aria-label") || el.innerText || el.value || el.id || el.tagName).trim().replace(/\s+/g, " ").slice(0, 24);
      out.push({ name, x: r.left, y: r.top, w: r.width, h: r.height, scrolls });
    }
    return { out, vw: innerWidth, vh: innerHeight };
  });
  const targets = found.out.map(t => ({ name: t.name, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h), scrolls: t.scrolls }));
  const problems = [];
  for (const t of targets) {
    if (t.w < BAR.min || t.h < BAR.min) problems.push(`"${t.name}" is ${t.w}x${t.h}`);
    const sides = [t.x, found.vw - (t.x + t.w)];
    if (!t.scrolls) sides.push(t.y, found.vh - (t.y + t.h));
    if (Math.min(...sides) < BAR.edge) problems.push(`"${t.name}" is ${Math.max(0, Math.min(...sides))} px from the edge`);
  }
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
    const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
    if (Math.max(dx, dy) < BAR.gap) problems.push(`"${a.name}" and "${b.name}" are ${Math.max(dx, dy)} px apart`);
  }
  return { targets, problems };
}
const box = (page, sel) => page.locator(sel).evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: innerWidth - r.right }; });
async function press(page, isMobile, sel) {
  if (isMobile) await page.locator(sel).tap(); else await page.locator(sel).click();
}

// Open jeremy.v2, seed the farm and start a game, picking the first card; the clock is held.
async function battle(page, seed = 6) {
  await page.goto(V2);
  await expect(page.locator("#play-btn")).toBeVisible();
  await afw(page, s => { __afw.seed(s); __afw.hold(true); __afw.start(); __afw.pick(0); __afw.step(0.2); }, seed);
  expect(await afw(page, () => __afw.mode)).toBe("battle");
  await page.waitForTimeout(150);
}
// let the farm finish scrolling after a key
const settle = page => page.waitForTimeout(700);
async function hold(page, key, ms = 350) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await settle(page); }
const cursor = page => afw(page, () => __afw.cursor);
const ox = page => afw(page, () => Math.round(__afw.view.ox));

test("jeremy.v2 opens to its title screen and starts a game, with nothing loaded from the internet", async ({ page, isMobile, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(V2);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".logo .ant")).toHaveText("Ant Farm");
  await expect(page.locator(".logo .wars")).toHaveText("Wars!");
  await expect(page.locator("#title-screen")).toContainText("Designed by Jeremy");
  await expect(page.locator("#title-screen .how")).toContainText("WASD or arrows move the cursor, Enter sends your soldiers there");
  await page.waitForTimeout(600);
  expect(await afw(page, () => __afw.state.ants.length)).toBeGreaterThan(10);
  await shot("title");
  await afw(page, () => __afw.seed(6));
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#draft")).toBeVisible();
  await expect(page.locator("#cards .pick")).toHaveCount(3);
  await press(page, isMobile, "#cards .pick >> nth=0");
  await expect(page.locator("#draft")).toBeHidden();
  await page.waitForTimeout(400);
  expect(await afw(page, () => __afw.state.t)).toBeGreaterThan(0.1);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`${isMobile ? "tapped" : "clicked"} Play and the first card, and the farm ran; no requests outside the site; no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("every button meets the phone bar: Speed, Sound and Pause are 48 x 48, 8 px apart and from the edge, and the menu buttons are 48 px tall", async ({ page, isMobile, shot, note, browserErrors }) => {
  const lines = [];
  const measure = async (screen) => {
    const { targets, problems } = await touchTargets(page);
    expect(problems, `${screen}: ${problems.join("; ")}`).toEqual([]);
    lines.push(`${screen}: ${targets.length} buttons, smallest ${Math.min(...targets.map(t => Math.min(t.w, t.h)))} px`);
    return targets;
  };
  // title
  await page.goto(V2);
  await expect(page.locator("#play-btn")).toBeVisible();
  expect((await box(page, "#play-btn")).h).toBeGreaterThanOrEqual(48);
  await measure("title");
  // the HUD: Speed, Sound and Pause
  await afw(page, () => { __afw.seed(6); __afw.hold(true); });
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#draft")).toBeVisible();
  const [sp, so, pa] = [await box(page, "#speed-btn"), await box(page, "#sound-btn"), await box(page, "#pause-btn")];
  for (const b of [sp, so, pa]) { expect(b.w).toBe(48); expect(b.h).toBe(48); expect(b.y).toBeGreaterThanOrEqual(8); }
  expect(so.x - (sp.x + sp.w)).toBe(8);
  expect(pa.x - (so.x + so.w)).toBe(8);
  expect(pa.right).toBe(8);
  await measure("picking a card");
  // a battle with all four power buttons showing
  await press(page, isMobile, "#cards .pick >> nth=0");
  await afw(page, () => { const me = __afw.state.colonies[0]; me.powers = { fire: 1, glue: 1, cave: 1, fly: 1 }; me.cd = {}; __afw.step(0.05); });
  await expect(page.locator("#powers .pw")).toHaveCount(4);
  // the HUD buttons work by touch (phone) or click: speed goes to 2x, sound off and back on
  await press(page, isMobile, "#speed-btn");
  await expect(page.locator("#speed-btn")).toHaveText("2×");
  await press(page, isMobile, "#sound-btn");
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-pressed", "false");
  await press(page, isMobile, "#sound-btn");
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-pressed", "true");
  await measure("battle (4 powers)");
  await shot("buttons-battle");
  // pause: Keep fighting, Start over, Title screen
  await press(page, isMobile, "#pause-btn");
  await expect(page.locator("#pause-screen")).toBeVisible();
  for (const sel of ["#resume-btn", "#restart-btn", "#pause-title-btn"]) expect((await box(page, sel)).h).toBeGreaterThanOrEqual(48);
  await measure("paused");
  await shot("buttons-paused");
  await press(page, isMobile, "#resume-btn");
  await expect(page.locator("#pause-screen")).toBeHidden();
  // the end screen: Play again, Title screen
  await afw(page, () => {
    const s = __afw.state, me = s.colonies[0];
    me.q.hp = 3; me.food = 0; me.hatchT = 99;
    s.ants.filter(a => a.c === 0).forEach(a => { a.hp = 0; });
    const a = s.ants.find(a => a.c === 1 && a.kind === "s");
    a.cx = me.q.x + 1; a.cy = me.q.y; a.x = a.cx; a.y = a.cy; a.nx = -1; a.cd = 0; a.hp = a.max = 200;
    __afw.step(2);
  });
  await expect(page.locator("#end-screen")).toBeVisible();
  for (const sel of ["#again-btn", "#end-title-btn"]) expect((await box(page, sel)).h).toBeGreaterThanOrEqual(48);
  await measure("game over");
  await press(page, isMobile, "#again-btn");
  await expect(page.locator("#draft-title")).toHaveText("Round 1: pick one");
  note(`Speed ${sp.w}x${sp.h}, Sound ${so.w}x${so.h}, Pause ${pa.w}x${pa.h}; gaps ${so.x - (sp.x + sp.w)} and ${pa.x - (so.x + so.w)} px; Pause ${pa.right} px from the right edge, ${pa.y} px from the top. Measured against the phone bar: ${lines.join("; ")}. Speed, Sound, Pause, Keep fighting and Play again each did their job when ${isMobile ? "tapped" : "clicked"}`);
  expect(browserErrors).toEqual([]);
});

test("WASD and the arrows both steer: in a battle they move the cursor and the farm scrolls to follow it; between rounds they scroll the farm", async ({ page, isMobile, shot, note, browserErrors }) => {
  await battle(page);
  const pannable = await afw(page, () => __afw.view.pannable);
  expect(pannable).toBe(!!isMobile); // the farm is wider than a phone; on a laptop it all fits
  expect(await cursor(page)).toBe(null);
  await page.keyboard.press("d"); // the first key shows the cursor in the middle of the screen
  const start = await cursor(page);
  expect(start).not.toBe(null);
  const log = [`first key showed the cursor at ${start.join(",")}`];
  // holding a key keeps the cursor going: hold D to the middle of the farm, where the farm has room to scroll both ways
  await hold(page, "d", 600);
  for (let i = 0; i < 20 && (await cursor(page))[0] < 20; i++) await page.keyboard.press("d");
  for (let i = 0; i < 20 && (await cursor(page))[0] > 20; i++) await page.keyboard.press("a");
  await settle(page);
  log.push(`holding D, then single presses, took it to the middle (${(await cursor(page)).join(",")})`);
  // then a press of each key moves the cursor that way, and the farm follows left and right
  const moves = [["d", 1, 0], ["ArrowRight", 1, 0], ["a", -1, 0], ["ArrowLeft", -1, 0], ["s", 0, 1], ["ArrowDown", 0, 1], ["w", 0, -1], ["ArrowUp", 0, -1]];
  for (const [key, dx, dy] of moves) {
    const c0 = await cursor(page), x0 = await ox(page);
    await page.keyboard.press(key);
    await settle(page);
    const c1 = await cursor(page), x1 = await ox(page);
    expect([Math.sign(c1[0] - c0[0]), Math.sign(c1[1] - c0[1])]).toEqual([dx, dy]); // one cell (more only if the key was held down a while)
    if (pannable && dx) expect(Math.sign(x0 - x1)).toBe(dx); // the farm moves the other way, to follow the cursor
    else expect(Math.abs(x1 - x0)).toBeLessThanOrEqual(1);
    log.push(`${key}: cursor ${c0.join(",")}→${c1.join(",")}${Math.abs(x1 - x0) > 1 ? `, farm scrolled ${x1 - x0}px` : ""}`);
  }
  // on a phone the cursor stays in the middle of the screen while the farm scrolls under it
  if (pannable) {
    const mid = await afw(page, () => { const c = __afw.cursor, p = __afw.cellCenter(c[0], c[1]); return Math.round(p[0] - innerWidth / 2); });
    expect(Math.abs(mid)).toBeLessThan(10);
  }
  await shot("cursor-follow");
  // between rounds (picking a card) WASD and the arrows scroll the farm straight, as the arrows did in jeremy.v1
  let between = "the whole farm fits, so there's nothing to scroll between rounds";
  if (pannable) {
    await afw(page, () => __afw.step(30));
    expect(await afw(page, () => __afw.mode)).toBe("draft");
    const got = [];
    for (const key of ["a", "ArrowLeft", "d", "ArrowRight"]) {
      const left = key === "a" || key === "ArrowLeft", px = await afw(page, () => __afw.panX);
      if (left && px > -120) await hold(page, "d", 300); // make room to scroll left
      if (!left && px < -180) await hold(page, "a", 300); // and right
      const x0 = await ox(page);
      await hold(page, key, 250);
      const x1 = await ox(page);
      expect(Math.sign(x1 - x0)).toBe(key === "a" || key === "ArrowLeft" ? 1 : -1);
      got.push(`${key} ${x1 - x0 > 0 ? "+" : ""}${x1 - x0}px`);
    }
    between = `picking a card, the keys scrolled the farm: ${got.join(", ")}`;
  }
  note(`${log.join("; ")}. ${between}`);
  expect(browserErrors).toEqual([]);
});

test("the keyboard cursor and Enter plant the rally flag, take it away, and send the soldiers at a rival's nest, like a tap", async ({ page, isMobile, shot, note, browserErrors }) => {
  await battle(page);
  await expect(page.locator("#tip")).toContainText("Tap a rival's nest"); // round 1's timed hint, out of the way of the tips checked below
  await page.keyboard.press("Enter"); // with no cursor yet, Enter shows it and does nothing else
  expect(await afw(page, () => __afw.state.colonies[0].rally)).toBe(null);
  // walk the cursor to cell 9,12 one key press at a time
  const goTo = async (x, y) => {
    for (let i = 0; i < 60; i++) {
      const c = await cursor(page);
      if (c[0] === x && c[1] === y) return;
      await page.keyboard.press(c[0] < x ? "d" : c[0] > x ? "ArrowLeft" : c[1] < y ? "s" : "ArrowUp");
    }
    throw new Error("the cursor didn't get there");
  };
  await goTo(9, 12);
  await settle(page);
  await page.keyboard.press("Enter");
  expect(await afw(page, () => __afw.state.colonies[0].rally)).toEqual([9, 12]);
  await expect(page.locator("#tip")).toHaveText("Soldiers: gather at the flag! Tap it again to take it away.");
  await afw(page, () => __afw.step(0.1));
  await shot("cursor-flag");
  // Enter on the flag again takes it away
  await page.keyboard.press("Enter");
  expect(await afw(page, () => __afw.state.colonies[0].rally)).toBe(null);
  await expect(page.locator("#tip")).toHaveText("Flag gone: soldiers go back to attacking.");
  // Enter on the Red Biters' nest sends the soldiers at them
  await goTo(35, 5);
  await settle(page);
  await page.keyboard.press("Enter");
  expect(await afw(page, () => __afw.state.colonies[0].target)).toBe(1);
  await expect(page.locator("#tip")).toHaveText("Attack the Red Biters!");
  // a power armed from its key fires where the cursor is
  await afw(page, () => { const me = __afw.state.colonies[0]; me.powers = { glue: 1 }; me.cd = {}; __afw.step(0.05); });
  await goTo(20, 14);
  await page.keyboard.press("1");
  const glue = await afw(page, () => __afw.state.glue.map(g => [g.x, g.y]));
  expect(glue).toEqual([[20, 14]]);
  // a tap takes over from the keyboard: the cursor hides
  await settle(page);
  const at = await afw(page, () => __afw.cellCenter(9, 12));
  if (isMobile) await page.touchscreen.tap(at[0], at[1]); else await page.mouse.click(at[0], at[1]);
  expect(await cursor(page)).toBe(null);
  expect(await afw(page, () => __afw.state.colonies[0].rally)).toEqual([9, 12]);
  note("Enter with no cursor showed it; walked to 9,12 and Enter planted the flag there; Enter again took it away; walked to Red's nest (35,5) and Enter made Red the target; key 1 dropped Glue Spit at the cursor (20,14); then a tap on the farm hid the cursor and planted the flag at 9,12 as in jeremy.v1");
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1's saves carry over: v2 shows its record and sound setting, adds to the same record, and v1 reads it back", async ({ page, isMobile, shot, note, browserErrors }) => {
  const V1SAVES = { "gameon.ant-farm-wars.record": JSON.stringify({ played: 3, wins: 1, bestPlace: 1, fewestRounds: 7 }), "gameon.ant-farm-wars.sound": "false" };
  await page.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem("seeded", "1"); } }, V1SAVES);
  await page.goto(V2);
  await expect(page.locator("#title-best")).toHaveText("Best: won in 7 rounds · 1 win in 3 battles");
  await shot("v1-saves");
  // the sound stays off in a game, and a lost game counts in the record, keeps the best, and saves nothing new
  await afw(page, () => { __afw.seed(6); __afw.hold(true); __afw.start(); __afw.pick(0); });
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-pressed", "false");
  await afw(page, () => {
    const s = __afw.state, me = s.colonies[0];
    me.q.hp = 3; me.food = 0; me.hatchT = 99;
    s.ants.filter(a => a.c === 0).forEach(a => { a.hp = 0; });
    const a = s.ants.find(a => a.c === 1 && a.kind === "s");
    a.cx = me.q.x + 1; a.cy = me.q.y; a.x = a.cx; a.y = a.cy; a.nx = -1; a.cd = 0; a.hp = a.max = 200;
    __afw.step(2);
  });
  await expect(page.locator("#end-screen")).toBeVisible();
  await expect(page.locator("#end-best")).toHaveText("Best: won in 7 rounds · 1 win in 4 battles");
  const all = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(Object.keys(all).sort()).toEqual(Object.keys(V1SAVES).sort());
  expect(JSON.parse(all["gameon.ant-farm-wars.record"])).toEqual({ played: 4, wins: 1, bestPlace: 1, fewestRounds: 7 });
  expect(all["gameon.ant-farm-wars.sound"]).toBe("false");
  // and jeremy.v1 reads what v2 wrote
  await page.goto(V1);
  await expect(page.locator("#title-best")).toHaveText("Best: won in 7 rounds · 1 win in 4 battles");
  note(`seeded jeremy.v1's record (3 battles, 1 win in 7 rounds) and sound off: v2's title showed the record and its Sound button was off in the game; after a lost game the record said 4 battles with the best kept; the only keys are ${Object.keys(all).join(", ")} (no new ones); jeremy.v1 then showed the same record`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/ant-farm-wars/, unchanged", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto(V1);
  await expect(page.locator(".logo .wars")).toHaveText("Wars!");
  await expect(page.locator("#title-screen .how")).not.toContainText("WASD");
  await afw(page, () => __afw.seed(6));
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#draft")).toBeVisible();
  await press(page, isMobile, "#cards .pick >> nth=0");
  await expect(page.locator("#hud")).toBeVisible();
  await page.waitForTimeout(400);
  expect(await afw(page, () => __afw.state.t)).toBeGreaterThan(0.1);
  const pause = await box(page, "#pause-btn");
  const v1 = games.find(g => g.slug === SLUG).versions.find(v => v.id === "jeremy.v1");
  expect(v1.url).toBe(V1);
  note(`jeremy.v1 at ${v1.url}: its own title (no WASD line), Play, a card, and the farm ran; its Pause button is still ${Math.round(pause.w)}x${Math.round(pause.h)}, as before`);
  await shot("v1-plays");
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Ant Farm Wars plays jeremy.v2 by default and the picker still offers jeremy.v1", async ({ page, isMobile, shot, note, browserErrors }) => {
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
  await expect(items.nth(0)).toContainText("Play it with keys, and bigger buttons");
  await expect(items.nth(1)).toContainText("jeremy.v1");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#title-screen .how")).toContainText("WASD");
  if (isMobile) await frame.locator("#play-btn").tap(); else await frame.locator("#play-btn").click();
  await expect(frame.locator("#draft")).toBeVisible();
  await frame.locator("#cards .pick").nth(0).click();
  await expect(frame.locator("#hud")).toBeVisible();
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  await expect(page.frameLocator("#frame").locator("#title-screen .how")).not.toContainText("WASD");
  note("card (2 versions) → picker: jeremy.v2 first with its note, then jeremy.v1 → jeremy.v2 plays in the frame; #ant-farm-wars@jeremy.v1 opens jeremy.v1");
  expect(browserErrors).toEqual([]);
});
