// PHASE-10A14-R20 COMMIT 5R1-C10 — decision counterfactual v6 extension.
// Expectations authored from structural rules BEFORE any runtime change.
// No exact R3 query is copied; no model-generated expectations.
import fs from 'node:fs';
import * as L from './commit5r1c10-lib.mjs';

const pairs = [];
const P = (family, a, ea, b, eb, contrast) => pairs.push({ family, contrast, a: { query: a, expected: ea }, b: { query: b, expected: eb } });

// ── F1: tax-canonical concept vs polysemous acronym
const canonical = ['MCIT', 'RCIT', 'NOLCO', 'IAET', 'SLSP'];
for (const t of canonical) {
  pairs.push({ family: 'canonical_concept_vs_polysemous', contrast: 'tax-canonical acronym as the requested concept vs a materially polysemous token with no context', a: { query: `${t} treatment for a domestic company`, expected: 'ALLOW' }, b: { query: 'AR?', expected: 'CLARIFY' } });
}
const polysemous = ['PAN', 'CAR', 'FAN', 'PT', 'AR'];
for (const t of polysemous) {
  pairs.push({ family: 'canonical_concept_vs_polysemous', contrast: 'polysemous token clarifies bare, allows with explicit tax procedure context', a: { query: `${t} issued after a BIR audit`, expected: 'ALLOW' }, b: { query: `${t} for the office social club`, expected: 'REFUSE' } });
}

// ── F2: richer issuance/procedure context vs bare token (rich-context guard)
const issuanceVerbs = ['What did the', 'Which paragraph of the', 'When was the'];
for (const v of issuanceVerbs) {
  P('richer_issuance_vs_bare_token', `${v} revenue memorandum circular say about zero-rated sales?`, 'ALLOW', `${v} weekend rota say about parking?`, 'REFUSE', 'richer tax issuance question vs an ordinary internal document question');
}
P('richer_issuance_vs_bare_token', 'How does the revenue issuance change the withholding rate on rentals?', 'ALLOW', 'How does the newsletter change the pantry roster?', 'REFUSE', 'tax issuance effect vs ordinary notice effect');
P('richer_issuance_vs_bare_token', 'Which BIR issuance governs the invoicing requirement for a VAT taxpayer?', 'ALLOW', 'Which club bulletin governs the raffle draw order?', 'REFUSE', 'tax issuance authority vs club bulletin');

// ── F3: holding-period tax context vs metadata-only context
const attrs = ['holding period', 'prescriptive period', 'grace period'];
for (const a of attrs) {
  P('tax_context_vs_metadata_only', `How does the ${a} affect capital gains tax on a land sale?`, 'ALLOW', `What is the ${a}? Reference 41.`, 'REFUSE', 'a tax attribute governed by a real tax question vs the same attribute with only an enumerated suffix');
  P('tax_context_vs_metadata_only', `What ${a} applies to a taxpayer claiming a refund?`, 'ALLOW', `What ${a} applies? Matter 3.`, 'REFUSE', 'attribute with a named tax subject vs attribute with a metadata suffix');
}

// ── F4: legal title vs internal-label assignment
const statutes = [
  ['Does the Customs Modernization and Tariff Act change the duty on this shipment?', 'Label this shipment folder CMTA for the archive.'],
  ['What does the National Internal Revenue Code require for invoicing?', 'Name the invoicing template NIRC in the shared drive.'],
  ['Does the Ease of Paying Taxes Act move the filing venue for a small taxpayer?', 'Tag the venue booking sheet EOPT for the team.'],
  ['How does the Tariff and Customs Code treat a re-imported article?', 'Store the re-import checklist under the code TCC.'],
];
for (const [tax, label] of statutes) P('legal_title_vs_internal_label', tax, 'ALLOW', label, 'REFUSE', 'a named statute inside a tax question is subject matter; assigning it as a name is label binding');

// ── F5: tax return / claim / registration vs ordinary senses
P('tax_sense_vs_ordinary_sense', 'When is the annual income tax return of a corporation due?', 'ALLOW', 'When can a customer send back a faulty blender?', 'REFUSE', 'tax return due date vs consumer goods return');
P('tax_sense_vs_ordinary_sense', 'Can a taxpayer claim a refund of excess creditable withholding tax?', 'ALLOW', 'Can a traveller claim compensation for a cancelled coach?', 'REFUSE', 'tax refund claim vs travel compensation claim');
P('tax_sense_vs_ordinary_sense', 'Is registration with the revenue district office required for a new branch?', 'ALLOW', 'Is registration required for the inter-office badminton tournament?', 'REFUSE', 'tax registration vs sports registration');
P('tax_sense_vs_ordinary_sense', 'Which alphalist of payees supports the annual withholding return?', 'ALLOW', 'Please arrange the trainee names in alphabetical order.', 'REFUSE', 'tax alphalist vs alphabetising trainee names');
P('tax_sense_vs_ordinary_sense', 'What output tax arises on a consignment sale by a VAT taxpayer?', 'ALLOW', 'Where does the build write its diagnostic output?', 'REFUSE', 'output tax vs program diagnostic output');
P('tax_sense_vs_ordinary_sense', 'What is the deadline for remitting final withholding tax?', 'ALLOW', 'What is the deadline for returning the borrowed atlas?', 'REFUSE', 'tax remittance deadline vs library return deadline');

// ── F6: primary tax clause vs subordinate label/code clause
const subord = [
  ['Is the sale of the compressor subject to VAT if the compressor carries an internal code?', 'Give the compressor record an internal code.'],
  ['Is the consultancy fee subject to withholding tax although it is booked under a project code?', 'Book the consultancy fee under a project code.'],
  ['Is the imported reel dutiable when the reel is tagged with a warehouse code?', 'Tag the imported reel with a warehouse code.'],
  ['Is the equipment purchase deductible even though it is filed under a short code?', 'File the equipment purchase under a short code.'],
];
for (const [tax, label] of subord) P('primary_tax_vs_subordinate_code', tax, 'ALLOW', label, 'REFUSE', 'a subordinate code clause must not veto the primary tax question');

// ── F7: concise tax noun phrase vs ordinary noun phrase
const conciseTax = ['refund claim prescription period', 'taxable compensation of a supervisor', 'capital gains tax computation on shares', 'revenue district office registration', 'documentary stamp tax on a loan agreement', 'final withholding tax on royalties'];
const conciseOrdinary = ['weekend badminton ladder schedule', 'office plant watering rota', 'canteen menu rotation plan', 'lobby art rotation list', 'staff birthday calendar entry', 'parking sticker renewal notice'];
for (let i = 0; i < conciseTax.length; i++) {
  P('concise_tax_phrase_vs_ordinary', conciseTax[i], 'ALLOW', conciseOrdinary[i], 'REFUSE', 'a coherent tax-domain phrase is a governed request; an ordinary phrase is not');
}

// ── F8: tax predicate over a target vs contentless referent
const preds = ['taxable', 'deductible', 'subject to value-added tax'];
for (let i = 0; i < preds.length; i++) {
  P('predicate_over_target_vs_contentless', `Our depot leased a forklift last quarter. Is it ${preds[i]}?`, 'ALLOW', `Is it ${preds[i]}? Situation ${9 + i}.`, 'REFUSE', 'same-query concrete antecedent resolves the referent; a metadata suffix cannot');
}

// ── F9: Filipino / Taglish equivalents
const fil = [
  ['Kailangan bang i-withhold ang buwis sa bayad sa kumpanya ng software?', 'ALLOW', 'Kailangan bang ayusin ang upuan sa bulwagan?', 'REFUSE'],
  ['May VAT ba ang paupahang istante sa tindahan?', 'ALLOW', 'May bago bang istante sa aklatan?', 'REFUSE'],
  ['Deductible ba ang bayad sa taga-disenyo ng logo para sa negosyo?', 'ALLOW', 'Maganda ba ang bagong logo ng koponan?', 'REFUSE'],
  ['Ano ang buwis sa upa ng bodega ng kumpanya?', 'ALLOW', 'Ano ang oras ng pagbubukas ng bodega?', 'REFUSE'],
];
for (const [a, ea, b, eb] of fil) P('filipino_taglish_v6', a, ea, b, eb, 'parallel structural contrast without translation');

// ── F10: private civil clause carrying a tax term
P('civil_clause_with_tax_term', 'Can a commercial lease allocate the value-added tax between the parties?', 'ALLOW', 'Can a commercial lease require the tenant to repaint annually?', 'REFUSE', 'a tax allocation question inside a contract vs an ordinary contractual obligation');
P('civil_clause_with_tax_term', 'Does a service agreement need a withholding tax clause?', 'ALLOW', 'Does a service agreement need a dress-code clause?', 'REFUSE', 'tax clause in an agreement vs ordinary clause');

// ── F11: rich-context ladder for one attribute, all seven shapes
const ladder = [
  ['prescriptive period for assessing a deficiency tax', 'ALLOW', 'bare tax term in its own domain'],
  ['How long may the Bureau assess a deficiency tax after filing?', 'ALLOW', 'richer tax sentence'],
  ['What prescriptive period applies? Group MM-77.', 'REFUSE', 'metadata-suffixed contentless question'],
  ['How long may the caterer hold the deposit after the event?', 'REFUSE', 'ordinary homograph of a period question'],
];
for (let i = 0; i + 1 < ladder.length; i += 2) {
  P('rich_context_ladder', ladder[i][0], ladder[i][1], ladder[i + 1][0], ladder[i + 1][1], ladder[i][2] + ' vs ' + ladder[i + 1][2]);
}
P('rich_context_ladder', ladder[1][0], 'ALLOW', ladder[3][0], 'REFUSE', 'richer tax sentence vs ordinary period question');
P('rich_context_ladder', ladder[0][0], 'ALLOW', ladder[2][0], 'REFUSE', 'bare tax term vs metadata-only question');

// ── F12: compliance procedure with an implicit but real tax target
const implicit = [
  ['Where does a new VAT taxpayer register its books of accounts?', 'Where does the reading club register its members?'],
  ['What supports a claim for input tax credit on importation?', 'What supports a claim on a lost umbrella at reception?'],
  ['Which form reports final withholding tax on interest?', 'Which form reports a broken office chair?'],
  ['What must accompany a request for a tax clearance certificate?', 'What must accompany a request for a parking slot?'],
];
for (const [tax, ordinary] of implicit) P('compliance_with_implicit_target', tax, 'ALLOW', ordinary, 'REFUSE', 'tax compliance procedure with a real tax target vs an ordinary administrative request');

// ── F13: tax-shaped modifier over an artefact vs tax question over a good
const artefact = [
  ['Is the sale of a printed VAT invoice book subject to VAT?', 'Choose a VAT-blue shade for the invoice template header.'],
  ['Is the purchase of accounting software deductible?', 'Draw a small tax-themed icon for the dashboard.'],
  ['Is the imported label printer subject to customs duty?', 'Pick a label colour for the archive boxes.'],
];
for (const [tax, artwork] of artefact) P('tax_question_vs_artefact_styling', tax, 'ALLOW', artwork, 'REFUSE', 'a tax predicate over a commercial good vs an ordinary creative action carrying a tax-shaped modifier');

// ── flatten
const queries = [];
const seen = new Set();
for (const p of pairs) for (const side of ['a', 'b']) {
  const q = p[side].query;
  if (seen.has(q)) continue;
  seen.add(q);
  queries.push({ family: p.family, query: q, expectedDecision: p[side].expected, contrast: p.contrast });
}

const r3 = JSON.parse(fs.readFileSync('evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', 'utf8')).rows;
const r3set = new Set(r3.map((r) => r.query.trim().toLowerCase()));
const leaked = queries.filter((q) => r3set.has(q.query.trim().toLowerCase()));
if (leaked.length) throw new Error('R3 QUERY LEAKAGE: ' + leaked.length + ' ' + JSON.stringify(leaked.slice(0, 3)));

L.writeJson(L.RES + 'COMMIT_5R1C10_DECISION_COUNTERFACTUAL_V6_SUITE.json', {
  unit: 'COMMIT 5R1-C10',
  authoredBeforeRuntimeChange: true,
  expectationSource: 'structural rules authored by the executor; no model-generated expectations',
  exactR3QueryLeakage: 0,
  families: [...new Set(pairs.map((p) => p.family))],
  pairCount: pairs.length, queryCount: queries.length,
  pairs, queries,
});
console.log('v6 pairs=' + pairs.length + ' queries=' + queries.length + ' families=' + new Set(pairs.map((p) => p.family)).size + ' leakage=' + leaked.length);
