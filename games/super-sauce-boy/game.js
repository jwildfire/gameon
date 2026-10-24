// Super Sauce Boy: drawing, controls, sound, screens and saves. The rules live in engine.js.
(function () {
  "use strict";
  var E = window.SSBEngine, LEVELS = window.SSB_LEVELS;
  var T = E.T, COLS = E.COLS, ROWS = E.ROWS, VW = COLS * T, VH = ROWS * T;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Saves (all under gameon.super-sauce-boy.) ----------
  var PREFIX = "gameon.super-sauce-boy.";
  var store = {
    get: function (k, d) {
      try { var v = window.localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage blocked: play on */ }
    }
  };
  var best = store.get("best", {});            // { "1": 3.41, ... } seconds
  if (!best || typeof best !== "object") best = {};
  var unlocked = Math.max(1, Math.min(LEVELS.length, Number(store.get("unlocked", 1)) || 1));
  var soundOn = store.get("sound", true) !== false;
  var totalSplats = Number(store.get("splats", 0)) || 0;

  // ---------- Canvas and layout ----------
  var stage = $("stage"), canvas = $("game"), ctx = canvas.getContext("2d");
  var hud = $("hud"), tip = $("tip"), pad = $("pad");
  var scale = 1, dpr = 1, touchMode = false;
  try { touchMode = window.matchMedia("(pointer: coarse)").matches || ("ontouchstart" in window); } catch (e) { touchMode = false; }

  function layout() {
    var W = window.innerWidth, H = window.innerHeight;
    var portrait = H > W * 1.05;
    document.body.classList.toggle("portrait", portrait);
    document.body.classList.toggle("landscape", !portrait);
    pad.hidden = !(touchMode && mode === "play");
    var padSize = Math.round(Math.max(64, Math.min(96, Math.min(W, H) * (portrait ? 0.2 : 0.17))));
    document.documentElement.style.setProperty("--pad", padSize + "px");
    var hudH, sw, sh, left, top;
    if (portrait) {
      var padArea = touchMode ? padSize * 1.25 + 40 : 0;
      hudH = 40;
      scale = Math.min(W / VW, (H - padArea - hudH - 70) / VH);
      sw = VW * scale; sh = VH * scale;
      left = (W - sw) / 2;
      top = Math.max(hudH + 8, (H - padArea - sh) / 2);
      hud.style.left = (left + 2) + "px"; hud.style.width = (sw - 4) + "px"; hud.style.top = (top - hudH - 2) + "px";
      document.documentElement.style.setProperty("--hud-font", "14px");
      tip.style.left = "0px"; tip.style.width = W + "px"; tip.style.top = (top + sh + 12) + "px";
      document.documentElement.style.setProperty("--tip-font", "17px");
    } else {
      scale = Math.min(W / VW, H / VH);
      sw = VW * scale; sh = VH * scale;
      left = (W - sw) / 2; top = (H - sh) / 2;
      hud.style.left = (left + 8) + "px"; hud.style.width = (sw - 16) + "px"; hud.style.top = (top + 6) + "px";
      document.documentElement.style.setProperty("--hud-font", Math.max(12, Math.min(18, 18 * scale / 0.9)).toFixed(1) + "px");
      tip.style.left = left + "px"; tip.style.width = sw + "px"; tip.style.top = (top + sh * 0.2) + "px";
      document.documentElement.style.setProperty("--tip-font", Math.max(14, Math.min(24, 26 * scale)).toFixed(1) + "px");
    }
    stage.style.left = left + "px"; stage.style.top = top + "px";
    stage.style.width = sw + "px"; stage.style.height = sh + "px";
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(sw * dpr); canvas.height = Math.round(sh * dpr);
    draw();
  }

  // ---------- Sound (made in the browser) ----------
  var AC = null, master = null, musicGain = null, musicTimer = null, musicStep = 0, nextNoteTime = 0;
  function audio() {
    if (!soundOn) return null;
    if (!AC) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try { AC = new Ctor(); } catch (e) { return null; }
      master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(f, dur, type, vol, slideTo, when, dest) {
    var a = audio(); if (!a) return;
    var t0 = when || a.currentTime;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.15, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var noiseBuf = null;
  function noise(dur, vol, freq, q, when, dest) {
    var a = audio(); if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t0 = when || a.currentTime;
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = freq || 1200; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol || 0.2, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  }
  var sfx = {
    jump: function () { tone(330, 0.13, "square", 0.08, 660); },
    walljump: function () { tone(420, 0.12, "square", 0.08, 880); noise(0.06, 0.08, 2500, 2); },
    land: function (v) { if (v > 350) noise(0.07, Math.min(0.15, v / 6000), 600, 1.5); },
    splat: function () { noise(0.28, 0.32, 500, 0.8); tone(200, 0.25, "sawtooth", 0.1, 60); },
    sizzle: function () { noise(0.6, 0.25, 4500, 0.6); },
    toast: function () { tone(180, 0.25, "triangle", 0.2, 720); tone(900, 0.08, "square", 0.05); },
    crack: function () { noise(0.05, 0.12, 3000, 3); },
    crumble: function () { noise(0.18, 0.15, 1800, 1); },
    bonk: function () { tone(140, 0.06, "square", 0.06, 90); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { var a = audio(); if (a) tone(f, 0.18, "square", 0.08, null, a.currentTime + i * 0.09); }); }
  };
  // A bouncy little loop: bass, a hopping lead and a shaker.
  var BASS = [48, 0, 48, 0, 55, 0, 53, 0, 46, 0, 46, 0, 53, 0, 51, 0];
  var LEAD = [67, 0, 70, 72, 0, 70, 67, 0, 65, 0, 67, 70, 0, 72, 75, 0, 67, 0, 70, 72, 0, 75, 72, 70, 67, 0, 65, 0, 63, 65, 67, 0];
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function musicTick() {
    if (!AC || !soundOn) return;
    var stepLen = 60 / 150 / 2; // eighth notes at 150 bpm
    while (nextNoteTime < AC.currentTime + 0.15) {
      var s = musicStep;
      var b = BASS[s % 16]; if (b) tone(midi(b), stepLen * 0.9, "triangle", 0.22, null, nextNoteTime, musicGain);
      var l = LEAD[s % 32]; if (l && s >= 32) tone(midi(l), stepLen * 0.7, "square", 0.05, null, nextNoteTime, musicGain);
      if (s % 2 === 1) noise(0.04, 0.05, 7000, 2, nextNoteTime, musicGain);
      if (s % 4 === 0) tone(110, 0.08, "sine", 0.18, 50, nextNoteTime, musicGain);
      musicStep = (musicStep + 1) % 128;
      nextNoteTime += stepLen;
    }
  }
  function startMusic() {
    var a = audio(); if (!a || musicTimer) return;
    nextNoteTime = a.currentTime + 0.05;
    musicTimer = setInterval(musicTick, 40);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function setSound(on) {
    soundOn = on; store.set("sound", on);
    ["sound-btn", "pause-sound-btn"].forEach(function (id) {
      $(id).textContent = "Sound: " + (on ? "on" : "off"); $(id).setAttribute("aria-pressed", String(on));
    });
    if (!on) { stopMusic(); if (AC) AC.suspend(); }
    else if (mode === "play") startMusic();
  }

  // ---------- Game state ----------
  var mode = "title";       // title | levels | play | paused | done | end
  var li = 0, map = null, world = null;
  var splats = 0, respawnIn = 0, lastDeath = null, wonAt = 0;
  var stainCanvas = document.createElement("canvas"), stainCtx = stainCanvas.getContext("2d");
  stainCanvas.width = VW; stainCanvas.height = VH;
  var bgCanvas = document.createElement("canvas"), bgCtx = bgCanvas.getContext("2d");
  bgCanvas.width = VW; bgCanvas.height = VH;
  var solidPath = null, particles = [], popups = [], squash = 0, blink = 0, toastPops = {};
  var held = { l: false, r: false, j: false }, keys = {}, padHeld = { l: false, r: false, j: false };
  var tipTimer = null, clock = 0, frozen = false; // frozen: only the evidence tests use it, to hold a moment still for a picture

  function loadLevel(n, keepStains) {
    li = n;
    map = E.parse(LEVELS[n]);
    world = E.create(LEVELS[n], map);
    splats = 0; respawnIn = 0; particles = []; popups = []; toastPops = {};
    if (!keepStains) stainCtx.clearRect(0, 0, VW, VH);
    buildBackground();
    $("hud-level").textContent = (n + 1) + ". " + LEVELS[n].name;
    updateHud();
    showTip(LEVELS[n].tip);
  }

  function showTip(text) {
    tip.textContent = text; tip.classList.remove("fade");
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tip.classList.add("fade"); }, 3800);
  }

  function fmt(t) {
    if (t == null) return "--";
    var m = Math.floor(t / 60), s = t - m * 60;
    return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2);
  }
  function updateHud() {
    $("hud-time").textContent = fmt(world ? world.t : 0);
    $("hud-splats").textContent = "💥 " + splats;
  }

  // ---------- Static level art ----------
  function isSolidCh(ch) { return !!E.SOLID[ch]; }
  function buildBackground() {
    var g = bgCtx, grid = map.grid;
    g.clearRect(0, 0, VW, VH);
    // Warm kitchen wall with big tiles
    var grd = g.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, "#ffe7b8"); grd.addColorStop(1, "#ffc77f");
    g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
    g.strokeStyle = "rgba(201, 120, 52, 0.25)"; g.lineWidth = 2;
    for (var x = 0; x <= VW; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, VH); g.stroke(); }
    for (var y = 0; y <= VH; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke(); }
    // A little decoration: hanging chili strings and a window, placed where it's empty
    var seed = li * 9301 + 49297;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var d = 0; d < 4; d++) {
      var dc = 2 + Math.floor(rnd() * 28), dr = 1 + Math.floor(rnd() * 5);
      if (grid[dr][dc] !== "." || grid[dr + 1][dc] !== "." || grid[dr + 2][dc] !== ".") continue;
      var cx = dc * T + 15, cy = dr * T;
      g.strokeStyle = "rgba(120, 60, 20, 0.35)"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, cy - 30); g.lineTo(cx, cy + 50); g.stroke();
      for (var k = 0; k < 4; k++) {
        g.fillStyle = k % 2 ? "rgba(214, 48, 30, 0.45)" : "rgba(240, 90, 30, 0.45)";
        g.beginPath(); g.ellipse(cx + (k % 2 ? 5 : -5), cy + k * 14, 4, 9, k % 2 ? -0.5 : 0.5, 0, Math.PI * 2); g.fill();
      }
    }
    // Holes in the floor go down the drain: shade them so they read as danger
    for (var pc = 0; pc < COLS; pc++) {
      if (isSolidCh(grid[ROWS - 1][pc])) continue;
      var top = ROWS - 1;
      while (top > 0 && !isSolidCh(grid[top - 1][pc]) && top > ROWS - 4) top--;
      var pg = g.createLinearGradient(0, top * T, 0, VH);
      pg.addColorStop(0, "rgba(80, 20, 8, 0)"); pg.addColorStop(1, "rgba(60, 14, 4, 0.8)");
      g.fillStyle = pg; g.fillRect(pc * T, top * T, T, VH - top * T);
    }
    // Tiles
    solidPath = new Path2D();
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ch = grid[r][c];
      if (ch === "#") {
        solidPath.rect(c * T, r * T, T, T);
        drawCounter(g, c, r);
      } else if (ch === "=") { solidPath.rect(c * T, r * T, T, T); drawButter(g, c, r); }
      else if (ch === "T") { solidPath.rect(c * T, r * T, T, T); }
      else if (ch === "H" || ch === "h") { solidPath.rect(c * T, r * T, T, T); }
      else if ("^v<>".indexOf(ch) >= 0) drawFork(g, ch, c, r);
    }
  }
  function solidAtGrid(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
    return isSolidCh(map.grid[r][c]);
  }
  function drawCounter(g, c, r) {
    var x = c * T, y = r * T;
    var open = !solidAtGrid(c, r - 1);
    g.fillStyle = (c + r) % 2 ? "#b4532a" : "#bd5b30";
    g.fillRect(x, y, T, T);
    g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(x + 3, y + 3, T - 6, T - 6);
    if (open) {
      g.fillStyle = "#f0a24f"; g.fillRect(x, y, T, 7);
      g.fillStyle = "#ffd08a"; g.fillRect(x, y, T, 2);
    }
    g.fillStyle = "#5c220f";
    if (open) g.fillRect(x, y, T, 2);
    if (!solidAtGrid(c, r + 1)) g.fillRect(x, y + T - 3, T, 3);
    if (!solidAtGrid(c - 1, r)) g.fillRect(x, y, 3, T);
    if (!solidAtGrid(c + 1, r)) g.fillRect(x + T - 3, y, 3, T);
  }
  function drawButter(g, c, r) {
    var x = c * T, y = r * T;
    g.fillStyle = "#ffe066"; g.fillRect(x, y, T, T);
    g.fillStyle = "#fff3a8"; g.fillRect(x, y, T, 8);
    g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(x + 4, y + 2, 10, 3);
    g.fillStyle = "#c9971c"; g.fillRect(x, y + T - 3, T, 3);
    g.fillStyle = "#8a6510"; g.fillRect(x, y, T, 2);
    if (!solidAtGrid(c - 1, r)) g.fillRect(x, y, 2, T);
    if (!solidAtGrid(c + 1, r)) g.fillRect(x + T - 2, y, 2, T);
  }
  function drawFork(g, ch, c, r) {
    g.save();
    g.translate(c * T + T / 2, r * T + T / 2);
    g.rotate({ "^": 0, ">": Math.PI / 2, "v": Math.PI, "<": -Math.PI / 2 }[ch]);
    // base attached at +15 (bottom), tines point up to -13
    g.fillStyle = "#e9eef3"; g.strokeStyle = "#3d4650"; g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-9, 15); g.lineTo(-9, 6); g.quadraticCurveTo(-9, 1, -4, 1); g.lineTo(4, 1); g.quadraticCurveTo(9, 1, 9, 6); g.lineTo(9, 15); g.closePath();
    g.fill(); g.stroke();
    for (var i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(i * 6 - 2, 2); g.lineTo(i * 6, -13); g.lineTo(i * 6 + 2, 2); g.closePath();
      g.fill(); g.stroke();
    }
    g.restore();
  }

  // ---------- Live art ----------
  function drawToaster(g, c, r, t) {
    var x = c * T, y = r * T;
    var pop = toastPops[r * COLS + c] || 0;
    if (pop > 0) { // toast slice pops up
      var up = Math.sin(Math.min(1, pop / 0.35) * Math.PI) * 26;
      g.fillStyle = "#d9973f"; g.strokeStyle = "#6b3a12"; g.lineWidth = 1.5;
      g.beginPath(); g.rect(x + 7, y - up, 16, 14); g.fill(); g.stroke();
    }
    g.fillStyle = "#c7cfd6"; g.strokeStyle = "#3d4650"; g.lineWidth = 2;
    roundRect(g, x + 1, y + 1, T - 2, T - 1, 7); g.fill(); g.stroke();
    g.fillStyle = "#eef2f5"; g.fillRect(x + 5, y + 6, 8, 16);
    g.fillStyle = "#2f363d"; g.fillRect(x + 6, y + 2, 18, 3);
    g.fillStyle = "#e5281b"; g.fillRect(x + 20, y + 14, 6, 4);
  }
  function drawHot(g, ch, c, r, t) {
    var x = c * T, y = r * T, hot = E.hotNow(ch, t), warn = !hot && E.hotWarn(ch, t);
    g.fillStyle = "#34302e"; g.fillRect(x, y, T, T);
    g.fillStyle = "#4a4441"; g.fillRect(x, y, T, 6);
    var col = hot ? "#ff4a1c" : warn ? (Math.floor(t * 10) % 2 ? "#ff9a2e" : "#7a5a40") : "#6b625d";
    g.strokeStyle = col; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + 2, y + 3); g.lineTo(x + T - 2, y + 3); g.stroke();
    if (hot) {
      g.fillStyle = "rgba(255, 90, 20, 0.35)";
      g.fillRect(x, y - 10, T, 10);
      g.strokeStyle = "rgba(255, 120, 40, 0.6)"; g.lineWidth = 1.5;
      for (var i = 0; i < 2; i++) {
        var wx = x + 8 + i * 14, ph = t * 9 + c;
        g.beginPath(); g.moveTo(wx, y - 2);
        g.quadraticCurveTo(wx + 4 * Math.sin(ph), y - 9, wx, y - 16); g.stroke();
      }
    }
    g.fillStyle = "#1d1a19"; g.fillRect(x, y + T - 3, T, 3);
  }
  function drawCracker(g, i, t) {
    var k = map.crackers[i], st = world.cr[i], x = k.c * T, y = k.r * T;
    if (st.gone > 0) {
      g.strokeStyle = "rgba(160, 110, 50, 0.45)"; g.setLineDash([4, 4]); g.lineWidth = 2;
      g.strokeRect(x + 2, y + 2, T - 4, T - 4); g.setLineDash([]);
      return;
    }
    var shake = st.timer >= 0 ? (Math.random() - 0.5) * 3 : 0;
    g.save(); g.translate(shake, 0);
    g.fillStyle = "#eab866"; g.strokeStyle = "#8a5a22"; g.lineWidth = 2;
    roundRect(g, x + 1, y + 2, T - 2, T - 4, 4); g.fill(); g.stroke();
    g.fillStyle = "#b9853d";
    for (var a = 0; a < 3; a++) for (var b = 0; b < 2; b++) { g.beginPath(); g.arc(x + 7 + a * 8, y + 10 + b * 10, 1.6, 0, Math.PI * 2); g.fill(); }
    if (st.timer >= 0) { g.strokeStyle = "#6b3d10"; g.beginPath(); g.moveTo(x + 8, y + 3); g.lineTo(x + 14, y + 14); g.lineTo(x + 11, y + 26); g.stroke(); }
    g.restore();
  }
  function drawCutter(g, k, t) {
    var q = E.cutterPos(k, t), R = E.CUTTER_R;
    g.save(); g.translate(q.x, q.y); g.rotate(t * 10);
    g.fillStyle = "#dfe6ec"; g.strokeStyle = "#3d4650"; g.lineWidth = 2;
    g.beginPath();
    for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2, rr = i % 2 ? R : R - 2.5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#e5281b"; g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, R - 5, -0.4, 0.9); g.stroke();
    g.restore();
  }
  function drawNachos(g, t) {
    var k = map.goal, x = k.c * T + T / 2, y = (k.r + 1) * T;
    var bob = Math.sin(t * 3) * 1.5;
    g.save(); g.translate(x, y);
    // glow so you can find it
    var glow = g.createRadialGradient(0, -10, 2, 0, -10, 34);
    glow.addColorStop(0, "rgba(255, 230, 120, 0.7)"); glow.addColorStop(1, "rgba(255, 230, 120, 0)");
    g.fillStyle = glow; g.beginPath(); g.arc(0, -10, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff"; g.strokeStyle = "#3d2a1f"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, -3, 17, 4.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    var chips = [[-9, -9, -0.4], [8, -9, 0.4], [0, -13, 0], [-4, -18, -0.2], [5, -17, 0.3]];
    chips.forEach(function (cp) {
      g.save(); g.translate(cp[0], cp[1] + bob * 0.3); g.rotate(cp[2]);
      g.fillStyle = "#ffbf2e"; g.strokeStyle = "#a8650e"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -8); g.lineTo(7, 5); g.lineTo(-7, 5); g.closePath(); g.fill(); g.stroke();
      g.restore();
    });
    g.fillStyle = "#ffe14d"; // cheese
    g.beginPath(); g.ellipse(0, -11 + bob * 0.3, 9, 3, 0, 0, Math.PI * 2); g.fill();
    if (world && world.won) {
      g.fillStyle = "#e5281b";
      g.beginPath(); g.ellipse(0, -13, 8, 3.5, 0.2, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  // Sauce Boy himself: a bouncy drop of hot sauce with a mustard-yellow hero mask.
  function drawSauceBoy(g, cx, bottom, face, sx, sy, t, opts) {
    opts = opts || {};
    var w = 24 * sx, h = 25 * sy;
    g.save(); g.translate(cx, bottom);
    // mask tails flutter behind
    var flap = Math.sin(t * 18) * 3;
    g.fillStyle = "#ffc531"; g.strokeStyle = "#2b0f08"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-face * w * 0.35, -h * 0.62);
    g.quadraticCurveTo(-face * (w * 0.75), -h * 0.75 + flap, -face * (w * 0.95), -h * 0.5 + flap);
    g.quadraticCurveTo(-face * (w * 0.7), -h * 0.55, -face * w * 0.35, -h * 0.48); g.closePath(); g.fill(); g.stroke();
    // body: a drop, round at the bottom with a little curl on top
    g.fillStyle = "#e5281b"; g.strokeStyle = "#5c0d06"; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -h - 4 * sy);
    g.bezierCurveTo(w * 0.25, -h * 0.85, w * 0.55, -h * 0.55, w * 0.5, -h * 0.3);
    g.bezierCurveTo(w * 0.5, -h * 0.05, w * 0.3, 0, 0, 0);
    g.bezierCurveTo(-w * 0.3, 0, -w * 0.5, -h * 0.05, -w * 0.5, -h * 0.3);
    g.bezierCurveTo(-w * 0.55, -h * 0.55, -w * 0.25, -h * 0.85, 0, -h - 4 * sy);
    g.closePath(); g.fill(); g.stroke();
    // shine
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.beginPath(); g.ellipse(-w * 0.22, -h * 0.55, 2.2, 4, 0.4, 0, Math.PI * 2); g.fill();
    // mask band
    g.fillStyle = "#ffc531"; g.strokeStyle = "#2b0f08"; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(-w * 0.5, -h * 0.62); g.lineTo(w * 0.5, -h * 0.62); g.lineTo(w * 0.48, -h * 0.4); g.lineTo(-w * 0.48, -h * 0.4); g.closePath(); g.fill(); g.stroke();
    // eyes
    var ex = face * 2, closed = opts.blink;
    [-4.5, 4.5].forEach(function (o) {
      g.fillStyle = "#fff"; g.beginPath(); g.ellipse(o + ex, -h * 0.51, 3.4, closed ? 0.8 : 3.6, 0, 0, Math.PI * 2); g.fill();
      if (!closed) { g.fillStyle = "#1a0703"; g.beginPath(); g.arc(o + ex + face * 1.2, -h * 0.5, 1.7, 0, Math.PI * 2); g.fill(); }
    });
    // smile
    g.strokeStyle = "#5c0d06"; g.lineWidth = 1.6;
    g.beginPath(); g.arc(ex, -h * 0.28, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.restore();
  }

  function stamp(x, y, r, color) {
    stainCtx.save();
    stainCtx.clip(solidPath);
    stainCtx.fillStyle = color || "rgba(214, 33, 22, 0.9)";
    stainCtx.beginPath(); stainCtx.arc(x, y, r, 0, Math.PI * 2); stainCtx.fill();
    stainCtx.restore();
  }

  function draw() {
    if (!map) return;
    var t = world.t;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.drawImage(bgCanvas, 0, 0);
    // live tiles
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ch = map.grid[r][c];
      if (ch === "T") drawToaster(ctx, c, r, t);
      else if (ch === "H" || ch === "h") drawHot(ctx, ch, c, r, t);
    }
    for (var i = 0; i < map.crackers.length; i++) drawCracker(ctx, i, t);
    ctx.drawImage(stainCanvas, 0, 0);
    drawNachos(ctx, clock);
    for (var j = 0; j < map.cutters.length; j++) drawCutter(ctx, map.cutters[j], t);
    // particles
    particles.forEach(function (p) {
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    // the hero
    var p = world.p;
    if (!world.dead) {
      var stretch = p.gr ? 0 : Math.min(0.22, Math.abs(p.vy) / 2600);
      var sx = 1 - stretch * 0.6 + squash, sy = 1 + stretch - squash * 0.9;
      if (p.gr && Math.abs(p.vx) > 40) sy += Math.sin(clock * 30) * 0.04;
      var lean = (p.tl && !p.gr ? -1 : p.tr && !p.gr ? 1 : 0);
      drawSauceBoy(ctx, p.x + E.PW / 2 + lean * 1.5, p.y + E.PH + 1, p.face, sx, sy, clock, { blink: blink > 0 });
    }
    popups.forEach(function (q) {
      var k = Math.min(1, q.age / 0.15), a = Math.max(0, 1 - q.age / 0.9);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y - q.age * 30); ctx.scale(0.6 + 0.5 * k, 0.6 + 0.5 * k);
      ctx.font = "900 26px " + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = "center"; ctx.lineWidth = 6; ctx.strokeStyle = "#2b0f08"; ctx.strokeText(q.text, 0, 0);
      ctx.fillStyle = q.color; ctx.fillText(q.text, 0, 0);
      ctx.restore();
    });
  }

  // ---------- The loop ----------
  var acc = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    clock += dt;
    if (mode === "play" && !frozen) {
      acc += dt;
      while (acc >= E.DT) { acc -= E.DT; tick(); }
    } else acc = 0;
    if (mode === "play" && world && world.won && clock - wonAt > 0.65) show("done");
    // cosmetics run on screen time
    squash *= Math.pow(0.0005, dt);
    if (blink > 0) blink -= dt; else if (Math.random() < dt * 0.4) blink = 0.12;
    for (var k in toastPops) { toastPops[k] -= dt; if (toastPops[k] <= 0) delete toastPops[k]; }
    stepParticles(dt);
    popups = popups.filter(function (q) { q.age += dt; return q.age < 0.9; });
    if (mode === "title") drawHero($("title-hero"));
    if (mode === "end") drawHero($("end-hero"));
    draw();
  }

  function input() {
    return { l: !!(keys.l || padHeld.l), r: !!(keys.r || padHeld.r), j: !!(keys.j || padHeld.j) };
  }

  function tick(forced) {
    if (respawnIn > 0) {
      respawnIn -= E.DT;
      if (respawnIn <= 0) { E.spawn(world); world.p.prevJ = input().j; }
      return;
    }
    if (world.won) return;
    E.step(world, forced || input());
    handleEvents();
    paintTrail();
    if (!forced) updateHud();
  }

  function handleEvents() {
    var p = world.p;
    world.events.forEach(function (ev) {
      if (ev === "jump") { sfx.jump(); squash = -0.12; }
      else if (ev === "walljump") { sfx.walljump(); squash = -0.1; for (var i = 0; i < 5; i++) spray(p.x + (p.face > 0 ? 0 : E.PW), p.y + 10, 60, 0.6); }
      else if (ev === "land") { sfx.land(p.fallV); squash = Math.min(0.32, p.fallV / 2600); if (p.fallV > 500) for (var j = 0; j < 4; j++) spray(p.x + 10, p.y + E.PH, 90, 0.5); }
      else if (ev === "toast") {
        sfx.toast();
        var c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + E.PW - 0.001) / T), rr = Math.floor((p.y + E.PH + 0.5) / T);
        for (var c = c0; c <= c1; c++) if (map.grid[rr] && map.grid[rr][c] === "T") toastPops[rr * COLS + c] = 0.35;
        popups.push({ x: p.x + 10, y: p.y - 6, text: "POP!", color: "#ffc531", age: 0 });
      }
      else if (ev === "crack") sfx.crack();
      else if (ev.indexOf("crumble") === 0) {
        sfx.crumble();
        var k = map.crackers[Number(ev.split(":")[1])];
        for (var m = 0; m < 8; m++) particles.push({ x: k.c * T + Math.random() * T, y: k.r * T + Math.random() * T, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, r: 2 + Math.random() * 2, color: "#d9a457", life: 1.2, crumb: true });
      }
      else if (ev === "bonk") sfx.bonk();
      else if (ev === "splat") splat();
      else if (ev === "win") win();
    });
  }

  function paintTrail() {
    var p = world.p;
    if (world.dead) return;
    if (p.gr) {
      var spd = Math.abs(p.vx);
      if (spd > 5 || Math.random() < 0.05) stamp(p.x + 3 + Math.random() * (E.PW - 6), p.y + E.PH + 1.5, 2.5 + Math.random() * 2.5);
    }
    if (!p.gr && p.tl) stamp(p.x - 1, p.y + 4 + Math.random() * 14, 2.5 + Math.random() * 2);
    if (!p.gr && p.tr) stamp(p.x + E.PW + 1, p.y + 4 + Math.random() * 14, 2.5 + Math.random() * 2);
  }

  function spray(x, y, speed, life) {
    var a = Math.random() * Math.PI * 2;
    particles.push({ x: x, y: y, vx: Math.cos(a) * speed * (0.5 + Math.random()), vy: Math.sin(a) * speed * (0.5 + Math.random()) - speed * 0.3, r: 2 + Math.random() * 2, color: "#e5281b", life: life || 1 });
  }

  function splat() {
    var p = world.p, why = world.dead;
    splats++; totalSplats++; store.set("splats", totalSplats);
    lastDeath = { x: p.x, y: p.y, why: why };
    respawnIn = 0.35;
    if (why === "sizzle") { sfx.sizzle(); popups.push({ x: p.x + 10, y: p.y - 4, text: "SIZZLE!", color: "#ff9a2e", age: 0 }); }
    else popups.push({ x: p.x + 10, y: Math.min(p.y - 4, VH - 30), text: "SPLAT!", color: "#ff5a3c", age: 0 });
    sfx.splat();
    for (var i = 0; i < 26; i++) {
      var a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 320;
      particles.push({ x: p.x + 10, y: Math.min(p.y + 10, VH - 4), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, r: 2.5 + Math.random() * 3.5, color: Math.random() < 0.3 ? "#ff6a4d" : "#e5281b", life: 1.4 });
    }
    // a big cartoon splat on whatever he hit
    for (var j = 0; j < 7; j++) stamp(p.x + 10 + (Math.random() - 0.5) * 34, p.y + 10 + (Math.random() - 0.5) * 34, 4 + Math.random() * 6);
    updateHud();
  }

  function stepParticles(dt) {
    if (!map) return;
    particles = particles.filter(function (q) {
      q.life -= dt;
      q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.life <= 0 || q.y > VH + 20) return false;
      if (!q.crumb) {
        var c = Math.floor(q.x / T), r = Math.floor(q.y / T);
        if (c < 0 || c >= COLS || r < 0 || (r < ROWS && isSolidCh(map.grid[r][c]))) { stamp(q.x, q.y, q.r * 1.3); return false; }
      }
      return true;
    });
  }

  function win() {
    var t = Math.round(world.t * 100) / 100, key = String(li + 1);
    sfx.win();
    var prev = best[key], isBest = prev == null || t < prev;
    if (isBest) { best[key] = t; store.set("best", best); }
    if (li + 2 > unlocked && li + 1 < LEVELS.length) { unlocked = li + 2; store.set("unlocked", unlocked); }
    for (var i = 0; i < 18; i++) spray(map.goal.c * T + 15, map.goal.r * T + 10, 160, 1);
    $("done-title").textContent = ["Nachos sauced!", "Extra spicy!", "Saucy!", "Hot stuff!"][li % 4];
    $("done-time").textContent = fmt(t);
    $("done-best-line").innerHTML = isBest ? '<span class="new-best">New best time!</span>' : "Best: " + fmt(prev);
    $("done-splats").textContent = "💥 " + splats + (splats === 1 ? " splat" : " splats");
    $("next-btn").textContent = li + 1 < LEVELS.length ? "Next level" : "Finish!";
    wonAt = clock; // the frame loop opens the done screen a moment later
  }

  function drawHero(cv) {
    var g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(4, 0, 0, 4, 0, 0);
    var hop = Math.abs(Math.sin(clock * 3.2));
    g.fillStyle = "rgba(160, 30, 15, 0.25)";
    g.beginPath(); g.ellipse(37.5, 54, 14 - hop * 4, 3, 0, 0, Math.PI * 2); g.fill();
    var sy = 1 + (hop > 0.95 ? -0.15 : hop * 0.08), sx = 1 + (hop > 0.95 ? 0.15 : -hop * 0.05);
    drawSauceBoy(g, 37.5, 54 - hop * 14, 1, sx, sy, clock, { blink: blink > 0 });
  }

  // ---------- Screens ----------
  var screens = { title: "title-screen", levels: "levels-screen", paused: "pause-screen", done: "done-screen", end: "end-screen" };
  function show(m) {
    mode = m;
    Object.keys(screens).forEach(function (k) { $(screens[k]).hidden = k !== m; });
    hud.hidden = !(m === "play" || m === "paused" || m === "done");
    if (m !== "play") { tip.classList.add("fade"); }
    if (m === "play") startMusic(); else if (m === "title" || m === "levels" || m === "end") stopMusic();
    clearHeld();
    layout();
    var focus = { title: "play-btn", paused: "resume-btn", done: "next-btn", end: "end-levels-btn" }[m];
    if (focus) setTimeout(function () { try { $(focus).focus({ preventScroll: true }); } catch (e) { /* old browsers */ } }, 0);
  }
  function startLevel(n) {
    loadLevel(n);
    show("play");
  }
  function buildLevelGrid() {
    var grid = $("level-grid"); grid.innerHTML = "";
    LEVELS.forEach(function (L, i) {
      var b = document.createElement("button");
      var bt = best[String(i + 1)];
      b.className = "lvl" + (bt != null ? " done" : "");
      b.disabled = i + 1 > unlocked;
      b.innerHTML = "<b>" + (i + 1) + "</b><span></span><span class='best'></span>";
      b.children[1].textContent = L.name;
      b.children[2].textContent = bt != null ? fmt(bt) : (i + 1 > unlocked ? "locked" : "new!");
      b.addEventListener("click", function () { audio(); startLevel(i); });
      grid.appendChild(b);
    });
  }
  function firstUnbeaten() {
    for (var i = 0; i < unlocked; i++) if (best[String(i + 1)] == null) return i;
    return unlocked - 1;
  }

  $("play-btn").addEventListener("click", function () { audio(); startLevel(firstUnbeaten()); });
  $("levels-btn").addEventListener("click", function () { buildLevelGrid(); show("levels"); });
  $("levels-back").addEventListener("click", function () { show("title"); });
  $("sound-btn").addEventListener("click", function () { setSound(!soundOn); audio(); });
  $("pause-sound-btn").addEventListener("click", function () { setSound(!soundOn); audio(); });
  $("pause-btn").addEventListener("click", function () { if (mode === "play") show("paused"); });
  $("resume-btn").addEventListener("click", function () { show("play"); });
  $("restart-btn").addEventListener("click", function () { restart(); });
  $("pause-levels-btn").addEventListener("click", function () { buildLevelGrid(); show("levels"); });
  $("pause-title-btn").addEventListener("click", function () { show("title"); });
  $("next-btn").addEventListener("click", next);
  $("retry-btn").addEventListener("click", function () { loadLevel(li, true); show("play"); });
  $("done-levels-btn").addEventListener("click", function () { buildLevelGrid(); show("levels"); });
  $("end-levels-btn").addEventListener("click", function () { buildLevelGrid(); show("levels"); });
  $("end-title-btn").addEventListener("click", function () { show("title"); });

  function restart() { loadLevel(li, true); show("play"); }
  function next() {
    if (li + 1 < LEVELS.length) startLevel(li + 1);
    else {
      var sum = 0; for (var i = 1; i <= LEVELS.length; i++) sum += best[String(i)] || 0;
      $("end-time").textContent = "All best times: " + fmt(sum);
      $("end-splats").textContent = "💥 " + totalSplats + " splats in all";
      show("end");
    }
  }

  // ---------- Keyboard ----------
  var KEYMAP = { ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r", Space: "j", ArrowUp: "j", KeyW: "j", KeyZ: "j", KeyK: "j" };
  function clearHeld() { keys = {}; padHeld = { l: false, r: false, j: false }; pointers = {}; refreshPad(); }
  window.addEventListener("keydown", function (e) {
    var k = KEYMAP[e.code];
    if (mode === "play") {
      if (k) { keys[k] = true; e.preventDefault(); return; }
      if (e.code === "KeyP" || e.code === "Escape") { show("paused"); e.preventDefault(); }
      else if (e.code === "KeyR") { restart(); e.preventDefault(); }
    } else if (mode === "paused") {
      if (e.code === "KeyP" || e.code === "Escape") { show("play"); e.preventDefault(); }
      else if (e.code === "KeyR") { restart(); e.preventDefault(); }
    } else if (mode === "done" && (k === "j" || e.code === "Enter") && clock - wonAt > 0.9) {
      e.preventDefault(); next();
    } else if (mode === "levels" && e.code === "Escape") show("title");
  });
  window.addEventListener("keyup", function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener("blur", function () { if (mode === "play") show("paused"); clearHeld(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && mode === "play") show("paused"); });

  // ---------- Touch pad (slide your thumb between ← and →) ----------
  var pointers = {};
  function padAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var b = el && el.closest ? el.closest("[data-pad]") : null;
    return b ? b.getAttribute("data-pad") : null;
  }
  function refreshPad() {
    padHeld = { l: false, r: false, j: false };
    Object.keys(pointers).forEach(function (id) { var v = pointers[id]; if (v) padHeld[v] = true; });
    $("btn-left").classList.toggle("on", padHeld.l);
    $("btn-right").classList.toggle("on", padHeld.r);
    $("btn-jump").classList.toggle("on", padHeld.j);
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-pad]"), function (b) {
    b.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      touchMode = true; audio();
      pointers[e.pointerId] = b.getAttribute("data-pad");
      refreshPad();
    });
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  });
  window.addEventListener("pointermove", function (e) {
    if (!(e.pointerId in pointers)) return;
    var v = padAt(e.clientX, e.clientY);
    // the jump thumb stays on jump; the run thumb can slide between left and right
    if (pointers[e.pointerId] === "j") return;
    if (v === "l" || v === "r") pointers[e.pointerId] = v;
    else if (v === null) pointers[e.pointerId] = null;
    refreshPad();
  });
  function lift(e) { if (e.pointerId in pointers) { delete pointers[e.pointerId]; refreshPad(); } }
  window.addEventListener("pointerup", lift);
  window.addEventListener("pointercancel", lift);
  window.addEventListener("touchstart", function () { if (!touchMode) { touchMode = true; layout(); } }, { passive: true });

  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", layout);

  // ---------- A small window for the evidence tests ----------
  window.__ssb = {
    get mode() { return mode; },
    get level() { return li + 1; },
    get splats() { return splats; },
    get player() { var p = world.p; return { x: p.x, y: p.y, vx: p.vx, vy: p.vy, grounded: p.gr, wallLeft: p.tl, wallRight: p.tr }; },
    get time() { return world.t; },
    get won() { return world.won; },
    get dead() { return world.dead; },
    get best() { return JSON.parse(JSON.stringify(best)); },
    levelCount: LEVELS.length,
    levelNames: LEVELS.map(function (L) { return L.name; }),
    start: function (n) { audio(); frozen = false; startLevel(n - 1); },
    freeze: function (on) { frozen = !!on; },
    // Plays a recorded run (one letter per `step` ticks: r/l/n, capital = jump held) through the real game.
    play: function (inputs, step, upTo) {
      loadLevel(li, true); // from the very start, in one go, so the real-time loop can't nudge it
      var n = upTo == null ? inputs.length : Math.min(inputs.length, upTo);
      for (var i = 0; i < n && !world.won && !world.dead; i++) {
        var ch = inputs[i], inp = { l: ch === "l" || ch === "L", r: ch === "r" || ch === "R", j: ch === ch.toUpperCase() };
        for (var s = 0; s < step && !world.won && !world.dead; s++) tick(inp);
      }
      updateHud();
      return { won: world.won, dead: world.dead, t: Math.round(world.t * 100) / 100 };
    }
  };

  // ---------- Go ----------
  loadLevel(0);
  tip.classList.add("fade");
  setSound(soundOn);
  show("title");
  requestAnimationFrame(frame);
})();
