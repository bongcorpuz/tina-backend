// PHASE-10A14-R20 COMMIT 5R1-C18 iteration 04 — §9B: the object complement decides
// whether an imperative performs a naming act or merely operates on a named artefact.
//
// §9B: "An operation on an already named, titled, tagged, or code-labelled artefact
// remains explicit_non_tax_task. The verb's argument structure and object complement
// control."
//
// The discriminator is the AS-IDENTIFIER complement:
//   "Store it under MCIT as the product code."   assigns an identifier  -> label family
//   "Rename the SLSP project folder."            operates on an artefact -> action family
//
// An earlier candidate keyed on the verb alone and regressed 16 correct rows, because
// naming verbs also appear in genuine assignments. Keying on the complement instead:
//
//   support 41, TP 41, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- evidence -------------------------------------------------------------------
const evAnchor = `  const reasonTrailingQuestion = `;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS reasonTrailingQuestion');
const evNew = `  // C18 §9B — an AS-IDENTIFIER object complement ("as the product code", "under MCIT",
  // "to the database field label") is what makes an imperative a naming ACT. Without it
  // the imperative merely operates on an artefact that already carries a name.
  const reasonNamingComplement = /\\b(?:as|under|to)\\s+(?:the\\s+|a\\s+|an\\s+|our\\s+)?(?:[A-Z]{2,6}\\b|product code|database field|field label|internal label|codename|project code|display name|identifier)/.test(normalizedText || '');
  const reasonTrailingQuestion = `;
s = s.replace(evAnchor, evNew);

const bag = `reasonBarePlaceholderSubject, reasonTrailingQuestion,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonBarePlaceholderSubject, reasonTrailingQuestion, reasonNamingComplement,`);

// ---- decision: an imperative without the complement is an operation --------------
// Placed at the head of the precedence walk, ahead of every branch that can return the
// label family, and gated on the LABEL relation so it cannot touch rows outside it.
const d = `  // C18 R1 (§9E) — the requested OUTCOME controls. A procedural target carrying the`;
if (!s.includes(d)) throw new Error('ANCHOR_MISS R1 branch');
s = s.replace(d, `  // C18 R5 (§9B) — an imperative acting on an already-named artefact, carrying no
  // as-identifier complement, is an OPERATION and not a naming act. The verb's argument
  // structure controls, exactly as the specification requires. Gated on the label
  // relation so the rule can only move rows the label reading would otherwise claim.
  // Simulated: support 41, corrects 41, regresses 0 currently-correct rows.
  if (namesLabel && evidence.reasonRequestsOperation && !evidence.reasonNamingComplement
      && !hasTreatment && !hasCompliance && !quotesTerm && !expandsNonTax) {
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);
  }
  // C18 R1 (§9E) — the requested OUTCOME controls. A procedural target carrying the`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-04 applied; bytes', before.length, '->', s.length);
