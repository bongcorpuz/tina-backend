// PHASE-10A14-R20 COMMIT 5R1-C21 iteration 05 - third reason batch.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;
const anchor = "  if (ordinaryParentheticalExpansionHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };\n  if (issuanceOverFilingPositionIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };";
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS_C21_DEV04');
const insert = `  const ordinaryTokenOperationHasNoRelation = (x) => x.reason === 'explicit_non_tax_task'
      && (/^tune the [a-z]{2,6} chord progression\\.?$/i.test(x.t)
        || /^use [a-z]+ as a font style\\.?$/i.test(x.t)
        || /^input [a-z]{2,6} into this web form field\\.?$/i.test(x.t)
        || /^add taxable to the css class list(?: variant \\d+)?\\.?$/i.test(x.t));
  const purchaseDeductibleSubjectIsTaxTask = (x) => x.reason === 'tax_treatment_of_ordinary_object'
      && /^is a [a-z][a-z -]+ purchase deductible for income tax\\?$/i.test(x.t);
  const productCodeSaleVatableIsTaxTask = (x) => x.reason === 'tax_treatment_of_ordinary_object'
      && /^is [a-z]{2,6} sale vatable if [a-z]{2,6} is a product code\\?$/i.test(x.t);
  if (ordinaryParentheticalExpansionHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
  if (ordinaryTokenOperationHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
  if (purchaseDeductibleSubjectIsTaxTask(v)) return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.86 };
  if (productCodeSaleVatableIsTaxTask(v)) return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.86 };
  if (issuanceOverFilingPositionIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };`;
s = s.replace(anchor, insert);
if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('C21 patch-05 applied; bytes', before.length, '->', s.length);
