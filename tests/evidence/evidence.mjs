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
