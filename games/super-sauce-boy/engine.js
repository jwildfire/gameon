// Super Sauce Boy: the rules of the world. No drawing, no sound, no clock.
// The game steps it 120 times a second; tools/solve.js steps it to prove every level can be beaten.
(function (root) {
  "use strict";

  var T = 30, COLS = 32, ROWS = 18, DT = 1 / 120;
  var PW = 20, PH = 20;
  var PHYS = {
    run: 330,          // top running speed, px/s
    accG: 2800,        // speeding up on the ground
    turnG: 4600,       // turning around on the ground
    fricG: 3400,       // stopping on the ground
    accA: 1900,        // steering in the air
    fricA: 520,        // air drag with no input
    butterAcc: 620,    // butter: slow to get going...
    butterFric: 150,   // ...and slow to stop
    g: 2300,
    jump: 740,         // about 4 tiles high when held
    cut: 280,          // let go of jump early for a little hop
    maxFall: 950,
    slide: 140,        // wall slide speed
    wallJumpX: 360,
    wallJumpY: 700,
    wallLock: 0.14,
    coyote: 0.1,
    buffer: 0.12,
    toaster: 1060      // toaster pop: about 8 tiles
  };
  var HOT_PERIOD = 3.2, HOT_ON = 1.4, HOT_WARN = 0.6;
  var CRUMBLE = 0.4, CRACKER_BACK = 2.6;
  var CUTTER_R = 13, CUTTER_SPEED = 120;

  var SOLID = { "#": 1, "=": 1, "C": 1, "T": 1, "H": 1, "h": 1 };

  function parse(level) {
    var rows = level.map, grid = [], crackers = [], cutters = [], start = null, goal = null, hot = false;
    if (rows.length !== ROWS) throw new Error(level.name + ": " + rows.length + " rows");
    for (var r = 0; r < ROWS; r++) {
      if (rows[r].length !== COLS) throw new Error(level.name + ": row " + r + " is " + rows[r].length + " wide");
      grid.push(rows[r].split(""));
    }
    for (r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ch = grid[r][c];
      if (ch === "S") { start = { c: c, r: r }; grid[r][c] = "."; }
      else if (ch === "N") { goal = { c: c, r: r }; }
      else if (ch === "C") crackers.push({ c: c, r: r });
      else if (ch === "H" || ch === "h") hot = true;
      else if (ch === "o" || ch === "x") { cutters.push({ c: c, r: r, vertical: ch === "x" }); grid[r][c] = "."; }
    }
    if (!start || !goal) throw new Error(level.name + ": needs S and N");
    var map = { grid: grid, crackers: crackers, start: start, goal: goal, hot: hot, cutters: [] };
    var crackerAt = {};
    crackers.forEach(function (k, i) { crackerAt[k.r * COLS + k.c] = i; });
    map.crackerAt = crackerAt;
    // A cutter rolls back and forth along its row (o) or column (x) between the nearest solid tiles.
    cutters.forEach(function (k) {
      var lo, hi;
      if (k.vertical) {
        lo = k.r; hi = k.r;
        while (lo - 1 >= 0 && !SOLID[grid[lo - 1][k.c]]) lo--;
        while (hi + 1 < ROWS && !SOLID[grid[hi + 1][k.c]]) hi++;
      } else {
        lo = k.c; hi = k.c;
        while (lo - 1 >= 0 && !SOLID[grid[k.r][lo - 1]]) lo--;
        while (hi + 1 < COLS && !SOLID[grid[k.r][hi + 1]]) hi++;
      }
      var a = lo * T + CUTTER_R + 1, b = (hi + 1) * T - CUTTER_R - 1;
      var s = (k.vertical ? k.r : k.c) * T + T / 2;
      map.cutters.push({ vertical: k.vertical, fixed: (k.vertical ? k.c : k.r) * T + T / 2, a: a, b: b, s0: s - a });
    });
    return map;
  }

  function cutterPos(k, t) {
    var len = k.b - k.a;
    var d = (k.s0 + t * CUTTER_SPEED) % (2 * len);
    var along = k.a + (d < len ? d : 2 * len - d);
    return k.vertical ? { x: k.fixed, y: along } : { x: along, y: k.fixed };
  }

  function hotNow(ch, t) {
    var phase = ch === "h" ? HOT_PERIOD / 2 : 0;
    return ((t + phase) % HOT_PERIOD) < HOT_ON;
  }
  function hotWarn(ch, t) {
    var phase = ch === "h" ? HOT_PERIOD / 2 : 0;
    return ((t + phase) % HOT_PERIOD) > HOT_PERIOD - HOT_WARN;
  }

  function create(level, map) {
    map = map || parse(level);
    var w = {
      map: map,
      t: 0,
      p: null,
      cr: map.crackers.map(function () { return { timer: -1, gone: 0 }; }),
      dead: null,
      won: false,
      events: []
    };
    spawn(w);
    return w;
  }

  function spawn(w) {
    var s = w.map.start;
    w.t = 0;
    w.dead = null;
    w.won = false;
    w.p = {
      x: s.c * T + (T - PW) / 2, y: (s.r + 1) * T - PH, vx: 0, vy: 0,
      gr: true, coy: 0, buf: 0, wcoy: 0, wside: 0, lock: 0, jumping: false, prevJ: false,
      face: 1, tl: false, tr: false, ground: "#", fallV: 0
    };
    for (var i = 0; i < w.cr.length; i++) { w.cr[i].timer = -1; w.cr[i].gone = 0; }
  }

  function clone(w) {
    var p = w.p;
    return {
      map: w.map, t: w.t, dead: w.dead, won: w.won, events: [],
      p: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, gr: p.gr, coy: p.coy, buf: p.buf, wcoy: p.wcoy, wside: p.wside,
        lock: p.lock, jumping: p.jumping, prevJ: p.prevJ, face: p.face, tl: p.tl, tr: p.tr, ground: p.ground, fallV: p.fallV },
      cr: w.cr.map(function (k) { return { timer: k.timer, gone: k.gone }; })
    };
  }

  function tileAt(w, c, r) {
    if (c < 0 || c >= COLS || r < 0) return "#";
    if (r >= ROWS) return ".";
    var ch = w.map.grid[r][c];
    if (ch === "C" && w.cr[w.map.crackerAt[r * COLS + c]].gone > 0) return ".";
    return ch;
  }
  function solid(w, c, r) { return !!SOLID[tileAt(w, c, r)]; }

  function solidInRect(w, x, y, ww, hh) {
    var c0 = Math.floor(x / T), c1 = Math.floor((x + ww - 0.001) / T);
    var r0 = Math.floor(y / T), r1 = Math.floor((y + hh - 0.001) / T);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solid(w, c, r)) return true;
    return false;
  }

  function approach(v, target, amount) {
    if (v < target) return Math.min(v + amount, target);
    return Math.max(v - amount, target);
  }

  // One 1/120 s step. input: { l, r, j } (buttons held right now).
  function step(w, input) {
    w.events.length = 0;
    if (w.dead || w.won) return w;
    var p = w.p, dt = DT, ph = PHYS;
    var dir = (input.r ? 1 : 0) - (input.l ? 1 : 0);
    var pressed = input.j && !p.prevJ;
    p.prevJ = !!input.j;
    w.t += dt;

    if (pressed) p.buf = ph.buffer;
    else p.buf = Math.max(0, p.buf - dt);
    p.coy = Math.max(0, p.coy - dt);
    p.wcoy = Math.max(0, p.wcoy - dt);
    p.lock = Math.max(0, p.lock - dt);
    if (dir) p.face = dir;

    // Run
    var butter = p.gr && p.ground === "=";
    var target = dir * ph.run, acc;
    if (p.gr) {
      if (butter) acc = dir ? ph.butterAcc : ph.butterFric;
      else if (!dir) acc = ph.fricG;
      else if (p.vx * dir < 0) acc = ph.turnG;
      else acc = ph.accG;
    } else {
      acc = dir ? ph.accA : ph.fricA;
      if (p.lock > 0) acc *= 0.3;
    }
    // Over top speed (a wall jump or toaster): keep it unless steering against it.
    if (Math.abs(p.vx) > ph.run && dir * p.vx > 0) acc = p.gr ? ph.fricA : 0;
    p.vx = approach(p.vx, target, acc * dt);

    // Fall, and slide on walls
    p.vy = Math.min(p.vy + ph.g * dt, ph.maxFall);
    var sliding = !p.gr && p.vy > 0 && ((dir < 0 && p.tl) || (dir > 0 && p.tr));
    if (sliding && p.vy > ph.slide) p.vy = Math.max(ph.slide, p.vy - 5200 * dt);

    // Jump: ground (or just left it), else wall
    if (p.buf > 0) {
      if (p.gr || p.coy > 0) {
        p.vy = -ph.jump; p.gr = false; p.coy = 0; p.buf = 0; p.jumping = true;
        w.events.push("jump");
      } else if (p.tl || p.tr || p.wcoy > 0) {
        var side = p.tl ? -1 : p.tr ? 1 : p.wside;
        p.vx = -side * ph.wallJumpX; p.vy = -ph.wallJumpY; p.lock = ph.wallLock;
        p.buf = 0; p.wcoy = 0; p.jumping = true; p.face = -side;
        w.events.push("walljump");
      }
    }
    if (p.jumping && !input.j && p.vy < -ph.cut) { p.vy = -ph.cut; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;

    // Move: x first, then y
    var wasGr = p.gr;
    p.x += p.vx * dt;
    if (solidInRect(w, p.x, p.y, PW, PH)) {
      if (p.vx > 0) p.x = Math.floor((p.x + PW) / T) * T - PW;
      else if (p.vx < 0) p.x = Math.floor(p.x / T + 1) * T;
      p.vx = 0;
    }
    var vyBefore = p.vy;
    p.y += p.vy * dt;
    var landed = false;
    if (solidInRect(w, p.x, p.y, PW, PH)) {
      if (p.vy > 0) { p.y = Math.floor((p.y + PH) / T) * T - PH; landed = true; }
      else if (p.vy < 0) { p.y = Math.floor(p.y / T + 1) * T; w.events.push("bonk"); }
      p.vy = 0;
    }
    // Standing?
    p.gr = p.vy >= 0 && solidInRect(w, p.x, p.y + PH, PW, 1);
    if (p.gr) {
      p.y = Math.floor((p.y + PH + 1) / T) * T - PH; // sit right on the surface
      p.vy = 0;
      p.coy = ph.coyote;
      p.ground = groundType(w);
      if (!wasGr) { p.fallV = vyBefore; w.events.push("land"); }
    } else if (wasGr && !landed) {
      // walked off a ledge: coyote time already set while standing
    }
    p.tl = solidInRect(w, p.x - 1, p.y + 2, 1, PH - 4);
    p.tr = solidInRect(w, p.x + PW, p.y + 2, 1, PH - 4);
    if (!p.gr && (p.tl || p.tr)) { p.wcoy = ph.coyote; p.wside = p.tl ? -1 : 1; }

    // Kitchen things under your feet
    if (p.gr) {
      var c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + PW - 0.001) / T), rr = Math.floor((p.y + PH + 0.5) / T);
      var toast = false;
      for (var c = c0; c <= c1; c++) {
        var ch = tileAt(w, c, rr);
        if (ch === "T") toast = true;
        if ((ch === "H" || ch === "h") && hotNow(ch, w.t) && p.x + PW > c * T + 3 && p.x < (c + 1) * T - 3) return die(w, "sizzle");
        if (ch === "C") {
          var k = w.cr[w.map.crackerAt[rr * COLS + c]];
          if (k.timer < 0 && !k.gone) { k.timer = CRUMBLE; w.events.push("crack"); }
        }
      }
      if (toast) {
        p.vy = -ph.toaster; p.gr = false; p.coy = 0; p.jumping = false; p.buf = 0;
        w.events.push("toast");
      }
    }

    // Crackers crumble, then come back
    for (var i = 0; i < w.cr.length; i++) {
      var kk = w.cr[i];
      if (kk.timer >= 0) {
        kk.timer -= dt;
        if (kk.timer < 0) { kk.timer = -1; kk.gone = CRACKER_BACK; w.events.push("crumble:" + i); }
      } else if (kk.gone > 0) {
        kk.gone -= dt;
        if (kk.gone <= 0) {
          var cc = w.map.crackers[i];
          if (p.x + PW > cc.c * T && p.x < (cc.c + 1) * T && p.y + PH > cc.r * T && p.y < (cc.r + 1) * T) kk.gone = 0.2;
          else kk.gone = 0;
        }
      }
    }

    // Ouch
    if (hitsFork(w)) return die(w, "fork");
    for (var j = 0; j < w.map.cutters.length; j++) {
      var q = cutterPos(w.map.cutters[j], w.t);
      var nx = Math.max(p.x + 2, Math.min(q.x, p.x + PW - 2)), ny = Math.max(p.y + 2, Math.min(q.y, p.y + PH - 2));
      if ((nx - q.x) * (nx - q.x) + (ny - q.y) * (ny - q.y) < CUTTER_R * CUTTER_R) return die(w, "cutter");
    }
    if (p.y > ROWS * T + 20) return die(w, "fall");

    // Nachos!
    var g = w.map.goal;
    if (p.x + PW > g.c * T - 2 && p.x < (g.c + 1) * T + 2 && p.y + PH > g.r * T - 16 && p.y < (g.r + 1) * T) { // generous: brushing the nachos counts
      w.won = true; w.events.push("win");
    }
    return w;
  }

  function groundType(w) {
    var p = w.p, rr = Math.floor((p.y + PH + 0.5) / T);
    var c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + PW - 0.001) / T);
    var best = null;
    for (var c = c0; c <= c1; c++) {
      var ch = tileAt(w, c, rr);
      if (SOLID[ch]) { if (best === null || ch !== "=") best = ch; }
    }
    return best || "#";
  }

  // Fork boxes sit on the side they're stuck to, a bit smaller than the tile.
  function forkBox(ch, c, r) {
    var x = c * T, y = r * T;
    if (ch === "^") return [x + 5, y + 13, 20, 17];
    if (ch === "v") return [x + 5, y, 20, 17];
    if (ch === ">") return [x, y + 5, 17, 20];
    if (ch === "<") return [x + 13, y + 5, 17, 20];
    return null;
  }
  function hitsFork(w) {
    var p = w.p;
    var c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + PW) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + PH) / T);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      var b = forkBox(w.map.grid[r][c], c, r);
      if (b && p.x + PW > b[0] && p.x < b[0] + b[2] && p.y + PH > b[1] && p.y < b[1] + b[3]) return true;
    }
    return false;
  }

  function die(w, why) {
    w.dead = why;
    w.events.push("splat");
    return w;
  }

  var api = {
    T: T, COLS: COLS, ROWS: ROWS, DT: DT, PW: PW, PH: PH, PHYS: PHYS, SOLID: SOLID,
    HOT_PERIOD: HOT_PERIOD, CUTTER_R: CUTTER_R,
    parse: parse, create: create, spawn: spawn, step: step, clone: clone, tileAt: tileAt,
    cutterPos: cutterPos, hotNow: hotNow, hotWarn: hotWarn, forkBox: forkBox
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SSBEngine = api;
})(this);
