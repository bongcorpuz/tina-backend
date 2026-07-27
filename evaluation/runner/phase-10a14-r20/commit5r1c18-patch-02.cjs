// PHASE-10A14-R20 COMMIT 5R1-C18 iteration 02 — the three rules the residual-conditioned
// simulator forecast as clean.
//
// Simulated against the accepted C17 runtime over all 3,720 R3 rows:
//
//   R1 procedural_outcome_is_compliance     sup 21  TP 21  FPcorrect 0  FPw2w 0  net +21
//   R2 naming_assignment_assigns_identifier sup 46  TP 10  FPcorrect 0  FPw2w 0  net +10
//   R3 bare_placeholder_subject_is_tax_task sup 10  TP 10  FPcorrect 0  FPw2w 0  net +10
//
// Every rule regresses ZERO currently-correct rows by forecast. Four higher-support
// candidates were rejected precisely because they did not (see the residual decision
// table); one of them would have destroyed 197 correct rows to fix 7.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- evidence -------------------------------------------------------------------
const evAnchor = `  const reasonDenialAssertion = `;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS reasonDenialAssertion');
const evNew = `  // C18 §9B — a naming ASSIGNMENT: the primary act assigns or changes an identifier.
  // An operation on an already named artefact is NOT a naming act; the verb's argument
  // structure controls, so an imperative head disqualifies the reading.
  const reasonNamingAssignment = /\\b(?:name (?:it|this|that|the)|call (?:it|this|that)|title (?:it|this)|label (?:it|this|as)|tag (?:it|as)|code-?named|is called|is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename))\\b/i.test(primaryTextLo)
    && !reasonImperativeHead;
  // C18 §9D — a BARE generic placeholder subject. The head noun immediately carries the
  // predicate, so nothing particular is named and the tax concept remains the requested
  // subject. A MODIFIED noun phrase ("the company vehicle") names a real object and is
  // excluded — that exclusion is what makes the rule safe.
  const reasonBarePlaceholderSubject = /\\b(?:the|a)\\s+(?:transaction|taxpayer|corporation)\\s+(?:is|are|was|were|be|subject|need|must|should|can|could|may|will|shall|has|have|had)\\b/i.test(primaryTextLo);
  const reasonDenialAssertion = `;
s = s.replace(evAnchor, evNew);

const bag = `reasonDenialAssertion,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonDenialAssertion, reasonNamingAssignment, reasonBarePlaceholderSubject,`);

// ---- R1/R2/R3 hoisted above the early-return branches ---------------------------
// The rows these rules target exit at earlier branches (non-tax controlling domain,
// homograph guards), so the rules are placed at the head of the precedence walk. All
// three were simulated as regression-free at their exact conditions, so hoisting them
// cannot disturb a currently-correct row.
const head = `  const quotesTerm = has('QUOTES_TERM');`;
if (!s.includes(head)) throw new Error('ANCHOR_MISS decision head');
s = s.replace(head, `  const quotesTerm = has('QUOTES_TERM');

  // C18 R1 (§9E) — the requested OUTCOME controls. A procedural target carrying the
  // compliance relation is a compliance task, not the residual tax task.
  // Simulated: support 21, corrects 21, regresses 0 currently-correct rows.
  if (hasCompliance && evidence.reasonTargetSemanticRole === 'procedure'
      && !namesLabel && !quotesTerm && !expandsNonTax && !requestsNonTax) {
    return decide('ALLOW', 'tax_compliance_task', 0.88);
  }
  // C18 R3 (§9D) — a bare generic placeholder subject names no particular thing, so the
  // tax concept remains the requested subject. A MODIFIED noun phrase is excluded.
  // Simulated: support 10, corrects 10, regresses 0.
  if (evidence.reasonBarePlaceholderSubject && hasTreatment
      && !namesLabel && !quotesTerm && !expandsNonTax) {
    return decide('ALLOW', 'explicit_tax_task_relation', 0.92);
  }
  // C18 R2 (§9B) — the primary act ASSIGNS an identifier; an operation on an already
  // named artefact is not a naming act. Simulated: support 46, corrects 10, regresses 0.
  if (namesLabel && evidence.reasonNamingAssignment && !hasTreatment && !hasCompliance
      && !quotesTerm && !expandsNonTax && !evidence.taxRelationOverPrimaryTarget) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; bytes', before.length, '->', s.length);
