// Delve Squad: the pictures. Heroes, monsters, bosses, loot icons and rooms, all drawn with
// canvas shapes (no image files), so everything stays chunky and readable at phone size.
(function (root) {
"use strict";
var TAU = Math.PI * 2;

function circle(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill, stroke, lw) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function poly(ctx, pts, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function line(ctx, x1, y1, x2, y2, color, w) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = w || 2; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.stroke();
}
function eyes(ctx, x, y, gap, r, color) {
  circle(ctx, x - gap, y, r, color || "#fff"); circle(ctx, x + gap, y, r, color || "#fff");
}
var OUT = "#140c10";

// ---------- heroes ----------
// Each drawing is centred on (0,0), facing right, about 34 px tall at scale 1.
function drawHero(ctx, kind, t, swing) {
  var bob = Math.sin(t * 6) * 1.2, sw = swing > 0 ? Math.sin((0.22 - swing) / 0.22 * Math.PI) : 0;
  ctx.save(); ctx.translate(0, bob);
  if (kind === "fighter") {
    // sword behind
    ctx.save(); ctx.translate(9, -2); ctx.rotate(-0.9 + sw * 1.8);
    line(ctx, 0, 0, 0, -22, "#dfe6ef", 4); line(ctx, -5, -3, 5, -3, "#c9a24a", 3); ctx.restore();
    rrect(ctx, -11, -10, 22, 22, 7); ctx.fillStyle = "#4f7fc8"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, 0, -15, 9, "#f1c89a", OUT, 2.5);
    ctx.beginPath(); ctx.arc(0, -16, 10, Math.PI, 0); ctx.fillStyle = "#9aa6b5"; ctx.fill(); ctx.stroke();
    line(ctx, 0, -26, 0, -20, "#c8443a", 3);
    circle(ctx, 3, -14, 1.6, OUT);
    // shield in front
    ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(18, -6); ctx.lineTo(18, 4); ctx.quadraticCurveTo(12, 13, 12, 13); ctx.quadraticCurveTo(6, 8, 6, 4); ctx.closePath();
    ctx.fillStyle = "#2c4f8c"; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    line(ctx, 12, -4, 12, 9, "#ffd25a", 2.5); line(ctx, 8, 0, 16, 0, "#ffd25a", 2.5);
  } else if (kind === "rogue") {
    ctx.save(); ctx.translate(-8, 2); ctx.rotate(0.6 - sw * 0.8); line(ctx, 0, 0, -2, -12, "#cfd8e0", 3); ctx.restore();
    rrect(ctx, -10, -9, 20, 20, 6); ctx.fillStyle = "#2f6b45"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, 0, -14, 8.5, "#e9bf8f", OUT, 2.5);
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(-8, -30, 4, -26); ctx.quadraticCurveTo(12, -22, 10, -12); ctx.quadraticCurveTo(4, -18, -10, -12); ctx.closePath();
    ctx.fillStyle = "#245236"; ctx.fill(); ctx.stroke();
    rrect(ctx, -3, -17, 12, 4, 2); ctx.fillStyle = "#1a1a1a"; ctx.fill();
    circle(ctx, 5, -15, 1.5, "#fff");
    ctx.save(); ctx.translate(10, 0); ctx.rotate(-0.4 + sw * 1.6); line(ctx, 0, 0, 0, -14, "#e6eef5", 3); line(ctx, -3, 0, 3, 0, "#6b4a2a", 3); ctx.restore();
  } else if (kind === "cleric") {
    ctx.save(); ctx.translate(10, 0); ctx.rotate(-0.5 + sw * 1.2); line(ctx, 0, 4, 0, -16, "#8a6a3a", 3); circle(ctx, 0, -18, 4.5, "#ffd25a", OUT, 2); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-11, 13); ctx.lineTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(11, 13); ctx.closePath();
    ctx.fillStyle = "#efe8da"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    line(ctx, 0, -6, 0, 11, "#d4a637", 3); line(ctx, -5, -1, 5, -1, "#d4a637", 3);
    circle(ctx, 0, -14, 8.5, "#f3cfa5", OUT, 2.5);
    ctx.beginPath(); ctx.arc(0, -16, 9, Math.PI * 1.05, -0.05); ctx.fillStyle = "#c8b08a"; ctx.fill();
    circle(ctx, 3, -13, 1.5, OUT);
    ctx.save(); ctx.globalAlpha = 0.85; ellipse(ctx, 0, -26, 8, 2.6, null, "#ffe27a", 2.2); ctx.restore();
  } else if (kind === "wizard") {
    ctx.save(); ctx.translate(11, 2); ctx.rotate(-0.2 + sw * 0.6); line(ctx, 0, 10, 0, -22, "#7a5232", 3.5);
    circle(ctx, 0, -24, 5, "#7fe0ff", OUT, 2); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-11, 13); ctx.lineTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(11, 13); ctx.closePath();
    ctx.fillStyle = "#5b3ea8"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, -3, 3, 1.6, "#ffd25a"); circle(ctx, 4, 7, 1.3, "#ffd25a");
    circle(ctx, 0, -13, 8, "#f1c89a", OUT, 2.5);
    ctx.beginPath(); ctx.moveTo(-4, -9); ctx.quadraticCurveTo(0, 2, 4, -9); ctx.fillStyle = "#e8e8f0"; ctx.fill();
    circle(ctx, 3, -14, 1.5, OUT);
    poly(ctx, [-12, -17, 12, -17, 2, -38, -3, -30], "#4a2f8f", OUT, 2.5);
    circle(ctx, 0, -27, 1.8, "#ffd25a");
  }
  ctx.restore();
}

// ---------- monsters ----------
function drawMonster(ctx, kind, t, swing, r) {
  var s = r / 13, sw = swing > 0 ? Math.sin((0.22 - swing) / 0.22 * Math.PI) : 0;
  ctx.save(); ctx.scale(s, s);
  if (kind === "rat" || kind === "ratking") {
    var wig = Math.sin(t * 14) * 3;
    ctx.beginPath(); ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-22, 2 + wig, -26, -6); ctx.lineWidth = 2.5; ctx.strokeStyle = "#e6a5a5"; ctx.stroke();
    ellipse(ctx, -1, 2, 14, 9, "#8d7f72", OUT, 2.5);
    ellipse(ctx, 10 + sw * 4, -1, 7, 6, "#9c8e80", OUT, 2.5);
    circle(ctx, 5, -8, 4, "#e6a5a5", OUT, 2);
    circle(ctx, 17 + sw * 4, -1, 2, "#ff8fa0");
    circle(ctx, 11 + sw * 4, -3, 1.8, "#ff3b3b");
    if (kind === "ratking") poly(ctx, [2, -10, 4, -18, 7, -12, 10, -19, 12, -12, 15, -17, 15, -9], "#ffd25a", OUT, 1.5);
  } else if (kind === "bat") {
    var flap = Math.sin(t * 22) * 0.6;
    ctx.save(); ctx.rotate(flap); poly(ctx, [-3, -2, -22, -10, -16, 0, -20, 6, -4, 3], "#4a3a6a", OUT, 2); ctx.restore();
    ctx.save(); ctx.rotate(-flap); poly(ctx, [3, -2, 22, -10, 16, 0, 20, 6, 4, 3], "#4a3a6a", OUT, 2); ctx.restore();
    circle(ctx, 0, 0, 7, "#5b4a80", OUT, 2.5);
    poly(ctx, [-5, -5, -4, -12, -1, -6], "#5b4a80", OUT, 1.5); poly(ctx, [5, -5, 4, -12, 1, -6], "#5b4a80", OUT, 1.5);
    eyes(ctx, 0, -1, 2.8, 1.6, "#ffe14a");
  } else if (kind === "slime") {
    var sq = 1 + Math.sin(t * 5) * 0.08;
    ctx.save(); ctx.scale(1 / sq, sq);
    ctx.beginPath(); ctx.moveTo(-15, 9); ctx.quadraticCurveTo(-16, -14, 0, -14); ctx.quadraticCurveTo(16, -14, 15, 9); ctx.closePath();
    ctx.fillStyle = "rgba(110,224,120,0.9)"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    ellipse(ctx, -6, -7, 4, 2.5, "rgba(255,255,255,0.6)");
    eyes(ctx, 3, -3, 4, 2.6, "#fff"); eyes(ctx, 4, -3, 4, 1.3, OUT);
    ctx.restore();
  } else if (kind === "skeleton" || kind === "boneking") {
    ctx.save(); ctx.translate(9, 0); ctx.rotate(-0.8 + sw * 1.8); line(ctx, 0, 0, 0, -18, "#b9b1a0", 3.5); ctx.restore();
    rrect(ctx, -7, -6, 14, 17, 4); ctx.fillStyle = "#2a2226"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    for (var i = 0; i < 3; i++) line(ctx, -5, -2 + i * 4, 5, -2 + i * 4, "#eeeadf", 2);
    circle(ctx, 0, -13, 8.5, "#eeeadf", OUT, 2.5);
    circle(ctx, -3, -13, 2.4, "#2a1a1a"); circle(ctx, 3.5, -13, 2.4, "#2a1a1a");
    circle(ctx, -3, -13, 0.9, "#7af0ff"); circle(ctx, 3.5, -13, 0.9, "#7af0ff");
    line(ctx, -3, -7, 3, -7, "#2a1a1a", 1.5);
    if (kind === "boneking") {
      poly(ctx, [-8, -19, -8, -28, -4, -23, 0, -30, 4, -23, 8, -28, 8, -19], "#ffd25a", OUT, 1.5);
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-16, 14); ctx.lineTo(-4, 11); ctx.closePath(); ctx.fillStyle = "#7a1f2b"; ctx.fill();
    }
  } else if (kind === "archer") {
    ctx.save(); ctx.translate(10, -3); ctx.beginPath(); ctx.arc(0, 0, 11, -1.2, 1.2); ctx.lineWidth = 2.5; ctx.strokeStyle = "#8a5a2a"; ctx.stroke();
    line(ctx, 4 - sw * 5, -10, 4 - sw * 5, 10, "#ddd", 1); ctx.restore();
    rrect(ctx, -8, -6, 16, 16, 5); ctx.fillStyle = "#6b4a2a"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, 0, -12, 8, "#7fb35a", OUT, 2.5);
    poly(ctx, [-6, -14, -16, -18, -7, -9], "#7fb35a", OUT, 2); poly(ctx, [6, -14, 16, -18, 7, -9], "#7fb35a", OUT, 2);
    eyes(ctx, 1, -13, 3, 1.8, "#ffe14a");
  } else if (kind === "ghost" || kind === "shade") {
    var fl = Math.sin(t * 4) * 2, col = kind === "ghost" ? "rgba(230,240,255,0.82)" : "rgba(110,70,170,0.85)";
    ctx.translate(0, fl);
    ctx.beginPath(); ctx.moveTo(-12, 10); ctx.quadraticCurveTo(-13, -16, 0, -16); ctx.quadraticCurveTo(13, -16, 12, 10);
    for (var k = 0; k < 4; k++) ctx.quadraticCurveTo(9 - k * 6, 15 + Math.sin(t * 8 + k) * 2, 6 - k * 6, 10);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    if (kind === "ghost") { ellipse(ctx, -3, -5, 2.5, 3.5, OUT); ellipse(ctx, 5, -5, 2.5, 3.5, OUT); ellipse(ctx, 1, 3, 3, 2, OUT); }
    else { eyes(ctx, 1, -5, 4, 2.2, "#ff5ad8"); }
  } else if (kind === "spider") {
    for (var l = 0; l < 4; l++) {
      var a = Math.sin(t * 16 + l) * 2;
      line(ctx, -2, 0, -15, -9 + l * 6 + a, "#2a1e2a", 2.5); line(ctx, 2, 0, 15, -9 + l * 6 - a, "#2a1e2a", 2.5);
    }
    ellipse(ctx, -4, 2, 9, 8, "#3b2a3f", OUT, 2.5);
    circle(ctx, 6, -1, 6, "#4b3650", OUT, 2.5);
    circle(ctx, 8, -3, 1.4, "#ff4a4a"); circle(ctx, 9, 0, 1.4, "#ff4a4a"); circle(ctx, 5, -3, 1.2, "#ff4a4a");
    ellipse(ctx, -5, 1, 3, 2, "#c84a6a");
  } else if (kind === "wisp") {
    var p = 1 + Math.sin(t * 7) * 0.1;
    circle(ctx, 0, 0, 13 * p, "rgba(140,220,255,0.25)");
    circle(ctx, 0, 0, 8 * p, "#bfefff", "#5ab8e8", 2);
    poly(ctx, [-6, 2, 0, 16, 6, 2], "rgba(140,220,255,0.6)");
    eyes(ctx, 0, -1, 3, 1.5, "#1a3a5a");
  } else if (kind === "imp" || kind === "emberlich") {
    if (kind === "emberlich") {
      ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(14, 14); ctx.closePath();
      ctx.fillStyle = "#3a1830"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.save(); ctx.translate(13, 0); line(ctx, 0, 12, 0, -24, "#5a3a2a", 3);
      circle(ctx, 0, -27, 5 + Math.sin(t * 9), "#ff9d3c", "#ffdf6a", 2); ctx.restore();
      circle(ctx, 0, -14, 8.5, "#eeeadf", OUT, 2.5);
      circle(ctx, -3, -14, 2.3, "#ff7a3c"); circle(ctx, 3.5, -14, 2.3, "#ff7a3c");
      poly(ctx, [-10, -18, -6, -32 - Math.sin(t * 11) * 2, -1, -22, 3, -34 + Math.sin(t * 13) * 2, 6, -21, 10, -30, 10, -18], "rgba(255,140,40,0.9)");
    } else {
      poly(ctx, [-6, 6, -14, 12, -10, 2], "#b8332a", OUT, 1.5);
      circle(ctx, 0, 1, 9, "#d9412f", OUT, 2.5);
      poly(ctx, [-6, -6, -9, -14, -2, -8], "#ffd2a0", OUT, 1.5); poly(ctx, [6, -6, 9, -14, 2, -8], "#ffd2a0", OUT, 1.5);
      eyes(ctx, 2, -1, 3.5, 2, "#ffe14a");
      circle(ctx, 12, -4, 3.5 + Math.sin(t * 12), "#ffb347");
    }
  } else if (kind === "golem") {
    rrect(ctx, -14, -12, 28, 24, 5); ctx.fillStyle = "#7d7a74"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    rrect(ctx, -8, -22, 16, 12, 4); ctx.fillStyle = "#8d8a83"; ctx.fill(); ctx.stroke();
    rrect(ctx, 12 + sw * 4, -6, 9, 14, 3); ctx.fillStyle = "#6c6963"; ctx.fill(); ctx.stroke();
    line(ctx, -8, -2, 0, 4, "#5a5752", 2); line(ctx, 4, -8, 8, 2, "#5a5752", 2);
    eyes(ctx, 0, -16, 3.5, 1.8, "#8fe3ff");
  } else if (kind === "ogre") {
    ctx.save(); ctx.translate(14, 0); ctx.rotate(-0.9 + sw * 1.8); line(ctx, 0, 0, 0, -20, "#6b4a2a", 4); circle(ctx, 0, -21, 5, "#5a3a20", OUT, 2); ctx.restore();
    ellipse(ctx, 0, 2, 15, 13, "#7a8a4a", OUT, 2.5);
    rrect(ctx, -10, 2, 20, 9, 3); ctx.fillStyle = "#6b4a2a"; ctx.fill();
    circle(ctx, 2, -13, 9, "#8a9a55", OUT, 2.5);
    eyes(ctx, 3, -15, 3.2, 1.6, "#ffe14a");
    poly(ctx, [-1, -8, 0, -11, 1, -8], "#fff"); poly(ctx, [5, -8, 6, -11, 7, -8], "#fff");
  } else if (kind === "frostwyrm" || kind === "shadowdragon") {
    var body = kind === "frostwyrm" ? "#7ec8ee" : "#4a2f7a", belly = kind === "frostwyrm" ? "#dff4ff" : "#8a6ac8";
    var wing = Math.sin(t * 3) * 0.25;
    if (kind === "shadowdragon") {
      ctx.save(); ctx.rotate(-wing); poly(ctx, [-4, -6, -26, -26, -22, -8, -30, -10, -18, 6], "#3a2266", OUT, 2); ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-18, 10); ctx.quadraticCurveTo(-26, 0 + Math.sin(t * 4) * 3, -30, 12); ctx.lineWidth = 6; ctx.strokeStyle = body; ctx.lineCap = "round"; ctx.stroke();
    ellipse(ctx, -4, 4, 16, 11, body, OUT, 2.5);
    ellipse(ctx, -2, 7, 10, 5, belly);
    ctx.save(); ctx.translate(12, -10); ctx.rotate(-0.2 + sw * 0.3);
    ellipse(ctx, 0, 0, 11, 8, body, OUT, 2.5);
    poly(ctx, [-4, -6, -10, -18, -1, -8], belly, OUT, 1.5); poly(ctx, [2, -7, 2, -19, 6, -7], belly, OUT, 1.5);
    circle(ctx, 4, -2, 2.2, kind === "frostwyrm" ? "#0a3a6a" : "#ff5ad8");
    line(ctx, 6, 4, 11, 3, OUT, 1.5);
    ctx.restore();
  } else {
    circle(ctx, 0, 0, 12, "#888", OUT, 2);
  }
  ctx.restore();
}

function drawUnit(ctx, u, t) {
  ctx.save();
  ctx.translate(u.x, u.y);
  var ground = u.fly ? 14 : 4;
  ellipse(ctx, 0, u.r * 0.75 + ground * 0.2, u.r * 0.95, u.r * 0.35, "rgba(0,0,0,0.45)");
  if (u.fly) ctx.translate(0, -ground);
  if (u.shield > 0) {
    ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 10);
    circle(ctx, 0, -6, u.r + 11, "rgba(120,180,255,0.25)", "#9fd0ff", 3); ctx.restore();
  }
  ctx.scale(u.face || 1, 1);
  var sc = u.side === "hero" ? 1.25 : 1.15;
  ctx.scale(sc, sc);
  if (u.side === "hero") drawHero(ctx, u.kind, t + u.id, u.swing);
  else drawMonster(ctx, u.kind, t + u.id * 0.7, u.swing, u.r);
  if (u.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, u.flash * 5); ctx.globalCompositeOperation = "lighter";
    circle(ctx, 0, -4, u.r * 0.95 / sc, "#ffffff");
  }
  ctx.restore();
  if (u.stun > 0) {
    for (var i = 0; i < 3; i++) {
      var a = t * 6 + i * TAU / 3;
      ctx.fillStyle = "#ffe14a"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("★", u.x + Math.cos(a) * 12, u.y - u.r * 1.6 - 8 + Math.sin(a) * 4);
    }
  }
  // little health bar
  if (!u.isBoss && u.alive) {
    var w = Math.max(26, u.r * 2.2), y = u.y - u.r * (u.side === "hero" ? 2.6 : 2.0) - (u.fly ? 14 : 0) - 6;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(u.x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = u.side === "hero" ? "#6ee08a" : "#ff6a5a";
    ctx.fillRect(u.x - w / 2, y, w * Math.max(0, u.hp / u.maxHp), 4);
  }
}

// A portrait for the menus.
function portrait(canvas, kind, isHero) {
  var ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  var g = ctx.createRadialGradient(w / 2, h * 0.55, 2, w / 2, h * 0.55, w * 0.55);
  g.addColorStop(0, "rgba(255,170,80,0.35)"); g.addColorStop(1, "rgba(255,170,80,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(w / 2, h * 0.66); var s = w / 44; ctx.scale(s, s);
  if (isHero !== false) drawHero(ctx, kind, 0, 0); else drawMonster(ctx, kind, 0, 0, 13);
  ctx.restore();
}

// ---------- loot icons ----------
var RCOL = { common: "#cfc7b8", rare: "#4fa8ff", epic: "#c07cff", legendary: "#ffbf2e" };
function itemIcon(canvas, it) {
  var ctx = canvas.getContext("2d"), w = canvas.width, c = RCOL[it.rarity];
  ctx.clearRect(0, 0, w, w);
  ctx.save(); ctx.scale(w / 40, w / 40); ctx.translate(20, 20);
  var g = ctx.createRadialGradient(0, 0, 1, 0, 0, 20); g.addColorStop(0, c + "66"); g.addColorStop(1, c + "00");
  ctx.fillStyle = g; ctx.fillRect(-20, -20, 40, 40);
  var n = it.name;
  if (it.slot === "weapon") {
    ctx.rotate(-0.75);
    if (/Staff|Wand/.test(n)) { line(ctx, 0, 14, 0, -10, "#8a5a32", 3.5); circle(ctx, 0, -12, 5, c, OUT, 2); }
    else if (/Axe/.test(n)) { line(ctx, 0, 14, 0, -14, "#8a5a32", 3.5); ctx.beginPath(); ctx.moveTo(1, -13); ctx.quadraticCurveTo(14, -12, 12, 0); ctx.lineTo(1, -4); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); }
    else if (/Mace|Hammer/.test(n)) { line(ctx, 0, 14, 0, -8, "#8a5a32", 3.5); if (/Hammer/.test(n)) { rrect(ctx, -8, -16, 16, 9, 2); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = OUT; ctx.stroke(); } else circle(ctx, 0, -11, 6, c, OUT, 2); }
    else if (/Spear/.test(n)) { line(ctx, 0, 16, 0, -8, "#8a5a32", 3); poly(ctx, [-4, -8, 0, -18, 4, -8], c, OUT, 2); }
    else { var len = /Dagger/.test(n) ? 9 : 16; poly(ctx, [-3, 4, -3, -len, 0, -len - 4, 3, -len, 3, 4], c, OUT, 2); line(ctx, -7, 5, 7, 5, "#c9a24a", 3); line(ctx, 0, 6, 0, 13, "#6b4a2a", 3.5); }
  } else if (it.slot === "armor") {
    if (/Helm/.test(n)) { ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.lineTo(12, 8); ctx.lineTo(-12, 8); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); line(ctx, 0, -10, 0, 8, OUT, 2); }
    else if (/Robe|Cloak/.test(n)) { poly(ctx, [-6, -13, 6, -13, 14, 14, -14, 14], c, OUT, 2); line(ctx, 0, -11, 0, 13, OUT, 1.5); }
    else { poly(ctx, [-13, -10, -5, -14, 0, -10, 5, -14, 13, -10, 10, 0, 10, 13, -10, 13, -10, 0], c, OUT, 2); if (/Chain/.test(n)) for (var i = -6; i <= 6; i += 4) line(ctx, -7, i, 7, i, "rgba(0,0,0,0.3)", 1.5); }
  } else {
    var e = it.effect;
    if (e === "lifesteal") { poly(ctx, [-7, -12, 7, -12, 0, 14], "#f4efe2", OUT, 2); circle(ctx, 0, -6, 2.5, c); }
    else if (e === "crit") { circle(ctx, -5, -4, 6, "#5fcf6a", OUT, 2); circle(ctx, 5, -4, 6, "#5fcf6a", OUT, 2); circle(ctx, 0, 4, 6, "#5fcf6a", OUT, 2); circle(ctx, 0, -1, 2.5, c); }
    else if (e === "regen") { ctx.beginPath(); ctx.moveTo(-12, 8); ctx.quadraticCurveTo(-12, -12, 0, -12); ctx.quadraticCurveTo(12, -12, 12, 8); ctx.closePath(); ctx.fillStyle = "#4f8a3a"; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); circle(ctx, -3, -3, 2.5, c); circle(ctx, 4, 2, 2, c); }
    else if (e === "thorns") { circle(ctx, 0, 0, 9, null, c, 4); for (var k = 0; k < 6; k++) { var a = k * TAU / 6; poly(ctx, [Math.cos(a - 0.25) * 10, Math.sin(a - 0.25) * 10, Math.cos(a) * 16, Math.sin(a) * 16, Math.cos(a + 0.25) * 10, Math.sin(a + 0.25) * 10], c, OUT, 1); } }
    else if (e === "haste") { ctx.rotate(0.6); ctx.beginPath(); ctx.moveTo(0, 15); ctx.quadraticCurveTo(-11, 0, 0, -15); ctx.quadraticCurveTo(11, 0, 0, 15); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); line(ctx, 0, 15, 0, -12, OUT, 1.5); }
    else { rrect(ctx, -10, -13, 20, 26, 6); ctx.fillStyle = "#6c6870"; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); line(ctx, -4, -7, 4, 0, c, 3); line(ctx, 4, 0, -4, 7, c, 3); }
  }
  ctx.restore();
}

// ---------- rooms ----------
// A room is drawn once into its own canvas: floor tiles, brick walls, doors, and bits of
// dungeon clutter, all from the room's seed.
function drawRoom(room, theme, W, H, WALL, scale, portrait) {
  var cv = document.createElement("canvas"); cv.width = W * scale; cv.height = H * scale;
  var ctx = cv.getContext("2d"); ctx.scale(scale, scale);
  var r = DS.rng(room.seed);
  ctx.fillStyle = theme.wall; ctx.fillRect(0, 0, W, H);
  var T = 30;
  for (var y = WALL; y < H - WALL; y += T) for (var x = WALL; x < W - WALL; x += T) {
    ctx.fillStyle = r() < 0.5 ? theme.floor : theme.floor2; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "rgba(255,255,255," + (r() * 0.04).toFixed(3) + ")"; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    ctx.strokeStyle = theme.mortar; ctx.lineWidth = 2; ctx.strokeRect(x, y, T, T);
    if (r() < 0.06) { line(ctx, x + 4 + r() * 10, y + 4, x + 12 + r() * 10, y + 16 + r() * 10, "rgba(0,0,0,0.35)", 1.5); }
  }
  // walls: a thick top wall with bricks, thinner sides and bottom
  function bricks(x0, y0, w, h, light) {
    ctx.fillStyle = light; ctx.fillRect(x0, y0, w, h);
    var bh = 12;
    for (var yy = y0; yy < y0 + h; yy += bh) {
      var off = ((yy - y0) / bh) % 2 ? 12 : 0;
      for (var xx = x0 - off; xx < x0 + w; xx += 24) {
        ctx.fillStyle = "rgba(255,255,255," + (0.03 + r() * 0.05).toFixed(3) + ")";
        ctx.fillRect(Math.max(x0, xx + 1), yy + 1, Math.min(22, x0 + w - xx - 1), bh - 2);
      }
    }
  }
  bricks(0, 0, W, WALL + 6, theme.wall);
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(WALL, WALL + 6, W - WALL * 2, 8);
  bricks(0, H - WALL, W, WALL, theme.wall);
  bricks(0, 0, WALL, H, theme.wall); bricks(W - WALL, 0, WALL, H, theme.wall);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(WALL, WALL, 6, H - WALL * 2); ctx.fillRect(W - WALL - 6, WALL, 6, H - WALL * 2);
  // doors left and right
  var doors = portrait ? [[W / 2 - 36, -6, 72, WALL + 12], [W / 2 - 36, H - WALL, 72, WALL + 6]] : [[-6, H / 2 - 36, WALL + 6, 72], [W - WALL, H / 2 - 36, WALL + 6, 72]];
  doors.forEach(function (d) {
    ctx.fillStyle = "#050305"; rrect(ctx, d[0], d[1], d[2], d[3], 6); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.stroke();
  });
  // clutter
  for (var i = 0; i < 9; i++) {
    var cx = WALL + 20 + r() * (W - WALL * 2 - 40), cy = WALL + 30 + r() * (H - WALL * 2 - 50), k = r();
    if (k < 0.3) { for (var b = 0; b < 3; b++) { var a = r() * Math.PI; line(ctx, cx - Math.cos(a) * 6, cy - Math.sin(a) * 2, cx + Math.cos(a) * 6, cy + Math.sin(a) * 2, "rgba(225,215,190,0.55)", 2.5); } }
    else if (k < 0.6) { for (var s = 0; s < 4; s++) circle(ctx, cx + (r() - 0.5) * 16, cy + (r() - 0.5) * 8, 2 + r() * 4, "rgba(0,0,0,0.28)"); }
    else if (k < 0.75) { ellipse(ctx, cx, cy, 14 + r() * 10, 6 + r() * 4, "rgba(0,0,0,0.22)"); }
    else { ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = "#ddd"; ctx.lineWidth = 1; for (var q = 0; q < 5; q++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(q) * 12, cy + Math.sin(q) * 12); ctx.stroke(); } ctx.restore(); }
  }
  // cobwebs in the top corners
  [[WALL, WALL + 6, 1], [W - WALL, WALL + 6, -1]].forEach(function (c) {
    ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = "#e8e8e8"; ctx.lineWidth = 1;
    for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + c[2] * (34 - q * 8), c[1] + q * 10); ctx.stroke(); }
    for (var a2 = 1; a2 <= 3; a2++) { ctx.beginPath(); ctx.arc(c[0], c[1], a2 * 9, c[2] > 0 ? 0 : Math.PI * 0.5, c[2] > 0 ? Math.PI * 0.5 : Math.PI); ctx.stroke(); }
    ctx.restore();
  });
  // where the torches go (drawn live so they flicker)
  room.torches = [];
  var tx = portrait ? [0.22, 0.78] : [0.25, 0.5, 0.75];
  for (var j = 0; j < tx.length; j++) room.torches.push({ x: W * tx[j] + (portrait ? 0 : (r() - 0.5) * 40), y: WALL - 4 });
  room.torches.push({ x: W * (portrait ? 0.22 : 0.3), y: H - WALL + 8, low: true }, { x: W * (portrait ? 0.78 : 0.7), y: H - WALL + 8, low: true });
  return cv;
}

function drawTorch(ctx, x, y, t, color, low) {
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x - 3, y - (low ? 6 : 2), 6, 12);
  ctx.fillStyle = "#6b4a2a"; ctx.fillRect(x - 5, y - (low ? 8 : 4), 10, 4);
  var f = Math.sin(t * 13 + x) * 1.5 + Math.sin(t * 7.3 + y) * 1.2;
  poly(ctx, [x - 5, y - 6, x, y - 20 - f, x + 5, y - 6], color);
  poly(ctx, [x - 2.5, y - 6, x, y - 13 - f * 0.6, x + 2.5, y - 6], "#fff4c8");
}

// The little map of the floor in the top bar.
function drawMinimap(canvas, floor, at) {
  var ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  var all = floor.rooms.concat(floor.side), maxX = Math.max.apply(null, all.map(function (c) { return c.x; })) + 1;
  var minY = Math.min.apply(null, all.map(function (c) { return c.y; })), rows = Math.max.apply(null, all.map(function (c) { return c.y; })) - minY + 1;
  var cs = Math.min((w - 8) / maxX, (h - 8) / rows), ox = (w - cs * maxX) / 2, oy = (h - cs * rows) / 2;
  function cxy(c) { return [ox + c.x * cs + cs / 2, oy + (c.y - minY) * cs + cs / 2]; }
  ctx.lineWidth = Math.max(2, cs * 0.18);
  floor.side.forEach(function (s) { var a = cxy(floor.rooms[s.from]), b = cxy(s); line(ctx, a[0], a[1], b[0], b[1], "#3a3036", ctx.lineWidth); });
  for (var i = 1; i < floor.rooms.length; i++) { var a = cxy(floor.rooms[i - 1]), b = cxy(floor.rooms[i]); line(ctx, a[0], a[1], b[0], b[1], i <= at ? "#a07a50" : "#4a3c3a", ctx.lineWidth); }
  floor.side.forEach(function (s) { var p = cxy(s); rrect(ctx, p[0] - cs * 0.3, p[1] - cs * 0.3, cs * 0.6, cs * 0.6, 3); ctx.fillStyle = "#2a2226"; ctx.fill(); });
  floor.rooms.forEach(function (rm, i) {
    var p = cxy(rm), s = cs * 0.38;
    rrect(ctx, p[0] - s, p[1] - s, s * 2, s * 2, 4);
    ctx.fillStyle = i < at ? "#6b5646" : i === at ? "#ffb347" : rm.boss ? "#7a1f1f" : "#3e3236"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = i === at ? "#fff1c8" : "#000"; ctx.stroke();
    if (rm.boss) { ctx.fillStyle = i === at ? "#3a0a0a" : "#ffd0c8"; ctx.font = "bold " + Math.round(s * 1.3) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("☠", p[0], p[1] + 1); }
  });
}

root.ART = { drawUnit: drawUnit, drawHero: drawHero, drawMonster: drawMonster, portrait: portrait, itemIcon: itemIcon,
  drawRoom: drawRoom, drawTorch: drawTorch, drawMinimap: drawMinimap, circle: circle, ellipse: ellipse, line: line, poly: poly, rrect: rrect, RCOL: RCOL };
})(window);
