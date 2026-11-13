/*
 * SWARANTARA: Swara Pitch Graph page (swara/).
 * Live pitch-time graph for Carnatic singing. No libraries; everything runs in
 * the browser and nothing is recorded or sent anywhere.
 * The pitch maths (the ==DSP== part) is unchanged from the original page.
 */
// ==DSP==  (pure functions, no DOM; tested offline in Node)
const SWARA_SEMITONE = { S:0, R1:1, R2:2, G1:2, R3:3, G2:3, G3:4, M1:5, M2:6, P:7,
  D1:8, D2:9, N1:9, D3:10, N2:10, N3:11 };
const DEFAULT_NAME = ["S","R1","R2","G2","G3","M1","M2","P","D1","D2","N2","N3"];
const SPOKEN = { S:"Sa", R:"Ri", G:"Ga", M:"Ma", P:"Pa", D:"Dha", N:"Ni" };
const JUST_RATIO = [1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8];

const MELAKARTA_NAMES = ["Kanakangi","Ratnangi","Ganamurti","Vanaspati","Manavati","Tanarupi",
  "Senavati","Hanumatodi","Dhenuka","Natakapriya","Kokilapriya","Rupavati",
  "Gayakapriya","Vakulabharanam","Mayamalavagowla","Chakravakam","Suryakantam","Hatakambari",
  "Jhankaradhwani","Natabhairavi","Keeravani","Kharaharapriya","Gourimanohari","Varunapriya",
  "Mararanjani","Charukesi","Sarasangi","Harikambhoji","Dheerashankarabharanam","Naganandini",
  "Yagapriya","Ragavardhini","Gangeyabhushani","Vagadheeswari","Shoolini","Chalanata",
  "Salagam","Jalarnavam","Jhalavarali","Navaneetam","Pavani","Raghupriya",
  "Gavambodhi","Bhavapriya","Shubhapantuvarali","Shadvidamargini","Suvarnangi","Divyamani",
  "Dhavalambari","Namanarayani","Kamavardhini","Ramapriya","Gamanashrama","Vishwambari",
  "Shamalangi","Shanmukhapriya","Simhendramadhyamam","Hemavati","Dharmavati","Neetimati",
  "Kantamani","Rishabhapriya","Latangi","Vachaspati","Mechakalyani","Chitrambari",
  "Sucharitra","Jyotiswarupini","Dhatuvardhani","Nasikabhushani","Kosalam","Rasikapriya"];

// Melakarta n (1..72) -> swaras, worked out from its number:
// Ma1 for 1-36, Ma2 for 37-72; chakra (group of 6) picks Ri-Ga, place in chakra picks Dha-Ni.
// 6 Ri-Ga pairs x 6 Dha-Ni pairs x 2 Ma = 72.
function melakartaSwaras(n) {
  const RG = [["R1","G1"],["R1","G2"],["R1","G3"],["R2","G2"],["R2","G3"],["R3","G3"]];
  const DN = [["D1","N1"],["D1","N2"],["D1","N3"],["D2","N2"],["D2","N3"],["D3","N3"]];
  const m = (n - 1) % 36;
  const [r, g] = RG[Math.floor(m / 6)];
  const [d, ni] = DN[m % 6];
  return ["S", r, g, n <= 36 ? "M1" : "M2", "P", d, ni];
}

const JANYA = {
  "Mohanam": ["S R2 G3 P D2 S", "S D2 P G3 R2 S", 28],
  "Hamsadhwani": ["S R2 G3 P N3 S", "S N3 P G3 R2 S", 29],
  "Hindolam": ["S G2 M1 D1 N2 S", "S N2 D1 M1 G2 S", 20],
  "Madhyamavati": ["S R2 M1 P N2 S", "S N2 P M1 R2 S", 22],
  "Abhogi": ["S R2 G2 M1 D2 S", "S D2 M1 G2 R2 S", 22],
  "Shuddha Saveri": ["S R2 M1 P D2 S", "S D2 P M1 R2 S", 29],
  "Revati": ["S R1 M1 P N2 S", "S N2 P M1 R1 S", 2],
  "Sriranjani": ["S R2 G2 M1 D2 N2 S", "S N2 D2 M1 G2 R2 S", 22],
  "Hamsanandi": ["S R1 G3 M2 D2 N3 S", "S N3 D2 M2 G3 R1 S", 53],
  "Bilahari": ["S R2 G3 P D2 S", "S N3 D2 P M1 G3 R2 S", 29],
  "Malahari": ["S R1 M1 P D1 S", "S D1 P M1 G3 R1 S", 15],
  "Arabhi": ["S R2 M1 P D2 S", "S N3 D2 P M1 G3 R2 S", 29],
};

function makeRaga(name, aro, ava, parent) {
  const toks = new Set([...aro, ...ava]);
  const names = {};
  for (const t of toks) names[SWARA_SEMITONE[t]] = t;
  return { name, aro, ava, parent, names, positions: new Set(Object.keys(names).map(Number)) };
}

function allRagas() {
  const list = [];
  for (const [name, [a, v, parent]] of Object.entries(JANYA))
    list.push(makeRaga(name, a.split(" "), v.split(" "), parent));
  MELAKARTA_NAMES.forEach((name, i) => {
    const s = melakartaSwaras(i + 1);
    list.push(makeRaga(name, [...s, "S"], ["S", ...s.slice(1).reverse(), "S"], i + 1));
  });
  return list;
}

function noteToHz(note, octave) {
  const idx = { C:0, "C#":1, D:2, "D#":3, E:4, F:5, "F#":6, G:7, "G#":8, A:9, "A#":10, B:11 }[note];
  const midi = 12 * (octave + 1) + idx;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// YIN pitch detector (de Cheveigne & Kawahara 2002) with parabolic interpolation.
// x: Float32Array frame, length must be >= W + tauMax. Returns Hz or null.
function yin(x, sr, fmin = 70, fmax = 1100, threshold = 0.15) {
  const tauMin = Math.max(2, Math.floor(sr / fmax));
  const tauMax = Math.floor(sr / fmin);
  const W = x.length - tauMax;
  if (W < tauMax / 2) return null;
  let mean = 0;
  for (let i = 0; i < x.length; i++) mean += x[i];
  mean /= x.length;
  const d = new Float64Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let j = 0; j < W; j++) { const v = x[j] - x[j + tau]; s += v * v; }
    d[tau] = s;
  }
  const c = new Float64Array(tauMax + 1);
  c[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= tauMax; tau++) { run += d[tau]; c[tau] = run > 0 ? d[tau] * tau / run : 1; }
  let tau = -1;
  for (let t = tauMin; t < tauMax; t++) {
    if (c[t] < threshold) {
      while (t + 1 < tauMax && c[t + 1] < c[t]) t++;
      tau = t; break;
    }
  }
  if (tau < 0) return null;
  const a = c[tau - 1], b = c[tau], cc = c[tau + 1];
  const den = a - 2 * b + cc;
  const shift = den !== 0 ? 0.5 * (a - cc) / den : 0;
  return sr / (tau + shift);
}

// Halve the sample rate (average pairs) so YIN is cheap enough for phones.
function decimate2(x) {
  const y = new Float32Array(x.length >> 1);
  for (let i = 0; i < y.length; i++) y[i] = 0.5 * (x[2 * i] + x[2 * i + 1]);
  return y;
}

// Nearest swarasthana, cents off it, in/out of raga, verdict.
function classify(hz, sa, raga, tol = 20, just = false) {
  const total = 1200 * Math.log2(hz / sa);
  let octave = Math.floor((total + 50) / 1200);
  const within = total - 1200 * octave;
  const targets = [];
  for (let i = 0; i <= 12; i++) targets.push(i === 12 ? 1200 : (just ? 1200 * Math.log2(JUST_RATIO[i]) : 100 * i));
  let best = 0;
  for (let i = 1; i <= 12; i++) if (Math.abs(within - targets[i]) < Math.abs(within - targets[best])) best = i;
  const cents = within - targets[best];
  const pos = best % 12;
  if (best === 12) octave += 1;
  const name = raga ? (raga.names[pos] || DEFAULT_NAME[pos]) : DEFAULT_NAME[pos];
  const inRaga = !raga || raga.positions.has(pos);
  const verdict = Math.abs(cents) <= tol ? "IN SHRUTHI" : cents > 0 ? "HIGH" : "LOW";
  return { hz, total, pos, name, octave, cents, inRaga, verdict,
           targetHz: sa * Math.pow(2, octave + targets[best] / 1200) };
}

function prettyName(tok, octave = 0) {
  const base = (SPOKEN[tok[0]] || tok[0]) + tok.slice(1);
  const lbl = { "-2": "anumandra", "-1": "mandra", "0": "", "1": "tara", "2": "atitara" }[String(octave)];
  return lbl ? `${base} (${lbl})` : base;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
}

// Turns a stream of raw pitch readings into smoothed points and steady notes.
// steadyCents: max spread over the last ~0.3 s for the pitch to count as steady.
class Tracker {
  constructor(steadyCents = 60, windowS = 0.3, minNoteS = 0.25) {
    this.steadyCents = steadyCents; this.windowS = windowS; this.minNoteS = minNoteS;
    this.recent = []; this.points = []; this.notes = []; this.cur = null;
  }
  push(t, hz, sa, raga, tol, just) {
    if (hz == null) { this.recent = []; this._close(sa, raga, tol, just); this.points.push({ t, r: null }); return null; }
    this.recent.push({ t, hz });
    while (this.recent.length && t - this.recent[0].t > this.windowS) this.recent.shift();
    const sm = median(this.recent.slice(-5).map(p => p.hz));
    const hs = this.recent.map(p => p.hz);
    const spread = 1200 * Math.log2(Math.max(...hs) / Math.min(...hs));
    const steady = this.recent.length >= 4 && spread <= this.steadyCents;
    const r = classify(sm, sa, raga, tol, just);
    r.steady = steady;
    this.points.push({ t, r });
    const key = r.pos + 12 * r.octave;
    if (steady) {
      if (this.cur && this.cur.key === key) { this.cur.end = t; this.cur.hz.push(sm); }
      else { this._close(sa, raga, tol, just); this.cur = { key, start: t, end: t, hz: [sm] }; }
    } else if (this.cur && this.cur.key !== key) {
      this._close(sa, raga, tol, just);
    }
    return r;
  }
  _close(sa, raga, tol, just) {
    const c = this.cur; this.cur = null;
    if (!c || c.end - c.start < this.minNoteS) return;
    // average in the log domain over the middle 60% of the note
    const a = Math.floor(c.hz.length * 0.2), b = Math.max(a + 1, Math.floor(c.hz.length * 0.8));
    const seg = c.hz.slice(a, b);
    const hz = Math.pow(2, seg.reduce((s, h) => s + Math.log2(h), 0) / seg.length);
    const r = classify(hz, sa, raga, tol, just);
    this.notes.push({ start: c.start, end: c.end, r });
  }
  flush(sa, raga, tol, just) { this._close(sa, raga, tol, just); }
}

// Voice-like test signal: harmonics + vibrato, one tone per swara of the arohana/avarohana.
function demoSequence(raga, sa) {
  const seq = [];
  const aro = raga.aro, ava = raga.ava.slice(1);
  aro.forEach((t, i) => seq.push(sa * Math.pow(2, (SWARA_SEMITONE[t] + (i === aro.length - 1 && t === "S" && i > 0 ? 12 : 0)) / 12)));
  ava.forEach(t => seq.push(sa * Math.pow(2, SWARA_SEMITONE[t] / 12)));
  return seq;
}
function synthTone(hz, dur, sr, vibCents = 8, vibRate = 5.5) {
  const n = Math.floor(dur * sr), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const f = hz * Math.pow(2, vibCents * Math.sin(2 * Math.PI * vibRate * i / sr) / 1200);
    ph += 2 * Math.PI * f / sr;
    out[i] = 0.3 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph) + 0.15 * Math.sin(4 * ph)) / 1.95;
  }
  return out;
}
// ==/DSP==

// ---------------------------------------------------------------- UI
const $ = id => document.getElementById(id);
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const RAGAS = allRagas();
const state = { sa: noteToHz("G#", 3), raga: null, tol: 20, just: false,
  ctx: null, src: null, stream: null, analyser: null, running: false, demo: false,
  t0: 0, tracker: new Tracker(), last: null };

function store(k, v) { try { localStorage.setItem("swaragraph." + k, v); } catch (e) {} }
function load(k) { try { return localStorage.getItem("swaragraph." + k); } catch (e) { return null; } }

function initControls() {
  for (const n of NOTES) $("note").add(new Option(n, n));
  $("note").value = load("note") || "G#";
  $("oct").value = load("oct") || "3";
  const gj = document.createElement("optgroup"); gj.label = "Janya ragas";
  const gm = document.createElement("optgroup"); gm.label = "Melakarta ragas (1-72)";
  RAGAS.forEach((r, i) => {
    const o = new Option(typeof r.parent === "number" && !(r.name in JANYA)
      ? `${r.parent}. ${r.name}` : r.name, String(i));
    (r.name in JANYA ? gj : gm).appendChild(o);
  });
  $("raga").append(gj, gm);
  const saved = load("raga");
  const idx = saved != null ? Number(saved) : RAGAS.findIndex(r => r.name === "Mohanam");
  $("raga").value = String(idx >= 0 && idx < RAGAS.length ? idx : 0);
  $("tuning").value = load("tuning") || "et";
  $("tol").value = load("tol") || "20";
  const savedHz = load("hz");
  if (savedHz) $("hz").value = savedHz;
  readControls();
  ["note","oct"].forEach(id => $(id).addEventListener("change", () => { $("hz").value = ""; store("hz", ""); readControls(); }));
  ["raga","tuning","tol","hz"].forEach(id => $(id).addEventListener("input", readControls));
}

function readControls() {
  const hz = parseFloat($("hz").value);
  state.sa = hz > 0 ? hz : noteToHz($("note").value, Number($("oct").value));
  state.raga = RAGAS[Number($("raga").value)];
  state.just = $("tuning").value === "just";
  state.tol = Number($("tol").value);
  $("tolv").textContent = "±" + state.tol;
  ["note","oct","raga","tuning","tol","hz"].forEach(id => store(id, $(id).value));
  const r = state.raga;
  const parent = typeof r.parent === "number"
    ? (r.name in JANYA ? ` · janya of melakarta ${r.parent}, ${MELAKARTA_NAMES[r.parent - 1]}` : ` · melakarta ${r.parent}`)
    : "";
  const targets = [...r.positions].sort((a, b) => a - b).map(p => {
    const c = state.just ? 1200 * Math.log2(JUST_RATIO[p]) : 100 * p;
    return `${prettyName(r.names[p])} ${(state.sa * Math.pow(2, c / 1200)).toFixed(1)} Hz`;
  });
  $("scale").innerHTML = `<b>${r.name}</b>${parent}<br>Arohana: ${r.aro.join(" ")} &nbsp; Avarohana: ${r.ava.join(" ")}` +
    `<br>Sa = ${state.sa.toFixed(2)} Hz (${state.just ? "just intonation" : "equal temperament"}): ${targets.join(" · ")}`;
  draw();
}

// ---------------------------------------------------------------- audio
async function ensureCtx() {
  if (!state.ctx) state.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (state.ctx.state === "suspended") await state.ctx.resume();
  return state.ctx;
}

function stopSource() {
  if (state.src) { try { state.src.stop && state.src.stop(); } catch (e) {} try { state.src.disconnect(); } catch (e) {} }
  if (state.stream) state.stream.getTracks().forEach(t => t.stop());
  state.src = null; state.stream = null; state.running = false; state.demo = false;
  state.tracker.flush(state.sa, state.raga, state.tol, state.just);
  $("start").textContent = "Start mic"; $("demo").textContent = "Demo";
  updateStats();
}

function attach(node, toSpeakers) {
  const ctx = state.ctx;
  state.analyser = ctx.createAnalyser();
  state.analyser.fftSize = 2048;
  node.connect(state.analyser);
  if (toSpeakers) node.connect(ctx.destination);
  state.src = node;
  state.running = true;
  state.t0 = ctx.currentTime - (state.tracker.points.length ? state.tracker.points[state.tracker.points.length - 1].t + 0.5 : 0);
  requestAnimationFrame(loop);
}

// Lists the audio inputs in the Microphone menu. Names only show once mic access is allowed.
async function refreshMics() {
  const md = navigator.mediaDevices;
  if (!md || !md.enumerateDevices) return [];
  let devs = [];
  try { devs = (await md.enumerateDevices()).filter(d => d.kind === "audioinput"); } catch (e) { return []; }
  const sel = $("mic"), want = sel.value || load("mic") || "";
  sel.innerHTML = "";
  sel.add(new Option("Default mic", ""));
  let n = 0;
  for (const d of devs) {
    if (!d.deviceId || d.deviceId === "default") continue;   // before permission Chrome hides ids
    n++;
    sel.add(new Option(d.label || "Microphone " + n, d.deviceId));
  }
  sel.value = [...sel.options].some(o => o.value === want) ? want : "";
  return devs;
}

function micErrorText(e) {
  switch (e && e.name) {
    case "NotFoundError": case "DevicesNotFoundError": case "OverconstrainedError":
      return "No microphone found. A Mac mini has no built-in mic, so connect a USB or external mic, " +
        "headphones with a mic, or AirPods. Then check System Settings > Sound > Input and " +
        "Chrome's mic setting (chrome://settings/content/microphone).";
    case "NotAllowedError": case "PermissionDeniedError":
      return "Microphone access is blocked. In Chrome, click the icon at the left of the address bar, " +
        "set Microphone to Allow, and reload. On a Mac, also turn on Google Chrome in " +
        "System Settings > Privacy & Security > Microphone, then quit and reopen Chrome.";
    case "NotReadableError": case "TrackStartError": case "AbortError":
      return "The microphone is busy or couldn't start. Close other apps or tabs using it " +
        "(Zoom, FaceTime, Meet) and press Start mic again.";
    case "SecurityError": case "InsecureContext":
      return "The mic only works on a secure page. Open it from https:// or localhost, " +
        "not as a file.";
    default:
      return "Couldn't open the microphone (" + ((e && e.name) || "unknown error") + ").";
  }
}

async function startMic() {
  if (state.running) { stopSource(); return; }
  $("msg").textContent = "";
  const md = navigator.mediaDevices;
  if (!window.isSecureContext || !md || !md.getUserMedia) {
    $("msg").textContent = micErrorText({ name: "InsecureContext" });
    return;
  }
  const base = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  const id = $("mic").value;
  try {
    const ctx = await ensureCtx();
    let stream;
    try {
      stream = await md.getUserMedia({ audio: id ? { ...base, deviceId: { exact: id } } : base });
    } catch (e) {
      // the chosen device is gone, or Chrome's preferred input is missing: try any mic once
      if (e.name !== "NotFoundError" && e.name !== "OverconstrainedError") throw e;
      stream = await md.getUserMedia({ audio: true });
      if (id) { $("mic").value = ""; store("mic", ""); }
    }
    state.stream = stream;
    attach(ctx.createMediaStreamSource(stream), false);
    $("start").textContent = "Stop";
    refreshMics();   // names are available now
  } catch (e) {
    let text = micErrorText(e);
    if (e.name === "NotFoundError") {
      const devs = await refreshMics();
      if (devs.length === 0) text = "Chrome sees no microphone on this computer. " + text;
    }
    $("msg").textContent = text;
  }
}

async function startDemo() {
  if (state.running) { stopSource(); return; }
  const ctx = await ensureCtx();
  const seq = demoSequence(state.raga, state.sa);
  // finish with one deliberately wrong note (outside the raga, 25 cents sharp) to show the red flag
  const wrong = [5, 6, 11, 10, 3, 1, 8, 9, 2, 4].find(p => !state.raga.positions.has(p));
  if (wrong !== undefined) seq.push(state.sa * Math.pow(2, (wrong + 0.25) / 12));
  const sr = ctx.sampleRate, toneS = 0.7, gapS = 0.1;
  const buf = ctx.createBuffer(1, Math.floor((toneS + gapS) * sr) * seq.length, sr);
  const data = buf.getChannelData(0);
  seq.forEach((hz, i) => {
    const t = synthTone(hz, toneS, sr);
    const f = Math.floor(0.02 * sr);
    for (let k = 0; k < f; k++) { t[k] *= k / f; t[t.length - 1 - k] *= k / f; }
    data.set(t, i * Math.floor((toneS + gapS) * sr));
  });
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain(); gain.gain.value = 0.5;
  src.connect(gain);
  src.onended = () => { if (state.demo) stopSource(); };
  attach(gain, true);
  state.src = src; state.demo = true;
  src.start();
  $("demo").textContent = "Stop demo";
}

async function playSa() {
  const ctx = await ensureCtx();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "triangle"; o.frequency.value = state.sa;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 1.6);
}

const frame = new Float32Array(2048);
let lastAnalysis = 0;
function loop() {
  if (!state.running) { draw(); return; }
  const now = state.ctx.currentTime;
  if (now - lastAnalysis >= 0.025) {          // ~40 readings a second
    lastAnalysis = now;
    state.analyser.getFloatTimeDomainData(frame);
    let rms = 0;
    for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i];
    rms = Math.sqrt(rms / frame.length);
    const x = decimate2(frame);
    const hz = rms > 0.01 ? yin(x, state.ctx.sampleRate / 2) : null;
    const r = state.tracker.push(now - state.t0, hz, state.sa, state.raga, state.tol, state.just);
    state.last = r;
    showReading(r);
    updateStats();
  }
  draw();
  requestAnimationFrame(loop);
}

function colorFor(r) {
  return "--" + lightFor(r);
}

// Traffic light: green inside the in-tune band, yellow up to twice it, red beyond (or outside the raga).
function lightFor(r) {
  const off = Math.abs(r.cents);
  if (!r.inRaga || off > 2 * state.tol) return "bad";
  return off <= state.tol ? "ok" : "warn";
}

function showReading(r) {
  const c = $("rCents"), v = $("rVerdict");
  const lamps = { bad: $("lR"), warn: $("lY"), ok: $("lG") };
  for (const k in lamps) lamps[k].classList.remove("on");
  if (!r) { c.textContent = "–"; c.className = ""; v.textContent = "listening"; v.className = ""; return; }
  const cls = lightFor(r);
  lamps[cls].classList.add("on");
  const n = Math.round(r.cents);
  c.textContent = (n > 0 ? "+" : "") + n + "¢";
  c.className = cls;
  v.textContent = !r.inRaga ? "NOT IN RAGA" : r.verdict === "IN SHRUTHI" ? "IN SHRUTI" : r.cents > 0 ? "TOO HIGH" : "TOO LOW";
  v.className = cls;
}

function updateStats() {
  const n = state.tracker.notes;
  if (!n.length) { $("stats").textContent = "No steady notes yet."; return; }
  const ok = n.filter(x => x.r.verdict === "IN SHRUTHI").length;
  const out = n.filter(x => !x.r.inRaga).length;
  const avg = n.reduce((s, x) => s + Math.abs(x.r.cents), 0) / n.length;
  $("stats").textContent = `${n.length} steady notes · ${ok} in shruti (${Math.round(100 * ok / n.length)}%) · ` +
    `average error ${avg.toFixed(1)}¢ · ${out} outside the raga`;
}

function downloadCSV() {
  const rows = [["start_s","end_s","detected_hz","expected_hz","swara","octave","cents_off","verdict","in_raga","raga","sa_hz","tuning"]];
  for (const { start, end, r } of state.tracker.notes)
    rows.push([start.toFixed(2), end.toFixed(2), r.hz.toFixed(2), r.targetHz.toFixed(2), r.name, r.octave,
      r.cents.toFixed(1), r.verdict, r.inRaga ? "yes" : "no", state.raga.name, state.sa.toFixed(2), state.just ? "just" : "equal"]);
  const blob = new Blob([rows.map(r => r.join(",")).join("\n") + "\n"], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "swara-results.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------------------------------------------------------------- drawing
const VIEW_S = 10;           // seconds shown
const LO = -500, HI = 1900;  // cents from Sa: mandra Pa to tara Pa

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function draw() {
  const cv = $("cv"), dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const left = 92, right = w - 8, top = 8, bottom = h - 22;
  const y = c => bottom - (c - LO) / (HI - LO) * (bottom - top);
  const raga = state.raga;
  g.font = "13px " + cssVar("--font-head");
  g.textBaseline = "middle";
  // swara gridlines
  for (let oct = -1; oct <= 1; oct++) {
    for (let p = 0; p < 12; p++) {
      const c = oct * 1200 + (state.just ? 1200 * Math.log2(JUST_RATIO[p]) : 100 * p);
      if (c < LO || c > HI) continue;
      const inR = raga.positions.has(p);
      g.strokeStyle = cssVar(inR ? "--gridraga" : "--grid");
      g.lineWidth = inR ? (p === 0 ? 1.6 : 1) : 0.6;
      g.setLineDash(inR ? [] : [3, 4]);
      g.beginPath(); g.moveTo(left, y(c)); g.lineTo(right, y(c)); g.stroke();
      if (inR) {
        g.fillStyle = cssVar("--text");
        g.fillText(prettyName(raga.names[p] || DEFAULT_NAME[p], oct), 6, y(c));
      }
    }
  }
  g.setLineDash([]);
  // time axis
  const pts = state.tracker.points;
  const tEnd = pts.length ? Math.max(VIEW_S, pts[pts.length - 1].t) : VIEW_S;
  const tStart = tEnd - VIEW_S;
  const x = t => left + (t - tStart) / VIEW_S * (right - left);
  g.fillStyle = cssVar("--muted");
  g.textBaseline = "top";
  for (let s = Math.ceil(tStart); s <= tEnd; s++) g.fillText(s + "s", x(s) - 6, bottom + 6);
  // tolerance band around the current target
  const last = state.last;
  if (state.running && last) {
    const c0 = last.total - last.cents;
    g.fillStyle = cssVar("--ok"); g.globalAlpha = 0.12;
    g.fillRect(left, y(c0 + state.tol), right - left, y(c0 - state.tol) - y(c0 + state.tol));
    g.globalAlpha = 1;
  }
  // pitch trace, coloured by verdict; thin when moving (gamaka)
  g.lineCap = "round";
  let prev = null;
  for (const p of pts) {
    if (p.t < tStart || !p.r) { prev = null; continue; }
    const c = 1200 * Math.log2(p.r.hz / state.sa);
    if (c < LO - 100 || c > HI + 100) { prev = null; continue; }
    if (prev) {
      g.strokeStyle = cssVar(colorFor(p.r));
      g.lineWidth = p.r.steady ? 3 : 1.5;
      g.beginPath(); g.moveTo(x(prev.t), y(prev.c)); g.lineTo(x(p.t), y(c)); g.stroke();
    }
    prev = { t: p.t, c };
  }
  if (!pts.length) {
    g.fillStyle = cssVar("--muted"); g.textBaseline = "middle"; g.textAlign = "center";
    g.fillText("Press Start mic and sing, or press Demo", (left + right) / 2, (top + bottom) / 2);
    g.textAlign = "left";
  }
}

initControls();
refreshMics();
$("mic").addEventListener("change", () => {
  store("mic", $("mic").value);
  if (state.running && !state.demo) { stopSource(); startMic(); }
});
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener)
  navigator.mediaDevices.addEventListener("devicechange", refreshMics);
$("start").onclick = startMic;
$("demo").onclick = startDemo;
$("sa").onclick = playSa;
$("csv").onclick = downloadCSV;
$("clear").onclick = () => { state.tracker = new Tracker(); state.last = null; showReading(null); updateStats(); draw(); };
window.addEventListener("resize", draw);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

// ---------------------------------------------------------------- Swarantara page wiring
// Accessibility settings (shared with the rest of the site), redraw on any change.
Settings.applyToPage();
Settings.init();
Settings.onChange(() => requestAnimationFrame(draw));
// Show the page once the heading font is in (at most 1 s), like the other pages.
(function () {
  let done = false;
  const show = () => { if (done) return; done = true; requestAnimationFrame(() => { document.documentElement.classList.add("ready"); draw(); }); };
  if (document.fonts && document.fonts.load) {
    document.fonts.load('1em "Tiro Devanagari Sanskrit"', "स्वरान्तर").then(show, show);
    setTimeout(show, 1000);
  } else show();
})();
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("../sw.js").catch(() => {}); });
}
