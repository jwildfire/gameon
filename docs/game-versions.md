# Game versions, updates and forks

How a GameOn game changes after it's first built. A kid can ask for a change to any game: a creator's change becomes the game's next version, and anyone else's becomes a fork under their own name. Players pick which version to play.

Objective: [Game updates (#113)](https://github.com/jwildfire/gameon/issues/113). Jeremy's direction, 2026-10-23: *"should let user pick a version when they start. If someone other than the creator changes a game, fork it. versioning can be {username}.v{integer}."*

## Names

- **Username:** the nickname from the New Game page's "Who's making it?", lowercased, letters and digits only. "NotClay" is `notclay`; "Rocket Man" is `rocketman`.
- **Creator:** the username that owns a game. For a pipeline-built game it's the maker on its first idea. Each `games.json` entry records it in `creator`.

  | Game | Creator |
  |---|---|
  | Fancy Food Fight | `jeremy` |
  | MazeAThon | `ryan` |
  | Super Sauce Boy | `notclay` |
  | The first six (Trampoline Battle, Princess Lady Drive, Stretcher Bearer, Angry Dudes, Magic Friends, Timed Out) | `jeremy`, since they were made with Jeremy's kids |

- **Version:** `{username}.v{n}`, with `n` counting from 1 for each username in each game. `jeremy.v1`, `jeremy.v2`, `notclay.v1`.

## The rules

1. **Every game starts at `{creator}.v1`**: what's in the arcade today.
2. **When the creator asks for a change**, it becomes their next version (`jeremy.v1` → `jeremy.v2`) and the new default.
3. **When anyone else asks for a change, it's a fork:** a new version under their own name, numbered from their own highest version of that game (`notclay.v1`, then `notclay.v2`). It records the version it started from. The creator's latest stays the default, and forks never replace it.
4. **The default** is the creator's highest version. A maintainer can change it by editing `default` in a task PR.
5. **Nothing is overwritten.** Every version stays playable.

## Where the files live

- **Every version lives in GameOn and is a frozen copy:** nothing outside this repo can change a version once it's in `games.json`.
- **First versions** are at `games/{slug}/` for games built here. The first six, which also live in their own repos, have theirs at `games/{slug}/jeremy.v1/`: a copy of that repo's default branch as its site served it when the six were frozen (#124). Their saves carry over, because the copy runs on the same site with the same save keys.
- **Every later version** is at `games/{slug}/{version}/`. The build copies the starting version's files there, and the original repo isn't touched.
- Each version folder is a complete, standalone game: its own `index.html` and, where it changes them, its own `README.md` (with the update idea word for word under the original) and `gameon.json`.
- **A version copied from a game's own repo records where it came from** in `source`: the repo and the commit it was copied at. The copy leaves out what the site doesn't serve (`.git`, `.github`, `ios/`, build scripts and their sources) and changes only what has to change to play from its new folder.

## `games.json`

An entry without `versions` is a game with one version, `{creator}.v1`, played at its `url`. Versions are added like this:

```json
{
  "slug": "fancy-food-fight",
  "title": "Fancy Food Fight",
  "url": "games/fancy-food-fight/jeremy.v2/",
  "creator": "jeremy",
  "default": "jeremy.v2",
  "versions": [
    { "id": "jeremy.v1", "url": "games/fancy-food-fight/", "made": "2026-10-23", "note": "The first version" },
    { "id": "jeremy.v2", "url": "games/fancy-food-fight/jeremy.v2/", "made": "2026-10-24", "note": "The guests fight back harder", "from": "jeremy.v1", "idea": 118 },
    { "id": "notclay.v1", "url": "games/fancy-food-fight/notclay.v1/", "made": "2026-10-24", "note": "Everything is hot sauce", "from": "jeremy.v2", "idea": 121 }
  ]
}
```

- `url` at the top always matches the default version, so anything that only reads `url` keeps working.
- `note`: one line a kid can read, shown in the version picker.
- `from` and `idea`: the version it started from and the idea issue that made it.
- `source`: for a version copied from a game's own repo, `{ "repo": "jwildfire/{repo}", "commit": "{full sha}" }`, e.g. `{ "id": "jeremy.v1", "url": "games/angry-dudes/jeremy.v1/", "made": "2026-10-17", "note": "The first version", "source": { "repo": "jwildfire/angry-dudes", "commit": "f20ad5e…" } }`.
- `repo` at the top stays the game's own repo for the first six, so the README and credits can still link to it.
- The other fields (`tagline`, `credit`, `color`, `tags`, cover) describe the game. A creator's update may change them; a fork doesn't.

## Playing

- **Starting a game:** tapping a game with one version plays it. A game with more than one asks which version first. The list shows the default first, marked, then the creator's older versions, then forks grouped by who made them. Each line shows the version, its note, and for forks the version it started from.
- **The arcade remembers** each player's last pick for a game on that device (`gameon.arcade.version.{slug}`).
- **Switching:** the player bar shows the version playing, as a dropdown to switch.
- **Links:** `#{slug}` plays the default version; `#{slug}@{version}` plays that version.
- **Update button:** in the player bar, it opens `new/?game={slug}&version={version playing}`.

## Asking for an update

- On the New Game page, "What are you making?" defaults to **A new game**. Picking a game (and a version, defaulting to the one you came from or the game's default) turns the idea into an update.
- **The issue:**
  - **Title:** "Update to {Game} from {nickname}".
  - **Labels:** `game-idea`, `update` and `status: submitted`.
  - **Body sections:** "The idea, word for word", "Game to update" (the slug), "Starting version" (the version id), "Made by" and "Told by".
  - **Form fields:** the Game idea form carries `game` and `version`.
- The idea line shows updates as "Update to {Game}".

## The pipeline for updates

The same three steps, with differences spelled out in the skills:

- **Evaluate** scores the change, not the whole game. "New to the arcade" becomes "new to this game". The build brief describes the change against the starting version, and names the version it will become: the creator's next, or a fork, with the reason.
- **Build** copies the starting version into `games/{slug}/{version}/`, makes the change, and adds the version to the entry in `games.json`.
  - For a creator's update it also moves `default` and the top-level `url`, and may refresh the cover.
  - Its evidence covers the new version and that the older ones still play.
- **Check** allows exactly these files to change:
  - the new version folder;
  - that game's entry in `games.json` (one version added; `default` and `url` only for a creator's update);
  - the cover (only for a creator's update);
  - the task's evidence spec and folder.

  Everything else is out of lane.

## Games that also live in their own repo

The first six games (the creator table above) still have their own repos, and Jeremy may keep working on them there. A push to one of those repos doesn't change anything in GameOn. Instead:

1. **Something's new** when the repo's default branch has commits newer than `source.commit` of the game's newest version that has a `source` (`gh api repos/jwildfire/{repo}/compare/{commit}...HEAD --jq .ahead_by` is more than 0).
2. **The watcher files an update idea** for it, like any other update: titled "Update to {Game} from {creator's nickname}", with "The idea, word for word" set to **Bring in the latest from jwildfire/{repo}**, the game's slug, the game's default as the starting version, and the creator as "Made by". It files one at a time per game: not while an earlier one is still open.
3. **Evaluate** recognises the idea and passes it straight through with a short brief: no scoring, since it's the creator's own work.
4. **Build** brings the commits in as the creator's next version (`jeremy.v1` → `jeremy.v2`, the new default): a fresh copy of the repo at its new HEAD in `games/{slug}/{version}/`, recorded in `source`. It doesn't start from the starting version's folder, and changes in GameOn versions since the last import aren't merged in; those versions stay playable as they are.
5. **Check** compares the version folder with the repo at that commit: the only differences allowed are what the copy leaves out and the path fixes the PR lists.

## Saves across versions

All versions of a game share the browser's save area for that game (`gameon.{slug}.…`). An update must read the saves the version it started from wrote, without breaking. If it needs a different save format, it uses new keys, `gameon.{slug}.{version}.…`, rather than changing the old ones.
