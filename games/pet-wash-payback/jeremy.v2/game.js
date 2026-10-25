// Pet Wash Payback, jeremy.v2. Designed by Jeremy (GameOn game idea #157; update idea #163).
// Round 1: scrub, rinse and towel a muddy pet before the timer runs out. Now there are nine pets,
// including a gang of 10 squirrels, a parrot you have to catch first, a hippo and an octopus.
// Round 2: payback! Every animal you've washed so far chases you around the backyard at once, each
// with its own way to get you wet. Only Biscuit has the hose.
// Plain canvas + WebAudio, no network, no libraries. Everything is drawn in code.
(() => {
"use strict";

const $ = id => document.getElementById(id);
const canvas = $("game");
const mainCtx = canvas.getContext("2d");
let g = mainCtx;                      // the context the draw functions use
const INK = "#2a2140";
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function mulberry(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- saves
// All versions share gameon.pet-wash-payback.*. jeremy.v1 saved best, reached and muted there.
// This version only reads jeremy.v1's best and reached (and never writes them), shares muted (same
// format), and keeps its own progress under gameon.pet-wash-payback.jeremy.v2.*
const KEY = "gameon.pet-wash-payback.";
const V2 = "jeremy.v2.";
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* storage blocked: play on */ } }
};
const cleanBest = b => (b && typeof b === "object" ? { total: +b.total || 0, pets: b.pets && typeof b.pets === "object" ? b.pets : {} } : { total: 0, pets: {} });
const V1_ORDER = ["dog", "cat", "bunny", "pig", "duck"];
const old = { best: cleanBest(store.get("best", null)), reached: clamp(+store.get("reached", 1) || 1, 1, 5) };
const saved = { best: cleanBest(store.get(V2 + "best", null)), reached: +store.get(V2 + "reached", 0) || 0 };

// ---------------------------------------------------------------- pets
const TOOLS = ["soap", "rinse", "towel"];
const TOOL_NAMES = ["SOAP", "RINSE", "TOWEL"];
const HP = [250, 170, 150];           // scrubbing work for mud, foam and wet patches
const PETS = [
  { id: "dog", name: "Biscuit", kind: "Dog", spots: 7, washTime: 35, hoseTime: 20, seed: 11, lid: "#e8b46a", voice: "bark",
    weapon: "hose", gear: "the hose",
    body: [[0, 35, 92, 72], [0, -62, 66, 60]],
    washTip: "Biscuit loves bath time... until the big shake! Scrub fast.",
    hoseTip: "Biscuit has the hose (the only hose!). Keep running, and duck behind the shed!" },
  { id: "cat", name: "Mittens", kind: "Cat", spots: 8, washTime: 36, hoseTime: 21, seed: 23, lid: "#f2a65a", voice: "meow",
    weapon: "squirt", gear: "a squirt gun",
    body: [[0, 38, 82, 70], [0, -58, 62, 54]],
    washTip: "Mittens HATES water. Rinse too long and she jumps to the other side!",
    hoseTip: "Mittens hides in the bushes with a squirt gun. Pew pew pew! Watch for rustling." },
  { id: "squirrel", name: "The Nutty Gang", kind: "Squirrels", spots: 10, washTime: 46, hoseTime: 22, seed: 29, lid: "#b9784a", voice: "chitter",
    weapon: "bucket", gear: "a bucket", gang: true, full: "The Nutty Gang", washTitle: "Wash all 10 squirrels!",
    body: [[0, -10, 120, 50], [0, -10, 120, 50]],
    washTip: "TEN squirrels in one tub! They never stop scurrying. Clean ones hop up on the rim.",
    hoseTip: "The Nutty Gang carries a bucket up high. Get out of its shadow before they tip it!" },
  { id: "bunny", name: "Clover", kind: "Bunny", spots: 9, washTime: 37, hoseTime: 22, seed: 37, lid: "#fbf7f2", voice: "squeak",
    weapon: "sprinkler", gear: "a sprinkler",
    body: [[0, 45, 78, 66], [0, -40, 58, 52]],
    washTip: "Clover can't sit still. She hops all over the tub!",
    hoseTip: "Clover hops up close, then spins her sprinkler. Tick tick tick! Get out of range." },
  { id: "parrot", name: "Pickles", kind: "Parrot", spots: 7, washTime: 42, hoseTime: 23, seed: 47, lid: "#5cc85a", voice: "squawk",
    weapon: "rain", gear: "his own rain cloud", flyer: true,
    body: [[0, 30, 70, 74], [0, -58, 52, 48]],
    washTip: "Pickles won't stay in the tub! Tap him to catch him, then scrub fast before he flies off.",
    hoseTip: "Pickles flies over with his own little rain cloud. Watch for drops falling from the sky!" },
  { id: "pig", name: "Truffle", kind: "Pig", spots: 10, washTime: 42, hoseTime: 24, seed: 41, lid: "#ffaac4", voice: "oink",
    weapon: "puddle", gear: "mud puddles",
    body: [[0, 32, 104, 78], [0, -45, 72, 60]],
    washTip: "Truffle keeps rolling in mud. Clean spots can get muddy again!",
    hoseTip: "Truffle leaves mud puddles, then cannonballs into the one next to you. SPLOOSH!" },
  { id: "hippo", name: "Bubbles", kind: "Hippo", spots: 11, washTime: 44, hoseTime: 25, seed: 59, lid: "#a99bd6", voice: "hrumph",
    weapon: "wave", gear: "a belly flop",
    body: [[0, 34, 108, 76], [0, -44, 82, 52]],
    washTip: "Bubbles keeps sinking under the water! Scrub her when she comes up for air.",
    hoseTip: "Bubbles belly flops and makes a big wave. When she jumps, run far away or hide!" },
  { id: "octopus", name: "Inky", kind: "Octopus", spots: 10, washTime: 42, hoseTime: 25, seed: 67, lid: "#ff8a7a", voice: "blorp",
    weapon: "octo", gear: "eight squirt guns",
    body: [[0, -44, 80, 64], [0, -30, 70, 50]],
    washTip: "Inky has eight arms, and they keep grabbing your tools! Use another one until you get it back.",
    hoseTip: "Inky has a squirt gun in EVERY arm. When he spins, find a gap or hide!" },
  { id: "duck", name: "Sir Quackers", kind: "Duck", spots: 11, washTime: 38, hoseTime: 25, seed: 53, surprise: true, lid: "#ffd93b", voice: "quack",
    weapon: "balloon", gear: "water balloons",
    body: [[0, 42, 92, 68], [0, -62, 56, 52]],
    washTip: "SURPRISE! It's a duck! He loves water and paddles round and round the tub.",
    hoseTip: "Sir Quackers throws bouncing water balloons. Watch the shadows!" }
];
const PET = Object.fromEntries(PETS.map(p => [p.id, p]));
const fullName = p => p.full || `${p.name} the ${p.kind}`;
// What jeremy.v1 unlocked carries over: every pet up to the last one you reached there.
const v1Reach = 1 + Math.max(...V1_ORDER.slice(0, old.reached).map(id => PETS.findIndex(p => p.id === id)));
saved.reached = clamp(Math.max(saved.reached, v1Reach), 1, PETS.length);
// best stars per pet: this version's, or jeremy.v1's if those are better
function bestStars(id) {
  const a = saved.best.pets[id] || {}, b = old.best.pets[id] || {};
  return { wash: Math.max(+a.wash || 0, +b.wash || 0), hose: Math.max(+a.hose || 0, +b.hose || 0) };
}

// The Nutty Gang: one squirrel per spot, each with a muddy belly, scattered around the tub.
const GANG_HOME = [[-112, 14], [-62, 4], [-12, 10], [38, 2], [88, 14], [-92, 52], [-40, 46], [12, 54], [62, 48], [112, 56]];
function makeSpots(pet) {
  const R = mulberry(pet.seed), out = [];
  if (pet.gang) {
    GANG_HOME.forEach(([x, y], i) => {
      const blobs = [];
      for (let j = 0; j < 4; j++) blobs.push([(R() - 0.5) * 14, (R() - 0.5) * 12, 6 + R() * 5]);
      out.push({ x, y, hx: x, hy: y, tx: x, ty: y, stage: 0, hp: HP[0] * 0.8, blobs, wob: R() * TAU, sq: i, face: R() < 0.5 ? -1 : 1 });
    });
    return out;
  }
  let tries = 0, gap = 48;
  while (out.length < pet.spots && tries < 6000) {
    tries++;
    if (tries % 1500 === 0) gap -= 6;
    const e = pet.body[R() < 0.62 ? 0 : 1];
    const a = R() * TAU, d = Math.sqrt(R()) * 0.8;
    const x = e[0] + Math.cos(a) * e[2] * d, y = e[1] + Math.sin(a) * e[3] * d;
    if (y > 50) continue;
    if (out.some(s => Math.hypot(s.x - x, s.y - y) < gap)) continue;
    const blobs = [];
    for (let i = 0; i < 5; i++) blobs.push([(R() - 0.5) * 22, (R() - 0.5) * 18, 9 + R() * 8]);
    out.push({ x, y, stage: 0, hp: HP[0], blobs, wob: R() * TAU });
  }
  return out;
}

// ---------------------------------------------------------------- sound
const Sound = (() => {
  let ac = null, master = null, sfx = null, music = null, noiseBuf = null;
  let muted = !!store.get("muted", false);
  const loops = {};
  let song = null, nextNote = 0, step = 0, timer = null;
  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.75; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    music = ac.createGain(); music.gain.value = 0.32; music.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (song) startMusic(song);
  }
  function tone(type, f0, f1, dur, vol, when = 0, out = sfx) {
    if (!ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, type, f0, f1, q = 1, when = 0, out = sfx) {
    if (!ac) return;
    const t = ac.currentTime + when;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const gn = ac.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function loop(name, on, freq = 2600, vol = 0.12) {
    if (!ac) return;
    let L = loops[name];
    if (!L) {
      const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.8;
      const gn = ac.createGain(); gn.gain.value = 0;
      s.connect(f); f.connect(gn); gn.connect(sfx); s.start();
      L = loops[name] = { gn, on: false };
    }
    if (L.on === on) return;
    L.on = on;
    L.gn.gain.setTargetAtTime(on ? vol : 0, ac.currentTime, 0.04);
  }
  const play = {
    scrub() { noise(0.07, 0.07, "bandpass", rnd(1800, 3200), rnd(1200, 2000), 4); },
    bubble() { tone("sine", rnd(500, 700), rnd(1100, 1500), 0.08, 0.12); },
    pop() { tone("sine", 900, 300, 0.06, 0.12); noise(0.05, 0.06, "highpass", 3000, 5000); },
    sparkle() { [0, 0.06, 0.12].forEach((w, i) => tone("triangle", 1046 * Math.pow(1.26, i), 1046 * Math.pow(1.26, i), 0.18, 0.08, w)); },
    star(i) { tone("triangle", 660 * Math.pow(1.335, i), 880 * Math.pow(1.335, i), 0.22, 0.14); },
    squelch() { noise(0.22, 0.24, "lowpass", 900, 160, 2); tone("sine", 160, 60, 0.2, 0.18); },
    splash() { noise(0.3, 0.18, "lowpass", 2400, 300, 1); },
    whoosh() { noise(0.25, 0.1, "bandpass", 600, 2400, 1.5); },
    bark() { tone("square", 420, 260, 0.09, 0.08); tone("square", 460, 280, 0.09, 0.08, 0.14); },
    meow() { tone("sine", 500, 900, 0.16, 0.12); tone("sine", 900, 450, 0.22, 0.12, 0.16); },
    hiss() { noise(0.4, 0.16, "highpass", 3500, 5000, 0.7); },
    squeak() { tone("sine", 1400, 2200, 0.08, 0.1); tone("sine", 1600, 2600, 0.07, 0.1, 0.1); },
    oink() { tone("sawtooth", 180, 120, 0.14, 0.09); tone("sawtooth", 200, 130, 0.16, 0.09, 0.18); },
    quack() { tone("square", 640, 380, 0.12, 0.07); noise(0.12, 0.05, "bandpass", 1200, 900, 3); },
    giggle() { [0, 0.09, 0.18, 0.27].forEach((w, i) => tone("sine", 700 + i * 60, 520 + i * 40, 0.07, 0.08, w)); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone("triangle", f, f, 0.22, 0.12, i * 0.11)); },
    soaked() { [392, 370, 349, 311].forEach((f, i) => tone("sawtooth", f, f * 0.97, 0.34, 0.06, i * 0.3)); },
    click() { tone("triangle", 880, 660, 0.05, 0.08); },
    // new voices
    chitter() { for (let i = 0; i < 6; i++) tone("square", rnd(1500, 2100), rnd(1100, 1600), 0.04, 0.05, i * 0.055); },
    squawk() { tone("sawtooth", 700, 1300, 0.1, 0.08); tone("sawtooth", 1250, 600, 0.16, 0.08, 0.1); noise(0.2, 0.05, "bandpass", 1800, 1200, 2); },
    hrumph() { tone("sawtooth", 110, 70, 0.3, 0.12); noise(0.3, 0.08, "lowpass", 500, 150, 1); },
    blorp() { tone("sine", 320, 90, 0.18, 0.16); tone("sine", 260, 520, 0.08, 0.08, 0.16); },
    blub() { tone("sine", rnd(180, 260), rnd(400, 600), 0.09, 0.1); },
    grab() { tone("square", 300, 700, 0.08, 0.07); tone("sine", 700, 300, 0.12, 0.08, 0.08); },
    // the payback weapons: every one sounds different
    pew(k = 1) { tone("square", 1250 * k, 420 * k, 0.07, 0.06); },
    tick() { noise(0.025, 0.08, "highpass", 4000, 5000, 1); tone("triangle", 2100, 2000, 0.02, 0.04); },
    creak() { tone("sawtooth", 150, 210, 0.22, 0.05); tone("sawtooth", 210, 140, 0.25, 0.05, 0.22); },
    sploosh() { noise(0.55, 0.3, "lowpass", 1800, 160, 1); tone("sine", 140, 45, 0.4, 0.2); },
    plip() { tone("sine", rnd(1600, 2000), 800, 0.06, 0.06); },
    thud() { tone("sine", 120, 32, 0.4, 0.32); noise(0.2, 0.12, "lowpass", 400, 80, 1); },
    wave() { noise(0.7, 0.16, "bandpass", 400, 1600, 0.8); },
    mudsplat() { noise(0.35, 0.26, "lowpass", 700, 120, 3); tone("sine", 90, 40, 0.3, 0.2); },
    tagin() { tone("triangle", 660, 990, 0.1, 0.08); tone("triangle", 990, 1320, 0.1, 0.08, 0.1); }
  };
  // a bouncy little tune: [melody semitones from C5 (null = rest)], [bass semitones from C3]
  const SONGS = {
    wash: { bpm: 132, mel: [0, 4, 7, 4, 9, 7, 4, null, 2, 5, 9, 5, 7, null, 4, 2, 0, 4, 7, 12, 9, 7, 4, null, 5, 4, 2, 4, 0, null, null, null],
            bass: [0, 7, 5, 7, 2, 9, 7, 7, 0, 7, 5, 4, 2, 7, 0, 7] },
    hose: { bpm: 156, mel: [7, null, 7, 9, 7, 4, null, 0, 2, null, 2, 4, 2, null, -1, null, 7, null, 7, 9, 12, 9, 7, 4, 5, 4, 2, 4, 0, null, 0, null],
            bass: [0, 0, 5, 5, 7, 7, 2, 7, 0, 0, 5, 5, 7, 7, 0, 0] }
  };
  function schedule() {
    if (!ac || !song) return;
    const S = SONGS[song], spb = 60 / S.bpm / 2;
    while (nextNote < ac.currentTime + 0.2) {
      const when = nextNote - ac.currentTime;
      const m = S.mel[step % S.mel.length];
      if (m != null) tone("triangle", 523.25 * Math.pow(2, m / 12), 523.25 * Math.pow(2, m / 12), spb * 0.9, 0.09, Math.max(0, when), music);
      if (step % 2 === 0) {
        const b = S.bass[(step / 2) % S.bass.length];
        tone("sine", 130.8 * Math.pow(2, b / 12), 130.8 * Math.pow(2, b / 12), spb * 1.8, 0.16, Math.max(0, when), music);
      } else noise(0.03, 0.03, "highpass", 6000, 8000, 1, Math.max(0, when), music);
      nextNote += spb; step++;
    }
  }
  function startMusic(name) {
    song = name;
    if (!ac) return;
    if (timer) clearInterval(timer);
    nextNote = ac.currentTime + 0.05; step = 0;
    timer = setInterval(schedule, 60);
  }
  function stopMusic() { song = null; if (timer) { clearInterval(timer); timer = null; } }
  function setMuted(m) {
    muted = m; store.set("muted", m);
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.75, ac.currentTime, 0.02);
  }
  function quiet() { for (const k in loops) loop(k, false); }
  return { init, play, loop, startMusic, stopMusic, setMuted, quiet, get muted() { return muted; } };
})();
const sfx = (name, ...a) => { try { Sound.play[name](...a); } catch (e) { /* no audio */ } };

// ---------------------------------------------------------------- layout
let U = 1, W = 480, H = 480, DPR = 1;
function resize() {
  const oldW = W, oldH = H;
  const cw = Math.max(200, window.innerWidth), ch = Math.max(200, window.innerHeight);
  DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cw * DPR); canvas.height = Math.round(ch * DPR);
  U = Math.min(cw, ch) / 480;
  W = cw / U; H = ch / U;
  if (round && round.kind === "hose") rescaleYard(oldW, oldH);
  render();
}
const hudTop = () => 58 / U;
const toolBottom = () => ($("tools").offsetHeight + 14) / U;
function washLayout() {
  const title = mode === "title" || mode === "pets";
  const wide = W > H * 1.25;
  let top = hudTop() + (title ? 0 : 6 / U);
  if (title && !wide) top = Math.max(top, H * 0.5);     // the title card sits above the tub on a phone
  const bottom = mode === "wash" ? Math.max(70 / U, toolBottom()) : 12 / U;
  const availH = Math.max(160, H - top - bottom);
  const room = title && wide ? W * 0.46 : W;
  const k = Math.min(1.45, room / 330, availH / 330);
  const cx = title && wide ? W * 0.74 : W / 2;
  const baseY = top + availH / 2 - 15 * k + (title && wide ? 40 * k : 0);
  // how far the pet may wriggle sideways without leaving the screen
  const sway = clamp((room / 2 / k - 125) / 85, 0.35, 1);
  return { k, cx, baseY, sway, rimY: baseY + 80 * k, tubW: 200 * k, bottom: baseY + 178 * k, floorY: baseY + 150 * k };
}

// ---------------------------------------------------------------- state
let mode = "title";     // title | pets | intro | wash | hose | result | final
let paused = false, frozen = false;
let round = null;
let run = null;         // { start, index, scores: [] }
let ptr = { x: -999, y: -999, down: false, over: false, id: null };
const keys = { left: false, right: false, up: false, down: false };
let joy = null;         // { sx, sy, x, y, id }
const particles = [];
let tipTimer = 0, now = 0;

// ---------------------------------------------------------------- drawing helpers
function ell(x, y, rx, ry, fill, rot = 0, stroke = INK, lw = 5) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function circ(x, y, r, fill, stroke = INK, lw = 5) { ell(x, y, r, r, fill, 0, stroke, lw); }
function poly(pts, fill, stroke = INK, lw = 5) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = "round"; g.stroke(); }
}
function rrect(x, y, w, h, r, fill, stroke = INK, lw = 4) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function line(x1, y1, x2, y2, color = INK, lw = 5) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = "round"; g.stroke();
}
function eyes(x, y, r, pose, color = INK) {
  const blink = pose.blink, mood = pose.mood;
  for (const s of [-1, 1]) {
    const ex = s * x;
    if (blink || mood === "squint") { line(ex - r, y, ex + r, y, color, 4); }
    else {
      circ(ex, y, r, color, null);
      circ(ex - r * 0.3, y - r * 0.35, r * 0.35, "#fff", null);
      if (mood === "sly") { g.fillStyle = pose.lid || "#fff"; g.fillRect(ex - r - 1, y - r - 2, 2 * r + 2, r * 0.95); line(ex - r - 2, y - r * 0.15, ex + r + 2, y - r * 0.15 + (s < 0 ? 3 : -3) * -1, INK, 3.5); }
    }
    if (mood === "grumpy") line(ex - s * r * 1.3, y - r * 2.2, ex + s * r * 1.1, y - r * 1.4, INK, 4);
    if (mood === "sly") line(ex - s * r * 1.3, y - r * 1.9, ex + s * r * 1.2, y - r * 1.2, INK, 4);
  }
}
function mouth(y, w, mood, open = false) {
  g.beginPath();
  if (mood === "grumpy") g.arc(0, y + w * 0.9, w, -Math.PI * 0.8, -Math.PI * 0.2);
  else if (mood === "sly") { g.moveTo(-w, y - 2); g.quadraticCurveTo(0, y + w * 0.8, w * 1.1, y - w * 0.4); }
  else g.arc(0, y - w * 0.4, w, Math.PI * 0.15, Math.PI * 0.85);
  g.strokeStyle = INK; g.lineWidth = 4; g.lineCap = "round"; g.stroke();
  if (open && mood !== "grumpy") { ell(0, y + w * 0.35, w * 0.45, w * 0.4, "#ff6f8a", 0, INK, 3); }
}

// ---------------------------------------------------------------- pet art
// Each pet is drawn front-on in its own coordinates (about 240 wide, body centre near y 35).
// back(): things behind the body, body(): fur, face(): drawn after the mud so eyes stay visible,
// paws(): drawn over the tub rim.
const ART = {
  dog: {
    back(p) {
      g.save(); g.translate(78, 48); g.rotate(-0.6 + Math.sin(p.t * (p.happy ? 16 : 7)) * 0.45);
      ell(0, -34, 13, 38, "#c98a3e"); g.restore();
    },
    body(p) {
      ell(0, 35, 92, 72, "#e8b46a");
      ell(0, 52, 52, 40, "#f7dcae", 0, null);
      ell(-58, -58, 22, 46, "#8a5a2b", 0.38);
      ell(58, -58, 22, 46, "#8a5a2b", -0.38);
      circ(0, -62, 64, "#e8b46a");
      ell(26, -82, 20, 18, "#d39a50", 0, null);
    },
    face(p) {
      ell(0, -36, 33, 24, "#f7dcae", 0, INK, 4);
      ell(0, -50, 12, 8, INK, 0, null);
      eyes(25, -76, 9, p);
      mouth(-30, 12, p.mood, p.mood === "happy" || p.mood === "sly");
    },
    paws() { ell(-44, 86, 24, 15, "#e8b46a"); ell(44, 86, 24, 15, "#e8b46a"); }
  },
  cat: {
    back(p) {
      g.save(); g.translate(62, 66);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(70, -20, 52, -110 + Math.sin(p.t * 3) * 8);
      g.strokeStyle = INK; g.lineCap = "round"; g.lineWidth = (p.tense ? 34 : 22) + 8; g.stroke();
      g.strokeStyle = "#f2a65a"; g.lineWidth = p.tense ? 34 : 22; g.stroke(); g.restore();
    },
    body(p) {
      ell(0, 38, 82, 70, "#f2a65a");
      ell(0, 52, 46, 40, "#ffe1bf", 0, null);
      const fl = p.tense ? 0.55 : 0;
      for (const s of [-1, 1]) {
        g.save(); g.translate(s * 36, -98); g.rotate(s * fl);
        poly([-s * 20, 18, s * 6, -38, s * 26, 14], "#f2a65a");
        poly([-s * 10, 10, s * 6, -22, s * 16, 10], "#ffb3c7", null);
        g.restore();
      }
      ell(0, -58, 64, 54, "#f2a65a");
      for (const x of [-14, 0, 14]) line(x, -108, x * 1.2, -94, "#d9822b", 5);
    },
    face(p) {
      if (p.blink) eyes(26, -66, 10, p);
      else for (const s of [-1, 1]) {
        ell(s * 26, -66, 11, p.tense ? 13 : 11, "#8be06a", 0, INK, 3.5);
        ell(s * 26, -66, 3.5, p.tense ? 10 : 8, INK, 0, null);
        if (p.mood === "grumpy" || p.tense) line(s * 40, -84, s * 14, -76, INK, 4);
        if (p.mood === "sly") { g.fillStyle = "#f2a65a"; g.fillRect(s * 26 - 12, -79, 24, 10); line(s * 26 - 13, -69, s * 26 + 13, -69, INK, 3.5); }
      }
      poly([-7, -48, 7, -48, 0, -40], "#ff8fb0", INK, 3);
      g.beginPath(); g.moveTo(-12, -32); g.quadraticCurveTo(-6, -26, 0, -36); g.quadraticCurveTo(6, -26, 12, -32);
      g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke();
      if (p.tense) ell(0, -27, 8, 6, "#ff6f8a", 0, INK, 3);
      for (const s of [-1, 1]) for (const dy of [-6, 4]) line(s * 22, -40 + dy, s * 62, -46 + dy * 1.8, INK, 2.5);
    },
    paws() { ell(-40, 86, 20, 13, "#f2a65a"); ell(40, 86, 20, 13, "#f2a65a"); }
  },
  bunny: {
    back() { circ(72, 60, 20, "#fff"); },
    body(p) {
      ell(0, 45, 78, 66, "#fbf7f2");
      for (const s of [-1, 1]) {
        g.save(); g.translate(s * 24, -82); g.rotate(s * (0.16 + Math.sin(p.t * 4 + s) * 0.06) + (p.hop ? -s * 0.35 : 0));
        ell(0, -50, 18, 56, "#fbf7f2"); ell(0, -46, 8, 42, "#ffb3c7", 0, null); g.restore();
      }
      ell(0, -40, 58, 52, "#fbf7f2");
      ell(-34, -24, 11, 7, "#ffc7d6", 0, null); ell(34, -24, 11, 7, "#ffc7d6", 0, null);
    },
    face(p) {
      eyes(22, -50, 9, p);
      ell(0, -30, 7, 5, "#ff8fb0", 0, INK, 3);
      line(0, -25, 0, -18, INK, 3);
      rrect(-7, -17, 14, 11, 2, "#fff", INK, 3); line(0, -17, 0, -6, INK, 2);
      if (p.mood === "grumpy") line(-12, -12, 12, -12, INK, 3);
    },
    paws() { ell(-36, 88, 18, 12, "#fbf7f2"); ell(36, 88, 18, 12, "#fbf7f2"); }
  },
  pig: {
    back(p) {
      g.save(); g.translate(98, 30); g.rotate(Math.sin(p.t * 5) * 0.2);
      g.beginPath(); for (let a = 0; a < 9; a += 0.2) { const r = 4 + a * 2.2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = "round"; g.stroke(); g.strokeStyle = "#ff9fbf"; g.lineWidth = 5; g.stroke(); g.restore();
    },
    body(p) {
      ell(0, 32, 104, 78, "#ffaac4");
      for (const s of [-1, 1]) { g.save(); g.translate(s * 48, -92); g.rotate(s * (0.4 + Math.sin(p.t * 3) * 0.05)); poly([-18, 14, 0, -24, 22, 12], "#ff8fb5"); g.restore(); }
      ell(0, -45, 72, 60, "#ffaac4");
    },
    face(p) {
      eyes(30, -64, 7, p);
      ell(0, -30, 30, 21, "#ff8fb5", 0, INK, 4);
      ell(-10, -30, 5, 8, "#b24d78", 0, null); ell(10, -30, 5, 8, "#b24d78", 0, null);
      mouth(-2, 14, p.mood);
    },
    paws() { ell(-50, 86, 22, 14, "#ffaac4"); ell(50, 86, 22, 14, "#ffaac4"); line(-50, 76, -50, 96, INK, 3); line(50, 76, 50, 96, INK, 3); }
  },
  // ten squirrels: body() draws the whole gang (each with its own mud), paws() the clean ones on the rim
  squirrel: {
    gang: true,
    back() {},
    body(p, spots) {
      const list = (spots || p.gang || []).filter(s => !s.perched).slice().sort((a, b) => a.y - b.y);
      for (const s of list) {
        g.save(); g.translate(s.x, s.y + (s.hopZ || 0));
        drawSquirrel(p, s);
        g.restore();
        if (s.stage < 3) { g.save(); g.translate(s.x, s.y + 4 + (s.hopZ || 0)); g.scale(0.7, 0.7); drawSpot({ ...s, x: 0, y: 0 }); g.restore(); }
        g.save(); g.translate(s.x, s.y + (s.hopZ || 0)); drawSquirrelFace(p, s); g.restore();
      }
    },
    face() {},
    paws(p, spots) {
      for (const s of (spots || p.gang || []).filter(s => s.perched)) {
        g.save(); g.translate(s.x, s.y + (s.hopZ || 0)); drawSquirrel(p, s); drawSquirrelFace({ ...p, mood: "happy" }, s); g.restore();
      }
    }
  },
  parrot: {
    back(p) {
      // long tail feathers and two flappy wings
      poly([-14, 70, 14, 70, 26, 150, 0, 170, -26, 150], "#2f8cff");
      line(0, 80, 0, 160, "#ff4d5e", 5);
      const fl = p.flying ? Math.sin(p.t * 26) * 0.9 : Math.sin(p.t * 3) * 0.08;
      for (const s of [-1, 1]) {
        g.save(); g.translate(s * 52, -4); g.rotate(s * (0.35 + fl) - (p.flying ? s * 0.6 : 0));
        ell(s * 22, 20, 26, 62, "#3fae4a"); ell(s * 24, 56, 16, 26, "#2f8cff", 0, null); g.restore();
      }
    },
    body(p) {
      ell(0, 30, 70, 74, "#5cc85a");
      ell(0, 44, 40, 48, "#b6f07a", 0, null);
      for (const a of [-0.45, 0, 0.45]) { g.save(); g.translate(0, -104); g.rotate(a); ell(0, -16, 10, 24, "#ff4d5e", 0, INK, 4); g.restore(); }
      circ(0, -58, 52, "#5cc85a");
      ell(0, -54, 36, 28, "#ffe36b", 0, null);
    },
    face(p) {
      eyes(22, -70, 8, p);
      ell(-34, -46, 9, 6, "#ff8fb0", 0, null); ell(34, -46, 9, 6, "#ff8fb0", 0, null);
      g.beginPath(); g.moveTo(-16, -52); g.quadraticCurveTo(0, -66, 16, -52); g.quadraticCurveTo(14, -26, 0, -18); g.quadraticCurveTo(-14, -26, -16, -52); g.closePath();
      g.fillStyle = "#ffb03b"; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
      if (p.mood !== "grumpy") ell(0, -30, 7, 5, "#e07a10", 0, INK, 2.5);
    },
    paws() { for (const s of [-1, 1]) { line(s * 26, 76, s * 26, 92, "#7a7f8f", 6); line(s * 26, 92, s * 38, 96, "#7a7f8f", 5); line(s * 26, 92, s * 14, 96, "#7a7f8f", 5); } }
  },
  hippo: {
    back(p) { g.save(); g.translate(100, 40); g.rotate(Math.sin(p.t * 6) * 0.4); line(0, 0, 18, -6, INK, 8); line(0, 0, 18, -6, "#a99bd6", 4); g.restore(); },
    body(p) {
      ell(0, 34, 108, 76, "#a99bd6");
      ell(0, 54, 64, 40, "#c9bff0", 0, null);
      for (const s of [-1, 1]) { ell(s * 50, -100, 13, 16, "#a99bd6", s * 0.3); ell(s * 50, -100, 6, 9, "#ffb3c7", s * 0.3, null); }
      ell(0, -64, 72, 50, "#a99bd6");
      // a big pink bow: Bubbles likes to look nice for bath time
      g.save(); g.translate(-30, -110); g.rotate(-0.3); poly([0, 0, -22, -12, -22, 12], "#ff6fae", INK, 3.5); poly([0, 0, 22, -12, 22, 12], "#ff6fae", INK, 3.5); circ(0, 0, 6, "#ff9fd0", INK, 3); g.restore();
    },
    face(p) {
      eyes(30, -84, 8, p);
      ell(0, -24, 84, 44, "#b8abe6", 0, INK, 5);
      for (const s of [-1, 1]) { ell(s * 28, -40, 8, 6, "#6a5aa0", 0, null); ell(s * 58, -14, 12, 8, "#ffb3c7", 0, null); }
      if (p.yawn) { ell(0, -8, 46, 22 * p.yawn + 4, "#ff6f8a", 0, INK, 4); rrect(-30, -16, 12, 10, 2, "#fff", INK, 2.5); rrect(18, -16, 12, 10, 2, "#fff", INK, 2.5); }
      else mouth(-2, 26, p.mood);
    },
    paws() { ell(-52, 88, 26, 15, "#a99bd6"); ell(52, 88, 26, 15, "#a99bd6"); }
  },
  octopus: {
    back(p) {
      for (let i = 0; i < 8; i++) {
        if (p.grab != null && i === 7) continue;
        const a = lerp(0.12, 0.88, i / 7) * Math.PI, w = Math.sin(p.t * 3 + i * 1.3) * 0.35;
        const x0 = Math.cos(a) * 40, y0 = 8 + Math.sin(a) * 14, x1 = Math.cos(a + w * 0.4) * 132, y1 = 34 + Math.sin(a) * 66;
        const cx = Math.cos(a + w) * 96, cy = 10 + Math.sin(a + w) * 36;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.lineCap = "round";
        g.strokeStyle = INK; g.lineWidth = 26; g.stroke(); g.strokeStyle = "#ff8a7a"; g.lineWidth = 18; g.stroke();
        circ(lerp(cx, x1, 0.5), lerp(cy, y1, 0.5) + 4, 3.5, "#ffd0c8", null);
      }
      if (p.grab != null) {
        // one arm waves the tool it stole high over its head
        const wv = Math.sin(p.t * 9) * 10;
        g.beginPath(); g.moveTo(60, -10); g.quadraticCurveTo(150, -40, 120 + wv, -150); g.lineCap = "round";
        g.strokeStyle = INK; g.lineWidth = 26; g.stroke(); g.strokeStyle = "#ff8a7a"; g.lineWidth = 18; g.stroke();
        g.save(); g.translate(120 + wv, -165); g.rotate(Math.sin(p.t * 9) * 0.3); drawToolIcon(p.grab); g.restore();
      }
    },
    body(p) {
      ell(0, -44, 84, 74, "#ff8a7a");
      for (const [x, y, r] of [[-40, -88, 9], [30, -96, 7], [52, -62, 6], [-56, -40, 6]]) circ(x, y, r, "#ffb4a8", null);
    },
    face(p) {
      for (const s of [-1, 1]) { circ(s * 28, -40, 15, "#fff", INK, 4); circ(s * 28 + (p.grab != null ? 4 : 0), -38, 7, INK, null); circ(s * 28 - 2, -42, 2.5, "#fff", null); }
      if (p.mood === "grumpy") for (const s of [-1, 1]) line(s * 44, -64, s * 14, -58, INK, 4);
      ell(-48, -14, 10, 6, "#ff5f7f", 0, null); ell(48, -14, 10, 6, "#ff5f7f", 0, null);
      if (p.grab != null) mouth(-8, 12, "sly"); else ell(0, -10, 8, p.mood === "happy" ? 8 : 5, "#c4424f", 0, INK, 3);
    },
    paws(p) {
      for (const s of [-1, 1]) {
        const w = Math.sin(p.t * 2.5 + s) * 8;
        g.beginPath(); g.moveTo(s * 70, 50); g.quadraticCurveTo(s * 110, 70, s * 104 + w, 104); g.lineCap = "round";
        g.strokeStyle = INK; g.lineWidth = 22; g.stroke(); g.strokeStyle = "#ff8a7a"; g.lineWidth = 15; g.stroke();
      }
    }
  },
  duck: {
    back() {},
    body(p) {
      const fl = p.flap ? Math.sin(p.t * 30) * 0.5 : Math.sin(p.t * 3) * 0.08;
      for (const s of [-1, 1]) { g.save(); g.translate(s * 74, 18); g.rotate(s * (0.35 + fl)); ell(s * 8, 18, 28, 46, "#f2b705"); g.restore(); }
      ell(0, 42, 92, 68, "#ffd93b");
      ell(0, -62, 56, 52, "#ffd93b");
      for (const a of [-0.5, 0, 0.5]) { g.save(); g.translate(0, -110); g.rotate(a); ell(0, -10, 6, 14, "#ffd93b", 0, INK, 4); g.restore(); }
    },
    face(p) {
      eyes(22, -74, 8, p);
      // the monocle: Sir Quackers is very proper
      circ(22, -74, 15, null, "#c9a227", 3.5);
      g.beginPath(); g.moveTo(35, -66); g.quadraticCurveTo(46, -40, 38, -18); g.strokeStyle = "#c9a227"; g.lineWidth = 2.5; g.stroke();
      ell(0, -44, 36, 13, "#ff8c1a", 0, INK, 4);
      ell(0, -36, 28, 8, "#e86f00", 0, INK, 3);
      // a tiny sailor hat
      g.save(); g.translate(-16, -112); g.rotate(-0.25);
      rrect(-20, -6, 40, 14, 6, "#fff", INK, 3.5); rrect(-14, -16, 28, 12, 4, "#fff", INK, 3.5); line(-18, 2, 18, 2, "#2f8cff", 3); g.restore();
    },
    paws() {}
  }
};

function drawSpot(s, k = 1) {
  const st = s.stage;
  if (st >= 3) return;
  const f = 0.55 + 0.45 * (s.hp / HP[st]);
  g.save(); g.translate(s.x, s.y);
  if (st === 0) {
    for (const b of s.blobs) circ(b[0] * f, b[1] * f, b[2] * f * 1.25, "#6e4423", null);
    for (const b of s.blobs) circ(b[0] * f * 0.8 - 2, b[1] * f * 0.8 - 2, b[2] * f * 0.7, "#8a5a33", null);
    circ(-6 * f, -5 * f, 3, "#a87447", null);
  } else if (st === 1) {
    for (const b of s.blobs) circ(b[0] * f, b[1] * f, b[2] * f * 1.15, "#fff", "#9fdcff", 2.5);
    for (const b of s.blobs) circ(b[0] * f - 3, b[1] * f - 3, b[2] * f * 0.28, "#dff4ff", null);
  } else {
    g.globalAlpha = 0.45; ell(0, 0, 26 * f, 20 * f, "#2f8cff", 0, null); g.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 12 * f, dy = Math.sin(now * 3 + s.wob + i) * 3 + (i === 1 ? 6 : 0);
      poly([dx, dy - 9, dx + 5, dy + 1, dx, dy + 5, dx - 5, dy + 1], "#5fb8ff", "#2a6fd6", 2);
    }
  }
  g.restore();
}

function drawPet(id, pose, spots, layer = "all") {
  const A = ART[id];
  if (A.gang) {
    if (!spots && !pose.gang) pose.gang = makeSpots(PET[id]).map(s => ({ ...s, stage: 3 }));
    if (layer !== "paws") A.body(pose, spots);
    if (layer !== "body") A.paws(pose, spots);
    return;
  }
  if (layer !== "paws") {
    A.back(pose);
    A.body(pose);
    if (spots) for (const s of spots) drawSpot(s);
    if (pose.wet > 0.01) { g.globalAlpha = pose.wet * 0.25; ell(0, 0, 110, 150, "#2f8cff", 0, null); g.globalAlpha = 1; }
    A.face(pose);
  }
  if (layer !== "body") A.paws(pose);
}
// one squirrel, about 60 wide, body centred on (0, 0), facing s.face
function drawSquirrel(p, s) {
  const f = s.face || 1, t = p.t + (s.wob || 0), lw = 3.5;
  g.save(); g.translate(-f * 22, -16); g.rotate(-f * (0.35 + Math.sin(t * 5) * 0.12));
  ell(0, 0, 15, 32, "#a8683c", 0, INK, lw); ell(0, -4, 8, 22, "#c98a55", 0, null); g.restore();
  ell(0, 0, 19, 23, "#c98a55", 0, INK, lw);
  ell(0, 5, 11, 15, "#f3d6b0", 0, null);
  for (const e of [-1, 1]) poly([e * 4, -38, e * 12, -50, e * 15, -36], "#c98a55", INK, 3);
  circ(0, -28, 15, "#c98a55", INK, lw);
  ell(-8, 18, 7, 5, "#a8683c", 0, INK, 2.5); ell(8, 18, 7, 5, "#a8683c", 0, INK, 2.5);
}
function drawSquirrelFace(p, s) {
  const f = s.face || 1, mood = s.stage >= 3 ? "happy" : p.mood;
  for (const e of [-1, 1]) { circ(e * 6 + f * 2, -31, 3.2, INK, null); circ(e * 6 + f * 2 - 1, -32.5, 1.1, "#fff", null); }
  if (mood === "grumpy") for (const e of [-1, 1]) line(e * 10 + f * 2, -38, e * 3 + f * 2, -36, INK, 2);
  circ(f * 3, -24, 2.6, INK, null);
  rrect(f * 3 - 3.5, -21, 7, 5, 1, "#fff", INK, 1.5);
  if (mood === "happy") { g.beginPath(); g.arc(f * 3, -22, 5, 0.2, Math.PI - 0.2); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); }
}
// the soap, shower head or towel, drawn about 50 wide at (0, 0)
function drawToolIcon(t) {
  if (t === 0) { rrect(-24, -16, 48, 32, 10, "#ffe36b", INK, 3.5); circ(-8, -3, 4, "#e0b92c", null); circ(8, 5, 5, "#e0b92c", null); }
  else if (t === 1) { poly([-20, -8, 20, -8, 28, 8, -28, 8], "#c9d3e6", INK, 3.5); rrect(-5, -36, 10, 30, 4, "#9aa6c2", INK, 3); }
  else { rrect(-26, -18, 52, 36, 7, "#ff8fc0", INK, 3.5); line(-26, 8, 26, 8, INK, 2.5); }
}

function petPose(r) {
  const prog = r ? washProgress(r) : 0.5;
  const blink = (Math.sin(now * 0.9 + 1.3) > 0.985);
  const b = r && r.b;
  return { t: now, blink, mood: prog > 0.95 ? "happy" : prog > 0.4 ? "ok" : "grumpy", tense: b && b.tense > 0, flap: b && b.flap > 0, hop: b && b.hopping > 0, happy: prog > 0.95, wet: 0,
           flying: b && b.state !== undefined && b.state !== "sit", yawn: b && b.yawn > 0 ? Math.sin(Math.PI * clamp(b.yawn / 1.4, 0, 1)) : 0, grab: b && b.snatchT > 0 ? b.snatched : null };
}

// ---------------------------------------------------------------- particles
function puff(x, y, type, n, opt = {}) {
  for (let i = 0; i < n; i++) {
    const a = opt.angle != null ? opt.angle + rnd(-1, 1) * (opt.spread || 0.6) : rnd(0, TAU);
    const sp = rnd(opt.min || 30, opt.max || 140);
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(0.5, opt.life || 1.1), type, r: rnd(opt.rmin || 3, opt.rmax || 8), c: opt.color });
  }
  if (particles.length > 500) particles.splice(0, particles.length - 500);
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.max) { particles.splice(i, 1); continue; }
    if (p.type === "bubble") { p.vy -= 40 * dt; p.vx *= 0.97; p.x += Math.sin(p.life * 6 + p.r) * 0.6; }
    else if (p.type === "drop" || p.type === "mud") p.vy += 600 * dt;
    else if (p.type === "fluff") { p.vy += 60 * dt; p.vx *= 0.95; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}
function drawParticles() {
  for (const p of particles) {
    const a = 1 - p.life / p.max;
    g.globalAlpha = Math.min(1, a * 1.6);
    if (p.type === "bubble") { circ(p.x, p.y, p.r, "rgba(255,255,255,0.75)", "#7fd4ff", 1.5); circ(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, "#fff", null); }
    else if (p.type === "drop") circ(p.x, p.y, p.r * 0.6, p.c || "#4aa8ff", null);
    else if (p.type === "mud") circ(p.x, p.y, p.r * 0.7, "#6e4423", null);
    else if (p.type === "fluff") circ(p.x, p.y, p.r * 0.6, p.c || "#ffc1dc", null);
    else if (p.type === "spark") {
      const r = p.r * (0.6 + a);
      poly([p.x, p.y - r, p.x + r * 0.3, p.y - r * 0.3, p.x + r, p.y, p.x + r * 0.3, p.y + r * 0.3, p.x, p.y + r, p.x - r * 0.3, p.y + r * 0.3, p.x - r, p.y, p.x - r * 0.3, p.y - r * 0.3], p.c || "#ffe36b", null);
    } else if (p.type === "ring") {
      g.beginPath(); g.ellipse(p.x, p.y, p.r * (1 + p.life * 5), p.r * 0.5 * (1 + p.life * 5), 0, 0, TAU); g.strokeStyle = "#8fd8ff"; g.lineWidth = 3; g.stroke();
    }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- tips
function showTip(text, dur = 1.6) {
  const el = $("tip"); el.textContent = text; el.classList.remove("fade"); tipTimer = dur;
}

// ================================================================= ROUND 1: WASH
function startWash(i) {
  const pet = PETS[i];
  round = { kind: "wash", i, pet, total: pet.washTime, time: pet.washTime, t: 0, spots: makeSpots(pet),
            off: { x: 0, y: 0, rot: 0 }, b: { tense: 0, flap: 0, hopping: 0 }, tool: 0, over: false, endT: 0,
            prevLocal: null, scrubSound: 0, hintT: 0, remuds: 0, rinseHit: false, wrongT: 0, cleaned: 0 };
  setTool(0); markSnatched(-1);
  mode = "wash"; paused = false;
  showHud(true); $("tools").hidden = false;
  showTip(pet.flyer ? "Tap Pickles to catch him!" : pet.gang ? "Scrub ALL the squirrels!" : "Scrub off the mud!", 1.8);
  Sound.startMusic("wash");
  updateHud();
}
function washProgress(r) {
  let d = 0;
  for (const s of r.spots) d += s.stage + (s.stage < 3 ? 1 - s.hp / HP[s.stage] : 0);
  return d / (3 * r.spots.length);
}
function petTransform(r, L) {
  const T = { x: L.cx + r.off.x * L.sway * L.k, y: L.baseY + r.off.y * L.k, rot: r.off.rot, k: L.k };
  const b = r.b;
  if (r.pet.flyer && b.state && b.state !== "sit") {
    const F = { x: b.fx, y: b.fy, rot: Math.sin(r.t * 4) * 0.15 + clamp(b.fvx || 0, -400, 400) / 1600, k: L.k * 0.5 };
    if (b.state === "fly") return F;
    const q = ease(clamp(b.rt / 0.35, 0, 1));   // gliding back to the tub
    return { x: lerp(F.x, T.x, q), y: lerp(F.y, T.y, q), rot: lerp(F.rot, T.rot, q), k: lerp(F.k, T.k, q) };
  }
  return T;
}
const flying = r => r.pet.flyer && r.b.state !== "sit";
function toLocal(T, x, y) {
  const dx = (x - T.x) / T.k, dy = (y - T.y) / T.k, c = Math.cos(-T.rot), s = Math.sin(-T.rot);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}
function toWorld(T, x, y) {
  const c = Math.cos(T.rot), s = Math.sin(T.rot);
  return { x: T.x + (x * c - y * s) * T.k, y: T.y + (x * s + y * c) * T.k };
}
function neededTool(r) {
  const n = [0, 0, 0];
  for (const s of r.spots) if (s.stage < 3) n[s.stage]++;
  if (!n[0] && !n[1] && !n[2]) return -1;
  return n.indexOf(Math.max(...n));
}
function setTool(t) {
  if (round && round.kind === "wash") {
    const b = round.b;
    if (b.snatchT > 0 && b.snatched === t) { showTip(`Inky has your ${TOOL_NAMES[t]}!`, 1); return; }
    round.tool = t;
  }
  for (let i = 0; i < 3; i++) $("tool-" + i).classList.toggle("on", i === t);
}
function markSnatched(t) { for (let i = 0; i < 3; i++) $("tool-" + i).classList.toggle("gone", i === t); }

const WASH_MOVES = {
  dog(r, dt) {
    const b = r.b;
    if (b.shakeT == null) b.shakeT = 4.5;
    r.off.x = Math.sin(r.t * 1.3) * 28; r.off.y = Math.sin(r.t * 2.6) * 4; r.off.rot = Math.sin(r.t * 1.7) * 0.06;
    b.shakeT -= dt;
    if (b.shakeT <= 0) { b.shaking = 1.0; b.shakeT = 5.5 + rnd(0, 2); sfx("bark"); showTip("Big shake!", 1); }
    if (b.shaking > 0) {
      b.shaking -= dt;
      r.off.rot += Math.sin(r.t * 42) * 0.2; r.off.x += Math.sin(r.t * 37) * 9;
      if (Math.random() < dt * 30) { const L = washLayout(), T = petTransform(r, L); puff(T.x + rnd(-90, 90) * L.k, T.y + rnd(-60, 40) * L.k, "drop", 1, { min: 120, max: 260, rmin: 4, rmax: 7 }); }
    }
  },
  cat(r, dt) {
    const b = r.b;
    if (b.side == null) { b.side = 1; b.annoy = 0; b.climbT = 4.5; b.climbing = 0; }
    if (r.rinseHit) b.annoy += dt; else b.annoy = Math.max(0, b.annoy - dt * 0.5);
    if (b.annoy > 0.75) { b.side *= -1; b.annoy = 0; b.tense = 1.3; sfx("hiss"); showTip("HISSS!", 0.9); }
    if (b.tense > 0) b.tense -= dt;
    const target = b.side * 48 + Math.sin(r.t * 1.6) * 14;
    r.off.x = lerp(r.off.x, target, 1 - Math.exp(-dt * (b.tense > 0 ? 12 : 2.5)));
    b.climbT -= dt;
    if (b.climbT <= 0) { b.climbing = 1.3; b.climbT = 5 + rnd(0, 2.5); sfx("meow"); showTip("She's escaping!", 1); }
    if (b.climbing > 0) { b.climbing -= dt; const p = 1 - b.climbing / 1.3; r.off.y = -Math.sin(Math.PI * p) * 42; r.off.rot = Math.sin(Math.PI * p) * 0.25 * b.side; }
    else { r.off.y = Math.sin(r.t * 2) * 3; r.off.rot = Math.sin(r.t * 1.4) * 0.05; }
  },
  bunny(r, dt) {
    const b = r.b;
    if (b.hopT == null) { b.hopT = 1.2; b.hopping = 0; b.from = 0; b.to = 0; }
    b.hopT -= dt;
    if (b.hopT <= 0 && b.hopping <= 0) {
      b.hopping = 0.42; b.from = r.off.x;
      do b.to = rnd(-82, 82); while (Math.abs(b.to - b.from) < 45);
      b.hopT = rnd(1.4, 2.1); sfx("squeak");
    }
    if (b.hopping > 0) {
      b.hopping -= dt; const p = clamp(1 - b.hopping / 0.42, 0, 1);
      r.off.x = lerp(b.from, b.to, ease(p)); r.off.y = -Math.sin(Math.PI * p) * 62; r.off.rot = (b.to - b.from) * 0.002 * Math.sin(Math.PI * p);
      if (b.hopping <= 0) { const L = washLayout(); puff(L.cx + r.off.x * L.sway * L.k, L.rimY, "drop", 8, { angle: -Math.PI / 2, spread: 1.2, min: 100, max: 240 }); }
    } else { r.off.y = Math.sin(r.t * 9) * 2; r.off.rot = Math.sin(r.t * 5) * 0.03; }
  },
  pig(r, dt) {
    const b = r.b;
    if (b.rollT == null) { b.rollT = 6; b.rolling = 0; }
    r.off.x = Math.sin(r.t * 0.9) * 22; r.off.y = Math.sin(r.t * 1.8) * 3; r.off.rot = Math.sin(r.t * 1.1) * 0.05;
    b.rollT -= dt;
    if (b.rollT <= 0 && r.remuds < 4) { b.rolling = 0.9; b.rollT = 6.5 + rnd(0, 1.5); b.mudded = false; sfx("oink"); }
    if (b.rolling > 0) {
      b.rolling -= dt; const p = 1 - b.rolling / 0.9;
      r.off.rot += Math.sin(p * Math.PI * 2) * 0.35; r.off.y -= Math.sin(p * Math.PI) * 14;
      if (p > 0.5 && !b.mudded) {
        b.mudded = true;
        const cands = r.spots.filter(s => s.stage > 0);
        cands.sort((a, c) => c.stage - a.stage);
        const s = cands[0];
        if (s) {
          s.stage = 0; s.hp = HP[0]; r.remuds++;
          const L = washLayout(), w = toWorld(petTransform(r, L), s.x, s.y);
          puff(w.x, w.y, "mud", 14, { min: 60, max: 200 });
          showTip("Splosh! More mud!", 1.2);
        }
      }
    }
  },
  // ten squirrels scurry about; every few seconds the whole gang scrambles. Clean ones hop up on the rim.
  squirrel(r, dt) {
    const b = r.b;
    if (b.scrambleT == null) { b.scrambleT = 5; b.scramble = 0; b.chitT = 1.5; }
    r.off.x = 0; r.off.y = 0; r.off.rot = 0;
    b.scrambleT -= dt;
    if (b.scrambleT <= 0) { b.scramble = 1.1; b.scrambleT = rnd(5.5, 7); sfx("chitter"); showTip("Squirrel scramble!", 1); for (const s of r.spots) s.next = 0; }
    if (b.scramble > 0) b.scramble -= dt;
    b.chitT -= dt; if (b.chitT <= 0) { b.chitT = rnd(1.5, 3); sfx("chitter"); }
    let perch = 0;
    for (const s of r.spots) {
      if (s.stage >= 3) {
        if (!s.perched) { r.perchN = r.perchN || 0; s.perched = true; s.px = -150 + (r.perchN % 10) * 33; s.py = 114; r.perchN++; s.jt = 0; s.jx = s.x; s.jy = s.y; sfx("squeak"); }
        s.jt = Math.min(1, s.jt + dt / 0.5);
        s.x = lerp(s.jx, s.px, s.jt); s.y = lerp(s.jy, s.py, s.jt); s.hopZ = -Math.sin(Math.PI * s.jt) * 50 - Math.abs(Math.sin(r.t * 6 + s.sq)) * 4;
        perch++;
        continue;
      }
      s.next = (s.next == null ? rnd(0.5, 2) : s.next) - dt;
      if (s.next <= 0) { s.tx = clamp(s.hx + rnd(-46, 46), -128, 128); s.ty = clamp(s.hy + rnd(-16, 12), -6, 58); s.next = rnd(1.2, 2.6); }
      const sp = b.scramble > 0 ? 190 : 46, dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (d > 1) { const st = Math.min(d, sp * dt); s.x += dx / d * st; s.y += dy / d * st; if (Math.abs(dx) > 3) s.face = dx > 0 ? 1 : -1; }
      s.hopZ = -Math.abs(Math.sin(r.t * (b.scramble > 0 ? 18 : 9) + s.sq)) * (d > 2 ? 6 : 1.5);
    }
  },
  // Pickles flies around the bathroom: tap him to catch him, and he sits still for a few seconds
  parrot(r, dt) {
    const b = r.b, L = washLayout();
    if (b.state == null) { b.state = "fly"; b.ft = rnd(0, 6); b.sitT = 0; b.rt = 0; b.catches = 0; b.talkT = 2.5; }
    const top = hudTop() + 70, bot = H - Math.max(70 / U, toolBottom()) - 60;
    const ax = Math.min(W / 2 - 70, 250), cx = W / 2, cy = (top + bot) / 2, ay = Math.max(30, (bot - top) / 2);
    if (b.state === "fly") {
      b.ft += dt;
      const nx = cx + Math.sin(b.ft * 0.95) * ax, ny = cy + Math.sin(b.ft * 1.7 + 0.6) * ay;
      b.fvx = b.fx == null ? 0 : (nx - b.fx) / Math.max(dt, 1e-4);
      b.fx = nx; b.fy = ny;
      b.talkT -= dt;
      if (b.talkT <= 0) { b.talkT = rnd(3, 4.5); sfx("squawk"); showTip(["SQUAWK! No baths!", "Pretty bird! Dirty bird!", "Catch me if you can!", "Polly wants a cracker, not a BATH!"][Math.floor(rnd(0, 4))], 1.3); }
      const T = petTransform(r, L);
      if (ptr.down && !r.over && Math.hypot(ptr.x - T.x, ptr.y - (T.y - 10 * T.k)) < Math.max(70, 120 * T.k)) {
        b.state = "return"; b.rt = 0; b.catches++; sfx("squawk"); showTip("Gotcha! Scrub quick!", 1.1);
      }
    } else if (b.state === "return") {
      b.rt += dt;
      if (b.rt >= 0.35) { b.state = "sit"; b.sitT = b.catches === 1 ? 6 : 4.8; }
    } else {
      b.sitT -= dt;
      r.off.x = Math.sin(r.t * 2.2) * 16; r.off.y = Math.sin(r.t * 5) * 3; r.off.rot = Math.sin(r.t * 3) * 0.06;
      if (b.sitT <= 0 && !r.over) { b.state = "fly"; b.ft = rnd(0, 6); b.fx = null; sfx("squawk"); showTip("He flew off! Catch him again!", 1.3); r.prevLocal = null; }
    }
  },
  // Bubbles sinks under the water now and then: the spots below the rim are out of reach
  hippo(r, dt) {
    const b = r.b;
    if (b.sinkT == null) { b.sinkT = 4; b.under = 0; b.yawnT = 2.5; b.yawn = 0; b.depth = 0; }
    b.sinkT -= dt;
    if (b.sinkT <= 0 && b.under <= 0) { b.under = 2.3; b.sinkT = rnd(5.5, 7); sfx("hrumph"); showTip("Glub glub... she sank!", 1.2); }
    if (b.under > 0) {
      b.under -= dt;
      if (Math.random() < dt * 8) { const L = washLayout(); puff(L.cx + rnd(-90, 90) * L.k, L.rimY - 6, "bubble", 1, { angle: -Math.PI / 2, spread: 0.4, min: 30, max: 90, rmin: 5, rmax: 12, life: 1.4 }); if (Math.random() < 0.4) sfx("blub"); }
      if (b.under <= 0) { const L = washLayout(); puff(L.cx, L.rimY - 10, "drop", 22, { angle: -Math.PI / 2, spread: 1.3, min: 160, max: 340, rmin: 4, rmax: 8 }); sfx("splash"); showTip("FWOOSH! She's back up!", 1); }
    }
    b.depth = lerp(b.depth, b.under > 0 ? 1 : 0, 1 - Math.exp(-dt * 7));
    b.yawnT -= dt;
    if (b.yawnT <= 0 && b.under <= 0) { b.yawn = 1.4; b.yawnT = rnd(5, 8); sfx("hrumph"); }
    if (b.yawn > 0) b.yawn -= dt;
    r.off.x = Math.sin(r.t * 0.8) * 18; r.off.y = Math.sin(r.t * 1.6) * 3 + b.depth * 112; r.off.rot = Math.sin(r.t * 1.1) * 0.04;
  },
  // Inky's arms keep grabbing the tool you're holding; use another one until he gives it back
  octopus(r, dt) {
    const b = r.b;
    if (b.grabT == null) { b.grabT = 3.5; b.snatchT = 0; b.snatched = null; }
    r.off.x = Math.sin(r.t * 1.1) * 30; r.off.y = Math.sin(r.t * 2.2) * 6; r.off.rot = Math.sin(r.t * 1.4) * 0.07;
    if (b.snatchT > 0) {
      b.snatchT -= dt;
      if (b.snatchT <= 0) { sfx("blorp"); showTip(`Inky gave the ${TOOL_NAMES[b.snatched]} back!`, 1); b.snatched = null; markSnatched(-1); }
    } else {
      b.grabT -= dt;
      if (b.grabT <= 0 && !r.over) {
        b.snatched = r.tool; b.snatchT = 2.6; b.grabT = rnd(4.5, 6);
        sfx("grab"); showTip(`Inky grabbed your ${TOOL_NAMES[r.tool]}!`, 1.4); markSnatched(r.tool);
      }
    }
  },
  duck(r, dt) {
    const b = r.b;
    r.off.x = Math.sin(r.t * 1.25) * 80; r.off.y = Math.sin(r.t * 2.5) * 8; r.off.rot = Math.cos(r.t * 1.25) * 0.13;
    if (b.flap > 0) { b.flap -= dt; r.off.y -= 6; }
    if (b.quackT == null) b.quackT = 2;
    b.quackT -= dt; if (b.quackT <= 0) { b.quackT = rnd(2.5, 4); sfx("quack"); }
  }
};

function updateWash(dt) {
  const r = round;
  r.t += dt;
  if (!r.over) { r.time -= dt; if (r.time <= 0) { r.time = 0; endWash(false); } }
  r.rinseHit = false;
  const L = washLayout();
  let T = petTransform(r, L);
  // scrubbing
  let scrubbing = false, wrong = -1;
  if (ptr.down && !r.over) {
    const lp = toLocal(T, ptr.x, ptr.y);
    let moved = 0;
    if (r.prevLocal) moved = Math.min(70, Math.hypot(lp.x - r.prevLocal.x, lp.y - r.prevLocal.y));
    r.prevLocal = lp;
    const tool = r.tool;
    const hold = [50, 230, 80][tool];
    let eff = 1;
    if (r.pet.id === "duck" && tool === 1) eff = 2;
    if (r.pet.id === "cat" && tool === 1) eff = 0.85;
    if (r.b.snatchT > 0 && r.b.snatched === tool) eff = 0;      // Inky has it
    if (flying(r)) eff = 0;                                      // catch Pickles first
    const work = (moved + dt * hold) * eff;
    const reach = tool === 1 ? 50 : 44;
    for (const s of r.spots) {
      if (s.stage >= 3 || !eff) continue;
      if (r.b.depth > 0.5 && s.y > -40) continue;                // under the water
      if (Math.hypot(lp.x - s.x, lp.y - s.y) > reach) continue;
      if (s.stage === tool) {
        s.hp -= work; scrubbing = true;
        if (tool === 1) r.rinseHit = true;
        if (s.hp <= 0) advanceSpot(r, s, T);
      } else wrong = s.stage;
    }
    if (tool === 0 && moved > 1 && Math.random() < 0.6) puff(ptr.x, ptr.y, "bubble", 1, { min: 10, max: 60, rmin: 3, rmax: 9, life: 1.4 });
    if (tool === 2 && moved > 2 && Math.random() < 0.3) puff(ptr.x, ptr.y, "fluff", 1, { min: 10, max: 50 });
    if (tool === 0 && scrubbing && r.pet.id === "duck") r.b.flap = 0.3;
    if (scrubbing && moved > 1.5) { r.scrubSound -= dt; if (r.scrubSound <= 0) { r.scrubSound = 0.09; if (tool !== 1) sfx("scrub"); } }
  } else r.prevLocal = null;
  // the rinse shower sprays whether or not it hits
  Sound.loop("rinse", ptr.down && !r.over && r.tool === 1 && !paused, 2200, 0.1);
  if (ptr.down && r.tool === 1 && !r.over && Math.random() < 0.8) puff(ptr.x + rnd(-8, 8), ptr.y + rnd(-6, 6), "drop", 1, { angle: Math.PI / 2, spread: 0.9, min: 40, max: 120, rmin: 3, rmax: 6, life: 0.6 });
  // a hint when you're using the wrong tool
  if (wrong >= 0 && !scrubbing) { r.wrongT += dt; if (r.wrongT > 0.35 && r.hintT <= 0) { showTip(`That spot needs ${TOOL_NAMES[wrong]}! (${wrong + 1})`, 1.4); r.hintT = 2.2; r.wrongT = 0; } }
  else r.wrongT = Math.max(0, r.wrongT - dt);
  r.hintT -= dt;
  // the pet wriggles
  WASH_MOVES[r.pet.id](r, dt);
  // pulse the tool you need next
  const need = neededTool(r);
  for (let i = 0; i < 3; i++) $("tool-" + i).classList.toggle("want", i === need);
  // all clean?
  if (!r.over && r.spots.every(s => s.stage >= 3)) endWash(true);
  if (r.over) { r.endT -= dt; if (r.done) { if (Math.random() < 0.5) { T = petTransform(r, L); puff(T.x + rnd(-100, 100) * L.k, T.y + rnd(-120, 60) * L.k, "spark", 1, { min: 5, max: 40, rmin: 6, rmax: 12 }); } } if (r.endT <= 0) finishRound(); }
  updateHud();
}
function advanceSpot(r, s, T) {
  const w = toWorld(T, s.x, s.y);
  s.stage++;
  if (s.stage < 3) s.hp = HP[s.stage];
  if (s.stage === 1) { sfx("bubble"); puff(w.x, w.y, "bubble", 8, { min: 20, max: 90, rmin: 4, rmax: 10, life: 1.4 }); }
  else if (s.stage === 2) { sfx("splash"); puff(w.x, w.y, "drop", 8, { min: 60, max: 160 }); }
  else { r.cleaned++; sfx("sparkle"); puff(w.x, w.y, "spark", 6, { min: 30, max: 110, rmin: 5, rmax: 10 }); }
}
function endWash(done) {
  const r = round;
  if (r.over) return;
  r.over = true; r.done = done; r.endT = done ? 1.4 : 1.2;
  Sound.loop("rinse", false);
  if (done) { sfx("win"); showTip("Squeaky clean!", 1.4); sfx(r.pet.voice); }
  if (r.b.snatchT > 0) { r.b.snatchT = 0; r.b.snatched = null; markSnatched(-1); }
  else { sfx("soaked"); showTip("Time's up!", 1.4); }
}

function drawBathroom(L) {
  g.fillStyle = "#bfe9ff"; g.fillRect(0, 0, W, H);
  const t = 44;
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 3;
  for (let x = (W / 2) % t; x < W; x += t) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L.floorY); g.stroke(); }
  for (let y = L.floorY % t; y < L.floorY; y += t) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // a stripe of pink tiles
  g.fillStyle = "#ffc1dc"; g.fillRect(0, L.baseY - 150 * L.k, W, 18 * L.k);
  // window on the left, towel rack on the right
  const wx = L.cx - 300 * L.k, wy = L.baseY - 120 * L.k;
  if (wx > -60) {
    rrect(wx - 55 * L.k, wy - 60 * L.k, 110 * L.k, 100 * L.k, 12 * L.k, "#e9fbff", INK, 4);
    line(wx, wy - 60 * L.k, wx, wy + 40 * L.k, INK, 3); line(wx - 55 * L.k, wy - 10 * L.k, wx + 55 * L.k, wy - 10 * L.k, INK, 3);
    circ(wx + 26 * L.k, wy - 38 * L.k, 12 * L.k, "#ffe36b", null);
  }
  const rx = L.cx + 300 * L.k;
  if (rx < W + 60) {
    line(rx - 60 * L.k, L.baseY - 60 * L.k, rx + 60 * L.k, L.baseY - 60 * L.k, "#9aa6c2", 7);
    rrect(rx - 45 * L.k, L.baseY - 62 * L.k, 90 * L.k, 120 * L.k, 8 * L.k, "#ff8fc0", INK, 4);
    for (let i = 0; i < 3; i++) line(rx - 35 * L.k, L.baseY + (-30 + i * 20) * L.k, rx + 35 * L.k, L.baseY + (-30 + i * 20) * L.k, "#fff", 2);
  }
  // floor
  g.fillStyle = "#f6e3c4"; g.fillRect(0, L.floorY, W, H - L.floorY);
  g.strokeStyle = "rgba(160,120,80,0.25)"; g.lineWidth = 2;
  for (let x = (W / 2) % 60; x < W; x += 60) { g.beginPath(); g.moveTo(x, L.floorY); g.lineTo(x + 30, H); g.stroke(); }
  line(0, L.floorY, W, L.floorY, INK, 3);
  ell(L.cx, L.bottom + 18 * L.k, 230 * L.k, 22 * L.k, "#ff9fd0", 0, INK, 3);
}
function drawTubBack(L) {
  ell(L.cx, L.rimY, L.tubW, 26 * L.k, "#e6f4ff", 0, INK, 5);
  ell(L.cx, L.rimY + 3 * L.k, L.tubW - 14 * L.k, 18 * L.k, "#7cc8f2", 0, null);
}
function drawTubFront(L) {
  const x0 = L.cx - L.tubW, x1 = L.cx + L.tubW, y0 = L.rimY, y1 = L.bottom, k = L.k;
  for (const s of [-1, 1]) ell(L.cx + s * (L.tubW - 40 * k), y1 + 8 * k, 16 * k, 12 * k, "#ffd23f", 0, INK, 4);
  g.beginPath();
  g.moveTo(x0, y0); g.lineTo(x0 + 14 * k, y1 - 40 * k); g.quadraticCurveTo(x0 + 26 * k, y1, x0 + 70 * k, y1);
  g.lineTo(x1 - 70 * k, y1); g.quadraticCurveTo(x1 - 26 * k, y1, x1 - 14 * k, y1 - 40 * k); g.lineTo(x1, y0); g.closePath();
  g.fillStyle = "#ffffff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
  g.globalAlpha = 0.5; rrect(x0 + 30 * k, y0 + 18 * k, 26 * k, 50 * k, 12 * k, "#dff1ff", null); g.globalAlpha = 1;
  line(x0 - 4 * k, y0, x1 + 4 * k, y0, INK, 14 * k + 4);
  line(x0 - 2 * k, y0, x1 + 2 * k, y0, "#ffffff", 14 * k);
  // suds on the rim
  for (let i = 0; i < 11; i++) {
    const fx = x0 + 18 * k + i * (2 * L.tubW - 36 * k) / 10, fy = y0 - 6 * k + Math.sin(now * 2 + i * 1.7) * 2 * k;
    const r = (10 + (i * 7) % 9) * k;
    circ(fx, fy, r, "#fff", "#9fdcff", 2.5);
  }
}
function drawTool(r, L) {
  if (!(ptr.over || ptr.down) || r.over) return;
  const x = ptr.x, y = ptr.y, k = Math.max(0.7, L.k * 0.85);
  g.save(); g.translate(x, y); g.scale(k, k);
  if (r.tool === 0) {
    g.rotate(ptr.down ? Math.sin(now * 25) * 0.25 : -0.2);
    rrect(-24, -16, 48, 32, 10, "#ffe36b", INK, 3.5);
    for (const [a, b, c] of [[-10, -4, 4], [6, 4, 5], [14, -7, 3], [-4, 8, 3]]) circ(a, b, c, "#e0b92c", null);
  } else if (r.tool === 1) {
    if (ptr.down) for (let i = -2; i <= 2; i++) line(i * 7, -48, i * 9 + Math.sin(now * 40 + i) * 2, -4, "rgba(70,160,255,0.75)", 3);
    poly([-20, -70, 20, -70, 28, -54, -28, -54], "#c9d3e6", INK, 3.5);
    rrect(-5, -100, 10, 32, 4, "#9aa6c2", INK, 3);
  } else {
    g.rotate(ptr.down ? Math.sin(now * 18) * 0.3 : 0.15);
    rrect(-26, -18, 52, 36, 7, "#ff8fc0", INK, 3.5); line(-26, 8, 26, 8, INK, 2.5);
    for (let i = -18; i < 20; i += 9) line(i, -11, i + 4, -11, "#fff", 2);
  }
  g.restore();
}
function renderWash() {
  const r = round, L = washLayout(), T = petTransform(r, L);
  drawBathroom(L);
  drawTubBack(L);
  const pose = petPose(r);
  if (r.b && r.b.shaking > 0) pose.mood = "squint";
  if (r.over && r.done) pose.mood = "happy";
  const up = flying(r);
  if (!up) {
    g.save(); g.translate(T.x, T.y); g.rotate(T.rot); g.scale(T.k, T.k);
    drawPet(r.pet.id, pose, r.spots, "body");
    g.restore();
  }
  drawTubFront(L);
  g.save(); g.translate(T.x, T.y); g.rotate(T.rot); g.scale(T.k, T.k);
  if (up) drawPet(r.pet.id, pose, r.spots);
  else drawPet(r.pet.id, pose, r.pet.gang ? r.spots : null, "paws");
  g.restore();
  drawParticles();
  drawTool(r, L);
}

// ================================================================= ROUND 2: PAYBACK
// Everyone you've washed this run chases you around the yard at once, each with its own way to get
// you wet. Only Biscuit has the hose. On a small screen at most 4 chase at once (5 on a big one);
// the rest cheer from the bottom fence and tag in every few seconds.
const GEAR = {
  // speed, range, aim (warning) time, spray time, rest time, drops per second, wetness per hit, spread, turn rate
  hose:      { speed: 120, range: 230, aim: 0.5,  spray: 0.9, rest: 1.0,  rate: 22, dmg: 0.9,  spread: 0.07, turn: 2.0, label: "HOSE" },
  squirt:    { speed: 165, range: 270, aim: 0.5,  spray: 0.75, rest: 0.6, dmg: 1.05, spread: 0.025, label: "SQUIRT GUN" },
  bucket:    { speed: 118, range: 150, aim: 1.05, rest: 2.4,  dmg: 15, label: "BUCKET" },
  sprinkler: { speed: 0,   range: 220, aim: 0.3,  spray: 1.4, rest: 0.35, rate: 40, dmg: 1.05, spread: 0.06, turn: 5.0, label: "SPRINKLER" },
  rain:      { speed: 150, range: 110, aim: 0.3,  spray: 1.6, rest: 1.8,  dmg: 3, label: "RAIN CLOUD" },
  puddle:    { speed: 108, range: 280, aim: 0.5,  rest: 1.6,  dmg: 12, label: "MUD SPLASH" },
  wave:      { speed: 84,  range: 190, aim: 0.8,  rest: 2.4,  dmg: 14, label: "BELLY FLOP" },
  octo:      { speed: 100, range: 220, aim: 0.7,  spray: 1.3, rest: 1.7,  rate: 6, dmg: 1.2, spread: 0.03, turn: 1.9, label: "8 SQUIRT GUNS" },
  balloon:   { speed: 135, range: 190, aim: 0.4,  rest: 0.8,  dmg: 13, label: "WATER BALLOONS" }
};
const PLAYER_SPEED = 205, PLAYER_R = 14, PET_R = 22, SPLASH_RX = 60, SPLASH_RY = 44, BUCKET_RX = 50, BUCKET_RY = 36, MUD_R = 80;
const SPAWN = [[0.82, 0.12], [0.14, 0.14], [0.55, 0.1], [0.88, 0.52], [0.1, 0.5], [0.5, 0.4], [0.86, 0.8]];
const maxChasers = () => (W < 620 ? 4 : 5);

function yardLayout() {
  const top = hudTop() + 4, x0 = 14, x1 = W - 14, y0 = top, y1 = H - 14;
  const w = x1 - x0, h = y1 - y0;
  const P = (fx, fy) => ({ x: x0 + w * fx, y: y0 + h * fy });
  const shed = P(0.25, 0.3), tramp = P(0.72, 0.68), line0 = P(0.58, 0.3), line1 = P(0.9, 0.3);
  const solids = [
    { type: "rect", name: "shed", x: shed.x - 62, y: shed.y - 45, w: 124, h: 90 },
    { type: "circle", name: "trampoline", x: tramp.x, y: tramp.y, r: 58 }
  ];
  const sheets = [];
  const n = 3, sw = Math.min(46, (line1.x - line0.x) / n - 8);
  for (let i = 0; i < n; i++) { const cx = lerp(line0.x, line1.x, (i + 0.5) / n); sheets.push({ type: "rect", name: "laundry", x: cx - sw / 2, y: line0.y - 4, w: sw, h: 40, c: ["#ff8fc0", "#ffe36b", "#8fd8ff"][i] }); }
  const bushes = [P(0.5, 0.52), P(0.13, 0.8), P(0.88, 0.9)].map(p => ({ type: "circle", name: "bush", x: p.x, y: p.y, r: 32 }));
  return { x0, x1, y0, y1, w, h, solids, sheets, bushes, line0, line1, spigot: { x: x0 + w * 0.5, y: y0 + 2 } };
}
// everyone washed so far in this run, up to pet i
function lineupFor(i) { const from = run ? Math.min(run.start, i) : i; return PETS.slice(from, i + 1).map(p => p.id); }
function makeFoe(r, id, k) {
  // with more pets in the yard, each one waits a little longer between attacks
  const pet = PET[id], G0 = GEAR[pet.weapon], P = { ...G0, rest: G0.rest * (1 + 0.15 * (r.crowd - 1)) }, Y = r.Y, sp = SPAWN[k % SPAWN.length];
  const f = { id, pet, P, weapon: pet.weapon, k, x: Y.x0 + Y.w * sp[0], y: Y.y0 + Y.h * sp[1], aim: Math.PI * 0.75, st: "move",
              timer: 0.8 + k * 0.6, visible: true, z: 0, emit: 0, bush: null, tagT: 3, inT: 0, wob: k * 1.7 };
  if (pet.weapon === "squirt") { f.st = "sneak"; f.visible = false; f.timer = 1.0 + k * 0.4; }
  if (pet.weapon === "sprinkler") { f.st = "rest"; f.timer = 0.6 + k * 0.4; }
  if (pet.weapon === "rain") f.z = 64;
  if (pet.weapon === "bucket") f.gangPos = [[-46, -6], [44, -10], [-16, 26], [22, 30]].map(([x, y], j) => ({ x, y, stage: 3, sq: j, face: j % 2 ? -1 : 1, wob: j }));
  return f;
}
function startHose(i, ids) {
  const pet = PETS[i];
  ids = ids && ids.length ? ids : lineupFor(i);
  const Y = yardLayout();
  const total = Math.min(30, pet.hoseTime + 2 * (ids.length - 1));
  round = { kind: "hose", i, pet, total, time: total, t: 0, Y, wet: 0, over: false, endT: 0,
            player: { x: Y.x0 + Y.w * 0.3, y: Y.y0 + Y.h * 0.9, vx: 0, vy: 0, face: 1, step: 0, hitT: 0 },
            foes: [], bench: [], drops: [], balloons: [], puddles: [], buckets: [], rain: [], waves: [], splats: [],
            squelchT: 0, tickT: 0, hits: 0, wobble: 0, soaked: false, swapT: 5, cap: maxChasers(), hitsBy: {} };
  round.crowd = Math.min(ids.length, round.cap);
  // the pet you just washed always plays, and so does Biscuit (the one with the hose); then the most
  // recent others; the rest wait their turn
  const order = ids.slice().reverse();
  if (order.indexOf("dog") > 1) order.splice(1, 0, ...order.splice(order.indexOf("dog"), 1));
  order.forEach((id, k) => { const f = makeFoe(round, id, k); (k < round.cap ? round.foes : round.bench).push(f); });
  // ...and each hit is a bit smaller, so a full yard is busier and wetter, but still escapable
  round.dm = 1 / (1 + 0.4 * (round.foes.length - 1));
  round.ids = ids;
  round.foe = round.foes[0];
  mode = "hose"; paused = false;
  showHud(true); $("tools").hidden = true;
  showTip(ids.length > 1 ? "Payback! EVERYONE wants you wet!" : "Payback! Stay dry!", 1.8);
  Sound.startMusic("hose");
  sfx("giggle");
  updateHud();
}
function rescaleYard(oldW, oldH) {
  const r = round, sx = W / oldW, sy = H / oldH;
  const fix = o => { o.x *= sx; o.y *= sy; };
  fix(r.player); r.foes.forEach(fix); r.drops.forEach(fix); r.puddles.forEach(fix); r.buckets.forEach(fix); r.rain.forEach(fix); r.waves.forEach(fix); r.splats.forEach(fix);
  r.balloons.forEach(b => { fix(b); b.tx *= sx; b.ty *= sy; b.sx *= sx; b.sy *= sy; b.fx *= sx; b.fy *= sy; });
  r.Y = yardLayout();
}
function insideRect(o, x, y, pad = 0) { return x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.h + pad; }
function blocksAt(o, x, y) { return o.type === "rect" ? insideRect(o, x, y) : Math.hypot(x - o.x, y - o.y) < o.r; }
function blockers(Y, solidOnly) { return solidOnly ? Y.solids : Y.solids.concat(Y.sheets, Y.bushes); }
function lineOfSight(Y, ax, ay, bx, by, solidOnly = false) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 8), B = blockers(Y, solidOnly);
  for (let i = 1; i < n; i++) { const x = lerp(ax, bx, i / n), y = lerp(ay, by, i / n); for (const o of B) if (blocksAt(o, x, y)) return false; }
  return true;
}
function pushOut(Y, e, rad) {
  let hit = null;
  for (const o of Y.solids) {
    if (o.type === "rect") {
      const cx = clamp(e.x, o.x, o.x + o.w), cy = clamp(e.y, o.y, o.y + o.h);
      let dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
      if (d < rad) {
        if (d < 0.001) { // centre inside: push out the nearest side
          const opts = [[e.x - o.x, -1, 0], [o.x + o.w - e.x, 1, 0], [e.y - o.y, 0, -1], [o.y + o.h - e.y, 0, 1]].sort((a, b) => a[0] - b[0]);
          dx = opts[0][1]; dy = opts[0][2]; d = 1;
          e.x = (dx ? (dx < 0 ? o.x - rad : o.x + o.w + rad) : e.x); e.y = (dy ? (dy < 0 ? o.y - rad : o.y + o.h + rad) : e.y);
        } else { e.x = cx + dx / d * rad; e.y = cy + dy / d * rad; }
        hit = { nx: dx / d, ny: dy / d, o };
      }
    } else {
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 0.001;
      if (d < o.r + rad) { e.x = o.x + dx / d * (o.r + rad); e.y = o.y + dy / d * (o.r + rad); hit = { nx: dx / d, ny: dy / d, o }; }
    }
  }
  e.x = clamp(e.x, Y.x0 + rad, Y.x1 - rad); e.y = clamp(e.y, Y.y0 + rad, Y.y1 - rad);
  return hit;
}
// walk toward (tx, ty), sliding around the shed and trampoline
function walk(r, e, tx, ty, speed, dt, rad, keep = 0) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 2 + keep) return;
  let vx = dx / d, vy = dy / d;
  if (e.detour > 0) { e.detour -= dt; const s = e.detourSide; const nx = -vy * s, ny = vx * s; vx = vx * 0.3 + nx; vy = vy * 0.3 + ny; const m = Math.hypot(vx, vy); vx /= m; vy /= m; }
  const step = Math.min(d, speed * dt);
  const ox = e.x, oy = e.y;
  e.x += vx * step; e.y += vy * step;
  pushOut(r.Y, e, rad);
  const moved = Math.hypot(e.x - ox, e.y - oy);
  if (moved < step * 0.35 && !(e.detour > 0)) { e.detour = 0.7; e.detourSide = Math.random() < 0.5 ? 1 : -1; }
  if (moved > 0.1) e.dir = Math.atan2(e.y - oy, e.x - ox);
}
function nozzle(p) { return { x: p.x + Math.cos(p.aim) * 24, y: p.y - p.z + Math.sin(p.aim) * 24 - 6 }; }
function shoot(r, p, x, y, a, sp, life, rad, kind) {
  r.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, r: rad, dmg: p.P.dmg, kind, who: p.id });
}
function emit(r, p, angle, dt, mult = 1, kind = "hose") {
  const P = p.P, n = nozzle(p);
  p.emit += P.rate * dt * mult;
  while (p.emit >= 1) {
    p.emit -= 1;
    shoot(r, p, n.x, n.y, angle + rnd(-1, 1) * P.spread, rnd(340, 400), P.range / 370 * rnd(0.85, 1.1), kind === "sprinkle" ? 4 : 5, kind);
  }
}
function turnToward(cur, target, maxStep) {
  let d = ((target - cur + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return cur + clamp(d, -maxStep, maxStep);
}
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const leadSpot = (r, t) => ({ x: clamp(r.player.x + r.player.vx * t, r.Y.x0 + 20, r.Y.x1 - 20), y: clamp(r.player.y + r.player.vy * t, r.Y.y0 + 20, r.Y.y1 - 20) });

const WEAPONS = {
  // Biscuit: the one and only hose. Chases you and sprays in bursts; watch for the "!"
  hose(r, p, dt) {
    const P = p.P, me = r.player, d = dist(p, me);
    p.timer -= dt;
    if (p.st === "move") {
      walk(r, p, me.x, me.y, P.speed, dt, PET_R, 110);
      p.aim = turnToward(p.aim, angTo(p, me), 6 * dt);
      if (p.timer <= 0 && d < P.range && lineOfSight(r.Y, p.x, p.y, me.x, me.y, true)) { p.st = "aim"; p.timer = P.aim; sfx("bark"); }
    } else if (p.st === "aim") {
      p.aim = turnToward(p.aim, angTo(p, me), 6 * dt);
      if (p.timer <= 0) { p.st = "spray"; p.timer = P.spray; }
    } else if (p.st === "spray") {
      p.aim = turnToward(p.aim, angTo(p, me), P.turn * dt);
      emit(r, p, p.aim, dt);
      r.hoseOn = true;
      if (p.timer <= 0) { p.st = "move"; p.timer = P.rest; }
    }
  },
  // Mittens: hides in a bush, pops out and fires her squirt gun, pew pew pew, then hides again
  squirt(r, p, dt) {
    const P = p.P, me = r.player;
    p.timer -= dt;
    if (p.st === "sneak") {
      p.visible = false;
      if (p.timer <= 0) {
        const B = r.Y.bushes.slice().sort((a, b) => dist(a, me) - dist(b, me));
        const pick = B.find(b => dist(b, me) > 110) || B[B.length - 1];
        p.bush = pick; p.x = pick.x; p.y = pick.y; p.st = "lurk"; p.timer = 0.75; sfx("meow");
      }
    } else if (p.st === "lurk") {
      p.visible = false;
      if (p.timer <= 0) {
        p.visible = true; p.st = "prowl"; p.timer = 1.6;
        const a = angTo(p, me); p.x += Math.cos(a) * 30; p.y += Math.sin(a) * 30; p.aim = a; pushOut(r.Y, p, PET_R);
      }
    } else if (p.st === "prowl") {
      const d = dist(p, me);
      p.aim = turnToward(p.aim, angTo(p, me), 6 * dt);
      if (d < P.range * 0.85 && lineOfSight(r.Y, p.x, p.y, me.x, me.y, true)) { p.st = "aim"; p.timer = P.aim; sfx("hiss"); }
      else { walk(r, p, me.x, me.y, P.speed, dt, PET_R, 110); if (p.timer <= 0) { p.st = "sneak"; p.timer = 0.9; } }
    } else if (p.st === "aim") {
      p.aim = turnToward(p.aim, angTo(p, me), 6 * dt);
      if (p.timer <= 0) { p.st = "spray"; p.timer = P.spray; p.shotT = 0; }
    } else if (p.st === "spray") {
      p.aim = turnToward(p.aim, angTo(p, me), 3 * dt);
      p.shotT -= dt;
      if (p.shotT <= 0) {
        p.shotT = 0.19; sfx("pew");
        const n = nozzle(p), a = p.aim + rnd(-1, 1) * P.spread;
        for (let j = 0; j < 4; j++) shoot(r, p, n.x - Math.cos(a) * j * 9, n.y - Math.sin(a) * j * 9, a, 520, P.range / 520, 4, "squirt");
      }
      if (p.timer <= 0) { p.st = "retreat"; p.timer = 0.5; }
    } else if (p.st === "retreat") {
      if (p.bush) walk(r, p, p.bush.x, p.bush.y, P.speed * 1.4, dt, PET_R);
      if (p.timer <= 0) { p.st = "sneak"; p.timer = rnd(0.9, 1.3); p.visible = false; }
    }
  },
  // the Nutty Gang: they run under you holding a bucket up high, then tip it. Get out of the shadow!
  bucket(r, p, dt) {
    const P = p.P, me = r.player, d = dist(p, me);
    p.timer -= dt;
    walk(r, p, me.x, me.y, P.speed * (p.st === "rest" ? 0.55 : 1), dt, PET_R, 50);
    if (p.st === "rest" && p.timer <= 0) p.st = "move";
    if (p.st === "move" && p.timer <= 0 && d < P.range) {
      p.st = "rest"; p.timer = P.rest;
      const t = leadSpot(r, 0.3);
      r.buckets.push({ x: t.x, y: t.y, sx: p.x, sy: p.y - 40, t: 0, dur: P.aim, dmg: P.dmg, who: p.id });
      sfx("creak"); sfx("chitter");
    }
  },
  // Clover: hops up close, then her sprinkler swishes back and forth, tick tick tick
  sprinkler(r, p, dt) {
    const P = p.P, me = r.player, Y = r.Y;
    p.timer -= dt;
    if (p.st === "rest") {
      p.z = 0;
      if (p.timer <= 0) {
        const a = angTo(p, me) + rnd(-0.5, 0.5), d = Math.min(Math.max(0, dist(p, me) - 105), 180);
        p.hx = p.x; p.hy = p.y;
        const t = { x: clamp(p.x + Math.cos(a) * d, Y.x0 + 30, Y.x1 - 30), y: clamp(p.y + Math.sin(a) * d, Y.y0 + 30, Y.y1 - 30) };
        pushOut(Y, t, PET_R);
        p.tx = t.x; p.ty = t.y; p.st = "hop"; p.timer = 0.5; sfx("squeak");
      }
    } else if (p.st === "hop") {
      const q = clamp(1 - p.timer / 0.5, 0, 1);
      p.x = lerp(p.hx, p.tx, q); p.y = lerp(p.hy, p.ty, q); p.z = Math.sin(Math.PI * q) * 40;
      if (p.timer <= 0 && dist(p, me) > P.range) { p.z = 0; pushOut(Y, p, PET_R); p.st = "rest"; p.timer = 0.15; }
      else if (p.timer <= 0) { p.z = 0; pushOut(Y, p, PET_R); p.st = "aim"; p.timer = P.aim; p.aim = angTo(p, me); p.base = p.aim; p.sw = 0; puff(p.x, p.y + 10, "ring", 1, { min: 0, max: 0, rmin: 14, rmax: 16, life: 0.5 }); }
    } else if (p.st === "aim") {
      if (p.timer <= 0) { p.st = "spray"; p.timer = P.spray; }
    } else if (p.st === "spray") {
      p.sw = (p.sw || 0) + dt * P.turn;
      p.base = turnToward(p.base == null ? p.aim : p.base, angTo(p, me), 1.2 * dt);
      p.aim = p.base + Math.sin(p.sw) * 0.45;
      emit(r, p, p.aim, dt, 0.85, "sprinkle"); emit(r, p, p.aim + Math.PI, dt, 0.15, "sprinkle");
      r.tickOn = true;
      if (p.timer <= 0) { p.st = "rest"; p.timer = P.rest; }
    }
  },
  // Pickles: flies right over the walls with his own little rain cloud and rains on you from above
  rain(r, p, dt) {
    const P = p.P, me = r.player, Y = r.Y;
    p.timer -= dt; p.wob += dt;
    p.z = 64 + Math.sin(r.t * 3 + p.k) * 6;
    const orbit = p.st === "spray" ? 20 : 120;
    const tx = me.x + Math.cos(p.wob * 1.3) * orbit, ty = me.y - 6 + Math.sin(p.wob * 1.3) * orbit * 0.7;
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), sp = P.speed * (p.st === "spray" ? 0.62 : 1);
    if (d > 1) { const st = Math.min(d, sp * dt); p.x += dx / d * st; p.y += dy / d * st; p.dir = Math.atan2(dy, dx); }
    p.x = clamp(p.x, Y.x0 + 20, Y.x1 - 20); p.y = clamp(p.y, Y.y0 + 70, Y.y1 - 10);
    if (p.st === "move" && p.timer <= 0 && dist(p, me) < P.range) { p.st = "aim"; p.timer = P.aim; sfx("squawk"); }
    else if (p.st === "aim" && p.timer <= 0) { p.st = "spray"; p.timer = P.spray; p.dropT = 0; }
    else if (p.st === "spray") {
      p.dropT -= dt;
      if (p.dropT <= 0) { p.dropT = 0.12; r.rain.push({ x: p.x + rnd(-16, 16), y: p.y + rnd(-6, 8), z: p.z + 30, vz: 60, dmg: P.dmg, who: p.id }); }
      if (p.timer <= 0) { p.st = "move"; p.timer = P.rest; }
    }
  },
  // Truffle: leaves mud puddles, and cannonballs into the one next to you
  puddle(r, p, dt) {
    const P = p.P, me = r.player;
    p.timer -= dt;
    p.mudT = (p.mudT == null ? 1.2 : p.mudT) - dt;
    if (p.jumpT > 0) { p.jumpT -= dt; p.z = Math.sin(Math.PI * clamp(1 - p.jumpT / 0.35, 0, 1)) * 26; } else p.z = 0;
    if (p.mudT <= 0 && p.st === "move") { p.mudT = 1.4; r.puddles.push({ x: p.x, y: p.y + 8, r: 34, life: 11 }); if (r.puddles.length > 8) r.puddles.shift(); if (Math.random() < 0.4) sfx("oink"); }
    if (p.st === "move") {
      walk(r, p, me.x, me.y, P.speed, dt, PET_R, 60);
      if (p.timer <= 0) {
        const near = r.puddles.filter(pd => dist(pd, me) < MUD_R + 10 && dist(pd, p) < P.range && pd.life > 1.6).sort((a, b) => dist(a, me) - dist(b, me))[0];
        if (near) { p.st = "charge"; p.target = near; p.timer = 1.5; sfx("oink"); }
      }
    } else if (p.st === "charge") {
      const pd = p.target;
      walk(r, p, pd.x, pd.y, 240, dt, PET_R);
      if (dist(p, pd) < PET_R + 6 || p.timer <= 0 || !r.puddles.includes(pd)) {
        if (r.puddles.includes(pd)) {
          r.splats.push({ x: pd.x, y: pd.y, t: 0, max: 0.55, kind: "mud", r: MUD_R });
          puff(pd.x, pd.y, "mud", 22, { min: 90, max: 260 });
          sfx("mudsplat");
          if (Math.hypot(me.x - pd.x, (me.y - pd.y) / 0.8) < MUD_R) getWet(r, P.dmg, p.id);
          r.puddles.splice(r.puddles.indexOf(pd), 1);
        }
        p.jumpT = 0.35; p.st = "move"; p.timer = P.rest;
      }
    }
  },
  // Bubbles: plods after you, jumps, and belly flops. The wave rolls out in a big ring; walls stop it
  wave(r, p, dt) {
    const P = p.P, me = r.player, d = dist(p, me);
    p.timer -= dt;
    if (p.st === "move") {
      walk(r, p, me.x, me.y, P.speed, dt, PET_R + 6, 40);
      if (p.timer <= 0 && d < P.range) { p.st = "jump"; p.timer = P.aim; sfx("hrumph"); }
    } else if (p.st === "jump") {
      p.z = Math.sin(Math.PI * clamp(1 - p.timer / P.aim, 0, 1)) * 60;
      if (p.timer <= 0) {
        p.z = 0; p.st = "move"; p.timer = P.rest;
        r.waves.push({ x: p.x, y: p.y + 4, r: 26, max: 190, hit: false, dmg: P.dmg, who: p.id });
        sfx("thud"); sfx("wave");
        puff(p.x, p.y, "drop", 18, { min: 80, max: 220 });
      }
    }
  },
  // Inky: a squirt gun in every arm. Stops, spins up, then fires all eight at once while turning
  octo(r, p, dt) {
    const P = p.P, me = r.player, d = dist(p, me);
    p.timer -= dt;
    p.spin = (p.spin || 0);
    if (p.st === "move") {
      const a = angTo(me, p);
      walk(r, p, me.x + Math.cos(a) * 140, me.y + Math.sin(a) * 140, P.speed, dt, PET_R);
      p.spin += dt * 0.6;
      if (p.timer <= 0 && d < P.range) { p.st = "aim"; p.timer = P.aim; sfx("blorp"); }
    } else if (p.st === "aim") {
      p.spin += dt * 3;
      if (p.timer <= 0) { p.st = "spray"; p.timer = P.spray; p.emit = 1; }
    } else if (p.st === "spray") {
      p.spin += P.turn * dt;
      p.emit += P.rate * dt;
      while (p.emit >= 1) {
        p.emit -= 1; sfx("pew", 0.6);
        for (let k = 0; k < 8; k++) { const a = p.spin + k * TAU / 8; shoot(r, p, p.x + Math.cos(a) * 30, p.y - 14 + Math.sin(a) * 30, a + rnd(-1, 1) * P.spread, 330, P.range / 330, 5, "octo"); }
      }
      if (p.timer <= 0) { p.st = "move"; p.timer = P.rest; }
    }
  },
  // Sir Quackers: keeps his distance and lobs water balloons that bounce once. The shadow shows where
  balloon(r, p, dt) {
    const P = p.P, me = r.player;
    p.timer -= dt;
    p.throwT = (p.throwT == null ? 1.2 + p.k * 0.3 : p.throwT) - dt;
    const want = 210;
    if (p.st === "move") {
      const a = angTo(me, p);
      walk(r, p, me.x + Math.cos(a) * want, me.y + Math.sin(a) * want, P.speed, dt, PET_R);
      p.aim = turnToward(p.aim, angTo(p, me), 5 * dt);
      if (p.throwT <= 0) { p.st = "wind"; p.timer = 0.35; sfx("quack"); }
    } else if (p.st === "wind") {
      p.aim = turnToward(p.aim, angTo(p, me), 6 * dt);
      if (p.timer <= 0) {
        // aim the bounce at where you're heading: the first landing falls short, then it hops onto you
        const f = leadSpot(r, 0.55), fx = f.x, fy = f.y;
        const a = Math.atan2(fy - p.y, fx - p.x), short = Math.min(70, Math.hypot(fx - p.x, fy - p.y) * 0.4);
        const tx = fx - Math.cos(a) * short, ty = fy - Math.sin(a) * short;
        r.balloons.push({ sx: p.x, sy: p.y - 20, x: p.x, y: p.y, tx, ty, fx, fy, t: 0, dur: 0.85, hop: 0, z: 0, bounce: short, who: p.id });
        sfx("whoosh");
        p.throwT = rnd(1.25, 1.6); p.st = "move"; p.timer = 0.4;
      }
    }
  }
};

function getWet(r, amount, who) {
  if (r.over) return;
  r.wet = Math.min(100, r.wet + amount * r.dm);
  r.player.hitT = 0.25; r.hits++;
  if (who) r.hitsBy[who] = (r.hitsBy[who] || 0) + 1;
  if (r.squelchT <= 0) { sfx("squelch"); r.squelchT = 0.22; }
  if (r.wet >= 100) endHose(false);
}
// swap a pet from the bench into the yard every few seconds (never the one you just washed)
function rotateBench(r, dt) {
  if (!r.bench.length || r.over) return;
  r.swapT -= dt;
  if (r.swapT > 0) return;
  r.swapT = 5;
  const out = r.foes.slice(1).filter(p => p.weapon !== "hose").sort((a, b) => b.inT - a.inT)[0];
  if (!out) return;
  const inn = r.bench.shift();
  const slot = r.foes.indexOf(out);
  const Y = r.Y, bx = benchSpot(r, r.bench.length);
  Object.assign(inn, makeFoe(r, inn.id, slot), { x: bx.x, y: Y.y1 - PET_R - 2, timer: 1.2, tagT: 2.5, inT: 0 });
  pushOut(Y, inn, PET_R);
  r.foes[slot] = inn;
  r.bench.push(out);
  puff(inn.x, inn.y - 20, "spark", 8, { min: 30, max: 120, rmin: 5, rmax: 9 });
  sfx("tagin"); showTip(`${inn.pet.name} tags in!`, 1.1);
}
function benchSpot(r, j) { return { x: r.Y.x0 + 34 + j * 46, y: r.Y.y1 + 2 }; }
function updateHose(dt) {
  const r = round, Y = r.Y, me = r.player;
  r.t += dt;
  r.squelchT -= dt;
  if (!r.over) { r.time -= dt; if (r.time <= 0) { r.time = 0; endHose(true); } }
  // you
  let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (joy) { const dx = joy.x - joy.sx, dy = joy.y - joy.sy, m = Math.hypot(dx, dy); if (m > 6) { ix += dx / Math.max(m, 44); iy += dy / Math.max(m, 44); } }
  const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
  let slow = 1;
  for (const pd of r.puddles) if (Math.hypot(pd.x - me.x, pd.y - me.y) < pd.r) slow = 0.5;
  if (r.over) { ix = 0; iy = 0; }
  me.vx = ix * PLAYER_SPEED * slow; me.vy = iy * PLAYER_SPEED * slow;
  me.x += me.vx * dt; me.y += me.vy * dt;
  pushOut(Y, me, PLAYER_R);
  if (Math.abs(ix) > 0.1) me.face = ix > 0 ? 1 : -1;
  me.step += Math.hypot(me.vx, me.vy) * dt * 0.06;
  if (me.hitT > 0) me.hitT -= dt;
  if (r.wet > 15 && Math.random() < dt * r.wet * 0.05) puff(me.x + rnd(-10, 10), me.y - 10, "drop", 1, { angle: Math.PI / 2, spread: 0.3, min: 10, max: 40, rmin: 3, rmax: 5, life: 0.5 });
  // the pets
  r.hoseOn = false; r.tickOn = false;
  if (!r.over) for (const p of r.foes) { p.inT += dt; if (p.tagT > 0) p.tagT -= dt; WEAPONS[p.weapon](r, p, dt); }
  rotateBench(r, dt);
  Sound.loop("spray", r.hoseOn && !paused, 3200, 0.07);
  if (r.tickOn) { r.tickT -= dt; if (r.tickT <= 0) { r.tickT = 0.11; sfx("tick"); } }
  // water from hoses and squirt guns
  for (let i = r.drops.length - 1; i >= 0; i--) {
    const d = r.drops[i];
    if (!d) continue;   // a soaking clears the water mid-loop
    d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
    let dead = d.life <= 0;
    if (!dead) for (const o of blockers(Y)) if (blocksAt(o, d.x, d.y)) { dead = true; if (o.name === "laundry") o.flap = 0.4; if (o.name === "bush") o.rustle = 0.3; break; }
    if (!dead && Math.hypot(d.x - me.x, d.y - (me.y - 8)) < PLAYER_R + d.r) { dead = true; getWet(r, d.dmg, d.who); puff(d.x, d.y, "drop", 2, { min: 40, max: 120 }); }
    if (dead) { if (Math.random() < 0.3) puff(d.x, d.y, "drop", 1, { min: 20, max: 80, rmin: 3, rmax: 5, life: 0.4 }); r.drops.splice(i, 1); }
  }
  // water balloons: fly, bounce once, splash
  for (let i = r.balloons.length - 1; i >= 0; i--) {
    const b = r.balloons[i];
    if (!b) continue;
    b.t += dt;
    const q = clamp(b.t / b.dur, 0, 1);
    b.x = lerp(b.sx, b.tx, q); b.y = lerp(b.sy, b.ty, q); b.z = Math.sin(Math.PI * q) * (b.hop ? 30 : 90);
    if (q >= 1) {
      if (!b.hop) {
        sfx("pop");
        b.hop = 1; b.t = 0; b.dur = 0.42; b.sx = b.tx; b.sy = b.ty;
        b.tx = b.fx; b.ty = b.fy;
      } else {
        sfx("splash");
        puff(b.x, b.y, "drop", 18, { min: 80, max: 220 }); puff(b.x, b.y, "ring", 1, { min: 0, max: 0, rmin: 22, rmax: 24, life: 0.6 });
        if (Math.hypot((me.x - b.x) / (SPLASH_RX + 8), (me.y - b.y) / (SPLASH_RY + 8)) < 1 && lineOfSight(Y, b.x, b.y, me.x, me.y, true)) getWet(r, GEAR.balloon.dmg, b.who);
        r.balloons.splice(i, 1);
      }
    }
  }
  // buckets: they float over where you were, tip, and dump
  for (let i = r.buckets.length - 1; i >= 0; i--) {
    const b = r.buckets[i];
    if (!b) continue;
    b.t += dt;
    if (b.t >= b.dur) {
      sfx("sploosh");
      r.splats.push({ x: b.x, y: b.y, t: 0, max: 0.45, kind: "pour", r: BUCKET_RX });
      puff(b.x, b.y, "drop", 24, { min: 60, max: 230 }); puff(b.x, b.y, "ring", 1, { min: 0, max: 0, rmin: 26, rmax: 28, life: 0.6 });
      if (Math.hypot((me.x - b.x) / BUCKET_RX, (me.y - b.y) / BUCKET_RY) < 1) getWet(r, b.dmg, b.who);
      r.buckets.splice(i, 1);
    }
  }
  // rain from Pickles' cloud
  for (let i = r.rain.length - 1; i >= 0; i--) {
    const d = r.rain[i];
    if (!d) continue;
    d.vz += 620 * dt; d.z -= d.vz * dt;
    if (d.z <= 0) {
      if (Math.random() < 0.5) sfx("plip");
      puff(d.x, d.y, "drop", 3, { angle: -Math.PI / 2, spread: 1.2, min: 30, max: 90, rmin: 2, rmax: 4, life: 0.35 });
      if (Math.hypot(me.x - d.x, (me.y - d.y) * 1.3) < PLAYER_R + 6) getWet(r, d.dmg, d.who);
      r.rain.splice(i, 1);
    }
  }
  // belly-flop waves roll outward; the shed and trampoline block them
  for (let i = r.waves.length - 1; i >= 0; i--) {
    const w = r.waves[i];
    if (!w) continue;
    w.r += 250 * dt;
    const dme = Math.hypot(me.x - w.x, (me.y - w.y) / 0.7);
    if (!w.hit && Math.abs(dme - w.r) < 16 && lineOfSight(Y, w.x, w.y, me.x, me.y, true)) { w.hit = true; getWet(r, w.dmg, w.who); }
    if (w.r > w.max) r.waves.splice(i, 1);
  }
  for (let i = r.splats.length - 1; i >= 0; i--) { r.splats[i].t += dt; if (r.splats[i].t > r.splats[i].max) r.splats.splice(i, 1); }
  for (let i = r.puddles.length - 1; i >= 0; i--) { r.puddles[i].life -= dt; if (r.puddles[i].life <= 0) r.puddles.splice(i, 1); }
  for (const o of Y.sheets.concat(Y.bushes)) { if (o.flap > 0) o.flap -= dt; if (o.rustle > 0) o.rustle -= dt; }
  if (r.over) { r.endT -= dt; if (r.endT <= 0) finishRound(); }
  updateHud();
}
function endHose(dry) {
  const r = round;
  if (r.over) return;
  r.over = true; r.soaked = !dry; r.endT = 1.5;
  Sound.loop("spray", false);
  r.drops.length = 0; r.balloons.length = 0; r.buckets.length = 0; r.rain.length = 0; r.waves.length = 0;
  if (dry) { sfx("win"); showTip(r.wet < 30 ? "Dry as a bone!" : "You made it!", 1.4); }
  else { sfx("soaked"); sfx("giggle"); showTip("SOAKED!", 1.5); }
}

function drawYard() {
  const r = round, Y = r.Y;
  g.fillStyle = "#63c95e"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#6fd36b";
  for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, H);
  // flowers
  const R = mulberry(7);
  for (let i = 0; i < 26; i++) { const fx = R() * W, fy = Y.y0 + R() * (H - Y.y0); circ(fx, fy, 3, ["#fff", "#ffe36b", "#ff8fc0"][i % 3], null); }
  // fence
  g.fillStyle = "#f3d9a4";
  g.fillRect(0, 0, W, Y.y0); g.fillRect(0, 0, Y.x0, H); g.fillRect(Y.x1, 0, W - Y.x1, H); g.fillRect(0, Y.y1, W, H - Y.y1);
  g.strokeStyle = "#c79a5a"; g.lineWidth = 2;
  for (let x = 6; x < W; x += 18) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Y.y0); g.moveTo(x, Y.y1); g.lineTo(x, H); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(Y.x0, Y.y0, Y.w, Y.h);
  // spigot
  rrect(Y.spigot.x - 10, Y.spigot.y - 10, 20, 16, 4, "#b9c3d6", INK, 3); circ(Y.spigot.x, Y.spigot.y - 14, 6, "#ff6f6f", INK, 2.5);
  // puddles
  for (const pd of r.puddles) { g.globalAlpha = Math.min(1, pd.life / 2) * 0.9; ell(pd.x, pd.y, pd.r, pd.r * 0.62, "#7a4b26", 0, "#5a3416", 2); ell(pd.x - 8, pd.y - 4, 8, 4, "#9a6a40", 0, null); g.globalAlpha = 1; }
}
function drawShed(o) {
  rrect(o.x + 6, o.y + 8, o.w, o.h, 6, "rgba(0,0,0,0.18)", null);
  rrect(o.x, o.y, o.w, o.h, 6, "#c46a3c", INK, 4);
  for (let i = 1; i < 5; i++) line(o.x + 6, o.y + i * o.h / 5, o.x + o.w - 6, o.y + i * o.h / 5, "#a8532c", 2.5);
  rrect(o.x + o.w / 2 - 16, o.y + o.h - 34, 32, 34, 3, "#7c3c1e", INK, 3);
  circ(o.x + o.w / 2 + 8, o.y + o.h - 16, 2.5, "#ffd23f", null);
  rrect(o.x + 12, o.y + 14, 24, 18, 3, "#bfe9ff", INK, 3);
}
function drawTramp(o) {
  ell(o.x + 6, o.y + 10, o.r, o.r * 0.9, "rgba(0,0,0,0.18)", 0, null);
  for (const a of [0.6, 2.5, 4.2]) line(o.x + Math.cos(a) * o.r * 0.8, o.y + Math.sin(a) * o.r * 0.8, o.x + Math.cos(a) * o.r * 0.8, o.y + Math.sin(a) * o.r * 0.8 + 14, INK, 4);
  circ(o.x, o.y, o.r, "#2f8cff", INK, 4);
  circ(o.x, o.y, o.r - 10, "#2b2b3a", INK, 2);
  circ(o.x - 14, o.y - 14, 10, "rgba(255,255,255,0.1)", null);
}
function drawBush(o, cat) {
  const wig = o.rustle > 0 || cat ? Math.sin(now * 40) * 3 : 0;
  ell(o.x + 4, o.y + 10, o.r, o.r * 0.6, "rgba(0,0,0,0.18)", 0, null);
  for (const [dx, dy, rr] of [[-14, 4, 20], [14, 4, 20], [0, -10, 22], [0, 8, 22]]) circ(o.x + dx + wig, o.y + dy, rr, "#2f9e44", INK, 3);
  for (const [dx, dy] of [[-10, -6], [12, -2], [2, 10]]) circ(o.x + dx + wig, o.y + dy, 4, "#ff6f8a", null);
  if (cat) { for (const s of [-1, 1]) ell(o.x + s * 9 + wig, o.y - 4, 5, 6, "#c6ff6a", 0, INK, 2); }
}
function drawLaundry(Y) {
  const l0 = Y.line0, l1 = Y.line1;
  line(l0.x - 26, l0.y - 30, l0.x - 26, l0.y + 16, "#9aa6c2", 5);
  line(l1.x + 26, l1.y - 30, l1.x + 26, l1.y + 16, "#9aa6c2", 5);
  g.beginPath(); g.moveTo(l0.x - 26, l0.y - 26); g.quadraticCurveTo((l0.x + l1.x) / 2, l0.y - 14, l1.x + 26, l1.y - 26); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
  for (const s of Y.sheets) {
    const f = s.flap > 0 ? Math.sin(now * 40) * 4 : Math.sin(now * 2 + s.x) * 1.5;
    poly([s.x, s.y - 20, s.x + s.w, s.y - 20, s.x + s.w + f, s.y + s.h, s.x + f, s.y + s.h], s.c, INK, 3);
    circ(s.x + 5, s.y - 20, 3, "#fff", INK, 1.5); circ(s.x + s.w - 5, s.y - 20, 3, "#fff", INK, 1.5);
  }
}
function drawKid(me, wet) {
  const bob = Math.sin(me.step * 2) * 2, legA = Math.sin(me.step * 2) * 5;
  g.save(); g.translate(me.x, me.y);
  ell(0, 4, 14, 6, "rgba(0,0,0,0.22)", 0, null);
  line(-5, -6, -5 - legA * 0.3, 2, INK, 6); line(5, -6, 5 + legA * 0.3, 2, INK, 6);
  rrect(-11, -26 + bob, 22, 22, 7, "#ff6f6f", INK, 3);
  circ(0, -36 + bob, 12, "#ffcf9e", INK, 3);
  g.beginPath(); g.arc(0, -38 + bob, 12, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(10 * me.face, -40 + bob); g.fillStyle = "#6b3f1f"; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  circ(-4 + me.face * 3, -35 + bob, 2, INK, null); circ(4 + me.face * 3, -35 + bob, 2, INK, null);
  if (me.hitT > 0) { g.beginPath(); g.arc(me.face * 2, -29 + bob, 3.5, 0, TAU); g.fillStyle = INK; g.fill(); }
  if (wet > 0) { g.globalAlpha = Math.min(0.55, wet / 160); rrect(-13, -50 + bob, 26, 50, 10, "#2f8cff", null); g.globalAlpha = 1; }
  g.restore();
}
const YARD_SCALE = { squirrel: 0.42, hippo: 0.27, octopus: 0.26, parrot: 0.28 };
function drawCloud(x, y, dark) {
  for (const [dx, dy, rr] of [[-16, 2, 12], [0, -6, 15], [16, 2, 12], [0, 6, 12]]) circ(x + dx, y + dy, rr, dark ? "#8d9ab3" : "#eef4ff", INK, 2.5);
}
function drawBucket(x, y, tilt) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  poly([-15, -14, 15, -14, 11, 14, -11, 14], "#b9c3d6", INK, 3);
  ell(0, -14, 15, 5, "#5fb8ff", 0, INK, 2.5);
  g.beginPath(); g.arc(0, -14, 14, Math.PI, TAU); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.restore();
}
function drawYardPet(r, p) {
  if (!p.visible) return;
  const s = YARD_SCALE[p.id] || 0.3;
  const sh = p.z > 0 ? clamp(1 - p.z / 120, 0.45, 1) : 1;
  ell(p.x, p.y + 8, 22 * sh * (p.id === "hippo" ? 1.5 : 1), 8 * sh, "rgba(0,0,0,0.22)", 0, null);
  // the bucket the squirrels carry (when it isn't up in the air)
  if (p.weapon === "bucket" && !r.buckets.some(b => b.who === p.id)) drawBucket(p.x, p.y - 48 + Math.sin(now * 10) * 2, Math.sin(now * 4) * 0.1);
  g.save(); g.translate(p.x, p.y - p.z - 22); g.scale(s, s);
  const pose = { t: now + p.k, mood: "sly", blink: false, tense: p.id === "cat", flap: p.st === "wind", hop: p.st === "hop", lid: p.pet.lid, flying: p.id === "parrot", wet: 0,
                 yawn: p.st === "jump" ? 0.8 : 0, grab: null, gang: p.gangPos };
  drawPet(p.id, pose, null);
  g.restore();
  const n = nozzle(p);
  if (p.weapon === "hose") { line(p.x, p.y - p.z - 4, n.x, n.y, INK, 8); line(p.x, p.y - p.z - 4, n.x, n.y, "#ffd23f", 4); }
  else if (p.weapon === "squirt") {
    g.save(); g.translate(n.x, n.y); g.rotate(p.aim);
    rrect(-12, -6, 22, 12, 4, "#ff8a1a", INK, 2.5); rrect(8, -3.5, 12, 7, 2, "#2fd0c0", INK, 2); rrect(-8, 2, 7, 11, 2, "#ff8a1a", INK, 2);
    g.restore();
  } else if (p.weapon === "sprinkler") {
    const sx = p.x + 16, sy = p.y + 4, spin = p.st === "spray" ? now * 14 : 0;
    ell(sx, sy, 10, 4, "#ffd23f", 0, INK, 2.5);
    line(sx, sy - 2, sx, sy - 12, INK, 3);
    line(sx + Math.cos(spin) * 9, sy - 12 + Math.sin(spin) * 3, sx - Math.cos(spin) * 9, sy - 12 - Math.sin(spin) * 3, "#ff6f6f", 4);
  } else if (p.weapon === "rain") drawCloud(p.x, p.y - p.z - 62, p.st === "spray" || p.st === "aim");
  else if (p.weapon === "octo" && (p.st === "aim" || p.st === "spray")) {
    for (let k = 0; k < 8; k++) {
      const a = p.spin + k * TAU / 8;
      g.save(); g.translate(p.x + Math.cos(a) * 28, p.y - 14 + Math.sin(a) * 28); g.rotate(a);
      rrect(-6, -3.5, 13, 7, 2, k % 2 ? "#ffe36b" : "#2fd0c0", INK, 2); g.restore();
    }
  } else if (p.weapon === "balloon" && p.st === "wind") { circ(p.x + 18, p.y - p.z - 40, 9, "#5fb8ff", INK, 2.5); }
  if (p.st === "aim" || p.st === "wind" || p.st === "jump" || p.st === "charge") {
    const bx = p.x, by = p.y - p.z - (p.weapon === "rain" ? 90 : 68) + Math.sin(now * 20) * 2;
    rrect(bx - 9, by - 14, 18, 24, 6, "#fff", INK, 3);
    g.fillStyle = "#ff3b5c"; g.font = "900 20px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", bx, by - 1);
  }
}
// a name tag over each pet when it joins in, so you can tell who's who
function drawTag(p) {
  if (!(p.tagT > 0) || !p.visible) return;
  g.globalAlpha = clamp(p.tagT, 0, 1);
  const text = `${p.pet.name}: ${p.P.label}`;
  g.font = "900 12px ui-rounded, system-ui, sans-serif";
  const w = g.measureText(text).width + 14, x = clamp(p.x, Y_of(round).x0 + w / 2, Y_of(round).x1 - w / 2), y = p.y - p.z - 92;
  rrect(x - w / 2, y - 10, w, 20, 10, "#fffaf0", INK, 2.5);
  g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, x, y + 1);
  g.globalAlpha = 1;
}
const Y_of = r => r.Y;
function drawBench(r) {
  r.bench.forEach((p, j) => {
    const b = benchSpot(r, j), hop = Math.abs(Math.sin(now * 5 + j)) * 5;
    g.save(); g.translate(b.x, b.y - hop); g.scale(0.17, 0.17);
    drawPet(p.id, { t: now + j, mood: "happy", blink: false, wet: 0, lid: p.pet.lid, gang: p.gangPos, flying: false }, null);
    g.restore();
  });
}
function drawHoseLine(r) {
  const Y = r.Y;
  for (const p of r.foes) {
    if (p.weapon !== "hose" || !p.visible) continue;
    g.beginPath(); g.moveTo(Y.spigot.x, Y.spigot.y);
    g.quadraticCurveTo((Y.spigot.x + p.x) / 2 + 40, (Y.spigot.y + p.y) / 2 + 60, p.x, p.y - p.z - 2);
    g.strokeStyle = INK; g.lineWidth = 7; g.stroke(); g.strokeStyle = "#3fbf52"; g.lineWidth = 4; g.stroke();
  }
}
const DROP_LOOK = { hose: ["#7cc8ff", "#2a6fd6"], sprinkle: ["#c4ecff", "#3d8fe0"], squirt: ["#a5f3ff", "#0fa3b8"], octo: ["#d5c2ff", "#6a3fd6"] };
function renderHose() {
  const r = round, Y = r.Y;
  drawYard();
  // ground marks first: wave rings, bucket shadows, rain shadows, splats
  for (const w of r.waves) {
    const a = clamp(1 - w.r / w.max, 0, 1);
    g.globalAlpha = 0.25 + a * 0.6; ell(w.x, w.y, w.r, w.r * 0.7, null, 0, "#2f8cff", 10); ell(w.x, w.y, w.r, w.r * 0.7, null, 0, "#e9fbff", 3); g.globalAlpha = 1;
  }
  for (const b of r.buckets) {
    const q = clamp(b.t / b.dur, 0, 1);
    g.globalAlpha = 0.18 + 0.3 * q; ell(b.x, b.y, BUCKET_RX * (0.6 + 0.4 * q), BUCKET_RY * (0.6 + 0.4 * q), "#1b3a8a", 0, null);
    g.globalAlpha = 0.6; ell(b.x, b.y, BUCKET_RX, BUCKET_RY, null, 0, "#1b3a8a", 2.5); g.globalAlpha = 1;
  }
  for (const d of r.rain) { g.globalAlpha = clamp(1 - d.z / 120, 0.2, 0.6); ell(d.x, d.y, 6, 3, "#1b3a8a", 0, null); g.globalAlpha = 1; }
  for (const s of r.splats) {
    const q = s.t / s.max;
    g.globalAlpha = 1 - q;
    if (s.kind === "mud") { ell(s.x, s.y, s.r * (0.5 + q * 0.6), s.r * 0.8 * (0.5 + q * 0.6), null, 0, "#6e4423", 9); }
    else { ell(s.x, s.y, s.r * (0.6 + q * 0.5), BUCKET_RY * (0.6 + q * 0.5), "rgba(95,184,255,0.5)", 0, "#2f8cff", 4); rrect(s.x - 16, s.y - 120 * (1 - q), 32, 120 * (1 - q), 10, "rgba(95,184,255,0.75)", null); }
    g.globalAlpha = 1;
  }
  drawHoseLine(r);
  // y-sorted scene
  const items = [];
  for (const o of Y.solids) items.push({ y: o.type === "rect" ? o.y + o.h : o.y + o.r * 0.6, f: () => o.name === "shed" ? drawShed(o) : drawTramp(o) });
  items.push({ y: Y.line0.y + 36, f: () => drawLaundry(Y) });
  for (const o of Y.bushes) items.push({ y: o.y + 12, f: () => drawBush(o, r.foes.some(p => p.weapon === "squirt" && p.st === "lurk" && p.bush === o)) });
  items.push({ y: r.player.y, f: () => drawKid(r.player, r.wet) });
  for (const p of r.foes) items.push({ y: p.y + (p.weapon === "rain" ? 1000 : 0), f: () => drawYardPet(r, p) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  drawBench(r);
  // water in the air
  for (const d of r.drops) {
    const [c, s] = DROP_LOOK[d.kind] || DROP_LOOK.hose;
    if (d.kind === "squirt") { const v = Math.hypot(d.vx, d.vy) || 1; line(d.x - d.vx / v * 9, d.y - d.vy / v * 9, d.x, d.y, s, 6); line(d.x - d.vx / v * 8, d.y - d.vy / v * 8, d.x, d.y, c, 3); }
    else { circ(d.x, d.y, d.r, c, s, 2); circ(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.3, "#fff", null); }
  }
  for (const d of r.rain) { const y = d.y - d.z; poly([d.x, y - 9, d.x + 4.5, y + 1, d.x, y + 5, d.x - 4.5, y + 1], "#5fb8ff", "#1d5fc4", 2); }
  for (const b of r.buckets) {
    const q = clamp(b.t / b.dur, 0, 1), fly = clamp(b.t / 0.3, 0, 1);
    const x = lerp(b.sx, b.x, ease(fly)), y = lerp(b.sy, b.y - 78, ease(fly));
    drawBucket(x, y, q > 0.55 ? (q - 0.55) / 0.45 * 2.1 : Math.sin(now * 16) * 0.08);
    // a squirrel riding the bucket, tipping it over
    g.save(); g.translate(x - 14, y - 22); g.scale(0.32, 0.32); drawSquirrel({ t: now }, { face: 1, wob: 0 }); drawSquirrelFace({ t: now, mood: "happy" }, { face: 1, stage: 3 }); g.restore();
  }
  for (const b of r.balloons) {
    // the shadow shows where it will splash
    g.globalAlpha = 0.18 + 0.12 * Math.sin(now * 12); ell(b.fx, b.fy, SPLASH_RX, SPLASH_RY, "#1b3a8a", 0, null); g.globalAlpha = 0.5; ell(b.fx, b.fy, SPLASH_RX, SPLASH_RY, null, 0, "#1b3a8a", 2.5); g.globalAlpha = 1;
    ell(b.x, b.y, 10, 5, "rgba(0,0,0,0.2)", 0, null);
    circ(b.x, b.y - b.z, 11, "#5fb8ff", INK, 3); circ(b.x - 3, b.y - b.z - 4, 3, "#fff", null);
    poly([b.x - 3, b.y - b.z + 11, b.x + 3, b.y - b.z + 11, b.x, b.y - b.z + 15], "#5fb8ff", INK, 2);
  }
  for (const p of r.foes) drawTag(p);
  drawParticles();
  // the joystick
  if (joy) {
    circ(joy.sx, joy.sy, 44, "rgba(255,255,255,0.25)", "rgba(42,33,64,0.5)", 3);
    const dx = joy.x - joy.sx, dy = joy.y - joy.sy, m = Math.hypot(dx, dy), k = m > 44 ? 44 / m : 1;
    circ(joy.sx + dx * k, joy.sy + dy * k, 20, "rgba(255,255,255,0.8)", INK, 3);
  }
  // a blue flash when you get hit
  if (r.player.hitT > 0) { g.fillStyle = `rgba(47,140,255,${r.player.hitT * 0.5})`; g.fillRect(0, 0, W, H); }
}

// ================================================================= flow
function showHud(on) { $("hud").hidden = !on; }
function hideScreens() { for (const id of ["title-screen", "pets-screen", "intro-screen", "result-screen", "pause-screen", "final-screen"]) $(id).hidden = true; }
function fmtTime(t) { const s = Math.ceil(t); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function updateHud() {
  if (!round) return;
  const r = round;
  const n = r.kind === "hose" ? r.foes.length + r.bench.length : 1;
  $("hud-pet").textContent = n > 1 ? `${n} pets · Payback!` : `${r.pet.name} · ${r.kind === "wash" ? "Wash!" : "Payback!"}`;
  $("hud-time").textContent = fmtTime(r.time);
  $("hud-time").classList.toggle("hurry", r.time <= 5 && !r.over);
  const meter = $("hud-meter");
  if (r.kind === "wash") {
    meter.classList.remove("wet", "danger");
    $("meter-label").textContent = "Clean";
    $("meter-fill").style.width = Math.round(washProgress(r) * 100) + "%";
  } else {
    meter.classList.add("wet"); meter.classList.toggle("danger", r.wet > 70);
    $("meter-label").textContent = "Wet";
    $("meter-fill").style.width = Math.round(r.wet) + "%";
  }
}
function starsHtml(n) { let s = ""; for (let i = 0; i < 3; i++) s += `<span class="${i < n ? "on" : "off"}">★</span>`; return s; }
function washScore(r) {
  const frac = r.time / r.total;
  const stars = !r.done ? 0 : frac >= 0.4 ? 3 : frac >= 0.2 ? 2 : 1;
  const points = r.cleaned * 25 + (r.done ? 200 + Math.round(r.time * 10) : 0);
  return { stars, points, done: r.done, timeLeft: Math.round(r.time * 10) / 10 };
}
function hoseScore(r) {
  const stars = r.soaked ? 0 : r.wet < 30 ? 3 : r.wet < 60 ? 2 : 1;
  const points = r.soaked ? Math.round((r.total - r.time) * 8) : 200 + Math.round((100 - r.wet) * 5);
  return { stars, points, soaked: r.soaked, wet: Math.round(r.wet) };
}
let lastResult = null;
function finishRound() {
  const r = round;
  if (mode !== "wash" && mode !== "hose") return;
  Sound.quiet(); Sound.stopMusic();
  const res = r.kind === "wash" ? washScore(r) : hoseScore(r);
  lastResult = { kind: r.kind, i: r.i, ...res };
  const slot = run.scores[r.i] || (run.scores[r.i] = {});
  slot[r.kind] = res;
  // best stars per pet
  const bp = saved.best.pets[r.pet.id] || (saved.best.pets[r.pet.id] = { wash: 0, hose: 0 });
  bp[r.kind] = Math.max(bp[r.kind] || 0, res.stars);
  if (r.kind === "hose") { saved.reached = Math.max(saved.reached, Math.min(PETS.length, r.i + 2)); store.set(V2 + "reached", saved.reached); }
  store.set(V2 + "best", saved.best);
  mode = "result";
  $("tools").hidden = true; showHud(false); hideScreens();
  const s = $("result-screen"); s.hidden = false;
  const crowd = r.kind === "hose" ? r.foes.length + r.bench.length : 1;
  $("result-kicker").textContent = crowd > 1 ? `Payback from ${crowd} pets · Round 2` : `${fullName(r.pet)} · Round ${r.kind === "wash" ? 1 : 2}`;
  if (r.kind === "wash") {
    $("result-title").textContent = res.done ? (res.stars === 3 ? "Super speedy scrub!" : "Squeaky clean!") : "Out of time!";
    $("result-line").textContent = res.done ? `Done with ${Math.ceil(res.timeLeft)} seconds to spare. Now ${r.pet.name} wants payback...` : `${r.cleaned} of ${r.spots.length} spots clean. ${r.pet.name} is still muddy, and grumpy...`;
    $("next-btn").textContent = "Payback round!";
  } else {
    $("result-title").textContent = res.soaked ? "SOAKED!" : res.stars === 3 ? "Dry as a bone!" : "You escaped!";
    const top = Object.entries(r.hitsBy).sort((a, b) => b[1] - a[1])[0];
    const who = top ? PET[top[0]] : r.pet;
    $("result-line").textContent = res.soaked ? `${crowd > 1 ? who.name + " got you most, with " + who.gear : r.pet.name + " got you completely soaked"}.` : `You're ${res.wet}% wet.${crowd > 1 && top ? " Wettest hits: " + who.name + "'s " + GEAR[who.weapon].label.toLowerCase() + "." : ""}`;
    $("next-btn").textContent = r.i + 1 < PETS.length ? (PETS[r.i + 1].surprise ? "Next pet: ???" : `Next: ${PETS[r.i + 1].name}`) : "See your score";
  }
  $("result-stars").innerHTML = starsHtml(res.stars);
  $("result-points").textContent = `${res.points} points`;
  for (let i = 0; i < res.stars; i++) setTimeout(() => sfx("star", i), 200 + i * 220);
  setTimeout(() => { try { $("next-btn").focus({ preventScroll: true }); } catch (e) {} }, 50);
}
function nextAfterResult() {
  const lr = lastResult;
  if (!lr) return;
  if (lr.kind === "wash") showIntro(lr.i, "hose");
  else if (lr.i + 1 < PETS.length && run.index + 1 < PETS.length) { run.index = lr.i + 1; showIntro(run.index, "wash"); }
  else showFinal();
}
function showIntro(i, kind) {
  const pet = PETS[i];
  round = null; mode = "intro"; paused = false;
  hideScreens(); showHud(false); $("tools").hidden = true;
  $("intro-screen").hidden = false;
  $("intro-kicker").textContent = `Pet ${i + 1} of ${PETS.length} · Round ${kind === "wash" ? 1 : 2}`;
  const crew = lineupFor(i).map(id => PET[id]);
  const secs = Math.min(30, pet.hoseTime + 2 * (crew.length - 1));
  $("intro-title").textContent = kind === "wash" ? (pet.washTitle || `Wash ${fullName(pet)}!`)
    : crew.length === 1 ? (pet.weapon === "hose" ? `Payback! ${pet.name} has the hose!` : `Payback! ${pet.name} has ${pet.gear}!`)
    : `Payback! ${pet.name} joins in!`;
  $("intro-tip").textContent = kind === "wash" ? pet.washTip : pet.hoseTip;
  $("intro-how").textContent = kind === "wash"
    ? `Drag over each spot: SOAP the mud, RINSE the bubbles, TOWEL it dry. ${pet.washTime} seconds!`
    : crew.length === 1 ? `Run with the arrow keys, WASD, or drag anywhere. Hide behind things. Stay dry for ${secs} seconds!`
    : `All ${crew.length} are after you: ${crew.map(p => `${p.name} (${GEAR[p.weapon].label.toLowerCase()})`).join(", ")}. Stay dry for ${secs} seconds!`;
  $("go-btn").dataset.kind = kind; $("go-btn").dataset.i = i;
  drawPetPic($("intro-pet"), pet.id, kind === "hose" ? "sly" : "grumpy", kind === "wash" ? makeSpots(pet) : null);
  sfx(pet.voice);
  setTimeout(() => { try { $("go-btn").focus({ preventScroll: true }); } catch (e) {} }, 50);
}
function drawPetPic(cv, id, mood, spots, locked) {
  const c = cv.getContext("2d"), prev = g;
  g = c;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  const k = Math.min(cv.width / 300, cv.height / 290);
  c.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2 + 30 * k);
  if (locked) { c.globalAlpha = 1; c.font = "900 150px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#c9bedc"; c.fillText("?", 0, -30); }
  else drawPet(id, { t: 1, mood, blink: false, tense: false, flap: false, hop: false, wet: 0, lid: PET[id].lid }, spots);
  c.setTransform(1, 0, 0, 1, 0, 0);
  g = prev;
}
function beginRound(i, kind, lineup) {
  hideScreens();
  particles.length = 0;
  if (kind === "wash") startWash(i); else startHose(i, lineup);
}
function newRun(start) {
  run = { start, index: start, scores: [] };
  showIntro(start, "wash");
}
function showFinal() {
  mode = "final"; round = null;
  hideScreens(); showHud(false);
  $("final-screen").hidden = false;
  let total = 0, rows = "<tr><th>Pet</th><th>Wash</th><th>Dry</th><th>Points</th></tr>";
  for (let i = run.start; i < PETS.length; i++) {
    const s = run.scores[i] || {}, w = s.wash || { stars: 0, points: 0 }, h = s.hose || { stars: 0, points: 0 };
    total += w.points + h.points;
    rows += `<tr><td>${PETS[i].name}</td><td class="s">${"★".repeat(w.stars)}${"☆".repeat(3 - w.stars)}</td><td class="s">${"★".repeat(h.stars)}${"☆".repeat(3 - h.stars)}</td><td class="n">${w.points + h.points}</td></tr>`;
  }
  $("final-table").innerHTML = rows;
  $("final-total").textContent = `${total} points`;
  let best = "";
  if (run.start === 0) {
    if (total > (saved.best.total || 0)) { saved.best.total = total; store.set(V2 + "best", saved.best); best = '<span class="new-best">New best score!</span>'; }
    else best = `<span class="muted">Best: ${saved.best.total} points</span>`;
  } else best = `<span class="muted">Start from Biscuit to set a best score.</span>`;
  $("final-best").innerHTML = best;
  const soaks = run.scores.filter(s => s && s.hose && s.hose.soaked).length;
  $("final-line").textContent = soaks === 0 ? "Every pet is clean, and you stayed dry. Amazing!" : soaks >= 4 ? "Every pet is clean... and you are SOAKING wet." : "Every pet is clean, and you're... mostly dry.";
  sfx("win");
  updateTitleBest();
}
function updateTitleBest() {
  $("title-best").textContent = saved.best.total ? `Best score: ${saved.best.total} points`
    : old.best.total ? `Your best with 5 pets (jeremy.v1): ${old.best.total} points. Now there are 9!`
    : "Nine pets. Two rounds each. One very wet backyard.";
}
function showTitle() {
  mode = "title"; round = null; paused = false;
  Sound.quiet(); Sound.stopMusic();
  hideScreens(); showHud(false); $("tools").hidden = true;
  $("title-screen").hidden = false;
  updateTitleBest();
}
function showPets() {
  mode = "pets";
  hideScreens(); $("pets-screen").hidden = false;
  const grid = $("pet-grid"); grid.innerHTML = "";
  PETS.forEach((p, i) => {
    const open = i < saved.reached;
    const b = document.createElement("button");
    b.className = "petcard"; b.disabled = !open; b.dataset.i = i;
    const cv = document.createElement("canvas"); cv.width = 144; cv.height = 120;
    b.appendChild(cv);
    const bp = bestStars(p.id);
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = open ? p.name : (p.surprise ? "Surprise!" : "???");
    const st = document.createElement("span"); st.className = "st"; st.textContent = open ? `★${bp.wash} ☂${bp.hose}` : "locked";
    b.appendChild(nm); b.appendChild(st);
    b.addEventListener("click", () => { sfx("click"); newRun(i); });
    grid.appendChild(b);
    drawPetPic(cv, p.id, "happy", null, !open);
  });
}
function pause(on) {
  if (mode !== "wash" && mode !== "hose") return;
  if (on === paused) return;
  paused = on;
  $("pause-screen").hidden = !on;
  $("pause-sound-btn").textContent = Sound.muted ? "Sound: off" : "Sound: on";
  if (on) { Sound.quiet(); Sound.stopMusic(); ptr.down = false; joy = null; for (const k in keys) keys[k] = false; }
  else Sound.startMusic(mode === "wash" ? "wash" : "hose");
}
function restartRound() {
  if (!round) return;
  const i = round.i, kind = round.kind, ids = round.ids;
  paused = false; $("pause-screen").hidden = true;
  Sound.quiet();
  beginRound(i, kind, ids);
}
function toggleMute() {
  Sound.init();
  Sound.setMuted(!Sound.muted);
  $("mute-btn").classList.toggle("off", Sound.muted);
  $("pause-sound-btn").textContent = Sound.muted ? "Sound: off" : "Sound: on";
}

// ---------------------------------------------------------------- input
function logical(e) { const rc = canvas.getBoundingClientRect(); return { x: (e.clientX - rc.left) / U, y: (e.clientY - rc.top) / U }; }
canvas.addEventListener("pointerdown", e => {
  Sound.init();
  if (paused) return;
  const p = logical(e);
  if (mode === "wash") {
    ptr.down = true; ptr.id = e.pointerId; ptr.x = p.x; ptr.y = p.y; ptr.over = true;
    if (round) round.prevLocal = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  } else if (mode === "hose") {
    joy = { sx: p.x, sy: p.y, x: p.x, y: p.y, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }
  e.preventDefault();
});
canvas.addEventListener("pointermove", e => {
  const p = logical(e);
  if (mode === "wash" && (ptr.id === e.pointerId || !ptr.down)) { ptr.x = p.x; ptr.y = p.y; ptr.over = e.pointerType === "mouse" || ptr.down; }
  if (joy && joy.id === e.pointerId) { joy.x = p.x; joy.y = p.y; }
});
function pointerEnd(e) {
  if (ptr.id === e.pointerId) { ptr.down = false; ptr.id = null; if (e.pointerType !== "mouse") ptr.over = false; }
  if (joy && joy.id === e.pointerId) joy = null;
}
canvas.addEventListener("pointerup", pointerEnd);
canvas.addEventListener("pointercancel", pointerEnd);
canvas.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !ptr.down) ptr.over = false; });
document.querySelectorAll(".tool").forEach(b => b.addEventListener("pointerdown", e => { e.preventDefault(); Sound.init(); sfx("click"); setTool(+b.dataset.tool); }));

const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };
window.addEventListener("keydown", e => {
  Sound.init();
  const k = KEYMAP[e.code];
  if (k && mode === "hose" && !paused) { keys[k] = true; e.preventDefault(); return; }
  if (e.code === "KeyP" || e.code === "Escape") { if (mode === "wash" || mode === "hose") { pause(!paused); e.preventDefault(); } return; }
  if (e.code === "KeyR" && (mode === "wash" || mode === "hose")) { restartRound(); e.preventDefault(); return; }
  if (e.code === "KeyM") { toggleMute(); return; }
  if (mode === "wash" && !paused && /^Digit[123]$/.test(e.code)) { setTool(+e.code.slice(5) - 1); sfx("click"); e.preventDefault(); return; }
  if (e.code === "Enter" || e.code === "Space") {
    if (e.target && e.target.tagName === "BUTTON") return; // the button handles it
    if (mode === "intro") { $("go-btn").click(); e.preventDefault(); }
    else if (mode === "result") { $("next-btn").click(); e.preventDefault(); }
    else if (mode === "title") { $("play-btn").click(); e.preventDefault(); }
  }
});
window.addEventListener("keyup", e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; if (mode === "wash" || mode === "hose") pause(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden && (mode === "wash" || mode === "hose")) pause(true); });

$("play-btn").addEventListener("click", () => { Sound.init(); sfx("click"); newRun(0); });
$("pets-btn").addEventListener("click", () => { Sound.init(); sfx("click"); showPets(); });
$("pets-back").addEventListener("click", () => { sfx("click"); showTitle(); });
$("go-btn").addEventListener("click", () => { Sound.init(); sfx("click"); beginRound(+$("go-btn").dataset.i, $("go-btn").dataset.kind); });
$("next-btn").addEventListener("click", () => { sfx("click"); nextAfterResult(); });
$("retry-btn").addEventListener("click", () => { sfx("click"); if (lastResult) beginRound(lastResult.i, lastResult.kind); });
$("pause-btn").addEventListener("click", () => { Sound.init(); pause(true); });
$("mute-btn").addEventListener("click", toggleMute);
$("resume-btn").addEventListener("click", () => pause(false));
$("restart-btn").addEventListener("click", restartRound);
$("pause-title-btn").addEventListener("click", showTitle);
$("pause-sound-btn").addEventListener("click", toggleMute);
$("again-btn").addEventListener("click", () => { sfx("click"); newRun(0); });
$("final-title-btn").addEventListener("click", () => { sfx("click"); showTitle(); });
$("mute-btn").classList.toggle("off", Sound.muted);

// ---------------------------------------------------------------- title scene
const titleRound = { pet: PETS[0], spots: makeSpots(PETS[0]).map((s, i) => (i % 3 === 1 ? Object.assign(s, { stage: 1, hp: HP[1] }) : s)), off: { x: 0, y: 0, rot: 0 }, b: {} };
function renderTitle() {
  const L = washLayout();
  drawBathroom(L);
  drawTubBack(L);
  const T = { x: L.cx + Math.sin(now * 1.2) * 24 * L.k, y: L.baseY, rot: Math.sin(now * 1.6) * 0.05, k: L.k };
  const pose = { t: now, mood: "ok", blink: Math.sin(now * 0.9 + 1.3) > 0.985, wet: 0 };
  g.save(); g.translate(T.x, T.y); g.rotate(T.rot); g.scale(T.k, T.k); drawPet("dog", pose, titleRound.spots, "body"); g.restore();
  drawTubFront(L);
  g.save(); g.translate(T.x, T.y); g.rotate(T.rot); g.scale(T.k, T.k); drawPet("dog", pose, null, "paws"); g.restore();
  // three of the Nutty Gang watch from the rim, and Pickles flies loops over the tub
  for (const [j, x] of [[0, -150], [1, 132], [2, 168]]) {
    g.save(); g.translate(L.cx + x * L.k, L.rimY - 18 * L.k - Math.abs(Math.sin(now * 4 + j * 2)) * 6 * L.k); g.scale(L.k * 0.9, L.k * 0.9);
    const sq = { face: x < 0 ? 1 : -1, wob: j * 2, stage: 3 };
    drawSquirrel({ t: now }, sq); drawSquirrelFace({ t: now, mood: "happy" }, sq); g.restore();
  }
  const bx = L.cx + Math.sin(now * 0.8) * 150 * L.k, by = L.baseY - 175 * L.k + Math.sin(now * 1.6) * 24 * L.k;
  g.save(); g.translate(bx, by); g.rotate(Math.cos(now * 0.8) * 0.2); g.scale(L.k * 0.38, L.k * 0.38);
  drawPet("parrot", { t: now, mood: "happy", blink: false, wet: 0, flying: true }, null); g.restore();
  drawParticles();
}

// ---------------------------------------------------------------- main loop
function update(dt) {
  now += dt;
  if (tipTimer > 0) { tipTimer -= dt; if (tipTimer <= 0) $("tip").classList.add("fade"); }
  if (mode === "title" || mode === "pets") {
    if (Math.random() < dt * 5) { const L = washLayout(); puff(L.cx + rnd(-1, 1) * L.tubW, L.rimY - 10, "bubble", 1, { angle: -Math.PI / 2, spread: 0.5, min: 20, max: 60, rmin: 5, rmax: 14, life: 3 }); }
    updateParticles(dt);
    return;
  }
  if (paused || !round) return;
  if (mode === "wash") updateWash(dt);
  else if (mode === "hose") updateHose(dt);
  updateParticles(dt);
}
function render() {
  g = mainCtx;
  g.setTransform(DPR * U, 0, 0, DPR * U, 0, 0);
  if (round && round.kind === "wash" && (mode === "wash" || mode === "result")) renderWash();
  else if (round && round.kind === "hose") renderHose();
  else if (mode === "title" || mode === "pets" || !round) renderTitle();
}
let last = performance.now();
function frame(t) {
  const dt = Math.min(1 / 30, Math.max(0, (t - last) / 1000));
  last = t;
  if (!frozen) update(dt);
  render();
  requestAnimationFrame(frame);
}
window.addEventListener("resize", resize);
resize();
updateTitleBest();
requestAnimationFrame(frame);

// ---------------------------------------------------------------- test hooks (used by the evidence checks)
window.__pwp = {
  get mode() { return mode; }, get paused() { return paused; }, get round() { return round; }, get run() { return run; },
  get layout() { return { U, W, H }; }, get ptr() { return ptr; }, get keys() { return keys; },
  pets: PETS, HP, PLAYER_SPEED, GEAR, maxChasers, lineupFor,
  start(i, kind = "wash", lineup) { if (!run) run = { start: i, index: i, scores: [] }; run.index = i; beginRound(i, kind, lineup); },
  petScreen() { const r = round, T = petTransform(r, washLayout()); return { x: T.x * U, y: (T.y - 10 * T.k) * U, lx: T.x, ly: T.y - 10 * T.k }; },
  saved: () => ({ best: saved.best, reached: saved.reached, old }),
  newRun, freeze(on) { frozen = !!on; },
  tick(dt = 1 / 60, n = 1) { for (let k = 0; k < n; k++) { update(dt); if (mode !== "wash" && mode !== "hose") break; } render(); return mode; },
  spotScreen(j) { const r = round, L = washLayout(), w = toWorld(petTransform(r, L), r.spots[j].x, r.spots[j].y); return { x: w.x * U, y: w.y * U }; },
  spotLogical(j) { const r = round, L = washLayout(); return toWorld(petTransform(r, L), r.spots[j].x, r.spots[j].y); },
  progress() { return round && round.kind === "wash" ? washProgress(round) : null; },
  setPointer(x, y, down) { ptr.x = x; ptr.y = y; ptr.down = down; ptr.over = true; if (!down && round) round.prevLocal = null; },
  setTool, lineOfSight: (ax, ay, bx, by) => lineOfSight(round.Y, ax, ay, bx, by), toScreen: (x, y) => ({ x: x * U, y: y * U })
};
})();
