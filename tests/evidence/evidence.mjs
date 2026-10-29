// The helper every evidence spec imports instead of @playwright/test. See docs/evidence.md.
//
//   import { test, expect, games } from "./evidence.mjs";
//
//   test("the arcade home shows a card for every game", async ({ page, shot, note, browserErrors }) => {
//     await page.goto("./");                       // paths are relative: no leading slash
//     await expect(page.locator("#shelf .cart")).toHaveCount(games.length);
//     note(`${games.length} cards`);               // a line under the check in the README
//     await shot("home");                          // evidence/<spec>/home-desktop.jpg and home-phone.jpg
//     expect(browserErrors).toEqual([]);
//   });
//
// Every test runs twice, at desktop (1280 wide) and phone (375 wide) sizes.
import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect } from "@playwright/test";

export { expect };

export const LIVE = !!process.env.EVIDENCE_BASE_URL;

// Local runs write the evidence you commit. Live runs and evidence:check write to a scratch
// folder under node_modules, so they never touch committed files.
export const EVIDENCE_ROOT = process.env.EVIDENCE_DIR
  || (LIVE ? "node_modules/.cache/gameon-evidence/live" : "evidence");

export const games = JSON.parse(readFileSync(new URL("../../games.json", import.meta.url), "utf8"));

// tests/evidence/46-evidence-framework.spec.mjs -> 46-evidence-framework
export function folderFor(specFile) {
  return path.basename(specFile).replace(/\.spec\.m?js$/, "");
}

// Games hosted outside this repo. Local runs answer them with a stand-in page so a check
// never fails because someone else's site is slow; live runs load the real thing.
const externalGames = games.filter(g => /^https?:/.test(g.url));

function standIn(game) {
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="margin:0;display:grid;place-items:center;height:100vh;background:${game.color};font:800 20px system-ui;color:#1d1a2f;text-align:center">
<div><h1 style="margin:0 0 8px">${game.title}</h1><p style="margin:0">Stand-in page: the real game loads from ${new URL(game.url).host} on the live site.</p></div>`;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // The New Game page sends through the live intake Worker (new/intake-config.js). Every
    // spec sees the unconfigured page, the GitHub-form route, unless it routes the config
    // again itself, as 82-intake-page does: the route registered last wins.
    await page.route("**/new/intake-config.js", route => route.fulfill({
      contentType: "text/javascript", body: 'window.GAMEON_INTAKE = { url: "" };' }));
    if (!LIVE) {
      await page.route("**/favicon.ico", route => route.fulfill({ status: 204, body: "" }));
      // The GitHub API (the New Game page's idea line) answers with an empty list, so a
      // rate limit can't fail a check. A spec that needs data routes it again itself:
      // the route registered last wins.
      await page.route("https://api.github.com/**", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
      for (const game of externalGames) {
        await page.route(url => url.href.startsWith(game.url), route =>
          route.fulfill({ status: 200, contentType: "text/html", body: standIn(game) }));
      }
    }
    await use(page);
  },

  // Console errors and uncaught exceptions from the page and its frames.
  browserErrors: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await use(errors);
  },

  // shot("home") saves <name>-<desktop|phone>.jpg in the spec's evidence folder.
  shot: async ({ page }, use, testInfo) => {
    const dir = path.join(EVIDENCE_ROOT, folderFor(testInfo.file));
    await use(async (name, { fullPage = false } = {}) => {
      if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`shot name "${name}": use lowercase letters, digits and dashes`);
      await page.waitForLoadState("load");
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const file = path.join(dir, `${name}-${testInfo.project.name}.jpg`);
      await page.screenshot({ path: file, type: "jpeg", quality: 60, fullPage, animations: "disabled", caret: "hide" });
      // The reporter finds the picture by this name; the attached copy gets a hashed file name.
      await testInfo.attach(path.basename(file), { path: file, contentType: "image/jpeg" });
    });
  },

  // note("7 cards") adds a line under the check in the README.
  note: async ({}, use, testInfo) => {
    await use(text => testInfo.annotations.push({ type: "note", description: `${testInfo.project.name}: ${text}` }));
  }
});

// The phone bar from the build skill (#187): every control a finger can reach is at least
// 48x48 CSS px, 8 px clear of its neighbours and of the screen's edges.
//
//   const { targets, problems } = await touchTargets(page);
//   expect(problems).toEqual([]);
//
// It finds buttons, links, inputs and anything with a pointer cursor that a tap at its
// centre actually reaches. Controls drawn on a canvas aren't in the page, so pass their
// hit boxes (in CSS px from the top-left of the viewport) as `drawn`.
export const FINGER = { min: 48, gap: 8, edge: 8 };

export async function touchTargets(page, { drawn = [], ...bar } = {}) {
  const { min, gap, edge } = { ...FINGER, ...bar };
  const found = await page.evaluate(() => {
    const sel = 'button,a[href],input:not([type=hidden]),select,textarea,[role=button],[onclick],[tabindex]:not([tabindex="-1"]),summary,label';
    const els = new Set(document.querySelectorAll(sel));
    for (const el of document.querySelectorAll("body *")) if (getComputedStyle(el).cursor === "pointer") els.add(el);
    const out = [];
    for (const el of els) {
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
      let up = el.parentElement, nested = false;
      while (up) { if (els.has(up)) { nested = true; break; } up = up.parentElement; }
      if (nested) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (r.width < 1 || r.height < 1 || cs.visibility === "hidden" || +cs.opacity === 0) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || !(el === hit || el.contains(hit))) continue;
      const name = (el.getAttribute("aria-label") || el.innerText || el.value || el.id || el.tagName).trim().replace(/\s+/g, " ").slice(0, 24);
      out.push({ name, x: r.left, y: r.top, w: r.width, h: r.height });
    }
    const scrolls = document.scrollingElement.scrollHeight > innerHeight + 1;
    return { out, vw: innerWidth, vh: innerHeight, scrolls };
  });
  const targets = [...found.out, ...drawn].map(t => ({ ...t, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h) }));
  const problems = [];
  for (const t of targets) {
    if (t.w < min || t.h < min) problems.push(`"${t.name}" is ${t.w}x${t.h} (needs ${min}x${min})`);
    const sides = [t.x, found.vw - (t.x + t.w)];
    if (!found.scrolls) sides.push(t.y, found.vh - (t.y + t.h));
    if (Math.min(...sides) < edge) problems.push(`"${t.name}" is ${Math.max(0, Math.min(...sides))} px from the edge (needs ${edge})`);
  }
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
    const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
    if (Math.max(dx, dy) < gap) problems.push(`"${a.name}" and "${b.name}" are ${Math.max(dx, dy)} px apart (need ${gap})`);
  }
  return { targets, problems };
}
