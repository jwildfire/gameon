// Evidence for #141: twenty more Weird mode backgrounds, each behind the arcade with a flash
// check, and all of them in the cycle and the shuffle.
// Run: npm run evidence -- tests/evidence/141-more-backgrounds
import { readFileSync } from "node:fs";
import { test, expect } from "./evidence.mjs";

// Headless Chromium without a GPU only gets WebGL through SwiftShader (see the #134 spec).
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

const source = readFileSync(new URL("../../assets/backgrounds.js", import.meta.url), "utf8");
const picks = JSON.parse(source.match(/var PICKS = (\[[^\]]*\])/)[1].replace(/\s+/g, " "));

const NEW = [
  ["stained-glass", "Stained Glass"], ["reaction-diffusion", "Turing Spots"], ["mandelbrot-dive", "Mandelbrot Dive"],
  ["neon-ridges", "Neon Ridges"], ["op-art", "Op-Art Warp"], ["cube-field", "Cube Field"],
  ["liquid-chrome", "Liquid Chrome"], ["firefly-fog", "Firefly Fog"], ["truchet-tiles", "Truchet Tiles"],
  ["pixel-sort", "Pixel Sort"], ["halftone-wave", "Halftone Wave"], ["ascii-wave", "ASCII Wave"],
  ["nested-squares", "Nested Squares"], ["bounce-shapes", "Bounce House"], ["vhs-dream", "VHS Dream"],
  ["sprinkles", "Sprinkle Snow"], ["two-tone-goo", "Two-Tone Goo"], ["flow-field", "Flow Field"],
  ["string-art", "String Art"], ["gyro-rings", "Gyro Rings"]
];
const NEW_IDS = NEW.map(([id]) => id);
const CARD = "rgb(255, 253, 246)";

const current = page => page.evaluate(() => document.documentElement.getAttribute("data-bg"));

async function ready(page) {
  await page.waitForFunction(() => window.GameOnBackgrounds && window.GameOnBackgrounds.runner);
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const c = document.querySelector("canvas.gob-canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3));
    return { colours: seen.size, w: c.width, h: c.height };
  });
}

// Plays the background through 3 seconds of its own animation time on a separate copy
// (at most 400 px across) and samples it 20 times per animated second, as relative luminance
// (0 black .. 1 white) averaged over a 24 x 16 grid of patches. Stepping the animation clock
// instead of waiting on the wall clock keeps the check the same on a slow machine.
async function sampleLuminance(page, id) {
  return page.evaluate(async id => {
    const B = window.GameOnBackgrounds, src = document.querySelector("canvas.gob-canvas");
    const k = Math.min(1, 400 / Math.max(src.width, src.height));
    const W = Math.round(src.width * k), H = Math.round(src.height * k);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d", { alpha: false, willReadFrequently: true });
    const p = B.painter(id, W, H), kind = B.list.find(d => d.id === id).kind;
    const sub = kind === "gl" ? 1 : 3; // shaders are a pure function of time; canvas ones step at 60 fps
    const GX = 24, GY = 16, lin = new Float32Array(256), samples = [];
    for (let v = 0; v < 256; v++) { const s = v / 255; lin[v] = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
    for (let i = 0; i < 60; i++) {
      for (let j = 0; j < sub; j++) p.paint(ctx, 1 / (20 * sub), 1);
      const d = ctx.getImageData(0, 0, W, H).data;
      const sum = new Float32Array(GX * GY), n = new Float32Array(GX * GY);
      for (let y = 0; y < H; y += 2) {
        const row = Math.min(GY - 1, (y * GY / H) | 0) * GX;
        for (let x = 0; x < W; x += 2) {
          const q = (y * W + x) * 4, cell = row + Math.min(GX - 1, (x * GX / W) | 0);
          sum[cell] += 0.2126 * lin[d[q]] + 0.7152 * lin[d[q + 1]] + 0.0722 * lin[d[q + 2]];
          n[cell]++;
        }
      }
      samples.push({ t: i * 50, l: Array.from(sum, (v, cell) => v / n[cell]) });
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 0));
    }
    p.dispose();
    return { samples, w: W, h: H };
  }, id);
}

// Frames the live background draws per second.
async function liveFps(page) {
  return page.evaluate(async () => {
    const r = window.GameOnBackgrounds.runner, f0 = r.frames, t0 = performance.now();
    await new Promise(x => setTimeout(x, 2000));
    return (r.frames - f0) / ((performance.now() - t0) / 1000);
  });
}

// The WCAG general-flash idea: a flash is a pair of opposite luminance changes of at least
// 0.1 where the darker side is below 0.8. A patch "flashes" if it does that more than three
// times within any one second. Also measures the biggest change between two samples.
function flashReport({ samples }) {
  const cells = samples[0].l.length;
  let flashing = 0, bigStep = 0, meanStep = 0;
  const flashingCells = new Array(cells).fill(false);
  for (let k = 0; k < cells; k++) {
    let ext = samples[0].l[k], dir = 0;
    const turns = [];
    for (const s of samples) {
      const v = s.l[k];
      if (dir >= 0 && v > ext) ext = v;
      if (dir <= 0 && v < ext) ext = v;
      if (dir >= 0 && v <= ext - 0.1 && Math.min(v, ext) < 0.8) { turns.push(s.t); dir = -1; ext = v; }
      else if (dir <= 0 && v >= ext + 0.1 && Math.min(v, ext) < 0.8) { turns.push(s.t); dir = 1; ext = v; }
    }
    for (let i = 0; i + 6 < turns.length; i++) if (turns[i + 6] - turns[i] < 1000) { flashingCells[k] = true; break; }
  }
  flashing = flashingCells.filter(Boolean).length / cells;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].l, b = samples[i].l;
    let jumped = 0, ma = 0, mb = 0;
    for (let k = 0; k < cells; k++) { if (Math.abs(a[k] - b[k]) > 0.2) jumped++; ma += a[k]; mb += b[k]; }
    bigStep = Math.max(bigStep, jumped / cells);
    meanStep = Math.max(meanStep, Math.abs(ma - mb) / cells);
  }
  return { flashing, bigStep, meanStep };
}

const pct = x => `${(x * 100).toFixed(1)}%`;

for (const [i, [id, name]] of NEW.entries()) {
  test(`${name} renders behind the arcade without flashing`, async ({ page, shot, note, browserErrors }, info) => {
    test.setTimeout(120_000);
    await page.goto(`./?mode=weird&bg=${id}&bgInterval=9999`);
    await ready(page);
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute("data-bg-state"))).toBe("running");
    expect(await current(page)).toBe(id); // a shader that failed to compile would be skipped
    await page.waitForTimeout(1500);
    const s = await canvasStats(page);
    expect(s.colours).toBeGreaterThan(8);
    for (const sel of [".lede", ".foot", ".cart"]) await expect(page.locator(sel).first()).toHaveCSS("background-color", CARD);
    await shot(`bg-${String(i + 1).padStart(2, "0")}-${id}`);
    const fps = await liveFps(page);
    if (info.project.name === "phone") expect(fps).toBeLessThanOrEqual(33);
    const lum = await sampleLuminance(page, id);
    const r = flashReport(lum);
    expect(r.flashing, "share of the screen flashing more than 3 times a second").toBeLessThanOrEqual(0.02);
    expect(r.bigStep, "share of the screen jumping 0.2 in luminance between samples").toBeLessThanOrEqual(0.1);
    expect(r.meanStep, "whole-screen luminance jump between samples").toBeLessThanOrEqual(0.05);
    expect(await current(page)).toBe(id);
    note(`${s.colours} colours on ${s.w}x${s.h}, ${fps.toFixed(0)} fps live here; flash check over 3 animated seconds at 20 samples a second: flashing ${pct(r.flashing)}, biggest 50 ms jump ${pct(r.bigStep)} of the screen, mean step ${r.meanStep.toFixed(3)}`);
    expect(browserErrors).toEqual([]);
  });
}

test("the cycle runs through the original ten plus the new picks", async ({ page, note, browserErrors }) => {
  await page.goto("./?mode=weird&bgInterval=9999");
  await ready(page);
  const order = await page.evaluate(() => window.GameOnBackgrounds.runner.order);
  expect(order).toEqual(picks);
  expect(order.slice(0, 10)).toEqual(["rainbow-plasma", "matrix-rain", "kaleidoscope", "lava-lamp", "rainbow-rain",
    "hex-disco", "liquid-marble", "warp-speed", "rainbow-tunnel", "retro-sun"]);
  const added = order.filter(id => NEW_IDS.includes(id));
  expect(added.length).toBe(order.length - 10);
  expect(added.length).toBeGreaterThanOrEqual(15);
  const all = await page.evaluate(() => window.GameOnBackgrounds.list.length);
  expect(all).toBe(40);
  note(`${order.length} in the cycle (${added.length} new) out of ${all}: ${added.join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("Next moves from the last original pick on to a new one", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(90_000);
  await page.goto("./?mode=weird&bg=retro-sun&bgInterval=9999");
  await ready(page);
  expect(await current(page)).toBe("retro-sun");
  await page.locator(".gob-next").click();
  await expect.poll(() => current(page), { timeout: 20_000 }).toBe(picks[10]);
  expect(NEW_IDS).toContain(picks[10]);
  await page.waitForTimeout(1200);
  await shot("next-to-new");
  note(`retro-sun → ${picks[10]}`);
  expect(browserErrors).toEqual([]);
});

test("Shuffle lands on new backgrounds", async ({ page, shot, note, browserErrors }) => {
  test.setTimeout(120_000);
  await page.goto("./?mode=weird&bg=rainbow-plasma&bgInterval=9999");
  await ready(page);
  const seen = [];
  for (let k = 0; k < 12 && seen.filter(id => NEW_IDS.includes(id)).length < 3; k++) {
    const before = await current(page);
    await page.locator(".gob-ctl [data-shuffle]").click();
    await expect.poll(() => current(page), { timeout: 20_000 }).not.toBe(before);
    seen.push(await current(page));
    await page.waitForTimeout(800); // let the crossfade finish before the next shuffle
  }
  const fresh = seen.filter(id => NEW_IDS.includes(id));
  expect(fresh.length).toBeGreaterThanOrEqual(1);
  for (const id of seen) expect(picks).toContain(id);
  await shot("shuffled");
  note(`shuffle visited ${seen.join(" → ")}; new ones: ${fresh.join(", ")}`);
  expect(browserErrors).toEqual([]);
});
