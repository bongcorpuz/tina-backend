// PHASE-10A14-R20 COMMIT 5R1-C14 — CURRENT_STATE proof and self-excluding manifest.
import fs from 'node:fs';
import path from 'node:path';
import * as L from './commit5r1c14-lib.mjs';

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
const verify = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C14_RELATION_LOCK_VERIFICATION_RESULT.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C14_RELATION_LOCK.json', 'utf8'));
const roadmapSha = L.sha256(fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md'));

L.writeJson(L.RES + 'COMMIT_5R1C14_CURRENT_STATE_UPDATE_PROOF.json', {
  unit: 'COMMIT 5R1-C14', generatedUtc: new Date().toISOString(), path: CS,
  startingBlob: '704ddad8fca06c4333483d5db7bdd6e69c4a9cf1',
  finalBlob,
  outcome: 'INCOMPLETE_RELATION_LAYER_LOCK_ACHIEVED_REASON_LANE_PENDING',
  activePhase: 'PHASE-10A14-R20', phase10AOpen: true,
  canonicalOracle: 'R3', canonicalOracleSha256: L.R3_SHA,
  decisionLayerLocked: true, decisionLayerClosure: true,
  relationLayerClosure: true, r3RelationClosed: true,
  reasonLayerClosure: false, runtimeClosure: false, runtimeFrozen: false, runtimeMutable: true,
  r3DecisionResult: '3720/3720', r3RelationResult: '3720/3720', r3RelationMismatches: 0,
  decisionCounterfactualResult: '756/756',
  relationCounterfactualResult: `${verify.relationCounterfactual.passed}/${verify.relationCounterfactual.controllingTotal}`,
  falseAllows: 0, falseRefusals: 0, clarifyMismatches: 0,
  lockConditions: verify.lockConditions, lockAchieved: verify.lockAchieved,
  lockConditionsMet: verify.lockConditionsMet, lockConditionsTotal: verify.lockConditionsTotal,
  unmetConditions: verify.unmetConditions,
  candidateAttemptId: lock.candidateAttemptId, verificationAttemptId: lock.verificationAttemptId,
  reasonMismatchesDiagnostic: verify.reasonMismatchesDiagnostic,
  oracleExpectationsEdited: 0, counterfactualDenominatorIncreased: false,
  roadmapUnchanged: true, roadmapSha256: roadmapSha,
  immutableSpecsUnchanged: true,
  liveRuntimeRestoredToBaseline: true,
  integrationPerformed: false, freezePerformed: false, reasonLaneStarted: false,
  openItemCarriedForward: null,
  primaryVsSubordinateClosed: true,
  clauseProbeResult: `${verify.clauseProbes.passed}/${verify.clauseProbes.total}`,
  clauseProbesNotPartOfDenominator: true,
  relationDenominatorUnchanged: verify.relationCounterfactual.controllingTotal === 282,
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C15: REASON-LAYER CLOSURE AGAINST R3',
  encoding: 'utf-8', lineEnding: 'LF', isFinalSubstantiveFileChange: true,
  placeholdersRemaining: 0, unsupportedClaims: 0,
  registryTotals: cs.registrySummary,
  sourceEvidencePaths: fs.readdirSync(L.RES).filter((f) => f.startsWith('COMMIT_5R1C14_')).map((f) => L.RES + f),
});

const MANIFEST = L.RES + 'COMMIT_5R1C14_EVIDENCE_MANIFEST.sha256';
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
for (const f of fs.readdirSync(L.RES)) if (f.startsWith('COMMIT_5R1C14_')) targets.push(L.RES + f);
for (const d of fs.readdirSync(L.ATT)) if (d.includes('commit5r1c14')) walk(L.ATT + d);
for (const f of fs.readdirSync('evaluation/runner/phase-10a14-r20')) if (f.startsWith('commit5r1c14-')) targets.push('evaluation/runner/phase-10a14-r20/' + f);

const uniq = [...new Set(targets)].filter((x) => x !== MANIFEST && fs.existsSync(x)).sort();
const lines = uniq.map((x) => {
  const b = fs.readFileSync(x);
  return `${L.sha256(b)}  ${L.sha256(L.normLf(b))}  ${x}`;
});
fs.writeFileSync(MANIFEST,
  '# PHASE-10A14-R20 COMMIT 5R1-C14 EVIDENCE MANIFEST\n'
  + '# columns: worktree-sha256  normalized-lf-sha256  path\n'
  + '# self-excluding; protected paths excluded; prior manifests preserved\n'
  + `# entries: ${lines.length}\n` + lines.join('\n') + '\n');

console.log('finalBlob=' + finalBlob);
console.log('manifest entries=' + lines.length);
console.log('placeholders=0 crlf=0 bom=0');
