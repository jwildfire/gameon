// Oops! We're Late!: the whole story-time room. The parent, the teacher, the kids in the
// circle, their view cones and "noticing" meters, creaky boards, squeaky toys and the
// sleeping toddler, stepped 60 times a second. There's no drawing, sound or clock in here,
// so the same code runs in the game, in the robot sneaker (bot.js) and in the room checker
// (tools/check.mjs).
(function (root) {
  "use strict";

  var W = 540, H = 720, DT = 1 / 60;
  var PR = 17;                       // the parent's body (carrying the kid), in room units
  var SPEED = 96, QUIET = 50;        // walking and tiptoeing speeds, units a second
  var SIZE = { kid: 17, parent: 19, teacher: 21, helper: 19 };
  var DEG = Math.PI / 180;
  var LIMIT = 3;                     // this many kids noticing and you're spotted
  var WARN = 1.0;                    // the teacher's "look up" warning, seconds
  var WIGGLE = 0.8;                  // a kid wriggles this long before turning round
  var ALERT = 0.4;                   // a noise takes this long to turn heads

  // Rooms. The circle's seats go clockwise from the top: T teacher, k kid, K a kid who
  // turns round now and then, p a parent, E the empty seat. Obstacles are
  // [kind, x, y, w, h] boxes or [kind, x, y, r] round things; all of them hide you.
  var ROOMS = [
    {
      name: "Classroom Circle", floor: "carpet", rug: 0,
      tip: "Tiptoe while the teacher reads. When she looks up, FREEZE!",
      ring: { x: 270, y: 225, r: 112, seats: "TkpkEkpk" },
      door: [440, 676],
      teacher: { every: [4.5, 7], first: [1.6, 2.4], sweep: 62, scan: 2.8, range: 470 },
      turn: { every: [7, 11], look: [1.4, 2.2] },
      obs: [["shelf", 196, 452, 148, 26], ["plant", 92, 470, 22], ["cubby", 0, 300, 40, 150], ["plant", 470, 420, 20], ["table", 380, 560, 110, 46]],
      creaks: [], toys: [], toddler: null, helpers: []
    },
    {
      name: "Library Story Time", floor: "tile", rug: 1,
      tip: "Kids wriggle before they turn round. Watch for the wiggle!",
      ring: { x: 270, y: 222, r: 118, seats: "TkKpkkpEkK" },
      door: [455, 676],
      teacher: { every: [4, 6], sweep: 64, scan: 2.8, range: 480 },
      turn: { every: [5, 8.5], look: [1.4, 2.4] },
      obs: [["stack", 150, 520, 150, 24], ["stack", 30, 400, 120, 24], ["stack", 300, 420, 24, 140], ["plant", 60, 300, 22], ["stack", 420, 600, 120, 24]],
      creaks: [], toys: [], toddler: null, helpers: []
    },
    {
      name: "Music Class", floor: "wood", rug: 2,
      tip: "Dark boards CREAK! Tiptoe over them (Shift, or keep your finger close).",
      ring: { x: 270, y: 225, r: 118, seats: "TkpKkkpkEk" },
      door: [460, 676],
      teacher: { every: [3.6, 5.6], sweep: 64, scan: 2.8, range: 480 },
      turn: { every: [5, 8], look: [1.4, 2.4] },
      obs: [["piano", 20, 470, 130, 56], ["drum", 450, 470, 26], ["drum", 400, 410, 18], ["xylo", 230, 470, 120, 30]],
      creaks: [[150, 540, 30, 120], [270, 560, 30, 110], [360, 500, 30, 90], [60, 360, 110, 26]],
      toys: [], toddler: null, helpers: []
    },
    {
      name: "Birthday Party", floor: "tile", rug: 3,
      tip: "Toys squeak if you step on them. Squeaks turn heads!",
      ring: { x: 270, y: 225, r: 122, seats: "TkKEkpkkKpk" },
      door: [80, 676],
      teacher: { every: [3.5, 5.5], sweep: 64, scan: 2.8, range: 490 },
      turn: { every: [4.5, 7.5], look: [1.4, 2.4] },
      obs: [["cake", 340, 470, 140, 60], ["presents", 30, 460, 80, 56], ["balloons", 200, 560, 22], ["presents", 470, 300, 56, 50]],
      creaks: [], toys: [[160, 470], [260, 420], [300, 600], [130, 600], [420, 380]],
      toddler: null, helpers: []
    },
    {
      name: "Nap-Time Nook", floor: "carpet", rug: 4,
      tip: "Shhh, a toddler is napping. Walk near her and she'll wake up!",
      ring: { x: 270, y: 222, r: 116, seats: "TkpkKkKEK" },
      door: [470, 676],
      teacher: { every: [2.8, 4.4], sweep: 66, scan: 2.8, range: 490 },
      turn: { every: [4.5, 7.5], look: [1.4, 2.4] },
      obs: [["crib", 300, 440, 90, 60], ["crib", 60, 520, 90, 60], ["plant", 470, 470, 22], ["plant", 60, 330, 20]],
      creaks: [[200, 560, 30, 110], [400, 560, 30, 70]], toys: [[300, 600], [110, 440]],
      toddler: [250, 470], helpers: []
    },
    {
      name: "Art Class", floor: "tile", rug: 5,
      tip: "A helper is here too. Grown-ups who spot you count as one noticing.",
      ring: { x: 270, y: 218, r: 118, seats: "TkKkpkKkEpk" },
      door: [270, 676],
      teacher: { every: [2.8, 4.4], sweep: 64, scan: 2.8, range: 490 },
      turn: { every: [4.5, 7], look: [1.4, 2.4] },
      obs: [["easel", 80, 420, 60, 18], ["easel", 400, 420, 60, 18], ["easel", 220, 500, 70, 18], ["sink", 0, 560, 60, 110], ["easel", 120, 580, 60, 18]],
      creaks: [], toys: [[180, 470], [350, 560], [60, 330]],
      toddler: null,
      helpers: [{ x: 500, y: 560, face: 200, every: [4.5, 7], sweep: 38, scan: 2.4, range: 300 }]
    },
    {
      name: "Gym Circle", floor: "gym", rug: 6,
      tip: "A big open gym. Hop from hiding spot to hiding spot!",
      ring: { x: 270, y: 225, r: 124, seats: "TkKkKpkkkkEK" },
      door: [480, 676],
      teacher: { every: [2.5, 4], sweep: 68, scan: 2.8, range: 500 },
      turn: { every: [4, 6.5], look: [1.4, 2.4] },
      obs: [["mats", 120, 460, 80, 50], ["cart", 330, 530, 70, 40], ["mats", 450, 400, 70, 60], ["cone", 260, 440, 18]],
      creaks: [[200, 600, 120, 26], [400, 470, 26, 120], [60, 560, 26, 50]], toys: [[230, 520], [420, 600]],
      toddler: null, helpers: []
    },
    {
      name: "The Big Puppet Show", floor: "wood", rug: 7,
      tip: "Everything at once! You can do it. Sneaky, sneaky...",
      ring: { x: 270, y: 232, r: 128, seats: "TkKkpkKkpKEKK" },
      door: [470, 676],
      teacher: { every: [2.4, 3.8], sweep: 66, scan: 2.8, range: 500 },
      turn: { every: [4, 6.5], look: [1.4, 2.4] },
      obs: [["shelf", 300, 470, 120, 26], ["plant", 70, 470, 22], ["presents", 160, 560, 70, 50], ["coats", 480, 330, 24]],
      creaks: [[380, 550, 26, 110], [100, 360, 26, 80]], toys: [[250, 430], [330, 600], [130, 420]],
      toddler: [230, 470],
      helpers: [{ x: 40, y: 640, face: -40, every: [5, 8], sweep: 34, scan: 2.4, range: 300 }]
    }
  ];

  function rng(seed) {
    var s = Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    s = (Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function between(rnd, a) { return a[0] + (a[1] - a[0]) * rnd(); }
  function angDiff(a, b) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

  // Geometry: obstacles as boxes or circles, segments and rays against them.
  function obstacle(o) {
    return o.length === 5 ? { kind: o[0], x: o[1], y: o[2], w: o[3], h: o[4], box: true }
      : { kind: o[0], x: o[1], y: o[2], r: o[3], box: false };
  }
  // distance along a ray (unit dx, dy) to the first obstacle, or max
  function rayHit(obs, x, y, dx, dy, max) {
    var best = max;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i], t;
      if (o.box) {
        var t0 = 0, t1 = best, ok = true;
        var lo = [o.x, o.y], hi = [o.x + o.w, o.y + o.h], p = [x, y], d = [dx, dy];
        for (var k = 0; k < 2 && ok; k++) {
          if (Math.abs(d[k]) < 1e-9) { if (p[k] < lo[k] || p[k] > hi[k]) ok = false; }
          else {
            var a = (lo[k] - p[k]) / d[k], b = (hi[k] - p[k]) / d[k];
            if (a > b) { var tmp = a; a = b; b = tmp; }
            if (a > t0) t0 = a;
            if (b < t1) t1 = b;
            if (t0 > t1) ok = false;
          }
        }
        if (ok && t0 < best) best = t0;
      } else {
        var fx = x - o.x, fy = y - o.y, bq = fx * dx + fy * dy, c = fx * fx + fy * fy - o.r * o.r;
        var disc = bq * bq - c;
        if (disc >= 0) { t = -bq - Math.sqrt(disc); if (t < 0 && c < 0) t = 0; if (t >= 0 && t < best) best = t; }
      }
    }
    return best;
  }
  function clearLine(obs, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d < 1) return true;
    return rayHit(obs, x1, y1, dx / d, dy / d, d) >= d - 0.5;
  }
  function inBox(b, x, y) { return x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]; }

  function seatPos(ring, i) {
    var n = ring.seats.length, a = -Math.PI / 2 + i * 2 * Math.PI / n;
    return { x: ring.x + Math.cos(a) * ring.r, y: ring.y + Math.sin(a) * ring.r, a: a };
  }

  function create(n, seed) {
    var def = ROOMS[n - 1], rnd = rng((seed || 1) * 7919 + n * 104729);
    var s = {
      n: n, def: def, rnd: rnd, t: 0, events: [], noises: [],
      obs: def.obs.map(obstacle), creaks: def.creaks, watchers: [],
      noticed: 0, won: false, lost: false, lostBy: null, stars: 0,
      p: { x: def.door[0], y: def.door[1], face: -Math.PI / 2, moving: false, quiet: false, walk: 0, board: -1, creakT: 0, seenBy: 0 },
      toys: def.toys.map(function (t, i) { return { x: t[0], y: t[1], vx: 0, vy: 0, cool: 0, kind: i % 3, spin: 0 }; }),
      toddler: def.toddler ? { x: def.toddler[0], y: def.toddler[1], stir: 0, awake: 0 } : null,
      seat: null
    };
    var ring = def.ring;
    for (var i = 0; i < ring.seats.length; i++) {
      var c = ring.seats[i], sp = seatPos(ring, i), inward = sp.a + Math.PI;
      if (c === "E") { s.seat = { x: sp.x, y: sp.y, a: sp.a }; continue; }
      var kind = c === "T" ? "teacher" : c === "p" ? "parent" : "kid";
      var w = {
        kind: kind, x: sp.x, y: sp.y, r: SIZE[kind], home: inward, dir: inward, want: inward,
        state: kind === "teacher" ? "read" : "face", timer: 0, meter: 0, noticed: false,
        turner: c === "K", target: 0, look: null, i: i, look2: 0, sweepSign: 1, spec: kind === "teacher" ? def.teacher : null,
        out: sp.a
      };
      s.watchers.push(w);
    }
    def.helpers.forEach(function (h, j) {
      s.watchers.push({ kind: "helper", x: h.x, y: h.y, r: SIZE.helper, home: h.face * DEG, dir: h.face * DEG, want: h.face * DEG,
        state: "read", timer: 0, meter: 0, noticed: false, turner: false, target: 0, i: 100 + j, sweepSign: 1, spec: h });
    });
    s.watchers.forEach(function (w) {
      if (w.spec) w.timer = w.kind === "teacher" ? (w.spec.first ? between(rnd, w.spec.first) : 1.2 + between(rnd, w.spec.every) * 0.6) : between(rnd, w.spec.every);
      else if (w.turner) w.timer = between(rnd, def.turn.every) * (0.5 + rnd() * 0.6);
    });
    return s;
  }

  // What a watcher can see right now: { dir, half, range } or null.
  function cone(s, w) {
    if (w.noticed) return null;
    switch (w.state) {
      case "scan": return { dir: w.dir, half: 24 * DEG, range: w.spec.range };
      case "peek": return { dir: w.dir, half: 30 * DEG, range: w.kind === "teacher" ? 320 : 250 };
      case "turned": return { dir: w.dir, half: 30 * DEG, range: 230 };
      case "face": case "wiggle": case "alert":
        return w.kind === "kid" ? { dir: w.dir, half: 24 * DEG, range: 132 } : null;
      default: return null;
    }
  }

  function sees(s, w, x, y) {
    var c = cone(s, w);
    if (!c) return 0;
    var dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy);
    if (d > c.range) return 0;
    if (d > w.r && Math.abs(angDiff(c.dir, Math.atan2(dy, dx))) > c.half) return 0;
    if (!clearLine(s.obs, w.x, w.y, x, y)) return 0;
    return 1.6 - (d / c.range);   // nearer is noticed faster
  }

  function noise(s, x, y, r, kind, force) {
    s.noises.push({ x: x, y: y, r: r, t: 0, kind: kind });
    s.events.push({ t: kind, x: x, y: y });
    s.watchers.forEach(function (w) {
      if (w.noticed || w.kind === "parent") return;
      if (Math.hypot(w.x - x, w.y - y) > r) return;
      var calm = w.kind === "kid" ? (w.state === "face" || w.state === "wiggle" || w.state === "turned")
        : (w.state === "read" || w.state === "warn" || w.state === "back");
      if (!calm && !force) return;
      w.state = "alert"; w.timer = force ? 0.25 : ALERT; w.target = Math.atan2(y - w.y, x - w.x);
      w.peekFor = force ? 2.6 : 1.7;
    });
  }

  function turnToward(w, dt, rate) {
    var d = angDiff(w.dir, w.want), m = rate * dt;
    w.dir += Math.abs(d) <= m ? d : Math.sign(d) * m;
  }

  function stepWatcher(s, w, dt) {
    var def = s.def, rnd = s.rnd;
    if (w.kind === "parent") return;
    if (w.noticed) { w.want = Math.atan2(s.p.y - w.y, s.p.x - w.x); turnToward(w, dt, 4); return; }
    w.timer -= dt;
    if (w.kind === "teacher" || w.kind === "helper") {
      var sp = w.spec;
      if (w.state === "read") { w.want = w.home; if (w.timer <= 0) { w.state = "warn"; w.timer = WARN; s.events.push({ t: "warn", who: w.kind }); } }
      else if (w.state === "warn") { w.want = w.home; if (w.timer <= 0) { w.state = "scan"; w.timer = sp.scan; w.sweepSign = rnd() < 0.5 ? 1 : -1; } }
      else if (w.state === "scan") {
        var prog = 1 - Math.max(0, w.timer) / sp.scan;
        // look one way, then sweep across to the other
        w.dir = w.home + w.sweepSign * sp.sweep * DEG * (-Math.cos(prog * Math.PI));
        w.want = w.dir;
        if (w.timer <= 0) { w.state = "back"; w.timer = 0.35; }
      }
      else if (w.state === "back") { w.want = w.home; turnToward(w, dt, 5); if (w.timer <= 0) { w.state = "read"; w.timer = between(rnd, sp.every); } }
      else if (w.state === "alert") { w.want = w.target; turnToward(w, dt, 6); if (w.timer <= 0) { w.state = "peek"; w.timer = w.peekFor; } }
      else if (w.state === "peek") { w.want = w.target; turnToward(w, dt, 6); if (w.timer <= 0) { w.state = "back"; w.timer = 0.4; } }
      return;
    }
    // kids
    if (w.state === "face") {
      w.want = w.home; turnToward(w, dt, 5);
      if (w.turner && w.timer <= 0) {
        w.state = "wiggle"; w.timer = WIGGLE;
        w.target = w.out + (rnd() * 2 - 1) * 55 * DEG;
        s.events.push({ t: "wiggle", x: w.x, y: w.y });
      }
    } else if (w.state === "wiggle") {
      w.want = w.home; turnToward(w, dt, 5);
      if (w.timer <= 0) { w.state = "turned"; w.timer = between(rnd, def.turn.look); }
    } else if (w.state === "turned") {
      w.want = w.target; turnToward(w, dt, 5);
      if (w.timer <= 0) { w.state = "face"; w.timer = between(rnd, def.turn.every); }
    } else if (w.state === "alert") {
      w.want = w.target; turnToward(w, dt, 6);
      if (w.timer <= 0) { w.state = "peek"; w.timer = w.peekFor; }
    } else if (w.state === "peek") {
      w.want = w.target; turnToward(w, dt, 6);
      if (w.timer <= 0) { w.state = "face"; w.timer = w.turner ? between(rnd, def.turn.every) : 0; }
    }
  }

  function pushOut(s, x, y, r) {
    var i, o, people = s.watchers;
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < s.obs.length; i++) {
        o = s.obs[i];
        if (o.box) {
          var cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h));
          var dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
          if (d < r) {
            if (d < 1e-6) { // centre inside the box: push out the nearest side
              var l = x - o.x, rr = o.x + o.w - x, t = y - o.y, b = o.y + o.h - y, m = Math.min(l, rr, t, b);
              if (m === l) x = o.x - r; else if (m === rr) x = o.x + o.w + r; else if (m === t) y = o.y - r; else y = o.y + o.h + r;
            } else { x = cx + dx / d * r; y = cy + dy / d * r; }
          }
        } else {
          var ex = x - o.x, ey = y - o.y, ed = Math.hypot(ex, ey), need = o.r + r;
          if (ed < need && ed > 1e-6) { x = o.x + ex / ed * need; y = o.y + ey / ed * need; }
        }
      }
      for (i = 0; i < people.length; i++) {
        o = people[i];
        var px = x - o.x, py = y - o.y, pd = Math.hypot(px, py), pn = o.r + r - 3;
        if (pd < pn && pd > 1e-6) { x = o.x + px / pd * pn; y = o.y + py / pd * pn; }
      }
      x = Math.max(r, Math.min(W - r, x)); y = Math.max(r, Math.min(H - r, y));
    }
    return { x: x, y: y };
  }

  // input: { x, y } wanted direction (length up to 1), quiet, freeze
  function step(s, input, dt) {
    dt = dt || DT;
    if (s.won || s.lost) return s;
    s.t += dt;
    var p = s.p, ix = (input && input.x) || 0, iy = (input && input.y) || 0, mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
    var quiet = !!(input && input.quiet), speed = (quiet ? QUIET : SPEED) * mag;
    if (input && input.freeze) speed = 0;
    var ox = p.x, oy = p.y;
    if (speed > 0) {
      p.face = Math.atan2(iy, ix);
      var q = pushOut(s, p.x + ix / mag * speed * dt, p.y + iy / mag * speed * dt, PR);
      p.x = q.x; p.y = q.y;
    }
    var moved = Math.hypot(p.x - ox, p.y - oy);
    p.moving = moved / dt > 6;
    p.quiet = quiet;
    if (p.moving) {
      p.walk += moved;
      if (p.walk > (quiet ? 20 : 28)) { p.walk = 0; s.events.push({ t: "step", quiet: quiet }); }
    }

    // creaky boards
    var board = -1;
    for (var b = 0; b < s.creaks.length; b++) if (inBox(s.creaks[b], p.x, p.y)) board = b;
    p.creakT -= dt;
    if (board >= 0 && p.moving && (board !== p.board || p.creakT <= 0)) {
      noise(s, p.x, p.y, quiet ? 95 : 270, quiet ? "creak-soft" : "creak");
      p.creakT = quiet ? 1.1 : 0.6;
    }
    if (board !== p.board && board >= 0 && !p.moving) p.creakT = 0;
    p.board = p.moving || board < 0 ? board : p.board;

    // squeaky toys get kicked along
    s.toys.forEach(function (t) {
      t.cool -= dt;
      var dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
      if (d < PR + 8 && p.moving) {
        if (t.cool <= 0) { noise(s, t.x, t.y, quiet ? 210 : 290, "squeak"); t.cool = 0.9; t.spin = 1; }
        var k = d > 0.01 ? 1 / d : 0;
        t.vx = dx * k * (quiet ? 60 : 120); t.vy = dy * k * (quiet ? 60 : 120);
      }
      if (t.vx || t.vy) {
        var q2 = pushOut(s, t.x + t.vx * dt, t.y + t.vy * dt, 8);
        t.x = q2.x; t.y = q2.y; t.vx *= 0.92; t.vy *= 0.92;
        if (Math.hypot(t.vx, t.vy) < 2) { t.vx = 0; t.vy = 0; }
      }
      t.spin = Math.max(0, t.spin - dt * 2);
    });

    // the napping toddler
    var td = s.toddler;
    if (td) {
      if (td.awake > 0) { td.awake -= dt; if (td.awake <= 0) { td.stir = 0; s.events.push({ t: "settle" }); } }
      else {
        var dd = Math.hypot(td.x - p.x, td.y - p.y), rate = 0;
        if (p.moving && dd < 100) rate = quiet ? (dd < 52 ? 0.45 : 0) : 1.2 * (1 - dd / 100 * 0.45);
        td.stir = rate > 0 ? td.stir + rate * dt : Math.max(0, td.stir - 0.3 * dt);
        if (td.stir >= 1) { td.awake = 3; td.stir = 1; noise(s, td.x, td.y, 2000, "cry", true); }
      }
    }

    s.watchers.forEach(function (w) { stepWatcher(s, w, dt); });

    // who can see you, and how much they've noticed
    p.seenBy = 0;
    for (var i = 0; i < s.watchers.length; i++) {
      var w = s.watchers[i];
      if (w.noticed) continue;
      var f = sees(s, w, p.x, p.y);
      if (f > 0) {
        p.seenBy++;
        var base = p.moving ? (p.quiet ? 0.8 : 1.7) : 0.16;
        if (w.kind === "teacher") base *= 0.85;
        var before = w.meter;
        w.meter += base * f * dt;
        if (before < 0.3 && w.meter >= 0.3) s.events.push({ t: "hmm", x: w.x, y: w.y });
        if (w.meter >= 1) {
          w.meter = 1; w.noticed = true;
          if (w.kind === "teacher") { s.lost = true; s.lostBy = "teacher"; s.events.push({ t: "lost", by: "teacher" }); return s; }
          s.noticed++;
          s.events.push({ t: "spotted", x: w.x, y: w.y, who: w.kind });
          if (s.noticed >= LIMIT) { s.lost = true; s.lostBy = "kids"; s.events.push({ t: "lost", by: "kids" }); return s; }
        }
      } else w.meter = Math.max(0, w.meter - 0.35 * dt);
    }

    s.noises = s.noises.filter(function (nz) { nz.t += dt; return nz.t < 0.9; });

    if (Math.hypot(p.x - s.seat.x, p.y - s.seat.y) < 13) {
      p.x = s.seat.x; p.y = s.seat.y;
      s.won = true; s.stars = Math.max(1, 3 - s.noticed);
      s.events.push({ t: "win", stars: s.stars });
    }
    return s;
  }

  var api = {
    W: W, H: H, DT: DT, PR: PR, SPEED: SPEED, QUIET: QUIET, LIMIT: LIMIT, WARN: WARN, DEG: DEG,
    ROOMS: ROOMS, create: create, step: step, cone: cone, sees: sees, rayHit: rayHit,
    clearLine: clearLine, angDiff: angDiff, inBox: inBox, pushOut: pushOut, rng: rng
  };
  root.OWL = api;
})(typeof window !== "undefined" ? window : globalThis);
