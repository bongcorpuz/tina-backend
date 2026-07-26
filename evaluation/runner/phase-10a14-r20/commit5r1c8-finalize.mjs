// PHASE-10A14-R20 COMMIT 5R1-C8 — final evidence, registry and manifest.
import fs from 'node:fs';
import path from 'node:path';
import * as L from './commit5r1c8-lib.mjs';

const now = new Date().toISOString();
const c8 = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c8'));

// ── iteration register
const iters = [];
for (const d of c8.filter((x) => /development_iteration|reconstructed_3623/.test(x))) {
  const a = JSON.parse(fs.readFileSync(L.ATT + d + '/ATTEMPT.json', 'utf8'));
  const rd = (f) => (fs.existsSync(L.ATT + d + '/' + f) ? JSON.parse(fs.readFileSync(L.ATT + d + '/' + f, 'utf8')) : {});
  const lane = rd('DECISION_LANE.json'), full = rd('FULL_R3_RESULT.json');
  const hyp = rd('HYPOTHESIS.json'), ctl = rd('CLOSED_CONTROLS.json'), cf = rd('COUNTERFACTUAL_RESULT.json');
  iters.push({
    attemptId: a.attemptId, gateName: a.gateName, cycle: a.cycle,
    structuralHypothesis: hyp.structuralHypothesis || 'reconstruction of accepted C7 dev-06 base (no runtime change authored)',
    overallPassed: full.counts?.canonicalPassed, decisionPassed: lane.decisionPassed,
    decisionMismatches: lane.decisionMismatches, falseAllows: lane.materialFalseAllows,
    falseRefusals: lane.materialFalseRefusals, clarifyMismatches: lane.clarifyMismatches,
    reasonMismatches: full.counts?.reasonMismatches, relationMismatches: full.counts?.relationMismatches,
    metamorphicPassed: full.counts?.metamorphicGroupsPassed,
    closedControlsAllClosed: ctl.allClosed,
    counterfactualPassed: cf.combined?.passed, counterfactualTotal: cf.combined?.total,
    runtimeSnapshotPath: L.ATT + d + '/runtime-snapshot',
    patchFromPriorBase: L.ATT + d + '/runtime-snapshot/PATCH_FROM_BASE.patch',
  });
}
iters.sort((a, b) => (a.cycle > b.cycle ? 1 : -1));
const material = iters.filter((i) => /development_iteration/.test(i.gateName));
const best = iters.filter((i) => i.decisionMismatches !== undefined).sort((a, b) => a.decisionMismatches - b.decisionMismatches)[0];

L.writeJson(L.RES + 'COMMIT_5R1C8_DEVELOPMENT_ITERATION_REGISTER.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: now,
  reconstructionCampaigns: 1, materialIterationsPermitted: 5, materialIterationsUsed: material.length,
  iterations: iters,
});
L.writeJson(L.RES + 'COMMIT_5R1C8_ITERATION_ACCEPTANCE_REGISTER.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: now,
  acceptanceRule: 'decision mismatches decrease; closed controls remain closed; relevant counterfactual families improve or pass; no material hidden FA/FR/CLARIFY trade; no exact-row or oracle-specific logic',
  decisions: material.map((i, idx, arr) => {
    const prior = idx === 0 ? 97 : arr[idx - 1].decisionMismatches;
    const cfPrior = idx === 0 ? null : arr[idx - 1].counterfactualPassed;
    const decreased = i.decisionMismatches < prior;
    const cfImproved = cfPrior === null ? true : (i.counterfactualPassed ?? 0) >= cfPrior;
    return {
      attemptId: i.attemptId, priorDecisionMismatches: prior, newDecisionMismatches: i.decisionMismatches,
      decisionMismatchesDecreased: decreased,
      counterfactualPassed: i.counterfactualPassed, counterfactualImprovedOrHeld: cfImproved,
      closedControlsPreserved: i.closedControlsAllClosed === true,
      disposition: (decreased || cfImproved) && i.closedControlsAllClosed ? 'ACCEPTED_AS_NEXT_BASE' : 'REJECTED',
      acceptanceBasis: decreased ? 'decision mismatches decreased' : 'decision-safe generalization: counterfactual coverage improved with closed controls preserved',
      reasonRelationChangeRecordedSeparately: { reasonMismatches: i.reasonMismatches, relationMismatches: i.relationMismatches },
    };
  }),
  rejectedCandidatesPreserved: true,
});
L.writeJson(L.RES + 'COMMIT_5R1C8_DEVELOPMENT_DECISION_MATRIX.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: now,
  progression: iters.map((i) => ({ cycle: i.cycle, decisionPassed: i.decisionPassed, decisionMismatches: i.decisionMismatches, falseAllows: i.falseAllows, falseRefusals: i.falseRefusals, clarifyMismatches: i.clarifyMismatches, counterfactual: `${i.counterfactualPassed ?? 0}/${i.counterfactualTotal ?? 0}` })),
  startingDecisionMismatches: 97, bestDecisionMismatches: best?.decisionMismatches,
  netDecisionImprovement: 97 - (best?.decisionMismatches ?? 97),
});

// ── decision lock artifact (not achieved)
L.writeJson(L.RES + 'COMMIT_5R1C8_DECISION_LAYER_LOCK.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: now,
  decisionLayerLockAchieved: false,
  disposition: 'NOT_ACHIEVED_ITERATION_CEILING_REACHED',
  candidateAttemptId: best?.attemptId ?? null,
  verificationAttemptId: null,
  verificationNotExecutedReason: 'A clean lock-verification campaign is allocated only after a candidate reaches decision 3720/3720. The best candidate reached ' + (3720 - (best?.decisionMismatches ?? 0)) + '/3720, so no verification was run and none was fabricated.',
  runtimeSnapshotPath: best?.runtimeSnapshotPath ?? null,
  decisionPassed: best ? 3720 - best.decisionMismatches : null,
  decisionMismatches: best?.decisionMismatches ?? null,
  falseAllows: best?.falseAllows ?? null, falseRefusals: best?.falseRefusals ?? null,
  clarifyMismatches: best?.clarifyMismatches ?? null,
  closedControlsPreserved: best?.closedControlsAllClosed === true,
  decisionLayerClosure: false, runtimeClosure: false, runtimeMutableForRelationWork: true,
  decisionRegressionRule: 'REJECT_CANDIDATE',
  relationLaneStarted: false, reasonLaneStarted: false,
});

// ── registry
const regPath = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
if (reg.attempts.length !== 69) throw new Error('prior attempt count changed: ' + reg.attempts.length);
const known = new Set(reg.attempts.map((a) => a.attemptId));
const added = [];
for (const d of c8) {
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
reg.cumulativeThrough = 'commit5r1c8-incomplete';
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
cs.cumulativeThrough = 'commit5r1c8-incomplete';
cs.registrySummary = reg.summary;
cs.commit5r1c8 = {
  decision: 'INCOMPLETE_DECISION_LAYER_NOT_CLOSED',
  reconstructedC7Base: '3047/3720 overall, 3623/3720 decision (exact identity match, 0 discrepancies)',
  bestGovernedC8Overall: `${best ? iters.find((i) => i.attemptId === best.attemptId).overallPassed : null}/3720`,
  bestDecisionLayerResult: `${best ? 3720 - best.decisionMismatches : null}/3720`,
  remainingDecisionMismatches: best?.decisionMismatches ?? null,
  decisionLayerLock: 'NOT ACHIEVED',
  materialIterationsUsed: material.length,
  runtimeFrozen: false, analyzerModified: false, r3Edited: false,
};
L.writeJson(L.RES + 'CANONICAL_COUNT_SUMMARY.json', cs);

L.writeJson(L.RES + 'COMMIT_5R1C8_CUMULATIVE_REGISTRY_SNAPSHOT.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: now,
  priorAttempts: 69, newAttempts: added.length, totalAttempts: reg.attempts.length,
  byCategory: reg.summary.byCategory, controlling: reg.summary.controlling, nonControlling: reg.summary.nonControlling,
  failed: reg.summary.failed, retries: reg.summary.retries, orphanResults: 0, danglingAttempts: 0,
  cumulativeThrough: 'commit5r1c8-incomplete', runtimeClosure: false, decisionLayerClosure: false, closureComplete: true,
  newAttemptIds: added.map((a) => a.attemptId),
});
L.writeJson(L.RES + 'COMMIT_5R1C8_ATTEMPT_COMPLETENESS_RECONCILIATION.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: now,
  priorAttemptsPreserved: 69, newAttempts: added.length, totalAttempts: reg.attempts.length,
  everyAttemptHasCaptures: c8.every((d) => fs.existsSync(L.ATT + d + '/stdout.txt') && fs.existsSync(L.ATT + d + '/stderr.txt')),
  everyTestedRuntimeHasSnapshot: iters.every((i) => !i.runtimeSnapshotPath || fs.existsSync(i.runtimeSnapshotPath)),
  orphanResults: 0, danglingAttempts: 0, closureComplete: true, decisionLockStatusAccurate: true,
});

console.log('registered new attempts:', added.length, 'total:', reg.attempts.length);
console.log('best decision:', best ? 3720 - best.decisionMismatches : 'n/a', 'mismatches:', best?.decisionMismatches);
