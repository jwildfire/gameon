// Delve Squad: every sound is made on the spot with WebAudio. No sound files.
(function (root) {
"use strict";
var ac = null, master = null, on = true, last = {};
try { on = localStorage.getItem("gameon.delve-squad.sound") !== "off"; } catch (e) { on = true; }

function ctx() {
  if (!on) return null;
  if (!ac) {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination); } catch (e) { ac = null; return null; }
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}
function tone(freq, dur, type, vol, slide, delay) {
  var a = ctx(); if (!a) return;
  var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, delay) {
  var a = ctx(); if (!a) return;
  var t = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = "lowpass"; f.frequency.value = freq || 1200; g.gain.value = vol || 0.3;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
// Don't let a big fight turn into a wall of noise.
function gate(name, ms) {
  var now = Date.now(); if (last[name] && now - last[name] < ms) return false; last[name] = now; return true;
}
var SFX = {
  click: function () { tone(660, 0.05, "square", 0.12); },
  equip: function () { tone(520, 0.06, "square", 0.15); tone(780, 0.1, "square", 0.15, null, 0.06); },
  hit: function () { if (gate("hit", 55)) noise(0.06, 0.25, 900); },
  crit: function () { if (gate("crit", 80)) { noise(0.1, 0.35, 1600); tone(220, 0.1, "sawtooth", 0.15, 0.5); } },
  shoot: function () { if (gate("shoot", 70)) tone(900, 0.08, "triangle", 0.1, 0.5); },
  poof: function () { if (gate("poof", 50)) { tone(880, 0.12, "triangle", 0.15, 2); tone(1320, 0.1, "sine", 0.1, 1.5, 0.04); } },
  heal: function () { if (gate("heal", 120)) { tone(660, 0.12, "sine", 0.15); tone(990, 0.16, "sine", 0.12, null, 0.08); } },
  shield: function () { tone(330, 0.18, "square", 0.12, 1.5); },
  vanish: function () { tone(1200, 0.15, "sine", 0.12, 0.3); },
  fireball: function () { noise(0.25, 0.2, 600); tone(200, 0.25, "sawtooth", 0.1, 0.5); },
  boom: function () { if (gate("boom", 60)) noise(0.35, 0.4, 500); },
  slam: function () { noise(0.4, 0.5, 300); tone(80, 0.35, "sine", 0.4, 0.5); },
  roar: function () { tone(110, 0.5, "sawtooth", 0.22, 0.6); noise(0.4, 0.2, 400); },
  down: function () { tone(330, 0.3, "triangle", 0.2, 0.4); },
  clear: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 0.14, "square", 0.12, null, i * 0.09); }); },
  floor: function () { [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, "square", 0.13, null, i * 0.09); }); },
  boss: function () { tone(73, 0.9, "sawtooth", 0.25, 0.8); tone(110, 0.9, "sawtooth", 0.18, 0.7, 0.1); },
  lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.3, "triangle", 0.2, null, i * 0.22); }); },
  campfire: function () { noise(0.5, 0.08, 2500); tone(440, 0.2, "sine", 0.1, null, 0.1); }
};
root.SND = {
  play: function (name) { if (on && SFX[name]) try { SFX[name](); } catch (e) { /* no sound is fine */ } },
  on: function () { return on; },
  toggle: function () {
    on = !on;
    try { localStorage.setItem("gameon.delve-squad.sound", on ? "on" : "off"); } catch (e) { /* storage blocked */ }
    if (on) SFX.click();
    return on;
  }
};
})(window);
