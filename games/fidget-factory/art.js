// Fidget Factory: drawing. Everything here is canvas shapes in "unit" space: a fidget fits in a
// circle of radius 1 around (0, 0), and the caller scales the context to the size it wants.
// No sound, no clock, no saves: game.js owns those.
(function () {
  "use strict";
  var FF = window.FF = window.FF || {};
  var TAU = Math.PI * 2;
  var INK = "#2a2140";

  var COLORS = [
    { name: "Red", hex: "#ff4d5e" }, { name: "Orange", hex: "#ff9a3c" }, { name: "Yellow", hex: "#ffd93d" },
    { name: "Green", hex: "#4cd97b" }, { name: "Teal", hex: "#2ec4c6" }, { name: "Blue", hex: "#4f8cff" },
    { name: "Purple", hex: "#a66cff" }, { name: "Pink", hex: "#ff6fb5" }
  ];
  var PATTERNS = ["plain", "dots", "stripes", "stars"];
  var KINDS = ["spinner", "popit", "squishy", "cube"];
  var KIND_NAMES = { spinner: "Spinner", popit: "Pop-it", squishy: "Squishy", cube: "Clicky cube" };
  var SHAPES = {
    spinner: ["3 arms", "4 arms", "6 arms"],
    popit: ["Round", "Heart", "Star"],
    squishy: ["Blob", "Bunny", "Kitty"],
    cube: ["Sharp", "Rounded", "Bubbly"]
  };
  var EXTRAS = ["eyes", "glitter", "glow", "rainbow"];
  var EXTRA_NAMES = { eyes: "Googly eyes", glitter: "Glitter", glow: "Glow", rainbow: "Rainbow" };
  var CUBE_FACES = ["button", "switch", "slider", "dial", "joystick", "keys"];

  // ---- colour helpers ----
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex(c) { return "#" + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex([0, 1, 2].map(function (i) { return A[i] + (B[i] - A[i]) * t; })); }
  function light(a, t) { return mix(a, "#ffffff", t); }
  function dark(a, t) { return mix(a, "#1b1430", t); }
  // a rainbow colour as hex, so the mixing helpers above work on it too
  function hue(h, l) {
    h = (((h % 360) + 360) % 360) / 360; l = (l || 62) / 100;
    var s = 0.92, q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    var f = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return hex([f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]);
  }

  // ---- shape paths (unit space, cached) ----
  var cache = {};
  // Add a polygon wound the same way as ctx.arc's default, so a nonzero fill joins the pieces.
  function poly(p, pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
    if (s < 0) pts = pts.slice().reverse();
    p.moveTo(pts[0][0], pts[0][1]);
    for (var j = 1; j < pts.length; j++) p.lineTo(pts[j][0], pts[j][1]);
    p.closePath();
  }
  function spinnerGeo(n) {
    return n === 6 ? { d: 0.68, r: 0.24, c: 0.4 } : n === 4 ? { d: 0.64, r: 0.29, c: 0.38 } : { d: 0.6, r: 0.34, c: 0.36 };
  }
  function spinnerPath(n) {
    var key = "sp" + n; if (cache[key]) return cache[key];
    var g = spinnerGeo(n), p = new Path2D();
    p.moveTo(g.c, 0); p.arc(0, 0, g.c, 0, TAU);
    for (var i = 0; i < n; i++) {
      var a = i * TAU / n - Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      p.moveTo(ux * g.d + g.r, uy * g.d); p.arc(ux * g.d, uy * g.d, g.r, 0, TAU);
      // a neck that pinches in the middle, like a real spinner's curved sides
      var left = [], right = [];
      for (var k = 0; k <= 8; k++) {
        var s = k / 8, w = g.r * (0.92 - 0.38 * Math.sin(Math.PI * s)), dd = s * g.d;
        left.push([ux * dd + vx * w, uy * dd + vy * w]);
        right.unshift([ux * dd - vx * w, uy * dd - vy * w]);
      }
      poly(p, left.concat(right));
    }
    return (cache[key] = p);
  }
  function heartPath(p) {
    p.moveTo(0, 0.95);
    p.bezierCurveTo(-0.3, 0.72, -1.02, 0.36, -0.98, -0.24);
    p.bezierCurveTo(-0.95, -0.82, -0.3, -1.02, 0, -0.56);
    p.bezierCurveTo(0.3, -1.02, 0.95, -0.82, 0.98, -0.24);
    p.bezierCurveTo(1.02, 0.36, 0.3, 0.72, 0, 0.95);
    p.closePath();
  }
  function starPts(cx, cy, ro, ri, n, rot) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) { var a = rot + i * Math.PI / n, r = i % 2 ? ri : ro; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return pts;
  }
  function popitPath(shape) {
    var key = "pp" + shape; if (cache[key]) return cache[key];
    var p = new Path2D();
    if (shape === 1) heartPath(p);
    else if (shape === 2) poly(p, starPts(0, 0.06, 1.02, 0.6, 5, -Math.PI / 2));
    else { p.moveTo(0.95, 0); p.arc(0, 0, 0.95, 0, TAU); }
    return (cache[key] = p);
  }
  var probe = null;
  function inside(path, x, y) {
    if (!probe) probe = document.createElement("canvas").getContext("2d");
    return probe.isPointInPath(path, x, y);
  }
  // Bubble layout for a pop-it shape: a hex grid clipped to the shape, rows top to bottom.
  function popitBubbles(shape) {
    var key = "pb" + shape; if (cache[key]) return cache[key];
    var path = popitPath(shape), s = shape === 2 ? 0.25 : shape === 1 ? 0.27 : 0.3, r = s * 0.42, out = [], row = 0;
    for (var y = -1; y <= 1; y += s * 0.87, row++) {
      for (var x = -1 + (row % 2 ? s / 2 : 0); x <= 1; x += s) {
        var ok = inside(path, x, y);
        for (var k = 0; ok && k < 8; k++) { var a = k * TAU / 8; ok = inside(path, x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35); }
        if (ok) out.push({ x: x, y: y, r: r, row: row });
      }
    }
    var rows = {}; out.forEach(function (b) { rows[b.row] = 1; });
    var order = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });
    out.forEach(function (b) { b.row = order.indexOf(b.row); b.rows = order.length; });
    return (cache[key] = out);
  }
  // Squishy outline at rest: N points around a soft mochi shape.
  var SQ_N = 36;
  function squishyRest(shape) {
    var key = "sq" + shape; if (cache[key]) return cache[key];
    var pts = [], sc = shape ? 0.86 : 0.95, oy = shape ? 0.12 : 0.04;
    for (var i = 0; i < SQ_N; i++) {
      var a = i / SQ_N * TAU, x = Math.cos(a) * sc, y = Math.sin(a) * sc * 0.82;
      if (y > 0) y *= 0.86;
      pts.push([x, y + oy]);
    }
    return (cache[key] = pts);
  }
  function smoothPath(pts) {
    var p = new Path2D(), n = pts.length;
    var m = function (i) { var a = pts[(i + n) % n], b = pts[(i + 1 + n) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    var s = m(-1); p.moveTo(s[0], s[1]);
    for (var i = 0; i < n; i++) { var e = m(i); p.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
    p.closePath();
    return p;
  }
  function roundRect(p, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r);
    p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r);
    p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r);
    p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath();
  }
  var CUBE_H = 0.68;
  function cubeRadius(shape) { return [0.07, 0.24, 0.46][shape] || 0.07; }
  function cubeFacePath(shape, x0, x1) {
    var p = new Path2D(), r = cubeRadius(shape) * Math.min(1, (x1 - x0) / (CUBE_H * 2) * 2);
    roundRect(p, x0, -CUBE_H, Math.max(0.001, x1 - x0), CUBE_H * 2, r);
    return p;
  }

  // ---- patterns, glitter, eyes ----
  function drawPattern(ctx, pattern, col, ext) {
    ext = ext || 1.2;
    ctx.fillStyle = col;
    if (pattern === "dots") {
      var s = 0.27, row = 0;
      for (var y = -ext; y <= ext; y += s * 0.87, row++)
        for (var x = -ext + (row % 2 ? s / 2 : 0); x <= ext; x += s) { ctx.beginPath(); ctx.arc(x, y, 0.065, 0, TAU); ctx.fill(); }
    } else if (pattern === "stripes") {
      ctx.save(); ctx.rotate(-0.6);
      for (var sx = -ext * 1.5; sx <= ext * 1.5; sx += 0.3) ctx.fillRect(sx, -ext * 1.5, 0.12, ext * 3);
      ctx.restore();
    } else if (pattern === "stars") {
      var st = 0.38, r2 = 0;
      for (var yy = -ext; yy <= ext; yy += st * 0.87, r2++)
        for (var xx = -ext + (r2 % 2 ? st / 2 : 0); xx <= ext; xx += st) { var p = new Path2D(); poly(p, starPts(xx, yy, 0.1, 0.045, 5, -Math.PI / 2)); ctx.fill(p); }
    }
  }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function drawGlitter(ctx, seed, t, ext) {
    var h = hash(seed);
    for (var i = 0; i < 22; i++) {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; var x = (h % 1000) / 500 - 1;
      h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; var y = (h % 1000) / 500 - 1;
      var tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7), s = (0.03 + 0.05 * tw) * (ext || 1);
      ctx.fillStyle = i % 3 ? "rgba(255,255,255," + (0.55 + 0.45 * tw) + ")" : "rgba(255,240,150," + (0.6 + 0.4 * tw) + ")";
      ctx.beginPath(); ctx.moveTo(x, y - s * 2); ctx.lineTo(x + s * 0.5, y - s * 0.5); ctx.lineTo(x + s * 2, y); ctx.lineTo(x + s * 0.5, y + s * 0.5);
      ctx.lineTo(x, y + s * 2); ctx.lineTo(x - s * 0.5, y + s * 0.5); ctx.lineTo(x - s * 2, y); ctx.lineTo(x - s * 0.5, y - s * 0.5); ctx.closePath(); ctx.fill();
    }
  }
  // A googly eye. Its pupil hangs in world space (o.eyes[k].ox/oy, pixels), so it rolls around
  // as the toy moves; the eye's world position goes back out for game.js to do the physics.
  function googly(ctx, o, k, x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.lineWidth = r * 0.22; ctx.strokeStyle = INK; ctx.stroke();
    var m = ctx.getTransform(), w = m.transformPoint(new DOMPoint(x, y)), edge = m.transformPoint(new DOMPoint(x + r, y));
    var rpx = Math.hypot(edge.x - w.x, edge.y - w.y), px = x, py = y + r * 0.42;
    if (o && o.eyes) {
      var e = o.eyes[k] || (o.eyes[k] = { ox: 0, oy: rpx * 0.42, vx: 0, vy: 0 });
      e.wx = w.x; e.wy = w.y; e.r = rpx; e.seen = true;
      var back = m.inverse().transformPoint(new DOMPoint(w.x + e.ox, w.y + e.oy));
      px = back.x; py = back.y;
    }
    ctx.beginPath(); ctx.arc(px, py, r * 0.52, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(px - r * 0.16, py - r * 0.18, r * 0.14, 0, TAU); ctx.fillStyle = "#fff"; ctx.fill();
  }

  function has(o, d, name) {
    if (o.grey) return false;
    if (o.extras && o.extras !== true) return !!o.extras[name] && !!d[name];
    return !!d[name];
  }
  function paints(d, o) {
    if (o.grey) return { c1: "#d4cfe0", c2: "#b9b2ca", grey: true };
    var c1 = COLORS[d.c1] ? COLORS[d.c1].hex : COLORS[0].hex, c2 = COLORS[d.c2] ? COLORS[d.c2].hex : COLORS[1].hex;
    if (c1 === c2) c2 = light(c2, 0.55);
    return { c1: c1, c2: c2 };
  }
  function rainbowFill(ctx, t) {
    var g = ctx.createLinearGradient(-1, -1, 1, 1);
    for (var i = 0; i <= 6; i++) g.addColorStop(i / 6, hue(i * 55 + (t || 0) * 30));
    return g;
  }
  function glowOn(ctx, o, col, amt) {
    ctx.shadowColor = light(col, 0.35);
    ctx.shadowBlur = (o.px || 100) * (o.lightsOff ? 0.5 : 0.28) * (amt || 1);
  }
  function glowOff(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = "transparent"; }
  function shine(ctx, x, y, rx, ry, a) {
    ctx.save(); ctx.globalAlpha *= a || 0.4; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.5, 0, TAU); ctx.fill(); ctx.restore();
  }
  // Body: outline, fill, then the pattern and glitter clipped to it.
  function body(ctx, path, d, o, P, fillCol, patCol, ext) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 0.09; ctx.strokeStyle = INK;
    if (has(o, d, "glow")) glowOn(ctx, o, P.c1);
    ctx.stroke(path); glowOff(ctx);
    ctx.fillStyle = has(o, d, "rainbow") ? rainbowFill(ctx, o.t) : fillCol;
    ctx.fill(path);
    ctx.save(); ctx.clip(path);
    if (o.pattern !== false && !o.grey && d.pattern !== "plain") {
      if (o.lightsOff && has(o, d, "glow")) ctx.globalCompositeOperation = "lighter";
      drawPattern(ctx, d.pattern, has(o, d, "rainbow") ? "rgba(255,255,255,0.75)" : patCol, ext);
      ctx.globalCompositeOperation = "source-over";
    }
    if (has(o, d, "glitter")) drawGlitter(ctx, d.id || "x", o.t || 0, 1);
    // soft shading from the bottom right
    var g = ctx.createRadialGradient(-0.35, -0.45, 0.1, 0, 0, 1.3);
    g.addColorStop(0, "rgba(255,255,255,0.28)"); g.addColorStop(0.55, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(30,10,60,0.28)");
    ctx.fillStyle = g; ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  }

  // ---- the four kinds ----
  function drawSpinner(ctx, d, st, o, P) {
    var n = [3, 4, 6][d.shape] || 3, g = spinnerGeo(n), path = spinnerPath(n), a = st ? st.a : 0, sw = st ? st.w || 0 : 0;
    var blur = Math.abs(sw) > 7 ? Math.min(4, Math.floor(Math.abs(sw) / 9)) : 0;
    for (var gi = blur; gi >= 0; gi--) {
      ctx.save();
      ctx.rotate(a - gi * sw * 0.012);
      if (gi > 0) ctx.globalAlpha *= 0.18;
      body(ctx, path, d, o, P, P.c1, P.c2, 1.1);
      for (var i = 0; i < n; i++) {
        var la = i * TAU / n - Math.PI / 2, x = Math.cos(la) * g.d, y = Math.sin(la) * g.d;
        ctx.beginPath(); ctx.arc(x, y, g.r * 0.62, 0, TAU);
        var mg = ctx.createRadialGradient(x - g.r * 0.2, y - g.r * 0.2, 0.01, x, y, g.r * 0.62);
        mg.addColorStop(0, "#ffffff"); mg.addColorStop(0.5, "#c9c6d6"); mg.addColorStop(1, "#7c7690");
        ctx.fillStyle = mg; ctx.fill(); ctx.lineWidth = 0.05; ctx.strokeStyle = INK; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, g.r * 0.32, 0, TAU); ctx.fillStyle = P.grey ? "#a9a3ba" : P.c2; ctx.fill(); ctx.stroke();
      }
      // centre cap
      ctx.beginPath(); ctx.arc(0, 0, 0.25, 0, TAU);
      ctx.fillStyle = P.grey ? "#bcb6cc" : P.c2; ctx.fill(); ctx.lineWidth = 0.06; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 0.14, 0, TAU); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
      if (gi === 0 && has(o, d, "eyes")) { googly(ctx, o, 0, -0.1, -0.02, 0.095); googly(ctx, o, 1, 0.1, -0.02, 0.095); }
      ctx.restore();
    }
    shine(ctx, -0.3, -0.42, 0.18, 0.07, 0.35);
  }

  function drawPopit(ctx, d, st, o, P) {
    var path = popitPath(d.shape || 0), bubbles = popitBubbles(d.shape || 0);
    var side = st ? st.side : 0, flip = st ? st.flipT : 0;
    var sx = flip ? Math.cos(Math.PI * flip) : 1;
    var plate = side ? P.c2 : P.c1, pat = side ? P.c1 : P.c2;
    ctx.save();
    ctx.scale(Math.abs(sx) < 0.04 ? 0.04 : Math.abs(sx), 1);
    body(ctx, path, d, o, P, plate, light(pat, 0.15), 1.15);
    var rainbow = has(o, d, "rainbow");
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i], up = st ? st.up[i] : true, an = st ? st.anim[i] : 0;
      var base = rainbow ? hue(b.row / Math.max(1, b.rows - 1) * 300, 60) : plate;
      if (P.grey) base = "#d4cfe0";
      var r = b.r * (1 - 0.12 * Math.sin(Math.min(1, an) * Math.PI));
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU);
      if (up) {
        var g = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.4, r * 0.1, b.x, b.y, r);
        g.addColorStop(0, light(base, 0.55)); g.addColorStop(0.7, light(base, 0.12)); g.addColorStop(1, dark(base, 0.12));
        ctx.fillStyle = g;
      } else {
        var g2 = ctx.createRadialGradient(b.x + r * 0.3, b.y + r * 0.35, r * 0.1, b.x, b.y, r);
        g2.addColorStop(0, light(base, 0.08)); g2.addColorStop(0.75, dark(base, 0.22)); g2.addColorStop(1, dark(base, 0.42));
        ctx.fillStyle = g2;
      }
      if (has(o, d, "glow") && up) glowOn(ctx, o, base, 0.35);
      ctx.fill(); glowOff(ctx);
      ctx.lineWidth = 0.025; ctx.strokeStyle = dark(base, 0.45); ctx.stroke();
      if (up) shine(ctx, b.x - r * 0.35, b.y - r * 0.4, r * 0.28, r * 0.14, 0.7);
    }
    if (has(o, d, "eyes")) {
      var top = bubbles.length ? bubbles[0].y - bubbles[0].r - 0.04 : -0.7;
      if (d.shape === 1) top = -0.6;
      googly(ctx, o, 0, -0.17, top, 0.12); googly(ctx, o, 1, 0.17, top, 0.12);
    }
    ctx.restore();
  }

  function squishyPoints(d, st) {
    var rest = squishyRest(d.shape || 0), pts = [];
    var sx = st ? st.sx : 1, sy = st ? st.sy : 1;
    for (var i = 0; i < rest.length; i++) {
      var x = rest[i][0] * sx, y = rest[i][1] * sy + (1 - sy) * 0.72;
      if (st) { x += st.ox[i]; y += st.oy[i]; }
      pts.push([x, y]);
    }
    return pts;
  }
  function drawSquishy(ctx, d, st, o, P) {
    var pts = squishyPoints(d, st), path = smoothPath(pts), shape = d.shape || 0, n = pts.length;
    if (shape) {
      // ears follow the top of the body and flop with it
      var ears = [Math.round(n * 0.68), Math.round(n * 0.82)];
      for (var e = 0; e < 2; e++) {
        var p = pts[ears[e]], tilt = (e ? 0.35 : -0.35) + (st ? st.ear[e] : 0);
        ctx.save(); ctx.translate(p[0], p[1] + 0.08); ctx.rotate(tilt);
        var ep = new Path2D();
        if (shape === 1) ep.ellipse(0, -0.42, 0.15, 0.44, 0, 0, TAU);
        else poly(ep, [[-0.24, 0.08], [0, -0.46], [0.24, 0.08]]);
        ctx.lineJoin = "round"; ctx.lineWidth = 0.09; ctx.strokeStyle = INK; ctx.stroke(ep);
        ctx.fillStyle = has(o, d, "rainbow") ? hue(e * 180 + (o.t || 0) * 30) : P.c1; ctx.fill(ep);
        var ip = new Path2D();
        if (shape === 1) ip.ellipse(0, -0.4, 0.07, 0.3, 0, 0, TAU); else poly(ip, [[-0.12, 0.02], [0, -0.3], [0.12, 0.02]]);
        ctx.fillStyle = P.grey ? "#c4bdd4" : light(P.c2, 0.25); ctx.fill(ip);
        ctx.restore();
      }
    }
    body(ctx, path, d, o, P, P.c1, light(P.c2, 0.1), 1.2);
    if (P.grey) return;
    // face: it squints happily when squashed
    var c = pts.reduce(function (s, q) { return [s[0] + q[0] / n, s[1] + q[1] / n]; }, [0, 0]);
    var squash = st ? Math.max(0, 1 - st.sy) : 0, fx = c[0], fy = c[1] + 0.02;
    if (has(o, d, "eyes")) { googly(ctx, o, 0, fx - 0.27, fy - 0.12, 0.15); googly(ctx, o, 1, fx + 0.27, fy - 0.12, 0.15); }
    else {
      ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 0.06; ctx.lineCap = "round";
      for (var s = -1; s <= 1; s += 2) {
        if (squash > 0.12) { ctx.beginPath(); ctx.moveTo(fx + s * 0.34, fy - 0.2); ctx.lineTo(fx + s * 0.24, fy - 0.12); ctx.lineTo(fx + s * 0.34, fy - 0.04); ctx.stroke(); }
        else { ctx.beginPath(); ctx.ellipse(fx + s * 0.27, fy - 0.12, 0.06, 0.08, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(fx + s * 0.27 - 0.02, fy - 0.15, 0.022, 0, TAU); ctx.fill(); ctx.fillStyle = INK; }
      }
    }
    ctx.fillStyle = "rgba(255,90,120,0.4)";
    ctx.beginPath(); ctx.ellipse(fx - 0.44, fy + 0.04, 0.1, 0.06, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + 0.44, fy + 0.04, 0.1, 0.06, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.05; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(fx, fy + 0.02, 0.09 + squash * 0.1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    shine(ctx, fx - 0.42, fy - 0.42, 0.16, 0.08, 0.45);
  }

  // Cube face gadgets, in face space (-1..1 across the face, scaled to the face's half size).
  function gadget(ctx, kind, gs, P, o, d) {
    var acc = P.grey ? "#c4bdd4" : P.c2, ink = INK;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = ink;
    if (kind === "button") {
      var dep = gs ? gs.depth : 0;
      ctx.beginPath(); ctx.arc(0, 0.08, 0.62, 0, TAU); ctx.fillStyle = dark(acc, 0.55); ctx.fill(); ctx.lineWidth = 0.08; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -0.04 + dep * 0.1, 0.5, 0, TAU);
      var g = ctx.createRadialGradient(-0.18, -0.25 + dep * 0.1, 0.05, 0, dep * 0.1, 0.55);
      g.addColorStop(0, light(acc, 0.5)); g.addColorStop(1, dep > 0.5 ? dark(acc, 0.2) : acc); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
    } else if (kind === "switch") {
      var on = gs ? gs.pos : 0;
      ctx.beginPath(); ctx.arc(0, -0.72, 0.1, 0, TAU); ctx.fillStyle = on > 0.5 ? "#7dff9c" : "#4a4060";
      if (on > 0.5) { ctx.shadowColor = "#7dff9c"; ctx.shadowBlur = (o.px || 100) * 0.12; }
      ctx.fill(); glowOff(ctx); ctx.lineWidth = 0.05; ctx.stroke();
      var hp = new Path2D(); roundRect(hp, -0.3, -0.52, 0.6, 1.1, 0.16); ctx.fillStyle = "#3b3150"; ctx.fill(hp); ctx.lineWidth = 0.07; ctx.stroke(hp);
      var ly = -0.2 + 0.46 * on, lp = new Path2D(); roundRect(lp, -0.2, ly - 0.24, 0.4, 0.48, 0.1);
      ctx.fillStyle = acc; ctx.fill(lp); ctx.stroke(lp); shine(ctx, -0.06, ly - 0.12, 0.08, 0.04, 0.6);
    } else if (kind === "slider") {
      var v = gs ? gs.v : 0.5;
      var tp = new Path2D(); roundRect(tp, -0.78, -0.09, 1.56, 0.18, 0.09); ctx.fillStyle = "#3b3150"; ctx.fill(tp); ctx.lineWidth = 0.05; ctx.stroke(tp);
      ctx.fillStyle = light(acc, 0.2); var fp = new Path2D(); roundRect(fp, -0.74, -0.05, 1.48 * v + 0.001, 0.1, 0.05); ctx.fill(fp);
      ctx.lineWidth = 0.035;
      for (var i = 0; i <= 10; i++) { var x = -0.7 + 1.4 * i / 10; ctx.beginPath(); ctx.moveTo(x, 0.22); ctx.lineTo(x, i % 5 ? 0.3 : 0.38); ctx.stroke(); }
      var kx = -0.7 + 1.4 * v, kp = new Path2D(); roundRect(kp, kx - 0.14, -0.3, 0.28, 0.6, 0.1);
      ctx.fillStyle = acc; ctx.fill(kp); ctx.lineWidth = 0.06; ctx.stroke(kp);
      ctx.beginPath(); ctx.moveTo(kx, -0.18); ctx.lineTo(kx, 0.18); ctx.lineWidth = 0.04; ctx.strokeStyle = dark(acc, 0.4); ctx.stroke();
    } else if (kind === "dial") {
      var a = gs ? gs.a : 0;
      ctx.lineWidth = 0.04;
      for (var t = 0; t < 12; t++) { var ta = t * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(ta) * 0.72, Math.sin(ta) * 0.72); ctx.lineTo(Math.cos(ta) * 0.82, Math.sin(ta) * 0.82); ctx.stroke(); }
      ctx.save(); ctx.rotate(a);
      ctx.beginPath();
      for (var k = 0; k < 24; k++) { var ka = k * TAU / 24, rr = k % 2 ? 0.6 : 0.64; ctx.lineTo(Math.cos(ka) * rr, Math.sin(ka) * rr); }
      ctx.closePath(); ctx.fillStyle = acc; ctx.fill(); ctx.lineWidth = 0.06; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, TAU); ctx.fillStyle = light(acc, 0.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -0.12); ctx.lineTo(0, -0.38); ctx.lineWidth = 0.09; ctx.stroke();
      ctx.restore();
    } else if (kind === "joystick") {
      var jx = gs ? gs.x : 0, jy = gs ? gs.y : 0;
      ctx.beginPath(); ctx.arc(0, 0, 0.6, 0, TAU); ctx.fillStyle = "#3b3150"; ctx.fill(); ctx.lineWidth = 0.06; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 0.2, 0, TAU); ctx.fillStyle = "#5a4e74"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(jx, jy); ctx.lineWidth = 0.16; ctx.strokeStyle = "#8e86a3"; ctx.stroke(); ctx.strokeStyle = ink;
      ctx.beginPath(); ctx.arc(jx, jy, 0.3, 0, TAU);
      var jg = ctx.createRadialGradient(jx - 0.1, jy - 0.12, 0.03, jx, jy, 0.3); jg.addColorStop(0, light(acc, 0.55)); jg.addColorStop(1, acc);
      ctx.fillStyle = jg; ctx.fill(); ctx.lineWidth = 0.06; ctx.stroke();
    } else if (kind === "keys") {
      for (var q = 0; q < 3; q++) {
        var kd = gs ? gs.down[q] : 0, cx = -0.56 + q * 0.56;
        var bp = new Path2D(); roundRect(bp, cx - 0.24, -0.22, 0.48, 0.52, 0.1); ctx.fillStyle = "#3b3150"; ctx.fill(bp); ctx.lineWidth = 0.05; ctx.stroke(bp);
        var cp = new Path2D(); roundRect(cp, cx - 0.21, -0.3 + kd * 0.1, 0.42, 0.42, 0.09);
        var kc = q === 1 ? light(acc, 0.35) : acc; ctx.fillStyle = kd > 0.5 ? dark(kc, 0.15) : kc; ctx.fill(cp); ctx.stroke(cp);
        shine(ctx, cx - 0.08, -0.2 + kd * 0.1, 0.08, 0.035, 0.6);
      }
    }
  }
  function faceColor(d, o, P, f) {
    if (P.grey) return P.c1;
    if (has(o, d, "rainbow")) return hue(f * 60 + (o.t || 0) * 20);
    return f % 2 ? mix(P.c1, P.c2, 0.25) : P.c1;
  }
  function drawCube(ctx, d, st, o, P) {
    var shape = d.shape || 0, H = CUBE_H, f = st ? st.face : 0, rt = st ? st.rot : 0, dir = st ? st.rotDir : 1;
    // the cube's depth, drawn as a stack of darker copies behind the front
    var depth = new Path2D(); roundRect(depth, -H, -H, H * 2, H * 2, cubeRadius(shape));
    var side = dark(faceColor(d, o, P, f), 0.35);
    if (has(o, d, "glow")) glowOn(ctx, o, P.c1);
    var k;
    for (k = 7; k >= 0; k--) { ctx.save(); ctx.translate(k * 0.032, -k * 0.032); ctx.lineWidth = 0.13; ctx.strokeStyle = INK; ctx.stroke(depth); ctx.restore(); }
    glowOff(ctx);
    for (k = 7; k >= 1; k--) { ctx.save(); ctx.translate(k * 0.032, -k * 0.032); ctx.fillStyle = k > 5 ? light(side, 0.12) : side; ctx.fill(depth); ctx.restore(); }
    var faces = [];
    if (rt > 0) {
      var nf = (f + dir + 6) % 6, split = dir > 0 ? -H + H * 2 * (1 - rt) : -H + H * 2 * rt;
      if (dir > 0) faces.push([f, -H, split], [nf, split, H]); else faces.push([nf, -H, split], [f, split, H]);
    } else faces.push([f, -H, H]);
    ctx.lineWidth = 0.09; ctx.strokeStyle = INK;
    ctx.save(); ctx.translate(0, 0);
    var full = new Path2D(); roundRect(full, -H, -H, H * 2, H * 2, cubeRadius(shape)); ctx.stroke(full);
    ctx.clip(full);
    faces.forEach(function (fc) {
      var w = fc[2] - fc[1]; if (w <= 0.002) return;
      var fp = new Path2D(); fp.rect(fc[1], -H - 0.1, w, H * 2 + 0.2);
      var col = faceColor(d, o, P, fc[0]);
      ctx.save(); ctx.clip(fp);
      ctx.fillStyle = col; ctx.fillRect(-H - 0.2, -H - 0.2, H * 2 + 0.4, H * 2 + 0.4);
      if (o.pattern !== false && !P.grey && d.pattern !== "plain") { ctx.globalAlpha = 0.55; drawPattern(ctx, d.pattern, light(P.c2, 0.2), 1); ctx.globalAlpha = 1; }
      if (has(o, d, "glitter")) drawGlitter(ctx, (d.id || "x") + fc[0], o.t || 0, 0.8);
      var turn = rt > 0 ? (fc[0] === f ? rt : 1 - rt) : 0;
      ctx.translate((fc[1] + fc[2]) / 2, 0); ctx.scale(Math.max(0.01, w / (H * 2)), 1);
      ctx.scale(H * 0.95, H * 0.95);
      if (!o.grey) gadget(ctx, CUBE_FACES[fc[0]], st ? st.g[fc[0]] : null, P, o, d);
      ctx.restore();
      if (turn > 0) { ctx.fillStyle = "rgba(20,10,40," + (turn * 0.45) + ")"; ctx.fill(fp); }
      ctx.beginPath(); ctx.moveTo(fc[1], -H); ctx.lineTo(fc[1], H); ctx.lineWidth = fc[1] > -H + 0.01 ? 0.05 : 0; if (ctx.lineWidth) { ctx.strokeStyle = INK; ctx.stroke(); }
    });
    var g = ctx.createLinearGradient(-H, -H, H, H); g.addColorStop(0, "rgba(255,255,255,0.25)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(30,10,60,0.2)");
    ctx.fillStyle = g; ctx.fill(full);
    ctx.restore();
    if (has(o, d, "eyes")) { googly(ctx, o, 0, -0.2, -H - 0.02, 0.12); googly(ctx, o, 1, 0.2, -H - 0.02, 0.12); }
  }

  // Draw a fidget centred at the context's origin, in unit space.
  //   d: the design; st: its play state (or null for "at rest");
  //   o: { t, px (pixels per unit, for blur sizes), grey, pattern:false, extras:{...}|true, lightsOff, eyes }
  function drawFidget(ctx, d, st, o) {
    o = o || {};
    var P = paints(d, o);
    ctx.save();
    if (d.kind === "spinner") drawSpinner(ctx, d, st, o, P);
    else if (d.kind === "popit") drawPopit(ctx, d, st, o, P);
    else if (d.kind === "squishy") drawSquishy(ctx, d, st, o, P);
    else drawCube(ctx, d, st, o, P);
    ctx.restore();
  }
  // A path of the fidget's outline, for clipping the paint reveal in the factory.
  function silhouette(d, st) {
    if (d.kind === "spinner") return spinnerPath([3, 4, 6][d.shape] || 3);
    if (d.kind === "popit") return popitPath(d.shape || 0);
    if (d.kind === "squishy") return smoothPath(squishyPoints(d, st));
    var p = new Path2D(); roundRect(p, -CUBE_H, -CUBE_H, CUBE_H * 2, CUBE_H * 2, cubeRadius(d.shape || 0)); return p;
  }

  // ---- small factory and UI bits ----
  function gear(ctx, x, y, r, teeth, a, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath();
    for (var i = 0; i < teeth * 2; i++) { var ang = i * Math.PI / teeth, rr = i % 2 ? r * 0.82 : r; ctx.lineTo(Math.cos(ang - 0.12) * rr, Math.sin(ang - 0.12) * rr); ctx.lineTo(Math.cos(ang + 0.12) * rr, Math.sin(ang + 0.12) * rr); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill();
    ctx.restore();
  }
  // A cartoon robot arm hanging from a rail at (x, top), reaching to (tx, ty), with a googly-eyed head.
  function robotArm(ctx, x, top, tx, ty, col, tool, t, eyesState) {
    var mx = (x + tx) / 2 + (tx < x ? 30 : -30), my = (top + ty) / 2 - 10;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.fillStyle = "#4a4060"; ctx.fillRect(x - 34, top - 14, 68, 22);
    ctx.strokeStyle = INK; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
    [[x, top], [mx, my]].forEach(function (j) { ctx.beginPath(); ctx.arc(j[0], j[1], 11, 0, TAU); ctx.fillStyle = "#ffe066"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); });
    // head at the elbow, looking at the toy
    var hx = mx, hy = my - 30;
    var hp = new Path2D(); roundRect(hp, hx - 26, hy - 20, 52, 38, 12);
    ctx.fillStyle = light(col, 0.3); ctx.fill(hp); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(hp);
    ctx.beginPath(); ctx.moveTo(hx, hy - 20); ctx.lineTo(hx, hy - 32); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy - 35, 5, 0, TAU); ctx.fillStyle = Math.sin(t * 8) > 0 ? "#ff4d5e" : "#ffd93d"; ctx.fill(); ctx.stroke();
    var o = { eyes: eyesState };
    ctx.save(); ctx.translate(hx, hy - 2); ctx.scale(10, 10);
    googly(ctx, o, 0, -1.1, 0, 0.85); googly(ctx, o, 1, 1.1, 0, 0.85);
    ctx.restore();
    ctx.save(); ctx.translate(tx, ty); tool(ctx); ctx.restore();
  }

  FF.art = {
    COLORS: COLORS, PATTERNS: PATTERNS, KINDS: KINDS, KIND_NAMES: KIND_NAMES, SHAPES: SHAPES, EXTRAS: EXTRAS,
    EXTRA_NAMES: EXTRA_NAMES, CUBE_FACES: CUBE_FACES, INK: INK, CUBE_H: CUBE_H, SQ_N: SQ_N,
    mix: mix, light: light, dark: dark, hue: hue, hash: hash, roundRect: roundRect, starPts: starPts, poly: poly,
    drawFidget: drawFidget, silhouette: silhouette, drawPattern: drawPattern, popitBubbles: popitBubbles,
    popitPath: popitPath, spinnerGeo: spinnerGeo, squishyRest: squishyRest, squishyPoints: squishyPoints,
    gear: gear, robotArm: robotArm, googly: googly, inside: inside
  };
})();
