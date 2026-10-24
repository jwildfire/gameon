// Evidence for #124: the six games that also live in their own repos are frozen as jeremy.v1
// inside GameOn, at games/{slug}/jeremy.v1/, copied from each repo's default branch. Each card
// plays its frozen copy in the arcade, saves carry over (same site, same keys), and every
// version in games.json is served from this repo. Spec: docs/game-versions.md.
// Run: npm run evidence -- tests/evidence/124-freeze-repo-games
import { test, expect, games } from "./evidence.mjs";

const REPO = "https://github.com/jwildfire/gameon";
const FONTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

// Per game: the repo it was copied from, its start screen, a first tap on it, the save keys the
// original's code uses (recorded from the live originals on jwildfire.github.io, which write
// exactly these after the same short play), and outside hosts the original already loads.
const FROZEN = [
  {
    slug: "trampoline-battle", repo: "trampoline-battle",
    startScreen: g => g.locator("#menu #startBtn"),
    start: async g => { await g.locator("#startBtn").click(); await expect(g.locator("#menu")).toBeHidden(); },
    keys: ["tb2-settings"],
    seed: { "tb2-settings": JSON.stringify({ names: ["Rocket", "Bean"], mode: "cpu", target: 3, level: 0 }) },
    seen: async g => {
      await expect(g.locator("#name1")).toHaveValue("Rocket");
      await expect(g.locator("#modeCpu")).toHaveAttribute("aria-pressed", "true");
      return "names Rocket and Bean, vs Computer";
    },
    write: async g => { await g.locator("#to10").click(); },
    written: v => JSON.parse(v["tb2-settings"]).target === 10
  },
  {
    slug: "princess-lady-drive", repo: "princess-lady-drive",
    startScreen: g => g.locator("#start #playBtn"),
    start: async g => { await g.locator("#playBtn").click(); await expect(g.locator("#start")).toBeHidden(); },
    keys: ["princess-lady-drive:v2"],
    seed: { "princess-lady-drive:v2": JSON.stringify({ mode: "drive", muted: true }) },
    seen: async g => { await expect(g.locator("#soundBtn")).toHaveAttribute("aria-label", "Sound off"); return "sound off"; },
    write: async g => { await g.locator("#playBtn").click(); await g.locator("#soundBtn").click(); },
    written: v => JSON.parse(v["princess-lady-drive:v2"]).muted === false
  },
  {
    slug: "stretcher-bearer", repo: "stretcher-bearer",
    startScreen: g => g.getByRole("button", { name: /report for duty/i }),
    start: async g => { await g.getByRole("button", { name: /report for duty/i }).click(); await expect(g.getByRole("button", { name: /report for duty/i })).toBeHidden(); },
    keys: ["sb-best"],
    seed: { "sb-best": JSON.stringify({ score: 4321, day: 7 }) },
    seen: async g => { await expect(g.locator(".best")).toContainText("Best so far: 4321 points, reached day 7"); return "best 4321, day 7"; },
    // sb-best is only written when a game ends; the short play writes nothing new.
    write: async g => { await g.getByRole("button", { name: /report for duty/i }).click(); },
    written: v => JSON.parse(v["sb-best"]).score === 4321
  },
  {
    slug: "angry-dudes", repo: "angry-dudes",
    startScreen: g => g.locator("#menu #menu-title"),
    start: async g => { await g.locator("#levels button, #levels .level").first().click(); await expect(g.locator("#intro")).toBeVisible(); },
    keys: ["angrydudes.pack", "angrydudes.sound", "angrydudes.best.*", "angrydudes.losses.*", "angrydudes.campaign.*"],
    seed: { "angrydudes.pack": JSON.stringify("vikings") },
    seen: async g => { await expect(g.locator('#packs .pack[aria-pressed="true"]')).toContainText("Vikings"); return "Vikings pack picked"; },
    write: async g => { await g.locator("#packs .pack", { hasText: "Castle Siege" }).click(); },
    written: v => JSON.parse(v["angrydudes.pack"]) === "castle",
    outside: ["cdnjs.cloudflare.com"] // matter.js, loaded by the original too
  },
  {
    slug: "magic-friends", repo: "magic-friends",
    startScreen: g => g.locator("#title #play"),
    start: async g => { await g.locator("#play").click(); await expect(g.locator("#title")).toBeHidden(); },
    keys: ["mfuwg2", "mfuwg", "mfuwg-muted"],
    seed: { "mfuwg-muted": "1" },
    seen: async g => { await expect(g.locator("#btnSound")).toHaveAttribute("aria-pressed", "false"); return "sound off"; },
    write: async g => { await g.locator("#play").click(); await g.locator("#btnSound").click(); },
    written: v => v["mfuwg-muted"] === "0"
  },
  {
    slug: "timedout", repo: "timedout",
    startScreen: g => g.locator("#screen-start .title"),
    start: null, // starting a round pulls events from Wikipedia live; the start screen is the check
    keys: ["dadMode"],
    seed: { dadMode: "true" },
    seen: async g => { await expect(g.locator("body")).toHaveClass(/dad-mode/); await expect(g.locator("#dad-mode-toggle")).toBeChecked(); return "Dad Mode on"; },
    write: async g => { await g.locator(".dad-toggle-label").click(); },
    written: v => v.dadMode === "false",
    outside: ["en.wikipedia.org"]
  }
];

const entry = slug => games.find(g => g.slug === slug);
const v1Url = slug => `games/${slug}/jeremy.v1/`;
const keyAllowed = (keys, k) => keys.some(p => p.endsWith(".*") ? k.startsWith(p.slice(0, -1)) : k === p);

function outsideHosts(page) {
  const seen = new Set(), home = new URL(test.info().project.use.baseURL).host;
  page.on("request", req => {
    const u = new URL(req.url());
    if (["http:", "https:"].includes(u.protocol) && u.host !== home) seen.add(u.host);
  });
  return seen;
}

for (const f of FROZEN) {
  const g = entry(f.slug);

  test(`${g.title}: its card plays the frozen jeremy.v1 in the arcade, from its start screen`, async ({ page, shot, note, browserErrors }) => {
    const outside = outsideHosts(page);
    await page.goto("./");
    await page.locator(`#shelf .cart[href="#${f.slug}"]`).click();
    if (g.versions.length > 1) {
      await expect(page.locator("#chooser")).toBeVisible();
      await page.locator('#ver-list .ver-item[data-version="jeremy.v1"]').click();
    }
    await expect(page.locator("#frame")).toHaveAttribute("src", v1Url(f.slug));
    await expect(page.locator("#bar-title")).toHaveText(g.title);
    await expect(page.locator("#gh-btn")).toHaveAttribute("href", `${REPO}/tree/main/games/${f.slug}/jeremy.v1`);
    const game = page.frameLocator("#frame");
    await expect(f.startScreen(game)).toBeVisible({ timeout: 15_000 });
    await shot(f.slug);
    if (f.start) await f.start(game);
    await page.waitForTimeout(500);
    const allowed = [...FONTS, ...(f.outside || [])];
    const extra = [...outside].filter(h => !allowed.includes(h));
    expect(extra, "outside requests the original doesn't make").toEqual([]);
    expect(browserErrors).toEqual([]);
    note(`frame: ${v1Url(f.slug)}; start screen shown${f.start ? ", then started" : ""}; outside: ${[...outside].join(", ") || "none"}; no console errors`);
  });

  test(`${g.title}: saves from the original load, and it saves under the same keys`, async ({ page, note, browserErrors }) => {
    await page.addInitScript(seed => {
      if (sessionStorage.getItem("seeded")) return;
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
      sessionStorage.setItem("seeded", "1");
    }, f.seed);
    await page.goto(v1Url(f.slug));
    const shown = await f.seen(page);
    await f.write(page);
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
    const keys = Object.keys(stored).sort();
    expect(keys.filter(k => !keyAllowed(f.keys, k)), "keys the original doesn't use").toEqual([]);
    expect(f.written(stored), "the game read and rewrote the original's save").toBe(true);
    expect(browserErrors).toEqual([]);
    note(`seeded ${Object.keys(f.seed).join(", ")} → ${shown}; keys after a short play: ${keys.join(", ")}`);
  });
}

test("Princess Lady Drive still offers jeremy.v2 (the default) and jeremy.v1", async ({ page, shot, note, browserErrors }) => {
  const g = entry("princess-lady-drive");
  expect(g.default).toBe("jeremy.v2");
  expect(g.url).toBe("games/princess-lady-drive/jeremy.v2/");
  await page.goto("./");
  await page.locator('#shelf .cart[href="#princess-lady-drive"]').click();
  const items = page.locator("#ver-list .ver-item");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("jeremy.v2");
  await expect(items.nth(0)).toContainText("Latest");
  await expect(items.nth(1)).toContainText("jeremy.v1");
  await shot("princess-chooser");
  await items.nth(0).click();
  await expect(page.locator("#frame")).toHaveAttribute("src", "games/princess-lady-drive/jeremy.v2/");
  await page.locator("#ver-select").selectOption("jeremy.v1");
  await expect(page.locator("#frame")).toHaveAttribute("src", v1Url("princess-lady-drive"));
  expect(browserErrors).toEqual([]);
  note("picker: jeremy.v2 (Latest), jeremy.v1; the version dropdown switches the frame to games/princess-lady-drive/jeremy.v1/");
});

test("every version in games.json is served from this repo, and the six record their source", async ({ request, note }) => {
  for (const g of games) {
    const versions = g.versions || [{ id: `${g.creator}.v1`, url: g.url }];
    expect(g.url, `${g.slug} top-level url`).not.toMatch(/^https?:/);
    for (const v of versions) expect(v.url, `${g.slug} ${v.id}`).not.toMatch(/^https?:/);
  }
  for (const f of FROZEN) {
    const g = entry(f.slug);
    const v1 = g.versions.find(v => v.id === "jeremy.v1");
    expect(v1).toMatchObject({ url: v1Url(f.slug), note: "The first version", source: { repo: `jwildfire/${f.repo}` } });
    expect(v1.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(v1.made).toMatch(/^\d{4}-\d\d-\d\d$/);
    expect(g.repo).toBe(`https://github.com/jwildfire/${f.repo}`);
    expect(g.url).toBe(g.versions.find(v => v.id === g.default).url);
    expect((await request.get(v1Url(f.slug))).status()).toBe(200);
  }
  note(FROZEN.map(f => `${f.slug} ← jwildfire/${f.repo}@${entry(f.slug).versions[0].source.commit.slice(0, 7)}`).join("; "));
});
