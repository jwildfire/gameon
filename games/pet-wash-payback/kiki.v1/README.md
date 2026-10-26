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

## jeremy.v2: More animals, and they all want payback

Update idea from Jeremy (game idea #163), word for word:

> Fun! Make it so there are more and funnier types of animals. 10 squirrels. a bird flying around etc. Then make it so you have to escape from all the animals in future rounds. give them all different ways to get you wet. only 1 with hose. waterguns. etc.

Started from jeremy.v1. Four new animals join the wash (the Nutty Gang, 10 squirrels in one tub; Pickles the parrot, who flies around the bathroom until you tap him; Bubbles the hippo, who keeps sinking; Inky the octopus, who grabs your tools), and every payback round now has all the animals you've washed so far after you at once, each with its own way to get you wet. Only Biscuit has the hose.

### What's new

Nine pets, in this order: Biscuit, Mittens, **the Nutty Gang**, Clover, **Pickles**, Truffle, **Bubbles**, **Inky** and the surprise pet.

New in the tub:

- **The Nutty Gang (10 squirrels)** scurry around the tub, and every few seconds the whole gang scrambles. Each squirrel has a muddy belly. Clean ones hop out and sit on the front of the tub.
- **Pickles the Parrot** flies around the bathroom squawking. Tap (or click) him to catch him; he sits in the tub for a few seconds, then flies off again until you catch him again.
- **Bubbles the Hippo** sinks under the water every few seconds, so the spots below her eyes are out of reach until she comes back up.
- **Inky the Octopus** grabs the tool you're holding now and then. Use another one until he gives it back.

**Payback rounds:** after each wash, every animal you've washed in this run chases you around the yard at once. Each one has its own way to get you wet, its own look and its own sound, and a name tag shows who's who when it joins in:

| Pet | How it gets you wet | Watch for |
|---|---|---|
| Biscuit | **the hose** (the only one!) | the **!**, then a long spray; hide behind things |
| Mittens | **squirt gun**, pew pew pew | a rustling bush with glowing eyes |
| The Nutty Gang | **bucket dump** | a bucket floating over you and its shadow; get out before it tips |
| Clover | **sprinkler**, tick tick tick | she hops close, then swishes it back and forth |
| Pickles | **his own rain cloud** | he flies over walls; little shadows show where drops will land |
| Truffle | **mud puddle splash** | he charges at the puddle next to you and cannonballs. SPLOOSH |
| Bubbles | **belly-flop wave** | she jumps (**!**), lands, and a ring of water rolls out; the shed and trampoline stop it |
| Inky | **eight squirt guns** | he stops and spins up, then fires all eight arms while turning |
| The surprise pet | **water balloons** | the shadow shows where it will splash |

With more pets in the yard, the round gets a little longer, each pet waits a little longer between attacks and each hit is a bit smaller, so it gets busier and wetter round by round but you can still escape. To keep it readable on a phone, at most 4 chase you at once (5 on a bigger screen). The rest cheer from the bottom fence and tag in every few seconds. The pet you just washed and Biscuit always play.

### Saves

jeremy.v1 saved `gameon.pet-wash-payback.best`, `.reached` and `.muted`. This version reads all three and never changes `best` or `reached`: the pets you reached there are open here, your best stars there show in **Pick a pet**, and your jeremy.v1 best score shows on the title screen until you set one here. It keeps its own progress in `gameon.pet-wash-payback.jeremy.v2.best` and `gameon.pet-wash-payback.jeremy.v2.reached`, and shares the sound setting (`muted`) with jeremy.v1.

Evidence: `tests/evidence/163-pet-wash-payback-jeremy-v2.spec.mjs`, with `window.__pwp` hooks as in jeremy.v1 (plus `start(i, kind, lineup)` and `petScreen()`).

## kiki.v1: Leo the Lion and a new place to run

Update idea from Kiki (game idea jwildfire/gameon-ideas#6), a fork of jeremy.v2 (jeremy.v2 stays the game's default):

> Meet Leo the Lion, plus a brand-new place to escape the soggy payback!

The kid's own words are in the private idea jwildfire/gameon-ideas#6.

Started from jeremy.v2. Leo the Lion is the 10th pet, and after three payback rounds in the backyard the payback moves to school: a hallway, a classroom and a playground.

### Leo the Lion

Ten pets now, in this order: Biscuit, Mittens, the Nutty Gang, Clover, Pickles, Truffle, Bubbles, Inky, **Leo** and the surprise pet. Leo is open in **Pick a pet** from the start (marked NEW!), so you can go straight to him.

- **In the tub:** his huge mane is muddy brown and turns golden as it gets clean. Mud spots out in the mane take extra soaping (1.75 times as much as a normal spot).
- **The roar:** every six seconds or so his mane puffs up as he takes a big breath ("rinse the bubbles!"), then he lets out a silly ROAR that ends in a squeak. It blows the bubbles off one soapy spot, which goes back to mud. Rinse soapy spots before he roars. (At most four spots per bath.)
- **All clean:** he shakes his mane dry, FWOOMF, and drops fly everywhere.
- **Payback: the mane shake.** He runs up close, stops, and his mane puffs up (with a **!**): that's the warning. Then he shakes, and two rings of drops fly out all around him. Get away, or put something solid between you.

### The school

Which place each payback round is in:

| Pets | Place | Cover | Mittens hides in |
|---|---|---|---|
| Biscuit, Mittens, the Nutty Gang | the backyard | the shed and the trampoline | the bushes |
| Clover, Pickles | the school hallway | two banks of lockers (and paintings drying on a line) | backpack piles |
| Truffle, Bubbles | the classroom | two rows of desks and the teacher's desk | beanbags |
| Inky, Leo, the surprise pet | the school playground | the slide and the climbing frame (and the swings) | bushes |

Every animal keeps its own way of getting you wet; only Biscuit has the hose, and at school it's hooked up to the drinking fountain. The round intro shows the place (and, before a wash, where that pet's payback will be), and so does each card in **Pick a pet**.

Everything else is as in jeremy.v2: the nine pets, the controls, the chaser cap, the stars and the look. One fix: in jeremy.v2 a finished wash also showed "Time's up!" and played the soaked sound; here it says "Squeaky clean!".

### Saves

This version reads jeremy.v1's keys (`best`, `reached`) and jeremy.v2's (`jeremy.v2.best`, `jeremy.v2.reached`) and never changes them: pets you reached there are open here, your best stars from either show in **Pick a pet**, and your jeremy.v2 (or jeremy.v1) best score shows on the title until you set one here. It keeps its own progress in `gameon.pet-wash-payback.kiki.v1.best` and `gameon.pet-wash-payback.kiki.v1.reached`, and shares the sound setting (`muted`).

Evidence: `tests/evidence/ideas-6-pet-wash-payback-kiki-v1.spec.mjs`, with the same `window.__pwp` hooks (plus `placeOf(i)`, `PLACES`, `spotMax` and `MANE_HP`).
