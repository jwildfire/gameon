// Big Weird Dig: screens, drawing, sound, controls and saves. The rules live in engine.js.
(function () {
  "use strict";
  var E = window.BWD, A = window.BWDArt, Bot = window.BWDBot;
  var COLS = E.COLS, ROWS = E.ROWS, T = 48, W = COLS * T, H = ROWS * T, DT = E.DT;
  var $ = function (id) { return document.getElementById(id); };
  var ITEM = {};
  E.ITEMS.forEach(function (it, i) { ITEM[it.id] = it; it.n = i; });

  // ---------- saves (all under gameon.big-weird-dig.) ----------
  var KEY = "gameon.big-weird-dig.";
  function load(k, dflt) {
    try { var v = localStorage.getItem(KEY + k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; }
  }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* storage blocked: play on */ } }
  var museum = load("museum", []);
  if (!Array.isArray(museum)) museum = [];
  var progress = load("progress", { unlocked: 1, stars: {} });
  if (!progress || typeof progress !== "object") progress = { unlocked: 1, stars: {} };
  progress.stars = progress.stars || {};
  progress.unlocked = Math.max(1, Math.min(E.LEVELS.length, progress.unlocked | 0));
  var soundOn = load("sound", true) !== false;

  // ---------- sound (made in the browser, nothing to load) ----------
  var Sound = (function () {
    var ac = null, master = null, eng = null, noiseBuf = null;
    function init() {
      if (ac) { if (ac.state === "suspended") ac.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC(); } catch (e) { return; }
      master = ac.createGain(); master.gain.value = soundOn ? 0.55 : 0; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // the engine: two low buzzes through a muffler
      var o1 = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o1.type = "sawtooth"; o1.frequency.value = 46; o2.type = "square"; o2.frequency.value = 23.5;
      lp.type = "lowpass"; lp.frequency.value = 260; g.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
      o1.start(); o2.start();
      eng = { o1: o1, o2: o2, lp: lp, g: g };
    }
    function setOn(on) { if (master) master.gain.setTargetAtTime(on ? 0.55 : 0, ac.currentTime, 0.02); }
    function engine(level, pitch) {
      if (!eng) return;
      var t = ac.currentTime;
      eng.g.gain.setTargetAtTime(level, t, 0.06);
      eng.o1.frequency.setTargetAtTime(46 * pitch, t, 0.08);
      eng.o2.frequency.setTargetAtTime(23.5 * pitch, t, 0.08);
      eng.lp.frequency.setTargetAtTime(220 + 200 * pitch, t, 0.08);
    }
    function tone(type, f0, f1, dur, vol, delay) {
      if (!ac) return;
      var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, type, freq, vol, delay, q) {
      if (!ac) return;
      var t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.05);
    }
    return {
      init: init, setOn: setOn, engine: engine,
      crunch: function (h) { noise(0.07 + Math.random() * 0.04, "bandpass", [0, 900, 700, 1300, 1000][h] * (0.8 + Math.random() * 0.4), 0.35, 0, 1.2); },
      tada: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, 0, i === 3 ? 0.5 : 0.14, 0.3, i * 0.09); }); tone("sine", 2093, 0, 0.4, 0.1, 0.4); },
      can: function () { [420, 340, 280].forEach(function (f, i) { tone("sine", f, f * 0.7, 0.09, 0.3, i * 0.08); }); },
      bonk: function () { tone("sine", 620, 140, 0.22, 0.45); noise(0.08, "lowpass", 600, 0.3); },
      moleBonk: function () { tone("square", 300, 90, 0.18, 0.2); tone("sine", 1400, 1900, 0.12, 0.15, 0.15); tone("sine", 1700, 2300, 0.1, 0.12, 0.3); },
      wobble: function () { for (var i = 0; i < 4; i++) noise(0.05, "bandpass", 300, 0.25, i * 0.14, 3); },
      crash: function () { noise(0.4, "lowpass", 420, 0.6); tone("sine", 90, 40, 0.3, 0.4); },
      blade: function () { noise(0.14, "highpass", 1800, 0.25); tone("triangle", 300, 160, 0.1, 0.15); },
      shove: function () { tone("sine", 500, 900, 0.12, 0.3); },
      giggle: function () { [880, 990, 880, 1050].forEach(function (f, i) { tone("sine", f, 0, 0.06, 0.12, i * 0.07); }); },
      push: function () { noise(0.18, "lowpass", 300, 0.3); },
      win: function () { [392, 523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone("square", f, 0, 0.16, 0.13, i * 0.11); }); },
      empty: function () { [0, 0.18, 0.36, 0.6].forEach(function (d, i) { tone("square", 120 - i * 18, 60, 0.12, 0.18, d); }); },
      click: function () { tone("triangle", 660, 0, 0.05, 0.15); }
    };
  })();

  // ---------- canvas and layout ----------
  var stage = $("stage"), cv = $("game"), ctx = cv.getContext("2d");
  var hud = $("hud"), pad = $("pad"), tip = $("tip");
  var touchMode = !!(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches);
  var view = { tile: 30, dpr: 1, left: 0, top: 0 };

  // jeremy.v2: the safe-area insets (notch, home bar), so the HUD's Pause stays 8 px clear of them
  function safeInsets() {
    var cs = getComputedStyle($("safe-probe")), px = function (v) { return parseFloat(v) || 0; };
    return { t: px(cs.paddingTop), r: px(cs.paddingRight), b: px(cs.paddingBottom), l: px(cs.paddingLeft) };
  }

  function layout() {
    var vw = innerWidth, vh = innerHeight, landscape = vw > vh;
    document.body.classList.toggle("landscape", landscape);
    // The HUD is a 48 px row (Pause is 48 x 48) 8 px below the top edge and the safe area, with 8 px under it.
    var safe = safeInsets(), edge = 8 + Math.max(safe.l, safe.r);
    var hudH = 64 + safe.t, gap = 8;
    var padH = touchMode && !landscape ? Math.max(150, Math.min(220, vh * 0.25)) : 0;
    var sidePad = touchMode && landscape ? 160 : 0;
    var tile = Math.floor(Math.min((vw - 12 - sidePad * 2) / COLS, (vh - hudH - gap - padH - 8) / ROWS) * 4) / 4;
    tile = Math.max(10, tile);
    var bw = tile * COLS, bh = tile * ROWS;
    view.tile = tile;
    view.left = Math.round((vw - bw) / 2);
    view.top = Math.round(hudH + gap / 2 + Math.max(0, (vh - hudH - gap - padH - 8 - bh) / 2) * (touchMode ? 0.3 : 0.5));
    stage.style.left = view.left + "px"; stage.style.top = view.top + "px";
    stage.style.width = bw + "px"; stage.style.height = bh + "px";
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(bw * view.dpr); cv.height = Math.round(bh * view.dpr);
    var hw = Math.min(vw - edge * 2, Math.max(bw, Math.min(vw - edge * 2, 640)));
    hud.style.left = Math.round((vw - hw) / 2) + "px"; hud.style.width = Math.floor(hw) + "px";
    hud.style.top = Math.round(8 + safe.t) + "px";
    hud.style.setProperty("--hud-font", (vw < 400 ? 13 : 15) + "px");
    hud.style.setProperty("--fuel-w", (vw < 400 ? 84 : 130) + "px");
    hud.style.setProperty("--find-icon", (vw < 400 ? 22 : 26) + "px");
    tip.style.left = view.left + "px"; tip.style.width = bw + "px"; tip.style.top = (view.top + tile * 1.3) + "px";
    tip.style.setProperty("--tip-font", Math.round(Math.max(12, Math.min(19, tile * 0.68))) + "px");
    var ps = landscape ? Math.min(150, vh * 0.42) : Math.min(180, Math.max(132, padH - 16));
    pad.style.setProperty("--dpad", ps + "px");
    pad.style.setProperty("--blade", Math.round(ps * 0.62) + "px");
    pad.hidden = !(touchMode && (mode === "play"));
  }
  addEventListener("resize", layout);

  // ---------- the world view: dirt, tunnels, effects ----------
  var LOOK = {
    1: { base: "#8b5a2b", dark: "#6e4420", light: "#a8733f" },
    2: { base: "#c0683a", dark: "#9c5028", light: "#d98552" },
    3: { base: "#7d6d62", dark: "#5f524a", light: "#9a8b80" },
    4: { base: "#8a3b2a", dark: "#6b2a1c", light: "#c2562f" }
  };
  var TUNNEL = ["#3b2416", "#3b2416", "#3a2318", "#33221a", "#2f211b", "#2b201c", "#2a1f26", "#341a14"];

  var V = null; // the current view: { s, dirt, shade, bg, cleared, fx, ... }
  function makeView(s) {
    var v = { s: s, cleared: new Uint8Array(COLS * ROWS), parts: [], texts: [], last: {}, shake: 0, crunchT: 0 };
    v.dirt = document.createElement("canvas"); v.dirt.width = W; v.dirt.height = H;
    v.shade = document.createElement("canvas"); v.shade.width = W; v.shade.height = H;
    v.bg = document.createElement("canvas"); v.bg.width = W; v.bg.height = H;
    var R = E.rng(s.n * 7777 + 3), L = s.L, i, c, r;
    // tunnel background
    var b = v.bg.getContext("2d");
    b.fillStyle = TUNNEL[s.n - 1]; b.fillRect(0, 0, W, H);
    for (i = 0; i < 260; i++) { b.fillStyle = R() < 0.5 ? "rgba(0,0,0,0.18)" : "rgba(255,220,180,0.05)"; b.beginPath(); b.arc(R() * W, T + R() * (H - T), 2 + R() * 6, 0, 7); b.fill(); }
    // dirt
    var d = v.dirt.getContext("2d");
    for (r = 1; r < ROWS; r++) {
      var h = s.grid[r * COLS] === E.STONE ? hardRow(s, r) : hardRow(s, r);
      d.fillStyle = LOOK[h].base; d.fillRect(0, r * T, W, T + 1);
    }
    // wavy edges between bands
    for (var k = 1; k < L.bands.length; k++) {
      var br = L.bands[k][0], lk = LOOK[L.bands[k][1]];
      d.fillStyle = lk.base; d.beginPath(); d.moveTo(0, br * T + 6);
      for (var x = 0; x <= W; x += 24) d.lineTo(x, br * T - 4 + Math.sin(x * 0.05 + k) * 7 + R() * 4);
      d.lineTo(W, br * T + 10); d.closePath(); d.fill();
      d.strokeStyle = "rgba(0,0,0,0.18)"; d.lineWidth = 3; d.stroke();
    }
    // specks, pebbles and the level's own bits
    for (i = 0; i < 900; i++) {
      var px = R() * W, py = T + R() * (H - T), lk2 = LOOK[hardRow(s, Math.floor(py / T))];
      d.fillStyle = R() < 0.55 ? lk2.dark : lk2.light;
      d.beginPath(); d.arc(px, py, 1 + R() * (R() < 0.08 ? 5 : 2.4), 0, 7); d.fill();
    }
    for (i = 0; i < 30; i++) {
      px = R() * W; py = T * 1.5 + R() * (H - T * 2);
      d.strokeStyle = "rgba(0,0,0,0.12)"; d.lineWidth = 2; d.beginPath(); d.moveTo(px, py);
      d.quadraticCurveTo(px + 10, py - 6 + R() * 12, px + 20, py + R() * 6); d.stroke();
    }
    if (L.stoneLook === "root" || s.n <= 2) {
      d.strokeStyle = "rgba(60,32,14,0.55)"; d.lineCap = "round";
      for (i = 0; i < (L.stoneLook === "root" ? 14 : 5); i++) {
        px = R() * W; d.lineWidth = 3 + R() * 3; d.beginPath(); d.moveTo(px, T); var yy = T;
        for (var j = 0; j < 4; j++) { var nx = px + (R() - 0.5) * 60, ny = yy + 20 + R() * 40; d.quadraticCurveTo(px + (R() - 0.5) * 40, (yy + ny) / 2, nx, ny); px = nx; yy = ny; }
        d.stroke();
      }
    }
    if (L.stoneLook === "fossil") for (i = 0; i < 16; i++) { px = R() * W; py = T * 2 + R() * (H - T * 3); d.strokeStyle = "rgba(240,230,210,0.35)"; d.lineWidth = 2; d.beginPath(); for (var a = 0; a < 9; a += 0.5) d.lineTo(px + Math.cos(a) * a * 1.1, py + Math.sin(a) * a * 1.1); d.stroke(); }
    if (L.stoneLook === "crystal") for (i = 0; i < 40; i++) { px = R() * W; py = T * 2 + R() * (H - T * 2); d.fillStyle = ["rgba(126,240,255,0.6)", "rgba(196,139,255,0.6)"][i % 2]; d.beginPath(); d.moveTo(px, py - 5); d.lineTo(px + 3, py); d.lineTo(px, py + 5); d.lineTo(px - 3, py); d.fill(); }
    if (L.stoneLook === "lava") for (i = 0; i < 50; i++) { px = R() * W; py = T * 6 + R() * (H - T * 6); d.fillStyle = "rgba(255," + (90 + R() * 100 | 0) + ",40," + (0.3 + R() * 0.5) + ")"; d.beginPath(); d.arc(px, py, 1.5 + R() * 2.5, 0, 7); d.fill(); }
    // grass (or an old tunnel's edge) along the top of the dirt
    if (s.n <= 2) {
      d.fillStyle = "#4fb848"; d.fillRect(0, T - 2, W, 10);
      d.fillStyle = "#3d9a3a";
      for (x = 0; x < W; x += 9) { d.beginPath(); d.moveTo(x, T + 6); d.lineTo(x + 4, T - 8 - R() * 6); d.lineTo(x + 8, T + 6); d.fill(); }
    } else {
      d.fillStyle = "rgba(0,0,0,0.3)"; d.fillRect(0, T, W, 6);
    }
    // stones
    for (r = 1; r < ROWS; r++) for (c = 0; c < COLS; c++) if (s.grid[r * COLS + c] === E.STONE) A.drawStone(d, c * T + T / 2, r * T + T / 2, T * 0.98, L.stoneLook, c * 31 + r * 7);
    var sh = v.shade.getContext("2d");
    sh.fillStyle = "rgba(0,0,0,0.42)"; sh.fillRect(0, T, W, H - T);
    // already-open cells (mole burrows)
    for (r = 1; r < ROWS; r++) for (c = 0; c < COLS; c++) if (s.grid[r * COLS + c] === E.OPEN) clearCell(v, c, r);
    v.last.dozer = { x: s.dozer.x, y: s.dozer.y };
    return v;
  }
  function hardRow(s, r) {
    var h = s.L.bands[0][1];
    for (var i = 0; i < s.L.bands.length; i++) if (r >= s.L.bands[i][0]) h = s.L.bands[i][1];
    return h;
  }
  function eraseRect(v, x, y, w, h, rad) {
    [v.dirt, v.shade].forEach(function (cnv, i) {
      var g = cnv.getContext("2d");
      g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
      g.beginPath(); A.rr(g, x, y + (i ? T * 0.12 : 0), w, h, rad); g.fill(); g.restore();
    });
  }
  function eraseAt(v, tx, ty) {
    var s = T * 0.86;
    eraseRect(v, tx * T + T / 2 - s / 2, ty * T + T / 2 - s / 2, s, s, T * 0.3);
  }
  function clearCell(v, c, r) {
    if (r < 1) { v.cleared[r * COLS + c] = 1; return; }
    v.cleared[r * COLS + c] = 1;
    eraseAt(v, c, r);
    var s = T * 0.86, o = (T - s) / 2;
    if (c + 1 < COLS && v.s.grid[r * COLS + c + 1] === E.OPEN) eraseRect(v, c * T + T / 2, r * T + o, T, s, 2);
    if (c > 0 && v.s.grid[r * COLS + c - 1] === E.OPEN) eraseRect(v, c * T - T / 2, r * T + o, T, s, 2);
    if (r + 1 < ROWS && v.s.grid[(r + 1) * COLS + c] === E.OPEN) eraseRect(v, c * T + o, r * T + T / 2, s, T, 2);
    if (r > 1 && v.s.grid[(r - 1) * COLS + c] === E.OPEN) eraseRect(v, c * T + o, r * T - T / 2, s, T, 2);
  }
  function trail(v, key, x, y) {
    var l = v.last[key] || { x: x, y: y }, dx = x - l.x, dy = y - l.y, n = Math.ceil(Math.hypot(dx, dy) / 0.12);
    if (n > 15) { l = { x: x, y: y }; dx = dy = 0; n = 1; } // jumped (a restart): don't carve a line
    for (var i = 1; i <= n; i++) eraseAt(v, l.x + dx * i / n, l.y + dy * i / n);
    v.last[key] = { x: x, y: y };
  }

  function burst(v, x, y, n, cols, spd, life, grav) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.3 + Math.random()) * spd;
      v.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - spd * 0.4, life: life * (0.6 + Math.random() * 0.6), max: life,
        r: 2 + Math.random() * 4, col: cols[(Math.random() * cols.length) | 0], g: grav == null ? 600 : grav });
    }
  }
  function say(v, text, x, y, col, size) { v.texts.push({ text: text, x: Math.max(70, Math.min(W - 70, x)), y: Math.max(40, y), t: 0, col: col || "#fff3d6", size: size || 22 }); }

  // ---------- game state ----------
  var mode = "title", level = 1, S = null, frozen = false, bot = null, botReveals = false, demo = null;
  var revealQueue = [], wonAt = 0, endT = 0;

  function startLevel(n, runSeed) {
    Sound.init();
    level = n; S = E.create(n, runSeed != null ? runSeed : (Math.random() * 1e6) | 0); V = makeView(S); demo = null;
    revealQueue = []; wonAt = 0;
    showOnly(null);
    hud.hidden = false;
    setMode("play");
    $("hud-level").textContent = n + ". " + S.L.name + " · " + S.L.depth + " ft";
    buildHudFinds();
    showTip(S.L.tip, 3800);
    updateHud();
  }
  var modeAt = 0; // jeremy.v2: when the mode last changed, so a blade press as a level ends doesn't skip its screen
  function setMode(m) { mode = m; modeAt = performance.now(); layout(); if (m !== "play") Sound.engine(0, 1); }

  var tipTimer = 0;
  function showTip(text, ms) {
    tip.textContent = text; tip.classList.remove("fade");
    clearTimeout(tipTimer); tipTimer = setTimeout(function () { tip.classList.add("fade"); }, ms || 2500);
  }

  function buildHudFinds() {
    var box = $("hud-finds"); box.innerHTML = "";
    S.finds.forEach(function (f) {
      var c = document.createElement("canvas"); c.width = 56; c.height = 56; c.dataset.id = f.id;
      box.appendChild(c);
    });
    drawHudFinds();
  }
  function drawHudFinds() {
    var cs = $("hud-finds").querySelectorAll("canvas");
    S.finds.forEach(function (f, i) {
      var g = cs[i].getContext("2d"); g.clearRect(0, 0, 56, 56);
      if (f.got) A.drawItem(g, f.id, 28, 28, 46, "color");
      else { A.drawItem(g, f.id, 28, 28, 46, "sil", "rgba(42,22,12,0.35)"); g.fillStyle = "#2a160c"; g.font = "900 26px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 28, 30); }
    });
  }
  var lastFuelShown = -1;
  function updateHud() {
    var f = Math.max(0, Math.round(S.fuel));
    if (f !== lastFuelShown) {
      lastFuelShown = f;
      $("fuel-bar").style.width = Math.max(0, Math.min(100, S.fuel)) + "%";
      $("fuel-label").textContent = "FUEL " + f;
      $("fuel").classList.toggle("low", S.fuel < 20);
    }
  }

  // ---------- input ----------
  var keyDirs = [], padDir = null, swipeDir = null, bladeQueued = false;
  // the main button on each menu screen, by mode: [screen, button]
  var MAIN = { title: ["title-screen", "play-btn"], paused: ["pause-screen", "resume-btn"], done: ["done-screen", "next-btn"], empty: ["empty-screen", "empty-retry-btn"] };
  var KEYMAP = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d", a: "l", d: "r", w: "u", s: "d", A: "l", D: "r", W: "u", S: "d" };
  addEventListener("keydown", function (e) {
    Sound.init();
    var k = KEYMAP[e.key];
    if (mode === "reveal") {
      if ((e.key === " " || e.key === "Enter") && revealReady()) { e.preventDefault(); closeReveal(); }
      return;
    }
    // jeremy.v2: Enter or Space presses the screen's main button, unless the player has tabbed to another one
    if ((e.key === " " || e.key === "Enter") && MAIN[mode]) {
      var screen = $(MAIN[mode][0]), on = document.activeElement;
      if (!screen.hidden && !(on && on.tagName === "BUTTON" && screen.contains(on))) {
        e.preventDefault();
        if (!e.repeat && performance.now() - modeAt > 450) { if (on && on.blur) on.blur(); $(MAIN[mode][1]).click(); }
        return;
      }
    }
    if (k) {
      e.preventDefault();
      if (keyDirs.indexOf(k) < 0) keyDirs.push(k);
      if (mode !== "play") return;
    } else if (e.key === " " || e.key === "x" || e.key === "X" || e.key === "Enter") {
      if (mode === "play") { e.preventDefault(); if (!e.repeat) bladeQueued = true; }
    } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (mode === "play") pause(); else if (mode === "paused") resume();
    } else if ((e.key === "r" || e.key === "R") && (mode === "play" || mode === "paused")) {
      startLevel(level);
    }
  });
  addEventListener("keyup", function (e) {
    var k = KEYMAP[e.key];
    if (k) keyDirs = keyDirs.filter(function (x) { return x !== k; });
  });
  addEventListener("blur", function () { keyDirs = []; padDir = null; swipeDir = null; if (mode === "play") pause(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && mode === "play") pause(); });

  function useTouch() {
    if (!touchMode) { touchMode = true; layout(); }
  }
  // d-pad: press anywhere on it and slide your thumb around
  var dpad = $("dpad"), dpadId = null;
  function dpadDir(e) {
    var r = dpad.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    if (x * x + y * y < (r.width * 0.1) * (r.width * 0.1)) return padDir;
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? "r" : "l") : (y > 0 ? "d" : "u");
  }
  function showPad() {
    dpad.querySelectorAll(".arm").forEach(function (a) { a.classList.toggle("on", a.dataset.dir === padDir); });
  }
  dpad.addEventListener("pointerdown", function (e) {
    e.preventDefault(); Sound.init(); dpadId = e.pointerId;
    try { dpad.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    padDir = dpadDir(e); showPad();
  });
  dpad.addEventListener("pointermove", function (e) { if (e.pointerId === dpadId) { padDir = dpadDir(e); showPad(); } });
  function dpadUp(e) { if (e.pointerId === dpadId) { dpadId = null; padDir = null; showPad(); } }
  dpad.addEventListener("pointerup", dpadUp); dpad.addEventListener("pointercancel", dpadUp);
  window.addEventListener("pointerup", dpadUp);
  var bladeBtn = $("btn-blade");
  bladeBtn.addEventListener("pointerdown", function (e) {
    e.preventDefault(); Sound.init(); bladeQueued = true; bladeBtn.classList.add("on");
    setTimeout(function () { bladeBtn.classList.remove("on"); }, 140);
  });
  // hold and slide on the dirt to drive; a quick tap is a blade push
  var swipe = null;
  stage.addEventListener("pointerdown", function (e) {
    if (mode !== "play") return;
    if (e.pointerType === "touch") useTouch();
    Sound.init();
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, t: performance.now() };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  });
  stage.addEventListener("pointermove", function (e) {
    if (!swipe || e.pointerId !== swipe.id) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (dx * dx + dy * dy > 16 * 16) {
      swipe.moved = true;
      swipeDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u");
      // re-centre so you can change direction with a small slide
      swipe.x = e.clientX - Math.sign(dx) * 8 * (Math.abs(dx) > Math.abs(dy) ? 1 : 0);
      swipe.y = e.clientY - Math.sign(dy) * 8 * (Math.abs(dx) > Math.abs(dy) ? 0 : 1);
    }
  });
  function swipeUp(e) {
    if (!swipe || e.pointerId !== swipe.id) return;
    if (!swipe.moved && performance.now() - swipe.t < 300) bladeQueued = true;
    swipe = null; swipeDir = null;
  }
  stage.addEventListener("pointerup", swipeUp); stage.addEventListener("pointercancel", swipeUp);
  addEventListener("touchstart", useTouch, { passive: true });

  function currentInput() {
    if (bot) return Bot.decide(S);
    var d = keyDirs.length ? keyDirs[keyDirs.length - 1] : (padDir || swipeDir || null);
    var b = bladeQueued; bladeQueued = false;
    return { dir: d, blade: b };
  }

  // ---------- events from the engine ----------
  function handle(ev) {
    var v = V;
    var px = function (t) { return t * T + T / 2; };
    switch (ev.t) {
      case "dig":
        if (ev.who === "dozer") burst(v, px(S.dozer.x), px(S.dozer.y), 3, [LOOK[ev.h].light, LOOK[ev.h].dark], 120, 0.5);
        break;
      case "find": {
        var it = ITEM[ev.id], isNew = museum.indexOf(ev.id) < 0;
        if (isNew) { museum.push(ev.id); save("museum", museum); }
        burst(v, px(ev.c), px(ev.r), 26, ["#fff36b", "#9b4dff", "#5fd35a", "#fff"], 260, 0.9, 200);
        say(v, "TA-DA!", px(ev.c), px(ev.r) - 20, "#fff36b", 30);
        Sound.tada();
        drawHudFinds();
        if (!bot || botReveals) revealQueue.push({ id: ev.id, isNew: isNew });
        break;
      }
      case "can":
        burst(v, px(ev.c), px(ev.r), 14, ["#ffe36b", "#e8392a"], 180, 0.6, 300);
        say(v, "+" + ev.fuel + " fuel", px(ev.c), px(ev.r) - 16, "#ffe36b");
        Sound.can();
        break;
      case "bonk":
        v.shake = ev.by === "boulder" ? 10 : 5;
        say(v, "BONK! -" + ev.fuel, px(ev.x), px(ev.y) - 22, "#ff8a6b", 24);
        Sound.bonk();
        if (ev.by === "mole") setTimeout(function () { if (mode === "play") Sound.giggle(); }, 200);
        break;
      case "moleBonk":
        say(v, "BONK!", px(ev.x), px(ev.y) - 22, "#7ef0ff", 26);
        burst(v, px(ev.x), px(ev.y), 10, ["#fff36b"], 160, 0.6, 100);
        Sound.moleBonk();
        break;
      case "shove":
        say(v, "SHOVE!", px(ev.x), px(ev.y) - 22, "#fff3d6", 20);
        Sound.shove();
        break;
      case "blade": Sound.blade(); break;
      case "wobble": Sound.wobble(); break;
      case "push": Sound.push(); break;
      case "break":
        v.shake = Math.max(v.shake, 6);
        burst(v, px(ev.c), ev.y * T + T / 2, 22, ["#8d929c", "#b9bec7", "#6f7480"], 220, 0.8);
        say(v, "KRUNCH!", px(ev.c), ev.y * T, "#e8eef4", 22);
        Sound.crash();
        break;
      case "win": wonAt = performance.now(); Sound.win(); break;
      case "empty":
        Sound.empty();
        setTimeout(function () { if (mode === "play" && S.lost) { setMode("empty"); showOnly("empty-screen"); } }, 1100);
        break;
    }
  }

  // ---------- reveal ----------
  var revealAt = 0, revealItem = null;
  function revealReady() { return performance.now() - revealAt > 450; }
  function openReveal(r) {
    revealItem = r; revealAt = performance.now();
    var it = ITEM[r.id];
    $("reveal-name").textContent = it.name;
    $("reveal-joke").textContent = it.joke;
    $("reveal-new").hidden = !r.isNew;
    setMode("reveal");
    showOnly("reveal-screen");
    $("reveal-btn").focus({ preventScroll: true });
  }
  function closeReveal() {
    Sound.click();
    if (mode !== "reveal") return;
    keyDirs = []; padDir = null; swipeDir = null;
    if (revealQueue.length) { openReveal(revealQueue.shift()); return; }
    showOnly(null);
    setMode("play");
  }
  $("reveal-btn").addEventListener("click", closeReveal);
  $("reveal-screen").addEventListener("pointerdown", function (e) { if (e.target === $("reveal-screen") && revealReady()) closeReveal(); });

  function finishLevel() {
    var startFuel = S.L.fuel, ratio = S.fuel / startFuel;
    var stars = ratio >= 0.5 ? 3 : ratio >= 0.2 ? 2 : 1;
    progress.stars[level] = Math.max(progress.stars[level] || 0, stars);
    if (level < E.LEVELS.length) progress.unlocked = Math.max(progress.unlocked, level + 1);
    save("progress", progress);
    $("done-title").textContent = ["Level clear!", "Dug it!", "Weird-tastic!"][stars - 1];
    $("done-stars").innerHTML = [1, 2, 3].map(function (i) { return '<span class="' + (i <= stars ? "on" : "") + '">★</span>'; }).join("");
    $("done-stars").dataset.stars = stars;
    var row = $("done-finds"); row.innerHTML = "";
    S.finds.forEach(function (f) { var c = document.createElement("canvas"); c.width = 108; c.height = 108; A.drawItem(c.getContext("2d"), f.id, 54, 54, 84, "color"); c.title = ITEM[f.id].name; row.appendChild(c); });
    $("done-fuel").textContent = "Fuel left: " + Math.round(S.fuel);
    $("done-bonks").textContent = "Bonks: " + S.bonks + (S.moleBonks ? " · Moles bonked by boulders: " + S.moleBonks : "");
    $("next-btn").textContent = level < E.LEVELS.length ? "Dig deeper" : "The bottom!";
    setMode("done");
    showOnly("done-screen");
  }

  // ---------- screens ----------
  var SCREENS = ["title-screen", "levels-screen", "museum-screen", "pause-screen", "reveal-screen", "done-screen", "empty-screen", "end-screen"];
  function showOnly(id) { SCREENS.forEach(function (s) { $(s).hidden = s !== id; }); }
  function toTitle() {
    S = null; hud.hidden = true; showOnly("title-screen"); setMode("title"); startDemo();
    drawHero($("title-hero"));
  }
  function pause() { if (mode !== "play") return; setMode("paused"); showOnly("pause-screen"); keyDirs = []; padDir = null; swipeDir = null; }
  function resume() { Sound.click(); showOnly(null); setMode("play"); }
  function openLevels(from) {
    Sound.click();
    var g = $("level-grid"); g.innerHTML = "";
    E.LEVELS.forEach(function (L, i) {
      var n = i + 1, b = document.createElement("button"), st = progress.stars[n] || 0;
      b.className = "lvl" + (st ? " done" : "");
      b.disabled = n > progress.unlocked;
      b.innerHTML = "<b>" + n + "</b><span>" + L.name + "</span><span>" + L.depth + " ft down</span><span class=st>" + (st ? "★★★".slice(0, st) + "☆☆☆".slice(0, 3 - st) : (n > progress.unlocked ? "locked" : "new!")) + "</span>";
      b.addEventListener("click", function () { startLevel(n); });
      g.appendChild(b);
    });
    $("levels-back").onclick = function () {
      Sound.click();
      if (from === "pause" || from === "done" || from === "empty") showOnly(from + "-screen"); else toTitle();
    };
    showOnly("levels-screen"); if (mode === "play") setMode("paused");
  }
  var museumFrom = "title";
  function openMuseum(from) {
    Sound.click(); museumFrom = from;
    var shelf = $("museum-shelf"); shelf.innerHTML = "";
    var narrow = innerWidth <= 420, cols = narrow ? 5 : 6;
    var cardW = Math.min(540, innerWidth - 28) - (narrow ? 24 : 44) - 14;
    // jeremy.v2: slots are 8 px apart, so each must be 56 px for a 48 px hit box; fewer per row if the card is narrow
    while (cols > 3 && Math.floor(cardW / cols) < 56) cols--;
    shelf.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    shelf.style.setProperty("--slot", Math.max(56, Math.min(72, Math.floor(cardW / cols))) + "px");
    E.ITEMS.forEach(function (it) {
      var b = document.createElement("button"), c = document.createElement("canvas"), have = museum.indexOf(it.id) >= 0;
      b.className = "slot"; b.setAttribute("aria-label", have ? it.name : "Not found yet");
      c.width = 120; c.height = 110;
      var g = c.getContext("2d");
      if (have) A.drawItem(g, it.id, 60, 56, 92, "color");
      else { A.drawItem(g, it.id, 60, 56, 92, "sil", "rgba(90,56,36,0.28)"); g.fillStyle = "rgba(90,56,36,0.7)"; g.font = "900 44px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 60, 58); }
      b.appendChild(c);
      b.addEventListener("click", function () {
        shelf.querySelectorAll(".slot").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        var lv = 1 + E.LEVELS.findIndex(function (L) { return L.finds.indexOf(it.id) >= 0; });
        $("museum-caption").innerHTML = have ? "<b></b><br><span></span>" : "<b>???</b><br><span></span>";
        if (have) { $("museum-caption").querySelector("b").textContent = it.name; $("museum-caption").querySelector("span").textContent = it.joke; }
        else $("museum-caption").querySelector("span").textContent = "Still buried somewhere in level " + lv + ".";
      });
      shelf.appendChild(b);
    });
    $("museum-count").textContent = museum.length + " of " + E.ITEMS.length + " weird things dug up";
    $("museum-caption").textContent = museum.length ? "Tap something on the shelf to read about it." : "Nothing yet! Go dig something weird up.";
    showOnly("museum-screen");
  }
  $("museum-back").addEventListener("click", function () {
    Sound.click();
    if (museumFrom === "done") showOnly("done-screen");
    else if (museumFrom === "end") showOnly("end-screen");
    else toTitle();
  });

  function setSound(on) {
    soundOn = on; save("sound", on); Sound.init(); Sound.setOn(on);
    ["sound-btn", "pause-sound-btn"].forEach(function (id) { $(id).textContent = "Sound: " + (on ? "on" : "off"); $(id).setAttribute("aria-pressed", String(on)); });
  }
  $("play-btn").addEventListener("click", function () {
    Sound.click();
    // Carry on from the deepest unlocked level that isn't cleared yet
    var n = 1;
    while (n < progress.unlocked && progress.stars[n]) n++;
    startLevel(n);
  });
  $("levels-btn").addEventListener("click", function () { openLevels("title"); });
  $("museum-btn").addEventListener("click", function () { openMuseum("title"); });
  $("sound-btn").addEventListener("click", function () { setSound(!soundOn); });
  $("pause-sound-btn").addEventListener("click", function () { setSound(!soundOn); });
  $("pause-btn").addEventListener("click", function () { Sound.init(); pause(); });
  $("resume-btn").addEventListener("click", resume);
  $("restart-btn").addEventListener("click", function () { startLevel(level); });
  $("pause-levels-btn").addEventListener("click", function () { openLevels("pause"); });
  $("pause-title-btn").addEventListener("click", function () { Sound.click(); toTitle(); });
  $("next-btn").addEventListener("click", function () {
    Sound.click();
    if (level < E.LEVELS.length) startLevel(level + 1);
    else { setMode("end"); showOnly("end-screen"); $("end-count").textContent = museum.length + " of " + E.ITEMS.length + " weird things in the museum"; drawEnd(); }
  });
  $("retry-btn").addEventListener("click", function () { startLevel(level); });
  $("done-museum-btn").addEventListener("click", function () { openMuseum("done"); });
  $("done-levels-btn").addEventListener("click", function () { openLevels("done"); });
  $("empty-retry-btn").addEventListener("click", function () { startLevel(level); });
  $("empty-levels-btn").addEventListener("click", function () { openLevels("empty"); });
  $("end-museum-btn").addEventListener("click", function () { openMuseum("end"); });
  $("end-title-btn").addEventListener("click", function () { Sound.click(); toTitle(); });

  function drawHero(c) {
    var g = c.getContext("2d"), t = performance.now() / 1000;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "#8b5a2b"; A.rr(g, 10, 120, 420, 96, 26); g.fill();
    g.strokeStyle = A.INK; g.lineWidth = 5; g.stroke();
    g.fillStyle = "#3b2416"; g.beginPath(); A.rr(g, 40, 150, 250, 54, 26); g.fill();
    g.fillStyle = "#4fb848"; g.fillRect(14, 118, 412, 10);
    A.drawDozer(g, 110, 172, 100, "r", 1, t, { digging: true });
    var bob = Math.sin(t * 4) * 6;
    A.drawItem(g, "duck", 360, 70 + bob, 92, "glow", "#fff36b");
    A.drawItem(g, "duck", 360, 70 + bob, 92, "color");
    A.star(g, 300, 40, 12, "#fff36b"); A.star(g, 415, 120, 9, "#9b4dff"); A.star(g, 330, 130, 7, "#5fd35a");
  }
  // The find pops out of the ground with sunbeams behind it.
  function drawRevealArt(t) {
    var c = $("reveal-art"), g = c.getContext("2d"), cx = 170, cy = 175;
    g.clearRect(0, 0, 340, 340);
    g.save(); g.translate(cx, cy); g.rotate(t * 0.6);
    for (var i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? "rgba(255,227,107,0.55)" : "rgba(155,77,255,0.25)";
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 170, i * Math.PI / 6, (i + 1) * Math.PI / 6); g.closePath(); g.fill();
    }
    g.restore();
    var pop = t < 0.5 ? 1 - Math.pow(1 - t / 0.5, 3) * Math.cos(t * 14) : 1;
    var size = 210 * Math.max(0.05, pop), bob = Math.sin(t * 3) * 6;
    A.drawItem(g, revealItem.id, cx, cy + bob, size * 1.04, "glow", "#fff");
    A.drawItem(g, revealItem.id, cx, cy + bob, size, "color");
    for (i = 0; i < 5; i++) {
      var a = t * 1.5 + i * 1.256, r = 120 + Math.sin(t * 2 + i) * 15;
      A.star(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, 11 + (i % 2) * 5, ["#fff36b", "#5fd35a", "#9b4dff"][i % 3]);
    }
  }
  function drawEnd() {
    var c = $("end-hero"), g = c.getContext("2d");
    g.clearRect(0, 0, 340, 340);
    A.drawItem(g, "plug", 170, 170, 230, "glow", "#fff36b");
    A.drawItem(g, "plug", 170, 170, 230, "color");
  }

  // ---------- the title-screen demo: the robot digs behind the menu ----------
  function startDemo() {
    var n = 1 + ((Math.random() * 3) | 0);
    demo = E.create(n, (Math.random() * 1e6) | 0); S = null; V = makeView(demo);
  }

  // ---------- drawing ----------
  function render(now) {
    var s = S || demo;
    if (!s || !V) return;
    var t = now / 1000, k = view.tile * view.dpr / T;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
    var sx = 0, sy = 0;
    if (V.shake > 0) { sx = (Math.random() - 0.5) * V.shake; sy = (Math.random() - 0.5) * V.shake; }
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);
    ctx.drawImage(V.bg, 0, 0);
    drawSurface(s, t);
    ctx.drawImage(V.shade, 0, 0);
    ctx.drawImage(V.dirt, 0, 0);
    var d = s.dozer, dpx = d.x * T + T / 2, dpy = d.y * T + T / 2, i;
    // fuel cans
    for (i = 0; i < s.cans.length; i++) { var cn = s.cans[i]; if (!cn.got) A.drawCan(ctx, cn.c * T + T / 2, cn.r * T + T / 2 + Math.sin(t * 2 + i) * 1.5, T * 0.85); }
    // buried weird things: a silhouette, a twinkle now and then, and a glow when you're close
    for (i = 0; i < s.finds.length; i++) {
      var f = s.finds[i];
      if (f.got) continue;
      var fx = f.c * T + T / 2, fy = f.r * T + T / 2, dist = Math.hypot(f.c - d.x, f.r - d.y);
      if (dist < 2.6) {
        var a = (0.55 + 0.45 * Math.sin(t * 7)) * (1 - dist / 2.6 * 0.6);
        ctx.globalAlpha = a; A.drawItem(ctx, f.id, fx, fy, T * 0.92, "glow", "#fff36b"); ctx.globalAlpha = 1;
        A.drawItem(ctx, f.id, fx, fy, T * 0.8, "sil", "rgba(30,14,4,0.65)");
      } else {
        A.drawItem(ctx, f.id, fx, fy, T * 0.8, "sil", "rgba(30,14,4,0.38)");
      }
      var tw = (t * 0.7 + i * 0.37) % 2.2;
      if (tw < 0.5) A.star(ctx, fx + T * 0.28, fy - T * 0.28, T * 0.16 * Math.sin(tw / 0.5 * Math.PI), "#fff9c4");
    }
    // boulders
    for (i = 0; i < s.boulders.length; i++) {
      var b = s.boulders[i];
      if (b.gone) continue;
      var wob = b.state === "wobble" ? Math.sin(t * 40) * 0.12 : 0;
      var by = b.state === "fall" ? b.fy : b.r;
      A.drawBoulder(ctx, (b.c + b.slide) * T + T / 2 + (b.state === "wobble" ? Math.sin(t * 50) * 2 : 0), by * T + T / 2, T * 0.98, wob);
    }
    // moles
    for (i = 0; i < s.moles.length; i++) {
      var m = s.moles[i], st = m.dizzy > 0 ? "dizzy" : m.giggle > 0 ? "giggle" : (m.moved ? "walk" : "idle");
      var face = m.dir === "l" ? -1 : m.dir === "r" ? 1 : (m.face || 1);
      m.face = face;
      A.drawMole(ctx, m.x * T + T / 2, m.y * T + T / 2 + 3, T * 0.95, face, t + i, st);
      if (m.giggle > 0) { ctx.font = "900 14px sans-serif"; ctx.fillStyle = "#fff3d6"; ctx.textAlign = "center"; ctx.fillText("hee hee!", m.x * T + T / 2, m.y * T - 4); }
    }
    // the bulldozer
    var blink = d.invuln > 0 && d.dizzy <= 0 && Math.floor(t * 12) % 2 === 0;
    if (!blink) A.drawDozer(ctx, dpx, dpy, T * 1.02, d.dir, d.face, s.t, { bladeOut: d.bladeT > 0, dizzy: d.dizzy > 0, digging: d.moving && d.segDig > 0 });
    // particles and words
    for (i = 0; i < V.parts.length; i++) {
      var p = V.parts[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (i = 0; i < V.texts.length; i++) {
      var tx = V.texts[i], sc = tx.t < 0.15 ? tx.t / 0.15 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, (1.2 - tx.t) / 0.4));
      ctx.font = "900 " + Math.round(tx.size * (0.6 + 0.4 * sc)) + "px ui-rounded, 'Arial Rounded MT Bold', sans-serif";
      ctx.lineWidth = 5; ctx.strokeStyle = A.INK; ctx.strokeText(tx.text, tx.x, tx.y - tx.t * 30);
      ctx.fillStyle = tx.col; ctx.fillText(tx.text, tx.x, tx.y - tx.t * 30);
    }
    ctx.globalAlpha = 1;
  }

  function drawSurface(s, t) {
    if (s.n <= 2) {
      var g = ctx.createLinearGradient(0, 0, 0, T);
      g.addColorStop(0, "#7cc8ff"); g.addColorStop(1, "#c8ecff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, T);
      ctx.fillStyle = "#fff6a8"; ctx.beginPath(); ctx.arc(W - 40, 18, 12, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      var cx = (t * 8) % (W + 120) - 60;
      [[cx, 14], [cx + 260, 22], [cx - 330, 10]].forEach(function (c) { var x = ((c[0] % (W + 120)) + W + 120) % (W + 120) - 60; ctx.beginPath(); ctx.arc(x, c[1], 9, 0, 7); ctx.arc(x + 12, c[1] - 4, 11, 0, 7); ctx.arc(x + 24, c[1], 8, 0, 7); ctx.fill(); });
      // a little fence and a sign
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
      for (var x = W - 150; x < W - 70; x += 14) { ctx.beginPath(); ctx.moveTo(x, T - 2); ctx.lineTo(x, T - 22); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(W - 154, T - 15); ctx.lineTo(W - 66, T - 15); ctx.stroke();
    } else {
      ctx.fillStyle = s.n === 8 ? "#3a1c14" : "#2a1d18"; ctx.fillRect(0, 0, W, T);
      ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(0, 0, W, 8);
      // old mine beams and lanterns
      for (var bx = 70; bx < W; bx += 170) {
        ctx.fillStyle = "#7a4a26"; ctx.fillRect(bx, 0, 10, T); ctx.fillRect(bx - 8, 0, 26, 8);
        var fl = 0.75 + Math.sin(t * 9 + bx) * 0.1;
        ctx.fillStyle = "rgba(255,210,90," + (0.18 * fl) + ")"; ctx.beginPath(); ctx.arc(bx + 22, 16, 22, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffd25a"; ctx.beginPath(); ctx.arc(bx + 22, 16, 5, 0, 7); ctx.fill();
      }
    }
    // depth sign
    ctx.fillStyle = "#fff3d6"; ctx.strokeStyle = A.INK; ctx.lineWidth = 3;
    ctx.beginPath(); A.rr(ctx, 8, 7, 74, 24, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = A.INK; ctx.font = "900 15px ui-rounded, 'Arial Rounded MT Bold', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.L.depth + " FT", 45, 20);
  }

  function updateFx(dt, s) {
    var v = V, i;
    if (v.shake > 0) v.shake = Math.max(0, v.shake - dt * 30);
    for (i = v.parts.length - 1; i >= 0; i--) {
      var p = v.parts[i];
      p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) v.parts.splice(i, 1);
    }
    for (i = v.texts.length - 1; i >= 0; i--) { v.texts[i].t += dt; if (v.texts[i].t > 1.2) v.texts.splice(i, 1); }
    // carve the tunnel along where the bulldozer (and burrowing moles) went
    trail(v, "dozer", s.dozer.x, s.dozer.y);
    for (i = 0; i < s.moles.length; i++) {
      var m = s.moles[i];
      if (m.segDig > 0 && m.moved) trail(v, "m" + i, m.x, m.y); else v.last["m" + i] = { x: m.x, y: m.y };
    }
    // tidy up dug cells once nothing is in them
    for (i = 0; i < COLS * ROWS; i++) {
      if (v.cleared[i] || s.grid[i] !== E.OPEN) continue;
      var c = i % COLS, r = (i / COLS) | 0;
      if (Math.abs(c - s.dozer.x) + Math.abs(r - s.dozer.y) < 1.05) continue;
      var busy = false;
      for (var j = 0; j < s.moles.length; j++) if (s.moles[j].segDig > 0 && Math.abs(c - s.moles[j].x) + Math.abs(r - s.moles[j].y) < 1.05) busy = true;
      if (!busy) clearCell(v, c, r);
    }
    // dust from the digging
    if (s.dozer.moving && s.dozer.segDig > 0) {
      v.crunchT -= dt;
      if (v.crunchT <= 0) {
        v.crunchT = 0.09 + Math.random() * 0.05;
        if (s === S) Sound.crunch(s.dozer.segDig);
        var f = E.DIRS[s.dozer.dir], lk = LOOK[s.dozer.segDig];
        burst(v, (s.dozer.x + f[0] * 0.5) * T + T / 2, (s.dozer.y + f[1] * 0.5) * T + T / 2, 2, [lk.light, lk.dark, lk.base], 90, 0.45);
      }
    }
    if (s.dozer.moving && Math.random() < dt * 6) v.parts.push({ x: s.dozer.x * T + T / 2 - s.dozer.face * 6, y: s.dozer.y * T + 2, vx: 0, vy: -30, life: 0.7, max: 0.7, r: 4, col: "rgba(220,220,230,0.5)", g: -20 });
  }

  // ---------- the loop ----------
  var acc = 0, last = performance.now(), botSpeed = 1, heroT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (mode === "play" && S && !frozen) {
      acc += dt * (bot ? botSpeed : 1);
      var steps = 0;
      while (acc >= DT && steps < 400) {
        acc -= DT; steps++;
        E.step(S, currentInput());
        for (var i = 0; i < S.events.length; i++) handle(S.events[i]);
        if (bot && !botReveals && revealQueue.length) revealQueue = [];
        if (revealQueue.length || S.won || S.lost) { acc = 0; break; }
      }
      updateHud();
      Sound.engine(S.dozer.moving ? 0.12 : 0.05, S.dozer.moving ? (S.dozer.segDig ? 1.3 : 1.1) : 0.8);
      if (revealQueue.length && mode === "play") openReveal(revealQueue.shift());
      else if (S.won && mode === "play" && performance.now() - wonAt > (bot ? 200 : 900)) finishLevel();
    } else if (mode === "title" && demo) {
      acc += dt;
      while (acc >= DT) { acc -= DT; E.step(demo, Bot.decide(demo)); }
      if (demo.won || demo.lost || demo.t > 60) startDemo();
      heroT += dt;
      if (heroT > 0.05) { heroT = 0; drawHero($("title-hero")); }
    } else acc = 0;
    if (mode === "reveal" && revealItem) drawRevealArt((now - revealAt) / 1000);
    var s = S || demo;
    if (s && V && !frozen) updateFx(dt, s);
    render(now);
  }

  // ---------- start ----------
  setSound(soundOn);
  layout();
  toTitle();
  requestAnimationFrame(frame);

  // A small window for the evidence tests only.
  window.__bwd = {
    get mode() { return mode; },
    get state() { return S; },
    get level() { return level; },
    get museum() { return museum.slice(); },
    get progress() { return JSON.parse(JSON.stringify(progress)); },
    levelCount: E.LEVELS.length,
    itemCount: E.ITEMS.length,
    start: function (n, seed) { startLevel(n, seed); }, // seed: fix the moles' dice (tests only)
    bot: function (on, speed, reveals) { bot = on ? true : null; botSpeed = speed || 1; botReveals = !!reveals; },
    freeze: function (on) { frozen = !!on; },
    // drive the real game with given inputs for a number of ticks (synchronously)
    drive: function (dir, ticks) { for (var i = 0; i < ticks && !S.won && !S.lost; i++) { E.step(S, { dir: dir }); S.events.forEach(handle); } updateHud(); },
    // with freeze(true), run the real loop by hand: n ticks of 1/60 s, reading the live keys, pad and blade
    step: function (ticks) { for (var i = 0; i < ticks && !S.won && !S.lost; i++) { E.step(S, currentInput()); S.events.forEach(handle); } updateHud(); }
  };
})();
