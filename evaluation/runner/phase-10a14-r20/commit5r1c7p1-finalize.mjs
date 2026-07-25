// PHASE-10A14-R20 COMMIT 5R1-C7-P1 — CURRENT_STATE proof and self-excluding manifest.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = 'C:/Projects/tina-backend';
const R = 'evaluation/results/phase-10a14-r20/';
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (a) => execSync(`git -C ${REPO} ${a}`, { maxBuffer: 1e9 });
const write = (p, o) =>
  fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');

const CS = 'knowledge/CURRENT_STATE.md';
const csBuf = fs.readFileSync(CS);
const csText = csBuf.toString('utf8');

// placeholder validation
const banned = ['<ACTUAL>', '<TBD>', '<TODO>', '<PLACEHOLDER>'];
const found = banned.filter((b) => csText.includes(b));
if (found.length) throw new Error('PLACEHOLDERS REMAIN: ' + found.join(','));
if (csBuf.toString('binary').includes('\r\n')) throw new Error('CRLF in CURRENT_STATE');
if (csBuf[0] === 0xef) throw new Error('BOM in CURRENT_STATE');

const finalBlob = git(`hash-object ${CS}`).toString().trim();
const roadmapSha = sha256(fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md'));

write(R + 'COMMIT_5R1C7P1_CURRENT_STATE_UPDATE_PROOF.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: new Date().toISOString(),
  path: CS,
  startingBlob: '93a374ee36599c4a077ebc3fad2eaf747c857c1d',
  finalBlob,
  outcome: 'COMPLETE_PREFLIGHT_RECONCILIATION',
  activePhase: 'PHASE-10A14-R20',
  phase10AOpen: true,
  canonicalOracle: 'R3',
  canonicalOracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  c7SemanticExecutionStarted: false,
  runtimeFrozen: false,
  runtimeMutable: true,
  analyzerIdentityClassification: 'CRLF_WORKTREE_NORMALIZATION_ONLY',
  rootResidueRemaining: 0,
  roadmapTracked: true,
  roadmapSha256: roadmapSha,
  nextExactTask: 'PHASE-10A14-R20 — COMMIT 5R1-C7: DECISION-LAYER CLOSURE CONTINUATION 7 AGAINST R3',
  remainingSequenceFirstStep: 'COMMIT 5R1-C7 decision-layer closure (continuation)',
  geminiAvailability: 'not required for this non-semantic preflight reconciliation; no review fabricated',
  substituteChallengeUsed: false,
  encoding: 'utf-8',
  lineEnding: 'LF',
  isFinalSubstantiveFileChange: true,
  placeholdersRemaining: 0,
  unsupportedClaims: 0,
  sourceEvidencePaths: [
    R + 'COMMIT_5R1C7P1_PREFLIGHT_STOP_SOURCE.json',
    R + 'COMMIT_5R1C7P1_REPOSITORY_CONTEXT_AUDIT.json',
    R + 'COMMIT_5R1C7P1_ROADMAP_V7_VALIDATION.json',
    R + 'COMMIT_5R1C7P1_ANALYZER_IDENTITY_RECONCILIATION.json',
    R + 'COMMIT_5R1C7P1_GIT_ATTRIBUTE_AUDIT.json',
    R + 'COMMIT_5R1C7P1_INDEX_FLAG_AUDIT.json',
    R + 'COMMIT_5R1C7P1_RUNTIME_RESTORATION_PROOF.json',
    R + 'COMMIT_5R1C7P1_ROOT_RESIDUE_INVENTORY.json',
    R + 'COMMIT_5R1C7P1_ROOT_RESIDUE_DUPLICATE_MAP.json',
    R + 'COMMIT_5R1C7P1_FINAL_PREFLIGHT_RESULT.json',
    R + 'COMMIT_5R1C7P1_ATTEMPT_COMPLETENESS_RECONCILIATION.json',
    R + 'COMMIT_5R1C7P1_CUMULATIVE_REGISTRY_SNAPSHOT.json',
    R + 'COMMIT_5R1C7P1_SECURITY_AND_SCOPE.md',
  ],
});

write(R + 'COMMIT_5R1C7P1_ROOT_RESIDUE_RECOVERY_RESULT.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: new Date().toISOString(),
  filesInventoried: 4,
  duplicatesRemovedWithProof: 0,
  uniquePreserved: 4,
  sensitiveFindings: 0,
  destinationVerificationMethod: 'SHA-256 of destination compared to source before any removal',
  allDestinationsVerified: true,
  rootResidueRemaining: ['tmp_full.mjs', 'tmp_probe.mjs', 'tmp_r3.mjs', 'tmp_r3fails.json'].filter((f) =>
    fs.existsSync(f)
  ),
  recoveredFilesExecuted: false,
  retroactivelyAssignedToGovernedAttempt: false,
  recoveryDirectory: R + 'commit5r1c7p1-recovered-residue/root-files/',
});

// ---------------------------------------------------------------- manifest
const MANIFEST = R + 'COMMIT_5R1C7P1_EVIDENCE_MANIFEST.sha256';
const PROTECTED = ['.vscode', 'evaluation/factcheck', '.claude', '.git', 'node_modules'];
const targets = [
  'knowledge/CURRENT_STATE.md',
  'knowledge/TINA_Updated_Roadmap_v7.md',
  'services/philippine-tax-intent-analyzer.js',
  'services/philippine-tax-domain-boundary.js',
  'services/philippine-tax-boundary-patterns.js',
  R + 'CANONICAL_ATTEMPT_REGISTRY.json',
  R + 'CANONICAL_COUNT_SUMMARY.json',
];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.posix.join(d, e.name);
    if (PROTECTED.some((x) => p.includes(x))) continue;
    if (e.isDirectory()) walk(p);
    else targets.push(p);
  }
};
walk(R + 'commit5r1c7p1-recovered-residue');
for (const f of fs.readdirSync(R)) {
  if (f.startsWith('COMMIT_5R1C7P1_') && f !== path.basename(MANIFEST)) targets.push(R + f);
}
for (const d of fs.readdirSync(R + 'attempts')) {
  if (d.includes('commit5r1c7p1')) walk(R + 'attempts/' + d);
}
for (const f of fs.readdirSync('evaluation/runner/phase-10a14-r20')) {
  if (f.startsWith('commit5r1c7p1-')) targets.push('evaluation/runner/phase-10a14-r20/' + f);
}

const uniq = [...new Set(targets)].filter((p) => p !== MANIFEST).sort();
const lines = uniq.map((p) => {
  const b = fs.readFileSync(p);
  const norm = Buffer.from(b.toString('binary').replace(/\r\n/g, '\n'), 'binary');
  return `${sha256(b)}  ${sha256(norm)}  ${p}`;
});
fs.writeFileSync(
  MANIFEST,
  '# PHASE-10A14-R20 COMMIT 5R1-C7-P1 EVIDENCE MANIFEST\n' +
    '# columns: worktree-sha256  normalized-lf-sha256  path\n' +
    '# self-excluding; protected paths excluded; prior manifests preserved\n' +
    `# entries: ${lines.length}\n` +
    lines.join('\n') +
    '\n'
);

console.log('finalBlob=' + finalBlob);
console.log('manifest entries=' + lines.length);
console.log('placeholders=0 crlf=0 bom=0');
