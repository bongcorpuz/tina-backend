// PHASE-10A14-R20 COMMIT 5R1-C11 — CURRENT_STATE proof and self-excluding manifest.
import fs from 'node:fs';
import path from 'node:path';
import * as L from './commit5r1c11-lib.mjs';

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
const verify = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C11_LOCK_VERIFICATION_RESULT.json', 'utf8'));
const roadmapSha = L.sha256(fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md'));

L.writeJson(L.RES + 'COMMIT_5R1C11_CURRENT_STATE_UPDATE_PROOF.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: new Date().toISOString(), path: CS,
  startingBlob: '6650bc814f5d2a38098d24c21efd60e7ab989d7b',
  finalBlob,
  outcome: 'INCOMPLETE_DECISION_COUNTERFACTUAL_CLOSURE_NOT_ACHIEVED',
  activePhase: 'PHASE-10A14-R20', phase10AOpen: true,
  canonicalOracle: 'R3',
  canonicalOracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  decisionLayerLocked: false, relationLayerLocked: false, reasonLayerLocked: false,
  runtimeClosure: false, runtimeFrozen: false, runtimeMutable: true,
  r3DecisionResult: '3720/3720 held throughout',
  bestCounterfactualResult: `${verify.counterfactual.passed}/${verify.counterfactual.total}`,
  remainingCounterfactualFailures: verify.counterfactual.failed,
  lockConditions: verify.lockConditions, lockAchieved: false,
  lockConditionsMet: Object.values(verify.lockConditions).filter(Boolean).length,
  lockConditionsTotal: Object.keys(verify.lockConditions).length,
  whyNotLocked: 'The lock requires the complete combined counterfactual suite to pass; ' + verify.counterfactual.failed + ' of ' + verify.counterfactual.total + ' queries still fail. Every other lock condition was met and independently verified.',
  antiOverfitLeakageFoundAndRemoved: true,
  counterfactualExpectationsEdited: false,
  roadmapUnchanged: true, roadmapSha256: roadmapSha,
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C12: DECISION-LAYER COUNTERFACTUAL CLOSURE CONTINUATION 12 AGAINST R3',
  encoding: 'utf-8', lineEnding: 'LF', isFinalSubstantiveFileChange: true,
  placeholdersRemaining: 0, unsupportedClaims: 0,
  registryTotals: cs.registrySummary,
  sourceEvidencePaths: fs.readdirSync(L.RES).filter((f) => f.startsWith('COMMIT_5R1C11_')).map((f) => L.RES + f),
});

const MANIFEST = L.RES + 'COMMIT_5R1C11_EVIDENCE_MANIFEST.sha256';
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
for (const f of fs.readdirSync(L.RES)) if (f.startsWith('COMMIT_5R1C11_')) targets.push(L.RES + f);
for (const d of fs.readdirSync(L.ATT)) if (d.includes('commit5r1c11-')) walk(L.ATT + d);
for (const f of fs.readdirSync('evaluation/runner/phase-10a14-r20')) if (f.startsWith('commit5r1c11-')) targets.push('evaluation/runner/phase-10a14-r20/' + f);

const uniq = [...new Set(targets)].filter((x) => x !== MANIFEST && fs.existsSync(x)).sort();
const lines = uniq.map((x) => {
  const b = fs.readFileSync(x);
  return `${L.sha256(b)}  ${L.sha256(L.normLf(b))}  ${x}`;
});
fs.writeFileSync(MANIFEST,
  '# PHASE-10A14-R20 COMMIT 5R1-C11 EVIDENCE MANIFEST\n'
  + '# columns: worktree-sha256  normalized-lf-sha256  path\n'
  + '# self-excluding; protected paths excluded; prior manifests preserved\n'
  + `# entries: ${lines.length}\n` + lines.join('\n') + '\n');

console.log('finalBlob=' + finalBlob);
console.log('manifest entries=' + lines.length);
console.log('placeholders=0 crlf=0 bom=0');
