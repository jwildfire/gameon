import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const games = JSON.parse(readFileSync(new URL("../games.json", import.meta.url), "utf8"));

test("registry entries have unique slugs and URLs, valid metadata and cover images", () => {
  assert.ok(Array.isArray(games) && games.length > 0, "games.json must list games");

  const slugs = new Set();
  const urls = new Set();
  for (const game of games) {
    assert.match(game.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "unsafe game slug");
    assert.ok(!slugs.has(game.slug), "duplicate slug: " + game.slug);
    slugs.add(game.slug);

    for (const field of ["title", "tagline", "url", "repo"]) {
      assert.ok(typeof game[field] === "string" && game[field].trim(), game.slug + ": missing " + field);
    }
    if (game.credit !== undefined) {
      assert.ok(typeof game.credit === "string" && game.credit.trim(), game.slug + ": invalid credit");
    }
    assert.match(game.color, /^#[0-9a-fA-F]{6}$/, game.slug + ": invalid color");
    assert.ok(Array.isArray(game.tags) && game.tags.length > 0, game.slug + ": missing tags");
    assert.ok(game.tags.every(tag => typeof tag === "string" && tag.trim()), game.slug + ": invalid tag");

    const playUrl = new URL(game.url);
    assert.equal(playUrl.protocol, "https:", game.slug + ": game URL must be HTTPS");
    assert.ok(!playUrl.search && !playUrl.hash, game.slug + ": game URL must be canonical");
    assert.ok(!urls.has(playUrl.href), "duplicate game URL: " + playUrl.href);
    urls.add(playUrl.href);

    const repoUrl = new URL(game.repo);
    assert.equal(repoUrl.protocol, "https:", game.slug + ": repo URL must be HTTPS");
    assert.equal(repoUrl.hostname, "github.com", game.slug + ": repo URL must point to GitHub");
    assert.equal(repoUrl.pathname.split("/").filter(Boolean).length, 2, game.slug + ": invalid repo path");

    const cover = statSync(new URL("../assets/covers/" + game.slug + ".jpg", import.meta.url));
    assert.ok(cover.isFile() && cover.size > 0, game.slug + ": missing or empty cover");
  }
});
