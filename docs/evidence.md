# Evidence

Every task's pull request shows that the change works, in a form someone can check from
their phone without running anything. This page is the how. It borrows from the evidence
sets in Jeremy's other projects, kept light because this is a for-fun repo.

## The rules

1. **Every task's definition of done names its proof.** Write the end state so it can fail
   ("the arcade shows 8 cards and Pizza Panic opens in the frame"), then say how to check it.
   "Works well" can't fail, so it isn't a definition of done.
2. **A task that changes something people see proves it with a Playwright spec and
   screenshots at both widths**: desktop (1280 wide) and phone (375 wide). That covers the
   arcade, a game, the New Game page, anything with pixels.
3. **The spec, the screenshots and their pass/fail list are committed on the task branch** in
   `evidence/<issue>-<slug>/`, named after the branch. The PR's Evidence section links to its
   `README.md`.
4. **Every check passes before the PR opens.** The Evidence workflow reruns every spec on the
   PR and fails if your committed evidence records a failing check.
5. Tasks with nothing to look at (a doc, a rule, a workflow) still name their proof: a link,
   a command and what it prints, a workflow run. They don't need an `evidence/` folder.

## What it looks like

```
tests/evidence/46-evidence-framework.spec.mjs    the checks, named after the task branch
evidence/46-evidence-framework/
  README.md        the checks, pass/fail at each width, every screenshot inline
  index.html       the same page for the website
  results.json     the same, for machines
  home-desktop.jpg, home-phone.jpg, ...
```

The `README.md` and `index.html` are generated; don't edit them by hand. Read the evidence:

- in the PR: the README link in its Evidence section (GitHub shows the pictures inline),
- on the site after merge: `https://jwildfire.github.io/gameon/dev/evidence/<issue>-<slug>/`,
- for any PR run: the `evidence` artifact on the Evidence workflow run.

[`evidence/46-evidence-framework/`](../evidence/46-evidence-framework/README.md) is the worked
example.

## Writing a spec

Make `tests/evidence/<issue>-<slug>.spec.mjs` and import from the helper instead of
`@playwright/test`:

```js
import { test, expect, games } from "./evidence.mjs";

test("the arcade home shows one card per game", async ({ page, shot, note, browserErrors }) => {
  await page.goto("./");                                   // relative paths, no leading slash
  await expect(page.locator("#shelf .cart")).toHaveCount(games.length);
  note(`${games.length} cards`);                           // a line under the check
  await shot("home");                                      // home-desktop.jpg and home-phone.jpg
  expect(browserErrors).toEqual([]);                       // no console errors
});
```

- Each `test` runs twice, at desktop and phone sizes, and is one row in the README. Name it
  as the thing that is true ("the switcher changes to another game"), not as an action.
- Do something, assert it, then `shot()` it. A screenshot without an assertion proves nothing.
- `page.frameLocator("#frame")` reaches inside a game in the arcade.
- In local runs, games hosted outside this repo are swapped for a stand-in page, so a slow
  site elsewhere can't fail your check. Games in `games/` load for real.
- Keep it to a few screenshots per task. They're small JPEGs, but they add up.
- Specs from earlier tasks keep running on every PR, so they double as regression checks.
  If you deliberately change something an old spec checks, update that spec in your PR and
  say so in Notes. Don't regenerate an old task's evidence folder.

## Running it

You need Node 20 or newer and Python 3.

```sh
npm ci                                    # once per checkout: installs the pinned Playwright
npx playwright install chromium           # once per machine
npm run evidence -- 46-evidence-framework # your spec: writes evidence/46-evidence-framework/
npm run evidence:check                    # every spec, writes nothing you'd commit
```

It serves the repo with `python3 -m http.server` on a free port it picks itself, so it won't
collide with anything else running. Commit the `evidence/<issue>-<slug>/` folder it writes.

- **Claude Code**: run it from your worktree, then open a screenshot or two with the Read
  tool and look at them before you commit. A passing check with a blank screenshot is a bug
  in the check.
- **Codex and ChatGPT**: same commands in your sandbox (on Linux, `npx playwright install
  --with-deps chromium`). If your sandbox can't run a browser, open the PR anyway, say so
  in Notes, and link the `evidence` artifact from the PR's Evidence workflow run. The person
  steering you can run `npm run evidence -- <spec>` and push the folder.

## After merge

The deploy publishes `dev` to https://jwildfire.github.io/gameon/dev/. To run the same checks
against the live site:

```sh
EVIDENCE_BASE_URL=https://jwildfire.github.io/gameon/dev/ npm run evidence -- <issue>-<slug>
```

or run the Evidence workflow from the Actions tab with that URL. Live runs load the real
games and write to `node_modules/.cache/gameon-evidence/live/`, not to `evidence/`. Pages can
serve the old version for a few minutes after a deploy; if a live run shows yesterday's
site, wait and rerun. Post the result line on the task when you post the dev link.

## How it fits with the arcade checks

Ryan's arcade checks (the arcade smoke tests PR, #22: `playwright.config.mjs`, `tests/browser/`,
the Arcade checks workflow) are fast smoke tests of the arcade itself. Evidence specs prove one task's change and keep
pictures of it. They share `package.json` and the pinned `@playwright/test`, and use their
own config file (`playwright.evidence.config.mjs`) and folder, so they don't run each other's
tests.
