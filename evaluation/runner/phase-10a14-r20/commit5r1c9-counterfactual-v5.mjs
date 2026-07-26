// PHASE-10A14-R20 COMMIT 5R1-C9 — decision counterfactual v5 extension.
// Expectations authored from structural rules BEFORE any runtime change.
// No exact R3 query is copied; no model-generated expectations.
import fs from 'node:fs';
import * as L from './commit5r1c9-lib.mjs';

const pairs = [];
const P = (family, a, ea, b, eb, contrast) => pairs.push({ family, contrast, a: { query: a, expected: ea }, b: { query: b, expected: eb } });

// ── F1: tax return vs merchandise / library return
P('tax_return_vs_goods_return', 'When must the annual income tax return be filed by a corporation?', 'ALLOW', 'Can a shopper reject a return of damaged crockery?', 'REFUSE', 'tax return filing vs merchandise return');
P('tax_return_vs_goods_return', 'What return covers quarterly percentage tax?', 'ALLOW', 'When is a borrowed atlas due back at the reading room?', 'REFUSE', 'tax return vs library loan return');
P('tax_return_vs_goods_return', 'Is an amended income tax return allowed after assessment?', 'ALLOW', 'May a buyer return a mismatched sofa to the showroom?', 'REFUSE', 'amended tax return vs consumer goods return');
P('tax_return_vs_goods_return', 'What return date applies to the annual information return?', 'ALLOW', 'What return date is printed on a court summons?', 'REFUSE', 'tax return date vs judicial return date');

// ── F2: tax filing vs computer file
P('tax_filing_vs_computer_file', 'How do I file the quarterly VAT declaration?', 'ALLOW', 'How do I open a spreadsheet file in the reporting tool?', 'REFUSE', 'tax filing vs opening a computer file');
P('tax_filing_vs_computer_file', 'What is the filing deadline for the annual income tax return?', 'ALLOW', 'What is the naming convention for an archived project file?', 'REFUSE', 'tax filing deadline vs file naming');
P('tax_filing_vs_computer_file', 'Which BIR form is filed for creditable withholding tax?', 'ALLOW', 'Which folder holds the exported ledger file?', 'REFUSE', 'tax form filing vs file storage');

// ── F3: tax claim vs ordinary insurance / civil claim
P('tax_claim_vs_ordinary_claim', 'What is the prescriptive period for a tax refund claim?', 'ALLOW', 'What is the prescriptive period for a motor insurance claim?', 'REFUSE', 'tax refund claim vs insurance claim');
P('tax_claim_vs_ordinary_claim', 'Can input tax be claimed on imported raw materials?', 'ALLOW', 'Can a passenger claim compensation for a delayed ferry?', 'REFUSE', 'input tax claim vs consumer compensation claim');
P('tax_claim_vs_ordinary_claim', 'How is a claim for excess creditable withholding tax carried over?', 'ALLOW', 'How is a warranty claim escalated to the manufacturer?', 'REFUSE', 'tax credit claim vs warranty claim');

// ── F4: BIR registration vs ordinary event registration
P('bir_registration_vs_event_registration', 'How do I complete BIR registration for a new branch?', 'ALLOW', 'How do I complete registration for the weekend fun run?', 'REFUSE', 'tax registration vs event registration');
P('bir_registration_vs_event_registration', 'Is registration with the revenue district office required for a sole proprietor?', 'ALLOW', 'Is registration required for the neighbourhood chess ladder?', 'REFUSE', 'tax registration vs club registration');
P('bir_registration_vs_event_registration', 'What is the annual registration fee for a taxpayer?', 'ALLOW', 'What is the annual registration fee for a gym membership?', 'REFUSE', 'taxpayer registration fee vs membership fee');

// ── F5: tax alphalist vs ordinary alphabetical list
P('alphalist_vs_alphabetical_list', 'Which alphalist supports the annual withholding tax return?', 'ALLOW', 'Arrange the choir roster in alphabetical order.', 'REFUSE', 'tax alphalist vs alphabetising a roster');
P('alphalist_vs_alphabetical_list', 'Must the alphalist of payees accompany the withholding return?', 'ALLOW', 'Please sort the seminar attendees alphabetically by surname.', 'REFUSE', 'tax alphalist vs alphabetical sorting');

// ── F6: taxable output vs function / console output
P('taxable_output_vs_console_output', 'Is output tax due on a consignment sale of goods?', 'ALLOW', 'Send the console output of the build to the log panel.', 'REFUSE', 'output tax vs program console output');
P('taxable_output_vs_console_output', 'How is output tax offset against input tax by a trader?', 'ALLOW', 'Return the computed output from the helper routine.', 'REFUSE', 'output tax offset vs function return value');
P('taxable_output_vs_console_output', 'Is the sale of a licensed typeface subject to value-added tax?', 'ALLOW', 'Is this heading typeface defined in the stylesheet?', 'REFUSE', 'VAT on a typeface sale vs a stylesheet typeface');

// ── F7: legal title vs internal label assignment
P('legal_title_vs_internal_label', 'Does the Tariff and Customs Modernization Act govern this importation?', 'ALLOW', 'Store the shipping manifest under the label CUSTOMS.', 'REFUSE', 'named statute in a tax question vs assigning a storage label');
P('legal_title_vs_internal_label', 'What does the National Internal Revenue Code say about deficiency interest?', 'ALLOW', 'Title the archive folder NIRC for convenience.', 'REFUSE', 'named code in a tax question vs folder titling');
P('legal_title_vs_internal_label', 'Does the Ease of Paying Taxes Act change the filing venue?', 'ALLOW', 'Tag the onboarding deck as EOPT for the team drive.', 'REFUSE', 'named statute vs deck tagging');

// ── F8: primary tax task vs subordinate product-code clause
P('primary_tax_vs_subordinate_code', 'Is the sale of the pump subject to VAT if the pump carries an internal product code?', 'ALLOW', 'Assign an internal product code to the pump record.', 'REFUSE', 'a subordinate code clause must not veto a genuine tax question');
P('primary_tax_vs_subordinate_code', 'Is the equipment transfer taxable even though it is filed under a project code?', 'ALLOW', 'File the equipment record under a project code.', 'REFUSE', 'subordinate code clause vs primary coding action');
P('primary_tax_vs_subordinate_code', 'Is the imported panel dutiable when the panel bears a warehouse code?', 'ALLOW', 'Give the imported panel a warehouse code.', 'REFUSE', 'subordinate code clause vs primary code assignment');

// ── F9: unambiguous tax acronym vs polysemous bare acronym
const canonical = ['MCIT', 'RCIT', 'NOLCO', 'CWT', 'IAET'];
for (const t of canonical) {
  pairs.push({ family: 'unambiguous_vs_polysemous_acronym', contrast: 'tax-canonical acronym with no material competing ordinary sense, used as the requested tax concept', a: { query: `Describe how ${t} works for a domestic company.`, expected: 'ALLOW' }, b: { query: `Set ${t} as the caption of the lobby noticeboard.`, expected: 'REFUSE' } });
}
const polysemous = ['PAN', 'CAR', 'FAN', 'AR', 'PT'];
for (const t of polysemous) {
  pairs.push({ family: 'unambiguous_vs_polysemous_acronym', contrast: 'materially polysemous acronym: bare form clarifies, explicit tax context allows', a: { query: `${t}?`, expected: 'CLARIFY' }, b: { query: `Explain ${t} in a BIR deficiency assessment.`, expected: 'ALLOW' } });
}

// ── F10: concise tax noun phrase vs ordinary noun phrase
const conciseTax = ['taxable compensation of a rank-and-file employee', 'capital gains tax computation on land', 'import duty treatment under customs law', 'refund claim prescription period', 'revenue district office registration', 'deficiency interest computation'];
const conciseOrdinary = ['weekend hiking club roster', 'office pantry restocking plan', 'annual sportsfest programme', 'reading room shelving plan', 'staff carpool schedule', 'lobby signage refresh'];
for (let i = 0; i < conciseTax.length; i++) {
  P('concise_tax_phrase_vs_ordinary_phrase', conciseTax[i], 'ALLOW', conciseOrdinary[i], 'REFUSE', 'a coherent tax-domain phrase is a governed request; an ordinary phrase is not');
}

// ── F11: metadata suffix vs same-query antecedent
const preds = ['taxable', 'deductible', 'subject to value-added tax', 'subject to withholding tax'];
for (let i = 0; i < preds.length; i++) {
  P('metadata_suffix_vs_antecedent', `Our branch acquired a standby generator last month. Is it ${preds[i]}?`, 'ALLOW', `Is it ${preds[i]}? Reference ${41 + i}.`, 'REFUSE', 'same-query concrete antecedent resolves the deictic; a metadata suffix cannot');
}
P('metadata_suffix_vs_antecedent', 'We paid a freight forwarder for the shipment. Is that subject to withholding tax?', 'ALLOW', 'Is that subject to withholding tax? Matter 3.', 'REFUSE', 'resolved antecedent vs contentless metadata suffix');

// ── F12: Filipino / Taglish equivalents
const fil = [
  ['Kailangan bang i-withhold ang buwis sa bayad sa taga-disenyo ng website?', 'ALLOW', 'Pakiayos naman ang upuan para sa pulong bukas.', 'REFUSE'],
  ['May VAT ba ang serbisyo ng taga-linis na kontraktor?', 'ALLOW', 'Ano ang pangalan ng bagong grupo sa chat?', 'REFUSE'],
  ['Deductible ba ang binili naming lamesa para sa opisina?', 'ALLOW', 'Deductible ba ang bayad sa paaralan ng anak ko sa club?', 'REFUSE'],
  ['Ano ang tamang BIR form para sa upa ng bodega?', 'ALLOW', 'Ano ang tamang form para sa aplikasyon sa gym?', 'REFUSE'],
  ['Taxable ba ang bonus na natanggap ng empleyado?', 'ALLOW', 'Masarap ba ang bagong tindahan ng kape?', 'REFUSE'],
];
for (const [a, ea, b, eb] of fil) P('filipino_taglish_v5', a, ea, b, eb, 'parallel structural contrast without translation');

// ── F13: tax procedure vs ordinary due-date / deadline homograph
P('due_date_homograph', 'What is the due date for remitting expanded withholding tax?', 'ALLOW', 'What is the due date for returning the rented projector?', 'REFUSE', 'tax remittance due date vs rental return date');
P('due_date_homograph', 'What happens if a tax payment due date falls on a holiday?', 'ALLOW', 'What happens if a book club meeting falls on a holiday?', 'REFUSE', 'tax due-date rule vs social scheduling');
P('due_date_homograph', 'What is the deadline to protest a deficiency assessment?', 'ALLOW', 'What is the deadline to submit a school science project?', 'REFUSE', 'tax protest deadline vs academic deadline');
P('due_date_homograph', 'What is the deadline to file a claim for refund of erroneously paid tax?', 'ALLOW', 'What is the deadline to appeal a sports league suspension?', 'REFUSE', 'tax refund deadline vs league appeal deadline');

// ── F14: corporate/regulatory report vs tax report
P('regulatory_report_vs_tax_report', 'What report supports the annual income tax return of a corporation?', 'ALLOW', 'What report must a corporation submit after changing directors?', 'REFUSE', 'tax return support vs corporate-registry reporting');
P('regulatory_report_vs_tax_report', 'Which schedule accompanies the corporate income tax return?', 'ALLOW', 'Which minutes accompany a board resignation notice?', 'REFUSE', 'tax schedule vs corporate minutes');

// ── F15: explicit BIR/tax context resolves an otherwise polysemous acronym
const ctxVerbs = ['Explain', 'Describe', 'Interpret', 'Clarify'];
for (const v of ctxVerbs) {
  P('explicit_tax_context_resolves_acronym', `${v} how FLD is served in a BIR deficiency case.`, 'ALLOW', `${v} FLD in the stage lighting plan.`, 'REFUSE', 'explicit BIR context resolves the token; an explicit non-tax setting does not');
}
for (const v of ctxVerbs) {
  P('explicit_tax_context_resolves_acronym', `${v} DST for Philippine tax purposes.`, 'ALLOW', `${v} DST for the daylight schedule.`, 'REFUSE', 'explicit tax framing vs explicit non-tax framing of the same token');
}

// ── F16: taxability question over a concrete target vs over a styling object
const styling = [
  ['Is the sale of a delivery drone subject to value-added tax?', 'Is this heading colour defined in the theme file?'],
  ['Is the purchase of a retail shelf deductible for income tax?', 'Is this shelf component styled by the layout sheet?'],
  ['Is the licence for design software subject to withholding tax?', 'Is this font weight applied by the stylesheet class?'],
];
for (const [tax, style] of styling) P('concrete_target_vs_styling_object', tax, 'ALLOW', style, 'REFUSE', 'a tax predicate over a concrete commercial target vs a styling attribute');

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

L.writeJson(L.RES + 'COMMIT_5R1C9_DECISION_COUNTERFACTUAL_V5_SUITE.json', {
  unit: 'COMMIT 5R1-C9',
  authoredBeforeRuntimeChange: true,
  expectationSource: 'structural rules authored by the executor; no model-generated expectations',
  exactR3QueryLeakage: 0,
  families: [...new Set(pairs.map((p) => p.family))],
  pairCount: pairs.length, queryCount: queries.length,
  pairs, queries,
});
console.log('v5 pairs=' + pairs.length + ' queries=' + queries.length + ' families=' + new Set(pairs.map((p) => p.family)).size + ' leakage=' + leaked.length);
