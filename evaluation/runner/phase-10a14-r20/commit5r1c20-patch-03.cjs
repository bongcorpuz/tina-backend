// PHASE-10A14-R20 COMMIT 5R1-C20 iteration 03 — nominalized_transaction_head_is_tax_task,
// added to the existing pure override seam.
//
// §12C: a nominalized transaction head ("the purchase of X", "payment for X", "X sale be
// reported", "documentation for X", "use invoices for X") takes the ordinary object as a
// genitive or prepositional dependent. The transaction itself is the requested subject,
// so the residual tax-task family controls. Excluded: a named GAIN or real property,
// which is a governed target in its own right.
//
// Shadow: support 63, TP 63, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0.
// No existing branch is touched; the rule is added inside resolveGovernedReasonOverride.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const shared = fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c20-override.mjs', 'utf8');
const m = shared.match(/nominalized_transaction_head_is_tax_task: \{[\s\S]*?match: \(v\) =>([\s\S]*?),\n  \},/);
if (!m) throw new Error('PREDICATE_NOT_FOUND nominalized_transaction_head_is_tax_task');
const body = m[1].trim();
if (!body.includes('tax_treatment_of_ordinary_object') || !body.includes('gain')) {
  throw new Error('PREDICATE_EXTRACTION_SANITY_FAILED');
}

const anchor = `  if (tokenGlossAssignsNoIdentifier(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.88 };`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS override seam');
s = s.replace(anchor, `  const nominalizedTransactionHeadIsTaxTask = (x) => ${body};
${anchor}
  if (nominalizedTransactionHeadIsTaxTask(v)) return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.92 };`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-03 applied; bytes', before.length, '->', s.length);
