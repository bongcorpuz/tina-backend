// PHASE-10A14-R20 COMMIT 5R1-C12 — finish calibrating the anti-memorization return value.
const fs = require('fs');
const p = 'evaluation/runner/phase-10a14-r20/commit5r1c12-lib.mjs';
let s = fs.readFileSync(p, 'utf8');

const old = '  return { checks, failed, pass: failed.length === 0, leakedCounterfactualQueries: leakedCf, leakedR3Queries: leakedR3 };';
if (!s.includes(old)) throw new Error('return anchor missing');

const note = 'Canonical Philippine tax terms that coincide with bare-term R3 rows are recorded as domain vocabulary, not memorization. Sentence-shaped rows and non-tax-scenario rows are flagged as leakage.';
const nw = [
  '  return {',
  '    checks, failed, pass: failed.length === 0,',
  '    leakedCounterfactualQueries: leakedCf,',
  '    leakedR3Queries: leakedR3,',
  '    r3TerminologyOverlap: [...new Set(r3TerminologyOverlap)],',
  '    terminologyNote: ' + JSON.stringify(note) + ',',
  '  };',
].join('\n');
s = s.replace(old, nw);
fs.writeFileSync(p, s);
console.log('return value calibrated');
