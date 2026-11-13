/*
 * SWARANTARA: "Geometric Progression in Tala" page (tala/).
 *
 * 1. The progression: speed level n has a_n = a · r^(n−1) notes per akshara.
 * 2. A metronome that plays the akshara pulse and the notes of the chosen level.
 * 3. A tap corrector that measures the visitor's speed against the target.
 */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function fmt(x) { return String(+(+x).toFixed(2)); }
  function ordinal(n) { return n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"); }
  function levelName(n) { return ordinal(n) + " kalam"; }
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  var S = { base: 60, r: 2, n: 4, k: 1, tala: 8 };
  function notesPerAkshara() { return Math.pow(S.r, S.k - 1); }
  function target() { return S.base * notesPerAkshara(); }   // notes per minute

  /* ---------- Drawings ---------- */
  function drawHero() {
    var svg = $("heroRing");
    svg.textContent = "";
    [[1, 60], [2, 95], [4, 130]].forEach(function (lv) {
      var per = lv[0], R = lv[1], count = 4 * per;
      svg.appendChild(svgEl("circle", { "class": "orbit", cx: 150, cy: 150, r: R }));
      for (var j = 0; j < count; j++) {
        var a = -Math.PI / 2 + j * 2 * Math.PI / count, beat = j % per === 0;
        svg.appendChild(svgEl("circle", {
          "class": beat ? "beat" : "note",
          cx: (150 + R * Math.cos(a)).toFixed(1), cy: (150 + R * Math.sin(a)).toFixed(1), r: beat ? 6 : 3.5
        }));
      }
    });
  }

  var akDots = [], hub = null;
  function drawRing() {
    var svg = $("ring"), N = S.tala, R = 112;
    svg.textContent = "";
    akDots = [];
    for (var i = 0; i < N; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / N;
      var c = svgEl("circle", {
        "class": "ak" + (i === 0 ? " sam" : ""),
        cx: (150 + R * Math.cos(a)).toFixed(1), cy: (150 + R * Math.sin(a)).toFixed(1), r: i === 0 ? 17 : 12
      });
      svg.appendChild(c);
      akDots.push(c);
    }
    hub = svgEl("circle", { "class": "hub", cx: 150, cy: 150, r: 58 });
    svg.appendChild(hub);
    var t1 = svgEl("text", { x: 150, y: 152, "font-size": 40 }); t1.textContent = N;
    var t2 = svgEl("text", { x: 150, y: 176, "font-size": 14, "class": "sub" }); t2.textContent = "aksharas";
    svg.appendChild(t1); svg.appendChild(t2);
    svg.setAttribute("aria-label", "Tala cycle of " + N + " aksharas");
  }
  function lightAkshara(i) {
    akDots.forEach(function (d, j) { d.classList.toggle("on", j === i); });
  }
  var hubTimer = 0;
  function flashHub() {
    if (!hub) return;
    hub.classList.add("on");
    clearTimeout(hubTimer);
    hubTimer = setTimeout(function () { if (hub) hub.classList.remove("on"); }, 70);
  }

  /* ---------- The progression ---------- */
  function render() {
    S.base = +$("base").value; S.r = +$("ratio").value; S.n = +$("nTerms").value;
    $("baseV").textContent = S.base + " per minute";
    $("ratioV").textContent = fmt(S.r);
    $("nV").textContent = S.n;

    var vals = [];
    for (var i = 0; i < S.n; i++) vals.push(Math.pow(S.r, i));
    var mx = vals[S.n - 1];
    var rows = $("rows");
    rows.textContent = "";
    vals.forEach(function (v, i) {
      var row = document.createElement("div");
      row.className = "gp-row";
      var name = document.createElement("span"); name.textContent = levelName(i + 1);
      var bar = document.createElement("div"); bar.className = "gp-bar";
      bar.style.width = (v / mx * 100).toFixed(1) + "%";
      bar.title = fmt(S.base * v) + " notes per minute";
      var val = document.createElement("b"); val.textContent = fmt(v) + "×";
      row.appendChild(name); row.appendChild(bar); row.appendChild(val);
      rows.appendChild(row);
    });

    var sum = (Math.pow(S.r, S.n) - 1) / (S.r - 1);   // r is never 1 here (slider starts at 1.25)
    $("sum").textContent = fmt(sum) + " notes";
    $("check").textContent = "Check: " + vals.slice(1).map(function (v, i) {
      return fmt(v) + " ÷ " + fmt(vals[i]) + " = " + fmt(v / vals[i]);
    }).join(", ") + ". The ratio is always the same, so this is a geometric progression.";

    var keep = S.k;
    var sel = $("kalam");
    sel.textContent = "";
    vals.forEach(function (v, i) {
      var o = document.createElement("option");
      o.value = i + 1;
      o.textContent = levelName(i + 1) + " (" + fmt(v) + (v === 1 ? " note" : " notes") + " per akshara)";
      sel.appendChild(o);
    });
    sel.value = Math.min(keep, S.n);
    update();
  }

  function update() {
    S.k = +$("kalam").value; S.tala = +$("tala").value;
    $("tNotes").textContent = fmt(notesPerAkshara());
    $("tBpm").textContent = fmt(target()) + " per minute";
    drawRing();
    resetTaps();
  }

  /* ---------- Metronome (Web Audio, scheduled a little ahead) ----------
     Two pulses run together: the akshara (beat) at the base tempo, and the
     notes of the chosen level at base × r^(k−1). Times are worked out from
     the start time and a counter (not added up step by step), so they never
     drift, and the beats stay on the beat even when r is not a whole number. */
  var ctx = null, bus = null, timer = 0, raf = 0, queue = [];
  var run = null;   // { start, akGap, noteGap, ai, ni }
  var playToken = 0;

  function audioCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  // kind: "sam" (first beat), "beat" (other aksharas), "note" (in between)
  function click(t, kind) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = kind === "sam" ? 1250 : kind === "beat" ? 930 : 620;
    var peak = kind === "note" ? 0.22 : 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.1);
  }

  var AHEAD = 0.15, EPS = 0.002;
  function schedule() {
    if (!run) return;
    var now = ctx.currentTime, horizon = now + AHEAD;
    // If the page was asleep, jump ahead instead of playing a burst of late clicks.
    var late = now - 0.03;
    if (run.start + run.ai * run.akGap < late) run.ai = Math.ceil((late - run.start) / run.akGap);
    if (run.start + run.ni * run.noteGap < late) run.ni = Math.ceil((late - run.start) / run.noteGap);
    for (;;) {
      var ta = run.start + run.ai * run.akGap, tn = run.start + run.ni * run.noteGap;
      if (Math.min(ta, tn) >= horizon) break;
      if (ta <= tn + EPS) {
        var ak = run.ai % S.tala;
        click(ta, ak === 0 ? "sam" : "beat");
        queue.push({ t: ta, ak: ak });
        run.ai++;
        if (Math.abs(ta - tn) <= EPS) run.ni++;   // the note on the beat is the beat itself
      } else {
        click(tn, "note");
        queue.push({ t: tn, ak: -1 });
        run.ni++;
      }
    }
  }

  function animate() {
    var now = ctx.currentTime;
    while (queue.length && queue[0].t <= now) {
      var q = queue.shift();
      if (q.ak >= 0) lightAkshara(q.ak);
      flashHub();
    }
    raf = requestAnimationFrame(animate);
  }

  function stop() {
    playToken++;
    clearInterval(timer); timer = 0;
    cancelAnimationFrame(raf); raf = 0;
    queue = []; run = null;
    if (bus) {
      // Silence clicks that were already scheduled.
      try { bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setValueAtTime(0, ctx.currentTime); } catch (e) {}
      try { bus.disconnect(); } catch (e) {}
      bus = null;
    }
    lightAkshara(-1);
    $("play").setAttribute("aria-pressed", "false");
  }

  function play() {
    stop();
    var c = audioCtx();
    if (!c) { $("audioNote").hidden = false; return; }
    // iPhone: play through the speaker even when the ring/silent switch is on.
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    var token = playToken;
    var begin = function () {
      if (token !== playToken) return;   // Stop was pressed while the sound was waking up
      bus = c.createGain(); bus.gain.value = 0.9; bus.connect(c.destination);
      run = { start: c.currentTime + 0.12, akGap: 60 / S.base, noteGap: 60 / target(), ai: 0, ni: 0 };
      schedule();
      timer = setInterval(schedule, 25);
      animate();
      $("play").setAttribute("aria-pressed", "true");
    };
    // Must be called inside the tap (iPhones), then start once the clock is running.
    if (c.state !== "running" && c.resume) {
      c.resume().then(begin, begin);
    } else {
      begin();
    }
  }

  /* ---------- Tap analysis ---------- */
  var taps = [];
  function resetTaps() {
    taps = [];
    ["mBpm", "mSd", "mLvl", "mDev"].forEach(function (i) { $(i).textContent = "–"; });
    $("needle").style.left = "50%";
    var v = $("verdict");
    v.textContent = "Waiting for your taps";
    v.className = "verdict";
    $("advice").textContent = "";
  }

  // An event's own time is the most exact moment of the tap. Older browsers gave
  // a different kind of number there, so fall back to the clock when it does not fit.
  function evTime(e) {
    var t = e && e.timeStamp, now = performance.now();
    return t > 0 && t <= now + 50 && t > now - 1000 ? t : now;
  }

  var padTimer = 0;
  function tap(when) {
    var now = when || performance.now();
    var pad = $("tap");
    pad.classList.add("hit");
    clearTimeout(padTimer);
    padTimer = setTimeout(function () { pad.classList.remove("hit"); }, 90);

    var T = target(), gapMs = 60000 / T;
    // A long pause starts a new reading (allowing for slow targets).
    if (taps.length && now - taps[taps.length - 1] > Math.max(2500, 2.5 * gapMs)) taps = [];
    taps.push(now);
    taps = taps.slice(-12);
    var v = $("verdict");
    if (taps.length < 3) { v.className = "verdict"; v.textContent = "Keep tapping…"; return; }

    var iv = taps.slice(1).map(function (t, i) { return t - taps[i]; });
    var mean = iv.reduce(function (a, b) { return a + b; }, 0) / iv.length;
    var sd = Math.sqrt(iv.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / iv.length) / mean * 100;
    var bpm = 60000 / mean, dev = (bpm - T) / T * 100;

    $("mBpm").textContent = fmt(bpm) + " per minute";
    $("mSd").textContent = sd < 8 ? "Steady" : "Uneven (" + fmt(sd) + "%)";
    $("mDev").textContent = (dev > 0 ? "+" : "") + fmt(dev) + "%";
    var lvl = 1 + Math.log(bpm / S.base) / Math.log(S.r);
    $("mLvl").textContent = isFinite(lvl) ? "Level " + fmt(lvl) : "–";
    $("needle").style.left = (50 + Math.max(-25, Math.min(25, dev)) * 2) + "%";

    var ok = Math.abs(dev) <= 4;
    v.className = "verdict " + (ok ? "good" : "bad");
    v.textContent = ok ? "In tala" : (dev > 0 ? "Too fast by " : "Too slow by ") + fmt(Math.abs(dev)) + "%";
    $("advice").textContent = ok
      ? (taps.length < 8 ? "Good so far. Keep going for a more reliable reading." : "Your speed matches the progression.")
      : (dev > 0 ? "Slow down" : "Speed up") + " by about " + fmt(Math.abs(bpm - T)) + " taps per minute. The target gap between notes is " +
        Math.round(gapMs) + " ms; yours is " + Math.round(mean) + " ms.";
  }

  /* ---------- Loading cover (see the <style> block in the page) ---------- */
  function reveal() {
    var done = false;
    function show() {
      if (done) return;
      done = true;
      requestAnimationFrame(function () { document.documentElement.classList.add("ready"); });
    }
    if (document.fonts && document.fonts.load) {
      document.fonts.load('1em "Tiro Devanagari Sanskrit"', "स्वरान्तर").then(show, show);
      setTimeout(show, 1000);
    } else {
      show();
    }
  }

  /* ---------- Wiring ---------- */
  function init() {
    Settings.applyToPage();
    Settings.init();

    drawHero();
    render();

    ["base", "ratio", "nTerms"].forEach(function (id) { $(id).addEventListener("input", function () { stop(); render(); }); });
    ["kalam", "tala"].forEach(function (id) { $(id).addEventListener("change", function () { stop(); update(); }); });
    $("play").addEventListener("click", play);
    $("stop").addEventListener("click", stop);
    $("reset").addEventListener("click", resetTaps);
    if (!(window.AudioContext || window.webkitAudioContext)) { $("audioNote").hidden = false; $("play").disabled = true; }

    var pad = $("tap");
    // Pointer: count the moment the finger or mouse goes down, using the event's own time.
    pad.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      tap(evTime(e));
    });
    // Space anywhere (except in a field or on another button), and Space or Enter on the pad.
    var lastKey = 0;
    document.addEventListener("keydown", function (e) {
      var isSpace = e.code === "Space" || e.key === " ";
      var onPad = document.activeElement === pad;
      if (!isSpace && !(onPad && e.key === "Enter")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var a = document.activeElement, tag = a ? a.tagName : "";
      if (!onPad && (/^(INPUT|SELECT|TEXTAREA|BUTTON|A|SUMMARY)$/.test(tag) || (a && a.isContentEditable))) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      if (e.repeat) return;
      lastKey = performance.now();
      tap(evTime(e));
    });
    // Screen readers and switch access "click" the pad without a pointer or a key.
    pad.addEventListener("click", function (e) {
      if (e.detail === 0 && performance.now() - lastKey > 150) tap(performance.now());
    });

    // Stop the pulse when the page is hidden (phone locked, tab changed).
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });

    reveal();

    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("../sw.js").catch(function () {}); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
