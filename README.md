# GameOn

Games our kids dream up out loud, built by AI.

## [Play the GameOn arcade](https://jwildfire.github.io/gameon/)

It runs in the browser on a phone, a tablet or a laptop. Nothing to install, no accounts,
no ads.

A kid describes a game: who's in it, what you do, what makes it funny. A grown-up hands
that idea to an AI coding agent, and about an hour later there's a game the kid can play.
GameOn is where those games live together, and where we're working out how to make the
next one even easier.

## The games

- **[MazeAThon](https://jwildfire.github.io/gameon/#mazeathon)**, designed with Ryan.
  Find twelve shape keys across three mazes, open boost rooms, and escape some very cute
  monsters.
- **[Trampoline Battle](https://jwildfire.github.io/gameon/#trampoline-battle)**, designed
  with Jeremy's kids. Drop fighters onto a trampoline and bounce the other team off. Cow
  drops and chicken attacks included.
- **[Princess Lady Drive](https://jwildfire.github.io/gameon/#princess-lady-drive)**,
  designed by a 4-year-old. Drive Queen Rosie around a town where everything is free.
- **[Stretcher Bearer](https://jwildfire.github.io/gameon/#stretcher-bearer)**, designed
  with Jeremy's kids. Carry the wounded in from the trenches as a WWI medic, 1914 to 1918.
- **[Angry Dudes](https://jwildfire.github.io/gameon/#angry-dudes)**. Sling troops, fire
  cannons and call in air strikes across 37 real battles from history.
- **[Magic Friends, Up We Go!](https://jwildfire.github.io/gameon/#magic-friends)**,
  designed with a 5-year-old. A mermaid, a fairy and a unicorn climb 60 levels to bring
  back the sunrise.
- **[Timed Out](https://jwildfire.github.io/gameon/#timedout)**. Put real events from
  Wikipedia in order. Three wrong guesses and you're timed out.

## How a game gets made

1. **A kid has an idea.** Usually said out loud, in one breath. MazeAThon started as
   "you collect shapes in a maze that fit different keyholes" and kept going from there.
2. **An AI agent builds it.** A grown-up passes the idea to a coding agent (Claude Code or
   ChatGPT/Codex) and steers a little. The kid's names, rules and silly ideas stay in.
3. **It goes in the arcade.** The agent plays the game in a browser to check it works. It
   shows up in a test copy of the arcade first, and a grown-up approves it before it
   reaches the real one.

**Coming next: Make a New Game.** A button in the arcade where a kid can say or type an
idea and then watch it move along ("Got your idea!", "Being built", "Play it now!"), with
a grown-up approving every step that matters. Read the
[Make a New Game design](https://jwildfire.github.io/gameon/dev/artifacts/2026-10-23-new-game-pipeline/);
the first, simplest version is being built now.

## Who's behind it

Jeremy ([@jwildfire](https://github.com/jwildfire)) and his friend Ryan
([@killjoy00](https://github.com/killjoy00)), their kids, who do all the designing, and a
few AI agents, who do the building. It's a for-fun project. Someday it might be an iPhone
app too.

## For builders

The technical side lives in **[docs/](docs/README.md)**:

- [How the repo is laid out](docs/layout.md)
- [Branches and deploys](docs/branches-and-deploys.md): `dev`, `main` and the automatic
  GitHub Pages deploy
- [Adding a game to the arcade](docs/adding-a-game.md): `games.json`, covers and URLs
- [Designs and artifacts](docs/designs-and-artifacts.md): every design, playtest and report
  we've kept

Agents (and people) working here follow [AGENTS.md](AGENTS.md). Work is tracked in
[GitHub issues](https://github.com/jwildfire/gameon/issues).
