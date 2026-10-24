// Battle pack: Vikings · the Great Viking Army at Rochester and Paris, 885-886
// (pack format is described at the top of ww2.js; a trench with `water: true` is a river that boats can float on)
// Real Viking helmets were round with a nose guard. The famous horns were invented in the 1800s.
(window.ANGRY_PACKS = window.ANGRY_PACKS || []).push({
  id: "vikings",
  name: "Vikings",
  years: "885–886",
  side: "Viking army",
  foe: "Franks and English",
  icon: "raider",
  blurb: "Row longships up the river, send in berserkers, throw axes and float a burning fire ship at the tower.",
  props: { bunker: "log", pennant: ["#b8322a", "#ffd23f"] },

  units: {
    raider:    { name: "Raider", kind: "sling", sprite: "raider", w: 12, h: 16, density: 0.003, best: "townsman",
                 tap: "shout", shout: "FOR ODIN!", hint: "Drag back to aim, let go to launch. Tap in the air to shout." },
    berserker: { name: "Berserker", kind: "sling", sprite: "berserker", w: 12, h: 16, density: 0.0045, power: 1.4, best: "shieldman",
                 tap: "dash", dash: 16, pierce: 1, pierceDmg: 5, shout: "BERSERK!",
                 hint: "Wild and fearless. Tap mid-flight and he charges straight through the first thing he hits." },
    axe:       { name: "Throwing axes", kind: "fire", sprite: "proj_axe", gunner: "axe_thrower", w: 9, h: 9, density: 0.004, best: "frank_archer",
                 faceVel: false, spin: 0.35, power: 2, spread: { n: 2, deg: 5 }, sound: "whoosh",
                 hint: "Two spinning axes at once. Great for knocking archers off the walls." },
    ram:       { name: "Battering ram", kind: "drive", sprite: "ram", w: 36, h: 12, ox: -2, density: 0.006, best: "door",
                 speed: 0.9, push: 0.3, hp: 8, tap: "ram", ramSpeed: 2.8, shout: "HEAVE!",
                 hint: "Tap to roll it to the gate, then tap to swing. It sinks in rivers!" },
    longship:  { name: "Longship", kind: "drive", sprite: "longship", w: 48, h: 12, density: 0.004, best: "palisade", boat: true,
                 speed: 1.1, push: 0.4, hp: 9, tap: "unload", unload: { unit: "raider", count: 4, vx: 2.6, vy: -8.5, spread: 1 },
                 shout: "TO THE WALLS!", hint: "Tap to haul it out. It floats across rivers. Tap again and four raiders leap out." },
    fireship:  { name: "Fire ship", kind: "drive", sprite: "fireship", w: 48, h: 12, density: 0.004, best: "log", boat: true,
                 speed: 1.2, push: 0.45, hp: 4, tap: "blowup", boom: { r: 54, p: 5.5 },
                 hint: "Tap to send it floating toward the fort, then tap again to make it burst into flames." },
    catapults: { name: "Catapults", kind: "air", style: "rain", icon: "mangonel", count: 5, gap: 20, every: 260, vx: 2.6, vy: -0.5,
                 say: "LOOSE!", sound: "whoosh",
                 proj: { sprite: "proj_boulder", w: 10, h: 10, round: true, density: 0.02, power: 2.2, bounce: 0.15 },
                 hint: "Tap a spot and the siege catapults hurl five boulders at it." }
  },
  order: ["raider", "berserker", "axe", "ram", "longship", "fireship", "catapults"],

  blocks: {
    C: { key: "stone", name: "Stone wall", hp: 6, density: 0.0045, pts: 500, debris: ["#a39b8b", "#cbc4b4"] },
    W: { key: "wood", name: "Planks", hp: 2.2, density: 0.0015, pts: 200, debris: ["#a8693a", "#5e3a1d"] },
    L: { key: "log", name: "Timber", hp: 2.6, density: 0.0018, pts: 200, debris: ["#a8693a", "#d9bc80"] },
    P: { key: "palisade", name: "Palisade", hp: 3, density: 0.003, pts: 300, debris: ["#a8693a", "#5e3a1d"] },
    T: { key: "thatch", name: "Thatch", hp: 1, density: 0.0008, pts: 100, debris: ["#d9b44a", "#9c7a2c"] },
    D: { key: "door", name: "Gate", hp: 3, density: 0.002, pts: 300, debris: ["#a8693a", "#26282e"] },
    J: { key: "pitchpot", name: "Pot of pitch", hp: 0.5, density: 0.002, pts: 200, debris: ["#26282e", "#ff6a00"], explodes: { r: 34, p: 3.4 }, fire: true },
    "=": { key: "stone", sprite: "stone", slab: true, hp: 7, density: 0.0045, pts: 800, debris: ["#a39b8b", "#cbc4b4"] },
    "~": { key: "log", sprite: "log", slab: true, hp: 2.8, density: 0.0018, pts: 300, debris: ["#a8693a", "#d9bc80"] }
  },
  defenders: {
    f: { key: "frank", name: "Spearman", w: 12, h: 17, hp: 1.6, density: 0.002, pts: 500 },
    t: { key: "townsman", name: "Townsman", w: 12, h: 17, hp: 1.3, density: 0.002, pts: 500 },
    s: { key: "shieldman", name: "Shield bearer", w: 14, h: 16, hp: 3.2, density: 0.003, pts: 1000 },
    a: { key: "frank_archer", name: "Archer", w: 12, h: 17, hp: 1.5, density: 0.002, pts: 1000,
         react: { type: "shooter", range: 105, height: 55, say: "THWIP!", sound: "thwack", muzzle: { x: -8, y: -6 } } },
    o: { key: "cauldron", name: "Hot pitch", w: 14, h: 12, hp: 2, density: 0.004, pts: 1500,
         react: { type: "oil", range: 44, every: 1500, damage: 3, say: "HOT PITCH!" } },
    O: { key: "count_odo", name: "Count Odo", w: 12, h: 17, hp: 4, density: 0.0025, pts: 5000 }
  },

  themes: {
    kent:  { sky: ["#74b4e6", "#9ccaef", "#cbe3f5"], sun: "#ffe25a", clouds: true, hills: ["#8fc47e", "#6fa860"], trees: "oak", split: 9999,
             left:  { top: "#4fae3f", hi: "#8bd85e", base: "#7a5634", lo: "#5a3c22" },
             right: { top: "#4fae3f", hi: "#8bd85e", base: "#7a5634", lo: "#5a3c22" } },
    seine: { sky: ["#8db3d6", "#b0cbe2", "#dfe6e6"], sun: "#ffe9a8", clouds: true, cloud: "#eef0ee", hills: ["#8f9a5a", "#737f48"],
             trees: "oak", treeColor: "#c97a2b", water: "#3f6f9a", waterHi: "#9cc4e0", split: 9999,
             left:  { top: "#7a9a3c", hi: "#a4be5c", base: "#6b4a2b", lo: "#4f361f" },
             right: { top: "#7a9a3c", hi: "#a4be5c", base: "#6b4a2b", lo: "#4f361f" } },
    flood: { sky: ["#6f777f", "#868d92", "#a2a59e"], clouds: true, cloud: "#b2b4ad", hills: ["#6a7a5a", "#56664a"], trees: "oak", treeColor: "#4a5a3a",
             weather: "rain", water: "#4a6b80", waterHi: "#a9c2d0", split: 9999,
             left:  { top: "#5f7a3a", hi: "#7d9a4c", base: "#5a4630", lo: "#43341f" },
             right: { top: "#5f7a3a", hi: "#7d9a4c", base: "#5a4630", lo: "#43341f" } }
  },

  levels: [
    {
      id: "rochester", name: "Rochester", date: "885", theme: "kent", width: 800,
      history: "In 885, a Viking army besieged the English town of Rochester and even built its own fort right outside the old Roman walls. The townspeople held out until King Alfred the Great marched in with an army, and the Vikings ran back to their ships.",
      tip: "The archer on the wall shoots down troops that fly low. Knock him off with throwing axes, then send in the raiders.",
      fortX: 470,
      fort: [
        "a.........",
        "CC....TTT.",
        "CC....~~~.",
        "CC....W.W.",
        "CCD.t.WtWf"
      ],
      extras: [{ type: "palisade", x: 420 }],
      arsenal: { raider: 2, berserker: 1, axe: 2, ram: 1 },
      wind: 0
    },
    {
      id: "paris", name: "Siege of Paris", date: "November 885", theme: "seine", width: 900,
      history: "In November 885, a huge Viking fleet sailed up the River Seine to Paris, which then sat on an island in the middle of the river. Count Odo and Bishop Gozlin defended a half-built wooden tower that guarded a bridge, and the Parisians worked through the night to make it taller.",
      tip: "Ride the longship across the river, then tap to send four raiders over the wall. Watch out for the hot pitch above the gate!",
      fortX: 470,
      trenches: [{ x: 336, w: 96, d: 24, water: true }],
      fort: [
        "a.o.........",
        "~~~.....a...",
        "W.W....~~~..",
        "W.W....P.P..",
        "CfC..s.PfP.t",
        "CDC..L.PJP.L"
      ],
      arsenal: { raider: 3, berserker: 1, axe: 2, longship: 1, catapults: 1 },
      wind: 2
    },
    {
      id: "paris_flood", name: "The Flood", date: "February 886", theme: "flood", width: 1040,
      history: "In February 886, the river flooded and swept away one of the bridges, cutting its little tower off from the city. Paris itself never fell: Count Odo held out for almost a year, and he was so famous for it that the Franks later chose him as their king.",
      tip: "The bridge is gone, so the ram can't reach the city. Float the fire ship up to the tower and tap to set it ablaze.",
      fortX: 470,
      trenches: [{ x: 330, w: 112, d: 26, water: true }, { x: 700, w: 72, d: 26, water: true }],
      fort: [
        "..o.......................a...",
        "a~~~a......................O..",
        "CW.WC...T.............C.=====.",
        "CW.WC...TT............C.C...C.",
        "C~~~C..~~~.L..........CsC..fC.",
        "CDJDC..W.W.L..........CJC.t.CJ"
      ],
      arsenal: { raider: 2, berserker: 2, axe: 3, longship: 1, fireship: 1, catapults: 1 },
      wind: 2
    }
  ]
});
