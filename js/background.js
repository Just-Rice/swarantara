/*
 * SWARANTARA: moving background.
 * Marigold petals drift down and diya sparks rise, behind the page.
 * Like the rice on just-rice.github.io: they sway, shift a little when you
 * scroll, and move out of the way of a finger or mouse.
 *
 * Off when: the "Moving background" setting is off, or high contrast is on.
 * Still (one frame, no animation) when reduced motion is asked for.
 * Colours come from CSS tokens (--petal-1/2/3, --spark, --spark-glow).
 *
 * Made to be light on phones:
 *  - each petal and spark is drawn once into a small picture ("sprite");
 *    every frame just stamps those pictures, no shapes or gradients are built
 *  - the canvas uses a modest resolution (the shapes are soft anyway)
 *  - movement follows the clock, so a slow frame never looks like slow motion
 *  - a phone gets a capped number of particles, and fewer still if it struggles
 *  - while the page is scrolling, the background updates every other frame
 */
(function () {
  "use strict";
  var cv = document.getElementById("bg");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d", { alpha: true });
  var W = 0, H = 0, dpr = 1, petals = [], sparks = [], raf = 0;
  var lastSy = window.scrollY || 0, lastTime = 0, frameNo = 0, scrolling = 0;
  var mouse = { x: -9999, y: -9999 };
  var sprites = null;          // { petals: [canvas x3], spark: canvas, sparkSize }
  var quality = 1;             // drops to 0.6 if the device struggles
  var slowFrames = 0, sampled = 0, skipOdd = false;

  var MAX_PETALS = 16, MAX_SPARKS = 20;   // ceilings for a phone-sized screen
  var PETAL_SIZE = 18;                    // sprite size in CSS px (largest petal)

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function enabled() { return Settings.get("bg") !== false && !Settings.get("contrast"); }
  function moving() { return enabled() && !Settings.reducedMotion(); }

  /* ---------- sprites: drawn once per theme / size ---------- */
  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    var g = c.getContext("2d"); g.scale(dpr, dpr);
    return { c: c, g: g };
  }
  function buildSprites() {
    var cs = getComputedStyle(document.documentElement);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    var colours = [v("--petal-1"), v("--petal-2"), v("--petal-3")];
    var spark = v("--spark") || "214, 120, 20";
    var glow = parseFloat(v("--spark-glow")) || 2;

    var petalSprites = colours.map(function (col) {
      var s = makeCanvas(PETAL_SIZE, PETAL_SIZE), g = s.g, z = PETAL_SIZE / 2 - 1;
      g.translate(PETAL_SIZE / 2, PETAL_SIZE / 2);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, -z);
      g.bezierCurveTo(z * 0.9, -z * 0.4, z * 0.7, z * 0.8, 0, z);
      g.bezierCurveTo(-z * 0.7, z * 0.8, -z * 0.9, -z * 0.4, 0, -z);
      g.fill();
      return s.c;
    });

    var r = 3 * glow;                       // radius of the largest spark
    var sp = makeCanvas(r * 2, r * 2);
    var grad = sp.g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(" + spark + ",0.9)");
    grad.addColorStop(0.35, "rgba(" + spark + ",0.45)");
    grad.addColorStop(1, "rgba(" + spark + ",0)");
    sp.g.fillStyle = grad;
    sp.g.fillRect(0, 0, r * 2, r * 2);

    sprites = { petals: petalSprites, spark: sp.c, sparkSize: r * 2 };
  }

  /* ---------- particles ---------- */
  function newPetal() {
    var z = rnd(0.5, 1);
    return { x: rnd(0, W), y: rnd(0, H), z: z, a: rnd(0, 6.28), va: rnd(-0.02, 0.02), sw: rnd(0, 6.28),
             f: rnd(0, 6.28), k: Math.floor(rnd(0, 3)), vx: 0, vy: 0 };
  }
  function newSpark(fromBottom) {
    var z = rnd(0.5, 1);
    return { x: rnd(0, W), y: fromBottom ? H + rnd(0, 40) : rnd(0, H), z: z, sw: rnd(0, 6.28), f: rnd(0, 6.28), vx: 0, vy: 0 };
  }
  function populate() {
    var area = W * H;
    var nP = Math.min(Math.round(area / 30000), Math.round(MAX_PETALS * Math.max(1, area / (400 * 860))));
    var nS = Math.min(Math.round(area / 26000), Math.round(MAX_SPARKS * Math.max(1, area / (400 * 860))));
    nP = Math.max(4, Math.round(nP * quality));
    nS = Math.max(4, Math.round(nS * quality));
    while (petals.length > nP) petals.pop();
    while (sparks.length > nS) sparks.pop();
    while (petals.length < nP) petals.push(newPetal());
    while (sparks.length < nS) sparks.push(newSpark(false));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    petals = []; sparks = [];
    buildSprites();
    populate();
  }

  // Gently push things away from a finger or mouse.
  function push(p, strength, r2, k) {
    var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
    if (d2 < r2) {
      var d = Math.sqrt(d2) || 1, f = (1 - d2 / r2) * strength * k;
      p.vx += dx / d * f; p.vy += dy / d * f;
    }
  }
  function wrap(p, pad) {
    if (p.y > H + pad) p.y -= H + 2 * pad; else if (p.y < -pad) p.y += H + 2 * pad;
    if (p.x > W + pad) p.x -= W + 2 * pad; else if (p.x < -pad) p.x += W + 2 * pad;
  }

  /* ---------- one frame ---------- */
  // k = how many 60-fps frames' worth of time has passed (1 at full speed).
  function draw(k, clock) {
    var sy = window.scrollY || 0, ds = sy - lastSy;
    lastSy = sy;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!enabled() || !sprites) return;
    var damp = Math.pow(0.92, k);

    // Diya sparks: rise, sway and flicker.
    var ss = sprites.sparkSize, sImg = sprites.spark;
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      s.y -= ds * 0.2 * s.z;
      if (k) {
        s.y -= 0.35 * s.z * k; s.sw += 0.02 * k;
        push(s, 1.0, 12000, k);
        s.x += s.vx + Math.sin(s.sw) * 0.3 * k; s.y += s.vy; s.vx *= damp; s.vy *= damp;
        if (s.y < -30) { sparks[i] = s = newSpark(true); }
      }
      wrap(s, 30);
      var size = ss * (0.45 + 0.55 * s.z);
      ctx.globalAlpha = (0.55 + 0.45 * Math.sin(clock * 0.0048 + s.f * 3)) * s.z;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(sImg, s.x - size / 2, s.y - size / 2, size, size);
    }

    // Marigold petals: fall, sway and flip over.
    for (var j = 0; j < petals.length; j++) {
      var p = petals[j];
      p.y -= ds * 0.3 * p.z;
      if (k) {
        p.y += 0.45 * p.z * k; p.sw += 0.014 * k; p.a += p.va * k; p.f += 0.035 * k;
        push(p, 1.5, 15000, k);
        p.x += p.vx + Math.sin(p.sw) * 0.55 * k; p.y += p.vy; p.vx *= damp; p.vy *= damp;
      }
      wrap(p, 30);
      var flip = Math.cos(p.f);
      var sx = (flip * 0.8 + 0.2 * (flip < 0 ? -1 : 1)) * (0.5 + 0.5 * p.z) * dpr;
      var sc = (0.5 + 0.5 * p.z) * dpr;
      var c = Math.cos(p.a), sn = Math.sin(p.a);
      // rotate, then flip horizontally, all in one transform
      ctx.setTransform(c * sx, sn * sx, -sn * sc, c * sc, p.x * dpr, p.y * dpr);
      ctx.globalAlpha = 0.5 * p.z;
      ctx.drawImage(sprites.petals[p.k], -PETAL_SIZE / 2, -PETAL_SIZE / 2, PETAL_SIZE, PETAL_SIZE);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- the loop ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!lastTime) { lastTime = now; return; }
    var elapsed = now - lastTime;

    // While scrolling, or on a struggling device, draw every other frame.
    frameNo++;
    if ((scrolling > 0 || skipOdd) && (frameNo & 1)) { if (scrolling > 0) scrolling--; return; }
    if (scrolling > 0) scrolling--;

    lastTime = now;
    var k = Math.min(elapsed / 16.67, 3);
    draw(k, now);

    // Watch for a struggling device during the first few seconds.
    if (sampled < 120) {
      sampled++;
      if (elapsed > 22) slowFrames++;
      if (sampled === 120 && slowFrames > 50) { quality = 0.6; skipOdd = true; populate(); }
    }
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
  function restart() {
    stop();
    cv.hidden = !enabled();
    if (!enabled()) return;
    buildSprites();
    draw(0, performance.now());
    if (moving() && !document.hidden) raf = requestAnimationFrame(loop);
  }

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); restart(); }, 150);
  });
  window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener("pointerdown", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  function away() { mouse.x = mouse.y = -9999; }
  document.addEventListener("pointerleave", away);
  window.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") away(); }, { passive: true });
  window.addEventListener("blur", away);
  window.addEventListener("scroll", function () {
    scrolling = 12; // about 0.2 s of lighter drawing after each scroll step
    if (enabled() && !moving()) draw(0, performance.now()); // still frame keeps up with scrolling
  }, { passive: true });
  document.addEventListener("visibilitychange", restart);
  if (window.matchMedia) {
    [matchMedia("(prefers-color-scheme: dark)"), matchMedia("(prefers-reduced-motion: reduce)")].forEach(function (m) {
      if (m.addEventListener) m.addEventListener("change", restart); else if (m.addListener) m.addListener(restart);
    });
  }
  Settings.onChange(function (key) {
    if (key === "bg" || key === "contrast" || key === "motion" || key === "theme" || key === "all") restart();
  });

  resize();
  restart();
})();
