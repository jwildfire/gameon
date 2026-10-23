# MazeAThon

Game 7 for GameOn. A top-down maze escape game with shape keys, boost rooms, and cute monsters.

Status: design captured; gameplay implementation has not started.
Design task: [Capture the MazeAThon Game 7 design (#23)](https://github.com/jwildfire/gameon/issues/23).

## The designer's idea

> you collect shapes in a maze that fit different keyholes. you have to collect them all to escape. you can unlock different rooms. in the rooms, you get boosts that give xray vision, reveal map, invulnerability, fast speed. there are relatively slow monsters that will chase you for a short time when they have line of sight. and one big monster per main chunk that will attack if you get near (but they are all cute)

Follow-up decisions from Ryan:

- The name is **MazeAThon**, with this capitalization.
- The view is **top down**.
- When a monster catches you, it **sends you back to the section start**.

## Core loop

Explore the maze, collect shapes, use matching keyholes to unlock rooms, find boosts, and avoid monsters. Collect every required shape to escape.

The maze has multiple main sections (the designer's "main chunks"). Each section has a start location used when the player is caught. The number, size, and layout of those sections are still open.

## Confirmed rules

### Shapes and rooms

- Collect shapes in the maze.
- Different keyholes fit different shapes.
- Shapes let the player unlock different rooms.
- Rooms contain boosts.
- Escaping requires collecting all required shapes.

The exact door dependencies and exit interaction have not been decided. Do not assume that using a shape consumes it.

### Boosts

All four of these belong in the game:

| Boost | Confirmed ability |
| --- | --- |
| X-ray vision | See through walls |
| Reveal map | Reveal the maze map |
| Invulnerability | Protection from monsters |
| Fast speed | Move faster |

Duration, strength, collection/activation behavior, and stacking are open. X-ray vision and map reveal should have distinct purposes; what each reveals still needs a decision.

### Small monsters

- Move relatively slowly.
- Start a short chase when they have line of sight to the player.
- Walls must block the sight check.
- A catch sends the player back to the current section's start.

The chase duration and what happens after sight is lost are still open.

### Big monsters

- Exactly one big monster per main section.
- Attacks when the player gets near.
- A catch uses the same section-start reset.
- Big monsters are cute too.

Attack range, warning cues, movement, and recovery behavior remain open.

### Appearance and controls

- Use a top-down view.
- All monsters are cute, including the big ones.
- Follow GameOn's browser-game requirements: plain HTML/JavaScript, no server, and playable on a phone or tablet as well as a laptop.
- The exact character designs and control layout are not yet chosen.

## Open decisions

| Decision | What still needs choosing |
| --- | --- |
| Key reuse | Do shapes stay in the inventory after opening a door, or remain in their keyholes? |
| Catch progress | Are collected shapes, unlocked doors, and map discoveries kept after returning to the section start? |
| Visibility | How much of the maze is normally visible, and how do x-ray vision and map reveal differ? |
| Boost rules | Are boosts automatic or activated by the player, how long do they last, and can they stack? |
| Maze structure | How many sections and shapes, fixed or generated layouts, and how are sections connected? |
| Monster timing | Chase length, sight-loss behavior, big-monster attack range, and any warning or recovery time. |

## Suggestions for the first version

These are proposals, not additional confirmed rules:

- Keep collected shapes and opened doors after a catch so the penalty is lost travel time.
- Reuse shapes as keys so a boost room cannot spend a shape needed for the exit.
- Put section starts in safe positions so a reset cannot immediately trigger another catch.
- Show a clear warning before a big monster attacks.
- Make doors and keys recognizable by their shape, even without relying on color.

Any final implementation must guarantee that all required shapes and the exit are reachable, with no circular lock dependency.

## Implementation checks

When a build exists, verify these in a browser at laptop and phone sizes:

- A player can collect every required shape and escape.
- Matching shapes open the intended keyholes.
- Each of the four boosts has a visible, usable effect.
- A small monster cannot spot the player through a wall and its chase is brief.
- There is one big monster per main section, activated by proximity.
- Being caught returns the player to the correct section start.
- Controls work on touch and keyboard, with no console errors.

## Repository home

GameOn's current approach keeps games in their own repositories and links them from the arcade. MazeAThon's own repository, playable URL, and arcade entry have not been created by this design task.
