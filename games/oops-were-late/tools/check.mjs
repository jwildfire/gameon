// Proves every Oops! We're Late! room can be done, by letting the robot sneaker (bot.js)
// play each one through the real engine with lots of different kid moods.
// Run from the repo root: node games/oops-were-late/tools/check.mjs [runs per room]
// It fails (exit 1) if any run doesn't reach the seat, and prints the stars and times, so
// you can see the rooms get trickier.
import "../engine.js";
import "../bot.js";

const E = globalThis.OWL, B = globalThis.OWLBot;
const runs = Number(process.argv[2] || 12);
// a second pass plays like a person: a bit slow to spot the teacher looking up or a kid wriggling
const REACT = Number(process.argv[3] || 0);
let bad = 0;
for (let n = 1; n <= E.ROOMS.length; n++) {
  const res = [];
  for (let seed = 1; seed <= runs; seed++) res.push(B.run(n, seed, 240, REACT));
  const won = res.filter(r => r.won);
  const avg = k => Math.round(res.reduce((a, r) => a + r[k], 0) / res.length * 10) / 10;
  const three = won.filter(r => r.stars === 3).length;
  if (won.length < runs) bad++;
  console.log(`room ${n} ${E.ROOMS[n - 1].name.padEnd(20)} made it ${won.length}/${runs}  3-star ${three}/${runs}  stars avg ${avg("stars")}  time avg ${avg("t")}s (min ${Math.min(...res.map(r => r.t))}, frozen avg ${avg("frozen")}s)  creaks ${avg("creaks")} squeaks ${avg("squeaks")} cries ${avg("cries")}` +
    (won.length < runs ? "  MISSED: " + res.filter(r => !r.won).map(r => `seed ${res.indexOf(r) + 1} ${r.lost ? "spotted by " + r.by : "stuck"} at ${r.x},${r.y} t ${r.t}`).join("; ") : ""));
}
process.exit(bad ? 1 : 0);
