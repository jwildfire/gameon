# Devil's Burger Station

> a burger station in hell where you have to make sure the food you’re preparing has hot sauce on it or the devils that ordered the food will be pissed off.

That's the whole idea, word for word, from NotClay on the GameOn New Game page (game idea #168). Built by Claude Opus 5.5 from the [eval's build brief](https://github.com/jwildfire/gameon/issues/168). Jeremy approved it on 2026-10-24 to keep the devils goofy cartoons and have them get "steaming mad" in the game.

**Play:** https://jwildfire.github.io/gameon/#devils-burger-station, or open `index.html` straight from this folder. No internet needed.

## How to play

- You run the burger counter in a warm lava-orange kitchen. Round little **devils** with tiny horns (and pitchforks they use as spatulas) walk up to the counter, each with a **ticket** over their head.
- The ticket shows the burger from the bottom bun up, and a sticker for the **hot sauce** they want: **MILD**, **FIERY** or **LAVA**.
- Tap the **ingredients** to stack the burger on your plate in the same order: Bun, Patty, Cheese, Lettuce, Tomato, Onion, Pickles and Peppers. Then squirt on the right hot sauce.
- **Tap the devil** to serve them (or press SERVE, and the burger goes to whoever ordered it).
- A perfect burger pays its price plus a **tip**: faster means bigger tips. Three perfect burgers in a row is a **COMBO** and doubles the tips; six in a row triples them.
- Forget the hot sauce, or squirt on the wrong one, and the devil gets **steaming mad**: they turn redder, puff steam and stomp off. Same if their patience bar runs out. The right sauce on the wrong burger just gets a grumble and half the price.
- Three steaming mad devils and the shift is over. Feed everyone else to clear it, with up to 3 stars for coins.
- 5 shifts, each busier than the last: Breakfast Burgers, Lunch Rush (LAVA sauce arrives), Fussy Afternoon (three devils at once, and fussy devils in bow ties and monocles who want extra toppings, wait less and tip more), Double Trouble Dinner (some devils order two burgers) and Big Boss Midnight Feast, which ends with **Big Boss Blaze** and the two biggest burgers in the underworld.
- Your best score (all the shifts you clear in one go) and the shifts you've unlocked are saved on this device.

**Controls:** tap the ingredient and sauce buttons, then tap the devil. Keyboard: 1 to 8 for the ingredients, M, F and L for the sauces, Enter (or Space) to serve, Backspace to undo, T to trash the burger, the arrow keys to pick which devil Enter serves when the burger doesn't match anyone, and P or Esc to pause. Plays upright or sideways.

## Notes for builders

- `engine.js` is the whole counter: shifts, devils, tickets, patience, tips and combos. It has no drawing, sound or clock, so the same code runs in the game and in the shift checker. Each shift's devils and orders come from a seed: the game picks a new one each time, and the checks use fixed ones.
- `bot.js` is a robot cook that taps one thing at a time like a careful player. `node games/devils-burger-station/tools/check.mjs` lets it play every shift with 10 seeds at four speeds (0.45 to 1 second a tap, with some wrong taps) and fails if the careful cook (0.6 seconds a tap) loses any shift. It prints how the slower cooks do, so you can see the shifts get harder. The title screen uses the same robot to cook behind the menu.
- `art.js` draws everything with canvas shapes: the devils, the burger layers, the sauce bottles, the lava lamps and the bubbling sauce pots. No image files.
- `game.js` handles the screens, the drawing, touch and keyboard, the sound (made in the browser with WebAudio, including the bouncy cooking tune) and saves.
- Saves live under `gameon.devils-burger-station.` in the browser: `best` (best score), `progress` (shifts unlocked, best stars and coins per shift) and `sound`.
- In the game the devils get "steaming mad", never anything ruder, and there's no swearing anywhere in it. NotClay's own words stay as they are above.
- `window.__dbs` is a small window used only by the evidence tests.
