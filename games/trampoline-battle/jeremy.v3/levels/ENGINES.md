# Building racing and climbing levels

Read `levels/HOW-TO-ADD-LEVELS.md` first: racing and climbing levels are party levels too (same `MINIS.push({...})` shape, same rules, hooks, fragment workflow, prefixes and test procedure). This page covers what is different. Read the engine code in `index.html` under `// ================= racing engine =================` and `// ================= climbing engine =================`.

Every engine level sets `engine: 'race'` or `engine: 'climb'` and its own `rank` 1–20 (ranks are per engine; the menu shelves and Endless rarity use them). Party levels of other engines are filtered out by `levelsFor(engine)`.

The camera moves: `G.cam = { x, y, z }` is the world position of the top-left of the view and the zoom. `draw(layer)` runs in world coordinates with the camera applied ('back', 'bed', 'front'); to draw something fixed on screen, place it relative to the camera (e.g. `G.cam.y + 40`). There is no flat ground: `G.noFloor` is on, and the engine knocks fighters out itself (pits in racing, the bottom of the screen in climbing). Bed-based hazards from the trampoline game (`rain`, `sweeper`, `shrink`, `lava`, `meteors`…) assume a trampoline and mostly don't fit; write level-specific hazards instead (movers, items with `update`/`onTouch`, `tick` logic).

## Climbing (`engine: 'climb'`)

- `ledges: [[x1, x2, y, { type, vx, ax, period, delay, fn }]]`. Up is negative y. The start floor is at y 520, the side walls at x 20 and 940 (wall-jumpable). Types: `normal`, `ice`, `sticky`, `conveyor` (vx), `move` (ax, period), `crumble` (delay), `spring`, `cloud`, `summit`, plus your own behaviour via `fn(part)` (runs when something lands on it). Ledges are one-way: you jump up through them and land on top; holding down drops through.
- Or `gen: { mix: { normal: 7, ice: 1, … }, gapMin, gapMax, wMin, wMax, infinite }` for a generated tower (`infinite: true` keeps building as you climb and has no summit).
- `top: -2400` is the summit height (a gold summit ledge between `summitX1`/`summitX2`, default 360–600). In `rules: 'race'` the first player to land on it scores automatically (`goal: 1`).
- `ladders: [[x, yBottom, yTop]]` (hold up to climb), `scroll: 30` (auto-scroll speed, rises with heat), `lava: true` and `lavaSpeed` (rising lava), `spawn`, `sky`, `wallCol`, `groundCol`.
- Built-in: running fast makes jumps higher (combos), wall jumps, falling below the screen = out (`loseBody(r, 'fell')`), respawn on a ledge low on screen for score/race/ko rules, a height meter. State: `G.climb` (`ledges`, `ladders`, `best[team]` height in metres, `summit`, `summitBy`, `top`), `climbHeight(y)`, `addLedge(...)` at runtime, `climbDrop(kind, x, delay)` (drops an item from above the screen with a warning arrow).
- AI: the engine's climber heads for the next ledge up. `cpu(r)` can return `{ x, y, jump, ladder, punch }` to steer it.

## Racing (`engine: 'race'`)

- `track: [[piece, length, dy, extra], …]`, built left to right from x 0. Pieces: `flat`, `slope` / `ramp` (dy), `hill` / `dip` (height), `bumps` (count, height), `gap` (a pit; dy changes the landing height), `step` (sudden dy), `tramp` (a trampoline set in the road), zones `mud`, `ice`, `boost`, `oil`, `sticky`, and markers `check` (respawn point) and `finish`. Falling below the lowest ground knocks you out (`'pit'`); in race/score rules you respawn at your last checkpoint.
- `startY`, `startX`, `vehicle` / `vehicles` (keys of `VEHICLES`; default random per player), `crateEvery` (race-item crates, default 900 px; 0 for none), `crateItems` (the race-item pool for crates; `items` is the usual list of placed `[kind, x]` items), `obstacles: [[itemKind, x, dy]]`, `deco` for the backdrop (`farm desert snow city space night candy volcano beach`), `sky`, `ground`, `edge`.
- Built-in: `rules: 'race'` scores automatically at the finish (`goal: 1`); `onFinish(car)` hook. Cars: `cars` array; `carX(c)`, `carY(c)`, `carAng(c)`, `carVel(c)`, `carGround(c)`, `c.driver` (the seated rag), `c.team`, `c.item`, `c.boostT`, `c.done`; `carHop(c)`, `carSlam(c)`, `honk(c)`, `useCarItem(c)`, `ejectDriver(c, word)`, `removeCar(c)`, `groundY(x)`, `G.track` (`lines`, `gaps`, `checks`, `finish`, `zones`), `G.raceZones` (push `{ k, x1, x2, t }` for temporary zones). Controls: left/right = brake/gas (and tip in the air), up = hop (slam in the air), punch = use item or honk.
- AI: the engine drives with the gas on and levels the car in the air. `cpu(r, car)` can return `{ dir }` (-1..1) to override the throttle.
- Camera and modes: `noCatch: true` turns off the catch-up lift for stragglers; `camExtra(pts)` can return `{ x, y }` to keep something else in view (racing Survival uses it for the avalanche). Racing and climbing have their own chaos cards for Pile-Up, Survival and Pure Chaos (`ENGINE_DECKS`); falling-object cards drop just ahead of the camera through `engDrop(kind)`.

Testing is the same as for trampoline levels: inject your fragment at `// <<EXTRA LEVELS>>` into a test page, find your level with `T.MINIS.findIndex(m => m.engine === 'climb' && m.rank === N)`, set `T.settings.more = true`, and run every level in 'solo', 'cpu' and '2p'.
