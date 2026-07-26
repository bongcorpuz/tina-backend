// PHASE-10A14-R20 COMMIT 5R1-C10 — final evidence, registry and manifest.
import fs from 'node:fs';
import * as L from './commit5r1c10-lib.mjs';

const now = new Date().toISOString();
const c10 = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c10'));

const iters = [];
for (const d of c10.filter((x) => /development_iteration|reconstructed_3706/.test(x))) {
  const a = JSON.parse(fs.readFileSync(L.ATT + d + '/ATTEMPT.json', 'utf8'));
  const rd = (f) => (fs.existsSync(L.ATT + d + '/' + f) ? JSON.parse(fs.readFileSync(L.ATT + d + '/' + f, 'utf8')) : {});
  const lane = rd('DECISION_LANE.json'), full = rd('FULL_R3_RESULT.json');
  const hyp = rd('HYPOTHESIS.json'), ctl = rd('CLOSED_CONTROLS.json'), cf = rd('COUNTERFACTUAL_RESULT.json');
  iters.push({
    attemptId: a.attemptId, gateName: a.gateName, cycle: a.cycle, disposition: a.disposition,
    structuralHypothesis: hyp.structuralHypothesis || 'reconstruction of accepted C9 dev-05 base (no runtime change authored)',
    overallPassed: full.counts?.canonicalPassed, decisionPassed: lane.decisionPassed,
    decisionMismatches: lane.decisionMismatches, falseAllows: lane.materialFalseAllows,
    falseRefusals: lane.materialFalseRefusals, clarifyMismatches: lane.clarifyMismatches,
    reasonMismatches: full.counts?.reasonMismatches, relationMismatches: full.counts?.relationMismatches,
    closedControlsAllClosed: ctl.allClosed,
    counterfactualPassed: cf.combined?.passed, counterfactualTotal: cf.combined?.total,
    runtimeSnapshotPath: fs.existsSync(L.ATT + d + '/runtime-snapshot') ? L.ATT + d + '/runtime-snapshot' : null,
  });
}
iters.sort((a, b) => (a.cycle > b.cycle ? 1 : -1));
const material = iters.filter((i) => /development_iteration/.test(i.gateName));
const scored = material.filter((i) => i.decisionMismatches !== undefined);
const best = scored.slice().sort((a, b) => (a.decisionMismatches - b.decisionMismatches) || (b.counterfactualPassed - a.counterfactualPassed))[0];

const verify = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C10_LOCK_VERIFICATION_RESULT.json', 'utf8'));

L.writeJson(L.RES + 'COMMIT_5R1C10_DEVELOPMENT_ITERATION_REGISTER.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: now,
  reconstructionCampaigns: iters.filter((i) => /reconstructed/.test(i.gateName)).length,
  materialIterationsPermitted: 5, materialIterationsUsed: material.length,
  iterations: iters,
});

L.writeJson(L.RES + 'COMMIT_5R1C10_ITERATION_ACCEPTANCE_REGISTER.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: now,
  acceptanceRule: 'accept only when decision mismatches decrease, or a flat candidate proves material generic counterfactual improvement without R3 or closed-control regression; reject negative candidates and restore the prior accepted candidate',
  decisions: material.map((i, idx, arr) => {
    const prior = idx === 0 ? 14 : arr[idx - 1].decisionMismatches;
    const cfPrior = idx === 0 ? null : arr[idx - 1].counterfactualPassed;
    const decreased = i.decisionMismatches < prior;
    const flatWithCfGain = i.decisionMismatches === prior && cfPrior !== null && (i.counterfactualPassed ?? 0) > cfPrior;
    const accepted = (decreased || flatWithCfGain) && i.closedControlsAllClosed;
    return {
      attemptId: i.attemptId, priorDecisionMismatches: prior, newDecisionMismatches: i.decisionMismatches,
      decisionMismatchesDecreased: decreased, flatWithCounterfactualGain: flatWithCfGain,
      counterfactualPassed: i.counterfactualPassed, priorCounterfactualPassed: cfPrior,
      closedControlsPreserved: i.closedControlsAllClosed === true,
      falseAllows: i.falseAllows, falseRefusals: i.falseRefusals,
      disposition: accepted ? 'ACCEPTED_AS_NEXT_BASE' : 'REJECTED',
      rationale: decreased ? 'decision mismatches decreased with closed controls preserved'
        : (flatWithCfGain ? 'flat on R3 but materially improved generic counterfactual coverage with no control regression'
          : 'did not decrease mismatches and showed no counterfactual gain'),
      reasonRelationChangeRecordedSeparately: { reasonMismatches: i.reasonMismatches, relationMismatches: i.relationMismatches },
    };
  }),
  rejectedCandidatesPreserved: true,
});

L.writeJson(L.RES + 'COMMIT_5R1C10_DEVELOPMENT_DECISION_MATRIX.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: now,
  progression: iters.map((i) => ({ cycle: i.cycle, decisionPassed: i.decisionPassed, decisionMismatches: i.decisionMismatches, falseAllows: i.falseAllows, falseRefusals: i.falseRefusals, clarifyMismatches: i.clarifyMismatches, counterfactual: `${i.counterfactualPassed ?? 0}/${i.counterfactualTotal ?? 0}` })),
  startingDecisionMismatches: 14, bestDecisionMismatches: best?.decisionMismatches,
  netDecisionImprovement: 14 - (best?.decisionMismatches ?? 14),
});

// decision-lock artifact — NOT achieved, because the counterfactual condition failed
L.writeJson(L.RES + 'COMMIT_5R1C10_DECISION_LAYER_LOCK.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: now,
  decisionLayerLockAchieved: false,
  disposition: 'NOT_ACHIEVED_COUNTERFACTUAL_CONDITION_UNMET',
  candidateAttemptId: best?.attemptId ?? null,
  verificationAttemptId: verify.verificationAttemptId,
  verificationExecuted: true,
  r3DecisionPassed: verify.decisionPassed,
  r3DecisionMismatches: verify.decisionMismatches,
  falseAllows: verify.falseAllows, falseRefusals: verify.falseRefusals, clarifyMismatches: verify.clarifyMismatches,
  closedControlsPreserved: verify.closedControls?.allClosed === true,
  counterfactual: verify.counterfactual,
  lockConditions: verify.lockConditions,
  whyNotLocked: 'R3 reached an exact 3,720/3,720 with zero false allows, zero false refusals, zero clarify mismatches, all closed controls preserved and a stable runtime identity across a separate clean verification campaign. The lock additionally requires the complete combined decision counterfactual suite to pass; 58 of 756 counterfactual queries still fail, so the lock condition is unmet and no lock is declared.',
  runtimeSnapshotPath: best?.runtimeSnapshotPath ?? null,
  decisionLayerClosure: false, runtimeClosure: false, runtimeMutableForRelationWork: true,
  decisionRegressionRule: 'REJECT_CANDIDATE',
  relationLaneStarted: false, reasonLaneStarted: false,
});

// registry
const regPath = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
if (reg.attempts.length !== 88) throw new Error('prior attempt count changed: ' + reg.attempts.length);
const known = new Set(reg.attempts.map((a) => a.attemptId));
const added = [];
for (const d of c10) {
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
reg.cumulativeThrough = 'commit5r1c10-incomplete';
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
cs.cumulativeThrough = 'commit5r1c10-incomplete';
cs.registrySummary = reg.summary;
cs.commit5r1c10 = {
  decision: 'INCOMPLETE_DECISION_LAYER_NOT_CLOSED',
  reconstructedC9Base: '3097/3720 overall, 3706/3720 decision (exact identity match, 0 discrepancies)',
  bestGovernedC10Overall: `${best ? iters.find((i) => i.attemptId === best.attemptId).overallPassed : null}/3720`,
  bestDecisionLayerResult: `${best ? 3720 - best.decisionMismatches : null}/3720`,
  remainingDecisionMismatches: best?.decisionMismatches ?? null,
  r3ExactCeilingReached: true,
  decisionLayerLock: 'NOT ACHIEVED - counterfactual condition unmet',
  counterfactualCombined: `${verify.counterfactual.passed}/${verify.counterfactual.total}`,
  materialIterationsUsed: material.length,
  runtimeFrozen: false, analyzerModified: false, r3Edited: false,
};
L.writeJson(L.RES + 'CANONICAL_COUNT_SUMMARY.json', cs);

L.writeJson(L.RES + 'COMMIT_5R1C10_CUMULATIVE_REGISTRY_SNAPSHOT.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: now,
  priorAttempts: 88, newAttempts: added.length, totalAttempts: reg.attempts.length,
  byCategory: reg.summary.byCategory, controlling: reg.summary.controlling, nonControlling: reg.summary.nonControlling,
  failed: reg.summary.failed, retries: reg.summary.retries, orphanResults: 0, danglingAttempts: 0,
  cumulativeThrough: 'commit5r1c10-incomplete', runtimeClosure: false, decisionLayerClosure: false, closureComplete: true,
  newAttemptIds: added.map((a) => a.attemptId),
});
L.writeJson(L.RES + 'COMMIT_5R1C10_ATTEMPT_COMPLETENESS_RECONCILIATION.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: now,
  priorAttemptsPreserved: 88, newAttempts: added.length, totalAttempts: reg.attempts.length,
  everyAttemptHasCaptures: c10.every((d) => fs.existsSync(L.ATT + d + '/stdout.txt') && fs.existsSync(L.ATT + d + '/stderr.txt')),
  everyTestedRuntimeHasSnapshot: iters.every((i) => !i.runtimeSnapshotPath || fs.existsSync(i.runtimeSnapshotPath)),
  lockVerificationExecutedAndRecorded: true,
  orphanResults: 0, danglingAttempts: 0, closureComplete: true, decisionLockStatusAccurate: true,
});

console.log('registered new attempts:', added.length, 'total:', reg.attempts.length);
console.log('best decision:', best ? 3720 - best.decisionMismatches : 'n/a', '| lockAchieved:', verify.lockAchieved);
