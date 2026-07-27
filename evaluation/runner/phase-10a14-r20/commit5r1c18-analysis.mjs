// PHASE-10A14-R20 COMMIT 5R1-C18 — §7 residual inventory + rule-effect simulation,
// and §10 collision-exhaustion testing. Runs BEFORE any runtime modification.
import fs from 'node:fs';
import * as L from './commit5r1c18-lib.mjs';
import { buildBaseline, simulate, writeSafetySet } from './commit5r1c18-simulator.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const baseline = buildBaseline(rows, analyze);
const residual = baseline.filter((b) => !b.correct);

// ------------------------------------------------------------ residual inventory
const confusion = {};
for (const b of residual) {
  const k = `${b.expected} <- ${b.actual}`;
  confusion[k] = (confusion[k] || 0) + 1;
}
L.writeJson(L.RES + 'COMMIT_5R1C18_CURRENT_RESIDUAL_INVENTORY.json', {
  unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
  baselineCandidate: 'accepted C17 dev-05 (reconstructed)',
  totalRows: rows.length,
  correctRows: baseline.length - residual.length,
  residualRows: residual.length,
  confusion: Object.fromEntries(Object.entries(confusion).sort((a, b) => b[1] - a[1])),
  residual: residual.map((b) => ({
    oracleId: b.oracleId, expected: b.expected, actual: b.actual, decision: b.decision,
    speechAct: b.f.speechAct, controllingRelation: b.f.controllingRelation,
    targetSemanticRole: b.f.targetSemanticRole, modalOperator: b.f.modalOperator,
    polarity: b.f.polarity, namingAssignment: b.f.namingAssignment,
    localDefinitionOperator: b.f.localDefinitionOperator, documentLocalScope: b.f.documentLocalScope,
    unresolvedKind: b.f.unresolvedKind, topicFragment: b.f.topicFragment,
  })),
  analysisEvidenceOnlyNotice: 'Oracle IDs are analysis evidence only and must never become runtime features.',
});
const safetyCount = writeSafetySet(baseline);

// ------------------------------------------------------------ candidate rules
// Every rule states a human-readable linguistic principle (§8) and is expressed only
// over runtime-derivable evidence. None branches on a serialized feature vector, an
// oracle id, a template, or a complete query.
const CANDIDATES = [
  // --- §9B: a naming ASSIGNMENT versus an operation on an already-named artefact ---
  ['naming_assignment_assigns_identifier',
    'The primary act ASSIGNS or CHANGES an identifier (name it X, call it X, is only an internal label). An operation on an already named artefact is not a naming act.',
    (b) => b.f.namingAssignment && !b.f.imperativeHead && b.f.relations.includes('NAMES_AS_INTERNAL_LABEL'),
    'non_tax_label_or_name'],

  // --- §9C: a local equational reassignment versus a descriptive assertion --------
  ['local_equational_reassignment',
    'A local equational or definitional reassignment (X means Y here, X stands for Y in this document) is an expansion. A descriptive assertion, comparison, denial or question is not.',
    (b) => b.f.localDefinitionOperator && b.f.documentLocalScope && b.f.speechAct === 'assertion',
    'non_tax_expansion'],
  ['equational_without_local_scope_is_not_expansion',
    'An equational form WITHOUT document-local scope, or posed as a question, is not a local reassignment; with no tax relation it is explained by the absent relation.',
    (b) => b.f.localDefinitionOperator && !b.f.documentLocalScope && b.f.speechAct !== 'assertion'
      && b.actual === 'non_tax_expansion',
    'no_tax_relation'],

  // --- §9A: illocutionary act separates the two REFUSE families ------------------
  ['topic_fragment_requests_nothing',
    'A bare topic fragment names subject matter without requesting an operation; with no tax relation the absent relation explains the refusal.',
    (b) => b.f.topicFragment && !b.f.imperativeHead && b.f.controllingRelation === 'REQUESTS_NON_TAX_ACTION_ON'
      && b.f.targetSemanticRole !== 'procedure',
    'no_tax_relation'],
  ['deontic_modal_directs_an_operation',
    'A deontic modal over an ordinary action directs an operation even without an imperative head.',
    (b) => b.f.modalOperator === 'deontic' && b.f.controllingRelation === 'REQUESTS_NON_TAX_ACTION_ON'
      && b.f.targetSemanticRole === 'artefact',
    'explicit_non_tax_task'],

  // --- §9D: predicate attachment for the two ALLOW families ----------------------
  ['tax_concept_is_the_requested_subject',
    'When the requested subject is the tax concept/procedure itself and no external object is governed, the residual tax-task family controls.',
    (b) => b.f.targetSemanticRole === 'tax_concept' && b.actual === 'tax_treatment_of_ordinary_object',
    'explicit_tax_task_relation'],
  ['external_object_governed_by_tax_predicate',
    'When a transaction/receipt/service/asset is the governed target of the tax predicate, the ordinary-object treatment family controls.',
    (b) => ['transaction', 'receipt_income', 'service', 'asset'].includes(b.f.targetSemanticRole)
      && b.actual === 'explicit_tax_task_relation',
    'tax_treatment_of_ordinary_object'],

  // --- §9E: the requested outcome for compliance ---------------------------------
  ['procedural_outcome_is_compliance',
    'A requested procedural outcome (filing, registration, remittance, form selection, deadline, late-compliance penalty) is a compliance task.',
    (b) => b.f.targetSemanticRole === 'procedure' && b.f.relations.includes('ASKS_TAX_COMPLIANCE_FOR')
      && b.actual === 'explicit_tax_task_relation',
    'tax_compliance_task'],
];

const simulations = CANDIDATES.map(([n, principle, cond, assign]) => simulate(baseline, n, cond, assign, principle));
simulations.sort((a, b) => b.netMismatchDelta - a.netMismatchDelta);

L.writeJson(L.RES + 'COMMIT_5R1C18_RULE_EFFECT_SIMULATOR.json', {
  unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
  method: 'Each candidate rule is simulated against the accepted C17 runtime over all 3,720 R3 rows. Rows are classified TP_CORRECTED / FP_CORRECT_ROW_REGRESSION / FP_WRONG_TO_DIFFERENT_WRONG / UNCHANGED. A rule is forecast acceptable only when it regresses zero currently-correct rows, moves zero wrong rows to a different wrong reason, and has a positive net delta.',
  c17MethodologicalCorrection: 'Family-wide precision is not the acceptance statistic. A rule acts on the rows matched by its exact runtime condition; those are the rows measured here.',
  correctRowsAtBaseline: safetyCount,
  residualRowsAtBaseline: residual.length,
  simulations,
});

console.log('correct rows =', safetyCount, ' residual rows =', residual.length);
console.log('\nresidual confusion (top 10):');
for (const [k, n] of Object.entries(confusion).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${String(n).padStart(4)}  ${k}`);
console.log('\nrule-effect simulation (residual-conditioned):');
for (const s of simulations) {
  console.log(`  ${s.rule.padEnd(42)} sup=${String(s.conditionSupport).padStart(4)} TP=${String(s.TP_CORRECTED).padStart(3)} FPcorrect=${String(s.FP_CORRECT_ROW_REGRESSION).padStart(3)} FPw2w=${String(s.FP_WRONG_TO_DIFFERENT_WRONG).padStart(3)} net=${String(s.netMismatchDelta).padStart(4)} ${s.forecastAcceptable ? 'ACCEPTABLE' : 'reject'}`);
}
