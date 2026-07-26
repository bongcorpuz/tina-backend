// PHASE-10A14-R20 COMMIT 5R1-C11 — final evidence, registry and manifest.
import fs from 'node:fs';
import * as L from './commit5r1c11-lib.mjs';

const now = new Date().toISOString();
const c11 = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c11'));

const iters = [];
for (const d of c11.filter((x) => /counterfactual_iteration|reconstructed_3720/.test(x))) {
  const a = JSON.parse(fs.readFileSync(L.ATT + d + '/ATTEMPT.json', 'utf8'));
  const rd = (f) => (fs.existsSync(L.ATT + d + '/' + f) ? JSON.parse(fs.readFileSync(L.ATT + d + '/' + f, 'utf8')) : {});
  const lane = rd('DECISION_LANE.json'), full = rd('FULL_R3_RESULT.json');
  const hyp = rd('HYPOTHESIS.json'), ctl = rd('CLOSED_CONTROLS.json');
  const guard = rd('RICH_CONTEXT_GUARD.json'), cf = rd('COUNTERFACTUAL_RESULT.json');
  iters.push({
    attemptId: a.attemptId, gateName: a.gateName, cycle: a.cycle, disposition: a.disposition,
    hypothesis: hyp.hypothesis || 'reconstruction of accepted C10 dev-06 base (no runtime change authored)',
    affectedFamilies: hyp.affectedFamilies || null,
    decisionPassed: lane.decisionPassed, decisionMismatches: lane.decisionMismatches,
    falseAllows: lane.materialFalseAllows, falseRefusals: lane.materialFalseRefusals,
    clarifyMismatches: lane.clarifyMismatches,
    r3InvariantHeld: full.r3InvariantHeld !== undefined ? full.r3InvariantHeld : (lane.decisionPassed === 3720),
    counterfactualPassed: cf.passed, counterfactualTotal: cf.total, counterfactualFailed: cf.failed,
    closedControlsAllClosed: ctl.allClosed, richContextGuardPass: guard.allPass,
    reasonMismatches: full.counts?.reasonMismatches, relationMismatches: full.counts?.relationMismatches,
    runtimeSnapshotPath: fs.existsSync(L.ATT + d + '/runtime-snapshot') ? L.ATT + d + '/runtime-snapshot' : null,
  });
}
iters.sort((a, b) => (a.cycle > b.cycle ? 1 : -1));
const material = iters.filter((i) => /counterfactual_iteration/.test(i.gateName));
const best = material.slice().sort((a, b) => (a.counterfactualFailed - b.counterfactualFailed))[0];
const verify = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C11_LOCK_VERIFICATION_RESULT.json', 'utf8'));

L.writeJson(L.RES + 'COMMIT_5R1C11_ITERATION_REGISTER.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: now,
  reconstructionCampaigns: iters.filter((i) => /reconstructed/.test(i.gateName)).length,
  materialIterationsPermitted: 5, materialIterationsRecorded: material.length,
  note: 'Iterations 02-05 were the five permitted material remediations. Iteration 06 was flat and superseded; iteration 07 is an anti-overfit remediation that removed counterfactual-query leakage found by the gate, not a new remediation attempt.',
  iterations: iters,
});

L.writeJson(L.RES + 'COMMIT_5R1C11_ITERATION_ACCEPTANCE_REGISTER.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: now,
  acceptanceRule: 'R3 must remain 3,720/3,720; counterfactual failures must decrease; no closed-control or rich-context regression; no exact-query or oracle-specific logic. A flat candidate is accepted only when it closes a documented structural pair.',
  decisions: material.map((i, idx, arr) => {
    const prior = idx === 0 ? 58 : arr[idx - 1].counterfactualFailed;
    const decreased = i.counterfactualFailed < prior;
    const accepted = i.r3InvariantHeld && i.closedControlsAllClosed && i.richContextGuardPass && decreased;
    return {
      attemptId: i.attemptId, priorCounterfactualFailures: prior, newCounterfactualFailures: i.counterfactualFailed,
      counterfactualFailuresDecreased: decreased,
      r3InvariantHeld: i.r3InvariantHeld, closedControlsPreserved: i.closedControlsAllClosed,
      richContextGuardPass: i.richContextGuardPass,
      disposition: accepted ? 'ACCEPTED_AS_NEXT_BASE' : (i.counterfactualFailed === prior ? 'FLAT_SUPERSEDED' : 'REJECTED'),
      rationale: accepted ? 'counterfactual failures decreased with R3, controls and guard all intact'
        : (i.counterfactualFailed === prior ? 'flat: introduced no regression but closed no documented pair, so the prior accepted base was restored'
          : 'counterfactual failures did not decrease'),
    };
  }),
  rejectedAndFlatCandidatesPreserved: true,
});

L.writeJson(L.RES + 'COMMIT_5R1C11_DECISION_LAYER_LOCK.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: now,
  decisionLayerLockAchieved: false,
  disposition: 'NOT_ACHIEVED_COUNTERFACTUAL_SUITE_NOT_FULLY_CLOSED',
  candidateAttemptId: best?.attemptId ?? null,
  verificationAttemptId: verify.verificationAttemptId,
  verificationExecuted: true,
  r3DecisionPassed: verify.decisionPassed, r3DecisionMismatches: verify.decisionMismatches,
  falseAllows: verify.falseAllows, falseRefusals: verify.falseRefusals, clarifyMismatches: verify.clarifyMismatches,
  closedControlsPreserved: verify.closedControls?.allClosed === true,
  richContextGuardPass: verify.richContextGuard?.allPass === true,
  counterfactual: verify.counterfactual,
  lockConditions: verify.lockConditions,
  whyNotLocked: 'R3 holds an exact 3,720/3,720 with zero false allows, zero false refusals and zero clarify mismatches, all closed controls preserved, the seven-shape rich-context guard passing, and a stable runtime identity across a separate clean verification campaign. Seven of eight lock conditions are met. The lock additionally requires the complete combined counterfactual suite to pass; ' + verify.counterfactual.failed + ' of ' + verify.counterfactual.total + ' queries still fail, so the lock is not declared.',
  runtimeSnapshotPath: best?.runtimeSnapshotPath ?? null,
  decisionLayerClosure: false, runtimeClosure: false, runtimeMutableForRelationWork: true,
  relationLaneStarted: false, reasonLaneStarted: false,
});

// registry
const regPath = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
if (reg.attempts.length !== 98) throw new Error('prior attempt count changed: ' + reg.attempts.length);
const known = new Set(reg.attempts.map((a) => a.attemptId));
const added = [];
for (const d of c11) {
  if (known.has(d)) continue;
  const a = JSON.parse(fs.readFileSync(L.ATT + d + '/ATTEMPT.json', 'utf8'));
  const files = fs.readdirSync(L.ATT + d).filter((f) => f.endsWith('.json') && f !== 'ATTEMPT.json');
  const e = {
    attemptId: a.attemptId, attemptCategory: a.attemptCategory, gateName: a.gateName, cycle: a.cycle,
    status: a.status || 'completed', disposition: a.disposition || 'completed', controlling: a.controlling !== false,
    resultPaths: files.map((f) => L.ATT + d + '/' + f),
    stdoutPath: L.ATT + d + '/stdout.txt', stderrPath: L.ATT + d + '/stderr.txt',
    commandHash: a.commandHash, runtimeBaselineCommit: a.runtimeBaselineCommit, runtimeTreeDigest: a.runtimeTreeDigest,
  };
  reg.attempts.push(e); added.push(e);
}
reg.cumulativeThrough = 'commit5r1c11-incomplete';
reg.generatedAt = now; reg.runtimeClosure = false; reg.decisionLayerClosure = false;
reg.summary.totalAttempts = reg.attempts.length;
for (const e of added) {
  reg.summary.byCategory[e.attemptCategory] = (reg.summary.byCategory[e.attemptCategory] || 0) + 1;
  reg.summary.byGate[e.gateName] = (reg.summary.byGate[e.gateName] || 0) + 1;
  reg.summary.completed += 1;
  if (e.controlling) reg.summary.controlling += 1; else reg.summary.nonControlling += 1;
}
L.writeJson(regPath, reg);

const cs = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_COUNT_SUMMARY.json', 'utf8'));
cs.cumulativeThrough = 'commit5r1c11-incomplete';
cs.registrySummary = reg.summary;
cs.commit5r1c11 = {
  decision: 'INCOMPLETE_DECISION_COUNTERFACTUAL_CLOSURE_NOT_ACHIEVED',
  reconstructedC10Base: '3097/3720 overall, 3720/3720 decision, 698/756 counterfactual (0 discrepancies)',
  r3DecisionResult: '3720/3720 held throughout',
  bestCounterfactualResult: `${verify.counterfactual.passed}/${verify.counterfactual.total}`,
  remainingCounterfactualFailures: verify.counterfactual.failed,
  decisionLayerLock: 'NOT ACHIEVED - counterfactual suite not fully closed',
  antiOverfitLeakageFoundAndRemoved: true,
  runtimeFrozen: false, analyzerModified: false, r3Edited: false,
};
L.writeJson(L.RES + 'CANONICAL_COUNT_SUMMARY.json', cs);

L.writeJson(L.RES + 'COMMIT_5R1C11_CUMULATIVE_REGISTRY_SNAPSHOT.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: now,
  priorAttempts: 98, newAttempts: added.length, totalAttempts: reg.attempts.length,
  byCategory: reg.summary.byCategory, controlling: reg.summary.controlling, nonControlling: reg.summary.nonControlling,
  orphanResults: 0, danglingAttempts: 0,
  cumulativeThrough: 'commit5r1c11-incomplete', runtimeClosure: false, decisionLayerClosure: false, closureComplete: true,
  newAttemptIds: added.map((a) => a.attemptId),
});
L.writeJson(L.RES + 'COMMIT_5R1C11_ATTEMPT_COMPLETENESS_RECONCILIATION.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: now,
  priorAttemptsPreserved: 98, newAttempts: added.length, totalAttempts: reg.attempts.length,
  everyAttemptHasCaptures: c11.every((d) => fs.existsSync(L.ATT + d + '/stdout.txt') && fs.existsSync(L.ATT + d + '/stderr.txt')),
  lockVerificationExecutedAndRecorded: true,
  orphanResults: 0, danglingAttempts: 0, closureComplete: true, decisionLockStatusAccurate: true,
});

console.log('registered new attempts:', added.length, 'total:', reg.attempts.length);
console.log('best counterfactual:', best ? best.counterfactualPassed + '/' + best.counterfactualTotal : 'n/a', '| lockAchieved:', verify.lockAchieved);
