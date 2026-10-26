// Fidget Factory: screens, controls, the factory show, the four toys' feel, coins and saves.
// The game clock runs in fixed 1/60 s steps. window.__ff (at the bottom) lets the evidence
// tests hold that clock, step it by hand and seed the random numbers, so every run is the same.
(function () {
  "use strict";
  var A = FF.art, SND = FF.sound, TAU = Math.PI * 2, DT = 1 / 60;
  var KEY = "gameon.fidget-factory.";
  var SHELF_MAX = 12;
  var PRICE = { glitter: 15, glow: 25, rainbow: 40 };
  var SHAPE_PRICE = [0, 10, 20];

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  // ---- saves (every key starts gameon.fidget-factory.) ----
  function load(name, fb) { try { var v = localStorage.getItem(KEY + name); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } }
  function store(name, v) { try { localStorage.setItem(KEY + name, JSON.stringify(v)); } catch (e) { /* storage blocked: play on without saving */ } }
  function validDesign(d) {
    return d && typeof d === "object" && A.KINDS.indexOf(d.kind) >= 0 && A.PATTERNS.indexOf(d.pattern) >= 0 &&
      d.c1 >= 0 && d.c1 < 8 && d.c2 >= 0 && d.c2 < 8 && d.shape >= 0 && d.shape < 3;
  }
  var raw = load("save", null) || {};
  var save = {
    coins: Math.max(0, +raw.coins || 0),
    unlocked: raw.unlocked && typeof raw.unlocked === "object" ? raw.unlocked : {},
    shelf: Array.isArray(raw.shelf) ? raw.shelf.filter(validDesign).slice(0, SHELF_MAX) : [],
    best: Math.max(0, +raw.best || 0),
    made: Math.max(0, +raw.made || 0)
  };
  function persist() { store("save", save); }
  var prefs = load("sound", { sfx: true, music: true }) || {};
  SND.set("sfx", prefs.sfx !== false); SND.set("music", prefs.music !== false);

  // ---- seeded random numbers ----
  var rs = 1;
  function seed(n) { rs = (n >>> 0) || 1; }
  function rnd() { rs |= 0; rs = rs + 0x6D2B79F5 | 0; var t = Math.imul(rs ^ rs >>> 15, 1 | rs); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  var qs = /[?&]seed=(\d+)/.exec(location.search);
  seed(qs ? +qs[1] : (Date.now() % 1e6));

  // ---- design ----
  function defaultDesign() { return { id: "", kind: "spinner", c1: 7, c2: 2, pattern: "dots", shape: 0, eyes: true, glitter: false, glow: false, rainbow: false, name: "" }; }
  var design = save.shelf.length ? copy(save.shelf[0]) : defaultDesign();
  function shapeKey(kind, s) { return "shape:" + kind + ":" + s; }
  function priceOf(key) {
    if (PRICE[key]) return PRICE[key];
    var m = /^shape:\w+:(\d)$/.exec(key); return m ? SHAPE_PRICE[+m[1]] : 0;
  }
  function unlocked(key) { return !priceOf(key) || !!save.unlocked[key]; }
  function nameFor(d) {
    var adj = d.rainbow ? "Rainbow" : d.glitter ? "Glittery" : d.glow ? "Glowing" : { dots: "Dotty", stripes: "Stripy", stars: "Starry", plain: "Shiny" }[d.pattern];
    return adj + " " + (d.rainbow ? "" : A.COLORS[d.c1].name + " ") + A.KIND_NAMES[d.kind];
  }
  // keep a design legal: no locked parts sneak in (from an old save, say)
  function tidy(d) {
    if (!unlocked(shapeKey(d.kind, d.shape))) d.shape = 0;
    A.EXTRAS.forEach(function (x) { if (d[x] && !unlocked(x)) d[x] = false; });
    return d;
  }
  tidy(design);

  // ---- screens ----
  var screen = "title", paused = false;
  var SCREENS = ["title", "design", "factory", "play", "shelf"];
  function show(name) {
    if (screen === "play" && name !== "play" && play && play.d.kind === "spinner") { spinEnd(play.st); play.st.w = 0; }
    screen = name; paused = false; $("pause").hidden = true;
    SCREENS.forEach(function (s) { $(s).hidden = s !== name; });
    if (name !== "play") SND.spinHum(0);
    refreshCoins();
    if (name === "design") buildPanel();
    if (name === "shelf") buildShelf();
    if (name === "title") $("shelf-count").textContent = save.shelf.length;
    $("best-line").textContent = save.best ? "Best spin: " + save.best.toFixed(1) + " s" : "";
    $("best-line-wrap").hidden = !save.best;
  }
  function setPaused(p) {
    if (screen !== "play" && screen !== "factory") p = false;
    paused = p; $("pause").hidden = !p;
    if (p) SND.spinHum(0);
    if (p) $("resume-btn").focus();
  }

  var toastTimer = 0;
  function toast(msg, secs) { var t = $("toast"); t.textContent = msg; t.hidden = false; t.classList.remove("fade"); toastTimer = secs || 2.4; }
  function refreshCoins() {
    var els = document.querySelectorAll(".coins b");
    for (var i = 0; i < els.length; i++) els[i].textContent = save.coins;
  }
  function bumpCoins() {
    var els = document.querySelectorAll(".coins");
    for (var i = 0; i < els.length; i++) { els[i].classList.remove("bump"); void els[i].offsetWidth; els[i].classList.add("bump"); }
  }

  // ---- particles (screen px on whichever canvas is showing) ----
  var parts = [];
  function burst(x, y, n, cols, speed, kind) {
    for (var i = 0; i < n; i++) {
      var a = rnd() * TAU, s = speed * (0.4 + rnd() * 0.8);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life: 0, max: 0.5 + rnd() * 0.5, size: 3 + rnd() * 4,
        col: cols[i % cols.length], kind: kind || "dot", rot: rnd() * TAU, vr: (rnd() - 0.5) * 12, g: kind === "conf" ? 500 : 260 });
    }
  }
  function floatText(x, y, text, col) { parts.push({ x: x, y: y, vx: 0, vy: -70, life: 0, max: 1.1, size: 20, col: col || "#ffb800", kind: "text", text: text, g: 0 }); }
  function tickParts(list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i]; p.life += dt;
      if (p.life >= p.max) { list.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
      if (p.kind !== "text") { p.vx *= 0.985; }
    }
  }
  function drawParts(ctx, list) {
    list.forEach(function (p) {
      var f = 1 - p.life / p.max;
      ctx.globalAlpha = Math.min(1, f * 1.6);
      if (p.kind === "text") {
        ctx.font = "900 " + p.size + "px ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.lineWidth = 5; ctx.strokeStyle = "#2a2140"; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, p.y);
      } else if (p.kind === "conf") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.size, -p.size / 2.5, p.size * 2, p.size / 1.25); ctx.restore();
      } else if (p.kind === "star") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
        var s = p.size * (0.5 + f); ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 1.6, 0); ctx.lineTo(s * 0.4, s * 0.4); ctx.lineTo(0, s * 1.6); ctx.lineTo(-s * 0.4, s * 0.4); ctx.lineTo(-s * 1.6, 0); ctx.lineTo(-s * 0.4, -s * 0.4); ctx.closePath(); ctx.fill(); ctx.restore();
      } else {
        ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * f), 0, TAU); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }
  var CONF = ["#ff4d5e", "#ffd93d", "#4cd97b", "#4f8cff", "#a66cff", "#ff6fb5", "#2ec4c6"];

  // ---- googly eye physics: pupils hang in world space and roll as the toy moves ----
  function eyePhys(E, dt) {
    for (var k in E) {
      var e = E[k]; if (!e.seen) continue;
      if (e.pwx !== undefined) { e.ox -= e.wx - e.pwx; e.oy -= e.wy - e.pwy; }
      e.pwx = e.wx; e.pwy = e.wy;
      e.vy += 1100 * dt * (e.r / 20); e.vx *= 0.985; e.vy *= 0.985;
      e.ox += e.vx * dt; e.oy += e.vy * dt;
      var lim = e.r * 0.46, L = Math.hypot(e.ox, e.oy);
      if (L > lim) {
        var nx = e.ox / L, ny = e.oy / L; e.ox = nx * lim; e.oy = ny * lim;
        var vn = e.vx * nx + e.vy * ny; if (vn > 0) { e.vx -= 1.5 * vn * nx; e.vy -= 1.5 * vn * ny; }
        e.vx *= 0.92; e.vy *= 0.92;
      }
    }
  }

  // ---- canvases ----
  function fit(cv) {
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height, dpr: dpr, ctx: ctx };
  }
  function thumb(cv, d, size) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(size / 2, size / 2); ctx.scale(size * 0.4, size * 0.4);
    A.drawFidget(ctx, d, null, { t: 0, px: size * 0.4 });
  }

  // =====================================================================================
  // Title
  var demo = [
    { kind: "spinner", c1: 5, c2: 2, pattern: "stars", shape: 0, eyes: true, id: "d1" },
    { kind: "popit", c1: 7, c2: 4, pattern: "dots", shape: 1, eyes: false, id: "d2" },
    { kind: "squishy", c1: 4, c2: 7, pattern: "plain", shape: 1, eyes: false, glitter: true, id: "d3" },
    { kind: "cube", c1: 1, c2: 6, pattern: "stripes", shape: 1, eyes: false, id: "d4" }
  ];
  var demoEyes = {};
  function drawTitle() {
    var F = fit($("title-cv")), ctx = F.ctx, w = F.w, h = F.h, t = simT;
    paintBackdrop(ctx, w, h, t, false);
    var R = Math.max(34, Math.min(w, h) * 0.13);
    var spots = w > h ? [[0.13, 0.28], [0.87, 0.3], [0.14, 0.76], [0.86, 0.76]] : [[0.18, 0.1], [0.82, 0.12], [0.16, 0.9], [0.84, 0.9]];
    demo.forEach(function (d, i) {
      ctx.save(); ctx.translate(spots[i][0] * w, spots[i][1] * h + Math.sin(t * 1.6 + i) * 8);
      ctx.rotate(Math.sin(t * 0.9 + i * 2) * 0.12); ctx.scale(R, R);
      var st = d.kind === "spinner" ? { a: t * 7, w: 9 } : null;
      A.drawFidget(ctx, d, st, { t: t, px: R, eyes: demoEyes });
      ctx.restore();
    });
  }
  function paintBackdrop(ctx, w, h, t, darkRoom) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    if (darkRoom) { g.addColorStop(0, "#1b1433"); g.addColorStop(1, "#0d0a1c"); }
    else { g.addColorStop(0, "#ffe3f1"); g.addColorStop(1, "#ffd7c2"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = darkRoom ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)";
    var s = 46;
    for (var y = 0, r = 0; y < h + s; y += s, r++) for (var x = (r % 2) * s / 2 - s; x < w + s; x += s) { ctx.beginPath(); ctx.arc(x + (t * 6) % s, y, 5, 0, TAU); ctx.fill(); }
  }

  // =====================================================================================
  // Design screen
  var kb = { row: 0, col: 0 };
  var ROWS = ["kind", "c1", "c2", "pattern", "shape", "extras", "build"];
  var previewPulse = 0, previewEyes = {};
  function optButton(row, val, label, opts) {
    opts = opts || {};
    var b = document.createElement("button");
    b.className = "opt" + (opts.on ? " on" : "") + (opts.locked ? " locked" : "") + (opts.cls ? " " + opts.cls : "");
    b.dataset.row = row; b.dataset.val = val;
    b.setAttribute("aria-pressed", opts.on ? "true" : "false");
    b.setAttribute("aria-label", label + (opts.locked ? ", costs " + opts.price + " coins" : ""));
    if (opts.swatch) { var s = document.createElement("i"); s.className = "sw"; s.style.background = opts.swatch; b.appendChild(s); }
    if (opts.icon) { var c = document.createElement("canvas"); c.className = "ic"; b.appendChild(c); opts.icon(c); }
    if (opts.text !== false) { var sp = document.createElement("span"); sp.className = "lb"; sp.textContent = label; b.appendChild(sp); }
    if (opts.locked) { var p = document.createElement("span"); p.className = "price"; p.innerHTML = '<i class="coin"></i>' + opts.price; b.appendChild(p); }
    return b;
  }
  function buildPanel() {
    var d = design, focusRow = null, focusIdx = 0, act = document.activeElement;
    if (act && act.dataset && act.dataset.row) { focusRow = act.dataset.row; focusIdx = Array.prototype.indexOf.call(act.parentNode.children, act); }
    function fill(row, buttons) { var el = document.querySelector('#panel [data-opts="' + row + '"]'); el.innerHTML = ""; buttons.forEach(function (b) { el.appendChild(b); }); }
    fill("kind", A.KINDS.map(function (k) {
      return optButton("kind", k, A.KIND_NAMES[k], { on: d.kind === k, icon: function (c) { var t = copy(d); t.kind = k; t.shape = 0; t.glow = false; thumb(c, t, 40); } });
    }));
    fill("c1", A.COLORS.map(function (c, i) { return optButton("c1", i, c.name, { on: d.c1 === i, swatch: c.hex, text: false, cls: "color" }); }));
    fill("c2", A.COLORS.map(function (c, i) { return optButton("c2", i, c.name, { on: d.c2 === i, swatch: c.hex, text: false, cls: "color" }); }));
    fill("pattern", A.PATTERNS.map(function (p) {
      return optButton("pattern", p, p[0].toUpperCase() + p.slice(1), { on: d.pattern === p, icon: function (c) {
        c.width = c.height = 64; var x = c.getContext("2d"); x.fillStyle = A.COLORS[d.c1].hex; x.fillRect(0, 0, 64, 64);
        x.translate(32, 32); x.scale(30, 30); A.drawPattern(x, p, A.COLORS[d.c2].hex === A.COLORS[d.c1].hex ? "#fff" : A.COLORS[d.c2].hex, 1.2);
      } });
    }));
    fill("shape", A.SHAPES[d.kind].map(function (name, i) {
      var key = shapeKey(d.kind, i), lock = !unlocked(key);
      return optButton("shape", i, name, { on: d.shape === i, locked: lock, price: priceOf(key), icon: function (c) { var t = copy(d); t.shape = i; t.glow = false; thumb(c, t, 40); } });
    }));
    fill("extras", A.EXTRAS.map(function (x) {
      var lock = !unlocked(x);
      return optButton("extras", x, A.EXTRA_NAMES[x], { on: !!d[x], locked: lock, price: priceOf(x), cls: "chip" });
    }));
    $("design-name").textContent = nameFor(d);
    $("build-btn").disabled = false;
    if (focusRow && focusRow !== "build") {
      var row = document.querySelector('#panel [data-opts="' + focusRow + '"]');
      if (row && row.children[focusIdx]) row.children[focusIdx].focus();
    }
  }
  function choose(row, val) {
    SND.init();
    var d = design;
    if (row === "kind") { if (d.kind !== val) { d.kind = val; d.shape = 0; } }
    else if (row === "c1" || row === "c2") d[row] = +val;
    else if (row === "pattern") d.pattern = val;
    else if (row === "shape" || row === "extras") {
      var key = row === "shape" ? shapeKey(d.kind, +val) : val, label = row === "shape" ? A.SHAPES[d.kind][+val] : A.EXTRA_NAMES[val];
      if (!unlocked(key)) {
        var price = priceOf(key);
        if (save.coins < price) {
          SND.play("nope"); toast(label + " costs " + price + " sparkle coins. Play with your fidgets to earn more!", 3);
          var btn = document.querySelector('#panel [data-row="' + row + '"][data-val="' + val + '"]');
          if (btn) { btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake"); }
          return false;
        }
        save.coins -= price; save.unlocked[key] = true; persist(); refreshCoins(); bumpCoins();
        SND.play("buy"); toast("Unlocked " + label + "!");
        if (row === "extras") d[val] = false; // the toggle below turns it on
      }
      if (row === "shape") d.shape = +val; else d[val] = !d[val];
    }
    SND.play("pick"); previewPulse = 1;
    buildPanel();
    return true;
  }
  function drawPreview() {
    var F = fit($("prev-cv")), ctx = F.ctx, w = F.w, h = F.h, t = simT;
    ctx.clearRect(0, 0, w, h);
    var R = Math.min(w, h) * 0.38, p = previewPulse;
    ctx.save(); ctx.translate(w / 2, h / 2 + Math.sin(t * 2) * 4);
    ctx.fillStyle = "rgba(42,33,64,0.12)"; ctx.beginPath(); ctx.ellipse(0, R * 1.08, R * 0.8, R * 0.13, 0, 0, TAU); ctx.fill();
    var s = R * (1 + 0.12 * Math.sin(p * Math.PI) * p);
    ctx.scale(s, s);
    if (design.kind !== "spinner") ctx.rotate(Math.sin(t * 1.3) * 0.06);
    var st = design.kind === "spinner" ? { a: t * 1.2, w: 0 } : null;
    A.drawFidget(ctx, design, st, { t: t, px: s, eyes: previewEyes });
    ctx.restore();
  }
  function designKey(e) {
    var k = e.key, act = document.activeElement;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(k) < 0) return false;
    e.preventDefault();
    var inPanel = act && (act.dataset && act.dataset.row || act.id === "build-btn");
    if (!inPanel) { kb.row = 0; focusRow(0, null); return true; }
    var row = act.id === "build-btn" ? ROWS.length - 1 : ROWS.indexOf(act.dataset.row);
    var col = act.id === "build-btn" ? 0 : Array.prototype.indexOf.call(act.parentNode.children, act);
    if (k === "ArrowUp" || k === "ArrowDown") focusRow(clamp(row + (k === "ArrowDown" ? 1 : -1), 0, ROWS.length - 1), col);
    else if (row < ROWS.length - 1) {
      var kids = act.parentNode.children; kids[(col + (k === "ArrowRight" ? 1 : -1) + kids.length) % kids.length].focus();
      SND.play("tick", 1.5);
    }
    return true;
  }
  function focusRow(r, col) {
    if (ROWS[r] === "build") { $("build-btn").focus(); return; }
    var el = document.querySelector('#panel [data-opts="' + ROWS[r] + '"]'), kids = el.children;
    var on = el.querySelector(".on"), idx = on ? Array.prototype.indexOf.call(kids, on) : clamp(col || 0, 0, kids.length - 1);
    kids[idx].focus(); SND.play("tick", 1.2);
  }

  // =====================================================================================
  // The factory show: about 13 seconds, every stage drawn from the design itself.
  var T = { move1: 1.3, cut: 2.3, cutGo: 2.7, move2: 4.3, paint: 5.2, paintGo: 5.4, move3: 7.5, stamp: 8.3, hit: 8.9, lift: 9.15, move4: 9.8, extras: 10.6, done: 12.0, end: 13.2 };
  var ST = [0, 360, 720, 1080, 1440];
  var fac = null;
  function uid() { return "f" + Math.floor(rnd() * 2e9).toString(36) + "-" + save.made; }
  function startFactory() {
    SND.init();
    if (save.shelf.length >= SHELF_MAX) { SND.play("nope"); toast("Your shelf is full! Recycle a fidget to make room.", 3); show("shelf"); return; }
    tidy(design);
    var d = copy(design); d.id = uid(); d.name = nameFor(d);
    fac = { t: 0, d: d, parts: [], eyes: [{}, {}, {}, {}, {}], toyEyes: {}, shake: 0, fired: {}, extras: A.EXTRAS.filter(function (x) { return d[x]; }) };
    show("factory");
    $("fac-cap").textContent = "Squirting out the toy goo...";
  }
  function toyX(t) {
    var legs = [[T.move1, T.cut, 0, 1], [T.move2, T.paint, 1, 2], [T.move3, T.stamp, 2, 3], [T.move4, T.extras, 3, 4]];
    for (var i = legs.length - 1; i >= 0; i--) {
      var L = legs[i];
      if (t >= L[0]) return ST[L[2]] + (ST[L[3]] - ST[L[2]]) * ease((t - L[0]) / (L[1] - L[0]));
    }
    return 0;
  }
  function extraTime(i) { return T.extras + 0.25 + i * 0.32; }
  function factoryTick(dt) {
    var f = fac; if (!f) return;
    var t0 = f.t; f.t += dt; var t = f.t;
    var at = function (time, key) { return t0 < time && t >= time && !f.fired[key] && (f.fired[key] = true); };
    var top = 330 - 2 * 62 - 4, tx = toyX(t), d = f.d, c1 = A.COLORS[d.c1].hex, c2 = A.COLORS[d.c2].hex;
    if (at(0.62, "drop")) { SND.play("clank"); f.shake = 5; fpart(0, 318, 10, ["#cfc9db", "#fff"], 160); }
    [T.move1, T.move2, T.move3, T.move4].forEach(function (m, i) { if (at(m, "mv" + i)) SND.play("whoosh"); });
    if (at(T.cut, "cutcap")) cap("Chop chop! Cutting out a " + A.KIND_NAMES[d.kind].toLowerCase() + "...");
    [0, 0.45, 0.9].forEach(function (o, i) { if (at(T.cutGo + o + 0.18, "chop" + i)) { SND.play("chop"); f.shake = 3; fpart(360, top + 10, 12, ["#fff6a0", "#ffd93d", "#fff"], 260, "star"); } });
    if (at(T.paint, "paintcap")) cap(d.rainbow ? "Spraying your colours... and a rainbow!" : "Spraying " + A.COLORS[d.c1].name.toLowerCase() + " and " + A.COLORS[d.c2].name.toLowerCase() + "...");
    if (at(T.paintGo, "spray")) SND.play("spray", 1.9);
    if (t > T.paintGo && t < T.paintGo + 1.9) {
      for (var k = 0; k < 2; k++) {
        f.parts.push({ x: 720 - 92, y: 196 + rnd() * 6, vx: 260 + rnd() * 120, vy: 40 + rnd() * 90, life: 0, max: 0.4, size: 4 + rnd() * 4, col: c1, kind: "dot", g: 200 });
        f.parts.push({ x: 720 + 92, y: 196 + rnd() * 6, vx: -260 - rnd() * 120, vy: 40 + rnd() * 90, life: 0, max: 0.4, size: 4 + rnd() * 4, col: c2, kind: "dot", g: 200 });
      }
    }
    if (at(T.stamp, "stampcap")) cap(d.pattern === "plain" ? "Stamping on a shiny finish..." : "Stamping on the " + d.pattern + "...");
    if (at(T.hit, "stamp")) { SND.play("stamp"); f.shake = 10; fpart(1080, 326, 16, ["#e9e3f5", "#cfc9db"], 220); }
    if (at(T.extras, "excap")) cap(f.extras.length ? "Adding the extras..." : "Quality check... looking good!");
    f.extras.forEach(function (x, i) {
      if (at(extraTime(i), "ex" + x)) {
        var col = x === "eyes" ? ["#fff", "#2a2140"] : x === "glitter" ? ["#fff", "#fff3a0", "#ffd93d"] : x === "glow" ? ["#fffbd0", "#ffe066"] : CONF;
        SND.play(x === "glitter" ? "sparkle" : x === "eyes" ? "plop" : "ding"); fpart(1440, top + 40, 18, col, 220, x === "eyes" ? "dot" : "star");
      }
    });
    if (!f.extras.length && at(extraTime(0), "ok")) { SND.play("ding"); fpart(1440 + 70, top - 10, 8, ["#4cd97b", "#fff"], 120, "star"); }
    if (at(T.done, "done")) { SND.play("tada"); cap("Ta-da! Your " + d.name + "!"); fpart(1440, top, 40, CONF, 380, "conf"); }
    void tx;
    tickParts(f.parts, dt);
    f.shake *= Math.pow(0.002, dt);
    f.eyes.forEach(function (E) { eyePhys(E, dt); }); eyePhys(f.toyEyes, dt);
    if (t >= T.end) finishFactory();
  }
  function fpart(x, y, n, cols, sp, kind) {
    for (var i = 0; i < n; i++) {
      var a = rnd() * TAU, s = sp * (0.3 + rnd() * 0.9);
      fac.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * 0.4, life: 0, max: 0.5 + rnd() * 0.6, size: 3 + rnd() * 4, col: cols[i % cols.length], kind: kind || "dot", rot: rnd() * TAU, vr: (rnd() - 0.5) * 10, g: kind === "conf" ? 420 : 300 });
    }
  }
  function cap(text) { $("fac-cap").textContent = text; }
  function skipFactory() { if (!fac) return; SND.play("tada"); finishFactory(); }
  function finishFactory() {
    var d = fac.d; fac = null;
    save.shelf.unshift(d); save.shelf = save.shelf.slice(0, SHELF_MAX); save.made++;
    design = copy(d); persist();
    startPlay(d, true);
  }
  function drawFactory() {
    var F = fit($("fac-cv")), ctx = F.ctx, w = F.w, h = F.h, f = fac; if (!f) return;
    var t = f.t, sc = Math.min(w / (w < h ? 310 : 420), h / 470), vw = w / sc, vh = h / sc, cam = toyX(t), d = f.d;
    var c1 = A.COLORS[d.c1].hex, c2 = A.COLORS[d.c2].hex, BY = 330, R = 62, top = BY - 2 * R - 4;
    ctx.save(); ctx.scale(sc, sc);
    var oy = clamp(vh * 0.58 - BY, 0, 24); ctx.translate(0, oy);
    // wall
    var g = ctx.createLinearGradient(0, -oy, 0, BY); g.addColorStop(0, "#ffc9e3"); g.addColorStop(1, "#ffe4d0");
    ctx.fillStyle = g; ctx.fillRect(0, -oy, vw, BY + oy);
    var sx = (-cam * 0.35) % 80;
    ctx.fillStyle = "rgba(255,255,255,0.35)"; for (var x = sx - 80; x < vw + 80; x += 80) ctx.fillRect(x, -oy, 36, BY + oy);
    // background gears and pipes (slower parallax)
    ctx.save(); ctx.translate(-cam * 0.5 + vw / 2, 0);
    for (var gi = -2; gi < 12; gi++) {
      var gx = gi * 190 + 40, gcol = ["#ffb3d1", "#b9e8ff", "#ffe8a3", "#c8f5d8"][((gi % 4) + 4) % 4];
      A.gear(ctx, gx, 70 + (gi % 2) * 50, 34 + (gi % 3) * 8, 9, (gi % 2 ? -1 : 1) * simT * 0.8, gcol);
      ctx.fillStyle = "#e6a7c4"; ctx.fillRect(gx + 60, 20, 14, BY - 40); ctx.fillStyle = "#d48fb1"; ctx.fillRect(gx + 56, 140 + (gi % 3) * 30, 22, 10);
    }
    ctx.restore();
    // ceiling rail
    ctx.fillStyle = "#4a4060"; ctx.fillRect(0, -oy, vw, oy + 14);
    ctx.fillStyle = "#3b3150"; ctx.fillRect(0, 10, vw, 6);
    ctx.save();
    var shk = f.shake > 0.3 ? f.shake : 0;
    ctx.translate(vw / 2 - cam + (shk ? (rnd() - 0.5) * shk : 0), shk ? (rnd() - 0.5) * shk : 0);
    // sign
    signBoard(ctx, -150, 30);
    // floor and belt
    ctx.fillStyle = "#b9a8d6"; ctx.fillRect(cam - vw, BY + 40, vw * 2, vh);
    ctx.fillStyle = "#a998c9"; for (var fx = Math.floor((cam - vw) / 60) * 60; fx < cam + vw; fx += 60) ctx.fillRect(fx, BY + 40, 30, vh);
    ctx.fillStyle = "#3b3150"; ctx.fillRect(-400, BY + 18, 2300, 14);
    for (var lx = -380; lx < 1900; lx += 140) { ctx.fillStyle = "#5a4e74"; ctx.fillRect(lx, BY + 30, 16, 50); }
    var bp = new Path2D(); A.roundRect(bp, -400, BY - 2, 2300, 24, 12); ctx.fillStyle = "#2f2744"; ctx.fill(bp);
    ctx.save(); ctx.clip(bp); ctx.fillStyle = "#4b416a";
    for (var bx = -400 + (cam % 36); bx < 1900; bx += 36) ctx.fillRect(bx, BY, 16, 24);
    ctx.restore();
    for (var rx = -380; rx < 1900; rx += 48) { ctx.save(); ctx.translate(rx, BY + 10); ctx.rotate(cam / 9); ctx.fillStyle = "#8e86a3"; ctx.fillRect(-3, -8, 6, 16); ctx.restore(); }
    // station 0: goo hopper
    hopper(ctx, 0, t);
    // station 1: cutter arm
    var chop = t > T.cutGo && t < T.move2 - 0.3 ? Math.max(0, Math.sin((t - T.cutGo) * Math.PI / 0.45)) : 0;
    var cutting = t > T.cut - 0.2 && t < T.move2;
    A.robotArm(ctx, 360 - 110, 10, 360 + 6, cutting ? top - 34 + chop * 40 : 110, "#4f8cff", bladeTool, simT, f.eyes[0]);
    // station 2: paint guns
    var painting = t > T.paint - 0.2 && t < T.move3;
    A.robotArm(ctx, 720 - 170, 10, 720 - 92, painting ? 198 : 120, "#ff6fb5", function (c) { gunTool(c, c1, 1); }, simT, f.eyes[1]);
    A.robotArm(ctx, 720 + 170, 10, 720 + 92, painting ? 198 : 120, "#2ec4c6", function (c) { gunTool(c, c2, -1); }, simT, f.eyes[2]);
    // the toy
    drawToy(ctx, cam, BY - R - 4, R, t, sc);
    // station 3: stamper (in front of the toy)
    stamper(ctx, 1080, t, top, d);
    // station 4: the extras arm
    var exT = t - T.extras, reach = t > T.extras - 0.2 && t < T.done + 0.4;
    A.robotArm(ctx, 1440 + 150, 10, 1440 + 64 + Math.sin(exT * 9) * (reach ? 10 : 0), reach ? top - 14 : 120, "#ffd93d", wandTool, simT, f.eyes[3]);
    drawParts(ctx, f.parts);
    if (t > T.done) {
      var k = ease((t - T.done) / 0.4);
      ctx.save(); ctx.translate(1440, top - 60 - 10 * Math.sin((t - T.done) * 6)); ctx.scale(k, k);
      ctx.font = "900 46px ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.lineWidth = 10; ctx.strokeStyle = "#2a2140"; ctx.strokeText("Ta-da!", 0, 0); ctx.fillStyle = "#ffd93d"; ctx.fillText("Ta-da!", 0, 0);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  }
  function signBoard(ctx, x, y) {
    var p = new Path2D(); A.roundRect(p, x - 100, y, 200, 70, 18);
    ctx.fillStyle = "#2a2140"; ctx.fill(p);
    ctx.font = "900 22px ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif"; ctx.textAlign = "center";
    for (var i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(x - 88 + i * 16, y + 8, 3.5, 0, TAU); ctx.fillStyle = (Math.floor(simT * 4) + i) % 3 ? "#ffd93d" : "#ff6fb5"; ctx.fill(); }
    ctx.fillStyle = "#ff9ccc"; ctx.fillText("FIDGET", x, y + 36); ctx.fillStyle = "#9ce8ff"; ctx.fillText("FACTORY", x, y + 60);
  }
  function hopper(ctx, x, t) {
    ctx.fillStyle = "#4a4060"; ctx.fillRect(x - 12, 10, 24, 60);
    ctx.beginPath(); ctx.moveTo(x - 70, 70); ctx.lineTo(x + 70, 70); ctx.lineTo(x + 26, 140); ctx.lineTo(x - 26, 140); ctx.closePath();
    ctx.fillStyle = "#a66cff"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#2a2140"; ctx.stroke();
    ctx.fillStyle = "#ffd93d"; ctx.fillRect(x - 60, 84, 120, 10);
    ctx.fillStyle = "#2a2140"; ctx.fillRect(x - 26, 140, 52, 12);
    if (t < 0.65) { var drip = clamp(t / 0.3, 0, 1); ctx.fillStyle = "#cfc9db"; ctx.beginPath(); ctx.ellipse(x, 152 + drip * 6, 20, 8 + drip * 10, 0, 0, TAU); ctx.fill(); }
  }
  function bladeTool(ctx) {
    ctx.fillStyle = "#e9e6f2"; ctx.strokeStyle = "#2a2140"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(26, -6); ctx.lineTo(18, 22); ctx.lineTo(-18, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (var i = 0; i < 7; i++) { ctx.lineTo(-18 + i * 6, 22 + (i % 2 ? 8 : 0)); } ctx.stroke();
  }
  function gunTool(ctx, col, dir) {
    ctx.save(); ctx.scale(dir, 1); ctx.rotate(0.35);
    var p = new Path2D(); A.roundRect(p, -18, -12, 40, 24, 8);
    ctx.fillStyle = col; ctx.fill(p); ctx.lineWidth = 4; ctx.strokeStyle = "#2a2140"; ctx.stroke(p);
    ctx.fillStyle = "#2a2140"; ctx.fillRect(20, -6, 14, 12);
    ctx.beginPath(); ctx.arc(-4, -18, 10, 0, TAU); ctx.fillStyle = A.light(col, 0.3); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function wandTool(ctx) {
    ctx.strokeStyle = "#2a2140"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, 26); ctx.stroke();
    var p = new Path2D(); A.poly(p, A.starPts(-16, 32, 15, 7, 5, -Math.PI / 2)); ctx.fillStyle = "#ffd93d"; ctx.fill(p); ctx.lineWidth = 3; ctx.stroke(p);
  }
  function stamper(ctx, x, t, top, d) {
    var down = 0;
    if (t > T.hit - 0.35 && t <= T.hit) down = ease((t - (T.hit - 0.35)) / 0.35);
    else if (t > T.hit && t <= T.lift) down = 1;
    else if (t > T.lift && t < T.lift + 0.45) down = 1 - ease((t - T.lift) / 0.45);
    var py = 70 + down * (top - 70 - 14);
    ctx.fillStyle = "#5a4e74"; ctx.fillRect(x - 110, 10, 18, 330); ctx.fillRect(x + 92, 10, 18, 330);
    ctx.fillStyle = "#2a2140"; ctx.fillRect(x - 120, 10, 240, 26);
    ctx.fillStyle = "#c9c4d6"; ctx.fillRect(x - 14, 30, 28, py - 30);
    var p = new Path2D(); A.roundRect(p, x - 84, py, 168, 28, 8);
    ctx.fillStyle = "#ff9a3c"; ctx.fill(p); ctx.lineWidth = 5; ctx.strokeStyle = "#2a2140"; ctx.stroke(p);
    ctx.save(); ctx.translate(x, py + 14); ctx.scale(22, 22);
    ctx.fillStyle = "#2a2140";
    if (d.pattern === "plain") { ctx.font = "900 0.8px system-ui"; ctx.textAlign = "center"; ctx.fillText("SHINY", 0, 0.3); }
    else { ctx.save(); ctx.beginPath(); ctx.rect(-3.6, -0.5, 7.2, 1); ctx.clip(); A.drawPattern(ctx, d.pattern, "#2a2140", 4); ctx.restore(); }
    ctx.restore();
    // hazard stripes on the press
    ctx.save(); ctx.clip(p); ctx.fillStyle = "rgba(255,217,61,0.6)"; for (var i = -6; i < 8; i++) ctx.fillRect(x - 84 + i * 24, py, 10, 6); ctx.restore();
  }
  function drawToy(ctx, x, y, R, t, sc) {
    var f = fac, d = f.d;
    var hop = t > T.done ? Math.abs(Math.sin((t - T.done) * 5.5)) * 34 * Math.max(0, 1 - (t - T.done) / 1.2) : 0;
    ctx.save(); ctx.translate(x, y - hop);
    // shadow
    ctx.fillStyle = "rgba(42,33,64,0.25)"; ctx.beginPath(); ctx.ellipse(0, R + 2 + hop, R * 0.8 * (1 - hop / 80), 7, 0, 0, TAU); ctx.fill();
    var land = t > 0.62 ? Math.max(0, 1 - (t - 0.62) / 0.4) : 0;
    if (t < T.cutGo) {
      // the falling lump of goo
      var fall = clamp((t - 0.25) / 0.37, 0, 1), ly = t < 0.25 ? -999 : -260 * (1 - fall * fall);
      if (ly > -900) {
        ctx.save(); ctx.translate(0, ly + R * 0.4); ctx.scale(1 + land * 0.35 * Math.sin(land * 9), 1 - land * 0.3 * Math.sin(land * 9));
        ctx.beginPath(); ctx.ellipse(0, 0, R * 0.62, R * 0.55, 0, 0, TAU); ctx.fillStyle = "#cfc9db"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = "#2a2140"; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(-R * 0.22, -R * 0.2, R * 0.16, R * 0.08, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore(); return;
    }
    var cut = clamp((t - T.cutGo) / 1.3, 0, 1), paint = clamp((t - T.paintGo) / 1.8, 0, 1), pat = t >= T.lift;
    var ex = {}; f.extras.forEach(function (n, i) { if (t >= extraTime(i)) ex[n] = true; });
    var full = t >= T.done;
    var st = d.kind === "spinner" ? { a: full ? (t - T.done) * 9 : 0, w: 0 } : null;
    if (cut < 1) {
      ctx.save(); ctx.globalAlpha = 1 - cut; ctx.beginPath(); ctx.ellipse(0, R * 0.4, R * 0.62 * (1 - cut * 0.3), R * 0.55, 0, 0, TAU); ctx.fillStyle = "#cfc9db"; ctx.fill(); ctx.restore();
    }
    ctx.scale(R, R);
    if (paint < 1) { ctx.save(); ctx.globalAlpha = cut; A.drawFidget(ctx, d, st, { grey: true, px: R * sc }); ctx.restore(); }
    if (paint > 0) {
      ctx.save();
      if (paint < 1) { ctx.beginPath(); ctx.rect(-1.7, -1.7, 3.4, 3.4 * paint); ctx.clip(); }
      A.drawFidget(ctx, d, st, { pattern: pat, extras: full ? true : ex, t: simT, px: R * sc, eyes: f.toyEyes });
      ctx.restore();
    }
    ctx.restore();
  }

  // =====================================================================================
  // Playing with a fidget
  var play = null;
  function makeState(d) {
    if (d.kind === "spinner") return { a: 0, w: 0, spinning: false, spinT: 0, last: 0, coinT: 0, grab: null, arm: 0, hum: 0 };
    if (d.kind === "popit") { var b = A.popitBubbles(d.shape); return { up: b.map(function () { return true; }), anim: b.map(function () { return 0; }), side: 0, flipT: 0, pops: 0, flips: 0, popCoin: 0 }; }
    if (d.kind === "squishy") {
      var z = function () { var a = []; for (var i = 0; i < A.SQ_N; i++) a.push(0); return a; };
      return { sx: 1, sy: 1, vsx: 0, vsy: 0, ox: z(), oy: z(), vox: z(), voy: z(), ear: [0, 0], earV: [0, 0], grab: null, pinch: null, press: 0, squishes: 0, peak: 0 };
    }
    return { face: 0, rot: 0, rotDir: 1, clicks: 0, coinAt: 0,
      g: [{ depth: 0, down: false }, { pos: 0, on: false }, { v: 0.5, notch: 5, drag: false }, { a: 0, det: 0, drag: null }, { x: 0, y: 0, vx: 0, vy: 0, grab: false, hit: false }, { down: [0, 0, 0], held: [false, false, false] }] };
  }
  var HINTS = {
    spinner: "Flick it to spin! Space spins it too.",
    popit: "Pop every bubble, then flip it over! Space pops, F flips.",
    squishy: "Squash it, stretch it, pinch it! Space squishes.",
    cube: "Click, switch, slide, twist! The arrows turn the cube. Space clicks."
  };
  function startPlay(d, fresh) {
    play = { d: d, st: makeState(d), eyes: {}, pulse: fresh ? 1 : 0, lights: false, hintT: 5, pointers: {} };
    show("play");
    $("play-name").textContent = d.name || nameFor(d);
    $("hint").textContent = HINTS[d.kind]; $("hint").classList.remove("fade");
    $("flip-btn").hidden = d.kind !== "popit";
    $("turn-l").hidden = $("turn-r").hidden = d.kind !== "cube";
    $("lights-btn").hidden = !d.glow;
    $("lights-btn").classList.remove("on");
    updateStat(true);
  }
  function restartPlay() { if (!play) return; play.st = makeState(play.d); play.pulse = 1; SND.play("whoosh"); setPaused(false); updateStat(true); toast("Fresh start!", 1.2); }
  function geo() {
    var cv = $("play-cv"), r = cv.getBoundingClientRect(), w = r.width, h = r.height;
    var topH = 64, botH = 84, cy = topH + (h - topH - botH) / 2 - 10;
    var R = Math.max(60, Math.min(w * 0.4, (h - topH - botH) * 0.34, 240));
    return { w: w, h: h, cx: w / 2, cy: cy, R: R, left: r.left, top: r.top };
  }
  function addCoins(n, x, y) {
    save.coins += n; persist(); refreshCoins(); bumpCoins(); SND.play("coin");
    if (x !== undefined) floatText(x, y, "+" + n + " coin" + (n > 1 ? "s" : ""), "#ffd93d");
  }
  var lastStat = "";
  function statText() {
    var st = play.st, d = play.d;
    if (d.kind === "spinner") return (st.spinning ? "Spinning " + st.spinT.toFixed(1) + " s" : st.last ? "Last spin " + st.last.toFixed(1) + " s" : "Flick to spin") + (save.best ? " · Best " + save.best.toFixed(1) + " s" : "");
    if (d.kind === "popit") { var left = st.up.filter(Boolean).length; return "Pops " + st.pops + " · " + (left ? left + " to go" : "Flip it!") + " · Flips " + st.flips; }
    if (d.kind === "squishy") return "Squishes " + st.squishes;
    return "Clicks " + st.clicks + " · " + ["Button", "Switch", "Slider", "Dial", "Joystick", "Keys"][st.face] + " (" + (st.face + 1) + "/6)";
  }
  function updateStat(force) { var s = statText(); if (force || s !== lastStat) { $("stat").textContent = s; lastStat = s; } }
  function toPage(lx, ly) { var G = geo(); return [G.left + G.cx + lx * G.R, G.top + G.cy + ly * G.R]; }
  function local(e) { var G = geo(); return { x: (e.clientX - G.left - G.cx) / G.R, y: (e.clientY - G.top - G.cy) / G.R, px: e.clientX - G.left, py: e.clientY - G.top, G: G }; }

  // -- spinner --
  // Pointer times for flick speed: the event's own time, or the game clock while a test holds it,
  // so a test's drag gives the same flick on a fast or a slow machine.
  function evTime(e) { return held ? simT * 1000 : e.timeStamp; }
  function wrapAng(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function spinStart(st, w) {
    st.w = clamp(w, -80, 80); if (!st.spinning) { st.spinning = true; st.spinT = 0; st.coinT = 0; }
    SND.play("flick", Math.min(1, Math.abs(w) / 60)); play.pulse = 0.6;
  }
  function spinEnd(st) {
    if (!st.spinning) return;
    st.spinning = false; st.last = st.spinT;
    if (st.spinT > save.best + 0.05) {
      var was = save.best; save.best = st.spinT; persist();
      if (st.spinT >= 2) { SND.play("best"); toast("New best spin: " + st.spinT.toFixed(1) + " s!" + (was ? " (was " + was.toFixed(1) + " s)" : "")); var G = geo(); burst(G.cx, G.cy, 40, CONF, 420, "conf"); }
    }
  }
  var spinner = {
    down: function (st, p, e) {
      if (Math.hypot(p.x, p.y) > 1.2) return;
      if (st.spinning) { if (Math.abs(st.w) > 2) SND.play("tick", 0.8); spinEnd(st); }
      st.w = 0;
      st.grab = { id: e.pointerId, ang: Math.atan2(p.y, p.x), s: [[evTime(e), st.a]] };
    },
    move: function (st, p, e) {
      var g = st.grab; if (!g || g.id !== e.pointerId) return;
      var ang = Math.atan2(p.y, p.x), da = wrapAng(ang - g.ang); g.ang = ang;
      // near the middle the angle jumps about, so only follow the finger out on the arms
      if (Math.hypot(p.x, p.y) > 0.18) st.a += da;
      g.s.push([evTime(e), st.a]); if (g.s.length > 8) g.s.shift();
    },
    up: function (st, p, e) {
      var g = st.grab; if (!g || g.id !== e.pointerId) return;
      st.grab = null;
      var last = g.s[g.s.length - 1], first = g.s[0];
      for (var i = g.s.length - 1; i >= 0; i--) { if (last[0] - g.s[i][0] >= 40) { first = g.s[i]; break; } first = g.s[i]; }
      // speed over the last moment of the drag (at least one frame long, so a very fast flick still counts)
      var dt = Math.max(1 / 60, (last[0] - first[0]) / 1000), w = (last[1] - first[1]) / dt;
      if (evTime(e) - last[0] > 250) w = 0; // held still before letting go
      if (Math.abs(w) > 2.5) spinStart(st, w);
    },
    key: function (st) { spinEnd(st); st.grab = null; spinStart(st, (st.w >= 0 ? 1 : -1) * Math.min(80, Math.abs(st.w) + 28)); st.spinning = true; },
    tick: function (st, dt) {
      if (!st.grab && st.w) {
        var dec = (0.11 * Math.abs(st.w) + 0.3) * dt;
        st.w = Math.abs(st.w) <= dec ? 0 : st.w - Math.sign(st.w) * dec;
      }
      st.a += st.w * dt;
      if (st.spinning) {
        st.spinT += dt; st.coinT += dt;
        if (st.coinT >= 3) { st.coinT -= 3; var G = geo(); addCoins(1, G.cx, G.cy - G.R * 1.05); }
        if (Math.abs(st.w) < 0.25) { st.w = 0; spinEnd(st); }
      }
      var n = [3, 4, 6][play.d.shape] || 3, arm = Math.floor(st.a / (TAU / n));
      if (arm !== st.arm) { if (Math.abs(st.w) < 16) SND.play("tick", 0.7 + Math.abs(st.w) / 30); st.arm = arm; }
      if (++st.hum % 3 === 0) SND.spinHum(st.w);
      if (Math.abs(st.w) > 22 && rnd() < Math.min(0.6, Math.abs(st.w) / 120)) {
        var G2 = geo(), g = A.spinnerGeo(n), k = Math.floor(rnd() * n), la = st.a + k * TAU / n - Math.PI / 2;
        var tx = G2.cx + Math.cos(la) * (g.d + g.r) * G2.R, ty = G2.cy + Math.sin(la) * (g.d + g.r) * G2.R, tv = st.w * (g.d + g.r) * G2.R * 0.3;
        parts.push({ x: tx, y: ty, vx: -Math.sin(la) * tv, vy: Math.cos(la) * tv, life: 0, max: 0.45, size: 3 + rnd() * 3, col: rnd() < 0.5 ? "#fff" : A.COLORS[play.d.c2].hex, kind: "star", rot: 0, vr: 6, g: 0 });
      }
    }
  };

  // -- pop-it --
  function popAt(st, p) {
    if (st.flipT) return;
    var b = A.popitBubbles(play.d.shape);
    for (var i = 0; i < b.length; i++) if (Math.hypot(p.x - b[i].x, p.y - b[i].y) < b[i].r * 1.1) { popOne(st, i); return; }
  }
  function popOne(st, i) {
    if (!st.up[i] || st.flipT) return;
    var b = A.popitBubbles(play.d.shape)[i], G = geo();
    st.up[i] = false; st.anim[i] = 0.001; st.pops++; st.popCoin++;
    SND.play("pop", b.row, b.rows);
    var col = play.d.rainbow ? A.hue(b.row / Math.max(1, b.rows - 1) * 300, 60) : A.COLORS[st.side ? play.d.c2 : play.d.c1].hex;
    burst(G.cx + b.x * G.R, G.cy + b.y * G.R, 6, [col, "#fff"], 140);
    if (st.popCoin >= 10) { st.popCoin -= 10; addCoins(1, G.cx + b.x * G.R, G.cy + b.y * G.R - 20); }
    if (!st.up.some(Boolean)) { toast("All popped! Flip it over!", 2); SND.play("cheer"); $("flip-btn").classList.add("ready"); }
  }
  function flip(st) {
    if (st.flipT) return;
    st.flipT = 0.0001; st.wasFull = !st.up.some(Boolean); SND.play("flip"); $("flip-btn").classList.remove("ready");
  }
  var popit = {
    down: function (st, p, e) { play.pointers[e.pointerId].pop = true; popAt(st, p); },
    move: function (st, p, e) { if (play.pointers[e.pointerId] && play.pointers[e.pointerId].pop) popAt(st, p); },
    up: function () {},
    key: function (st, k) {
      if (k === "f") return flip(st);
      var i = st.up.indexOf(true); if (i < 0) flip(st); else popOne(st, i);
    },
    tick: function (st, dt) {
      for (var i = 0; i < st.anim.length; i++) if (st.anim[i]) { st.anim[i] += dt / 0.2; if (st.anim[i] >= 1) st.anim[i] = 0; }
      if (st.flipT) {
        var before = st.flipT; st.flipT += dt / 0.55;
        if (before < 0.5 && st.flipT >= 0.5) {
          // the other side: every popped bubble comes back up, and the colours swap
          st.side ^= 1; st.up = st.up.map(function (u) { return !u; }); st.flips++;
          if (st.wasFull) { var G = geo(); addCoins(3, G.cx, G.cy - G.R); burst(G.cx, G.cy, 30, CONF, 360, "conf"); }
        }
        if (st.flipT >= 1) st.flipT = 0;
      }
    }
  };

  // -- squishy --
  var squishy = {
    down: function (st, p, e) {
      var ids = Object.keys(play.pointers);
      if (ids.length >= 2) {
        var a = play.pointers[ids[0]], b = play.pointers[ids[1]];
        st.pinch = { d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), ang: Math.atan2(b.y - a.y, b.x - a.x) }; st.grab = null; return;
      }
      if (Math.hypot(p.x, p.y) > 1.15) return;
      st.grab = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, ang: Math.atan2(p.y, p.x) };
      st.peak = 0; SND.play("squish", 0.5);
    },
    move: function (st, p, e) {
      if (st.pinch) {
        var ids = Object.keys(play.pointers); if (ids.length < 2) return;
        var a = play.pointers[ids[0]], b = play.pointers[ids[1]];
        st.pinch.r = Math.hypot(a.x - b.x, a.y - b.y) / st.pinch.d0; return;
      }
      if (st.grab && st.grab.id === e.pointerId) { st.grab.x = p.x; st.grab.y = p.y; }
    },
    up: function (st, p, e) {
      if (st.pinch && Object.keys(play.pointers).length < 2) { st.pinch = null; release(st); return; }
      if (st.grab && st.grab.id === e.pointerId) { st.grab = null; release(st); }
    },
    key: function (st) { st.vsy -= 6.5; st.vsx += 4.5; st.peak = 0.3; release(st); SND.play("squish", 0.8); },
    tick: function (st, dt) {
      var tx = 1, ty = 1, g = st.grab, N = A.SQ_N, rest = A.squishyRest(play.d.shape);
      if (g) {
        var dx = g.x - g.x0, dy = g.y - g.y0, far = Math.hypot(dx, dy);
        st.press = far > 0.15 ? Math.max(0, st.press - dt * 4) : Math.min(1, st.press + dt * 4);
        ty = 1 - 0.34 * st.press; tx = 1 + 0.26 * st.press;
      } else st.press = 0;
      if (st.pinch && st.pinch.r) {
        var r = clamp(st.pinch.r, 0.55, 1.8), horiz = Math.abs(Math.cos(st.pinch.ang)) > 0.6;
        if (horiz) { tx = r; ty = 1 / Math.sqrt(r); } else { ty = r; tx = 1 / Math.sqrt(r); }
      }
      var K = 190, C = 7;
      st.vsx += (K * (tx - st.sx) - C * st.vsx) * dt; st.vsy += (K * (ty - st.sy) - C * st.vsy) * dt;
      st.sx += st.vsx * dt; st.sy += st.vsy * dt;
      st.peak = Math.max(st.peak, Math.abs(1 - st.sy), Math.abs(1 - st.sx));
      for (var i = 0; i < N; i++) {
        var txo = 0, tyo = 0;
        if (g) {
          var ang = Math.atan2(rest[i][1], rest[i][0]), wgt = Math.pow(Math.max(0, Math.cos(ang - g.ang)), 4);
          var pdx = g.x - g.x0, pdy = g.y - g.y0, L = Math.hypot(pdx, pdy), lim = 0.85;
          if (L > lim) { pdx *= lim / L; pdy *= lim / L; }
          txo = pdx * wgt * 0.95; tyo = pdy * wgt * 0.95;
          st.peak = Math.max(st.peak, Math.hypot(txo, tyo));
        }
        var l = (i + N - 1) % N, rr = (i + 1) % N;
        st.vox[i] += (140 * (txo - st.ox[i]) + 220 * (st.ox[l] + st.ox[rr] - 2 * st.ox[i]) - 6 * st.vox[i]) * dt;
        st.voy[i] += (140 * (tyo - st.oy[i]) + 220 * (st.oy[l] + st.oy[rr] - 2 * st.oy[i]) - 6 * st.voy[i]) * dt;
      }
      for (var j = 0; j < N; j++) { st.ox[j] += st.vox[j] * dt; st.oy[j] += st.voy[j] * dt; }
      for (var e = 0; e < 2; e++) {
        var vi = Math.round(N * (e ? 0.82 : 0.68));
        st.earV[e] += (-150 * st.ear[e] - 5 * st.earV[e] - st.vox[vi] * 6 + st.vsx * (e ? 3 : -3)) * dt;
        st.ear[e] = clamp(st.ear[e] + st.earV[e] * dt, -1, 1);
      }
    }
  };
  function release(st) {
    if (st.peak > 0.08) {
      st.squishes++; SND.play("boing", Math.min(1, st.peak * 2));
      if (st.squishes % 6 === 0) { var G = geo(); addCoins(1, G.cx, G.cy - G.R * 1.05); }
      var G2 = geo(); burst(G2.cx, G2.cy + G2.R * 0.6, 6, [A.light(A.COLORS[play.d.c1].hex, 0.4), "#fff"], 160, "star");
    }
    st.peak = 0;
  }

  // -- clicky cube --
  var KEY_PITCH = [1, 1.26, 1.5];
  function cubeClick(st, n) {
    st.clicks += n || 1;
    if (st.clicks - st.coinAt >= 12) { st.coinAt += 12; var G = geo(); addCoins(1, G.cx, G.cy - G.R * 0.9); }
  }
  function turnCube(st, dir) { if (st.rot) return; st.rotDir = dir; st.rot = 0.0001; SND.play("whoosh"); }
  function faceUV(p) { var s = A.CUBE_H * 0.95; return { u: p.x / s, v: p.y / s }; }
  var cube = {
    down: function (st, p, e) {
      if (st.rot) return;
      var q = faceUV(p), g = st.g[st.face], kind = A.CUBE_FACES[st.face];
      if (Math.abs(q.u) > 1.08 || Math.abs(q.v) > 1.08) { play.pointers[e.pointerId].swipe = p.x; return; }
      play.pointers[e.pointerId].gadget = true;
      if (kind === "button") { if (Math.hypot(q.u, q.v - 0.05) < 0.75) { g.down = true; SND.play("click", 1); } }
      else if (kind === "switch") { if (Math.abs(q.u) < 0.55 && Math.abs(q.v) < 0.85) { g.on = !g.on; SND.play("clack", g.on ? 1.2 : 0.9); cubeClick(st); } }
      else if (kind === "slider") { if (Math.abs(q.v) < 0.5) { g.drag = true; slide(st, g, q.u); } }
      else if (kind === "dial") { if (Math.hypot(q.u, q.v) < 0.95) g.drag = { ang: Math.atan2(q.v, q.u) }; }
      else if (kind === "joystick") { if (Math.hypot(q.u, q.v) < 0.9) { g.grab = true; stick(g, q.u, q.v); } }
      else if (kind === "keys") {
        for (var k = 0; k < 3; k++) if (Math.abs(q.u - (-0.56 + k * 0.56)) < 0.27 && q.v > -0.4 && q.v < 0.4) {
          g.held[k] = e.pointerId; SND.play("click", KEY_PITCH[k]); play.pointers[e.pointerId].key = k + 1;
        }
      }
    },
    move: function (st, p, e) {
      var ptr = play.pointers[e.pointerId]; if (!ptr) return;
      if (ptr.swipe !== undefined && ptr.swipe !== null) {
        if (Math.abs(p.x - ptr.swipe) > 0.45) { turnCube(st, p.x < ptr.swipe ? 1 : -1); ptr.swipe = null; }
        return;
      }
      if (st.rot) return;
      var q = faceUV(p), g = st.g[st.face], kind = A.CUBE_FACES[st.face];
      if (kind === "slider" && g.drag) slide(st, g, q.u);
      else if (kind === "dial" && g.drag) {
        var ang = Math.atan2(q.v, q.u), da = wrapAng(ang - g.drag.ang); g.drag.ang = ang; g.a += da;
        var det = Math.floor(g.a / (TAU / 12)); if (det !== g.det) { SND.play("tick", 1.3); g.det = det; cubeClick(st); }
      } else if (kind === "joystick" && g.grab) stick(g, q.u, q.v);
    },
    up: function (st, p, e) {
      var ptr = play.pointers[e.pointerId] || {}, g = st.g[st.face], kind = A.CUBE_FACES[st.face];
      if (!ptr.gadget) return;
      if (kind === "button" && g.down) { g.down = false; SND.play("clack", 0.8); cubeClick(st); }
      else if (kind === "slider") g.drag = false;
      else if (kind === "dial") g.drag = null;
      else if (kind === "joystick" && g.grab) { g.grab = false; if (Math.hypot(g.x, g.y) > 0.2) { cubeClick(st); SND.play("boing", 0.2); } }
      else if (kind === "keys" && ptr.key) { g.held[ptr.key - 1] = false; SND.play("clack", KEY_PITCH[ptr.key - 1]); cubeClick(st); }
    },
    key: function (st, k) {
      if (k === "arrowleft") return turnCube(st, -1);
      if (k === "arrowright") return turnCube(st, 1);
      if (st.rot) return;
      var g = st.g[st.face], kind = A.CUBE_FACES[st.face];
      if (kind === "button") { g.depth = 1; SND.play("click", 1); SND.play("clack", 0.8); cubeClick(st); }
      else if (kind === "switch") { g.on = !g.on; SND.play("clack", g.on ? 1.2 : 0.9); cubeClick(st); }
      else if (kind === "slider") { var n = (g.notch + 1) % 11; g.v = n / 10; g.notch = n; SND.play("tick", 1); cubeClick(st); }
      else if (kind === "dial") { g.a += TAU / 12; g.det = Math.floor(g.a / (TAU / 12)); SND.play("tick", 1.3); cubeClick(st); }
      else if (kind === "joystick") { var a = rnd() * TAU; g.x = Math.cos(a) * 0.42; g.y = Math.sin(a) * 0.42; SND.play("thunk"); cubeClick(st); }
      else if (kind === "keys") { var i = st.clicks % 3; g.down[i] = 1; SND.play("click", KEY_PITCH[i]); cubeClick(st); }
    },
    tick: function (st, dt) {
      var G = st.g;
      G[0].depth += ((G[0].down ? 1 : 0) - G[0].depth) * Math.min(1, dt * 30);
      G[1].pos += ((G[1].on ? 1 : 0) - G[1].pos) * Math.min(1, dt * 22);
      var j = G[4];
      if (!j.grab) { j.vx += (-320 * j.x - 9 * j.vx) * dt; j.vy += (-320 * j.y - 9 * j.vy) * dt; j.x += j.vx * dt; j.y += j.vy * dt; }
      for (var k = 0; k < 3; k++) G[5].down[k] += (((G[5].held[k] !== false) ? 1 : 0) - G[5].down[k]) * Math.min(1, dt * 30);
      if (st.rot) {
        st.rot += dt / 0.32;
        if (st.rot >= 1) { st.rot = 0; st.face = (st.face + st.rotDir + 6) % 6; SND.play("clack", 0.6); }
      }
    }
  };
  function slide(st, g, u) {
    g.v = clamp((u + 0.7) / 1.4, 0, 1);
    var n = Math.round(g.v * 10); if (n !== g.notch) { g.notch = n; SND.play("tick", 0.9 + n * 0.05); cubeClick(st); }
  }
  function stick(g, u, v) {
    var L = Math.hypot(u, v), lim = 0.42;
    if (L > lim) { u *= lim / L; v *= lim / L; if (!g.hit) { SND.play("thunk"); g.hit = true; } } else if (L < lim * 0.8) g.hit = false;
    g.x = u; g.y = v; g.vx = 0; g.vy = 0;
  }
  var KINDS = { spinner: spinner, popit: popit, squishy: squishy, cube: cube };

  function playTick(dt) {
    var k = KINDS[play.d.kind]; k.tick(play.st, dt);
    play.pulse = Math.max(0, play.pulse - dt * 2.5);
    if (play.hintT > 0) { play.hintT -= dt; if (play.hintT <= 0) $("hint").classList.add("fade"); }
    eyePhys(play.eyes, dt);
    updateStat();
  }
  function drawPlay() {
    var F = fit($("play-cv")), ctx = F.ctx, w = F.w, h = F.h, t = simT, G = geo();
    paintBackdrop(ctx, w, h, t, play.lights);
    var st = play.st, d = play.d, R = G.R;
    // a spin ring for the spinner
    if (d.kind === "spinner" && Math.abs(st.w) > 10) {
      ctx.strokeStyle = play.lights ? "rgba(255,255,255,0.18)" : "rgba(42,33,64,0.12)"; ctx.lineWidth = 4;
      for (var i = 0; i < 3; i++) { var a0 = st.a * 0.3 + i * TAU / 3; ctx.beginPath(); ctx.arc(G.cx, G.cy, R * 1.22, a0, a0 + 0.9); ctx.stroke(); }
    }
    ctx.fillStyle = play.lights ? "rgba(0,0,0,0.35)" : "rgba(42,33,64,0.13)";
    ctx.beginPath(); ctx.ellipse(G.cx, G.cy + R * 1.12, R * 0.85, R * 0.14, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(G.cx, G.cy);
    var s = R * (1 + 0.1 * Math.sin(play.pulse * Math.PI));
    ctx.scale(s, s);
    A.drawFidget(ctx, d, st, { t: t, px: s, eyes: play.eyes, lightsOff: play.lights });
    ctx.restore();
    if (d.kind === "spinner") {
      var big = st.spinning ? st.spinT : st.last;
      if (big || st.spinning) {
        ctx.font = "900 " + Math.round(Math.max(24, R * 0.22)) + "px ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.lineWidth = 7; ctx.strokeStyle = "#2a2140"; var txt = big.toFixed(1) + " s";
        var ty = G.cy - R * 1.16;
        ctx.strokeText(txt, G.cx, ty); ctx.fillStyle = st.spinning ? "#ffd93d" : "#fff"; ctx.fillText(txt, G.cx, ty);
      }
    }
    drawParts(ctx, parts);
  }

  // =====================================================================================
  // Shelf
  function buildShelf() {
    var grid = $("shelf-grid"); grid.innerHTML = "";
    $("shelf-n").textContent = save.shelf.length + " / " + SHELF_MAX;
    $("shelf-best").textContent = save.best ? "Best spin " + save.best.toFixed(1) + " s" : "No spins yet";
    save.shelf.forEach(function (d, i) {
      var cell = document.createElement("div"); cell.className = "slot";
      var b = document.createElement("button"); b.className = "slot-play"; b.setAttribute("aria-label", "Play with " + d.name);
      var c = document.createElement("canvas"); b.appendChild(c); thumb(c, d, 84);
      var n = document.createElement("span"); n.textContent = d.name; b.appendChild(n);
      b.addEventListener("click", function () { SND.init(); SND.play("pick"); startPlay(d, true); });
      var r = document.createElement("button"); r.className = "recycle"; r.setAttribute("aria-label", "Recycle " + d.name); r.textContent = "✕";
      r.addEventListener("click", function () {
        SND.init();
        if (!r.classList.contains("sure")) { r.classList.add("sure"); r.textContent = "Recycle?"; SND.play("tap"); setTimeout(function () { r.classList.remove("sure"); r.textContent = "✕"; }, 3000); return; }
        save.shelf.splice(i, 1); persist(); SND.play("whoosh"); toast("Recycled! Room for a new one."); buildShelf();
      });
      cell.appendChild(b); cell.appendChild(r); grid.appendChild(cell);
    });
    for (var e = save.shelf.length; e < SHELF_MAX; e++) { var em = document.createElement("div"); em.className = "slot empty"; grid.appendChild(em); }
  }

  // =====================================================================================
  // Clock, input, wiring
  var held = false, simT = 0, acc = 0, lastTs = null;
  function tick(dt) {
    simT += dt;
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) { $("toast").classList.add("fade"); } }
    previewPulse = Math.max(0, previewPulse - dt * 3);
    if (paused) return;
    tickParts(parts, dt);
    if (screen === "factory") factoryTick(dt);
    else if (screen === "play" && play) playTick(dt);
    else if (screen === "title") eyePhys(demoEyes, dt);
    else if (screen === "design") eyePhys(previewEyes, dt);
  }
  function render() {
    if (screen === "title") drawTitle();
    else if (screen === "design") drawPreview();
    else if (screen === "factory") drawFactory();
    else if (screen === "play" && play) drawPlay();
  }
  function frame(ts) {
    if (lastTs === null) lastTs = ts;
    var real = Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts;
    if (!held) { acc += real; while (acc >= DT) { tick(DT); acc -= DT; } }
    try { render(); } catch (e) { if (window.console) console.warn(e); }
    SND.musicTick();
    requestAnimationFrame(frame);
  }

  // play canvas pointers
  var pcv = $("play-cv");
  pcv.addEventListener("pointerdown", function (e) {
    SND.init(); if (!play || paused) return;
    try { pcv.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    var p = local(e); play.pointers[e.pointerId] = { x: p.px, y: p.py };
    KINDS[play.d.kind].down(play.st, p, e);
    e.preventDefault();
  });
  pcv.addEventListener("pointermove", function (e) {
    if (!play || paused || !play.pointers[e.pointerId]) return;
    var p = local(e); play.pointers[e.pointerId].x = p.px; play.pointers[e.pointerId].y = p.py;
    KINDS[play.d.kind].move(play.st, p, e);
  });
  function ptrUp(e) {
    if (!play || !play.pointers[e.pointerId]) return;
    var p = local(e); KINDS[play.d.kind].up(play.st, p, e);
    delete play.pointers[e.pointerId];
  }
  pcv.addEventListener("pointerup", ptrUp); pcv.addEventListener("pointercancel", ptrUp);

  document.addEventListener("keydown", function (e) {
    SND.init();
    var k = e.key.toLowerCase();
    if (k === "m") { toggleSound("sfx"); return; }
    if (k === "p" || k === "escape") { if (screen === "play" || screen === "factory") { setPaused(!paused); e.preventDefault(); } else if (k === "escape" && screen !== "title") show("title"); return; }
    if (paused) return;
    if (screen === "title" && (k === "enter" || k === " ") && !(document.activeElement && document.activeElement.tagName === "BUTTON")) { e.preventDefault(); show("design"); return; }
    if (screen === "design") { designKey(e); return; }
    if (screen === "factory" && (k === " " || k === "enter" || k === "s")) { e.preventDefault(); skipFactory(); return; }
    if (screen === "play" && play) {
      if (k === " " || (play.d.kind === "popit" && k === "f") || (play.d.kind === "cube" && (k === "arrowleft" || k === "arrowright"))) {
        if (document.activeElement && document.activeElement.tagName === "BUTTON") document.activeElement.blur();
        e.preventDefault(); KINDS[play.d.kind].key(play.st, k);
      }
    }
  });

  function toggleSound(which) {
    var on = !SND.settings[which]; SND.set(which, on);
    store("sound", { sfx: SND.settings.sfx, music: SND.settings.music });
    syncSoundButtons();
    if (on) SND.play("tap");
  }
  function syncSoundButtons() {
    document.querySelectorAll("[data-sound]").forEach(function (b) {
      var on = SND.settings[b.dataset.sound]; b.classList.toggle("off", !on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function on(id, fn) { $(id).addEventListener("click", function (e) { SND.init(); fn(e); }); }
  on("make-btn", function () { SND.play("pick"); show("design"); });
  on("shelf-btn", function () { SND.play("pick"); show("shelf"); });
  on("design-back", function () { SND.play("tap"); show("title"); });
  on("build-btn", function () { SND.play("pick"); startFactory(); });
  on("skip-btn", skipFactory);
  on("fac-pause", function () { setPaused(true); });
  on("play-pause", function () { setPaused(true); });
  on("resume-btn", function () { setPaused(false); });
  on("restart-btn", function () { if (screen === "factory" && fac) { fac.t = 0; fac.fired = {}; fac.parts = []; setPaused(false); cap("Squirting out the toy goo..."); } else restartPlay(); });
  on("new-btn", function () { show("design"); });
  on("toshelf-btn", function () { show("shelf"); });
  on("title-btn", function () { show("title"); });
  on("play-new", function () { SND.play("pick"); show("design"); });
  on("play-shelf", function () { SND.play("pick"); show("shelf"); });
  on("shelf-back", function () { SND.play("tap"); show("title"); });
  on("shelf-make", function () { SND.play("pick"); show("design"); });
  on("flip-btn", function () { if (play && play.d.kind === "popit") flip(play.st); });
  on("turn-l", function () { if (play && play.d.kind === "cube") turnCube(play.st, -1); });
  on("turn-r", function () { if (play && play.d.kind === "cube") turnCube(play.st, 1); });
  on("lights-btn", function () { if (!play) return; play.lights = !play.lights; $("lights-btn").classList.toggle("on", play.lights); SND.play(play.lights ? "sparkle" : "tap"); });
  document.querySelectorAll("[data-sound]").forEach(function (b) { b.addEventListener("click", function () { SND.init(); toggleSound(b.dataset.sound); }); });
  $("panel").addEventListener("click", function (e) {
    var b = e.target.closest(".opt"); if (!b) return;
    choose(b.dataset.row, b.dataset.val);
  });
  document.addEventListener("pointerdown", function () { SND.init(); }, { once: false, passive: true });
  syncSoundButtons();
  show("title");
  requestAnimationFrame(frame);

  // ---- for the evidence tests only: hold and step the clock, seed the dice, peek at state ----
  window.__ff = {
    hold: function (b) { held = !!b; acc = 0; },
    step: function (secs) { var n = Math.round(secs / DT); for (var i = 0; i < n; i++) tick(DT); render(); },
    seed: seed,
    get screen() { return screen; },
    get paused() { return paused; },
    get design() { return copy(design); },
    setDesign: function (o) { Object.keys(o).forEach(function (k) { design[k] = o[k]; }); tidy(design); if (screen === "design") buildPanel(); return copy(design); },
    get fac() { return fac ? { t: fac.t, d: copy(fac.d), caption: $("fac-cap").textContent } : null; },
    get play() { return play ? { d: copy(play.d), st: play.st, lights: play.lights } : null; },
    get save() { return copy(save); },
    get simT() { return simT; },
    setCoins: function (n) { save.coins = n; persist(); refreshCoins(); },
    unlockAll: function () { A.KINDS.forEach(function (k) { save.unlocked[shapeKey(k, 1)] = save.unlocked[shapeKey(k, 2)] = true; }); A.EXTRAS.forEach(function (x) { if (PRICE[x]) save.unlocked[x] = true; }); persist(); if (screen === "design") buildPanel(); },
    toPage: toPage,
    bubble: function (i) { var b = A.popitBubbles(play.d.shape)[i]; return toPage(b.x, b.y); },
    bubbles: function () { return A.popitBubbles(play.d.shape).length; },
    faceToPage: function (u, v) { var s = A.CUBE_H * 0.95; return toPage(u * s, v * s); },
    T: T
  };
})();
