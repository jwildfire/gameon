// Evidence for game idea #216: Pet Wash Payback jeremy.v4, Jeremy's update "Wash pets with the keyboard".
// The creator's update, started from jeremy.v3, and the new default. It brings the game up to the phone
// bar from the phone-friendly games task (#187): at 375 px wide every button is at least 48 x 48 px and
// 8 px clear of the others and the screen edges, and both WASD and the arrows work, now in the wash
// round too (a scrub brush, Space held to scrub, Enter or Space to catch Pickles).
// Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/216-pet-wash-payback-jeremy-v4
//
// Runs in play are deterministic: the game's clock is frozen and stepped 1/60 s at a time
// (__pwp.freeze / __pwp.tick), and its dice get a fixed seed (__pwp.seed) before a round starts.
import { test, expect, games } from "./evidence.mjs";

const SLUG = "pet-wash-payback";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const V3 = `games/${SLUG}/jeremy.v3/`;
const V4 = `games/${SLUG}/jeremy.v4/`;
const KIKI = `games/${SLUG}/kiki.v1/`;
const SEED = 216;

test.describe.configure({ timeout: 240_000 });

// ---- The phone bar (#187): every control a finger can reach is at least 48 x 48 px, at least 8 px from
// every other one, and at least 8 px from the screen edges (a list that scrolls isn't held to the top
// and bottom edges). Finds buttons, links, inputs and anything with a pointer cursor that a tap at its
// centre actually reaches; a play field (a third of the screen or more) isn't a button. The same
// measurement as the phone-friendly games audit's touchTargets(), kept here so this spec stands alone.
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
  const targets = found.out.map(t => ({ ...t, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h) }));
  const problems = [];
  for (const t of targets) {
    if (t.w < BAR.min || t.h < BAR.min) problems.push(`"${t.name}" is ${t.w}x${t.h} (needs ${BAR.min}x${BAR.min})`);
    const sides = [t.x, found.vw - (t.x + t.w)];
    if (!t.scrolls) sides.push(t.y, found.vh - (t.y + t.h));
    if (Math.min(...sides) < BAR.edge) problems.push(`"${t.name}" is ${Math.max(0, Math.min(...sides))} px from the edge (needs ${BAR.edge})`);
  }
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
    const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
    if (Math.max(dx, dy) < BAR.gap) problems.push(`"${a.name}" and "${b.name}" are ${Math.max(dx, dy)} px apart (need ${BAR.gap})`);
  }
  return { targets, problems };
}

// ---- Players the checks use. They run inside the page through the game's own update loop.
// keyWashBot presses only keys, as real KeyboardEvents on the page: the arrows (or WASD, taking turns
// spot by spot), Space held to scrub, 1 2 3 for the tools and Enter or Space to catch Pickles. It steers
// the brush to the nearest spot that needs the tool in hand, switches tools (with a pause, like a
// person) when most spots need the next one, waits out Bubbles' dives and uses another tool while Inky
// holds one.
function keyWashBot({ switchDelay = 0.3, maxT = 80, dead = 6 } = {}) {
  const G = __pwp, dt = 1 / 60, held = {}, pressed = new Set();
  const send = (code, down) => {
    const key = code === "Space" ? " " : code.startsWith("Key") ? code.slice(3).toLowerCase() : code.startsWith("Digit") ? code.slice(5) : code;
    document.body.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key, bubbles: true, cancelable: true }));
    if (down) pressed.add(code);
  };
  const hold = (code, down) => { if (!!held[code] !== down) { held[code] = down; send(code, down); } };
  const tap = code => { send(code, true); send(code, false); };
  const releaseAll = () => { for (const c of Object.keys(held)) hold(c, false); };
  G.freeze(true);
  if (!G.kb.on) { tap("ArrowUp"); }
  let t = 0, tool = G.round.tool, switching = 0, wasd = false, cleaned = 0, catchKey = "Enter", catches = [];
  const tools = new Set();
  while (G.mode === "wash" && t < maxT) {
    const r = G.round, b = r.b, kb = G.kb;
    const reachable = s => s.stage < 3 && !(b.depth > 0.5 && s.y > -40);
    const usable = k => !(b.snatchT > 0 && b.snatched === k);
    let target = null, scrub = false;
    if (r.cleaned !== cleaned) { cleaned = r.cleaned; wasd = !wasd; }
    if (r.over) { releaseAll(); }
    else if (r.pet.flyer && b.state !== "sit") {
      hold("Space", false);
      if (b.state === "fly") {
        const p = G.parrotScreen(), lx = p.x / G.layout.U, ly = p.y / G.layout.U, reach = p.reach / G.layout.U;
        target = { x: lx, y: ly };
        if (Math.hypot(kb.x - lx, kb.y - ly) < reach * 0.7) { tap(catchKey); catches.push(catchKey); catchKey = catchKey === "Enter" ? "Space" : "Enter"; target = null; }
      }
    } else {
      const n = [0, 0, 0]; r.spots.forEach(s => { if (reachable(s)) n[s.stage]++; });
      let want = -1, most = 0; n.forEach((c, k) => { if (c > most && usable(k)) { most = c; want = k; } });
      if (want >= 0 && want !== tool && switching <= 0 && (!usable(tool) || n[tool] === 0 || most > n[tool])) switching = switchDelay;
      if (switching > 0) { switching -= dt; if (switching <= 0 && want >= 0) { tool = want; tap("Digit" + (tool + 1)); } }
      let best = -1, bd = 1e9;
      r.spots.forEach((s, j) => { if (s.stage === tool && reachable(s) && usable(tool)) { const p = G.spotLogical(j), d = Math.hypot(p.x - kb.x, p.y - kb.y); if (d < bd) { bd = d; best = j; } } });
      if (best >= 0) { target = G.spotLogical(best); scrub = bd < 45 && switching <= 0; }
    }
    if (!r.over && !(r.pet.flyer && b.state !== "sit")) hold("Space", scrub);
    if (scrub) tools.add(r.tool);
    const dx = target ? target.x - kb.x : 0, dy = target ? target.y - kb.y : 0;
    const [L, R, U, D] = wasd ? ["KeyA", "KeyD", "KeyW", "KeyS"] : ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    const [oL, oR, oU, oD] = wasd ? ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] : ["KeyA", "KeyD", "KeyW", "KeyS"];
    for (const c of [oL, oR, oU, oD]) hold(c, false);
    hold(L, dx < -dead); hold(R, dx > dead); hold(U, dy < -dead); hold(D, dy > dead);
    G.tick(dt); t += dt;
  }
  releaseAll();
  const r = G.round;
  return { mode: G.mode, t: Math.round(t * 10) / 10, left: r ? Math.round(r.time * 10) / 10 : null, done: !!(r && r.done), cleaned: r ? r.cleaned : 0, spots: r ? r.spots.length : 0,
           catches, tools: [...tools].sort(), keys: [...pressed].sort() };
}

// The pointer player from jeremy.v2's and jeremy.v3's evidence: drags to the nearest spot that needs
// the current tool and scrubs in little circles, catching Pickles first.
function washBot({ speed = 700, switchDelay = 0.35, maxT = 80 } = {}) {
  const G = __pwp, dt = 1 / 60;
  G.freeze(true);
  let t = 0, px = G.layout.W / 2, py = G.layout.H / 2, tool = 0, switching = 0, ang = 0;
  G.setTool(0);
  const move = (tx, ty) => { const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy), step = speed * dt; if (d > step) { px += dx / d * step; py += dy / d * step; } else { px = tx; py = ty; } return d; };
  while (G.mode === "wash" && t < maxT) {
    const r = G.round, b = r.b;
    const reachable = s => s.stage < 3 && !(b.depth > 0.5 && s.y > -40);
    const usable = k => !(b.snatchT > 0 && b.snatched === k);
    if (r.over) G.setPointer(px, py, false);
    else if (r.pet.flyer && b.state !== "sit") {
      if (b.state === "fly") { const p = G.petScreen(), d = move(p.lx, p.ly); G.setPointer(px, py, d < 40); }
      else G.setPointer(px, py, false);
    } else {
      const n = [0, 0, 0]; r.spots.forEach(s => { if (reachable(s)) n[s.stage]++; });
      let want = -1, most = 0; n.forEach((c, k) => { if (c > most && usable(k)) { most = c; want = k; } });
      if (want >= 0 && want !== tool && (switching <= 0) && (!usable(tool) || n[tool] === 0 || most > n[tool])) switching = switchDelay;
      if (switching > 0) { switching -= dt; G.setPointer(px, py, false); if (switching <= 0 && want >= 0) { tool = want; G.setTool(tool); } }
      else {
        let best = -1, bd = 1e9;
        r.spots.forEach((s, j) => { if (s.stage === tool && reachable(s)) { const p = G.spotLogical(j), d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; best = j; } } });
        if (best < 0 || !usable(tool)) G.setPointer(px, py, false);
        else {
          const p = G.spotLogical(best);
          ang += dt * 22;
          move(p.x + Math.cos(ang) * 14, p.y + Math.sin(ang) * 14);
          G.setPointer(px, py, true);
        }
      }
    }
    G.tick(dt); t += dt;
  }
  G.setPointer(px, py, false);
  const r = G.round;
  return { mode: G.mode, t: Math.round(t * 10) / 10, catches: r && r.b ? r.b.catches || 0 : 0 };
}

// The arrow-key dodger from jeremy.v3's evidence. idle: never presses anything.
function hoseBot({ idle = false, maxT = 40 } = {}) {
  const G = __pwp, dt = 1 / 60, K = G.keys;
  G.freeze(true);
  let t = 0;
  const r0 = G.round;
  while (G.mode === "hose" && t < maxT) {
    const r = G.round, me = r.player, Y = r.Y;
    let fx = 0, fy = 0;
    const away = (x, y, range, w) => { const dx = me.x - x, dy = me.y - y, d = Math.hypot(dx, dy) || 1; if (d < range) { fx += dx / d * (1 - d / range) * w; fy += dy / d * (1 - d / range) * w; } };
    if (!idle) {
      for (const f of r.foes) {
        if (!f.visible) continue;
        const loud = f.st === "jump" || ((f.weapon === "octo") && (f.st === "aim" || f.st === "spray"));
        away(f.x, f.y, loud ? 260 : f.weapon === "rain" ? 160 : 380, loud ? 2.2 : 1.0);
        if (f.weapon === "puddle" && f.st === "charge" && f.target) away(f.target.x, f.target.y, 130, 2.5);
      }
      for (const dr of r.drops) {
        const dx = me.x - dr.x, dy = me.y - 8 - dr.y, d = Math.hypot(dx, dy);
        if (d > 160) continue;
        const v = Math.hypot(dr.vx, dr.vy), ux = dr.vx / v, uy = dr.vy / v;
        if (dx * ux + dy * uy < 0) continue;
        const s = (dx * -uy + dy * ux) >= 0 ? 1 : -1;
        fx += -uy * s * (1 - d / 160) * 0.6; fy += ux * s * (1 - d / 160) * 0.6;
      }
      for (const b of r.balloons) away(b.fx, b.fy, 110, 2.2);
      for (const b of r.buckets) away(b.x, b.y, 95, 2.4);
      for (const d of r.rain) away(d.x, d.y, 50, 1.2);
      for (const w of r.waves) { const d = Math.hypot(me.x - w.x, (me.y - w.y) / 0.7); if (d > w.r - 10 && d < w.max + 30) away(w.x, w.y, w.max + 40, 1.6); }
      for (const p of r.puddles) away(p.x, p.y, 60, 0.6);
      if (r.foes.some(f => f.weapon === "squirt")) for (const b of Y.bushes) away(b.x, b.y, 200, 1);
      const m = 70;
      if (me.x - Y.x0 < m) fx += (1 - (me.x - Y.x0) / m) * 1.5; if (Y.x1 - me.x < m) fx -= (1 - (Y.x1 - me.x) / m) * 1.5;
      if (me.y - Y.y0 < m) fy += (1 - (me.y - Y.y0) / m) * 1.5; if (Y.y1 - me.y < m) fy -= (1 - (Y.y1 - me.y) / m) * 1.5;
      for (const o of Y.solids) {
        const cx = o.type === "rect" ? Math.max(o.x, Math.min(me.x, o.x + o.w)) : o.x, cy = o.type === "rect" ? Math.max(o.y, Math.min(me.y, o.y + o.h)) : o.y;
        const dx = me.x - cx, dy = me.y - cy, d = Math.hypot(dx, dy) - (o.r || 0);
        if (d < 30) { const n = Math.hypot(dx, dy) || 1; fx += dx / n * 0.5; fy += dy / n * 0.5; }
      }
    }
    const th = 0.25;
    K.left = fx < -th; K.right = fx > th; K.up = fy < -th; K.down = fy > th;
    G.tick(dt); t += dt;
  }
  K.left = K.right = K.up = K.down = false;
  return { mode: G.mode, wet: Math.round(r0.wet), soaked: r0.soaked, hits: r0.hits, n: r0.ids ? r0.ids.length : 0 };
}

const pwp = (page, expr, arg) => page.evaluate(expr, arg);
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
async function open(page, url = V4) {
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
}
const freezeAndSeed = (page, seed = SEED) => pwp(page, seed => { __pwp.freeze(true); __pwp.seed(seed); }, seed);
const bots = page => page.addScriptTag({ content: `${keyWashBot}\n${washBot}\n${hoseBot}` });
// Real key presses from Playwright, then the game steps n frames while the key is down.
async function holdKey(page, key, frames) {
  await page.keyboard.down(key);
  await pwp(page, n => __pwp.tick(1 / 60, n), frames);
  await page.keyboard.up(key);
}

test("jeremy.v4 opens to its title screen, starts a wash round, and loads nothing from outside the site", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Pet Wash");
  await expect(page.locator("#surv-btn")).toHaveText("Survival!");
  await expect(page.locator("#pets-btn")).toBeVisible();
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-title")).toHaveText("Wash Biscuit the Dog!");
  await expect(page.locator("#intro-how")).toContainText("Or move the brush with the arrow keys or WASD and hold Space.");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await expect(page.locator("#tools")).toBeVisible();
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`title (Play!, Survival!, Pick a pet; the keys line now covers the brush) → "Wash Biscuit the Dog!", whose how-to adds the keys → Go! → Biscuit's wash with the tool bar; no requests outside the site (jeremy.v3 made none either); no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("every button meets the phone bar: at least 48 x 48 px, 8 px from the others and from the screen edges", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  const screens = [];
  const measure = async name => { const m = await touchTargets(page); screens.push({ name, ...m }); return m; };
  const size = t => `${t.w}x${t.h}`;
  await measure("title");
  await page.locator("#pets-btn").click();
  await measure("Pick a pet");
  await page.locator("#pets-back").click();
  await page.locator("#play-btn").click();
  await measure("round intro");
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  const wash = await measure("wash round");
  const mute = await page.locator("#mute-btn").boundingBox(), pauseB = await page.locator("#pause-btn").boundingBox();
  const hudGap = Math.round((pauseB.x - (mute.x + mute.width)) * 10) / 10;
  expect(Math.round(mute.width)).toBeGreaterThanOrEqual(48); expect(Math.round(mute.height)).toBeGreaterThanOrEqual(48);
  expect(Math.round(pauseB.width)).toBeGreaterThanOrEqual(48); expect(Math.round(pauseB.height)).toBeGreaterThanOrEqual(48);
  expect(hudGap).toBeGreaterThanOrEqual(8);
  await shot("buttons-wash");
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  await measure("pause");
  const small = {};
  for (const id of ["pause-title-btn", "pause-sound-btn", "resume-btn", "restart-btn"]) small[id] = await page.locator("#" + id).boundingBox();
  for (const b of Object.values(small)) expect(Math.round(b.height)).toBeGreaterThanOrEqual(48);
  await shot("buttons-pause");
  await page.locator("#resume-btn").click();
  await bots(page);
  await page.evaluate(() => washBot());
  await expect(page.locator("#result-screen")).toBeVisible();
  await measure("round result");
  // the last pet's payback, then the final score
  await pwp(page, () => { __pwp.freeze(true); __pwp.start(8, "hose", ["dog", "duck"]); });
  await page.evaluate(() => hoseBot());
  await expect(page.locator("#next-btn")).toHaveText("See your score");
  await page.locator("#next-btn").click();
  await expect(page.locator("#final-screen")).toBeVisible();
  await measure("final score");
  await page.locator("#final-title-btn").click();
  await page.locator("#surv-btn").click();
  await measure("Survival intro");
  await page.locator("#go-btn").click();
  await measure("Survival run");
  await page.evaluate(() => hoseBot({ idle: true, maxT: 600 }));
  await expect(page.locator("#surv-screen")).toBeVisible();
  await measure("Survival end");
  await pwp(page, () => __pwp.freeze(false));
  const back = screens.find(s => s.name === "Pick a pet").targets.find(t => t.name === "Back");
  expect(back.h).toBeGreaterThanOrEqual(48);
  const problems = screens.flatMap(s => s.problems.map(p => `${s.name}: ${p}`));
  expect(problems).toEqual([]);
  const count = screens.reduce((n, s) => n + s.targets.length, 0);
  const smallest = screens.flatMap(s => s.targets).reduce((a, t) => Math.min(a, t.w, t.h), 1e9);
  note(`${isMobile ? "375 px wide (phone)" : "1280 px wide"}: ${count} buttons on ${screens.length} screens (${screens.map(s => `${s.name} ${s.targets.length}`).join(", ")}), none smaller than ${smallest} px, none closer than 8 px to another or to an edge. Sound ${size(wash.targets.find(t => t.name === "Sound on or off"))} and Pause ${size(wash.targets.find(t => t.name === "Pause"))}, ${hudGap} px apart; Back ${size(back)}; Title screen ${Math.round(small["pause-title-btn"].width)}x${Math.round(small["pause-title-btn"].height)} and Sound: on ${Math.round(small["pause-sound-btn"].width)}x${Math.round(small["pause-sound-btn"].height)} on the pause screen; Keep going ${Math.round(small["resume-btn"].height)} px tall`);
  expect(browserErrors).toEqual([]);
});

test("in the wash round, the arrows and WASD move a visible scrub brush, and it rides along with the pet", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  // started from the keyboard: Enter on the title screen, Enter on Go!
  await page.locator("body").press("Enter");
  await expect(page.locator("#intro-title")).toHaveText("Wash Biscuit the Dog!");
  await freezeAndSeed(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  const start = await pwp(page, () => ({ on: __pwp.kb.on, ...__pwp.brushScreen(), pet: __pwp.petScreen() }));
  expect(start.on).toBe(true);
  // the brush starts on Biscuit
  expect(Math.hypot(start.x - start.pet.x, start.y - start.pet.y)).toBeLessThan(40);
  const moves = {};
  for (const [key, axis, sign] of [["ArrowLeft", "x", -1], ["a", "x", -1], ["ArrowRight", "x", 1], ["d", "x", 1], ["ArrowUp", "y", -1], ["w", "y", -1], ["ArrowDown", "y", 1], ["s", "y", 1]]) {
    const a = await pwp(page, () => __pwp.brushScreen());
    await holdKey(page, key, 15);
    await pwp(page, () => __pwp.tick(1 / 60, 10));         // let it glide to a stop
    const b = await pwp(page, () => __pwp.brushScreen());
    moves[key] = Math.round((b[axis] - a[axis]) * sign);
  }
  for (const [k, d] of Object.entries(moves)) expect(d, `${k} moves the brush`).toBeGreaterThan(20);
  // nothing scrubbed by moving alone
  expect(await pwp(page, () => __pwp.progress())).toBe(0);
  // Biscuit sways; with no key down the brush stays on the same part of him
  const ride = await pwp(page, () => {
    const G = __pwp, at = () => { const b = G.brushScreen(), p = G.petScreen(); return { dx: b.x - p.x, pet: p.x }; };
    const a = at(); G.tick(1 / 60, 90); const b = at();
    return { petMoved: Math.round(Math.abs(b.pet - a.pet)), drift: Math.round(Math.abs(b.dx - a.dx)) };
  });
  expect(ride.petMoved).toBeGreaterThan(10);
  expect(ride.drift).toBeLessThan(12);
  await shot("keyboard-brush");
  await pwp(page, () => __pwp.freeze(false));
  note(`Enter on the title and Enter on Go! started Biscuit's wash with the brush already on him. Held for a quarter second each, the brush moved (px): ${Object.entries(moves).map(([k, d]) => `${k} ${d}`).join(", ")}; moving alone scrubbed nothing. Over 1.5 s Biscuit swayed ${ride.petMoved} px and the brush, with no key down, stayed within ${ride.drift} px of the same spot on him`);
  expect(browserErrors).toEqual([]);
});

test("Space held scrubs, rinses and dries with the brush, and a whole wash plays from the keyboard", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await page.locator("#play-btn").click();
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  await bots(page);
  // steer onto the first spot with the arrow keys (the bot), then hold real Space and press real 2 and 3
  const onSpot = await page.evaluate(() => {
    const G = __pwp, send = (code, down) => document.body.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
    for (let i = 0; i < 400; i++) {
      const s = G.spotLogical(0), kb = G.kb, dx = s.x - kb.x, dy = s.y - kb.y;
      if (Math.hypot(dx, dy) < 8) break;
      for (const [c, on] of [["ArrowLeft", dx < -4], ["ArrowRight", dx > 4], ["ArrowUp", dy < -4], ["ArrowDown", dy > 4]]) send(c, on);
      G.tick(1 / 60);
    }
    for (const c of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) send(c, false);
    return { on: G.kb.on, stage: G.round.spots[0].stage };
  });
  expect(onSpot).toEqual({ on: true, stage: 0 });
  const stageAfter = async (frames) => { await page.keyboard.down(" "); await pwp(page, n => __pwp.tick(1 / 60, n), frames); const s = await pwp(page, () => ({ stage: __pwp.round.spots[0].stage, scrub: __pwp.kb.scrub })); return s; };
  const soap = await stageAfter(50);
  expect(soap).toEqual({ stage: 1, scrub: true });
  await shot("keyboard-scrub");
  await page.keyboard.up(" ");
  expect(await pwp(page, () => __pwp.kb.scrub)).toBe(false);
  await page.keyboard.press("2");
  expect(await pwp(page, () => __pwp.round.tool)).toBe(1);
  const rinse = await stageAfter(45);
  expect(rinse.stage).toBe(2);
  await page.keyboard.up(" ");
  await page.keyboard.press("3");
  const dry = await stageAfter(40);
  expect(dry.stage).toBe(3);
  await page.keyboard.up(" ");
  // the rest of Biscuit, by keyboard only
  const res = await page.evaluate(() => keyWashBot());
  expect(res.mode).toBe("result");
  expect(res.done).toBe(true);
  expect(res.cleaned).toBe(res.spots);
  expect(res.tools).toEqual([0, 1, 2]);
  for (const k of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"]) expect(res.keys, k).toContain(k);
  await expect(page.locator("#result-title")).toHaveText(/^(Squeaky clean!|Super speedy scrub!)$/);
  const title = await page.locator("#result-title").textContent();
  const stars = await page.locator("#result-stars .on").count();
  expect(stars).toBeGreaterThanOrEqual(2);
  // every pet but Pickles (next check) can be washed in time from the keyboard
  const all = await page.evaluate(() => [0, 1, 2, 3, 5, 6, 7, 8].map(i => { __pwp.freeze(true); __pwp.seed(216 + i); __pwp.start(i, "wash"); const r = keyWashBot(); return { pet: __pwp.round.pet.name, done: r.done, left: r.left }; }));
  for (const r of all) expect(r.done, `${r.pet} washed`).toBe(true);
  await pwp(page, () => __pwp.freeze(false));
  note(`brush steered onto a spot with the arrows, then real key presses: Space held 50 frames soaped it to bubbles (the screenshot, mid-scrub), 2 + Space rinsed it, 3 + Space dried it sparkling. Then a keyboard-only player (arrows and WASD taking turns, Space, 1 2 3) finished Biscuit "${title}" with ${res.left} s left and ${stars} stars. From the keyboard every pet but Pickles washed in time: ${all.map(r => `${r.pet} ${r.left} s left`).join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("Enter or Space catches Pickles when the brush reaches him, and he can be washed from the keyboard", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await freezeAndSeed(page);
  await pwp(page, () => { __pwp.start(4, "wash"); __pwp.tick(1 / 60); });
  await page.keyboard.press("ArrowDown");                    // the brush shows up under his flight path
  const s0 = await pwp(page, () => ({ on: __pwp.kb.on, state: __pwp.round.b.state, ...__pwp.brushScreen(), p: __pwp.parrotScreen() }));
  expect(s0.on).toBe(true);
  expect(s0.state).toBe("fly");
  // too far away: Space misses
  expect(Math.hypot(s0.x - s0.p.x, s0.y - s0.p.y)).toBeGreaterThan(s0.p.reach);
  await page.keyboard.press(" ");
  await expect(page.locator("#tip")).toHaveText("Missed! Get the brush closer to Pickles.");
  expect(await pwp(page, () => __pwp.round.b.state)).toBe("fly");
  // chase him with the arrows until he's in the ring
  const near = await page.evaluate(() => {
    const G = __pwp, U = G.layout.U, send = (code, down) => document.body.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }));
    let f = 0;
    for (; f < 600 && !G.kb.near; f++) {
      const p = G.parrotScreen(), dx = p.x / U - G.kb.x, dy = p.y / U - G.kb.y;
      for (const [c, on] of [["ArrowLeft", dx < -6], ["ArrowRight", dx > 6], ["ArrowUp", dy < -6], ["ArrowDown", dy > 6]]) send(c, on);
      G.tick(1 / 60);
    }
    for (const c of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) send(c, false);
    return { near: G.kb.near, secs: Math.round(f / 6) / 10 };
  });
  expect(near.near).toBe(true);
  await shot("keyboard-catch");
  await page.keyboard.press("Enter");
  const caught = await pwp(page, () => ({ state: __pwp.round.b.state, catches: __pwp.round.b.catches, carry: __pwp.kb.carry }));
  expect(caught).toEqual({ state: "return", catches: 1, carry: true });
  await expect(page.locator("#tip")).toHaveText("Gotcha! Scrub quick!");
  // the brush carries him back to the tub, ready to scrub
  await pwp(page, () => __pwp.tick(1 / 60, 30));
  const sit = await pwp(page, () => ({ state: __pwp.round.b.state, carry: __pwp.kb.carry, ...__pwp.brushScreen(), p: __pwp.petScreen() }));
  expect(sit.state).toBe("sit");
  expect(sit.carry).toBe(false);
  expect(Math.hypot(sit.x - sit.p.x, sit.y - sit.p.y)).toBeLessThan(80);
  // then the whole wash from the keyboard, catching him with Enter and Space in turn as he flies off
  await bots(page);
  const res = await page.evaluate(() => keyWashBot({ maxT: 60 }));
  expect(res.mode).toBe("result");
  expect(res.done).toBe(true);
  expect(res.catches.length).toBeGreaterThanOrEqual(1);
  expect(res.catches).toContain("Enter");
  if (res.catches.length > 1) expect(res.catches).toContain("Space");
  const total = await pwp(page, () => __pwp.round.b.catches);
  await pwp(page, () => __pwp.freeze(false));
  note(`Pickles' wash: the brush starts under his flight path; Space from too far away said "Missed!" and he kept flying. Chasing him with the arrows put him in the ring after ${near.secs} s (the screenshot: the ring turns yellow and says "Space!"), and Enter caught him ("Gotcha!"); the brush carried him back to the tub. Then a keyboard-only player washed him clean with ${res.left} s left, catching him ${total} times in all (${["Enter (above)", ...res.catches].join(", ")})`);
  expect(browserErrors).toEqual([]);
});

test("what stays: touch and mouse wash, the payback rounds and Survival play exactly as in jeremy.v3", async ({ page, shot, note, browserErrors }) => {
  await open(page, V3);
  const v3 = await pwp(page, () => JSON.stringify({ pets: __pwp.pets, gear: __pwp.GEAR, speed: __pwp.PLAYER_SPEED, hp: __pwp.HP, every: __pwp.SURV_EVERY }));
  await open(page);
  const v4 = await pwp(page, () => JSON.stringify({ pets: __pwp.pets, gear: __pwp.GEAR, speed: __pwp.PLAYER_SPEED, hp: __pwp.HP, every: __pwp.SURV_EVERY }));
  expect(v4).toBe(v3);
  // the same pointer player, arrow-key dodger and dice: the same results in both versions
  const play = async url => {
    await open(page, url);
    await bots(page);
    return page.evaluate(seed => {
      const out = {};
      for (const i of [0, 4, 7]) {
        __pwp.freeze(true); __pwp.seed(seed + i); __pwp.start(i, "wash");
        const w = washBot(); out["wash" + i] = { mode: w.mode, t: w.t, catches: w.catches, left: Math.round(__pwp.round.time * 100) / 100 };
      }
      __pwp.freeze(true); __pwp.seed(seed); __pwp.start(8, "hose", ["dog", "cat", "squirrel", "bunny", "parrot", "pig", "hippo", "octopus", "duck"]);
      out.hose = hoseBot();
      __pwp.freeze(true); __pwp.seed(seed); __pwp.survival();
      const s = hoseBot({ maxT: 120 }); out.survival = { ...s, time: Math.round(__pwp.round.time * 100) / 100 };
      return out;
    }, SEED);
  };
  const a = await play(V3), b = await play(V4);
  expect(b).toEqual(a);
  expect(b.wash0.mode).toBe("result");
  expect(b.hose.mode).toBe("result");
  // and a real tap: the touch tools still switch
  await open(page);
  await page.locator("#play-btn").click();
  await page.locator("#go-btn").click();
  await page.locator("#tool-2").click();
  expect(await pwp(page, () => __pwp.round.tool)).toBe(2);
  expect(await pwp(page, () => __pwp.kb.on)).toBe(false);
  await pwp(page, () => __pwp.freeze(false));
  note(`pets, weapons, speeds, scrub work and Survival's pace are byte for byte jeremy.v3's. With the same seeds, the pointer player and the arrow-key dodger got identical results in jeremy.v3 and jeremy.v4: Biscuit, Pickles and Inky washed with ${b.wash0.left}, ${b.wash4.left} and ${b.wash7.left} s left; the nine-pet payback ended at ${b.hose.wet}% wet from ${b.hose.hits} hits; a Survival run reached ${b.survival.time} s at ${b.survival.wet}% wet. Started by tapping, the brush stays hidden and tapping Towel picks the towel`);
  expect(browserErrors).toEqual([]);
});

test("saves: what jeremy.v3 saved loads and carries on in jeremy.v4, and the older keys stay as they were", async ({ page, note, browserErrors }) => {
  // what jeremy.v3 writes (best, reached, survival under jeremy.v3.*), plus jeremy.v1's and jeremy.v2's keys and muted
  const before = {
    "gameon.pet-wash-payback.best": JSON.stringify({ total: 4321, pets: { dog: { wash: 3, hose: 2 } } }),
    "gameon.pet-wash-payback.reached": "3",
    "gameon.pet-wash-payback.muted": "true",
    "gameon.pet-wash-payback.jeremy.v2.best": JSON.stringify({ total: 9876, pets: { squirrel: { wash: 2, hose: 2 } } }),
    "gameon.pet-wash-payback.jeremy.v2.reached": "5",
    "gameon.pet-wash-payback.jeremy.v3.best": JSON.stringify({ total: 12345, pets: { dog: { wash: 2, hose: 3 }, parrot: { wash: 3, hose: 2 }, hippo: { wash: 1, hose: 1 } } }),
    "gameon.pet-wash-payback.jeremy.v3.reached": "7",
    "gameon.pet-wash-payback.jeremy.v3.survival": JSON.stringify({ best: 61.3, animals: 13, runs: 4 })
  };
  const old = Object.keys(before).filter(k => !k.includes(".jeremy.v3."));
  await page.addInitScript(values => {
    if (sessionStorage.getItem("seeded")) return;
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    sessionStorage.setItem("seeded", "1");
  }, before);
  await open(page);
  await expect(page.locator("#title-best")).toHaveText("Best score: 12345 points");
  await expect(page.locator("#title-surv")).toHaveText("Best survival: 1:01 with 13 animals chasing");
  await expect(page.locator("#mute-btn")).toHaveClass(/off/);
  await page.locator("#pets-btn").click();
  const cards = page.locator(".petcard");
  await expect(cards).toHaveCount(9);
  await expect(cards.nth(0)).toContainText("Biscuit★3 ☂3");
  await expect(cards.nth(4)).toContainText("Pickles★3 ☂2");
  await expect(cards.nth(6)).toContainText("Bubbles★1 ☂1");
  for (const j of [0, 1, 2, 3, 4, 5, 6]) await expect(cards.nth(j)).toBeEnabled();
  await expect(cards.nth(7)).toBeDisabled();
  // wash Bubbles from the keyboard and run Survival; progress lands in jeremy.v3's keys, same format
  await cards.nth(6).click();
  await freezeAndSeed(page);
  await page.keyboard.press("Enter");
  await bots(page);
  const w = await page.evaluate(() => keyWashBot());
  expect(w.done).toBe(true);
  await page.locator("#next-btn").click();
  await page.locator("#go-btn").click();
  await page.evaluate(() => hoseBot());
  await page.locator("#next-btn").click();                     // on to Inky: reached goes up to 8
  await expect(page.locator("#intro-title")).toHaveText("Wash Inky the Octopus!");
  await pwp(page, () => __pwp.survival());
  await page.evaluate(() => hoseBot({ idle: true, maxT: 600 }));
  await expect(page.locator("#surv-screen")).toBeVisible();
  await pwp(page, () => __pwp.freeze(false));
  await page.reload();
  await expect(page.locator("#play-btn")).toBeVisible();
  const stored = await storage(page);
  for (const k of Object.keys(stored)) expect(k.startsWith("gameon.pet-wash-payback.")).toBe(true);
  expect(Object.keys(stored).sort()).toEqual(Object.keys(before).sort());          // no new keys
  for (const k of old) expect(stored[k], `${k} unchanged`).toBe(before[k]);
  expect(JSON.parse(stored["gameon.pet-wash-payback.jeremy.v3.reached"])).toBe(8);
  const sv = JSON.parse(stored["gameon.pet-wash-payback.jeremy.v3.survival"]);
  expect(sv).toMatchObject({ best: 61.3, animals: 13, runs: 5 });
  const best = JSON.parse(stored["gameon.pet-wash-payback.jeremy.v3.best"]);
  expect(best.total).toBe(12345);
  expect(best.pets.hippo.wash).toBeGreaterThanOrEqual(1);
  // and jeremy.v3 reads what jeremy.v4 just saved
  await page.goto(V3);
  await expect(page.locator("#title-surv")).toHaveText("Best survival: 1:01 with 13 animals chasing");
  await page.locator("#pets-btn").click();
  await expect(page.locator(".petcard").nth(7)).toBeEnabled();
  note(`seeded jeremy.v3's keys (best 12345, reached 7, survival 61.3 s with 13) and jeremy.v1's and jeremy.v2's: jeremy.v4's title shows 12345 and "1:01 with 13 animals chasing", Pick a pet shows the best stars and the first 7 pets open, sound off. After washing Bubbles from the keyboard, her payback and a Survival run: no new keys, jeremy.v3.reached is now 8 and survival runs 5 (best kept), Bubbles' stars ${JSON.stringify(best.pets.hippo)}; jeremy.v1's and jeremy.v2's keys byte for byte the same; jeremy.v3 opens Inky from that save too`);
  expect(browserErrors).toEqual([]);
});

test("the older versions still play: jeremy.v3, jeremy.v2, jeremy.v1 and Kiki's kiki.v1", async ({ page, shot, note, browserErrors }) => {
  const seen = [];
  for (const [id, url, pets] of [["jeremy.v3", V3, 9], ["jeremy.v2", V2, 9], ["jeremy.v1", V1, 5], ["kiki.v1", KIKI, null]]) {
    await open(page, url);
    await page.locator("#play-btn").click();
    if (pets) await expect(page.locator("#intro-kicker")).toHaveText(`Pet 1 of ${pets} · Round 1`);
    else await expect(page.locator("#intro-kicker")).toHaveText(/^Pet 1 of \d+ · Round 1$/);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud")).toBeVisible();
    const label = await page.locator("#hud-pet").textContent();
    expect(label).toMatch(/Wash!$/);
    // the brush is jeremy.v4's alone
    expect(await pwp(page, () => "kb" in __pwp)).toBe(false);
    seen.push(`${id} at ${url}: "${label}"`);
    if (id === "jeremy.v3") await shot("v3-plays");
  }
  const entry = games.find(g => g.slug === SLUG);
  const urls = Object.fromEntries(entry.versions.map(v => [v.id, v.url]));
  expect(urls).toEqual({ "jeremy.v1": V1, "jeremy.v2": V2, "jeremy.v3": V3, "kiki.v1": KIKI, "jeremy.v4": V4 });
  note(`each opens to its title and Play! → Go! starts a wash round: ${seen.join("; ")}. games.json still points every older version at its own folder`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Pet Wash Payback plays jeremy.v4 by default, and its wash round takes the keyboard there", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const entry = games.find(g => g.slug === SLUG);
  expect(entry).toMatchObject({ default: "jeremy.v4", url: V4 });
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("5 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(5);
  await expect(items.nth(0)).toContainText("jeremy.v4");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(items.nth(0)).toContainText("Wash pets with the keyboard");
  await expect(items.nth(1)).toContainText("jeremy.v3");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v4$`));
  const frame = page.frameLocator("#frame");
  await frame.locator("#play-btn").click();
  await frame.locator("#go-btn").click();
  await expect(frame.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await frame.locator("#game").focus().catch(() => {});
  await frame.locator("body").press("ArrowLeft");
  const on = await page.frames().find(f => f !== page.mainFrame() && f.url().includes("/jeremy.v4/")).evaluate(() => __pwp.kb.on);
  expect(on).toBe(true);
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v3`);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  note("card (5 versions) → picker: jeremy.v4 Latest first with its note \"Wash pets with the keyboard\", then jeremy.v3 → jeremy.v4 in the frame: Play! → Go! → an arrow key shows the brush; #pet-wash-payback@jeremy.v3 still opens jeremy.v3");
  expect(browserErrors).toEqual([]);
});
