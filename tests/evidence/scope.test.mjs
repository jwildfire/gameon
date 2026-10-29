// Unit checks for scope.mjs: node --test tests/evidence/scope.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { specScope, changedEntries, decide } from "./scope.mjs";

const slugs = new Set(["big-weird-dig", "pet-wash-payback", "mazeathon", "ant-farm-wars", "trampoline-battle"]);
const specs = new Map([
  ["46-evidence-framework.spec.mjs", { kind: "smoke" }],
  ["158-editors-choice.spec.mjs", { kind: "arcade" }],
  ["155-big-weird-dig.spec.mjs", { kind: "game", games: ["big-weird-dig"] }],
  ["163-pet-wash-payback-jeremy-v2.spec.mjs", { kind: "game", games: ["pet-wash-payback"] }],
  ["107-mazeathon-playfeel.spec.mjs", { kind: "game", games: ["mazeathon"] }]
]);
const run = (files, gamesJson) => decide({ files, specs, slugs, gamesJson });

test("spec names map to games, longest slug first", () => {
  assert.deepEqual(specScope("155-big-weird-dig.spec.mjs", "", slugs), { kind: "game", games: ["big-weird-dig"] });
  assert.deepEqual(specScope("ideas-2-ant-farm-wars.spec.mjs", "", slugs), { kind: "game", games: ["ant-farm-wars"] });
  assert.deepEqual(specScope("163-pet-wash-payback-jeremy-v2.spec.mjs", "", slugs), { kind: "game", games: ["pet-wash-payback"] });
  assert.deepEqual(specScope("158-editors-choice.spec.mjs", "", slugs), { kind: "arcade" });
  assert.deepEqual(specScope("12-pet-wash.spec.mjs", "", slugs), { kind: "arcade" });
});

test("a header line overrides the name", () => {
  assert.deepEqual(specScope("46-evidence-framework.spec.mjs", "// Evidence for #46\n// evidence-scope: smoke\nimport x;", slugs), { kind: "smoke" });
  assert.deepEqual(specScope("155-big-weird-dig.spec.mjs", "// evidence-scope: arcade", slugs), { kind: "arcade" });
  assert.deepEqual(specScope("124-x.spec.mjs", "// evidence-scope: game mazeathon big-weird-dig", slugs), { kind: "game", games: ["mazeathon", "big-weird-dig"] });
  assert.throws(() => specScope("1-x.spec.mjs", "// evidence-scope: gmae x", slugs), /should be smoke, arcade, or game/);
});

test("an arcade-only change runs the arcade specs and no game specs", () => {
  const r = run(["index.html", "assets/arcade.css"]);
  assert.equal(r.full, false);
  assert.deepEqual(r.specs, ["158-editors-choice.spec.mjs", "46-evidence-framework.spec.mjs"]);
});

test("a one-game change runs that game's specs plus smoke", () => {
  const r = run(["games/pet-wash-payback/jeremy.v3/game.js", "assets/covers/pet-wash-payback.jpg", "evidence/ideas-3-x/README.md"]);
  assert.deepEqual(r.specs, ["163-pet-wash-payback-jeremy-v2.spec.mjs", "46-evidence-framework.spec.mjs"]);
  assert.deepEqual(r.games, ["pet-wash-payback"]);
});

test("a changed spec runs itself, whatever its scope", () => {
  assert.deepEqual(run(["tests/evidence/107-mazeathon-playfeel.spec.mjs"]).specs, ["107-mazeathon-playfeel.spec.mjs", "46-evidence-framework.spec.mjs"]);
});

test("shared test code runs everything", () => {
  for (const f of ["tests/evidence/evidence.mjs", "tests/evidence/scope.mjs", "playwright.evidence.config.mjs", "package-lock.json", ".github/workflows/evidence.yml"]) {
    assert.equal(run(["index.html", f]).full, true, f);
  }
});

test("docs alone run only smoke", () => {
  assert.deepEqual(run(["docs/evidence.md", "README.md", "artifacts/2026-10-25-x/index.html"]).specs, ["46-evidence-framework.spec.mjs"]);
});

test("games.json: changed entries are game changes, a reorder is an arcade change", () => {
  const a = { slug: "big-weird-dig", url: "games/big-weird-dig/" }, b = { slug: "mazeathon", url: "games/mazeathon/" };
  const before = JSON.stringify([a, b]);
  assert.deepEqual(changedEntries(before, JSON.stringify([a, { ...b, tagline: "new" }])), ["mazeathon"]);
  assert.deepEqual(changedEntries(before, JSON.stringify([{ slug: "pet-wash-payback" }, a, b])), ["pet-wash-payback"]);
  assert.equal(changedEntries(before, JSON.stringify([b, a])), null);
  assert.equal(changedEntries(before, "{oops"), null);
  const r = run(["games.json", "games/pet-wash-payback/index.html"], { before, after: JSON.stringify([{ slug: "pet-wash-payback" }, a, b]) });
  assert.deepEqual(r.specs, ["163-pet-wash-payback-jeremy-v2.spec.mjs", "46-evidence-framework.spec.mjs"]);
  assert.equal(run(["games.json"], { before, after: JSON.stringify([b, a]) }).arcade, true);
});
