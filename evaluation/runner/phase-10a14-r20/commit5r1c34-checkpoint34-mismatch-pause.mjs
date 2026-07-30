// PHASE-10A14-R20 COMMIT 5R1-C34
// Additive, idempotent safe stop for the checkpoint-34 active-attempt continuity mismatch.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import * as C from './commit5r1c34-lib.mjs';

const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C34';
const COMMIT_UNIT = 'PHASE-10A14-R20-COMMIT-5R1-C34';
const EXPECTED_HEAD = '7c95019622d7174c8b1fd258b9a10137e59feb57';
const EXPECTED_BRANCH = 'feature/source-availability-engine-v1';
const EXPECTED_ACTIVE_BASE =
  '02d53a0480db28aebbb47568aab5700a80ed502bb65c072eb2ebfff9d5a60129';
const RETRY_ID =
  'R20-domain_campaign-commit5r1c34-nt01-retry01-ord02-2026-07-29T05-00-15-739Z';
const ORIGINAL_NT01 =
  'R20-domain_campaign-commit5r1c34-nt01-ord01-2026-07-28T13-34-41-962Z';
const PROMPT_PATH =
  'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C34-ONE-HOUR-CONTINUATION-FROM-CHECKPOINT-34.md';
const EXPECTED_PROMPT_SHA256 =
  '24275307f7de31123a4b489320b2eadea442ac6df7b22b340c5e40091e1a34bd';
const SCRIPT_PATH =
  'evaluation/runner/phase-10a14-r20/commit5r1c34-checkpoint34-mismatch-pause.mjs';
const RUNNER_PATH =
  'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs';
const LIB_PATH =
  'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs';
const CHECKPOINT = path.join(C.RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT.json');
const CHECKPOINT_LOG = path.join(
  C.RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson',
);
const CHECKPOINT_34_NUMBERED = path.join(
  C.RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_34_one_hour_terminal_safe_pause.json',
);
const CHECKPOINT_34_SNAPSHOT = path.join(
  C.RES,
  'COMMIT_5R1C34_CHECKPOINT_34_CURRENT_SNAPSHOT.json',
);
const CHECKPOINT_LOG_THROUGH_34 = path.join(
  C.RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG_THROUGH_34.ndjson',
);
const PRIOR_SAFE_PAUSE = path.join(
  C.RES,
  'COMMIT_5R1C34_ONE_HOUR_SAFE_PAUSE.json',
);
const PRIOR_SAFE_PAUSE_MANIFEST = path.join(
  C.RES,
  'COMMIT_5R1C34_ONE_HOUR_SAFE_PAUSE_EVIDENCE.sha256',
);
const REGISTRY = path.join(C.RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
const WAL = path.join(C.RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
const RETRY_DIR = path.join(C.ATT, RETRY_ID);
const RETRY_ATTEMPT = path.join(RETRY_DIR, 'ATTEMPT.json');
const RETRY_RESULT = path.join(RETRY_DIR, 'ITERATION_RESULT.json');
const RETRY_GATES = path.join(RETRY_DIR, 'FROZEN_GATES.json');
const RETRY_RUNTIME = path.join(RETRY_DIR, 'runtime-snapshot');
const RETRY_RUNTIME_IDENTITY = path.join(RETRY_RUNTIME, 'RUNTIME_IDENTITY.json');
const MISMATCH_ARTIFACT = path.join(
  C.RES,
  'COMMIT_5R1C34_CHECKPOINT_34_CONTINUITY_MISMATCH.json',
);
const MISMATCH_MANIFEST = path.join(
  C.RES,
  'COMMIT_5R1C34_CHECKPOINT_34_CONTINUITY_MISMATCH_EVIDENCE.sha256',
);
const CHECKPOINT_35_NUMBERED = path.join(
  C.RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_35_checkpoint_34_continuity_mismatch_safe_pause.json',
);
const EXPECTED_CHECKPOINT_34_SHA256 =
  '7b14bd89bfcfc3f01303c9e1f0c504cce90c752f5bdb5c93851b2ca96745bb28';
const EXPECTED_CHECKPOINT_34_EVENT_SHA256 =
  'f60ed4fc39325cbf813ecbdc3b46e1fe4c0be80391cb55feb2eccdaf62dc9fe4';
const EXPECTED_LOG_THROUGH_34_SHA256 =
  'f68e018ceb69d314b65ccc12f19c46b859de78311613f00a752eaf87ff27b104';
const EXPECTED_PRIOR_SAFE_PAUSE_SHA256 =
  '748f20191a9521283332b6c35a7598f8a1bb91427145287195025d8a7591e032';
const EXPECTED_PRIOR_MANIFEST_SHA256 =
  'b0e5a3f5ca964d1504a86892863b8686a590171ca128739e2e0c3224d1dbc2ee';
const EXPECTED_RETRY_RESULT_SHA256 =
  '209fd7a60b5854139559db2c66809d3560b7da1f1ef7677b9eb4c2075e482054';
const EXPECTED_RUNNER_SHA256 =
  'a38759fbde67e67b06e0165fcbb8ef97f5163e4f6c8aa08e951ab05dec3b4b5e';
const EXPECTED_LIB_SHA256 =
  'dd3bd236eee0dd515146ac20314b3678b87cbca4d907e0225fdeec8a16431298';
const SESSION_STARTED_UTC = '2026-07-29T06:01:34.821Z';
const SESSION_HARD_STOP_UTC = '2026-07-29T07:01:34.821Z';

const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const requirePass = (condition, message) => C.requirePass(condition, message);
const git = (...args) => execFileSync(
  'git',
  ['-c', 'safe.directory=C:/Projects/tina-backend', ...args],
  { cwd: C.REPO, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 },
);

function evidencePath(file) {
  const absolute = path.resolve(file);
  const repo = path.resolve(C.REPO);
  return absolute.startsWith(`${repo}${path.sep}`)
    ? path.relative(repo, absolute).replace(/\\/g, '/')
    : absolute.replace(/\\/g, '/');
}

function resolveEvidencePath(file) {
  return /^[A-Za-z]:\//.test(file) ? path.resolve(file) : path.resolve(C.REPO, file);
}

function hashRecord(file) {
  const absolute = path.resolve(file);
  const bytes = fs.readFileSync(absolute);
  return {
    path: evidencePath(absolute),
    bytes: bytes.length,
    sha256: sha(bytes),
  };
}

function writeOnceOrSameBuffer(file, bytes) {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  if (fs.existsSync(absolute)) {
    requirePass(
      fs.readFileSync(absolute).equals(bytes),
      `C34_MISMATCH_EXISTING_EVIDENCE_DIFFERS_${evidencePath(absolute)}`,
    );
    return absolute;
  }
  fs.writeFileSync(absolute, bytes, { flag: 'wx' });
  return absolute;
}

function writeOnceOrSameText(file, text) {
  return writeOnceOrSameBuffer(
    file,
    Buffer.from(String(text).replace(/\r\n/g, '\n')),
  );
}

function writeOnceOrSameJson(file, value) {
  return writeOnceOrSameText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMutableJson(file, value) {
  const absolute = path.resolve(file);
  const temporary =
    `${absolute}.c34-mismatch-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, absolute);
}

function removeOwnedTemporary(directory, prefix) {
  const resolved = path.resolve(directory);
  const temporaryRoot = path.resolve(os.tmpdir());
  requirePass(
    resolved.startsWith(`${temporaryRoot}${path.sep}`)
      && path.basename(resolved).startsWith(prefix),
    `C34_MISMATCH_REFUSING_UNOWNED_TEMP_REMOVAL_${resolved}`,
  );
  fs.rmSync(resolved, { recursive: true, force: true });
}

function processAndPortState() {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tina-c34-checkpoint34-inspection-'),
  );
  const inspector = path.join(temporaryRoot, 'inspect-node-processes.js');
  const source = [
    'try {',
    '  var locator = new ActiveXObject("WbemScripting.SWbemLocator");',
    '  var service = locator.ConnectServer(".", "root\\\\cimv2");',
    '  var query = service.ExecQuery("SELECT ProcessId,ParentProcessId,CommandLine FROM Win32_Process WHERE Name=\'node.exe\'");',
    '  WScript.Echo("C34_PROCESS_INSPECTION_V1");',
    '  for (var rows = new Enumerator(query); !rows.atEnd(); rows.moveNext()) {',
    '    var row = rows.item();',
    '    var commandLine = row.CommandLine;',
    '    var readable = commandLine !== null && typeof commandLine !== "undefined" && String(commandLine).length > 0;',
    '    WScript.Echo(String(row.ProcessId) + "\\t" + String(row.ParentProcessId) + "\\t" + (readable ? "1" : "0") + "\\t" + encodeURIComponent(readable ? String(commandLine) : ""));',
    '  }',
    '  WScript.Echo("C34_PROCESS_INSPECTION_END");',
    '} catch (error) {',
    '  WScript.StdErr.WriteLine("C34_PROCESS_INSPECTION_ERROR " + (error.description || error.message || String(error)));',
    '  WScript.Quit(2);',
    '}',
  ].join('\r\n');
  fs.writeFileSync(inspector, source, { flag: 'wx' });
  let result;
  let cleanupSucceeded = false;
  try {
    result = spawnSync(
      'C:/WINDOWS/System32/cscript.exe',
      ['//NoLogo', '//E:JScript', inspector],
      {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30000,
        windowsHide: true,
      },
    );
  } finally {
    removeOwnedTemporary(temporaryRoot, 'tina-c34-checkpoint34-inspection-');
    cleanupSucceeded = !fs.existsSync(temporaryRoot);
  }
  const lines = (result?.stdout || '').split(/\r?\n/).filter(Boolean);
  const protocolValid = lines[0] === 'C34_PROCESS_INSPECTION_V1'
    && lines.at(-1) === 'C34_PROCESS_INSPECTION_END'
    && lines.slice(1, -1).every((line) => /^\d+\t\d+\t[01]\t.*$/.test(line));
  const processes = [];
  let parseError = null;
  if (protocolValid) {
    try {
      for (const line of lines.slice(1, -1)) {
        const [pid, parentPid, readable, encoded] = line.split('\t');
        processes.push({
          processId: Number(pid),
          parentProcessId: Number(parentPid),
          commandLine: readable === '1' ? decodeURIComponent(encoded) : null,
        });
      }
    } catch (error) {
      parseError = error?.message || String(error);
    }
  }
  processes.sort((first, second) => first.processId - second.processId);
  const duplicatePids = processes.filter((item, index) =>
    processes.findIndex((candidate) => candidate.processId === item.processId) !== index);
  const current = processes.find((item) => item.processId === process.pid);
  const currentReadable =
    typeof current?.commandLine === 'string' && current.commandLine.trim() !== '';
  const inspectionSucceeded = result?.status === 0
    && result?.signal == null
    && protocolValid
    && parseError == null
    && duplicatePids.length === 0
    && current != null
    && currentReadable
    && cleanupSucceeded;
  const others = inspectionSucceeded
    ? processes.filter((item) => item.processId !== process.pid)
    : [];
  const unreadable = others.filter((item) =>
    typeof item.commandLine !== 'string' || item.commandLine.trim() === '');
  const activeC34 = inspectionSucceeded
    ? others.filter((item) =>
      /commit5r1c34-(?:execute|checkpoint34-mismatch-pause)\.mjs/i
        .test(item.commandLine || ''))
    : [];
  const netstat = spawnSync('netstat', ['-ano', '-p', 'TCP'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30000,
    windowsHide: true,
  });
  const listeners5173 = (netstat.stdout || '').split(/\r?\n/).filter((line) => {
    const fields = line.trim().split(/\s+/);
    return fields[0]?.toUpperCase() === 'TCP'
      && /:5173$/i.test(fields[1] || '')
      && fields[3]?.toUpperCase() === 'LISTENING';
  });
  const state = {
    inspectionMethod:
      'WSH WMI node.exe inventory with current-PID completeness and command-line classification',
    inspectionStatus: result?.status ?? null,
    inspectionSignal: result?.signal ?? null,
    inspectionStderr: (result?.stderr || '').trim(),
    protocolValid,
    parseError,
    currentExecutorPid: process.pid,
    currentExecutorPresent: current != null,
    currentExecutorCommandLineReadable: currentReadable,
    cleanupSucceeded,
    otherNodeProcesses: others,
    unreadableNodeProcesses: unreadable,
    activeC34Processes: activeC34,
    activeC34ProcessCount: inspectionSucceeded ? activeC34.length : null,
    inspectionSucceeded,
    netstatStatus: netstat.status,
    netstatSignal: netstat.signal,
    netstatStderr: (netstat.stderr || '').trim(),
    listeners5173,
    port5173Free:
      netstat.status === 0 && netstat.signal == null && listeners5173.length === 0,
  };
  state.pass = state.inspectionSucceeded
    && unreadable.length === 0
    && state.activeC34ProcessCount === 0
    && state.port5173Free;
  requirePass(state.pass, `C34_MISMATCH_PROCESS_STATE_FAILED_${JSON.stringify(state)}`);
  return state;
}

function validateCheckpointChain() {
  const bytes = fs.readFileSync(CHECKPOINT_LOG);
  const lines = bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  let prior = Buffer.alloc(0);
  const records = lines.map((line, index) => {
    const event = JSON.parse(line);
    const legacy = index < 14;
    const { eventSha256, ...withoutHash } = event;
    const actualEventSha256 = sha(Buffer.from(JSON.stringify(withoutHash)));
    const actualPreviousLogSha256 = sha(prior);
    const pass = legacy
      ? event.schemaVersion == null && event.ordinal == null
      : event.schemaVersion === 2
        && event.ordinal === index + 1
        && event.eventSha256 === actualEventSha256
        && event.previousLogSha256 === actualPreviousLogSha256;
    prior = Buffer.concat([prior, Buffer.from(`${line}\n`)]);
    return {
      ordinal: index + 1,
      stage: event.stage,
      status: event.status,
      eventSha256: event.eventSha256 || null,
      actualEventSha256,
      previousLogSha256: event.previousLogSha256 || null,
      actualPreviousLogSha256,
      pass,
    };
  });
  const result = {
    path: evidencePath(CHECKPOINT_LOG),
    rows: records.length,
    sha256: sha(bytes),
    records,
    pass: records.every((record) => record.pass),
  };
  requirePass(result.pass, 'C34_MISMATCH_CHECKPOINT_CHAIN_INVALID');
  return result;
}

function checkpoint34Continuity() {
  const chain = validateCheckpointChain();
  requirePass(chain.rows === 34 || chain.rows === 35, `C34_MISMATCH_LOG_ROWS_${chain.rows}`);
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  const row34 = JSON.parse(lines[33]);
  const row35 = lines.length === 35 ? JSON.parse(lines[34]) : null;
  const numbered34 = C.readJson(CHECKPOINT_34_NUMBERED);
  const current = C.readJson(CHECKPOINT);
  const currentRecord = hashRecord(CHECKPOINT);
  const { eventSha256, ...withoutHash } = row34;
  const currentAtValidTip = lines.length === 34
    ? currentRecord.sha256 === EXPECTED_CHECKPOINT_34_SHA256
      && JSON.stringify(current) === JSON.stringify(row34)
    : row35?.ordinal === 35
      && row35?.stage === 'checkpoint 34 continuity mismatch safe pause'
      && row35?.status === 'CHECKPOINT_34_CONTINUITY_MISMATCH'
      && row35?.safeToResume === true
      && row35?.attemptId == null
      && row35?.activeBaseHash === EXPECTED_ACTIVE_BASE
      && fs.existsSync(CHECKPOINT_35_NUMBERED)
      && JSON.stringify(C.readJson(CHECKPOINT_35_NUMBERED)) === JSON.stringify(row35)
      && JSON.stringify(current) === JSON.stringify(row35);
  const result = {
    chain,
    row34,
    row35,
    numbered34: hashRecord(CHECKPOINT_34_NUMBERED),
    current: currentRecord,
    currentOrdinal: current.ordinal,
    currentEventSha256: current.eventSha256,
    row34ObjectMatchesNumbered:
      JSON.stringify(row34) === JSON.stringify(numbered34),
    row34EventSha256: eventSha256,
    row34ActualEventSha256: sha(Buffer.from(JSON.stringify(withoutHash))),
    pass: false,
  };
  result.pass = result.numbered34.sha256 === EXPECTED_CHECKPOINT_34_SHA256
    && result.row34ObjectMatchesNumbered
    && row34.ordinal === 34
    && row34.stage === 'one-hour terminal safe pause'
    && row34.status === 'ONE_HOUR_SAFE_PAUSE_POST_ATTEMPT'
    && row34.safeToResume === true
    && row34.attemptId === RETRY_ID
    && row34.activeBaseHash === EXPECTED_ACTIVE_BASE
    && row34.eventSha256 === EXPECTED_CHECKPOINT_34_EVENT_SHA256
    && row34.eventSha256 === result.row34ActualEventSha256
    && currentAtValidTip;
  requirePass(result.pass, 'C34_MISMATCH_CHECKPOINT_34_INTEGRITY_FAILED');
  return result;
}

function verifyPriorManifest() {
  const lines = fs.readFileSync(PRIOR_SAFE_PAUSE_MANIFEST, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    requirePass(match, `C34_MISMATCH_PRIOR_MANIFEST_BAD_LINE_${line}`);
    const source = match[2] === evidencePath(CHECKPOINT)
      ? CHECKPOINT_34_SNAPSHOT
      : resolveEvidencePath(match[2]);
    const exists = fs.existsSync(source);
    const actualSha256 = exists ? sha(fs.readFileSync(source)) : null;
    return {
      path: match[2],
      mappedPath: evidencePath(source),
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  const result = {
    manifest: hashRecord(PRIOR_SAFE_PAUSE_MANIFEST),
    entries: records.length,
    badRecords: records.filter((record) => !record.pass),
    pass: false,
  };
  result.pass = result.manifest.sha256 === EXPECTED_PRIOR_MANIFEST_SHA256
    && records.length === 121
    && records.every((record) => record.pass);
  requirePass(result.pass, 'C34_MISMATCH_PRIOR_SAFE_PAUSE_MANIFEST_INVALID');
  return result;
}

function temporaryRuntimeState() {
  const prefixes = [
    'tina-c34-candidate-',
    'tina-c34-linked-retry-',
    'tina-c34-debug-analyzer-',
    'tina-c34-composition-',
    'tina-c34-process-inspection-',
    'tina-c34-checkpoint34-inspection-',
  ];
  const directories = fs.readdirSync(os.tmpdir(), { withFileTypes: true })
    .filter((entry) =>
      entry.isDirectory() && prefixes.some((prefix) => entry.name.startsWith(prefix)))
    .map((entry) => path.join(os.tmpdir(), entry.name).replace(/\\/g, '/'))
    .sort();
  return {
    directories,
    temporaryCandidateInstalled: false,
    restorationRequired: false,
    restorationAction: 'NO_WRITE_REQUIRED',
    pass: directories.length === 0,
  };
}

function governedState() {
  const checkpoint34 = checkpoint34Continuity();
  const priorSafePause = C.readJson(PRIOR_SAFE_PAUSE);
  const priorManifest = verifyPriorManifest();
  const registry = C.readJson(REGISTRY);
  const ledger = C.reconcileC34AttemptLedger();
  const walRows = fs.readFileSync(WAL, 'utf8').split(/\r?\n/).filter(Boolean)
    .map((line, index) => ({ line: index + 1, ...JSON.parse(line) }));
  const c34Attempts = registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const retryRecords = c34Attempts.filter((attempt) => attempt.retryOf === ORIGINAL_NT01);
  const retry = C.readJson(RETRY_ATTEMPT);
  const result = C.readJson(RETRY_RESULT);
  const gates = C.readJson(RETRY_GATES);
  const runtimeIdentity = C.runtimeFor(RETRY_RUNTIME);
  const attemptDirectories = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const candidate2Registry = c34Attempts.filter((attempt) =>
    attempt.cycle === 'nt02' || /commit5r1c34-nt02-/.test(attempt.attemptId));
  const candidate2Wal = walRows.filter((row) =>
    row.cycle === 'nt02' || /commit5r1c34-nt02-/.test(row.attemptId || ''));
  const candidate2Directories = attemptDirectories.filter((attemptId) =>
    /commit5r1c34-nt02-/.test(attemptId));
  const processes = processAndPortState();
  const temporary = temporaryRuntimeState();
  const liveServices = C.liveRuntimeIdentity();
  const serviceDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  const stagedDiff = git('diff', '--cached', '--name-only').trim();
  const head = git('rev-parse', 'HEAD').trim();
  const branch = git('symbolic-ref', '--short', 'HEAD').trim();
  const upstream = git('rev-parse', '@{u}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim();
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  const c35Items = status.split(/\r?\n/).filter((line) =>
    /5R1C35|commit5r1c35/i.test(line));
  const state = {
    checkpoint34,
    prompt: hashRecord(PROMPT_PATH),
    priorSafePause: hashRecord(PRIOR_SAFE_PAUSE),
    priorManifest,
    requiredActiveAttemptId: null,
    observedCheckpoint34AttemptId: checkpoint34.row34.attemptId,
    observedSafePauseActiveAttemptId: priorSafePause.activeAttemptId,
    mismatch: {
      field: 'activeAttemptId',
      expected: null,
      checkpoint34Observed: checkpoint34.row34.attemptId,
      safePauseObserved: priorSafePause.activeAttemptId,
      code: 'CHECKPOINT_34_ACTIVE_ATTEMPT_ID_NOT_NULL',
      terminalAttemptMistakenForActiveAttempt: true,
    },
    retry: {
      attempt: hashRecord(RETRY_ATTEMPT),
      result: hashRecord(RETRY_RESULT),
      gates: hashRecord(RETRY_GATES),
      runtimeIdentityArtifact: hashRecord(RETRY_RUNTIME_IDENTITY),
      record: retry,
      accepted: result.accepted,
      disposition: result.disposition,
      candidateIdentity: result.candidateIdentity,
      runtimeIdentity,
      metrics: result.metrics,
      promotionChecks: result.promotionChecks,
      failedChecks: result.failedChecks,
    },
    candidate2: {
      allocated: candidate2Registry.length > 0
        || candidate2Wal.length > 0
        || candidate2Directories.length > 0,
      registryAttemptIds: candidate2Registry.map((attempt) => attempt.attemptId),
      walLines: candidate2Wal.map((row) => row.line),
      attemptDirectories: candidate2Directories,
    },
    ledger,
    registry: {
      ...hashRecord(REGISTRY),
      totalAttempts: registry.attempts.length,
      c34Attempts: c34Attempts.length,
      linkedRetries: retryRecords.length,
      running: c34Attempts.filter((attempt) => attempt.status === 'running')
        .map((attempt) => attempt.attemptId),
    },
    wal: {
      ...hashRecord(WAL),
      rows: walRows.length,
      eventCounts: Object.fromEntries(
        [...new Set(walRows.map((row) => row.event))].sort().map((event) => [
          event,
          walRows.filter((row) => row.event === event).length,
        ]),
      ),
    },
    attemptDirectories,
    processes,
    temporaryRuntime: temporary,
    liveServices: {
      identity: liveServices,
      serviceDiff,
      temporaryCandidateInstalled: serviceDiff !== '',
    },
    git: {
      head,
      branch,
      upstream,
      sync,
      stagedDiff,
      c35Items,
      indexLockExists: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
      commitOccurred: head !== EXPECTED_HEAD,
      pushOccurredOrSyncChanged: upstream !== EXPECTED_HEAD || sync !== '0\t0',
    },
    pass: false,
  };
  state.pass = state.prompt.sha256 === EXPECTED_PROMPT_SHA256
    && checkpoint34.pass
    && state.priorSafePause.sha256 === EXPECTED_PRIOR_SAFE_PAUSE_SHA256
    && priorSafePause.safeToResume === true
    && priorSafePause.activeAttemptId === RETRY_ID
    && priorSafePause.activeBaseHash === EXPECTED_ACTIVE_BASE
    && priorManifest.pass
    && state.mismatch.checkpoint34Observed === RETRY_ID
    && state.mismatch.safePauseObserved === RETRY_ID
    && retry.attemptId === RETRY_ID
    && retry.status === 'completed'
    && retry.exitCode === 0
    && retry.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
    && retry.controlling === true
    && retry.retryOf === ORIGINAL_NT01
    && result.accepted === true
    && result.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
    && state.retry.result.sha256 === EXPECTED_RETRY_RESULT_SHA256
    && result.candidateIdentity.servicesTreeDigest === EXPECTED_ACTIVE_BASE
    && runtimeIdentity.servicesTreeDigest === EXPECTED_ACTIVE_BASE
    && result.metrics.reasonPassed === 3556
    && result.metrics.decisionPassed === 3720
    && result.metrics.relationPassed === 3720
    && result.metrics.reasonCounterfactualPassed === 344
    && result.failedChecks.length === 0
    && Object.values(result.promotionChecks).every(Boolean)
    && !state.candidate2.allocated
    && ledger.pass
    && ledger.orphan === 0
    && ledger.dangling === 0
    && ledger.running.length === 0
    && registry.attempts.length === 221
    && c34Attempts.length === 3
    && retryRecords.length === 1
    && state.registry.running.length === 0
    && walRows.length === 10
    && attemptDirectories.length === 3
    && processes.pass
    && temporary.pass
    && serviceDiff === ''
    && stagedDiff === ''
    && liveServices.servicesTreeDigest
      === '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201'
    && head === EXPECTED_HEAD
    && branch === EXPECTED_BRANCH
    && upstream === EXPECTED_HEAD
    && sync === '0\t0'
    && c35Items.length === 0
    && !state.git.indexLockExists
    && sha(fs.readFileSync(RUNNER_PATH)) === EXPECTED_RUNNER_SHA256
    && sha(fs.readFileSync(LIB_PATH)) === EXPECTED_LIB_SHA256;
  requirePass(state.pass, 'C34_CHECKPOINT_34_CONTINUITY_AUDIT_FAILED');
  return state;
}

function createSnapshots() {
  const chain = validateCheckpointChain();
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  requirePass(lines.length === 34 || lines.length === 35, 'C34_MISMATCH_SNAPSHOT_LOG_LENGTH');
  const row34Text = `${JSON.stringify(JSON.parse(lines[33]), null, 2)}\n`;
  const logThrough34 = Buffer.from(`${lines.slice(0, 34).join('\n')}\n`);
  requirePass(
    sha(Buffer.from(row34Text)) === EXPECTED_CHECKPOINT_34_SHA256,
    'C34_MISMATCH_ROW34_SNAPSHOT_HASH_INVALID',
  );
  requirePass(
    sha(logThrough34) === EXPECTED_LOG_THROUGH_34_SHA256,
    'C34_MISMATCH_LOG_THROUGH_34_HASH_INVALID',
  );
  writeOnceOrSameText(CHECKPOINT_34_SNAPSHOT, row34Text);
  writeOnceOrSameBuffer(CHECKPOINT_LOG_THROUGH_34, logThrough34);
  return {
    checkpoint34: hashRecord(CHECKPOINT_34_SNAPSHOT),
    logThrough34: hashRecord(CHECKPOINT_LOG_THROUGH_34),
    sourceChainRows: chain.rows,
  };
}

function manifestFiles() {
  return [
    SCRIPT_PATH,
    PROMPT_PATH,
    CHECKPOINT_34_SNAPSHOT,
    CHECKPOINT_LOG_THROUGH_34,
    CHECKPOINT_34_NUMBERED,
    PRIOR_SAFE_PAUSE,
    PRIOR_SAFE_PAUSE_MANIFEST,
    RUNNER_PATH,
    LIB_PATH,
    REGISTRY,
    WAL,
    RETRY_ATTEMPT,
    RETRY_RESULT,
    RETRY_GATES,
    RETRY_RUNTIME_IDENTITY,
    MISMATCH_ARTIFACT,
  ].map((file) => path.resolve(file));
}

function verifyMismatchManifest() {
  const lines = fs.readFileSync(MISMATCH_MANIFEST, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    requirePass(match, `C34_MISMATCH_MANIFEST_BAD_LINE_${line}`);
    const file = resolveEvidencePath(match[2]);
    const exists = fs.existsSync(file);
    const actualSha256 = exists ? sha(fs.readFileSync(file)) : null;
    return {
      path: match[2],
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  const result = {
    manifest: hashRecord(MISMATCH_MANIFEST),
    entries: records.length,
    records,
    badRecords: records.filter((record) => !record.pass),
    pass: records.length === manifestFiles().length && records.every((record) => record.pass),
  };
  requirePass(result.pass, 'C34_MISMATCH_EVIDENCE_MANIFEST_INVALID');
  return result;
}

function createMismatchManifest() {
  if (fs.existsSync(MISMATCH_MANIFEST)) return verifyMismatchManifest();
  const files = [...new Set(manifestFiles())]
    .sort((first, second) => evidencePath(first).localeCompare(evidencePath(second)));
  const text = `${files.map((file) =>
    `${sha(fs.readFileSync(file))}  ${evidencePath(file)}`).join('\n')}\n`;
  writeOnceOrSameText(MISMATCH_MANIFEST, text);
  return verifyMismatchManifest();
}

function stableCheckpointFields(mismatch, manifest) {
  return {
    currentMetrics: {
      reasonPassed: mismatch.retry.metrics.reasonPassed,
      reasonTotal: 3720,
      remainingReasonMismatches: 3720 - mismatch.retry.metrics.reasonPassed,
      decisionPassed: mismatch.retry.metrics.decisionPassed,
      decisionTotal: 3720,
      relationPassed: mismatch.retry.metrics.relationPassed,
      relationTotal: 3720,
    },
    attemptDispositions: [{
      attemptId: RETRY_ID,
      status: mismatch.retry.record.status,
      disposition: mismatch.retry.disposition,
      controlling: mismatch.retry.record.controlling,
      activeRunningAttempt: false,
    }],
    reconciliation: {
      registrySha256: mismatch.registry.sha256,
      walSha256: mismatch.wal.sha256,
      registryAttempts: mismatch.registry.totalAttempts,
      c34Attempts: mismatch.registry.c34Attempts,
      linkedRetries: mismatch.registry.linkedRetries,
      attemptDirectories: mismatch.attemptDirectories.length,
      running: mismatch.ledger.running.length,
      orphan: mismatch.ledger.orphan,
      dangling: mismatch.ledger.dangling,
      candidate2Allocated: mismatch.candidate2.allocated,
      evidenceManifestSha256: manifest.manifest.sha256,
    },
    processState: {
      inspectionSucceeded: mismatch.processes.inspectionSucceeded,
      activeC34ProcessCount: mismatch.processes.activeC34ProcessCount,
      port5173Free: mismatch.processes.port5173Free,
    },
    temporaryRuntimeState: {
      directories: mismatch.temporaryRuntime.directories,
      temporaryCandidateInstalled:
        mismatch.temporaryRuntime.temporaryCandidateInstalled,
      restorationRequired: mismatch.temporaryRuntime.restorationRequired,
      restorationAction: mismatch.temporaryRuntime.restorationAction,
    },
    serviceStagingState: {
      serviceDiff: mismatch.liveServices.serviceDiff,
      stagedDiff: mismatch.git.stagedDiff,
      head: mismatch.git.head,
      upstream: mismatch.git.upstream,
      sync: mismatch.git.sync,
      commitOccurred: mismatch.git.commitOccurred,
      pushOccurredOrSyncChanged: mismatch.git.pushOccurredOrSyncChanged,
      c35Items: mismatch.git.c35Items,
    },
  };
}

function appendCheckpoint35(mismatch, manifest) {
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  requirePass(lines.length === 34 || lines.length === 35, `C34_MISMATCH_APPEND_ROWS_${lines.length}`);
  const prefixBytes = Buffer.from(`${lines.slice(0, 34).join('\n')}\n`);
  const stable = stableCheckpointFields(mismatch, manifest);
  const artifactFiles = [
    MISMATCH_ARTIFACT,
    MISMATCH_MANIFEST,
    CHECKPOINT_34_SNAPSHOT,
    CHECKPOINT_LOG_THROUGH_34,
    REGISTRY,
    WAL,
    RETRY_RESULT,
  ];
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal: 35,
    commitUnit: COMMIT_UNIT,
    updatedAtUtc: mismatch.generatedUtc,
    stage: 'checkpoint 34 continuity mismatch safe pause',
    status: 'CHECKPOINT_34_CONTINUITY_MISMATCH',
    head: EXPECTED_HEAD,
    activeBaseHash: EXPECTED_ACTIVE_BASE,
    attemptId: null,
    ...stable,
    artifactHashes: artifactFiles.map(hashRecord),
    previousLogSha256: sha(prefixBytes),
    nextExactOperation:
      'Stop. Obtain a separately authorized continuation from checkpoint 35 that accepts the additive activeAttemptId correction, preserves the terminal accepted nt01-retry01 runtime, and implements a non-duplicating candidate-2 resume path. Do not rerun candidate 1.',
    safeToResume: true,
    blocker: 'CHECKPOINT_34_ACTIVE_ATTEMPT_ID_NOT_NULL',
  };
  const event = {
    ...eventWithoutHash,
    eventSha256: sha(Buffer.from(JSON.stringify(eventWithoutHash))),
  };
  if (lines.length === 35) {
    requirePass(
      JSON.stringify(JSON.parse(lines[34])) === JSON.stringify(event),
      'C34_MISMATCH_EXISTING_CHECKPOINT_35_DIFFERS',
    );
    requirePass(fs.existsSync(CHECKPOINT_35_NUMBERED), 'C34_MISMATCH_NUMBERED_35_MISSING');
    requirePass(
      JSON.stringify(C.readJson(CHECKPOINT_35_NUMBERED)) === JSON.stringify(event),
      'C34_MISMATCH_NUMBERED_35_DIFFERS',
    );
    const current = C.readJson(CHECKPOINT);
    requirePass(
      current.ordinal === 34 || JSON.stringify(current) === JSON.stringify(event),
      'C34_MISMATCH_CURRENT_CHECKPOINT_CONFLICT',
    );
    if (JSON.stringify(current) !== JSON.stringify(event)) writeMutableJson(CHECKPOINT, event);
    return { event, appended: false };
  }
  if (fs.existsSync(CHECKPOINT_35_NUMBERED)) {
    requirePass(
      JSON.stringify(C.readJson(CHECKPOINT_35_NUMBERED)) === JSON.stringify(event),
      'C34_MISMATCH_RECOVERY_NUMBERED_35_DIFFERS',
    );
  } else {
    writeOnceOrSameJson(CHECKPOINT_35_NUMBERED, event);
  }
  fs.appendFileSync(CHECKPOINT_LOG, `${JSON.stringify(event)}\n`);
  writeMutableJson(CHECKPOINT, event);
  return { event, appended: true };
}

function main() {
  requirePass(
    process.argv.length === 2,
    'C34_MISMATCH_WRITER_ACCEPTS_NO_ARGUMENTS',
  );
  checkpoint34Continuity();
  const snapshots = createSnapshots();
  const state = governedState();
  let mismatch;
  if (fs.existsSync(MISMATCH_ARTIFACT)) {
    mismatch = C.readJson(MISMATCH_ARTIFACT);
    requirePass(
      mismatch.pass === true
        && mismatch.classification === 'CHECKPOINT_34_CONTINUITY_MISMATCH'
        && mismatch.mismatch.code === 'CHECKPOINT_34_ACTIVE_ATTEMPT_ID_NOT_NULL'
        && mismatch.activeAttemptId == null
        && mismatch.activeBaseHash === EXPECTED_ACTIVE_BASE
        && mismatch.registry.sha256 === state.registry.sha256
        && mismatch.wal.sha256 === state.wal.sha256
        && mismatch.retry.result.sha256 === state.retry.result.sha256
        && mismatch.candidate2.allocated === false,
      'C34_EXISTING_MISMATCH_ARTIFACT_INVALID',
    );
  } else {
    const preMismatchEvidence = [
      SCRIPT_PATH,
      PROMPT_PATH,
      CHECKPOINT_34_SNAPSHOT,
      CHECKPOINT_LOG_THROUGH_34,
      CHECKPOINT_34_NUMBERED,
      PRIOR_SAFE_PAUSE,
      PRIOR_SAFE_PAUSE_MANIFEST,
      RUNNER_PATH,
      LIB_PATH,
      REGISTRY,
      WAL,
      RETRY_ATTEMPT,
      RETRY_RESULT,
      RETRY_GATES,
      RETRY_RUNTIME_IDENTITY,
    ].map(hashRecord);
    mismatch = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc: new Date().toISOString(),
      session: {
        startedUtc: SESSION_STARTED_UTC,
        hardStopUtc: SESSION_HARD_STOP_UTC,
        elapsedMsAtStopDecision: Date.now() - Date.parse(SESSION_STARTED_UTC),
      },
      classification: 'CHECKPOINT_34_CONTINUITY_MISMATCH',
      stage: 'checkpoint 34 initial continuity verification',
      status: 'CHECKPOINT_34_CONTINUITY_MISMATCH',
      safeToResume: true,
      activeAttemptId: null,
      activeBaseHash: EXPECTED_ACTIVE_BASE,
      mismatch: state.mismatch,
      checkpoint34: state.checkpoint34,
      prompt: state.prompt,
      retry: state.retry,
      candidate2: state.candidate2,
      ledger: state.ledger,
      registry: state.registry,
      wal: state.wal,
      attemptDirectories: state.attemptDirectories,
      processes: state.processes,
      temporaryRuntime: state.temporaryRuntime,
      liveServices: state.liveServices,
      git: state.git,
      snapshots,
      preMismatchEvidence,
      nextExactOperation:
        'Obtain a separately authorized continuation from checkpoint 35 that accepts the additive activeAttemptId correction and provides a non-duplicating candidate-2 resume path. Preserve the accepted linked retry and active base; do not rerun candidate 1.',
      pass: state.pass
        && state.mismatch.expected == null
        && state.mismatch.checkpoint34Observed === RETRY_ID
        && state.mismatch.safePauseObserved === RETRY_ID
        && state.candidate2.allocated === false,
    };
    requirePass(mismatch.pass, 'C34_MISMATCH_ARTIFACT_NOT_PASSING');
    writeOnceOrSameJson(MISMATCH_ARTIFACT, mismatch);
  }
  const manifest = createMismatchManifest();
  const checkpoint = appendCheckpoint35(mismatch, manifest);
  const chainAfter = validateCheckpointChain();
  requirePass(
    chainAfter.rows === 35
      && chainAfter.pass
      && checkpoint.event.safeToResume === true
      && checkpoint.event.attemptId == null
      && checkpoint.event.activeBaseHash === EXPECTED_ACTIVE_BASE
      && checkpoint.event.status === 'CHECKPOINT_34_CONTINUITY_MISMATCH',
    'C34_MISMATCH_FINAL_CHECKPOINT_INVALID',
  );
  console.log(JSON.stringify({
    classification: 'CHECKPOINT_34_CONTINUITY_MISMATCH',
    mismatch: mismatch.mismatch,
    candidate2Allocated: false,
    checkpoint: checkpoint.event,
    appended: checkpoint.appended,
    idempotent: !checkpoint.appended,
    mismatchArtifact: hashRecord(MISMATCH_ARTIFACT),
    evidenceManifest: hashRecord(MISMATCH_MANIFEST),
    pass: true,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}
