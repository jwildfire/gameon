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

## jeremy.v2: Zoom views and themed machines

Update idea from Jeremy (game idea #203), word for word:

> For claw of cool, can you zoom way in once user inserts a coin? let the user see with more details what they are trying to get. Make a few different new zoomed views, top down. front. any others you think might work.
>
> also design some more levels. maybe a claw machine with items in water. some other themes with other types of items. Definitely don't want items in balls either. different shapes make claw machines more fun!

Started from jeremy.v1. A coin now zooms the camera way in on the prize pit, with four views to pick from, and there are four new themed machines with odd-shaped 3D prizes to unlock. Built by Claude Opus 5.5 from the [eval's update brief](https://github.com/jwildfire/gameon/issues/203).

**Play:** https://jwildfire.github.io/gameon/#claw-of-cool@jeremy.v2, or open `index.html` straight from this folder. No internet needed.

### Zoom views

- When the coin lands, the camera zooms way in on the prize pit. It zooms back out when the claw is home again (the try is over) or when the round ends.
- **View** (the button, the chip on the machine, or the **V** key) cycles four views: **Top-down** (looking down through the roof window), **Front** (eye level through the front glass), **Claw-cam** (riding on the claw, looking straight down; it follows the claw) and **Side** (through the side glass, to judge how deep a prize is). Your pick is remembered.
- The controls are the same in every view: the keypad, the arrows or WASD, and Space. In the top-down, front and claw-cam views, left and right on the keypad are left and right on screen.
- Every view is the same 3D machine drawn from that camera, so it is right from that angle:
  - every part is depth-sorted with boxes for that camera, and faces and decals (eyes, windows, sprinkles) draw only when they face it;
  - the pit's contents are clipped to the glass box, so nothing draws through the cabinet's walls, roof or chute; the roof frame, the ledge and the front glass stay in front of the prizes when they are in front of them;
  - the claw-cam sits inside the glass box under the claw's hub, so it leaves out everything behind it (the hub, cable, gantry, roof, glass and the outside of the cabinet);
  - the claw's fingers are sorted in two pieces each, so from above they sit over the prize they grip and their tips at its edge;
  - Dino Dig's sand hides the buried part of each prize (each part is clipped where it meets the sand), and the Aquarium tints whatever is under the water's surface, part by part.
- See-through and Labels still work in the zoomed-out view; the zoom views show the machine as it is.

### Machines (levels)

Win 5 prizes on a machine (reach round 2) to unlock the next one. Pick an unlocked machine on the title screen (tap it, or use left and right). Each machine has its own cabinet colours, prizes and grab feel. There are no capsule balls: every new prize is a loose 3D toy, and odd shapes (long, flat, rings) are harder to grip and worth more. Each machine has one rare legendary prize that is worth 200 and gives 2 coins back.

| # | Machine | Prizes (points) | Twist |
|---|---|---|---|
| 1 | Classic | jeremy.v1's machine, unchanged | |
| 2 | Aquarium | Rubber Duck 10, Octopus Plush 25, Toy Submarine 45 (long), Starfish 60 (flat), Treasure Chest 200 (legendary) | The pit is full of water: prizes bob and drift (the duck floats), bubbles rise, and the claw moves slower |
| 3 | Dino Dig | Dino Egg 10, Volcano Rock 15, Toy T-Rex 30, Fossil Bone 50 (long), Amber with a Bug 200 (legendary) | Prizes are half-buried in the sand; grabbing pulls them free, which is a little harder |
| 4 | Space Station | Moon Rock 10, Astronaut 25, Toy Rocket 45 (long), Flying Saucer 60 (flat), Alien Plush 200 (legendary) | Low gravity: prizes float up and down, and a slipped prize drifts down slowly |
| 5 | Snack Attack | Burger 15, Taco 30, Pizza Slice 50 (flat), Donut 60 (ring), Golden Pickle 200 (legendary) | Flat and ring-shaped snacks are the hardest to grip |

**Cut:** Junkyard Magnet (a magnet claw that only picks up metal) and Ice Cave (a slippery floor). The brief asked for at least four machines in this order, and said to cut a machine before cutting polish.

### Also fixed

- **Round refill:** jeremy.v1 waited until the machine was completely idle before refilling, so round 2 could come after 8 or 9 wins. Now the 5th win of a round refills the machine straight away (the prize just won keeps falling down the chute while the new ones rain in).

### Saves

- jeremy.v1's saves are read and never changed: `gameon.claw-of-cool.best` and `gameon.claw-of-cool.collection` count for the Classic machine's best score and found prizes.
- The sound setting is shared with jeremy.v1: `gameon.claw-of-cool.sound`.
- jeremy.v2's own saves are under `gameon.claw-of-cool.jeremy.v2.`: `best` (best score per machine), `collection` (prizes won per machine), `unlocked` (how many machines are unlocked), `machine` (the last one picked) and `view` (the last zoom view).

### Notes for builders

- As in jeremy.v1, `index.html` is one page made by the Colorfigures skill's `build.py`; the game's own script is the second `<script>`, readable as is. Nothing is loaded from the internet and the engine's footer link is off (`credit:false`). The claw machine is still drawn with [Colorfigures](https://april-zhu.com/colorfigures) by April Zhu (MIT), built on ISO-GLOW by April Zhu (MIT) and iso-figure by Tolga Cohce (MIT); see Credits above for the licence notice.
- The zoom moves the engine's camera (yaw and pitch) and shrinks the SVG viewBox onto the pit, eased over game time. The claw-cam looks straight down (pitch 90), past the engine's usual 78-degree limit, by setting the camera directly.
- `window.__claw` gained `clock()`, `machines()`, `machine()`, `unlockAll()` (for the checks only, not saved), `cam()` and `views` next to jeremy.v1's `hold`, `seed`, `step`, `aim`, `prizes` and `under`.
