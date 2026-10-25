// Oops! We're Late!: the screens, the controls (touch and keyboard), the sound (made in the
// browser with WebAudio), saves, and drawing each frame with art.js.
(function () {
  "use strict";
  var E = window.OWL, A = window.OWLArt, BOT = window.OWLBot;
  var W = E.W, H = E.H, N = E.ROOMS.length;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), canvas = $("game"), ctx = canvas.getContext("2d"), hud = $("hud"), tipEl = $("tip");
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  // ---------- saves (gameon.oops-were-late.*) ----------
  var KEY = "gameon.oops-were-late.";
  function load(k, d) { try { var v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* storage blocked: play on */ } }
  var best = load("stars", []);
  if (!Array.isArray(best)) best = [];
  for (var i = 0; i < N; i++) best[i] = Math.max(0, Math.min(3, Number(best[i]) || 0));
  var soundOn = load("sound", true) !== false;
  function totalStars() { return best.reduce(function (a, b) { return a + b; }, 0); }
  function unlocked(n) { return n === 1 || best[n - 2] > 0; }

  // ---------- sound ----------
  var AC = null, master = null, noiseBuf = null;
  function audio() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.gain.value = soundOn ? 0.9 : 0; master.connect(AC.destination);
        noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
        var d = noiseBuf.getChannelData(0), r = E.rng(99);
        for (var j = 0; j < d.length; j++) d[j] = r() * 2 - 1;
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === "suspended") { try { AC.resume(); } catch (e) { /* fine */ } }
    return AC;
  }
  function env(g, t0, peak, dur, attack) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function tone(f1, f2, dur, type, vol, delay, filter) {
    if (!AC || !soundOn) return;
    var t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f1, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    env(g, t0, vol, dur, Math.min(0.03, dur / 4));
    var last = o;
    if (filter) { var f = AC.createBiquadFilter(); f.type = filter[0]; f.frequency.value = filter[1]; f.Q.value = filter[2] || 1; o.connect(f); last = f; }
    last.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  function hiss(dur, f1, f2, q, vol, delay, type) {
    if (!AC || !soundOn) return;
    var t0 = AC.currentTime + (delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = type || "bandpass"; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f1, t0); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    env(g, t0, vol, dur, Math.min(0.04, dur / 3));
    s.connect(f); f.connect(g); g.connect(master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }
  var SFX = {
    step: function (e) { if (e.quiet) hiss(0.04, 2600, 0, 2, 0.018); else hiss(0.06, 900, 500, 1.5, 0.05); },
    creak: function () { tone(105, 150, 0.22, "sawtooth", 0.09, 0, ["lowpass", 700, 4]); tone(150, 88, 0.32, "sawtooth", 0.08, 0.2, ["lowpass", 650, 4]); },
    "creak-soft": function () { tone(120, 100, 0.25, "sawtooth", 0.035, 0, ["lowpass", 500, 3]); },
    squeak: function () { tone(950, 1750, 0.1, "square", 0.04, 0, ["lowpass", 3000, 1]); tone(1700, 1100, 0.13, "square", 0.035, 0.11, ["lowpass", 3000, 1]); },
    warn: function (e) { if (e.who === "teacher") { tone(250, 330, 0.28, "triangle", 0.06); } else tone(330, 420, 0.22, "triangle", 0.04); },
    wiggle: function () { hiss(0.18, 3000, 1800, 1, 0.025); },
    hmm: function () { tone(620, 820, 0.09, "sine", 0.035); },
    spotted: function () { hiss(0.35, 900, 2400, 2.5, 0.12); tone(700, 560, 0.18, "triangle", 0.06, 0.05); },
    lost: function () { hiss(0.4, 800, 2200, 2, 0.12); tone(523, 0, 0.2, "triangle", 0.07, 0.25); tone(440, 0, 0.2, "triangle", 0.07, 0.45); tone(330, 300, 0.5, "triangle", 0.07, 0.65); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, k) { tone(f, 0, 0.35, "sine", 0.07, k * 0.11); tone(f * 2, 0, 0.2, "sine", 0.015, k * 0.11); }); },
    cry: function () { for (var k = 0; k < 3; k++) tone(520, 740, 0.45, "triangle", 0.06, k * 0.55, ["lowpass", 1800, 2]); },
    settle: function () { hiss(0.6, 600, 300, 0.7, 0.03); },
    click: function () { tone(660, 880, 0.06, "sine", 0.04); }
  };
  function sfx(name, e) { if (SFX[name]) try { SFX[name](e || {}); } catch (err) { /* sound is optional */ } }
  // the teacher's soft storytelling murmur
  var murmurT = 0;
  function murmur(dt, s) {
    if (!AC || !soundOn) return;
    var t = s.watchers[0];
    if (!t || t.kind !== "teacher" || t.state !== "read") { murmurT = 0.2; return; }
    murmurT -= dt;
    if (murmurT > 0) return;
    var len = 0.08 + Math.random() * 0.13, f = 165 + Math.random() * 75;
    tone(f, f * (0.85 + Math.random() * 0.3), len, "triangle", 0.03, 0, ["bandpass", 700 + Math.random() * 500, 2.5]);
    murmurT = len + (Math.random() < 0.18 ? 0.35 + Math.random() * 0.3 : 0.02);
  }
  function setSound(on) {
    soundOn = on; save("sound", on);
    if (master) master.gain.value = on ? 0.9 : 0;
    ["sound-btn", "pause-sound-btn"].forEach(function (id) { $(id).textContent = "Sound: " + (on ? "on" : "off"); $(id).setAttribute("aria-pressed", String(on)); });
  }

  // ---------- layout ----------
  var scale = 1, dpr = 1, cache = null, cacheFor = "";
  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight, hudH = vw < 500 ? 40 : 46, gut = vw < 500 ? 8 : 16;
    var avW = vw - gut * 2 - 14, avH = vh - hudH - gut - 24;
    scale = Math.max(0.3, Math.min(avW / W, avH / H));
    var wide = mode === "title" && vw >= 1.25 * vh && vw >= 700;
    document.body.classList.toggle("wide-title", wide);
    var sw = Math.round(W * scale), sh = Math.round(H * scale), left = Math.round((wide ? vw * 0.46 : vw) / 2 - sw / 2), top = hudH + gut + 4;
    if (!wide && avH > sh) top += Math.round((avH - sh) / 3);
    if (wide) { scale = Math.max(0.3, Math.min(avW / W, (vh - 24) / H)); sw = Math.round(W * scale); sh = Math.round(H * scale); left = Math.max(12, Math.round(vw * 0.25 - sw / 2)); top = Math.round((vh - sh) / 2); }
    stage.style.left = left + "px"; stage.style.top = top + "px"; stage.style.width = sw + "px"; stage.style.height = sh + "px";
    hud.style.left = left + "px"; hud.style.width = sw + "px"; hud.style.top = Math.max(4, top - hudH - 6) + "px"; hud.style.height = hudH + "px";
    document.documentElement.style.setProperty("--hud-font", (sw < 380 ? 13 : 15) + "px");
    document.documentElement.style.setProperty("--tip-font", (sw < 380 ? 15 : 18) + "px");
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(sw * dpr); canvas.height = Math.round(sh * dpr);
    cacheFor = "";
  }
  window.addEventListener("resize", layout);

  // ---------- state ----------
  var mode = "title", s = null, room = 1, seedNext = 1 + Math.floor(Math.random() * 1000), fixedSeed = null;
  var botOn = false, botMem = {}, waitT = 0, tipT = 0, demoMem = {};
  var keys = {}, touch = null;
  function nextSeed() { if (fixedSeed != null) return fixedSeed; return seedNext++; }

  function show(id) {
    ["title-screen", "rooms-screen", "intro-screen", "pause-screen", "won-screen", "lost-screen", "end-screen"].forEach(function (x) { $(x).hidden = x !== id; });
  }
  function hudUpdate() {
    if (!s) return;
    $("hud-room").textContent = s.n + " · " + s.def.name;
    var eyes = $("hud-eyes").children;
    for (var k = 0; k < eyes.length; k++) eyes[k].classList.toggle("on", k < s.noticed);
  }
  function tip(text, secs) { tipEl.textContent = text; tipEl.classList.remove("fade"); tipT = secs || 4; }

  function toTitle() {
    mode = "title"; botOn = false; s = E.create(1, 3 + Math.floor(Math.random() * 50)); demoMem = {};
    hud.hidden = true; show("title-screen"); tipEl.classList.add("fade"); layout();
    $("title-stars").textContent = totalStars();
  }
  function openRooms() {
    var g = $("room-grid"); g.innerHTML = "";
    E.ROOMS.forEach(function (r, k) {
      var b = document.createElement("button"); b.className = "room-btn"; b.disabled = !unlocked(k + 1);
      var st = ""; for (var j = 0; j < 3; j++) st += j < best[k] ? "★" : "<span class=off>★</span>";
      b.innerHTML = "<span>" + (k + 1) + ". " + r.name + "</span><span class=rs>" + st + "</span>";
      b.addEventListener("click", function () { audio(); sfx("click"); startRoom(k + 1); });
      g.appendChild(b);
    });
    $("rooms-total").textContent = totalStars() + " of " + N * 3 + " stars";
    show("rooms-screen");
  }
  function startRoom(n) {
    room = n; s = E.create(n, nextSeed()); botMem = {}; mode = "intro"; layout();
    hud.hidden = false; hudUpdate(); tipEl.classList.add("fade");
    $("intro-num").textContent = "Room " + n + " of " + N;
    $("intro-name").textContent = s.def.name;
    $("intro-tip").textContent = s.def.tip;
    $("intro-keys").textContent = coarse ? "Hold your finger where you want to tiptoe (close to you is extra quiet). Let go to freeze." : "Arrows or WASD · Shift = tiptoe quieter · Space = freeze · P = pause · R = restart";
    show("intro-screen");
  }
  function go() { mode = "play"; show(null); tip(s.def.tip, 4.5); keys = {}; }
  function restart() { startRoom(room); go(); }
  function pause() { if (mode !== "play") return; mode = "pause"; show("pause-screen"); keys = {}; touch = null; }
  function resume() { if (mode !== "pause") return; mode = "play"; show(null); }

  function finishWon() {
    var n = s.n, got = s.stars, was = best[n - 1];
    if (got > was) { best[n - 1] = got; save("stars", best); }
    var st = ""; for (var j = 0; j < 3; j++) st += "<span class=" + (j < got ? "on" : "off") + ">★</span>";
    $("won-stars").innerHTML = st;
    $("won-line").textContent = s.noticed === 0 ? "Nobody noticed a thing. Super sneaky!" : s.noticed === 1 ? "One kid noticed... but they kept the secret." : "Two kids noticed. Shhh!";
    $("won-best").textContent = got > was && was > 0 ? "New best for this room!" : "Best here: " + best[n - 1] + " of 3 stars";
    $("next-btn").textContent = n < N ? "Next room" : "Finish";
    $("again-btn").hidden = got === 3;
    mode = "won"; show("won-screen");
  }
  function finishLost() {
    $("lost-line").textContent = s.lostBy === "teacher" ? "The teacher spotted you!" : "Three kids noticed you. Everyone's waving!";
    $("lost-hint").textContent = s.lostBy === "teacher" ? "When she stops reading and looks up, freeze, or get behind something." : "Watch for wriggly kids. They're about to turn round!";
    mode = "lost"; show("lost-screen");
  }

  // ---------- input ----------
  var KEYMAP = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d", a: "l", d: "r", w: "u", s: "d", A: "l", D: "r", W: "u", S: "d" };
  window.addEventListener("keydown", function (e) {
    audio();
    if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault(); }
    if (e.key === " ") { keys.freeze = true; e.preventDefault(); }
    if (e.key === "Shift") keys.quiet = true;
    if (e.repeat) return;
    if (e.key === "p" || e.key === "P" || e.key === "Escape") { if (mode === "play") pause(); else if (mode === "pause") resume(); }
    if ((e.key === "r" || e.key === "R") && (mode === "play" || mode === "pause" || mode === "lost")) restart();
    if (e.key === "Enter") {
      if (mode === "intro") go(); else if (mode === "lost") restart(); else if (mode === "won") $("next-btn").click(); else if (mode === "title") $("play-btn").click();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false;
    if (e.key === " ") keys.freeze = false;
    if (e.key === "Shift") keys.quiet = false;
  });
  window.addEventListener("blur", function () { keys = {}; touch = null; if (mode === "play") pause(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && mode === "play") pause(); });

  function worldPt(e) {
    var r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }
  stage.addEventListener("pointerdown", function (e) {
    audio();
    if (mode !== "play") return;
    var q = worldPt(e); touch = { id: e.pointerId, x: q.x, y: q.y };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    e.preventDefault();
  });
  stage.addEventListener("pointermove", function (e) { if (touch && e.pointerId === touch.id) { var q = worldPt(e); touch.x = q.x; touch.y = q.y; } });
  function lift(e) { if (touch && e.pointerId === touch.id) touch = null; }
  stage.addEventListener("pointerup", lift); stage.addEventListener("pointercancel", lift);
  window.addEventListener("pointerup", lift);
  stage.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  var QUIET_RING = 70;
  function playerInput() {
    if (botOn) return BOT.decide(s, botMem);
    var p = s.p;
    if (touch) {
      var dx = touch.x - p.x, dy = touch.y - p.y, d = Math.hypot(dx, dy);
      if (d < 7) return { x: 0, y: 0 };
      return { x: dx / d, y: dy / d, quiet: d < QUIET_RING || !!keys.quiet };
    }
    var x = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), y = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    return { x: x, y: y, quiet: !!keys.quiet, freeze: !!keys.freeze };
  }

  // ---------- buttons ----------
  function on(id, fn) { $(id).addEventListener("click", function () { audio(); sfx("click"); fn(); }); }
  on("play-btn", function () {
    var n = 1; for (var k = 1; k <= N; k++) if (unlocked(k) && best[k - 1] === 0) { n = k; break; }
    startRoom(n);
  });
  on("rooms-btn", openRooms);
  on("rooms-back", function () { if (s && mode !== "title" && mode !== "rooms") toTitle(); else toTitle(); });
  on("go-btn", go);
  on("pause-btn", pause);
  on("resume-btn", resume);
  on("restart-btn", restart);
  on("pause-rooms-btn", openRooms);
  on("pause-title-btn", toTitle);
  on("sound-btn", function () { setSound(!soundOn); });
  on("pause-sound-btn", function () { setSound(!soundOn); });
  on("next-btn", function () { if (s.n < N) startRoom(s.n + 1); else { $("end-stars").textContent = totalStars() + " of " + N * 3 + " stars"; mode = "end"; show("end-screen"); } });
  on("again-btn", restart);
  on("won-rooms-btn", openRooms);
  on("retry-btn", restart);
  on("lost-rooms-btn", openRooms);
  on("end-rooms-btn", openRooms);
  on("end-title-btn", toTitle);

  // ---------- the loop ----------
  var last = 0, acc = 0, clock = 0;
  function handle(ev) {
    ev.forEach(function (e) {
      if (mode === "title") return;
      sfx(e.t, e);
      if (e.t === "spotted") { hudUpdate(); tip(e.who === "helper" ? "A grown-up noticed you!" : "A kid noticed you!", 1.6); }
      if (e.t === "cry") tip("The toddler woke up! Everyone's looking!", 2);
      if (e.t === "warn" && e.who === "teacher" && s.n <= 2) tip("She's looking up... FREEZE!", 1.4);
    });
    ev.length = 0;
  }
  function tick(dt) {
    clock += dt;
    if (tipT > 0) { tipT -= dt; if (tipT <= 0) tipEl.classList.add("fade"); }
    if (mode === "title") {
      if (s.won || s.lost) { waitT += dt; if (waitT > 1.6) { s = E.create(1 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 999) + 1); demoMem = {}; waitT = 0; } }
      else E.step(s, BOT.decide(s, demoMem), dt);
      s.events.length = 0;
      return;
    }
    if (mode === "play") {
      E.step(s, playerInput(), dt);
      murmur(dt, s);
      handle(s.events);
      if (s.won) { mode = "won-wait"; waitT = 0; touch = null; }
      else if (s.lost) { mode = "lost-wait"; waitT = 0; touch = null; }
      return;
    }
    if (mode === "won-wait" || mode === "lost-wait") {
      waitT += dt;
      s.watchers.forEach(function (w) { if (w.noticed) { w.want = Math.atan2(s.p.y - w.y, s.p.x - w.x); w.dir += E.angDiff(w.dir, w.want) * Math.min(1, dt * 6); } });
      if (waitT > (mode === "won-wait" ? 0.9 : 1.1)) { if (mode === "won-wait") finishWon(); else finishLost(); }
    }
  }

  function draw() {
    var key = s.n + ":" + scale + ":" + dpr;
    if (cacheFor !== key) { cache = A.roomCache(s.def, scale * dpr); cacheFor = key; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cache, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var t = clock, p = s.p, sitting = s.won;
    A.seat(ctx, s.seat, t);
    s.toys.forEach(function (ty) { A.toy(ctx, ty); });
    if (s.toddler) A.toddler(ctx, s.toddler, t);
    // cones first, under everyone
    s.watchers.forEach(function (w) {
      if (w.spec && w.state === "warn" && !w.noticed) A.sweepHint(ctx, w, t);
      var c = E.cone(s, w);
      if (!c) return;
      var seeing = E.sees(s, w, p.x, p.y) > 0;
      var strong = !(w.kind === "kid" && (w.state === "face" || w.state === "wiggle"));
      A.coneShape(ctx, s, w, c, seeing, strong ? 1 : 0.4);
    });
    s.noises.forEach(function (nz) { A.noiseRing(ctx, nz); });
    s.watchers.forEach(function (w) { A.person(ctx, w, t); });
    if (sitting) p.face = s.seat.a + Math.PI;
    var frozen = !p.moving && mode === "play";
    A.player(ctx, p, t, frozen, p.seenBy > 0);
    // touch: where you're heading, and the quiet zone
    if (touch && mode === "play") {
      ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(43,179,163,0.8)"; ctx.lineWidth = 2;
      A.circle(ctx, p.x, p.y, QUIET_RING, null, "rgba(43,179,163,0.7)", 2); ctx.setLineDash([]);
      A.circle(ctx, touch.x, touch.y, 9, "rgba(43,179,163,0.35)", "#2bb3a3", 2.5);
      ctx.restore();
    }
    // bubbles and meters on top
    s.watchers.forEach(function (w) {
      if (w.kind === "parent") return;
      A.meterRing(ctx, w);
      var bx = w.x, by = w.y - w.r - 18;
      if (w.noticed) A.bubble(ctx, bx, by, "!", "#e5383b", 1.05);
      else if (w.meter > 0.05) A.bubble(ctx, bx, by, "?", "#fff", 0.7 + w.meter * 0.5);
      else if (w.spec && w.state === "warn") A.bubble(ctx, bx, by, "…", "#ffe066", 0.9 + 0.12 * Math.sin(t * 14));
      else if (w.state === "wiggle") A.bubble(ctx, bx, by, "~", "#bde0fe", 0.75 + 0.1 * Math.sin(t * 20));
      else if (w.state === "alert") A.bubble(ctx, bx, by, "?", "#ffe066", 0.8);
    });
    if (sitting) { ctx.save(); ctx.font = "900 16px ui-rounded, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText("Shhh!", p.x, p.y - 28); ctx.fillStyle = "#2bb3a3"; ctx.fillText("Shhh!", p.x, p.y - 28); ctx.restore(); }
  }

  function frame(now) {
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (mode !== "pause" && mode !== "intro" && mode !== "rooms") {
      acc += dt;
      var steps = 0;
      while (acc >= E.DT && steps < 6) { tick(E.DT); acc -= E.DT; steps++; }
      if (steps === 6) acc = 0;
    } else acc = 0;
    draw();
    requestAnimationFrame(frame);
  }

  // A small window for the evidence tests only.
  window.__owl = {
    get state() { return s; }, get mode() { return mode; }, get best() { return best.slice(); },
    roomCount: N, rooms: E.ROOMS.map(function (r) { return r.name; }),
    start: function (n) { startRoom(n); go(); },
    seed: function (k) { fixedSeed = k; },
    bot: function (v) { botOn = v !== false; botMem = {}; },
    pause: pause, resume: resume
  };

  if (coarse) $("title-keys").textContent = "Hold your finger where you want to tiptoe. Let go to freeze.";
  setSound(soundOn);
  layout();
  toTitle();
  requestAnimationFrame(frame);
})();
