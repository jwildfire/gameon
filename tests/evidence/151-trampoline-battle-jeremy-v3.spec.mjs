// Evidence for game idea #151: Trampoline Battle jeremy.v3, "Bring in the latest from
// jwildfire/trampoline-battle". An import: games/trampoline-battle/jeremy.v3/ is the repo at
// f0316e5 (15 commits after jeremy.v2's bdc9ea6), the creator's update and the new default.
// Spec: docs/game-versions.md ("Games that also live in their own repo") and the build skill's U6.
// Run: npm run evidence -- tests/evidence/151-trampoline-battle-jeremy-v3
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, games } from "./evidence.mjs";

const SLUG = "trampoline-battle";
const V1 = `games/${SLUG}/jeremy.v1/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const V3 = `games/${SLUG}/jeremy.v3/`;
const SOURCE = { repo: "jwildfire/trampoline-battle", commit: "f0316e558238b5cee2a068c27b3ac1b09fbb64b6" };
// `git ls-tree -r f0316e5` in jwildfire/trampoline-battle, minus what the copy leaves out
// (.github/workflows/pages.yml, .gitignore, .claude/launch.json).
const BLOBS = {
  "README.md": "2a02622f882ff916898643afb51502cd501eb646",
  "design/climb-ideas.html": "92c0e3f1fe57997b9d66e5b61108feca11846318",
  "design/level-ideas.html": "9b3eeaa1be80fa29a254c9d24f84ee8788a87fff",
  "design/race-ideas.html": "ab2176cecd9fb402c1921be3c9be30dff0662311",
  "index.html": "95eab44d4138044d80b18a688035cc58ad314116",
  "levels/ENGINES.md": "d1a882dec5d94cee75621f3998bcd182df5d7cf9",
  "levels/HOW-TO-ADD-LEVELS.md": "cfe833325008f2417e3d8e5d153f847a705c1e90"
};
const README_BYTES = 3308; // the repo's README.md; jeremy.v3 appends its version section after it
const FONTS = ["fonts.googleapis.com", "fonts.gstatic.com"]; // jeremy.v1 and jeremy.v2 load Google Fonts too
// Save keys, all inherited: jeremy.v1 uses tb2-settings; jeremy.v2 and jeremy.v3 use tb3-settings and tb4-best.
const KEYS = ["tb2-settings", "tb3-settings", "tb4-best"];

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const blob = buf => createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
const walk = dir => readdirSync(dir).flatMap(f => statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)).map(x => `${f}/${x}`) : [f]);
// The game keeps its state inside a closure, so the checks read what the page shows.
const hud = page => page.evaluate(() => ({ wave: document.querySelector("#waveTxt").textContent, level: document.querySelector("#lvlName").textContent,
  timer: parseFloat(document.querySelector("#timerFill").style.width || "100"), skin: document.body.dataset.skin }));
const INTRO = 3500; // party modes count down for 2.8 s, then GO!
const levels = page => page.locator("#levels .lvl:not(.shufTile)");

function outsideHosts(page) {
  const seen = new Set(), home = new URL(test.info().project.use.baseURL).host;
  page.on("request", req => {
    const u = new URL(req.url());
    if (["http:", "https:"].includes(u.protocol) && u.host !== home) seen.add(u.host);
  });
  return seen;
}
const seed = (page, values) => page.addInitScript(values => {
  if (sessionStorage.getItem("seeded")) return;
  for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  sessionStorage.setItem("seeded", "1");
}, values);
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));

async function title(page, url = V3) {
  await page.goto(url);
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#ttl")).toHaveText(/(Trampoline|Bathtub|Tower|Whatever)\s+Battle/);
}

test.describe.configure({ timeout: 180_000 });

test("jeremy.v3 is the repo at f0316e5: same files, byte for byte, except what the copy leaves out", async ({ note }) => {
  const dir = join(ROOT, V3);
  const files = walk(dir).sort();
  expect(files).toEqual([...Object.keys(BLOBS), "gameon.json"].sort());
  for (const f of Object.keys(BLOBS).filter(f => f !== "README.md")) expect(blob(readFileSync(join(dir, f))), f).toBe(BLOBS[f]);
  const readme = readFileSync(join(dir, "README.md"));
  expect(blob(readme.subarray(0, README_BYTES)), "README.md starts with the repo's README").toBe(BLOBS["README.md"]);
  expect(readme.subarray(README_BYTES).toString()).toContain("## jeremy.v3: 100 levels, racing, climbing and Pure Chaos");
  const meta = JSON.parse(readFileSync(join(dir, "gameon.json"), "utf8"));
  expect(meta).toMatchObject({ name: SLUG, version: "jeremy.v3", from: "jeremy.v2" });
  expect(meta.updates.at(-1)).toMatchObject({ version: "jeremy.v3", from: "jeremy.v2", idea_issue: 151 });
  note("6 files match the repo's git blobs at f0316e5; README.md is the repo's plus the jeremy.v3 section; gameon.json added; .github/, .gitignore and .claude/launch.json left out; no path fixes needed");
});

test("jeremy.v3 opens to its title screen and starts, with no new outside requests", async ({ page, shot, note, browserErrors }) => {
  const outside = outsideHosts(page);
  await title(page);
  await expect(page.locator("#startBtn")).toHaveText("Just Bounce");
  await shot("title");
  await page.locator("#startBtn").click();
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#waveTxt")).toContainText("Party Levels · round 1");
  await page.waitForTimeout(INTRO + 1500);
  const h = await hud(page);
  expect(h.timer, "the round's timer is running").toBeLessThan(100);
  await shot("party-play");
  const extra = [...outside].filter(h => !FONTS.includes(h));
  expect(extra, "outside requests jeremy.v2 doesn't make").toEqual([]);
  expect(browserErrors).toEqual([]);
  note(`Just Bounce: ${h.wave} (${h.level}), timer at ${h.timer}%; outside hosts: ${[...outside].join(", ") || "none"} (Google Fonts, as jeremy.v2)`);
});

test("what's new: the engine picker, Pure Chaos, 100 trampoline levels on three shelves, and 20 racing and 20 climbing levels", async ({ page, note, browserErrors }) => {
  await title(page);
  await expect(page.locator("#engSeg button")).toHaveText(["🤸Bounce", "🏎️Race", "🧗Climb", "🤷Whatever"]);
  await expect(page.locator("#gameSeg button")).toHaveText(["Battle", "Party Levels", "Survival", "Pile-Up", "Endless", "Pure Chaos"]);
  await page.locator("#moreBtn").click();
  await expect(page.locator("#moreStuff")).toBeVisible();
  const shelves = [];
  for (const t of ["0", "1", "2"]) {
    await page.locator(`#tierSeg button[data-v="${t}"]`).click();
    shelves.push(await levels(page).count());
  }
  expect(shelves, "Top 20, 21–50, 51–100").toEqual([20, 30, 50]);
  const counts = {};
  for (const eng of ["race", "climb"]) {
    await page.locator(`#engSeg button[data-v="${eng}"]`).click();
    await expect(page.locator("#tierSeg")).toBeHidden();
    counts[eng] = await levels(page).count();
  }
  expect(counts).toEqual({ race: 20, climb: 20 });
  await expect(page.locator("#ttl")).toHaveText(/Tower\s+Battle/);
  await expect(page.locator('#gameSeg button[data-v="battle"]')).toBeHidden(); // Battle is trampolines only
  expect(browserErrors).toEqual([]);
  note(`engines: Bounce, Race, Climb, Whatever; modes add Pure Chaos; trampoline shelves ${shelves.join(" + ")} = ${shelves.reduce((a, b) => a + b)}; racing ${counts.race}, climbing ${counts.climb}`);
});

test("what's new plays: a race, Pure Chaos on the climbing tower, and the level buttons pause and play", async ({ page, shot, note, browserErrors }) => {
  await title(page);
  await page.locator('#engSeg button[data-v="race"]').click();
  await expect(page.locator("#startBtn")).toHaveText("Just Race");
  await page.locator("#startBtn").click();
  await expect(page.locator("#waveTxt")).toContainText("Party Levels · round 1");
  await page.waitForTimeout(INTRO + 2000);
  const race = await hud(page);
  await expect(page.locator("#lvlCtl")).toBeVisible();
  await page.locator("#playBtn").click();
  await expect(page.locator("#playBtn")).toHaveAttribute("aria-label", "Play");
  await shot("race-paused");
  await page.locator("#playBtn").click();
  await expect(page.locator("#playBtn")).toHaveAttribute("aria-label", "Pause");
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  await page.locator('#engSeg button[data-v="climb"]').click();
  await page.locator('#gameSeg button[data-v="chaos"]').click();
  await expect(page.locator("#startBtn")).toHaveText("Just Climb");
  await page.locator("#startBtn").click();
  await expect(page.locator("#waveTxt")).toContainText("Pure Chaos · round 1");
  await page.waitForTimeout(INTRO + 1500);
  const chaos = await hud(page);
  await shot("climb-chaos");
  expect(browserErrors).toEqual([]);
  note(`race: ${race.level} (${race.wave}), paused with the play/pause button and played again; climb + Pure Chaos: ${chaos.level} (${chaos.wave})`);
});

test("what stays still works: Battle drops a fighter and fights, and Esc goes back to the menu", async ({ page, shot, note, browserErrors }) => {
  await title(page);
  await page.locator('#gameSeg button[data-v="battle"]').click();
  await page.locator("#startBtn").click();
  await expect(page.locator("#waveTxt")).toHaveText("Wave 1: drop in!", { timeout: 8000 });
  await page.keyboard.press("KeyS"); // Red drops
  await page.keyboard.press("ArrowDown"); // Blue drops
  await expect(page.locator("#waveTxt")).toHaveText("Wave 1: fight!", { timeout: 12000 });
  await page.waitForTimeout(1500);
  await shot("battle");
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#waveTxt")).toHaveText("Pick a level");
  expect(browserErrors).toEqual([]);
  note("Battle: wave 1 aim → both teams drop → fight; Esc opens the menu (pause / start over)");
});

test("saves: what jeremy.v2 saved loads in jeremy.v3, with its settings and best times", async ({ page, note, browserErrors }) => {
  // tb3-settings and tb4-best as jeremy.v2 writes them (its defaults plus choices made in its menu).
  const v2Save = JSON.stringify({ names: ["Zoom", "Robo"], mode: "cpu", target: 20, level: 3, game: "survival", mini: 4, rounds: 2, pileRounds: 7, skin: "crayon", items: "sticker" });
  const v1Save = JSON.stringify({ names: ["Rocket", "Bean"], mode: "cpu", target: 3, level: 0 });
  await seed(page, { "tb2-settings": v1Save, "tb3-settings": v2Save, "tb4-best": JSON.stringify({ survival: 42.5, endless: 7 }) });
  await title(page);
  await expect(page.locator("#modeCpu")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('#gameSeg button[data-v="survival"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#levels .modecard")).toContainText("Best solo time: 0:42");
  expect((await hud(page)).skin).toBe("crayon");
  await page.locator("#moreBtn").click();
  await expect(page.locator("#name1")).toHaveValue("Zoom");
  await expect(page.locator('#skinSeg button[data-v="crayon"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('#toSeg button[data-i="2"]')).toHaveAttribute("aria-pressed", "true"); // 2 rounds to win
  const stored = await storage(page);
  expect(Object.keys(stored).filter(k => !KEYS.includes(k) && !k.startsWith(`gameon.${SLUG}.`)), "unexpected keys").toEqual([]);
  expect(stored["tb2-settings"], "jeremy.v1's save is left alone").toBe(v1Save);
  expect(JSON.parse(stored["tb3-settings"])).toMatchObject({ ...JSON.parse(v2Save), more: true, engine: "bounce" });
  expect(browserErrors).toEqual([]);
  note("jeremy.v2's tb3-settings (Zoom, vs Computer, Survival, Crayon, 2 rounds) and tb4-best (survival 42.5 s) show in jeremy.v3; saving keeps every jeremy.v2 value and adds more and engine; tb2-settings untouched; no new keys");
});

test("known save problem, inherited from the repo: once jeremy.v3 saves a Shuffle setting, jeremy.v2 can't start; jeremy.v1 is unaffected", async ({ page, note, browserErrors }) => {
  await title(page);
  await page.locator("#moreBtn").click(); // any menu change saves jeremy.v3's defaults (Shuffle skin, items and level)
  const saved = JSON.parse((await storage(page))["tb3-settings"]);
  expect(saved).toMatchObject({ skin: "random", items: "random", mini: "random", v4: true });
  expect(browserErrors).toEqual([]);
  await title(page, V2);
  await page.locator("#startBtn").click();
  await page.waitForTimeout(1500);
  await expect(page.locator("#waveTxt"), "jeremy.v2 stays on its menu").toHaveText("Pick a level");
  expect(browserErrors.length, "jeremy.v2 throws on jeremy.v3's settings").toBeGreaterThan(0);
  const v2Errors = [...new Set(browserErrors)];
  browserErrors.length = 0;
  await title(page, V1);
  await page.locator("#startBtn").click();
  await expect(page.locator("#menu")).toBeHidden();
  expect(browserErrors, "jeremy.v1 reads tb2-settings, which jeremy.v3 never writes").toEqual([]);
  note(`jeremy.v3 saved ${JSON.stringify(saved)}; jeremy.v2 then logs ${JSON.stringify(v2Errors)} and won't start (its code has no "random" skin, level or Pure Chaos); jeremy.v1 starts. Left as copied: see the PR's Notes`);
});

test("jeremy.v1 and jeremy.v2 still play from their folders", async ({ page, shot, note, browserErrors }) => {
  await title(page, V2);
  await page.locator("#startBtn").click();
  await expect(page.locator("#waveTxt")).toContainText("Party Levels · round 1");
  await page.waitForTimeout(INTRO + 1000);
  expect((await hud(page)).timer, "jeremy.v2's round timer is running").toBeLessThan(100);
  await shot("v2-play");
  await title(page, V1);
  await page.locator("#startBtn").click();
  await expect(page.locator("#menu")).toBeHidden();
  await page.waitForTimeout(1000);
  await shot("v1-play");
  expect(browserErrors).toEqual([]);
  note(`${V2} and ${V1}: title screen, then started, no console errors`);
});

test("games.json makes jeremy.v3 the default, records its source, and still offers jeremy.v1 and jeremy.v2", async ({ note }) => {
  const g = games.find(x => x.slug === SLUG);
  expect(g).toMatchObject({ creator: "jeremy", default: "jeremy.v3", url: V3, repo: "https://github.com/jwildfire/trampoline-battle" });
  const v = id => g.versions.find(x => x.id === id);
  expect(g.versions.map(x => x.id)).toEqual(["jeremy.v1", "jeremy.v2", "jeremy.v3"]);
  expect(v("jeremy.v1")).toMatchObject({ url: V1, source: { repo: SOURCE.repo, commit: "669e7fec4eb86f0e599376a5aa5ccd832d0dae83" } });
  expect(v("jeremy.v2")).toMatchObject({ url: V2, from: "jeremy.v1", idea: 139, source: { repo: SOURCE.repo, commit: "bdc9ea670b824b66623414bdbb59872de7bb437a" } });
  expect(v("jeremy.v3")).toMatchObject({ url: V3, from: "jeremy.v2", idea: 151, note: "100 levels, racing, climbing and Pure Chaos", source: SOURCE });
  note(`default ${g.default}; jeremy.v3 source ${SOURCE.repo}@${SOURCE.commit.slice(0, 7)}; jeremy.v1 and jeremy.v2 still at their urls`);
});

test("the arcade plays jeremy.v3 by default, and the version picker offers jeremy.v2 and jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await page.locator(`#shelf .cart[href="#${SLUG}"]`).click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("jeremy.v3");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(items.nth(1)).toContainText("jeremy.v2");
  await expect(items.nth(2)).toContainText("jeremy.v1");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v3$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V3);
  const game = page.frameLocator("#frame");
  await expect(game.locator("#ttl")).toBeVisible({ timeout: 15_000 });
  await game.locator("#startBtn").click();
  await expect(game.locator("#menu")).toBeHidden();
  await page.waitForTimeout(800);
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v2`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  expect(browserErrors).toEqual([]);
  note("card → picker (jeremy.v3 Latest, jeremy.v2, jeremy.v1) → jeremy.v3 plays in the frame; #trampoline-battle@jeremy.v2 and @jeremy.v1 open those versions");
});
