// Evidence for game idea #222: Princess Lady Drive jeremy.v3, "Enter to start, keys for Map and Help".
// Jeremy's update for the phone bar from #187: Help's Start over becomes at least 48 px tall, Enter or Space
// starts from the title card, and keys open Map (M), Sound (V, because S already drives down) and Help (?).
// P opens Help too, which stops the town, so P pauses. The creator's update, started from jeremy.v2, and the
// new default. Spec: the build skill's U6, docs/game-versions.md and docs/evidence.md.
// Run: npm run evidence -- tests/evidence/222-princess-lady-drive-jeremy-v3
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "princess-lady-drive";
const V1 = `games/${SLUG}/jeremy.v1/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const V3 = `games/${SLUG}/jeremy.v3/`;
const SAVE_KEY = "princess-lady-drive:v2"; // the key jeremy.v1 and jeremy.v2 save under (it predates the gameon.* rule)
// Outside requests jeremy.v1 and jeremy.v2 already made: their Google Fonts stylesheet and font files.
const INHERITED = ["fonts.googleapis.com", "fonts.gstatic.com"];
// Every field jeremy.v2's snapshot() writes (the same as jeremy.v1's).
const FIELDS = ["mode", "dress", "hair", "crownC", "heldE", "flavor", "flowerC", "cakeC", "food", "puppet", "book", "necklace", "held", "muted",
  "inv", "balloons", "pets", "carry", "deco", "laps", "goals", "holes", "seenWalkHint", "seenRoomHint", "seenCarryHint", "room", "p", "cars", "active"];

// A save as jeremy.v2 writes it: Rosie inside the castle, with balloons, two pets and four decorations delivered.
const CASTLE_SAVE = {
  mode: "walk", dress: 1, hair: 4, crownC: 2, heldE: "🎁", flavor: 0, flowerC: 0, cakeC: 0, food: 0, puppet: 0, book: 0, necklace: 2, held: null, muted: true,
  inv: { icecream: 3, flowers: 1, cupcake: 2, popcorn: 0, food: 0, books: 1, jewels: 2, things: 0, trophies: 1 },
  balloons: ["#ff5c8a", "#4fb3ff", "#ffe14d"], pets: [0, 2], carry: [], deco: [0, 1, 2, 3], laps: 2, goals: 1, holes: 0,
  seenWalkHint: true, seenRoomHint: true, seenCarryHint: true, room: "castle", p: { x: 1400, y: 356, face: 1 }
};
// The same player out in the town in the car, so the HUD shows her free stuff.
const TOWN_SAVE = { ...CASTLE_SAVE, mode: "drive", room: null };

// Seed once per page (a reload keeps what the game saved), or on every load with `always`.
const seed = (page, save, always = false) => page.addInitScript(([key, save, always]) => {
  if (always || !sessionStorage.getItem("seeded")) { localStorage.setItem(key, JSON.stringify(save)); sessionStorage.setItem("seeded", "1"); }
}, [SAVE_KEY, save, always]);
const peek = page => page.evaluate(() => window.princessLadyDrive.inspect());
const where = s => `${Math.round(s.x)},${Math.round(s.y)}`;

function outsideRequests(page) {
  const seen = [], home = new URL(test.info().project.use.baseURL).host;
  page.on("request", req => {
    const u = new URL(req.url());
    if (!["http:", "https:"].includes(u.protocol) || u.host === home) return;
    seen.push(u.host);
  });
  return seen;
}

async function open(page, url = V3) {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Princess Lady Drive" })).toBeVisible();
  await page.waitForTimeout(400);
}
async function press(page, isMobile, sel) {
  const el = page.locator(sel);
  if (isMobile) { const b = await el.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await el.click();
  await page.waitForTimeout(350);
}

test.describe.configure({ timeout: 120_000 });

test("jeremy.v3 opens to its title screen and starts, with no new outside requests", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  const outside = outsideRequests(page);
  await open(page);
  await expect(page.locator("#playBtn")).toHaveText("Let’s go!");
  await shot("title");
  await press(page, isMobile, "#playBtn");
  await expect(page.locator("#start")).toBeHidden();
  const s = await peek(page);
  expect(s.started).toBe(true);
  expect(s.mode).toBe("drive");
  await expect(page.locator("#carBtn")).toContainText("Get out");
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const extra = [...new Set(outside)].filter(h => !INHERITED.includes(h));
  expect(extra, "outside requests jeremy.v2 didn't make").toEqual([]);
  note(`${isMobile ? "tapped" : "clicked"} Let's go! and the car is ready; outside hosts seen: ${[...new Set(outside)].join(", ") || "none"} (Google Fonts, inherited from jeremy.v1)`);
  expect(browserErrors).toEqual([]);
});

test("at 375 px wide every button is at least 48 x 48 px and 8 px clear of the others and the screen edges, Start over included", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  if (!isMobile) {
    // The bar is measured at phone width; at 1280 check the one button that changed.
    await seed(page, TOWN_SAVE);
    await open(page);
    await page.locator("#playBtn").click();
    await page.locator("#helpBtn").click();
    const box = await page.locator("#resetBtn").boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(48);
    note(`Start over is ${Math.round(box.width)}x${Math.round(box.height)} at 1280 (jeremy.v2: 106x43)`);
    expect(browserErrors).toEqual([]);
    return;
  }
  await seed(page, TOWN_SAVE);
  await open(page);
  const lines = [], all = [];
  const measure = async (state, opts) => {
    const { targets, problems } = await touchTargets(page, opts);
    all.push(...problems.map(p => `${state}: ${p}`));
    lines.push(`${state}: ${targets.map(t => `${t.name} ${t.w}x${t.h}`).slice(0, 8).join(", ")}${targets.length > 8 ? `, and ${targets.length - 8} more` : ""}`);
    return targets;
  };
  await measure("title");
  await press(page, true, "#playBtn");
  await expect.poll(async () => (await peek(page)).started).toBe(true);
  const play = await measure("drive");
  expect(play.map(t => t.name)).toEqual(expect.arrayContaining(["Map of the town", "Sound off", "Help for grown-ups", "Beep the horn", "Get out of the car"]));
  await shot("buttons-drive");
  await press(page, true, "#carBtn"); // Get out
  await expect.poll(async () => (await peek(page)).mode).toBe("walk");
  await measure("walk");
  await press(page, true, "#soundBtn");
  await expect.poll(async () => (await peek(page)).muted).toBe(false);
  await press(page, true, "#mapBtn");
  await expect.poll(async () => (await peek(page)).overlay).toBe("map");
  await measure("map, top");
  await page.locator("#closeMap").scrollIntoViewIfNeeded();
  await measure("map, bottom");
  await press(page, true, "#closeMap");
  await press(page, true, "#helpBtn");
  await expect.poll(async () => (await peek(page)).overlay).toBe("help");
  await page.locator("#resetBtn").evaluate(el => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(200);
  const help = await measure("help");
  const reset = help.find(t => t.name === "Start over");
  expect(reset, "Start over is on screen").toBeTruthy();
  expect(reset.h).toBeGreaterThanOrEqual(48);
  await shot("buttons-help");
  await press(page, true, "#resetBtn"); // arms it; a second tap would clear the save
  await expect(page.locator("#resetBtn")).toHaveClass(/armed/);
  await measure("help, Start over armed");
  await press(page, true, "#closeHelp");
  await expect.poll(async () => (await peek(page)).overlay).toBeNull();
  expect((await peek(page)).balloons).toBe(3); // Back to the game left the save alone

  // Inside a room the two big buttons become Go out and Magic.
  await page.evaluate(([key, save]) => localStorage.setItem(key, JSON.stringify(save)), [SAVE_KEY, CASTLE_SAVE]);
  await page.reload();
  await expect(page.locator("#playBtn")).toBeVisible();
  await page.waitForTimeout(400);
  await press(page, true, "#playBtn");
  await expect.poll(async () => (await peek(page)).room).toBe("castle");
  await expect(page.locator("#carBtn")).toHaveAttribute("aria-label", "Go back outside");
  await measure("inside the castle");

  note(`Start over in Help is now ${reset.w}x${reset.h} (jeremy.v2: 106x43)`);
  for (const l of lines) note(l);
  expect(all).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("Enter or Space starts from the title card, without a Tab or a tap", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  for (const key of ["Enter", " "]) {
    await page.goto(V3);
    await expect(page.locator("#start")).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body), "nothing focused yet").toBe(true);
    expect((await peek(page)).started).toBe(false);
    await page.keyboard.press(key);
    await expect(page.locator("#start")).toBeHidden();
    await page.waitForTimeout(300);
    const s = await peek(page);
    expect(s.started).toBe(true);
    expect(s.mode, "the start key doesn't also get Rosie out of the car").toBe("drive");
  }
  note("a fresh title card: Enter starts the game; Space starts it too; Rosie stays in the car either way");
  await shot("started-by-key");
  expect(browserErrors).toEqual([]);
});

test("M, V and ? open Map, Sound and Help, P pauses, and none of them clashes with WASD or the arrows", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  await seed(page, TOWN_SAVE);
  await open(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("#start")).toBeHidden();
  // Each key held for a moment; `state` reads what it should change. Every key also has to leave the sound and
  // the overlays alone.
  async function tryKeys(list, state, settle) {
    const works = {};
    for (const key of list) {
      if (settle) await settle();
      const before = await peek(page);
      await page.keyboard.down(key);
      works[key] = await expect.poll(async () => state(await peek(page)), { timeout: 4000 }).not.toBe(state(before)).then(() => true, () => false);
      await page.keyboard.up(key);
      await page.waitForTimeout(150);
      const after = await peek(page);
      expect(after.muted, `${key} leaves the sound alone`).toBe(before.muted);
      expect(after.overlay, `${key} opens nothing`).toBeNull();
    }
    return works;
  }
  const car = s => [s.car.x, s.car.y, s.car.a, s.car.v].map(n => n.toFixed(1)).join();
  // Driving: S (like its twin, the down arrow) steers the car down the screen; it never touches the sound. Each key
  // starts with the car stopped, so only the key can move it.
  const stopped = () => expect.poll(async () => (await peek(page)).car.v, { timeout: 5000 }).toBe(0);
  const driving = await tryKeys(["s", "w", "ArrowDown", "ArrowUp"], car, stopped);
  expect(driving).toEqual({ s: true, w: true, ArrowDown: true, ArrowUp: true });
  note(`driving: from a stop, S, W, the down arrow and the up arrow each moved the car, and the sound stayed ${(await peek(page)).muted ? "off" : "on"}`);

  // Walking: every WASD key and its arrow twin moves Rosie.
  await page.keyboard.press(" ");
  await expect.poll(async () => (await peek(page)).mode).toBe("walk");
  await page.waitForTimeout(500);
  // Back and forth, so she never walks into a wall.
  const walking = await tryKeys(["d", "a", "ArrowRight", "ArrowLeft", "s", "w", "ArrowDown", "ArrowUp"], where);
  expect(walking).toEqual({ d: true, a: true, ArrowRight: true, ArrowLeft: true, s: true, w: true, ArrowDown: true, ArrowUp: true });
  note("walking: D, A, the right arrow, the left arrow, S, W, the down arrow and the up arrow each moved Rosie; none of them changed the sound or opened anything");

  // Standing still, so any move would show.
  await page.waitForTimeout(500);
  const still = where(await peek(page));
  const muted0 = (await peek(page)).muted;
  await page.keyboard.press("v");
  await expect.poll(async () => (await peek(page)).muted).toBe(!muted0);
  const s = await peek(page);
  await expect(page.locator("#soundBtn")).toHaveAttribute("aria-label", s.muted ? "Sound off" : "Sound on");
  await page.keyboard.press("v");
  await expect.poll(async () => (await peek(page)).muted).toBe(muted0);
  await page.keyboard.press("m");
  await expect(page.locator("#map")).toBeVisible();
  expect((await peek(page)).overlay).toBe("map");
  await shot("keys-map");
  await page.keyboard.press("m");
  await expect(page.locator("#map")).toBeHidden();
  await page.keyboard.press("m");
  await page.keyboard.press("Escape");
  await expect(page.locator("#map")).toBeHidden();
  await page.keyboard.press("?");
  await expect(page.locator("#help")).toBeVisible();
  expect((await peek(page)).overlay).toBe("help");
  await expect(page.locator("#help")).toContainText("M map, V sound, ? or P this help (it pauses), Enter to start");
  await page.keyboard.press("?");
  await expect(page.locator("#help")).toBeHidden();
  expect(where(await peek(page)), "V, M and ? don't move Rosie").toBe(still);

  // P pauses: the help card opens and the town stops, so a held D doesn't move her.
  await page.keyboard.press("p");
  await expect.poll(async () => (await peek(page)).overlay).toBe("help");
  await page.keyboard.down("d");
  await page.waitForTimeout(450);
  await page.keyboard.up("d");
  expect(where(await peek(page)), "paused: D does nothing").toBe(still);
  await shot("keys-paused");
  await page.keyboard.press("p");
  await expect(page.locator("#help")).toBeHidden();
  await page.keyboard.down("d");
  await expect.poll(async () => where(await peek(page)), { message: "unpaused: D walks", timeout: 4000 }).not.toBe(still);
  await page.keyboard.up("d");
  note("walking: V turned the sound off and on, M opened and closed the map (Escape too), ? opened and closed Help; Rosie didn't move for any of them");
  note("P opened Help and a held D did nothing; P again closed it and D walked");
  expect(browserErrors).toEqual([]);
});

// Every HUD piece, card and label, in the order the page has them. "whole" means inside the screen and inside any
// box that clips it. In a card that scrolls up and down, a piece counts as whole if it fits the card's width and
// height and scrolling reaches all of it (where the card happens to be scrolled to isn't a squeeze). `inView` is
// stricter: whole on screen right now, with no scrolling. `seen` is how many px of its height are on screen now.
function hud() {
  const SEL = ["canvas#c", "#stuff", "#stuff .chip", ".top-buttons", ".top-buttons button", "#controls", "#controls button", "#controls .ico", "#controls .lbl",
    "#hint", "#toast", "#start .card", "#start .crown", "#start h1", "#start .sub", "#start .ideas li", "#playBtn", "#start .credit",
    "#map .card", "#map h2", "#map .city", "#map .spot", "#closeMap", "#help .card", "#help h2", "#help li", "#resetBtn", "#closeHelp"];
  const shown = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; } return true; };
  const out = {};
  for (const sel of SEL) document.querySelectorAll(sel).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || !shown(el)) return;
    let clip = { l: 0, t: 0, r: innerWidth, b: innerHeight }, top = r.top, bottom = r.bottom;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const q = p.getBoundingClientRect(), l = q.left + p.clientLeft, t = q.top + p.clientTop;
      clip = { l: Math.max(clip.l, l), t: Math.max(clip.t, t), r: Math.min(clip.r, l + p.clientWidth), b: Math.min(clip.b, t + p.clientHeight) };
      if (/auto|scroll/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) {
        // scrolled into view: where it would sit if the card were scrolled to show it
        const shift = Math.max(0, bottom - clip.b) - Math.max(0, clip.t - top);
        const canShift = shift > 0 ? Math.min(shift, p.scrollHeight - p.clientHeight - p.scrollTop) : Math.max(shift, -p.scrollTop);
        top -= canShift; bottom -= canShift;
      }
    }
    const whole = r.left >= clip.l - 0.5 && top >= clip.t - 0.5 && r.right <= clip.r + 0.5 && bottom <= clip.b + 0.5;
    const c = clip; // every clipping box, as scrolled right now
    const inView = r.left >= c.l - 0.5 && r.top >= c.t - 0.5 && r.right <= c.r + 0.5 && r.bottom <= c.b + 0.5;
    const seen = Math.max(0, Math.min(r.bottom, c.b) - Math.max(r.top, c.t));
    out[`${sel} ${i + 1}`] = { w: r.width, h: r.height, fs: parseFloat(getComputedStyle(el).fontSize), whole, inView, seen };
  });
  return out;
}

// What jeremy.v2 showed against what jeremy.v3 shows, screen by screen. A piece v2 showed whole must still be whole
// (`key` says which kind of whole), and no smaller: no smaller font, no narrower, and no shorter unless it got wider
// (a line of text in a wider card wraps less, which is room, not a squeeze).
function compare(v2, v3, key = "whole") {
  const lost = [], grew = {};
  let compared = 0;
  for (const [state, boxes] of Object.entries(v2)) for (const [name, a] of Object.entries(boxes)) {
    if (!a[key]) continue;
    compared++;
    const b = v3[state][name];
    // The hint and the toast are messages that fade on a timer, so only their size is compared.
    const passing = /^#(hint|toast) /.test(name);
    if (!b) { if (!passing) lost.push(`${state}: ${name} is gone`); continue; }
    if (!b[key] && !passing) lost.push(`${state}: ${name} is cut off (${b.seen.toFixed(0)} of ${b.h.toFixed(0)} px on screen)`);
    const wider = b.w > a.w + 0.5;
    if (b.fs < a.fs - 0.01 || b.w < a.w - 0.5 || (b.h < a.h - 0.5 && !wider)) lost.push(`${state}: ${name} shrank from ${a.w.toFixed(0)}x${a.h.toFixed(0)} (${a.fs}px text) to ${b.w.toFixed(0)}x${b.h.toFixed(0)} (${b.fs}px text)`);
    else if (wider || b.h > a.h + 0.5) {
      const sel = name.replace(/ \d+$/, ""), g = grew[sel] ||= { names: new Set(), dw: 0, dh: 0 };
      g.names.add(name); g.dw = Math.max(g.dw, b.w - a.w); g.dh = Math.max(g.dh, b.h - a.h);
    }
  }
  return { lost, grew, compared };
}
const bigger = grew => Object.entries(grew).map(([sel, g]) => `${sel} (${g.names.size}${g.names.size > 1 ? " of them" : ""}, up to ${g.dw.toFixed(0)} px wider and ${g.dh.toFixed(0)} px taller)`).join("; ") || "nothing";

test("the HUD isn't squeezed: everything jeremy.v2 showed whole is still whole in jeremy.v3, and no smaller", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  // Same fonts for both (the fallback fonts, so a slow font download can't move anything) and no wiggle animation.
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page, TOWN_SAVE, true);
  const record = async url => {
    const out = {};
    await open(page, url);
    out.title = await page.evaluate(hud);
    await page.locator("#playBtn").click();
    await page.waitForTimeout(500);
    out.drive = await page.evaluate(hud);
    await page.locator("#carBtn").click();
    await page.waitForTimeout(500);
    out.walk = await page.evaluate(hud);
    await page.locator("#mapBtn").click();
    out.map = await page.evaluate(hud);
    await page.locator("#map .card").evaluate(el => { el.scrollTop = el.scrollHeight; });
    out["map, scrolled down"] = await page.evaluate(hud);
    await page.locator("#closeMap").click();
    await page.locator("#helpBtn").click();
    out.help = await page.evaluate(hud);
    await page.locator("#help .card").evaluate(el => { el.scrollTop = el.scrollHeight; });
    out["help, scrolled down"] = await page.evaluate(hud);
    await page.locator("#help .card").evaluate(el => { el.scrollTop = 0; });
    await page.locator("#resetBtn").dispatchEvent("click"); // armed: "Tap again to clear all the free stuff"
    await expect(page.locator("#resetBtn")).toHaveClass(/armed/);
    out["help, Start over armed"] = await page.evaluate(hud);
    await page.locator("#help .card").evaluate(el => { el.scrollTop = el.scrollHeight; });
    out["help, Start over armed, scrolled down"] = await page.evaluate(hud);
    return out;
  };
  const v2 = await record(V2), v3 = await record(V3);
  await shot("hud-help");
  const { lost, grew, compared } = compare(v2, v3);
  note(`${compared} boxes jeremy.v2 showed whole (title, driving, walking, map, help, help with Start over armed; the cards at the top and scrolled down) are all still whole in jeremy.v3 and none is smaller`);
  note(`bigger in jeremy.v3: ${bigger(grew)}`);
  expect(compared).toBeGreaterThan(40);
  expect(lost).toEqual([]);
  expect(browserErrors).toEqual([]);
});

// Help as the player lands in it: tap ?, then tap Start over once, with no scrolling in between. Phone sizes run in
// the phone project (touch, overlay scrollbars); laptop sizes in the desktop project (classic scrollbars).
const HELP_SIZES = { phone: [[375, 812], [667, 375], [812, 375]], desktop: [[1024, 768], [1280, 800], [1366, 768]] };

test("Help, opened and with Start over armed, shows everything jeremy.v2 showed as the player lands in it, at six screen sizes", async ({ page, shot, note, browserErrors }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page, TOWN_SAVE, true);
  const FONTS = "https://fonts.googleapis.com/**";
  const land = async (url, fonts) => {
    await page.goto(url);
    await expect(page.locator("#playBtn")).toBeVisible();
    // real fonts: wait for every face to load (a failed download leaves both versions on the same fallback)
    if (fonts === "real") await page.evaluate(async () => { await Promise.allSettled([...document.fonts].map(f => f.load())); await document.fonts.ready; });
    await page.locator("#playBtn").dispatchEvent("click");
    await page.locator("#helpBtn").dispatchEvent("click");
    await expect(page.locator("#help")).toBeVisible();
    await page.waitForTimeout(250);
    const card = el => ({ over: el.scrollHeight - el.clientHeight });
    const opened = await page.evaluate(hud), openedCard = await page.locator("#help .card").evaluate(card);
    await page.locator("#resetBtn").dispatchEvent("click");
    await expect(page.locator("#resetBtn")).toHaveClass(/armed/);
    await page.waitForTimeout(150);
    const armed = await page.evaluate(hud), armedCard = await page.locator("#help .card").evaluate(card);
    return { boxes: { opened, armed }, over: { opened: openedCard.over, armed: armedCard.over } };
  };
  const lost = [], lines = [];
  let compared = 0;
  for (const fonts of ["fallback", "real"]) {
    if (fonts === "fallback") await page.route(FONTS, route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
    else await page.unroute(FONTS);
    for (const [w, h] of HELP_SIZES[testInfo.project.name]) {
      await page.setViewportSize({ width: w, height: h });
      const v2 = await land(V2, fonts), v3 = await land(V3, fonts);
      const r = compare(v2.boxes, v3.boxes, "inView");
      compared += r.compared;
      lost.push(...r.lost.map(l => `${w}x${h}, ${fonts} fonts, ${l}`));
      // A button v2 showed only part of must show at least as much in v3.
      for (const state of ["opened", "armed"]) for (const name of ["#closeHelp 1", "#resetBtn 1"]) {
        const a = v2.boxes[state][name], b = v3.boxes[state][name];
        if (a && a.seen > 0 && (!b || b.seen < a.seen - 0.5)) lost.push(`${w}x${h}, ${fonts} fonts, ${state}: ${name} shows ${b ? b.seen.toFixed(0) : 0} px, jeremy.v2 showed ${a.seen.toFixed(0)}`);
      }
      const back = s => `${s.boxes.armed["#closeHelp 1"].seen.toFixed(0)}/${s.boxes.armed["#closeHelp 1"].h.toFixed(0)}`;
      if (fonts === "real") lines.push(`${w}x${h}: Help scrolls ${v2.over.opened} px opened and ${v2.over.armed} px armed in jeremy.v2, ${v3.over.opened} and ${v3.over.armed} px in jeremy.v3; armed, Back to the game shows ${back(v2)} px in jeremy.v2 and ${back(v3)} px in jeremy.v3`);
      if (fonts === "real" && w === 1280) await shot("help-armed");
      if (fonts === "real" && w === 812) await shot("help-armed");
    }
  }
  note(`${compared} boxes jeremy.v2 showed whole on screen (Help opened, and armed), with the fallback fonts and the real ones, are whole in jeremy.v3 too, and none is smaller`);
  for (const l of lines) note(l);
  expect(compared).toBeGreaterThan(20);
  expect(lost).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("what stays still works: drive, get out, take free ice cream, go out and get back in", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  async function walkUntil(x, y, done, tries = 12) {
    for (let i = 0; i < tries; i++) {
      const s = await page.evaluate(([x, y]) => window.princessLadyDrive.toScreen(x, y), [x, y]);
      const vp = page.viewportSize();
      const px = Math.max(16, Math.min(vp.width - 16, s.x)), py = Math.max(110, Math.min(vp.height - 16, s.y));
      if (isMobile) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
      for (let k = 0; k < 10; k++) { await page.waitForTimeout(150); if (await done(await peek(page))) return; }
    }
    expect(await done(await peek(page)), `never got to (${x}, ${y})`).toBe(true);
  }
  await open(page);
  await press(page, isMobile, "#playBtn");
  await press(page, isMobile, "#carBtn"); // Get out
  expect((await peek(page)).mode).toBe("walk");
  await walkUntil(820, 260, q => q.room === "icecream");
  const cone = (await peek(page)).items.filter(i => i.t === "cone")[1];
  await walkUntil(cone.x, cone.y + 30, q => q.inv.icecream >= 1);
  await expect(page.locator("#stuff")).toContainText("🍦");
  await shot("ice-cream");
  await press(page, isMobile, "#carBtn"); // Go out
  const s = await peek(page);
  expect(s.mode).toBe("walk");
  expect(s.room).toBeNull();
  await press(page, isMobile, "#carBtn"); // Get in
  await expect.poll(async () => (await peek(page)).mode, { timeout: 8000 }).toBe("drive");
  note("Get out → Ice Cream shop → free cone → Go out → Get in");
  expect(browserErrors).toEqual([]);
});

test("a jeremy.v2 save loads in jeremy.v3, under the same key with the same fields", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  await seed(page, CASTLE_SAVE);
  await open(page);
  await press(page, isMobile, "#playBtn");
  const s = await peek(page);
  expect(s.room).toBe("castle");
  expect(s.balloons).toBe(3);
  expect(s.pets).toEqual([0, 2]);
  expect(s.deco).toEqual([0, 1, 2, 3]);
  expect(s.inv.icecream).toBe(3);
  expect(s.muted).toBe(true);
  await expect(page.locator("#stuff")).toContainText("🐶🐰");
  await expect(page.locator("#soundBtn")).toHaveText("🔇");
  await shot("old-save");
  if (!isMobile) await page.keyboard.press("v"); else await press(page, true, "#soundBtn"); // sound on, which saves
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  for (const k of Object.keys(stored)) expect(k === SAVE_KEY || k.startsWith("gameon.princess-lady-drive."), `unexpected key ${k}`).toBe(true);
  const saved = JSON.parse(stored[SAVE_KEY]);
  expect(Object.keys(saved).sort()).toEqual([...FIELDS].sort());
  expect(saved.muted).toBe(false);
  expect(saved.pets).toEqual([0, 2]);
  expect(saved.deco).toEqual([0, 1, 2, 3]);
  expect(saved.room).toBe("castle");
  note(`castle, 3 balloons, two pets, four decorations and the sound setting all loaded; keys afterwards: ${Object.keys(stored).join(", ")}, with exactly jeremy.v2's fields, so jeremy.v2 and jeremy.v1 can still read it`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v2 and jeremy.v1 still open and play", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  for (const url of [V2, V1]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Princess Lady Drive" })).toBeVisible();
    await press(page, isMobile, "#playBtn");
    await expect(page.locator("#start")).toBeHidden();
    // In the car or out of it (each version loads what the last one saved), the big button switches.
    const label = (await page.locator("#carBtn .lbl").textContent()).trim();
    expect(["Get out", "Get in"]).toContain(label);
    await press(page, isMobile, "#carBtn");
    await expect(page.locator("#carBtn .lbl")).toHaveText(label === "Get out" ? "Get in" : "Get out", { timeout: 8000 });
    if (url === V2) await shot("v2-plays");
  }
  note(`${V2} and ${V1}: Let's go!, then the big button gets Rosie out of the car (or back in)`);
  expect(browserErrors).toEqual([]);
});

test("games.json makes jeremy.v3 the default and still offers jeremy.v2 and jeremy.v1", async ({ note }) => {
  const g = games.find(x => x.slug === SLUG);
  expect(g.creator).toBe("jeremy");
  expect(g.default).toBe("jeremy.v3");
  expect(g.url).toBe(V3);
  expect(g.versions.map(v => v.id)).toEqual(["jeremy.v1", "jeremy.v2", "jeremy.v3"]);
  expect(g.versions.find(v => v.id === "jeremy.v1").url).toBe(V1);
  expect(g.versions.find(v => v.id === "jeremy.v2").url).toBe(V2);
  const v3 = g.versions.find(v => v.id === "jeremy.v3");
  expect(v3).toMatchObject({ url: V3, from: "jeremy.v2", idea: 222, note: "Enter to start, keys for Map and Help" });
  expect(v3.source, "built in GameOn, not copied from jwildfire/princess-lady-drive").toBeUndefined();
  note(`default ${g.default}; jeremy.v2 at ${V2}, jeremy.v1 at ${V1}`);
});

test("the arcade plays jeremy.v3 by default, and the version picker still offers jeremy.v2 and jeremy.v1", async ({ page, isMobile, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  await page.goto("./");
  await page.locator(`#shelf .cart[href="#${SLUG}"]`).click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("jeremy.v3");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(page.locator('#ver-list .ver-item[data-version="jeremy.v2"]')).toBeVisible();
  await expect(page.locator('#ver-list .ver-item[data-version="jeremy.v1"]')).toBeVisible();
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v3$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V3);
  const game = page.frameLocator("#frame");
  await expect(game.getByRole("heading", { name: "Princess Lady Drive" })).toBeVisible();
  await game.locator("#playBtn").click();
  await expect(game.locator("#start")).toBeHidden();
  await expect(page.locator("#ver-select")).toHaveValue("jeremy.v3");
  note("card → picker (jeremy.v3 Latest, jeremy.v2, jeremy.v1) → jeremy.v3 plays in the frame");
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v2`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  expect(browserErrors).toEqual([]);
});
