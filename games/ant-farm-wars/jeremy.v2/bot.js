// A robot player for Ant Farm Wars: it picks cards the way a sensible kid might and fires
// its powers at the biggest bunch of enemies. tools/check.mjs uses it to test the balance,
// and the title screen lets it play a demo farm behind the menu.
(function (root) {
  "use strict";
  var E = root.AFW;

  // style: "smart" (sensible picks), "random" (any card) or a rival style.
  // powers: true to use powers like a player who taps them as soon as they're ready.
  function run(seed, style, powers, maxRounds) {
    var s = E.create(seed, { ai: { player: powers !== false } });
    maxRounds = maxRounds || 20;
    var guard = 0;
    while (!s.over && s.round <= maxRounds && guard++ < 1e6) {
      if (s.phase === "draft") {
        var i = style === "random" ? Math.floor(s.R() * 3) : E.choose(s, 0, s.offers, style || "smart");
        E.pick(s, i);
      } else E.step(s);
    }
    return {
      won: s.winner === 0, place: s.colonies[0].out || (s.over ? 0 : 0), rounds: s.round, t: Math.round(s.t),
      over: s.over, alive: s.colonies.filter(function (c) { return c.alive; }).map(function (c) { return c.short; }),
      picks: s.colonies[0].picks.slice()
    };
  }

  root.AFWBot = { run: run };
})(typeof window !== "undefined" ? window : globalThis);
