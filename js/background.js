/*
 * SWARANTARA: moving background.
 * Marigold petals drift down and diya sparks rise, behind the page.
 * Like the rice on just-rice.github.io: they sway, shift a little when you
 * scroll, and move out of the way of a finger or mouse.
 *
 * Off when: the "Moving background" setting is off, or high contrast is on.
 * Still (one frame, no animation) when reduced motion is asked for.
 * Colours come from CSS tokens (--petal-1/2/3, --spark, --spark-glow).
 */
(function () {
  "use strict";
  var cv = document.getElementById("bg");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, petals = [], sparks = [], raf = 0, t = 0;
  var lastSy = window.scrollY || 0;
  var mouse = { x: -9999, y: -9999 };
  var colours = null;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function enabled() {
    return Settings.get("bg") !== false && !Settings.get("contrast");
  }
  function moving() { return enabled() && !Settings.reducedMotion(); }

  function readColours() {
    var cs = getComputedStyle(document.documentElement);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    colours = {
      petals: [v("--petal-1"), v("--petal-2"), v("--petal-3")],
      spark: v("--spark") || "214, 120, 20",
      glow: parseFloat(v("--spark-glow")) || 2
    };
  }

  function newPetal() {
    var z = rnd(0.5, 1);
    return { x: rnd(0, W), y: rnd(0, H), z: z, a: rnd(0, 6.28), va: rnd(-0.02, 0.02), sw: rnd(0, 6.28),
             f: rnd(0, 6.28), k: Math.floor(rnd(0, 3)), vx: 0, vy: 0 };
  }
  function newSpark(fromBottom) {
    var z = rnd(0.5, 1);
    return { x: rnd(0, W), y: fromBottom ? H + rnd(0, 40) : rnd(0, H), z: z, sw: rnd(0, 6.28), f: rnd(0, 6.28), vx: 0, vy: 0 };
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var area = W * H;
    petals = []; sparks = [];
    for (var i = 0; i < Math.round(area / 30000); i++) petals.push(newPetal());
    for (var j = 0; j < Math.round(area / 26000); j++) sparks.push(newSpark(false));
    readColours();
    draw(false);
  }

  // Gently push things away from a finger or mouse.
  function push(p, strength, r2) {
    var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
    if (d2 < r2) {
      var d = Math.sqrt(d2) || 1, f = (1 - d2 / r2) * strength;
      p.vx += dx / d * f; p.vy += dy / d * f;
    }
  }
  function wrap(p, pad) {
    if (p.y > H + pad) p.y -= H + 2 * pad; else if (p.y < -pad) p.y += H + 2 * pad;
    if (p.x > W + pad) p.x -= W + 2 * pad; else if (p.x < -pad) p.x += W + 2 * pad;
  }

  function draw(animate) {
    var sy = window.scrollY || 0, ds = sy - lastSy;
    lastSy = sy;
    ctx.clearRect(0, 0, W, H);
    if (!enabled()) return;
    if (animate) t++;

    // Diya sparks: rise, sway and flicker.
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      s.y -= ds * 0.2 * s.z;
      if (animate) {
        s.y -= 0.35 * s.z; s.sw += 0.02;
        push(s, 1.0, 12000);
        s.x += s.vx + Math.sin(s.sw) * 0.3; s.y += s.vy; s.vx *= 0.92; s.vy *= 0.92;
        if (s.y < -30) { sparks[i] = s = newSpark(true); }
      }
      wrap(s, 30);
      var flick = 0.55 + 0.45 * Math.sin(t * 0.08 + s.f * 3);
      var r = (2 * s.z + 1) * colours.glow;
      var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, "rgba(" + colours.spark + "," + (0.8 * flick * s.z) + ")");
      g.addColorStop(1, "rgba(" + colours.spark + ",0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.3); ctx.fill();
    }

    // Marigold petals: fall, sway and flip over.
    for (var k = 0; k < petals.length; k++) {
      var p = petals[k];
      p.y -= ds * 0.3 * p.z;
      if (animate) {
        p.y += 0.45 * p.z; p.sw += 0.014; p.a += p.va; p.f += 0.035;
        push(p, 1.5, 15000);
        p.x += p.vx + Math.sin(p.sw) * 0.55; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92;
      }
      wrap(p, 30);
      ctx.globalAlpha = 0.5 * p.z;
      ctx.fillStyle = colours.petals[p.k];
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.a);
      var flip = Math.cos(p.f);
      ctx.scale(flip * 0.8 + 0.2 * (flip < 0 ? -1 : 1), 1);
      var z = 6 * p.z + 3;
      ctx.beginPath();
      ctx.moveTo(0, -z);
      ctx.bezierCurveTo(z * 0.9, -z * 0.4, z * 0.7, z * 0.8, 0, z);
      ctx.bezierCurveTo(-z * 0.7, z * 0.8, -z * 0.9, -z * 0.4, 0, -z);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function loop() { draw(true); raf = requestAnimationFrame(loop); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function restart() {
    stop();
    readColours();
    cv.hidden = !enabled();
    draw(false);
    if (moving() && !document.hidden) loop();
  }

  var resizeTimer = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { resize(); restart(); }, 150); });
  window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener("pointerdown", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
  function away() { mouse.x = mouse.y = -9999; }
  document.addEventListener("pointerleave", away);
  window.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") away(); });
  window.addEventListener("blur", away);
  // When still (reduced motion), keep the frame in step with scrolling.
  window.addEventListener("scroll", function () { if (enabled() && !moving()) draw(false); }, { passive: true });
  document.addEventListener("visibilitychange", restart);
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var mr = matchMedia("(prefers-reduced-motion: reduce)");
    [mq, mr].forEach(function (m) {
      if (m.addEventListener) m.addEventListener("change", restart); else if (m.addListener) m.addListener(restart);
    });
  }
  Settings.onChange(function (k) {
    if (k === "bg" || k === "contrast" || k === "motion" || k === "theme" || k === "all") restart();
  });

  resize();
  restart();
})();
