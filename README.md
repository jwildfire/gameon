# GameOn

Little games made with AI, designed by kids.

The kids dictate an idea, a grown-up steers a bit, and an AI coding agent builds the game in
about an hour. We've made seven so far and the kids have played them for hours. GameOn is
where they come together: one mini-games repo, a repeatable workflow (and agent skills) for
adding a new game, and maybe an iPhone app on top. Think Roblox, but the games are made
with AI.

The bet: AI can make a fun game in an hour, just not in real time. So the product is the
workflow that gets from a kid's prompt to a playable game.

## The games so far

| Game | What it is | Repo | Status |
|---|---|---|---|
| [MazeAThon](https://jwildfire.github.io/gameon/dev/#mazeathon) | Find twelve shape keys across three mazes, unlock boost rooms, and escape some very cute monsters | [games/mazeathon](games/mazeathon/) in this shared repo | Playable on dev |
| [Angry Dudes](https://jwildfire.github.io/angry-dudes/) | Pixel-art slingshot siege through history: 10 armies, 37 real battles | [angry-dudes](https://github.com/jwildfire/angry-dudes) | Live (has an early `ios/` wrapper) |
| [Magic Friends, Up We Go!](https://jwildfire.github.io/magic-friends/) | Climbing game: a mermaid, a fairy and a unicorn vs. a grumpy witch, 60 levels | [magic-friends](https://github.com/jwildfire/magic-friends) | Live |
| [Timed Out](https://jwildfire.github.io/timedout/) | Put Wikipedia events in order on a timeline; three strikes and you're out | [timedout](https://github.com/jwildfire/timedout) | Live |
| [Stretcher Bearer](https://jwildfire.github.io/stretcher-bearer/) | A WWI medic carrying the wounded in from the trenches, 1914 to 1918 | [stretcher-bearer](https://github.com/jwildfire/stretcher-bearer) | Live |
| [Princess Lady Drive](https://jwildfire.github.io/princess-lady-drive/) | Drive around Queen Rosie's town, where everything is free (designed by a 4-year-old) | [princess-lady-drive](https://github.com/jwildfire/princess-lady-drive) | Live |
| [Trampoline Battle](https://jwildfire.github.io/trampoline-battle/) | Two-player ragdoll brawl on a trampoline | [trampoline-battle](https://github.com/jwildfire/trampoline-battle) | Live |

All seven are static HTML/JavaScript with no server. **MazeAThon lives inside this shared
repository**, at [`games/mazeathon/`](games/mazeathon/), and deploys with GameOn. Its relative
arcade URL follows the current branch: `games/mazeathon/` on production, or
`dev/games/mazeathon/` on development. The six existing games remain deployed from their
own repositories with GitHub Pages; adding MazeAThon does not move or change them.
Future MazeAThon changes belong in `games/mazeathon/` and follow the shared task, dev, and reviewed-release workflow.

## How we work

Work is tracked in GitHub issues: objectives (the big goals) broken into tasks (one pull
request each). Every change happens on its own branch and lands in `dev` through a pull
request, then reaches `main` in an approved release. Both deploy automatically: `main` to
https://jwildfire.github.io/gameon/ and `dev` to https://jwildfire.github.io/gameon/dev/.
Two of us work here, with Claude Code and ChatGPT/Codex. [AGENTS.md](AGENTS.md) has the
rules every agent follows so nobody's work gets stepped on.

## Layout

| Path | What's there |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Instructions for every AI agent (Codex reads it directly; Claude Code reads it via `CLAUDE.md`) |
| [`CLAUDE.md`](CLAUDE.md) | Claude Code entry point, points at `AGENTS.md` |
| [`artifacts/`](artifacts/) | Reports, designs, screenshots and other outputs worth keeping |
| [`games/mazeathon/`](games/mazeathon/) | The complete in-repo MazeAThon game, its original idea, instructions, and gameplay checks |
| [`.github/`](.github/) | Issue and pull request templates |
