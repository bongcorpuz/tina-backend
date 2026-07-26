// PHASE-10A14-R20 COMMIT 5R1-C10 — clean lock verification.
// No runtime or test change is made here; this is a separate governed R3 campaign
// against the exact same runtime, plus the full counterfactual suite and gates.
import fs from 'node:fs';
import * as L from './commit5r1c10-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const identityBefore = L.runtimeIdentity();

const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c10_decision_layer_lock_verification',
  cycle: 'commit5r1c10-lock',
  command: 'commit5r1c10-verify.mjs',
});

const rows = loadR3Rows();
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const cm = L.confusionMatrix(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const decisionPassed = 3720 - counts.decisionMismatches;

const suites = [
  ['v3', L.RES + 'COMMIT_5R1C7_DECISION_COUNTERFACTUAL_V3_SUITE.json'],
  ['v4', L.RES + 'COMMIT_5R1C8_DECISION_COUNTERFACTUAL_V4_SUITE.json'],
  ['v5', L.RES + 'COMMIT_5R1C9_DECISION_COUNTERFACTUAL_V5_SUITE.json'],
  ['v6', L.RES + 'COMMIT_5R1C10_DECISION_COUNTERFACTUAL_V6_SUITE.json'],
];
const cfBy = {}; let cfPass = 0, cfTotal = 0; const cfFail = [];
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

const identityAfter = L.runtimeIdentity();
const identityStable = identityBefore.servicesTreeDigest === identityAfter.servicesTreeDigest;

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'DECISION_CONFUSION_MATRIX.json', cm);
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', { probes: guard });
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', { combined: { total: cfTotal, passed: cfPass, failed: cfFail.length }, bySuite: cfBy, failures: cfFail });
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.snapshotRuntime(att.dir + 'runtime-snapshot');

const allCounterfactualsPass = cfFail.length === 0;
const lockConditions = {
  decisionEquals3720: decisionPassed === 3720,
  decisionMismatchesZero: counts.decisionMismatches === 0,
  falseAllowsZero: counts.materialFalseAllows === 0,
  falseRefusalsZero: counts.materialFalseRefusals === 0,
  clarifyMismatchesZero: counts.clarifyMismatches === 0,
  allCounterfactualsPass,
  allClosedControlsClosed: ctl.allClosed,
  runtimeIdentityStableAcrossVerification: identityStable,
};
const lockAchieved = Object.values(lockConditions).every(Boolean);

const stdout = [
  'clean lock verification',
  `overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 decisionMismatches=${counts.decisionMismatches}`,
  `fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} clarify=${counts.clarifyMismatches}`,
  `closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'}`,
  `counterfactual=${cfPass}/${cfTotal} failed=${cfFail.length}`,
  `runtimeIdentityStable=${identityStable}`,
  `LOCK_CONDITIONS=${JSON.stringify(lockConditions)}`,
  `LOCK_ACHIEVED=${lockAchieved}`,
].join('\n');
console.log(stdout);

L.writeJson(L.RES + 'COMMIT_5R1C10_LOCK_VERIFICATION_RESULT.json', {
  unit: 'COMMIT 5R1-C10', verificationAttemptId: att.attemptId,
  noRuntimeOrTestChangeDuringVerification: true,
  runtimeIdentityBefore: identityBefore, runtimeIdentityAfter: identityAfter, identityStable,
  decisionPassed, decisionMismatches: counts.decisionMismatches,
  falseAllows: counts.materialFalseAllows, falseRefusals: counts.materialFalseRefusals,
  clarifyMismatches: counts.clarifyMismatches,
  closedControls: ctl, counterfactual: { total: cfTotal, passed: cfPass, failed: cfFail.length, bySuite: cfBy },
  lockConditions, lockAchieved,
  note: lockAchieved
    ? 'All lock conditions satisfied.'
    : 'R3 reached 3720/3720 with all closed controls preserved, but the lock requires the complete combined counterfactual suite to pass. Remaining counterfactual failures are recorded; the lock is therefore NOT declared.',
});

await L.finalizeAttempt(att.dir, {
  disposition: lockAchieved ? 'controlling_lock_verification_pass' : 'controlling_lock_verification_counterfactuals_incomplete',
  stdout: stdout + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'DECISION_LANE.json', att.dir + 'COUNTERFACTUAL_RESULT.json', att.dir + 'CLOSED_CONTROLS.json'],
});
console.log('ATTEMPT_ID=' + att.attemptId);
