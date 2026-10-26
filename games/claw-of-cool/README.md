# Claw of Cool

> Make a new claw machine game using https://april-zhu.com/colorfigures to create the claw machine. Points for getting the coolest stuff!

That's the whole idea, word for word, from Jeremy on the GameOn New Game page (game idea #200). Built by Claude Opus 5.5 from the [eval's build brief](https://github.com/jwildfire/gameon/issues/200). Jeremy approved using the Colorfigures drawing skill for this build only (2026-10-26).

**Play:** https://jwildfire.github.io/gameon/#claw-of-cool, or open `index.html` straight from this folder. No internet needed.

## How to play

- You get **10 coins**. Each coin is one try. Press **DROP** (or Space) and a coin drops into the slot, then the timer starts.
- **Steer** the claw over a prize with the arrow pad (tap to nudge, hold to keep moving) or the arrow keys / WASD. The line at the bottom of the machine tells you which prize is under the claw and what it's worth.
- Press **DROP** again (or wait for the timer) and the claw drops, grabs, lifts and carries back to the chute. A prize that makes it down the chute scores its points and goes on your **collection shelf**.
- **The grip can slip.** Line the claw up right over the middle of a prize. Off-centre, it slips out on the way. The cooler the prize, the smaller and more slippery it is.
- **Coolness tiers:**

  | Tier | Points | Prizes | Bonus |
  |---|---|---|---|
  | COOL | 10 | Rubber Duck, Frog Plush, Piggy Plush | |
  | COOLER | 25 | Shades Bear, Shades Cat, Shades Penguin (they wear sunglasses) | |
  | SUPER COOL | 60 | Disco Ball, Ringed Planet, Rainbow Ball (they glow) | +1 coin |
  | COOLEST | 150 | Unicorn, Ice Dragon Egg, Gold Star (they glow and sparkle) | +2 coins |

- **Rounds:** win 5 prizes and the machine refills with cooler prizes for the next round, but the claw gets looser and the timer shorter.
- Out of coins: game over. Your **best score** and every prize you've ever found are saved on this device.

**Controls:** touch or mouse on the pad and buttons; keyboard **arrows** or **WASD** to steer, **Space** to drop, **P** or **Esc** to pause (Resume, Start over, Title screen), **M** for sound. You can also tap the coin stack, the red button and the joystick on the machine itself. Drag the machine to turn it round, **See-through** shows how the real thing works inside, and the swatches change its colour. Plays upright.

## Notes for builders

- The claw machine is a [Colorfigures](https://april-zhu.com/colorfigures) figure, adapted from the skill's claw machine example: the cabinet, glass, gantry, claw, chute, pickup bay, keypad and see-through come from it. The game adds the prize tiers and their drawings, coins as tries, the slipping grip, rounds, the shelf, saves, sound and the title, pause and game-over screens.
- `index.html` is one self-contained page made by the skill's `build.py`, which inlines its engine (`core.js`) and page features. The figure source isn't kept separately: the game's own script is the second `<script>` in the page, readable as is. Nothing is loaded from the internet; the engine's "Made with Colorfigures" footer link is switched off (`credit:false`) and the credit is plain text at the bottom of the page.
- Sounds are made with WebAudio on the spot. No sound files.
- Saves live under `gameon.claw-of-cool.` in the browser: `best` (best score), `collection` (how many of each prize you've ever won) and `sound`.
- `window.__claw` is a small window used only by the evidence tests (hold the clock and step it, seed the random numbers, aim the claw, read the state).

## Credits

- **Colorfigures** by April Zhu, MIT licence (https://april-zhu.com/colorfigures). Copyright (c) 2026 April Zhu.
- Colorfigures is built on **ISO-GLOW** by April Zhu (MIT, https://isoglow.dev), which is built on **iso-figure** by Tolga Cohce (MIT, https://github.com/MrBongoC/ai-iso-skill).
- The MIT licence asks that its notice travel with the code: the inlined engine in `index.html` is used under these terms:

  > Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  >
  > Copyright (c) 2026 April Zhu (Colorfigures: colour, hand-drawn style, 3D props, template, examples); Copyright (c) 2026 April Zhu (iso-glow, on which Colorfigures is based); Copyright (c) 2026 Tolga Cohce (iso-figure, on which iso-glow is based).
