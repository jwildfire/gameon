// Evidence for game idea #139: Trampoline Battle jeremy.v2, "Bring in the latest from
// jwildfire/trampoline-battle". An import: games/trampoline-battle/jeremy.v2/ is the repo at
// bdc9ea6 (5 commits after jeremy.v1's 669e7fe), the creator's update and the new default.
// Spec: docs/game-versions.md ("Games that also live in their own repo") and the build skill's U6.
// Run: npm run evidence -- tests/evidence/139-trampoline-battle-jeremy-v2
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, games } from "./evidence.mjs";

const SLUG = "trampoline-battle";
const V1 = `games/${SLUG}/jeremy.v1/`;
const V2 = `games/${SLUG}/jeremy.v2/`;
const SOURCE = { repo: "jwildfire/trampoline-battle", commit: "bdc9ea670b824b66623414bdbb59872de7bb437a" };
// `git ls-tree -r bdc9ea6` in jwildfire/trampoline-battle, minus .claude/launch.json (left out).
const BLOBS = {
  "README.md": "2a02622f882ff916898643afb51502cd501eb646",
  "design/level-ideas.html": "9b3eeaa1be80fa29a254c9d24f84ee8788a87fff",
  "index.html": "db70eedc2cf984dede7749a30efc8b66bf7f5014"
};
const README_BYTES = 3308; // the repo's README.md; jeremy.v2 appends its version section after it
const FONTS = ["fonts.googleapis.com", "fonts.gstatic.com"]; // jeremy.v1 loads Google Fonts too
// Save keys: jeremy.v1 uses tb2-settings; the repo's newer code (inherited) uses tb3-settings and tb4-best.
const KEYS = ["tb2-settings", "tb3-settings", "tb4-best"];

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const blob = buf => createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
const walk = dir => readdirSync(dir).flatMap(f => statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)).map(x => `${f}/${x}`) : [f]);
// The game keeps its state inside a closure, so the checks read what the page shows: the HUD's
// wave line ("Pick a level", "Survival · round 1", "Wave 1: drop in!"), its timer bar and the skin.
const hud = page => page.evaluate(() => ({ wave: document.querySelector("#waveTxt").textContent, level: document.querySelector("#lvlName").textContent,
  timer: parseFloat(document.querySelector("#timerFill").style.width || "100"), skin: document.body.dataset.skin }));
const INTRO = 3500; // party modes count down for 2.8 s, then GO!

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

async function title(page, url = V2) {
  await page.goto(url);
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#ttl")).toHaveText(/Trampoline\s+Battle/);
}

test.describe.configure({ timeout: 60_000 });

test("jeremy.v2 is the repo at bdc9ea6: same files, byte for byte, except what the copy leaves out", async ({ note }) => {
  const dir = join(ROOT, V2);
  const files = walk(dir).sort();
  expect(files).toEqual(["README.md", "design/level-ideas.html", "gameon.json", "index.html"]);
  for (const f of ["index.html", "design/level-ideas.html"]) expect(blob(readFileSync(join(dir, f))), f).toBe(BLOBS[f]);
  const readme = readFileSync(join(dir, "README.md"));
  expect(blob(readme.subarray(0, README_BYTES)), "README.md starts with the repo's README").toBe(BLOBS["README.md"]);
  expect(readme.subarray(README_BYTES).toString()).toContain("## jeremy.v2: New modes, party levels, costumes, weapons and skins");
  const meta = JSON.parse(readFileSync(join(dir, "gameon.json"), "utf8"));
  expect(meta).toMatchObject({ name: SLUG, version: "jeremy.v2", from: "jeremy.v1" });
  expect(meta.updates.at(-1)).toMatchObject({ version: "jeremy.v2", from: "jeremy.v1", idea_issue: 139 });
  note("index.html and design/level-ideas.html match the repo's git blobs at bdc9ea6; README.md is the repo's plus the jeremy.v2 section; gameon.json added; .claude/launch.json left out; no path fixes needed");
});

test("jeremy.v2 opens to its title screen and starts, with no new outside requests", async ({ page, shot, note, browserErrors }) => {
  const outside = outsideHosts(page);
  await title(page);
  await shot("title");
  await page.locator("#startBtn").click();
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#waveTxt")).toContainText("Party Levels · round 1");
  await page.waitForTimeout(INTRO + 1500);
  const h = await hud(page);
  expect(h.timer, "the round's timer is running").toBeLessThan(100);
  await shot("party-play");
  const extra = [...outside].filter(h => !FONTS.includes(h));
  expect(extra, "outside requests jeremy.v1 doesn't make").toEqual([]);
  expect(browserErrors).toEqual([]);
  note(`default game: ${h.wave} (${h.level}), timer at ${h.timer}%; outside hosts: ${[...outside].join(", ") || "none"} (Google Fonts, as jeremy.v1)`);
});

test("what's new works: five modes, Survival starts, the skin switches to 8-Bit Arcade, and the level ideas page opens", async ({ page, shot, note, browserErrors }) => {
  await title(page);
  const modes = page.locator("#gameSeg button");
  await expect(modes).toHaveText(["Battle", "Party Levels", "Survival", "Pile-Up", "Endless"]);
  await page.locator("#skinSeg button[data-v=arcade]").click();
  await expect(page.locator("#skinBtn")).toHaveText("8-Bit Arcade");
  expect((await hud(page)).skin).toBe("arcade");
  await page.locator('#gameSeg button[data-v="survival"]').click();
  await expect(page.locator('#gameSeg button[data-v="survival"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator("#startBtn").click();
  await expect(page.locator("#waveTxt")).toContainText("Survival · round 1");
  await page.waitForTimeout(INTRO + 1500);
  await shot("survival-8bit");
  expect(browserErrors).toEqual([]);
  await page.goto(`${V2}design/level-ideas.html`);
  await expect(page).toHaveTitle("Trampoline Level Ideas");
  note("modes: Battle, Party Levels, Survival, Pile-Up, Endless; Survival live in the 8-Bit Arcade skin; design/level-ideas.html loads");
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

test("saves: a jeremy.v1 save loads without errors and stays as it was, and the repo site's newer saves carry over", async ({ page, note, browserErrors }) => {
  const v1Save = JSON.stringify({ names: ["Rocket", "Bean"], mode: "cpu", target: 3, level: 0 });
  // tb3-settings / tb4-best: what the repo's own site (same origin, jwildfire.github.io) saves at bdc9ea6.
  await seed(page, { "tb2-settings": v1Save, "tb3-settings": JSON.stringify({ names: ["Zoom", "Robo"], mode: "cpu", game: "battle", target: 20, skin: "crayon" }) });
  await title(page);
  await expect(page.locator("#name1")).toHaveValue("Zoom");
  await expect(page.locator("#modeCpu")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('#gameSeg button[data-v="battle"]')).toHaveAttribute("aria-pressed", "true");
  expect((await hud(page)).skin).toBe("crayon");
  await page.locator('#toSeg button[data-i="0"]').click();
  await page.waitForTimeout(300);
  let stored = await storage(page);
  expect(Object.keys(stored).filter(k => !KEYS.includes(k) && !k.startsWith(`gameon.${SLUG}.`)), "unexpected keys").toEqual([]);
  expect(stored["tb2-settings"], "jeremy.v2 leaves jeremy.v1's save alone").toBe(v1Save);
  expect(JSON.parse(stored["tb3-settings"]).target).toBe(5);
  expect(browserErrors).toEqual([]);
  // jeremy.v1 still reads its own save after jeremy.v2 has run.
  await title(page, V1);
  await expect(page.locator("#name1")).toHaveValue("Rocket");
  await expect(page.locator("#modeCpu")).toHaveAttribute("aria-pressed", "true");
  stored = await storage(page);
  expect(Object.keys(stored).sort()).toEqual(["tb2-settings", "tb3-settings"]);
  expect(browserErrors).toEqual([]);
  note("tb3-settings (Zoom, vs Computer, Battle, Crayon) loads in jeremy.v2 and saves target 5; tb2-settings untouched, and jeremy.v1 still shows Rocket, vs Computer. jeremy.v2 doesn't read tb2-settings (the repo's code), so a jeremy.v1 player starts jeremy.v2 with default settings");
});

test("jeremy.v1 still plays from its folder", async ({ page, shot, note, browserErrors }) => {
  await title(page, V1);
  await page.locator("#startBtn").click();
  await expect(page.locator("#menu")).toBeHidden();
  await page.waitForTimeout(1000);
  await shot("v1-play");
  expect(browserErrors).toEqual([]);
  note(`${V1} title screen, then started, no console errors`);
});

test("games.json makes jeremy.v2 the default, records its source, and still offers jeremy.v1", async ({ note }) => {
  const g = games.find(x => x.slug === SLUG);
  expect(g).toMatchObject({ creator: "jeremy", default: "jeremy.v2", url: V2, repo: "https://github.com/jwildfire/trampoline-battle" });
  const v1 = g.versions.find(v => v.id === "jeremy.v1"), v2 = g.versions.find(v => v.id === "jeremy.v2");
  expect(v1).toMatchObject({ url: V1, source: { repo: SOURCE.repo, commit: "669e7fec4eb86f0e599376a5aa5ccd832d0dae83" } });
  expect(v2).toMatchObject({ url: V2, from: "jeremy.v1", idea: 139, note: "New modes, party levels, costumes, weapons and skins", source: SOURCE });
  note(`default ${g.default}; jeremy.v2 source ${SOURCE.repo}@${SOURCE.commit.slice(0, 7)}; jeremy.v1 still at ${v1.url}`);
});

test("the arcade plays jeremy.v2 by default, and the version picker offers jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  await page.locator(`#shelf .cart[href="#${SLUG}"]`).click();
  await expect(page.locator("#chooser")).toBeVisible();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(items.nth(1)).toContainText("jeremy.v1");
  await items.nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${SLUG}@jeremy\\.v2$`));
  await expect(page.locator("#frame")).toHaveAttribute("src", V2);
  const game = page.frameLocator("#frame");
  await expect(game.locator("#ttl")).toBeVisible({ timeout: 15_000 });
  await game.locator("#startBtn").click();
  await expect(game.locator("#menu")).toBeHidden();
  await page.waitForTimeout(800);
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1);
  expect(browserErrors).toEqual([]);
  note("card → picker (jeremy.v2 Latest, jeremy.v1) → jeremy.v2 plays in the frame; #trampoline-battle@jeremy.v1 opens jeremy.v1");
});
