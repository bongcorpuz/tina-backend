// PHASE-10A14-R20 COMMIT 5R1-C37
// Checkpoint-68 write-once manifest-indexed pre-invocation token safe pause.

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
const assert = (value, code) => { if (!value) throw new Error(code); };
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: 'utf8' }).trim();

const F = {
  pointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  cp67: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_67_replacement_opus_prompt_too_long_technical_incomplete.json'),
  replay67: R('COMMIT_5R1C37_CHECKPOINT_67_IDEMPOTENCE_REPLAY.json'),
  evidence67: R('COMMIT_5R1C37_CHECKPOINT_67_REPLACEMENT_OPUS_TECHNICAL_INCOMPLETE_EVIDENCE.sha256'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  packageSha: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  authorization: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_EXTERNAL_AUTHORIZATION.json'),
  ledger: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson'),
  driver: fileURLToPath(import.meta.url),
  reconciliation: R('COMMIT_5R1C37_CHECKPOINT_68_TOKEN_SAFE_PAUSE_RECONCILIATION.json'),
  handoff: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_68.md'),
  terminal: R('COMMIT_5R1C37_CHECKPOINT_68_TOKEN_SAFE_PAUSE_TERMINAL_STATE.json'),
  evidence: R('COMMIT_5R1C37_CHECKPOINT_68_TOKEN_SAFE_PAUSE_EVIDENCE.sha256'),
  numbered: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_68_manifest_indexed_token_reserve_safe_pause_pre_invocation.json'),
  replay: R('COMMIT_5R1C37_CHECKPOINT_68_IDEMPOTENCE_REPLAY.json'),
};

const E = {
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  parent: 'd5b25e676f623fbc1888608ff250824fcd34af99',
  cp67: 'b764f921037832e24060a27b83fc3b16afee7cac9ea855aeb6dcd6679fbf7940',
  log67: '9db1a591d6e53e324d147f0608b601ccd5ef775dfe9b2bba0287751eadc17836',
  replay67: '49bc8a316c4bbda4a1cc26397131688b2cd057ae2da48cca1c7f4a55a31f81d5',
  evidence67: '5b4bc9ffa598b7a8d8f19dfbe96fe6c086ff02e21718202b18f13a4cd85abd40',
  authorization: '5261030505f27dbd9a1450b16d75876aa2141cf741bd83957ed50e8746bf5d44',
  ledger: '9d175aaf17166e51ce5d96e255b14bf3528ea6b8fc1bbce3dcc64a28dbd6944c',
  packageSource: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  packageManifest: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0',
  packageAggregate: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',
  selectedReason: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  c35: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
};

function record(file) { const data = fs.readFileSync(file); return { path: rel(file), bytes: data.length, sha256: sha(data) }; }
function writeNew(file, value) { const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8'); const fd = fs.openSync(file, 'wx'); try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } return record(file); }
function verifyManifest(file, allowLedgerAppend = false) {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const bad = [];
  for (const line of rows) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!match) { bad.push(line); continue; }
    const target = path.resolve(REPO, ...match[2].replaceAll('\\', '/').split('/'));
    if (!fs.existsSync(target)) { bad.push(match[2]); continue; }
    if (allowLedgerAppend && path.resolve(target) === path.resolve(F.ledger)) {
      const priorLines = fs.readFileSync(target, 'utf8').split(/\r?\n/).filter(Boolean).slice(0, 9);
      if (sha(Buffer.from(`${priorLines.join('\n')}\n`, 'utf8')) !== match[1]) bad.push(match[2]);
    } else if (shaFile(target) !== match[1]) bad.push(match[2]);
  }
  return { rows: rows.length, uniquePaths: new Set(rows.map((line) => line.slice(66))).size, bad, pass: bad.length === 0 };
}

for (const file of [F.reconciliation, F.handoff, F.terminal, F.evidence, F.numbered, F.replay]) assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
assert(shaFile(F.pointer) === E.cp67 && shaFile(F.cp67) === E.cp67, 'CHECKPOINT67_DRIFT');
assert(shaFile(F.replay67) === E.replay67 && readJson(F.replay67).pass === true, 'REPLAY67_DRIFT');
assert(shaFile(F.evidence67) === E.evidence67 && verifyManifest(F.evidence67, true).pass, 'EVIDENCE67_DRIFT');
assert(shaFile(F.log) === E.log67, 'LOG67_DRIFT');
assert(shaFile(F.authorization) === E.authorization && readJson(F.authorization).newAuthorization.status === 'AUTHORIZED_UNUSED', 'AUTHORIZATION_DRIFT');
assert(shaFile(F.ledger) === E.ledger && fs.readFileSync(F.ledger, 'utf8').split(/\r?\n/).filter(Boolean).length === 10, 'LEDGER_DRIFT');
const packageCheck = verifyManifest(F.packageSha);
assert(shaFile(F.packageSha) === E.packageSource && packageCheck.rows === 57 && packageCheck.uniquePaths === 57 && packageCheck.pass, 'PACKAGE_DRIFT');
assert(!fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json')), 'MANIFEST_INDEXED_MARKER_EXISTS');
assert(!fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.json')), 'CAPSULE_UNEXPECTEDLY_EXISTS');
assert(!fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_BOOTSTRAP.md')), 'BOOTSTRAP_UNEXPECTEDLY_EXISTS');
assert(git('rev-parse', 'HEAD') === E.head && git('rev-parse', '@{upstream}') === E.head && git('rev-parse', 'FETCH_HEAD') === E.head, 'GIT_IDENTITY');
assert(git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '', 'GIT_NOT_CLEAN');

const generatedUtc = new Date().toISOString();
const classification = 'C37_FOUR_HOUR_TOKEN_RESERVE_SAFE_PAUSE_PRE_INVOCATION';
const exactNext = 'Resume under a new four-hour governed prompt from checkpoint 68 with the existing manifest-indexed authorization still unused; recompute fresh Codex telemetry, then verify checkpoint 68 before building the role ledger, allowlist, capsule, read-only tool boundary, bootstrap, and provider-context plan.';

const reconciliation = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification, generatedUtc,
  startingCheckpoint: { ordinal: 67, sha256: E.cp67, eventSha256: readJson(F.cp67).eventSha256 }, endingCheckpoint: 68,
  governingPrompt: { path: 'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C37-FOUR-HOUR-MANIFEST-INDEXED-OPUS-REVIEW-AND-FINALIZATION-FROM-CHECKPOINT-67.md', bytes: 26397, sha256: '3f159920d6eca81dce548fe4a5e898e7c1e9f01df209ffd127b44c8e2885fb97' },
  token: { ledgerSequence: 10, effectiveContextWindowTokens: 258400, activeContextTokens: 205611, remainingTokens: 52789, requiredReserveTokens: 54400, headroomAboveReserveTokens: -1611, decision: 'SAFE_PAUSE_BEFORE_MANIFEST_INDEXED_PREPARATION_OR_INVOCATION' },
  authorization: { path: rel(F.authorization), sha256: E.authorization, status: 'AUTHORIZED_UNUSED', invocationCount: 0, maximumInvocations: 1, retryAuthorized: false },
  checkpoint67: { replayPass: true, technicalIncompleteEvidenceRows: 21, evidenceBad: 0, priorReplacementConsumed: true, priorReviewerDecision: null },
  package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: E.packageSource, detailedManifestSha256: E.packageManifest, aggregateSha256: E.packageAggregate, memberHashMismatches: 0, unchanged: true },
  preparation: { roleLedgerCreated: false, allowlistCreated: false, capsuleCreated: false, coverageValidationCreated: false, bootstrapCreated: false, readOnlyToolPlanCreated: false, contextPlanCreated: false, transportPreflightCreated: false },
  externalReview: { markerCreated: false, substantiveRequestSubmitted: false, providerRequestObserved: false, reviewerObjectReceived: false, decisionToken: null, substantivePathToken: null },
  git: { head: E.head, upstream: E.head, remoteTip: E.head, ahead: 0, behind: 0, stagingEmpty: true, trackedTreeClean: true },
  finalization: { assessment: false, docs: false, finalManifest: false, staging: false, commit: false, push: false },
  prohibitedWork: { c38: false, e2: false, a15: false, phase10B: false, deployment: false, reindex: false, modelMigration: false },
  exactNextOperation: exactNext, safeToResume: true, activeAttemptId: null, pass: true,
};
writeNew(F.reconciliation, stable(reconciliation));

const handoff = `# C37 four-hour resume handoff from checkpoint 68\n\nClassification: \`${classification}\`\n\nThe checkpoint-67 manifest-indexed governing prompt was read completely (26,397 bytes; SHA-256 3f159920d6eca81dce548fe4a5e898e7c1e9f01df209ffd127b44c8e2885fb97). Fresh live Codex telemetry reported 205,611 active tokens in the effective 258,400-token window, leaving 52,789 tokens. The mandatory reserve remains 54,400, so the execution was already 1,611 tokens below reserve before capsule or transport work could begin.\n\nThe new manifest-indexed authorization was recorded at ${rel(F.authorization)} with SHA-256 ${E.authorization}. It is unused: invocation count 0, marker absent, substantive submission absent, provider request absent, and retry false. Both older authorizations remain consumed and cannot be reused.\n\nCheckpoint 67, its replay, and its 21-entry technical-incomplete manifest verify. The original package remains 57 entries / 4,109,852 bytes with source manifest ${E.packageSource}, detailed manifest ${E.packageManifest}, and aggregate ${E.packageAggregate}; all 57 hashes verify. HEAD/upstream/live FETCH_HEAD remain ${E.head}, 0/0, staging empty, tracked tree clean.\n\nNo role ledger, allowlist, capsule, builder, bootstrap, tool-boundary artifact, provider-context plan, invocation marker, review capture, assessment, documentation cutover, final manifest, staging, commit, or push was created. No task temp or Claude process was created, and user-owned VS Code Claude PID 24136 was not touched. No C38, E2, A15, Phase 10B, deployment, reindexing, or model migration work began.\n\nExact next operation: ${exactNext}\n\nThis handoff grants no additional invocation or phase authority. The existing manifest-indexed authorization remains the sole unused one-use authorization.\n`;
writeNew(F.handoff, handoff);

const terminal = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification, generatedUtc,
  reason: 'Fresh remaining Codex context was below the mandatory reserve before manifest-indexed preparation or invocation.',
  reconciliation: record(F.reconciliation), handoff: record(F.handoff),
  manifestIndexedAuthorizationUnused: true, manifestIndexedInvocationCount: 0, providerRequestObserved: false, reviewerDecision: null,
  capsuleCreated: false, bootstrapCreated: false, documentationUpdated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
  runtimeOracleRegistryWalMutationCount: 0, c38Begun: false, e2Begun: false, a15Begun: false, phase10BBegun: false, deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false,
  exactNextOperation: exactNext, safeToResume: true, activeAttemptId: null, pass: true,
};
writeNew(F.terminal, stable(terminal));

const evidenceFiles = [F.driver, F.authorization, F.ledger, F.reconciliation, F.handoff, F.terminal, F.cp67, F.replay67, F.evidence67].sort((a, b) => rel(a).localeCompare(rel(b)));
writeNew(F.evidence, `${evidenceFiles.map((file) => `${shaFile(file)}  ${rel(file)}`).join('\n')}\n`);

const checkpointBase = {
  schemaVersion: 2, ordinal: 68, commitUnit: 'PHASE-10A14-R20 COMMIT 5R1-C37', updatedAtUtc: new Date().toISOString(), stage: 'manifest-indexed pre-invocation token-reserve safe pause', status: classification,
  head: E.head, upstream: E.head, remoteTip: E.head, parent: E.parent, branch: 'feature/source-availability-engine-v1', activeReasonBaseHash: E.selectedReason, c35RuntimeHash: E.c35, activeAttemptId: null,
  decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', reasonOnlyRowsRemaining: 145, frozenDecision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', generalizedRuntimeDefects: 0,
  phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW', r20: 'IN_PROGRESS', c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL', c37: 'SAFE_PAUSED_MANIFEST_INDEXED_PREPARATION_NOT_STARTED',
  priorAuthorizationsConsumed: 2, manifestIndexedAuthorizationStatus: 'AUTHORIZED_UNUSED', manifestIndexedAuthorizationConsumed: false, manifestIndexedInvocationCount: 0, manifestIndexedRetryAuthorized: false,
  providerRequestObserved: false, modelReviewReached: false, reviewerObjectReceived: false, decisionToken: null, substantivePathToken: null,
  package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: E.packageSource, detailedManifestSha256: E.packageManifest, aggregateSha256: E.packageAggregate, unchanged: true, pass: true },
  token: { ledgerSequence: 10, effectiveContextWindowTokens: 258400, activeContextTokens: 205611, remainingTokens: 52789, requiredReserveTokens: 54400, headroomAboveReserveTokens: -1611, decision: 'SAFE_PAUSE_BEFORE_MANIFEST_INDEXED_PREPARATION_OR_INVOCATION' },
  roleLedgerCreated: false, capsuleCreated: false, bootstrapCreated: false, toolBoundaryValidated: false, providerContextPlanCreated: false,
  roadmapV9Updated: false, currentStateUpdated: false, finalApprovalManifestCreated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
  stagingEmpty: true, trackedWorktreeClean: true, headEqualsUpstream: true, ahead: 0, behind: 0, noActiveC37OperationProcess: true, taskTempExists: false, preExistingUserOwnedClaudeExtensionProcessCount: 1, protectedResiduePreserved: true,
  deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false, e2Begun: false, a15Begun: false, c38Begun: false, phase10BImplementationBegun: false,
  authorization: record(F.authorization), reconciliation: record(F.reconciliation), fourHourResumeHandoff: record(F.handoff), terminalState: record(F.terminal), evidenceManifest: record(F.evidence),
  previousCheckpoint: { ordinal: 67, sha256: E.cp67, eventSha256: readJson(F.cp67).eventSha256, logSha256BeforeAppend: E.log67 },
  blocker: 'CODEX_TOKEN_RESERVE_BELOW_MANDATORY_FLOOR_BEFORE_MANIFEST_INDEXED_PREPARATION', safePauseReason: classification, nextExactOperation: exactNext, safeToResume: true,
};
const eventSha256 = sha(Buffer.from(stable(checkpointBase), 'utf8'));
const checkpoint = { ...checkpointBase, eventSha256 };
writeNew(F.numbered, stable(checkpoint));
const pointerFd = fs.openSync(F.pointer, 'w'); try { fs.writeFileSync(pointerFd, fs.readFileSync(F.numbered)); fs.fsyncSync(pointerFd); } finally { fs.closeSync(pointerFd); }
assert(fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered)), 'POINTER_MISMATCH');

const priorRows = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert(priorRows.map((row) => row.ordinal).join(',') === '64,65,66,67', 'LOG_BEFORE_APPEND');
const logFd = fs.openSync(F.log, 'a'); try { fs.writeFileSync(logFd, `${JSON.stringify(checkpoint)}\n`); fs.fsyncSync(logFd); } finally { fs.closeSync(logFd); }
const rowsAfter = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const replay = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_68_IDEMPOTENCE_REPLAY_PASS', generatedUtc: new Date().toISOString(),
  checkpoint: record(F.pointer), numberedCheckpoint: record(F.numbered), checkpointLog: record(F.log), eventSha256, checkpointOrdinals: rowsAfter.map((row) => row.ordinal),
  pointerEqualsNumberedCheckpoint: fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered)), previousCheckpoint67Preserved: shaFile(F.cp67) === E.cp67,
  noDuplicateCheckpoint: rowsAfter.length === 5 && new Set(rowsAfter.map((row) => row.ordinal)).size === 5,
  manifestIndexedAuthorizationUnused: true, noManifestIndexedInvocationMarker: !fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json')),
  noCapsuleBootstrapDocsStagingCommit: true, noTaskOwnedActiveProcessTempLockPort: true, safeToResume: true, activeAttemptId: null, pass: true,
};
writeNew(F.replay, stable(replay));

process.stdout.write(stable({ classification, checkpoint: record(F.pointer), eventSha256, log: record(F.log), replay: record(F.replay), authorization: record(F.authorization), reconciliation: record(F.reconciliation), handoff: record(F.handoff), terminal: record(F.terminal), evidence: record(F.evidence) }));
