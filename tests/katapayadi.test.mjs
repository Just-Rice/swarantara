// Run with:  node tests/katapayadi.test.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

for (const f of ["js/melakarta.js", "js/katapayadi.js", "js/translit.js"]) {
  vm.runInThisContext(readFileSync(new URL("../" + f, import.meta.url), "utf8"), { filename: f });
}
const { Katapayadi: K, MELAKARTA: M, Translit: T } = globalThis;

let failures = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failures++; console.log("FAIL " + name + "\n     " + e.message); }
}

check("72 melakartas, numbered 1..72", () => {
  assert.equal(M.list.length, 72);
  M.list.forEach((m, i) => assert.equal(m.n, i + 1));
});

for (const m of M.list) {
  check(`#${m.n} ${m.iast} decodes to ${m.n}${m.kpIrregular ? " (irregular, expected mismatch)" : ""}`, () => {
    const r = K.decodeMela(m);
    if (m.kpIrregular) assert.notEqual(r.number, m.n);
    else assert.equal(r.number, m.n, `got ${r.number} from ${r.picks.map(p => p.letter + "=" + p.digit).join(", ")}`);
  });
}

check("Mela 20 gives 10 by the usual rule", () => assert.equal(K.decodeMela(M.list[19]).number, 10));

check("usual rule (last consonant) is enough for all but the 7 traditional exceptions + mela 20", () => {
  const plain = M.list.filter(m => K.decode(m.dev).number !== m.n).map(m => m.n);
  assert.deepEqual(plain, [16, 20, 48, 54, 55, 57, 66, 68]);
});

check("syllables of हरिकाम्भोजी", () => {
  assert.deepEqual(K.syllabify("हरिकाम्भोजी").map(s => s.text), ["ह", "रि", "का", "म्भो", "जी"]);
});
check("final dead consonant joins previous syllable", () => {
  assert.deepEqual(K.syllabify("सालगम्").map(s => s.text), ["सा", "ल", "गम्"]);
});

const known = {
  15: "S R1 G3 M1 P D1 N3 S2",
  22: "S R2 G2 M1 P D2 N2 S2",
  28: "S R2 G3 M1 P D2 N2 S2",
  29: "S R2 G3 M1 P D2 N3 S2",
  1:  "S R1 G1 M1 P D1 N1 S2",
  36: "S R3 G3 M1 P D3 N3 S2",
  37: "S R1 G1 M2 P D1 N1 S2",
  65: "S R2 G3 M2 P D2 N3 S2",
  72: "S R3 G3 M2 P D3 N3 S2"
};
for (const [n, s] of Object.entries(known)) {
  check(`scale of ${n}`, () => assert.equal(K.scale(+n).arohana.join(" "), s));
}
check("chakra of 15 is Agni (3rd), 72 is Aditya (12th)", () => {
  assert.equal(K.scale(15).chakra, 2);
  assert.equal(K.scale(72).chakra, 11);
});

check("translit: harikambhoji → हरिकाम्भोजी-like and decodes to 28", () => {
  const d = T.toDevanagari("harikaambhoji");
  assert.equal(K.decode(d).number, 28, d);
});
check("translit: IAST Dhīraśaṅkarābharaṇam decodes to 29", () => {
  assert.equal(K.decode(T.toDevanagari("Dhīraśaṅkarābharaṇam")).number, 29);
});
check("skeleton matches everyday spellings", () => {
  assert.equal(T.skeleton("Mayamalavagowla"), T.skeleton("Māyāmālavagaula"));
  assert.equal(T.skeleton("Shankarabharanam"), T.skeleton("Śaṅkarābharaṇam".replace("ṅ", "n")));
});

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exit(failures ? 1 : 0);
