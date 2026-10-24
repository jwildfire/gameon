// Evidence for #100: Send to a grown-up fills in the issue even when GitHub opens a blank one.
// Run: npm run evidence -- 100-issue-body
import { test, expect } from "./evidence.mjs";

const IDEA = "a game where a dragon bakes cakes for the whole village and the oven keeps catching fire";

test("Send carries the body and labels as well as the form fields", async ({ page, shot, note, browserErrors }) => {
  await page.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await page.goto("new/");
  await page.locator("#tab-type").click();
  await page.locator("#idea").fill(IDEA);
  await page.locator("#maker").fill("Bean");
  await page.locator("#send").click();
  await expect(page.locator("#handoff")).toBeVisible();

  const url = new URL(await page.evaluate(() => window.__opened[0]));
  const q = url.searchParams;
  expect(url.origin + url.pathname).toBe("https://github.com/jwildfire/gameon/issues/new");
  // The form's fields, for when game-idea.yml is on main
  expect(q.get("template")).toBe("game-idea.yml");
  expect(q.get("idea")).toBe(IDEA);
  expect(q.get("maker")).toBe("Bean");
  expect(q.get("told_by")).toBe("typing");
  // The fallback a blank issue uses
  expect(q.get("title")).toBe("Game idea from Bean");
  expect(q.get("labels")).toBe("game-idea,status: submitted");
  const body = q.get("body");
  expect(body).toBe(`### The idea, word for word\n\n${IDEA}\n\n### Made by\n\nBean\n\n### Told by\n\ntyping\n`);
  // The idea line reads the nickname from that layout
  expect(/###\s*Made by\s*\n+\s*([^\n]+)/.exec(body)[1]).toBe("Bean");
  expect(url.href.length).toBeLessThan(8000);
  note(`address is ${url.href.length} characters; body has the idea, Made by and Told by sections`);
  await expect(page.locator("#issue-link")).toHaveAttribute("href", url.href);
  await shot("sent");
  expect(browserErrors).toEqual([]);
});

test("a 1,000-character idea still fits in one address", async ({ page, note }) => {
  await page.addInitScript(() => { window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
  await page.goto("new/");
  await page.locator("#tab-type").click();
  const long = ("pizza penguins race downhill and the toppings fly off when they go too fast ").repeat(13).slice(0, 1000).trim();
  await page.locator("#idea").fill(long);
  await page.locator("#maker").fill("Rocket");
  await page.locator("#send").click();
  const href = await page.evaluate(() => window.__opened[0]);
  expect(href.length).toBeLessThan(8000);
  note(`${long.length}-character idea → ${href.length}-character address (GitHub allows about 8,000)`);
});
