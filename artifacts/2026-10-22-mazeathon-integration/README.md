# MazeAThon arcade integration

Integration task: [Add MazeAThon to the shared arcade (#26)](https://github.com/jwildfire/gameon/issues/26).

MazeAThon lives at `games/mazeathon/` in the shared repository. Its registry entry uses `games/mazeathon/` as a relative play URL and the shared repository as its source. The existing launcher already handles relative URLs correctly, so no launcher code change is needed. The cover is an original SVG illustration exported to the arcade's existing JPEG format.

## Verified locally

The integration check runs the real arcade and game on a local static fixture matching both published path layouts. It passes all four combinations:

| Path layout | Viewport | Result |
| --- | --- | --- |
| `/gameon/` | 1280×900 | Pass |
| `/gameon/` | 375×812 | Pass |
| `/gameon/dev/` | 1280×900 | Pass |
| `/gameon/dev/` | 375×812 | Pass |

Every case verifies seven cards and loaded cover images, launches the real MazeAThon iframe, starts the game and moves the player, switches to an existing game and back, and returns home with the iframe unloaded. It also checks the own-tab URL and phone-width player controls. There are no browser page or console errors.

External games and Google Fonts are stubbed to make launcher checks deterministic; MazeAThon and its assets are served normally. The production path test is a preflight fixture, not a claim that the human-approved production release has already happened.

## Reproduce

With Playwright and Chromium available, from the repository root:

```sh
node artifacts/2026-10-22-mazeathon-integration/arcade.test.cjs
```

`CHROMIUM_PATH` selects an existing browser if needed. Set `GAMEON_LIVE_URL=https://jwildfire.github.io/gameon/dev/` to run the same desktop/phone check against the deployed development arcade. `GAMEON_ARTIFACT_DIR` optionally chooses where that run saves its evidence. Live deployment verification is recorded on the integration task after merge.

## Evidence

- [Machine-readable local results](local-results.json)
- [Development arcade, desktop](arcade-dev-1280.png)
- [MazeAThon playing in the development arcade, desktop](playing-dev-1280.png)
- [Development arcade, phone](arcade-dev-375.png)
- [MazeAThon playing in the development arcade, phone](playing-dev-375.png)
- [Production path fixture, desktop](arcade-production-1280.png)
- [Production path fixture, phone](arcade-production-375.png)

The full game has its own [model checks, complete playthrough, and mobile/offline evidence](../2026-10-22-mazeathon-playtest/README.md). The game implementation PR and this shared-file integration PR both target `dev`; the release from `dev` to `main` stays with a person under the repository's rules.
