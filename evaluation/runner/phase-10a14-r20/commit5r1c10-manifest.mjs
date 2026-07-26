// PHASE-10A14-R20 COMMIT 5R1-C10 — CURRENT_STATE proof and self-excluding manifest.
import fs from 'node:fs';
import path from 'node:path';
import * as L from './commit5r1c10-lib.mjs';

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
const verify = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C10_LOCK_VERIFICATION_RESULT.json', 'utf8'));
const roadmapSha = L.sha256(fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md'));

L.writeJson(L.RES + 'COMMIT_5R1C10_CURRENT_STATE_UPDATE_PROOF.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: new Date().toISOString(), path: CS,
  startingBlob: '8970cefc0c3a796e1dab62346a9aae39b867e8ba',
  finalBlob,
  outcome: 'INCOMPLETE_DECISION_LAYER_REMEDIATION_NOT_CLOSED',
  activePhase: 'PHASE-10A14-R20', phase10AOpen: true,
  canonicalOracle: 'R3',
  canonicalOracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  decisionLayerLocked: false, relationLayerLocked: false, reasonLayerLocked: false,
  runtimeClosure: false, runtimeFrozen: false, runtimeMutable: true,
  reconstructedBase: '3706/3720 decision, 3097/3720 overall (0 discrepancies)',
  bestDecisionScore: '3720/3720', bestOverallScore: '3097/3720',
  remainingDecisionMismatches: 0,
  falseAllows: 0, falseRefusals: 0, clarifyMismatches: 0,
  r3ExactCeilingReached: true,
  lockVerificationExecuted: true,
  lockVerificationAttemptId: verify.verificationAttemptId,
  lockConditions: verify.lockConditions,
  lockAchieved: false,
  whyNotLocked: 'The lock requires the complete combined decision counterfactual suite to pass; 58 of 756 queries still fail. Every other lock condition was met and independently verified.',
  counterfactualCombined: `${verify.counterfactual.passed}/${verify.counterfactual.total}`,
  materialIterationsUsed: 5,
  roadmapUnchanged: true, roadmapSha256: roadmapSha,
  roadmapHistoricalFiguresStale: true,
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C11: DECISION-LAYER CLOSURE CONTINUATION 11 AGAINST R3',
  remainingSequenceFirstStep: 'COMMIT 5R1-C11 decision-layer closure (continuation)',
  encoding: 'utf-8', lineEnding: 'LF', isFinalSubstantiveFileChange: true,
  placeholdersRemaining: 0, unsupportedClaims: 0,
  registryTotals: cs.registrySummary,
  sourceEvidencePaths: fs.readdirSync(L.RES).filter((f) => f.startsWith('COMMIT_5R1C10_')).map((f) => L.RES + f),
});

const MANIFEST = L.RES + 'COMMIT_5R1C10_EVIDENCE_MANIFEST.sha256';
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
    const p = path.posix.join(d, e.name);
    if (PROTECTED.some((x) => p.includes(x))) continue;
    if (e.isDirectory()) walk(p); else targets.push(p);
  }
};
for (const f of fs.readdirSync(L.RES)) if (f.startsWith('COMMIT_5R1C10_')) targets.push(L.RES + f);
for (const d of fs.readdirSync(L.ATT)) if (d.includes('commit5r1c10-')) walk(L.ATT + d);
for (const f of fs.readdirSync('evaluation/runner/phase-10a14-r20')) if (f.startsWith('commit5r1c10-')) targets.push('evaluation/runner/phase-10a14-r20/' + f);

const uniq = [...new Set(targets)].filter((p) => p !== MANIFEST && fs.existsSync(p)).sort();
const lines = uniq.map((p) => {
  const b = fs.readFileSync(p);
  return `${L.sha256(b)}  ${L.sha256(L.normLf(b))}  ${p}`;
});
fs.writeFileSync(MANIFEST,
  '# PHASE-10A14-R20 COMMIT 5R1-C10 EVIDENCE MANIFEST\n'
  + '# columns: worktree-sha256  normalized-lf-sha256  path\n'
  + '# self-excluding; protected paths excluded; prior manifests preserved\n'
  + `# entries: ${lines.length}\n` + lines.join('\n') + '\n');

console.log('finalBlob=' + finalBlob);
console.log('manifest entries=' + lines.length);
console.log('placeholders=0 crlf=0 bom=0');
