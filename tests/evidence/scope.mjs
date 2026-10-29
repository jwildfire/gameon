// Picks which evidence specs a pull request runs, from the files it changes. See
// docs/evidence.md ("Which specs run").
//
//   node tests/evidence/scope.mjs                   what this branch would run against origin/dev
//   node tests/evidence/scope.mjs --base <ref>      ... against another base
//   node tests/evidence/scope.mjs --full "<why>"    every spec (nightly, release PRs, live runs)
//
// In the Evidence workflow it also gets --out <file>: the chosen spec files, one per line
// (empty when every spec runs), plus a table in the run's summary.
//
// Each spec belongs to one scope:
//   smoke   runs on every pull request ("// evidence-scope: smoke" near the top)
//   game    runs when its game changes: named <task>-<slug>[-more].spec.mjs after a game in
//           games/ or games.json, or "// evidence-scope: game <slug> [<slug> ...]"
//   arcade  everything else, or "// evidence-scope: arcade"
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Changing any of these can break any spec, so every spec runs.
const SHARED = [
  /^tests\/evidence\/(?!.*\.spec\.mjs$)/,          // evidence.mjs, reporter.mjs, this file
  /^playwright\.evidence\.config\.mjs$/,
  /^package(-lock)?\.json$/,
  /^\.github\/workflows\/evidence\.yml$/
];

// Words and pictures nobody's browser runs: only the smoke specs.
const QUIET = [
  /^(AGENTS|CLAUDE|README)\.md$/,
  /^docs\//,
  /^artifacts\//,
  /^evidence\//,
  /^\.claude\//,
  /^\.github\/(ISSUE_TEMPLATE\/|pull_request_template\.md$)/,
  /^\.gitignore$/
];

const SPEC = /^tests\/evidence\/([A-Za-z0-9._-]+\.spec\.mjs)$/;
const HEADER = /^\s*\/\/\s*evidence-scope:\s*([^(\n]*[^(\s])/m;   // anything from "(" on is a comment

// The scope of one spec, from its header line or its file name.
export function specScope(file, source, slugs) {
  const head = source.split("\n").slice(0, 15).join("\n").match(HEADER);
  if (head) {
    const [kind, ...names] = head[1].split(/\s+/);
    if (kind === "smoke" || kind === "arcade") return { kind };
    if (kind === "game" && names.length) return { kind, games: names };
    throw new Error(`${file}: "// evidence-scope: ${head[1]}" should be smoke, arcade, or game <slug> [<slug> ...]`);
  }
  // 155-big-weird-dig, ideas-2-ant-farm-wars, 163-pet-wash-payback-jeremy-v2
  const rest = path.basename(file).replace(/\.spec\.mjs$/, "").replace(/^(ideas-)?\d+-/, "");
  const slug = [...slugs].sort((a, b) => b.length - a.length).find(s => rest === s || rest.startsWith(s + "-"));
  return slug ? { kind: "game", games: [slug] } : { kind: "arcade" };
}

// Slugs whose games.json entries differ. Returns null if the file changed in another way
// (unreadable, or the games moved around), which counts as an arcade change.
export function changedEntries(before, after) {
  let a, b;
  try { a = JSON.parse(before ?? "[]"); b = JSON.parse(after ?? "[]"); } catch { return null; }
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  const old = new Map(a.map(g => [g.slug, JSON.stringify(g)]));
  const now = new Map(b.map(g => [g.slug, JSON.stringify(g)]));
  const kept = s => old.has(s) && now.has(s);
  if (a.map(g => g.slug).filter(kept).join() !== b.map(g => g.slug).filter(kept).join()) return null;
  return [...new Set([...old.keys(), ...now.keys()])].filter(s => old.get(s) !== now.get(s));
}

// What to run for a list of changed files. specs maps spec file name -> scope.
export function decide({ files, specs, slugs, gamesJson = {} }) {
  const games = new Set(), touched = new Set(), reasons = new Map();
  const why = (reason, f) => reasons.set(reason, [...(reasons.get(reason) || []), f]);
  let arcade = false;
  for (const f of files) {
    if (SHARED.some(r => r.test(f))) return { full: true, why: [`${f} is shared test code, so every spec runs`] };
    const spec = f.match(SPEC);
    const game = f.match(/^games\/([^/]+)\/./) || f.match(/^assets\/covers\/([^/.]+)\.[a-z]+$/);
    if (spec) { if (specs.has(spec[1])) { touched.add(spec[1]); why("a changed spec runs itself", f); } }
    else if (game && (f.startsWith("games/") || slugs.has(game[1]))) { games.add(game[1]); why(`game ${game[1]}`, f); }
    else if (f === "games.json") {
      const changed = changedEntries(gamesJson.before, gamesJson.after);
      if (changed) { changed.forEach(s => games.add(s)); why(`games.json entries: ${changed.join(", ") || "none"}`, f); }
      else { arcade = true; why("arcade (the games.json list itself changed)", f); }
    }
    else if (QUIET.some(r => r.test(f))) why("nothing a browser runs", f);
    else { arcade = true; why("arcade", f); }
  }
  const run = [...specs].filter(([name, s]) =>
    s.kind === "smoke" || touched.has(name) || (arcade && s.kind === "arcade") ||
    (s.kind === "game" && s.games.some(g => games.has(g))));
  const said = [...reasons].map(([reason, fs]) => `${reason}: ${fs.slice(0, 3).join(", ")}${fs.length > 3 ? ` and ${fs.length - 3} more` : ""}`);
  return { full: false, arcade, games: [...games], specs: run.map(([name]) => name).sort(), why: said };
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function gitShow(ref, file) {
  try { return git("show", `${ref}:${file}`); } catch { return null; }
}

function main(argv) {
  const opt = (name, fallback) => { const i = argv.indexOf(name); return i < 0 ? fallback : argv[i + 1]; };
  const out = opt("--out");
  const full = argv.includes("--full") ? opt("--full") || "asked for every spec" : null;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  process.chdir(root);

  const slugs = new Set(fs.readdirSync("games", { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name));
  for (const g of JSON.parse(fs.readFileSync("games.json", "utf8"))) slugs.add(g.slug);
  const specs = new Map(fs.readdirSync("tests/evidence").filter(f => f.endsWith(".spec.mjs")).sort()
    .map(f => [f, specScope(f, fs.readFileSync(path.join("tests/evidence", f), "utf8"), slugs)]));

  let result;
  if (full) result = { full: true, why: [full] };
  else {
    const base = opt("--base", "origin/dev");
    const head = opt("--head", "HEAD");
    const from = git("merge-base", base, head).trim();
    const files = git("diff", "--name-only", "--no-renames", from, head).split("\n").filter(Boolean);
    result = decide({ files, specs, slugs, gamesJson: { before: gitShow(from, "games.json"), after: gitShow(head, "games.json") } });
  }

  const chosen = result.full ? [...specs.keys()] : result.specs;
  const lines = [
    result.full ? `Every spec (${chosen.length}): ${result.why[0]}.`
      : `${chosen.length} of ${specs.size} specs. Games changed: ${result.games.join(", ") || "none"}. Arcade changed: ${result.arcade ? "yes" : "no"}.`,
    ...(result.full ? [] : result.why.map(w => `  ${w}`)),
    ...(result.full ? [] : chosen.map(s => `  run ${s} (${specs.get(s).kind}${specs.get(s).games ? " " + specs.get(s).games.join(" ") : ""})`))
  ];
  console.log(lines.join("\n"));

  if (out) fs.writeFileSync(out, result.full ? "" : chosen.map(s => `tests/evidence/${s}\n`).join(""));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = [...specs].map(([name, s]) => `| ${name} | ${s.kind}${s.games ? " " + s.games.join(" ") : ""} | ${chosen.includes(name) ? "runs" : "skipped"} |`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      "## Which specs run", "", lines[0], "",
      ...(result.full ? [] : ["<details><summary>Why</summary>", "", ...result.why.map(w => `- ${w}`), "", "</details>", ""]),
      "| Spec | Scope | This run |", "|---|---|---|", ...rows, "", ""
    ].join("\n"));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
