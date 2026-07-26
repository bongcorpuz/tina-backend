// PHASE-10A14-R20 COMMIT 5R1-C7 — decision counterfactual suite v3.
// Expectations are authored from structural rules BEFORE any runtime change.
// No exact R3 query is copied; no model-generated expectations.
import fs from 'node:fs';
import * as L from './commit5r1c7-lib.mjs';

const pairs = [];
const P = (family, a, ea, b, eb, contrast) => pairs.push({ family, contrast, a: { query: a, expected: ea }, b: { query: b, expected: eb } });

// ---- family 1: concrete target with vs without a governing tax predicate
const targets = ['a delivery van', 'office air-conditioning units', 'warehouse rent', 'a consultant retainer', 'imported packaging film', 'staff uniforms', 'a company generator', 'legal retainer fees', 'branch electricity', 'a leased forklift'];
for (const t of targets) {
  P('concrete_target_relation', `Is ${t} deductible for income tax purposes?`, 'ALLOW', `Please arrange delivery of ${t} next Tuesday.`, 'REFUSE', 'tax predicate governs the target vs ordinary logistics action');
  P('concrete_target_relation', `What is the VAT treatment of ${t}?`, 'ALLOW', `Write a short advertisement about ${t}.`, 'REFUSE', 'tax treatment vs marketing copy');
}

// ---- family 2: concrete target vs label/name target
const codes = ['VAT', 'CGT', 'DST', 'MCIT', 'OSD', 'RCIT', 'EWT', 'FWT'];
for (const c of codes) {
  P('concrete_vs_label', `Is the ${c} rate applied to this sale of equipment?`, 'ALLOW', `Name the new spreadsheet column "${c}".`, 'REFUSE', 'tax relation over a target vs assigning the token as a label');
  P('concrete_vs_label', `How is ${c} computed for a domestic corporation?`, 'ALLOW', `Save the report file as ${c}_2026.xlsx`, 'REFUSE', 'computation relation vs filename binding');
}

// ---- family 3: contextual acronym states
const ambiguous = ['PAN', 'CAR', 'PT', 'AR', 'CV', 'BOC'];
for (const a of ambiguous) {
  P('contextual_acronym', `What does ${a} mean in BIR tax rules?`, 'ALLOW', `In our system, ${a} stands for the staff carpool roster.`, 'REFUSE', 'explicit tax context vs explicit non-tax expansion');
  P('contextual_acronym', `Is ${a} required when filing the annual return?`, 'ALLOW', `Treat ${a} as the label for our internal archive.`, 'REFUSE', 'tax procedure relation vs label binding');
  pairs.push({ family: 'contextual_acronym', contrast: 'bare materially ambiguous acronym with no controlling context', a: { query: `${a}?`, expected: 'CLARIFY' }, b: { query: `Note: ${a} = weekend hiking club.`, expected: 'REFUSE' } });
}

// ---- family 4: resolved vs contentless referent
const preds = ['deductible', 'subject to VAT', 'subject to withholding tax', 'taxable income', 'zero-rated'];
for (const p of preds) {
  P('resolved_vs_unresolved', `We bought a service vehicle this quarter. Is it ${p}?`, 'ALLOW', `Is it ${p}? Situation 7.`, 'REFUSE', 'same-query concrete antecedent vs contentless tagged referent');
  P('resolved_vs_unresolved', `Our firm paid a security agency monthly. Is that payment ${p}?`, 'ALLOW', `Is that ${p}? Item 12.`, 'REFUSE', 'resolved antecedent vs bare attribute with scenario tag');
}

// ---- family 5: compliance vs treatment (both ALLOW; must not collapse)
const comp = [
  ['Which BIR form is used to remit expanded withholding tax?', 'How is expanded withholding tax computed on rentals?'],
  ['When must the quarterly percentage tax return be filed?', 'Is percentage tax deductible as an expense?'],
  ['Where do I register books of accounts?', 'Are bookkeeping fees subject to VAT?'],
  ['How do I secure a certificate of registration?', 'Is the registration fee a deductible expense?'],
  ['What attachment supports a claim for creditable withholding tax?', 'How is creditable withholding tax applied against income tax due?'],
];
for (const [c, t] of comp) P('compliance_vs_treatment', c, 'ALLOW', t, 'ALLOW', 'procedure relation and treatment relation are both governed tax relations');

// ---- family 6: quoted vs substantive use
for (const c of ['VAT', 'DST', 'CGT', 'MCIT']) {
  P('quoted_vs_substantive', `How is ${c} applied to a sale of real property?`, 'ALLOW', `Spell the word "${c}" backwards.`, 'REFUSE', 'substantive tax use vs metalinguistic text manipulation');
  P('quoted_vs_substantive', `Define ${c} under Philippine tax rules.`, 'ALLOW', `How many letters are in "${c}"?`, 'REFUSE', 'tax definition vs character counting');
}

// ---- family 7: multi-clause primary-task selection (order reversal preserves primary action)
const mc = [
  ['Our books are messy, but my main question is whether the equipment purchase is VAT-creditable.', 'My main question is whether the equipment purchase is VAT-creditable, although our books are messy.'],
  ['Before anything else, is the freight charge subject to withholding tax? We can discuss the ledger later.', 'We can discuss the ledger later; before anything else, is the freight charge subject to withholding tax?'],
  ['Ignore the office move for now — is the terminal leave benefit taxable?', 'Is the terminal leave benefit taxable? Ignore the office move for now.'],
];
for (const [x, y] of mc) P('multiclause_task_focus', x, 'ALLOW', y, 'ALLOW', 'clause-order reversal preserves the primary requested action');
const mcNon = [
  ['Please book the venue, and also name the folder VAT.', 'Also name the folder VAT, and please book the venue.'],
  ['Draft the party invite, then tag the file DST.', 'Then tag the file DST, after drafting the party invite.'],
];
for (const [x, y] of mcNon) P('multiclause_task_focus', x, 'REFUSE', y, 'REFUSE', 'non-tax primary action preserved under clause reversal');

// ---- family 8: Filipino / Taglish structural counterparts
const fil = [
  ['Ang bilihin ng kagamitan, deductible ba ito sa income tax?', 'ALLOW', 'Pakiluto naman ng adobo para sa handaan.', 'REFUSE'],
  ['May VAT ba ang serbisyo ng contractor namin?', 'ALLOW', 'Ano ang pangalan ng bagong folder namin?', 'REFUSE'],
  ['Kailan dapat i-file ang quarterly return?', 'ALLOW', 'Kailan ang birthday party ng anak ko?', 'REFUSE'],
  ['Paano kinakalkula ang withholding tax sa upa?', 'ALLOW', 'Paano maglaro ng basketball?', 'REFUSE'],
  ['Taxable ba ang bonus na natanggap ng empleyado?', 'ALLOW', 'Masarap ba ang bagong kainan sa kanto?', 'REFUSE'],
];
for (const [a, ea, b, eb] of fil) P('filipino_taglish', a, ea, b, eb, 'parallel structural contrast without translation');

// ---- family 9: non-tax legal / civil domain vs tax domain
const civil = [
  ['Is the rental payment subject to expanded withholding tax?', 'Can my landlord evict a tenant for one late payment?'],
  ['Is the contractor payment subject to withholding tax?', 'Can a contractor be sued for missing a deadline?'],
  ['Are director fees subject to withholding tax?', 'Can the board remove a director under corporate law?'],
  ['Is the sale of shares subject to capital gains tax?', 'Can a shareholder inspect corporate records?'],
];
for (const [t, c] of civil) P('tax_vs_civil_domain', t, 'ALLOW', c, 'REFUSE', 'tax relation vs private civil/corporate remedy question');

// ---- family 10: numeric / wording invariance (scenario tags must not change the decision)
const numeric = ['What penalty applies for late payment of deficiency interest', 'Can input VAT be claimed on a training seminar', 'Does transfer pricing documentation apply'];
for (const base of numeric) {
  for (const tag of ['', ' in scenario 3?', ' in scenario 77?', ' Batch QQ-5.']) {
    pairs.push({ family: 'numeric_invariance', contrast: 'scenario tag must not alter a governed tax decision', a: { query: base + (tag || '?'), expected: 'ALLOW' }, b: { query: base + (tag || '?'), expected: 'ALLOW' } });
  }
}

// ---- family 11: tax predicate over concrete target, expanded target inventory
const targets2 = ['a company laptop', 'imported raw sugar', 'a service contractor invoice', 'factory utilities', 'a delivery motorcycle', 'seminar registration fees', 'an office lease deposit', 'freight and handling charges', 'a distributor commission', 'employee medical allowance', 'a purchased trademark', 'spare parts inventory'];
const preds2 = [['Is', 'deductible against gross income?'], ['Is', 'subject to value-added tax?'], ['Is', 'subject to creditable withholding tax?']];
for (const t of targets2) {
  for (const [lead, tail] of preds2) {
    P('concrete_target_relation_expanded', `${lead} ${t} ${tail}`, 'ALLOW', `Please summarise the vendor brochure for ${t}.`, 'REFUSE', 'governed tax predicate over concrete target vs ordinary document task');
  }
}

// ---- family 12: contentless referent across predicate forms
const bareForms = ['Is this deductible', 'When is the return due', 'What form should I use', 'What is the filing deadline', 'Is it subject to VAT', 'How much tax is due'];
for (const b of bareForms) {
  for (const tag of ['Matter 3.', 'Case AA-9.', 'Reference 41.']) {
    P('contentless_referent', `${b} for the imported machinery we purchased?`, 'ALLOW', `${b}? ${tag}`, 'REFUSE', 'concrete resolved target vs contentless tagged attribute');
  }
}

// ---- family 13: PH tax authority terms vs non-tax homograph use
const authTerms = [['RMC', 'revenue memorandum circular'], ['RCIT', 'regular corporate income tax'], ['MCIT', 'minimum corporate income tax'], ['OSD', 'optional standard deduction'], ['CTA', 'Court of Tax Appeals'], ['DST', 'documentary stamp tax'], ['EWT', 'expanded withholding tax'], ['FWT', 'final withholding tax']];
for (const [t, expansion] of authTerms) {
  P('authority_term_vs_homograph', `What is ${t} under Philippine tax rules?`, 'ALLOW', `Rename the backup folder to ${t}.`, 'REFUSE', 'PH tax authority term definition vs folder naming');
  P('authority_term_vs_homograph', `How does ${t} apply to a domestic corporation?`, 'ALLOW', `Print the letters of ${t} in reverse order.`, 'REFUSE', 'tax application relation vs text manipulation');
}

// ---- family 14: explicit non-tax expansion phrasings (label/definition binding)
const expansionForms = ['Within this document, %s refers to the %s.', 'For clarity, %s abbreviates the %s.', 'Our team writes %s to mean the %s.', 'Throughout the manual, %s denotes the %s.', 'Please read %s as the %s.', 'By convention %s indicates the %s.'];
const nonTaxExp = [['PAN', 'pantry access notice'], ['CAR', 'carpool arrival record'], ['PT', 'paint touch-up ticket'], ['AR', 'attendance roster'], ['CV', 'canteen voucher']];
for (const form of expansionForms) {
  for (const [a, e] of nonTaxExp.slice(0, 3)) {
    P('explicit_non_tax_expansion', `Is ${a} required on the BIR registration form?`, 'ALLOW', form.replace('%s', a).replace('%s', e), 'REFUSE', 'tax procedure relation vs explicit non-tax expansion binding');
  }
}

// ---- family 15: civil / regulatory non-tax domain breadth
const civil2 = [
  ['Is the professional fee subject to withholding tax?', 'What notice period ends a private lease?'],
  ['Is the interest income subject to final tax?', 'What remedies exist if a supplier breaches our purchase order?'],
  ['Are royalties subject to final withholding tax?', 'Which tribunal hears an unpaid personal loan dispute?'],
  ['Is the dividend subject to final tax?', 'How long may a corporation delay its general membership meeting?'],
  ['Is the equipment lease subject to VAT?', 'Must a residential sublease be witnessed by two people?'],
  ['Is the insurance premium deductible?', 'May a company reclaim relocation costs from a departing hire?'],
];
for (const [t, c] of civil2) P('tax_vs_civil_domain_expanded', t, 'ALLOW', c, 'REFUSE', 'governed tax relation vs private civil or non-tax regulatory remedy');

// flatten to queries
const queries = [];
const seen = new Set();
for (const p of pairs) {
  for (const side of ['a', 'b']) {
    const q = p[side].query;
    if (seen.has(q)) continue;
    seen.add(q);
    queries.push({ family: p.family, query: q, expectedDecision: p[side].expected, contrast: p.contrast });
  }
}

// guard: no exact R3 query may be copied
const r3 = JSON.parse(fs.readFileSync('evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', 'utf8')).rows;
const r3set = new Set(r3.map((r) => r.query.trim().toLowerCase()));
const leaked = queries.filter((q) => r3set.has(q.query.trim().toLowerCase()));
if (leaked.length) throw new Error('R3 QUERY LEAKAGE: ' + leaked.length + ' ' + JSON.stringify(leaked.slice(0, 3)));

L.writeJson(L.RES + 'COMMIT_5R1C7_DECISION_COUNTERFACTUAL_V3_SUITE.json', {
  unit: 'COMMIT 5R1-C7',
  authoredBeforeRuntimeChange: true,
  expectationSource: 'structural rules authored by the executor; no model-generated expectations',
  exactR3QueryLeakage: 0,
  families: [...new Set(pairs.map((p) => p.family))],
  pairCount: pairs.length,
  queryCount: queries.length,
  pairs,
  queries,
});
console.log('pairs=' + pairs.length + ' queries=' + queries.length + ' leakage=' + leaked.length);
console.log('families=' + [...new Set(pairs.map((p) => p.family))].length);
