// PHASE-10A14-R20 COMMIT 5R1-C19 iteration 05 — registration_outcome_is_compliance.
//
// §10D: the requested OUTCOME controls the family, not the grammatical subject. C18's
// bare-placeholder rule routes "Is the transaction subject to X" to the residual tax
// task, which is correct for a treatment predicate but wrong when the predicate names a
// registration requirement.
//
// Simulated: support 10, TP 10, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0.
// Predicate injected verbatim from the shared module (§8).
//
// PLACEMENT: iterations 03/04 showed that branch equivalence proves the targeted set
// matches but not that the placement leaves other rows untouched. This test is therefore
// placed immediately BEFORE the C18 bare-placeholder branch it must precede, and is
// gated on the registration outcome so no other row can reach it.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const shared = fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c19-predicates.mjs', 'utf8');
const m = shared.match(/registration_outcome_is_compliance: \{[\s\S]*?match: \(v\) =>([\s\S]*?),\n  \},/);
if (!m) throw new Error('PREDICATE_NOT_FOUND registration_outcome_is_compliance');
const body = m[1].trim();
if (!body.includes('registration')) throw new Error('PREDICATE_EXTRACTION_SANITY_FAILED');
// The reason test is applied at the decision site; the surface test is the evidence.
const surface = body.split('&&')[0].trim().replace(/\.test\(v\.t\)\s*$/, '');
if (!/^\/.*\/i?$/.test(surface)) throw new Error('SURFACE_EXTRACTION_NOT_A_REGEX_LITERAL: ' + surface);

const evAnchor = `  const reasonDefinitionOutcomeUnderTaxContext = `;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS reasonDefinitionOutcome');
s = s.replace(evAnchor, `  // C19 §8 — shared predicate surface test, injected verbatim.
  const reasonRegistrationOutcome = ${surface}.test(primaryTextLo);
  const reasonDefinitionOutcomeUnderTaxContext = `);

const bag = `reasonDefinitionOutcomeUnderTaxContext,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonDefinitionOutcomeUnderTaxContext, reasonRegistrationOutcome,`);

// Placed immediately before the C18 bare-placeholder branch.
const d = `  // C18 R3 (§9D) — a bare generic placeholder subject names no particular thing, so the`;
if (!s.includes(d)) throw new Error('ANCHOR_MISS C18 placeholder branch');
s = s.replace(d, `  // C19 R3 (§10D) — an explicit REGISTRATION outcome is a procedural compliance act,
  // whatever the grammatical subject. Placed before the bare-placeholder rule, which
  // would otherwise claim these rows for the residual tax task.
  // Simulated: support 10, corrects 10, regresses 0 currently-correct rows.
  if (evidence.reasonRegistrationOutcome && (hasTreatment || hasCompliance)
      && !namesLabel && !quotesTerm && !expandsNonTax) {
    return decide('ALLOW', 'tax_compliance_task', 0.88);
  }
  // C18 R3 (§9D) — a bare generic placeholder subject names no particular thing, so the`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-05 applied; bytes', before.length, '->', s.length);
