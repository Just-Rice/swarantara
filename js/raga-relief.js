/* Raga Relief: mood → raga → before/after rating. */
(function () {
  const { ragas, moods } = window.SWARANTARA;
  const { RagaPlayer, Clock, unlockAudio, formatTime } = window.SwarAudio;

  const STORE_KEY = "swarantara.sessions";
  const DURATIONS = [3, 5, 10]; // minutes
  const SCALE = [
    { v: 1, emoji: "😞", label: "Very low" },
    { v: 2, emoji: "🙁", label: "Low" },
    { v: 3, emoji: "😐", label: "Okay" },
    { v: 4, emoji: "🙂", label: "Good" },
    { v: 5, emoji: "😄", label: "Great" },
  ];
  // ?speed=60 makes the timer run 60x faster (for testing and demos).
  const speed = Math.max(1, Number(new URLSearchParams(location.search).get("speed")) || 1);

  const $ = (id) => document.getElementById(id);
  const steps = ["step-mood", "step-before", "step-listen", "step-after", "step-result"];
  const player = new RagaPlayer();

  const state = { mood: null, raga: null, before: null, after: null, minutes: 5, listened: 0 };
  let clock = null;
  let tickTimer = null;
  let breathTimer = null;

  function show(id) {
    steps.forEach((s) => ($(s).hidden = s !== id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- storage (fails safely in private mode) ---------- */
  function loadSessions() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveSessions(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function renderStats() {
    const list = loadSessions();
    $("stats").hidden = list.length === 0;
    if (!list.length) return;
    const deltas = list.map((s) => s.after - s.before);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const better = deltas.filter((d) => d > 0).length / deltas.length;
    $("stat-count").textContent = list.length;
    $("stat-avg").textContent = (avg > 0 ? "+" : "") + avg.toFixed(1);
    $("stat-better").textContent = Math.round(better * 100) + "%";
  }

  /* ---------- builders ---------- */
  function buildMoods() {
    const grid = $("mood-grid");
    moods.forEach((m) => {
      const b = document.createElement("button");
      b.className = "mood";
      b.type = "button";
      b.innerHTML = `<span class="emoji" aria-hidden="true">${m.emoji}</span><span></span>`;
      b.lastChild.textContent = m.label;
      b.addEventListener("click", () => pickMood(m));
      grid.appendChild(b);
    });
  }

  function buildScale(container, onPick) {
    SCALE.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = `<span class="emoji" aria-hidden="true">${s.emoji}</span><span>${s.v} · ${s.label}</span>`;
      b.addEventListener("click", () => {
        container.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        onPick(s.v);
      });
      container.appendChild(b);
    });
  }

  function resetScale(container) {
    container.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
  }

  function buildDurations() {
    const box = $("duration-chips");
    DURATIONS.forEach((min) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = `${min} min`;
      b.setAttribute("aria-pressed", String(min === state.minutes));
      b.addEventListener("click", () => {
        state.minutes = min;
        box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
      });
      box.appendChild(b);
    });
  }

  function renderRagaCard(raga, mood) {
    const card = $("raga-preview");
    card.innerHTML = `
      <p class="eyebrow">Your raga for feeling ${escapeHtml(mood.label.toLowerCase())}</p>
      <p class="name">${escapeHtml(raga.name)}</p>
      <div class="raga-meta"><span>🕰 ${escapeHtml(raga.time)}</span><span>✨ ${escapeHtml(raga.mood)}</span></div>
      <p>${escapeHtml(raga.description)}</p>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- flow ---------- */
  function pickMood(mood) {
    unlockAudio();
    state.mood = mood;
    state.raga = ragas[mood.raga];
    state.before = null;
    resetScale($("scale-before"));
    $("start-listening").disabled = true;
    renderRagaCard(state.raga, mood);
    player.load(state.raga); // prepare audio while the user rates
    show("step-before");
  }

  function startListening() {
    unlockAudio();
    const total = (state.minutes * 60) / speed;
    clock = new Clock();
    clock.start();
    $("listen-name").textContent = state.raga.name;
    $("pause-btn").textContent = "Pause";
    $("step-listen").classList.remove("paused");
    $("drone-notice").hidden = player.mode !== "drone";
    player.play(1, 3);
    show("step-listen");

    let inhale = true;
    $("breath-label").textContent = "Breathe in";
    breathTimer = setInterval(() => {
      if (!clock.running) return;
      inhale = !inhale;
      $("breath-label").textContent = inhale ? "Breathe in" : "Breathe out";
    }, 4000);

    let fading = false;
    tickTimer = setInterval(() => {
      // The mode may only become known after loading finishes.
      $("drone-notice").hidden = player.mode !== "drone";
      const t = clock.time;
      $("listen-progress").style.width = Math.min(100, (t / total) * 100) + "%";
      $("listen-time").textContent = formatTime((total - t) * speed) + " left";
      if (!fading && total - t <= 4 / speed) {
        fading = true;
        player.fadeTo(0, Math.max(0.2, total - t));
      }
      if (t >= total) finishListening();
    }, 250);
  }

  function togglePause() {
    if (!clock) return;
    if (clock.running) {
      clock.pause();
      player.pause();
      $("pause-btn").textContent = "Resume";
      $("step-listen").classList.add("paused");
    } else {
      clock.start();
      player.resume();
      $("pause-btn").textContent = "Pause";
      $("step-listen").classList.remove("paused");
    }
  }

  function finishListening() {
    if (!clock) return;
    clearInterval(tickTimer);
    clearInterval(breathTimer);
    state.listened = Math.min(state.minutes * 60, Math.round(clock.time * speed));
    clock = null;
    player.resume(); // in case we finished while paused, so the fade can run
    player.fadeTo(0, 1.5);
    setTimeout(() => player.stop(), 1600);
    state.after = null;
    resetScale($("scale-after"));
    $("save-btn").disabled = true;
    show("step-after");
  }

  function saveResult() {
    const entry = {
      time: new Date().toISOString(),
      mood: state.mood.id,
      raga: state.raga.name,
      before: state.before,
      after: state.after,
      listenedSeconds: state.listened,
    };
    const list = loadSessions();
    list.push(entry);
    saveSessions(list);

    const d = state.after - state.before;
    $("result-big").innerHTML = `${state.before} → ${state.after} <span class="delta ${d > 0 ? "up" : ""}">(${d > 0 ? "+" : ""}${d})</span>`;
    $("result-text").textContent =
      d > 0
        ? `You felt better after listening to Raga ${state.raga.name}. Thank you for taking part in our research!`
        : d === 0
        ? `You felt about the same after Raga ${state.raga.name}. That's useful data too. Thank you for taking part!`
        : `You felt a little lower after Raga ${state.raga.name}. Every honest answer helps our research. Thank you!`;
    renderStats();
    show("step-result");
  }

  function exportCsv() {
    const list = loadSessions();
    const header = "time,mood,raga,before,after,change,listened_seconds";
    const rows = list.map((s) =>
      [s.time, s.mood, `"${s.raga}"`, s.before, s.after, s.after - s.before, s.listenedSeconds].join(",")
    );
    const blob = new Blob([header + "\n" + rows.join("\n") + "\n"], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "swarantara-raga-relief.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function clearData() {
    if (!confirm("Delete all Raga Relief results saved on this device?")) return;
    saveSessions([]);
    renderStats();
  }

  /* ---------- wire up ---------- */
  buildMoods();
  buildDurations();
  buildScale($("scale-before"), (v) => {
    state.before = v;
    $("start-listening").disabled = false;
  });
  buildScale($("scale-after"), (v) => {
    state.after = v;
    $("save-btn").disabled = false;
  });
  $("start-listening").addEventListener("click", startListening);
  $("back-to-mood").addEventListener("click", () => {
    player.stop();
    show("step-mood");
  });
  $("pause-btn").addEventListener("click", togglePause);
  $("finish-btn").addEventListener("click", finishListening);
  $("save-btn").addEventListener("click", saveResult);
  $("again-btn").addEventListener("click", () => show("step-mood"));
  $("export-btn").addEventListener("click", exportCsv);
  $("clear-btn").addEventListener("click", clearData);
  renderStats();
})();
