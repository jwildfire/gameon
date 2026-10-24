// Evidence for game idea #157, Pet Wash Payback ("game where you're trying to wash pets (dog, cat, etc)
// as fast as possible in round 1 and then the pet is trying to wash you with a hose in round 2 and
// you're trying to escape and stay dry.").
// Run: npm run evidence -- tests/evidence/157-pet-wash-payback
import { test, expect, games } from "./evidence.mjs";

const GAME = "games/pet-wash-payback/";
const PETS = ["Biscuit", "Mittens", "Clover", "Truffle", "Sir Quackers"];

// Some checks play whole rounds; give them room on a busy machine.
test.describe.configure({ timeout: 120_000 });

// ---- Players the checks use. They run inside the page through the game's own update loop
// (clock frozen, 1/60 s steps), pressing only what a person can: the pointer, the tool keys and
// the arrow keys.

// Drags the pointer at a capped speed to the nearest spot that needs the current tool and scrubs it
// in little circles, switching tools (with a pause, like a person) when most spots need the next one.
function washBot({ speed = 700, switchDelay = 0.35, maxT = 80 } = {}) {
  const G = __pwp, dt = 1 / 60;
  G.freeze(true);
  let t = 0, px = G.layout.W / 2, py = G.layout.H / 2, tool = 0, switching = 0, ang = 0;
  G.setTool(0);
  while (G.mode === "wash" && t < maxT) {
    const r = G.round;
    if (!r.over) {
      const n = [0, 0, 0]; r.spots.forEach(s => { if (s.stage < 3) n[s.stage]++; });
      const want = n.indexOf(Math.max(...n));
      if (want !== tool && Math.max(...n) > 0 && switching <= 0) switching = switchDelay;
      if (switching > 0) { switching -= dt; G.setPointer(px, py, false); if (switching <= 0) { tool = want; G.setTool(tool); } }
      else {
        let best = -1, bd = 1e9;
        r.spots.forEach((s, j) => { if (s.stage === tool) { const p = G.spotLogical(j), d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; best = j; } } });
        if (best < 0) { const any = r.spots.findIndex(s => s.stage < 3); if (any >= 0) { tool = r.spots[any].stage; G.setTool(tool); } }
        else {
          const p = G.spotLogical(best);
          ang += dt * 22;
          const tx = p.x + Math.cos(ang) * 14, ty = p.y + Math.sin(ang) * 14;
          const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy), step = speed * dt;
          if (d > step) { px += dx / d * step; py += dy / d * step; } else { px = tx; py = ty; }
          G.setPointer(px, py, true);
        }
      }
    } else G.setPointer(px, py, false);
    G.tick(dt); t += dt;
  }
  G.setPointer(px, py, false);
  G.freeze(false);
  return { mode: G.mode, t: Math.round(t * 10) / 10 };
}

// Steers with the arrow keys: away from the pet, sideways out of streams of water heading its way,
// away from water-balloon shadows, puddles, the cat's bushes and the fence. idle: never presses anything.
function hoseBot({ idle = false, maxT = 40 } = {}) {
  const G = __pwp, dt = 1 / 60, K = G.keys;
  G.freeze(true);
  let t = 0;
  const r0 = G.round;
  while (G.mode === "hose" && t < maxT) {
    const r = G.round, me = r.player, f = r.foe, Y = r.Y;
    let fx = 0, fy = 0;
    if (!idle) {
      if (f.visible) { const dx = me.x - f.x, dy = me.y - f.y, d = Math.hypot(dx, dy) || 1; const w = Math.max(0, 1 - d / 420); fx += dx / d * w * 1.2; fy += dy / d * w * 1.2; }
      for (const dr of r.drops) {
        const dx = me.x - dr.x, dy = me.y - 8 - dr.y, d = Math.hypot(dx, dy);
        if (d > 160) continue;
        const v = Math.hypot(dr.vx, dr.vy), ux = dr.vx / v, uy = dr.vy / v;
        if (dx * ux + dy * uy < 0) continue;
        const s = (dx * -uy + dy * ux) >= 0 ? 1 : -1;
        fx += -uy * s * (1 - d / 160) * 0.6; fy += ux * s * (1 - d / 160) * 0.6;
      }
      for (const b of r.balloons) {
        let dx = me.x - b.fx, dy = me.y - b.fy, d = Math.hypot(dx, dy);
        if (d >= 110) continue;
        if (d < 8) {
          const ax = me.x - f.x, ay = me.y - f.y, n = Math.hypot(ax, ay) || 1; dx = -ay / n; dy = ax / n;
          const cx = (Y.x0 + Y.x1) / 2 - me.x, cy = (Y.y0 + Y.y1) / 2 - me.y; if (dx * cx + dy * cy < 0) { dx = -dx; dy = -dy; } d = 1;
        }
        fx += dx / d * 2.2; fy += dy / d * 2.2;
      }
      for (const p of r.puddles) { const dx = me.x - p.x, dy = me.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < 60) { fx += dx / d * 0.6; fy += dy / d * 0.6; } }
      if (r.pet.id === "cat") for (const b of Y.bushes) { const dx = me.x - b.x, dy = me.y - b.y, d = Math.hypot(dx, dy) || 1; if (d < 200) { fx += dx / d * (1 - d / 200); fy += dy / d * (1 - d / 200); } }
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
  return { mode: G.mode, wet: Math.round(r0.wet), soaked: r0.soaked, hits: r0.hits };
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

async function startRound(page, i, kind) {
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
  await pwp(page, ([i, kind]) => __pwp.start(i, kind), [i, kind]);
  await expect(page.locator("#hud")).toBeVisible();
}

test("the title screen opens and Play leads to Biscuit's wash, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(GAME);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Pet Wash");
  await expect(page.locator("#title-screen")).toContainText("Designed by Jeremy");
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-screen")).toBeVisible();
  await expect(page.locator("#intro-title")).toHaveText("Wash Biscuit the Dog!");
  await expect(page.locator("#intro-kicker")).toHaveText("Pet 1 of 5 · Round 1");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  await expect(page.locator("#tools")).toBeVisible();
  const r = await pwp(page, () => ({ mode: __pwp.mode, spots: __pwp.round.spots.length, time: __pwp.round.total }));
  expect(r).toEqual({ mode: "wash", spots: 7, time: 35 });
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`Biscuit in the tub with ${r.spots} mud spots and ${r.time} seconds on the clock; soap, rinse and towel buttons; no requests outside the site; no sideways scrolling`);
  await shot("wash-start");
  expect(browserErrors).toEqual([]);
});

test("dragging over a mud spot scrubs it to bubbles, rinses it and towels it dry, with a real mouse or finger", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startRound(page, 0, "wash");
  const P = await pointer(page, isMobile);
  // scrub the first spot in little circles, following it as Biscuit wriggles
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
  expect(await pwp(page, () => __pwp.round.spots[0].stage)).toBe(0);
  expect(await scrub(0, 12_000)).toBe(1);                 // soap: mud -> bubbles
  await shot("scrub");
  if (isMobile) await page.locator("#tool-1").dispatchEvent("pointerdown"); else await page.keyboard.press("2");
  await expect(page.locator("#tool-1")).toHaveClass(/on/);
  expect(await scrub(1, 12_000)).toBe(2);                 // rinse: bubbles -> wet
  if (isMobile) await page.locator("#tool-2").dispatchEvent("pointerdown"); else await page.keyboard.press("3");
  await expect(page.locator("#tool-2")).toHaveClass(/on/);
  expect(await scrub(2, 12_000)).toBe(3);                 // towel: wet -> sparkling
  const p = await pwp(page, () => __pwp.progress());
  expect(p).toBeGreaterThan(0.1);
  note(`${isMobile ? "touch drag" : "mouse drag"}: spot 1 went mud → bubbles → wet → clean; the Clean meter is at ${Math.round(p * 100)}%`);
  expect(browserErrors).toEqual([]);
});

test("the hose round runs with the real controls: arrow keys on a laptop, a drag joystick on a phone", async ({ page, isMobile, shot, note, browserErrors }) => {
  await startRound(page, 0, "hose");
  await expect(page.locator("#hud-pet")).toHaveText("Biscuit · Payback!");
  await expect(page.locator("#meter-label")).toHaveText("Wet");
  const before = await pwp(page, () => ({ ...__pwp.round.player }));
  if (isMobile) {
    const P = await pointer(page, true);
    await P.down(150, 500);
    for (let i = 1; i <= 6; i++) { await P.move(150 + i * 10, 500 - i * 6); await page.waitForTimeout(20); }
    await page.waitForTimeout(500);
    await shot("hose-controls");
    await P.up();
  } else {
    await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(600);
    await shot("hose-controls");
    await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
  }
  const after = await pwp(page, () => ({ ...__pwp.round.player }));
  expect(after.x).toBeGreaterThan(before.x + 40);
  expect(after.y).toBeLessThan(before.y - 20);
  note(`${isMobile ? "dragged the joystick up and right" : "held → and ↑"}: the kid ran from (${Math.round(before.x)}, ${Math.round(before.y)}) to (${Math.round(after.x)}, ${Math.round(after.y)})`);
  expect(browserErrors).toEqual([]);
});

test("each pet sprays its own way: the cat ambushes from a bush, the bunny sprinkles, the pig leaves mud, the surprise duck throws balloons", async ({ page, shot, note, browserErrors }) => {
  await startRound(page, 1, "hose");
  // Mittens: hidden in the bushes at first, then pops out of one
  const cat = await pwp(page, () => {
    __pwp.freeze(true);
    const r = __pwp.round, seen = { hidden: r.foe.visible === false, lurked: false, sprayed: false, fromBush: false };
    for (let i = 0; i < 60 * 8; i++) {
      __pwp.tick(1 / 60);
      if (r.foe.st === "lurk") { seen.lurked = true; seen.fromBush = r.Y.bushes.some(b => b.x === r.foe.x && b.y === r.foe.y); }
      if (r.foe.st === "spray") seen.sprayed = true;
    }
    __pwp.freeze(false);
    return seen;
  });
  expect(cat).toEqual({ hidden: true, lurked: true, sprayed: true, fromBush: true });
  // Clover: the sprinkler swishes back and forth
  await pwp(page, () => __pwp.start(2, "hose"));
  const bunny = await pwp(page, () => {
    __pwp.freeze(true);
    const r = __pwp.round, aims = [];
    for (let i = 0; i < 60 * 10; i++) { __pwp.tick(1 / 60); if (r.foe.st === "spray") aims.push(r.foe.aim); if (r.foe.st === "hop") aims.hop = true; }
    __pwp.freeze(false);
    return { hopped: !!aims.hop, swish: aims.length ? Math.max(...aims) - Math.min(...aims) : 0 };
  });
  expect(bunny.hopped).toBe(true);
  expect(bunny.swish).toBeGreaterThan(0.6);
  // Truffle: mud puddles, and they slow you down
  await pwp(page, () => __pwp.start(3, "hose"));
  const pig = await pwp(page, () => {
    __pwp.freeze(true);
    const r = __pwp.round;
    for (let i = 0; i < 60 * 4; i++) __pwp.tick(1 / 60);
    const puddles = r.puddles.length;
    // stand in a puddle and run: half speed
    const pd = r.puddles[0];
    r.player.x = pd.x; r.player.y = pd.y; __pwp.keys.right = true; __pwp.tick(1 / 60);
    const slow = Math.hypot(r.player.vx, r.player.vy);
    __pwp.keys.right = false; __pwp.freeze(false);
    return { puddles, slow, wide: r.P.spread };
  });
  expect(pig.puddles).toBeGreaterThan(0);
  expect(pig.slow).toBeLessThan(150);
  // Sir Quackers: balloons with a shadow where they'll splash
  await pwp(page, () => __pwp.start(4, "hose"));
  await page.locator("#hud-pet").waitFor();
  const duck = await pwp(page, () => {
    __pwp.freeze(true);
    const r = __pwp.round;
    let n = 0;
    for (let i = 0; i < 60 * 6 && n < 1; i++) { __pwp.tick(1 / 60); n = r.balloons.length; }
    for (let i = 0; i < 20; i++) __pwp.tick(1 / 60);
    return { balloons: r.balloons.length, name: r.pet.name, shadow: r.balloons[0] ? [Math.round(r.balloons[0].fx), Math.round(r.balloons[0].fy)] : null };
  });
  expect(duck.name).toBe("Sir Quackers");
  expect(duck.balloons).toBeGreaterThan(0);
  await shot("duck-balloons");
  await pwp(page, () => __pwp.freeze(false));
  note(`Mittens waited in a bush, then sprayed from it; Clover hopped and swished her sprinkler ${bunny.swish.toFixed(2)} radians; Truffle left ${pig.puddles} mud puddles that cut your speed to ${Math.round(pig.slow)} (from 205), with a cone ${pig.wide} radians wide; Sir Quackers threw a balloon with its shadow at ${duck.shadow}`);
  expect(browserErrors).toEqual([]);
});

test("a whole game through the real buttons: all 5 pets washed in time and escaped, with a final score", async ({ page, shot, note, browserErrors }) => {
  await page.goto(GAME);
  await page.locator("#play-btn").click();
  const lines = [];
  for (let i = 0; i < 5; i++) {
    await expect(page.locator("#intro-kicker")).toHaveText(`Pet ${i + 1} of 5 · Round 1`);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud-pet")).toHaveText(`${PETS[i]} · Wash!`);
    const w = await page.evaluate(`(${washBot})()`);
    expect(w.mode).toBe("result");
    await expect(page.locator("#result-screen")).toBeVisible();
    const ws = await pwp(page, i => __pwp.run.scores[i].wash, i);
    expect(ws.done, `${PETS[i]} washed before the timer`).toBe(true);
    expect(ws.stars).toBeGreaterThanOrEqual(2);
    if (i === 4) await shot("wash-result");
    await page.locator("#next-btn").click();
    await expect(page.locator("#intro-kicker")).toHaveText(`Pet ${i + 1} of 5 · Round 2`);
    await page.locator("#go-btn").click();
    await expect(page.locator("#hud-pet")).toHaveText(`${PETS[i]} · Payback!`);
    const h = await page.evaluate(`(${hoseBot})()`);
    expect(h.soaked, `${PETS[i]} didn't soak the dodging player`).toBe(false);
    await expect(page.locator("#result-screen")).toBeVisible();
    const hs = await pwp(page, i => __pwp.run.scores[i].hose, i);
    expect(hs.stars).toBeGreaterThanOrEqual(1);
    lines.push(`${PETS[i]}: washed with ${ws.timeLeft}s left (${ws.stars}★), ${hs.wet}% wet (${hs.stars}★)`);
    await page.locator("#next-btn").click();
  }
  await expect(page.locator("#final-screen")).toBeVisible();
  await expect(page.locator("#final-table tr")).toHaveCount(6);
  await expect(page.locator("#final-best")).toContainText("New best score!");
  const total = await page.locator("#final-total").textContent();
  note(lines.join("; ") + `; final ${total}`);
  await shot("final");
  expect(browserErrors).toEqual([]);
});

test("later pets are harder: a player who stands still gets wetter, and the wash clock gets tighter", async ({ page, note, browserErrors }) => {
  await page.goto(GAME);
  const idle = [], wash = [];
  for (let i = 0; i < 5; i++) {
    await pwp(page, i => __pwp.start(i, "hose"), i);
    const h = await page.evaluate(`(${hoseBot})({ idle: true })`);
    idle.push(h);
    await pwp(page, i => __pwp.start(i, "wash"), i);
    wash.push(await pwp(page, () => ({ spots: __pwp.round.spots.length, time: __pwp.round.total })));
  }
  // standing still: Biscuit gets you very wet, and the cat and the duck soak you completely
  expect(idle[0].wet).toBeGreaterThanOrEqual(60);
  expect(idle[1].soaked).toBe(true);
  expect(idle[4].soaked).toBe(true);
  // the wash: more spots per second for later pets
  const pace = wash.map(w => w.spots / w.time);
  expect(pace[4]).toBeGreaterThan(pace[0]);
  expect(pace[3]).toBeGreaterThan(pace[0]);
  note("standing still: " + idle.map((h, i) => `${PETS[i]} ${h.soaked ? "SOAKED" : h.wet + "% wet"}`).join(", ") +
       "; wash: " + wash.map((w, i) => `${PETS[i]} ${w.spots} spots in ${w.time}s`).join(", "));
  expect(browserErrors).toEqual([]);
});

test("the game pauses, and Restart starts the round over", async ({ page, shot, note, browserErrors }) => {
  await startRound(page, 1, "wash");
  await page.waitForTimeout(1200);
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  const frozen = await pwp(page, () => __pwp.round.time);
  await page.waitForTimeout(500);
  expect(await pwp(page, () => __pwp.round.time)).toBe(frozen);
  expect(frozen).toBeLessThan(36);
  await shot("paused");
  await page.locator("#restart-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  const after = await pwp(page, () => ({ t: __pwp.round.time, mode: __pwp.mode, pet: __pwp.round.pet.name }));
  expect(after.mode).toBe("wash");
  expect(after.pet).toBe("Mittens");
  expect(after.t).toBeGreaterThan(frozen);
  // P pauses from the keyboard too
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeHidden();
  note(`paused at ${frozen.toFixed(1)}s left and the clock stayed put; Restart put Mittens back in the tub with a fresh clock; P pauses and unpauses`);
  expect(browserErrors).toEqual([]);
});

test("best stars are saved only under gameon.pet-wash-payback., and Pick a pet shows them", async ({ page, note, browserErrors }) => {
  await startRound(page, 0, "wash");
  await page.evaluate(`(${washBot})()`);
  await page.locator("#next-btn").click();
  await page.locator("#go-btn").click();
  await page.evaluate(`(${hoseBot})()`);
  await expect(page.locator("#result-screen")).toBeVisible();
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.pet-wash-payback.")).toBe(true);
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem("gameon.pet-wash-payback.best")));
  expect(best.pets.dog.wash).toBeGreaterThanOrEqual(1);
  await page.locator("#pets-btn").click();
  await expect(page.locator(".petcard").nth(0)).toContainText(`★${best.pets.dog.wash} ☂${best.pets.dog.hose}`);
  await expect(page.locator(".petcard").nth(1)).toBeEnabled();     // Mittens unlocked
  await expect(page.locator(".petcard").nth(2)).toBeDisabled();
  await expect(page.locator(".petcard").nth(4)).toContainText("Surprise!");
  note(`keys: ${keys.join(", ")}; Biscuit's best ${best.pets.dog.wash}★ wash and ${best.pets.dog.hose}☂ dry still there after a reload; Mittens unlocked, the surprise pet still a secret`);
  expect(browserErrors).toEqual([]);
});

test("Pet Wash Payback has a card near the front of the arcade and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#pet-wash-payback"]');
  await expect(card).toBeVisible();
  // newest pipeline game: after the Editor's Choice games, ahead of the games that were there before it
  const order = await page.locator("#shelf .cart").evaluateAll(cs => cs.map(c => c.getAttribute("href")));
  expect(order.indexOf("#pet-wash-payback")).toBeGreaterThanOrEqual(games.filter(g => g.editorsChoice === true).length);
  expect(order.indexOf("#pet-wash-payback")).toBeLessThan(order.indexOf("#super-sauce-boy"));
  expect(games[0].slug).toBe("pet-wash-payback");
  await expect(card.locator("h2")).toHaveText("Pet Wash Payback");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Pet Wash Payback");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/pet-wash-payback");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".title-big")).toHaveText("Pet Wash");
  await frame.locator("#play-btn").click();
  await frame.locator("#go-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  await expect(frame.locator("#hud-pet")).toHaveText("Biscuit · Wash!");
  note(`card at position ${order.indexOf("#pet-wash-payback") + 1} on the shelf with its 800x450 cover; plays inside the frame; GitHub button opens its folder`);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
