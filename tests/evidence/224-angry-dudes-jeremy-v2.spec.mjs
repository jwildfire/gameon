// Evidence for game idea #224: Angry Dudes jeremy.v2, Jeremy's phone-and-keyboard pass (the phone bar from #187: keys
// to aim, launch, pick a dude and pause; the top buttons 48 px tall; Start battle on screen on a sideways phone). The
// creator's update, started from jeremy.v1 at games/angry-dudes/jeremy.v1/, and the new default.
// Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/224-angry-dudes-jeremy-v2
//
// The squeeze checks load jeremy.v1 and jeremy.v2 side by side at six sizes (the phone project takes 375 x 812,
// 812 x 375 and 667 x 375; the desktop project 1024 x 768, 1280 x 800 and 1366 x 768) and walk all 37 battles.
// Math.random is seeded so both versions get the same wind.
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "angry-dudes";
const V1 = `games/${SLUG}/jeremy.v1/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const SIDEWAYS = { width: 812, height: 375 };
const PHONES = [{ width: 375, height: 812 }, SIDEWAYS, { width: 667, height: 375 }];
const DESKS = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1366, height: 768 }];
const sizesFor = isMobile => isMobile ? PHONES : DESKS;
const tag = s => `${s.width}x${s.height}`;
// outside hosts jeremy.v1 already loads: its fonts and matter.js (the physics engine) from cdnjs
const INHERITED_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];

// the battles run real physics, so give every check room on a busy machine
test.beforeEach(() => test.setTimeout(90_000));

const seedRandom = () => { let x = 12345; Math.random = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };
const state = page => page.evaluate(() => window.ANGRY_DEBUG.state);
async function load(page, url, size) {
  if (size) await page.setViewportSize(size);
  await page.goto(url);
  await page.waitForFunction(() => window.ANGRY_DEBUG);
  // all three of the game's fonts, so no measurement lands mid-swap
  await page.evaluate(async () => {
    await Promise.all(['16px "Press Start 2P"', '16px "Pixelify Sans"', '700 16px "Pixelify Sans"', '16px Rubik'].map(f => document.fonts.load(f).catch(() => null)));
    await document.fonts.ready;
  });
  await page.waitForTimeout(100);
}
async function center(page, sel) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  const b = await page.locator(sel).first().boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
}
// a real tap on a phone, a real click on a desktop
async function press(page, isMobile, sel) {
  const [x, y] = await center(page, sel);
  if (isMobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
// a finger (phone) or mouse (desktop) dragging back from the launcher and letting go
async function drag(page, isMobile, from, to) {
  if (!isMobile) {
    await page.mouse.move(...from); await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(from[0] + (to[0] - from[0]) * i / 8, from[1] + (to[1] - from[1]) * i / 8);
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from[0], y: from[1] }] });
  for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from[0] + (to[0] - from[0]) * i / 8, y: from[1] + (to[1] - from[1]) * i / 8 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
const winBattle = page => page.evaluate(() => {
  const D = window.ANGRY_DEBUG;
  for (let i = 0; i < 40 && D.report().length; i++) for (const l of D.report()) D.poke(l.split(" ")[0], 999);
  D.endTurn(); D.advance(8000);
});

// What a player sees as they land on a screen: every piece of text and every button, with its box, its letter size,
// whether it's whole on the screen (not off the edge, not clipped by a scroller, not cut short) and whether something
// else sits on top of it. When the battle is on, also the battlefield's band and how much of it buttons cover.
function snap() {
  const vis = e => { const cs = getComputedStyle(e); return cs.display !== "none" && cs.visibility !== "hidden" && e.getClientRects().length; };
  const sel = "#hud .where b, #hud .where span, #hud .stat, #hud button, #hint, #bar .item, " +
    ".overlay:not([hidden]) .panel :is(p,h1,h2,h3,button,li,.lvl,.pack,.camp-banner,.map-wrap,.stars,.pin)";
  const out = {}, count = {};
  for (const e of document.querySelectorAll(sel)) {
    if (!vis(e)) continue;
    let key = e.id ? "#" + e.id : (typeof e.className === "string" && e.className ? "." + e.className.split(" ")[0] : e.tagName.toLowerCase());
    if (!e.id) { count[key] = (count[key] || 0) + 1; key += "[" + count[key] + "]"; }
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const inView = r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
    let clipped = false;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      if (r.left < pr.left - 0.5 || r.right > pr.right + 0.5 || r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5) clipped = true;
    }
    const cut = e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== "visible";
    let covered = false;
    if (inView && !clipped) {
      const pts = [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2], [r.left + r.width / 2, r.top + r.height / 2]];
      covered = pts.some(([x, y]) => { const h = document.elementFromPoint(x, y); return h && !(h === e || e.contains(h) || h.contains(e)); });
    }
    out[key] = { text: e.textContent.trim().replace(/\s+/g, " ").slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height,
      font: parseFloat(getComputedStyle(e).fontSize), whole: inView && !clipped && !cut, covered };
  }
  let field = null;
  if (document.body.classList.contains("playing")) {
    // the battlefield: the game fits world rows 70-300 between the HUD and the dock (FIT_TOP and WORLD_H in game.js)
    const W = innerWidth, H = innerHeight, top = document.getElementById("hud").offsetHeight, bottom = document.getElementById("dock").offsetHeight;
    const avail = Math.max(140, H - top - bottom), scale = Math.min(W / 720, avail / 230);
    const band = { l: 0, r: W, b: top + avail, t: top + avail - 230 * scale };
    const area = [...document.querySelectorAll("button")].filter(b => b.offsetParent).map(b => b.getBoundingClientRect())
      .reduce((a, r) => a + Math.max(0, Math.min(r.right, band.r) - Math.max(r.left, band.l)) * Math.max(0, Math.min(r.bottom, band.b) - Math.max(r.top, band.t)), 0);
    field = { scale, top: band.t, bottom: band.b, covered: Math.round(area) };
  }
  return { out, field };
}
// everything jeremy.v1 showed whole is still whole in jeremy.v2, uncovered, with letters as big; HUD pieces also as big
function compare(where, a, b, hudToo) {
  const lost = [];
  for (const [k, v] of Object.entries(a)) {
    if (!v.whole || v.covered) continue;
    const w = b[k];
    if (!w) { lost.push(`${where} ${k} "${v.text}" is gone`); continue; }
    if (!w.whole) lost.push(`${where} ${k} "${v.text}" is cut off`);
    if (w.covered) lost.push(`${where} ${k} "${v.text}" is covered`);
    if (w.font < v.font) lost.push(`${where} ${k} letters ${v.font} -> ${w.font} px`);
    if (hudToo && w.text === v.text && (w.w < v.w - 0.5 || w.h < v.h - 0.5)) lost.push(`${where} ${k} "${v.text}" ${v.w.toFixed(1)}x${v.h.toFixed(1)} -> ${w.w.toFixed(1)}x${w.h.toFixed(1)}`);
  }
  return lost;
}
const wholeCount = o => Object.values(o).filter(v => v.whole && !v.covered).length;

async function battles(page, url, size) {
  await load(page, url, size);
  const list = await page.evaluate(() => window.ANGRY_PACKS.map(p => [p.id, p.levels.length]));
  const out = {};
  for (const [id, n] of list) for (let i = 0; i < n; i++) {
    await page.evaluate(([id, i]) => window.ANGRY_DEBUG.open(id, i), [id, i]);
    out[`${id} ${i + 1}`] = await page.evaluate(snap);
  }
  return out;
}

test("jeremy.v2 opens to its title screen and starts a battle, loading nothing from outside that jeremy.v1 didn't", async ({ page, isMobile, shot, note, browserErrors }) => {
  const hosts = new Set();
  page.on("request", r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); });
  await load(page, V2);
  const home = new URL(page.url()).host;
  await expect(page.locator("#menu-title")).toBeVisible();
  await expect(page.locator("#levels .lvl")).toHaveCount(4);
  await expect(page.locator(".howto")).toContainText("Keys:");
  await shot("title");
  await press(page, isMobile, "#levels .lvl");
  await expect(page.locator("#intro")).toBeVisible();
  if (isMobile) await page.setViewportSize(SIDEWAYS);
  await press(page, isMobile, "#btn-start");
  await expect(page.locator("#hud")).toBeVisible();
  expect((await state(page)).mode).toBe("play");
  for (const id of ["#btn-restart", "#btn-menu", "#btn-sound"]) await expect(page.locator(id)).toBeVisible();
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = [...hosts].filter(h => h !== home);
  expect(outside.filter(h => !INHERITED_HOSTS.includes(h)), "outside hosts jeremy.v1 doesn't load").toEqual([]);
  await page.waitForTimeout(600);
  await shot("playing");
  note(`${isMobile ? "tapped" : "clicked"} the first battle and Start battle${isMobile ? " (held sideways, 812 x 375)" : ""}; Restart, Menu and Sound showing; outside hosts: ${outside.join(", ") || "none"} (all loaded by jeremy.v1 too: its fonts and matter.js); no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("keys: W and ↑ both tilt the aim up, S and ↓ down, D and → add power, A and ← take it away, Space or Enter launches and does the special move, and E, Q and 1-9 pick a dude", async ({ page, isMobile, shot, note, browserErrors }) => {
  await load(page, V2, isMobile ? SIDEWAYS : undefined);
  // from the title by keys alone: ↓ picks the first battle, Enter opens its briefing, Enter starts it
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#levels .lvl").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#intro")).toBeVisible();
  await expect(page.locator("#btn-start")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await state(page)).mode).toBe("play");
  const lines = [];
  const pairs = [["w", "ArrowUp", "ang", 1], ["s", "ArrowDown", "ang", -1], ["d", "ArrowRight", "pow", 1], ["a", "ArrowLeft", "pow", -1]];
  for (const [k1, k2, what, sign] of pairs) {
    const moved = [];
    for (const k of [k1, k2]) {
      const before = (await state(page)).aim[what];
      await page.keyboard.press(k);
      const s = await state(page);
      expect(s.phase, `${k} shows the aim`).toBe("aiming");
      expect(s.aim.keys).toBe(true);
      expect(Math.sign(s.aim[what] - before), `${k} moves ${what}`).toBe(sign);
      moved.push(`${k} ${before}→${s.aim[what]}`);
    }
    lines.push(moved.join(", "));
  }
  // holding a key keeps turning
  const held0 = (await state(page)).aim.ang;
  await page.keyboard.down("w"); await page.waitForTimeout(400); await page.keyboard.up("w");
  const held1 = (await state(page)).aim.ang;
  expect(held1 - held0).toBeGreaterThan(3);
  await expect(page.locator("#hint")).toContainText("Space or Enter to launch");
  await shot("keyboard-aim");
  const s0 = await state(page);
  await page.keyboard.press(" ");
  let s = await state(page);
  expect(s.phase).toBe("active");
  expect(s.arsenal[s0.selected]).toBe(s0.arsenal[s0.selected] - 1);
  await expect(page.locator("#hint")).toHaveText("Tap to charge!");
  await page.keyboard.press("Enter");                                          // the legionary's special move: charge
  await expect(page.locator("#hint")).toHaveText("");
  await page.evaluate(() => { const D = window.ANGRY_DEBUG; for (let i = 0; i < 30 && D.state.phase !== "ready"; i++) D.advance(500); });
  s = await state(page);
  expect(s.phase).toBe("ready");
  const picks = [s.selected];
  await page.keyboard.press("e"); picks.push((await state(page)).selected);
  await page.keyboard.press("q"); picks.push((await state(page)).selected);
  await page.keyboard.press("3"); picks.push((await state(page)).selected);
  expect(picks).toEqual(["legionary", "centurion", "legionary", "pilum"]);
  await expect(page.locator('#bar .item[aria-pressed="true"]')).toContainText("Pilum");
  // a weapon: Enter shows the aim, Enter fires
  await page.keyboard.press("Enter"); expect((await state(page)).phase).toBe("aiming");
  await page.keyboard.press("Enter"); s = await state(page);
  expect(s.phase).toBe("active"); expect(s.arsenal.pilum).toBe(1);
  await page.evaluate(() => { const D = window.ANGRY_DEBUG; for (let i = 0; i < 30 && D.state.phase !== "ready"; i++) D.advance(500); });
  // a vehicle: 5 picks the testudo, Space sends it
  await page.keyboard.press("5"); expect((await state(page)).selected).toBe("testudo");
  await page.keyboard.press(" "); s = await state(page);
  expect(s.phase).toBe("active"); expect(s.arsenal.testudo).toBe(0);
  // F looks at the fort and back, M turns the sound off and on
  await page.evaluate(() => { const D = window.ANGRY_DEBUG; for (let i = 0; i < 30 && D.state.phase !== "ready"; i++) D.advance(500); });
  const look = [];
  if ((await state(page)).camMax > 0) {
    await page.keyboard.press("f"); look.push((await state(page)).lookingAtFort);
    await page.keyboard.press("f"); look.push((await state(page)).lookingAtFort);
    expect(look).toEqual([true, false]);
  }
  await page.keyboard.press("m"); await expect(page.locator("#btn-sound")).toHaveText("Sound off");
  await page.keyboard.press("m"); await expect(page.locator("#btn-sound")).toHaveText("Sound on");
  // a plane: Fort du Roule's Mustang. → shows and moves the target, Space calls it in
  await page.evaluate(() => window.ANGRY_DEBUG.open("ww2", 3));
  const bar = await page.evaluate(() => [...document.querySelectorAll("#bar .item .nm")].map(n => n.textContent));
  await page.keyboard.press(String(bar.indexOf("Mustang") + 1));
  expect((await state(page)).selected).toBe("p51");
  await page.keyboard.press("ArrowRight"); const t1 = (await state(page)).aim.target;
  await page.keyboard.press("d"); const t2 = (await state(page)).aim.target;
  expect(t1).not.toBeNull(); expect(t2).toBeGreaterThan(t1);
  await page.keyboard.press(" "); s = await state(page);
  expect(s.phase).toBe("active"); expect(s.arsenal.p51).toBe(0);
  note(`${isMobile ? "812 x 375: " : ""}from the title ↓, Enter, Enter started Syracuse. ${lines.join("; ")} (degrees and power). Holding W ${held0}→${held1}°. Space launched a legionary, Enter made him charge; E, Q and 3 picked centurion, legionary, pilum; Enter, Enter fired a pilum; 5 then Space sent the testudo; ${look.length ? "F looked at the fort and back; " : ""}M turned the sound off and on; at Fort du Roule → and D moved the Mustang's target ${t1}→${t2} and Space called it in`);
  expect(browserErrors).toEqual([]);
});

test("P, Escape and the Menu button pause the battle and hold it still; P, Escape and Play on carry on; Restart and Leave battle work from the pause menu", async ({ page, isMobile, shot, note, browserErrors }) => {
  await load(page, V2, isMobile ? SIDEWAYS : undefined);
  await page.evaluate(() => window.ANGRY_DEBUG.open("rome", 0));
  await page.evaluate(() => window.ANGRY_DEBUG.use("legionary", 40, 0.8));
  const ways = [];
  const held = async () => {
    const a = await page.evaluate(() => [window.ANGRY_DEBUG.state.time, window.ANGRY_DEBUG.report(true).join("|")]);
    await page.waitForTimeout(500);
    const b = await page.evaluate(() => [window.ANGRY_DEBUG.state.time, window.ANGRY_DEBUG.report(true).join("|")]);
    expect(b, "nothing moves while paused").toEqual(a);
  };
  const runs = async () => { const t = (await state(page)).time; await page.waitForTimeout(300); expect((await state(page)).time).toBeGreaterThan(t); };
  await runs();
  for (const [stop, go] of [["p", "p"], ["Escape", "Escape"], ["Menu", "Play on"]]) {
    if (stop === "Menu") await press(page, isMobile, "#btn-menu"); else await page.keyboard.press(stop);
    await expect(page.locator("#pause")).toBeVisible();
    expect((await state(page)).paused).toBe(true);
    await held();
    if (stop === "Menu") await shot("paused");
    if (go === "Play on") await press(page, isMobile, "#btn-resume"); else await page.keyboard.press(go);
    await expect(page.locator("#pause")).toBeHidden();
    await runs();
    ways.push(`${stop === "Menu" ? (isMobile ? "tapped Menu" : "clicked Menu") : stop} paused, ${go === "Play on" ? (isMobile ? "tapped Play on" : "clicked Play on") : go} carried on`);
  }
  // Restart from the pause menu: a fresh battle with a full arsenal
  await page.keyboard.press("p");
  await press(page, isMobile, "#btn-pause-restart");
  await expect(page.locator("#pause")).toBeHidden();
  let s = await state(page);
  expect(s.arsenal.legionary).toBe(4); expect(s.paused).toBe(false); expect(s.mode).toBe("play");
  // Leave battle: back to the title
  await press(page, isMobile, "#btn-menu");
  await press(page, isMobile, "#btn-pause-leave");
  await expect(page.locator("#menu")).toBeVisible();
  expect((await state(page)).mode).toBe("menu");
  note(`${isMobile ? "812 x 375: " : ""}${ways.join("; ")}; the clock and every piece stood still for 0.5 s each time; Restart from the pause menu gave a full arsenal (4 legionaries); Leave battle went back to the title`);
  expect(browserErrors).toEqual([]);
});

test("every button on every screen is at least 48 x 48 px, 8 px apart and 8 px from the edges, and tapping them works", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  const lines = [];
  for (const size of sizesFor(isMobile)) {
    await load(page, V2, size);
    await page.evaluate(() => localStorage.clear());
    const counts = [];
    const measure = async name => {
      const { targets, problems } = await touchTargets(page);
      expect(problems, `${tag(size)} ${name}: ${problems.join("; ")}`).toEqual([]);
      for (const t of targets) expect(Number.isInteger(t.w) && t.w >= 48 && t.h >= 48).toBe(true);
      counts.push(`${name} ${targets.length}`);
    };
    const upright = size.width < size.height;
    await measure("title");
    await press(page, isMobile, "#levels .lvl");
    await expect(page.locator("#intro")).toBeVisible();
    await measure("briefing");
    if (upright) await page.evaluate(() => document.getElementById("btn-start").click());   // below the fold upright, as in jeremy.v1
    else await press(page, isMobile, "#btn-start");
    expect((await state(page)).mode).toBe("play");
    await measure("battle");
    if (!upright) {
      const first = (await state(page)).selected;
      await press(page, isMobile, "#bar .item >> nth=1");
      expect((await state(page)).selected).not.toBe(first);
      await expect(page.locator("#bar .item").nth(1)).toHaveAttribute("aria-pressed", "true");
      await press(page, isMobile, "#btn-sound");
      expect((await state(page)).sound).toBe(false);
      await press(page, isMobile, "#btn-sound");
      if (await page.locator("#btn-look").isVisible()) {
        const was = (await state(page)).lookingAtFort;
        await press(page, isMobile, "#btn-look");
        expect((await state(page)).lookingAtFort).toBe(!was);
        await press(page, isMobile, "#btn-look");
      }
      await press(page, isMobile, "#btn-menu");
      expect((await state(page)).paused).toBe(true);
    } else await page.evaluate(() => document.getElementById("btn-menu").click());
    await measure("paused");
    if (!upright) { await press(page, isMobile, "#btn-resume"); expect((await state(page)).paused).toBe(false); }
    else await page.evaluate(() => document.getElementById("btn-resume").click());
    // a battle with a long arsenal (Remagen, 9 things): only whole buttons show, the rest a swipe away
    await page.evaluate(() => window.ANGRY_DEBUG.open("ww2", 6));
    await measure("battle with 9");
    await winBattle(page);
    await expect(page.locator("#result")).toBeVisible();
    await measure("battle report");
    if (!upright && size.width === 812) await shot("report-sideways");
    // the campaign map: a tap on the map picks a mission, and Start over asks to be tapped again
    await page.evaluate(() => { localStorage.setItem("angrydudes.campaign.ww2", JSON.stringify({ done: ["omaha", "pointe"], perks: [], stars: {}, offers: {} })); window.ANGRY_DEBUG.map("ww2"); });
    await expect(page.locator("#campaign")).toBeVisible();
    await measure("campaign map");
    const pin = await page.locator("#camp-pins .pin").nth(1).boundingBox();
    if (pin.y + pin.height < size.height) {
      if (isMobile) await page.touchscreen.tap(pin.x + pin.width / 2, pin.y + pin.height / 2); else await page.mouse.click(pin.x + pin.width / 2, pin.y + pin.height / 2);
      await expect(page.locator("#cm-name")).toHaveText("Pointe du Hoc");
    }
    await page.locator("#btn-camp-reset").scrollIntoViewIfNeeded();
    await press(page, isMobile, "#btn-camp-reset");
    await expect(page.locator("#btn-camp-reset")).toHaveText("Tap again to erase");
    await page.evaluate(() => document.querySelector("#campaign").scrollTop = 0);
    await measure("Start over armed");
    lines.push(`${tag(size)}: ${counts.join(", ")}`);
  }
  note(`targets measured on each screen (0 means none on screen: upright, the battle and the pause menu sit behind jeremy.v1's "Turn your phone sideways" card): ${lines.join(". ")}. ${isMobile ? "Taps" : "Clicks"} worked: a battle, Start battle, a dude in the bar, Sound off and on, See fort, Menu (pause), Play on, a pin on the campaign map, Start over (asks again)`);
  expect(browserErrors).toEqual([]);
});

test("the HUD isn't squeezed: in all 37 battles every piece jeremy.v1 showed whole is still whole, uncovered and as big, with the top buttons 48 px tall", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(240_000);
  await page.addInitScript(seedRandom);
  const lines = [];
  for (const size of sizesFor(isMobile)) {
    const a = await battles(page, V1, size), b = await battles(page, V2, size);
    const lost = [];
    let whole = 0, heights = new Set(), v1h = new Set();
    for (const lv of Object.keys(a)) {
      lost.push(...compare(`${tag(size)} ${lv}`, a[lv].out, b[lv].out, true));
      whole += wholeCount(a[lv].out);
      for (const [k, v] of Object.entries(b[lv].out)) if (k.startsWith("#btn-")) heights.add(Math.round(v.h));
      for (const [k, v] of Object.entries(a[lv].out)) if (k.startsWith("#btn-")) v1h.add(Math.round(v.h));
    }
    expect(lost).toEqual([]);
    if (size.width >= size.height) expect([...heights]).toEqual([48]);
    const ex = b["rome 1"].out;
    lines.push(`${tag(size)}: ${whole} pieces whole in jeremy.v1 across 37 battles, all still whole and as big in jeremy.v2; top buttons ${[...v1h].join("/") || "hidden"} → ${[...heights].join("/") || "hidden"} px tall` +
      (ex["#btn-restart"] ? ` (Syracuse: Restart ${ex["#btn-restart"].w.toFixed(0)}x${ex["#btn-restart"].h.toFixed(0)}, Menu ${ex["#btn-menu"].w.toFixed(0)}x${ex["#btn-menu"].h.toFixed(0)}, Sound ${ex["#btn-sound"].w.toFixed(0)}x${ex["#btn-sound"].h.toFixed(0)})` : ""));
  }
  await page.setViewportSize(isMobile ? SIDEWAYS : DESKS[1]);
  await page.evaluate(() => window.ANGRY_DEBUG.open("rome", 0));
  await shot("hud");
  note(lines.join(". ") + ". Upright phones show the Turn sideways card in battle, in both versions");
  expect(browserErrors).toEqual([]);
});

test("no button covers the battlefield in any of the 37 battles, and the battlefield is drawn at least as big as in jeremy.v1", async ({ page, isMobile, note, browserErrors }) => {
  test.setTimeout(240_000);
  await page.addInitScript(seedRandom);
  const lines = [];
  for (const size of sizesFor(isMobile)) {
    const a = await battles(page, V1, size), b = await battles(page, V2, size);
    let worst = Infinity, best = 0, covered = 0;
    for (const lv of Object.keys(a)) {
      const f1 = a[lv].field, f2 = b[lv].field;
      expect(f2.covered, `${tag(size)} ${lv}: button area over the battlefield`).toBeLessThanOrEqual(f1.covered);
      expect(f2.scale, `${tag(size)} ${lv}: battlefield scale`).toBeGreaterThanOrEqual(f1.scale - 1e-6);
      covered += f2.covered;
      worst = Math.min(worst, f2.scale / f1.scale); best = Math.max(best, f2.scale / f1.scale);
    }
    const f1 = a["rome 1"].field, f2 = b["rome 1"].field;
    lines.push(`${tag(size)}: button area over the battlefield ${covered} px² in jeremy.v2 (37 battles); battlefield ${(worst * 100).toFixed(1)}-${(best * 100).toFixed(1)}% of jeremy.v1's size (Syracuse: rows ${f1.top.toFixed(0)}-${f1.bottom.toFixed(0)} → ${f2.top.toFixed(0)}-${f2.bottom.toFixed(0)}, scale ${f1.scale.toFixed(3)} → ${f2.scale.toFixed(3)})`);
  }
  note(lines.join(". "));
  expect(browserErrors).toEqual([]);
});

test("the briefing, title, battle report and campaign screens keep everything jeremy.v1 showed whole, and Start battle is on screen sideways in all 37 briefings", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(240_000);
  await page.addInitScript(seedRandom);
  const briefings = async (url, size) => {
    await load(page, url, size);
    const out = {}, packs = await page.locator("#packs .pack").count();
    for (let p = 0; p < packs; p++) {
      await page.evaluate(p => document.querySelectorAll("#packs .pack")[p].click(), p);
      const n = await page.locator("#levels .lvl").count();
      for (let i = 0; i < n; i++) {
        await page.evaluate(i => document.querySelectorAll("#levels .lvl")[i].click(), i);
        out[`pack ${p + 1} battle ${i + 1}`] = (await page.evaluate(snap)).out;
        await page.evaluate(() => document.getElementById("btn-back").click());
      }
    }
    return out;
  };
  const screens = async (url, size) => {
    await load(page, url, size);
    await page.evaluate(() => localStorage.clear());   // both versions share one save area: start each from the same title
    await load(page, url);
    const out = { title: (await page.evaluate(snap)).out };
    await page.evaluate(() => window.ANGRY_DEBUG.open("rome", 0));
    await winBattle(page);
    await expect(page.locator("#result")).toBeVisible();
    out["battle report"] = (await page.evaluate(snap)).out;
    await page.evaluate(() => { localStorage.setItem("angrydudes.campaign.ww2", JSON.stringify({ done: ["omaha"], perks: [], stars: {}, offers: {} })); window.ANGRY_DEBUG.map("ww2"); });
    out["campaign map"] = (await page.evaluate(snap)).out;
    await page.evaluate(() => document.getElementById("btn-camp-reset").click());
    out["Start over armed"] = (await page.evaluate(snap)).out;
    return out;
  };
  const lines = [];
  for (const size of sizesFor(isMobile)) {
    const a = await briefings(V1, size), b = await briefings(V2, size);
    const lost = [];
    let start1 = 0, start2 = 0, whole = 0;
    for (const k of Object.keys(a)) {
      lost.push(...compare(`${tag(size)} ${k}`, a[k], b[k], false));
      whole += wholeCount(a[k]);
      if (a[k]["#btn-start"].whole && !a[k]["#btn-start"].covered) start1++;
      if (b[k]["#btn-start"].whole && !b[k]["#btn-start"].covered) start2++;
    }
    const s1 = await screens(V1, size), s2 = await screens(V2, size);
    for (const k of Object.keys(s1)) lost.push(...compare(`${tag(size)} ${k}`, s1[k], s2[k], false));
    expect(lost).toEqual([]);
    if (size.width > size.height) expect(start2, `${tag(size)}: Start battle on screen`).toBe(37);
    expect(start2).toBeGreaterThanOrEqual(start1);
    lines.push(`${tag(size)}: ${whole} pieces whole across the 37 briefings in jeremy.v1, all still whole; Start battle on screen in ${start1} → ${start2} of 37; title, battle report, campaign map and Start over: ${Object.keys(s1).map(k => wholeCount(s1[k])).join("/")} whole, all kept`);
  }
  if (isMobile) {
    await load(page, V2, SIDEWAYS);
    await page.evaluate(() => { document.querySelectorAll("#packs .pack")[8].click(); document.querySelectorAll("#levels .lvl")[3].click(); });
    await shot("briefing-sideways");
  }
  note(lines.join(". "));
  expect(browserErrors).toEqual([]);
});

test("what stays still works: drag back and let go launches, a win shows the battle report with stars, and the best score is saved", async ({ page, isMobile, shot, note, browserErrors }) => {
  await load(page, V2, isMobile ? SIDEWAYS : undefined);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => window.ANGRY_DEBUG.open("rome", 0));
  const s0 = await state(page);
  const box = await page.locator("#screen").boundingBox();
  const from = [box.x + box.width * 0.2, box.y + box.height * 0.55];
  await drag(page, isMobile, from, [from[0] - 70, from[1] + 40]);
  const s1 = await state(page);
  expect(s1.phase).toBe("active");
  expect(s1.arsenal.legionary).toBe(s0.arsenal.legionary - 1);
  await winBattle(page);
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result-title")).toHaveText("Victory!");
  await expect(page.locator("#result-stars .star.on").first()).toBeVisible();
  const best = await page.evaluate(() => localStorage.getItem("angrydudes.best.rome.syracuse"));
  expect(JSON.parse(best).score).toBeGreaterThan(0);
  await shot("victory");
  note(`${isMobile ? "a finger" : "the mouse"} dragged back from the launcher and let go: a legionary flew (${s0.arsenal.legionary}→${s1.arsenal.legionary} left); a win showed "Victory!" with stars and saved angrydudes.best.rome.syracuse = ${best}`);
  expect(browserErrors).toEqual([]);
});

test("saves carry over: jeremy.v1's pack, sound, best scores and campaign load in jeremy.v2, which saves under the same keys and adds none", async ({ page, note, browserErrors }) => {
  const seed = {
    "angrydudes.pack": JSON.stringify("vikings"),
    "angrydudes.sound": JSON.stringify(false),
    "angrydudes.best.vikings.rochester": JSON.stringify({ score: 12345, stars: 2 }),
    "angrydudes.campaign.ww2": JSON.stringify({ done: ["omaha"], perks: ["bazooka"], stars: { omaha: 3 }, offers: {} })
  };
  await page.addInitScript(seed => {
    if (sessionStorage.getItem("seeded")) return;
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
    sessionStorage.setItem("seeded", "1");
  }, seed);
  await load(page, V2);
  expect(await page.evaluate(() => window.ANGRY_PACKS.find(p => p.id === "vikings").levels[0].id)).toBe("rochester");
  await expect(page.locator('#packs .pack[aria-pressed="true"]')).toContainText("Vikings");
  await expect(page.locator("#levels .lvl").first()).toContainText("Best 12,345");
  await expect(page.locator("#levels .lvl").first().locator(".star.on")).toHaveCount(2);
  await expect(page.locator("#btn-sound")).toHaveText("Sound off");
  await page.evaluate(() => window.ANGRY_DEBUG.map("ww2"));
  await expect(page.locator("#camp-army")).toContainText("Bazooka team");
  await expect(page.locator("#camp-rank")).not.toHaveText("Private");
  await page.locator("#btn-camp-back").click();
  await page.locator("#packs .pack", { hasText: "Castle Siege" }).click();
  await page.evaluate(() => window.ANGRY_DEBUG.open("castle", 0));
  await page.keyboard.press("m");
  const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(JSON.parse(stored["angrydudes.pack"])).toBe("castle");
  expect(JSON.parse(stored["angrydudes.sound"])).toBe(true);
  const keys = Object.keys(stored).sort();
  expect(keys.filter(k => !/^angrydudes\.(pack|sound|best\..+|losses\..+|campaign\..+)$/.test(k)), "keys jeremy.v1 doesn't use").toEqual([]);
  // and jeremy.v1 reads what jeremy.v2 wrote
  await load(page, V1);
  await expect(page.locator('#packs .pack[aria-pressed="true"]')).toContainText("Castle Siege");
  note(`seeded jeremy.v1's keys (Vikings pack, sound off, Rochester best 12,345 with 2 stars, a World War II campaign with Bazooka team) → all shown in jeremy.v2; after picking Castle Siege and M: ${keys.join(", ")}; no new keys; jeremy.v1 then opened on Castle Siege`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/angry-dudes/jeremy.v1/, and games.json keeps both versions with jeremy.v2 the default", async ({ page, isMobile, shot, note, browserErrors }) => {
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.default).toBe("jeremy.v2");
  expect(entry.url).toBe(V2);
  expect(entry.versions.map(v => [v.id, v.url])).toEqual([["jeremy.v1", V1], ["jeremy.v2", V2]]);
  expect(entry.versions[1]).toMatchObject({ from: "jeremy.v1", idea: 224, note: "Launch with the keyboard" });
  await load(page, V1, isMobile ? SIDEWAYS : undefined);
  await expect(page.locator("#menu-title")).toBeVisible();
  await page.locator("#levels .lvl").first().click();
  await page.evaluate(() => document.getElementById("btn-start").click());
  expect((await state(page)).mode).toBe("play");
  await expect(page.locator("#btn-restart")).toBeVisible();
  await shot("v1-still-plays");
  note(`jeremy.v1 at ${V1} opened and started a battle; games.json: default jeremy.v2, versions jeremy.v1 (${V1}) and jeremy.v2 (${V2})`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Angry Dudes offers both versions and plays jeremy.v2 by default; #angry-dudes@jeremy.v1 still opens jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("2 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Launch with the keyboard");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#menu-title")).toBeVisible({ timeout: 15_000 });
  await frame.locator("#levels .lvl").first().click();
  await expect(frame.locator("#btn-start")).toBeVisible();
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  await expect(page.frameLocator("#frame").locator("#menu-title")).toBeVisible({ timeout: 15_000 });
  note(`card (2 versions) → picker: jeremy.v2 first, "Launch with the keyboard" → jeremy.v2 plays in the frame and opens a briefing; #${SLUG}@jeremy.v1 still opens jeremy.v1`);
  expect(browserErrors).toEqual([]);
});
