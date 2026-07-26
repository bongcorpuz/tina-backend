// PHASE-10A14-R20 COMMIT 5R1-C10 — register a material decision iteration.
// Usage: node commit5r1c10-iterate.mjs <NN> "<structural hypothesis>"
import fs from 'node:fs';
import * as L from './commit5r1c10-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const NN = process.argv[2];
const HYPOTHESIS = process.argv[3] || '';

const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: `r20_commit5r1c10_development_iteration_${NN}`,
  cycle: `commit5r1c10-dev-${NN}`,
  command: `commit5r1c10-iterate.mjs ${NN}`,
});

const rows = loadR3Rows();
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const cm = L.confusionMatrix(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const decisionPassed = 3720 - counts.decisionMismatches;

// combined counterfactual suite: v3 + v4 + v5 + v6
const suites = [
  ['v3', L.RES + 'COMMIT_5R1C7_DECISION_COUNTERFACTUAL_V3_SUITE.json'],
  ['v4', L.RES + 'COMMIT_5R1C8_DECISION_COUNTERFACTUAL_V4_SUITE.json'],
  ['v5', L.RES + 'COMMIT_5R1C9_DECISION_COUNTERFACTUAL_V5_SUITE.json'],
  ['v6', L.RES + 'COMMIT_5R1C10_DECISION_COUNTERFACTUAL_V6_SUITE.json'],
];
const cfBy = {};
let cfPass = 0, cfTotal = 0;
const cfFail = [];
for (const [name, p] of suites) {
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  let pass = 0;
  for (const q of s.queries) {
    const got = rt.classify(q.query).decision;
    if (got === q.expectedDecision) pass++;
    else cfFail.push({ suite: name, family: q.family, query: q.query, expected: q.expectedDecision, actual: got });
  }
  cfBy[name] = { total: s.queries.length, passed: pass, failed: s.queries.length - pass };
  cfPass += pass; cfTotal += s.queries.length;
}
const byFamily = {};
for (const f of cfFail) byFamily[f.family] = (byFamily[f.family] || 0) + 1;

const patch = L.git('diff -- services/');
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);
L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'DECISION_CONFUSION_MATRIX.json', cm);
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', { probes: guard });
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.writeJson(att.dir + 'ALL_FAILURES.json', failures);
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', { combined: { total: cfTotal, passed: cfPass, failed: cfFail.length }, bySuite: cfBy, byFamily, failures: cfFail });
L.writeJson(att.dir + 'HYPOTHESIS.json', { structuralHypothesis: HYPOTHESIS, iteration: NN });
L.writeJson(att.dir + 'SIDE_EFFECTS.json', { reasonMismatches: counts.reasonMismatches, relationMismatches: counts.relationMismatches, metamorphicGroupsPassed: counts.metamorphicGroupsPassed, metamorphicGroupsTotal: counts.metamorphicGroupsTotal });

const stdout = [
  `iteration ${NN}`,
  `overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 decisionMismatches=${counts.decisionMismatches}`,
  `falseAllows=${counts.materialFalseAllows} falseRefusals=${counts.materialFalseRefusals} clarifyMismatches=${counts.clarifyMismatches}`,
  `reason=${counts.reasonMismatches} relation=${counts.relationMismatches} metamorphic=${counts.metamorphicGroupsPassed}/${counts.metamorphicGroupsTotal}`,
  `closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'}`,
  `counterfactual combined=${cfPass}/${cfTotal} (v3 ${cfBy.v3.passed}/${cfBy.v3.total}, v4 ${cfBy.v4.passed}/${cfBy.v4.total}, v5 ${cfBy.v5.passed}/${cfBy.v5.total}, v6 ${cfBy.v6.passed}/${cfBy.v6.total})`,
  `richContextGuard=${guard.map((g) => g.shape + ':' + g.decision).join(' ')}`,
].join('\n');
console.log(stdout);

await L.finalizeAttempt(att.dir, {
  disposition: 'development_iteration_recorded',
  stdout: stdout + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'DECISION_LANE.json', att.dir + 'DECISION_CONFUSION_MATRIX.json', att.dir + 'COUNTERFACTUAL_RESULT.json', att.dir + 'CLOSED_CONTROLS.json', att.dir + 'RICH_CONTEXT_GUARD.json'],
});
console.log('ATTEMPT_ID=' + att.attemptId);
