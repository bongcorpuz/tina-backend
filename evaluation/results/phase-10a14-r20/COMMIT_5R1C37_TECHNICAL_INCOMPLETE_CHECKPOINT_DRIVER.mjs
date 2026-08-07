// PHASE-10A14-R20 COMMIT 5R1-C37
// Write-once technical-incomplete reconciliation and checkpoint-65 driver.
// This driver does not invoke Claude, edit documentation, stage, commit, push,
// or alter runtime/oracle/registry/WAL state.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const ATTEMPTS = path.join(RESULTS, 'attempts');
const R = (name) => path.join(RESULTS, name);
const EXPECTED = Object.freeze({
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  parent: 'd5b25e676f623fbc1888608ff250824fcd34af99',
  branch: 'feature/source-availability-engine-v1',
  checkpoint64: 'c2041ad4b9d437aa801752e10dcf58bffedcc5b638013d6079b4fce672acd6e9',
  checkpoint64Event: '853ae993a069fd9f677f62b20d90ebaed155384c4cdb7416a6aace76db93af15',
  packageSource: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  packageManifest: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0',
  packageAggregate: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',
  request: '0551f3cc2dbe899ca5d8f495ff6cd15462623017fd13017596a3c9d747f60449',
  authorization: '57fc53266e3965fac7e402f90be17d8596bdd439eb6a938a0cd975c98703e2a4',
  attemptedStdinBytes: 4188309,
  attemptedStdinSha256: 'eb013eee8f50809d41fce9576ae8dd34f7329dad578cdbe0dbfbafb956db0de8',
  stderr: '527402a1802b7997c67036cd7e8e596f497547ae44b649ce8a135201ebc6f59b',
  empty: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  registry: 'a0261acfcc4cc69615794fe6f26117c00789d42862a75fae3e978b2e17a1e073',
  c34Wal: '2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2',
  c35Wal: 'd86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f',
  c35Composite: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
  selectedReason: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
});

const F = Object.freeze({
  thisDriver: fileURLToPath(import.meta.url),
  continuationDriver: R('COMMIT_5R1C37_CHECKPOINT_64_CONTINUATION_DRIVER.mjs'),
  checkpoint: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  checkpoint64: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_64_external_opus_transmission_authorization_safe_pause.json'),
  checkpoint64Replay: R('COMMIT_5R1C37_CHECKPOINT_64_IDEMPOTENCE_REPLAY.json'),
  checkpoint65: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_65_opus_cli_configuration_technical_incomplete.json'),
  checkpoint65Replay: R('COMMIT_5R1C37_CHECKPOINT_65_IDEMPOTENCE_REPLAY.json'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  sourceManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  packageManifest: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  packageSha: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE.sha256'),
  authorization: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_AUTHORIZATION.json'),
  request: R('COMMIT_5R1C37_FINAL_OPUS_REQUEST.md'),
  marker: R('COMMIT_5R1C37_FINAL_OPUS_INVOCATION_MARKER.json'),
  capture: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW_CLI_CAPTURE.json'),
  stdout: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW_STDOUT.txt'),
  stderr: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW_STDERR.txt'),
  reviewJson: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW.json'),
  reviewMd: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW.md'),
  receipt: R('COMMIT_5R1C37_FINAL_OPUS_TRANSMISSION_RECEIPT.json'),
  preflight: R('COMMIT_5R1C37_CHECKPOINT_64_CONTINUATION_PREFLIGHT.json'),
  protectedVerification: R('COMMIT_5R1C37_CHECKPOINT_64_PROTECTED_RESIDUE_VERIFICATION.json'),
  scope: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_SCOPE_VALIDATION.json'),
  sensitive: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_SENSITIVE_DATA_SCAN.json'),
  protectedBaseline: R('COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
  c36Manifest: R('COMMIT_5R1C36_SAFE_PAUSE_EVIDENCE.sha256'),
  registry: R('CANONICAL_ATTEMPT_REGISTRY.json'),
  c34Wal: R('COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c35Wal: R('COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c36Wal: R('COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c37Wal: R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson'),
  preservation: R('COMMIT_5R1C37_FINAL_PRESERVATION_RESULT.json'),
  attemptLedger: R('COMMIT_5R1C37_FINAL_ATTEMPT_LEDGER.json'),
  auditSupplement: R('COMMIT_5R1C37_CHECKPOINT_64_CONTINUATION_AUDIT_SUPPLEMENT.json'),
  correction: R('COMMIT_5R1C37_FINAL_OPUS_CAPTURE_CORRECTION_ADDENDUM.json'),
  adjudication: R('COMMIT_5R1C37_FINAL_OPUS_TECHNICAL_INCOMPLETE_ADJUDICATION.json'),
  reconciliation: R('COMMIT_5R1C37_TWO_HOUR_OPUS_TECHNICAL_INCOMPLETE_RECONCILIATION.json'),
  terminal: R('COMMIT_5R1C37_TWO_HOUR_OPUS_TECHNICAL_INCOMPLETE_TERMINAL_STATE.json'),
  safePauseManifest: R('COMMIT_5R1C37_TWO_HOUR_OPUS_TECHNICAL_INCOMPLETE_EVIDENCE.sha256'),
});

const PREP_FILES = [
  F.continuationDriver, F.preflight, F.protectedVerification, F.authorization,
  F.packageManifest, F.packageSha, F.scope, F.sensitive, F.request,
];
const REVIEW_FILES = [F.marker, F.capture, F.stdout, F.stderr, F.reviewJson, F.reviewMd, F.receipt];
const NEW_OUTPUTS = [F.auditSupplement, F.correction, F.adjudication, F.reconciliation, F.terminal, F.safePauseManifest, F.checkpoint65, F.checkpoint65Replay];

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const now = () => new Date().toISOString();
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: args[0] === 'show' ? undefined : 'utf8' });
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const lineCount = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim()).length : 0;

function record(file) {
  const data = fs.readFileSync(file);
  return { path: rel(file), bytes: data.length, sha256: sha(data) };
}

function writeOnce(file, value) {
  assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const temp = `${file}.write-once-${process.pid}-${crypto.randomBytes(8).toString('hex')}.tmp`;
  let complete = false;
  try {
    const fd = fs.openSync(temp, 'wx');
    try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert(!fs.existsSync(file), `WRITE_ONCE_RACE:${rel(file)}`);
    fs.renameSync(temp, file);
    complete = true;
  } finally {
    if (!complete && fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
  return record(file);
}

function replacePointerAtomically(data) {
  const temp = `${F.checkpoint}.checkpoint65-${process.pid}-${crypto.randomBytes(8).toString('hex')}.tmp`;
  let complete = false;
  try {
    const fd = fs.openSync(temp, 'wx');
    try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, F.checkpoint);
    complete = true;
  } finally {
    if (!complete && fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
}

function parseManifest(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `MANIFEST_MALFORMED:${rel(file)}:${index + 1}`);
    return { sha256: match[1], path: match[2].replaceAll('\\', '/') };
  });
}

function verifyManifest(file, expectedRows) {
  const rows = parseManifest(file);
  const seen = new Set();
  const bad = [];
  for (const row of rows) {
    const target = path.resolve(REPO, ...row.path.split('/'));
    if (seen.has(row.path) || !fs.existsSync(target) || shaFile(target) !== row.sha256) bad.push(row.path);
    seen.add(row.path);
  }
  return { manifest: record(file), rows: rows.length, uniquePaths: seen.size, bad, pass: rows.length === expectedRows && seen.size === expectedRows && bad.length === 0 };
}

function c35Identity() {
  const expected = Object.freeze({
    'ask-handler.js': 'c10d913f3b6bd09b0a38ce319845bb2e908f46a6e829f02c13129d45b8827602',
    'conflict-engine.js': 'a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d',
    'services/answer-support-evidence.js': 'ed7a0873e9be3980092596946b5b765d90e459ee56fec3660c8fcbe8cd592d37',
    'services/answer-support-validator.js': '885f0dd8666b979e478bc2be5218281f2cd91445368d5604b3fb7a46e53b764e',
  });
  const components = Object.keys(expected).sort().map((name) => record(path.join(REPO, name)));
  const framing = components.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\n`).join('');
  const compositeSha256 = sha(Buffer.from(framing, 'utf8'));
  const pass = compositeSha256 === EXPECTED.c35Composite && components.every((item) => item.sha256 === expected[item.path]);
  assert(pass, 'C35_RUNTIME_DRIFT');
  return { components, compositeSha256, pass };
}

function processState() {
  const ps = `$ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('node.exe','claude.exe') } | Select-Object Name,ProcessId,ParentProcessId,ExecutablePath,CommandLine) | ConvertTo-Json -Compress -Depth 4`;
  let processes = [];
  try {
    const raw = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).trim();
    const parsed = raw ? JSON.parse(raw) : [];
    processes = Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    throw new Error(`PROCESS_INSPECTION_FAILED:${error instanceof Error ? error.message : String(error)}`);
  }
  const normalized = processes.map((item) => ({
    imageName: item.Name,
    pid: Number(item.ProcessId),
    parentPid: Number(item.ParentProcessId),
    executablePath: item.ExecutablePath || null,
    commandLineSha256: item.CommandLine ? sha(Buffer.from(item.CommandLine, 'utf8')) : null,
    classification: Number(item.ProcessId) === process.pid
      ? 'CURRENT_CHECKPOINT_EXECUTOR'
      : /anthropic\.claude-code-.*resources\\native-binary\\claude\.exe/i.test(item.ExecutablePath || '')
        ? 'PRE_EXISTING_USER_OWNED_VSCODE_CLAUDE_EXTENSION'
        : /AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude\.exe/i.test(item.ExecutablePath || '')
          ? 'C37_REVIEW_CLI'
          : 'OTHER',
  }));
  const netstat = execFileSync('netstat.exe', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const port5173 = netstat.split(/\r?\n/).filter((line) => {
    const fields = line.trim().split(/\s+/);
    return fields[0] === 'TCP' && /:5173$/.test(fields[1] || '') && fields[3] === 'LISTENING';
  });
  const resultsTemps = fs.readdirSync(RESULTS, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^(?:\.c3[67]-|\.commit5r1c3[67]-|commit5r1c3[67]-temp)/i.test(entry.name)).map((entry) => entry.name);
  const externalTemps = fs.existsSync('C:/tmp') ? fs.readdirSync('C:/tmp', { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^c37-opus-(?:review|runtime)-/.test(entry.name)).map((entry) => entry.name) : [];
  const locks = [path.join(REPO, '.git/index.lock'), ...fs.readdirSync(RESULTS).filter((name) => /(?:allocation|runtime)\.lock$/i.test(name)).map((name) => R(name))].filter(fs.existsSync).map(rel);
  const activeC37 = normalized.filter((item) => item.classification === 'C37_REVIEW_CLI');
  const otherNode = normalized.filter((item) => item.imageName?.toLowerCase() === 'node.exe' && item.pid !== process.pid);
  const state = {
    observedUtc: now(), processes: normalized,
    activeC37ReviewProcesses: activeC37,
    otherNodeProcesses: otherNode,
    preExistingUserOwnedClaudeExtensionProcesses: normalized.filter((item) => item.classification === 'PRE_EXISTING_USER_OWNED_VSCODE_CLAUDE_EXTENSION'),
    port5173Listeners: port5173, resultsTemporaryRuntimes: resultsTemps,
    externalC37TemporaryDirectories: externalTemps, locks,
    noActiveC37OperationProcess: activeC37.length === 0 && otherNode.length === 0,
    pass: activeC37.length === 0 && otherNode.length === 0 && port5173.length === 0 && resultsTemps.length === 0 && externalTemps.length === 0 && locks.length === 0,
  };
  assert(state.pass, 'C37_ACTIVE_PROCESS_TEMP_LOCK_OR_PORT');
  return state;
}

function registryState() {
  const registry = readJson(F.registry);
  const attempts = registry.attempts;
  const ids = attempts.map((attempt) => attempt.attemptId);
  const dirs = fs.readdirSync(ATTEMPTS, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const idSet = new Set(ids);
  const dirSet = new Set(dirs);
  const state = {
    registry: record(F.registry), registryRows: attempts.length, attemptDirectories: dirs.length,
    orphan: dirs.filter((id) => !idSet.has(id)), dangling: ids.filter((id) => !dirSet.has(id)),
    running: attempts.filter((attempt) => attempt.status === 'running').map((attempt) => attempt.attemptId),
    c34Wal: { ...record(F.c34Wal), rows: lineCount(F.c34Wal) },
    c35Wal: { ...record(F.c35Wal), rows: lineCount(F.c35Wal) },
    c36Wal: { path: rel(F.c36Wal), exists: fs.existsSync(F.c36Wal), rows: lineCount(F.c36Wal) },
    c37Wal: { path: rel(F.c37Wal), exists: fs.existsSync(F.c37Wal), rows: lineCount(F.c37Wal) },
    c36OrC37Attempts: [...ids, ...dirs].filter((id) => /commit5r1c3[67]/i.test(id)),
  };
  state.pass = state.registry.sha256 === EXPECTED.registry && attempts.length === 230 && new Set(ids).size === 230 && dirs.length === 230
    && state.orphan.length === 0 && state.dangling.length === 0 && state.running.length === 0
    && state.c34Wal.sha256 === EXPECTED.c34Wal && state.c34Wal.rows === 32
    && state.c35Wal.sha256 === EXPECTED.c35Wal && state.c35Wal.rows === 6
    && !state.c36Wal.exists && !state.c37Wal.exists && state.c36OrC37Attempts.length === 0;
  assert(state.pass, 'REGISTRY_WAL_ATTEMPT_DRIFT');
  return state;
}

function protectedState() {
  const baseline = readJson(F.protectedBaseline);
  const checks = [...baseline.records, ...baseline.protectedTrackedControls].map((expected) => {
    const actual = record(path.resolve(REPO, ...expected.path.split('/')));
    return { path: expected.path, expectedBytes: expected.bytes, expectedSha256: expected.sha256, actualBytes: actual.bytes, actualSha256: actual.sha256, pass: actual.bytes === expected.bytes && actual.sha256 === expected.sha256 };
  });
  const c36 = verifyManifest(F.c36Manifest, 48);
  const package57 = verifyManifest(F.sourceManifest, 57);
  const pass = checks.every((item) => item.pass) && c36.pass && package57.pass;
  assert(pass, 'PROTECTED_RESIDUE_OR_PACKAGE_DRIFT');
  return { baseline: record(F.protectedBaseline), checks, c36, package57, mismatches: checks.filter((item) => !item.pass).map((item) => item.path), pass };
}

function docState() {
  const names = [
    'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
    'knowledge/CURRENT_STATE.md', 'knowledge/TINA_Updated_Roadmap_v7.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
  ];
  const records = names.map((name) => {
    const current = fs.readFileSync(path.join(REPO, name));
    const committed = git('show', `HEAD:${name}`);
    return { path: name, currentBytes: current.length, currentSha256: sha(current), committedBytes: committed.length, committedSha256: sha(committed), unchanged: current.equals(committed) };
  });
  assert(records.every((item) => item.unchanged), 'DOCUMENTATION_DRIFT');
  return { records, roadmapV9Updated: false, currentStateUpdated: false, pass: true };
}

function main() {
  for (const file of NEW_OUTPUTS) assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
  assert(fs.existsSync(F.checkpoint) && shaFile(F.checkpoint) === EXPECTED.checkpoint64, 'CHECKPOINT64_POINTER_PRECONDITION');
  assert(shaFile(F.checkpoint64) === EXPECTED.checkpoint64 && fs.readFileSync(F.checkpoint).equals(fs.readFileSync(F.checkpoint64)), 'CHECKPOINT64_NUMBERED_MISMATCH');
  const logBefore = fs.readFileSync(F.log);
  const logRowsBefore = logBefore.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  assert(logRowsBefore.length === 1 && logRowsBefore[0].ordinal === 64 && logRowsBefore[0].eventSha256 === EXPECTED.checkpoint64Event, 'CHECKPOINT_LOG_PRECONDITION');
  assert(git('rev-parse', 'HEAD').trim() === EXPECTED.head && git('rev-parse', '@{upstream}').trim() === EXPECTED.head && git('branch', '--show-current').trim() === EXPECTED.branch, 'GIT_IDENTITY_DRIFT');
  assert(git('diff', '--cached', '--name-only').trim() === '' && git('status', '--porcelain=v1', '--untracked-files=no').trim() === '', 'TRACKED_OR_STAGING_DIRTY');

  for (const file of [...PREP_FILES, ...REVIEW_FILES]) assert(fs.existsSync(file), `MISSING_CONTINUATION_EVIDENCE:${rel(file)}`);
  assert(shaFile(F.packageManifest) === EXPECTED.packageManifest && shaFile(F.packageSha) === EXPECTED.packageSource && shaFile(F.request) === EXPECTED.request && shaFile(F.authorization) === EXPECTED.authorization, 'PACKAGE_REQUEST_AUTH_IDENTITY');
  assert(shaFile(F.stdout) === EXPECTED.empty && shaFile(F.stderr) === EXPECTED.stderr, 'RAW_CLI_CAPTURE_IDENTITY');
  const marker = readJson(F.marker);
  const capture = readJson(F.capture);
  const receipt = readJson(F.receipt);
  assert(marker.invocationOrdinal === 1 && marker.maximumInvocations === 1 && marker.retryAuthorized === false, 'INVOCATION_MARKER_STATE');
  assert(capture.exitCode === 1 && capture.response.stdout.bytes === 0 && capture.response.parsed === false && capture.authorizationConsumed === true && capture.retryAuthorized === false, 'CLI_CAPTURE_STATE');
  assert(receipt.authorization.consumed === true && receipt.authorization.maximumInvocations === 1 && receipt.authorization.retryAuthorized === false, 'RECEIPT_AUTHORIZATION_STATE');
  assert(capture.stdin.totalStdinBytes === EXPECTED.attemptedStdinBytes && capture.stdin.stdinSha256 === EXPECTED.attemptedStdinSha256, 'ATTEMPTED_STDIN_IDENTITY');

  const initialEvidence = [...PREP_FILES, ...REVIEW_FILES].map(record);
  const processBefore = processState();
  const registry = registryState();
  const protectedResidue = protectedState();
  const c35 = c35Identity();
  const docs = docState();
  const preservation = readJson(F.preservation);
  const attemptLedger = readJson(F.attemptLedger);
  assert(preservation.selectedReasonRuntime.servicesTreeDigest === EXPECTED.selectedReason && preservation.pass === true, 'C34_REASON_PRESERVATION');
  assert(attemptLedger.candidateBudget.authorized === 0 && attemptLedger.candidateBudget.allocated === 0 && attemptLedger.c37WalExists === false && attemptLedger.c37AttemptDirectories.length === 0, 'C37_CANDIDATE_OR_WAL_DRIFT');

  const auditSupplement = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_CHECKPOINT_64_CONTINUATION_READ_ONLY_AUDIT_SUPPLEMENT', generatedUtc: now(),
    checkpointAudit: {
      result: 'PASS', checkpoint64Sha256: EXPECTED.checkpoint64,
      checkpoint64EventSha256: EXPECTED.checkpoint64Event,
      checkpointIdempotenceReplay: record(F.checkpoint64Replay),
      gitHeadUpstreamRemoteTracking: EXPECTED.head,
    },
    packageAudit: {
      result: 'PASS', entries: 57, uniquePaths: 57, rawEvidenceBytes: 4109852,
      sourceManifestSha256: EXPECTED.packageSource, detailedManifestSha256: EXPECTED.packageManifest,
      aggregateSha256: EXPECTED.packageAggregate,
      jsonAndNdjsonDocumentsParsedByBoundedIndependentAudit: 493,
      missingOrBadHashes: 0, symlinkOrReparseEscapes: 0,
      credentialsEnvironmentFilesClientOrPersonalDataFindings: 0,
    },
    processAudit: {
      preInvocationIdentifiedProcess: {
        pid: 24136,
        executablePath: 'C:/Users/USER/.vscode/extensions/anthropic.claude-code-2.1.220-win32-x64/resources/native-binary/claude.exe',
        classification: 'PRE_EXISTING_USER_OWNED_VSCODE_CLAUDE_EXTENSION',
        basis: 'Its escalated read-only command-line inspection showed the VS Code extension stream service and --add-dir for the repository; it preceded the C37 marker and was not the configured C37 review CLI executable.',
      },
      current: processBefore,
    },
    driverAuditLimitations: [
      'The preparation driver itself did not perform the independent JSON/NDJSON parsing and heuristic adjudication that supported its sensitive-scan narrative; this supplement records the bounded independent audit provenance.',
      'The preparation driver classified pre-existing Claude processes from the observed process list without performing command-line inspection internally; command-line inspection had been performed separately before invocation.',
      'The review validator did not independently enforce strict JSON schema/property ordering or classify nonblocking observations. These acceptance gaps were never reached because no reviewer output existed.',
    ],
    effect: 'These limitations do not authorize a retry and do not convert the local CLI failure into a semantic review result.',
    pass: true,
  };
  writeOnce(F.auditSupplement, stable(auditSupplement));

  const correction = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_FINAL_OPUS_CAPTURE_AUTHORITATIVE_CORRECTION_ADDENDUM', generatedUtc: now(),
    immutableSources: [record(F.capture), record(F.receipt), record(F.reviewJson), record(F.reviewMd), record(F.stdout), record(F.stderr)],
    corrections: {
      actualReviewerDecisionToken: null,
      actualReviewerSubstantivePathToken: null,
      schemaConformingReviewerObjectReceived: false,
      modelReviewReached: false,
      captureFirstDecisionTokenWasExecutorSynthetic: true,
      receiptFirstDecisionTokenWasExecutorSynthetic: true,
      reviewJsonWasExecutorSyntheticFallback: true,
      reviewMdWasExecutorGeneratedSummary: true,
      attemptedApplicationPayloadBytes: EXPECTED.attemptedStdinBytes,
      attemptedApplicationPayloadSha256: EXPECTED.attemptedStdinSha256,
      completeChildStdinAcceptanceConfirmed: false,
      childStdinError: 'write EOF',
      providerApplicationRequestObserved: false,
      confirmedEvidenceBytesTransmittedToAnthropic: 0,
      exactProviderWireBytes: null,
      providerTransmissionAdjudication: 'No Anthropic/model response or API envelope was observed. Claude Code exited during local MCP configuration validation and closed stdin. Exact provider wire traffic is not exposed; the evidence supports a local pre-model failure, not a completed package delivery.',
      authorizationConsumedConservatively: true,
      retryAuthorized: false,
      authoritativeTerminalClassification: 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE',
    },
    supersessionRule: 'For decision tokens, stdin-delivery completion, provider transmission, review completion, and terminal classification, this additive correction is authoritative; the original write-once raw/capture files remain preserved.',
    pass: true,
  };
  writeOnce(F.correction, stable(correction));

  const adjudication = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_FINAL_OPUS_TECHNICAL_INCOMPLETE_LOCAL_CLI_CONFIGURATION_FAILURE', generatedUtc: now(),
    invocationMarker: record(F.marker), cliCapture: record(F.capture), correction: record(F.correction),
    externalTransmissionAuthorization: record(F.authorization), packageManifest: record(F.packageManifest),
    failure: {
      stage: 'LOCAL_CLAUDE_CODE_CONFIGURATION_VALIDATION_BEFORE_MODEL_REVIEW',
      exitCode: 1, signal: null, stdoutBytes: 0, stderrBytes: fs.statSync(F.stderr).size,
      stderrSha256: EXPECTED.stderr,
      sanitizedMessage: 'Invalid MCP configuration: mcpServers expected a record but was undefined.',
      rootCause: 'The sole invocation supplied an empty JSON object to --mcp-config instead of a configuration object containing mcpServers. The CLI rejected it locally and closed stdin.',
      toolFailureIsTechnicalIncompleteNotSemanticRejection: true,
    },
    actualReviewerResult: { decisionToken: null, substantivePathToken: null, observations: [], complete57EntryPackageReviewed: false },
    authorization: { invocationOrdinalAttempted: 1, maximumInvocations: 1, consumed: true, retryAuthorized: false },
    transmission: {
      intendedEvidenceEntries: 57, intendedRawEvidenceBytes: 4109852,
      attemptedStdinBytes: EXPECTED.attemptedStdinBytes, attemptedStdinSha256: EXPECTED.attemptedStdinSha256,
      childAcceptedCompleteStdin: false, providerRequestObserved: false,
      confirmedEvidenceBytesTransmittedToAnthropic: 0, exactProviderWireBytes: null,
      unrelatedOrSensitivePayloadAttempted: false,
    },
    requiredConsequences: {
      retryProhibited: true, roadmapV9UpdateProhibited: true, currentStateUpdateProhibited: true,
      stagingProhibited: true, commitProhibited: true, pushProhibited: true,
      runtimeOracleRegistryWalMutationProhibited: true, c38E2A15Phase10BProhibited: true,
      appendTechnicalIncompleteCheckpoint65: true,
    },
    finalClassification: 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE',
    pass: true,
  };
  writeOnce(F.adjudication, stable(adjudication));

  const processAfterAdjudication = processState();
  const currentEvidence = [...PREP_FILES, ...REVIEW_FILES, F.auditSupplement, F.correction, F.adjudication].map(record);
  const reconciliation = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_TWO_HOUR_OPUS_TECHNICAL_INCOMPLETE_RECONCILED', generatedUtc: now(),
    startingCheckpoint: { ordinal: 64, path: rel(F.checkpoint64), sha256: EXPECTED.checkpoint64, eventSha256: EXPECTED.checkpoint64Event },
    git: { head: EXPECTED.head, parent: EXPECTED.parent, branch: EXPECTED.branch, upstream: git('rev-parse', '@{upstream}').trim(), stagingEmpty: true, trackedTreeClean: true, commitCreated: false, pushPerformed: false },
    reviewer: {
      invocationCount: 1, authorizationConsumed: true, retryAuthorized: false,
      actualDecisionToken: null, actualSubstantivePathToken: null,
      localCliExitCode: 1, modelReviewReached: false,
      terminalClassification: 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE',
    },
    package: { count: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: EXPECTED.packageSource, detailedManifestSha256: EXPECTED.packageManifest, aggregateSha256: EXPECTED.packageAggregate, sensitiveAndScopeValidationPass: true },
    transmission: adjudication.transmission,
    frozenC37: { rowsAdjudicated: '145/145', generalizedRuntimeDefects: 0, decision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', reason: '3575/3720', decisionMetric: '3720/3720', relationMetric: '3720/3720', candidatesAuthorizedAllocated: '0/0' },
    preservation: { c35, selectedC34ReasonRuntimeSha256: EXPECTED.selectedReason, runtimeChanges: 0, oracleChanges: 0, registryChanges: 0, walChanges: 0 },
    registryWalAttempts: registry, protectedResidue, documentation: docs,
    finalization: { phase10AStatusAssessmentCreated: false, roadmapV9Updated: false, currentStateUpdated: false, finalManifestCreated: false, staged: false, committed: false, pushed: false },
    prohibitedWork: { c38Begun: false, e2Begun: false, a15Begun: false, phase10BBegun: false, deployment: false, reindex: false, modelMigration: false },
    processState: processAfterAdjudication,
    continuationEvidenceBeforeCheckpoint: currentEvidence,
    nextExactOperation: 'STOP. This authorization is consumed. A replacement independent review would require a new separately governed prompt and explicit authorization after correcting the local CLI configuration; do not retry under this continuation and do not begin C38, E2, A15, Phase 10B, deployment, reindexing, or model migration.',
    safeToResume: true, activeAttemptId: null, pass: true,
  };
  writeOnce(F.reconciliation, stable(reconciliation));

  const terminal = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE', generatedUtc: now(),
    reason: 'The sole authorized Claude Code invocation failed local MCP configuration validation before a model review. No valid decision token exists; authorization is consumed and retry is prohibited.',
    technicalAdjudication: record(F.adjudication), correctionAddendum: record(F.correction),
    reconciliation: record(F.reconciliation), auditSupplement: record(F.auditSupplement),
    head: EXPECTED.head, upstream: EXPECTED.head,
    checkpointBefore: 64, checkpointAfter: 65,
    phase10A: 'OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW',
    c37: 'SAFE_PAUSED_OPUS_TECHNICAL_INCOMPLETE_NOT_TERMINAL',
    opusInvocationCount: 1, reviewBudgetConsumed: true, authorizationConsumed: true,
    actualOpusDecision: null, actualSubstantivePathDecision: null,
    attemptedStdinBytes: EXPECTED.attemptedStdinBytes,
    providerRequestObserved: false, confirmedEvidenceBytesTransmittedToAnthropic: 0,
    exactProviderWireBytes: null, retryAuthorized: false,
    docsUpdated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
    runtimeOracleRegistryWalMutationCount: 0,
    c38Begun: false, e2Begun: false, a15Begun: false, phase10BBegun: false,
    deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false,
    exactNextOperation: reconciliation.nextExactOperation,
    safeToResume: true, activeAttemptId: null, pass: true,
  };
  writeOnce(F.terminal, stable(terminal));

  const manifestFiles = [...PREP_FILES, ...REVIEW_FILES, F.auditSupplement, F.correction, F.adjudication, F.reconciliation, F.terminal, F.thisDriver]
    .map((file) => path.resolve(file)).filter((file, index, array) => array.indexOf(file) === index)
    .sort((a, b) => rel(a).localeCompare(rel(b)));
  const manifestText = `${manifestFiles.map((file) => `${shaFile(file)}  ${rel(file)}`).join('\n')}\n`;
  writeOnce(F.safePauseManifest, manifestText);
  const safePauseManifestVerification = verifyManifest(F.safePauseManifest, manifestFiles.length);
  assert(safePauseManifestVerification.pass, 'SAFE_PAUSE_MANIFEST_VALIDATION');

  const checkpointTimestamp = now();
  const baseCheckpoint = {
    schemaVersion: 2, ordinal: 65, commitUnit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    updatedAtUtc: checkpointTimestamp, stage: 'sole Opus invocation local CLI configuration technical incomplete safe pause',
    status: 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE',
    head: EXPECTED.head, upstream: EXPECTED.head, parent: EXPECTED.parent, branch: EXPECTED.branch,
    activeReasonBaseHash: EXPECTED.selectedReason, c35RuntimeHash: EXPECTED.c35Composite,
    activeAttemptId: null,
    candidateBudget: { maximum: 1, authorized: 0, allocated: 0, accepted: 0, rejected: 0, technicalIncomplete: 0 },
    candidateDispositions: [], reasonBefore: '3575/3720', reasonAfter: '3575/3720', decision: '3720/3720', relation: '3720/3720', reasonOnlyRowsRemaining: 145,
    phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW', r20: 'IN_PROGRESS',
    c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL', c37: 'SAFE_PAUSED_OPUS_TECHNICAL_INCOMPLETE_NOT_TERMINAL',
    opusDecision: null, opusSubstantivePathDecision: null, opusInvocationCount: 1,
    reviewBudgetConsumed: true, externalTransmissionAuthorizationConsumed: true, retryAuthorized: false,
    attemptedStdinBytes: EXPECTED.attemptedStdinBytes, attemptedStdinSha256: EXPECTED.attemptedStdinSha256,
    providerRequestObserved: false, confirmedEvidenceBytesTransmittedToAnthropic: 0, exactProviderWireBytes: null,
    roadmapV9Updated: false, currentStateUpdated: false, finalApprovalManifestCreated: false,
    stagingPerformed: false, commitCreated: false, pushPerformed: false,
    registryAttempts: 230, attemptDirectories: 230, c34WalRows: 32, c35WalRows: 6,
    c36WalExists: false, c37WalExists: false, c37WalRows: 0,
    orphan: 0, dangling: 0, running: 0, stagingEmpty: true, trackedWorktreeClean: true,
    headEqualsUpstream: true, ahead: 0, behind: 0,
    localServiceRunning: false, port5173Free: true, allocationLock: false, indexLock: false,
    noActiveC37OperationProcess: true,
    preExistingUserOwnedClaudeExtensionProcessCount: processAfterAdjudication.preExistingUserOwnedClaudeExtensionProcesses.length,
    protectedResiduePreserved: true, c35Preserved: true,
    deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false,
    e2Begun: false, a15Begun: false, c38Begun: false, phase10BImplementationBegun: false,
    package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: EXPECTED.packageSource, detailedManifestSha256: EXPECTED.packageManifest, aggregateSha256: EXPECTED.packageAggregate },
    invocationMarker: record(F.marker), cliCapture: record(F.capture), correctionAddendum: record(F.correction),
    technicalAdjudication: record(F.adjudication), terminalState: record(F.terminal),
    reconciliation: record(F.reconciliation), safePauseEvidenceManifest: record(F.safePauseManifest),
    previousCheckpoint: { ordinal: 64, numberedSha256: EXPECTED.checkpoint64, pointerSha256BeforeAdvance: EXPECTED.checkpoint64, logSha256BeforeAppend: sha(logBefore), eventSha256: EXPECTED.checkpoint64Event },
    blocker: 'SOLE_AUTHORIZED_OPUS_INVOCATION_LOCAL_CLI_CONFIGURATION_FAILURE_AUTHORIZATION_CONSUMED_NO_RETRY',
    safePauseReason: 'OPUS_TECHNICAL_INCOMPLETE_LOCAL_MCP_CONFIGURATION_VALIDATION',
    nextExactOperation: terminal.exactNextOperation,
    safeToResume: true,
  };
  const eventSha256 = sha(Buffer.from(stable(baseCheckpoint), 'utf8'));
  const checkpoint = { ...baseCheckpoint, eventSha256 };
  const checkpointBytes = Buffer.from(stable(checkpoint), 'utf8');
  writeOnce(F.checkpoint65, checkpointBytes);
  replacePointerAtomically(checkpointBytes);
  fs.appendFileSync(F.log, Buffer.from(`${JSON.stringify(checkpoint)}\n`, 'utf8'));

  const pointer = fs.readFileSync(F.checkpoint);
  const numbered = fs.readFileSync(F.checkpoint65);
  const logAfter = fs.readFileSync(F.log);
  const logRows = logAfter.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const processAfterCheckpoint = processState();
  const manifestAfter = record(F.safePauseManifest);
  const replay = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_CHECKPOINT_65_IDEMPOTENCE_REPLAY_PASS', generatedUtc: now(),
    checkpoint: record(F.checkpoint), numberedCheckpoint: record(F.checkpoint65), log: record(F.log),
    eventSha256, checkpointRows: logRows.length, checkpointOrdinals: logRows.map((row) => row.ordinal),
    pointerEqualsNumberedCheckpoint: pointer.equals(numbered),
    previousCheckpoint64Preserved: shaFile(F.checkpoint64) === EXPECTED.checkpoint64,
    noDuplicateCheckpoint: logRows.length === 2 && new Set(logRows.map((row) => row.ordinal)).size === 2 && logRows[0].ordinal === 64 && logRows[1].ordinal === 65,
    noDuplicateOpusInvocation: fs.existsSync(F.marker) && marker.invocationOrdinal === 1 && marker.maximumInvocations === 1,
    noDuplicateReviewCapture: fs.existsSync(F.capture) && capture.authorizationConsumed === true,
    noDuplicateDocumentationCutover: docs.roadmapV9Updated === false && docs.currentStateUpdated === false,
    noDuplicateStagingOrCommit: git('diff', '--cached', '--name-only').trim() === '' && git('status', '--porcelain=v1', '--untracked-files=no').trim() === '' && git('rev-parse', 'HEAD').trim() === EXPECTED.head,
    noManifestMutation: manifestAfter.sha256 === shaFile(F.safePauseManifest),
    noProtectedResidueMutation: protectedState().pass,
    noActiveC37OperationProcess: processAfterCheckpoint.noActiveC37OperationProcess,
    preExistingUserOwnedClaudeExtensionProcessCount: processAfterCheckpoint.preExistingUserOwnedClaudeExtensionProcesses.length,
    authorizationConsumed: true, retryAuthorized: false,
    actualReviewerDecisionToken: null, actualSubstantivePathToken: null,
    safeToResume: true, activeAttemptId: null,
    pass: pointer.equals(numbered) && logRows.length === 2 && processAfterCheckpoint.pass && protectedState().pass,
  };
  assert(replay.pass && replay.noDuplicateCheckpoint && replay.noDuplicateOpusInvocation && replay.noDuplicateReviewCapture && replay.noDuplicateDocumentationCutover && replay.noDuplicateStagingOrCommit, 'CHECKPOINT65_REPLAY_FAILED');
  writeOnce(F.checkpoint65Replay, stable(replay));

  process.stdout.write(stable({
    classification: 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE',
    checkpoint: 65, eventSha256, checkpointIdempotenceReplayPass: true,
    authorizationConsumed: true, retryAuthorized: false,
    actualReviewerDecisionToken: null, actualSubstantivePathToken: null,
    confirmedEvidenceBytesTransmittedToAnthropic: 0,
    trackedTreeClean: true, stagingEmpty: true, safeToResume: true,
  }));
}

main();

