/*
 * SWARANTARA: the 72 Melakarta ragas.
 *
 * Each row: [number, Devanagari, IAST (scholarly spelling), everyday spelling, other names]
 *
 * Katapayadi notes (used by js/katapayadi.js):
 *  - The usual rule is: in a conjunct letter (like क्र or त्न), the LAST consonant counts.
 *  - By tradition, a few names count the FIRST consonant of the conjunct instead.
 *    Those are listed in KP_FIRST below: { mela number: [which syllable, 0 or 1] }.
 *  - In mela 57 the anusvara (ं) of "Siṃ" is read as म (ma = 5).
 *  - Mela 20's common name, Naṭabhairavī, does not follow the rule (it gives 10).
 *
 * Please have a music teacher check spellings before the exhibition.
 */
(function (root) {
  var ROWS = [
    [1, "कनकाङ्गी", "Kanakāṅgī", "Kanakangi", []],
    [2, "रत्नाङ्गी", "Ratnāṅgī", "Ratnangi", []],
    [3, "गानमूर्ति", "Gānamūrti", "Ganamurthi", ["ganamurti"]],
    [4, "वनस्पति", "Vanaspati", "Vanaspathi", []],
    [5, "मानवती", "Mānavatī", "Manavathi", []],
    [6, "तानरूपी", "Tānarūpī", "Thanarupi", ["tanarupi"]],
    [7, "सेनावती", "Senāvatī", "Senavathi", []],
    [8, "हनुमतोडी", "Hanumatoḍī", "Hanumathodi", ["todi", "thodi"]],
    [9, "धेनुका", "Dhenukā", "Dhenuka", []],
    [10, "नाटकप्रिया", "Nāṭakapriyā", "Natakapriya", []],
    [11, "कोकिलप्रिया", "Kokilapriyā", "Kokilapriya", []],
    [12, "रूपवती", "Rūpavatī", "Rupavathi", []],
    [13, "गायकप्रिया", "Gāyakapriyā", "Gayakapriya", []],
    [14, "वकुलाभरणम्", "Vakulābharaṇam", "Vakulabharanam", []],
    [15, "मायामालवगौल", "Māyāmālavagaula", "Mayamalavagowla", ["mayamalavagaula"]],
    [16, "चक्रवाकम्", "Cakravākam", "Chakravakam", []],
    [17, "सूर्यकान्तम्", "Sūryakāntam", "Suryakantham", []],
    [18, "हाटकाम्बरी", "Hāṭakāmbarī", "Hatakambari", []],
    [19, "झङ्कारध्वनि", "Jhaṅkāradhvani", "Jhankaradhwani", []],
    [20, "नटभैरवी", "Naṭabhairavī", "Natabhairavi", []],
    [21, "कीरवाणी", "Kīravāṇī", "Keeravani", ["kiravani"]],
    [22, "खरहरप्रिया", "Kharaharapriyā", "Kharaharapriya", []],
    [23, "गौरीमनोहरी", "Gaurīmanoharī", "Gowrimanohari", []],
    [24, "वरुणप्रिया", "Varuṇapriyā", "Varunapriya", []],
    [25, "माररञ्जनी", "Mārarañjanī", "Mararanjani", []],
    [26, "चारुकेशी", "Cārukeśī", "Charukesi", []],
    [27, "सरसाङ्गी", "Sarasāṅgī", "Sarasangi", []],
    [28, "हरिकाम्भोजी", "Harikāmbhojī", "Harikambhoji", []],
    [29, "धीरशङ्कराभरणम्", "Dhīraśaṅkarābharaṇam", "Dheerashankarabharanam", ["shankarabharanam", "sankarabharanam"]],
    [30, "नागनन्दिनी", "Nāganandinī", "Naganandini", []],
    [31, "यागप्रिया", "Yāgapriyā", "Yagapriya", []],
    [32, "रागवर्धनी", "Rāgavardhanī", "Ragavardhini", []],
    [33, "गाङ्गेयभूषणी", "Gāṅgeyabhūṣaṇī", "Gangeyabhushani", []],
    [34, "वागधीश्वरी", "Vāgadhīśvarī", "Vagadheeswari", []],
    [35, "शूलिनी", "Śūlinī", "Shulini", []],
    [36, "चलनाट", "Calanāṭa", "Chalanata", []],
    [37, "सालगम्", "Sālagam", "Salagam", []],
    [38, "जलार्णवम्", "Jalārṇavam", "Jalarnavam", []],
    [39, "झालवराली", "Jhālavarālī", "Jhalavarali", []],
    [40, "नवनीतम्", "Navanītam", "Navaneetham", []],
    [41, "पावनी", "Pāvanī", "Pavani", []],
    [42, "रघुप्रिया", "Raghupriyā", "Raghupriya", []],
    [43, "गवाम्भोधि", "Gavāmbhodhi", "Gavambhodhi", []],
    [44, "भवप्रिया", "Bhavapriyā", "Bhavapriya", []],
    [45, "शुभपन्तुवराली", "Śubhapantuvarālī", "Shubhapantuvarali", []],
    [46, "षड्विधमार्गिणी", "Ṣaḍvidhamārgiṇī", "Shadvidhamargini", []],
    [47, "सुवर्णाङ्गी", "Suvarṇāṅgī", "Suvarnangi", []],
    [48, "दिव्यमणि", "Divyamaṇi", "Divyamani", []],
    [49, "धवलाम्बरी", "Dhavalāmbarī", "Dhavalambari", []],
    [50, "नामनारायणी", "Nāmanārāyaṇī", "Namanarayani", []],
    [51, "कामवर्धनी", "Kāmavardhanī", "Kamavardhini", ["pantuvarali"]],
    [52, "रामप्रिया", "Rāmapriyā", "Ramapriya", []],
    [53, "गमनश्रम", "Gamanaśrama", "Gamanashrama", []],
    [54, "विश्वम्भरी", "Viśvambharī", "Vishwambhari", []],
    [55, "श्यामलाङ्गी", "Śyāmalāṅgī", "Shyamalangi", []],
    [56, "षण्मुखप्रिया", "Ṣaṇmukhapriyā", "Shanmukhapriya", []],
    [57, "सिंहेन्द्रमध्यमम्", "Siṃhendramadhyamam", "Simhendramadhyamam", []],
    [58, "हेमवती", "Hemavatī", "Hemavathi", []],
    [59, "धर्मवती", "Dharmavatī", "Dharmavathi", []],
    [60, "नीतिमती", "Nītimatī", "Neethimathi", []],
    [61, "कान्तामणि", "Kāntāmaṇi", "Kanthamani", []],
    [62, "रिषभप्रिया", "Riṣabhapriyā", "Rishabhapriya", []],
    [63, "लताङ्गी", "Latāṅgī", "Lathangi", []],
    [64, "वाचस्पति", "Vācaspati", "Vachaspathi", []],
    [65, "मेचकल्याणी", "Mecakalyāṇī", "Mechakalyani", ["kalyani"]],
    [66, "चित्राम्बरी", "Citrāmbarī", "Chitrambari", []],
    [67, "सुचरित्र", "Sucaritra", "Sucharitra", []],
    [68, "ज्योतिस्वरूपिणी", "Jyotisvarūpiṇī", "Jyothiswarupini", []],
    [69, "धातुवर्धनी", "Dhātuvardhanī", "Dhathuvardhini", []],
    [70, "नासिकाभूषणी", "Nāsikābhūṣaṇī", "Nasikabhushani", []],
    [71, "कोसलम्", "Kosalam", "Kosalam", []],
    [72, "रसिकप्रिया", "Rasikapriyā", "Rasikapriya", []]
  ];

  // Traditional readings that count the FIRST consonant of a conjunct.
  // { mela: syllable index (0 = first syllable, 1 = second) }
  var KP_FIRST = { 16: 1, 48: 1, 54: 1, 55: 0, 66: 1, 68: 0 };
  // Mela 57: anusvara of the first syllable read as म.
  var KP_ANUSVARA = { 57: true };
  // Names known not to follow the rule.
  var KP_IRREGULAR = { 20: true };

  var CHAKRAS = [
    ["इन्दु", "Indu", "Moon (1)"],
    ["नेत्र", "Netra", "Eyes (2)"],
    ["अग्नि", "Agni", "Fire (3)"],
    ["वेद", "Veda", "Vedas (4)"],
    ["बाण", "Bāṇa", "Arrows of Kama (5)"],
    ["ऋतु", "Ṛtu", "Seasons (6)"],
    ["ऋषि", "Ṛṣi", "Sages (7)"],
    ["वसु", "Vasu", "Vasus (8)"],
    ["ब्रह्म", "Brahma", "Brahmas (9)"],
    ["दिशि", "Diśi", "Directions (10)"],
    ["रुद्र", "Rudra", "Rudras (11)"],
    ["आदित्य", "Āditya", "Adityas (12)"]
  ];

  var list = ROWS.map(function (r) {
    return {
      n: r[0], dev: r[1], iast: r[2], en: r[3], aka: r[4],
      kpFirst: Object.prototype.hasOwnProperty.call(KP_FIRST, r[0]) ? KP_FIRST[r[0]] : null,
      kpAnusvara: !!KP_ANUSVARA[r[0]],
      kpIrregular: !!KP_IRREGULAR[r[0]]
    };
  });

  root.MELAKARTA = { list: list, chakras: CHAKRAS };
})(typeof window !== "undefined" ? window : globalThis);
