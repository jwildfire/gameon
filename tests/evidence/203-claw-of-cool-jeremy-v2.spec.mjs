// Evidence for game idea #203: Claw of Cool jeremy.v2, Jeremy's update (zoom way in once a coin goes in, a few
// zoomed views, more levels: themed machines with odd-shaped prizes, no balls). The creator's update, started from
// jeremy.v1, and the new default. Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/203-claw-of-cool-jeremy-v2
// Deterministic: the game clock is held and stepped by hand (__claw.hold / __claw.step / __claw.clock) and the
// random numbers are seeded (__claw.seed), so every run fills the machines and ends every grab the same way.
// No real-time waits.
import { test, expect, games } from "./evidence.mjs";

const SLUG = "claw-of-cool";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const cw = (page, fn, arg) => page.evaluate(fn, arg);

test.describe.configure({ timeout: 120_000 });

async function open(page, url = V2) {
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
  await cw(page, () => { __claw.hold(true); __claw.seed(203); });
}
async function press(page, isMobile, locator) {
  if (isMobile) await page.locator(locator).tap(); else await page.locator(locator).click();
}
// pick a machine on the title screen (the checks unlock them all first; unlocking for real is checked on its own)
async function pick(page, isMobile, i) {
  await cw(page, () => __claw.unlockAll());
  await press(page, isMobile, `#mpick .mch[data-i="${i}"]`);
  await expect(page.locator(`#mpick .mch[data-i="${i}"]`)).toHaveAttribute("aria-pressed", "true");
}
async function start(page, isMobile) {
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#title")).toBeHidden();
  expect(await cw(page, () => __claw.game.screen)).toBe("play");
}
const cam = page => cw(page, () => __claw.cam());
const state = page => cw(page, () => { const s = __claw.st; return { phase: s.phase, coins: s.coins, score: s.score, round: s.round, won: s.won.slice(), prizes: s.prizes.length, x: s.claw.x, y: s.claw.y, zoom: s.zoom, refill: s.refill, msg: s.msg }; });
// prizes the claw can reach: on top, or on the floor with nothing resting on them
const reachable = page => cw(page, () => { const ps = __claw.prizes();
  return ps.filter(p => p.layer === 1 || !ps.some(q => q.layer === 1 && Math.hypot(q.x - p.x, q.y - p.y) < 13)); });
// one try: a coin in with DROP, the timer starts, line up over a prize (where it is now: some machines' prizes move), DROP
async function tryOn(page, id, drop = () => page.keyboard.press("Space")) {
  await drop();
  await cw(page, () => __claw.step(2));
  expect(await cw(page, () => __claw.st.phase)).toBe("play");
  await cw(page, id => { const p = __claw.prizes().find(q => q.id === id); __claw.aim(p.x, p.y); }, id);
  await drop();
  expect(await cw(page, () => __claw.st.phase)).toBe("lower");
}
// step until the claw is home and idle again
async function settle(page, max = 16) {
  for (let k = 0; k < max * 2; k++) {
    await cw(page, () => __claw.step(0.5));
    if (await cw(page, () => __claw.st.phase === "idle" && !__claw.st.held && !__claw.st.falls.some(f => f.mode === "chute"))) return;
  }
}

test("jeremy.v2 opens to its title screen with a machine picker (only Classic unlocked), and loads nothing from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator("#title .logo")).toContainText("CLAW");
  await expect(page.locator("#title .by")).toHaveText("Designed by Jeremy");
  await expect(page.locator("#mpick .mch")).toHaveCount(5);
  await expect(page.locator("#mpick .mch span")).toHaveText(["Classic", "Aquarium", "Dino Dig", "Space Station", "Snack Attack"]);
  await expect(page.locator("#mpick .mch.locked")).toHaveCount(4);
  await expect(page.locator('#mpick .mch[data-i="0"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#t-best")).toHaveText("0");
  await expect(page.locator("#fig #art")).not.toBeEmpty();
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  expect(await page.locator("a[href^=http]").count()).toBe(0);
  // a locked machine says how to unlock it
  await page.locator('#mpick .mch[data-i="1"]').click();
  await expect(page.locator("#toast")).toContainText("Win 5 prizes on Classic to unlock Aquarium");
  note("5 machines in the picker: Classic (picked) and 4 locked; a locked one says how to unlock it; no requests outside the site, no outside links, no sideways scrolling");
  await shot("title");
  expect(browserErrors).toEqual([]);
});

test("a coin zooms the camera way in on the prize pit, in the top-down view", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  let c = await cam(page);
  expect(c.zoom).toBe(0);
  expect(c.viewBox).toEqual(c.full);
  await press(page, isMobile, ".kpad .go");
  expect((await state(page)).coins).toBe(9);
  await cw(page, () => __claw.step(2));
  c = await cam(page);
  expect((await state(page)).phase).toBe("play");
  expect(c.zoom).toBe(1);
  expect(c.view).toBe("top");
  expect(c.pitch).toBe(82);
  const zoomed = c.full[2] / c.viewBox[2];
  expect(zoomed).toBeGreaterThan(1.8);
  await expect(page.locator("#vchip")).toBeVisible();
  await expect(page.locator("#vchip")).toHaveText("Top-down view · V");
  await expect(page.locator("#btns .act[data-k=view]")).toHaveText("View: Top-down");
  // the keypad still steers the claw, and left on the pad is left on the screen from up here
  const x0 = (await state(page)).y;
  await press(page, isMobile, ".kpad .k[aria-label=Left]");
  await cw(page, () => __claw.step(1));
  expect((await state(page)).y).toBeCloseTo(x0 + 6, 5);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  note(`DROP put a coin in (10 to 9 coins); when it landed the camera turned to look down at 82 degrees and zoomed ${zoomed.toFixed(1)}x onto the pit; the pad's left key still moved the claw 6 units left`);
  await shot("view-top-down");
  expect(browserErrors).toEqual([]);
});

test("the View button, the V key and the chip on the machine cycle the front, claw-cam and side views, and the camera zooms out when the try ends", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  const target = (await reachable(page)).filter(p => p.x > 30 && p.x < 56).sort((a, b) => Math.hypot(a.x - 44, a.y - 50) - Math.hypot(b.x - 44, b.y - 50))[0];
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(2));
  await cw(page, t => __claw.aim(t.x, t.y), target);
  // the View button (touch or mouse): front, at eye level through the front glass
  await press(page, isMobile, "#btns .act[data-k=view]");
  await cw(page, () => __claw.step(0.6));
  let c = await cam(page);
  expect([c.view, c.yaw, c.pitch]).toEqual(["front", 0, 9]);
  await expect(page.locator("#vchip")).toHaveText("Front view · V");
  await shot("view-front");
  // the V key: the claw-cam, riding on the claw and looking straight down; it follows the claw
  await page.keyboard.press("v");
  await cw(page, () => __claw.step(0.6));
  c = await cam(page);
  expect([c.view, c.pitch, c.clawcam]).toEqual(["claw", 90, true]);
  const vb0 = c.viewBox;
  await page.keyboard.press("ArrowUp");
  await cw(page, () => __claw.step(0.5));
  c = await cam(page);
  expect(c.viewBox[1]).toBeLessThan(vb0[1] - 1);
  await shot("view-claw-cam");
  // the chip on the machine (touch or mouse): the side view, through the side glass
  await press(page, isMobile, "#vchip");
  await cw(page, () => __claw.step(0.6));
  c = await cam(page);
  expect([c.view, c.yaw, c.pitch, c.clawcam]).toEqual(["side", 90, 9, false]);
  await shot("view-side");
  // and V again comes back round to top-down
  await page.keyboard.press("v");
  await cw(page, () => __claw.step(0.6));
  expect((await cam(page)).view).toBe("top");
  // drop: when the claw is home, the try is over and the camera zooms back out to where it was
  await page.keyboard.press("Space");
  await settle(page);
  await cw(page, () => __claw.step(1));
  c = await cam(page);
  expect(c.zoom).toBe(0);
  expect(c.viewBox).toEqual(c.full);
  expect([c.yaw, Math.round(c.pitch * 100) / 100]).toEqual([45, 35.26]);
  await expect(page.locator("#vchip")).toBeHidden();
  const s = await state(page);
  expect(await cw(page, () => __claw.s2.view)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("gameon.claw-of-cool.jeremy.v2.view"))).toBe("0");
  note(`View button: front (yaw 0, pitch 9); V: claw-cam (pitch 90, follows the claw: ▲ moved the view up with it); the chip: side (yaw 90); V: back to top-down. After the drop (score ${s.score}) the claw came home and the camera zoomed back out to the starting view`);
  expect(browserErrors).toEqual([]);
});

test("the 5th win refills the machine for round 2 straight away, zooms out for the new round and unlocks the Aquarium", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  const at5 = {};
  for (let i = 0; i < 5; i++) {
    const target = (await reachable(page)).find(p => p.tier === 0);
    await tryOn(page, target.id);
    // step a frame at a time through the grab until the win is counted
    for (let k = 0; k < 600 && (await state(page)).won.length === i; k++) await cw(page, () => __claw.step(1 / 60));
    expect((await state(page)).won.length).toBe(i + 1);
    if (i === 4) { Object.assign(at5, await state(page)); break; }
    await settle(page);
  }
  // the moment the 5th prize drops into the chute: round 2 is here, while the claw is still opening over the chute
  expect(at5.round).toBe(2);
  expect(at5.refill).toBe(true);
  expect(["release", "back"]).toContain(at5.phase);
  await cw(page, () => __claw.step(0.4));
  await expect(page.locator("#banner b")).toHaveText("Round 2!");
  await expect(page.locator("#banner span")).toContainText("Aquarium unlocked!");
  await shot("round-2");
  await cw(page, () => __claw.step(1));
  expect((await cam(page)).zoom).toBe(0);
  await settle(page);
  await cw(page, () => __claw.step(3));
  const s = await state(page);
  expect(s.refill).toBe(false);
  expect(s.prizes).toBe(27);
  expect(await page.evaluate(() => localStorage.getItem("gameon.claw-of-cool.jeremy.v2.unlocked"))).toBe("2");
  await page.keyboard.press("p");
  await press(page, isMobile, "#ptitle-btn");
  await expect(page.locator('#mpick .mch[data-i="1"]')).not.toHaveClass(/locked/);
  await expect(page.locator("#mpick .mch.locked")).toHaveCount(3);
  note(`5 cool prizes won (score ${s.score}); the round turned to 2 the moment the 5th prize dropped (the claw was still in "${at5.phase}"), the camera zoomed out for the new round, 27 new prizes rained in, and the Aquarium is unlocked in the picker`);
  expect(browserErrors).toEqual([]);
});

// the themed machines: a grab on each, watched from one of the zoom views
const MACHINES = [
  { i: 1, name: "Aquarium", view: 1, shape: "flat", shotName: "aquarium-grab" },
  { i: 2, name: "Dino Dig", view: 3, shape: "long", shotName: "dino-dig-grab" },
  { i: 3, name: "Space Station", view: 0, shape: "flat", shotName: "space-station-grab" },
  { i: 4, name: "Snack Attack", view: 2, shape: "ring", shotName: "snack-attack-grab" },
];
for (const M of MACHINES) {
  test(`${M.name}: its own cabinet, odd-shaped prizes (no balls) and twist, and a centred grab wins an odd shape`, async ({ page, isMobile, shot, note, browserErrors }) => {
    await open(page);
    await pick(page, isMobile, M.i);
    await expect(page.locator("#t-blurb")).not.toBeEmpty();
    await start(page, isMobile);
    expect(await cw(page, () => __claw.machine().name)).toBe(M.name);
    await expect(page.locator("header h1")).toContainText(M.name.toUpperCase());
    const ps = await cw(page, () => __claw.prizes());
    const shapes = [...new Set(ps.map(p => p.shape))].sort();
    expect(shapes).not.toContain("ball");
    expect(ps.filter(p => p.tier === 3).length).toBe(1);
    await expect(page.locator("#shelf .slot")).toHaveCount(5);
    // the twist
    let twist = "";
    if (M.i === 1) {
      const a = await cw(page, () => __claw.prizes()[0]); await cw(page, () => __claw.step(1)); const b = await cw(page, id => __claw.prizes().find(p => p.id === id), a.id);
      expect(Math.hypot(b.x - a.x, b.y - a.y) + Math.abs(b.z - a.z)).toBeGreaterThan(0.05);
      twist = `the ${a.kind} drifted ${Math.hypot(b.x - a.x, b.y - a.y).toFixed(2)} units and bobbed ${(b.z - a.z).toFixed(2)} in a second`;
    } else if (M.i === 2) {
      const buried = ps.filter(p => p.z < 86);
      expect(buried.length).toBe(ps.length);
      twist = `all ${ps.length} prizes start below the sand's surface (base z ${Math.min(...ps.map(p => p.z)).toFixed(1)} to ${Math.max(...ps.map(p => p.z)).toFixed(1)}, sand at 86)`;
    } else if (M.i === 3) {
      await cw(page, () => __claw.step(2));
      const hs = (await cw(page, () => __claw.prizes())).map(p => p.z - 80);
      expect(Math.min(...hs)).toBeGreaterThan(0.9);
      twist = `prizes float ${Math.min(...hs).toFixed(1)} to ${Math.max(...hs).toFixed(1)} units off the floor`;
    } else {
      twist = `${ps.filter(p => p.shape === "ring").length} rings and ${ps.filter(p => p.shape === "flat").length} flat snacks in the machine`;
    }
    const target = (await cw(page, sh => __claw.prizes().filter(p => p.shape === sh), M.shape)).sort((a, b) => Math.hypot(a.x - 40, a.y - 50) - Math.hypot(b.x - 40, b.y - 50))[0];
    expect(target).toBeTruthy();
    await cw(page, v => { __claw.st.view = v; }, M.view);
    await tryOn(page, target.id);
    // watch the grab until the prize is lifted, then shoot it from this machine's view
    for (let k = 0; k < 600 && (await cw(page, () => __claw.st.phase)) !== "lift"; k++) await cw(page, () => __claw.step(1 / 60));
    await cw(page, () => __claw.step(0.5));
    expect(await cw(page, () => __claw.st.drop.grip)).toBe("hold");
    expect((await cam(page)).zoom).toBe(1);
    await shot(M.shotName);
    for (let k = 0; k < 900 && (await state(page)).won.length === 0; k++) await cw(page, () => __claw.step(1 / 60));
    const s = await state(page);
    expect(s.won).toEqual([target.kind]);
    expect(s.score).toBe(target.pts);
    await expect(page.locator("#banner b")).toContainText(`+${target.pts}`);
    note(`${M.name}: prize shapes ${shapes.join(", ")}, one legendary; ${twist}. Watched from the ${(await cam(page)).view} view: a centred grab held the ${target.kind} (${target.shape}) and won ${target.pts} points`);
    expect(browserErrors).toEqual([]);
  });
}

test("jeremy.v1's saves load in jeremy.v2 and are never changed; v2 saves under gameon.claw-of-cool.jeremy.v2.; it still plays with storage blocked", async ({ page, isMobile, shot, note, browserErrors }) => {
  const V1SAVES = { "gameon.claw-of-cool.best": "345", "gameon.claw-of-cool.collection": JSON.stringify({ duck: 2, egg: 1 }), "gameon.claw-of-cool.sound": "\"off\"" };
  await page.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem("seeded", "1"); } }, V1SAVES);
  await open(page);
  await expect(page.locator("#t-best")).toHaveText("345");
  await expect(page.locator("#t-found")).toHaveText("2");
  await expect(page.locator("#shelf .slot[data-kind=duck]")).toHaveClass(/found/);
  await expect(page.locator("#shelf .slot[data-kind=egg]")).toHaveClass(/found/);
  await expect(page.locator("#btns .act[data-k=sound]")).toHaveText("Sound off");
  await shot("v1-saves");
  // play one game on Classic: a win, then out of coins (a score under v1's best)
  await start(page, isMobile);
  await cw(page, () => { __claw.st.coins = 1; });
  const target = (await reachable(page)).find(p => p.tier === 1);
  await tryOn(page, target.id);
  await cw(page, () => __claw.step(10));
  await expect(page.locator("#over")).toBeVisible();
  await expect(page.locator("#o-score")).toHaveText("25");
  await expect(page.locator("#o-new")).toBeHidden();
  const all = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  for (const [k, v] of Object.entries(V1SAVES)) expect(all[k]).toBe(v);
  const mine = Object.keys(all).filter(k => !(k in V1SAVES));
  expect(mine.length).toBeGreaterThan(0);
  for (const k of mine) expect(k.startsWith("gameon.claw-of-cool.jeremy.v2.")).toBe(true);
  expect(JSON.parse(all["gameon.claw-of-cool.jeremy.v2.collection"])).toEqual({ classic: { [target.kind]: 1 } });
  await page.reload();
  await expect(page.locator("#t-found")).toHaveText("3");
  // blocked storage: every read and write throws, and the game still plays
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  await page.reload();
  await expect(page.locator("#play-btn")).toBeVisible();
  await cw(page, () => { __claw.hold(true); __claw.seed(203); });
  await start(page, isMobile);
  const t2 = (await reachable(page)).find(p => p.tier === 0);
  await tryOn(page, t2.id);
  await cw(page, () => __claw.step(9));
  expect((await state(page)).score).toBe(10);
  note(`seeded v1's best 345, collection {duck:2, egg:1} and sound off: v2's Classic title shows best 345, 2 found and Sound off. After a game (a ${target.kind} for 25, then out of coins) the v1 keys are byte for byte the same; v2 wrote only ${mine.join(", ")}. With storage blocked it still plays`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/claw-of-cool/", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page, V1);
  await expect(page.locator("#mpick")).toHaveCount(0);
  await start(page, isMobile);
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(2));
  expect(await cw(page, () => __claw.st.phase)).toBe("play");
  const v1 = games.find(g => g.slug === SLUG).versions.find(v => v.id === "jeremy.v1");
  expect(v1.url).toBe(V1);
  note(`jeremy.v1 at ${v1.url}: its own title (no machine picker), PLAY, a coin in and the timer running`);
  await shot("v1-plays");
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Claw of Cool plays jeremy.v2 by default and the picker still offers jeremy.v1", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto("./");
  const entry = games.find(g => g.slug === SLUG);
  // since jeremy.v3 (game idea #211) is the default, this checks that jeremy.v2 and jeremy.v1 are still in the picker
  // and that jeremy.v2 plays from it
  expect(entry.versions.find(v => v.id === "jeremy.v2").url).toBe(V2);
  expect(entry.versions.map(v => v.id).slice(0, 2)).toEqual(["jeremy.v1", "jeremy.v2"]);
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText(`${entry.versions.length} versions`);
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const v2item = page.locator('#ver-list .ver-item[data-version="jeremy.v2"]');
  await expect(v2item).toContainText("Zoom views and themed machines");
  await expect(page.locator('#ver-list .ver-item[data-version="jeremy.v1"]')).toBeVisible();
  await v2item.click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#mpick .mch")).toHaveCount(5);
  if (isMobile) await frame.locator("#play-btn").tap(); else await frame.locator("#play-btn").click();
  await expect(frame.locator("#title")).toBeHidden();
  await expect(frame.locator(".kpad .go")).toBeVisible();
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  await expect(page.frameLocator("#frame").locator("#mpick")).toHaveCount(0);
  note("card (2 versions) → picker: jeremy.v2 first, then jeremy.v1 → jeremy.v2 plays in the frame (machine picker, PLAY); #claw-of-cool@jeremy.v1 opens jeremy.v1");
  expect(browserErrors).toEqual([]);
});
