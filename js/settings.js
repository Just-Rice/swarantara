/*
 * SWARANTARA: accessibility settings.
 * Choices are saved on this device only (localStorage). If saving is not
 * allowed (private browsing), the settings still work until the page closes.
 */
(function (root) {
  "use strict";
  var KEY = "swarantara.settings.v1";
  var DEFAULTS = { lang: "en", script: "dev", size: "1", theme: "auto", contrast: false, motion: false, bg: true };
  var state = load();
  var listeners = [];

  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    var out = {};
    Object.keys(DEFAULTS).forEach(function (k) { out[k] = s[k] !== undefined ? s[k] : DEFAULTS[k]; });
    return out;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function applyToPage() {
    var html = document.documentElement;
    html.setAttribute("data-size", state.size);
    html.setAttribute("data-theme", state.theme);
    html.setAttribute("data-contrast", state.contrast ? "high" : "normal");
    html.setAttribute("data-motion", state.motion ? "reduce" : "full");
    html.setAttribute("data-script", state.script);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var dark = state.theme === "dark" || (state.theme === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
      meta.setAttribute("content", dark ? "#1c0f0b" : "#6b1414");
    }
    I18N.setLang(state.lang);
  }

  function set(k, v) {
    state[k] = v;
    save();
    applyToPage();
    syncForm();
    listeners.forEach(function (fn) { fn(k, v); });
  }

  function reset() {
    Object.keys(DEFAULTS).forEach(function (k) { state[k] = DEFAULTS[k]; });
    save();
    applyToPage();
    syncForm();
    listeners.forEach(function (fn) { fn("all"); });
  }

  /* ---- The settings dialog ---- */
  var dlg, form, opener;

  function syncForm() {
    if (!form) return;
    ["lang", "script", "size", "theme"].forEach(function (name) {
      form.querySelectorAll('input[name="' + name + '"]').forEach(function (r) { r.checked = r.value === String(state[name]); });
    });
    form.querySelector('input[name="contrast"]').checked = !!state.contrast;
    form.querySelector('input[name="motion"]').checked = !!state.motion;
    form.querySelector('input[name="bg"]').checked = state.bg !== false;
  }

  function open() {
    opener = document.activeElement;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    var first = form.querySelector("input:checked") || form.querySelector("input");
    if (first) first.focus();
  }
  function close() {
    if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
    if (opener && opener.focus) opener.focus();
  }

  function init() {
    dlg = document.getElementById("settings");
    form = document.getElementById("settings-form");
    document.getElementById("open-settings").addEventListener("click", open);
    dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); }); // tap outside
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); }); // Esc
    form.addEventListener("change", function (e) {
      var el = e.target;
      if (el.type === "checkbox") set(el.name, el.checked);
      else if (el.type === "radio") set(el.name, el.value);
    });
    document.getElementById("reset-settings").addEventListener("click", reset);
    syncForm();
    if (window.matchMedia) {
      var mq = matchMedia("(prefers-color-scheme: dark)");
      var onScheme = function () { if (state.theme === "auto") applyToPage(); };
      // Older Safari only has addListener.
      if (mq.addEventListener) mq.addEventListener("change", onScheme);
      else if (mq.addListener) mq.addListener(onScheme);
    }
  }

  root.Settings = {
    get: function (k) { return state[k]; },
    set: set,
    applyToPage: applyToPage,
    init: init,
    onChange: function (fn) { listeners.push(fn); },
    reducedMotion: function () {
      return state.motion || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  };
})(window);
