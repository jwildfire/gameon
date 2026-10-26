# Fidget Factory

> Dream up wild fidget toys in a goofy toy workshop, then spin, pop, squish and click them!

The kid's own words are in the private idea jwildfire/gameon-ideas#4. Designed by Kiki; built by Claude Opus 5.5 from the eval's build brief.

**Play:** https://jwildfire.github.io/gameon/#fidget-factory, or open `index.html` straight from this folder. No internet needed.

## How to play

- **Toy workshop.** Pick a **kind** (Spinner, Pop-it, Squishy or Clicky cube), a **colour** and a **second colour** (8 each), a **pattern** (Plain, Dots, Stripes or Stars), a **shape** (3 for each kind) and **extras** (Googly eyes, Glitter, Glow, Rainbow). The preview shows exactly what you're making.
- **The factory.** Press **To the factory!** and the cartoon factory gets to work for about 13 seconds: a goo hopper drops a lump on the conveyor belt, a googly-eyed robot arm chops out the shape, two paint guns spray your two colours, a big press stamps on the pattern, and a wand arm adds each extra. Press **Skip** (or Space) to jump to the end.
- **Play time.**
  - **Spinner:** flick it to spin and try to beat your best spin time. Grab it to stop it.
  - **Pop-it:** pop the bubbles (tap them, or swipe across a row), then **Flip it!** to pop the other side, where the colours swap.
  - **Squishy:** press to squash it, drag to stretch it, pinch with two fingers, and let go to watch it boing back.
  - **Clicky cube:** six faces, each with its own gadget: a big button, a light switch, a slider, a dial, a joystick and three clicky keys. Swipe or use the arrows to turn the cube.
- **Sparkle coins.** Playing earns coins (spinning time, every 10 pops, a full board flipped, squishes, clicks). Coins unlock the second and third shapes for each kind (10 and 20) and the Glitter (15), Glow (25) and Rainbow (40) extras. A glowing fidget gets a **lights-off** button.
- **My shelf** keeps up to 12 fidgets to play with again. When it's full, recycle one (tap ✕ twice) to make room.

**Controls:** touch or mouse everywhere. Keyboard: in the workshop, **arrow keys** move between choices and **Enter** picks; when playing, **Space** spins, pops, squishes or clicks, **F** flips a pop-it, **← →** turn the cube; **P** or **Esc** pauses (with Start over, New fidget, My shelf and Title screen); **M** turns the sound off. Plays upright.

## Notes for builders

- `art.js` draws every fidget, part and machine with canvas shapes in "unit" space. The factory draws the toy with the same `drawFidget` the game uses, so what comes off the belt is the design, stage by stage (grey cut shape, paint, pattern, then each extra).
- `sound.js` makes every sound with WebAudio (pops pitched by row, clicks, squishes, boings, the spinner's hum, factory clanks and a bouncy tune). No sound files.
- `game.js` has the screens, the toy physics (spinner friction, pop-it flip, squishy springs, cube gadgets), coins, unlocks and saves. The game clock steps in fixed 1/60 s ticks with its own seeded random numbers.
- Saves live under `gameon.fidget-factory.` in the browser: `save` (coins, unlocked parts, the shelf of up to 12 designs, best spin time) and `sound`.
- `window.__ff` is a small window used only by the evidence tests (hold the clock and step it, seed the random numbers, read the state).
