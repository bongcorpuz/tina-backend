// PHASE-10A14-R20 COMMIT 5R1-C7 — register a material decision iteration.
// Usage: node commit5r1c7-iterate.mjs <NN> "<hypothesis>"
import fs from 'node:fs';
import * as L from './commit5r1c7-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const NN = process.argv[2];
const HYPOTHESIS = process.argv[3] || '';
const CONTROLS = ['tax_compliance_task', 'acronym_homograph_control', 'ambiguous_clarification_control', 'internal_label_proper_name'];

const att = L.allocateAttempt({
  category: 'domain_campaign',
  gate: `r20_commit5r1c7_development_iteration_${NN}`,
  cycle: `commit5r1c7-dev-${NN}`,
  command: `commit5r1c7-iterate.mjs ${NN}`,
});

const rows = loadR3Rows();
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const cm = L.confusionMatrix(rows, rt.classify);
const decisionPassed = 3720 - counts.decisionMismatches;

// closed decision controls
const ctlPass = {}, ctlTot = {};
for (const r of rows) {
  if (!CONTROLS.includes(r.primaryCategory)) continue;
  ctlTot[r.primaryCategory] = (ctlTot[r.primaryCategory] || 0) + 1;
  if (rt.classify(r.query).decision === r.expectedDecision) ctlPass[r.primaryCategory] = (ctlPass[r.primaryCategory] || 0) + 1;
}
const controlsClosed = CONTROLS.every((c) => ctlPass[c] === ctlTot[c]);

// counterfactual suite (v3 + structural expectations)
const cf = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C7_DECISION_COUNTERFACTUAL_V3_SUITE.json', 'utf8'));
let cfPass = 0;
const cfFail = [];
for (const q of cf.queries) {
  const got = rt.classify(q.query).decision;
  if (got === q.expectedDecision) cfPass++;
  else cfFail.push({ family: q.family, query: q.query, expected: q.expectedDecision, actual: got });
}

const patch = L.git('diff -- services/');
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);
L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', {
  attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches,
  materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals,
  clarifyMismatches: counts.clarifyMismatches,
});
L.writeJson(att.dir + 'DECISION_CONFUSION_MATRIX.json', cm);
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.writeJson(att.dir + 'ALL_FAILURES.json', failures);
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', { controls: CONTROLS.map((c) => ({ control: c, passed: ctlPass[c] || 0, total: ctlTot[c] || 0, closed: ctlPass[c] === ctlTot[c] })), allClosed: controlsClosed });
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', { total: cf.queries.length, passed: cfPass, failed: cfFail.length, failures: cfFail });
L.writeJson(att.dir + 'HYPOTHESIS.json', { architecturalHypothesis: HYPOTHESIS, iteration: NN });

const stdout = [
  `iteration ${NN}`,
  `overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 decisionMismatches=${counts.decisionMismatches}`,
  `falseAllows=${counts.materialFalseAllows} falseRefusals=${counts.materialFalseRefusals} clarifyMismatches=${counts.clarifyMismatches}`,
  `reason=${counts.reasonMismatches} relation=${counts.relationMismatches} metamorphic=${counts.metamorphicGroupsPassed}/${counts.metamorphicGroupsTotal}`,
  `closedControls=${controlsClosed ? 'ALL CLOSED' : 'REGRESSED'}`,
  `counterfactual=${cfPass}/${cf.queries.length}`,
].join('\n');
console.log(stdout);

L.finalizeAttempt(att.dir, {
  disposition: 'development_iteration_recorded',
  stdout: stdout + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'DECISION_LANE.json', att.dir + 'DECISION_CONFUSION_MATRIX.json', att.dir + 'COUNTERFACTUAL_RESULT.json'],
});
console.log('ATTEMPT_ID=' + att.attemptId);
