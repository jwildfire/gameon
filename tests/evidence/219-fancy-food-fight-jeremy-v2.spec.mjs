// Evidence for game idea #219: Fancy Food Fight jeremy.v2, Jeremy's phone-and-keyboard pass (the phone bar from
// #187: every button 48 x 48 px or bigger, 8 px clear of each other and the screen's edges, at 375 px wide and held
// sideways at 812 x 375; keys for Sound and How to play). The creator's update, started from jeremy.v1 at
// games/fancy-food-fight/, and the new default. Spec: the build skill's U6 and docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/219-fancy-food-fight-jeremy-v2
// The guests are held still (__fff.calm) wherever a check needs the same result every run.
import { test, expect, games, touchTargets } from "./evidence.mjs";

const SLUG = "fancy-food-fight";
const V1 = `games/${SLUG}/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const UPRIGHT = { width: 375, height: 812 };
const SIDEWAYS = { width: 812, height: 375 };
const SMALL_SIDEWAYS = [{ width: 568, height: 320 }, { width: 640, height: 360 }, { width: 667, height: 375 }, { width: 740, height: 360 }];
const fff = (page, expr, arg) => page.evaluate(expr, arg);
// the clear space between two boxes, side by side or one above the other
const apart = (a, b) => Math.round(Math.max(Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w), Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)));
const box = (page, sel) => page.locator(sel).first().evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: innerWidth - r.right, bottom: innerHeight - r.bottom }; });
async function press(page, isMobile, sel) {
  if (isMobile) { const b = await box(page, sel); await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2); } else await page.locator(sel).first().click();
}
async function start(page, isMobile, url = V2) {
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#hud")).toBeVisible();
  await fff(page, () => window.__fff.calm());
}

test("jeremy.v2 opens to its title screen and starts, with nothing loaded from the internet", async ({ page, isMobile, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(V2);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".title-big")).toHaveText("Fancy Food Fight");
  await expect(page.locator("#title-screen")).toContainText("Designed by Jeremy");
  await shot("title");
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#hud-round")).toHaveText("Round 1 of 3");
  await expect(page.locator("#tray .food")).toHaveCount(4);
  await expect(page.locator("#duck-btn")).toBeVisible();
  await expect(page.locator("#sound-btn")).toBeVisible();
  await expect(page.locator("#pause-btn")).toBeVisible();
  expect(await fff(page, () => __fff.mode)).toBe("play");
  const t0 = await fff(page, () => __fff.time);
  await page.waitForTimeout(600);
  expect(await fff(page, () => __fff.time)).toBeLessThan(t0);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`${isMobile ? "tapped" : "clicked"} Let's get messy and the round clock ran; 4 foods, Duck!, Sound and Pause showing; no requests outside the site; no sideways scrolling`);
  await shot("playing");
  expect(browserErrors).toEqual([]);
});

// Every screen with buttons: title, How to play, playing, paused, between rounds. Taps (phone) or clicks (desktop)
// the real controls on the way and checks each did its job; measures every button with touchTargets() on each screen.
async function everyScreen(page, isMobile, label, shot) {
  const lines = [];
  const measure = async screen => {
    const { targets, problems } = await touchTargets(page);
    expect(problems, `${label} ${screen}: ${problems.join("; ")}`).toEqual([]);
    expect(targets.length).toBeGreaterThan(0);
    lines.push(`${screen} ${targets.length} (smallest ${Math.min(...targets.map(t => Math.min(t.w, t.h)))} px)`);
    return targets;
  };
  await page.goto(V2);
  await expect(page.locator("#play-btn")).toBeVisible();
  for (const sel of ["#play-btn", "#how-btn"]) expect((await box(page, sel)).h).toBeGreaterThanOrEqual(48);
  await measure("title");
  await press(page, isMobile, "#how-btn");
  await expect(page.locator("#how-screen")).toBeVisible();
  await page.locator("#how-back").scrollIntoViewIfNeeded();
  await measure("how to play");
  await press(page, isMobile, "#how-back");
  await expect(page.locator("#title-screen")).toBeVisible();
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#hud")).toBeVisible();
  await fff(page, () => __fff.calm());
  // the HUD buttons, the tray and Duck!: their sizes, gaps and edges, measured directly as well
  const so = await box(page, "#sound-btn"), pa = await box(page, "#pause-btn"), du = await box(page, "#duck-btn");
  const foods = [];
  for (let i = 0; i < 4; i++) foods.push(await box(page, `#tray .food >> nth=${i}`));
  for (const b of [so, pa, du, ...foods]) { expect(b.w).toBeGreaterThanOrEqual(48); expect(b.h).toBeGreaterThanOrEqual(48); }
  expect(apart(so, pa)).toBeGreaterThanOrEqual(8);
  for (const b of [so, pa]) expect(apart(b, du)).toBeGreaterThanOrEqual(8);
  expect(Math.round(pa.right)).toBeGreaterThanOrEqual(8);
  expect(Math.round(du.right)).toBeGreaterThanOrEqual(8);
  expect(Math.round(du.bottom)).toBeGreaterThanOrEqual(8);
  expect(Math.round(foods[0].x)).toBeGreaterThanOrEqual(8);
  for (let i = 1; i < 4; i++) expect(Math.round(foods[i].x - (foods[i - 1].x + foods[i - 1].w))).toBeGreaterThanOrEqual(8);
  const play = await measure("playing");
  for (const name of ["Sound on", "Pause", "Cream pie", "Spaghetti", "Jelly", "Layer cake", "Duck!"]) expect(play.map(t => t.name)).toContain(name);
  // each control does its job when tapped
  await press(page, isMobile, "#tray .food >> nth=2");
  expect(await fff(page, () => __fff.food)).toBe(2);
  await expect(page.locator("#tray .food >> nth=2")).toHaveAttribute("aria-pressed", "true");
  await press(page, isMobile, "#sound-btn");
  expect(await fff(page, () => __fff.muted)).toBe(true);
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-label", "Sound off");
  await press(page, isMobile, "#sound-btn");
  expect(await fff(page, () => __fff.muted)).toBe(false);
  const d = await box(page, "#duck-btn");
  await page.mouse.move(d.x + d.w / 2, d.y + d.h / 2);
  await page.mouse.down();
  await expect.poll(() => fff(page, () => __fff.ducking)).toBe(true);
  await shot(`buttons-${label}`);
  await page.mouse.up();
  await expect.poll(() => fff(page, () => __fff.ducking)).toBe(false);
  await press(page, isMobile, "#pause-btn");
  await expect(page.locator("#pause-screen")).toBeVisible();
  expect(await fff(page, () => __fff.paused)).toBe(true);
  for (const sel of ["#resume-btn", "#restart-btn"]) expect((await box(page, sel)).h).toBeGreaterThanOrEqual(48);
  const paused = await measure("paused");
  // under the pause card the HUD buttons, tray and Duck! are dimmed and can't be tapped, as in jeremy.v1
  expect(paused.map(t => t.name).sort()).toEqual(["Keep splatting", "Start over"]);
  await press(page, isMobile, "#resume-btn");
  await expect(page.locator("#pause-screen")).toBeHidden();
  expect(await fff(page, () => __fff.paused)).toBe(false);
  await fff(page, () => __fff.endRound());
  await expect(page.locator("#round-screen")).toBeVisible();
  await page.locator("#next-btn").scrollIntoViewIfNeeded();
  expect((await box(page, "#next-btn")).h).toBeGreaterThanOrEqual(48);
  await measure("between rounds");
  await press(page, isMobile, "#next-btn");
  await expect(page.locator("#hud-round")).toHaveText("Round 2 of 3");
  const wh = b => `${Math.round(b.w)}x${Math.round(b.h)}`;
  return `Sound ${wh(so)} and Pause ${wh(pa)}, ${apart(so, pa)} px apart (${so.y + so.h <= pa.y ? "Sound above Pause" : "side by side"}), Pause ${Math.round(pa.right)} px from the right edge and ${Math.round(pa.y)} px from the top; foods ${wh(foods[0])}, ${Math.round(foods[1].x - (foods[0].x + foods[0].w))} px apart, ${Math.round(foods[0].x)} px from the left edge; Duck! ${wh(du)}, ${Math.round(du.right)} px from the right and ${Math.round(du.bottom)} px from the bottom. Buttons per screen: ${lines.join(", ")}`;
}

test("upright at 375 px wide, every button is at least 48 x 48, 8 px apart and 8 px from the edges, and each does its job when tapped", async ({ page, isMobile, shot, note, browserErrors }) => {
  // the phone run is 375 x 812 with touch; the desktop run measures the same at 1280 x 800 with clicks
  const size = isMobile ? UPRIGHT : { width: 1280, height: 800 };
  await page.setViewportSize(size);
  const line = await everyScreen(page, isMobile, isMobile ? "upright" : "wide", shot);
  note(`${size.width} x ${size.height}, ${isMobile ? "tapped" : "clicked"}: ${line}. A food, Sound (off and on), Duck! (held), Pause, Keep splatting and Next round each did their job`);
  expect(browserErrors).toEqual([]);
});

test("held sideways at 812 x 375, every button is at least 48 x 48, 8 px apart and 8 px from the edges, and each does its job when tapped", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.setViewportSize(SIDEWAYS);
  const line = await everyScreen(page, isMobile, "sideways", shot);
  note(`812 x 375, ${isMobile ? "tapped" : "clicked"}: ${line}`);
  expect(browserErrors).toEqual([]);
});

// The HUD (Round, time, the Mess label, the Mess meter, the percent and You) measured in jeremy.v1 and jeremy.v2 at
// the same screen size. Nothing may be narrower, shorter or smaller-lettered than in jeremy.v1, nothing jeremy.v1
// showed whole may be cut off, and no button may sit on top of it.
const HUD = [["Round", "#hud-round"], ["time", "#hud-time"], ["Mess label", ".meter .pill"], ["Mess meter", ".meter-bar"], ["percent", "#hud-mess"], ["You", "#hud-score"]];
async function hud(page, url, size) {
  await page.setViewportSize(size);
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
  await fff(page, () => document.getElementById("play-btn").click());
  await expect(page.locator("#hud")).toBeVisible();
  await fff(page, () => __fff.calm());
  await page.waitForTimeout(200);
  return page.evaluate(([items]) => {
    const st = document.getElementById("stage").getBoundingClientRect();
    const buttons = [...document.querySelectorAll("button")].filter(b => b.offsetParent || getComputedStyle(b).position === "fixed").map(b => b.getBoundingClientRect()).filter(r => r.width > 0);
    return Object.fromEntries(items.map(([name, sel]) => {
      const e = document.querySelector(sel), r = e.getBoundingClientRect();
      const inside = r.left >= Math.max(0, st.left) - 0.5 && r.right <= Math.min(innerWidth, st.right) + 0.5 && r.top >= Math.max(0, st.top) - 0.5 && r.bottom <= Math.min(innerHeight, st.bottom) + 0.5;
      const whole = inside && e.scrollWidth <= e.clientWidth + 1 && getComputedStyle(e).visibility !== "hidden";
      const covered = buttons.some(b => b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top);
      return [name, { w: r.width, h: r.height, font: parseFloat(getComputedStyle(e).fontSize), whole, covered }];
    }));
  }, [HUD]);
}

test("the HUD isn't squeezed: every pill and the Mess meter are as big as in jeremy.v1 or bigger, nothing jeremy.v1 showed whole is cut off, and no button covers them", async ({ page, isMobile, shot, note, browserErrors }) => {
  // upright and sideways phones, plus a sideways phone with no room beside the stage (667 x 375), where Sound and Pause drop below the HUD
  // upright and every sideways phone size, plus desktop: wide sideways phones (812, 844) stack Sound and Pause beside the
  // stage, small ones (568 to 740) put them below the table next to Duck!
  const sizes = isMobile ? [UPRIGHT, ...SMALL_SIDEWAYS, SIDEWAYS, { width: 844, height: 390 }] : [{ width: 1280, height: 800 }, SIDEWAYS];
  const lines = [];
  for (const size of sizes) {
    const v1 = await hud(page, V1, size);
    const v2 = await hud(page, V2, size);
    const diffs = [];
    for (const [name] of HUD) {
      const a = v1[name], b = v2[name];
      expect(b.w, `${size.width}x${size.height} ${name} width`).toBeGreaterThanOrEqual(a.w - 0.5);
      expect(b.h, `${size.width}x${size.height} ${name} height`).toBeGreaterThanOrEqual(a.h - 0.5);
      expect(b.font, `${size.width}x${size.height} ${name} letters`).toBeGreaterThanOrEqual(a.font);
      if (a.whole) expect(b.whole, `${size.width}x${size.height} ${name} shown whole`).toBe(true);
      expect(b.covered, `${size.width}x${size.height} ${name} covered by a button`).toBe(false);
      if (Math.abs(b.w - a.w) >= 0.5) diffs.push(`${name} ${a.w.toFixed(0)}→${b.w.toFixed(0)} px wide`);
    }
    lines.push(`${size.width} x ${size.height}: ${HUD.filter(([n]) => v1[n].whole).length} of 6 whole in v1, all still whole in v2; ${diffs.length ? diffs.join(", ") : "every item the same size"}; the rest the same size`);
    if (size === SIDEWAYS) await shot("hud-sideways");
  }
  note(lines.join(". "));
  expect(browserErrors).toEqual([]);
});

// The throw zone is where the aim can reach (stage x 20-940, y 40-430, in jeremy.v1's own units); the portraits are
// targets on the wall that score "Art!". A button over them catches a tap that would have thrown, so no button may cover
// more of them than in jeremy.v1 (where Sound and Pause sat in the HUD row and just touched the zone's top edge).
const ZONES = { "throw zone": [20, 40, 920, 390], "left portrait": [60, 70, 110, 130], "right portrait": [790, 70, 110, 130] };
async function cover(page, url, size) {
  await page.setViewportSize(size);
  await page.goto(url);
  await expect(page.locator("#play-btn")).toBeVisible();
  await fff(page, () => document.getElementById("play-btn").click());
  await expect(page.locator("#hud")).toBeVisible();
  await fff(page, () => __fff.calm());
  await page.waitForTimeout(150);
  return page.evaluate(zones => {
    const st = document.getElementById("stage").getBoundingClientRect(), u = st.width / 960;
    const buttons = ["#sound-btn", "#pause-btn", "#duck-btn", "#tray .food"].flatMap(sel => [...document.querySelectorAll(sel)]).map(b => b.getBoundingClientRect());
    const out = {};
    for (const [name, [x, y, w, h]] of Object.entries(zones)) {
      const z = { l: st.left + x * u, t: st.top + y * u, r: st.left + (x + w) * u, b: st.top + (y + h) * u };
      out[name] = Math.round(buttons.reduce((sum, b) => sum + Math.max(0, Math.min(b.right, z.r) - Math.max(b.left, z.l)) * Math.max(0, Math.min(b.bottom, z.b) - Math.max(b.top, z.t)), 0));
    }
    const s = document.getElementById("sound-btn").getBoundingClientRect(), p = document.getElementById("pause-btn").getBoundingClientRect();
    out.where = `Sound ${Math.round(s.left)},${Math.round(s.top)} Pause ${Math.round(p.left)},${Math.round(p.top)}`;
    return out;
  }, ZONES);
}

test("Sound, Pause, the tray and Duck! cover no more of the throw zone or the portraits than in jeremy.v1, at every phone size, and still pass the phone bar", async ({ page, isMobile, shot, note, browserErrors }) => {
  const sizes = [UPRIGHT, ...SMALL_SIDEWAYS, SIDEWAYS, { width: 844, height: 390 }, { width: 1280, height: 800 }];
  const lines = [];
  for (const size of sizes) {
    const v1 = await cover(page, V1, size);
    const v2 = await cover(page, V2, size);
    for (const zone of Object.keys(ZONES)) expect(v2[zone], `${size.width}x${size.height} ${zone}: v1 ${v1[zone]} px², v2 ${v2[zone]} px²`).toBeLessThanOrEqual(v1[zone]);
    const { problems } = await touchTargets(page);
    expect(problems, `${size.width}x${size.height}: ${problems.join("; ")}`).toEqual([]);
    lines.push(`${size.width} x ${size.height}: throw zone ${v1["throw zone"]} → ${v2["throw zone"]} px², portraits ${v1["left portrait"] + v1["right portrait"]} → ${v2["left portrait"] + v2["right portrait"]} px² (${v2.where})`);
    if (size.width === 667) await shot("clear-of-the-wall");
  }
  // a tap on the right-hand portrait at 667 x 375 throws food at it (Art! +20) and leaves the sound alone
  await page.setViewportSize({ width: 667, height: 375 });
  await start(page, isMobile);
  const st = await box(page, "#stage"), u = st.w / 960;
  const at = [st.x + 845 * u, st.y + 110 * u];
  const s0 = await fff(page, () => __fff.score);
  if (isMobile) await page.touchscreen.tap(at[0], at[1]); else await page.mouse.click(at[0], at[1]);
  await expect.poll(() => fff(page, () => __fff.score), { timeout: 3000 }).toBeGreaterThanOrEqual(s0 + 20);
  expect(await fff(page, () => __fff.muted)).toBe(false);
  note(`v1 → v2 button area over the throw zone and the portraits (screen px²): ${lines.join("; ")}. At 667 x 375 a ${isMobile ? "tap" : "click"} on the right-hand portrait (${at.map(Math.round).join(",")}) threw and scored Art! with the sound still on`);
  expect(browserErrors).toEqual([]);
});

test("new keys: M turns the sound off and on, and H opens How to play from the title, in play and between rounds", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto(V2);
  await expect(page.locator("#play-btn")).toBeVisible();
  // H on the title screen, then H again (or Got it) goes back
  await page.keyboard.press("h");
  await expect(page.locator("#how-screen")).toBeVisible();
  await expect(page.locator("#how-screen")).toContainText("M turns the sound on or off, H shows this help");
  await page.keyboard.press("h");
  await expect(page.locator("#title-screen")).toBeVisible();
  // M on the title screen and in play; it's saved like the Sound button's choice
  expect(await fff(page, () => __fff.muted)).toBe(false);
  await page.keyboard.press("m");
  expect(await fff(page, () => __fff.muted)).toBe(true);
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-label", "Sound off");
  expect(await page.evaluate(() => localStorage.getItem("gameon.fancy-food-fight.muted"))).toBe("1");
  await page.keyboard.press("Enter");
  await expect(page.locator("#hud")).toBeVisible();
  await fff(page, () => __fff.calm());
  await page.keyboard.press("m");
  expect(await fff(page, () => __fff.muted)).toBe(false);
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-label", "Sound on");
  // H in play pauses the clock and shows How to play; H again goes to the pause card; Escape plays on
  await page.keyboard.press("h");
  await expect(page.locator("#how-screen")).toBeVisible();
  expect(await fff(page, () => __fff.paused)).toBe(true);
  const t0 = await fff(page, () => __fff.time);
  await page.waitForTimeout(400);
  expect(await fff(page, () => __fff.time)).toBe(t0);
  await shot("help-key");
  await page.keyboard.press("h");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-screen")).toBeHidden();
  expect(await fff(page, () => __fff.paused)).toBe(false);
  // between rounds H shows How to play and comes back to the scores
  await fff(page, () => __fff.endRound());
  await expect(page.locator("#round-screen")).toBeVisible();
  await page.keyboard.press("h");
  await expect(page.locator("#how-screen")).toBeVisible();
  await page.keyboard.press("h");
  await expect(page.locator("#round-screen")).toBeVisible();
  note("M: sound off (saved as gameon.fancy-food-fight.muted = 1) then on again in play. H: help from the title and back; in play it paused the clock and H again showed the pause card, Escape played on; between rounds it came back to the scores");
  expect(browserErrors).toEqual([]);
});

test("the keyboard still plays: WASD and the arrows each move the aim, Space throws, P pauses and Escape plays on", async ({ page, isMobile, note, browserErrors }) => {
  await start(page, isMobile);
  await page.keyboard.press("d"); // the first key shows the aim
  const moved = [];
  // each key and then its opposite, so the aim stays near the middle and never reaches the edge it stops at
  for (const [key, dx, dy] of [["d", 1, 0], ["a", -1, 0], ["ArrowRight", 1, 0], ["ArrowLeft", -1, 0], ["w", 0, -1], ["s", 0, 1], ["ArrowUp", 0, -1], ["ArrowDown", 0, 1]]) {
    const a = await fff(page, () => __fff.aim);
    await page.keyboard.down(key); await page.waitForTimeout(120); await page.keyboard.up(key);
    const b = await fff(page, () => __fff.aim);
    expect([Math.sign(b.x - a.x), Math.sign(b.y - a.y)], key).toEqual([dx, dy]);
    const dv = b.x - a.x || b.y - a.y;
    moved.push(`${key} ${dv > 0 ? "+" : ""}${dv}`);
  }
  // whatever the throw lands on (wall, guest or chandelier) scores
  const s0 = await fff(page, () => __fff.score);
  await page.keyboard.press("Space");
  await expect.poll(() => fff(page, () => __fff.score), { timeout: 3000 }).toBeGreaterThan(s0);
  await page.keyboard.press("p");
  await expect(page.locator("#pause-screen")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-screen")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-screen")).toBeVisible();
  note(`aim moved (world px): ${moved.join(", ")}; Space threw and scored; P paused, Escape played on, Escape paused again`);
  expect(browserErrors).toEqual([]);
});

test("what stays still works: a throw splats a guest and scores, a real tap throws, Duck! makes a throw miss, and the round ends with a crown", async ({ page, isMobile, shot, note, browserErrors }) => {
  await start(page, isMobile);
  const guests = await fff(page, () => __fff.guests);
  await fff(page, x => __fff.throwAt(x, 250), guests[1].x);
  await expect.poll(() => fff(page, () => __fff.guests[1].splats), { timeout: 3000 }).toBeGreaterThan(0);
  const scored = await fff(page, () => __fff.score);
  expect(scored).toBeGreaterThanOrEqual(25);
  const before = await fff(page, () => __fff.splats);
  await page.waitForTimeout(400);
  const g = await page.locator("#game").boundingBox();
  if (isMobile) await page.touchscreen.tap(g.x + g.width * 0.2, g.y + g.height * 0.3); else await page.mouse.click(g.x + g.width * 0.2, g.y + g.height * 0.3);
  await expect.poll(() => fff(page, () => __fff.splats), { timeout: 3000 }).toBeGreaterThan(before);
  await shot("splat");
  // hold Duck! (the button) and a guest's throw flies over; let go and the next one lands
  const d = await box(page, "#duck-btn");
  await page.mouse.move(d.x + d.w / 2, d.y + d.h / 2);
  await page.mouse.down();
  await fff(page, () => __fff.guestThrowsNow());
  await page.waitForTimeout(1300);
  expect(await fff(page, () => __fff.playerSplatted)).toBe(false);
  await page.mouse.up();
  await fff(page, () => __fff.calm());
  await fff(page, () => __fff.guestThrowsNow());
  await expect.poll(() => fff(page, () => __fff.playerSplatted), { timeout: 3000 }).toBe(true);
  await fff(page, () => __fff.endRound());
  await expect(page.locator("#round-screen")).toBeVisible();
  await expect(page.locator("#round-board > div")).toHaveCount(5);
  await expect(page.locator("#round-board > div.win")).toContainText("👑");
  await shot("round-over");
  note(`a guest splat scored ${scored}; a ${isMobile ? "tap" : "click"} on the wall splatted; holding Duck! the pie flew over, letting go it landed; the round ended with a crown`);
  expect(browserErrors).toEqual([]);
});

test("saves carry over: jeremy.v1's best night and sound-off load in jeremy.v2, and every save stays under gameon.fancy-food-fight.", async ({ page, isMobile, shot, note, browserErrors }) => {
  // what jeremy.v1 writes: gameon.fancy-food-fight.best (points) and gameon.fancy-food-fight.muted ("1" or "0")
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("gameon.fancy-food-fight.best", "432");
    localStorage.setItem("gameon.fancy-food-fight.muted", "1");
  });
  await page.goto(V2);
  await expect(page.locator("#best-line")).toHaveText("Your messiest night so far: 432 points");
  expect(await fff(page, () => __fff.muted)).toBe(true);
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-label", "Sound off");
  await shot("saved-best");
  await press(page, isMobile, "#play-btn");
  await expect(page.locator("#hud")).toBeVisible();
  await press(page, isMobile, "#sound-btn");
  expect(await fff(page, () => __fff.muted)).toBe(false);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  for (const k of keys) expect(k.startsWith("gameon.fancy-food-fight.")).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("gameon.fancy-food-fight.best"))).toBe("432");
  // and jeremy.v1 still reads what jeremy.v2 left
  await page.goto(V1);
  await expect(page.locator("#best-line")).toHaveText("Your messiest night so far: 432 points");
  await expect(page.locator("#sound-btn")).toHaveAttribute("aria-label", "Sound on");
  note(`seeded jeremy.v1's saves (best 432, sound off): jeremy.v2 showed the best night and started muted; its Sound button saved under the same key, which jeremy.v1 then read. Keys: ${keys.join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("jeremy.v1 still plays at games/fancy-food-fight/, and games.json keeps both versions", async ({ page, isMobile, shot, note, browserErrors }) => {
  const entry = games.find(g => g.slug === SLUG);
  expect(entry.default).toBe("jeremy.v2");
  expect(entry.url).toBe(V2);
  expect(entry.versions.map(v => [v.id, v.url])).toEqual([["jeremy.v1", V1], ["jeremy.v2", V2]]);
  await start(page, isMobile, V1);
  await expect(page.locator("#hud-round")).toHaveText("Round 1 of 3");
  const guests = await fff(page, () => __fff.guests);
  await fff(page, x => __fff.throwAt(x, 250), guests[2].x);
  await expect.poll(() => fff(page, () => __fff.guests[2].splats), { timeout: 3000 }).toBeGreaterThan(0);
  await shot("v1-plays");
  note(`jeremy.v1 at ${V1} opened, started and splatted a guest; games.json: default jeremy.v2, versions jeremy.v1 and jeremy.v2`);
  expect(browserErrors).toEqual([]);
});

test("in the arcade, Fancy Food Fight offers both versions and plays jeremy.v2 by default; #fancy-food-fight@jeremy.v1 still opens jeremy.v1", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator(`#shelf .cart[href="#${SLUG}"]`);
  await expect(card).toContainText("2 versions");
  await card.click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Buttons that stay big on a phone");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".title-big")).toHaveText("Fancy Food Fight");
  await frame.locator("#play-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  await expect(frame.locator("#pause-btn")).toBeVisible();
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  await expect(page.frameLocator("#frame").locator("#play-btn")).toBeVisible();
  note(`card (2 versions) → picker: jeremy.v2 first, "Buttons that stay big on a phone" → jeremy.v2 plays in the frame; #${SLUG}@jeremy.v1 still opens jeremy.v1`);
  expect(browserErrors).toEqual([]);
});
