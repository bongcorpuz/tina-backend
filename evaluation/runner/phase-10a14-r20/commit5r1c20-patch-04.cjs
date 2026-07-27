// PHASE-10A14-R20 COMMIT 5R1-C20 iteration 04 — external_income_item_is_ordinary_object,
// added to the existing pure override seam.
//
// §12C converse: an income item introduced as "receipts from X", or a first-person
// disclosure of the taxpayer's own item, is an external item governed by the tax
// predicate, so the ordinary-object treatment family controls.
//
// Shadow: support 25, TP 25, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const shared = fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c20-override.mjs', 'utf8');
const m = shared.match(/external_income_item_is_ordinary_object: \{[\s\S]*?match: \(v\) =>([\s\S]*?),\n  \},/);
if (!m) throw new Error('PREDICATE_NOT_FOUND external_income_item_is_ordinary_object');
const body = m[1].trim();
if (!body.includes('explicit_tax_task_relation') || !body.includes('receipts from')) {
  throw new Error('PREDICATE_EXTRACTION_SANITY_FAILED');
}

const anchor = `  if (nominalizedTransactionHeadIsTaxTask(v)) return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.92 };`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS override seam');
s = s.replace(anchor, `  const externalIncomeItemIsOrdinaryObject = (x) => ${body};
${anchor}
  if (externalIncomeItemIsOrdinaryObject(v)) return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.90 };`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-04 applied; bytes', before.length, '->', s.length);
