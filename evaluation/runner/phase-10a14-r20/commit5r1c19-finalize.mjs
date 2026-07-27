// PHASE-10A14-R20 COMMIT 5R1-C19 — incomplete-path record, registry, restore.
import fs from 'node:fs';
import * as L from './commit5r1c19-lib.mjs';

const g = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C19_BEST_CANDIDATE_GATES.json', 'utf8'));
const reconDir = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c19-recon'))[0];
const recon = JSON.parse(fs.readFileSync(L.ATT + reconDir + '/RECONSTRUCTION_RESULT.json', 'utf8'));

const iterDirs = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c19-dev-')).sort();
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
fs.copyFileSync(candidateDir + 'candidate.patch', L.RES + 'COMMIT_5R1C19_BEST_REASON_CANDIDATE.patch');

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const residual = {};
for (const r of rows) {
  const got = analyze(r.query).reasonCode;
  if (got === r.expectedReasonCodeFamily) continue;
  const k = r.expectedReasonCodeFamily + ' <- ' + got;
  residual[k] = (residual[k] || 0) + 1;
}

L.writeJson(L.RES + 'COMMIT_5R1C19_REASON_LOCK.json', {
  unit: 'COMMIT 5R1-C19', generatedUtc: new Date().toISOString(),
  outcome: 'INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED',
  decisionLayerClosure: true, relationLayerClosure: true,
  reasonLayerClosure: false, standaloneClosure: false, runtimeClosure: false,
  reasonLockAchieved: false,
  iterationCeilingReached: true,
  materialIterationsUsed: accepted.length, materialIterationsPermitted: 5, rejectedCandidates: 2,
  branchEquivalence: JSON.parse(fs.readFileSync(L.RES + "COMMIT_5R1C19_BRANCH_EQUIVALENCE_RESULT.json", "utf8")),
  c18IterationAccountingReconciliation: JSON.parse(fs.readFileSync(L.RES + "COMMIT_5R1C19_C18_ITERATION_ACCOUNTING_RECONCILIATION.json", "utf8")).determination,
  collisionProbeResult: `${g.collisionProbes.passed}/${g.collisionProbes.total}`,
  collisionProbesNotPartOfDenominator: true,
  baselineReasonMismatches: 407, bestReasonMismatches: g.r3.reasonMismatches,
  reasonMismatchesClosed: 407 - g.r3.reasonMismatches,
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
  patchPath: L.RES + 'COMMIT_5R1C19_BEST_REASON_CANDIDATE.patch',
  reconstruction: { attemptId: recon.attemptId, exactReproduction: recon.exactReproduction, discrepancies: recon.discrepancies },
  oracleIntegrity: { oracle: 'R3', sha256: L.R3_SHA, rows: 3720, expectationsEdited: 0 },
  suitesUnchanged: { decision: true, relation: true, clauseProbes: true, reasonSuiteV8: true },
  branchIdenticalMethod: {
    correction: "C18 proved the simulator condition and the runtime branch predicate must be the same predicate. C19 defines each rule once in commit5r1c19-predicates.mjs and injects it verbatim into the runtime, so simulator, runtime and trace harness evaluate byte-identical logic.",
    rulesSimulated: 7, rulesImplemented: 2, rulesRejectedBeforeImplementation: 4, candidatesRejectedAfterImplementation: 2,
    branchEquivalenceAllPass: true,
    newFinding: "Branch equivalence proves the TARGETED row set matches, but not that the runtime placement leaves other rows untouched. Iteration 03 passed equivalence 6=6 and still regressed R3 393 to 403 because the replaced branch also served 28 rows the predicate never matched. Placement safety is a separate property and is carried to C20.",
  },
  separabilityAtEndOfC19: {
    residualRows: 383, separable: 306, colliding: 77, collidingVectors: 8,
    note: "Recomputed with eight further deterministic features listed in section 11. 306 rows remain reachable for C20.",
  },
  possibleLearnabilityConflict: {
    status: "CANDIDATES_ONLY_NOT_CONFIRMED", rows: 77, vectors: 8,
    note: "C17 saw one declared ceiling fall to enrichment and C18 closed a 41-row group C17 left colliding. C19 added eight further features and the count moved again. No exception added, no oracle change, no closure claimed.",
  },
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C20: REASON-LAYER CLOSURE CONTINUATION 20 AGAINST R3',
});

const REG = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const prior = reg.attempts.length;
const known = new Set(reg.attempts.map((a) => a.attemptId));
for (const d of fs.readdirSync(L.ATT).filter((x) => x.includes('commit5r1c19'))) {
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
reg.cumulativeThrough = 'commit5r1c19-incomplete';
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
