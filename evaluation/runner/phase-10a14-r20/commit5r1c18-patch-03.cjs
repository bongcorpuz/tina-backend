// PHASE-10A14-R20 COMMIT 5R1-C18 iteration 03 — §9B: a label relation with no requested
// operation is explained by the label family.
//
// Simulated against the accepted iteration-02 runtime:
//   support 14, TP 13, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 1
//
// The single wrong-to-wrong row is a COMPOUND utterance ("... is my plugin code; what
// could it stand for?") whose trailing question changes the requested act. Excluding a
// trailing interrogative clause removes it, so the rule ships with zero regressions of
// either kind rather than relying on the §7 offset allowance.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- evidence -------------------------------------------------------------------
const evAnchor = `  const reasonNamingAssignment = `;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS reasonNamingAssignment');
const evNew = `  // C18 — a COMPOUND utterance whose trailing clause asks a question is not a pure
  // naming assertion: the question changes the requested act.
  const reasonTrailingQuestion = /[;,]\\s*(?:what|which|who|when|where|why|how|is|are|do|does|can|could|should|would|may|might|will)\\b[^?]*\\?/i.test(fullLo);
  const reasonNamingAssignment = `;
s = s.replace(evAnchor, evNew);

const bag = `reasonNamingAssignment, reasonBarePlaceholderSubject,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonNamingAssignment, reasonBarePlaceholderSubject, reasonTrailingQuestion,`);

// ---- decision: the label relation explains a pure naming assertion --------------
const d = `  // C18 R2 (§9B) — the primary act ASSIGNS an identifier; an operation on an already
  // named artefact is not a naming act. Simulated: support 46, corrects 10, regresses 0.`;
if (!s.includes(d)) throw new Error('ANCHOR_MISS R2 branch');
s = s.replace(d, `  // C18 R4 (§9B) — a label relation with NO requested operation and no tax relation is
  // explained by the label family. Simulated: support 14, corrects 13, regresses 0
  // currently-correct rows; the one wrong-to-wrong row is excluded by the trailing
  // question test rather than accepted under the offset allowance.
  if (namesLabel && !evidence.reasonRequestsOperation && !evidence.reasonTrailingQuestion
      && !hasTreatment && !hasCompliance && !asksDefinition
      && !quotesTerm && !expandsNonTax && !evidence.taxRelationOverPrimaryTarget) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }
  // C18 R2 (§9B) — the primary act ASSIGNS an identifier; an operation on an already
  // named artefact is not a naming act. Simulated: support 46, corrects 10, regresses 0.`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-03 applied; bytes', before.length, '->', s.length);
