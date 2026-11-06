/*
 * SWARANTARA: plays swaras with the Web Audio API (no recordings needed).
 * A soft plucked, veena-like tone.
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
    var t0 = c.currentTime + 0.15;
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

  root.Audio2 = {
    unlock: unlock,
    playSequence: playSequence,
    playOne: playOne,
    stop: stop,
    get playing() { return playing; },
    supported: !!(window.AudioContext || window.webkitAudioContext)
  };
})(window);
