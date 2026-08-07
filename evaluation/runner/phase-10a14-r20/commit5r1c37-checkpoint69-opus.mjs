// PHASE-10A14-R20 COMMIT 5R1-C37
// Checkpoint-69 manifest-indexed, read-only, exact-once Opus transport.
// This driver never mutates runtime, oracle, fixtures, registry, WAL, or Git.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const CLI = 'C:/Users/USER/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe';
const SESSION = 'C:/Users/USER/.codex/sessions/2026/08/01/rollout-2026-08-01T21-34-27-019fbd88-8065-7011-99a0-f59a6588d4d4.jsonl';
const VALIDATION_ROOT = 'C:/tmp/c37-manifest-indexed-checkpoint69-validation';
const INVOCATION_ROOT = 'C:/tmp/c37-manifest-indexed-checkpoint69-invocation';
const EMPTY_MCP = '{"mcpServers":{}}\n';
const MODEL = 'claude-opus-4-8';
const CLI_VERSION = '2.1.212 (Claude Code)';

const EXPECTED = Object.freeze({
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  parent: 'd5b25e676f623fbc1888608ff250824fcd34af99',
  branch: 'feature/source-availability-engine-v1',
  checkpoint: 'bc2201dbfb8d8f7a5938939090069d89ead4d9743461c5d20e42ee6b7f93a607',
  checkpointEvent: '326b0ab78de8b53ab9c3814b24fbd550d6f27502ed6f4f01b1da128d12745997',
  checkpointReplay: '870c0295c5c898fcdbeb9b9e07f86e8ec4f253e9eff20e2fd99c3bc5c5daa10f',
  checkpointEvidence: '07e329f8ec4eebc8588a8cda4e016a5018c3f74f458f32a4e8c2f3d1062c88a5',
  handoff: 'e3a2b72ed4167886a2c99e757fcb41f6b536325f3c2fc8e343a09d6887e8cb3d',
  prompt: 'ca192be195a35cedbaefb6e208a051e788d10a163137091e303d60da6f6f75f4',
  authorization: '5261030505f27dbd9a1450b16d75876aa2141cf741bd83957ed50e8746bf5d44',
  sourceManifest: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  detailedManifest: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0',
  packageAggregate: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',
  packageEntries: 57,
  packageBytes: 4109852,
  roleLedger: '34cd2c404033581643540ba98ebe67266487a049d8aeec216841854937e0d860',
  allowlist: '069a873a90f5d339bd7c37b41e96b7fb07c1b2bb0fecfdc3b1b5d1ce5523469e',
  capsule: '7f223fe8386fcb23d1f2ecec4254ca44ee753fb2479fefb9c1d897ee767cf30f',
  capsuleBytes: 437230,
  capsuleMarkdown: '02e154c75e6aaa6863fdd55e99723741cd353e036694e04c71f22271267b0af6',
  coverage: 'c96fc58d459118dcc84a6492feb439e16e4677d8c34962e4450db3824e464799',
  tokenEstimate: '95d71733a98f249c5841c78de17112b78dc2fe1854fea7c5191dc02fc2be988c',
  capsuleTokens: 188684,
  protectedAggregate: '980cd3b5f2a5b75104bc91c9e6f4391e80bf5f0d772f48b61c79497e3d2ebd0a',
  c35Composite: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
  c34ReasonRuntime: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  cliBytes: 255334560,
  cliSha256: 'fe639693fd7e9a881c799867711abb7666dec2a5fefbaba41af6a09e71bcbefa',
  emptyMcpBytes: 18,
  emptyMcpSha256: 'e93fc8db2b1bd77107fe6c758bca9545fa864cf7cce8ab93a7b2b93a1d566a7b',
  effectiveWindow: 258400,
  configuredWindow: 272000,
  requiredRemaining: 120000,
  reserve: 54400,
});

const R = (name) => path.join(RESULTS, name);
const F = Object.freeze({
  prompt: 'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C37-FOUR-HOUR-MANIFEST-INDEXED-OPUS-REVIEW-AND-FINALIZATION-FROM-CHECKPOINT-69.md',
  checkpoint: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_69_manifest_indexed_capsule_complete_token_reserve_safe_pause_pre_invocation.json'),
  checkpointPointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  checkpointLog: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  checkpointReplay: R('COMMIT_5R1C37_CHECKPOINT_69_IDEMPOTENCE_REPLAY.json'),
  checkpointEvidence: R('COMMIT_5R1C37_CHECKPOINT_69_CAPSULE_COMPLETE_TOKEN_SAFE_PAUSE_EVIDENCE.sha256'),
  handoff: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_69.md'),
  authorization: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_EXTERNAL_AUTHORIZATION.json'),
  sourceManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  detailedManifest: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  roleLedger: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ROLE_LEDGER.json'),
  allowlist: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ALLOWLIST.json'),
  capsule: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.json'),
  capsuleMarkdown: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.md'),
  coverage: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_COVERAGE_VALIDATION.json'),
  tokenEstimate: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE_TOKEN_ESTIMATE.json'),
  protectedBaseline: R('COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
  priorProtected: R('COMMIT_5R1C37_CHECKPOINT_68_PROTECTED_RESIDUE_VERIFICATION.json'),
  continuation: R('COMMIT_5R1C37_CHECKPOINT_69_CONTINUATION_PREFLIGHT.json'),
  protected: R('COMMIT_5R1C37_CHECKPOINT_69_PROTECTED_RESIDUE_VERIFICATION.json'),
  capsuleContinuity: R('COMMIT_5R1C37_CHECKPOINT_69_CAPSULE_CONTINUITY_VERIFICATION.json'),
  authContinuity: R('COMMIT_5R1C37_CHECKPOINT_69_AUTHORIZATION_CONTINUITY.json'),
  toolPlan: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_PLAN.json'),
  toolValidation: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_VALIDATION.json'),
  bootstrapJson: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_BOOTSTRAP.json'),
  bootstrapMd: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_BOOTSTRAP.md'),
  contextProjection: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_CONTEXT_PROJECTION.json'),
  transportPreflight: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_TRANSPORT_PREFLIGHT.json'),
  finalPreflight: R('COMMIT_5R1C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json'),
  marker: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json'),
  capture: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_CLI_CAPTURE.json'),
  stdout: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_STDOUT.txt'),
  stderr: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_STDERR.txt'),
  reviewJson: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW.json'),
  reviewMd: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW.md'),
  receipt: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_TRANSMISSION_RECEIPT.json'),
  reviewCoverage: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW_COVERAGE.json'),
  driver: fileURLToPath(import.meta.url),
});

const PREP_OUTPUTS = [F.continuation, F.protected, F.capsuleContinuity, F.authContinuity,
  F.toolPlan, F.toolValidation, F.bootstrapJson, F.bootstrapMd, F.contextProjection, F.transportPreflight];
const INVOCATION_OUTPUTS = [F.finalPreflight, F.marker, F.capture, F.stdout, F.stderr,
  F.reviewJson, F.reviewMd, F.receipt, F.reviewCoverage];

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const now = () => new Date().toISOString();
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const git = (...args) => execFileSync('git.exe', args, {
  cwd: REPO, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, windowsHide: true,
}).trim();

function fileRecord(file) {
  const data = fs.readFileSync(file);
  return { path: rel(file), bytes: data.length, sha256: sha(data) };
}

function writeNew(file, data) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const fd = fs.openSync(file, 'wx');
  try {
    let offset = 0;
    while (offset < payload.length) offset += fs.writeSync(fd, payload, offset, payload.length - offset);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return fileRecord(file);
}

function writePrepared(file, data) {
  if (!fs.existsSync(file)) return writeNew(file, data);
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  if (path.extname(file).toLowerCase() === '.md') assert(fs.readFileSync(file).equals(payload), `PARTIAL_PREP_MARKDOWN_MISMATCH:${rel(file)}`);
  else assert(readJson(file).pass === true, `PARTIAL_PREP_JSON_INVALID:${rel(file)}`);
  return fileRecord(file);
}

function parseShaManifest(file, expectedCount) {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `MANIFEST_PARSE_${rel(file)}_${index + 1}`);
    return { ordinal: index + 1, sha256: match[1], path: match[2].replaceAll('\\', '/') };
  });
  assert(rows.length === expectedCount, `MANIFEST_COUNT_${rel(file)}`);
  return rows;
}

function validateShaManifest(file, expectedCount) {
  const rows = parseShaManifest(file, expectedCount);
  const checked = rows.map((row) => {
    const target = path.resolve(REPO, ...row.path.split('/'));
    const present = fs.existsSync(target);
    return { ordinal: row.ordinal, path: row.path, present, match: present && shaFile(target) === row.sha256 };
  });
  return { record: fileRecord(file), entries: rows.length, present: checked.filter((x) => x.present).length,
    matches: checked.filter((x) => x.match).length, bad: checked.filter((x) => !x.present || !x.match), pass: checked.every((x) => x.match) };
}

function validatePackage() {
  assert(shaFile(F.sourceManifest) === EXPECTED.sourceManifest, 'SOURCE_MANIFEST_HASH');
  assert(shaFile(F.detailedManifest) === EXPECTED.detailedManifest, 'DETAILED_MANIFEST_HASH');
  const rows = parseShaManifest(F.sourceManifest, EXPECTED.packageEntries);
  const detailed = readJson(F.detailedManifest);
  const seen = new Set();
  let rawBytes = 0;
  for (const row of rows) {
    const normalized = path.posix.normalize(row.path);
    assert(normalized === row.path && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized), `PATH_NORMALIZATION_${row.ordinal}`);
    assert(!seen.has(row.path), `DUPLICATE_PATH_${row.ordinal}`);
    seen.add(row.path);
    const target = path.resolve(REPO, ...row.path.split('/'));
    assert(target.toLowerCase().startsWith(`${REPO.toLowerCase()}${path.sep}`), `PATH_ESCAPE_${row.ordinal}`);
    const stat = fs.lstatSync(target);
    assert(stat.isFile() && !stat.isSymbolicLink(), `NONREGULAR_${row.ordinal}`);
    assert(fs.realpathSync(target).toLowerCase().startsWith(`${fs.realpathSync(REPO).toLowerCase()}${path.sep}`), `REALPATH_ESCAPE_${row.ordinal}`);
    const data = fs.readFileSync(target);
    assert(sha(data) === row.sha256, `SOURCE_HASH_${row.ordinal}`);
    assert(Buffer.from(data.toString('utf8'), 'utf8').equals(data) && !data.includes(0), `SOURCE_UTF8_${row.ordinal}`);
    rawBytes += data.length;
    const d = detailed.entries[row.ordinal - 1];
    assert(d.ordinal === row.ordinal && d.repositoryRelativePath.replaceAll('\\', '/') === row.path
      && d.bytes === data.length && d.sha256 === row.sha256 && d.transmissionAuthorized === true, `DETAILED_ROW_${row.ordinal}`);
  }
  const framing = rows.map((row) => {
    const target = path.resolve(REPO, ...row.path.split('/'));
    return `${row.ordinal}\0${row.path}\0${fs.statSync(target).size}\0${row.sha256}\n`;
  }).join('');
  const aggregate = sha(Buffer.from(framing, 'utf8'));
  assert(rawBytes === EXPECTED.packageBytes && aggregate === EXPECTED.packageAggregate, 'PACKAGE_TOTAL_OR_AGGREGATE');
  assert(detailed.entryCount === 57 && detailed.entries.length === 57 && detailed.pass === true, 'DETAILED_MANIFEST_FIELDS');
  return { rows, rawBytes, aggregate, detailed };
}

function validateCapsule(pkg) {
  assert(fs.statSync(F.capsule).size === EXPECTED.capsuleBytes && shaFile(F.capsule) === EXPECTED.capsule, 'CAPSULE_IDENTITY');
  const capsule = readJson(F.capsule);
  const role = readJson(F.roleLedger);
  const allow = readJson(F.allowlist);
  const coverage = readJson(F.coverage);
  const estimate = readJson(F.tokenEstimate);
  assert(shaFile(F.roleLedger) === EXPECTED.roleLedger && shaFile(F.allowlist) === EXPECTED.allowlist, 'LEDGER_ALLOWLIST_HASH');
  assert(shaFile(F.coverage) === EXPECTED.coverage && shaFile(F.tokenEstimate) === EXPECTED.tokenEstimate, 'COVERAGE_TOKEN_HASH');
  assert(shaFile(F.capsuleMarkdown) === EXPECTED.capsuleMarkdown, 'CAPSULE_MARKDOWN_HASH');
  assert(capsule.pass === true && capsule.entries.length === 57 && role.pass === true && role.entries.length === 57
    && allow.pass === true && allow.entries.length === 57, 'CAPSULE_COLLECTIONS');
  for (let index = 0; index < 57; index += 1) {
    const source = pkg.rows[index];
    const c = capsule.entries[index];
    const r = role.entries[index];
    const a = allow.entries[index];
    for (const x of [c, r, a]) assert(x.ordinal === source.ordinal && x.repositoryRelativePath.replaceAll('\\', '/') === source.path
      && x.bytes === fs.statSync(path.resolve(REPO, ...source.path.split('/'))).size && x.sha256 === source.sha256, `CAPSULE_CROSSWALK_${index + 1}`);
    assert(a.allowed === true && a.readOnly === true && r.onDemandReadAllowlist === true, `ALLOWLIST_FLAGS_${index + 1}`);
  }
  const materialClaims = capsule.entries.reduce((sum, entry) => sum + entry.materialClaims.length, 0)
    + capsule.crossSourceValidations.categoryTotalRows + capsule.controllingClaims.length;
  const classes = [...new Set(capsule.entries.map((entry) => entry.evidenceClass))];
  assert(capsule.package.entries === 57 && capsule.package.bytes === EXPECTED.packageBytes
    && capsule.package.aggregateSha256 === EXPECTED.packageAggregate && capsule.package.allHashesVerified === true, 'CAPSULE_PACKAGE');
  assert(capsule.semanticCoreEntryCount === 45 && materialClaims === 222 && classes.length === 8, 'CAPSULE_SEMANTICS');
  assert(capsule.crossSourceValidations.residualAndAdjudicationRows.sourceResidualRows === 145
    && capsule.crossSourceValidations.residualAndAdjudicationRows.finalResidualRows === 145
    && capsule.crossSourceValidations.residualAndAdjudicationRows.adjudicationRows === 145
    && capsule.crossSourceValidations.categoryTotalRows === 145, 'CAPSULE_ROWS');
  assert(capsule.unfavorableEvidenceIndex.length === 10 && capsule.unsupportedCapsuleClaims.length === 0
    && capsule.omittedUnfavorableEvidence.length === 0, 'CAPSULE_UNFAVORABLE_OR_UNSUPPORTED');
  assert(coverage.pass === true && coverage.integrityCoverage.verified === 57
    && coverage.semanticCoverage.percentage === 100 && coverage.semanticCoverage.materialClaimCount === 222
    && coverage.semanticCoverage.adjudicatedRowsProjected === 145
    && coverage.semanticCoverage.unsupportedCapsuleClaims === 0 && coverage.semanticCoverage.omittedUnfavorableEvidence === 0
    && coverage.allEightClassesPresent === true && coverage.deterministicRepeat.match === true, 'COVERAGE_FIELDS');
  assert(estimate.pass === true && estimate.conservativeEstimatedTokens === EXPECTED.capsuleTokens
    && estimate.maximumEstimatedTokens === 200000 && estimate.headroomTokens === 11316, 'TOKEN_ESTIMATE');
  return { capsule, role, allow, coverage, estimate, materialClaims, classes };
}

function gitSnapshot() {
  const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').split(/\s+/).map(Number);
  const snapshot = {
    head: git('rev-parse', 'HEAD'), parent: git('rev-parse', 'HEAD^'), branch: git('branch', '--show-current'),
    upstream: git('rev-parse', '@{upstream}'), fetchHead: git('rev-parse', 'FETCH_HEAD'), ahead, behind,
    trackedStatusCount: git('status', '--porcelain=v1', '--untracked-files=no') ? git('status', '--porcelain=v1', '--untracked-files=no').split(/\r?\n/).length : 0,
    stagedCount: git('diff', '--cached', '--name-only') ? git('diff', '--cached', '--name-only').split(/\r?\n/).length : 0,
  };
  snapshot.pass = snapshot.head === EXPECTED.head && snapshot.parent === EXPECTED.parent && snapshot.branch === EXPECTED.branch
    && snapshot.upstream === EXPECTED.head && snapshot.fetchHead === EXPECTED.head && ahead === 0 && behind === 0
    && snapshot.trackedStatusCount === 0 && snapshot.stagedCount === 0;
  return snapshot;
}

function validateProtected() {
  const baseline = readJson(F.protectedBaseline);
  const records = [...baseline.records, ...baseline.protectedTrackedControls].map((expected) => {
    const target = path.resolve(REPO, ...expected.path.replaceAll('\\', '/').split('/'));
    const actual = fileRecord(target);
    return { ...actual, expectedBytes: expected.bytes, expectedSha256: expected.sha256,
      pass: actual.bytes === expected.bytes && actual.sha256 === expected.sha256 };
  });
  // The frozen baseline records are already in its governed lexical order.
  const untracked = records.slice(0, baseline.records.length);
  const aggregate = sha(Buffer.from(untracked.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join(''), 'utf8'));
  const components = ['ask-handler.js', 'conflict-engine.js', 'services/answer-support-evidence.js', 'services/answer-support-validator.js']
    .sort().map((name) => fileRecord(path.join(REPO, name)));
  const c35 = sha(Buffer.from(components.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join(''), 'utf8'));
  const prior = readJson(F.priorProtected);
  const registry = fileRecord(R('CANONICAL_ATTEMPT_REGISTRY.json'));
  const c34Wal = fileRecord(R('COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'));
  const c35Wal = fileRecord(R('COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'));
  const checks = {
    recordCount: records.length === 22, recordsMatch: records.every((x) => x.pass), aggregate: aggregate === EXPECTED.protectedAggregate,
    c35: c35 === EXPECTED.c35Composite, selectedC34Reason: prior.runtime.selectedC34ReasonRuntimeSha256 === EXPECTED.c34ReasonRuntime,
    registry: registry.sha256 === prior.registryWalAttempts.registry.sha256, c34Wal: c34Wal.sha256 === prior.registryWalAttempts.c34Wal.sha256,
    c35Wal: c35Wal.sha256 === prior.registryWalAttempts.c35Wal.sha256,
    c36WalAbsent: !fs.existsSync(R('COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson')),
    c37WalAbsent: !fs.existsSync(R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson')),
  };
  const pass = Object.values(checks).every(Boolean);
  assert(pass, `PROTECTED_RESIDUE:${JSON.stringify(checks)}`);
  return { baseline: fileRecord(F.protectedBaseline), recordsChecked: records.length, missingOrMismatch: records.filter((x) => !x.pass),
    aggregateSha256: aggregate, c35: { components, compositeSha256: c35 }, selectedC34ReasonRuntimeSha256: prior.runtime.selectedC34ReasonRuntimeSha256,
    registry, attempts: prior.registryWalAttempts.attempts ?? prior.registryWalAttempts.registry.attempts,
    c34Wal, c35Wal, c36WalAbsent: checks.c36WalAbsent, c37WalAbsent: checks.c37WalAbsent, checks, pass };
}

const OUTPUT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['decision', 'substantiveDisposition', 'reviewerTool', 'reviewerModel', 'independentReviewConfirmed',
    'readOnlyConfirmed', 'capsuleReadCompletely', 'capsuleSha256', 'capsuleMaterialClaimsAssessed',
    'packageIntegrityAccepted', 'packageEntriesAccepted', 'packageBytesAccepted', 'semanticCoveragePercentAccepted',
    'residualRowsRepresented', 'originalSpotChecks', 'evidenceClassesSpotChecked', 'requiredSpotChecksCompleted',
    'priorTechnicalFailureEvidenceAssessed', 'unfavorableEvidenceAssessed', 'rawCaptureLimitationAcknowledged',
    'mismatches', 'unreadMaterialClaims', 'unsupportedClaims', 'omittedUnfavorableEvidence', 'scopeIssues',
    'readOnlyOrScopeBreach', 'noRuntimeCandidateRequired', 'oracleGovernanceNextRequired', 'c35Preserved',
    'runtimeOracleFixtureRegistryWalPreserved', 'regressionPreserved', 'regressionSuites', 'regressionGroups',
    'newRuntimeBehaviorFailures', 'decisionMetrics', 'phase10AStatus', 'r20Status', 'runtimeCandidateRequested',
    'commitSafe', 'blockingFindings', 'nonblockingObservations', 'filesReportedRead', 'assessment'],
  properties: {
    decision: { enum: ['APPROVED', 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS', 'REJECTED', 'INCOMPLETE_REVIEW'] },
    substantiveDisposition: { enum: ['NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED', 'NO_RUNTIME_CANDIDATE_SEMANTICALLY_SAFE_BUT_REASON_GATE_OPEN', 'MORE_EVIDENCE_REQUIRED'] },
    reviewerTool: { const: 'Claude Code' }, reviewerModel: { const: MODEL }, independentReviewConfirmed: { type: 'boolean' }, readOnlyConfirmed: { type: 'boolean' },
    capsuleReadCompletely: { type: 'boolean' }, capsuleSha256: { const: EXPECTED.capsule }, capsuleMaterialClaimsAssessed: { const: 222 },
    packageIntegrityAccepted: { type: 'boolean' }, packageEntriesAccepted: { const: 57 }, packageBytesAccepted: { const: EXPECTED.packageBytes },
    semanticCoveragePercentAccepted: { const: 100 }, residualRowsRepresented: { const: 145 },
    originalSpotChecks: { type: 'array', minItems: 8, items: { type: 'object', additionalProperties: false,
      required: ['path', 'evidenceClass', 'sha256Compared', 'materialChecked', 'finding'], properties: {
        path: { type: 'string' }, evidenceClass: { type: 'string' }, sha256Compared: { pattern: '^[0-9a-f]{64}$' }, materialChecked: { type: 'string' }, finding: { type: 'string' },
      } } },
    evidenceClassesSpotChecked: { type: 'array', minItems: 8, uniqueItems: true, items: { enum: ['SEMANTIC_CORE_ADJUDICATION', 'MANIFEST_OR_CHECKPOINT_INTEGRITY', 'RAW_CAPTURE_INTEGRITY_SUPPORT', 'SEMANTIC_CORE_REGRESSION_ADJUDICATION', 'SEMANTIC_CORE_GATE_OR_PRESERVATION', 'SEMANTIC_CORE_DECISION', 'SEMANTIC_CORE_STATUS_OR_DOCUMENTATION', 'RUNNER_OR_DRIVER_PROVENANCE'] } },
    requiredSpotChecksCompleted: { type: 'boolean' }, priorTechnicalFailureEvidenceAssessed: { type: 'boolean' }, unfavorableEvidenceAssessed: { type: 'boolean' }, rawCaptureLimitationAcknowledged: { type: 'boolean' },
    mismatches: { type: 'array', items: { type: 'string' } }, unreadMaterialClaims: { type: 'array', items: { type: 'string' } }, unsupportedClaims: { type: 'array', items: { type: 'string' } },
    omittedUnfavorableEvidence: { type: 'array', items: { type: 'string' } }, scopeIssues: { type: 'array', items: { type: 'string' } }, readOnlyOrScopeBreach: { type: 'boolean' },
    noRuntimeCandidateRequired: { type: 'boolean' }, oracleGovernanceNextRequired: { type: 'boolean' }, c35Preserved: { type: 'boolean' }, runtimeOracleFixtureRegistryWalPreserved: { type: 'boolean' }, regressionPreserved: { type: 'boolean' },
    regressionSuites: { const: '197/217' }, regressionGroups: { const: '5429/5451' }, newRuntimeBehaviorFailures: { const: 0 },
    decisionMetrics: { type: 'object', additionalProperties: false, required: ['decision', 'relation', 'reason', 'reasonOnlyRows'], properties: { decision: { const: '3720/3720' }, relation: { const: '3720/3720' }, reason: { const: '3575/3720' }, reasonOnlyRows: { const: 145 } } },
    phase10AStatus: { const: 'OPEN' }, r20Status: { const: 'IN_PROGRESS' }, runtimeCandidateRequested: { type: 'boolean' }, commitSafe: { type: 'boolean' },
    blockingFindings: { type: 'array', items: { type: 'string' } }, nonblockingObservations: { type: 'array', items: { type: 'string' } }, filesReportedRead: { type: 'array', items: { type: 'string' } }, assessment: { type: 'string' },
  },
};

const SYSTEM_PROMPT = 'You are the sole independent C37 reviewer. Use only the built-in Read tool under the exact deny-by-default allowlist supplied by the executor. Never use shell, write, edit, notebook, search, network, MCP, agents, skills, configuration, environment, credentials, or any non-allowlisted path. Read the authorized capsule and spot-check originals as instructed. Return only the strict schema-conforming reviewer object. Do not claim unobservable provider wire facts or byte-for-byte semantic review of raw captures.';

const REQUIRED_SPOT_PATHS = [
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.md',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C36_CHECKPOINT_63_IDEMPOTENCE_REPLAY.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_CLEAN_FULL_REGRESSION_STDERR.txt',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_FINAL_FULL_REGRESSION_ADJUDICATION.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_FINAL_REASON_METRICS.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_RUNTIME_CANDIDATE_NECESSITY_DECISION.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_PHASE_10A_STATUS_ASSESSMENT_DRAFT.json',
  'evaluation/runner/phase-10a14-r20/commit5r1c37-preflight.mjs',
];

const META_READS = [F.capsule, F.roleLedger, F.allowlist, F.sourceManifest, F.detailedManifest, F.bootstrapMd];

function absoluteDisplay(repoRelative) { return path.resolve(REPO, ...repoRelative.split('/')).replaceAll('\\', '/'); }
function readRule(file) { return `Read(//${file.replaceAll('\\', '/').replace(/^([A-Za-z]):\//, (_, drive) => `${drive.toLowerCase()}/`)})`; }
function conservativeTokens(bytes) { return Math.ceil(Math.ceil(bytes / 3) * 1.25); }

function buildBootstrap(capsuleState) {
  const roleByPath = new Map(capsuleState.role.entries.map((entry) => [entry.repositoryRelativePath.replaceAll('\\', '/'), entry]));
  const spotRows = REQUIRED_SPOT_PATHS.map((repoPath) => {
    const row = roleByPath.get(repoPath);
    assert(row, `SPOT_PATH_NOT_IN_LEDGER:${repoPath}`);
    return { path: repoPath, absolutePath: absoluteDisplay(repoPath), bytes: row.bytes, sha256: row.sha256, evidenceClass: row.evidenceClass };
  });
  const lines = [
    '# C37 checkpoint-69 manifest-indexed independent review', '',
    'This is the sole authorized read-only Claude Code Opus 4.8 review. Perform no writes or mutations. The first field in your schema-conforming object must be `decision`; use only an allowed decision token. Use `substantiveDisposition` only for the allowed substantive token.', '',
    'Required procedure:',
    `1. Use Read to read the complete immutable capsule at ${absoluteDisplay(rel(F.capsule))}. Page through it until EOF. Assess every one of its 222 material claims, its stated 57/57 integrity, 100% semantic coverage, all 145 represented rows, all ten unfavorable items, and zero unsupported/omitted claims.`,
    `2. Read the role ledger (${absoluteDisplay(rel(F.roleLedger))}), exact allowlist (${absoluteDisplay(rel(F.allowlist))}), 57-line source manifest (${absoluteDisplay(rel(F.sourceManifest))}), and detailed package manifest (${absoluteDisplay(rel(F.detailedManifest))}). Accept integrity only if their identities and capsule relationships are coherent.`,
    '3. Read every required original spot check below. These cover every evidence class, unfavorable regression/reason evidence, preservation, and provenance. Do not omit any. You may read another exact allowlisted original only if necessary and must keep all original reads within the 300,000-token original-read budget.',
    ...spotRows.map((row, index) => `   ${index + 1}. [${row.evidenceClass}] repositoryRelativePath=${row.path} | absoluteReadPath=${row.absolutePath} | bytes=${row.bytes} | sha256=${row.sha256}`),
    '4. In the capsule, explicitly assess `priorTechnicalAndContinuationEvidence`, including both prior Opus technical failures. Their originals are not on the 57-file read allowlist: assess the capsule projections and do not escape scope to read those originals. Technical incomplete is not semantic rejection.',
    '5. Identify every mismatch, unread material claim, unsupported claim, omitted unfavorable item, permission/scope issue, or ambiguity. Do not approve if any such material item exists or if required reads are incomplete.',
    '6. Assess the frozen disposition: 145/145 residual rows adjudicated; generalized runtime defects 0; no C37 runtime candidate; oracle governance required; decision/relation/reason 3720/3720, 3720/3720, 3575/3720; 145 reason-only rows; C35 runtime preserved; regression 197/217 suites and 5,429/5,451 groups with 21 historical STATE plus 1 allowlisted SCOPE and zero new runtime-behavior failures.',
    '7. State whether Phase 10A remains OPEN and R20 remains IN_PROGRESS. C38 is only the next separately governed operation; do not begin or design it.',
    '8. Acknowledge the raw-capture limitation: assess integrity/provenance and bounded signatures; never claim byte-for-byte semantic review of every raw capture.',
    '9. Report exact files actually read in `filesReportedRead`. In each `originalSpotChecks.path`, use the exact repositoryRelativePath shown above (not the absoluteReadPath), with its evidence class and manifest SHA compared. Return only the schema-conforming object.', '',
    'Approval is permitted only when the decision is APPROVED or APPROVED_WITH_NONBLOCKING_OBSERVATIONS, substantiveDisposition is NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED, required coverage is complete, all issue arrays and blocking findings are empty, no scope breach occurred, no runtime candidate is requested, Phase 10A remains OPEN, and commitSafe is true.', '',
  ];
  return { markdown: lines.join('\n'), spotRows };
}

function validateCheckpointAndAuthorization() {
  assert(shaFile(F.prompt) === EXPECTED.prompt, 'GOVERNING_PROMPT_HASH');
  assert(shaFile(F.checkpoint) === EXPECTED.checkpoint && shaFile(F.checkpointPointer) === EXPECTED.checkpoint, 'CHECKPOINT_HASH');
  assert(fs.readFileSync(F.checkpoint).equals(fs.readFileSync(F.checkpointPointer)), 'CHECKPOINT_POINTER_BYTES');
  assert(shaFile(F.handoff) === EXPECTED.handoff && shaFile(F.checkpointReplay) === EXPECTED.checkpointReplay, 'HANDOFF_OR_REPLAY_HASH');
  const checkpoint = readJson(F.checkpoint);
  const replay = readJson(F.checkpointReplay);
  const authorization = readJson(F.authorization);
  assert(checkpoint.ordinal === 69 && checkpoint.safeToResume === true && checkpoint.activeAttemptId === null
    && checkpoint.eventSha256 === EXPECTED.checkpointEvent && checkpoint.status === 'C37_FOUR_HOUR_TOKEN_RESERVE_SAFE_PAUSE_PRE_INVOCATION', 'CHECKPOINT_FIELDS');
  assert(replay.pass === true && replay.pointerEqualsNumberedCheckpoint === true && replay.safeToResume === true
    && replay.activeAttemptId === null && replay.eventSha256 === EXPECTED.checkpointEvent, 'REPLAY_FIELDS');
  assert(shaFile(F.authorization) === EXPECTED.authorization && authorization.pass === true
    && authorization.newAuthorization.status === 'AUTHORIZED_UNUSED' && authorization.newAuthorization.maximumInvocations === 1
    && authorization.newAuthorization.retryAuthorized === false && authorization.authorizationConsumed === false
    && authorization.invocationMarkerExists === false && authorization.substantiveRequestSubmitted === false, 'AUTHORIZATION_FIELDS');
  const evidence = validateShaManifest(F.checkpointEvidence, 19);
  assert(shaFile(F.checkpointEvidence) === EXPECTED.checkpointEvidence && evidence.pass, 'CHECKPOINT_EVIDENCE');
  const log = fs.readFileSync(F.checkpointLog, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  assert(log.length === 6 && log.map((x) => x.ordinal).join(',') === '64,65,66,67,68,69'
    && log.at(-1).eventSha256 === EXPECTED.checkpointEvent, 'CHECKPOINT_LOG');
  return { checkpoint, replay, authorization, evidence, checkpointLog: fileRecord(F.checkpointLog) };
}

function persistentConfigurationSnapshot() {
  const candidates = [
    'C:/Users/USER/.claude/settings.json',
    'C:/Users/USER/.claude.json',
    path.join(REPO, '.claude/settings.local.json'),
    'C:/Users/USER/AppData/Roaming/Code/User/settings.json',
  ];
  return candidates.map((file) => fs.existsSync(file)
    ? { path: file.replaceAll('\\', '/'), exists: true, bytes: fs.statSync(file).size, sha256: shaFile(file) }
    : { path: file.replaceAll('\\', '/'), exists: false, bytes: null, sha256: null });
}

function managedPolicyAudit() {
  const candidates = [
    'C:/Program Files/ClaudeCode/managed-settings.json',
    'C:/Program Files/ClaudeCode/managed-settings.d',
    'C:/Program Files/ClaudeCode/managed-mcp.json',
    'C:/ProgramData/ClaudeCode/managed-settings.json',
    'C:/ProgramData/ClaudeCode/managed-mcp.json',
  ].map((file) => ({ path: file, exists: fs.existsSync(file) }));
  const registry = [];
  for (const view of ['64', '32']) {
    const result = spawnSync('reg.exe', ['query', 'HKLM\\SOFTWARE\\Policies\\ClaudeCode', `/reg:${view}`], { encoding: 'utf8', windowsHide: true });
    registry.push({ hivePath: 'HKLM\\SOFTWARE\\Policies\\ClaudeCode', view, exists: result.status === 0 });
  }
  const pass = candidates.every((x) => !x.exists) && registry.every((x) => !x.exists);
  return { authoritativeFileCandidates: candidates, authoritativeRegistryViews: registry,
    remotelyDeliveredOrganizationPolicyObservableWithoutAuthenticatedSession: false, observedLocalManagedPolicy: !pass, pass };
}

function childEnvironment(runtime) {
  const env = {};
  for (const name of ['SystemRoot', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  env.TEMP = runtime;
  env.TMP = runtime;
  env.NO_COLOR = '1';
  env.CLAUDE_CODE_SAFE_MODE = '1';
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  return env;
}

function removeOwnedTemp(root, ownershipNonce) {
  const resolved = path.resolve(root);
  assert(resolved.toLowerCase().startsWith(`${path.resolve('C:/tmp').toLowerCase()}${path.sep}`), 'TEMP_OUTSIDE_C_TMP');
  assert(['c37-manifest-indexed-checkpoint69-validation', 'c37-manifest-indexed-checkpoint69-invocation'].includes(path.basename(resolved)), 'TEMP_BASENAME');
  const ownership = readJson(path.join(resolved, 'OWNERSHIP.json'));
  assert(ownership.nonce === ownershipNonce && ownership.owner === 'PHASE-10A14-R20 COMMIT 5R1-C37 checkpoint 69', 'TEMP_OWNERSHIP');
  fs.rmSync(resolved, { recursive: true, force: true });
}

function validateIsolatedMcpProviderFree() {
  assert(!fs.existsSync(VALIDATION_ROOT), 'VALIDATION_TEMP_RESIDUE');
  const before = persistentConfigurationSnapshot();
  const nonce = crypto.randomUUID();
  const work = path.join(VALIDATION_ROOT, 'work');
  const runtime = path.join(VALIDATION_ROOT, 'runtime');
  const config = path.join(VALIDATION_ROOT, 'empty-mcp.json');
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(VALIDATION_ROOT, 'OWNERSHIP.json'), stable({ owner: 'PHASE-10A14-R20 COMMIT 5R1-C37 checkpoint 69', nonce }), { flag: 'wx' });
  fs.writeFileSync(config, EMPTY_MCP, { flag: 'wx' });
  let result;
  try {
    result = spawnSync(CLI, ['--safe-mode', '--no-chrome', '--mcp-config', config, '--strict-mcp-config', 'mcp', 'list'], {
      cwd: work, env: childEnvironment(runtime), shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000,
    });
  } finally {
    removeOwnedTemp(VALIDATION_ROOT, nonce);
  }
  const after = persistentConfigurationSnapshot();
  const persistentUnchanged = stable(before) === stable(after);
  const pass = result.status === 0 && /No MCP servers configured/i.test(result.stdout ?? '') && !(result.stderr ?? '').trim()
    && persistentUnchanged && !fs.existsSync(VALIDATION_ROOT);
  assert(pass, 'ISOLATED_MCP_VALIDATION');
  return {
    config: { completeContent: EMPTY_MCP.trimEnd(), bytes: Buffer.byteLength(EMPTY_MCP), sha256: sha(Buffer.from(EMPTY_MCP)), strict: true },
    providerFreeValidation: { argv: ['--safe-mode', '--no-chrome', '--mcp-config', '<TEMP_EMPTY_MCP_JSON>', '--strict-mcp-config', 'mcp', 'list'],
      exitCode: result.status, stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim(), providerRequestObserved: false, modelRequestSubmitted: false },
    persistentConfigurationBefore: before, persistentConfigurationAfter: after, persistentConfigurationUnchanged: persistentUnchanged,
    validationRootRemoved: !fs.existsSync(VALIDATION_ROOT), pass,
  };
}

function measureContext() {
  assert(fs.existsSync(SESSION), 'SESSION_TELEMETRY_FILE');
  const lines = fs.readFileSync(SESSION, 'utf8').split(/\r?\n/);
  let latest = null;
  let latestLine = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]) continue;
    try {
      const event = JSON.parse(lines[index]);
      if (event.type === 'event_msg' && event.payload?.type === 'token_count') { latest = event; latestLine = index + 1; }
    } catch { /* an actively appended final line may be incomplete */ }
  }
  assert(latest, 'TOKEN_EVENT_MISSING');
  const active = latest.payload.info.last_token_usage.total_tokens;
  const window = latest.payload.info.model_context_window;
  const remaining = window - active;
  return { sessionFile: SESSION, sessionId: path.basename(SESSION, '.jsonl').split('-').slice(-5).join('-'), latestTokenEventLine: latestLine,
    eventTimestampUtc: latest.timestamp ?? null, configuredContextCapacityTokens: EXPECTED.configuredWindow,
    effectiveContextWindowTokens: window, telemetryReportedActiveContextTokens: active, calculatedEffectiveRemainingTokens: remaining,
    requiredPreSubmissionRemainingTokens: EXPECTED.requiredRemaining, headroomAbovePreSubmissionRequirementTokens: remaining - EXPECTED.requiredRemaining,
    requiredSafePauseReserveTokens: EXPECTED.reserve, headroomAboveReserveTokens: remaining - EXPECTED.reserve,
    method: 'latest current-session event_msg/payload.token_count last_token_usage.total_tokens subtracted from model_context_window',
    gatePass: window === EXPECTED.effectiveWindow && remaining >= EXPECTED.requiredRemaining };
}

function prepare() {
  for (const file of INVOCATION_OUTPUTS) assert(!fs.existsSync(file), `INVOCATION_OUTPUT_ALREADY_EXISTS:${rel(file)}`);
  for (const file of PREP_OUTPUTS.filter((x) => fs.existsSync(x))) {
    if (path.extname(file).toLowerCase() !== '.md') assert(readJson(file).pass === true, `PARTIAL_PREP_JSON_INVALID:${rel(file)}`);
  }
  assert(!fs.existsSync(VALIDATION_ROOT) && !fs.existsSync(INVOCATION_ROOT), 'TASK_TEMP_RESIDUE');
  const generatedUtc = now();
  const chain = validateCheckpointAndAuthorization();
  const gitState = gitSnapshot();
  assert(gitState.pass, 'GIT_PREFLIGHT');
  const pkg = validatePackage();
  const capsuleState = validateCapsule(pkg);
  const protectedState = validateProtected();
  const managedPolicy = managedPolicyAudit();
  assert(managedPolicy.pass, 'MANAGED_POLICY_PRESENT');

  writePrepared(F.continuation, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_CONTINUATION_PREFLIGHT_PASS', generatedUtc,
    governingPrompt: fileRecord(F.prompt), checkpoint: fileRecord(F.checkpoint), checkpointPointerByteIdentical: true,
    checkpointOrdinal: chain.checkpoint.ordinal, checkpointStatus: chain.checkpoint.status, safeToResume: chain.checkpoint.safeToResume,
    activeAttemptId: chain.checkpoint.activeAttemptId, checkpointEventSha256: chain.checkpoint.eventSha256,
    handoff: fileRecord(F.handoff), replay: fileRecord(F.checkpointReplay), replayPass: chain.replay.pass,
    checkpointEvidence: chain.evidence, checkpointLog: chain.checkpointLog, git: gitState,
    frozenSemanticState: { decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', reasonOnlyRows: 145,
      generalizedRuntimeDefects: 0, decisionDisposition: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED' },
    trackedBaselineClean: true, stagingClean: true, outputsAbsentBeforePreparation: true,
    noAcceptedOrTerminalWorkRerun: true, noModelContact: true, pass: true,
  }));

  writePrepared(F.protected, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_PROTECTED_RESIDUE_VERIFICATION_PASS', generatedUtc,
    baseline: protectedState.baseline, recordsChecked: protectedState.recordsChecked, missingOrMismatch: protectedState.missingOrMismatch,
    aggregateSha256: protectedState.aggregateSha256, expectedAggregateSha256: EXPECTED.protectedAggregate,
    c35: protectedState.c35, expectedC35CompositeSha256: EXPECTED.c35Composite,
    selectedC34ReasonRuntimeSha256: protectedState.selectedC34ReasonRuntimeSha256, expectedSelectedC34ReasonRuntimeSha256: EXPECTED.c34ReasonRuntime,
    registry: protectedState.registry, c34Wal: protectedState.c34Wal, c35Wal: protectedState.c35Wal,
    c36WalAbsent: protectedState.c36WalAbsent, c37WalAbsent: protectedState.c37WalAbsent,
    runtimeOracleFixtureRegistryWalMutationCount: 0,
    historicalControls: { roadmapV7: fileRecord(path.join(REPO, 'knowledge/TINA_Updated_Roadmap_v7.md')),
      roadmapV8: fileRecord(path.join(REPO, 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md')), unchanged: true },
    governingDocumentsBeforeApproval: { roadmapV9: fileRecord(path.join(REPO, 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md')),
      currentState: fileRecord(path.join(REPO, 'knowledge/CURRENT_STATE.md')), modified: false },
    pass: protectedState.pass,
  }));

  writePrepared(F.capsuleContinuity, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_CAPSULE_CONTINUITY_VERIFICATION_PASS', generatedUtc,
    package: { entries: pkg.rows.length, present: pkg.rows.length, verifiedHashes: pkg.rows.length, rawEvidenceBytes: pkg.rawBytes,
      sourceManifest: fileRecord(F.sourceManifest), detailedManifest: fileRecord(F.detailedManifest), aggregateSha256: pkg.aggregate,
      duplicatePaths: 0, pathEscapes: 0, pass: true },
    capsule: fileRecord(F.capsule), capsuleMarkdown: fileRecord(F.capsuleMarkdown), roleLedger: fileRecord(F.roleLedger), allowlist: fileRecord(F.allowlist),
    coverage: fileRecord(F.coverage), tokenEstimate: fileRecord(F.tokenEstimate),
    semantic: { semanticCoreEntries: capsuleState.capsule.semanticCoreEntryCount, materialClaims: capsuleState.materialClaims,
      adjudicatedRows: capsuleState.capsule.crossSourceValidations.residualAndAdjudicationRows.adjudicationRows,
      evidenceClasses: capsuleState.classes.length, unfavorableEvidenceItems: capsuleState.capsule.unfavorableEvidenceIndex.length,
      unsupportedClaims: capsuleState.capsule.unsupportedCapsuleClaims.length, omittedUnfavorableEvidence: capsuleState.capsule.omittedUnfavorableEvidence.length,
      coveragePercent: capsuleState.coverage.semanticCoverage.percentage },
    estimate: { combinedUtf8Bytes: capsuleState.estimate.combinedUtf8Bytes, conservativeEstimatedTokens: capsuleState.estimate.conservativeEstimatedTokens,
      maximumEstimatedTokens: capsuleState.estimate.maximumEstimatedTokens, headroomTokens: capsuleState.estimate.headroomTokens },
    capsuleRebuiltOrModified: false, capsuleContentsReturnedToCodex: false, deterministicRepeatMatch: capsuleState.coverage.deterministicRepeat.match, pass: true,
  }));

  writePrepared(F.authContinuity, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_AUTHORIZATION_CONTINUITY_PASS', generatedUtc,
    authorization: fileRecord(F.authorization), provider: chain.authorization.newAuthorization.provider,
    reviewer: chain.authorization.newAuthorization.reviewer, cliVersion: chain.authorization.newAuthorization.cliVersion,
    model: chain.authorization.newAuthorization.model, status: chain.authorization.newAuthorization.status,
    authorizationConsumed: false, manifestIndexedInvocationCount: 0, maximumInvocations: 1, retryAuthorized: false,
    invocationMarkerExists: false, substantiveRequestSubmitted: false, providerRequestObserved: false, modelReviewReached: false,
    bootstrapAbsentBeforePreparation: true, reviewAbsentBeforePreparation: true, additionalAuthorizationCreated: false, pass: true,
  }));

  const bootstrap = buildBootstrap(capsuleState);
  const bootstrapMd = writePrepared(F.bootstrapMd, `${bootstrap.markdown}\n`);
  const schemaText = JSON.stringify(OUTPUT_SCHEMA);
  const systemPromptBytes = Buffer.byteLength(SYSTEM_PROMPT);
  writePrepared(F.bootstrapJson, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_OPUS_BOOTSTRAP_PASS', generatedUtc,
    markdown: bootstrapMd, childStdinMethod: 'bootstrap Markdown bytes only; no @file expansion and no capsule/original inlining',
    outputSchema: { bytes: Buffer.byteLength(schemaText), sha256: sha(Buffer.from(schemaText)) },
    systemPrompt: { bytes: systemPromptBytes, sha256: sha(Buffer.from(SYSTEM_PROMPT)) },
    requiredOriginalSpotChecks: bootstrap.spotRows, capsuleReadDirectlyThroughReadTool: true, fullPackageInlineOrConcatenated: false, pass: true,
  }));

  const originalFiles = pkg.rows.map((row) => path.resolve(REPO, ...row.path.split('/')));
  const allowedFiles = [...new Set([...META_READS, ...originalFiles])];
  const allowedRecords = allowedFiles.map((file) => ({ ...fileRecord(file), absolutePath: file.replaceAll('\\', '/'),
    permissionRule: readRule(file), kind: originalFiles.includes(file) ? 'AUTHORIZED_ORIGINAL' : 'AUTHORIZED_CAPSULE_OR_METADATA' }));
  const rules = allowedRecords.map((x) => x.permissionRule);
  assert(allowedRecords.length === 63 && new Set(rules).size === 63 && rules.every((rule) => /^Read\(\/\/[a-z]\/.+\)$/.test(rule) && !rule.includes('*')), 'TOOL_RULES');
  const cliVersion = execFileSync(CLI, ['--version'], { encoding: 'utf8', windowsHide: true }).trim();
  const cliHelp = execFileSync(CLI, ['--help'], { encoding: 'utf8', windowsHide: true });
  assert(cliVersion === CLI_VERSION && fs.statSync(CLI).size === EXPECTED.cliBytes && shaFile(CLI) === EXPECTED.cliSha256, 'CLI_IDENTITY');
  const flags = ['--print', '--allowedTools', '--disallowedTools', '--permission-mode', '--safe-mode', '--no-session-persistence', '--mcp-config', '--strict-mcp-config', '--tools', '--output-format', '--json-schema', '--system-prompt'];
  const missingFlags = flags.filter((flag) => !cliHelp.includes(flag));
  assert(missingFlags.length === 0, 'CLI_FLAGS');
  writePrepared(F.toolPlan, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_PLAN_PASS', generatedUtc,
    cli: { path: CLI, bytes: EXPECTED.cliBytes, sha256: EXPECTED.cliSha256, version: cliVersion }, model: MODEL,
    execution: { oneShotPrint: true, effort: 'max', permissionMode: 'dontAsk', safeMode: true, noSessionPersistence: true,
      noChrome: true, slashCommandsDisabled: true, exclusiveBuiltInTools: ['Read'], emptyIsolatedWorkingDirectory: true,
      addDirSupplied: false, resumeOrContinueSupplied: false, shell: false },
    isolatedMcp: { completeContent: EMPTY_MCP.trimEnd(), bytes: EXPECTED.emptyMcpBytes, sha256: EXPECTED.emptyMcpSha256, strict: true, servers: 0 },
    denyByDefault: true, exactAllowedReadCount: allowedRecords.length, exactOriginalReadCount: originalFiles.length,
    allowedReads: allowedRecords, broadReadRulePresent: false, wildcardRulePresent: false,
    unavailableTools: ['Bash', 'PowerShell', 'Edit', 'Write', 'NotebookEdit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Agent', 'Task', 'Skill', 'MCP'],
    pathEscapeAllowed: false, networkFetchToolAllowed: false, persistentConfigurationChangeAllowed: false,
    outputSchema: { bytes: Buffer.byteLength(schemaText), sha256: sha(Buffer.from(schemaText)) }, systemPrompt: { bytes: systemPromptBytes, sha256: sha(Buffer.from(SYSTEM_PROMPT)) }, pass: true,
  }));

  const mcpValidation = validateIsolatedMcpProviderFree();
  writePrepared(F.toolValidation, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_VALIDATION_PASS', generatedUtc,
    toolPlan: fileRecord(F.toolPlan), cliHelp: { bytes: Buffer.byteLength(cliHelp), sha256: sha(Buffer.from(cliHelp)), requiredFlags: flags, missingFlags },
    semantics: { toolsArgument: ['Read'], permissionMode: 'dontAsk', exactAbsoluteReadRules: rules.length, broadReadRule: false,
      emptyCwdPreventsImplicitRepositoryRead: true, noAddDir: true, unmatchedPermissionRequestsDenied: true,
      providerFreeReadDecisionDryRunAvailable: false, runtimeReadAuditRequired: true },
    managedPolicyAudit: managedPolicy, isolatedMcpValidation: mcpValidation,
    noModelOrProviderContactDuringValidation: true, noPersistentConfigurationMutation: true, noValidationTempResidue: true, pass: true,
  }));

  const spotBytes = bootstrap.spotRows.reduce((sum, row) => sum + row.bytes, 0);
  const metadataFiles = [F.roleLedger, F.allowlist, F.sourceManifest, F.detailedManifest];
  const metadataBytes = metadataFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const bootstrapTokens = conservativeTokens(bootstrapMd.bytes);
  const spotTokens = conservativeTokens(spotBytes);
  const metadataTokens = conservativeTokens(metadataBytes);
  const projectedTotal = EXPECTED.capsuleTokens + bootstrapTokens + spotTokens + metadataTokens + 150000 + 50000;
  const projection = {
    providerContextLimitTokens: 1000000, capsuleTokens: EXPECTED.capsuleTokens,
    bootstrap: { bytes: bootstrapMd.bytes, conservativeEstimatedTokens: bootstrapTokens, maximumBytes: 65536, maximumEstimatedTokens: 24000,
      bytesPass: bootstrapMd.bytes <= 65536, tokensPass: bootstrapTokens <= 24000 },
    requiredOriginalSpotChecks: { files: bootstrap.spotRows.length, bytes: spotBytes, conservativeEstimatedTokens: spotTokens, maximumTokens: 300000, pass: spotTokens <= 300000 },
    reviewMetadataReads: { files: metadataFiles.map(fileRecord), bytes: metadataBytes, conservativeEstimatedTokens: metadataTokens },
    systemAndToolOverheadReserveTokens: 150000, reviewOutputReserveTokens: 50000,
    projectedTotalTokens: projectedTotal, maximumProjectedTokens: 750000,
    marginBelowProviderLimitTokens: 1000000 - projectedTotal, minimumRequiredMarginTokens: 250000,
  };
  projection.pass = projection.bootstrap.bytesPass && projection.bootstrap.tokensPass && projection.requiredOriginalSpotChecks.pass
    && projectedTotal <= 750000 && 1000000 - projectedTotal >= 250000;
  assert(projection.pass, 'CONTEXT_PROJECTION');
  writePrepared(F.contextProjection, stable({ schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_CHECKPOINT_69_OPUS_CONTEXT_PROJECTION_PASS', generatedUtc, ...projection }));
  writePrepared(F.transportPreflight, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_OPUS_TRANSPORT_PREFLIGHT_PASS', generatedUtc,
    continuationPreflight: fileRecord(F.continuation), protectedResidue: fileRecord(F.protected), capsuleContinuity: fileRecord(F.capsuleContinuity), authorizationContinuity: fileRecord(F.authContinuity),
    toolPlan: fileRecord(F.toolPlan), toolValidation: fileRecord(F.toolValidation), bootstrapJson: fileRecord(F.bootstrapJson), bootstrapMarkdown: fileRecord(F.bootstrapMd), contextProjection: fileRecord(F.contextProjection),
    childStdin: { source: rel(F.bootstrapMd), bytes: bootstrapMd.bytes, sha256: bootstrapMd.sha256, capsuleOrOriginalBytesInlined: 0, atFileExpansion: false },
    modelContacted: false, invocationMarkerCreated: false, persistentConfigurationMutations: 0, validationTempResidue: false,
    allPreparationGatesPass: true, pass: true,
  }));
  process.stdout.write(stable({ classification: 'C37_CHECKPOINT_69_OPUS_TRANSPORT_PREPARED', created: PREP_OUTPUTS.length,
    capsuleSha256: EXPECTED.capsule, allowedReads: allowedRecords.length, requiredSpotChecks: bootstrap.spotRows.length,
    projectedTotalTokens: projectedTotal, marginBelowProviderLimitTokens: 1000000 - projectedTotal,
    modelContacted: false, authorizationStatus: 'AUTHORIZED_UNUSED', invocationCount: 0, pass: true }));
}

function buildRuntimeState() {
  const pkg = validatePackage();
  const capsuleState = validateCapsule(pkg);
  const bootstrap = buildBootstrap(capsuleState);
  const roleByPath = new Map(capsuleState.role.entries.map((entry) => [entry.repositoryRelativePath.replaceAll('\\', '/'), entry]));
  const originalFiles = pkg.rows.map((row) => path.resolve(REPO, ...row.path.split('/')));
  const allowedFiles = [...new Set([...META_READS, ...originalFiles])];
  const allowedRealpaths = new Map(allowedFiles.map((file) => [fs.realpathSync(file).toLowerCase(), fileRecord(file)]));
  const rules = allowedFiles.map(readRule);
  const spotRows = REQUIRED_SPOT_PATHS.map((repoPath) => roleByPath.get(repoPath));
  return { pkg, capsuleState, bootstrap, roleByPath, originalFiles, allowedFiles, allowedRealpaths, rules, spotRows };
}

function inputSnapshot(runtimeState) {
  const inputs = [...new Set([F.driver, F.prompt, F.checkpoint, F.checkpointPointer, F.checkpointReplay, F.checkpointEvidence,
    F.handoff, F.authorization, ...PREP_OUTPUTS, ...runtimeState.allowedFiles,
    path.join(REPO, 'knowledge/TINA_Updated_Roadmap_v7.md'), path.join(REPO, 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md'),
    path.join(REPO, 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md'), path.join(REPO, 'knowledge/CURRENT_STATE.md')])];
  const records = inputs.sort().map(fileRecord);
  return { count: records.length, aggregateSha256: sha(Buffer.from(records.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join(''), 'utf8')) };
}

function canonicalObservedRead(inputPath, cwd) {
  const resolved = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(cwd, inputPath);
  try { return fs.realpathSync(resolved).toLowerCase(); } catch { return resolved.toLowerCase(); }
}

function parseStream(stdout, runtimeState, cwd) {
  const lines = stdout.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const events = [];
  const invalidLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    try { events.push(JSON.parse(lines[index])); } catch { invalidLines.push(index + 1); }
  }
  const readCalls = [];
  const models = new Set();
  for (const event of events) {
    if (event.type === 'assistant' && event.message?.model) models.add(event.message.model);
    for (const block of event.message?.content ?? []) {
      if (block.type === 'tool_use' && block.name === 'Read') {
        const inputPath = block.input?.file_path ?? block.input?.path ?? null;
        readCalls.push({ toolUseId: block.id ?? null, inputPath, offset: block.input?.offset ?? null, limit: block.input?.limit ?? null,
          canonicalRealpath: inputPath ? canonicalObservedRead(inputPath, cwd) : null });
      }
    }
  }
  const results = events.filter((event) => event.type === 'result');
  const terminal = results.at(-1) ?? null;
  if (terminal?.modelUsage) for (const model of Object.keys(terminal.modelUsage)) models.add(model);
  let review = terminal?.structured_output ?? null;
  if (!review && typeof terminal?.result === 'string') {
    try { review = JSON.parse(terminal.result.trim()); } catch { /* captured below */ }
  }
  const uniqueReadPaths = [...new Set(readCalls.map((x) => x.canonicalRealpath).filter(Boolean))];
  const unauthorizedReads = uniqueReadPaths.filter((x) => !runtimeState.allowedRealpaths.has(x));
  return { lines: lines.length, events: events.length, invalidLines, resultEvents: results.length, terminal, review,
    readCalls, uniqueReadPaths, unauthorizedReads, models: [...models] };
}

function validateReviewerObject(review, parsed, runtimeState) {
  if (!review || typeof review !== 'object' || Array.isArray(review)) return { reviewerObjectReceived: false, pass: false, reasons: ['NO_REVIEWER_OBJECT'] };
  const reasons = [];
  const approval = ['APPROVED', 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS'].includes(review.decision);
  const originalSet = new Set(runtimeState.pkg.rows.map((row) => row.path));
  const roleByPath = runtimeState.roleByPath;
  const spots = Array.isArray(review.originalSpotChecks) ? review.originalSpotChecks : [];
  const uniqueSpots = [...new Set(spots.map((x) => x.path?.replaceAll('\\', '/')).filter(Boolean))];
  const classes = new Set();
  for (const spot of spots) {
    const p = spot.path?.replaceAll('\\', '/');
    const role = roleByPath.get(p);
    if (!originalSet.has(p) || !role || role.sha256 !== spot.sha256Compared || role.evidenceClass !== spot.evidenceClass) reasons.push(`INVALID_SPOT:${p ?? 'null'}`);
    else classes.add(role.evidenceClass);
  }
  const missingRequired = REQUIRED_SPOT_PATHS.filter((p) => !uniqueSpots.includes(p));
  const requiredRealpaths = REQUIRED_SPOT_PATHS.map((p) => fs.realpathSync(path.resolve(REPO, ...p.split('/'))).toLowerCase());
  const requiredObservedMissing = requiredRealpaths.filter((p) => !parsed.uniqueReadPaths.includes(p));
  const capsuleObserved = parsed.uniqueReadPaths.includes(fs.realpathSync(F.capsule).toLowerCase());
  const emptyArrays = ['mismatches', 'unreadMaterialClaims', 'unsupportedClaims', 'omittedUnfavorableEvidence', 'scopeIssues', 'blockingFindings']
    .every((key) => Array.isArray(review[key]) && review[key].length === 0);
  const booleans = ['independentReviewConfirmed', 'readOnlyConfirmed', 'capsuleReadCompletely', 'packageIntegrityAccepted',
    'requiredSpotChecksCompleted', 'priorTechnicalFailureEvidenceAssessed', 'unfavorableEvidenceAssessed',
    'rawCaptureLimitationAcknowledged', 'noRuntimeCandidateRequired', 'oracleGovernanceNextRequired', 'c35Preserved',
    'runtimeOracleFixtureRegistryWalPreserved', 'regressionPreserved', 'commitSafe'].every((key) => review[key] === true);
  if (!approval) reasons.push('DECISION_NOT_APPROVAL');
  if (review.substantiveDisposition !== 'NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED') reasons.push('SUBSTANTIVE_TOKEN');
  if (!booleans || review.readOnlyOrScopeBreach !== false || review.runtimeCandidateRequested !== false) reasons.push('BOOLEAN_GATES');
  if (!emptyArrays) reasons.push('FINDING_ARRAYS_NONEMPTY');
  if (uniqueSpots.length < 8 || classes.size !== 8 || missingRequired.length || requiredObservedMissing.length) reasons.push('SPOT_COVERAGE');
  if (!capsuleObserved || parsed.unauthorizedReads.length || parsed.invalidLines.length || parsed.resultEvents !== 1) reasons.push('TRANSPORT_READ_AUDIT');
  if (review.capsuleSha256 !== EXPECTED.capsule || review.capsuleMaterialClaimsAssessed !== 222
    || review.packageEntriesAccepted !== 57 || review.packageBytesAccepted !== EXPECTED.packageBytes
    || review.semanticCoveragePercentAccepted !== 100 || review.residualRowsRepresented !== 145) reasons.push('CAPSULE_ACCEPTANCE_FIELDS');
  if (review.decisionMetrics?.decision !== '3720/3720' || review.decisionMetrics?.relation !== '3720/3720'
    || review.decisionMetrics?.reason !== '3575/3720' || review.decisionMetrics?.reasonOnlyRows !== 145
    || review.regressionSuites !== '197/217' || review.regressionGroups !== '5429/5451'
    || review.newRuntimeBehaviorFailures !== 0 || review.phase10AStatus !== 'OPEN' || review.r20Status !== 'IN_PROGRESS') reasons.push('FROZEN_STATE_FIELDS');
  if (review.reviewerTool !== 'Claude Code' || review.reviewerModel !== MODEL || !parsed.models.includes(MODEL)) reasons.push('REVIEWER_IDENTITY');
  return { reviewerObjectReceived: true, approval, originalSpotChecks: spots.length, uniqueOriginalSpotChecks: uniqueSpots.length,
    evidenceClassesCovered: classes.size, missingRequiredSpotChecks: missingRequired, requiredObservedReadMissing: requiredObservedMissing,
    capsuleReadObserved: capsuleObserved, emptyBlockingArrays: emptyArrays, allRequiredBooleans: booleans,
    unauthorizedReadCount: parsed.unauthorizedReads.length, reasons, pass: reasons.length === 0 };
}

async function invoke() {
  for (const file of PREP_OUTPUTS) {
    assert(fs.existsSync(file), `PREP_ARTIFACT_MISSING:${rel(file)}`);
    if (path.extname(file).toLowerCase() !== '.md') assert(readJson(file).pass === true, `PREP_ARTIFACT_FAIL:${rel(file)}`);
  }
  for (const file of INVOCATION_OUTPUTS) assert(!fs.existsSync(file), `EXACT_ONCE_OUTPUT_EXISTS:${rel(file)}`);
  assert(!fs.existsSync(INVOCATION_ROOT) && !fs.existsSync(VALIDATION_ROOT), 'TASK_TEMP_RESIDUE');
  const chain = validateCheckpointAndAuthorization();
  const gitState = gitSnapshot();
  const protectedState = validateProtected();
  const runtimeState = buildRuntimeState();
  const managedPolicy = managedPolicyAudit();
  const token = measureContext();
  const cliVersion = execFileSync(CLI, ['--version'], { encoding: 'utf8', windowsHide: true }).trim();
  const preparationRecords = PREP_OUTPUTS.map(fileRecord);
  const gates = {
    checkpoint69Continuity: chain.evidence.pass && chain.replay.pass,
    gitIdentityAndCleanBaseline: gitState.pass,
    protectedResidueAndC35: protectedState.pass,
    runtimeOracleFixtureRegistryWalUnchanged: protectedState.pass,
    package57Integrity: runtimeState.pkg.rows.length === 57 && runtimeState.pkg.rawBytes === EXPECTED.packageBytes,
    capsuleIdentityAndCoverage: runtimeState.capsuleState.coverage.pass === true && shaFile(F.capsule) === EXPECTED.capsule,
    capsuleTokenEstimate: runtimeState.capsuleState.estimate.conservativeEstimatedTokens === EXPECTED.capsuleTokens,
    authorizationUnused: chain.authorization.newAuthorization.status === 'AUTHORIZED_UNUSED' && chain.authorization.authorizationConsumed === false,
    invocationCountZero: chain.authorization.invocationMarkerExists === false && !fs.existsSync(F.marker),
    isolatedMcpConfigValidated: readJson(F.toolValidation).isolatedMcpValidation.pass === true,
    readOnlyAllowlistEnforcement: readJson(F.toolValidation).pass === true && managedPolicy.pass,
    bootstrapAndProjection: readJson(F.bootstrapJson).pass === true && readJson(F.contextProjection).pass === true && readJson(F.transportPreflight).pass === true,
    noTaskTempResidue: !fs.existsSync(INVOCATION_ROOT) && !fs.existsSync(VALIDATION_ROOT),
    cliIdentity: cliVersion === CLI_VERSION && fs.statSync(CLI).size === EXPECTED.cliBytes && shaFile(CLI) === EXPECTED.cliSha256,
    remainingCodexContextAtLeast120000: token.gatePass,
  };
  const preflightPass = Object.values(gates).every(Boolean);
  writeNew(F.finalPreflight, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: preflightPass
      ? 'C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT_PASS' : 'C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT_FAIL',
    generatedUtc: now(), checkpoint: fileRecord(F.checkpoint), authorization: fileRecord(F.authorization), git: gitState,
    preparationArtifacts: preparationRecords, cli: { path: CLI, bytes: EXPECTED.cliBytes, sha256: EXPECTED.cliSha256, version: cliVersion, model: MODEL },
    token, gates, authorizationStatus: 'AUTHORIZED_UNUSED', invocationCount: 0, markerExists: false, modelContacted: false, pass: preflightPass,
  }));
  if (!preflightPass) {
    process.stdout.write(stable({ classification: token.gatePass ? 'C37_CHECKPOINT_69_READ_ONLY_OR_TRANSPORT_BLOCKED' : 'C37_FOUR_HOUR_TOKEN_RESERVE_SAFE_PAUSE_PRE_INVOCATION',
      finalPreflightPass: false, token, authorizationStatus: 'AUTHORIZED_UNUSED', invocationCount: 0, markerCreated: false }));
    process.exitCode = 3;
    return;
  }

  const bootstrapBytes = fs.readFileSync(F.bootstrapMd);
  const schemaText = JSON.stringify(OUTPUT_SCHEMA);
  const beforeInputs = inputSnapshot(runtimeState);
  const persistentBefore = persistentConfigurationSnapshot();
  const startedUtc = now();
  const marker = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER_SUBMISSION_IMMINENT',
    checkpoint: { ordinal: 69, ...fileRecord(F.checkpoint), eventSha256: EXPECTED.checkpointEvent },
    authorization: { ...fileRecord(F.authorization), statusBeforeSubmission: 'AUTHORIZED_UNUSED', invocationOrdinal: 1, maximumInvocations: 1, retryAuthorized: false },
    capsule: { ...fileRecord(F.capsule), conservativeEstimatedTokens: EXPECTED.capsuleTokens },
    package: { entries: 57, rawEvidenceBytes: EXPECTED.packageBytes, sourceManifestSha256: EXPECTED.sourceManifest,
      detailedManifestSha256: EXPECTED.detailedManifest, aggregateSha256: EXPECTED.packageAggregate },
    bootstrap: fileRecord(F.bootstrapMd), toolPlan: fileRecord(F.toolPlan), toolValidation: fileRecord(F.toolValidation),
    contextProjection: fileRecord(F.contextProjection), transportPreflight: fileRecord(F.transportPreflight), finalPreflight: fileRecord(F.finalPreflight),
    cli: { path: CLI, bytes: EXPECTED.cliBytes, sha256: EXPECTED.cliSha256, version: cliVersion }, model: MODEL,
    isolatedMcpConfig: { plannedPath: `${INVOCATION_ROOT}/empty-mcp.json`, bytes: EXPECTED.emptyMcpBytes, sha256: EXPECTED.emptyMcpSha256, strict: true },
    permissionBoundary: { tools: ['Read'], permissionMode: 'dontAsk', exactAllowedReadRules: runtimeState.rules.length, rulesSha256: sha(Buffer.from(runtimeState.rules.join('\n'))), emptyCwd: true, addDir: false },
    outputSchemaSha256: sha(Buffer.from(schemaText)), childStdin: { bytes: bootstrapBytes.length, sha256: sha(bootstrapBytes), capsuleOrOriginalBytesInlined: 0 },
    invocationOrdinal: 1, maximumInvocations: 1, retryAuthorized: false, startedUtc,
  };
  const markerRecord = writeNew(F.marker, stable(marker));

  const nonce = crypto.randomUUID();
  const work = path.join(INVOCATION_ROOT, 'work');
  const runtime = path.join(INVOCATION_ROOT, 'runtime');
  const config = path.join(INVOCATION_ROOT, 'empty-mcp.json');
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(INVOCATION_ROOT, 'OWNERSHIP.json'), stable({ owner: 'PHASE-10A14-R20 COMMIT 5R1-C37 checkpoint 69', nonce, markerSha256: markerRecord.sha256 }), { flag: 'wx' });
  fs.writeFileSync(config, EMPTY_MCP, { flag: 'wx' });
  assert(fs.statSync(config).size === EXPECTED.emptyMcpBytes && shaFile(config) === EXPECTED.emptyMcpSha256 && fs.readdirSync(work).length === 0, 'INVOCATION_TEMP_SETUP');

  const args = ['--print', '--model', MODEL, '--effort', 'max', '--permission-mode', 'dontAsk', '--safe-mode', '--no-session-persistence', '--no-chrome',
    '--mcp-config', config, '--strict-mcp-config', '--disable-slash-commands', '--tools', 'Read', '--allowedTools', ...runtimeState.rules,
    '--output-format', 'stream-json', '--verbose', '--json-schema', schemaText, '--system-prompt', SYSTEM_PROMPT];
  const stdoutFd = fs.openSync(F.stdout, 'wx');
  const stderrFd = fs.openSync(F.stderr, 'wx');
  let child = null;
  let childPid = null;
  let spawnObserved = false;
  let spawnError = null;
  let exitCode = null;
  let signal = null;
  let timedOut = false;
  let stdinWriteInitiated = false;
  let stdinFinishObserved = false;
  let stdinEndCallbackObserved = false;
  let stdinError = null;
  let authorizationConsumed = false;
  try {
    child = spawn(CLI, args, { cwd: work, env: childEnvironment(runtime), windowsHide: true, shell: false, stdio: ['pipe', stdoutFd, stderrFd] });
    childPid = child.pid ?? null;
    child.once('spawn', () => { spawnObserved = true; });
    child.stdin.once('finish', () => { stdinFinishObserved = true; });
    child.stdin.once('error', (error) => { stdinError = error instanceof Error ? error.message : String(error); });
    stdinWriteInitiated = true;
    authorizationConsumed = true;
    child.stdin.end(bootstrapBytes, () => { stdinEndCallbackObserved = true; });
    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => { timedOut = true; if (child && child.pid === childPid) child.kill(); }, 60 * 60 * 1000);
      child.once('error', (error) => { clearTimeout(timer); resolve({ error }); });
      child.once('close', (code, childSignal) => { clearTimeout(timer); resolve({ code, signal: childSignal }); });
    });
    if (result.error) spawnError = result.error instanceof Error ? result.error.message : String(result.error);
    exitCode = result.code ?? null;
    signal = result.signal ?? null;
  } catch (error) {
    spawnError = error instanceof Error ? error.message : String(error);
  } finally {
    fs.fsyncSync(stdoutFd); fs.closeSync(stdoutFd);
    fs.fsyncSync(stderrFd); fs.closeSync(stderrFd);
  }

  const endedUtc = now();
  const stdout = fs.readFileSync(F.stdout);
  const stderr = fs.readFileSync(F.stderr);
  let parsed = { lines: 0, events: 0, invalidLines: [], resultEvents: 0, terminal: null, review: null, readCalls: [], uniqueReadPaths: [], unauthorizedReads: [], models: [] };
  let parseError = null;
  try { parsed = parseStream(stdout, runtimeState, work); } catch (error) { parseError = error instanceof Error ? error.message : String(error); }
  const reviewGate = validateReviewerObject(parsed.review, parsed, runtimeState);
  const reviewArtifact = parsed.review ?? {
    schemaVersion: 1, classification: 'C37_MANIFEST_INDEXED_OPUS_NO_VALID_REVIEWER_OBJECT_CAPTURED', reviewerObjectReceived: false,
    actualDecisionToken: null, actualSubstantiveDispositionToken: null, executorTechnicalError: parseError ?? 'NO_STRUCTURED_REVIEW_OBJECT',
    stdoutSha256: sha(stdout), stderrSha256: sha(stderr), note: 'Executor capture only; no synthetic reviewer decision is asserted.',
  };
  writeNew(F.reviewJson, stable(reviewArtifact));
  writeNew(F.reviewMd, `# C37 manifest-indexed Opus review\n\n- Reviewer object received: ${parsed.review !== null}\n- CLI exit: ${exitCode}\n- Decision: \`${parsed.review?.decision ?? 'NOT_RECEIVED'}\`\n- Substantive disposition: \`${parsed.review?.substantiveDisposition ?? 'NOT_RECEIVED'}\`\n- Observed unique Read paths: ${parsed.uniqueReadPaths.length}\n- Unauthorized Read paths: ${parsed.unauthorizedReads.length}\n- Original spot checks reported: ${parsed.review?.originalSpotChecks?.length ?? 0}\n- Evidence classes covered: ${reviewGate.evidenceClassesCovered ?? 0}/8\n- Approval gate: ${reviewGate.pass ? 'PASS' : 'FAIL'}\n- Authorization consumed: ${authorizationConsumed}\n- Retry authorized: false\n- Technical/parse error: ${parseError ?? 'none'}\n- Gate reasons: ${JSON.stringify(reviewGate.reasons ?? [])}\n- Blocking findings: ${JSON.stringify(parsed.review?.blockingFindings ?? [])}\n- Nonblocking observations: ${JSON.stringify(parsed.review?.nonblockingObservations ?? [])}\n`);
  writeNew(F.reviewCoverage, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: reviewGate.pass
      ? 'C37_MANIFEST_INDEXED_OPUS_REVIEW_COVERAGE_PASS' : 'C37_MANIFEST_INDEXED_OPUS_REVIEW_COVERAGE_FAIL', generatedUtc: endedUtc,
    capsuleReadObserved: reviewGate.capsuleReadObserved ?? false, observedReadCalls: parsed.readCalls.length,
    observedUniqueReadPaths: parsed.uniqueReadPaths, unauthorizedObservedReadPaths: parsed.unauthorizedReads,
    reportedOriginalSpotChecks: reviewGate.originalSpotChecks ?? 0, uniqueOriginalSpotChecks: reviewGate.uniqueOriginalSpotChecks ?? 0,
    evidenceClassesCovered: reviewGate.evidenceClassesCovered ?? 0, requiredEvidenceClasses: 8,
    missingRequiredSpotChecks: reviewGate.missingRequiredSpotChecks ?? REQUIRED_SPOT_PATHS,
    requiredObservedReadMissing: reviewGate.requiredObservedReadMissing ?? REQUIRED_SPOT_PATHS,
    reviewerFilesReportedRead: parsed.review?.filesReportedRead ?? [], priorTechnicalFailureEvidenceAssessed: parsed.review?.priorTechnicalFailureEvidenceAssessed === true,
    unfavorableEvidenceAssessed: parsed.review?.unfavorableEvidenceAssessed === true, rawCaptureLimitationAcknowledged: parsed.review?.rawCaptureLimitationAcknowledged === true,
    mismatches: parsed.review?.mismatches ?? [], unreadMaterialClaims: parsed.review?.unreadMaterialClaims ?? [], unsupportedClaims: parsed.review?.unsupportedClaims ?? [],
    omittedUnfavorableEvidence: parsed.review?.omittedUnfavorableEvidence ?? [], scopeIssues: parsed.review?.scopeIssues ?? [],
    transport: { streamLines: parsed.lines, parsedEvents: parsed.events, invalidLines: parsed.invalidLines, resultEvents: parsed.resultEvents, models: parsed.models },
    gateReasons: reviewGate.reasons ?? [], pass: reviewGate.pass,
  }));

  const afterInputs = inputSnapshot(runtimeState);
  const repositoryInputsUnchanged = beforeInputs.aggregateSha256 === afterInputs.aggregateSha256
    && git('status', '--porcelain=v1', '--untracked-files=no') === '' && git('diff', '--cached', '--name-only') === '';
  let cleanupError = null;
  try {
    assert(!child || child.exitCode !== null || child.signalCode !== null || spawnError !== null, 'CHILD_STILL_ACTIVE');
    removeOwnedTemp(INVOCATION_ROOT, nonce);
  } catch (error) { cleanupError = error instanceof Error ? error.message : String(error); }
  const persistentAfter = persistentConfigurationSnapshot();
  const persistentConfigurationUnchanged = stable(persistentBefore) === stable(persistentAfter);
  const technicalCapturePass = authorizationConsumed && spawnObserved && !spawnError && exitCode === 0 && signal === null && !timedOut
    && stdinFinishObserved && stdinEndCallbackObserved && !stdinError && parsed.invalidLines.length === 0 && parsed.resultEvents === 1
    && parsed.review !== null && parsed.unauthorizedReads.length === 0 && repositoryInputsUnchanged && !cleanupError && persistentConfigurationUnchanged;
  writeNew(F.receipt, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: authorizationConsumed
      ? 'C37_MANIFEST_INDEXED_OPUS_SINGLE_SUBMISSION_RECEIPT' : 'C37_MANIFEST_INDEXED_OPUS_SUBMISSION_NOT_INITIATED',
    provider: 'Anthropic', reviewerTool: 'Claude Code', reviewerModelRequested: MODEL, modelsObserved: parsed.models,
    startedUtc, endedUtc, childPid, spawnObserved, spawnError, exitCode, signal, timedOut,
    authorization: { sha256: EXPECTED.authorization, consumed: authorizationConsumed, invocationOrdinal: 1, maximumInvocations: 1, retryAuthorized: false },
    applicationSubmission: { inputMethod: 'binary-safe child stdin', stdinWriteInitiated, stdinFinishObserved, stdinEndCallbackObserved, stdinError,
      totalStdinBytes: bootstrapBytes.length, stdinSha256: sha(bootstrapBytes), capsuleOrOriginalBytesInApplicationPayload: 0,
      atFileExpansionUsed: false, completeChildStdinAcceptanceConfirmed: stdinFinishObserved && stdinEndCallbackObserved && stdinError === null },
    permissionBoundary: { tools: ['Read'], permissionMode: 'dontAsk', safeMode: true, exactAllowedReadRules: runtimeState.rules.length,
      emptyWorkingDirectory: true, addDir: false, strictEmptyMcp: true, observedReadCalls: parsed.readCalls.length,
      observedUnauthorizedReadCalls: parsed.unauthorizedReads.length },
    transportObservability: { providerRequestObservedFromSuccessfulTerminalEnvelope: parsed.terminal?.subtype === 'success' ? true : null,
      providerStatusObservableFromCli: parsed.terminal ? { subtype: parsed.terminal.subtype ?? null, isError: parsed.terminal.is_error ?? null } : null,
      exactProviderWireBytes: null, exactProviderProtocolFramingObservable: false, noUnsupportedWireTrafficClaim: true },
    usage: parsed.terminal ? { usage: parsed.terminal.usage ?? null, modelUsage: parsed.terminal.modelUsage ?? null,
      totalCostUsd: parsed.terminal.total_cost_usd ?? null, durationMs: parsed.terminal.duration_ms ?? null,
      durationApiMs: parsed.terminal.duration_api_ms ?? null, numTurns: parsed.terminal.num_turns ?? null } : null,
    response: { stdout: fileRecord(F.stdout), stderr: fileRecord(F.stderr), reviewJson: fileRecord(F.reviewJson), reviewMarkdown: fileRecord(F.reviewMd),
      reviewCoverage: fileRecord(F.reviewCoverage), reviewerObjectReceived: parsed.review !== null,
      decisionToken: parsed.review?.decision ?? null, substantiveDispositionToken: parsed.review?.substantiveDisposition ?? null },
    repositoryInputsUnchanged, persistentConfigurationBefore: persistentBefore, persistentConfigurationAfter: persistentAfter,
    persistentConfigurationUnchanged, invocationTempRootRemoved: !fs.existsSync(INVOCATION_ROOT), cleanupError,
    authorizationStatusAfterInvocation: authorizationConsumed ? 'CONSUMED_NO_RETRY_AUTHORIZED' : 'AUTHORIZED_UNUSED',
    technicalCapturePass, pass: authorizationConsumed && repositoryInputsUnchanged && persistentConfigurationUnchanged,
  }));
  writeNew(F.capture, stable({
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: technicalCapturePass
      ? 'C37_MANIFEST_INDEXED_OPUS_CLI_CAPTURE_COMPLETE' : 'C37_MANIFEST_INDEXED_OPUS_CLI_CAPTURE_TECHNICAL_INCOMPLETE',
    commandWithoutCredentials: [CLI, '--print', '--model', MODEL, '--effort', 'max', '--permission-mode', 'dontAsk', '--safe-mode',
      '--no-session-persistence', '--no-chrome', '--mcp-config', '<TEMP_EMPTY_MCP_JSON>', '--strict-mcp-config', '--disable-slash-commands',
      '--tools', 'Read', '--allowedTools', `<${runtimeState.rules.length}_EXACT_READ_RULES_SHA256:${sha(Buffer.from(runtimeState.rules.join('\n')))}>`,
      '--output-format', 'stream-json', '--verbose', '--json-schema', `<SHA256:${sha(Buffer.from(schemaText))}>`, '--system-prompt', `<SHA256:${sha(Buffer.from(SYSTEM_PROMPT))}>`],
    commandLineContainsEvidenceOrCredentials: false, startedUtc, endedUtc, childPid, spawnObserved, spawnError, exitCode, signal, timedOut,
    stdinWriteInitiated, stdinFinishObserved, stdinEndCallbackObserved, stdinError, authorizationConsumed, retryAuthorized: false,
    marker: markerRecord, finalPreflight: fileRecord(F.finalPreflight), cli: { path: CLI, bytes: EXPECTED.cliBytes, sha256: EXPECTED.cliSha256, version: cliVersion },
    modelRequested: MODEL, modelsObserved: parsed.models, isolatedConfig: { bytes: EXPECTED.emptyMcpBytes, sha256: EXPECTED.emptyMcpSha256, removedAfterCapture: !fs.existsSync(INVOCATION_ROOT), cleanupError },
    response: { stdout: fileRecord(F.stdout), stderr: fileRecord(F.stderr), reviewJson: fileRecord(F.reviewJson), reviewMarkdown: fileRecord(F.reviewMd),
      receipt: fileRecord(F.receipt), coverage: fileRecord(F.reviewCoverage), parseError, streamLines: parsed.lines, parsedEvents: parsed.events, resultEvents: parsed.resultEvents },
    decisionToken: parsed.review?.decision ?? null, substantiveDispositionToken: parsed.review?.substantiveDisposition ?? null,
    observations: parsed.review?.nonblockingObservations ?? [], reviewGate, repositoryInputsUnchanged, persistentConfigurationUnchanged,
    technicalCapturePass, reviewApprovalGatePass: reviewGate.pass, pass: technicalCapturePass,
  }));
  const classification = !technicalCapturePass ? 'C37_FOUR_HOUR_SAFE_PAUSE_MANIFEST_INDEXED_OPUS_TECHNICAL_INCOMPLETE'
    : reviewGate.pass ? 'C37_MANIFEST_INDEXED_OPUS_APPROVED_FINALIZATION_AUTHORIZED'
      : parsed.review?.decision === 'REJECTED' ? 'C37_FOUR_HOUR_SAFE_PAUSE_MANIFEST_INDEXED_OPUS_REJECTED'
        : parsed.review?.substantiveDisposition === 'MORE_EVIDENCE_REQUIRED' ? 'C37_FOUR_HOUR_SAFE_PAUSE_MORE_EVIDENCE_REQUIRED'
          : 'C37_FOUR_HOUR_SAFE_PAUSE_REVIEW_COVERAGE_INCOMPLETE';
  process.stdout.write(stable({ classification, exitCode, decision: parsed.review?.decision ?? null,
    substantiveDisposition: parsed.review?.substantiveDisposition ?? null, observedReadCalls: parsed.readCalls.length,
    observedUniqueReadPaths: parsed.uniqueReadPaths.length, unauthorizedReadPaths: parsed.unauthorizedReads.length,
    reviewGatePass: reviewGate.pass, technicalCapturePass, authorizationConsumed, retryAuthorized: false, cleanupError }));
  if (!technicalCapturePass || !reviewGate.pass) process.exitCode = 2;
}

async function main() {
  const mode = process.argv[2];
  if (mode === '--prepare') prepare();
  else if (mode === '--invoke') await invoke();
  else throw new Error('USAGE: --prepare | --invoke');
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
