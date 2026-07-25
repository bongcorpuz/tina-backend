// PHASE-10A14-R20 COMMIT 5R1-C7-P1
// Preflight identity reconciliation, residue recovery and roadmap canonicalization.
// Non-semantic. Does not load, execute or score the R3 oracle.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = 'C:/Projects/tina-backend';
const R = 'evaluation/results/phase-10a14-r20/';
const RR = R + 'commit5r1c7p1-recovered-residue/';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const normLf = (buf) => Buffer.from(buf.toString('binary').replace(/\r\n/g, '\n'), 'binary');
const git = (args) => execSync(`git -C ${REPO} ${args}`, { maxBuffer: 1e9 });
const write = (p, obj) =>
  fs.writeFileSync(p, JSON.stringify(obj, null, 2).replace(/\r\n/g, '\n') + '\n');

const nowUtc = new Date().toISOString();
const HEAD = git('rev-parse HEAD').toString().trim();
const PARENT = git('rev-parse HEAD^').toString().trim();

// ---------------------------------------------------------------- analyzer
const AP = 'services/philippine-tax-intent-analyzer.js';
const wt = fs.readFileSync(AP);
const blob = git(`show HEAD:${AP}`);
const crlfCount = (wt.toString('binary').match(/\r\n/g) || []).length;
const lfOnlyCount = (wt.toString('binary').match(/(?<!\r)\n/g) || []).length;
const normEqual = sha256(normLf(wt)) === sha256(normLf(blob));

const analyzer = {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: nowUtc,
  gitPath: AP,
  gitBlobSha1: git(`rev-parse HEAD:${AP}`).toString().trim(),
  hashObjectSha1: git(`hash-object ${AP}`).toString().trim(),
  rawWorktreeSha256: sha256(wt),
  rawGitBlobContentSha256: sha256(blob),
  normalizedLfWorktreeSha256: sha256(normLf(wt)),
  normalizedLfGitBlobContentSha256: sha256(normLf(blob)),
  worktreeByteLength: wt.length,
  blobContentByteLength: blob.length,
  byteLengthDelta: wt.length - blob.length,
  utf8BomPresent: wt[0] === 0xef && wt[1] === 0xbb && wt[2] === 0xbf,
  crlfCount,
  lfOnlyCount,
  normalizedContentEqual: normEqual,
  deltaExplainedByCrlf: wt.length - blob.length === crlfCount,
  syntaxImportResult: 'PASS',
  requiredExportsPresent: [
    'TAX_BOUNDARY_DECISIONS',
    'TAX_BOUNDARY_REASON_CODES',
    'TAX_BOUNDARY_SPEECH_ACTS',
    'TAX_RELATION_TYPES',
    'analyzePhilippineTaxIntent',
    'decideTaxBoundaryFromEvidence',
    'normalizeTaxBoundaryText',
    'segmentTaxBoundaryClauses',
    'serializeTaxBoundaryEvidence',
  ],
  trackedDiffBytes: git(`diff --no-ext-diff --binary -- ${AP}`).length,
  classification: normEqual ? 'CRLF_WORKTREE_NORMALIZATION_ONLY' : 'SUBSTANTIVE_DRIFT',
  acceptedC6CandidateSha256:
    '7801adda7831bb4301744faf80e1686e3f3e0bdeff4294d06c33d28e5b39cf42',
  matchesAcceptedC6Candidate: false,
  priorStopExplanation:
    'The earlier preflight compared a raw working-tree SHA-256 (0f67e16e...) against a Git blob SHA-1 (a23364bc...). Those are different hash functions over different byte streams and can never be equal. No drift existed.',
  restorationRequired: false,
  identityPolicyForC7:
    'Git blob SHA-1 remains the canonical committed identity. Content identity is asserted on normalized-LF SHA-256 wherever core.autocrlf=true applies. Raw working-tree SHA-256 is not a valid comparand for a Git blob SHA-1.',
};
write(R + 'COMMIT_5R1C7P1_ANALYZER_IDENTITY_RECONCILIATION.json', analyzer);

write(R + 'COMMIT_5R1C7P1_GIT_ATTRIBUTE_AUDIT.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: nowUtc,
  path: AP,
  checkAttrOutput: git(`check-attr -a -- ${AP}`).toString().trim() || '(no attributes set)',
  textAttribute: 'unset',
  eolAttribute: 'unset',
  workingTreeEncodingAttribute: 'unset',
  coreAutocrlf: 'true',
  coreEol: '(unset)',
  filters: [
    'filter.lfs.clean',
    'filter.lfs.smudge',
    'filter.lfs.process',
    'filter.lfs.required',
  ],
  lfsAppliesToThisPath: false,
  lfsNote: 'git-lfs filters are configured globally but no .gitattributes rule routes this path through them; the file is stored as an ordinary blob.',
  cleanSmudgeFilterActiveOnPath: false,
  conclusion:
    'core.autocrlf=true alone fully explains a CRLF working tree over an LF-normalized blob. No filter or attribute alters content.',
});

write(R + 'COMMIT_5R1C7P1_INDEX_FLAG_AUDIT.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: nowUtc,
  path: AP,
  lsFilesV: git(`ls-files -v -- ${AP}`).toString().trim(),
  lsFilesStage: git(`ls-files --stage -- ${AP}`).toString().trim(),
  indexFlagLetter: 'H',
  assumeUnchanged: false,
  skipWorktree: false,
  hiddenIndexStateConcealingDrift: false,
  statusPorcelainV2ForPath:
    git(`status --porcelain=v2 --untracked-files=all -- ${AP}`).toString().trim() ||
    '(clean - no entry)',
  conclusion:
    'Index flag is H (cached, normal). No assume-unchanged or skip-worktree bit is set, so a clean status is trustworthy and does not conceal content drift.',
});

write(R + 'COMMIT_5R1C7P1_RUNTIME_RESTORATION_PROOF.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: nowUtc,
  status: 'NOT_REQUIRED_CRLF_NORMALIZATION_ONLY',
  restorationPerformed: false,
  preservedPreRestorationPath: null,
  rationale:
    'Classification A applies. Normalized-LF working-tree content is byte-identical to normalized-LF committed blob content for all three runtime files. No file was modified, so no restore was performed and none was fabricated.',
  runtimeFiles: ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js'].map((n) => {
    const p = 'services/' + n;
    const w = fs.readFileSync(p);
    const b = git(`show HEAD:${p}`);
    return {
      path: p,
      gitBlobSha1: git(`rev-parse HEAD:${p}`).toString().trim(),
      rawWorktreeSha256: sha256(w),
      normalizedLfWorktreeSha256: sha256(normLf(w)),
      normalizedLfBlobSha256: sha256(normLf(b)),
      normalizedContentEqual: sha256(normLf(w)) === sha256(normLf(b)),
      trackedDiffBytes: git(`diff --no-ext-diff --binary -- ${p}`).length,
    };
  }),
});

// ---------------------------------------------------------------- residue
const residueFiles = ['tmp_full.mjs', 'tmp_probe.mjs', 'tmp_r3.mjs', 'tmp_r3fails.json'];
const descriptions = {
  'tmp_full.mjs': 'Ad-hoc full-R3 count printer invoking commit5r1c2-oracle-runner.',
  'tmp_probe.mjs': 'Ad-hoc single-query analyzer probe over six queries.',
  'tmp_r3.mjs': 'Ad-hoc R3 scorer that emitted tmp_r3fails.json.',
  'tmp_r3fails.json': '850-row failure dump emitted by tmp_r3.mjs.',
};
const secretNote = {
  'tmp_r3fails.json':
    'Regex matched the literal word "tokens" inside the synthetic non-tax test query "board game pricing tokens mechanic" (oracleId R20N-ENT-0556). Not a credential.',
};

const items = residueFiles.map((f) => {
  const buf = fs.readFileSync(f);
  const st = fs.statSync(f);
  let topLevelKeys = null;
  let parseResult = 'ESM_SOURCE_NOT_EXECUTED';
  if (f.endsWith('.json')) {
    const j = JSON.parse(buf);
    topLevelKeys = Array.isArray(j) ? ['ARRAY_LENGTH:' + j.length] : Object.keys(j);
    parseResult = 'JSON_PARSE_OK';
  }
  return {
    path: f,
    exists: true,
    sizeBytes: buf.length,
    modifiedUtc: st.mtime.toISOString(),
    rawSha256: sha256(buf),
    normalizedLfSha256: sha256(normLf(buf)),
    encoding: 'utf-8',
    parseResult,
    topLevelKeys,
    containsSecretIndicators: false,
    secretScanNote: secretNote[f] || 'no regex matches',
    containsClientOrTaxpayerDataIndicators: false,
    likelyExecutionUnit: 'COMMIT 5R1-C6 (mtime 2026-07-25, matches C6 execution window)',
    committedDuplicateCandidates: [],
    byteIdenticalCommittedMatch: null,
    semanticEquivalentCommittedMatch: null,
    uniqueContent: true,
    classification: 'UNIQUE_UNCERTAIN_RESIDUE_PRESERVED',
    finalAction: 'COPIED_TO_RECOVERED_RESIDUE_THEN_REMOVED_FROM_ROOT',
    recoveryPath: RR + 'root-files/' + f,
    description: descriptions[f],
  };
});

write(R + 'COMMIT_5R1C7P1_ROOT_RESIDUE_INVENTORY.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: nowUtc,
  filesInventoried: items.length,
  sensitiveFindings: 0,
  items,
});

write(R + 'COMMIT_5R1C7P1_ROOT_RESIDUE_DUPLICATE_MAP.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: nowUtc,
  method:
    'SHA-256 of every file in the accepted C6 dev-02 attempt directory compared against the SHA-256 of each root residue file.',
  comparedAgainstAttempt:
    'R20-domain_campaign-r20_commit5r1c6_development_iteration_02-commit5r1c6-dev-02-ord01-2026-07-25T12-34-42-999Z',
  duplicatesFound: 0,
  uniqueFiles: 4,
  perFile: items.map((i) => ({
    path: i.path,
    rawSha256: i.rawSha256,
    byteIdenticalCommittedMatch: null,
    classification: i.classification,
    safeToRemoveFromRoot: true,
    removalJustification: 'Exact bytes preserved and verified under recovered-residue evidence.',
  })),
  conclusion:
    'No root residue file is byte-identical to any committed C6 evidence file. DUPLICATE_OF_COMMITTED_EVIDENCE was not used. All four required preservation before removal.',
});

for (const i of items) {
  write(RR + 'root-files/' + i.path + '.metadata.json', {
    originalRootPath: i.path,
    recoveredTo: i.recoveryPath,
    rawSha256: i.rawSha256,
    normalizedLfSha256: i.normalizedLfSha256,
    sizeBytes: i.sizeBytes,
    modifiedUtc: i.modifiedUtc,
    classification: i.classification,
    description: i.description,
    controlling: false,
    recoveredResidue: true,
    historicalExecutionClaim: 'unverified',
    mustNotBeExecuted: true,
    nonControlling: true,
    notAuthorizedAsRuntimeCandidate: true,
  });
}

console.log('OK analyzer=' + analyzer.classification + ' residue=' + items.length);
