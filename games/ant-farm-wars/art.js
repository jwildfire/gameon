// Ant Farm Wars: everything is drawn here with canvas shapes. No image files.
(function (root) {
  "use strict";
  var E = root.AFW;
  var CELL = 24; // pixels per cell in the cached terrain picture
  var SOILS = ["#efcf8d", "#ddb06a", "#c99352", "#ad7642"];
  var SPECK = ["#d9b46e", "#c4964f", "#a9783c", "#8d5d30"];

  function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var m = function (v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); };
    return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")";
  }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }

  // ---- the cached terrain: soil layers, rocks, food, glowing tunnels ----
  var terrain = null, tctx = null, drawnVersion = -1, drawnAt = 0;
  function drawTerrain(s, now) {
    if (!terrain) {
      terrain = document.createElement("canvas");
      terrain.width = E.W * CELL; terrain.height = E.H * CELL;
      tctx = terrain.getContext("2d");
    }
    if (drawnVersion === s.terrainVersion && terrain._seed === s.seed) return terrain;
    if (terrain._seed === s.seed && now - drawnAt < 90) return terrain; // at most ~11 redraws a second
    drawnVersion = s.terrainVersion; drawnAt = now; terrain._seed = s.seed;
    var g = tctx, W = E.W, H = E.H, x, y, k;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      k = E.idx(x, y);
      var L = s.layer[k], c = s.cells[k], px = x * CELL, py = y * CELL;
      g.fillStyle = SOILS[L]; g.fillRect(px, py, CELL, CELL);
      if (c !== E.TUNNEL) {
        g.fillStyle = SPECK[L];
        for (var d = 0; d < 3; d++) { var hx = hash(x * 3 + d, y), hy = hash(y * 5 + d, x); g.fillRect(px + hx * (CELL - 3), py + hy * (CELL - 3), 2.5, 2.5); }
      }
      if (c === E.ROCK) {
        g.fillStyle = "#8b8794"; roundRect(g, px + 1, py + 1, CELL - 2, CELL - 2, 7); g.fill();
        g.fillStyle = "#a9a5b3"; roundRect(g, px + 4, py + 3, CELL - 11, CELL - 13, 4); g.fill();
        g.fillStyle = "#6d6977"; g.fillRect(px + 6, py + CELL - 7, CELL - 12, 2);
      } else if (c === E.FOOD) {
        var n = s.food[k];
        for (var f = 0; f < Math.min(5, n); f++) {
          var fx = px + 4 + hash(x + f * 7, y) * (CELL - 10), fy = py + 4 + hash(y + f * 3, x + f) * (CELL - 10);
          if ((x + y + f) % 3 === 0) { g.fillStyle = "#fffaf0"; g.fillRect(fx, fy, 7, 7); g.fillStyle = "#e6dccb"; g.fillRect(fx + 4, fy + 4, 3, 3); } // sugar
          else { g.fillStyle = (f % 2) ? "#7b4b21" : "#e8a33d"; g.beginPath(); g.ellipse(fx + 3, fy + 3, 4, 2.6, f, 0, 7); g.fill(); } // seeds and crumbs
        }
      }
    }
    // tunnels on top, with a glow along the walls in the colour of the colony that dug them
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      k = E.idx(x, y);
      if (s.cells[k] !== E.TUNNEL) continue;
      px = x * CELL; py = y * CELL;
      g.fillStyle = "#3a2417"; g.fillRect(px, py, CELL, CELL);
      var own = s.owner[k], col = own >= 0 ? E.COLONIES[own].color : "#ffffff";
      g.fillStyle = rgba(col, 0.16); g.fillRect(px, py, CELL, CELL);
      g.fillStyle = rgba(col, 0.85);
      var open = function (xx, yy) { return xx < 0 || yy < 0 || xx >= W || yy >= H || s.cells[E.idx(xx, yy)] === E.TUNNEL; };
      if (!open(x, y - 1)) g.fillRect(px, py, CELL, 3);
      if (!open(x, y + 1)) g.fillRect(px, py + CELL - 3, CELL, 3);
      if (!open(x - 1, y)) g.fillRect(px, py, 3, CELL);
      if (!open(x + 1, y)) g.fillRect(px + CELL - 3, py, 3, CELL);
    }
    return terrain;
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---- one ant (x, y in pixels, size = a cell in pixels) ----
  function ant(g, x, y, size, color, face, walk, kind, carry, flying, hurt) {
    var k = size / 24 * 1.3 * (kind === "w" ? 0.8 : kind === "g" ? 1.15 : kind === "q" ? 1.6 : 1);
    g.save(); g.translate(x, y); g.scale(face * k, k);
    var body = hurt > 0 ? "#ffffff" : color, dark = shade(color, -0.55);
    // legs
    g.strokeStyle = dark; g.lineWidth = 1.6; g.lineCap = "round";
    for (var i = -1; i <= 1; i++) {
      var sw = Math.sin(walk + i * 2.1) * 2.6;
      g.beginPath(); g.moveTo(i * 3, 1); g.lineTo(i * 4 + sw, 7); g.stroke();
      g.beginPath(); g.moveTo(i * 3, 1); g.lineTo(i * 4 - sw, 6.5); g.stroke();
    }
    if (flying) {
      var flap = Math.sin(walk * 5) * 0.5;
      g.fillStyle = "rgba(235,245,255,0.75)"; g.strokeStyle = "rgba(90,110,140,0.8)"; g.lineWidth = 0.8;
      g.beginPath(); g.ellipse(-2, -6, 7, 3.2, -0.5 - flap, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(1, -6.5, 6, 2.8, -1.1 + flap, 0, 7); g.fill(); g.stroke();
    }
    g.lineWidth = 1.3; g.strokeStyle = dark;
    // abdomen, waist, head
    g.fillStyle = body;
    g.beginPath(); g.ellipse(-6.5, -1, kind === "q" ? 7 : 5, kind === "q" ? 4.6 : 3.8, 0.15, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -1, 2.8, 2.3, 0, 0, 7); g.fill(); g.stroke();
    var hs = kind === "s" || kind === "g" ? 3.6 : 3;
    g.beginPath(); g.ellipse(5, -2, hs, hs * 0.85, 0, 0, 7); g.fill(); g.stroke();
    // stripes on the abdomen
    g.strokeStyle = shade(color, -0.3); g.lineWidth = 1;
    g.beginPath(); g.moveTo(-7.5, -4); g.lineTo(-8.5, 2); g.stroke();
    g.beginPath(); g.moveTo(-4.5, -4.2); g.lineTo(-5.3, 2.4); g.stroke();
    // eye and antennae
    g.fillStyle = "#1d1410"; g.beginPath(); g.arc(6.2, -2.8, 1.1, 0, 7); g.fill();
    g.strokeStyle = dark; g.lineWidth = 1.1;
    var aw = Math.sin(walk * 0.7) * 1.2;
    g.beginPath(); g.moveTo(6, -4.5); g.quadraticCurveTo(8, -9, 11, -8 + aw); g.stroke();
    // jaws: soldiers have big ones
    if (kind === "s" || kind === "g") {
      g.strokeStyle = "#2a1a12"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(8, -1.5); g.quadraticCurveTo(11.5, -1, 11, 1.5); g.stroke();
      g.beginPath(); g.moveTo(8, 0); g.quadraticCurveTo(10.5, 1.5, 9, 3); g.stroke();
    }
    if (kind === "g") { g.fillStyle = "#f3f0ff"; g.beginPath(); g.arc(0, -4.2, 2, Math.PI, 0); g.fill(); }
    if (kind === "q") {
      g.fillStyle = "#ffe066"; g.strokeStyle = "#8a6400"; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(2.5, -5); g.lineTo(3, -9); g.lineTo(4.5, -7); g.lineTo(5.5, -10); g.lineTo(6.5, -7); g.lineTo(8, -9); g.lineTo(7.8, -5); g.closePath(); g.fill(); g.stroke();
    }
    if (carry) { g.fillStyle = "#fffaf0"; g.strokeStyle = "#b9a98d"; g.lineWidth = 0.8; g.fillRect(9, -4, 4, 4); g.strokeRect(9, -4, 4, 4); }
    g.restore();
  }

  // ---- the whole farm ----
  // view: { sc (pixels per cell), ox, oy (screen position of cell 0,0) }
  function farm(g, s, view, now, ui) {
    var sc = view.sc, ox = view.ox, oy = view.oy, W = E.W, H = E.H;
    var fw = W * sc, fh = H * sc, lid = sc * 1.6;
    // wooden frame and the strip of sky and grass on top
    g.fillStyle = "#7a4b2a"; roundRect(g, ox - sc * 0.7, oy - lid - sc * 0.7, fw + sc * 1.4, fh + lid + sc * 1.4, sc * 0.6); g.fill();
    var sky = g.createLinearGradient(0, oy - lid, 0, oy);
    sky.addColorStop(0, "#bfe8ff"); sky.addColorStop(1, "#e8f7ff");
    g.fillStyle = sky; g.fillRect(ox, oy - lid, fw, lid);
    g.fillStyle = "#6cc04a"; g.fillRect(ox, oy - sc * 0.35, fw, sc * 0.35);
    g.fillStyle = "#4d9a33";
    for (var t = 0; t < W * 2; t++) { var gx = ox + (t + 0.5) * sc / 2; g.beginPath(); g.moveTo(gx - sc * 0.12, oy - sc * 0.3); g.lineTo(gx, oy - sc * (0.55 + hash(t, 1) * 0.35)); g.lineTo(gx + sc * 0.12, oy - sc * 0.3); g.fill(); }
    g.drawImage(drawTerrain(s, now), ox, oy, fw, fh);

    // glue puddles
    s.glue.forEach(function (gl) {
      var a = Math.min(1, gl.t) * 0.55;
      g.fillStyle = "rgba(186,240,90," + a + ")";
      g.beginPath(); g.arc(ox + (gl.x + 0.5) * sc, oy + (gl.y + 0.5) * sc, gl.r * sc, 0, 7); g.fill();
      g.fillStyle = "rgba(240,255,200," + a + ")";
      for (var b = 0; b < 5; b++) { var ang = b * 1.3 + now / 900, rr = gl.r * sc * (0.3 + 0.12 * b); g.beginPath(); g.arc(ox + (gl.x + 0.5) * sc + Math.cos(ang) * rr, oy + (gl.y + 0.5) * sc + Math.sin(ang) * rr * 0.6, sc * 0.18, 0, 7); g.fill(); }
    });

    // queens and their health
    s.colonies.forEach(function (c) {
      var qx = ox + (c.q.x + 0.5) * sc, qy = oy + (c.q.y + 0.5) * sc;
      if (c.alive) {
        ant(g, qx, qy + sc * 0.1, sc, c.color, c.q.x < W / 2 ? 1 : -1, now / 600, "q", false, false, 0);
        var bw = sc * 3.2, bx = qx - bw / 2, by = qy - sc * 1.85;
        g.fillStyle = "rgba(0,0,0,0.55)"; roundRect(g, bx - 1.5, by - 1.5, bw + 3, sc * 0.42 + 3, 4); g.fill();
        g.fillStyle = c.q.hp / c.q.max < 0.35 ? "#ff4d4d" : c.color; g.fillRect(bx, by, bw * Math.max(0, c.q.hp / c.q.max), sc * 0.42);
      } else {
        g.fillStyle = "rgba(40,30,30,0.55)"; g.beginPath(); g.arc(qx, qy, sc * 1.2, 0, 7); g.fill();
        g.strokeStyle = c.color; g.lineWidth = Math.max(2, sc * 0.18); g.lineCap = "round";
        g.beginPath(); g.moveTo(qx - sc * 0.6, qy - sc * 0.6); g.lineTo(qx + sc * 0.6, qy + sc * 0.6); g.moveTo(qx + sc * 0.6, qy - sc * 0.6); g.lineTo(qx - sc * 0.6, qy + sc * 0.6); g.stroke();
      }
    });

    // ants (flyers last, so they're on top)
    var flyers = [];
    s.ants.forEach(function (a) {
      if (a.fly) { flyers.push(a); return; }
      var col = E.COLONIES[a.c].color;
      ant(g, ox + (a.x + 0.5) * sc, oy + (a.y + 0.5) * sc, sc, col, a.face, a.walk, a.kind, a.carry > 0, false, a.hurt);
      if (a.kind !== "w" && a.hp < a.max) {
        var w = sc * 0.8; g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(ox + (a.x + 0.1) * sc, oy + (a.y - 0.05) * sc, w, 2.5);
        g.fillStyle = col; g.fillRect(ox + (a.x + 0.1) * sc, oy + (a.y - 0.05) * sc, w * Math.max(0, a.hp / a.max), 2.5);
      }
    });
    flyers.forEach(function (a) {
      var bob = Math.sin(a.walk * 2) * sc * 0.15;
      g.fillStyle = "rgba(0,0,0,0.18)"; g.beginPath(); g.ellipse(ox + (a.x + 0.5) * sc, oy + (a.y + 0.9) * sc, sc * 0.4, sc * 0.12, 0, 0, 7); g.fill();
      ant(g, ox + (a.x + 0.5) * sc, oy + (a.y + 0.2) * sc + bob, sc, E.COLONIES[a.c].color, a.face, a.walk, "s", false, true, a.hurt);
    });

    // effects
    s.fx.forEach(function (f) {
      var p = f.t / f.life, cx = ox + (f.x + 0.5) * sc, cy = oy + (f.y + 0.5) * sc, R = f.r * sc;
      if (f.type === "fire") {
        for (var i = 0; i < 16; i++) {
          var ang = i * 0.785 + i * 0.3, rr = R * (0.2 + p * 0.85) * (0.5 + hash(i, 3) * 0.5);
          g.fillStyle = i % 3 === 0 ? "rgba(255,240,120," + (1 - p) + ")" : i % 3 === 1 ? "rgba(255,140,40," + (1 - p) + ")" : "rgba(230,60,30," + (1 - p) + ")";
          g.beginPath(); g.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr - p * sc, sc * (0.55 - p * 0.35), 0, 7); g.fill();
        }
      } else if (f.type === "splat") {
        g.strokeStyle = "rgba(160,220,60," + (1 - p) + ")"; g.lineWidth = sc * 0.3;
        g.beginPath(); g.arc(cx, cy, R * (0.4 + p * 0.7), 0, 7); g.stroke();
      } else if (f.type === "dust") {
        for (var d = 0; d < 12; d++) {
          var da = d * 0.52, dr = R * (0.3 + p * 0.9);
          g.fillStyle = "rgba(150,110,70," + (0.8 - p * 0.8) + ")";
          g.beginPath(); g.arc(cx + Math.cos(da) * dr, cy + Math.sin(da) * dr + p * sc, sc * (0.5 - p * 0.2), 0, 7); g.fill();
        }
      } else if (f.type === "poof") {
        g.strokeStyle = "rgba(255,255,255," + (1 - p) * 0.8 + ")"; g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, sc * (0.2 + p * 0.6), 0, 7); g.stroke();
      } else if (f.type === "boom") {
        g.strokeStyle = rgba(E.COLONIES[f.c].color, 1 - p); g.lineWidth = sc * 0.4;
        g.beginPath(); g.arc(cx, cy, R * (0.3 + p * 1.6), 0, 7); g.stroke();
      } else if (f.type === "wind") {
        g.strokeStyle = "rgba(255,255,255," + (1 - p) + ")"; g.lineWidth = 2;
        for (var w2 = 0; w2 < 3; w2++) { g.beginPath(); g.arc(cx, cy, sc * (0.6 + w2 * 0.5 + p), -2.4, -0.7); g.stroke(); }
      }
    });

    // the player's rally flag and target marker
    var me = s.colonies[0];
    if (ui && me.alive) {
      if (me.rally) {
        var rx = ox + (me.rally[0] + 0.5) * sc, ry = oy + (me.rally[1] + 0.5) * sc;
        g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(rx, ry + sc * 0.4); g.lineTo(rx, ry - sc * 1.1); g.stroke();
        g.fillStyle = me.color; g.beginPath(); g.moveTo(rx, ry - sc * 1.1); g.lineTo(rx + sc * 0.9, ry - sc * 0.8); g.lineTo(rx, ry - sc * 0.5); g.fill();
      } else if (me.target >= 0 && s.colonies[me.target].alive && s.phase === "battle") {
        var tq = s.colonies[me.target].q, tx = ox + (tq.x + 0.5) * sc, ty = oy + (tq.y + 0.5) * sc, pulse = 1 + Math.sin(now / 200) * 0.08;
        g.strokeStyle = "rgba(255,201,60,0.95)"; g.lineWidth = 2.5;
        g.beginPath(); g.arc(tx, ty, sc * 1.6 * pulse, 0, 7); g.stroke();
        for (var m = 0; m < 4; m++) { var ma = m * Math.PI / 2; g.beginPath(); g.moveTo(tx + Math.cos(ma) * sc * 1.2 * pulse, ty + Math.sin(ma) * sc * 1.2 * pulse); g.lineTo(tx + Math.cos(ma) * sc * 2.1 * pulse, ty + Math.sin(ma) * sc * 2.1 * pulse); g.stroke(); }
      }
      if (ui.aim) {
        g.strokeStyle = "rgba(255,255,255,0.9)"; g.setLineDash([5, 4]); g.lineWidth = 2;
        g.beginPath(); g.arc(ui.aim[0], ui.aim[1], sc * 2.5, 0, 7); g.stroke(); g.setLineDash([]);
      }
    }
    // glass: a few shiny streaks over the whole farm
    g.fillStyle = "rgba(255,255,255,0.10)";
    g.beginPath(); g.moveTo(ox + fw * 0.08, oy - lid); g.lineTo(ox + fw * 0.16, oy - lid); g.lineTo(ox + fw * 0.06, oy + fh); g.lineTo(ox - fw * 0.02 < ox ? ox : ox - fw * 0.02, oy + fh); g.fill();
    g.beginPath(); g.moveTo(ox + fw * 0.7, oy - lid); g.lineTo(ox + fw * 0.73, oy - lid); g.lineTo(ox + fw * 0.66, oy + fh); g.lineTo(ox + fw * 0.63, oy + fh); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2; g.strokeRect(ox, oy - lid, fw, fh + lid);
  }

  // a card's little picture (for the draft cards and power buttons), drawn into a small canvas
  function icon(g, id, size, color) {
    g.save(); g.scale(size / 40, size / 40);
    g.lineCap = "round"; g.lineJoin = "round";
    var ink = "#2b1d14";
    switch (id) {
      case "dig": g.fillStyle = "#b9c2cc"; g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(20, 6); g.lineTo(20, 24); g.stroke(); g.beginPath(); g.moveTo(12, 22); g.lineTo(28, 22); g.lineTo(26, 32); g.quadraticCurveTo(20, 37, 14, 32); g.closePath(); g.fill(); g.stroke(); break;
      case "legs": ant(g, 20, 22, 30, color, 1, 1, "w"); g.strokeStyle = "#fff"; g.lineWidth = 2.5; for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(2, 14 + i * 7); g.lineTo(9, 14 + i * 7); g.stroke(); } break;
      case "tough": g.fillStyle = color; g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(20, 5); g.lineTo(33, 10); g.quadraticCurveTo(32, 28, 20, 35); g.quadraticCurveTo(8, 28, 7, 10); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#fff"; g.fillRect(17, 12, 6, 16); g.fillRect(12, 17, 16, 6); break;
      case "jaws": ant(g, 18, 22, 34, color, 1, 0, "s"); g.fillStyle = "#fff"; g.font = "bold 12px sans-serif"; g.fillText("!", 32, 12); break;
      case "workers": ant(g, 14, 15, 22, color, 1, 0, "w", true); ant(g, 24, 27, 22, color, 1, 2, "w", true); g.fillStyle = "#fff"; g.font = "900 13px sans-serif"; g.fillText("+", 28, 13); break;
      case "army": ant(g, 13, 14, 22, color, 1, 0, "s"); ant(g, 25, 22, 22, color, 1, 1, "s"); ant(g, 13, 30, 22, color, 1, 2, "s"); break;
      case "jelly": g.fillStyle = "#ffe066"; g.strokeStyle = "#8a6400"; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 28); g.lineTo(6, 12); g.lineTo(14, 19); g.lineTo(20, 8); g.lineTo(26, 19); g.lineTo(34, 12); g.lineTo(32, 28); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#ff7aa8"; g.beginPath(); g.arc(20, 31, 4, 0, 7); g.fill(); break;
      case "sweet": g.fillStyle = "#fffaf0"; g.strokeStyle = "#b9a98d"; g.lineWidth = 2; g.fillRect(9, 15, 13, 13); g.strokeRect(9, 15, 13, 13); g.fillRect(20, 9, 11, 11); g.strokeRect(20, 9, 11, 11); g.fillStyle = "#e8a33d"; g.beginPath(); g.ellipse(27, 30, 5, 3, 0.4, 0, 7); g.fill(); break;
      case "hatch": g.fillStyle = "#fffdf5"; g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.ellipse(15, 22, 7, 10, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(27, 24, 6, 8.5, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(4, 8); g.lineTo(10, 8); g.moveTo(30, 6); g.lineTo(36, 6); g.stroke(); break;
      case "guards": ant(g, 20, 24, 32, color, 1, 0, "g"); g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(20, 22, 15, 3.6, 5.8); g.stroke(); break;
      case "fire": g.fillStyle = "#ff8a1e"; g.beginPath(); g.moveTo(20, 4); g.quadraticCurveTo(34, 18, 30, 28); g.quadraticCurveTo(26, 37, 20, 36); g.quadraticCurveTo(10, 36, 9, 26); g.quadraticCurveTo(9, 17, 20, 4); g.fill(); g.fillStyle = "#ffe066"; g.beginPath(); g.moveTo(20, 16); g.quadraticCurveTo(27, 25, 24, 31); g.quadraticCurveTo(20, 35, 16, 31); g.quadraticCurveTo(13, 25, 20, 16); g.fill(); break;
      case "glue": g.fillStyle = "#b8ef5a"; g.beginPath(); g.ellipse(20, 27, 15, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(20, 15, 5, 7, 0, 0, 7); g.fill(); g.fillStyle = "#efffd0"; g.beginPath(); g.arc(14, 25, 2.5, 0, 7); g.arc(26, 28, 2, 0, 7); g.fill(); break;
      case "cave": g.fillStyle = "#3a2417"; g.fillRect(6, 22, 28, 10); g.fillStyle = "#c99352"; for (var r = 0; r < 5; r++) { g.beginPath(); g.arc(10 + r * 5, 14 + (r % 2) * 5, 4.5, 0, 7); g.fill(); } g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 2); g.lineTo(20, 8); g.stroke(); break;
      case "fly": ant(g, 20, 26, 30, color, 1, 1, "s", false, true); break;
    }
    g.restore();
  }

  root.AFWArt = { farm: farm, ant: ant, icon: icon, shade: shade, rgba: rgba };
})(typeof window !== "undefined" ? window : globalThis);
