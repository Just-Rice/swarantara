# SWARANTARA · स्वरान्तर

**The Katapayadi code of the 72 Melakarta ragas.** An interactive website for the CBSE Science Exhibition 2026–27
(sub-theme: *Mathematical Modelling and Computational Thinking*).

Visitors type a raga name (in English letters or Devanagari) and the site decodes it step by step:

1. split the name into syllables (aksharas)
2. keep the first two syllables
3. turn each letter into a number with the Katapayadi table
4. read the digits right to left (*aṅkānāṃ vāmato gatiḥ*)
5. get the Melakarta number, then show and play the raga's scale

It also has: number → raga lookup, a tappable Katapayadi table, all 72 ragas grouped by chakra,
the 6 × 6 × 2 = 72 derivation, and an **Accessibility** panel (English / Sanskrit, script for raga names,
text size, light/dark, high contrast, reduce motion). It works on phones and keeps working offline after the first visit.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `css/style.css` | Design (colours are at the top) |
| `js/melakarta.js` | The 72 ragas: names and the traditional Katapayadi exceptions |
| `js/katapayadi.js` | The algorithm and scale builder |
| `js/i18n.js` | **All text, in English and Sanskrit.** Edit wording here |
| `js/translit.js` | English letters → Devanagari |
| `js/audio.js` | Plays swaras (generated in the browser, no recordings) |
| `js/settings.js` | Accessibility settings |
| `js/app.js` | Connects everything on the page |
| `sw.js` | Offline support. **Change `VERSION` whenever you change any file** |
| `tests/katapayadi.test.mjs` | Checks all 72 ragas decode correctly: `node tests/katapayadi.test.mjs` |

No build step: it is plain HTML, CSS and JavaScript. To try it on a computer:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

## Katapayadi rules used

- Letters are counted in four groups (kādi, ṭādi, pādi, yādi); standalone vowels count 0.
- In a joined (conjunct) letter, the **last** consonant counts.
- By tradition, **7 names count the first consonant** of the conjunct instead:
  16 Cakravākam, 48 Divyamaṇi, 54 Viśvambharī, 55 Śyāmalāṅgī, 57 Siṃhendramadhyamam (ं read as म),
  66 Citrāmbarī, 68 Jyotisvarūpiṇī. The site explains this when it happens.
- **Mela 20, Naṭabhairavī,** does not follow the rule (it decodes to 10). The site says so. It makes a good
  "error analysis" talking point for the judges.

## Please check before the exhibition

- The **Sanskrit text** in `js/i18n.js`: ask a Sanskrit teacher to review it.
- The **raga spellings** in `js/melakarta.js`: ask a music teacher.
- Audio uses just-intonation ratios (Sa 1:1, Pa 3:2 …) from a chosen Sa (default 240 Hz).

## Hosting on Cloudflare Pages

1. Merge this branch into `main` on GitHub.
2. In Cloudflare, use a Pages project connected to `Just-Rice/swarantara`:
   production branch `main`, framework preset **None**, build command **empty**, output directory **`/`**.
3. Each push to `main` then updates the site automatically.

Made with ❤️ for Carnatic music and mathematics. Font: Tiro Devanagari Sanskrit (SIL Open Font License, `assets/fonts/OFL.txt`).
