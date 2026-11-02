/*
 * Shared audio helper.
 * Plays a raga's recording if it exists in /audio. Otherwise it plays a
 * soft tanpura-style placeholder drone made with the Web Audio API.
 * All volume changes go through one gain node so fades are smooth.
 */
(function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  }

  // Call this at the very start of a click/tap handler (iPhones need it).
  function unlockAudio() {
    const c = getCtx();
    if (c.state !== "running") c.resume().catch(() => {});
  }

  async function fileExists(url) {
    if (location.protocol === "file:") return false;
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      const type = res.headers.get("content-type") || "";
      return res.ok && !type.includes("text/html");
    } catch (e) {
      return false;
    }
  }

  /* Placeholder tanpura: four plucked strings, repeating. */
  class Drone {
    constructor(c, out, opts) {
      this.c = c;
      this.out = out;
      const sa = 146.83; // D3
      const second = opts && opts.second === "ma" ? 4 / 3 : 3 / 2;
      // Pa (or Ma) below, Sa, Sa, then low Sa: the classic tanpura cycle.
      this.freqs = [(sa * second) / 2, sa, sa, sa / 2];
      this.i = 0;
      this.next = 0;
      this.timer = null;
    }
    start() {
      if (this.timer) return;
      this.next = this.c.currentTime + 0.05;
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 100);
    }
    schedule() {
      const ahead = this.c.currentTime + 0.4;
      while (this.next < ahead) {
        this.pluck(this.next, this.freqs[this.i % 4]);
        this.i++;
        this.next += this.i % 4 === 0 ? 1.7 : 1.15;
      }
    }
    pluck(t, f) {
      const c = this.c;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 5);
      g.connect(this.out);
      const partials = [1, 0.55, 0.4, 0.28, 0.18, 0.12, 0.08];
      partials.forEach((amp, n) => {
        const o = c.createOscillator();
        const og = c.createGain();
        o.type = "sine";
        o.frequency.value = f * (n + 1) * (1 + (Math.random() - 0.5) * 0.0015);
        og.gain.value = amp / 3;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 5.1);
      });
    }
    stop() {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  class RagaPlayer {
    constructor() {
      this.mode = null; // "recording" or "drone"
      this.audio = null;
      this.drone = null;
      this.master = null;
      this.loadId = 0;
    }

    // Prepare a raga. Resolves to "recording" or "drone".
    async load(raga) {
      this.stop();
      const id = ++this.loadId;
      this.loading = true;
      this.mode = null;
      const c = getCtx();
      const master = c.createGain();
      master.gain.value = 0.0001;
      master.connect(c.destination);

      const hasFile = raga.file ? await fileExists(raga.file) : false;
      if (id !== this.loadId) {
        master.disconnect();
        return this.mode;
      }
      this.master = master;
      this.loading = false;
      if (hasFile) {
        const a = new Audio(raga.file);
        a.loop = true;
        a.preload = "auto";
        c.createMediaElementSource(a).connect(master);
        this.audio = a;
        this.mode = "recording";
      } else {
        this.drone = new Drone(c, master, raga.drone);
        this.mode = "drone";
      }
      if (this.pendingPlay) {
        const p = this.pendingPlay;
        this.pendingPlay = null;
        this.play(p.volume, p.fade);
      }
      return this.mode;
    }

    play(volume = 1, fadeSeconds = 2) {
      unlockAudio();
      if (this.loading) {
        // Still checking for the recording: start as soon as it's ready.
        this.pendingPlay = { volume, fade: fadeSeconds };
        return;
      }
      if (this.audio) this.audio.play().catch(() => {});
      if (this.drone) this.drone.start();
      this.fadeTo(volume, fadeSeconds);
    }

    pause() {
      if (this.audio) this.audio.pause();
      if (ctx) ctx.suspend().catch(() => {});
    }

    resume() {
      unlockAudio();
      if (this.audio) this.audio.play().catch(() => {});
    }

    fadeTo(volume, seconds) {
      if (!this.master) return;
      const g = this.master.gain;
      const t = getCtx().currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(g.value, 0.0001), t);
      g.linearRampToValueAtTime(Math.max(volume, 0.0001), t + Math.max(seconds, 0.01));
    }

    stop() {
      this.loadId++;
      this.loading = false;
      this.pendingPlay = null;
      if (this.drone) this.drone.stop();
      if (this.audio) {
        this.audio.pause();
        this.audio.removeAttribute("src");
        this.audio.load();
      }
      if (this.master) {
        const m = this.master;
        this.fadeTo(0, 0.05);
        setTimeout(() => m.disconnect(), 200);
      }
      this.audio = null;
      this.drone = null;
      this.master = null;
    }
  }

  /* A stopwatch that can pause. Time is in seconds. */
  class Clock {
    constructor() {
      this.elapsed = 0;
      this.t0 = null;
    }
    start() {
      if (this.t0 == null) this.t0 = performance.now();
    }
    pause() {
      if (this.t0 != null) {
        this.elapsed += (performance.now() - this.t0) / 1000;
        this.t0 = null;
      }
    }
    get running() {
      return this.t0 != null;
    }
    get time() {
      return this.elapsed + (this.t0 != null ? (performance.now() - this.t0) / 1000 : 0);
    }
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  window.SwarAudio = { RagaPlayer, Clock, unlockAudio, formatTime };
})();
