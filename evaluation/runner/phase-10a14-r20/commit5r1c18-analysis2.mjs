// PHASE-10A14-R20 COMMIT 5R1-C18 — second simulation batch, refined against the
// residual groupings observed in the first pass. Still BEFORE any runtime change.
import * as L from './commit5r1c18-lib.mjs';
import { buildBaseline, simulate } from './commit5r1c18-simulator.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const baseline = buildBaseline(rows, analyze);

// A GENERIC PLACEHOLDER SUBJECT ("the transaction", "a taxpayer", "the company") names
// no particular thing: the sentence is about the tax concept, with the placeholder only
// carrying the predicate. A CONCRETE item ("the expense", "a cooling fan") is a real
// governed target. This is the §9D predicate-attachment distinction expressed as a
// property of the subject noun phrase, not a noun whitelist.
const GENERIC_PLACEHOLDER = /\bthe transaction\b|\ba transaction\b|\bthe taxpayer\b|\ba taxpayer\b|\bthe company\b|\ba philippine corporation\b|\bthe corporation\b/i;

const CANDIDATES = [
  ['generic_placeholder_subject_is_tax_task',
    'A generic placeholder subject (the transaction, a taxpayer, the corporation) names no particular thing; the sentence is about the tax concept itself, so the residual tax-task family controls.',
    (b) => GENERIC_PLACEHOLDER.test(b.f.primaryLo) && b.actual === 'tax_treatment_of_ordinary_object',
    'explicit_tax_task_relation'],

  ['procedural_outcome_is_compliance',
    'A requested procedural outcome (filing, registration, remittance, form selection, deadline, late-compliance penalty) is a compliance task.',
    (b) => b.f.targetSemanticRole === 'procedure' && b.f.relations.includes('ASKS_TAX_COMPLIANCE_FOR')
      && b.actual === 'explicit_tax_task_relation',
    'tax_compliance_task'],

  ['naming_assignment_assigns_identifier',
    'The primary act ASSIGNS or CHANGES an identifier. An operation on an already named artefact is not a naming act.',
    (b) => b.f.namingAssignment && !b.f.imperativeHead && b.f.relations.includes('NAMES_AS_INTERNAL_LABEL'),
    'non_tax_label_or_name'],

  // Narrowed topic-fragment rule: exclude the artefact role, which the first pass showed
  // carries the correct-row regressions.
  ['topic_fragment_no_artefact',
    'A bare topic fragment naming non-artefact subject matter requests no operation; with no tax relation the absent relation explains the refusal.',
    (b) => b.f.topicFragment && !b.f.imperativeHead && b.f.controllingRelation === 'REQUESTS_NON_TAX_ACTION_ON'
      && !['procedure', 'artefact'].includes(b.f.targetSemanticRole),
    'no_tax_relation'],

  // The reverse direction: an assertion fragment that R3 explains as a requested action.
  ['assertion_fragment_over_artefact_is_action',
    'A fragment naming a concrete artefact is a request to act on that artefact.',
    (b) => b.f.topicFragment && b.f.speechAct === 'assertion' && b.f.targetSemanticRole === 'artefact'
      && b.f.controllingRelation === 'REQUESTS_NON_TAX_ACTION_ON',
    'explicit_non_tax_task'],

  // Expansion vs absent relation (22 rows).
  ['expansion_requires_local_reassignment',
    'A local equational reassignment is an expansion; a descriptive assertion, comparison, denial or question is not.',
    (b) => b.actual === 'non_tax_expansion' && !(b.f.localDefinitionOperator && b.f.documentLocalScope),
    'no_tax_relation'],

  // Definition family (14 rows across two confusions).
  ['definition_operator_with_tax_context',
    'A definitional operator asked inside controlling tax context is a tax definition.',
    (b) => b.f.localDefinitionOperator && b.f.speechAct === 'question'
      && ['explicit_tax_task_relation', 'tax_compliance_task'].includes(b.actual),
    'tax_definition_with_context'],
];

const sims = CANDIDATES.map(([n, p, c, a]) => simulate(baseline, n, c, a, p));
sims.sort((a, b) => b.netMismatchDelta - a.netMismatchDelta);

L.writeJson(L.RES + 'COMMIT_5R1C18_RULE_EFFECT_SIMULATOR_BATCH2.json', {
  unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
  note: 'Second simulation batch, refined against observed residual groupings. Same four effect classes and the same acceptance forecast.',
  simulations: sims,
});

console.log('rule-effect simulation (batch 2):');
for (const s of sims) {
  console.log(`  ${s.rule.padEnd(42)} sup=${String(s.conditionSupport).padStart(4)} TP=${String(s.TP_CORRECTED).padStart(3)} FPcorrect=${String(s.FP_CORRECT_ROW_REGRESSION).padStart(3)} FPw2w=${String(s.FP_WRONG_TO_DIFFERENT_WRONG).padStart(3)} net=${String(s.netMismatchDelta).padStart(4)} ${s.forecastAcceptable ? 'ACCEPTABLE' : 'reject'}`);
  if (s.FP_CORRECT_ROW_REGRESSION > 0) {
    for (const r of s.correctRowRegressions.slice(0, 2)) console.log(`        regress: ${JSON.stringify(r.query).slice(0, 70)} ${r.from} -> ${r.to}`);
  }
}
