// Evidence for game idea #211: Claw of Cool jeremy.v3, Jeremy's update (the phone bar from #187: every button at least
// 48 x 48 px at 375 px wide, 8 px clear of each other and of the screen edges, and both WASD and the arrows steer).
// The creator's update, started from jeremy.v2, and the new default. Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/211-claw-of-cool-jeremy-v3
// Deterministic: the game clock is held and stepped by hand (__claw.hold / __claw.step) and the random numbers are
// seeded (__claw.seed). No real-time waits.
import { test, expect, games } from "./evidence.mjs";

const SLUG = "claw-of-cool";
const V2 = `games/${SLUG}/jeremy.v2/`;
const V3 = `games/${SLUG}/jeremy.v3/`;
const cw = (page, fn, arg) => page.evaluate(fn, arg);

test.describe.configure({ timeout: 120_000 });

async function open(page, url = V3) {
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
  await cw(page, () => { __claw.hold(true); __claw.seed(211); });
}
async function press(page, isMobile, locator) {
  if (isMobile) await page.locator(locator).tap(); else await page.locator(locator).click();
}
async function start(page, isMobile) {
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#title")).toBeHidden();
  expect(await cw(page, () => __claw.game.screen)).toBe("play");
}
const claw = page => cw(page, () => ({ x: __claw.st.claw.x, y: __claw.st.claw.y, phase: __claw.st.phase }));

// Every button on screen, as a box. `reach` is true when a tap on its middle lands on it (not on an overlay over it).
// The phone checks run in a 375 px wide window tall enough to show the whole page, so nothing needs scrolling.
function buttons() {
  const shown = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; }
    return true; };
  const name = el => el.id ? "#" + el.id : el.classList.contains("mch") ? `machine ${+el.dataset.i + 1}` : el.dataset.k ? `${el.textContent.trim()} (${el.dataset.k})` : (el.getAttribute("aria-label") || el.textContent.trim().replace(/\s+/g, " ") || el.className);
  const els = [...new Set(document.querySelectorAll("button, [role=button]"))].filter(shown);
  return els.map(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { name: name(el), cls: el.className, x: r.left, y: r.top, w: r.width, h: r.height, reach: !!hit && (hit === el || el.contains(hit)) }; });
}
const gapOf = (a, b) => { const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0), dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
  return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy); };
// the phone bar from #187, for every button a player can tap right now
function bar(list, width) {
  const live = list.filter(b => b.reach), bad = [];
  for (const b of live) {
    const others = live.filter(o => o !== b), gap = others.length ? Math.min(...others.map(o => gapOf(b, o))) : Infinity;
    const edge = Math.min(b.x, width - (b.x + b.w));
    b.gap = gap; b.edge = edge;
    if (b.w < 48 - 0.01 || b.h < 48 - 0.01 || gap < 8 - 0.01 || edge < 8 - 0.01) bad.push(`${b.name}: ${b.w.toFixed(1)}x${b.h.toFixed(1)}, gap ${gap.toFixed(1)}, edge ${edge.toFixed(1)}`);
  }
  return { live, bad };
}
const size = b => `${Math.round(b.w)}x${Math.round(b.h)}`;

// The same walk through the game for every check of the buttons: title, playing, labels on, a coin in (zoomed, with the
// view chip), paused, game over. `at(state)` is called at each stop.
async function walk(page, isMobile, at) {
  await at("title");
  await start(page, isMobile);
  await at("play");
  await press(page, isMobile, "#lblb");
  await expect(page.locator("#lblb")).toHaveAttribute("aria-pressed", "true");
  await at("labels");
  await press(page, isMobile, "#lblb");
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(2));
  expect(await cw(page, () => __claw.st.phase)).toBe("play");
  await expect(page.locator("#vchip")).toBeVisible();
  await at("zoomed");
  await page.keyboard.press("p");
  await expect(page.locator("#resume-btn")).toBeVisible();
  await at("paused");
  await page.keyboard.press("p");
  await cw(page, () => { __claw.st.coins = 0; });
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(12));
  await expect(page.locator("#over")).toBeVisible();
  await at("over");
}

// the buttons the idea lists as failing on jeremy.v2, and where to find them
const LISTED = {
  play: ["Insert coin (coin)", "View: Top-down (view)", "Pause (pause)", "Sound on (sound)", "#xrb", "#lblb", "Left", "Forward", "Back", "Right", "DROP", "Zoom out", "Reset zoom", "Zoom in"],
  paused: ["#restart-btn", "#ptitle-btn"],
  title: ["machine 1", "machine 2", "machine 3", "machine 4", "machine 5"],
};

test("jeremy.v3 opens to its title screen, plays, and loads nothing from the internet", async ({ page, isMobile, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await open(page);
  const site = new URL(page.url()).origin;
  await expect(page.locator("#title .logo")).toContainText("CLAW");
  await expect(page.locator("#title .by")).toHaveText("Designed by Jeremy");
  await expect(page.locator("#mpick .mch span")).toHaveText(["Classic", "Aquarium", "Dino Dig", "Space Station", "Snack Attack"]);
  await expect(page.locator("#fig #art")).not.toBeEmpty();
  await shot("title");
  await start(page, isMobile);
  await press(page, isMobile, ".kpad .go");
  await cw(page, () => __claw.step(2));
  expect(await cw(page, () => __claw.st.phase)).toBe("play");
  expect(await cw(page, () => __claw.st.coins)).toBe(9);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  expect(await page.locator("a[href^=http]").count()).toBe(0);
  note("title with the 5 machines, PLAY, DROP put a coin in (10 to 9 coins) and the try started; no requests outside the site, no outside links, no sideways scrolling");
  expect(browserErrors).toEqual([]);
});

test("at 375 px wide every button is at least 48 x 48 px and 8 px clear of the others and the screen edges (wider screens are unchanged from jeremy.v2)", async ({ page, isMobile, shot, note, browserErrors }) => {
  if (isMobile) {
    await page.setViewportSize({ width: 375, height: 1500 });
    await open(page);
    expect(await page.evaluate(() => innerWidth)).toBe(375);
    const lines = [], seen = {};
    await walk(page, isMobile, async state => {
      const { live, bad } = bar(await page.evaluate(buttons), 375);
      expect(bad, `${state}: buttons under the bar`).toEqual([]);
      for (const want of LISTED[state] || []) expect(live.map(b => b.name), `${state}: ${want} is on screen`).toContain(want);
      seen[state] = live;
      lines.push(`${state}: ${live.length} buttons, smallest ${size(live.reduce((a, b) => (Math.min(b.w, b.h) < Math.min(a.w, a.h) ? b : a)))}, closest gap ${Math.min(...live.map(b => b.gap)).toFixed(0)} px, closest to an edge ${Math.min(...live.map(b => b.edge)).toFixed(0)} px`);
      if (state === "play" || state === "zoomed" || state === "title" || state === "paused") await shot(`buttons-${state}`);
    });
    const p = Object.fromEntries(seen.play.map(b => [b.name, b])), t = seen.title, z = seen.zoomed.find(b => b.name === "#vchip");
    const pz = Object.fromEntries(seen.paused.map(b => [b.name, b]));
    note(`the listed buttons now: top buttons ${["Insert coin (coin)", "View: Top-down (view)", "Pause (pause)", "Sound on (sound)", "#xrb", "#lblb"].map(n => size(p[n])).join(", ")} (Insert coin, View, Pause, Sound, See-through, Labels); pad keys ${size(p.Left)}, DROP ${size(p.DROP)}; zoom ${size(p["Zoom out"])}, ${size(p["Reset zoom"])}, ${size(p["Zoom in"])}; Start over ${size(pz["#restart-btn"])}, Pick a machine ${size(pz["#ptitle-btn"])}; machine buttons ${size(t.find(b => b.cls.includes("mch")))} with ${Math.min(...t.filter(b => b.cls.includes("mch")).map(b => b.gap)).toFixed(0)} px gaps; the view chip on the machine ${size(z)}`);
    for (const l of lines) note(l);
  } else {
    // at 1280 wide the same walk finds every button the same size and in the same place as in jeremy.v2
    const record = async url => { const out = {}; await open(page, url);
      await walk(page, isMobile, async state => { out[state] = (await page.evaluate(buttons)).map(b => `${b.name} ${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.w.toFixed(1)}x${b.h.toFixed(1)}`); });
      return out; };
    const v2 = await record(V2), v3 = await record(V3);
    expect(v3).toEqual(v2);
    await shot("desktop-unchanged");
    note(`title, playing, labels on, zoomed, paused and game over: ${Object.values(v3).reduce((n, l) => n + l.length, 0)} button boxes, every one the same size and in the same place as jeremy.v2's`);
  }
  expect(browserErrors).toEqual([]);
});

test("W A S D and the arrow keys both steer the claw, and the keypad still does", async ({ page, isMobile, shot, note, browserErrors }) => {
  await open(page);
  await start(page, isMobile);
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(2));
  expect((await claw(page)).phase).toBe("play");
  await cw(page, () => { __claw.aim(40, 50); __claw.step(0.2); });
  // the claw machine's axes: up moves x down, down moves x up, left moves y up, right moves y down
  const EXPECT = { w: [-6, 0], a: [0, 6], s: [6, 0], d: [0, -6], ArrowUp: [-6, 0], ArrowLeft: [0, 6], ArrowDown: [6, 0], ArrowRight: [0, -6] };
  const moved = [];
  for (const [key, [dx, dy]] of Object.entries(EXPECT)) {
    const a = await claw(page);
    await page.keyboard.press(key);
    await cw(page, () => __claw.step(0.5));
    const b = await claw(page);
    expect([b.x - a.x, b.y - a.y].map(v => Math.round(v * 100) / 100), `${key} moves the claw`).toEqual([dx, dy]);
    moved.push(`${key} ${dx ? `x ${dx > 0 ? "+" : ""}${dx}` : `y ${dy > 0 ? "+" : ""}${dy}`}`);
  }
  // holding a key keeps the claw moving
  const h0 = await claw(page);
  await page.keyboard.down("d");
  await cw(page, () => __claw.step(1));
  await page.keyboard.up("d");
  const h1 = await claw(page);
  expect(h1.y).toBeLessThan(h0.y - 6);
  // the bigger keypad still steers
  const k0 = await claw(page);
  await press(page, isMobile, ".kpad .k[aria-label=Forward]");
  await cw(page, () => __claw.step(0.5));
  expect((await claw(page)).x).toBeLessThan(k0.x);
  await shot("keys");
  note(`one press each: ${moved.join(", ")}; holding D moved the claw ${(h0.y - h1.y).toFixed(1)} units; the pad's ▲ key moved it forward`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v2's and jeremy.v1's saves load in jeremy.v3, and it saves nothing new", async ({ page, isMobile, shot, note, browserErrors }) => {
  const SAVES = {
    "gameon.claw-of-cool.best": "345", "gameon.claw-of-cool.collection": JSON.stringify({ duck: 2 }), "gameon.claw-of-cool.sound": "\"off\"",
    "gameon.claw-of-cool.jeremy.v2.best": JSON.stringify({ classic: 120, aquarium: 410 }), "gameon.claw-of-cool.jeremy.v2.unlocked": "3",
    "gameon.claw-of-cool.jeremy.v2.machine": "1", "gameon.claw-of-cool.jeremy.v2.view": "2",
  };
  await page.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem("seeded", "1"); } }, SAVES);
  await open(page);
  await expect(page.locator('#mpick .mch[data-i="1"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#mpick .mch.locked")).toHaveCount(2);
  await expect(page.locator("#t-best")).toHaveText("410");
  await expect(page.locator("#btns .act[data-k=sound]")).toHaveText("Sound off");
  expect(await cw(page, () => __claw.st.view)).toBe(2);
  await shot("saves");
  await start(page, isMobile);
  expect(await cw(page, () => __claw.machine().name)).toBe("Aquarium");
  await cw(page, () => { __claw.st.coins = 1; });
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(2));
  await page.keyboard.press("Space");
  await cw(page, () => __claw.step(12));
  await expect(page.locator("#over")).toBeVisible();
  const all = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  const V2KEYS = ["best", "collection", "unlocked", "machine", "view"].map(k => `gameon.claw-of-cool.jeremy.v2.${k}`);
  for (const k of Object.keys(all)) {
    expect(k.startsWith("gameon.claw-of-cool.")).toBe(true);
    expect([...Object.keys(SAVES), ...V2KEYS]).toContain(k);
  }
  for (const k of ["gameon.claw-of-cool.best", "gameon.claw-of-cool.collection", "gameon.claw-of-cool.sound"]) expect(all[k]).toBe(SAVES[k]);
  expect(JSON.parse(all["gameon.claw-of-cool.jeremy.v2.best"]).aquarium).toBe(410);
  note(`seeded jeremy.v2's saves (Aquarium picked, 3 machines unlocked, Aquarium best 410, view 2) and jeremy.v1's (sound off): jeremy.v3 opens on the Aquarium with 2 machines locked, best 410, Sound off and the same view. After a game every key is one jeremy.v1 or jeremy.v2 already used (${Object.keys(all).length} keys); jeremy.v1's are unchanged`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v2 and jeremy.v1 still play from their own folders", async ({ page, isMobile, shot, note, browserErrors }) => {
  for (const url of [V2, `games/${SLUG}/`]) {
    await open(page, url);
    await start(page, isMobile);
    await page.keyboard.press("Space");
    await cw(page, () => __claw.step(2));
    expect(await cw(page, () => __claw.st.phase)).toBe("play");
  }
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.versions.find(v => v.id === "jeremy.v2").url).toBe(V2);
  expect(entry.versions.find(v => v.id === "jeremy.v1").url).toBe(`games/${SLUG}/`);
  await shot("v1-plays");
  note(`jeremy.v2 at ${V2} and jeremy.v1 at games/${SLUG}/ each open, start, and take a coin; games.json still points at both`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Claw of Cool plays jeremy.v3 by default, and its buttons pass the bar inside the frame", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto("./");
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.default).toBe("jeremy.v3");
  expect(entry.url).toBe(V3);
  expect(entry.versions.map(v => v.id)).toEqual(["jeremy.v1", "jeremy.v2", "jeremy.v3"]);
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("3 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("jeremy.v3");
  await expect(items.nth(0)).toContainText("Bigger buttons, easier on a phone");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v3$`));
  const frame = page.frameLocator("#frame");
  await expect(frame.locator("#mpick .mch")).toHaveCount(5);
  if (isMobile) await frame.locator("#play-btn").tap(); else await frame.locator("#play-btn").click();
  await expect(frame.locator("#title")).toBeHidden();
  await expect(frame.locator(".kpad .go")).toBeVisible();
  let extra = "";
  if (isMobile) {
    const f = page.frame({ url: /games\/claw-of-cool\/jeremy\.v3\// });
    const width = await f.evaluate(() => innerWidth);
    // the frame is shorter than the page: buttons below its first screen can't be reached without scrolling, so they
    // drop out here (the page checks above cover them); this checks the top buttons, keypad and zoom as the frame shows them
    const { live, bad } = bar(await f.evaluate(buttons), width);
    expect(bad).toEqual([]);
    for (const want of ["Insert coin (coin)", "Left", "DROP", "Zoom in"]) expect(live.map(b => b.name)).toContain(want);
    extra = `; inside the ${width} px wide frame, ${live.length} buttons a tap can reach all pass the bar`;
  }
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v2`);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  note(`card (3 versions) → picker: jeremy.v3 first, "Bigger buttons, easier on a phone" → jeremy.v3 plays in the frame${extra}; #claw-of-cool@jeremy.v2 still opens jeremy.v2`);
  expect(browserErrors).toEqual([]);
});
