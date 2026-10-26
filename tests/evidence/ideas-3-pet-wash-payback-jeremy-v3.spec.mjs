// Evidence for game idea jwildfire/gameon-ideas#3: Pet Wash Payback jeremy.v3, Jeremy's update ("A brand-new
// endless chase mode where the pet pack keeps on growing!"). The creator's update, started from
// jeremy.v2, and the new default. The kid's own words are in the private idea.
// Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/ideas-3-pet-wash-payback-jeremy-v3
//
// Every run here is deterministic: the game's clock is frozen and stepped 1/60 s at a time
// (__pwp.freeze / __pwp.tick), and its dice get a fixed seed (__pwp.seed) before each run starts.
// Nothing waits on the real clock.
import { test, expect, games } from "./evidence.mjs";

const SLUG = "pet-wash-payback";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const V3 = `games/${SLUG}/jeremy.v3/`;
const SEED = 3;

test.describe.configure({ timeout: 240_000 });

// ---- Players the checks use (the same ones as jeremy.v2's evidence). They run inside the page through
// the game's own update loop, pressing only what a person can: the pointer, the tool keys, the arrow keys.
// Unlike jeremy.v2's copies, they leave the clock frozen when they finish, so what comes next stays
// deterministic too.
// Drags the pointer at a capped speed to the nearest spot that needs the current tool and scrubs it
// in little circles, switching tools (with a pause, like a person) when most spots need the next one.
// It catches Pickles first when he's flying, waits out Bubbles' dives, and uses another tool while
// Inky holds one.
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
      // chase the parrot and tap him
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

// Steers with the arrow keys like a careful player: away from the pets, sideways out of streams,
// out of balloon and bucket shadows and from under the rain cloud, away from a hippo about to belly
// flop or a spinning octopus, off the puddles, and off the fence. idle: never presses anything.
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
  return { mode: G.mode, wet: Math.round(r0.wet), soaked: r0.soaked, hits: r0.hits, hitsBy: r0.hitsBy, n: r0.ids.length };
}

const pwp = (page, expr, arg) => page.evaluate(expr, arg);
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
async function open(page, url = V3) {
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
}
// Freeze the clock and seed the dice, then press a real button to start.
const freezeAndSeed = (page, seed = SEED) => pwp(page, seed => { __pwp.freeze(true); __pwp.seed(seed); }, seed);

test("jeremy.v3 opens to its title screen with a new Survival button, and loads nothing from outside the site", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Pet Wash");
  await expect(page.locator("#play-btn")).toBeVisible();
  await expect(page.locator("#surv-btn")).toHaveText("Survival!");
  await expect(page.locator("#pets-btn")).toBeVisible();
  await expect(page.locator("#title-best")).toHaveText("Nine pets. Two rounds each. One very wet backyard.");
  await expect(page.locator("#title-surv")).toHaveText("New! Survival: no timer, and the animals keep coming. You're out at 100% wet.");
  await shot("title");
  await page.locator("#surv-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Survival mode");
  await expect(page.locator("#intro-title")).toHaveText("Can you outrun them all?");
  await expect(page.locator("#intro-tip")).toContainText("No timer!");
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("#hud-pet")).toHaveText("1 chasing");
  await expect(page.locator("#hud-time")).toHaveText("0:00");
  await expect(page.locator("#hud-time")).toHaveClass(/big/);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`title shows Play!, Survival! and Pick a pet → Survival! → "Can you outrun them all?" → Go! starts a run at 0:00 with 1 chasing; no requests outside the site (jeremy.v2 made none either); no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("Survival: no timer; Biscuit starts alone with the hose, and more animals keep joining, each with a name tag", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await page.locator("#surv-btn").click();
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  const start = await pwp(page, () => { const r = __pwp.round; return { foes: r.foes.map(f => f.id), weapon: r.foes[0].weapon, bench: r.bench.length, time: r.time, every: __pwp.SURV_EVERY }; });
  expect(start).toEqual({ foes: ["dog"], weapon: "hose", bench: 0, time: 0, every: 5 });
  // Step the clock with the wet meter held at 0, and write down when each animal joins.
  const run = (until) => pwp(page, until => {
    const r = __pwp.round, out = __pwp.__log || (__pwp.__log = { joins: [], tagged: [] });
    let n = r.foes.length + r.bench.length;
    while (r.time < until) {
      __pwp.tick(1 / 60); r.wet = 0;
      const m = r.foes.length + r.bench.length;
      if (m > n) {
        const f = [...r.foes, ...r.bench].find(f => !out.tagged.includes(f));
        out.joins.push({ t: Math.round(r.time * 10) / 10, id: f.id, nick: f.nick, label: f.P.label, tag: f.tagT > 0, onFence: r.bench.includes(f) });
        out.tagged.push(f);
        n = m;
      }
      for (const f of r.foes) if (!out.tagged.includes(f)) out.tagged.push(f);
    }
    return { joins: out.joins, time: r.time, n, mode: __pwp.mode };
  }, until);
  const early = await run(10.4);
  expect(early.joins.map(j => Math.round(j.t))).toEqual([5, 10]);
  await expect(page.locator("#hud-pet")).toHaveText("3 chasing");
  await expect(page.locator("#hud-time")).toHaveText("0:10");
  await expect(page.locator("#hud-time")).not.toHaveClass(/hurry/);
  await shot("survival-joins");
  const later = await run(20.5);
  expect(later.mode).toBe("hose");
  expect(later.joins.map(j => Math.round(j.t))).toEqual([5, 10, 15, 20]);
  expect(later.joins.every(j => j.tag)).toBe(true);
  expect(later.joins.every(j => j.id !== "dog")).toBe(true);
  expect(new Set(later.joins.map(j => j.id)).size).toBe(4);
  await expect(page.locator("#hud-pet")).toHaveText("5 chasing");
  await expect(page.locator("#hud-time")).toHaveText("0:20");
  // the clock counts up, it never counts down
  expect(later.time).toBeGreaterThan(early.time);
  await pwp(page, () => __pwp.freeze(false));
  note(`started with Biscuit alone (the hose); joined at ${later.joins.map(j => `${j.t} s ${j.nick} (${j.label.toLowerCase()})`).join(", ")}, each with a name tag; the HUD said "3 chasing" at 0:10 and "5 chasing" at 0:20, counting up`);
  expect(browserErrors).toEqual([]);
});

test("Survival: past the on-screen cap, new animals wait on the fence and everyone attacks more often", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await page.locator("#surv-btn").click();
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  const cap = isMobile ? 4 : 5;
  // Stand still out in the open with the wet meter held at 0, and time Biscuit's waits between sprays
  // (he always stays in the yard): in the 10 s after the yard fills up, and 20 s later.
  const res = await pwp(page, cap => {
    const r = __pwp.round, me = r.player, Y = r.Y, dog = r.foes[0];
    const rows = [];
    let last = dog.st, n = 1, w0 = cap * 5 + 0.1, w1 = (cap + 4) * 5 + 0.1, waitFrom = null;
    const windows = [{ from: w0, to: w0 + 10, n: 0, waits: [] }, { from: w1, to: w1 + 10, n: 0, waits: [] }];
    while (r.time < w1 + 10) {
      me.x = Y.x0 + Y.w * 0.4; me.y = Y.y0 + Y.h * 0.45;
      __pwp.tick(1 / 60); r.wet = 0;
      if (dog.st === "move" && last === "spray") waitFrom = r.time;
      if (dog.st === "aim" && last !== "aim") {
        for (const w of windows) if (r.time >= w.from && r.time < w.to) { w.n++; if (waitFrom != null) w.waits.push(r.time - waitFrom); }
        waitFrom = null;
      }
      last = dog.st;
      const m = r.foes.length + r.bench.length;
      if (m !== n) { n = m; rows.push({ t: Math.round(r.time), yard: r.foes.length, fence: r.bench.length, fury: Math.round(r.fury * 100) / 100 }); }
    }
    const mean = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100) / 100 : null;
    return { rows, windows: windows.map(w => w.n), waits: windows.map(w => mean(w.waits)), cap: r.cap, yard: r.foes.length, fence: r.bench.length, total: n, time: r.time, dogStill: r.foes[0] === dog, hoses: [...r.foes, ...r.bench].filter(f => f.weapon === "hose").length };
  }, cap);
  expect(res.cap).toBe(cap);
  expect(res.yard).toBe(cap);
  expect(res.total).toBe(1 + Math.floor(res.time / 5));
  expect(res.fence).toBe(res.total - cap);
  expect(res.dogStill).toBe(true);
  expect(res.hoses).toBe(1);
  const atCap = res.rows.find(r => r.yard + r.fence === cap), past = res.rows[res.rows.length - 1];
  expect(atCap.fence).toBe(0);
  expect(res.rows.filter(r => r.yard + r.fence > cap).every(r => r.yard === cap)).toBe(true);
  expect(atCap.fury).toBe(1);
  expect(past.fury).toBeGreaterThan(1.5);
  expect(res.waits[0]).not.toBeNull();
  expect(res.waits[1]).not.toBeNull();
  expect(res.waits[1]).toBeLessThan(res.waits[0] * 0.8);
  await shot("survival-fence");
  await pwp(page, () => __pwp.freeze(false));
  note(`at most ${cap} in the yard on this screen; the rest wait on the fence and tag in (${res.rows.map(r => `${r.t} s: ${r.yard} + ${r.fence} on the fence`).join(", ")}); each one past the cap makes everyone's wait between attacks shorter (×${past.fury} speed by ${past.t} s): standing still, Biscuit waited ${res.waits[0]} s between sprays on average in the 10 s after the yard filled (${res.windows[0]} sprays), and ${res.waits[1]} s twenty seconds later (${res.windows[1]} sprays); still exactly one hose`);
  expect(browserErrors).toEqual([]);
});

test("Survival ends at 100% wet, shows your time and how many were chasing, and saves the best time", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await page.locator("#surv-btn").click();
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  const a = await page.evaluate(`(${hoseBot})({ maxT: 600 })`);
  expect(a.mode).toBe("survived");
  expect(a.soaked).toBe(true);
  expect(a.wet).toBe(100);
  const r1 = await pwp(page, () => { const r = __pwp.round; return { secs: Math.floor(r.time * 10 + 1e-6) / 10, n: r.foes.length + r.bench.length, clock: __pwp.fmtClock(r.time, true) }; });
  await expect(page.locator("#surv-screen")).toBeVisible();
  await expect(page.locator("#surv-time")).toHaveText(r1.clock);
  await expect(page.locator("#surv-line")).toContainText(`You survived ${r1.secs.toFixed(1)} seconds, with ${r1.n} animals chasing you.`);
  await expect(page.locator("#surv-best")).toHaveText("New best time!");
  expect(r1.n).toBe(1 + Math.floor(r1.secs / 5));
  expect(r1.secs).toBeGreaterThan(25);
  const saved1 = JSON.parse((await storage(page))["gameon.pet-wash-payback.jeremy.v3.survival"]);
  expect(saved1).toEqual({ best: r1.secs, animals: r1.n, runs: 1 });
  await shot("survival-end");
  // Try again: a fresh run, and a player who stands still is soaked sooner and doesn't beat the best
  await freezeAndSeed(page, SEED + 1);
  await page.locator("#surv-again").click();
  await expect(page.locator("#hud-pet")).toHaveText("1 chasing");
  await expect(page.locator("#hud-time")).toHaveText("0:00");
  const b = await page.evaluate(`(${hoseBot})({ idle: true, maxT: 600 })`);
  expect(b.mode).toBe("survived");
  const r2 = await pwp(page, () => Math.floor(__pwp.round.time * 10 + 1e-6) / 10);
  expect(r2).toBeLessThan(r1.secs);
  await expect(page.locator("#surv-best")).toHaveText(`Best: ${r1.clock} with ${r1.n} animals`);
  const saved2 = JSON.parse((await storage(page))["gameon.pet-wash-payback.jeremy.v3.survival"]);
  expect(saved2).toEqual({ best: r1.secs, animals: r1.n, runs: 2 });
  // the best shows on the title screen, after a reload too
  await page.reload();
  await expect(page.locator("#play-btn")).toBeVisible();
  await expect(page.locator("#title-surv")).toHaveText(`Best survival: ${await pwp(page, s => __pwp.fmtClock(s), r1.secs)} with ${r1.n} animals chasing`);
  const keys = Object.keys(await storage(page));
  for (const k of keys) expect(k.startsWith("gameon.pet-wash-payback.")).toBe(true);
  note(`a dodging player lasted ${r1.clock} with ${r1.n} animals chasing (Biscuit plus one more per 5 s), then SOAKED at 100%: the end screen showed the time, the count and "New best time!", saved as ${JSON.stringify(saved1)}. Try again → 0:00, 1 chasing; standing still lasted ${r2} s, and the screen showed the best instead. After a reload the title says so too. Keys: ${keys.sort().join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("Survival can be paused, and R starts a fresh run", async ({ page, note, browserErrors }) => {
  await open(page);
  await page.locator("#surv-btn").click();
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  await pwp(page, () => __pwp.tick(1 / 60, 60 * 12));
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeVisible();
  const t = await pwp(page, () => __pwp.round.time);
  await pwp(page, () => __pwp.tick(1 / 60, 120));
  expect(await pwp(page, () => __pwp.round.time)).toBe(t);
  await page.locator("#resume-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  await page.keyboard.press("r");
  const fresh = await pwp(page, () => ({ surv: !!__pwp.round.surv, time: __pwp.round.time, n: __pwp.round.foes.length + __pwp.round.bench.length, mode: __pwp.mode }));
  expect(fresh).toEqual({ surv: true, time: 0, n: 1, mode: "hose" });
  await expect(page.locator("#hud-time")).toHaveText("0:00");
  await pwp(page, () => __pwp.freeze(false));
  note(`paused at ${t.toFixed(1)} s and the clock stayed put; Keep going, then R: a new Survival run at 0:00 with 1 chasing`);
  expect(browserErrors).toEqual([]);
});

test("what stays: the normal game is jeremy.v2's, and plays the same as jeremy.v2 with the same seed", async ({ page, shot, note, browserErrors }) => {
  // the pets and their weapons are jeremy.v2's, exactly
  await open(page, V2);
  const v2 = await pwp(page, () => JSON.stringify({ pets: __pwp.pets, gear: __pwp.GEAR, speed: __pwp.PLAYER_SPEED, hp: __pwp.HP }));
  await open(page);
  const v3 = await pwp(page, () => JSON.stringify({ pets: __pwp.pets, gear: __pwp.GEAR, speed: __pwp.PLAYER_SPEED, hp: __pwp.HP }));
  expect(v3).toBe(v2);
  // the same rounds, the same player, the same dice: the same result in both versions
  const play = async (url) => {
    await open(page, url);
    await page.addScriptTag({ content: `${washBot}\n${hoseBot}` });
    return page.evaluate(seed => {
      const seedIt = () => {
        let s = seed >>> 0;
        const m = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
        if (__pwp.seed) __pwp.seed(seed); else Math.random = m;     // jeremy.v2 rolls Math.random
      };
      const wb = washBot, hb = hoseBot;
      const out = {};
      __pwp.freeze(true); seedIt(); __pwp.start(4, "wash");
      const w = wb(); out.wash = { mode: w.mode, t: w.t, catches: w.catches, left: Math.round(__pwp.round.time * 100) / 100 };
      __pwp.freeze(true); seedIt(); __pwp.start(8, "hose", ["dog", "cat", "squirrel", "bunny", "parrot", "pig", "hippo", "octopus", "duck"]);
      const h = hb(); out.hose = { mode: h.mode, wet: h.wet, soaked: h.soaked, hits: h.hits, hitsBy: h.hitsBy, hud: document.getElementById("result-title").textContent };
      return out;
    }, SEED);
  };
  const a = await play(V2), b = await play(V3);
  expect(b).toEqual(a);
  expect(b.wash.mode).toBe("result");
  expect(b.hose.mode).toBe("result");
  // and through the real buttons: Play! still starts Biscuit's wash, with a countdown
  await open(page);
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 9 · Round 1");
  await expect(page.locator("#intro-title")).toHaveText("Wash Biscuit the Dog!");
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await expect(page.locator("#hud-time")).toHaveText("0:35");
  await page.evaluate(`(${washBot})()`);
  await page.locator("#next-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 9 · Round 2");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Payback!");
  await expect(page.locator("#hud-time")).toHaveText("0:20");
  await expect(page.locator("#hud-time")).not.toHaveClass(/big/);
  await pwp(page, () => __pwp.tick(1 / 60, 210));
  await expect(page.locator("#hud-time")).toHaveText("0:17");
  await shot("normal-payback");
  await page.evaluate(`(${hoseBot})()`);
  await expect(page.locator("#result-screen")).toBeVisible();
  await expect(page.locator("#next-btn")).toHaveText("Next: Mittens");
  await pwp(page, () => __pwp.freeze(false));
  note(`pets, weapons, speeds and scrub work are byte for byte jeremy.v2's. With seed ${SEED}, the same washing and dodging players got the same results in jeremy.v2 and jeremy.v3: Pickles washed with ${b.wash.left} s left (${b.wash.catches} catches), and the nine-pet payback ended "${b.hose.hud}" at ${b.hose.wet}% wet from ${b.hose.hits} hits. Through the buttons: Play! → Biscuit's wash (0:35) → payback counting down 0:20 → 0:17 after 3.5 s → result → "Next: Mittens"`);
  expect(browserErrors).toEqual([]);
});

test("saves: jeremy.v1's and jeremy.v2's saves load, and stay exactly as they were", async ({ page, note, browserErrors }) => {
  // what jeremy.v1 and jeremy.v2 write: best, reached and muted (v1) and jeremy.v2.best / jeremy.v2.reached (v2), as JSON
  const before = {
    "gameon.pet-wash-payback.best": JSON.stringify({ total: 4321, pets: { dog: { wash: 3, hose: 2 }, cat: { wash: 2, hose: 1 } } }),
    "gameon.pet-wash-payback.reached": "3",
    "gameon.pet-wash-payback.muted": "true",
    "gameon.pet-wash-payback.jeremy.v2.best": JSON.stringify({ total: 9876, pets: { dog: { wash: 1, hose: 3 }, squirrel: { wash: 2, hose: 2 }, parrot: { wash: 3, hose: 1 } } }),
    "gameon.pet-wash-payback.jeremy.v2.reached": "6"
  };
  await page.addInitScript(values => {
    if (sessionStorage.getItem("seeded")) return;
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    sessionStorage.setItem("seeded", "1");
  }, before);
  await open(page);
  await expect(page.locator("#title-best")).toHaveText("Best score: 9876 points");
  await expect(page.locator("#mute-btn")).toHaveClass(/off/);
  await page.locator("#pets-btn").click();
  const cards = page.locator(".petcard");
  await expect(cards).toHaveCount(9);
  await expect(cards.nth(0)).toContainText("Biscuit★3 ☂3");       // the better of each
  await expect(cards.nth(1)).toContainText("Mittens★2 ☂1");
  await expect(cards.nth(2)).toContainText("The Nutty Gang★2 ☂2");
  await expect(cards.nth(4)).toContainText("Pickles★3 ☂1");
  for (const j of [0, 1, 2, 3, 4, 5]) await expect(cards.nth(j)).toBeEnabled();   // up to Truffle, as in jeremy.v2
  await expect(cards.nth(6)).toBeDisabled();
  // play Biscuit's two rounds and a Survival run, then reload
  await page.locator("#pets-back").click();
  await page.locator("#play-btn").click();
  await freezeAndSeed(page);
  await page.locator("#go-btn").click();
  await page.evaluate(`(${washBot})()`);
  await page.locator("#next-btn").click();
  await page.locator("#go-btn").click();
  await page.evaluate(`(${hoseBot})()`);
  await expect(page.locator("#result-screen")).toBeVisible();
  await pwp(page, () => __pwp.survival());
  await page.evaluate(`(${hoseBot})({ idle: true, maxT: 600 })`);
  await expect(page.locator("#surv-screen")).toBeVisible();
  await pwp(page, () => __pwp.freeze(false));
  await page.reload();
  await expect(page.locator("#play-btn")).toBeVisible();
  const stored = await storage(page);
  for (const k of Object.keys(stored)) expect(k.startsWith("gameon.pet-wash-payback.")).toBe(true);
  for (const [k, v] of Object.entries(before)) expect(stored[k], `${k} unchanged`).toBe(v);
  const mine = Object.keys(stored).filter(k => !(k in before)).sort();
  expect(mine).toEqual(["gameon.pet-wash-payback.jeremy.v3.best", "gameon.pet-wash-payback.jeremy.v3.reached", "gameon.pet-wash-payback.jeremy.v3.survival"]);
  expect(JSON.parse(stored["gameon.pet-wash-payback.jeremy.v3.reached"])).toBe(6);
  await expect(page.locator("#title-surv")).toHaveText(/^Best survival: \d+:\d\d with \d+ animals? chasing$/);
  // jeremy.v2 and jeremy.v1 still read their own saves after jeremy.v3 has run
  await page.goto(V2);
  await expect(page.locator("#title-best")).toHaveText("Best score: 9876 points");
  await page.locator("#pets-btn").click();
  await expect(page.locator(".petcard").nth(5)).toBeEnabled();
  await expect(page.locator(".petcard").nth(6)).toBeDisabled();
  await page.goto(V1);
  await expect(page.locator("#title-best")).toHaveText("Best score: 4321 points");
  note(`seeded jeremy.v1's keys (best 4321, reached 3, muted) and jeremy.v2's (best 9876, reached 6): jeremy.v3 shows 9876 on its title, the better stars of the two in Pick a pet, the first 6 pets open and the sound off. After Biscuit's two rounds and a Survival run, all five old keys are byte for byte the same; new keys: ${mine.join(", ")}; jeremy.v2 and jeremy.v1 still show their own bests`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v2 and jeremy.v1 still play", async ({ page, shot, note, browserErrors }) => {
  await open(page, V2);
  await expect(page.locator("#surv-btn")).toHaveCount(0);
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 9 · Round 1");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await shot("v2-plays");
  await open(page, V1);
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 5 · Round 1");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.versions.find(v => v.id === "jeremy.v2").url).toBe(V2);
  expect(entry.versions.find(v => v.id === "jeremy.v1").url).toBe(V1);
  note(`jeremy.v2 at ${V2} (no Survival button): "Pet 1 of 9", Biscuit's wash running; jeremy.v1 at ${V1}: "Pet 1 of 5", Biscuit's wash running`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Pet Wash Payback plays jeremy.v3 by default, Survival starts there, and the picker still offers jeremy.v2 and jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const entry = games.find(g => g.slug === SLUG);
  expect(entry).toMatchObject({ default: "jeremy.v3", url: V3 });
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  // 4 since Kiki's fork kiki.v1 (jwildfire/gameon-ideas#6), which lists last, after the creator's versions
  await expect(card).toContainText("4 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText("jeremy.v3");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(items.nth(0)).toContainText("Survival mode");
  await expect(items.nth(1)).toContainText("jeremy.v2");
  await expect(items.nth(2)).toContainText("jeremy.v1");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v3$`));
  const frame = page.frameLocator("#frame");
  await frame.locator("#surv-btn").click();
  await expect(frame.locator("#intro-kicker")).toHaveText("Survival mode");
  await frame.locator("#go-btn").click();
  await expect(frame.locator("#hud-pet")).toHaveText(/^\d+ chasing$/);
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v2`);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  await expect(page.frameLocator("#frame").locator("#surv-btn")).toHaveCount(0);
  note("card (3 versions) → picker: jeremy.v3 Latest first, then jeremy.v2 and jeremy.v1 → jeremy.v3 in the frame: Survival! → Go! → a run with its chasing count; #pet-wash-payback@jeremy.v2 opens jeremy.v2 (no Survival button)");
  expect(browserErrors).toEqual([]);
});
