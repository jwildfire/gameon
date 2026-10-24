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
