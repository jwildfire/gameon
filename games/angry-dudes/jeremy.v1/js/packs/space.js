// Battle pack: Space Battle · the future (made up, unlike the other packs!)
// (pack format is described at the top of ww2.js; a level's `gravity` makes everything fall slower:
// 1 is Earth, and the real Moon is about one sixth)
(window.ANGRY_PACKS = window.ANGRY_PACKS || []).push({
  id: "space",
  name: "Space Battle",
  years: "The future",
  side: "Star Marines",
  foe: "the Robot Legion",
  icon: "marine",
  blurb: "Battle robots in low gravity: jetpack troopers, laser rifles that fly dead straight, a moon rover and an orbital strike.",
  props: { bunker: "metal", sling: "slingshot", pennant: ["#ff8c1a", "#e8e8e8"] },

  units: {
    marine:    { name: "Star marine", kind: "sling", sprite: "marine", w: 12, h: 16, density: 0.003, best: "robot",
                 tap: "shout", shout: "FOR EARTH!", hint: "Drag back to aim, let go to launch. Low gravity means they fly a long way, so pull gently!" },
    jetpack:   { name: "Jetpack trooper", kind: "sling", sprite: "jetpacker", w: 12, h: 16, density: 0.003, best: "laser_turret",
                 tap: "boost", boosts: 2, boost: 7, boostX: 5, shout: "JETPACK!",
                 hint: "Tap in the air to fire the jetpack and fly up and forward. Works twice per flight!" },
    powersuit: { name: "Power suit", kind: "sling", sprite: "power_suit", w: 16, h: 20, density: 0.008, power: 1.9, best: "plate",
                 tap: "pound", shout: "STOMP!", hint: "A heavy armored suit. Pull back hard, then tap to stomp straight down." },
    laser:     { name: "Laser rifle", kind: "fire", sprite: "proj_laser", gunner: "laser_gunner", w: 12, h: 3, density: 0.003, best: "robot",
                 lift: 1, pierce: 2, pierceDmg: 3, power: 1.5, speed: 1.3, life: 2500, sound: "zap",
                 hint: "Lasers fly perfectly straight and each beam can cut through two things. Line up your shot!" },
    plasma:    { name: "Plasma grenade", kind: "fire", sprite: "proj_plasma", gunner: "plasma_gunner", w: 7, h: 7, round: true, density: 0.004, best: "glass",
                 fuse: 2000, bounce: 0.5, boom: { r: 34, p: 3.6 }, hint: "A glowing grenade that bounces around, then goes off." },
    rover:     { name: "Moon rover", kind: "drive", sprite: "rover", w: 40, h: 14, density: 0.005, best: "plate", speed: 1.2, push: 0.45, hp: 9,
                 tap: "shoot", shots: 4, gun: { x: 22, y: -12, vx: 14, vy: 0 },
                 shell: { sprite: "proj_laser", w: 12, h: 3, density: 0.003, lift: 1, impact: true, life: 2000, boom: { r: 18, p: 2.6 }, best: "plate" },
                 hint: "Tap to drive out. Tap again to fire its laser turret (4 shots)." },
    dropship:  { name: "Dropship", kind: "air", style: "plane", sprite: "dropship", troops: "marine", bombs: 3, spacing: 22, speed: 2, alt: 30, say: "TROOPS AWAY!",
                 hint: "Tap where the marines should drop. Three of them float down onto the base." },
    orbital:   { name: "Orbital strike", kind: "air", style: "rain", icon: "starship", count: 5, gap: 18, every: 220, vx: 0.6, vy: 9, say: "ORBITAL STRIKE!", sound: "zap",
                 proj: { sprite: "proj_laser", w: 12, h: 3, density: 0.004, lift: 1, impact: true, life: 3000, boom: { r: 28, p: 3.4 } },
                 hint: "A starship in orbit fires five laser blasts straight down. Tap the target." }
  },
  order: ["marine", "jetpack", "powersuit", "laser", "plasma", "rover", "dropship", "orbital"],

  blocks: {
    P: { key: "plate", sprite: "metal", name: "Metal plate", hp: 5, density: 0.004, pts: 400, debris: ["#a9b2bf", "#646d7b"] },
    G: { key: "glass", name: "Glass dome", hp: 1.2, density: 0.0015, pts: 200, debris: ["#a9dcff", "#ffffff"] },
    E: { key: "cell", name: "Energy cell", hp: 0.5, density: 0.002, pts: 300, debris: ["#39ff88", "#646d7b"], explodes: { r: 38, p: 4 }, fire: true },
    R: { key: "rock", name: "Moon rock", hp: 6, density: 0.006, pts: 300, debris: ["#9a9ea3", "#c4c7cb"] },
    "=": { key: "girder", sprite: "girder", slab: true, hp: 6, density: 0.004, pts: 600, debris: ["#a9b2bf", "#26282e"] },
    "~": { key: "plate", sprite: "metal", slab: true, hp: 5, density: 0.004, pts: 500, debris: ["#a9b2bf", "#646d7b"] }
  },
  defenders: {
    r: { key: "robot", name: "Robot trooper", w: 12, h: 17, hp: 1.6, density: 0.0025, pts: 500 },
    t: { key: "laser_turret", name: "Laser turret", w: 22, h: 14, hp: 3, density: 0.004, pts: 1500, cells: 2,
         react: { type: "shooter", range: 120, height: 60, say: "ZAP!", sound: "zap", muzzle: { x: -12, y: -6 } } },
    f: { key: "repair_bot", name: "Repair bot", w: 14, h: 12, hp: 1.4, density: 0.002, pts: 2000,
         react: { type: "heal", amount: 1, say: "REPAIRED!" } },
    c: { key: "robot_cannon", name: "Plasma cannon", w: 28, h: 14, hp: 3.5, density: 0.006, pts: 3000, cells: 2,
         react: { type: "antitank", every: 1900, range: 340, muzzle: { x: -16, y: -5 }, vx: -12, vy: -0.5,
                  shell: { sprite: "proj_plasma", w: 7, h: 7, round: true, density: 0.006, enemy: true, impact: true, boom: { r: 16, p: 2.5 } } } },
    M: { key: "mega_bot", name: "Mega-Bot", w: 20, h: 28, hp: 5, density: 0.004, pts: 10000, cells: 2 }
  },

  themes: {
    moon:     { sky: ["#05060f", "#0b0f24", "#141a3a"], night: true, planet: ["#3f78b5", "#4fae3f"], hills: ["#3a3d46", "#2c2f37"], split: 9999,
                rock: ["#8d9097", "#6f7279", "#b9bcc2"],
                trench: { cut: "#4f5259", plank: "#6f7279", floor: "#8d9097", slat: "#5a5d66" },
                left:  { top: "#b9bcc2", hi: "#d7d9dd", base: "#8d9097", lo: "#6f7279" },
                right: { top: "#b9bcc2", hi: "#d7d9dd", base: "#8d9097", lo: "#6f7279" } },
    asteroid: { sky: ["#120a24", "#24123f", "#3a1a55"], night: true, planet: ["#c98d3c", "#e8b45a", "#d9c4aa"], hills: ["#3b2a4a", "#2c1f38"], split: 9999,
                rock: ["#6a5a4a", "#4f4237", "#8a7862"],
                left:  { top: "#7a6a5a", hi: "#9a8a78", base: "#5a4a3c", lo: "#43362b" },
                right: { top: "#7a6a5a", hi: "#9a8a78", base: "#5a4a3c", lo: "#43362b" } }
  },

  levels: [
    {
      id: "moonbase", name: "Moon Base Alpha", date: "The year 2187", theme: "moon", width: 1000, gravity: 0.45,
      history: "This battle is made up: it hasn't happened (yet!). The Robot Legion has taken over Moon Base Alpha. Here's a real fact, though: gravity on the Moon is only about one sixth as strong as on Earth, so everything floats a lot farther than you expect.",
      tip: "Pull back gently: in low gravity a full pull flies right over the base. The repair bot fixes the other robots, so get it first.",
      fortX: 480,
      craters: [{ x: 300, r: 14 }, { x: 380, r: 9 }, { x: 760, r: 11 }],
      fort: [
        "................r.",
        ".....GGG......~~~~",
        "...~~~~~~~....P..P",
        "...P.....P....P..P",
        "c-.P.rEf.P.t-.Pr.P"
      ],
      arsenal: { marine: 3, jetpack: 2, laser: 2, plasma: 2, rover: 1 },
      wind: 0
    },
    {
      id: "asteroid", name: "Mega-Bot's Asteroid", date: "The year 2187", theme: "asteroid", width: 1000, gravity: 0.32,
      history: "Also made up! The robots' leader, the giant Mega-Bot, has built a fortress on an asteroid. Real asteroids are so small that their gravity is incredibly weak; a strong jump could send you flying off into space.",
      tip: "Mega-Bot is tough. Break open his fortress roof with plasma grenades or the orbital strike, then send in the power suit.",
      fortX: 470,
      cliff: { x: 694, h: 40 },
      craters: [{ x: 320, r: 12 }, { x: 560, r: 10 }],
      fort: [
        ".....r.........t-........r.",
        "...=====......=====....====",
        "...P...P......P...P....P..P",
        "c-.P...P.t-...P.E.P..f.PM-P"
      ],
      arsenal: { marine: 2, jetpack: 2, powersuit: 2, laser: 2, plasma: 2, rover: 1, dropship: 1, orbital: 1 },
      wind: 0
    }
  ]
});
