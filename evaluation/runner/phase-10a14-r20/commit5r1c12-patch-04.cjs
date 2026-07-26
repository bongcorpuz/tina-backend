// PHASE-10A14-R20 COMMIT 5R1-C12 — iteration 04, placed by traced rule.
//
//   rule 2  (line ~1008) : contentless guard refuses "Does the X Act change the duty on
//                          this shipment?" — the statute-in-effect frame names its own
//                          subject, so the guard must yield to it.
//   rule 27 (line ~1140) : homograph veto refuses the subordinate-code row even though a
//                          governed tax predicate controls the primary clause.
//   rule 38 (line ~1189) : CWT is a creditable-withholding-tax acronym with no material
//                          competing ordinary sense, but is absent from the canonical set.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
const lines = fs.readFileSync(p, 'utf8').split('\n');
const before = lines.join('\n').length;
const find = (pred, label) => {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error('anchor not found: ' + label);
  return i;
};

// (1) contentless guard yields to a statute-in-effect frame
const cl = find((l) => l.includes('&& !evidence.bareTaxabilityQuestion'), 'contentless guard tail');
lines[cl] = lines[cl].replace('&& !evidence.bareTaxabilityQuestion',
  '&& !evidence.bareTaxabilityQuestion && !evidence.statuteInEffectFrame');

// (2) homograph veto yields to a governed tax predicate over the primary clause
const hv = find((l) => l.includes('evidence.homographVeto && !hasTreatment && !hasCompliance'), 'homograph veto');
lines[hv] = lines[hv].replace('evidence.homographVeto && !hasTreatment && !hasCompliance',
  'evidence.homographVeto && !hasTreatment && !hasCompliance && !evidence.governedTaxPredicateAnywhere');

// (3) CWT joins the narrow canonical set: creditable withholding tax has no material
//     competing ordinary sense in this corpus. Still excludes DST and VAT.
const ca = find((l) => l.startsWith('const TAX_CANONICAL_ACRONYM_RE ='), 'canonical acronyms');
lines[ca] = 'const TAX_CANONICAL_ACRONYM_RE = /\\b(?:mcit|rcit|nolco|iaet|slsp|cwt)\\b/i;';

fs.writeFileSync(p, lines.join('\n'));
console.log('patched: +' + (lines.join('\n').length - before) + ' bytes');
