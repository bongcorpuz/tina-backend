// PHASE-10A14-R20 COMMIT 5R1-C34
// Additive, non-duplicating continuation from authorized checkpoint 35.
//
// The frozen C34 executor and library are evidence-bound by checkpoint 35.
// This runner loads the executor definitions through a temporary, in-memory-
// directed adapter and never changes either evidence-bound source file.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as L from './commit5r1c20-lib.mjs';
import * as C from './commit5r1c34-lib.mjs';

const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C34';
const RES = C.RES;
const ATT = C.ATT;
const ORIGINAL_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs',
);
const LIB = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
);
const THIS_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-checkpoint35-continue.mjs',
);
const REGISTRY = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
const WAL = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
const CHECKPOINT = path.join(RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT.json');
const CHECKPOINT_LOG = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson',
);
const CHECKPOINT_34 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_34_one_hour_terminal_safe_pause.json',
);
const CHECKPOINT_35 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_35_checkpoint_34_continuity_mismatch_safe_pause.json',
);
const CHECKPOINT_34_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_34_CURRENT_SNAPSHOT.json',
);
const CHECKPOINT_34_MISMATCH = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_34_CONTINUITY_MISMATCH.json',
);
const CHECKPOINT_34_MISMATCH_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_34_CONTINUITY_MISMATCH_EVIDENCE.sha256',
);
const HYPOTHESES = path.join(RES, 'COMMIT_5R1C34_CANDIDATE_HYPOTHESES.json');
const AUTHORIZATION = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_AUTHORIZATION.json',
);
const NON_DUPLICATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_2_NON_DUPLICATION_PREFLIGHT.json',
);
const COMPATIBILITY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_2_RESUME_COMPATIBILITY_VALIDATION.json',
);
const PREFLIGHT_REMEDIATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_2_PREFLIGHT_FALSE_NEGATIVE_REMEDIATION.json',
);
const COMPATIBILITY_SUPERSEDING = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_2_RESUME_COMPATIBILITY_VALIDATION_SUPERSEDING.json',
);
const HISTORIC_PREALLOCATION = path.join(
  RES,
  'COMMIT_5R1C34_ACCOUNT_TRANSFER_PREALLOCATION_VALIDATION.json',
);
const CHECKPOINT_35_REGISTRY_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const CHECKPOINT_35_WAL_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const CHECKPOINT_35_LOG_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_RECOVERY_CHECKPOINT_LOG_SNAPSHOT.ndjson',
);
const ACCEPTED_RETRY_REGRESSION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_2_ACCEPTED_RETRY_REGRESSION_VALIDATION.json',
);
const CANDIDATE_2_LEDGER = path.join(
  RES,
  'COMMIT_5R1C34_ATTEMPT_LEDGER_AFTER_CANDIDATE_2.json',
);
const CANDIDATE_2_OUTCOME = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_2_CONTINUATION_RESULT.json',
);
const CANDIDATE_2_BLOCKER = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_2_TECHNICAL_BLOCKER.json',
);
const LOG_PREFIX = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_LOG_PREFIX.ndjson',
);
const SAFE_PAUSE = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_SAFE_PAUSE.json',
);
const SAFE_PAUSE_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_SAFE_PAUSE_EVIDENCE.sha256',
);
const ENDING_REGISTRY_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_ENDING_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const ENDING_WAL_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_ENDING_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const CANDIDATE_2_ALLOCATION_LOCK = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CANDIDATE_2_ALLOCATION.lock',
);
const PROMPT = path.resolve(
  'C:/Projects/tina-execution-prompts/'
  + 'PHASE-10A14-R20-COMMIT-5R1-C34-ONE-HOUR-CONTINUATION-FROM-CHECKPOINT-35.md',
);

const SESSION_STARTED_UTC = '2026-07-29T12:14:03.067Z';
const SESSION_HARD_STOP_UTC = '2026-07-29T13:14:03.067Z';
const ACTIVE_BASE_HASH =
  '02d53a0480db28aebbb47568aab5700a80ed502bb65c072eb2ebfff9d5a60129';
const ACCEPTED_RETRY_ID =
  'R20-domain_campaign-commit5r1c34-nt01-retry01-ord02-2026-07-29T05-00-15-739Z';
const CANDIDATE_2_ID =
  'C34-NT02-local-identifier-redefinition-is-explicit-non-tax-task';
const EXPECTED = Object.freeze({
  head: '7c95019622d7174c8b1fd258b9a10137e59feb57',
  checkpoint35:
    '736b6af4c07d53419c14ef90d20159dece76dcafbd464203af7fd8df2360d5a2',
  checkpoint35Event:
    '9c9380877fe4074e0661d207feaf50cdf2f814e0d69dd1b2a9dfb8aba2f516b5',
  checkpoint34:
    '7b14bd89bfcfc3f01303c9e1f0c504cce90c752f5bdb5c93851b2ca96745bb28',
  checkpoint34Mismatch:
    '3bb13e90a7a4adcf04fe8bba8018e59479c38bb812311b6d6aa2b2b505f14365',
  checkpoint34MismatchManifest:
    '8b00ec97621131a524000fa8920f2a7b83f3bd217ae1313bf64136fa7106b482',
  checkpointLog35:
    'a9b3dd80426fe3fcfed8a91fb9b843f03636905c40f49a4216e4f9157ab5f36f',
  acceptedRetryResult:
    '209fd7a60b5854139559db2c66809d3560b7da1f1ef7677b9eb4c2075e482054',
  registry:
    '1fedcc3133b197cac32cb963df145d7211560c538be36665a326ed91ccf3d4c5',
  wal:
    '0903746c13125c6f749c7df473eb8b653bf9fa01ee068f2c0b3188c39adadeb9',
  hypotheses:
    'c71153db4148d8bad3ab0f772aa55e130e00e201b61c78ff5d21573c04595009',
  originalRunner:
    'a38759fbde67e67b06e0165fcbb8ef97f5163e4f6c8aa08e951ab05dec3b4b5e',
  lib: 'dd3bd236eee0dd515146ac20314b3678b87cbca4d907e0225fdeec8a16431298',
  prompt:
    'be381f7d3d361ab24d1b9cd004349e0b5d32625d4a07bb1253501073dce8fd2e',
});

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const requirePass = (condition, message) => {
  if (!condition) throw new Error(message);
};
const readJson = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const git = (...args) =>
  execFileSync('git', args, {
    cwd: C.REPO,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
const rel = (file) => {
  const absolute = path.resolve(file).replace(/\\/g, '/');
  const root = path.resolve(C.REPO).replace(/\\/g, '/');
  return absolute.startsWith(`${root}/`) ? absolute.slice(root.length + 1) : absolute;
};
const hashRecord = (file) => {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), bytes: bytes.length, sha256: sha(bytes) };
};

function writeOnceBuffer(file, bytes) {
  const absolute = path.resolve(file);
  if (fs.existsSync(absolute)) {
    requirePass(
      Buffer.compare(fs.readFileSync(absolute), bytes) === 0,
      `C34_CHECKPOINT35_WRITE_ONCE_CONFLICT_${rel(absolute)}`,
    );
    return false;
  }
  const temporary =
    `${absolute}.c34-cp35-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, bytes, { flag: 'wx' });
  try {
    fs.renameSync(temporary, absolute);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return true;
}

function writeOnceJson(file, value) {
  return writeOnceBuffer(file, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

function writeMutableJson(file, value) {
  const absolute = path.resolve(file);
  const temporary =
    `${absolute}.c34-cp35-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  try {
    fs.renameSync(temporary, absolute);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

async function withCandidate2AllocationLock(callback) {
  let descriptor;
  try {
    descriptor = fs.openSync(CANDIDATE_2_ALLOCATION_LOCK, 'wx');
  } catch (error) {
    throw new Error(
      `C34_CHECKPOINT35_CANDIDATE_2_ALLOCATION_LOCK_UNAVAILABLE_${error.code || error.message}`,
    );
  }
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify({
      schemaVersion: 1,
      pid: process.pid,
      acquiredUtc: now(),
      runnerSha256: sha(fs.readFileSync(THIS_RUNNER)),
      candidateId: CANDIDATE_2_ID,
    })}\n`);
    fs.fsyncSync(descriptor);
    return await callback();
  } finally {
    if (descriptor != null) fs.closeSync(descriptor);
    if (fs.existsSync(CANDIDATE_2_ALLOCATION_LOCK)) {
      fs.unlinkSync(CANDIDATE_2_ALLOCATION_LOCK);
    }
  }
}

function parseNdjson(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function verifyManifest(file) {
  const records = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
    .map((line) => {
      const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
      requirePass(match, `C34_CHECKPOINT35_MANIFEST_LINE_INVALID_${line}`);
      const target = path.isAbsolute(match[2])
        ? path.resolve(match[2])
        : path.resolve(C.REPO, match[2]);
      const exists = fs.existsSync(target);
      const actualSha256 = exists ? sha(fs.readFileSync(target)) : null;
      return {
        path: match[2],
        expectedSha256: match[1],
        actualSha256,
        exists,
        pass: exists && actualSha256 === match[1],
      };
    });
  return {
    manifest: hashRecord(file),
    entries: records.length,
    records,
    badRecords: records.filter((record) => !record.pass),
    pass: records.length > 0 && records.every((record) => record.pass),
  };
}

function verifyCheckpoint34ManifestHistorically() {
  const substitutions = new Map([
    [rel(REGISTRY), CHECKPOINT_35_REGISTRY_SNAPSHOT],
    [rel(WAL), CHECKPOINT_35_WAL_SNAPSHOT],
  ]);
  const records = fs.readFileSync(
    CHECKPOINT_34_MISMATCH_MANIFEST,
    'utf8',
  ).split(/\r?\n/).filter(Boolean).map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    requirePass(match, `C34_CHECKPOINT34_HISTORICAL_MANIFEST_LINE_INVALID_${line}`);
    const historicalTarget = substitutions.get(match[2])
      || (path.isAbsolute(match[2])
        ? path.resolve(match[2])
        : path.resolve(C.REPO, match[2]));
    const exists = fs.existsSync(historicalTarget);
    const actualSha256 = exists ? sha(fs.readFileSync(historicalTarget)) : null;
    return {
      manifestPath: match[2],
      historicalTarget: rel(historicalTarget),
      substitutedFromCheckpoint35Snapshot: substitutions.has(match[2]),
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  return {
    manifest: hashRecord(CHECKPOINT_34_MISMATCH_MANIFEST),
    substitutions: Object.fromEntries(
      [...substitutions].map(([manifestPath, target]) => [manifestPath, rel(target)]),
    ),
    records,
    badRecords: records.filter((record) => !record.pass),
    pass: records.length === 16 && records.every((record) => record.pass),
  };
}

async function loadFrozenExecutor() {
  requirePass(sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner,
    'C34_CHECKPOINT35_FROZEN_EXECUTOR_DRIFT');
  requirePass(sha(fs.readFileSync(LIB)) === EXPECTED.lib,
    'C34_CHECKPOINT35_FROZEN_LIBRARY_DRIFT');
  const source = fs.readFileSync(ORIGINAL_RUNNER, 'utf8');
  const marker = '\nasync function main() {';
  const markerIndex = source.indexOf(marker);
  requirePass(markerIndex > 0, 'C34_CHECKPOINT35_EXECUTOR_ADAPTER_MARKER_MISSING');
  const originalRunnerUrl = pathToFileURL(ORIGINAL_RUNNER).href;
  const libUrl = pathToFileURL(LIB).href;
  const commonLib = path.resolve(
    'evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs',
  );
  const commonLibUrl = pathToFileURL(commonLib).href;
  const frozenPrefix = source.slice(0, markerIndex)
    .replace("from './commit5r1c20-lib.mjs'", `from '${commonLibUrl}'`)
    .replace("from './commit5r1c34-lib.mjs'", `from '${libUrl}'`);
  const checkpointStart = frozenPrefix.indexOf('\nfunction checkpoint({');
  const checkpointEnd = frozenPrefix.indexOf(
    '\nfunction appendIdempotentCheckpoint({',
    checkpointStart,
  );
  requirePass(
    checkpointStart > 0 && checkpointEnd > checkpointStart,
    'C34_CHECKPOINT35_EXECUTOR_CHECKPOINT_ADAPTER_MARKER_MISSING',
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
    'C34_CHECKPOINT35_IDEMPOTENT_CHECKPOINT_ADAPTER_MARKER_MISSING',
  );
  const appendBlock = adaptedPrefix.slice(appendStart, appendEnd);
  const appendBlockWithExplicitActiveAttempt = appendBlock.replace(
    '\n    attemptId,\n    artifactHashes:',
    '\n    attemptId,\n    activeAttemptId: attemptId,\n    artifactHashes:',
  );
  requirePass(
    appendBlockWithExplicitActiveAttempt !== appendBlock,
    'C34_CHECKPOINT35_ACTIVE_ATTEMPT_FIELD_ADAPTER_FAILED',
  );
  const adaptedWithExplicitActiveAttempt =
    adaptedPrefix.slice(0, appendStart)
    + appendBlockWithExplicitActiveAttempt
    + adaptedPrefix.slice(appendEnd);
  const adapted = `${adaptedWithExplicitActiveAttempt}

export {
  CANDIDATES,
  appendIdempotentCheckpoint,
  loadPreservationForRecovery,
  processAndPortState,
  runMaterialCandidate,
  validateCheckpointChain,
};
export const frozenExecutorSourceUrl = '${originalRunnerUrl}';
`;
  const temporary = path.join(
    os.tmpdir(),
    `tina-c34-checkpoint35-adapter-${process.pid}-${crypto.randomBytes(6).toString('hex')}.mjs`,
  );
  fs.writeFileSync(temporary, adapted, { flag: 'wx' });
  try {
    return await import(`${pathToFileURL(temporary).href}?sha=${sha(Buffer.from(adapted))}`);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function retryPaths() {
  const directory = path.join(ATT, ACCEPTED_RETRY_ID);
  return {
    directory,
    attempt: path.join(directory, 'ATTEMPT.json'),
    result: path.join(directory, 'ITERATION_RESULT.json'),
    snapshot: path.join(directory, 'runtime-snapshot'),
  };
}

function candidate2Records() {
  const registry = readJson(REGISTRY);
  const walRows = parseNdjson(WAL);
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const checkpointRows = parseNdjson(CHECKPOINT_LOG);
  const registryRecords = registry.attempts.filter((attempt) =>
    attempt.cycle === 'nt02' || /-nt02-/.test(attempt.attemptId));
  const walRecords = walRows.filter((row) =>
    typeof row.attemptId === 'string' && /-nt02-/.test(row.attemptId));
  const directoryRecords = directories.filter((attemptId) => /-nt02-/.test(attemptId));
  const checkpointRecords = checkpointRows.filter((event) =>
    typeof event.attemptId === 'string' && /-nt02-/.test(event.attemptId));
  return {
    registry,
    walRows,
    directories,
    checkpointRows,
    registryRecords,
    walRecords,
    directoryRecords,
    checkpointRecords,
  };
}

function temporaryRuntimeDirectories() {
  const prefixes = [
    'tina-c34-candidate-',
    'tina-c34-linked-retry-',
    'tina-c34-debug-analyzer-',
    'tina-c34-composition-',
    'tina-c34-process-inspection-',
    'tina-c34-checkpoint35-preflight-',
    'tina-c34-checkpoint35-adapter-',
  ];
  return fs.readdirSync(os.tmpdir(), { withFileTypes: true })
    .filter((entry) =>
      entry.isDirectory() && prefixes.some((prefix) => entry.name.startsWith(prefix)))
    .map((entry) => path.join(os.tmpdir(), entry.name).replace(/\\/g, '/'))
    .sort();
}

function gitAndRuntimeState() {
  const serviceDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  const staging = git('diff', '--cached', '--name-only').trim();
  const head = git('rev-parse', 'HEAD').trim();
  const upstream = git('rev-parse', '@{u}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim();
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  const c35Items = status.split(/\r?\n/).filter((line) =>
    /5R1C35|commit5r1c35/i.test(line));
  return {
    serviceDiff,
    staging,
    head,
    upstream,
    sync,
    c35Items,
    liveServices: C.liveRuntimeIdentity(),
    indexLock: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
  };
}

function acceptedRetryState() {
  const files = retryPaths();
  const attempt = readJson(files.attempt);
  const result = readJson(files.result);
  const identity = C.runtimeFor(files.snapshot);
  requirePass(
    attempt.attemptId === ACCEPTED_RETRY_ID
      && attempt.status === 'completed'
      && attempt.exitCode === 0
      && attempt.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
      && attempt.controlling === true,
    'C34_CHECKPOINT35_ACCEPTED_RETRY_ATTEMPT_INVALID',
  );
  requirePass(
    sha(fs.readFileSync(files.result)) === EXPECTED.acceptedRetryResult
      && result.attemptId === ACCEPTED_RETRY_ID
      && result.candidateId
        === 'C34-NT01-typed-ordinary-domain-inquiry-without-operation-is-no-tax-relation'
      && result.accepted === true
      && result.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
      && result.candidateIdentity.servicesTreeDigest === ACTIVE_BASE_HASH
      && identity.servicesTreeDigest === ACTIVE_BASE_HASH
      && C.sameRuntime(identity, result.candidateIdentity)
      && result.metrics.reasonPassed === 3556
      && result.metrics.reasonMismatches === 164
      && result.metrics.reasonPassed + result.metrics.reasonMismatches === 3720
      && result.metrics.decisionPassed === 3720
      && result.metrics.relationPassed === 3720,
    'C34_CHECKPOINT35_ACCEPTED_RETRY_RESULT_INVALID',
  );
  return {
    files,
    attempt,
    result,
    active: {
      attemptId: ACCEPTED_RETRY_ID,
      candidateId: result.candidateId,
      dir: files.snapshot,
      identity,
      gates: result.gates,
    },
  };
}

function baselineBindings() {
  return {
    checkpoint35: hashRecord(CHECKPOINT_35),
    checkpoint35EventSha256: EXPECTED.checkpoint35Event,
    checkpoint34Preserved: hashRecord(CHECKPOINT_34),
    checkpoint34Snapshot: hashRecord(CHECKPOINT_34_SNAPSHOT),
    checkpoint34Mismatch: hashRecord(CHECKPOINT_34_MISMATCH),
    checkpoint34MismatchManifest: hashRecord(CHECKPOINT_34_MISMATCH_MANIFEST),
    acceptedRetryResult: hashRecord(retryPaths().result),
    originalRunner: hashRecord(ORIGINAL_RUNNER),
    continuationRunner: hashRecord(THIS_RUNNER),
    library: hashRecord(LIB),
    activeBaseHash: ACTIVE_BASE_HASH,
    registry: hashRecord(REGISTRY),
    allocationWal: hashRecord(WAL),
    checkpoint35RegistrySnapshot: fs.existsSync(CHECKPOINT_35_REGISTRY_SNAPSHOT)
      ? hashRecord(CHECKPOINT_35_REGISTRY_SNAPSHOT)
      : null,
    checkpoint35AllocationWalSnapshot: fs.existsSync(CHECKPOINT_35_WAL_SNAPSHOT)
      ? hashRecord(CHECKPOINT_35_WAL_SNAPSHOT)
      : null,
    checkpoint35LogSnapshot: fs.existsSync(CHECKPOINT_35_LOG_SNAPSHOT)
      ? hashRecord(CHECKPOINT_35_LOG_SNAPSHOT)
      : null,
    candidateHypotheses: hashRecord(HYPOTHESES),
    authorizationPrompt: hashRecord(PROMPT),
  };
}

function verifyInitialContinuity(executor) {
  const chain = executor.validateCheckpointChain();
  const current = readJson(CHECKPOINT);
  const numbered35 = readJson(CHECKPOINT_35);
  const numbered34 = readJson(CHECKPOINT_34);
  const { eventSha256, ...checkpoint35WithoutHash } = numbered35;
  const mismatchManifest = verifyManifest(CHECKPOINT_34_MISMATCH_MANIFEST);
  const retry = acceptedRetryState();
  const candidate2 = candidate2Records();
  const ledger = C.reconcileC34AttemptLedger();
  const processState = executor.processAndPortState();
  const gitState = gitAndRuntimeState();
  const hypotheses = readJson(HYPOTHESES);
  const material2 = hypotheses.materialCandidateOrder.filter((record) =>
    record.ordinal === 2 && record.candidateId === CANDIDATE_2_ID);
  const c34Attempts = candidate2.registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const retryRegistry = c34Attempts.filter((attempt) =>
    attempt.attemptId === ACCEPTED_RETRY_ID);
  const retryWalPlans = candidate2.walRows.filter((row) =>
    row.event === 'ALLOCATION_PLANNED' && row.attemptId === ACCEPTED_RETRY_ID);
  const pass =
    sha(fs.readFileSync(CHECKPOINT)) === EXPECTED.checkpoint35
    && sha(fs.readFileSync(CHECKPOINT_35)) === EXPECTED.checkpoint35
    && JSON.stringify(current) === JSON.stringify(numbered35)
    && current.ordinal === 35
    && current.safeToResume === true
    && current.attemptId == null
    && current.activeBaseHash === ACTIVE_BASE_HASH
    && eventSha256 === EXPECTED.checkpoint35Event
    && eventSha256 === sha(Buffer.from(JSON.stringify(checkpoint35WithoutHash)))
    && chain.pass
    && chain.rows === 35
    && chain.sha256 === EXPECTED.checkpointLog35
    && sha(fs.readFileSync(CHECKPOINT_34)) === EXPECTED.checkpoint34
    && sha(fs.readFileSync(CHECKPOINT_34_SNAPSHOT)) === EXPECTED.checkpoint34
    && JSON.stringify(numbered34) === JSON.stringify(readJson(CHECKPOINT_34_SNAPSHOT))
    && sha(fs.readFileSync(CHECKPOINT_34_MISMATCH))
      === EXPECTED.checkpoint34Mismatch
    && sha(fs.readFileSync(CHECKPOINT_34_MISMATCH_MANIFEST))
      === EXPECTED.checkpoint34MismatchManifest
    && mismatchManifest.pass
    && sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner
    && sha(fs.readFileSync(LIB)) === EXPECTED.lib
    && sha(fs.readFileSync(PROMPT)) === EXPECTED.prompt
    && sha(fs.readFileSync(HYPOTHESES)) === EXPECTED.hypotheses
    && sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
    && sha(fs.readFileSync(WAL)) === EXPECTED.wal
    && candidate2.registry.attempts.length === 221
    && c34Attempts.length === 3
    && candidate2.registry.summary.orphan === 0
    && candidate2.registry.summary.dangling === 0
    && candidate2.registry.summary.c34RunningAttemptIds.length === 0
    && candidate2.walRows.length === 10
    && candidate2.directories.length === 3
    && candidate2.registryRecords.length === 0
    && candidate2.walRecords.length === 0
    && candidate2.directoryRecords.length === 0
    && candidate2.checkpointRecords.length === 0
    && material2.length === 1
    && retryRegistry.length === 1
    && retryWalPlans.length === 1
    && ledger.pass
    && ledger.orphan === 0
    && ledger.dangling === 0
    && ledger.running.length === 0
    && processState.processInspectionSucceeded
    && processState.allNodeCommandLinesReadable
    && processState.activeC34RunnerCount === 0
    && processState.netstatInspectionStatus === 0
    && processState.port5173Free
    && temporaryRuntimeDirectories().length === 0
    && gitState.serviceDiff === ''
    && gitState.staging === ''
    && gitState.head === EXPECTED.head
    && gitState.upstream === EXPECTED.head
    && gitState.sync === '0\t0'
    && gitState.c35Items.length === 0
    && gitState.indexLock === false;
  requirePass(pass, 'CHECKPOINT_35_CONTINUITY_MISMATCH');
  return {
    pass,
    chain,
    current,
    mismatchManifest,
    retry,
    candidate2,
    ledger,
    processState,
    gitState,
    material2: material2[0],
    bindings: baselineBindings(),
  };
}

function protectedAcceptedRetryRows(retry, analyze) {
  const sources = [
    ...retry.result.rowLevel.newlyCorrected.map((record) => ({
      category: 'accepted-retry-r3-correction',
      oracleId: record.oracleId,
      query: record.query,
    })),
    ...retry.result.generalization.rows.map((record) => ({
      category: `accepted-retry-packet-${record.category}`,
      oracleId: null,
      query: record.query,
    })),
    ...retry.result.leaveOneFamilyOut.records.map((record) => ({
      category: 'accepted-retry-leave-family-out',
      oracleId: null,
      query: record.query,
    })),
  ];
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

async function runPreflight(executor) {
  const continuity = verifyInitialContinuity(executor);
  if (fs.existsSync(COMPATIBILITY)) {
    const failed = readJson(COMPATIBILITY);
    requirePass(
      fs.existsSync(AUTHORIZATION)
        && fs.existsSync(NON_DUPLICATION)
        && failed.pass === false
        && failed.decision === 'FAIL_NOT_READY_FOR_MATERIAL_CANDIDATE_2',
      'C34_CHECKPOINT35_EXISTING_PREFLIGHT_STATE_INVALID',
    );
    const historic = readJson(HISTORIC_PREALLOCATION);
    const validation = failed.validation;
    const deterministicCandidatePass =
      failed.candidate.candidateId === CANDIDATE_2_ID
      && failed.candidate.semanticBaseHash === ACTIVE_BASE_HASH
      && failed.candidate.candidateIdentity.servicesTreeDigest
        === 'a9b3df0f2e11597bcc05f1074e64df39a3d37213ea0ad780f1cc3c71ce4c1d0a'
      && failed.candidate.candidateIdentity[
        'services/philippine-tax-intent-analyzer.js'
      ].rawSha256
        === '1a1d837ad0f48154c32f13f934b29cf9c8d1c8e14a08b1351f66f67328353971'
      && failed.candidate.candidateIdentity[
        'services/philippine-tax-intent-analyzer.js'
      ].bytes === 181548
      && validation.syntaxStatus === 0
      && validation.metrics.reasonPassed === 3561
      && validation.metrics.reasonMismatches === 159
      && validation.metrics.decisionPassed === 3720
      && validation.metrics.relationPassed === 3720
      && validation.frozenLocksHeld === true
      && validation.newlyCorrected === 5
      && validation.correctRowRegressions === 0
      && validation.wrongToDifferentWrong === 0
      && validation.outsideTarget === 0
      && validation.generalizationPass === true
      && validation.leaveOneFamilyOutPass === true
      && validation.acceptedRetryProtectedRowCounts.r3Corrections === 52
      && validation.acceptedRetryProtectedRowCounts.packet === 41
      && validation.acceptedRetryProtectedRowCounts.leaveFamilyOut === 5
      && validation.acceptedRetryRegressionsZero === true
      && validation.candidateOnlyPatch.sha256
        === historic.isolatedReplaySelfTest.candidatePatchSha256.NT02
      && validation.candidateOnlyPatch.replayPass === true
      && validation.fullHeadPatch.replayPass === true
      && failed.after.candidate2RegistryCount === 0
      && failed.after.candidate2WalCount === 0
      && failed.after.candidate2DirectoryCount === 0;
    requirePass(
      deterministicCandidatePass,
      'C34_CHECKPOINT35_FAILED_PREFLIGHT_NOT_ELIGIBLE_FOR_FALSE_NEGATIVE_REMEDIATION',
    );
    const generatedUtc = failed.generatedUtc;
    const remediation = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      classification: 'CANDIDATE_2_PREFLIGHT_ORCHESTRATOR_FALSE_NEGATIVE',
      originalCompatibility: hashRecord(COMPATIBILITY),
      originalDecisionPreserved: failed.decision,
      cause:
        'A non-authoritative advisory runtime identity supplied during independent review was asserted in the additive orchestrator. The authoritative frozen candidate patch, full semantic gates, accepted-retry preservation, and dual replays all passed.',
      incorrectAdvisoryIdentity: {
        servicesTreeDigest:
          'ae50d4e1b1875320b4ca03c1162f5970931b5f9b71b4511f8966488cd24ccaa5',
        analyzerRawSha256:
          'ff89e030f2e38ad752a79da59f984e68bdd1d4e20a98737e684328bd84f233de',
        analyzerBytes: 181550,
      },
      authoritativeIdentity: failed.candidate.candidateIdentity,
      immutablePreallocationCandidatePatch: {
        artifact: hashRecord(HISTORIC_PREALLOCATION),
        expectedNt02Sha256:
          historic.isolatedReplaySelfTest.candidatePatchSha256.NT02,
        observedSha256: validation.candidateOnlyPatch.sha256,
        exactMatch: true,
      },
      semanticAndReplayEvidencePassed: true,
      candidate2Allocated: false,
      currentContinuationRunner: hashRecord(THIS_RUNNER),
      registry: hashRecord(REGISTRY),
      allocationWal: hashRecord(WAL),
      pass: true,
    };
    writeOnceJson(PREFLIGHT_REMEDIATION, remediation);
    const superseding = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      decision: 'PASS_READY_FOR_MATERIAL_CANDIDATE_2',
      supersedesDecisionArtifact: hashRecord(COMPATIBILITY),
      originalArtifactPreservedUnchanged: true,
      remediation: hashRecord(PREFLIGHT_REMEDIATION),
      authorization: hashRecord(AUTHORIZATION),
      nonDuplicationPreflight: hashRecord(NON_DUPLICATION),
      currentContinuationRunner: hashRecord(THIS_RUNNER),
      frozenOriginalRunner: hashRecord(ORIGINAL_RUNNER),
      frozenLibrary: hashRecord(LIB),
      candidate: failed.candidate,
      validation,
      lateNonDuplication: {
        registryCount: continuity.candidate2.registryRecords.length,
        walCount: continuity.candidate2.walRecords.length,
        directoryCount: continuity.candidate2.directoryRecords.length,
        checkpointCount: continuity.candidate2.checkpointRecords.length,
      },
      bindings: baselineBindings(),
      pass: deterministicCandidatePass,
    };
    writeOnceJson(COMPATIBILITY_SUPERSEDING, superseding);
    return {
      classification: 'CHECKPOINT_35_CONTINUATION_AUTHORIZED',
      authorization: hashRecord(AUTHORIZATION),
      nonDuplication: hashRecord(NON_DUPLICATION),
      originalCompatibility: hashRecord(COMPATIBILITY),
      remediation: hashRecord(PREFLIGHT_REMEDIATION),
      compatibility: hashRecord(COMPATIBILITY_SUPERSEDING),
      decision: superseding.decision,
      idempotent: fs.existsSync(COMPATIBILITY_SUPERSEDING),
      pass: superseding.pass,
    };
  }
  writeOnceBuffer(CHECKPOINT_35_REGISTRY_SNAPSHOT, fs.readFileSync(REGISTRY));
  writeOnceBuffer(CHECKPOINT_35_WAL_SNAPSHOT, fs.readFileSync(WAL));
  writeOnceBuffer(CHECKPOINT_35_LOG_SNAPSHOT, fs.readFileSync(CHECKPOINT_LOG));
  requirePass(
    sha(fs.readFileSync(CHECKPOINT_35_REGISTRY_SNAPSHOT)) === EXPECTED.registry
      && sha(fs.readFileSync(CHECKPOINT_35_WAL_SNAPSHOT)) === EXPECTED.wal
      && sha(fs.readFileSync(CHECKPOINT_35_LOG_SNAPSHOT)) === EXPECTED.checkpointLog35,
    'C34_CHECKPOINT35_HISTORICAL_STATE_SNAPSHOT_INVALID',
  );
  continuity.bindings = baselineBindings();
  const generatedUtc = SESSION_STARTED_UTC;
  const authorization = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: 'CHECKPOINT_35_CONTINUATION_AUTHORIZED',
    startingCheckpoint: 35,
    controllingState: {
      safeToResume: true,
      activeAttemptId: null,
      activeBaseHash: ACTIVE_BASE_HASH,
      checkpoint35EventSha256: EXPECTED.checkpoint35Event,
    },
    preservedHistoricalCheckpoint34: true,
    acceptedRetry: {
      attemptId: ACCEPTED_RETRY_ID,
      disposition: continuity.retry.attempt.disposition,
      resultSha256: EXPECTED.acceptedRetryResult,
      active: false,
      controlling: true,
    },
    candidate2: {
      ordinal: 2,
      candidateId: CANDIDATE_2_ID,
      allocationAuthorizedAfterPreflightPass: true,
    },
    bindings: continuity.bindings,
    pass: true,
  };
  writeOnceJson(AUTHORIZATION, authorization);

  const nonDuplication = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    decision: 'PASS_NO_DUPLICATE_CANDIDATE_2_WORK',
    checkpoint35: hashRecord(CHECKPOINT_35),
    authorization: hashRecord(AUTHORIZATION),
    candidate: continuity.material2,
    duplicateChecks: {
      canonicalRegistry: continuity.candidate2.registryRecords.map((row) => row.attemptId),
      allocationWal: continuity.candidate2.walRecords,
      attemptDirectories: continuity.candidate2.directoryRecords,
      checkpointLog: continuity.candidate2.checkpointRecords,
      hypothesisOrderMatchesExactlyOnce: true,
      acceptedRetryLinkage: {
        attemptId: ACCEPTED_RETRY_ID,
        registryCount: 1,
        plannedWalCount: 1,
        terminalAndNotRunning: true,
      },
    },
    before: {
      registry: hashRecord(REGISTRY),
      allocationWal: hashRecord(WAL),
      attemptDirectoryCount: continuity.candidate2.directories.length,
      checkpointLog: hashRecord(CHECKPOINT_LOG),
    },
    bindings: continuity.bindings,
    pass: true,
  };
  writeOnceJson(NON_DUPLICATION, nonDuplication);

  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tina-c34-checkpoint35-preflight-'),
  );
  const candidateDirectory = path.join(temporaryRoot, 'candidate-2');
  const headDirectory = path.join(temporaryRoot, 'head');
  let compatibility;
  try {
    const candidate = executor.CANDIDATES[1];
    requirePass(
      candidate?.id === CANDIDATE_2_ID && candidate.cycle === 'nt02',
      'C34_CHECKPOINT35_FROZEN_CANDIDATE_2_IDENTITY_INVALID',
    );
    const identity = C.materializeCandidate(
      continuity.retry.active.dir,
      candidateDirectory,
      [candidate.block],
    );
    const syntax = spawnSync(
      process.execPath,
      ['--check', path.join(candidateDirectory, 'philippine-tax-intent-analyzer.js')],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );
    const [baseAnalyze, candidateAnalyze, gates] = await Promise.all([
      C.loadAnalyzerFrom(continuity.retry.active.dir, 'c34-cp35-preflight-base'),
      C.loadAnalyzerFrom(candidateDirectory, 'c34-cp35-preflight-candidate2'),
      C.directGatesForDirectory(candidateDirectory),
    ]);
    const rowLevel = C.collectRows(baseAnalyze, candidateAnalyze);
    const generalization = C.executePacket(candidate, baseAnalyze, candidateAnalyze);
    const leaveOneFamilyOut = C.leaveFamilyOut(candidate, candidateAnalyze);
    const protectedRows = protectedAcceptedRetryRows(continuity.retry, baseAnalyze);
    const acceptedRetryRegressions = protectedRows.flatMap((record) => {
      const actualSignature = C.outputSignature(candidateAnalyze(record.query));
      return actualSignature === record.signature
        ? []
        : [{ ...record, actualSignature }];
    });
    const candidatePatch = C.canonicalPatch(
      continuity.retry.active.dir,
      candidateDirectory,
    );
    const candidateReplay = C.dualEnvironmentReplay(
      continuity.retry.active.dir,
      candidateDirectory,
      candidatePatch,
      'checkpoint35_candidate2_preflight',
      { identityPolicy: 'exact_raw_all', throwOnFailure: false },
    );
    fs.mkdirSync(headDirectory);
    for (const name of L.SERVICES) {
      fs.writeFileSync(
        path.join(headDirectory, name),
        C.gitShowBuffer(C.START_HEAD, `services/${name}`),
      );
    }
    const fullHeadPatch = C.canonicalPatch(headDirectory, candidateDirectory);
    const fullHeadReplay = C.dualEnvironmentReplay(
      headDirectory,
      candidateDirectory,
      fullHeadPatch,
      'checkpoint35_candidate2_full_head_preflight',
      {
        identityPolicy: 'normalized_all_changed_raw_exact',
        throwOnFailure: false,
      },
    );
    compatibility = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      decision: 'PASS_READY_FOR_MATERIAL_CANDIDATE_2',
      authorization: hashRecord(AUTHORIZATION),
      nonDuplicationPreflight: hashRecord(NON_DUPLICATION),
      bindings: continuity.bindings,
      frozenExecutorAdapter: {
        originalRunnerUnchanged: true,
        originalRunnerSha256: EXPECTED.originalRunner,
        continuationRunnerSha256: sha(fs.readFileSync(THIS_RUNNER)),
        libraryUnchanged: true,
        librarySha256: EXPECTED.lib,
        checkpointWritePolicy:
          'temporary adapter routes legacy checkpoint calls through appendIdempotentCheckpoint (numbered -> log -> mutable current)',
      },
      candidate: {
        ordinal: 2,
        cycle: candidate.cycle,
        candidateId: candidate.id,
        semanticBaseAttemptId: ACCEPTED_RETRY_ID,
        semanticBaseHash: continuity.retry.active.identity.servicesTreeDigest,
        candidateIdentity: identity,
      },
      validation: {
        syntaxStatus: syntax.status,
        syntaxStderr: (syntax.stderr || '').trim(),
        metrics: gates.metrics,
        frozenLocksHeld: gates.frozenLocksHeld,
        newlyCorrected: rowLevel.newlyCorrected.length,
        correctRowRegressions: rowLevel.newlyRegressed.length,
        wrongToDifferentWrong: rowLevel.wrongToDifferentWrong.length,
        outsideTarget: rowLevel.outsideTarget.length,
        generalizationPass: generalization.pass,
        leaveOneFamilyOutPass: leaveOneFamilyOut.pass,
        acceptedRetryProtectedRows: protectedRows.length,
        acceptedRetryProtectedRowCounts: {
          r3Corrections: protectedRows.filter((record) =>
            record.category === 'accepted-retry-r3-correction').length,
          packet: protectedRows.filter((record) =>
            record.category.startsWith('accepted-retry-packet-')).length,
          leaveFamilyOut: protectedRows.filter((record) =>
            record.category === 'accepted-retry-leave-family-out').length,
        },
        acceptedRetryRegressionsZero: acceptedRetryRegressions.length === 0,
        acceptedRetryRegressions,
        candidateOnlyPatch: {
          sha256: candidatePatch.sha256,
          headersValid: candidatePatch.headersValid,
          forbiddenPath: candidatePatch.hasForbiddenPath,
          replayPass: candidateReplay.pass,
        },
        fullHeadPatch: {
          sha256: fullHeadPatch.sha256,
          headersValid: fullHeadPatch.headersValid,
          forbiddenPath: fullHeadPatch.hasForbiddenPath,
          replayPass: fullHeadReplay.pass,
        },
      },
      noAttemptAllocated: true,
      pass: false,
    };
    compatibility.pass =
      compatibility.candidate.semanticBaseHash === ACTIVE_BASE_HASH
      && identity.servicesTreeDigest !== ACTIVE_BASE_HASH
      && identity.servicesTreeDigest
        === 'a9b3df0f2e11597bcc05f1074e64df39a3d37213ea0ad780f1cc3c71ce4c1d0a'
      && identity['services/philippine-tax-intent-analyzer.js'].rawSha256
        === '1a1d837ad0f48154c32f13f934b29cf9c8d1c8e14a08b1351f66f67328353971'
      && identity['services/philippine-tax-intent-analyzer.js'].bytes === 181548
      && syntax.status === 0
      && gates.frozenLocksHeld === true
      && gates.metrics.reasonPassed === 3561
      && gates.metrics.reasonMismatches === 159
      && gates.metrics.reasonPassed + gates.metrics.reasonMismatches === 3720
      && gates.metrics.decisionPassed === 3720
      && gates.metrics.relationPassed === 3720
      && rowLevel.newlyCorrected.length === 5
      && rowLevel.newlyRegressed.length === 0
      && rowLevel.wrongToDifferentWrong.length === 0
      && rowLevel.outsideTarget.length === 0
      && generalization.pass
      && leaveOneFamilyOut.pass
      && compatibility.validation.acceptedRetryProtectedRowCounts.r3Corrections === 52
      && compatibility.validation.acceptedRetryProtectedRowCounts.packet === 41
      && compatibility.validation.acceptedRetryProtectedRowCounts.leaveFamilyOut === 5
      && acceptedRetryRegressions.length === 0
      && candidatePatch.pass
      && candidatePatch.sha256
        === 'fe5c97fbe1074f24ef3ec4e5cf37ce55ad65497750161c49500a852579ae6c45'
      && candidateReplay.pass
      && fullHeadPatch.pass
      && fullHeadReplay.pass;
    compatibility.decision = compatibility.pass
      ? 'PASS_READY_FOR_MATERIAL_CANDIDATE_2'
      : 'FAIL_NOT_READY_FOR_MATERIAL_CANDIDATE_2';
  } finally {
    if (fs.existsSync(temporaryRoot)) {
      fs.rmSync(temporaryRoot, { recursive: true, force: false });
    }
  }
  const after = candidate2Records();
  compatibility.after = {
    registry: hashRecord(REGISTRY),
    allocationWal: hashRecord(WAL),
    attemptDirectoryCount: after.directories.length,
    candidate2RegistryCount: after.registryRecords.length,
    candidate2WalCount: after.walRecords.length,
    candidate2DirectoryCount: after.directoryRecords.length,
    temporaryRuntimeDirectories: temporaryRuntimeDirectories(),
  };
  compatibility.pass = compatibility.pass
    && compatibility.after.registry.sha256 === EXPECTED.registry
    && compatibility.after.allocationWal.sha256 === EXPECTED.wal
    && compatibility.after.attemptDirectoryCount === 3
    && compatibility.after.candidate2RegistryCount === 0
    && compatibility.after.candidate2WalCount === 0
    && compatibility.after.candidate2DirectoryCount === 0
    && compatibility.after.temporaryRuntimeDirectories.length === 0;
  compatibility.decision = compatibility.pass
    ? 'PASS_READY_FOR_MATERIAL_CANDIDATE_2'
    : 'FAIL_NOT_READY_FOR_MATERIAL_CANDIDATE_2';
  writeOnceJson(COMPATIBILITY, compatibility);
  requirePass(
    compatibility.decision === 'PASS_READY_FOR_MATERIAL_CANDIDATE_2'
      && compatibility.pass,
    'C34_CHECKPOINT35_CANDIDATE_2_COMPATIBILITY_FAILED',
  );
  return {
    classification: 'CHECKPOINT_35_CONTINUATION_AUTHORIZED',
    authorization: hashRecord(AUTHORIZATION),
    nonDuplication: hashRecord(NON_DUPLICATION),
    compatibility: hashRecord(COMPATIBILITY),
    decision: compatibility.decision,
    pass: true,
  };
}

function verifyPreflightArtifacts() {
  const authorization = readJson(AUTHORIZATION);
  const nonDuplication = readJson(NON_DUPLICATION);
  const originalCompatibility = readJson(COMPATIBILITY);
  const compatibility = fs.existsSync(COMPATIBILITY_SUPERSEDING)
    ? readJson(COMPATIBILITY_SUPERSEDING)
    : originalCompatibility;
  requirePass(
    authorization.pass === true
      && authorization.classification === 'CHECKPOINT_35_CONTINUATION_AUTHORIZED'
      && authorization.controllingState.activeAttemptId == null
      && authorization.controllingState.activeBaseHash === ACTIVE_BASE_HASH
      && nonDuplication.pass === true
      && nonDuplication.decision === 'PASS_NO_DUPLICATE_CANDIDATE_2_WORK'
      && compatibility.pass === true
      && compatibility.decision === 'PASS_READY_FOR_MATERIAL_CANDIDATE_2'
      && (compatibility.currentContinuationRunner?.sha256
        || compatibility.frozenExecutorAdapter?.continuationRunnerSha256)
        === sha(fs.readFileSync(THIS_RUNNER)),
    'C34_CHECKPOINT35_PREFLIGHT_ARTIFACTS_INVALID',
  );
  return {
    authorization,
    nonDuplication,
    originalCompatibility,
    compatibility,
  };
}

async function executeCandidate2(executor) {
  const continuity = verifyInitialContinuity(executor);
  const preflight = verifyPreflightArtifacts();
  const remainingMs = Date.parse(SESSION_HARD_STOP_UTC) - Date.now();
  requirePass(
    remainingMs >= 20 * 60 * 1000,
    'C34_CHECKPOINT35_CANDIDATE_2_ALLOCATION_TIME_MARGIN_NOT_MET',
  );
  return withCandidate2AllocationLock(async () => {
  const before = candidate2Records();
  requirePass(
    before.registryRecords.length === 0
      && before.walRecords.length === 0
      && before.directoryRecords.length === 0
      && before.checkpointRecords.length === 0,
    'C34_CHECKPOINT35_DUPLICATE_CANDIDATE_2_ALLOCATION_REFUSED',
  );
  const baseAnalyze = await C.loadAnalyzerFrom(
    continuity.retry.active.dir,
    'c34-cp35-preservation-base',
  );
  const protectedRows = protectedAcceptedRetryRows(continuity.retry, baseAnalyze);
  const preservation = executor.loadPreservationForRecovery();
  const acceptedR3 = protectedRows.filter((record) =>
    record.category === 'accepted-retry-r3-correction');
  const acceptedPacket = protectedRows.filter((record) =>
    record.category.startsWith('accepted-retry-packet-'));
  const acceptedLfo = protectedRows.filter((record) =>
    record.category === 'accepted-retry-leave-family-out');
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

  let result = null;
  let technicalError = null;
  try {
    result = await executor.runMaterialCandidate(
      executor.CANDIDATES[1],
      2,
      continuity.retry.active,
      preservation,
      { allocationCycle: 'nt02', allocationOrdinal: 2 },
    );
  } catch (error) {
    technicalError = error;
  }
  const after = candidate2Records();
  requirePass(
    after.registryRecords.length === 1
      && after.directoryRecords.length === 1,
    'C34_CHECKPOINT35_CANDIDATE_2_ALLOCATION_CARDINALITY_INVALID',
  );
  const attempt = after.registryRecords[0];
  requirePass(
    attempt.cycle === 'nt02'
      && attempt.attemptOrdinal === 2
      && attempt.retryOf == null
      && ['completed', 'technical_failure', 'transient_failure'].includes(attempt.status),
    'C34_CHECKPOINT35_CANDIDATE_2_ATTEMPT_NOT_TERMINAL',
  );
  const ledger = C.reconcileC34AttemptLedger({ throwOnFailure: false });
  writeOnceJson(CANDIDATE_2_LEDGER, ledger);
  requirePass(
    ledger.pass && ledger.orphan === 0 && ledger.dangling === 0
      && ledger.running.length === 0,
    'C34_CHECKPOINT35_CANDIDATE_2_LEDGER_NOT_RECONCILED',
  );
  if (technicalError) {
    const blocker = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc: now(),
      classification: 'CANDIDATE_2_TECHNICAL_INCOMPLETE',
      attemptId: attempt.attemptId,
      status: attempt.status,
      disposition: attempt.disposition,
      error: technicalError?.stack || String(technicalError),
      activeBaseHash: ACTIVE_BASE_HASH,
      semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
      registry: hashRecord(REGISTRY),
      allocationWal: hashRecord(WAL),
      ledger: hashRecord(CANDIDATE_2_LEDGER),
      pass: true,
    };
    writeOnceJson(CANDIDATE_2_BLOCKER, blocker);
    return blocker;
  }

  requirePass(
    result?.candidateId === CANDIDATE_2_ID
      && result.attemptId === attempt.attemptId,
    'C34_CHECKPOINT35_CANDIDATE_2_RESULT_IDENTITY_INVALID',
  );
  const candidateAnalyze = await C.loadAnalyzerFrom(
    result.dir,
    'c34-cp35-candidate2-regression-validation',
  );
  const regressionRecords = protectedRows.flatMap((record) => {
    const actualSignature = C.outputSignature(candidateAnalyze(record.query));
    return actualSignature === record.signature
      ? []
      : [{ ...record, actualSignature }];
  });
  const regressionValidation = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    candidate2AttemptId: result.attemptId,
    acceptedRetryAttemptId: ACCEPTED_RETRY_ID,
    acceptedRetryResultSha256: EXPECTED.acceptedRetryResult,
    protectedRows: {
      total: protectedRows.length,
      r3Corrections: acceptedR3.length,
      packet: acceptedPacket.length,
      leaveFamilyOut: acceptedLfo.length,
    },
    regressions: regressionRecords,
    pass: regressionRecords.length === 0,
  };
  writeOnceJson(ACCEPTED_RETRY_REGRESSION, regressionValidation);
  requirePass(
    regressionValidation.pass,
    'C34_CHECKPOINT35_ACCEPTED_RETRY_REGRESSION',
  );
  const activeBaseHash = result.accepted
    ? result.candidateIdentity.servicesTreeDigest
    : ACTIVE_BASE_HASH;
  const outcome = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    classification: result.accepted
      ? 'CANDIDATE_2_ACCEPTED_PROMOTED'
      : 'CANDIDATE_2_REJECTED_TERMINAL',
    preflight: {
      authorization: hashRecord(AUTHORIZATION),
      nonDuplication: hashRecord(NON_DUPLICATION),
      originalCompatibility: hashRecord(COMPATIBILITY),
      compatibility: hashRecord(
        fs.existsSync(COMPATIBILITY_SUPERSEDING)
          ? COMPATIBILITY_SUPERSEDING
          : COMPATIBILITY,
      ),
      decision: preflight.compatibility.decision,
    },
    attemptId: result.attemptId,
    candidateId: result.candidateId,
    candidateOrdinal: 2,
    status: attempt.status,
    disposition: result.disposition,
    accepted: result.accepted,
    metricDelta: {
      reasonPassedBefore: 3556,
      reasonPassedAfter: result.metrics.reasonPassed,
      reasonDelta: result.metrics.reasonPassed - 3556,
      remainingBefore: 164,
      remainingAfter: result.metrics.reasonMismatches,
      decisionPassed: result.metrics.decisionPassed,
      relationPassed: result.metrics.relationPassed,
    },
    endingActiveBaseHash: activeBaseHash,
    iterationResult: hashRecord(path.join(ATT, result.attemptId, 'ITERATION_RESULT.json')),
    acceptedRetryRegression: hashRecord(ACCEPTED_RETRY_REGRESSION),
    ledger: hashRecord(CANDIDATE_2_LEDGER),
    registry: hashRecord(REGISTRY),
    allocationWal: hashRecord(WAL),
    pass: true,
  };
  writeOnceJson(CANDIDATE_2_OUTCOME, outcome);
  return outcome;
  });
}

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? recursiveFiles(target) : [target];
  });
}

function safePauseFiles(state) {
  const files = [
    AUTHORIZATION,
    NON_DUPLICATION,
    COMPATIBILITY,
    LOG_PREFIX,
    ENDING_REGISTRY_SNAPSHOT,
    ENDING_WAL_SNAPSHOT,
    HYPOTHESES,
    CHECKPOINT_34,
    CHECKPOINT_34_SNAPSHOT,
    CHECKPOINT_34_MISMATCH,
    CHECKPOINT_34_MISMATCH_MANIFEST,
    CHECKPOINT_35,
    CHECKPOINT_35_REGISTRY_SNAPSHOT,
    CHECKPOINT_35_WAL_SNAPSHOT,
    CHECKPOINT_35_LOG_SNAPSHOT,
    ORIGINAL_RUNNER,
    LIB,
    THIS_RUNNER,
    PROMPT,
    retryPaths().attempt,
    retryPaths().result,
  ];
  for (const optional of [
    PREFLIGHT_REMEDIATION,
    COMPATIBILITY_SUPERSEDING,
    ACCEPTED_RETRY_REGRESSION,
    CANDIDATE_2_LEDGER,
    CANDIDATE_2_OUTCOME,
    CANDIDATE_2_BLOCKER,
  ]) {
    if (fs.existsSync(optional)) files.push(optional);
  }
  if (state.attempt) {
    files.push(...recursiveFiles(path.join(ATT, state.attempt.attemptId)));
  }
  return [...new Set(files.map((file) => path.resolve(file)))]
    .sort((first, second) => rel(first).localeCompare(rel(second)));
}

function createOrVerifySafePauseManifest(state) {
  if (fs.existsSync(SAFE_PAUSE_MANIFEST)) {
    const verification = verifyManifest(SAFE_PAUSE_MANIFEST);
    requirePass(verification.pass, 'C34_CHECKPOINT35_SAFE_PAUSE_MANIFEST_INVALID');
    return verification;
  }
  const files = safePauseFiles(state);
  const text = `${files.map((file) => `${sha(fs.readFileSync(file))}  ${rel(file)}`)
    .join('\n')}\n`;
  writeOnceBuffer(SAFE_PAUSE_MANIFEST, Buffer.from(text));
  const verification = verifyManifest(SAFE_PAUSE_MANIFEST);
  requirePass(verification.pass, 'C34_CHECKPOINT35_SAFE_PAUSE_MANIFEST_CREATE_FAILED');
  return verification;
}

function currentCandidate2TerminalState() {
  const state = candidate2Records();
  requirePass(state.registryRecords.length <= 1,
    'C34_CHECKPOINT35_MULTIPLE_CANDIDATE_2_ATTEMPTS');
  const attempt = state.registryRecords[0] || null;
  if (!attempt) {
    return {
      records: state,
      attempt: null,
      result: null,
      classification: 'ONE_HOUR_SAFE_PAUSE_POST_PREFLIGHT',
      activeBaseHash: ACTIVE_BASE_HASH,
      metrics: {
        reasonPassed: 3556,
        reasonTotal: 3720,
        remainingReasonMismatches: 164,
        decisionPassed: 3720,
        decisionTotal: 3720,
        relationPassed: 3720,
        relationTotal: 3720,
      },
      blocker: null,
    };
  }
  requirePass(
    ['completed', 'technical_failure', 'transient_failure'].includes(attempt.status),
    'C34_CHECKPOINT35_CANDIDATE_2_STILL_RUNNING',
  );
  const resultPath = path.join(ATT, attempt.attemptId, 'ITERATION_RESULT.json');
  const result = fs.existsSync(resultPath) ? readJson(resultPath) : null;
  if (attempt.status !== 'completed' || result == null) {
    return {
      records: state,
      attempt,
      result,
      classification: 'ONE_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER',
      activeBaseHash: ACTIVE_BASE_HASH,
      metrics: {
        reasonPassed: 3556,
        reasonTotal: 3720,
        remainingReasonMismatches: 164,
        decisionPassed: 3720,
        decisionTotal: 3720,
        relationPassed: 3720,
        relationTotal: 3720,
      },
      blocker: 'CANDIDATE_2_TECHNICAL_INCOMPLETE',
    };
  }
  const acceptedBaseHash = result.accepted
    ? result.candidateIdentity.servicesTreeDigest
    : ACTIVE_BASE_HASH;
  const acceptedMetrics = result.accepted
    ? {
      reasonPassed: result.metrics.reasonPassed,
      reasonTotal: 3720,
      remainingReasonMismatches: result.metrics.reasonMismatches,
      decisionPassed: result.metrics.decisionPassed,
      decisionTotal: 3720,
      relationPassed: result.metrics.relationPassed,
      relationTotal: 3720,
    }
    : {
      reasonPassed: 3556,
      reasonTotal: 3720,
      remainingReasonMismatches: 164,
      decisionPassed: 3720,
      decisionTotal: 3720,
      relationPassed: 3720,
      relationTotal: 3720,
    };
  let evidenceComplete = false;
  if (
    fs.existsSync(CANDIDATE_2_LEDGER)
    && fs.existsSync(ACCEPTED_RETRY_REGRESSION)
    && fs.existsSync(CANDIDATE_2_OUTCOME)
  ) {
    const ledger = readJson(CANDIDATE_2_LEDGER);
    const regression = readJson(ACCEPTED_RETRY_REGRESSION);
    const outcome = readJson(CANDIDATE_2_OUTCOME);
    evidenceComplete =
      ledger.pass === true
      && ledger.orphan === 0
      && ledger.dangling === 0
      && ledger.running.length === 0
      && regression.pass === true
      && regression.candidate2AttemptId === attempt.attemptId
      && regression.acceptedRetryAttemptId === ACCEPTED_RETRY_ID
      && outcome.pass === true
      && outcome.attemptId === attempt.attemptId
      && outcome.disposition === attempt.disposition
      && outcome.endingActiveBaseHash === acceptedBaseHash
      && outcome.iterationResult.sha256 === sha(fs.readFileSync(resultPath));
  }
  if (!evidenceComplete) {
    return {
      records: state,
      attempt,
      result,
      classification: 'ONE_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER',
      activeBaseHash: acceptedBaseHash,
      metrics: acceptedMetrics,
      blocker: 'CANDIDATE_2_TERMINAL_EVIDENCE_INCOMPLETE',
    };
  }
  return {
    records: state,
    attempt,
    result,
    classification: 'ONE_HOUR_SAFE_PAUSE_AFTER_CANDIDATE_2',
    activeBaseHash: acceptedBaseHash,
    metrics: acceptedMetrics,
    blocker: null,
  };
}

function verifySafePauseLiveState(executor, state) {
  const ledger = C.reconcileC34AttemptLedger();
  const checkpoint34HistoricalManifest = verifyCheckpoint34ManifestHistorically();
  const processState = executor.processAndPortState();
  const gitState = gitAndRuntimeState();
  const temporary = temporaryRuntimeDirectories();
  requirePass(
    ledger.pass
      && ledger.orphan === 0
      && ledger.dangling === 0
      && ledger.running.length === 0
      && processState.processInspectionSucceeded
      && processState.allNodeCommandLinesReadable
      && processState.activeC34RunnerCount === 0
      && processState.netstatInspectionStatus === 0
      && processState.port5173Free
      && temporary.length === 0
      && gitState.serviceDiff === ''
      && gitState.staging === ''
      && gitState.head === EXPECTED.head
      && gitState.upstream === EXPECTED.head
      && gitState.sync === '0\t0'
      && gitState.c35Items.length === 0
      && gitState.indexLock === false
      && !fs.existsSync(CANDIDATE_2_ALLOCATION_LOCK)
      && checkpoint34HistoricalManifest.pass
      && gitState.liveServices.servicesTreeDigest
        === '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201'
      && (state.attempt == null
        || state.records.registryRecords.length === 1
          && state.records.directoryRecords.length === 1),
    'C34_CHECKPOINT35_SAFE_PAUSE_RECONCILIATION_FAILED',
  );
  return {
    ledger,
    processState,
    gitState,
    temporary,
    checkpoint34HistoricalManifest,
  };
}

function appendFinalSafeCheckpoint(pause) {
  const ordinal = pause.checkpointPlan.ordinal;
  const artifactPaths = pause.checkpointPlan.artifactPaths.map((file) =>
    path.isAbsolute(file) ? file : path.resolve(C.REPO, file));
  for (const file of artifactPaths) {
    requirePass(fs.existsSync(file), `C34_CHECKPOINT35_FINAL_ARTIFACT_MISSING_${rel(file)}`);
  }
  const logBytes = fs.readFileSync(CHECKPOINT_LOG);
  const lines = logBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  requirePass(
    lines.length === ordinal - 1 || lines.length === ordinal,
    `C34_CHECKPOINT35_FINAL_LOG_ROWS_${lines.length}_EXPECTED_${ordinal - 1}_OR_${ordinal}`,
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
    candidate2: pause.candidate2,
    attemptDispositions: pause.attemptDispositions,
    reconciliation: {
      registrySha256: pause.registry.sha256,
      allocationWalSha256: pause.allocationWal.sha256,
      endingRegistrySnapshotSha256: pause.endingRegistrySnapshot.sha256,
      endingAllocationWalSnapshotSha256: pause.endingAllocationWalSnapshot.sha256,
      attemptDirectoryCount: pause.attemptDirectoryCount,
      ledger: pause.reconciliation,
    },
    processState: pause.processState,
    temporaryRuntimeState: pause.temporaryRuntimeState,
    serviceStagingState: pause.serviceStagingState,
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
  if (lines.length === ordinal) {
    const existing = JSON.parse(lines[ordinal - 1]);
    requirePass(
      JSON.stringify(existing) === JSON.stringify(event),
      'C34_CHECKPOINT35_FINAL_EXISTING_LOG_EVENT_DIFFERS',
    );
    requirePass(
      fs.existsSync(numbered)
        && JSON.stringify(readJson(numbered)) === JSON.stringify(event),
      'C34_CHECKPOINT35_FINAL_EXISTING_NUMBERED_DIFFERS',
    );
    const current = readJson(CHECKPOINT);
    const previous = ordinal > 1 ? JSON.parse(lines[ordinal - 2]) : null;
    requirePass(
      JSON.stringify(current) === JSON.stringify(event)
        || JSON.stringify(current) === JSON.stringify(previous),
      'C34_CHECKPOINT35_FINAL_CURRENT_RECOVERY_CONFLICT',
    );
    if (JSON.stringify(current) !== JSON.stringify(event)) {
      writeMutableJson(CHECKPOINT, event);
    }
    return { event, numbered, appended: false };
  }
  const previous = lines.length ? JSON.parse(lines.at(-1)) : null;
  requirePass(
    JSON.stringify(readJson(CHECKPOINT)) === JSON.stringify(previous),
    'C34_CHECKPOINT35_FINAL_CURRENT_NOT_AT_PRIOR_TIP',
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

function safePause(executor) {
  if (fs.existsSync(SAFE_PAUSE)) {
    const pause = readJson(SAFE_PAUSE);
    const state = currentCandidate2TerminalState();
    const live = verifySafePauseLiveState(executor, state);
    const manifest = createOrVerifySafePauseManifest(state);
    requirePass(
      pause.pass === true
        && pause.safeToResume === true
        && pause.activeAttemptId == null
        && pause.activeBaseHash === state.activeBaseHash
        && pause.classification === state.classification
        && pause.registry.sha256 === sha(fs.readFileSync(REGISTRY))
        && pause.allocationWal.sha256 === sha(fs.readFileSync(WAL))
        && pause.endingRegistrySnapshot.sha256
          === sha(fs.readFileSync(ENDING_REGISTRY_SNAPSHOT))
        && pause.endingAllocationWalSnapshot.sha256
          === sha(fs.readFileSync(ENDING_WAL_SNAPSHOT))
        && manifest.pass,
      'C34_CHECKPOINT35_EXISTING_SAFE_PAUSE_INVALID',
    );
    const checkpointResult = appendFinalSafeCheckpoint(pause);
    return {
      classification: pause.classification,
      checkpoint: checkpointResult.event,
      idempotent: !checkpointResult.appended,
      manifest: manifest.manifest,
      live,
      pass: true,
    };
  }
  const state = currentCandidate2TerminalState();
  const live = verifySafePauseLiveState(executor, state);
  const checkpointBefore = readJson(CHECKPOINT);
  const chainBefore = executor.validateCheckpointChain();
  requirePass(
    chainBefore.pass && checkpointBefore.ordinal === chainBefore.rows,
    'C34_CHECKPOINT35_SAFE_PAUSE_CHECKPOINT_NOT_AT_TIP',
  );
  writeOnceBuffer(LOG_PREFIX, fs.readFileSync(CHECKPOINT_LOG));
  writeOnceBuffer(ENDING_REGISTRY_SNAPSHOT, fs.readFileSync(REGISTRY));
  writeOnceBuffer(ENDING_WAL_SNAPSHOT, fs.readFileSync(WAL));
  const manifest = createOrVerifySafePauseManifest(state);
  const checkpointOrdinal = chainBefore.rows + 1;
  const nextExactOperation = state.attempt == null
    ? `Resume from checkpoint ${checkpointOrdinal}. Reverify the checkpoint-35 authorization and non-duplication evidence, then allocate exactly one material candidate-2 attempt only if at least 20 minutes remain.`
    : state.classification === 'ONE_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
      ? `Resume from checkpoint ${checkpointOrdinal}. Forensically adjudicate the terminal candidate-2 technical failure; do not allocate candidate 2 again or begin candidate 3.`
      : `Resume from checkpoint ${checkpointOrdinal}. Preserve terminal candidate 2 and the exact active base, then execute material candidate 3 once; do not rerun candidates 1 or 2.`;
  const artifactPaths = [
    SAFE_PAUSE,
    SAFE_PAUSE_MANIFEST,
    LOG_PREFIX,
    AUTHORIZATION,
    NON_DUPLICATION,
    COMPATIBILITY,
    ...(fs.existsSync(PREFLIGHT_REMEDIATION) ? [PREFLIGHT_REMEDIATION] : []),
    ...(fs.existsSync(COMPATIBILITY_SUPERSEDING)
      ? [COMPATIBILITY_SUPERSEDING]
      : []),
    CHECKPOINT_35_REGISTRY_SNAPSHOT,
    CHECKPOINT_35_WAL_SNAPSHOT,
    CHECKPOINT_35_LOG_SNAPSHOT,
    ENDING_REGISTRY_SNAPSHOT,
    ENDING_WAL_SNAPSHOT,
    ...(fs.existsSync(CANDIDATE_2_OUTCOME) ? [CANDIDATE_2_OUTCOME] : []),
    ...(fs.existsSync(CANDIDATE_2_BLOCKER) ? [CANDIDATE_2_BLOCKER] : []),
    ...(fs.existsSync(CANDIDATE_2_LEDGER) ? [CANDIDATE_2_LEDGER] : []),
    ...(fs.existsSync(ACCEPTED_RETRY_REGRESSION)
      ? [ACCEPTED_RETRY_REGRESSION]
      : []),
    ...(state.result
      ? [path.join(ATT, state.attempt.attemptId, 'ITERATION_RESULT.json')]
      : []),
  ];
  const attempts = state.records.registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-')).map((attempt) => ({
    attemptId: attempt.attemptId,
    cycle: attempt.cycle,
    status: attempt.status,
    disposition: attempt.disposition,
    controlling: attempt.controlling,
    activeRunningAttempt: false,
  }));
  const pause = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    elapsedMs: Date.now() - Date.parse(SESSION_STARTED_UTC),
    timebox: {
      startedUtc: SESSION_STARTED_UTC,
      hardStopUtc: SESSION_HARD_STOP_UTC,
      stoppedBeforeHardLimit: Date.now() <= Date.parse(SESSION_HARD_STOP_UTC),
    },
    classification: state.classification,
    stage: 'checkpoint 35 continuation one-hour safe pause',
    status: state.classification,
    safeToResume: true,
    activeAttemptId: null,
    activeBaseHash: state.activeBaseHash,
    currentMetrics: state.metrics,
    candidate2: state.attempt == null
      ? { allocated: false, attemptId: null, disposition: null }
      : {
        allocated: true,
        attemptId: state.attempt.attemptId,
        status: state.attempt.status,
        disposition: state.attempt.disposition,
        accepted: state.result?.accepted ?? null,
      },
    attemptDispositions: attempts,
    completedArtifactHashes: manifest.records.map((record) => ({
      path: record.path,
      sha256: record.actualSha256,
    })),
    evidenceManifest: manifest.manifest,
    checkpointBefore,
    checkpointChainBefore: {
      rows: chainBefore.rows,
      sha256: chainBefore.sha256,
      pass: chainBefore.pass,
    },
    checkpointPlan: {
      ordinal: checkpointOrdinal,
      stage: 'checkpoint 35 continuation one-hour safe pause',
      artifactPaths: artifactPaths.map(rel),
    },
    reconciliation: live.ledger,
    checkpoint34HistoricalManifest: live.checkpoint34HistoricalManifest,
    registry: hashRecord(REGISTRY),
    allocationWal: hashRecord(WAL),
    endingRegistrySnapshot: hashRecord(ENDING_REGISTRY_SNAPSHOT),
    endingAllocationWalSnapshot: hashRecord(ENDING_WAL_SNAPSHOT),
    attemptDirectoryCount: state.records.directories.length,
    processState: live.processState,
    temporaryRuntimeState: {
      directories: live.temporary,
      temporaryCandidateInstalled: false,
      restorationRequired: false,
      restorationAction: 'NO_WRITE_REQUIRED',
    },
    serviceStagingState: {
      serviceDiff: live.gitState.serviceDiff,
      stagedDiff: live.gitState.staging,
      head: live.gitState.head,
      upstream: live.gitState.upstream,
      sync: live.gitState.sync,
      commitOccurred: false,
      pushOccurredOrSyncChanged: false,
      c35Items: live.gitState.c35Items,
    },
    blocker: state.blocker,
    nextExactOperation,
    pass: true,
  };
  writeOnceJson(SAFE_PAUSE, pause);
  const checkpointResult = appendFinalSafeCheckpoint(pause);
  const chainAfter = executor.validateCheckpointChain();
  requirePass(
    chainAfter.pass
      && chainAfter.rows === checkpointOrdinal
      && checkpointResult.event.safeToResume === true
      && checkpointResult.event.attemptId == null
      && checkpointResult.event.activeAttemptId == null,
    'C34_CHECKPOINT35_FINAL_SAFE_CHECKPOINT_INVALID',
  );
  return {
    classification: pause.classification,
    checkpoint: checkpointResult.event,
    idempotent: false,
    manifest: manifest.manifest,
    pass: true,
  };
}

async function main() {
  const modes = ['--preflight', '--candidate2', '--safe-pause']
    .filter((mode) => process.argv.includes(mode));
  requirePass(modes.length === 1, 'C34_CHECKPOINT35_EXACTLY_ONE_MODE_REQUIRED');
  const executor = await loadFrozenExecutor();
  let result;
  if (modes[0] === '--preflight') {
    result = await runPreflight(executor);
  } else if (modes[0] === '--candidate2') {
    result = await executeCandidate2(executor);
  } else {
    result = safePause(executor);
  }
  console.log(JSON.stringify(result, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}
