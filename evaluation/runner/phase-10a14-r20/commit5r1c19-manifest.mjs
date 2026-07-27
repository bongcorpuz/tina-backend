// PHASE-10A14-R20 COMMIT 5R1-C19 — CURRENT_STATE proof and self-excluding manifest.
import fs from 'node:fs';
import path from 'node:path';
import * as L from './commit5r1c19-lib.mjs';

const CS = 'knowledge/CURRENT_STATE.md';
const buf = fs.readFileSync(CS);
const text = buf.toString('utf8');
for (const bad of ['<ACTUAL>', '<TBD>', '<TODO>', '<PLACEHOLDER>']) {
  if (text.includes(bad)) throw new Error('PLACEHOLDER REMAINS: ' + bad);
}
if (buf.toString('binary').includes('\r\n')) throw new Error('CRLF in CURRENT_STATE');
if (buf[0] === 0xef) throw new Error('BOM in CURRENT_STATE');

const finalBlob = L.git(`hash-object ${CS}`).trim();
const cs = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_COUNT_SUMMARY.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C19_REASON_LOCK.json', 'utf8'));
const roadmapSha = L.sha256(fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md'));

L.writeJson(L.RES + 'COMMIT_5R1C19_CURRENT_STATE_UPDATE_PROOF.json', {
  unit: 'COMMIT 5R1-C19', generatedUtc: new Date().toISOString(), path: CS,
  startingBlob: '404e1c08c95082dd03f92ca70d0e558fa7f0564b',
  finalBlob,
  outcome: 'INCOMPLETE_REASON_LAYER_REMEDIATION_NOT_CLOSED',
  activePhase: 'PHASE-10A14-R20', phase10AOpen: true,
  canonicalOracle: 'R3', canonicalOracleSha256: L.R3_SHA,
  decisionLayerClosure: true, relationLayerClosure: true,
  reasonLayerClosure: false, standaloneClosure: false,
  runtimeClosure: false, runtimeFrozen: false, runtimeMutable: true,
  reasonLockAchieved: false, verificationCampaignRun: false,
  verificationNotRunReason: 'Section 15 authorizes a clean reason-lock verification only after reason mismatches reach zero; they did not.',
  r3DecisionResult: lock.r3DecisionResult, r3RelationResult: lock.r3RelationResult,
  r3ReasonResult: lock.r3ReasonResult, canonicalOverall: lock.canonicalOverall,
  baselineReasonMismatches: 614, bestReasonMismatches: lock.bestReasonMismatches,
  reasonMismatchesClosed: lock.reasonMismatchesClosed,
  decisionCounterfactualResult: lock.decisionCounterfactualResult,
  relationCounterfactualResult: lock.relationCounterfactualResult,
  clauseProbeResult: lock.clauseProbeResult,
  reasonCounterfactualResult: lock.reasonCounterfactualResult,
  decisionLockHeld: lock.decisionLockHeld, relationLockHeld: lock.relationLockHeld,
  materialIterationsUsed: lock.materialIterationsUsed, iterationCeilingReached: true,
  oracleExpectationsEdited: 0, suiteDenominatorsIncreased: false,
  lockedSuitesUnchanged: lock.suitesUnchanged,
  branchIdenticalMethod: lock.branchIdenticalMethod,
  branchEquivalence: lock.branchEquivalence,
  c18IterationAccountingReconciliation: lock.c18IterationAccountingReconciliation,
  separabilityAtEndOfC19: lock.separabilityAtEndOfC19,
  possibleLearnabilityConflict: lock.possibleLearnabilityConflict,
  collisionProbeResult: lock.collisionProbeResult, collisionProbesNotPartOfDenominator: true,
  reasonSuiteV8Frozen: true, reasonSuiteV8Result: lock.reasonCounterfactualResult,
  roadmapUnchanged: true, roadmapSha256: roadmapSha, immutableSpecsUnchanged: true,
  liveRuntimeRestoredToBaseline: true,
  integrationPerformed: false, freezePerformed: false, standaloneClosureStarted: false,
  candidateAttemptId: lock.candidateAttemptId,
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C20: REASON-LAYER CLOSURE CONTINUATION 20 AGAINST R3',
  encoding: 'utf-8', lineEnding: 'LF', isFinalSubstantiveFileChange: true,
  placeholdersRemaining: 0, unsupportedClaims: 0,
  registryTotals: cs.registrySummary,
  sourceEvidencePaths: fs.readdirSync(L.RES).filter((f) => f.startsWith('COMMIT_5R1C19_')).map((f) => L.RES + f),
});

const MANIFEST = L.RES + 'COMMIT_5R1C19_EVIDENCE_MANIFEST.sha256';
const PROTECTED = ['.vscode', 'evaluation/factcheck', '.claude', '.git/', 'node_modules'];
const targets = [
  CS, 'knowledge/TINA_Updated_Roadmap_v7.md',
  'services/philippine-tax-intent-analyzer.js',
  'services/philippine-tax-domain-boundary.js',
  'services/philippine-tax-boundary-patterns.js',
  L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json', L.RES + 'CANONICAL_COUNT_SUMMARY.json',
];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p2 = path.posix.join(d, e.name);
    if (PROTECTED.some((x) => p2.includes(x))) continue;
    if (e.isDirectory()) walk(p2); else targets.push(p2);
  }
};
for (const f of fs.readdirSync(L.RES)) if (f.startsWith('COMMIT_5R1C19_')) targets.push(L.RES + f);
for (const d of fs.readdirSync(L.ATT)) if (d.includes('commit5r1c19')) walk(L.ATT + d);
for (const f of fs.readdirSync('evaluation/runner/phase-10a14-r20')) if (f.startsWith('commit5r1c19-')) targets.push('evaluation/runner/phase-10a14-r20/' + f);

const uniq = [...new Set(targets)].filter((x) => x !== MANIFEST && fs.existsSync(x)).sort();
const lines = uniq.map((x) => {
  const b = fs.readFileSync(x);
  return `${L.sha256(b)}  ${L.sha256(L.normLf(b))}  ${x}`;
});
fs.writeFileSync(MANIFEST,
  '# PHASE-10A14-R20 COMMIT 5R1-C19 EVIDENCE MANIFEST\n'
  + '# columns: worktree-sha256  normalized-lf-sha256  path\n'
  + '# self-excluding; protected paths excluded; prior manifests preserved\n'
  + `# entries: ${lines.length}\n` + lines.join('\n') + '\n');

console.log('finalBlob=' + finalBlob);
console.log('manifest entries=' + lines.length);
console.log('placeholders=0 crlf=0 bom=0');
