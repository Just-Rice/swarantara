/* Sleep Mode: a sunset that fades to black while a night raga plays. */
(function () {
  const { ragas, sleepRagas } = window.SWARANTARA;
  const { RagaPlayer, Clock, unlockAudio, formatTime } = window.SwarAudio;

  const DURATIONS = [20, 25, 30]; // minutes
  const FADE_OUT = 120; // seconds of music fade at the end
  const VOLUME = 0.85;
  // ?speed=60 runs everything 60x faster (for testing and demos).
  const speed = Math.max(1, Number(new URLSearchParams(location.search).get("speed")) || 1);

  // Sunset keyframes: [progress, sun colour, horizon colour, sky colour, sun height %]
  const KEYS = [
    [0.0, [255, 214, 130], [240, 140, 75], [120, 60, 95], 78],
    [0.3, [255, 160, 80], [196, 72, 58], [74, 35, 80], 88],
    [0.6, [170, 50, 58], [74, 30, 63], [26, 20, 51], 100],
    [0.85, [60, 20, 36], [20, 12, 30], [7, 6, 12], 112],
    [1.0, [0, 0, 0], [0, 0, 0], [0, 0, 0], 125],
  ];

  const $ = (id) => document.getElementById(id);
  const player = new RagaPlayer();
  let minutes = DURATIONS[0];
  let ragaId = sleepRagas[0];
  let clock = null;
  let tick = null;
  let hideTimer = null;
  let fading = false;
  let ended = false;
  let wakeLock = null;

  /* ---------- setup form ---------- */
  const select = $("raga-select");
  sleepRagas.forEach((id) => {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = `${ragas[id].name} · ${ragas[id].mood}`;
    select.appendChild(o);
  });
  function showDesc() {
    $("raga-desc").textContent = ragas[ragaId].description;
  }
  select.addEventListener("change", () => {
    ragaId = select.value;
    showDesc();
    player.load(ragas[ragaId]);
  });
  showDesc();

  const chipBox = $("sleep-durations");
  DURATIONS.forEach((min) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = `${min} min`;
    b.setAttribute("aria-pressed", String(min === minutes));
    b.addEventListener("click", () => {
      minutes = min;
      chipBox.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
    });
    chipBox.appendChild(b);
  });

  player.load(ragas[ragaId]);

  /* ---------- colours ---------- */
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

  function paint(p) {
    p = Math.min(1, Math.max(0, p));
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = (p - a[0]) / (b[0] - a[0]);
    const sun = mix(a[1], b[1], t);
    const horizon = mix(a[2], b[2], t);
    const sky = mix(a[3], b[3], t);
    const y = a[4] + (b[4] - a[4]) * t;
    $("scene").style.background = `linear-gradient(to top, ${rgb(horizon)} 0%, ${rgb(sky)} 75%)`;
    const sunEl = $("sun");
    sunEl.style.top = y + "%";
    sunEl.style.background = `radial-gradient(circle, ${rgb(sun)} 0%, ${rgb(horizon)} 70%, transparent 72%)`;
    sunEl.style.opacity = String(1 - p * 0.9);
  }

  /* ---------- screen wake lock ---------- */
  async function keepAwake() {
    try {
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) {}
  }
  function releaseAwake() {
    try {
      if (wakeLock) wakeLock.release();
    } catch (e) {}
    wakeLock = null;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && clock && clock.running) keepAwake();
  });

  /* ---------- controls overlay ---------- */
  function showControls() {
    $("overlay").classList.remove("hide");
    $("scene-hint").hidden = true;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (clock && clock.running) $("overlay").classList.add("hide");
    }, 5000);
  }

  /* ---------- run ---------- */
  function start() {
    unlockAudio();
    const total = (minutes * 60) / speed;
    const fadeLen = Math.min(FADE_OUT / speed, total / 2);
    fading = false;
    ended = false;
    clock = new Clock();
    clock.start();

    const scene = $("scene");
    scene.hidden = false;
    $("goodnight").classList.remove("show");
    $("scene-raga").textContent = ragas[ragaId].name;
    $("scene-pause").textContent = "Pause";
    $("scene-pause").hidden = false;
    $("scene-stop").textContent = "Stop";
    paint(0);
    showControls();
    keepAwake();
    try {
      if (scene.requestFullscreen) scene.requestFullscreen().catch(() => {});
    } catch (e) {}

    player.play(VOLUME, 6);

    tick = setInterval(() => {
      $("scene-drone").hidden = player.mode !== "drone";
      const t = clock.time;
      const left = total - t;
      paint(t / total);
      $("scene-remaining").textContent = formatTime(left * speed) + " left";
      if (!fading && left <= fadeLen) {
        fading = true;
        player.fadeTo(0, Math.max(0.2, left));
      }
      if (t >= total) finish();
    }, 250);
  }

  function togglePause() {
    if (!clock || ended) return;
    if (clock.running) {
      clock.pause();
      player.pause();
      $("scene-pause").textContent = "Resume";
    } else {
      clock.start();
      player.resume();
      $("scene-pause").textContent = "Pause";
    }
    showControls();
  }

  function finish() {
    clearInterval(tick);
    ended = true;
    clock.pause();
    paint(1);
    player.stop();
    player.load(ragas[ragaId]); // ready for next time
    releaseAwake();
    $("overlay").classList.add("hide");
    $("scene-hint").hidden = true;
    $("goodnight").classList.add("show");
    setTimeout(() => $("goodnight").classList.remove("show"), 6000);
    $("scene-pause").hidden = true;
    $("scene-stop").textContent = "Close";
  }

  function close() {
    clearInterval(tick);
    clearTimeout(hideTimer);
    if (clock && !ended) {
      player.stop();
      player.load(ragas[ragaId]);
    }
    clock = null;
    releaseAwake();
    $("scene").hidden = true;
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) {}
  }

  $("sleep-start").addEventListener("click", start);
  $("scene").addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (ended) {
      $("overlay").classList.remove("hide");
      return;
    }
    showControls();
  });
  $("scene-pause").addEventListener("click", togglePause);
  $("scene-stop").addEventListener("click", close);
})();
