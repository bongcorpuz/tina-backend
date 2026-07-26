// PHASE-10A14-R20 COMMIT 5R1-C13 — clean relation-lock verification.
// Separate governed campaign. No runtime or test change is made here; runtime identity
// is captured before and after and must be unchanged.
import fs from 'node:fs';
import * as L from './commit5r1c13-lib.mjs';

const idBefore = L.runtimeIdentity();
const { attemptId, dir } = await L.allocateAttempt({
  category: 'focused_suite', gate: 'r20_commit5r1c13_relation_lock_verification',
  cycle: 'commit5r1c13-lock', command: 'evaluation/runner/phase-10a14-r20/commit5r1c13-verify.mjs',
});

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();

const r3 = L.scoreR3(rows, analyze);
const relCf = L.runRelationCounterfactuals(analyze);
const decCf = L.runCounterfactuals(analyze);
const ctl = L.closedControls(rows, analyze);
const guard = L.richContextGuard(analyze);
const reasonInt = L.reasonIntegrity(rows, analyze);
const relObj = L.relationObjectIntegrity(analyze, rows.slice(0, 400).map((r) => r.query));
const am = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);

// Focused relation regression: every relation type required anywhere in R3 must be
// fully satisfied, bucket by bucket.
const perType = {};
for (const r of rows) {
  const e = (r.expectedRelations || []).map((x) => x.relation);
  if (!e.length) continue;
  const a = (analyze(r.query).relations || []).map((x) => x.relation);
  for (const t of e) {
    perType[t] ??= { required: 0, satisfied: 0 };
    perType[t].required++;
    if (a.includes(t)) perType[t].satisfied++;
  }
}
const focusedRelationRegression = {
  perType,
  allBucketsPass: Object.values(perType).every((v) => v.required === v.satisfied),
};

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
  relation_counterfactual_all_pass: relCf.failed === 0,
  closed_controls_all_pass: ctl.allClosed,
  rich_context_guard_7_7: guard.allPass,
  focused_relation_regression_pass: focusedRelationRegression.allBucketsPass,
  anti_memorization_pass: am.pass,
  reason_integrity_pass: reasonInt.pass,
  determinism_pass: det.pass,
  runtime_identity_unchanged: identityUnchanged,
};
const met = Object.entries(lockConditions).filter(([, v]) => v).map(([k]) => k);
const unmet = Object.entries(lockConditions).filter(([, v]) => !v).map(([k]) => k);
const lockAchieved = unmet.length === 0;

const result = {
  unit: 'COMMIT 5R1-C13', attemptId, generatedUtc: new Date().toISOString(),
  runtimeIdentityBefore: idBefore, runtimeIdentityAfter: idAfter, identityUnchanged,
  r3: r3.counts,
  relationCounterfactual: {
    controllingTotal: relCf.total, passed: relCf.passed, failed: relCf.failed,
    authoredQueries: relCf.authoredQueries, nonControllingProbes: relCf.nonControllingProbes,
    byFamily: relCf.byFamily, failures: relCf.failures,
  },
  decisionCounterfactual: { total: decCf.total, passed: decCf.passed, bySuite: decCf.bySuite },
  closedControls: ctl, richContextGuard: guard,
  focusedRelationRegression, reasonIntegrity: reasonInt,
  relationObjectIntegrity: relObj, antiMemorization: am, determinism: det,
  reasonMismatchesDiagnostic: r3.counts.reasonMismatches,
  lockConditions, lockConditionsMet: met.length, lockConditionsTotal: Object.keys(lockConditions).length,
  unmetConditions: unmet, lockAchieved,
};
L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_LOCK_VERIFICATION_RESULT.json', result);

const lines = [
  `R3 decision                 = ${r3.counts.decisionPassed} / 3720`,
  `R3 relation                 = ${r3.counts.relationPassed} / 3720  (mismatches ${r3.counts.relationMismatches})`,
  `FA/FR/clarify               = ${r3.counts.materialFalseAllows}/${r3.counts.materialFalseRefusals}/${r3.counts.clarifyMismatches}`,
  `decision counterfactual     = ${decCf.passed} / ${decCf.total}`,
  `relation counterfactual     = ${relCf.passed} / ${relCf.total}  (failed ${relCf.failed})`,
  `closed controls             = ${ctl.allClosed}`,
  `rich-context guard          = ${guard.passed} / ${guard.total}`,
  `focused relation regression = ${focusedRelationRegression.allBucketsPass}`,
  `anti-memorization           = ${am.pass}`,
  `reason integrity            = ${reasonInt.pass}`,
  `determinism                 = ${det.pass} (${det.evaluations} evals, decision drift ${det.decisionDrift}, relation drift ${det.relationDrift})`,
  `runtime identity unchanged  = ${identityUnchanged}`,
  `lock conditions met         = ${met.length} / ${Object.keys(lockConditions).length}`,
  `unmet                       = ${unmet.join(', ') || '(none)'}`,
  `RELATION LOCK ACHIEVED      = ${lockAchieved}`,
];
console.log(lines.join('\n'));

await L.finalizeAttempt(dir, {
  disposition: lockAchieved ? 'relation_lock_verified' : 'relation_lock_conditions_unmet',
  stdout: lines.join('\n'),
  resultPaths: [L.RES + 'COMMIT_5R1C13_RELATION_LOCK_VERIFICATION_RESULT.json'],
});
