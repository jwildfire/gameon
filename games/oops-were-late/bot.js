// Oops! We're Late!: a robot sneaker that plays a room through the real engine the way a
// careful kid would. It plans a route to the empty seat that keeps behind things, steps
// round toys and creaky boards where it can, and freezes whenever the teacher is looking
// up or a kid is wriggling or turned round its way. It proves every room can be done
// (tools/check.mjs and the evidence spec), and sneaks behind the title screen.
(function (root) {
  "use strict";
  var E = root.OWL, CELL = 10, C = Math.ceil(E.W / CELL), R = Math.ceil(E.H / CELL);
  var DEG = E.DEG;

  function blocked(s, x, y) {
    var r = E.PR + 1, i, o;
    if (x < r || y < r || x > E.W - r || y > E.H - r) return true;
    for (i = 0; i < s.obs.length; i++) {
      o = s.obs[i];
      if (o.box) {
        var cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h));
        if (Math.hypot(x - cx, y - cy) < r) return true;
      } else if (Math.hypot(x - o.x, y - o.y) < o.r + r) return true;
    }
    for (i = 0; i < s.watchers.length; i++) {
      o = s.watchers[i];
      if (Math.hypot(x - o.x, y - o.y) < o.r + E.PR - 2) return true;
    }
    return false;
  }

  // In view of the teacher's (or a helper's) whole sweep: the shadows are worth a detour.
  function sweepSees(s, w, x, y, pad) {
    var dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy);
    if (d > w.spec.range + pad) return false;
    if (Math.abs(E.angDiff(w.home, Math.atan2(dy, dx))) > (w.spec.sweep + 24 + 7) * DEG) return false;
    return E.clearLine(s.obs, w.x, w.y, x, y);
  }
  function coneSees(s, w, dir, half, range, x, y) {
    var dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy);
    if (d > range) return false;
    if (Math.abs(E.angDiff(dir, Math.atan2(dy, dx))) > half) return false;
    return E.clearLine(s.obs, w.x, w.y, x, y);
  }

  // Could someone see this spot right now, or in a moment?
  // react: how slow the sneaker is to notice a warning (0 for the robot, about 0.4 for a person)
  function threatened(s, x, y, react) {
    react = react || 0;
    for (var i = 0; i < s.watchers.length; i++) {
      var w = s.watchers[i];
      if (w.noticed || w.kind === "parent") continue;
      if (w.spec) {
        if ((w.state === "warn" && w.timer < E.WARN - react) || w.state === "scan" || (w.state === "read" && w.timer < 0.3 && !react)) { if (sweepSees(s, w, x, y, 15)) return true; }
        else if (w.state === "alert" || w.state === "peek") { if (coneSees(s, w, w.target, 38 * DEG, 340, x, y)) return true; }
      } else {
        if ((w.state === "wiggle" && w.timer < 0.8 - react) || w.state === "turned") {
          if (coneSees(s, w, w.target, 40 * DEG, 245, x, y) || coneSees(s, w, w.dir, 36 * DEG, 245, x, y)) return true;
        } else if (w.state === "alert" || w.state === "peek") { if (coneSees(s, w, w.target, 38 * DEG, 265, x, y)) return true; }
        else if (E.sees(s, w, x, y) > 0) return true;
      }
    }
    return false;
  }

  function plan(s) {
    var n = C * R, cost = new Float64Array(n), dist = new Float64Array(n).fill(1e9), i, x, y;
    for (i = 0; i < n; i++) {
      x = (i % C) * CELL + CELL / 2; y = ((i / C) | 0) * CELL + CELL / 2;
      if (Math.hypot(x - s.seat.x, y - s.seat.y) > 14 && blocked(s, x, y)) { cost[i] = -1; continue; }
      var c = 1;
      s.creaks.forEach(function (b) { if (x > b[0] - 12 && x < b[0] + b[2] + 12 && y > b[1] - 12 && y < b[1] + b[3] + 12) c += 5; });
      s.toys.forEach(function (t) { if (Math.hypot(x - t.x, y - t.y) < E.PR + 16) c += 60; });
      if (s.toddler && Math.hypot(x - s.toddler.x, y - s.toddler.y) < 110) c += 3;
      s.watchers.forEach(function (w) {
        if (w.kind === "kid" && !w.noticed && coneSees(s, w, w.home, 30 * DEG, 145, x, y)) c += 80;
        if (w.spec && sweepSees(s, w, x, y, 0)) c += 1.2;
        if (w.turner && coneSees(s, w, w.out, 85 * DEG, 235, x, y)) c += 0.6;
      });
      cost[i] = c;
    }
    // Dijkstra from the seat outwards, with a little binary heap
    var heap = [], sc = Math.floor(s.seat.x / CELL), sr = Math.floor(s.seat.y / CELL), start = sr * C + sc;
    function push(k, d) { heap.push([d, k]); var j = heap.length - 1; while (j > 0) { var pj = (j - 1) >> 1; if (heap[pj][0] <= heap[j][0]) break; var t = heap[pj]; heap[pj] = heap[j]; heap[j] = t; j = pj; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var j = 0; for (;;) { var l = 2 * j + 1, r = l + 1, m = j; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === j) break; var t = heap[m]; heap[m] = heap[j]; heap[j] = t; j = m; } } return top; }
    dist[start] = 0; push(start, 0);
    while (heap.length) {
      var top = pop(), k = top[1];
      if (top[0] > dist[k]) continue;
      var kc = k % C, kr = (k / C) | 0;
      for (var dc = -1; dc <= 1; dc++) for (var dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        var nc = kc + dc, nr = kr + dr;
        if (nc < 0 || nr < 0 || nc >= C || nr >= R) continue;
        var ni = nr * C + nc;
        if (cost[ni] < 0) continue;
        if (dc && dr && (cost[kr * C + nc] < 0 || cost[nr * C + kc] < 0)) continue;
        var nd = dist[k] + cost[ni] * (dc && dr ? 1.414 : 1);
        if (nd < dist[ni]) { dist[ni] = nd; push(ni, nd); }
      }
    }
    return dist;
  }

  function cellOf(x, y) { return Math.min(R - 1, Math.max(0, Math.floor(y / CELL))) * C + Math.min(C - 1, Math.max(0, Math.floor(x / CELL))); }

  // One decision: which way to go, quietly or not, or freeze.
  function decide(s, mem) {
    var p = s.p;
    if (!mem.dist || s.t - mem.at > 1.5) { mem.dist = plan(s); mem.at = s.t; }
    var dist = mem.dist, k = cellOf(p.x, p.y), steps = 0;
    while (steps < 4) {
      var kc = k % C, kr = (k / C) | 0, best = k;
      for (var dc = -1; dc <= 1; dc++) for (var dr = -1; dr <= 1; dr++) {
        var nc = kc + dc, nr = kr + dr;
        if (nc < 0 || nr < 0 || nc >= C || nr >= R) continue;
        var ni = nr * C + nc;
        if (dist[ni] < dist[best]) best = ni;
      }
      if (best === k) break;
      k = best; steps++;
    }
    var tx = (k % C) * CELL + CELL / 2, ty = ((k / C) | 0) * CELL + CELL / 2;
    if (Math.hypot(p.x - s.seat.x, p.y - s.seat.y) < 40) { tx = s.seat.x; ty = s.seat.y; }
    var dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
    var nx = p.x + dx / d * 16, ny = p.y + dy / d * 16;
    if (threatened(s, p.x, p.y, mem.react) || threatened(s, nx, ny, mem.react)) return { x: 0, y: 0, freeze: true };
    var quiet = false;
    s.creaks.forEach(function (b) { if (nx > b[0] - 16 && nx < b[0] + b[2] + 16 && ny > b[1] - 16 && ny < b[1] + b[3] + 16) quiet = true; });
    if (s.toddler && Math.hypot(nx - s.toddler.x, ny - s.toddler.y) < 112) quiet = true;
    s.toys.forEach(function (t) { if (Math.hypot(nx - t.x, ny - t.y) < 40) quiet = true; });
    return { x: dx / d, y: dy / d, quiet: quiet };
  }

  // Plays a whole room; returns how it went.
  function run(n, seed, maxT, react) {
    var s = E.create(n, seed), mem = { react: react || 0 }, sounds = { creak: 0, squeak: 0, cry: 0 };
    maxT = maxT || 240;
    var frozen = 0;
    while (!s.won && !s.lost && s.t < maxT) {
      var inp = decide(s, mem);
      if (inp.freeze) frozen += E.DT;
      E.step(s, inp, E.DT);
      s.events.forEach(function (e) { if (e.t in sounds) sounds[e.t]++; });
      s.events.length = 0;
    }
    return { won: s.won, lost: s.lost, by: s.lostBy, stars: s.won ? s.stars : 0, noticed: s.noticed, t: Math.round(s.t * 10) / 10, frozen: Math.round(frozen * 10) / 10,
      creaks: sounds.creak, squeaks: sounds.squeak, cries: sounds.cry, x: Math.round(s.p.x), y: Math.round(s.p.y) };
  }

  root.OWLBot = { decide: decide, run: run, threatened: threatened, plan: plan };
})(typeof window !== "undefined" ? window : globalThis);
