// Big Weird Dig: every picture in the game, drawn with canvas shapes. No image files.
// Each drawing works in a box from -1 to 1 around its centre.
(function (root) {
  "use strict";
  var INK = "#2a160c", TAU = Math.PI * 2;

  // A tiny pen. In silhouette mode every colour is the same one (for buried things).
  function pen(ctx, sil, lw) {
    var w = lw || 0.07;
    function paint(col, stroke) {
      ctx.fillStyle = sil || col; ctx.fill();
      if (stroke !== false) { ctx.strokeStyle = sil || INK; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.stroke(); }
    }
    return {
      circ: function (x, y, r, col, st) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); paint(col, st); },
      ell: function (x, y, rx, ry, col, rot, st) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); paint(col, st); },
      rect: function (x, y, w2, h, r, col, st) { ctx.beginPath(); rr(ctx, x, y, w2, h, r); paint(col, st); },
      poly: function (pts, col, st) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); paint(col, st); },
      path: function (fn, col, st) { ctx.beginPath(); fn(ctx); paint(col, st); },
      line: function (pts, col, width) {
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.strokeStyle = sil || col; ctx.lineWidth = width || w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      },
      curve: function (fn, col, width) { ctx.beginPath(); fn(ctx); ctx.strokeStyle = sil || col; ctx.lineWidth = width || w; ctx.lineCap = "round"; ctx.stroke(); },
      dot: function (x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = sil || col; ctx.fill(); }
    };
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  var ITEM_ART = {
    duck: function (p) {
      p.ell(0.08, 0.3, 0.72, 0.45, "#ffd23a");
      p.circ(-0.32, -0.3, 0.36, "#ffd23a");
      p.poly([-0.66, -0.3, -0.98, -0.2, -0.66, -0.1], "#ff8a1f");
      p.dot(-0.36, -0.4, 0.07, INK);
      p.curve(function (c) { c.moveTo(0.05, 0.2); c.quadraticCurveTo(0.35, 0.45, 0.6, 0.15); }, "#e0a800", 0.09);
    },
    sock: function (p) {
      p.path(function (c) { c.moveTo(-0.3, -0.9); c.lineTo(0.3, -0.9); c.lineTo(0.3, 0.35); c.quadraticCurveTo(0.3, 0.85, -0.2, 0.85); c.lineTo(-0.75, 0.85); c.quadraticCurveTo(-1, 0.6, -0.75, 0.38); c.lineTo(-0.3, 0.25); c.closePath(); }, "#e94b5a");
      p.rect(-0.34, -0.95, 0.68, 0.3, 0.08, "#fff");
      p.line([-0.3, -0.3, 0.3, -0.3], "#fff", 0.12); p.line([-0.3, 0.02, 0.3, 0.02], "#fff", 0.12);
      p.ell(-0.72, 0.62, 0.17, 0.2, "#fff", 0, false);
    },
    toaster: function (p) {
      p.rect(-0.25, -0.85, 0.4, 0.5, 0.12, "#e3b16a"); p.rect(-0.2, -0.8, 0.3, 0.4, 0.08, "#f6d9a4", false);
      p.rect(-0.8, -0.4, 1.6, 1.0, 0.28, "#c9d3dc");
      p.rect(-0.45, -0.42, 0.7, 0.1, 0.04, INK);
      p.rect(0.8, -0.1, 0.16, 0.26, 0.05, INK);
      p.line([-0.6, -0.15, -0.6, 0.35], "#fff", 0.08);
      p.rect(-0.7, 0.6, 0.25, 0.14, 0.04, INK); p.rect(0.45, 0.6, 0.25, 0.14, 0.04, INK);
    },
    gnome: function (p) {
      p.ell(0, 0.55, 0.55, 0.38, "#3d7be0");
      p.circ(0, -0.05, 0.36, "#ffc9a3");
      p.path(function (c) { c.moveTo(-0.38, 0.0); c.quadraticCurveTo(0, 0.85, 0.38, 0.0); c.quadraticCurveTo(0, 0.25, -0.38, 0); }, "#fff");
      p.poly([-0.42, -0.2, 0.42, -0.2, 0.1, -1.0], "#e53b2f");
      p.circ(0, 0.02, 0.1, "#ff8f8f");
      p.dot(-0.13, -0.12, 0.05, INK); p.dot(0.13, -0.12, 0.05, INK);
    },
    remote: function (p) {
      p.rect(-0.32, -0.9, 0.64, 1.8, 0.22, "#3a3a46");
      p.circ(0, -0.6, 0.12, "#ff4a3d");
      var cols = ["#5fd35a", "#3db6ff", "#ffd23a"];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 2; c++) p.circ(-0.13 + c * 0.26, -0.2 + r * 0.3, 0.08, cols[r]);
      p.rect(-0.15, 0.6, 0.3, 0.12, 0.05, "#9aa0b0");
    },
    noodle: function (p) {
      p.ell(0, 0.05, 0.92, 0.72, "#a7a097");
      p.curve(function (c) { c.moveTo(-0.7, 0.1); c.bezierCurveTo(-0.4, -0.6, -0.2, 0.7, 0.05, 0); c.bezierCurveTo(0.25, -0.6, 0.45, 0.6, 0.7, -0.1); }, "#f2cf63", 0.16);
      p.dot(-0.4, 0.45, 0.06, "#8a837a"); p.dot(0.45, -0.4, 0.05, "#8a837a");
    },
    bone: function (p) {
      p.path(function (c) { c.moveTo(-0.6, -0.12); c.lineTo(0.6, -0.12); c.lineTo(0.6, 0.12); c.lineTo(-0.6, 0.12); c.closePath(); }, "#f4ead2", false);
      p.circ(-0.7, -0.2, 0.22, "#f4ead2"); p.circ(-0.7, 0.2, 0.22, "#f4ead2");
      p.circ(0.7, -0.2, 0.22, "#f4ead2"); p.circ(0.7, 0.2, 0.22, "#f4ead2");
      p.rect(-0.65, -0.14, 1.3, 0.28, 0.05, "#f4ead2");
    },
    ufo: function (p) {
      p.ell(0, -0.15, 0.42, 0.42, "#bde9ff");
      p.circ(0, -0.18, 0.18, "#7be06b"); p.dot(-0.07, -0.22, 0.05, INK); p.dot(0.07, -0.22, 0.05, INK);
      p.ell(0, 0.18, 0.95, 0.3, "#9aa6b2");
      p.dot(-0.55, 0.2, 0.08, "#ffd23a"); p.dot(0, 0.28, 0.08, "#ff4a3d"); p.dot(0.55, 0.2, 0.08, "#5fd35a");
    },
    trumpet: function (p) {
      p.rect(-0.85, -0.08, 1.2, 0.16, 0.06, "#f2b632");
      p.poly([0.3, -0.08, 0.9, -0.45, 0.9, 0.45, 0.3, 0.08], "#f2b632");
      p.rect(-0.95, -0.12, 0.14, 0.24, 0.04, "#d9921a");
      p.rect(-0.45, -0.42, 0.1, 0.32, 0.03, "#d9921a"); p.rect(-0.25, -0.42, 0.1, 0.32, 0.03, "#d9921a"); p.rect(-0.05, -0.42, 0.1, 0.32, 0.03, "#d9921a");
      p.ell(-0.25, 0.3, 0.42, 0.14, "#f2b632");
    },
    pirate: function (p) {
      p.path(function (c) { c.moveTo(-0.95, 0.25); c.quadraticCurveTo(-0.6, -0.75, 0, -0.55); c.quadraticCurveTo(0.6, -0.75, 0.95, 0.25); c.quadraticCurveTo(0, 0.0, -0.95, 0.25); }, "#2d2d38");
      p.curve(function (c) { c.moveTo(-0.85, 0.18); c.quadraticCurveTo(0, -0.05, 0.85, 0.18); }, "#f2b632", 0.08);
      p.circ(0, -0.28, 0.16, "#fff"); p.dot(-0.06, -0.3, 0.04, INK); p.dot(0.06, -0.3, 0.04, INK);
      p.line([-0.18, -0.05, 0.18, 0.08], "#fff", 0.07); p.line([0.18, -0.05, -0.18, 0.08], "#fff", 0.07);
    },
    disco: function (p) {
      p.line([0, -1, 0, -0.75], "#9aa0b0", 0.06);
      p.circ(0, 0.05, 0.78, "#c5ccd6");
      if (!p.sil) for (var i = -3; i <= 3; i++) for (var j = -3; j <= 3; j++) {
        var x = i * 0.22, y = j * 0.22 + 0.05;
        if (x * x + (y - 0.05) * (y - 0.05) < 0.55) p.rect(x - 0.08, y - 0.08, 0.16, 0.16, 0.02, (i + j) % 2 ? "#eef3f8" : "#8fa3b8", false);
      }
      p.dot(-0.3, -0.25, 0.08, "#fff");
    },
    chicken: function (p) {
      p.ell(0.1, 0.15, 0.78, 0.3, "#ffe46b", -0.15);
      p.circ(-0.62, -0.3, 0.22, "#ffe46b");
      p.poly([-0.8, -0.32, -1.0, -0.22, -0.8, -0.18], "#ff8a1f");
      p.path(function (c) { c.moveTo(-0.72, -0.48); c.arc(-0.66, -0.55, 0.08, Math.PI, 0); c.arc(-0.52, -0.52, 0.08, Math.PI, 0.3); c.closePath(); }, "#ff4a3d");
      p.dot(-0.62, -0.34, 0.045, INK);
      p.line([0.2, 0.4, 0.15, 0.8], "#ff8a1f", 0.08); p.line([0.45, 0.35, 0.5, 0.8], "#ff8a1f", 0.08);
    },
    cake: function (p) {
      p.rect(-0.8, 0.0, 1.6, 0.75, 0.12, "#ff9ec4");
      p.rect(-0.55, -0.45, 1.1, 0.5, 0.1, "#ffd6e6");
      p.curve(function (c) { c.moveTo(-0.8, 0.2); for (var i = 0; i < 8; i++) c.quadraticCurveTo(-0.7 + i * 0.2, 0.38, -0.6 + i * 0.2, 0.2); }, "#fff", 0.09);
      for (var k = -1; k <= 1; k++) { p.rect(k * 0.32 - 0.04, -0.75, 0.08, 0.3, 0.02, ["#3db6ff", "#5fd35a", "#ffd23a"][k + 1]); p.ell(k * 0.32, -0.85, 0.06, 0.1, "#ff8a1f", 0, false); }
    },
    pogo: function (p) {
      p.line([0, -0.9, 0, 0.9], "#9aa0b0", 0.12);
      p.line([-0.4, -0.75, 0.4, -0.75], "#e53b2f", 0.16);
      p.curve(function (c) { c.moveTo(0, 0.1); for (var i = 0; i < 5; i++) { c.lineTo(i % 2 ? -0.22 : 0.22, 0.18 + i * 0.12); } c.lineTo(0, 0.8); }, "#5a5f6e", 0.07);
      p.rect(-0.38, 0.0, 0.76, 0.12, 0.05, "#e53b2f");
      p.circ(0, 0.92, 0.08, INK);
    },
    robot: function (p) {
      p.line([0, -0.62, 0, -0.9], "#9aa0b0", 0.07); p.circ(0, -0.92, 0.1, "#ff4a3d");
      p.rect(-0.7, -0.62, 1.4, 1.25, 0.2, "#b8c2cc");
      p.circ(-0.3, -0.18, 0.2, "#fff"); p.circ(0.3, -0.18, 0.2, "#fff");
      p.dot(-0.3, -0.18, 0.1, "#2bc4ff"); p.dot(0.3, -0.18, 0.1, "#2bc4ff");
      p.rect(-0.4, 0.2, 0.8, 0.22, 0.05, "#5a5f6e");
      p.line([-0.2, 0.2, -0.2, 0.42], "#b8c2cc", 0.05); p.line([0, 0.2, 0, 0.42], "#b8c2cc", 0.05); p.line([0.2, 0.2, 0.2, 0.42], "#b8c2cc", 0.05);
      p.rect(-0.85, -0.25, 0.15, 0.3, 0.04, "#9aa0b0"); p.rect(0.7, -0.25, 0.15, 0.3, 0.04, "#9aa0b0");
    },
    chest: function (p) {
      p.path(function (c) { c.moveTo(-0.8, -0.2); c.lineTo(-0.7, -0.75); c.lineTo(0.7, -0.75); c.lineTo(0.8, -0.2); c.closePath(); }, "#a8622d");
      p.rect(-0.85, -0.2, 1.7, 0.95, 0.08, "#b86f33");
      p.line([-0.85, 0.15, 0.85, 0.15], "#f2b632", 0.1);
      p.rect(-0.12, -0.05, 0.24, 0.3, 0.05, "#f2b632");
      p.circ(-0.45, -0.3, 0.13, "#ff4a3d"); p.circ(-0.15, -0.38, 0.12, "#3db6ff"); p.circ(0.2, -0.32, 0.13, "#5fd35a"); p.circ(0.5, -0.28, 0.11, "#ffd23a");
      p.dot(-0.47, -0.32, 0.025, INK); p.dot(-0.42, -0.27, 0.025, INK); p.dot(0.18, -0.34, 0.025, INK); p.dot(0.23, -0.3, 0.025, INK);
    },
    globe: function (p) {
      p.path(function (c) { c.moveTo(-0.62, 0.95); c.lineTo(-0.5, 0.5); c.lineTo(0.5, 0.5); c.lineTo(0.62, 0.95); c.closePath(); }, "#8b4f2a");
      p.circ(0, -0.1, 0.72, "#bfe8ff");
      p.rect(-0.22, 0.05, 0.44, 0.3, 0.03, "#ff8a6b"); p.poly([-0.3, 0.07, 0, -0.2, 0.3, 0.07], "#c23a2a");
      p.ell(0, 0.42, 0.55, 0.12, "#fff", 0, false);
      if (!p.sil) for (var i = 0; i < 9; i++) p.dot(Math.cos(i * 2.4) * 0.45, -0.3 + Math.sin(i * 1.7) * 0.32, 0.045, "#fff");
    },
    toilet: function (p) {
      p.rect(0.2, -0.95, 0.6, 0.75, 0.1, "#f2c33a");
      p.path(function (c) { c.moveTo(-0.85, -0.2); c.lineTo(0.55, -0.2); c.quadraticCurveTo(0.6, 0.45, 0.05, 0.5); c.lineTo(0.2, 0.9); c.lineTo(-0.45, 0.9); c.lineTo(-0.35, 0.45); c.quadraticCurveTo(-0.85, 0.3, -0.85, -0.2); }, "#f2c33a");
      p.ell(-0.15, -0.22, 0.72, 0.14, "#ffe48a");
      p.dot(0.42, -0.75, 0.05, "#fff"); p.dot(-0.5, 0.05, 0.06, "#fff8c8");
    },
    brush: function (p) {
      p.rect(-0.95, -0.1, 1.3, 0.2, 0.1, "#3db6ff");
      p.rect(0.35, -0.2, 0.55, 0.32, 0.06, "#e8eef4");
      if (!p.sil) for (var i = 0; i < 5; i++) p.line([0.4 + i * 0.11, -0.2, 0.4 + i * 0.11, -0.55], "#fff", 0.07);
      p.rect(0.35, -0.6, 0.55, 0.4, 0.08, "#ffffff");
      p.ell(0.62, -0.68, 0.22, 0.1, "#7ce0c3", 0, false);
    },
    sneaker: function (p) {
      p.path(function (c) { c.moveTo(-0.85, 0.35); c.lineTo(-0.8, -0.35); c.quadraticCurveTo(-0.5, -0.5, -0.3, -0.3); c.quadraticCurveTo(0.2, 0.05, 0.75, 0.1); c.quadraticCurveTo(0.95, 0.2, 0.9, 0.35); c.closePath(); }, "#ff5a6e");
      p.rect(-0.9, 0.3, 1.85, 0.25, 0.1, "#fff");
      p.dot(-0.55, 0.43, 0.07, "#3db6ff"); p.dot(-0.15, 0.43, 0.07, "#5fd35a"); p.dot(0.25, 0.43, 0.07, "#ffd23a"); p.dot(0.65, 0.43, 0.07, "#9b4dff");
      p.line([-0.3, -0.15, -0.1, -0.05], "#fff", 0.07); p.line([-0.15, -0.25, 0.05, -0.1], "#fff", 0.07);
    },
    bowling: function (p) {
      p.circ(0, 0, 0.82, "#3b4fd9");
      p.dot(-0.2, -0.35, 0.11, INK); p.dot(0.15, -0.38, 0.11, INK); p.dot(-0.02, -0.08, 0.1, INK);
      p.dot(-0.45, 0.3, 0.12, "#6d7ef0");
    },
    banana: function (p) {
      p.path(function (c) { c.moveTo(-0.85, -0.45); c.quadraticCurveTo(-0.3, 0.75, 0.85, 0.15); c.quadraticCurveTo(0.6, 0.0, 0.5, 0.05); c.quadraticCurveTo(-0.3, 0.3, -0.62, -0.5); c.closePath(); }, "#ffe04a");
      p.rect(-0.95, -0.6, 0.18, 0.22, 0.05, "#6b4a2a");
      p.curve(function (c) { c.moveTo(0.85, 0.15); c.bezierCurveTo(1.0, 0.6, 0.6, 0.6, 0.7, 0.85); }, INK, 0.05);
      p.curve(function (c) { c.moveTo(-0.2, -0.55); c.lineTo(-0.1, -0.75); c.moveTo(0.05, -0.45); c.lineTo(0.2, -0.62); c.moveTo(0.25, -0.25); c.lineTo(0.45, -0.35); }, "#ff4a3d", 0.07);
    },
    pickle: function (p) {
      p.poly([-0.3, -0.9, 0.3, -0.9, 0.48, -0.4, 0.42, 0.6, 0.2, 0.92, -0.2, 0.92, -0.42, 0.6, -0.48, -0.4], "#5fd35a");
      p.poly([-0.15, -0.8, 0.12, -0.8, 0.0, 0.8], "#b6f5a8", false);
      p.dot(0.25, -0.2, 0.06, "#2f9a3a"); p.dot(-0.28, 0.25, 0.06, "#2f9a3a"); p.dot(0.22, 0.45, 0.05, "#2f9a3a");
    },
    teapot: function (p) {
      p.curve(function (c) { c.moveTo(0.62, -0.25); c.bezierCurveTo(1.05, -0.25, 1.05, 0.4, 0.6, 0.35); }, "#4ab0a0", 0.14);
      p.poly([-0.6, 0.0, -1.0, -0.4, -0.88, -0.48, -0.5, -0.15], "#4ab0a0");
      p.ell(0, 0.1, 0.68, 0.55, "#4ab0a0");
      p.ell(0, -0.42, 0.36, 0.1, "#3a8f82");
      p.circ(0, -0.56, 0.09, "#ffd23a");
      p.curve(function (c) { c.moveTo(-0.4, 0.15); c.quadraticCurveTo(0, 0.3, 0.4, 0.15); }, "#fff", 0.06);
      if (!p.sil) p.curve(function (c) { c.moveTo(-0.95, -0.6); c.quadraticCurveTo(-0.8, -0.8, -0.95, -0.98); }, "rgba(255,255,255,0.8)", 0.06);
    },
    moonrock: function (p) {
      p.path(function (c) { c.moveTo(-0.8, 0.1); c.quadraticCurveTo(-0.85, -0.6, -0.2, -0.7); c.quadraticCurveTo(0.5, -0.85, 0.82, -0.2); c.quadraticCurveTo(0.95, 0.55, 0.3, 0.7); c.quadraticCurveTo(-0.6, 0.85, -0.8, 0.1); }, "#d8d9e0");
      p.circ(-0.3, -0.25, 0.16, "#b5b7c4"); p.circ(0.35, -0.1, 0.2, "#b5b7c4"); p.circ(-0.05, 0.35, 0.12, "#b5b7c4");
      p.rect(-0.25, 0.48, 0.5, 0.18, 0.04, "#ffe04a");
    },
    crown: function (p) {
      p.poly([-0.85, 0.55, -0.85, -0.45, -0.45, 0.0, 0, -0.65, 0.45, 0.0, 0.85, -0.45, 0.85, 0.55], "#f2c33a");
      p.rect(-0.9, 0.4, 1.8, 0.28, 0.06, "#e0a800");
      p.circ(-0.5, 0.54, 0.09, "#ff4a3d"); p.circ(0, 0.54, 0.1, "#3db6ff"); p.circ(0.5, 0.54, 0.09, "#5fd35a");
      p.circ(-0.85, -0.5, 0.08, "#fff"); p.circ(0, -0.7, 0.09, "#fff"); p.circ(0.85, -0.5, 0.08, "#fff");
    },
    lavalamp: function (p) {
      p.poly([-0.42, 0.55, -0.22, -0.65, 0.22, -0.65, 0.42, 0.55], "#ffb36b");
      p.ell(0.0, -0.25, 0.14, 0.2, "#ff4a2a", 0, false); p.ell(0.08, 0.25, 0.2, 0.15, "#ff4a2a", 0, false); p.ell(-0.06, -0.48, 0.07, 0.08, "#ff4a2a", 0, false);
      p.poly([-0.5, 0.95, -0.42, 0.5, 0.42, 0.5, 0.5, 0.95], "#7a52c7");
      p.poly([-0.26, -0.62, -0.16, -0.95, 0.16, -0.95, 0.26, -0.62], "#7a52c7");
    },
    egg: function (p) {
      p.path(function (c) { c.moveTo(0, -0.95); c.bezierCurveTo(0.75, -0.95, 0.8, 0.85, 0, 0.88); c.bezierCurveTo(-0.8, 0.85, -0.75, -0.95, 0, -0.95); }, "#9b4dff");
      p.circ(-0.25, -0.3, 0.12, "#5fd35a"); p.circ(0.25, 0.05, 0.14, "#5fd35a"); p.circ(-0.18, 0.45, 0.1, "#5fd35a"); p.circ(0.2, -0.55, 0.08, "#5fd35a");
      p.line([-0.45, -0.05, -0.2, 0.08, -0.05, -0.08, 0.15, 0.1], INK, 0.05);
    },
    pizza: function (p) {
      p.poly([-0.75, -0.65, 0.75, -0.65, 0.0, 0.95], "#ffd65c");
      p.rect(-0.85, -0.85, 1.7, 0.28, 0.14, "#d98a3a");
      p.circ(-0.25, -0.3, 0.13, "#d9362a"); p.circ(0.25, -0.25, 0.12, "#d9362a"); p.circ(0.0, 0.25, 0.11, "#d9362a");
      p.dot(-0.05, -0.05, 0.05, "#5fa83a"); p.dot(0.3, 0.05, 0.04, "#5fa83a");
    },
    plug: function (p) {
      p.curve(function (c) { c.moveTo(0, 0.55); c.bezierCurveTo(0, 0.95, 0.7, 0.6, 0.85, 1.0); }, "#2d2d38", 0.16);
      p.rect(-0.12 - 0.3, -0.95, 0.14, 0.45, 0.04, "#d6dbe2"); p.rect(0.3 - 0.02, -0.95, 0.14, 0.45, 0.04, "#d6dbe2");
      p.rect(-0.6, -0.55, 1.2, 1.1, 0.25, "#3a3a46");
      p.circ(-0.2, 0.0, 0.08, "#ffd23a"); p.circ(0.2, 0.0, 0.08, "#ffd23a");
      p.rect(-0.35, 0.25, 0.7, 0.12, 0.05, "#5a5f6e");
    }
  };

  // mode: "color" | "sil" (buried silhouette) | "glow" (a thick bright outline behind it)
  function drawItem(ctx, id, x, y, size, mode, glowCol) {
    var f = ITEM_ART[id];
    if (!f) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 2, size / 2);
    var p;
    if (mode === "glow") { p = pen(ctx, glowCol || "#fff36b", 0.32); p.sil = true; f(p); }
    else if (mode === "sil") { p = pen(ctx, glowCol || "rgba(30, 14, 4, 0.5)", 0.07); p.sil = true; f(p); }
    else { p = pen(ctx, null, 0.075); f(p); }
    ctx.restore();
  }

  // The bulldozer, facing right, about 1.1 tiles wide. t = time (for treads), opts: bladeOut, dizzy, digging.
  function drawDozer(ctx, x, y, size, dir, face, t, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    if (dir === "u") { ctx.rotate(-Math.PI / 2); if (face < 0) ctx.scale(1, -1); }
    else if (dir === "d") { ctx.rotate(Math.PI / 2); if (face < 0) ctx.scale(1, -1); }
    else if (face < 0) ctx.scale(-1, 1);
    if (opts.digging) ctx.translate(Math.sin(t * 60) * 0.015, Math.cos(t * 47) * 0.015);
    var p = pen(ctx, null, 0.04);
    // exhaust
    p.rect(-0.13, -0.5, 0.07, 0.22, 0.02, "#4a4a55");
    // cab
    p.rect(-0.42, -0.42, 0.34, 0.34, 0.06, "#ffc41f");
    p.rect(-0.37, -0.37, 0.24, 0.17, 0.04, "#aee3ff");
    p.circ(-0.25, -0.26, 0.065, "#ff7a2f", false);
    p.rect(-0.31, -0.33, 0.12, 0.035, 0.015, "#ff7a2f", false);
    // body
    p.rect(-0.46, -0.12, 0.72, 0.24, 0.06, "#ffc41f");
    p.rect(-0.42, -0.08, 0.2, 0.05, 0.02, "#d99a00", false);
    // tracks
    p.rect(-0.5, 0.1, 0.8, 0.3, 0.15, "#3a3a44");
    for (var i = 0; i < 4; i++) p.circ(-0.38 + i * 0.19, 0.25, 0.075, "#8e93a0");
    var off = (t * 2.5) % 0.12;
    for (var k = 0; k < 7; k++) { var tx = -0.45 + off + k * 0.12; if (tx < 0.27) p.dot(tx, 0.115, 0.018, "#1c1c22"); }
    // arm and blade
    var push = opts.bladeOut ? 0.1 : 0;
    p.line([0.16, 0.0, 0.33 + push, 0.06], "#4a4a55", 0.08);
    p.line([0.16, 0.16, 0.33 + push, 0.2], "#4a4a55", 0.06);
    p.path(function (c) { c.moveTo(0.28 + push, -0.27); c.quadraticCurveTo(0.42 + push, 0.08, 0.28 + push, 0.43); c.lineTo(0.45 + push, 0.43); c.quadraticCurveTo(0.58 + push, 0.08, 0.44 + push, -0.27); c.closePath(); }, "#b8c2cc");
    p.line([0.42 + push, -0.2, 0.49 + push, 0.08], "#fff", 0.03);
    ctx.restore();
    if (opts.dizzy) drawStars(ctx, x, y - size * 0.5, size * 0.4, t);
  }

  function drawStars(ctx, x, y, r, t) {
    ctx.save();
    for (var i = 0; i < 3; i++) {
      var a = t * 5 + i * TAU / 3;
      star(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, r * 0.28, "#ffe46b");
    }
    ctx.restore();
  }
  function star(ctx, x, y, r, col) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.18; ctx.stroke();
  }

  // A grumpy mole in a miner's helmet. state: "walk" | "dizzy" | "giggle" | "dig"
  function drawMole(ctx, x, y, size, face, t, state) {
    ctx.save();
    ctx.translate(x, y + (state === "walk" ? Math.abs(Math.sin(t * 12)) * -size * 0.04 : 0));
    ctx.scale(size * (face < 0 ? -1 : 1), size);
    var p = pen(ctx, null, 0.045);
    p.ell(-0.18, 0.3, 0.1, 0.06, "#ffb0c0"); p.ell(0.2, 0.3, 0.1, 0.06, "#ffb0c0");
    p.ell(0, 0.05, 0.4, 0.3, "#6b4a7a");
    p.ell(0.05, 0.13, 0.26, 0.16, "#9a7aa6", 0, false);
    // helmet + lamp
    p.path(function (c) { c.moveTo(-0.3, -0.12); c.quadraticCurveTo(-0.25, -0.42, 0.05, -0.42); c.quadraticCurveTo(0.32, -0.42, 0.34, -0.12); c.closePath(); }, "#ffc41f");
    p.circ(0.2, -0.3, 0.07, "#fffbe0");
    // nose
    p.circ(0.42, 0.04, 0.09, "#ff8fb0");
    // eyes
    if (state === "dizzy") {
      p.curve(function (c) { c.arc(0.12, -0.03, 0.06, 0, 5); }, INK, 0.03);
      p.curve(function (c) { c.arc(0.28, -0.03, 0.06, 0, 5); }, INK, 0.03);
    } else if (state === "giggle") {
      p.curve(function (c) { c.moveTo(0.06, -0.02); c.quadraticCurveTo(0.12, -0.1, 0.18, -0.02); c.moveTo(0.22, -0.02); c.quadraticCurveTo(0.28, -0.1, 0.34, -0.02); }, INK, 0.035);
    } else {
      p.dot(0.13, -0.02, 0.045, INK); p.dot(0.28, -0.02, 0.045, INK);
      p.line([0.06, -0.12, 0.18, -0.08], INK, 0.035); p.line([0.35, -0.12, 0.23, -0.08], INK, 0.035);
    }
    // claws
    p.ell(0.38, 0.2, 0.08, 0.05, "#ffd0dc");
    ctx.restore();
    if (state === "dizzy") drawStars(ctx, x, y - size * 0.45, size * 0.32, t);
  }

  function drawBoulder(ctx, x, y, size, wob) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wob || 0);
    ctx.scale(size, size);
    var p = pen(ctx, null, 0.045);
    p.path(function (c) { c.moveTo(-0.44, 0.1); c.quadraticCurveTo(-0.46, -0.38, -0.05, -0.44); c.quadraticCurveTo(0.42, -0.46, 0.46, -0.02); c.quadraticCurveTo(0.48, 0.42, 0.02, 0.44); c.quadraticCurveTo(-0.44, 0.46, -0.44, 0.1); }, "#8d929c");
    p.ell(-0.12, -0.18, 0.14, 0.08, "#b9bec7", -0.4, false);
    p.circ(0.18, 0.12, 0.07, "#6f7480", false); p.circ(-0.2, 0.2, 0.05, "#6f7480", false);
    p.curve(function (c) { c.moveTo(0.05, -0.3); c.lineTo(0.12, -0.12); c.lineTo(0.05, 0.0); }, "#6f7480", 0.03);
    ctx.restore();
  }

  function drawCan(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    var p = pen(ctx, null, 0.045);
    p.rect(-0.12, -0.42, 0.2, 0.12, 0.03, "#4a4a55");
    p.rect(-0.3, -0.32, 0.6, 0.72, 0.1, "#e8392a");
    p.rect(-0.18, -0.24, 0.16, 0.08, 0.03, "#2a160c", false);
    p.path(function (c) { c.moveTo(0, -0.08); c.quadraticCurveTo(0.14, 0.1, 0.1, 0.18); c.arc(0, 0.17, 0.1, 0, Math.PI); c.quadraticCurveTo(-0.14, 0.1, 0, -0.08); }, "#ffe36b");
    ctx.restore();
  }

  // Stone you can't dig through, in each level's look.
  function drawStone(ctx, x, y, s, look, seed) {
    var r = function (k) { var v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    ctx.save();
    ctx.translate(x, y);
    var p = pen(ctx, null, s * 0.05);
    if (look === "root") {
      p.rect(-s * 0.5, -s * 0.5, s, s, s * 0.2, "#5a3a22");
      for (var i = 0; i < 3; i++) {
        var yy = (-0.3 + i * 0.3) * s;
        p.curve(function (c) { c.moveTo(-s * 0.55, yy); c.bezierCurveTo(-s * 0.2, yy - s * 0.25 * (r(i) - 0.5) * 2, s * 0.2, yy + s * 0.2, s * 0.55, yy + s * 0.1 * (r(i + 3) - 0.5)); }, "#9b6a3a", s * 0.12);
      }
    } else if (look === "crystal") {
      p.rect(-s * 0.5, -s * 0.5, s, s, s * 0.15, "#3c3550");
      var cols = ["#7ef0ff", "#c48bff", "#ff8fe0"];
      for (i = 0; i < 3; i++) {
        var cx = (-0.28 + i * 0.28) * s, h = (0.4 + r(i) * 0.35) * s, w = 0.12 * s;
        p.poly([cx - w, s * 0.4, cx - w, s * 0.4 - h + w, cx, s * 0.4 - h, cx + w, s * 0.4 - h + w, cx + w, s * 0.4], cols[(i + Math.floor(seed)) % 3]);
      }
    } else if (look === "lava") {
      p.rect(-s * 0.5, -s * 0.5, s, s, s * 0.15, "#2e2424");
      p.curve(function (c) { c.moveTo(-s * 0.4, -s * 0.1); c.lineTo(-s * 0.1, s * 0.05); c.lineTo(s * 0.1, -s * 0.2); c.lineTo(s * 0.4, s * 0.15); c.moveTo(-s * 0.1, s * 0.05); c.lineTo(-s * 0.05, s * 0.35); }, "#ff7a2a", s * 0.07);
    } else {
      p.rect(-s * 0.5, -s * 0.5, s, s, s * 0.18, look === "fossil" ? "#8f8a80" : "#6e6a72");
      p.ell(-s * 0.15, -s * 0.2, s * 0.18, s * 0.08, look === "fossil" ? "#aaa59a" : "#88848c", 0, false);
      if (look === "fossil") p.curve(function (c) { for (var a = 0; a < 12; a += 0.4) c.lineTo(s * 0.1 + Math.cos(a) * a * s * 0.025, s * 0.1 + Math.sin(a) * a * s * 0.025); }, "#5f5a52", s * 0.05);
      else p.curve(function (c) { c.moveTo(s * 0.05, -s * 0.4); c.lineTo(s * 0.15, -s * 0.05); c.lineTo(s * 0.0, s * 0.2); }, "#4a464e", s * 0.04);
    }
    ctx.restore();
  }

  root.BWDArt = { drawItem: drawItem, drawDozer: drawDozer, drawMole: drawMole, drawBoulder: drawBoulder, drawCan: drawCan, drawStone: drawStone, star: star, rr: rr, ITEM_ART: ITEM_ART, INK: INK };
})(window);
