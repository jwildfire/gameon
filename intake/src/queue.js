// GET /queue: the idea line for the New Game page, from the private ideas repo (and, while
// old ideas are still there, the public gameon repo). It never returns an idea's words:
// only the eval's rewritten title and one-liner, its question or reason, the status, the
// nickname and the date. Ideas the eval hasn't read yet come back with just_sent: true.
import { api, installationToken, ideasToken, repoName } from "./github.js";
import { cleanNickname } from "./idea.js";

export const STATUSES = [
  "status: submitted", "status: evaluating", "status: needs more", "status: needs approval",
  "status: approved", "status: building", "status: checking", "status: on dev",
  "status: published", "status: not built"
];
// A grown-up (or a known family's eval) has let these through, so an unknown submitter's
// nickname is shown from here on. Before that it reads "Someone".
const CLEARED = ["status: approved", "status: building", "status: checking", "status: on dev", "status: published"];
// Only eval comments from people with access, or from a bot, count.
const TRUSTED = ["OWNER", "MEMBER", "COLLABORATOR"];
const PER_REPO = 30;

export function evalFrom(body) {
  const m = /^<!-- gameon-eval (\{.*?\}) -->/.exec(body || "");
  if (!m) return null;
  try { const v = JSON.parse(m[1]); return v && typeof v === "object" ? v : null; } catch (e) { return null; }
}

function section(body, heading) {
  const m = new RegExp(`###\\s*${heading}\\s*\\n+\\s*([^\\n]+)`).exec(body || "");
  const v = m ? m[1].trim() : "";
  return v === "_No response_" ? "" : v;
}

function short(v, max) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export function redact(issue, ev, source) {
  const names = (issue.labels || []).map(l => (typeof l === "string" ? l : l.name));
  const status = names.find(n => STATUSES.includes(n)) || "status: submitted";
  const unknown = names.includes("submitter: unknown");
  const update = names.includes("update");
  const maker = unknown && !CLEARED.includes(status) ? "Someone" : cleanNickname(section(issue.body, "Made by")) || "Someone";
  const game = update ? (section(issue.body, "Game to update").match(/^[a-z0-9][a-z0-9-]{0,59}$/) || [""])[0] : "";
  const safe = ev && ev.gate !== "fail";
  return {
    source,
    number: issue.number,
    created: issue.created_at,
    status,
    maker,
    update,
    game,
    title: safe ? short(ev.title, 60) : null,
    one_liner: safe ? short(ev.one_liner, 160) : null,
    question: ev && status === "status: needs more" ? short(ev.question, 200) : null,
    reason: ev && status === "status: not built" ? short(ev.reason, 200) : null,
    version: ev && update ? short(ev.version, 40) : null,
    just_sent: !ev
  };
}

async function readRepo(deps, token, repo, source) {
  const [issues, comments] = await Promise.all([
    api(deps, token, `/repos/${repo}/issues?labels=game-idea&state=all&sort=created&direction=desc&per_page=${PER_REPO}`),
    api(deps, token, `/repos/${repo}/issues/comments?sort=created&direction=desc&per_page=100`)
  ]);
  const evals = {};
  for (const c of comments) {
    if (!c || !(TRUSTED.includes(c.author_association) || (c.user && c.user.type === "Bot"))) continue;
    const ev = evalFrom(c.body);
    const n = String(c.issue_url || "").split("/").pop();
    if (ev && !evals[n]) evals[n] = ev; // newest first, so the first one wins
  }
  return issues
    .filter(i => !i.pull_request && !(i.labels || []).some(l => (l.name || l) === "test"))
    .map(i => redact(i, evals[String(i.number)] || null, source));
}

export async function buildQueue(env, deps) {
  const jobs = [ideasToken(env, deps).then(t => readRepo(deps, t, env.IDEAS_REPO, "private"))];
  if (env.PUBLIC_IDEAS_REPO) {
    const scope = { repositories: [repoName(env.PUBLIC_IDEAS_REPO)], permissions: { issues: "read" } };
    // The public repo reads fine without a token if the app isn't installed there.
    jobs.push(installationToken(env, deps, scope).catch(() => null)
      .then(t => readRepo(deps, t, env.PUBLIC_IDEAS_REPO, "public"))
      .catch(() => [])); // old public ideas are a bonus; never fail the line over them
  }
  const lists = await Promise.all(jobs);
  const ideas = lists.flat().sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, PER_REPO);
  return { ok: true, at: new Date(deps.now()).toISOString(), ideas };
}
