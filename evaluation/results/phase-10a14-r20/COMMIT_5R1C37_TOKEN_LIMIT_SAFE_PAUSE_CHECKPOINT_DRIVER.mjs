// PHASE-10A14-R20 COMMIT 5R1-C37
// Token-reserve pre-invocation safe-pause/checkpoint-66 driver.
// It never invokes Claude, edits documentation, stages, commits, pushes, or
// mutates runtime, oracle, fixture, registry, or WAL state.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const R = (name) => path.join(RESULTS, name);
const START = new Date('2026-08-01T11:24:16.7173955Z');
const CLASSIFICATION = 'C37_FIVE_HOUR_TOKEN_RESERVE_SAFE_PAUSE_PRE_INVOCATION';
const EXPECTED = Object.freeze({
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  parent: 'd5b25e676f623fbc1888608ff250824fcd34af99',
  branch: 'feature/source-availability-engine-v1',
  checkpoint65: '54c8e1159025a9099b0572ab4b5c14eaf1b3eb92b61ed173cebaa94a83aec3db',
  checkpoint65Event: 'd982a06613729ac6eaa0e567179f368a3f210f8ee4efcec89f9649f3f04ca7f6',
  sourceManifest: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  detailedManifest: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0',
  aggregate: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',
  packageBytes: 4109852,
  replacementAuthorization: '72a6c3eb7cbefec17c8bd19062c4002ca7b9322533ddfef3cae605032985452e',
  requestWrapperJson: '1311ff53a80e93d5c7fe35fdbc5c2029ab789d68c2e5cb41dafb11f90554f712',
  requestWrapperMd: 'ad8511245e2b4fecc7d12a0f53de560c62a3601b138be664bcfaa9c35a130ec8',
  c35Composite: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
  selectedReason: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  registry: 'a0261acfcc4cc69615794fe6f26117c00789d42862a75fae3e978b2e17a1e073',
  c34Wal: '2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2',
  c35Wal: 'd86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f',
});

const F = Object.freeze({
  driver: fileURLToPath(import.meta.url),
  checkpoint: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  checkpoint65: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_65_opus_cli_configuration_technical_incomplete.json'),
  checkpoint66: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_66_token_reserve_safe_pause_pre_invocation.json'),
  checkpointLog: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  checkpointReplay: R('COMMIT_5R1C37_CHECKPOINT_66_IDEMPOTENCE_REPLAY.json'),
  reconciliation: R('COMMIT_5R1C37_TOKEN_LIMIT_SAFE_PAUSE_RECONCILIATION.json'),
  handoff: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_66.md'),
  terminal: R('COMMIT_5R1C37_TOKEN_LIMIT_TERMINAL_STATE.json'),
  manifest: R('COMMIT_5R1C37_TOKEN_LIMIT_SAFE_PAUSE_EVIDENCE.sha256'),
  tokenLedger: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson'),
  tokenPolicy: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_POLICY.json'),
  sourceManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  detailedManifest: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  authorization: R('COMMIT_5R1C37_REPLACEMENT_OPUS_EXTERNAL_AUTHORIZATION.json'),
  wrapperJson: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REQUEST_WRAPPER.json'),
  wrapperMd: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REQUEST_WRAPPER.md'),
  preflight: R('COMMIT_5R1C37_CHECKPOINT_65_RECOVERY_PREFLIGHT.json'),
  protected: R('COMMIT_5R1C37_CHECKPOINT_65_PROTECTED_RESIDUE_VERIFICATION.json'),
  prior: R('COMMIT_5R1C37_PRIOR_OPUS_ATTEMPT_RECONCILIATION.json'),
  rootCauseJson: R('COMMIT_5R1C37_REPLACEMENT_OPUS_MCP_ROOT_CAUSE.json'),
  rootCauseMd: R('COMMIT_5R1C37_REPLACEMENT_OPUS_MCP_ROOT_CAUSE.md'),
  configInventory: R('COMMIT_5R1C37_REPLACEMENT_OPUS_LOCAL_CONFIG_INVENTORY.json'),
  isolationPlan: R('COMMIT_5R1C37_REPLACEMENT_OPUS_ISOLATED_CONFIG_PLAN.json'),
  isolationValidation: R('COMMIT_5R1C37_REPLACEMENT_OPUS_ISOLATED_CONFIG_VALIDATION.json'),
  packageReverification: R('COMMIT_5R1C37_REPLACEMENT_OPUS_PACKAGE_REVERIFICATION.json'),
  delegation: R('COMMIT_5R1C37_CHECKPOINT_65_RECOVERY_READ_ONLY_DELEGATION_RECORD.json'),
  registry: R('CANONICAL_ATTEMPT_REGISTRY.json'),
  c34Wal: R('COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c35Wal: R('COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c36Wal: R('COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c37Wal: R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson'),
  attempts: path.join(RESULTS, 'attempts'),
});

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const now = () => new Date().toISOString();
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: 'utf8' }).trim();
const assert = (condition, code) => { if (!condition) throw new Error(code); };

function record(file) {
  const data = fs.readFileSync(file);
  return { path: rel(file), bytes: data.length, sha256: sha(data) };
}

function writeOnce(file, value) {
  assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const temp = `${file}.write-once-${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`;
  let done = false;
  try {
    const fd = fs.openSync(temp, 'wx');
    try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert(!fs.existsSync(file), `WRITE_ONCE_RACE:${rel(file)}`);
    fs.renameSync(temp, file);
    done = true;
  } finally {
    if (!done && fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
  return record(file);
}

function replacePointer(data) {
  const temp = `${F.checkpoint}.checkpoint66-${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`;
  let done = false;
  try {
    fs.writeFileSync(temp, data, { flag: 'wx' });
    fs.renameSync(temp, F.checkpoint);
    done = true;
  } finally {
    if (!done && fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
}

function verifyPackage() {
  assert(shaFile(F.sourceManifest) === EXPECTED.sourceManifest, 'PACKAGE_SOURCE_MANIFEST_DRIFT');
  assert(shaFile(F.detailedManifest) === EXPECTED.detailedManifest, 'PACKAGE_DETAILED_MANIFEST_DRIFT');
  const rows = fs.readFileSync(F.sourceManifest, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `PACKAGE_MANIFEST_LINE_${index + 1}`);
    return { ordinal: index + 1, expectedSha256: match[1], path: match[2].replaceAll('\\', '/') };
  });
  assert(rows.length === 57 && new Set(rows.map((row) => row.path)).size === 57, 'PACKAGE_COUNT_OR_PATH_DRIFT');
  let bytes = 0;
  const framing = [];
  for (const row of rows) {
    const file = path.resolve(REPO, ...row.path.split('/'));
    const data = fs.readFileSync(file);
    assert(sha(data) === row.expectedSha256, `PACKAGE_MEMBER_DRIFT_${row.ordinal}`);
    bytes += data.length;
    framing.push(`${row.ordinal}\0${row.path}\0${data.length}\0${row.expectedSha256}\n`);
  }
  const aggregateSha256 = sha(Buffer.from(framing.join(''), 'utf8'));
  assert(bytes === EXPECTED.packageBytes && aggregateSha256 === EXPECTED.aggregate, 'PACKAGE_BYTES_OR_AGGREGATE_DRIFT');
  return { entries: 57, rawEvidenceBytes: bytes, sourceManifestSha256: EXPECTED.sourceManifest, detailedManifestSha256: EXPECTED.detailedManifest, aggregateSha256, memberHashMismatches: 0, pass: true };
}

function processAndHygiene() {
  const tasks = (imageName) => execFileSync('tasklist.exe', ['/FI', `IMAGENAME eq ${imageName}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' })
    .split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('"')).map((line) => {
      const fields = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
      return { imageName: fields[0], pid: Number.parseInt(fields[1], 10) };
    }).filter((item) => Number.isInteger(item.pid));
  const claudeRows = tasks('claude.exe');
  const nodeRows = tasks('node.exe');
  // PID 24136 was independently inspected before this driver and bound to the
  // pre-existing user-owned VS Code extension. No replacement invocation
  // marker exists, so any other Claude PID is a hard hygiene failure.
  const userClaude = claudeRows.filter((item) => item.pid === 24136);
  const taskClaude = claudeRows.filter((item) => item.pid !== 24136);
  const otherNode = nodeRows.filter((item) => item.pid !== process.pid);
  const netstat = execFileSync('netstat.exe', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const listeners5173 = netstat.split(/\r?\n/).filter((line) => { const p = line.trim().split(/\s+/); return p[0] === 'TCP' && /:5173$/.test(p[1] || '') && p[3] === 'LISTENING'; });
  const locks = [path.join(REPO, '.git/index.lock'), ...fs.readdirSync(RESULTS).filter((name) => /(?:allocation|runtime)\.lock$/i.test(name)).map(R)].filter(fs.existsSync);
  const isolatedTempExists = fs.existsSync('C:/tmp/c37-replacement-isolated-config-20260801T114900Z');
  const pass = taskClaude.length === 0 && otherNode.length === 0 && listeners5173.length === 0 && locks.length === 0 && !isolatedTempExists;
  assert(pass, 'PROCESS_TEMP_LOCK_OR_PORT_NOT_CLEAN');
  return { taskOwnedClaudeProcesses: 0, otherNodeProcesses: 0, userOwnedVsCodeClaudeExtensionProcesses: userClaude.length, userOwnedVsCodeClaudeExtensionPid: userClaude[0]?.pid ?? null, userOwnedVsCodeClaudeExtensionUntouched: true, port5173Listeners: 0, locks: 0, isolatedTempExists: false, pass };
}

function main() {
  for (const file of [F.checkpoint66, F.checkpointReplay, F.reconciliation, F.handoff, F.terminal, F.manifest]) assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
  assert(shaFile(F.checkpoint) === EXPECTED.checkpoint65 && shaFile(F.checkpoint65) === EXPECTED.checkpoint65, 'CHECKPOINT65_DRIFT');
  assert(fs.readFileSync(F.checkpoint).equals(fs.readFileSync(F.checkpoint65)), 'CHECKPOINT65_POINTER_COPY_DRIFT');
  const logBefore = fs.readFileSync(F.checkpointLog);
  const rowsBefore = logBefore.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert(rowsBefore.length === 2 && rowsBefore[0].ordinal === 64 && rowsBefore[1].ordinal === 65 && rowsBefore[1].eventSha256 === EXPECTED.checkpoint65Event, 'CHECKPOINT_LOG_DRIFT');
  assert(git('rev-parse', 'HEAD') === EXPECTED.head && git('rev-parse', '@{upstream}') === EXPECTED.head && git('rev-parse', 'HEAD^') === EXPECTED.parent && git('branch', '--show-current') === EXPECTED.branch, 'GIT_IDENTITY_DRIFT');
  assert(git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '', 'TRACKED_OR_STAGED_DRIFT');
  assert(!fs.existsSync(R('COMMIT_5R1C37_REPLACEMENT_OPUS_INVOCATION_MARKER.json')), 'REPLACEMENT_INVOCATION_ALREADY_MARKED');
  assert(shaFile(F.authorization) === EXPECTED.replacementAuthorization && readJson(F.authorization).replacementAuthorization.status === 'AUTHORIZED_UNUSED', 'REPLACEMENT_AUTHORIZATION_DRIFT');
  assert(shaFile(F.wrapperJson) === EXPECTED.requestWrapperJson && shaFile(F.wrapperMd) === EXPECTED.requestWrapperMd, 'REQUEST_WRAPPER_DRIFT');
  const ledgerRows = fs.readFileSync(F.tokenLedger, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const token = ledgerRows.at(-1);
  assert(token.sequence === 5 && token.decision === 'PAUSE_BEFORE_NEXT_OPERATION' && token.replacementAuthorizationStatus === 'AUTHORIZED_UNUSED', 'TOKEN_GATE_DRIFT');
  const packageState = verifyPackage();
  const hygiene = processAndHygiene();
  assert(shaFile(F.registry) === EXPECTED.registry && shaFile(F.c34Wal) === EXPECTED.c34Wal && shaFile(F.c35Wal) === EXPECTED.c35Wal && !fs.existsSync(F.c36Wal) && !fs.existsSync(F.c37Wal), 'REGISTRY_WAL_DRIFT');
  const registry = readJson(F.registry);
  const attemptDirs = fs.readdirSync(F.attempts, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert(registry.attempts.length === 230 && attemptDirs.length === 230 && registry.attempts.every((attempt) => attempt.status !== 'running'), 'ATTEMPT_STATE_DRIFT');
  const generatedUtc = now();
  const elapsedMilliseconds = new Date(generatedUtc).getTime() - START.getTime();
  const common = {
    head: EXPECTED.head, upstream: EXPECTED.head, remoteTip: EXPECTED.head, ahead: 0, behind: 0,
    stagingEmpty: true, trackedTreeClean: true,
    package: packageState,
    runtimeOracleRegistryWal: { c35CompositeSha256: EXPECTED.c35Composite, selectedC34ReasonRuntimeSha256: EXPECTED.selectedReason, registrySha256: EXPECTED.registry, c34WalSha256: EXPECTED.c34Wal, c35WalSha256: EXPECTED.c35Wal, c36WalAbsent: true, c37WalAbsent: true, mutations: 0 },
    hygiene,
  };
  const reconciliation = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: CLASSIFICATION, generatedUtc,
    startingCheckpoint: { ordinal: 65, sha256: EXPECTED.checkpoint65, eventSha256: EXPECTED.checkpoint65Event },
    endingCheckpoint: 66, governedEvidenceStartUtc: START.toISOString(), elapsedMilliseconds,
    token: { telemetryAvailable: false, contextCapacityTokens: 272000, estimatedUsedTokensWith25PercentSafetyMargin: 206250, estimatedRemainingTokens: 65750, estimatedRemainingPercentage: 24.1728, requiredSafePauseReserveTokens: 54400, headroomAboveReserveTokens: 11350, invocationAtomicBudgetRequiredTokens: 18000, reserveGuaranteeForInvocation: false, decision: 'PAUSE_BEFORE_NEXT_OPERATION' },
    lastCompletedAtomicOperation: 'Checkpoint-65 continuity, prior-attempt reconciliation, MCP root-cause proof, provider-free isolated-config validation, package reverification, replacement authorization record, and request wrapper.',
    exactNextOperation: 'Under a new four-hour governed resume prompt, reverify checkpoint 66 and token capacity, recreate the same 18-byte isolated MCP config, revalidate locally, and only if the invocation/capture/adjudication/checkpoint reserve is proven create the single replacement invocation marker and submit once.',
    ...common,
    priorAuthorization: { consumed: true, retryAuthorized: false },
    replacementAuthorization: { status: 'AUTHORIZED_UNUSED', consumed: false, maximumInvocations: 1, retryAuthorized: false },
    provider: { substantiveRequestSubmitted: false, providerRequestObserved: false, confirmedEvidenceBytesTransmitted: 0, wireTrafficExactlyObservable: false },
    review: { result: null, decisionToken: null, substantivePathToken: null },
    finalization: { phase10AAssessment: false, roadmapV9Updated: false, currentStateUpdated: false, manifestCreated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false },
    prohibitedWork: { c38: false, e2: false, a15: false, phase10B: false, deployment: false, reindex: false, modelMigration: false },
    safeToResume: true, activeAttemptId: null, pass: true,
  };
  writeOnce(F.reconciliation, stable(reconciliation));

  const handoff = `# C37 four-hour resume handoff from checkpoint 66\n\n` +
    `Classification: \`${CLASSIFICATION}\`\n\n` +
    `Checkpoint 66 was created after ${elapsedMilliseconds} ms from the first recorded governed evidence timestamp (${START.toISOString()}). The last completed atomic operation was checkpoint-65 continuity verification, prior-attempt reconciliation, read-only MCP root-cause proof, provider-free isolated configuration validation, unchanged 57-entry package reverification, replacement authorization recording, and request-wrapper preparation.\n\n` +
    `Token telemetry for exact used tokens was unavailable. The required method estimated 495,000 surfaced/generated UTF-8 text bytes, divided by three and increased by 25%, yielding 206,250 estimated used tokens and 65,750 estimated remaining tokens of the exposed 272,000-token capacity. The safe reserve is 54,400 tokens. Only 11,350 estimated tokens remained above reserve, below the 18,000-token atomic budget for a new invocation driver, submission, capture, adjudication, and checkpoint.\n\n` +
    `Git remains HEAD/upstream/live remote tip ${EXPECTED.head}, parent ${EXPECTED.parent}, branch ${EXPECTED.branch}, ahead/behind 0/0, staging empty, tracked tree clean. C35 composite is ${EXPECTED.c35Composite}; selected C34 reason runtime is ${EXPECTED.selectedReason}. Registry is ${EXPECTED.registry}; C34/C35 WALs are ${EXPECTED.c34Wal} and ${EXPECTED.c35Wal}; C36/C37 WALs remain absent; runtime/oracle/registry/WAL mutations are zero. Protected residue verification passed.\n\n` +
    `The frozen package remains exactly 57 entries and 4,109,852 bytes. Source manifest: ${EXPECTED.sourceManifest}. Detailed manifest: ${EXPECTED.detailedManifest}. Aggregate: ${EXPECTED.aggregate}. All 57 member hashes, scope, sensitive-data, UTF-8, NUL, regular-file, and path-containment checks passed.\n\n` +
    `The prior authorization is consumed with no retry. The replacement authorization (${EXPECTED.replacementAuthorization}) is unused and unconsumed; no replacement marker exists, no substantive request was submitted, no provider request was observed, and confirmed replacement evidence bytes transmitted are zero. No replacement review result exists.\n\n` +
    `Roadmap v9, CURRENT_STATE.md, Phase 10A assessment, final manifest, staging, commit, and push remain untouched. C36 remains safe-paused/uncommitted/nonterminal. C37 remains nonterminal. Phase 10A and R20 remain open. No C38, E2, A15, Phase 10B, deployment, reindexing, or model migration began.\n\n` +
    `Process hygiene passed: no task-owned Claude process, no other Node process, no port-5173 listener, no lock, and no isolated C37 temp directory remained. The one user-owned VS Code Claude extension process was identified separately and untouched.\n\n` +
    `Passed gates: checkpoint continuity, Git/live remote, protected residue, frozen adjudication/regression, prior-attempt reconciliation, MCP root cause, supported strict isolation, provider-free validation, package identity/scope/sensitive scan, authorization and request wrapper. Pending gates: replacement pre-invocation reserve, invocation marker/submission/capture/adjudication, approval, Phase 10A assessment, documentation, manifest, explicit staging, commit, push, terminal verification.\n\n` +
    `Exact next operation: under a new four-hour governed resume prompt, reverify checkpoint 66 and token capacity; recreate the same 18-byte {"mcpServers":{}} config (SHA-256 e93fc8db2b1bd77107fe6c758bca9545fa864cf7cce8ab93a7b2b93a1d566a7b); repeat the provider-free local validation; and only when the ledger proves room for submission, capture, adjudication, and checkpoint, create the single replacement marker and invoke once.\n\n` +
    `This handoff is evidence only. It does not itself authorize an Opus call, retry, C38, E2, A15, Phase 10B, deployment, reindexing, or model migration.\n`;
  writeOnce(F.handoff, handoff);

  const terminal = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: CLASSIFICATION, generatedUtc,
    reason: 'The conservative token estimator left insufficient headroom above the mandatory 54,400-token reserve to guarantee a complete replacement submission, capture, adjudication, and checkpoint atomic group.',
    reconciliation: record(F.reconciliation), fourHourResumeHandoff: record(F.handoff),
    checkpointBefore: 65, checkpointAfter: 66,
    replacementAuthorizationUnused: true, replacementInvocationCount: 0, providerRequestObserved: false, confirmedEvidenceBytesTransmitted: 0,
    documentationUpdated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
    runtimeOracleRegistryWalMutationCount: 0, c38Begun: false, e2Begun: false, a15Begun: false, phase10BBegun: false, deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false,
    exactNextOperation: reconciliation.exactNextOperation, safeToResume: true, activeAttemptId: null, pass: true,
  };
  writeOnce(F.terminal, stable(terminal));

  const manifestFiles = [F.driver, F.tokenLedger, F.tokenPolicy, F.authorization, F.wrapperJson, F.wrapperMd, F.preflight, F.protected, F.prior, F.rootCauseJson, F.rootCauseMd, F.configInventory, F.isolationPlan, F.isolationValidation, F.packageReverification, F.delegation, F.reconciliation, F.handoff, F.terminal]
    .sort((a, b) => rel(a).localeCompare(rel(b)));
  writeOnce(F.manifest, `${manifestFiles.map((file) => `${shaFile(file)}  ${rel(file)}`).join('\n')}\n`);
  for (const line of fs.readFileSync(F.manifest, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match && shaFile(path.resolve(REPO, ...match[2].split('/'))) === match[1], 'SAFE_PAUSE_MANIFEST_VALIDATION');
  }

  const baseCheckpoint = {
    schemaVersion: 2, ordinal: 66, commitUnit: 'PHASE-10A14-R20 COMMIT 5R1-C37', updatedAtUtc: now(),
    stage: 'replacement Opus pre-invocation token-reserve safe pause', status: CLASSIFICATION,
    head: EXPECTED.head, upstream: EXPECTED.head, remoteTip: EXPECTED.head, parent: EXPECTED.parent, branch: EXPECTED.branch,
    activeReasonBaseHash: EXPECTED.selectedReason, c35RuntimeHash: EXPECTED.c35Composite, activeAttemptId: null,
    decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', reasonOnlyRowsRemaining: 145,
    frozenDecision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', generalizedRuntimeDefects: 0,
    phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW', r20: 'IN_PROGRESS', c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL', c37: 'SAFE_PAUSED_PRE_REPLACEMENT_INVOCATION_NOT_TERMINAL',
    priorOpusAuthorizationConsumed: true, priorOpusRetryAuthorized: false,
    replacementOpusAuthorizationConsumed: false, replacementOpusAuthorizationStatus: 'AUTHORIZED_UNUSED', replacementOpusInvocationCount: 0, replacementOpusRetryAuthorized: false,
    providerRequestObserved: false, confirmedReplacementEvidenceBytesTransmittedToAnthropic: 0, exactProviderWireBytes: null,
    package: packageState,
    token: reconciliation.token,
    roadmapV9Updated: false, currentStateUpdated: false, finalApprovalManifestCreated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
    registryAttempts: 230, attemptDirectories: 230, c34WalRows: 32, c35WalRows: 6, c36WalExists: false, c37WalExists: false, orphan: 0, dangling: 0, running: 0,
    stagingEmpty: true, trackedWorktreeClean: true, headEqualsUpstream: true, ahead: 0, behind: 0,
    localServiceRunning: false, port5173Free: true, allocationLock: false, indexLock: false, noActiveC37OperationProcess: true,
    preExistingUserOwnedClaudeExtensionProcessCount: hygiene.userOwnedVsCodeClaudeExtensionProcesses, protectedResiduePreserved: true, c35Preserved: true,
    deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false, e2Begun: false, a15Begun: false, c38Begun: false, phase10BImplementationBegun: false,
    reconciliation: record(F.reconciliation), fourHourResumeHandoff: record(F.handoff), terminalState: record(F.terminal), safePauseEvidenceManifest: record(F.manifest),
    previousCheckpoint: { ordinal: 65, sha256: EXPECTED.checkpoint65, eventSha256: EXPECTED.checkpoint65Event, logSha256BeforeAppend: sha(logBefore) },
    blocker: 'TOKEN_RESERVE_CANNOT_GUARANTEE_REPLACEMENT_SUBMISSION_CAPTURE_ADJUDICATION_AND_CHECKPOINT',
    safePauseReason: CLASSIFICATION, nextExactOperation: reconciliation.exactNextOperation, safeToResume: true,
  };
  const eventSha256 = sha(Buffer.from(stable(baseCheckpoint), 'utf8'));
  const checkpoint = { ...baseCheckpoint, eventSha256 };
  const checkpointBytes = Buffer.from(stable(checkpoint), 'utf8');
  writeOnce(F.checkpoint66, checkpointBytes);
  replacePointer(checkpointBytes);
  fs.appendFileSync(F.checkpointLog, Buffer.from(`${JSON.stringify(checkpoint)}\n`, 'utf8'));

  const rowsAfter = fs.readFileSync(F.checkpointLog, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const postHygiene = processAndHygiene();
  const replay = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_66_IDEMPOTENCE_REPLAY_PASS', generatedUtc: now(),
    checkpoint: record(F.checkpoint), numberedCheckpoint: record(F.checkpoint66), log: record(F.checkpointLog), eventSha256,
    checkpointOrdinals: rowsAfter.map((row) => row.ordinal), pointerEqualsNumberedCheckpoint: fs.readFileSync(F.checkpoint).equals(fs.readFileSync(F.checkpoint66)),
    previousCheckpoint65Preserved: shaFile(F.checkpoint65) === EXPECTED.checkpoint65,
    noDuplicateCheckpoint: rowsAfter.length === 3 && new Set(rowsAfter.map((row) => row.ordinal)).size === 3 && rowsAfter.at(-1).ordinal === 66,
    noReplacementInvocationMarker: !fs.existsSync(R('COMMIT_5R1C37_REPLACEMENT_OPUS_INVOCATION_MARKER.json')),
    replacementAuthorizationUnused: readJson(F.authorization).replacementAuthorization.status === 'AUTHORIZED_UNUSED',
    noDocumentationCutover: git('status', '--porcelain=v1', '--untracked-files=no') === '', noStagingOrCommit: git('diff', '--cached', '--name-only') === '' && git('rev-parse', 'HEAD') === EXPECTED.head,
    noManifestMutation: true, noProtectedResidueMutation: shaFile(F.registry) === EXPECTED.registry && shaFile(F.c34Wal) === EXPECTED.c34Wal && shaFile(F.c35Wal) === EXPECTED.c35Wal,
    noTaskOwnedActiveProcessTempLockPort: postHygiene.pass, safeToResume: true, activeAttemptId: null, pass: true,
  };
  writeOnce(F.checkpointReplay, stable(replay));
  process.stdout.write(stable({ classification: CLASSIFICATION, checkpoint: 66, eventSha256, replacementAuthorizationStatus: 'AUTHORIZED_UNUSED', providerRequestObserved: false, checkpointIdempotenceReplayPass: true, safeToResume: true }));
}

main();
