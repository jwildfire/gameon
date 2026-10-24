# Super Sauce Boy

> Super sauce boy. It's kinda like super meat boy, but with hot sauce.

That's the whole idea, word for word, from NotClay on the GameOn New Game page (game idea #111). Built by Claude Opus 5.5 from the [eval's build brief](https://github.com/jwildfire/gameon/issues/111).

**Play:** https://jwildfire.github.io/gameon/#super-sauce-boy, or open `index.html` straight from this folder. No internet needed.

## How to play

- You're **Sauce Boy**, a tiny drop of hot sauce in a hero mask. Every level has a plate of **nachos** waiting for sauce. Get to it!
- **Run** with ← → (or A and D). **Jump** with Space, ↑ or W. Hold jump to go higher, tap it for a little hop.
- **Wall-jump:** hold toward a wall to slide down it, then press jump to spring off.
- Splat on something and you pop straight back at the start. The splats stay on the walls.
- Every level adds one new thing: forks, sticky walls, slippery **butter**, **toasters** that pop you up, **crackers** that crumble, **hot plates** that take turns sizzling, and rolling **pizza cutters**. Level 12 has all of them.
- The clock and the 💥 splat counter are at the top. Your best time on each level is saved on this device, so go back and beat it.
- **P** or Esc pauses, **R** restarts the level. On a phone or tablet, use the ◀ ▶ buttons at the bottom left and the big JUMP button at the bottom right (you can slide your thumb between ◀ and ▶). It plays upright too, but sideways is roomier.

## Notes for builders

- `engine.js` is the whole game world: running, jumping, walls, and every kitchen hazard, stepped 120 times a second. It has no drawing, sound or clock, so the same code runs in the game and in the level checker.
- `levels.js` has the 12 levels as text maps (the key is at the top of the file). Each level teaches one thing.
- `game.js` draws everything on a canvas, makes the sound and music in the browser, and handles the screens, the touch buttons and saves. No images, fonts or anything else to load.
- Saves (best times, levels unlocked, total splats, sound on or off) live under `gameon.super-sauce-boy.` in the browser.
- `tools/solve.mjs` proves every level can be beaten: it searches for a winning run through the real engine and writes it to `tools/solutions.json`. Run `node games/super-sauce-boy/tools/solve.mjs` from the repo root after `npm ci` (add `0 12` to check that no level needs frame-perfect timing). Run it again whenever you change a level. The evidence spec replays those runs in the game.
- `window.__ssb` is a small window used only by the evidence tests.
