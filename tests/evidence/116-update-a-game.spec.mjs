// Evidence for #116: the New Game page can ask for a change to a game already in the arcade.
// Spec: docs/game-versions.md ("Asking for an update").
// Run: npm run evidence -- 116-update-a-game
import { test, expect, games } from "./evidence.mjs";

const REPO_NEW = "https://github.com/jwildfire/gameon/issues/new";
const food = games.find(g => g.slug === "fancy-food-fight");
const maze = games.find(g => g.slug === "mazeathon");
// An entry without `versions` has one version, {creator}.v1; creator defaults to jeremy until
// every entry records one.
const firstVersion = g => `${g.creator || "jeremy"}.v1`;

// games.json as it will look once Fancy Food Fight has an update and a fork (the example in
// docs/game-versions.md), so the version picker has more than one line to show.
const withVersions = games.map(g => g.slug !== food.slug ? g : {
  ...g,
  url: "games/fancy-food-fight/jeremy.v2/",
  creator: "jeremy",
  default: "jeremy.v2",
  versions: [
    { id: "jeremy.v1", url: "games/fancy-food-fight/", made: "2026-10-23", note: "The first version" },
    { id: "jeremy.v2", url: "games/fancy-food-fight/jeremy.v2/", made: "2026-10-24", note: "The guests fight back harder", from: "jeremy.v1", idea: 118 },
    { id: "notclay.v1", url: "games/fancy-food-fight/notclay.v1/", made: "2026-10-24", note: "Everything is hot sauce", from: "jeremy.v2", idea: 121 }
  ]
});
const serveVersions = page => page.route("**/games.json", route =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(withVersions) }));

// Record where Send would go instead of opening GitHub.
const catchOpen = page => page.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
const ready = page => expect(page.locator("#making")).toHaveAttribute("data-ready", "true");
const noSidewaysScroll = async page => {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, "page is wider than the screen").toBeLessThanOrEqual(width);
  return width;
};
async function sendIdea(page, text, nick) {
  await page.locator("#tab-type").click();
  await page.locator("#idea").fill(text);
  await page.locator("#maker").fill(nick);
  await page.locator("#send").click();
  await expect(page.locator("#handoff")).toBeVisible();
  return new URL(await page.evaluate(() => window.__opened[0]));
}

test("A new game is picked by default and Send builds the same address as before", async ({ page, shot, note, browserErrors }) => {
  await catchOpen(page);
  await page.goto("new/");
  await ready(page);
  const making = page.locator("#making");
  await expect(making).toHaveValue("");
  await expect(making.locator("option:checked")).toHaveText("A new game");
  await expect(making.locator("option")).toHaveCount(games.length + 1);
  for (const g of games) await expect(making.locator(`option[value="${g.slug}"]`)).toHaveText(g.title);
  await expect(page.locator("#version-box")).toBeHidden();
  await expect(page.getByRole("heading", { name: "What's your game?" })).toBeVisible();
  await shot("new-game");

  const idea = "A game where a penguin delivers pizza across a frozen lake and dodges seals";
  const opened = await sendIdea(page, idea, "Tester");
  expect(opened.origin + opened.pathname).toBe(REPO_NEW);
  expect(Object.fromEntries(opened.searchParams)).toEqual({
    template: "game-idea.yml", title: "Game idea from Tester", idea, maker: "Tester", told_by: "typing",
    body: `### The idea, word for word\n\n${idea}\n\n### Made by\n\nTester\n\n### Told by\n\ntyping\n`,
    labels: "game-idea,status: submitted"
  });
  note(`${games.length} games listed after "A new game"; a new game's address has no game or version and the same title, body and labels as before`);
  expect(browserErrors).toEqual([]);
});

test("picking a game shows its versions", async ({ page, shot, note, browserErrors }) => {
  // Today's games.json: one version each.
  await page.goto("new/");
  await ready(page);
  await page.locator("#making").selectOption(maze.slug);
  await expect(page.locator("#version-box")).toBeVisible();
  await expect(page.locator("#version option")).toHaveCount(1);
  await expect(page.locator("#version")).toHaveValue(firstVersion(maze));
  await expect(page.getByRole("heading", { name: `What should change in ${maze.title}?` })).toBeVisible();
  await expect(page.locator("#idea-label")).toHaveText(`What should change in ${maze.title}?`);

  // Back to a new game puts everything back.
  await page.locator("#making").selectOption("");
  await expect(page.locator("#version-box")).toBeHidden();
  await expect(page.getByRole("heading", { name: "What's your game?" })).toBeVisible();

  // A game with an update and a fork lists all three, the default picked.
  await serveVersions(page);
  await page.reload();
  await ready(page);
  await page.locator("#making").selectOption(food.slug);
  await expect(page.locator("#version option")).toHaveCount(3);
  await expect(page.locator("#version")).toHaveValue("jeremy.v2");
  await expect(page.locator("#version option").nth(1)).toContainText("The guests fight back harder");
  await noSidewaysScroll(page);
  note(`${maze.title} has one version (${firstVersion(maze)}); Fancy Food Fight with three versions starts on its default, jeremy.v2`);
  await shot("versions");
  expect(browserErrors).toEqual([]);
});

test("new/?game=fancy-food-fight&version=jeremy.v1 pre-picks that game and version", async ({ page, shot, note, browserErrors }) => {
  await serveVersions(page);
  await page.goto("new/?game=fancy-food-fight&version=jeremy.v1");
  await ready(page);
  await expect(page.locator("#making")).toHaveValue(food.slug);
  await expect(page.locator("#version")).toHaveValue("jeremy.v1");
  await expect(page.getByRole("heading", { name: `What should change in ${food.title}?` })).toBeVisible();
  await shot("prepicked");

  // No version in the address: the game's default.
  await page.goto("new/?game=fancy-food-fight");
  await ready(page);
  await expect(page.locator("#version")).toHaveValue("jeremy.v2");

  // A slug that isn't in games.json stays a new game.
  await page.goto("new/?game=no-such-game&version=jeremy.v1");
  await ready(page);
  await expect(page.locator("#making")).toHaveValue("");
  await expect(page.locator("#version-box")).toBeHidden();
  await expect(page.getByRole("heading", { name: "What's your game?" })).toBeVisible();
  note("version from the address wins, then the game's default; an unknown game falls back to A new game");
  expect(browserErrors).toEqual([]);
});

test("Send for an update names the game and starting version", async ({ page, shot, note, browserErrors }) => {
  await catchOpen(page);
  await page.goto(`new/?game=${food.slug}&version=${firstVersion(food)}`);
  await ready(page);
  await expect(page.locator("#version")).toHaveValue(firstVersion(food));

  const idea = "Make the guests throw jello back at you when you splat them too much";
  const opened = await sendIdea(page, idea, "Bean");
  expect(opened.origin + opened.pathname).toBe(REPO_NEW);
  const version = firstVersion(food);
  expect(Object.fromEntries(opened.searchParams)).toEqual({
    template: "game-idea.yml",
    title: `Update to ${food.title} from Bean`,
    idea, maker: "Bean", told_by: "typing",
    game: food.slug, version,
    body: `### The idea, word for word\n\n${idea}\n\n### Game to update\n\n${food.slug}\n\n### Starting version\n\n${version}\n\n### Made by\n\nBean\n\n### Told by\n\ntyping\n`,
    labels: "game-idea,update,status: submitted"
  });
  await expect(page.locator("#issue-link")).toHaveAttribute("href", opened.href);
  expect(opened.href.length).toBeLessThan(8000);
  note(`title "Update to ${food.title} from Bean", game=${food.slug}, version=${version}, labels game-idea,update,status: submitted`);
  await shot("update-sent");
  expect(browserErrors).toEqual([]);
});

test("the idea line shows an update as Update to {Game}", async ({ page, shot, note, browserErrors }) => {
  const now = new Date().toISOString();
  const issue = (number, labels, body) => ({ number, created_at: now, labels: labels.map(name => ({ name })), body });
  const issues = [
    issue(503, ["game-idea", "update", "status: submitted"], `### The idea, word for word\n\nMake the guests throw jello back\n\n### Game to update\n\n${food.slug}\n\n### Starting version\n\njeremy.v1\n\n### Made by\n\nBean\n\n### Told by\n\ntyping\n`),
    issue(502, ["game-idea", "update", "status: submitted"], `### The idea, word for word\n\nAdd a moon level\n\n### Game to update\n\nspace-cats\n\n### Starting version\n\nryan.v1\n\n### Made by\n\nRocket\n\n### Told by\n\ntalking\n`),
    issue(501, ["game-idea", "status: submitted"], `### The idea, word for word\n\nA penguin pizza race\n\n### Made by\n\nTester\n\n### Told by\n\ntyping\n`)
  ];
  await page.route("https://api.github.com/**", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify(route.request().url().includes("/issues/comments") ? [] : issues)
  }));
  await page.goto("new/");
  const titles = page.locator("#ideas .idea .idea-top b");
  await expect(titles).toHaveText([`Update to ${food.title}`, "Update to space-cats", "A new idea"]);
  await expect(page.locator("#ideas .idea").first().locator(".by")).toContainText("Bean");
  await page.locator("#line").scrollIntoViewIfNeeded();
  note(`an update to ${food.slug} reads "Update to ${food.title}"; a slug not in games.json reads as the slug; a new idea is unchanged`);
  await shot("idea-line");
  expect(browserErrors).toEqual([]);
});

test("nothing scrolls sideways in update mode", async ({ page, shot, note, browserErrors }) => {
  await serveVersions(page);
  await page.goto(`new/?game=${food.slug}`);
  await ready(page);
  const width = await noSidewaysScroll(page);
  for (const id of ["#making", "#version", "#idea", "#send"]) {
    const box = await page.locator(id).boundingBox();
    expect(box, `${id} is not on screen`).not.toBeNull();
    expect(box.x, `${id} starts off the left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${id} runs off the right edge`).toBeLessThanOrEqual(width);
  }
  note(`${width}px wide; the pickers, idea box and Send fit`);
  expect(browserErrors).toEqual([]);
});
