// Proves every Devil's Burger Station shift can be beaten, by letting the robot cook (bot.js)
// play each one through the real engine at a few speeds and with some slips of the finger.
// Run from the repo root: node games/devils-burger-station/tools/check.mjs [seeds per shift]
// It fails (exit 1) if a careful cook (0.6 s a tap, a few wrong taps) loses any shift, and
// prints how close the slower cooks get, so you can see the shifts ramp up.
import "../engine.js";
import "../bot.js";

const E = globalThis.DBS, B = globalThis.DBSBot;
const seeds = Number(process.argv[2] || 10);
const cooks = [
  { name: "quick", tap: 0.45, oops: 0 },
  { name: "careful", tap: 0.6, oops: 0.05, must: true },
  { name: "slow", tap: 0.8, oops: 0.08 },
  { name: "very slow", tap: 1.0, oops: 0.1 }
];
let bad = 0;
for (let n = 1; n <= E.SHIFTS.length; n++) {
  const S = E.SHIFTS[n - 1];
  const parts = [];
  for (const c of cooks) {
    const res = [];
    for (let seed = 1; seed <= seeds; seed++) res.push(B.run(n, seed, c.tap, c.oops));
    const won = res.filter(r => r.won).length;
    const avg = k => Math.round(res.reduce((a, r) => a + r[k], 0) / res.length * 10) / 10;
    if (c.must && won < seeds) bad++;
    parts.push(`${c.name} won ${won}/${seeds} steam ${avg("steam")} stars ${avg("stars")} coins ${avg("coins")}/${res[0].par} t ${avg("t")}s`);
  }
  console.log(`shift ${n} ${S.name.padEnd(24)} ${parts.join(" | ")}`);
}
process.exit(bad ? 1 : 0);
