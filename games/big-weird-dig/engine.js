// Big Weird Dig: the whole underground world. Digging, boulders, moles, fuel and finds,
// stepped 60 times a second. There's no drawing, sound or clock in here, so the same code
// runs in the game, in the bot (bot.js) and in the level checker (tools/check.mjs).
(function (root) {
  "use strict";

  var COLS = 14, ROWS = 18, DT = 1 / 60;
  var OPEN = 0, STONE = 9;            // grid values: 0 dug, 1-4 dirt (soft to hot rock), 9 stone
  var TUNNEL_SPEED = 5;               // tiles a second through dug tunnel
  var DIG_SPEED = [TUNNEL_SPEED, 3.4, 2.6, 1.9, 1.5];
  var DIG_DRAIN = [1.1, 2.2, 3.0, 3.8, 4.4]; // fuel a second while driving through each kind
  var IDLE_DRAIN = 0.3;
  var MAX_FUEL = 100, CAN_FUEL = 35;
  var MOLE_BONK_FUEL = 8, BOULDER_BONK_FUEL = 15;
  var WOBBLE = 0.8, FALL_SPEED = 9, MOLE_DIG_SPEED = 0.9;
  var DIRS = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };
  var BACK = { l: "r", r: "l", u: "d", d: "u" };

  // The 30 weird things. Each level has its own few, so beating all 8 fills the Weird Museum.
  var ITEMS = [
    { id: "duck", name: "Rubber Duck", joke: "It still squeaks. Nobody knows how it got down here." },
    { id: "sock", name: "Giant Sock", joke: "Size 97. Somewhere a giant has one very cold foot." },
    { id: "toaster", name: "Toaster", joke: "Still warm. The toast pops out already buttered." },
    { id: "gnome", name: "Garden Gnome", joke: "He says he was just resting his eyes. For 200 years." },
    { id: "remote", name: "Lost TV Remote", joke: "FINALLY. It was under the couch of the whole Earth." },
    { id: "noodle", name: "Noodle Fossil", joke: "A spaghetti noodle from the Pastacene era. Al dente." },
    { id: "bone", name: "Dinosaur Bone", joke: "From a Grumposaurus. Still grumpy about it." },
    { id: "ufo", name: "Tiny UFO", joke: "The aliens inside wave hello, then ask for directions." },
    { id: "trumpet", name: "Trumpet", joke: "It plays exactly one note: BWAAAMP. Every time." },
    { id: "pirate", name: "Pirate Hat", joke: "Arr! No pirate attached, thank goodness." },
    { id: "disco", name: "Disco Ball", joke: "So THAT'S why the worms have been dancing." },
    { id: "chicken", name: "Rubber Chicken", joke: "It was buried with full honors. Bawk." },
    { id: "cake", name: "Birthday Cake", joke: "Happy 1000th birthday to nobody. Candles still lit!" },
    { id: "pogo", name: "Pogo Stick", joke: "Boing. Boing. Boing. It will not stop boinging." },
    { id: "robot", name: "Robot Head", joke: "BEEP. HELLO. HAVE YOU SEEN MY BODY. BEEP." },
    { id: "chest", name: "Treasure Chest", joke: "TREASURE! ...It's full of buttons. 1,000 buttons." },
    { id: "globe", name: "Snow Globe", joke: "It's snowing in there. It is always snowing in there." },
    { id: "toilet", name: "Golden Toilet", joke: "So fancy. So shiny. Please do not use it." },
    { id: "brush", name: "Mammoth Toothbrush", joke: "For brushing tusks. Minty fresh since the Ice Age." },
    { id: "sneaker", name: "Light-Up Sneaker", joke: "It still lights up. The batteries are forever." },
    { id: "bowling", name: "Bowling Ball", joke: "STRIKE! ...wait, there are no pins down here." },
    { id: "banana", name: "Banana Phone", joke: "Ring ring ring! It's for you." },
    { id: "pickle", name: "Crystal Pickle", joke: "A pickle that turned into a crystal. Still sour." },
    { id: "teapot", name: "Teapot", joke: "Full of hot tea. Who has been visiting down here?" },
    { id: "moonrock", name: "Moon Rock", joke: "The sticker on the bottom says MADE ON THE MOON." },
    { id: "crown", name: "Mole King's Crown", joke: "The Mole King wants it back. (He looks better without it.)" },
    { id: "lavalamp", name: "Lava Lamp", joke: "Filled with real lava. Groovy. Also: hot." },
    { id: "egg", name: "Dragon Egg", joke: "It's warm and it just wiggled. Handle with care!" },
    { id: "pizza", name: "Ancient Pizza", joke: "Extra cheese. Extra old. Extra, extra crunchy." },
    { id: "plug", name: "The Earth's Plug", joke: "Whatever you do, do NOT pull it out." }
  ];

  // Eight levels, each one deeper. hard: dirt kind by row band (1 soft, 2 clay, 3 rock, 4 hot rock).
  var LEVELS = [
    { name: "Backyard Topsoil", depth: 10, seed: 101, fuel: 100, bands: [[1, 1], [9, 1]], stones: 0, stoneLook: "rock",
      boulders: 2, moles: 1, moleSpeed: 1.5, chase: 0.2, burrow: false, cans: 1, findMin: 3,
      finds: ["duck", "sock", "toaster"], tip: "Dig down and find the 3 weird things!" },
    { name: "Squishy Clay", depth: 30, seed: 202, fuel: 85, bands: [[1, 1], [6, 2]], stones: 2, stoneLook: "rock",
      boulders: 3, moles: 1, moleSpeed: 1.7, chase: 0.3, burrow: false, cans: 1, findMin: 4,
      finds: ["gnome", "remote", "noodle"], tip: "Dig out the dirt under a boulder and it falls!" },
    { name: "Root Tangle", depth: 60, seed: 303, fuel: 75, bands: [[1, 1], [4, 2]], stones: 5, stoneLook: "root",
      boulders: 4, moles: 2, moleSpeed: 1.9, chase: 0.35, burrow: false, cans: 2, findMin: 4,
      finds: ["bone", "ufo", "trumpet", "pirate"], tip: "Mole coming? Press the BLADE to push it back." },
    { name: "Pebble Pudding", depth: 100, seed: 404, fuel: 70, bands: [[1, 2], [9, 3]], stones: 7, stoneLook: "rock",
      boulders: 5, moles: 2, moleSpeed: 2.1, chase: 0.4, burrow: false, cans: 2, findMin: 4,
      finds: ["disco", "chicken", "cake", "pogo"], tip: "Rock is slow to dig. Grab fuel cans when you can." },
    { name: "Rocky Basement", depth: 150, seed: 505, fuel: 65, bands: [[1, 2], [5, 3]], stones: 9, stoneLook: "rock",
      boulders: 6, moles: 3, moleSpeed: 2.2, chase: 0.45, burrow: true, cans: 2, findMin: 4,
      finds: ["robot", "chest", "globe", "toilet"], tip: "Sneaky moles dig their own tunnels now!" },
    { name: "Fossil Floor", depth: 220, seed: 606, fuel: 60, bands: [[1, 3], [10, 3]], stones: 10, stoneLook: "fossil",
      boulders: 6, moles: 3, moleSpeed: 2.4, chase: 0.5, burrow: true, cans: 3, findMin: 3,
      finds: ["brush", "sneaker", "bowling", "banana"], tip: "Push a boulder sideways with your blade!" },
    { name: "Crystal Caves", depth: 300, seed: 707, fuel: 60, bands: [[1, 3], [11, 4]], stones: 11, stoneLook: "crystal",
      boulders: 7, moles: 3, moleSpeed: 2.6, chase: 0.55, burrow: true, cans: 3, findMin: 3,
      finds: ["pickle", "teapot", "moonrock", "crown"], tip: "Drop a boulder on a mole for a BONK!" },
    { name: "The Lava-Warm Bottom", depth: 400, seed: 808, fuel: 60, bands: [[1, 3], [7, 4]], stones: 12, stoneLook: "lava",
      boulders: 8, moles: 4, moleSpeed: 2.8, chase: 0.6, burrow: true, cans: 3, findMin: 3,
      finds: ["lavalamp", "egg", "pizza", "plug"], tip: "The very bottom. Something BIG is down here..." }
  ];

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

  function hardAt(L, r) {
    var h = L.bands[0][1];
    for (var i = 0; i < L.bands.length; i++) if (r >= L.bands[i][0]) h = L.bands[i][1];
    return h;
  }

  var cache = {};
  function makeLevel(n) {
    if (cache[n]) return cache[n];
    var L = LEVELS[n - 1];
    for (var attempt = 0; attempt < 400; attempt++) {
      var m = tryMake(L, L.seed * 1000 + attempt);
      if (m) { cache[n] = m; return m; }
    }
    throw new Error("could not make level " + n);
  }

  function tryMake(L, seed) {
    var R = rng(seed), grid = new Uint8Array(COLS * ROWS), taken = new Uint8Array(COLS * ROWS);
    var ri = function (a, b) { return a + Math.floor(R() * (b - a + 1)); };
    var id = function (c, r) { return r * COLS + c; };
    var inb = function (c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; };
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) grid[id(c, r)] = r === 0 ? OPEN : hardAt(L, r);
    var start = { c: 2, r: 0 };
    for (r = 1; r <= 2; r++) for (c = 1; c <= 3; c++) taken[id(c, r)] = 1; // keep the way down clear

    var moles = [], pockets = [];
    for (var k = 0; k < L.moles; k++) {
      for (var t = 0; t < 200; t++) {
        var pr = ri(5, ROWS - 2), pc = ri(0, COLS - 3), ok = true;
        for (var dr = -1; dr <= 1 && ok; dr++) for (var dc = -1; dc <= 3 && ok; dc++) {
          if (inb(pc + dc, pr + dr) && taken[id(pc + dc, pr + dr)]) ok = false;
        }
        if (!ok) continue;
        for (dc = 0; dc < 3; dc++) { grid[id(pc + dc, pr)] = OPEN; taken[id(pc + dc, pr)] = 3; }
        for (dr = -1; dr <= 1; dr++) for (dc = -1; dc <= 3; dc++) if (inb(pc + dc, pr + dr) && !taken[id(pc + dc, pr + dr)]) taken[id(pc + dc, pr + dr)] = 2;
        moles.push({ c: pc + 1, r: pr });
        pockets.push({ c: pc, r: pr });
        break;
      }
      if (moles.length !== k + 1) return null;
    }

    var finds = [];
    for (k = 0; k < L.finds.length; k++) {
      var placed = false;
      for (t = 0; t < 400 && !placed; t++) {
        var fr = ri(L.findMin, ROWS - 1), fc = ri(0, COLS - 1);
        if (taken[id(fc, fr)]) continue;
        if (Math.abs(fc - start.c) + fr < 5) continue;
        var far = true;
        for (var j = 0; j < finds.length; j++) if (Math.abs(finds[j].c - fc) + Math.abs(finds[j].r - fr) < 5) far = false;
        if (!far) continue;
        // spread them down the screen: the k-th find sits in its own slice of rows
        var slice = (ROWS - L.findMin) / L.finds.length;
        if (fr < L.findMin + Math.floor(slice * k) - 1 || fr > L.findMin + Math.ceil(slice * (k + 1)) + 1) continue;
        finds.push({ c: fc, r: fr, id: L.finds[k] });
        taken[id(fc, fr)] = 4;
        placed = true;
      }
      if (!placed) return null;
    }

    var cans = [];
    for (k = 0; k < L.cans; k++) {
      placed = false;
      for (t = 0; t < 400 && !placed; t++) {
        var cr = ri(5, ROWS - 1), cc = ri(0, COLS - 1);
        if (taken[id(cc, cr)]) continue;
        var spread = true;
        for (j = 0; j < finds.length; j++) if (Math.abs(finds[j].c - cc) + Math.abs(finds[j].r - cr) < 3) spread = false;
        for (j = 0; j < cans.length; j++) if (Math.abs(cans[j].c - cc) + Math.abs(cans[j].r - cr) < 5) spread = false;
        if (!spread) continue;
        cans.push({ c: cc, r: cr });
        taken[id(cc, cr)] = 5;
        placed = true;
      }
      if (!placed) return null;
    }

    for (k = 0; k < L.stones; k++) {
      var sc = ri(0, COLS - 1), sr = ri(3, ROWS - 1), len = ri(1, 3), horiz = R() < 0.6;
      for (j = 0; j < len; j++) {
        var x = sc + (horiz ? j : 0), y = sr + (horiz ? 0 : j);
        if (!inb(x, y) || taken[id(x, y)]) break;
        grid[id(x, y)] = STONE; taken[id(x, y)] = 6;
      }
    }

    var boulders = [];
    for (k = 0; k < L.boulders; k++) {
      placed = false;
      for (t = 0; t < 300 && !placed; t++) {
        var bc = ri(0, COLS - 1), br = ri(2, ROWS - 3);
        if (taken[id(bc, br)] || grid[id(bc, br + 1)] === OPEN || grid[id(bc, br + 1)] === STONE) continue;
        if (taken[id(bc, br + 1)] === 7 || (br > 0 && taken[id(bc, br - 1)] === 7)) continue;
        boulders.push({ c: bc, r: br });
        taken[id(bc, br)] = 7;
        placed = true;
      }
      if (!placed) return null;
    }

    // Everything has to be reachable by digging (stone and boulders block the way).
    var seen = new Uint8Array(COLS * ROWS), q = [id(start.c, start.r)];
    seen[q[0]] = 1;
    while (q.length) {
      var i = q.pop(), qc = i % COLS, qr = (i / COLS) | 0;
      for (var key in DIRS) {
        var nc = qc + DIRS[key][0], nr = qr + DIRS[key][1];
        if (!inb(nc, nr)) continue;
        var ni = id(nc, nr);
        if (seen[ni] || grid[ni] === STONE || taken[ni] === 7) continue;
        seen[ni] = 1; q.push(ni);
      }
    }
    for (j = 0; j < finds.length; j++) if (!seen[id(finds[j].c, finds[j].r)]) return null;
    for (j = 0; j < cans.length; j++) if (!seen[id(cans[j].c, cans[j].r)]) return null;
    for (j = 0; j < moles.length; j++) if (!seen[id(moles[j].c, moles[j].r)]) return null;
    return { grid: grid, start: start, moles: moles, pockets: pockets, finds: finds, cans: cans, boulders: boulders, seed: seed };
  }

  function create(n, runSeed) {
    var m = makeLevel(n), L = LEVELS[n - 1];
    var s = {
      n: n, L: L, grid: m.grid.slice(), t: 0, fuel: L.fuel, won: false, lost: false, events: [],
      rand: rng((m.seed * 31 + (runSeed || 1) * 977) >>> 0), bonks: 0, moleBonks: 0, dug: 0,
      dozer: { x: m.start.c, y: m.start.r, dir: "r", face: 1, segCell: -1, segDig: 0, moving: false,
        dizzy: 0, invuln: 0, bladeT: 0, bladeCd: 0 },
      boulders: m.boulders.map(function (b) { return { c: b.c, r: b.r, state: "rest", t: 0, fy: b.r, slide: 0, fallen: 0, gone: false }; }),
      moles: [], finds: m.finds.map(function (f) { return { c: f.c, r: f.r, id: f.id, got: false }; }),
      cans: m.cans.map(function (c) { return { c: c.c, r: c.r, got: false }; })
    };
    for (var i = 0; i < m.moles.length; i++) {
      s.moles.push({ x: m.moles[i].c, y: m.moles[i].r, dir: s.rand() < 0.5 ? "l" : "r", speed: L.moleSpeed,
        segCell: -1, segDig: 0, dizzy: 0, knock: 0, knockDir: "l", burrowing: 0,
        burrowCd: 6 + s.rand() * 6, giggle: 0, moved: false });
    }
    return s;
  }

  function isInt(v) { return Math.abs(v - Math.round(v)) < 1e-4; }
  function cellAt(s, c, r) { return (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? -1 : s.grid[r * COLS + c]; }
  function isDirt(h) { return h >= 1 && h <= 4; }
  function boulderAt(s, c, r) {
    for (var i = 0; i < s.boulders.length; i++) {
      var b = s.boulders[i];
      if (b.gone || b.c !== c) continue;
      if (b.r === r) return b;
      if (b.state === "fall" && b.fy > b.r + 1e-6 && b.r + 1 === r) return b;
    }
    return null;
  }
  function moleIn(s, c, r) {
    for (var i = 0; i < s.moles.length; i++) if (Math.round(s.moles[i].x) === c && Math.round(s.moles[i].y) === r) return s.moles[i];
    return null;
  }

  function dozerCanEnter(s, c, r, k, aligned) {
    var h = cellAt(s, c, r);
    if (h < 0 || h === STONE) return false;
    var b = boulderAt(s, c, r);
    if (!b) return true;
    // Bulldozers push boulders! Only sideways, only into a dug tunnel.
    if (aligned && (k === "l" || k === "r") && b.state === "rest" && b.slide === 0) {
      var bc = c + DIRS[k][0];
      if (cellAt(s, bc, r) === OPEN && !boulderAt(s, bc, r) && !moleIn(s, bc, r)) {
        b.c = bc; b.slide = -DIRS[k][0];
        s.events.push({ t: "push", c: bc, r: r });
      }
    }
    return false;
  }

  function moleCanEnter(s, m, c, r) {
    if (r < 1 || c < 0 || c >= COLS || r >= ROWS) return false;
    var h = s.grid[r * COLS + c];
    if (h === STONE || boulderAt(s, c, r)) return false;
    return h === OPEN || m.burrowing > 0;
  }

  // Move an entity along one lane, from cell centre to cell centre, for `time` seconds.
  // stopAtCentre: stop at the next cell centre instead of carrying on (lining up for a turn).
  function advance(s, e, k, time, who, speedOverride, stopAtCentre) {
    var v = DIRS[k], horiz = v[0] !== 0, sgn = horiz ? v[0] : v[1], moved = 0;
    for (var it = 0; it < 3 && time > 1e-9; it++) {
      var p = horiz ? e.x : e.y, aligned = isInt(p);
      if (aligned) {
        p = Math.round(p);
        if (horiz) e.x = p; else e.y = p;
        if (stopAtCentre && it > 0) break;
      }
      var next = aligned ? p + sgn : (sgn > 0 ? Math.ceil(p) : Math.floor(p));
      var nc = horiz ? next : Math.round(e.x), nr = horiz ? Math.round(e.y) : next;
      var ok = who === "dozer" ? dozerCanEnter(s, nc, nr, k, aligned) : moleCanEnter(s, e, nc, nr);
      if (!ok) break;
      var ci = nr * COLS + nc;
      if (e.segCell !== ci) { e.segCell = ci; e.segDig = isDirt(s.grid[ci]) ? s.grid[ci] : 0; }
      var speed = speedOverride || (who === "dozer" ? DIG_SPEED[e.segDig] : (e.segDig ? MOLE_DIG_SPEED : e.speed));
      var room = Math.abs(next - p), go = speed * time;
      if (go >= room) { p = next; time -= room / speed; moved += room; } else { p += sgn * go; moved += go; time = 0; }
      if (horiz) e.x = p; else e.y = p;
      var cc = Math.round(e.x), cr = Math.round(e.y), here = cr * COLS + cc;
      if (isDirt(s.grid[here])) {
        s.events.push({ t: "dig", c: cc, r: cr, h: s.grid[here], who: who });
        s.grid[here] = OPEN;
        if (who === "dozer") s.dug++;
      }
    }
    return moved;
  }

  function stepDozer(s, inp) {
    var d = s.dozer;
    d.moving = false;
    if (d.invuln > 0) d.invuln -= DT;
    if (d.bladeT > 0) d.bladeT -= DT;
    if (d.bladeCd > 0) d.bladeCd -= DT;
    if (d.dizzy > 0) { d.dizzy -= DT; return; }
    if (inp.blade && d.bladeCd <= 0) blade(s);
    var k = inp.dir;
    if (!k) return;
    var horiz = k === "l" || k === "r", moved = 0;
    var off = horiz ? !isInt(d.y) : !isInt(d.x);
    if (off) {
      // Not lined up for that turn yet: finish getting to the nearest cell centre first.
      var p = horiz ? d.y : d.x, target = Math.round(p);
      var kk = horiz ? (target > p ? "d" : "u") : (target > p ? "r" : "l");
      moved = advance(s, d, kk, DT, "dozer", 0, true);
      if (moved > 0) setFacing(d, kk);
    } else {
      setFacing(d, k);
      moved = advance(s, d, k, DT, "dozer");
    }
    d.moving = moved > 0;
  }
  function setFacing(d, k) { d.dir = k; if (k === "l") d.face = -1; if (k === "r") d.face = 1; }

  function blade(s) {
    var d = s.dozer, f = DIRS[d.dir];
    d.bladeT = 0.25; d.bladeCd = 0.45;
    var hit = 0;
    for (var i = 0; i < s.moles.length; i++) {
      var m = s.moles[i], rx = m.x - d.x, ry = m.y - d.y;
      var along = rx * f[0] + ry * f[1], across = Math.abs(rx * f[1] - ry * f[0]);
      if (along > -0.2 && along < 1.9 && across < 0.75 && m.knock <= 0) {
        m.dizzy = 3.2; m.knock = 0.3; m.knockDir = d.dir; m.burrowing = 0; hit++;
        s.events.push({ t: "shove", x: m.x, y: m.y });
      }
    }
    s.events.push({ t: "blade", hit: hit });
  }

  function stepMoles(s) {
    var d = s.dozer;
    for (var i = 0; i < s.moles.length; i++) {
      var m = s.moles[i];
      m.moved = false;
      if (m.burrowCd > 0) m.burrowCd -= DT;
      if (m.knock > 0) {
        m.knock -= DT;
        var kd = m.knockDir, khoriz = kd === "l" || kd === "r";
        if (khoriz ? isInt(m.y) : isInt(m.x)) {
          if (advance(s, m, kd, DT, "mole", 7) > 0) m.dir = kd; else m.knock = 0;
        }
        continue;
      }
      if (m.dizzy > 0) { m.dizzy -= DT; continue; }
      if (m.giggle > 0) { m.giggle -= DT; continue; }
      var mc = Math.round(m.x), mr = Math.round(m.y);
      if (isInt(m.x) && isInt(m.y)) {
        m.x = mc; m.y = mr;
        m.dir = chooseMoleDir(s, m, mc, mr);
        if (!m.dir) continue;
      }
      var got = advance(s, m, m.dir, DT, "mole");
      if (got > 0) m.moved = true;
      else if (!(isInt(m.x) && isInt(m.y))) m.dir = BACK[m.dir]; // something fell in the way: turn round
    }
    // Bumping into the bulldozer
    for (i = 0; i < s.moles.length; i++) {
      m = s.moles[i];
      if (m.dizzy > 0 || m.knock > 0 || m.giggle > 0) continue;
      var dx = m.x - d.x, dy = m.y - d.y;
      if (dx * dx + dy * dy < 0.72 * 0.72 && d.invuln <= 0) {
        s.fuel -= MOLE_BONK_FUEL; s.bonks++;
        d.dizzy = 0.45; d.invuln = 1.6;
        m.giggle = 1.0; m.dir = BACK[m.dir] || "l"; m.burrowing = 0;
        s.events.push({ t: "bonk", x: d.x, y: d.y, by: "mole", fuel: MOLE_BONK_FUEL });
      }
    }
  }

  function chooseMoleDir(s, m, mc, mr) {
    var d = s.dozer, dc = Math.round(d.x), dr = Math.round(d.y);
    var dist = Math.abs(dc - mc) + Math.abs(dr - mr);
    if (m.burrowing > 0) {
      // Sneaky: dig straight toward the bulldozer for a few cells.
      m.burrowing--;
      var want = Math.abs(dc - mc) > Math.abs(dr - mr) ? (dc > mc ? "r" : "l") : (dr > mr ? "d" : "u");
      var w = DIRS[want];
      if (moleCanEnter(s, m, mc + w[0], mr + w[1])) return want;
      m.burrowing = 0;
    }
    var opts = [], k;
    for (k in DIRS) if (moleCanEnter(s, m, mc + DIRS[k][0], mr + DIRS[k][1])) opts.push(k);
    if (s.L.burrow && m.burrowCd <= 0 && dist > 3) {
      m.burrowCd = 7 + s.rand() * 6; m.burrowing = 2 + Math.floor(s.rand() * 3);
      return chooseMoleDir(s, m, mc, mr);
    }
    if (!opts.length) return null;
    var fwd = opts.filter(function (o) { return o !== BACK[m.dir]; });
    if (!fwd.length) fwd = opts;
    if (s.rand() < s.L.chase) {
      var best = null, bestD = 1e9;
      for (var i = 0; i < fwd.length; i++) {
        var o = fwd[i], dd = Math.abs(mc + DIRS[o][0] - dc) + Math.abs(mr + DIRS[o][1] - dr) + s.rand() * 0.5;
        if (dd < bestD) { bestD = dd; best = o; }
      }
      return best;
    }
    if (fwd.indexOf(m.dir) >= 0 && s.rand() < 0.6) return m.dir;
    return fwd[Math.floor(s.rand() * fwd.length)];
  }

  function openForBoulder(s, b, c, r) {
    if (cellAt(s, c, r) !== OPEN) return false;
    for (var i = 0; i < s.boulders.length; i++) {
      var o = s.boulders[i];
      if (o === b || o.gone || o.c !== c) continue;
      if (o.r === r || (o.state === "fall" && o.r + 1 === r)) return false;
    }
    return true;
  }

  function stepBoulders(s) {
    var d = s.dozer, dc = Math.round(d.x), dr = Math.round(d.y);
    for (var i = 0; i < s.boulders.length; i++) {
      var b = s.boulders[i];
      if (b.gone) continue;
      if (b.slide !== 0) {
        var sg = b.slide > 0 ? 1 : -1;
        b.slide -= sg * TUNNEL_SPEED * DT;
        if ((b.slide > 0 ? 1 : -1) !== sg) b.slide = 0;
      }
      if (b.state === "rest") {
        var holding = dc === b.c && dr === b.r + 1;
        if (b.slide === 0 && !holding && openForBoulder(s, b, b.c, b.r + 1)) {
          b.state = "wobble"; b.t = WOBBLE;
          s.events.push({ t: "wobble", c: b.c, r: b.r });
        }
      } else if (b.state === "wobble") {
        if (!openForBoulder(s, b, b.c, b.r + 1)) b.state = "rest";
        else if ((b.t -= DT) <= 0) { b.state = "fall"; b.fy = b.r; b.fallen = 0; }
      } else if (b.state === "fall") {
        b.fy += FALL_SPEED * DT;
        for (;;) {
          if (!openForBoulder(s, b, b.c, b.r + 1)) { b.fy = b.r; landBoulder(s, b); break; }
          if (b.fy >= b.r + 1) { b.r++; b.fallen++; } else break;
        }
        if (b.gone || b.state !== "fall") continue;
        var ddx = Math.abs(d.x - b.c), ddy = d.y - b.fy;
        if (ddx < 0.75 && ddy > -0.3 && ddy < 0.95) {
          s.fuel -= BOULDER_BONK_FUEL; s.bonks++;
          d.dizzy = 0.8; d.invuln = Math.max(d.invuln, 1.2);
          s.events.push({ t: "bonk", x: d.x, y: d.y, by: "boulder", fuel: BOULDER_BONK_FUEL });
          breakBoulder(s, b);
          continue;
        }
        for (var j = 0; j < s.moles.length; j++) {
          var m = s.moles[j], mdy = m.y - b.fy;
          if (Math.abs(m.x - b.c) < 0.75 && mdy > -0.3 && mdy < 0.95) {
            m.dizzy = 6; m.knock = 0; m.burrowing = 0; s.moleBonks++;
            s.events.push({ t: "moleBonk", x: m.x, y: m.y });
            breakBoulder(s, b);
            break;
          }
        }
      }
    }
  }
  function landBoulder(s, b) {
    if (b.fallen >= 1) breakBoulder(s, b);
    else b.state = "rest";
  }
  function breakBoulder(s, b) {
    b.gone = true;
    s.events.push({ t: "break", c: b.c, y: b.fy });
  }

  function pickups(s) {
    var d = s.dozer, c = Math.round(d.x), r = Math.round(d.y), i;
    for (i = 0; i < s.finds.length; i++) {
      var f = s.finds[i];
      if (!f.got && f.c === c && f.r === r) { f.got = true; s.events.push({ t: "find", id: f.id, c: c, r: r }); }
    }
    for (i = 0; i < s.cans.length; i++) {
      var k = s.cans[i];
      if (!k.got && k.c === c && k.r === r) {
        k.got = true;
        var add = Math.max(0, Math.min(CAN_FUEL, MAX_FUEL - s.fuel));
        s.fuel += add;
        s.events.push({ t: "can", c: c, r: r, fuel: Math.round(add) });
      }
    }
  }

  // One tick. inp = { dir: "l" | "r" | "u" | "d" | null, blade: true on the tick it's pressed }.
  // Read s.events after each call: what happened this tick, for sound and pictures.
  function step(s, inp) {
    s.events.length = 0;
    if (s.won || s.lost) return s;
    s.t += DT;
    stepDozer(s, inp || {});
    stepMoles(s);
    stepBoulders(s);
    pickups(s);
    var d = s.dozer;
    s.fuel -= (d.moving ? DIG_DRAIN[d.segDig] : IDLE_DRAIN) * DT;
    if (s.finds.every(function (f) { return f.got; })) { s.won = true; s.events.push({ t: "win" }); }
    else if (s.fuel <= 0) { s.fuel = 0; s.lost = true; s.events.push({ t: "empty" }); }
    return s;
  }

  var api = {
    COLS: COLS, ROWS: ROWS, DT: DT, OPEN: OPEN, STONE: STONE, DIRS: DIRS, MAX_FUEL: MAX_FUEL,
    TUNNEL_SPEED: TUNNEL_SPEED, DIG_SPEED: DIG_SPEED, DIG_DRAIN: DIG_DRAIN,
    ITEMS: ITEMS, LEVELS: LEVELS, makeLevel: makeLevel, create: create, step: step,
    cellAt: cellAt, boulderAt: boulderAt, isInt: isInt, openForBoulder: openForBoulder, rng: rng
  };
  root.BWD = api;
})(typeof window !== "undefined" ? window : globalThis);
