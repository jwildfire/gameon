// Evidence for #149: every rotating Weird-mode title gets its own look (font, colors, outline,
// shadow), 20 looks in all. Normal mode keeps the classic logo and never loads the fonts.
// Run: npm run evidence -- tests/evidence/149-title-styles
import { test, expect } from "./evidence.mjs";

const look = page => page.evaluate(() => {
  const w = getComputedStyle(document.getElementById("wm-word")), o = getComputedStyle(document.querySelector("#wordmark .wm-on"));
  return { title: document.getElementById("wordmark").textContent, style: window.gameonTitleStyle(), font: w.fontFamily, word: w.color, on: o.color };
});

test("Normal keeps the classic logo and loads none of the title fonts", async ({ page, note, browserErrors }) => {
  const fontCalls = [];
  page.on("request", r => { if (/fonts\.googleapis\.com\/css2\?family=Bungee/.test(r.url())) fontCalls.push(r.url()); });
  await page.goto("./?mode=normal&titleInterval=0.3");
  await page.waitForTimeout(1500);
  const l = await look(page);
  expect(l.title).toBe("GameOn");
  expect(l.font).toContain("Lilita One");
  expect(await page.locator("#wordmark").getAttribute("data-style")).toBeNull();
  expect(fontCalls).toEqual([]);
  note(`Normal: ${l.title} in ${l.font.split(",")[0]}, no data-style, and no request for the 19 title fonts`);
  expect(browserErrors).toEqual([]);
});

test("each new title in Weird mode has a different font and colors, through all 20 looks", async ({ page, note, browserErrors }) => {
  await page.goto("./?mode=weird&titleInterval=9999");
  await page.evaluate(() => window.gameonTitleFonts());
  const styles = await page.evaluate(() => window.gameonTitleStyles);
  expect(styles.length).toBe(20);
  expect(new Set(styles).size).toBe(20);
  const first = await look(page);
  expect(first.title).toBe("GameOn");
  expect(first.style).toBe("Classic");
  const seen = [first];
  for (let k = 1; k < 20; k++) {
    await page.evaluate(() => window.gameonNextTitle());
    const l = await look(page);
    const prev = seen[seen.length - 1];
    expect(l.style).toBe(styles[k]);
    expect(l.font).not.toBe(prev.font);
    expect(l.font.split(",")[0].replace(/"/g, "")).toBe(styles[k]);
    expect(l.on).not.toBe(l.word); // still two-tone
    seen.push(l);
  }
  // Every font actually loaded (not a fallback) for every letter a title can use.
  const loaded = await page.evaluate(names => names.map(n => document.fonts.check(`40px "${n}"`, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")), styles.slice(1));
  expect(loaded.every(Boolean)).toBe(true);
  await page.evaluate(() => window.gameonNextTitle());
  expect((await look(page)).style).toBe("Classic"); // the 21st title loops back to the first look
  note(`20 looks in order, each with a new font and two-tone colors: ${styles.join(", ")}; all 19 fonts loaded`);
  // Back to Normal: classic again at once.
  await page.locator('[data-mode-set="normal"]').click();
  const n = await look(page);
  expect(n.title).toBe("GameOn");
  expect(n.font).toContain("Lilita One");
  expect(browserErrors).toEqual([]);
});

test("every look fits with the widest titles: one line, no sideways scroll, the header holds still", async ({ page, shot, note, browserErrors }, info) => {
  const widths = info.project.name === "desktop" ? [1600, 1280] : [375];
  for (const width of widths) {
    if (info.project.name === "desktop") await page.setViewportSize({ width, height: 800 });
    await page.goto("./?mode=weird&titleInterval=9999");
    await page.evaluate(() => window.gameonTitleFonts());
    const all = await page.evaluate(() => {
      const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
      const words = window.gameonTitles.map(t => t.slice(0, -2));
      const widest = ["Banana", "Noodle", "Wiggle", "Bubble", "Waffle", "Pickle", "Glitch", "Giggle", "Splash", "Rocket"];
      const h = document.getElementById("wordmark"), out = [];
      for (let k = 0; k < window.gameonTitleStyles.length; k++) {
        for (const w of widest) {
          window.gameonShowTitle(words.indexOf(w), k);
          const range = document.createRange();
          range.selectNodeContents(h);
          out.push({
            text: h.textContent, style: window.gameonTitleStyle(), word: r("#wordmark"), ink: range.getBoundingClientRect().width,
            mast: r(".masthead").height, lede: r("#tagline"), gh: r("#gh-home"),
            scroll: document.documentElement.scrollWidth, width: innerWidth
          });
        }
      }
      window.gameonShowTitle(0, 0);
      return out;
    });
    const first = all[0];
    let tightest = all[0];
    for (const m of all) {
      expect(m.scroll, `${m.style} ${m.text}`).toBeLessThanOrEqual(m.width);
      expect(m.word.right, `${m.style} ${m.text}`).toBeLessThanOrEqual(m.width);
      expect(m.ink, `${m.style} ${m.text}`).toBeLessThanOrEqual(m.word.width + 1);
      expect(Math.abs(m.word.height - first.word.height), `${m.style} ${m.text}`).toBeLessThanOrEqual(1);
      expect(Math.abs(m.mast - first.mast), `${m.style} ${m.text}`).toBeLessThanOrEqual(1);
      expect(Math.abs(m.lede.x - first.lede.x), `${m.style} ${m.text}`).toBeLessThanOrEqual(1);
      if (info.project.name === "phone") expect(m.word.x + m.ink, `${m.style} ${m.text}`).toBeLessThanOrEqual(m.gh.x);
      if (m.ink > tightest.ink) tightest = m;
    }
    note(`${first.width}px: ${all.length} title-and-look pairs (20 looks × the 10 widest titles) fit on one line with the header unmoved; widest is ${tightest.text} in ${tightest.style} at ${Math.round(tightest.ink)}px`);
  }
  // A contact sheet of all 20 looks for the record.
  await page.evaluate(() => {
    const words = ["Game", "Banana", "Pickle", "Glitch", "Noodle", "Wiggle", "Llama", "Disco", "Rocket", "Waffle", "Splash", "Giggle", "Bubble", "Comet", "Taco", "Dino", "Turbo", "Pixel", "Goose", "Jelly"];
    const sheet = document.createElement("div");
    sheet.style.cssText = "position:fixed;inset:0;z-index:99;background:#2b1055;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));align-content:start;gap:14px 12px;padding:16px;overflow:hidden";
    for (let k = 0; k < 20; k++) {
      window.gameonShowTitle(0, k);
      const c = document.getElementById("wordmark").cloneNode(true);
      c.removeAttribute("id");
      c.style.cssText = "font-size:30px;min-width:0;--fit:1";
      c.querySelector(".wm-word").textContent = words[k];
      sheet.appendChild(c);
    }
    window.gameonShowTitle(0, 0);
    document.body.appendChild(sheet);
  });
  await shot("all-20-looks");
  expect(browserErrors).toEqual([]);
});
