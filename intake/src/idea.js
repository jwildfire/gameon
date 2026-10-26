// Checking what the New Game page sends, and turning it into the idea issue.
// The issue body is the layout GitHub's Game idea form produces (.github/ISSUE_TEMPLATE/
// game-idea.yml), plus a ### Family section at the end, so the evaluate skill reads it
// unchanged. docs/ideas.md describes it.

export const MIN_WORDS = 5;
export const MAX_WORDS = 1000;
export const MAX_CHARS = 10000;
export const MAX_BODY_BYTES = 32 * 1024;

const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const VERSION = /^[a-z0-9]{1,30}\.v[1-9][0-9]{0,3}$/;
const TOLD = ["talking", "typing"];

export function countWords(text) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

// Same rule as the New Game page: letters, numbers, spaces, apostrophes and dashes.
export function cleanNickname(value, max = 20) {
  if (typeof value !== "string") return "";
  return value.replace(/[^\p{L}\p{N} '\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);
}

// Keep the kid's words, but drop control characters, tidy line endings, and escape the #s
// in a heading-like run (## or more anywhere, or # at the start of a line) as \#, so the
// idea can't add a heading of its own: a "### Made by" inside an idea would otherwise
// change who it's credited to. GitHub shows "\#" as "#".
export function cleanIdea(value) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(/^[ \t]{0,3}#+|#{2,}/gm, run => run.replace(/#/g, "\\#"));
}

export function normaliseCode(value) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 100) : "";
}

// Returns { ok: true, idea } or { ok: false, error } where error is a key in MESSAGES.
export function validateIdea(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "bad_request" };
  if (typeof input.idea !== "string") return { ok: false, error: "too_short" };
  const text = cleanIdea(input.idea);
  const words = countWords(text);
  if (words < MIN_WORDS) return { ok: false, error: "too_short" };
  if (words > MAX_WORDS || text.length > MAX_CHARS) return { ok: false, error: "too_long" };

  let game = "", version = "";
  if (input.game != null && input.game !== "") {
    if (typeof input.game !== "string" || !SLUG.test(input.game)) return { ok: false, error: "bad_request" };
    game = input.game;
    if (input.version != null && input.version !== "") {
      if (typeof input.version !== "string" || !VERSION.test(input.version)) return { ok: false, error: "bad_request" };
      version = input.version;
    }
  }
  const told = TOLD.includes(input.told_by) ? input.told_by : "typing";
  return {
    ok: true,
    idea: {
      text,
      words,
      maker: cleanNickname(input.maker),
      told,
      game,
      version,
      code: normaliseCode(input.code),
      turnstile: typeof input.turnstile === "string" ? input.turnstile.slice(0, 4096) : "",
      session: typeof input.session === "string" ? input.session.slice(0, 4096) : ""
    }
  };
}

// family is the family's nickname for a known submitter, or "" for an unknown one.
// signedIn, for a signed-in sender, is { known, line }: known when the allowlist says so,
// and line is what goes in a ### Signed in section (the provider and the allowlist issue,
// never an email or login; those are only in the allowlist issue).
export function buildIssue(idea, family, signedIn = null) {
  const known = !!family || !!(signedIn && signedIn.known);
  const maker = idea.maker || (family ? cleanNickname(family) : "") || "Someone";
  const none = "_No response_";
  const title = idea.game ? `Update to ${idea.game} from ${maker}` : `Game idea from ${maker}`;
  let body =
    "### The idea, word for word\n\n" + idea.text + "\n\n" +
    "### Game to update\n\n" + (idea.game || none) + "\n\n" +
    "### Starting version\n\n" + (idea.game && idea.version ? idea.version : none) + "\n\n" +
    "### Made by\n\n" + maker + "\n\n" +
    "### Told by\n\n" + idea.told + "\n\n" +
    "### Family\n\n" + (family ? cleanNickname(family, 30) || none : none) + "\n";
  if (signedIn) body += "\n### Signed in\n\n" + signedIn.line + "\n";
  const labels = ["game-idea", "status: submitted", known ? "submitter: known" : "submitter: unknown"];
  if (idea.game) labels.push("update");
  return { title, body, labels };
}
