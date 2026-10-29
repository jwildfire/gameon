// Evidence for the home-screen task (#74): the arcade has a web app manifest and GameOn icons,
// Chrome counts it as installable, and on a notched phone nothing in the player bar, the game
// or the switcher sits under the status bar, the notch or the home bar.
// Run: npm run evidence -- 74-home-screen
import { test, expect, games } from "./evidence.mjs";

const home = "./";
const local = games.find(g => g.slug === "mazeathon"); // served from this repo
const versioned = games.find(g => (g.versions || []).length > 1);

// iPhone-shaped insets (CSS px): status bar and notch, home bar.
const PORTRAIT = { width: 375, height: 812, insets: { top: 47, right: 0, bottom: 34, left: 0 } };
const LANDSCAPE = { width: 812, height: 375, insets: { top: 0, right: 47, bottom: 21, left: 47 } };

async function manifestOf(page) {
  const href = await page.locator('link[rel="manifest"]').evaluate(l => l.href);
  const res = await page.request.get(href);
  expect(res.status()).toBe(200);
  return { href, json: await res.json() };
}

test("the manifest names GameOn, opens standalone and lists the icon sizes", async ({ page, note, browserErrors }) => {
  await page.goto(home);
  const { href, json: m } = await manifestOf(page);
  expect(m.name).toBe("GameOn");
  expect(m.short_name).toBe("GameOn");
  expect(m.display).toBe("standalone");
  // start_url, scope and id resolve next to the manifest, so /gameon/ and /gameon/dev/ each
  // install as themselves.
  for (const key of ["start_url", "scope", "id"]) {
    expect(m[key], key).toBe("./");
    expect(new URL(m[key], href).href, key).toBe(new URL(home, page.url()).href);
  }
  const wall = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--wall").trim());
  expect(m.theme_color).toBe(wall);
  expect(m.background_color).toBe(wall);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", wall);

  const sizes = m.icons.map(i => `${i.sizes} ${i.purpose || "any"}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192 any", "512x512 any", "512x512 maskable"]));
  for (const icon of m.icons) {
    expect(icon.src, "icons are relative, so they work under /dev/").not.toMatch(/^\/|^https?:/);
    expect(icon.type).toBe("image/png");
  }
  note(`${new URL(href).pathname}: ${m.name}, ${m.display}, start_url and scope "./", theme ${m.theme_color}`);
  note(`icons: ${sizes.join(", ")}`);
  expect(browserErrors).toEqual([]);
});

test("Safari gets the tags to open full screen with the Apple touch icon", async ({ page, note, browserErrors }) => {
  await page.goto(home);
  const meta = name => page.locator(`meta[name="${name}"]`);
  await expect(meta("viewport")).toHaveAttribute("content", /viewport-fit=cover/);
  await expect(meta("apple-mobile-web-app-capable")).toHaveAttribute("content", "yes");
  await expect(meta("mobile-web-app-capable")).toHaveAttribute("content", "yes");
  await expect(meta("apple-mobile-web-app-title")).toHaveAttribute("content", "GameOn");
  await expect(meta("apple-mobile-web-app-status-bar-style")).toHaveAttribute("content", "black-translucent");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "assets/icons/apple-touch-icon.png");
  note("viewport-fit=cover, apple-mobile-web-app-capable yes, title GameOn, black-translucent status bar, apple-touch-icon 180x180");
  expect(browserErrors).toEqual([]);
});

test("every icon loads at the size it claims, and reads at home-screen size", async ({ page, shot, note, browserErrors }) => {
  await page.goto(home);
  const { href, json: m } = await manifestOf(page);
  const touch = await page.locator('link[rel="apple-touch-icon"]').evaluate(l => l.href);
  const favicon = await page.locator('link[rel="icon"]').evaluate(l => l.href);
  const list = [
    ...m.icons.map(i => ({ url: new URL(i.src, href).href, size: Number(i.sizes.split("x")[0]), label: `${i.sizes} ${i.purpose}` })),
    { url: touch, size: 180, label: "apple-touch-icon" },
    { url: favicon, size: 32, label: "favicon" }
  ];
  for (const icon of list) {
    const res = await page.request.get(icon.url);
    expect(res.status(), icon.url).toBe(200);
    expect(res.headers()["content-type"], icon.url).toBe("image/png");
  }
  // A gallery of the icons at the sizes people see them: 60 px on an iPhone home screen,
  // a round mask on Android, and the full 512.
  const dims = await page.evaluate(async list => {
    document.body.innerHTML = "";
    document.body.style.cssText = "margin:0;padding:24px;background:#2b4a6f;color:#fff;font:800 14px system-ui;display:flex;flex-wrap:wrap;gap:24px;align-items:end";
    const out = [];
    for (const icon of list) {
      const img = new Image();
      img.src = icon.url;
      await img.decode();
      out.push({ label: icon.label, w: img.naturalWidth, h: img.naturalHeight });
    }
    const add = (src, px, radius, caption) => {
      const fig = document.createElement("figure");
      fig.style.cssText = "margin:0;display:grid;gap:6px;justify-items:center";
      fig.innerHTML = `<img src="${src}" width="${px}" height="${px}" style="border-radius:${radius}"><figcaption>${caption}</figcaption>`;
      document.body.append(fig);
    };
    const find = l => list.find(i => i.label === l).url;
    add(find("apple-touch-icon"), 60, "13px", "iPhone, 60 px");
    add(find("192x192 any"), 96, "22px", "192");
    add(find("512x512 maskable"), 96, "50%", "maskable, round");
    add(find("favicon"), 32, "0", "favicon");
    add(find("512x512 any"), 256, "56px", "512");
    await Promise.all([...document.images].map(i => i.decode()));
    return out;
  }, list);
  for (const d of dims) {
    const want = list.find(i => i.label === d.label).size;
    expect([d.w, d.h], d.label).toEqual([want, want]);
  }
  note(dims.map(d => `${d.label} ${d.w}x${d.h}`).join(", "));
  await shot("icons");
  expect(browserErrors).toEqual([]);
});

test("Chrome finds nothing stopping the arcade from installing", async ({ page, note, browserErrors }) => {
  await page.goto(home);
  const cdp = await page.context().newCDPSession(page);
  const manifest = await cdp.send("Page.getAppManifest");
  expect(manifest.errors).toEqual([]);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
  note(`Page.getInstallabilityErrors: none (manifest ${new URL(manifest.url).pathname})`);
  expect(browserErrors).toEqual([]);
});

// Everything matching the selectors, that is on screen, sits inside the safe area (on the
// edges asked for: a scrolled list only needs its bottom checked).
async function outsideSafeArea(page, selectors, shape, edges = ["top", "right", "bottom", "left"]) {
  return page.evaluate(({ selectors, shape, edges }) => {
    const { width, height, insets } = shape;
    const bad = [];
    for (const el of document.querySelectorAll(selectors)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
      const name = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`;
      const on = e => edges.includes(e);
      if (on("top") && r.top < insets.top - 0.5) bad.push(`${name} top ${r.top} < ${insets.top}`);
      if (on("left") && r.left < insets.left - 0.5) bad.push(`${name} left ${r.left} < ${insets.left}`);
      if (on("right") && r.right > width - insets.right + 0.5) bad.push(`${name} right ${r.right} > ${width - insets.right}`);
      if (on("bottom") && r.bottom > height - insets.bottom + 0.5) bad.push(`${name} bottom ${r.bottom} > ${height - insets.bottom}`);
    }
    return bad;
  }, { selectors, shape, edges });
}

async function asPhone(page, shape) {
  await page.setViewportSize({ width: shape.width, height: shape.height });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: shape.insets });
}

const BAR = ".bar > *, #frame";
const HEAD = dialog => `${dialog} .switch-head, ${dialog} .switch-head .btn`;

for (const [label, shape] of [["upright", PORTRAIT], ["sideways", LANDSCAPE]]) {
  test(`held ${label} with a notch, the player bar, game and switcher stay in the safe area`, async ({ page, shot, note, browserErrors }, info) => {
    test.skip(info.project.name !== "phone", "phone insets");
    await asPhone(page, shape);
    await page.goto(`${home}#${local.slug}`);
    await expect(page.locator("#bar-title")).toHaveText(local.title);
    const pad = await page.locator(".bar").evaluate(b => getComputedStyle(b).paddingTop);
    expect(pad).toBe(`${shape.insets.top}px`); // the insets really reach the page
    expect(await outsideSafeArea(page, BAR, shape)).toEqual([]);
    const frame = await page.locator("#frame").boundingBox();
    note(`${shape.width}x${shape.height}, insets ${JSON.stringify(shape.insets)}: game frame ${Math.round(frame.x)},${Math.round(frame.y)} ${Math.round(frame.width)}x${Math.round(frame.height)}`);
    await shot(`player-${label}`);

    // The list of games scrolls, so: the heading and Close clear the notch at the top, and
    // scrolled to the end, the panel's last row clears the home bar.
    await page.locator("#switch-btn").click();
    await expect(page.locator("#switcher")).toBeVisible();
    expect(await outsideSafeArea(page, HEAD("#switcher"), shape)).toEqual([]);
    await shot(`switcher-${label}`);
    await page.locator("#switcher").evaluate(s => { s.scrollTop = s.scrollHeight; });
    expect(await outsideSafeArea(page, "#switcher .switch-panel, #switch-grid .mini:last-child", shape, ["bottom", "left", "right"])).toEqual([]);
    await page.locator("#close-switch").click();

    if (versioned) {
      await page.goto(home);
      await page.locator(`#shelf .cart[href="#${versioned.slug}"]`).click();
      await expect(page.locator("#chooser")).toBeVisible();
      expect(await outsideSafeArea(page, HEAD("#chooser"), shape)).toEqual([]);
      await page.locator("#chooser").evaluate(s => { s.scrollTop = s.scrollHeight; });
      expect(await outsideSafeArea(page, "#chooser .switch-panel", shape, ["bottom", "left", "right"])).toEqual([]);
      note(`${versioned.title}'s version chooser clears the insets too`);
    }
    expect(browserErrors).toEqual([]);
  });
}

test("held upright with a notch, the arcade home stays in the safe area", async ({ page, shot, browserErrors }, info) => {
  test.skip(info.project.name !== "phone", "phone insets");
  await asPhone(page, PORTRAIT);
  await page.goto(home);
  await expect(page.locator("#shelf .cart")).toHaveCount(games.length);
  expect(await outsideSafeArea(page, ".wordmark, .gh-home, .mode-switch, .make, .gob-ctl", PORTRAIT)).toEqual([]);
  await shot("home-upright");
  expect(browserErrors).toEqual([]);
});
