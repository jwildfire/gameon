/* GameOn trippy backgrounds (#134).
 *
 * Twenty animated backgrounds, one runner that cycles the best ten behind a page, and a
 * preview helper for the gallery (artifacts/2026-10-24-backgrounds/). No dependencies.
 *
 *   <script src="assets/backgrounds.js" data-mount data-pause="#player:not([hidden])" defer></script>
 *
 * Each background is { id, name, kind, ... }:
 *   kind "gl": a fragment shader (frag) drawn by one shared, offscreen WebGL canvas.
 *   kind "2d": make() returns { init(ctx, w, h), frame(t, dt), dispose() } for a canvas 2D buffer.
 * Everything is copied onto one plain 2D canvas, so crossfades are a globalAlpha draw and
 * the page can read its pixels. Without WebGL the runner cycles the 2D backgrounds only.
 *
 * Comfort rules every background follows: colours change smoothly, no pixel swings between
 * bright and dark faster than about twice a second, and nothing flashes.
 *
 * Runner: crossfades to the next pick every 30-45 s (?bgInterval=<seconds> shortens it, and
 * ?bg=<id> starts on one background), pauses when the tab is hidden or `data-pause` matches,
 * shows a still frame under prefers-reduced-motion, renders at reduced resolution (GL at half
 * of CSS pixels) and caps phones at 30 fps. It only runs in Weird mode (assets/mode.js, loaded
 * first): in Normal mode the canvas stays hidden and nothing is drawn.
 */
(function (win, doc) {
  "use strict";
  if (win.GameOnBackgrounds) return;

  var TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  // Fade by `a` per 60 fps frame, whatever the real frame rate.
  function perFrame(a, dt) { return 1 - Math.pow(1 - a, dt * 60); }

  // ---------------------------------------------------------------------------------------
  // Shared WebGL: one offscreen canvas renders every shader background, then each result is
  // copied to its 2D target. One context for the whole page, however many tiles.
  // ---------------------------------------------------------------------------------------
  var GL = null; // null: not tried yet; false: unavailable
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var HEAD = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 R;uniform float T;",
    "#define TAU 6.2831853",
    "vec2 U(){return (gl_FragCoord.xy-.5*R)/min(R.x,R.y);}",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    "vec3 hsv(float h,float s,float v){vec3 k=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);k=k*k*(3.-2.*k);return v*mix(vec3(1.),k,s);}",
    "vec3 rainbow(float t){return .5+.5*cos(TAU*(t+vec3(0.,.33,.67)));}",
    "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}",
    "float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}",
    ""
  ].join("\n");

  function sharedGL() {
    if (GL !== null) return GL || null;
    GL = false;
    try {
      var c = doc.createElement("canvas");
      c.width = 4; c.height = 4;
      var o = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: false };
      var gl = c.getContext("webgl", o) || c.getContext("experimental-webgl", o);
      if (!gl) return null;
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      GL = { canvas: c, gl: gl, programs: {}, lost: false };
      c.addEventListener("webglcontextlost", function (e) { e.preventDefault(); GL.lost = true; }, false);
    } catch (e) { GL = false; }
    return GL || null;
  }

  function program(G, def) {
    if (def.id in G.programs) return G.programs[def.id];
    var gl = G.gl, prog = null;
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, HEAD + def.frag);
    if (vs && fs) {
      var p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, "p");
      gl.linkProgram(p);
      if (gl.getProgramParameter(p, gl.LINK_STATUS)) {
        prog = { p: p, R: gl.getUniformLocation(p, "R"), T: gl.getUniformLocation(p, "T") };
      }
    }
    G.programs[def.id] = prog;
    return prog;
  }

  // ---------------------------------------------------------------------------------------
  // Canvas 2D backgrounds
  // ---------------------------------------------------------------------------------------
  var KATAKANA = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=*+<>".split("");

  // Code rain. The screen fades a little every frame and each column's head writes one new
  // glyph per row it passes, so the trails are just old glyphs fading out.
  function rain(o) {
    return function () {
      var ctx, w, h, fs, cols, drops, acc = 0;
      function drop(first) {
        return { y: first ? rnd(-h / fs, h / fs) : rnd(-10, -1), last: null, v: rnd(o.speed[0], o.speed[1]), g: "" };
      }
      return {
        init: function (c, W, H) {
          ctx = c; w = W; h = H;
          fs = Math.max(o.min || 11, Math.round(Math.min(w, h) / o.rows));
          cols = Math.ceil(w / fs);
          drops = [];
          for (var i = 0; i < cols; i++) drops.push(drop(true));
          ctx.fillStyle = o.bg;
          ctx.fillRect(0, 0, w, h);
        },
        frame: function (t, dt) {
          // Fade in steps of at least 6%, so 8-bit rounding can't leave ghosts behind.
          acc += perFrame(o.fade, dt);
          if (acc >= 0.06) { ctx.globalAlpha = acc; ctx.fillStyle = o.bg; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; acc = 0; }
          ctx.font = (o.weight || "700") + " " + fs + "px " + (o.font || "ui-monospace, Menlo, Consolas, monospace");
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          for (var i = 0; i < cols; i++) {
            var d = drops[i], x = i * fs + fs / 2;
            d.y += d.v * dt;
            var row = Math.floor(d.y);
            if (d.last === null) d.last = row - 1;
            while (d.last < row) {
              if (d.g) { ctx.fillStyle = o.body(i, cols, t); ctx.fillText(d.g, x, d.last * fs); }
              d.last++;
              d.g = pick(o.glyphs);
              ctx.fillStyle = o.head(i, cols, t);
              ctx.fillText(d.g, x, d.last * fs);
            }
            if (d.last * fs > h + rnd(0, h * 0.5)) drops[i] = drop(false);
          }
        },
        dispose: function () {}
      };
    };
  }

  function warp() {
    var ctx, w, h, stars, acc = 0;
    function star(z) { return { x: rnd(-1.6, 1.6), y: rnd(-1.6, 1.6), z: z, pz: z, hue: rnd(0, 360) }; }
    return {
      init: function (c, W, H) {
        ctx = c; w = W; h = H;
        stars = [];
        var n = Math.round(Math.min(500, Math.max(160, w * h / 900)));
        for (var i = 0; i < n; i++) stars.push(star(rnd(0.05, 1)));
        ctx.fillStyle = "#07031a";
        ctx.fillRect(0, 0, w, h);
      },
      frame: function (t, dt) {
        acc += perFrame(0.22, dt);
        if (acc >= 0.06) { ctx.globalAlpha = acc; ctx.fillStyle = "#07031a"; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; acc = 0; }
        var f = Math.min(w, h) * 0.55, cx = w / 2 + Math.sin(t * 0.13) * w * 0.08, cy = h / 2 + Math.cos(t * 0.11) * h * 0.08;
        var speed = 0.3 + 0.08 * Math.sin(t * 0.21);
        ctx.lineCap = "round";
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.pz = s.z;
          s.z -= speed * dt;
          if (s.z <= 0.03) { stars[i] = star(1); continue; }
          var x = cx + s.x / s.z * f, y = cy + s.y / s.z * f;
          if (x < -20 || x > w + 20 || y < -20 || y > h + 20) { stars[i] = star(1); continue; }
          var px = cx + s.x / s.pz * f, py = cy + s.y / s.pz * f, k = 1 - s.z;
          ctx.strokeStyle = "hsl(" + ((s.hue + t * 25) % 360).toFixed(0) + ",100%," + (45 + 30 * k).toFixed(0) + "%)";
          ctx.lineWidth = 0.6 + k * k * 3.2;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        }
      },
      dispose: function () {}
    };
  }

  function bubbles() {
    var ctx, w, h, list, bg;
    return {
      init: function (c, W, H) {
        ctx = c; w = W; h = H;
        bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, "#1b0938"); bg.addColorStop(1, "#3a0a4a");
        list = [];
        var n = Math.round(Math.min(46, Math.max(22, w * h / 9000)));
        for (var i = 0; i < n; i++) {
          var r = rnd(0.04, 0.16) * Math.min(w, h);
          list.push({ x: rnd(0, w), y: rnd(-r, h + r), r: r, v: rnd(0.04, 0.12) * h, ph: rnd(0, TAU), hue: rnd(0, 360) });
        }
      },
      frame: function (t, dt) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < list.length; i++) {
          var b = list[i];
          b.y -= b.v * dt;
          b.x += Math.sin(t * 0.5 + b.ph) * b.r * 0.25 * dt;
          if (b.y < -b.r) { b.y = h + b.r; b.x = rnd(0, w); }
          var hue = (b.hue + t * 18) % 360;
          var g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
          g.addColorStop(0, "hsla(" + hue.toFixed(0) + ",100%,75%,0.55)");
          g.addColorStop(0.7, "hsla(" + ((hue + 40) % 360).toFixed(0) + ",100%,55%,0.28)");
          g.addColorStop(1, "hsla(" + ((hue + 60) % 360).toFixed(0) + ",100%,50%,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      },
      dispose: function () {}
    };
  }

  function spirograph() {
    var ctx, w, h, pens, acc = 0;
    return {
      init: function (c, W, H) {
        ctx = c; w = W; h = H;
        var s = Math.min(w, h) * 0.4;
        pens = [
          { R: 1, r: 0.37, d: 0.62, th: 0, v: 3.2, hue: 0, cx: 0.5, cy: 0.5, s: s },
          { R: 1, r: 0.23, d: 0.8, th: 1, v: 2.6, hue: 120, cx: 0.5, cy: 0.5, s: s * 0.82 },
          { R: 1, r: 0.61, d: 0.45, th: 2, v: 2.2, hue: 240, cx: 0.5, cy: 0.5, s: s * 1.1 }
        ];
        if (w > h * 1.3) { pens[0].cx = 0.28; pens[2].cx = 0.72; pens[1].s = s * 0.7; }
        pens.forEach(function (p) { p.last = null; });
        ctx.fillStyle = "#0c0420"; ctx.fillRect(0, 0, w, h);
      },
      frame: function (t, dt) {
        acc += perFrame(0.012, dt);
        if (acc >= 0.06) { ctx.globalAlpha = acc; ctx.fillStyle = "#0c0420"; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; acc = 0; }
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = Math.max(1.2, Math.min(w, h) / 260);
        ctx.lineCap = "round";
        for (var i = 0; i < pens.length; i++) {
          var p = pens[i], steps = Math.max(1, Math.ceil(p.v * dt / 0.03));
          var d = p.d * (0.8 + 0.3 * Math.sin(t * 0.05 + i * 2)), a = t * 0.04 * (i % 2 ? -1 : 1);
          ctx.strokeStyle = "hsl(" + ((p.hue + t * 20) % 360).toFixed(0) + ",100%,60%)";
          ctx.beginPath();
          for (var k = 0; k < steps; k++) {
            p.th += p.v * dt / steps;
            var q = p.R - p.r;
            var x = q * Math.cos(p.th) + d * Math.cos(q / p.r * p.th);
            var y = q * Math.sin(p.th) - d * Math.sin(q / p.r * p.th);
            var X = w * p.cx + (x * Math.cos(a) - y * Math.sin(a)) * p.s;
            var Y = h * p.cy + (x * Math.sin(a) + y * Math.cos(a)) * p.s;
            if (p.last) { ctx.moveTo(p.last[0], p.last[1]); ctx.lineTo(X, Y); }
            p.last = [X, Y];
          }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      },
      dispose: function () {}
    };
  }

  function ribbons() {
    var ctx, w, h, bg;
    return {
      init: function (c, W, H) {
        ctx = c; w = W; h = H;
        bg = ctx.createLinearGradient(0, 0, w, h);
        bg.addColorStop(0, "#14062e"); bg.addColorStop(1, "#2a0838");
      },
      frame: function (t) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        var n = 7, step = Math.max(6, w / 90);
        for (var i = 0; i < n; i++) {
          var base = h * (0.1 + i * 0.13), A = h * 0.09, B = h * 0.05, th = h * 0.07;
          var top = [], bot = [];
          for (var x = -step; x <= w + step; x += step) {
            var y = base + A * Math.sin(x / w * 4.2 + t * 0.32 * (1 + i * 0.08) + i) + B * Math.sin(x / w * 9.5 - t * 0.45 + i * 2.1);
            var tk = th * (0.6 + 0.5 * Math.sin(x / w * 5 + t * 0.38 + i * 1.3));
            top.push(x, y - tk / 2); bot.push(x, y + tk / 2);
          }
          var g = ctx.createLinearGradient(0, 0, w, 0), hue = i * 48 + t * 14;
          for (var s = 0; s <= 4; s++) g.addColorStop(s / 4, "hsla(" + ((hue + s * 45) % 360).toFixed(0) + ",100%,58%,0.5)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(top[0], top[1]);
          for (var j = 2; j < top.length; j += 2) ctx.lineTo(top[j], top[j + 1]);
          for (j = bot.length - 2; j >= 0; j -= 2) ctx.lineTo(bot[j], bot[j + 1]);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      },
      dispose: function () {}
    };
  }

  // ---------------------------------------------------------------------------------------
  // The twenty
  // ---------------------------------------------------------------------------------------
  var ARCADE = ["#ff6b4a", "#ffd23f", "#3fd8ff", "#ff5fd2", "#7dff6b", "#b48cff"];

  var LIST = [
    { id: "matrix-rain", name: "Matrix Rain", kind: "2d", res: 1, still: 6,
      make: rain({ rows: 38, min: 12, speed: [7, 17], fade: 0.05, bg: "#020a04", glyphs: KATAKANA,
        head: function () { return "#d9ffe2"; },
        body: function () { return "#1fe05a"; } }) },
    { id: "rainbow-rain", name: "Rainbow Rain", kind: "2d", res: 1, still: 6,
      make: rain({ rows: 34, min: 12, speed: [7, 16], fade: 0.04, bg: "#06020f", glyphs: KATAKANA,
        head: function () { return "#ffffff"; },
        body: function (i, n, t) { return "hsl(" + ((i / n * 360 + t * 22) % 360).toFixed(0) + ",100%,60%)"; } }) },
    { id: "arcade-rain", name: "Arcade Rain", kind: "2d", res: 1, still: 6,
      make: rain({ rows: 20, min: 16, speed: [3, 8], fade: 0.06, bg: "#1d1a2f", weight: "400",
        font: "\"Segoe UI Symbol\", \"Apple Symbols\", \"DejaVu Sans\", sans-serif",
        glyphs: "★♥♦♣♠●▲■◆✿☺♪✦⬟".split(""),
        head: function () { return "#fffdf6"; },
        body: function (i) { return ARCADE[i % ARCADE.length]; } }) },

    { id: "rainbow-plasma", name: "Rainbow Plasma", kind: "gl", frag: [
      "void main(){vec2 p=U()*3.2;float t=T*.32;",
      "float v=sin(p.x+t)+sin((p.y+t)*.9)+sin((p.x+p.y+t)*.6)",
      " +sin(length(p+vec2(sin(t*.7),cos(t*.5))*1.8)*1.5+t)+sin(length(p-vec2(cos(t*.4),sin(t*.6))*2.)*1.1-t*.8);",
      "vec3 c=rainbow(v*.16+t*.06);",
      "gl_FragColor=vec4(c*.92+.04,1.);}"].join("\n") },

    { id: "kaleidoscope", name: "Kaleidoscope", kind: "gl", frag: [
      "void main(){vec2 p=U();float t=T*.18;",
      "float r=length(p),a=atan(p.y,p.x)+t*.5;",
      "float n=8.,s=TAU/n;a=mod(a,s);a=abs(a-s*.5);",
      "vec2 q=vec2(cos(a),sin(a))*r*2.6;",
      "float f=0.;",
      "for(int i=0;i<5;i++){q=abs(q)-vec2(.55,.35);q*=rot(t*.7+float(i)*.9);f+=sin(q.x*3.1+t)*cos(q.y*2.7-t*.6);}",
      "vec3 c=rainbow(f*.09+r*.55-t*.35);",
      "c*=.58+.42*smoothstep(-1.4,1.4,f);",
      "c+=.1*smoothstep(.3,0.,r)*rainbow(t);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "rainbow-tunnel", name: "Rainbow Tunnel", kind: "gl", frag: [
      "void main(){vec2 p=U();p+=vec2(sin(T*.21),cos(T*.17))*.06;float r=length(p),a=atan(p.y,p.x)/TAU;",
      "float z=.32/max(r,.001)+T*.55;",
      "float tw=a+T*.03+.06/max(r,.05);",
      "float ring=.5+.5*sin(z*TAU);",
      "float seg=.5+.5*sin((tw*12.+z*.5)*TAU);",
      "vec3 c=rainbow(z*.12+a+T*.02);",
      "c*=.5+.5*mix(ring,seg,.45);",
      "float glow=smoothstep(.22,.0,r);",
      "c=mix(c*smoothstep(0.,.5,r)+.06,vec3(1.,.95,.85),glow*.85);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "hue-swirl", name: "Hue Swirl", kind: "gl", frag: [
      "void main(){vec2 p=U();float r=length(p),a=atan(p.y,p.x);",
      "float sw=a+r*3.4-T*.35+sin(r*4.-T*.5)*.7+fbm(p*2.+T*.05)*1.5;",
      "vec3 c=hsv(fract(sw/TAU*2.+T*.03),.78,.95);",
      "c*=.82+.18*sin(r*9.-T*.9);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "lava-lamp", name: "Lava Lamp", kind: "gl", frag: [
      "void main(){vec2 p=U();float asp=R.x/R.y;float f=0.;vec3 acc=vec3(0.);",
      "for(int i=0;i<8;i++){float fi=float(i);",
      " vec2 c=vec2(sin(T*(.11+fi*.019)+fi*1.7)*.42*max(asp,1.),sin(T*(.09+fi*.015)+fi*2.3)*.42/min(asp,1.));",
      " float rr=.15+.05*sin(fi*3.1+T*.2);float w=rr*rr/dot(p-c,p-c);",
      " f+=w;acc+=w*hsv(fract(fi/8.+T*.015),.85,1.);}",
      "vec3 blob=acc/f;",
      "float m=smoothstep(.95,1.15,f);",
      "vec3 bg=mix(vec3(.1,.02,.18),vec3(.26,.04,.3),gl_FragCoord.y/R.y)+blob*.3*smoothstep(.25,1.,f);",
      "vec3 c=mix(bg,blob*(.75+.25*smoothstep(1.1,3.,f)),m);",
      "c+=m*.25*smoothstep(2.5,6.,f);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "moire-ripples", name: "Moiré Ripples", kind: "gl", frag: [
      "void main(){vec2 p=U();",
      "vec2 c1=vec2(sin(T*.11),cos(T*.13))*.4,c2=vec2(cos(T*.09+1.),sin(T*.12+2.))*.4,c3=vec2(sin(T*.07+4.),cos(T*.1+3.))*.3;",
      "float v=sin(length(p-c1)*36.)+sin(length(p-c2)*36.)+sin(length(p-c3)*30.);",
      "vec3 c=rainbow(v*.1+T*.025+length(p)*.25);",
      "c*=.5+.5*(v/6.+.5);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "warp-speed", name: "Warp Speed", kind: "2d", res: 0.75, still: 3, make: warp },

    { id: "hypno-spiral", name: "Hypno Spiral", kind: "gl", frag: [
      "void main(){vec2 p=U();float r=length(p),a=atan(p.y,p.x);float lr=log(max(r,.002));",
      "float s=sin(a*5.+lr*7.-T*1.1);",
      "vec3 c=rainbow(lr*.35-T*.07+a/TAU);",
      "c*=.55+.45*smoothstep(-.35,.35,s);",
      "c=mix(c,vec3(1.,.97,.9),smoothstep(.1,0.,r)*.9);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "liquid-marble", name: "Liquid Marble", kind: "gl", frag: [
      "void main(){vec2 p=U()*2.2;float t=T*.07;",
      "vec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t));",
      "vec2 r=vec2(fbm(p+3.5*q+vec2(1.7,9.2)+t*1.4),fbm(p+3.5*q+vec2(8.3,2.8)-t*1.2));",
      "float f=fbm(p+3.5*r);",
      "vec3 c=rainbow(f*1.6+length(q)*.6+t*.8);",
      "c*=.45+.75*f;",
      "c+=.15*smoothstep(.55,.9,f);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "rainbow-ribbons", name: "Rainbow Ribbons", kind: "2d", res: 0.6, still: 8, make: ribbons },

    { id: "tie-dye", name: "Tie-Dye", kind: "gl", frag: [
      "void main(){vec2 p=U();p*=rot(T*.03);float r=length(p),a=atan(p.y,p.x);",
      "float k=a*3.+sin(r*6.-T*.45)*1.3+r*4.5+fbm(p*2.5+T*.04)*2.2;",
      "vec3 c=hsv(fract(k/TAU+T*.02),.85,.95);",
      "c=mix(c,vec3(1.,.98,.94),smoothstep(.78,.97,.5+.5*sin(k*3.))*.55);",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "julia-dream", name: "Julia Dream", kind: "gl", frag: [
      "void main(){vec2 z=U()*2.4*rot(T*.02);",
      "vec2 c=vec2(-.79+.05*sin(T*.03),.16+.03*cos(T*.025));",
      "float n=0.;for(int i=0;i<90;i++){z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c;if(dot(z,z)>64.)break;n+=1.;}",
      "vec3 col;",
      "if(n>89.){col=vec3(.07,.02,.14);}else{float sm=n-log2(log2(dot(z,z)))+4.;",
      " col=rainbow(sm*.035+T*.03)*(.35+.65*sqrt(clamp(sm/40.,0.,1.)));}",
      "gl_FragColor=vec4(col,1.);}"].join("\n") },

    { id: "hex-disco", name: "Hex Disco", kind: "gl", frag: [
      "void main(){vec2 p=U()*7.;vec2 s=vec2(1.,1.7320508);",
      "vec2 a=mod(p,s)-s*.5,b=mod(p-s*.5,s)-s*.5;vec2 g=dot(a,a)<dot(b,b)?a:b;vec2 id=p-g;",
      "vec2 ag=abs(g);float e=max(dot(ag,normalize(s)),ag.x);",
      "float wave=.5+.5*sin(length(id)*.55-T*1.1);",
      "vec3 c=hsv(fract(h21(id)*.25+length(id)*.04-T*.05),.75,.5+.45*wave);",
      "c=mix(vec3(.11,.1,.18),c,smoothstep(.5,.43,e));",
      "gl_FragColor=vec4(c,1.);}"].join("\n") },

    { id: "retro-sun", name: "Retro Sun", kind: "gl", frag: [
      "void main(){vec2 p=U();float hz=-.06;vec3 col;",
      "if(p.y>hz){",
      " col=mix(vec3(1.,.38,.55),vec3(.16,.05,.36),smoothstep(hz,.6,p.y));",
      " vec2 sc=vec2(0.,.17);float d=length(p-sc);",
      " float cut=p.y>sc.y?1.:smoothstep(-.25,.25,sin((p.y-sc.y)*55.+T*1.2)+(p.y-sc.y)*9.);",
      " vec3 sun=mix(vec3(1.,.3,.62),vec3(1.,.88,.25),smoothstep(-.28,.3,p.y-sc.y));",
      " col=mix(col,sun,smoothstep(.31,.3,d)*cut);",
      " col+=vec3(1.,.4,.6)*.35*exp(-max(d-.3,0.)*6.);",
      "}else{",
      " float z=.22/(hz-p.y+.001);",
      " vec2 g=vec2(p.x*z,z+T*.7);",
      " vec2 f=abs(fract(g)-.5);",
      " float lw=.05+.02*z;",
      " float l=max(smoothstep(.5-lw,.5,f.x),smoothstep(.5-lw*.7,.5,f.y));",
      " vec3 gc=hsv(fract(T*.02+p.x*.1),.7,1.);",
      " col=mix(vec3(.09,.02,.2),gc,l*exp(-z*.12));",
      " col+=vec3(1.,.35,.7)*.35*exp(-(hz-p.y)*14.);",
      "}",
      "gl_FragColor=vec4(col,1.);}"].join("\n") },

    { id: "bubble-party", name: "Bubble Party", kind: "2d", res: 0.5, still: 8, make: bubbles },

    { id: "spirograph", name: "Spirograph", kind: "2d", res: 0.75, still: 14, make: spirograph },

    { id: "northern-lights", name: "Northern Lights", kind: "gl", frag: [
      "void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=U();",
      "vec3 col=mix(vec3(.01,.02,.07),vec3(.05,.03,.17),uv.y);",
      "vec2 sp=floor(gl_FragCoord.xy/2.);float st=step(.997,h21(sp));col+=st*.6*(.6+.4*sin(T*.8+h21(sp+3.)*TAU));",
      "for(int i=0;i<4;i++){float fi=float(i);float x=p.x*1.4+fi*1.7;",
      " float y0=-.15+fi*.09+.3*(fbm(vec2(x*.7,T*.06+fi*3.))-.5);",
      " float d=p.y-y0;",
      " float band=exp(-max(d,0.)*3.5)*smoothstep(-.03,.04,d)*(.45+.55*fbm(vec2(x*5.,T*.15+fi)));",
      " col+=rainbow(fi*.22+x*.08+T*.02+.25)*band*.55;}",
      "gl_FragColor=vec4(col,1.);}"].join("\n") }
  ];

  // The ten that cycle on the arcade, in order. Reasons live in the gallery.
  var PICKS = ["rainbow-plasma", "matrix-rain", "kaleidoscope", "lava-lamp", "rainbow-rain",
    "hex-disco", "liquid-marble", "warp-speed", "rainbow-tunnel", "retro-sun"];

  var BY_ID = {};
  LIST.forEach(function (d) { BY_ID[d.id] = d; });

  // ---------------------------------------------------------------------------------------
  // Painters: one running copy of a background, drawn onto a 2D context of W x H.
  // ---------------------------------------------------------------------------------------
  function painter(id, W, H, opts) {
    var def = BY_ID[id];
    if (!def) return null;
    opts = opts || {};
    var t = def.kind === "gl" ? rnd(0, 120) : 0;
    var self = { id: id, name: def.name, kind: def.kind };

    if (def.kind === "gl") {
      var G = sharedGL();
      if (!G || G.lost) return null;
      var prog = program(G, def);
      if (!prog) return null;
      var scale = opts.glScale || 0.5, gw, gh;
      self.resize = function (w, h) {
        W = w; H = h;
        var k = Math.min(scale, 720 / Math.max(W, H));
        gw = Math.max(16, Math.round(W * k)); gh = Math.max(16, Math.round(H * k));
      };
      self.resize(W, H);
      self.paint = function (ctx, dt, alpha) {
        t += dt;
        if (G.lost) return;
        var gl = G.gl, c = G.canvas;
        if (c.width < gw || c.height < gh) { c.width = Math.max(c.width, gw); c.height = Math.max(c.height, gh); }
        gl.viewport(0, 0, gw, gh);
        gl.useProgram(prog.p);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(prog.R, gw, gh);
        gl.uniform1f(prog.T, t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        ctx.globalAlpha = alpha;
        ctx.drawImage(c, 0, c.height - gh, gw, gh, 0, 0, W, H);
        ctx.globalAlpha = 1;
      };
      self.still = function (ctx) { t = def.still || 14; self.paint(ctx, 0, 1); };
      self.dispose = function () {};
      return self;
    }

    var buf = doc.createElement("canvas"), bctx = buf.getContext("2d"), inst = null;
    var res = (def.res || 0.6) * (opts.res2d || 1);
    function start(warm) {
      if (inst) inst.dispose();
      var k = Math.min(res, 1280 / Math.max(W, H));
      buf.width = Math.max(16, Math.round(W * k));
      buf.height = Math.max(16, Math.round(H * k));
      inst = def.make();
      inst.init(bctx, buf.width, buf.height);
      t = 0;
      // Run a few seconds up front, so trails and particles are already on screen.
      for (var i = 0, n = Math.round((warm || 2) * 30); i < n; i++) { t += 1 / 30; inst.frame(t, 1 / 30); }
    }
    self.resize = function (w, h) { W = w; H = h; start(2); };
    start(2);
    self.paint = function (ctx, dt, alpha) {
      t += dt;
      if (dt > 0) inst.frame(t, dt);
      ctx.globalAlpha = alpha;
      ctx.drawImage(buf, 0, 0, W, H);
      ctx.globalAlpha = 1;
    };
    self.still = function (ctx) { start(def.still || 6); self.paint(ctx, 0, 1); };
    self.dispose = function () { if (inst) inst.dispose(); inst = null; buf.width = buf.height = 1; };
    return self;
  }

  function hasGL() { var G = sharedGL(); return !!(G && !G.lost); }

  function prefersReduced() {
    return !!(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // ---------------------------------------------------------------------------------------
  // Previews for the gallery: many small canvases, one shared clock.
  // ---------------------------------------------------------------------------------------
  var previews = [], previewRaf = 0, previewLast = 0;
  function previewTick(now) {
    previewRaf = 0;
    var live = previews.filter(function (p) { return p.visible; });
    if (!live.length || doc.hidden || prefersReduced()) return;
    previewRaf = win.requestAnimationFrame(previewTick);
    if (previewLast && now - previewLast < 1000 / 31) return;
    var dt = previewLast ? Math.min(0.1, (now - previewLast) / 1000) : 1 / 30;
    previewLast = now;
    live.forEach(function (p) { if (p.p) p.p.paint(p.ctx, dt, 1); });
  }
  function wakePreviews() { if (!previewRaf) { previewLast = 0; previewRaf = win.requestAnimationFrame(previewTick); } }
  doc.addEventListener("visibilitychange", wakePreviews);

  function preview(canvas, id) {
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(32, Math.round(rect.width || 320));
    canvas.height = Math.max(18, Math.round(rect.height || 180));
    var ctx = canvas.getContext("2d", { alpha: false });
    var item = { visible: true, ctx: ctx, p: painter(id, canvas.width, canvas.height, { glScale: 1 }) };
    if (!item.p) {
      ctx.fillStyle = "#1d1a2f"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fffdf6"; ctx.font = "800 14px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Needs WebGL", canvas.width / 2, canvas.height / 2);
      return item;
    }
    item.p.still(ctx);
    previews.push(item);
    if ("IntersectionObserver" in win) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { item.visible = e.isIntersecting; });
        wakePreviews();
      }).observe(canvas);
    }
    wakePreviews();
    return item;
  }

  // ---------------------------------------------------------------------------------------
  // The runner: one full-page canvas behind the content, cycling the picks. It only runs in
  // Weird mode (assets/mode.js); in Normal mode nothing is drawn and the wall stays yellow.
  // ---------------------------------------------------------------------------------------
  var CSS = [
    ".gob-canvas{position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block;pointer-events:none}",
    ".gob-canvas[hidden],.gob-ctl[hidden]{display:none!important}",
    ".gob-ctl{position:fixed;z-index:4;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));",
    " display:flex;align-items:center;gap:6px;padding:5px;max-width:calc(100vw - 24px);",
    " background:var(--card,#fffdf6);color:var(--ink,#1d1a2f);border:3px solid var(--ink,#1d1a2f);border-radius:999px;",
    " box-shadow:4px 4px 0 var(--ink,#1d1a2f);font:800 14px/1 var(--body,system-ui,sans-serif)}",
    ".gob-name{padding:0 4px 0 10px;font:400 17px/1 var(--display,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}",
    ".gob-next{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0;padding:0;",
    " border:2.5px solid var(--ink,#1d1a2f);border-radius:999px;background:var(--wall,#ffd23f);color:var(--ink,#1d1a2f);cursor:pointer}",
    ".gob-next:hover{background:var(--pop,#ff6b4a);color:var(--card,#fffdf6)}",
    ".gob-next svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}",
    "@media (max-width:520px){.gob-name{display:none}}"
  ].join("\n");

  var ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l9 7-9 7zM18 5v14"/></svg>';

  var runner = null;

  function currentMode() {
    if (win.gameonMode) return win.gameonMode.get();
    return doc.documentElement.getAttribute("data-mode") === "weird" ? "weird" : "normal";
  }

  function mount(opts) {
    if (runner) return runner;
    opts = opts || {};
    var root = doc.documentElement;
    var q = new URLSearchParams(win.location.search);
    var mqReduce = win.matchMedia ? win.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var phone = (win.matchMedia && win.matchMedia("(pointer: coarse)").matches) || win.innerWidth < 768;
    var minFrame = 1000 / (phone ? 30 : 60);
    var secs = parseFloat(q.get("bgInterval"));
    var nextDelay = secs > 0 ? function () { return secs; } : function () { return rnd(30, 45); };
    var FADE = secs > 0 ? Math.min(2.5, secs / 3) : 2.5, SKIP_FADE = 0.6;
    var want = q.get("bg");

    var style = doc.createElement("style");
    style.textContent = CSS;
    doc.head.appendChild(style);

    var canvas = doc.createElement("canvas");
    canvas.className = "gob-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.hidden = true;
    doc.body.insertBefore(canvas, doc.body.firstChild);
    var ctx = canvas.getContext("2d", { alpha: false });

    var ctl = doc.createElement("div");
    ctl.className = "gob-ctl";
    ctl.hidden = true;
    ctl.innerHTML = '<span class="gob-name"></span>' +
      '<button type="button" class="gob-next" aria-label="Next background" title="Next background">' + ICON_NEXT + '</button>';
    doc.body.appendChild(ctl);
    var nameEl = ctl.querySelector(".gob-name"), nextBtn = ctl.querySelector(".gob-next");

    var order = null, idx = 0;
    var W = 0, H = 0, cur = null, old = null, fade = 1, fadeLen = FADE, elapsed = 0, nextAt = nextDelay();
    var raf = 0, last = 0, frames = 0, state = "", stillDone = false, paused = false, sized = false;

    // Decided the first time Weird mode starts, so Normal mode never touches WebGL.
    function pickOrder() {
      order = (opts.ids || PICKS).filter(function (id) { return BY_ID[id]; });
      if (!hasGL()) {
        order = order.filter(function (id) { return BY_ID[id].kind === "2d"; });
        if (!order.length) order = LIST.filter(function (d) { return d.kind === "2d"; }).map(function (d) { return d.id; });
      }
      if (want && BY_ID[want] && (BY_ID[want].kind === "2d" || hasGL())) {
        if (order.indexOf(want) < 0) order.unshift(want);
        idx = order.indexOf(want);
      } else {
        idx = (Math.random() * order.length) | 0;
      }
    }

    function size() {
      var w = win.innerWidth, h = Math.max(win.innerHeight, root.clientHeight);
      var k = Math.min(1, 1600 / Math.max(w, h));
      W = Math.max(32, Math.round(w * k)); H = Math.max(32, Math.round(h * k));
      canvas.width = W; canvas.height = H;
      sized = true;
    }

    function make(i) {
      for (var n = 0; n < order.length; n++) {
        var id = order[(i + n) % order.length], p = painter(id, W, H);
        if (p) { idx = (i + n) % order.length; return p; }
      }
      return null;
    }

    function label() {
      nameEl.textContent = cur ? cur.name : "";
      if (cur) root.setAttribute("data-bg", cur.id); else root.removeAttribute("data-bg");
    }

    function draw(dt) {
      frames++;
      if (old) {
        fade += dt / fadeLen;
        if (fade >= 1) { old.dispose(); old = null; fade = 1; }
      }
      if (old) {
        old.paint(ctx, dt, 1);
        cur.paint(ctx, dt, fade * fade * (3 - 2 * fade));
      } else if (cur) {
        cur.paint(ctx, dt, 1);
      }
    }

    function advance(len) {
      if (old || !cur) return false;
      var next = make(idx + 1);
      if (!next || next.id === cur.id) return false;
      old = cur; cur = next; fade = 0; fadeLen = len; elapsed = 0; nextAt = nextDelay();
      label();
      return true;
    }

    function tick(now) {
      raf = 0;
      if (state !== "running") return;
      raf = win.requestAnimationFrame(tick);
      if (last && now - last < minFrame - 1.5) return;
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!old) { elapsed += dt; if (elapsed >= nextAt) advance(FADE); }
      draw(dt);
    }

    function still() {
      if (old) { old.dispose(); old = null; fade = 1; }
      if (cur) cur.still(ctx);
      stillDone = true;
    }

    // Weird mode starting: pick up where the cycle was, or start it at a random pick.
    function wake() {
      if (!order) pickOrder();
      if (!sized) size();
      if (!cur) {
        cur = make(idx);
        elapsed = 0; nextAt = nextDelay();
        if (cur) cur.paint(ctx, 0, 1);
      }
      label();
    }

    // Normal mode: let go of everything, so nothing keeps running or holding memory.
    function sleep() {
      if (old) { old.dispose(); old = null; fade = 1; }
      if (cur) { cur.dispose(); cur = null; }
      stillDone = false;
      label();
    }

    function update() {
      var weird = currentMode() === "weird";
      var reduce = !!(mqReduce && mqReduce.matches);
      var s = !weird ? "normal" : paused ? "paused" : doc.hidden ? "hidden" : reduce ? "still" : "running";
      if (weird) wake();
      canvas.hidden = !weird;
      ctl.hidden = !weird || paused;
      if (s === state) return;
      var was = state;
      state = s;
      root.setAttribute("data-bg-state", s);
      if (s === "running") {
        stillDone = false;
        if (!raf) { last = 0; raf = win.requestAnimationFrame(tick); }
      } else if (raf) {
        win.cancelAnimationFrame(raf); raf = 0;
      }
      if (s === "normal" && was) sleep();
      if (s === "still" && !stillDone) still();
    }

    function next() {
      if (state === "normal" || !cur) return false;
      if (state === "running") return advance(SKIP_FADE);
      var p = make(idx + 1);
      if (!p) return false;
      if (old) { old.dispose(); old = null; }
      cur.dispose(); cur = p; elapsed = 0;
      label();
      cur.still(ctx);
      return true;
    }

    nextBtn.addEventListener("click", next);
    doc.addEventListener("gameon:mode", update);

    var resizeTimer = 0, lastW = win.innerWidth, lastH = win.innerHeight;
    win.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var w = win.innerWidth, h = win.innerHeight;
        // Ignore the phone address bar sliding in and out: only real size changes re-render.
        if (w === lastW && Math.abs(h - lastH) < lastH * 0.25) return;
        lastW = w; lastH = h;
        if (!sized) return;
        size();
        if (old) { old.dispose(); old = null; fade = 1; }
        if (cur) cur.resize(W, H);
        if (state === "still") still(); else if (cur) cur.paint(ctx, 0, 1);
      }, 200);
    });
    doc.addEventListener("visibilitychange", update);
    if (mqReduce) {
      var onReduce = function () { stillDone = false; update(); };
      if (mqReduce.addEventListener) mqReduce.addEventListener("change", onReduce); else if (mqReduce.addListener) mqReduce.addListener(onReduce);
    }
    if (opts.pause) {
      var checkPause = function () {
        var p = !!doc.querySelector(opts.pause);
        if (p !== paused) { paused = p; update(); }
      };
      new MutationObserver(checkPause).observe(doc.body, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
      win.addEventListener("hashchange", checkPause);
      paused = !!doc.querySelector(opts.pause);
    }

    update();

    runner = {
      get id() { return cur ? cur.id : null; },
      get name() { return cur ? cur.name : null; },
      get state() { return state; },
      get frames() { return frames; },
      get order() { return order ? order.slice() : null; },
      next: next,
      canvas: canvas
    };
    api.runner = runner;
    return runner;
  }

  var api = {
    list: LIST.map(function (d) { return { id: d.id, name: d.name, kind: d.kind }; }),
    picks: PICKS.slice(),
    hasGL: hasGL,
    painter: painter,
    preview: preview,
    mount: mount,
    runner: null
  };
  win.GameOnBackgrounds = api;

  var me = doc.currentScript;
  if (me && me.hasAttribute("data-mount")) {
    var go = function () { mount({ pause: me.getAttribute("data-pause") || null }); };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", go); else go();
  }
})(window, document);
