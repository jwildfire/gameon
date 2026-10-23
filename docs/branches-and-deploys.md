# Branches and deploys

Two long-lived branches, each with its own live copy of the site:

| Branch | Live at | What it's for |
|---|---|---|
| `main` | https://jwildfire.github.io/gameon/ | What the kids play |
| `dev` | https://jwildfire.github.io/gameon/dev/ | Where finished tasks land first, to check before a release |

Work happens on short-lived task branches named `<issue>-<slug>` (for example
`44-readme-home-docs`), which aren't deployed. The rules for branching, worktrees, task pull
requests and releases are in [AGENTS.md](../AGENTS.md); this page explains the machinery
behind them.

## How a change travels

1. A task branch is cut from `dev` and opened as a pull request into `dev`.
2. The task PR is squash-merged into `dev`. That push deploys, and the change shows up under
   https://jwildfire.github.io/gameon/dev/.
3. A release is a pull request from `dev` into `main`, listing a `Closes #N` line for each
   task it ships (`Closes` lines on PRs into `dev` don't close issues, because `dev` isn't
   the default branch). A person approves and merges it, and that push deploys the
   production site.

## The deploy workflow

[`.github/workflows/deploy.yml`](https://github.com/jwildfire/gameon/blob/dev/.github/workflows/deploy.yml)
runs on every push to `main` or `dev`, and can also be started by hand from the Actions
tab (`workflow_dispatch`). It always builds **both** branches into one GitHub Pages site,
whichever branch was pushed:

1. Check out `main` into `main/` and `dev` into `dev/`.
2. Copy `main/` to the site root and `dev/` to `/dev/`, leaving out `.git`, `.github` and
   `.claude`.
3. Add a `.nojekyll` file so Pages serves every file as it is (Markdown files are served as
   plain text, not turned into pages).
4. Upload the site and deploy it to the `github-pages` environment.

Runs share the `pages` concurrency group without cancelling each other, so two quick pushes
deploy one after the other. A deploy usually finishes in under a minute. Because the whole repo
is copied, any file you add is reachable on the site at the same path, under `/gameon/` for
`main` or `/gameon/dev/` for `dev`.

Nobody deploys by hand or changes the Pages settings.

## Rulesets

Two repository rulesets protect the long-lived branches (see them with
`gh api repos/jwildfire/gameon/rulesets`):

| Ruleset | Branch | Rules |
|---|---|---|
| `dev: PR required` | `dev` | Changes arrive only through a pull request (no approvals required); the branch can't be deleted or force-pushed. No one can bypass it |
| `main: PR with one approval` | `main` (the default branch) | Changes arrive only through a pull request with one approving review; the branch can't be deleted or force-pushed. Repository admins can bypass it on a pull request |

GitHub doesn't let anyone approve their own pull request, so a repo admin can merge their
own release PR with the bypass. Agents never approve PRs, merge into `main`, or use the
bypass ([AGENTS.md](../AGENTS.md) has the full rule).
