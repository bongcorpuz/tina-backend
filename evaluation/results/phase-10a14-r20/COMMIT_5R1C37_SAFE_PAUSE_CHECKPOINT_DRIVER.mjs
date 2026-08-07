import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RESULTS = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(RESULTS, '../../..');
const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C37';
const HEAD = 'ee664eab4529c636f34cb6d37d23a6a497886a17';
const PARENT = 'd5b25e676f623fbc1888608ff250824fcd34af99';
const BRANCH = 'feature/source-availability-engine-v1';
const SELECTED = '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775';
const C35 = '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c';
const CLASSIFICATION = 'C37_SAFE_PAUSE_NO_RUNTIME_CANDIDATE_PENDING_OPUS';
const R = (name) => path.join(RESULTS, name);
const ART = {
  blocker: R('COMMIT_5R1C37_PRE_OPUS_EXTERNAL_REVIEW_AUTHORIZATION_BLOCKER.json'),
  reconciliation: R('COMMIT_5R1C37_SAFE_PAUSE_PENDING_OPUS_RECONCILIATION.json'),
  terminal: R('COMMIT_5R1C37_SAFE_PAUSE_PENDING_OPUS_TERMINAL_STATE.json'),
  pointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  numbered: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_64_external_opus_transmission_authorization_safe_pause.json'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  replay: R('COMMIT_5R1C37_CHECKPOINT_64_IDEMPOTENCE_REPLAY.json'),
  previous: R('COMMIT_5R1C36_RECOVERY_CHECKPOINT.json'),
  previousLog: R('COMMIT_5R1C36_RECOVERY_CHECKPOINT_LOG.ndjson'),
  preflight: R('COMMIT_5R1C37_CHECKPOINT_63_CONTINUATION_PREFLIGHT.json'),
  inventory: R('COMMIT_5R1C37_C36_SAFE_PAUSE_INVENTORY_VERIFICATION.json'),
  protected: R('COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
  rows: R('COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.json'),
  matrix: R('COMMIT_5R1C37_CLUSTER_DISPOSITION_MATRIX.json'),
  necessity: R('COMMIT_5R1C37_RUNTIME_CANDIDATE_NECESSITY_DECISION.json'),
  regression: R('COMMIT_5R1C37_CLEAN_FULL_REGRESSION.json'),
  frozen: R('COMMIT_5R1C37_FINAL_FROZEN_GATE_RESULT.json'),
  preservation: R('COMMIT_5R1C37_FINAL_PRESERVATION_RESULT.json'),
  closure: R('COMMIT_5R1C37_FINAL_CLOSURE_DECISION_DRAFT.json'),
  request: R('COMMIT_5R1C37_FINAL_OPUS_REQUEST.json'),
  reviewManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  marker: R('COMMIT_5R1C37_FINAL_OPUS_INVOCATION_MARKER.json'),
  capture: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW_CLI_CAPTURE.json'),
  review: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW.json'),
};

const now = () => new Date().toISOString();
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const assert = (value, message) => { if (!value) throw new Error(message); };
const fileRecord = (file) => {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), bytes: bytes.length, sha256: sha(bytes) };
};
const writeOnce = (file, value) => {
  assert(!fs.existsSync(file), `C37_SAFE_PAUSE_WRITE_ONCE_EXISTS:${rel(file)}`);
  fs.writeFileSync(file, Buffer.isBuffer(value) ? value : Buffer.from(value), { flag: 'wx' });
};
const writeJson = (file, value) => writeOnce(file, stable(value));
const git = (...args) => execFileSync('git', args, {
  cwd: REPO,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 1024,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
}).trim();

function verifyManifest(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const seen = new Set();
  const bad = [];
  for (const line of lines) {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!match || seen.has(match?.[2])) { bad.push(line); continue; }
    seen.add(match[2]);
    const target = path.join(REPO, match[2]);
    if (!fs.existsSync(target) || sha(fs.readFileSync(target)) !== match[1]) bad.push(match[2]);
  }
  return { path: rel(file), bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)), rows: lines.length,
    duplicates: lines.length - seen.size, bad, pass: bad.length === 0 && lines.length === seen.size };
}

function liveState() {
  const upstream = git('rev-parse', '@{upstream}');
  const counts = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').split(/\s+/).map(Number);
  const nodeQuery = spawnSync('powershell.exe', ['-NoProfile', '-Command',
    `(Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne ${process.pid} } | Select-Object -ExpandProperty Id) -join ','`],
  { cwd: REPO, encoding: 'utf8', windowsHide: true });
  const netstat = spawnSync('netstat.exe', ['-ano', '-p', 'TCP'], { cwd: REPO, encoding: 'utf8', windowsHide: true });
  const listeners = (netstat.stdout || '').split(/\r?\n/).filter((line) => /:5173\s+.*LISTENING/i.test(line));
  return {
    head: git('rev-parse', 'HEAD'), upstream, parent: git('rev-parse', 'HEAD^'), branch: git('branch', '--show-current'),
    ahead: counts[0], behind: counts[1], staging: git('diff', '--cached', '--name-only'),
    tracked: git('status', '--porcelain=v1', '--untracked-files=no'),
    otherNodePids: (nodeQuery.stdout || '').trim().split(',').filter(Boolean),
    nodeInspectionExitCode: nodeQuery.status, port5173Listeners: listeners,
    allocationLock: fs.existsSync(R('.attempt-allocation.lock')), indexLock: fs.existsSync(path.join(REPO, '.git/index.lock')),
    c37WalExists: fs.existsSync(R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson')),
    c37Attempts: fs.readdirSync(R('attempts')).filter((name) => name.toLowerCase().includes('commit5r1c37')),
  };
}

function verifyBase() {
  for (const file of [ART.preflight, ART.inventory, ART.protected, ART.rows, ART.matrix, ART.necessity,
    ART.regression, ART.frozen, ART.preservation, ART.closure, ART.request, ART.reviewManifest, ART.previous, ART.previousLog]) {
    assert(fs.existsSync(file), `C37_SAFE_PAUSE_REQUIRED_EVIDENCE_MISSING:${rel(file)}`);
  }
  const state = liveState();
  assert(state.head === HEAD && state.upstream === HEAD && state.parent === PARENT && state.branch === BRANCH, 'C37_SAFE_PAUSE_GIT_IDENTITY_DRIFT');
  assert(!state.staging && !state.tracked && state.ahead === 0 && state.behind === 0, 'C37_SAFE_PAUSE_GIT_NOT_CLEAN');
  assert(state.otherNodePids.length === 0 && state.port5173Listeners.length === 0 && !state.allocationLock && !state.indexLock, 'C37_SAFE_PAUSE_PROCESS_OR_LOCK');
  assert(!state.c37WalExists && state.c37Attempts.length === 0, 'C37_SAFE_PAUSE_ATTEMPT_STATE_INVALID');
  assert(!fs.existsSync(ART.marker) && !fs.existsSync(ART.capture) && !fs.existsSync(ART.review), 'C37_SAFE_PAUSE_OPUS_WAS_INVOKED');
  assert(readJson(ART.preflight).pass && readJson(ART.inventory).pass && readJson(ART.rows).pass
    && readJson(ART.matrix).pass && readJson(ART.necessity).pass && readJson(ART.regression).pass
    && readJson(ART.frozen).pass && readJson(ART.preservation).pass, 'C37_SAFE_PAUSE_PACKAGE_NOT_PASS');
  const manifest = verifyManifest(ART.reviewManifest);
  assert(manifest.pass, 'C37_SAFE_PAUSE_REVIEW_MANIFEST_INVALID');
  return { state, manifest };
}

function createCheckpoint() {
  const { state, manifest } = verifyBase();
  const generatedUtc = now();
  writeJson(ART.blocker, {
    schemaVersion: 1, unit: UNIT, classification: 'C37_EXTERNAL_OPUS_REVIEW_AUTHORIZATION_REQUIRED', generatedUtc,
    externalActionAttempted: false,
    commandExecuted: false,
    opusInvocationMarkerCreated: false,
    opusInvocationCount: 0,
    reviewBudgetConsumed: false,
    approvalGuardDecision: 'REJECTED_BEFORE_EXECUTION_UNACCEPTABLE_EXTERNAL_DATA_TRANSMISSION_RISK',
    risk: 'The mandatory Claude Code review would transmit repository evidence to Anthropic\'s external Claude service. The approval guard requires explicit user consent for that destination and payload.',
    exactConsentRequested: 'Authorize one read-only Claude Code Opus 4.8 invocation that may transmit the 57-entry manifest-bound C36/C37 evidence package to Anthropic for independent review.',
    saferAlternativeAdequateForPrompt: false,
    reason: 'The governing prompt requires Claude Code Opus 4.8 specifically; a local self-review would not satisfy independent approval.',
    pass: true,
  });
  writeJson(ART.reconciliation, {
    schemaVersion: 1, unit: UNIT, classification: 'C37_SAFE_PAUSE_RECONCILED_PENDING_EXPLICIT_OPUS_TRANSMISSION_AUTHORIZATION', generatedUtc,
    preflight: fileRecord(ART.preflight), c36InventoryVerification: fileRecord(ART.inventory), protectedResidueBaseline: fileRecord(ART.protected),
    rowAdjudication: fileRecord(ART.rows), clusterMatrix: fileRecord(ART.matrix), candidateNecessity: fileRecord(ART.necessity),
    regression: fileRecord(ART.regression), frozenGates: fileRecord(ART.frozen), preservation: fileRecord(ART.preservation),
    closureDraft: fileRecord(ART.closure), reviewRequest: fileRecord(ART.request), reviewManifest: manifest,
    blocker: fileRecord(ART.blocker),
    candidate: { authorized: 0, allocated: 0, accepted: 0, rejected: 0, technicalIncomplete: 0 },
    activeAttemptId: null, c37WalExists: false, c37AttemptDirectories: [], registryRows: 230, c34WalRows: 32, c35WalRows: 6,
    orphan: 0, dangling: 0, running: 0, opus: { invocationCount: 0, marker: false, capture: false, review: false, budgetConsumed: false },
    metrics: { decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', residualRows: 145 },
    categoryTotals: readJson(ART.rows).categoryTotals,
    runtime: { selectedC34Reason: SELECTED, c35: C35, delta: null, oracleDelta: false },
    documentation: { roadmapV9Updated: false, currentStateUpdated: false },
    git: state,
    prohibitedOperations: { e2: false, a15: false, c38: false, phase10B: false, deployment: false, reindex: false, modelMigration: false },
    safeToResume: true, pass: true,
  });
  writeJson(ART.terminal, {
    schemaVersion: 1, unit: UNIT, classification: CLASSIFICATION, generatedUtc,
    blocker: fileRecord(ART.blocker), reconciliation: fileRecord(ART.reconciliation),
    reason: 'The complete no-runtime governance package is reproducible and ready, but external Opus transmission requires explicit user consent before the first and only invocation.',
    head: HEAD, upstream: HEAD, phase10A: 'OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW',
    c37: 'SAFE_PAUSED_PENDING_OPUS_NOT_TERMINAL', candidateDecision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED',
    opusInvocationCount: 0, reviewBudgetConsumed: false, docsUpdated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
    exactNextOperation: 'After explicit user consent, resume from checkpoint 64 and invoke the already-prepared Claude Code Opus 4.8 review exactly once; do not change the reviewed package first.',
    safeToResume: true, activeAttemptId: null, pass: true,
  });
  const previous = readJson(ART.previous);
  const baseEvent = {
    schemaVersion: 2, ordinal: 64, commitUnit: UNIT, updatedAtUtc: generatedUtc,
    stage: 'external Opus transmission authorization safe pause', status: CLASSIFICATION,
    head: HEAD, upstream: HEAD, parent: PARENT, branch: BRANCH,
    activeReasonBaseHash: SELECTED, c35RuntimeHash: C35, activeAttemptId: null,
    candidateBudget: { maximum: 1, authorized: 0, allocated: 0, accepted: 0, rejected: 0, technicalIncomplete: 0 },
    candidateDispositions: [], reasonBefore: '3575/3720', reasonAfter: '3575/3720', decision: '3720/3720', relation: '3720/3720',
    reasonOnlyRowsRemaining: 145, phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_OPUS_REVIEW', r20: 'IN_PROGRESS',
    c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL', c37: 'SAFE_PAUSED_PENDING_OPUS_NOT_TERMINAL',
    opusDecision: null, opusInvocationCount: 0, reviewBudgetConsumed: false,
    roadmapV9Updated: false, currentStateUpdated: false, finalApprovalManifestCreated: false,
    stagingPerformed: false, commitCreated: false, pushPerformed: false,
    registryAttempts: 230, attemptDirectories: 230, c34WalRows: 32, c35WalRows: 6, c37WalExists: false, c37WalRows: 0,
    orphan: 0, dangling: 0, running: 0, stagingEmpty: true, trackedWorktreeClean: true,
    headEqualsUpstream: true, ahead: 0, behind: 0, localServiceRunning: false, port5173Free: true,
    allocationLock: false, indexLock: false, protectedResiduePreserved: true, c35Preserved: true,
    deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false,
    e2Begun: false, a15Begun: false, c38Begun: false, phase10BImplementationBegun: false,
    terminalState: fileRecord(ART.terminal), reconciliation: fileRecord(ART.reconciliation), blocker: fileRecord(ART.blocker),
    reviewManifest: manifest,
    previousCheckpoint: { ordinal: previous.ordinal, pointerSha256: sha(fs.readFileSync(ART.previous)),
      logSha256: sha(fs.readFileSync(ART.previousLog)), eventSha256: previous.eventSha256 },
    nextExactOperation: 'Obtain explicit user consent to transmit the 57-entry manifest-bound evidence package to Anthropic, then invoke the prepared read-only Claude Code Opus 4.8 review exactly once. Do not stage, commit, push, begin C38, E2, A15, Phase 10B, deploy, reindex, or migrate a model first.',
    safePauseReason: 'EXTERNAL_REVIEW_DATA_TRANSMISSION_REQUIRES_EXPLICIT_USER_APPROVAL',
    safeToResume: true, blocker: 'EXPLICIT_EXTERNAL_OPUS_TRANSMISSION_AUTHORIZATION_REQUIRED',
  };
  const eventSha256 = sha(Buffer.from(stable(baseEvent)));
  const checkpoint = { ...baseEvent, eventSha256 };
  const bytes = Buffer.from(stable(checkpoint));
  writeOnce(ART.pointer, bytes);
  writeOnce(ART.numbered, bytes);
  writeOnce(ART.log, Buffer.from(`${JSON.stringify(checkpoint)}\n`));
  console.log(JSON.stringify({ classification: CLASSIFICATION, checkpoint: 64, eventSha256, safeToResume: true, opusInvocationCount: 0 }));
}

function replayCheckpoint() {
  const { state, manifest } = verifyBase();
  assert(fs.existsSync(ART.pointer) && fs.existsSync(ART.numbered) && fs.existsSync(ART.log), 'C37_CHECKPOINT_64_MISSING');
  assert(!fs.existsSync(ART.replay), 'C37_CHECKPOINT_64_REPLAY_EXISTS');
  const pointer = fs.readFileSync(ART.pointer);
  const numbered = fs.readFileSync(ART.numbered);
  const logBefore = fs.readFileSync(ART.log);
  const checkpoint = JSON.parse(pointer.toString('utf8'));
  const logRows = logBefore.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert(pointer.equals(numbered) && checkpoint.ordinal === 64 && checkpoint.safeToResume === true
    && checkpoint.activeAttemptId === null && logRows.length === 1 && logRows[0].eventSha256 === checkpoint.eventSha256,
  'C37_CHECKPOINT_64_REPLAY_PRECONDITION_FAILED');
  const evidenceBefore = [ART.blocker, ART.reconciliation, ART.terminal, ART.pointer, ART.numbered, ART.log, ART.reviewManifest]
    .map(fileRecord);
  const replay = {
    schemaVersion: 1, unit: UNIT, classification: 'C37_CHECKPOINT_64_IDEMPOTENCE_REPLAY_PASS', generatedUtc: now(),
    checkpoint: fileRecord(ART.pointer), numberedCheckpoint: fileRecord(ART.numbered), log: fileRecord(ART.log),
    eventSha256: checkpoint.eventSha256, checkpointRows: 1,
    noDuplicateCheckpoint: true, noDuplicateAttempt: true, noDuplicateRegistryRow: true, noDuplicateWalRow: true,
    noDuplicateOpusInvocation: true, noDuplicateStagingOrCommit: true, noManifestMutation: true,
    noProtectedResidueMutation: true, noActiveProcess: state.otherNodePids.length === 0,
    reviewManifest: manifest, evidenceBefore, evidenceAfter: evidenceBefore,
    safeToResume: true, activeAttemptId: null, pass: true,
  };
  writeJson(ART.replay, replay);
  assert(fs.readFileSync(ART.log).equals(logBefore), 'C37_CHECKPOINT_64_LOG_MUTATED_DURING_REPLAY');
  console.log(JSON.stringify({ classification: replay.classification, checkpointRows: 1, opusInvocationCount: 0, pass: true }));
}

assert(process.argv.length === 3 && process.argv[2] === '--checkpoint', 'C37_SAFE_PAUSE_CHECKPOINT_MODE_REQUIRED');
if (fs.existsSync(ART.pointer)) replayCheckpoint();
else createCheckpoint();
