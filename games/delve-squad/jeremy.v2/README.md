# Delve Squad

> Torch-lit halls, glowing loot cards, and the Rat King waiting for your heroes.

The kid's own words are in the private idea jwildfire/gameon-ideas#7. Designed by Jeremy; built by Claude Opus 5.5 from the eval's build brief.

**Play:** https://jwildfire.github.io/gameon/#delve-squad, or open `index.html` straight from this folder. No internet needed.

## How to play

- **The halls.** Each floor is a short, winding run of rooms on a little map in the corner, and a new layout every run. The monsters get tougher on every floor, and the halls change every five floors: Old Cellar, Mossy Crypt, Frost Caves, Ember Deep and Shadow Halls.
- **Bosses.** The Rat King holds the last room of Floor 5, with rats at his call. The Bone King waits on Floor 10, the Frost Wyrm on 15, the Ember Lich on 20 and the Shadow Dragon on 25, and after that they come back as Elders. Beat one and the next campfire has a Legendary card.
- **Choose three heroes.** Fighter, Rogue, Cleric or Wizard, in any mix (three Wizards is allowed). Each has a special move that charges up during a fight (the blue bar under their name):
  - **Fighter: Shield Wall.** Takes much less damage for a few seconds and makes the monsters come for them.
  - **Rogue: Shadow Step.** Vanishes and pops up next to the weakest monster for a huge hit.
  - **Cleric: Healing Light.** Heals whichever friend is hurt the most.
  - **Wizard: Fireball.** A blast that hits every monster in a bunch.
- **The delve.** When the door opens, the heroes pick their own targets and throw their moves the moment they're charged. Sit back and cheer, or speed it up with the **1× / 2× / 3×** button. Monsters don't bleed; they go *poof* in a shower of sparks. Between rooms the heroes still standing catch their breath.
- **The campfire.** Before each floor there's a pile of loot: two more cards than heroes. Each hero takes **one** card. A weapon adds ATK, armor adds DEF and HP, and a charm adds a trick (Vampire Fang, Lucky Clover, Troll Moss, Spiky Ring, Swift Feather or Power Rune). A new item replaces the one in that slot. Cards glow by how rare they are: white, blue, purple, and gold for Legendary. Each card says what it would change for the hero you've picked.
- **Resting.** After every floor the whole squad levels up and heals some. A hero who was knocked down gets back up with a little health.
- **The end.** When all three heroes are down in the same floor, the run is over. The deepest floor you reach is saved, and you can go again with the same squad or pick a new one.

**Controls:** touch or mouse everywhere. Keyboard: on the squad screen **1–4** add a class (or move to one with **WASD** or the arrows and press **Space**), **Backspace** removes one, **R** picks a random squad and **Enter** starts; at the campfire **A D** or **← →** (or Tab) choose a hero, **W S** or **↑ ↓** move through the loot and **Space** gives that card, **1–7** give a card straight away (press it again to put it back) and **Enter** delves; in a fight **Space** or **F** changes speed; **P** or **Esc** pauses (Keep going, Start over, Sound, Title screen); **M** turns the sound off. On a tall phone screen the rooms turn tall too, so the squad marches up the screen. Plays upright or sideways.

## Notes for builders

- `sim.js` has the rules and nothing else: the classes, items, monsters, bosses, floor layouts and the fights. It runs in fixed 1/60 s steps with its own seeded random numbers, so one seed always makes the same floors, loot and fights.
- `art.js` draws everything with canvas shapes: heroes, monsters, bosses, loot icons, rooms, torches and the floor map. No image files.
- `sound.js` makes every sound with WebAudio. No sound files.
- `game.js` has the screens, the torch-light darkness, the hit numbers and sparks, the controls and the saves.
- Saves live under `gameon.delve-squad.` in the browser: `best` (the deepest floor), `runs` (how many delves) and `sound`.
- `window.__ds` is a small window used only by the evidence tests (seed the dice, hold and step the clock, play quickly to a floor, read the state).

## jeremy.v2: Bigger buttons, and WASD at the campfire

Update idea from Jeremy (game idea #231), word for word:

> Make Delve Squad comfortable on a phone and with a keyboard, so it meets the phone bar from the phone-friendly games task (jwildfire/gameon#187): every button at least 48 x 48 px at 375 px wide, 8 px clear of each other and the screen edges, and both WASD and the arrow keys working. Measured on jeremy.v1 on 2026-10-29:
>
> - Sound (title screen) and the pause buttons are 42 x 42. In the delve, the speed button is 52 x 42 and only 6 px from the pause button.
> - At the campfire, the hero cards and the loot cards are 7 px apart.
> - A and D do nothing. Only ArrowLeft and ArrowRight pick a hero at the campfire, and no key moves between the loot cards (only 1-7).
>
> Make Sound, Pause and speed 48 x 48 with 8 px between them, space the hero and loot cards 8 px apart, and let A/D pick a hero like the arrows (with W/S or Up/Down moving through the loot). Keep everything else the same.

Started from jeremy.v1. Sound, Pause, the back button and the speed button are 48 x 48, 8 px apart and 8 px from the screen's edges (on a phone with a notch, right at the edge of its safe area), every other button is at least 48 px tall, and the hero, loot and squad cards sit 8 px apart. A/D pick a hero like the arrows, W/S or Up/Down move through the loot and Space takes a card. Held sideways on a phone, the pause and game-over boxes put their buttons beside the words, so every button fits on screen. The heroes, halls, bosses, loot, balance and saves are jeremy.v1's.
