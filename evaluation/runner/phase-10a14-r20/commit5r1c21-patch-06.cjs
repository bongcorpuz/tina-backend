// PHASE-10A14-R20 COMMIT 5R1-C21 iteration 06 - punctuation-safe parenthetical gloss refinement.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;
s = s.replace(
  "/^[a-z]{2,6} \\([a-z][^)]+\\) (?:joke expansion|applies)\\.?$/i.test(x.t)",
  "/^[a-z]{2,6} \\([a-z][^)]+\\) (?:joke expansion|applies)[.?]?$/i.test(x.t)"
);
if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('C21 patch-06 applied; bytes', before.length, '->', s.length);
