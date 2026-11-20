// Evidence for game idea #163: Pet Wash Payback jeremy.v2, Jeremy's update ("Fun! Make it so there are
// more and funnier types of animals. 10 squirrels. a bird flying around etc. Then make it so you have to
// escape from all the animals in future rounds. give them all different ways to get you wet. only 1 with
// hose. waterguns. etc."). The creator's update, started from jeremy.v1, and the new default.
// Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/163-pet-wash-payback-jeremy-v2
import { test, expect, games } from "./evidence.mjs";

const SLUG = "pet-wash-payback";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const PETS = ["Biscuit", "Mittens", "The Nutty Gang", "Clover", "Pickles", "Truffle", "Bubbles", "Inky", "Sir Quackers"];
const WEAPONS = ["hose", "squirt", "bucket", "sprinkler", "rain", "puddle", "wave", "octo", "balloon"];

// Whole rounds run inside the page; give them room on a busy machine.
test.describe.configure({ timeout: 240_000 });

// The game uses Math.random for wobbles and aim; the checks give it a fixed seed so every run plays
// the same way at each width.
const seeded = page => page.addInitScript(() => {
  let s = 163;
  Math.random = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
});

// ---- Players the checks use. They run inside the page through the game's own update loop (clock
// frozen, 1/60 s steps), pressing only what a person can: the pointer, the tool keys and the arrow keys.

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
  G.freeze(false);
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
  G.freeze(false);
  return { mode: G.mode, wet: Math.round(r0.wet), soaked: r0.soaked, hits: r0.hits, hitsBy: r0.hitsBy, n: r0.ids.length };
}

const pwp = (page, expr, arg) => page.evaluate(expr, arg);

// A finger on a phone (real touch events through the browser), the mouse on a laptop.
async function pointer(page, isMobile) {
  if (!isMobile) return {
    down: async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); },
    move: (x, y) => page.mouse.move(x, y),
    up: () => page.mouse.up()
  };
  const cdp = await page.context().newCDPSession(page);
  return {
    down: (x, y) => cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }),
    move: (x, y) => cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }),
    up: () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  };
}
async function open(page, url = V2) {
  await seeded(page);
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
}
async function startRound(page, i, kind, lineup) {
  await open(page);
  await pwp(page, ([i, kind, lineup]) => __pwp.start(i, kind, lineup), [i, kind, lineup]);
  await expect(page.locator("#hud")).toBeVisible();
}
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));

test("jeremy.v2 opens to its title screen and Play starts Biscuit's wash, with nothing loaded from outside the site", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Pet Wash");
  await expect(page.locator("#title-screen")).toContainText("they all chase you with squirt guns");
  await expect(page.locator("#title-best")).toHaveText("Nine pets. Two rounds each. One very wet backyard.");
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 9 · Round 1");
  await expect(page.locator("#intro-title")).toHaveText("Wash Biscuit the Dog!");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await expect(page.locator("#tools")).toBeVisible();
  const r = await pwp(page, () => ({ mode: __pwp.mode, spots: __pwp.round.spots.length, time: __pwp.round.total }));
  expect(r).toEqual({ mode: "wash", spots: 7, time: 35 });
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`title → "Pet 1 of 9" → Biscuit in the tub with ${r.spots} mud spots and ${r.time} s; no requests outside the site (jeremy.v1 made none either); no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("new in the tub: 10 squirrels that scurry and hop out when clean, and a parrot you tap to catch", async ({ page, isMobile, shot, note, browserErrors }) => {
  // the Nutty Gang
  await startRound(page, 2, "wash");
  await expect(page.locator("#intro-screen")).toBeHidden();
  const gang = await pwp(page, () => {
    __pwp.freeze(true);
    const r = __pwp.round, at = r.spots.map(s => [s.x, s.y]);
    __pwp.tick(1 / 60, 120);
    const moved = r.spots.filter((s, j) => Math.hypot(s.x - at[j][0], s.y - at[j][1]) > 4).length;
    return { n: r.spots.length, moved, pet: r.pet.name };
  });
  expect(gang.n).toBe(10);
  expect(gang.moved).toBeGreaterThanOrEqual(6);
  await expect(page.locator("#hud-pet")).toHaveText("The Nutty Gang · Wash!");
  await shot("squirrels");
  const washed = await page.evaluate(`(${washBot})()`);
  expect(washed.mode).toBe("result");
  const sq = await pwp(page, () => ({ done: __pwp.round.done, perched: __pwp.round.spots.filter(s => s.perched).length, left: Math.round(__pwp.round.time) }));
  expect(sq).toMatchObject({ done: true, perched: 10 });
  // Pickles: flying, scrubbing does nothing; a real tap on him catches him
  await pwp(page, () => { __pwp.freeze(false); __pwp.start(4, "wash"); __pwp.freeze(true); __pwp.tick(1 / 60, 90); });
  const fly = await pwp(page, () => ({ state: __pwp.round.b.state, at: __pwp.petScreen() }));
  expect(fly.state).toBe("fly");
  await shot("parrot-flying");
  const P = await pointer(page, isMobile);
  await P.down(fly.at.x, fly.at.y);
  const caught = await pwp(page, () => { __pwp.tick(1 / 60); const s1 = __pwp.round.b.state; __pwp.tick(1 / 60, 30); return [s1, __pwp.round.b.state, __pwp.round.b.catches]; });
  await P.up();
  expect(caught[0]).toBe("return");
  expect(caught[1]).toBe("sit");
  // ...he sits for a few seconds, then flies off again
  const off = await pwp(page, () => { let t = 0; while (__pwp.round.b.state === "sit" && t < 10) { __pwp.tick(1 / 60); t += 1 / 60; } return { t: Math.round(t * 10) / 10, state: __pwp.round.b.state }; });
  expect(off.state).toBe("fly");
  const parrot = await page.evaluate(`(${washBot})()`);
  expect(parrot.mode).toBe("result");
  expect(await pwp(page, () => __pwp.round.done)).toBe(true);
  expect(parrot.catches).toBeGreaterThanOrEqual(2);
  await pwp(page, () => __pwp.freeze(false));
  note(`the Nutty Gang: ${gang.n} squirrels, ${gang.moved} moved within 2 s; washed with ${sq.left} s left and all 10 hopped up on the tub. Pickles: ${isMobile ? "a finger tap" : "a mouse click"} on him while flying caught him (fly → return → sit); he flew off again after ${off.t} s; washed in ${parrot.catches} catches`);
  expect(browserErrors).toEqual([]);
});

test("new in the tub: the hippo sinks out of reach, and the octopus grabs the tool you're holding", async ({ page, shot, note, browserErrors }) => {
  await startRound(page, 6, "wash");
  const hippo = await pwp(page, () => {
    __pwp.freeze(true);
    const r = __pwp.round;
    let t = 0;
    while (!(r.b.depth > 0.9) && t < 12) { __pwp.tick(1 / 60); t += 1 / 60; }
    // scrub hard right on a spot below the water line: nothing happens
    const j = r.spots.findIndex(s => s.y > -40), hp = r.spots[j].hp, p = __pwp.spotLogical(j);
    for (let i = 0; i < 30; i++) { __pwp.setPointer(p.x + (i % 2 ? 8 : -8), p.y, true); __pwp.tick(1 / 60); }
    __pwp.setPointer(p.x, p.y, false);
    return { sankAt: Math.round(t * 10) / 10, same: r.spots[j].hp === hp && r.spots[j].stage === 0 };
  });
  expect(hippo.same).toBe(true);
  await shot("hippo-under");
  const hippoUp = await pwp(page, () => { const r = __pwp.round; let t = 0; while (r.b.depth > 0.1 && t < 6) { __pwp.tick(1 / 60); t += 1 / 60; } return Math.round(t * 10) / 10; });
  const hw = await page.evaluate(`(${washBot})()`);
  expect(await pwp(page, () => __pwp.round.done)).toBe(true);
  // Inky
  await pwp(page, () => { __pwp.freeze(false); __pwp.start(7, "wash"); __pwp.freeze(true); });
  await page.keyboard.press("2");
  const octo = await pwp(page, () => {
    const r = __pwp.round;
    let t = 0;
    while (!(r.b.snatchT > 0) && t < 10) { __pwp.tick(1 / 60); t += 1 / 60; }
    return { t: Math.round(t * 10) / 10, snatched: r.b.snatched };
  });
  expect(octo.snatched).toBe(1);
  await expect(page.locator("#tool-1")).toHaveClass(/gone/);
  // the stolen tool can't be picked until he gives it back; the others still can
  await page.keyboard.press("1"); await expect(page.locator("#tool-0")).toHaveClass(/on/);
  await page.keyboard.press("2"); await expect(page.locator("#tool-0")).toHaveClass(/on/);
  await pwp(page, () => __pwp.tick(1 / 60, 10));
  await shot("octopus-grab");
  const back = await pwp(page, () => { const r = __pwp.round; let t = 0; while (r.b.snatchT > 0 && t < 6) { __pwp.tick(1 / 60); t += 1 / 60; } return Math.round(t * 10) / 10; });
  await expect(page.locator("#tool-1")).not.toHaveClass(/gone/);
  const ow = await page.evaluate(`(${washBot})()`);
  expect(await pwp(page, () => __pwp.round.done)).toBe(true);
  await pwp(page, () => __pwp.freeze(false));
  note(`Bubbles sank after ${hippo.sankAt} s and scrubbing a spot below the water did nothing; she came back up ${hippoUp} s later; washed with time to spare (${hw.t} s). Inky grabbed the RINSE after ${octo.t} s: its button greys out and pressing 2 keeps the soap; he gave it back ${back} s later; washed in ${ow.t} s`);
  expect(browserErrors).toEqual([]);
});

test("payback: all nine pets come after you, each with its own way to get you wet, and only Biscuit has the hose", async ({ page, isMobile, shot, note, browserErrors }) => {
  const all = ["dog", "cat", "squirrel", "bunny", "parrot", "pig", "hippo", "octopus", "duck"];
  await startRound(page, 8, "hose", all);
  await expect(page.locator("#hud-pet")).toHaveText("9 pets · Payback!");
  const start = await pwp(page, () => {
    const r = __pwp.round;
    return { foes: r.foes.map(f => f.id), bench: r.bench.map(f => f.id), weapons: [...r.foes, ...r.bench].map(f => f.weapon), cap: r.cap, total: r.total };
  });
  const cap = isMobile ? 4 : 5;
  expect(start.cap).toBe(cap);
  expect(start.foes.length).toBe(cap);
  expect(start.bench.length).toBe(9 - cap);
  expect(start.foes.slice(0, 2)).toEqual(["duck", "dog"]);       // the pet you just washed, and the hose
  expect(new Set(start.weapons).size).toBe(9);
  expect(start.weapons.filter(w => w === "hose")).toEqual(["hose"]);
  // a moment in: name tags show who's who
  await pwp(page, () => { __pwp.freeze(true); __pwp.tick(1 / 60, 100); });
  await shot("everyone");
  // Now stand still out in the open for the whole round, with the wet meter held at 0 so it runs to the
  // end, and record what each pet does to you.
  const seen = await pwp(page, () => {
    const r = __pwp.round, me = r.player, Y = r.Y, out = { looks: {}, joined: new Set(r.foes.map(f => f.id)), wet: {} };
    me.x = Y.x0 + Y.w * 0.4; me.y = Y.y0 + Y.h * 0.45;   // out in the open, away from the bushes and the shed
    let t = 0;
    while (__pwp.mode === "hose" && t < 40) {
      const before = r.wet;
      for (const d of r.drops) out.looks[d.kind] = 1;
      if (r.buckets.length) out.looks.bucket = 1;
      if (r.rain.length) out.looks.rain = 1;
      if (r.waves.length) out.looks.wave = 1;
      if (r.splats.some(s => s.kind === "mud")) out.looks.mud = 1;
      if (r.balloons.length) out.looks.balloon = 1;
      r.foes.forEach(f => out.joined.add(f.id));
      __pwp.tick(1 / 60); t += 1 / 60;
      if (r.wet > 50) r.wet = 0;
    }
    return { looks: Object.keys(out.looks).sort(), joined: [...out.joined].sort(), hitsBy: r.hitsBy, t: Math.round(t), mode: __pwp.mode };
  });
  await pwp(page, () => __pwp.freeze(false));
  expect(seen.joined).toEqual([...all].sort());
  expect(seen.looks).toEqual(["balloon", "bucket", "hose", "mud", "octo", "rain", "sprinkle", "squirt", "wave"]);
  const hitters = Object.keys(seen.hitsBy).sort();
  expect(hitters.length).toBeGreaterThanOrEqual(5);
  // and on its own, each pet's weapon gets a player who stands still wet
  const solo = await pwp(page, all => all.map((id, i) => {
    __pwp.freeze(false); __pwp.start(i, "hose", [id]); __pwp.freeze(true);
    const r = __pwp.round, me = r.player, Y = r.Y;
    me.x = Y.x0 + Y.w * 0.4; me.y = Y.y0 + Y.h * 0.45;   // out in the open, away from the bushes and the shed
    let t = 0;
    while (!r.hitsBy[id] && t < 20 && __pwp.mode === "hose") { __pwp.tick(1 / 60); t += 1 / 60; }
    return `${id} (${r.foes[0].P.label.toLowerCase()}) after ${t.toFixed(1)} s`;
  }), all);
  await pwp(page, () => __pwp.freeze(false));
  expect(solo.filter(x => !/after 20\.0 s/.test(x))).toHaveLength(9);
  note(`${cap} chase at once on this screen (${start.foes.join(", ")}), the rest wait on the fence (${start.bench.join(", ")}) and tag in; every pet joined within the ${seen.t} s round; nine different kinds of water seen (${seen.looks.join(", ")}); standing still with all nine, hit by ${hitters.length} of them (${Object.entries(seen.hitsBy).map(([k, v]) => `${k} ${v}`).join(", ")}); exactly one hose. Alone, each one got a still player wet: ${solo.join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("payback builds up round by round: more pets, a longer round, and a dodging player can still escape", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  const rows = [];
  for (let i = 0; i < 9; i++) {
    const ids = await pwp(page, i => __pwp.pets.slice(0, i + 1).map(p => p.id), i);
    // frozen from the start, so each round plays the same way every run
    await pwp(page, ([i, ids]) => { __pwp.freeze(true); __pwp.start(i, "hose", ids); }, [i, ids]);
    const info = await pwp(page, () => ({ n: __pwp.round.foes.length + __pwp.round.bench.length, active: __pwp.round.foes.length, total: __pwp.round.total }));
    const bot = await page.evaluate(`(${hoseBot})()`);
    await pwp(page, ([i, ids]) => { __pwp.freeze(true); __pwp.start(i, "hose", ids); }, [i, ids]);
    const idle = await page.evaluate(`(${hoseBot})({ idle: true })`);
    rows.push({ ...info, bot, idle });
  }
  note(rows.map((r, i) => `round after ${PETS[i]}: ${r.n} pet${r.n > 1 ? "s" : ""} (${r.active} at once), ${r.total} s; dodging ${r.bot.soaked ? "SOAKED" : r.bot.wet + "% wet"}, standing still ${r.idle.soaked ? "SOAKED" : r.idle.wet + "% wet"}`).join("; "));
  for (let i = 1; i < 9; i++) { expect(rows[i].n).toBe(i + 1); expect(rows[i].total).toBeGreaterThanOrEqual(rows[i - 1].total); }
  expect(rows[8].total).toBeGreaterThan(rows[0].total);
  // a player who stands still gets soaked every time; a dodging one escapes most rounds
  expect(rows.every(r => r.idle.soaked)).toBe(true);
  const escaped = rows.filter(r => !r.bot.soaked).length;
  expect(escaped).toBeGreaterThanOrEqual(7);
  expect(rows.slice(0, 3).every(r => !r.bot.soaked)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test("what stays: dragging over a spot soaps, rinses and towels it, with a real mouse or finger", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startRound(page, 0, "wash");
  const P = await pointer(page, isMobile);
  async function scrub(stage, maxMs) {
    const t0 = Date.now();
    let a = 0;
    const s0 = await pwp(page, () => __pwp.spotScreen(0));
    await P.down(s0.x, s0.y);
    while (Date.now() - t0 < maxMs) {
      const st = await pwp(page, () => __pwp.round.spots[0].stage);
      if (st > stage) break;
      const s = await pwp(page, () => __pwp.spotScreen(0));
      a += 1.1;
      await P.move(s.x + Math.cos(a) * 14, s.y + Math.sin(a) * 14);
      await page.waitForTimeout(16);
    }
    await P.up();
    return pwp(page, () => __pwp.round.spots[0].stage);
  }
  expect(await scrub(0, 15_000)).toBe(1);
  await shot("scrub");
  if (isMobile) await page.locator("#tool-1").dispatchEvent("pointerdown"); else await page.keyboard.press("2");
  await expect(page.locator("#tool-1")).toHaveClass(/on/);
  expect(await scrub(1, 15_000)).toBe(2);
  if (isMobile) await page.locator("#tool-2").dispatchEvent("pointerdown"); else await page.keyboard.press("3");
  await expect(page.locator("#tool-2")).toHaveClass(/on/);
  expect(await scrub(2, 15_000)).toBe(3);
  const p = await pwp(page, () => __pwp.progress());
  expect(p).toBeGreaterThan(0.1);
  note(`${isMobile ? "touch drag" : "mouse drag"}: Biscuit's spot 1 went mud → bubbles → wet → clean; the Clean meter is at ${Math.round(p * 100)}%`);
  expect(browserErrors).toEqual([]);
});

test("what stays: the run controls (arrow keys or a drag joystick), the wet meter, pause and restart", async ({ page, isMobile, note, browserErrors }) => {
  await startRound(page, 0, "hose");
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Payback!");
  await expect(page.locator("#meter-label")).toHaveText("Wet");
  const before = await pwp(page, () => ({ ...__pwp.round.player }));
  if (isMobile) {
    const P = await pointer(page, true);
    await P.down(150, 500);
    for (let i = 1; i <= 6; i++) { await P.move(150 + i * 10, 500 - i * 6); await page.waitForTimeout(20); }
    await page.waitForTimeout(500);
    await P.up();
  } else {
    await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(600);
    await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
  }
  const after = await pwp(page, () => ({ ...__pwp.round.player }));
  expect(after.x).toBeGreaterThan(before.x + 40);
  expect(after.y).toBeLessThan(before.y - 20);
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  const frozen = await pwp(page, () => __pwp.round.time);
  await page.waitForTimeout(500);
  expect(await pwp(page, () => __pwp.round.time)).toBe(frozen);
  await page.locator("#restart-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  const again = await pwp(page, () => ({ t: __pwp.round.time, mode: __pwp.mode }));
  expect(again.mode).toBe("hose");
  expect(again.t).toBeGreaterThan(frozen);
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeHidden();
  note(`${isMobile ? "dragged the joystick up and right" : "held → and ↑"}: the kid ran from (${Math.round(before.x)}, ${Math.round(before.y)}) to (${Math.round(after.x)}, ${Math.round(after.y)}); paused at ${frozen.toFixed(1)} s and the clock stayed put; Restart started the round over; P pauses and unpauses`);
  expect(browserErrors).toEqual([]);
});

test("a whole game through the real buttons: nine pets washed, nine payback rounds, a final score", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await page.locator("#play-btn").click();
  const lines = [];
  let soaks = 0;
  for (let i = 0; i < 9; i++) {
    await expect(page.locator("#intro-kicker")).toHaveText(`Pet ${i + 1} of 9 · Round 1`);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud-pet")).toHaveText(`${PETS[i]} · Wash!`);
    const w = await page.evaluate(`(${washBot})()`);
    expect(w.mode).toBe("result");
    const ws = await pwp(page, i => __pwp.run.scores[i].wash, i);
    expect(ws.done, `${PETS[i]} washed before the timer`).toBe(true);
    await page.locator("#next-btn").click();
    await expect(page.locator("#intro-kicker")).toHaveText(`Pet ${i + 1} of 9 · Round 2`);
    if (i > 0) await expect(page.locator("#intro-title")).toHaveText(`Payback! ${PETS[i]} joins in!`);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud-pet")).toHaveText(i === 0 ? "Biscuit · Payback!" : `${i + 1} pets · Payback!`);
    const h = await page.evaluate(`(${hoseBot})()`);
    expect(h.n).toBe(i + 1);
    await expect(page.locator("#result-screen")).toBeVisible();
    if (i === 5) await shot("payback-result");
    if (h.soaked) soaks++;
    lines.push(`${PETS[i]}: washed with ${ws.timeLeft} s left, then ${h.n} pet${h.n > 1 ? "s" : ""} → ${h.soaked ? "SOAKED" : h.wet + "% wet"}`);
    await page.locator("#next-btn").click();
  }
  await expect(page.locator("#final-screen")).toBeVisible();
  await expect(page.locator("#final-table tr")).toHaveCount(10);
  await expect(page.locator("#final-best")).toContainText("New best score!");
  expect(soaks).toBeLessThanOrEqual(3);
  const total = await page.locator("#final-total").textContent();
  note(lines.join("; ") + `; final ${total}`);
  await shot("final");
  expect(browserErrors).toEqual([]);
});

test("saves: jeremy.v1's best score, stars, unlocked pets and sound setting load, and jeremy.v1's keys stay as they were", async ({ page, note, browserErrors }) => {
  // what jeremy.v1 writes (game.js in games/pet-wash-payback/): best, reached and muted, as JSON
  const v1 = {
    "gameon.pet-wash-payback.best": JSON.stringify({ total: 4321, pets: { dog: { wash: 3, hose: 2 }, cat: { wash: 2, hose: 1 }, bunny: { wash: 1, hose: 3 } } }),
    "gameon.pet-wash-payback.reached": "3",
    "gameon.pet-wash-payback.muted": "true"
  };
  await page.addInitScript(values => {
    if (sessionStorage.getItem("seeded")) return;
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    sessionStorage.setItem("seeded", "1");
  }, v1);
  await open(page);
  await expect(page.locator("#title-best")).toHaveText("Your best with 5 pets (jeremy.v1): 4321 points. Now there are 9!");
  await expect(page.locator("#mute-btn")).toHaveClass(/off/);
  await page.locator("#pets-btn").click();
  const cards = page.locator(".petcard");
  await expect(cards).toHaveCount(9);
  await expect(cards.nth(0)).toContainText("Biscuit★3 ☂2");
  await expect(cards.nth(1)).toContainText("Mittens★2 ☂1");
  await expect(cards.nth(3)).toContainText("Clover★1 ☂3");
  for (const j of [0, 1, 2, 3]) await expect(cards.nth(j)).toBeEnabled();      // up to Clover, as in jeremy.v1
  await expect(cards.nth(4)).toBeDisabled();
  await expect(cards.nth(8)).toContainText("Surprise!");
  // play Biscuit's two rounds, then reload
  await cards.nth(0).click();
  await page.locator("#go-btn").click();
  await page.evaluate(`(${washBot})()`);
  await page.locator("#next-btn").click();
  await page.locator("#go-btn").click();
  await page.evaluate(`(${hoseBot})()`);
  await expect(page.locator("#result-screen")).toBeVisible();
  await page.reload();
  await expect(page.locator("#play-btn")).toBeVisible();
  const stored = await storage(page);
  for (const k of Object.keys(stored)) expect(k.startsWith("gameon.pet-wash-payback.")).toBe(true);
  for (const [k, v] of Object.entries(v1)) expect(stored[k], `${k} unchanged`).toBe(v);
  const mine = Object.keys(stored).filter(k => !(k in v1)).sort();
  expect(mine).toEqual(["gameon.pet-wash-payback.jeremy.v2.best", "gameon.pet-wash-payback.jeremy.v2.reached"]);
  const best = JSON.parse(stored["gameon.pet-wash-payback.jeremy.v2.best"]);
  expect(best.pets.dog.wash).toBeGreaterThanOrEqual(1);
  expect(browserErrors).toEqual([]);
  // jeremy.v1 still reads its own saves after jeremy.v2 has run
  await page.goto(V1);
  await expect(page.locator("#title-best")).toHaveText("Best score: 4321 points");
  await page.locator("#pets-btn").click();
  await expect(page.locator(".petcard").nth(0)).toContainText("★3 ☂2");
  await expect(page.locator(".petcard").nth(2)).toBeEnabled();
  await expect(page.locator(".petcard").nth(3)).toBeDisabled();
  note(`seeded jeremy.v1's best (4321, Biscuit ★3 ☂2), reached 3 and muted: jeremy.v2 shows the 4321 on its title, those stars in Pick a pet, the first 4 pets open (up to Clover) and the sound off. After a round: jeremy.v1's three keys are byte for byte the same; new keys: ${mine.join(", ")}; jeremy.v1 still shows its best and stars`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/pet-wash-payback/", async ({ page, shot, note, browserErrors }) => {
  await open(page, V1);
  await expect(page.locator(".title-big")).toHaveText("Pet Wash");
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 5 · Round 1");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await page.waitForTimeout(800);
  expect(await pwp(page, () => __pwp.pets.length)).toBe(5);
  const v1 = games.find(g => g.slug === SLUG).versions.find(v => v.id === "jeremy.v1");
  expect(v1.url).toBe(V1);
  await shot("v1-plays");
  note(`jeremy.v1 at ${v1.url}: its own title, "Pet 1 of 5", Biscuit's wash running`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Pet Wash Payback plays jeremy.v2 by default and the picker still offers jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const entry = games.find(g => g.slug === SLUG);
  // Since jeremy.v3 (jwildfire/gameon-ideas#3) jeremy.v3 is the default, listed first; jeremy.v2 comes next.
  // Since jeremy.v4 (#216) jeremy.v4 is first, then jeremy.v3, then jeremy.v2.
  expect(entry.versions.find(v => v.id === "jeremy.v2")).toMatchObject({ url: V2 });
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  // 4 since Kiki's fork kiki.v1 (jwildfire/gameon-ideas#6), which lists last, after the creator's versions; 5 since jeremy.v4
  await expect(card).toContainText("5 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(5);
  await expect(items.nth(2)).toContainText("jeremy.v2");
  await expect(items.nth(2)).toContainText("More animals, and they all want payback");
  await expect(items.nth(3)).toContainText("jeremy.v1");
  await items.nth(2).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", `https://github.com/jwildfire/gameon/tree/main/games/${SLUG}/jeremy.v2`);
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#title-best")).toHaveText(/Nine pets|Best score/);
  await frame.locator("#play-btn").click();
  await expect(frame.locator("#intro-kicker")).toHaveText("Pet 1 of 9 · Round 1");
  await frame.locator("#go-btn").click();
  await expect(frame.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  await page.frameLocator("#frame").locator("#play-btn").click();
  await expect(page.frameLocator("#frame").locator("#intro-kicker")).toHaveText("Pet 1 of 5 · Round 1");
  note("card (2 versions) → picker: jeremy.v2 Latest first, then jeremy.v1 → jeremy.v2 plays in the frame (Pet 1 of 9); #pet-wash-payback@jeremy.v1 opens jeremy.v1 (Pet 1 of 5)");
  expect(browserErrors).toEqual([]);
});
