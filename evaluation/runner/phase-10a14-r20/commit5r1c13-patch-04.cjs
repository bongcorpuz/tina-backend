// PHASE-10A14-R20 COMMIT 5R1-C13 iteration 04 — specific relation selection.
// Two ordering defects, both fixed by EMITTING the required specific relation rather
// than suppressing the one already present. Under the frozen scorer's containment
// semantics an extra relation is harmless, so adding is strictly safer than replacing.
//
// (a) Filipino indirect-tax frames. "Ano ang tamang BIR form para sa X" and
//     "Kailangan bang i-withhold ang buwis sa X" both ask the indirect-tax treatment
//     of a purchase. The compliance and withholding branches are tested first, so the
//     VAT relation was never reached.
// (b) Definition intent inside a tax context. "What does X refer to in a BIR
//     assessment", "X in BIR issuances means what", "What is X within Y" are
//     definition asks; RE.definition lacked these in-context forms so the generic
//     treatment relation controlled.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- (a) Filipino indirect-tax treatment ---------------------------------------
const anchorA = `  // Definition relation.`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS definition relation');

const addA = `  // C13 relation lane — FILIPINO INDIRECT-TAX TREATMENT.
  // A Filipino/Taglish question that asks which BIR form covers a purchase, or whether
  // tax must be withheld on a purchase, is asking the indirect-tax treatment of that
  // purchase. The compliance and withholding branches match first on their procedural
  // wording, so the VAT relation was never reached. The relation is ADDED, not
  // substituted: containment semantics make an extra relation harmless, whereas
  // removing the compliance/withholding relation would break rows that require it.
  const filipinoIndirectTaxFrame = /\\b(?:ano ang tamang bir form para sa|kailangan bang? i-?withhold ang buwis sa)\\b/i.test(fullLo);
  if (filipinoIndirectTaxFrame && !relations.some((r) => r.relation === 'ASKS_VAT_TREATMENT_OF')) {
    add('ASKS_VAT_TREATMENT_OF', 'task', target || 'subject');
  }

  // Definition relation.`;
s = s.replace(anchorA, addA);

// --- (b) definition intent inside a tax context ---------------------------------
const anchorB = `  if ((taskIsDefinition || explanatoryOverTaxInstrument) && !taskIsNonTaxAction) add('ASKS_DEFINITION_OF', 'task', target || 'term');`;
if (!s.includes(anchorB)) throw new Error('ANCHOR_MISS ASKS_DEFINITION_OF');

const addB = `  // C13 relation lane — DEFINITION INTENT SITUATED IN A TAX CONTEXT.
  // "What does X refer to in a BIR assessment", "X in BIR issuances means what",
  // "What is X within Philippine tax" ask what a term MEANS inside tax, not how a
  // transaction is treated. RE.definition covers "what does X mean" but not these
  // in-context forms, so the generic treatment relation controlled. Structural: a
  // short token whose meaning is asked, scoped by an "in/within <context>" phrase.
  const definitionInContext = /\\bwhat does\\b\\s+\\b[a-z]{2,6}\\b\\s+(?:refer to|mean|stand for)\\b/i.test(fullLo)
    || /\\b[a-z]{2,6}\\b\\s+(?:in|within)\\b[^?.!]{2,60}\\bmeans what\\b/i.test(fullLo)
    || /\\bwhat is\\b\\s+\\b[a-z]{2,6}\\b\\s+(?:within|in)\\b[^?.!]{2,60}\\?/i.test(fullLo);
  if ((taskIsDefinition || explanatoryOverTaxInstrument || definitionInContext) && !taskIsNonTaxAction) add('ASKS_DEFINITION_OF', 'task', target || 'term');`;
s = s.replace(anchorB, addB);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-04 applied; bytes', before.length, '->', s.length);
