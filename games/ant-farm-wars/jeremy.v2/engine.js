// Ant Farm Wars: the whole farm simulation. No drawing, no sound, no clock: the game,
// the title-screen demo and the balance checker (tools/check.mjs) all step this same code.
(function (root) {
  "use strict";

  var W = 40, H = 26;            // farm size in cells (side view: row 0 is just under the lid)
  var DT = 1 / 30;               // one simulation step, in seconds
  var ROUND_T = 28;              // seconds of battle per round
  var SOIL = 0, TUNNEL = 1, ROCK = 2, FOOD = 3;

  // Seedable random numbers (mulberry32), so a seed always plays the same farm.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var COLONIES = [
    { name: "Gold Colony", short: "Gold", color: "#ffc93c", qx: 4, qy: 4, style: "player" },
    { name: "Red Biters", short: "Red", color: "#ff5a5f", qx: 35, qy: 4, style: "fighter" },
    { name: "Blue Diggers", short: "Blue", color: "#4da3ff", qx: 4, qy: 21, style: "digger" },
    { name: "Green Munchers", short: "Green", color: "#5fd068", qx: 35, qy: 21, style: "builder" }
  ];

  // Upgrades stack; powers are used during the battle with a cooldown.
  var CARDS = [
    { id: "dig", kind: "up", name: "Speedy Diggers", text: "Ants dig 60% faster.", icon: "shovel" },
    { id: "legs", kind: "up", name: "Quick Legs", text: "Ants run 20% faster.", icon: "legs" },
    { id: "tough", kind: "up", name: "Tough Soldiers", text: "Soldiers get 35% more health.", icon: "shield" },
    { id: "jaws", kind: "up", name: "Sharp Jaws", text: "Soldiers bite 30% harder.", icon: "jaws" },
    { id: "workers", kind: "up", name: "More Workers", text: "+3 worker space, and 2 hatch now.", icon: "worker" },
    { id: "army", kind: "up", name: "Bigger Army", text: "+3 soldier space, and 1 hatches now.", icon: "army" },
    { id: "jelly", kind: "up", name: "Royal Jelly", text: "Queen gets +40 health and heals up.", icon: "crown" },
    { id: "sweet", kind: "up", name: "Sweet Tooth", text: "Workers carry 2 more crumbs.", icon: "crumb" },
    { id: "hatch", kind: "up", name: "Fast Hatching", text: "Eggs hatch faster and cost less.", icon: "egg" },
    { id: "guards", kind: "up", name: "Nest Guards", text: "2 big guards stay home and protect the queen.", icon: "guard" },
    { id: "fire", kind: "power", name: "Fire Ants", text: "Tap the farm: a burst of fire burns enemy ants.", icon: "fire" },
    { id: "glue", kind: "power", name: "Glue Spit", text: "Tap the farm: sticky glue slows enemies right down.", icon: "glue" },
    { id: "cave", kind: "power", name: "Tunnel Cave-in", text: "Tap a tunnel: it falls in and squashes enemies.", icon: "cave" },
    { id: "fly", kind: "power", name: "Flying Scouts", text: "Tap the farm: winged ants fly straight there.", icon: "wings" }
  ];
  var CARD = {}; CARDS.forEach(function (c) { CARD[c.id] = c; });
  var POWERS = ["fire", "glue", "cave", "fly"];
  var POWER_CD = { fire: 16, glue: 18, cave: 20, fly: 26 };

  function idx(x, y) { return y * W + x; }
  function inside(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }

  function create(seed, opts) {
    opts = opts || {};
    var R = rng(seed);
    var s = {
      seed: seed, R: R, t: 0, roundT: 0, round: 1, phase: "draft", over: false, winner: -1,
      cells: new Uint8Array(W * H), owner: new Int8Array(W * H).fill(-1), food: new Uint8Array(W * H),
      layer: new Uint8Array(W * H), ants: [], nextId: 1, fx: [], glue: [], events: [], log: [],
      fields: [], fieldsDirty: true, fieldT: 0, terrainVersion: 0, place: [], offers: [], ai: opts.ai || {}
    };
    // soil layers for the look, and a few rocks
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      s.layer[idx(x, y)] = Math.min(3, Math.floor((y + R() * 2.5) / 7));
    }
    var nests = COLONIES.map(function (c) { return [c.qx, c.qy]; });
    function nearNest(x, y, d) { return nests.some(function (n) { return Math.abs(n[0] - x) <= d && Math.abs(n[1] - y) <= d; }); }
    for (var r = 0; r < 7; r++) {
      var rx = 6 + Math.floor(R() * (W - 12)), ry = 2 + Math.floor(R() * (H - 4)), rr = 1 + R() * 1.6;
      if (nearNest(rx, ry, 6)) continue;
      for (y = -2; y <= 2; y++) for (x = -2; x <= 2; x++) {
        if (x * x + y * y <= rr * rr && inside(rx + x, ry + y)) s.cells[idx(rx + x, ry + y)] = ROCK;
      }
    }
    // food pockets: a big sugar lump in the middle, crumbs elsewhere (mirrored so it's fair)
    function putFood(fx, fy, n) {
      if (!inside(fx, fy) || nearNest(fx, fy, 2)) return;
      s.cells[idx(fx, fy)] = FOOD; s.food[idx(fx, fy)] = n;
    }
    for (y = 11; y <= 14; y++) for (x = 18; x <= 21; x++) putFood(x, y, 5);
    for (var f = 0; f < 4; f++) {
      var px = 7 + Math.floor(R() * 9), py = 2 + Math.floor(R() * 9);
      [[px, py], [W - 1 - px, py], [px, H - 1 - py], [W - 1 - px, H - 1 - py]].forEach(function (p) {
        putFood(p[0], p[1], 4); putFood(p[0] + (p[0] < W / 2 ? 1 : -1), p[1], 4);
      });
    }
    s.colonies = COLONIES.map(function (c, i) {
      var col = {
        i: i, name: c.name, short: c.short, color: c.color, style: c.style, alive: true,
        q: { x: c.qx, y: c.qy, hp: i === 0 ? 190 : 150, max: i === 0 ? 190 : 150, cd: 0 }, food: i === 0 ? 18 : 12, hatchT: 1,
        st: { dig: 1, speed: 1, shp: 1, satk: 1, wcap: 6, scap: 5, carry: 1, hatch: 1, guards: 0 },
        powers: {}, cd: {}, picks: [], rally: null, target: -1, kills: 0, out: 0
      };
      // the queen's chamber, already dug
      for (var yy = -1; yy <= 1; yy++) for (var xx = -2; xx <= 2; xx++) dig(s, c.qx + xx, c.qy + yy, i);
      return col;
    });
    s.colonies.forEach(function (c) {
      for (var k = 0; k < 3; k++) spawn(s, c, "w");
      spawn(s, c, "s");
    });
    s.offers = offer(s, 0);
    return s;
  }

  function dig(s, x, y, owner) {
    if (!inside(x, y)) return;
    var k = idx(x, y);
    if (s.cells[k] === ROCK) return;
    s.cells[k] = TUNNEL; s.owner[k] = owner; s.food[k] = 0;
    s.fieldsDirty = true; s.terrainVersion++;
  }

  function spawn(s, c, kind, at) {
    var hpBase = kind === "w" ? 10 : kind === "g" ? 30 : 20;
    var hp = kind === "w" ? hpBase : hpBase * c.st.shp;
    var a = {
      id: s.nextId++, c: c.i, kind: kind, cx: at ? at[0] : c.q.x, cy: at ? at[1] : c.q.y,
      nx: -1, ny: -1, p: 0, digp: 0, hp: hp, max: hp, cd: 0, carry: 0, fly: null,
      x: 0, y: 0, face: 1, walk: s.R() * 6, hurt: 0, slow: 0
    };
    if (!at) { a.cx += Math.round((s.R() - 0.5) * 3); a.cy += Math.round((s.R() - 0.5) * 1.5); }
    a.cx = Math.max(0, Math.min(W - 1, a.cx)); a.cy = Math.max(0, Math.min(H - 1, a.cy));
    if (s.cells[idx(a.cx, a.cy)] !== TUNNEL) { a.cx = c.q.x; a.cy = c.q.y; }
    a.x = a.cx; a.y = a.cy;
    s.ants.push(a);
    return a;
  }

  // ---- distance fields (one per target), shared by every ant heading there ----
  // Tunnels are quick to walk; soil has to be dug first, so it costs more; rock is a wall.
  function field(s, sources) {
    var d = new Float64Array(W * H).fill(1e9);
    var heap = [];
    function push(k, v) { heap.push([v, k]); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; }
    sources.forEach(function (k) { d[k] = 0; push(k, 0); });
    while (heap.length) {
      var e = pop(), v = e[0], k = e[1];
      if (v > d[k]) continue;
      var x = k % W, y = (k / W) | 0;
      for (var n = 0; n < 4; n++) {
        var xx = x + (n === 0 ? 1 : n === 1 ? -1 : 0), yy = y + (n === 2 ? 1 : n === 3 ? -1 : 0);
        if (!inside(xx, yy)) continue;
        var kk = idx(xx, yy), cell = s.cells[kk];
        if (cell === ROCK) continue;
        var cost = cell === TUNNEL ? 1 : cell === FOOD ? 1.5 : 3.2;
        if (v + cost < d[kk]) { d[kk] = v + cost; push(kk, v + cost); }
      }
    }
    return d;
  }
  function rebuildFields(s) {
    s.fields = s.colonies.map(function (c) { return field(s, [idx(c.q.x, c.q.y)]); });
    var foods = [];
    for (var k = 0; k < W * H; k++) if (s.cells[k] === FOOD) foods.push(k);
    s.foodField = foods.length ? field(s, foods) : null;
    s.rallyFields = s.colonies.map(function (c) { return c.rally ? field(s, [idx(c.rally[0], c.rally[1])]) : null; });
    s.fieldsDirty = false; s.fieldT = 0;
  }

  // ---- drafting ----
  function offer(s, ci) {
    var c = s.colonies[ci], R = s.R;
    var pool = CARDS.filter(function (cd) { return cd.kind === "up" || (c.powers[cd.id] || 0) < 3; });
    var powersLeft = pool.filter(function (cd) { return cd.kind === "power" && !c.powers[cd.id]; });
    var out = [];
    // round 1 and every other round, one of the three is a power you don't have yet
    if (powersLeft.length && (s.round === 1 || s.round % 2 === 0)) out.push(powersLeft[Math.floor(R() * powersLeft.length)]);
    while (out.length < 3) {
      var cd = pool[Math.floor(R() * pool.length)];
      if (out.indexOf(cd) < 0) out.push(cd);
    }
    // shuffle so the power isn't always first
    for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); var t = out[i]; out[i] = out[j]; out[j] = t; }
    return out.map(function (cd) { return cd.id; });
  }

  // How a colony with a given style likes each card (rivals use this, and so does the robot player).
  var LIKES = {
    fighter: { jaws: 5, tough: 5, army: 5, fire: 6, fly: 4, legs: 3, hatch: 3, workers: 2, guards: 2, jelly: 2, glue: 3, cave: 2, dig: 2, sweet: 2 },
    digger: { dig: 5, legs: 4, fly: 6, cave: 5, workers: 3, sweet: 3, army: 3, tough: 3, jaws: 3, hatch: 2, jelly: 2, guards: 2, glue: 3, fire: 4 },
    builder: { workers: 5, sweet: 5, hatch: 5, jelly: 4, guards: 4, glue: 6, army: 3, tough: 3, jaws: 3, dig: 2, legs: 2, cave: 3, fire: 4, fly: 3 },
    upgrades: { army: 6, tough: 5, jaws: 5, workers: 5, hatch: 4, jelly: 4, guards: 4, sweet: 3, legs: 3, dig: 3, fire: -9, glue: -9, cave: -9, fly: -9 },
    smart: { army: 6, tough: 5, jaws: 5, workers: 5, fire: 7, glue: 5, hatch: 4, jelly: 4, guards: 4, sweet: 3, fly: 4, cave: 3, legs: 3, dig: 3 }
  };
  function choose(s, ci, offers, style) {
    var c = s.colonies[ci], likes = LIKES[style || c.style] || LIKES.smart;
    var best = 0, bestV = -1;
    offers.forEach(function (id, i) {
      var v = (likes[id] || 1) + s.R() * 2.5;
      var n = c.picks.filter(function (p) { return p === id; }).length;
      v -= n * 1.3;                                      // variety helps
      if (id === "workers" && c.st.wcap >= 12) v -= 3;
      if (id === "jelly" && c.q.hp < c.q.max * 0.5) v += 4; // a hurt queen wants jelly
      if (CARD[id].kind === "power" && c.powers[id]) v -= 1.5;
      if (v > bestV) { bestV = v; best = i; }
    });
    return best;
  }

  function apply(s, ci, id) {
    var c = s.colonies[ci], st = c.st;
    c.picks.push(id);
    switch (id) {
      case "dig": st.dig *= 1.6; break;
      case "legs": st.speed *= 1.2; break;
      case "tough": st.shp *= 1.35; s.ants.forEach(function (a) { if (a.c === ci && a.kind !== "w") { a.max *= 1.35; a.hp *= 1.35; } }); break;
      case "jaws": st.satk *= 1.3; break;
      case "workers": st.wcap += 3; spawn(s, c, "w"); spawn(s, c, "w"); break;
      case "army": st.scap += 3; spawn(s, c, "s"); break;
      case "jelly": c.q.max += 40; c.q.hp = c.q.max; break;
      case "sweet": st.carry += 2; break;
      case "hatch": st.hatch *= 1.3; break;
      case "guards": st.guards += 2; spawn(s, c, "g"); spawn(s, c, "g"); break;
      default:
        if (CARD[id] && CARD[id].kind === "power") { c.powers[id] = (c.powers[id] || 0) + 1; c.cd[id] = 0; }
    }
    s.events.push({ type: "pick", c: ci, id: id });
  }

  // The player picks card i of their three; every rival picks too; then the battle starts.
  function pick(s, i) {
    if (s.phase !== "draft") return false;
    var mine = s.offers[i];
    if (!mine) return false;
    apply(s, 0, mine);
    var line = [];
    s.colonies.forEach(function (c) {
      if (c.i === 0 || !c.alive) return;
      var o = offer(s, c.i), id = o[choose(s, c.i, o)];
      apply(s, c.i, id);
      line.push({ c: c.i, id: id });
    });
    s.log = line;
    s.phase = "battle"; s.roundT = 0;
    chooseTargets(s);
    return true;
  }

  function aliveEnemies(s, ci) { return s.colonies.filter(function (c) { return c.alive && c.i !== ci; }); }
  function chooseTargets(s) {
    s.colonies.forEach(function (c) {
      if (!c.alive) return;
      var foes = aliveEnemies(s, c.i);
      if (!foes.length) return;
      // closest and weakest queens look tastiest; rivals don't all gang up on you
      var best = null, bv = 1e9;
      foes.forEach(function (f) {
        var dist = Math.abs(f.q.x - c.q.x) + Math.abs(f.q.y - c.q.y);
        var v = dist + f.q.hp / f.q.max * 18 + s.R() * 22;
        if (c.i !== 0 && f.i === 0) v += s.ai.mercy != null ? s.ai.mercy : 20;
        if (v < bv) { bv = v; best = f; }
      });
      c.target = best.i;
    });
  }

  // ---- powers ----
  function usePower(s, ci, id, x, y) {
    var c = s.colonies[ci];
    if (s.phase !== "battle" || !c.alive || !c.powers[id] || (c.cd[id] || 0) > 0) return false;
    x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(H - 1, y));
    var lvl = c.powers[id];
    c.cd[id] = POWER_CD[id] * (1 - 0.15 * (lvl - 1)) * (ci === 0 ? 1 : 1.6); // rivals are a bit slower to recharge
    if (id === "fire") {
      var r = 2.4 + 0.3 * lvl, dmg = 14 + 8 * lvl;
      s.ants.forEach(function (a) { if (a.c !== ci && dist2(a.x, a.y, x, y) <= r * r) hurt(s, a, dmg, ci); });
      s.fx.push({ type: "fire", x: x, y: y, r: r, t: 0, life: 1.1, c: ci });
    } else if (id === "glue") {
      var gr = 2.6 + 0.4 * lvl;
      s.glue.push({ x: x, y: y, r: gr, t: 7 + 2 * lvl, c: ci });
      s.fx.push({ type: "splat", x: x, y: y, r: gr, t: 0, life: 0.6, c: ci });
    } else if (id === "cave") {
      var cr = 2.2 + 0.3 * lvl;
      for (var yy = Math.floor(y - cr); yy <= Math.ceil(y + cr); yy++) for (var xx = Math.floor(x - cr); xx <= Math.ceil(x + cr); xx++) {
        if (!inside(xx, yy) || dist2(xx, yy, x, y) > cr * cr) continue;
        var k = idx(xx, yy);
        if (s.cells[k] !== TUNNEL) continue;
        if (s.colonies.some(function (q) { return Math.abs(q.q.x - xx) <= 2 && Math.abs(q.q.y - yy) <= 1; })) continue; // chambers hold
        s.cells[k] = SOIL; s.owner[k] = -1;
      }
      s.fieldsDirty = true; s.terrainVersion++;
      s.ants.forEach(function (a) { if (a.c !== ci && dist2(a.x, a.y, x, y) <= cr * cr) { hurt(s, a, 10 + 5 * lvl, ci); a.slow = Math.max(a.slow, 2); } });
      s.fx.push({ type: "dust", x: x, y: y, r: cr, t: 0, life: 1.2, c: ci });
    } else if (id === "fly") {
      var n = 1 + lvl;
      // scouts can't land right inside an enemy chamber: they come down a few cells away and dig in
      s.colonies.forEach(function (o) {
        if (o.i === ci || !o.alive) return;
        var dx = x - o.q.x, dy = y - o.q.y, dl = Math.sqrt(dx * dx + dy * dy);
        if (dl < 4.5) { var k = 4.5 / (dl || 1); x = o.q.x + (dl ? dx : (o.q.x < W / 2 ? 1 : -1)) * k; y = o.q.y + dy * k; }
      });
      x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(H - 1, y));
      for (var i = 0; i < n; i++) {
        var a = spawn(s, c, "s");
        a.fly = { x: x + (i - (n - 1) / 2) * 0.7, y: y, t: 0 };
      }
      s.fx.push({ type: "wind", x: c.q.x, y: c.q.y, r: 2, t: 0, life: 0.6, c: ci });
    }
    s.events.push({ type: "power", c: ci, id: id, x: x, y: y });
    return true;
  }

  // Where should a power go? Used by the rivals, the robot player and the keyboard shortcut.
  function aimPower(s, ci, id) {
    var c = s.colonies[ci], best = null, bv = 0;
    var mine = s.ants.filter(function (a) { return a.c === ci; });
    var foes = s.ants.filter(function (a) { return a.c !== ci && s.colonies[a.c].alive; });
    if (id === "fly") {
      var t = s.colonies[c.target];
      if (!t || !t.alive) return null;
      return [t.q.x + (t.q.x < W / 2 ? 2 : -2), t.q.y];
    }
    foes.forEach(function (f) {
      var v = 0;
      foes.forEach(function (g) { if (dist2(f.x, f.y, g.x, g.y) < 6) v += g.kind === "w" ? 0.6 : 1; });
      if (id !== "fire") v *= 1 + Math.max(0, 8 - Math.sqrt(dist2(f.x, f.y, c.q.x, c.q.y))) / 4; // glue and cave-in guard home
      if (id === "cave" && mine.some(function (m) { return dist2(m.x, m.y, f.x, f.y) < 5; })) v *= 0.5;
      if (v > bv) { bv = v; best = [Math.round(f.x), Math.round(f.y)]; }
    });
    return bv >= (id === "fire" ? 2.5 : 2) ? best : null;
  }

  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function hurt(s, a, dmg, by) {
    if (a.hp <= 0) return;
    a.hp -= dmg; a.hurt = 0.25;
    if (a.hp <= 0 && by >= 0) s.colonies[by].kills++;
  }

  // ---- one step of the battle ----
  function step(s, dt) {
    dt = dt || DT;
    if (s.over) return;
    s.t += dt;
    if (s.phase !== "battle") { tickFx(s, dt); return; }
    s.roundT += dt;
    s.fieldT += dt;
    if (s.fieldsDirty && s.fieldT > 0.25 || !s.fields.length) rebuildFields(s);
    var C = s.colonies;

    // hatching
    C.forEach(function (c) {
      if (!c.alive) return;
      c.hatchT -= dt * c.st.hatch;
      c.food += dt * 0.8; // the queen nibbles stored seeds: a slow trickle so nobody starves
      for (var p in c.cd) if (c.cd[p] > 0) c.cd[p] = Math.max(0, c.cd[p] - dt);
      if (c.hatchT > 0) return;
      var w = 0, so = 0, g = 0;
      s.ants.forEach(function (a) { if (a.c === c.i) { if (a.kind === "w") w++; else if (a.kind === "g") g++; else if (!a.fly) so++; } });
      var cost = 5 / Math.sqrt(c.st.hatch);
      var kind = null;
      if (g < c.st.guards) kind = "g";
      else if (w < 3 && w < c.st.wcap) kind = "w";
      else if (so < c.st.scap && (so <= w * 0.9 || w >= c.st.wcap)) kind = "s";
      else if (w < c.st.wcap) kind = "w";
      else if (so < c.st.scap) kind = "s";
      var price = kind === "w" ? cost : kind === "g" ? cost * 2 : cost * 1.5;
      if (kind && c.food >= price) { c.food -= price; spawn(s, c, kind); c.hatchT = 2.2; s.events.push({ type: "hatch", c: c.i }); }
      else c.hatchT = 0.5;
    });

    // ants
    var ants = s.ants;
    for (var i = 0; i < ants.length; i++) {
      var a = ants[i];
      if (a.hp <= 0) continue;
      var c = C[a.c];
      a.walk += dt * 8; a.hurt = Math.max(0, a.hurt - dt); a.slow = Math.max(0, a.slow - dt);
      a.cd = Math.max(0, a.cd - dt);
      var glued = s.glue.some(function (g) { return g.c !== a.c && dist2(a.x, a.y, g.x, g.y) <= g.r * g.r; });
      var spd = c.st.speed * (glued ? 0.3 : 1) * (a.slow > 0 ? 0.5 : 1);

      // fighting: bite the closest enemy in reach
      var foe = null, fd = 1.44;
      if (a.kind !== "w" || a.hurt > 0 || true) {
        for (var j = 0; j < ants.length; j++) {
          var b = ants[j];
          if (b.c === a.c || b.hp <= 0 || (b.fly && !a.fly)) continue;
          var d = dist2(a.x, a.y, b.x, b.y);
          if (d < fd) { fd = d; foe = b; }
        }
      }
      if (a.fly) {
        // flying scouts go straight over everything, then land and fight like soldiers
        var fx = a.fly.x - a.x, fy = a.fly.y - a.y, fl = Math.sqrt(fx * fx + fy * fy);
        var fs = 5 * dt;
        if (fl <= fs) {
          a.x = a.fly.x; a.y = a.fly.y; a.cx = Math.round(a.x); a.cy = Math.round(a.y);
          a.cx = Math.max(0, Math.min(W - 1, a.cx)); a.cy = Math.max(0, Math.min(H - 1, a.cy));
          var lk = idx(a.cx, a.cy);
          if (s.cells[lk] !== TUNNEL) { dig(s, a.cx, a.cy, a.c); }
          a.x = a.cx; a.y = a.cy; a.fly = null; a.nx = -1; a.p = 0;
        } else { a.x += fx / fl * fs; a.y += fy / fl * fs; a.face = fx >= 0 ? 1 : -1; }
        continue;
      }
      var atk = a.kind === "w" ? 1.5 : a.kind === "g" ? 6 * c.st.satk : 4.5 * c.st.satk;
      if (foe && (a.kind !== "w" || fd < 0.7)) {
        if (a.cd <= 0) { hurt(s, foe, atk, a.c); a.cd = glued ? 2.2 : 0.8; s.events.push({ type: "bite", c: a.c, x: a.x, y: a.y }); }
        a.face = foe.x >= a.x ? 1 : -1;
        continue;
      }
      // biting an enemy queen in her chamber
      if (a.kind === "s") {
        var qhit = null;
        for (var q = 0; q < C.length; q++) {
          var Q = C[q];
          if (Q.i !== a.c && Q.alive && dist2(a.x, a.y, Q.q.x, Q.q.y) <= 1.6) { qhit = Q; break; }
        }
        if (qhit) {
          if (a.cd <= 0) {
            qhit.q.hp -= atk; a.cd = glued ? 2.2 : 0.8;
            s.events.push({ type: "queenbite", c: a.c, q: qhit.i });
            if (qhit.q.hp <= 0) knockOut(s, qhit, a.c);
          }
          a.face = qhit.q.x >= a.x ? 1 : -1;
          continue;
        }
      }

      // where to go
      var fieldMap = null, goal = null;
      if (a.kind === "w") {
        if (a.carry > 0 || !s.foodField) fieldMap = s.fields[a.c];
        else fieldMap = s.foodField;
      } else if (a.kind === "g") {
        fieldMap = s.fields[a.c];
      } else {
        if (c.rally && s.rallyFields[a.c]) fieldMap = s.rallyFields[a.c];
        else if (c.target >= 0 && C[c.target].alive) fieldMap = s.fields[c.target];
        else {
          var foes2 = aliveEnemies(s, a.c);
          if (foes2.length) { c.target = foes2[0].i; fieldMap = s.fields[c.target]; }
        }
      }
      if (!fieldMap) continue;

      if (a.nx < 0) {
        var here = fieldMap[idx(a.cx, a.cy)];
        // arrived?
        if (here === 0) {
          if (a.kind === "w" && a.carry > 0) { c.food += a.carry; a.carry = 0; s.events.push({ type: "food", c: a.c }); }
          if (a.kind === "g" || (a.kind === "s" && c.rally)) {
            // wander about near the spot
            var wx = a.cx + (s.R() < 0.5 ? -1 : 1), wy = a.cy;
            if (inside(wx, wy) && s.cells[idx(wx, wy)] === TUNNEL && s.R() < 0.05) { a.nx = wx; a.ny = wy; a.p = 0; }
            continue;
          }
        }
        if (a.kind === "g" && here <= 3 && s.R() > 0.03) continue; // guards stay close
        // pick the neighbour that's closest to the goal
        var bx = -1, by = -1, bv = here, opts = [];
        for (var n = 0; n < 4; n++) {
          var xx = a.cx + (n === 0 ? 1 : n === 1 ? -1 : 0), yy = a.cy + (n === 2 ? 1 : n === 3 ? -1 : 0);
          if (!inside(xx, yy)) continue;
          var v = fieldMap[idx(xx, yy)];
          if (v < bv - 0.01) { bv = v; opts = [[xx, yy]]; } else if (Math.abs(v - bv) < 0.01 && opts.length) opts.push([xx, yy]);
        }
        if (!opts.length) continue;
        var o = opts[Math.floor(s.R() * opts.length)];
        bx = o[0]; by = o[1];
        var k = idx(bx, by), cell = s.cells[k];
        if (cell === FOOD) {
          if (a.kind === "w" && a.carry === 0) {
            var take = Math.min(c.st.carry, s.food[k]);
            s.food[k] -= take; a.carry = take;
            if (s.food[k] <= 0) dig(s, bx, by, a.c); else s.terrainVersion++;
            s.events.push({ type: "grab", c: a.c });
            continue;
          }
          // soldiers walk through food pockets by eating them away
          a.digp += dt * 1.5; if (a.digp >= 1) { a.digp = 0; c.food += s.food[k] * 0.5; dig(s, bx, by, a.c); }
          continue;
        }
        if (cell === SOIL) {
          var rate = (a.kind === "w" ? 1.1 : 0.95) * c.st.dig * (glued ? 0.3 : 1);
          a.digp += dt * rate;
          a.face = bx >= a.cx ? 1 : -1;
          if (a.digp >= 1) { a.digp = 0; dig(s, bx, by, a.c); s.events.push({ type: "dig", c: a.c, x: bx, y: by }); }
          continue;
        }
        a.nx = bx; a.ny = by; a.p = 0;
      }
      if (a.nx >= 0) {
        if (s.cells[idx(a.nx, a.ny)] !== TUNNEL) { a.nx = -1; a.p = 0; a.x = a.cx; a.y = a.cy; continue; } // caved in under us
        a.p += dt * (a.kind === "w" ? 2.4 : a.kind === "g" ? 1.8 : 2.1) * spd;
        a.face = a.nx > a.cx ? 1 : a.nx < a.cx ? -1 : a.face;
        if (a.p >= 1) { a.cx = a.nx; a.cy = a.ny; a.nx = -1; a.p = 0; a.x = a.cx; a.y = a.cy; }
        else { a.x = a.cx + (a.nx - a.cx) * a.p; a.y = a.cy + (a.ny - a.cy) * a.p; }
      }
    }

    // queens bite back at ants in their chamber
    C.forEach(function (c) {
      if (!c.alive) return;
      c.q.cd = Math.max(0, c.q.cd - dt);
      if (c.q.cd > 0) return;
      for (var i = 0; i < ants.length; i++) {
        var a = ants[i];
        if (a.c !== c.i && a.hp > 0 && !a.fly && dist2(a.x, a.y, c.q.x, c.q.y) <= 2.3) { hurt(s, a, 7, c.i); c.q.cd = 1; break; }
      }
    });

    // the fallen
    for (i = ants.length - 1; i >= 0; i--) {
      if (ants[i].hp <= 0) {
        var dead = ants[i];
        s.fx.push({ type: "poof", x: dead.x, y: dead.y, r: 0.6, t: 0, life: 0.5, c: dead.c });
        if (dead.carry) { var dk = idx(dead.cx, dead.cy); /* the crumb is lost in the dirt */ }
        ants.splice(i, 1);
        s.events.push({ type: "die", c: dead.c });
      }
    }
    s.glue = s.glue.filter(function (g) { g.t -= dt; return g.t > 0; });
    tickFx(s, dt);

    // rivals use their powers when they're ready
    C.forEach(function (c) {
      if (!c.alive || (c.i === 0 && !s.ai.player)) return;
      if (s.R() > (c.i === 0 ? 0.03 : 0.015)) return;
      POWERS.forEach(function (id) {
        if (!c.powers[id] || c.cd[id] > 0) return;
        var at = aimPower(s, c.i, id);
        if (at) usePower(s, c.i, id, at[0], at[1]);
      });
    });

    if (!s.over && s.roundT >= ROUND_T) endRound(s);
  }

  function tickFx(s, dt) {
    s.fx = s.fx.filter(function (f) { f.t += dt; return f.t < f.life; });
  }

  function knockOut(s, c, by) {
    c.alive = false; c.q.hp = 0;
    var aliveCount = s.colonies.filter(function (x) { return x.alive; }).length;
    c.out = aliveCount + 1; // its place
    s.place.push(c.i);
    s.ants.forEach(function (a) { if (a.c === c.i) { a.hp = 0; } });
    s.fx.push({ type: "boom", x: c.q.x, y: c.q.y, r: 3, t: 0, life: 1.6, c: c.i });
    s.events.push({ type: "out", c: c.i, by: by });
    if (c.rally) c.rally = null;
    s.colonies.forEach(function (o) { if (o.target === c.i) o.target = -1; });
    chooseTargets(s);
    if (!s.colonies[0].alive) { s.over = true; s.winner = -1; s.phase = "over"; s.events.push({ type: "lose" }); }
    else if (aliveCount === 1) { s.over = true; s.winner = 0; s.colonies[0].out = 1; s.phase = "over"; s.events.push({ type: "win" }); }
  }

  function endRound(s) {
    s.round++;
    s.colonies.forEach(function (c) {
      if (!c.alive) return;
      c.food += 4 + s.round * 2;
      c.q.hp = Math.min(c.q.max, c.q.hp + c.q.max * (s.round > 9 ? 0 : 0.1));
      if (s.round > 12) c.q.hp = Math.max(1, c.q.hp - c.q.max * 0.2); // a crowded farm: tired queens
    });
    // later rounds: everyone gets stronger, so battles get bigger and nothing drags on forever
    if (s.round > 5) s.colonies.forEach(function (c) { c.st.scap += 1; c.st.satk *= s.round > 9 ? 1.2 : 1.06; c.st.dig *= s.round > 9 ? 1.15 : 1; });
    s.phase = "draft";
    s.offers = offer(s, 0);
    s.events.push({ type: "round", round: s.round });
  }

  function setRally(s, ci, x, y) {
    var c = s.colonies[ci];
    if (x === null) { c.rally = null; s.fieldsDirty = true; return null; }
    x = Math.max(0, Math.min(W - 1, Math.round(x))); y = Math.max(0, Math.min(H - 1, Math.round(y)));
    // tapping an enemy nest means "attack them": target their queen, no flag needed
    var hit = s.colonies.find(function (o) { return o.alive && Math.abs(o.q.x - x) <= 3 && Math.abs(o.q.y - y) <= 2; });
    if (hit && hit.i !== ci) { c.target = hit.i; c.rally = null; s.fieldsDirty = true; return { attack: hit.i }; }
    if (s.cells[idx(x, y)] === ROCK) return null;
    c.rally = [x, y]; s.fieldsDirty = true;
    return { rally: [x, y] };
  }

  root.AFW = {
    W: W, H: H, DT: DT, ROUND_T: ROUND_T, SOIL: SOIL, TUNNEL: TUNNEL, ROCK: ROCK, FOOD: FOOD,
    COLONIES: COLONIES, CARDS: CARDS, CARD: CARD, POWERS: POWERS, POWER_CD: POWER_CD, LIKES: LIKES,
    rng: rng, create: create, step: step, pick: pick, choose: choose, usePower: usePower,
    aimPower: aimPower, setRally: setRally, idx: idx
  };
})(typeof window !== "undefined" ? window : globalThis);
