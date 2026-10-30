// Evidence for game idea #225: Magic Friends, Up We Go! jeremy.v2, Jeremy's phone-and-keyboard pass (the phone bar
// from #187: corner buttons 48 x 48 with 8 px gaps and 8 px from the edge; Easy, Normal and the level buttons 48 px or
// more with 8 px gaps; a pause on P or Escape; keys for Sound, Home and the arrow buttons). The creator's update,
// started from jeremy.v1 at games/magic-friends/jeremy.v1/, and the new default. Spec: the build skill's U6 and
// docs/game-versions.md.
//
// Two checks compare jeremy.v2 with jeremy.v1 side by side, as the player lands on each screen with no scrolling, with
// the same save and the same random numbers: at 375x812, 812x375 and 667x375 (touch, in the phone row) and 1024x768,
// 1280x800 and 1366x768 (mouse, in the desktop row), each with the real fonts and with the fonts blocked (the fallback
// fonts CI may get). One checks every screen's words and buttons; the other checks how much of the game the buttons cover.
// The game's test hook (?test, also in jeremy.v1) sets up each screen; the save check loads without it.
// Run: npm run evidence -- tests/evidence/225-magic-friends-jeremy-v2
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "magic-friends";
const V1 = `games/${SLUG}/jeremy.v1/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const PHONES = [[375, 812], [812, 375], [667, 375]];
const DESKTOPS = [[1024, 768], [1280, 800], [1366, 768]];
const FONTS = ["fonts.googleapis.com", "fonts.gstatic.com"]; // jeremy.v1 loads these too
const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;

test.describe.configure({ timeout: 300_000 });

// A save part way up the climb (worlds 1 to 4 done, level 24 next, Harder unlocked, Normal picked), the same in both versions.
const SAVE = { reached: 23, done: Array.from({ length: 23 }, () => true), hardUnlocked: true, crown: false, diff: 1, pad: false, ver: 4 };
async function seed(ctx, { pad = false, fallback = false } = {}) {
  if (fallback) await ctx.route(FONT_HOSTS, r => r.abort());
  await ctx.addInitScript(s => {
    let t = 12345; // the same random numbers every load
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let z = t; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
    if (!sessionStorage.getItem("b225-seeded")) { localStorage.setItem("mfuwg2", s); localStorage.setItem("mfuwg-muted", "1"); sessionStorage.setItem("b225-seeded", "1"); }
  }, JSON.stringify({ ...SAVE, pad }));
}

// Each screen the player can land on, set up the same way in both versions. v2only: screens jeremy.v1 doesn't have.
const SCREENS = [
  { name: "title", js: "" },
  { name: "how to play (pick a level)", js: "g.setMode('levels')" },
  { name: "a world's levels", js: "g.setMode('levels'); g.openWorld(4)", v2only: true },
  { name: "the witch's intro", js: "g.startLevel(0); g.step(40)" },
  { name: "playing (sea)", js: "g.startLevel(0); g.skipIntro(); g.step(5)", play: true },
  { name: "playing (island)", js: "g.startLevel(10); g.skipIntro(); g.step(5)", play: true },
  { name: "playing (sky)", js: "g.startLevel(30); g.skipIntro(); g.step(5)", play: true },
  { name: "paused", js: "g.startLevel(0); g.skipIntro(); g.step(5); g.pause(true)", v2only: true },
  { name: "level complete", js: "g.startLevel(0); g.skipIntro(); g.setMode('done')" },
  { name: "world complete", js: "g.startLevel(4); g.skipIntro(); g.setMode('worldwin'); g.step(5)" },
  { name: "cartoon", js: "g.startStory('island', 10); g.step(60)" },
  { name: "game won (game over)", js: "g.startLevel(59); g.skipIntro(); g.setMode('win'); g.step(245)" }
];

async function open(page, url, js) {
  await page.goto(url + "?test");
  await expect(page.locator("#game")).toBeVisible();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.fonts.ready);
  if (js) await page.evaluate(`(() => { const g = window.__game; ${js}; g.render(); })()`);
  await page.waitForTimeout(150);
}

// Everything with words or a tap on it: where it is, its font size, whether all of it can be seen without scrolling,
// and whether a button sits on top of any of it. Level squares and world pictures are named by their place.
function measure() {
  const vw = innerWidth, vh = innerHeight;
  const shown = el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity !== 0 && r.width > 0 && r.height > 0 && !el.closest("[hidden]"); };
  const ctrls = [...document.querySelectorAll("button")].filter(shown);
  const dots = [...document.querySelectorAll(".dots .lvb")], thumbs = [...document.querySelectorAll(".env canvas")];
  const items = [];
  for (const el of document.querySelectorAll("h1, h2, p, .nm, .crown, #toast, #caption, #skip, button, .env canvas, .dots .lvb")) {
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    let x0 = 0, y0 = 0, x1 = vw, y1 = vh;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p), pr = p.getBoundingClientRect();
      if (cs.overflowX !== "visible") { x0 = Math.max(x0, pr.left); x1 = Math.min(x1, pr.right); }
      if (cs.overflowY !== "visible") { y0 = Math.max(y0, pr.top); y1 = Math.min(y1, pr.bottom); }
    }
    const whole = x0 <= r.left + 0.5 && y0 <= r.top + 0.5 && x1 >= r.right - 0.5 && y1 >= r.bottom - 0.5;
    let covered = 0;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 2; j++) {
      const x = r.left + 2 + (r.width - 4) * i / 4, y = r.top + 2 + (r.height - 4) * j / 2;
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const hit = document.elementFromPoint(x, y);
      if (!hit || el === hit || el.contains(hit) || hit.contains(el)) continue;
      const on = ctrls.find(c => c === hit || c.contains(hit));
      if (on && !on.contains(el) && !el.contains(on)) covered++;
    }
    const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
    const name = el.matches(".dots .lvb") ? `level square ${dots.indexOf(el) + 1}`
      : el.matches(".env canvas") ? `world picture ${thumbs.indexOf(el) + 1}`
      : el.matches("button.lvb") ? `level button ${label.split(",")[0]}`
      : el.id ? `#${el.id}` : `${el.tagName.toLowerCase()} "${label.slice(0, 40)}"`;
    items.push({ name, x: r.left, y: r.top, w: r.width, h: r.height, font: parseFloat(getComputedStyle(el).fontSize), whole, covered: covered > 0 });
  }
  // How much of the game picture the buttons outside the menus cover (corner, pad), in square CSS px, and of its HUD.
  const cv = document.getElementById("game").getBoundingClientRect(), sc = cv.width / 320;
  const over = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const outside = ctrls.filter(c => !c.closest(".layer")).map(c => c.getBoundingClientRect());
  const area = outside.reduce((s, r) => s + over(r, cv), 0);
  // the HUD: the counter box (game px 4..42 x 4..19) and the climb meter (game px 304..313 x 32..126)
  const hud = (x, y, w, h) => ({ left: cv.left + x * sc, top: cv.top + y * sc, right: cv.left + (x + w) * sc, bottom: cv.top + (y + h) * sc });
  const counter = hud(4, 4, 38, 15), meter = hud(304, 32, 10, Math.min(94, cv.height / sc - 32));
  const hudCovered = outside.reduce((s, r) => s + over(r, counter) + over(r, meter), 0);
  return { vw, vh, items, canvas: { w: cv.width, h: cv.height, area: cv.width * cv.height }, covered: Math.round(area), hudCovered: Math.round(hudCovered) };
}

// Matched by name. jeremy.v1's level squares were buttons; in jeremy.v2 the world card is the button and the same
// squares inside it show progress, so they're matched as "level square N". In play, jeremy.v1's corner (arrow
// buttons, Sound, Home) becomes one Pause button, and those three move into the pause card.
const CORNER = ["#btnPad", "#btnSound", "#btnHome"];
function compare(v1, v2, where, inPlay) {
  const problems = [];
  const byName = new Map(v2.items.map(i => [i.name, i]));
  let checked = 0;
  v1.items.forEach(a => {
    if (!a.whole || a.covered) return; // only what jeremy.v1 showed whole
    const name = a.name, b = byName.get(name);
    if (!b && CORNER.includes(name) && inPlay) {
      const pause = byName.get("#btnPause");
      if (!pause || !pause.whole || pause.covered || pause.w < 48) problems.push(`${where}: ${name} moved to the pause card, but Pause isn't showing whole`);
      checked++;
      return;
    }
    if (!b) { problems.push(`${where}: ${name} is gone`); return; }
    checked++;
    if (!b.whole) problems.push(`${where}: ${name} is cut off (${Math.round(b.y)}..${Math.round(b.y + b.h)} of ${v2.vh})`);
    if (b.covered) problems.push(`${where}: ${name} is covered by a button`);
    if (b.font < a.font - 0.01) problems.push(`${where}: ${name} text got smaller (${a.font} -> ${b.font})`);
    if (b.w < a.w - 0.05 || b.h < a.h - 0.05) problems.push(`${where}: ${name} shrank (${a.w.toFixed(2)}x${a.h.toFixed(2)} -> ${b.w.toFixed(2)}x${b.h.toFixed(2)})`);
  });
  return { problems, checked };
}

test("jeremy.v2 opens to its title and starts a level, with nothing from the internet but jeremy.v1's fonts", async ({ page, isMobile, shot, note, browserErrors }) => {
  const outside = new Set(), home = new URL(test.info().project.use.baseURL).host;
  page.on("request", r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.host !== home) outside.add(u.host); });
  await page.goto(V2);
  await expect(page.locator("#title h1")).toHaveText("Magic Friends, Up We Go!");
  await expect(page.locator("#play")).toBeVisible();
  await page.waitForTimeout(400);
  await shot("title");
  if (isMobile) { const b = await page.locator("#play").boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
  else await page.locator("#play").click();
  await expect(page.locator("#title")).toBeHidden();
  await expect(page.locator("#btnPause")).toBeVisible();
  await page.waitForTimeout(4600); // the witch's intro plays out
  await expect(page.locator("#toast")).toBeVisible();
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  expect([...outside].filter(h => !FONTS.includes(h))).toEqual([]);
  await shot("playing");
  note(`${isMobile ? "tapped" : "clicked"} Play: the witch's intro ran into level 1 and its toast showed; outside requests: ${[...outside].join(", ") || "none"} (Google Fonts, as jeremy.v1); no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("every screen, side by side with jeremy.v1 as the player lands on it: nothing jeremy.v1 showed whole is cut off, covered or smaller, with real fonts and with fallback fonts", async ({ browser, page, isMobile, shot, note }) => {
  const lines = [], problems = [];
  for (const [w, h] of isMobile ? PHONES : DESKTOPS) {
    for (const fallback of [false, true]) {
      const results = {};
      for (const url of [V1, V2]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: isMobile ? 2 : 1, isMobile, hasTouch: isMobile });
        await seed(ctx, { fallback });
        const p = await ctx.newPage();
        const errors = []; p.on("pageerror", e => errors.push(e.message));
        for (const s of SCREENS) {
          if (s.v2only && url === V1) continue;
          await open(p, url, s.js);
          results[url + s.name] = await p.evaluate(measure);
        }
        expect(errors, `${url} at ${w}x${h}`).toEqual([]);
        await ctx.close();
      }
      let checked = 0;
      for (const s of SCREENS) {
        const where = `${w}x${h}${fallback ? " (fallback fonts)" : ""} ${s.name}`;
        const v2 = results[V2 + s.name];
        if (s.v2only) {
          // screens jeremy.v1 doesn't have: everything on them shows whole with no scrolling, nothing covered
          const panel = v2.items.filter(i => s.name === "paused" ? /^(h2 "Paused"|p "P or Esc|#pz|#btnPad)/.test(i.name) : /^(#worldTitle|p "Gold is next · Green is done"$|level button|#worldBack)/.test(i.name));
          expect(panel.length, where).toBe(s.name === "paused" ? 6 : 8);
          for (const i of panel) if (!i.whole || i.covered) problems.push(`${where}: ${i.name} isn't whole`);
          checked += panel.length;
          continue;
        }
        const r = compare(results[V1 + s.name], v2, where, s.play || s.name === "the witch's intro");
        problems.push(...r.problems);
        checked += r.checked;
      }
      lines.push(`${w}x${h}${fallback ? " fallback fonts" : ""}: ${checked} words, pictures and buttons checked`);
    }
  }
  expect(problems).toEqual([]);
  note(lines.join("; "));
  // pictures of the two new screens, held sideways on the phone
  await page.setViewportSize(isMobile ? { width: 812, height: 375 } : { width: 1280, height: 800 });
  await seed(page.context());
  await open(page, V2, "g.setMode('levels'); g.openWorld(4)");
  await expect(page.locator("#wlv button")).toHaveCount(5);
  await shot("world");
  await open(page, V2, "g.startLevel(0); g.skipIntro(); g.step(5); g.pause(true)");
  await expect(page.locator("#pzGo")).toBeVisible();
  await shot("paused");
});

test("the buttons cover less of the game in play than jeremy.v1's did, and none of its counter or climb meter", async ({ browser, page, isMobile, shot, note }) => {
  const lines = [], menus = [];
  for (const [w, h] of isMobile ? PHONES : DESKTOPS) {
    for (const pad of [false, true]) {
      const got = {};
      for (const url of [V1, V2]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: isMobile ? 2 : 1, isMobile, hasTouch: isMobile });
        await seed(ctx, { pad });
        const p = await ctx.newPage();
        for (const s of SCREENS.filter(s => !s.v2only)) {
          await open(p, url, s.js);
          got[url + s.name] = await p.evaluate(measure);
        }
        await ctx.close();
      }
      const play = [];
      for (const s of SCREENS.filter(s => !s.v2only)) {
        const a = got[V1 + s.name], b = got[V2 + s.name];
        expect(b.canvas.w, `${w}x${h} ${s.name}: the game is the same size`).toBeCloseTo(a.canvas.w, 1);
        expect(b.canvas.h).toBeCloseTo(a.canvas.h, 1);
        if (s.play || s.name === "the witch's intro") {
          expect(b.covered, `${w}x${h} pad ${pad} ${s.name}: game covered by buttons`).toBeLessThanOrEqual(a.covered);
          expect(b.hudCovered, `${w}x${h} pad ${pad} ${s.name}: counter and climb meter covered`).toBeLessThanOrEqual(a.hudCovered);
          expect(b.hudCovered).toBe(0);
          if (s.name === "playing (sea)") play.push(`${(100 * a.covered / a.canvas.area).toFixed(2)}% → ${(100 * b.covered / b.canvas.area).toFixed(2)}% (HUD ${a.hudCovered} → ${b.hudCovered} px²)`);
        } else if (!pad && ["title", "level complete"].includes(s.name)) menus.push(`${w}x${h} ${s.name} ${(100 * a.covered / a.canvas.area).toFixed(2)}% → ${(100 * b.covered / b.canvas.area).toFixed(2)}%`);
      }
      lines.push(`${w}x${h}${pad ? " with arrow buttons" : ""}, in play: ${play.join("")}`);
    }
  }
  note(`game covered by buttons, jeremy.v1 → jeremy.v2: ${lines.join("; ")}`);
  note(`menu screens (the game is a backdrop there; Sound and Home are bigger where there's no room beside the game): ${menus.join("; ")}`);
  await seed(page.context(), { pad: true });
  await open(page, V2, "g.startLevel(0); g.skipIntro(); g.step(5)");
  await expect(page.locator("#btnPause")).toBeVisible();
  await shot("playing-arrow-buttons");
});

// The phone bar, measured strictly: no rounding up, so a 47.6 px button or a 7.5 px gap fails.
async function bar(page, where) {
  const { targets, problems } = await touchTargets(page);
  const raw = await page.evaluate(() => [...document.querySelectorAll("#corner button, #title button, #levels button, #world button, #pause button, #done button, #wdone button, #win button, #pad button")]
    .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && !b.closest("[hidden]") && !b.closest("[inert]") && getComputedStyle(b).display !== "none"; })
    .map(b => { const r = b.getBoundingClientRect(); return { name: b.getAttribute("aria-label") || b.textContent.trim(), x: r.left, y: r.top, w: r.width, h: r.height, corner: !!b.closest("#corner") }; }));
  const strict = [];
  for (const t of raw) if (t.w < 48 || t.h < 48) strict.push(`${where}: "${t.name}" is ${t.w}x${t.h}`);
  for (const t of raw.filter(t => t.corner)) for (const v of [t.x, t.y, t.w, t.h]) if (v !== Math.round(v)) strict.push(`${where}: corner button "${t.name}" isn't on whole pixels (${t.x},${t.y} ${t.w}x${t.h})`);
  for (let i = 0; i < raw.length; i++) for (let j = i + 1; j < raw.length; j++) {
    const a = raw[i], b = raw[j];
    const d = Math.max(Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w), Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
    if (d < 8) strict.push(`${where}: "${a.name}" and "${b.name}" are ${d} px apart`);
  }
  expect([...problems.map(p => `${where}: ${p}`), ...strict]).toEqual([]);
  expect(targets.length).toBeGreaterThan(0);
  return `${where} ${targets.length} (smallest ${Math.min(...raw.map(t => Math.min(t.w, t.h)))} px)`;
}

test("every screen meets the phone bar: 48 px buttons with 8 px gaps on whole pixels, 8 px from the edges", async ({ browser, page: fixturePage, isMobile, shot, note }) => {
  const lines = [];
  for (const [w, h] of isMobile ? PHONES : DESKTOPS) {
    for (const pad of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: isMobile ? 2 : 1, isMobile, hasTouch: isMobile });
      await seed(ctx, { pad });
      const page = await ctx.newPage();
      const got = [];
      for (const s of SCREENS) {
        if (pad && !s.play && s.name !== "paused") continue; // the arrow buttons only show in play
        await open(page, V2, s.js);
        got.push(await bar(page, s.name));
      }
      lines.push(`${w}x${h}${pad ? " with arrow buttons" : ""}: ${got.join(", ")}`);
      await ctx.close();
    }
  }
  note(lines.join(". "));
  await seed(fixturePage.context());
  await open(fixturePage, V2, "g.setMode('levels')");
  await expect(fixturePage.locator("#lvgrid .env")).toHaveCount(12);
  await shot("levels");
});

// a real tap with a finger
async function tap(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}
// a finger held down (touchscreen.tap lifts at once, too quick for the arrow buttons), until `done` says it worked
// or 3 s pass (a busy machine can drop frames)
async function hold(page, sel, ms, read, done) {
  const b = await page.locator(sel).first().boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }] });
  await page.waitForTimeout(ms);
  let during = await read();
  for (let t = ms; !done(during) && t < 3000; t += 100) { await page.waitForTimeout(100); during = await read(); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  return during;
}
const px = page => page.evaluate(() => Math.round(window.__game.pl.x));

test("by touch: Play, Pause and Keep going, the arrow buttons, Sound, a world's level, and the start screen", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.skip(!isMobile, "the phone row taps; the desktop row uses the keyboard");
  const steps = [];
  await page.goto(V2 + "?test");
  await tap(page, "#play");
  await expect.poll(() => page.evaluate(() => window.__game.mode)).toBe("intro");
  await page.waitForTimeout(800);
  await tap(page, "#game"); // a tap skips the witch's intro
  await expect.poll(() => page.evaluate(() => window.__game.mode)).toBe("play");
  steps.push("Play → the intro → a tap skipped it");
  await tap(page, "#btnPause");
  await expect(page.locator("#pause")).toBeVisible();
  const t0 = await page.evaluate(() => window.__game.tick);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__game.tick)).toBe(t0);
  steps.push("Pause stopped the game (tick held at " + t0 + ")");
  await tap(page, "#btnPad");
  await expect(page.locator("#btnPad")).toHaveAttribute("aria-pressed", "true");
  await tap(page, "#pzSound");
  const sound = await page.locator("#pzSound").textContent();
  await shot("paused-touch");
  await tap(page, "#pzGo");
  await expect(page.locator("#pause")).toBeHidden();
  await expect(page.locator("#bR")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__game.tick)).toBeGreaterThan(t0);
  steps.push(`in the pause card, Arrow buttons → on, Sound → "${sound}", Keep going → playing again`);
  const x0 = await px(page);
  const x1 = await hold(page, "#bR", 500, () => px(page), x => x > x0);
  expect(x1).toBeGreaterThan(x0);
  const x2 = await hold(page, "#bL", 500, () => px(page), x => x < x1);
  expect(x2).toBeLessThan(x1);
  steps.push(`held ▶ (x ${x0} → ${x1}) and ◀ (→ ${x2})`);
  await tap(page, "#btnPause");
  await tap(page, "#pzHome");
  await expect(page.locator("#title")).toBeVisible();
  await tap(page, "#pick");
  await expect(page.locator("#levels")).toBeVisible();
  await tap(page, "#lvgrid .env >> nth=1");
  await expect(page.locator("#world")).toBeVisible();
  await expect(page.locator("#wlv button")).toHaveCount(5);
  await tap(page, "#wlv button >> nth=2");
  await expect.poll(() => page.evaluate(() => window.__game.world.idx)).toBe(7);
  steps.push("Start screen → Pick a level → Sunken Treasure Ship → level 8 started");
  await tap(page, "#btnPause");
  await tap(page, "#pzHome");
  await tap(page, "#pick");
  await tap(page, "#btnHome");
  await expect(page.locator("#title")).toBeVisible();
  steps.push("Home on the level picker → the start screen");
  note(steps.join("; "));
  expect(browserErrors).toEqual([]);
});

test("by keyboard: WASD and the arrows both move and jump, P or Escape pauses, M is Sound, H is Home, B the arrow buttons, and the arrows walk the menus", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.skip(isMobile, "the desktop row uses the keyboard; the phone row taps");
  const steps = [];
  await page.goto(V2 + "?test");
  await page.waitForTimeout(300);
  // in the menus, the arrows and WASD move a visible focus; Enter presses
  await page.keyboard.press("ArrowDown");
  const f1 = await page.evaluate(() => document.activeElement.textContent.trim());
  await page.keyboard.press("d");
  const f2 = await page.evaluate(() => document.activeElement.textContent.trim());
  expect(f1).not.toBe(f2);
  steps.push(`menus: ArrowDown focused "${f1}", D moved to "${f2}"`);
  await page.keyboard.press("Escape"); // nothing to pause on the title
  await page.locator("#play").focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__game.mode)).toBe("intro");
  await page.waitForTimeout(800);
  await page.keyboard.press("Space"); // skips the intro
  await expect.poll(() => page.evaluate(() => window.__game.mode)).toBe("play");
  await page.evaluate(() => window.__game.step(30));
  const moved = {};
  for (const [k, twin] of [["d", "ArrowRight"], ["a", "ArrowLeft"]]) for (const key of [k, twin]) {
    const before = await px(page);
    // the key is held while the game runs 20 frames (stepped here, so a busy machine can't drop them)
    await page.keyboard.down(key); await page.evaluate(() => window.__game.step(20)); await page.keyboard.up(key);
    moved[key] = (await px(page)) - before;
  }
  expect(moved.d).toBeGreaterThan(0); expect(moved.ArrowRight).toBeGreaterThan(0);
  expect(moved.a).toBeLessThan(0); expect(moved.ArrowLeft).toBeLessThan(0);
  const jumped = {};
  for (const key of ["w", "ArrowUp"]) {
    await page.evaluate(() => window.__game.step(90));
    const y0 = await page.evaluate(() => window.__game.pl.y);
    await page.keyboard.down(key); await page.evaluate(() => window.__game.step(8));
    jumped[key] = Math.round(y0 - await page.evaluate(() => window.__game.pl.y));
    await page.keyboard.up(key);
  }
  expect(jumped.w).toBeGreaterThan(0); expect(jumped.ArrowUp).toBeGreaterThan(0);
  steps.push(`play: D ${moved.d}, → ${moved.ArrowRight}, A ${moved.a}, ← ${moved.ArrowLeft} px; W rose ${jumped.w}, ↑ ${jumped.ArrowUp} px`);
  await page.keyboard.press("p");
  expect(await page.evaluate(() => window.__game.paused)).toBe(true);
  await shot("paused-keys");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__game.paused)).toBe(false);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__game.paused)).toBe(true);
  await page.keyboard.press("p");
  expect(await page.evaluate(() => window.__game.paused)).toBe(false);
  steps.push("P paused, Escape kept going, Escape paused, P kept going");
  const s0 = await page.locator("#btnSound").getAttribute("aria-pressed");
  await page.keyboard.press("m");
  expect(await page.locator("#btnSound").getAttribute("aria-pressed")).not.toBe(s0);
  await page.keyboard.press("b");
  await expect(page.locator("#bJ")).toBeVisible();
  await page.keyboard.press("b");
  await expect(page.locator("#bJ")).toBeHidden();
  await page.keyboard.press("h");
  await expect(page.locator("#title")).toBeVisible();
  steps.push("M switched Sound, B showed and hid the arrow buttons, H went to the start screen");
  // pick a level by keyboard: Pick a level → a world → a level
  await page.locator("#pick").focus(); await page.keyboard.press("Enter");
  await expect(page.locator("#levels")).toBeVisible();
  await page.locator("#lvgrid .env").first().focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  await expect(page.locator("#world")).toBeVisible();
  await expect(page.locator("#worldTitle")).toHaveText("Sunken Treasure Ship");
  await page.keyboard.press("Escape");
  await expect(page.locator("#world")).toBeHidden();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__game.world && window.__game.world.idx)).toBeGreaterThanOrEqual(5);
  steps.push("Pick a level → → Enter opened Sunken Treasure Ship, Escape closed it, Enter and → Enter started one of its levels");
  note(steps.join("; "));
  expect(browserErrors).toEqual([]);
});

test("saves from jeremy.v1 load under the same keys: progress, Normal, Sound off and the arrow buttons", async ({ page, isMobile, shot, note, browserErrors }) => {
  // what jeremy.v1 writes (seen in its code and after a short play): mfuwg2 progress, mfuwg-muted, and the older mfuwg crown
  const v1save = { reached: 12, done: Array.from({ length: 12 }, () => true), hardUnlocked: true, crown: false, diff: 1, pad: true, ver: 4 };
  await page.addInitScript(s => {
    if (sessionStorage.getItem("seeded")) return;
    localStorage.setItem("mfuwg2", s); localStorage.setItem("mfuwg-muted", "1"); localStorage.setItem("mfuwg", JSON.stringify({ crown: true }));
    sessionStorage.setItem("seeded", "1");
  }, JSON.stringify(v1save));
  await page.goto(V2); // no test hook: the real picker
  await expect(page.locator("#title [data-diff='1']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#title .hardbtn")).toBeVisible();
  await expect(page.locator("#btnSound")).toHaveAttribute("aria-pressed", "false");
  await page.locator("#pick").click();
  await expect(page.locator(".dots .lvb.done")).toHaveCount(12);
  await expect(page.locator(".dots .lvb.next")).toHaveText("3"); // level 13: world 3, level 3
  await expect(page.locator("#lvgrid .env").nth(3)).toHaveAttribute("aria-disabled", "true");
  await shot("save-loaded");
  await page.locator("#lvgrid .env").nth(2).click();
  await expect(page.locator("#wlv button.next")).toHaveText("3");
  await page.locator("#wlv button.next").click();
  await expect(page.locator("#btnPause")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.classList.contains("pad-on"))).toBe(true);
  await page.keyboard.press("m");
  const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(Object.keys(stored).sort()).toEqual(["mfuwg", "mfuwg-muted", "mfuwg2"]);
  expect(stored["mfuwg-muted"]).toBe("0");
  const saved = JSON.parse(stored.mfuwg2);
  expect(saved).toMatchObject({ reached: 12, diff: 1, pad: true, hardUnlocked: true });
  note(`seeded jeremy.v1's mfuwg2 (12 levels done, Normal, arrow buttons on), mfuwg-muted=1 and mfuwg {crown} → Normal and Harder shown, Sound off, 12 green squares and level 13 gold, the arrow buttons on in play; after a short play the keys are still ${Object.keys(stored).sort().join(", ")} (no new ones)`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays from its folder, and games.json keeps it while jeremy.v2 becomes the default", async ({ page, note, browserErrors }) => {
  const g = games.find(x => x.slug === SLUG);
  expect(g.default).toBe("jeremy.v2");
  expect(g.url).toBe(V2);
  expect(g.versions.map(v => v.id)).toEqual(["jeremy.v1", "jeremy.v2"]);
  expect(g.versions[0]).toMatchObject({ url: V1, source: { repo: "jwildfire/magic-friends" } });
  expect(g.versions[1]).toMatchObject({ url: V2, from: "jeremy.v1", idea: 225 });
  await page.goto(V1);
  await expect(page.locator("#title h1")).toHaveText("Magic Friends, Up We Go!");
  await page.locator("#play").click();
  await expect(page.locator("#title")).toBeHidden();
  await expect(page.locator("#btnSound")).toBeVisible();
  note(`games.json: default ${g.default}, url ${g.url}; jeremy.v1 at ${V1} opened and started`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Magic Friends offers both versions and plays jeremy.v2 by default; #magic-friends@jeremy.v1 still opens jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("2 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Bigger buttons and a pause");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#title h1")).toHaveText("Magic Friends, Up We Go!");
  await frame.locator("#play").click();
  await expect(frame.locator("#btnPause")).toBeVisible();
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  await expect(page.frameLocator("#frame").locator("#play")).toBeVisible();
  note(`card (2 versions) → picker: jeremy.v2 first, "Bigger buttons and a pause" → jeremy.v2 plays in the frame; #${SLUG}@jeremy.v1 still opens jeremy.v1`);
  expect(browserErrors).toEqual([]);
});
