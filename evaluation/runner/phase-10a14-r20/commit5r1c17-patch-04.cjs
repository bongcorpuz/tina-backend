// PHASE-10A14-R20 COMMIT 5R1-C17 iteration 04 — P4: an explicit denial of tax relevance
// paired with an ordinary request is an explicit non-tax task.
//
// Two enriched separable vectors, 41 residual rows, identical except for topic form:
//
//   n=25  rel=NEGATES_TAX_RELEVANCE assert=denial topic=topic_fragment      -> explicit_non_tax_task
//   n=16  rel=NEGATES_TAX_RELEVANCE assert=denial topic=indefinite_target   -> explicit_non_tax_task
//
// Both currently resolve to no_tax_relation. The structural reading is that the speaker
// has DENIED tax relevance and asked for something else: that is a positively requested
// non-tax task, not the mere absence of a tax relation. Precedence spec step 7 places
// negation handling ahead of the ambiguity/absence step, so this ordering is correct.
//
// The negation family itself (§10F, tax_negation_but_tax_review_requested) is untouched:
// this rule fires only where NO tax review is requested.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- evidence: an explicit denial of tax relevance ------------------------------
const anchor = `  const reasonRequestOperationClass = (() => {`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS reasonRequestOperationClass');
const addition = `  // C17 §9 — DENIAL ASSERTION: the utterance explicitly denies tax relevance
  // ("not asking about tax", "non-tax", "do not discuss tax"). Recorded from the
  // primary clause so a subordinate mention cannot supply it.
  const reasonDenialAssertion = /\\b(?:not asking about tax|do not discuss tax|don't discuss tax|non-?tax|hindi tungkol sa buwis|walang kinalaman sa buwis)\\b/i.test(primaryTextLo);
` + anchor;
s = s.replace(anchor, addition);

const bag = `reasonRequestedOutcomeClass, reasonRequestOperationClass,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonRequestedOutcomeClass, reasonRequestOperationClass, reasonDenialAssertion,`);

// ---- decision: denial + no tax review -> explicit non-tax task -------------------
const d1 = `    // C16 R8 (§9A) — an actual non-tax OPERATION requires an action head and an action
    // target. A question, assertion, description or topic request carrying no
    // controlling tax relation is explained by the absence of that relation.
    if (!evidence.reasonRequestsOperation) return decide('REFUSE', 'no_tax_relation', 0.88);`;
if (!s.includes(d1)) throw new Error('ANCHOR_MISS refuse split');
s = s.replace(d1, `    // C17 P4 — an EXPLICIT DENIAL of tax relevance, with no tax review requested, is a
    // positively requested non-tax task: the speaker has said what they do NOT want and
    // asked for something else. Measured over two separable vectors totalling 41 rows.
    if (evidence.reasonDenialAssertion && negatesTax) return decide('REFUSE', 'explicit_non_tax_task', 0.90);
    // C16 R8 (§9A) — an actual non-tax OPERATION requires an action head and an action
    // target. A question, assertion, description or topic request carrying no
    // controlling tax relation is explained by the absence of that relation.
    if (!evidence.reasonRequestsOperation) return decide('REFUSE', 'no_tax_relation', 0.88);`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-04 applied; bytes', before.length, '->', s.length);
