// PHASE-10A14-R20 COMMIT 5R1-C17 iteration 03 — §10C target semantic role for the two
// ALLOW families, admitted only where measured precision is high.
//
// Measured over the 1,235 R3 rows expecting one of the two ALLOW families:
//
//   targetSemanticRole   n     explicit   ordinary   dominant
//   receipt_income      321          44        277   ORDINARY 86.3%
//   asset                32           5         27   ORDINARY 84.4%
//   procedure            51          11         40   ORDINARY 78.4%
//   tax_concept         305          98        207   ORDINARY 67.9%
//   service              40          16         24   ORDINARY 60.0%
//   transaction         182          91         91   ORDINARY 50.0%
//   other               304         186        118   EXPLICIT 61.2%
//
// Only receipt_income and asset clear a high-precision bar. `transaction` is an exact
// 50/50 split and is deliberately NOT used — §7 forbids implementing a rule with weak
// separation, and C16 already recorded a rejected candidate for exactly that reason.
//
// §10C is honoured: the discriminator is the semantic ROLE of the governed target, and
// no specific R3 object is named anywhere.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- publish the target semantic role in the evidence layer --------------------
const anchor = `  const reasonRequestOperationClass = (() => {`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS reasonRequestOperationClass');

const addition = `  // C17 §10C — TARGET SEMANTIC ROLE of the governed target. Role is decided by
  // structural category membership, never by naming a specific object.
  const reasonTargetSemanticRole = (() => {
    if (/\\b(?:bir form|filing|registration|remittance|deadline|penalty|alphalist|slsp|books of account|tax clearance)\\b/i.test(primaryTextLo)) return 'procedure';
    const taxConcept = /\\b(?:income tax|value[- ]added tax|withholding tax|percentage tax|excise tax|documentary stamp|capital gains tax|estate tax|donor'?s? tax|customs dut\\w*|final tax|tax amnesty|deficiency interest|tax credit|tax refund|net operating loss|minimum corporate income tax|regular corporate income tax|optional standard deduction|nolco|mcit|rcit|iaet|cgt|cwt|ewt|fwt|dst|fbt|osd|input vat|output vat)\\b/i.test(primaryTextLo);
    const transaction = /\\b(?:transaction|purchase|sale|sales|payment|import|imports|expense|lease|rental|contract|billing|commission|royalt\\w*|dividend)\\b/i.test(primaryTextLo);
    const receiptIncome = /\\b(?:receipts?|income|proceeds|earnings|kita)\\b/i.test(primaryTextLo);
    const service = /\\b(?:service|services|fee|fees)\\b/i.test(primaryTextLo);
    const asset = /\\b(?:asset|property|land|building|equipment|vehicle|goods|suppl(?:y|ies))\\b/i.test(primaryTextLo);
    if (taxConcept && !transaction && !receiptIncome && !service && !asset) return 'tax_concept';
    if (transaction) return 'transaction';
    if (receiptIncome) return 'receipt_income';
    if (service) return 'service';
    if (asset) return 'asset';
    return 'other';
  })();
` + anchor;
s = s.replace(anchor, addition);

const bag = `reasonRequestedOutcomeClass, reasonRequestOperationClass,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonRequestedOutcomeClass, reasonRequestOperationClass, reasonTargetSemanticRole,`);

// ---- apply only the high-precision roles ---------------------------------------
const t1 = `  if (hasTreatment) {
    const ordinaryTarget = (evidence.ordinaryObjects || []).length > 0;`;
if (!s.includes(t1)) throw new Error('ANCHOR_MISS treatment family');
s = s.replace(t1, `  if (hasTreatment) {
    const ordinaryTarget = (evidence.ordinaryObjects || []).length > 0;
    // C17 §10C — a governed target whose semantic role is a RECEIPT/INCOME item or an
    // ASSET is an external object whose treatment is being asked. Both roles measure
    // above 84% for the ordinary-object family. Roles with weak separation
    // (transaction 50.0%, service 60.0%, tax_concept 67.9%) are deliberately excluded.
    if (['receipt_income', 'asset'].includes(evidence.reasonTargetSemanticRole)) {
      return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.90);
    }`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-03 applied; bytes', before.length, '->', s.length);
