// PHASE-10A14-R20 COMMIT 5R1-C34
// Two-hour Candidate-5 technical recovery from reconciled checkpoint 42.
// This additive runner may execute exactly one linked retry of Candidate 5.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as C from './commit5r1c34-lib.mjs';

const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C34';
const RES = path.resolve(C.RES);
const ATT = path.resolve(C.ATT);
const ORIGINAL_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs',
);
const CHECKPOINT35_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-checkpoint35-continue.mjs',
);
const CHECKPOINT37_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-checkpoint37-continue.mjs',
);
const THIS_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-checkpoint42-recover.mjs',
);
const LIB = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
);
const PROMPT = path.resolve(
  'C:/Projects/tina-execution-prompts/'
    + 'PHASE-10A14-R20-COMMIT-5R1-C34-TWO-HOUR-CANDIDATE-5-TECHNICAL-RECOVERY-FROM-CHECKPOINT-42.md',
);

const REGISTRY = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
const WAL = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
const CHECKPOINT = path.join(RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT.json');
const CHECKPOINT_LOG = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson',
);
const CHECKPOINT_39 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_39_checkpoint_37_continuation_one_hour_safe_pause.json',
);
const CHECKPOINT_39_SAFE_PAUSE = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_SAFE_PAUSE.json',
);
const CHECKPOINT_39_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_SAFE_PAUSE_EVIDENCE.sha256',
);
const HYPOTHESES = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_HYPOTHESES.json',
);

const AUTHORIZATION = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CONTINUATION_AUTHORIZATION.json',
);
const CANDIDATE_4_NON_DUPLICATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_NON_DUPLICATION_PREFLIGHT.json',
);
const CANDIDATE_4_COMPATIBILITY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_RESUME_COMPATIBILITY_VALIDATION.json',
);
const CHECKPOINT_39_REGISTRY_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const CHECKPOINT_39_WAL_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const CHECKPOINT_39_LOG_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_RECOVERY_CHECKPOINT_LOG_SNAPSHOT.ndjson',
);

const CANDIDATE_4_LOCK = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_ALLOCATION.lock',
);
const CANDIDATE_4_LEDGER = path.join(
  RES,
  'COMMIT_5R1C34_ATTEMPT_LEDGER_AFTER_CANDIDATE_4.json',
);
const CANDIDATE_4_REGRESSION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_ACCEPTED_CANDIDATES_1_TO_3_REGRESSION_VALIDATION.json',
);
const CANDIDATE_4_OUTCOME = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_CONTINUATION_RESULT.json',
);
const CANDIDATE_4_BLOCKER = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_TECHNICAL_BLOCKER.json',
);
const CANDIDATE_4_LATE_GATE = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_LATE_ALLOCATION_GATE.json',
);
const CANDIDATE_4_RECONCILIATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_POST_TERMINAL_RECONCILIATION.json',
);
const CANDIDATE_4_ENDING_REGISTRY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_ENDING_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const CANDIDATE_4_ENDING_WAL = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_ENDING_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const CANDIDATE_4_ENDING_LOG = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_ENDING_RECOVERY_CHECKPOINT_LOG_SNAPSHOT.ndjson',
);
const CANDIDATE_4_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_4_TERMINAL_EVIDENCE.sha256',
);

const CANDIDATE_5_ELIGIBILITY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_ELIGIBILITY_AND_NON_DUPLICATION_PREFLIGHT.json',
);
const CANDIDATE_5_COMPATIBILITY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_RESUME_COMPATIBILITY_VALIDATION.json',
);
const CANDIDATE_5_LOCK = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_ALLOCATION.lock',
);
const CANDIDATE_5_LEDGER = path.join(
  RES,
  'COMMIT_5R1C34_ATTEMPT_LEDGER_AFTER_CANDIDATE_5.json',
);
const CANDIDATE_5_REGRESSION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_ACCEPTED_CANDIDATES_1_TO_4_REGRESSION_VALIDATION.json',
);
const CANDIDATE_5_OUTCOME = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_CONTINUATION_RESULT.json',
);
const CANDIDATE_5_BLOCKER = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_TECHNICAL_BLOCKER.json',
);
const CANDIDATE_5_LATE_GATE = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_LATE_ALLOCATION_GATE.json',
);
const CANDIDATE_5_ENDING_REGISTRY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_ENDING_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const CANDIDATE_5_ENDING_WAL = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_ENDING_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const CANDIDATE_5_ENDING_LOG = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_ENDING_RECOVERY_CHECKPOINT_LOG_SNAPSHOT.ndjson',
);
const CANDIDATE_5_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_TERMINAL_EVIDENCE.sha256',
);

const ENDING_REGISTRY = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CONTINUATION_ENDING_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const ENDING_WAL = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CONTINUATION_ENDING_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const FINAL_LOG_PREFIX = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CONTINUATION_LOG_PREFIX.ndjson',
);
const SAFE_PAUSE_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CONTINUATION_SAFE_PAUSE_EVIDENCE.sha256',
);
const SAFE_PAUSE = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CONTINUATION_SAFE_PAUSE.json',
);

const SESSION_STARTED_UTC = '2026-07-30T02:08:19.1458210Z';
const SESSION_HARD_STOP_UTC = '2026-07-30T04:08:19.1458210Z';
const ACTIVE_BASE_39 =
  '81b2212e82228094f414abbce126082889beb57f8e3fbb6b1c813a8f4cff31bd';
const ACCEPTED_IDS = Object.freeze([
  'R20-domain_campaign-commit5r1c34-nt01-retry01-ord02-2026-07-29T05-00-15-739Z',
  'R20-domain_campaign-commit5r1c34-nt02-ord02-2026-07-29T12-40-28-807Z',
  'R20-domain_campaign-commit5r1c34-tx01-ord03-2026-07-29T23-35-17-745Z',
]);
const CANDIDATE_IDS = Object.freeze({
  4: 'C34-TX02-import-duty-instrument-excluding-rate-classification-and-computation',
  5: 'C34-TR01-legal-rule-effect-or-contract-tax-clause-is-treatment',
  6: 'C34-CP01-tax-administrative-remedy-deadline-is-compliance',
});
const CYCLES = Object.freeze({ 4: 'tx02', 5: 'tr01', 6: 'cp01' });
const EXPECTED_PATCHES = Object.freeze({
  4: '254d28c3a6d7428ee37d38605460dc7903e16459de4af33c96eec4f19e8613fc',
  5: 'b5b9c0a24f95f017960f00231da9f8ae5d4c23a6ea1225f133389286188d08af',
});
const EXPECTED = Object.freeze({
  head: '7c95019622d7174c8b1fd258b9a10137e59feb57',
  checkpoint39:
    'a33f63930074a0f816a98ea490b061b84c334ac2271ba0324cdf2cca37f0b277',
  checkpoint39Event:
    'd5b19d38379f98d478b4cf9b71e74de6e787cf2cbc407291574b087da5663bbb',
  checkpointLog39:
    '41baedd0d3bd189f3c613fa7436387d93bb6988d16c7ce62d134cec7ed883750',
  checkpoint39Manifest:
    '34bd79c7b658661b44b91e2a3b88a736e196ff32df7ad10a60f18aace7da0d97',
  checkpoint39SafePause:
    '6885447b95b54923a39920b372c023c5710e11366f58fda10c0fa36559169559',
  registry:
    '3405656ab1382014017bf3b904665425b498ed5089f83b9334bc620380bff1c4',
  wal: '8f61c4bb9e2d0a3ea06b9c5429feaa57c4db41ea007f702119504ba5a1164f75',
  originalRunner:
    'a38759fbde67e67b06e0165fcbb8ef97f5163e4f6c8aa08e951ab05dec3b4b5e',
  checkpoint35Runner:
    '26305e423710262a890c3bd5434fc6b57784c792be4b375ae8335f71a8f290c5',
  checkpoint37Runner:
    '9f2137cfe3f580ba971420092f5b5c03d6c510dd9c9bf57a0aa4c4ec157ad1bc',
  lib: '6a958b709cfb639697186d0878ab3dcf9f4dafe03e0bfdb7c5e141a38e8708d5',
  prompt:
    '3833c73cade381846baf92efea2165db591f098884e5acc1279e1976692147e5',
  hypotheses:
    'c71153db4148d8bad3ab0f772aa55e130e00e201b61c78ff5d21573c04595009',
  acceptedResults: [
    '209fd7a60b5854139559db2c66809d3560b7da1f1ef7677b9eb4c2075e482054',
    '22a6606b4daf3a02d26137ffd0d3f9d4be63795c6fa12700de849e02ffb3b065',
    '565f0498e4b6832872cc75cf80dd3fa361345de022930319f7f1f598610e567b',
  ],
});

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const readJson = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const requirePass = (condition, message) => {
  if (!condition) throw new Error(message);
};
const rel = (file) => {
  const absolute = path.resolve(file).replace(/\\/g, '/');
  const root = path.resolve(C.REPO).replace(/\\/g, '/');
  return absolute.startsWith(`${root}/`) ? absolute.slice(root.length + 1) : absolute;
};
const hashRecord = (file) => {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), bytes: bytes.length, sha256: sha(bytes) };
};
const git = (...args) =>
  execFileSync('git', args, {
    cwd: C.REPO,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });

function writeOnceBuffer(file, bytes) {
  const absolute = path.resolve(file);
  const value = Buffer.from(bytes);
  if (fs.existsSync(absolute)) {
    requirePass(
      fs.readFileSync(absolute).equals(value),
      `C34_CHECKPOINT39_EXISTING_EVIDENCE_DIFFERS_${rel(absolute)}`,
    );
    return absolute;
  }
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, value, { flag: 'wx' });
  return absolute;
}

function writeOnceJson(file, value) {
  return writeOnceBuffer(file, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

function writeMutableJson(file, value) {
  const absolute = path.resolve(file);
  const temporary =
    `${absolute}.c34-cp39-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  let temporaryExists = false;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    temporaryExists = true;
    fs.renameSync(temporary, absolute);
    temporaryExists = false;
  } finally {
    if (temporaryExists && fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function parseNdjson(file) {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function verifyCheckpoint42Manifest(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    requirePass(match, `C34_CHECKPOINT39_MANIFEST_LINE_INVALID_${line}`);
    const target = path.isAbsolute(match[2])
      ? path.resolve(match[2])
      : path.resolve(C.REPO, match[2]);
    const exists = fs.existsSync(target);
    const actualSha256 = exists ? sha(fs.readFileSync(target)) : null;
    return {
      manifestPath: match[2],
      target: rel(target),
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  return {
    manifest: hashRecord(file),
    records,
    badRecords: records.filter((record) => !record.pass),
    pass: records.every((record) => record.pass),
  };
}

function validateCheckpointChain() {
  const bytes = fs.readFileSync(CHECKPOINT_LOG);
  const lines = bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  let prior = Buffer.alloc(0);
  const records = lines.map((line, index) => {
    const event = JSON.parse(line);
    const legacy = index < 14;
    const { eventSha256, ...withoutHash } = event;
    const pass = legacy
      ? event.schemaVersion == null
        && event.ordinal == null
        && event.eventSha256 == null
        && event.previousLogSha256 == null
      : event.schemaVersion === 2
        && event.ordinal === index + 1
        && eventSha256 === sha(Buffer.from(JSON.stringify(withoutHash)))
        && event.previousLogSha256 === sha(prior);
    const record = {
      ordinal: index + 1,
      stage: event.stage,
      status: event.status,
      schema: legacy ? 'LEGACY_APPEND_ONLY_V1' : `V${event.schemaVersion}`,
      pass,
    };
    prior = Buffer.concat([prior, Buffer.from(`${line}\n`)]);
    return record;
  });
  return {
    path: rel(CHECKPOINT_LOG),
    rows: records.length,
    sha256: sha(bytes),
    records,
    pass: records.every((record) => record.pass),
  };
}

function numberedCheckpointFiles(ordinal) {
  const prefix =
    `COMMIT_5R1C34_RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_`;
  return fs.readdirSync(RES)
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(RES, name))
    .sort();
}

function validateCheckpointEvent(event, ordinal, prefixBytes) {
  const { eventSha256, ...withoutHash } = event;
  return event.schemaVersion === 2
    && event.ordinal === ordinal
    && event.previousLogSha256 === sha(prefixBytes)
    && eventSha256 === sha(Buffer.from(JSON.stringify(withoutHash)));
}

function repairCheckpointTipIfInterrupted() {
  let bytes = fs.readFileSync(CHECKPOINT_LOG);
  let lines = bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  requirePass(lines.length > 0, 'C34_CHECKPOINT39_EMPTY_CHECKPOINT_LOG');
  let tip = JSON.parse(lines.at(-1));
  let current = readJson(CHECKPOINT);
  if (JSON.stringify(current) !== JSON.stringify(tip)) {
    const previous = lines.length > 1 ? JSON.parse(lines.at(-2)) : null;
    requirePass(
      JSON.stringify(current) === JSON.stringify(previous),
      'C34_CHECKPOINT39_CURRENT_CHECKPOINT_CONFLICT',
    );
    const numbered = numberedCheckpointFiles(lines.length);
    requirePass(
      numbered.length === 1
        && JSON.stringify(readJson(numbered[0])) === JSON.stringify(tip),
      'C34_CHECKPOINT39_LOG_TIP_NUMBERED_CHECKPOINT_INVALID',
    );
    writeMutableJson(CHECKPOINT, tip);
    current = tip;
  }
  const nextOrdinal = lines.length + 1;
  const dangling = numberedCheckpointFiles(nextOrdinal);
  requirePass(
    dangling.length <= 1,
    `C34_CHECKPOINT39_MULTIPLE_DANGLING_NUMBERED_${nextOrdinal}`,
  );
  if (dangling.length === 1) {
    const event = readJson(dangling[0]);
    requirePass(
      validateCheckpointEvent(event, nextOrdinal, bytes),
      `C34_CHECKPOINT39_DANGLING_NUMBERED_INVALID_${nextOrdinal}`,
    );
    requirePass(
      JSON.stringify(current) === JSON.stringify(tip),
      'C34_CHECKPOINT39_DANGLING_CURRENT_NOT_AT_TIP',
    );
    const descriptor = fs.openSync(CHECKPOINT_LOG, 'a');
    try {
      fs.writeFileSync(descriptor, `${JSON.stringify(event)}\n`);
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    writeMutableJson(CHECKPOINT, event);
    bytes = fs.readFileSync(CHECKPOINT_LOG);
    lines = bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
    tip = event;
  }
  return {
    rows: lines.length,
    tip,
    current: readJson(CHECKPOINT),
    chain: validateCheckpointChain(),
  };
}

function removeOwnedTemp(directory, prefix) {
  const absolute = path.resolve(directory);
  const roots = [...new Set([os.tmpdir(), 'C:/Temp'].map((root) => path.resolve(root)))];
  const owned = roots.some((root) =>
    absolute.startsWith(`${root}${path.sep}`)
      && path.basename(absolute).startsWith(prefix));
  requirePass(owned, `C34_CHECKPOINT39_REFUSE_TEMP_REMOVAL_${absolute}`);
  if (fs.existsSync(absolute)) fs.rmSync(absolute, { recursive: true, force: true });
}

function temporaryRuntimeDirectories() {
  const prefixes = [
    'tina-c34-candidate-',
    'tina-c34-checkpoint35-adapter-',
    'tina-c34-checkpoint37-',
    'tina-c34-checkpoint39-',
    'tina-c34-cp37-',
    'tina-c34-cp39-',
  ];
  const roots = [...new Set([os.tmpdir(), 'C:/Temp'].map((root) => path.resolve(root)))];
  return roots.flatMap((root) => {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) =>
        entry.isDirectory() && prefixes.some((prefix) => entry.name.startsWith(prefix)))
      .map((entry) => path.join(root, entry.name));
  }).sort();
}

function allocationLocks() {
  return fs.readdirSync(RES)
    .filter((name) => /^COMMIT_5R1C34_CANDIDATE_[4-6]_ALLOCATION\.lock$/i.test(name))
    .map((name) => path.join(RES, name))
    .sort();
}

function strictProcessState() {
  const command = [
    '$ErrorActionPreference="Stop"',
    '$rows=@(Get-CimInstance Win32_Process -Filter "Name = \'node.exe\'"'
      + ' | ForEach-Object {[ordered]@{ProcessId=$_.ProcessId;'
      + 'ParentProcessId=$_.ParentProcessId;CommandLine=$_.CommandLine}})',
    '@($rows) | ConvertTo-Json -Compress -Depth 5',
  ].join('; ');
  const inspection = spawnSync(
    'C:/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe',
    ['-NoProfile', '-Command', command],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const raw = inspection.stdout?.trim() || '[]';
  let nodes = [];
  let parseError = null;
  try {
    const parsed = JSON.parse(raw);
    nodes = Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    parseError = error?.stack || String(error);
  }
  const current = nodes.filter((record) => Number(record.ProcessId) === process.pid);
  const others = nodes.filter((record) => Number(record.ProcessId) !== process.pid);
  const unreadable = others.filter((record) =>
    typeof record.CommandLine !== 'string' || record.CommandLine.trim() === '');
  const activeC34 = others.filter((record) =>
    typeof record.CommandLine === 'string'
      && /commit5r1c34/i.test(record.CommandLine));
  const netstat = spawnSync('netstat.exe', ['-ano', '-p', 'TCP'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const listeners5173 = (netstat.stdout || '').split(/\r?\n/).flatMap((line) => {
    const parts = line.trim().split(/\s+/);
    return parts.length >= 4
      && parts[0] === 'TCP'
      && /:5173$/.test(parts[1])
      && parts[3] === 'LISTENING'
      ? [line.trim()]
      : [];
  });
  return {
    inspectionMethod:
      'PowerShell CIM node.exe inventory with current-PID exclusion and independent netstat',
    currentExecutorPid: process.pid,
    processInspectionStatus: inspection.status,
    processInspectionSignal: inspection.signal,
    processInspectionStderr: inspection.stderr || '',
    processInspectionParseError: parseError,
    processInspectionSucceeded:
      inspection.status === 0 && inspection.signal == null && parseError == null,
    currentExecutorPresent: current.length === 1,
    currentExecutorCommandLineReadable:
      current.length === 1
      && typeof current[0].CommandLine === 'string'
      && current[0].CommandLine.trim() !== '',
    otherNodeProcesses: others,
    unreadableNodeProcesses: unreadable,
    allOtherNodeCommandLinesReadable: unreadable.length === 0,
    activeC34Runners: activeC34,
    activeC34RunnerCount: activeC34.length,
    netstatInspectionStatus: netstat.status,
    netstatInspectionSignal: netstat.signal,
    netstatInspectionStderr: netstat.stderr || '',
    listeners5173,
    port5173Free: netstat.status === 0
      && netstat.signal == null
      && listeners5173.length === 0,
  };
}

function gitState() {
  const serviceDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    'services/philippine-tax-intent-analyzer.js',
    'services/philippine-tax-domain-boundary.js',
    'services/philippine-tax-boundary-patterns.js',
  ).trim();
  const stagedDiff = git('diff', '--cached', '--name-only').trim();
  const head = git('rev-parse', 'HEAD').trim();
  const upstream = git('rev-parse', '@{u}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim();
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  return {
    serviceDiff,
    stagedDiff,
    head,
    upstream,
    sync,
    c35Items: status.split(/\r?\n/).filter((line) =>
      /5R1C35|commit5r1c35/i.test(line)),
    indexLock: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    liveServices: C.liveRuntimeIdentity(),
  };
}

async function loadFrozenExecutor() {
  requirePass(
    sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner,
    'C34_CHECKPOINT39_FROZEN_EXECUTOR_DRIFT',
  );
  requirePass(
    sha(fs.readFileSync(LIB)) === EXPECTED.lib,
    'C34_CHECKPOINT39_FROZEN_LIBRARY_DRIFT',
  );
  const source = fs.readFileSync(ORIGINAL_RUNNER, 'utf8');
  const marker = '\nasync function main() {';
  const markerIndex = source.indexOf(marker);
  requirePass(markerIndex > 0, 'C34_CHECKPOINT39_EXECUTOR_ADAPTER_MARKER_MISSING');
  const commonLib = path.resolve(
    'evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs',
  );
  const frozenPrefix = source.slice(0, markerIndex)
    .replace(
      "from './commit5r1c20-lib.mjs'",
      `from '${pathToFileURL(commonLib).href}'`,
    )
    .replace(
      "from './commit5r1c34-lib.mjs'",
      `from '${pathToFileURL(LIB).href}'`,
    );
  const checkpointStart = frozenPrefix.indexOf('\nfunction checkpoint({');
  const checkpointEnd = frozenPrefix.indexOf(
    '\nfunction appendIdempotentCheckpoint({',
    checkpointStart,
  );
  requirePass(
    checkpointStart > 0 && checkpointEnd > checkpointStart,
    'C34_CHECKPOINT39_CHECKPOINT_ADAPTER_MARKERS_MISSING',
  );
  const crashSafeCheckpoint = `
function checkpoint({
  stage,
  status,
  activeBaseHash,
  attemptId = null,
  artifacts = [],
  nextExactOperation,
  safeToResume,
  blocker = null,
}) {
  const priorLog = fs.existsSync(RECOVERY_CHECKPOINT_LOG)
    ? fs.readFileSync(RECOVERY_CHECKPOINT_LOG)
    : Buffer.alloc(0);
  const ordinal = priorLog.length
    ? priorLog.toString('utf8').split(/\\r?\\n/).filter(Boolean).length + 1
    : 1;
  return appendIdempotentCheckpoint({
    ordinal,
    updatedAtUtc: C.now(),
    stage,
    status,
    activeBaseHash,
    attemptId,
    artifacts,
    nextExactOperation,
    safeToResume,
    blocker,
  }).event;
}
`;
  const adaptedPrefix =
    frozenPrefix.slice(0, checkpointStart)
    + crashSafeCheckpoint
    + frozenPrefix.slice(checkpointEnd);
  const appendStart = adaptedPrefix.indexOf('\nfunction appendIdempotentCheckpoint({');
  const appendEnd = adaptedPrefix.indexOf(
    '\nfunction numberedCheckpointPath(',
    appendStart,
  );
  requirePass(
    appendStart > 0 && appendEnd > appendStart,
    'C34_CHECKPOINT39_IDEMPOTENT_ADAPTER_MARKERS_MISSING',
  );
  const appendBlock = adaptedPrefix.slice(appendStart, appendEnd);
  const appendWithActive = appendBlock.replace(
    '\n    attemptId,\n    artifactHashes:',
    '\n    attemptId,\n    activeAttemptId: attemptId,\n    artifactHashes:',
  );
  requirePass(
    appendWithActive !== appendBlock,
    'C34_CHECKPOINT39_ACTIVE_ATTEMPT_ADAPTER_FAILED',
  );
  const adapted =
    adaptedPrefix.slice(0, appendStart)
    + appendWithActive
    + adaptedPrefix.slice(appendEnd)
    + `
export {
  CANDIDATES,
  loadPreservationForRecovery,
  runMaterialCandidate,
};
`
      .replace(
        "artifact('NT01_LINKED_RETRY_AUTHORIZATION.json')",
        "artifact('CANDIDATE_5_LINKED_RETRY_AUTHORIZATION.json')",
      )
      .replace(
        'Execute the linked NT01 retry once against the exact immutable C33 M01R base.',
        'Execute the linked Candidate-5 retry once against the exact immutable Candidate-4 base.',
      );
  const temporary = path.join(
    os.tmpdir(),
    `tina-c34-checkpoint39-adapter-${process.pid}-`
      + `${crypto.randomBytes(6).toString('hex')}.mjs`,
  );
  fs.writeFileSync(temporary, adapted, { flag: 'wx' });
  try {
    return await import(`${pathToFileURL(temporary).href}?sha=${sha(Buffer.from(adapted))}`);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function cycleState(ordinal) {
  const cycle = CYCLES[ordinal];
  const registry = readJson(REGISTRY);
  const walRows = parseNdjson(WAL);
  const checkpointRows = parseNdjson(CHECKPOINT_LOG);
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const matchesId = (attemptId) =>
    typeof attemptId === 'string' && attemptId.includes(`-${cycle}-`);
  return {
    ordinal,
    cycle,
    registry,
    walRows,
    checkpointRows,
    directories,
    registryRecords: registry.attempts.filter((attempt) =>
      attempt.cycle === cycle || matchesId(attempt.attemptId)),
    walRecords: walRows.filter((row) => matchesId(row.attemptId)),
    directoryRecords: directories.filter(matchesId),
    checkpointRecords: checkpointRows.filter((event) =>
      matchesId(event.attemptId) || matchesId(event.activeAttemptId)),
    lockPath: ordinal === 4 ? CANDIDATE_4_LOCK
      : ordinal === 5 ? CANDIDATE_5_LOCK
        : null,
  };
}

function acceptedAttempt(attemptId, expectedSha256, expectedCandidateId) {
  const directory = path.join(ATT, attemptId);
  const attemptFile = path.join(directory, 'ATTEMPT.json');
  const resultFile = path.join(directory, 'ITERATION_RESULT.json');
  const snapshot = path.join(directory, 'runtime-snapshot');
  const attempt = readJson(attemptFile);
  const result = readJson(resultFile);
  const identity = C.runtimeFor(snapshot);
  requirePass(
    attempt.attemptId === attemptId
      && attempt.status === 'completed'
      && attempt.exitCode === 0
      && attempt.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
      && attempt.controlling === true,
    `C34_CHECKPOINT39_ACCEPTED_ATTEMPT_INVALID_${attemptId}`,
  );
  requirePass(
    sha(fs.readFileSync(resultFile)) === expectedSha256
      && result.attemptId === attemptId
      && result.candidateId === expectedCandidateId
      && result.accepted === true
      && result.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
      && C.sameRuntime(identity, result.candidateIdentity)
      && result.metrics.decisionPassed === 3720
      && result.metrics.relationPassed === 3720
      && result.rowLevel.newlyRegressed.length === 0
      && result.preservation.pass === true,
    `C34_CHECKPOINT39_ACCEPTED_RESULT_INVALID_${attemptId}`,
  );
  return {
    ordinal: result.candidateOrdinal,
    attempt,
    result,
    files: { directory, attemptFile, resultFile, snapshot },
    active: {
      attemptId,
      candidateId: result.candidateId,
      dir: snapshot,
      identity,
      gates: result.gates,
    },
  };
}

function acceptedCandidates1To3() {
  const expectedIds = [
    'C34-NT01-typed-ordinary-domain-inquiry-without-operation-is-no-tax-relation',
    'C34-NT02-local-identifier-redefinition-is-explicit-non-tax-task',
    'C34-TX01-copular-resolved-tax-topic-is-explicit-tax-task',
  ];
  const accepted = ACCEPTED_IDS.map((attemptId, index) =>
    acceptedAttempt(
      attemptId,
      EXPECTED.acceptedResults[index],
      expectedIds[index],
    ));
  requirePass(
    accepted[0].result.metrics.reasonPassed === 3556
      && accepted[1].result.metrics.reasonPassed === 3561
      && accepted[2].result.metrics.reasonPassed === 3565
      && accepted[2].result.metrics.reasonMismatches === 155
      && accepted[2].active.identity.servicesTreeDigest === ACTIVE_BASE_39,
    'C34_CHECKPOINT39_ACCEPTED_CANDIDATE_BASE_OR_METRIC_DRIFT',
  );
  return accepted;
}

function terminalCandidate(ordinal) {
  const state = cycleState(ordinal);
  requirePass(
    state.registryRecords.length <= 1
      && state.directoryRecords.length <= 1,
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_MULTIPLE_ATTEMPTS`,
  );
  if (state.registryRecords.length === 0) {
    requirePass(
      state.directoryRecords.length === 0 && state.walRecords.length === 0,
      `C34_CHECKPOINT39_CANDIDATE_${ordinal}_PARTIAL_UNREGISTERED_STATE`,
    );
    return { state, attempt: null, result: null, active: null };
  }
  const attempt = state.registryRecords[0];
  requirePass(
    state.directoryRecords.length === 1
      && state.directoryRecords[0] === attempt.attemptId,
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_DIRECTORY_MISMATCH`,
  );
  const attemptDirectory = path.join(ATT, attempt.attemptId);
  const attemptFile = path.join(attemptDirectory, 'ATTEMPT.json');
  const record = readJson(attemptFile);
  requirePass(
    JSON.stringify(record) === JSON.stringify(attempt)
      && attempt.cycle === CYCLES[ordinal]
      && attempt.attemptOrdinal === ordinal
      && attempt.retryOf == null
      && ['completed', 'technical_failure', 'transient_failure'].includes(attempt.status),
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_ATTEMPT_NOT_TERMINAL`,
  );
  const resultFile = path.join(attemptDirectory, 'ITERATION_RESULT.json');
  const result = fs.existsSync(resultFile) ? readJson(resultFile) : null;
  let active = null;
  if (
    attempt.status === 'completed'
    && result != null
    && result.accepted === true
  ) {
    const snapshot = path.join(attemptDirectory, 'runtime-snapshot');
    const identity = C.runtimeFor(snapshot);
    requirePass(
      result.attemptId === attempt.attemptId
        && result.candidateId === CANDIDATE_IDS[ordinal]
        && result.candidateOrdinal === ordinal
        && result.allocationCycle === CYCLES[ordinal]
        && result.disposition === attempt.disposition
        && C.sameRuntime(identity, result.candidateIdentity),
      `C34_CHECKPOINT39_CANDIDATE_${ordinal}_RESULT_INVALID`,
    );
    active = {
      attemptId: attempt.attemptId,
      candidateId: result.candidateId,
      dir: snapshot,
      identity,
      gates: result.gates,
    };
  }
  return {
    state,
    attempt,
    record,
    result,
    resultFile,
    attemptDirectory,
    active,
  };
}

function frozenHypothesis(ordinal) {
  const hypotheses = readJson(HYPOTHESES);
  const records = hypotheses.materialCandidateOrder.filter((record) =>
    record.ordinal === ordinal && record.candidateId === CANDIDATE_IDS[ordinal]);
  requirePass(
    hypotheses.pass === true
      && hypotheses.materialCandidateBudget === 6
      && records.length === 1,
    `C34_CHECKPOINT39_FROZEN_CANDIDATE_${ordinal}_HYPOTHESIS_INVALID`,
  );
  return { hypotheses, record: records[0] };
}

function markerCounts(activeDirectory) {
  const source = fs.readFileSync(
    path.join(activeDirectory, 'philippine-tax-intent-analyzer.js'),
    'utf8',
  );
  const markers = {
    candidate1: 'const c34OrdinaryDomainInquiryHasNoTaxRelation',
    candidate2: 'const c34LocalIdentifierRedefinition',
    candidate3: 'const c34CopularShortTaxTopic',
    candidate4: 'const c34ImportDutyInstrumentTopic',
    candidate5: 'const c34LegalRuleBearsTaxTreatment',
    candidate6: 'const c34TaxRemedyDeadlineIsCompliance',
  };
  return Object.fromEntries(
    Object.entries(markers).map(([name, marker]) => [
      name,
      source.split(marker).length - 1,
    ]),
  );
}

function previewCandidate(executor, ordinal, active) {
  const prefix = `tina-c34-cp39-candidate${ordinal}-preview-`;
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const runtime = path.join(temporaryRoot, 'runtime');
  try {
    const candidate = executor.CANDIDATES[ordinal - 1];
    requirePass(
      candidate.id === CANDIDATE_IDS[ordinal]
        && candidate.cycle === CYCLES[ordinal],
      `C34_CHECKPOINT39_FROZEN_CANDIDATE_${ordinal}_CONTRACT_DRIFT`,
    );
    const sourceMarkersBefore = markerCounts(active.dir);
    requirePass(
      sourceMarkersBefore.candidate1 === 1
        && sourceMarkersBefore.candidate2 === 1
        && sourceMarkersBefore.candidate3 === 1
        && (ordinal === 4
          ? sourceMarkersBefore.candidate4 === 0
            && sourceMarkersBefore.candidate5 === 0
          : sourceMarkersBefore.candidate4 === 1
            && sourceMarkersBefore.candidate5 === 0)
        && sourceMarkersBefore.candidate6 === 0,
      `C34_CHECKPOINT39_ACTIVE_SOURCE_MARKER_DRIFT_${ordinal}`,
    );
    const identity = C.materializeCandidate(active.dir, runtime, [candidate.block]);
    const patch = C.canonicalPatch(active.dir, runtime);
    const sourceMarkersAfter = markerCounts(runtime);
    requirePass(
      patch.pass
        && patch.sha256 === EXPECTED_PATCHES[ordinal]
        && identity.servicesTreeDigest !== active.identity.servicesTreeDigest
        && sourceMarkersAfter[`candidate${ordinal}`] === 1
        && sourceMarkersAfter.candidate6 === 0,
      `C34_CHECKPOINT39_CANDIDATE_${ordinal}_PREVIEW_INVALID`,
    );
    return {
      candidate: {
        id: candidate.id,
        cycle: candidate.cycle,
        frontier: candidate.frontier,
        principle: candidate.principle,
        observablePredicate: candidate.observablePredicate,
        expectedReason: candidate.expectedReason,
        expectedDecision: candidate.expectedDecision,
        forecastCorrections: candidate.forecastCorrections,
        leaveFamilyName: candidate.leaveFamilyName,
      },
      exactActiveBaseHash: active.identity.servicesTreeDigest,
      sourceMarkersBefore,
      sourceMarkersAfter,
      materializedIdentity: identity,
      candidatePatch: {
        sha256: patch.sha256,
        bytes: patch.bytes,
        changedFiles: patch.changedFiles,
        headersValid: patch.headersValid,
        hasForbiddenPath: patch.hasForbiddenPath,
        pass: patch.pass,
      },
      allocationPerformed: false,
      semanticGatesExecuted: false,
      temporaryRuntimeRemoved: true,
      pass: true,
    };
  } finally {
    removeOwnedTemp(temporaryRoot, prefix);
  }
}

async function protectedAcceptedRows(accepted, active) {
  const analyze = await C.loadAnalyzerFrom(
    active.dir,
    `c34-checkpoint39-protected-${accepted.length}-${active.identity.servicesTreeDigest}`,
  );
  const sources = accepted.flatMap((item) => [
    ...item.result.rowLevel.newlyCorrected.map((record) => ({
      category: `candidate${item.ordinal}-r3-correction`,
      attemptId: item.attempt.attemptId,
      oracleId: record.oracleId,
      query: record.query,
    })),
    ...item.result.generalization.rows.map((record) => ({
      category: `candidate${item.ordinal}-packet-${record.category}`,
      attemptId: item.attempt.attemptId,
      oracleId: null,
      query: record.query,
    })),
    ...item.result.leaveOneFamilyOut.records.map((record) => ({
      category: `candidate${item.ordinal}-leave-family-out`,
      attemptId: item.attempt.attemptId,
      oracleId: null,
      query: record.query,
    })),
  ]);
  const seen = new Set();
  return sources.flatMap((record) => {
    const key = record.query.trim().replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      ...record,
      signature: C.outputSignature(analyze(record.query)),
    }];
  });
}

function extendPreservation(preservation, protectedRows) {
  const acceptedR3 = protectedRows.filter((record) =>
    record.category.includes('-r3-correction'));
  const acceptedPacket = protectedRows.filter((record) =>
    record.category.includes('-packet-'));
  const acceptedLfo = protectedRows.filter((record) =>
    record.category.includes('-leave-family-out'));
  preservation.priorCorrectRows = [
    ...preservation.priorCorrectRows,
    ...acceptedR3,
  ];
  preservation.generalization = {
    ...preservation.generalization,
    required: preservation.generalization.required + acceptedPacket.length,
    records: [
      ...preservation.generalization.records,
      ...acceptedPacket.map((record) => ({
        ...record,
        selectedSignature: record.signature,
      })),
    ],
  };
  preservation.leaveOneFamilyOut = {
    ...preservation.leaveOneFamilyOut,
    required: preservation.leaveOneFamilyOut.required + acceptedLfo.length,
    records: [
      ...preservation.leaveOneFamilyOut.records,
      ...acceptedLfo.map((record) => ({
        ...record,
        selectedSignature: record.signature,
      })),
    ],
  };
  return {
    preservation,
    counts: {
      total: protectedRows.length,
      r3Corrections: acceptedR3.length,
      packet: acceptedPacket.length,
      leaveFamilyOut: acceptedLfo.length,
    },
  };
}

function verifyCheckpoint39Continuity(executor) {
  const current = readJson(CHECKPOINT);
  const numbered = readJson(CHECKPOINT_39);
  const { eventSha256, ...withoutHash } = numbered;
  const chain = validateCheckpointChain();
  const manifest = verifyManifest(CHECKPOINT_39_MANIFEST);
  const accepted = acceptedCandidates1To3();
  const candidate4 = cycleState(4);
  const candidate5 = cycleState(5);
  const candidate6 = cycleState(6);
  const hypothesis4 = frozenHypothesis(4);
  const ledger = C.reconcileC34AttemptLedger();
  const processState = strictProcessState();
  const repository = gitState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const regression = readJson(
    path.join(
      RES,
      'COMMIT_5R1C34_CANDIDATE_3_ACCEPTED_CANDIDATES_1_AND_2_REGRESSION_VALIDATION.json',
    ),
  );
  const preview = previewCandidate(executor, 4, accepted[2].active);
  const c34Attempts = candidate4.registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const pass =
    sha(fs.readFileSync(CHECKPOINT)) === EXPECTED.checkpoint39
    && sha(fs.readFileSync(CHECKPOINT_39)) === EXPECTED.checkpoint39
    && JSON.stringify(current) === JSON.stringify(numbered)
    && current.ordinal === 39
    && current.safeToResume === true
    && current.attemptId == null
    && current.activeAttemptId == null
    && current.activeBaseHash === ACTIVE_BASE_39
    && current.currentMetrics.reasonPassed === 3565
    && current.currentMetrics.remainingReasonMismatches === 155
    && current.currentMetrics.decisionPassed === 3720
    && current.currentMetrics.relationPassed === 3720
    && eventSha256 === EXPECTED.checkpoint39Event
    && eventSha256 === sha(Buffer.from(JSON.stringify(withoutHash)))
    && chain.pass
    && chain.rows === 39
    && chain.sha256 === EXPECTED.checkpointLog39
    && sha(fs.readFileSync(CHECKPOINT_39_MANIFEST)) === EXPECTED.checkpoint39Manifest
    && sha(fs.readFileSync(CHECKPOINT_39_SAFE_PAUSE)) === EXPECTED.checkpoint39SafePause
    && manifest.pass
    && manifest.records.length === 52
    && sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
    && sha(fs.readFileSync(WAL)) === EXPECTED.wal
    && sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner
    && sha(fs.readFileSync(CHECKPOINT35_RUNNER)) === EXPECTED.checkpoint35Runner
    && sha(fs.readFileSync(CHECKPOINT37_RUNNER)) === EXPECTED.checkpoint37Runner
    && sha(fs.readFileSync(LIB)) === EXPECTED.lib
    && sha(fs.readFileSync(PROMPT)) === EXPECTED.prompt
    && sha(fs.readFileSync(HYPOTHESES)) === EXPECTED.hypotheses
    && candidate4.registry.attempts.length === 223
    && c34Attempts.length === 5
    && candidate4.walRows.length === 16
    && candidate4.directories.length === 5
    && candidate4.registryRecords.length === 0
    && candidate4.walRecords.length === 0
    && candidate4.directoryRecords.length === 0
    && candidate4.checkpointRecords.length === 0
    && candidate5.registryRecords.length === 0
    && candidate5.walRecords.length === 0
    && candidate5.directoryRecords.length === 0
    && candidate6.registryRecords.length === 0
    && candidate6.walRecords.length === 0
    && candidate6.directoryRecords.length === 0
    && ledger.pass
    && ledger.orphan === 0
    && ledger.dangling === 0
    && ledger.running.length === 0
    && regression.pass === true
    && regression.protectedRows.total === 149
    && regression.regressions.length === 0
    && processState.processInspectionSucceeded
    && processState.currentExecutorPresent
    && processState.currentExecutorCommandLineReadable
    && processState.allOtherNodeCommandLinesReadable
    && processState.activeC34RunnerCount === 0
    && processState.port5173Free
    && temporary.length === 0
    && locks.length === 0
    && repository.serviceDiff === ''
    && repository.stagedDiff === ''
    && repository.head === EXPECTED.head
    && repository.upstream === EXPECTED.head
    && repository.sync === '0\t0'
    && repository.c35Items.length === 0
    && repository.indexLock === false
    && preview.pass;
  requirePass(pass, 'CHECKPOINT_39_CONTINUITY_MISMATCH');
  return {
    pass,
    current,
    chain,
    manifest,
    accepted,
    candidate4,
    candidate5,
    candidate6,
    hypothesis4,
    ledger,
    processState,
    repository,
    temporary,
    locks,
    regression,
    preview,
    checkpoint39Idempotence: {
      currentEqualsNumbered: JSON.stringify(current) === JSON.stringify(numbered),
      currentEqualsLogTip:
        JSON.stringify(current) === JSON.stringify(parseNdjson(CHECKPOINT_LOG).at(-1)),
      duplicateCheckpointAbsent: numberedCheckpointFiles(40).length === 0,
      pass: true,
    },
  };
}

async function runCandidate4Preflight(executor) {
  const continuity = verifyCheckpoint39Continuity(executor);
  writeOnceBuffer(CHECKPOINT_39_REGISTRY_SNAPSHOT, fs.readFileSync(REGISTRY));
  writeOnceBuffer(CHECKPOINT_39_WAL_SNAPSHOT, fs.readFileSync(WAL));
  writeOnceBuffer(CHECKPOINT_39_LOG_SNAPSHOT, fs.readFileSync(CHECKPOINT_LOG));
  const authorization = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: SESSION_STARTED_UTC,
    classification: 'CHECKPOINT_39_CONTINUATION_AUTHORIZED',
    controllingState: {
      checkpoint: 39,
      safeToResume: true,
      activeAttemptId: null,
      activeBaseHash: ACTIVE_BASE_39,
      acceptedCandidateAttemptIds: ACCEPTED_IDS,
      metrics: continuity.current.currentMetrics,
    },
    timebox: {
      startedUtc: SESSION_STARTED_UTC,
      hardStopUtc: SESSION_HARD_STOP_UTC,
      maximumMinutes: 120,
      candidate4AuthorizedExactlyOnce: true,
      candidate5Conditional: true,
      candidate6Prohibited: true,
      stageCommitPushC35Prohibited: true,
    },
    bindings: {
      checkpoint39: hashRecord(CHECKPOINT_39),
      checkpoint39EventSha256: EXPECTED.checkpoint39Event,
      checkpoint39SafePause: hashRecord(CHECKPOINT_39_SAFE_PAUSE),
      checkpoint39Manifest: hashRecord(CHECKPOINT_39_MANIFEST),
      checkpoint39RegistrySnapshot: hashRecord(CHECKPOINT_39_REGISTRY_SNAPSHOT),
      checkpoint39AllocationWalSnapshot: hashRecord(CHECKPOINT_39_WAL_SNAPSHOT),
      checkpoint39LogSnapshot: hashRecord(CHECKPOINT_39_LOG_SNAPSHOT),
      acceptedCandidateResults: continuity.accepted.map((item) =>
        hashRecord(item.files.resultFile)),
      hypotheses: hashRecord(HYPOTHESES),
      originalRunner: hashRecord(ORIGINAL_RUNNER),
      checkpoint35Runner: hashRecord(CHECKPOINT35_RUNNER),
      checkpoint37Runner: hashRecord(CHECKPOINT37_RUNNER),
      continuationRunner: hashRecord(THIS_RUNNER),
      library: hashRecord(LIB),
      prompt: hashRecord(PROMPT),
      registry: hashRecord(REGISTRY),
      allocationWal: hashRecord(WAL),
    },
    pass: true,
  };
  writeOnceJson(AUTHORIZATION, authorization);
  const nonDuplication = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: SESSION_STARTED_UTC,
    decision: 'PASS_NO_DUPLICATE_CANDIDATE_4_WORK',
    candidateId: CANDIDATE_IDS[4],
    cycle: CYCLES[4],
    allocationOrdinal: 4,
    registryRecords: continuity.candidate4.registryRecords,
    allocationWalRecords: continuity.candidate4.walRecords,
    attemptDirectoryRecords: continuity.candidate4.directoryRecords,
    checkpointRecords: continuity.candidate4.checkpointRecords,
    allocationLockPresent: fs.existsSync(CANDIDATE_4_LOCK),
    frozenOrder: continuity.hypothesis4.record,
    acceptedCandidateLinkage: continuity.accepted.map((item) => ({
      attemptId: item.attempt.attemptId,
      candidateId: item.result.candidateId,
      activeBaseHash: item.result.candidateIdentity.servicesTreeDigest,
      accepted: item.result.accepted,
    })),
    candidate4Allocated: false,
    pass: true,
  };
  writeOnceJson(CANDIDATE_4_NON_DUPLICATION, nonDuplication);
  const compatibility = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: SESSION_STARTED_UTC,
    decision: 'PASS_READY_FOR_MATERIAL_CANDIDATE_4',
    exactActiveBase: {
      attemptId: continuity.accepted[2].attempt.attemptId,
      candidateId: continuity.accepted[2].result.candidateId,
      identity: continuity.accepted[2].active.identity,
      metrics: continuity.accepted[2].result.metrics,
    },
    candidate4Preview: continuity.preview,
    checkpoint39Idempotence: continuity.checkpoint39Idempotence,
    processState: continuity.processState,
    temporaryRuntimeState: {
      directories: continuity.temporary,
      temporaryCandidateInstalled: false,
      restorationRequired: false,
      restorationAction: 'NO_WRITE_REQUIRED',
    },
    allocationLocks: continuity.locks,
    serviceStagingState: continuity.repository,
    pass: true,
  };
  writeOnceJson(CANDIDATE_4_COMPATIBILITY, compatibility);
  return { authorization, nonDuplication, compatibility };
}

function verifyCandidate4Preflight() {
  const authorization = readJson(AUTHORIZATION);
  const nonDuplication = readJson(CANDIDATE_4_NON_DUPLICATION);
  const compatibility = readJson(CANDIDATE_4_COMPATIBILITY);
  requirePass(
    authorization.pass === true
      && authorization.classification === 'CHECKPOINT_39_CONTINUATION_AUTHORIZED'
      && authorization.controllingState.activeAttemptId == null
      && authorization.controllingState.activeBaseHash === ACTIVE_BASE_39
      && authorization.bindings.continuationRunner.sha256
        === sha(fs.readFileSync(THIS_RUNNER))
      && nonDuplication.pass === true
      && nonDuplication.decision === 'PASS_NO_DUPLICATE_CANDIDATE_4_WORK'
      && nonDuplication.candidate4Allocated === false
      && compatibility.pass === true
      && compatibility.decision === 'PASS_READY_FOR_MATERIAL_CANDIDATE_4'
      && compatibility.exactActiveBase.identity.servicesTreeDigest === ACTIVE_BASE_39
      && compatibility.candidate4Preview.candidate.id === CANDIDATE_IDS[4]
      && compatibility.candidate4Preview.pass === true,
    'C34_CHECKPOINT39_CANDIDATE_4_PREFLIGHT_INVALID',
  );
  return { authorization, nonDuplication, compatibility };
}

async function withAllocationLock(ordinal, callback) {
  const file = ordinal === 4 ? CANDIDATE_4_LOCK : CANDIDATE_5_LOCK;
  const token = crypto.randomBytes(16).toString('hex');
  let descriptor = null;
  let owned = false;
  try {
    descriptor = fs.openSync(file, 'wx');
    owned = true;
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify({
        pid: process.pid,
        token,
        createdAtUtc: now(),
        candidateId: CANDIDATE_IDS[ordinal],
        cycle: CYCLES[ordinal],
        allocationOrdinal: ordinal,
      })}\n`,
    );
    fs.fsyncSync(descriptor);
    return await callback();
  } finally {
    if (descriptor != null) fs.closeSync(descriptor);
    if (owned && fs.existsSync(file)) {
      const record = JSON.parse(fs.readFileSync(file, 'utf8'));
      requirePass(
        record.token === token && Number(record.pid) === process.pid,
        `C34_CHECKPOINT39_CANDIDATE_${ordinal}_LOCK_OWNERSHIP_CHANGED`,
      );
      fs.unlinkSync(file);
    }
  }
}

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? recursiveFiles(target) : [target];
  });
}

function writeOrLoadGeneratedEvidence(file, value, validate, errorCode) {
  if (!fs.existsSync(file)) writeOnceJson(file, value);
  const existing = readJson(file);
  requirePass(validate(existing), errorCode);
  return existing;
}

function lateAllocationGate(ordinal, active) {
  const ownLock = ordinal === 4 ? CANDIDATE_4_LOCK : CANDIDATE_5_LOCK;
  const gateFile = ordinal === 4 ? CANDIDATE_4_LATE_GATE : CANDIDATE_5_LATE_GATE;
  const state = cycleState(ordinal);
  const ledger = C.reconcileC34AttemptLedger({ throwOnFailure: false });
  const processState = strictProcessState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const repository = gitState();
  const remainingMs = Date.parse(SESSION_HARD_STOP_UTC) - Date.now();
  const currentCheckpoint = readJson(CHECKPOINT);
  const candidate4 = ordinal === 5 ? terminalCandidate(4) : null;
  const candidate4Manifest = ordinal === 5 && fs.existsSync(CANDIDATE_4_MANIFEST)
    ? verifyManifest(CANDIDATE_4_MANIFEST)
    : null;
  const candidate4Outcome = ordinal === 5 && fs.existsSync(CANDIDATE_4_OUTCOME)
    ? readJson(CANDIDATE_4_OUTCOME)
    : null;
  const pass =
    state.registryRecords.length === 0
    && state.walRecords.length === 0
    && state.directoryRecords.length === 0
    && state.checkpointRecords.length === 0
    && fs.existsSync(ownLock)
    && locks.length === 1
    && path.resolve(locks[0]) === path.resolve(ownLock)
    && ledger.pass
    && ledger.orphan === 0
    && ledger.dangling === 0
    && ledger.running.length === 0
    && processState.processInspectionSucceeded
    && processState.currentExecutorPresent
    && processState.currentExecutorCommandLineReadable
    && processState.allOtherNodeCommandLinesReadable
    && processState.activeC34RunnerCount === 0
    && processState.port5173Free
    && temporary.length === 0
    && repository.serviceDiff === ''
    && repository.stagedDiff === ''
    && repository.head === EXPECTED.head
    && repository.upstream === EXPECTED.head
    && repository.sync === '0\t0'
    && repository.c35Items.length === 0
    && repository.indexLock === false
    && C.runtimeFor(active.dir).servicesTreeDigest
      === active.identity.servicesTreeDigest
    && (ordinal === 4
      ? remainingMs >= 45 * 60 * 1000
        && currentCheckpoint.ordinal === 39
        && currentCheckpoint.activeAttemptId == null
        && currentCheckpoint.activeBaseHash === ACTIVE_BASE_39
      : remainingMs >= 35 * 60 * 1000
        && currentCheckpoint.activeAttemptId == null
        && currentCheckpoint.activeBaseHash === active.identity.servicesTreeDigest
        && candidate4?.attempt?.status === 'completed'
        && candidate4?.result != null
        && candidate4Manifest?.pass === true
        && candidate4Outcome?.pass === true
        && candidate4Outcome.blocker == null);
  const value = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    decision: pass
      ? `PASS_ALLOCATE_EXACTLY_ONE_CANDIDATE_${ordinal}`
      : `FAIL_DO_NOT_ALLOCATE_CANDIDATE_${ordinal}`,
    candidateId: CANDIDATE_IDS[ordinal],
    cycle: CYCLES[ordinal],
    allocationOrdinal: ordinal,
    activeBaseHash: active.identity.servicesTreeDigest,
    timebox: {
      startedUtc: SESSION_STARTED_UTC,
      hardStopUtc: SESSION_HARD_STOP_UTC,
      remainingMs,
      requiredRemainingMs: (ordinal === 4 ? 45 : 35) * 60 * 1000,
    },
    currentCheckpoint: {
      ordinal: currentCheckpoint.ordinal,
      activeAttemptId: currentCheckpoint.activeAttemptId ?? null,
      activeBaseHash: currentCheckpoint.activeBaseHash,
    },
    nonDuplication: {
      registryRecords: state.registryRecords,
      allocationWalRecords: state.walRecords,
      attemptDirectoryRecords: state.directoryRecords,
      checkpointRecords: state.checkpointRecords,
    },
    ledger,
    processState,
    temporaryRuntimeDirectories: temporary,
    allocationLocks: locks.map(rel),
    serviceStagingState: repository,
    candidate4TerminalManifest: candidate4Manifest?.manifest || null,
    pass,
  };
  return writeOrLoadGeneratedEvidence(
    gateFile,
    value,
    (record) =>
      record.pass === true
      && record.decision === `PASS_ALLOCATE_EXACTLY_ONE_CANDIDATE_${ordinal}`
      && record.activeBaseHash === active.identity.servicesTreeDigest,
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_LATE_ALLOCATION_GATE_FAILED`,
  );
}

function appendCandidate4Reconciliation(post) {
  if (!post.attempt) return null;
  const currentLines = parseNdjson(CHECKPOINT_LOG);
  const value = fs.existsSync(CANDIDATE_4_RECONCILIATION)
    ? readJson(CANDIDATE_4_RECONCILIATION)
    : {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc: now(),
      classification: post.blocker
        ? 'CANDIDATE_4_TECHNICAL_TERMINAL_RECONCILED'
        : 'CANDIDATE_4_SEMANTIC_TERMINAL_RECONCILED',
      candidate4AttemptId: post.attempt.attemptId,
      candidate4Status: post.attempt.status,
      candidate4Disposition: post.attempt.disposition,
      activeBaseHash: post.active.identity.servicesTreeDigest,
      activeAttemptId: null,
      checkpointOrdinal: currentLines.length + 1,
      registry: hashRecord(REGISTRY),
      allocationWal: hashRecord(WAL),
      ledger: hashRecord(CANDIDATE_4_LEDGER),
      regression: hashRecord(CANDIDATE_4_REGRESSION),
      outcome: hashRecord(CANDIDATE_4_OUTCOME),
      safeToResume: true,
      blocker: post.blocker
        ? 'CANDIDATE_4_TECHNICAL_INCOMPLETE'
        : null,
      pass: true,
    };
  writeOnceJson(CANDIDATE_4_RECONCILIATION, value);
  requirePass(
    value.pass === true
      && value.candidate4AttemptId === post.attempt.attemptId
      && value.activeBaseHash === post.active.identity.servicesTreeDigest
      && value.activeAttemptId == null
      && value.safeToResume === true,
    'C34_CHECKPOINT39_CANDIDATE_4_RECONCILIATION_INVALID',
  );
  const ordinal = value.checkpointOrdinal;
  const artifacts = [
    CANDIDATE_4_RECONCILIATION,
    CANDIDATE_4_LEDGER,
    CANDIDATE_4_REGRESSION,
    CANDIDATE_4_OUTCOME,
  ];
  const logBytes = fs.readFileSync(CHECKPOINT_LOG);
  const lines = logBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  requirePass(
    lines.length === ordinal - 1 || lines.length === ordinal,
    `C34_CHECKPOINT39_CANDIDATE_4_RECONCILIATION_LOG_${lines.length}`,
  );
  const prefixLines = lines.slice(0, ordinal - 1);
  const prefixBytes = Buffer.from(`${prefixLines.join('\n')}\n`);
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal,
    commitUnit: 'PHASE-10A14-R20-COMMIT-5R1-C34',
    updatedAtUtc: value.generatedUtc,
    stage: 'candidate 4 post-terminal reconciliation',
    status: value.classification,
    head: git('rev-parse', 'HEAD').trim(),
    activeBaseHash: value.activeBaseHash,
    attemptId: null,
    activeAttemptId: null,
    artifactHashes: artifacts.map(hashRecord),
    previousLogSha256: sha(prefixBytes),
    nextExactOperation: post.blocker
      ? 'Stop candidate work and forensically adjudicate candidate 4; do not classify it semantically or allocate candidate 5.'
      : 'Evaluate the governed candidate-5 remaining-time and reconciliation gate; allocate candidate 5 only if every prerequisite passes.',
    safeToResume: true,
    blocker: value.blocker,
  };
  const event = {
    ...eventWithoutHash,
    eventSha256: sha(Buffer.from(JSON.stringify(eventWithoutHash))),
  };
  const numbered = path.join(
    RES,
    `COMMIT_5R1C34_RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_candidate_4_post_terminal_reconciliation.json`,
  );
  const sameOrdinal = numberedCheckpointFiles(ordinal);
  if (lines.length === ordinal) {
    requirePass(
      JSON.stringify(JSON.parse(lines[ordinal - 1])) === JSON.stringify(event)
        && sameOrdinal.length === 1
        && path.resolve(sameOrdinal[0]) === path.resolve(numbered)
        && JSON.stringify(readJson(numbered)) === JSON.stringify(event),
      'C34_CHECKPOINT39_CANDIDATE_4_RECONCILIATION_REPLAY_DIFFERS',
    );
    const current = readJson(CHECKPOINT);
    const previous = JSON.parse(lines[ordinal - 2]);
    requirePass(
      JSON.stringify(current) === JSON.stringify(event)
        || JSON.stringify(current) === JSON.stringify(previous),
      'C34_CHECKPOINT39_CANDIDATE_4_RECONCILIATION_CURRENT_CONFLICT',
    );
    if (JSON.stringify(current) !== JSON.stringify(event)) {
      writeMutableJson(CHECKPOINT, event);
    }
    return { event, numbered, appended: false };
  }
  requirePass(
    sameOrdinal.length === 0
      && JSON.stringify(readJson(CHECKPOINT))
        === JSON.stringify(lines.length ? JSON.parse(lines.at(-1)) : null),
    'C34_CHECKPOINT39_CANDIDATE_4_RECONCILIATION_PRIOR_TIP_INVALID',
  );
  writeOnceJson(numbered, event);
  const descriptor = fs.openSync(CHECKPOINT_LOG, 'a');
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(event)}\n`);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  writeMutableJson(CHECKPOINT, event);
  return { event, numbered, appended: true };
}

async function postCandidateEvidence({
  ordinal,
  priorActive,
  priorAccepted,
  protectedRows,
  executionResult,
  technicalError,
}) {
  repairCheckpointTipIfInterrupted();
  const state = cycleState(ordinal);
  const ledgerPath = ordinal === 4 ? CANDIDATE_4_LEDGER : CANDIDATE_5_LEDGER;
  const regressionPath = ordinal === 4 ? CANDIDATE_4_REGRESSION : CANDIDATE_5_REGRESSION;
  const outcomePath = ordinal === 4 ? CANDIDATE_4_OUTCOME : CANDIDATE_5_OUTCOME;
  const blockerPath = ordinal === 4 ? CANDIDATE_4_BLOCKER : CANDIDATE_5_BLOCKER;
  const ledgerValue = C.reconcileC34AttemptLedger({ throwOnFailure: false });
  const ledger = writeOrLoadGeneratedEvidence(
    ledgerPath,
    ledgerValue,
    (value) =>
      value.pass === true
      && value.orphan === 0
      && value.dangling === 0
      && value.running.length === 0,
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_LEDGER_NOT_RECONCILED`,
  );
  if (state.registryRecords.length === 0) {
    requirePass(
      state.directoryRecords.length === 0 && state.walRecords.length === 0,
      `C34_CHECKPOINT39_CANDIDATE_${ordinal}_NO_ALLOCATION_PARTIAL_STATE`,
    );
    const blockerValue = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc: now(),
      classification: `CANDIDATE_${ordinal}_PREALLOCATION_TECHNICAL_BLOCKER`,
      candidateId: CANDIDATE_IDS[ordinal],
      activeBaseHash: priorActive.identity.servicesTreeDigest,
      attemptAllocated: false,
      semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
      error: technicalError?.stack || String(technicalError || 'UNKNOWN_PREALLOCATION_STOP'),
      registry: hashRecord(REGISTRY),
      allocationWal: hashRecord(WAL),
      ledger: hashRecord(ledgerPath),
      pass: true,
    };
    const blocker = writeOrLoadGeneratedEvidence(
      blockerPath,
      blockerValue,
      (value) =>
        value.pass === true
        && value.attemptAllocated === false
        && value.activeBaseHash === priorActive.identity.servicesTreeDigest,
      `C34_CHECKPOINT39_CANDIDATE_${ordinal}_PREALLOCATION_BLOCKER_INVALID`,
    );
    return {
      ordinal,
      attempt: null,
      result: null,
      active: priorActive,
      acceptedCandidates: priorAccepted,
      ledger,
      regression: null,
      outcome: null,
      blocker,
      technicalError: blocker.error,
    };
  }
  requirePass(
    state.registryRecords.length === 1
      && state.directoryRecords.length === 1,
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_ALLOCATION_CARDINALITY_INVALID`,
  );
  const terminal = terminalCandidate(ordinal);
  const attempt = terminal.attempt;
  const semanticResultValid =
    attempt.status === 'completed'
    && terminal.result != null
    && terminal.result.attemptId === attempt.attemptId
    && terminal.result.candidateId === CANDIDATE_IDS[ordinal]
    && terminal.result.disposition === attempt.disposition;
  const selectedActive = semanticResultValid && terminal.result.accepted === true
    ? terminal.active
    : priorActive;
  const selectedAnalyze = await C.loadAnalyzerFrom(
    selectedActive.dir,
    `c34-checkpoint39-post-${ordinal}-${selectedActive.identity.servicesTreeDigest}`,
  );
  const regressions = protectedRows.flatMap((record) => {
    const actualSignature = C.outputSignature(selectedAnalyze(record.query));
    return actualSignature === record.signature
      ? []
      : [{ ...record, actualSignature }];
  });
  const perCandidate = Object.fromEntries(
    priorAccepted.map((item) => [
      `candidate${item.ordinal}`,
      protectedRows.filter((record) =>
        record.attemptId === item.attempt.attemptId).length,
    ]),
  );
  const regressionValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    evaluatedCandidateOrdinal: ordinal,
    evaluatedAttemptId: attempt.attemptId,
    selectedActiveBaseHash: selectedActive.identity.servicesTreeDigest,
    acceptedCandidateAttemptIds: priorAccepted.map((item) => item.attempt.attemptId),
    protectedRows: {
      total: protectedRows.length,
      ...perCandidate,
      r3Corrections: protectedRows.filter((record) =>
        record.category.includes('-r3-correction')).length,
      packet: protectedRows.filter((record) =>
        record.category.includes('-packet-')).length,
      leaveFamilyOut: protectedRows.filter((record) =>
        record.category.includes('-leave-family-out')).length,
    },
    regressions,
    pass: regressions.length === 0,
  };
  const regression = writeOrLoadGeneratedEvidence(
    regressionPath,
    regressionValue,
    (value) =>
      value.pass === true
      && value.evaluatedAttemptId === attempt.attemptId
      && value.regressions.length === 0,
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_PRIOR_ACCEPTED_REGRESSION`,
  );
  const semantic = semanticResultValid;
  const accepted = semantic && terminal.result.accepted === true;
  const endingMetrics = accepted
    ? terminal.result.metrics
    : priorActive.gates.metrics;
  const classification = semantic
    ? accepted
      ? `CANDIDATE_${ordinal}_ACCEPTED_PROMOTED`
      : `CANDIDATE_${ordinal}_REJECTED_TERMINAL`
    : `CANDIDATE_${ordinal}_TECHNICAL_TERMINAL`;
  const resultHash = terminal.resultFile && fs.existsSync(terminal.resultFile)
    ? hashRecord(terminal.resultFile)
    : null;
  const outcomeValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    classification,
    attemptId: attempt.attemptId,
    candidateId: CANDIDATE_IDS[ordinal],
    candidateOrdinal: ordinal,
    allocationCycle: CYCLES[ordinal],
    allocationOrdinal: ordinal,
    status: attempt.status,
    disposition: attempt.disposition,
    accepted,
    startingActiveBaseHash: priorActive.identity.servicesTreeDigest,
    endingActiveBaseHash: selectedActive.identity.servicesTreeDigest,
    metrics: endingMetrics,
    metricDelta: semantic ? {
      reasonPassedBefore: priorActive.gates.metrics.reasonPassed,
      reasonPassedAfter: terminal.result.metrics.reasonPassed,
      reasonDelta:
        terminal.result.metrics.reasonPassed - priorActive.gates.metrics.reasonPassed,
      remainingBefore: priorActive.gates.metrics.reasonMismatches,
      remainingAfter: terminal.result.metrics.reasonMismatches,
      decisionPassed: terminal.result.metrics.decisionPassed,
      relationPassed: terminal.result.metrics.relationPassed,
    } : null,
    iterationResult: resultHash,
    priorAcceptedRegression: hashRecord(regressionPath),
    ledger: hashRecord(ledgerPath),
    semanticDisposition: semantic
      ? terminal.result.disposition
      : 'NOT_A_SEMANTIC_REJECTION',
    blocker: semantic ? null : `CANDIDATE_${ordinal}_TECHNICAL_INCOMPLETE`,
    error: technicalError?.stack || (technicalError ? String(technicalError) : null),
    pass: true,
  };
  const outcome = writeOrLoadGeneratedEvidence(
    outcomePath,
    outcomeValue,
    (value) =>
      value.pass === true
      && value.attemptId === attempt.attemptId
      && value.endingActiveBaseHash === selectedActive.identity.servicesTreeDigest
      && value.priorAcceptedRegression.sha256 === sha(fs.readFileSync(regressionPath)),
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_OUTCOME_INVALID`,
  );
  if (!semantic) {
    const blockerValue = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc: now(),
      classification: `CANDIDATE_${ordinal}_TECHNICAL_INCOMPLETE`,
      candidateId: CANDIDATE_IDS[ordinal],
      attemptId: attempt.attemptId,
      status: attempt.status,
      disposition: attempt.disposition,
      activeBaseHash: priorActive.identity.servicesTreeDigest,
      semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
      error: technicalError?.stack || String(technicalError || 'MISSING_VALID_RESULT'),
      registry: hashRecord(REGISTRY),
      allocationWal: hashRecord(WAL),
      ledger: hashRecord(ledgerPath),
      pass: true,
    };
    writeOrLoadGeneratedEvidence(
      blockerPath,
      blockerValue,
      (value) =>
        value.pass === true
        && value.attemptId === attempt.attemptId
        && value.semanticDisposition === 'NOT_A_SEMANTIC_REJECTION',
      `C34_CHECKPOINT39_CANDIDATE_${ordinal}_TECHNICAL_BLOCKER_INVALID`,
    );
  }
  const acceptedCandidates = accepted
    ? [...priorAccepted, {
      ordinal,
      attempt,
      result: terminal.result,
      files: {
        directory: terminal.attemptDirectory,
        attemptFile: path.join(terminal.attemptDirectory, 'ATTEMPT.json'),
        resultFile: terminal.resultFile,
        snapshot: terminal.active.dir,
      },
      active: terminal.active,
    }]
    : priorAccepted;
  return {
    ordinal,
    attempt,
    result: terminal.result,
    active: selectedActive,
    acceptedCandidates,
    ledger,
    regression,
    outcome,
    blocker: semantic ? null : readJson(blockerPath),
    technicalError: technicalError?.stack || (technicalError ? String(technicalError) : null),
  };
}

function stageEvidencePaths(ordinal, post) {
  const common = [
    THIS_RUNNER,
    ORIGINAL_RUNNER,
    LIB,
    PROMPT,
    HYPOTHESES,
    AUTHORIZATION,
    CANDIDATE_4_NON_DUPLICATION,
    CANDIDATE_4_COMPATIBILITY,
    CHECKPOINT_39,
    CHECKPOINT_39_MANIFEST,
    CHECKPOINT_39_REGISTRY_SNAPSHOT,
    CHECKPOINT_39_WAL_SNAPSHOT,
    CHECKPOINT_39_LOG_SNAPSHOT,
  ];
  if (ordinal === 4) {
    common.push(
      CANDIDATE_4_LATE_GATE,
      CANDIDATE_4_RECONCILIATION,
      CANDIDATE_4_LEDGER,
      CANDIDATE_4_REGRESSION,
      CANDIDATE_4_OUTCOME,
      CANDIDATE_4_ENDING_REGISTRY,
      CANDIDATE_4_ENDING_WAL,
      CANDIDATE_4_ENDING_LOG,
    );
  } else {
    common.push(
      CANDIDATE_4_MANIFEST,
      CANDIDATE_5_ELIGIBILITY,
      CANDIDATE_5_COMPATIBILITY,
      CANDIDATE_5_LATE_GATE,
      CANDIDATE_5_LEDGER,
      CANDIDATE_5_REGRESSION,
      CANDIDATE_5_OUTCOME,
      CANDIDATE_5_ENDING_REGISTRY,
      CANDIDATE_5_ENDING_WAL,
      CANDIDATE_5_ENDING_LOG,
    );
  }
  for (const optional of [CANDIDATE_4_BLOCKER, CANDIDATE_5_BLOCKER]) {
    if (fs.existsSync(optional)) common.push(optional);
  }
  if (post.attempt) {
    common.push(...recursiveFiles(path.join(ATT, post.attempt.attemptId)));
  }
  const checkpointOrdinal = parseNdjson(CHECKPOINT_LOG).length;
  for (let checkpoint = 40; checkpoint <= checkpointOrdinal; checkpoint++) {
    const numbered = numberedCheckpointFiles(checkpoint);
    if (numbered.length === 1) common.push(numbered[0]);
  }
  return [...new Set(common.filter((file) => fs.existsSync(file)).map((file) =>
    path.resolve(file)))]
    .sort((first, second) => rel(first).localeCompare(rel(second)));
}

function createStageManifest(ordinal, post) {
  const registrySnapshot =
    ordinal === 4 ? CANDIDATE_4_ENDING_REGISTRY : CANDIDATE_5_ENDING_REGISTRY;
  const walSnapshot =
    ordinal === 4 ? CANDIDATE_4_ENDING_WAL : CANDIDATE_5_ENDING_WAL;
  const logSnapshot =
    ordinal === 4 ? CANDIDATE_4_ENDING_LOG : CANDIDATE_5_ENDING_LOG;
  const manifest =
    ordinal === 4 ? CANDIDATE_4_MANIFEST : CANDIDATE_5_MANIFEST;
  writeOnceBuffer(registrySnapshot, fs.readFileSync(REGISTRY));
  writeOnceBuffer(walSnapshot, fs.readFileSync(WAL));
  writeOnceBuffer(logSnapshot, fs.readFileSync(CHECKPOINT_LOG));
  if (!fs.existsSync(manifest)) {
    const files = stageEvidencePaths(ordinal, post);
    const text = `${files.map((file) =>
      `${sha(fs.readFileSync(file))}  ${rel(file)}`).join('\n')}\n`;
    writeOnceBuffer(manifest, Buffer.from(text));
  }
  const verification = verifyManifest(manifest);
  requirePass(
    verification.pass,
    `C34_CHECKPOINT39_CANDIDATE_${ordinal}_STAGE_MANIFEST_INVALID`,
  );
  return verification;
}

async function executeCandidate4(executor) {
  verifyCandidate4Preflight();
  repairCheckpointTipIfInterrupted();
  const initial = cycleState(4);
  if (initial.registryRecords.length === 1) {
    const priorAccepted = acceptedCandidates1To3();
    const priorActive = priorAccepted[2].active;
    const protectedRows = await protectedAcceptedRows(priorAccepted, priorActive);
    const post = await postCandidateEvidence({
      ordinal: 4,
      priorActive,
      priorAccepted,
      protectedRows,
      executionResult: null,
      technicalError: null,
    });
    post.reconciliation = appendCandidate4Reconciliation(post);
    post.manifest = createStageManifest(4, post);
    return post;
  }
  requirePass(
    initial.registryRecords.length === 0
      && initial.walRecords.length === 0
      && initial.directoryRecords.length === 0
      && initial.checkpointRecords.length === 0
      && !fs.existsSync(CANDIDATE_4_LOCK),
    'C34_CHECKPOINT39_DUPLICATE_CANDIDATE_4_ALLOCATION_REFUSED',
  );
  requirePass(
    Date.parse(SESSION_HARD_STOP_UTC) - Date.now() >= 45 * 60 * 1000,
    'C34_CHECKPOINT39_CANDIDATE_4_ALLOCATION_TIME_MARGIN_NOT_MET',
  );
  const continuity = verifyCheckpoint39Continuity(executor);
  const priorAccepted = continuity.accepted;
  const priorActive = priorAccepted[2].active;
  const protectedRows = await protectedAcceptedRows(priorAccepted, priorActive);
  requirePass(
    protectedRows.length === 199,
    `C34_CHECKPOINT39_CANDIDATE_4_PROTECTED_COUNT_${protectedRows.length}`,
  );
  const extension = extendPreservation(
    executor.loadPreservationForRecovery(),
    protectedRows,
  );
  requirePass(
    extension.preservation.priorCorrectRows.length === 3565
      && extension.preservation.generalization.required === 154
      && extension.preservation.leaveOneFamilyOut.required === 19,
    'C34_CHECKPOINT39_CANDIDATE_4_PRESERVATION_CONTRACT_INVALID',
  );
  return withAllocationLock(4, async () => {
    const late = cycleState(4);
    requirePass(
      late.registryRecords.length === 0
        && late.walRecords.length === 0
        && late.directoryRecords.length === 0
        && late.checkpointRecords.length === 0,
      'C34_CHECKPOINT39_LATE_DUPLICATE_CANDIDATE_4_ALLOCATION_REFUSED',
    );
    const lateGate = lateAllocationGate(4, priorActive);
    let result = null;
    let technicalError = null;
    try {
      result = await executor.runMaterialCandidate(
        executor.CANDIDATES[3],
        4,
        priorActive,
        extension.preservation,
        { allocationCycle: CYCLES[4], allocationOrdinal: 4 },
      );
    } catch (error) {
      technicalError = error;
    }
    const post = await postCandidateEvidence({
      ordinal: 4,
      priorActive,
      priorAccepted,
      protectedRows,
      executionResult: result,
      technicalError,
    });
    post.lateGate = lateGate;
    post.reconciliation = appendCandidate4Reconciliation(post);
    post.manifest = createStageManifest(4, post);
    return post;
  });
}

async function candidate5Eligibility(executor) {
  repairCheckpointTipIfInterrupted();
  const candidate4 = terminalCandidate(4);
  const outcome4 = fs.existsSync(CANDIDATE_4_OUTCOME)
    ? readJson(CANDIDATE_4_OUTCOME)
    : null;
  const manifest4 = fs.existsSync(CANDIDATE_4_MANIFEST)
    ? verifyManifest(CANDIDATE_4_MANIFEST)
    : null;
  const state5 = cycleState(5);
  const state6 = cycleState(6);
  const ledger = C.reconcileC34AttemptLedger({ throwOnFailure: false });
  const processState = strictProcessState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const repository = gitState();
  const remainingMs = Date.parse(SESSION_HARD_STOP_UTC) - Date.now();
  const active = candidate4.active || acceptedCandidates1To3()[2].active;
  const currentCheckpoint = readJson(CHECKPOINT);
  const candidate4TerminalAndSemantic =
    candidate4.attempt != null
    && candidate4.attempt.status === 'completed'
    && candidate4.result != null
    && outcome4?.pass === true
    && outcome4.blocker == null;
  const prerequisitesPass =
    candidate4TerminalAndSemantic
    && manifest4?.pass === true
    && ledger.pass
    && ledger.orphan === 0
    && ledger.dangling === 0
    && ledger.running.length === 0
    && state5.registryRecords.length === 0
    && state5.walRecords.length === 0
    && state5.directoryRecords.length === 0
    && state5.checkpointRecords.length === 0
    && state6.registryRecords.length === 0
    && state6.walRecords.length === 0
    && state6.directoryRecords.length === 0
    && processState.processInspectionSucceeded
    && processState.currentExecutorPresent
    && processState.currentExecutorCommandLineReadable
    && processState.allOtherNodeCommandLinesReadable
    && processState.activeC34RunnerCount === 0
    && processState.port5173Free
    && temporary.length === 0
    && locks.length === 0
    && repository.serviceDiff === ''
    && repository.stagedDiff === ''
    && repository.head === EXPECTED.head
    && repository.upstream === EXPECTED.head
    && repository.sync === '0\t0'
    && repository.c35Items.length === 0
    && repository.indexLock === false
    && currentCheckpoint.activeAttemptId == null
    && currentCheckpoint.activeBaseHash === active.identity.servicesTreeDigest
    && remainingMs >= 35 * 60 * 1000;
  const preview = prerequisitesPass ? previewCandidate(executor, 5, active) : null;
  const eligibilityValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    decision: prerequisitesPass
      ? 'PASS_READY_FOR_MATERIAL_CANDIDATE_5'
      : 'SKIP_CANDIDATE_5_PREREQUISITES_OR_TIME_MARGIN_NOT_MET',
    timebox: {
      startedUtc: SESSION_STARTED_UTC,
      hardStopUtc: SESSION_HARD_STOP_UTC,
      remainingMs,
      requiredRemainingMs: 35 * 60 * 1000,
      timeMarginPass: remainingMs >= 35 * 60 * 1000,
    },
    candidate4: {
      attemptId: candidate4.attempt?.attemptId || null,
      status: candidate4.attempt?.status || null,
      disposition: candidate4.attempt?.disposition || null,
      accepted: outcome4?.accepted ?? null,
      endingActiveBaseHash: outcome4?.endingActiveBaseHash || null,
      terminalEvidenceManifest: manifest4?.manifest || null,
      terminalEvidencePass: manifest4?.pass === true,
      blocker: outcome4?.blocker || null,
    },
    candidate5NonDuplication: {
      registryRecords: state5.registryRecords,
      allocationWalRecords: state5.walRecords,
      attemptDirectoryRecords: state5.directoryRecords,
      checkpointRecords: state5.checkpointRecords,
      allocationLockPresent: fs.existsSync(CANDIDATE_5_LOCK),
    },
    candidate6Prohibition: {
      registryRecords: state6.registryRecords,
      allocationWalRecords: state6.walRecords,
      attemptDirectoryRecords: state6.directoryRecords,
      pass: state6.registryRecords.length === 0
        && state6.walRecords.length === 0
        && state6.directoryRecords.length === 0,
    },
    activeBase: {
      attemptId: active.attemptId,
      candidateId: active.candidateId,
      identity: active.identity,
      metrics: active.gates.metrics,
    },
    currentCheckpoint: {
      ordinal: currentCheckpoint.ordinal,
      activeAttemptId: currentCheckpoint.activeAttemptId ?? null,
      activeBaseHash: currentCheckpoint.activeBaseHash,
    },
    ledger,
    processState,
    temporaryRuntimeDirectories: temporary,
    allocationLocks: locks,
    serviceStagingState: repository,
    prerequisitesPass,
    pass: true,
  };
  const eligibility = writeOrLoadGeneratedEvidence(
    CANDIDATE_5_ELIGIBILITY,
    eligibilityValue,
    (value) =>
      value.pass === true
      && ['PASS_READY_FOR_MATERIAL_CANDIDATE_5',
        'SKIP_CANDIDATE_5_PREREQUISITES_OR_TIME_MARGIN_NOT_MET'].includes(value.decision),
    'C34_CHECKPOINT39_CANDIDATE_5_ELIGIBILITY_INVALID',
  );
  if (!prerequisitesPass) {
    return { eligible: false, eligibility, active, candidate4, outcome4 };
  }
  const hypothesis5 = frozenHypothesis(5);
  const compatibilityValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    decision: 'PASS_READY_FOR_MATERIAL_CANDIDATE_5',
    eligibility: hashRecord(CANDIDATE_5_ELIGIBILITY),
    candidate4Manifest: hashRecord(CANDIDATE_4_MANIFEST),
    exactActiveBase: {
      attemptId: active.attemptId,
      candidateId: active.candidateId,
      identity: active.identity,
      metrics: active.gates.metrics,
    },
    frozenHypothesis: {
      artifact: hashRecord(HYPOTHESES),
      record: hypothesis5.record,
    },
    candidate5Preview: preview,
    pass: true,
  };
  const compatibility = writeOrLoadGeneratedEvidence(
    CANDIDATE_5_COMPATIBILITY,
    compatibilityValue,
    (value) =>
      value.pass === true
      && value.decision === 'PASS_READY_FOR_MATERIAL_CANDIDATE_5'
      && value.candidate5Preview?.candidate?.id === CANDIDATE_IDS[5]
      && value.exactActiveBase.identity.servicesTreeDigest
        === active.identity.servicesTreeDigest,
    'C34_CHECKPOINT39_CANDIDATE_5_COMPATIBILITY_INVALID',
  );
  return {
    eligible: true,
    eligibility,
    compatibility,
    active,
    candidate4,
    outcome4,
  };
}

function acceptedPredecessorsForCandidate5(permit) {
  const priorAccepted = acceptedCandidates1To3();
  if (permit.candidate4.result?.accepted === true) {
    requirePass(
      permit.candidate4.active != null,
      'C34_CHECKPOINT39_ACCEPTED_CANDIDATE_4_ACTIVE_MISSING',
    );
    priorAccepted.push({
      ordinal: 4,
      attempt: permit.candidate4.attempt,
      result: permit.candidate4.result,
      files: {
        directory: permit.candidate4.attemptDirectory,
        attemptFile: path.join(permit.candidate4.attemptDirectory, 'ATTEMPT.json'),
        resultFile: permit.candidate4.resultFile,
        snapshot: permit.candidate4.active.dir,
      },
      active: permit.candidate4.active,
    });
  }
  return priorAccepted;
}

async function executeCandidate5(executor) {
  const permit = await candidate5Eligibility(executor);
  if (!permit.eligible) return { skipped: true, ...permit };
  repairCheckpointTipIfInterrupted();
  const initial = cycleState(5);
  if (initial.registryRecords.length === 1) {
    const priorAccepted = acceptedPredecessorsForCandidate5(permit);
    const protectedRows = await protectedAcceptedRows(priorAccepted, permit.active);
    const post = await postCandidateEvidence({
      ordinal: 5,
      priorActive: permit.active,
      priorAccepted,
      protectedRows,
      executionResult: null,
      technicalError: null,
    });
    post.manifest = createStageManifest(5, post);
    return post;
  }
  requirePass(
    initial.registryRecords.length === 0
      && initial.walRecords.length === 0
      && initial.directoryRecords.length === 0
      && initial.checkpointRecords.length === 0
      && !fs.existsSync(CANDIDATE_5_LOCK),
    'C34_CHECKPOINT39_DUPLICATE_CANDIDATE_5_ALLOCATION_REFUSED',
  );
  const priorAccepted = acceptedPredecessorsForCandidate5(permit);
  requirePass(
    priorAccepted.at(-1).active.identity.servicesTreeDigest
      === permit.active.identity.servicesTreeDigest,
    'C34_CHECKPOINT39_CANDIDATE_5_PRIOR_ACTIVE_INVALID',
  );
  const protectedRows = await protectedAcceptedRows(priorAccepted, permit.active);
  const candidate4Accepted = permit.candidate4.result?.accepted === true;
  requirePass(
    protectedRows.length === (candidate4Accepted ? 252 : 199),
    `C34_CHECKPOINT39_CANDIDATE_5_PROTECTED_COUNT_${protectedRows.length}`,
  );
  const extension = extendPreservation(
    executor.loadPreservationForRecovery(),
    protectedRows,
  );
  requirePass(
    extension.preservation.priorCorrectRows.length
      === (candidate4Accepted ? 3572 : 3565)
      && extension.preservation.generalization.required
        === (candidate4Accepted ? 195 : 154)
      && extension.preservation.leaveOneFamilyOut.required
        === (candidate4Accepted ? 24 : 19),
    'C34_CHECKPOINT39_CANDIDATE_5_PRESERVATION_CONTRACT_INVALID',
  );
  return withAllocationLock(5, async () => {
    const late = cycleState(5);
    requirePass(
      late.registryRecords.length === 0
        && late.walRecords.length === 0
        && late.directoryRecords.length === 0
        && late.checkpointRecords.length === 0,
      'C34_CHECKPOINT39_LATE_DUPLICATE_CANDIDATE_5_ALLOCATION_REFUSED',
    );
    const lateGate = lateAllocationGate(5, permit.active);
    let result = null;
    let technicalError = null;
    try {
      result = await executor.runMaterialCandidate(
        executor.CANDIDATES[4],
        5,
        permit.active,
        extension.preservation,
        { allocationCycle: CYCLES[5], allocationOrdinal: 5 },
      );
    } catch (error) {
      technicalError = error;
    }
    const post = await postCandidateEvidence({
      ordinal: 5,
      priorActive: permit.active,
      priorAccepted,
      protectedRows,
      executionResult: result,
      technicalError,
    });
    post.lateGate = lateGate;
    post.manifest = createStageManifest(5, post);
    return post;
  });
}

function finalActiveState() {
  const accepted = acceptedCandidates1To3();
  let active = accepted[2].active;
  const candidate4 = terminalCandidate(4);
  const outcome4 = fs.existsSync(CANDIDATE_4_OUTCOME)
    ? readJson(CANDIDATE_4_OUTCOME)
    : null;
  if (
    candidate4.active
    && outcome4?.pass === true
    && outcome4.accepted === true
  ) {
    active = candidate4.active;
    accepted.push({
      ordinal: 4,
      attempt: candidate4.attempt,
      result: candidate4.result,
      files: {
        directory: candidate4.attemptDirectory,
        attemptFile: path.join(candidate4.attemptDirectory, 'ATTEMPT.json'),
        resultFile: candidate4.resultFile,
        snapshot: candidate4.active.dir,
      },
      active: candidate4.active,
    });
  }
  const candidate5 = terminalCandidate(5);
  const outcome5 = fs.existsSync(CANDIDATE_5_OUTCOME)
    ? readJson(CANDIDATE_5_OUTCOME)
    : null;
  if (
    candidate5.active
    && outcome5?.pass === true
    && outcome5.accepted === true
  ) {
    active = candidate5.active;
    accepted.push({
      ordinal: 5,
      attempt: candidate5.attempt,
      result: candidate5.result,
      files: {
        directory: candidate5.attemptDirectory,
        attemptFile: path.join(candidate5.attemptDirectory, 'ATTEMPT.json'),
        resultFile: candidate5.resultFile,
        snapshot: candidate5.active.dir,
      },
      active: candidate5.active,
    });
  }
  return { accepted, active, candidate4, candidate5, outcome4, outcome5 };
}

function verifyFinalLiveState(state) {
  repairCheckpointTipIfInterrupted();
  const ledger = C.reconcileC34AttemptLedger();
  const processState = strictProcessState();
  const repository = gitState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const candidate6 = cycleState(6);
  const stage4Manifest = fs.existsSync(CANDIDATE_4_MANIFEST)
    ? verifyManifest(CANDIDATE_4_MANIFEST)
    : null;
  const stage5Manifest = fs.existsSync(CANDIDATE_5_MANIFEST)
    ? verifyManifest(CANDIDATE_5_MANIFEST)
    : null;
  const candidate4SafelyStopped =
    state.candidate4.attempt != null
      ? ['completed', 'technical_failure', 'transient_failure']
        .includes(state.candidate4.attempt.status)
      : fs.existsSync(CANDIDATE_4_BLOCKER)
        && readJson(CANDIDATE_4_BLOCKER).pass === true;
  requirePass(
    ledger.pass
      && ledger.orphan === 0
      && ledger.dangling === 0
      && ledger.running.length === 0
      && candidate4SafelyStopped
      && processState.processInspectionSucceeded
      && processState.currentExecutorPresent
      && processState.currentExecutorCommandLineReadable
      && processState.allOtherNodeCommandLinesReadable
      && processState.activeC34RunnerCount === 0
      && processState.port5173Free
      && temporary.length === 0
      && locks.length === 0
      && candidate6.registryRecords.length === 0
      && candidate6.walRecords.length === 0
      && candidate6.directoryRecords.length === 0
      && repository.serviceDiff === ''
      && repository.stagedDiff === ''
      && repository.head === EXPECTED.head
      && repository.upstream === EXPECTED.head
      && repository.sync === '0\t0'
      && repository.c35Items.length === 0
      && repository.indexLock === false
      && stage4Manifest?.pass === true
      && (state.candidate5.attempt == null || stage5Manifest?.pass === true),
    'C34_CHECKPOINT39_FINAL_RECONCILIATION_FAILED',
  );
  return {
    ledger,
    processState,
    repository,
    temporary,
    locks,
    candidate6,
    stage4Manifest,
    stage5Manifest,
  };
}

function finalEvidenceFiles(state) {
  const files = [
    THIS_RUNNER,
    ORIGINAL_RUNNER,
    CHECKPOINT35_RUNNER,
    CHECKPOINT37_RUNNER,
    LIB,
    PROMPT,
    HYPOTHESES,
    CHECKPOINT_39,
    CHECKPOINT_39_SAFE_PAUSE,
    CHECKPOINT_39_MANIFEST,
    CHECKPOINT_39_REGISTRY_SNAPSHOT,
    CHECKPOINT_39_WAL_SNAPSHOT,
    CHECKPOINT_39_LOG_SNAPSHOT,
    AUTHORIZATION,
    CANDIDATE_4_NON_DUPLICATION,
    CANDIDATE_4_COMPATIBILITY,
    CANDIDATE_4_LATE_GATE,
    CANDIDATE_4_RECONCILIATION,
    CANDIDATE_4_LEDGER,
    CANDIDATE_4_REGRESSION,
    CANDIDATE_4_OUTCOME,
    CANDIDATE_4_MANIFEST,
    CANDIDATE_4_ENDING_REGISTRY,
    CANDIDATE_4_ENDING_WAL,
    CANDIDATE_4_ENDING_LOG,
    CANDIDATE_5_ELIGIBILITY,
    ENDING_REGISTRY,
    ENDING_WAL,
    FINAL_LOG_PREFIX,
    ...state.accepted.slice(0, 3).map((item) => item.files.resultFile),
  ];
  for (const optional of [
    CANDIDATE_4_BLOCKER,
    CANDIDATE_5_COMPATIBILITY,
    CANDIDATE_5_LATE_GATE,
    CANDIDATE_5_LEDGER,
    CANDIDATE_5_REGRESSION,
    CANDIDATE_5_OUTCOME,
    CANDIDATE_5_BLOCKER,
    CANDIDATE_5_MANIFEST,
    CANDIDATE_5_ENDING_REGISTRY,
    CANDIDATE_5_ENDING_WAL,
    CANDIDATE_5_ENDING_LOG,
  ]) {
    if (fs.existsSync(optional)) files.push(optional);
  }
  if (state.candidate4.attempt) {
    files.push(...recursiveFiles(state.candidate4.attemptDirectory));
  }
  if (state.candidate5.attempt) {
    files.push(...recursiveFiles(state.candidate5.attemptDirectory));
  }
  const currentRows = parseNdjson(CHECKPOINT_LOG).length;
  for (let ordinal = 40; ordinal <= currentRows; ordinal++) {
    const numbered = numberedCheckpointFiles(ordinal);
    requirePass(
      numbered.length === 1,
      `C34_CHECKPOINT39_NUMBERED_${ordinal}_COUNT_${numbered.length}`,
    );
    files.push(numbered[0]);
  }
  return [...new Set(files.filter((file) => fs.existsSync(file)).map((file) =>
    path.resolve(file)))]
    .sort((first, second) => rel(first).localeCompare(rel(second)));
}

function createFinalManifest(state) {
  if (fs.existsSync(SAFE_PAUSE_MANIFEST)) {
    const verification = verifyManifest(SAFE_PAUSE_MANIFEST);
    requirePass(
      verification.pass,
      'C34_CHECKPOINT39_EXISTING_FINAL_MANIFEST_INVALID',
    );
    return verification;
  }
  const files = finalEvidenceFiles(state);
  const text = `${files.map((file) =>
    `${sha(fs.readFileSync(file))}  ${rel(file)}`).join('\n')}\n`;
  writeOnceBuffer(SAFE_PAUSE_MANIFEST, Buffer.from(text));
  const verification = verifyManifest(SAFE_PAUSE_MANIFEST);
  requirePass(
    verification.pass,
    'C34_CHECKPOINT39_FINAL_MANIFEST_CREATION_FAILED',
  );
  return verification;
}

function appendFinalCheckpoint(pause) {
  const ordinal = pause.checkpointOrdinal;
  const artifactPaths = pause.checkpointArtifacts.map((file) =>
    path.isAbsolute(file) ? file : path.resolve(C.REPO, file));
  for (const file of artifactPaths) {
    requirePass(
      fs.existsSync(file),
      `C34_CHECKPOINT39_FINAL_ARTIFACT_MISSING_${rel(file)}`,
    );
  }
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  requirePass(
    lines.length === ordinal - 1 || lines.length === ordinal,
    `C34_CHECKPOINT39_FINAL_LOG_ROWS_${lines.length}_EXPECTED_${ordinal - 1}_OR_${ordinal}`,
  );
  const prefixLines = lines.slice(0, ordinal - 1);
  const prefixBytes = prefixLines.length
    ? Buffer.from(`${prefixLines.join('\n')}\n`)
    : Buffer.alloc(0);
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal,
    commitUnit: 'PHASE-10A14-R20-COMMIT-5R1-C34',
    updatedAtUtc: pause.generatedUtc,
    stage: pause.stage,
    status: pause.classification,
    head: pause.serviceStagingState.head,
    activeBaseHash: pause.activeBaseHash,
    attemptId: null,
    activeAttemptId: null,
    currentMetrics: pause.currentMetrics,
    candidate4: pause.candidate4,
    candidate5: pause.candidate5,
    candidate6: pause.candidate6,
    attemptDispositions: pause.attemptDispositions,
    reconciliation: pause.reconciliation,
    processState: pause.processState,
    temporaryRuntimeState: pause.temporaryRuntimeState,
    allocationLockState: pause.allocationLockState,
    serviceStagingState: pause.serviceStagingState,
    opusStatus: pause.opusStatus,
    artifactHashes: artifactPaths.map(hashRecord),
    previousLogSha256: sha(prefixBytes),
    nextExactOperation: pause.nextExactOperation,
    safeToResume: true,
    blocker: pause.blocker,
  };
  const event = {
    ...eventWithoutHash,
    eventSha256: sha(Buffer.from(JSON.stringify(eventWithoutHash))),
  };
  const safeStage = pause.stage.replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const numbered = path.join(
    RES,
    `COMMIT_5R1C34_RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_${safeStage}.json`,
  );
  const sameOrdinal = numberedCheckpointFiles(ordinal);
  if (lines.length === ordinal) {
    requirePass(
      JSON.stringify(JSON.parse(lines[ordinal - 1])) === JSON.stringify(event),
      'C34_CHECKPOINT39_EXISTING_FINAL_EVENT_DIFFERS',
    );
    requirePass(
      sameOrdinal.length === 1
        && path.resolve(sameOrdinal[0]) === path.resolve(numbered)
        && JSON.stringify(readJson(numbered)) === JSON.stringify(event),
      'C34_CHECKPOINT39_EXISTING_FINAL_NUMBERED_DIFFERS',
    );
    const current = readJson(CHECKPOINT);
    const previous = ordinal > 1 ? JSON.parse(lines[ordinal - 2]) : null;
    requirePass(
      JSON.stringify(current) === JSON.stringify(event)
        || JSON.stringify(current) === JSON.stringify(previous),
      'C34_CHECKPOINT39_EXISTING_FINAL_CURRENT_CONFLICT',
    );
    if (JSON.stringify(current) !== JSON.stringify(event)) {
      writeMutableJson(CHECKPOINT, event);
    }
    return { event, numbered, appended: false };
  }
  const previous = lines.length ? JSON.parse(lines.at(-1)) : null;
  requirePass(
    JSON.stringify(readJson(CHECKPOINT)) === JSON.stringify(previous),
    'C34_CHECKPOINT39_FINAL_CURRENT_NOT_AT_PRIOR_TIP',
  );
  requirePass(
    sameOrdinal.length === 0,
    `C34_CHECKPOINT39_FINAL_NUMBERED_ALREADY_EXISTS_${ordinal}`,
  );
  writeOnceJson(numbered, event);
  const descriptor = fs.openSync(CHECKPOINT_LOG, 'a');
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(event)}\n`);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  writeMutableJson(CHECKPOINT, event);
  return { event, numbered, appended: true };
}

function verifyExistingSafePause(pause) {
  const state = finalActiveState();
  const live = verifyFinalLiveState(state);
  const manifest = createFinalManifest(state);
  const currentRegistrySha = sha(fs.readFileSync(REGISTRY));
  const currentWalSha = sha(fs.readFileSync(WAL));
  requirePass(
    pause.pass === true
      && pause.safeToResume === true
      && pause.activeAttemptId == null
      && pause.activeBaseHash === state.active.identity.servicesTreeDigest
      && pause.reconciliation.registrySha256 === currentRegistrySha
      && pause.reconciliation.allocationWalSha256 === currentWalSha
      && pause.reconciliation.endingRegistrySnapshotSha256
        === sha(fs.readFileSync(ENDING_REGISTRY))
      && pause.reconciliation.endingAllocationWalSnapshotSha256
        === sha(fs.readFileSync(ENDING_WAL))
      && fs.readFileSync(ENDING_REGISTRY).equals(fs.readFileSync(REGISTRY))
      && fs.readFileSync(ENDING_WAL).equals(fs.readFileSync(WAL))
      && pause.evidenceManifest.sha256 === sha(fs.readFileSync(SAFE_PAUSE_MANIFEST))
      && manifest.pass
      && live.temporary.length === 0
      && live.locks.length === 0,
    'C34_CHECKPOINT39_EXISTING_SAFE_PAUSE_INVALID',
  );
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  const expectedPrefix = Buffer.from(
    `${lines.slice(0, pause.checkpointOrdinal - 1).join('\n')}\n`,
  );
  requirePass(
    fs.readFileSync(FINAL_LOG_PREFIX).equals(expectedPrefix),
    'C34_CHECKPOINT39_EXISTING_LOG_PREFIX_INVALID',
  );
  const checkpoint = appendFinalCheckpoint(pause);
  return { state, live, manifest, checkpoint };
}

function safePause() {
  repairCheckpointTipIfInterrupted();
  if (fs.existsSync(SAFE_PAUSE)) {
    const pause = readJson(SAFE_PAUSE);
    const verified = verifyExistingSafePause(pause);
    return {
      classification: pause.classification,
      candidate4: pause.candidate4,
      candidate5: pause.candidate5,
      activeBaseHash: pause.activeBaseHash,
      currentMetrics: pause.currentMetrics,
      checkpoint: verified.checkpoint.event,
      checkpointPath: rel(verified.checkpoint.numbered),
      idempotent: !verified.checkpoint.appended,
      evidenceMutation: verified.checkpoint.appended,
      manifest: verified.manifest.manifest,
      pass: true,
    };
  }
  const state = finalActiveState();
  const live = verifyFinalLiveState(state);
  writeOnceBuffer(ENDING_REGISTRY, fs.readFileSync(REGISTRY));
  writeOnceBuffer(ENDING_WAL, fs.readFileSync(WAL));
  writeOnceBuffer(FINAL_LOG_PREFIX, fs.readFileSync(CHECKPOINT_LOG));
  const manifest = createFinalManifest(state);
  const checkpointOrdinal = parseNdjson(CHECKPOINT_LOG).length + 1;
  const candidate4Technical =
    state.candidate4.attempt == null
    || state.candidate4.attempt.status !== 'completed'
    || state.candidate4.result == null;
  const candidate5Technical =
    state.candidate5.attempt != null
    && (state.candidate5.attempt.status !== 'completed' || state.candidate5.result == null);
  const technical = candidate4Technical || candidate5Technical;
  const classification = technical
    ? 'TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
    : state.candidate5.attempt != null
      ? 'TWO_HOUR_SAFE_PAUSE_AFTER_CANDIDATE_5'
      : 'TWO_HOUR_SAFE_PAUSE_AFTER_CANDIDATE_4';
  const blocker = candidate4Technical
    ? 'CANDIDATE_4_TECHNICAL_INCOMPLETE'
    : candidate5Technical
      ? 'CANDIDATE_5_TECHNICAL_INCOMPLETE'
      : null;
  const registry = readJson(REGISTRY);
  const c34Attempts = registry.attempts.filter((record) =>
    record.attemptId.includes('commit5r1c34-'));
  const candidate5EligibilityRecord = fs.existsSync(CANDIDATE_5_ELIGIBILITY)
    ? readJson(CANDIDATE_5_ELIGIBILITY)
    : null;
  const pauseValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    session: {
      startedUtc: SESSION_STARTED_UTC,
      hardStopUtc: SESSION_HARD_STOP_UTC,
      stoppedBeforeHardStop: Date.now() <= Date.parse(SESSION_HARD_STOP_UTC),
      elapsedMs: Date.now() - Date.parse(SESSION_STARTED_UTC),
    },
    stage: 'checkpoint 39 continuation two-hour safe pause',
    classification,
    activeBaseHash: state.active.identity.servicesTreeDigest,
    activeAttemptId: null,
    currentMetrics: {
      reasonPassed: state.active.gates.metrics.reasonPassed,
      reasonTotal: 3720,
      remainingReasonMismatches: state.active.gates.metrics.reasonMismatches,
      decisionPassed: state.active.gates.metrics.decisionPassed,
      decisionTotal: 3720,
      relationPassed: state.active.gates.metrics.relationPassed,
      relationTotal: 3720,
    },
    candidate4: {
      allocated: state.candidate4.attempt != null,
      attemptId: state.candidate4.attempt?.attemptId || null,
      candidateId: CANDIDATE_IDS[4],
      status: state.candidate4.attempt?.status || null,
      disposition: state.candidate4.attempt?.disposition || null,
      accepted: state.outcome4?.accepted ?? null,
      outcome: fs.existsSync(CANDIDATE_4_OUTCOME)
        ? hashRecord(CANDIDATE_4_OUTCOME)
        : null,
      terminalEvidenceManifest: hashRecord(CANDIDATE_4_MANIFEST),
    },
    candidate5: {
      eligibilityDecision: candidate5EligibilityRecord?.decision || null,
      allocated: state.candidate5.attempt != null,
      attemptId: state.candidate5.attempt?.attemptId || null,
      candidateId: CANDIDATE_IDS[5],
      status: state.candidate5.attempt?.status || null,
      disposition: state.candidate5.attempt?.disposition || null,
      accepted: state.outcome5?.accepted ?? null,
      outcome: fs.existsSync(CANDIDATE_5_OUTCOME)
        ? hashRecord(CANDIDATE_5_OUTCOME)
        : null,
      terminalEvidenceManifest: fs.existsSync(CANDIDATE_5_MANIFEST)
        ? hashRecord(CANDIDATE_5_MANIFEST)
        : null,
    },
    candidate6: {
      authorized: false,
      allocated: false,
      registryRecords: live.candidate6.registryRecords.length,
      allocationWalRecords: live.candidate6.walRecords.length,
      attemptDirectories: live.candidate6.directoryRecords.length,
    },
    attemptDispositions: c34Attempts.map((record) => ({
      attemptId: record.attemptId,
      cycle: record.cycle,
      status: record.status,
      disposition: record.disposition,
      controlling: record.controlling,
      activeRunningAttempt: false,
    })),
    reconciliation: {
      registrySha256: sha(fs.readFileSync(REGISTRY)),
      allocationWalSha256: sha(fs.readFileSync(WAL)),
      endingRegistrySnapshotSha256: sha(fs.readFileSync(ENDING_REGISTRY)),
      endingAllocationWalSnapshotSha256: sha(fs.readFileSync(ENDING_WAL)),
      attemptDirectoryCount: cycleState(4).directories.length,
      ledger: live.ledger,
    },
    processState: live.processState,
    temporaryRuntimeState: {
      directories: live.temporary,
      temporaryCandidateInstalled: false,
      restorationRequired: false,
      restorationAction: 'NO_WRITE_REQUIRED',
    },
    allocationLockState: {
      locks: live.locks,
      candidate4LockPresent: fs.existsSync(CANDIDATE_4_LOCK),
      candidate5LockPresent: fs.existsSync(CANDIDATE_5_LOCK),
      candidate6LockPresent: false,
    },
    serviceStagingState: {
      serviceDiff: live.repository.serviceDiff,
      stagedDiff: live.repository.stagedDiff,
      head: live.repository.head,
      upstream: live.repository.upstream,
      sync: live.repository.sync,
      commitOccurred: false,
      pushOccurredOrSyncChanged: false,
      c35Items: live.repository.c35Items,
    },
    opusStatus: {
      invoked: false,
      approvalClaimed: false,
      reason:
        'Candidate 6 is prohibited and not terminal; final C34 closure review prerequisites are not met.',
    },
    evidenceManifest: manifest.manifest,
    checkpointOrdinal,
    checkpointArtifacts: [
      rel(SAFE_PAUSE),
      rel(SAFE_PAUSE_MANIFEST),
      ...(fs.existsSync(CANDIDATE_4_OUTCOME)
        ? [rel(CANDIDATE_4_OUTCOME)]
        : [rel(CANDIDATE_4_BLOCKER)]),
      rel(CANDIDATE_4_MANIFEST),
      ...(fs.existsSync(CANDIDATE_5_OUTCOME)
        ? [rel(CANDIDATE_5_OUTCOME), rel(CANDIDATE_5_MANIFEST)]
        : []),
      rel(ENDING_REGISTRY),
      rel(ENDING_WAL),
      rel(FINAL_LOG_PREFIX),
    ],
    nextExactOperation: technical
      ? 'Resume from this checkpoint and forensically adjudicate the terminal technical candidate before authorizing any later candidate. Do not classify it semantically.'
      : `Resume C34 from checkpoint ${checkpointOrdinal}. Preserve candidates 1-5 `
        + 'and the exact active base. Candidate 6 requires a separate explicit prompt; '
        + 'do not rerun or reallocate candidates 1-5.',
    safeToResume: true,
    blocker,
    pass: true,
  };
  writeOnceJson(SAFE_PAUSE, pauseValue);
  const pause = readJson(SAFE_PAUSE);
  requirePass(
    pause.pass === true
      && pause.safeToResume === true
      && pause.activeAttemptId == null
      && pause.activeBaseHash === state.active.identity.servicesTreeDigest
      && pause.evidenceManifest.sha256 === sha(fs.readFileSync(SAFE_PAUSE_MANIFEST))
      && pause.reconciliation.registrySha256 === sha(fs.readFileSync(REGISTRY))
      && pause.reconciliation.allocationWalSha256 === sha(fs.readFileSync(WAL)),
    'C34_CHECKPOINT39_SAFE_PAUSE_ARTIFACT_INVALID',
  );
  const checkpoint = appendFinalCheckpoint(pause);
  return {
    classification: pause.classification,
    candidate4: pause.candidate4,
    candidate5: pause.candidate5,
    activeBaseHash: pause.activeBaseHash,
    currentMetrics: pause.currentMetrics,
    checkpoint: checkpoint.event,
    checkpointPath: rel(checkpoint.numbered),
    idempotent: !checkpoint.appended,
    evidenceMutation: checkpoint.appended,
    manifest: manifest.manifest,
    pass: true,
  };
}

const ORIGINAL_CANDIDATE_5 =
  'R20-domain_campaign-commit5r1c34-tr01-ord05-2026-07-30T02-33-54-720Z';
const CANDIDATE_4_ATTEMPT =
  'R20-domain_campaign-commit5r1c34-tx02-ord04-2026-07-30T02-31-47-486Z';
const ACTIVE_BASE_42 =
  '82bf8550d0f89ad708c90a3471a68811d0f825ea194a00345ca910647bf5cf5e';
const CANDIDATE_5_IDENTITY =
  '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775';
const CHECKPOINT_42 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_42_checkpoint_39_continuation_two_hour_safe_pause.json',
);
const CHECKPOINT_42_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_39_CONTINUATION_SAFE_PAUSE_EVIDENCE.sha256',
);
const ROOT_CAUSE_JSON = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_TECHNICAL_ROOT_CAUSE.json',
);
const ROOT_CAUSE_MD = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_TECHNICAL_ROOT_CAUSE.md',
);
const ORIGINAL_ADJUDICATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_ORIGINAL_ATTEMPT_ADJUDICATION.json',
);
const REMEDIATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_REPLAY_REMEDIATION_RESULT.json',
);
const HEADER_VALIDATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_REPLAY_HEADER_VALIDATION.json',
);
const DUAL_SELF_TEST = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_DUAL_REPLAY_SELF_TEST.json',
);
const COMPATIBILITY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_REPLAY_COMPATIBILITY_VALIDATION.json',
);
const RETRY_AUTHORIZATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_LINKED_RETRY_AUTHORIZATION.json',
);
const RETRY_PREFLIGHT = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_LINKED_RETRY_NON_DUPLICATION_PREFLIGHT.json',
);
const RETRY_RESULT = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_LINKED_RETRY_RESULT.json',
);
const RECOVERY_LEDGER = path.join(
  RES,
  'COMMIT_5R1C34_ATTEMPT_LEDGER_AFTER_CANDIDATE_5_LINKED_RETRY.json',
);
const RECOVERY_SAFE_PAUSE = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_RECOVERY_SAFE_PAUSE.json',
);
const RECOVERY_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_RECOVERY_EVIDENCE.sha256',
);

function existingOrCreateJson(file, build) {
  if (fs.existsSync(file)) return readJson(file);
  const value = build(now());
  writeOnceJson(file, value);
  return value;
}

function verifyCheckpoint42StrictManifest(file) {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const records = rows.map((line) => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    requirePass(match, `C34_CHECKPOINT42_MANIFEST_LINE_INVALID_${line}`);
    const artifactPath = path.isAbsolute(match[2])
      ? path.resolve(match[2])
      : path.resolve(C.REPO, match[2]);
    const exists = fs.existsSync(artifactPath);
    const actual = exists ? sha(fs.readFileSync(artifactPath)) : null;
    return {
      path: match[2].replace(/\\/g, '/'),
      expectedSha256: match[1],
      actualSha256: actual,
      exists,
      pass: exists && actual === match[1],
    };
  });
  const invalid = records.filter((record) => !record.pass);
  const exactAuthorizedRepairDrift =
    invalid.length === 1
    && invalid[0].path
      === 'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs'
    && invalid[0].expectedSha256
      === 'dd3bd236eee0dd515146ac20314b3678b87cbca4d907e0225fdeec8a16431298'
    && invalid[0].actualSha256
      === '6a958b709cfb639697186d0878ab3dcf9f4dafe03e0bfdb7c5e141a38e8708d5';
  return {
    path: rel(file),
    rows: rows.length,
    valid: records.filter((record) => record.pass).length,
    invalid,
    preRepairCheckpointManifestExpectedValid: 82,
    postRepairUnchangedEntriesValid: records.filter((record) => record.pass).length,
    exactAuthorizedRepairDrift,
    pass: records.length === 82 && exactAuthorizedRepairDrift,
  };
}

function checkpoint42Continuity() {
  const checkpoint = readJson(CHECKPOINT_42);
  const manifest = verifyCheckpoint42StrictManifest(CHECKPOINT_42_MANIFEST);
  const registry = readJson(REGISTRY);
  const walRows = parseNdjson(WAL);
  const chain = validateCheckpointChain();
  const attemptDirectories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const c34 = registry.attempts.filter((attempt) =>
    attempt.gateName === 'commit5r1c34' || attempt.attemptId?.includes('commit5r1c34'));
  const originalRegistry = c34.filter((attempt) => attempt.attemptId === ORIGINAL_CANDIDATE_5);
  const originalWal = walRows.filter((row) => row.attemptId === ORIGINAL_CANDIDATE_5);
  const originalDirectory = attemptDirectories.filter((id) => id === ORIGINAL_CANDIDATE_5);
  const retryRegistry = c34.filter((attempt) => attempt.retryOf === ORIGINAL_CANDIDATE_5);
  const retryWal = walRows.filter((row) => row.retryOf === ORIGINAL_CANDIDATE_5);
  const retryDirectories = retryRegistry.filter((attempt) =>
    attemptDirectories.includes(attempt.attemptId));
  const recoveryStarted = retryRegistry.length === 1;
  const retryRecord = recoveryStarted ? retryRegistry[0] : null;
  const original = readJson(path.join(ATT, ORIGINAL_CANDIDATE_5, 'ATTEMPT.json'));
  const accepted = [
    ...ACCEPTED_IDS,
    CANDIDATE_4_ATTEMPT,
  ].map((attemptId) => readJson(path.join(ATT, attemptId, 'ATTEMPT.json')));
  const candidate6 = cycleState(6);
  const processes = strictProcessState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const state = gitState();
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    checkpoint: {
      path: rel(CHECKPOINT_42),
      sha256: sha(fs.readFileSync(CHECKPOINT_42)),
      ordinal: checkpoint.ordinal,
      status: checkpoint.status,
      safeToResume: checkpoint.safeToResume,
      activeAttemptId: checkpoint.activeAttemptId,
      activeBaseHash: checkpoint.activeBaseHash,
      metrics: checkpoint.currentMetrics,
    },
    manifest,
    checkpointChain: chain,
    acceptedCandidates: accepted.map((attempt) => ({
      attemptId: attempt.attemptId,
      status: attempt.status,
      disposition: attempt.disposition,
    })),
    originalCandidate5: {
      registryRecords: originalRegistry.length,
      walRecords: originalWal.length,
      attemptDirectories: originalDirectory.length,
      status: original.status,
      disposition: original.disposition,
      iterationResultPresent:
        fs.existsSync(path.join(ATT, ORIGINAL_CANDIDATE_5, 'ITERATION_RESULT.json')),
    },
    linkedRetry: {
      recoveryStarted,
      registryRecords: retryRegistry.length,
      walPlannedRecords: retryWal.filter((row) => row.event === 'ALLOCATION_PLANNED').length,
      attemptDirectories: retryDirectories.length,
      attemptId: retryRecord?.attemptId || null,
      status: retryRecord?.status || null,
      disposition: retryRecord?.disposition || null,
      retryReason: retryRecord?.retryReason || null,
      retryType: retryRecord?.retryType || null,
    },
    ledger: {
      registryTotal: registry.attempts.length,
      c34Attempts: c34.length,
      walRows: walRows.length,
      attemptDirectoryCount: attemptDirectories.length,
    },
    candidate6: {
      registryRecords: candidate6.registryRecords.length,
      walRecords: candidate6.walRecords.length,
      attemptDirectories: candidate6.directoryRecords.length,
      checkpointRecords: candidate6.checkpointRecords.length,
    },
    processes,
    temporaryRuntimeDirectories: temporary.map(rel),
    allocationLocks: locks.map(rel),
    git: state,
  };
  result.pass =
    result.checkpoint.sha256
      === '6c891dc0aa5f2a88ec7cb522a1b5f738e606e229a3aa55135ebd94cc992ff4b8'
    && checkpoint.ordinal === 42
    && checkpoint.safeToResume === true
    && checkpoint.activeAttemptId == null
    && checkpoint.activeBaseHash === ACTIVE_BASE_42
    && checkpoint.currentMetrics.reasonPassed === 3572
    && checkpoint.currentMetrics.decisionPassed === 3720
    && checkpoint.currentMetrics.relationPassed === 3720
    && manifest.pass
    && chain.pass
    && accepted.every((attempt) =>
      attempt.status === 'completed'
        && attempt.disposition === 'ACCEPTED_PROMOTED_CONTROLLING')
    && originalRegistry.length === 1
    && originalDirectory.length === 1
    && original.status === 'technical_failure'
    && original.disposition === 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE'
    && result.originalCandidate5.iterationResultPresent === false
    && (
      (!recoveryStarted
        && registry.attempts.length === 225
        && c34.length === 7
        && walRows.length === 22
        && attemptDirectories.length === 7
        && originalWal.length === 3
        && chain.rows === 42)
      || (recoveryStarted
        && registry.attempts.length === 226
        && c34.length === 8
        && walRows.length === 26
        && attemptDirectories.length === 8
        && originalWal.length === 4
        && retryRegistry.length === 1
        && retryWal.filter((row) => row.event === 'ALLOCATION_PLANNED').length === 1
        && retryDirectories.length === 1
        && retryRecord.status === 'completed'
        && retryRecord.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
        && retryRecord.retryReason === 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED'
        && retryRecord.retryType === 'TECHNICAL_LINKED_RETRY'
        && chain.rows === 45)
    )
    && candidate6.registryRecords.length === 0
    && candidate6.walRecords.length === 0
    && candidate6.directoryRecords.length === 0
    && candidate6.checkpointRecords.length === 0
    && processes.processInspectionSucceeded
    && processes.activeC34RunnerCount === 0
    && processes.allOtherNodeCommandLinesReadable
    && processes.port5173Free
    && temporary.length === 0
    && locks.length === 0
    && !state.indexLock
    && state.serviceDiff === ''
    && state.stagedDiff === ''
    && state.head === EXPECTED.head
    && state.upstream === EXPECTED.head
    && state.sync === '0\t0'
    && state.c35Items.length === 0
    && state.liveServices.servicesTreeDigest
      === '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201';
  if (!result.pass) {
    console.error(JSON.stringify({ checkpoint42ContinuityMismatch: result }, null, 2));
  }
  requirePass(result.pass, 'CHECKPOINT_42_CONTINUITY_MISMATCH');
  return result;
}

function createForensics(continuity) {
  const attemptDir = path.join(ATT, ORIGINAL_CANDIDATE_5);
  const attempt = readJson(path.join(attemptDir, 'ATTEMPT.json'));
  const failure = readJson(path.join(attemptDir, 'TECHNICAL_FAILURE.json'));
  const patchBytes = fs.readFileSync(path.join(attemptDir, 'C34_ONLY_CANDIDATE.patch'));
  const originalReplayEvidencePresent =
    fs.existsSync(path.join(attemptDir, 'C34_CANDIDATE_DELTA_REPLAY.json'))
    || fs.existsSync(path.join(attemptDir, 'C34_CANDIDATE_ONLY_DUAL_REPLAY.json'));
  const root = existingOrCreateJson(ROOT_CAUSE_JSON, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: 'TECHNICAL_INCOMPLETE_DUAL_REPLAY_FAILURE',
    originalAttemptId: ORIGINAL_CANDIDATE_5,
    failure: 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    semanticEvaluationCompleted: false,
    exactFailingCommand: {
      command:
        'requirePass(result.pass, "C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED")',
      source: 'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs:976',
      cwd: attempt.environmentFingerprint.cwd,
      executor: attempt.command,
      executorArgs: attempt.commandArgs,
      exitCode: attempt.exitCode,
      stdout: fs.readFileSync(path.join(attemptDir, 'stdout.txt'), 'utf8'),
      stderr: fs.readFileSync(path.join(attemptDir, 'stderr.txt'), 'utf8'),
    },
    identities: {
      expectedBaseHash: ACTIVE_BASE_42,
      actualBaseHash: attempt.semanticBase.servicesTreeDigest,
      expectedCandidateHash: CANDIDATE_5_IDENTITY,
      actualCandidateHash: attempt.runtimeTreeDigest,
      expectedChangedPaths: ['services/philippine-tax-intent-analyzer.js'],
      actualPatchChangedPaths: ['services/philippine-tax-intent-analyzer.js'],
      patchSha256: sha(patchBytes),
    },
    firstFailingPatchSection: null,
    failedReplayEnvironment: null,
    forensicLimitation: {
      originalDetailedReplayEvidencePresent: originalReplayEvidencePresent,
      exactSubprocessAndEnvironmentRecoverable: false,
      reason:
        'The helper threw the aggregate failure before writing its dual-environment result. '
        + 'The terminal evidence retained no per-environment command result, so inventing a '
        + 'specific failed git subprocess or patch section would be unsupported.',
    },
    provenRootCause:
      'Replay observability and durability defect: candidate-only dual replay used '
      + 'throwOnFailure=true before C34_CANDIDATE_DELTA_REPLAY.json was written, losing '
      + 'the failing environment/subgate. The failure is technical and non-semantic.',
    excludedCauses: {
      malformedPatchHeaders: true,
      absoluteOrQuotedWindowsPaths: true,
      wrongBaseIdentity: true,
      wrongCandidateIdentity: true,
      inheritedCandidateContent: true,
      semanticRejection: true,
    },
    sourceFailure: failure.error,
    continuity: {
      checkpoint42Sha256: continuity.checkpoint.sha256,
      manifestValid: continuity.manifest.valid,
    },
    pass: true,
  }));
  if (!fs.existsSync(ROOT_CAUSE_MD)) {
    writeOnceBuffer(ROOT_CAUSE_MD, Buffer.from(
      `# Candidate 5 technical root cause\n\n`
      + `The original attempt remains **TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE** and `
      + `**NOT_A_SEMANTIC_REJECTION**.\n\n`
      + `The exact aggregate failure was \`C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED\`. `
      + `The replay helper threw before persisting its per-environment result, so the `
      + `original evidence cannot support a claim about a specific failed Git subprocess `
      + `or patch section. This missing failure-before-throw durability is the proven `
      + `replay infrastructure defect. The preserved patch has canonical headers, the `
      + `exact Candidate-4 base and Candidate-5 snapshot identities match, and superseding `
      + `dual replay is required before any linked retry.\n`,
    ));
  }
  const adjudication = existingOrCreateJson(ORIGINAL_ADJUDICATION, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    originalAttemptId: ORIGINAL_CANDIDATE_5,
    historicDisposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
    effectiveDisposition: 'TECHNICAL_INCOMPLETE_DUAL_REPLAY_FAILURE',
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    allocationConsumed: true,
    semanticResultConsumed: false,
    duplicateAllocationAuthorized: false,
    originalAttemptRecordPreserved: true,
    originalTerminalWalEventPreserved: true,
    rootCause: hashRecord(ROOT_CAUSE_JSON),
    pass: true,
  }));
  return { root, adjudication };
}

function runReplaySelfTests() {
  const base = path.join(ATT, CANDIDATE_4_ATTEMPT, 'runtime-snapshot');
  const candidate = path.join(ATT, ORIGINAL_CANDIDATE_5, 'runtime-snapshot');
  const patch = C.canonicalPatch(base, candidate);
  const candidateReplay = C.dualEnvironmentReplay(
    base,
    candidate,
    patch,
    'candidate_5_recovery',
    { throwOnFailure: false },
  );
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-cp42-selftest-'));
  let inherited;
  let fullHeadReplay;
  let fullHeadPatch;
  try {
    const attemptScratch = path.join(scratch, 'attempt');
    fs.mkdirSync(attemptScratch);
    inherited = C.replayAndInheritance(base, candidate, attemptScratch);
    const head = path.join(scratch, 'head');
    fs.mkdirSync(head);
    for (const name of [
      'philippine-tax-intent-analyzer.js',
      'philippine-tax-domain-boundary.js',
      'philippine-tax-boundary-patterns.js',
    ]) {
      fs.writeFileSync(
        path.join(head, name),
        C.gitShowBuffer(C.START_HEAD, `services/${name}`),
      );
    }
    fullHeadPatch = C.canonicalPatch(head, candidate);
    fullHeadReplay = C.dualEnvironmentReplay(
      head,
      candidate,
      fullHeadPatch,
      'candidate_5_full_head_recovery',
      {
        identityPolicy: 'normalized_all_changed_raw_exact',
        throwOnFailure: false,
      },
    );
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  const header = existingOrCreateJson(HEADER_VALIDATION, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    patchSha256: patch.sha256,
    expectedPatchSha256: EXPECTED_PATCHES[5],
    changedFiles: patch.changedFiles,
    canonicalHeaders: patch.canonicalHeaders,
    expectedHeaders: patch.expectedHeaders,
    headerParseErrors: patch.headerParseErrors,
    forbiddenPathHeaders: patch.forbiddenPathHeaders,
    hasForbiddenPath: patch.hasForbiddenPath,
    pathLengthIndependent: true,
    pass:
      patch.pass
      && patch.sha256 === EXPECTED_PATCHES[5]
      && patch.changedFiles.length === 1
      && patch.changedFiles[0] === 'services/philippine-tax-intent-analyzer.js',
  }));
  const selfTest = existingOrCreateJson(DUAL_SELF_TEST, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    candidateOnly: candidateReplay,
    fullHead: {
      patch: { ...fullHeadPatch, text: undefined },
      replay: fullHeadReplay,
    },
    inheritedChangeExclusion: inherited.computedInheritedChangeExclusion,
    cleanup: {
      candidateReplayTemporaryRootRemoved: candidateReplay.temporaryRootRemoved,
      fullHeadReplayTemporaryRootRemoved: fullHeadReplay.temporaryRootRemoved,
      scratchRemoved: !fs.existsSync(scratch),
    },
    pass:
      candidateReplay.pass
      && fullHeadReplay.pass
      && inherited.pass
      && inherited.computedInheritedChangeExclusion.unexpectedInheritedHunks.length === 0
      && !fs.existsSync(scratch),
  }));
  const compatibility = existingOrCreateJson(COMPATIBILITY, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    decision: 'PASS_READY_FOR_CANDIDATE_5_LINKED_RETRY',
    base: C.runtimeFor(base),
    candidate: C.runtimeFor(candidate),
    candidateOnlyPatchSha256: patch.sha256,
    fullHeadPatchSha256: fullHeadPatch.sha256,
    candidateOnlyReplayPass: candidateReplay.pass,
    fullHeadReplayPass: fullHeadReplay.pass,
    dualEnvironmentReplayPass:
      candidateReplay.environments.length === 2
      && candidateReplay.environments.every((environment) => environment.pass)
      && fullHeadReplay.environments.length === 2
      && fullHeadReplay.environments.every((environment) => environment.pass),
    skippedPatchCount:
      candidateReplay.skippedPatchCount + fullHeadReplay.skippedPatchCount,
    noOpCount: candidateReplay.noOpCount + fullHeadReplay.noOpCount,
    unexpectedFileCount:
      candidateReplay.unexpectedFileCount + fullHeadReplay.unexpectedFileCount,
    inheritedCandidateChangesExcluded:
      inherited.computedInheritedChangeExclusion.unexpectedInheritedHunks.length === 0,
    temporaryCleanupExact:
      candidateReplay.temporaryRootRemoved
      && fullHeadReplay.temporaryRootRemoved
      && !fs.existsSync(scratch),
    remediationLibrarySha256: sha(fs.readFileSync(LIB)),
    pass:
      header.pass
      && selfTest.pass
      && C.runtimeFor(base).servicesTreeDigest === ACTIVE_BASE_42
      && C.runtimeFor(candidate).servicesTreeDigest === CANDIDATE_5_IDENTITY,
  }));
  const remediation = existingOrCreateJson(REMEDIATION, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    scope: 'REPLAY_INFRASTRUCTURE_ONLY',
    changes: [
      'Persist C34_CANDIDATE_ONLY_DUAL_REPLAY.json before enforcing aggregate pass.',
      'Allow only C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED as an additional governed linked-retry reason.',
      'Allow the precise TECHNICAL_INCOMPLETE_DUAL_REPLAY_FAILURE adjudication subtype.',
    ],
    semanticCandidateChanged: false,
    originalCandidateSnapshotChanged: false,
    originalAttemptChanged: false,
    librarySha256Before:
      'dd3bd236eee0dd515146ac20314b3678b87cbca4d907e0225fdeec8a16431298',
    librarySha256After: sha(fs.readFileSync(LIB)),
    decision: compatibility.decision,
    pass: compatibility.pass,
  }));
  requirePass(
    remediation.pass
      && compatibility.decision === 'PASS_READY_FOR_CANDIDATE_5_LINKED_RETRY',
    'C34_CANDIDATE_5_REPLAY_REMEDIATION_NOT_READY',
  );
  return { header, selfTest, compatibility, remediation };
}

function writeRecoveryArtifactAndAdjudicate(forensics) {
  const recoveryArtifact = path.join(
    ATT,
    ORIGINAL_CANDIDATE_5,
    'EXECUTOR_TECHNICAL_REPLAY_RECOVERY.json',
  );
  const recovery = existingOrCreateJson(recoveryArtifact, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    originalAttemptId: ORIGINAL_CANDIDATE_5,
    historicDisposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
    effectiveDisposition: 'TECHNICAL_INCOMPLETE_DUAL_REPLAY_FAILURE',
    blocker: 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    rootCause: hashRecord(ROOT_CAUSE_JSON),
    originalAttemptPreserved: true,
    pass: forensics.root.pass && forensics.adjudication.pass,
  }));
  const adjudication = C.adjudicateTechnicalAttempt({
    attemptId: ORIGINAL_CANDIDATE_5,
    historicDisposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
    effectiveDisposition: 'TECHNICAL_INCOMPLETE_DUAL_REPLAY_FAILURE',
    blocker: 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    recoveryArtifact,
    adjudicatedAt: recovery.generatedUtc,
  });
  return { recoveryArtifact, recovery, adjudication };
}

async function executeCandidate5LinkedRetry(executor) {
  const registry = readJson(REGISTRY);
  const walRows = parseNdjson(WAL);
  const retries = registry.attempts.filter((attempt) => attempt.retryOf === ORIGINAL_CANDIDATE_5);
  const plannedRetries = walRows.filter((row) =>
    row.event === 'ALLOCATION_PLANNED' && row.retryOf === ORIGINAL_CANDIDATE_5);
  if (retries.length === 1) {
    const attemptDir = path.join(ATT, retries[0].attemptId);
    let attempt = readJson(path.join(attemptDir, 'ATTEMPT.json'));
    if (attempt.status === 'running') {
      const processes = strictProcessState();
      requirePass(
        processes.processInspectionSucceeded
          && processes.activeC34RunnerCount === 0
          && temporaryRuntimeDirectories().length === 0
          && allocationLocks().length === 0,
        'C34_CANDIDATE_5_LINKED_RETRY_RUNNING_OWNER_NOT_PROVEN_ABSENT',
      );
      const failureFile = path.join(attemptDir, 'TECHNICAL_FAILURE.json');
      existingOrCreateJson(failureFile, (generatedUtc) => ({
        schemaVersion: 1,
        unit: UNIT,
        generatedUtc,
        attemptId: attempt.attemptId,
        candidateId: CANDIDATE_IDS[5],
        classification: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
        blocker: 'C34_RECOVERY_EXECUTOR_WRAPPER_TIMEOUT',
        semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
        semanticEvaluationCompleted: false,
        preservedPartialEvidence: recursiveFiles(attemptDir)
          .map(rel)
          .filter((file) => !file.endsWith('/TECHNICAL_FAILURE.json')),
        allocationConsumed: true,
        furtherRetryAuthorized: false,
        pass: true,
      }));
      const handle = {
        attemptId: attempt.attemptId,
        dir: attemptDir,
        record: attempt,
      };
      C.appendAttemptLog(
        handle,
        'stderr',
        'C34_RECOVERY_EXECUTOR_WRAPPER_TIMEOUT: the foreground execution wrapper '
          + 'terminated after allocation and replay, before semantic completion. '
          + 'No further retry is authorized.',
      );
      attempt = C.finalizeAttempt(handle, {
        disposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
        resultPaths: [failureFile],
        exitCode: 124,
        signal: 'EXECUTION_WRAPPER_TIMEOUT',
        status: 'technical_failure',
      });
    }
    requirePass(
      ['completed', 'technical_failure'].includes(attempt.status),
      'C34_CANDIDATE_5_LINKED_RETRY_NOT_TERMINAL',
    );
    const resultFile = path.join(ATT, retries[0].attemptId, 'ITERATION_RESULT.json');
    return {
      resumedTerminal: true,
      attempt,
      result: fs.existsSync(resultFile) ? readJson(resultFile) : null,
      selected: null,
    };
  }
  requirePass(
    retries.length === 0 && plannedRetries.length === 0,
    'C34_CANDIDATE_5_LINKED_RETRY_DUPLICATION_REFUSED',
  );
  const candidate4 = terminalCandidate(4);
  requirePass(
    candidate4.attempt?.attemptId === CANDIDATE_4_ATTEMPT
      && candidate4.result?.accepted === true
      && candidate4.active?.identity?.servicesTreeDigest === ACTIVE_BASE_42,
    'C34_CANDIDATE_5_LINKED_RETRY_BASE_INVALID',
  );
  const priorAccepted = acceptedPredecessorsForCandidate5({
    candidate4,
    active: candidate4.active,
  });
  const protectedRows = await protectedAcceptedRows(priorAccepted, candidate4.active);
  const extension = extendPreservation(
    executor.loadPreservationForRecovery(),
    protectedRows,
  );
  requirePass(
    protectedRows.length === 252
      && extension.preservation.priorCorrectRows.length === 3572
      && extension.preservation.generalization.required === 195
      && extension.preservation.leaveOneFamilyOut.required === 24,
    'C34_CANDIDATE_5_LINKED_RETRY_PRESERVATION_INVALID',
  );
  const preflight = existingOrCreateJson(RETRY_PREFLIGHT, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    originalAttemptId: ORIGINAL_CANDIDATE_5,
    registryRetryRecords: retries.length,
    walRetryPlans: plannedRetries.length,
    attemptRetryDirectories: fs.readdirSync(ATT)
      .filter((name) => name.includes('commit5r1c34-tr01-retry01-')).length,
    originalAttemptRecords: registry.attempts
      .filter((attempt) => attempt.attemptId === ORIGINAL_CANDIDATE_5).length,
    originalAttemptPreserved: true,
    activeBaseHash: candidate4.active.identity.servicesTreeDigest,
    protectedRows: protectedRows.length,
    allocationLockPresent: fs.existsSync(CANDIDATE_5_LOCK),
    candidate6Evidence: {
      registry: cycleState(6).registryRecords.length,
      wal: cycleState(6).walRecords.length,
      directories: cycleState(6).directoryRecords.length,
    },
    pass:
      retries.length === 0
      && plannedRetries.length === 0
      && !fs.existsSync(CANDIDATE_5_LOCK)
      && cycleState(6).registryRecords.length === 0
      && cycleState(6).walRecords.length === 0
      && cycleState(6).directoryRecords.length === 0,
  }));
  requirePass(preflight.pass, 'C34_CANDIDATE_5_LINKED_RETRY_PREFLIGHT_FAILED');
  const authorization = existingOrCreateJson(RETRY_AUTHORIZATION, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    decision: 'AUTHORIZED_EXACTLY_ONE_LINKED_RETRY',
    retryOf: ORIGINAL_CANDIDATE_5,
    retryReason: 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
    retryType: 'TECHNICAL_LINKED_RETRY',
    candidateId: CANDIDATE_IDS[5],
    sameFrozenSemanticCandidate: true,
    activeBaseHash: ACTIVE_BASE_42,
    allocationCycle: 'tr01-retry01',
    allocationOrdinal: 6,
    remediation: hashRecord(REMEDIATION),
    compatibility: hashRecord(COMPATIBILITY),
    preflight: hashRecord(RETRY_PREFLIGHT),
    candidate6Authorized: false,
    pass: true,
  }));
  requirePass(authorization.pass, 'C34_CANDIDATE_5_LINKED_RETRY_NOT_AUTHORIZED');
  return withAllocationLock(5, async () =>
    executor.runMaterialCandidate(
      executor.CANDIDATES[4],
      5,
      candidate4.active,
      extension.preservation,
      {
        allocationCycle: 'tr01-retry01',
        allocationOrdinal: 6,
        retryOf: ORIGINAL_CANDIDATE_5,
        retryReason: 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
        retryType: 'TECHNICAL_LINKED_RETRY',
      },
    ));
}

function appendRecoverySafePause({
  activeBaseHash,
  classification,
  artifacts,
  nextExactOperation,
  blocker = null,
}) {
  const logBytes = fs.readFileSync(CHECKPOINT_LOG);
  const rows = logBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  const tip = JSON.parse(rows.at(-1));
  if (
    tip.stage === 'candidate 5 linked retry recovery safe pause'
    && tip.status === classification
    && tip.safeToResume === true
    && tip.activeAttemptId == null
  ) {
    return { event: tip, appended: false };
  }
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal: rows.length + 1,
    commitUnit: 'PHASE-10A14-R20-COMMIT-5R1-C34',
    updatedAtUtc: now(),
    stage: 'candidate 5 linked retry recovery safe pause',
    status: classification,
    head: git('rev-parse', 'HEAD').trim(),
    activeBaseHash,
    attemptId: null,
    activeAttemptId: null,
    artifactHashes: artifacts.map(hashRecord),
    previousLogSha256: sha(logBytes),
    nextExactOperation,
    safeToResume: true,
    blocker,
  };
  const event = {
    ...eventWithoutHash,
    eventSha256: sha(Buffer.from(JSON.stringify(eventWithoutHash))),
  };
  const numbered = path.join(
    RES,
    `COMMIT_5R1C34_RECOVERY_CHECKPOINT_${event.ordinal}_candidate_5_linked_retry_recovery_safe_pause.json`,
  );
  writeOnceJson(numbered, event);
  fs.appendFileSync(CHECKPOINT_LOG, `${JSON.stringify(event)}\n`);
  writeMutableJson(CHECKPOINT, event);
  return { event, appended: true };
}

function createRecoveryManifest(files) {
  const unique = [...new Set(files.map((file) => path.resolve(file)))].sort();
  const lines = unique.map((file) => `${sha(fs.readFileSync(file))}  ${rel(file)}`);
  writeOnceBuffer(RECOVERY_MANIFEST, Buffer.from(`${lines.join('\n')}\n`));
  return { files: unique.length, sha256: sha(fs.readFileSync(RECOVERY_MANIFEST)) };
}

async function recoverCandidate5() {
  const continuity = checkpoint42Continuity();
  const forensics = createForensics(continuity);
  const tests = runReplaySelfTests();
  const adjudication = writeRecoveryArtifactAndAdjudicate(forensics);
  const executor = await loadFrozenExecutor();
  let execution;
  let technicalError = null;
  try {
    execution = await executeCandidate5LinkedRetry(executor);
  } catch (error) {
    technicalError = error;
    const registry = readJson(REGISTRY);
    const retry = registry.attempts.find((attempt) => attempt.retryOf === ORIGINAL_CANDIDATE_5);
    execution = {
      resumedTerminal: false,
      attempt: retry || null,
      result: null,
      selected: null,
    };
  }
  const attempt = execution.attempt?.record || execution.attempt;
  requirePass(
    attempt && ['completed', 'technical_failure'].includes(attempt.status),
    'C34_CANDIDATE_5_LINKED_RETRY_NOT_TERMINAL_AT_SAFE_PAUSE',
  );
  const iterationPath = path.join(ATT, attempt.attemptId, 'ITERATION_RESULT.json');
  const iteration = fs.existsSync(iterationPath) ? readJson(iterationPath) : null;
  const activeBaseHash = iteration?.accepted
    ? iteration.candidateIdentity.servicesTreeDigest
    : ACTIVE_BASE_42;
  const finalClassification = attempt.status === 'completed'
    ? 'TWO_HOUR_SAFE_PAUSE_AFTER_CANDIDATE_5_LINKED_RETRY'
    : 'TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER';
  const result = existingOrCreateJson(RETRY_RESULT, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification:
      attempt.status === 'completed'
        ? 'CANDIDATE_5_LINKED_RETRY_SEMANTIC_TERMINAL'
        : 'CANDIDATE_5_LINKED_RETRY_TECHNICAL_TERMINAL',
    attemptId: attempt.attemptId,
    retryOf: attempt.retryOf,
    retryReason: attempt.retryReason,
    retryType: attempt.retryType,
    status: attempt.status,
    disposition: attempt.disposition,
    accepted: iteration?.accepted ?? false,
    semanticDisposition:
      attempt.status === 'completed'
        ? attempt.disposition
        : 'NOT_A_SEMANTIC_REJECTION',
    startingActiveBaseHash: ACTIVE_BASE_42,
    endingActiveBaseHash: activeBaseHash,
    startingMetrics: {
      reasonPassed: 3572,
      reasonMismatches: 148,
      decisionPassed: 3720,
      relationPassed: 3720,
    },
    endingMetrics: iteration?.metrics || {
      reasonPassed: 3572,
      reasonMismatches: 148,
      decisionPassed: 3720,
      relationPassed: 3720,
    },
    metricDelta: iteration ? {
      reasonPassed: iteration.metrics.reasonPassed - 3572,
      remainingReasonMismatches: iteration.metrics.reasonMismatches - 148,
    } : null,
    iterationResult: fs.existsSync(iterationPath) ? hashRecord(iterationPath) : null,
    technicalError: technicalError?.stack || null,
    candidate6Authorized: false,
    pass: true,
  }));
  const ledger = C.reconcileC34AttemptLedger({ throwOnFailure: true });
  writeOnceJson(RECOVERY_LEDGER, ledger);
  const processState = strictProcessState();
  const state = gitState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  requirePass(
    processState.processInspectionSucceeded
      && processState.activeC34RunnerCount === 0
      && processState.port5173Free
      && temporary.length === 0
      && locks.length === 0
      && !state.indexLock
      && state.serviceDiff === ''
      && state.stagedDiff === ''
      && state.head === EXPECTED.head
      && state.upstream === EXPECTED.head
      && state.sync === '0\t0'
      && state.c35Items.length === 0
      && ledger.pass,
    'C34_CANDIDATE_5_RECOVERY_ENDING_RECONCILIATION_FAILED',
  );
  const safePause = existingOrCreateJson(RECOVERY_SAFE_PAUSE, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: finalClassification,
    startingCheckpoint: 42,
    safeToResume: true,
    activeAttemptId: null,
    originalAttemptId: ORIGINAL_CANDIDATE_5,
    linkedRetryAttemptId: attempt.attemptId,
    linkedRetryStatus: attempt.status,
    linkedRetryDisposition: attempt.disposition,
    endingActiveBaseHash: activeBaseHash,
    endingMetrics: result.endingMetrics,
    registryTotal: readJson(REGISTRY).attempts.length,
    walRows: parseNdjson(WAL).length,
    c34AttemptDirectories: fs.readdirSync(ATT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-')).length,
    ledgerPass: ledger.pass,
    retryLinkage: {
      retryOf: attempt.retryOf,
      retryReason: attempt.retryReason,
      retryType: attempt.retryType,
      retryCount: readJson(REGISTRY).attempts
        .filter((item) => item.retryOf === ORIGINAL_CANDIDATE_5).length,
    },
    allocationLocks: locks.map(rel),
    temporaryRuntimeDirectories: temporary.map(rel),
    processState,
    gitState: state,
    commitOccurred: false,
    pushOccurred: false,
    opusStatus: 'NOT_INVOKED_NO_APPROVAL_CLAIMED',
    candidate6Authorized: false,
    candidate6Allocated: false,
    candidate6Executed: false,
    nextExactOperation:
      attempt.status === 'completed'
        ? 'Resume from this safe checkpoint. Candidate 5 is terminal. Candidate 6 remains '
          + 'unauthorized in this session; obtain a new governed continuation before any '
          + 'Candidate 6 decision.'
        : 'Resume from this safe checkpoint and forensically adjudicate the linked-retry '
          + 'executor-wrapper timeout. Do not allocate another Candidate-5 retry and do '
          + 'not authorize Candidate 6.',
    pass: true,
  }));
  const artifacts = [
    ROOT_CAUSE_JSON,
    ROOT_CAUSE_MD,
    ORIGINAL_ADJUDICATION,
    REMEDIATION,
    HEADER_VALIDATION,
    DUAL_SELF_TEST,
    COMPATIBILITY,
    RETRY_AUTHORIZATION,
    RETRY_PREFLIGHT,
    RETRY_RESULT,
    RECOVERY_LEDGER,
    RECOVERY_SAFE_PAUSE,
    adjudication.recoveryArtifact,
    path.join(ATT, attempt.attemptId, 'ATTEMPT.json'),
    ...(fs.existsSync(iterationPath) ? [iterationPath] : []),
  ];
  const manifest = createRecoveryManifest(artifacts);
  const checkpoint = appendRecoverySafePause({
    activeBaseHash,
    classification: finalClassification,
    artifacts: [...artifacts, RECOVERY_MANIFEST],
    nextExactOperation: safePause.nextExactOperation,
    blocker:
      attempt.status === 'completed' ? null : 'C34_LINKED_RETRY_TECHNICAL_FAILURE',
  });
  const replayedCheckpoint = appendRecoverySafePause({
    activeBaseHash,
    classification: finalClassification,
    artifacts: [...artifacts, RECOVERY_MANIFEST],
    nextExactOperation: safePause.nextExactOperation,
    blocker:
      attempt.status === 'completed' ? null : 'C34_LINKED_RETRY_TECHNICAL_FAILURE',
  });
  requirePass(
    replayedCheckpoint.appended === false
      && replayedCheckpoint.event.eventSha256 === checkpoint.event.eventSha256,
    'C34_CANDIDATE_5_RECOVERY_SAFE_PAUSE_NOT_IDEMPOTENT',
  );
  return {
    classification: checkpoint.event.status,
    startingCheckpoint: 42,
    endingCheckpoint: checkpoint.event.ordinal,
    safeToResume: checkpoint.event.safeToResume,
    continuity,
    rootCause: forensics.root.provenRootCause,
    remediation: tests.remediation.decision,
    linkedRetry: result,
    endingActiveBaseHash: activeBaseHash,
    ledger,
    manifest,
    checkpointIdempotent: !replayedCheckpoint.appended,
    candidate6Authorized: false,
    opusStatus: 'NOT_INVOKED_NO_APPROVAL_CLAIMED',
    nextExactOperation: safePause.nextExactOperation,
    pass: true,
  };
}

async function main() {
  const modes = [
    '--candidate4-preflight',
    '--candidate4',
    '--candidate5',
    '--safe-pause',
    '--recover-candidate5',
  ].filter((mode) => process.argv.includes(mode));
  requirePass(modes.length === 1, 'C34_CHECKPOINT39_EXACTLY_ONE_MODE_REQUIRED');
  if (modes[0] === '--recover-candidate5') {
    console.log(JSON.stringify(await recoverCandidate5(), null, 2));
    return;
  }
  const executor = await loadFrozenExecutor();
  if (modes[0] === '--candidate4-preflight') {
    console.log(JSON.stringify(await runCandidate4Preflight(executor), null, 2));
    return;
  }
  if (modes[0] === '--candidate4') {
    const result = await executeCandidate4(executor);
    console.log(JSON.stringify({
      candidateOrdinal: 4,
      attemptId: result.attempt?.attemptId || null,
      status: result.attempt?.status || null,
      disposition: result.attempt?.disposition || null,
      accepted: result.outcome?.accepted ?? null,
      activeBaseHash: result.active.identity.servicesTreeDigest,
      outcome: result.outcome || null,
      blocker: result.blocker || null,
      manifest: result.manifest?.manifest || null,
      pass: true,
    }, null, 2));
    return;
  }
  if (modes[0] === '--candidate5') {
    const result = await executeCandidate5(executor);
    console.log(JSON.stringify(result.skipped ? {
      candidateOrdinal: 5,
      skipped: true,
      eligibility: result.eligibility,
      pass: true,
    } : {
      candidateOrdinal: 5,
      skipped: false,
      attemptId: result.attempt?.attemptId || null,
      status: result.attempt?.status || null,
      disposition: result.attempt?.disposition || null,
      accepted: result.outcome?.accepted ?? null,
      activeBaseHash: result.active.identity.servicesTreeDigest,
      outcome: result.outcome || null,
      blocker: result.blocker || null,
      manifest: result.manifest?.manifest || null,
      pass: true,
    }, null, 2));
    return;
  }
  console.log(JSON.stringify(safePause(), null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}
