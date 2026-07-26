// PHASE-10A14-R20 COMMIT 5R1-C8 — decision counterfactual v4 extension.
// Expectations authored from structural rules BEFORE any runtime change.
// No exact R3 query is copied; no model-generated expectations.
import fs from 'node:fs';
import * as L from './commit5r1c8-lib.mjs';

const pairs = [];
const P = (family, a, ea, b, eb, contrast) => pairs.push({ family, contrast, a: { query: a, expected: ea }, b: { query: b, expected: eb } });

// ── F1: concrete tax target vs contentless referent
const preds = ['deductible against gross income', 'subject to value-added tax', 'subject to creditable withholding tax', 'subject to final tax', 'part of taxable income'];
const objs = ['the delivery tricycle we bought', 'the warehouse rental we pay', 'the consultancy fee we paid', 'the imported conveyor belt', 'the staff medical allowance'];
for (let i = 0; i < preds.length; i++) {
  P('concrete_vs_contentless', `Is ${objs[i]} ${preds[i]}?`, 'ALLOW', `Is it ${preds[i]}? Situation ${7 + i}.`, 'REFUSE', 'concrete target vs contentless deictic with metadata suffix');
  P('concrete_vs_contentless', `Is ${objs[i]} ${preds[i]}?`, 'ALLOW', `Is that ${preds[i]}? Item ${12 + i}.`, 'REFUSE', 'concrete target vs contentless deictic with item suffix');
}

// ── F2: same-query antecedent vs metadata suffix
const ants = [
  ['Our firm purchased a service van last quarter.', 'is it deductible?'],
  ['We paid a security agency monthly retainers.', 'is that subject to withholding tax?'],
  ['The company imported laboratory glassware.', 'is it subject to customs duty?'],
  ['We received royalty income from a licensee.', 'is it subject to final tax?'],
  ['The branch leased a commercial generator.', 'is that subject to VAT?'],
];
for (const [ante, ask] of ants) {
  P('antecedent_vs_metadata', `${ante} ${ask.charAt(0).toUpperCase() + ask.slice(1)}`, 'ALLOW', `${ask.charAt(0).toUpperCase() + ask.slice(1)} Reference 41.`, 'REFUSE', 'same-query concrete antecedent resolves the deictic; a metadata suffix does not');
}

// ── F3: primary tax task vs subordinate label clause
const subord = [
  ['Is the sale of the pump VATable if the pump is tagged with our internal product code?', 'Tag the pump record with our internal product code.'],
  ['Is the equipment purchase deductible even though we filed it under an internal project code?', 'File the equipment record under an internal project code.'],
  ['Is the freight charge subject to withholding tax although the invoice is stored under a short code?', 'Store the freight invoice under a short code.'],
  ['Is the imported panel dutiable when the panel is labelled with a warehouse tag?', 'Label the imported panel with a warehouse tag.'],
];
for (const [tax, label] of subord) P('primary_tax_vs_subordinate_label', tax, 'ALLOW', label, 'REFUSE', 'a subordinate label clause must not veto a genuine tax-treatment question');

// ── F4: primary label task vs incidental tax token
const codes = ['VAT', 'CGT', 'DST', 'EWT', 'MCIT', 'OSD'];
for (const c of codes) {
  P('primary_label_vs_incidental_token', `How is ${c} computed for a domestic corporation?`, 'ALLOW', `Enter ${c} into the second web form field.`, 'REFUSE', 'tax computation relation vs an imperative data-entry action naming the token');
  P('primary_label_vs_incidental_token', `What is the ${c} rate on this sale?`, 'ALLOW', `Use ${c} as the caption of the console output panel.`, 'REFUSE', 'tax rate relation vs assigning the token as a UI caption');
}

// ── F5: CGT / final-tax / deductibility / computation relations
const rel = [
  'How is capital gains tax computed on a sale of unlisted shares?',
  'What capital gains tax rate applies to an individual selling land?',
  'Is interest income from a time deposit subject to final tax?',
  'Is a dividend received by a resident individual subject to final tax?',
  'Is the insurance premium on company vehicles deductible?',
  'How much tax is due on imported machinery for a manufacturer?',
  'Is the professional fee paid to a consultant subject to expanded withholding tax?',
  'What documentary stamp tax applies to an original issue of shares?',
];
for (const q of rel) P('governed_tax_relations', q, 'ALLOW', q.replace(/\?$/, ' in our internal wiki page title?'), 'ALLOW', 'a governed tax relation stays ALLOW; incidental wording must not change it');

// ── F6: bare acronym vs tax context vs explicit non-tax expansion
const amb = ['PAN', 'CAR', 'FAN', 'AR', 'PT'];
for (const a of amb) {
  pairs.push({ family: 'acronym_states', contrast: 'bare materially ambiguous token with no controlling context', a: { query: `${a}?`, expected: 'CLARIFY' }, b: { query: `Within this memo, ${a} refers to the shuttle roster.`, expected: 'REFUSE' } });
  P('acronym_states', `Is ${a} required when filing the annual information return?`, 'ALLOW', `Set ${a} as the caption of the pantry notice board.`, 'REFUSE', 'tax procedure relation vs label assignment');
}

// ── F7: quotation / text manipulation
for (const c of ['VAT', 'DST', 'CGT', 'EWT']) {
  P('quotation_scope', `How does ${c} apply to a lease of commercial space?`, 'ALLOW', `Write the word "${c}" using only lowercase letters.`, 'REFUSE', 'substantive tax use vs metalinguistic text operation');
  P('quotation_scope', `Define ${c} under Philippine tax rules.`, 'ALLOW', `Sort the words "${c}" and "levy" alphabetically.`, 'REFUSE', 'tax definition vs alphabetical sorting');
}

// ── F8: multi-clause order reversal
const mc = [
  ['Our ledger is behind, but the real question is whether the generator lease is VATable.', 'The real question is whether the generator lease is VATable, though our ledger is behind.'],
  ['Set the archive aside for now: is the courier fee subject to withholding tax?', 'Is the courier fee subject to withholding tax? Set the archive aside for now.'],
];
for (const [x, y] of mc) P('multiclause_reversal', x, 'ALLOW', y, 'ALLOW', 'clause-order reversal preserves the primary requested action');
const mcNon = [
  ['Book the meeting room, and label the folder CGT.', 'Label the folder CGT, and book the meeting room.'],
  ['Draft the newsletter, then title the sheet DST.', 'Title the sheet DST, then draft the newsletter.'],
];
for (const [x, y] of mcNon) P('multiclause_reversal', x, 'REFUSE', y, 'REFUSE', 'non-tax primary action preserved under clause reversal');

// ── F9: Filipino / Taglish equivalents
const fil = [
  ['Deductible ba ang binili naming service van sa income tax?', 'ALLOW', 'Pakisulat ng maikling tula tungkol sa tag-ulan.', 'REFUSE'],
  ['May VAT ba ang upa sa bodega namin?', 'ALLOW', 'Ano ang pangalan ng bagong folder sa desktop?', 'REFUSE'],
  ['Kailangan bang i-withhold ang buwis sa bayad sa kontraktor?', 'ALLOW', 'Kailangan bang i-print ang poster para sa palaro?', 'REFUSE'],
  ['Taxable ba ang natanggap na komisyon ng ahente?', 'ALLOW', 'Masarap ba ang bagong panaderya sa kanto?', 'REFUSE'],
];
for (const [a, ea, b, eb] of fil) P('filipino_taglish', a, ea, b, eb, 'parallel structural contrast without translation');

// ── F10: word-boundary substring traps
const traps = [
  ['Is the equipment rental subject to VAT?', 'How do I organise a taxonomy of our product lines?'],
  ['Is the delivery charge subject to withholding tax?', 'Can I book a taxicab for the airport run?'],
  ['What is the deadline to file the annual return?', 'What is the syntax for a nested lookup formula?'],
  ['Is the imported motor subject to customs duty?', 'How do I import a spreadsheet into the reporting tool?'],
  ['What penalty applies to a late annual return?', 'What penalty applies in a shootout under the league rules?'],
];
for (const [tax, trap] of traps) P('substring_traps', tax, 'ALLOW', trap, 'REFUSE', 'tax relation vs an ordinary word merely containing a tax-shaped substring');

// ── F11: tax token inside a non-tax imperative
const imperatives = [
  ['Is input VAT creditable against output VAT for a trading company?', 'Enter the input VAT figure into the third column of the sheet.'],
  ['Is output VAT payable on a consignment sale?', 'Print the output VAT caption on the summary page.'],
  ['Is the withholding tax certificate required for this payment?', 'Attach the withholding tax certificate scan to the shared drive.'],
];
for (const [tax, imp] of imperatives) P('tax_token_in_non_tax_imperative', tax, 'ALLOW', imp, 'REFUSE', 'a tax relation over a target vs an imperative data-handling action naming the same token');

// ── F12: tax term in a non-tax professional domain
const crossDomain = [
  ['Does a permanent establishment arise for a foreign contractor in the Philippines?', 'What permanent structure is required for a heritage building restoration?'],
  ['How do I file a request for reconsideration of a deficiency assessment?', 'How do I request reconsideration of a university grade?'],
  ['What happens at a notice for informal conference with the BIR?', 'What goes on the agenda of an informal team conference?'],
  ['Is the taxpayer entitled to a refund claim before prescription lapses?', 'Is a customer entitled to a refund claim on a delayed parcel?'],
];
for (const [tax, other] of crossDomain) P('tax_term_cross_domain', tax, 'ALLOW', other, 'REFUSE', 'a tax instrument in its own domain vs the same words in an unrelated professional domain');

// ── F13: bare governed tax topic vs bare non-tax topic
const bareTax = ['tax sparing credit rules', 'situs of local business taxation', 'remedies available to an assessed taxpayer', 'taxable accounting period election', 'double taxation agreement relief', 'resident alien taxation rules', 'prescription of a refund claim', 'business tax situs allocation'];
const bareNonTax = ['weekend hiking club', 'office pantry roster', 'annual sports festival', 'library shelving plan', 'staff carpool schedule', 'canteen menu rotation', 'parking sticker renewal', 'lobby signage refresh'];
for (let i = 0; i < bareTax.length; i++) {
  P('bare_tax_topic', bareTax[i], 'ALLOW', bareNonTax[i], 'REFUSE', 'a bare governed tax topic is self-resolving subject matter; a bare non-tax topic is not');
}

// ── F14: metadata suffix must not change a governed decision
const suffixBases = [
  ['Are charity bazaar receipts taxable', 'ALLOW'],
  ['Does the authority to print receipts requirement apply', 'ALLOW'],
  ['Is the delivery fee subject to withholding tax', 'ALLOW'],
];
for (const [base, exp] of suffixBases) {
  for (const suffix of [' Group MM-91.', ' Batch RR-8.', ' Set QQ-3.']) {
    pairs.push({ family: 'metadata_suffix_invariance', contrast: 'an enumerated metadata suffix carries no target and must not alter a governed decision', a: { query: base + '?', expected: exp }, b: { query: base + '?' + suffix, expected: exp } });
  }
}

// ── flatten
const queries = [];
const seen = new Set();
for (const p of pairs) for (const side of ['a', 'b']) {
  const q = p[side].query;
  if (seen.has(q)) continue;
  seen.add(q);
  queries.push({ family: p.family, query: q, expectedDecision: p[side].expected, contrast: p.contrast });
}

// ── leakage guard
const r3 = JSON.parse(fs.readFileSync('evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', 'utf8')).rows;
const r3set = new Set(r3.map((r) => r.query.trim().toLowerCase()));
const leaked = queries.filter((q) => r3set.has(q.query.trim().toLowerCase()));
if (leaked.length) throw new Error('R3 QUERY LEAKAGE: ' + leaked.length + ' ' + JSON.stringify(leaked.slice(0, 3)));

L.writeJson(L.RES + 'COMMIT_5R1C8_DECISION_COUNTERFACTUAL_V4_SUITE.json', {
  unit: 'COMMIT 5R1-C8',
  authoredBeforeRuntimeChange: true,
  expectationSource: 'structural rules authored by the executor; no model-generated expectations',
  exactR3QueryLeakage: 0,
  families: [...new Set(pairs.map((p) => p.family))],
  pairCount: pairs.length, queryCount: queries.length,
  pairs, queries,
});
console.log('v4 pairs=' + pairs.length + ' queries=' + queries.length + ' families=' + new Set(pairs.map((p) => p.family)).size + ' leakage=' + leaked.length);
