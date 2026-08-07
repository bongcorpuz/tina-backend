// PHASE-10A14-R20 COMMIT 5R1-C37
// Checkpoint-63 continuation preflight. This runner performs no repair or
// normalization and writes only new, write-once C37 evidence after every
// continuity assertion succeeds.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as C from './commit5r1c34-lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const ATTEMPTS = path.join(RESULTS, 'attempts');
const PROMPT = 'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C37-FOUR-HOUR-REASON-RESIDUAL-CONTRACT-ADJUDICATION-FROM-CHECKPOINT-63.md';
const SELECTED_REASON = path.join(
  ATTEMPTS,
  'R20-domain_campaign-commit5r1c34-tr01-retry01-ord06-2026-07-30T03-24-56-403Z/runtime-snapshot',
);

const EXPECTED = Object.freeze({
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  parent: 'd5b25e676f623fbc1888608ff250824fcd34af99',
  branch: 'feature/source-availability-engine-v1',
  checkpointSha256: '7b6a5d7fdb071c97f5d007d484136203a3e1b0cac7d1519e20002c51cad3d657',
  checkpointEventSha256: '64913fca61c4d25fa23763f304440207feeab53cf78d6fa6ae95dfb86fc5dbc9',
  c36InventorySha256: '188eb3f90e3b3863a99d44e0c57eb3c41e487377c3d00fdc868026e532ed6812',
  protectedResidueAggregate: '980cd3b5f2a5b75104bc91c9e6f4391e80bf5f0d772f48b61c79497e3d2ebd0a',
  registrySha256: 'a0261acfcc4cc69615794fe6f26117c00789d42862a75fae3e978b2e17a1e073',
  c34WalSha256: '2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2',
  c35WalSha256: 'd86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f',
  selectedReasonRuntime: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  liveReasonRuntime: '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201',
  c35Composite: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
});

const files = Object.freeze({
  checkpoint: path.join(RESULTS, 'COMMIT_5R1C36_RECOVERY_CHECKPOINT.json'),
  checkpointReplay: path.join(RESULTS, 'COMMIT_5R1C36_CHECKPOINT_63_IDEMPOTENCE_REPLAY.json'),
  c36Manifest: path.join(RESULTS, 'COMMIT_5R1C36_SAFE_PAUSE_EVIDENCE.sha256'),
  priorProtectedBaseline: path.join(RESULTS, 'COMMIT_5R1C36_PROTECTED_RESIDUE_BASELINE.json'),
  registry: path.join(RESULTS, 'CANONICAL_ATTEMPT_REGISTRY.json'),
  c34Wal: path.join(RESULTS, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c35Wal: path.join(RESULTS, 'COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c36Wal: path.join(RESULTS, 'COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c37Wal: path.join(RESULTS, 'COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson'),
  preflight: path.join(RESULTS, 'COMMIT_5R1C37_CHECKPOINT_63_CONTINUATION_PREFLIGHT.json'),
  inventory: path.join(RESULTS, 'COMMIT_5R1C37_C36_SAFE_PAUSE_INVENTORY_VERIFICATION.json'),
  protectedBaseline: path.join(RESULTS, 'COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
});

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const now = () => new Date().toISOString();
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const assert = (condition, message) => {
  if (!condition) throw new Error(`CHECKPOINT_63_CONTINUITY_MISMATCH:${message}`);
};

function git(...args) {
  return execFileSync('git', args, {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_GLOBAL: 'NUL' },
  }).trim();
}

function fileRecord(file) {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), bytes: bytes.length, sha256: sha(bytes) };
}

function writeOnce(file, value) {
  if (fs.existsSync(file)) throw new Error(`C37_PREFLIGHT_WRITE_ONCE_EXISTS:${rel(file)}`);
  fs.writeFileSync(file, value, { flag: 'wx' });
}

function lineCount(file) {
  if (!fs.existsSync(file)) return 0;
  const text = fs.readFileSync(file, 'utf8').trim();
  return text ? text.split(/\r?\n/).length : 0;
}

function validateManifest() {
  const lines = fs.readFileSync(files.c36Manifest, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const records = lines.map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `C36_MANIFEST_SYNTAX_ROW_${index + 1}`);
    const target = path.join(REPO, match[2].replaceAll('/', path.sep));
    const exists = fs.existsSync(target) && fs.statSync(target).isFile();
    const actualSha256 = exists ? shaFile(target) : null;
    return {
      row: index + 1,
      path: match[2],
      expectedSha256: match[1],
      actualSha256,
      bytes: exists ? fs.statSync(target).size : null,
      exists,
      match: exists && actualSha256 === match[1],
    };
  });
  const paths = records.map((record) => record.path);
  const sortedPaths = [...paths].sort((a, b) => a.localeCompare(b, 'en'));
  const duplicateCount = paths.length - new Set(paths).size;
  const manifestRecord = fileRecord(files.c36Manifest);
  const state = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_C36_SAFE_PAUSE_INVENTORY_VERIFICATION_PASS',
    verifiedUtc: now(),
    manifest: manifestRecord,
    expectedManifestSha256: EXPECTED.c36InventorySha256,
    expectedRows: 48,
    rows: records.length,
    duplicateCount,
    missingCount: records.filter((record) => !record.exists).length,
    mismatchCount: records.filter((record) => !record.match).length,
    lexicalPathOrder: paths.every((item, index) => item === sortedPaths[index]),
    deterministicSelfExcluding: !paths.includes(rel(files.c36Manifest)),
    records,
  };
  state.pass = state.manifest.sha256 === EXPECTED.c36InventorySha256
    && state.rows === 48
    && state.duplicateCount === 0
    && state.missingCount === 0
    && state.mismatchCount === 0
    && state.lexicalPathOrder
    && state.deterministicSelfExcluding;
  assert(state.pass, 'C36_SAFE_PAUSE_INVENTORY');
  return state;
}

function validateProtectedResidue(inventory) {
  const baseline = readJson(files.priorProtectedBaseline);
  const records = baseline.records.map((expected) => {
    const target = path.join(REPO, expected.path.replaceAll('/', path.sep));
    const actual = fileRecord(target);
    return {
      ...actual,
      expectedBytes: expected.bytes,
      expectedSha256: expected.sha256,
      pass: actual.bytes === expected.bytes && actual.sha256 === expected.sha256,
    };
  });
  const payload = records.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}\n`).join('');
  const aggregateSha256 = sha(Buffer.from(payload, 'utf8'));
  const trackedControls = baseline.protectedTrackedControls.map((expected) => {
    const target = path.join(REPO, expected.path.replaceAll('/', path.sep));
    const actual = fileRecord(target);
    return {
      ...actual,
      expectedBytes: expected.bytes,
      expectedSha256: expected.sha256,
      pass: actual.bytes === expected.bytes && actual.sha256 === expected.sha256,
    };
  });
  const state = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_PROTECTED_RESIDUE_BASELINE_VERIFIED',
    frozenUtc: now(),
    algorithm: baseline.algorithm,
    priorBaseline: fileRecord(files.priorProtectedBaseline),
    protectedUntrackedFiles: records.length,
    aggregateSha256,
    expectedAggregateSha256: EXPECTED.protectedResidueAggregate,
    records,
    protectedTrackedControls: trackedControls,
    protectedC36SafePauseInventory: {
      manifest: inventory.manifest,
      rows: inventory.rows,
      duplicateCount: inventory.duplicateCount,
      missingCount: inventory.missingCount,
      mismatchCount: inventory.mismatchCount,
      pass: inventory.pass,
    },
  };
  state.pass = records.length === 18
    && records.every((record) => record.pass)
    && trackedControls.every((record) => record.pass)
    && aggregateSha256 === EXPECTED.protectedResidueAggregate
    && inventory.pass;
  assert(state.pass, 'PROTECTED_RESIDUE');
  return state;
}

function c35Identity() {
  const components = [
    'ask-handler.js',
    'conflict-engine.js',
    'services/answer-support-evidence.js',
    'services/answer-support-validator.js',
  ].sort().map((name) => fileRecord(path.join(REPO, name)));
  const payload = components.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}\n`).join('');
  return {
    algorithm: 'For each POSIX path in lexical order: path + NUL + raw-byte-length + NUL + SHA256(raw bytes) + LF; SHA256 the UTF-8 concatenation.',
    components,
    compositeSha256: sha(Buffer.from(payload, 'utf8')),
  };
}

function tasklist(imageName) {
  const output = execFileSync('tasklist.exe', ['/FI', `IMAGENAME eq ${imageName}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
  return output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('"')).map((line) => {
    const fields = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
    return { imageName: fields[0], pid: Number.parseInt(fields[1], 10) };
  }).filter((record) => Number.isInteger(record.pid));
}

function inspectHygiene() {
  const nodeProcesses = tasklist('node.exe').filter((record) => record.pid !== process.pid);
  const claudeProcesses = tasklist('claude.exe');
  const netstat = execFileSync('netstat.exe', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
  const port5173Listeners = netstat.split(/\r?\n/).filter((line) => {
    const fields = line.trim().split(/\s+/);
    return fields[0] === 'TCP' && /:5173$/.test(fields[1] || '') && fields[3] === 'LISTENING';
  });
  const temporaryRuntimes = fs.readdirSync(RESULTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^(?:\.c3[67]-|\.commit5r1c3[67]-|commit5r1c3[67]-temp)/i.test(entry.name))
    .map((entry) => entry.name);
  const locks = [
    path.join(REPO, '.git/index.lock'),
    ...fs.readdirSync(RESULTS).filter((name) => /(?:allocation|runtime)\.lock$/i.test(name)).map((name) => path.join(RESULTS, name)),
  ].filter((file) => fs.existsSync(file)).map(rel);
  const state = {
    observedUtc: now(),
    currentExecutor: { imageName: 'node.exe', pid: process.pid },
    nodeProcessesExcludingCurrentExecutor: nodeProcesses,
    claudeProcesses,
    port5173Listeners,
    temporaryRuntimes,
    locks,
    stagingEmpty: git('diff', '--cached', '--name-only') === '',
    trackedTreeClean: git('status', '--porcelain=v1', '--untracked-files=no') === '',
  };
  state.pass = nodeProcesses.length === 0
    && claudeProcesses.length === 0
    && port5173Listeners.length === 0
    && temporaryRuntimes.length === 0
    && locks.length === 0
    && state.stagingEmpty
    && state.trackedTreeClean;
  return state;
}

function validateRegistryWalAttempts() {
  const registry = readJson(files.registry);
  const attempts = registry.attempts;
  const ids = attempts.map((attempt) => attempt.attemptId);
  const uniqueIds = new Set(ids);
  const directories = fs.readdirSync(ATTEMPTS, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const directoryIds = new Set(directories);
  const c36RegistryRows = attempts.filter((attempt) => attempt.gateName === 'commit5r1c36'
    || String(attempt.candidateId || '').startsWith('C36-')
    || String(attempt.attemptId || '').includes('commit5r1c36'));
  const c37RegistryRows = attempts.filter((attempt) => attempt.gateName === 'commit5r1c37'
    || String(attempt.candidateId || '').startsWith('C37-')
    || String(attempt.attemptId || '').includes('commit5r1c37'));
  const state = {
    registry: fileRecord(files.registry),
    registryAttempts: attempts.length,
    uniqueAttemptIds: uniqueIds.size,
    attemptDirectories: directories.length,
    orphan: directories.filter((id) => !uniqueIds.has(id)),
    dangling: ids.filter((id) => !directoryIds.has(id)),
    running: attempts.filter((attempt) => attempt.status === 'running').map((attempt) => attempt.attemptId),
    activeAttemptId: registry.c35?.activeAttemptId ?? null,
    c34Wal: { ...fileRecord(files.c34Wal), rows: lineCount(files.c34Wal) },
    c35Wal: { ...fileRecord(files.c35Wal), rows: lineCount(files.c35Wal) },
    c36Wal: { path: rel(files.c36Wal), exists: fs.existsSync(files.c36Wal), rows: lineCount(files.c36Wal) },
    c37Wal: { path: rel(files.c37Wal), exists: fs.existsSync(files.c37Wal), rows: lineCount(files.c37Wal) },
    c36RegistryRows: c36RegistryRows.map((attempt) => attempt.attemptId),
    c37RegistryRows: c37RegistryRows.map((attempt) => attempt.attemptId),
    c36AttemptDirectories: directories.filter((id) => id.includes('commit5r1c36')),
    c37AttemptDirectories: directories.filter((id) => id.includes('commit5r1c37')),
  };
  state.pass = state.registry.sha256 === EXPECTED.registrySha256
    && attempts.length === 230
    && uniqueIds.size === 230
    && directories.length === 230
    && state.orphan.length === 0
    && state.dangling.length === 0
    && state.running.length === 0
    && state.activeAttemptId === null
    && state.c34Wal.sha256 === EXPECTED.c34WalSha256
    && state.c34Wal.rows === 32
    && state.c35Wal.sha256 === EXPECTED.c35WalSha256
    && state.c35Wal.rows === 6
    && !state.c36Wal.exists
    && state.c36Wal.rows === 0
    && !state.c37Wal.exists
    && state.c37Wal.rows === 0
    && state.c36RegistryRows.length === 0
    && state.c37RegistryRows.length === 0
    && state.c36AttemptDirectories.length === 0
    && state.c37AttemptDirectories.length === 0;
  assert(state.pass, 'REGISTRY_WAL_ATTEMPTS');
  return state;
}

function main() {
  for (const output of [files.preflight, files.inventory, files.protectedBaseline]) {
    if (fs.existsSync(output)) throw new Error(`C37_PREFLIGHT_WRITE_ONCE_EXISTS:${rel(output)}`);
  }
  const checkpoint = readJson(files.checkpoint);
  const replay = readJson(files.checkpointReplay);
  assert(shaFile(files.checkpoint) === EXPECTED.checkpointSha256, 'CHECKPOINT_FILE_HASH');
  assert(checkpoint.ordinal === 63, 'CHECKPOINT_ORDINAL');
  assert(checkpoint.eventSha256 === EXPECTED.checkpointEventSha256, 'CHECKPOINT_EVENT');
  assert(checkpoint.safeToResume === true, 'CHECKPOINT_NOT_RESUMABLE');
  assert(checkpoint.activeAttemptId === null, 'CHECKPOINT_ACTIVE_ATTEMPT');
  assert(replay.pass === true && replay.checks?.safeToResume === true, 'CHECKPOINT_IDEMPOTENCE_REPLAY');

  const inventory = validateManifest();
  const protectedResidue = validateProtectedResidue(inventory);
  const registryWalAttempts = validateRegistryWalAttempts();
  const selectedReasonRuntime = C.runtimeFor(SELECTED_REASON);
  const liveReasonRuntime = C.runtimeFor(path.join(REPO, 'services'));
  const c35 = c35Identity();
  assert(selectedReasonRuntime.servicesTreeDigest === EXPECTED.selectedReasonRuntime, 'SELECTED_C34_REASON_RUNTIME');
  assert(liveReasonRuntime.servicesTreeDigest === EXPECTED.liveReasonRuntime, 'LIVE_REASON_RUNTIME');
  assert(c35.compositeSha256 === EXPECTED.c35Composite, 'C35_RUNTIME');

  const head = git('rev-parse', 'HEAD');
  const parent = git('rev-parse', 'HEAD^');
  const upstream = git('rev-parse', '@{upstream}');
  const remote = git('rev-parse', `refs/remotes/origin/${EXPECTED.branch}`);
  const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').split(/\s+/).map(Number);
  const branch = git('branch', '--show-current');
  const stagingEmpty = git('diff', '--cached', '--name-only') === '';
  const trackedTreeClean = git('status', '--porcelain=v1', '--untracked-files=no') === '';
  assert(head === EXPECTED.head && parent === EXPECTED.parent, 'HEAD_OR_PARENT');
  assert(upstream === EXPECTED.head && remote === EXPECTED.head, 'UPSTREAM_OR_REMOTE');
  assert(ahead === 0 && behind === 0 && branch === EXPECTED.branch, 'BRANCH_SYNC');
  assert(stagingEmpty && trackedTreeClean, 'TRACKED_OR_STAGING_DIRTY');
  const hygiene = inspectHygiene();
  assert(hygiene.pass, 'HYGIENE');

  const preflight = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_CHECKPOINT_63_CONTINUATION_PREFLIGHT_PASS',
    startedUtc: now(),
    governingPrompt: fs.existsSync(PROMPT) ? {
      path: PROMPT.replaceAll('\\', '/'),
      bytes: fs.statSync(PROMPT).size,
      sha256: shaFile(PROMPT),
    } : { path: PROMPT, exists: false },
    checkpoint63: {
      pointer: fileRecord(files.checkpoint),
      ordinal: checkpoint.ordinal,
      eventSha256: checkpoint.eventSha256,
      safeToResume: checkpoint.safeToResume,
      activeAttemptId: checkpoint.activeAttemptId,
      pass: true,
    },
    checkpoint63IdempotenceReplay: {
      evidence: fileRecord(files.checkpointReplay),
      classification: replay.classification,
      pass: replay.pass,
    },
    git: {
      head,
      parent,
      upstream,
      fetchedRemoteTrackingTip: remote,
      branch,
      ahead,
      behind,
      stagingEmpty,
      trackedTreeClean,
      commitMessage: git('show', '-s', '--format=%s', 'HEAD'),
    },
    c36SafePauseInventory: {
      manifest: inventory.manifest,
      rows: inventory.rows,
      duplicateCount: inventory.duplicateCount,
      missingCount: inventory.missingCount,
      mismatchCount: inventory.mismatchCount,
      pass: inventory.pass,
    },
    registryWalAttempts,
    protectedResidue: {
      priorBaseline: protectedResidue.priorBaseline,
      protectedUntrackedFiles: protectedResidue.protectedUntrackedFiles,
      aggregateSha256: protectedResidue.aggregateSha256,
      pass: protectedResidue.pass,
    },
    runtimeIdentities: {
      selectedC34ReasonRuntime: selectedReasonRuntime,
      selectedC34ReasonRuntimeExpected: EXPECTED.selectedReasonRuntime,
      liveTrackedReasonRuntime: liveReasonRuntime,
      liveTrackedReasonRuntimeExpected: EXPECTED.liveReasonRuntime,
      c35,
      c35ExpectedCompositeSha256: EXPECTED.c35Composite,
      pass: true,
    },
    hygiene,
    startingGovernedStatus: {
      phase10A: 'OPEN',
      r20: 'IN_PROGRESS',
      c35: 'TERMINAL_COMMITTED_PUSHED',
      c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL',
      c37: 'STARTED_BY_THIS_PREFLIGHT',
    },
    prohibitedOperationsObserved: {
      e2: false,
      a15: false,
      c38: false,
      phase10B: false,
      deployment: false,
      reindex: false,
      modelMigration: false,
    },
    activeAttemptId: null,
    safeToContinue: true,
    pass: true,
  };

  writeOnce(files.inventory, stable(inventory));
  writeOnce(files.protectedBaseline, stable(protectedResidue));
  writeOnce(files.preflight, stable(preflight));
  process.stdout.write(stable({
    operation: 'c37-checkpoint-63-continuation-preflight',
    classification: preflight.classification,
    outputs: [fileRecord(files.preflight), fileRecord(files.inventory), fileRecord(files.protectedBaseline)],
    pass: true,
  }));
}

main();
