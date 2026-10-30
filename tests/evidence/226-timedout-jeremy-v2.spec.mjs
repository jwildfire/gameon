// Evidence for game idea #226: Timed Out jeremy.v2, "Play it with keys". Jeremy's update for the phone bar
// from #187: A/D or Left/Right pick a drop zone, Enter or Space places the card, Escape opens the menu (which
// pauses), and the X, Read clue, the topic buttons and the drop zones are at least 48 px, with a bigger slider
// thumb. The creator's update, started from jeremy.v1, and the new default. Spec: the build skill's U6,
// docs/game-versions.md and docs/evidence.md.
// Run: npm run evidence -- tests/evidence/226-timedout-jeremy-v2
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "timedout";
const V1 = `games/${SLUG}/jeremy.v1/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
// Outside hosts jeremy.v1 already uses: Google Fonts, and Wikipedia for Medium and Hard games.
const INHERITED = ["fonts.googleapis.com", "fonts.gstatic.com", "en.wikipedia.org"];
const FONTS = "https://fonts.googleapis.com/**";

test.describe.configure({ timeout: 180_000 });

// The same game in both versions: Math.random is seeded, so the same topic deals the same cards.
const seeded = page => page.addInitScript(() => {
  let s = 7;
  Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
});
// jeremy.v1's one save: Dad Mode, under the key "dadMode" (it predates the gameon.* rule).
const seedSave = (page, save) => page.addInitScript(save => {
  if (sessionStorage.getItem("seeded")) return;
  localStorage.clear();
  for (const [k, v] of Object.entries(save)) localStorage.setItem(k, v);
  sessionStorage.setItem("seeded", "1");
}, save);
const fallbackFonts = page => page.route(FONTS, route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
// The real fonts when they can be reached, with the same quick fallback either way.
const realFonts = page => page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async route => {
  try { await route.fulfill({ response: await route.fetch({ timeout: 10_000 }) }); }
  catch { await route.fulfill({ status: 200, contentType: route.request().url().includes("gstatic") ? "font/woff2" : "text/css", body: "" }); }
});
const state = page => page.evaluate(() => window.timedOut.state());

function outsideHosts(page) {
  const seen = new Set(), home = new URL(test.info().project.use.baseURL).host;
  page.on("request", req => {
    const u = new URL(req.url());
    if (["http:", "https:"].includes(u.protocol) && u.host !== home) seen.add(u.host);
  });
  return seen;
}

// Which drop zone is right (or, with `wrong`, a wrong one) for the card on show. Works in both versions.
const slotFor = (page, wrong = false) => page.evaluate(wrong => {
  const text = document.getElementById("current-event-text").textContent;
  const pools = [...Object.values(CATEGORY_POOLS).flatMap(c => c.events), ...EASY_EVENTS, ...MEDIUM_EVENTS, ...HARD_EVENTS];
  const year = pools.find(e => e.text === text).year;
  const years = [...document.querySelectorAll("#timeline .timeline-card")].map(c => +c.dataset.year);
  let i = 0;
  while (i < years.length && years[i] < year) i++;
  if (!wrong) return i;
  for (let j = 0; j <= years.length; j++) if ((j > 0 && year < years[j - 1]) || (j < years.length && year > years[j])) return j;
  return null;
}, wrong);

async function tap(page, isMobile, locator) {
  const el = typeof locator === "string" ? page.locator(locator).first() : locator;
  if (isMobile) {
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  } else await el.click();
}

async function open(page, url = V2) {
  await page.goto(url);
  await expect(page.locator("#screen-start .title")).toBeVisible();
  await page.waitForTimeout(450);
}

// A topic game: curated events, no Wikipedia, so it plays the same offline.
async function startSpace(page, isMobile) {
  await tap(page, isMobile, ".btn-category[data-category=space]");
  await expect(page.locator("#screen-game")).toHaveClass(/active/);
  await page.waitForTimeout(500);
}

test("jeremy.v2 opens to its title screen and starts, with no new outside requests", async ({ page, isMobile, shot, note, browserErrors }) => {
  const outside = outsideHosts(page);
  await open(page);
  await expect(page.locator(".subtitle")).toHaveText("Place historical events in order");
  await shot("title");
  await startSpace(page, isMobile);
  await expect(page.locator("#current-event-text")).not.toBeEmpty();
  expect((await state(page)).screen).toBe("game");
  const extra = [...outside].filter(h => !INHERITED.includes(h));
  expect(extra, "outside requests jeremy.v1 doesn't make").toEqual([]);
  note(`${isMobile ? "tapped" : "clicked"} the Space topic and the first card is up; outside hosts: ${[...outside].join(", ") || "none"} (Google Fonts, inherited from jeremy.v1)`);
  expect(browserErrors).toEqual([]);
});

test("at 375 px wide every button is at least 48 x 48 px, 8 px clear of the others and the edges, and real taps work", async ({ page, isMobile, shot, note, browserErrors }) => {
  if (!isMobile) {
    // The bar is measured at phone width; at 1280 check the buttons the idea named.
    await open(page);
    await page.locator(".btn-category[data-category=space]").click();
    await page.waitForTimeout(500);
    for (const sel of ["#btn-menu-game", "#btn-read-clue", ".drop-zone"]) {
      const b = await page.locator(sel).first().boundingBox();
      expect(b.width, sel).toBeGreaterThanOrEqual(48);
      expect(b.height, sel).toBeGreaterThanOrEqual(48);
    }
    note("at 1280: the X, Read clue and the drop zones are all at least 48 x 48");
    expect(browserErrors).toEqual([]);
    return;
  }
  await seeded(page);
  await open(page);
  const lines = [], all = [], sizes = {};
  const measure = async label => {
    const { targets, problems } = await touchTargets(page);
    all.push(...problems.map(p => `${label}: ${p}`));
    for (const t of targets) sizes[t.name] = `${t.w}x${t.h}`;
    lines.push(`${label}: ${targets.length} targets, ${problems.length} problems`);
    return targets;
  };
  const title = await measure("title");
  expect(title.some(t => t.name.includes("Easy")) && title.some(t => t.name.includes("Endless Mode"))).toBe(true);
  // The slider and the topic buttons, scrolled into view
  await page.locator("#event-count").scrollIntoViewIfNeeded();
  await measure("title, slider in view");
  await page.locator(".btn-category[data-category=food]").scrollIntoViewIfNeeded();
  const topics = await measure("title, topics in view");
  expect(topics.find(t => t.name.includes("Presidents")).h).toBeGreaterThanOrEqual(48);
  // A tap on the slider's right end sets 30 events; a tap on Dad Mode turns it on and off.
  await page.locator("#event-count").scrollIntoViewIfNeeded();
  const sb = await page.locator("#event-count").boundingBox();
  await page.touchscreen.tap(sb.x + sb.width - 4, sb.y + sb.height / 2);
  await expect(page.locator("#event-count-display")).toHaveText("30");
  await tap(page, true, ".dad-toggle-label");
  await expect(page.locator("body")).toHaveClass(/dad-mode/);
  await tap(page, true, ".dad-toggle-label");
  await expect(page.locator("body")).not.toHaveClass(/dad-mode/);

  await page.locator("#screen-start").evaluate(el => { el.scrollTop = 0; });
  await startSpace(page, true);
  await measure("play");
  await shot("buttons-play");
  const before = await state(page);
  await tap(page, true, page.locator(".drop-zone").nth(await slotFor(page)));
  await expect.poll(async () => (await state(page)).score).toBe(before.score + 1);
  await page.waitForTimeout(1800);
  await measure("play, after a card");
  await tap(page, true, "#btn-read-clue");
  expect((await state(page)).reads).toBe(1);
  await tap(page, true, "#btn-menu-game");
  await expect(page.locator("#pause-menu")).toBeVisible();
  expect((await state(page)).paused).toBe(true);
  await measure("pause");
  await shot("buttons-pause");
  await tap(page, true, "#btn-resume");
  await expect(page.locator("#pause-menu")).toBeHidden();
  expect((await state(page)).paused).toBe(false);
  // Three wrong guesses: game over
  for (let i = 0; i < 3; i++) {
    await tap(page, true, page.locator(".drop-zone").nth(await slotFor(page, true)));
    await page.waitForTimeout(1700);
  }
  await expect(page.locator("#screen-gameover")).toHaveClass(/active/, { timeout: 5000 });
  await page.waitForTimeout(500);
  await measure("game over");
  await tap(page, true, "#btn-menu-gameover");
  await expect(page.locator("#screen-start")).toHaveClass(/active/);
  // And the pause menu's Main Menu goes back to the title too
  await page.waitForTimeout(450);
  await startSpace(page, true);
  await tap(page, true, "#btn-menu-game");
  await tap(page, true, "#btn-menu-pause");
  await expect(page.locator("#screen-start")).toHaveClass(/active/);

  const size = start => Object.entries(sizes).find(([n]) => n.startsWith(start))?.[1];
  note(`the idea's buttons now: ✕ ${size("Menu")}, Read clue ${size("Read clue aloud")}, a topic ${size("🇺🇸 Presidents")}, a drop zone ${size("Place event at position")}, the slider ${size("30") || size("20")} (jeremy.v1: 28x28, 30x23, 152x44, 44x120, 311x6)`);
  note("tapped: the slider (30 events), Dad Mode on and off, Space, a drop zone (score +1), Read clue, ✕ (paused), Keep playing, three wrong drop zones (game over), Main Menu, then ✕ and the pause menu's Main Menu");
  for (const l of lines) note(l);
  expect(all).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("keys: WASD and the arrows pick a slot and place the card, Enter or Space too, and Escape or P pause", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.skip(isMobile, "the keyboard check runs at desktop size");
  await seeded(page);
  await open(page);
  // Title: the arrows and WASD move the focus between the buttons
  const focus = async () => (await state(page)).focus;
  await page.keyboard.press("ArrowDown");
  expect(await focus()).toBe("easy");
  const moves = [];
  for (const [key, want] of [["ArrowRight", "medium"], ["d", "hard"], ["a", "medium"], ["ArrowLeft", "easy"], ["s", "event-count"], ["w", "medium"]]) {
    await page.keyboard.press(key);
    expect(await focus(), key).toBe(want);
    moves.push(`${key} → ${want}`);
  }
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#event-count-display")).toHaveText("15");
  await page.keyboard.press("d");
  await expect(page.locator("#event-count-display")).toHaveText("20");
  note(`title: ArrowDown → easy, ${moves.join(", ")}; on the slider ArrowLeft → 15 events and D → 20`);
  // Down to the Space topic and Enter starts it
  for (let i = 0; i < 12 && (await focus()) !== "space"; i++) await page.keyboard.press(i < 4 ? "s" : "ArrowRight");
  if ((await focus()) !== "space") await page.locator(".btn-category[data-category=space]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#screen-game")).toHaveClass(/active/);
  await page.waitForTimeout(500);
  // Started with keys, so the picked slot shows straight away
  let s = await state(page);
  expect(s.picked).not.toBeNull();
  await expect(page.locator(".drop-zone.picked")).toHaveCount(1);

  const changes = {};
  for (const key of ["d", "ArrowRight", "a", "ArrowLeft"]) {
    const a = (await state(page)).picked;
    await page.keyboard.press(key);
    const b = (await state(page)).picked;
    changes[key] = a !== b;
    await expect(page.locator(".drop-zone").nth(b)).toHaveClass(/picked/);
  }
  expect(changes).toEqual({ d: true, ArrowRight: true, a: true, ArrowLeft: true });
  await shot("keys-picked");
  for (const key of ["w", "ArrowUp"]) {
    const r = (await state(page)).reads;
    await page.keyboard.press(key);
    changes[key] = (await state(page)).reads === r + 1;
  }
  // Each of S, ArrowDown, Enter and Space places the card on the picked slot (the right one, picked with D)
  for (const key of ["s", "ArrowDown", "Enter", " "]) {
    const want = await slotFor(page);
    for (let i = 0; i < 40 && (await state(page)).picked !== want; i++) await page.keyboard.press("d");
    const a = await state(page);
    await page.keyboard.press(key);
    await expect.poll(async () => (await state(page)).score).toBe(a.score + 1);
    changes[key] = (await state(page)).remaining === a.remaining - 1;
    await page.waitForTimeout(1700);
  }
  expect(changes).toEqual({ d: true, ArrowRight: true, a: true, ArrowLeft: true, w: true, ArrowUp: true, s: true, ArrowDown: true, Enter: true, " ": true });
  note("in play: D, ArrowRight, A and ArrowLeft each moved the picked slot; W and ArrowUp each read the clue; S, ArrowDown, Enter and Space each placed the card (score +1, one fewer left)");

  // P and Escape pause and unpause; while paused, keys don't play
  for (const key of ["p", "Escape"]) {
    await page.keyboard.press(key);
    await expect(page.locator("#pause-menu")).toBeVisible();
    s = await state(page);
    expect(s.paused).toBe(true);
    const picked = s.picked;
    await page.keyboard.press("d");
    expect((await state(page)).picked, "paused: D doesn't move the pick").toBe(picked);
    if (key === "Escape") await shot("keys-paused");
    await page.keyboard.press(key);
    await expect(page.locator("#pause-menu")).toBeHidden();
    expect((await state(page)).paused).toBe(false);
  }
  // Escape, then Down and Enter: Main Menu
  await page.keyboard.press("Escape");
  expect(await focus()).toBe("btn-resume");
  await page.keyboard.press("ArrowDown");
  expect(await focus()).toBe("btn-menu-pause");
  await page.keyboard.press("Enter");
  await expect(page.locator("#screen-start")).toHaveClass(/active/);
  // Enter on the title with nothing picked starts an Easy game
  await page.waitForTimeout(450);
  await page.keyboard.press("Enter");
  await expect(page.locator("#screen-game")).toHaveClass(/active/);
  note("P paused (D did nothing) and P unpaused; Escape the same; Escape, ArrowDown, Enter went to the Main Menu, and Enter there started an Easy game");
  expect(browserErrors).toEqual([]);
});

// ---------------------------------------------------------------------------------------------
// Screens against jeremy.v1. Every piece of text (line by line), card and button on each screen, as the player
// lands on it with no scrolling: "inView" means whole inside the screen and every box that clips it. A line is
// "covered" when the top element at its middle, left or right isn't the line's own element.
function snap() {
  const SEL = [".logo-icon", ".title", ".subtitle", ".description", ".difficulty-label", ".btn-difficulty", ".diff-icon", ".diff-name", ".diff-desc",
    ".event-count-label", "#event-count", ".event-count-range span", ".custom-divider", ".btn-endless", ".btn-category", ".dad-toggle-switch", ".dad-toggle-text", ".dad-toggle-hint",
    ".header-score", ".header-remaining", ".header-title", ".life", "#btn-menu-game", "#current-card", ".card-label", ".card-text", ".card-year", "#btn-read-clue", "#instruction",
    ".timeline-card", ".timeline-year", ".timeline-text", ".drop-zone", "#feedback-toast",
    ".gameover-icon", ".gameover-title", ".gameover-message", ".final-score-number", ".final-score-label", ".mini-card", ".mini-year", ".mini-text", "#btn-replay", "#btn-menu-gameover"];
  const ALL = SEL.join(",");
  const shown = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity < 0.05) return false; } return true; };
  const clipOf = el => {
    let c = { l: 0, t: 0, r: innerWidth, b: innerHeight };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const q = p.getBoundingClientRect(), l = q.left + p.clientLeft, t = q.top + p.clientTop;
      c = { l: Math.max(c.l, l), t: Math.max(c.t, t), r: Math.min(c.r, l + p.clientWidth), b: Math.min(c.b, t + p.clientHeight) };
    }
    return c;
  };
  const inside = (r, c) => r.left >= c.l - 0.5 && r.top >= c.t - 0.5 && r.right <= c.r + 0.5 && r.bottom <= c.b + 0.5;
  const own = (el, x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)); };
  const out = {};
  for (const sel of SEL) document.querySelectorAll(sel).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || !shown(el)) return;
    const c = clipOf(el);
    const item = { w: r.width, h: r.height, fs: parseFloat(getComputedStyle(el).fontSize), inView: inside(r, c), lines: [] };
    // Line by line: the text's own boxes, merged per line
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const rects = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      // A line belongs to the nearest measured box around it (the card's year is .card-year's line, not the card's)
      if (!n.textContent.trim() || n.parentElement.closest(ALL) !== el) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) if (q.width > 0.5 && q.height > 0.5) rects.push({ l: q.left, t: q.top, r: q.right, b: q.bottom, el: n.parentElement });
    }
    rects.sort((a, b) => a.t - b.t || a.l - b.l);
    for (const q of rects) {
      const line = item.lines.find(L => Math.abs((L.t + L.b) / 2 - (q.t + q.b) / 2) < Math.min(L.b - L.t, q.b - q.t) / 2);
      if (line) { line.l = Math.min(line.l, q.l); line.r = Math.max(line.r, q.r); line.t = Math.min(line.t, q.t); line.b = Math.max(line.b, q.b); line.els.push(q.el); }
      else item.lines.push({ ...q, els: [q.el] });
    }
    item.lines = item.lines.map(L => {
      const lr = { left: L.l, top: L.t, right: L.r, bottom: L.b };
      const y = (L.t + L.b) / 2, xs = [L.l + Math.min(3, (L.r - L.l) / 4), (L.l + L.r) / 2, L.r - Math.min(3, (L.r - L.l) / 4)];
      const visible = inside(lr, c);
      const covered = visible && xs.some(x => !L.els.some(e => own(e, x, y)) && !own(el, x, y));
      return { w: L.r - L.l, h: L.b - L.t, inView: visible, covered };
    });
    out[`${sel} ${i + 1}`] = item;
  });
  // The play area: the timeline, less anything on top of it, sampled on a 6 px grid
  const wrap = document.querySelector("#screen-game.active .timeline-wrapper");
  let play = null;
  if (wrap) {
    const r = wrap.getBoundingClientRect(), top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
    let seen = 0, all = 0;
    for (let y = top + 3; y < bottom; y += 6) for (let x = 3; x < innerWidth; x += 6) { all++; const hit = document.elementFromPoint(x, y); if (hit && wrap.contains(hit) || hit === wrap) seen++; }
    play = { top, bottom, height: bottom - top, seen, all };
  }
  const active = document.querySelector(".screen.active");
  const sideways = Math.max(document.scrollingElement.scrollWidth - innerWidth, active ? active.scrollWidth - active.clientWidth : 0);
  return { items: out, play, sideways };
}

// A piece jeremy.v1 showed whole must be whole in jeremy.v2, its lines too, uncovered, and no smaller: no smaller
// text, and it can't lose width or height without gaining the other.
function compare(a1, a2) {
  const lost = [], grew = new Set();
  let compared = 0, lines = 0;
  for (const [screen, s1] of Object.entries(a1)) {
    const s2 = a2[screen];
    if (s2.sideways > 0) lost.push(`${screen}: scrolls sideways by ${s2.sideways} px`);
    for (const [name, a] of Object.entries(s1.items)) {
      if (!a.inView) continue;
      compared++;
      const b = s2.items[name];
      if (!b) { lost.push(`${screen}: ${name} is gone`); continue; }
      if (!b.inView) lost.push(`${screen}: ${name} is cut off`);
      const wider = b.w > a.w + 0.5, taller = b.h > a.h + 0.5;
      if (b.fs < a.fs - 0.01 || (b.w < a.w - 0.5 && !taller) || (b.h < a.h - 0.5 && !wider)) lost.push(`${screen}: ${name} shrank from ${a.w.toFixed(1)}x${a.h.toFixed(1)} (${a.fs}px) to ${b.w.toFixed(1)}x${b.h.toFixed(1)} (${b.fs}px)`);
      else if (wider || taller) grew.add(name.replace(/ \d+$/, ""));
      a.lines.forEach((L, i) => {
        if (!L.inView || L.covered) return;
        lines++;
        const M = b.lines[i];
        if (!M) lost.push(`${screen}: ${name} line ${i + 1} is gone`);
        else if (!M.inView) lost.push(`${screen}: ${name} line ${i + 1} is cut off`);
        else if (M.covered) lost.push(`${screen}: ${name} line ${i + 1} is covered`);
        else if (M.h < L.h - 0.5) lost.push(`${screen}: ${name} line ${i + 1} is shorter (${L.h.toFixed(1)} → ${M.h.toFixed(1)} px)`);
      });
    }
    if (s1.play) {
      if (!s2.play) lost.push(`${screen}: no play area`);
      else if (s2.play.seen < s1.play.seen || s2.play.height < s1.play.height - 0.5) lost.push(`${screen}: the play area shrank (${s1.play.height.toFixed(0)} px tall, ${s1.play.seen} points clear → ${s2.play.height.toFixed(0)} px, ${s2.play.seen})`);
    }
  }
  return { lost, grew, compared, lines };
}

// Each screen as the player lands on it, in the same game: title, play, a card placed (the toast between turns),
// the next card, and game over after three wrong guesses. v2 also records its touch targets on each screen and in
// the pause menu (which jeremy.v1 doesn't have).
async function record(page, url, { targets, topic = "space" } = {}) {
  const out = {}, bar = [];
  const tt = async label => { if (!targets) return; const { problems } = await touchTargets(page); bar.push(...problems.map(p => `${label}: ${p}`)); };
  await page.goto(url);
  await expect(page.locator("#screen-start .title")).toBeVisible();
  await page.evaluate(async () => { await Promise.allSettled([...document.fonts].map(f => f.load())); await document.fonts.ready; });
  await page.waitForTimeout(450);
  out.title = await page.evaluate(snap); await tt("title");
  await page.locator(`.btn-category[data-category=${topic}]`).dispatchEvent("click");
  await page.waitForTimeout(500);
  out.play = await page.evaluate(snap); await tt("play");
  for (let i = 0; i < 2; i++) {
    await page.locator("#timeline .drop-zone").nth(await slotFor(page)).dispatchEvent("click");
    await page.waitForTimeout(700); // past the new card's 0.5 s pop-in, while the toast still shows
    out[`placed ${i + 1}, toast`] = await page.evaluate(snap); await tt(`placed ${i + 1}, toast`);
    await page.waitForTimeout(1600);
    out[`card ${i + 2}`] = await page.evaluate(snap); await tt(`card ${i + 2}`);
  }
  if (targets) {
    await page.locator("#btn-menu-game").dispatchEvent("click");
    await page.waitForTimeout(200);
    await tt("pause");
    const side = await page.evaluate(() => document.getElementById("pause-menu").scrollWidth - document.getElementById("pause-menu").clientWidth);
    if (side > 0) bar.push(`pause: scrolls sideways by ${side} px`);
    await page.locator("#btn-resume").dispatchEvent("click");
  }
  for (let i = 0; i < 3; i++) {
    await page.locator("#timeline .drop-zone").nth(await slotFor(page, true)).dispatchEvent("click");
    await page.waitForTimeout(1700);
  }
  await expect(page.locator("#screen-gameover")).toHaveClass(/active/, { timeout: 5000 });
  await page.waitForTimeout(500);
  out["game over"] = await page.evaluate(snap); await tt("game over");
  return { out, bar };
}

const SIZES = { phone: [[375, 812], [812, 375], [667, 375], [740, 360]], desktop: [[1024, 768], [1280, 800], [1366, 768]] };

test("every screen shows everything jeremy.v1 showed, line by line, at seven sizes, with fallback, wide and real fonts, Dad Mode on and off, and the play area is no smaller", async ({ page, shot, note, browserErrors }, testInfo) => {
  test.setTimeout(1_800_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seeded(page);
  // The wide pass: a wider stand-in font in both versions, the way another machine's fallback fonts can be
  await page.addInitScript(() => {
    if (location.search !== "?wide") return;
    addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = "* { font-family: Verdana, 'DejaVu Sans', sans-serif !important; letter-spacing: .4px !important; }";
      document.head.appendChild(st);
    });
  });
  const lost = [], bar = [], lines = [], grew = new Set();
  let compared = 0, lineCount = 0;
  const passes = ["fallback", "wide", "real"].flatMap(fonts => [[fonts, {}], [fonts, { dadMode: "true" }]]);
  for (const [w, h] of SIZES[testInfo.project.name]) {
    await page.setViewportSize({ width: w, height: h });
    for (const [fonts, save] of passes) {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      if (fonts === "real") await realFonts(page);
      else await fallbackFonts(page);
      const runOne = async url => {
        await page.goto(V1); // same origin, so the save can be set before the game reads it
        await page.evaluate(save => { localStorage.clear(); for (const [k, v] of Object.entries(save)) localStorage.setItem(k, v); }, save);
        // Dad Mode's bigger clue text runs to two lines with the Presidents cards, the tightest the timeline gets
        return record(page, url + (fonts === "wide" ? "?wide" : ""), { targets: url === V2, topic: save.dadMode ? "presidents" : "space" });
      };
      const a = await runOne(V1), b = await runOne(V2);
      const r = compare(a.out, b.out);
      const tag = `${w}x${h}, ${fonts} fonts${save.dadMode ? ", Dad Mode" : ""}`;
      compared += r.compared; lineCount += r.lines;
      for (const g of r.grew) grew.add(g);
      lost.push(...r.lost.map(l => `${tag}, ${l}`));
      bar.push(...b.bar.map(l => `${tag}, ${l}`));
      if (fonts === "fallback" && !save.dadMode) {
        const p1 = a.out.play.play, p2 = b.out.play.play;
        lines.push(`${w}x${h}: play area ${p1.top.toFixed(0)}–${p1.bottom.toFixed(0)} (${p1.height.toFixed(0)} px, ${p1.seen} of ${p1.all} points clear) in jeremy.v1, ${p2.top.toFixed(0)}–${p2.bottom.toFixed(0)} (${p2.height.toFixed(0)} px, ${p2.seen} of ${p2.all}) in jeremy.v2`);
      }
    }
    if ((w === 375 || w === 1280)) await shot(`compare-${w}`);
  }
  note(`${compared} boxes and ${lineCount} lines of text that jeremy.v1 showed whole and uncovered as the player lands (title, play, a card placed with its toast, the next card, game over; fallback fonts, a wider stand-in font and the real fonts, each with Dad Mode on and off, the Dad Mode games on the two-line Presidents cards) are whole, uncovered and no smaller in jeremy.v2; nothing scrolls sideways`);
  note(`bigger in jeremy.v2: ${[...grew].join(", ") || "nothing"}`);
  for (const l of lines) note(l);
  note(`touch targets in jeremy.v2 on every screen, the pause menu included: ${bar.length} problems`);
  expect(compared).toBeGreaterThan(100);
  expect(lost).toEqual([]);
  expect(bar).toEqual([]);
  expect(browserErrors).toEqual([]);
});

// Whether every drop zone is whole inside the timeline and how the clue wrapped, for the card on show.
const zoneFit = page => page.evaluate(() => {
  const wrap = document.querySelector(".timeline-wrapper").getBoundingClientRect();
  const text = document.getElementById("current-event-text");
  const lines = Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight));
  const zones = [...document.querySelectorAll("#timeline .drop-zone")].map(z => z.getBoundingClientRect());
  return {
    lines, wrapTop: wrap.top, wrapBottom: wrap.bottom,
    top: Math.min(...zones.map(z => z.top)), bottom: Math.max(...zones.map(z => z.bottom)), height: Math.min(...zones.map(z => z.height)),
    screenBottom: innerHeight,
  };
});

test("the phone bar holds with Dad Mode on and off, at all seven sizes, on every screen and state, with cards that wrap to two lines", async ({ page, shot, note, browserErrors }, testInfo) => {
  test.setTimeout(1_800_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seeded(page);
  const bar = [], cut = [];
  let checks = 0, twoLine = 0;
  for (const [w, h] of SIZES[testInfo.project.name]) {
    await page.setViewportSize({ width: w, height: h });
    for (const fonts of ["fallback", "real"]) for (const dad of [true, false]) {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await (fonts === "real" ? realFonts(page) : fallbackFonts(page));
      const tag = `${w}x${h}, ${fonts} fonts, Dad Mode ${dad ? "on" : "off"}`;
      const check = async label => {
        checks++;
        const { problems } = await touchTargets(page);
        bar.push(...problems.map(p => `${tag}, ${label}: ${p}`));
      };
      const fits = async label => {
        const f = await zoneFit(page);
        if (f.lines >= 2) twoLine++;
        if (f.height < 48 || f.top < f.wrapTop - 0.5 || f.bottom > f.wrapBottom + 0.5) cut.push(`${tag}, ${label}: zones ${f.top.toFixed(1)} to ${f.bottom.toFixed(1)} in a timeline ${f.wrapTop.toFixed(1)} to ${f.wrapBottom.toFixed(1)}`);
        return f;
      };
      await page.goto(V1);
      await page.evaluate(dad => localStorage.setItem("dadMode", String(dad)), dad);
      await page.goto(V2);
      await expect(page.locator("#screen-start .title")).toBeVisible();
      await page.evaluate(async () => { await Promise.allSettled([...document.fonts].map(f => f.load())); await document.fonts.ready; });
      await page.waitForTimeout(450);
      await check("title");
      await page.evaluate(() => document.getElementById("screen-start").scrollTo(0, 1e6));
      await page.waitForTimeout(50);
      await check("title, scrolled to the end");

      await page.locator(".btn-category[data-category=presidents]").dispatchEvent("click");
      await page.waitForTimeout(600);
      await check("play");
      await page.locator("#btn-menu-game").dispatchEvent("click");
      await page.waitForTimeout(150);
      await check("pause");
      await page.locator("#btn-resume").dispatchEvent("click");
      await page.waitForTimeout(150);
      let tightest = await fits("first card");
      for (let i = 0; i < 4; i++) { // with the three wrong guesses below, seven cards in all
        await page.locator("#timeline .drop-zone").nth(await slotFor(page)).dispatchEvent("click");
        await page.waitForTimeout(700);
        await check(`card ${i + 1} placed, toast`);
        await page.waitForTimeout(1600);
        await check(`card ${i + 2}`);
        const f = await fits(`card ${i + 2}`);
        if (f.wrapTop > tightest.wrapTop) tightest = f;
        if (w === 740 && dad && fonts === "real" && i === 1) await shot("dad-mode-740-two-line-cards");
      }
      if (w === 740 && dad) note(`Dad Mode on, 740x360, Presidents, ${fonts} fonts: timeline ${tightest.wrapTop.toFixed(0)}–${tightest.wrapBottom.toFixed(0)}, zones ${tightest.top.toFixed(0)}–${tightest.bottom.toFixed(0)}, ${tightest.height.toFixed(0)} px tall, ${(tightest.screenBottom - tightest.bottom).toFixed(0)} px from the bottom edge, ${tightest.lines} lines of clue`);
      for (let i = 0; i < 3; i++) {
        await page.locator("#timeline .drop-zone").nth(await slotFor(page, true)).dispatchEvent("click");
        await page.waitForTimeout(700);
        await check(`wrong guess ${i + 1}, toast`);
        await page.waitForTimeout(1100);
      }
      await expect(page.locator("#screen-gameover")).toHaveClass(/active/, { timeout: 5000 });
      await page.waitForTimeout(500);
      await check("game over");
      await page.locator("#btn-menu-gameover").dispatchEvent("click");
      await page.waitForTimeout(450);
      await page.locator("#btn-endless").dispatchEvent("click");
      await page.waitForTimeout(600);
      await check("Endless");
      await fits("Endless");
      await page.locator("#timeline .drop-zone").nth(await slotFor(page)).dispatchEvent("click");
      await page.waitForTimeout(2300);
      await check("Endless, card placed");
      // What the game does when an Endless deck runs out
      await page.evaluate(() => {
        document.getElementById("current-card").classList.add("hidden");
        document.getElementById("btn-reset-events").classList.remove("hidden");
      });
      await page.waitForTimeout(100);
      await check("Endless, deck ran out");
    }
  }
  note(`${checks} touchTargets() runs on Dad Mode on and off, fallback and real fonts, ${SIZES[testInfo.project.name].length} sizes: title, title scrolled to the end, play, pause, each card placed with its toast, the next card, wrong guesses, game over, Endless and its Reset Events: ${bar.length} problems`);
  note(`${twoLine} of the cards dealt ran to two lines or more; every drop zone stayed at least 48 px tall and whole inside the timeline`);
  expect(twoLine).toBeGreaterThan(0);
  expect(cut).toEqual([]);
  expect(bar).toEqual([]);
  expect(browserErrors).toEqual([]);
});

// Medium and Hard games deal Wikipedia cards up to 199 characters, far longer than any curated card. Each one
// starts with its year so the spec can tell them apart, and they're the length the game lets through.
const FILLER = "a long account of a very old event told in full with every place and person named along the way, so that the clue runs on for line after line and takes up most of the card on the screen of a phone";
const WIKI = Array.from({ length: 40 }, (_, i) => {
  const year = 1000 + i * 20;
  return { year, text: `In ${year}, ${FILLER.slice(0, 150 + (i % 6) * 8)}`, pages: [] };
});

test("the longest Wikipedia cards on a sideways phone: the timeline keeps room for whole zones, and a real tap reaches them", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.skip(!isMobile, "sideways phones only");
  test.setTimeout(600_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seeded(page);
  await fallbackFonts(page);
  await page.route("https://en.wikipedia.org/api/rest_v1/feed/onthisday/**", route => route.fulfill({ json: { events: WIKI } }));
  const bar = [], lost = [];
  let longest = 0;
  for (const [w, h] of SIZES.phone.filter(([w]) => w > 600)) {
    await page.setViewportSize({ width: w, height: h });
    for (const dad of [true, false]) {
      const tag = `${w}x${h}, Dad Mode ${dad ? "on" : "off"}`;
      const start = async url => {
        await page.goto(V1);
        await page.evaluate(dad => localStorage.setItem("dadMode", String(dad)), dad);
        await open(page, url);
        await page.locator(".btn-difficulty.hard").dispatchEvent("click");
        await expect(page.locator("#screen-game")).toHaveClass(/active/, { timeout: 15_000 });
        await page.waitForTimeout(700);
      };
      await start(V1);
      const wrap1 = await page.evaluate(() => document.querySelector(".timeline-wrapper").getBoundingClientRect().height);
      await start(V2);
      const wrap2 = await page.evaluate(() => document.querySelector(".timeline-wrapper").getBoundingClientRect().height);
      if (wrap2 < wrap1 - 0.5) lost.push(`${tag}: the timeline shrank from ${wrap1.toFixed(1)} to ${wrap2.toFixed(1)} px`);
      for (let i = 0; i < 2; i++) {
        const f = await zoneFit(page);
        longest = Math.max(longest, f.lines);
        const { problems } = await touchTargets(page);
        bar.push(...problems.map(p => `${tag}, card ${i + 1}: ${p}`));
        if (f.height < 48 || f.top < f.wrapTop - 0.5 || f.bottom > f.wrapBottom + 0.5) lost.push(`${tag}, card ${i + 1}: zones ${f.top.toFixed(1)} to ${f.bottom.toFixed(1)} in a timeline ${f.wrapTop.toFixed(1)} to ${f.wrapBottom.toFixed(1)}`);
        const end = await page.evaluate(() => { const s = document.getElementById("screen-game"); return s.scrollHeight - s.scrollTop - s.clientHeight; });
        if (f.wrapBottom + end - f.bottom < 8 - 0.5) lost.push(`${tag}, card ${i + 1}: zones under 8 px from the end of the page`);
        // A real tap on the screen as it stands, with nothing scrolled for the player
        const spot = await page.evaluate(() => {
          for (const z of document.querySelectorAll("#timeline .drop-zone")) {
            const b = z.getBoundingClientRect(), x = b.left + b.width / 2, y = (Math.max(0, b.top) + Math.min(innerHeight, b.bottom)) / 2;
            if (x > 8 && x < innerWidth - 8 && b.top + b.height / 2 < innerHeight && z.contains(document.elementFromPoint(x, y))) return { x, y };
          }
          return null;
        });
        if (!spot) { lost.push(`${tag}, card ${i + 1}: no drop zone on screen to tap`); break; }
        const before = await page.locator("#timeline .timeline-card").count();
        await page.touchscreen.tap(spot.x, spot.y);
        await expect(page.locator("#timeline .timeline-card")).toHaveCount(before + 1);
        if (i === 0 && dad && w === 740) await shot("long-wikipedia-card-740");
        await page.waitForTimeout(1800);
      }
      note(`${tag}, the same first card of over 150 characters: timeline ${wrap1.toFixed(0)} px tall in jeremy.v1, ${wrap2.toFixed(0)} px in jeremy.v2`);
    }
  }
  note(`the longest card ran to ${longest} lines`);
  expect(longest).toBeGreaterThanOrEqual(4);
  expect(lost).toEqual([]);
  expect(bar).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("pausing right after the last wrong guess leaves the game over screen clear", async ({ page, note, browserErrors }) => {
  await seeded(page);
  await open(page);
  await page.locator(".btn-category[data-category=presidents]").dispatchEvent("click");
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) {
    await page.locator("#timeline .drop-zone").nth(await slotFor(page, true)).dispatchEvent("click");
    if (i < 2) await page.waitForTimeout(1700);
  }
  await page.locator("#btn-menu-game").dispatchEvent("click");
  await page.keyboard.press("Escape");
  await expect(page.locator("#screen-gameover")).toHaveClass(/active/, { timeout: 5000 });
  await expect(page.locator("#pause-menu")).toBeHidden();
  expect((await state(page)).paused).toBe(false);
  note("the X and Escape during the last wrong guess's 1.5 s do nothing; the game over screen comes up clear");
  expect(browserErrors).toEqual([]);
});

test("what stays still works: a topic game played to the end, the same cards and scoring as jeremy.v1", async ({ page, isMobile, shot, note, browserErrors }) => {
  await seeded(page);
  await open(page);
  // 10 events: the first is on the timeline, nine to place
  await page.locator("#event-count").fill("10");
  await expect(page.locator("#event-count-display")).toHaveText("10");
  await startSpace(page, isMobile);
  let wrong = 0;
  for (let i = 0; i < 9; i++) {
    const miss = i === 3; // one wrong guess on the way
    await page.locator("#timeline .drop-zone").nth(await slotFor(page, miss)).dispatchEvent("click");
    if (miss) wrong++;
    if (i === 0) { await expect(page.locator("#feedback-toast")).toContainText("Correct!"); await shot("placed"); }
    await page.waitForTimeout(1700);
  }
  await expect(page.locator("#screen-gameover")).toHaveClass(/active/, { timeout: 5000 });
  await expect(page.locator("#gameover-title")).toHaveText("YOU WIN!");
  await expect(page.locator("#final-score")).toHaveText("8");
  await expect(page.locator(".mini-card")).toHaveCount(10);
  await page.waitForTimeout(400);
  await shot("game-over");
  note(`10 Space events: 8 right and ${wrong} wrong, then YOU WIN! with all 10 on the final timeline`);
  expect(browserErrors).toEqual([]);
});

test("a jeremy.v1 save loads in jeremy.v2, under the same key, and jeremy.v1 reads what jeremy.v2 writes", async ({ page, isMobile, note, browserErrors }) => {
  await seedSave(page, { dadMode: "true" });
  await open(page);
  await expect(page.locator("body")).toHaveClass(/dad-mode/);
  await expect(page.locator("#dad-mode-toggle")).toBeChecked();
  expect((await state(page)).dadMode).toBe(true);
  await tap(page, isMobile, ".dad-toggle-label");
  await expect(page.locator("body")).not.toHaveClass(/dad-mode/);
  const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(stored).toEqual({ dadMode: "false" });
  await page.goto(V1);
  await expect(page.locator("#screen-start .title")).toBeVisible();
  await expect(page.locator("#dad-mode-toggle")).not.toBeChecked();
  await expect(page.locator("body")).not.toHaveClass(/dad-mode/);
  note('seeded dadMode = "true" → jeremy.v2 opened in Dad Mode; turning it off saved dadMode = "false" (the only key), and jeremy.v1 then opened with Dad Mode off');
  expect(browserErrors).toEqual([]);
});

test("storage that throws doesn't stop jeremy.v2", async ({ page, note, browserErrors }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  await open(page);
  await page.locator(".dad-toggle-label").click();
  await expect(page.locator("body")).toHaveClass(/dad-mode/);
  await page.locator(".btn-category[data-category=space]").click();
  await expect(page.locator("#screen-game")).toHaveClass(/active/);
  note("with localStorage throwing, the title opens, Dad Mode toggles and a game starts");
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still opens and plays", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page, V1);
  await startSpace(page, isMobile);
  const left = await page.locator("#remaining").textContent();
  await tap(page, isMobile, "#timeline .drop-zone");
  await expect(page.locator("#remaining")).not.toHaveText(left);
  await shot("v1-plays");
  note(`${V1}: Space topic, then a drop zone placed the card (Left: ${left} → ${await page.locator("#remaining").textContent()})`);
  expect(browserErrors).toEqual([]);
});

test("games.json makes jeremy.v2 the default and still offers jeremy.v1", async ({ note }) => {
  const g = games.find(x => x.slug === SLUG);
  expect(g.creator).toBe("jeremy");
  expect(g.default).toBe("jeremy.v2");
  expect(g.url).toBe(V2);
  expect(g.versions.map(v => v.id)).toEqual(["jeremy.v1", "jeremy.v2"]);
  expect(g.versions[0]).toMatchObject({ url: V1, source: { repo: "jwildfire/timedout" } });
  const v2 = g.versions[1];
  expect(v2).toMatchObject({ url: V2, from: "jeremy.v1", idea: 226, note: "Play it with keys" });
  expect(v2.source, "built in GameOn, not copied from jwildfire/timedout").toBeUndefined();
  expect(g.repo).toBe("https://github.com/jwildfire/timedout");
  note(`default ${g.default} at ${g.url}; jeremy.v1 still at ${V1}`);
});

test("the arcade plays jeremy.v2 by default, and the version picker still offers jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await page.locator(`#shelf .cart[href="#${SLUG}"]`).click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(page.locator('#ver-list .ver-item[data-version="jeremy.v1"]')).toBeVisible();
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  const game = page.frameLocator("#frame");
  await expect(game.locator("#screen-start .title")).toBeVisible();
  await game.locator(".btn-category[data-category=space]").click();
  await expect(game.locator("#screen-game")).toHaveClass(/active/);
  await expect(page.locator("#ver-select")).toHaveValue("jeremy.v2");
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  note("card → picker (jeremy.v2 Latest, jeremy.v1) → jeremy.v2 plays in the frame; #timedout@jeremy.v1 opens jeremy.v1");
  expect(browserErrors).toEqual([]);
});
