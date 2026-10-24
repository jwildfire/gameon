// Evidence for game idea #122: Princess Lady Drive jeremy.v2, "More rooms in the castle!".
// The castle's big room becomes the Great Hall, with doors to a Ballroom, the Tower Top,
// a Royal Kitchen and a Toy Room. Spec: docs/game-versions.md and the build skill's U6.
// Run: npm run evidence -- tests/evidence/122-princess-lady-drive-jeremy-v2
import { test, expect, games } from "./evidence.mjs";

const SLUG = "princess-lady-drive";
const V2 = `games/${SLUG}/jeremy.v2/`;
const V1_URL = "games/princess-lady-drive/jeremy.v1/"; // frozen inside GameOn by #124
const OLD_KEY = "princess-lady-drive:v2"; // the key jeremy.v1 saves under (it predates the gameon.* rule)
// Outside requests jeremy.v1 already made: its Google Fonts stylesheet and font files.
const INHERITED = ["fonts.googleapis.com", "fonts.gstatic.com"];
// Every field jeremy.v1's snapshot() writes. v2 writes the same object, so v1 can still read it.
const V1_FIELDS = ["mode", "dress", "hair", "crownC", "heldE", "flavor", "flowerC", "cakeC", "food", "puppet", "book", "necklace", "held", "muted",
  "inv", "balloons", "pets", "carry", "deco", "laps", "goals", "holes", "seenWalkHint", "seenRoomHint", "seenCarryHint", "room", "p", "cars", "active"];

// A save as jeremy.v1 writes it: Rosie inside the castle, with balloons, two pets and
// four Halloween decorations already delivered.
const V1_SAVE = {
  mode: "walk", dress: 1, hair: 4, crownC: 2, heldE: "🎁", flavor: 0, flowerC: 0, cakeC: 0, food: 0, puppet: 0, book: 0, necklace: 2, held: null, muted: true,
  inv: { icecream: 3, flowers: 1, cupcake: 2, popcorn: 0, food: 0, books: 1, jewels: 2, things: 0, trophies: 1 },
  balloons: ["#ff5c8a", "#4fb3ff", "#ffe14d"], pets: [0, 2], carry: [], deco: [0, 1, 2, 3], laps: 2, goals: 1, holes: 0,
  seenWalkHint: true, seenRoomHint: true, seenCarryHint: true, room: "castle", p: { x: 1400, y: 356, face: 1 }
};

const seed = (page, save = V1_SAVE) => page.addInitScript(([key, save]) => {
  if (!sessionStorage.getItem("seeded")) { localStorage.setItem(key, JSON.stringify(save)); sessionStorage.setItem("seeded", "1"); }
}, [OLD_KEY, save]);
const peek = page => page.evaluate(() => window.princessLadyDrive.inspect());

function outsideRequests(page) {
  const seen = [], home = new URL(test.info().project.use.baseURL).host;
  page.on("request", req => {
    const u = new URL(req.url());
    if (!["http:", "https:"].includes(u.protocol) || u.host === home) return;
    seen.push(u.host);
  });
  return seen;
}

async function play(page) {
  await page.goto(V2);
  await expect(page.getByRole("heading", { name: "Princess Lady Drive" })).toBeVisible();
  await page.locator("#playBtn").click();
  await expect(page.locator("#start")).toBeHidden();
}

// Tap the canvas toward a spot in the world (clamped to the visible screen), the way a
// player does, until Rosie gets there or `done` says so.
async function tapToward(page, x, y) {
  const s = await page.evaluate(([x, y]) => window.princessLadyDrive.toScreen(x, y), [x, y]);
  const vp = page.viewportSize();
  const px = Math.max(16, Math.min(vp.width - 16, s.x)), py = Math.max(110, Math.min(vp.height - 16, s.y));
  if (vp.width < 600) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
}
async function walkUntil(page, x, y, done, tries = 12) {
  for (let i = 0; i < tries; i++) {
    await tapToward(page, x, y);
    for (let k = 0; k < 10; k++) {
      await page.waitForTimeout(150);
      if (await done(await peek(page))) return;
    }
  }
  expect(await done(await peek(page)), `never got to (${x}, ${y})`).toBe(true);
}
async function intoRoom(page, kind) {
  const s = await peek(page);
  expect(s.room).toBe("castle");
  const door = s.doors.find(d => d.kind === kind);
  await walkUntil(page, door.x, door.y, q => q.room === kind);
  await page.waitForTimeout(300);
}
async function touch(page, t, done, n = 0) {
  const it = (await peek(page)).items.filter(i => i.t === t)[n];
  await walkUntil(page, it.x, it.y + 30, done);
}
async function backToHall(page) {
  const s = await peek(page);
  await walkUntil(page, s.w / 2, s.h - 10, q => q.room === "castle");
  const q = await peek(page);
  expect(q.room).toBe("castle");
  expect(q.mode).toBe("inside");
}

test.describe.configure({ timeout: 90_000 });

test("jeremy.v2 opens to its title screen and starts, with no new outside requests", async ({ page, shot, note, browserErrors }) => {
  const outside = outsideRequests(page);
  await play(page);
  await page.waitForTimeout(800);
  const s = await peek(page);
  expect(s.mode).toBe("drive");
  await expect(page.locator("#carBtn")).toContainText("Get out");
  const extra = [...new Set(outside)].filter(h => !INHERITED.includes(h));
  expect(extra, "outside requests jeremy.v1 didn't make").toEqual([]);
  note(`outside hosts seen: ${[...new Set(outside)].join(", ") || "none"} (Google Fonts, inherited from jeremy.v1)`);
  await page.goto(V2);
  await expect(page.getByRole("heading", { name: "Princess Lady Drive" })).toBeVisible();
  await shot("title");
  expect(browserErrors).toEqual([]);
});

test("the castle is now a Great Hall with doors to four new rooms", async ({ page, shot, note, browserErrors }) => {
  await seed(page);
  await play(page);
  const s = await peek(page);
  expect(s.room).toBe("castle");
  expect(s.doors.map(d => d.kind)).toEqual(["ballroom", "tower", "kitchen", "toyroom"]);
  for (const t of ["throne", "chest", "scepter", "crowns", "cake2", "piano", "bed"]) expect(s.items.map(i => i.t)).toContain(t);
  note("doors: Ballroom, Tower, Kitchen, Toy Room; throne, chest, scepter, crowns, cake, piano, bed and pool still in the hall");
  await page.waitForTimeout(600);
  await shot("great-hall");
  expect(browserErrors).toEqual([]);
});

test("the Ballroom's floor lights up and plays, the music box stops the party, and its door goes back to the hall", async ({ page, shot, note, browserErrors }) => {
  await seed(page);
  await play(page);
  await intoRoom(page, "ballroom");
  let s = await peek(page);
  expect(s.party).toBe(true);
  await walkUntil(page, 300, 340, q => q.tiles >= 3);
  s = await peek(page);
  note(`${s.tiles} dance-floor tiles lit up under Rosie; the party is on`);
  await shot("ballroom");
  await touch(page, "jukebox", q => !q.party);
  expect((await peek(page)).party).toBe(false);
  await backToHall(page);
  expect(browserErrors).toEqual([]);
});

test("the Tower's telescope looks out over the town, the flag goes up, and its stairs go back to the hall", async ({ page, shot, note, browserErrors }) => {
  await seed(page);
  await play(page);
  await intoRoom(page, "tower");
  await touch(page, "telescope", q => !!q.look);
  const s = await peek(page);
  expect(s.look).toBe("the duck pond");
  note(`the telescope shows ${s.look}`);
  await page.waitForTimeout(500);
  await shot("tower-telescope");
  await tapToward(page, 100, 300); // a tap closes the view
  await expect.poll(async () => (await peek(page)).look).toBeNull();
  await touch(page, "flagpole", q => q.flag === 1);
  await backToHall(page);
  expect(browserErrors).toEqual([]);
});

test("the Kitchen's pot turns what Rosie puts in into a surprise treat, and its door goes back to the hall", async ({ page, shot, note, browserErrors }) => {
  await seed(page);
  await play(page);
  await intoRoom(page, "kitchen");
  await touch(page, "ingr", q => q.mix >= 1, 0);
  await touch(page, "stove", q => !!q.treat);
  const s = await peek(page);
  expect(s.treat).toBeTruthy();
  note(`the pot made a ${s.treat}`);
  await shot("kitchen");
  await backToHall(page);
  expect(browserErrors).toEqual([]);
});

test("the Toy Room's blocks crash and rebuild, Rosie rides the rocking horse, and its door goes back to the hall", async ({ page, shot, note, browserErrors }) => {
  await seed(page);
  await play(page);
  await intoRoom(page, "toyroom");
  expect((await peek(page)).blocks).toBe(6);
  await touch(page, "blocks", q => q.blocks < 6);
  await expect.poll(async () => (await peek(page)).blocks, { timeout: 6000 }).toBe(6);
  await walkUntil(page, 210, 475, q => q.sit === "rocker");
  note("blocks knocked down and rebuilt (6); Rosie is riding the rocking horse");
  await page.waitForTimeout(400);
  await shot("toy-room");
  await backToHall(page);
  expect(browserErrors).toEqual([]);
});

test("Go out still leaves the castle from a new room", async ({ page, note, browserErrors }) => {
  await seed(page);
  await play(page);
  await intoRoom(page, "kitchen");
  await page.locator("#carBtn").click();
  const s = await peek(page);
  expect(s.mode).toBe("walk");
  expect(s.room).toBeNull();
  expect(Math.abs(s.x - 1400)).toBeLessThan(5);
  note("from the Kitchen, Go out puts Rosie outside the castle door");
  expect(browserErrors).toEqual([]);
});

test("what stays still works: drive, get out, take free ice cream, go out and get back in", async ({ page, shot, note, browserErrors }) => {
  await play(page);
  await page.locator("#carBtn").click(); // Get out
  expect((await peek(page)).mode).toBe("walk");
  await walkUntil(page, 820, 260, q => q.room === "icecream");
  await touch(page, "cone", q => q.inv.icecream >= 1, 1);
  await expect(page.locator("#stuff")).toContainText("1");
  await shot("ice-cream");
  await page.locator("#carBtn").click(); // Go out
  let s = await peek(page);
  expect(s.mode).toBe("walk");
  expect(s.room).toBeNull();
  await page.locator("#carBtn").click(); // Get in
  await expect.poll(async () => (await peek(page)).mode, { timeout: 8000 }).toBe("drive");
  note("Get out → Ice Cream shop → free cone → Go out → Get in");
  expect(browserErrors).toEqual([]);
});

test("a jeremy.v1 save loads: Rosie keeps her balloons, pets and castle decorations", async ({ page, shot, note, browserErrors }) => {
  await seed(page);
  await play(page);
  const s = await peek(page);
  expect(s.room).toBe("castle");
  expect(s.balloons).toBe(3);
  expect(s.pets).toEqual([0, 2]);
  expect(s.deco).toEqual([0, 1, 2, 3]);
  expect(s.inv.icecream).toBe(3);
  await expect(page.locator("#stuff")).toContainText("🐶🐰");
  await expect(page.locator("#soundBtn")).toHaveText("🔇");
  // Play a little, then check what's saved: same key, same fields as jeremy.v1, nothing new outside gameon.princess-lady-drive.*
  await intoRoom(page, "ballroom");
  await backToHall(page);
  await page.waitForTimeout(500);
  const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  for (const k of Object.keys(stored)) expect(k === "princess-lady-drive:v2" || k.startsWith("gameon.princess-lady-drive."), `unexpected key ${k}`).toBe(true);
  const saved = JSON.parse(stored[OLD_KEY]);
  expect(Object.keys(saved).sort()).toEqual([...V1_FIELDS].sort());
  expect(saved.pets).toEqual([0, 2]);
  expect(saved.deco).toEqual([0, 1, 2, 3]);
  expect(saved.balloons).toHaveLength(3);
  expect(saved.room).toBe("castle");
  note(`keys: ${Object.keys(stored).join(", ")}; the save keeps exactly jeremy.v1's fields, so jeremy.v1 can still read it`);
  await shot("old-save");
  expect(browserErrors).toEqual([]);
});

test("games.json makes jeremy.v2 the default and still offers jeremy.v1", async ({ note }) => {
  const g = games.find(x => x.slug === SLUG);
  expect(g.creator).toBe("jeremy");
  expect(g.default).toBe("jeremy.v2");
  expect(g.url).toBe(V2);
  const v1 = g.versions.find(v => v.id === "jeremy.v1"), v2 = g.versions.find(v => v.id === "jeremy.v2");
  expect(v1.url).toBe(V1_URL);
  expect(v2).toMatchObject({ url: V2, from: "jeremy.v1", idea: 122, note: "More rooms in the castle!" });
  note(`default ${g.default}; jeremy.v1 still at ${v1.url}`);
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
  await expect(game.getByRole("heading", { name: "Princess Lady Drive" })).toBeVisible();
  await game.locator("#playBtn").click();
  await expect(game.locator("#start")).toBeHidden();
  await expect(page.locator("#ver-select")).toHaveValue("jeremy.v2");
  note("card → picker (jeremy.v2 Latest, jeremy.v1) → jeremy.v2 plays in the frame");
  await shot("arcade");
  await page.goto(`./#${SLUG}@jeremy.v1`);
  await expect(page.locator("#frame")).toHaveAttribute("src", V1_URL);
  expect(browserErrors).toEqual([]);
});
