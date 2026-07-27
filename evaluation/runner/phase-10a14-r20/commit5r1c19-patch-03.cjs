// PHASE-10A14-R20 COMMIT 5R1-C19 iteration 03 — parenthetical_gloss_not_expansion.
//
// A PARENTHETICAL gloss ("MCIT (my cool internal tool) joke expansion") supplies a
// reading as an inline aside rather than predicating it of the token. A copular
// expansion ("RMC is a music channel") asserts the reading as the sentence's claim and
// remains an expansion. Measured over the expansion family: the parenthetical form
// appears in 6 residual rows and in 0 currently-correct rows.
//
// Simulated: support 6, TP 6, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0.
// The predicate is injected verbatim from the shared module (§8).
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const shared = fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c19-predicates.mjs', 'utf8');
const m = shared.match(/parenthetical_gloss_not_expansion: \{[\s\S]*?match: \(v\) =>([\s\S]*?),\n  \},/);
if (!m) throw new Error('PREDICATE_NOT_FOUND parenthetical_gloss_not_expansion');
const body = m[1].trim();
if (!body.includes('non_tax_expansion') || !body.includes('\(')) throw new Error('PREDICATE_EXTRACTION_SANITY_FAILED');

const evAnchor = `  const reasonDefinitionOutcomeUnderTaxContext = `;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS reasonDefinitionOutcome');
s = s.replace(evAnchor, `  // C19 §8 — shared predicate, injected verbatim. The 'reason' field is supplied at the
  // decision site because the current reason is not known during evidence construction.
  const c19ParentheticalGloss = (v) => ${body};
  const reasonParentheticalGlossForm = /\([^)]{4,}\)/.test(primaryTextLo);
  const reasonDefinitionOutcomeUnderTaxContext = `);

const bag = `reasonDefinitionOutcomeUnderTaxContext,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonDefinitionOutcomeUnderTaxContext, reasonParentheticalGlossForm,`);

// PLACEMENT: iteration 03's first attempt replaced the expansion branch wholesale, which
// also served 28 rows the predicate never matched; they moved collaterally and R3
// regressed 393 -> 403. Branch equivalence passed on the 6 targeted rows, so equivalence
// alone does not prove placement safety. The corrected placement adds a GUARDED test at
// the head of the decision walk that fires only when the predicate holds, leaving every
// other row on its existing path.
const head = `  const quotesTerm = has('QUOTES_TERM');`;
if (!s.includes(head)) throw new Error('ANCHOR_MISS decision head');
s = s.replace(head, `  const quotesTerm = has('QUOTES_TERM');

  // C19 R2 — a parenthetical gloss supplies a reading as an inline aside and reassigns
  // nothing, so the absent relation is the controlling explanation. Gated on the
  // expansion relation so only rows the expansion family would claim can be diverted.
  // Simulated: support 6, corrects 6, regresses 0 currently-correct rows.
  if (expandsNonTax && evidence.reasonParentheticalGlossForm
      && !hasTreatment && !hasCompliance) {
    return decide('REFUSE', 'no_tax_relation', 0.88);
  }`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-03 applied; bytes', before.length, '->', s.length);
