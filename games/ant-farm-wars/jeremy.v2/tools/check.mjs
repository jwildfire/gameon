// Tests the balance of Ant Farm Wars by letting the robot player (bot.js) play whole games
// through the real engine, with sensible picks and with random picks.
// Run from the repo root: node games/ant-farm-wars/tools/check.mjs [games per style]
// It fails (exit 1) if a sensible robot wins less than half its games, or if any game
// doesn't finish within 20 rounds.
import "../engine.js";
import "../bot.js";

const B = globalThis.AFWBot;
const n = Number(process.argv[2] || 30);
let bad = 0;
for (const [label, style, powers] of [["sensible picks, uses powers", "smart", true], ["sensible upgrades, no powers", "upgrades", false], ["random picks, uses powers", "random", true]]) {
  const res = [];
  for (let seed = 1; seed <= n; seed++) res.push(B.run(seed, style, powers));
  const won = res.filter(r => r.won).length;
  const unfinished = res.filter(r => !r.over).length;
  const places = [1, 2, 3, 4].map(p => res.filter(r => r.place === p).length);
  const avg = k => Math.round(res.reduce((a, r) => a + r[k], 0) / res.length * 10) / 10;
  console.log(`${label.padEnd(36)} won ${won}/${n}  places 1st-4th ${places.join("/")}  rounds avg ${avg("rounds")}  time avg ${avg("t")}s  unfinished ${unfinished}`);
  if (unfinished) bad++;
  if (style === "smart" && powers && won < n / 2) bad++;
}
process.exit(bad ? 1 : 0);
