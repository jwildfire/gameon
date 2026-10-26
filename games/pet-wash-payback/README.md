# Pet Wash Payback

> game where you're trying to wash pets (dog, cat, etc) as fast as possible in round 1 and then the pet is trying to wash you with a hose in round 2 and you're trying to escape and stay dry.

That's the whole idea, word for word, from Jeremy on the GameOn New Game page (game idea #157). Built by Claude Opus 5.5 from the [eval's build brief](https://github.com/jwildfire/gameon/issues/157).

**Play:** https://jwildfire.github.io/gameon/#pet-wash-payback, or open `index.html` straight from this folder. No internet needed.

## How to play

Five pets, two rounds each.

**Round 1: Wash!** A muddy pet hops in the tub. Every mud spot needs three things, in order:

1. **Soap** (key `1`): drag over the mud to scrub it into bubbles.
2. **Rinse** (key `2`): spray the bubbles off.
3. **Towel** (key `3`): rub the wet patch dry.

Get every spot sparkling before the clock runs out. The faster you finish, the more stars. The tool you need next wiggles in the tool bar, and the pet won't hold still:

- **Biscuit the Dog** does a big shake now and then.
- **Mittens the Cat** hates water. Rinse her too long and she jumps to the other side of the tub, and she keeps trying to climb out.
- **Clover the Bunny** hops all over the tub.
- **Truffle the Pig** rolls around and gets clean spots muddy again.
- **The surprise pet** loves water and paddles round and round. (Play to find out who.)

**Round 2: Payback!** The pet you just washed grabs the hose and chases you around the backyard. Run with the arrow keys or WASD, or drag anywhere on the screen to use the joystick. Stay dry until the timer runs out. The shed, the trampoline, the laundry on the line and the bushes all block the water, so hide behind them. The wetter you get, the fewer stars; hit 100% and you're **SOAKED**.

- Biscuit chases you and sprays in bursts. Watch for the **!** before each one.
- Mittens hides in the bushes and pops out to ambush you. Watch for a rustling bush with glowing eyes.
- Clover hops up close, then swishes like a sprinkler. Get out of range.
- Truffle's spray is super wide, and his mud puddles slow you down.
- The surprise pet lobs water balloons that bounce once and splash. The shadow shows where.

**P** or Esc pauses, **R** restarts the round, **M** turns the sound on and off. Your best stars for each pet and your best total score (for a run that starts with Biscuit) are saved on this device. **Pick a pet** on the title screen starts from any pet you've reached.

## Notes for builders

- Plain HTML and JavaScript in two files: `index.html` (screens and styles) and `game.js` (everything else). No build step, no libraries, nothing loaded from the internet.
- All the art is drawn on a canvas in code, and all the sounds and the music are made with WebAudio.
- Saves use `localStorage` keys starting `gameon.pet-wash-payback.` (`best`, `reached`, `muted`), wrapped in try/catch so blocked storage doesn't stop the game.
- `window.__pwp` is a small hook for the evidence checks (`tests/evidence/157-pet-wash-payback.spec.mjs`): it can freeze the clock and step the game, so the checks can play every round with the same inputs a player has.
