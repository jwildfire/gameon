// Evidence for #158: Editor's Choice games ("editorsChoice": true in games.json) come first
// on the shelf with a gold star, and everything else keeps its order.
// Run: npm run evidence -- tests/evidence/158-editors-choice
import { test, expect, games } from "./evidence.mjs";

const picks = games.filter(g => g.editorsChoice === true).map(g => g.slug);
const rest = games.filter(g => g.editorsChoice !== true).map(g => g.slug);
const slugsOf = (page, sel, attr) => page.locator(sel).evaluateAll((els, a) => els.map(e => a === "href" ? e.getAttribute("href").slice(1) : e.dataset.slug), attr);

test("Trampoline Battle is the only Editor's Choice, first on the shelf, and the rest keep their order", async ({ page, shot, note, browserErrors }) => {
  expect(picks).toEqual(["trampoline-battle"]);
  await page.goto("./");
  await expect(page.locator("#shelf .cart")).toHaveCount(games.length);
  const shelf = await slugsOf(page, "#shelf .cart", "href");
  expect(shelf[0]).toBe("trampoline-battle");
  expect(shelf).toEqual([...picks, ...rest]);
  // The game switcher in the player uses the same order.
  expect(await slugsOf(page, "#switch-grid .mini", "slug")).toEqual(shelf);

  const card = page.locator('#shelf .cart[href="#trampoline-battle"]');
  await expect(card.locator(".pick-star svg")).toBeVisible();
  await expect(card.locator(".tag.pick")).toHaveText("Editor's Choice");
  await expect(card.locator(".tag.pick")).toHaveAttribute("title", "Editor's Choice");
  await expect(card.locator(".tags .tag").first()).toHaveClass(/pick/);
  // Its tags from games.json are all still there, after the star.
  const entry = games.find(g => g.slug === "trampoline-battle");
  for (const t of entry.tags) await expect(card.locator(".tag", { hasText: t }).first()).toBeVisible();
  // The card's link reads "Editor's Choice" to a screen reader; no other card does.
  await expect(page.getByRole("link", { name: /Editor's Choice/ })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Editor's Choice/ })).toHaveAttribute("href", "#trampoline-battle");
  await expect(page.locator("#shelf .pick-star")).toHaveCount(1);
  await expect(page.locator("#shelf .tag.pick")).toHaveCount(1);
  note(`shelf: ${shelf.join(", ")}`);
  await shot("shelf");
  expect(browserErrors).toEqual([]);
});

for (const mode of ["normal", "weird"]) {
  test(`in ${mode === "normal" ? "Normal" : "Weird"} mode the starred card fits with no sideways scroll`, async ({ page, shot, note, browserErrors }) => {
    await page.goto(`./?mode=${mode}`);
    await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
    const card = page.locator('#shelf .cart[href="#trampoline-battle"]');
    await expect(card.locator(".pick-star")).toBeVisible();
    const m = await card.evaluate(c => {
      const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
      return {
        card: box(c), cover: box(c.querySelector(".cover")), star: box(c.querySelector(".pick-star")),
        tags: [...c.querySelectorAll(".tag")].map(box), pickBg: getComputedStyle(c.querySelector(".tag.pick")).backgroundColor,
        width: innerWidth, scroll: document.documentElement.scrollWidth
      };
    });
    expect(m.scroll).toBeLessThanOrEqual(m.width);
    expect(m.card.r).toBeLessThanOrEqual(m.width);
    for (const k of ["l", "t"]) expect(m.star[k]).toBeGreaterThanOrEqual(m.cover[k]);
    expect(m.star.r).toBeLessThanOrEqual(m.cover.r);
    expect(m.star.b).toBeLessThanOrEqual(m.cover.b);
    for (const t of m.tags) { expect(t.l).toBeGreaterThanOrEqual(m.card.l); expect(t.r).toBeLessThanOrEqual(m.card.r); }
    expect(m.pickBg).toBe("rgb(255, 194, 51)");
    note(`${m.width}px ${mode}: star inside the cover, ${m.tags.length} tags inside the card, page ${m.scroll}px wide`);
    await card.scrollIntoViewIfNeeded();
    await shot(`card-${mode}`);
    expect(browserErrors).toEqual([]);
  });
}

test("the starred card, deep links and the version picker still work", async ({ page, note, browserErrors }) => {
  await page.goto("./");
  await page.locator('#shelf .cart[href="#trampoline-battle"]').click();
  await expect(page.locator("#chooser")).toBeVisible();
  const entry = games.find(g => g.slug === "trampoline-battle");
  await expect(page.locator("#ver-list .ver-item").first()).toContainText(entry.default);
  await page.goto("./#trampoline-battle@jeremy.v1");
  await expect(page.locator("#player")).toBeVisible();
  await expect(page.locator("#frame")).toHaveAttribute("src", entry.versions.find(v => v.id === "jeremy.v1").url);
  // a one-version game: its link plays straight away (one with more versions asks which first)
  const one = rest.find(s => (games.find(g => g.slug === s).versions || []).length < 2);
  await page.goto(`./#${one}`);
  await expect(page.locator("#bar-title")).toHaveText(games.find(g => g.slug === one).title);
  note(`card opens the version picker (${entry.default} first); #trampoline-battle@jeremy.v1 plays; #${one} plays`);
  expect(browserErrors).toEqual([]);
});
