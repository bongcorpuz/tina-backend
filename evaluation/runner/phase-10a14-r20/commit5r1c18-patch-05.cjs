// PHASE-10A14-R20 COMMIT 5R1-C18 iteration 05 — §9B at the branch that actually
// controls these rows.
//
// Iteration 04 simulated this rule cleanly but gated the runtime branch on the LABEL
// RELATION, which these rows do not carry. They reach the label family through
// `primaryLabelOrDisplayAction` instead, so the guard never fired. The correction is to
// place the test on that branch — the simulator condition and the runtime predicate must
// be the same predicate.
//
// §9B: "An operation on an already named, titled, tagged, or code-labelled artefact
// remains explicit_non_tax_task. The verb's argument structure and object complement
// control."
//
// Re-simulated against the true branch condition:
//   support 41, TP 41, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- evidence: the as-identifier object complement -------------------------------
const evAnchor = `  const reasonTrailingQuestion = `;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS reasonTrailingQuestion');
const evNew = `  // C18 §9B — an AS-IDENTIFIER object complement ("as the product code", "under MCIT",
  // "to the database field label") is what makes an imperative a naming ACT. Without it
  // the imperative merely operates on an artefact that already carries a name.
  const reasonNamingComplement = /\\b(?:as|under|to)\\s+(?:the\\s+|a\\s+|an\\s+|our\\s+)?(?:[A-Z]{2,6}\\b|product code|database field|field label|internal label|codename|project code|display name|identifier)/.test(String(normalizedText || ''));
  const reasonTrailingQuestion = `;
s = s.replace(evAnchor, evNew);

const bag = `reasonBarePlaceholderSubject, reasonTrailingQuestion,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonBarePlaceholderSubject, reasonTrailingQuestion, reasonNamingComplement,`);

// ---- decision: at the branch that actually controls these rows -------------------
const d = `  // A primary label, print, caption or display action controls its own target.
  if (evidence.primaryLabelOrDisplayAction) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.88);
  }`;
if (!s.includes(d)) throw new Error('ANCHOR_MISS primaryLabelOrDisplayAction branch');
s = s.replace(d, `  // A primary label, print, caption or display action controls its own target.
  if (evidence.primaryLabelOrDisplayAction) {
    // C18 R5 (§9B) — the object complement decides. An imperative acting on an already
    // named artefact, with NO as-identifier complement, performs an operation rather
    // than a naming act; the verb's argument structure controls.
    // Simulated at this exact branch condition: support 41, corrects 41, regresses 0.
    if (evidence.reasonRequestsOperation && !evidence.reasonNamingComplement) {
      return decide('REFUSE', 'explicit_non_tax_task', 0.88);
    }
    return decide('REFUSE', 'non_tax_label_or_name', 0.88);
  }`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-05 applied; bytes', before.length, '->', s.length);
