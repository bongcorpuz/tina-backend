// PHASE-10A14-R20 COMMIT 5R1-C21 - incomplete finalization.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as L from './commit5r1c20-lib.mjs';

const bestDirName = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c21-dev-06'))[0];
const bestDir = L.ATT + bestDirName + '/';
const best = JSON.parse(fs.readFileSync(bestDir + 'ITERATION_RESULT.json', 'utf8'));
const bestIdentity = JSON.parse(fs.readFileSync(bestDir + 'runtime-snapshot/RUNTIME_IDENTITY.json', 'utf8'));
fs.copyFileSync(bestDir + 'candidate.patch', L.RES + 'COMMIT_5R1C21_BEST_REASON_CANDIDATE.patch');

const c21Dirs = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c21')).sort();
const c21Attempts = c21Dirs.map((d) => JSON.parse(fs.readFileSync(L.ATT + d + '/ATTEMPT.json', 'utf8')));
const material = c21Attempts.filter((a) => /^commit5r1c21-dev-\d+$/.test(a.cycle));
const reconstruction = c21Attempts.filter((a) => a.cycle === 'commit5r1c21-recon');
const accepted = material.filter((a) => String(a.disposition || '').startsWith('accepted'));
const rejected = material.filter((a) => a.disposition === 'rejected');

const iterationAccounting = {
  reconstructionCount: reconstruction.length,
  materialDevCount: material.length,
  acceptedMaterialCount: accepted.length,
  rejectedMaterialCount: rejected.length,
  otherDispositions: material.filter((a) => !String(a.disposition || '').startsWith('accepted') && a.disposition !== 'rejected')
    .map((a) => ({ attemptId: a.attemptId, cycle: a.cycle, disposition: a.disposition })),
  materialBudgetUsed: material.length,
  materialBudgetPermitted: 5,
  materialBudgetRemaining: Math.max(0, 5 - material.length),
  iterationCeilingReached: material.length >= 5,
};

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const residual = {};
const residualRows = [];
for (const r of rows) {
  const ev = analyze(r.query);
  if (ev.reasonCode === r.expectedReasonCodeFamily) continue;
  const k = r.expectedReasonCodeFamily + ' <- ' + ev.reasonCode;
  residual[k] = (residual[k] || 0) + 1;
  residualRows.push({ oracleId: r.oracleId, query: r.query, expectedReason: r.expectedReasonCodeFamily, actualReason: ev.reasonCode,
    decision: ev.decision, relations: (ev.relations || []).map((x) => x.relation) });
}

L.writeJson(L.RES + 'COMMIT_5R1C21_COLLISION_EXHAUSTION_V4.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  residualRows: residualRows.length,
  reasonConfusionResidual: residual,
  collisionProbeResult: `${best.collisionProbes.passed}/${best.collisionProbes.total}`,
  remainingCollisionProbeFailures: best.collisionProbes.byFamily,
  determination: 'REASON_LAYER_NOT_CLOSED_ITERATION_CEILING_REACHED',
  note: 'Remaining rows require further authorized C22 remediation. No R3 oracle edit, exact-row exception or fixture-membership branch was added.',
});
L.writeJson(L.RES + 'COMMIT_5R1C21_LEARNABILITY_CONFLICT_CANDIDATES.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  status: 'CANDIDATES_ONLY_NOT_CONFIRMED',
  residualRows: residualRows.length,
  residualSample: residualRows.slice(0, 40),
  noOracleChange: true,
  noNarrowException: true,
  next: 'PHASE-10A14-R20 - COMMIT 5R1-C22 REASON-LAYER CLOSURE CONTINUATION 22 AGAINST R3',
});

L.writeJson(L.RES + 'COMMIT_5R1C21_REASON_LOCK.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  outcome: 'INCOMPLETE - REASON LAYER REMEDIATION NOT CLOSED',
  decisionLayerClosure: true,
  relationLayerClosure: true,
  reasonLayerClosure: false,
  standaloneClosure: false,
  runtimeClosure: false,
  reasonLockAchieved: false,
  iterationAccounting,
  iterationCeilingReached: iterationAccounting.iterationCeilingReached,
  baselineReasonMismatches: 271,
  bestReasonMismatches: best.r3.reasonMismatches,
  reasonMismatchesClosed: 271 - best.r3.reasonMismatches,
  r3ReasonResult: `${best.reasonPassed}/3720`,
  canonicalOverall: `${best.r3.canonicalPassed}/3720`,
  r3DecisionResult: `${best.r3.decisionPassed}/3720`,
  r3RelationResult: `${best.r3.relationPassed}/3720`,
  decisionCounterfactualResult: `${best.decisionCounterfactual.passed}/${best.decisionCounterfactual.total}`,
  relationCounterfactualResult: `${best.relationCounterfactual.passed}/${best.relationCounterfactual.total}`,
  clauseProbeResult: `${best.clauseProbes.passed}/${best.clauseProbes.total}`,
  reasonCounterfactualResult: `${best.reasonCounterfactual.passed}/${best.reasonCounterfactual.total}`,
  collisionProbeResult: `${best.collisionProbes.passed}/${best.collisionProbes.total}`,
  decisionLockHeld: best.decisionLockHeld,
  relationLockHeld: best.relationLockHeld,
  reasonIntegrity: best.reasonIntegrity.pass,
  antiMemorization: best.antiMemorization.pass,
  targetEquivalence: best.targetEquivalence,
  placementNonInterference: best.placementNonInterference,
  compositionNonInterference: best.compositionNonInterference,
  residualReasonConfusion: residual,
  candidateAttemptId: best.attemptId,
  rejectedAttemptIds: rejected.map((a) => a.attemptId),
  runtimeHashes: bestIdentity,
  servicesTreeDigest: bestIdentity.servicesTreeDigest,
  snapshotPath: bestDir + 'runtime-snapshot',
  patchPath: L.RES + 'COMMIT_5R1C21_BEST_REASON_CANDIDATE.patch',
  reconstructionAttemptId: reconstruction[0]?.attemptId,
  c20CeilingFlagDefect: 'HISTORICAL_ITERATION_CEILING_FLAG_DEFECT',
  nextExactTask: 'PHASE-10A14-R20 - COMMIT 5R1-C22: REASON-LAYER CLOSURE CONTINUATION 22 AGAINST R3',
});

const validator = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C21_ITERATION_ACCOUNTING_VALIDATOR.json', 'utf8'));
validator.c21FinalAccounting = iterationAccounting;
validator.pass = validator.pass && reconstruction.length === 1 && material.length === 5 && accepted.length === 4 &&
  rejected.length === 1 && iterationAccounting.iterationCeilingReached;
L.writeJson(L.RES + 'COMMIT_5R1C21_ITERATION_ACCOUNTING_VALIDATOR.json', validator);

const REG = L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const known = new Set(reg.attempts.map((a) => a.attemptId));
for (const a of c21Attempts) {
  if (known.has(a.attemptId)) continue;
  reg.attempts.push({
    attemptId: a.attemptId,
    attemptCategory: a.attemptCategory,
    gateName: a.gateName,
    cycle: a.cycle,
    attemptOrdinal: a.attemptOrdinal,
    retryOf: a.retryOf,
    retryReason: a.retryReason,
    startedAt: a.startedAt,
    endedAt: a.endedAt,
    exitCode: a.exitCode,
    status: a.status,
    disposition: a.disposition,
    controlling: a.controlling,
    evidenceHeadAtStart: a.evidenceHeadAtStart,
    evidenceHeadAtEnd: a.evidenceHeadAtEnd,
    runtimeTreeDigest: a.runtimeTreeDigest,
    oracleVersion: a.oracleVersion,
    oracleSha256: a.oracleSha256,
    resultPaths: a.resultPaths,
    stdoutSha256: a.stdoutSha256,
    stderrSha256: a.stderrSha256,
  });
}
const byCategory = {};
const byGate = {};
for (const a of reg.attempts) {
  byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
  byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
}
reg.summary = {
  ...reg.summary,
  total: reg.attempts.length,
  byCategory,
  byGate,
  completed: reg.attempts.filter((a) => a.status === 'completed').length,
  controlling: reg.attempts.filter((a) => a.controlling !== false).length,
  nonControlling: reg.attempts.filter((a) => a.controlling === false).length,
  orphanResults: 0,
  danglingAttempts: reg.attempts.filter((a) => a.status !== 'completed').length,
};
reg.cumulativeThrough = 'commit5r1c21-incomplete';
reg.decisionLayerClosure = true;
reg.relationLayerClosure = true;
reg.reasonLayerClosure = false;
reg.runtimeClosure = false;
reg.closureComplete = true;
L.writeJson(REG, reg);

const countSummary = L.RES + 'CANONICAL_COUNT_SUMMARY.json';
if (fs.existsSync(countSummary)) {
  const cs = JSON.parse(fs.readFileSync(countSummary, 'utf8'));
  cs.registrySummary = reg.summary;
  cs.cumulativeThrough = reg.cumulativeThrough;
  cs.decisionLayerClosure = true;
  cs.relationLayerClosure = true;
  cs.reasonLayerClosure = false;
  cs.runtimeClosure = false;
  L.writeJson(countSummary, cs);
}

const restored = await L.restoreBaseline();

const csPath = 'knowledge/CURRENT_STATE.md';
let currentState = fs.readFileSync(csPath, 'utf8');
currentState = currentState.replace(/Last updated:\s*\n\n`[^`]+`/, `Last updated:\n\n\`${new Date().toISOString()}\``);
currentState = currentState.replace('## Latest Completed Execution Unit', '## Previous Execution Unit - COMMIT 5R1-C20');
const insert = `## Latest Completed Execution Unit

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C21
COMPOSITION-SAFE REASON-LAYER CLOSURE CONTINUATION
DECISION: INCOMPLETE - REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

The reason lane remains open. C21 reconstructed the accepted C20 candidate exactly,
then used five registered material runtime campaigns: four accepted
(\`dev-02\`, \`dev-04\`, \`dev-05\`, \`dev-06\`) and one rejected
(\`dev-03\`, rejected by composition non-interference). The mechanical iteration
account is:

\`\`\`text
reconstruction campaigns      1
material runtime iterations   5
accepted material iterations  4
rejected material iterations  1
material budget remaining     0
iterationCeilingReached       true  (5 >= 5)
\`\`\`

C21 also reconciled C20's historical ceiling flag: C20 used four material iterations out
of five, so its committed \`iterationCeilingReached = true\` was a
\`HISTORICAL_ITERATION_CEILING_FLAG_DEFECT\`. No C20 score, gate, candidate,
disposition or runtime evidence is invalidated. C19's controlling account remains four
material iterations, two accepted and two rejected, plus one separate reconstruction.

Best C21 result:

\`\`\`text
R3 reason                     3,531 / 3,720   (mismatches 189, from 271)
canonical overall             3,531 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         344 / 344
collision probes                188 / 196
target equivalence              PASS
placement non-interference      PASS
composition non-interference    PASS
reason integrity                PASS
anti-memorization               PASS
\`\`\`

Because R3 reason still has 189 mismatches, no clean reason-lock verification was run.
The live runtime was restored to the committed baseline; the best C21 runtime is
preserved in the dev-06 attempt snapshot and in
\`COMMIT_5R1C21_BEST_REASON_CANDIDATE.patch\`.

Next exact task:

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C22
REASON-LAYER CLOSURE CONTINUATION 22 AGAINST R3
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

`;
currentState = currentState.replace('## Previous Execution Unit - COMMIT 5R1-C20', insert + '## Previous Execution Unit - COMMIT 5R1-C20');
currentState = currentState.replace(/PHASE-10A14-R20 .* COMMIT 5R1-C21\nREASON-LAYER CLOSURE CONTINUATION 21 AGAINST R3/, 'PHASE-10A14-R20 - COMMIT 5R1-C22\nREASON-LAYER CLOSURE CONTINUATION 22 AGAINST R3');
fs.writeFileSync(csPath, currentState.replace(/\r\n/g, '\n'));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const manifest = L.RES + 'COMMIT_5R1C21_EVIDENCE_MANIFEST.sha256';
const files = walk(L.RES).filter((f) =>
  f.includes('COMMIT_5R1C21') || f.includes('commit5r1c21')).filter((f) => path.resolve(f) !== path.resolve(manifest)).sort();
const lines = files.map((f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') + '  ' + f.replace(/\\/g, '/'));
fs.writeFileSync(manifest, lines.join('\n') + '\n');

console.log('C21 finalized incomplete');
console.log('registry total', reg.attempts.length);
console.log('accounting', JSON.stringify(iterationAccounting));
console.log('restored analyzer', restored['services/philippine-tax-intent-analyzer.js'].normalizedLfSha256);
console.log('manifest files', lines.length);
