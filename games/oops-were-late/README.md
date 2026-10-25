# Oops! We're Late!

> “Opps! We’re late to settling in…”
>
> Parents try and silently carry their kids to an empty seat in a circle of children and parents without being detected by the teachers or kids..

That's the whole idea, word for word, from NotClay on the GameOn New Game page (game idea #167). Built by Claude Opus 5.5 from the [eval's build brief](https://github.com/jwildfire/gameon/issues/167).

**Play:** https://jwildfire.github.io/gameon/#oops-were-late, or open `index.html` straight from this folder. No internet needed.

## How to play

- You're a grown-up who's late, carrying your kid on your hip. Story time has already started. Tiptoe from the door to the one **empty cushion** in the circle.
- The **teacher** reads the story. Every so often she stops, looks up and **scans the room**: her reading murmur stops, a "…" bubble pops up and a dashed red arc shows where she's about to look. **Freeze**, or get behind something (shelves, plants, the piano, the cake table...).
- **Kids** in the circle wriggle (a "~" bubble) and then **turn round** for a look. Kids facing the middle can see across the rug, so don't cut through the circle.
- Everyone who can see you has a **view cone**. It turns red when they're looking right at you, and a "noticing" ring fills round their head: fast if you walk, slower if you tiptoe, very slowly if you freeze. Hide and it drains away.
- If the teacher notices you, or **three** kids (or grown-up helpers) do, it's **“Oh, you're late!”** and you try the room again.
- **Creaky boards** (the dark planks) creak if you walk on them, and **squeaky toys** squeak if you kick them. Heads turn toward the noise! Tiptoe over boards to keep the creak small, and step round toys.
- A **napping toddler** wakes up if you walk too close without tiptoeing, and her "WAAAH!" makes everybody look.
- 8 rooms: Classroom Circle, Library Story Time, Music Class, Birthday Party, Nap-Time Nook, Art Class, Gym Circle and The Big Puppet Show. **3 stars** if nobody noticed you at all, 2 if one did, 1 if two did. Your best stars are saved on this device.

**Controls:** arrow keys or WASD to move, hold **Shift** to tiptoe (quieter but slower), hold **Space** to freeze, P or Esc to pause, R to restart the room. On a phone or tablet, **hold your finger** where you want to go and you tiptoe toward it; keep your finger close to you (inside the dashed ring) for extra-quiet tiptoeing; **let go to freeze**. Plays upright.

## Notes for builders

- `engine.js` is the whole room: the parent, the teacher and helpers, the kids, view cones, noticing meters, noises, toys and the toddler, stepped 60 times a second. It has no drawing, sound or clock, so the same code runs in the game and in the room checker.
- `bot.js` is a robot sneaker that plays a room through the engine the way a careful player would: it plans a route that stays behind things and freezes when someone's about to look. `node games/oops-were-late/tools/check.mjs 12 0.45` lets it play every room with 12 different kid moods, reacting about half a second late like a person, and fails if any run doesn't make it to the seat. It prints the times and how long it spent frozen, so you can see the rooms ramp up. The title screen uses the same robot to sneak behind the menu.
- `art.js` draws everything with canvas shapes: floors, rugs, furniture, the chunky top-down people, cones and bubbles. No image files.
- `game.js` handles the screens, the touch and keyboard controls, the sound (made in the browser with WebAudio: the teacher's murmur, tiptoes, creaks, squeaks, gasps) and saves.
- Saves live under `gameon.oops-were-late.` in the browser: `stars` (best stars per room) and `sound`.
- `window.__owl` is a small window used only by the evidence tests.
