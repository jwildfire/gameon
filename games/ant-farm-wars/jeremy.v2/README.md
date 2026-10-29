# Ant Farm Wars

> Grow your ant colony, choose its powers, and take on three rival farms.

The kid's own words are in the private idea jwildfire/gameon-ideas#2. Designed by Jeremy; built by Claude Opus 5.5 from the eval's build brief.

**Play:** https://jwildfire.github.io/gameon/#ant-farm-wars, or open `index.html` straight from this folder. No internet needed.

## How to play

- Four ant colonies live in the corners of one big glass ant farm: you're the **Gold Colony** (top left), against the **Red Biters**, **Blue Diggers** and **Green Munchers**.
- Your ants work on their own. **Workers** dig glowing tunnels to crumbs, seeds and the big sugar lump in the middle and carry food home. The queen turns food into more ants. **Soldiers** dig toward a rival's **queen chamber** and bite anything in the way.
- Before every round, **pick 1 of 3 cards**. There are 10 upgrades (Speedy Diggers, Quick Legs, Tough Soldiers, Sharp Jaws, More Workers, Bigger Army, Royal Jelly, Sweet Tooth, Fast Hatching, Nest Guards) and 4 powers (Fire Ants, Glue Spit, Tunnel Cave-in, Flying Scouts). Picking a power again makes it stronger. The rivals pick too, each in its own style, and you see what they took when the round starts.
- **Powers** sit in buttons at the bottom. Tap one, then tap the farm: Fire Ants burns enemies, Glue Spit slows them right down, Cave-in fills tunnels back in and squashes enemies (great for sealing your nest), and Flying Scouts fly straight over the dirt and land near where you tapped. Each power recharges after use.
- **Tap a rival's nest** to send your soldiers after that queen. Tap anywhere else to plant a flag where your soldiers gather (tap your own nest to guard the queen); tap the flag again to take it away.
- Bite a queen's health down to nothing and her colony is **knocked out**. Last colony standing wins. Later rounds bring bigger armies. Your best result (fewest rounds to win, or best place) is saved on this device.

**Controls:** tap cards, powers and the farm; drag to look around (on a phone the farm is bigger than the screen). Keyboard: **WASD** or the **arrows** move the cursor, **Enter** does what a tap does where the cursor is, **1-3** pick a card, **1-4** use a power (aims at the cursor, the mouse, or the best spot), **Space** speeds up (1×, 2×, 3×), **P** or **Esc** pauses, **M** turns the sound off. The pause screen has Start over. Plays upright.

## Notes for builders

- `engine.js` is the whole farm: tunnels, food, ants, fights, queens, cards and powers, stepped 30 times a second with its own seeded random numbers. It has no drawing, sound or clock, so the same code runs in the game, the title-screen demo and the balance checker. Ants find their way with shared distance maps (one per queen, one to the nearest food) where dirt costs more than tunnel, so they dig the shortest useful way.
- `bot.js` is a robot player. `node games/ant-farm-wars/tools/check.mjs 80` lets it play 80 whole games each with sensible picks plus powers, upgrades only, and random picks, and prints wins and places. With sensible picks it wins about two games in three; it fails if that drops under half, or if any game runs past 20 rounds.
- `art.js` draws everything with canvas shapes; `game.js` handles the screens, controls, sound (WebAudio: marching clicks, bites, digging, power effects, a little battle tune) and saves.
- `game.js` also has the keyboard cursor (jeremy.v2): `showCursor`, `stepCursor`, `cursorLabel` and `drawCursor`, and the camera follow in `frame`.
- Saves live under `gameon.ant-farm-wars.` in the browser: `record` (games played, wins, fewest rounds to win, best place) and `sound`.
- `window.__afw` is a small window used only by the evidence tests (seed a farm, hold the clock and step it).

## jeremy.v2: Play it with keys, and bigger buttons

Update idea from Jeremy (game idea #213), word for word:

> Make Ant Farm Wars comfortable on a phone and with a keyboard, so it meets the phone bar from the phone-friendly games task (jwildfire/gameon#187): every button at least 48 x 48 px at 375 px wide, 8 px clear of each other and the screen edges, and both WASD and the arrow keys working. Measured on jeremy.v1 on 2026-10-29:
>
> - The Speed, Sound and Pause buttons are 30 x 30, 4 px apart, and Pause is 6 px from the right edge.
> - WASD does nothing. The arrows only pan the farm: left and right on a phone, and nothing on a laptop, where the whole farm fits.
> - Placing the rally flag or sending the ants to attack works only by tapping. There's no key for it.
> - The Play, Keep fighting, Start over and Play again buttons are 47 px tall.
>
> Make the top buttons 48 x 48 with 8 px gaps and 8 px from the edge, and let WASD pan like the arrows. Add a keyboard cursor that moves with WASD or the arrows, where Enter places the rally flag. Make the menu buttons 48 px tall. Keep everything else the same.

Started from jeremy.v1. Speed, Sound and Pause are now 48 × 48, 8 px apart and 8 px from the screen's edges (safe areas included); on a phone the four queen chips sit in a 2 × 2 block so they fit. Every menu button (Play, Keep fighting, Start over, Play again, Title screen) is at least 48 px tall.

**The keyboard cursor, and how it shares the keys with scrolling.** WASD and the arrows do the same thing everywhere:

- **In a battle they move the cursor.** The first key shows it in the middle of the screen: white corner brackets around one cell, with a label under it saying what Enter will do there ("Flag here", "Attack Red!", "Guard the queen", "Take the flag away", or the power you've armed). Tap a key to move one cell; hold it and the cursor speeds up.
- **The farm scrolls to follow the cursor**, keeping it in the middle of the screen, so moving the cursor *is* how you look around with keys. On a phone, where the farm is wider than the screen, pressing A or ← scrolls the farm left straight away; on a laptop the whole farm fits, so the cursor moves and the farm stays put. The cursor and the scrolling never pull different ways because there's only one thing to steer. (The farm is never taller than the screen, so W/S and ↑/↓ only move the cursor.)
- **Enter does what a tap does at the cursor:** plants the rally flag, sends your soldiers at a rival's nest, guards your queen, takes the flag away, or fires an armed power. Number keys 1-4 aim powers at the cursor too.
- **Touch or the mouse takes over:** tapping or dragging the farm hides the cursor, and the next key brings it back where it was (or in the middle, if you dragged it off screen).
- **Between rounds**, while you pick a card (and on the title or pause screens), WASD and the arrows just scroll the farm, as the arrows did in jeremy.v1.

Nothing new is saved: it reads and writes jeremy.v1's `gameon.ant-farm-wars.record` and `gameon.ant-farm-wars.sound`.
