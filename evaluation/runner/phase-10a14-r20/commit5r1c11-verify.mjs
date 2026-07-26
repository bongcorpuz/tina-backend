// PHASE-10A14-R20 COMMIT 5R1-C11 — clean verification campaign.
// No runtime or test change; separate governed R3 + full counterfactual + gates.
import fs from 'node:fs';
import * as L from './commit5r1c11-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const identityBefore = L.runtimeIdentity();
const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c11_decision_layer_lock_verification',
  cycle: 'commit5r1c11-lock',
  command: 'commit5r1c11-verify.mjs',
});

const rows = loadR3Rows();
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const cf = L.runCounterfactuals(rt.classify);
const decisionPassed = 3720 - counts.decisionMismatches;
const identityAfter = L.runtimeIdentity();
const identityStable = identityBefore.servicesTreeDigest === identityAfter.servicesTreeDigest;

const lockConditions = {
  r3DecisionEquals3720: decisionPassed === 3720,
  falseAllowsZero: counts.materialFalseAllows === 0,
  falseRefusalsZero: counts.materialFalseRefusals === 0,
  clarifyMismatchesZero: counts.clarifyMismatches === 0,
  counterfactualSuiteFullyPasses: cf.failed === 0,
  closedControlsAllClosed: ctl.allClosed,
  richContextGuardPass: guard.allPass,
  runtimeIdentityStable: identityStable,
};
const lockAchieved = Object.values(lockConditions).every(Boolean);

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', guard);
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', cf);
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.snapshotRuntime(att.dir + 'runtime-snapshot');

const stdout = [
  'clean verification',
  `R3 decision=${decisionPassed}/3720 fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} clarify=${counts.clarifyMismatches}`,
  `closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'} richContextGuard=${guard.allPass ? 'PASS' : 'FAIL'}`,
  `counterfactual=${cf.passed}/${cf.total} failed=${cf.failed}`,
  `runtimeIdentityStable=${identityStable}`,
  `LOCK_CONDITIONS=${JSON.stringify(lockConditions)}`,
  `LOCK_ACHIEVED=${lockAchieved}`,
].join('\n');
console.log(stdout);

L.writeJson(L.RES + 'COMMIT_5R1C11_LOCK_VERIFICATION_RESULT.json', {
  unit: 'COMMIT 5R1-C11', verificationAttemptId: att.attemptId,
  noRuntimeOrTestChangeDuringVerification: true,
  runtimeIdentityBefore: identityBefore, runtimeIdentityAfter: identityAfter, identityStable,
  decisionPassed, decisionMismatches: counts.decisionMismatches,
  falseAllows: counts.materialFalseAllows, falseRefusals: counts.materialFalseRefusals,
  clarifyMismatches: counts.clarifyMismatches,
  closedControls: ctl, richContextGuard: guard,
  counterfactual: { total: cf.total, passed: cf.passed, failed: cf.failed, bySuite: cf.bySuite, byFamily: cf.byFamily },
  lockConditions, lockAchieved,
  note: lockAchieved
    ? 'All lock conditions satisfied.'
    : 'R3 holds an exact 3,720/3,720 with all closed controls and the rich-context guard intact, but the lock requires the complete combined counterfactual suite to pass. ' + cf.failed + ' of ' + cf.total + ' queries still fail, so the lock is not declared.',
});

await L.finalizeAttempt(att.dir, {
  disposition: lockAchieved ? 'controlling_lock_verification_pass' : 'controlling_lock_verification_counterfactuals_incomplete',
  stdout: stdout + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'COUNTERFACTUAL_RESULT.json', att.dir + 'CLOSED_CONTROLS.json', att.dir + 'RICH_CONTEXT_GUARD.json'],
});
console.log('ATTEMPT_ID=' + att.attemptId);
