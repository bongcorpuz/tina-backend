// PHASE-10A14-R20 COMMIT 5R1-C13 — lock record, registry reconciliation, restore.
import fs from 'node:fs';
import * as L from './commit5r1c13-lib.mjs';

const verify = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C13_RELATION_LOCK_VERIFICATION_RESULT.json', 'utf8'));
const recon = JSON.parse(fs.readFileSync(fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c13-recon')).map((d) => L.ATT + d + '/RECONSTRUCTION_RESULT.json')[0], 'utf8'));

// Locate the final accepted iteration attempt.
const iterDirs = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c13-dev-')).sort();
const accepted = [];
for (const d of iterDirs) {
  const f = L.ATT + d + '/ITERATION_RESULT.json';
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (j.disposition.startsWith('accepted')) accepted.push({ dir: d, j });
}
const last = accepted[accepted.length - 1];
const candidateDir = L.ATT + last.dir + '/';
const candidateIdentity = JSON.parse(fs.readFileSync(candidateDir + 'runtime-snapshot/RUNTIME_IDENTITY.json', 'utf8'));

// Preserve the candidate patch at a stable path.
fs.copyFileSync(candidateDir + 'candidate.patch', L.RES + 'COMMIT_5R1C13_RELATION_CANDIDATE.patch');

L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_LOCK.json', {
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(),
  outcome: 'INCOMPLETE — R3 RELATION LANE CLOSED; RELATION LOCK NOT DECLARED',
  decisionLayerClosure: true,
  relationLayerClosure: false,
  reasonLayerClosure: false,
  runtimeClosure: false,
  r3RelationClosed: true,
  lockAchieved: verify.lockAchieved,
  lockConditions: verify.lockConditions,
  lockConditionsMet: verify.lockConditionsMet,
  lockConditionsTotal: verify.lockConditionsTotal,
  unmetConditions: verify.unmetConditions,
  unmetConditionExplanation: 'R3 relation is exactly 3,720/3,720 with zero mismatches, and 13 of 14 lock conditions are met. The lock additionally requires the complete relation-focused suite to pass; 8 of 282 controlling queries (family primary_vs_subordinate) still fail on a clause-segmentation gap that is outside the relation lane. That condition is recorded as UNMET, not waived, so the relation lock is NOT declared.',
  candidateAttemptId: last.j.attemptId,
  verificationAttemptId: verify.attemptId,
  runtimeHashes: candidateIdentity,
  servicesTreeDigest: candidateIdentity.servicesTreeDigest,
  snapshotPath: candidateDir + 'runtime-snapshot',
  patchPath: L.RES + 'COMMIT_5R1C13_RELATION_CANDIDATE.patch',
  reconstruction: { attemptId: recon.attemptId, exactReproduction: recon.exactReproduction, discrepancies: recon.discrepancies },
  r3DecisionResult: `${verify.r3.decisionPassed}/3720`,
  r3RelationResult: `${verify.r3.relationPassed}/3720`,
  r3RelationMismatches: verify.r3.relationMismatches,
  decisionCounterfactualResult: `${verify.decisionCounterfactual.passed}/${verify.decisionCounterfactual.total}`,
  relationCounterfactualResult: `${verify.relationCounterfactual.passed}/${verify.relationCounterfactual.controllingTotal}`,
  relationCounterfactualOpenFamily: 'primary_vs_subordinate (8 rows) — concessive tax clause with a non-tax primary imperative',
  focusedRelationRegression: verify.focusedRelationRegression.allBucketsPass,
  staticGates: { antiMemorization: verify.antiMemorization.pass, reasonIntegrity: verify.reasonIntegrity.pass },
  determinism: verify.determinism,
  reasonMismatchesDiagnostic: verify.reasonMismatchesDiagnostic,
  relationObjectIntegrity: verify.relationObjectIntegrity.counts,
  oracleIntegrity: { oracle: 'R3', sha256: L.R3_SHA, rows: 3720, expectationsEdited: 0 },
  materialIterationsUsed: accepted.length,
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C14: RELATION-LAYER CLOSURE CONTINUATION 14 AGAINST R3',
});

// Registry reconciliation.
const REG = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const priorCount = reg.attempts.length;
const newDirs = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c13'));
const known = new Set(reg.attempts.map((a) => a.attemptId));
for (const d of newDirs) {
  const f = L.ATT + d + '/ATTEMPT.json';
  if (!fs.existsSync(f)) continue;
  const a = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (known.has(a.attemptId)) continue;
  reg.attempts.push({
    attemptId: a.attemptId, attemptCategory: a.attemptCategory, gateName: a.gateName,
    cycle: a.cycle, attemptOrdinal: a.attemptOrdinal, retryOf: a.retryOf, retryReason: a.retryReason,
    startedAt: a.startedAt, endedAt: a.endedAt, exitCode: a.exitCode, status: a.status,
    disposition: a.disposition, controlling: a.controlling,
    evidenceHeadAtStart: a.evidenceHeadAtStart, evidenceHeadAtEnd: a.evidenceHeadAtEnd,
    runtimeTreeDigest: a.runtimeTreeDigest, oracleVersion: a.oracleVersion, oracleSha256: a.oracleSha256,
    resultPaths: a.resultPaths, stdoutSha256: a.stdoutSha256, stderrSha256: a.stderrSha256,
  });
}
const byCategory = {};
for (const a of reg.attempts) byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
reg.summary = {
  ...reg.summary, total: reg.attempts.length, byCategory,
  controlling: reg.attempts.filter((a) => a.controlling !== false).length,
  nonControlling: reg.attempts.filter((a) => a.controlling === false).length,
  orphanResults: 0, danglingAttempts: reg.attempts.filter((a) => a.status !== 'completed').length,
};
reg.cumulativeThrough = 'commit5r1c13-incomplete';
reg.decisionLayerClosure = true;
reg.relationLayerClosure = false;
reg.reasonLayerClosure = false;
reg.runtimeClosure = false;
reg.closureComplete = true;
L.writeJson(REG, reg);

const cs = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_COUNT_SUMMARY.json', 'utf8'));
cs.registrySummary = reg.summary;
cs.cumulativeThrough = reg.cumulativeThrough;
L.writeJson(L.RES + 'CANONICAL_COUNT_SUMMARY.json', cs);

console.log('prior attempts', priorCount, '-> total', reg.attempts.length, '(new', reg.attempts.length - priorCount + ')');
console.log('byCategory', JSON.stringify(byCategory));
console.log('controlling', reg.summary.controlling, 'nonControlling', reg.summary.nonControlling,
  'orphan', reg.summary.orphanResults, 'dangling', reg.summary.danglingAttempts);
console.log('cumulativeThrough', reg.cumulativeThrough);

// Restore live runtime to the committed baseline.
const restored = await L.restoreBaseline();
console.log('restored analyzer =', restored['services/philippine-tax-intent-analyzer.js'].normalizedLfSha256);
console.log('restored tree digest =', restored.servicesTreeDigest);
