# AGENTS.md

Instructions for every AI agent working in this repo: Claude Code, ChatGPT/Codex, or
anything else. Claude Code loads this file via `CLAUDE.md`; Codex reads `AGENTS.md` on its
own. If you change a rule, change it here, never in a tool-specific file.

## What this is

GameOn collects the games we've made with our kids and builds the workflow for making new
ones. See [README.md](README.md) for the pitch and the list of games. This is a for-fun
project. Keep things simple, but follow the rules below: two people and several agents
work here at the same time.

People: @jwildfire (Jeremy) and a friend. Both of us steer agents, and both of us can file
objectives and approve work.

## Issues

All work is tracked in GitHub issues. There are two levels, each with a template in
[`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/):

```
Objective  (label: objective)   a goal, e.g. "Bring all six games into the repo"
└── Task   (label: task)        one pull request's worth of work, a sub-issue of its objective
    └── Pull request            Closes the task, carries the evidence
```

- **Objectives** belong to the humans. An agent can draft one, but only a person files it
  or changes its body. If you want an objective changed, say so in a comment.
- **Tasks** are where agents work. Each task has a **definition of done**:
  - *End state*: what is observably true when it's done ("the game loads at
    `games/trampoline-battle/` and two players can fight on one keyboard").
  - *Proof*: how someone else can check it (a URL, a command and its output, a screenshot
    in `artifacts/`).

  Write it so it can fail. "Works well" is not a definition of done.
- Link each task to its objective as a **sub-issue** (issue sidebar, or
  `gh api repos/jwildfire/gameon/issues/<objective>/sub_issues -f sub_issue_id=<task id>`).
- Filing with `gh issue create` skips the web form. Copy the template's sections exactly;
  read the template first.
- Stuck on a question only a person can answer? Add the `blocked` label, ask exactly one
  question in a comment, and move on to something else.
- When you talk to a person, say what an issue is before you give its number: "the
  trampoline physics task (#12)", never just "#12".

## Not stepping on each other

This is the most important section.

1. **Claim before you start.** Assign the task to whoever is steering you (`gh issue edit
   <n> --add-assignee <login>`) and post a comment: "Starting: <one-line plan>". If a task
   is already assigned to someone else, or has an open PR, leave it alone and pick another.
2. **One task, one branch, one PR.** Branch off a fresh `main`, named
   `<issue-number>-<short-slug>` (e.g. `12-trampoline-physics`). Never commit straight to
   `main`. Never push to someone else's branch.
3. **Use a worktree, not a branch switch.** Other sessions may share the same checkout, so
   never `git checkout` another branch in the main folder:
   - Claude Code: `git worktree add .claude/worktrees/<branch> -b <branch> origin/main`
     (that folder is git-ignored and auto-approved).
   - Codex cloud and ChatGPT already work in their own copy, so just name the branch as
     above.
4. **Stay inside your task's files.** Each game lives in its own folder; if a task touches
   one game, don't edit another game's folder. Changes to shared files (this file,
   `README.md`, templates, shared tooling) get their own task, so two agents aren't editing
   them at once.
5. **Keep up with `main`.** Before you open the PR, merge or rebase onto the latest `main`
   and fix any conflicts on your branch.
6. **Don't delete or rewrite.** No force-pushes to shared branches, no deleting branches,
   issues or files you didn't create, unless a person tells you to.

## Commits and pull requests

- Small commits, one change each, message in the imperative ("Add trampoline bounce").
  Include whatever co-author trailer your tool adds.
- Open the PR against `main` with the template in
  [`.github/pull_request_template.md`](.github/pull_request_template.md): a one-sentence
  summary, `Closes #<task>`, and the evidence the definition of done asked for.
- A person merges. Agents don't merge their own PRs unless the person steering them says
  so in that session.
- When the PR merges, remove your worktree (`git worktree remove .claude/worktrees/<branch>`).

## Comments

The issue thread is the record. Comment on your task when you start, when you get blocked,
and when you finish (with the proof). End each issue, PR and comment you write with a
`---` rule and a line saying who drafted it, e.g. `Drafted by Claude Code (Opus 5.5)` or
`Drafted by Codex (GPT-5)`.

## Artifacts

Anything worth keeping that isn't code (a design, a game pitch, a playtest write-up,
screenshots) goes in [`artifacts/`](artifacts/), one folder per item:
`artifacts/<YYYY-MM-DD>-<slug>/`. Link it from the issue it belongs to.

## Games

- Every game is plain HTML/JavaScript that runs in a browser with no server, and has to work
  on a phone or tablet as well as a laptop.
- The kids are the designers. Keep their ideas, their names and their rules, even the
  silly ones. If something is unclear, ask the person steering rather than guessing.
- Before you call a game done, play it in a browser and check it loads with no console
  errors.
