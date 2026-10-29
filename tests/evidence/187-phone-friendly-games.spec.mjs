// Evidence for the phone-friendly games task (#187): every game's default version measured
// against the build skill's phone bar. At phone size (375 x 812 with touch; 812 x 375 for a
// sideways game) each check taps the game's real controls into play, measures every touch
// target with touchTargets() and checks a real control does something. At desktop size it
// holds each WASD key and its arrow twin in play and records which ones move the game.
//
// Every game fell short when this was written, so the checks pin what the audit found (the
// `short` lines and the keys that work) rather than the bar itself. Each row names a frozen
// version's url, so the results can't change under it; a fixed game is a new version, with
// its own phone check in its own build.
// Run: npm run evidence -- tests/evidence/187-phone-friendly-games
// evidence-scope: game claw-of-cool fidget-factory ant-farm-wars devils-burger-station oops-were-late pet-wash-payback big-weird-dig super-sauce-boy fancy-food-fight mazeathon trampoline-battle princess-lady-drive stretcher-bearer angry-dudes magic-friends timedout
import { test, expect, games, touchTargets } from "./evidence.mjs";

const all = (keys, v) => Object.fromEntries(keys.map(k => [k, v]));
const DIRS = ["w", "ArrowUp", "a", "ArrowLeft", "s", "ArrowDown", "d", "ArrowRight"];

// One row per game. touchStart/keyStart: steps from load into play. touchProbe: a real
// control to tap or hold, and a value it changes. keys: groups of keys tried in play at
// desktop size, and which ones changed `expr`. short: what the audit found too small or too close.
const AUDIT = [
  { slug: "claw-of-cool", url: "games/claw-of-cool/jeremy.v2/",
    short: ['"Pause" is 60x27', '"Zoom out" is 22x22', '"Left" is 46x42', 'LOCKED" are 3 px apart'],
    touchStart: [{ tap: "#play-btn", wait: 500 }, { tap: ".kpad .go", wait: 3500 }],
    touchProbe: { name: "the Left pad key", steps: [{ tap: '.kpad .k[aria-label=Left]' }], expr: "st.claw.y" },
    keyStart: [{ click: "#play-btn", wait: 500 }, { key: " ", wait: 3500 }],
    keys: [{ expr: "[st.claw.x, st.claw.y].map(n => n.toFixed(1)).join()", try: ["a", "d", "ArrowLeft", "ArrowRight", "s", "w", "ArrowDown", "ArrowUp"], expect: all(DIRS, true) }] },
  { slug: "fidget-factory", url: "games/fidget-factory/",
    short: ['"Pause" is 44x44', '"Turn the cube right" is 44x44'],
    touchStart: [{ tap: "#make-btn" }, { eval: "__ff.setDesign({ kind: 'cube' })" }, { tap: "#build-btn", wait: 500 }, { tap: "#skip-btn", wait: 1000 }],
    touchProbe: { name: "Turn right", steps: [{ tap: "#turn-r", wait: 700 }], expr: "__ff.play.st.face" },
    keyStart: [{ click: "#make-btn" }, { eval: "__ff.setDesign({ kind: 'cube' })" }, { click: "#build-btn", wait: 500 }, { click: "#skip-btn", wait: 1000 }],
    keys: [{ expr: "__ff.play.st.face", try: ["d", "ArrowRight", "a", "ArrowLeft"], hold: 150, settle: 700, expect: { d: false, ArrowRight: true, a: false, ArrowLeft: true } }] },
  { slug: "ant-farm-wars", url: "games/ant-farm-wars/",
    short: ['"Pause \\(P\\)" is 30x30', '"Pause \\(P\\)" is 6 px from the edge'],
    touchStart: [{ tap: "#play-btn", wait: 500 }, { tap: "#cards .pick", wait: 1000 }],
    touchProbe: { name: "the farm (rally point)", steps: [{ tapAt: [200, 420] }], expr: "JSON.stringify(__afw.state.colonies[0].rally)" },
    keyStart: [{ click: "#play-btn", wait: 500 }, { click: "#cards .pick", wait: 1000 }],
    keys: [{ expr: "[__afw.view.ox, __afw.view.oy].join()", try: ["a", "ArrowLeft", "d", "ArrowRight", "w", "ArrowUp"], hold: 300, expect: all(["a", "ArrowLeft", "d", "ArrowRight", "w", "ArrowUp"], false) }] },
  { slug: "devils-burger-station", url: "games/devils-burger-station/",
    short: ['"Pause" is 28x28', '"Bun \\(1\\)" is 6 px from the edge', '"Bun \\(1\\)" and "Patty \\(2\\)" are 5 px apart'],
    touchStart: [{ tap: "#play-btn", wait: 500 }, { tap: "#go-btn", wait: 1500 }],
    touchProbe: { name: "Bun", steps: [{ tap: "#tray .tbtn[data-id=bun]" }], expr: "JSON.stringify(__dbs.state.plate.layers)" },
    keyStart: [{ click: "#play-btn", wait: 500 }, { eval: "__dbs.start(3, 1)", wait: 8000 }],
    keys: [{ expr: "__dbs.state.selected", try: ["a", "ArrowLeft", "d", "ArrowRight"], hold: 150, expect: { a: false, ArrowLeft: true, d: false, ArrowRight: true } }] },
  { slug: "oops-were-late", url: "games/oops-were-late/",
    short: ['"Pause" is 28x28', '"Sound: on" is 112x38'],
    touchStart: [{ tap: "#play-btn", wait: 400 }, { tap: "#go-btn", wait: 500 }],
    touchProbe: { name: "a finger held on the floor", steps: [{ hold: { in: "#stage", at: [0.5, 0.33] }, wait: 300 }], expr: "[Math.round(__owl.state.p.x), Math.round(__owl.state.p.y)].join()" },
    keyStart: [{ click: "#play-btn", wait: 400 }, { click: "#go-btn", wait: 500 }],
    keys: [{ expr: "[Math.round(__owl.state.p.x), Math.round(__owl.state.p.y)].join()", try: DIRS, expect: all(DIRS, true) }] },
  { slug: "pet-wash-payback", url: "games/pet-wash-payback/jeremy.v3/",
    short: ['"Pause" is 32x32', '"Sound on or off" and "Pause" are 4 px apart'],
    touchStart: [{ tap: "#play-btn", wait: 400 }, { tap: "#go-btn", wait: 600 }],
    touchProbe: { name: "tool 2", steps: [{ tap: "#tool-2" }], expr: "__pwp.round.tool" },
    // Play! starts the wash round, where no key scrubs, rinses or catches.
    keyStart: [{ click: "#play-btn", wait: 400 }, { click: "#go-btn", wait: 600 }],
    keys: [{ expr: "__pwp.progress()", try: [...DIRS, " ", "Enter"], hold: 300, expect: all([...DIRS, " ", "Enter"], false) }] },
  { slug: "big-weird-dig", url: "games/big-weird-dig/",
    short: ['"Pause" is 28x28', '"Pause" is 6 px from the edge'],
    touchStart: [{ tap: "#play-btn", wait: 800 }],
    touchProbe: { name: "the d-pad (down)", steps: [{ hold: { at: [106, 778] }, wait: 200 }], expr: "[__bwd.state.dozer.x, __bwd.state.dozer.y].map(n => n.toFixed(2)).join()" },
    keyStart: [{ click: "#play-btn", wait: 800 }],
    keys: [{ expr: "(d => [d.x.toFixed(2), d.y.toFixed(2), d.dir].join())(__bwd.state.dozer)", try: ["s", "w", "ArrowDown", "ArrowUp", "a", "d", "ArrowLeft", "ArrowRight"], expect: all(DIRS, true) }] },
  { slug: "super-sauce-boy", url: "games/super-sauce-boy/", sideways: true,
    short: ['"Pause" is 28x28', '"Pause" is 6 px from the edge'],
    touchStart: [{ tap: "#play-btn", wait: 800 }],
    touchProbe: { name: "the run-right button (held)", steps: [{ hold: { in: "#btn-right" }, wait: 200 }], expr: "__ssb.player.x.toFixed(1)" },
    keyStart: [{ key: "Enter", wait: 700 }],
    keys: [{ expr: "__ssb.player.x.toFixed(1)", try: ["d", "ArrowRight", "a", "ArrowLeft"], hold: 250, expect: all(["d", "ArrowRight", "a", "ArrowLeft"], true) },
           // Jumps are read mid-air, then the boy lands before the next one.
           { expr: "__ssb.player.y.toFixed(1)", during: true, try: ["w", "ArrowUp"], hold: 250, settle: 900, expect: { w: true, ArrowUp: true } }] },
  { slug: "fancy-food-fight", url: "games/fancy-food-fight/", sideways: true,
    short: ['"Pause" is 25x25', '"Cream pie" is 43x43', '"Cream pie" and "Spaghetti" are 5 px apart'],
    touchStart: [{ tap: "#play-btn", wait: 800 }],
    touchProbe: { name: "the food court (throw)", steps: [{ tapIn: "#game", at: [0.5, 0.7], wait: 1200 }], expr: "window.__fff.splats" },
    keyStart: [{ eval: "(() => { const arc = CanvasRenderingContext2D.prototype.arc; CanvasRenderingContext2D.prototype.arc = function (x, y, r) { if (r === 18) window.__aim = [Math.round(x), Math.round(y)].join(); return arc.apply(this, arguments); }; })()" },
               { click: "#play-btn", wait: 800 }, { eval: "window.__fff.calm()" }, { key: "d", wait: 300 }],
    keys: [{ expr: "window.__aim", try: ["d", "ArrowRight", "a", "ArrowLeft", "w", "ArrowUp", "s", "ArrowDown"], hold: 300, expect: all(DIRS, true) }] },
  { slug: "mazeathon", url: "games/mazeathon/", query: "?seed=12345",
    short: ['"Pause game" is 33x33', '"Move up" is 43x43', '"Move up" and "Move left" are 3 px apart'],
    touchStart: [{ tap: "#begin", wait: 1200 }],
    touchProbe: { name: "the d-pad Right (held)", steps: [{ hold: { in: ".dpad [data-dir=right]" }, wait: 200 }], expr: "JSON.stringify(MazeAThon.inspect().player)" },
    keyStart: [{ click: "#begin", wait: 1200 }],
    keys: [{ expr: "JSON.stringify(MazeAThon.inspect().player)", try: ["d", "a", "ArrowRight", "ArrowLeft", "s", "w", "ArrowDown", "ArrowUp"], expect: all(DIRS, true) }] },
  { slug: "trampoline-battle", url: "games/trampoline-battle/jeremy.v2/", sideways: true, outside: "jwildfire/trampoline-battle",
    short: ['"Red move left" is 42x42', '"Menu" is 38x38'],
    touchStart: [{ tap: "#startBtn", wait: 4500 }],
    touchProbe: { name: "Red's ▶ (held)", steps: [{ hold: { in: "#pad0 [data-a=right]" }, sample: true }], expr: "__tb.teamsArr[0].pad" },
    keyStart: [{ key: "Enter", wait: 4500 }],
    // WASD drives Red and the arrows drive Blue: read while the key is down.
    keys: [{ expr: "JSON.stringify([__tb.teamsArr[0].held, __tb.teamsArr[1].held])", during: true, try: ["a", "d", "ArrowLeft", "ArrowRight"], hold: 250, expect: all(["a", "d", "ArrowLeft", "ArrowRight"], true) }] },
  { slug: "princess-lady-drive", url: "games/princess-lady-drive/jeremy.v2/", outside: "jwildfire/princess-lady-drive",
    short: ['help: "Start over" is 106x43'],
    more: [{ name: "help", steps: [{ tap: '[aria-label="Help for grown-ups"]', wait: 500 }] }],
    touchStart: [{ tap: "#playBtn", wait: 1000 }],
    touchProbe: { name: "the road (drive there)", steps: [{ tapAt: [100, 300], wait: 1500 }], expr: "JSON.stringify(princessLadyDrive.toScreen(0, 0))" },
    keyStart: [{ click: "#playBtn", wait: 1000 }, { key: " ", wait: 700 }],
    keys: [{ expr: "(o => [Math.round(o.x), Math.round(o.y)].join())(princessLadyDrive.inspect())", try: ["d", "a", "ArrowRight", "ArrowLeft", "s", "w", "ArrowDown", "ArrowUp"], hold: 450, expect: all(DIRS, true) }] },
  { slug: "stretcher-bearer", url: "games/stretcher-bearer/jeremy.v1/", outside: "jwildfire/stretcher-bearer",
    short: ['"PAUSE" is 55x30', '"SOUND ON" and "PAUSE" are 6 px apart'],
    touchStart: [{ tap: "[data-a=start]", wait: 500 }, { tap: "[data-a=go]", wait: 800 }],
    touchProbe: { name: "Mask", steps: [{ tap: "#tMask" }], expr: "document.querySelector('#iMask').textContent" },
    keyStart: [{ click: "[data-a=start]", wait: 500 }, { click: "[data-a=go]", wait: 800 }],
    keys: [{ expr: "(() => { const c = document.querySelector('#mini'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; return h; })()",
             try: ["d", "ArrowRight", "a", "ArrowLeft", "w", "ArrowUp", "s", "ArrowDown"], hold: 500, expect: all(DIRS, true) }] },
  { slug: "angry-dudes", url: "games/angry-dudes/jeremy.v1/", sideways: true, outside: "jwildfire/angry-dudes",
    short: ['"Restart" is 86x32', '"Menu" is 60x32'],
    touchStart: [{ tap: ".lvl", wait: 500 }, { tap: "#btn-start", wait: 3500 }],
    touchProbe: { name: "the second dude in the bar", steps: [{ tap: "#bar .item >> nth=1" }], expr: "window.ANGRY_DEBUG.state.selected" },
    keyStart: [{ click: ".lvl", wait: 500 }, { click: "#btn-start", wait: 3500 }],
    keys: [{ expr: "JSON.stringify(window.ANGRY_DEBUG.state)", try: [...DIRS, " ", "Enter", "p", "Escape"], hold: 250, expect: all([...DIRS, " ", "Enter", "p", "Escape"], false) }] },
  { slug: "magic-friends", url: "games/magic-friends/jeremy.v1/", query: "?test", outside: "jwildfire/magic-friends",
    short: ['"Sound" is 38x38', '"Easy" and "Normal" are 4 px apart'],
    touchStart: [{ tap: "#play", wait: 6000 }],
    touchProbe: { name: "the pad's ▶ (held)", steps: [{ tap: "#btnPad" }, { hold: { in: "#bR" }, wait: 200 }], expr: "Math.round(window.__game.pl.x)" },
    keyStart: [{ click: "#play", wait: 6000 }],
    keys: [{ expr: "Math.round(window.__game.pl.x)", try: ["d", "ArrowRight", "a", "ArrowLeft"], expect: all(["d", "ArrowRight", "a", "ArrowLeft"], true) },
           // There's no pause: P and Escape leave the game running.
           { expr: "window.__game.mode", try: ["p", "Escape"], hold: 150, expect: { p: false, Escape: false } }] },
  { slug: "timedout", url: "games/timedout/jeremy.v1/", outside: "jwildfire/timedout",
    short: ['"✕" is 28x28', '"Read clue aloud" is 30x23'],
    touchStart: [{ tap: ".btn-category[data-category=space]", wait: 2500 }],
    touchProbe: { name: "the first drop zone", steps: [{ tap: ".drop-zone" }], expr: "document.getElementById('remaining').textContent" },
    keyStart: [{ click: ".btn-category[data-category=space]", wait: 2500 }],
    keys: [{ expr: "[...['score', 'remaining'].map(id => document.getElementById(id).textContent), document.querySelectorAll('.timeline-card').length].join()",
             try: [...DIRS, " ", "Enter", "p", "Escape"], hold: 150, expect: all([...DIRS, " ", "Enter", "p", "Escape"], false) }] }
].map(a => ({ short: [], ...a, title: games.find(g => g.slug === a.slug).title }));

async function center(page, sel, at = [0.5, 0.5]) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  return [box.x + box.width * at[0], box.y + box.height * at[1]];
}

// A finger held down (page.touchscreen.tap lifts at once, too quick for a d-pad).
async function hold(page, [x, y], ms, read) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  await page.waitForTimeout(ms);
  const during = read ? await read() : undefined;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  return during;
}

async function run(page, steps = [], read) {
  let during;
  for (const s of steps) {
    if (s.click) await page.locator(s.click).first().click();
    if (s.tap) await page.touchscreen.tap(...await center(page, s.tap));
    if (s.tapIn) await page.touchscreen.tap(...await center(page, s.tapIn, s.at));
    if (s.tapAt) await page.touchscreen.tap(...s.tapAt);
    if (s.hold) during = await hold(page, s.hold.in ? await center(page, s.hold.in, s.hold.at) : s.hold.at, s.hold.ms ?? 500, s.sample && read);
    if (s.key) await page.keyboard.press(s.key);
    if (s.eval) await page.evaluate(s.eval);
    await page.waitForTimeout(s.wait ?? 250);
  }
  return during;
}

const value = (page, expr) => page.evaluate(expr).then(v => JSON.stringify(v));

for (const a of AUDIT) {
  test(`${a.title} (${a.url}) measured against the phone bar`, async ({ page, shot, note, browserErrors }, testInfo) => {
    test.setTimeout(60_000);
    const phone = testInfo.project.name === "phone";
    if (phone && a.sideways) await page.setViewportSize({ width: 812, height: 375 });
    await page.goto(a.url + (a.query || ""));
    await page.waitForTimeout(600);

    if (phone) {
      // Tap the real controls into play, measuring on the way.
      const title = await touchTargets(page);
      await run(page, a.touchStart);
      const play = await touchTargets(page);
      const before = await value(page, a.touchProbe.expr);
      const during = await run(page, a.touchProbe.steps, () => value(page, a.touchProbe.expr));
      const after = during ?? await value(page, a.touchProbe.expr);
      note(`${a.sideways ? "812x375" : "375x812"}: tapped ${a.touchProbe.name}: ${before} -> ${after}`);
      expect(after, `tapping ${a.touchProbe.name} changes the game`).not.toEqual(before);
      const problems = [...new Set([...title.problems.map(p => `title: ${p}`), ...play.problems.map(p => `play: ${p}`)])];
      for (const more of a.more || []) {
        await run(page, more.steps);
        problems.push(...(await touchTargets(page)).problems.map(p => `${more.name}: ${p}`));
      }
      note(`${title.targets.length} targets on the title screen, ${play.targets.length} in play; ${problems.length} short of the bar: ${problems.slice(0, 5).join("; ")}`);
      await shot(a.slug);
      for (const short of a.short) expect(problems.join("\n"), `the audit found ${short}`).toMatch(new RegExp(short));
    } else {
      await run(page, a.keyStart);
      for (const group of a.keys) {
        const works = {};
        for (const key of group.try) {
          const before = await value(page, group.expr);
          await page.keyboard.down(key);
          await page.waitForTimeout(group.hold ?? 400);
          const during = group.during ? await value(page, group.expr) : undefined;
          await page.keyboard.up(key);
          await page.waitForTimeout(group.settle ?? 120);
          works[key] = (during ?? await value(page, group.expr)) !== before;
        }
        note(Object.entries(works).map(([k, v]) => `${k === " " ? "Space" : k} ${v ? "works" : "does nothing"}`).join(", "));
        expect(works).toEqual(group.expect);
      }
      await shot(a.slug);
    }
    expect(browserErrors).toEqual([]);
  });
}

test("the audit covers every game's default version on dev today", async ({ note }) => {
  // A game added or updated later meets the bar in its own build, so only check that
  // every audited version is still in games.json.
  const versions = games.flatMap(g => [g.url, ...(g.versions || []).map(v => v.url)]);
  const defaults = games.filter(g => AUDIT.some(a => a.url === g.url)).length;
  note(`${AUDIT.length} versions audited; ${defaults} of ${games.length} games' defaults`);
  expect(AUDIT.map(a => a.url).filter(url => !versions.includes(url))).toEqual([]);
  expect(AUDIT.length).toBe(16);
});
