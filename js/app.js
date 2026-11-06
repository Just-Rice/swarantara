/*
 * SWARANTARA: page behaviour (decoder, reverse lookup, table, 72-raga grid).
 */
(function () {
  "use strict";
  var K = window.Katapayadi;
  var M = window.MELAKARTA;
  var T = window.Translit;
  var A = window.Audio2;
  var t = I18N.t;
  var num = I18N.num;

  var SUBSCRIPT = { "1": "₁", "2": "₂", "3": "₃" };
  var TRY = [28, 15, 22, 29, 65];
  var SA_OPTIONS = [220, 233.1, 240, 246.9, 261.6, 277.2, 293.7];
  var saHz = 240;
  var current = null; // what the decoder is showing: { kind: "mela", n } or { kind: "free", query }

  /* ---------- small helpers ---------- */
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = v;
        else if (k === "style") e.setAttribute("style", v);
        else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? "" : v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function useDev() { return Settings.get("script") === "dev"; }
  function reduced() { return Settings.reducedMotion(); }

  // Raga name in the chosen script, with the other script as a subtitle.
  function nameParts(m) {
    return useDev()
      ? { main: m.dev, mainLang: "sa", sub: m.iast, subLang: "sa-Latn" }
      : { main: m.iast, mainLang: "sa-Latn", sub: m.dev, subLang: "sa" };
  }
  function nameEl(m, cls) {
    var p = nameParts(m);
    return el("span", { class: "rname " + (cls || "") }, [
      el("span", { class: "rname-main", lang: p.mainLang, text: p.main }),
      el("span", { class: "rname-sub", lang: p.subLang, text: p.sub })
    ]);
  }
  function shortName(m) { return useDev() ? m.dev : m.iast; }

  function chakraName(ci) {
    var c = M.chakras[ci];
    return useDev() ? c[0] : c[1];
  }
  function swaraLabel(key) {
    if (useDev()) return K.SWARA[key].dev;
    if (key === "S2") return "Ṡ";
    return key[0] + (SUBSCRIPT[key[1]] || "");
  }
  function swaraFull(key) {
    var s = K.SWARA[key];
    return I18N.lang === "sa" ? s.name[1] : s.name[0];
  }
  function groupName(id) { return t("group." + id); }

  function scrollToEl(node) {
    node.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }

  /* ---------- finding a raga from what was typed ---------- */
  var index = M.list.map(function (m) {
    var keys = [m.en, m.iast].concat(m.aka).map(T.skeleton);
    return { m: m, keys: keys };
  });
  function stripDev(s) { return s.replace(/[\s‌‍]/g, "").normalize("NFC"); }

  function findMela(q) {
    q = String(q || "").trim();
    if (!q) return null;
    if (/^\d+$/.test(q)) { var n = +q; return n >= 1 && n <= 72 ? M.list[n - 1] : null; }
    if (T.hasDevanagari(q)) {
      var d = stripDev(q);
      for (var i = 0; i < M.list.length; i++) if (stripDev(M.list[i].dev) === d) return M.list[i];
      return null;
    }
    var sk = T.skeleton(q);
    for (var j = 0; j < index.length; j++) if (index[j].keys.indexOf(sk) >= 0) return index[j].m;
    return null;
  }

  function suggestions(q) {
    q = String(q || "").trim();
    if (q.length < 2) return [];
    var res = [];
    if (T.hasDevanagari(q)) {
      var d = stripDev(q);
      M.list.forEach(function (m) { if (stripDev(m.dev).indexOf(d) === 0) res.push(m); });
    } else {
      var sk = T.skeleton(q);
      if (!sk) return [];
      index.forEach(function (x) {
        if (x.keys.some(function (k) { return k.indexOf(sk) === 0; })) res.push(x.m);
      });
      if (res.length < 3) {
        index.forEach(function (x) {
          if (res.indexOf(x.m) < 0 && x.keys.some(function (k) { return k.indexOf(sk) > 0; })) res.push(x.m);
        });
      }
    }
    return res.slice(0, 6);
  }

  /* ---------- the step-by-step working ---------- */
  function tile(text, cls, lang) {
    return el("span", { class: "tile " + (cls || ""), lang: lang || "sa" }, [text]);
  }

  function stepItem(i, title, body, content) {
    return el("li", { class: "step", style: "--i:" + i }, [
      el("div", { class: "step-num", "aria-hidden": "true", text: num(i + 1) }),
      el("div", { class: "step-body" }, [
        el("h3", { text: title }),
        body ? el("p", { class: "muted", text: body }) : null,
        content
      ])
    ]);
  }

  function ruleText(p) {
    if (p.rule === "vowel") return t("rule.vowel");
    if (p.rule === "anusvara") return t("rule.anusvara");
    return t("rule." + p.rule, { l: p.letter, i: p.iast, d: p.digit, g: groupName(p.group) });
  }

  function renderSteps(r, mela) {
    var ol = el("ol", { class: "steps" + (reduced() ? "" : " animate") });

    // 1. all syllables
    var syl = el("div", { class: "tiles" });
    r.syllables.forEach(function (s, i) { syl.appendChild(tile(s.text, i < 2 ? "hl" : "")); });
    ol.appendChild(stepItem(0, t("step.1"), t("step.1b"), syl));

    // 2. first two
    var two = el("div", { class: "tiles" }, [tile(r.syllables[0].text, "hl big"), tile(r.syllables[1].text, "hl big")]);
    ol.appendChild(stepItem(1, t("step.2"), t("step.2b"), two));

    // 3. letter → digit
    var maps = el("ul", { class: "maps" });
    r.picks.forEach(function (p) {
      maps.appendChild(el("li", { class: "map" }, [
        el("div", { class: "map-row" }, [
          tile(p.syllable, ""),
          el("span", { class: "arrow", "aria-hidden": "true", text: "→" }),
          tile(p.letter, "hl"),
          el("span", { class: "arrow", "aria-hidden": "true", text: "→" }),
          el("span", { class: "digit", text: num(p.digit) })
        ]),
        el("p", { class: "small rule rule-" + p.rule, text: ruleText(p) })
      ]));
    });
    ol.appendChild(stepItem(2, t("step.3"), null, maps));

    // 4. reverse
    var rev = el("div", { class: "reverse-row" }, [
      el("span", { class: "digits", text: num(r.digits[0]) + " " + num(r.digits[1]) }),
      el("span", { class: "flip", "aria-hidden": "true" }, [svgFlip()]),
      el("span", { class: "digits hl", text: num(r.reversed[0]) + " " + num(r.reversed[1]) })
    ]);
    ol.appendChild(stepItem(3, t("step.4"), t("step.4b"), rev));

    // 5. number
    var five = el("div", { class: "final-num" }, [el("span", { class: "medallion", text: num(r.number) })]);
    if (mela && r.irregular) five.appendChild(el("p", { class: "note warn", text: t("rule.irregular", { got: r.number, n: mela.n }) }));
    ol.appendChild(stepItem(4, t("step.5"), null, five));
    return ol;
  }

  function svgFlip() {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", "28");
    s.setAttribute("height", "28");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("fill", "currentColor");
    p.setAttribute("d", "M7 7h10.2l-2.6-2.6L16 3l5 5-5 5-1.4-1.4 2.6-2.6H7V7Zm10 10H6.8l2.6 2.6L8 21l-5-5 5-5 1.4 1.4L6.8 15H17v2Z");
    s.appendChild(p);
    return s;
  }

  /* ---------- the result card (scale, audio, maths) ---------- */
  function freqOf(key) { return saHz * K.RATIOS[K.SWARA[key].semi]; }

  function renderResult(m) {
    var sc = K.scale(m.n);
    var card = el("div", { class: "result" });

    var chakra = M.chakras[sc.chakra];
    card.appendChild(el("div", { class: "result-head" }, [
      el("span", { class: "medallion big", text: num(m.n) }),
      el("div", {}, [
        el("p", { class: "eyebrow", text: t("res.mela") + " " + num(m.n) }),
        nameEl(m, "big"),
        el("p", { class: "small", text: t("res.chakra", { c: sc.chakra + 1, name: chakraName(sc.chakra) }) + " · " + t("res.pos", { p: sc.positionInChakra }) }),
        el("p", { class: "small muted", text: t("res.chakraWhy", { meaning: I18N.lang === "sa" ? chakra[0] + " = " + num(sc.chakra + 1) : chakra[2] }) })
      ])
    ]));

    // swaras
    var idx = 0;
    function row(label, keys) {
      var ul = el("ul", { class: "swaras" });
      keys.forEach(function (k) {
        var i = idx++;
        ul.appendChild(el("li", {}, [
          el("button", {
            type: "button", class: "swara", "data-idx": i, lang: useDev() ? "sa" : "sa-Latn",
            "aria-label": swaraLabel(k) + " · " + swaraFull(k) + " · " + K.RATIO_TEXT[K.SWARA[k].semi],
            title: swaraFull(k) + " · " + K.RATIO_TEXT[K.SWARA[k].semi],
            onclick: function () { A.unlock(); A.playOne(freqOf(k)); }
          }, [
            el("span", { class: "sw", text: swaraLabel(k) }),
            el("span", { class: "ratio", text: K.RATIO_TEXT[K.SWARA[k].semi] })
          ])
        ]));
      });
      return el("div", { class: "swara-row" }, [el("h4", { text: label }), ul]);
    }
    card.appendChild(row(t("res.aro"), sc.arohana));
    card.appendChild(row(t("res.ava"), sc.avarohana));
    card.appendChild(el("p", { class: "small muted", text: t("res.tapSwara") }));

    // audio controls
    if (A.supported) {
      var sel = el("select", { id: "sa-select" });
      SA_OPTIONS.forEach(function (f) {
        var o = el("option", { value: f, text: num(Math.round(f * 10) / 10) + " Hz" });
        if (f === saHz) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () { saHz = +sel.value; });
      var playBtn = el("button", { type: "button", class: "btn primary play", "aria-pressed": "false" }, [
        el("span", { class: "play-ico", "aria-hidden": "true", text: "▶" }),
        el("span", { class: "play-txt", text: t("res.play") })
      ]);
      playBtn.addEventListener("click", function () {
        A.unlock();
        var chips = card.querySelectorAll(".swara");
        function clear() { chips.forEach(function (c) { c.classList.remove("sounding"); }); }
        function setIdle() {
          playBtn.setAttribute("aria-pressed", "false");
          playBtn.querySelector(".play-ico").textContent = "▶";
          playBtn.querySelector(".play-txt").textContent = t("res.play");
          clear();
        }
        if (A.playing) { A.stop(); setIdle(); return; }
        var keys = sc.arohana.concat(sc.avarohana);
        playBtn.setAttribute("aria-pressed", "true");
        playBtn.querySelector(".play-ico").textContent = "■";
        playBtn.querySelector(".play-txt").textContent = t("res.stop");
        A.playSequence(keys.map(freqOf), {
          step: 0.48, pauseAtHalf: true,
          onNote: function (i) { clear(); if (chips[i]) chips[i].classList.add("sounding"); },
          onEnd: setIdle
        });
      });
      card.appendChild(el("div", { class: "audio-row" }, [
        playBtn,
        el("label", { class: "sa-label", for: "sa-select" }, [t("res.sa")]),
        sel
      ]));
    }

    // maths: why 72
    var maChoice = sc.ma === "M1" ? 1 : 2;
    card.appendChild(el("div", { class: "math" }, [
      el("h4", { text: t("math.title") }),
      el("p", { text: t("math.body") }),
      el("p", { class: "formula", text: t("math.formula") }),
      el("p", { text: t("math.this", { m: maChoice, ma: swaraLabel(sc.ma), rg: sc.rgIndex + 1, dn: sc.dnIndex + 1 }) }),
      el("p", { class: "formula small", text: t("math.check", { m: maChoice, rg: sc.rgIndex + 1, dn: sc.dnIndex + 1, n: m.n }) })
    ]));
    return card;
  }

  /* ---------- showing a decode ---------- */
  function announce(text) { $("decode-status").textContent = text; }

  function showMela(m, opts) {
    A.stop();
    hideSuggest();
    current = { kind: "mela", n: m.n };
    var r = K.decodeMela(m);
    var out = $("decode-out");
    out.textContent = "";
    out.appendChild(el("div", { class: "decoding-for" }, [nameEl(m, "big")]));
    out.appendChild(renderSteps(r, m));
    out.appendChild(renderResult(m));
    announce(shortName(m) + " · " + t("res.mela") + " " + num(m.n));
    if (opts && opts.scroll) scrollToEl($("decoder"));
  }

  function showFree(query) {
    A.stop();
    current = { kind: "free", query: query };
    var out = $("decode-out");
    out.textContent = "";
    var dev = T.toDevanagari(query);
    var r = K.decode(dev);
    var head = el("div", { class: "free-head" }, [
      el("p", { class: "muted", text: t("dec.notRaga") })
    ]);
    if (!T.hasDevanagari(query)) {
      head.appendChild(el("p", {}, [t("dec.yourWord") + " ", el("strong", { lang: "sa", class: "devword", text: dev })]));
    }
    out.appendChild(head);
    if (r.error === "too-short") { out.appendChild(el("p", { class: "error", text: t("dec.tooShort") })); announce(t("dec.tooShort")); return; }
    if (r.error === "unknown-letter") { out.appendChild(el("p", { class: "error", text: t("dec.unknown", { l: r.badLetter }) })); announce(t("dec.unknown", { l: r.badLetter })); return; }
    out.appendChild(renderSteps(r, null));
    if (r.ok) {
      var m = M.list[r.number - 1];
      out.appendChild(el("p", { class: "points" }, [t("dec.points", { n: r.number }) + " "]));
      out.appendChild(renderResult(m));
      announce(dev + " → " + num(r.number) + " · " + shortName(m));
    } else {
      out.appendChild(el("p", { class: "note", text: t("dec.outOfRange", { n: r.number }) }));
      announce(dev + " → " + num(r.number));
    }
  }

  function decodeQuery(q) {
    q = String(q || "").trim();
    hideSuggest();
    if (!q) { A.stop(); current = null; $("decode-out").textContent = ""; $("decode-out").appendChild(el("p", { class: "error", text: t("dec.empty") })); announce(t("dec.empty")); return; }
    var m = findMela(q);
    if (m) showMela(m);
    else if (/^\d+$/.test(q)) {
      // A number that is not 1-72
      A.stop(); current = null;
      $("decode-out").textContent = "";
      $("decode-out").appendChild(el("p", { class: "error", text: t("rev.bad") }));
      announce(t("rev.bad"));
    }
    else showFree(q);
  }

  /* ---------- suggestions while typing ---------- */
  function hideSuggest() { $("suggest").hidden = true; $("suggest-status").textContent = ""; }
  function showSuggest(list) {
    var ul = $("suggest-list");
    ul.textContent = "";
    if (!list.length) { hideSuggest(); return; }
    list.forEach(function (m) {
      ul.appendChild(el("li", {}, [el("button", {
        type: "button", class: "chip",
        onclick: function () { $("raga-input").value = useDev() ? m.dev : m.en; showMela(m); }
      }, [el("span", { class: "chip-n", text: num(m.n) }), " ", el("span", { lang: useDev() ? "sa" : "sa-Latn", text: shortName(m) })])]));
    });
    $("suggest").hidden = false;
    $("suggest-status").textContent = t("dec.suggest") + ": " + list.length;
  }

  /* ---------- static parts ---------- */
  function renderTry() {
    var ul = $("try-list");
    ul.textContent = "";
    TRY.forEach(function (n) {
      var m = M.list[n - 1];
      ul.appendChild(el("li", {}, [el("button", {
        type: "button", class: "chip",
        onclick: function () { $("raga-input").value = useDev() ? m.dev : m.en; showMela(m); }
      }, [el("span", { lang: useDev() ? "sa" : "sa-Latn", text: shortName(m) })])]));
    });
  }

  function renderChart() {
    var grid = $("chart-grid");
    grid.textContent = "";
    K.GROUPS.forEach(function (g) {
      var letters = el("ul", { class: "kp-letters" });
      g.letters.forEach(function (l) {
        var d = K.DIGIT[l];
        letters.appendChild(el("li", {}, [el("button", {
          type: "button", class: "kp-letter",
          "aria-label": l + " " + K.IAST[l] + " = " + d,
          onclick: function (e) {
            grid.querySelectorAll(".kp-letter.on").forEach(function (b) { b.classList.remove("on"); });
            e.currentTarget.classList.add("on");
            $("chart-out").textContent = t("chart.tapped", { l: l, i: K.IAST[l], d: d, g: groupName(g.id) });
          }
        }, [
          el("span", { class: "kp-l", lang: "sa", text: l }),
          el("span", { class: "kp-i", lang: "sa-Latn", text: K.IAST[l] }),
          el("span", { class: "kp-d", text: num(d) })
        ])]));
      });
      grid.appendChild(el("div", { class: "kp-group" }, [
        el("h3", {}, [el("span", { lang: "sa", text: g.dev }), " ", el("span", { class: "muted small", lang: "sa-Latn", text: g.iast })]),
        letters
      ]));
    });
  }

  function renderAll() {
    var host = $("all-grid");
    host.textContent = "";
    [0, 1].forEach(function (half) {
      var wrap = el("div", { class: "half" }, [el("h3", { class: "half-title", text: t(half ? "all.half2" : "all.half1") })]);
      var chakras = el("div", { class: "chakras" });
      for (var c = half * 6; c < half * 6 + 6; c++) {
        var ul = el("ul", { class: "chakra-list" });
        for (var k = 0; k < 6; k++) {
          (function (m) {
            ul.appendChild(el("li", {}, [el("button", {
              type: "button", class: "raga-btn",
              onclick: function () { $("raga-input").value = useDev() ? m.dev : m.en; showMela(m, { scroll: true }); }
            }, [
              el("span", { class: "raga-n", text: num(m.n) }),
              el("span", { class: "raga-name", lang: useDev() ? "sa" : "sa-Latn", text: shortName(m) })
            ])]));
          })(M.list[c * 6 + k]);
        }
        chakras.appendChild(el("div", { class: "chakra" }, [
          el("h4", {}, [el("span", { class: "chakra-n", text: num(c + 1) }), " ", el("span", { lang: useDev() ? "sa" : "sa-Latn", text: chakraName(c) })]),
          ul
        ]));
      }
      wrap.appendChild(chakras);
      host.appendChild(wrap);
    });
  }

  function renderAllDynamic() {
    renderTry();
    renderChart();
    renderAll();
    $("chart-out").textContent = "";
    if (current && current.kind === "mela") showMela(M.list[current.n - 1]);
    else if (current && current.kind === "free") showFree(current.query);
  }

  /* ---------- wiring ---------- */
  function init() {
    Settings.applyToPage();
    Settings.init();

    $("decode-form").addEventListener("submit", function (e) { e.preventDefault(); decodeQuery($("raga-input").value); });
    $("raga-input").addEventListener("input", function (e) { showSuggest(suggestions(e.target.value)); });
    $("raga-input").addEventListener("keydown", function (e) { if (e.key === "Escape") hideSuggest(); });

    var numInput = $("num-input");
    function clamp(v) { v = Math.round(+v); return v >= 1 && v <= 72 ? v : null; }
    function bump(d) {
      var v = clamp(numInput.value) || 28;
      v = ((v - 1 + d + 72) % 72) + 1;
      numInput.value = v;
    }
    $("num-dec").addEventListener("click", function () { bump(-1); });
    $("num-inc").addEventListener("click", function () { bump(1); });
    $("reverse-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = clamp(numInput.value);
      var err = $("rev-error");
      if (!v || String(+numInput.value) !== String(v)) { err.textContent = t("rev.bad"); err.hidden = false; return; }
      err.hidden = true;
      var m = M.list[v - 1];
      $("raga-input").value = useDev() ? m.dev : m.en;
      showMela(m, { scroll: true });
    });

    Settings.onChange(function (k) {
      if (k === "lang" || k === "script" || k === "all") {
        renderAllDynamic();
        var err = $("rev-error");
        if (!err.hidden) err.textContent = t("rev.bad");
      }
    });

    renderAllDynamic();
    // Start with an example so the page never looks empty.
    showMela(M.list[27]);

    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
