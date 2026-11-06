/*
 * SWARANTARA: sound.
 * Swaras: a soft plucked, veena-like tone made with the Web Audio API.
 * Tanpura: a recorded loop (assets/audio/tanpura-gs.mp3), shifted to the chosen Sa.
 */
(function (root) {
  "use strict";
  var ctx = null;
  var master = null;
  var timers = [];
  var playing = false;
  // Every note of a playing scale goes through this one volume control,
  // so Stop can silence notes that are already scheduled for later.
  var seqBus = null;
  var seqOscs = [];

  function getCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      // Gentle low-pass for a warmer sound.
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 4200;
      master.connect(lp);
      lp.connect(ctx.destination);
    }
    return ctx;
  }

  // Call at the very start of a tap handler (iPhones need this).
  function unlock() {
    var c = getCtx();
    if (c && c.state !== "running") c.resume().catch(function () {});
  }

  // A plucked note: a few harmonics that fade at different speeds.
  function pluck(freq, when, dur, level, dest, oscList) {
    var c = getCtx();
    if (!c) return;
    var out = c.createGain();
    out.gain.setValueAtTime(0.0001, when);
    out.gain.exponentialRampToValueAtTime(level || 0.32, when + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    out.connect(dest || master);
    [[1, 1, 1], [2, 0.45, 0.7], [3, 0.22, 0.5], [4, 0.12, 0.35], [5, 0.06, 0.3]].forEach(function (h) {
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq * h[0];
      g.gain.setValueAtTime(h[1], when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * h[2]);
      o.connect(g);
      g.connect(out);
      o.start(when);
      o.stop(when + dur + 0.05);
      if (oscList) oscList.push(o);
    });
  }

  function stopNotes() {
    if (!ctx || !seqBus) return;
    var now = ctx.currentTime;
    var bus = seqBus;
    try {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + 0.06);
    } catch (e) {}
    seqOscs.forEach(function (o) { try { o.stop(now + 0.08); } catch (e) {} });
    setTimeout(function () { try { bus.disconnect(); } catch (e) {} }, 200);
    seqBus = null;
    seqOscs = [];
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    if (ctx) stopNotes();
    playing = false;
  }

  /*
   * playSequence(freqs, opts)
   *   opts.step     seconds per note (default 0.5)
   *   opts.delay    seconds to wait before the first note (default 0)
   *   opts.onNote   called with the index of the note now sounding
   *   opts.onEnd    called when finished (not called if stopped)
   */
  function playSequence(freqs, opts) {
    opts = opts || {};
    var c = getCtx();
    if (!c) return false;
    stop();
    playing = true;
    var step = opts.step || 0.5;
    var t0 = c.currentTime + 0.15 + (opts.delay || 0);
    seqBus = c.createGain();
    seqBus.gain.value = 1;
    seqBus.connect(master);
    freqs.forEach(function (f, i) {
      var when = t0 + i * step + (i >= freqs.length / 2 && opts.pauseAtHalf ? step : 0);
      pluck(f, when, Math.max(1.2, step * 2.4), null, seqBus, seqOscs);
      timers.push(setTimeout(function () { if (opts.onNote) opts.onNote(i); }, (when - c.currentTime) * 1000));
    });
    var endAt = (t0 + freqs.length * step + (opts.pauseAtHalf ? step : 0) + 0.6 - c.currentTime) * 1000;
    timers.push(setTimeout(function () {
      seqBus = null;
      seqOscs = [];
      playing = false;
      if (opts.onEnd) opts.onEnd();
    }, endAt));
    return true;
  }

  function playOne(freq) {
    var c = getCtx();
    if (!c) return;
    pluck(freq, c.currentTime + 0.02, 1.6);
  }

  /* ---------- Tanpura (recorded loop) ---------- */
  // The recording is a 6-cycle loop of a tanpura tuned to Sa = 208.06 Hz (G sharp).
  // The file has 0.5 s of lead-in, then LOOP seconds of music, then XFADE seconds
  // more, which overlap the start of the next copy so the joins are smooth.
  var TP = { url: "assets/audio/tanpura-gs.mp3", sa: 208.06, offset: 0.5, loop: 21.755, xfade: 2.0 };
  var TP_MAX = 0.22;      // gain at volume 100%; keeps the tanpura behind the swaras
  var TP_DUCK = 0.55;     // level while the scale plays (55%)
  var tpBuffer = null;
  var tpLoading = null;
  var tpVol = null;       // volume control (shared)
  var tpDuck = null;      // dips while the scale plays (shared)
  var tpRun = null;       // the loop that is playing now
  var tpVolume = 0.5;

  function tpNodes() {
    var c = getCtx();
    if (!tpVol) {
      tpDuck = c.createGain();
      tpDuck.gain.value = 1;
      tpDuck.connect(c.destination);
      tpVol = c.createGain();
      tpVol.gain.value = tpVolume * TP_MAX;
      tpVol.connect(tpDuck);
    }
  }

  function decode(c, data) {
    return new Promise(function (resolve, reject) {
      var p = c.decodeAudioData(data, resolve, reject); // callback form works in older Safari too
      if (p && p.then) p.then(resolve, reject);
    });
  }

  function loadTanpura() {
    var c = getCtx();
    if (!c) return Promise.reject(new Error("no audio"));
    if (tpBuffer) return Promise.resolve(tpBuffer);
    if (!tpLoading) {
      tpLoading = fetch(TP.url)
        .then(function (r) { if (!r.ok) throw new Error("tanpura " + r.status); return r.arrayBuffer(); })
        .then(function (data) { return decode(c, data); })
        .then(function (buf) { tpBuffer = buf; return buf; })
        .catch(function (e) { tpLoading = null; throw e; });
    }
    return tpLoading;
  }

  // Equal-power fade curves.
  var CURVE_IN = new Float32Array(64), CURVE_OUT = new Float32Array(64);
  for (var ci = 0; ci < 64; ci++) {
    CURVE_IN[ci] = Math.sin((ci / 63) * Math.PI / 2);
    CURVE_OUT[ci] = Math.cos((ci / 63) * Math.PI / 2);
  }

  function startRun(sa) {
    var c = getCtx();
    tpNodes();
    var rate = sa / TP.sa;
    var run = { rate: rate, sa: sa, bus: c.createGain(), sources: [], next: c.currentTime + 0.05, timer: null };
    run.bus.connect(tpVol);
    run.bus.gain.setValueAtTime(0.0001, c.currentTime);
    run.bus.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.5); // gentle fade in

    var seg = (TP.loop + TP.xfade) / rate; // real seconds each copy plays
    var hop = TP.loop / rate;               // a new copy starts every hop seconds
    var xf = TP.xfade / rate;
    function schedule() {
      // Keep about a minute scheduled, so the drone carries on even if the
      // phone slows down timers in the background.
      while (run.next < c.currentTime + 60) {
        var t = run.next;
        var src = c.createBufferSource();
        src.buffer = tpBuffer;
        src.playbackRate.value = rate;
        var g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.setValueCurveAtTime(CURVE_IN, t, xf);
        g.gain.setValueAtTime(1, t + seg - xf);
        g.gain.setValueCurveAtTime(CURVE_OUT, t + seg - xf, xf);
        src.connect(g);
        g.connect(run.bus);
        src.start(t, TP.offset, TP.loop + TP.xfade);
        src.stop(t + seg + 0.05);
        src.__end = t + seg + 0.05;
        run.sources.push(src);
        run.next = t + hop;
      }
      // forget copies that have finished
      run.sources = run.sources.filter(function (s) { return s.__end === undefined || s.__end > c.currentTime; });
    }
    schedule();
    run.timer = setInterval(schedule, 5000);
    return run;
  }

  function endRun(run, fade) {
    if (!run || !ctx) return;
    var now = ctx.currentTime;
    clearInterval(run.timer);
    try {
      run.bus.gain.cancelScheduledValues(now);
      run.bus.gain.setValueAtTime(Math.max(run.bus.gain.value, 0.0001), now);
      run.bus.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    } catch (e) {}
    run.sources.forEach(function (s) { try { s.stop(now + fade + 0.05); } catch (e) {} });
    setTimeout(function () { try { run.bus.disconnect(); } catch (e) {} }, (fade + 0.3) * 1000);
  }

  var tanpura = {
    // Start the drone at this Sa. Resolves when sound has started.
    start: function (sa) {
      return loadTanpura().then(function () {
        if (tpRun && Math.abs(tpRun.sa - sa) < 0.01) return;
        var old = tpRun;
        tpRun = startRun(sa);
        if (old) endRun(old, 1.2); // crossfade to the new pitch
      });
    },
    stop: function (fade) {
      endRun(tpRun, fade === undefined ? 1.2 : fade);
      tpRun = null;
      if (tpDuck) { try { tpDuck.gain.cancelScheduledValues(ctx.currentTime); tpDuck.gain.setValueAtTime(1, ctx.currentTime); } catch (e) {} }
    },
    setSa: function (sa) { if (tpRun) return tanpura.start(sa); return Promise.resolve(); },
    setVolume: function (v) {
      tpVolume = Math.max(0, Math.min(1, v));
      if (tpVol && ctx) {
        tpVol.gain.cancelScheduledValues(ctx.currentTime);
        tpVol.gain.setTargetAtTime(tpVolume * TP_MAX, ctx.currentTime, 0.08);
      }
    },
    get volume() { return tpVolume; },
    // Dip a little while the scale plays, and come back afterwards.
    duck: function (on) {
      if (!tpDuck || !ctx) return;
      var now = ctx.currentTime;
      tpDuck.gain.cancelScheduledValues(now);
      tpDuck.gain.setTargetAtTime(on ? TP_DUCK : 1, now, on ? 0.25 : 0.6);
    },
    get playing() { return !!tpRun; },
    preload: function () { return loadTanpura().catch(function () {}); },
    nativeSa: TP.sa
  };

  root.Audio2 = {
    unlock: unlock,
    playSequence: playSequence,
    playOne: playOne,
    stop: stop,
    tanpura: tanpura,
    get playing() { return playing; },
    supported: !!(window.AudioContext || window.webkitAudioContext)
  };
})(window);
