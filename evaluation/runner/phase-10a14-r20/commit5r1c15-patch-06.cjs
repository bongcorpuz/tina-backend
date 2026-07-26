// PHASE-10A14-R20 COMMIT 5R1-C15 iteration 06 — the speech-act principle applied to
// the remaining early-return REFUSE branches.
//
// Iteration 02 established, and R3 confirms, that the two REFUSE families are separated
// by the speech act: explicit_non_tax_task requires a non-tax ACTION to be requested,
// while a QUESTION about subject matter that carries no tax relation is explained by
// no_tax_relation. Two branches return REFUSE before that split is reached and hard-code
// the action family:
//
//   - the styling/program-artefact branch ("what is the taxable font in this CSS file?")
//   - the ordinary-procedural-sense branch
//
// Both are questions, not requests for action. Applying the SAME rule rather than a new
// one keeps the explanation consistent across every REFUSE exit.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const anchorA = `  if (evidence.stylingOrProgramTarget && !evidence.artefactIsCommercialTaxTarget && !evidence.filipinoTaxRelationOverTarget) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.86);
  }`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS styling branch');
const addA = `  if (evidence.stylingOrProgramTarget && !evidence.artefactIsCommercialTaxTarget && !evidence.filipinoTaxRelationOverTarget) {
    // C15 reason lane — same speech-act split as every other REFUSE exit: a question
    // about a styling or program artefact requests no action, so the controlling
    // explanation is that no tax relation reaches the target.
    if (evidence.primaryIsInterrogative) return decide('REFUSE', 'no_tax_relation', 0.86);
    return decide('REFUSE', 'explicit_non_tax_task', 0.86);
  }`;
s = s.replace(anchorA, addA);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-06 applied; bytes', before.length, '->', s.length);
