// Delve Squad: the rules. Classes, monsters, loot, floors and the fights themselves.
// Nothing here draws or plays sound, so the same code runs in the game and in a balance test.
(function (root) {
"use strict";

// ---------- seeded random numbers ----------
function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mix(a, b) {
  var h = Math.imul((a >>> 0) ^ 0x9e3779b9, 2654435761) ^ Math.imul((b >>> 0) + 0x7f4a7c15, 1597334677);
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16;
  return h >>> 0;
}
function pick(r, list) { return list[Math.floor(r() * list.length)]; }

// ---------- heroes ----------
var CLASSES = {
  fighter: { name: "Fighter", hp: 130, atk: 10, def: 7, rate: 1.0, range: 0, move: 70, crit: 0.05,
    ability: "Shield Wall", about: "Raises a big shield, takes less damage and makes the monsters come for them.", cd: 7 },
  rogue: { name: "Rogue", hp: 85, atk: 10, def: 3, rate: 0.62, range: 0, move: 100, crit: 0.2,
    ability: "Shadow Step", about: "Vanishes and pops up behind the weakest monster for a huge hit.", cd: 5 },
  cleric: { name: "Cleric", hp: 95, atk: 7, def: 4, rate: 1.1, range: 140, move: 65, crit: 0.05,
    ability: "Healing Light", about: "Shines a warm light that heals the most hurt friend.", cd: 3.2 },
  wizard: { name: "Wizard", hp: 70, atk: 12, def: 2, rate: 1.35, range: 180, move: 60, crit: 0.08,
    ability: "Fireball", about: "Throws a fireball that bursts over a whole bunch of monsters.", cd: 4.5 }
};
var CLASS_KEYS = ["fighter", "rogue", "cleric", "wizard"];
var NAMES = ["Bram", "Pip", "Mira", "Tok", "Zed", "Wren", "Ollo", "Fen", "Juno", "Rook", "Sable", "Bix",
  "Nell", "Oz", "Quill", "Tilda", "Gus", "Ivy", "Moss", "Rory", "Kit", "Lark", "Dex", "Hob"];

function makeHero(cls, r) {
  return { cls: cls, name: pick(r, NAMES), level: 1, items: { weapon: null, armor: null, charm: null }, hp: 1, down: false };
}
function makeParty(classes, r) {
  var used = {};
  var party = classes.map(function (c) {
    var h = makeHero(c, r), tries = 0;
    while (used[h.name] && tries++ < 30) h.name = pick(r, NAMES);
    used[h.name] = true;
    return h;
  });
  party.forEach(function (h) { h.hp = heroStats(h).maxHp; });
  return party;
}

// Everything a hero brings into a fight: class, level and the three item slots.
function heroStats(h, items) {
  var c = CLASSES[h.cls], it = items || h.items, grow = Math.pow(1.07, h.level - 1);
  var s = { maxHp: Math.round(c.hp * grow), atk: c.atk * grow, def: c.def + (h.level - 1) * 0.5, rate: c.rate,
    crit: c.crit, lifesteal: 0, regen: 0, thorns: 0, cdMult: 1, range: c.range, move: c.move };
  ["weapon", "armor", "charm"].forEach(function (slot) {
    var i = it[slot]; if (!i) return;
    s.atk += i.atk || 0; s.def += i.def || 0; s.maxHp += i.hp || 0;
    if (i.effect === "lifesteal") s.lifesteal += i.value;
    if (i.effect === "crit") s.crit += i.value;
    if (i.effect === "regen") s.regen += i.value;
    if (i.effect === "thorns") s.thorns += i.value;
    if (i.effect === "haste") s.rate /= (1 + i.value);
    if (i.effect === "rune") s.cdMult *= (1 - i.value);
  });
  s.atk = Math.round(s.atk); s.def = Math.round(s.def);
  return s;
}

// ---------- loot ----------
var RARITY = [
  { id: "common", name: "Common", mult: 1.0 },
  { id: "rare", name: "Rare", mult: 1.3 },
  { id: "epic", name: "Epic", mult: 1.65 },
  { id: "legendary", name: "Legendary", mult: 2.1 }
];
var WEAPONS = ["Sword", "Axe", "Dagger", "Staff", "Mace", "Hammer", "Wand", "Spear"];
var ARMORS = ["Leather Vest", "Chain Shirt", "Plate", "Robe", "Cloak", "Helm"];
var PREFIX = {
  common: ["Rusty", "Old", "Plain", "Chipped", "Dusty"],
  rare: ["Sharp", "Silver", "Glowing", "Moonlit", "Sturdy"],
  epic: ["Rune", "Starforged", "Thunder", "Frost", "Ember"],
  legendary: ["Dragon", "Sun King's", "Phoenix", "Comet", "Giant's"]
};
var CHARMS = [
  { effect: "lifesteal", name: "Vampire Fang", base: 0.12, step: 0.05, text: function (v) { return "Heals " + Math.round(v * 100) + "% of damage dealt"; } },
  { effect: "crit", name: "Lucky Clover", base: 0.1, step: 0.05, text: function (v) { return "+" + Math.round(v * 100) + "% critical hits"; } },
  { effect: "regen", name: "Troll Moss", base: 0.012, step: 0.005, text: function (v) { return "Heals " + (v * 100).toFixed(1).replace(/\.0$/, "") + "% HP a second"; } },
  { effect: "thorns", name: "Spiky Ring", base: 0.25, step: 0.1, text: function (v) { return "Hits back " + Math.round(v * 100) + "% of melee damage"; } },
  { effect: "haste", name: "Swift Feather", base: 0.15, step: 0.07, text: function (v) { return Math.round(v * 100) + "% faster attacks"; } },
  { effect: "rune", name: "Power Rune", base: 0.2, step: 0.08, text: function (v) { return "Ability " + Math.round(v * 100) + "% sooner"; } }
];
var CHARM_PREFIX = { common: "Little", rare: "Bright", epic: "Grand", legendary: "Mythic" };

function rollRarity(r, floor) {
  var x = r();
  if (floor >= 4 && x > 0.965) return 3;
  if (x > 0.85) return 2;
  if (x > 0.55) return 1;
  return 0;
}
function makeItem(r, floor, slot, rarity) {
  var R = RARITY[rarity], m = R.mult, it = { slot: slot, rarity: R.id, floor: floor };
  if (slot === "weapon") {
    it.atk = Math.max(1, Math.round((3 + floor * 1.5) * m));
    it.name = pick(r, PREFIX[R.id]) + " " + pick(r, WEAPONS);
    if (rarity >= 2 && r() < 0.5) { it.crit = 0; }
  } else if (slot === "armor") {
    it.def = Math.max(1, Math.round((2 + floor * 0.7) * m));
    it.hp = Math.round((10 + floor * 5) * m);
    it.name = pick(r, PREFIX[R.id]) + " " + pick(r, ARMORS);
  } else {
    var c = pick(r, CHARMS);
    it.effect = c.effect; it.value = +(c.base + c.step * rarity).toFixed(3);
    it.hp = Math.round((4 + floor * 2) * m);
    it.name = CHARM_PREFIX[R.id] + " " + c.name;
    it.text = c.text(it.value);
  }
  delete it.crit;
  return it;
}
function itemLines(it) {
  var out = [];
  if (it.atk) out.push("+" + it.atk + " ATK");
  if (it.def) out.push("+" + it.def + " DEF");
  if (it.hp) out.push("+" + it.hp + " HP");
  if (it.text) out.push(it.text);
  return out;
}
// The loot on offer at the campfire before a floor: two more cards than there are heroes.
function makeLoot(seed, floor, count, afterBoss) {
  var r = rng(mix(seed, 1000 + floor)), out = [], slots = ["weapon", "armor", "charm"];
  for (var i = 0; i < count; i++) {
    var slot = i < 3 ? slots[i] : pick(r, slots);
    out.push(makeItem(r, floor, slot, rollRarity(r, floor)));
  }
  if (afterBoss) {
    var k = Math.floor(r() * count);
    out[k] = makeItem(r, floor, out[k].slot, 3);
  }
  for (var j = out.length - 1; j > 0; j--) { var q = Math.floor(r() * (j + 1)); var t = out[j]; out[j] = out[q]; out[q] = t; }
  return out;
}

// ---------- monsters ----------
var MONSTERS = {
  rat: { name: "Cellar Rat", hp: 24, atk: 4, def: 0, rate: 0.8, range: 0, move: 95, r: 10 },
  bat: { name: "Bat", hp: 18, atk: 4, def: 0, rate: 0.7, range: 0, move: 125, r: 10, fly: true },
  slime: { name: "Slime", hp: 60, atk: 6, def: 1, rate: 1.3, range: 0, move: 42, r: 14 },
  skeleton: { name: "Skeleton", hp: 42, atk: 7, def: 3, rate: 1.1, range: 0, move: 62, r: 13 },
  archer: { name: "Goblin Archer", hp: 32, atk: 7, def: 1, rate: 1.5, range: 165, move: 60, r: 12 },
  ghost: { name: "Ghost", hp: 36, atk: 8, def: 0, rate: 1.2, range: 0, move: 72, r: 13, dodge: 0.25, fly: true },
  spider: { name: "Cave Spider", hp: 34, atk: 6, def: 2, rate: 0.7, range: 0, move: 105, r: 12 },
  wisp: { name: "Ice Wisp", hp: 30, atk: 8, def: 0, rate: 1.4, range: 150, move: 70, r: 11, fly: true },
  imp: { name: "Fire Imp", hp: 32, atk: 9, def: 1, rate: 1.5, range: 155, move: 72, r: 11 },
  golem: { name: "Stone Golem", hp: 150, atk: 13, def: 6, rate: 1.9, range: 0, move: 40, r: 20, big: true },
  ogre: { name: "Ogre", hp: 140, atk: 15, def: 4, rate: 1.8, range: 0, move: 46, r: 20, big: true },
  shade: { name: "Shade", hp: 44, atk: 10, def: 1, rate: 1.0, range: 0, move: 90, r: 13, dodge: 0.2, fly: true }
};
var BOSSES = [
  { id: "ratking", name: "The Rat King", hp: 360, atk: 11, def: 3, rate: 1.0, range: 0, move: 60, r: 30, moves: ["summon"], minion: "rat" },
  { id: "boneking", name: "The Bone King", hp: 700, atk: 15, def: 6, rate: 1.3, range: 0, move: 50, r: 30, moves: ["summon", "slam"], minion: "skeleton" },
  { id: "frostwyrm", name: "The Frost Wyrm", hp: 820, atk: 16, def: 5, rate: 1.4, range: 0, move: 55, r: 32, moves: ["breath", "slam"] },
  { id: "emberlich", name: "The Ember Lich", hp: 760, atk: 17, def: 4, rate: 1.6, range: 190, move: 45, r: 28, moves: ["volley", "summon"], minion: "imp" },
  { id: "shadowdragon", name: "The Shadow Dragon", hp: 1000, atk: 19, def: 6, rate: 1.5, range: 0, move: 55, r: 34, moves: ["breath", "slam", "summon"], minion: "shade" }
];
var THEMES = [
  { name: "Old Cellar", floor: "#3a332c", floor2: "#433a31", wall: "#1d1915", mortar: "#2c261f", torch: "#ffb347", pack: ["rat", "rat", "bat", "slime", "skeleton"], big: "golem" },
  { name: "Mossy Crypt", floor: "#2c3a2f", floor2: "#334235", wall: "#141c16", mortar: "#223026", torch: "#c8ff6a", pack: ["skeleton", "skeleton", "ghost", "spider", "archer"], big: "golem" },
  { name: "Frost Caves", floor: "#2a3646", floor2: "#314054", wall: "#121a24", mortar: "#22303f", torch: "#8fd8ff", pack: ["wisp", "spider", "bat", "skeleton", "archer"], big: "golem" },
  { name: "Ember Deep", floor: "#40292a", floor2: "#4a3030", wall: "#1c1010", mortar: "#331d1d", torch: "#ff7a3c", pack: ["imp", "imp", "skeleton", "archer", "slime"], big: "ogre" },
  { name: "Shadow Halls", floor: "#2e2840", floor2: "#352e4a", wall: "#130f1d", mortar: "#241d33", torch: "#c08cff", pack: ["shade", "ghost", "imp", "spider", "wisp"], big: "ogre" }
];
function themeFor(floor) { return THEMES[Math.floor((floor - 1) / 5) % THEMES.length]; }
function isBossFloor(floor) { return floor % 5 === 0; }
function bossFor(floor) {
  var i = Math.floor((floor - 1) / 5), b = BOSSES[i % BOSSES.length], lap = Math.floor(i / BOSSES.length);
  var out = {}; for (var k in b) out[k] = b[k];
  if (lap > 0) out.name = out.name.replace("The ", "The Elder ");
  return out;
}
// Monsters get tougher every floor.
function power(floor) { return Math.pow(1.155, floor - 1); }
var MATK = 1.55;

// A floor: a short winding path of rooms on a little grid map, each with a pack of monsters.
function makeFloor(seed, floor) {
  var r = rng(mix(seed, floor)), theme = themeFor(floor), boss = isBossFloor(floor);
  var n = boss ? 3 : Math.min(5, 3 + Math.floor(floor / 7));
  var cells = [{ x: 0, y: 1 + Math.floor(r() * 2) }], seen = {}, key = function (c) { return c.x + "," + c.y; };
  seen[key(cells[0])] = true;
  while (cells.length < n) {
    var last = cells[cells.length - 1], opts = [];
    [[1, 0], [0, 1], [0, -1]].forEach(function (d) {
      var c = { x: last.x + d[0], y: last.y + d[1] };
      if (c.y >= 0 && c.y <= 3 && !seen[key(c)]) opts.push(c);
    });
    var c = opts.length ? (r() < 0.6 ? opts[0] : pick(r, opts)) : { x: last.x + 1, y: last.y };
    seen[key(c)] = true; cells.push(c);
  }
  var side = [];
  for (var s = 0; s < 2; s++) {
    var from = cells[1 + Math.floor(r() * (n - 1))], d = pick(r, [[0, 1], [0, -1]]), sc = { x: from.x + d[0], y: from.y + d[1] };
    if (sc.y >= 0 && sc.y <= 3 && !seen[key(sc)]) { seen[key(sc)] = true; side.push({ x: sc.x, y: sc.y, from: cells.indexOf(from) }); }
  }
  var rooms = cells.map(function (c, i) {
    var room = { x: c.x, y: c.y, seed: mix(seed, floor * 31 + i), pack: [] };
    if (boss && i === n - 1) { room.boss = bossFor(floor); return room; }
    var budget = 2.2 + floor * 0.55 + i * 0.4 + r() * 1.2;
    if (boss) budget *= 0.75;
    if (floor >= 4 && r() < Math.min(0.55, 0.12 + floor * 0.03) && budget >= 4) { room.pack.push(theme.big); budget -= 3.5; }
    while (budget >= 1 && room.pack.length < 7) { room.pack.push(pick(r, theme.pack)); budget -= 1; }
    return room;
  });
  return { floor: floor, theme: theme, boss: boss, rooms: rooms, side: side };
}

// ---------- the battle ----------
// The room is 600 x 420 sideways (heroes come in from the left), or 420 x 600 on a tall phone
// screen (heroes come up from the bottom).
var W = 600, H = 420, WALL = 34;
function layout(portrait) { return portrait ? { W: H, H: W, portrait: true } : { W: W, H: H, portrait: false }; }

function unitFromHero(h, i, n, L) {
  var s = heroStats(h), c = CLASSES[h.cls];
  var melee = c.range === 0;
  var row = i - (n - 1) / 2;
  var x = melee ? 150 : 82, y = L.H / 2 + row * 92 + (melee ? 0 : 20);
  if (L.portrait) { y = L.H - (melee ? 150 : 82); x = L.W / 2 + row * 110 + (melee ? 0 : 16); }
  return {
    side: "hero", kind: h.cls, hero: h, name: h.name, x: x, y: y, r: 15,
    hp: Math.min(h.hp, s.maxHp), maxHp: s.maxHp, atk: s.atk, def: s.def, rate: s.rate, range: s.range, move: s.move,
    crit: s.crit, lifesteal: s.lifesteal, regen: s.regen, thorns: s.thorns, dodge: 0,
    cd: 0.3 + i * 0.15, ab: c.cd * s.cdMult * 0.6, abMax: c.cd * s.cdMult, alive: true, face: 1, swing: 0, flash: 0, shield: 0, stun: 0, id: 0
  };
}
function unitFromMonster(type, floor, x, y, elite) {
  var m = MONSTERS[type], p = power(floor);
  return {
    side: "monster", kind: type, name: m.name, x: x, y: y, r: m.r, hp: Math.round(m.hp * p), maxHp: Math.round(m.hp * p),
    atk: m.atk * p * MATK, def: m.def * Math.sqrt(p), rate: m.rate, range: m.range, move: m.move, crit: 0.05, dodge: m.dodge || 0,
    lifesteal: 0, regen: 0, thorns: 0, cd: 0.8, ab: 0, abMax: 0, alive: true, face: -1, swing: 0, flash: 0, shield: 0, stun: 0, fly: !!m.fly, big: !!m.big, id: 0
  };
}
function unitFromBoss(b, floor, L) {
  var p = power(floor);
  return {
    side: "monster", kind: b.id, boss: b, name: b.name, x: L.portrait ? L.W / 2 : L.W - 140, y: L.portrait ? 150 : L.H / 2, r: b.r, hp: Math.round(b.hp * p), maxHp: Math.round(b.hp * p),
    atk: b.atk * p * MATK, def: b.def * Math.sqrt(p), rate: b.rate, range: b.range, move: b.move, crit: 0.05, dodge: 0,
    lifesteal: 0, regen: 0, thorns: 0, cd: 1.2, ab: 3, abMax: 5.5, moveIndex: 0, alive: true, face: -1, swing: 0, flash: 0, shield: 0, stun: 0, id: 0, isBoss: true
  };
}

function Battle(party, room, floor, seed, portrait) {
  var L = this.L = layout(portrait);
  this.W = L.W; this.H = L.H;
  this.r = rng(seed);
  this.t = 0; this.units = []; this.shots = []; this.events = []; this.over = null; this.nextId = 1; this.floor = floor;
  var self = this, alive = party.filter(function (h) { return !h.down; });
  alive.forEach(function (h, i) { self.add(unitFromHero(h, i, alive.length, L)); });
  if (room.boss) {
    this.add(unitFromBoss(room.boss, floor, L));
  }
  var n = room.pack.length;
  room.pack.forEach(function (type, i) {
    var cols = Math.ceil(n / 3), col = i % cols, row = Math.floor(i / cols), rows = Math.ceil(n / cols);
    var x = room.boss ? L.W - 70 - col * 50 : L.W - 80 - col * 62 - self.r() * 14;
    var y = L.H / 2 + (row - (rows - 1) / 2) * 78 + (self.r() - 0.5) * 22;
    if (L.portrait) {
      y = room.boss ? 70 + col * 50 : 80 + col * 62 + self.r() * 14;
      x = L.W / 2 + (row - (rows - 1) / 2) * (room.boss ? 120 : 78) + (self.r() - 0.5) * 22;
      if (room.boss && n <= 2) x = L.W / 2 + (i ? 110 : -110);
    }
    self.add(unitFromMonster(type, floor, x, y));
  });
}
Battle.prototype.add = function (u) { u.id = this.nextId++; if (u.side === "monster" && !u.isBoss) u.cd = 0.5 + this.r() * 0.6; this.units.push(u); return u; };
Battle.prototype.emit = function (e) { this.events.push(e); };
Battle.prototype.foes = function (u) { return this.units.filter(function (o) { return o.alive && o.side !== u.side; }); };
Battle.prototype.friends = function (u) { return this.units.filter(function (o) { return o.alive && o.side === u.side; }); };
function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

Battle.prototype.chooseTarget = function (u) {
  var foes = this.foes(u); if (!foes.length) return null;
  if (u.side === "monster") {
    var taunt = foes.filter(function (f) { return f.shield > 0; });
    if (taunt.length && !(u.range > 0 && this.r() < 0.5)) foes = taunt;
  }
  var best = null, bd = 1e9;
  foes.forEach(function (f) { var d = dist(u, f); if (d < bd) { bd = d; best = f; } });
  return best;
};

Battle.prototype.damage = function (from, to, mult, opts) {
  if (!to.alive) return 0;
  opts = opts || {};
  if (!opts.sure && to.dodge && this.r() < to.dodge) { this.emit({ type: "miss", x: to.x, y: to.y - to.r }); return 0; }
  var crit = !opts.noCrit && this.r() < from.crit;
  var raw = from.atk * mult * (0.9 + this.r() * 0.2) * (crit ? 2 : 1);
  var d = Math.max(1, Math.round(raw * 30 / (30 + Math.max(0, to.def))));
  if (to.shield > 0) d = Math.max(1, Math.round(d * 0.45));
  to.hp -= d; to.flash = 0.15;
  this.emit({ type: "hit", x: to.x, y: to.y - to.r, amount: d, crit: crit, side: to.side, big: opts.big });
  if (from.lifesteal && from.alive) this.heal(from, d * from.lifesteal, true);
  if (to.thorns && opts.melee && from.alive) {
    var back = Math.max(1, Math.round(d * to.thorns)); from.hp -= back; from.flash = 0.1;
    this.emit({ type: "hit", x: from.x, y: from.y - from.r, amount: back, side: from.side, thorns: true });
    if (from.hp <= 0) this.kill(from);
  }
  if (to.hp <= 0) this.kill(to);
  return d;
};
Battle.prototype.heal = function (u, amount, quiet) {
  if (!u.alive) return;
  var a = Math.min(Math.round(amount), u.maxHp - Math.ceil(u.hp)); if (a <= 0) return;
  u.hp += a;
  if (!quiet || a >= 3) this.emit({ type: "heal", x: u.x, y: u.y - u.r, amount: a });
};
Battle.prototype.kill = function (u) {
  if (!u.alive) return;
  u.alive = false; u.hp = 0;
  this.emit({ type: u.side === "monster" ? "poof" : "down", x: u.x, y: u.y, r: u.r, kind: u.kind, boss: !!u.isBoss, name: u.name });
};

Battle.prototype.ability = function (u) {
  var self = this, foes = this.foes(u), friends = this.friends(u);
  if (u.side === "hero") {
    if (u.kind === "fighter") {
      if (!foes.length) return false;
      u.shield = 3; this.emit({ type: "cast", what: "shield", x: u.x, y: u.y, u: u });
      return true;
    }
    if (u.kind === "rogue") {
      if (!foes.length) return false;
      var weak = foes.slice().sort(function (a, b) { return a.hp - b.hp; })[0];
      this.emit({ type: "cast", what: "vanish", x: u.x, y: u.y, u: u });
      u.x = Math.min(this.W - WALL - u.r, Math.max(WALL + u.r, weak.x + weak.r + u.r + 2)); u.y = weak.y; u.face = -1;
      this.emit({ type: "cast", what: "appear", x: u.x, y: u.y, u: u });
      u.swing = 0.25; this.damage(u, weak, 2.6, { sure: true, big: true });
      return true;
    }
    if (u.kind === "cleric") {
      var hurt = friends.filter(function (f) { return f.hp < f.maxHp - 2; }).sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; })[0];
      if (!hurt) return false;
      this.emit({ type: "cast", what: "heal", x: hurt.x, y: hurt.y, u: u, to: hurt });
      this.heal(hurt, u.atk * 2.7 + hurt.maxHp * 0.07);
      return true;
    }
    if (u.kind === "wizard") {
      var t = this.chooseTarget(u); if (!t) return false;
      this.shots.push({ x: u.x + 10 * u.face, y: u.y - 12, to: t, tx: t.x, ty: t.y, speed: 300, from: u, mult: 1.7, aoe: 62, kind: "fireball" });
      this.emit({ type: "cast", what: "fireball", x: u.x, y: u.y, u: u });
      return true;
    }
  }
  if (u.isBoss) {
    var b = u.boss, move = b.moves[u.moveIndex++ % b.moves.length];
    if (move === "summon") {
      var mine = this.units.filter(function (o) { return o.alive && o.summoned; }).length;
      if (mine >= 4) move = b.moves.length > 1 ? b.moves[u.moveIndex++ % b.moves.length] : null;
      else {
        for (var k = 0; k < 2; k++) {
          var m = this.L.portrait ? this.add(unitFromMonster(b.minion, this.floor, u.x + (k ? 60 : -60), u.y + 30)) :
            this.add(unitFromMonster(b.minion, this.floor, u.x - 20, u.y + (k ? 50 : -50)));
          m.summoned = true; m.hp = m.maxHp = Math.round(m.maxHp * 0.7);
          this.emit({ type: "summon", x: m.x, y: m.y });
        }
        this.emit({ type: "cast", what: "roar", x: u.x, y: u.y, u: u, name: "Summons helpers!" });
        return true;
      }
    }
    if (move === "slam") {
      this.emit({ type: "cast", what: "slam", x: u.x, y: u.y, u: u, radius: 95, name: "Slam!" });
      foes.forEach(function (f) { if (dist(f, u) < 95 + f.r) { self.damage(u, f, 1.3, { sure: true, noCrit: true }); f.stun = Math.max(f.stun, 0.6); } });
      return true;
    }
    if (move === "breath") {
      this.emit({ type: "cast", what: "breath", x: u.x, y: u.y, u: u, name: b.id === "frostwyrm" ? "Frost breath!" : "Shadow breath!" });
      foes.forEach(function (f) { self.damage(u, f, 0.75, { sure: true, noCrit: true }); });
      return true;
    }
    if (move === "volley") {
      this.emit({ type: "cast", what: "roar", x: u.x, y: u.y, u: u, name: "Fire volley!" });
      foes.forEach(function (f) { self.shots.push({ x: u.x, y: u.y - 20, to: f, tx: f.x, ty: f.y, speed: 260, from: u, mult: 0.8, kind: "bolt" }); });
      return true;
    }
  }
  return false;
};

Battle.prototype.step = function (dt) {
  if (this.over) return;
  var self = this;
  this.t += dt;
  this.units.forEach(function (u) {
    if (!u.alive) return;
    u.flash = Math.max(0, u.flash - dt); u.swing = Math.max(0, u.swing - dt);
    if (u.shield > 0) u.shield = Math.max(0, u.shield - dt);
    if (u.regen) self.heal(u, u.maxHp * u.regen * dt, true);
    if (u.stun > 0) { u.stun -= dt; return; }
    u.cd -= dt;
    if (u.abMax) {
      u.ab -= dt;
      if (u.ab <= 0) { if (self.ability(u)) u.ab = u.abMax; else u.ab = 0.4; }
      if (!u.alive) return;
    }
    var t = self.chooseTarget(u);
    if (!t) return;
    u.target = t.id;
    var d = dist(u, t), reach = u.r + t.r + (u.range || 4);
    if (Math.abs(t.x - u.x) > 2) u.face = t.x > u.x ? 1 : -1;
    if (d > reach) {
      var sp = u.move * dt;
      u.x += (t.x - u.x) / d * sp; u.y += (t.y - u.y) / d * sp;
    } else if (u.cd <= 0) {
      u.cd = u.rate; u.swing = 0.22;
      if (u.range > 0) {
        var kind = u.kind === "cleric" ? "holy" : u.kind === "wizard" ? "spark" : u.kind === "archer" ? "arrow" : u.kind === "wisp" ? "ice" : "bolt";
        self.shots.push({ x: u.x + 8 * u.face, y: u.y - 10, to: t, tx: t.x, ty: t.y, speed: kind === "arrow" ? 380 : 320, from: u, mult: 1, kind: kind });
        self.emit({ type: "shoot", kind: kind, side: u.side });
      } else {
        self.damage(u, t, 1, { melee: true });
        self.emit({ type: "swing", side: u.side, kind: u.kind });
      }
    }
  });
  // keep everyone from standing inside each other, and inside the room
  var live = this.units.filter(function (u) { return u.alive; });
  for (var i = 0; i < live.length; i++) for (var j = i + 1; j < live.length; j++) {
    var a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, dd = Math.sqrt(dx * dx + dy * dy) || 0.01, min = a.r + b.r + 2;
    if (dd < min) { var push = (min - dd) / 2; dx /= dd; dy /= dd; if (dd === 0.01) { dx = 0; dy = 1; } a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
  }
  var BW = this.W, BH = this.H;
  live.forEach(function (u) { u.x = Math.max(WALL + u.r, Math.min(BW - WALL - u.r, u.x)); u.y = Math.max(WALL + 30 + u.r * 0.5, Math.min(BH - WALL - u.r * 0.3, u.y)); });
  // shots fly to where their target is now
  this.shots = this.shots.filter(function (s) {
    if (s.to.alive) { s.tx = s.to.x; s.ty = s.to.y; }
    var dx = s.tx - s.x, dy = s.ty - s.y, d = Math.sqrt(dx * dx + dy * dy), sp = s.speed * dt;
    if (d <= sp + 4) {
      if (s.aoe) {
        self.emit({ type: "boom", x: s.tx, y: s.ty, radius: s.aoe, kind: s.kind });
        self.foes(s.from).forEach(function (f) { if (Math.hypot(f.x - s.tx, f.y - s.ty) < s.aoe + f.r) self.damage(s.from, f, s.mult, { big: f === s.to }); });
      } else if (s.to.alive) {
        self.damage(s.from, s.to, s.mult);
      }
      return false;
    }
    s.x += dx / d * sp; s.y += dy / d * sp;
    return true;
  });
  var heroes = this.units.some(function (u) { return u.alive && u.side === "hero"; });
  var monsters = this.units.some(function (u) { return u.alive && u.side === "monster"; });
  if (!monsters) this.over = "win"; else if (!heroes) this.over = "lose";
  if (!this.over && this.t > 240) this.over = "lose";   // a fight never goes on for ever
};
// Copy what the fight did to the heroes back onto the party.
Battle.prototype.settle = function () {
  this.units.forEach(function (u) {
    if (u.side !== "hero") return;
    u.hero.hp = Math.max(0, Math.round(u.hp)); u.hero.down = !u.alive;
  });
};

// After a floor: the squad rests at a campfire. Everyone levels up, the standing heal some,
// and anyone knocked down gets back up with a little health.
function campfire(party) {
  party.forEach(function (h) {
    var before = heroStats(h).maxHp;
    h.level += 1;
    var s = heroStats(h);
    if (h.down) { h.down = false; h.hp = Math.round(s.maxHp * 0.3); }
    else h.hp = Math.min(s.maxHp, Math.round(h.hp + (s.maxHp - before) + s.maxHp * 0.35));
  });
}
// Between rooms the heroes still standing catch their breath.
function breather(party) {
  party.forEach(function (h) { if (!h.down) h.hp = Math.min(heroStats(h).maxHp, Math.round(h.hp + heroStats(h).maxHp * 0.12)); });
}
function equip(h, item) {
  var before = heroStats(h).maxHp;
  h.items[item.slot] = item;
  var after = heroStats(h).maxHp;
  h.hp = Math.max(1, Math.min(after, h.hp + Math.max(0, after - before)));
}

root.DS = {
  rng: rng, mix: mix, CLASSES: CLASSES, CLASS_KEYS: CLASS_KEYS, MONSTERS: MONSTERS, BOSSES: BOSSES, THEMES: THEMES, RARITY: RARITY,
  makeParty: makeParty, heroStats: heroStats, makeLoot: makeLoot, itemLines: itemLines, makeFloor: makeFloor, isBossFloor: isBossFloor,
  bossFor: bossFor, themeFor: themeFor, Battle: Battle, campfire: campfire, breather: breather, equip: equip, W: W, H: H, WALL: WALL, layout: layout
};
})(typeof window !== "undefined" ? window : globalThis);
