# MazeAThon

Game 7 for GameOn. A complete top-down maze escape game with shape keys, boost rooms, and cute monsters.

**Home:** [`games/mazeathon/`](../../games/mazeathon/) inside this shared GameOn repository. Ryan explicitly requested this location; the earlier suggestion to create a separate MazeAThon repository is superseded. No separate repository or setup is needed.

[Play in the development arcade](https://jwildfire.github.io/gameon/dev/#mazeathon) · [Game instructions and source](../../games/mazeathon/README.md) · [Playtest evidence](../2026-10-22-mazeathon-playtest/README.md)

## The designer's idea

> you collect shapes in a maze that fit different keyholes. you have to collect them all to escape. you can unlock different rooms. in the rooms, you get boosts that give xray vision, reveal map, invulnerability, fast speed. there are relatively slow monsters that will chase you for a short time when they have line of sight. and one big monster per main chunk that will attack if you get near (but they are all cute)

Ryan confirmed the name **MazeAThon**, a **top-down view**, and **return to the current section's start when caught**. He then requested the full game in the shared repository and its addition to GameOn.

## The complete adventure

Explore three themed maze sections: the Mossy Meadows, the Lavender Library, and the Moonlit Conservatory. Each has a circle, triangle, diamond, and star key. All four open that section's exit; all twelve are required to finish the adventure.

The world is generated from a seed. New adventures get new layouts; a seed reproduces the same three sections. Required shapes and exits are placed in the connected main maze, outside locked boost rooms, so keys never depend on opening their own locks. Alternate passages let players escape pursuing monsters.

### Shape keys and boosts

Keys are reusable. Walk into a matching door to unlock its room, then touch the boost inside to activate it. Rooms recharge after 30 seconds of active play.

| Key | Room boost | Effect |
| --- | --- | --- |
| Circle | X-ray vision | See shapes and monsters through walls for 14 seconds |
| Triangle | Reveal map | Reveal the complete current section on the map |
| Diamond | Invulnerability | Pass safely through monsters for 14 seconds |
| Star | Fast speed | Move faster for 14 seconds |

Timed boosts can stack up to 24 seconds. The explored map remains available without a boost; reveal map uncovers the entire section, while x-ray reveals otherwise hidden entities in the main view.

### Monsters and catches

Small cute monsters patrol slowly, begin a short 3.8-second chase when they have line of sight, and then return. Walls block sight; after losing the player they search the last seen position. Each section has exactly one larger cute monster with a warning before its short proximity-triggered attack.

Being caught sends the player to that section's camp. Collected shapes, opened doors, and map discoveries are retained. A short safety shield prevents an immediate repeat catch. There are no limited lives.

### Controls and game screens

- Keyboard arrows or WASD, plus touch arrows on phones/tablets.
- Map, short hint trail, help, sound toggle, and pause/resume.
- Automatic pause on tab changes and progress saving in the current browser.
- Continue, confirmed fresh start, section transitions, completion statistics, best finish, and replay.
- Original canvas/SVG artwork and locally generated sound, with no external assets, fonts, network calls, or backend.
- Direct-file/offline play; blocked storage falls back to play without saving.

## Verification

Nine model checks pass, including an independent reachability audit of 150 generated sections. A full keyboard-driven browser playthrough collects all twelve keys, activates all four boosts, survives normal catches, and reaches the completion screen without altering game state. Phone touch controls, portrait/landscape layouts, a small phone layout, save recovery, offline play, and blocked-storage handling pass without console errors.

The [game playtest report](../2026-10-22-mazeathon-playtest/README.md) contains reproducible commands and screenshots. The [arcade integration report](../2026-10-22-mazeathon-integration/README.md) covers launching, switching, returning home, and production/development URL handling.

Tracking: the design capture task (#23), the game implementation task (#25), and the shared arcade integration task (#26).
