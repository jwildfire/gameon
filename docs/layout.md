# How the repo is laid out

GameOn is a static site: no build step, no server, no package install needed to run it.
Whatever is in the repo is what GitHub Pages serves (see
[Branches and deploys](branches-and-deploys.md)).

| Path | What's there |
|---|---|
| [`index.html`](../index.html) | The arcade. One self-contained page: reads `games.json`, draws a card per game, and plays the chosen game in an iframe with a player bar (switch game, open in its own tab, back home) |
| [`games.json`](../games.json) | The list of games the arcade shows, in shelf order. See [Adding a game](adding-a-game.md) |
| [`assets/covers/`](https://github.com/jwildfire/gameon/tree/dev/assets/covers) | One 800×450 JPEG cover per game, named `<slug>.jpg` |
| [`games/`](../games/mazeathon/) | Games that live inside this repo. Today that's [`games/mazeathon/`](../games/mazeathon/README.md); the other six games live in their own repos |
| [`artifacts/`](../artifacts/README.md) | Designs, playtest reports, screenshots and other outputs worth keeping, one dated folder each. See [Designs and artifacts](designs-and-artifacts.md) |
| [`docs/`](README.md) | These pages |
| [`AGENTS.md`](../AGENTS.md) | The rules every AI agent (and person) follows here. Codex reads it directly |
| [`CLAUDE.md`](../CLAUDE.md) | Claude Code's entry point; it just loads `AGENTS.md` |
| [`.github/`](https://github.com/jwildfire/gameon/tree/dev/.github) | Issue templates (objective, task, game idea), the pull request template, and the deploy workflow |
| [`.claude/skills/`](https://github.com/jwildfire/gameon/tree/dev/.claude/skills) | The Make a New Game pipeline skills, `gameon-evaluate`, `gameon-build` and `gameon-check`, written for both Claude Code and Codex. `.claude/` is never deployed, and `.claude/worktrees/` (where Claude Code sessions keep their task worktrees) is git-ignored |
| `.nojekyll` | Tells GitHub Pages to serve files as they are, without Jekyll |

## Where the games live

| Game | Source | Played from |
|---|---|---|
| MazeAThon | [`games/mazeathon/`](../games/mazeathon/README.md) in this repo | The same Pages site as the arcade, so it deploys with every `dev` or `main` push |
| Trampoline Battle | [jwildfire/trampoline-battle](https://github.com/jwildfire/trampoline-battle) | https://jwildfire.github.io/trampoline-battle/ |
| Princess Lady Drive | [jwildfire/princess-lady-drive](https://github.com/jwildfire/princess-lady-drive) | https://jwildfire.github.io/princess-lady-drive/ |
| Stretcher Bearer | [jwildfire/stretcher-bearer](https://github.com/jwildfire/stretcher-bearer) | https://jwildfire.github.io/stretcher-bearer/ |
| Angry Dudes | [jwildfire/angry-dudes](https://github.com/jwildfire/angry-dudes) | https://jwildfire.github.io/angry-dudes/ (it also has an early `ios/` wrapper) |
| Magic Friends, Up We Go! | [jwildfire/magic-friends](https://github.com/jwildfire/magic-friends) | https://jwildfire.github.io/magic-friends/ |
| Timed Out | [jwildfire/timedout](https://github.com/jwildfire/timedout) | https://jwildfire.github.io/timedout/ |

The six games in their own repos deploy from those repos with GitHub Pages; changing
GameOn doesn't change them. Changes to MazeAThon belong in `games/mazeathon/` and go
through the usual task, `dev` and release flow here.

All seven are plain HTML and JavaScript that run in a browser with no server. MazeAThon
needs no internet connection at all; Angry Dudes loads its physics engine and fonts from
the web, and Timed Out needs the internet for its Wikipedia events.

## Coming soon

The [Make a New Game design](https://jwildfire.github.io/gameon/dev/artifacts/2026-10-23-new-game-pipeline/)
is being built in pieces. The Game idea issue form and the three pipeline skills have
landed; the New Game page (at `/gameon/new/`), the idea line and a Make a new game button
in the arcade are still in progress. This page will list them once they land.
