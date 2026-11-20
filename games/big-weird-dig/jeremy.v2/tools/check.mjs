// Proves every Big Weird Dig level can be beaten, by letting the robot driver (bot.js)
// play each one through the real engine with lots of different mole moods.
// Run from the repo root: node games/big-weird-dig/tools/check.mjs [runs per level]
// It fails (exit 1) if any run doesn't clear its level, and prints the fuel left, so you
// can see the levels get tighter as they go deeper.
import "../engine.js";
import "../bot.js";

const E = globalThis.BWD, B = globalThis.BWDBot;
const runs = Number(process.argv[2] || 12);
let bad = 0;
for (let n = 1; n <= E.LEVELS.length; n++) {
  const res = [];
  for (let seed = 1; seed <= runs; seed++) res.push(B.run(n, seed, 300));
  const won = res.filter(r => r.won).length, fuels = res.filter(r => r.won).map(r => r.fuel);
  const avg = k => Math.round(res.reduce((a, r) => a + r[k], 0) / res.length * 10) / 10;
  if (won < runs) bad++;
  console.log(`level ${n} ${E.LEVELS[n - 1].name.padEnd(22)} won ${won}/${runs}  fuel left min ${Math.min(...fuels)} avg ${avg("fuel")}  time avg ${avg("t")}s  bonks avg ${avg("bonks")}  boulder-bonked moles ${avg("moleBonks")}` +
    (won < runs ? "  LOST: " + res.filter(r => !r.won).map(r => `seed ${res.indexOf(r) + 1} got ${r.got}/${r.of} t ${r.t}`).join(", ") : ""));
}
process.exit(bad ? 1 : 0);
