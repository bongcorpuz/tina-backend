// PHASE-10A14-R20 COMMIT 5R1-C20 iteration 05 — two further overrides on the same seam.
//
// filipino_tax_instrument_is_subject (§12C): in a Filipino frame where the tax instrument
//   is the grammatical subject and the object sits inside a prepositional scope phrase,
//   the tax itself is the requested subject.
//   Shadow: support 10, TP 10, zero regressions.
//
// issuance_over_filing_position_is_compliance (§12D): an issuance applied to a stated
//   filing position asks how the filing must be handled — a procedural outcome.
//   Shadow: support 10, TP 10, zero regressions.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const shared = fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c20-override.mjs', 'utf8');
// Extract by locating the rule key, then the first `match: (v) =>` after it, then the
// terminating `,\n  },`. String indexing avoids regex-escaping pitfalls entirely.
const grab = (name, must) => {
  const start = shared.indexOf(name + ': {');
  if (start < 0) throw new Error('PREDICATE_NOT_FOUND ' + name);
  const mAt = shared.indexOf('match: (v) =>', start);
  if (mAt < 0) throw new Error('PREDICATE_MATCH_NOT_FOUND ' + name);
  const from = mAt + 'match: (v) =>'.length;
  const end = shared.indexOf(',\n  },', from);
  if (end < 0) throw new Error('PREDICATE_END_NOT_FOUND ' + name);
  const b = shared.slice(from, end).trim();
  if (!b.includes(must)) throw new Error('PREDICATE_EXTRACTION_SANITY_FAILED ' + name);
  return b;
};
const fil = grab('filipino_tax_instrument_is_subject', 'paano ireport');
const iss = grab('issuance_over_filing_position_is_compliance', 'filing position');

const anchor = `  if (externalIncomeItemIsOrdinaryObject(v)) return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.90 };`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS override seam');
s = s.replace(anchor, `  const filipinoTaxInstrumentIsSubject = (x) => ${fil};
  const issuanceOverFilingPositionIsCompliance = (x) => ${iss};
${anchor}
  if (filipinoTaxInstrumentIsSubject(v)) return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.92 };
  if (issuanceOverFilingPositionIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-05 applied; bytes', before.length, '->', s.length);
