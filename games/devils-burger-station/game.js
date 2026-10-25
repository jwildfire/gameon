// Devil's Burger Station: screens, drawing, touch and keyboard, sound and saves.
// The counter itself (devils, tickets, patience, tips) is in engine.js.
(function () {
  "use strict";
  var E = window.DBS, A = window.DBSArt, B = window.DBSBot;
  var $ = function (id) { return document.getElementById(id); };

  // ---- saves: everything under gameon.devils-burger-station. ----
  var PREFIX = "gameon.devils-burger-station.";
  function load(k, def) {
    try { var v = window.localStorage.getItem(PREFIX + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  }
  function save(k, v) { try { window.localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* saving is blocked: play on */ } }
  var progress = load("progress", null);
  if (!progress || typeof progress !== "object") progress = {};
  progress.unlocked = Math.max(1, Math.min(E.SHIFTS.length, progress.unlocked | 0 || 1));
  progress.stars = progress.stars && typeof progress.stars === "object" ? progress.stars : {};
  progress.best = progress.best && typeof progress.best === "object" ? progress.best : {};
  var bestScore = Math.max(0, Number(load("best", 0)) || 0);
  var soundOn = load("sound", true) !== false;

  // ---- sound: all made here with WebAudio ----
  var AC = null, master = null, noiseBuf = null;
  function ac() {
    if (AC) return AC;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
      master = AC.createGain(); master.gain.value = soundOn ? 0.5 : 0; master.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
    return AC;
  }
  function tone(f, dur, type, vol, f2, when) {
    if (!AC || !soundOn) return;
    var t = when || AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, kind, f2, when) {
    if (!AC || !soundOn) return;
    var t = when || AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = kind || "bandpass"; f.frequency.setValueAtTime(freq || 1000, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  var sfx = {
    plop: function () { tone(420, 0.12, "sine", 0.22, 200); },
    sizzle: function () { noise(0.45, 0.12, 4000, "highpass"); tone(300, 0.1, "sine", 0.15, 160); },
    squirt: function () { noise(0.25, 0.25, 700, "bandpass", 2400); tone(180, 0.15, "triangle", 0.12, 90); },
    undo: function () { tone(500, 0.08, "square", 0.08, 300); },
    trash: function () { noise(0.3, 0.2, 2000, "bandpass", 300); },
    nope: function () { tone(200, 0.15, "square", 0.08, 150); },
    bell: function () { tone(1320, 0.5, "sine", 0.12); tone(1760, 0.4, "sine", 0.08); },
    ding: function () { var t = AC && AC.currentTime; tone(988, 0.15, "square", 0.1, null, t); tone(1319, 0.35, "square", 0.1, null, t + 0.09); tone(1976, 0.4, "sine", 0.1, null, t + 0.09); },
    grumble: function () { if (!AC || !soundOn) return; var t = AC.currentTime; for (var i = 0; i < 3; i++) tone(120 - i * 10, 0.16, "sawtooth", 0.08, 90, t + i * 0.13); },
    whistle: function () { tone(600, 0.8, "sine", 0.16, 2200); noise(0.9, 0.18, 3000, "highpass"); },
    stomp: function () { if (!AC || !soundOn) return; var t = AC.currentTime; for (var i = 0; i < 3; i++) tone(90, 0.18, "sine", 0.35, 40, t + 0.5 + i * 0.22); },
    fanfare: function () { if (!AC || !soundOn) return; var t = AC.currentTime; [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.3, "square", 0.1, null, t + i * 0.14); }); tone(1047, 0.7, "triangle", 0.12, null, t + 0.56); },
    cheer: function () { if (!AC || !soundOn) return; var t = AC.currentTime; [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.25, "square", 0.08, null, t + i * 0.1); }); },
    sad: function () { if (!AC || !soundOn) return; var t = AC.currentTime; [392, 370, 349, 262].forEach(function (f, i) { tone(f, 0.35, "triangle", 0.14, null, t + i * 0.25); }); }
  };

  // A bouncy cooking tune: bass on the beat, a bubbly tune on top.
  var BASS = [48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 55, 55, 57, 55, 53, 52];
  var MEL = [72, 0, 76, 79, 77, 76, 74, 0, 72, 74, 76, 72, 67, 0, 0, 0, 69, 0, 72, 76, 74, 72, 71, 0, 72, 76, 79, 84, 79, 0, 0, 0];
  var music = { on: false, next: 0, step: 0, timer: 0 };
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function musicTick() {
    if (!music.on || !AC) return;
    var stepLen = 60 / 136 / 2;
    while (music.next < AC.currentTime + 0.3) {
      var s = music.step, t = music.next;
      if (s % 2 === 0) tone(midi(BASS[(s / 2) % BASS.length]), 0.22, "triangle", 0.11, null, t);
      var m = MEL[s % MEL.length];
      if (m) tone(midi(m), 0.16, "square", 0.035, null, t);
      if (s % 2 === 1) noise(0.04, 0.05, 8000, "highpass", null, t);
      music.step++; music.next += stepLen;
    }
  }
  function musicOn(on) {
    if (on && (!soundOn || !ac())) on = false;
    if (on === music.on) return;
    music.on = on;
    if (on) { music.next = AC.currentTime + 0.1; if (!music.timer) music.timer = setInterval(musicTick, 80); }
  }
  function setSound(on) {
    soundOn = on; save("sound", on);
    if (master) master.gain.value = on ? 0.5 : 0;
    ["title-sound-btn", "pause-sound-btn"].forEach(function (id) { $(id).textContent = "Sound: " + (on ? "on" : "off"); $(id).setAttribute("aria-pressed", String(on)); });
    if (!on) musicOn(false); else if (mode === "play" || mode === "title") musicOn(true);
  }
  function unlockAudio() { if (ac() && AC.state === "suspended") AC.resume(); if (mode === "play" || mode === "title") musicOn(true); }
  window.addEventListener("pointerdown", unlockAudio, { capture: true });
  window.addEventListener("keydown", unlockAudio, { capture: true });

  // ---- canvas and layout ----
  var canvas = $("game"), ctx = canvas.getContext("2d");
  var dpr = 1, scale = 1, W = 600, H = 520, L = {};
  function layout() {
    var cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    scale = Math.min(cw / 600, ch / 520);
    W = cw / scale; H = ch / scale;
    var wide = W >= 880;
    var hud = 50 / scale;
    if (wide) {
      L = { wide: true, hud: hud, counterY: H - 150, plate: { x: 180, y: H - 34, w: 220 }, x0: 380, x1: W - 30 };
    } else {
      var cy = Math.max(hud + 260, H - 250);
      L = { wide: false, hud: hud, counterY: cy, plate: { x: W / 2, y: H - 26, w: Math.min(200, (H - cy) * 0.78) }, x0: 8, x1: W - 8 };
    }
  }
  function slotX(i, n) { return L.x0 + (i + 0.5) * (L.x1 - L.x0) / n; }
  function devilScale(n, boss) { var s = Math.min(L.wide ? 1.2 : 1.45, (L.x1 - L.x0) / n / 150); return boss ? s * 1.3 : s; }
  new ResizeObserver(layout).observe(canvas);
  layout();

  // ---- the tray ----
  var tray = $("tray"), btns = {};
  function trayBtn(cls, id, label, key, art) {
    var b = document.createElement("button");
    b.className = "tbtn " + cls; b.dataset.id = id; b.type = "button";
    b.setAttribute("aria-label", label + " (" + key + ")");
    if (art) {
      var cv = document.createElement("canvas"); cv.width = cv.height = 80;
      A.icon(cv.getContext("2d"), id, 80);
      b.appendChild(cv);
    } else if (cls.indexOf("tool") >= 0) {
      b.insertAdjacentHTML("beforeend", id === "undo"
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5L3 11l6 6v-4h6a4 4 0 010 8h-2v3h2a7 7 0 000-14H9z"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l1 2h4v3H3V5h4zM5 9h14l-1.2 12.5a1.5 1.5 0 01-1.5 1.5H7.7a1.5 1.5 0 01-1.5-1.5z"/></svg>');
    }
    var t = document.createElement("span"); t.textContent = label; b.appendChild(t);
    var k = document.createElement("span"); k.className = "k"; k.textContent = key; b.appendChild(k);
    b.addEventListener("click", function () { press(id); });
    tray.appendChild(b); btns[id] = b;
    return b;
  }
  E.INGREDIENTS.forEach(function (g) { trayBtn("ing", g.id, g.name, g.key, true); });
  var gap = document.createElement("div"); gap.className = "gap"; tray.appendChild(gap);
  E.SAUCES.forEach(function (s) { trayBtn("sauce " + s.id, s.id, s.name, s.key, true); });
  trayBtn("tool", "undo", "Undo", "⌫");
  trayBtn("tool", "trash", "Trash", "T");
  var serveBtn = trayBtn("serve", "serve", "SERVE", "Enter");
  serveBtn.id = "serve-btn";
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) document.body.classList.add("no-keys");

  function flash(id) { var b = btns[id]; if (!b) return; b.classList.add("hit"); setTimeout(function () { b.classList.remove("hit"); }, 110); }

  // ---- game state ----
  var mode = "title", st = null, shiftN = 1, runScore = 0, attract = true;
  var botOn = false, botTap = 0.5, botTimer = 0, speed = 1, frozen = false;
  var popups = [], plateBounce = 0, toastTimer = 0, clock = 0;
  var botRng = (function () { var s = 99; return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();

  function newSeed() { return window.DBS_SEED != null ? window.DBS_SEED : 1 + Math.floor(Math.random() * 100000); }

  function show(id) {
    ["title-screen", "intro-screen", "pause-screen", "clear-screen", "fail-screen", "win-screen"].forEach(function (s) { $(s).hidden = s !== id; });
    $("hud").hidden = !(id === null || id === "pause-screen" || id === "intro-screen");
  }

  function toast(text, secs) {
    var t = $("toast"); t.textContent = text; t.classList.remove("fade");
    toastTimer = secs || 1.6;
  }

  function steamPills() {
    var html = "";
    for (var i = 0; i < E.MAX_STEAM; i++) {
      html += '<svg viewBox="0 0 24 20" aria-hidden="true"><path class="puff' + (st && i < st.steam ? " used" : "") + '" d="M6 17a4 4 0 01-.5-8A5 5 0 0115 6a4 4 0 014.5 4A3.5 3.5 0 0118 17z"/></svg>';
    }
    $("hud-steam").innerHTML = html;
    $("hud-steam").setAttribute("aria-label", (st ? st.steam : 0) + " of 3 devils steaming mad");
  }
  var lastHud = "";
  function updateHud() {
    if (!st) return;
    var key = [st.shift, st.coins, st.done, st.steam, st.combo].join(",");
    if (key === lastHud) return;
    lastHud = key;
    $("hud-shift").textContent = (L.wide || W > 700 ? "Shift " + st.shift + ": " + st.S.name : "Shift " + st.shift);
    $("coins").textContent = st.coins;
    $("devils-left").textContent = st.done + "/" + st.total;
    steamPills();
    var c = $("hud-combo");
    if (st.combo >= 3) { c.hidden = false; c.textContent = "COMBO x" + (st.combo >= 6 ? 3 : 2); } else c.hidden = true;
  }

  function titleScreen() {
    mode = "title"; attract = true; botOn = true; botTap = 0.9; speed = 1; frozen = false;
    st = E.newShift(2, 3);
    show("title-screen");
    $("best-line").textContent = bestScore > 0 ? "Best score: " + bestScore : "Best score: none yet";
    var row = $("shift-row"); row.innerHTML = "";
    for (var n = 1; n <= E.SHIFTS.length; n++) {
      var b = document.createElement("button");
      b.className = "btn alt small"; b.textContent = n; b.dataset.shift = n;
      var stars = progress.stars[n] | 0;
      b.title = "Shift " + n + ": " + E.SHIFTS[n - 1].name + (stars ? " (" + stars + " stars)" : "");
      b.setAttribute("aria-label", b.title);
      b.disabled = n > progress.unlocked;
      if (stars) b.textContent = n + " " + "★".repeat(stars);
      b.addEventListener("click", (function (k) { return function () { startRun(k); }; })(n));
      row.appendChild(b);
    }
    musicOn(true);
  }

  function startRun(n) { runScore = 0; startShift(n); }

  function startShift(n, seed, skipIntro) {
    shiftN = n; attract = false; botOn = false; frozen = false; speed = 1;
    st = E.newShift(n, seed != null ? seed : newSeed());
    popups = []; lastHud = "";
    var S = st.S;
    $("intro-title").textContent = "Shift " + n + ": " + S.name;
    $("intro-text").textContent = S.intro;
    $("intro-goal").textContent = st.total + " devils to feed. If 3 get steaming mad, the shift is over.";
    updateHud();
    if (skipIntro) go(); else { mode = "intro"; show("intro-screen"); musicOn(false); }
  }

  function go() {
    mode = "play"; show(null); musicOn(true);
    if (st.shift === 1 && st.t === 0) toast("Copy the ticket, add the hot sauce, tap the devil!", 3.2);
  }

  function pause() {
    if (mode !== "play") return;
    mode = "pause"; show("pause-screen"); musicOn(false);
  }
  function resume() { if (mode !== "pause") return; mode = "play"; show(null); musicOn(true); }

  function shiftOver(result) {
    musicOn(false);
    if (result === "clear") {
      runScore += st.coins;
      var stars = E.stars(st);
      progress.stars[shiftN] = Math.max(progress.stars[shiftN] | 0, stars);
      progress.best[shiftN] = Math.max(progress.best[shiftN] | 0, st.coins);
      if (shiftN < E.SHIFTS.length) progress.unlocked = Math.max(progress.unlocked, shiftN + 1);
      save("progress", progress);
      var newBest = runScore > bestScore;
      if (newBest) { bestScore = runScore; save("best", bestScore); }
      if (shiftN === E.SHIFTS.length) {
        mode = "win"; show("win-screen");
        $("win-score").textContent = "Score: " + runScore;
        $("win-best").hidden = !newBest;
        sfx.fanfare();
        return;
      }
      mode = "clear"; show("clear-screen");
      $("clear-title").textContent = "Shift " + shiftN + " clear!";
      $("clear-stars").innerHTML = [1, 2, 3].map(function (i) { return '<span class="' + (i <= stars ? "" : "off") + '">★</span>'; }).join("");
      $("clear-stars").setAttribute("aria-label", stars + " stars");
      $("clear-coins").textContent = "Coins: " + st.coins;
      $("clear-tips").textContent = "Tips: " + st.tips;
      $("clear-perfect").textContent = "Perfect: " + st.perfect + "/" + st.served;
      $("clear-combo").textContent = "Best combo: " + st.bestCombo;
      $("clear-line").textContent = "Score so far: " + runScore + (newBest ? " (new best!)" : "") + ". Next up: " + E.SHIFTS[shiftN].name + ".";
      sfx.cheer();
    } else {
      mode = "fail"; show("fail-screen");
      $("fail-line").textContent = "You fed " + (st.done - st.mad) + " of " + st.total + " devils on shift " + shiftN + ".";
      sfx.sad();
    }
  }

  // ---- what the cook does ----
  function press(id) {
    if (mode !== "play" || !st) return;
    flash(id);
    if (id === "serve") E.serve(st, null);
    else if (id === "undo") E.undo(st);
    else if (id === "trash") E.trash(st);
    else if (id === "mild" || id === "fiery" || id === "lava") E.sauce(st, id);
    else E.add(st, id);
  }

  var keyMap = {};
  E.INGREDIENTS.forEach(function (g) { keyMap[g.key] = g.id; });
  E.SAUCES.forEach(function (s) { keyMap[s.key.toLowerCase()] = s.id; });
  window.addEventListener("keydown", function (e) {
    var k = e.key, lk = k.length === 1 ? k.toLowerCase() : k;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (mode === "play") {
      if (keyMap[lk]) press(keyMap[lk]);
      else if (k === "Enter" || k === " ") press("serve");
      else if (k === "Backspace" || lk === "z" || lk === "u") press("undo");
      else if (k === "Delete" || lk === "t") press("trash");
      else if (k === "ArrowLeft") E.select(st, -1);
      else if (k === "ArrowRight") E.select(st, 1);
      else if (lk === "p" || k === "Escape") pause();
      else return;
      e.preventDefault();
    } else if (mode === "pause" && (lk === "p" || k === "Escape")) { resume(); e.preventDefault(); }
    else if ((k === "Enter" || k === " ") && !(e.target && e.target.tagName === "BUTTON")) {
      if (mode === "intro") go();
      else if (mode === "title") $("play-btn").click();
      else if (mode === "clear") $("next-btn").click();
      else if (mode === "fail") $("fail-retry-btn").click();
      else return;
      e.preventDefault();
    }
  });

  // Tap a devil (or their ticket) to hand them the burger.
  canvas.addEventListener("pointerdown", function (e) {
    if (mode !== "play" || !st) return;
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    var n = st.slots.length, w = (L.x1 - L.x0) / n;
    if (y < L.counterY + 20) {
      for (var i = 0; i < n; i++) {
        if (Math.abs(x - slotX(i, n)) < w / 2 && E.waiting(st.slots[i])) { E.serve(st, i); return; }
      }
    }
    var p = L.plate;
    if (Math.abs(x - p.x) < p.w * 0.6 && y > L.counterY + 20) press("serve");
  });

  $("play-btn").addEventListener("click", function () { startRun(1); });
  $("go-btn").addEventListener("click", go);
  $("pause-btn").addEventListener("click", pause);
  $("resume-btn").addEventListener("click", resume);
  $("restart-btn").addEventListener("click", function () { startShift(shiftN); });
  $("pause-title-btn").addEventListener("click", titleScreen);
  $("next-btn").addEventListener("click", function () { startShift(Math.min(E.SHIFTS.length, shiftN + 1)); });
  $("retry-btn").addEventListener("click", function () { runScore -= st.coins; startShift(shiftN); });
  $("fail-retry-btn").addEventListener("click", function () { startShift(shiftN); });
  $("fail-title-btn").addEventListener("click", titleScreen);
  $("win-again-btn").addEventListener("click", function () { startRun(1); });
  $("win-title-btn").addEventListener("click", titleScreen);
  $("title-sound-btn").addEventListener("click", function () { setSound(!soundOn); });
  $("pause-sound-btn").addEventListener("click", function () { setSound(!soundOn); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });

  // ---- what happened on the counter: sounds and pop-up words ----
  var YUM = ["Devilishly good!", "Mmm, spicy!", "Hot diggity!", "Perfecto!", "Yum yum!", "Sizzlin'!", "Order up!"];
  var LABEL = { mild: "MILD", fiery: "FIERY", lava: "LAVA" };
  function popup(text, x, y, color, size, life) { popups.push({ text: text, x: x, y: y, color: color || "#fff3d6", size: size || 28, age: 0, life: life || 1.6 }); }
  function devilXY(slot) { var n = st.slots.length, d = st.slots[slot]; return { x: slotX(slot, n), y: L.counterY - 120 * devilScale(n, d && d.boss) }; }

  function handle(ev) {
    var quiet = attract;
    var p;
    switch (ev.type) {
      case "add": plateBounce = 1; if (!quiet) { if (ev.id === "patty") sfx.sizzle(); else sfx.plop(); } break;
      case "sauce": plateBounce = 1; if (!quiet) sfx.squirt(); break;
      case "undo": if (!quiet) sfx.undo(); break;
      case "trash": if (!quiet) { sfx.trash(); toast("Into the lava bin!", 1); } break;
      case "full": if (!quiet) { sfx.nope(); toast("That's tall enough!"); } break;
      case "nosaucebase": if (!quiet) { sfx.nope(); toast("Put a bun down first!"); } break;
      case "noburger": if (!quiet) { sfx.nope(); toast("Make a burger first!"); } break;
      case "nobody": if (!quiet) { sfx.nope(); toast("Nobody's at the counter yet!"); } break;
      case "arrive": if (!quiet) sfx.bell(); break;
      case "boss": if (!quiet) { sfx.fanfare(); toast("BIG BOSS BLAZE IS HERE!", 2.4); } break;
      case "perfect":
        p = devilXY(ev.slot);
        popup(YUM[(ev.devil.id + st.perfect) % YUM.length], p.x, p.y - 30, "#fff3d6", 26);
        popup("+" + ev.pay + (ev.tip ? "  +" + ev.tip + " tip" : ""), p.x, p.y + 5, "#ffd23a", 30);
        if (!quiet) { sfx.ding(); if (ev.mult > 1 && (ev.combo === 3 || ev.combo === 6)) toast("COMBO! Tips x" + ev.mult, 1.6); }
        break;
      case "meh":
        p = devilXY(ev.slot);
        popup("Hmph. Not my burger...", p.x, p.y - 30, "#fff3d6", 22);
        popup("+" + ev.pay, p.x, p.y + 5, "#ffd23a", 26);
        if (!quiet) sfx.grumble();
        break;
      case "mad":
        p = devilXY(ev.slot);
        var why = ev.reason === "nosauce" ? "NO HOT SAUCE?!" : ev.reason === "wrongsauce" ? "That's not " + LABEL[ev.want] + "!" : "Too slow!";
        popup(why, p.x, p.y - 34, "#ffffff", 26, 2);
        popup("STEAMING MAD!", p.x, p.y + 4, "#ff8a6b", 30, 2);
        if (!quiet) { sfx.whistle(); sfx.grumble(); sfx.stomp(); }
        break;
      case "clear": case "fail":
        if (attract) { st = E.newShift(2, 3 + Math.floor(Math.random() * 50)); popups = []; }
        else shiftOver(ev.type);
        break;
    }
  }

  // ---- drawing ----
  function ease(p) { p = Math.max(0, Math.min(1, p)); return 1 - Math.pow(1 - p, 3); }

  function drawTicket(d, x, bottomY, s, isTarget, t) {
    var n = d.orders.length, bw = (n > 1 ? 56 : 76) * (d.boss ? 1.1 : 1);
    var tallest = 0;
    d.orders.forEach(function (o) { tallest = Math.max(tallest, A.stackHeight(o.layers, bw) + bw * 0.1); });
    var w = n * bw * 1.22 + 14, h = tallest + 58;
    var avail = bottomY - (L.hud + 4);
    var maxW = (L.x1 - L.x0) / st.slots.length - 6;
    var k = Math.max(0.45, Math.min(L.wide ? 1.25 : 1.5, avail / (h + 10), maxW / w));
    ctx.save();
    ctx.translate(x, bottomY);
    ctx.scale(k, k);
    var top = -h - 10;
    // card and pointer
    ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(0, 0); ctx.lineTo(9, -11); ctx.closePath();
    ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.strokeStyle = A.INK; ctx.lineWidth = 2.5; ctx.stroke();
    A.rr(ctx, -w / 2, top, w, h, 12);
    ctx.fillStyle = "#fffaf0"; ctx.fill();
    ctx.lineWidth = isTarget ? 5 : 2.5; ctx.strokeStyle = isTarget ? "#ffb000" : d.boss ? "#c08a00" : A.INK; ctx.stroke();
    // patience bar
    var f = d.patience / d.maxPatience;
    A.rr(ctx, -w / 2 + 8, top + 7, w - 16, 9, 4.5); ctx.fillStyle = "#e9d8c2"; ctx.fill();
    if (f > 0) {
      A.rr(ctx, -w / 2 + 8, top + 7, (w - 16) * f, 9, 4.5);
      ctx.fillStyle = f > 0.55 ? "#5fc93d" : f > 0.28 ? "#ffc21f" : (Math.sin(t * 14) > 0 ? "#ff3b1f" : "#ff8a6b");
      ctx.fill();
    }
    // each burger on the ticket, bottom bun up, with its hot sauce sticker
    d.orders.forEach(function (o, i) {
      var ox = -w / 2 + 7 + bw * 1.22 * (i + 0.5);
      ctx.globalAlpha = o.done ? 0.3 : 1;
      A.burger(ctx, o.layers, null, ox, -36, bw, t, 1.6);
      A.sauceChip(ctx, o.sauce, ox, -22, bw * 0.95, 17);
      ctx.globalAlpha = 1;
      if (o.done) {
        ctx.strokeStyle = "#2f9e2a"; ctx.lineWidth = 6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(ox - 14, -60); ctx.lineTo(ox - 3, -48); ctx.lineTo(ox + 16, -74); ctx.stroke();
      }
    });
    if (d.boss) {
      ctx.fillStyle = "#c08a00"; ctx.font = "900 13px ui-rounded, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("BOSS ORDER", 0, top + 26);
    }
    ctx.restore();
  }

  function drawDevil(d, i, n, t) {
    var s = devilScale(n, d.boss), x = slotX(i, n), y = L.counterY, p = (t - d.since);
    var mood = 1 - d.patience / d.maxPatience, state = d.state, dx = 0, dy = 0;
    if (state === "walkin") dx = (1 - ease(p / E.WALK_IN)) * (W - x + 120 * s);
    else if (state === "happy") { var q = p / E.LEAVE; dx = ease(q) * (W - x + 140 * s); dy = -Math.abs(Math.sin(q * 14)) * 22 * s; }
    else if (state === "meh") { dx = Math.max(0, p / E.LEAVE - 0.3) / 0.7 * (W - x + 140 * s); }
    else if (state === "mad") { var m = Math.max(0, p / E.LEAVE - 0.35) / 0.65; dx = -m * (x + 140 * s) + Math.sin(t * 40) * 3 * s; dy = -Math.abs(Math.sin(p * 9)) * 8 * s; }
    var look = Math.max(-1, Math.min(1, (L.plate.x - x) / 300));
    var dd = d; // the art reads hue, fussy, boss, id
    A.devil(ctx, dd, x + dx, y + dy, s, t, Math.min(1, mood), state === "walkin" ? "wait" : state, look);
    var steamAmt = state === "mad" ? 1.3 : state === "wait" ? Math.max(0, (mood - 0.6) / 0.4) : 0;
    A.steam(ctx, x + dx, y + dy - 30 * s + 50 * s, s, t, steamAmt);
    return { x: x + dx, s: s };
  }

  function draw(t) {
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    A.kitchen(ctx, W, H, L.counterY, t, L.wide);
    if (st) {
      var n = st.slots.length, tgt = st.plate.layers.length ? E.target(st) : (st.selected >= 0 ? st.selected : -1);
      var spots = [];
      st.slots.forEach(function (d, i) { if (d) spots[i] = drawDevil(d, i, n, st.t); });
      st.slots.forEach(function (d, i) {
        if (d && (d.state === "wait" || d.state === "walkin")) {
          var sp = spots[i];
          drawTicket(d, sp.x, L.counterY - 128 * sp.s, sp.s, i === tgt && !attract, st.t);
        }
      });
    }
    A.counter(ctx, W, H, L.counterY);
    // the plate and the burger you're making
    var P = L.plate, b = plateBounce;
    A.plate(ctx, P.x, P.y, P.w);
    if (st && st.plate.layers.length) {
      ctx.save();
      ctx.translate(P.x, P.y - 2);
      ctx.scale(1 + b * 0.05, 1 - b * 0.05);
      A.burger(ctx, st.plate.layers, st.plate.sauce, 0, 0, P.w * 0.8, t, 2.5);
      ctx.restore();
    } else if (mode === "play") {
      ctx.fillStyle = "rgba(255,243,214,0.75)"; ctx.font = "800 22px ui-rounded, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Start with a bun!", P.x, P.y - 40);
    }
    // pop-up words
    popups.forEach(function (pp) {
      var a = 1 - Math.max(0, pp.age - pp.life * 0.6) / (pp.life * 0.4);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = "900 " + pp.size + "px ui-rounded, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var y = pp.y - pp.age * 30, x = Math.max(110, Math.min(W - 110, pp.x));
      ctx.lineWidth = 6; ctx.strokeStyle = A.INK; ctx.lineJoin = "round"; ctx.strokeText(pp.text, x, y);
      ctx.fillStyle = pp.color; ctx.fillText(pp.text, x, y);
      ctx.globalAlpha = 1;
    });
  }

  // ---- the loop ----
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    clock += dt;
    var running = st && !frozen && (mode === "play" || (mode === "title" && attract));
    if (running) {
      var left = dt * speed;
      while (left > 1e-6) {
        var h = Math.min(1 / 60, left); left -= h;
        E.step(st, h);
        if (botOn && st.mode === "play") {
          botTimer -= h;
          if (botTimer <= 0) { B.act(st, B.next(st, botRng, attract ? 0.04 : 0)); botTimer = botTap; }
        }
        var evs = st.events; st.events = [];
        for (var i = 0; i < evs.length; i++) handle(evs[i]);
        if (mode !== "play" && !(mode === "title" && attract)) break;
      }
      for (var p = popups.length - 1; p >= 0; p--) { popups[p].age += dt * Math.max(1, speed * 0.5); if (popups[p].age > popups[p].life) popups.splice(p, 1); }
      plateBounce = Math.max(0, plateBounce - dt * 6);
    }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $("toast").classList.add("fade"); }
    updateHud();
    draw(st ? st.t : clock);
    requestAnimationFrame(frame);
  }

  setSound(soundOn);
  titleScreen();
  requestAnimationFrame(frame);

  // A small window for the evidence tests.
  window.__dbs = {
    get state() { return st; },
    get mode() { return mode; },
    get runScore() { return runScore; },
    get progress() { return JSON.parse(JSON.stringify(progress)); },
    get best() { return bestScore; },
    get layout() { return { W: W, H: H, scale: scale, counterY: L.counterY, wide: L.wide, x0: L.x0, x1: L.x1 }; },
    slotX: function (i) { return slotX(i, st.slots.length) * scale; },
    start: function (n, seed) { startShift(n, seed == null ? 1 : seed, true); },
    bot: function (on, spd, tap) { botOn = !!on; speed = spd || 1; botTap = tap || 0.5; botTimer = 0; },
    freeze: function (b) { frozen = !!b; },
    shifts: E.SHIFTS.length, ingredients: E.INGREDIENTS.length, sauces: E.SAUCES.length
  };
})();
