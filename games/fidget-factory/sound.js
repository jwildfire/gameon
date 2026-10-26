// Fidget Factory: every sound is made here with WebAudio, so there are no sound files.
// The audio starts on the first tap or key press (browsers ask for that).
(function () {
  "use strict";
  var FF = window.FF = window.FF || {};
  var ac = null, master = null, musicBus = null, noiseBuf = null;
  var S = { sfx: true, music: true };
  var whirr = null, musicNext = 0, musicStep = 0;

  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = S.music ? 0.16 : 0; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    var ch = noiseBuf.getChannelData(0), x = 1;
    for (var i = 0; i < ch.length; i++) { x = (x * 16807) % 2147483647; ch[i] = (x / 2147483647) * 2 - 1; }
    musicNext = ac.currentTime + 0.1;
  }
  function ok() { return ac && S.sfx && ac.state !== "closed"; }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(type, f0, f1, dur, vol, when, dest) {
    if (!ok()) return;
    var t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, vol, dur); o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, ftype, f0, f1, when, q) {
    if (!ok()) return;
    var t = ac.currentTime + (when || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = ftype || "bandpass"; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.003, vol, dur); s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.05);
  }

  var SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
  var sfx = {
    tap: function () { tone("triangle", 660, 880, 0.07, 0.18); },
    pick: function () { tone("sine", 700, 1100, 0.09, 0.22); noise(0.03, 0.08, "highpass", 3000); },
    nope: function () { tone("square", 220, 160, 0.16, 0.08); },
    buy: function () { [0, 0.07, 0.14].forEach(function (w, i) { tone("triangle", SCALE[4 + i * 2], 0, 0.14, 0.2, w); }); noise(0.25, 0.06, "highpass", 6000, 0, 0.12); },
    coin: function () { tone("square", 1319, 0, 0.05, 0.07); tone("square", 1760, 0, 0.12, 0.07, 0.05); },
    // pop-it: a soft thock with a little pitch, higher for the top rows
    pop: function (row, rows) {
      var f = SCALE[Math.max(0, Math.min(SCALE.length - 1, Math.round((1 - row / Math.max(1, rows - 1)) * 7)))] * 0.5;
      tone("sine", f * 1.9, f * 0.9, 0.09, 0.32); noise(0.025, 0.2, "bandpass", 1800, 600, 0, 2);
    },
    flip: function () { noise(0.3, 0.14, "bandpass", 500, 2500, 0, 0.8); tone("triangle", 330, 660, 0.25, 0.12, 0.05); },
    cheer: function () { [0, 2, 4, 7].forEach(function (n, i) { tone("triangle", SCALE[n], 0, 0.2, 0.18, i * 0.08); }); },
    squish: function (amt) { noise(0.22, 0.2 * (0.5 + amt), "bandpass", 900, 260, 0, 3); tone("sine", 220, 140, 0.2, 0.12); },
    boing: function (amt) { if (!ok()) return; var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(420 + amt * 300, t + 0.12); o.frequency.exponentialRampToValueAtTime(260, t + 0.4);
      v.frequency.value = 18; vg.gain.value = 25; v.connect(vg); vg.connect(o.frequency);
      env(g, t, 0.01, 0.22, 0.42); o.connect(g); g.connect(master); o.start(t); v.start(t); o.stop(t + 0.5); v.stop(t + 0.5); },
    click: function (p) { p = p || 1; noise(0.018, 0.35, "highpass", 2500 * p); tone("square", 1800 * p, 900 * p, 0.03, 0.08); },
    clack: function (p) { p = p || 1; noise(0.03, 0.3, "bandpass", 1200 * p, 0, 0, 1.5); tone("triangle", 500 * p, 300 * p, 0.05, 0.12); },
    tick: function (p) { noise(0.012, 0.22, "highpass", 4000 * (p || 1)); },
    thunk: function () { tone("sine", 150, 70, 0.12, 0.3); noise(0.04, 0.15, "lowpass", 800); },
    whoosh: function () { noise(0.35, 0.16, "bandpass", 300, 2200, 0, 0.7); },
    flick: function (amt) { noise(0.18, 0.12 + amt * 0.1, "bandpass", 600, 3000, 0, 0.8); },
    best: function () { [0, 2, 4, 5, 7, 9].forEach(function (n, i) { tone("square", SCALE[n], 0, 0.12, 0.08, i * 0.07); tone("triangle", SCALE[n] / 2, 0, 0.14, 0.1, i * 0.07); }); },
    // factory
    clank: function () { tone("square", 160, 90, 0.1, 0.12); noise(0.12, 0.25, "bandpass", 2400, 900, 0, 4); tone("triangle", 1250, 1180, 0.25, 0.06); },
    chop: function () { noise(0.08, 0.35, "highpass", 2000); tone("sawtooth", 300, 120, 0.08, 0.08); },
    spray: function (dur) { noise(dur || 0.6, 0.12, "highpass", 3500, 5000, 0, 0.5); },
    stamp: function () { tone("sine", 110, 45, 0.3, 0.45); noise(0.15, 0.3, "lowpass", 600); },
    plop: function () { tone("sine", 400, 900, 0.1, 0.22); },
    sparkle: function () { [0, 1, 2, 3, 4].forEach(function (i) { tone("sine", 2000 + i * 400, 0, 0.08, 0.06, i * 0.05); }); },
    ding: function () { tone("sine", 1568, 0, 0.6, 0.2); tone("sine", 2093, 0, 0.5, 0.12, 0.02); },
    tada: function () { [0, 4, 7, 9].forEach(function (n, i) { tone("triangle", SCALE[n], 0, 0.25, 0.2, i * 0.09); }); noise(0.4, 0.08, "highpass", 5000, 0, 0.3); }
  };

  // The spinner's hum: one oscillator that follows the spin speed.
  function spinHum(w) {
    if (!ac) return;
    var on = S.sfx && Math.abs(w) > 0.4;
    if (!whirr) {
      if (!on) return;
      var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = "sawtooth"; f.type = "lowpass"; f.Q.value = 6; g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(master); o.start();
      whirr = { o: o, f: f, g: g };
    }
    var t = ac.currentTime, s = Math.min(1, Math.abs(w) / 40);
    whirr.o.frequency.setTargetAtTime(50 + Math.abs(w) * 5, t, 0.05);
    whirr.f.frequency.setTargetAtTime(300 + Math.abs(w) * 40, t, 0.05);
    whirr.g.gain.setTargetAtTime(on ? 0.02 + 0.07 * s : 0, t, 0.06);
  }

  // A bouncy little tune, scheduled a moment ahead on the audio clock.
  var MEL = [0, 4, 7, 4, 9, 7, 4, 2, 0, 2, 4, 7, 5, 4, 2, -1, 0, 4, 7, 9, 11, 9, 7, 4, 5, 4, 2, 4, 0, -1, 0, -1];
  function note(n) { return 523.25 * Math.pow(2, n / 12); }
  function musicTick() {
    if (!ac || !S.music) return;
    var step = 60 / 132 / 2;
    while (musicNext < ac.currentTime + 0.25) {
      var t = musicNext - ac.currentTime, n = MEL[musicStep % MEL.length];
      if (n >= 0) tone("triangle", note(n), 0, 0.16, 0.5, t, musicBus);
      if (musicStep % 4 === 0) tone("square", note([0, 0, 5, 5, 7, 7, 5, 4][(musicStep / 4) % 8 | 0] - 24), 0, 0.22, 0.35, t, musicBus);
      if (musicStep % 2 === 1) { var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 7000; env(g, ac.currentTime + t, 0.002, 0.15, 0.04); s.connect(f); f.connect(g); g.connect(musicBus); s.start(ac.currentTime + t); s.stop(ac.currentTime + t + 0.08); }
      musicStep++; musicNext += step;
    }
  }

  FF.sound = {
    init: init,
    settings: S,
    set: function (k, v) {
      S[k] = !!v;
      if (ac && musicBus) musicBus.gain.setTargetAtTime(S.music ? 0.16 : 0, ac.currentTime, 0.05);
      if (ac && musicNext < ac.currentTime) musicNext = ac.currentTime + 0.05;
      if (!S.sfx) spinHum(0);
    },
    play: function (name, a, b) { if (sfx[name]) try { sfx[name](a, b); } catch (e) { /* never let sound break the game */ } },
    spinHum: spinHum,
    musicTick: musicTick,
    started: function () { return !!ac; }
  };
})();
