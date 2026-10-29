// Angry Dudes · game engine
//
// The engine knows nothing about any one war. Each battle pack in js/packs/
// supplies units, defenders, fort pieces, scenery and levels; this file runs them.
//
// World units are "logical pixels", the same grid the sprites are drawn on.
// The battlefield is 720 × 300 with the ground at y = 270. Matter.js runs the
// physics PH times larger than that, which keeps 16 px blocks stacking calmly.
(function () {
  "use strict";

  var M = window.Matter, SPR = window.ANGRY_SPRITES, PACKS = window.ANGRY_PACKS || [];
  if (!M) { document.getElementById("boot-error").hidden = false; return; }
  var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
      Events = M.Events, Sleeping = M.Sleeping;

  /* ------------------------------------------------------------ constants */
  var STEP = 1000 / 60;
  var PH = 3;
  var WORLD_W = 720, WORLD_H = 300, GROUND = 270;   // WORLD_W is the default; levels may set a wider `width`
  var VIEW_W = 720;                            // how much battlefield to show across the screen
  var FIT_TOP = 70;                            // high sky may be cropped on short screens
  var GRAV = 0.001 * STEP * STEP;              // gravity per step², physics units
  var SLING_X = 110, SLING = { x: 118, y: 249 };
  var BUNKER_X = 40, BUNKER = { x: 66, y: 242 };
  var MAX_PULL = 50, MAX_SPEED = 24, PULL_CSS = 110;
  var OUTLINE = "#1d1a2b";
  var WATER = 0x0004, BOAT = 0x0008;          // collision categories: only boats float on water
  var KIND_LABEL = { sling: "Sling", fire: "Fire", drive: "Drive", air: "Call in" };

  /* ------------------------------------------------------------- helpers */
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pos(e) { return { x: e.body.position.x / PH, y: e.body.position.y / PH }; }
  function speed(b) { return Math.hypot(b.velocity.x, b.velocity.y); }
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (err) { return null; } }

  /* ------------------------------------------------------------- sprites */
  var spriteCache = {}, whiteCache = {};
  function sprite(name) {
    if (spriteCache[name]) return spriteCache[name];
    var s = SPR.sprites[name], c = document.createElement("canvas");
    if (!s) { c.width = c.height = 8; spriteCache[name] = c; return c; }
    c.width = s.rows[0].length; c.height = s.rows.length;
    var x = c.getContext("2d"), tp = SPR.teams[s.team] || {}, po = s.pal || {};
    s.rows.forEach(function (row, y) {
      for (var i = 0; i < row.length; i++) {
        var ch = row[i]; if (ch === ".") continue;
        var col = po[ch] || tp[ch] || SPR.palette[ch]; if (!col) continue;
        x.fillStyle = col; x.fillRect(i, y, 1, 1);
      }
    });
    spriteCache[name] = c; return c;
  }
  function whiteSprite(name) {
    if (whiteCache[name]) return whiteCache[name];
    var s = sprite(name), c = document.createElement("canvas");
    c.width = s.width; c.height = s.height;
    var x = c.getContext("2d");
    x.drawImage(s, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height);
    whiteCache[name] = c; return c;
  }
  var crack = (function () {
    var c = document.createElement("canvas"); c.width = 16; c.height = 16;
    var x = c.getContext("2d"), r = rng(9); x.fillStyle = "rgba(29,26,43,0.75)";
    for (var n = 0; n < 3; n++) {
      var px = 3 + Math.floor(r() * 10), py = 2 + Math.floor(r() * 4);
      for (var i = 0; i < 9; i++) { x.fillRect(px, py, 1, 1); px += Math.round(r() * 2 - 1); py += 1; }
    }
    return c;
  })();

  /* --------------------------------------------------------------- sound */
  var audio = null, soundOn = store("angrydudes.sound") !== false, lastThud = 0, noiseBuf = null;
  function ac() {
    if (!soundOn) return null;
    if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { audio = null; } }
    if (audio && audio.state === "suspended") audio.resume();
    return audio;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    var a = ac(); if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = freq || 1200;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  var sfx = {
    twang: function () { tone(180, 720, 0.2, "triangle", 0.14); },
    thump: function () { noise(0.18, 0.3, 500); tone(120, 50, 0.15, "sine", 0.2); },
    whoosh: function () { noise(0.25, 0.12, 2200); },
    boom: function (p) { noise(0.35 + p * 0.08, 0.4, 380); tone(95, 28, 0.45, "sine", 0.3); },
    thud: function (v) { if (simT - lastThud < 70) return; lastThud = simT; noise(0.07, 0.1 * v, 900); },
    crack: function () { noise(0.09, 0.14, 2600); },
    ko: function () { tone(620, 160, 0.3, "square", 0.06); },
    shot: function () { noise(0.05, 0.2, 4200); },
    zap: function () { tone(1500, 260, 0.16, "square", 0.05); },
    rattle: function () { for (var i = 0; i < 7; i++) noise(0.03, 0.14, 3200, i * 0.05); },
    thwack: function () { noise(0.06, 0.2, 1800); tone(300, 120, 0.08, "square", 0.05); },
    volley: function () { for (var i = 0; i < 4; i++) noise(0.06, 0.16, 3600, i * 0.07); },
    chute: function () { noise(0.3, 0.08, 1400); },
    engine: function () { tone(60, 95, 0.6, "sawtooth", 0.05); },
    shout: function () { tone(300, 420, 0.12, "square", 0.05); tone(420, 260, 0.18, "square", 0.05, 0.12); },
    plane: function () { tone(140, 220, 1.2, "sawtooth", 0.03); },
    heal: function () { [523, 659, 784].forEach(function (f, i) { tone(f, f, 0.12, "triangle", 0.06, i * 0.08); }); },
    sizzle: function () { noise(0.5, 0.12, 5000); },
    fanfare: function () { [392, 523, 659, 784, 659, 784].forEach(function (f, i) { tone(f, f, 0.16, "square", 0.07, i * 0.14); }); },
    sad: function () { [392, 330, 262].forEach(function (f, i) { tone(f, f * 0.98, 0.3, "triangle", 0.09, i * 0.28); }); }
  };
  function play(name, arg) { if (sfx[name]) sfx[name](arg); }

  /* --------------------------------------------------------------- state */
  var pack = null, packIndex = 0, UNITS = {}, ORDER = [], BLOCKS = {}, DEFENDERS = {}, BY_KEY = {}, THEMES = {};
  var engine = null, world = null, level = null, levelIndex = 0, worldW = WORLD_W;
  var mode = "menu";        // menu | intro | play | result
  var phase = "ready";      // ready | aiming | active | settling | over
  var ents = [], planes = [], particles = [], popups = [], tracers = [], pendingBooms = [], scheduled = [];
  var arsenal = {}, selected = null, score = 0, wind = 0, simT = 0, graceUntil = 0, shake = 0;
  var active = null, aim = null, trail = [], lastTrail = [];
  var settleStill = 0, settleStart = 0, winAt = 0;
  var BONUS = 5000, starLine = [0, 0], extraTroop = null, introPan = false;
  var topSpeed = MAX_SPEED;   // launch speed at full pull; wide levels raise it so the far end of the fort is in reach
  var gravK = 1;              // gravity for this level: 1 on Earth, less on the Moon
  // jeremy.v2: the keyboard's aim (degrees above flat, power 0-1), its plane target, the keys held down, and pause
  var kb = { ang: 35, pow: 0.7, x: null }, held = {}, paused = false, lastInput = "pointer";

  function usePack(i) {
    packIndex = clamp(i, 0, PACKS.length - 1); pack = PACKS[packIndex];
    UNITS = pack.units; ORDER = pack.order; BLOCKS = pack.blocks; DEFENDERS = pack.defenders; THEMES = pack.themes;
    BY_KEY = {};
    Object.keys(BLOCKS).forEach(function (c) { if (!BLOCKS[c].slab) BY_KEY[BLOCKS[c].key] = c; });
    Object.keys(DEFENDERS).forEach(function (c) { BY_KEY[DEFENDERS[c].key] = c; });
    store("angrydudes.pack", pack.id);
  }
  function nameOf(key) {
    if (UNITS[key]) return UNITS[key].name;
    var c = BY_KEY[key], d = c && (BLOCKS[c] || DEFENDERS[c]);
    return d && d.name || key;
  }

  /* --------------------------------------------------------------- level */
  function loadLevel(i) {
    levelIndex = i; level = pack.levels[i]; worldW = level.width || WORLD_W;
    UNITS = campaign ? campaignUnits() : pack.units;
    camX = 0; camHoldX = null; camHoldUntil = 0; gesture = null;
    engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
    world = engine.world;
    gravK = level.gravity || 1; engine.gravity.y = gravK;
    Events.on(engine, "collisionStart", onCollide);
    ents = []; planes = []; particles = []; popups = []; tracers = []; pendingBooms = []; scheduled = [];
    trail = []; lastTrail = []; active = null; aim = null; phase = "ready";
    kb.ang = 35; kb.pow = 0.7; kb.x = null; held = {};
    simT = 0; graceUntil = 1200; score = 0; winAt = 0; shake = 0;

    // the ground, with any trenches cut into it as lower floors
    function addGround(a, b, top) {
      Composite.add(world, Bodies.rectangle((a + b) / 2 * PH, (top + 100) * PH, (b - a) * PH, 200 * PH, { isStatic: true, friction: 0.9, label: "ground" }));
    }
    var gx0 = -800;
    (level.trenches || []).slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (t) {
      addGround(gx0, t.x, GROUND); addGround(t.x, t.x + t.w, GROUND + t.d); gx0 = t.x + t.w;
      if (t.water) Composite.add(world, Bodies.rectangle((t.x + t.w / 2) * PH, (GROUND + 2) * PH, t.w * PH, 4 * PH,
        { isStatic: true, label: "water", collisionFilter: { category: WATER, mask: BOAT } }));
    });
    addGround(gx0, worldW + 800, GROUND);
    if (level.cliff) {
      var cw = worldW + 300 - level.cliff.x;
      Composite.add(world, Bodies.rectangle((level.cliff.x + cw / 2) * PH, (GROUND - level.cliff.h / 2) * PH, cw * PH, level.cliff.h * PH,
        { isStatic: true, friction: 0.9, label: "cliff" }));
    }

    // Each column stacks on whatever is already below it, so towers, gates and huts can sit side by side.
    // every column starts on whatever is under it: open ground, a trench floor or a cliff top
    var rows = level.fort, cols = [];
    rows.forEach(function (row) { for (var c = 0; c < row.length; c++) cols[c] = groundAt(level.fortX + c * 16 + 8); });
    function topOf(c, n) { var t = Infinity; for (var k = c; k < c + n; k++) t = Math.min(t, cols[k]); return t; }
    for (var r = rows.length - 1; r >= 0; r--) {
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        var ch = row[c], x = level.fortX + c * 16, n, top, k, sh;
        if (ch === "." || ch === "-") continue;
        if (BLOCKS[ch] && BLOCKS[ch].slab) {
          n = 1; while (row[c + n] === ch) n++;
          top = topOf(c, n); sh = BLOCKS[ch].h || 8;
          if (BLOCKS[ch].boat) top = Math.min(top, GROUND);     // a ship's hull floats on the water
          addBlock(ch, x + n * 8, top, n * 16, sh);
          for (k = c; k < c + n; k++) cols[k] = top - sh;
          c += n - 1;
        } else if (BLOCKS[ch]) {
          if (BLOCKS[ch].boat) cols[c] = Math.min(cols[c], GROUND);
          addBlock(ch, x + 8, cols[c]); cols[c] -= BLOCKS[ch].h || 16;
        } else if (DEFENDERS[ch]) {
          n = DEFENDERS[ch].cells || 1; top = topOf(c, n);
          addDefender(ch, x + n * 8, top);
          for (k = c; k < c + n; k++) cols[k] = top - 16;
        }
      }
    }
    (level.extras || []).forEach(function (ex) {
      var ch = BY_KEY[ex.type];
      var at = groundAt(ex.x) - (ex.alt || 0);
      if (BLOCKS[ch]) addBlock(ch, ex.x, at); else if (DEFENDERS[ch]) addDefender(ch, ex.x, at);
    });

    // in a campaign, every mission's defenders are tougher than the last
    var tough = campaign ? campaign.C.toughness[campaign.i] || 1 : 1;
    if (tough !== 1) ents.forEach(function (e) { if (e.type === "defender") { e.hp *= tough; e.maxHp *= tough; } });
    arsenal = {};
    var issued = campaign ? campaignArsenal(level) : level.arsenal;
    ORDER.forEach(function (k) { if (issued[k]) arsenal[k] = issued[k]; });
    // Star targets: knocking everything out plus typical wreckage is the base; each item left over adds a bonus.
    var base = 0;
    ents.forEach(function (e) { base += e.type === "defender" ? e.pts : e.type === "block" && !(e.def && e.def.fixed) ? e.pts * 0.5 : 0; });
    starLine = [Math.round((base + BONUS) / 1000) * 1000, Math.round((base + 2 * BONUS) / 1000) * 1000];
    // A full pull lands a troop about 600 px out. Wider levels launch faster so the farthest defender on the ground
    // (balloons don't count: they're for planes) can still be reached; higher targets count as a bit farther.
    var far = 0;
    ents.forEach(function (e) { if (e.type === "defender" && !e.def.float) { var p = pos(e); far = Math.max(far, p.x + 24 + (GROUND - p.y)); } });
    topSpeed = MAX_SPEED * clamp(Math.sqrt((far - SLING.x) / 600 * gravK), 1, 1.4);
    // After a couple of losses, a bonus troop makes the next try a little easier.
    extraTroop = null;
    if ((store(lossKey()) || 0) >= 2) {
      extraTroop = ORDER.filter(function (k) { return arsenal[k] && UNITS[k].kind === "sling"; })[0] || ORDER.filter(function (k) { return arsenal[k]; })[0];
      if (extraTroop) arsenal[extraTroop]++;
    }
    selected = firstAvailable();
    newWind();
    buildBackground(); buildBar(); updateHud();
  }
  function groundAt(x) {
    if (!level) return GROUND;
    if (level.cliff && x >= level.cliff.x) return GROUND - level.cliff.h;
    var ts = level.trenches || [];
    for (var i = 0; i < ts.length; i++) if (x >= ts[i].x && x < ts[i].x + ts[i].w) return GROUND + ts[i].d;
    return GROUND;
  }
  function firstAvailable() { for (var i = 0; i < ORDER.length; i++) if (arsenal[ORDER[i]] > 0) return ORDER[i]; return null; }
  function newWind() { wind = level.wind ? Math.round((Math.random() * 2 - 1) * level.wind) : 0; }
  function defenders() { return ents.filter(function (e) { return e.type === "defender" && !e.dead; }); }
  function defendersLeft() { return defenders().length; }
  function aliveReactor(type) { return defenders().filter(function (d) { return d.def.react && d.def.react.type === type; }); }

  function addEnt(e) {
    e.body.plugin = { ent: e }; e.born = simT;
    if (level && (e.type === "block" || e.type === "defender")) e.wet0 = inWater(pos(e));   // bridge piers built in the river
    Composite.add(world, e.body); ents.push(e); return e;
  }
  function entOf(body) { return body && body.plugin && body.plugin.ent || null; }
  function addBlock(ch, cx, bottom, w, h) {
    var d = BLOCKS[ch]; w = w || d.w || 16; h = h || d.h || 16;
    var opts = { density: d.density, friction: 0.8, frictionStatic: 1, restitution: 0.05, isStatic: !!d.fixed, isSensor: !!d.sensor };
    if (d.boat) opts.collisionFilter = { category: BOAT, mask: 0xFFFFFFFF };
    var body = Bodies.rectangle(cx * PH, (bottom - h / 2) * PH, w * PH, h * PH, opts);
    var hp = d.slab ? d.hp * w / 96 + d.hp * 0.4 : d.hp;
    return addEnt({ type: "block", key: d.key, sprite: d.sprite || d.key, w: w, h: h, hp: hp, maxHp: hp, pts: d.pts, def: d, tile: !!d.slab, body: body });
  }
  function addDefender(ch, cx, bottom) {
    var d = DEFENDERS[ch];
    var body = Bodies.rectangle(cx * PH, (bottom - d.h / 2) * PH, d.w * PH, d.h * PH,
      { density: d.density, friction: 0.9, frictionStatic: 1, restitution: 0, isStatic: !!d.float });
    return addEnt({ type: "defender", key: d.key, sprite: d.sprite || d.key, w: d.w, h: d.h, hp: d.hp, maxHp: d.hp, pts: d.pts, ox: d.ox || 0, def: d, body: body });
  }

  /* ------------------------------------------------------------- physics */
  function onCollide(ev) {
    for (var i = 0; i < ev.pairs.length; i++) {
      var p = ev.pairs[i], A = p.bodyA.parent, B = p.bodyB.parent, ea = entOf(A), eb = entOf(B);
      touch(ea, eb); touch(eb, ea);
      if (simT < graceUntil) continue;
      var n = p.collision.normal;
      // speeds are compared to the level's gravity, so a slow landing on the Moon hits as hard as a fast one on Earth
      var rel = Math.abs((A.velocity.x - B.velocity.x) * n.x + (A.velocity.y - B.velocity.y) * n.y) / Math.sqrt(gravK);
      if (rel < 2) continue;
      if (ea) hurt(ea, B, eb, rel);
      if (eb) hurt(eb, A, ea, rel);
      if (rel > 5) sfx.thud(Math.min(1, rel / 18));
    }
  }
  function touch(e, other) {
    if (!e || e.dead) return;
    var u = e.unit;
    if (u && u.impact && !e.spent) { e.spent = true; pendingBooms.push(e); }
    if (e.pierce > 0 && other && other.hp != null && !other.dead && other.type !== "proj" && !(other.def && other.def.fixed) && simT >= graceUntil) {
      damage(other, (u.pierceDmg || 5) * (u.best === other.key ? 2.5 : 1));
      if (other.dead) { e.pierce--; e.restoreVel = { x: e.body.velocity.x * 0.85, y: e.body.velocity.y * 0.85 }; }
    }
    if (u && u.stick && !e.stuckAt && other !== e) { e.stuckAt = simT; e.freeze = true; }
    if (!e.touched) {
      e.touched = true;
      if (u && u.tap === "detonate" && !e.spent) e.fuseAt = simT + 1200;
      if (e.melee && !e.chute) melee(e);
    }
    if (e.chute) { closeChute(e); e.landed = true; melee(e); updateHint(); }
    if (e.troop && other && other.def && other.def.sensor && !e.snagged) { e.snagged = true; e.snagAt = simT; }
    if (e.def && e.def.sensor && other && other.type === "vehicle" && mode === "play") kill(e);
  }
  function hurt(e, otherBody, other, rel) {
    if (e.hp == null || e.dead) return;
    var mine = e.body.isStatic ? 5 : e.body.mass;
    var mf = otherBody.isStatic ? 1.2 : clamp(otherBody.mass / mine, 0.5, 4);
    var mult = 1;
    if (other && other.unit && !other.unit.enemy) {
      mult *= other.unit.power || 1;
      if (other.unit.best === e.key) mult *= 2.5;
      if (other.dashing) mult *= 2;
      if (other.ramUntil > simT) mult *= 3;
      if (other.unit.soft && e.type === "block") mult *= 0.1;
    }
    var dmg = (rel - 2) * 0.45 * mf * mult;
    if (e.type === "vehicle") dmg *= 0.25;
    damage(e, dmg);
  }
  function damage(e, dmg) {
    if (e.dead || e.hp == null || dmg <= 0.05) return;
    e.hp -= dmg; e.flash = simT + 120;
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    if (e.dead) return;
    e.dead = true;
    var p = pos(e);
    if (e.type === "defender") {
      addScore(e.pts, p.x, p.y - e.h / 2 - 4);
      poof(p.x, p.y, 14); sfx.ko();
      if (e.def.explodes) pendingBooms.push({ x: p.x, y: p.y, boom: e.def.explodes, fire: e.def.fire });
      if (mode === "play" && defendersLeft() === 0 && !winAt) winAt = simT + 1600;
    } else if (e.type === "block") {
      addScore(e.pts, p.x, p.y);
      debris(p.x, p.y, e.def.debris, e.w * e.h / 20); sfx.crack();
      if (e.def.explodes) pendingBooms.push({ x: p.x, y: p.y, boom: e.def.explodes, fire: e.def.fire });
    } else if (e.type === "vehicle") {
      var big = e.unit.tap === "blowup" && !e.spent;
      pendingBooms.push({ x: p.x, y: p.y, boom: big ? e.unit.boom : { r: 18, p: 2 }, fire: big });
      if (big) say("KA-BOOM!", p.x, p.y - 20, "#ff8c1a");
    }
  }
  function explode(x, y, boom, best, fire) {
    shake = Math.max(shake, boom.p * 1.6);
    blast(x, y, boom.r, fire); sfx.boom(boom.p);
    ents.forEach(function (e) {
      if (e.dead) return;
      var p = pos(e), dx = p.x - x, dy = p.y - y, len = Math.hypot(dx, dy) || 1;
      var d = Math.max(0, len - Math.min(e.w, e.h) * 0.45);
      if (e.def && e.def.boat) d = Math.max(0, Math.hypot(Math.max(0, Math.abs(dx) - e.w / 2), dy) - e.h * 0.45);
      if (d > boom.r) return;
      var f = 1 - d / boom.r;
      if (!e.body.isStatic) {
        Sleeping.set(e.body, false);
        var kick = f * boom.p * 5 / Math.sqrt(Math.max(1, e.body.mass));
        Body.setVelocity(e.body, { x: e.body.velocity.x + dx / len * kick, y: e.body.velocity.y + dy / len * kick - f * boom.p * 0.8 });
        if (e.body.inertia !== Infinity) Body.setAngularVelocity(e.body, e.body.angularVelocity + (Math.random() - 0.5) * 0.12 * f);
      }
      if (e.hp != null) damage(e, f * boom.p * 2.6 * (best && best === e.key ? 2.5 : 1));
    });
  }
  function processBooms() {
    var list = pendingBooms; pendingBooms = [];
    list.forEach(function (b) {
      if (b.body) {
        if (b.boomed) return;
        b.boomed = true; b.dead = true;
        var p = pos(b), u = b.unit;
        if (u.boom) explode(p.x, p.y, u.boom, u.best, u.fire);
      } else explode(b.x, b.y, b.boom, null, b.fire);
    });
  }
  function sweep() {
    var removed = false;
    for (var i = ents.length - 1; i >= 0; i--) {
      if (ents[i].dead) { Composite.remove(world, ents[i].body); ents.splice(i, 1); removed = true; }
    }
    if (removed) ents.forEach(function (e) { if (e.body.isSleeping) Sleeping.set(e.body, false); });
  }

  /* ------------------------------------------------------- per-step work */
  function updateEnts() {
    ents.forEach(function (e) {
      if (e.dead) return;
      var b = e.body, u = e.unit;
      if (u && e.type === "proj") {
        if (u.lift && !e.stuckAt) Body.applyForce(b, b.position, { x: 0, y: -b.mass * 0.001 * u.lift * gravK });
        if ((u.wind || e.chute) && wind && !e.stuckAt) Body.applyForce(b, b.position, { x: b.mass * 0.001 * wind * (e.chute ? 0.03 : 0.06), y: 0 });
        if (e.faceVel && !e.stuckAt && speed(b) > 0.5) { Body.setAngle(b, Math.atan2(b.velocity.y, b.velocity.x)); Body.setAngularVelocity(b, 0); }
        if (e.fuseAt && simT >= e.fuseAt && !e.spent) { e.spent = true; pendingBooms.push(e); }
        if (e.snagged && simT - e.snagAt < 600) Body.setVelocity(b, { x: b.velocity.x * 0.5, y: Math.max(0, b.velocity.y) * 0.5 });
        if (e.stuckAt && simT - e.stuckAt > 700) e.dead = true;
        if (e.fizzleAt && simT >= e.fizzleAt) e.dead = true;
        if (e.trail && !e.touched && Math.round(simT / STEP) % 3 === 0) trail.push(pos(e));
      }
      if (e.type === "vehicle") driveVehicle(e);
      if (!e.dead && !e.wet0 && !(u && u.boat) && !(e.def && e.def.boat) && inWater(pos(e))) splash(e);
      var p = pos(e);
      if (p.x < -100 || p.x > worldW + 100 || p.y > WORLD_H + 80) {
        if (e.type === "defender" || e.type === "block") kill(e); else e.dead = true;
      }
    });
  }
  function afterPhysics() {
    ents.forEach(function (e) {
      if (e.restoreVel && !e.dead) { Body.setVelocity(e.body, e.restoreVel); e.restoreVel = null; }
      if (e.freeze && !e.dead) { e.freeze = false; Body.setStatic(e.body, true); e.body.isSensor = true; }
    });
    for (var i = scheduled.length - 1; i >= 0; i--) if (simT >= scheduled[i].at) { scheduled[i].run(); scheduled.splice(i, 1); }
  }
  function inWater(p) {
    var ts = level.trenches || [];
    for (var i = 0; i < ts.length; i++) { var t = ts[i]; if (t.water && p.x >= t.x && p.x < t.x + t.w && p.y > GROUND + 5) return true; }
    return false;
  }
  function splash(e) {
    var p = pos(e);
    for (var i = 0; i < 16; i++) part(p.x + (Math.random() - 0.5) * 10, GROUND + 4, (Math.random() - 0.5) * 1.6, -1.2 - Math.random() * 1.6, 600, i % 2 ? "#ffffff" : "#7fb8e8", 1, 0.12);
    sfx.chute();
    if (e.type === "defender" || e.type === "block") { kill(e); say("SPLASH!", p.x, GROUND - 10, "#bfe3ff"); }
    else { e.dead = true; if (e.troop || e.type === "vehicle") say("SPLASH!", p.x, GROUND - 10, "#bfe3ff"); }
  }
  function driveVehicle(e) {
    var b = e.body, u = e.unit, p = pos(e);
    if (!e.driving) return;
    var grounded = Math.abs(b.velocity.y) < 0.6;
    if (grounded && b.velocity.x < u.speed * PH) Body.applyForce(b, b.position, { x: b.mass * 0.001 * u.push, y: 0 });
    e.stuck = (p.x - e.lastX < 0.12) ? e.stuck + 1 : 0;
    e.lastX = p.x;
    if (e.stuck > 40 || p.x > worldW - 30) stopVehicle(e);
  }
  function stopVehicle(e) { e.driving = false; e.body.friction = 0.8; e.lastAct = simT; }

  // Defenders fighting back
  function reactions() {
    if (!active) return;
    var group = active.group.filter(function (e) { return !e.dead; });
    defenders().forEach(function (d) {
      var R = d.def.react; if (!R) return;
      var dp = pos(d);
      if (R.type === "shooter") {
        group.forEach(function (a) {
          if (!a.troop || a.shotDown || a.touched || speed(a.body) < 3) return;
          var ap = pos(a);
          if (ap.x < dp.x && dp.x - ap.x < R.range && ap.y > dp.y - R.height) {
            a.shotDown = true;
            var mx = dp.x + (R.muzzle ? R.muzzle.x : -8), my = dp.y + (R.muzzle ? R.muzzle.y : -6);
            tracer(mx, my, ap.x, ap.y); tracer(mx, my + 1, ap.x + 3, ap.y - 2);
            Body.setVelocity(a.body, { x: a.body.velocity.x * 0.25, y: Math.max(a.body.velocity.y, 1) });
            play(R.sound || "shot"); say(R.say || "BANG!", dp.x, dp.y - 18, "#ffd23f");
          }
        });
      } else if (R.type === "sniper") {
        group.forEach(function (a) {
          if (!a.chute || a.sniped) return;
          var ap = pos(a);
          if (Math.hypot(dp.x - ap.x, dp.y - ap.y) < (R.range || 150)) {
            a.snipeAt = a.snipeAt || simT + 900;
            if (simT >= a.snipeAt) { a.sniped = true; tracer(dp.x - 6, dp.y - 6, ap.x, ap.y - 12); sfx.shot(); closeChute(a); say(R.say || "SNIPER!", dp.x, dp.y - 20, "#ffd23f"); }
          }
        });
      } else if (R.type === "antitank") {
        group.forEach(function (a) {
          if (a.type !== "vehicle") return;
          var ap = pos(a);
          if (dp.x > ap.x && dp.x - ap.x < R.range && simT - (d.lastShot || -1e9) > R.every && simT - active.t0 > 900) {
            d.lastShot = simT;
            spawnProj(R.shell, dp.x + R.muzzle.x, dp.y + R.muzzle.y, R.vx, R.vy, { bomb: true });
            muzzle(dp.x + R.muzzle.x + 2, dp.y + R.muzzle.y); sfx.thump();
          }
        });
      } else if (R.type === "claw") {
        group.forEach(function (a) {
          if (a.type !== "vehicle") return;
          var ap = pos(a);
          if (Math.abs(ap.x - dp.x) < (R.range || 60) && simT - (d.lastShot || -1e9) > (R.every || 2500)) {
            d.lastShot = simT; Sleeping.set(a.body, false);
            Body.setVelocity(a.body, { x: -2, y: -(R.lift || 13) });
            a.driving = false; a.lastAct = simT;
            damage(a, R.damage || 2);
            pixelLine(bctx, dp.x, dp.y, ap.x, ap.y, "#3a3546");
            say(R.say || "THE CLAW!", dp.x, dp.y - 20, "#ffd23f"); sfx.whoosh();
          }
        });
      } else if (R.type === "oil") {
        group.forEach(function (a) {
          if (a.type !== "vehicle") return;
          var ap = pos(a);
          if (Math.abs(ap.x - dp.x) < (R.range || 40) && ap.y > dp.y && simT - (d.lastShot || -1e9) > (R.every || 1500)) {
            d.lastShot = simT;
            for (var i = 0; i < 14; i++) part(dp.x + (Math.random() - 0.5) * 10, dp.y + 4, (Math.random() - 0.5) * 0.6, 0.5 + Math.random(), 700, i % 2 ? "#ff8c1a" : "#3a3546", 2, 0.15);
            damage(a, R.damage || 3); sfx.sizzle(); say(R.say || "HOT OIL!", dp.x, dp.y - 16, "#ff8c1a");
          }
        });
      }
    });
  }
  function healDefenders() {
    var healers = aliveReactor("heal"), healed = false;
    healers.forEach(function (h) {
      var R = h.def.react;
      var hurt = defenders().filter(function (d) { return d !== h && d.hp < d.maxHp; })
        .sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; })[0];
      if (!hurt) return;
      hurt.hp = Math.min(hurt.maxHp, hurt.hp + (R.amount || 1)); healed = true;
      var p = pos(hurt);
      for (var i = 0; i < 6; i++) part(p.x + (Math.random() - 0.5) * 10, p.y, 0, -0.4 - Math.random() * 0.4, 700, "#7ad04f", 1, 0);
      var hp = pos(h); say(R.say || "HEALED!", hp.x, hp.y - 22, "#7ad04f");
    });
    if (healed) sfx.heal();
  }

  /* ----------------------------------------------------- launching stuff */
  function spend(key) {
    arsenal[key]--;
    lastTrail = trail; trail = [];
    buildBar();
  }
  function begin(group, plane) {
    camHoldX = null; updateLookButton();
    active = { group: group, lead: group[0] || null, plane: plane || null, t0: simT };
    phase = "active"; updateHint();
  }
  function spawnProj(spec, x, y, vx, vy, extra) {
    // projectiles never hit each other (arrow storms, shotgun volleys, bombs in a line)
    var opts = { density: spec.density || 0.004, friction: spec.round ? 0.5 : 0.4, restitution: spec.bounce || 0.1, frictionAir: 0.002, collisionFilter: { group: -1 } };
    var body = spec.round ? Bodies.circle(x * PH, y * PH, spec.w / 2 * PH, opts) : Bodies.rectangle(x * PH, y * PH, spec.w * PH, spec.h * PH, opts);
    var e = { type: "proj", key: spec.key || "shot", unit: spec, sprite: spec.sprite, w: spec.w, h: spec.h, body: body, center: true,
              faceVel: spec.faceVel !== false && !spec.round };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    addEnt(e);
    if (spec.fuse) e.fuseAt = simT + spec.fuse;
    if (spec.pierce) e.pierce = spec.pierce;
    if (spec.life) e.fizzleAt = simT + spec.life;
    Body.setVelocity(body, { x: vx, y: vy });
    if (spec.spin) Body.setAngularVelocity(body, spec.spin);
    return e;
  }
  function spawnTroop(u, x, y, vx, vy, extra) {
    var body = Bodies.rectangle(x * PH, y * PH, u.w * PH, u.h * PH, { density: u.density, friction: 0.6, restitution: 0.2, frictionAir: 0.002, collisionFilter: { group: -2 } });
    var e = { type: "proj", troop: true, key: u.key, unit: u, sprite: u.sprite, w: u.w, h: u.h, body: body, trail: true };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    addEnt(e);
    Body.setVelocity(body, { x: vx, y: vy }); Body.setAngularVelocity(body, 0.03);
    return e;
  }
  function launchSling(key, vx, vy) {
    var u = UNITS[key]; u.key = key;
    spend(key);
    var e = spawnTroop(u, SLING.x, SLING.y, vx, vy);
    sfx.twang(); begin([e]);
  }
  function launchFire(key, vx, vy) {
    var u = UNITS[key], k = u.speed || 1, group = [];
    u.key = key;
    spend(key);
    var n = u.spread ? u.spread.n : 1, step = u.spread ? u.spread.deg * Math.PI / 180 : 0;
    for (var i = 0; i < n; i++) {
      var a = (i - (n - 1) / 2) * step, c = Math.cos(a), s = Math.sin(a);
      group.push(spawnProj(u, BUNKER.x, BUNKER.y - i, (vx * c - vy * s) * k, (vx * s + vy * c) * k, { trail: i === 0 }));
    }
    muzzle(BUNKER.x + 4, BUNKER.y); play(u.sound || "thump"); begin(group);
  }
  function launchDrive(key) {
    var u = UNITS[key]; u.key = key;
    var opts = { density: u.density, friction: 0, frictionStatic: 0, restitution: 0, frictionAir: 0.01 };
    if (u.boat) opts.collisionFilter = { category: BOAT, mask: 0xFFFFFFFF };
    var body = Bodies.rectangle(18 * PH, (GROUND - u.h / 2 - 0.5) * PH, u.w * PH, u.h * PH, opts);
    Body.setInertia(body, Infinity);
    spend(key);
    var e = addEnt({ type: "vehicle", key: key, unit: u, sprite: u.sprite, w: u.w, h: u.h, body: body, ox: u.ox || 0,
                     hp: u.hp, maxHp: u.hp, driving: true, shots: u.shots || 0, lastAct: -1e9, stuck: 0, lastX: 18 });
    sfx.engine(); begin([e]);
  }
  function callIn(key, tx) {
    var u = UNITS[key];
    spend(key);
    if (u.style === "rain") { callRain(u, tx); return; }
    if (u.style === "mine") { digMine(u, tx); return; }
    var s = sprite(u.sprite), drops = [];
    for (var i = 0; i < u.bombs; i++) drops.push(tx + (i - (u.bombs - 1) / 2) * u.spacing);
    // how far ahead of the target to let go: fly the drop forward with the same drag and gravity the game uses
    var bomb = u.bomb || {}, g = GRAV * gravK * (1 - (bomb.lift || 0)), dvx = u.speed * 0.3 * PH + (u.dropVx || 0), dvy = u.dropVy || 0.5, dx = 0, dy = u.alt * PH;
    for (var k = 0; k < 3000 && dy < (groundAt(tx) - 8) * PH; k++) { dvy += g; dvx *= 0.998; dvy *= 0.998; dx += dvx; dy += dvy; }
    var lead = u.troops ? u.speed * 18 : dx / PH;
    var plane = { unit: u, x: -s.width - 10, y: u.alt, w: s.width, h: s.height, angle: 0, vy: 0, down: false,
                  drops: drops.map(function (d) { return d - lead; }), next: 0 };
    var flak = aliveReactor("flak")[0];
    if (flak && !u.lowLevel) plane.shootAt = Math.max(150, Math.min(plane.drops[0] - 40, pos(flak).x - 190));
    planes.push(plane);
    say(u.say || "INCOMING!", clamp(tx, 60, worldW - 60), 70, "#ffffff");
    sfx.plane(); begin([], plane);
  }
  function callRain(u, tx) {
    // projectiles arrive from the upper left and land around tx
    var spec = u.proj, group = [];
    var top = -30, vx = (u.vx || 2) * PH, vy0 = (u.vy || 1) * PH;
    var h = (groundAt(tx) - 40 - top) * PH;
    var g = GRAV * gravK * (1 - (spec.lift || 0)) || 0.001;
    var t = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h)) / g;
    var lead = vx * t / PH;
    begin(group);
    for (var i = 0; i < u.count; i++) (function (i) {
      scheduled.push({ at: simT + i * (u.every || 70), run: function () {
        var x = tx - lead + (i - (u.count - 1) / 2) * u.gap + (Math.random() - 0.5) * (u.jitter || 6);
        var e = spawnProj(spec, x, top - Math.random() * 10, vx, vy0, { rain: true });
        group.push(e); if (active && !active.lead) active.lead = e;
        if (i === 0) play(u.sound || "volley");
      } });
    })(i);
    say(u.say || "INCOMING!", clamp(tx, 60, worldW - 60), 70, "#ffffff");
  }
  function digMine(u, tx) {
    // tunnelers dig under the target, the ground rumbles, then it goes up from underneath
    var gy = groundAt(tx), dirt = (THEMES[level.theme].left || {}).base || "#7a5634";
    begin([]);
    say(u.say || "DIGGING\u2026", clamp(tx, 60, worldW - 60), gy - 40, "#ffffff");
    for (var k = 0; k < 4; k++) (function (k) {
      scheduled.push({ at: simT + 350 * k, run: function () { shake = Math.max(shake, 1.5 + k); sfx.thud(0.6); debris(tx + (Math.random() - 0.5) * 20, gy - 2, [dirt, "#5a3c22"], 6); } });
    })(k);
    scheduled.push({ at: simT + 1500, run: function () {
      pendingBooms.push({ x: tx, y: gy - 6, boom: u.boom });
      debris(tx, gy - 6, [dirt, "#5a3c22", "#a39b8b"], 40);
      say(u.blast || "KA-BOOM!", clamp(tx, 60, worldW - 60), gy - 50, "#ff8c1a");
    } });
  }
  function updatePlanes() {
    for (var i = planes.length - 1; i >= 0; i--) {
      var p = planes[i], u = p.unit;
      if (p.down) {
        p.vy += 0.06; p.x += u.speed * 0.8; p.y += p.vy; p.angle = Math.min(0.9, p.angle + 0.02);
        if (Math.round(simT / STEP) % 2 === 0) smoke(p.x + p.w / 2, p.y + p.h / 2);
        if (p.y + p.h / 2 >= groundAt(p.x + p.w / 2)) {
          pendingBooms.push({ x: p.x + p.w / 2, y: groundAt(p.x + p.w / 2) - 4, boom: { r: 16, p: 2 } });
          planes.splice(i, 1);
        }
        continue;
      }
      p.x += u.speed;
      if (p.shootAt != null && p.x + p.w / 2 >= p.shootAt) {
        var flak = aliveReactor("flak")[0];
        if (flak) {
          p.down = true;
          var fp = pos(flak), R = flak.def.react;
          for (var k = 0; k < 5; k++) puff(p.x + p.w / 2 + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 16);
          muzzle(fp.x + R.muzzle.x, fp.y + R.muzzle.y); sfx.boom(1); say(R.say || "SHOT DOWN!", clamp(p.x + p.w / 2, 80, worldW - 80), p.y - 10, "#ff8c1a");
          continue;
        }
        p.shootAt = null;
      }
      while (p.next < p.drops.length && p.x + p.w / 2 >= p.drops[p.next]) {
        if (u.troops) {
          // paratroopers jump with their chutes already open, then land on whoever is below
          var tu = UNITS[u.troops]; tu.key = u.troops;
          var jumper = spawnTroop(tu, p.x + p.w / 2, p.y + p.h, u.speed * 0.4 * PH, 0.5);
          jumper.usedTap = true; openChute(jumper);
          if (active && active.plane === p) active.group.push(jumper);
        } else spawnProj(u.bomb, p.x + p.w / 2, p.y + p.h - 2, u.speed * 0.3 * PH + (u.dropVx || 0), u.dropVy || 0.5, { bomb: true });
        p.next++;
      }
      if (p.x > worldW + 120) planes.splice(i, 1);
    }
  }

  /* --------------------------------------------------------- special moves */
  function special() {
    var a = active && active.lead;
    if (!a || a.dead) return;
    var u = a.unit, b = a.body, p = pos(a);
    switch (u.tap) {
      case "shout":
        if (!a.usedTap) { a.usedTap = true; say(u.shout || "CHARGE!", p.x, p.y - 14, "#ffffff"); sfx.shout(); }
        break;
      case "chute":
        if (!a.usedTap && !a.touched) { a.usedTap = true; openChute(a); }
        break;
      case "detonate":
        if (!a.spent) { a.spent = true; pendingBooms.push(a); }
        break;
      case "pound":
        if (!a.usedTap && !a.touched) {
          a.usedTap = true; Body.setVelocity(b, { x: b.velocity.x * 0.15, y: 17 }); Body.setAngle(b, 0); Body.setAngularVelocity(b, 0);
          say(u.shout || "GROUND POUND!", p.x, p.y - 16, "#ffd23f"); sfx.shout();
        }
        break;
      case "dash":
        if (!a.usedTap && !a.touched) {
          a.usedTap = true; a.dashing = true; a.pierce = u.pierce || 0;
          var dir = b.velocity.x >= 0 ? 1 : -1;
          Body.setVelocity(b, { x: dir * Math.max(Math.abs(b.velocity.x) * 1.6, u.dash || 14), y: Math.min(b.velocity.y, 1) });
          say(u.shout || "CHARGE!", p.x, p.y - 14, "#ffd23f"); sfx.whoosh(); sfx.shout();
        }
        break;
      case "split":
        if (!a.usedTap && !a.touched) {
          a.usedTap = true;
          var su = UNITS[u.splitInto] || u; su.key = u.splitInto;
          [-0.22, 0.22].forEach(function (ang) {
            var c = Math.cos(ang), s = Math.sin(ang), v = b.velocity;
            active.group.push(spawnTroop(su, p.x, p.y, v.x * c - v.y * s, v.x * s + v.y * c));
          });
          poof(p.x, p.y, 8); say(u.shout || "FORM UP!", p.x, p.y - 16, "#ffd23f"); sfx.shout();
        }
        break;
      case "boost":
        // a jetpack burst up and forward; a couple of them per flight
        if ((a.boosts || 0) < (u.boosts || 2) && !a.touched) {
          a.boosts = (a.boosts || 0) + 1; a.usedTap = true;
          Body.setVelocity(b, { x: Math.max(b.velocity.x, u.boostX || 7), y: -(u.boost || 9) });
          for (var f = 0; f < 10; f++) part(p.x - 4 + Math.random() * 3, p.y + 8, -0.5 - Math.random(), 0.8 + Math.random(), 400, f % 2 ? "#ff8c1a" : "#ffd23f", 2, 0);
          say(u.shout || "WHOOSH!", p.x, p.y - 14, "#ffd23f"); sfx.whoosh();
        }
        break;
      case "jump":
        if (Math.abs(b.velocity.y) < 0.6 && simT - (a.lastJump || -1e9) > 500) {
          a.lastJump = simT; Sleeping.set(b, false); Body.setVelocity(b, { x: b.velocity.x, y: -(u.jump || 9) });
          if (!a.driving) { a.driving = true; a.stuck = 0; b.friction = 0; }
        }
        break;
      case "shoot":
        if (a.shots > 0 && simT - a.lastAct > 650) {
          a.shots--; a.lastAct = simT;
          spawnProj(u.shell, p.x + u.gun.x, p.y + u.gun.y, u.gun.vx, u.gun.vy, { bomb: true });
          muzzle(p.x + u.gun.x - 1, p.y + u.gun.y); sfx.thump(); shake = Math.max(shake, 2);
          Body.setVelocity(b, { x: b.velocity.x - 1.5, y: b.velocity.y });
        }
        break;
      case "ram":
        if (simT - a.lastAct > 700) {
          a.lastAct = simT; a.ramUntil = simT + 600; Sleeping.set(b, false);
          if (!a.driving) { a.driving = true; a.stuck = 0; b.friction = 0; }
          Body.setVelocity(b, { x: (u.ramSpeed || 2.6) * PH, y: b.velocity.y });
          say(u.shout || "RAM!", p.x, p.y - 20, "#ffd23f"); sfx.whoosh();
        }
        break;
      case "unload":
        if (!a.unloaded) {
          a.unloaded = true; a.lastAct = simT;
          var tu = UNITS[u.unload.unit]; tu.key = u.unload.unit;
          for (var i = 0; i < u.unload.count; i++) {
            active.group.push(spawnTroop(tu, p.x + a.w / 2 - 6, p.y - a.h / 2 - 4 - i * 2, (u.unload.vx || 4.5) + i * (u.unload.spread || 1.6), (u.unload.vy || -7) - i * 0.6, { melee: true }));
          }
          say(u.shout || "OVER THE WALL!", p.x, p.y - a.h / 2 - 12, "#ffd23f"); sfx.shout();
        }
        break;
      case "sharpshoot":
        if (!a.usedTap) {
          // picks off the nearest defenders one after another
          a.usedTap = true;
          var shots = defenders().map(function (d) { var q = pos(d); return { d: d, dist: Math.hypot(q.x - p.x, q.y - p.y) }; })
            .filter(function (t) { return t.dist < (u.reach || 170); })
            .sort(function (x1, x2) { return x1.dist - x2.dist; }).slice(0, u.shots || 3);
          shots.forEach(function (t, i) {
            scheduled.push({ at: simT + 120 + i * 200, run: function () {
              if (t.d.dead || a.dead) return;
              var q = pos(t.d), ap = pos(a);
              tracer(ap.x, ap.y - 4, q.x, q.y - 6); sfx.shot();
              damage(t.d, (u.shotDmg || 2.5) * (t.d.key === u.best ? 2 : 1));
            } });
          });
          say(u.shout || "SHARPSHOOTER!", p.x, p.y - 16, "#ffd23f");
        }
        break;
      case "blowup":
        if (!a.spent) { a.spent = true; a.dead = true; pendingBooms.push({ x: p.x, y: p.y, boom: u.boom, fire: true }); say("KA-BOOM!", p.x, p.y - 20, "#ff8c1a"); }
        break;
    }
    updateHint();
  }
  function openChute(e) {
    var b = e.body;
    e.chute = true; e.sprite = e.unit.chuteSprite || e.sprite; e.inertia0 = b.inertia;
    Body.setAngle(b, 0); Body.setAngularVelocity(b, 0); Body.setInertia(b, Infinity);
    b.frictionAir = 0.09;
    Body.setVelocity(b, { x: b.velocity.x * 0.6, y: Math.min(b.velocity.y, 0.5) });
    sfx.chute();
  }
  function closeChute(e) {
    var b = e.body;
    e.chute = false; e.sprite = e.unit.sprite; b.frictionAir = 0.002;
    if (e.inertia0) Body.setInertia(b, e.inertia0);
  }
  function melee(e) {
    var p = pos(e), hit = false;
    defenders().forEach(function (d) {
      var q = pos(d);
      if (Math.abs(q.x - p.x) < 28 && q.y - p.y > -20 && q.y - p.y < 44) {
        damage(d, d.key === e.unit.best ? 8 : 3); hit = true;
        say(e.unit.melee || "GOTCHA!", q.x, q.y - 20, "#ffffff");
      }
    });
    if (hit) sfx.thwack();
  }

  /* --------------------------------------------------------- turn flow */
  function busy(e) {
    if (e.dead) return false;
    if (e.type === "vehicle") {
      var calm = !e.driving && speed(e.body) < 0.3 && simT - e.lastAct > 1300;
      e.calm = calm ? (e.calm || 0) + 1 : 0;
      return e.calm < 50;
    }
    if (e.chute) return true;
    e.calm = (simT - e.born > 400 && speed(e.body) < 0.4) ? (e.calm || 0) + 1 : 0;
    return e.calm < 40;
  }
  function checkActive() {
    if (!active) return;
    var t = simT - active.t0;
    var planeBusy = active.plane && planes.indexOf(active.plane) >= 0;
    var shells = ents.some(function (e) { return e.bomb && !e.dead; });
    var waiting = scheduled.length > 0;
    var members = active.group.filter(busy).length > 0;
    if ((!planeBusy && !shells && !waiting && !members) || t > 16000) {
      active = null; phase = "settling"; settleStill = 0; settleStart = simT; updateHint();
    }
  }
  function checkSettle() {
    if (phase !== "settling") return;
    var moving = pendingBooms.length > 0 || planes.length > 0 || ents.some(function (e) {
      return !e.dead && !e.body.isStatic && !e.body.isSleeping && speed(e.body) > 0.25;
    });
    settleStill = moving ? 0 : settleStill + 1;
    if (settleStill > 30 || simT - settleStart > 4500) finishTurn();
  }
  function finishTurn() {
    ents.forEach(function (e) {
      if (!e.dead && (e.type === "proj" || e.type === "vehicle")) { var p = pos(e); poof(p.x, p.y, 8); e.dead = true; }
    });
    if (winAt || defendersLeft() === 0) { win(); return; }
    if (!firstAvailable()) { lose(); return; }
    healDefenders();
    if (!arsenal[selected]) selected = firstAvailable();
    newWind(); phase = "ready"; buildBar(); updateHud(); updateHint();
  }
  function bestKey() { return "angrydudes.best." + pack.id + "." + level.id; }
  function lossKey() { return "angrydudes.losses." + pack.id + "." + level.id; }
  function win() {
    if (mode !== "play") return;
    mode = "result"; phase = "over";
    var left = 0; Object.keys(arsenal).forEach(function (k) { left += arsenal[k]; });
    var bonus = left * BONUS; score += bonus;
    var stars = 1 + (score >= starLine[0] ? 1 : 0) + (score >= starLine[1] ? 1 : 0);
    store(lossKey(), 0);
    var best = store(bestKey()) || { score: 0, stars: 0 };
    if (score > best.score || stars > best.stars) store(bestKey(), { score: Math.max(score, best.score), stars: Math.max(stars, best.stars) });
    if (campaign) campaignWin(stars);
    sfx.fanfare(); updateHud();
    showResult(true, stars, bonus, left);
  }
  function lose() {
    if (mode !== "play") return;
    mode = "result"; phase = "over"; sfx.sad();
    store(lossKey(), (store(lossKey()) || 0) + 1);
    showResult(false, 0, 0, 0);
  }

  /* ------------------------------------------------------------ effects */
  function addScore(n, x, y) { score += n; say(fmt(n), x, y, "#ffd23f"); updateHud(); }
  function say(text, x, y, color, life) { popups.push({ text: text, x: x, y: y, t: simT, color: color, life: life || 1100 }); }
  function part(x, y, vx, vy, life, color, size, g) { particles.push({ x: x, y: y, vx: vx, vy: vy, life: life, t: simT, color: color, size: size || 1, g: g == null ? 0.12 : g }); }
  function blast(x, y, r, fire) {
    particles.push({ blast: true, x: x, y: y, r: r, t: simT, life: 360 });
    for (var i = 0; i < r; i++) {
      var a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * r / 10;
      part(x, y, Math.cos(a) * s, Math.sin(a) * s - 1, 400 + Math.random() * 400, Math.random() < 0.5 ? "#ff8c1a" : "#ffd23f", 1, 0.06);
    }
    for (var j = 0; j < 6; j++) smoke(x + (Math.random() - 0.5) * r * 0.6, y + (Math.random() - 0.5) * r * 0.4);
    if (fire) for (var k = 0; k < 10; k++) part(x + (Math.random() - 0.5) * r, y, (Math.random() - 0.5) * 0.4, -0.3 - Math.random() * 0.5, 900, k % 2 ? "#ff6a00" : "#ffd23f", 2, -0.005);
  }
  function smoke(x, y) { particles.push({ smoke: true, x: x, y: y, vx: (Math.random() - 0.5) * 0.3, vy: -0.25 - Math.random() * 0.3, t: simT, life: 900 + Math.random() * 500, size: 2 + Math.random() * 3 }); }
  function puff(x, y) { particles.push({ smoke: true, dark: true, x: x, y: y, vx: 0, vy: -0.05, t: simT, life: 700, size: 4 }); }
  function poof(x, y, n) { for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2; part(x, y, Math.cos(a) * 1.2, Math.sin(a) * 1.2 - 0.5, 500, i % 2 ? "#ffffff" : "#d8dde4", 2, 0.02); } }
  function debris(x, y, colors, n) { for (var i = 0; i < Math.min(40, n); i++) { var a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2.2; part(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, Math.cos(a) * s, Math.sin(a) * s - 1.2, 700 + Math.random() * 500, colors[i % colors.length], Math.random() < 0.3 ? 2 : 1); } }
  function muzzle(x, y) { particles.push({ blast: true, x: x, y: y, r: 7, t: simT, life: 160 }); }
  function tracer(x0, y0, x1, y1) { tracers.push({ x0: x0, y0: y0, x1: x1, y1: y1, t: simT }); }
  function updateParticles() {
    particles = particles.filter(function (p) {
      if (simT - p.t > p.life) return false;
      if (!p.blast) { p.x += p.vx; p.y += p.vy; if (p.g) p.vy += p.g; if (!p.smoke && p.y > groundAt(p.x)) { p.y = groundAt(p.x); p.vx *= 0.5; p.vy *= -0.3; } }
      return true;
    });
    popups = popups.filter(function (p) { return simT - p.t < p.life; });
    tracers = tracers.filter(function (t) { return simT - t.t < 160; });
  }

  /* ------------------------------------------------------------- canvas */
  var screenC = $("screen"), sctx = screenC.getContext("2d");
  var buf = document.createElement("canvas"), bctx = buf.getContext("2d");
  var bg = document.createElement("canvas");
  var scaleDev = 1, OX = 0, OY = 0, bufW = 0, bufH = 0, bgPad = 0;
  var camX = 0, camMax = 0, camHoldX = null, camHoldUntil = 0, gesture = null;

  function resize() {
    var dpr = window.devicePixelRatio || 1, W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight);
    screenC.width = Math.round(W * dpr); screenC.height = Math.round(H * dpr);
    var top = $("hud").offsetHeight, bottom = $("dock").offsetHeight;
    if (mode !== "play") { top = 0; bottom = 0; }
    var availH = Math.max(140, H - top - bottom);
    var s = Math.min(W / VIEW_W, availH / (WORLD_H - FIT_TOP));
    scaleDev = s * dpr;
    bufW = Math.ceil(screenC.width / scaleDev); bufH = Math.ceil(screenC.height / scaleDev);
    buf.width = bufW; buf.height = bufH;
    OY = Math.floor((top + availH) * dpr / scaleDev - WORLD_H);
    camMax = Math.max(0, worldW - bufW);
    camX = clamp(camX, 0, camMax);
    placeCamera();
    if (level) buildBackground();
    updateLookButton(); fitBar();
  }

  /* ------------------------------------------------------------- camera */
  // Wide battlefields scroll: the camera starts on the fort, sweeps back to the launcher,
  // follows whatever is flying, and the player can drag the right side of the screen to look around.
  function placeCamera() { OX = camMax > 0 ? -Math.round(camX) : Math.floor((bufW - worldW) / 2); }
  function cameraTarget() {
    if (camHoldX != null && simT < camHoldUntil) return camHoldX;
    if (phase === "active" && active) {
      var far = -Infinity;
      active.group.forEach(function (e) { if (!e.dead) far = Math.max(far, pos(e).x); });
      if (active.plane && planes.indexOf(active.plane) >= 0) far = Math.max(far, active.plane.x + active.plane.w / 2);
      ents.forEach(function (e) { if (e.bomb && !e.dead) far = Math.max(far, pos(e).x); });
      return far > -Infinity ? far - bufW * 0.55 : camX;
    }
    if (phase === "settling") return camX;
    return 0;
  }
  function updateCamera() {
    if (camMax <= 0) { camX = 0; return; }
    if (camHoldX != null && camHoldUntil !== Infinity && simT >= camHoldUntil) { camHoldX = null; updateLookButton(); }
    var t = clamp(cameraTarget(), 0, camMax);
    camX += (t - camX) * (introPan ? 0.035 : 0.07);
    if (Math.abs(t - camX) < 0.3) { camX = t; if (simT >= camHoldUntil) introPan = false; }
  }
  function lookAtFort(on) {
    if (camMax <= 0) return;
    camHoldX = on ? camMax : null; camHoldUntil = on ? Infinity : 0;
    updateLookButton();
  }
  function updateLookButton() {
    var b = $("btn-look"); if (!b) return;
    b.hidden = !(mode === "play" && camMax > 0);
    var v = camHoldX != null && camHoldX > camMax / 2 ? "Back to launcher" : "See fort";
    if (b.textContent !== v) b.textContent = v;
  }
  function disc(c, cx, cy, r, color) {
    c.fillStyle = color;
    for (var dy = -r; dy <= r; dy++) { var w = Math.round(Math.sqrt(r * r - dy * dy)); c.fillRect(cx - w, cy + dy, w * 2, 1); }
  }
  function cloud(c, x, y, big, color) {
    c.fillStyle = color || "#ffffff";
    if (big) { c.fillRect(x + 5, y - 2, 5, 1); c.fillRect(x + 3, y - 1, 9, 1); c.fillRect(x + 1, y, 16, 2); c.fillRect(x, y + 2, 20, 2); }
    else { c.fillRect(x + 3, y - 1, 4, 1); c.fillRect(x + 1, y, 9, 1); c.fillRect(x, y + 1, 12, 2); }
  }
  function groundBand(c, x0, w, gy, h, g, seed) {
    var r = rng(seed), x, i;
    c.fillStyle = g.base; c.fillRect(x0, gy, w, h - gy);
    c.fillStyle = g.top; c.fillRect(x0, gy, w, 3);
    c.fillStyle = g.hi; c.fillRect(x0, gy, w, 1);
    c.fillStyle = g.top;
    for (x = x0; x < x0 + w; x += 2 + Math.floor(r() * 5)) c.fillRect(x, gy - 1, 1, 1);
    for (x = x0; x < x0 + w; x += 2) if (r() < 0.55) c.fillRect(x, gy + 3, 1, 1);
    c.fillStyle = g.lo;
    for (i = 0; i < w * (h - gy) / 24; i++) c.fillRect(x0 + Math.floor(r() * w), gy + 5 + Math.floor(r() * Math.max(1, h - gy - 5)), 2, 1);
  }
  function tree(c, x, base, kind, col) {
    if (kind === "palm") {
      c.fillStyle = col || "#7a5634"; c.fillRect(x, base - 10, 1, 10); c.fillRect(x + 1, base - 6, 1, 6);
      c.fillStyle = "#3f8a3a"; c.fillRect(x - 4, base - 11, 9, 1); c.fillRect(x - 5, base - 10, 2, 1); c.fillRect(x + 4, base - 10, 2, 1); c.fillRect(x - 2, base - 12, 5, 1);
      return;
    }
    if (kind === "stump") {
      // shell-blasted tree stumps of the Western Front
      c.fillStyle = col || "#4a3b2a"; c.fillRect(x, base - 9, 2, 9); c.fillRect(x - 2, base - 7, 2, 1); c.fillRect(x + 2, base - 5, 2, 1); c.fillRect(x + 1, base - 10, 1, 1);
    } else if (kind === "pine") {
      c.fillStyle = col || "#56656b"; c.fillRect(x, base - 7, 1, 7); c.fillRect(x - 1, base - 4, 3, 4); c.fillRect(x - 2, base - 1, 5, 2);
    } else {
      c.fillStyle = "#5e3a1d"; c.fillRect(x, base - 4, 1, 4);
      c.fillStyle = col || "#4f7f3a"; c.fillRect(x - 3, base - 9, 7, 5); c.fillRect(x - 2, base - 10, 5, 1); c.fillRect(x - 2, base - 4, 5, 1);
    }
  }
  function buildBackground() {
    // painted once for the whole battlefield plus a screen's width of margin on each side
    bgPad = bufW;
    bg.width = worldW + bgPad * 2; bg.height = bufH;
    var BX = bgPad, BW = bg.width;
    var c = bg.getContext("2d"), th = THEMES[level.theme], gy = OY + GROUND, i, x, y;
    c.imageSmoothingEnabled = false;
    var bh = gy / th.sky.length;
    th.sky.forEach(function (col, k) { c.fillStyle = col; c.fillRect(0, Math.round(k * bh), BW, Math.ceil(bh) + 1); });
    for (i = 1; i < th.sky.length; i++) {
      y = Math.round(i * bh); c.fillStyle = th.sky[i - 1];
      for (x = 0; x < BW; x += 2) c.fillRect(x, y, 1, 1);
      for (x = 1; x < BW; x += 4) c.fillRect(x, y + 1, 1, 1);
    }
    var sr = rng(levelIndex + 41);
    if (th.night) {
      c.fillStyle = "#fff6c8";
      for (i = 0; i < BW * gy / 160; i++) { var sx = Math.floor(sr() * BW), sy = Math.floor(sr() * gy * 0.7); c.fillRect(sx, sy, 1, 1); }
      if (th.planet) {
        // a planet hanging in space: [ocean or body, land or bands, ring]
        var px0 = BX + worldW - 130, py0 = OY + 52, pl = th.planet, pr = rng(9);
        if (pl[2]) { c.fillStyle = pl[2]; c.fillRect(px0 - 34, py0 - 1, 68, 2); }
        disc(c, px0, py0, 20, pl[0]);
        c.fillStyle = pl[1];
        for (i = 0; i < 26; i++) c.fillRect(px0 - 16 + Math.floor(pr() * 28), py0 - 15 + Math.floor(pr() * 28), 3 + Math.floor(pr() * 5), 2);
        if (pl[2]) { c.fillStyle = pl[2]; c.fillRect(px0 - 34, py0 + 1, 14, 1); c.fillRect(px0 + 20, py0 + 1, 14, 1); }
      } else {
        disc(c, BX + worldW - 100, OY + 40, 9, "#f3efd2"); c.fillStyle = th.sky[1]; c.fillRect(BX + worldW - 104, OY + 36, 3, 2); c.fillRect(BX + worldW - 97, OY + 44, 2, 2);
      }
    } else if (th.sun) disc(c, BX + worldW - 80, OY + 44, 10, th.sun);
    if (th.clouds) { var r = rng(levelIndex + 3); for (i = 0; i < Math.ceil(BW / 120); i++) cloud(c, Math.floor(i * 120 + r() * 60), OY + 20 + Math.floor(r() * 60), r() < 0.5, th.cloud); }
    var hr = rng(17);
    [[th.hills[0], 34, 10, 47, 19, 0.3], [th.hills[1], 16, 6, 31, 13, 1.7]].forEach(function (h, k) {
      c.fillStyle = h[0];
      for (x = 0; x < BW; x += 2) {
        var hh = Math.round((h[1] + h[2] * Math.sin((x - BX) / h[3] + h[5]) + h[2] * 0.5 * Math.sin((x - BX) / h[4] + h[5] * 2)) / 2) * 2;
        c.fillRect(x, gy - hh, 2, hh);
        if (th.trees && k === 0 && hr() < 0.08) { tree(c, x, gy - hh + 1, th.trees, th.treeColor); c.fillStyle = h[0]; }
      }
    });
    var split = BX + (level.cliff ? level.cliff.x : (th.split || 9999));
    groundBand(c, 0, clamp(split, 0, BW), gy, bufH, th.left, 3);
    if (split < BW) groundBand(c, Math.max(0, split), BW - Math.max(0, split), gy, bufH, th.right, 11);
    if (level.cliff) {
      var cx = BX + level.cliff.x, top = gy - level.cliff.h, rr = rng(5), rock = th.rock || ["#8d8a82", "#6f6c66", "#aaa79f"];
      c.fillStyle = rock[0]; c.fillRect(cx, top, BW - cx, level.cliff.h);
      c.fillStyle = rock[1];
      for (y = top + 5; y < gy; y += 6) for (x = cx; x < BW; x += 4) if (rr() < 0.6) c.fillRect(x, y, 3 + Math.floor(rr() * 4), 1);
      c.fillStyle = rock[2]; c.fillRect(cx, top, 2, level.cliff.h);
      c.fillStyle = OUTLINE; c.fillRect(cx - 1, top, 1, level.cliff.h);
      groundBand(c, cx, BW - cx, top, top + 4, th.right, 23);
    }
    var tc = th.trench || { cut: "#3b2a1c", plank: "#6b4a2b", floor: "#8a6a45", slat: "#5e3a1d" };
    (level.craters || []).forEach(function (k) {
      var kx = BX + k.x, r = k.r || 12;
      for (var dy = 0; dy <= r / 2; dy++) { var w = Math.round(Math.sqrt(1 - Math.pow(dy / (r / 2 + 0.5), 2)) * r); c.fillStyle = dy === 0 ? th.left.lo : tc.cut; c.fillRect(kx - w, gy + dy, w * 2, 1); }
      c.fillStyle = th.left.hi; c.fillRect(kx - r - 2, gy - 1, 3, 1); c.fillRect(kx + r - 1, gy - 1, 3, 1);
    });
    (level.trenches || []).forEach(function (t) {
      var tx = BX + t.x;
      if (t.water) {
        // a river or moat: dark banks, water up to just below ground level, a few wave crests
        c.fillStyle = tc.cut; c.fillRect(tx, gy, t.w, t.d);
        c.fillStyle = th.water || "#3f78b5"; c.fillRect(tx, gy + 4, t.w, t.d - 4);
        c.fillStyle = th.waterHi || "#7fb8e8"; c.fillRect(tx, gy + 4, t.w, 1);
        for (x = tx + 3; x < tx + t.w - 3; x += 9) c.fillRect(x, gy + 7 + ((x / 9) % 2), 4, 1);
        return;
      }
      c.fillStyle = tc.cut; c.fillRect(tx, gy, t.w, t.d);
      c.fillStyle = tc.plank;
      for (y = gy; y < gy + t.d; y += 4) { c.fillRect(tx, y, 2, 3); c.fillRect(tx + t.w - 2, y, 2, 3); }
      c.fillStyle = "rgba(0,0,0,0.3)"; c.fillRect(tx + 2, gy, t.w - 4, 4);
      c.fillStyle = tc.floor; c.fillRect(tx, gy + t.d - 2, t.w, 2);
      c.fillStyle = tc.slat; for (x = tx; x < tx + t.w; x += 3) c.fillRect(x, gy + t.d - 2, 1, 2);
    });
    c.save(); c.translate(BX, OY);
    for (i = 0; i < 3; i++) c.drawImage(sprite(pack.props.bunker), BUNKER_X + i * 16, GROUND - 16);
    c.drawImage(sprite(pack.props.sling || "slingshot"), SLING_X, GROUND - 24);
    c.restore();
  }

  function pixelLine(c, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    c.fillStyle = color;
    for (var n = 0; n < 400; n++) {
      c.fillRect(x0, y0, 1, 2);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function pixelText(c, text, x, y, color) {
    c.font = '8px "Press Start 2P", monospace'; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = OUTLINE;
    c.fillText(text, x - 1, y); c.fillText(text, x + 1, y); c.fillText(text, x, y - 1); c.fillText(text, x, y + 1); c.fillText(text, x + 1, y + 1);
    c.fillStyle = color; c.fillText(text, x, y);
  }
  function drawEnt(c, e) {
    var b = e.body, s = sprite(e.sprite), x = b.position.x / PH, y = b.position.y / PH, dx, dy;
    if (e.def && e.def.float) pixelLine(c, x, y + e.h / 2, x - 6, groundAt(x), "#3a3546");
    c.save(); c.translate(Math.round(x), Math.round(y)); if (b.angle) c.rotate(b.angle);
    if (e.stuckAt) c.globalAlpha = Math.max(0, 1 - (simT - e.stuckAt) / 700);
    if (e.tile) {
      // a slab is one sprite tile repeated; `caps` swaps in end pieces, like a ship's bow and stern
      var caps = e.def && e.def.caps;
      for (var tx = -e.w / 2; tx < e.w / 2; tx += 16) {
        var ts = caps && tx === -e.w / 2 ? sprite(caps[0]) : caps && tx + 16 >= e.w / 2 ? sprite(caps[1]) : s;
        c.drawImage(ts, 0, 0, 16, e.h, tx, -e.h / 2, 16, e.h);
      }
      if (!caps) { c.fillStyle = OUTLINE; c.fillRect(-e.w / 2, e.h / 2 - 1, e.w, 1); c.fillRect(-e.w / 2, -e.h / 2, 1, e.h); c.fillRect(e.w / 2 - 1, -e.h / 2, 1, e.h); }
      if (e.hp < e.maxHp * 0.6) for (tx = -e.w / 2; tx < e.w / 2; tx += 32) c.drawImage(crack, 0, 4, 16, 8, tx + 6, -e.h / 2, 16, 8);
    } else {
      if (e.center) { dx = -s.width / 2; dy = -s.height / 2; } else { dx = -s.width / 2 + (e.ox || 0); dy = e.h / 2 - s.height; }
      c.drawImage(s, Math.round(dx), Math.round(dy));
      if (e.flash > simT) { c.globalAlpha = 0.75; c.drawImage(whiteSprite(e.sprite), Math.round(dx), Math.round(dy)); }
      if (e.type === "block" && e.hp < e.maxHp * 0.6) c.drawImage(crack, -8, -8, 16, 16);
    }
    c.restore();
    if ((e.type === "defender" || e.type === "vehicle") && e.hp < e.maxHp && e.hp > 0) {
      var top = Math.round(y - e.h / 2 - (s.height - e.h) - 5), w = 14, f = Math.max(0, e.hp / e.maxHp);
      c.fillStyle = OUTLINE; c.fillRect(Math.round(x - w / 2) - 1, top - 1, w + 2, 4);
      c.fillStyle = "#5b1d1d"; c.fillRect(Math.round(x - w / 2), top, w, 2);
      c.fillStyle = f > 0.5 ? "#7ad04f" : f > 0.25 ? "#ffd23f" : "#e0412c"; c.fillRect(Math.round(x - w / 2), top, Math.max(1, Math.round(w * f)), 2);
    }
  }
  // A light dot with a dark rim reads against day skies, night skies and snow alike.
  function dot(c, x, y, s, fill) {
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = OUTLINE; c.fillRect(x - 1, y - 1, s + 2, s + 2);
    c.fillStyle = fill; c.fillRect(x, y, s, s);
  }
  function previewDots(c, x, y, vx, vy, lift, steps) {
    var px = x * PH, py = y * PH;
    for (var i = 1; i <= steps; i++) {
      vy += GRAV * gravK * (1 - (lift || 0)); vx *= 0.998; vy *= 0.998; px += vx; py += vy;
      if (i % 4 === 0) dot(c, px / PH, py / PH, 2, "#ffffff");
    }
  }
  function pullVector() {
    if (!aim) return { x: 0, y: 0 };
    if (aim.kb) { var r = kb.ang * Math.PI / 180; return { x: -Math.cos(r) * kb.pow * MAX_PULL, y: Math.sin(r) * kb.pow * MAX_PULL }; }
    var k = MAX_PULL / PULL_CSS, x = (aim.cx - aim.sx) * k, y = (aim.cy - aim.sy) * k, len = Math.hypot(x, y);
    if (len > MAX_PULL) { x *= MAX_PULL / len; y *= MAX_PULL / len; }
    return { x: x, y: y };
  }
  function drawWeather(c, th) {
    var i;
    if (th.weather === "snow") {
      c.fillStyle = "#ffffff";
      for (i = 0; i < 90; i++) {
        var fx = ((i * 97 + simT * (0.012 + (i % 5) * 0.003)) % (bufW + 20)) - OX - 10;
        var fy = ((i * 53 + simT * (0.02 + (i % 7) * 0.004)) % (bufH + 10)) - OY - 5;
        c.fillRect(Math.round(fx + Math.sin(simT / 600 + i) * 3), Math.round(fy), 1, 1);
      }
    } else if (th.weather === "rain") {
      c.fillStyle = "rgba(200,215,235,0.55)";
      for (i = 0; i < 120; i++) {
        var rx = ((i * 131 + simT * 0.09) % (bufW + 40)) - OX - 20;
        var ry = ((i * 71 + simT * 0.32) % (bufH + 20)) - OY - 10;
        c.fillRect(Math.round(rx), Math.round(ry), 1, 3); c.fillRect(Math.round(rx) + 1, Math.round(ry) + 3, 1, 2);
      }
    } else if (th.weather === "fireflies") {
      for (i = 0; i < 18; i++) {
        var gx = (i * 151) % worldW, gyy = 180 + (i * 37) % 80;
        var on = Math.sin(simT / 400 + i * 1.7) > 0.3;
        if (on) { c.fillStyle = "#e9ff8a"; c.fillRect(Math.round(gx + Math.sin(simT / 900 + i) * 6), Math.round(gyy + Math.cos(simT / 700 + i) * 4), 1, 1); }
      }
    }
  }

  function draw() {
    if (!level || !bufW || !bufH || !bg.width) return;
    var c = bctx, th = THEMES[level.theme], i;
    var sx = shake ? Math.round((Math.random() - 0.5) * shake) : 0, sy = shake ? Math.round((Math.random() - 0.5) * shake) : 0;
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.globalAlpha = 1;
    c.fillStyle = th.sky[0]; c.fillRect(0, 0, bufW, bufH);
    placeCamera();
    c.drawImage(bg, OX - bgPad + sx, sy);
    c.setTransform(1, 0, 0, 1, OX + sx, OY + sy);

    // last shot's trail stays faintly so you can adjust; the current shot's trail is bold
    c.globalAlpha = 0.55;
    lastTrail.forEach(function (p, k) { if (k % 3 === 0) dot(c, p.x, p.y, 1, "#ffffff"); });
    c.globalAlpha = 1;
    trail.forEach(function (p, k) { if (k % 2 === 0) dot(c, p.x, p.y, 2, "#ffffff"); });

    // wind pennant on the battlefield
    var wx = 200, wy = GROUND - 26, pc = pack.props.pennant || ["#e0412c", "#ffffff"];
    c.fillStyle = "#646d7b"; c.fillRect(wx, wy, 1, 26);
    var len = 3 + Math.abs(wind) * 4, dir = wind >= 0 ? 1 : -1;
    for (i = 0; i < len; i++) { c.fillStyle = Math.floor(i / 3) % 2 ? pc[1] : pc[0]; c.fillRect(wx + dir * (i + 1), wy + (wind === 0 ? i : 0), 1, wind === 0 ? 1 : 3); }

    // whoever is working the bunker for the current (or next) weapon
    var gk = selected && UNITS[selected].kind === "fire" ? selected : ORDER.filter(function (k) { return UNITS[k].kind === "fire" && arsenal[k] > 0; })[0];
    if (gk) { var gs = sprite(UNITS[gk].gunner); c.drawImage(gs, Math.round(BUNKER_X + 24 - gs.width / 2), GROUND - 16 - gs.height); }

    var slingTroop = mode === "play" && (phase === "ready" || phase === "aiming") && selected && UNITS[selected].kind === "sling";
    var pull = phase === "aiming" ? pullVector() : { x: 0, y: 0 };
    var tx = SLING.x + pull.x, ty = SLING.y + pull.y;
    if (slingTroop) pixelLine(c, 123, 248, tx + 3, ty, "#3d2414");

    var order = { block: 0, defender: 1, vehicle: 2, proj: 3 };
    ents.slice().sort(function (a, b) { return order[a.type] - order[b.type]; }).forEach(function (e) { drawEnt(c, e); });

    if (slingTroop) {
      var ts = sprite(UNITS[selected].sprite);
      c.drawImage(ts, Math.round(tx - ts.width / 2), Math.round(ty - ts.height / 2));
      pixelLine(c, 112, 248, tx - 3, ty, "#5e3a1d");
    }
    if (phase === "aiming" && (pull.x || pull.y)) {
      var u = UNITS[selected], v = { x: -pull.x / MAX_PULL * topSpeed, y: -pull.y / MAX_PULL * topSpeed };
      if (u.kind === "sling") {
        previewDots(c, SLING.x, SLING.y, v.x, v.y, 0, 45);
        if (aim.kb) pixelText(c, Math.round(kb.ang) + "°  " + Math.round(kb.pow * 100) + "%", SLING.x, GROUND - 62, "#ffffff");
      } else {
        var k = u.speed || 1;
        previewDots(c, BUNKER.x, BUNKER.y, v.x * k, v.y * k, u.lift || 0, u.lift > 0.9 ? 60 : 36);
        var ang = Math.round(Math.atan2(-v.y, v.x) * 180 / Math.PI), pw = Math.round(Math.hypot(pull.x, pull.y) / MAX_PULL * 100);
        pixelText(c, ang + "°  " + pw + "%", BUNKER.x, GROUND - 52, "#ffffff");
      }
    }

    if (mode === "play" && phase === "ready" && kb.x != null && selected && UNITS[selected].kind === "air") {
      var mx = Math.round(kb.x), my = groundAt(kb.x);
      for (i = my - 120; i < my - 10; i += 6) dot(c, mx, i, 2, "#ffd23f");
      pixelLine(c, mx - 7, my - 7, mx + 7, my + 7, "#e0412c"); pixelLine(c, mx - 7, my + 7, mx + 7, my - 7, "#e0412c");
      pixelText(c, "TARGET", mx, my - 128, "#ffffff");
    }
    planes.forEach(function (p) {
      var s = sprite(p.unit.sprite);
      c.save(); c.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h / 2)); c.rotate(p.angle);
      c.drawImage(s, -Math.round(p.w / 2), -Math.round(p.h / 2));
      if (!p.down) { c.fillStyle = "rgba(255,255,255,0.6)"; c.fillRect(Math.round(p.w / 2) - 1, -Math.round(p.h / 2) + (Math.round(simT / 50) % 2 ? 1 : 3), 1, p.h - 4); }
      c.restore();
    });

    particles.forEach(function (p) {
      var age = (simT - p.t) / p.life;
      if (p.blast) {
        var R = Math.round(p.r * (0.4 + age * 0.8));
        if (age < 0.5) disc(c, Math.round(p.x), Math.round(p.y), Math.max(2, Math.round(R * 0.7)), age < 0.2 ? "#ffffff" : "#ffd23f");
        [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].forEach(function (d, n) {
          var L = Math.round(R * (n % 2 ? 0.7 : 1));
          for (var j = Math.round(L * 0.5); j <= L; j += 2) { c.fillStyle = j > L - 3 ? "#ff8c1a" : "#ffd23f"; c.fillRect(Math.round(p.x + d[0] * j * 0.75) - 1, Math.round(p.y + d[1] * j * 0.75) - 1, 2, 2); }
        });
      } else if (p.smoke) {
        var sz = Math.round(p.size * (1 + age * 1.5));
        c.fillStyle = p.dark ? "rgba(40,40,46," + (0.85 - age * 0.8) + ")" : "rgba(120,120,128," + (0.7 - age * 0.7) + ")";
        c.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
      } else {
        c.fillStyle = p.color; c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    });
    tracers.forEach(function (t) { pixelLine(c, t.x0, t.y0, t.x1, t.y1, "#ffd23f"); });
    var topY = -OY + Math.round($("hud").offsetHeight * (window.devicePixelRatio || 1) / scaleDev) + 2;
    ents.forEach(function (e) {
      if (e.type !== "proj" || e.dead) return;
      var p = pos(e); if (p.y > topY - 4) return;
      var ax = Math.round(p.x); c.fillStyle = "#ffd23f";
      c.fillRect(ax - 3, topY + 2, 7, 1); c.fillRect(ax - 2, topY + 1, 5, 1); c.fillRect(ax - 1, topY, 3, 1); c.fillRect(ax, topY - 1, 1, 1);
    });
    popups.forEach(function (p) { var age = (simT - p.t) / p.life, rise = p.life > 1100 ? 4 : 18; pixelText(c, p.text, Math.round(p.x), Math.round(p.y - age * rise), p.color); });
    // arrows at the screen edge for defenders the camera can't see
    if (camMax > 0 && mode === "play") {
      var viewL = -OX, viewR = -OX + bufW, offR = 0, offL = 0;
      defenders().forEach(function (d) { var x = pos(d).x; if (x > viewR - 4) offR++; else if (x < viewL + 4) offL++; });
      [[offR, viewR - 12, 1], [offL, viewL + 12, -1]].forEach(function (o) {
        if (!o[0]) return;
        var ax = Math.round(o[1]), ay = GROUND - 70;
        c.fillStyle = OUTLINE; for (var k = 0; k < 6; k++) c.fillRect(ax + o[2] * (k - 3) - 1, ay - (6 - k) - 1, 3, (6 - k) * 2 + 3);
        c.fillStyle = "#ffd23f"; for (k = 0; k < 6; k++) c.fillRect(ax + o[2] * (k - 3), ay - (6 - k), 1, (6 - k) * 2 + 1);
        pixelText(c, String(o[0]), ax - o[2] * 10, ay, "#ffffff");
      });
    }
    drawWeather(c, th);

    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.imageSmoothingEnabled = false;
    sctx.drawImage(buf, 0, 0, bufW * scaleDev, bufH * scaleDev);
  }

  /* ------------------------------------------------------------- input */
  function toWorld(ev) {
    var r = screenC.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    return { x: (ev.clientX - r.left) * dpr / scaleDev - OX, y: (ev.clientY - r.top) * dpr / scaleDev - OY };
  }
  function startGesture(ev) {
    gesture = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, cam0: camX, moved: 0 };
    try { screenC.setPointerCapture(ev.pointerId); } catch (err) { /* older browsers */ }
  }
  screenC.addEventListener("pointerdown", function (ev) {
    if (mode !== "play" || paused) return;
    ac(); lastInput = "pointer";
    if (phase === "aiming" && aim && aim.kb) { aim = null; phase = "ready"; }   // a finger takes over from the keys
    kb.x = null;
    if (introPan) { introPan = false; camHoldUntil = 0; camX = 0; }
    if (phase === "active") { special(); return; }
    if (phase !== "ready" || !selected || !arsenal[selected]) { startGesture(ev); return; }
    var kind = UNITS[selected].kind, r = screenC.getBoundingClientRect();
    var leftHalf = ev.clientX - r.left < r.width * 0.5;
    if ((kind === "sling" || kind === "fire") && (camMax <= 0 || leftHalf)) {
      aim = { sx: ev.clientX, sy: ev.clientY, cx: ev.clientX, cy: ev.clientY, id: ev.pointerId };
      phase = "aiming"; camHoldX = null; updateHint(); updateLookButton();
      try { screenC.setPointerCapture(ev.pointerId); } catch (err) { /* older browsers */ }
    } else startGesture(ev);
  });
  screenC.addEventListener("pointermove", function (ev) {
    if (phase === "aiming" && aim && ev.pointerId === aim.id) { aim.cx = ev.clientX; aim.cy = ev.clientY; return; }
    if (gesture && ev.pointerId === gesture.id) {
      var dx = ev.clientX - gesture.sx;
      gesture.moved = Math.max(gesture.moved, Math.hypot(dx, ev.clientY - gesture.sy));
      if (camMax > 0 && gesture.moved > 6) {
        camHoldX = clamp(gesture.cam0 - dx * (window.devicePixelRatio || 1) / scaleDev, 0, camMax); camHoldUntil = Infinity;
        updateLookButton();
      }
    }
  });
  function release(ev) {
    if (gesture && ev.pointerId === gesture.id) {
      var g = gesture; gesture = null;
      if (g.moved < 8 && phase === "ready" && selected && arsenal[selected]) {
        var kind = UNITS[selected].kind;
        if (kind === "drive") launchDrive(selected);
        else if (kind === "air") callIn(selected, clamp(toWorld(ev).x, 160, worldW - 20));
      }
      return;
    }
    if (phase !== "aiming" || !aim || ev.pointerId !== aim.id) return;
    var pull = pullVector(); aim = null;
    if (Math.hypot(pull.x, pull.y) < 6) { phase = "ready"; updateHint(); return; }
    var vx = -pull.x / MAX_PULL * topSpeed, vy = -pull.y / MAX_PULL * topSpeed;
    if (UNITS[selected].kind === "sling") launchSling(selected, vx, vy); else launchFire(selected, vx, vy);
  }
  screenC.addEventListener("pointerup", release);
  screenC.addEventListener("wheel", function (ev) {
    if (mode !== "play" || camMax <= 0 || phase === "aiming") return;
    ev.preventDefault();
    camHoldX = clamp((camHoldX != null ? camHoldX : camX) + (ev.deltaX || ev.deltaY) * 0.5, 0, camMax); camHoldUntil = Infinity;
    updateLookButton();
  }, { passive: false });
  screenC.addEventListener("pointercancel", function () { gesture = null; if (phase === "aiming") { aim = null; phase = "ready"; updateHint(); } });

  /* --------------------------------------------------- keys (jeremy.v2) */
  // W/S or Up/Down aim up and down, A/D or Left/Right set the power (or move a plane's target), Space or Enter
  // launches (or does the special move while something's flying), E/Q or 1-9 pick a dude, F sees the fort, M sound,
  // P or Escape pause. In menus the same direction keys move between the buttons and Space or Enter presses one.
  var DIR = { w: "up", arrowup: "up", s: "down", arrowdown: "down", a: "left", arrowleft: "left", d: "right", arrowright: "right" };
  function kindNow() { return mode === "play" && selected && arsenal[selected] ? UNITS[selected].kind : null; }
  function keyAiming() { return phase === "aiming" && aim && aim.kb; }
  function defaultTarget() { return clamp((level.fortX || 480) + 40, 160, worldW - 20); }
  function followTarget() {
    if (camMax > 0 && kb.x != null) { camHoldX = clamp(kb.x - bufW / 2, 0, camMax); camHoldUntil = Infinity; updateLookButton(); }
  }
  function nudge(dir, k) {
    var kind = kindNow();
    if (!kind || paused) return;
    if (kind === "sling" || kind === "fire") {
      if (phase === "ready") { aim = { kb: true }; phase = "aiming"; camHoldX = null; updateLookButton(); }
      if (!keyAiming()) return;
      if (dir === "up" || dir === "down") kb.ang = clamp(kb.ang + (dir === "up" ? 1.5 : -1.5) * k, -20, 85);
      else kb.pow = clamp(kb.pow + (dir === "right" ? 0.02 : -0.02) * k, 0.15, 1);
      updateHint();
    } else if (kind === "air" && phase === "ready") {
      if (kb.x == null) kb.x = defaultTarget();
      else if (dir === "left" || dir === "right") kb.x = clamp(kb.x + (dir === "right" ? 4 : -4) * k, 160, worldW - 20);
      followTarget(); updateHint();
    }
  }
  function heldKeys() { if (paused) return; for (var d in held) if (held[d]) nudge(d, 0.5); }
  function launchKey() {
    if (mode !== "play" || paused) return;
    if (phase === "active") { special(); return; }
    var kind = kindNow();
    if (!kind) return;
    if (keyAiming()) {
      var pull = pullVector(); aim = null;
      var vx = -pull.x / MAX_PULL * topSpeed, vy = -pull.y / MAX_PULL * topSpeed;
      if (kind === "sling") launchSling(selected, vx, vy); else launchFire(selected, vx, vy);
      return;
    }
    if (phase !== "ready") return;
    if (kind === "sling" || kind === "fire") { aim = { kb: true }; phase = "aiming"; camHoldX = null; updateLookButton(); updateHint(); }
    else if (kind === "drive") launchDrive(selected);
    else if (kind === "air") {
      if (kb.x == null) { kb.x = defaultTarget(); followTarget(); updateHint(); }
      else { var tx = kb.x; kb.x = null; callIn(selected, tx); }
    }
  }
  // pick a dude by key (from the bar's list) or by tapping its button; the keyboard's aim carries over
  function pickDude(k) {
    if (mode !== "play" || !k || !arsenal[k] || (phase === "aiming" && !keyAiming())) return;
    selected = k; kb.x = null;
    if (keyAiming() && UNITS[k].kind !== "sling" && UNITS[k].kind !== "fire") { aim = null; phase = "ready"; }
    buildBar(); updateHint();
  }
  function cycleDude(d) {
    var have = ORDER.filter(function (k) { return arsenal[k] > 0; });
    if (have.length) pickDude(have[(Math.max(0, have.indexOf(selected)) + d + have.length) % have.length]);
  }
  function setPaused(on) {
    if (on && mode !== "play") return;
    paused = !!on; held = {};
    if (paused && phase === "aiming" && aim && !aim.kb) { aim = null; phase = "ready"; updateHint(); }
    gesture = null;
    $("pause").hidden = !paused;
    if (paused) {
      setText("pause-where", level.name + " · " + level.date);
      if (lastInput === "key") $("btn-resume").focus();
    } else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function openOverlay() {
    if (paused) return $("pause");
    return ["menu", "intro", "result", "campaign"].map($).filter(function (o) { return !o.hidden; })[0] || null;
  }
  function usable(b) { return !b.disabled && b.offsetParent !== null && getComputedStyle(b).visibility !== "hidden"; }
  function primaryButton(o) {
    var pick = { pause: ["btn-resume"], intro: ["btn-start"], result: ["btn-next", "btn-retry"], campaign: ["btn-camp-fight", "btn-camp-back"] }[o.id];
    if (pick) for (var i = 0; i < pick.length; i++) if (usable($(pick[i]))) return $(pick[i]);
    return o.querySelector("#levels .lvl") || [].filter.call(o.querySelectorAll("button"), usable)[0] || null;
  }
  function moveFocus(o, d) {
    var list = [].filter.call(o.querySelectorAll("button"), usable), at = list.indexOf(document.activeElement);
    var next = at < 0 ? primaryButton(o) : list[(at + d + list.length) % list.length];
    if (next) next.focus();
  }
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || !level) return;
    var key = (e.key || "").toLowerCase(), dir = DIR[key], focus = document.activeElement;
    lastInput = "key";
    if (mode === "play" && !paused) {
      if (dir) { e.preventDefault(); if (!e.repeat) { held[dir] = true; ac(); nudge(dir, 1); } return; }
      if (key === " " || key === "enter") {
        if (focus && focus.tagName === "BUTTON" && focus.matches(":focus-visible")) return;   // a button the player tabbed to
        e.preventDefault(); if (!e.repeat) { ac(); launchKey(); } return;
      }
      if (key === "p" || key === "escape") { e.preventDefault(); setPaused(true); return; }
      if (e.repeat) return;
      if (key === "e") cycleDude(1);
      else if (key === "q") cycleDude(-1);
      else if (/^[1-9]$/.test(key)) pickDude(ORDER.filter(function (k) { return k in arsenal; })[+key - 1]);
      else if (key === "f" && camMax > 0) lookAtFort(!(camHoldX != null && camHoldX > camMax / 2));
      else if (key === "m") toggleSound();
      return;
    }
    var o = openOverlay();
    if (!o) return;
    if (key === "escape" || (key === "p" && paused)) {
      e.preventDefault();
      if (paused) setPaused(false);
      else if (o.id === "intro") $("btn-back").click();
      else if (o.id === "campaign") $("btn-camp-back").click();
      return;
    }
    if (dir && o.id === "campaign" && (dir === "left" || dir === "right")) { e.preventDefault(); pickPin(campSel + (dir === "right" ? 1 : -1)); return; }
    if (dir) { e.preventDefault(); moveFocus(o, dir === "down" || dir === "right" ? 1 : -1); return; }
    if ((key === " " || key === "enter") && !(focus && focus.tagName === "BUTTON" && o.contains(focus))) {
      var b = primaryButton(o);
      if (b) { e.preventDefault(); b.click(); }
    }
  });
  window.addEventListener("keyup", function (e) { var d = DIR[(e.key || "").toLowerCase()]; if (d) held[d] = false; });
  window.addEventListener("blur", function () { held = {}; });
  document.addEventListener("pointerdown", function () { lastInput = "pointer"; }, true);
  // a tapped or clicked button lets go of the focus in battle, so Space launches instead of pressing it again
  document.addEventListener("click", function (e) {
    if (mode === "play" && e.detail > 0 && document.activeElement && document.activeElement.tagName === "BUTTON") document.activeElement.blur();
  });
  // a menu opened from the keyboard puts the focus on its main button
  function focusMain() { var o = openOverlay(); if (o && lastInput === "key") { var b = primaryButton(o); if (b) b.focus({ preventScroll: true }); } }

  /* ---------------------------------------------------------------- UI */
  function iconCanvas(name, boxW, boxH) {
    var s = sprite(name), dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    var k = Math.max(1, Math.min(Math.floor(boxW / s.width), Math.floor(boxH / s.height)));
    var c = document.createElement("canvas");
    c.width = s.width * k * dpr; c.height = s.height * k * dpr;
    c.style.width = s.width * k + "px"; c.style.height = s.height * k + "px";
    c.setAttribute("aria-hidden", "true");
    var x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, c.width, c.height);
    return c;
  }
  function unitIcon(u) { return u.icon || (u.kind === "fire" ? u.gunner : u.sprite); }
  function buildBar() {
    var bar = $("bar"); bar.innerHTML = "";
    ORDER.forEach(function (k) {
      if (!(k in arsenal)) return;
      var u = UNITS[k], btn = document.createElement("button");
      btn.className = "item"; btn.type = "button";
      btn.setAttribute("aria-pressed", String(k === selected));
      btn.disabled = !arsenal[k];
      btn.title = u.hint;
      btn.appendChild(iconCanvas(unitIcon(u), 46, 30));
      btn.insertAdjacentHTML("beforeend", '<span class="nm">' + u.name + '</span><span class="ct">×' + arsenal[k] + '</span><span class="kd">' + KIND_LABEL[u.kind] + '</span>');
      btn.addEventListener("click", function () {
        if ((phase === "aiming" && !(aim && aim.kb)) || !arsenal[k]) return;
        pickDude(k);
      });
      bar.appendChild(btn);
    });
    fitBar();
  }
  // jeremy.v2: the arsenal shows only whole buttons; the rest are a swipe (or E) away, with a gold arrow saying so
  function fitBar() {
    var bar = $("bar"), items = bar.children, dock = $("dock");
    bar.style.maxWidth = ""; dock.classList.remove("more");
    if (!items.length || !bar.clientWidth) return;
    var cs = getComputedStyle(bar), padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight), gap = parseFloat(cs.columnGap) || 8;
    var pitch = items[0].offsetWidth + gap, n = Math.max(1, Math.floor((bar.clientWidth - padL - padR + gap) / pitch));
    if (n >= items.length) return;
    bar.style.maxWidth = (padL + n * pitch - gap + padR) + "px";
    dock.classList.add("more"); dock.style.setProperty("--more-y", Math.round(bar.offsetTop + bar.offsetHeight / 2) + "px");
  }
  function setText(id, v) { var el = $(id); if (el.textContent !== v) el.textContent = v; }
  function updateHud() {
    if (!level) return;
    setText("lvl-name", level.name); setText("lvl-date", level.date);
    setText("score", fmt(score));
    var n = defendersLeft();
    setText("foes", n + (n === 1 ? " defender left" : " defenders left"));
    setText("wind", wind === 0 ? "Calm" : (wind < 0 ? "← " : "") + Math.abs(wind) + (wind > 0 ? " →" : ""));
  }
  var TAP_HINT = {
    shout: "Tap to shout!", chute: "Tap to pop the parachute!", detonate: "Tap to set off the charge!", pound: "Tap for a ground pound!",
    dash: "Tap to charge!", split: "Tap to split up!", sharpshoot: "Tap to fire at the nearest defenders!", jump: "Tap to jump!", ram: "Tap to ram!", unload: "Tap to send troops over the wall!",
    blowup: "Tap to blow it up!", boost: "Tap to fire the jetpack!"
  };
  function updateHint() {
    var h = $("hint"), a = active && active.lead;
    if (mode !== "play") { h.textContent = ""; return; }
    if (phase === "aiming" && aim && aim.kb) { h.textContent = "Aim " + Math.round(kb.ang) + "°, power " + Math.round(kb.pow * 100) + "%. Space or Enter to launch!"; return; }
    if (phase === "ready" && kb.x != null && selected && UNITS[selected].kind === "air") { h.textContent = "←/→ or A/D move the target. Space or Enter calls it in!"; return; }
    if (phase === "active" && a && !a.dead && a.unit && a.unit.tap) {
      var u = a.unit, t = TAP_HINT[u.tap] || "";
      if (u.tap === "chute" && a.chute) t = "Floating down…";
      if (u.tap === "shoot") t = a.shots ? "Tap to fire! " + a.shots + (a.shots === 1 ? " shot" : " shots") + " left" : "Out of ammo.";
      if (u.tap === "unload" && a.unloaded) t = "Over they go!";
      if (a.usedTap && /shout|dash|split|pound|sharpshoot/.test(u.tap)) t = "";
      h.textContent = t;
    } else if (phase === "active") h.textContent = "Here it comes…";
    else if (phase === "settling") h.textContent = "Waiting for the dust to settle…";
    else h.textContent = selected ? UNITS[selected].hint : "";
  }

  function starSvg(on) {
    return '<svg class="star' + (on ? " on" : "") + '" viewBox="0 0 9 9" aria-hidden="true"><path d="M4 0h1v2h1v1h3v1h-1v1h-1v2h1v2h-1v-1h-1v-1h-3v1h-1v1h-1v-2h1v-2h-1v-1h-1v-1h3v-1h1z"/></svg>';
  }
  function show(id) {
    paused = false; $("pause").hidden = true; held = {};
    ["menu", "intro", "result", "campaign"].forEach(function (o) { $(o).hidden = o !== id; });
    document.body.classList.toggle("playing", id === null);
    resize();
    if (id) setTimeout(focusMain, 0);
  }
  function buildMenu() {
    var tabs = $("packs"); tabs.innerHTML = "";
    PACKS.forEach(function (P, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "pack"; b.setAttribute("aria-pressed", String(i === packIndex));
      b.appendChild(iconCanvas(P.icon, 48, 40));
      b.insertAdjacentHTML("beforeend", '<span><b>' + P.name + '</b><small>' + P.years + '</small></span>');
      b.addEventListener("click", function () {
        campaign = null; usePack(i); loadLevel(0); mode = "menu"; buildMenu(); resize();
        if (lastInput === "key") $("packs").children[i].focus();   // jeremy.v2: the keyboard stays on the pack it picked
      });
      tabs.appendChild(b);
    });
    setText("pack-blurb", pack.side + " vs. " + pack.foe + ". " + pack.blurb);
    var slot = $("camp-banner-slot"); slot.innerHTML = "";
    if (pack.campaign) {
      var C = pack.campaign, cs = campState(pack), cb = document.createElement("button");
      cb.type = "button"; cb.className = "camp-banner";
      cb.appendChild(iconCanvas(C.missions.length && cs.done.length >= C.missions.length ? "officer" : pack.icon, 56, 40));
      cb.insertAdjacentHTML("beforeend", "<b>Campaign: " + C.name + "</b><small>" + (cs.done.length >= C.missions.length ? "Complete! " : cs.done.length + " of " + C.missions.length + " missions won · ") +
        "Rank: " + campRank(C, cs) + "</small><span class=\"go\">" + (cs.done.length ? "Continue" : "Start") + "</span>");
      cb.addEventListener("click", function () { ac(); openCampaign(); });
      slot.appendChild(cb);
    }
    var list = $("levels"); list.innerHTML = "";
    pack.levels.forEach(function (L, i) {
      var best = store("angrydudes.best." + pack.id + "." + L.id) || { score: 0, stars: 0 };
      var b = document.createElement("button");
      b.type = "button"; b.className = "lvl";
      b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"><b>' + L.name + '</b><small>' + L.date + '</small></span>' +
        '<span class="stars" aria-label="' + best.stars + ' of 3 stars">' + starSvg(best.stars > 0) + starSvg(best.stars > 1) + starSvg(best.stars > 2) + '</span>' +
        (best.score ? '<span class="best">Best ' + fmt(best.score) + '</span>' : '<span class="best">Not played yet</span>');
      b.addEventListener("click", function () { ac(); campaign = null; openIntro(i); });
      list.appendChild(b);
    });
  }
  function openIntro(i) {
    loadLevel(i); mode = "intro";
    setText("intro-pack", campaign ? campaign.C.name + " · Mission " + (campaign.i + 1) + " of " + campaign.C.missions.length
      : pack.name + " · " + pack.side + " vs. " + pack.foe);
    setText("intro-name", level.name); setText("intro-date", level.date);
    setText("intro-history", level.history); setText("intro-tip", level.tip);
    var tough = campaign ? campaign.C.toughness[campaign.i] || 1 : 1;
    setText("intro-goal", "Knock out all " + defendersLeft() + " defenders." + (tough > 1 ? " They're " + Math.round((tough - 1) * 100) + "% tougher now!" : "") +
      " Win with 2 left in your arsenal for \u2605\u2605\u2605.");
    if (extraTroop) setText("intro-tip", "Bonus for trying hard: one extra " + UNITS[extraTroop].name + "! " + level.tip);
    var ars = $("intro-arsenal"); ars.innerHTML = "";
    ORDER.forEach(function (k) {
      if (!arsenal[k]) return;
      var u = UNITS[k], li = document.createElement("li");
      li.appendChild(iconCanvas(unitIcon(u), 40, 26));
      li.insertAdjacentHTML("beforeend", "<span>" + u.name + " ×" + arsenal[k] + "</span>");
      ars.appendChild(li);
    });
    var foes = $("intro-foes"); foes.innerHTML = "";
    var seen = {};
    defenders().forEach(function (d) {
      if (seen[d.key]) return; seen[d.key] = 1;
      var li = document.createElement("li");
      li.appendChild(iconCanvas(d.sprite, 40, 26));
      li.insertAdjacentHTML("beforeend", "<span>" + (d.def.name || d.key) + "</span>");
      foes.appendChild(li);
    });
    show("intro");
  }
  function startBattle() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    mode = "play"; show(null); updateHud(); updateHint(); buildBar();
    if (camMax > 0) { camX = camMax; camHoldX = camMax; camHoldUntil = simT + 1500; introPan = true; }
    var named = {};
    defenders().forEach(function (d) {
      var special = d.def.react || d.def.float || d.pts >= 5000;
      if (!special || named[d.key]) return;
      named[d.key] = 1;
      var p = pos(d); say((d.def.name || d.key).toUpperCase(), p.x, p.y - d.h / 2 - (sprite(d.sprite).height - d.h) - 10, "#ffffff", 2800);
    });
    updateLookButton();
  }
  function showResult(won, stars, bonus, left) {
    setText("result-title", won ? "Victory!" : "The fort holds");
    $("result-stars").innerHTML = won ? starSvg(stars > 0) + starSvg(stars > 1) + starSvg(stars > 2) : "";
    setText("result-score", fmt(score));
    setText("result-note", won
      ? (left ? left + " left in your arsenal: +" + fmt(bonus) + " bonus" : "You used everything in your arsenal.")
      : "You ran out of troops and weapons. Try a different order, or check the tip.");
    $("btn-next").hidden = !won || levelIndex >= pack.levels.length - 1;
    $("btn-next").textContent = "Next battle"; $("btn-next").disabled = false;
    $("btn-retry").textContent = "Play again"; $("btn-result-menu").textContent = "Menu"; $("btn-result-menu").hidden = false;
    $("result-rewards").hidden = true;
    if (campaign) {
      var C = campaign.C, cs = campaign.s;
      if (won && cs.done.length >= C.missions.length && campaign.i === C.missions.length - 1) {
        setText("result-title", "Campaign complete!");
        setText("result-note", "You fought all the way from the beaches to the Rhine. You've been promoted to " + campRank(C, cs) + "!");
      }
      $("btn-next").hidden = !won; $("btn-next").textContent = "To the map";
      $("btn-retry").textContent = won ? "Play again" : "Try again";
      $("btn-result-menu").textContent = "Campaign map"; $("btn-result-menu").hidden = won;
      if (won && cs.pending === level.id) {
        $("result-rewards").hidden = false; $("btn-next").disabled = true;
        renderRewards($("reward-cards"), function () { $("btn-next").disabled = false; });
      }
    }
    setTimeout(function () { if (mode === "result") show("result"); }, 900);
  }
  function toMenu() { campaign = null; UNITS = pack.units; mode = "menu"; buildMenu(); show("menu"); }
  function leaveBattle() { if (campaign) openCampaign(); else toMenu(); }

  /* ------------------------------------------------------------ campaign */
  // A campaign strings a pack's battles into a route on a map. Each first win offers a choice of rewards that
  // stay with your army for the rest of the campaign, and each mission's defenders are tougher (`toughness`).
  var campaign = null, campSel = 0, campResetArmed = 0;
  function campKey(P) { return "angrydudes.campaign." + P.id; }
  function campState(P) {
    var cs = store(campKey(P)) || {};
    cs.done = cs.done || []; cs.perks = cs.perks || []; cs.stars = cs.stars || {}; cs.offers = cs.offers || {};
    return cs;
  }
  function campReward(C, id) { return C.rewards.filter(function (r) { return r.id === id; })[0]; }
  function campNext(C, cs) { for (var i = 0; i < C.missions.length; i++) if (cs.done.indexOf(C.missions[i].level) < 0) return i; return C.missions.length; }
  function campRank(C, cs) { return C.ranks[Math.min(C.ranks.length - 1, cs.done.length)]; }
  function levelNumber(P, id) { for (var i = 0; i < P.levels.length; i++) if (P.levels[i].id === id) return i; return -1; }
  function campaignArsenal(L) {
    var a = {}, P = campaign.P;
    Object.keys(L.arsenal).forEach(function (k) { a[k] = L.arsenal[k]; });
    campaign.s.perks.forEach(function (id) {
      var r = campReward(campaign.C, id);
      if (r && r.add) Object.keys(r.add).forEach(function (k) {
        if (L.airOnly && P.units[k].kind !== "air") return;      // ground troops sit out Air Force missions
        a[k] = (a[k] || 0) + r.add[k];
      });
    });
    return a;
  }
  function campaignUnits() {
    // copies of the pack's units with the army's upgrades applied, so free play is never affected
    var U = {}, P = campaign.P;
    Object.keys(P.units).forEach(function (k) { U[k] = P.units[k]; });
    campaign.s.perks.forEach(function (id) {
      var r = campReward(campaign.C, id);
      if (r && r.buff) Object.keys(r.buff).forEach(function (k) {
        var b = r.buff[k], u = {};
        Object.keys(U[k]).forEach(function (f) { u[f] = U[k][f]; });
        if (b.power) u.power = (u.power || 1) * b.power;
        if (b.boom && u.boom) u.boom = { r: u.boom.r * b.boom, p: u.boom.p * 1.15 };
        if (b.hp && u.hp) u.hp = u.hp * b.hp;
        U[k] = u;
      });
    });
    return U;
  }
  function campaignWin(stars) {
    var C = campaign.C, cs = campState(campaign.P), id = level.id;
    cs.stars[id] = Math.max(cs.stars[id] || 0, stars);
    if (cs.done.indexOf(id) < 0) {
      cs.done.push(id);
      if (campaign.i < C.missions.length - 1) {
        // three rewards the army doesn't have yet; the same three every time for this mission
        var pool = C.rewards.filter(function (r) { return cs.perks.indexOf(r.id) < 0; }), pick = rng(campaign.i * 7 + 3), offer = [];
        while (pool.length && offer.length < 3) offer.push(pool.splice(Math.floor(pick() * pool.length), 1)[0].id);
        cs.offers[id] = offer; cs.pending = id;
      }
    }
    store(campKey(campaign.P), cs); campaign.s = cs;
  }
  function renderRewards(box, onPicked) {
    var P = campaign ? campaign.P : pack, C = P.campaign, cs = campState(P), offer = cs.offers[cs.pending] || [];
    box.innerHTML = "";
    offer.forEach(function (id) {
      var r = campReward(C, id), b = document.createElement("button");
      b.type = "button"; b.className = "card"; b.setAttribute("aria-pressed", "false");
      b.appendChild(iconCanvas(r.icon, 64, 40));
      b.insertAdjacentHTML("beforeend", "<b>" + r.name + "</b><small>" + r.text + "</small>");
      b.addEventListener("click", function () {
        var now = campState(P);
        if (!now.pending) return;
        now.perks.push(id); delete now.pending; store(campKey(P), now);
        if (campaign) campaign.s = now;
        Array.prototype.forEach.call(box.children, function (c) { c.disabled = true; c.setAttribute("aria-pressed", String(c === b)); });
        sfx.heal(); onPicked();
      });
      box.appendChild(b);
    });
  }
  function routePixels(c, a, b, color, dashed) {
    var n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    c.fillStyle = color;
    for (var k = 0; k <= n; k++) {
      if (dashed && k % 6 > 3) continue;
      var x = Math.round(a[0] + (b[0] - a[0]) * k / n), y = Math.round(a[1] + (b[1] - a[1]) * k / n);
      c.fillRect(x, y, dashed ? 1 : 2, dashed ? 1 : 2);
    }
  }
  function drawCampaignMap(C, cs) {
    var cv = $("camp-map"), c = cv.getContext("2d"), W = cv.width, H = cv.height, M = C.map;
    var img = c.createImageData(W, H), d = img.data, mask = new Uint8Array(W * H), r = rng(77), x, y, i;
    // land from outlines (even-odd scanline fill), sea everywhere else
    M.land.forEach(function (poly, n) {
      var pts = poly.pts;
      for (y = 0; y < H; y++) {
        var cuts = [], yy = y + 0.5;
        for (var e = 0; e < pts.length; e++) {
          var p0 = pts[e], p1 = pts[(e + 1) % pts.length];
          if ((p0[1] <= yy) !== (p1[1] <= yy)) cuts.push(p0[0] + (yy - p0[1]) / (p1[1] - p0[1]) * (p1[0] - p0[0]));
        }
        cuts.sort(function (u, v) { return u - v; });
        for (var q = 0; q + 1 < cuts.length; q += 2) for (x = Math.max(0, Math.ceil(cuts[q] - 0.5)); x < Math.min(W, cuts[q + 1] - 0.5); x++) mask[y * W + x] = n + 1;
      }
    });
    var TINT = { england: ["#86a85e", "#78994f", "#97b86c"], europe: ["#9aa860", "#8a9852", "#a9b56f"] };
    function put(k, hex) { d[k * 4] = parseInt(hex.substr(1, 2), 16); d[k * 4 + 1] = parseInt(hex.substr(3, 2), 16); d[k * 4 + 2] = parseInt(hex.substr(5, 2), 16); d[k * 4 + 3] = 255; }
    function land(px, py) { return px >= 0 && py >= 0 && px < W && py < H && mask[py * W + px] > 0; }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x; var v = r();
      if (!mask[i]) { put(i, x % 32 === 16 || y % 32 === 16 ? "#284d73" : v < 0.05 ? "#3a6a96" : "#2f5a85"); continue; }
      var t = TINT[M.land[mask[i] - 1].tint] || TINT.europe;
      put(i, v < 0.14 ? t[1] : v > 0.9 ? t[2] : t[0]);
    }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      i = y * W + x;
      var edge = land(x + 1, y) !== land(x, y) || land(x - 1, y) !== land(x, y) || land(x, y + 1) !== land(x, y) || land(x, y - 1) !== land(x, y);
      if (edge) put(i, mask[i] ? "#d9c48a" : "#8fc0e0");      // sandy shore, white surf
    }
    c.putImageData(img, 0, 0);
    (M.forests || []).forEach(function (f) {
      var fr = rng(f.x);
      for (var k = 0; k < f.rx * f.ry / 3; k++) {
        var a = fr() * Math.PI * 2, rr = Math.sqrt(fr()), tx = Math.round(f.x + Math.cos(a) * rr * f.rx), ty = Math.round(f.y + Math.sin(a) * rr * f.ry);
        c.fillStyle = "#2f5a2a"; c.fillRect(tx, ty, 2, 2); c.fillStyle = "#4f8a3a"; c.fillRect(tx, ty, 1, 1);
      }
    });
    (M.rivers || []).forEach(function (rv) {
      for (var k = 0; k + 1 < rv.pts.length; k++) {
        routePixels(c, rv.pts[k], rv.pts[k + 1], "#3f78b5", false);
        if (rv.w < 2) routePixels(c, [rv.pts[k][0] + 1, rv.pts[k][1]], [rv.pts[k + 1][0] + 1, rv.pts[k + 1][1]], "#9aa860", false);
      }
    });
    (M.cities || []).forEach(function (ct) { c.fillStyle = "#1d1a2b"; c.fillRect(ct.x - 2, ct.y - 2, 5, 5); c.fillStyle = "#ffffff"; c.fillRect(ct.x - 1, ct.y - 1, 3, 3); });
    // the route: solid gold where you've already fought, dashed white ahead
    C.missions.forEach(function (m, k) {
      if (!k) return;
      var prev = C.missions[k - 1], pts = [[prev.x, prev.y]].concat(m.via || [], [[m.x, m.y]]), won = cs.done.indexOf(m.level) >= 0;
      for (var j = 0; j + 1 < pts.length; j++) {
        if (won) routePixels(c, [pts[j][0] - 1, pts[j][1] - 1], [pts[j + 1][0] - 1, pts[j + 1][1] - 1], "#1d1a2b", false);
        routePixels(c, pts[j], pts[j + 1], won ? "#ffd23f" : "#ffffff", !won);
      }
    });
    var labels = $("camp-labels"); labels.innerHTML = "";
    (M.labels || []).concat((M.cities || []).map(function (ct) { return { text: ct.name, x: ct.x, y: ct.y, city: true }; })).forEach(function (lb) {
      var el = document.createElement("span");
      el.textContent = lb.text; el.className = lb.sea ? "sea" : lb.city ? "city" : "";
      el.style.left = (lb.x / W * 100) + "%"; el.style.top = (lb.y / H * 100) + "%";
      labels.appendChild(el);
    });
  }
  function renderCampaign() {
    var P = pack, C = P.campaign, cs = campState(P), next = campNext(C, cs), W = 384, H = 216;
    setText("camp-eyebrow", P.name + " campaign"); setText("camp-title", C.name); setText("camp-blurb", C.blurb);
    drawCampaignMap(C, cs);
    var pins = $("camp-pins"); pins.innerHTML = "";
    C.missions.forEach(function (m, k) {
      // jeremy.v2: the pins are drawn markers, and a tap anywhere on the map picks the nearest open mission (pickPin),
      // because pins 48 px wide wouldn't fit side by side on a phone
      var L = P.levels[levelNumber(P, m.level)], won = cs.done.indexOf(m.level) >= 0, locked = k > next, b = document.createElement("span");
      b.className = "pin " + (won ? "done" : locked ? "locked" : "next"); b.setAttribute("role", "img");
      b.textContent = String(k + 1);
      b.style.left = (m.x / W * 100) + "%"; b.style.top = (m.y / H * 100) + "%";
      b.setAttribute("aria-pressed", String(k === campSel));
      b.setAttribute("aria-label", "Mission " + (k + 1) + ": " + L.name + (won ? ", won" : locked ? ", locked" : ", next up"));
      pins.appendChild(b);
    });
    var m = C.missions[campSel], L = P.levels[levelNumber(P, m.level)], won = cs.done.indexOf(m.level) >= 0, tough = C.toughness[campSel] || 1;
    setText("cm-num", "Mission " + (campSel + 1) + " of " + C.missions.length + (L.airOnly ? " · Air Force" : ""));
    setText("cm-name", L.name); setText("cm-date", L.date);
    var st = cs.stars[m.level] || 0;
    $("cm-stars").innerHTML = won ? starSvg(st > 0) + starSvg(st > 1) + starSvg(st > 2) : "";
    $("cm-tough").innerHTML = tough > 1 ? "Enemy defenders are <b>" + Math.round((tough - 1) * 100) + "% tougher</b> here." : "The enemy is at normal strength. A good place to start!";
    var fight = $("btn-camp-fight");
    fight.textContent = cs.pending ? "Pick a reward first" : won ? "Play again" : "Fight!";
    fight.disabled = !!cs.pending || campSel > next;
    // rewards waiting to be picked (from a win where you left before choosing) appear right here
    var box = $("camp-mission"), old = $("camp-pending");
    if (old) old.remove();
    if (cs.pending) {
      var wrap = document.createElement("div");
      wrap.id = "camp-pending"; wrap.className = "rewards";
      wrap.innerHTML = '<p class="lbl">Pick a reward for your army</p><div class="cards"></div>';
      box.insertBefore(wrap, fight);
      renderRewards(wrap.lastChild, function () { setTimeout(renderCampaign, 500); });
    }
    setText("camp-rank", campRank(C, cs));
    var army = $("camp-army"); army.innerHTML = "";
    if (!cs.perks.length) army.innerHTML = '<li class="none">No upgrades yet. Win a battle to earn one!</li>';
    cs.perks.forEach(function (id) {
      var rw = campReward(C, id); if (!rw) return;
      var li = document.createElement("li");
      li.appendChild(iconCanvas(rw.icon, 40, 28));
      li.insertAdjacentHTML("beforeend", "<span><b>" + rw.name + "</b><small>" + rw.text + "</small></span>");
      army.appendChild(li);
    });
    var reset = $("btn-camp-reset");
    reset.hidden = !cs.done.length && !cs.perks.length;
    reset.textContent = campResetArmed > Date.now() ? "Tap again to erase" : "Start over";
  }
  function pickPin(k) {
    var C = pack.campaign, next = campNext(C, campState(pack));
    campSel = clamp(k, 0, Math.min(next, C.missions.length - 1)); renderCampaign();
  }
  function tapMap(ev) {
    if (mode !== "campaign") return;
    var r = $("camp-map").getBoundingClientRect(), C = pack.campaign, next = campNext(C, campState(pack)), best = -1, bd = Infinity;
    var mx = (ev.clientX - r.left) / r.width * 384, my = (ev.clientY - r.top) / r.height * 216;
    C.missions.forEach(function (m, k) { var d = Math.hypot(m.x - mx, m.y - my); if (k <= next && d < bd) { bd = d; best = k; } });
    if (best >= 0) pickPin(best);
  }
  function openCampaign() {
    if (campaign && pack !== campaign.P) usePack(PACKS.indexOf(campaign.P));
    var cs = campState(pack), C = pack.campaign;
    if (pack.levels.indexOf(level) < 0) { campaign = null; loadLevel(0); }     // the battlefield behind the map must belong to this pack
    campSel = campaign ? campaign.i : Math.min(campNext(C, cs), C.missions.length - 1);
    if (campaign && cs.done.indexOf(C.missions[campSel].level) >= 0 && campSel < C.missions.length - 1 && campNext(C, cs) > campSel) campSel = Math.min(campNext(C, cs), C.missions.length - 1);
    campaign = null; UNITS = pack.units; mode = "campaign";
    renderCampaign(); show("campaign");
  }
  function startMission(k) {
    var C = pack.campaign;
    campaign = { P: pack, C: C, i: k, s: campState(pack) };
    openIntro(levelNumber(pack, C.missions[k].level));
  }

  $("btn-start").addEventListener("click", startBattle);
  $("btn-look").addEventListener("click", function () { lookAtFort(!(camHoldX != null && camHoldX > camMax / 2)); });
  $("btn-back").addEventListener("click", leaveBattle);
  $("btn-restart").addEventListener("click", function () { loadLevel(levelIndex); startBattle(); });
  $("btn-menu").addEventListener("click", function () { setPaused(true); });
  $("btn-resume").addEventListener("click", function () { setPaused(false); });
  $("btn-pause-restart").addEventListener("click", function () { loadLevel(levelIndex); startBattle(); });
  $("btn-pause-leave").addEventListener("click", leaveBattle);
  $("btn-retry").addEventListener("click", function () { loadLevel(levelIndex); startBattle(); });
  $("btn-next").addEventListener("click", function () { if (campaign) openCampaign(); else openIntro(levelIndex + 1); });
  $("btn-result-menu").addEventListener("click", leaveBattle);
  $("btn-camp-fight").addEventListener("click", function () { ac(); startMission(campSel); });
  document.querySelector(".map-wrap").addEventListener("click", tapMap);
  $("btn-camp-back").addEventListener("click", toMenu);
  $("btn-camp-reset").addEventListener("click", function () {
    if (campResetArmed > Date.now()) { store(campKey(pack), null); campResetArmed = 0; campSel = 0; }
    else { campResetArmed = Date.now() + 4000; setTimeout(function () { if (mode === "campaign") renderCampaign(); }, 4100); }
    renderCampaign();
  });
  function syncSound() { $("btn-sound").textContent = soundOn ? "Sound on" : "Sound off"; $("btn-sound").setAttribute("aria-pressed", String(soundOn)); }
  function toggleSound() { soundOn = !soundOn; store("angrydudes.sound", soundOn); syncSound(); }
  $("btn-sound").addEventListener("click", toggleSound);
  syncSound();

  /* ------------------------------------------------------------- loop */
  var acc = 0, last = performance.now();
  function step() {
    simT += STEP;
    if (level) {
      updateEnts();
      Engine.update(engine, STEP);
      afterPhysics();
      processBooms(); sweep();
      if (mode === "play") {
        heldKeys();
        reactions(); updatePlanes(); checkActive(); checkSettle();
        updateCamera();
        if (winAt && simT >= winAt && phase !== "active") win();
      }
    }
    updateParticles();
    shake = shake > 0.3 ? shake * 0.86 : 0;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(100, now - last); last = now;
    var steps = 0;
    if (paused) acc = 0;
    while (acc >= STEP && steps < 4) { step(); acc -= STEP; steps++; }
    if (steps === 4) acc = 0;
    if (mode === "play" && steps) updateHud();
    draw();
  }

  window.addEventListener("resize", resize);

  // Testing aid: inspect state, or fast-forward the simulation when a browser throttles frames.
  window.ANGRY_DEBUG = {
    get state() { return { pack: pack.id, level: level && level.id, mode: mode, phase: phase, selected: selected, arsenal: arsenal, score: score, defenders: defendersLeft(), ents: ents.length, wind: wind, topSpeed: topSpeed, gravity: gravK,
      paused: paused, aim: { keys: !!(aim && aim.kb), ang: Math.round(kb.ang * 10) / 10, pow: Math.round(kb.pow * 100) / 100, target: kb.x == null ? null : Math.round(kb.x) }, camX: Math.round(camX), camMax: Math.round(camMax), lookingAtFort: camHoldX != null && camHoldX > camMax / 2, sound: soundOn }; },
    advance: function (ms) { for (var i = 0; i < Math.round(ms / STEP); i++) step(); draw(); updateHud(); return this.state; },
    open: function (packId, levelNo) { var i = PACKS.findIndex(function (p) { return p.id === packId; }); campaign = null; usePack(i); openIntro(levelNo || 0); startBattle(); this.advance(1500); return this.state; },
    mission: function (packId, k) { var i = PACKS.findIndex(function (p) { return p.id === packId; }); usePack(i); startMission(k); startBattle(); this.advance(1500); return this.state; },
    map: function (packId) { var i = PACKS.findIndex(function (p) { return p.id === packId; }); campaign = null; usePack(i); openCampaign(); return campState(pack); },
    // use(key, angle°, power 0–1) for sling/fire, use(key, targetX) for air, use(key) for vehicles
    use: function (key, a, p) {
      if (phase !== "ready" || !arsenal[key]) return "not ready";
      selected = key; var kind = UNITS[key].kind;
      if (kind === "drive") launchDrive(key);
      else if (kind === "air") callIn(key, a);
      else {
        var v = topSpeed * p, r = a * Math.PI / 180;
        (kind === "sling" ? launchSling : launchFire)(key, Math.cos(r) * v, -Math.sin(r) * v);
      }
      return this.state;
    },
    tap: function () { special(); return this.state; },
    poke: function (key, dmg) { var d = defenders().filter(function (e) { return e.key === key; })[0]; if (d) damage(d, dmg); return this.report(); },
    endTurn: function () { if (phase === "ready") { phase = "settling"; settleStart = simT; settleStill = 0; } return this.state; },
    report: function (all) {
      return ents.filter(function (e) { return all ? e.type !== "block" : e.type === "defender"; }).map(function (e) {
        var p = pos(e);
        return e.key + (e.hp != null ? " hp " + e.hp.toFixed(1) : "") + " @" + Math.round(p.x) + "," + Math.round(p.y) +
          (e.type === "vehicle" ? " v" + e.body.velocity.x.toFixed(2) + (e.driving ? " driving" : " stopped") : "");
      });
    }
  };

  var saved = store("angrydudes.pack");
  usePack(Math.max(0, PACKS.findIndex(function (p) { return p.id === saved; })));
  loadLevel(0); buildMenu(); show("menu");
  if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"');
  requestAnimationFrame(frame);
})();
