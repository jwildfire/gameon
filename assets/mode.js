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
  win.gameonMode = { get: get, set: set };

  // The switch's look, shared by every page that has one. Chunky, like the arcade's buttons.
  var css = doc.createElement("style");
  css.textContent = [
    ".mode-switch{display:inline-flex;flex-shrink:0;padding:3px;gap:2px;border:2.5px solid var(--ink,#1d1a2f);border-radius:999px;background:var(--card,#fffdf6)}",
    ".mode-switch button{height:30px;padding:0 11px;border:0;border-radius:999px;background:transparent;color:var(--ink,#1d1a2f);font:800 14px/1 var(--body,system-ui,sans-serif);cursor:pointer}",
    ".mode-switch button:hover{background:var(--wall,#ffd23f)}",
    "html[data-mode=normal] .mode-switch [data-mode-set=normal],html[data-mode=weird] .mode-switch [data-mode-set=weird]{background:var(--ink,#1d1a2f);color:var(--wall,#ffd23f)}",
    "html[data-mode=weird] .mode-switch [data-mode-set=weird]{background:linear-gradient(90deg,#ff5f6d,#ffc371,#7dff6b,#3fd8ff,#b48cff);color:var(--ink,#1d1a2f)}",
    "@media (max-width:520px){.mode-switch button{padding:0 8px;font-size:13px}}"
  ].join("\n");
  (doc.head || root).appendChild(css);

  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-mode-set]") : null;
    if (b) set(b.getAttribute("data-mode-set"));
  });
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", sync); else sync();
})(window, document);
