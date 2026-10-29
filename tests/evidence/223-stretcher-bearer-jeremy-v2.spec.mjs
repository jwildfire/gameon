// Evidence for game idea #223: Stretcher Bearer jeremy.v2, Jeremy's phone pass (the phone bar from #187:
// Orders, Sound and Pause 48 px tall with 8 px gaps, the action buttons 8 px apart, the screen buttons 48 px
// tall, and Report for duty on screen on a phone). The creator's update, started from jeremy.v1 at
// games/stretcher-bearer/jeremy.v1/, and the new default. Spec: the build skill's U6 and docs/game-versions.md.
//
// Two checks compare jeremy.v2 with jeremy.v1 side by side at 375x812, 812x375 and 667x375 (touch, in the phone
// row) and 1280x800 (mouse, in the desktop row): the HUD (nothing v1 showed whole is cut off, smaller or covered)
// and the play area (how much of the battlefield the controls cover).
// Run: npm run evidence -- tests/evidence/223-stretcher-bearer-jeremy-v2
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "stretcher-bearer";
const V1 = `games/${SLUG}/jeremy.v1/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const PHONES = [[375, 812], [812, 375], [667, 375]];
const DESKTOP = [[1280, 800]];
const FONTS = ["fonts.googleapis.com", "fonts.gstatic.com"]; // jeremy.v1 loads these too

test.describe.configure({ timeout: 120_000 });

const sb = (page, fn, arg) => page.evaluate(fn, arg);
const mode = page => sb(page, () => __sb.mode);
const box = (page, sel) => page.locator(sel).first().evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; });
// a real tap on the phone (page.touchscreen), a click on the laptop
async function press(page, isMobile, sel) {
  if (!isMobile) return page.locator(sel).first().click();
  await page.locator(sel).first().scrollIntoViewIfNeeded(); // jeremy.v1's Report for duty starts below a phone's screen
  const b = await box(page, sel);
  await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2);
}
// title -> Report for duty -> the day's orders -> Move out -> playing
async function intoPlay(page, isMobile, url = V2) {
  await page.goto(url);
  await expect(page.locator("[data-a=start]")).toBeVisible();
  await press(page, isMobile, "[data-a=start]");
  await expect(page.locator("[data-a=go]")).toBeVisible();
  await press(page, isMobile, "[data-a=go]");
  await expect(page.locator("#screen")).toBeHidden();
  await expect(page.locator("#status")).toBeVisible();
  await page.waitForTimeout(800);
}
// The stick is a control too, though not a button: pass its box so the gaps to it are checked as well.
const stick = async page => (await page.locator("#stick").isVisible()) ? [{ name: "stick", ...(await box(page, "#stick")) }] : [];

test("jeremy.v2 opens to its title and starts a day, with nothing from the internet but jeremy.v1's fonts", async ({ page, isMobile, shot, note, browserErrors }) => {
  const outside = new Set(), home = new URL(test.info().project.use.baseURL).host;
  page.on("request", r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.host !== home) outside.add(u.host); });
  await page.goto(V2);
  await expect(page.locator(".title h1")).toContainText("Stretcher");
  await expect(page.locator("[data-a=start]")).toHaveText("Report for duty");
  await page.waitForTimeout(400);
  await shot("title");
  await press(page, isMobile, "[data-a=start]");
  await expect(page.locator(".form h2")).toHaveText("Messages and Signals");
  await expect(page.locator(".stamp")).toHaveText("Day 1 of 15");
  await press(page, isMobile, "[data-a=go]");
  await expect(page.locator("#status")).toBeVisible();
  expect(await mode(page)).toBe("play");
  const t0 = await page.locator("#clock").textContent();
  await expect(page.locator("#clock")).not.toHaveText(t0, { timeout: 10_000 }); // the day's clock runs
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  expect([...outside].filter(h => !FONTS.includes(h))).toEqual([]);
  await shot("playing");
  note(`${isMobile ? "tapped" : "clicked"} Report for duty and Move out: day 1 started and its clock ran (${t0} → ${await page.locator("#clock").textContent()}); outside requests: ${[...outside].join(", ") || "none"} (Google Fonts, as jeremy.v1); no sideways scrolling`);
  expect(browserErrors).toEqual([]);
});

test("Report for duty is on screen without scrolling (jeremy.v1's was below the bottom), and so are each screen's buttons", async ({ page, isMobile, shot, note, browserErrors }) => {
  const lines = [];
  for (const [w, h] of isMobile ? PHONES : DESKTOP) {
    await page.setViewportSize({ width: w, height: h });
    const at = {};
    for (const url of [V1, V2]) {
      await page.goto(url);
      await expect(page.locator("[data-a=start]")).toBeVisible();
      at[url] = await box(page, "[data-a=start]");
    }
    const v1 = at[V1], v2 = at[V2];
    expect(v2.h).toBeGreaterThanOrEqual(48);
    expect(v2.y, `Report for duty's top at ${w}x${h}`).toBeGreaterThanOrEqual(0);
    expect(v2.y + v2.h, `Report for duty's bottom at ${w}x${h}`).toBeLessThanOrEqual(h - 8);
    if (isMobile) expect(v1.y, `jeremy.v1's Report for duty starts below the screen at ${w}x${h}`).toBeGreaterThan(h);
    if (w === 375) await shot("title-start");
    // the brief's Move out and the pause screen's buttons are in view too, and the slip still scrolls to its end
    await press(page, isMobile, "[data-a=start]");
    const go = await box(page, "[data-a=go]");
    expect(go.y + go.h).toBeLessThanOrEqual(h - 8);
    await press(page, isMobile, "[data-a=go]");
    await expect(page.locator("#status")).toBeVisible();
    await press(page, isMobile, "#pauseBtn");
    await expect(page.locator("[data-a=resume]")).toBeVisible();
    const res = await box(page, "[data-a=resume]");
    expect(res.y + res.h).toBeLessThanOrEqual(h - 8);
    await page.locator("#screen").evaluate(s => { s.scrollTop = s.scrollHeight; });
    await expect(page.locator("#screen .olist li").last()).toBeInViewport();
    lines.push(`${w}x${h}: Report for duty at y ${Math.round(v2.y)}–${Math.round(v2.y + v2.h)} (jeremy.v1: y ${Math.round(v1.y)}–${Math.round(v1.y + v1.h)}, ${v1.y > h ? "below the screen" : "on screen"}); Move out ends at ${Math.round(go.y + go.h)}, Back to the front at ${Math.round(res.y + res.h)}`);
    await press(page, isMobile, "[data-a=resume]");
    await expect(page.locator("#screen")).toBeHidden();
  }
  note(lines.join(". "));
  expect(browserErrors).toEqual([]);
});

test("every screen meets the phone bar: Orders, Sound and Pause 48 px tall and 8 px apart, the action buttons 8 px apart, the screen buttons 48 px tall", async ({ page, isMobile, shot, note, browserErrors }) => {
  const lines = [];
  const measure = async (screen, drawn = []) => {
    const { targets, problems } = await touchTargets(page, { drawn });
    expect(problems, `${screen}: ${problems.join("; ")}`).toEqual([]);
    expect(targets.length).toBeGreaterThan(0);
    return `${screen} ${targets.length} (smallest ${Math.min(...targets.map(t => Math.min(t.w, t.h)))} px)`;
  };
  const sizes = sels => Promise.all(sels.map(async s => { const b = await box(page, s); expect(b.h).toBeGreaterThanOrEqual(48); expect(b.w).toBeGreaterThanOrEqual(48); return `${s} ${Math.round(b.w)}x${Math.round(b.h)}`; }));
  for (const [w, h] of isMobile ? PHONES : DESKTOP) {
    await page.setViewportSize({ width: w, height: h });
    const got = [];
    await page.goto(V2);
    await expect(page.locator("[data-a=start]")).toBeVisible();
    await page.waitForTimeout(300);
    got.push(await measure("title"));
    await press(page, isMobile, "[data-a=start]");
    await expect(page.locator("[data-a=go]")).toBeVisible();
    got.push(await measure("orders slip"));
    await press(page, isMobile, "[data-a=go]");
    await expect(page.locator("#status")).toBeVisible();
    await page.waitForTimeout(500);
    const top = await sizes(["#ordersBtn", "#muteBtn", "#pauseBtn"]);
    const gaps = await page.evaluate(() => { const r = ["ordersBtn", "muteBtn", "pauseBtn"].map(id => document.getElementById(id).getBoundingClientRect()); return [0, 1].map(i => Math.round(Math.max(r[i + 1].left - r[i].right, r[i + 1].top - r[i].bottom))); });
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(8);
    if (isMobile) {
      const cells = await page.locator("#tbtns .tb").evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }));
      let min = 1e9;
      for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) { const a = cells[i], c = cells[j]; min = Math.min(min, Math.max(Math.max(a.x, c.x) - Math.min(a.r, c.r), Math.max(a.y, c.y) - Math.min(a.b, c.b))); }
      expect(Math.round(min)).toBeGreaterThanOrEqual(8);
      top.push(`action buttons ${Math.round(min)} px apart`);
      // the touch controls work: Mask, Sound, Orders
      await press(page, true, "#tMask");
      await expect(page.locator("#iMask")).toHaveText("On");
    }
    got.push(await measure("playing", await stick(page)));
    if (w === 375 || w === 1280) await shot("playing-bar");
    await press(page, isMobile, "#muteBtn");
    await expect(page.locator("#muteBtn")).toHaveText("Sound off");
    await press(page, isMobile, "#ordersBtn");
    await expect(page.locator("#orders")).toBeVisible({ visible: !(w > 820) });
    got.push(await measure("orders open", await stick(page)));
    if (isMobile && w === 812) await shot("sideways-orders");
    await press(page, isMobile, "#ordersBtn");
    // Pause by touch or click, and back
    await press(page, isMobile, "#pauseBtn");
    await expect(page.locator("[data-a=resume]")).toBeVisible();
    expect(await mode(page)).toBe("pause");
    top.push(...await sizes(["[data-a=resume]", "#screen [data-a=new]"]));
    got.push(await measure("paused"));
    await press(page, isMobile, "[data-a=resume]");
    expect(await mode(page)).toBe("play");
    // the night report, the casualty notice and the armistice
    await sb(page, () => __sb.summary());
    await expect(page.locator("[data-a=next]")).toBeVisible();
    top.push(...await sizes(["[data-a=next]"]));
    got.push(await measure("night report"));
    await sb(page, () => __sb.over());
    await expect(page.locator("[data-a=retry]")).toBeVisible();
    top.push(...await sizes(["[data-a=retry]", "#screen [data-a=new]"]));
    got.push(await measure("casualty notice"));
    if (w === 375 || w === 1280) await shot("casualty");
    // Start a new war, by touch or click, goes back to day 1's orders
    await press(page, isMobile, "#screen [data-a=new]");
    await expect(page.locator(".stamp")).toHaveText("Day 1 of 15");
    await sb(page, () => __sb.win());
    await expect(page.locator("#screen [data-a=new]")).toHaveText("Play again");
    top.push(...await sizes(["#screen [data-a=new]"]));
    got.push(await measure("armistice"));
    lines.push(`${w}x${h}: ${top.join(", ")}, Orders/Sound/Pause ${gaps.join(" and ")} px apart; touchTargets() found no problems on: ${got.join(", ")}`);
  }
  note(lines.join(". ") + `. ${isMobile ? "Tapped" : "Clicked"}: Report for duty, Move out, ${isMobile ? "Mask (mask on), " : ""}Sound (Sound off), Orders (open and shut), Pause, Back to the front, Start a new war`);
  expect(browserErrors).toEqual([]);
});

test("WASD and the arrow keys both move the medic, Enter and Space press the screen's button, and P or Escape pauses", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.skip(isMobile, "the keyboard check runs at desktop size");
  await page.goto(V2);
  await expect(page.locator("[data-a=start]")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-a=go]")).toBeFocused();
  await page.keyboard.press(" ");
  await expect(page.locator("#status")).toBeVisible();
  expect(await mode(page)).toBe("play");
  const got = [];
  for (const [key, dx, dy] of [["d", 1, 0], ["ArrowRight", 1, 0], ["a", -1, 0], ["ArrowLeft", -1, 0], ["w", 0, -1], ["ArrowUp", 0, -1], ["s", 0, 1], ["ArrowDown", 0, 1]]) {
    // the same open spot in the town square each time
    const a = await sb(page, () => { const P = __sb.S.player; P.x = 2990; P.y = 3760; return { x: P.x, y: P.y }; });
    await page.keyboard.down(key); await page.waitForTimeout(350); await page.keyboard.up(key);
    const b = await sb(page, () => ({ x: __sb.S.player.x, y: __sb.S.player.y }));
    if (dx) expect(Math.sign(Math.round(b.x - a.x)), `${key} moves the medic sideways`).toBe(dx);
    if (dy) expect(Math.sign(Math.round(b.y - a.y)), `${key} moves the medic up or down`).toBe(dy);
    got.push(`${key} ${Math.round(b.x - a.x)},${Math.round(b.y - a.y)}`);
  }
  await shot("keys");
  await page.keyboard.press("p");
  await expect(page.locator("[data-a=resume]")).toBeVisible();
  expect(await mode(page)).toBe("pause");
  await page.keyboard.press("Escape");
  await expect(page.locator("#screen")).toBeHidden();
  expect(await mode(page)).toBe("play");
  await page.keyboard.press("Escape");
  expect(await mode(page)).toBe("pause");
  await page.keyboard.press("p");
  expect(await mode(page)).toBe("play");
  note(`Enter pressed Report for duty and Space pressed Move out. Moves from the same spot (dx,dy): ${got.join("; ")}. P paused and Escape went back; Escape paused and P went back`);
  expect(browserErrors).toEqual([]);
});

// What jeremy.v2 must not do to the HUD or the battlefield: measured against jeremy.v1 at each size, in play.
const HUD = ["#status", "#dayLabel", "#clock", "#cbar", ".bars > *", "#coopLine", ".inv > div", "#miniWrap", "#mini", "#score", "#orders"];
const CONTROLS = ["#ordersBtn", "#muteBtn", "#pauseBtn", "#stick", "#tbtns .tb"];
async function layout(page, isMobile, url, ordersOpen) {
  await intoPlay(page, isMobile, url);
  if (ordersOpen) { await press(page, isMobile, "#ordersBtn"); await page.waitForTimeout(200); }
  return page.evaluate(([HUD, CONTROLS]) => {
    const VW = innerWidth, VH = innerHeight;
    const shown = el => { // the share of the element a player can see: inside the screen, and on top
      const r = el.getBoundingClientRect(); let n = 0, ok = 0;
      for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) {
        const e = Math.min(4, r.width / 4, r.height / 4); // clear of rounded corners
        const x = r.left + e + (r.width - 2 * e) * i / 8, y = r.top + e + (r.height - 2 * e) * j / 6; n++;
        if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === el || el.contains(hit))) ok++;
      }
      return ok / n;
    };
    const hud = {};
    for (const sel of HUD) document.querySelectorAll(sel).forEach((el, k) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || getComputedStyle(el).display === "none") return;
      hud[`${sel}#${k}`] = { w: r.width, h: r.height, shown: shown(el), cut: el.scrollWidth > el.clientWidth + 1 };
    });
    const ctl = [];
    for (const sel of CONTROLS) document.querySelectorAll(sel).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width >= 1 && r.height >= 1 && el.checkVisibility()) ctl.push({ id: el.id, x: r.left, y: r.top, w: r.width, h: r.height });
    });
    // rasterise the controls' boxes: how much of the screen they cover, and how much of its middle (where the medic stands)
    const grid = new Uint8Array(VW * VH);
    for (const c of ctl) for (let y = Math.max(0, Math.round(c.y)); y < Math.min(VH, Math.round(c.y + c.h)); y++) grid.fill(1, y * VW + Math.max(0, Math.round(c.x)), y * VW + Math.min(VW, Math.round(c.x + c.w)));
    let cover = 0, middle = 0;
    for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) if (grid[y * VW + x]) { cover++; if (x >= VW / 4 && x < VW * 3 / 4 && y >= VH / 4 && y < VH * 3 / 4) middle++; }
    // the controls covering each other or the HUD
    const overlaps = [];
    const hudEls = [...document.querySelectorAll("#status,#miniWrap,#score,#orders")].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none");
    const meet = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const els = CONTROLS.flatMap(s => [...document.querySelectorAll(s)]).filter(e => e.checkVisibility());
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) if (meet(els[i].getBoundingClientRect(), els[j].getBoundingClientRect()) > 0) overlaps.push(`${els[i].id}/${els[j].id}`);
      for (const h of hudEls) if (meet(els[i].getBoundingClientRect(), h.getBoundingClientRect()) > 0) overlaps.push(`${els[i].id}/${h.id}`);
    }
    return { hud, ctl, cover, middle, overlaps, screen: VW * VH };
  }, [HUD, CONTROLS]);
}

test("the HUD keeps everything jeremy.v1 showed whole: nothing is cut off, smaller or covered, side by side at each size", async ({ page, isMobile, shot, note, browserErrors }) => {
  const lines = [];
  for (const [w, h] of isMobile ? PHONES : DESKTOP) {
    await page.setViewportSize({ width: w, height: h });
    for (const ordersOpen of [false, true]) {
      const v1 = await layout(page, isMobile, V1, ordersOpen);
      const v2 = await layout(page, isMobile, V2, ordersOpen);
      const where = `${w}x${h}${ordersOpen ? " with Orders open" : ""}`;
      let whole1 = 0, whole2 = 0;
      const gained = [];
      for (const [k, a] of Object.entries(v1.hud)) {
        const b = v2.hud[k];
        expect(b, `${k} is still there at ${where}`).toBeTruthy();
        // fonts differ a little from machine to machine, so allow half a pixel
        expect(b.w, `${k} keeps its width at ${where}`).toBeGreaterThanOrEqual(a.w - 0.5);
        expect(b.h, `${k} keeps its height at ${where}`).toBeGreaterThanOrEqual(a.h - 0.5);
        if (!a.cut) expect(b.cut, `${k}'s text stays whole at ${where}`).toBe(false);
        expect(b.shown, `${k} is no more covered at ${where}`).toBeGreaterThanOrEqual(a.shown);
        if (a.shown === 1) whole1++;
        if (b.shown === 1) whole2++;
        if (b.shown > a.shown) gained.push(`${k.replace(/#\d+$/, "").replace(/^#/, "")} ${Math.round(a.shown * 100)}%→${Math.round(b.shown * 100)}%`);
      }
      expect(v2.overlaps, `controls on top of each other or of the HUD at ${where}`).toEqual([]);
      const n = Object.keys(v1.hud).length;
      lines.push(`${where}: ${n} HUD parts, ${whole1} shown whole in jeremy.v1 and ${whole2} in jeremy.v2${gained.length ? ` (uncovered now: ${gained.join(", ")})` : ""}; jeremy.v1's controls overlapped: ${v1.overlaps.join(", ") || "nothing"}`);
      if (!ordersOpen && (w === 375 || w === 812 || w === 1280)) await shot(`hud-${w}`);
    }
  }
  note(lines.join(". "));
  expect(browserErrors).toEqual([]);
});

test("the controls cover no more of the battlefield than jeremy.v1's, beyond the 18 px the idea adds to Orders, Sound and Pause, and none moves into the middle", async ({ page, isMobile, note, browserErrors }) => {
  const lines = [];
  for (const [w, h] of isMobile ? PHONES : DESKTOP) {
    await page.setViewportSize({ width: w, height: h });
    const v1 = await layout(page, isMobile, V1, false);
    const v2 = await layout(page, isMobile, V2, false);
    const by = (l, id) => l.ctl.find(c => c.id === id);
    // jeremy.v1's own Orders, Sound and Pause, made 48 px tall at the same width, plus 1 px on Fire and Treat, which span the 1 px wider gap
    const tops = ["ordersBtn", "muteBtn", "pauseBtn"].map(id => by(v1, id));
    const allowance = Math.round(tops.reduce((s, c) => s + c.w * (48 - c.h), 0) + (isMobile ? 2 * 52 : 0));
    for (const id of ["ordersBtn", "muteBtn", "pauseBtn"]) expect(by(v2, id).w, `${id} is no wider than in jeremy.v1`).toBeLessThanOrEqual(by(v1, id).w + 0.5);
    expect(v2.middle, `controls in the middle of the screen at ${w}x${h}`).toBeLessThanOrEqual(v1.middle);
    const sideways = w > h && isMobile;
    if (sideways) expect(v2.cover, `controls' cover at ${w}x${h}`).toBeLessThanOrEqual(v1.cover);
    else expect(v2.cover - v1.cover, `controls' cover at ${w}x${h}`).toBeLessThanOrEqual(allowance);
    const pc = n => `${(100 * n / v1.screen).toFixed(1)}%`;
    lines.push(`${w}x${h}: controls cover ${v1.cover} px² (${pc(v1.cover)}) in jeremy.v1 and ${v2.cover} px² (${pc(v2.cover)}) in jeremy.v2, ${v2.cover - v1.cover >= 0 ? "+" : ""}${v2.cover - v1.cover}${sideways ? "" : ` (the 48 px heights add up to ${allowance})`}; in the middle quarter of the screen ${v1.middle} → ${v2.middle} px²`);
  }
  note(lines.join(". "));
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1's best score carries over: v2 shows it, keeps it under sb-best, and v1 reads back a new best", async ({ page, isMobile, shot, note, browserErrors }) => {
  const SEED = { "sb-best": JSON.stringify({ score: 4321, day: 7 }) };
  await page.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem("seeded", "1"); } }, SEED);
  await page.goto(V2);
  await expect(page.locator(".best")).toHaveText("Best so far: 4321 points, reached day 7");
  await shot("v1-best");
  await intoPlay(page, isMobile);
  // a lower score leaves the best alone
  await sb(page, () => __sb.over());
  await expect(page.locator("[data-a=retry]")).toBeVisible();
  let saved = await page.evaluate(() => localStorage.getItem("sb-best"));
  expect(JSON.parse(saved)).toEqual({ score: 4321, day: 7 });
  // a higher one replaces it, in the same format
  await sb(page, () => { __sb.S.stats.saved = 50; __sb.over(); });
  saved = await page.evaluate(() => localStorage.getItem("sb-best"));
  expect(JSON.parse(saved)).toEqual({ score: 5000, day: 1 });
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toEqual(["sb-best"]);
  await page.goto(V1);
  await expect(page.locator(".best")).toHaveText("Best so far: 5000 points, reached day 1");
  note(`seeded jeremy.v1's sb-best (4321, day 7): jeremy.v2's title showed it; a game over at 0 left it; one at 5000 replaced it as {score: 5000, day: 1}; keys afterwards: ${keys.join(", ")} (jeremy.v1's own key, nothing new); jeremy.v1 then showed 5000, day 1`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/stretcher-bearer/jeremy.v1/, unchanged", async ({ page, isMobile, shot, note, browserErrors }) => {
  await intoPlay(page, isMobile, V1);
  const t0 = await page.locator("#clock").textContent();
  await expect(page.locator("#clock")).not.toHaveText(t0, { timeout: 10_000 });
  const pause = await box(page, "#pauseBtn");
  expect(pause.h).toBeLessThan(48); // frozen as it was
  const v1 = games.find(g => g.slug === SLUG).versions.find(v => v.id === "jeremy.v1");
  expect(v1.url).toBe(V1);
  await shot("v1-plays");
  note(`jeremy.v1 at ${v1.url}: Report for duty, Move out, and its clock ran; its Pause is still ${Math.round(pause.w)}x${Math.round(pause.h)}`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Stretcher Bearer plays jeremy.v2 by default and the picker still offers jeremy.v1", async ({ page, isMobile, shot, note, browserErrors }) => {
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.default).toBe("jeremy.v2");
  expect(entry.url).toBe(V2);
  expect(entry.versions.map(v => v.id)).toEqual(["jeremy.v1", "jeremy.v2"]);
  await page.goto("./");
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("2 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Roomier buttons on a phone");
  await expect(items.nth(1)).toContainText("jeremy.v1");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("[data-a=start]")).toBeVisible();
  if (isMobile) await frame.locator("[data-a=start]").tap(); else await frame.locator("[data-a=start]").click();
  await expect(frame.locator("[data-a=go]")).toBeVisible();
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  await expect(page.frameLocator("#frame").locator("[data-a=start]")).toBeAttached();
  note("card (2 versions) → picker: jeremy.v2 first with its note, then jeremy.v1 → jeremy.v2 plays in the frame (Report for duty → the day's orders); #stretcher-bearer@jeremy.v1 opens jeremy.v1");
  expect(browserErrors).toEqual([]);
});
