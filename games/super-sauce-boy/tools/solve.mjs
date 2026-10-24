// Proves every Super Sauce Boy level can be beaten, using the game's own engine.
// Run from the repo root (after npm ci):
//   node games/super-sauce-boy/tools/solve.mjs            all levels, inputs held for 1/20 s at a time
//   node games/super-sauce-boy/tools/solve.mjs 5 12       just level 5, inputs held for 1/10 s at a time
//   node games/super-sauce-boy/tools/solve.mjs 0 12       every level, inputs held for 1/10 s at a time
// It searches over runs where you hold left, right or nothing, with or without jump, for
// <step> engine ticks at a time (120 ticks a second). A level that solves with a coarse
// step doesn't need frame-perfect inputs. Winning runs are written to tools/solutions.json,
// which the evidence spec replays in the real game.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const only = Number(process.argv[2]) || null; // 0 or nothing: every level
const K = Number(process.argv[3] || 6);
const maxNodes = Number(process.argv[4] || 3000000);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><title>solver</title>");
await page.addScriptTag({ path: path.join(here, "..", "engine.js") });
await page.addScriptTag({ path: path.join(here, "..", "levels.js") });

function solveInPage({ li, K, maxNodes }) {
  const E = window.SSBEngine, L = window.SSB_LEVELS[li];
  const map = E.parse(L), w0 = E.create(L, map);
  const C = E.COLS, R = E.ROWS, T = E.T;
  const wall = { "#": 1, "=": 1, T: 1, H: 1, h: 1 };
  // Distance (in tiles) to a cell, walking through anything that isn't solid.
  const field = (gc, gr) => {
    const dist = new Array(C * R).fill(1e9), q = [gr * C + gc];
    dist[gr * C + gc] = 0;
    while (q.length) {
      const i = q.shift(), c = i % C, r = (i / C) | 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= C || nr >= R || wall[map.grid[nr][nc]]) continue;
        const j = nr * C + nc;
        if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); }
      }
    }
    return dist;
  };
  // A level can name waypoints (solverRoute) so the search doesn't chase a dead end that looks close.
  const stops = (L.solverRoute || []).concat([[map.goal.c, map.goal.r]]);
  const fields = stops.map(([c, r]) => field(c, r));
  const rest = stops.map((s, i) => { let d = 0; for (let k = i; k + 1 < stops.length; k++) d += fields[k + 1][stops[k][1] * C + stops[k][0]]; return d; });
  const timed = map.hot || map.cutters.length > 0;
  const acts = [];
  for (const d of [1, 0, -1]) for (const j of [true, false]) acts.push({ l: d < 0, r: d > 0, j });
  const code = a => (a.r ? "r" : a.l ? "l" : "n")[a.j ? "toUpperCase" : "toLowerCase"]();
  const cellOf = w => Math.max(0, Math.min(R - 1, Math.floor((w.p.y + 10) / T))) * C + Math.max(0, Math.min(C - 1, Math.floor((w.p.x + 10) / T)));
  const h = (w, st) => (fields[st][cellOf(w)] + rest[st]) * T;
  const advance = (w, st) => (st < stops.length - 1 && fields[st][cellOf(w)] <= 1 ? st + 1 : st);
  const key = (w, st) => {
    const p = w.p;
    let k = st + ":" + Math.round(p.x / 3) + "," + Math.round(p.y / 3) + "," + Math.round(p.vx / 40) + "," + Math.round(p.vy / 50) + "," + (p.gr ? 1 : 0) + (p.prevJ ? 1 : 0);
    for (const cr of w.cr) k += cr.timer >= 0 ? "a" : cr.gone > 0 ? "b" : "c";
    if (timed) k += "," + Math.floor(w.t * 8);
    return k;
  };
  // Binary heap on f
  const heap = [];
  const push = (f, i) => { heap.push([f, i]); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (heap[p][0] <= heap[n][0]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let n = 0; for (;;) { const a = 2 * n + 1, b = a + 1; let m = n; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; n = m; } } return top; };
  const states = [w0], stage = [advance(w0, 0)], parent = [-1], act = [-1], seen = new Set([key(w0, stage[0])]);
  push(h(w0, stage[0]), 0);
  let expanded = 0;
  while (heap.length && expanded < maxNodes) {
    const [, i] = pop(); expanded++;
    for (let a = 0; a < acts.length; a++) {
      const w = E.clone(states[i]);
      for (let s = 0; s < K && !w.dead && !w.won; s++) E.step(w, acts[a]);
      if (w.dead) continue;
      if (w.won) {
        let path = code(acts[a]), n = i;
        while (parent[n] >= 0) { path = code(acts[act[n]]) + path; n = parent[n]; }
        return { li, name: L.name, ok: true, K, t: Math.round(w.t * 100) / 100, inputs: path, expanded };
      }
      const st = advance(w, stage[i]);
      const k = key(w, st);
      if (seen.has(k)) continue;
      seen.add(k);
      states.push(w); stage.push(st); parent.push(i); act.push(a);
      push(h(w, st) + 250 * w.t, states.length - 1);
    }
  }
  let best = 1e9, bi = 0;
  states.forEach((s, i) => { if (h(s, stage[i]) / T < best) { best = h(s, stage[i]) / T; bi = i; } });
  let partial = "", n = bi;
  while (parent[n] >= 0) { partial = code(acts[act[n]]) + partial; n = parent[n]; }
  return { li, name: L.name, ok: false, K, expanded, closest: best, partial };
}

const count = await page.evaluate(() => window.SSB_LEVELS.length);
const file = path.join(here, "solutions.json");
let saved = {};
try { saved = JSON.parse(readFileSync(file, "utf8")); } catch {}
let allOk = true;
for (let li = 0; li < count; li++) {
  if (only !== null && li + 1 !== only) continue;
  const t0 = Date.now();
  const res = await page.evaluate(solveInPage, { li, K, maxNodes });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (res.ok) {
    console.log(`level ${li + 1} ${res.name}: beaten in ${res.t}s (step ${K}, ${res.expanded} tries, ${secs}s)`);
    if (K === 6) saved[li + 1] = { name: res.name, step: K, time: res.t, inputs: res.inputs };
  } else {
    allOk = false;
    if (process.env.SOLVE_PARTIAL) writeFileSync(process.env.SOLVE_PARTIAL, JSON.stringify({ [li + 1]: { step: K, inputs: res.partial } }));
    console.log(`level ${li + 1} ${res.name}: NOT beaten (step ${K}, ${res.expanded} tries, got within ${res.closest} tiles, ${secs}s)`);
  }
}
if (K === 6) writeFileSync(file, JSON.stringify(saved, null, 1) + "\n");
await browser.close();
process.exit(allOk ? 0 : 1);
