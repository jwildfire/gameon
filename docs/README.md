# GameOn docs

The technical side of [GameOn](../README.md): how the repo fits together, how changes get
to the arcade, and how to add a game. Start with the page you need.

| Page | What it covers |
|---|---|
| [How the repo is laid out](layout.md) | Every top-level file and folder, and what reads what |
| [Branches and deploys](branches-and-deploys.md) | `dev` and `main`, the GitHub Pages deploy workflow, and the branch rulesets |
| [Adding a game to the arcade](adding-a-game.md) | `games.json` fields, cover images, relative and absolute play URLs |
| [Designs and artifacts](designs-and-artifacts.md) | Every folder in `artifacts/`, with a line on each |
| [Evidence](evidence.md) | What proof a task's pull request should carry |
| [Game versions, updates and forks](game-versions.md) | Version names, the update and fork rules, where version files live, and how update ideas are filed |
| [Where game ideas live](ideas.md) | The public `gameon` and private `gameon-ideas` repos, the idea issue's layout, known and unknown submitters, and what stays private |

## Working here

Every agent and person follows [AGENTS.md](../AGENTS.md): how issues and tasks work, how to
claim a task, branch naming, worktrees, pull requests, merging, and how to sign what you
write. These docs explain how things work; AGENTS.md is the rulebook, and it wins if the
two ever disagree.

Work is tracked in [GitHub issues](https://github.com/jwildfire/gameon/issues), as
objectives broken into tasks.

## Reading these pages

They're plain Markdown, so they read fine on GitHub. They're also published with the rest
of the repo on GitHub Pages, at https://jwildfire.github.io/gameon/docs/ (and
https://jwildfire.github.io/gameon/dev/docs/ for `dev`), where a small
[`index.html`](index.html) renders them.
