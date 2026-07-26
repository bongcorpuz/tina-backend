// PHASE-10A14-R20 COMMIT 5R1-C14 — clean relation-lock verification.
// Separate governed campaign. No runtime or test change; identity captured before and
// after and must be unchanged.
import fs from 'node:fs';
import * as L from './commit5r1c14-lib.mjs';
import { openEight } from './commit5r1c14-gates.mjs';

const idBefore = L.runtimeIdentity();
const { attemptId, dir } = await L.allocateAttempt({
  category: 'focused_suite', gate: 'r20_commit5r1c14_relation_lock_verification',
  cycle: 'commit5r1c14-lock', command: 'evaluation/runner/phase-10a14-r20/commit5r1c14-verify.mjs',
});

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();

const r3 = L.scoreR3(rows, analyze);
const relCf = L.runRelationCounterfactuals(analyze);
const decCf = L.runCounterfactuals(analyze);
const probes = L.runClauseProbes(analyze);
const ctl = L.closedControls(rows, analyze);
const guard = L.richContextGuard(analyze);
const reasonInt = L.reasonIntegrity(rows, analyze);
const relObj = L.relationObjectIntegrity(analyze, rows.slice(0, 400).map((r) => r.query));
const clauseSchema = L.clauseSchemaRegression(analyze, rows.slice(0, 400).map((r) => r.query));
const am = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);

const eight = openEight().map((q) => {
  const ev = analyze(q.query);
  const rels = (ev.relations || []).map((x) => x.relation);
  return { query: q.query, decision: ev.decision, relations: rels, pass: ev.decision === q.expectedDecision && (q.expectedRelations || []).every((r) => rels.includes(r)) };
});

const perType = {};
for (const r of rows) {
  const e = (r.expectedRelations || []).map((x) => x.relation);
  if (!e.length) continue;
  const a = (analyze(r.query).relations || []).map((x) => x.relation);
  for (const t of e) { perType[t] ??= { required: 0, satisfied: 0 }; perType[t].required++; if (a.includes(t)) perType[t].satisfied++; }
}
const focusedRelationRegression = { perType, allBucketsPass: Object.values(perType).every((v) => v.required === v.satisfied) };

const det = L.determinism(rows.slice(0, 150).map((r) => r.query), 100, analyze);
const idAfter = L.runtimeIdentity();
const identityUnchanged = idBefore.servicesTreeDigest === idAfter.servicesTreeDigest;

const lockConditions = {
  r3_decision_3720: r3.counts.decisionPassed === 3720,
  r3_relation_3720: r3.counts.relationPassed === 3720,
  false_allows_zero: r3.counts.materialFalseAllows === 0,
  false_refusals_zero: r3.counts.materialFalseRefusals === 0,
  clarify_zero: r3.counts.clarifyMismatches === 0,
  decision_counterfactual_756: decCf.passed === decCf.total && decCf.total === 756,
  relation_counterfactual_282: relCf.failed === 0 && relCf.total === 282,
  clause_probes_all_pass: probes.failed === 0,
  closed_controls_all_pass: ctl.allClosed,
  rich_context_guard_7_7: guard.allPass,
  focused_relation_regression_pass: focusedRelationRegression.allBucketsPass,
  clause_schema_regression_pass: clauseSchema.pass,
  anti_memorization_pass: am.pass,
  reason_integrity_pass: reasonInt.pass,
  determinism_pass: det.pass,
  runtime_identity_unchanged: identityUnchanged,
};
const unmet = Object.entries(lockConditions).filter(([, v]) => !v).map(([k]) => k);
const lockAchieved = unmet.length === 0;

const result = {
  unit: 'COMMIT 5R1-C14', attemptId, generatedUtc: new Date().toISOString(),
  runtimeIdentityBefore: idBefore, runtimeIdentityAfter: idAfter, identityUnchanged,
  r3: r3.counts, openEight: eight,
  relationCounterfactual: { controllingTotal: relCf.total, passed: relCf.passed, failed: relCf.failed, authoredQueries: relCf.authoredQueries, nonControllingProbes: relCf.nonControllingProbes, byFamily: relCf.byFamily },
  decisionCounterfactual: { total: decCf.total, passed: decCf.passed, bySuite: decCf.bySuite },
  clauseProbes: { total: probes.total, passed: probes.passed, failed: probes.failed, pairs: probes.pairs },
  closedControls: ctl, richContextGuard: guard,
  focusedRelationRegression, clauseSchemaRegression: clauseSchema,
  reasonIntegrity: reasonInt, relationObjectIntegrity: relObj, antiMemorization: am, determinism: det,
  reasonMismatchesDiagnostic: r3.counts.reasonMismatches,
  lockConditions, lockConditionsMet: Object.values(lockConditions).filter(Boolean).length,
  lockConditionsTotal: Object.keys(lockConditions).length, unmetConditions: unmet, lockAchieved,
};
L.writeJson(L.RES + 'COMMIT_5R1C14_RELATION_LOCK_VERIFICATION_RESULT.json', result);

const lines = [
  `R3 decision                 = ${r3.counts.decisionPassed} / 3720`,
  `R3 relation                 = ${r3.counts.relationPassed} / 3720  (mismatches ${r3.counts.relationMismatches})`,
  `FA/FR/clarify               = ${r3.counts.materialFalseAllows}/${r3.counts.materialFalseRefusals}/${r3.counts.clarifyMismatches}`,
  `decision counterfactual     = ${decCf.passed} / ${decCf.total}`,
  `relation counterfactual     = ${relCf.passed} / ${relCf.total}`,
  `open eight                  = ${eight.filter((e) => e.pass).length} / ${eight.length}`,
  `clause probes               = ${probes.passed} / ${probes.total}`,
  `closed controls             = ${ctl.allClosed}`,
  `rich-context guard          = ${guard.passed} / ${guard.total}`,
  `focused relation regression = ${focusedRelationRegression.allBucketsPass}`,
  `clause-schema regression    = ${clauseSchema.pass}`,
  `anti-memorization           = ${am.pass}`,
  `reason integrity            = ${reasonInt.pass}`,
  `determinism                 = ${det.pass} (${det.evaluations} evals, decision drift ${det.decisionDrift}, relation drift ${det.relationDrift})`,
  `runtime identity unchanged  = ${identityUnchanged}`,
  `lock conditions met         = ${result.lockConditionsMet} / ${result.lockConditionsTotal}`,
  `unmet                       = ${unmet.join(', ') || '(none)'}`,
  `RELATION LOCK ACHIEVED      = ${lockAchieved}`,
];
console.log(lines.join('\n'));

await L.finalizeAttempt(dir, {
  disposition: lockAchieved ? 'relation_lock_verified' : 'relation_lock_conditions_unmet',
  stdout: lines.join('\n'),
  resultPaths: [L.RES + 'COMMIT_5R1C14_RELATION_LOCK_VERIFICATION_RESULT.json'],
});
