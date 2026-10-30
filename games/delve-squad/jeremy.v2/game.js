// Delve Squad: screens, the arena, effects and controls. The rules live in sim.js.
(function () {
"use strict";
var $ = function (id) { return document.getElementById(id); };
var WALL = DS.WALL, STEP = 1 / 60, L = DS.layout(false), SLOTS = ["weapon", "armor", "charm"];
var KEY = "gameon.delve-squad.";

function load(name, fallback) { try { var v = localStorage.getItem(KEY + name); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
function save(name, value) { try { localStorage.setItem(KEY + name, JSON.stringify(value)); } catch (e) { /* storage blocked: the game still plays */ } }

var S = {
  screen: "title", held: false, paused: false, nextSeed: null, speed: 1, t: 0,
  best: load("best", 0), runs: load("runs", 0),
  picks: [], party: null, seed: 0, floor: 1, floorData: null, roomIndex: 0, battle: null, roomCanvas: null,
  phase: "", phaseT: 0, fade: 0, loot: [], choice: [], sel: 0, cur: -1, pcur: -1, stats: null, lastClasses: null,
  fx: [], texts: [], shake: 0, banner: null, campNote: ""
};

// ---------- screens ----------
var SCREENS = ["title", "party", "gear", "delve"];
function show(name) {
  S.screen = name;
  SCREENS.forEach(function (s) { $(s).hidden = s !== name; });
  $("over").hidden = name !== "over";
  if (name === "over") $("delve").hidden = false;
  $("pause").hidden = true; S.paused = false;
  if (name === "title") renderTitle();
  if (name === "delve") fitArena();
  var first = { title: "start-btn", party: "party-go", gear: "gear-go", over: "again-btn" }[name];
  if (first && $(first) && !$(first).disabled) try { $(first).focus({ preventScroll: true }); } catch (e) { /* old browsers */ }
}
function renderTitle() {
  $("title-best").textContent = S.best ? "Deepest delve: Floor " + S.best : "No delves yet";
  updateSoundButtons();
}
function updateSoundButtons() {
  var on = SND.on();
  $("sound-btn").classList.toggle("off", !on);
  $("pause-sound").textContent = "Sound: " + (on ? "on" : "off");
}

// Cards in a grid sit on whole pixels: whole-pixel columns and rows, so the 8 px between them stays 8 px
// when a phone rounds them, and never comes out 7.
function snapGrid(el) {
  if (!el || !el.offsetParent) return;
  el.style.gridTemplateColumns = ""; el.style.gridAutoRows = "";
  var cs = getComputedStyle(el), n = cs.gridTemplateColumns.split(" ").filter(Boolean).length;
  var gap = parseFloat(cs.columnGap) || 0, w = Math.floor((el.clientWidth - gap * (n - 1)) / n);
  if (!(n > 0 && w > 0)) return;
  el.style.gridTemplateColumns = "repeat(" + n + ", " + w + "px)";
  var rows = [];
  Array.prototype.forEach.call(el.children, function (c, i) { var r = Math.floor(i / n); rows[r] = Math.max(rows[r] || 0, c.getBoundingClientRect().height); });
  el.style.gridAutoRows = rows.map(function (h) { return Math.ceil(h - 0.01) + "px"; }).join(" ");
}
function snapAll() { ["slots", "classes", "heroes", "loot"].forEach(function (id) { snapGrid($(id)); }); }

// ---------- picking the squad ----------
function renderParty() {
  var slots = $("slots"); slots.innerHTML = "";
  for (var i = 0; i < 3; i++) {
    var k = S.picks[i], b = document.createElement("button");
    b.className = "slot" + (k ? " full" : "");
    if (k) {
      var cv = document.createElement("canvas"); cv.width = 128; cv.height = 128; ART.portrait(cv, k);
      b.appendChild(cv);
      b.insertAdjacentHTML("beforeend", '<div class="nm">' + DS.CLASSES[k].name + '</div><div class="x">tap to remove</div>');
      b.setAttribute("aria-label", "Remove " + DS.CLASSES[k].name);
      b.onclick = (function (n) { return function () { S.picks.splice(n, 1); SND.play("click"); renderParty(); }; })(i);
    } else { b.textContent = "Empty"; b.disabled = true; }
    slots.appendChild(b);
  }
  $("party-go").disabled = S.picks.length < 3;
  markClassCursor();
  snapGrid(slots);
}
// The squad screen's keyboard card: WASD or the arrows move it, Space adds that class.
function markClassCursor() {
  Array.prototype.forEach.call($("classes").children, function (b, i) { b.classList.toggle("cur", i === S.pcur); });
}
function moveClassCursor(dx, dy) {
  var n = DS.CLASS_KEYS.length, cols = getComputedStyle($("classes")).gridTemplateColumns.split(" ").filter(Boolean).length || n;
  if (S.pcur < 0) S.pcur = 0;
  else S.pcur = dy ? (S.pcur + dy * cols + n) % n : (S.pcur + dx + n) % n;
  markClassCursor(); SND.play("click");
  var b = $("classes").children[S.pcur]; if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest" });
}
function buildClasses() {
  var box = $("classes"); box.innerHTML = "";
  DS.CLASS_KEYS.forEach(function (k, i) {
    var c = DS.CLASSES[k], b = document.createElement("button");
    b.className = "cls"; b.dataset.cls = k;
    var cv = document.createElement("canvas"); cv.width = 144; cv.height = 144; ART.portrait(cv, k);
    b.innerHTML = '<h3>' + c.name + ' <kbd>' + (i + 1) + '</kbd></h3>';
    b.insertBefore(cv, b.firstChild);
    b.insertAdjacentHTML("beforeend", '<div class="stats">HP ' + c.hp + ' · ATK ' + c.atk + ' · DEF ' + c.def + ' · ' + (c.range ? "ranged" : "melee") + '</div>' +
      '<div class="ab"><b>' + c.ability + ':</b> ' + c.about + '</div>');
    b.onclick = function () { S.pcur = -1; addPick(k); };
    box.appendChild(b);
  });
}
function addPick(k) {
  if (S.picks.length >= 3) S.picks.shift();
  S.picks.push(k); SND.play("click"); renderParty();
}
function randomParty() {
  S.picks = [];
  for (var i = 0; i < 3; i++) S.picks.push(DS.CLASS_KEYS[Math.floor(Math.random() * 4)]);
  SND.play("equip"); renderParty();
}

// ---------- a run ----------
function newRun(classes) {
  S.seed = S.nextSeed != null ? S.nextSeed : Math.floor(Math.random() * 1e9);
  S.nextSeed = null;
  S.lastClasses = classes.slice();
  S.prevBest = S.best;
  S.party = DS.makeParty(classes, DS.rng(S.seed));
  S.floor = 1; S.stats = { rooms: 0, poofs: 0, bosses: 0 };
  S.runs += 1; save("runs", S.runs);
  S.campNote = "Your squad gathers at the top of the stairs.";
  openCampfire();
}
function openCampfire() {
  var afterBoss = S.floor > 1 && DS.isBossFloor(S.floor - 1);
  S.loot = DS.makeLoot(S.seed, S.floor, S.party.length + 2, afterBoss);
  S.choice = S.party.map(function () { return -1; });
  S.sel = 0; S.cur = -1;
  if (S.floor > S.best) { S.best = S.floor; save("best", S.best); }
  show("gear"); renderGear();
}
function statsWith(h, idx) {
  var items = {}; SLOTS.forEach(function (s) { items[s] = h.items[s]; });
  if (idx >= 0) items[S.loot[idx].slot] = S.loot[idx];
  return DS.heroStats(h, items);
}
function renderGear() {
  var theme = DS.themeFor(S.floor), boss = DS.isBossFloor(S.floor);
  $("gear-title").textContent = S.floor === 1 ? "Gear up" : "Campfire";
  $("gear-sub").textContent = "Next: Floor " + S.floor + " · " + theme.name;
  $("gear-tags").innerHTML = (boss ? '<span class="tag boss">☠ Boss floor: ' + DS.bossFor(S.floor).name + '</span>' : '') +
    '<span class="tag">Deepest: Floor ' + S.best + '</span><span class="rest">' + S.campNote + '</span>';
  $("gear-go").textContent = "Delve to Floor " + S.floor;
  var hb = $("heroes"); hb.innerHTML = "";
  S.party.forEach(function (h, i) {
    var cur = DS.heroStats(h), nxt = statsWith(h, S.choice[i]), b = document.createElement("button");
    b.className = "hero" + (i === S.sel ? " sel" : ""); b.dataset.i = i;
    var cv = document.createElement("canvas"); cv.width = 92; cv.height = 92; ART.portrait(cv, h.cls);
    var head = document.createElement("div"); head.className = "head"; head.appendChild(cv);
    head.insertAdjacentHTML("beforeend", '<div><div class="nm">' + h.name + '</div><div class="cl">Lv ' + h.level + ' ' + DS.CLASSES[h.cls].name + '</div></div>');
    b.appendChild(head);
    var hp = Math.min(h.hp, nxt.maxHp);
    function d(a, b2) { return b2 > a ? ' <span class="up">→' + b2 + '</span>' : b2 < a ? ' <span class="down-txt">→' + b2 + '</span>' : ""; }
    b.insertAdjacentHTML("beforeend",
      '<div class="hpbar"><i style="width:' + Math.round(100 * hp / nxt.maxHp) + '%"></i></div>' +
      '<div class="st"><span>HP ' + h.hp + '/' + cur.maxHp + d(cur.maxHp, nxt.maxHp) + '</span><span>ATK ' + cur.atk + d(cur.atk, nxt.atk) + '</span><span>DEF ' + cur.def + d(cur.def, nxt.def) + '</span></div>' +
      '<div class="gear">' + SLOTS.map(function (s) { return h.items[s] ? '<b>' + h.items[s].name + '</b>' : '<i>no ' + s + '</i>'; }).join(" · ") + '</div>' +
      '<div class="new">' + (S.choice[i] >= 0 ? "＋ " + S.loot[S.choice[i]].name : "Pick an item") + '</div>');
    b.onclick = function () { S.sel = i; S.cur = -1; SND.play("click"); renderGear(); };
    hb.appendChild(b);
  });
  var lb = $("loot"); lb.innerHTML = "";
  var sh = S.party[S.sel];
  S.loot.forEach(function (it, j) {
    var owner = S.choice.indexOf(j), b = document.createElement("button");
    b.className = "item " + it.rarity + (owner >= 0 ? (owner === S.sel ? " mine" : " taken") : "") + (j === S.cur ? " cur" : "");
    b.dataset.j = j;
    var cv = document.createElement("canvas"); cv.width = 88; cv.height = 88; ART.itemIcon(cv, it);
    b.appendChild(cv);
    var a = DS.heroStats(sh), c = statsWith(sh, j), parts = [];
    if (c.atk !== a.atk) parts.push((c.atk > a.atk ? "+" : "") + (c.atk - a.atk) + " ATK");
    if (c.def !== a.def) parts.push((c.def > a.def ? "+" : "") + (c.def - a.def) + " DEF");
    if (c.maxHp !== a.maxHp) parts.push((c.maxHp > a.maxHp ? "+" : "") + (c.maxHp - a.maxHp) + " HP");
    var worse = (c.atk < a.atk) || (c.def < a.def && c.atk <= a.atk);
    b.insertAdjacentHTML("beforeend", '<div class="nm">' + it.name + '</div><div class="meta">' + DS.RARITY.filter(function (r) { return r.id === it.rarity; })[0].name + ' ' + it.slot + '</div>' +
      '<div class="lines">' + DS.itemLines(it).join("<br>") + '</div>' +
      '<div class="cmp ' + (worse ? "down-txt" : "up") + '">' + (sh.items[it.slot] ? "For " + sh.name + ": " + (parts.join(", ") || "about the same") : "For " + sh.name + ": new " + it.slot + "!") + '</div>' +
      (owner >= 0 && owner !== S.sel ? '<span class="who">' + S.party[owner].name + '</span>' : "") + '<kbd>' + (j + 1) + '</kbd>');
    b.onclick = function () { S.cur = -1; chooseItem(j); };
    lb.appendChild(b);
  });
  snapGrid(hb); snapGrid(lb);
}
// The campfire's keyboard card: W/S or Up/Down move through the loot, Space gives it to the picked hero.
function moveLootCursor(d) {
  var n = S.loot.length;
  S.cur = S.cur < 0 ? (S.choice[S.sel] >= 0 ? S.choice[S.sel] : 0) : (S.cur + d + n) % n;
  SND.play("click"); renderGear();
  var b = $("loot").children[S.cur]; if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest" });
}
function chooseItem(j) {
  var i = S.sel;
  if (S.choice[i] === j) { S.choice[i] = -1; SND.play("click"); renderGear(); return; }
  var other = S.choice.indexOf(j); if (other >= 0) S.choice[other] = -1;
  S.choice[i] = j; SND.play("equip");
  // move on to the next hero who still needs something
  for (var k = 1; k <= S.party.length; k++) { var n = (i + k) % S.party.length; if (S.choice[n] < 0) { S.sel = n; break; } }
  renderGear();
}
function autoGear() {
  S.choice = S.party.map(function () { return -1; });
  S.party.forEach(function (h, i) {
    var best = -1, bs = 0, a = DS.heroStats(h);
    S.loot.forEach(function (it, j) {
      if (S.choice.indexOf(j) >= 0) return;
      var c = statsWith(h, j), sc = (c.atk - a.atk) * 3 + (c.def - a.def) * 2 + (c.maxHp - a.maxHp) * 0.2 + (it.effect ? 4 + DS.RARITY.map(function (r) { return r.id; }).indexOf(it.rarity) * 2 : 0);
      if (sc > bs) { bs = sc; best = j; }
    });
    S.choice[i] = best;
  });
}

// ---------- the delve ----------
function delve() {
  S.party.forEach(function (h, i) { if (S.choice[i] >= 0) DS.equip(h, S.loot[S.choice[i]]); });
  S.floorData = DS.makeFloor(S.seed, S.floor);
  S.roomIndex = 0;
  show("delve");
  startRoom();
}
function startRoom() {
  var room = S.floorData.rooms[S.roomIndex];
  // a tall phone screen gets a tall room
  var st = $("stage").getBoundingClientRect(), portrait = st.width > 0 && st.height > 0 && st.width / st.height < 0.85;
  L = DS.layout(portrait);
  if (arena.width !== L.W * 2) { arena.width = L.W * 2; arena.height = L.H * 2; dark.width = L.W; dark.height = L.H; }
  fitArena();
  S.roomCanvas = ART.drawRoom(room, S.floorData.theme, L.W, L.H, WALL, 2, portrait);
  S.room = room;
  S.battle = new DS.Battle(S.party, room, S.floor, DS.mix(S.seed, S.floor * 100 + S.roomIndex), portrait);
  S.battle.units.forEach(function (u) {
    if (u.side !== "hero") return;
    if (portrait) { u.homeY = u.y; u.y += 170; } else { u.homeX = u.x; u.x -= 170; }
  });
  S.fx = []; S.texts = [];
  S.phase = "intro"; S.phaseT = 0; S.fade = 1;
  S.banner = room.boss ? { big: room.boss.name, small: "BOSS", color: "#ff6a5a", t: 0, life: 2.4 } :
    S.roomIndex === 0 ? { big: "Floor " + S.floor, small: S.floorData.theme.name, color: "#ffd28a", t: 0, life: 1.8 } : null;
  if (room.boss) SND.play("boss");
  $("d-floor").textContent = "Floor " + S.floor;
  $("d-room").textContent = (room.boss ? "Boss room!" : "Room " + (S.roomIndex + 1) + "/" + S.floorData.rooms.length) + " · " + S.floorData.theme.name;
  ART.drawMinimap($("minimap"), S.floorData, S.roomIndex);
  buildSquad();
}
function buildSquad() {
  var box = $("squad"); box.innerHTML = "";
  S.party.forEach(function (h, i) {
    var d = document.createElement("div"); d.className = "mini"; d.id = "mini-" + i;
    d.innerHTML = '<div class="nm">' + h.name + ' <span>' + DS.CLASSES[h.cls].name + ' ' + h.level + '</span></div><div class="hpbar"><i></i></div><div class="abbar" title="' + DS.CLASSES[h.cls].ability + '"><i></i></div>';
    box.appendChild(d);
  });
  updateSquad();
}
function updateSquad() {
  if (!S.battle) return;
  S.party.forEach(function (h, i) {
    var u = S.battle.units.filter(function (x) { return x.hero === h; })[0], d = $("mini-" + i); if (!d) return;
    var hp = u ? u.hp : 0, max = u ? u.maxHp : DS.heroStats(h).maxHp, out = u ? !u.alive : true;
    d.classList.toggle("out", out);
    d.querySelector(".hpbar i").style.width = Math.max(0, 100 * hp / max) + "%";
    d.querySelector(".abbar i").style.width = u && u.alive ? Math.round(100 * (1 - Math.max(0, u.ab) / u.abMax)) + "%" : "0%";
  });
}

// One fixed step of the delve: walking in, fighting, walking out.
function tick(dt) {
  S.t += dt;
  if (S.screen === "title") return;
  if (S.screen !== "delve" || !S.battle) return;
  S.phaseT += dt;
  if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.life) S.banner = null; }
  S.shake = Math.max(0, S.shake - dt * 2);
  var b = S.battle;
  if (S.phase === "intro") {
    S.fade = Math.max(0, S.fade - dt * 3);
    var done = true;
    b.units.forEach(function (u) {
      if (u.homeX != null && u.x < u.homeX) { u.x = Math.min(u.homeX, u.x + 170 * dt); done = false; }
      if (u.homeY != null && u.y > u.homeY) { u.y = Math.max(u.homeY, u.y - 170 * dt); done = false; }
    });
    if (done && S.phaseT > (S.room.boss ? 1.8 : 1.1)) { S.phase = "fight"; S.phaseT = 0; }
  } else if (S.phase === "fight") {
    b.step(dt);
    if (b.over) {
      b.settle();
      S.phaseT = 0;
      if (b.over === "win") {
        S.stats.rooms += 1;
        if (S.room.boss) S.stats.bosses += 1;
        var last = S.roomIndex === S.floorData.rooms.length - 1;
        S.phase = "clear";
        S.banner = last ? { big: "Floor " + S.floor + " cleared!", small: S.room.boss ? "Boss beaten!" : "Stairs down ahead", color: "#ffd28a", t: 0, life: 2 } :
          { big: "Room cleared!", small: "", color: "#9fe6a8", t: 0, life: 1.2 };
        SND.play(last ? "floor" : "clear");
      } else {
        S.phase = "lost";
        S.banner = { big: "The squad has fallen", small: "Floor " + S.floor, color: "#ff8a7a", t: 0, life: 99 };
        SND.play("lose");
      }
    }
  } else if (S.phase === "clear") {
    if (S.phaseT > 1.1) {
      b.units.forEach(function (u) {
        if (u.side !== "hero" || !u.alive) return;
        if (L.portrait) { u.y -= 200 * dt; u.x += (L.W / 2 - u.x) * dt * 2; }
        else { u.face = 1; u.x += 200 * dt; u.y += (L.H / 2 - u.y) * dt * 2; }
      });
      if (S.phaseT > 1.6) S.fade = Math.min(1, S.fade + dt * 3);
      if (S.phaseT > 2.0) nextRoom();
    }
  } else if (S.phase === "lost") {
    if (S.phaseT > 2.4) gameOver();
  }
  handleEvents();
  updateFx(dt);
}
function nextRoom() {
  if (S.roomIndex < S.floorData.rooms.length - 1) { DS.breather(S.party); S.roomIndex += 1; startRoom(); return; }
  // the floor is done: rest at the campfire, then on to the next one
  var downs = S.party.filter(function (h) { return h.down; }).length;
  DS.campfire(S.party);
  S.floor += 1;
  S.campNote = "Everyone levels up and rests" + (downs ? ", and " + (downs === 1 ? "your fallen hero gets" : "your fallen heroes get") + " back up." : ".");
  S.battle = null;
  SND.play("campfire");
  openCampfire();
}
function gameOver() {
  if (S.floor > S.best) S.best = S.floor;
  save("best", S.best);
  $("over-floor").textContent = "Floor " + S.floor;
  var nb = S.floor > (S.prevBest || 0);
  $("over-best").textContent = nb ? "New deepest delve!" : "Deepest delve: Floor " + S.best;
  $("over-best").className = nb ? "newbest" : "";
  $("st-rooms").textContent = S.stats.rooms; $("st-poofs").textContent = S.stats.poofs; $("st-bosses").textContent = S.stats.bosses;
  var op = $("over-party"); op.innerHTML = "";
  S.party.forEach(function (h) { var cv = document.createElement("canvas"); cv.width = 112; cv.height = 112; ART.portrait(cv, h.cls); cv.title = h.name; op.appendChild(cv); });
  show("over");
}

// ---------- effects ----------
function spark(x, y, color, n, speed, life, size) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
    S.fx.push({ kind: "spark", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: life * (0.6 + Math.random() * 0.6), max: life, color: color, size: size || 3 });
  }
}
function text(x, y, txt, color, size) {
  S.texts.push({ x: x + (Math.random() - 0.5) * 14, y: y, txt: txt, color: color, size: size, life: 0.9, max: 0.9 });
}
function handleEvents() {
  var b = S.battle; if (!b || !b.events.length) return;
  b.events.forEach(function (e) {
    if (e.type === "hit") {
      var big = e.crit || e.big;
      text(e.x, e.y - 8, e.amount + (e.crit ? "!" : ""), e.side === "hero" ? "#ff8a7a" : e.thorns ? "#c8ff6a" : big ? "#ffd84a" : "#ffffff", big ? 30 : 21);
      spark(e.x, e.y + 6, big ? "#ffd84a" : "#fff1c8", big ? 8 : 4, 90, 0.3, 2.5);
      if (big) { S.shake = Math.max(S.shake, 0.25); SND.play("crit"); } else SND.play("hit");
    } else if (e.type === "heal") {
      text(e.x, e.y - 8, "+" + e.amount, "#6ee08a", 20);
      for (var i = 0; i < 5; i++) S.fx.push({ kind: "plus", x: e.x + (Math.random() - 0.5) * 26, y: e.y + 10, vx: 0, vy: -40 - Math.random() * 30, life: 0.8, max: 0.8, color: "#8ff0a4", size: 6 });
      SND.play("heal");
    } else if (e.type === "miss") {
      text(e.x, e.y - 8, "miss", "#b4c8ff", 16);
    } else if (e.type === "poof") {
      S.stats.poofs += 1;
      var col = S.floorData.theme.torch;
      spark(e.x, e.y, "#ffffff", e.boss ? 60 : 14, e.boss ? 220 : 130, e.boss ? 1.2 : 0.7, e.boss ? 5 : 3.5);
      spark(e.x, e.y, col, e.boss ? 50 : 12, e.boss ? 180 : 100, e.boss ? 1.4 : 0.8, 3);
      S.fx.push({ kind: "ring", x: e.x, y: e.y, r: e.r, grow: e.boss ? 220 : 110, life: e.boss ? 0.8 : 0.4, max: e.boss ? 0.8 : 0.4, color: "#fff1c8" });
      text(e.x, e.y - e.r - 10, e.boss ? "POOF!!" : "poof!", "#fff1c8", e.boss ? 40 : 18);
      if (e.boss) S.shake = 0.8;
      SND.play("poof");
    } else if (e.type === "down") {
      text(e.x, e.y - 30, e.name + " is down!", "#ff8a7a", 18);
      spark(e.x, e.y, "#9aa6b5", 12, 80, 0.8, 3);
      SND.play("down");
    } else if (e.type === "cast") {
      if (e.what === "shield") { S.fx.push({ kind: "ring", x: e.x, y: e.y - 6, r: 10, grow: 60, life: 0.4, max: 0.4, color: "#9fd0ff" }); text(e.x, e.y - 50, "Shield Wall!", "#9fd0ff", 16); SND.play("shield"); }
      else if (e.what === "vanish") { spark(e.x, e.y, "#6b5a8a", 14, 70, 0.5, 4); SND.play("vanish"); }
      else if (e.what === "appear") { spark(e.x, e.y, "#c9b8ff", 10, 60, 0.4, 3); text(e.x, e.y - 50, "Shadow Step!", "#c9b8ff", 16); }
      else if (e.what === "heal") { S.fx.push({ kind: "beam", x: e.u.x, y: e.u.y - 20, x2: e.to.x, y2: e.to.y - 10, life: 0.35, max: 0.35, color: "#fff4a8" }); }
      else if (e.what === "fireball") { SND.play("fireball"); }
      else if (e.what === "slam") { S.fx.push({ kind: "ring", x: e.x, y: e.y + 10, r: 20, grow: e.radius * 1.4, life: 0.5, max: 0.5, color: "#ffcf8a", width: 8 }); S.shake = 0.6; text(e.x, e.y - 70, e.name, "#ffb38a", 24); SND.play("slam"); }
      else if (e.what === "breath") { var hs = S.battle.units.filter(function (u) { return u.alive && u.side === "hero"; }), tx = 0, ty = 0;
        hs.forEach(function (u) { tx += u.x / hs.length; ty += u.y / hs.length; });
        S.fx.push({ kind: "breath", x: e.x, y: e.y, tx: hs.length ? tx : 60, ty: hs.length ? ty : e.y, life: 0.9, max: 0.9, color: e.u.kind === "frostwyrm" ? "#9fe0ff" : "#b07cff" }); text(e.x, e.y - 70, e.name, "#ffb38a", 24); S.shake = 0.4; SND.play("roar"); }
      else if (e.what === "roar") { text(e.x, e.y - 70, e.name, "#ffb38a", 22); SND.play("roar"); }
    } else if (e.type === "boom") {
      S.fx.push({ kind: "boom", x: e.x, y: e.y, r: e.radius, life: 0.45, max: 0.45 });
      spark(e.x, e.y, "#ffb347", 18, 160, 0.6, 4); S.shake = Math.max(S.shake, 0.3);
      SND.play("boom");
    } else if (e.type === "summon") {
      spark(e.x, e.y, "#c08cff", 14, 90, 0.6, 3);
    } else if (e.type === "shoot") {
      SND.play("shoot");
    } else if (e.type === "swing") {
      // the hit sound covers it
    }
  });
  b.events.length = 0;
}
function updateFx(dt) {
  S.fx = S.fx.filter(function (p) {
    p.life -= dt;
    if (p.kind === "spark" || p.kind === "plus") { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + (p.kind === "spark" ? 60 * dt : 0); }
    return p.life > 0;
  });
  S.texts = S.texts.filter(function (t) { t.life -= dt; t.y -= 38 * dt; return t.life > 0; });
}

// ---------- drawing the arena ----------
var arena = $("arena"), actx = arena.getContext("2d");
var dark = document.createElement("canvas"); dark.width = L.W; dark.height = L.H;
var dctx = dark.getContext("2d");
function fitArena() {
  var st = $("stage").getBoundingClientRect(), sc = Math.min(st.width / L.W, st.height / L.H);
  if (!(sc > 0)) return;
  arena.style.width = Math.floor(L.W * sc) + "px"; arena.style.height = Math.floor(L.H * sc) + "px";
}
function light(x, y, r, a) {
  var g = dctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(0.55, "rgba(0,0,0," + (a * 0.6) + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
  dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill();
}
function drawArena() {
  var c = actx, b = S.battle, t = S.t;
  c.setTransform(2, 0, 0, 2, 0, 0);
  c.fillStyle = "#000"; c.fillRect(0, 0, L.W, L.H);
  if (!b) return;
  c.save();
  if (S.shake > 0) c.translate((Math.random() - 0.5) * S.shake * 14, (Math.random() - 0.5) * S.shake * 14);
  c.drawImage(S.roomCanvas, 0, 0, L.W, L.H);
  var room = S.room, torch = S.floorData.theme.torch;
  // units, back to front
  var list = b.units.filter(function (u) { return u.alive; }).sort(function (a, b2) { return a.y - b2.y; });
  list.forEach(function (u) { ART.drawUnit(c, u, t); });
  // shots
  b.shots.forEach(function (s) {
    var col = { fireball: "#ff9d3c", holy: "#fff4a8", spark: "#9fe0ff", arrow: "#e6d2a8", ice: "#bfefff", bolt: "#ff7a3c" }[s.kind] || "#fff";
    if (s.kind === "arrow") { var a = Math.atan2(s.ty - s.y, s.tx - s.x); ART.line(c, s.x - Math.cos(a) * 10, s.y - Math.sin(a) * 10, s.x, s.y, col, 2.5); }
    else { ART.circle(c, s.x, s.y, s.kind === "fireball" ? 9 : 4.5, col, s.kind === "fireball" ? "#ffdf6a" : null, 2); ART.circle(c, s.x, s.y, s.kind === "fireball" ? 14 : 7, "rgba(255,255,255,0.15)"); }
  });
  // effects
  S.fx.forEach(function (p) {
    var k = p.life / p.max;
    c.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
    if (p.kind === "spark") { c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    else if (p.kind === "plus") { c.fillStyle = p.color; c.fillRect(p.x - 1.5, p.y - p.size / 2, 3, p.size); c.fillRect(p.x - p.size / 2, p.y - 1.5, p.size, 3); }
    else if (p.kind === "ring") { ART.circle(c, p.x, p.y, p.r + (1 - k) * p.grow, null, p.color, p.width || 4); }
    else if (p.kind === "beam") { ART.line(c, p.x, p.y, p.x2, p.y2, p.color, 6 * k + 2); ART.circle(c, p.x2, p.y2, 22 * (1 - k) + 8, "rgba(255,244,168,0.35)"); }
    else if (p.kind === "boom") { ART.circle(c, p.x, p.y, p.r * (1.1 - k * 0.5), "rgba(255,150,50," + (0.5 * k) + ")", "#ffdf6a", 3); }
    else if (p.kind === "breath") {
      for (var i = 0; i < 26; i++) {
        var f = ((1 - k) * 1.4 + i / 26) % 1, dx = p.tx - p.x, dy = p.ty - p.y, dl = Math.hypot(dx, dy) || 1, sp = Math.sin(i * 2.3) * 120 * f;
        var x = p.x + dx * f * 1.1 - dy / dl * sp, y = p.y + dy * f * 1.1 + dx / dl * sp;
        ART.circle(c, x, y, 10 + f * 22, p.color + "66");
      }
    }
    c.globalAlpha = 1;
  });
  // darkness, with light from torches, heroes and fireballs
  dctx.globalCompositeOperation = "source-over";
  dctx.clearRect(0, 0, L.W, L.H);
  dctx.fillStyle = "rgba(4,2,8,0.8)"; dctx.fillRect(0, 0, L.W, L.H);
  dctx.globalCompositeOperation = "destination-out";
  var flick = 0.92 + Math.sin(t * 11) * 0.04 + Math.sin(t * 17.3) * 0.03;
  (room.torches || []).forEach(function (tr) { light(tr.x, tr.y + (tr.low ? -10 : 14), (tr.low ? 120 : 175) * flick, 1); });
  b.units.forEach(function (u) { if (u.alive && u.side === "hero") light(u.x, u.y - 10, 120, 0.85); else if (u.alive && u.isBoss) light(u.x, u.y, u.r * 3.2, 0.55); else if (u.alive && (u.kind === "wisp" || u.kind === "imp" || u.kind === "emberlich")) light(u.x, u.y, 55, 0.6); });
  b.shots.forEach(function (s) { if (s.kind === "fireball") light(s.x, s.y, 90, 1); else light(s.x, s.y, 30, 0.6); });
  S.fx.forEach(function (p) { if (p.kind === "boom") light(p.x, p.y, p.r * 2, 1); if (p.kind === "breath") light((p.x + p.tx) / 2, (p.y + p.ty) / 2, 260, 0.6 * (p.life / p.max)); });
  dctx.globalCompositeOperation = "source-over";
  c.drawImage(dark, 0, 0, L.W, L.H);
  // warm glow and the flames themselves on top
  c.globalCompositeOperation = "lighter";
  (room.torches || []).forEach(function (tr) {
    var y = tr.y + (tr.low ? -10 : 10), g = c.createRadialGradient(tr.x, y, 0, tr.x, y, 70 * flick);
    g.addColorStop(0, torch + "55"); g.addColorStop(1, torch + "00"); c.fillStyle = g; c.fillRect(tr.x - 80, y - 80, 160, 160);
  });
  c.globalCompositeOperation = "source-over";
  (room.torches || []).forEach(function (tr) { ART.drawTorch(c, tr.x, tr.y, t, torch, tr.low); });
  c.restore();
  // numbers
  S.texts.forEach(function (tx) {
    var k = tx.life / tx.max, sc = k > 0.8 ? 1 + (k - 0.8) * 2.5 : 1;
    c.globalAlpha = Math.min(1, k * 2.2);
    c.font = "900 " + Math.round(tx.size * sc) + "px ui-rounded, 'Trebuchet MS', system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 5; c.strokeStyle = "rgba(0,0,0,0.85)"; c.strokeText(tx.txt, tx.x, tx.y);
    c.fillStyle = tx.color; c.fillText(tx.txt, tx.x, tx.y);
    c.globalAlpha = 1;
  });
  // the boss's health bar
  var boss = b.units.filter(function (u) { return u.isBoss; })[0];
  if (boss) {
    var bw = L.W - 160, bx = 80, by = 12;
    c.fillStyle = "rgba(0,0,0,0.8)"; ART.rrect(c, bx - 3, by - 3, bw + 6, 22, 6); c.fill();
    c.fillStyle = "#5a1414"; c.fillRect(bx, by, bw, 16);
    c.fillStyle = "#ff5a4a"; c.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 16);
    c.font = "900 13px ui-rounded, 'Trebuchet MS', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff";
    c.fillText(boss.name, L.W / 2, by + 8.5);
  }
  // banners
  if (S.banner) {
    var bn = S.banner, a = Math.min(1, bn.t * 4, (bn.life - bn.t) * 3);
    c.globalAlpha = Math.max(0, a);
    c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0, L.H / 2 - 52, L.W, 104);
    c.textAlign = "center"; c.textBaseline = "middle";
    if (bn.small) { c.font = "800 16px ui-rounded, 'Trebuchet MS', sans-serif"; c.fillStyle = "#d8c7ae"; c.fillText(bn.small.toUpperCase(), L.W / 2, L.H / 2 - 26); }
    c.font = "900 " + (bn.big.length > 16 ? 36 : 44) + "px 'Palatino Linotype', Palatino, Georgia, serif";
    c.lineWidth = 6; c.strokeStyle = "#000"; c.strokeText(bn.big, L.W / 2, L.H / 2 + 10);
    c.fillStyle = bn.color; c.fillText(bn.big, L.W / 2, L.H / 2 + 10);
    c.globalAlpha = 1;
  }
  if (S.fade > 0) { c.fillStyle = "rgba(0,0,0," + S.fade + ")"; c.fillRect(0, 0, L.W, L.H); }
}

// ---------- title background ----------
var tcv = $("title-bg"), tctx = tcv.getContext("2d"), embers = [];
function drawTitle() {
  var dpr = Math.min(2, window.devicePixelRatio || 1), w = tcv.clientWidth, h = tcv.clientHeight;
  if (!w || !h) return;
  if (tcv.width !== Math.round(w * dpr) || tcv.height !== Math.round(h * dpr)) { tcv.width = Math.round(w * dpr); tcv.height = Math.round(h * dpr); }
  var c = tctx, t = S.t; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = "#1a1316"; c.fillRect(0, 0, w, h);
  for (var y = 0, row = 0; y < h; y += 26, row++) for (var x = (row % 2) * -24; x < w; x += 48) {
    c.fillStyle = "rgba(255,230,200," + (0.025 + ((x * 7 + y * 13) % 5) * 0.008) + ")"; c.fillRect(x + 2, y + 2, 44, 22);
  }
  var floorY = h * 0.84;
  c.fillStyle = "#0c0809"; c.fillRect(0, floorY, w, h - floorY);
  var torches = [w * 0.12, w * 0.88];
  var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0.2)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  torches.forEach(function (x) {
    var y = h * (w < h ? 0.2 : 0.42), f = 0.9 + Math.sin(t * 9 + x) * 0.06 + Math.sin(t * 15) * 0.04, r = Math.max(w, h) * 0.38 * f;
    c.globalCompositeOperation = "lighter";
    var gg = c.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, "rgba(255,150,60,0.42)"); gg.addColorStop(1, "rgba(255,150,60,0)");
    c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = "source-over";
    c.save(); c.translate(x, y); c.scale(2, 2); ART.drawTorch(c, 0, 0, t, "#ffb347", false); c.restore();
  });
  // the four heroes waiting at the bottom
  // on a short, wide screen the heroes stand at the sides so they don't cover the buttons
  var flank = h < 640 && w > h * 1.2, sc = flank ? Math.min(2, h / 200) : Math.min(2.4, w / 190);
  ["fighter", "rogue", "cleric", "wizard"].forEach(function (k, i) {
    var x = flank ? [w * 0.1, w * 0.21, w * 0.79, w * 0.9][i] : w / 2 + (i - 1.5) * Math.min(90, w / 5.2), yy = floorY + 2;
    c.save(); c.translate(x, yy); c.scale(sc, sc);
    ART.ellipse(c, 0, 12, 14, 4, "rgba(0,0,0,0.5)");
    ART.drawHero(c, k, t + i, 0); c.restore();
  });
  // embers drifting up
  if (embers.length < 40 && Math.random() < 0.3) embers.push({ x: torches[Math.random() < 0.5 ? 0 : 1] + (Math.random() - 0.5) * 20, y: h * (w < h ? 0.18 : 0.4), vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, life: 2 + Math.random() * 2 });
  embers = embers.filter(function (e) { e.life -= 1 / 60; e.x += e.vx / 60 + Math.sin(t * 3 + e.y) * 0.3; e.y += e.vy / 60; c.fillStyle = "rgba(255," + (150 + Math.round(e.life * 30)) + ",80," + Math.min(1, e.life / 2) + ")"; c.fillRect(e.x, e.y, 2.5, 2.5); return e.life > 0; });
}

// ---------- the clock ----------
var acc = 0, lastTime = 0;
function frame(now) {
  var dt = Math.min(0.05, (now - (lastTime || now)) / 1000); lastTime = now;
  if (!S.held && !S.paused) {
    acc += dt * (S.screen === "delve" ? S.speed : 1);
    var n = 0;
    while (acc >= STEP && n < 12) { tick(STEP); acc -= STEP; n++; }
    if (n >= 12) acc = 0;
  }
  render();
  requestAnimationFrame(frame);
}
function render() {
  if (S.screen === "title") drawTitle();
  if (S.screen === "delve" || S.screen === "over") { drawArena(); updateSquad(); }
}
function setSpeed(v) {
  S.speed = v || (S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1);
  $("speed").textContent = S.speed + "×";
}

// ---------- pause ----------
function pause() {
  if (S.screen !== "delve" && S.screen !== "gear") return;
  S.paused = true; $("pause").hidden = false;
  $("pause-where").textContent = "Floor " + S.floor + (S.screen === "delve" ? " · " + $("d-room").textContent : " · at the campfire");
  updateSoundButtons();
  try { $("resume-btn").focus({ preventScroll: true }); } catch (e) { /* old browsers */ }
}
function resume() { S.paused = false; $("pause").hidden = true; }
function toParty(keep) {
  S.picks = keep && S.lastClasses ? S.lastClasses.slice() : [];
  S.pcur = -1;
  S.battle = null; show("party"); renderParty(); snapGrid($("classes"));
}

// ---------- controls ----------
$("start-btn").onclick = function () { SND.play("click"); toParty(false); };
$("sound-btn").onclick = function () { SND.toggle(); updateSoundButtons(); };
$("party-back").onclick = function () { show("title"); };
$("random-btn").onclick = randomParty;
$("party-go").onclick = function () { if (S.picks.length === 3) { SND.play("floor"); newRun(S.picks); } };
$("gear-go").onclick = function () { SND.play("click"); delve(); };
$("gear-menu").onclick = pause;
$("d-menu").onclick = pause;
$("speed").onclick = function () { setSpeed(); SND.play("click"); };
$("resume-btn").onclick = resume;
$("restart-btn").onclick = function () { toParty(true); };
$("pause-sound").onclick = function () { SND.toggle(); updateSoundButtons(); };
$("pause-title").onclick = function () { S.battle = null; show("title"); };
$("again-btn").onclick = function () { SND.play("floor"); newRun(S.lastClasses); };
$("newsquad-btn").onclick = function () { toParty(true); };
$("over-title").onclick = function () { S.battle = null; show("title"); };

// WASD and the arrows, both: [across, down]
var PICK_DIRS = { ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1] };
document.addEventListener("keydown", function (e) {
  var k = e.key;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === "m" || k === "M") { SND.toggle(); updateSoundButtons(); return; }
  if (!$("pause").hidden) {
    if (k === "Escape" || k === "p" || k === "P") { e.preventDefault(); resume(); }
    return;
  }
  if (S.screen === "title") {
    if (k === "Enter" || k === " ") { e.preventDefault(); toParty(false); }
  } else if (S.screen === "party") {
    var pd = PICK_DIRS[k];
    if (pd) { e.preventDefault(); moveClassCursor(pd[0], pd[1]); }
    else if (k === " " && S.pcur >= 0) { e.preventDefault(); addPick(DS.CLASS_KEYS[S.pcur]); }
    else if (/^[1-4]$/.test(k)) addPick(DS.CLASS_KEYS[+k - 1]);
    else if (k === "Backspace" || k === "Delete") { e.preventDefault(); S.picks.pop(); renderParty(); }
    else if (k === "r" || k === "R") randomParty();
    else if (k === "Enter" && S.picks.length === 3) { e.preventDefault(); newRun(S.picks); }
    else if (k === "Escape") show("title");
  } else if (S.screen === "gear") {
    var gd = PICK_DIRS[k];
    if ((gd && gd[0]) || k === "Tab") {
      e.preventDefault();
      S.sel = (S.sel + ((gd && gd[0] < 0) || (k === "Tab" && e.shiftKey) ? S.party.length - 1 : 1)) % S.party.length; SND.play("click"); renderGear();
    } else if (gd && gd[1]) { e.preventDefault(); moveLootCursor(gd[1]); }
    else if (k === " " && S.cur >= 0) { e.preventDefault(); chooseItem(S.cur); }
    else if (/^[1-9]$/.test(k) && +k <= S.loot.length) chooseItem(+k - 1);
    else if (k === "Enter") { e.preventDefault(); delve(); }
    else if (k === "Escape" || k === "p" || k === "P") pause();
  } else if (S.screen === "delve") {
    if (k === " " || k === "f" || k === "F") { e.preventDefault(); setSpeed(); }
    else if (k === "Escape" || k === "p" || k === "P") pause();
  } else if (S.screen === "over") {
    if (k === "Enter") { e.preventDefault(); newRun(S.lastClasses); }
    else if (k === "Escape") show("title");
  }
});
window.addEventListener("resize", function () { if (S.screen === "delve") fitArena(); snapAll(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(snapAll);
document.addEventListener("visibilitychange", function () { if (document.hidden && S.screen === "delve" && !S.paused) pause(); });

// ---------- a small window for the evidence tests ----------
window.__ds = {
  seed: function (n) { S.nextSeed = n; },
  hold: function (on) { S.held = !!on; },
  step: function (sec) { var n = Math.round(sec / STEP); for (var i = 0; i < n; i++) tick(STEP); render(); },
  // Step until the room's fight is over (or the cap), then return how it went.
  fight: function (cap) {
    var n = 0, max = (cap || 300) / STEP;
    while ((S.phase === "intro" || S.phase === "fight") && n++ < max) tick(STEP);
    render(); return S.phase;
  },
  autoGear: function () { autoGear(); renderGear(); },
  // Play quickly through floors (best cards picked for you, fights stepped fast) until the squad reaches floor n.
  toFloor: function (n) {
    while (S.floor < n) {
      autoGear(); delve();
      while (S.screen === "delve" && S.floor < n) { if (S.phase === "intro" || S.phase === "fight") this.fight(); else tick(STEP); }
      if (S.screen !== "gear") return false;
    }
    render(); return true;
  },
  wipe: function () { if (!S.battle) return; S.battle.units.forEach(function (u) { if (u.side === "hero") S.battle.kill(u); }); },
  get state() {
    var b = S.battle;
    return {
      screen: S.screen, phase: S.phase, floor: S.floor, room: S.roomIndex, rooms: S.floorData ? S.floorData.rooms.length : 0,
      boss: !!(S.room && S.room.boss && S.screen === "delve"), best: S.best, paused: S.paused, speed: S.speed, seed: S.seed,
      picks: S.picks.slice(), choice: S.choice.slice(), sel: S.sel, cur: S.cur, pcur: S.pcur, loot: S.loot.map(function (i) { return { name: i.name, slot: i.slot, rarity: i.rarity }; }),
      party: (S.party || []).map(function (h) { var s = DS.heroStats(h); return { cls: h.cls, name: h.name, level: h.level, hp: h.hp, maxHp: s.maxHp, atk: s.atk, down: h.down, items: SLOTS.map(function (k) { return h.items[k] && h.items[k].name; }) }; }),
      monsters: b ? b.units.filter(function (u) { return u.alive && u.side === "monster"; }).map(function (u) { return u.name; }) : [],
      heroesUp: b ? b.units.filter(function (u) { return u.alive && u.side === "hero"; }).length : 0,
      clock: S.t, fightTime: b ? b.t : 0,
      stats: S.stats
    };
  }
};

buildClasses();
renderTitle();
requestAnimationFrame(frame);
})();
