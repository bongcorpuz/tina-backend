// Checkpoint 69: capsule complete, mandatory pre-invocation token-gate safe pause.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const RESULTS = path.dirname(SELF);
const REPO = path.resolve(RESULTS, '../../..');
const R = (name) => path.join(RESULTS, name);
const F = Object.freeze({
  authorization: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_EXTERNAL_AUTHORIZATION.json'),
  ledger: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson'),
  preflight: R('COMMIT_5R1C37_CHECKPOINT_68_CONTINUATION_PREFLIGHT.json'),
  protected: R('COMMIT_5R1C37_CHECKPOINT_68_PROTECTED_RESIDUE_VERIFICATION.json'),
  authContinuity: R('COMMIT_5R1C37_CHECKPOINT_68_AUTHORIZATION_CONTINUITY.json'),
  roleLedger: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ROLE_LEDGER.json'),
  allowlist: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ALLOWLIST.json'),
  builder: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE_BUILDER.mjs'),
  capsule: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.json'),
  capsuleMd: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.md'),
  coverage: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_COVERAGE_VALIDATION.json'),
  estimate: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE_TOKEN_ESTIMATE.json'),
  cp68: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_68_manifest_indexed_token_reserve_safe_pause_pre_invocation.json'),
  replay68: R('COMMIT_5R1C37_CHECKPOINT_68_IDEMPOTENCE_REPLAY.json'),
  evidence68: R('COMMIT_5R1C37_CHECKPOINT_68_TOKEN_SAFE_PAUSE_EVIDENCE.sha256'),
  reconciliation: R('COMMIT_5R1C37_CHECKPOINT_69_CAPSULE_COMPLETE_TOKEN_SAFE_PAUSE_RECONCILIATION.json'),
  handoff: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_69.md'),
  terminal: R('COMMIT_5R1C37_CHECKPOINT_69_CAPSULE_COMPLETE_TOKEN_SAFE_PAUSE_TERMINAL_STATE.json'),
  evidence: R('COMMIT_5R1C37_CHECKPOINT_69_CAPSULE_COMPLETE_TOKEN_SAFE_PAUSE_EVIDENCE.sha256'),
  numbered: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_69_manifest_indexed_capsule_complete_token_reserve_safe_pause_pre_invocation.json'),
  replay: R('COMMIT_5R1C37_CHECKPOINT_69_IDEMPOTENCE_REPLAY.json'),
  pointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
});
const classification = 'C37_FOUR_HOUR_TOKEN_RESERVE_SAFE_PAUSE_PRE_INVOCATION';
const nextExact = 'Start a brand-new governed session from checkpoint 69; measure fresh Codex context, reverify checkpoint/Git/protected/package/authorization and the completed capsule, then create and validate the read-only Opus tool plan, bootstrap, provider-context plan, transport preflight, and final preflight. Invoke exactly once only if fresh remaining context is at least 120,000 tokens and every gate passes.';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const record = (file) => { const data = fs.readFileSync(file); return { path: rel(file), bytes: data.length, sha256: sha(data) }; };
const assert = (condition, code) => { if (!condition) throw new Error(`CHECKPOINT_69_BLOCKED:${code}`); };
function writeNew(file, value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const fd = fs.openSync(file, 'wx');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return record(file);
}
function writeOrVerify(file, value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  if (!fs.existsSync(file)) return writeNew(file, data);
  assert(fs.readFileSync(file).equals(data), `PARTIAL_RECOVERY_MISMATCH:${rel(file)}`);
  return record(file);
}
function replaceIncompleteEvidence(file, value) {
  const data = Buffer.from(value, 'utf8');
  if (!fs.existsSync(file)) return writeNew(file, data);
  assert(!fs.existsSync(F.numbered) && !fs.existsSync(F.replay), 'EVIDENCE_ALREADY_BOUND');
  const fd = fs.openSync(file, 'w');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return record(file);
}
function git(...args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_GLOBAL: 'NUL' } }).trim();
}

for (const file of [F.numbered, F.replay]) assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
const authorization = readJson(F.authorization);
const preflight = readJson(F.preflight);
const protectedState = readJson(F.protected);
const coverage = readJson(F.coverage);
const estimate = readJson(F.estimate);
const capsule = readJson(F.capsule);
const cp68 = readJson(F.cp68);
const replay68 = readJson(F.replay68);
assert(authorization.newAuthorization.status === 'AUTHORIZED_UNUSED' && authorization.authorizationConsumed === false, 'AUTHORIZATION');
assert(preflight.pass && preflight.safeToContinue && protectedState.pass, 'PREFLIGHT');
assert(coverage.pass && coverage.integrityCoverage.verified === 57 && coverage.semanticCoverage.percentage === 100, 'COVERAGE');
assert(coverage.semanticCoverage.unsupportedCapsuleClaims === 0 && coverage.semanticCoverage.omittedUnfavorableEvidence === 0, 'SEMANTIC_COVERAGE');
assert(estimate.pass && estimate.conservativeEstimatedTokens === 188684, 'CAPSULE_SIZE');
assert(record(F.capsule).sha256 === coverage.outputs.capsuleJson.sha256 && capsule.pass, 'CAPSULE_HASH');
assert(cp68.ordinal === 68 && cp68.safeToResume && replay68.pass, 'CHECKPOINT_68');
assert(!fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json')), 'INVOCATION_MARKER');
assert(!fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_BOOTSTRAP.json')), 'BOOTSTRAP');
assert(!fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW.json')), 'REVIEW');

const head = git('rev-parse', 'HEAD');
const upstream = git('rev-parse', '@{upstream}');
const fetchHead = git('rev-parse', 'FETCH_HEAD');
const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').split(/\s+/).map(Number);
assert(head === 'ee664eab4529c636f34cb6d37d23a6a497886a17' && upstream === head && fetchHead === head, 'GIT_HEAD');
assert(ahead === 0 && behind === 0 && git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '', 'GIT_CLEAN');
assert(!fs.existsSync(path.join(REPO, '.git/index.lock')), 'INDEX_LOCK');

const now = fs.existsSync(F.reconciliation) ? readJson(F.reconciliation).generatedUtc : new Date().toISOString();
const reconciliation = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification, generatedUtc: now,
  startingCheckpoint: { ordinal: 68, ...record(F.cp68), eventSha256: cp68.eventSha256 }, endingCheckpoint: 69,
  freshSessionGate: { remainingAtStart: 204539, required: 200000, pass: true },
  postCapsuleTokenGate: { ledgerSequence: 13, effectiveWindow: 258400, active: 187380, remaining: 71020, preSubmissionRequired: 120000, shortfall: 48980, reserve: 54400, headroomAboveReserve: 16620 },
  capsule: { roleLedger: record(F.roleLedger), allowlist: record(F.allowlist), builder: record(F.builder), json: record(F.capsule), markdown: record(F.capsuleMd), coverage: record(F.coverage), tokenEstimate: record(F.estimate), integrity: '57/57', semanticCoveragePercent: 100, deterministicRepeat: true, conservativeEstimatedTokens: 188684 },
  authorization: { ...record(F.authorization), status: 'AUTHORIZED_UNUSED', invocationCount: 0, remainingInvocationCount: 1, retryAuthorized: false },
  invocationMarkerExists: false, providerRequestObserved: false, modelRequestSubmitted: false, reviewerObjectReceived: false,
  bootstrapCreated: false, toolBoundaryValidated: false, providerContextPlanCreated: false, transportPreflightCreated: false,
  runtimeOracleRegistryWalDocsGitMutations: 0, stagingPerformed: false, commitCreated: false, pushPerformed: false,
  head, upstream, fetchHead, ahead, behind, stagingEmpty: true, trackedWorktreeClean: true,
  blocker: 'CODEX_PRE_SUBMISSION_120000_TOKEN_GATE_NOT_MET_AFTER_CAPSULE_BUILD', nextExactOperation: nextExact,
  safeToResume: true, activeAttemptId: null, pass: true,
};
writeOrVerify(F.reconciliation, stable(reconciliation));

const handoff = `# C37 four-hour resume handoff from checkpoint 69\n\nClassification: \`${classification}\`\n\nThe checkpoint-68 fresh-session gate passed with 204,539 remaining tokens. Checkpoint 68, its replay/evidence, live Git tip, protected residue, the immutable 57-entry package, and the existing manifest-indexed authorization all verified. The authorization remains unused: invocation count 0, marker absent, provider request absent, and retry false.\n\nThe deterministic review-role ledger, exact read-only allowlist, capsule builder, semantic JSON capsule, Markdown index, coverage validation, and token estimate are complete. Package integrity is 57/57 over 4,109,852 bytes. Semantic coverage is 100% across 45 semantic-core entries and all 145 adjudicated rows, with zero unsupported capsule claims, zero omitted unfavorable evidence, all eight evidence classes present, and a repeat-matching capsule SHA-256 of ${record(F.capsule).sha256}. The combined capsule is 452,840 UTF-8 bytes and conservatively estimated at 188,684 tokens, 11,316 below its 200,000-token cap.\n\nPost-build live Codex telemetry reported 187,380 active tokens in the 258,400-token effective window, leaving 71,020. This is 48,980 below the mandatory 120,000-token pre-submission gate, so no read-only-tool plan, bootstrap, provider-context plan, transport preflight, final invocation preflight, invocation marker, provider request, review, documentation cutover, staging, commit, or push was started.\n\nHEAD, upstream, and live FETCH_HEAD remain ${head}, ahead/behind 0/0, with clean tracked and staged state. Runtime/oracle/fixture/registry/WAL state remains preserved. The user-owned VS Code Claude process was untouched. No C38, E2, A15, Phase 10B, deployment, reindexing, or model migration work began.\n\nExact next operation: ${nextExact}\n\nThis handoff grants no additional invocation or phase authority. The existing manifest-indexed authorization remains the sole unused one-use authorization.\n`;
writeOrVerify(F.handoff, handoff);

const terminal = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification, generatedUtc: now,
  checkpoint: 69, stage: 'manifest-indexed capsule complete; pre-invocation token safe pause',
  reason: 'Fresh-session capsule preparation completed, but remaining context is below the 120,000-token submission gate.',
  capsuleComplete: true, capsuleValidated: true, manifestIndexedAuthorizationUnused: true, manifestIndexedInvocationCount: 0,
  invocationMarkerExists: false, providerRequestObserved: false, reviewerDecision: null,
  docsUpdated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
  safeToResume: true, activeAttemptId: null, nextExactOperation: nextExact, pass: true,
};
writeOrVerify(F.terminal, stable(terminal));

const evidenceFiles = [SELF, F.authorization, F.ledger, F.preflight, F.protected, F.authContinuity, F.roleLedger, F.allowlist, F.builder, F.capsule, F.capsuleMd, F.coverage, F.estimate, F.cp68, F.replay68, F.evidence68, F.reconciliation, F.handoff, F.terminal]
  .sort((a, b) => rel(a).localeCompare(rel(b)));
replaceIncompleteEvidence(F.evidence, `${evidenceFiles.map((file) => `${record(file).sha256}  ${rel(file)}`).join('\n')}\n`);

const logShaBeforeAppend = record(F.log).sha256;
const checkpointBase = {
  schemaVersion: 2, ordinal: 69, commitUnit: 'PHASE-10A14-R20 COMMIT 5R1-C37', updatedAtUtc: now,
  stage: 'manifest-indexed capsule complete pre-invocation token-reserve safe pause', status: classification,
  head, upstream, remoteTip: fetchHead, parent: 'd5b25e676f623fbc1888608ff250824fcd34af99', branch: 'feature/source-availability-engine-v1',
  activeReasonBaseHash: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775', c35RuntimeHash: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c', activeAttemptId: null,
  decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', reasonOnlyRowsRemaining: 145,
  frozenDecision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', generalizedRuntimeDefects: 0,
  phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW', r20: 'IN_PROGRESS', c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL', c37: 'SAFE_PAUSED_MANIFEST_INDEXED_CAPSULE_COMPLETE_PRE_INVOCATION',
  priorAuthorizationsConsumed: 2, manifestIndexedAuthorizationStatus: 'AUTHORIZED_UNUSED', manifestIndexedAuthorizationConsumed: false, manifestIndexedInvocationCount: 0, manifestIndexedRetryAuthorized: false,
  providerRequestObserved: false, modelReviewReached: false, reviewerObjectReceived: false, decisionToken: null, substantivePathToken: null,
  package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb', detailedManifestSha256: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0', aggregateSha256: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08', unchanged: true, pass: true },
  token: { ledgerSequence: 13, effectiveContextWindowTokens: 258400, activeContextTokens: 187380, remainingTokens: 71020, preSubmissionRequiredTokens: 120000, preSubmissionShortfallTokens: 48980, requiredReserveTokens: 54400, headroomAboveReserveTokens: 16620, decision: 'SAFE_PAUSE_PRE_INVOCATION_AFTER_CAPSULE_CAPTURE' },
  roleLedgerCreated: true, allowlistCreated: true, capsuleCreated: true, capsuleValidated: true, capsuleSemanticCoveragePercent: 100, capsuleConservativeEstimatedTokens: 188684,
  bootstrapCreated: false, toolBoundaryValidated: false, providerContextPlanCreated: false, transportPreflightCreated: false, invocationMarkerExists: false,
  roadmapV9Updated: false, currentStateUpdated: false, finalApprovalManifestCreated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
  stagingEmpty: true, trackedWorktreeClean: true, headEqualsUpstream: true, ahead, behind, protectedResiduePreserved: true,
  deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false, e2Begun: false, a15Begun: false, c38Begun: false, phase10BImplementationBegun: false,
  authorization: record(F.authorization), reconciliation: record(F.reconciliation), fourHourResumeHandoff: record(F.handoff), terminalState: record(F.terminal), evidenceManifest: record(F.evidence), capsule: record(F.capsule), coverage: record(F.coverage),
  previousCheckpoint: { ordinal: 68, ...record(F.cp68), eventSha256: cp68.eventSha256, logSha256BeforeAppend: logShaBeforeAppend },
  blocker: 'CODEX_PRE_SUBMISSION_120000_TOKEN_GATE_NOT_MET_AFTER_CAPSULE_BUILD', safePauseReason: classification, nextExactOperation: nextExact, safeToResume: true,
};
const eventSha256 = sha(Buffer.from(stable(checkpointBase), 'utf8'));
const checkpoint = { ...checkpointBase, eventSha256 };
writeNew(F.numbered, stable(checkpoint));
const pointerFd = fs.openSync(F.pointer, 'w');
try { fs.writeFileSync(pointerFd, fs.readFileSync(F.numbered)); fs.fsyncSync(pointerFd); } finally { fs.closeSync(pointerFd); }
assert(fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered)), 'POINTER');
const before = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert(before.map((row) => row.ordinal).join(',') === '64,65,66,67,68', 'LOG_BEFORE');
const logFd = fs.openSync(F.log, 'a');
try { fs.writeFileSync(logFd, `${JSON.stringify(checkpoint)}\n`); fs.fsyncSync(logFd); } finally { fs.closeSync(logFd); }
const after = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const replay = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_69_IDEMPOTENCE_REPLAY_PASS', generatedUtc: new Date().toISOString(),
  checkpoint: record(F.pointer), numberedCheckpoint: record(F.numbered), checkpointLog: record(F.log), eventSha256, checkpointOrdinals: after.map((row) => row.ordinal),
  pointerEqualsNumberedCheckpoint: fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered)), previousCheckpoint68Preserved: record(F.cp68).sha256 === checkpointBase.previousCheckpoint.sha256,
  noDuplicateCheckpoint: after.length === 6 && new Set(after.map((row) => row.ordinal)).size === 6,
  capsuleCompleteAndValidated: coverage.pass && estimate.pass, manifestIndexedAuthorizationUnused: true,
  noManifestIndexedInvocationMarker: !fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json')),
  noBootstrapReviewDocsStagingCommit: true, safeToResume: true, activeAttemptId: null, pass: true,
};
writeNew(F.replay, stable(replay));
process.stdout.write(`${JSON.stringify({ classification, checkpoint: record(F.numbered), eventSha256, replay: record(F.replay), evidence: record(F.evidence), capsule: record(F.capsule), authorization: 'AUTHORIZED_UNUSED', pass: true })}\n`);
