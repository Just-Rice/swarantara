/*
 * SWARANTARA: Katapayadi logic.
 *
 * Pure functions, no page code, so they can be tested with Node
 * (see tests/katapayadi.test.mjs).
 *
 *   syllabify(text)      split Devanagari text into aksharas (syllables)
 *   decode(text, opts)   run the Katapayadi algorithm step by step
 *   decodeMela(mela)     decode one of the 72 melakartas (uses its traditional notes)
 *   scale(n)             build the swaras of melakarta number n
 */
(function (root) {
  "use strict";

  /* ---------- 1. The Katapayadi table ---------- */
  // Four groups, named after their first letter: ka-adi, ta-adi, pa-adi, ya-adi.
  var GROUPS = [
    { id: "ka", dev: "कादि", iast: "kādi", letters: ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ"] },
    { id: "ta", dev: "टादि", iast: "ṭādi", letters: ["ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न"] },
    { id: "pa", dev: "पादि", iast: "pādi", letters: ["प", "फ", "ब", "भ", "म"] },
    { id: "ya", dev: "यादि", iast: "yādi", letters: ["य", "र", "ल", "व", "श", "ष", "स", "ह"] }
  ];
  // In every group the letters count 1, 2, 3 ... 9 and the tenth is 0.
  var DIGIT = {};
  var GROUP_OF = {};
  GROUPS.forEach(function (g) {
    g.letters.forEach(function (l, i) {
      DIGIT[l] = (i + 1) % 10;
      GROUP_OF[l] = g.id;
    });
  });

  // IAST spelling of each consonant (with the inherent "a"), for display.
  var IAST = {
    "क": "ka", "ख": "kha", "ग": "ga", "घ": "gha", "ङ": "ṅa", "च": "ca", "छ": "cha", "ज": "ja", "झ": "jha", "ञ": "ña",
    "ट": "ṭa", "ठ": "ṭha", "ड": "ḍa", "ढ": "ḍha", "ण": "ṇa", "त": "ta", "थ": "tha", "द": "da", "ध": "dha", "न": "na",
    "प": "pa", "फ": "pha", "ब": "ba", "भ": "bha", "म": "ma",
    "य": "ya", "र": "ra", "ल": "la", "व": "va", "श": "śa", "ष": "ṣa", "स": "sa", "ह": "ha"
  };

  /* ---------- 2. Splitting Devanagari into syllables ---------- */
  var VIRAMA = "्";
  var NUKTA = "़";
  function cp(c) { return c ? c.charCodeAt(0) : 0; }
  function isConsonant(c) { var x = cp(c); return (x >= 0x0915 && x <= 0x0939) || (x >= 0x0958 && x <= 0x095F); }
  function isIndepVowel(c) { var x = cp(c); return (x >= 0x0904 && x <= 0x0914) || x === 0x0960 || x === 0x0961; }
  function isMatra(c) { var x = cp(c); return (x >= 0x093E && x <= 0x094C) || x === 0x0962 || x === 0x0963 || x === 0x0955; }
  function isModifier(c) { var x = cp(c); return x === 0x0901 || x === 0x0902 || x === 0x0903; } // ँ ं ः
  function isJoiner(c) { return c === "‌" || c === "‍"; }

  // Nukta letters (क़ etc.) count as their base letter.
  var NUKTA_BASE = { "क़": "क", "ख़": "ख", "ग़": "ग", "ज़": "ज", "ड़": "ड", "ढ़": "ढ", "फ़": "फ", "य़": "य", "ळ": "ल" };
  function base(c) { return NUKTA_BASE[c] || c; }

  function syllabify(text) {
    var s = String(text || "").normalize("NFC");
    var out = [];
    var i = 0;
    while (i < s.length) {
      var c = s[i];
      if (isIndepVowel(c)) {
        var sv = { text: c, consonants: [], vowel: c, anusvara: false };
        i++;
        while (i < s.length && isModifier(s[i])) { if (s[i] === "ं") sv.anusvara = true; sv.text += s[i]; i++; }
        out.push(sv);
        continue;
      }
      if (isConsonant(c)) {
        var syl = { text: c, consonants: [base(c)], vowel: null, anusvara: false };
        i++;
        if (s[i] === NUKTA) { syl.text += NUKTA; i++; }
        // Conjunct: consonant + virama + consonant ...
        while (s[i] === VIRAMA) {
          var j = i + 1;
          while (j < s.length && isJoiner(s[j])) j++;
          if (isConsonant(s[j])) {
            syl.text += s.slice(i, j + 1);
            syl.consonants.push(base(s[j]));
            i = j + 1;
            if (s[i] === NUKTA) { syl.text += NUKTA; i++; }
          } else {
            break;
          }
        }
        if (s[i] === VIRAMA) {
          // A dead consonant at the end of a word (like the म् in -म्)
          // belongs to the syllable before it.
          syl.text += VIRAMA;
          i++;
          var prev = out[out.length - 1];
          if (prev && !prev.gap) { prev.text += syl.text; prev.coda = (prev.coda || "") + syl.text; continue; }
          syl.dead = true;
          out.push(syl);
          continue;
        }
        if (isMatra(s[i])) { syl.vowel = s[i]; syl.text += s[i]; i++; }
        while (i < s.length && isModifier(s[i])) { if (s[i] === "ं") syl.anusvara = true; syl.text += s[i]; i++; }
        out.push(syl);
        continue;
      }
      // Anything else (space, hyphen, punctuation): a word gap.
      if (out.length && !out[out.length - 1].gap && /\s|-/.test(c)) out.push({ gap: true, text: " " });
      i++;
    }
    return out.filter(function (x) { return !x.gap; });
  }

  /* ---------- 3. Which letter of a syllable carries the number ---------- */
  // rule: "vowel" (no consonant, counts 0), "single", "last" (conjunct, usual rule),
  //       "first" (conjunct, traditional exception), "anusvara" (ं read as म)
  function pick(syl, mode) {
    if (!syl.consonants.length) return { letter: syl.vowel, digit: 0, rule: "vowel" };
    if (syl.consonants.length === 1) {
      var l1 = syl.consonants[0];
      return { letter: l1, digit: DIGIT[l1], rule: "single" };
    }
    var l = mode === "first" ? syl.consonants[0] : syl.consonants[syl.consonants.length - 1];
    return { letter: l, digit: DIGIT[l], rule: mode === "first" ? "first" : "last" };
  }

  /*
   * decode(text, opts)
   *   opts.firstAt   syllable index (0 or 1) that uses the "first consonant" reading
   *   opts.anusvara  true: read the anusvara of syllable 1 as म for the second digit
   * Returns every step so the page can show the working.
   */
  function decode(text, opts) {
    opts = opts || {};
    var syls = syllabify(text);
    var res = { input: text, syllables: syls, picks: [], digits: [], number: null, ok: false };
    if (syls.length < 2) { res.error = "too-short"; return res; }
    for (var k = 0; k < 2; k++) {
      var p;
      if (k === 1 && opts.anusvara && syls[0].anusvara) {
        p = { letter: "म", digit: 5, rule: "anusvara" };
      } else {
        p = pick(syls[k], opts.firstAt === k ? "first" : "last");
      }
      if (p.digit === undefined) { res.error = "unknown-letter"; res.badLetter = p.letter; return res; }
      p.syllable = syls[k].text;
      p.group = p.rule === "vowel" ? null : GROUP_OF[p.letter];
      p.iast = p.rule === "vowel" ? null : IAST[p.letter];
      res.picks.push(p);
      res.digits.push(p.digit);
    }
    // Katapayadi numbers are read right to left ("ankanam vamato gatih").
    res.reversed = res.digits.slice().reverse();
    res.number = res.reversed[0] * 10 + res.reversed[1];
    res.ok = res.number >= 1 && res.number <= 72;
    return res;
  }

  function decodeMela(mela) {
    var r = decode(mela.dev, {
      firstAt: mela.kpFirst === null || mela.kpFirst === undefined ? undefined : mela.kpFirst,
      anusvara: mela.kpAnusvara
    });
    r.mela = mela;
    r.irregular = !!mela.kpIrregular;
    return r;
  }

  /* ---------- 4. From number to scale ---------- */
  // 12 swara positions (semitones above Sa) and their names.
  var SWARA = {
    S:  { semi: 0,  dev: "स",   name: ["Ṣaḍja", "षड्ज"], en: "Shadjam" },
    R1: { semi: 1,  dev: "रि₁", name: ["Śuddha Ṛṣabha", "शुद्ध ऋषभ"], en: "Shuddha Rishabham" },
    R2: { semi: 2,  dev: "रि₂", name: ["Catuśśruti Ṛṣabha", "चतुश्श्रुति ऋषभ"], en: "Chatushruti Rishabham" },
    R3: { semi: 3,  dev: "रि₃", name: ["Ṣaṭśruti Ṛṣabha", "षट्श्रुति ऋषभ"], en: "Shatshruti Rishabham" },
    G1: { semi: 2,  dev: "ग₁",  name: ["Śuddha Gāndhāra", "शुद्ध गान्धार"], en: "Shuddha Gandharam" },
    G2: { semi: 3,  dev: "ग₂",  name: ["Sādhāraṇa Gāndhāra", "साधारण गान्धार"], en: "Sadharana Gandharam" },
    G3: { semi: 4,  dev: "ग₃",  name: ["Antara Gāndhāra", "अन्तर गान्धार"], en: "Antara Gandharam" },
    M1: { semi: 5,  dev: "म₁",  name: ["Śuddha Madhyama", "शुद्ध मध्यम"], en: "Shuddha Madhyamam" },
    M2: { semi: 6,  dev: "म₂",  name: ["Prati Madhyama", "प्रति मध्यम"], en: "Prati Madhyamam" },
    P:  { semi: 7,  dev: "प",   name: ["Pañcama", "पञ्चम"], en: "Panchamam" },
    D1: { semi: 8,  dev: "ध₁",  name: ["Śuddha Dhaivata", "शुद्ध धैवत"], en: "Shuddha Dhaivatam" },
    D2: { semi: 9,  dev: "ध₂",  name: ["Catuśśruti Dhaivata", "चतुश्श्रुति धैवत"], en: "Chatushruti Dhaivatam" },
    D3: { semi: 10, dev: "ध₃",  name: ["Ṣaṭśruti Dhaivata", "षट्श्रुति धैवत"], en: "Shatshruti Dhaivatam" },
    N1: { semi: 9,  dev: "नि₁", name: ["Śuddha Niṣāda", "शुद्ध निषाद"], en: "Shuddha Nishadam" },
    N2: { semi: 10, dev: "नि₂", name: ["Kaiśikī Niṣāda", "कैशिकी निषाद"], en: "Kaishiki Nishadam" },
    N3: { semi: 11, dev: "नि₃", name: ["Kākalī Niṣāda", "काकली निषाद"], en: "Kakali Nishadam" },
    S2: { semi: 12, dev: "सं",  name: ["Tāra Ṣaḍja", "तार षड्ज"], en: "Upper Shadjam" }
  };
  // The 6 allowed pairs (the lower note must come before the higher one).
  var RG = [["R1", "G1"], ["R1", "G2"], ["R1", "G3"], ["R2", "G2"], ["R2", "G3"], ["R3", "G3"]];
  var DN = [["D1", "N1"], ["D1", "N2"], ["D1", "N3"], ["D2", "N2"], ["D2", "N3"], ["D3", "N3"]];

  function scale(n) {
    n = Number(n);
    if (!(n >= 1 && n <= 72)) return null;
    var i = n - 1;
    var ma = n <= 36 ? "M1" : "M2";
    var inHalf = i % 36;
    var rgIndex = Math.floor(inHalf / 6);     // which Ri-Ga pair (0-5)
    var dnIndex = i % 6;                      // which Dha-Ni pair (0-5)
    var chakra = Math.floor(i / 6);           // 0-11
    var keys = ["S", RG[rgIndex][0], RG[rgIndex][1], ma, "P", DN[dnIndex][0], DN[dnIndex][1], "S2"];
    return {
      n: n,
      ma: ma,
      chakra: chakra,
      positionInChakra: dnIndex + 1,
      rgIndex: rgIndex,
      dnIndex: dnIndex,
      arohana: keys,
      avarohana: keys.slice().reverse()
    };
  }

  // Just-intonation ratios for the 12 positions (Carnatic tuning is close to these).
  var RATIOS = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8, 2];
  var RATIO_TEXT = ["1:1", "16:15", "9:8", "6:5", "5:4", "4:3", "45:32", "3:2", "8:5", "5:3", "9:5", "15:8", "2:1"];

  root.Katapayadi = {
    GROUPS: GROUPS,
    DIGIT: DIGIT,
    IAST: IAST,
    SWARA: SWARA,
    RATIOS: RATIOS,
    RATIO_TEXT: RATIO_TEXT,
    syllabify: syllabify,
    decode: decode,
    decodeMela: decodeMela,
    scale: scale
  };
})(typeof window !== "undefined" ? window : globalThis);
