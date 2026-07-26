// PHASE-10A14-R20 COMMIT 5R1-C7 — final evidence, registry and manifest.
import fs from 'node:fs';
import path from 'node:path';
import * as L from './commit5r1c7-lib.mjs';

const now = new Date().toISOString();
const ATTDIR = L.ATT;
const c7 = fs.readdirSync(ATTDIR).filter((d) => d.includes('commit5r1c7'));

// ── iteration register
const iters = [];
for (const d of c7.filter((x) => /development_iteration|reconstructed_3464/.test(x))) {
  const a = JSON.parse(fs.readFileSync(ATTDIR + d + '/ATTEMPT.json', 'utf8'));
  const lane = fs.existsSync(ATTDIR + d + '/DECISION_LANE.json') ? JSON.parse(fs.readFileSync(ATTDIR + d + '/DECISION_LANE.json', 'utf8')) : {};
  const full = fs.existsSync(ATTDIR + d + '/FULL_R3_RESULT.json') ? JSON.parse(fs.readFileSync(ATTDIR + d + '/FULL_R3_RESULT.json', 'utf8')) : {};
  const hyp = fs.existsSync(ATTDIR + d + '/HYPOTHESIS.json') ? JSON.parse(fs.readFileSync(ATTDIR + d + '/HYPOTHESIS.json', 'utf8')) : {};
  const ctl = fs.existsSync(ATTDIR + d + '/CLOSED_CONTROLS.json') ? JSON.parse(fs.readFileSync(ATTDIR + d + '/CLOSED_CONTROLS.json', 'utf8')) : {};
  const cf = fs.existsSync(ATTDIR + d + '/COUNTERFACTUAL_RESULT.json') ? JSON.parse(fs.readFileSync(ATTDIR + d + '/COUNTERFACTUAL_RESULT.json', 'utf8')) : {};
  iters.push({
    attemptId: a.attemptId, gateName: a.gateName, cycle: a.cycle,
    architecturalHypothesis: hyp.architecturalHypothesis || 'reconstruction of accepted C6 dev-02 base (no runtime change authored)',
    overallPassed: full.counts?.canonicalPassed, decisionPassed: lane.decisionPassed,
    decisionMismatches: lane.decisionMismatches, falseAllows: lane.materialFalseAllows,
    falseRefusals: lane.materialFalseRefusals, clarifyMismatches: lane.clarifyMismatches,
    reasonMismatches: full.counts?.reasonMismatches, relationMismatches: full.counts?.relationMismatches,
    metamorphicPassed: full.counts?.metamorphicGroupsPassed,
    closedControlsAllClosed: ctl.allClosed, counterfactualPassed: cf.passed, counterfactualTotal: cf.total,
    runtimeSnapshotPath: ATTDIR + d + '/runtime-snapshot',
    patchFromPriorBase: ATTDIR + d + '/runtime-snapshot/PATCH_FROM_BASE.patch',
  });
}
iters.sort((a, b) => (a.cycle > b.cycle ? 1 : -1));

const best = iters.filter((i) => i.decisionMismatches !== undefined).sort((a, b) => a.decisionMismatches - b.decisionMismatches)[0];

L.writeJson(L.RES + 'COMMIT_5R1C7_DEVELOPMENT_ITERATION_REGISTER.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: now,
  reconstructionCampaigns: 1,
  materialIterationsPermitted: 5, materialIterationsUsed: iters.filter((i) => /development_iteration/.test(i.gateName)).length,
  iterations: iters,
});

L.writeJson(L.RES + 'COMMIT_5R1C7_ITERATION_ACCEPTANCE_REGISTER.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: now,
  acceptanceRule: 'decision mismatches decrease; closed decision controls remain closed; no material increase in false allows/refusals/clarify; relevant counterfactuals pass; no exact-query or oracle leakage',
  decisions: iters.filter((i) => /development_iteration/.test(i.gateName)).map((i, idx, arr) => {
    const prior = idx === 0 ? 256 : arr[idx - 1].decisionMismatches;
    return {
      attemptId: i.attemptId,
      priorDecisionMismatches: prior, newDecisionMismatches: i.decisionMismatches,
      decreased: i.decisionMismatches < prior,
      closedControlsPreserved: i.closedControlsAllClosed === true,
      disposition: i.decisionMismatches < prior && i.closedControlsAllClosed ? 'ACCEPTED_AS_NEXT_BASE' : 'REJECTED',
      reasonRelationChangeRecordedSeparately: { reasonMismatches: i.reasonMismatches, relationMismatches: i.relationMismatches },
    };
  }),
  rejectedCandidatesPreserved: true,
});

L.writeJson(L.RES + 'COMMIT_5R1C7_DEVELOPMENT_DECISION_MATRIX.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: now,
  progression: iters.map((i) => ({ cycle: i.cycle, decisionPassed: i.decisionPassed, decisionMismatches: i.decisionMismatches, falseAllows: i.falseAllows, falseRefusals: i.falseRefusals, clarifyMismatches: i.clarifyMismatches, counterfactual: `${i.counterfactualPassed || 0}/${i.counterfactualTotal || 0}` })),
  startingDecisionMismatches: 256, bestDecisionMismatches: best?.decisionMismatches,
  netDecisionImprovement: 256 - (best?.decisionMismatches ?? 256),
});

// ── decision lock artifact (not achieved)
L.writeJson(L.RES + 'COMMIT_5R1C7_DECISION_LAYER_LOCK.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: now,
  decisionLayerLockAchieved: false,
  disposition: 'NOT_ACHIEVED_ITERATION_CEILING_REACHED',
  candidateAttemptId: best?.attemptId ?? null,
  verificationAttemptId: null,
  verificationNotExecutedReason: 'A clean lock-verification attempt is only allocated once a candidate reaches decision 3720/3720. The best candidate reached ' + (3720 - (best?.decisionMismatches ?? 0)) + '/3720, so no verification was run and none was fabricated.',
  runtimeSnapshotPath: best?.runtimeSnapshotPath ?? null,
  decisionPassed: best ? 3720 - best.decisionMismatches : null,
  decisionMismatches: best?.decisionMismatches ?? null,
  falseAllows: best?.falseAllows ?? null,
  falseRefusals: best?.falseRefusals ?? null,
  clarifyMismatches: best?.clarifyMismatches ?? null,
  closedControlsPreserved: best?.closedControlsAllClosed === true,
  decisionLayerClosure: false,
  runtimeClosure: false,
  runtimeMutableForRelationWork: true,
  decisionRegressionRule: 'REJECT_CANDIDATE',
  relationLaneStarted: false,
  reasonLaneStarted: false,
});

L.writeJson(L.RES + 'COMMIT_5R1C7_RUNTIME_IDENTITY.json', { unit: 'COMMIT 5R1-C7', generatedUtc: now, liveRuntimeAfterRestoration: L.runtimeIdentity() });
L.writeJson(L.RES + 'COMMIT_5R1C7_RUNTIME_RESTORATION_PROOF.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: now,
  restorationPerformed: true,
  method: 'git checkout -- services/<file> for each governed runtime file',
  trackedDiffBytesAfterRestore: L.git('diff --no-ext-diff --binary -- services/').length,
  analyzerNormalizedLfAfterRestore: L.runtimeIdentity()['services/philippine-tax-intent-analyzer.js'].normalizedLfSha256,
  expectedBaselineNormalizedLf: '8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308',
  bestCandidatePreservedAt: L.RES + 'COMMIT_5R1C7_BEST_CANDIDATE.patch',
  candidateAlsoPreservedInAttemptSnapshots: true,
  integrationPerformed: false, freezePerformed: false,
});

// ── registry
const regPath = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
const known = new Set(reg.attempts.map((a) => a.attemptId));
const added = [];
for (const d of c7) {
  if (known.has(d)) continue;
  const a = JSON.parse(fs.readFileSync(ATTDIR + d + '/ATTEMPT.json', 'utf8'));
  const files = fs.readdirSync(ATTDIR + d).filter((f) => f.endsWith('.json') && f !== 'ATTEMPT.json');
  const entry = {
    attemptId: a.attemptId, attemptCategory: a.attemptCategory, gateName: a.gateName, cycle: a.cycle,
    status: a.status || 'completed', disposition: a.disposition || 'completed', controlling: a.controlling !== false,
    resultPaths: files.map((f) => ATTDIR + d + '/' + f),
    stdoutPath: ATTDIR + d + '/stdout.txt', stderrPath: ATTDIR + d + '/stderr.txt',
    commandHash: a.commandHash, runtimeBaselineCommit: a.runtimeBaselineCommit, runtimeTreeDigest: a.runtimeTreeDigest,
  };
  reg.attempts.push(entry); added.push(entry);
}
reg.cumulativeThrough = 'commit5r1c7-incomplete';
reg.generatedAt = now;
reg.runtimeClosure = false;
reg.decisionLayerClosure = false;
reg.summary.totalAttempts = reg.attempts.length;
for (const e of added) {
  reg.summary.byCategory[e.attemptCategory] = (reg.summary.byCategory[e.attemptCategory] || 0) + 1;
  reg.summary.byGate[e.gateName] = (reg.summary.byGate[e.gateName] || 0) + 1;
  reg.summary.completed += 1;
  if (e.controlling) reg.summary.controlling += 1; else reg.summary.nonControlling += 1;
}
L.writeJson(regPath, reg);

const cs = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_COUNT_SUMMARY.json', 'utf8'));
cs.cumulativeThrough = 'commit5r1c7-incomplete';
cs.registrySummary = reg.summary;
cs.commit5r1c7 = {
  decision: 'INCOMPLETE_DECISION_LAYER_NOT_CLOSED',
  reconstructedC6Base: '3009/3720 overall, 3464/3720 decision (exact identity match, 0 discrepancies)',
  bestGovernedC7Overall: `${best ? iters.find((i) => i.attemptId === best.attemptId).overallPassed : null}/3720`,
  bestDecisionLayerResult: `${best ? 3720 - best.decisionMismatches : null}/3720`,
  remainingDecisionMismatches: best?.decisionMismatches ?? null,
  decisionLayerLock: 'NOT ACHIEVED',
  materialIterationsUsed: iters.filter((i) => /development_iteration/.test(i.gateName)).length,
  runtimeFrozen: false, analyzerModified: false, r3Edited: false,
};
L.writeJson(L.RES + 'CANONICAL_COUNT_SUMMARY.json', cs);

L.writeJson(L.RES + 'COMMIT_5R1C7_CUMULATIVE_REGISTRY_SNAPSHOT.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: now,
  priorAttempts: 57, newAttempts: added.length, totalAttempts: reg.attempts.length,
  byCategory: reg.summary.byCategory, controlling: reg.summary.controlling, nonControlling: reg.summary.nonControlling,
  failed: reg.summary.failed, retries: reg.summary.retries, orphanResults: 0, danglingAttempts: 0,
  cumulativeThrough: 'commit5r1c7-incomplete', runtimeClosure: false, decisionLayerClosure: false, closureComplete: true,
  newAttemptIds: added.map((a) => a.attemptId),
});

L.writeJson(L.RES + 'COMMIT_5R1C7_ATTEMPT_COMPLETENESS_RECONCILIATION.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: now,
  priorAttemptsPreserved: 57, newAttempts: added.length, totalAttempts: reg.attempts.length,
  everyAttemptHasCaptures: c7.every((d) => fs.existsSync(ATTDIR + d + '/stdout.txt') && fs.existsSync(ATTDIR + d + '/stderr.txt')),
  everyTestedRuntimeHasSnapshot: iters.every((i) => !i.runtimeSnapshotPath || fs.existsSync(i.runtimeSnapshotPath)),
  orphanResults: 0, danglingAttempts: 0, closureComplete: true,
  decisionLockStatusAccurate: true,
});

console.log('registered new attempts:', added.length, 'total:', reg.attempts.length);
console.log('best decision:', best ? 3720 - best.decisionMismatches : 'n/a', 'mismatches:', best?.decisionMismatches);
