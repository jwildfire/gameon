# MazeAThon

Game 7 in the shared [GameOn](https://github.com/jwildfire/gameon) repository. The complete game lives here, under `games/mazeathon/`; no separate repository is needed.

## The original idea

> you collect shapes in a maze that fit different keyholes. you have to collect them all to escape. you can unlock different rooms. in the rooms, you get boosts that give xray vision, reveal map, invulnerability, fast speed. there are relatively slow monsters that will chase you for a short time when they have line of sight. and one big monster per main chunk that will attack if you get near (but they are all cute)

Ryan named it **MazeAThon**, chose a **top-down view**, and specified that a monster catch **returns the player to the current section's start**. He subsequently requested the full game inside this shared repository.

## Play

Open `index.html` directly, or serve the repository with `python3 -m http.server 8765` and visit `/games/mazeathon/`. The game needs no build, backend, internet connection, external fonts, or downloaded assets.

- Move with **arrow keys**, **WASD**, or the on-screen arrows on a phone/tablet.
- **M** opens the explored map. **H** shows a short trail to a missing shape or the exit.
- **P** or **Escape** pauses. Switching tabs also pauses the game.
- Collect the circle, triangle, diamond, and star in each of three maze sections. All twelve shapes are required to finish.
- Shape keys are reusable. Walk into a matching door to open its boost room. Collected shapes, open doors, and map discoveries survive a catch.
- X-ray, invulnerability, and speed activate on pickup for 14 seconds (up to 24 seconds when stacked). Map reveal uncovers the entire current section. Boost rooms recharge after 30 seconds.
- Small monsters chase for 3.8 seconds after seeing you and then return. Big monsters give a warning before a short attack. Walls block sight. Camp has a short safety shield after a reset.
- Progress saves automatically in this browser. Continue from the title screen; starting fresh asks before replacing your current adventure. If browser storage is unavailable, the game still runs, but progress cannot be saved.
- Sound is optional and off initially. Every sound is generated locally.

Every new adventure generates three new mazes. `?seed=2026` reproduces the same layouts. Save keys use the `gameon.mazeathon.` prefix so they do not collide with other GameOn games.

New mazes scatter four enclosed boost rooms throughout the full map, with entrances facing different directions. Their positions and which shape belongs in each location vary with the seed. Corridors grow around the rooms, so all keys and the exit are reachable while the rooms are locked. The first section still has early loops and route choices. Existing saves keep their original layouts; start a fresh adventure to try the scattered rooms.

## Files and verification

- `world.js`: seeded generation, collision, line of sight, monster AI, boosts, progression, and save validation; independent of the DOM.
- `game.js`: canvas art, responsive camera, controls, dialogs, audio, and persistence.
- `style.css`, `index.html`, `icon.svg`: the standalone game shell.
- `world.test.cjs`: meaningful topology and gameplay invariants. Run `node --test games/mazeathon/world.test.cjs` from the repository root.
- `browser.test.cjs`: the browser playthrough and responsive/control checks. Requires Playwright and Chromium; run it against a local HTTP server as documented in that file.

All artwork is drawn in canvas or SVG; there are no third-party assets or licensing dependencies. The small read-only `MazeAThon.inspect()` diagnostic snapshot supports reproducible browser tests; it does not expose a way to change game state.
