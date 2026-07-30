// PHASE-10A14-R20 COMMIT 5R1-C34
// Recovery-aware, one-hour continuation from reconciled checkpoint 37.
// This additive runner may execute only frozen material candidate 3.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
const LIB = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
);
const THIS_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-checkpoint37-continue.mjs',
);
const PROMPT = path.resolve(
  'C:/Projects/tina-execution-prompts/'
    + 'PHASE-10A14-R20-COMMIT-5R1-C34-ONE-HOUR-CONTINUATION-FROM-CHECKPOINT-37.md',
);

const REGISTRY = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
const WAL = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
const CHECKPOINT = path.join(RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT.json');
const CHECKPOINT_LOG = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson',
);
const CHECKPOINT_37 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_37_checkpoint_35_continuation_one_hour_safe_pause.json',
);
const CHECKPOINT_37_SAFE_PAUSE = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_SAFE_PAUSE.json',
);
const CHECKPOINT_37_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_35_CONTINUATION_SAFE_PAUSE_EVIDENCE.sha256',
);

const AUTHORIZATION = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_AUTHORIZATION.json',
);
const NON_DUPLICATION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_3_NON_DUPLICATION_PREFLIGHT.json',
);
const COMPATIBILITY = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_3_RESUME_COMPATIBILITY_VALIDATION.json',
);
const CHECKPOINT_37_REGISTRY_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const CHECKPOINT_37_WAL_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const CHECKPOINT_37_LOG_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_RECOVERY_CHECKPOINT_LOG_SNAPSHOT.ndjson',
);
const CANDIDATE_3_LOCK = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_3_ALLOCATION.lock',
);
const CANDIDATE_3_LEDGER = path.join(
  RES,
  'COMMIT_5R1C34_ATTEMPT_LEDGER_AFTER_CANDIDATE_3.json',
);
const PRIOR_ACCEPTED_REGRESSION = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_3_ACCEPTED_CANDIDATES_1_AND_2_REGRESSION_VALIDATION.json',
);
const CANDIDATE_3_OUTCOME = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_3_CONTINUATION_RESULT.json',
);
const ENDING_REGISTRY_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_ENDING_CANONICAL_ATTEMPT_REGISTRY_SNAPSHOT.json',
);
const ENDING_WAL_SNAPSHOT = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_ENDING_ATTEMPT_ALLOCATION_WAL_SNAPSHOT.ndjson',
);
const LOG_PREFIX = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_LOG_PREFIX.ndjson',
);
const SAFE_PAUSE_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_SAFE_PAUSE_EVIDENCE.sha256',
);
const SAFE_PAUSE = path.join(
  RES,
  'COMMIT_5R1C34_CHECKPOINT_37_CONTINUATION_SAFE_PAUSE.json',
);

const SESSION_STARTED_UTC = '2026-07-29T23:21:46.2671751Z';
const SESSION_HARD_STOP_UTC = '2026-07-30T00:21:46.2671751Z';
const ACTIVE_BASE_HASH =
  'a9b3df0f2e11597bcc05f1074e64df39a3d37213ea0ad780f1cc3c71ce4c1d0a';
const ACCEPTED_CANDIDATE_1_ATTEMPT =
  'R20-domain_campaign-commit5r1c34-nt01-retry01-ord02-2026-07-29T05-00-15-739Z';
const ACCEPTED_CANDIDATE_2_ATTEMPT =
  'R20-domain_campaign-commit5r1c34-nt02-ord02-2026-07-29T12-40-28-807Z';
const CANDIDATE_3_ID =
  'C34-TX01-copular-resolved-tax-topic-is-explicit-tax-task';

const EXPECTED = Object.freeze({
  head: '7c95019622d7174c8b1fd258b9a10137e59feb57',
  checkpoint37:
    'd6cbb43ac59a78be7d5ced62f7bd824db216a7e7ca16d03b9e963c922293c08e',
  checkpoint37Event:
    'e0b2507d83e254d9fecee9caa3573abb9d67fe9f51537b032792d405a11b95d7',
  checkpointLog37:
    'cb0562e5375d183fcb02531e872c31562d6b3d9a861d0a77124a6c039a0f1395',
  checkpoint37Manifest:
    '97585e7d4c5ce8ee59b8452adc5b8ab6d0745e34a922727802bd1e5631ba7f9a',
  checkpoint37SafePause:
    '47fbcbfe650da1ec1c04fc6d866d137802ede0b59b6e505c7e0a789661122a15',
  registry:
    '1c917a8790bde86bf27ddd3ad64a5cedfb55b784e636c09be415c8cd33af5ae8',
  wal: 'c2196d52a41df1244cadbb5efa53def75a0bba6973bc3fcf00196b66b887a68c',
  originalRunner:
    'a38759fbde67e67b06e0165fcbb8ef97f5163e4f6c8aa08e951ab05dec3b4b5e',
  checkpoint35Runner:
    '26305e423710262a890c3bd5434fc6b57784c792be4b375ae8335f71a8f290c5',
  lib: 'dd3bd236eee0dd515146ac20314b3678b87cbca4d907e0225fdeec8a16431298',
  prompt:
    '75ef9f253cc60d9ed06c0dd64d926b1ce9da31ae21253c5d3606ea7e2bde1fc0',
  candidate1Result:
    '209fd7a60b5854139559db2c66809d3560b7da1f1ef7677b9eb4c2075e482054',
  candidate2Result:
    '22a6606b4daf3a02d26137ffd0d3f9d4be63795c6fa12700de849e02ffb3b065',
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
      `C34_CHECKPOINT37_EXISTING_EVIDENCE_DIFFERS_${rel(absolute)}`,
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
    `${absolute}.c34-cp37-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, absolute);
}

function parseNdjson(file) {
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function verifyManifest(file, substitutions = new Map()) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    requirePass(match, `C34_CHECKPOINT37_MANIFEST_LINE_INVALID_${line}`);
    const target = substitutions.get(match[2])
      || (path.isAbsolute(match[2]) ? path.resolve(match[2]) : path.resolve(match[2]));
    const exists = fs.existsSync(target);
    const actualSha256 = exists ? sha(fs.readFileSync(target)) : null;
    return {
      manifestPath: match[2],
      target: rel(target),
      expectedSha256: match[1],
      actualSha256,
      exists,
      substituted: substitutions.has(match[2]),
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

function removeOwnedTemp(directory, prefix) {
  const absolute = path.resolve(directory);
  const roots = [...new Set([os.tmpdir(), 'C:/Temp'].map((root) => path.resolve(root)))];
  const ownedRoot = roots.some((root) =>
    absolute.startsWith(`${root}${path.sep}`)
      && path.basename(absolute).startsWith(prefix));
  requirePass(ownedRoot, `C34_CHECKPOINT37_REFUSE_TEMP_REMOVAL_${absolute}`);
  if (fs.existsSync(absolute)) fs.rmSync(absolute, { recursive: true, force: true });
}

function temporaryRuntimeDirectories() {
  const prefixes = [
    'tina-c34-candidate-',
    'tina-c34-checkpoint37-',
    'tina-c34-cp37-',
    'tina-c34-checkpoint35-adapter-',
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
  const c35Items = status.split(/\r?\n/).filter((line) =>
    /5R1C35|commit5r1c35/i.test(line));
  return {
    serviceDiff,
    stagedDiff,
    head,
    upstream,
    sync,
    c35Items,
    indexLock: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    liveServices: C.liveRuntimeIdentity(),
  };
}

async function loadFrozenExecutor() {
  requirePass(
    sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner,
    'C34_CHECKPOINT37_FROZEN_EXECUTOR_DRIFT',
  );
  requirePass(
    sha(fs.readFileSync(LIB)) === EXPECTED.lib,
    'C34_CHECKPOINT37_FROZEN_LIBRARY_DRIFT',
  );
  const source = fs.readFileSync(ORIGINAL_RUNNER, 'utf8');
  const marker = '\nasync function main() {';
  const markerIndex = source.indexOf(marker);
  requirePass(markerIndex > 0, 'C34_CHECKPOINT37_EXECUTOR_ADAPTER_MARKER_MISSING');
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
    'C34_CHECKPOINT37_CHECKPOINT_ADAPTER_MARKERS_MISSING',
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
    'C34_CHECKPOINT37_IDEMPOTENT_ADAPTER_MARKERS_MISSING',
  );
  const appendBlock = adaptedPrefix.slice(appendStart, appendEnd);
  const appendWithActive = appendBlock.replace(
    '\n    attemptId,\n    artifactHashes:',
    '\n    attemptId,\n    activeAttemptId: attemptId,\n    artifactHashes:',
  );
  requirePass(
    appendWithActive !== appendBlock,
    'C34_CHECKPOINT37_ACTIVE_ATTEMPT_ADAPTER_FAILED',
  );
  const adapted =
    adaptedPrefix.slice(0, appendStart)
    + appendWithActive
    + adaptedPrefix.slice(appendEnd)
    + `
export {
  CANDIDATES,
  appendIdempotentCheckpoint,
  loadPreservationForRecovery,
  processAndPortState,
  runMaterialCandidate,
  validateCheckpointChain,
};
`;
  const temporary = path.join(
    os.tmpdir(),
    `tina-c34-checkpoint37-adapter-${process.pid}-`
      + `${crypto.randomBytes(6).toString('hex')}.mjs`,
  );
  fs.writeFileSync(temporary, adapted, { flag: 'wx' });
  try {
    return await import(`${pathToFileURL(temporary).href}?sha=${sha(Buffer.from(adapted))}`);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function candidate3Records() {
  const registry = readJson(REGISTRY);
  const walRows = parseNdjson(WAL);
  const checkpointRows = parseNdjson(CHECKPOINT_LOG);
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const isCandidate3Id = (attemptId) =>
    typeof attemptId === 'string' && /-tx01-/.test(attemptId);
  return {
    registry,
    walRows,
    checkpointRows,
    directories,
    registryRecords: registry.attempts.filter((attempt) =>
      attempt.cycle === 'tx01' || isCandidate3Id(attempt.attemptId)),
    walRecords: walRows.filter((row) => isCandidate3Id(row.attemptId)),
    directoryRecords: directories.filter(isCandidate3Id),
    checkpointRecords: checkpointRows.filter((event) =>
      isCandidate3Id(event.attemptId) || isCandidate3Id(event.activeAttemptId)),
  };
}

function acceptedAttempt(attemptId, expectedResultSha256, expectedCandidateId) {
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
    `C34_CHECKPOINT37_ACCEPTED_ATTEMPT_INVALID_${attemptId}`,
  );
  requirePass(
    sha(fs.readFileSync(resultFile)) === expectedResultSha256
      && result.attemptId === attemptId
      && result.candidateId === expectedCandidateId
      && result.accepted === true
      && result.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
      && C.sameRuntime(identity, result.candidateIdentity),
    `C34_CHECKPOINT37_ACCEPTED_RESULT_INVALID_${attemptId}`,
  );
  return {
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

function acceptedCandidates() {
  const candidate1 = acceptedAttempt(
    ACCEPTED_CANDIDATE_1_ATTEMPT,
    EXPECTED.candidate1Result,
    'C34-NT01-typed-ordinary-domain-inquiry-without-operation-is-no-tax-relation',
  );
  const candidate2 = acceptedAttempt(
    ACCEPTED_CANDIDATE_2_ATTEMPT,
    EXPECTED.candidate2Result,
    'C34-NT02-local-identifier-redefinition-is-explicit-non-tax-task',
  );
  requirePass(
    candidate1.result.metrics.reasonPassed === 3556
      && candidate1.result.metrics.reasonMismatches === 164
      && candidate2.result.metrics.reasonPassed === 3561
      && candidate2.result.metrics.reasonMismatches === 159
      && candidate2.result.metrics.decisionPassed === 3720
      && candidate2.result.metrics.relationPassed === 3720
      && candidate2.active.identity.servicesTreeDigest === ACTIVE_BASE_HASH,
    'C34_CHECKPOINT37_ACCEPTED_CANDIDATE_METRIC_OR_BASE_DRIFT',
  );
  return { candidate1, candidate2 };
}

function materialCandidate3Hypothesis() {
  const hypothesisFile = path.join(RES, 'COMMIT_5R1C34_CANDIDATE_HYPOTHESES.json');
  const hypotheses = readJson(hypothesisFile);
  const records = hypotheses.materialCandidateOrder.filter((record) =>
    record.ordinal === 3 && record.candidateId === CANDIDATE_3_ID);
  requirePass(
    hypotheses.pass === true
      && hypotheses.materialCandidateBudget === 6
      && records.length === 1,
    'C34_CHECKPOINT37_FROZEN_CANDIDATE_3_HYPOTHESIS_INVALID',
  );
  return { file: hypothesisFile, record: records[0] };
}

function previewCandidate3(executor, active) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tina-c34-cp37-candidate3-preview-'),
  );
  const runtime = path.join(temporaryRoot, 'runtime');
  try {
    const candidate = executor.CANDIDATES[2];
    requirePass(
      candidate.id === CANDIDATE_3_ID
        && candidate.cycle === 'tx01'
        && candidate.forecastCorrections === 4,
      'C34_CHECKPOINT37_FROZEN_CANDIDATE_3_CONTRACT_DRIFT',
    );
    const identity = C.materializeCandidate(active.dir, runtime, [candidate.block]);
    const patch = C.canonicalPatch(active.dir, runtime);
    requirePass(
      patch.pass
        && identity.servicesTreeDigest !== active.identity.servicesTreeDigest,
      'C34_CHECKPOINT37_CANDIDATE_3_PREVIEW_INVALID',
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
    removeOwnedTemp(temporaryRoot, 'tina-c34-cp37-candidate3-preview-');
  }
}

function verifyInitialContinuity(executor) {
  const current = readJson(CHECKPOINT);
  const numbered = readJson(CHECKPOINT_37);
  const { eventSha256, ...withoutHash } = numbered;
  const chain = executor.validateCheckpointChain();
  const manifest = verifyManifest(CHECKPOINT_37_MANIFEST);
  const state = candidate3Records();
  const accepted = acceptedCandidates();
  const hypothesis = materialCandidate3Hypothesis();
  const ledger = C.reconcileC34AttemptLedger();
  const processState = executor.processAndPortState();
  const repository = gitState();
  const temporary = temporaryRuntimeDirectories();
  const c34Attempts = state.registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const preview = previewCandidate3(executor, accepted.candidate2.active);
  const pass =
    sha(fs.readFileSync(CHECKPOINT)) === EXPECTED.checkpoint37
    && sha(fs.readFileSync(CHECKPOINT_37)) === EXPECTED.checkpoint37
    && JSON.stringify(current) === JSON.stringify(numbered)
    && current.ordinal === 37
    && current.safeToResume === true
    && current.attemptId == null
    && current.activeAttemptId == null
    && current.activeBaseHash === ACTIVE_BASE_HASH
    && eventSha256 === EXPECTED.checkpoint37Event
    && eventSha256 === sha(Buffer.from(JSON.stringify(withoutHash)))
    && chain.pass
    && chain.rows === 37
    && chain.sha256 === EXPECTED.checkpointLog37
    && sha(fs.readFileSync(CHECKPOINT_LOG)) === EXPECTED.checkpointLog37
    && sha(fs.readFileSync(CHECKPOINT_37_MANIFEST)) === EXPECTED.checkpoint37Manifest
    && sha(fs.readFileSync(CHECKPOINT_37_SAFE_PAUSE)) === EXPECTED.checkpoint37SafePause
    && manifest.pass
    && manifest.records.length === 55
    && sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
    && sha(fs.readFileSync(WAL)) === EXPECTED.wal
    && sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner
    && sha(fs.readFileSync(CHECKPOINT35_RUNNER)) === EXPECTED.checkpoint35Runner
    && sha(fs.readFileSync(LIB)) === EXPECTED.lib
    && sha(fs.readFileSync(PROMPT)) === EXPECTED.prompt
    && state.registry.attempts.length === 222
    && c34Attempts.length === 4
    && state.walRows.length === 13
    && state.directories.length === 4
    && state.registryRecords.length === 0
    && state.walRecords.length === 0
    && state.directoryRecords.length === 0
    && state.checkpointRecords.length === 0
    && ledger.pass
    && ledger.orphan === 0
    && ledger.dangling === 0
    && ledger.running.length === 0
    && processState.processInspectionSucceeded
    && processState.allNodeCommandLinesReadable
    && processState.activeC34RunnerCount === 0
    && processState.netstatInspectionStatus === 0
    && processState.port5173Free
    && temporary.length === 0
    && repository.serviceDiff === ''
    && repository.stagedDiff === ''
    && repository.head === EXPECTED.head
    && repository.upstream === EXPECTED.head
    && repository.sync === '0\t0'
    && repository.c35Items.length === 0
    && repository.indexLock === false
    && preview.pass;
  requirePass(pass, 'C34_CHECKPOINT37_CONTINUITY_MISMATCH');
  return {
    pass,
    current,
    chain,
    manifest,
    state,
    accepted,
    hypothesis,
    ledger,
    processState,
    repository,
    temporary,
    preview,
  };
}

async function runPreflight(executor) {
  const continuity = verifyInitialContinuity(executor);
  writeOnceBuffer(CHECKPOINT_37_REGISTRY_SNAPSHOT, fs.readFileSync(REGISTRY));
  writeOnceBuffer(CHECKPOINT_37_WAL_SNAPSHOT, fs.readFileSync(WAL));
  writeOnceBuffer(CHECKPOINT_37_LOG_SNAPSHOT, fs.readFileSync(CHECKPOINT_LOG));

  const authorization = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: SESSION_STARTED_UTC,
    classification: 'CHECKPOINT_37_RECOVERY_CONTINUATION_AUTHORIZED',
    recoveryForensics: {
      candidate3State: 'NOT_ALLOCATED',
      latestPersistedCheckpointOrdinal: 37,
      checkpointRowsAfter37: 0,
      registryCandidate3Attempts: 0,
      allocationWalCandidate3Rows: 0,
      candidate3AttemptDirectories: 0,
      candidate3CheckpointRows: 0,
    },
    controllingState: {
      safeToResume: true,
      activeAttemptId: null,
      activeBaseHash: ACTIVE_BASE_HASH,
      acceptedCandidate1AttemptId: ACCEPTED_CANDIDATE_1_ATTEMPT,
      acceptedCandidate2AttemptId: ACCEPTED_CANDIDATE_2_ATTEMPT,
    },
    timebox: {
      startedUtc: SESSION_STARTED_UTC,
      hardStopUtc: SESSION_HARD_STOP_UTC,
      candidate4Prohibited: true,
      opusProhibited: true,
      stageCommitPushC35Prohibited: true,
    },
    bindings: {
      checkpoint37: hashRecord(CHECKPOINT_37),
      checkpoint37SafePause: hashRecord(CHECKPOINT_37_SAFE_PAUSE),
      checkpoint37Manifest: hashRecord(CHECKPOINT_37_MANIFEST),
      checkpoint37RegistrySnapshot: hashRecord(CHECKPOINT_37_REGISTRY_SNAPSHOT),
      checkpoint37AllocationWalSnapshot: hashRecord(CHECKPOINT_37_WAL_SNAPSHOT),
      checkpoint37LogSnapshot: hashRecord(CHECKPOINT_37_LOG_SNAPSHOT),
      originalRunner: hashRecord(ORIGINAL_RUNNER),
      checkpoint35Runner: hashRecord(CHECKPOINT35_RUNNER),
      continuationRunner: hashRecord(THIS_RUNNER),
      library: hashRecord(LIB),
      prompt: hashRecord(PROMPT),
    },
    pass: true,
  };
  writeOnceJson(AUTHORIZATION, authorization);

  const nonDuplication = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: SESSION_STARTED_UTC,
    decision: 'PASS_NO_DUPLICATE_CANDIDATE_3_WORK',
    candidateId: CANDIDATE_3_ID,
    cycle: 'tx01',
    allocationOrdinal: 3,
    registryRecords: continuity.state.registryRecords,
    allocationWalRecords: continuity.state.walRecords,
    attemptDirectoryRecords: continuity.state.directoryRecords,
    checkpointRecords: continuity.state.checkpointRecords,
    c34AttemptDirectoryCount: continuity.state.directories.length,
    canonicalRegistryAttemptCount: continuity.state.registry.attempts.length,
    allocationWalRowCount: continuity.state.walRows.length,
    candidate3Allocated: false,
    pass: true,
  };
  writeOnceJson(NON_DUPLICATION, nonDuplication);

  const compatibility = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: SESSION_STARTED_UTC,
    decision: 'PASS_READY_FOR_MATERIAL_CANDIDATE_3',
    exactActiveBase: {
      attemptId: ACCEPTED_CANDIDATE_2_ATTEMPT,
      candidateId: continuity.accepted.candidate2.result.candidateId,
      servicesTreeDigest: continuity.accepted.candidate2.active.identity.servicesTreeDigest,
      metrics: continuity.accepted.candidate2.result.metrics,
    },
    acceptedCandidate1: {
      attemptId: ACCEPTED_CANDIDATE_1_ATTEMPT,
      result: hashRecord(continuity.accepted.candidate1.files.resultFile),
    },
    acceptedCandidate2: {
      attemptId: ACCEPTED_CANDIDATE_2_ATTEMPT,
      result: hashRecord(continuity.accepted.candidate2.files.resultFile),
    },
    frozenHypothesis: {
      artifact: hashRecord(continuity.hypothesis.file),
      record: continuity.hypothesis.record,
    },
    candidate3Preview: continuity.preview,
    processState: continuity.processState,
    temporaryRuntimeState: {
      directories: continuity.temporary,
      temporaryCandidateInstalled: false,
      restorationRequired: false,
      restorationAction: 'NO_WRITE_REQUIRED',
    },
    serviceStagingState: continuity.repository,
    forbiddenOperations: {
      rerunCandidates1Or2: false,
      candidate4: false,
      opus: false,
      stageCommitPush: false,
      c35: false,
    },
    pass: true,
  };
  writeOnceJson(COMPATIBILITY, compatibility);
  return { authorization, nonDuplication, compatibility };
}

function verifyPreflightArtifacts() {
  const authorization = readJson(AUTHORIZATION);
  const nonDuplication = readJson(NON_DUPLICATION);
  const compatibility = readJson(COMPATIBILITY);
  requirePass(
    authorization.pass === true
      && authorization.classification === 'CHECKPOINT_37_RECOVERY_CONTINUATION_AUTHORIZED'
      && authorization.controllingState.activeAttemptId == null
      && authorization.controllingState.activeBaseHash === ACTIVE_BASE_HASH
      && authorization.bindings.continuationRunner.sha256
        === sha(fs.readFileSync(THIS_RUNNER))
      && nonDuplication.pass === true
      && nonDuplication.decision === 'PASS_NO_DUPLICATE_CANDIDATE_3_WORK'
      && nonDuplication.candidate3Allocated === false
      && compatibility.pass === true
      && compatibility.decision === 'PASS_READY_FOR_MATERIAL_CANDIDATE_3'
      && compatibility.exactActiveBase.servicesTreeDigest === ACTIVE_BASE_HASH
      && compatibility.candidate3Preview.candidate.id === CANDIDATE_3_ID
      && compatibility.candidate3Preview.pass === true,
    'C34_CHECKPOINT37_PREFLIGHT_ARTIFACTS_INVALID',
  );
  return { authorization, nonDuplication, compatibility };
}

async function protectedAcceptedRows(accepted) {
  const analyze = await C.loadAnalyzerFrom(
    accepted.candidate2.active.dir,
    'c34-checkpoint37-accepted-preservation-base',
  );
  const sources = [
    ...accepted.candidate1.result.rowLevel.newlyCorrected.map((record) => ({
      category: 'candidate1-r3-correction',
      attemptId: ACCEPTED_CANDIDATE_1_ATTEMPT,
      oracleId: record.oracleId,
      query: record.query,
    })),
    ...accepted.candidate1.result.generalization.rows.map((record) => ({
      category: `candidate1-packet-${record.category}`,
      attemptId: ACCEPTED_CANDIDATE_1_ATTEMPT,
      oracleId: null,
      query: record.query,
    })),
    ...accepted.candidate1.result.leaveOneFamilyOut.records.map((record) => ({
      category: 'candidate1-leave-family-out',
      attemptId: ACCEPTED_CANDIDATE_1_ATTEMPT,
      oracleId: null,
      query: record.query,
    })),
    ...accepted.candidate2.result.rowLevel.newlyCorrected.map((record) => ({
      category: 'candidate2-r3-correction',
      attemptId: ACCEPTED_CANDIDATE_2_ATTEMPT,
      oracleId: record.oracleId,
      query: record.query,
    })),
    ...accepted.candidate2.result.generalization.rows.map((record) => ({
      category: `candidate2-packet-${record.category}`,
      attemptId: ACCEPTED_CANDIDATE_2_ATTEMPT,
      oracleId: null,
      query: record.query,
    })),
    ...accepted.candidate2.result.leaveOneFamilyOut.records.map((record) => ({
      category: 'candidate2-leave-family-out',
      attemptId: ACCEPTED_CANDIDATE_2_ATTEMPT,
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

async function withCandidate3AllocationLock(callback) {
  let descriptor = null;
  try {
    descriptor = fs.openSync(CANDIDATE_3_LOCK, 'wx');
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify({
        pid: process.pid,
        createdAtUtc: now(),
        candidateId: CANDIDATE_3_ID,
        cycle: 'tx01',
        allocationOrdinal: 3,
      })}\n`,
    );
    fs.fsyncSync(descriptor);
    return await callback();
  } finally {
    if (descriptor != null) fs.closeSync(descriptor);
    if (fs.existsSync(CANDIDATE_3_LOCK)) fs.unlinkSync(CANDIDATE_3_LOCK);
  }
}

async function createPostCandidateEvidence(result, accepted, protectedRows) {
  const state = candidate3Records();
  requirePass(
    state.registryRecords.length === 1
      && state.directoryRecords.length === 1,
    'C34_CHECKPOINT37_CANDIDATE_3_ALLOCATION_CARDINALITY_INVALID',
  );
  const attempt = state.registryRecords[0];
  requirePass(
    attempt.cycle === 'tx01'
      && attempt.attemptOrdinal === 3
      && attempt.retryOf == null
      && ['completed', 'technical_failure', 'transient_failure'].includes(attempt.status),
    'C34_CHECKPOINT37_CANDIDATE_3_NOT_TERMINAL',
  );
  const ledgerValue = C.reconcileC34AttemptLedger({ throwOnFailure: false });
  if (!fs.existsSync(CANDIDATE_3_LEDGER)) writeOnceJson(CANDIDATE_3_LEDGER, ledgerValue);
  const ledger = readJson(CANDIDATE_3_LEDGER);
  requirePass(
    ledger.pass === true
      && ledger.orphan === 0
      && ledger.dangling === 0
      && ledger.running.length === 0
      && ledger.records.some((record) =>
        record.attemptId === attempt.attemptId && record.pass),
    'C34_CHECKPOINT37_CANDIDATE_3_LEDGER_NOT_RECONCILED',
  );

  const resultPath = path.join(ATT, attempt.attemptId, 'ITERATION_RESULT.json');
  const semanticResult = result || (fs.existsSync(resultPath) ? readJson(resultPath) : null);
  const selectedRuntime = semanticResult?.accepted === true
    ? path.join(ATT, attempt.attemptId, 'runtime-snapshot')
    : accepted.candidate2.active.dir;
  const selectedAnalyze = await C.loadAnalyzerFrom(
    selectedRuntime,
    'c34-checkpoint37-post-candidate3-preservation',
  );
  const regressions = protectedRows.flatMap((record) => {
    const actualSignature = C.outputSignature(selectedAnalyze(record.query));
    return actualSignature === record.signature
      ? []
      : [{ ...record, actualSignature }];
  });
  const counts = {
    total: protectedRows.length,
    candidate1: protectedRows.filter((record) =>
      record.attemptId === ACCEPTED_CANDIDATE_1_ATTEMPT).length,
    candidate2: protectedRows.filter((record) =>
      record.attemptId === ACCEPTED_CANDIDATE_2_ATTEMPT).length,
    r3Corrections: protectedRows.filter((record) =>
      record.category.includes('-r3-correction')).length,
    packet: protectedRows.filter((record) =>
      record.category.includes('-packet-')).length,
    leaveFamilyOut: protectedRows.filter((record) =>
      record.category.includes('-leave-family-out')).length,
  };
  const regressionValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    candidate3AttemptId: attempt.attemptId,
    acceptedCandidate1AttemptId: ACCEPTED_CANDIDATE_1_ATTEMPT,
    acceptedCandidate2AttemptId: ACCEPTED_CANDIDATE_2_ATTEMPT,
    selectedRuntime: rel(selectedRuntime),
    selectedActiveBaseHash: C.runtimeFor(selectedRuntime).servicesTreeDigest,
    protectedRows: counts,
    regressions,
    pass: regressions.length === 0,
  };
  if (!fs.existsSync(PRIOR_ACCEPTED_REGRESSION)) {
    writeOnceJson(PRIOR_ACCEPTED_REGRESSION, regressionValue);
  }
  const regression = readJson(PRIOR_ACCEPTED_REGRESSION);
  requirePass(
    regression.pass === true
      && regression.candidate3AttemptId === attempt.attemptId
      && regression.acceptedCandidate1AttemptId === ACCEPTED_CANDIDATE_1_ATTEMPT
      && regression.acceptedCandidate2AttemptId === ACCEPTED_CANDIDATE_2_ATTEMPT,
    'C34_CHECKPOINT37_PRIOR_ACCEPTED_REGRESSION_INVALID',
  );

  const acceptedCandidate3 =
    attempt.status === 'completed'
      && semanticResult != null
      && semanticResult.accepted === true;
  const endingActiveBaseHash = acceptedCandidate3
    ? semanticResult.candidateIdentity.servicesTreeDigest
    : ACTIVE_BASE_HASH;
  const endingMetrics = acceptedCandidate3
    ? semanticResult.metrics
    : accepted.candidate2.result.metrics;
  const outcomeValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    classification: attempt.status === 'completed'
      ? acceptedCandidate3
        ? 'CANDIDATE_3_ACCEPTED_PROMOTED'
        : 'CANDIDATE_3_REJECTED_TERMINAL'
      : 'CANDIDATE_3_TECHNICAL_TERMINAL',
    attemptId: attempt.attemptId,
    candidateId: CANDIDATE_3_ID,
    candidateOrdinal: 3,
    allocationCycle: 'tx01',
    allocationOrdinal: 3,
    status: attempt.status,
    disposition: attempt.disposition,
    accepted: acceptedCandidate3,
    startingActiveBaseHash: ACTIVE_BASE_HASH,
    endingActiveBaseHash,
    metrics: endingMetrics,
    metricDelta: semanticResult == null ? null : {
      reasonPassedBefore: 3561,
      reasonPassedAfter: semanticResult.metrics.reasonPassed,
      reasonDelta: semanticResult.metrics.reasonPassed - 3561,
      remainingBefore: 159,
      remainingAfter: semanticResult.metrics.reasonMismatches,
      decisionPassed: semanticResult.metrics.decisionPassed,
      relationPassed: semanticResult.metrics.relationPassed,
    },
    preflight: {
      authorization: hashRecord(AUTHORIZATION),
      nonDuplication: hashRecord(NON_DUPLICATION),
      compatibility: hashRecord(COMPATIBILITY),
      decision: readJson(COMPATIBILITY).decision,
    },
    iterationResult: fs.existsSync(resultPath) ? hashRecord(resultPath) : null,
    acceptedCandidates1And2Regression: hashRecord(PRIOR_ACCEPTED_REGRESSION),
    ledger: hashRecord(CANDIDATE_3_LEDGER),
    semanticDisposition: attempt.status === 'completed'
      ? semanticResult?.disposition
      : 'NOT_A_SEMANTIC_REJECTION',
    blocker: attempt.status === 'completed' ? null : 'CANDIDATE_3_TECHNICAL_INCOMPLETE',
    pass: true,
  };
  if (!fs.existsSync(CANDIDATE_3_OUTCOME)) writeOnceJson(CANDIDATE_3_OUTCOME, outcomeValue);
  const outcome = readJson(CANDIDATE_3_OUTCOME);
  requirePass(
    outcome.pass === true
      && outcome.attemptId === attempt.attemptId
      && outcome.endingActiveBaseHash === endingActiveBaseHash
      && outcome.acceptedCandidates1And2Regression.sha256
        === sha(fs.readFileSync(PRIOR_ACCEPTED_REGRESSION)),
    'C34_CHECKPOINT37_CANDIDATE_3_OUTCOME_INVALID',
  );
  return { attempt, semanticResult, ledger, regression, outcome };
}

async function executeCandidate3(executor) {
  verifyPreflightArtifacts();
  const existing = candidate3Records();
  if (existing.registryRecords.length === 1) {
    const accepted = acceptedCandidates();
    const protectedRows = await protectedAcceptedRows(accepted);
    const attempt = existing.registryRecords[0];
    requirePass(
      ['completed', 'technical_failure', 'transient_failure'].includes(attempt.status),
      'C34_CHECKPOINT37_EXISTING_CANDIDATE_3_NOT_TERMINAL',
    );
    const resultPath = path.join(ATT, attempt.attemptId, 'ITERATION_RESULT.json');
    const result = fs.existsSync(resultPath) ? readJson(resultPath) : null;
    return createPostCandidateEvidence(result, accepted, protectedRows);
  }
  requirePass(
    existing.registryRecords.length === 0
      && existing.walRecords.length === 0
      && existing.directoryRecords.length === 0
      && existing.checkpointRecords.length === 0,
    'C34_CHECKPOINT37_DUPLICATE_CANDIDATE_3_ALLOCATION_REFUSED',
  );
  const remainingMs = Date.parse(SESSION_HARD_STOP_UTC) - Date.now();
  requirePass(
    remainingMs >= 15 * 60 * 1000,
    'C34_CHECKPOINT37_CANDIDATE_3_ALLOCATION_TIME_MARGIN_NOT_MET',
  );
  const continuity = verifyInitialContinuity(executor);
  const protectedRows = await protectedAcceptedRows(continuity.accepted);
  const extension = extendPreservation(
    executor.loadPreservationForRecovery(),
    protectedRows,
  );
  return withCandidate3AllocationLock(async () => {
    const late = candidate3Records();
    requirePass(
      late.registryRecords.length === 0
        && late.walRecords.length === 0
        && late.directoryRecords.length === 0
        && late.checkpointRecords.length === 0,
      'C34_CHECKPOINT37_LATE_DUPLICATE_CANDIDATE_3_ALLOCATION_REFUSED',
    );
    let result = null;
    let technicalError = null;
    try {
      result = await executor.runMaterialCandidate(
        executor.CANDIDATES[2],
        3,
        continuity.accepted.candidate2.active,
        extension.preservation,
        { allocationCycle: 'tx01', allocationOrdinal: 3 },
      );
    } catch (error) {
      technicalError = error;
    }
    const post = await createPostCandidateEvidence(
      result,
      continuity.accepted,
      protectedRows,
    );
    if (technicalError) {
      post.technicalError = technicalError?.stack || String(technicalError);
    }
    return post;
  });
}

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? recursiveFiles(target) : [target];
  });
}

function checkpoint38PathIfPresent() {
  const matches = fs.readdirSync(RES)
    .filter((name) => name.startsWith('COMMIT_5R1C34_RECOVERY_CHECKPOINT_38_'));
  requirePass(matches.length <= 1, 'C34_CHECKPOINT37_MULTIPLE_CHECKPOINT_38_FILES');
  return matches.length ? path.join(RES, matches[0]) : null;
}

function safePauseFiles(attemptId) {
  const files = [
    THIS_RUNNER,
    ORIGINAL_RUNNER,
    CHECKPOINT35_RUNNER,
    LIB,
    PROMPT,
    CHECKPOINT_37,
    CHECKPOINT_37_SAFE_PAUSE,
    CHECKPOINT_37_MANIFEST,
    CHECKPOINT_37_REGISTRY_SNAPSHOT,
    CHECKPOINT_37_WAL_SNAPSHOT,
    CHECKPOINT_37_LOG_SNAPSHOT,
    AUTHORIZATION,
    NON_DUPLICATION,
    COMPATIBILITY,
    CANDIDATE_3_LEDGER,
    PRIOR_ACCEPTED_REGRESSION,
    CANDIDATE_3_OUTCOME,
    ENDING_REGISTRY_SNAPSHOT,
    ENDING_WAL_SNAPSHOT,
    LOG_PREFIX,
    path.join(ATT, ACCEPTED_CANDIDATE_1_ATTEMPT, 'ITERATION_RESULT.json'),
    path.join(ATT, ACCEPTED_CANDIDATE_2_ATTEMPT, 'ITERATION_RESULT.json'),
  ];
  const checkpoint38 = checkpoint38PathIfPresent();
  if (checkpoint38) files.push(checkpoint38);
  files.push(...recursiveFiles(path.join(ATT, attemptId)));
  return [...new Set(files.map((file) => path.resolve(file)))]
    .sort((first, second) => rel(first).localeCompare(rel(second)));
}

function createOrVerifySafeManifest(attemptId) {
  if (fs.existsSync(SAFE_PAUSE_MANIFEST)) {
    const verification = verifyManifest(SAFE_PAUSE_MANIFEST);
    requirePass(
      verification.pass,
      'C34_CHECKPOINT37_EXISTING_SAFE_PAUSE_MANIFEST_INVALID',
    );
    return verification;
  }
  const files = safePauseFiles(attemptId);
  const text = `${files.map((file) =>
    `${sha(fs.readFileSync(file))}  ${rel(file)}`).join('\n')}\n`;
  writeOnceBuffer(SAFE_PAUSE_MANIFEST, Buffer.from(text));
  const verification = verifyManifest(SAFE_PAUSE_MANIFEST);
  requirePass(
    verification.pass,
    'C34_CHECKPOINT37_SAFE_PAUSE_MANIFEST_CREATION_FAILED',
  );
  return verification;
}

function verifyFinalLiveState(executor, post) {
  const ledger = C.reconcileC34AttemptLedger();
  const processState = executor.processAndPortState();
  const repository = gitState();
  const temporary = temporaryRuntimeDirectories();
  const state = candidate3Records();
  const historicalManifest = verifyManifest(CHECKPOINT_37_MANIFEST);
  requirePass(
    ledger.pass
      && ledger.orphan === 0
      && ledger.dangling === 0
      && ledger.running.length === 0
      && state.registryRecords.length === 1
      && state.directoryRecords.length === 1
      && state.registryRecords[0].attemptId === post.attempt.attemptId
      && processState.processInspectionSucceeded
      && processState.allNodeCommandLinesReadable
      && processState.activeC34RunnerCount === 0
      && processState.netstatInspectionStatus === 0
      && processState.port5173Free
      && temporary.length === 0
      && repository.serviceDiff === ''
      && repository.stagedDiff === ''
      && repository.head === EXPECTED.head
      && repository.upstream === EXPECTED.head
      && repository.sync === '0\t0'
      && repository.c35Items.length === 0
      && repository.indexLock === false
      && !fs.existsSync(CANDIDATE_3_LOCK)
      && historicalManifest.pass,
    'C34_CHECKPOINT37_FINAL_RECONCILIATION_FAILED',
  );
  return { ledger, processState, repository, temporary, state, historicalManifest };
}

function appendFinalCheckpoint(pause) {
  const ordinal = pause.checkpointOrdinal;
  const artifactPaths = pause.checkpointArtifacts.map((file) =>
    path.isAbsolute(file) ? file : path.resolve(C.REPO, file));
  for (const file of artifactPaths) {
    requirePass(
      fs.existsSync(file),
      `C34_CHECKPOINT37_FINAL_ARTIFACT_MISSING_${rel(file)}`,
    );
  }
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  requirePass(
    lines.length === ordinal - 1 || lines.length === ordinal,
    `C34_CHECKPOINT37_FINAL_LOG_ROWS_${lines.length}_EXPECTED_${ordinal - 1}_OR_${ordinal}`,
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
    candidate3: pause.candidate3,
    attemptDispositions: pause.attemptDispositions,
    reconciliation: pause.reconciliation,
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
    requirePass(
      JSON.stringify(JSON.parse(lines[ordinal - 1])) === JSON.stringify(event),
      'C34_CHECKPOINT37_EXISTING_FINAL_EVENT_DIFFERS',
    );
    requirePass(
      fs.existsSync(numbered)
        && JSON.stringify(readJson(numbered)) === JSON.stringify(event),
      'C34_CHECKPOINT37_EXISTING_FINAL_NUMBERED_DIFFERS',
    );
    const current = readJson(CHECKPOINT);
    const previous = ordinal > 1 ? JSON.parse(lines[ordinal - 2]) : null;
    requirePass(
      JSON.stringify(current) === JSON.stringify(event)
        || JSON.stringify(current) === JSON.stringify(previous),
      'C34_CHECKPOINT37_EXISTING_FINAL_CURRENT_CONFLICT',
    );
    if (JSON.stringify(current) !== JSON.stringify(event)) {
      writeMutableJson(CHECKPOINT, event);
    }
    return { event, numbered, appended: false };
  }
  const previous = lines.length ? JSON.parse(lines.at(-1)) : null;
  requirePass(
    JSON.stringify(readJson(CHECKPOINT)) === JSON.stringify(previous),
    'C34_CHECKPOINT37_FINAL_CURRENT_NOT_AT_PRIOR_TIP',
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

async function safePause(executor) {
  const state = candidate3Records();
  requirePass(
    state.registryRecords.length === 1
      && state.directoryRecords.length === 1,
    'C34_CHECKPOINT37_SAFE_PAUSE_REQUIRES_EXACTLY_ONE_CANDIDATE_3',
  );
  const accepted = acceptedCandidates();
  const protectedRows = await protectedAcceptedRows(accepted);
  const attempt = state.registryRecords[0];
  requirePass(
    ['completed', 'technical_failure', 'transient_failure'].includes(attempt.status),
    'C34_CHECKPOINT37_SAFE_PAUSE_CANDIDATE_3_NOT_TERMINAL',
  );
  const resultPath = path.join(ATT, attempt.attemptId, 'ITERATION_RESULT.json');
  const result = fs.existsSync(resultPath) ? readJson(resultPath) : null;
  const post = await createPostCandidateEvidence(result, accepted, protectedRows);
  const live = verifyFinalLiveState(executor, post);

  writeOnceBuffer(ENDING_REGISTRY_SNAPSHOT, fs.readFileSync(REGISTRY));
  writeOnceBuffer(ENDING_WAL_SNAPSHOT, fs.readFileSync(WAL));
  writeOnceBuffer(LOG_PREFIX, fs.readFileSync(CHECKPOINT_LOG));
  const manifest = createOrVerifySafeManifest(attempt.attemptId);
  const checkpointRows = parseNdjson(CHECKPOINT_LOG);
  const checkpointOrdinal = checkpointRows.length + 1;
  const outcome = post.outcome;
  const currentMetrics = {
    reasonPassed: outcome.metrics.reasonPassed,
    reasonTotal: 3720,
    remainingReasonMismatches: outcome.metrics.reasonMismatches,
    decisionPassed: outcome.metrics.decisionPassed,
    decisionTotal: 3720,
    relationPassed: outcome.metrics.relationPassed,
    relationTotal: 3720,
  };
  const c34Attempts = state.registry.attempts.filter((record) =>
    record.attemptId.includes('commit5r1c34-'));
  const classification = attempt.status === 'completed'
    ? 'ONE_HOUR_SAFE_PAUSE_AFTER_CANDIDATE_3'
    : 'ONE_HOUR_SAFE_PAUSE_CANDIDATE_3_TECHNICAL_TERMINAL';
  const blocker = attempt.status === 'completed'
    ? null
    : 'CANDIDATE_3_TECHNICAL_INCOMPLETE';
  const pauseValue = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    session: {
      startedUtc: SESSION_STARTED_UTC,
      hardStopUtc: SESSION_HARD_STOP_UTC,
      stoppedBeforeHardStop: Date.now() <= Date.parse(SESSION_HARD_STOP_UTC),
    },
    stage: 'checkpoint 37 continuation one-hour safe pause',
    classification,
    activeBaseHash: outcome.endingActiveBaseHash,
    activeAttemptId: null,
    currentMetrics,
    candidate3: {
      allocated: true,
      attemptId: attempt.attemptId,
      candidateId: CANDIDATE_3_ID,
      status: attempt.status,
      disposition: attempt.disposition,
      accepted: outcome.accepted,
      iterationResult: outcome.iterationResult,
      outcome: hashRecord(CANDIDATE_3_OUTCOME),
      acceptedCandidates1And2Regression: hashRecord(PRIOR_ACCEPTED_REGRESSION),
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
      endingRegistrySnapshotSha256: sha(fs.readFileSync(ENDING_REGISTRY_SNAPSHOT)),
      endingAllocationWalSnapshotSha256: sha(fs.readFileSync(ENDING_WAL_SNAPSHOT)),
      attemptDirectoryCount: state.directories.length,
      ledger: live.ledger,
    },
    processState: live.processState,
    temporaryRuntimeState: {
      directories: live.temporary,
      temporaryCandidateInstalled: false,
      restorationRequired: false,
      restorationAction: 'NO_WRITE_REQUIRED',
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
    evidenceManifest: manifest.manifest,
    checkpointOrdinal,
    checkpointArtifacts: [
      rel(SAFE_PAUSE),
      rel(SAFE_PAUSE_MANIFEST),
      rel(CANDIDATE_3_OUTCOME),
      rel(CANDIDATE_3_LEDGER),
      rel(PRIOR_ACCEPTED_REGRESSION),
      rel(ENDING_REGISTRY_SNAPSHOT),
      rel(ENDING_WAL_SNAPSHOT),
      rel(LOG_PREFIX),
      ...(fs.existsSync(resultPath) ? [rel(resultPath)] : []),
    ],
    nextExactOperation:
      `Resume C34 from checkpoint ${checkpointOrdinal}. Preserve candidates 1-3 and `
      + 'the exact active base; candidate 4 requires a separate explicit continuation. '
      + 'Do not rerun or reallocate candidates 1, 2, or 3.',
    safeToResume: true,
    blocker,
    pass: true,
  };
  if (!fs.existsSync(SAFE_PAUSE)) writeOnceJson(SAFE_PAUSE, pauseValue);
  const pause = readJson(SAFE_PAUSE);
  requirePass(
    pause.pass === true
      && pause.safeToResume === true
      && pause.activeAttemptId == null
      && pause.candidate3.attemptId === attempt.attemptId
      && pause.activeBaseHash === outcome.endingActiveBaseHash
      && pause.evidenceManifest.sha256 === sha(fs.readFileSync(SAFE_PAUSE_MANIFEST))
      && pause.reconciliation.registrySha256 === sha(fs.readFileSync(REGISTRY))
      && pause.reconciliation.allocationWalSha256 === sha(fs.readFileSync(WAL)),
    'C34_CHECKPOINT37_SAFE_PAUSE_ARTIFACT_INVALID',
  );
  const checkpoint = appendFinalCheckpoint(pause);
  return {
    classification: pause.classification,
    attemptId: attempt.attemptId,
    disposition: attempt.disposition,
    accepted: outcome.accepted,
    activeBaseHash: pause.activeBaseHash,
    currentMetrics: pause.currentMetrics,
    checkpoint: checkpoint.event,
    checkpointPath: rel(checkpoint.numbered),
    idempotent: !checkpoint.appended,
    manifest: manifest.manifest,
    pass: true,
  };
}

async function main() {
  const modes = ['--preflight', '--candidate3', '--safe-pause']
    .filter((mode) => process.argv.includes(mode));
  requirePass(modes.length === 1, 'C34_CHECKPOINT37_EXACTLY_ONE_MODE_REQUIRED');
  const executor = await loadFrozenExecutor();
  if (modes[0] === '--preflight') {
    console.log(JSON.stringify(await runPreflight(executor), null, 2));
    return;
  }
  if (modes[0] === '--candidate3') {
    const result = await executeCandidate3(executor);
    console.log(JSON.stringify({
      attemptId: result.attempt.attemptId,
      status: result.attempt.status,
      disposition: result.attempt.disposition,
      outcome: result.outcome,
      technicalError: result.technicalError || null,
      pass: true,
    }, null, 2));
    return;
  }
  console.log(JSON.stringify(await safePause(executor), null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
}
