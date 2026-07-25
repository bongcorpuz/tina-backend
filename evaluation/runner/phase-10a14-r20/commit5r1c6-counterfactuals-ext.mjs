// PHASE-10A14-R20 COMMIT 5R1-C6 — decision counterfactual EXTENSION (>=200 new queries,
// >=100 new pairs). Fresh vocabulary; expectations authored from frozen structural rules
// before runtime execution. No model; no exact R3 query. Combined with the C5 suite these
// form the counterfactual-v2 controls for the decision-lock candidate.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REPO } from './identity.mjs';

const ANALYZER = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const pairs = [];
const add = (family, query, expected, feature) => pairs.push({ family, query, expectedDecision: expected, controllingFeature: feature });

// F1: quotation action vs tax definition (text op on quoted tax term -> REFUSE)
for (const term of ['excise tax', 'capital gains tax', 'donor tax', 'estate tax', 'percentage tax', 'fringe benefit tax', 'gross receipts tax', 'documentary stamp tax', 'input tax', 'output tax']) {
  add('quote_action_vs_definition', `Count the letters in "${term}".`, 'REFUSE', 'text op on quoted tax term');
  add('quote_action_vs_definition', `What does "${term}" mean under BIR rules?`, 'ALLOW', 'tax definition with context');
}
// F2: non-tax editing/formatting action vs tax analysis
for (const [obj, n] of [['a text box', 1], ['a spreadsheet cell', 2], ['a form input', 3], ['a database column', 4], ['a config file', 5], ['a JSON field', 6], ['a UI label', 7], ['a dropdown', 8], ['a table header', 9], ['a CSS class', 10]]) {
  add('nontax_edit_vs_tax', `Input VAT into ${obj}. Case ${n}.`, 'REFUSE', 'non-tax editing action on a UI/software object');
  add('nontax_edit_vs_tax', `What is the VAT treatment of a ${['van','printer','laptop','desk','server','router','scanner','monitor','phone','tablet'][n-1]} purchase?`, 'ALLOW', 'VAT treatment of a purchase');
}
// F3: private-contract non-tax vs tax compliance
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  add('private_contract_vs_tax', `When is rent due under a private lease contract? Case ${n}.`, 'REFUSE', 'private contract, non-tax');
  add('private_contract_vs_tax', `What BIR form reports rental income withholding? Case ${n}.`, 'ALLOW', 'explicit BIR compliance');
}
// F4: label assignment vs tax applicability (fresh acronym+label-noun forms)
for (const ac of ['MCIT', 'NOLCO', 'DST', 'BIR', 'SLSP', 'EWT', 'CWT', 'FWT', 'RCIT', 'OSD']) {
  add('label_assign_vs_applicability', `We named the report filename ${ac}.`, 'REFUSE', 'acronym bound to a filename label');
  add('label_assign_vs_applicability', `Does ${ac} apply to a domestic corporation for income tax?`, 'ALLOW', 'tax applicability of a corporation');
}
// F5: contentless vs concrete (fresh)
for (const [obj, n] of [['a jeepney operator', 1], ['a sari-sari store', 2], ['a BPO employee', 3], ['an online seller', 4], ['a freelancer', 5], ['a cooperative', 6], ['a rice farmer', 7], ['a call center', 8], ['a food stall', 9], ['a tricycle driver', 10]]) {
  add('contentless_vs_concrete_v2', `Is it exempt? Ref ${n}.`, 'REFUSE', 'contentless bare pronoun');
  add('contentless_vs_concrete_v2', `Is income of ${obj} exempt from income tax?`, 'ALLOW', 'concrete taxable subject');
}
// F6: bare vs contextual acronym (fresh)
for (const ac of ['MCIT', 'RCIT', 'OSD', 'FWT', 'CWT', 'EWT', 'DST', 'FLD', 'PAN', 'FAN']) {
  add('bare_vs_contextual_v2', `Define ${ac}.`, 'CLARIFY', 'bare ambiguous acronym');
  add('bare_vs_contextual_v2', `Define ${ac} as used in a BIR assessment.`, 'ALLOW', 'acronym with BIR context');
}
// F7: clause-order reversal invariance (label controlling either order)
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  add('clause_order_invariance', `The label is DST; store it as the report name. Case ${n}.`, 'REFUSE', 'label naming controls');
  add('clause_order_invariance', `Store it as the report name; the label is DST. Case ${n}.`, 'REFUSE', 'clause order reversed, same control');
}
// F8: multiple numeric labels must not affect decision
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  add('numeric_label_invariance', `Is a delivery van deductible for income tax? Batch ${n} Ref ${n * 3} Case ${n * 7}.`, 'ALLOW', 'concrete tax subject; numerics incidental');
  add('numeric_label_invariance', `Adjust the fan speed. Batch ${n} Ref ${n * 3} Case ${n * 7}.`, 'REFUSE', 'ordinary action; numerics incidental');
}
// F9: negation vs explicit review (fresh)
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  add('negation_vs_review_v2', `Ignore taxes; just format the invoice layout. Case ${n}.`, 'REFUSE', 'negation removes tax + non-tax action');
  add('negation_vs_review_v2', `Setting aside the branding, is the consultancy fee subject to withholding tax? Case ${n}.`, 'ALLOW', 'explicit tax review');
}
// F10: filipino/taglish counterparts
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  add('filipino_v2', `I-format ang invoice layout. Kaso ${n}.`, 'REFUSE', 'taglish non-tax formatting action');
  add('filipino_v2', `May withholding tax ba sa bayad sa consultant? Kaso ${n}.`, 'ALLOW', 'taglish withholding on a payment');
}

const m = await import(pathToFileURL(ANALYZER).href + `?v=${Date.now()}`);
let pass = 0; const fails = [];
for (const p of pairs) { const ev = m.analyzePhilippineTaxIntent(p.query); if (ev.decision === p.expectedDecision) pass++; else fails.push({ ...p, actualDecision: ev.decision, actualReason: ev.reasonCode }); }
const byFamily = {}; for (const p of pairs) { byFamily[p.family] ??= { total: 0 }; byFamily[p.family].total++; }
const out = { totalQueries: pairs.length, pairs: pairs.length / 2, families: Object.keys(byFamily).length, passOnBase: pass, failOnBase: pairs.length - pass, byFamily, note: 'C6 extension authored from frozen structural rules; no model; no exact R3 query. Failures on the 2959 base are decision-lane targets; the decision-lock candidate must pass all.', failures: fails };
writeFileSync(`${R20}/COMMIT_5R1C6_DECISION_COUNTERFACTUAL_EXTENSION.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ totalQueries: out.totalQueries, pairs: out.pairs, families: out.families, passOnBase: pass, failOnBase: pairs.length - pass }, null, 2));
