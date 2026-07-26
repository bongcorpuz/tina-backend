// PHASE-10A14-R20 COMMIT 5R1-C16 iteration 04 — §9C target semantic role for the two
// ALLOW families.
//
// §9C requires the distinction to be the SEMANTIC ROLE of the target in the tax
// relation, not a noun list. Measured over all 3,720 R3 rows:
//
//   feature                              explicit_tax_task_relation   ordinary_object
//   ordinary object present                      16.0%                    79.0%
//   specific treatment relation                  15.7%                    89.0%
//   CONJUNCTION of both                           7.8%                    74.5%
//
// The conjunction is the sharp discriminator: a SPECIFIC tax predicate governing an
// identified EXTERNAL object is a treatment question about that object, while a tax
// predicate whose subject is the tax concept/procedure itself is the residual tax task.
// The shipped rule used a DISJUNCTION (specificTreatment || ordinaryTarget), which
// admits either half alone and so collapses the families together.
//
// A plain external-object test was measured (34.8% vs 51.3%) and REJECTED under §7 as
// too weak to implement.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const anchor = `  if (hasTreatment) {
    const ordinaryTarget = (evidence.ordinaryObjects || []).length > 0;
    if (specificTreatment || ordinaryTarget) return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.90);
    return decide('ALLOW', 'explicit_tax_task_relation', 0.95);
  }`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS treatment family');

const replacement = `  if (hasTreatment) {
    const ordinaryTarget = (evidence.ordinaryObjects || []).length > 0;
    // C16 R6 (§9C) — the target's SEMANTIC ROLE decides. A specific tax predicate
    // governing an identified external object asks that object's treatment; a tax
    // predicate whose own subject is the tax concept or procedure is the residual tax
    // task. Measured: conjunction 74.5% for ordinary-object treatment against 7.8% for
    // the residual family, where either half alone is far weaker.
    if (specificTreatment && ordinaryTarget) return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.90);
    if (!specificTreatment && ordinaryTarget) return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.88);
    return decide('ALLOW', 'explicit_tax_task_relation', 0.95);
  }`;
s = s.replace(anchor, replacement);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-04 applied; bytes', before.length, '->', s.length);
