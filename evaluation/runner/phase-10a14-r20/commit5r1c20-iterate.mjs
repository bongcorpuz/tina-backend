// PHASE-10A14-R20 COMMIT 5R1-C15 — governed iteration recorder.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const iteration = process.argv[2];
const hypothesis = process.argv[3];
const families = (process.argv[4] || '').split(',').filter(Boolean);
const baseReasonMismatches = Number(process.argv[5]);
const baseReasonSuite = Number(process.argv[6]);

const { attemptId, dir } = await L.allocateAttempt({
  category: 'domain_campaign', gate: `r20_commit5r1c20_reason_iteration_${iteration}`,
  cycle: `commit5r1c20-dev-${iteration}`,
  command: `evaluation/runner/phase-10a14-r20/commit5r1c20-patch-${iteration}.cjs`,
});

const g = await runGates({ label: `iteration-${iteration}` });
const text = summarize(g);
console.log(text);

const improved = g.r3.reasonMismatches < baseReasonMismatches;
const flat = g.r3.reasonMismatches === baseReasonMismatches;
const suiteOk = g.reasonCounterfactual.passed >= baseReasonSuite;
const accept = g.decisionLockHeld && g.relationLockHeld && g.reasonIntegrity.pass
  && suiteOk && (improved || flat);

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const residual = {};
for (const r of rows) {
  const got = analyze(r.query).reasonCode;
  if (got === r.expectedReasonCodeFamily) continue;
  const k = r.expectedReasonCodeFamily + ' <- ' + got;
  residual[k] = (residual[k] || 0) + 1;
}

const record = {
  attemptId, iteration, hypothesis, affectedReasonFamilies: families,
  baseline: { reasonMismatches: baseReasonMismatches, reasonSuitePassed: baseReasonSuite },
  runtimeIdentity: g.runtimeIdentity,
  branchEquivalence: JSON.parse(fs.readFileSync(L.RES+"COMMIT_5R1C19_BRANCH_EQUIVALENCE_RESULT.json","utf8")),
  collisionProbes: { total: g.collisionProbes.total, passed: g.collisionProbes.passed, failed: g.collisionProbes.failed, byFamily: g.collisionProbes.byFamily },
  reasonCounterfactual: { total: g.reasonCounterfactual.total, passed: g.reasonCounterfactual.passed, failed: g.reasonCounterfactual.failed, byFamily: g.reasonCounterfactual.byFamily, failures: g.reasonCounterfactual.failures },
  r3: g.r3, reasonPassed: g.reasonPassed,
  reasonConfusionResidual: residual,
  focusedReasonRegression: g.focusedReasonRegression,
  decisionCounterfactual: { total: g.decisionCounterfactual.total, passed: g.decisionCounterfactual.passed, failures: g.decisionCounterfactual.failures },
  relationCounterfactual: { total: g.relationCounterfactual.total, passed: g.relationCounterfactual.passed, failed: g.relationCounterfactual.failed },
  clauseProbes: { total: g.clauseProbes.total, passed: g.clauseProbes.passed, failed: g.clauseProbes.failed },
  closedControls: g.closedControls, richContextGuard: g.richContextGuard,
  reasonIntegrity: g.reasonIntegrity, relationObjectIntegrity: g.relationObjectIntegrity,
  clauseSchemaRegression: g.clauseSchemaRegression, antiMemorization: g.antiMemorization,
  decisionLockHeld: g.decisionLockHeld, relationLockHeld: g.relationLockHeld,
  reasonImproved: improved, reasonFlat: flat, reasonSuiteNoRegression: suiteOk,
  disposition: accept ? (improved ? 'accepted_reason_improvement' : 'accepted_flat_structural_dependency') : 'rejected',
  rejectionGrounds: accept ? [] : [
    !g.decisionLockHeld ? 'decision_lock_regression' : null,
    !g.relationLockHeld ? 'relation_lock_regression' : null,
    !g.reasonIntegrity.pass ? 'reason_integrity_failure' : null,
    !suiteOk ? 'reason_suite_regression' : null,
    (!improved && !flat) ? 'reason_mismatches_increased' : null,
  ].filter(Boolean),
};

L.writeJson(dir + 'ITERATION_RESULT.json', record);
L.snapshotRuntime(dir + 'runtime-snapshot');
try {
  fs.writeFileSync(dir + 'candidate.patch', execSync('git -C C:/Projects/tina-backend diff -- services/philippine-tax-intent-analyzer.js', { maxBuffer: 1e9 }).toString().replace(/\r\n/g, '\n'));
} catch { /* evidence only */ }

await L.finalizeAttempt(dir, { disposition: record.disposition, stdout: text, resultPaths: [dir + 'ITERATION_RESULT.json'] });
console.log('\nattempt', attemptId);
console.log('DISPOSITION', record.disposition, record.rejectionGrounds.length ? JSON.stringify(record.rejectionGrounds) : '');
if (!accept) process.exit(3);
