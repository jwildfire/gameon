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

**Controls:** tap cards, powers and the farm; drag to look around (on a phone the farm is bigger than the screen). Keyboard: **1-3** pick a card, **1-4** use a power (aims at the mouse, or at the best spot), **arrows** look around, **Space** speeds up (1×, 2×, 3×), **P** or **Esc** pauses, **M** turns the sound off. The pause screen has Start over. Plays upright.

## Notes for builders

- `engine.js` is the whole farm: tunnels, food, ants, fights, queens, cards and powers, stepped 30 times a second with its own seeded random numbers. It has no drawing, sound or clock, so the same code runs in the game, the title-screen demo and the balance checker. Ants find their way with shared distance maps (one per queen, one to the nearest food) where dirt costs more than tunnel, so they dig the shortest useful way.
- `bot.js` is a robot player. `node games/ant-farm-wars/tools/check.mjs 80` lets it play 80 whole games each with sensible picks plus powers, upgrades only, and random picks, and prints wins and places. With sensible picks it wins about two games in three; it fails if that drops under half, or if any game runs past 20 rounds.
- `art.js` draws everything with canvas shapes; `game.js` handles the screens, controls, sound (WebAudio: marching clicks, bites, digging, power effects, a little battle tune) and saves.
- Saves live under `gameon.ant-farm-wars.` in the browser: `record` (games played, wins, fewest rounds to win, best place) and `sound`.
- `window.__afw` is a small window used only by the evidence tests (seed a farm, hold the clock and step it).
