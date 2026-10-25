// Devil's Burger Station art: every picture is drawn with canvas shapes. Round goofy devils,
// burger layers, hot sauce bottles and the warm lava-orange kitchen. No image files.
(function (root) {
  "use strict";

  var INK = "#3a140c";
  var SAUCE_COLOR = { mild: "#ffb22e", fiery: "#e8321e", lava: "#ff5a00" };
  var SAUCE_DARK = { mild: "#c97a00", fiery: "#9e1a0e", lava: "#b33000" };
  var SAUCE_LABEL = { mild: "MILD", fiery: "FIERY", lava: "LAVA" };

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function blob(c, fill, line, lw) {
    c.fillStyle = fill; c.fill();
    if (line) { c.lineWidth = lw || 2; c.strokeStyle = line; c.stroke(); }
  }
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }

  // ---- burger layers ----
  // Each layer is drawn centred on x with its bottom at y, w wide. It returns how far up
  // the next layer starts. pos: "bottom", "middle" or "top" (only buns care).
  var THICK = { bun: 0.2, top: 0.36, patty: 0.17, cheese: 0.06, lettuce: 0.08, tomato: 0.08, onion: 0.07, pickles: 0.07, peppers: 0.09 };
  function layerHeight(id, pos) { return (id === "bun" && pos === "top" ? THICK.top : THICK[id] || 0.08); }

  function layer(c, id, pos, x, y, w, lw) {
    var h, l = lw || Math.max(1, w * 0.025);
    c.lineJoin = "round";
    if (id === "bun") {
      if (pos === "top") {
        h = w * THICK.top;
        c.beginPath();
        c.moveTo(x - w * 0.5, y);
        c.bezierCurveTo(x - w * 0.52, y - h * 1.15, x + w * 0.52, y - h * 1.15, x + w * 0.5, y);
        c.closePath();
        var g = c.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, "#ffcb6b"); g.addColorStop(1, "#e08a2c");
        blob(c, g, INK, l);
        c.fillStyle = "#fff6dc";
        for (var s = 0; s < 6; s++) {
          var sx = x + (s - 2.5) * w * 0.13, sy = y - h * (0.55 + 0.18 * Math.cos((s - 2.5) * 0.7));
          ell(c, sx, sy, w * 0.025, w * 0.014); c.fill();
        }
        return h * 0.92;
      }
      h = w * (pos === "bottom" ? THICK.bun : 0.14);
      rr(c, x - w * 0.48, y - h, w * 0.96, h, h * 0.45);
      blob(c, pos === "bottom" ? "#eb9a3c" : "#f0a94c", INK, l);
      c.fillStyle = "rgba(255,240,200,0.55)";
      rr(c, x - w * 0.4, y - h * 0.85, w * 0.8, h * 0.25, h * 0.12); c.fill();
      return h * 0.95;
    }
    if (id === "patty") {
      h = w * THICK.patty;
      rr(c, x - w * 0.5, y - h, w, h, h * 0.5);
      blob(c, "#7a3b1d", INK, l);
      c.strokeStyle = "#4a200e"; c.lineWidth = l * 1.2;
      for (var m = -2; m <= 2; m++) {
        c.beginPath(); c.moveTo(x + m * w * 0.15 - w * 0.04, y - h * 0.75); c.lineTo(x + m * w * 0.15 + w * 0.04, y - h * 0.3); c.stroke();
      }
      return h * 0.92;
    }
    if (id === "cheese") {
      h = w * THICK.cheese;
      c.beginPath();
      c.moveTo(x - w * 0.52, y - h);
      c.lineTo(x + w * 0.52, y - h);
      c.lineTo(x + w * 0.5, y);
      c.lineTo(x + w * 0.3, y);
      c.quadraticCurveTo(x + w * 0.26, y + h * 2.4, x + w * 0.22, y);
      c.lineTo(x - w * 0.12, y);
      c.quadraticCurveTo(x - w * 0.17, y + h * 1.8, x - w * 0.22, y);
      c.lineTo(x - w * 0.5, y);
      c.closePath();
      blob(c, "#ffd23a", INK, l);
      return h * 0.95;
    }
    if (id === "lettuce") {
      h = w * THICK.lettuce;
      c.beginPath();
      c.moveTo(x - w * 0.54, y - h * 0.5);
      var n = 8;
      for (var i = 0; i <= n; i++) {
        var px = x - w * 0.54 + (w * 1.08 * i) / n;
        c.quadraticCurveTo(px - w * 0.068, y - h * 1.5, px, y - h * 0.6);
      }
      for (var k = n; k >= 0; k--) {
        var qx = x - w * 0.54 + (w * 1.08 * k) / n;
        c.quadraticCurveTo(qx + w * 0.068, y + h * 0.6, qx, y);
      }
      c.closePath();
      blob(c, "#5fc93d", INK, l);
      return h * 0.95;
    }
    if (id === "tomato") {
      h = w * THICK.tomato;
      for (var tt = 0; tt < 3; tt++) {
        var tx = x + (tt - 1) * w * 0.32;
        rr(c, tx - w * 0.18, y - h, w * 0.36, h, h * 0.45);
        blob(c, "#e8402e", INK, l);
        c.fillStyle = "#ffb0a0"; ell(c, tx, y - h * 0.5, w * 0.06, h * 0.22); c.fill();
      }
      return h * 0.95;
    }
    if (id === "onion") {
      h = w * THICK.onion;
      for (var o = 0; o < 3; o++) {
        var ox = x + (o - 1) * w * 0.31;
        ell(c, ox, y - h * 0.5, w * 0.17, h * 0.55);
        blob(c, "#f3e2f5", "#8b3f8f", l * 1.1);
        ell(c, ox, y - h * 0.5, w * 0.09, h * 0.28);
        c.strokeStyle = "#b46db8"; c.lineWidth = l; c.stroke();
      }
      return h * 0.95;
    }
    if (id === "pickles") {
      h = w * THICK.pickles;
      for (var p = 0; p < 4; p++) {
        var pxx = x + (p - 1.5) * w * 0.25;
        ell(c, pxx, y - h * 0.5, w * 0.12, h * 0.55);
        blob(c, "#7cb83a", "#2f5a14", l);
        c.fillStyle = "#c6e88a";
        ell(c, pxx, y - h * 0.5, w * 0.06, h * 0.25); c.fill();
      }
      return h * 0.95;
    }
    if (id === "peppers") {
      h = w * THICK.peppers;
      for (var q = 0; q < 4; q++) {
        var cx = x + (q - 1.5) * w * 0.25;
        c.beginPath();
        c.moveTo(cx - w * 0.11, y - h * 0.6);
        c.quadraticCurveTo(cx, y - h * 1.2, cx + w * 0.11, y - h * 0.5);
        c.quadraticCurveTo(cx + w * 0.02, y + h * 0.3, cx - w * 0.11, y - h * 0.6);
        c.closePath();
        blob(c, q % 2 ? "#ff7a1a" : "#f23b1b", INK, l);
        c.strokeStyle = "#3f8f2a"; c.lineWidth = l * 1.4;
        c.beginPath(); c.moveTo(cx - w * 0.1, y - h * 0.62); c.lineTo(cx - w * 0.14, y - h * 0.95); c.stroke();
      }
      return h * 0.95;
    }
    return 0;
  }

  function posFor(layers, i) {
    if (layers[i] !== "bun") return "middle";
    if (i === 0) return "bottom";
    return i === layers.length - 1 ? "top" : "middle";
  }

  // A whole burger, bottom at y. Returns the y of its top.
  function burger(c, layers, sauce, x, y, w, t, lw) {
    var top = y;
    for (var i = 0; i < layers.length; i++) top -= layer(c, layers[i], posFor(layers, i), x, top, w, lw);
    if (sauce && layers.length) drizzle(c, sauce, x, top, w, t || 0, layers[layers.length - 1] === "bun" && layers.length > 1);
    return top;
  }

  function stackHeight(layers, w) {
    var h = 0;
    for (var i = 0; i < layers.length; i++) h += layerHeight(layers[i], posFor(layers, i)) * w * 0.94;
    return h;
  }

  // Hot sauce squiggled over the top, with drips. LAVA glows.
  function drizzle(c, sauce, x, top, w, t, onDome) {
    var col = SAUCE_COLOR[sauce], y = top + (onDome ? w * 0.08 : w * 0.01);
    c.save();
    if (sauce === "lava") { c.shadowColor = "#ffd000"; c.shadowBlur = w * 0.12; }
    c.strokeStyle = col; c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = Math.max(2, w * 0.06);
    c.beginPath();
    for (var i = 0; i <= 12; i++) {
      var px = x - w * 0.36 + (w * 0.72 * i) / 12;
      var dome = onDome ? -Math.sin((i / 12) * Math.PI) * w * 0.13 : 0;
      var py = y + dome + Math.sin(i * 1.6) * w * 0.035;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
    c.fillStyle = col;
    for (var d = 0; d < 3; d++) {
      var dx = x + (d - 1) * w * 0.3, dl = w * (0.06 + 0.04 * Math.sin(t * 3 + d * 2));
      ell(c, dx, y + w * 0.03 + dl, w * 0.03, w * 0.04); c.fill();
      c.fillRect(dx - w * 0.02, y, w * 0.04, dl + w * 0.03);
    }
    c.restore();
    if (sauce === "lava") {
      c.fillStyle = "#fff2a0";
      for (var s = 0; s < 3; s++) {
        var a = t * 4 + s * 2.1;
        ell(c, x + Math.cos(a) * w * 0.3, y - w * 0.15 - Math.abs(Math.sin(a)) * w * 0.1, w * 0.018, w * 0.018); c.fill();
      }
    }
  }

  function flame(c, x, y, s, col) {
    c.beginPath();
    c.moveTo(x, y - s);
    c.quadraticCurveTo(x + s * 0.7, y - s * 0.3, x + s * 0.45, y + s * 0.15);
    c.quadraticCurveTo(x, y + s * 0.45, x - s * 0.45, y + s * 0.15);
    c.quadraticCurveTo(x - s * 0.7, y - s * 0.3, x, y - s);
    c.closePath();
    c.fillStyle = col; c.fill();
    c.fillStyle = "#ffe36b";
    ell(c, x, y + s * 0.05, s * 0.2, s * 0.25); c.fill();
  }

  // A squeeze bottle, bottom at y, h tall.
  function bottle(c, sauce, x, y, h, lw) {
    var w = h * 0.5, l = lw || Math.max(1.2, h * 0.04), col = SAUCE_COLOR[sauce];
    c.lineJoin = "round";
    // nozzle
    c.beginPath(); c.moveTo(x - w * 0.12, y - h * 0.8); c.lineTo(x - w * 0.05, y - h); c.lineTo(x + w * 0.05, y - h); c.lineTo(x + w * 0.12, y - h * 0.8); c.closePath();
    blob(c, "#fff3d6", INK, l);
    // cap
    rr(c, x - w * 0.3, y - h * 0.84, w * 0.6, h * 0.14, h * 0.04); blob(c, "#3a140c");
    // body
    rr(c, x - w * 0.5, y - h * 0.72, w, h * 0.72, w * 0.28);
    var g = c.createLinearGradient(x - w * 0.5, 0, x + w * 0.5, 0);
    g.addColorStop(0, SAUCE_DARK[sauce]); g.addColorStop(0.35, col); g.addColorStop(1, SAUCE_DARK[sauce]);
    blob(c, g, INK, l);
    // label with flames: 1, 2 or 3
    rr(c, x - w * 0.38, y - h * 0.5, w * 0.76, h * 0.3, h * 0.05); blob(c, "#fff3d6");
    var n = sauce === "mild" ? 1 : sauce === "fiery" ? 2 : 3;
    for (var i = 0; i < n; i++) flame(c, x + (i - (n - 1) / 2) * w * 0.24, y - h * 0.34, h * 0.09, sauce === "lava" ? "#ff5a00" : col);
    c.fillStyle = "rgba(255,255,255,0.35)";
    rr(c, x - w * 0.36, y - h * 0.68, w * 0.12, h * 0.55, w * 0.06); c.fill();
  }

  // The little sauce sticker on a ticket: a coloured pill that says MILD, FIERY or LAVA.
  function sauceChip(c, sauce, x, y, w, h) {
    rr(c, x - w / 2, y - h / 2, w, h, h / 2);
    blob(c, sauce ? SAUCE_COLOR[sauce] : "#ddd", INK, Math.max(1, h * 0.08));
    c.fillStyle = sauce === "mild" ? INK : "#fff";
    c.font = "900 " + Math.round(h * 0.62) + "px ui-rounded, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(SAUCE_LABEL[sauce] || "?", x, y + h * 0.04);
  }

  // A button icon for an ingredient: one layer, big enough to read.
  function icon(c, id, size) {
    c.clearRect(0, 0, size, size);
    var w = size * 0.86, x = size / 2;
    if (id === "bun") {
      layer(c, "bun", "top", x, size * 0.56, w, size * 0.035);
      layer(c, "bun", "bottom", x, size * 0.86, w * 0.92, size * 0.035);
      return;
    }
    if (id === "mild" || id === "fiery" || id === "lava") { bottle(c, id, x, size * 0.97, size * 0.92, size * 0.035); return; }
    var h = layerHeight(id, "middle") * w, sy = Math.max(1, Math.min(4, size * 0.4 / h));
    c.save();
    c.translate(x, size * 0.5 + h * sy * 0.5);
    c.scale(1, sy);
    layer(c, id, "middle", 0, 0, w, size * 0.03);
    c.restore();
  }

  // ---- devils ----
  // A round goofy devil standing behind the counter, centred on x with the counter top at
  // y, s is the scale (1 is a regular devil). look is -1..1 for where the eyes point.
  // mood: 0 happy .. 1 about to blow; state: "wait", "happy", "meh", "mad".
  function devil(c, d, x, y, s, t, mood, state, look) {
    var bob = Math.sin(t * 3 + d.id) * 2 * s;
    var mad = state === "mad";
    var r = 44 * s, cy = y - 30 * s + bob;
    var heat = mad ? 1 : Math.max(0, (mood - 0.55) / 0.45);
    if (mad) cy += Math.abs(Math.sin(t * 18)) * -6 * s;
    c.save();
    c.lineJoin = "round"; c.lineCap = "round";
    var lw = 3 * s;

    // tail
    c.strokeStyle = INK; c.lineWidth = lw * 2.4;
    var tw = Math.sin(t * 4 + d.id) * 8 * s;
    c.beginPath(); c.moveTo(x - r * 0.7, cy + r * 0.3); c.bezierCurveTo(x - r * 1.5, cy + r * 0.4, x - r * 1.3, cy - r * 0.6 + tw, x - r * 1.45, cy - r * 0.9 + tw); c.stroke();
    c.strokeStyle = mix(d.hue, "#a8140c", heat); c.lineWidth = lw * 1.2;
    c.stroke();
    c.beginPath();
    var tx = x - r * 1.45, ty = cy - r * 0.9 + tw;
    c.moveTo(tx, ty - 11 * s); c.lineTo(tx + 9 * s, ty + 5 * s); c.lineTo(tx - 9 * s, ty + 5 * s); c.closePath();
    blob(c, mix(d.hue, "#a8140c", heat), INK, lw * 0.8);

    // pitchfork spatula (the devils' cooking tool)
    var fx = x + r * 0.95, fy = cy + r * 0.4;
    c.strokeStyle = INK; c.lineWidth = lw * 2.2;
    c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + 10 * s, fy - 88 * s); c.stroke();
    c.strokeStyle = "#a0602c"; c.lineWidth = lw * 1.1; c.stroke();
    var hx = fx + 11 * s, hy = fy - 92 * s;
    c.beginPath();
    c.moveTo(hx - 15 * s, hy); c.lineTo(hx - 17 * s, hy - 24 * s); c.lineTo(hx - 10 * s, hy - 17 * s);
    c.lineTo(hx - 5 * s, hy - 27 * s); c.lineTo(hx, hy - 18 * s); c.lineTo(hx + 5 * s, hy - 27 * s);
    c.lineTo(hx + 10 * s, hy - 17 * s); c.lineTo(hx + 17 * s, hy - 24 * s); c.lineTo(hx + 15 * s, hy);
    c.closePath();
    blob(c, "#cfd6de", INK, lw * 0.8);
    c.fillStyle = "#8d98a4"; rr(c, hx - 9 * s, hy - 9 * s, 18 * s, 4 * s, 2 * s); c.fill();

    // horns
    var hornCol = "#fff0c2";
    [-1, 1].forEach(function (side) {
      c.beginPath();
      var bx = x + side * r * 0.45, by = cy - r * 0.82;
      c.moveTo(bx - side * 9 * s, by + 4 * s);
      c.quadraticCurveTo(bx + side * 2 * s, by - 10 * s, bx + side * 8 * s, by - 20 * s);
      c.quadraticCurveTo(bx + side * 10 * s, by - 4 * s, bx + side * 9 * s, by + 6 * s);
      c.closePath();
      blob(c, hornCol, INK, lw * 0.8);
    });

    // body
    ell(c, x, cy, r, r * 0.97);
    var g = c.createRadialGradient(x - r * 0.35, cy - r * 0.45, r * 0.1, x, cy, r * 1.1);
    var body = mix(d.hue, "#b0130a", heat * 0.85);
    g.addColorStop(0, mix(body, "#ffffff", 0.35)); g.addColorStop(0.55, body); g.addColorStop(1, mix(body, "#000000", 0.25));
    blob(c, g, INK, lw);
    // belly
    ell(c, x, cy + r * 0.45, r * 0.55, r * 0.4); c.fillStyle = "rgba(255,210,170,0.45)"; c.fill();

    // arms holding the fork
    c.strokeStyle = INK; c.lineWidth = lw * 3.4;
    c.beginPath(); c.moveTo(x + r * 0.75, cy + r * 0.15); c.quadraticCurveTo(x + r * 1.0, cy + r * 0.25, fx + 4 * s, fy - 22 * s); c.stroke();
    c.strokeStyle = body; c.lineWidth = lw * 2;
    c.stroke();
    ell(c, fx + 5 * s, fy - 22 * s, 7 * s, 7 * s); blob(c, body, INK, lw * 0.8);

    // fancy bits
    if (d.fussy) {
      c.beginPath();
      c.moveTo(x, cy + r * 0.12); c.lineTo(x - 15 * s, cy + r * 0.02); c.lineTo(x - 15 * s, cy + r * 0.32); c.closePath();
      c.moveTo(x, cy + r * 0.12); c.lineTo(x + 15 * s, cy + r * 0.02); c.lineTo(x + 15 * s, cy + r * 0.32); c.closePath();
      blob(c, "#7d4dff", INK, lw * 0.8);
      ell(c, x, cy + r * 0.17, 5 * s, 5 * s); blob(c, "#b49bff", INK, lw * 0.6);
    }
    if (d.boss) {
      c.beginPath();
      var ky = cy - r * 0.92;
      c.moveTo(x - 22 * s, ky); c.lineTo(x - 26 * s, ky - 24 * s); c.lineTo(x - 12 * s, ky - 12 * s); c.lineTo(x, ky - 30 * s);
      c.lineTo(x + 12 * s, ky - 12 * s); c.lineTo(x + 26 * s, ky - 24 * s); c.lineTo(x + 22 * s, ky); c.closePath();
      blob(c, "#ffd23a", INK, lw * 0.8);
      ["#5fd35a", "#57c4ff", "#ff6f9c"].forEach(function (col, i) { ell(c, x + (i - 1) * 13 * s, ky - 6 * s, 3.5 * s, 3.5 * s); blob(c, col); });
      // big gold medal
      c.strokeStyle = "#ffd23a"; c.lineWidth = lw;
      c.beginPath(); c.arc(x, cy + r * 0.05, r * 0.42, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
      ell(c, x, cy + r * 0.47, 11 * s, 11 * s); blob(c, "#ffd23a", INK, lw * 0.7);
      c.fillStyle = INK; c.font = "900 " + Math.round(9 * s) + "px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("B", x, cy + r * 0.48);
    }

    // face
    var ey = cy - r * 0.28, ex = r * 0.34, er = r * 0.24;
    [-1, 1].forEach(function (side) {
      ell(c, x + side * ex, ey, er, er * 1.08); blob(c, "#fff", INK, lw * 0.8);
      var px = x + side * ex + (look || 0) * er * 0.4, py = ey + er * 0.2;
      if (mad) { px = x + side * ex; py = ey + er * 0.1; }
      ell(c, px, py, er * 0.48, er * 0.52); blob(c, INK);
      ell(c, px - er * 0.15, py - er * 0.2, er * 0.14, er * 0.14); blob(c, "#fff");
    });
    if (d.fussy) { // monocle
      c.strokeStyle = "#ffd23a"; c.lineWidth = lw * 0.9;
      ell(c, x + ex, ey, er * 1.25, er * 1.3); c.stroke();
      c.beginPath(); c.moveTo(x + ex + er * 1.1, ey + er * 0.6); c.quadraticCurveTo(x + ex + er * 1.6, ey + er * 2, x + ex + er * 0.8, ey + er * 2.6); c.stroke();
    }
    // eyebrows: relaxed when happy, a cross V when steamed
    var browTilt = state === "happy" ? -0.25 : mad ? 0.9 : Math.min(0.75, mood * 0.9);
    c.strokeStyle = INK; c.lineWidth = lw * 1.5;
    [-1, 1].forEach(function (side) {
      var bx = x + side * ex, by = ey - er * 1.45;
      c.beginPath();
      c.moveTo(bx - side * er * 0.9, by - browTilt * er * 0.2);
      c.lineTo(bx + side * er * 0.7, by - browTilt * er * -0.6 - er * 0.3);
      c.stroke();
    });
    // cheeks
    c.fillStyle = "rgba(255,140,170,0.55)";
    ell(c, x - r * 0.62, cy + r * 0.02, r * 0.13, r * 0.08); c.fill();
    ell(c, x + r * 0.62, cy + r * 0.02, r * 0.13, r * 0.08); c.fill();
    // mouth
    var my = cy + r * 0.12;
    c.strokeStyle = INK; c.lineWidth = lw * 1.2;
    if (state === "happy" || (!mad && state !== "meh" && mood < 0.35)) {
      c.beginPath(); c.moveTo(x - r * 0.3, my); c.quadraticCurveTo(x, my + r * (state === "happy" ? 0.45 : 0.3), x + r * 0.3, my); c.closePath();
      blob(c, "#7a1010", INK, lw * 1.1);
      c.beginPath(); c.moveTo(x + r * 0.08, my + r * 0.01); c.lineTo(x + r * 0.14, my + r * 0.12); c.lineTo(x + r * 0.2, my + r * 0.01); c.closePath(); blob(c, "#fff");
    } else if (mad) {
      ell(c, x, my + r * 0.12, r * 0.22, r * 0.14); blob(c, "#5a0a0a", INK, lw);
    } else if (state === "meh" || mood < 0.7) {
      c.beginPath(); c.moveTo(x - r * 0.22, my + r * 0.08); c.lineTo(x + r * 0.22, my + r * 0.04); c.stroke();
    } else {
      c.beginPath(); c.moveTo(x - r * 0.25, my + r * 0.18); c.quadraticCurveTo(x, my - r * 0.05, x + r * 0.25, my + r * 0.18); c.stroke();
    }
    c.restore();
  }

  // Puffs of steam from the horns: more and bigger the madder the devil is.
  function steam(c, x, y, s, t, amount) {
    if (amount <= 0) return;
    var n = Math.ceil(amount * 4);
    for (var i = 0; i < n; i++) {
      var ph = (t * (0.9 + amount) + i / n) % 1;
      [-1, 1].forEach(function (side) {
        var px = x + side * (30 + ph * 26) * s, py = y - (88 + ph * 60) * s;
        c.fillStyle = "rgba(255,255,255," + (0.85 * (1 - ph) * Math.min(1, amount * 1.5)) + ")";
        ell(c, px, py, (7 + ph * 14) * s * (0.6 + amount * 0.6), (6 + ph * 11) * s * (0.6 + amount * 0.6)); c.fill();
      });
    }
  }

  // ---- the kitchen ----
  function kitchen(c, W, H, counterY, t, wide) {
    var g = c.createLinearGradient(0, 0, 0, counterY);
    g.addColorStop(0, "#ff9f43"); g.addColorStop(1, "#e25a2b");
    c.fillStyle = g; c.fillRect(0, 0, W, counterY + 4);
    // tiles
    c.fillStyle = "rgba(255,230,180,0.12)";
    var ts = 46;
    for (var ty = 0; ty < counterY; ty += ts) for (var tx = ((ty / ts) % 2) * ts * 0.5 - ts; tx < W; tx += ts) { rr(c, tx + 3, ty + 3, ts - 6, ts - 6, 8); c.fill(); }
    // shelf with lava lamps and bubbling sauce pots
    var shelfY = Math.min(counterY - 170, H * 0.34);
    if (shelfY > 70) {
      c.fillStyle = "#7a2d16"; rr(c, 0, shelfY, W, 12, 4); c.fill();
      var n = Math.max(3, Math.floor(W / 150));
      for (var i = 0; i < n; i++) {
        var x = (i + 0.5) * W / n;
        if (i % 2 === 0) lavaLamp(c, x, shelfY, t + i * 1.7);
        else saucePot(c, x, shelfY, t + i, ["fiery", "lava", "mild"][i % 3]);
      }
    }
    // a glow from below, like lava under the floor
    var glow = c.createRadialGradient(W / 2, counterY + 40, 10, W / 2, counterY, W * 0.7);
    glow.addColorStop(0, "rgba(255,220,90,0.35)"); glow.addColorStop(1, "rgba(255,220,90,0)");
    c.fillStyle = glow; c.fillRect(0, 0, W, counterY);
  }

  function counter(c, W, H, counterY) {
    var g = c.createLinearGradient(0, counterY, 0, H);
    g.addColorStop(0, "#8a3a1c"); g.addColorStop(1, "#4a1a0c");
    c.fillStyle = g; c.fillRect(0, counterY + 10, W, H - counterY);
    c.fillStyle = "#c56a34"; rr(c, -10, counterY - 6, W + 20, 22, 8); c.fill();
    c.fillStyle = "rgba(255,230,180,0.35)"; c.fillRect(0, counterY - 4, W, 4);
    // flame stencils on the counter front
    for (var x = 40; x < W; x += 120) {
      c.globalAlpha = 0.18; flame(c, x, counterY + 70, 22, "#ffb22e"); c.globalAlpha = 1;
    }
  }

  function lavaLamp(c, x, y, t) {
    c.save();
    c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x - 22, y - 8); c.lineTo(x - 10, y - 70); c.lineTo(x + 10, y - 70); c.lineTo(x + 22, y - 8); c.lineTo(x + 14, y); c.closePath();
    var g = c.createLinearGradient(0, y - 70, 0, y);
    g.addColorStop(0, "#ffd36b"); g.addColorStop(1, "#ff7a2a");
    blob(c, g, INK, 2.5);
    c.clip();
    for (var i = 0; i < 3; i++) {
      var by = y - 12 - ((t * 9 + i * 22) % 56), bx = x + Math.sin(t + i * 2) * 5;
      ell(c, bx, by, 6 + i, 8 + i * 1.5); c.fillStyle = "#e8321e"; c.fill();
    }
    c.restore();
    c.fillStyle = "#3a140c"; rr(c, x - 12, y - 80, 24, 12, 4); c.fill(); rr(c, x - 18, y - 8, 36, 8, 3); c.fill();
  }

  function saucePot(c, x, y, t, sauce) {
    var col = SAUCE_COLOR[sauce];
    for (var i = 0; i < 4; i++) {
      var ph = (t * 0.7 + i * 0.25) % 1;
      c.fillStyle = "rgba(255,255,255," + (0.5 * (1 - ph)) + ")";
      ell(c, x + Math.sin(i * 2 + t) * 10, y - 34 - ph * 30, 4 + ph * 6, 4 + ph * 6); c.fill();
    }
    ell(c, x, y - 30, 30, 8); blob(c, col, INK, 2.5);
    for (var b = 0; b < 3; b++) {
      var bp = (t * 1.3 + b * 0.33) % 1;
      ell(c, x - 15 + b * 15, y - 31, 3 + bp * 3, 2 + bp * 2); c.fillStyle = mix(col, "#ffffff", 0.4); c.fill();
    }
    c.beginPath(); c.moveTo(x - 30, y - 30); c.quadraticCurveTo(x - 32, y, x - 18, y); c.lineTo(x + 18, y); c.quadraticCurveTo(x + 32, y, x + 30, y - 30); c.closePath();
    blob(c, "#2d2730", INK, 2.5);
    c.fillStyle = "#4a4250"; rr(c, x - 38, y - 26, 10, 6, 3); c.fill(); rr(c, x + 28, y - 26, 10, 6, 3); c.fill();
  }

  function plate(c, x, y, w) {
    ell(c, x, y + 4, w * 0.62, w * 0.12); c.fillStyle = "rgba(0,0,0,0.25)"; c.fill();
    ell(c, x, y, w * 0.6, w * 0.12); blob(c, "#fff8ec", INK, 2.5);
    ell(c, x, y - 2, w * 0.42, w * 0.07); c.strokeStyle = "rgba(58,20,12,0.15)"; c.lineWidth = 2; c.stroke();
  }

  function hex(col) {
    var n = parseInt(col.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, f) {
    f = Math.max(0, Math.min(1, f));
    var A = hex(a), B = hex(b);
    var r = A.map(function (v, i) { return Math.round(v + (B[i] - v) * f); });
    return "#" + ((1 << 24) + (r[0] << 16) + (r[1] << 8) + r[2]).toString(16).slice(1);
  }

  root.DBSArt = {
    INK: INK, SAUCE_COLOR: SAUCE_COLOR, SAUCE_LABEL: SAUCE_LABEL,
    rr: rr, ell: ell, layer: layer, burger: burger, stackHeight: stackHeight, bottle: bottle, sauceChip: sauceChip,
    icon: icon, devil: devil, steam: steam, kitchen: kitchen, counter: counter, plate: plate, flame: flame, mix: mix
  };
})(window);
