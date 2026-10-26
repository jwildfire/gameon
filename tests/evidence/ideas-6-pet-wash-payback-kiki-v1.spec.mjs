// Evidence for game idea jwildfire/gameon-ideas#6: Pet Wash Payback kiki.v1, Kiki's fork of jeremy.v2
// ("Meet Leo the Lion, plus a brand-new place to escape the soggy payback!"). Leo the Lion joins as
// the 10th pet, and after the backyard the payback rounds move to a school hallway, a classroom and a
// playground. jeremy.v2 stays the game's default.
// Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/ideas-6-pet-wash-payback-kiki-v1
import { test, expect, games } from "./evidence.mjs";

const SLUG = "pet-wash-payback";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const K1 = `games/${SLUG}/kiki.v1/`;
const ONE_LINER = "Meet Leo the Lion, plus a brand-new place to escape the soggy payback!";
const PETS = ["Biscuit", "Mittens", "The Nutty Gang", "Clover", "Pickles", "Truffle", "Bubbles", "Inky", "Leo", "Sir Quackers"];
const IDS = ["dog", "cat", "squirrel", "bunny", "parrot", "pig", "hippo", "octopus", "lion", "duck"];
const PLACE = ["backyard", "backyard", "backyard", "hallway", "hallway", "classroom", "classroom", "playground", "playground", "playground"];
const PLACE_NAME = { backyard: "Backyard", hallway: "Hallway", classroom: "Classroom", playground: "Playground" };

// Whole rounds run inside the page; give them room on a busy machine.
test.describe.configure({ timeout: 300_000 });

// The game uses Math.random for wobbles and aim; the checks give it a fixed seed, and step the game's
// own clock (window.__pwp: freeze, then tick 1/60 s at a time), so every run plays the same way.
const seeded = page => page.addInitScript(() => {
  let s = 6;
  Math.random = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
});

// ---- Players the checks use (from jeremy.v2's evidence). They run inside the page through the game's
// own update loop, pressing only what a person can: the pointer, the tool keys and the arrow keys.

// Drags the pointer at a capped speed to the nearest spot that needs the current tool and scrubs it
// in little circles, switching tools (with a pause, like a person) when most spots need the next one.
// untilOver: stop as soon as the wash is over (to look at the moment it ends).
function washBot({ speed = 700, switchDelay = 0.35, maxT = 80, untilOver = false } = {}) {
  const G = __pwp, dt = 1 / 60;
  G.freeze(true);
  let t = 0, px = G.layout.W / 2, py = G.layout.H / 2, tool = 0, switching = 0, ang = 0;
  G.setTool(0);
  const move = (tx, ty) => { const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy), step = speed * dt; if (d > step) { px += dx / d * step; py += dy / d * step; } else { px = tx; py = ty; } return d; };
  while (G.mode === "wash" && t < maxT) {
    const r = G.round, b = r.b;
    if (untilOver && r.over) break;
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
  G.freeze(false);
  const r = G.round;
  return { mode: G.mode, t: Math.round(t * 10) / 10, roars: r ? r.roars || 0 : 0, redos: r ? r.redos || 0 : 0 };
}

// Steers with the arrow keys like a careful player: away from the pets, sideways out of streams,
// out of balloon and bucket shadows and from under the rain cloud, away from a hippo about to belly
// flop, a spinning octopus or a lion puffing up his mane, off the puddles, and off the walls.
// idle: never presses anything.
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
        const loud = f.st === "jump" || f.st === "puff" || f.st === "shake" || ((f.weapon === "octo") && (f.st === "aim" || f.st === "spray"));
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
  return { mode: G.mode, wet: Math.round(r0.wet), soaked: r0.soaked, hits: r0.hits, hitsBy: r0.hitsBy, n: r0.ids.length, place: r0.place.id };
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
async function open(page, url = K1) {
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

test("kiki.v1 opens to its title screen with Leo in the tub, and Play starts Biscuit's wash, with nothing loaded from outside the site", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Pet Wash");
  await expect(page.locator("#title-screen .tag")).toHaveText(ONE_LINER);
  await expect(page.locator("#title-best")).toHaveText("Ten pets. Two rounds each. Four places to get soaked.");
  expect(await pwp(page, () => __pwp.pets.map(p => p.id))).toEqual(IDS);
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 10 · Round 1");
  await expect(page.locator("#intro-title")).toHaveText("Wash Biscuit the Dog!");
  await expect(page.locator("#intro-place")).toHaveText("Payback next: Backyard");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await expect(page.locator("#tools")).toBeVisible();
  const r = await pwp(page, () => ({ mode: __pwp.mode, spots: __pwp.round.spots.length, time: __pwp.round.total }));
  expect(r).toEqual({ mode: "wash", spots: 7, time: 35 });
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`title shows the one-liner and Leo at the back of the tub; 10 pets (${IDS.join(", ")}); Play → "Pet 1 of 10" → Biscuit in the tub with ${r.spots} mud spots and ${r.time} s; no requests outside the site (jeremy.v2 made none either); no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("Leo the Lion: mane mud takes extra scrubbing, his roar blows the bubbles off a soapy spot, and he shakes his mane dry", async ({ page, shot, note, browserErrors }) => {
  await startRound(page, 8, "wash");
  await expect(page.locator("#hud-pet")).toHaveText("Leo · Wash!");
  // the same little scrubbing circles on a normal spot and on a mane spot, with his roar held off
  const scrub = await pwp(page, () => {
    const G = __pwp; G.freeze(true); G.tick(1 / 60);
    const r = G.round; r.b.roarT = 1e9;
    const frames = j => {
      let n = 0, a = 0;
      while (r.spots[j].stage === 0 && n < 2000) { a += 0.37; const p = G.spotLogical(j); G.setPointer(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, true); G.tick(1 / 60); n++; }
      G.setPointer(0, 0, false); G.tick(1 / 60);
      return n;
    };
    const plain = r.spots.findIndex(s => !s.mane), mane = r.spots.findIndex(s => s.mane);
    return { maneSpots: r.spots.filter(s => s.mane).length, n: r.spots.length, hp: [r.spots[plain].hp, r.spots[mane].hp], plain: frames(plain), mane: frames(mane), HP0: G.HP[0] };
  });
  expect(scrub.n).toBe(10);
  expect(scrub.maneSpots).toBeGreaterThanOrEqual(3);
  expect(scrub.hp).toEqual([scrub.HP0, scrub.HP0 * 1.75]);
  expect(scrub.mane / scrub.plain).toBeGreaterThan(1.4);
  // the roar: soap a spot, then his mane puffs up as he breathes in, and the ROAR blows its bubbles off
  await pwp(page, () => { __pwp.freeze(false); __pwp.start(8, "wash"); });
  const roar = await pwp(page, () => {
    const G = __pwp; G.freeze(true);
    const r = G.round;
    let a = 0, n = 0;
    while (!r.spots.some(s => s.stage === 1) && n < 600) { a += 0.37; const p = G.spotLogical(0); G.setPointer(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, true); G.tick(1 / 60); n++; }
    G.setPointer(0, 0, false);
    const soapy = r.spots.filter(s => s.stage === 1).length;
    let t = 0;
    while (!(r.b.breath > 0) && t < 10) { G.tick(1 / 60); t += 1 / 60; }
    const breathAt = t, tipBreath = document.getElementById("tip").textContent;
    while (!(r.b.roar > 0) && t < 12) { G.tick(1 / 60); t += 1 / 60; }
    const warn = t - breathAt;
    G.tick(1 / 60, 20);
    return { soapy, after: r.spots.filter(s => s.stage === 1).length, redos: r.redos, roars: r.roars, breathAt: Math.round(breathAt * 10) / 10, warn: Math.round(warn * 10) / 10, tipBreath, tipRoar: document.getElementById("tip").textContent };
  });
  expect(roar.soapy).toBe(1);
  expect(roar.tipBreath).toContain("Leo takes a BIG breath");
  expect(roar.warn).toBeGreaterThanOrEqual(0.9);
  expect(roar).toMatchObject({ after: 0, redos: 1, roars: 1 });
  expect(roar.tipRoar).toContain("The bubbles blew right off");
  await shot("leo-roar");
  // the rest of the bath, roars and all, then the mane shake
  const bath = await page.evaluate(`(${washBot})({ untilOver: true })`);
  const end = await pwp(page, () => { const r = __pwp.round; return { done: r.done, left: Math.round(r.time), dry: r.b.dryShake > 0, tip: document.getElementById("tip").textContent, roars: r.roars, redos: r.redos }; });
  expect(end).toMatchObject({ done: true, dry: true });
  expect(end.tip).toContain("Leo shakes his mane dry");
  await pwp(page, () => { __pwp.freeze(true); __pwp.tick(1 / 60, 24); });
  await shot("leo-shake");
  const fin = await pwp(page, () => { let n = 0; while (__pwp.mode === "wash" && n < 400) { __pwp.tick(1 / 60); n++; } __pwp.freeze(false); return { mode: __pwp.mode, stars: __pwp.run.scores[8].wash.stars }; });
  expect(fin.mode).toBe("result");
  expect(fin.stars).toBeGreaterThanOrEqual(2);
  await expect(page.locator("#result-title")).toHaveText(/Super speedy scrub!|Squeaky clean!/);
  note(`${scrub.maneSpots} of Leo's ${scrub.n} spots are in his mane and need ${scrub.hp[1]} soap work instead of ${scrub.hp[0]}: the same scrubbing took ${scrub.mane} frames there against ${scrub.plain} on a plain spot. With one spot soapy, he breathed in after ${roar.breathAt} s ("${roar.tipBreath}"), roared ${roar.warn} s later and that spot went back to mud ("${roar.tipRoar}"). Bath finished with ${end.left} s left after ${end.roars} roars (${end.redos} spots redone), then "${end.tip}"; ${fin.stars} stars`);
  expect(browserErrors).toEqual([]);
});

test("Leo's payback: his mane puffs up as the warning, then rings of drops fly out all around him, and the slide blocks them", async ({ page, shot, note, browserErrors }) => {
  await startRound(page, 8, "hose", ["lion"]);
  await expect(page.locator("#hud-pet")).toHaveText("Leo · Payback!");
  const open1 = await pwp(page, () => {
    const G = __pwp; G.freeze(true);
    const r = G.round, me = r.player, Y = r.Y, leo = r.foes[0];
    me.x = Y.x0 + Y.w * 0.42; me.y = Y.y0 + Y.h * 0.5;     // out in the open
    let t = 0;
    while (leo.st !== "puff" && t < 10) { G.tick(1 / 60); t += 1 / 60; }
    const puffAt = t, dropsAtPuff = r.drops.length, distAtPuff = Math.round(Math.hypot(leo.x - me.x, leo.y - me.y));
    // he stopped wherever he caught up; for a clean look at the whole ring, step him to a clear spot
    // 100 px from the kid (nothing that blocks water within 80 px of him)
    const B = Y.solids.concat(Y.sheets, Y.bushes);
    const gap = (o, x, y) => o.type === "rect" ? Math.hypot(x - Math.max(o.x, Math.min(x, o.x + o.w)), y - Math.max(o.y, Math.min(y, o.y + o.h))) : Math.hypot(x - o.x, y - o.y) - o.r;
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, x = me.x + Math.cos(a) * 100, y = me.y + Math.sin(a) * 100;
      if (x > Y.x0 + 80 && x < Y.x1 - 80 && y > Y.y0 + 80 && y < Y.y1 - 80 && B.every(o => gap(o, x, y) > 80)) { leo.x = x; leo.y = y; break; }
    }
    while (leo.st === "puff" && t < 12) { G.tick(1 / 60); t += 1 / 60; }
    const warn = t - puffAt;
    // the first ring, the moment it leaves his mane
    G.tick(1 / 60);
    const dirs = new Set(r.drops.filter(d => d.kind === "mane").map(d => Math.floor(((Math.atan2(d.vy, d.vx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4))));
    const n = r.drops.filter(d => d.kind === "mane").length;
    G.tick(1 / 60, 14);
    return { place: r.place.id, puffAt: Math.round(puffAt * 10) / 10, warn: Math.round(warn * 100) / 100, dropsAtPuff, distAtPuff, dirs: dirs.size, n, rings: leo.rings };
  });
  expect(open1.place).toBe("playground");
  expect(open1.dropsAtPuff).toBe(0);
  expect(open1.warn).toBeGreaterThanOrEqual(0.8);
  expect(open1.dirs).toBe(8);
  expect(open1.n).toBe(30);
  expect(open1.rings).toBe(2);
  await shot("mane-shake");
  const hit = await pwp(page, () => { const r = __pwp.round; __pwp.tick(1 / 60, 60); return { lion: r.hitsBy.lion || 0, wet: Math.round(r.wet) }; });
  expect(hit.lion).toBeGreaterThanOrEqual(1);
  // now the same shake with the slide between Leo and a kid who stands still on the far side of it
  const cover = await pwp(page, () => {
    const G = __pwp; G.freeze(false); G.start(8, "hose", ["lion"]); G.freeze(true);
    const r = G.round, Y = r.Y, me = r.player, leo = r.foes[0], slide = Y.solids.find(o => o.name === "slide");
    const cy = slide.y + slide.h / 2;
    leo.x = slide.x - 30; leo.y = cy + 10; me.x = slide.x + slide.w + 20; me.y = cy + 10;
    leo.st = "puff"; leo.timer = 0.05;
    let t = 0;
    while (t < 1.5) { G.tick(1 / 60); t += 1 / 60; leo.x = slide.x - 30; leo.y = cy + 10; if (leo.st === "move") leo.timer = 99; }
    return { slide: !!slide, rings: leo.rings, lion: r.hitsBy.lion || 0, wet: Math.round(r.wet), gap: Math.round(me.x - leo.x) };
  });
  expect(cover).toMatchObject({ slide: true, rings: 2, lion: 0, wet: 0 });
  await pwp(page, () => __pwp.freeze(false));
  note(`in the playground, standing out in the open: Leo got within ${open1.distAtPuff} px after ${open1.puffAt} s and puffed up his mane (no water yet) for ${open1.warn} s, then shook: a ring of ${open1.n} drops flying out in all 8 directions, then a second ring; ${hit.lion} of them hit the kid (${hit.wet}% wet). The same two rings with the slide between them, ${cover.gap} px apart: 0 hits, 0% wet`);
  expect(browserErrors).toEqual([]);
});

test("the payback moves to school: three rounds in the backyard, then the hallway, the classroom and the playground, each with its own cover", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  expect(await pwp(page, () => __pwp.pets.map((p, i) => __pwp.placeOf(i)))).toEqual(PLACE);
  // Pick a pet shows each pet's place, and Leo is open from the start
  await page.locator("#pets-btn").click();
  const cards = page.locator(".petcard");
  await expect(cards).toHaveCount(10);
  for (let i = 0; i < 10; i++) await expect(cards.nth(i).locator(".place")).toHaveText(PLACE_NAME[PLACE[i]]);
  await expect(cards.nth(8)).toContainText("Leo");
  await expect(cards.nth(8)).toContainText("NEW!");
  await expect(cards.nth(8)).toBeEnabled();
  await expect(cards.nth(1)).toBeDisabled();
  await shot("pick-a-pet");
  // round intros: the first round in each school place says where you are
  const seen = [];
  const covers = { hallway: ["lockers", "lockers"], classroom: ["desks", "desks", "teacher"], playground: ["slide", "climber"] };
  for (const [i, place, chip, hide] of [[3, "hallway", "At school: Hallway", "lockers"], [5, "classroom", "At school: Classroom", "desks"], [7, "playground", "At school: Playground", "slide"]]) {
    await pwp(page, i => { __pwp.newRun(0); __pwp.showIntro(i, "hose"); }, i);
    await expect(page.locator("#intro-kicker")).toHaveText(`Pet ${i + 1} of 10 · Round 2`);
    await expect(page.locator("#intro-place")).toHaveText(chip);
    await expect(page.locator("#intro-tip")).toContainText("New place:");
    await expect(page.locator("#intro-how")).toContainText(`Hide behind the ${hide}`);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud-pet")).toHaveText(`${i + 1} pets · Payback!`);
    const Y = await pwp(page, () => {
      const r = __pwp.round, Y = r.Y;
      __pwp.freeze(true); __pwp.tick(1 / 60, 90);
      // water stops at every piece of cover: a line straight through each one is blocked, one beside it isn't
      const through = Y.solids.map(o => { const c = o.type === "rect" ? { x: o.x + o.w / 2, y: o.y + o.h / 2 } : o; return __pwp.lineOfSight(c.x - 90, c.y, c.x + 90, c.y); });
      const beside = Y.solids.map(o => { const yb = o.type === "rect" ? o.y + o.h + 24 : o.y + o.r + 24; const cx = o.type === "rect" ? o.x + o.w / 2 : o.x; return __pwp.lineOfSight(cx - 90, yb, cx + 90, yb); });
      return { place: Y.place, solids: Y.solids.map(o => o.name), hides: [...new Set(Y.bushes.map(o => o.name))], line: Y.lineKind, through, beside, tip: document.getElementById("tip").textContent };
    });
    expect(Y.place).toBe(place);
    expect(Y.solids).toEqual(covers[place]);
    expect(Y.through.every(x => x === false)).toBe(true);
    expect(Y.beside.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    expect(Y.tip).toContain("Payback in the");
    if (place !== "playground") await shot(place);
    seen.push(`${place}: ${Y.solids.join(", ")} (water blocked through each), Mittens hides in ${Y.hides.join(", ")}, ${Y.line || "nothing"} on a line`);
    await pwp(page, () => __pwp.freeze(false));
  }
  // and before a wash, the intro says where that pet's payback will be
  await pwp(page, () => __pwp.newRun(5));
  await expect(page.locator("#intro-place")).toHaveText("Payback next: Classroom");
  note(`places by pet: ${PLACE.map((p, i) => `${PETS[i]} ${p}`).join(", ")}. Pick a pet shows them, with Leo open (NEW!). ${seen.join("; ")}`);
  expect(browserErrors).toEqual([]);
});

test("at school every animal keeps its own way of getting you wet, and all ten can be in the playground at once", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startRound(page, 9, "hose", IDS);
  await expect(page.locator("#hud-pet")).toHaveText("10 pets · Payback!");
  const start = await pwp(page, () => { const r = __pwp.round; return { place: r.place.id, foes: r.foes.map(f => f.id), bench: r.bench.map(f => f.id), weapons: [...r.foes, ...r.bench].map(f => f.weapon), cap: r.cap }; });
  const cap = isMobile ? 4 : 5;
  expect(start).toMatchObject({ place: "playground", cap });
  expect(start.foes.slice(0, 2)).toEqual(["duck", "dog"]);
  expect(start.bench.length).toBe(10 - cap);
  expect(new Set(start.weapons).size).toBe(10);
  expect(start.weapons.filter(w => w === "hose")).toEqual(["hose"]);
  const seen = await pwp(page, () => {
    const r = __pwp.round, me = r.player, Y = r.Y, out = { looks: {}, joined: new Set(r.foes.map(f => f.id)) };
    __pwp.freeze(true);
    me.x = Y.x0 + Y.w * 0.4; me.y = Y.y0 + Y.h * 0.45;
    let t = 0;
    while (__pwp.mode === "hose" && t < 40) {
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
    __pwp.freeze(false);
    return { looks: Object.keys(out.looks).sort(), joined: [...out.joined].sort(), t: Math.round(t) };
  });
  expect(seen.joined).toEqual([...IDS].sort());
  // with 10 pets and only a few at a time, the last one to tag in may not get a turn before the bell
  // (each one alone is checked below, in every school place)
  const KINDS = ["balloon", "bucket", "hose", "mane", "mud", "octo", "rain", "sprinkle", "squirt", "wave"];
  expect(seen.looks.every(k => KINDS.includes(k))).toBe(true);
  expect(seen.looks.length).toBeGreaterThanOrEqual(9);
  // on its own, in each school place, each pet gets a kid who stands still out in the open wet
  const solo = await pwp(page, ids => {
    const out = [];
    for (const i of [3, 5, 8]) for (const id of ids) {
      __pwp.freeze(false); __pwp.start(i, "hose", [id]); __pwp.freeze(true);
      const r = __pwp.round, me = r.player, Y = r.Y;
      me.x = Y.x0 + Y.w * 0.4; me.y = Y.y0 + Y.h * 0.45;
      let t = 0;
      while (!r.hitsBy[id] && t < 20 && __pwp.mode === "hose") { __pwp.tick(1 / 60); t += 1 / 60; }
      out.push({ place: r.place.id, id, t: Math.round(t * 10) / 10, hit: !!r.hitsBy[id] });
    }
    __pwp.freeze(false);
    return out;
  }, IDS);
  expect(solo.filter(x => !x.hit)).toEqual([]);
  expect(solo.length).toBe(30);
  const by = p => solo.filter(x => x.place === p).map(x => `${x.id} ${x.t} s`).join(", ");
  note(`all ten in the playground: ${cap} at once (${start.foes.join(", ")}), the rest tag in from the bench; every pet joined in the ${seen.t} s round; ${seen.looks.length} different kinds of water seen (${seen.looks.join(", ")}); exactly one hose. Alone, each got a still kid wet: hallway: ${by("hallway")}; classroom: ${by("classroom")}; playground: ${by("playground")}`);
  expect(browserErrors).toEqual([]);
});

test("payback builds up over the ten rounds and four places: a dodging player escapes most, a still one gets soaked", async ({ page, note, browserErrors }) => {
  await open(page);
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const ids = IDS.slice(0, i + 1);
    await pwp(page, ([i, ids]) => { __pwp.freeze(true); __pwp.start(i, "hose", ids); }, [i, ids]);
    const info = await pwp(page, () => ({ n: __pwp.round.foes.length + __pwp.round.bench.length, total: __pwp.round.total }));
    const bot = await page.evaluate(`(${hoseBot})()`);
    await pwp(page, ([i, ids]) => { __pwp.freeze(true); __pwp.start(i, "hose", ids); }, [i, ids]);
    const idle = await page.evaluate(`(${hoseBot})({ idle: true })`);
    rows.push({ ...info, bot, idle });
  }
  note(rows.map((r, i) => `after ${PETS[i]} (${r.bot.place}): ${r.n} pet${r.n > 1 ? "s" : ""}, ${r.total} s; dodging ${r.bot.soaked ? "SOAKED" : r.bot.wet + "% wet"}, standing still ${r.idle.soaked ? "SOAKED" : r.idle.wet + "% wet"}`).join("; "));
  expect(rows.map(r => r.bot.place)).toEqual(PLACE);
  for (let i = 1; i < 10; i++) { expect(rows[i].n).toBe(i + 1); expect(rows[i].total).toBeGreaterThanOrEqual(rows[i - 1].total); }
  expect(rows.every(r => r.idle.soaked)).toBe(true);
  const escaped = rows.filter(r => !r.bot.soaked).length;
  expect(escaped).toBeGreaterThanOrEqual(8);
  expect(browserErrors).toEqual([]);
});

test("what stays: a real drag soaps, rinses and towels a spot; the arrow keys or a drag joystick run; pause and restart work", async ({ page, isMobile, shot, note, browserErrors }) => {
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
  // the run controls, in the school hallway
  await pwp(page, () => __pwp.start(3, "hose", ["bunny"]));
  await expect(page.locator("#hud-pet")).toHaveText("Clover · Payback!");
  await expect(page.locator("#meter-label")).toHaveText("Wet");
  const before = await pwp(page, () => ({ ...__pwp.round.player }));
  if (isMobile) {
    const J = await pointer(page, true);
    await J.down(150, 500);
    for (let i = 1; i <= 6; i++) { await J.move(150 + i * 10, 500 - i * 6); await page.waitForTimeout(20); }
    await page.waitForTimeout(500);
    await J.up();
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
  const again = await pwp(page, () => ({ t: __pwp.round.time, mode: __pwp.mode, place: __pwp.round.place.id }));
  expect(again).toMatchObject({ mode: "hose", place: "hallway" });
  expect(again.t).toBeGreaterThan(frozen);
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeHidden();
  note(`${isMobile ? "touch drag" : "mouse drag"}: Biscuit's spot 1 went mud → bubbles → wet → clean. In the hallway, ${isMobile ? "dragging the joystick up and right" : "holding → and ↑"} ran the kid from (${Math.round(before.x)}, ${Math.round(before.y)}) to (${Math.round(after.x)}, ${Math.round(after.y)}); paused at ${frozen.toFixed(1)} s and the clock stayed put; Restart started the round over in the hallway; P pauses and unpauses`);
  expect(browserErrors).toEqual([]);
});

test("a whole game through the real buttons: ten pets washed, ten payback rounds across four places, a final score", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await page.locator("#play-btn").click();
  const lines = [];
  let soaks = 0;
  for (let i = 0; i < 10; i++) {
    await expect(page.locator("#intro-kicker")).toHaveText(`Pet ${i + 1} of 10 · Round 1`);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud-pet")).toHaveText(`${PETS[i]} · Wash!`);
    const w = await page.evaluate(`(${washBot})()`);
    expect(w.mode).toBe("result");
    const ws = await pwp(page, i => __pwp.run.scores[i].wash, i);
    expect(ws.done, `${PETS[i]} washed before the timer`).toBe(true);
    await page.locator("#next-btn").click();
    await expect(page.locator("#intro-kicker")).toHaveText(`Pet ${i + 1} of 10 · Round 2`);
    await expect(page.locator("#intro-place")).toHaveText(PLACE[i] === "backyard" ? "In the backyard" : `At school: ${PLACE_NAME[PLACE[i]]}`);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud-pet")).toHaveText(i === 0 ? "Biscuit · Payback!" : `${i + 1} pets · Payback!`);
    const h = await page.evaluate(`(${hoseBot})()`);
    expect(h.n).toBe(i + 1);
    expect(h.place).toBe(PLACE[i]);
    await expect(page.locator("#result-screen")).toBeVisible();
    if (h.soaked) soaks++;
    lines.push(`${PETS[i]}: washed with ${ws.timeLeft} s left, then ${h.n} pet${h.n > 1 ? "s" : ""} in the ${PLACE[i]} → ${h.soaked ? "SOAKED" : h.wet + "% wet"}`);
    await page.locator("#next-btn").click();
  }
  await expect(page.locator("#final-screen")).toBeVisible();
  await expect(page.locator("#final-table tr")).toHaveCount(11);
  await expect(page.locator("#final-best")).toContainText("New best score!");
  expect(soaks).toBeLessThanOrEqual(3);
  const total = await page.locator("#final-total").textContent();
  note(lines.join("; ") + `; final ${total}`);
  await shot("final");
  expect(browserErrors).toEqual([]);
});

test("saves: jeremy.v2's and jeremy.v1's best scores, stars, unlocked pets and sound setting load, and their keys stay as they were", async ({ page, note, browserErrors }) => {
  // what jeremy.v1 writes (best, reached, muted) and what jeremy.v2 writes (jeremy.v2.best, jeremy.v2.reached), as JSON
  const before = {
    "gameon.pet-wash-payback.best": JSON.stringify({ total: 4321, pets: { dog: { wash: 3, hose: 2 }, cat: { wash: 2, hose: 1 }, bunny: { wash: 1, hose: 3 } } }),
    "gameon.pet-wash-payback.reached": "3",
    "gameon.pet-wash-payback.muted": "true",
    "gameon.pet-wash-payback.jeremy.v2.best": JSON.stringify({ total: 7654, pets: { dog: { wash: 2, hose: 3 }, squirrel: { wash: 3, hose: 1 }, parrot: { wash: 2, hose: 2 } } }),
    "gameon.pet-wash-payback.jeremy.v2.reached": "6"
  };
  await page.addInitScript(values => {
    if (sessionStorage.getItem("seeded")) return;
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    sessionStorage.setItem("seeded", "1");
  }, before);
  await open(page);
  await expect(page.locator("#title-best")).toHaveText("Your best with 9 pets (jeremy.v2): 7654 points. Now Leo makes 10!");
  await expect(page.locator("#mute-btn")).toHaveClass(/off/);
  await page.locator("#pets-btn").click();
  const cards = page.locator(".petcard");
  await expect(cards).toHaveCount(10);
  await expect(cards.nth(0)).toContainText("Biscuit★3 ☂3");     // wash from jeremy.v1, dry from jeremy.v2
  await expect(cards.nth(1)).toContainText("Mittens★2 ☂1");
  await expect(cards.nth(2)).toContainText("The Nutty Gang★3 ☂1");
  await expect(cards.nth(3)).toContainText("Clover★1 ☂3");
  await expect(cards.nth(4)).toContainText("Pickles★2 ☂2");
  for (const j of [0, 1, 2, 3, 4, 5]) await expect(cards.nth(j)).toBeEnabled();   // up to Truffle, as in jeremy.v2
  await expect(cards.nth(6)).toBeDisabled();
  await expect(cards.nth(8)).toBeEnabled();                                       // Leo, new here
  await expect(cards.nth(9)).toContainText("Surprise!");
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
  for (const [k, v] of Object.entries(before)) expect(stored[k], `${k} unchanged`).toBe(v);
  const mine = Object.keys(stored).filter(k => !(k in before)).sort();
  expect(mine).toEqual(["gameon.pet-wash-payback.kiki.v1.best", "gameon.pet-wash-payback.kiki.v1.reached"]);
  expect(JSON.parse(stored["gameon.pet-wash-payback.kiki.v1.best"]).pets.dog.wash).toBeGreaterThanOrEqual(1);
  expect(browserErrors).toEqual([]);
  // jeremy.v2 still reads its own saves after kiki.v1 has run
  await page.goto(V2);
  await expect(page.locator("#title-best")).toHaveText("Best score: 7654 points");
  await page.locator("#pets-btn").click();
  await expect(page.locator(".petcard").nth(2)).toContainText("★3 ☂1");
  await expect(page.locator(".petcard").nth(5)).toBeEnabled();
  await expect(page.locator(".petcard").nth(6)).toBeDisabled();
  note(`seeded jeremy.v1's best (4321), reached 3 and muted, and jeremy.v2's best (7654) and reached 6: kiki.v1 shows the 7654 on its title, the better stars of the two in Pick a pet (Biscuit ★3 from v1, ☂3 from v2), the first 6 pets open (up to Truffle) plus Leo, and the sound off. After a round: all five old keys are byte for byte the same; new keys: ${mine.join(", ")}; jeremy.v2 still shows its own best, stars and unlocked pets`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v2 and jeremy.v1 still play at their own folders", async ({ page, shot, note, browserErrors }) => {
  await open(page, V2);
  await expect(page.locator(".title-big")).toHaveText("Pet Wash");
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 9 · Round 1");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await page.waitForTimeout(800);
  expect(await pwp(page, () => __pwp.pets.length)).toBe(9);
  await shot("v2-plays");
  await open(page, V1);
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 5 · Round 1");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.versions.find(v => v.id === "jeremy.v2").url).toBe(V2);
  expect(entry.versions.find(v => v.id === "jeremy.v1").url).toBe(V1);
  note(`jeremy.v2 at ${V2}: "Pet 1 of 9", Biscuit's wash running; jeremy.v1 at ${V1}: "Pet 1 of 5", Biscuit's wash running`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, kiki.v1 is a fork from jeremy.v2 in the version picker and plays in the frame, and the game's default doesn't change", async ({ page, shot, note, browserErrors }) => {
  const entry = games.find(g => g.slug === SLUG);
  const kiki = entry.versions.find(v => v.id === "kiki.v1");
  expect(kiki).toMatchObject({ url: K1, from: "jeremy.v2", idea: 6, idea_repo: "jwildfire/gameon-ideas", note: "Leo the Lion and a new place to run" });
  expect(entry.default).not.toBe("kiki.v1");
  expect(entry.default.startsWith("jeremy.")).toBe(true);
  expect(entry.url).toBe(entry.versions.find(v => v.id === entry.default).url);
  await page.goto("./");
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText(`${entry.versions.length} versions`);
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(entry.versions.length);
  await expect(items.nth(0)).toContainText(entry.default);
  await expect(items.nth(0)).toContainText("Latest");
  const fork = page.locator('#ver-list .ver-item[data-version="kiki.v1"]');
  await expect(fork).toContainText("Leo the Lion and a new place to run");
  await expect(fork).toContainText("Made by kiki, started from jeremy.v2");
  await expect(items.last()).toHaveAttribute("data-version", "kiki.v1");
  await fork.click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@kiki\\.v1$`));
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#title-screen .tag")).toHaveText(ONE_LINER);
  await frame.locator("#play-btn").click();
  await expect(frame.locator("#intro-kicker")).toHaveText("Pet 1 of 10 · Round 1");
  await frame.locator("#go-btn").click();
  await expect(frame.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await shot("arcade");
  note(`card (${entry.versions.length} versions) → picker: ${entry.default} (Latest) first, kiki.v1 last as Kiki's fork ("Made by kiki, started from jeremy.v2") → #${SLUG}@kiki.v1 plays kiki.v1 in the frame ("Pet 1 of 10"); default stays ${entry.default}`);
  expect(browserErrors).toEqual([]);
});
