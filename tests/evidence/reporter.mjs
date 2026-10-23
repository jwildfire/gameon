// Writes README.md, index.html and results.json into each spec's evidence folder after a
// run, listing every check and whether it passed at desktop and phone widths. See
// docs/evidence.md.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { EVIDENCE_ROOT, LIVE, folderFor } from "./evidence.mjs";

const PROJECTS = ["desktop", "phone"];
const LABEL = { desktop: "Desktop 1280", phone: "Phone 375" };
const WORD = { passed: "pass", failed: "FAIL", timedOut: "FAIL", interrupted: "FAIL", skipped: "skipped" };
const GENERATED = /(\.jpg|^README\.md|^index\.html|^results\.json)$/;

const stripAnsi = s => String(s || "").replace(/\u001b\[[0-9;]*m/g, "");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function commit() {
  try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return null; }
}
function playwrightVersion() {
  try { return createRequire(import.meta.url)("@playwright/test/package.json").version; }
  catch { return null; }
}

export default class EvidenceReporter {
  onBegin(config, suite) {
    this.baseURL = config.projects[0] && config.projects[0].use.baseURL;
    this.folders = new Map();
    for (const t of suite.allTests()) {
      const folder = folderFor(t.location.file);
      if (!this.folders.has(folder)) this.folders.set(folder, { file: t.location.file, checks: new Map() });
      const title = t.titlePath().slice(3).join(" › ");
      const checks = this.folders.get(folder).checks;
      if (!checks.has(title)) checks.set(title, { title, line: t.location.line, runs: {}, notes: [] });
    }
    // Clear the generated files of every folder this run regenerates, so a renamed or
    // removed screenshot doesn't linger.
    for (const folder of this.folders.keys()) {
      const dir = path.join(EVIDENCE_ROOT, folder);
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir)) if (GENERATED.test(name)) fs.rmSync(path.join(dir, name));
    }
  }

  onTestEnd(t, result) {
    const folder = this.folders.get(folderFor(t.location.file));
    if (!folder) return;
    const check = folder.checks.get(t.titlePath().slice(3).join(" › "));
    const project = t.parent.project() ? t.parent.project().name : "desktop";
    check.runs[project] = {
      status: WORD[result.status] || result.status,
      screenshots: result.attachments.filter(a => a.contentType === "image/jpeg" && /\.jpg$/.test(a.name)).map(a => a.name),
      error: result.error ? stripAnsi(result.error.message).split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3).join(" · ").slice(0, 300) : null
    };
    const annotations = result.annotations || t.annotations;
    for (const a of annotations) {
      if (a.type === "note" && a.description && !check.notes.includes(a.description)) check.notes.push(a.description);
    }
  }

  onEnd() {
    const summary = [];
    for (const [name, folder] of this.folders) {
      const report = this.build(name, folder);
      const dir = path.join(EVIDENCE_ROOT, name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "results.json"), JSON.stringify(report, null, 2) + "\n");
      fs.writeFileSync(path.join(dir, "README.md"), this.markdown(report));
      fs.writeFileSync(path.join(dir, "index.html"), this.html(report));
      summary.push(report);
      console.log(`\nEvidence: ${report.headline} -> ${path.join(dir, "README.md")}`);
    }
    if (process.env.GITHUB_STEP_SUMMARY && summary.length) {
      const lines = summary.map(r => `### ${r.spec}\n\n${r.headline}\n\n${this.table(r)}\n`);
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Evidence${LIVE ? ` (live: ${this.baseURL})` : ""}\n\n${lines.join("\n")}\n`);
    }
  }

  build(name, folder) {
    const checks = [...folder.checks.values()].sort((a, b) => a.line - b.line).map(c => {
      const notes = [...c.notes].sort((a, b) => PROJECTS.indexOf(a.split(":")[0]) - PROJECTS.indexOf(b.split(":")[0]));
      const row = { check: c.title, notes };
      for (const p of PROJECTS) row[p] = c.runs[p] || { status: "not run", screenshots: [], error: null };
      return row;
    });
    const runs = checks.flatMap(c => PROJECTS.map(p => c[p].status));
    const passing = checks.filter(c => PROJECTS.every(p => c[p].status === "pass" || c[p].status === "skipped")).length;
    const passed = checks.length > 0 && passing === checks.length && runs.includes("pass");
    return {
      spec: name,
      passed,
      headline: `${passed ? "PASS" : "FAIL"}: ${passing} of ${checks.length} checks pass at desktop and phone widths.`,
      generatedAt: new Date().toISOString(),
      target: LIVE ? this.baseURL : "local server (python3 -m http.server) on this branch",
      commit: commit(),
      playwright: playwrightVersion(),
      specFile: path.relative(process.cwd(), folder.file).split(path.sep).join("/"),
      checks
    };
  }

  table(r) {
    const rows = r.checks.map(c => `| ${c.check.replace(/\|/g, "\\|")} | ${PROJECTS.map(p => c[p].status).join(" | ")} |`);
    return [`| Check | ${PROJECTS.map(p => LABEL[p]).join(" | ")} |`, `|---|${PROJECTS.map(() => "---").join("|")}|`, ...rows].join("\n");
  }

  // Desktop and phone pictures of the same shot sit next to each other.
  shotPairs(c) {
    const names = [];
    for (const p of PROJECTS) for (const s of c[p].screenshots) {
      const base = s.replace(new RegExp(`-${p}\\.jpg$`), "");
      if (!names.includes(base)) names.push(base);
    }
    return names.map(n => PROJECTS.map(p => c[p].screenshots.includes(`${n}-${p}.jpg`) ? { project: p, file: `${n}-${p}.jpg` } : null).filter(Boolean));
  }

  markdown(r) {
    const out = [
      `# Evidence: ${r.spec}`,
      "",
      `**${r.headline}**`,
      "",
      `Generated by \`${LIVE ? `EVIDENCE_BASE_URL=${this.baseURL} ` : ""}npm run evidence -- ${r.spec}\` from [\`${r.specFile}\`](../../${r.specFile}) against the ${r.target}${r.commit ? `, starting from commit ${r.commit}` : ""}, ${r.generatedAt.slice(0, 16).replace("T", " ")} UTC. Rules: [docs/evidence.md](../../docs/evidence.md).`,
      "",
      this.table(r),
      ""
    ];
    r.checks.forEach((c, i) => {
      out.push(`## ${i + 1}. ${c.check}`, "");
      for (const n of c.notes) out.push(`- ${n}`);
      for (const p of PROJECTS) if (c[p].error) out.push(`- ${LABEL[p]} failed: ${c[p].error}`);
      if (c.notes.length || PROJECTS.some(p => c[p].error)) out.push("");
      for (const pair of this.shotPairs(c)) {
        out.push(pair.map(s => `<img src="${s.file}" alt="${esc(c.check)}: ${s.file}" width="${s.project === "phone" ? 240 : 560}">`).join(" "), "");
      }
    });
    return out.join("\n");
  }

  html(r) {
    const sections = r.checks.map((c, i) => {
      const status = PROJECTS.map(p => `<span class="s ${c[p].status === "pass" ? "ok" : c[p].status === "FAIL" ? "bad" : ""}">${LABEL[p]}: ${esc(c[p].status)}</span>`).join(" ");
      const notes = [...c.notes, ...PROJECTS.filter(p => c[p].error).map(p => `${LABEL[p]} failed: ${c[p].error}`)].map(n => `<li>${esc(n)}</li>`).join("");
      const pics = this.shotPairs(c).map(pair => `<div class="pair">${pair.map(s => `<a href="${s.file}"><img class="${s.project}" src="${s.file}" alt="${esc(c.check)}: ${s.file}" loading="lazy"></a>`).join("")}</div>`).join("");
      return `<section><h2>${i + 1}. ${esc(c.check)}</h2><p>${status}</p>${notes ? `<ul>${notes}</ul>` : ""}${pics}</section>`;
    }).join("\n");
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evidence ${esc(r.spec)}</title>
<style>
:root { color-scheme: light dark; --ok: #1a7f37; --bad: #cf222e; }
body { margin: 0 auto; max-width: 1100px; padding: 16px; font: 16px/1.45 system-ui, sans-serif; background: Canvas; color: CanvasText; }
h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 19px; margin: 28px 0 6px; }
.head { font-weight: 700; color: ${r.passed ? "var(--ok)" : "var(--bad)"}; }
.meta { font-size: 14px; opacity: .75; }
.s { display: inline-block; padding: 1px 8px; border-radius: 999px; border: 1px solid currentColor; font-size: 13px; margin: 2px 4px 2px 0; }
.s.ok { color: var(--ok); } .s.bad { color: var(--bad); }
.pair { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin: 8px 0; }
.pair img { display: block; max-width: 100%; border: 1px solid #8886; border-radius: 6px; }
.pair img.desktop { width: 640px; } .pair img.phone { width: 220px; }
</style></head><body>
<h1>Evidence: ${esc(r.spec)}</h1>
<p class="head">${esc(r.headline)}</p>
<p class="meta">Against the ${esc(r.target)}${r.commit ? `, from commit ${esc(r.commit)}` : ""}, ${esc(r.generatedAt.slice(0, 16).replace("T", " "))} UTC. Spec: ${esc(r.specFile)}.</p>
${sections}
</body></html>
`;
  }
}
