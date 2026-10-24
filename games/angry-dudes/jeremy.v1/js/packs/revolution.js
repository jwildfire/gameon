// Battle pack: American Revolution · Saratoga (1777), Stony Point (1779) and Yorktown (1781)
// (pack format is described at the top of ww2.js)
(window.ANGRY_PACKS = window.ANGRY_PACKS || []).push({
  id: "revolution",
  name: "American Revolution",
  years: "1777–1781",
  side: "Continental Army",
  foe: "British Army",
  icon: "minuteman",
  blurb: "Bayonet-charge redoubts at night, chop through the abatis, spray grapeshot and roll a powder wagon into the fort.",
  props: { bunker: "gabion", pennant: ["#2b4a8c", "#efe9d8"] },

  units: {
    minuteman: { name: "Minuteman", kind: "sling", sprite: "minuteman", w: 12, h: 16, density: 0.003, best: "redcoat",
                 tap: "shout", shout: "HUZZAH!", hint: "Drag back to aim, let go to launch. Tap in the air to shout." },
    bayonet:   { name: "Light infantry", kind: "sling", sprite: "light_infantry", w: 12, h: 16, density: 0.0035, power: 1.2, best: "grenadier",
                 tap: "dash", dash: 15, shout: "BAYONETS!", hint: "Launch, then tap for a bayonet charge." },
    axeman:    { name: "Axeman", kind: "sling", sprite: "axeman", w: 12, h: 16, density: 0.004, power: 1.2, best: "abatis",
                 tap: "dash", dash: 14, pierce: 1, pierceDmg: 5, shout: "CHOP!",
                 hint: "Axemen went first to hack through the sharpened-log barriers. Tap mid-flight to charge with the axe." },
    rifle:     { name: "Long rifle", kind: "fire", sprite: "proj_rifleball", gunner: "frontiersman", w: 4, h: 2, density: 0.006, best: "general",
                 lift: 0.97, soft: true, power: 5, stick: true, speed: 1.2, sound: "shot",
                 hint: "A frontier long rifle. The shot flies almost flat and never misses a soldier it hits." },
    cannon:    { name: "Cannon", kind: "fire", sprite: "proj_cannonball", gunner: "cannon", w: 6, h: 6, round: true, density: 0.03, best: "earth",
                 power: 2.2, bounce: 0.25, speed: 1.1, hint: "Solid iron cannonballs bounce and roll right through walls." },
    grapeshot: { name: "Grapeshot", kind: "fire", sprite: "proj_grape", gunner: "cannon", w: 4, h: 4, round: true, density: 0.008, best: "redcoat",
                 soft: true, power: 3, spread: { n: 5, deg: 4 }, speed: 1.1, bounce: 0.1,
                 hint: "A cannon loaded with a bag of small iron balls. It sprays five shots: great against soldiers, weak against walls." },
    mortar:    { name: "Mortar", kind: "fire", sprite: "proj_mortarshell", gunner: "mortar_1781", w: 8, h: 8, round: true, density: 0.006, best: "gabion",
                 fuse: 2600, bounce: 0.2, wind: true, boom: { r: 40, p: 4.2 }, hint: "A heavy shell with a burning fuse. It goes off a few seconds after you fire." },
    wagon:     { name: "Powder wagon", kind: "drive", sprite: "powder_wagon", w: 34, h: 14, ox: 1, density: 0.003, best: "abatis",
                 speed: 1.3, push: 0.5, hp: 3, tap: "blowup", boom: { r: 50, p: 5 }, hint: "Tap to send it rolling, then tap again to blow it sky high!" },
    battery:   { name: "Siege battery", kind: "air", style: "rain", icon: "cannon", count: 6, gap: 18, every: 220, vx: 3, vy: 0, say: "FIRE!", sound: "thump",
                 proj: { sprite: "proj_cannonball", w: 6, h: 6, round: true, density: 0.03, power: 2.2, bounce: 0.2 },
                 hint: "Tap the fort. The big siege guns fire a barrage of cannonballs." }
  },
  order: ["minuteman", "bayonet", "axeman", "rifle", "cannon", "grapeshot", "mortar", "wagon", "battery"],

  blocks: {
    E: { key: "earth", name: "Earthwork", hp: 4, density: 0.004, pts: 300, debris: ["#7a5634", "#5f6b34"] },
    B: { key: "gabion", name: "Gabion", hp: 3, density: 0.003, pts: 300, debris: ["#a8693a", "#7a5634"] },
    F: { key: "fascine", name: "Fascine", hp: 2, density: 0.0018, pts: 200, debris: ["#a8693a", "#9c7a2c"] },
    A: { key: "abatis", name: "Abatis", hp: 4, density: 0.005, pts: 300, debris: ["#a8693a", "#5e3a1d"], w: 16, h: 14, fixed: true },
    K: { key: "keg", name: "Powder keg", hp: 0.5, density: 0.002, pts: 300, debris: ["#a8693a", "#26282e"], explodes: { r: 38, p: 4 }, fire: true },
    L: { key: "log", name: "Log wall", hp: 2.5, density: 0.002, pts: 200, debris: ["#a8693a", "#d9bc80"] },
    W: { key: "wood", name: "Supply crate", hp: 2.2, density: 0.0015, pts: 200, debris: ["#a8693a", "#5e3a1d"] },
    "~": { key: "wood", sprite: "fascine", slab: true, hp: 3, density: 0.0018, pts: 300, debris: ["#a8693a", "#9c7a2c"] }
  },
  defenders: {
    r: { key: "redcoat", name: "Redcoat", w: 12, h: 17, hp: 1.6, density: 0.002, pts: 500 },
    g: { key: "grenadier", sprite: "grenadier_1781", name: "Grenadier", w: 12, h: 19, hp: 2, density: 0.002, pts: 1000,
         react: { type: "shooter", range: 100, height: 50, say: "VOLLEY!", sound: "volley", muzzle: { x: 6, y: -14 } } },
    c: { key: "cannon", sprite: "british_cannon", name: "British cannon", w: 26, h: 12, hp: 3.5, density: 0.006, pts: 3000, cells: 2,
         react: { type: "antitank", every: 1800, range: 320, muzzle: { x: -17, y: -4 }, vx: -12, vy: -0.5,
                  shell: { sprite: "proj_cannonball", w: 6, h: 6, round: true, density: 0.01, enemy: true, impact: true, boom: { r: 16, p: 2.5 } } } },
    G: { key: "general", sprite: "cornwallis", name: "General Cornwallis", w: 12, h: 17, hp: 3.5, density: 0.0025, pts: 5000 },
    b: { key: "brunswicker", name: "Brunswick soldier", w: 12, h: 17, hp: 1.6, density: 0.002, pts: 500 },
    y: { key: "breymann", name: "Colonel Breymann", w: 12, h: 17, hp: 3.5, density: 0.0025, pts: 5000 },
    J: { key: "johnson", sprite: "cornwallis", name: "Colonel Johnson", w: 12, h: 17, hp: 3.5, density: 0.0025, pts: 5000 }
  },

  themes: {
    night:  { sky: ["#0b1430", "#14224a", "#1d2f5e"], night: true, hills: ["#1d3328", "#152a20"], trees: "oak", treeColor: "#1f3a24",
              weather: "fireflies", split: 9999,
              left:  { top: "#2f5a35", hi: "#3f7244", base: "#3e2a1a", lo: "#2c1d12" },
              right: { top: "#2f5a35", hi: "#3f7244", base: "#3e2a1a", lo: "#2c1d12" },
              water: "#1d3a5e", waterHi: "#4f7fb0", rock: ["#3a3a3e", "#2a2a2e", "#4f4f55"] },
    autumn: { sky: ["#7db7e8", "#a8cdee", "#d6e6f2"], sun: "#ffe25a", clouds: true, hills: ["#c9874a", "#a8683a"], trees: "oak", treeColor: "#d9822b",
              split: 9999,
              left:  { top: "#7a9a3c", hi: "#a4be5c", base: "#7a5634", lo: "#5a3c22" },
              right: { top: "#7a9a3c", hi: "#a4be5c", base: "#7a5634", lo: "#5a3c22" } }
  },

  levels: [
    {
      id: "breymann", name: "Breymann Redoubt", date: "October 7, 1777", theme: "autumn", width: 820,
      history: "During the Battle of Saratoga, General Benedict Arnold galloped onto the field and led a charge on the Breymann Redoubt, a wall of logs held by soldiers from Brunswick in Germany. The Americans broke in, and ten days later the whole British army surrendered. The victory helped convince France to join the war on America's side.",
      tip: "The log walls are tough. Bounce cannonballs through them, or launch your troops high over the top.",
      fortX: 470,
      fort: [
        "......b...",
        "c-...~~~.b",
        "LL.L.W.W.L",
        "LL.L.WyW.L"
      ],
      arsenal: { minuteman: 4, bayonet: 2, rifle: 2, cannon: 2 },
      wind: 0
    },
    {
      id: "stonypoint", name: "Stony Point", date: "July 16, 1779", theme: "night", width: 900,
      history: "At midnight, General \u201cMad Anthony\u201d Wayne's light infantry waded through a marsh to attack the British fort at Stony Point on the Hudson River. They carried unloaded muskets and used only bayonets so no shot would give them away, while axemen chopped through the sharpened-log barriers. In about half an hour the fort was theirs.",
      tip: "Axemen are the best way through the abatis. Grapeshot sprays the soldiers on the hill.",
      fortX: 472,
      trenches: [{ x: 340, w: 64, d: 16, water: true }],
      cliff: { x: 600, h: 40 },
      fort: [
        ".................r.",
        "................~~~",
        "...EE.....c-g...E.E",
        "AA.EEr..A.EEE.rKEJE"
      ],
      arsenal: { minuteman: 3, bayonet: 3, axeman: 2, rifle: 1, grapeshot: 2 },
      wind: 1
    },
    {
      id: "redoubt10", name: "Redoubt No. 10", date: "October 14, 1781", theme: "night",
      history: "On a dark October night, Alexander Hamilton led 400 soldiers in a surprise bayonet charge on a British fort at Yorktown. They kept their muskets unloaded so nobody would fire by accident and give them away.",
      tip: "Bayonet charges are your best weapon tonight. Tap mid-flight to charge.",
      fortX: 470,
      fort: [
        "r.g..c-.",
        "~~~~~~~~",
        "EEB...BE",
        "EEBr.KBE"
      ],
      extras: [{ type: "abatis", x: 380 }, { type: "abatis", x: 420 }],
      arsenal: { minuteman: 3, bayonet: 3, rifle: 2, mortar: 1 },
      wind: 1, stars: [14000, 20000]
    },
    {
      id: "yorktown", name: "Siege of Yorktown", date: "October 1781", theme: "autumn",
      history: "General George Washington fired the very first American cannon at Yorktown. After days of pounding, General Cornwallis surrendered his army on October 19, 1781, and the war was nearly won.",
      tip: "The British cannon fires at your powder wagon. Knock it out first, then roll the wagon up to the fort.",
      fortX: 460,
      fort: [
        "...G..g..",
        "~~~~~~~~~",
        "EEB.r.BEE",
        "EEBFWKBEE"
      ],
      extras: [{ type: "cannon", x: 404 }],
      arsenal: { minuteman: 3, bayonet: 2, rifle: 1, cannon: 2, mortar: 1, wagon: 1, battery: 1 },
      wind: 2, stars: [16000, 24000]
    }
  ]
});
