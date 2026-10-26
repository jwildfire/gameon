// The robot cook: plays a shift through the engine the way a careful kid would, one tap at a
// time. tools/check.mjs uses it to prove every shift can be beaten, the evidence uses it to
// play every shift in the real game, and the title screen lets it cook behind the menu.
(function (root) {
  "use strict";
  var E = root.DBS;

  function isPrefix(a, b) {
    if (a.length > b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  // Pick the ticket to work on: one the plate is already on its way to, or else the most
  // impatient devil's next burger.
  function pick(st) {
    var p = st.plate.layers, best = null;
    st.slots.forEach(function (d, i) {
      if (!E.waiting(d)) return;
      d.orders.forEach(function (o) {
        if (o.done) return;
        var on = p.length > 0 && isPrefix(p, o.layers);
        var score = (on ? -1000 : 0) + d.patience;
        if (!best || score < best.score) best = { slot: i, order: o, score: score };
      });
    });
    return best;
  }

  // The next tap, or null when there's nothing to do.
  function next(st, rng, mistakes) {
    var job = pick(st);
    if (!job) return st.plate.layers.length ? { type: "trash" } : null;
    var p = st.plate, o = job.order;
    if (mistakes && rng && rng() < mistakes) {
      var all = E.INGREDIENTS;
      return { type: "add", id: all[Math.floor(rng() * all.length)].id, oops: true };
    }
    if (!isPrefix(p.layers, o.layers)) return p.layers.length > 2 ? { type: "trash" } : { type: "undo" };
    if (p.layers.length < o.layers.length) return { type: "add", id: o.layers[p.layers.length] };
    if (p.sauce !== o.sauce) return { type: "sauce", id: o.sauce };
    return { type: "serve", slot: job.slot };
  }

  function act(st, a) {
    if (!a) return;
    if (a.type === "add") E.add(st, a.id);
    else if (a.type === "sauce") E.sauce(st, a.id);
    else if (a.type === "undo") E.undo(st);
    else if (a.type === "trash") E.trash(st);
    else if (a.type === "serve") E.serve(st, a.slot);
  }

  // Play shift n headless. tap is seconds between taps (a quick kid is about 0.5).
  function run(n, seed, tap, mistakes) {
    var st = E.newShift(n, seed), dt = 1 / 30, timer = 0, botSeed = (seed || 1) * 31 + 7;
    var rng = function () { botSeed = (botSeed * 1103515245 + 12345) % 2147483648; return botSeed / 2147483648; };
    while ((st.mode === "play" || st.mode === "ending") && st.t < 900) {
      E.step(st, dt);
      st.events.length = 0;
      timer -= dt;
      if (timer <= 0 && st.mode === "play") { act(st, next(st, rng, mistakes)); timer = tap; }
    }
    return { won: st.mode === "clear", coins: st.coins, par: st.par, steam: st.steam, perfect: st.perfect, meh: st.meh,
      t: Math.round(st.t), stars: E.stars(st), bestCombo: st.bestCombo, total: st.total };
  }

  root.DBSBot = { next: next, act: act, run: run };
})(typeof window !== "undefined" ? window : globalThis);
