/*
 * SWARANTARA: all the words on the page, in English (en) and Sanskrit (sa).
 *
 * To change any text, edit it here. {curly} words are filled in by the page.
 * The Sanskrit was written carefully, but please ask a Sanskrit teacher to
 * check it before the exhibition.
 */
(function (root) {
  var STR = {
    en: {
      "meta.title": "SWARANTARA · Katapayadi Decoder",
      "skip": "Skip to the decoder",
      "brand.sub": "The Katapayadi code of the 72 Melakarta ragas",
      "settings.open": "Accessibility settings",

      "hero.title": "Every raga hides its number in its name",
      "hero.body": "Over 300 years ago, musicologists arranged the 72 parent (Melakarta) ragas of Carnatic music in a mathematical order. Then they named each raga so that its first two syllables encode its number, using the ancient Katapayadi system. Type a raga below and watch the algorithm decode it.",

      "dec.title": "Decode a raga",
      "dec.label": "Raga name, in English letters or Devanagari",
      "dec.placeholder": "e.g. Harikambhoji or हरिकाम्भोजी",
      "dec.go": "Decode",
      "dec.try": "Try:",
      "dec.suggest": "Matching ragas",
      "dec.yourWord": "Your word in Devanagari:",
      "dec.notRaga": "This is not one of the 72 Melakarta names, but the Katapayadi algorithm still works on any word.",
      "dec.points": "Its number points to Melakarta {n}:",
      "dec.outOfRange": "It gives {n}, which is outside 1–72, so it is not a Melakarta number.",
      "dec.tooShort": "Please type a word with at least two syllables.",
      "dec.unknown": "The letter {l} is not in the Katapayadi table.",
      "dec.empty": "Type a raga name first.",

      "step.1": "Split into syllables",
      "step.1b": "The name is broken into aksharas (syllables).",
      "step.2": "Keep the first two syllables",
      "step.2b": "Only the first two syllables carry the number.",
      "step.3": "Find the number of each letter",
      "step.4": "Read the digits right to left",
      "step.4b": "Sanskrit numbers are written backwards: “aṅkānāṃ vāmato gatiḥ”, the digits go to the left.",
      "step.5": "The Melakarta number",

      "rule.vowel": "A vowel on its own counts as 0.",
      "rule.single": "{l} ({i}) is number {d} in the {g} group.",
      "rule.last": "Joined letter: the last consonant, {l} ({i}), counts. It is number {d} in the {g} group.",
      "rule.first": "Joined letter: in this name, by tradition, the first consonant {l} ({i}) counts. It is number {d} in the {g} group.",
      "rule.anusvara": "By tradition the ं (anusvāra) of the first syllable is read as म (ma), number 5.",
      "rule.irregular": "This popular name does not follow the rule: it gives {got}, but the raga is number {n}. Names sometimes changed over the centuries. A nice example for error analysis!",

      "res.mela": "Melakarta",
      "res.chakra": "Chakra {c} · {name}",
      "res.chakraWhy": "Chakra means “wheel”: the 72 are grouped into 12 wheels of 6. Its name is a number word: {meaning}.",
      "res.pos": "Raga {p} of 6 in this chakra",
      "res.aro": "Ārohaṇa (going up)",
      "res.ava": "Avarohaṇa (coming down)",
      "res.play": "Play the scale",
      "res.stop": "Stop",
      "res.sa": "Sa = G♯ (208 Hz)",
      "res.tanpura": "Tanpura",
      "res.tanpuraVol": "Tanpura volume",
      "res.tanpuraNote": "A recorded tanpura plays softly behind the scale and dips while the swaras sound. Sa is G♯, the pitch of the tanpura.",
      "res.tapSwara": "Tap a swara to hear it.",

      "math.title": "Why exactly 72?",
      "math.body": "Sa and Pa never change. Ri and Ga can be chosen in 6 ways, Dha and Ni in 6 ways, and Ma in 2 ways.",
      "math.formula": "6 × 6 × 2 = 72",
      "math.this": "For this raga: Ma choice {m} of 2 ({ma}), Ri–Ga choice {rg} of 6, Dha–Ni choice {dn} of 6.",
      "math.check": "Check: 36 × ({m} − 1) + 6 × ({rg} − 1) + {dn} = {n}",

      "rev.title": "From number to raga",
      "rev.body": "Go the other way: choose a number and find the raga that carries it.",
      "rev.label": "Melakarta number (1 to 72)",
      "rev.go": "Find the raga",
      "rev.bad": "Please choose a whole number from 1 to 72.",
      "rev.less": "One less",
      "rev.more": "One more",

      "chart.title": "The Katapayadi table",
      "chart.body": "The consonants are arranged in four groups. In each group they are counted 1, 2, 3 … and the tenth letter is 0. Tap a letter.",
      "chart.digit": "Number",
      "chart.tapped": "{l} ({i}) = {d}, in the {g} group.",
      "chart.zero": "Vowels on their own (अ, आ, इ …) count as 0.",

      "all.title": "All 72 Melakarta ragas",
      "all.body": "12 chakras of 6 ragas each. Tap any raga to decode it.",
      "all.half1": "Śuddha Madhyama ragas (1–36)",
      "all.half2": "Prati Madhyama ragas (37–72)",

      "how.title": "Computational thinking in an ancient code",
      "how.decomp": "Decomposition",
      "how.decompB": "The name is broken into syllables, and each syllable into letters.",
      "how.pattern": "Pattern recognition",
      "how.patternB": "Only the first two syllables matter, and the 72 ragas follow a fixed 6 × 6 × 2 pattern.",
      "how.abstract": "Abstraction",
      "how.abstractB": "Each letter stands for a digit, the way a variable stands for a value in code.",
      "how.algo": "Algorithm",
      "how.algoB": "The same exact steps always give the same answer, like a hash function that turns a name into an index.",

      "set.title": "Accessibility",
      "set.lang": "Language",
      "set.script": "Raga names in",
      "set.scriptDev": "Devanagari",
      "set.scriptLat": "English letters",
      "set.size": "Text size",
      "set.size1": "Default",
      "set.size2": "Large",
      "set.size3": "Larger",
      "set.size4": "Largest",
      "set.theme": "Colours",
      "set.themeAuto": "Automatic",
      "set.themeLight": "Light",
      "set.themeDark": "Dark",
      "set.contrast": "High contrast",
      "set.motion": "Reduce motion",
      "set.bg": "Moving background (petals and lamp sparks)",
      "set.reset": "Reset all",
      "set.close": "Close",

      "group.ka": "kādi",
      "group.ta": "ṭādi",
      "group.pa": "pādi",
      "group.ya": "yādi",

      "foot.made": "Made for the CBSE Science Exhibition 2026–27 · Mathematical Modelling and Computational Thinking",
      "foot.offline": "Works offline once loaded."
    },

    sa: {
      "meta.title": "स्वरान्तर · कटपयादि-विवरणम्",
      "skip": "विवरणं प्रति गच्छ",
      "brand.sub": "द्विसप्ततिमेलकर्तरागाणां कटपयादिसङ्केतः",
      "settings.open": "सुगमता-विकल्पाः",

      "hero.title": "प्रत्येकः रागः स्वनाम्नि स्वसङ्ख्यां गोपयति",
      "hero.body": "त्रिशताधिकवर्षेभ्यः पूर्वं सङ्गीतशास्त्रज्ञाः कर्णाटकसङ्गीतस्य द्विसप्ततिं मेलकर्तरागान् गणितक्रमेण न्यवेशयन्। ततः प्रत्येकस्य रागस्य नाम तथा अकुर्वन् यथा तस्य प्रथमे द्वे अक्षरे कटपयादिपद्धत्या तस्य सङ्ख्यां सूचयतः। अधः रागनाम लिखत, विधिः तत् कथं विवृणोति इति पश्यत।",

      "dec.title": "रागं विवृणु",
      "dec.label": "रागनाम, रोमनलिप्या देवनागर्या वा",
      "dec.placeholder": "यथा हरिकाम्भोजी अथवा Harikambhoji",
      "dec.go": "विवृणु",
      "dec.try": "प्रयतस्व :",
      "dec.suggest": "सदृशाः रागाः",
      "dec.yourWord": "देवनागर्यां तव शब्दः :",
      "dec.notRaga": "इदं द्विसप्ततिमेलकर्तनामसु नास्ति, तथापि कटपयादिविधिः सर्वेषु शब्देषु प्रवर्तते।",
      "dec.points": "अस्य सङ्ख्या {n} तमं मेलकर्तरागं सूचयति :",
      "dec.outOfRange": "अनेन {n} लभ्यते, या १–७२ इत्यस्मात् बहिः, अतः सा मेलकर्तसङ्ख्या न।",
      "dec.tooShort": "न्यूनातिन्यूनं द्व्यक्षरं शब्दं लिख।",
      "dec.unknown": "{l} इति वर्णः कटपयादिसारण्यां नास्ति।",
      "dec.empty": "प्रथमं रागनाम लिख।",

      "step.1": "अक्षरविभागः",
      "step.1b": "नाम अक्षरेषु विभज्यते।",
      "step.2": "प्रथमे द्वे अक्षरे गृहाण",
      "step.2b": "प्रथमे द्वे अक्षरे एव सङ्ख्यां वहतः।",
      "step.3": "प्रत्येकस्य वर्णस्य सङ्ख्या",
      "step.4": "अङ्कानां वामतो गतिः",
      "step.4b": "अङ्काः दक्षिणतः वामं पठ्यन्ते।",
      "step.5": "मेलकर्तसङ्ख्या",

      "rule.vowel": "केवलः स्वरः शून्यं गण्यते।",
      "rule.single": "{l} ({i}) {g}-वर्गे {d} सङ्ख्या।",
      "rule.last": "संयुक्ताक्षरे अन्तिमं व्यञ्जनं {l} ({i}) गण्यते। {g}-वर्गे तस्य सङ्ख्या {d}।",
      "rule.first": "अस्मिन् नाम्नि परम्परया संयुक्ताक्षरस्य प्रथमं व्यञ्जनं {l} ({i}) गण्यते। {g}-वर्गे तस्य सङ्ख्या {d}।",
      "rule.anusvara": "परम्परया प्रथमाक्षरस्य अनुस्वारः (ं) मकारः इति पठ्यते, अतः ५।",
      "rule.irregular": "इदं प्रसिद्धं नाम नियमं न अनुसरति : अनेन {got} लभ्यते, किन्तु रागस्य सङ्ख्या {n}। कालक्रमेण कानिचित् नामानि परिवर्तितानि।",

      "res.mela": "मेलकर्तः",
      "res.chakra": "{c} तमं चक्रम् · {name}",
      "res.chakraWhy": "द्विसप्ततिः रागाः षड्भिः षड्भिः द्वादशसु चक्रेषु विभक्ताः। चक्रनाम सङ्ख्यावाचकम् : {meaning}।",
      "res.pos": "अस्मिन् चक्रे षट्सु {p} तमः रागः",
      "res.aro": "आरोहणम्",
      "res.ava": "अवरोहणम्",
      "res.play": "स्वरान् वादय",
      "res.stop": "विरम",
      "res.sa": "षड्जः = G♯ (२०८ Hz)",
      "res.tanpura": "तानपूरा",
      "res.tanpuraVol": "तानपूरायाः ध्वनिः",
      "res.tanpuraNote": "स्वराणां पृष्ठतः मन्दं तानपूरा वाद्यते, स्वरवादनकाले च किञ्चित् शाम्यति। षड्जः G♯ इति तानपूरायाः स्वरः।",
      "res.tapSwara": "स्वरं श्रोतुं तं स्पृश।",

      "math.title": "किमर्थं द्विसप्ततिः एव?",
      "math.body": "षड्जपञ्चमौ अचलौ। ऋषभगान्धारयोः षड् विकल्पाः, धैवतनिषादयोः षड् विकल्पाः, मध्यमस्य द्वौ विकल्पौ।",
      "math.formula": "६ × ६ × २ = ७२",
      "math.this": "अस्य रागस्य : मध्यमविकल्पः {m}/२ ({ma}), ऋषभगान्धारविकल्पः {rg}/६, धैवतनिषादविकल्पः {dn}/६।",
      "math.check": "परीक्षा : ३६ × ({m} − १) + ६ × ({rg} − १) + {dn} = {n}",

      "rev.title": "सङ्ख्यातः रागः",
      "rev.body": "विपरीतक्रमेण : सङ्ख्यां चित्वा तां वहन्तं रागं अन्विष्य।",
      "rev.label": "मेलकर्तसङ्ख्या (१ तः ७२ पर्यन्तम्)",
      "rev.go": "रागम् अन्विष्य",
      "rev.bad": "१ तः ७२ पर्यन्तं पूर्णसङ्ख्यां चिनु।",
      "rev.less": "एकेन न्यूनम्",
      "rev.more": "एकेन अधिकम्",

      "chart.title": "कटपयादिसारणी",
      "chart.body": "व्यञ्जनानि चतुर्षु वर्गेषु विन्यस्तानि। प्रत्येकस्मिन् वर्गे तानि १, २, ३ … इति गण्यन्ते, दशमं च शून्यम्। वर्णं स्पृश।",
      "chart.digit": "सङ्ख्या",
      "chart.tapped": "{l} ({i}) = {d}, {g}-वर्गे।",
      "chart.zero": "केवलाः स्वराः (अ, आ, इ …) शून्यं गण्यन्ते।",

      "all.title": "द्विसप्ततिः मेलकर्तरागाः",
      "all.body": "द्वादश चक्राणि, प्रत्येकस्मिन् षड् रागाः। विवरणार्थं रागं स्पृश।",
      "all.half1": "शुद्धमध्यमरागाः (१–३६)",
      "all.half2": "प्रतिमध्यमरागाः (३७–७२)",

      "how.title": "प्राचीनसङ्केते सङ्गणकचिन्तनम्",
      "how.decomp": "विभजनम्",
      "how.decompB": "नाम अक्षरेषु, अक्षराणि च वर्णेषु विभज्यन्ते।",
      "how.pattern": "प्रतिरूपाभिज्ञानम्",
      "how.patternB": "प्रथमे द्वे अक्षरे एव प्रधाने, द्विसप्ततिः रागाः च ६ × ६ × २ इति नियतं प्रतिरूपम् अनुसरन्ति।",
      "how.abstract": "अमूर्तीकरणम्",
      "how.abstractB": "प्रत्येकः वर्णः अङ्कस्य स्थाने तिष्ठति, यथा सङ्केतलेखने चरः मूल्यस्य।",
      "how.algo": "विधिः (अल्गोरिद्म्)",
      "how.algoB": "समानाः सोपानाः सर्वदा समानं फलं ददति, यथा नाम सूच्यङ्के परिवर्तयन् ‘हैश्’ फलनम्।",

      "set.title": "सुगमता",
      "set.lang": "भाषा",
      "set.script": "रागनामलिपिः",
      "set.scriptDev": "देवनागरी",
      "set.scriptLat": "रोमनलिपिः",
      "set.size": "अक्षरपरिमाणम्",
      "set.size1": "सामान्यम्",
      "set.size2": "बृहत्",
      "set.size3": "बृहत्तरम्",
      "set.size4": "बृहत्तमम्",
      "set.theme": "वर्णाः",
      "set.themeAuto": "स्वयम्",
      "set.themeLight": "प्रकाशः",
      "set.themeDark": "अन्धकारः",
      "set.contrast": "उच्चविभेदः",
      "set.motion": "न्यूनं चलनम्",
      "set.bg": "चलत् पृष्ठभूमिः (पुष्पदलानि दीपकणाः च)",
      "set.reset": "पूर्ववत् कुरु",
      "set.close": "पिधेहि",

      "group.ka": "कादि",
      "group.ta": "टादि",
      "group.pa": "पादि",
      "group.ya": "यादि",

      "foot.made": "सी.बी.एस.ई. विज्ञानप्रदर्शनी २०२६–२७ निमित्तं निर्मितम् · गणितीयप्रतिरूपणं सङ्गणकचिन्तनं च",
      "foot.offline": "एकवारं उद्घाटितं चेत् अन्तर्जालं विना अपि कार्यं करोति।"
    }
  };

  var DEV_DIGITS = "०१२३४५६७८९";
  function devDigits(s) { return String(s).replace(/[0-9]/g, function (d) { return DEV_DIGITS[+d]; }); }

  var lang = "en";
  function t(key, vars) {
    var s = (STR[lang] && STR[lang][key]) || STR.en[key] || key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (_, k) {
        var v = vars[k];
        if (v === undefined) return "";
        return lang === "sa" && typeof v === "number" ? devDigits(v) : String(v);
      });
    }
    return s;
  }
  function num(n) { return lang === "sa" ? devDigits(n) : String(n); }

  function apply(rootEl) {
    var scope = rootEl || document;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
  }

  root.I18N = {
    t: t,
    num: num,
    apply: apply,
    get lang() { return lang; },
    setLang: function (l) {
      lang = STR[l] ? l : "en";
      document.documentElement.lang = lang;
      document.title = t("meta.title");
      apply();
    }
  };
})(window);
