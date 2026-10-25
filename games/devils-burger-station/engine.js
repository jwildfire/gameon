// Devil's Burger Station: the whole burger counter. Shifts, devils, tickets, the plate,
// patience, tips and combos. There's no drawing, sound or clock in here, so the same code
// runs in the game, in the robot cook (bot.js) and in the shift checker (tools/check.mjs).
(function (root) {
  "use strict";

  // The 8 ingredients and 3 hot sauces, with the keys that pick them.
  var INGREDIENTS = [
    { id: "bun", name: "Bun", key: "1" },
    { id: "patty", name: "Patty", key: "2" },
    { id: "cheese", name: "Cheese", key: "3" },
    { id: "lettuce", name: "Lettuce", key: "4" },
    { id: "tomato", name: "Tomato", key: "5" },
    { id: "onion", name: "Onion", key: "6" },
    { id: "pickles", name: "Pickles", key: "7" },
    { id: "peppers", name: "Peppers", key: "8" }
  ];
  var SAUCES = [
    { id: "mild", name: "Mild", key: "M" },
    { id: "fiery", name: "Fiery", key: "F" },
    { id: "lava", name: "LAVA", key: "L" }
  ];
  var TOPPINGS = ["cheese", "lettuce", "tomato", "onion", "pickles", "peppers"];
  var MAX_LAYERS = 10, MAX_STEAM = 3;
  var WALK_IN = 0.7, LEAVE = 1.4;
  var NAMES = ["Sizzle", "Pokey", "Ember", "Toasty", "Fizz", "Cinders", "Spork", "Blip", "Smudge", "Tater",
    "Noodle", "Puff", "Sparky", "Wiggles", "Crispin", "Dottie", "Mo", "Flick", "Gus", "Pip", "Zippy", "Bean"];
  var HUES = ["#ef4b32", "#e8362f", "#f2603a", "#e04466", "#d93a26", "#f0553f"];

  // Five shifts, each a little busier. patience is seconds at the counter before a devil
  // gets steaming mad; gap is seconds between devils walking up.
  var SHIFTS = [
    { name: "Breakfast Burgers", devils: 6, slots: 2, gap: 6, first: 1.2, patience: 46, tops: [0, 1], pool: 3, sauces: 2, fussy: 0, doubles: 0, doublePatty: 0, boss: false,
      intro: "Little devils want burgers! Stack each burger just like its ticket, from the bottom bun up, then squirt on the right hot sauce. Never forget the hot sauce, or the devil gets steaming mad!" },
    { name: "Lunch Rush", devils: 8, slots: 2, gap: 5, first: 1, patience: 42, tops: [1, 2], pool: 5, sauces: 3, fussy: 0, doubles: 0, doublePatty: 0, boss: false,
      intro: "Lunch Rush! More toppings, more devils, and now LAVA sauce too. Fast, perfect burgers get the biggest tips." },
    { name: "Fussy Afternoon", devils: 10, slots: 3, gap: 4.5, first: 1, patience: 40, tops: [1, 3], pool: 6, sauces: 3, fussy: 0.3, doubles: 0, doublePatty: 0.15, boss: false,
      intro: "Three devils at the counter now. Fussy devils in bow ties want extra toppings and they're impatient, but they tip big!" },
    { name: "Double Trouble Dinner", devils: 11, slots: 3, gap: 4, first: 1, patience: 38, tops: [1, 3], pool: 6, sauces: 3, fussy: 0.3, doubles: 0.3, doublePatty: 0.2, boss: false,
      intro: "Double Trouble! Some devils order TWO burgers on one ticket. Make them one at a time and serve each one." },
    { name: "Big Boss Midnight Feast", devils: 12, slots: 3, gap: 3.5, first: 1, patience: 36, tops: [2, 3], pool: 6, sauces: 3, fussy: 0.35, doubles: 0.3, doublePatty: 0.25, boss: true,
      intro: "The busiest shift in the underworld. And at the very end... Big Boss Blaze wants the two biggest burgers ever stacked." }
  ];

  function rngFrom(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

  function makeOrder(rng, S, fussy, boss) {
    var n = pickInt(rng, S.tops[0], S.tops[1]) + (fussy ? 1 : 0) + (boss ? 2 : 0);
    var pool = TOPPINGS.slice(0, S.pool);
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
    var tops = pool.slice(0, Math.min(n, pool.length));
    var layers = ["bun", "patty"];
    if (boss || rng() < S.doublePatty) layers.push("patty");
    layers = layers.concat(tops);
    layers.push("bun");
    var sauce = boss ? (rng() < 0.6 ? "lava" : "fiery") : SAUCES[Math.floor(rng() * S.sauces)].id;
    return { layers: layers, sauce: sauce, done: false };
  }

  function price(order, devil) { return (2 + order.layers.length) * (devil && devil.boss ? 2 : 1); }

  // Everything that walks up to the counter in shift n, made from a seed so a shift can be
  // played again exactly (the checker and the evidence use fixed seeds).
  function makeDevils(n, seed) {
    var S = SHIFTS[n - 1], rng = rngFrom(seed * 7919 + n * 104729), list = [];
    var names = NAMES.slice();
    for (var i = 0; i < S.devils; i++) {
      var fussy = i > 0 && rng() < S.fussy;
      var double = i > 1 && rng() < S.doubles;
      var orders = [makeOrder(rng, S, fussy, false)];
      if (double) orders.push(makeOrder(rng, S, false, false));
      var nm = names.splice(Math.floor(rng() * names.length), 1)[0];
      var pat = S.patience * (fussy ? 0.78 : 1) * (double ? 1.65 : 1);
      list.push({ name: nm, hue: HUES[Math.floor(rng() * HUES.length)], fussy: fussy, boss: false, orders: orders, patience: pat });
    }
    if (S.boss) {
      list.push({ name: "Big Boss Blaze", hue: "#d92b1e", fussy: false, boss: true,
        orders: [makeOrder(rng, S, false, true), makeOrder(rng, S, false, true)], patience: S.patience * 2.4 });
    }
    return list;
  }

  function parFor(devils) {
    var par = 0;
    devils.forEach(function (d) {
      d.orders.forEach(function (o) { par += price(o, d) + 8 + (d.fussy ? 6 : 0) + (d.boss ? 12 : 0); });
    });
    return par;
  }

  function newShift(n, seed) {
    var S = SHIFTS[n - 1];
    if (!S) throw new Error("no shift " + n);
    seed = seed == null ? 1 : seed;
    var devils = makeDevils(n, seed);
    var slots = [];
    for (var i = 0; i < S.slots; i++) slots.push(null);
    return {
      shift: n, S: S, seed: seed, t: 0, mode: "play", endAt: 0,
      queue: devils.slice(), total: devils.length, par: parFor(devils),
      slots: slots, nextArrival: S.first, nextId: 1,
      plate: { layers: [], sauce: null, hist: [] },
      coins: 0, tips: 0, steam: 0, combo: 0, bestCombo: 0,
      served: 0, perfect: 0, meh: 0, mad: 0, done: 0,
      selected: -1, events: []
    };
  }

  function emit(st, ev) { ev.t = st.t; st.events.push(ev); }
  function waiting(d) { return d && (d.state === "wait" || d.state === "walkin"); }
  function sameLayers(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function spawn(st) {
    var spec = st.queue[0], free = [];
    st.slots.forEach(function (d, i) { if (!d) free.push(i); });
    if (!free.length) return false;
    var slot;
    if (spec.boss) {
      if (free.length < st.slots.length) return false; // the boss waits for an empty counter
      slot = Math.floor(st.slots.length / 2);
    } else {
      slot = free[(st.nextId * 5) % free.length];
    }
    st.queue.shift();
    var d = {
      id: st.nextId++, name: spec.name, hue: spec.hue, fussy: spec.fussy, boss: spec.boss,
      orders: spec.orders.map(function (o) { return { layers: o.layers.slice(), sauce: o.sauce, done: false }; }),
      patience: spec.patience, maxPatience: spec.patience,
      state: "walkin", since: st.t, slot: slot, reason: null
    };
    st.slots[slot] = d;
    emit(st, { type: d.boss ? "boss" : "arrive", slot: slot, devil: d });
    return true;
  }

  function leave(st, d, state, reason) {
    d.state = state; d.since = st.t; d.reason = reason || null;
    st.done++;
    if (state === "mad") {
      st.mad++; st.steam++; st.combo = 0;
      if (st.steam >= MAX_STEAM && st.mode === "play") { st.mode = "ending"; st.endAt = st.t + LEAVE + 0.2; st.result = "fail"; }
    }
  }

  function step(st, dt) {
    st.t += dt;
    if (st.mode === "ending") {
      if (st.t >= st.endAt) { st.mode = st.result; emit(st, { type: st.result }); }
      return;
    }
    if (st.mode !== "play") return;
    for (var i = 0; i < st.slots.length; i++) {
      var d = st.slots[i];
      if (!d) continue;
      if (d.state === "walkin" && st.t - d.since >= WALK_IN) { d.state = "wait"; d.since = st.t; }
      if (d.state === "wait") {
        d.patience -= dt;
        if (d.patience <= 0) {
          d.patience = 0;
          leave(st, d, "mad", "slow");
          emit(st, { type: "mad", slot: i, reason: "slow", devil: d });
        }
      } else if (d.state !== "walkin" && st.t - d.since >= LEAVE) {
        st.slots[i] = null;
        st.nextArrival = Math.max(st.nextArrival, st.t + 0.6);
      }
    }
    if (st.queue.length && st.t >= st.nextArrival && spawn(st)) st.nextArrival = st.t + st.S.gap;
    if (st.mode === "play" && !st.queue.length && st.slots.every(function (d) { return !d; })) {
      st.mode = "ending"; st.endAt = st.t + 0.4; st.result = "clear";
    }
  }

  // ---- what the cook does ----

  function add(st, id) {
    if (st.mode !== "play") return false;
    if (st.plate.layers.length >= MAX_LAYERS) { emit(st, { type: "full" }); return false; }
    st.plate.layers.push(id);
    st.plate.hist.push({ kind: "layer" });
    emit(st, { type: "add", id: id });
    return true;
  }

  function sauce(st, id) {
    if (st.mode !== "play") return false;
    if (!st.plate.layers.length) { emit(st, { type: "nosaucebase" }); return false; }
    st.plate.hist.push({ kind: "sauce", prev: st.plate.sauce });
    st.plate.sauce = id;
    emit(st, { type: "sauce", id: id });
    return true;
  }

  function undo(st) {
    if (st.mode !== "play") return false;
    var h = st.plate.hist.pop();
    if (!h) return false;
    if (h.kind === "layer") st.plate.layers.pop(); else st.plate.sauce = h.prev;
    emit(st, { type: "undo" });
    return true;
  }

  function trash(st) {
    if (st.mode !== "play" || !st.plate.layers.length) return false;
    st.plate = { layers: [], sauce: null, hist: [] };
    emit(st, { type: "trash" });
    return true;
  }

  // Which devil a burger goes to when you press Serve without tapping one: whoever ordered
  // exactly this burger, then whoever ordered this stack (with some other sauce), then the
  // devil you picked with the arrow keys, then whoever has waited longest.
  function target(st) {
    var p = st.plate, best = -1, rank = 9;
    st.slots.forEach(function (d, i) {
      if (!waiting(d)) return;
      d.orders.forEach(function (o) {
        if (o.done) return;
        var r = sameLayers(o.layers, p.layers) ? (o.sauce === p.sauce ? 0 : 1) : 9;
        if (r < rank) { rank = r; best = i; }
      });
    });
    if (best >= 0) return best;
    if (waiting(st.slots[st.selected])) return st.selected;
    var oldest = -1;
    st.slots.forEach(function (d, i) { if (waiting(d) && (oldest < 0 || d.id < st.slots[oldest].id)) oldest = i; });
    return oldest;
  }

  function select(st, dir) {
    var n = st.slots.length, i = st.selected < 0 ? target(st) : st.selected;
    if (i < 0) i = 0;
    for (var k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (waiting(st.slots[i])) { st.selected = i; return i; }
    }
    return st.selected;
  }

  function serve(st, slot) {
    if (st.mode !== "play") return null;
    var p = st.plate;
    if (!p.layers.length) { emit(st, { type: "noburger" }); return null; }
    if (slot == null || !waiting(st.slots[slot])) slot = target(st);
    var d = st.slots[slot];
    if (!waiting(d)) { emit(st, { type: "nobody" }); return null; }
    var open = d.orders.filter(function (o) { return !o.done; });
    var stack = open.filter(function (o) { return sameLayers(o.layers, p.layers); });
    var exact = stack.filter(function (o) { return o.sauce === p.sauce; })[0];
    var bySauce = open.filter(function (o) { return o.sauce === p.sauce; })[0];
    var res;
    if (exact) {
      exact.done = true;
      st.combo++; st.bestCombo = Math.max(st.bestCombo, st.combo);
      var mult = st.combo >= 6 ? 3 : st.combo >= 3 ? 2 : 1;
      var tip = (Math.round(4 * d.patience / d.maxPatience) + (d.fussy ? 3 : 0) + (d.boss ? 6 : 0)) * mult;
      var pay = price(exact, d);
      st.coins += pay + tip; st.tips += tip; st.perfect++;
      res = { type: "perfect", pay: pay, tip: tip, mult: mult, combo: st.combo };
    } else if (bySauce && p.sauce) {
      // the right hot sauce on the wrong burger: grumbly, but it's spicy, so they pay a bit
      bySauce.done = true;
      st.combo = 0; st.meh++;
      var half = Math.ceil(price(bySauce, d) / 2);
      st.coins += half;
      res = { type: "meh", pay: half, tip: 0 };
    } else {
      var want = (stack[0] || open[0]).sauce;
      res = { type: "mad", reason: p.sauce ? "wrongsauce" : "nosauce", want: want, pay: 0, tip: 0 };
    }
    st.served++;
    st.plate = { layers: [], sauce: null, hist: [] };
    res.slot = slot; res.devil = d;
    if (res.type === "mad") {
      leave(st, d, "mad", res.reason);
    } else if (d.orders.every(function (o) { return o.done; })) {
      leave(st, d, res.type === "perfect" && !d.orders.some(function (o) { return o.meh; }) ? "happy" : "meh");
    } else {
      d.patience = Math.min(d.maxPatience, d.patience + 6); // one down, one to go
    }
    if (res.type === "meh") (bySauce.meh = true);
    if (st.selected === slot) st.selected = -1;
    emit(st, res);
    return res;
  }

  function stars(st) {
    if (st.mode !== "clear") return 0;
    var f = st.coins / st.par;
    return f >= 0.85 ? 3 : f >= 0.55 ? 2 : 1;
  }

  root.DBS = {
    INGREDIENTS: INGREDIENTS, SAUCES: SAUCES, SHIFTS: SHIFTS, MAX_STEAM: MAX_STEAM, MAX_LAYERS: MAX_LAYERS,
    WALK_IN: WALK_IN, LEAVE: LEAVE,
    newShift: newShift, step: step, add: add, sauce: sauce, undo: undo, trash: trash, serve: serve,
    target: target, select: select, stars: stars, price: price, sameLayers: sameLayers, waiting: waiting
  };
})(typeof window !== "undefined" ? window : globalThis);
