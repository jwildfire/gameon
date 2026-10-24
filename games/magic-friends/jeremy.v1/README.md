# Magic Friends, Up We Go!

A pixel-art climbing game for little kids. A mermaid, a fairy and a unicorn outsmart a grumpy witch across 60 levels and 12 worlds to bring back the sunrise.

**[▶ Play it now](https://jwildfire.github.io/magic-friends/)**. It works in any modern browser on a phone, tablet or computer. Nothing to install.

![Title screen](docs/screenshots/title.png)

It was designed with a five-year-old co-designer, who came up with the mermaid, the unicorn, the sunrise and the witch.

## The story

| Under the sea | Fairy Island | Up in the sky |
| --- | --- | --- |
| ![Ocean level](docs/screenshots/ocean.png) | ![Island level](docs/screenshots/island.png) | ![Sky level](docs/screenshots/sky.png) |
| The witch steals the mermaid's magic crown. Swim up through four ocean worlds to get it back. | The witch locks the unicorn in a cage. The fairy flutters through palm trees and treetops to find the key and set her free. | The witch steals the sunbeams. The friends ride the unicorn from cloud to cloud, all the way up to the sunrise. |

Every world ends with a victory parade. Reaching the sunrise starts a big dance party, and unlocks a harder version of the game.

![Sunrise party](docs/screenshots/party.png)

## How to play

- **Tap or click where you want to jump.** Your friend hops there on their own.
- **Keyboard:** arrow keys or A/D to move, and Space, Up, W, Z or X to jump.
- **Touch buttons:** the button in the top corner shows a left, right and jump pad.

Pick a mode on the title screen:

| Mode | What it's like |
| --- | --- |
| Easy | If you fall, a bubble floats you back to the last ledge or cloud you stood on. |
| Normal | If you fall, a bubble carries you back to the last checkpoint. |
| Harder | Unlocks after you reach the sunrise. Fewer checkpoints, faster critters, extra critters, and clouds that puff away a moment after you land on them. Win it to earn a golden crown. |

Progress saves in your browser, so you can stop and come back later.

## The worlds

1. Deep Blue Sea
2. Sunken Treasure Ship
3. Coral Reef
4. Sparkle Lagoon
5. Palm Tree Island
6. Fairy Treetops
7. Cloud Hop
8. Candy Clouds
9. Giant Flower Vine
10. Rainbow Bridges
11. Snowflake Sky
12. Starry Night

Each world has five levels. Worlds 1 to 4 and 7 to 12 climb straight up. Worlds 5 and 6 scroll sideways.

## Working on the game

The whole game is one file, `index.html`, with no libraries and no build tools. All the art is drawn in code, and all the sounds and music are made with the Web Audio API. To play it offline, download `index.html` (or `magic-friends.html` from the [latest release](https://github.com/jwildfire/magic-friends/releases/latest)) and open it in a browser.

The source is split into pieces in `src/`, and `./build.sh` joins them back into `index.html`:

| File | What's in it |
| --- | --- |
| `src/head.html` | Page title, fonts and styles |
| `src/body.html` | Menus and buttons, plus the character choices |
| `src/sprites.js` | The pixel drawing helpers, the characters and the sound effects |
| `src/world.js` | Themes, the 12 worlds, and the level generator |
| `src/play.js` | Jumping, tap-to-jump, rescue bubbles and saving |
| `src/scenes.js` | The title screen and story cartoons |
| `src/party.js` | The world victory parades and the sunrise party |
| `src/island.js` | Fairy Island levels, the witch, and the story scenes |
| `src/tail.js` | Menus, input, screen sizing and the game loop |

After you edit anything in `src/`, run `./build.sh` and commit both the source and `index.html`. Every push to `main` republishes the game to GitHub Pages. To make a new release, update `RELEASE_NOTES.md`, then run the **Release** workflow from the Actions tab with a version like `v1.1` (pushing a tag like `v1.1` works too).

Add `?test` to the URL to get a `window.__game` object for testing in the browser console.

## Credits

The sunrise party is modeled on "Orange Party", the closing slide of Jeremy Wildfire's R/Pharma 2026 keynote. That slide is adapted from ["Kākāpō Party"](https://tools.simonwillison.net/kakapo-party) by Simon Willison (Apache License 2.0). The party code here is written fresh for this game.

Fonts are [Fredoka](https://fonts.google.com/specimen/Fredoka), [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) and [Silkscreen](https://fonts.google.com/specimen/Silkscreen), loaded from Google Fonts under the SIL Open Font License.

## License

[MIT](LICENSE)
