/* GameOn's Normal | Weird switch (#134).
 *
 * Load it in <head> without defer, so <html data-mode="normal|weird"> is set before the page
 * paints. Normal is the default: the yellow wall and the fixed tagline. Weird turns on the
 * trippy backgrounds (assets/backgrounds.js) and the rotating taglines, and later differences
 * can hang off the same switch:
 *
 *   window.gameonMode.get()            "normal" or "weird"
 *   window.gameonMode.set("weird")     saves it and fires "gameon:mode" on document (and window)
 *   document.addEventListener("gameon:mode", e => e.detail.mode)
 *   CSS: html[data-mode="weird"] .thing { ... }
 *
 * Any <button data-mode-set="normal|weird"> becomes part of the switch. The choice is saved as
 * localStorage gameon.arcade.mode. ?mode=weird or ?mode=normal in the URL sets it too.
 */
(function (win, doc) {
  "use strict";
  var KEY = "gameon.arcade.mode", root = doc.documentElement;
  function clean(m) { return m === "weird" ? "weird" : "normal"; }
  function stored() { try { return clean(win.localStorage.getItem(KEY)); } catch (e) { return "normal"; } }
  function save(m) { try { win.localStorage.setItem(KEY, m); } catch (e) {} }

  var fromUrl = /[?&]mode=(normal|weird)\b/.exec(win.location.search);
  if (fromUrl) save(fromUrl[1]);
  root.setAttribute("data-mode", fromUrl ? fromUrl[1] : stored());

  function get() { return clean(root.getAttribute("data-mode")); }
  function sync() {
    var m = get(), btns = doc.querySelectorAll("[data-mode-set]");
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute("aria-pressed", String(btns[i].getAttribute("data-mode-set") === m));
  }
  function set(m) {
    m = clean(m);
    save(m);
    if (m === get()) return;
    root.setAttribute("data-mode", m);
    sync();
    var e;
    try { e = new CustomEvent("gameon:mode", { bubbles: true, detail: { mode: m } }); }
    catch (x) { e = doc.createEvent("CustomEvent"); e.initCustomEvent("gameon:mode", true, false, { mode: m }); }
    doc.dispatchEvent(e);
  }

  // Shuffle (#138): Normal mode's wall gets a colour and pattern from this list; Weird mode
  // moves to the next trippy background. Every wall is light, so the dark text stays readable.
  // The pick is saved as gameon.arcade.wall and applied here, before the page paints.
  var WALL_KEY = "gameon.arcade.wall";
  var INK = "rgba(29,26,47,";
  var WALLS = [
    { id: "sunny", color: "#ffd23f" },
    { id: "sunny-dots", color: "#ffd23f", image: "radial-gradient(" + INK + ".16) 2.5px, transparent 3px)", size: "24px 24px" },
    { id: "mint-stripes", color: "#a7f3d0", image: "repeating-linear-gradient(45deg, " + INK + ".08) 0 12px, transparent 12px 28px)" },
    { id: "bubblegum-checks", color: "#ffc2dc", image: "conic-gradient(" + INK + ".07) 25%, transparent 0 50%, " + INK + ".07) 0 75%, transparent 0)", size: "44px 44px" },
    { id: "sky-grid", color: "#a5dcff", image: "linear-gradient(" + INK + ".1) 2px, transparent 2px), linear-gradient(90deg, " + INK + ".1) 2px, transparent 2px)", size: "36px 36px" },
    { id: "lavender-zigzag", color: "#d6c6ff", image: "linear-gradient(135deg, " + INK + ".08) 25%, transparent 25%), linear-gradient(225deg, " + INK + ".08) 25%, transparent 25%)", size: "40px 20px" },
    { id: "tangerine-dots", color: "#ffbf80", image: "radial-gradient(#fffdf6 3px, transparent 3.5px)", size: "28px 28px" },
    { id: "lime-plaid", color: "#dcf7a3", image: "repeating-linear-gradient(0deg, " + INK + ".06) 0 6px, transparent 6px 30px), repeating-linear-gradient(90deg, " + INK + ".06) 0 6px, transparent 6px 30px)" },
    { id: "peach-bubbles", color: "#ffd0b8", image: "radial-gradient(circle at 30% 30%, #fffdf6 0 6px, transparent 7px), radial-gradient(circle at 70% 75%, rgba(255,255,255,.6) 0 10px, transparent 11px)", size: "60px 60px" },
    { id: "aqua-confetti", color: "#b8f1ec", image: "radial-gradient(#ff6b4a 2px, transparent 2.5px), radial-gradient(#8b5cf6 2px, transparent 2.5px), radial-gradient(#ffd23f 2.5px, transparent 3px)", size: "38px 38px, 52px 52px, 30px 30px", position: "0 0, 12px 20px, 22px 6px" },
    { id: "lemon-triangles", color: "#fff1a1", image: "linear-gradient(60deg, " + INK + ".07) 25%, transparent 25.5%, transparent 75%, " + INK + ".07) 75%), linear-gradient(120deg, " + INK + ".07) 25%, transparent 25.5%, transparent 75%, " + INK + ".07) 75%)", size: "40px 70px" },
    { id: "cream-sprinkles", color: "#fff6e0", image: "linear-gradient(45deg, #ff6b9c 0 3px, transparent 3px), linear-gradient(-45deg, #60a5fa 0 3px, transparent 3px), linear-gradient(90deg, #34d399 0 3px, transparent 3px)", size: "30px 30px, 46px 46px, 38px 38px", position: "4px 8px, 20px 26px, 30px 4px" }
  ];
  function findWall(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return WALLS[i]; return WALLS[0]; }
  function storedWall() { try { return findWall(win.localStorage.getItem(WALL_KEY)); } catch (e) { return WALLS[0]; } }
  function applyWall(w) {
    root.style.setProperty("--wall", w.color);
    root.style.setProperty("--wall-image", w.image || "none");
    root.style.setProperty("--wall-size", w.size || "auto");
    root.style.setProperty("--wall-position", w.position || "0 0");
    root.setAttribute("data-wall", w.id);
  }
  applyWall(storedWall());
  function shuffle() {
    if (get() === "weird") {
      var r = win.GameOnBackgrounds && win.GameOnBackgrounds.runner;
      if (!r) return null;
      if (r.shuffle) r.shuffle(); else if (r.next) r.next();
      return r.id;
    }
    var now = root.getAttribute("data-wall"), pick = now;
    while (pick === now) pick = WALLS[Math.floor(Math.random() * WALLS.length)].id;
    var w = findWall(pick);
    applyWall(w);
    try { win.localStorage.setItem(WALL_KEY, w.id); } catch (e) {}
    return w.id;
  }
  win.gameonMode = { get: get, set: set, shuffle: shuffle, walls: WALLS.map(function (w) { return w.id; }) };

  // The switch's look, shared by every page that has one. Chunky, like the arcade's buttons.
  var css = doc.createElement("style");
  css.textContent = [
    ".mode-switch{display:inline-flex;flex-shrink:0;padding:3px;gap:2px;border:2.5px solid var(--ink,#1d1a2f);border-radius:999px;background:var(--card,#fffdf6)}",
    ".mode-switch button{height:30px;padding:0 11px;border:0;border-radius:999px;background:transparent;color:var(--ink,#1d1a2f);font:800 14px/1 var(--body,system-ui,sans-serif);cursor:pointer}",
    ".mode-switch button:hover{background:var(--wall,#ffd23f)}",
    "html[data-mode=normal] .mode-switch [data-mode-set=normal],html[data-mode=weird] .mode-switch [data-mode-set=weird]{background:var(--ink,#1d1a2f);color:var(--wall,#ffd23f)}",
    "html[data-mode=weird] .mode-switch [data-mode-set=weird]{background:linear-gradient(90deg,#ff5f6d,#ffc371,#7dff6b,#3fd8ff,#b48cff);color:var(--ink,#1d1a2f)}",
    "@media (max-width:520px){.mode-switch button{padding:0 8px;font-size:13px}}",
    "html[data-mode=normal] body{background-color:var(--wall);background-image:var(--wall-image,none);background-size:var(--wall-size,auto);background-position:var(--wall-position,0 0)}"

  ].join("\n");
  (doc.head || root).appendChild(css);

  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-mode-set]") : null;
    if (b) set(b.getAttribute("data-mode-set"));
    var s = e.target && e.target.closest ? e.target.closest("[data-shuffle]") : null;
    if (s) shuffle();
  });
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", sync); else sync();
})(window, document);
