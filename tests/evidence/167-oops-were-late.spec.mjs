// Evidence for game idea #167, Oops! We're Late! (NotClay: parents silently carry their kids to an
// empty seat in the circle without the teachers or kids noticing).
// Run: npm run evidence -- tests/evidence/167-oops-were-late
import { test, expect, games } from "./evidence.mjs";

const GAME = "games/oops-were-late/";
const owl = (page, expr, arg) => page.evaluate(expr, arg);

// Some checks wait for the teacher to look up in real time; give them room on a busy machine.
test.describe.configure({ timeout: 120_000 });

// Start room n with fixed kid moods, so every run sees the same room.
async function startRoom(page, n, seed = 5) {
  await page.goto(GAME);
  await expect(page.locator("#play-btn")).toBeVisible();
  await owl(page, ([n, seed]) => { __owl.seed(seed); __owl.start(n); }, [n, seed]);
  await expect(page.locator("#hud-room")).toContainText(`${n} · `);
  expect(await owl(page, () => __owl.mode)).toBe("play");
}
const put = (page, x, y) => owl(page, ([x, y]) => { const p = __owl.state.p; p.x = x; p.y = y; }, [x, y]);
// Keep the teacher reading (a long time till she next looks up) so a check is about one thing.
const calmTeacher = page => owl(page, () => { const t = __owl.state.watchers[0]; t.state = "read"; t.timer = 60; });

test("the title screen opens and room 1 starts, with nothing loaded from the internet", async ({ page, shot, note, browserErrors }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(GAME);
  const site = new URL(page.url()).origin;
  await expect(page.locator(".logo .oops")).toHaveText("Oops!");
  await expect(page.locator("#title-screen .muted")).toContainText("Designed by NotClay");
  await page.waitForTimeout(800); // let the robot start sneaking behind the menu
  await shot("title");
  await page.locator("#play-btn").click();
  await expect(page.locator("#intro-screen")).toBeVisible();
  await expect(page.locator("#intro-name")).toHaveText("Classroom Circle");
  await page.locator("#go-btn").click();
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("#hud-room")).toHaveText("1 · Classroom Circle");
  await expect(page.locator("#hud-eyes .eye")).toHaveCount(3);
  expect(await owl(page, () => __owl.mode)).toBe("play");
  expect(await owl(page, () => __owl.roomCount)).toBe(8);
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll).toBeLessThanOrEqual(width);
  const outside = requested.filter(u => /^https?:/.test(u) && new URL(u).origin !== site);
  expect(outside).toEqual([]);
  note(`8 rooms: ${(await owl(page, () => __owl.rooms)).join(", ")}; no requests outside the site; no sideways scrolling`);
  await shot("playing");
  expect(browserErrors).toEqual([]);
});

test("the parent tiptoes with the real controls: the keyboard on a laptop, holding a finger on a phone", async ({ page, isMobile, note, browserErrors }) => {
  await startRoom(page, 1);
  await calmTeacher(page);
  const before = await owl(page, () => ({ x: __owl.state.p.x, y: __owl.state.p.y }));
  let quietSeen = false;
  if (isMobile) {
    const box = await page.locator("#stage").boundingBox();
    const scale = box.width / 540;
    // hold a finger up and to the left of the parent, far away: a normal tiptoe
    const at = (x, y) => ({ clientX: box.x + x * scale, clientY: box.y + y * scale });
    await page.locator("#stage").dispatchEvent("pointerdown", { pointerId: 7, isPrimary: true, pointerType: "touch", ...at(before.x - 200, before.y - 100) });
    await page.waitForFunction(y => __owl.state.p.y < y - 45, before.y, { timeout: 10_000 });
    // slide it right next to the parent: extra quiet
    const mid = await owl(page, () => ({ x: __owl.state.p.x, y: __owl.state.p.y }));
    await page.locator("#stage").dispatchEvent("pointermove", { pointerId: 7, pointerType: "touch", ...at(mid.x - 40, mid.y) });
    await page.waitForTimeout(300);
    quietSeen = await owl(page, () => __owl.state.p.quiet && __owl.state.p.moving);
    await page.locator("#stage").dispatchEvent("pointerup", { pointerId: 7, pointerType: "touch" });
  } else {
    await page.keyboard.down("ArrowUp"); await page.keyboard.down("ArrowLeft");
    await page.waitForFunction(y => __owl.state.p.y < y - 45, before.y, { timeout: 10_000 });
    await page.keyboard.down("Shift");
    await page.waitForTimeout(300);
    quietSeen = await owl(page, () => __owl.state.p.quiet && __owl.state.p.moving);
    await page.keyboard.up("Shift"); await page.keyboard.up("ArrowLeft"); await page.keyboard.up("ArrowUp");
  }
  await page.waitForTimeout(150);
  const after = await owl(page, () => ({ x: __owl.state.p.x, y: __owl.state.p.y, moving: __owl.state.p.moving }));
  expect(after.y).toBeLessThan(before.y - 40);   // went up the room
  expect(after.x).toBeLessThan(before.x - 20);   // and to the left
  expect(quietSeen).toBe(true);                  // tiptoed quietly part of the way
  expect(after.moving).toBe(false);              // let go: frozen
  note(`${isMobile ? "finger held up-left, then slid close for a quiet tiptoe, then lifted" : "arrow keys up+left, then Shift for a quiet tiptoe"}: moved from ${Math.round(before.x)},${Math.round(before.y)} to ${Math.round(after.x)},${Math.round(after.y)} and froze when let go`);
  expect(browserErrors).toEqual([]);
});

test("freezing while the teacher looks up keeps you safe, even in plain sight", async ({ page, shot, note, browserErrors }) => {
  await startRoom(page, 1);
  // stand still beside the circle, in the teacher's sweep, and hold Space (freeze)
  await put(page, 430, 230);
  await page.keyboard.down(" ");
  await page.waitForFunction(() => __owl.state.watchers[0].state === "warn", null, { timeout: 15_000 });
  await expect(page.locator("#hud")).toBeVisible();
  let most = 0, shotTaken = false;
  for (let i = 0; i < 60; i++) {
    const t = await owl(page, () => ({ st: __owl.state.watchers[0].state, m: __owl.state.watchers[0].meter, seen: __owl.state.p.seenBy }));
    most = Math.max(most, t.m);
    if (!shotTaken && t.st === "scan" && t.seen > 0) { await shot("freeze"); shotTaken = true; }
    if (t.st === "back" || t.st === "read") break;
    await page.waitForTimeout(80);
  }
  await page.keyboard.up(" ");
  const end = await owl(page, () => ({ lost: __owl.state.lost, m: __owl.state.watchers[0].meter, moving: __owl.state.p.moving }));
  expect(shotTaken).toBe(true);     // she did look right at us
  expect(most).toBeGreaterThan(0);  // and her noticing ring started to fill
  expect(most).toBeLessThan(0.6);   // but only a little, because we froze
  expect(end.lost).toBe(false);
  note(`frozen in her sweep: the teacher's noticing ring got to ${Math.round(most * 100)}% and drained away; she went back to reading`);
  expect(browserErrors).toEqual([]);
});

test("walking in front of the teacher while she looks gets you “Oh, you're late!”, and Try again restarts the room", async ({ page, shot, note, browserErrors }) => {
  await startRoom(page, 1);
  await page.waitForFunction(() => __owl.state.watchers[0].state === "scan", null, { timeout: 15_000 });
  // keep stepping about right where she's looking (the parent is put in her gaze as she sweeps)
  await page.evaluate(() => {
    window.__follow = setInterval(() => {
      const s = __owl.state, t = s.watchers[0];
      if (s.lost) return clearInterval(window.__follow);
      s.p.x = t.x + Math.cos(t.dir) * 230 + Math.sin(performance.now() / 90) * 6; s.p.y = t.y + Math.sin(t.dir) * 230;
    }, 40);
  });
  await page.keyboard.down("ArrowLeft");
  await expect(page.locator("#lost-screen")).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up("ArrowLeft");
  await expect(page.locator("#lost-screen .big-oh")).toHaveText("“Oh, you're late!”");
  await expect(page.locator("#lost-line")).toHaveText("The teacher spotted you!");
  expect(await owl(page, () => __owl.state.lostBy)).toBe("teacher");
  await shot("spotted");
  await page.locator("#retry-btn").click();
  const fresh = await owl(page, () => ({ mode: __owl.mode, x: __owl.state.p.x, y: __owl.state.p.y, lost: __owl.state.lost, t: __owl.state.t }));
  expect(fresh.mode).toBe("play");
  expect(fresh.lost).toBe(false);
  expect(Math.round(fresh.x)).toBe(440);
  expect(Math.round(fresh.y)).toBe(676);
  note("the teacher's ring filled while we walked in her gaze: “Oh, you're late!”; Try again put us back at the door");
  expect(browserErrors).toEqual([]);
});

test("a kid wriggles, turns round and notices you; the third kid to notice ends the room", async ({ page, shot, note, browserErrors }) => {
  await startRoom(page, 2);
  await calmTeacher(page);
  // the next turner wriggles now
  const k = await owl(page, () => { const s = __owl.state; const w = s.watchers.find(w => w.turner); w.state = "face"; w.timer = 0; return s.watchers.indexOf(w); });
  await page.waitForFunction(k => __owl.state.watchers[k].state === "wiggle", k, { timeout: 5000 });
  await page.waitForFunction(k => __owl.state.watchers[k].state === "turned", k, { timeout: 5000 });
  // step about right in front of them
  await page.evaluate(k => {
    window.__follow = setInterval(() => {
      const s = __owl.state, w = s.watchers[k];
      if (w.noticed || s.lost) return clearInterval(window.__follow);
      s.p.x = w.x + Math.cos(w.dir) * 80 + Math.sin(performance.now() / 90) * 5; s.p.y = w.y + Math.sin(w.dir) * 80;
    }, 40);
  }, k);
  await page.keyboard.down("ArrowLeft"); // and keep walking
  await expect(page.locator("#hud-eyes .eye.on")).toHaveCount(1, { timeout: 5000 });
  await page.keyboard.up("ArrowLeft");
  await expect(page.locator("#tip")).toHaveText("A kid noticed you!");
  expect(await owl(page, k => __owl.state.watchers[k].noticed, k)).toBe(true);
  await page.waitForTimeout(250);
  await shot("kid-noticed");
  // two more kids notice (their rings are nudged full), and that's it
  await owl(page, () => { const s = __owl.state; s.watchers.filter(w => w.kind === "kid" && !w.noticed).slice(0, 2).forEach(w => { w.state = "turned"; w.timer = 3; w.meter = 0.999; w.dir = w.target = Math.atan2(s.p.y - w.y, s.p.x - w.x); }); });
  await expect(page.locator("#lost-screen")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#lost-line")).toContainText("Three kids noticed");
  note("a turner wriggled (“~”), turned round, its ring filled and the first eye in the HUD lit up; when the third kid noticed, the room was over");
  expect(browserErrors).toEqual([]);
});

test("creaky boards and a woken toddler turn heads", async ({ page, shot, note, browserErrors }) => {
  await startRoom(page, 3);
  await calmTeacher(page);
  await put(page, 345, 545);
  await page.keyboard.down("ArrowRight"); await page.waitForTimeout(400); await page.keyboard.up("ArrowRight");
  await page.waitForFunction(() => __owl.state.noises.some(n => n.kind === "creak"), null, { timeout: 3000 }).catch(() => {});
  await page.waitForFunction(() => __owl.state.watchers.some(w => w.state === "alert" || w.state === "peek"), null, { timeout: 3000 });
  const lookers = await owl(page, () => __owl.state.watchers.filter(w => w.state === "alert" || w.state === "peek").length);
  expect(lookers).toBeGreaterThan(0);
  await page.waitForTimeout(250);
  await shot("creak");
  // tiptoeing over a board makes only a little creak
  await calmTeacher(page);
  await page.waitForFunction(() => __owl.state.watchers.every(w => w.state !== "alert" && w.state !== "peek"), null, { timeout: 5000 });
  await put(page, 270 - 18, 600);
  await page.keyboard.down("Shift"); await page.keyboard.down("ArrowRight"); await page.waitForTimeout(700); await page.keyboard.up("ArrowRight"); await page.keyboard.up("Shift");
  const soft = await owl(page, () => __owl.state.noises.map(n => n.kind));
  expect(soft).not.toContain("creak");

  await startRoom(page, 5);
  await calmTeacher(page);
  const td = await owl(page, () => ({ x: __owl.state.toddler.x, y: __owl.state.toddler.y }));
  await put(page, td.x + 70, td.y + 55);
  await page.keyboard.down("ArrowLeft"); await page.waitForTimeout(1600); await page.keyboard.up("ArrowLeft");
  await page.waitForFunction(() => __owl.state.toddler.awake > 0, null, { timeout: 4000 });
  const looking = await owl(page, () => __owl.state.watchers.filter(w => w.kind !== "parent" && (w.state === "alert" || w.state === "peek")).length);
  const watchers = await owl(page, () => __owl.state.watchers.filter(w => w.kind !== "parent").length);
  expect(looking).toBe(watchers);
  await page.waitForTimeout(300);
  await shot("toddler");
  note(`walking on a creaky board in Music Class: CREAK! and ${lookers} kid(s) turned to look; tiptoeing over one only went “creak”. Walking past the napping toddler woke her: WAAAH! and all ${watchers} watchers turned to look`);
  expect(browserErrors).toEqual([]);
});

test("every room can be sneaked into, and stars are saved only under gameon.oops-were-late.", async ({ page, isMobile, shot, note, browserErrors }) => {
  await page.goto(GAME);
  // The robot sneaker (bot.js) plays all 8 rooms through the real engine, reacting about half a second late like a person.
  const runs = await owl(page, () => __owl.rooms.map((_, i) => [1, 2, 3].map(seed => OWLBot.run(i + 1, seed, 240, 0.45))));
  runs.forEach(r => r.forEach(x => expect(x.won).toBe(true)));
  const times = runs.map((r, i) => `${i + 1}: ${Math.round(r.reduce((a, x) => a + x.t, 0) / r.length)}s`);
  // and once for real, in the game, in room 1
  await owl(page, () => { __owl.seed(4); __owl.start(1); __owl.bot(true); });
  await expect(page.locator("#won-screen")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#won-screen .made")).toHaveText("Made it!");
  await expect(page.locator("#won-stars .on")).toHaveCount(3);
  await expect(page.locator("#won-line")).toContainText("Nobody noticed");
  await shot("made-it");
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith("gameon.oops-were-late.")).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gameon.oops-were-late.stars"))[0])).toBe(3);
  await expect(page.locator("#title-stars")).toHaveText("3");
  await page.locator("#rooms-btn").click();
  await expect(page.locator(".room-btn")).toHaveCount(8);
  await expect(page.locator(".room-btn").nth(0).locator(".rs .off")).toHaveCount(0);
  await expect(page.locator(".room-btn").nth(1)).toBeEnabled();
  await expect(page.locator(".room-btn").nth(2)).toBeDisabled();
  await shot("rooms");
  note(`robot made it into every room, 3 kid moods each (average time per room ${times.join(", ")}); in the game it got 3 stars in room 1; after a reload: keys ${keys.join(", ")}, room 1 shows 3 stars and room 2 is unlocked`);
  expect(browserErrors).toEqual([]);
});

test("the pause button stops the room, Restart starts it over, and it still plays when saving is blocked", async ({ page, note, browserErrors }) => {
  await startRoom(page, 1);
  await calmTeacher(page);
  await page.keyboard.down("ArrowUp"); await page.waitForTimeout(500); await page.keyboard.up("ArrowUp");
  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-screen")).toBeVisible();
  const frozen = await owl(page, () => __owl.state.t);
  await page.waitForTimeout(400);
  expect(await owl(page, () => __owl.state.t)).toBe(frozen);
  await page.locator("#restart-btn").click();
  await expect(page.locator("#pause-screen")).toBeHidden();
  const fresh = await owl(page, () => ({ mode: __owl.mode, t: __owl.state.t, y: __owl.state.p.y }));
  expect(fresh.mode).toBe("play");
  expect(fresh.t).toBeLessThan(frozen);
  expect(Math.round(fresh.y)).toBe(676);

  const blocked = await page.context().newPage();
  const errs = [];
  blocked.on("pageerror", e => errs.push(e.message));
  await blocked.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("storage blocked"); } }); });
  await blocked.goto(GAME);
  await blocked.locator("#play-btn").click();
  await blocked.locator("#go-btn").click();
  await blocked.keyboard.down("ArrowUp"); await blocked.waitForTimeout(400); await blocked.keyboard.up("ArrowUp");
  expect(await blocked.evaluate(() => __owl.state.p.y)).toBeLessThan(670);
  expect(errs).toEqual([]);
  note(`paused at ${frozen.toFixed(2)}s and the clock stayed put; Restart put the parent back at the door; with localStorage throwing, room 1 still started and played`);
  expect(browserErrors).toEqual([]);
});

// Editor's Choice cards come first in the arcade (#161); the newest pipeline game comes next, ahead of the games that were there before it.
test("Oops! We're Late! has a card right after the Editor's Choice games and plays in its frame", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");
  const card = page.locator('#shelf .cart[href="#oops-were-late"]');
  await expect(card).toBeVisible();
  const picks = games.filter(g => g.editorsChoice === true).length;
  const mine = games.findIndex(g => g.slug === "oops-were-late");
  const next = games[mine + 1].slug;
  const order = await page.locator("#shelf .cart").evaluateAll(cs => cs.map(c => c.getAttribute("href")));
  expect(order.indexOf("#oops-were-late")).toBeGreaterThanOrEqual(picks);
  expect(order.indexOf("#oops-were-late")).toBeLessThan(order.indexOf("#" + next));
  await expect(card.locator("h2")).toHaveText("Oops! We're Late!");
  await expect(card.locator(".cover img")).toHaveJSProperty("complete", true);
  expect(await card.locator(".cover img").evaluate(img => img.naturalWidth)).toBe(800);
  await card.click();
  await expect(page.locator("#bar-title")).toHaveText("Oops! We're Late!");
  await expect(page.locator("#gh-btn")).toHaveAttribute("href", "https://github.com/jwildfire/gameon/tree/main/games/oops-were-late");
  const frame = page.frameLocator("#frame");
  await expect(frame.locator(".logo .oops")).toHaveText("Oops!");
  await frame.locator("#play-btn").click();
  await frame.locator("#go-btn").click();
  await expect(frame.locator("#hud")).toBeVisible();
  note(`card at position ${order.indexOf("#oops-were-late") + 1}, after the ${picks} Editor's Choice card(s) and ahead of ${next}, with its 800x450 cover; plays inside the frame; GitHub button opens its folder`);
  await shot("in-arcade");
  expect(browserErrors).toEqual([]);
});
