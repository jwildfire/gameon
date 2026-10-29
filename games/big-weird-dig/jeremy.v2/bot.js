// Big Weird Dig: a robot driver that plays a level through the real engine, the way a
// careful kid would: dig toward the nearest weird thing, grab fuel when it's running low,
// get out from under wobbly boulders, and shove moles back with the blade.
// It proves every level can be beaten (tools/check.mjs and the evidence spec).
(function (root) {
  "use strict";
  var E = root.BWD;

  function decide(s) {
    var C = E.COLS, R = E.ROWS, d = s.dozer, g = s.grid;
    var dc = Math.round(d.x), dr = Math.round(d.y), i, b, m;

    // Cells under a boulder that's about to drop, or dropping.
    var danger = new Uint8Array(C * R), under = new Uint8Array(C * R);
    for (i = 0; i < s.boulders.length; i++) {
      b = s.boulders[i];
      if (b.gone) continue;
      var loose = b.state !== "rest" || E.openForBoulder(s, b, b.c, b.r + 1);
      if (loose) for (var r = b.r + 1; r < R && g[r * C + b.c] === E.OPEN; r++) danger[r * C + b.c] = 1;
      else if (b.r + 1 < R) under[(b.r + 1) * C + b.c] = 1;
    }
    var moleCell = new Uint8Array(C * R);
    for (i = 0; i < s.moles.length; i++) {
      m = s.moles[i];
      if (m.dizzy > 0 || m.knock > 0 || m.giggle > 0) continue;
      moleCell[Math.round(m.y) * C + Math.round(m.x)] = 1;
    }

    // Dijkstra over cells, in seconds, also adding up the fuel it costs.
    var time = new Float64Array(C * R).fill(1e9), fuel = new Float64Array(C * R), prev = new Int32Array(C * R).fill(-1);
    var start = dr * C + dc, open = [start], done = new Uint8Array(C * R);
    time[start] = 0;
    while (open.length) {
      var bi = 0;
      for (i = 1; i < open.length; i++) if (time[open[i]] < time[open[bi]]) bi = i;
      var cur = open[bi];
      open[bi] = open[open.length - 1]; open.pop();
      if (done[cur]) continue;
      done[cur] = 1;
      var cc = cur % C, cr = (cur / C) | 0;
      for (var k in E.DIRS) {
        var nc = cc + E.DIRS[k][0], nr = cr + E.DIRS[k][1];
        if (nc < 0 || nr < 0 || nc >= C || nr >= R) continue;
        var ni = nr * C + nc, h = g[ni];
        if (h === E.STONE || E.boulderAt(s, nc, nr)) continue;
        var sec = 1 / E.DIG_SPEED[h], f = E.DIG_DRAIN[h] * sec;
        var pen = (danger[ni] ? 3 : 0) + (under[ni] ? 0.6 : 0) + (moleCell[ni] ? 1 : 0);
        var t = time[cur] + sec + pen;
        if (t < time[ni]) { time[ni] = t; fuel[ni] = fuel[cur] + f; prev[ni] = cur; open.push(ni); }
      }
    }

    // Pick a goal: the nearest find, unless fuel is getting low and a can is handy.
    var goal = -1, best = 1e9;
    for (i = 0; i < s.finds.length; i++) {
      var fd = s.finds[i];
      if (fd.got) continue;
      var fi = fd.r * C + fd.c;
      if (time[fi] < best) { best = time[fi]; goal = fi; }
    }
    var needFuel = goal >= 0 ? fuel[goal] + time[goal] * 0.3 + 12 : 0;
    var canGoal = -1, canBest = 1e9;
    for (i = 0; i < s.cans.length; i++) {
      var cn = s.cans[i];
      if (cn.got) continue;
      var ci = cn.r * C + cn.c;
      if (time[ci] < canBest) { canBest = time[ci]; canGoal = ci; }
    }
    if (canGoal >= 0 && (s.fuel < needFuel || s.fuel < 45 || canBest < best * 0.5) && s.fuel > fuel[canGoal] && E.MAX_FUEL - s.fuel > 15) goal = canGoal;

    var dir = null;
    if (goal >= 0 && goal !== start && prev[goal] >= 0) {
      var step = goal;
      while (prev[step] !== start) step = prev[step];
      var sc = step % C, sr = (step / C) | 0;
      dir = sc > dc ? "r" : sc < dc ? "l" : sr > dr ? "d" : "u";
    }

    // Under a loose boulder? Get out sideways.
    if (danger[start] || under[start]) {
      var escape = null;
      for (var j = 0; j < 2; j++) {
        var kk = j === 0 ? (dir === "l" ? "l" : "r") : (dir === "l" ? "r" : "l");
        var ex = dc + E.DIRS[kk][0], ei = dr * C + ex;
        if (ex >= 0 && ex < C && g[ei] !== E.STONE && !E.boulderAt(s, ex, dr) && !danger[ei]) { escape = kk; break; }
      }
      if (escape && (dir === "u" || dir === "d" || !dir)) dir = escape;
    }

    // Moles: face a close one and give it a shove.
    var bladeNow = false, f0 = E.DIRS[d.dir];
    for (i = 0; i < s.moles.length; i++) {
      m = s.moles[i];
      if (m.dizzy > 0 || m.knock > 0 || m.giggle > 0) continue;
      var rx = m.x - d.x, ry = m.y - d.y, dist = Math.abs(rx) + Math.abs(ry);
      var along = rx * f0[0] + ry * f0[1], across = Math.abs(rx * f0[1] - ry * f0[0]);
      if (along > -0.2 && along < 1.8 && across < 0.7) bladeNow = true;
      else if (dist < 1.6 && E.isInt(d.x) && E.isInt(d.y)) {
        dir = Math.abs(rx) > Math.abs(ry) ? (rx > 0 ? "r" : "l") : (ry > 0 ? "d" : "u");
      }
    }
    return { dir: dir, blade: bladeNow };
  }

  // Play level n to the end with the robot driver; returns how it went.
  function run(n, seed, maxSec) {
    var s = E.create(n, seed || 1), ticks = 0, limit = (maxSec || 300) / E.DT;
    while (!s.won && !s.lost && ticks < limit) { E.step(s, decide(s)); ticks++; }
    return { level: n, won: s.won, lost: s.lost, fuel: Math.round(s.fuel), t: Math.round(s.t * 10) / 10,
      bonks: s.bonks, moleBonks: s.moleBonks, got: s.finds.filter(function (f) { return f.got; }).length, of: s.finds.length };
  }

  root.BWDBot = { decide: decide, run: run };
})(typeof window !== "undefined" ? window : globalThis);
