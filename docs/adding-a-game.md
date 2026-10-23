# Adding a game to the arcade

The arcade ([`index.html`](../index.html)) shows whatever is in [`games.json`](../games.json),
in that order. Adding a game takes two things: an entry in `games.json` and a cover image.
No arcade code changes.

## The games.json entry

```json
{
  "slug": "mazeathon",
  "title": "MazeAThon",
  "tagline": "A pocketful of shapes. Three curious mazes. Some very cute monsters.",
  "credit": "Designed with Ryan",
  "url": "games/mazeathon/",
  "repo": "https://github.com/jwildfire/gameon",
  "color": "#df715a",
  "tags": ["New", "Maze adventure", "1 player"]
}
```

| Field | Required | What the arcade does with it |
|---|---|---|
| `slug` | Yes | The game's id. It's the deep link (`https://jwildfire.github.io/gameon/#mazeathon` opens the game straight away) and the cover file name, `assets/covers/<slug>.jpg`. Lowercase, with hyphens between words if you like, and never change it once live, since links depend on it |
| `title` | Yes | The card heading and the name in the game switcher |
| `tagline` | Yes | One line under the title. Write it for a kid |
| `credit` | No | A short line under the tagline in the kid-credit style: "Designed by a 4-year-old", "Designed with Ryan" |
| `url` | Yes | Where the game is played: the iframe source, and the "open in its own tab" link. See below |
| `repo` | Yes | The game's source repository. Kept for people and tools; the arcade page doesn't show it |
| `color` | Yes | The card's tint, as a hex color |
| `tags` | No | Small labels on the card. `"New"` gets the dark highlight style; others are plain. Useful ones so far: player count, "Little kids", "History", "Turn sideways", "Needs internet" |

So far, new games go at the top of the list with a `"New"` tag.

## Relative and absolute URLs

- **A game in this repo** (under `games/<slug>/`) uses a **relative** URL such as
  `games/mazeathon/`. The browser resolves it against the arcade page, so the same entry
  plays `/gameon/games/mazeathon/` on production and `/gameon/dev/games/mazeathon/` on dev.
  A change to the game shows up on the dev arcade first, like any other change.
- **A game in its own repo** uses an **absolute** URL to its own GitHub Pages site, such as
  `https://jwildfire.github.io/trampoline-battle/`. Both the production and dev arcades
  play that same live copy, so changes to it skip GameOn's `dev` stage entirely.

Either way the game runs inside an iframe (with fullscreen, autoplay and gamepad allowed),
so it must allow being framed by `jwildfire.github.io`. GitHub Pages sites do by default.

## The cover

- One JPEG per game at `assets/covers/<slug>.jpg`, **800×450** (16:9). Every existing cover
  is that size.
- It's cropped to fill the card and the switcher tile, so keep the important part near the
  middle and leave the edges plain.
- Make it from the game itself (a screenshot or the game's own artwork). MazeAThon's cover
  is its original [`cover.svg`](../games/mazeathon/cover.svg) exported to JPEG.

## A game that lives in this repo

Put everything in `games/<slug>/`, starting from an `index.html` that works when opened
directly or served from that folder. Follow the game rules in [AGENTS.md](../AGENTS.md)
(plain HTML/JavaScript, phone and laptop, no console errors, keep the kid's ideas), and
prefix any `localStorage` keys with `gameon.<slug>.` so games don't collide.
[`games/mazeathon/`](../games/mazeathon/README.md) is the worked example. It also carries a
`gameon.json` card file from the [Blueprint's game contract](https://jwildfire.github.io/gameon/artifacts/2026-10-22-gameon-design/);
the arcade doesn't read that file yet, only `games.json`.

## Checklist

1. Add the entry to `games.json` and the cover to `assets/covers/`, in a task branch.
2. Serve the repo locally (`python3 -m http.server 8765`, then open
   http://localhost:8765/) and check: the card shows with its cover, the game launches and
   plays, the switcher can move to another game and back, and Home unloads it. Try a phone
   width too.
3. Open the PR into `dev` with that evidence. After it merges, check
   https://jwildfire.github.io/gameon/dev/#<slug> once the deploy finishes.
4. The game reaches https://jwildfire.github.io/gameon/ with the next release.
