# MazeAThon playtest evidence

Game implementation task: [Build the complete MazeAThon game inside GameOn (#25)](https://github.com/jwildfire/gameon/issues/25).

## Results

- **9/9 model checks pass**, including independent reachability checks for 150 generated sections (50 seeds × 3 sections), deterministic generation, wall collision and line of sight, all four boosts, reusable locks, safe catches with progress retention, finite monster chases, last-seen searches, save validation, and three-section completion.
- **Full browser playthrough passes** using seed 2026. All twelve keys were collected with real keyboard events and normal collision/AI updates; all four boost rooms were entered and activated in the first section. The game reached its completion screen after 250 simulated seconds and eight catches. The test reads diagnostic state for navigation but does not change positions, grant items, disable monsters, or bypass game rules.
- Desktop controls, pause/resume, map, hint, title help, restart cancellation, reload/continue, and completion flows pass.
- Real touch-start/hold/end input moves and stops the player on a 375×812 phone viewport. Controls and maps fit portrait and 812×375 landscape. Movement targets in landscape are at least 43×43 pixels. The 320×568 layout also passes its overflow/help check.
- Direct-file play works with the browser offline. Disabling local storage does not prevent play. No browser page or console errors were recorded.
- Visual review found and fixed the landscape control geometry. Camera position now updates immediately on rotation. Monster tests also caught and fixed waypoint oscillation; monsters search the last seen position after losing sight.

## Reproduce

From the repository root:

```sh
node --test games/mazeathon/world.test.cjs
node games/mazeathon/browser.test.cjs
```

The browser check requires Playwright and an installed Chromium browser. It starts and stops its own local server. `CHROMIUM_PATH` can select an existing Chromium executable. `--ui-only` skips the long playthrough when checking only layout/controls. The verified run used Playwright 1.62.1 with Chromium 153.

`browser-results.json` records the final complete playthrough. Screenshots:

- [Desktop title](desktop-title.png)
- [Desktop play](desktop-game.png)
- [First section and boost effects](section-1.png)
- [Second section](section-2.png)
- [Third section](section-3.png)
- [Complete adventure](completed.png)
- [Phone title](phone-title.png)
- [Phone play and controls](phone-game.png)
- [Phone map](phone-map.png)
- [Phone landscape](phone-landscape.png)

The game is contained in `games/mazeathon/` in the shared repository. Arcade registration is a separate task so shared files have their own branch and PR.
