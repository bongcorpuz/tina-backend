// PHASE-10A14-R20 COMMIT 5R1-C12 — register a material counterfactual-remediation iteration.
// Usage: node commit5r1c12-iterate.mjs <NN> "<hypothesis>" "<affected families>"
import fs from 'node:fs';
import * as L from './commit5r1c12-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const NN = process.argv[2];
const HYPOTHESIS = process.argv[3] || '';
const FAMILIES = process.argv[4] || '';

const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: `r20_commit5r1c12_counterfactual_iteration_${NN}`,
  cycle: `commit5r1c12-dev-${NN}`,
  command: `commit5r1c12-iterate.mjs ${NN}`,
});

const rows = loadR3Rows();
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const cf = L.runCounterfactuals(rt.classify);
const am = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);
const decisionPassed = 3720 - counts.decisionMismatches;

const r3Invariant = decisionPassed === 3720 && counts.materialFalseAllows === 0
  && counts.materialFalseRefusals === 0 && counts.clarifyMismatches === 0;
const acceptable = r3Invariant && ctl.allClosed && guard.allPass && am.pass;

const patch = L.git('diff -- services/');
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);
L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed, r3InvariantHeld: r3Invariant });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', guard);
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', cf);
L.writeJson(att.dir + 'ANTI_MEMORIZATION.json', am);
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.writeJson(att.dir + 'HYPOTHESIS.json', { hypothesis: HYPOTHESIS, affectedFamilies: FAMILIES, iteration: NN });
L.writeJson(att.dir + 'SIDE_EFFECTS.json', { reasonMismatches: counts.reasonMismatches, relationMismatches: counts.relationMismatches, metamorphicGroupsPassed: counts.metamorphicGroupsPassed, metamorphicGroupsTotal: counts.metamorphicGroupsTotal });

const stdout = [
  `iteration ${NN}`,
  `R3 decision=${decisionPassed}/3720 fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} clarify=${counts.clarifyMismatches} invariant=${r3Invariant}`,
  `overall=${counts.canonicalPassed}/3720 reason=${counts.reasonMismatches} relation=${counts.relationMismatches}`,
  `closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'} richContextGuard=${guard.passed}/${guard.total}`,
  `counterfactual=${cf.passed}/${cf.total} failed=${cf.failed} (v3 ${cf.bySuite.v3.failed}, v4 ${cf.bySuite.v4.failed}, v5 ${cf.bySuite.v5.failed}, v6 ${cf.bySuite.v6.failed})`,
  `antiMemorization=${am.pass ? 'PASS' : 'FAIL ' + JSON.stringify(am.failed)}`,
  `acceptable=${acceptable}`,
].join('\n');
console.log(stdout);

await L.finalizeAttempt(att.dir, {
  disposition: acceptable ? 'counterfactual_iteration_recorded' : 'counterfactual_iteration_rejected_invariant_or_gate',
  stdout: stdout + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'COUNTERFACTUAL_RESULT.json', att.dir + 'CLOSED_CONTROLS.json', att.dir + 'RICH_CONTEXT_GUARD.json', att.dir + 'ANTI_MEMORIZATION.json'],
});
console.log('ATTEMPT_ID=' + att.attemptId);
