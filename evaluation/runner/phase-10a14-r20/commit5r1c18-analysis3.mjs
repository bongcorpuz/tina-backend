// PHASE-10A14-R20 COMMIT 5R1-C18 — third simulation batch. Each candidate is tightened
// against the exact regressions the previous batch exposed. Still BEFORE any runtime change.
import * as L from './commit5r1c18-lib.mjs';
import { buildBaseline, simulate } from './commit5r1c18-simulator.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const baseline = buildBaseline(rows, analyze);

// A generic placeholder must be the WHOLE subject: "the transaction", not "the company
// vehicle". Requiring the head noun to be immediately followed by the predicate keeps
// modified noun phrases (which name a real object) out of the rule.
const BARE_PLACEHOLDER = /\b(?:the|a)\s+(?:transaction|taxpayer|corporation)\s+(?:is|are|was|were|be|subject|need|must|should|can|could|may|will|shall|has|have|had)\b/i;

const CANDIDATES = [
  ['procedural_outcome_is_compliance',
    'A requested procedural outcome (filing, registration, remittance, form selection, deadline, late-compliance penalty) is a compliance task.',
    (b) => b.f.targetSemanticRole === 'procedure' && b.f.relations.includes('ASKS_TAX_COMPLIANCE_FOR')
      && b.actual === 'explicit_tax_task_relation',
    'tax_compliance_task'],

  ['naming_assignment_assigns_identifier',
    'The primary act ASSIGNS or CHANGES an identifier. An operation on an already named artefact is not a naming act.',
    (b) => b.f.namingAssignment && !b.f.imperativeHead && b.f.relations.includes('NAMES_AS_INTERNAL_LABEL'),
    'non_tax_label_or_name'],

  ['bare_placeholder_subject_is_tax_task',
    'A BARE generic placeholder subject — the head noun immediately carrying the predicate, with no modifier naming a real thing — leaves the tax concept as the requested subject.',
    (b) => BARE_PLACEHOLDER.test(b.f.primaryLo) && b.actual === 'tax_treatment_of_ordinary_object',
    'explicit_tax_task_relation'],

  // Expansion: keep the copular "X is a Y" form (which R3 does treat as expansion) and
  // exclude only the interrogative and denial forms.
  ['expansion_excludes_question_and_denial',
    'A local reassignment is asserted. An interrogative or a denial is not a reassignment, so with no tax relation the absent relation explains it.',
    (b) => b.actual === 'non_tax_expansion' && (b.f.speechAct === 'question' || b.f.polarity === 'negative'),
    'no_tax_relation'],

  // Topic fragments: restrict to those with NO tax-shaped token at all, which is where
  // the previous batch's regressions ("gym loyalty membership perk") did not sit.
  ['topic_fragment_without_any_tax_token',
    'A bare topic fragment carrying no tax-shaped token requests no operation and establishes no tax relation.',
    (b) => b.f.topicFragment && !b.f.imperativeHead
      && b.f.controllingRelation === 'REQUESTS_NON_TAX_ACTION_ON'
      && !/\b(?:tax|taxes|taxable|vat|withhold\w*|excise|customs|duty|dutiable|deductib\w*|revenue|bir|invoice|receipt|estate|donor|levy|surcharge|fee|fees|perk|membership)\b/i.test(b.f.primaryLo),
    'no_tax_relation'],
];

const sims = CANDIDATES.map(([n, p, c, a]) => simulate(baseline, n, c, a, p));
sims.sort((a, b) => b.netMismatchDelta - a.netMismatchDelta);

L.writeJson(L.RES + 'COMMIT_5R1C18_RULE_EFFECT_SIMULATOR_BATCH3.json', {
  unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
  note: 'Third simulation batch. Each candidate tightened against the exact correct-row regressions exposed by batch 2.',
  simulations: sims,
});

console.log('rule-effect simulation (batch 3):');
for (const s of sims) {
  console.log(`  ${s.rule.padEnd(42)} sup=${String(s.conditionSupport).padStart(4)} TP=${String(s.TP_CORRECTED).padStart(3)} FPcorrect=${String(s.FP_CORRECT_ROW_REGRESSION).padStart(3)} FPw2w=${String(s.FP_WRONG_TO_DIFFERENT_WRONG).padStart(3)} net=${String(s.netMismatchDelta).padStart(4)} ${s.forecastAcceptable ? 'ACCEPTABLE' : 'reject'}`);
  if (s.FP_CORRECT_ROW_REGRESSION > 0) {
    for (const r of s.correctRowRegressions.slice(0, 2)) console.log(`        regress: ${JSON.stringify(r.query).slice(0, 68)} ${r.from} -> ${r.to}`);
  }
}
const acceptable = sims.filter((s) => s.forecastAcceptable);
console.log('\nforecast-acceptable rules:', acceptable.length, ' combined net delta:', acceptable.reduce((n, s) => n + s.netMismatchDelta, 0));
