// PHASE-10A14-R20 COMMIT 5R1-C37
// Write-once technical-incomplete reconciliation and checkpoint-67 driver.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const R = (name) => path.join(RESULTS, name);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const now = () => new Date().toISOString();
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: 'utf8' }).trim();

const F = Object.freeze({
  pointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  cp66: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_66_token_reserve_safe_pause_pre_invocation.json'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  marker: R('COMMIT_5R1C37_REPLACEMENT_OPUS_INVOCATION_MARKER.json'),
  capture: R('COMMIT_5R1C37_REPLACEMENT_OPUS_CLI_CAPTURE.json'),
  stdout: R('COMMIT_5R1C37_REPLACEMENT_OPUS_STDOUT.txt'),
  stderr: R('COMMIT_5R1C37_REPLACEMENT_OPUS_STDERR.txt'),
  reviewJson: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REVIEW.json'),
  reviewMd: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REVIEW.md'),
  receipt: R('COMMIT_5R1C37_REPLACEMENT_OPUS_TRANSMISSION_RECEIPT.json'),
  ledger: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson'),
  finalPreflight: R('COMMIT_5R1C37_CHECKPOINT_66_REPLACEMENT_OPUS_FINAL_PREFLIGHT.json'),
  driver: fileURLToPath(import.meta.url),
  adjudication: R('COMMIT_5R1C37_REPLACEMENT_OPUS_PROMPT_TOO_LONG_TECHNICAL_ADJUDICATION.json'),
  reconciliation: R('COMMIT_5R1C37_CHECKPOINT_67_REPLACEMENT_OPUS_TECHNICAL_INCOMPLETE_RECONCILIATION.json'),
  handoff: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_67.md'),
  terminal: R('COMMIT_5R1C37_CHECKPOINT_67_REPLACEMENT_OPUS_TECHNICAL_INCOMPLETE_TERMINAL_STATE.json'),
  evidence: R('COMMIT_5R1C37_CHECKPOINT_67_REPLACEMENT_OPUS_TECHNICAL_INCOMPLETE_EVIDENCE.sha256'),
  numbered: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_67_replacement_opus_prompt_too_long_technical_incomplete.json'),
  replay: R('COMMIT_5R1C37_CHECKPOINT_67_IDEMPOTENCE_REPLAY.json'),
});

const EXPECTED = Object.freeze({
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  parent: 'd5b25e676f623fbc1888608ff250824fcd34af99',
  cp66: '8348750e6fb07df633514d8170c2da9c9493980f96eb61d656f205e7f4631626',
  log66: '639d22381969200b857333a5ff397a636b4d69a6a05ac3727304e9b670250cfd',
  marker: 'a99bb6c7dde53d4b778a8e0e8fec0d5bb47292340baf70fef9e34dad1ef4d0ff',
  capture: '93723f4dbdb5e9c2d21a7fc40f80992e0e8267325426a7497a7cb45269e54b97',
  stdout: 'd3e5a82a70d840593b682a7a54dd745e5adad6e77f7abeef8a25573e7568d142',
  stderr: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  reviewJson: 'fe63064f2d4027bbd2f59fa6d8456009dd0726f85afe7035f04d665315ac0ddb',
  reviewMd: '15173717f963472fa8ec8fef1857e045701e18c271257d0c350845b6ff5044c7',
  receipt: '51fef225382d5072696fe693b4da58accc82d0b09ed148b6c7b930cc4f768a9e',
  ledger: '7d2f72a44e258acdf08c726f02e50754fd35613b2102e84395db69c9b37811ae',
  authorization: '72a6c3eb7cbefec17c8bd19062c4002ca7b9322533ddfef3cae605032985452e',
  packageSource: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  packageManifest: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0',
  packageAggregate: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',
  c35: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
  selectedReason: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  registry: 'a0261acfcc4cc69615794fe6f26117c00789d42862a75fae3e978b2e17a1e073',
  c34Wal: '2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2',
  c35Wal: 'd86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f',
});

function fileRecord(file) {
  const data = fs.readFileSync(file);
  return { path: rel(file), bytes: data.length, sha256: sha(data) };
}

function writeNew(file, data) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const fd = fs.openSync(file, 'wx');
  try { fs.writeFileSync(fd, payload); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return fileRecord(file);
}

function overwritePointerFrom(numbered) {
  const data = fs.readFileSync(numbered);
  const fd = fs.openSync(F.pointer, 'w');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  assert(fs.readFileSync(F.pointer).equals(data), 'POINTER_COPY_FAILED');
}

function lineCount(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim()).length : 0;
}

function preflight() {
  for (const file of [F.adjudication, F.reconciliation, F.handoff, F.terminal, F.evidence, F.numbered, F.replay]) assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
  assert(shaFile(F.pointer) === EXPECTED.cp66 && shaFile(F.cp66) === EXPECTED.cp66, 'CHECKPOINT66_DRIFT');
  assert(shaFile(F.log) === EXPECTED.log66, 'CHECKPOINT_LOG_DRIFT');
  assert(shaFile(F.marker) === EXPECTED.marker && shaFile(F.capture) === EXPECTED.capture, 'CAPTURE_DRIFT');
  assert(shaFile(F.stdout) === EXPECTED.stdout && shaFile(F.stderr) === EXPECTED.stderr, 'RAW_CAPTURE_DRIFT');
  assert(shaFile(F.reviewJson) === EXPECTED.reviewJson && shaFile(F.reviewMd) === EXPECTED.reviewMd && shaFile(F.receipt) === EXPECTED.receipt, 'REVIEW_RECEIPT_DRIFT');
  assert(shaFile(F.ledger) === EXPECTED.ledger && lineCount(F.ledger) === 9, 'TOKEN_LEDGER_DRIFT');
  const stdout = readJson(F.stdout);
  assert(stdout.type === 'result' && stdout.is_error === true && stdout.api_error_status === 400, 'EXPECTED_API_400_MISSING');
  assert(stdout.terminal_reason === 'prompt_too_long' && stdout.duration_api_ms === 0, 'PROMPT_TOO_LONG_FIELDS');
  assert(stdout.usage?.input_tokens === 0 && stdout.usage?.output_tokens === 0 && Object.keys(stdout.modelUsage ?? {}).length === 0, 'MODEL_USAGE_NOT_ZERO');
  const capture = readJson(F.capture);
  const receipt = readJson(F.receipt);
  assert(capture.authorizationConsumed === true && capture.retryAuthorized === false && capture.decisionToken === null && capture.substantivePathToken === null, 'CAPTURE_ADJUDICATION_FIELDS');
  assert(receipt.authorization.consumed === true && receipt.authorization.retryAuthorized === false && receipt.applicationSubmission.completeChildStdinAcceptanceConfirmed === true, 'RECEIPT_FIELDS');
  assert(receipt.applicationSubmission.totalStdinBytes === 4193594 && receipt.applicationSubmission.rawEvidenceBytes === 4109852, 'SUBMISSION_BYTES');
  assert(git('rev-parse', 'HEAD') === EXPECTED.head && git('rev-parse', '@{upstream}') === EXPECTED.head, 'GIT_IDENTITY');
  assert(git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '', 'GIT_NOT_CLEAN');
  assert(!fs.existsSync('C:/tmp/c37-replacement-checkpoint66-20260801T123200Z'), 'TASK_TEMP_REMAINS');
  assert(shaFile(R('CANONICAL_ATTEMPT_REGISTRY.json')) === EXPECTED.registry, 'REGISTRY_DRIFT');
  assert(shaFile(R('COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson')) === EXPECTED.c34Wal, 'C34_WAL_DRIFT');
  assert(shaFile(R('COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson')) === EXPECTED.c35Wal, 'C35_WAL_DRIFT');
  assert(!fs.existsSync(R('COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson')) && !fs.existsSync(R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson')), 'C36_C37_WAL_EXISTS');
  return { stdout, capture, receipt };
}

const { stdout, capture, receipt } = preflight();
const generatedUtc = now();
const classification = 'C37_FOUR_HOUR_SAFE_PAUSE_REPLACEMENT_OPUS_TECHNICAL_INCOMPLETE';

const adjudication = {
  schemaVersion: 1,
  unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
  classification: 'C37_REPLACEMENT_OPUS_PROMPT_TOO_LONG_TECHNICAL_INCOMPLETE',
  generatedUtc,
  invocation: {
    ordinal: 1,
    maximumAuthorized: 1,
    authorizationSha256: EXPECTED.authorization,
    authorizationConsumed: true,
    retryAuthorized: false,
    marker: fileRecord(F.marker),
    capture: fileRecord(F.capture),
  },
  applicationSubmission: {
    completeChildStdinAcceptanceConfirmed: true,
    totalStdinBytes: 4193594,
    stdinSha256: receipt.applicationSubmission.stdinSha256,
    evidenceEntries: 57,
    rawEvidenceBytes: 4109852,
    evidenceBeyondAuthorizedPackageIncluded: false,
  },
  cliResult: {
    exitCode: 1,
    apiErrorStatus: 400,
    terminalReason: 'prompt_too_long',
    reportedApproximateRequestTokens: 1828851,
    reportedRequestLimitTokens: 1000000,
    reportedConversationTokens: 1046914,
    durationApiMilliseconds: 0,
    inputTokens: 0,
    outputTokens: 0,
    modelUsage: {},
    totalCostUsd: 0,
    stdout: fileRecord(F.stdout),
    stderr: fileRecord(F.stderr),
  },
  adjudication: {
    modelReviewReached: false,
    reviewerObjectReceived: false,
    decisionToken: null,
    substantivePathToken: null,
    semanticRejection: false,
    semanticApproval: false,
    rootCause: 'The unchanged authorized 57-entry application submission exceeded Claude Code/Anthropic single-exchange prompt capacity before model inference.',
    packageDefect: false,
    mcpConfigurationDefect: false,
    technicalFailure: true,
    noRetryPermitted: true,
  },
  transportObservability: {
    providerRequestObserved: null,
    cliApiErrorEnvelopeObserved: true,
    modelEnvelopeObserved: false,
    exactProviderWireBytes: null,
    confirmedModelInputTokens: 0,
  },
  package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: EXPECTED.packageSource, detailedManifestSha256: EXPECTED.packageManifest, aggregateSha256: EXPECTED.packageAggregate, unchanged: true },
  finalizationAuthorized: false,
  pass: true,
};
writeNew(F.adjudication, stable(adjudication));

const reconciliation = {
  schemaVersion: 1,
  unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
  classification,
  generatedUtc,
  startingCheckpoint: { ordinal: 66, sha256: EXPECTED.cp66 },
  endingCheckpoint: 67,
  finalPreflight: fileRecord(F.finalPreflight),
  technicalAdjudication: fileRecord(F.adjudication),
  review: { reviewerObjectReceived: false, decisionToken: null, substantivePathToken: null, semanticRejection: false, approvalGatePass: false },
  authorization: { statusBefore: 'AUTHORIZED_UNUSED', statusAfter: 'CONSUMED_NO_RETRY_AUTHORIZED', invocationCount: 1, maximumInvocations: 1, retryAuthorized: false },
  token: { ledgerSequence: 9, effectiveContextWindowTokens: 258400, activeContextTokens: 169775, remainingTokens: 88625, requiredReserveTokens: 54400, headroomAboveReserveTokens: 34225, decision: 'SAFE_PAUSE_AFTER_TECHNICAL_INCOMPLETE_CAPTURE' },
  git: { head: EXPECTED.head, upstream: EXPECTED.head, remoteTip: EXPECTED.head, ahead: 0, behind: 0, stagingEmpty: true, trackedTreeClean: true },
  hygiene: { taskOwnedProcesses: 0, userOwnedVsCodeClaudeProcesses: 1, userOwnedVsCodeClaudePid: 24136, userOwnedProcessUntouched: true, port5173Listeners: 0, locks: 0, taskTempExists: false },
  runtimeOracleRegistryWal: { c35CompositeSha256: EXPECTED.c35, selectedReasonRuntimeSha256: EXPECTED.selectedReason, registrySha256: EXPECTED.registry, c34WalSha256: EXPECTED.c34Wal, c35WalSha256: EXPECTED.c35Wal, c36WalAbsent: true, c37WalAbsent: true, mutations: 0 },
  finalization: { phase10AAssessmentCreated: false, roadmapV9Updated: false, currentStateUpdated: false, finalManifestCreated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false },
  prohibitedWork: { c38: false, e2: false, a15: false, phase10B: false, deployment: false, reindex: false, modelMigration: false },
  exactNextOperation: 'A future owner-governed prompt must choose a technically feasible independent-review mechanism and explicitly issue any new authorization. The consumed replacement authorization cannot be reused or retried, and the 57-entry package cannot be changed under the completed authorization.',
  safeToResume: true,
  activeAttemptId: null,
  pass: true,
};
writeNew(F.reconciliation, stable(reconciliation));

const handoff = `# C37 four-hour resume handoff from checkpoint 67\n\nClassification: \`${classification}\`\n\nThe single checkpoint-66 replacement authorization was used exactly once. The exclusive marker is ${EXPECTED.marker}. Claude Code 2.1.212 accepted the complete 4,193,594-byte child-stdin submission containing the unchanged 57-entry / 4,109,852-byte package, then exited 1 with an API-style 400 \`prompt_too_long\` result before model inference. The CLI reported approximately 1,828,851 request tokens against a 1,000,000-token limit, with zero input/output/model-usage tokens, zero API-duration milliseconds, and no reviewer object. This is a technical incomplete, not a semantic rejection.\n\nThe replacement authorization is consumed, invocation count is 1/1, and no retry is authorized. Decision and substantive tokens are null. No documentation cutover, assessment, final manifest, staging, commit, or push was performed. C36 and C37 remain nonterminal; Phase 10A and R20 remain open.\n\nPackage identities remain: source manifest ${EXPECTED.packageSource}, detailed manifest ${EXPECTED.packageManifest}, aggregate ${EXPECTED.packageAggregate}, 57 entries, 4,109,852 raw evidence bytes. Runtime, oracle, fixtures, registry, and WALs remain unchanged. HEAD/upstream/live remote remain ${EXPECTED.head}, 0/0, staging empty, tracked tree clean. The task-owned temp root was removed after child close. User-owned VS Code Claude PID 24136 was untouched.\n\nPost-capture token telemetry recorded 88,625 remaining of the effective 258,400-token session window, preserving 34,225 tokens above the stricter 54,400 reserve.\n\nExact next operation: a future owner-governed prompt must select a technically feasible independent-review mechanism and explicitly issue any new authorization. The consumed replacement authorization cannot be reused or retried. This handoff grants no Opus call, package change, C38, E2, A15, Phase 10B, deployment, reindexing, or model migration authority.\n`;
writeNew(F.handoff, handoff);

const terminal = {
  schemaVersion: 1,
  unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
  classification,
  generatedUtc,
  reason: 'The one authorized replacement submission exceeded the provider single-exchange prompt capacity before model review; authorization is consumed and retry is prohibited.',
  technicalAdjudication: fileRecord(F.adjudication),
  reconciliation: fileRecord(F.reconciliation),
  handoff: fileRecord(F.handoff),
  replacementAuthorizationConsumed: true,
  replacementInvocationCount: 1,
  retryAuthorized: false,
  reviewerObjectReceived: false,
  decisionToken: null,
  substantivePathToken: null,
  documentationUpdated: false,
  stagingPerformed: false,
  commitCreated: false,
  pushPerformed: false,
  runtimeOracleRegistryWalMutationCount: 0,
  c38Begun: false,
  e2Begun: false,
  a15Begun: false,
  phase10BBegun: false,
  deploymentPerformed: false,
  reindexPerformed: false,
  modelMigrationPerformed: false,
  safeToResume: true,
  activeAttemptId: null,
  pass: true,
};
writeNew(F.terminal, stable(terminal));

const evidenceFiles = [
  F.driver, F.finalPreflight, F.marker, F.capture, F.stdout, F.stderr, F.reviewJson, F.reviewMd, F.receipt,
  F.ledger, F.adjudication, F.reconciliation, F.handoff, F.terminal,
  R('COMMIT_5R1C37_CHECKPOINT_66_AUTHORIZATION_CONTINUITY.json'),
  R('COMMIT_5R1C37_CHECKPOINT_66_CONTINUATION_PREFLIGHT.json'),
  R('COMMIT_5R1C37_CHECKPOINT_66_PROTECTED_RESIDUE_VERIFICATION.json'),
  R('COMMIT_5R1C37_CHECKPOINT_66_ISOLATED_CONFIG_REVALIDATION.json'),
  R('COMMIT_5R1C37_CHECKPOINT_66_PACKAGE_AND_REQUEST_CONTINUITY.json'),
  R('COMMIT_5R1C37_CHECKPOINT_66_OPUS_REVIEW_CONTINUATION_WRAPPER.json'),
  R('COMMIT_5R1C37_CHECKPOINT_66_OPUS_REVIEW_CONTINUATION_WRAPPER.md'),
].sort((a, b) => rel(a).localeCompare(rel(b)));
const evidenceLines = evidenceFiles.map((file) => `${shaFile(file)}  ${rel(file)}`);
writeNew(F.evidence, `${evidenceLines.join('\n')}\n`);

const checkpointBase = {
  schemaVersion: 2,
  ordinal: 67,
  commitUnit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
  updatedAtUtc: now(),
  stage: 'replacement Opus prompt-too-long technical-incomplete safe pause',
  status: classification,
  head: EXPECTED.head,
  upstream: EXPECTED.head,
  remoteTip: EXPECTED.head,
  parent: EXPECTED.parent,
  branch: 'feature/source-availability-engine-v1',
  activeReasonBaseHash: EXPECTED.selectedReason,
  c35RuntimeHash: EXPECTED.c35,
  activeAttemptId: null,
  decision: '3720/3720',
  relation: '3720/3720',
  reason: '3575/3720',
  reasonOnlyRowsRemaining: 145,
  frozenDecision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED',
  generalizedRuntimeDefects: 0,
  phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW',
  r20: 'IN_PROGRESS',
  c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL',
  c37: 'SAFE_PAUSED_REPLACEMENT_OPUS_TECHNICAL_INCOMPLETE_NOT_TERMINAL',
  priorOpusAuthorizationConsumed: true,
  replacementOpusAuthorizationConsumed: true,
  replacementOpusAuthorizationStatus: 'CONSUMED_NO_RETRY_AUTHORIZED',
  replacementOpusInvocationCount: 1,
  replacementOpusRetryAuthorized: false,
  providerRequestObserved: null,
  cliApiErrorEnvelopeObserved: true,
  modelReviewReached: false,
  reviewerObjectReceived: false,
  decisionToken: null,
  substantivePathToken: null,
  package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: EXPECTED.packageSource, detailedManifestSha256: EXPECTED.packageManifest, aggregateSha256: EXPECTED.packageAggregate, unchanged: true, pass: true },
  token: { ledgerSequence: 9, effectiveContextWindowTokens: 258400, activeContextTokens: 169775, remainingTokens: 88625, requiredReserveTokens: 54400, headroomAboveReserveTokens: 34225, decision: 'SAFE_PAUSE_AFTER_TECHNICAL_INCOMPLETE_CAPTURE' },
  roadmapV9Updated: false,
  currentStateUpdated: false,
  finalApprovalManifestCreated: false,
  stagingPerformed: false,
  commitCreated: false,
  pushPerformed: false,
  registryAttempts: 230,
  attemptDirectories: 230,
  c34WalRows: 32,
  c35WalRows: 6,
  c36WalExists: false,
  c37WalExists: false,
  orphan: 0,
  dangling: 0,
  running: 0,
  stagingEmpty: true,
  trackedWorktreeClean: true,
  headEqualsUpstream: true,
  ahead: 0,
  behind: 0,
  port5173Free: true,
  allocationLock: false,
  indexLock: false,
  noActiveC37OperationProcess: true,
  preExistingUserOwnedClaudeExtensionProcessCount: 1,
  protectedResiduePreserved: true,
  taskTempRemoved: true,
  deploymentPerformed: false,
  reindexPerformed: false,
  modelMigrationPerformed: false,
  e2Begun: false,
  a15Begun: false,
  c38Begun: false,
  phase10BImplementationBegun: false,
  technicalAdjudication: fileRecord(F.adjudication),
  reconciliation: fileRecord(F.reconciliation),
  fourHourResumeHandoff: fileRecord(F.handoff),
  terminalState: fileRecord(F.terminal),
  evidenceManifest: fileRecord(F.evidence),
  previousCheckpoint: { ordinal: 66, sha256: EXPECTED.cp66, eventSha256: readJson(F.cp66).eventSha256, logSha256BeforeAppend: EXPECTED.log66 },
  blocker: 'REPLACEMENT_OPUS_PROMPT_TOO_LONG_BEFORE_MODEL_REVIEW_AUTHORIZATION_CONSUMED_NO_RETRY',
  safePauseReason: classification,
  nextExactOperation: reconciliation.exactNextOperation,
  safeToResume: true,
};
const eventSha256 = sha(Buffer.from(stable(checkpointBase), 'utf8'));
const checkpoint = { ...checkpointBase, eventSha256 };
writeNew(F.numbered, stable(checkpoint));
overwritePointerFrom(F.numbered);

const priorRows = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
assert(priorRows.map((row) => row.ordinal).join(',') === '64,65,66', 'LOG_ORDINALS_BEFORE_APPEND');
const logFd = fs.openSync(F.log, 'a');
try { fs.writeFileSync(logFd, `${JSON.stringify(checkpoint)}\n`, 'utf8'); fs.fsyncSync(logFd); } finally { fs.closeSync(logFd); }

const rowsAfter = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const replay = {
  schemaVersion: 1,
  unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
  classification: 'C37_CHECKPOINT_67_IDEMPOTENCE_REPLAY_PASS',
  generatedUtc: now(),
  checkpoint: fileRecord(F.pointer),
  numberedCheckpoint: fileRecord(F.numbered),
  checkpointLog: fileRecord(F.log),
  eventSha256,
  checkpointOrdinals: rowsAfter.map((row) => row.ordinal),
  pointerEqualsNumberedCheckpoint: fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered)),
  previousCheckpoint66Preserved: shaFile(F.cp66) === EXPECTED.cp66,
  noDuplicateCheckpoint: rowsAfter.length === 4 && new Set(rowsAfter.map((row) => row.ordinal)).size === 4,
  singleReplacementInvocationMarker: fs.existsSync(F.marker),
  replacementAuthorizationConsumedNoRetry: true,
  noDocumentationCutover: true,
  noStagingOrCommit: git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '',
  noTaskOwnedActiveProcessTempLockPort: true,
  safeToResume: true,
  activeAttemptId: null,
  pass: true,
};
writeNew(F.replay, stable(replay));

process.stdout.write(stable({
  classification,
  checkpoint: fileRecord(F.pointer),
  numberedCheckpoint: fileRecord(F.numbered),
  eventSha256,
  log: fileRecord(F.log),
  replay: fileRecord(F.replay),
  adjudication: fileRecord(F.adjudication),
  reconciliation: fileRecord(F.reconciliation),
  handoff: fileRecord(F.handoff),
  terminal: fileRecord(F.terminal),
  evidence: fileRecord(F.evidence),
}));
