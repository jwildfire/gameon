# Big Weird Dig

> you excavate weird stuff with a bulldozer. kind of like dig dug?

That's the whole idea, word for word, from Jeremy on the GameOn New Game page (game idea #155). Built by Claude Opus 5.5 from the [eval's build brief](https://github.com/jwildfire/gameon/issues/155).

**Play:** https://jwildfire.github.io/gameon/#big-weird-dig, or open `index.html` straight from this folder. No internet needed.

## How to play

- You drive a chunky yellow **bulldozer** down through the ground. Wherever you drive, you carve a tunnel.
- Each level hides a few **weird things** in the dirt: a rubber duck, a giant sock, a toaster, a tiny UFO... Their shapes show faintly through the dirt, they twinkle now and then, and they **glow** when you get close. Dig to one and it pops out with a TA-DA!
- Find them all to clear the level. Everything you find goes on the shelf in the **Weird Museum** (30 things in all), saved on this device.
- **Fuel** runs down as you drive, faster in hard dirt. Red **fuel cans** are buried too. Run out and you try the level again (your finds stay in the museum).
- **Boulders** fall if you dig out the dirt under them. They wobble first, so get out of the way! You can also push a boulder sideways into a tunnel, or drop one on a mole for a BONK.
- **Moles** in miner hats wander their tunnels. If one bumps you, it costs a little fuel and it giggles at you. Press the **blade** to shove it back (it just gets dizzy for a bit). From level 5 the sneaky moles dig their own tunnels.
- 8 levels, each one deeper: Backyard Topsoil, Squishy Clay, Root Tangle, Pebble Pudding, Rocky Basement, Fossil Floor, Crystal Caves and The Lava-Warm Bottom. Deeper dirt is slower to dig, and there's more stone you can't dig through. Up to 3 stars a level for fuel left over.

**Controls:** arrow keys or WASD to drive and dig, Space to push with the blade, P or Esc to pause, R to restart the level. On a phone or tablet, use the arrow pad (slide your thumb around it) and the PUSH button, or hold a finger on the dirt and slide it the way you want to go (a quick tap is a blade push). Plays upright.

## Notes for builders

- `engine.js` is the whole underground world: digging, boulders, moles, fuel and finds, stepped 60 times a second. It has no drawing, sound or clock, so the same code runs in the game and in the level checker. The levels are made from a fixed seed each, so they're the same every time; the moles' moods change from game to game.
- `bot.js` is a robot driver that plays a level through the engine the way a careful player would. `node games/big-weird-dig/tools/check.mjs` lets it play every level with 12 different mole moods and fails if any run doesn't clear its level; it prints how much fuel was left, so you can see the levels get tighter. Run it again whenever you change a level. The title screen uses the same robot to dig behind the menu.
- `art.js` draws every picture with canvas shapes: the bulldozer, moles, boulders, stones, fuel cans and all 30 weird things. No image files.
- `game.js` handles the screens, the tunnels (a dirt layer that gets rubbed out where you dig), the touch and keyboard controls, the sound (made in the browser with WebAudio) and saves.
- Saves live under `gameon.big-weird-dig.` in the browser: `museum` (what you've found), `progress` (levels unlocked and stars) and `sound`.
- It's inspired by that kind of digging game, with its own bulldozer, finds and look: no names, characters or art from anything else, and no pump.
- `window.__bwd` is a small window used only by the evidence tests.
