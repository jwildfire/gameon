# Angry Dudes

A pixel-art slingshot-and-siege game, built as an HTML prototype first and headed for the iPhone later.
Pick a war from history, then knock down the enemy fort with everything in your arsenal: sling troops,
fire weapons, drive vehicles and call in strikes from the sky, Worms-style. Every battle opens with a
short piece of real history.

## Play it

**Play online: <https://jwildfire.github.io/angry-dudes/>** (works on phones too; turn it sideways).

The game is plain HTML and JavaScript, so there is nothing to install.

- **Quickest:** double-click `index.html`. It needs an internet connection the first time, because it loads
  the Matter.js physics engine and the pixel fonts from the web.
- **With a local server** (closest to how it runs on the web):

  ```bash
  python3 -m http.server 8765
  ```

  Then open <http://localhost:8765>.

Controls:

| Arsenal type | How to use it | Tap again while it's moving to… |
| --- | --- | --- |
| **Sling** (troops) | Drag back anywhere, let go | shout, charge, split up, pop a parachute, ground-pound… |
| **Fire** (weapons) | Drag back to aim the gun in your bunker, let go | (most weapons have no tap; grenades and mortar shells run on fuses) |
| **Drive** (vehicles) | Tap once to roll out | jump, fire, ram, unload troops, blow up |
| **Call in** (air and artillery) | Tap the spot to hit | (nothing; just watch) |

Knock out every defender to win. Anything left in your arsenal is worth 5,000 bonus points, and that's
how you earn the second and third stars. Lose a battle twice and the next try gives you one extra troop.

Big battles are wider than the screen. The camera flies over the enemy fort at the start (tap to skip),
then follows your shots. Drag on the right half of the screen (or use the mouse wheel) to look around,
and press **See fort** / **Back to launcher** to jump between the two ends. Arrows at the edge of the
screen count the defenders you can't see.

## Battle packs

| Pack | You are | Against | Battles | Special things |
| --- | --- | --- | --- | --- |
| Roman Legions, 213–51 BC | Roman legions | Greeks and Gauls | Syracuse, Avaricum, Alesia, Uxellodunum | testudo shield-tortoise, centurion splits into three, ballista bolts, Archimedes' Claw grabs your machines, druid heals the Gauls |
| Vikings, 885–886 | Viking army | Franks and English | Rochester, Siege of Paris, The Flood | longships float across rivers, berserker charge, throwing axes, fire ship, hot pitch |
| Castle Siege, 1224–1304 | English army | Castle garrisons | Bedford, Kenilworth, Caerlaverock, Stirling | miners bring down towers, barges cross the lake, crossbows, siege tower, boiling oil, the giant Warwolf trebuchet |
| Samurai Japan, 1590–1615 | Tokugawa army | Castle defenders | Odawara Castle, Sanada-maru, Osaka Castle | samurai charge, matchlock volleys, fire bombs, turtle cart, a three-story castle keep |
| Pirates vs. Navy, 1668–1718 | Pirates | Spanish and Royal Navy | Portobelo, Lake Maracaibo, Ocracoke Inlet | enemy ships float on the water (knock the crew overboard!), longboats, Morgan's fire ship, grenadoes, broadsides, Blackbeard |
| American Revolution, 1777–1781 | Continental Army | British Army | Breymann Redoubt, Stony Point, Redoubt No. 10, Siege of Yorktown | axemen chop the abatis, grapeshot, bayonet charges at night, powder wagon, siege battery |
| Napoleon's Wars, 1809–1815 | French army | Austrian and Allied armies | Ratisbon, La Haye Sainte, Hougoumont | Old Guard ground-pound, sappers chop gates, cuirassier charge, the grand battery |
| World War I, 1918 | U.S. Army | German Army | Cantigny, Belleau Wood, Saint-Mihiel, Meuse-Argonne | trenches, barbed wire, Renault tanks that cross trenches, Sergeant York, tunnel mines, observation balloons |
| World War II, 1944–1945 | U.S. Army | German Army | Omaha Beach, Pointe du Hoc, Brécourt Manor, Fort du Roule, Operation Crossbow (an all-aircraft Air Force mission), Bastogne, Remagen Bridge | the **Road to the Rhine campaign**, paratroopers and C-47 drops, halftracks, Sherman vs. Tiger, fighter-bombers that fly under the flak, strafing runs, naval guns, a bridge over the Rhine |
| Space Battle, the future | Star Marines | the Robot Legion | Moon Base Alpha, Mega-Bot's Asteroid | low gravity, jetpack troopers, lasers that fly dead straight, a moon rover, dropships, an orbital strike (this one is made up!) |

Defenders are drawn as soldiers of their time. No Nazi symbols appear anywhere: German vehicles carry
only the plain black cross that was painted on them. There's no poison gas in World War I, and Viking
helmets have no horns (those were invented in the 1800s). The history blurbs stick to things historians
agree on and leave out famous legends.

## The World War II campaign

The World War II tab has a **Campaign: Road to the Rhine** button. It opens a map of Normandy, Belgium and
the Rhine with the seven battles in order. Missions unlock one at a time. Each first win lets you pick one
of three rewards (an extra Bazooka in every battle, veteran riflemen who hit harder, a Sherman platoon, air
support…), and your army keeps it for the rest of the campaign. You're promoted from Private to General
along the way. In return, each mission's defenders are tougher than the last (up to 55% more health at
Remagen). Ground reinforcements stay home on the Air Force mission. Campaign progress is saved in the
browser; **Start over** on the map wipes it.

A pack gets a campaign by adding a `campaign` block (see the bottom of `js/packs/ww2.js`): the missions in
order with their spots on the map, the rewards, the `toughness` for each mission, and the map itself as a
few coastline outlines, rivers, forests and labels on a 384 × 216 grid.

## Project layout

```
index.html            the game page (menus, HUD, arsenal bar)
js/game.js            the engine: physics, aiming, special moves, defenders fighting back, drawing
js/packs/*.js         one file per war: units, defenders, fort pieces, scenery and levels
js/sprites.js         all the pixel art (generated, do not edit by hand)
assets/sprites.json   the same pixel art as plain JSON, for the future iPhone app
tools/                the sprite builder (Python, no extra packages needed)
art/                  roster pages that show off the troop designs
```

## Making changes

**New level or tweak a fort:** edit the `levels` list in a pack file. Forts are drawn with letters, top row
first, 16 pixels per column. Each pack file lists what its letters mean at the top. For example, in
World War II:

```
"...S.S.o.",     S sandbags, o the officer
"...~~~===",     ~ wooden plank, = concrete slab (8 px tall, one long piece)
"S..W.WC.C",     W ammo crate, C concrete
"Sm-WgWCJC"      m- MG 42 nest (two columns wide), g grenadier, J jerrycan
```

Each column stacks on whatever is already below it, so towers, gates and huts can sit side by side.

A level can also have:

- `width`: how wide the battlefield is (720 fits one screen; the biggest battles are 1,100). Wider levels
  launch a bit harder, so a full pull always reaches the far end of the fort.
- `trenches`: `{ x, w, d }` cuts a trench into the ground. Add `water: true` for a river or moat: troops
  and blocks that fall in are lost, but boats (`boat: true` vehicles) float across. Blocks built down in
  the water, like bridge piers, stay put.
- `cliff`: `{ x, h }` raises the ground from `x` onward; the fort stands on top.
- `gravity`: 1 is Earth (the default). The space levels use less, so everything floats farther. Hits are
  measured against the gravity, so a slow landing on the Moon still hurts.
- Ships: a block with `boat: true` floats on water. A ship is one long `boat` slab (slabs can be taller
  with `h`, and `caps` gives them a bow and stern) with masts, cabins and crew stacked on the deck.
- `craters` (scenery only) and `extras` (single pieces placed anywhere, with `alt` to float them in the air).

How hard a level is mostly comes down to how many defenders there are and how many items you get. The
current rules of thumb: a war's first level gets about two more items than defenders; later levels get
roughly three items for every four defenders, plus one for each defender that fights back.

**New art:** sprites are drawn in Python in `tools/sprites_<pack>.py`. People are typed out as rows of
palette letters; vehicles and siege engines use small shape helpers (`rect`, `line`, `disc`) and get an
automatic dark outline. Rebuild everything with:

```bash
python3 tools/build_sprites.py
```

**New battle pack:** copy a pack file in `js/packs/`, add a `tools/sprites_<pack>.py`, register it in
`tools/build_sprites.py`, and add a `<script>` line for it in `index.html`. Special moves are shared, so
a new army can mix and match:

- troops: `shout`, `chute`, `detonate`, `pound`, `dash` (with `pierce`), `split`, `sharpshoot`, `boost` (jetpack)
- vehicles: `jump`, `shoot`, `ram`, `unload`, `blowup`; add `boat: true` to float on water
- weapons: `impact` explosions, `fuse`, `bounce`, `lift`, `wind`, `pierce`, `spread`, heavy `round` shot, `soft` arrows
- call-ins: `plane` (bombers, or `troops` for a paratrooper drop; `lowLevel` fighters fly under the flak, and
  `dropVx`/`dropVy` turn bombs into strafing bullets or rockets), `rain` (arrow storms, barrages, orbital lasers),
  `mine` (tunnelers blow it up from below)
- defenders that fight back: `shooter`, `sniper`, `antitank`, `oil`, `flak`, `heal`, `claw`; `float: true` hangs one in the sky (balloons);
  `explodes` makes one blow up when it's knocked out (V-1 launch ramps)

## Testing aid

Open the browser console on the game page:

```js
ANGRY_DEBUG.open("castle", 0)          // jump straight into a battle
ANGRY_DEBUG.use("knight", 40, 0.9)     // launch at 40° and 90% power
ANGRY_DEBUG.tap()                      // trigger the special move
ANGRY_DEBUG.advance(3000)              // fast-forward 3 seconds
ANGRY_DEBUG.report()                   // defenders and their health
```

There's also a play-test bot that plays a level many times with rough, kid-style aim and reports how
often it wins, which defenders tend to survive, and whether the fort falls apart before the first shot:

```js
var s = document.createElement("script"); s.src = "tools/playtest.js"; document.body.appendChild(s);
BOT("vikings", null, 10)               // every level in the pack, 10 tries each
```

The bot is a much worse shot than a real player (it always throws long), so use it to compare levels with
each other rather than as the real difficulty.

## Ideas for next

- More wars: the Civil War, the Crusades, Alexander the Great
- Campaigns for the other armies (the map and rewards are just data in the pack file)
- A campaign map that links the battles in order
- The iPhone app: SpriteKit can read `assets/sprites.json` and the pack data directly
