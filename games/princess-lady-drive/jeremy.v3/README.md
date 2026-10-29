# Princess Lady Drive

A drive-around game designed by a 4-year-old, built with Claude.

> "I want a game where you can drive around. You can also get out of the car. And also, and you don't have to buy anything. Everything's free. And you're a lady. A princess lady."

Queen Rosie drives around a little town, hops out of her car, and goes inside shops where everything is free.

- **Shops you can walk into:** ice cream, balloons, dresses, pets, cars, flowers, cupcakes, puppets (wear one on your hand), books at the library, Five Friends Burgers, and a Halloween store
- **The castle:** a throne, a treasure chest, a crown stand, a royal cake, a piano, a bed, and a royal pool. Bring things home from the Halloween store to decorate it.
- **Movie theater:** pick a seat and watch a cartoon
- **Outside:** a car lot full of cars to hop into, a race track that counts laps, a golf course, a soccer field, a car wash and a duck pond
- **Two more cities:** a highway east to Beach City (toys, candy, aquarium, hair salon, bounce house, ocean) and south to Snow City (pizza, hot cocoa, a baby animal zoo, snowmen)
- **Lava obstacle courses:** Lava Jump and Lava Castle. Jump between stones and trampolines; fall in the lava and you start over
- **A REALLY big car** parked by the castle
- **The map button** jumps anywhere

## Play

Open `index.html` in a browser. Nothing to install. It works with touch (tap to go, hold to keep going), mouse, or keyboard (arrows/WASD, Space to get in or out, H to beep).

Progress (balloons, pets, decorations) is saved in the browser.

## Editing

`src/game.html` is the source. Run `./build.sh` to regenerate the standalone `index.html`.

## jeremy.v2: More rooms in the castle!

Update idea from Jeremy (game idea #122), word for word:

> More rooms in the castle!

Started from jeremy.v1. The castle's big room is now the Great Hall, with four doors in its back wall: a Ballroom (a light-up dance floor, a disco ball, a music box and dancing friends), the Tower Top (up the winding stairs, with a telescope that looks out over the town, a flag to raise and a bell), a Royal Kitchen (put strawberries, chocolate, bananas or rainbow sprinkles in the pot and stir it for a surprise treat) and a Toy Room (a rocking horse, a block tower to knock down and a little dollhouse castle). Each room's bottom door goes back to the Great Hall, and **Go out** still leaves the castle from anywhere.

## jeremy.v3: Enter to start, keys for Map and Help

Update idea from Jeremy (game idea #222), word for word:

> Make Princess Lady Drive comfortable on a phone and with a keyboard, so it meets the phone bar from the phone-friendly games task (jwildfire/gameon#187): every button at least 48 x 48 px at 375 px wide, 8 px clear of each other and the screen edges, and both WASD and the arrow keys working. Measured on jeremy.v2 on 2026-10-29:
>
> - The Help screen's Start over button is 106 x 43.
> - Enter and Space don't start the game from the title card. It takes six presses of Tab to reach Let's go!.
> - Map, Sound and Help have no keys.
>
> Make Start over at least 48 px tall, let Enter or Space start from the title card, and add keys for Map, Sound and Help (M, S, ?). Everything else already passes. Keep everything else the same.
>
> This game also lives in jwildfire/princess-lady-drive. Making the same fix there too means the next import from that repo won't bring the old controls back.

Started from jeremy.v2. It's the phone and keyboard pass from the phone-friendly games task (#187), and nothing else changes:

- **Start over** in Help is now 48 px tall (it was 43), so it meets the 48 x 48 px bar at 375 px wide.
- **Enter or Space starts** from the title card, the same as tapping Let's go!. No more tabbing to the button.
- **Keys for the corner buttons:** **M** opens the map, **V** turns the sound on or off, and **?** opens Help. Pressing M or ? again (or Escape) closes them.
- **Why V and not S for Sound:** S is already "down" in WASD, for driving and walking. If S also switched the sound, every time a player drove down the sound would flip. V is free (think "volume"), and the help card lists it.
- **P pauses:** it opens Help, which already stops the town until you press Back to the game (or P again). It's the keyboard twin of the ? button, so a keyboard player has a pause key.
- The map's place buttons get whole-pixel line heights (each 1 to 2 px taller). Their 8 px gaps were exactly 8 px but sat on half pixels, so a measurement could round them down to 7.
- The help card's keyboard line lists the new keys, and the card is 60 px wider on big screens (600 px, was 540), so it still fits without scrolling on a laptop, even with Start over armed.

Driving, the town, the shops, the castle and every other button stay as they were. Saves are the same key and format as jeremy.v2, so the two versions (and jeremy.v1) share them.
