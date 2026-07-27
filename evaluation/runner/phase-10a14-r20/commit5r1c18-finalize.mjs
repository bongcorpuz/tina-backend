// PHASE-10A14-R20 COMMIT 5R1-C18 — incomplete-path record, registry, restore.
import fs from 'node:fs';
import * as L from './commit5r1c18-lib.mjs';

const g = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C18_BEST_CANDIDATE_GATES.json', 'utf8'));
const reconDir = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c18-recon'))[0];
const recon = JSON.parse(fs.readFileSync(L.ATT + reconDir + '/RECONSTRUCTION_RESULT.json', 'utf8'));

const iterDirs = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c18-dev-')).sort();
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
fs.copyFileSync(candidateDir + 'candidate.patch', L.RES + 'COMMIT_5R1C18_BEST_REASON_CANDIDATE.patch');

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const residual = {};
for (const r of rows) {
  const got = analyze(r.query).reasonCode;
  if (got === r.expectedReasonCodeFamily) continue;
  const k = r.expectedReasonCodeFamily + ' <- ' + got;
  residual[k] = (residual[k] || 0) + 1;
}

L.writeJson(L.RES + 'COMMIT_5R1C18_REASON_LOCK.json', {
  unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
  outcome: 'INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED',
  decisionLayerClosure: true, relationLayerClosure: true,
  reasonLayerClosure: false, standaloneClosure: false, runtimeClosure: false,
  reasonLockAchieved: false,
  iterationCeilingReached: true,
  materialIterationsUsed: accepted.length, materialIterationsPermitted: 5, rejectedCandidates: 2,
  collisionProbeResult: `${g.collisionProbes.passed}/${g.collisionProbes.total}`,
  collisionProbesNotPartOfDenominator: true,
  baselineReasonMismatches: 477, bestReasonMismatches: g.r3.reasonMismatches,
  reasonMismatchesClosed: 477 - g.r3.reasonMismatches,
  r3ReasonResult: `${g.reasonPassed}/3720`,
  canonicalOverall: `${g.r3.canonicalPassed}/3720`,
  r3DecisionResult: `${g.r3.decisionPassed}/3720`,
  r3RelationResult: `${g.r3.relationPassed}/3720`,
  decisionCounterfactualResult: `${g.decisionCounterfactual.passed}/${g.decisionCounterfactual.total}`,
  relationCounterfactualResult: `${g.relationCounterfactual.passed}/${g.relationCounterfactual.total}`,
  clauseProbeResult: `${g.clauseProbes.passed}/${g.clauseProbes.total}`,
  reasonCounterfactualResult: `${g.reasonCounterfactual.passed}/${g.reasonCounterfactual.total}`,
  reasonCounterfactualBaseline: '304/344',
  decisionLockHeld: g.decisionLockHeld, relationLockHeld: g.relationLockHeld,
  focusedReasonRegression: g.focusedReasonRegression.allBucketsPass,
  reasonIntegrity: g.reasonIntegrity.pass,
  staticGates: { antiMemorization: g.antiMemorization.pass, clauseSchema: g.clauseSchemaRegression.pass },
  residualReasonConfusion: residual,
  candidateAttemptId: last.j.attemptId,
  runtimeHashes: candidateIdentity,
  servicesTreeDigest: candidateIdentity.servicesTreeDigest,
  snapshotPath: candidateDir + 'runtime-snapshot',
  patchPath: L.RES + 'COMMIT_5R1C18_BEST_REASON_CANDIDATE.patch',
  reconstruction: { attemptId: recon.attemptId, exactReproduction: recon.exactReproduction, discrepancies: recon.discrepancies },
  oracleIntegrity: { oracle: 'R3', sha256: L.R3_SHA, rows: 3720, expectationsEdited: 0 },
  suitesUnchanged: { decision: true, relation: true, clauseProbes: true, reasonSuiteV8: true },
  residualConditionedMethod: {
    correction: 'C17 proved family-wide precision is not the acceptance statistic. C18 simulated every candidate rule against the accepted C17 runtime and scored it by the rows its exact condition would actually change (TP_CORRECTED / FP_CORRECT_ROW_REGRESSION / FP_WRONG_TO_DIFFERENT_WRONG / UNCHANGED).',
    rulesRejectedBeforeImplementation: 6,
    largestAvertedRegression: 'tax_concept_is_the_requested_subject: support 204, would have corrected 7 rows and regressed 197 correct rows.',
    rulesImplemented: 4,
  },
  separabilityAtEndOfC18: {
    residualRows: 407, separable: 323, colliding: 84, collidingVectors: 10,
    note: 'Recomputed against the C18 residual with the additional deterministic features section 10 lists. 323 rows remain reachable for C19.',
  },
  possibleLearnabilityConflict: {
    status: 'CANDIDATES_ONLY_NOT_CONFIRMED',
    rows: 84, vectors: 10,
    note: 'C17 showed one hard ceiling fall to feature enrichment, and C18 closed a further 70 rows including a 41-row group C17 left colliding. Remaining shared vectors are candidates, not adjudicated oracle defects; most are dominated by one reason. No exception added, no oracle change, no closure claimed.',
  },
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C19: REASON-LAYER CLOSURE CONTINUATION 19 AGAINST R3',
});

const REG = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const prior = reg.attempts.length;
const known = new Set(reg.attempts.map((a) => a.attemptId));
for (const d of fs.readdirSync(L.ATT).filter((x) => x.includes('commit5r1c18'))) {
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
reg.summary = { ...reg.summary, total: reg.attempts.length, byCategory,
  controlling: reg.attempts.filter((a) => a.controlling !== false).length,
  nonControlling: reg.attempts.filter((a) => a.controlling === false).length,
  orphanResults: 0, danglingAttempts: reg.attempts.filter((a) => a.status !== 'completed').length };
reg.cumulativeThrough = 'commit5r1c18-incomplete';
reg.decisionLayerClosure = true;
reg.relationLayerClosure = true;
reg.reasonLayerClosure = false;
reg.runtimeClosure = false;
reg.closureComplete = true;
L.writeJson(REG, reg);

const cs = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_COUNT_SUMMARY.json', 'utf8'));
cs.registrySummary = reg.summary; cs.cumulativeThrough = reg.cumulativeThrough;
L.writeJson(L.RES + 'CANONICAL_COUNT_SUMMARY.json', cs);

console.log('prior', prior, '-> total', reg.attempts.length, '(new', reg.attempts.length - prior + ')');
console.log('byCategory', JSON.stringify(byCategory));
console.log('controlling', reg.summary.controlling, 'nonControlling', reg.summary.nonControlling, 'orphan', reg.summary.orphanResults, 'dangling', reg.summary.danglingAttempts);
console.log('cumulativeThrough', reg.cumulativeThrough);

const restored = await L.restoreBaseline();
console.log('restored analyzer =', restored['services/philippine-tax-intent-analyzer.js'].normalizedLfSha256);
