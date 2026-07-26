// PHASE-10A14-R20 COMMIT 5R1-C13 — governed iteration recorder.
// Allocates the attempt BEFORE execution, runs the full gate battery, applies the
// acceptance contract, preserves the snapshot and patch, and disposes truthfully.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c13-lib.mjs';
import { runGates, summarize } from './commit5r1c13-gates.mjs';

const iteration = process.argv[2];
const hypothesis = process.argv[3];
const families = (process.argv[4] || '').split(',').filter(Boolean);
const baseRelationMismatches = Number(process.argv[5]);
const baseRelationSuitePassed = Number(process.argv[6]);

const { attemptId, dir } = await L.allocateAttempt({
  category: 'domain_campaign', gate: `r20_commit5r1c13_relation_iteration_${iteration}`,
  cycle: `commit5r1c13-dev-${iteration}`,
  command: `evaluation/runner/phase-10a14-r20/commit5r1c13-patch-${iteration}.cjs`,
});

const g = await runGates({ label: `iteration-${iteration}` });
const text = summarize(g);
console.log(text);

const relImproved = g.r3.relationMismatches < baseRelationMismatches;
const relFlat = g.r3.relationMismatches === baseRelationMismatches;
const suiteNoRegress = g.relationCounterfactual.passed >= baseRelationSuitePassed;
const accept = g.decisionLockHeld && g.reasonIntegrity.pass && suiteNoRegress && (relImproved || relFlat);

const record = {
  attemptId, iteration, hypothesis, affectedRelationFamilies: families,
  baseline: { relationMismatches: baseRelationMismatches, relationSuitePassed: baseRelationSuitePassed },
  runtimeIdentity: g.runtimeIdentity,
  relationCounterfactual: {
    total: g.relationCounterfactual.total, passed: g.relationCounterfactual.passed,
    failed: g.relationCounterfactual.failed, byFamily: g.relationCounterfactual.byFamily,
    failures: g.relationCounterfactual.failures,
  },
  r3: g.r3,
  decisionCounterfactual: { total: g.decisionCounterfactual.total, passed: g.decisionCounterfactual.passed, bySuite: g.decisionCounterfactual.bySuite, failures: g.decisionCounterfactual.failures },
  closedControls: g.closedControls, richContextGuard: g.richContextGuard,
  reasonIntegrity: g.reasonIntegrity, relationObjectIntegrity: g.relationObjectIntegrity,
  antiMemorization: g.antiMemorization,
  decisionLockHeld: g.decisionLockHeld,
  reasonSideEffects: { reasonMismatches: g.r3.reasonMismatches, note: 'diagnostic only in C13; never a rejection ground on its own' },
  relationImproved: relImproved, relationFlat: relFlat, relationSuiteNoRegression: suiteNoRegress,
  disposition: accept ? (relImproved ? 'accepted_relation_improvement' : 'accepted_flat_structural_dependency') : 'rejected',
  rejectionGrounds: accept ? [] : [
    !g.decisionLockHeld ? 'decision_lock_regression' : null,
    !g.reasonIntegrity.pass ? 'reason_integrity_failure' : null,
    !suiteNoRegress ? 'relation_suite_regression' : null,
    (!relImproved && !relFlat) ? 'relation_mismatches_increased' : null,
  ].filter(Boolean),
};

L.writeJson(dir + 'ITERATION_RESULT.json', record);
L.writeJson(dir + 'RELATION_FAILURES_RAW.json', { count: g.relationFailures.length, failures: g.relationFailures });
L.snapshotRuntime(dir + 'runtime-snapshot');
try {
  fs.writeFileSync(dir + 'candidate.patch', execSync('git -C C:/Projects/tina-backend diff -- services/philippine-tax-intent-analyzer.js', { maxBuffer: 1e9 }).toString().replace(/\r\n/g, '\n'));
} catch { /* patch capture is evidence only */ }

await L.finalizeAttempt(dir, {
  disposition: record.disposition, stdout: text,
  resultPaths: [dir + 'ITERATION_RESULT.json', dir + 'RELATION_FAILURES_RAW.json'],
});
console.log('\nattempt', attemptId);
console.log('DISPOSITION', record.disposition, record.rejectionGrounds.length ? JSON.stringify(record.rejectionGrounds) : '');
if (!accept) process.exit(3);
