// PHASE-10A14-R20 COMMIT 5R1-C5 — deterministic counterfactual pair controls.
// Each family differs in ONE controlling structural feature. Expectations authored from
// frozen structural rules BELOW, before runtime execution. No model. No exact R3 query.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REPO } from './identity.mjs';

const ANALYZER = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;

// Structural expectation rules (authored, not model-generated):
// - tax predicate on a CONCRETE or RESOLVED taxable subject -> ALLOW
// - tax-attribute question with only a bare pronoun/determiner, no procedure -> REFUSE (no_tax_relation)
// - explicit compliance procedure (form/return/deadline-to-file/registration) even with implicit object -> ALLOW
// - tax-shaped acronym bound to a naming/label action -> REFUSE
// - tax-shaped acronym with explicit tax expansion/context -> ALLOW
// - bare ambiguous acronym, no controlling relation -> CLARIFY
// - tax term quoted as text for a text operation (count/spell/translate/repeat) -> REFUSE
// - ordinary/homograph action on a non-tax object -> REFUSE
// - negation removing tax relevance + non-tax action -> REFUSE; negation but explicit tax review -> ALLOW
const pairs = [];
const add = (family, query, expected, feature) => pairs.push({ family, query, expectedDecision: expected, controllingFeature: feature });

// Family 1: contentless vs concrete target
for (const [obj, n] of [['the office printer', 1], ['a delivery van', 2], ['imported machinery', 3], ['a marketing agency expense', 4], ['the leased warehouse', 5], ['a consultant fee', 6], ['the company car', 7], ['a training seminar cost', 8], ['the software subscription', 9], ['a client dinner', 10]]) {
  add('contentless_vs_concrete', `Is this deductible? Item ${n}.`, 'REFUSE', 'contentless bare pronoun subject');
  add('contentless_vs_concrete', `Is ${obj} deductible?`, 'ALLOW', 'concrete taxable subject');
}
// Family 2: bare vs contextual acronym
for (const ac of ['MCIT', 'RCIT', 'OSD', 'FWT', 'DST', 'EWT', 'CWT', 'FLD', 'PAN', 'FAN']) {
  add('bare_vs_contextual_acronym', `What is ${ac}?`, 'CLARIFY', 'bare ambiguous acronym, no context');
  add('bare_vs_contextual_acronym', `What does ${ac} mean under BIR rules?`, 'ALLOW', 'acronym with explicit tax context');
}
// Family 3: label assignment vs tax treatment
for (const ac of ['MCIT', 'SLSP', 'RCIT', 'PAN', 'FWT', 'OSD', 'DST', 'EWT', 'CWT', 'RR']) {
  add('label_vs_tax', `Use ${ac} as the product code.`, 'REFUSE', 'acronym bound to naming/label action');
  add('label_vs_tax', `Does ${ac} apply to this corporation for income tax?`, 'ALLOW', 'tax predicate on corporation');
}
// Family 4: homograph ordinary action vs tax action
for (const [thing, n] of [['fan', 1], ['monitor', 2], ['printer', 3], ['plugin', 4], ['font', 5], ['router', 6], ['speaker', 7], ['keyboard', 8], ['webcam', 9], ['scanner', 10]]) {
  add('homograph_action_vs_tax', `Adjust the ${thing} settings. Case ${n}.`, 'REFUSE', 'ordinary action on non-tax object');
  add('homograph_action_vs_tax', `What is the VAT treatment of the ${thing} purchase?`, 'ALLOW', 'VAT treatment of a purchase');
}
// Family 5: quoted phrase vs tax definition
for (const term of ['withholding tax', 'value added tax', 'documentary stamp tax', 'estate tax', 'percentage tax', 'capital gains tax', 'donor tax', 'excise tax', 'fringe benefit tax', 'gross receipts tax']) {
  add('quote_vs_definition', `Count the letters in "${term}".`, 'REFUSE', 'tax term quoted for text operation');
  add('quote_vs_definition', `What does "${term}" mean under BIR rules?`, 'ALLOW', 'tax definition with context');
}
// Family 6: negated tax relevance vs explicit review
for (const n of [1,2,3,4,5,6,7,8,9,10]) {
  add('negation_vs_review', `Do not discuss tax; improve the slogan. Case ${n}.`, 'REFUSE', 'negation removes tax + non-tax action');
  add('negation_vs_review', `Although the label is non-tax, review whether the payment is subject to VAT. Case ${n}.`, 'ALLOW', 'negation but explicit tax review');
}
// Family 7: Filipino/Taglish task contrast
for (const n of [1,2,3,4,5,6,7,8,9,10]) {
  add('filipino_task_contrast', `Ayusin ang fan speed. Kaso ${n}.`, 'REFUSE', 'taglish ordinary action on non-tax object');
  add('filipino_task_contrast', `May VAT ba ang benta ng serbisyo? Kaso ${n}.`, 'ALLOW', 'taglish VAT treatment of a sale');
}
// Family 8: multi-clause task focus (clause order changes, controlling action same)
for (const n of [1,2,3,4,5,6,7,8,9,10]) {
  add('multiclause_focus', `The code is MCIT; name the product code accordingly. Case ${n}.`, 'REFUSE', 'controlling action is naming a label');
  add('multiclause_focus', `Name the product code accordingly; the code is MCIT. Case ${n}.`, 'REFUSE', 'clause order reversed, same controlling action');
}
// Family 9: implicit-object compliance vs contentless (the dev-03 boundary)
for (const n of [1,2,3,4,5,6,7,8,9,10]) {
  add('compliance_vs_contentless', `What BIR form is used to file monthly VAT? Case ${n}.`, 'ALLOW', 'explicit compliance procedure, implicit object ALLOWED');
  add('compliance_vs_contentless', `What is the deadline? Case ${n}.`, 'REFUSE', 'bare attribute, no procedure, contentless');
}

// Family 10: numeric-scenario invariance (dangling scenario vs resolved) + concrete import
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  add('scenario_invariance', `What about gross receipts for scenario ${n}?`, 'CLARIFY', 'dangling scenario referent');
  add('scenario_invariance', `How does BOC assess customs duties on imported machinery in batch ${n}?`, 'ALLOW', 'concrete customs treatment, numeric tag incidental');
}

const m = await import(pathToFileURL(ANALYZER).href + `?v=${Date.now()}`);
let pass = 0; const fails = [];
for (const p of pairs) {
  const ev = m.analyzePhilippineTaxIntent(p.query);
  const ok = ev.decision === p.expectedDecision;
  if (ok) pass++; else fails.push({ ...p, actualDecision: ev.decision, actualReason: ev.reasonCode });
}
const byFamily = {};
for (const p of pairs) { byFamily[p.family] ??= { total: 0 }; byFamily[p.family].total++; }
const out = { totalQueries: pairs.length, families: Object.keys(byFamily).length, passOnBase: pass, failOnBase: pairs.length - pass, byFamily, note: 'Authored from frozen structural rules; no model; no exact R3 query. Run on the accepted 2955 base — failures here are the decision-lane targets. The suite must pass on the final decision-locked runtime.', failures: fails };
writeFileSync(`${R20}/COMMIT_5R1C5_DECISION_COUNTERFACTUAL_PAIRS.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ totalQueries: pairs.length, families: out.families, passOnBase: pass, failOnBase: pairs.length - pass }, null, 2));
