# Adding party levels to Trampoline Battle

This is the guide the level-building helpers followed for ranks 21–100. Those levels now live directly in `index.html`, pasted just above `// <<EXTRA LEVELS>>`; new levels can be added the same way.

You are adding party levels to `index.html` (one self-contained file, ~5,200 lines). **Do not edit `index.html`.** Write your levels into your own fragment file (named in your task). The fragment is pasted into the game at the line `// <<EXTRA LEVELS>>`, inside the game's closing IIFE, just after the `SPRITES` table (so top-level `Object.assign(SPRITES, …)` and `Object.assign(ITEMS, …)` work). Read these parts of `index.html` before you start (search for the headings):

- `// ================= hazards =================` — the `HZ` modules (rain, sweeper, wrecking, cannons, meteors, sharks, lava, wind, gravity, shrink, weapons, crowd, bumpers, set) and `dropFromSky`, `liveBed`.
- `// ================= party levels =================` — the 20 existing `MINIS` definitions. **Copy their patterns.** Volley Bonkers, Hot Potato, Musical Trampolines, Coin Fountain, Whack-a-Mole, Simon Bounce, Sky Tower and Balloon Pop show custom logic with `setup`/`tick`/`draw`/`cpu`.
- `// ================= party game flow =================` — `startRound`, `spawnPlayer`, `miniPoint`, `bigBlast`, `miniOut`, `checkRound`, `aiMini`, `aiJump`, `drawHazards`, `drawMiniHud`.
- `function addBed`, `function buildLevel`, `function bedUnder`, `function addMover`, `function moverHit` (world section and physics section).
- `const WEAPONS`, `function giveWeapon`, `const ITEMS`, `const SPRITES`, `const PAL`, the `sfx` object.

## What a level is

```js
MINIS.push({
  id: 'xa_train', rank: 21, name: 'Runaway Train', icon: 'xa_train',   // icon = a sprite name (existing or yours)
  rules: 'brawl',            // survive (no punching, last one standing) | brawl (last one standing) | ko (knockouts score, respawn) | score (your own points, respawn) | race (first to goal, respawn)
  goal: 5, time: 45,         // for score/ko/race: points to win and/or a time limit (seconds). Highest score at the time limit wins.
  soloTime: 30, soloGoal: 10,// what a Solo player must survive / reach (Solo plays alone unless vs: true)
  vs: true,                  // Solo gets a computer opponent (use for brawl/ball/versus levels)
  respawn: true,             // (score/ko/race respawn automatically; set for clarity)
  noPunch: true,             // survival levels: the punch button becomes slam
  maxTime: 90,               // brawl/survive with 2 players: call it a draw after this long
  heatTime: 45,              // seconds for G.heat to reach 1 (hazards speed up with G.heat)
  howto: 'One short sentence telling kids what to do.', blurb: 'One short pitch line.',
  deco: 'yard',              // backdrop art: yard jungle dusk barn neon moon lava party pirate ice
  sky: ['#5fb6ff', '#c9ecff'], ground: ['#5cbf4a', '#3f9a33'],
  floorKind: 'water', groundWord: 'SPLASH!', groundPuff: '#bfe9ff',   // optional flavour for falling off
  floating: true,            // draw every trampoline as a floating one (no legs)
  beds: [[200, 760, 400, { style: 'gold', k: 1.2, move: { ax: 80, period: 4 }, zones: [...], color: '#e53935' }]], // x1, x2, y, options
  walls: [[x1, y1, x2, y2, r, safe]],   // capsules; deadly (ZAP) unless safe is true
  blocks: [[x1, y1, x2, y2, r, style]], // solid capsules (style 'hay' draws hay)
  bumpers: [[x, y, r, 'balloon'?]],
  spawn: [[x, y], [x, y]],   // red, blue start points (they drop from y)
  body: 'big',               // fighter type for players: normal big baby fat monkey
  punchK: 1.3, startWeapon: true, npcs: 3, npcWeapons: .5,
  hazards: [['rain', { kinds: ['cow'], every: 2 }], ['wind', {}]],
  scoreLabel: 'coins', hudX: 150,
  setup() {},                // called at the start of every round: initialise ALL your per-round state here, on G.xa_something
  tick(dt) {},               // every frame while the round is live
  draw(layer) {},            // layer is 'back' (behind trampolines), 'bed' (on trampolines), or 'front' (over fighters)
  cpu(r) { return { x, y, jump, slam, punch }; }, // where computer players should go; null = default behaviour
  onTouch(A, B) {},          // two fighters touched
  onOut(r) {},               // a player fell off
  punchAt(r, hx, hy) {},     // a punch landed at hx, hy
});
```

World: 960 × 600, ground at `GROUND = 560`. Touching the ground (or `G.floorY` if you raise it) knocks a fighter out. Trampolines are one-way: you can jump up through one from below and land on it. Normal jump rise is about 170 px; timed bounces can reach about 280 px. Keep vertical steps between trampolines around 80–150 px and gaps under ~150 px.

Useful runtime pieces: `beds`, `bed` (first trampoline), `rags` (fighters: `r.team` 0 red, 1 blue, 2+ crowd; `r.npc`; `r.p.pelvis/head/neck/hL/hR/fL/fR` parts with x/y; `r.lost`; `r.touch`; `r.s` size), `items`, `statics`, `movers`, `TEAMS[t].active`, `G.rscore[t]`, `G.liveT`, `G.heat`, `G.teams` (teams in play), `G.floorY`, `G.windX`, `G.bedK` (bounciness), `G.fric`, `grav`.
Functions: `addBed`, `syncBed(b)` (after moving/resizing a bed: set `b.x1/x2/y` then call it), `bedUnder(x, y)`, `bedYAt(x, b)`, `inHole`, `b.holes.push({x1, x2, t})`, `b.off = true` (vanish), `b.blink = secs` (red blink), `addMover({ r, kick, bounce, at(t, m) { m.x1 = …; m.y1 = …; m.x2 = …; m.y2 = …; m.on = true; }, hit(r, p, nx, ny, speed) {}, deadly: 'zap' })` (moving capsule/ball hazards), `addHazard(name, opts)`, `dropFromSky(kind, x, bed)`, `spawnItem(kind, x, y, vx, vy, team)` (team -1 = hits everyone; `it.p.kin = true` makes it ignore physics and collisions, move it yourself), `removeItem(it, puff)`, `miniPoint(team, n, x, y)`, `bigBlast(x, y, R, F, word)`, `giveWeapon(r, key)`, `pushBody(r, vx, vy)`, `addVel(part, vx, vy)`, `vel(part)`, `massK(r)`, `nearestEnemy(r, maxDist)`, `jump(r)`, `slam(r)`, `loseBody(r, cause)`, `spawnPlayer(t)`, `makeRag(team, kind, x, y, 'air')`, `pop(text, x, y, color, size)`, `puffs(x, y, n, color)`, `burst(x, y, k)`, `shake(a)`, `fx.bolts.push({x, y, t: 0})`, `fx.rings.push({x, y, R, t: 0})`, `sfx.*` (boing, kick, splat, boom, ding, buzz, zap, chomp, whistle, tick, note(f), piano, clang, squeak, slurp, magic, moo, bawk, cannon, cheer, pickup, whoosh, slip, blow…), `aiJump(r)`, `tc(team)` team colour, `INK`, `PCOL`.
Drawing: only inside `draw(layer)` or item drawing; always use the global `ctx` at call time (skins swap it); `circle(x, y, r, color)`, `tri(...)`, `roundRect(...)`, `drawSprite(ctx, name, frame, size)`. Canvas text: `ctx.font = Math.round(16 * FDK) + 'px ' + FD`. Comic style: ink outlines (`INK`), flat colours, sound-word pops.

New items: `Object.assign(ITEMS, { xa_snowball: { label, r, m, life, sprite: 'xa_snowball', fric, onTouch(it, o, ip, dir) {}, update(it, dt, target) { /* return false if you removed it */ } } })`. New sprites: `Object.assign(SPRITES, { xa_snowball: [[ 'rows of PAL letters', … ]] })` (see `PAL`; '.' is see-through; an outline is added automatically). Every new sprite also gets a sticker version automatically. New hazards: `HZ.xa_name = { init(h) {}, tick(h, dt) {}, draw(h, layer) {}, threat(h, r) { return { jump: true } | { x } | null; } }`.

## Rules for your fragment

- **Prefix every top-level name you add** (functions, consts, HZ keys, ITEMS keys, SPRITES keys, `G.` state keys, level ids) with your batch prefix, e.g. `xa_`. Other batches are writing at the same time and everything ends up in one scope.
- Top-level code in the fragment runs once at load, before the game starts. Only reference things defined above the marker at that point; calling functions is fine at runtime.
- Put levels in rank order with `rank` set. Each level should be faithful to its idea in `design/level-ideas.html` (the `IDEAS` array; rank = index + 1), simplified where needed so it is fun and solid. Mostly reuse existing hazards and patterns; add a custom mechanic where the idea needs one. Typical level: 15–60 lines.
- Every level must: finish rounds correctly in Solo, 2 Players and vs Computer; give computer players something sensible to do (`cpu(r)` for anything goal-based); not throw errors; look readable; and use the trampoline. No external assets.

## Testing (required)

A local server is already running at http://localhost:8765 serving the repo root. Build a test page and drive it in the built-in browser **in your own tab** (create one with `tabs_create` and pass its `tabId` to every browser call; other helpers share the browser):

```bash
cd /Users/jwildfire/Documents/games/trampoline-battle && python3 -c "s=open('index.html').read(); f=open('levels/YOURFILE.js').read(); open('tmp/test-YOURPREFIX.html','w').write(s.replace('// <<EXTRA LEVELS>>', f))"
```

Syntax check first: extract the `<script>` of your test page to a .js file in your scratch space and run `node --check`. Then in the browser (`http://localhost:8765/tmp/test-YOURPREFIX.html`), `window.__tb` gives you `MINIS`, `settings`, `startGame()`, `frame(n)` (runs n frames instantly, then draws), `press(team, 'up'|'down'|'punch')`, `getRags()`, `getBeds()`, `G`, `state()`. Example:

```js
document.querySelector('#menu').hidden = true;
const T = window.__tb, i = T.MINIS.findIndex(m => m.rank === 21);
T.settings.game = 'party'; T.settings.mode = 'cpu'; T.settings.mini = i; T.startGame();
T.frame(60 * 40); T.state();   // check for errors, that rounds end and scores move
```

Run every level for 60+ simulated seconds in modes 'solo', 'cpu' and '2p', catching exceptions, and check for NaN positions. Look at a screenshot of each level mid-round (`computer` screenshot with your `tabId`, small `scale`). Fix what you find.

## Report back

Short: the file path, the levels built (rank, name, rules, one line on how it plays), anything you simplified or skipped versus the idea, and the test results.
