// Ant Farm Wars: screens, controls, sound and saves. The farm itself is in engine.js.
(function () {
  "use strict";
  var E = window.AFW, A = window.AFWArt;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("game"), g = canvas.getContext("2d");
  var KEY = "gameon.ant-farm-wars.";

  // ---- saves (blocked storage just means nothing is remembered) ----
  function load(name, fallback) { try { var v = localStorage.getItem(KEY + name); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function save(name, v) { try { localStorage.setItem(KEY + name, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  var record = load("record", null) || { played: 0, wins: 0, bestPlace: 0, fewestRounds: 0 };
  var soundOn = load("sound", true) !== false;

  // ---- sound: all made here with WebAudio ----
  var ac = null, master = null, musicGain = null, nextNote = 0, noteI = 0, lastSfx = {};
  function audio() {
    if (ac || !soundOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    } catch (e) { ac = null; }
  }
  function tone(freq, dur, type, vol, when, slide, dest) {
    if (!ac || !soundOn) return;
    var t = when || ac.currentTime, o = ac.createOscillator(), v = ac.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(v); v.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  var noiseBuf = null;
  function noise(dur, vol, freq, q, slideTo) {
    if (!ac || !soundOn) return;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); var d = noiseBuf.getChannelData(0); var r = E.rng(7); for (var i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
    var t = ac.currentTime, src = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
    src.buffer = noiseBuf; f.type = "bandpass"; f.frequency.setValueAtTime(freq || 1200, t); f.Q.value = q || 1;
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    v.gain.setValueAtTime(vol || 0.1, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(v); v.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }
  function sfx(name) {
    if (!ac || !soundOn) return;
    var now = ac.currentTime, gap = { bite: 0.09, dig: 0.12, march: 0.2, hatch: 0.15, food: 0.12 }[name] || 0;
    if (gap && lastSfx[name] && now - lastSfx[name] < gap) return;
    lastSfx[name] = now;
    switch (name) {
      case "march": noise(0.03, 0.03, 2600 + Math.random() * 900, 4); break;
      case "dig": noise(0.07, 0.05, 500, 1.5); break;
      case "bite": noise(0.05, 0.08, 1800, 3); tone(260 + Math.random() * 80, 0.05, "square", 0.03); break;
      case "hatch": tone(660, 0.08, "triangle", 0.06, 0, 990); break;
      case "food": tone(1180, 0.06, "sine", 0.05); tone(1580, 0.06, "sine", 0.04, now + 0.05); break;
      case "pick": tone(520, 0.08, "square", 0.07); tone(780, 0.12, "square", 0.07, now + 0.07); break;
      case "fire": noise(0.6, 0.22, 900, 0.8, 200); tone(140, 0.4, "sawtooth", 0.06, 0, 60); break;
      case "glue": tone(300, 0.25, "sine", 0.12, 0, 90); noise(0.15, 0.08, 400, 2); break;
      case "cave": noise(0.9, 0.3, 160, 0.7, 60); tone(70, 0.6, "triangle", 0.15, 0, 40); break;
      case "fly": for (var i = 0; i < 6; i++) tone(220 + i * 30, 0.08, "sawtooth", 0.03, now + i * 0.05); break;
      case "out": [523, 392, 330, 262].forEach(function (f, i) { tone(f, 0.18, "square", 0.08, now + i * 0.12); }); break;
      case "win": [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, 0.2, "square", 0.08, now + i * 0.13); }); break;
      case "lose": [392, 349, 311, 262].forEach(function (f, i) { tone(f, 0.3, "triangle", 0.12, now + i * 0.22); }); break;
      case "tap": tone(880, 0.05, "triangle", 0.05); break;
    }
  }
  // cheerful battle music: a little looping tune
  var MEL = [72, 0, 76, 79, 76, 0, 72, 74, 76, 0, 74, 72, 69, 0, 67, 0, 69, 0, 72, 76, 74, 0, 72, 69, 67, 69, 72, 0, 72, 0, 0, 0];
  var BASS = [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50];
  function music() {
    if (!ac || !soundOn || (mode !== "battle" && mode !== "draft")) return;
    var step = 60 / 140 / 2;
    if (nextNote < ac.currentTime) nextNote = ac.currentTime + 0.05;
    while (nextNote < ac.currentTime + 0.3) {
      var m = MEL[noteI % MEL.length];
      if (m && mode === "battle") tone(440 * Math.pow(2, (m - 69) / 12), step * 0.9, "square", 0.25, nextNote, 0, musicGain);
      if (noteI % 2 === 0) tone(440 * Math.pow(2, (BASS[(noteI / 2) % BASS.length] - 69) / 12), step * 1.6, "triangle", 0.45, nextNote, 0, musicGain);
      nextNote += step; noteI++;
    }
  }

  // ---- state ----
  var s = null, mode = "title", speed = 1, held = false, acc = 0, botOn = false, nextSeed = null;
  var armed = null, mouse = null, panX = 0, panY = 0, view = { sc: 20, ox: 0, oy: 0 }, keys = {}, endTimer = 0, tipTimer = 0, botPickT = 0;

  function newSeed() { return nextSeed !== null ? nextSeed : (Date.now() % 100000) + 1; }

  function startDemo() {
    s = E.create(1234 + Math.floor(Math.random() * 1000), { ai: { player: true } });
    E.pick(s, 0);
  }

  function start() {
    audio();
    s = E.create(newSeed(), { ai: { player: botOn } });
    mode = "draft"; speed = 1; acc = 0; armed = null; panX = 0; panY = 0; endTimer = 0;
    $("title-screen").hidden = true; $("pause-screen").hidden = true; $("end-screen").hidden = true;
    $("hud").hidden = false;
    showDraft(); hud(); powersBar();
    tip("Pick a card to start round 1!");
  }

  // ---- the draft ----
  function showDraft() {
    var d = $("draft"), me = s.colonies[0];
    $("draft-title").textContent = "Round " + s.round + ": pick one";
    $("draft-line").textContent = s.log.length ? "Last round the rivals took: " + s.log.map(function (l) { return s.colonies[l.c].short + " " + E.CARD[l.id].name; }).join(" · ") : "Your rivals pick a card too, but you won't see theirs till the round starts.";
    var box = $("cards"); box.innerHTML = "";
    s.offers.forEach(function (id, i) {
      var c = E.CARD[id], lvl = me.powers[id] || 0;
      var b = document.createElement("button");
      b.className = "pick" + (c.kind === "power" ? " power" : "");
      b.dataset.id = id;
      var cv = document.createElement("canvas"); cv.width = 96; cv.height = 96;
      var cg = cv.getContext("2d"); cg.scale(2.4, 2.4); A.icon(cg, id, 40, me.color);
      var kind = document.createElement("div"); kind.className = "kind"; kind.textContent = c.kind === "power" ? (lvl ? "Power · level " + (lvl + 1) : "Power") : "Upgrade";
      var nm = document.createElement("b"); nm.textContent = c.name;
      var tx = document.createElement("span"); tx.textContent = c.kind === "power" && lvl ? "Stronger and recharges faster." : c.text;
      var k = document.createElement("div"); k.className = "key"; k.textContent = "[" + (i + 1) + "]";
      b.appendChild(kind); b.appendChild(cv); b.appendChild(nm); b.appendChild(tx); b.appendChild(k);
      b.addEventListener("click", function () { choose(i); });
      box.appendChild(b);
    });
    d.hidden = false;
    $("powers").hidden = true;
  }
  function choose(i) {
    if (mode !== "draft" || !s.offers[i]) return;
    audio(); sfx("pick");
    var id = s.offers[i];
    E.pick(s, i);
    $("draft").hidden = true;
    mode = "battle"; acc = 0;
    powersBar(); hud();
    var rivals = s.log.map(function (l) { return s.colonies[l.c].short + ": " + E.CARD[l.id].name; }).join(" · ");
    tip("You took " + E.CARD[id].name + "! " + rivals, 3.5);
    if (s.round === 1) setTimeout(function () { if (mode === "battle" && s.round === 1) tip("Tap a rival's nest to send your soldiers after it." + (view.pannable ? " Drag to look around." : ""), 4); }, 3600);
  }

  // ---- HUD ----
  function hud() {
    if (!s) return;
    $("hud-rn").textContent = s.round;
    $("hud-time").style.width = (s.phase === "battle" ? Math.min(100, s.roundT / E.ROUND_T * 100) : 0) + "%";
    var q = $("queens");
    if (q.children.length !== 4) {
      q.innerHTML = "";
      s.colonies.forEach(function (c) { var d = document.createElement("div"); d.className = "qchip"; d.innerHTML = '<i style="background:' + c.color + '"></i><b>' + c.short + "</b> <span></span>"; q.appendChild(d); });
    }
    s.colonies.forEach(function (c, i) {
      var d = q.children[i];
      d.classList.toggle("out", !c.alive);
      d.lastChild.textContent = c.alive ? Math.max(1, Math.round(c.q.hp / c.q.max * 100)) + (innerWidth > 520 ? "%" : "") : "out";
    });
    $("speed-btn").textContent = speed + "×";
    $("speed-btn").classList.toggle("on", speed > 1);
    $("sound-btn").classList.toggle("on", false);
    $("sound-btn").style.opacity = soundOn ? 1 : 0.45;
    $("sound-btn").setAttribute("aria-pressed", String(soundOn));
  }
  function owned() { var me = s.colonies[0]; return E.POWERS.filter(function (id) { return me.powers[id]; }); }
  function powersBar() {
    var bar = $("powers"), list = owned();
    bar.hidden = mode !== "battle" || !list.length;
    if (bar.dataset.list !== list.join(",") + "|" + list.map(function (id) { return s.colonies[0].powers[id]; }).join(",")) {
      bar.dataset.list = list.join(",") + "|" + list.map(function (id) { return s.colonies[0].powers[id]; }).join(",");
      bar.innerHTML = "";
      list.forEach(function (id, i) {
        var b = document.createElement("button"); b.className = "pw"; b.dataset.id = id; b.setAttribute("aria-label", E.CARD[id].name + " (" + (i + 1) + ")");
        var cv = document.createElement("canvas"); cv.width = 80; cv.height = 80;
        var cg = cv.getContext("2d"); cg.scale(2, 2); A.icon(cg, id, 40, s.colonies[0].color);
        b.innerHTML = '<span class="k">' + (i + 1) + "</span>" + (s.colonies[0].powers[id] > 1 ? '<span class="lv">L' + s.colonies[0].powers[id] + "</span>" : "") + '<div class="cd"></div>';
        b.insertBefore(cv, b.firstChild);
        b.addEventListener("click", function (ev) { ev.stopPropagation(); audio(); arm(id); });
        bar.appendChild(b);
      });
    }
    var me = s.colonies[0];
    Array.prototype.forEach.call(bar.children, function (b) {
      var id = b.dataset.id, cd = me.cd[id] || 0, max = E.POWER_CD[id] * (1 - 0.15 * (me.powers[id] - 1));
      b.querySelector(".cd").style.height = (cd > 0 ? Math.min(100, cd / max * 100) : 0) + "%";
      b.classList.toggle("armed", armed === id);
      b.classList.toggle("ready", cd <= 0);
    });
  }
  function arm(id) {
    if (mode !== "battle") return;
    var me = s.colonies[0];
    if ((me.cd[id] || 0) > 0) { tip(E.CARD[id].name + " is still recharging."); return; }
    armed = armed === id ? null : id;
    if (armed) { sfx("tap"); tip("Now tap the farm for " + E.CARD[id].name + "!", 2.5); }
    powersBar();
  }
  function tip(text, secs) {
    var t = $("tip"); t.textContent = text; t.classList.remove("fade");
    tipTimer = secs || 2.2;
  }

  // ---- layout and the camera ----
  function layout() {
    var dpr = Math.min(2, window.devicePixelRatio || 1), vw = innerWidth, vh = innerHeight;
    if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(vh * dpr)) { canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr); }
    var top = 52, bottom = 80, aw = vw - 16, ah = vh - top - bottom;
    var fit = Math.min(aw / (E.W + 1.4), ah / (E.H + 3));
    var sc = Math.max(fit, Math.min(16, ah / (E.H + 3)));
    var cw = (E.W + 1.4) * sc, ch = (E.H + 3) * sc;
    var bx, by;
    if (cw <= aw) { panX = 0; bx = 8 + (aw - cw) / 2; } else { panX = Math.max(aw - cw, Math.min(0, panX)); bx = 8 + panX; }
    if (ch <= ah) { panY = 0; by = top + (ah - ch) / 2; } else { panY = Math.max(ah - ch, Math.min(0, panY)); by = top + panY; }
    view = { sc: sc, ox: bx + 0.7 * sc, oy: by + 2.3 * sc, dpr: dpr, vw: vw, vh: vh, pannable: cw > aw || ch > ah };
  }
  function toCell(px, py) { return [Math.floor((px - view.ox) / view.sc), Math.floor((py - view.oy) / view.sc)]; }
  function cellCenter(x, y) { return [view.ox + (x + 0.5) * view.sc, view.oy + (y + 0.5) * view.sc]; }
  function onFarm(c) { return c[0] >= 0 && c[1] >= 0 && c[0] < E.W && c[1] < E.H; }

  function tapFarm(px, py) {
    if (mode !== "battle") return;
    audio();
    var c = toCell(px, py);
    if (!onFarm(c)) return;
    if (armed) {
      var id = armed;
      if (E.usePower(s, 0, id, c[0], c[1])) { armed = null; sfx(id); }
      powersBar();
      return;
    }
    var me = s.colonies[0];
    if (me.rally && Math.abs(me.rally[0] - c[0]) <= 1 && Math.abs(me.rally[1] - c[1]) <= 1) {
      E.setRally(s, 0, null); tip("Flag gone: soldiers go back to attacking."); sfx("tap"); return;
    }
    var r = E.setRally(s, 0, c[0], c[1]);
    if (!r) return;
    sfx("tap");
    if (r.attack !== undefined) tip("Attack the " + s.colonies[r.attack].name + "!");
    else if (Math.abs(c[0] - me.q.x) <= 3 && Math.abs(c[1] - me.q.y) <= 2) tip("Soldiers: guard the queen!");
    else tip("Soldiers: gather at the flag! Tap it again to take it away.");
  }

  function usePowerKey(n) {
    var list = owned(), id = list[n];
    if (!id || mode !== "battle") return;
    var me = s.colonies[0];
    if ((me.cd[id] || 0) > 0) { tip(E.CARD[id].name + " is still recharging."); return; }
    var at = null;
    if (mouse) { var c = toCell(mouse[0], mouse[1]); if (onFarm(c)) at = c; }
    if (!at) at = E.aimPower(s, 0, id);
    if (!at && me.target >= 0) { var t = s.colonies[me.target].q; at = [t.x + (t.x < E.W / 2 ? 3 : -3), t.y]; }
    if (!at) at = [me.q.x + 4, me.q.y];
    if (E.usePower(s, 0, id, at[0], at[1])) { sfx(id); armed = null; }
    powersBar();
  }

  // ---- pointer: tap or drag to look around ----
  var down = null;
  canvas.addEventListener("pointerdown", function (e) {
    audio();
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, px: panX, py: panY, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  });
  canvas.addEventListener("pointermove", function (e) {
    mouse = [e.clientX, e.clientY];
    if (!down || down.id !== e.pointerId) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && dx * dx + dy * dy > 64) down.moved = true;
    if (down.moved) { panX = down.px + dx; panY = down.py + dy; }
  });
  canvas.addEventListener("pointerup", function (e) {
    if (!down || down.id !== e.pointerId) return;
    if (!down.moved) tapFarm(e.clientX, e.clientY);
    down = null;
  });
  canvas.addEventListener("pointercancel", function () { down = null; });
  canvas.addEventListener("pointerleave", function () { mouse = null; });

  // ---- keyboard ----
  addEventListener("keydown", function (e) {
    audio();
    var k = e.key;
    keys[k] = true;
    if (k === " " || k.indexOf("Arrow") === 0) e.preventDefault();
    if (mode === "title" && (k === "Enter" || k === " ")) { start(); return; }
    if (mode === "over" && k === "Enter") { start(); return; }
    if (mode === "draft" && k >= "1" && k <= "3") { choose(Number(k) - 1); return; }
    if (mode === "battle" && k >= "1" && k <= "4") { usePowerKey(Number(k) - 1); return; }
    if (k === "Escape" && armed) { armed = null; powersBar(); return; }
    if ((k === "p" || k === "P" || k === "Escape") && (mode === "battle" || mode === "draft" || mode === "paused")) { togglePause(); return; }
    if (k === " " && mode === "battle") { setSpeed(speed === 1 ? 2 : speed === 2 ? 3 : 1); return; }
    if (k === "m" || k === "M") toggleSound();
  });
  addEventListener("keyup", function (e) { keys[e.key] = false; });

  function setSpeed(v) { speed = v; hud(); }
  var pausedFrom = "battle";
  function togglePause() {
    if (mode === "paused") { mode = pausedFrom; $("pause-screen").hidden = true; return; }
    pausedFrom = mode; mode = "paused"; $("pause-screen").hidden = false;
  }
  function toggleSound() {
    soundOn = !soundOn; save("sound", soundOn);
    if (soundOn) audio();
    if (master) master.gain.value = soundOn ? 0.5 : 0;
    hud();
  }
  function toTitle() {
    mode = "title"; $("pause-screen").hidden = true; $("end-screen").hidden = true; $("draft").hidden = true;
    $("hud").hidden = true; $("powers").hidden = true; $("title-screen").hidden = false;
    bestLine(); startDemo();
  }
  function bestLine() {
    var t = record.played ? (record.wins ? "Best: won in " + record.fewestRounds + " round" + (record.fewestRounds === 1 ? "" : "s") + " · " + record.wins + " win" + (record.wins === 1 ? "" : "s") + " in " + record.played + " battle" + (record.played === 1 ? "" : "s")
      : "Best: " + ["", "1st", "2nd", "3rd", "4th"][record.bestPlace] + " place in " + record.played + " battle" + (record.played === 1 ? "" : "s")) : "No battles yet.";
    $("title-best").textContent = t;
    return t;
  }

  $("play-btn").addEventListener("click", start);
  $("pause-btn").addEventListener("click", function () { if (mode !== "title" && mode !== "over") togglePause(); });
  $("resume-btn").addEventListener("click", togglePause);
  $("restart-btn").addEventListener("click", start);
  $("pause-title-btn").addEventListener("click", toTitle);
  $("again-btn").addEventListener("click", start);
  $("end-title-btn").addEventListener("click", toTitle);
  $("speed-btn").addEventListener("click", function () { if (mode === "battle") setSpeed(speed === 1 ? 2 : speed === 2 ? 3 : 1); });
  $("sound-btn").addEventListener("click", toggleSound);

  // ---- the game ending ----
  function finish() {
    mode = "over"; armed = null;
    var me = s.colonies[0], won = s.winner === 0, place = me.out || 1;
    record.played++;
    if (won) { record.wins++; record.fewestRounds = record.fewestRounds ? Math.min(record.fewestRounds, s.round) : s.round; }
    record.bestPlace = record.bestPlace ? Math.min(record.bestPlace, place) : place;
    save("record", record);
    $("end-big").textContent = won ? "You win!" : "Knocked out!";
    $("end-big").classList.toggle("lose", !won);
    $("end-line").textContent = won ? "The Gold Colony rules the whole ant farm, in " + s.round + " round" + (s.round === 1 ? "" : "s") + "!" : "Your queen's chamber was taken in round " + s.round + ". You came " + ["", "1st", "2nd", "3rd", "4th"][place] + ".";
    var order = s.colonies.slice().sort(function (a, b) { return (a.out || 1) - (b.out || 1); });
    $("places").innerHTML = "";
    order.forEach(function (c) {
      var d = document.createElement("div");
      d.innerHTML = "<span>" + ["", "1st", "2nd", "3rd", "4th"][c.out || 1] + '</span><i style="background:' + c.color + '"></i><span></span>';
      d.lastChild.textContent = c.name + (c.i === 0 ? " (you)" : "") + " · " + c.kills + " enemy ants beaten";
      $("places").appendChild(d);
    });
    $("end-best").textContent = bestLine();
    $("end-screen").hidden = false; $("powers").hidden = true; $("draft").hidden = true;
  }

  // ---- events from the farm: sounds and messages ----
  function events() {
    var ev = s.events; s.events = [];
    ev.forEach(function (e) {
      if (mode === "title") return;
      var mine = e.c === 0;
      switch (e.type) {
        case "dig": if (mine) sfx("dig"); break;
        case "bite": sfx("bite"); break;
        case "hatch": if (mine) sfx("hatch"); break;
        case "food": if (mine) sfx("food"); break;
        case "power": if (!mine) { sfx(e.id); tip(s.colonies[e.c].short + " used " + E.CARD[e.id].name + "!", 1.8); } break;
        case "queenbite": if (e.q === 0 && Math.random() < 0.15) tip("Your queen is under attack!", 1.5); break;
        case "out": if (e.c !== 0) { sfx("out"); tip("The " + s.colonies[e.c].name + " are knocked out!", 3); } break;
        case "win": sfx("win"); endTimer = 1.6; break;
        case "lose": sfx("lose"); endTimer = 1.6; break;
        case "round": break;
      }
    });
  }

  // ---- main loop ----
  var last = performance.now(), marchT = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    // keyboard panning
    var pan = 600 * dt;
    if (keys.ArrowLeft) panX += pan; if (keys.ArrowRight) panX -= pan; if (keys.ArrowUp) panY += pan; if (keys.ArrowDown) panY -= pan;
    layout();
    if (mode === "title") {
      E.step(s); E.step(s);
      if (s.phase === "draft") E.pick(s, E.choose(s, 0, s.offers, "smart"));
      if (s.over) startDemo();
      s.events = [];
    } else if (mode === "battle" && !held) {
      acc += dt * speed;
      var n = 0;
      while (acc >= E.DT && n++ < 12) { E.step(s); acc -= E.DT; if (s.phase !== "battle") break; }
      after();
      marchT -= dt;
      if (marchT <= 0) { sfx("march"); marchT = 0.25; }
    } else if (mode === "draft" && botOn && !held) {
      botPickT -= dt;
      if (botPickT <= 0) { botPickT = 0.4; choose(E.choose(s, 0, s.offers, "smart")); }
    } else if (mode === "over") {
      E.step(s);
    }
    if (endTimer > 0 && mode === "battle") { endTimer -= dt; }
    if (tipTimer > 0) { tipTimer -= dt; if (tipTimer <= 0) $("tip").classList.add("fade"); }
    music();
    draw(now);
    requestAnimationFrame(frame);
  }
  function after() {
    events();
    if (s.over && mode === "battle") { if (endTimer <= 0 || held) finish(); else { /* let the boom play */ } }
    else if (s.phase === "draft" && mode === "battle") { mode = "draft"; armed = null; showDraft(); sfx("pick"); }
    hud(); if (mode === "battle") powersBar();
  }
  function draw(now) {
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    g.fillStyle = "#2b1d14"; g.fillRect(0, 0, view.vw, view.vh);
    g.fillStyle = "rgba(255,201,60,0.06)";
    for (var y = 0; y < view.vh; y += 46) for (var x = (y / 46) % 2 ? 23 : 0; x < view.vw; x += 46) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    if (!s) return;
    var aim = null;
    if (armed && mouse) { var c = toCell(mouse[0], mouse[1]); if (onFarm(c)) aim = cellCenter(c[0], c[1]); }
    A.farm(g, s, view, now, mode === "title" ? null : { aim: aim });
  }

  // ---- a small window for the evidence tests ----
  window.__afw = {
    get state() { return s; }, get mode() { return mode; }, get speed() { return speed; }, get view() { return view; },
    get record() { return record; }, E: E,
    seed: function (n) { nextSeed = n; }, start: start, pick: choose,
    hold: function (b) { held = !!b; },
    step: function (secs) { var n = Math.round(secs / E.DT); for (var i = 0; i < n; i++) { E.step(s); if (s.phase !== "battle") break; } after(); },
    bot: function (on) { botOn = !!on; if (s) s.ai.player = botOn; },
    cellCenter: cellCenter, toCell: toCell
  };

  addEventListener("resize", layout);
  hud(); bestLine(); startDemo(); layout();
  requestAnimationFrame(frame);
})();
