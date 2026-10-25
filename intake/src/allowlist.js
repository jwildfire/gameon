// The allowlist: which signed-in senders count as known, decided by Jeremy or Ryan in issues.
//
// The first time someone signed in sends an idea, the Worker opens one private issue in the
// ideas repo, "Allow <name> to send ideas?", labelled `allowlist` and `allowlist: pending`,
// and remembers its number in KV (allow:issue:<provider>:<id>). Later ideas from them are
// added to that issue as comments. A decider (ALLOWLIST_DECIDERS, jwildfire and killjoy00)
// adds `allowlist: allowed` or `allowlist: denied`. Only a label a decider added counts: the
// Worker reads the issue's events to see who added it. The answer is cached in KV for ten
// minutes (allow:decision:<provider>:<id>).
//
// Allowlist issues never carry `game-idea`, so /queue, the watcher and the pipeline skip them.
import { api } from "./github.js";
import { identityKey } from "./session.js";

export const LABELS = { base: "allowlist", pending: "allowlist: pending", allowed: "allowlist: allowed", denied: "allowlist: denied" };
const DEFAULT_DECIDERS = "jwildfire,killjoy00";
const DECISION_SECONDS = 600;

export function deciders(env) {
  return String(env.ALLOWLIST_DECIDERS || DEFAULT_DECIDERS).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

// events: the issue's events, oldest first. labels: the names on the issue now.
// A decision label counts only if it's on the issue and the last time it was added, a
// decider added it. Denied wins if both are there.
export function decide(events, labels, trusted) {
  const byDecider = {};
  const sorted = [...(events || [])].sort((a, b) =>
    String(a.created_at || "").localeCompare(String(b.created_at || "")) || (a.id || 0) - (b.id || 0));
  for (const e of sorted) {
    const name = e && e.label && e.label.name;
    if (name !== LABELS.allowed && name !== LABELS.denied) continue;
    if (e.event === "labeled") byDecider[name] = trusted.includes(String(e.actor && e.actor.login || "").toLowerCase());
    else if (e.event === "unlabeled") byDecider[name] = false;
  }
  const on = new Set(labels);
  if (on.has(LABELS.denied) && byDecider[LABELS.denied]) return "denied";
  if (on.has(LABELS.allowed) && byDecider[LABELS.allowed]) return "allowed";
  return "pending";
}

// Returns { issue: number | null, decision: "allowed" | "denied" | "pending" }.
export async function lookup(env, deps, token, who) {
  const id = identityKey(who);
  const kv = env.INTAKE_KV;
  const stored = kv ? await kv.get(`allow:issue:${id}`) : null;
  const issue = parseInt(stored, 10) || null;
  if (!issue) return { issue: null, decision: "pending" };

  const cached = kv ? await kv.get(`allow:decision:${id}`) : null;
  if (cached === "allowed" || cached === "denied" || cached === "pending") return { issue, decision: cached };

  let data;
  try {
    data = await api(deps, token, `/repos/${env.IDEAS_REPO}/issues/${issue}`);
  } catch (e) {
    if (e && (e.status === 404 || e.status === 410)) {
      // The issue was deleted or moved: start again with a new one.
      if (kv && kv.delete) await kv.delete(`allow:issue:${id}`);
      return { issue: null, decision: "pending" };
    }
    throw e;
  }
  const labels = (data.labels || []).map(l => (typeof l === "string" ? l : l.name));
  let decision = "pending";
  if (labels.includes(LABELS.allowed) || labels.includes(LABELS.denied)) {
    const events = await api(deps, token, `/repos/${env.IDEAS_REPO}/issues/${issue}/events?per_page=100`);
    decision = decide(events, labels, deciders(env));
  }
  if (kv) await kv.put(`allow:decision:${id}`, decision, { expirationTtl: DECISION_SECONDS });
  return { issue, decision };
}

// In a code span, so a name can't add markdown, links or @mentions.
function code(value) {
  const v = String(value || "").replace(/[`\r\n|]/g, "").trim();
  return v ? "`" + v + "`" : "_none_";
}

export function providerName(who) {
  return who.provider === "google" ? "Google" : "GitHub";
}

export function allowlistIssue(who, ideaNumber) {
  const rows = [
    `| Signed in with | ${providerName(who)} |`,
    who.provider === "google" ? `| Email | ${code(who.email)} |` : `| GitHub login | ${code(who.login)} |`,
    `| Name | ${code(who.name)} |`,
    `| Id | ${code(identityKey(who))} |`,
    `| First idea | #${ideaNumber} |`
  ];
  const body =
    "Someone signed in on the New Game page and sent their first idea. Should their ideas count as known?\n\n" +
    "| | |\n|---|---|\n" + rows.join("\n") + "\n\n" +
    "**To decide**, Jeremy or Ryan adds one label:\n\n" +
    "- `allowlist: allowed`: their ideas are `submitter: known` from now on, so triage treats them like a family's.\n" +
    "- `allowlist: denied`: their ideas stay `submitter: unknown` and always wait at `status: needs approval`.\n\n" +
    "Remove `allowlist: pending` when you do. Only a label added by jwildfire or killjoy00 counts, and the intake " +
    "takes up to ten minutes to notice. Their later ideas are added here as comments. Their ideas already sent keep " +
    "the label they were filed with.\n\n" +
    "This issue isn't a game idea: it has no `game-idea` label, so the pipeline skips it.\n\n" +
    "---\nFiled by the GameOn intake service (`intake/` in jwildfire/gameon).\n";
  const name = String(who.name || "").replace(/[\r\n]/g, " ").trim() || (who.login || "someone");
  return { title: `Allow ${name} to send ideas?`, body, labels: [LABELS.base, LABELS.pending] };
}

// After the first idea: open the allowlist issue and remember it. Never fails the idea.
export async function openIssue(env, deps, token, who, ideaNumber) {
  try {
    const created = await api(deps, token, `/repos/${env.IDEAS_REPO}/issues`, { method: "POST", body: allowlistIssue(who, ideaNumber) });
    if (env.INTAKE_KV) await env.INTAKE_KV.put(`allow:issue:${identityKey(who)}`, String(created.number));
    return created.number;
  } catch (e) {
    console.error("intake: opening the allowlist issue failed:", e && e.message);
    return null;
  }
}

// A later idea: link it in the allowlist issue. Never fails the idea.
export async function noteIdea(env, deps, token, issue, ideaNumber, decision) {
  try {
    await api(deps, token, `/repos/${env.IDEAS_REPO}/issues/${issue}/comments`, {
      method: "POST",
      body: { body: `Another idea from this sender: #${ideaNumber} (filed as \`submitter: ${decision === "allowed" ? "known" : "unknown"}\`).\n\n---\nFiled by the GameOn intake service.` }
    });
  } catch (e) {
    console.error("intake: commenting on the allowlist issue failed:", e && e.message);
  }
}
