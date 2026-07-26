// PHASE-10A14-R20 COMMIT 5R1-C14 — governed iteration recorder.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c14-lib.mjs';
import { runGates, summarize } from './commit5r1c14-gates.mjs';

const iteration = process.argv[2];
const hypothesis = process.argv[3];
const baseRelationSuite = Number(process.argv[4]);
const baseEight = Number(process.argv[5]);

const clausesBefore = {};
{
  const a = await L.loadAnalyzer();
  for (const q of JSON.parse(fs.readFileSync(L.CLAUSE_PROBES, 'utf8')).probes.slice(0, 6)) {
    clausesBefore[q.query] = (a(q.query).clauses || []).map((c) => ({ id: c.clauseId, role: c.role, text: c.text }));
  }
}

const { attemptId, dir } = await L.allocateAttempt({
  category: 'domain_campaign', gate: `r20_commit5r1c14_clause_relation_iteration_${iteration}`,
  cycle: `commit5r1c14-dev-${iteration}`,
  command: `evaluation/runner/phase-10a14-r20/commit5r1c14-patch-${iteration}.cjs`,
});

const g = await runGates({ label: `iteration-${iteration}` });
const text = summarize(g);
console.log(text);

const accept = g.decisionLockHeld && g.r3RelationHeld && g.reasonIntegrity.pass
  && g.clauseProbes.failed === 0 && g.clauseSchemaRegression.pass
  && g.focusedRelationRegression.allBucketsPass
  && g.relationCounterfactual.passed >= baseRelationSuite
  && g.openEight.passed >= baseEight;

const record = {
  attemptId, iteration, hypothesis,
  baseline: { relationSuitePassed: baseRelationSuite, openEightPassed: baseEight },
  runtimeIdentity: g.runtimeIdentity,
  clauseOutputBefore: clausesBefore,
  clauseOutputAfter: Object.fromEntries(Object.entries(clausesBefore).map(([q]) => [q, null])),
  openEight: g.openEight,
  clauseProbes: { total: g.clauseProbes.total, passed: g.clauseProbes.passed, failed: g.clauseProbes.failed, byFamily: g.clauseProbes.byFamily, failures: g.clauseProbes.failures },
  relationCounterfactual: { total: g.relationCounterfactual.total, passed: g.relationCounterfactual.passed, failed: g.relationCounterfactual.failed, byFamily: g.relationCounterfactual.byFamily, failures: g.relationCounterfactual.failures, nonControllingProbes: g.relationCounterfactual.nonControllingProbes },
  clauseSchemaRegression: g.clauseSchemaRegression,
  focusedRelationRegression: g.focusedRelationRegression,
  r3: g.r3,
  decisionCounterfactual: { total: g.decisionCounterfactual.total, passed: g.decisionCounterfactual.passed, bySuite: g.decisionCounterfactual.bySuite, failures: g.decisionCounterfactual.failures },
  closedControls: g.closedControls, richContextGuard: g.richContextGuard,
  reasonIntegrity: g.reasonIntegrity, relationObjectIntegrity: g.relationObjectIntegrity,
  antiMemorization: g.antiMemorization,
  decisionLockHeld: g.decisionLockHeld, r3RelationHeld: g.r3RelationHeld,
  reasonSideEffects: { reasonMismatches: g.r3.reasonMismatches, note: 'diagnostic only in C14; never a rejection ground on its own' },
  disposition: accept ? 'accepted_relation_lock_candidate' : 'rejected',
  rejectionGrounds: accept ? [] : [
    !g.decisionLockHeld ? 'decision_lock_regression' : null,
    !g.r3RelationHeld ? 'r3_relation_regression' : null,
    g.clauseProbes.failed ? 'clause_probe_failure' : null,
    !g.clauseSchemaRegression.pass ? 'clause_schema_regression' : null,
    !g.focusedRelationRegression.allBucketsPass ? 'focused_relation_regression' : null,
    g.relationCounterfactual.passed < baseRelationSuite ? 'relation_suite_regression' : null,
    !g.reasonIntegrity.pass ? 'reason_integrity_failure' : null,
  ].filter(Boolean),
};
{
  const a = await L.loadAnalyzer();
  for (const q of Object.keys(clausesBefore)) {
    record.clauseOutputAfter[q] = (a(q).clauses || []).map((c) => ({ id: c.clauseId, role: c.role, text: c.text }));
  }
}

L.writeJson(dir + 'ITERATION_RESULT.json', record);
L.snapshotRuntime(dir + 'runtime-snapshot');
try {
  fs.writeFileSync(dir + 'candidate.patch', execSync('git -C C:/Projects/tina-backend diff -- services/philippine-tax-intent-analyzer.js', { maxBuffer: 1e9 }).toString().replace(/\r\n/g, '\n'));
} catch { /* evidence only */ }

await L.finalizeAttempt(dir, { disposition: record.disposition, stdout: text, resultPaths: [dir + 'ITERATION_RESULT.json'] });
console.log('\nattempt', attemptId);
console.log('DISPOSITION', record.disposition, record.rejectionGrounds.length ? JSON.stringify(record.rejectionGrounds) : '');
if (!accept) process.exit(3);
