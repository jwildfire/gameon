// Oops! We're Late!: every picture, drawn with canvas shapes in room units (540 x 720).
// Floors, rugs, furniture, the chunky top-down people, view cones, bubbles. No image files.
(function (root) {
  "use strict";
  var E = root.OWL, TAU = Math.PI * 2;
  var INK = "#3a2a3f";
  var SHIRTS = ["#ff8fa3", "#7ec8e3", "#ffd166", "#9ad97a", "#c59bff", "#ffa66b", "#6fd3c1", "#f7a1d8", "#8fb3ff"];
  var SKINS = ["#f6d2b4", "#e8b48f", "#c98d64", "#9c6644", "#704a33", "#f2c9a0"];
  var HAIR = ["#3b2a20", "#7a4a24", "#d9a441", "#1f1a17", "#b5502e", "#5a3a2a", "#e8d08a"];
  var RUGS = [
    ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff", "#e3c6ff"],
    ["#f4d58d", "#bf8b67", "#f4d58d", "#bf8b67"],
    ["#b8e0d2", "#d6eadf", "#eac4d5", "#95b8d1"],
    ["#ff9ecd", "#ffd36e", "#8fe3cf", "#b39dff", "#ff9e7a"],
    ["#cfe8ff", "#e6dcff", "#cfe8ff", "#e6dcff"],
    ["#ff6f61", "#ffd23f", "#3bceac", "#5f7ad6", "#ee6ad1"],
    ["#ffcf56", "#57b8ff"],
    ["#e94f64", "#f7b538", "#4cb5ae", "#7a5cc4", "#f28b50", "#64c46b"]
  ];
  var FLOORS = {
    carpet: ["#e9dcc8", "#e2d2bb"], tile: ["#e8eef5", "#dbe5ef"], wood: ["#e4c49a", "#d8b486"], gym: ["#efcf9b", "#e5c38c"]
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function box(ctx, x, y, w, h, fill, r) {
    rr(ctx, x, y, w, h, r == null ? 6 : r); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  }

  // ---- the room itself (drawn once into a cache) ----
  function floor(ctx, def) {
    var f = FLOORS[def.floor], W = E.W, H = E.H, x, y;
    ctx.fillStyle = f[0]; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = f[1];
    if (def.floor === "tile") { for (y = 0; y < H; y += 45) for (x = ((y / 45) % 2) * 45; x < W; x += 90) ctx.fillRect(x, y, 45, 45); }
    else if (def.floor === "carpet") { for (y = 10; y < H; y += 22) for (x = 10 + (y % 44 ? 11 : 0); x < W; x += 22) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); } }
    else {
      for (y = 0; y < H; y += 30) { ctx.fillRect(0, y, W, 2); for (x = (y * 7) % 150; x < W; x += 150) ctx.fillRect(x, y, 2, 30); }
      if (def.floor === "gym") {
        ctx.strokeStyle = "rgba(220,70,70,0.45)"; ctx.lineWidth = 4;
        ctx.strokeRect(24, 24, W - 48, H - 48); ctx.beginPath(); ctx.moveTo(24, H * 0.62); ctx.lineTo(W - 24, H * 0.62); ctx.stroke();
        ctx.strokeStyle = "rgba(60,110,220,0.4)"; ctx.beginPath(); ctx.arc(W / 2, H * 0.62, 60, 0, TAU); ctx.stroke();
      }
    }
  }
  function creak(ctx, b) {
    ctx.fillStyle = "#a9794c"; ctx.fillRect(b[0], b[1], b[2], b[3]);
    ctx.strokeStyle = "#6e4a2a"; ctx.lineWidth = 2; ctx.strokeRect(b[0] + 1, b[1] + 1, b[2] - 2, b[3] - 2);
    // little crack squiggles
    ctx.strokeStyle = "rgba(60,35,20,0.75)"; ctx.lineWidth = 1.6;
    var along = b[2] > b[3], len = along ? b[2] : b[3];
    for (var k = 16; k < len - 8; k += 28) {
      ctx.beginPath();
      if (along) { ctx.moveTo(b[0] + k, b[1] + 6); ctx.lineTo(b[0] + k + 5, b[1] + b[3] / 2); ctx.lineTo(b[0] + k, b[1] + b[3] - 6); }
      else { ctx.moveTo(b[0] + 6, b[1] + k); ctx.lineTo(b[0] + b[2] / 2, b[1] + k + 5); ctx.lineTo(b[0] + b[2] - 6, b[1] + k); }
      ctx.stroke();
    }
  }
  function rug(ctx, def) {
    var ring = def.ring, cols = RUGS[def.rug % RUGS.length], n = cols.length * 2, R = ring.r + 34;
    for (var i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(ring.x, ring.y); ctx.arc(ring.x, ring.y, R, i * TAU / n, (i + 1) * TAU / n); ctx.closePath();
      ctx.fillStyle = cols[i % cols.length]; ctx.fill();
    }
    circle(ctx, ring.x, ring.y, R, null, "rgba(58,42,63,0.35)", 4);
    circle(ctx, ring.x, ring.y, 34, "#fff7e6", "rgba(58,42,63,0.3)", 3);
  }
  function wallBits(ctx, def) {
    var W = E.W;
    // a story-time banner of bunting along the top wall
    ctx.fillStyle = "#c9b79c"; ctx.fillRect(0, 0, W, 10);
    var flags = ["#ff8fa3", "#ffd166", "#7ec8e3", "#9ad97a", "#c59bff"];
    for (var x = 30, i = 0; x < W - 20; x += 34, i++) {
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x + 26, 10); ctx.lineTo(x + 13, 30); ctx.closePath();
      ctx.fillStyle = flags[i % flags.length]; ctx.fill();
    }
    // the door you came in by
    var dx = def.door[0];
    ctx.fillStyle = "#b07a4c"; ctx.fillRect(dx - 32, E.H - 8, 64, 8);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(dx - 28, E.H - 6, 56, 3);
  }
  function books(ctx, o, alongX) {
    var cols = ["#e85d75", "#4fa3e0", "#f2c14e", "#6cc577", "#a77de0", "#f28b50"];
    var len = alongX ? o.w : o.h, k = 0;
    for (var t = 6; t < len - 6; t += 9, k++) {
      ctx.fillStyle = cols[(k * 7) % cols.length];
      if (alongX) ctx.fillRect(o.x + t, o.y + 5, 7, o.h - 10); else ctx.fillRect(o.x + 5, o.y + t, o.w - 10, 7);
    }
  }
  function thing(ctx, o) {
    var k = o.kind, i;
    if (!o.box) {
      if (k === "plant") {
        circle(ctx, o.x, o.y, o.r * 0.7, "#c8734a", INK, 2.5);
        var leaf = ["#5fbf5a", "#4aa84a", "#78d26d"];
        for (i = 0; i < 7; i++) { var a = i * TAU / 7; circle(ctx, o.x + Math.cos(a) * o.r * 0.55, o.y + Math.sin(a) * o.r * 0.55, o.r * 0.5, leaf[i % 3], INK, 2); }
        circle(ctx, o.x, o.y, o.r * 0.45, "#78d26d");
      } else if (k === "drum") {
        circle(ctx, o.x, o.y, o.r, "#e2483d", INK, 2.5); circle(ctx, o.x, o.y, o.r * 0.8, "#f5ead2", INK, 1.5);
        ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x - 6, o.y - 4); ctx.lineTo(o.x + o.r * 0.9, o.y - o.r * 1.1); ctx.moveTo(o.x + 4, o.y + 2); ctx.lineTo(o.x + o.r * 1.1, o.y - o.r * 0.6); ctx.stroke();
      } else if (k === "balloons") {
        var bc = ["#ff5d8f", "#ffd23f", "#4cc9f0", "#90e06b", "#b388ff"];
        for (i = 0; i < 5; i++) { var b = i * TAU / 5 + 0.4; circle(ctx, o.x + Math.cos(b) * o.r * 0.55, o.y + Math.sin(b) * o.r * 0.55, o.r * 0.55, bc[i], INK, 2); }
        circle(ctx, o.x, o.y, 4, "#fff", INK, 1.5);
      } else if (k === "cone") {
        circle(ctx, o.x, o.y, o.r, "#ff8a2a", INK, 2.5); circle(ctx, o.x, o.y, o.r * 0.55, "#fff", INK, 1.5); circle(ctx, o.x, o.y, o.r * 0.25, "#ff8a2a");
      } else if (k === "coats") {
        var cc = ["#e85d75", "#4fa3e0", "#f2c14e", "#6cc577"];
        for (i = 0; i < 4; i++) { var c = i * TAU / 4 + 0.3; ctx.save(); ctx.translate(o.x + Math.cos(c) * o.r * 0.6, o.y + Math.sin(c) * o.r * 0.6); ctx.rotate(c); rr(ctx, -9, -7, 18, 14, 6); ctx.fillStyle = cc[i]; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
        circle(ctx, o.x, o.y, 6, "#8b5a2b", INK, 2);
      }
      return;
    }
    var x = o.x, y = o.y, w = o.w, h = o.h;
    if (k === "shelf" || k === "stack") { box(ctx, x, y, w, h, "#9a6a3e"); books(ctx, o, w > h); }
    else if (k === "cubby") {
      box(ctx, x, y, w, h, "#d9a46a", 4);
      var bins = ["#ff8fa3", "#7ec8e3", "#ffd166", "#9ad97a"];
      for (i = 0; i * 34 + 6 < h - 10; i++) { ctx.fillStyle = bins[i % 4]; rr(ctx, x + 6, y + 6 + i * 34, w - 12, 28, 4); ctx.fill(); }
    }
    else if (k === "table") {
      box(ctx, x, y, w, h, "#f0c987", 8);
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 14, y + 10, 30, 22); ctx.fillRect(x + 56, y + 14, 28, 20);
      ctx.fillStyle = "#e85d75"; ctx.fillRect(x + 20, y + 16, 14, 3); ctx.fillStyle = "#4fa3e0"; ctx.fillRect(x + 62, y + 20, 14, 3);
    }
    else if (k === "piano") {
      box(ctx, x, y, w, h, "#2c2433", 6);
      ctx.fillStyle = "#fffaf0"; ctx.fillRect(x + 6, y + h - 18, w - 12, 13);
      ctx.fillStyle = "#2c2433"; for (i = x + 12; i < x + w - 10; i += 9) if (((i - x) / 9) % 7 !== 2) ctx.fillRect(i, y + h - 18, 4, 8);
    }
    else if (k === "xylo") {
      box(ctx, x, y, w, h, "#8b5a2b", 5);
      var xc = ["#ff5d5d", "#ff9f40", "#ffd23f", "#6bd36b", "#4cc9f0", "#6c7cff", "#b56cff"];
      for (i = 0; i < 7; i++) { ctx.fillStyle = xc[i]; ctx.fillRect(x + 8 + i * (w - 16) / 7, y + 4 + i * 1.2, (w - 16) / 7 - 4, h - 8 - i * 2.4); }
    }
    else if (k === "cake") {
      box(ctx, x, y, w, h, "#ffffff", 10);
      ctx.fillStyle = "rgba(255,150,190,0.35)"; for (i = 0; i < w; i += 16) ctx.fillRect(x + i, y, 8, h);
      circle(ctx, x + w / 2, y + h / 2, 22, "#ff9ecd", INK, 2.5); circle(ctx, x + w / 2, y + h / 2, 14, "#fff0f6");
      for (i = 0; i < 5; i++) { var ca = i * TAU / 5; circle(ctx, x + w / 2 + Math.cos(ca) * 16, y + h / 2 + Math.sin(ca) * 16, 2.5, "#ffd23f"); }
      circle(ctx, x + 22, y + h / 2, 9, "#fff", INK, 1.5); circle(ctx, x + w - 22, y + h / 2, 9, "#fff", INK, 1.5);
    }
    else if (k === "presents") {
      var pc = [["#4cc9f0", "#ff5d8f"], ["#ffd23f", "#6c7cff"], ["#90e06b", "#ff9f40"]];
      var pw = w / 2 + 4, ph = h / 2 + 6;
      [[x, y + h - ph], [x + w - pw, y + h - ph - 4], [x + w / 4, y]].forEach(function (q, j) {
        box(ctx, q[0], q[1], pw, ph, pc[j][0], 3);
        ctx.fillStyle = pc[j][1]; ctx.fillRect(q[0] + pw / 2 - 3, q[1], 6, ph); ctx.fillRect(q[0], q[1] + ph / 2 - 3, pw, 6);
      });
    }
    else if (k === "crib") {
      box(ctx, x, y, w, h, "#fff3e0", 6);
      ctx.fillStyle = "#bde0fe"; rr(ctx, x + 8, y + 8, w - 16, h - 16, 6); ctx.fill();
      ctx.strokeStyle = "#b07a4c"; ctx.lineWidth = 2; for (i = x + 6; i < x + w - 3; i += 8) { ctx.beginPath(); ctx.moveTo(i, y + 2); ctx.lineTo(i, y + 6); ctx.moveTo(i, y + h - 6); ctx.lineTo(i, y + h - 2); ctx.stroke(); }
      circle(ctx, x + 22, y + h / 2, 7, "#c9a7ff", INK, 1.5);
    }
    else if (k === "easel") {
      box(ctx, x, y, w, h, "#c98f55", 3);
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 6, y + 3, w - 12, h - 6);
      ctx.fillStyle = "#ff6f61"; ctx.fillRect(x + 10, y + 5, 10, h - 10); ctx.fillStyle = "#3bceac"; ctx.fillRect(x + 24, y + 5, 12, h - 10); ctx.fillStyle = "#ffd23f"; ctx.fillRect(x + 40, y + 5, Math.max(4, w - 52), h - 10);
    }
    else if (k === "sink") {
      box(ctx, x, y, w, h, "#c7d3dd", 6);
      ctx.fillStyle = "#9fb3c4"; rr(ctx, x + 10, y + 10, w - 20, h / 2 - 16, 8); ctx.fill(); rr(ctx, x + 10, y + h / 2 + 6, w - 20, h / 2 - 16, 8); ctx.fill();
    }
    else if (k === "mats") {
      box(ctx, x, y, w, h, "#3f7ad8", 8); box(ctx, x + 5, y + 5, w - 10, h - 10, "#5b93ec", 6);
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 10, y + 10, w - 20, h - 20); ctx.setLineDash([]);
    }
    else if (k === "cart") {
      box(ctx, x, y, w, h, "#9aa4ad", 6);
      var bl = ["#ff5d5d", "#ffd23f", "#4cc9f0", "#90e06b", "#ff9f40", "#b388ff"];
      for (i = 0; i < 6; i++) circle(ctx, x + 12 + (i % 3) * ((w - 24) / 2), y + 12 + Math.floor(i / 3) * (h - 24), 9, bl[i], INK, 1.5);
    }
    else box(ctx, x, y, w, h, "#c8a27a");
  }

  function roomCache(def, scale) {
    var c = document.createElement("canvas");
    c.width = Math.ceil(E.W * scale); c.height = Math.ceil(E.H * scale);
    var ctx = c.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    floor(ctx, def);
    def.creaks.forEach(function (b) { creak(ctx, b); });
    rug(ctx, def);
    wallBits(ctx, def);
    def.obs.forEach(function (o) {
      var ob = o.length === 5 ? { kind: o[0], x: o[1], y: o[2], w: o[3], h: o[4], box: true } : { kind: o[0], x: o[1], y: o[2], r: o[3], box: false };
      ctx.save(); ctx.shadowColor = "rgba(58,42,63,0.25)"; ctx.shadowOffsetY = 5; ctx.shadowBlur = 0;
      if (ob.box) { rr(ctx, ob.x, ob.y, ob.w, ob.h, 6); } else { ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.r, 0, TAU); }
      ctx.fillStyle = "rgba(0,0,0,0.01)"; ctx.fill(); ctx.restore();
      thing(ctx, ob);
    });
    return c;
  }

  // ---- people ----
  function look(i) {
    return { shirt: SHIRTS[(i * 5 + 2) % SHIRTS.length], skin: SKINS[(i * 7 + 1) % SKINS.length], hair: HAIR[(i * 3 + 4) % HAIR.length], pants: ["#5a6dbf", "#6b4f8a", "#3f8f7a", "#8a5a3b"][i % 4], style: i % 3 };
  }
  function head(ctx, x, y, r, dir, lk, opts) {
    circle(ctx, x, y, r, lk.skin, INK, 2.2);
    // hair over the back of the head
    ctx.beginPath(); ctx.arc(x, y, r + 0.5, dir + Math.PI * 0.42, dir + Math.PI * 1.58); ctx.closePath();
    ctx.fillStyle = lk.hair; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    if (lk.style === 1) { circle(ctx, x - Math.cos(dir) * r, y - Math.sin(dir) * r, r * 0.42, lk.hair, INK, 2); }       // a bun
    if (lk.style === 2) { [-1, 1].forEach(function (sd) { var a = dir + Math.PI + sd * 1.1; circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.34, lk.hair, INK, 1.8); }); } // bunches
    var ex = Math.cos(dir), ey = Math.sin(dir), px = -ey, py = ex;
    if (opts && opts.closed) {
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      [-1, 1].forEach(function (sd) { var cx = x + ex * r * 0.55 + px * sd * r * 0.38, cy = y + ey * r * 0.55 + py * sd * r * 0.38; ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, dir - 1.6, dir + 1.6); ctx.stroke(); });
    } else {
      [-1, 1].forEach(function (sd) { circle(ctx, x + ex * r * 0.58 + px * sd * r * 0.36, y + ey * r * 0.58 + py * sd * r * 0.36, Math.max(1.6, r * 0.14), INK); });
    }
    if (opts && opts.glasses) { ctx.strokeStyle = INK; ctx.lineWidth = 1.4; [-1, 1].forEach(function (sd) { circle(ctx, x + ex * r * 0.58 + px * sd * r * 0.36, y + ey * r * 0.58 + py * sd * r * 0.36, r * 0.24, null, INK, 1.4); }); }
  }
  function seated(ctx, w, t, lk) {
    var dir = w.dir, home = w.home, r = w.r, x = w.x, y = w.y, wig = 0;
    if (w.state === "wiggle") wig = Math.sin(t * 40) * 2.2;
    x += Math.cos(home + Math.PI / 2) * wig; y += Math.sin(home + Math.PI / 2) * wig;
    var hx = Math.cos(home), hy = Math.sin(home);
    // crossed legs, forward of the body
    ctx.save(); ctx.translate(x + hx * r * 0.75, y + hy * r * 0.75); ctx.rotate(home);
    rr(ctx, -r * 0.35, -r * 0.95, r * 0.9, r * 1.9, r * 0.45); ctx.fillStyle = lk.pants; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();
    // shoulders turn a bit with the head
    var body = home + E.angDiff(home, dir) * 0.35;
    ctx.save(); ctx.translate(x, y); ctx.rotate(body);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r, 0, 0, TAU); ctx.fillStyle = lk.shirt; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
    head(ctx, x, y, r * 0.66, dir, lk, { glasses: w.kind === "teacher" });
  }

  function person(ctx, w, t) {
    var lk = look(w.i + (w.kind === "teacher" ? 11 : 0));
    if (w.kind === "teacher") { lk.shirt = "#8c6ad8"; lk.hair = "#7a4a24"; lk.style = 1; lk.pants = "#5a4a7a"; }
    if (w.kind === "parent") { lk.shirt = ["#90a4ae", "#a1887f", "#81c784", "#ba68c8"][w.i % 4]; }
    if (w.kind === "helper") {
      lk.shirt = "#ff9f40"; lk.style = 0;
      circle(ctx, w.x, w.y, w.r, lk.shirt, INK, 2.4);
      head(ctx, w.x, w.y, w.r * 0.66, w.dir, lk);
      // a camera / a palette in front
      var cx = w.x + Math.cos(w.dir) * w.r * 1.05, cy = w.y + Math.sin(w.dir) * w.r * 1.05;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(w.dir); rr(ctx, -4, -7, 8, 14, 2); ctx.fillStyle = "#2c2433"; ctx.fill(); ctx.restore();
      return;
    }
    if (w.kind === "teacher") { box(ctx, w.x - 20 - Math.cos(w.home) * 10, w.y - 20 - Math.sin(w.home) * 10, 40, 40, "#c98f55", 8); }
    seated(ctx, w, t, lk);
    if (w.kind === "teacher") {
      var reading = w.state === "read" || (w.state === "warn" && w.timer > 0.6);
      var bd = w.home, bx = w.x + Math.cos(bd) * (reading ? 22 : 15), by = w.y + Math.sin(bd) * (reading ? 22 : 15);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(bd + Math.PI / 2);
      var bw = reading ? 30 : 20, bh = reading ? 20 : 12;
      ctx.fillStyle = "#e85d75"; rr(ctx, -bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4, 3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#fffaf0"; ctx.fillRect(-bw / 2, -bh / 2, bw / 2 - 1, bh); ctx.fillRect(1, -bh / 2, bw / 2 - 1, bh);
      ctx.restore();
    }
    if (w.kind === "parent") {
      // a phone, glowing
      var px = w.x + Math.cos(w.home) * w.r * 0.9, py = w.y + Math.sin(w.home) * w.r * 0.9;
      ctx.save(); ctx.translate(px, py); ctx.rotate(w.home); rr(ctx, -3, -5, 6, 10, 2); ctx.fillStyle = "#bfe9ff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
  }

  function player(ctx, p, t, frozen, seen) {
    var bob = p.moving ? Math.abs(Math.sin(t * (p.quiet ? 9 : 13))) * (p.quiet ? 1.5 : 2.5) : 0;
    var d = p.face, x = p.x, y = p.y - bob, r = E.PR;
    circle(ctx, p.x, p.y + 4, r * 0.95, "rgba(58,42,63,0.18)");
    // feet on tiptoe
    var step = Math.sin(t * (p.quiet ? 9 : 13)) * (p.moving ? 5 : 0);
    [-1, 1].forEach(function (sd) {
      var fx = x + Math.cos(d) * (r * 0.55 + sd * step * 0.6) + Math.cos(d + Math.PI / 2) * sd * 6, fy = y + Math.sin(d) * (r * 0.55 + sd * step * 0.6) + Math.sin(d + Math.PI / 2) * sd * 6;
      circle(ctx, fx, fy, 4, "#4a3a5a");
    });
    ctx.save(); ctx.translate(x, y); ctx.rotate(d);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.78, r * 1.08, 0, 0, TAU); ctx.fillStyle = "#2bb3a3"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.restore();
    head(ctx, x, y, r * 0.6, d, { skin: "#f2c9a0", hair: "#5a3a2a", style: 0 }, { closed: false });
    // the kid, on your hip, holding on
    var kx = x + Math.cos(d + 1.9) * r * 0.95, ky = y + Math.sin(d + 1.9) * r * 0.95;
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(d);
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 8, 0, 0, TAU); ctx.fillStyle = "#ffd166"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    head(ctx, kx + Math.cos(d) * 2, ky + Math.sin(d) * 2, 6.2, d, { skin: "#e8b48f", hair: "#d9a441", style: 2 }, { closed: frozen && !seen });
    if (frozen && seen) { // a nervous sweat drop
      ctx.beginPath(); ctx.moveTo(x + 13, y - 20); ctx.quadraticCurveTo(x + 18, y - 12, x + 13, y - 10); ctx.quadraticCurveTo(x + 8, y - 12, x + 13, y - 20);
      ctx.fillStyle = "#7ec8ff"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    }
  }

  function toy(ctx, ty) {
    ctx.save(); ctx.translate(ty.x, ty.y); ctx.rotate(ty.spin * 6);
    if (ty.kind === 0) { // rubber duck
      circle(ctx, 0, 0, 7.5, "#ffd23f", INK, 1.8); circle(ctx, 4, -4, 4.5, "#ffd23f", INK, 1.6);
      ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.moveTo(7.5, -5); ctx.lineTo(12, -3.5); ctx.lineTo(7.5, -2); ctx.fill();
    } else if (ty.kind === 1) { // squeaky ball
      circle(ctx, 0, 0, 7.5, "#ff5d8f", INK, 1.8); ctx.fillStyle = "#fff"; ctx.fillRect(-7, -1.5, 14, 3);
    } else { // squeaky bone... a squeaky star
      ctx.beginPath(); for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? 4 : 9; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath();
      ctx.fillStyle = "#4cc9f0"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.restore();
  }

  function toddler(ctx, td, t) {
    var awake = td.awake > 0, wob = awake ? Math.sin(t * 30) * 1.5 : td.stir * Math.sin(t * 18) * 1.2;
    box(ctx, td.x - 34, td.y - 20, 68, 40, "#bde0fe", 12);
    ctx.save(); ctx.translate(td.x + wob, td.y);
    rr(ctx, -16, -14, 38, 28, 10); ctx.fillStyle = "#ffc8dd"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)"; for (var i = -10; i < 20; i += 9) { ctx.beginPath(); ctx.arc(i, 0, 2.5, 0, TAU); ctx.fill(); }
    ctx.restore();
    head(ctx, td.x - 20 + wob, td.y, 9, 0, { skin: "#f6d2b4", hair: "#e8d08a", style: 0 }, { closed: !awake });
    ctx.save(); ctx.font = "900 15px ui-rounded, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#fff";
    if (awake) {
      ctx.fillStyle = "#e5383b"; ctx.strokeText("WAAAH!", td.x - 14, td.y - 26); ctx.fillText("WAAAH!", td.x - 14, td.y - 26);
    } else {
      var sp = 0.6 + td.stir * 2;
      for (var z = 0; z < 3; z++) {
        var ph = ((t * sp + z / 3) % 1);
        ctx.globalAlpha = 1 - ph; ctx.fillStyle = td.stir > 0.5 ? "#e5383b" : "#6c7cff";
        var zx = td.x - 18 + ph * 16 + z * 3, zy = td.y - 16 - ph * 26;
        ctx.strokeText("z", zx, zy); ctx.fillText("z", zx, zy);
      }
    }
    ctx.restore();
  }

  // a view cone, clipped by the furniture
  function coneShape(ctx, s, w, c, seeing, strength) {
    var n = 28, a0 = c.dir - c.half, pts = [];
    for (var i = 0; i <= n; i++) {
      var a = a0 + (2 * c.half) * i / n, dx = Math.cos(a), dy = Math.sin(a);
      var d = E.rayHit(s.obs, w.x, w.y, dx, dy, c.range);
      pts.push([w.x + dx * d, w.y + dy * d]);
    }
    var g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, c.range);
    var col = seeing ? "255,90,70" : "255,214,90";
    g.addColorStop(0, "rgba(" + col + "," + (0.42 * strength) + ")"); g.addColorStop(1, "rgba(" + col + "," + (0.06 * strength) + ")");
    ctx.beginPath(); ctx.moveTo(w.x, w.y); pts.forEach(function (q) { ctx.lineTo(q[0], q[1]); }); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    if (strength > 0.5) { ctx.strokeStyle = "rgba(" + col + ",0.55)"; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function sweepHint(ctx, w, t) {
    var sp = w.spec, a = sp.sweep * E.DEG + 24 * E.DEG;
    ctx.save(); ctx.setLineDash([6, 7]); ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = "rgba(229,56,59," + (0.35 + 0.25 * Math.sin(t * 12)) + ")"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.arc(w.x, w.y, Math.min(sp.range, 260), w.home - a, w.home + a); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }

  function bubble(ctx, x, y, text, fill, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.moveTo(-4, 9); ctx.lineTo(0, 17); ctx.lineTo(4, 9);
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = fill === "#fff" ? INK : "#fff"; ctx.font = "900 16px ui-rounded, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }
  function meterRing(ctx, w) {
    if (w.meter <= 0.02 || w.noticed) return;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * w.meter);
    ctx.strokeStyle = w.meter > 0.66 ? "#e5383b" : w.meter > 0.33 ? "#ff9f1c" : "#ffd23f"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
  }

  function seat(ctx, st, t) {
    var g = 0.5 + 0.5 * Math.sin(t * 4);
    circle(ctx, st.x, st.y, 22 + g * 4, "rgba(255,240,120," + (0.35 + 0.3 * g) + ")");
    ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.a);
    box(ctx, -14, -14, 28, 28, "#ffe066", 9);
    ctx.beginPath(); for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 3.5 : 8; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.restore();
  }

  function noiseRing(ctx, nz) {
    var k = nz.t / 0.9, r = 14 + k * (nz.kind === "cry" ? 140 : nz.kind === "creak-soft" ? 40 : 80);
    ctx.save(); ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = nz.kind === "squeak" ? "#ff5d8f" : nz.kind === "cry" ? "#e5383b" : "#8b5a2b"; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
    circle(ctx, nz.x, nz.y, r, null, ctx.strokeStyle, 3);
    ctx.setLineDash([]);
    var word = { creak: "CREAK!", "creak-soft": "creak", squeak: "SQUEAK!", cry: "" }[nz.kind];
    if (word) {
      ctx.font = "900 " + (nz.kind === "creak-soft" ? 11 : 15) + "px ui-rounded, system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText(word, nz.x, nz.y - 22 - k * 16);
      ctx.fillStyle = nz.kind === "squeak" ? "#d6336c" : "#6e4a2a"; ctx.fillText(word, nz.x, nz.y - 22 - k * 16);
    }
    ctx.restore();
  }

  root.OWLArt = {
    INK: INK, roomCache: roomCache, person: person, player: player, toy: toy, toddler: toddler,
    coneShape: coneShape, sweepHint: sweepHint, bubble: bubble, meterRing: meterRing, seat: seat,
    noiseRing: noiseRing, circle: circle, rr: rr, head: head
  };
})(window);
