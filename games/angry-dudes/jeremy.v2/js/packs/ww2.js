// Battle pack: World War II · Normandy, the Ardennes and the Rhine, 1944-1945
//
// How a pack is put together (every pack file follows this shape):
//   units      everything the player can use. kind: sling | fire | drive | air
//              tap: the special move when the player taps mid-flight (see game.js "special moves")
//   blocks     fort pieces, by the character used to draw them in a level
//   defenders  the computer's soldiers and machines; react: how they fight back
//   themes     sky, hills and ground colors for the levels
//   levels     fort drawings, top row first. Columns are 16 px wide.
//              Any row containing = or ~ is an 8 px slab (one long piece per run of the same character).
//              A defender stands at the bottom of its row; "-" continues a wide defender to the right.
(window.ANGRY_PACKS = window.ANGRY_PACKS || []).push({
  id: "ww2",
  name: "World War II",
  years: "1944–1945",
  side: "U.S. Army",
  foe: "German Army",
  icon: "sherman",
  blurb: "Sling GIs, fire bazookas, drive Shermans and halftracks, drop paratroopers and call in bombers and battleships.",
  props: { bunker: "sandbag", pennant: ["#e0412c", "#ffffff"] },

  units: {
    rifleman: { name: "Rifleman", kind: "sling", sprite: "rifleman", w: 12, h: 16, density: 0.003, best: "grenadier",
                tap: "shout", shout: "HOO-AH!", hint: "Drag back to aim, let go to launch. Tap in the air to shout." },
    para:     { name: "Paratrooper", kind: "sling", sprite: "paradude", w: 12, h: 16, density: 0.003, best: "officer",
                tap: "chute", chuteSprite: "para", hint: "Launch, then tap in the air to pop the parachute. He lands on whoever is below." },
    engineer: { name: "Engineer", kind: "sling", sprite: "engineer", w: 12, h: 16, density: 0.003, best: "hedgehog",
                tap: "detonate", boom: { r: 34, p: 3.2 }, hint: "Launch, then tap to set off his charge. It goes off by itself after he lands." },
    sarge:    { name: "Big Sarge", kind: "sling", sprite: "sarge", w: 18, h: 18, density: 0.008, power: 1.8, best: "wood",
                tap: "pound", hint: "He's heavy, so pull back hard. Tap in the air to ground-pound straight down." },
    grenade:  { name: "Grenade", kind: "fire", sprite: "proj_grenade", gunner: "grenade", w: 5, h: 6, density: 0.004, best: "sandbag",
                fuse: 3000, bounce: 0.45, spin: 0.2, faceVel: false, boom: { r: 30, p: 3 }, hint: "Drag back to throw. It bounces, then blows up after 3 seconds." },
    bazooka:  { name: "Bazooka", kind: "fire", sprite: "proj_rocket", gunner: "bazooka", w: 12, h: 4, density: 0.003, best: "tiger",
                lift: 0.8, wind: true, impact: true, boom: { r: 26, p: 3 }, hint: "Rockets fly almost straight. Watch the wind!" },
    mortar:   { name: "Mortar", kind: "fire", sprite: "proj_shell", gunner: "mortar", w: 8, h: 4, density: 0.004, best: "mg42",
                wind: true, impact: true, boom: { r: 32, p: 3.5 }, hint: "Aim high so the shell drops down behind walls." },
    howitzer: { name: "Howitzer", kind: "fire", sprite: "proj_shell", gunner: "howitzer", w: 8, h: 4, density: 0.006, best: "sniper",
                speed: 1.15, wind: true, impact: true, boom: { r: 46, p: 5 }, hint: "One huge shell with a big blast. Aim carefully." },
    jeep:     { name: "Jeep", kind: "drive", sprite: "jeep", w: 32, h: 12, density: 0.003, best: "wire", speed: 1.6, push: 0.6, hp: 4,
                tap: "jump", hint: "Tap to roll out. Tap again to jump." },
    halftrack: { name: "Halftrack", kind: "drive", sprite: "halftrack", w: 42, h: 16, density: 0.005, best: "sandbag", speed: 1.2, push: 0.45, hp: 8,
                tap: "unload", unload: { unit: "rifleman", count: 3, vx: 3, vy: -8, spread: 1 }, shout: "LET'S GO!",
                hint: "Tap to drive it up to the fort, then tap again and three riflemen jump out." },
    sherman:  { name: "Sherman", kind: "drive", sprite: "sherman", w: 40, h: 16, density: 0.006, best: "concrete", speed: 0.7, push: 0.25, hp: 10,
                tap: "shoot", shots: 3, gun: { x: 26, y: -10, vx: 14, vy: -0.5 },
                shell: { sprite: "proj_tankshell", w: 6, h: 3, density: 0.004, lift: 0.9, impact: true, boom: { r: 22, p: 3.2 }, best: "concrete" },
                hint: "Tap to roll out. Tap again to fire the main gun (3 shells)." },
    p51:      { name: "Mustang", kind: "air", style: "plane", sprite: "p51", bombs: 2, spacing: 16, speed: 2.2, alt: 40,
                bomb: { sprite: "proj_bomb", w: 10, h: 4, impact: true, boom: { r: 30, p: 3.5 } },
                hint: "Tap the spot where the Mustang should drop its bombs." },
    b17:      { name: "Flying Fortress", kind: "air", style: "plane", sprite: "b17", bombs: 6, spacing: 20, speed: 1.5, alt: 28,
                bomb: { sprite: "proj_bomb", w: 10, h: 4, impact: true, boom: { r: 28, p: 3.2 } },
                hint: "Tap the middle of the fort. Six bombs fall in a line." },
    p51s:     { name: "Strafing run", kind: "air", style: "plane", sprite: "p51", lowLevel: true, bombs: 8, spacing: 9, speed: 2.6, alt: 110,
                dropVx: 6, dropVy: 10, say: "STRAFING RUN!",
                bomb: { sprite: "proj_rifleball", w: 4, h: 2, density: 0.006, soft: true, power: 0.8, life: 1200 },
                hint: "A Mustang swoops in low with its machine guns blazing. Fighters fly too low and fast for the big flak guns." },
    p47:      { name: "P-47 Thunderbolt", kind: "air", style: "plane", sprite: "p47", lowLevel: true, bombs: 2, spacing: 10, speed: 2.6, alt: 70, dropVy: 3,
                say: "DIVE!", bomb: { sprite: "proj_bomb", w: 10, h: 4, impact: true, boom: { r: 32, p: 4 } },
                hint: "A tough fighter-bomber. It dives under the flak and drops two bombs right on target." },
    rockets:  { name: "Rocket attack", kind: "air", style: "plane", sprite: "p47", lowLevel: true, bombs: 4, spacing: 14, speed: 2.8, alt: 90,
                dropVx: 4, dropVy: 9, say: "ROCKETS AWAY!",
                bomb: { sprite: "proj_rocket", w: 12, h: 4, density: 0.003, lift: 0.5, impact: true, boom: { r: 26, p: 3.2 } },
                hint: "A Thunderbolt fires four rockets that streak down at the target." },
    b26:      { name: "B-26 Marauder", kind: "air", style: "plane", sprite: "b26", bombs: 4, spacing: 18, speed: 1.7, alt: 40,
                bomb: { sprite: "proj_bomb", w: 10, h: 4, impact: true, boom: { r: 30, p: 3.5 } },
                hint: "A medium bomber with four big bombs. It flies high, so the flak guns can shoot it down." },
    c47:      { name: "C-47 drop", kind: "air", style: "plane", sprite: "c47", troops: "para", bombs: 3, spacing: 24, speed: 1.8, alt: 30, say: "GREEN LIGHT!",
                hint: "Tap where the paratroopers should jump. Three of them float down onto the fort." },
    naval:    { name: "Naval guns", kind: "air", style: "rain", icon: "battleship", count: 4, gap: 24, every: 320, vx: 3.2, vy: 0, say: "NAVAL GUNS!", sound: "thump",
                proj: { sprite: "proj_shell", w: 8, h: 4, density: 0.006, impact: true, boom: { r: 34, p: 4 } },
                hint: "Battleships far out at sea fire four giant shells. Tap the target." }
  },
  order: ["rifleman", "para", "engineer", "sarge", "grenade", "bazooka", "mortar", "howitzer", "jeep", "halftrack", "sherman", "p51", "p51s", "p47", "rockets", "c47", "b26", "b17", "naval"],

  blocks: {
    S: { key: "sandbag",  hp: 1.5, density: 0.0025, pts: 100, debris: ["#d9bc80", "#a9884f"] },
    W: { key: "wood",     hp: 2.2, density: 0.0015, pts: 200, debris: ["#a8693a", "#5e3a1d"] },
    C: { key: "concrete", hp: 5,   density: 0.004,  pts: 500, debris: ["#9a9ea3", "#74787e"] },
    H: { key: "hedgehog", hp: 6,   density: 0.007,  pts: 300, debris: ["#646d7b", "#3a3546"], w: 14, h: 14, fixed: true },
    X: { key: "wire",     hp: 1,   density: 0.001,  pts: 100, debris: ["#646d7b", "#a8693a"], w: 16, h: 10, fixed: true, sensor: true },
    Y: { key: "hedge",    name: "Hedgerow", hp: 2, density: 0.0012, pts: 100, debris: ["#3e6638", "#6fa852"] },
    J: { key: "jerrycan", hp: 0.5, density: 0.0015, pts: 200, debris: ["#c9b46c", "#9b864b"], w: 13, h: 14, explodes: { r: 34, p: 3.5 } },
    "=": { key: "concrete", slab: true, hp: 6, density: 0.004, pts: 800, debris: ["#9a9ea3", "#74787e"] },
    "~": { key: "wood", slab: true, hp: 2.5, density: 0.0015, pts: 300, debris: ["#a8693a", "#5e3a1d"] }
  },
  defenders: {
    g: { key: "grenadier", name: "Grenadier", w: 12, h: 17, hp: 1.5, density: 0.002, pts: 500 },
    n: { key: "sniper",    name: "Sniper", w: 12, h: 17, hp: 1.5, density: 0.002, pts: 1000, react: { type: "sniper", say: "SNIPER!" } },
    o: { key: "officer",   name: "Officer", w: 12, h: 19, hp: 3, density: 0.002, pts: 5000 },
    m: { key: "mg42",      name: "MG 42 nest", w: 26, h: 13, hp: 3, density: 0.004, pts: 1500, cells: 2,
         react: { type: "shooter", range: 90, height: 46, say: "RAT-A-TAT!", sound: "rattle", muzzle: { x: -14, y: -3 } } },
    f: { key: "flak88",    name: "Flak 88", w: 40, h: 16, hp: 5, density: 0.005, pts: 3000, cells: 3,
         react: { type: "flak", say: "SHOT DOWN BY FLAK!", muzzle: { x: -18, y: -14 } } },
    h: { key: "howitzer_de", name: "105 mm gun", w: 34, h: 14, hp: 3, density: 0.006, pts: 2000, cells: 2,
         react: { type: "antitank", every: 2200, range: 340, muzzle: { x: -18, y: -10 }, vx: -9, vy: -6,
                  shell: { sprite: "proj_shell", w: 8, h: 4, density: 0.005, enemy: true, impact: true, boom: { r: 20, p: 3 } } } },
    v: { key: "v1_ramp", name: "V-1 launch ramp", w: 48, h: 16, hp: 4, density: 0.006, pts: 4000, cells: 3, explodes: { r: 40, p: 4 }, fire: true },
    t: { key: "tiger",     name: "Tiger", w: 50, h: 20, hp: 9, density: 0.008, pts: 8000, cells: 4, ox: -3,
         react: { type: "antitank", every: 1900, range: 300, muzzle: { x: -34, y: -8 }, vx: -13, vy: -0.4,
                  shell: { sprite: "proj_tankshell", w: 6, h: 3, density: 0.004, lift: 0.9, impact: true, enemy: true, boom: { r: 18, p: 3 } } } }
  },

  themes: {
    beach: { sky: ["#6fbff5", "#94d2fa", "#bfe6fd"], sun: "#ffe25a", clouds: true, hills: ["#a4d7a0", "#7cc27a"], split: 440,
             left:  { top: "#e3c98e", hi: "#f1dfb0", base: "#d6b878", lo: "#bf9f5f" },
             right: { top: "#4fae3f", hi: "#8bd85e", base: "#8b5a2b", lo: "#6b4220" } },
    cliff: { sky: ["#7fa6db", "#b7c9e6", "#f1d2b0"], sun: "#fff0b3", clouds: true, hills: ["#93ad9a", "#738f7c"],
             left:  { top: "#e3c98e", hi: "#f1dfb0", base: "#d6b878", lo: "#bf9f5f" },
             right: { top: "#4fae3f", hi: "#8bd85e", base: "#8b5a2b", lo: "#6b4220" },
             rock: ["#8d8a82", "#6f6c66", "#aaa79f"] },
    normandy: { sky: ["#74b4e6", "#9ccaef", "#cbe3f5"], sun: "#ffe25a", clouds: true, hills: ["#7fb06a", "#5f9450"], trees: "oak", treeColor: "#3e6638", split: 9999,
                left:  { top: "#4fae3f", hi: "#8bd85e", base: "#7a5634", lo: "#5a3c22" },
                right: { top: "#4fae3f", hi: "#8bd85e", base: "#7a5634", lo: "#5a3c22" } },
    rhine: { sky: ["#7f8f9f", "#a2afba", "#cdd3d6"], clouds: true, cloud: "#e2e5e6", hills: ["#6a7a5a", "#56664a"], trees: "pine", treeColor: "#3e4a3a",
             water: "#4a6b80", waterHi: "#a9c2d0", split: 9999, rock: ["#7a6f62", "#5f564b", "#948a7c"],
             left:  { top: "#6f8a3c", hi: "#8fa85a", base: "#5a4630", lo: "#43341f" },
             right: { top: "#6f8a3c", hi: "#8fa85a", base: "#5a4630", lo: "#43341f" } },
    snow:  { sky: ["#8a96a6", "#a6b0bd", "#c5cdd7"], clouds: false, hills: ["#c9d2da", "#aab6bf"], trees: "pine", weather: "snow", split: 9999,
             left:  { top: "#f4f7fb", hi: "#ffffff", base: "#dfe7ef", lo: "#c3cfdb" },
             right: { top: "#f4f7fb", hi: "#ffffff", base: "#dfe7ef", lo: "#c3cfdb" } }
  },

  // The campaign: these battles in order on a map, from the beaches of Normandy to the Rhine.
  // Each first win offers three rewards; the one you pick stays with your army for the rest of the campaign.
  // `toughness` multiplies the defenders' health in each mission, so later battles get harder.
  campaign: {
    name: "Road to the Rhine",
    blurb: "Lead the U.S. Army from the beaches of Normandy all the way to the Rhine. Every victory earns a reward that makes your army stronger, and every battle is tougher than the last.",
    ranks: ["Private", "Corporal", "Sergeant", "Lieutenant", "Captain", "Major", "Colonel", "General"],
    toughness: [1, 1.1, 1.15, 1.25, 1.3, 1.45, 1.55],
    missions: [
      { level: "omaha",    x: 130, y: 107 },
      { level: "pointe",   x: 104, y: 103 },
      { level: "brecourt", x: 74,  y: 90 },
      { level: "roule",    x: 54,  y: 64 },
      { level: "crossbow", x: 242, y: 80, via: [[92, 120], [150, 126], [204, 118], [230, 96]] },
      { level: "bastogne", x: 306, y: 128, via: [[272, 104]] },
      { level: "remagen",  x: 350, y: 110 }
    ],
    rewards: [
      { id: "bazooka",  name: "Bazooka team",    text: "+1 Bazooka in every battle", icon: "bazooka", add: { bazooka: 1 } },
      { id: "rifles",   name: "Fresh troops",    text: "+2 Riflemen in every battle", icon: "rifleman", add: { rifleman: 2 } },
      { id: "grenades", name: "Grenade crates",  text: "+2 Grenades in every battle", icon: "grenade", add: { grenade: 2 } },
      { id: "veterans", name: "Veteran GIs",     text: "Riflemen and paratroopers hit 40% harder", icon: "sarge", buff: { rifleman: { power: 1.4 }, para: { power: 1.4 } } },
      { id: "mustang",  name: "Air support",     text: "+1 Mustang strike in every battle", icon: "p51", add: { p51: 1 } },
      { id: "sherman",  name: "Tank platoon",    text: "+1 Sherman tank in every battle", icon: "sherman", add: { sherman: 1 } },
      { id: "bigguns",  name: "Big guns",        text: "+1 Howitzer in every battle", icon: "howitzer", add: { howitzer: 1 } },
      { id: "tnt",      name: "Extra TNT",       text: "Engineers' charges blast 40% bigger", icon: "engineer", buff: { engineer: { boom: 1.4 } } },
      { id: "airborne", name: "Airborne",        text: "+1 C-47 paratrooper drop in every battle", icon: "c47", add: { c47: 1 } },
      { id: "jugs",     name: "Fighter-bombers", text: "+1 P-47 Thunderbolt in every battle", icon: "p47", add: { p47: 1 } },
      { id: "sarge",    name: "Big Sarge",       text: "+1 Big Sarge in every battle", icon: "sarge", add: { sarge: 1 } },
      { id: "armor",    name: "Thicker armor",   text: "Your jeeps, halftracks and tanks are 50% tougher", icon: "halftrack", buff: { jeep: { hp: 1.5 }, halftrack: { hp: 1.5 }, sherman: { hp: 1.5 } } }
    ],
    // the map is 384 x 216 pixels; land is drawn from these outlines, everything else is sea
    map: {
      land: [
        { tint: "england", pts: [[0, 0], [250, 0], [250, 8], [244, 18], [240, 30], [232, 38], [222, 44], [204, 46], [186, 48], [170, 46], [150, 48],
                                 [130, 50], [110, 48], [90, 50], [70, 52], [50, 54], [30, 56], [0, 58]] },
        { tint: "europe", pts: [[0, 216], [0, 104], [14, 100], [26, 104], [32, 106], [34, 94], [32, 80], [30, 68], [36, 60], [46, 58], [56, 60], [66, 58],
                                [76, 62], [80, 72], [82, 86], [86, 96], [96, 104], [110, 108], [130, 111], [150, 112], [170, 110], [186, 108], [196, 104],
                                [204, 96], [210, 88], [216, 80], [222, 72], [228, 64], [236, 60], [248, 58], [260, 56], [270, 50], [276, 40], [282, 24],
                                [286, 8], [288, 0], [384, 0], [384, 216]] }
      ],
      rivers: [
        { w: 2, pts: [[384, 190], [366, 160], [356, 132], [350, 112], [342, 92], [330, 70], [312, 50], [296, 36], [284, 26]] },
        { w: 1, pts: [[196, 104], [206, 116], [214, 128], [222, 140], [230, 148]] },
        { w: 1, pts: [[300, 196], [296, 164], [292, 138], [288, 112], [282, 88], [278, 68], [272, 52]] }
      ],
      forests: [{ x: 306, y: 128, rx: 20, ry: 12 }],
      cities: [{ name: "Paris", x: 232, y: 150 }, { name: "London", x: 196, y: 24 }],
      labels: [{ text: "England", x: 110, y: 24 }, { text: "English Channel", x: 150, y: 78, sea: true }, { text: "France", x: 150, y: 176 },
               { text: "Belgium", x: 304, y: 98 }, { text: "Germany", x: 360, y: 56 }]
    }
  },

  levels: [
    {
      id: "omaha", name: "Omaha Beach", date: "June 6, 1944", theme: "beach",
      history: "On D-Day, American soldiers landed on Omaha Beach in Normandy, France. They had to get past steel obstacles, barbed wire and German bunkers on the bluffs above the sand.",
      tip: "Mortar shells drop straight down behind sandbags. Try one on the MG 42 nest.",
      fortX: 470,
      fort: [
        "...S.S.o.",
        "...~~~===",
        "S..W.WC.C",
        "Sm-WgWCJC"
      ],
      extras: [{ type: "hedgehog", x: 300 }, { type: "hedgehog", x: 350 }, { type: "wire", x: 424 }],
      arsenal: { rifleman: 4, engineer: 1, grenade: 3, mortar: 2, jeep: 1 },
      wind: 2, stars: [12000, 18000]
    },
    {
      id: "pointe", name: "Pointe du Hoc", date: "June 6, 1944", theme: "cliff",
      history: "On D-Day, U.S. Army Rangers climbed 100-foot cliffs at Pointe du Hoc with ropes and ladders while German soldiers fired down at them.",
      tip: "The Flak 88 shoots down planes. Knock it out before you call in the Mustang.",
      cliff: { x: 440, h: 64 },
      fortX: 480,
      fort: [
        ".....S.o.",
        ".....====",
        ".....C..C",
        "Sf--.CngC"
      ],
      extras: [{ type: "wire", x: 400 }],
      arsenal: { rifleman: 3, para: 2, grenade: 3, mortar: 2, howitzer: 1, p51: 1 },
      wind: 3, stars: [14000, 21000]
    },
    {
      id: "brecourt", name: "Br\u00e9court Manor", date: "June 6, 1944", theme: "normandy", width: 1000,
      history: "On D-Day morning, Lieutenant Dick Winters and about a dozen paratroopers of Easy Company attacked four big German guns hidden along a hedgerow at Br\u00e9court Manor. The guns were firing at the troops landing on Utah Beach, and the small team knocked out every one of them.",
      tip: "The big guns fire at vehicles, so don't send the halftrack first. Engineers' charges and paratroopers are perfect for wrecking guns.",
      fortX: 470,
      trenches: [{ x: 534, w: 32, d: 20 }, { x: 694, w: 32, d: 20 }, { x: 854, w: 32, d: 20 }],
      fort: [
        "...........S...............",
        "YY....Y...YY....Y....Y....Y",
        "YYh-g.Yh-.YYm-g.Yh-..Yh-..Y"
      ],
      arsenal: { rifleman: 2, para: 2, engineer: 3, grenade: 2, mortar: 1, halftrack: 1, c47: 1 },
      wind: 2
    },
    {
      id: "roule", name: "Fort du Roule", date: "June 25, 1944", theme: "cliff", width: 1000,
      history: "To capture the port of Cherbourg, American soldiers had to take Fort du Roule, a German fort dug into a rocky hill high above the harbor. Battleships out at sea fired on the city's guns, and Corporal John Kelly crawled up the hill to blow open a bunker with pole charges.",
      tip: "The Flak 88 shoots down planes, but it can't stop the naval guns. Save the engineers for the concrete bunkers.",
      fortX: 472,
      cliff: { x: 600, h: 56 },
      fort: [
        ".........n.........o.......",
        "........======....=====....",
        "S..S....C....C....C...C....",
        "S.gSm-..C.h-.C....C.J.C.f--"
      ],
      extras: [{ type: "wire", x: 420 }],
      arsenal: { rifleman: 2, engineer: 2, grenade: 1, bazooka: 3, mortar: 1, howitzer: 1, sherman: 1, p51: 1, naval: 1 },
      wind: 3
    },
    {
      id: "crossbow", name: "Operation Crossbow", date: "Summer 1944", theme: "normandy", width: 1000,
      history: "Germany hid launch ramps for V-1 \u201cbuzz bombs\u201d in the woods of northern France and aimed them at London. The U.S. Army Air Forces and Britain's Royal Air Force hunted the ramps down from the sky in a campaign called Operation Crossbow. Fighter-bombers swooped in low and fast to dodge the big flak guns.",
      tip: "An Air Force mission: everything you have can fly! Fighters sneak under the flak, so use them to knock out the Flak 88s, then send in the bombers.",
      fortX: 470,
      fort: [
        ".................g............",
        "...............=====..........",
        "S...S.YY....YY.C...C.S...S....",
        "Sf--S.YYv--.YY.CgJoC.Sf--S.v--"
      ],
      airOnly: true,
      arsenal: { p51s: 2, p47: 2, rockets: 2, b26: 2, b17: 1 },
      wind: 1
    },
    {
      id: "bastogne", name: "Bastogne", date: "December 1944", theme: "snow", width: 900,
      history: "In the snowy winter of 1944, American paratroopers were surrounded at Bastogne, Belgium. When the Germans told them to surrender, General McAuliffe answered with one word: “Nuts!” Patton's tanks broke through the day after Christmas.",
      tip: "The Tiger fires at your vehicles. Hit it with the Bazooka before you send the Sherman.",
      fortX: 500,
      fort: [
        ".....o..........n....",
        "...=====......=====..",
        "S..C.W.C..S...W...W.S",
        "Sm-CgWJC..S.g.WJ.gW.S"
      ],
      extras: [{ type: "wire", x: 380 }, { type: "tiger", x: 440 }],
      arsenal: { rifleman: 3, para: 2, sarge: 1, engineer: 1, grenade: 2, bazooka: 2, sherman: 1, b17: 1 },
      wind: 2, stars: [16000, 24000]
    },
    {
      id: "remagen", name: "Remagen Bridge", date: "March 7, 1945", theme: "rhine", width: 1000,
      history: "American soldiers reached the Ludendorff Bridge over the Rhine River and were amazed to find it still standing. The Germans set off their explosives, but the bridge stayed up! Sergeant Alexander Drabik was the first to run across, and it became the first bridge over the Rhine that the Allies captured.",
      tip: "Drive across the bridge, but don't fall in the river. The Flak 88 on the cliff shoots down planes, so knock it out before you call the Mustang.",
      fortX: 328,
      trenches: [{ x: 360, w: 192, d: 40, water: true }],
      cliff: { x: 760, h: 56 },
      fort: [
        "..............g.....................",
        "..============CC.................n..",
        ".....C....C...CC....S..S...S.....S..",
        ".....C....C...CCJ...Sm-S...Sgf--.S.o"
      ],
      arsenal: { rifleman: 3, sarge: 1, engineer: 2, grenade: 2, bazooka: 2, mortar: 1, halftrack: 1, sherman: 1, p51: 1 },
      wind: 2
    }
  ]
});
