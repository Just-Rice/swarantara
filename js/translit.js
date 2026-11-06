/*
 * SWARANTARA: simple English-letters → Devanagari converter.
 *
 * Lets visitors type a word in English letters ("harikambhoji", "Anagha")
 * and see it in Devanagari so it can be decoded.
 * It understands IAST letters (ā ī ū ṛ ṅ ñ ṭ ḍ ṇ ś ṣ ṃ ḷ) and common
 * everyday spellings (aa, ee, oo, sh, ch, th, dh ...).
 * English spelling is ambiguous (t can be ट or त), so the page always
 * shows the Devanagari it used. Typing in Devanagari is always exact.
 */
(function (root) {
  "use strict";

  // Longest patterns first.
  var CONS = [
    ["ksh", "क्ष"], ["chh", "छ"], ["jny", "ज्ञ"],
    ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["jh", "झ"], ["ṭh", "ठ"], ["ḍh", "ढ"],
    ["th", "त"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"], ["ṣh", "ष"],
    ["k", "क"], ["g", "ग"], ["ṅ", "ङ"], ["c", "च"], ["j", "ज"], ["ñ", "ञ"],
    ["ṭ", "ट"], ["ḍ", "ड"], ["ṇ", "ण"], ["t", "त"], ["d", "द"], ["n", "न"],
    ["p", "प"], ["f", "फ"], ["b", "ब"], ["m", "म"],
    ["y", "य"], ["r", "र"], ["l", "ल"], ["ḷ", "ळ"], ["v", "व"], ["w", "व"],
    ["ś", "श"], ["ṣ", "ष"], ["s", "स"], ["h", "ह"], ["z", "ज"], ["q", "क"], ["x", "क्स"]
  ];
  // [latin, independent vowel, vowel sign]
  var VOW = [
    ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ow", "औ", "ौ"],
    ["ee", "ई", "ी"], ["ii", "ई", "ी"], ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
    ["ā", "आ", "ा"], ["ī", "ई", "ी"], ["ū", "ऊ", "ू"], ["ṛ", "ऋ", "ृ"],
    ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"]
  ];

  function hasDevanagari(s) { return /[ऀ-ॿ]/.test(s); }

  function tokenize(word) {
    var t = [];
    var i = 0;
    outer: while (i < word.length) {
      var rest = word.slice(i);
      if (rest[0] === "ṃ" || rest[0] === "ṁ") { t.push({ type: "anu" }); i++; continue; }
      if (rest[0] === "ḥ") { t.push({ type: "vis" }); i++; continue; }
      for (var v = 0; v < VOW.length; v++) {
        if (rest.indexOf(VOW[v][0]) === 0) { t.push({ type: "V", ind: VOW[v][1], sign: VOW[v][2] }); i += VOW[v][0].length; continue outer; }
      }
      for (var c = 0; c < CONS.length; c++) {
        if (rest.indexOf(CONS[c][0]) === 0) { t.push({ type: "C", dev: CONS[c][1] }); i += CONS[c][0].length; continue outer; }
      }
      i++; // skip unknown characters
    }
    // "n" before a k/g sound is ङ, before c/j it is ञ.
    for (var k = 0; k < t.length - 1; k++) {
      if (t[k].type === "C" && t[k].dev === "न" && t[k + 1].type === "C") {
        var nx = t[k + 1].dev;
        if ("कखगघ".indexOf(nx) >= 0) t[k].dev = "ङ";
        else if ("चछजझ".indexOf(nx) >= 0) t[k].dev = "ञ";
      }
    }
    return t;
  }

  function wordToDev(word) {
    var t = tokenize(word);
    var out = "";
    for (var i = 0; i < t.length; i++) {
      var tok = t[i];
      var next = t[i + 1];
      if (tok.type === "C") {
        out += tok.dev;
        if (next && next.type === "V") { out += next.sign; i++; }
        else out += "्"; // no vowel follows: join to the next consonant
      } else if (tok.type === "V") {
        out += tok.ind;
      } else if (tok.type === "anu") {
        out += "ं";
      } else if (tok.type === "vis") {
        out += "ः";
      }
    }
    return out;
  }

  function toDevanagari(text) {
    var s = String(text || "").trim();
    if (!s || hasDevanagari(s)) return s;
    return s.toLowerCase().normalize("NFC").split(/[\s\-]+/).map(wordToDev).join(" ");
  }

  // Loose "skeleton" of a spelling, used to match what people type to raga names.
  function skeleton(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z]/g, "")
      .replace(/ksh/g, "ks").replace(/sh/g, "s").replace(/ch/g, "c").replace(/th/g, "t").replace(/dh/g, "d")
      .replace(/bh/g, "b").replace(/kh/g, "k").replace(/gh/g, "g").replace(/ph/g, "p").replace(/jh/g, "j")
      .replace(/ow/g, "au").replace(/w/g, "v").replace(/ee/g, "i").replace(/oo/g, "u")
      .replace(/(.)\1+/g, "$1");
  }

  root.Translit = { toDevanagari: toDevanagari, skeleton: skeleton, hasDevanagari: hasDevanagari };
})(typeof window !== "undefined" ? window : globalThis);
