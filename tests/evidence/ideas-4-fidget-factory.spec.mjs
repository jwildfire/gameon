// Evidence for Fidget Factory, built from game idea jwildfire/gameon-ideas#4.
// Run: npm run evidence -- tests/evidence/ideas-4-fidget-factory
// The game clock is held and stepped by hand (__ff.hold / __ff.step) and the random numbers are
// seeded (__ff.seed), so every run sees the same factory, the same spins and the same coins.
import { test, expect } from "./evidence.mjs";

const GAME = "games/fidget-factory/";
const ff = (page, fn, arg) => page.evaluate(fn, arg);

test.describe.configure({ timeout: 90_000 });

// Open the game with the clock held and the dice seeded.
async function open(page) {
  await page.goto(GAME);
  await expect(page.locator("#make-btn")).toBeVisible();
  await ff(page, () => { __ff.hold(true); __ff.seed(5); });
}
async function tap(page, isMobile, xy) {
  if (isMobile) await page.touchscreen.tap(xy[0], xy[1]); else await page.mouse.click(xy[0], xy[1]);
}
// Design a fidget through the hook, send it through the factory and skip to the end.
async function build(page, d) {
  await page.locator("#make-btn").click();
  await ff(page, d => __ff.setDesign(d), d);
  await page.locator("#build-btn").click();
  await expect(page.locator("#factory")).toBeVisible();
  await page.locator("#skip-btn").click();
  await expect(page.locator("#play")).toBeVisible();
}

test("the title screen opens to the toy workshop, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".logo")).toHaveAttribute("aria-label", "Fidget Factory");
  await expect(page.locator("#title")).toContainText("Designed by Kiki");
  await ff(page, () => __ff.step(1));
  await shot("title");
  await page.locator("#make-btn").click();
  await expect(page.locator("#design")).toBeVisible();
  await expect(page.locator('[data-opts="kind"] .opt')).toHaveCount(4);
  await expect(page.locator('[data-opts="c1"] .opt')).toHaveCount(8);
  await expect(page.locator('[data-opts="pattern"] .opt')).toHaveCount(4);
  await expect(page.locator('[data-opts="shape"] .opt')).toHaveCount(3);
  await expect(page.locator('[data-opts="extras"] .opt')).toHaveCount(4);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note("4 kinds, 8 colours twice, 4 patterns, 3 shapes, 4 extras; no requests outside the site; no sideways scrolling");
  await ff(page, () => __ff.step(0.5));
  await shot("workshop");
  expect(browserErrors).toEqual([]);
});

test("picking parts changes the preview, locked parts cost sparkle coins, and the arrow keys and Enter work", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await page.locator("#make-btn").click();
  await page.locator('[data-row="kind"][data-val="squishy"]').click();
  await page.locator('[data-row="c1"][data-val="4"]').click();
  await page.locator('[data-row="pattern"][data-val="stars"]').click();
  await expect(page.locator("#design-name")).toHaveText("Starry Teal Squishy");
  // the bunny shape and glitter are locked: no coins, no unlock
  await page.locator('[data-row="extras"][data-val="glitter"]').click();
  await expect(page.locator("#toast")).toContainText("Glitter costs 15 sparkle coins");
  expect((await ff(page, () => __ff.design)).glitter).toBe(false);
  // with 25 coins, glitter (15) unlocks and switches on
  await ff(page, () => __ff.setCoins(25));
  await page.locator('[data-row="extras"][data-val="glitter"]').click();
  await expect(page.locator("#toast")).toHaveText("Unlocked Glitter!");
  await expect(page.locator('[data-row="extras"][data-val="glitter"]')).toHaveAttribute("aria-pressed", "true");
  expect((await ff(page, () => __ff.save)).coins).toBe(10);
  await page.locator('[data-row="shape"][data-val="1"]').click(); // Bunny, 10 coins
  await expect(page.locator('[data-row="shape"][data-val="1"]')).toHaveAttribute("aria-pressed", "true");
  expect((await ff(page, () => __ff.save)).coins).toBe(0);
  let how = "tapped Glitter and Bunny";
  if (!isMobile) {
    // keyboard: Down from Kind to Colour, Right twice, Enter picks the next colour
    await page.locator('[data-row="kind"][data-val="squishy"]').focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[data-row="c1"][data-val="4"]')).toBeFocused();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    expect((await ff(page, () => __ff.design)).c1).toBe(6);
    await expect(page.locator("#design-name")).toHaveText("Glittery Purple Squishy");
    how = "clicked Glitter and Bunny, then Down, Right, Right, Enter picked Purple";
  }
  const d = await ff(page, () => __ff.design);
  expect(d).toMatchObject({ kind: "squishy", shape: 1, pattern: "stars", glitter: true });
  note(`with 0 coins Glitter stayed locked; with 25 coins Glitter (15) and the Bunny shape (10) unlocked, leaving 0; ${how}`);
  await ff(page, () => __ff.step(0.3));
  await shot("unlocked");
  expect(browserErrors).toEqual([]);
});

test("the factory makes exactly the fidget that was designed, stage by stage, in about 13 seconds", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await ff(page, () => { __ff.setCoins(0); __ff.unlockAll(); });
  await page.locator("#make-btn").click();
  const want = await ff(page, () => __ff.setDesign({ kind: "popit", shape: 1, c1: 0, c2: 2, pattern: "dots", eyes: true, glitter: false, glow: false, rainbow: true }));
  await page.locator("#build-btn").click();
  await expect(page.locator("#factory")).toBeVisible();
  const T = await ff(page, () => __ff.T);
  const at = async t => ff(page, t => { __ff.step(t - __ff.fac.t); return __ff.fac; }, t);
  let f = await at(T.cutGo + 0.6);
  expect(f.caption).toContain("Cutting out a pop-it");
  f = await at(T.paintGo + 1);
  expect(f.caption).toBe("Spraying your colours... and a rainbow!");
  await shot("factory-paint");
  f = await at(T.hit + 0.1);
  expect(f.caption).toBe("Stamping on the dots...");
  await shot("factory-stamp");
  f = await at(T.done + 0.3);
  expect(f.caption).toBe("Ta-da! Your Rainbow Pop-it!");
  const { id, name, ...made } = f.d;
  const { id: _i, name: _n, ...asked } = want;
  expect(made).toEqual(asked);
  await shot("factory-done");
  await ff(page, T => __ff.step(T.end - __ff.fac.t + 0.05), T);
  await expect(page.locator("#play")).toBeVisible();
  const p = await ff(page, () => __ff.play.d);
  expect(p.id).toBe(id);
  const s = await ff(page, () => __ff.save);
  expect(s.shelf.length).toBe(1);
  expect(s.shelf[0].id).toBe(id);
  note(`the show runs ${T.end} s: cut at ${T.cutGo} s, paint at ${T.paintGo} s, stamp at ${T.hit} s, extras at ${T.extras} s; the toy that comes off the belt matches the design field for field, goes on the shelf and opens to play`);
  expect(browserErrors).toEqual([]);
});

test("a flick spins the spinner, it slows down by itself, and the best spin time and coins are saved", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await build(page, { kind: "spinner", c1: 5, c2: 2, pattern: "stars", shape: 0, eyes: true });
  // a real drag across an arm sets it spinning
  const [x, y] = await ff(page, () => __ff.toPage(0.7, 0));
  await page.mouse.move(x, y - 60); await page.mouse.down();
  await page.mouse.move(x, y, { steps: 3 }); await page.mouse.move(x, y + 60, { steps: 3 }); await page.mouse.up();
  const flick = await ff(page, () => __ff.play.st.w);
  expect(Math.abs(flick)).toBeGreaterThan(2.5);
  expect(await ff(page, () => __ff.play.st.spinning)).toBe(true);
  // Space gives it a known push, so the rest of the check is the same every run
  await ff(page, () => { __ff.play.st.w = 0; __ff.play.st.spinning = false; });
  await page.keyboard.press("Space");
  const w0 = await ff(page, () => __ff.play.st.w);
  expect(w0).toBe(28);
  await ff(page, () => __ff.step(3));
  const w3 = await ff(page, () => __ff.play.st.w);
  expect(w3).toBeLessThan(w0); expect(w3).toBeGreaterThan(5);
  await expect(page.locator("#stat")).toContainText("Spinning 3.0 s");
  await shot("spinning");
  await ff(page, () => __ff.step(25));
  const st = await ff(page, () => ({ w: __ff.play.st.w, last: __ff.play.st.last, spinning: __ff.play.st.spinning }));
  expect(st.w).toBe(0); expect(st.spinning).toBe(false);
  expect(st.last).toBeGreaterThan(15);
  const s = await ff(page, () => __ff.save);
  expect(s.best).toBeCloseTo(st.last, 5);
  expect(s.coins).toBe(Math.floor(st.last / 3));
  await expect(page.locator("#toast")).toContainText("New best spin");
  note(`the drag flicked it at ${Math.abs(flick).toFixed(0)} rad/s; Space pushed it to 28, 3 s later it was at ${w3.toFixed(1)}, and it stopped by itself after ${st.last.toFixed(1)} s: best spin saved, ${s.coins} coins earned`);
  await shot("best-spin");
  expect(browserErrors).toEqual([]);
});

test("pop-it bubbles pop when tapped, Space pops the rest, and flipping it brings them all back with the colours swapped", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await build(page, { kind: "popit", c1: 7, c2: 4, pattern: "dots", shape: 0, eyes: false });
  const n = await ff(page, () => __ff.bubbles());
  for (let i = 0; i < 5; i++) await tap(page, isMobile, await ff(page, i => __ff.bubble(i), i));
  let st = await ff(page, () => __ff.play.st);
  expect(st.pops).toBe(5);
  expect(st.up.slice(0, 5)).toEqual([false, false, false, false, false]);
  expect(st.up.slice(5).every(Boolean)).toBe(true);
  await ff(page, () => __ff.step(0.1));
  await shot("popping");
  for (let i = 5; i < n; i++) await page.keyboard.press("Space");
  st = await ff(page, () => __ff.play.st);
  expect(st.up.some(Boolean)).toBe(false);
  await expect(page.locator("#flip-btn")).toHaveClass(/ready/);
  const coins0 = (await ff(page, () => __ff.save)).coins;
  await page.locator("#flip-btn").click();
  await ff(page, () => __ff.step(0.3));
  st = await ff(page, () => __ff.play.st);
  expect(st.side).toBe(1); expect(st.flips).toBe(1);
  expect(st.up.every(Boolean)).toBe(true);
  expect((await ff(page, () => __ff.save)).coins).toBe(coins0 + 3);
  await ff(page, () => __ff.step(0.4));
  expect(await ff(page, () => __ff.play.st.flipT)).toBe(0);
  note(`${n} bubbles: ${isMobile ? "tapped" : "clicked"} 5, Space popped the other ${n - 5}; Flip it! turned it over (side 2, pink and teal swapped), every bubble came back up and the full board paid 3 coins (${coins0} from pops before)`);
  await shot("flipped");
  expect(browserErrors).toEqual([]);
});

test("the squishy squashes and stretches under a finger and springs back when let go", async ({ page, shot, note, browserErrors }) => {
  await open(page);
  await build(page, { kind: "squishy", c1: 4, c2: 7, pattern: "plain", shape: 0, eyes: false });
  const [x, y] = await ff(page, () => __ff.toPage(0.5, 0));
  await page.mouse.move(x, y); await page.mouse.down();
  await ff(page, () => __ff.step(0.4));
  const pressed = await ff(page, () => ({ sx: __ff.play.st.sx, sy: __ff.play.st.sy }));
  expect(pressed.sy).toBeLessThan(0.8); expect(pressed.sx).toBeGreaterThan(1.1);
  await page.mouse.move(x + 90, y - 20, { steps: 4 });
  await ff(page, () => __ff.step(0.4));
  const pulled = await ff(page, () => Math.max(...__ff.play.st.ox));
  expect(pulled).toBeGreaterThan(0.2);
  await shot("stretched");
  await page.mouse.up();
  expect(await ff(page, () => __ff.play.st.squishes)).toBe(1);
  await ff(page, () => __ff.step(2));
  const rest = await ff(page, () => ({ sy: __ff.play.st.sy, ox: Math.max(...__ff.play.st.ox.map(Math.abs)) }));
  expect(Math.abs(1 - rest.sy)).toBeLessThan(0.03); expect(rest.ox).toBeLessThan(0.03);
  await page.keyboard.press("Space");
  expect(await ff(page, () => __ff.play.st.squishes)).toBe(2);
  note(`holding squashed it to ${pressed.sy.toFixed(2)} tall and ${pressed.sx.toFixed(2)} wide; dragging pulled the edge out ${pulled.toFixed(2)}; 2 s after letting go it was back to shape; Space squished it again`);
  await ff(page, () => __ff.step(0.12));
  await shot("squished");
  expect(browserErrors).toEqual([]);
});

test("the clicky cube's button, switch and slider click, and the arrows turn it to the next face", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await build(page, { kind: "cube", c1: 1, c2: 6, pattern: "stripes", shape: 1, eyes: false });
  await tap(page, isMobile, await ff(page, () => __ff.faceToPage(0, 0)));
  expect(await ff(page, () => __ff.play.st.clicks)).toBe(1);
  // turn to the switch
  await page.locator("#turn-r").click();
  await ff(page, () => __ff.step(0.1));
  await shot("turning");
  await ff(page, () => __ff.step(0.4));
  expect(await ff(page, () => __ff.play.st.face)).toBe(1);
  await expect(page.locator("#stat")).toContainText("Switch (2/6)");
  await tap(page, isMobile, await ff(page, () => __ff.faceToPage(0, 0)));
  expect(await ff(page, () => __ff.play.st.g[1].on)).toBe(true);
  // turn to the slider with the keyboard and drag it from one end to the other
  await page.keyboard.press("ArrowRight");
  await ff(page, () => __ff.step(0.5));
  expect(await ff(page, () => __ff.play.st.face)).toBe(2);
  const a = await ff(page, () => __ff.faceToPage(-0.8, 0)), b = await ff(page, () => __ff.faceToPage(0.8, 0));
  await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 12 }); await page.mouse.up();
  const sl = await ff(page, () => __ff.play.st.g[2]);
  expect(sl.v).toBe(1);
  const clicks = await ff(page, () => __ff.play.st.clicks);
  expect(clicks).toBeGreaterThanOrEqual(10);
  await ff(page, () => __ff.step(0.2));
  note(`button: 1 click; the turn button and ArrowRight turned it to the switch (now on) and the slider; sliding end to end clicked every notch (${clicks} clicks so far)`);
  await shot("slider");
  expect(browserErrors).toEqual([]);
});

test("pause stops the clock, Start over resets the toy, and coins, unlocks, the shelf and best spin survive a reload", async ({ page, note, browserErrors }) => {
  await open(page);
  await build(page, { kind: "popit", c1: 2, c2: 5, pattern: "plain", shape: 0, eyes: true });
  await page.keyboard.press("Space"); await page.keyboard.press("Space");
  expect(await ff(page, () => __ff.play.st.pops)).toBe(2);
  await page.keyboard.press("p");
  await expect(page.locator("#pause")).toBeVisible();
  const t0 = await ff(page, () => __ff.simT);
  await ff(page, () => __ff.step(1));
  expect(await ff(page, () => __ff.paused)).toBe(true);
  await page.locator("#restart-btn").click();
  await expect(page.locator("#pause")).toBeHidden();
  const st = await ff(page, () => __ff.play.st);
  expect(st.pops).toBe(0); expect(st.up.every(Boolean)).toBe(true);
  await ff(page, () => { __ff.setCoins(33); __ff.unlockAll(); });
  const before = await ff(page, () => __ff.save);
  await page.reload();
  await expect(page.locator("#make-btn")).toBeVisible();
  const after = await ff(page, () => __ff.save);
  expect(after.coins).toBe(33);
  expect(after.shelf.map(d => d.id)).toEqual(before.shelf.map(d => d.id));
  expect(after.unlocked).toEqual(before.unlocked);
  await expect(page.locator("#shelf-count")).toHaveText("1");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  for (const k of keys) expect(k.startsWith("gameon.fidget-factory.")).toBe(true);
  note(`pause held the toy still (clock at ${t0.toFixed(2)} s); Start over put all the bubbles back; after a reload: 33 coins, the same shelf and unlocks; save keys: ${keys.join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("the shelf holds 12 fidgets: a full shelf asks you to recycle one, and the game still plays when saving is blocked", async ({ page, shot, note, browserErrors }) => {
  await page.addInitScript(() => {
    const shelf = [];
    const kinds = ["spinner", "popit", "squishy", "cube"], pats = ["plain", "dots", "stripes", "stars"];
    for (let i = 0; i < 12; i++) shelf.push({ id: "s" + i, kind: kinds[i % 4], c1: i % 8, c2: (i + 3) % 8, pattern: pats[(i >> 2) % 4], shape: 0, eyes: i % 3 === 0, glitter: false, glow: false, rainbow: false, name: "Shelf fidget " + (i + 1) });
    if (!sessionStorage.getItem("seeded")) { localStorage.setItem("gameon.fidget-factory.save", JSON.stringify({ coins: 4, unlocked: {}, shelf, best: 12.5, made: 12 })); sessionStorage.setItem("seeded", "1"); }
  });
  await open(page);
  await page.locator("#shelf-btn").click();
  await expect(page.locator("#shelf-grid .slot:not(.empty)")).toHaveCount(12);
  await expect(page.locator("#shelf-n")).toHaveText("12 / 12");
  await expect(page.locator("#shelf-best")).toHaveText("Best spin 12.5 s");
  await shot("shelf-full");
  await page.locator("#shelf-make").click();
  await page.locator("#build-btn").click();
  await expect(page.locator("#shelf")).toBeVisible();
  await expect(page.locator("#toast")).toContainText("Your shelf is full!");
  const bin = page.locator("#shelf-grid .slot").nth(0).locator(".recycle");
  await bin.click(); await expect(bin).toHaveText("Recycle?");
  await bin.click();
  await expect(page.locator("#shelf-grid .slot:not(.empty)")).toHaveCount(11);
  await page.locator("#shelf-grid .slot-play").nth(0).click();
  await expect(page.locator("#play-name")).toHaveText("Shelf fidget 2");
  // blocked storage: every read and write throws, and the game still plays
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  await page.reload();
  await expect(page.locator("#make-btn")).toBeVisible();
  await ff(page, () => { __ff.hold(true); __ff.seed(5); });
  await build(page, { kind: "spinner" });
  await page.keyboard.press("Space");
  await ff(page, () => __ff.step(1));
  expect(await ff(page, () => __ff.play.st.spinning)).toBe(true);
  note(`a seeded shelf of 12 shows 12 of 12; To the factory! sent us back to the shelf; ✕ then Recycle? removed one and a shelf fidget opened to play; with storage blocked a new spinner still built and spun`);
  expect(browserErrors).toEqual([]);
});

// The card is found by its slug, not its place on the shelf: newer games and Editor's Choice picks move it (#194).
test("Fidget Factory has a card in the arcade and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#fidget-factory"]');
  await expect(card).toBeVisible();
  await expect(card.locator("h2")).toHaveText("Fidget Factory");
  await expect(card).toContainText("Made by Kiki");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Fidget Factory");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/fidget-factory");
  const frame = page.frameLocator("#frame");
  await frame.locator("#make-btn").click();
  await expect(frame.locator("#design")).toBeVisible();
  await frame.locator("#build-btn").click();
  await expect(frame.locator("#factory")).toBeVisible();
  await frame.locator("#skip-btn").click();
  await expect(frame.locator("#play")).toBeVisible();
  note(`card on the shelf with its 800x450 cover and "Made by Kiki"; inside the frame it went workshop, factory (skipped), play`);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
