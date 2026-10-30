// Evidence for game idea #231: Delve Squad jeremy.v2, Jeremy's phone-and-keyboard pass (the phone bar from #187:
// Sound, Pause and speed 48 x 48 with 8 px between them, the hero and loot cards 8 px apart, and A/D picking a hero
// like the arrows with W/S or Up/Down moving through the loot). The creator's update, started from jeremy.v1 at
// games/delve-squad/, and the new default. Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/231-delve-squad-jeremy-v2
// The game clock is held and stepped by hand (__ds.hold / __ds.step) and the dice are seeded (__ds.seed), so both
// versions see the same squad, loot, floors and fights.
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "delve-squad";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const ds = (page, fn, arg) => page.evaluate(fn, arg);
const state = page => ds(page, () => __ds.state);
const box = (page, sel) => page.locator(sel).first().evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: innerWidth - r.right, bottom: innerHeight - r.bottom }; });
// the clear space between two boxes, side by side or one above the other
const apart = (a, b) => Math.round(100 * Math.max(Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w), Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h))) / 100;
async function press(page, isMobile, sel) {
  if (isMobile) { const b = await box(page, sel); await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2); } else await page.locator(sel).first().click();
}
async function open(page, url = V2) {
  await page.goto(url);
  await expect(page.locator("#start-btn")).toBeVisible();
  await ds(page, () => { __ds.hold(true); __ds.seed(42); });
}
async function squad(page, isMobile) {
  await press(page, isMobile, "#start-btn");
  for (const k of ["fighter", "cleric", "wizard"]) await press(page, isMobile, `.cls[data-cls="${k}"]`);
  await press(page, isMobile, "#party-go");
  await expect(page.locator("#gear")).toBeVisible();
}

test.describe.configure({ timeout: 90_000 });

test("jeremy.v2 opens to its title screen and starts, with nothing loaded from the internet", async ({ page, isMobile, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  await expect(page.locator(".logo")).toHaveAttribute("aria-label", "Delve Squad");
  await expect(page.locator("#title")).toContainText("Designed by Jeremy");
  await page.waitForTimeout(300);
  await shot("title");
  await squad(page, isMobile);
  await press(page, isMobile, "#gear-go");
  await expect(page.locator("#delve")).toBeVisible();
  await ds(page, () => __ds.step(3.4));
  expect((await state(page)).phase).toBe("fight");
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const site = new URL(page.url()).origin;
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`${isMobile ? "tapped" : "clicked"} Start a delve, three classes, Delve! and Delve to Floor 1: the fight is on; ${requested.length} requests, all to this site; no sideways scrolling`);
  await shot("fight");
  expect(browserErrors).toEqual([]);
});

// ---------- the change: buttons a finger can hit ----------

// touchTargets() measures a card's whole box, even the part its scrolling list hides. When a long loot list runs
// under the bottom bar (only with wider fonts or a long list), that hidden part "touches" the Delve button though no
// finger can reach it. Those pairs are allowed only if the card really is cut off by its list and the list's visible
// edge is 8 px clear of the button.
async function phoneBar(page, label) {
  const { targets, problems } = await touchTargets(page);
  const clipped = await page.evaluate(() => [...document.querySelectorAll(".scroll")].filter(s => s.checkVisibility()).map(s => {
    const r = s.getBoundingClientRect();
    const foot = s.parentElement.querySelector(".foot");
    const btns = foot && foot.checkVisibility() ? [...foot.querySelectorAll("button")].map(b => { const q = b.getBoundingClientRect(); return { name: (b.innerText || "").trim(), top: q.top }; }) : [];
    const cut = [...s.querySelectorAll("button")].filter(b => b.getBoundingClientRect().bottom > r.bottom + 0.5).map(b => (b.getAttribute("aria-label") || b.innerText || "").trim().replace(/\s+/g, " ").slice(0, 24));
    return { bottom: r.bottom, btns, cut };
  }));
  const hidden = problems.filter(p => {
    const m = p.match(/^"(.+)" and "(.+)" are \d+ px apart/);
    return m && clipped.some(c => c.cut.includes(m[1]) && c.btns.some(b => b.name === m[2] && b.top - c.bottom >= 8));
  });
  expect(problems.filter(p => !hidden.includes(p)), `${label}: every button 48 x 48, 8 px apart and from the edges`).toEqual([]);
  return { targets, hidden };
}

test("every button is 48 x 48 or bigger, 8 px apart and from the edges, and each tap does its job", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.addInitScript(() => { try { localStorage.setItem("gameon.delve-squad.best", "3"); } catch (e) {} });
  await open(page);
  const lines = [];
  const count = async (label) => { const { targets, hidden } = await phoneBar(page, label); lines.push(`${label} ${targets.length}${hidden.length ? ` (${hidden.length} hidden-card pairs)` : ""}`); return targets; };
  // title: Sound is 48 x 48 and a tap turns it off and on
  await count("title");
  const sound = await box(page, "#sound-btn");
  expect([Math.round(sound.w), Math.round(sound.h)]).toEqual([48, 48]);
  await press(page, isMobile, "#sound-btn");
  await expect(page.locator("#sound-btn")).toHaveClass(/off/);
  await press(page, isMobile, "#sound-btn");
  await expect(page.locator("#sound-btn")).not.toHaveClass(/off/);
  // squad screen: the back button is 48 x 48; the three slots are 8 px apart
  await press(page, isMobile, "#start-btn");
  await expect(page.locator("#party")).toBeVisible();
  await count("squad");
  const back = await box(page, "#party-back");
  expect([Math.round(back.w), Math.round(back.h), back.right]).toEqual([48, 48, 8]);
  for (const k of ["fighter", "cleric", "wizard"]) await press(page, isMobile, `.cls[data-cls="${k}"]`);
  await expect(page.locator(".slot.full")).toHaveCount(3);
  await count("squad, three picked");
  const slots = await page.locator(".slot").evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }));
  expect([apart(slots[0], slots[1]), apart(slots[1], slots[2])]).toEqual([8, 8]);
  await press(page, isMobile, "#party-go");
  await expect(page.locator("#gear")).toBeVisible();
  // campfire: Pause 48 x 48, 8 px from the top and right; hero cards and loot cards 8 px apart, on whole pixels
  await count("campfire");
  const menu = await box(page, "#gear-menu");
  expect([menu.w, menu.h, menu.y, menu.right]).toEqual([48, 48, 8, 8]);
  const cards = sel => page.locator(sel).evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }));
  const heroes = await cards(".hero"), loot = await cards(".item");
  expect([apart(heroes[0], heroes[1]), apart(heroes[1], heroes[2])]).toEqual([8, 8]);
  const lootGaps = [];
  for (let i = 0; i < loot.length; i++) for (let j = i + 1; j < loot.length; j++) {
    const a = loot[i], b = loot[j];
    if (Math.abs(a.y - b.y) < 1 || Math.abs(a.x - b.x) < 1) lootGaps.push(Math.round(apart(a, b) * 100) / 100);
  }
  expect(Math.min(...lootGaps)).toBe(isMobile ? 8 : 10);                         // 8 on a phone; jeremy.v1's 10 on a wide screen
  expect([...heroes, ...loot].every(c => Number.isInteger(c.w) && Number.isInteger(c.h))).toBe(true);
  // tap the Wizard, then a card: the card goes to the Wizard
  await press(page, isMobile, ".hero >> nth=2");
  expect((await state(page)).sel).toBe(2);
  await press(page, isMobile, ".item >> nth=1");
  expect((await state(page)).choice[2]).toBe(1);
  await count("campfire, one card taken");
  await shot("campfire");
  // pause at the campfire
  await press(page, isMobile, "#gear-menu");
  await expect(page.locator("#pause")).toBeVisible();
  await count("paused at the campfire");
  await press(page, isMobile, "#resume-btn");
  await expect(page.locator("#pause")).toBeHidden();
  // the delve: speed and Pause 48 x 48, 8 px apart, Pause 8 px from the right
  await press(page, isMobile, "#gear-go");
  await expect(page.locator("#delve")).toBeVisible();
  await ds(page, () => __ds.step(3.4));
  await count("delve");
  const speed = await box(page, "#speed"), dmenu = await box(page, "#d-menu");
  expect([speed.w, speed.h, dmenu.w, dmenu.h, apart(speed, dmenu), dmenu.right]).toEqual([48, 48, 48, 48, 8, 8]);
  await press(page, isMobile, "#speed");
  await expect(page.locator("#speed")).toHaveText("2×");
  await shot("delve");
  await press(page, isMobile, "#d-menu");
  await expect(page.locator("#pause")).toBeVisible();
  expect((await state(page)).paused).toBe(true);
  await count("paused in the delve");
  for (const id of ["#resume-btn", "#restart-btn", "#pause-sound", "#pause-title"]) expect((await box(page, id)).h).toBeGreaterThanOrEqual(48);
  await shot("paused");
  // start over from pause: back to the squad screen with the same three
  await press(page, isMobile, "#restart-btn");
  await expect(page.locator("#party")).toBeVisible();
  await expect(page.locator(".slot.full")).toHaveCount(3);
  await press(page, isMobile, "#party-go");
  await press(page, isMobile, "#gear-go");
  await ds(page, () => { __ds.step(2); __ds.wipe(); __ds.step(0.1); __ds.step(2.6); });
  await expect(page.locator("#over")).toBeVisible();
  await count("game over");
  for (const id of ["#again-btn", "#newsquad-btn", "#over-title"]) expect((await box(page, id)).h).toBeGreaterThanOrEqual(48);
  await shot("game-over");
  await press(page, isMobile, "#again-btn");
  expect((await state(page)).screen).toBe("gear");
  note(`${isMobile ? "tapped (touchscreen)" : "clicked"} Sound (48x48, off and on), Start, three classes, Delve!, a hero, a card, Pause and Keep going, Delve, speed (1x to 2x), Pause, Start over, Same squad; touch targets with no problems: ${lines.join("; ")}`);
  note(`campfire: Pause ${menu.w}x${menu.h} at ${menu.y} px from the top and ${menu.right} from the right; hero cards ${apart(heroes[0], heroes[1])} and ${apart(heroes[1], heroes[2])} px apart; loot cards ${Math.min(...lootGaps)} px apart; delve: speed ${speed.w}x${speed.h} and Pause ${dmenu.w}x${dmenu.h}, ${apart(speed, dmenu)} px apart`);
  expect(browserErrors).toEqual([]);
});

test("WASD and the arrows both pick heroes and loot, Space takes a card, and P or Escape pauses", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.skip(isMobile, "keyboard check at desktop size");
  await open(page);
  // squad screen: A/D and Left/Right, W/S and Up/Down move a card; Space adds it
  await page.keyboard.press("Enter");
  await expect(page.locator("#party")).toBeVisible();
  const pcur = async () => (await state(page)).pcur;
  const moved = {};
  await page.keyboard.press("d"); expect(await pcur()).toBe(0);                    // the first press shows the card
  for (const [key, want] of [["d", 1], ["ArrowRight", 2], ["a", 1], ["ArrowLeft", 0]]) { await page.keyboard.press(key); moved[key] = await pcur(); expect(moved[key], key).toBe(want); }
  const cols = await page.locator("#classes").evaluate(e => getComputedStyle(e).gridTemplateColumns.split(" ").length);
  const down = cols >= 4 ? 1 : cols;                                             // one row: down steps along it
  for (const [key, want] of [["s", down], ["w", 0], ["ArrowDown", down], ["ArrowUp", 0]]) { await page.keyboard.press(key); moved[key] = await pcur(); expect(moved[key], key).toBe(want); }
  await expect(page.locator(".cls.cur")).toHaveCount(1);
  await page.keyboard.press(" ");
  for (const key of ["d", "d", " ", "ArrowRight", " "]) await page.keyboard.press(key);
  expect((await state(page)).picks).toEqual(["fighter", "cleric", "wizard"]);
  note(`squad screen (${cols} columns): ${Object.entries(moved).map(([k, v]) => `${k}→card ${v + 1}`).join(", ")}; Space added Fighter, Cleric, Wizard`);
  await page.keyboard.press("Enter");
  await expect(page.locator("#gear")).toBeVisible();
  // campfire: D and Right pick the next hero, A and Left the one before
  const sel = async () => (await state(page)).sel;
  const heroKeys = {};
  for (const [key, want] of [["d", 1], ["ArrowRight", 2], ["a", 1], ["ArrowLeft", 0], ["D", 1], ["A", 0]]) { await page.keyboard.press(key); heroKeys[key] = await sel(); expect(heroKeys[key], key).toBe(want); }
  await expect(page.locator(".hero").nth(0)).toHaveClass(/sel/);
  // W/S and Up/Down move through the loot, and Space gives that card to the picked hero
  const cur = async () => (await state(page)).cur;
  const lootKeys = {};
  await page.keyboard.press("s"); expect(await cur()).toBe(0);
  for (const [key, want] of [["s", 1], ["ArrowDown", 2], ["w", 1], ["ArrowUp", 0], ["ArrowUp", 4], ["S", 0]]) { await page.keyboard.press(key); lootKeys[key + (key === "ArrowUp" && want === 4 ? " (wraps)" : "")] = await cur(); expect(await cur(), key).toBe(want); }
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
  await expect(page.locator(".item.cur")).toHaveCount(1);
  await expect(page.locator(".item").nth(2)).toHaveClass(/cur/);
  await shot("campfire-keys");
  await page.keyboard.press(" ");
  let s = await state(page);
  expect(s.choice[0]).toBe(2);
  expect(s.screen).toBe("gear");                                                // Space took the card; it didn't delve
  expect(s.sel).toBe(1);                                                        // and the next hero without a card is picked
  // the 1–7 keys still work
  await page.keyboard.press("4");
  expect((await state(page)).choice[1]).toBe(3);
  // P pauses at the campfire, Escape keeps going
  await page.keyboard.press("p");
  await expect(page.locator("#pause")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeHidden();
  // Enter delves; in the fight Escape pauses and P keeps going; Space still changes speed
  await page.keyboard.press("Enter");
  await expect(page.locator("#delve")).toBeVisible();
  await ds(page, () => __ds.step(3.4));
  await page.keyboard.press(" ");
  expect((await state(page)).speed).toBe(2);
  await page.keyboard.press("Escape");
  expect((await state(page)).paused).toBe(true);
  await page.keyboard.press("P");
  expect((await state(page)).paused).toBe(false);
  s = await state(page);
  expect(s.party[0].items.filter(Boolean).length + s.party[1].items.filter(Boolean).length).toBe(2);
  note(`campfire heroes: ${Object.entries(heroKeys).map(([k, v]) => `${k}→hero ${v + 1}`).join(", ")}; loot: ${Object.entries(lootKeys).map(([k, v]) => `${k}→card ${v + 1}`).join(", ")}; Space gave card 3 to the Fighter, key 4 gave card 4 to the Cleric; P paused and Escape resumed at the campfire, Escape paused and P resumed in the fight`);
  expect(browserErrors).toEqual([]);
});

// ---------- every screen against jeremy.v1 ----------

// Everything a screen shows, line by line: each line of text with how much of it is on screen, whether something
// covers it and its font size; the play area; anything scrolling sideways.
function measure() {
  const vw = innerWidth, vh = innerHeight;
  const keyOf = el => {
    const parts = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id) { parts.unshift("#" + e.id); break; }
      const sib = [...e.parentElement.children].filter(x => x.tagName === e.tagName && !x.classList.contains("btns"));
      parts.unshift(e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).filter(c => !["sel", "mine", "taken", "cur", "full", "off", "out"].includes(c)).join(".") : "") + (sib.length > 1 ? `:${sib.indexOf(e)}` : ""));
    }
    return parts.join(" > ");
  };
  const clipOf = el => {
    const box = { l: 0, t: 0, r: vw, b: vh };
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const r = e.getBoundingClientRect(), l = r.left + e.clientLeft, t = r.top + e.clientTop;
      if (cs.overflowX !== "visible") { box.l = Math.max(box.l, l); box.r = Math.min(box.r, l + e.clientWidth); }
      if (cs.overflowY !== "visible" && e !== el) { box.t = Math.max(box.t, t); box.b = Math.min(box.b, t + e.clientHeight); }
    }
    return box;
  };
  const lines = [], range = document.createRange(), walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent, el = n.parentElement;
    if (!t.trim() || ["SCRIPT", "STYLE", "TITLE"].includes(el.tagName)) continue;
    if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const clip = clipOf(el), mine = [];
    let cur = null;
    for (let i = 0; i < t.length; i++) {
      range.setStart(n, i); range.setEnd(n, i + 1);
      const b = range.getClientRects()[0];
      if (!b) continue;
      if (/\s/.test(t[i])) { if (cur) cur.text += " "; continue; }
      if (cur && Math.abs(b.top - cur.top) < 3 && b.left >= cur.right - 3) { cur.text += t[i]; cur.right = Math.max(cur.right, b.right); cur.bottom = Math.max(cur.bottom, b.bottom); }
      else { if (cur) mine.push(cur); cur = { text: t[i], left: b.left, top: b.top, right: b.right, bottom: b.bottom }; }
    }
    if (cur) mine.push(cur);
    for (const ln of mine) {
      const vis = { l: Math.max(ln.left, clip.l), r: Math.min(ln.right, clip.r), t: Math.max(ln.top, clip.t), b: Math.min(ln.bottom, clip.b) };
      const visW = Math.max(0, vis.r - vis.l), visH = Math.max(0, vis.b - vis.t);
      let covered = 0;
      if (visW > 0 && visH > 0) for (let k = 0; k < 7; k++) {
        const at = document.elementFromPoint(vis.l + 1 + (visW - 2) * k / 6, (vis.t + vis.b) / 2);
        if (!(at && (at === el || el.contains(at) || at.contains(el)))) covered++;
      }
      lines.push({ key: keyOf(el), text: ln.text.trim().replace(/\s+/g, " "), fs: parseFloat(getComputedStyle(el).fontSize), visW: +visW.toFixed(1), visH: +visH.toFixed(1),
        whole: visW >= ln.right - ln.left - 0.5 && visH >= ln.bottom - ln.top - 0.5, covered });
    }
  }
  const wide = [];
  if (document.scrollingElement.scrollWidth > vw) wide.push(`page ${document.scrollingElement.scrollWidth}`);
  for (const e of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(e);
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && e.scrollWidth > e.clientWidth + 1 && e.checkVisibility()) wide.push(`${e.id || e.className} ${e.scrollWidth}>${e.clientWidth}`);
  }
  let arena = null;
  const a = document.getElementById("arena");
  if (a.checkVisibility()) {
    const r = a.getBoundingClientRect();
    let free = 0;
    for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) if (document.elementFromPoint(r.left + (i + 0.5) * r.width / 20, r.top + (j + 0.5) * r.height / 20) === a) free++;
    arena = { w: +r.width.toFixed(1), h: +r.height.toFixed(1), free: free / 400, hudBottom: +document.querySelector("#delve .top").getBoundingClientRect().bottom.toFixed(1), squadTop: +document.getElementById("squad").getBoundingClientRect().top.toFixed(1) };
  }
  const bars = [...document.querySelectorAll(".top, .foot, .squad")].filter(e => e.checkVisibility()).map(e => ({ key: keyOf(e), h: +e.getBoundingClientRect().height.toFixed(1) }));
  return { lines, wide, arena, bars };
}

const FONTS = {
  real: "",
  // what a machine without Palatino and Trebuchet MS shows (CI has neither)
  fallback: ":root { --serif: serif !important; --sans: sans-serif !important; }",
  // a wider stand-in, the way another machine's fallback fonts can be
  wide: ':root { --serif: Verdana, "DejaVu Sans", sans-serif !important; --sans: Verdana, "DejaVu Sans", sans-serif !important; } * { letter-spacing: .4px !important; }'
};
const PHONE_SIZES = [[375, 812], [812, 375], [667, 375], [740, 360]];
const DESKTOP_SIZES = [[1024, 768], [1280, 800], [1366, 768]];

// Walk one version through every screen with the same save and seed, measuring each as the player lands on it.
async function walk(browser, baseURL, url, [w, h], font, phone, pictures) {
  const ctx = await browser.newContext({ baseURL, viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem("gameon.delve-squad.best", "3"); localStorage.setItem("gameon.delve-squad.runs", "4"); } catch (e) {} });
  await page.goto(url);
  if (FONTS[font]) await page.addStyleTag({ content: FONTS[font] });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { __ds.hold(true); __ds.seed(42); });
  const out = {};
  const snap = async name => {
    await page.evaluate(() => document.querySelectorAll(".scroll").forEach(e => { e.scrollTop = 0; }));
    await page.waitForTimeout(60);
    out[name] = await page.evaluate(`(${measure})()`);
    if (pictures && pictures.includes(name)) out[name].png = (await page.screenshot({ type: "jpeg", quality: 70 })).toString("base64");
  };
  const click = sel => page.locator(sel).first().click();
  await snap("title");
  await click("#start-btn"); await snap("squad");
  for (const k of ["fighter", "cleric", "wizard"]) await click(`.cls[data-cls="${k}"]`);
  await snap("squad, three picked");
  await click("#party-go"); await snap("campfire");
  await click(".hero >> nth=2");
  const weapon = await page.evaluate(() => __ds.state.loot.findIndex(i => i.slot === "weapon"));
  await click(`.item >> nth=${weapon}`); await click(".hero >> nth=2");
  await snap("campfire, a card taken");
  await click("#gear-menu"); await snap("paused at the campfire"); await click("#resume-btn");
  await click("#gear-go"); await page.evaluate(() => __ds.step(3.4)); await snap("delve");
  await click("#d-menu"); await snap("paused in the delve"); await click("#resume-btn");
  await page.evaluate(() => __ds.toFloor(5)); await snap("boss-floor campfire");
  await click("#gear-go");
  await page.evaluate(() => { while (__ds.state.room < 2 && __ds.state.screen === "delve") { __ds.fight(); __ds.step(2.3); } __ds.step(6); });
  await snap("boss room");
  await page.evaluate(() => { __ds.fight(); __ds.step(2.3); }); await snap("campfire after the boss");
  await click("#gear-go"); await page.evaluate(() => { __ds.step(2); __ds.wipe(); __ds.step(0.1); __ds.step(2.6); });
  await snap("game over");
  await ctx.close();
  return { screens: out, errors };
}

// What v1 showed whole stays whole, uncovered and the same size in v2; what v1 showed in part, v2 shows at least as
// much of; no text gets smaller; nothing scrolls sideways; the play area and the bars stay as they were.
function compare(m1, m2, where) {
  const fails = [];
  const byKey = m => { const o = {}; for (const l of m.lines) (o[l.key] = o[l.key] || []).push(l); return o; };
  const k1 = byKey(m1), k2 = byKey(m2);
  let whole = 0;
  for (const [key, ls] of Object.entries(k1)) {
    const ls2 = k2[key] || [];
    const reworded = key === "#gear-hint";                // jeremy.v2 names WASD in this hint
    for (const l of ls) {
      const twin = ls2.find(x => x.text === l.text);
      if (twin && twin.fs < l.fs) fails.push(`${where}: "${l.text}" got smaller`);
      if (l.whole && !l.covered) {
        whole++;
        if (twin && twin.whole && !twin.covered) continue;
        const allWhole = ls2.length && ls2.every(x => x.whole && !x.covered && x.fs >= l.fs);
        if (allWhole && (reworded || ls.map(x => x.text).join(" ") === ls2.map(x => x.text).join(" "))) continue;   // the same words, wrapped differently
        fails.push(`${where}: "${l.text}" (${key}) was whole in jeremy.v1, not in jeremy.v2`);
      } else if (twin && !l.covered && !(twin.whole && !twin.covered) && (twin.visW < l.visW - 0.5 || twin.visH < l.visH - 0.5)) {
        fails.push(`${where}: less of "${l.text}" shows (${l.visW}x${l.visH} -> ${twin.visW}x${twin.visH})`);
      }
    }
  }
  if (m2.wide.length) fails.push(`${where}: scrolls sideways: ${m2.wide.join(", ")}`);
  if (m1.arena) {
    const A = m1.arena, B = m2.arena;
    if (!B || B.w < A.w || B.h < A.h || B.free < A.free || B.hudBottom > A.hudBottom || B.squadTop < A.squadTop) fails.push(`${where}: play area ${JSON.stringify(A)} -> ${JSON.stringify(B)}`);
  }
  for (const bar of m1.bars) { const t = m2.bars.find(x => x.key === bar.key); if (t && t.h > bar.h + 0.5) fails.push(`${where}: ${bar.key} grew ${bar.h} -> ${t.h}`); }
  return { fails, whole };
}

// One check per size: phone sizes run in the phone project (touch), desktop sizes in the desktop project.
for (const size of [...PHONE_SIZES, ...DESKTOP_SIZES]) {
  const phoneSize = PHONE_SIZES.includes(size);
  const pics = size[0] === 812 || size[0] === 1280;
  test.describe(() => {
  // skipped before the page is set up, so the other project spends nothing on it
  test.skip(({ isMobile }) => isMobile !== phoneSize, phoneSize ? "a phone size: measured in the phone project" : "a desktop size: measured in the desktop project");
  test(`at ${size.join(" x ")} every screen shows everything jeremy.v1 showed, with real, fallback and wide fonts`, async ({ browser, page, isMobile, shot, note }, testInfo) => {
    test.setTimeout(600_000);
    const baseURL = testInfo.project.use.baseURL;
    const fails = [];
    let pair = null;
    for (const font of Object.keys(FONTS)) {
      const want = pics && font === "real" ? ["campfire", "game over"] : null;
      const a = await walk(browser, baseURL, V1, size, font, isMobile, want);
      const b = await walk(browser, baseURL, V2, size, font, isMobile, want);
      expect(b.errors, "no console errors in jeremy.v2").toEqual([]);
      let whole = 0;
      for (const name of Object.keys(a.screens)) {
        const r = compare(a.screens[name], b.screens[name], `${size.join("x")} ${font} ${name}`);
        fails.push(...r.fails); whole += r.whole;
      }
      const A = a.screens.delve.arena, B = b.screens.delve.arena;
      note(`${font} fonts: all ${whole} lines jeremy.v1 showed whole on its ${Object.keys(a.screens).length} screens (${Object.keys(a.screens).join(", ")}) are whole, uncovered and as big in jeremy.v2; arena ${A.w}x${A.h} -> ${B.w}x${B.h}, top bar ends at ${A.hudBottom} -> ${B.hudBottom}, squad bar starts at ${A.squadTop} -> ${B.squadTop}, uncovered ${A.free * 100}% -> ${B.free * 100}%`);
      if (want) pair = { a: a.screens, b: b.screens };
    }
    expect(fails).toEqual([]);
    if (!pair) return;
    // the campfire and the game-over box side by side, jeremy.v1 left and jeremy.v2 right, same seed and save
    const img = (s, n) => `<figure><img src="data:image/jpeg;base64,${s[n].png}"><figcaption>${n}</figcaption></figure>`;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setContent(`<body style="margin:0;background:#222;color:#eee;font:14px sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px">
      <b>jeremy.v1 (${size.join("x")})</b><b>jeremy.v2</b>${img(pair.a, "campfire")}${img(pair.b, "campfire")}${img(pair.a, "game over")}${img(pair.b, "game over")}</div>
      <style>figure{margin:0}img{width:100%;display:block;border:1px solid #555}</style>`);
    await shot("side-by-side");
  });
  });
}

// ---------- what stays ----------

test("what stays still works: the squad clears the first room, the Rat King waits on Floor 5", async ({ page, note, browserErrors }) => {
  await open(page);
  await squad(page, false);
  await ds(page, () => __ds.autoGear());
  await page.locator("#gear-go").click();
  let s = await state(page);
  const monsters = s.monsters.length;
  expect(await ds(page, () => __ds.fight())).toBe("clear");
  s = await state(page);
  expect(s.stats.poofs).toBeGreaterThanOrEqual(monsters);
  await ds(page, () => __ds.step(2.3));
  expect((await state(page)).room).toBe(1);
  expect(await ds(page, () => __ds.toFloor(5))).toBe(true);
  await expect(page.locator("#gear-tags .boss")).toContainText("The Rat King");
  // the same seed makes the same loot in both versions
  const loot2 = (await state(page)).loot;
  await open(page, V1);
  await squad(page, false);
  expect(await ds(page, () => __ds.toFloor(5))).toBe(true);
  expect((await state(page)).loot).toEqual(loot2);
  note(`room 1's ${monsters} monsters poofed; Floor 5's campfire names the Rat King; with seed 42 Floor 5's loot is the same in jeremy.v1 and jeremy.v2: ${loot2.map(i => i.name).join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1's saves load in jeremy.v2 under the same keys", async ({ page, shot, note, browserErrors }) => {
  // what jeremy.v1 writes: the deepest floor, how many delves, and sound off
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("gameon.delve-squad.best", "7");
    localStorage.setItem("gameon.delve-squad.runs", "12");
    localStorage.setItem("gameon.delve-squad.sound", "off");
  });
  await open(page);
  await expect(page.locator("#title-best")).toHaveText("Deepest delve: Floor 7");
  await expect(page.locator("#sound-btn")).toHaveClass(/off/);
  await shot("saves");
  await squad(page, false);
  await expect(page.locator("#gear-tags")).toContainText("Deepest: Floor 7");
  await page.locator("#gear-go").click();
  await ds(page, () => { __ds.step(2); __ds.wipe(); __ds.step(0.1); __ds.step(2.6); });
  await expect(page.locator("#over-best")).toHaveText("Deepest delve: Floor 7");
  const saved = await ds(page, () => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  expect(saved).toEqual({ "gameon.delve-squad.best": "7", "gameon.delve-squad.runs": "13", "gameon.delve-squad.sound": "off" });
  // and jeremy.v1 reads what jeremy.v2 wrote
  await page.goto(V1);
  await expect(page.locator("#title-best")).toHaveText("Deepest delve: Floor 7");
  note(`seeded best 7, runs 12, sound off; jeremy.v2 showed Floor 7 and sound off, then saved runs 13 under the same three keys (${Object.keys(saved).join(", ")}); jeremy.v1 still reads them`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/delve-squad/", async ({ page, isMobile, note, browserErrors }) => {
  await open(page, V1);
  await squad(page, isMobile);
  await press(page, isMobile, "#gear-go");
  await expect(page.locator("#delve")).toBeVisible();
  expect(await ds(page, () => __ds.fight())).toBe("clear");
  const v = games.find(g => g.slug === SLUG).versions;
  expect(v.map(x => [x.id, x.url])).toEqual([["jeremy.v1", V1], ["jeremy.v2", V2]]);
  note(`jeremy.v1 opened at ${V1}, took a squad to the campfire and cleared the first room; games.json lists jeremy.v1 at ${V1} and jeremy.v2 at ${V2}`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Delve Squad offers both versions and plays jeremy.v2 by default; #delve-squad@jeremy.v1 still opens jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  const entry = games.find(g => g.slug === SLUG);
  expect([entry.default, entry.url]).toEqual(["jeremy.v2", V2]);
  await page.goto("./");
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("2 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Bigger buttons, and WASD at the campfire");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  const frame = page.frameLocator("#frame");
  await frame.locator("#start-btn").click();
  await frame.locator("#random-btn").click();
  await frame.locator("#party-go").click();
  await expect(frame.locator("#gear")).toBeVisible();
  await frame.locator("#gear-go").click();
  await expect(frame.locator("#delve")).toBeVisible();
  await page.waitForTimeout(1200);
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  await expect(page.frameLocator("#frame").locator("#start-btn")).toBeVisible();
  note(`card (2 versions) → picker: jeremy.v2 first, "Bigger buttons, and WASD at the campfire" → jeremy.v2 plays in the frame (title, random squad, campfire, first room); #${SLUG}@jeremy.v1 still opens jeremy.v1`);
  expect(browserErrors).toEqual([]);
});
