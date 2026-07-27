// PHASE-10A14-R20 COMMIT 5R1-C21 - governed material iteration recorder.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const iteration = process.argv[2] || '02';
const hypothesis = process.argv[3] || 'C21 composition-safe override batch';
const baseReasonMismatches = Number(process.argv[4] || 271);
const baseReasonSuite = Number(process.argv[5] || 320);
const baseCollision = Number(process.argv[6] || 148);

const { attemptId, dir } = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: `r20_commit5r1c21_reason_iteration_${iteration}`,
  cycle: `commit5r1c21-dev-${iteration}`,
  command: `evaluation/runner/phase-10a14-r20/commit5r1c21-patch-${iteration}.cjs`,
});

await import('./commit5r1c21-verify-overrides.mjs?v=' + Date.now());
const g = await runGates({ label: `c21-iteration-${iteration}` });
const text = summarize(g);
console.log(text);

const improved = g.r3.reasonMismatches < baseReasonMismatches;
const suiteOk = g.reasonCounterfactual.passed >= baseReasonSuite;
const collisionOk = g.collisionProbes.passed >= baseCollision;
const target = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C21_TARGET_EQUIVALENCE.json', 'utf8'));
const placement = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C21_PLACEMENT_NON_INTERFERENCE.json', 'utf8'));
const composition = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C21_COMPOSITION_NON_INTERFERENCE.json', 'utf8'));
const accept = g.decisionLockHeld && g.relationLockHeld && g.reasonIntegrity.pass && suiteOk &&
  collisionOk && improved && target.pass && placement.pass && composition.pass;

const residual = {};
const analyze = await L.loadAnalyzer();
for (const r of L.loadR3()) {
  const got = analyze(r.query).reasonCode;
  if (got === r.expectedReasonCodeFamily) continue;
  residual[r.expectedReasonCodeFamily + ' <- ' + got] = (residual[r.expectedReasonCodeFamily + ' <- ' + got] || 0) + 1;
}

const record = {
  attemptId,
  iteration,
  hypothesis,
  baseline: { reasonMismatches: baseReasonMismatches, reasonSuitePassed: baseReasonSuite, collisionProbesPassed: baseCollision },
  runtimeIdentity: g.runtimeIdentity,
  targetEquivalence: target,
  placementNonInterference: placement,
  compositionNonInterference: composition,
  r3: g.r3,
  reasonPassed: g.reasonPassed,
  reasonConfusionResidual: residual,
  collisionProbes: { total: g.collisionProbes.total, passed: g.collisionProbes.passed, failed: g.collisionProbes.failed, byFamily: g.collisionProbes.byFamily },
  reasonCounterfactual: { total: g.reasonCounterfactual.total, passed: g.reasonCounterfactual.passed, failed: g.reasonCounterfactual.failed, byFamily: g.reasonCounterfactual.byFamily },
  decisionCounterfactual: { total: g.decisionCounterfactual.total, passed: g.decisionCounterfactual.passed, failed: g.decisionCounterfactual.failed },
  relationCounterfactual: { total: g.relationCounterfactual.total, passed: g.relationCounterfactual.passed, failed: g.relationCounterfactual.failed },
  clauseProbes: { total: g.clauseProbes.total, passed: g.clauseProbes.passed, failed: g.clauseProbes.failed },
  closedControls: g.closedControls,
  richContextGuard: g.richContextGuard,
  reasonIntegrity: g.reasonIntegrity,
  clauseSchemaRegression: g.clauseSchemaRegression,
  antiMemorization: g.antiMemorization,
  decisionLockHeld: g.decisionLockHeld,
  relationLockHeld: g.relationLockHeld,
  reasonImproved: improved,
  reasonSuiteNoRegression: suiteOk,
  collisionProbeNoRegression: collisionOk,
  disposition: accept ? 'accepted_reason_improvement' : 'rejected',
  rejectionGrounds: accept ? [] : [
    !g.decisionLockHeld ? 'decision_lock_regression' : null,
    !g.relationLockHeld ? 'relation_lock_regression' : null,
    !g.reasonIntegrity.pass ? 'reason_integrity_failure' : null,
    !suiteOk ? 'reason_suite_regression' : null,
    !collisionOk ? 'collision_probe_regression' : null,
    !improved ? 'reason_mismatches_not_reduced' : null,
    !target.pass ? 'target_equivalence_failure' : null,
    !placement.pass ? 'placement_non_interference_failure' : null,
    !composition.pass ? 'composition_non_interference_failure' : null,
  ].filter(Boolean),
};

L.writeJson(dir + 'ITERATION_RESULT.json', record);
L.snapshotRuntime(dir + 'runtime-snapshot');
fs.writeFileSync(dir + 'candidate.patch', execSync('git -C C:/Projects/tina-backend diff -- services/philippine-tax-intent-analyzer.js', { maxBuffer: 1e9 }).toString().replace(/\r\n/g, '\n'));
await L.finalizeAttempt(dir, { disposition: record.disposition, stdout: text, resultPaths: [dir + 'ITERATION_RESULT.json'] });
console.log('attempt', attemptId);
console.log('DISPOSITION', record.disposition, record.rejectionGrounds.join(','));
if (!accept) process.exit(3);
