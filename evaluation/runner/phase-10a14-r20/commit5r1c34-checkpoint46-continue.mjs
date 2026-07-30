// PHASE-10A14-R20 COMMIT 5R1-C34
// Four-hour continuation from immutable checkpoint 46.
// Candidate 6 is the last authorized material candidate. Candidate 7/C35 are forbidden.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as C from './commit5r1c34-lib.mjs';
import * as L from './commit5r1c20-lib.mjs';

const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C34';
const RES = path.resolve(C.RES);
const ATT = path.resolve(C.ATT);
const REGISTRY = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
const WAL = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
const CHECKPOINT = path.join(RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT.json');
const CHECKPOINT_LOG = path.join(RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson');
const CHECKPOINT_46 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_46_candidate_5_linked_retry_recovery_safe_pause.json',
);
const CHECKPOINT_47 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_47_executor_technical_stop.json',
);
const CANDIDATE_5_RECOVERY_MANIFEST = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_5_RECOVERY_EVIDENCE.sha256',
);
const HYPOTHESES = path.join(RES, 'COMMIT_5R1C34_CANDIDATE_HYPOTHESES.json');
const ORIGINAL_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs',
);
const LIB = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
);
const THIS_RUNNER = path.resolve(
  'evaluation/runner/phase-10a14-r20/commit5r1c34-checkpoint46-continue.mjs',
);
const PROMPT = path.resolve(
  'C:/Projects/tina-execution-prompts/'
    + 'PHASE-10A14-R20-COMMIT-5R1-C34-FOUR-HOUR-CONTINUATION-FROM-CHECKPOINT-46.md',
);
const ROADMAP = path.resolve(
  'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
);
const CURRENT_STATE = path.resolve('knowledge/CURRENT_STATE.md');
const CANDIDATE_6_LOCK = path.join(
  RES,
  'COMMIT_5R1C34_CANDIDATE_6_ALLOCATION.lock',
);
const COMPOSITION_LOCK = path.join(
  RES,
  'COMMIT_5R1C34_COMPOSITION_ALLOCATION.lock',
);

const ART = Object.freeze({
  diagnostic47: path.join(
    RES,
    'COMMIT_5R1C34_CHECKPOINT_47_DIAGNOSTIC_CLI_MISUSE_ADJUDICATION.json',
  ),
  authorization: path.join(
    RES,
    'COMMIT_5R1C34_CHECKPOINT_46_CONTINUATION_AUTHORIZATION.json',
  ),
  candidate6NonDuplication: path.join(
    RES,
    'COMMIT_5R1C34_CANDIDATE_6_NON_DUPLICATION_PREFLIGHT.json',
  ),
  candidate6Compatibility: path.join(
    RES,
    'COMMIT_5R1C34_CANDIDATE_6_RESUME_COMPATIBILITY_VALIDATION.json',
  ),
  candidate6Result: path.join(
    RES,
    'COMMIT_5R1C34_CANDIDATE_6_CONTINUATION_RESULT.json',
  ),
  candidate6Ledger: path.join(
    RES,
    'COMMIT_5R1C34_ATTEMPT_LEDGER_AFTER_CANDIDATE_6.json',
  ),
  candidate6Regression: path.join(
    RES,
    'COMMIT_5R1C34_CANDIDATE_6_ACCEPTED_CANDIDATES_1_TO_5_REGRESSION_VALIDATION.json',
  ),
  finalComposition: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CUMULATIVE_COMPOSITION.json',
  ),
  finalChain: path.join(RES, 'COMMIT_5R1C34_FINAL_ACCEPTED_RULE_CHAIN.json'),
  finalActive: path.join(RES, 'COMMIT_5R1C34_FINAL_ACTIVE_BASE_IDENTITY.json'),
  finalResidual: path.join(RES, 'COMMIT_5R1C34_FINAL_RESIDUAL_INVENTORY.json'),
  finalResidualFamilies: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_RESIDUAL_FAMILY_SUMMARY.json',
  ),
  finalSignatureRegression: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_ACCEPTED_SIGNATURE_REGRESSION_VALIDATION.json',
  ),
  finalFrozen: path.join(RES, 'COMMIT_5R1C34_FINAL_FROZEN_GATE_RESULT.json'),
  finalDualReplay: path.join(RES, 'COMMIT_5R1C34_FINAL_DUAL_REPLAY_RESULT.json'),
  finalGeneralization: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_GENERALIZATION_RESULT.json',
  ),
  finalPreservation: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_PRESERVATION_RESULT.json',
  ),
  finalLedger: path.join(RES, 'COMMIT_5R1C34_FINAL_ATTEMPT_LEDGER.json'),
  finalClosureDraft: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CLOSURE_DECISION_DRAFT.json',
  ),
  registryWal: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_REGISTRY_WAL_RECONCILIATION.json',
  ),
  serviceIdentity: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_SERVICE_RUNTIME_IDENTITY.json',
  ),
  roadmapDraft: path.join(RES, 'COMMIT_5R1C34_FINAL_ROADMAP_V9_DRAFT.md'),
  roadmapDraftObserved: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_ROADMAP_V9_DRAFT_APPROVED_WITH_NONBLOCKING_OBSERVATIONS.md',
  ),
  currentStateDraft: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CURRENT_STATE_DRAFT.md',
  ),
  currentStateDraftObserved: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CURRENT_STATE_DRAFT_APPROVED_WITH_NONBLOCKING_OBSERVATIONS.md',
  ),
  stagingDraft: path.join(RES, 'COMMIT_5R1C34_FINAL_STAGING_SET_DRAFT.json'),
  reviewRequest: path.join(RES, 'COMMIT_5R1C34_FINAL_OPUS_REVIEW_REQUEST.md'),
  reviewedInventory: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_REVIEWED_STATE_INVENTORY.json',
  ),
  preReviewManifest: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_PRE_REVIEW_EVIDENCE.sha256',
  ),
  preReviewCheckpointLogSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_PRE_REVIEW_CHECKPOINT_LOG_SNAPSHOT.ndjson',
  ),
  roadmapStartingSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_ROADMAP_V9_STARTING_SNAPSHOT.md',
  ),
  currentStateStartingSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CURRENT_STATE_STARTING_SNAPSHOT.md',
  ),
  opusCapture: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_OPUS_REVIEW_CLI_CAPTURE.json',
  ),
  opusInvocation: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_OPUS_REVIEW_INVOCATION.json',
  ),
  opusJson: path.join(RES, 'COMMIT_5R1C34_FINAL_OPUS_REVIEW.json'),
  opusMd: path.join(RES, 'COMMIT_5R1C34_FINAL_OPUS_REVIEW.md'),
  finalManifest: path.join(RES, 'COMMIT_5R1C34_FINAL_EVIDENCE.sha256'),
  finalCheckpointLogSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_RECOVERY_CHECKPOINT_LOG_SNAPSHOT.ndjson',
  ),
  finalManifestValidation: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_MANIFEST_VALIDATION.json',
  ),
  finalCommitContents: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_COMMIT_CONTENTS.json',
  ),
  gitVerification: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_GIT_VERIFICATION.json',
  ),
  remoteVerification: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_REMOTE_VERIFICATION.json',
  ),
  preallocationSandboxTerminal: path.join(
    RES,
    'COMMIT_5R1C34_FOUR_HOUR_TERMINAL_STATE.json',
  ),
  preallocationSandboxAdjudication: path.join(
    RES,
    'COMMIT_5R1C34_PREALLOCATION_SANDBOX_DIAGNOSTIC_ADJUDICATION.json',
  ),
  preallocationStartingGuardTerminal: path.join(
    RES,
    'COMMIT_5R1C34_FOUR_HOUR_TERMINAL_STATE_RECONCILED.json',
  ),
  preallocationStartingGuardAdjudication: path.join(
    RES,
    'COMMIT_5R1C34_PREALLOCATION_STARTING_LEDGER_GUARD_ADJUDICATION.json',
  ),
  terminalState: path.join(
    RES,
    'COMMIT_5R1C34_FOUR_HOUR_TERMINAL_STATE_FINAL.json',
  ),
});

const EXPECTED = Object.freeze({
  sessionStartedUtc: '2026-07-30T04:20:10.8872565Z',
  sessionHardStopUtc: '2026-07-30T08:20:10.8872565Z',
  startHead: '7c95019622d7174c8b1fd258b9a10137e59feb57',
  checkpoint46:
    'a514eb815fbb5349970a0c948f70d7a94bfe380d364883fed702238cf55d19c2',
  checkpoint46Event:
    '198842da0ca9a571f491c0f65e58ec0ee2b7ea0f18e01c0dc500efcb1d9ed1b8',
  checkpoint47Event:
    '23aa20a3ac9c9ad18adebb471989a0c1f6942a0e88ea2daa43808dcfe57a4a02',
  checkpoint46Log:
    'a467f7948db9c7c23b1993dddeb29d59d23f5e1e1573efd1813e29eff6ad8ad8',
  activeBase:
    '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  registry:
    'ac198cb30d5f41dc2161bc3f1079e259f8c8dee49dc649242c30138c85ae5a8a',
  wal: '9e499593785a23515ff1986057dd786797df9007ab5c38b26a96840901281363',
  candidate5RecoveryManifest:
    '7f8093b3a87e93e027ba3e73824ded8d14ec8e9d1dc24292772ed1fa9e861038',
  hypotheses:
    'c71153db4148d8bad3ab0f772aa55e130e00e201b61c78ff5d21573c04595009',
  originalRunner:
    'a38759fbde67e67b06e0165fcbb8ef97f5163e4f6c8aa08e951ab05dec3b4b5e',
  lib: '6a958b709cfb639697186d0878ab3dcf9f4dafe03e0bfdb7c5e141a38e8708d5',
  candidate5Result:
    '60e5e6dea588c95e13c2c38c0cca0d8ffe11ec96e315e5a69dfab92c5921253d',
  acceptedResults: [
    '209fd7a60b5854139559db2c66809d3560b7da1f1ef7677b9eb4c2075e482054',
    '22a6606b4daf3a02d26137ffd0d3f9d4be63795c6fa12700de849e02ffb3b065',
    '565f0498e4b6832872cc75cf80dd3fa361345de022930319f7f1f598610e567b',
    '0aeb88e61c1423246f033482235b593349bf4f231c031ffe840b36d31908e964',
    '60e5e6dea588c95e13c2c38c0cca0d8ffe11ec96e315e5a69dfab92c5921253d',
  ],
});

const RECONSTRUCTION_ATTEMPT =
  'R20-domain_campaign-commit5r1c34-reconstruct-ord01-2026-07-28T13-34-33-514Z';
const TECHNICAL_ORIGINALS = Object.freeze([
  'R20-domain_campaign-commit5r1c34-nt01-ord01-2026-07-28T13-34-41-962Z',
  'R20-domain_campaign-commit5r1c34-tr01-ord05-2026-07-30T02-33-54-720Z',
]);
const ACCEPTED_ATTEMPTS = Object.freeze([
  'R20-domain_campaign-commit5r1c34-nt01-retry01-ord02-2026-07-29T05-00-15-739Z',
  'R20-domain_campaign-commit5r1c34-nt02-ord02-2026-07-29T12-40-28-807Z',
  'R20-domain_campaign-commit5r1c34-tx01-ord03-2026-07-29T23-35-17-745Z',
  'R20-domain_campaign-commit5r1c34-tx02-ord04-2026-07-30T02-31-47-486Z',
  'R20-domain_campaign-commit5r1c34-tr01-retry01-ord06-2026-07-30T03-24-56-403Z',
]);
const CANDIDATE_IDS = Object.freeze([
  'C34-NT01-typed-ordinary-domain-inquiry-without-operation-is-no-tax-relation',
  'C34-NT02-local-identifier-redefinition-is-explicit-non-tax-task',
  'C34-TX01-copular-resolved-tax-topic-is-explicit-tax-task',
  'C34-TX02-import-duty-instrument-excluding-rate-classification-and-computation',
  'C34-TR01-legal-rule-effect-or-contract-tax-clause-is-treatment',
  'C34-CP01-tax-administrative-remedy-deadline-is-compliance',
]);

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const requirePass = (condition, code) => {
  if (!condition) throw new Error(code);
};
const readJson = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => {
  const absolute = path.resolve(file).replace(/\\/g, '/');
  const root = path.resolve(C.REPO).replace(/\\/g, '/');
  return absolute.startsWith(`${root}/`) ? absolute.slice(root.length + 1) : absolute;
};
const hashRecord = (file) => {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), bytes: bytes.length, sha256: sha(bytes) };
};
const parseNdjson = (file) => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const git = (...args) => execFileSync('git', args, {
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
      `C34_CP46_EXISTING_EVIDENCE_DIFFERS_${rel(absolute)}`,
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
    `${absolute}.c34-cp46-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  let exists = false;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    exists = true;
    fs.renameSync(temporary, absolute);
    exists = false;
  } finally {
    if (exists && fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function stableGeneratedJson(file, factory) {
  if (fs.existsSync(file)) return readJson(file);
  return writeOnceJson(file, factory(now())) && readJson(file);
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
    prior = Buffer.from(`${lines.slice(0, index + 1).join('\n')}\n`);
    return { row: index + 1, event, pass };
  });
  return {
    rows: records.length,
    records,
    badRows: records.filter((record) => !record.pass).map((record) => record.row),
    logSha256: sha(bytes),
    pass: records.every((record) => record.pass),
  };
}

function numberedCheckpointPath(ordinal, stage) {
  const safeStage = stage.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return path.join(
    RES,
    `COMMIT_5R1C34_RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_${safeStage}.json`,
  );
}

function appendIdempotentCheckpoint({
  updatedAtUtc,
  stage,
  status,
  activeBaseHash,
  artifacts,
  nextExactOperation,
  safeToResume = true,
  blocker = null,
  ordinal = null,
}) {
  for (const file of artifacts) {
    requirePass(fs.existsSync(file), `C34_CP46_CHECKPOINT_ARTIFACT_MISSING_${rel(file)}`);
  }
  const logBytes = fs.readFileSync(CHECKPOINT_LOG);
  const lines = logBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  const selectedOrdinal = ordinal ?? lines.length + 1;
  requirePass(
    lines.length === selectedOrdinal - 1 || lines.length === selectedOrdinal,
    `C34_CP46_CHECKPOINT_LOG_LENGTH_${lines.length}_FOR_${selectedOrdinal}`,
  );
  const prefixLines = lines.slice(0, selectedOrdinal - 1);
  const prefix = prefixLines.length
    ? Buffer.from(`${prefixLines.join('\n')}\n`)
    : Buffer.alloc(0);
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal: selectedOrdinal,
    commitUnit: 'PHASE-10A14-R20-COMMIT-5R1-C34',
    updatedAtUtc,
    stage,
    status,
    head: git('rev-parse', 'HEAD').trim(),
    activeBaseHash,
    attemptId: null,
    activeAttemptId: null,
    artifactHashes: artifacts.map(hashRecord),
    previousLogSha256: sha(prefix),
    nextExactOperation,
    safeToResume,
    blocker,
  };
  const event = {
    ...eventWithoutHash,
    eventSha256: sha(Buffer.from(JSON.stringify(eventWithoutHash))),
  };
  const numbered = numberedCheckpointPath(selectedOrdinal, stage);
  if (lines.length === selectedOrdinal) {
    requirePass(
      JSON.stringify(JSON.parse(lines[selectedOrdinal - 1])) === JSON.stringify(event),
      `C34_CP46_CHECKPOINT_EXISTING_EVENT_DIFFERS_${selectedOrdinal}`,
    );
    requirePass(
      fs.existsSync(numbered)
        && JSON.stringify(readJson(numbered)) === JSON.stringify(event),
      `C34_CP46_CHECKPOINT_NUMBERED_DIFFERS_${selectedOrdinal}`,
    );
    if (JSON.stringify(readJson(CHECKPOINT)) !== JSON.stringify(event)) {
      writeMutableJson(CHECKPOINT, event);
    }
    return { event, numbered, appended: false };
  }
  writeOnceJson(numbered, event);
  fs.appendFileSync(CHECKPOINT_LOG, `${JSON.stringify(event)}\n`);
  writeMutableJson(CHECKPOINT, event);
  return { event, numbered, appended: true };
}

function ensureHistoricalOrAppendCheckpoint(options) {
  const matches = parseNdjson(CHECKPOINT_LOG)
    .filter((event) => event.stage === options.stage);
  requirePass(
    matches.length <= 1,
    `C34_CP46_DUPLICATE_CHECKPOINT_STAGE_${options.stage}`,
  );
  if (matches.length === 0) {
    const { historicalMutableArtifacts, ...appendOptions } = options;
    return appendIdempotentCheckpoint(appendOptions);
  }
  const event = matches[0];
  const mutablePaths = new Set(
    (options.historicalMutableArtifacts || []).map((file) => rel(file)),
  );
  const artifactHashesPass =
    event.artifactHashes.length === options.artifacts.length
    && event.artifactHashes.every((record, index) => {
      const file = options.artifacts[index];
      if (record.path !== rel(file)) return false;
      return mutablePaths.has(record.path)
        || JSON.stringify(record) === JSON.stringify(hashRecord(file));
    });
  requirePass(
    event.updatedAtUtc === options.updatedAtUtc
      && event.status === options.status
      && event.activeBaseHash === options.activeBaseHash
      && event.attemptId == null
      && event.activeAttemptId == null
      && artifactHashesPass
      && event.nextExactOperation === options.nextExactOperation
      && event.safeToResume === (options.safeToResume ?? true)
      && event.blocker === (options.blocker ?? null),
    `C34_CP46_EXISTING_CHECKPOINT_STAGE_DIFFERS_${options.stage}`,
  );
  const numbered = numberedCheckpointPath(event.ordinal, event.stage);
  requirePass(
    fs.existsSync(numbered)
      && JSON.stringify(readJson(numbered)) === JSON.stringify(event),
    `C34_CP46_EXISTING_NUMBERED_CHECKPOINT_DIFFERS_${event.ordinal}`,
  );
  return { event, numbered, appended: false };
}

function verifyManifest(file, expectedEntries = null) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    requirePass(match, `C34_CP46_MANIFEST_LINE_INVALID_${line}`);
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
  const duplicates = records.map((record) => record.path)
    .filter((item, index, items) => items.indexOf(item) !== index);
  return {
    manifest: hashRecord(file),
    entries: records.length,
    records,
    badRecords: records.filter((record) => !record.pass),
    duplicatePaths: [...new Set(duplicates)],
    pass: records.every((record) => record.pass)
      && duplicates.length === 0
      && (expectedEntries == null || records.length === expectedEntries),
  };
}

function allocationLocks() {
  return fs.readdirSync(RES)
    .filter((name) => /^COMMIT_5R1C34_.*_ALLOCATION\.lock$/i.test(name))
    .map((name) => path.join(RES, name));
}

function temporaryRuntimeDirectories() {
  const prefixes = [
    'tina-c34-candidate-',
    'tina-c34-composition-',
    'tina-c34-checkpoint46-adapter-',
    'tina-c34-closure-',
    'tina-c34-review-',
    'tina-c34-patch-',
    'tina-c34-replay-',
    'tina-c34-debug-analyzer-',
    'tina-c34-process-inspection-',
    'tina-c34-static-audit-',
  ];
  const roots = [...new Set(
    [os.tmpdir(), 'C:/Temp'].map((root) => path.resolve(root).toLowerCase()),
  )];
  return roots.flatMap((normalizedRoot) => {
    const root = path.resolve(normalizedRoot);
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) =>
        prefixes.some((prefix) => entry.name.startsWith(prefix)))
      .map((entry) => path.join(root, entry.name));
  }).sort();
}

function processState() {
  const powershell = 'C:/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe';
  const script = [
    "$ErrorActionPreference='Stop'",
    "$nodes=@(Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\""
      + ' | Select-Object ProcessId,ParentProcessId,CommandLine)',
    '$lines=@(netstat -ano -p TCP)',
    "$listeners=@($lines | Where-Object { $parts=($_.Trim() -split '\\s+');"
      + " $parts.Count -ge 4 -and $parts[0] -eq 'TCP'"
      + " -and $parts[1] -match ':5173$' -and $parts[3] -eq 'LISTENING' })",
    '[ordered]@{inspectionSucceeded=$true;nodeProcesses=$nodes;'
      + "listeners5173=$listeners} | ConvertTo-Json -Depth 6",
  ].join('; ');
  const result = spawnSync(
    powershell,
    ['-NoProfile', '-Command', script],
    { cwd: C.REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    return {
      inspectionSucceeded: false,
      error: result.stderr || result.error?.message || `exit ${result.status}`,
      activeC34: [],
      unreadable: [],
      listeners5173: [],
    };
  }
  const parsed = JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
  const nodes = Array.isArray(parsed.nodeProcesses)
    ? parsed.nodeProcesses
    : parsed.nodeProcesses ? [parsed.nodeProcesses] : [];
  const listeners = Array.isArray(parsed.listeners5173)
    ? parsed.listeners5173
    : parsed.listeners5173 ? [parsed.listeners5173] : [];
  return {
    inspectionSucceeded: true,
    activeC34: nodes.filter((item) =>
      item.ProcessId !== process.pid
      && /commit5r1c34-[^\s"']+\.mjs/i.test(item.CommandLine || '')),
    unreadable: nodes.filter((item) =>
      item.ProcessId !== process.pid && !String(item.CommandLine || '').trim()),
    listeners5173: listeners,
  };
}

function gitState() {
  const services = [
    'services/philippine-tax-intent-analyzer.js',
    'services/philippine-tax-domain-boundary.js',
    'services/philippine-tax-boundary-patterns.js',
  ];
  return {
    head: git('rev-parse', 'HEAD').trim(),
    upstream: git('rev-parse', '@{u}').trim(),
    sync: git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim(),
    serviceDiff: git('diff', '--name-only', 'HEAD', '--', ...services).trim(),
    staged: git('diff', '--cached', '--name-only').trim(),
    roadmapV7V8Diff: git(
      'diff',
      '--name-only',
      'HEAD',
      '--',
      'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
      'knowledge/TINA_Updated_Roadmap_v7.md',
    ).trim(),
    oracleDiff: git('diff', '--name-only', 'HEAD', '--', 'evaluation/oracles').trim(),
    indexLock: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    c35Items: git('status', '--porcelain=v1', '--untracked-files=all')
      .split(/\r?\n/).filter((line) => /5R1C35|commit5r1c35/i.test(line)),
  };
}

function exactC34AttemptState() {
  const registry = readJson(REGISTRY);
  const wal = parseNdjson(WAL);
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const c34 = registry.attempts.filter((attempt) =>
    attempt.attemptId?.includes('commit5r1c34-'));
  return { registry, wal, directories, c34 };
}

function cp01State() {
  const state = exactC34AttemptState();
  const matches = (attemptId) =>
    typeof attemptId === 'string' && attemptId.includes('-cp01-');
  return {
    ...state,
    registryRecords: state.c34.filter((attempt) =>
      attempt.cycle === 'cp01' || matches(attempt.attemptId)),
    walRecords: state.wal.filter((row) => matches(row.attemptId)),
    directories: state.directories.filter(matches),
    checkpointRows: parseNdjson(CHECKPOINT_LOG).filter((row) =>
      matches(row.attemptId) || matches(row.activeAttemptId)),
    lockPresent: fs.existsSync(CANDIDATE_6_LOCK),
  };
}

function composeState() {
  const state = exactC34AttemptState();
  const matches = (attemptId) =>
    typeof attemptId === 'string' && attemptId.includes('-compose-');
  return {
    ...state,
    registryRecords: state.c34.filter((attempt) =>
      attempt.cycle === 'compose' || matches(attempt.attemptId)),
    walRecords: state.wal.filter((row) => matches(row.attemptId)),
    directories: state.directories.filter(matches),
    checkpointRows: parseNdjson(CHECKPOINT_LOG).filter((row) =>
      matches(row.attemptId) || matches(row.activeAttemptId)),
    lockPresent: fs.existsSync(COMPOSITION_LOCK),
  };
}

function reconcileDiagnosticCheckpoint47() {
  const chain = validateCheckpointChain();
  if (chain.rows >= 48) {
    const existing = chain.records[47]?.event;
    requirePass(
      existing?.stage === 'checkpoint 47 diagnostic no-allocation reconciliation'
        && existing.safeToResume === true
        && existing.activeAttemptId == null
        && existing.activeBaseHash === EXPECTED.activeBase,
      'C34_CP46_EXISTING_POST_DIAGNOSTIC_RECONCILIATION_INVALID',
    );
    return { chain, checkpoint: existing, appended: false, evidence: readJson(ART.diagnostic47) };
  }
  requirePass(chain.pass && chain.rows === 47, 'C34_CP46_DIAGNOSTIC_CHAIN_NOT_47');
  const row46 = chain.records[45].event;
  const row47 = chain.records[46].event;
  const state = exactC34AttemptState();
  const processes = processState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const gitStatus = gitState();
  const evidence = stableGeneratedJson(ART.diagnostic47, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: 'NO_ALLOCATION_DIAGNOSTIC_CLI_MISUSE',
    invocation: 'node evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs --help',
    cause:
      'The frozen executor has no help mode; its global fail-closed catch appended a technical-stop checkpoint.',
    startingCheckpoint46: hashRecord(CHECKPOINT_46),
    checkpoint46EventSha256: row46.eventSha256,
    diagnosticCheckpoint47: hashRecord(CHECKPOINT_47),
    diagnosticEventSha256: row47.eventSha256,
    diagnosticBlocker: row47.blocker,
    misleadingStaleFields: {
      recordedActiveBaseHash: row47.activeBaseHash,
      actualControllingActiveBaseHash: EXPECTED.activeBase,
      recordedAttemptId: row47.attemptId,
      actualActiveAttemptId: null,
      explanation:
        'The generic catch inferred the latest attempt semantic base and did not represent a new attempt or active owner.',
    },
    mutations: {
      checkpointCurrentAndLogOnly: true,
      numberedCheckpoint47Created: true,
      technicalBlockerArtifactReusedUnchanged: true,
      registrySha256: sha(fs.readFileSync(REGISTRY)),
      walSha256: sha(fs.readFileSync(WAL)),
      registryAttempts: state.registry.attempts.length,
      walRows: state.wal.length,
      c34AttemptDirectories: state.directories.length,
      candidate6RegistryRecords: cp01State().registryRecords.length,
      candidate6WalRows: cp01State().walRecords.length,
      candidate6Directories: cp01State().directories.length,
      serviceDiff: gitStatus.serviceDiff,
      stagedDiff: gitStatus.staged,
    },
    processState: processes,
    temporaryRuntimeDirectories: temporary.map(rel),
    allocationLocks: locks.map(rel),
    semanticDisposition: 'NOT_A_CANDIDATE_ATTEMPT_AND_NOT_A_SEMANTIC_REJECTION',
    allocationConsumed: false,
    candidate6BudgetConsumed: false,
    checkpoint47PreservedAppendOnly: true,
    supersedingAction:
      'Append a reconciled safe checkpoint with the exact Candidate-5 linked-retry active base; do not rewrite row 47.',
    pass: row46.eventSha256 === EXPECTED.checkpoint46Event
      && row47.eventSha256 === EXPECTED.checkpoint47Event
      && row47.blocker === 'C34_EXACTLY_ONE_MODE_REQUIRED_[]'
      && state.registry.attempts.length === 226
      && state.wal.length === 26
      && state.directories.length === 8
      && sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
      && sha(fs.readFileSync(WAL)) === EXPECTED.wal
      && cp01State().registryRecords.length === 0
      && cp01State().walRecords.length === 0
      && cp01State().directories.length === 0
      && processes.inspectionSucceeded
      && processes.activeC34.length === 0
      && processes.unreadable.length === 0
      && processes.listeners5173.length === 0
      && temporary.length === 0
      && locks.length === 0
      && gitStatus.serviceDiff === ''
      && gitStatus.staged === '',
  }));
  requirePass(evidence.pass, 'C34_CP46_DIAGNOSTIC_ADJUDICATION_FAILED');
  const fixedUtc = evidence.generatedUtc;
  const checkpoint = ensureHistoricalOrAppendCheckpoint({
    updatedAtUtc: fixedUtc,
    stage: 'checkpoint 47 diagnostic no-allocation reconciliation',
    status: 'CHECKPOINT_47_NO_ALLOCATION_DIAGNOSTIC_SUPERSEDED',
    activeBaseHash: EXPECTED.activeBase,
    artifacts: [ART.diagnostic47, CHECKPOINT_46, CHECKPOINT_47, REGISTRY, WAL],
    nextExactOperation:
      'Verify checkpoint-46 continuity and Candidate-6 non-duplication, then authorize exactly one frozen Candidate-6 attempt.',
    safeToResume: true,
  });
  const replay = appendIdempotentCheckpoint({
    updatedAtUtc: fixedUtc,
    stage: 'checkpoint 47 diagnostic no-allocation reconciliation',
    status: 'CHECKPOINT_47_NO_ALLOCATION_DIAGNOSTIC_SUPERSEDED',
    activeBaseHash: EXPECTED.activeBase,
    artifacts: [ART.diagnostic47, CHECKPOINT_46, CHECKPOINT_47, REGISTRY, WAL],
    nextExactOperation:
      'Verify checkpoint-46 continuity and Candidate-6 non-duplication, then authorize exactly one frozen Candidate-6 attempt.',
    safeToResume: true,
    ordinal: checkpoint.event.ordinal,
  });
  requirePass(!replay.appended, 'C34_CP46_DIAGNOSTIC_CHECKPOINT_NOT_IDEMPOTENT');
  return { chain: validateCheckpointChain(), checkpoint: checkpoint.event, appended: true, evidence };
}

function reconcilePreallocationSandboxDiagnostic() {
  if (!fs.existsSync(ART.preallocationSandboxTerminal)) return null;
  const failedState = readJson(ART.preallocationSandboxTerminal);
  if (!fs.existsSync(ART.preallocationSandboxAdjudication)) {
    const state = cp01State();
    const processes = processState();
    const status = gitState();
    const temporary = temporaryRuntimeDirectories();
    const locks = allocationLocks();
    requirePass(
      !fs.existsSync(ART.authorization)
        && !fs.existsSync(ART.candidate6Result)
        && state.registryRecords.length === 0
        && state.walRecords.length === 0
        && state.directories.length === 0
        && failedState.classification === 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
        && failedState.candidate6?.status === 'NOT_ALLOCATED'
        && failedState.reconciliation?.registrySha256 === EXPECTED.registry
        && failedState.reconciliation?.walSha256 === EXPECTED.wal
        && failedState.reconciliation?.registryAttempts === 226
        && failedState.reconciliation?.walRows === 26
        && failedState.reconciliation?.attemptDirectories === 8
        && failedState.processState?.inspectionSucceeded === false
        && /Access denied/i.test(failedState.processState?.error || '')
        && failedState.pass === false
        && processes.inspectionSucceeded
        && processes.activeC34.length === 0
        && processes.unreadable.length === 0
        && processes.listeners5173.length === 0
        && temporary.length === 0
        && locks.length === 0
        && status.serviceDiff === ''
        && status.staged === '',
      'C34_CP46_SANDBOX_DIAGNOSTIC_ADJUDICATION_PREFLIGHT_FAILED',
    );
  }
  const adjudication = stableGeneratedJson(
    ART.preallocationSandboxAdjudication,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      classification: 'NO_ALLOCATION_SANDBOX_PROCESS_INSPECTION_DENIAL',
      failedTerminalState: hashRecord(ART.preallocationSandboxTerminal),
      failedOperation:
        'checkpoint-46 continuation pre-allocation continuity/environment inspection',
      blocker: 'C34_CP46_CONTINUITY_OR_ENVIRONMENT_INVALID',
      rootCause:
        'The workspace sandbox denied Win32_Process CIM inspection. The semantic authorization and allocation path was never reached.',
      semanticDisposition: 'NOT_A_CANDIDATE_ATTEMPT_AND_NOT_A_SEMANTIC_REJECTION',
      authorizationWritten: false,
      allocationConsumed: false,
      candidate6BudgetConsumed: false,
      registry: hashRecord(REGISTRY),
      wal: hashRecord(WAL),
      c34AttemptDirectories: 8,
      controllingActiveBaseHash: EXPECTED.activeBase,
      repairedExecutionCondition:
        'Rerun the exact continuation runner with process-inspection privilege; do not weaken or bypass the process gate.',
      preservedAppendOnly: true,
      candidate7Authorized: false,
      c35Authorized: false,
      pass: true,
    }),
  );
  requirePass(
    adjudication.pass
      && adjudication.registry.sha256 === EXPECTED.registry
      && adjudication.wal.sha256 === EXPECTED.wal,
    'C34_CP46_SANDBOX_DIAGNOSTIC_ADJUDICATION_INVALID',
  );
  const checkpoint = ensureHistoricalOrAppendCheckpoint({
    updatedAtUtc: adjudication.generatedUtc,
    stage: 'sandbox process-inspection no-allocation reconciliation',
    status: 'PREALLOCATION_SANDBOX_DIAGNOSTIC_SUPERSEDED',
    activeBaseHash: EXPECTED.activeBase,
    artifacts: [
      ART.preallocationSandboxTerminal,
      ART.preallocationSandboxAdjudication,
      REGISTRY,
      WAL,
    ],
    nextExactOperation:
      'With live process-inspection privilege, repeat all Candidate-6 authorization and non-duplication gates, then allocate exactly once only if they pass.',
    safeToResume: true,
    historicalMutableArtifacts: [REGISTRY, WAL],
  });
  return { adjudication, checkpoint: checkpoint.event, appended: checkpoint.appended };
}

function reconcilePreallocationStartingLedgerGuardDiagnostic() {
  if (!fs.existsSync(ART.preallocationStartingGuardTerminal)) return null;
  const failedState = readJson(ART.preallocationStartingGuardTerminal);
  const initialChain = validateCheckpointChain();
  const reconciliationCheckpointExists = initialChain.records.some(
    ({ event }) => event.stage === 'starting-ledger guard no-allocation reconciliation',
  );
  if (
    !fs.existsSync(ART.preallocationStartingGuardAdjudication)
    || !reconciliationCheckpointExists
  ) {
    const candidate6State = cp01State();
    const exactState = exactC34AttemptState();
    const processes = processState();
    const status = gitState();
    const temporary = temporaryRuntimeDirectories();
    const locks = allocationLocks();
    const ledger = C.reconcileC34AttemptLedger({ throwOnFailure: false });
    const chain = validateCheckpointChain();
    const diagnosticCheckpoint = chain.records[49]?.event;
    const failedTerminalCheckpointRecord =
      diagnosticCheckpoint?.artifactHashes?.find(
        (record) => record.path === rel(ART.preallocationStartingGuardTerminal),
      );
    requirePass(
      chain.pass
        && chain.rows >= 50
        && diagnosticCheckpoint?.ordinal === 50
        && diagnosticCheckpoint?.stage === 'four-hour terminal reconciliation'
        && diagnosticCheckpoint?.status === 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
        && diagnosticCheckpoint?.safeToResume === true
        && diagnosticCheckpoint?.activeAttemptId == null
        && diagnosticCheckpoint?.activeBaseHash === EXPECTED.activeBase
        && diagnosticCheckpoint?.blocker
          === 'C34_CP46_STARTING_REGISTRY_WAL_DIRECTORY_OR_LEDGER_INVALID'
        && JSON.stringify(failedTerminalCheckpointRecord)
          === JSON.stringify(hashRecord(ART.preallocationStartingGuardTerminal))
        && !fs.existsSync(ART.authorization)
        && !fs.existsSync(ART.candidate6Result)
        && candidate6State.registryRecords.length === 0
        && candidate6State.walRecords.length === 0
        && candidate6State.directories.length === 0
        && candidate6State.checkpointRows.length === 0
        && failedState.classification === 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
        && failedState.safeToResume === true
        && failedState.activeAttemptId == null
        && failedState.activeBaseHash === EXPECTED.activeBase
        && failedState.generatedUtc === diagnosticCheckpoint.updatedAtUtc
        && failedState.endingCheckpointOrdinal === diagnosticCheckpoint.ordinal
        && failedState.blocker
          === 'C34_CP46_STARTING_REGISTRY_WAL_DIRECTORY_OR_LEDGER_INVALID'
        && failedState.candidate6?.status === 'NOT_ALLOCATED'
        && failedState.candidate6?.disposition === 'NOT_EXECUTED'
        && failedState.opus?.invocationStatus === 'NOT_INVOKED'
        && failedState.git?.stagedPaths?.length === 0
        && failedState.reconciliation?.registrySha256 === EXPECTED.registry
        && failedState.reconciliation?.walSha256 === EXPECTED.wal
        && failedState.reconciliation?.registryAttempts === 226
        && failedState.reconciliation?.walRows === 26
        && failedState.reconciliation?.attemptDirectories === 8
        && failedState.reconciliation?.ledgerPass === true
        && failedState.pass === true
        && sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
        && sha(fs.readFileSync(WAL)) === EXPECTED.wal
        && exactState.registry.attempts.length === 226
        && exactState.c34.length === 8
        && exactState.wal.length === 26
        && exactState.directories.length === 8
        && JSON.stringify(exactState.c34.map((attempt) => attempt.attemptId).sort())
          === JSON.stringify(exactState.directories)
        && exactState.registry.summary.orphan === 0
        && exactState.registry.summary.dangling === 0
        && exactState.registry.summary.c34RunningAttemptIds.length === 0
        && ledger.pass
        && processes.inspectionSucceeded
        && processes.activeC34.length === 0
        && processes.unreadable.length === 0
        && processes.listeners5173.length === 0
        && temporary.length === 0
        && locks.length === 0
        && status.serviceDiff === ''
        && status.staged === '',
      'C34_CP46_STARTING_LEDGER_GUARD_DIAGNOSTIC_ADJUDICATION_PREFLIGHT_FAILED',
    );
  }
  const adjudication = stableGeneratedJson(
    ART.preallocationStartingGuardAdjudication,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      classification: 'NO_ALLOCATION_STARTING_LEDGER_GUARD_BOOKKEEPING_DEFECT',
      failedTerminalState: hashRecord(ART.preallocationStartingGuardTerminal),
      failedCheckpointOrdinal: 50,
      failedOperation:
        'checkpoint-46 continuation Candidate-6 pre-authorization starting-ledger guard',
      blocker: 'C34_CP46_STARTING_REGISTRY_WAL_DIRECTORY_OR_LEDGER_INVALID',
      rootCause:
        'The additive continuation runner reused cp01State().directories, which is intentionally Candidate-6-only, as the global C34 attempt-directory collection. The resulting zero-versus-eight comparison failed before semantic authorization or allocation even though the exact registry, WAL, directory, and reconciled-ledger invariants passed.',
      repair:
        'Use exactC34AttemptState() for global starting registry/WAL/directory invariants and retain cp01State() only for Candidate-6 non-duplication checks.',
      semanticDisposition: 'NOT_A_CANDIDATE_ATTEMPT_AND_NOT_A_SEMANTIC_REJECTION',
      authorizationWritten: false,
      allocationConsumed: false,
      candidate6BudgetConsumed: false,
      registry: hashRecord(REGISTRY),
      wal: hashRecord(WAL),
      c34AttemptDirectories: 8,
      controllingActiveBaseHash: EXPECTED.activeBase,
      preservedAppendOnly: true,
      candidate7Authorized: false,
      c35Authorized: false,
      pass: true,
    }),
  );
  requirePass(
    adjudication.pass
      && adjudication.registry.sha256 === EXPECTED.registry
      && adjudication.wal.sha256 === EXPECTED.wal,
    'C34_CP46_STARTING_LEDGER_GUARD_DIAGNOSTIC_ADJUDICATION_INVALID',
  );
  const checkpoint = ensureHistoricalOrAppendCheckpoint({
    updatedAtUtc: adjudication.generatedUtc,
    stage: 'starting-ledger guard no-allocation reconciliation',
    status: 'PREALLOCATION_STARTING_LEDGER_GUARD_DIAGNOSTIC_SUPERSEDED',
    activeBaseHash: EXPECTED.activeBase,
    artifacts: [
      ART.preallocationStartingGuardTerminal,
      ART.preallocationStartingGuardAdjudication,
      REGISTRY,
      WAL,
    ],
    nextExactOperation:
      'Repeat all Candidate-6 authorization and non-duplication gates using the exact global C34 state, then allocate exactly once only if every gate passes.',
    safeToResume: true,
    historicalMutableArtifacts: [REGISTRY, WAL],
  });
  return { adjudication, checkpoint: checkpoint.event, appended: checkpoint.appended };
}

function removeOwnedTemp(directory, prefix) {
  const resolved = path.resolve(directory);
  const tempRoot = path.resolve(os.tmpdir());
  requirePass(
    resolved.startsWith(`${tempRoot}${path.sep}`)
      && path.basename(resolved).startsWith(prefix),
    `C34_CP46_TEMP_OWNERSHIP_REFUSED_${resolved}`,
  );
  if (fs.existsSync(resolved)) fs.rmSync(resolved, { recursive: true, force: false });
}

async function loadFrozenExecutor() {
  requirePass(
    sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner,
    'C34_CP46_FROZEN_EXECUTOR_DRIFT',
  );
  requirePass(
    sha(fs.readFileSync(LIB)) === EXPECTED.lib,
    'C34_CP46_FROZEN_LIBRARY_DRIFT',
  );
  const source = fs.readFileSync(ORIGINAL_RUNNER, 'utf8');
  const marker = '\nasync function main() {';
  const markerIndex = source.indexOf(marker);
  requirePass(markerIndex > 0, 'C34_CP46_EXECUTOR_ADAPTER_MARKER_MISSING');
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
    'C34_CP46_CHECKPOINT_ADAPTER_MARKERS_MISSING',
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
    'C34_CP46_IDEMPOTENT_ADAPTER_MARKERS_MISSING',
  );
  const appendBlock = adaptedPrefix.slice(appendStart, appendEnd);
  const appendWithActive = appendBlock.replace(
    '\n    attemptId,\n    artifactHashes:',
    '\n    attemptId,\n    activeAttemptId: attemptId,\n    artifactHashes:',
  );
  requirePass(
    appendWithActive !== appendBlock,
    'C34_CP46_ACTIVE_ATTEMPT_ADAPTER_FAILED',
  );
  const adapted =
    adaptedPrefix.slice(0, appendStart)
    + appendWithActive
    + adaptedPrefix.slice(appendEnd)
    + `
export {
  CANDIDATES,
  aggregateEvidence,
  evaluatePreservation,
  loadCompletedReconstructionForRecovery,
  loadPreservationForRecovery,
  runComposition,
  runMaterialCandidate,
};
`;
  const temporary = path.join(
    os.tmpdir(),
    `tina-c34-checkpoint46-adapter-${process.pid}-`
      + `${crypto.randomBytes(6).toString('hex')}.mjs`,
  );
  fs.writeFileSync(temporary, adapted, { flag: 'wx' });
  try {
    return await import(`${pathToFileURL(temporary).href}?sha=${sha(Buffer.from(adapted))}`);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function acceptedAttempt(attemptId, ordinal) {
  const directory = path.join(ATT, attemptId);
  const attemptFile = path.join(directory, 'ATTEMPT.json');
  const resultFile = path.join(directory, 'ITERATION_RESULT.json');
  const snapshot = path.join(directory, 'runtime-snapshot');
  requirePass(
    fs.existsSync(attemptFile)
      && fs.existsSync(resultFile)
      && fs.existsSync(snapshot),
    `C34_CP46_ACCEPTED_ATTEMPT_FILES_MISSING_${attemptId}`,
  );
  const attempt = readJson(attemptFile);
  const result = readJson(resultFile);
  const identity = C.runtimeFor(snapshot);
  requirePass(
    attempt.status === 'completed'
      && attempt.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
      && result.attemptId === attemptId
      && result.candidateId === CANDIDATE_IDS[ordinal - 1]
      && result.accepted === true
      && result.disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
      && result.gates?.frozenLocksHeld === true
      && result.replay?.pass === true
      && result.fullHeadDiff?.replay?.pass === true
      && C.sameRuntime(identity, result.candidateIdentity)
      && sha(fs.readFileSync(resultFile)) === EXPECTED.acceptedResults[ordinal - 1],
    `C34_CP46_ACCEPTED_ATTEMPT_INVALID_${ordinal}`,
  );
  return {
    ordinal,
    attempt,
    result,
    resultFile,
    active: {
      attemptId,
      candidateId: result.candidateId,
      dir: snapshot,
      identity,
      gates: result.gates,
    },
  };
}

function acceptedChain() {
  const chain = ACCEPTED_ATTEMPTS.map((attemptId, index) =>
    acceptedAttempt(attemptId, index + 1));
  for (let index = 1; index < chain.length; index++) {
    requirePass(
      chain[index].result.activeBase.attemptId === chain[index - 1].attempt.attemptId
        && chain[index].result.activeBase.identity.servicesTreeDigest
          === chain[index - 1].active.identity.servicesTreeDigest,
      `C34_CP46_ACCEPTED_CHAIN_LINK_${index + 1}`,
    );
  }
  requirePass(
    chain.at(-1).active.identity.servicesTreeDigest === EXPECTED.activeBase
      && chain.at(-1).result.metrics.reasonPassed === 3575
      && chain.at(-1).result.metrics.reasonMismatches === 145
      && sha(fs.readFileSync(chain.at(-1).resultFile)) === EXPECTED.candidate5Result,
    'C34_CP46_CANDIDATE5_ACTIVE_BASE_INVALID',
  );
  return chain;
}

async function protectedAcceptedRows(accepted, active) {
  const analyze = await C.loadAnalyzerFrom(
    active.dir,
    `c34-checkpoint46-protected-${accepted.length}-${active.identity.servicesTreeDigest}`,
  );
  const sources = accepted.flatMap((item) => [
    ...item.result.rowLevel.newlyCorrected.map((record) => ({
      category: `candidate${item.ordinal}-r3-correction`,
      attemptId: item.attempt.attemptId,
      candidateId: item.result.candidateId,
      oracleId: record.oracleId,
      query: record.query,
    })),
    ...item.result.generalization.rows.map((record) => ({
      category: `candidate${item.ordinal}-packet-${record.category}`,
      attemptId: item.attempt.attemptId,
      candidateId: item.result.candidateId,
      oracleId: null,
      query: record.query,
    })),
    ...item.result.leaveOneFamilyOut.records.map((record) => ({
      category: `candidate${item.ordinal}-leave-family-out`,
      attemptId: item.attempt.attemptId,
      candidateId: item.result.candidateId,
      oracleId: null,
      query: record.query,
    })),
  ]);
  const seen = new Set();
  return sources.flatMap((record) => {
    const key = record.query.trim().replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...record, signature: C.outputSignature(analyze(record.query)) }];
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

function sourceMarkerCounts(directory) {
  const source = fs.readFileSync(
    path.join(directory, 'philippine-tax-intent-analyzer.js'),
    'utf8',
  );
  const markers = [
    'const c34OrdinaryDomainInquiryHasNoTaxRelation',
    'const c34LocalIdentifierRedefinition',
    'const c34CopularShortTaxTopic',
    'const c34ImportDutyInstrumentTopic',
    'const c34LegalRuleBearsTaxTreatment',
    'const c34TaxRemedyDeadlineIsCompliance',
  ];
  return Object.fromEntries(markers.map((marker, index) => [
    `candidate${index + 1}`,
    source.split(marker).length - 1,
  ]));
}

function previewCandidate6(executor, active) {
  const prefix = 'tina-c34-closure-candidate6-preview-';
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    const runtime = path.join(temporaryRoot, 'runtime');
    const beforeMarkers = sourceMarkerCounts(active.dir);
    const identity = C.materializeCandidate(
      active.dir,
      runtime,
      [executor.CANDIDATES[5].block],
    );
    const patch = C.canonicalPatch(active.dir, runtime);
    const afterMarkers = sourceMarkerCounts(runtime);
    requirePass(
      beforeMarkers.candidate1 === 1
        && beforeMarkers.candidate2 === 1
        && beforeMarkers.candidate3 === 1
        && beforeMarkers.candidate4 === 1
        && beforeMarkers.candidate5 === 1
        && beforeMarkers.candidate6 === 0
        && afterMarkers.candidate1 === 1
        && afterMarkers.candidate2 === 1
        && afterMarkers.candidate3 === 1
        && afterMarkers.candidate4 === 1
        && afterMarkers.candidate5 === 1
        && afterMarkers.candidate6 === 1
        && patch.pass
        && patch.headersValid
        && !patch.hasForbiddenPath
        && identity.servicesTreeDigest !== active.identity.servicesTreeDigest,
      'C34_CP46_CANDIDATE6_PREVIEW_INVALID',
    );
    return {
      candidate: {
        id: executor.CANDIDATES[5].id,
        cycle: executor.CANDIDATES[5].cycle,
        frontier: executor.CANDIDATES[5].frontier,
        principle: executor.CANDIDATES[5].principle,
        observablePredicate: executor.CANDIDATES[5].observablePredicate,
        expectedReason: executor.CANDIDATES[5].expectedReason,
        expectedDecision: executor.CANDIDATES[5].expectedDecision,
        forecastCorrections: executor.CANDIDATES[5].forecastCorrections,
      },
      exactActiveBaseHash: active.identity.servicesTreeDigest,
      beforeMarkers,
      afterMarkers,
      materializedIdentity: identity,
      canonicalPatch: {
        sha256: patch.sha256,
        bytes: patch.bytes,
        changedFiles: patch.changedFiles,
        headersValid: patch.headersValid,
        hasForbiddenPath: patch.hasForbiddenPath,
        pass: patch.pass,
      },
      semanticGatesExecuted: false,
      allocationPerformed: false,
      pass: true,
    };
  } finally {
    removeOwnedTemp(temporaryRoot, prefix);
  }
}

function checkpoint46PrefixBytes() {
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8').split(/\r?\n/).filter(Boolean);
  requirePass(lines.length >= 46, 'C34_CP46_LOG_SHORT');
  return Buffer.from(`${lines.slice(0, 46).join('\n')}\n`);
}

async function authorizeCandidate6(executor) {
  const chainValidation = validateCheckpointChain();
  requirePass(chainValidation.pass && chainValidation.rows >= 48, 'C34_CP46_CHAIN_INVALID');
  const cp46 = readJson(CHECKPOINT_46);
  const cp47 = readJson(CHECKPOINT_47);
  const current = readJson(CHECKPOINT);
  const recoveryManifest = verifyManifest(CANDIDATE_5_RECOVERY_MANIFEST, 15);
  const accepted = acceptedChain();
  const active = accepted.at(-1).active;
  const state = cp01State();
  const processes = processState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const status = gitState();
  const hypotheses = readJson(HYPOTHESES);
  const frozenOrder = (hypotheses.materialCandidateOrder || [])
    .map((item) => item.candidateId);
  let resumedCandidate6 = null;
  if (
    state.registryRecords.length === 1
    && state.directories.length === 1
  ) {
    resumedCandidate6 = hydrateCandidate6Terminal(state.registryRecords[0]);
  }
  const permittedCurrentActiveBaseHashes = new Set([EXPECTED.activeBase]);
  if (resumedCandidate6?.result?.accepted === true) {
    permittedCurrentActiveBaseHashes.add(
      resumedCandidate6.result.candidateIdentity.servicesTreeDigest,
    );
  }
  const permittedCurrentActiveAttemptIds = new Set([null]);
  if (resumedCandidate6) {
    permittedCurrentActiveAttemptIds.add(resumedCandidate6.attempt.attemptId);
  }
  const existingCompositionState = composeState();
  if (
    existingCompositionState.registryRecords.length === 1
    && existingCompositionState.directories.length === 1
  ) {
    const resumedComposition = hydrateCompositionTerminal(
      existingCompositionState.registryRecords[0],
    );
    permittedCurrentActiveAttemptIds.add(resumedComposition.attempt.attemptId);
  }
  requirePass(
    sha(fs.readFileSync(CHECKPOINT_46)) === EXPECTED.checkpoint46
      && cp46.ordinal === 46
      && cp46.eventSha256 === EXPECTED.checkpoint46Event
      && cp46.safeToResume === true
      && cp46.activeAttemptId == null
      && cp46.activeBaseHash === EXPECTED.activeBase
      && sha(checkpoint46PrefixBytes()) === EXPECTED.checkpoint46Log
      && cp47.eventSha256 === EXPECTED.checkpoint47Event
      && current.ordinal >= 48
      && current.safeToResume === true
      && permittedCurrentActiveAttemptIds.has(current.activeAttemptId)
      && permittedCurrentActiveBaseHashes.has(current.activeBaseHash)
      && recoveryManifest.pass
      && recoveryManifest.manifest.sha256 === EXPECTED.candidate5RecoveryManifest
      && sha(fs.readFileSync(HYPOTHESES)) === EXPECTED.hypotheses
      && JSON.stringify(frozenOrder) === JSON.stringify(CANDIDATE_IDS)
      && sha(fs.readFileSync(ORIGINAL_RUNNER)) === EXPECTED.originalRunner
      && sha(fs.readFileSync(LIB)) === EXPECTED.lib
      && status.head === EXPECTED.startHead
      && status.upstream === EXPECTED.startHead
      && status.sync === '0\t0'
      && status.serviceDiff === ''
      && status.staged === ''
      && status.roadmapV7V8Diff === ''
      && status.oracleDiff === ''
      && !status.indexLock
      && status.c35Items.length === 0
      && processes.inspectionSucceeded
      && processes.activeC34.length === 0
      && processes.unreadable.length === 0
      && processes.listeners5173.length === 0
      && temporary.length === 0
      && locks.length === 0,
    'C34_CP46_CONTINUITY_OR_ENVIRONMENT_INVALID',
  );
  if (
    state.registryRecords.length === 0
    && state.walRecords.length === 0
    && state.directories.length === 0
  ) {
    const exactStartingState = exactC34AttemptState();
    const startingLedger = C.reconcileC34AttemptLedger({ throwOnFailure: false });
    requirePass(
      sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
        && sha(fs.readFileSync(WAL)) === EXPECTED.wal
        && exactStartingState.registry.attempts.length === 226
        && exactStartingState.c34.length === 8
        && exactStartingState.wal.length === 26
        && exactStartingState.directories.length === 8
        && JSON.stringify(
          exactStartingState.c34.map((attempt) => attempt.attemptId).sort(),
        ) === JSON.stringify(exactStartingState.directories)
        && exactStartingState.registry.summary.orphan === 0
        && exactStartingState.registry.summary.dangling === 0
        && exactStartingState.registry.summary.c34RunningAttemptIds.length === 0
        && startingLedger.pass,
      'C34_CP46_STARTING_REGISTRY_WAL_DIRECTORY_OR_LEDGER_INVALID',
    );
  }
  if (
    state.registryRecords.length > 0
    || state.walRecords.length > 0
    || state.directories.length > 0
    || state.checkpointRows.length > 0
  ) {
    return {
      alreadyAllocated: true,
      accepted,
      active,
      state,
      authorization: readJson(ART.authorization),
      nonDuplication: readJson(ART.candidate6NonDuplication),
      compatibility: readJson(ART.candidate6Compatibility),
    };
  }
  const preview = previewCandidate6(executor, active);
  const protectedRows = await protectedAcceptedRows(accepted, active);
  const extension = extendPreservation(
    executor.loadPreservationForRecovery(),
    protectedRows,
  );
  requirePass(
    protectedRows.length === 301
      && extension.counts.r3Corrections === 71
      && extension.counts.packet === 205
      && extension.counts.leaveFamilyOut === 25
      && extension.preservation.priorCorrectRows.length === 3575
      && extension.preservation.generalization.required === 236
      && extension.preservation.leaveOneFamilyOut.required === 29,
    'C34_CP46_CANDIDATE6_PRESERVATION_CONTRACT_INVALID',
  );
  const authorization = stableGeneratedJson(ART.authorization, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    sessionStartedUtc: EXPECTED.sessionStartedUtc,
    sessionHardStopUtc: EXPECTED.sessionHardStopUtc,
    startingCheckpoint: {
      path: rel(CHECKPOINT_46),
      sha256: EXPECTED.checkpoint46,
      eventSha256: EXPECTED.checkpoint46Event,
      ordinal: 46,
    },
    interveningDiagnosticReconciliation: hashRecord(ART.diagnostic47),
    preallocationSandboxDiagnosticReconciliation:
      fs.existsSync(ART.preallocationSandboxAdjudication)
        ? hashRecord(ART.preallocationSandboxAdjudication)
        : null,
    preallocationStartingLedgerGuardDiagnosticReconciliation:
      fs.existsSync(ART.preallocationStartingGuardAdjudication)
        ? hashRecord(ART.preallocationStartingGuardAdjudication)
        : null,
    candidate5RecoveryManifest: hashRecord(CANDIDATE_5_RECOVERY_MANIFEST),
    acceptedCandidateResultHashes: accepted.map((item) => hashRecord(item.resultFile)),
    activeBaseHash: active.identity.servicesTreeDigest,
    runnerHashes: {
      frozenExecutor: hashRecord(ORIGINAL_RUNNER),
      frozenLibrary: hashRecord(LIB),
      continuationRunnerAtAuthorization: hashRecord(THIS_RUNNER),
    },
    startingRegistry: hashRecord(REGISTRY),
    startingWal: hashRecord(WAL),
    hypotheses: hashRecord(HYPOTHESES),
    scope: {
      candidate: CANDIDATE_IDS[5],
      executeExactlyOnce: true,
      allocationCycle: 'cp01',
      governedCandidateOrdinal: 6,
      nextGovernedAllocationOrdinal: 7,
      preserveCandidates1Through5: true,
      candidate7Authorized: false,
      c35Authorized: false,
    },
    decision: 'AUTHORIZED_EXACTLY_ONE_FROZEN_CANDIDATE_6_ATTEMPT',
    pass: true,
  }));
  const nonDuplication = stableGeneratedJson(
    ART.candidate6NonDuplication,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      decision: 'PASS_READY_FOR_MATERIAL_CANDIDATE_6',
      candidateId: CANDIDATE_IDS[5],
      governedCandidateOrdinal: 6,
      nextGovernedAllocationOrdinal: 7,
      frozenOrder,
      activeBaseHash: active.identity.servicesTreeDigest,
      duplicateSearch: {
        canonicalRegistry: state.registryRecords.length,
        allocationWal: state.walRecords.length,
        attemptDirectories: state.directories.length,
        checkpointLog: state.checkpointRows.length,
        allocationLock: state.lockPresent,
      },
      acceptedLinkage: accepted.map((item) => ({
        ordinal: item.ordinal,
        attemptId: item.attempt.attemptId,
        candidateId: item.result.candidateId,
        resultSha256: sha(fs.readFileSync(item.resultFile)),
        activeBaseAttemptId: item.result.activeBase.attemptId,
        endingIdentity: item.active.identity.servicesTreeDigest,
      })),
      technicalOriginalsPreserved: TECHNICAL_ORIGINALS.map((attemptId) => ({
        attemptId,
        attempt: hashRecord(path.join(ATT, attemptId, 'ATTEMPT.json')),
      })),
      preview,
      allocationPerformed: false,
      semanticGatesExecuted: false,
      pass: state.registryRecords.length === 0
        && state.walRecords.length === 0
        && state.directories.length === 0
        && state.checkpointRows.length === 0
        && !state.lockPresent,
    }),
  );
  const compatibility = stableGeneratedJson(
    ART.candidate6Compatibility,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      decision: 'PASS_READY_FOR_MATERIAL_CANDIDATE_6',
      governedCandidateOrdinal: 6,
      nextGovernedAllocationOrdinal: 7,
      activeBase: {
        attemptId: active.attemptId,
        candidateId: active.candidateId,
        identity: active.identity,
        metrics: active.gates.metrics,
      },
      candidate: preview.candidate,
      canonicalPatch: preview.canonicalPatch,
      sourceMarkersBefore: preview.beforeMarkers,
      sourceMarkersAfter: preview.afterMarkers,
      acceptedPreservation: {
        uniqueRows: protectedRows.length,
        r3Corrections: extension.counts.r3Corrections,
        packetRows: extension.counts.packet,
        leaveFamilyOutRows: extension.counts.leaveFamilyOut,
        extendedPriorCorrectRows: extension.preservation.priorCorrectRows.length,
        extendedGeneralizationRequired: extension.preservation.generalization.required,
        extendedLeaveFamilyOutRequired:
          extension.preservation.leaveOneFamilyOut.required,
      },
      decisionRelationExact:
        active.gates.metrics.decisionPassed === 3720
        && active.gates.metrics.relationPassed === 3720,
      frozenLocksHeld: active.gates.frozenLocksHeld,
      allocationPerformed: false,
      semanticGatesExecuted: false,
      pass: preview.pass
        && protectedRows.length === 301
        && active.gates.frozenLocksHeld
        && active.gates.metrics.decisionPassed === 3720
        && active.gates.metrics.relationPassed === 3720,
    }),
  );
  requirePass(
    authorization.pass
      && nonDuplication.pass
      && compatibility.pass
      && nonDuplication.decision === 'PASS_READY_FOR_MATERIAL_CANDIDATE_6'
      && compatibility.decision === 'PASS_READY_FOR_MATERIAL_CANDIDATE_6',
    'C34_CP46_CANDIDATE6_AUTHORIZATION_FAILED',
  );
  return {
    alreadyAllocated: false,
    accepted,
    active,
    state,
    authorization,
    nonDuplication,
    compatibility,
    preservation: extension.preservation,
    protectedRows,
  };
}

async function withOwnedLock(file, purpose, action) {
  const token = {
    schemaVersion: 1,
    unit: UNIT,
    createdUtc: now(),
    pid: process.pid,
    token: crypto.randomBytes(16).toString('hex'),
    purpose,
  };
  fs.writeFileSync(file, `${JSON.stringify(token, null, 2)}\n`, { flag: 'wx' });
  try {
    return await action(token);
  } finally {
    if (fs.existsSync(file)) {
      const current = readJson(file);
      requirePass(
        current.pid === token.pid && current.token === token.token,
        `C34_CP46_ALLOCATION_LOCK_OWNERSHIP_LOST_${rel(file)}`,
      );
      fs.unlinkSync(file);
    }
  }
}

function hydrateCandidate6Terminal(record) {
  const directory = path.join(ATT, record.attemptId);
  const attempt = readJson(path.join(directory, 'ATTEMPT.json'));
  const resultFile = path.join(directory, 'ITERATION_RESULT.json');
  const result = fs.existsSync(resultFile) ? readJson(resultFile) : null;
  requirePass(
    ['completed', 'technical_failure'].includes(attempt.status)
      && attempt.cycle === 'cp01'
      && attempt.attemptOrdinal === 7
      && attempt.retryOf == null,
    'C34_CP46_CANDIDATE6_EXISTING_ATTEMPT_NOT_TERMINAL_GOVERNED',
  );
  if (attempt.status === 'completed') {
    requirePass(
      result
        && result.candidateId === CANDIDATE_IDS[5]
        && result.candidateOrdinal === 6
        && result.attemptOrdinal === 7
        && result.allocationCycle === 'cp01'
        && (result.accepted === true || result.disposition.startsWith('REJECTED_')),
      'C34_CP46_CANDIDATE6_EXISTING_RESULT_INVALID',
    );
  }
  return { attempt, result, resultFile, directory };
}

async function candidateRegressionValidation(protectedRows, selected) {
  const analyze = await C.loadAnalyzerFrom(
    selected.dir,
    `c34-checkpoint46-candidate6-regression-${selected.identity.servicesTreeDigest}`,
  );
  const records = protectedRows.map((record) => {
    const actualSignature = C.outputSignature(analyze(record.query));
    return {
      ...record,
      expectedSignature: record.signature,
      actualSignature,
      pass: actualSignature === record.signature,
    };
  });
  return {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    selectedIdentity: selected.identity.servicesTreeDigest,
    required: records.length,
    records,
    failures: records.filter((record) => !record.pass),
    pass: records.every((record) => record.pass),
  };
}

async function residualFamilySnapshot(active, label) {
  const analyze = await C.loadAnalyzerFrom(
    active.dir,
    `c34-checkpoint46-${label}-${active.identity.servicesTreeDigest}`,
  );
  const rows = L.loadR3();
  const residuals = rows.flatMap((row) => {
    const evidence = analyze(row.query);
    if (C.rowPass(row, evidence)) return [];
    return [{
      expectedReason: row.expectedReasonCodeFamily,
      actualReason: evidence.reasonCode,
      reasonOnly:
        evidence.decision === row.expectedDecision
        && (row.expectedRelations || []).every((relation) =>
          (evidence.relations || []).some((actual) =>
            actual.relation === relation.relation)),
    }];
  });
  const countFamilies = (field) => Object.fromEntries(
    [...new Set(residuals.map((record) => record[field]))]
      .sort()
      .map((family) => [
        family,
        residuals.filter((record) => record[field] === family).length,
      ]),
  );
  const expectedReasonFamilies = countFamilies('expectedReason');
  const actualReasonFamilies = countFamilies('actualReason');
  return {
    activeBaseHash: active.identity.servicesTreeDigest,
    reasonPassed: active.gates.metrics.reasonPassed,
    reasonMismatches: active.gates.metrics.reasonMismatches,
    residualCount: residuals.length,
    expectedReasonFamilies,
    actualReasonFamilies,
    allReasonOnly: residuals.every((record) => record.reasonOnly),
    pass: residuals.length === 3720 - active.gates.metrics.reasonPassed
      && residuals.every((record) => record.reasonOnly)
      && Object.values(expectedReasonFamilies)
        .reduce((sum, count) => sum + count, 0) === residuals.length
      && Object.values(actualReasonFamilies)
        .reduce((sum, count) => sum + count, 0) === residuals.length,
  };
}

function signedFamilyDelta(starting, ending) {
  const families = [...new Set([
    ...Object.keys(starting),
    ...Object.keys(ending),
  ])].sort();
  return Object.fromEntries(families.map((family) => [
    family,
    (ending[family] || 0) - (starting[family] || 0),
  ]));
}

async function candidateResidualFamilyDelta(starting, ending) {
  const before = await residualFamilySnapshot(starting, 'candidate6-residual-before');
  const after = C.sameRuntime(starting.identity, ending.identity)
    ? before
    : await residualFamilySnapshot(ending, 'candidate6-residual-after');
  const expectedReasonFamilyDelta = signedFamilyDelta(
    before.expectedReasonFamilies,
    after.expectedReasonFamilies,
  );
  const actualReasonFamilyDelta = signedFamilyDelta(
    before.actualReasonFamilies,
    after.actualReasonFamilies,
  );
  const residualCountDelta = after.residualCount - before.residualCount;
  return {
    starting: before,
    ending: after,
    residualCountDelta,
    expectedReasonFamilyDelta,
    actualReasonFamilyDelta,
    removedExpectedReasonFamilies: Object.fromEntries(
      Object.entries(expectedReasonFamilyDelta).filter(([, count]) => count < 0),
    ),
    addedExpectedReasonFamilies: Object.fromEntries(
      Object.entries(expectedReasonFamilyDelta).filter(([, count]) => count > 0),
    ),
    pass: before.pass
      && after.pass
      && Object.values(expectedReasonFamilyDelta)
        .reduce((sum, count) => sum + count, 0) === residualCountDelta
      && Object.values(actualReasonFamilyDelta)
        .reduce((sum, count) => sum + count, 0) === residualCountDelta,
  };
}

async function executeCandidate6(executor) {
  const permit = await authorizeCandidate6(executor);
  let hydrated;
  let selected;
  let technicalError = null;
  let resumedTerminal = false;
  if (permit.alreadyAllocated) {
    requirePass(
      permit.state.registryRecords.length === 1
        && permit.state.walRecords.length === 3
        && permit.state.directories.length === 1
        && JSON.stringify(
          permit.state.walRecords.map((row) => row.event).sort(),
        ) === JSON.stringify([
          'ALLOCATION_PLANNED',
          'ALLOCATION_REGISTERED',
          'ATTEMPT_TERMINAL',
        ]),
      'C34_CP46_CANDIDATE6_DUPLICATE_OR_PARTIAL_STATE',
    );
    hydrated = hydrateCandidate6Terminal(permit.state.registryRecords[0]);
    selected = hydrated.result?.accepted
      ? {
        attemptId: hydrated.attempt.attemptId,
        candidateId: hydrated.result.candidateId,
        dir: path.join(hydrated.directory, 'runtime-snapshot'),
        identity: hydrated.result.candidateIdentity,
        gates: hydrated.result.gates,
      }
      : permit.active;
    resumedTerminal = true;
  } else {
    requireLongOperationBudget('Candidate 6 allocation and frozen gate execution');
    const late = cp01State();
    requirePass(
      late.registryRecords.length === 0
        && late.walRecords.length === 0
        && late.directories.length === 0
        && late.checkpointRows.length === 0
        && !late.lockPresent,
      'C34_CP46_CANDIDATE6_LATE_DUPLICATION_REFUSED',
    );
    let execution;
    try {
      execution = await withOwnedLock(
        CANDIDATE_6_LOCK,
        'exactly one frozen Candidate-6 allocation and execution',
        () => executor.runMaterialCandidate(
          executor.CANDIDATES[5],
          6,
          permit.active,
          permit.preservation,
          { allocationCycle: 'cp01', allocationOrdinal: 7 },
        ),
      );
    } catch (error) {
      technicalError = error;
    }
    const ending = cp01State();
    requirePass(
      ending.registryRecords.length === 1
        && ending.walRecords.length === 3
        && ending.directories.length === 1
        && !fs.existsSync(CANDIDATE_6_LOCK),
      'C34_CP46_CANDIDATE6_ENDING_ALLOCATION_INVALID',
    );
    hydrated = hydrateCandidate6Terminal(ending.registryRecords[0]);
    if (execution?.attempt?.attemptId) {
      requirePass(
        execution.attempt.attemptId === hydrated.attempt.attemptId,
        'C34_CP46_CANDIDATE6_EXECUTION_HYDRATION_DRIFT',
      );
    }
    selected = hydrated.result?.accepted
      ? {
        attemptId: hydrated.attempt.attemptId,
        candidateId: hydrated.result.candidateId,
        dir: path.join(hydrated.directory, 'runtime-snapshot'),
        identity: hydrated.result.candidateIdentity,
        gates: hydrated.result.gates,
      }
      : permit.active;
  }
  const protectedRows = permit.protectedRows
    || await protectedAcceptedRows(permit.accepted, permit.active);
  requirePass(
    protectedRows.length === 301,
    'C34_CP46_CANDIDATE6_RESUMED_PROTECTED_ROWS_INVALID',
  );
  const regression = fs.existsSync(ART.candidate6Regression)
    ? readJson(ART.candidate6Regression)
    : await candidateRegressionValidation(protectedRows, selected);
  if (!fs.existsSync(ART.candidate6Regression)) {
    writeOnceJson(ART.candidate6Regression, regression);
  }
  requirePass(
    regression.pass
      && regression.required === protectedRows.length
      && regression.selectedIdentity === selected.identity.servicesTreeDigest,
    'C34_CP46_CANDIDATE6_REGRESSION_EVIDENCE_INVALID',
  );
  const liveLedger = C.reconcileC34AttemptLedger({ throwOnFailure: true });
  const ledger = fs.existsSync(ART.candidate6Ledger)
    ? readJson(ART.candidate6Ledger)
    : liveLedger;
  if (!fs.existsSync(ART.candidate6Ledger)) {
    writeOnceJson(ART.candidate6Ledger, ledger);
  }
  requirePass(ledger.pass && liveLedger.pass, 'C34_CP46_CANDIDATE6_LEDGER_INVALID');
  const residualFamilyDelta = fs.existsSync(ART.candidate6Result)
    ? null
    : await candidateResidualFamilyDelta(permit.active, selected);
  if (residualFamilyDelta) {
    requirePass(
      residualFamilyDelta.pass,
      'C34_CP46_CANDIDATE6_RESIDUAL_FAMILY_DELTA_INVALID',
    );
  }
  const result = hydrated.result;
  const outcome = stableGeneratedJson(ART.candidate6Result, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: hydrated.attempt.status === 'completed'
      ? 'CANDIDATE_6_SEMANTIC_TERMINAL'
      : 'CANDIDATE_6_TECHNICAL_TERMINAL',
    attemptId: hydrated.attempt.attemptId,
    candidateId: CANDIDATE_IDS[5],
    cycle: hydrated.attempt.cycle,
    governedCandidateOrdinal: 6,
    governedAllocationOrdinal: hydrated.attempt.attemptOrdinal,
    status: hydrated.attempt.status,
    disposition: hydrated.attempt.disposition,
    semanticDisposition: hydrated.attempt.status === 'completed'
      ? hydrated.attempt.disposition
      : 'NOT_A_SEMANTIC_REJECTION',
    accepted: result?.accepted ?? false,
    startingActiveBaseHash: EXPECTED.activeBase,
    endingActiveBaseHash: selected.identity.servicesTreeDigest,
    startingMetrics: permit.active.gates.metrics,
    endingMetrics: selected.gates.metrics,
    metricDelta: {
      reasonPassed:
        selected.gates.metrics.reasonPassed - permit.active.gates.metrics.reasonPassed,
      reasonMismatches:
        selected.gates.metrics.reasonMismatches - permit.active.gates.metrics.reasonMismatches,
      decisionPassed:
        selected.gates.metrics.decisionPassed - permit.active.gates.metrics.decisionPassed,
      relationPassed:
        selected.gates.metrics.relationPassed - permit.active.gates.metrics.relationPassed,
    },
    residualFamilyDelta,
    iterationResult: result ? hashRecord(hydrated.resultFile) : null,
    protectedSignatureValidation: hashRecord(ART.candidate6Regression),
    ledger: hashRecord(ART.candidate6Ledger),
    technicalError: technicalError?.stack || null,
    candidate7Authorized: false,
    c35Authorized: false,
    pass: ledger.pass
      && regression.pass
      && (
        hydrated.attempt.status === 'completed'
        || hydrated.attempt.status === 'technical_failure'
      ),
  }));
  requirePass(
    outcome.pass
      && outcome.attemptId === hydrated.attempt.attemptId
      && outcome.endingActiveBaseHash === selected.identity.servicesTreeDigest
      && outcome.residualFamilyDelta?.pass === true,
    'C34_CP46_CANDIDATE6_OUTCOME_INVALID',
  );
  const checkpointOptions = {
    updatedAtUtc: outcome.generatedUtc,
    stage: 'candidate 6 post-terminal reconciliation',
    status: hydrated.attempt.status === 'completed'
      ? 'CANDIDATE_6_TERMINAL_RECONCILED'
      : 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER',
    activeBaseHash: selected.identity.servicesTreeDigest,
    artifacts: [
      ART.authorization,
      ART.candidate6NonDuplication,
      ART.candidate6Compatibility,
      ART.candidate6Result,
      ART.candidate6Regression,
      ART.candidate6Ledger,
      path.join(hydrated.directory, 'ATTEMPT.json'),
      ...(result ? [hydrated.resultFile] : []),
      REGISTRY,
      WAL,
    ],
    nextExactOperation: hydrated.attempt.status === 'completed'
      ? 'Allocate exactly one cumulative composition attempt over the terminal Candidate-1-to-6 semantic result set.'
      : 'Stop. Preserve the sole Candidate-6 technical attempt; a later governed prompt must adjudicate it. Do not allocate a replacement.',
    safeToResume: true,
    blocker: hydrated.attempt.status === 'completed'
      ? null
      : 'C34_CANDIDATE_6_TECHNICAL_FAILURE',
    historicalMutableArtifacts: [REGISTRY, WAL],
  };
  const cp = ensureHistoricalOrAppendCheckpoint(checkpointOptions);
  return {
    resumedTerminal,
    ...hydrated,
    selected,
    outcome,
    checkpoint: cp.event,
    technicalError,
    acceptedPredecessors: permit.accepted,
    priorActive: permit.active,
  };
}

function semanticCandidateResults(candidate6) {
  requirePass(
    candidate6.result
      && candidate6.attempt.status === 'completed'
      && candidate6.result.candidateId === CANDIDATE_IDS[5],
    'C34_CP46_CANDIDATE6_NOT_SEMANTIC_TERMINAL_FOR_COMPOSITION',
  );
  const results = [
    ...candidate6.acceptedPredecessors.map((item) => item.result),
    candidate6.result,
  ];
  requirePass(
    results.length === 6
      && JSON.stringify(results.map((result) => result.candidateId))
        === JSON.stringify(CANDIDATE_IDS)
      && results.every((result) =>
        result.accepted === true || result.disposition.startsWith('REJECTED_')),
    'C34_CP46_SEMANTIC_CANDIDATE_RESULT_SET_INVALID',
  );
  return results;
}

function hydrateCompositionTerminal(record) {
  const directory = path.join(ATT, record.attemptId);
  const attempt = readJson(path.join(directory, 'ATTEMPT.json'));
  const resultFile = path.join(directory, 'ITERATION_RESULT.json');
  const result = fs.existsSync(resultFile) ? readJson(resultFile) : null;
  requirePass(
    ['completed', 'technical_failure'].includes(attempt.status)
      && attempt.cycle === 'compose'
      && attempt.attemptOrdinal === 1,
    'C34_CP46_EXISTING_COMPOSITION_NOT_TERMINAL_GOVERNED',
  );
  if (attempt.status === 'completed') {
    requirePass(
      result
        && result.candidateId === 'C34-CUMULATIVE-ACCEPTED-RULE-COMPOSITION'
        && Array.isArray(result.acceptedCandidateIds),
      'C34_CP46_EXISTING_COMPOSITION_RESULT_INVALID',
    );
  }
  return { attempt, result, resultFile, directory };
}

async function executeComposition(executor, candidate6) {
  const initialBase = await executor.loadCompletedReconstructionForRecovery(
    RECONSTRUCTION_ATTEMPT,
  );
  const candidateResults = semanticCandidateResults(candidate6);
  const state = composeState();
  if (
    state.registryRecords.length > 0
    || state.walRecords.length > 0
    || state.directories.length > 0
  ) {
    requirePass(
      state.registryRecords.length === 1
        && state.directories.length === 1
        && !state.lockPresent,
      'C34_CP46_COMPOSITION_DUPLICATE_OR_PARTIAL_STATE',
    );
    const hydrated = hydrateCompositionTerminal(state.registryRecords[0]);
    return {
      resumedTerminal: true,
      ...hydrated,
      initialBase,
      active: candidate6.selected,
      candidateResults,
    };
  }
  requirePass(
    state.checkpointRows.length === 0
      && !state.lockPresent
      && allocationLocks().length === 0
      && temporaryRuntimeDirectories().length === 0,
    'C34_CP46_COMPOSITION_PREALLOCATION_INVALID',
  );
  requireLongOperationBudget('cumulative composition allocation and frozen gate execution');
  let execution;
  let technicalError = null;
  try {
    execution = await withOwnedLock(
      COMPOSITION_LOCK,
      'exactly one final C34 cumulative composition allocation and execution',
      () => executor.runComposition(
        initialBase,
        candidate6.selected,
        candidateResults,
      ),
    );
  } catch (error) {
    technicalError = error;
  }
  const ending = composeState();
  requirePass(
    ending.registryRecords.length === 1
      && ending.directories.length === 1
      && !fs.existsSync(COMPOSITION_LOCK),
    'C34_CP46_COMPOSITION_ENDING_ALLOCATION_INVALID',
  );
  const hydrated = hydrateCompositionTerminal(ending.registryRecords[0]);
  if (execution?.attempt?.attemptId) {
    requirePass(
      execution.attempt.attemptId === hydrated.attempt.attemptId,
      'C34_CP46_COMPOSITION_EXECUTION_HYDRATION_DRIFT',
    );
  }
  return {
    resumedTerminal: false,
    ...hydrated,
    initialBase,
    active: candidate6.selected,
    candidateResults,
    technicalError,
  };
}

function signatureExpectationRows(acceptedResults) {
  return acceptedResults.flatMap((result) => [
    ...result.rowLevel.newlyCorrected.map((record) => ({
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      category: 'r3-correction',
      oracleId: record.oracleId,
      query: record.query,
    })),
    ...result.generalization.rows.map((record) => ({
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      category: `packet-${record.category}`,
      oracleId: null,
      query: record.query,
    })),
    ...result.leaveOneFamilyOut.records.map((record) => ({
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      category: 'leave-family-out',
      oracleId: null,
      query: record.query,
    })),
  ]);
}

async function finalSignatureValidation(acceptedResults, active) {
  const analyze = await C.loadAnalyzerFrom(
    active.dir,
    `c34-checkpoint46-final-signatures-${active.identity.servicesTreeDigest}`,
  );
  const acceptedAnalyzers = Object.fromEntries(await Promise.all(
    acceptedResults.map(async (result) => [
      result.attemptId,
      await C.loadAnalyzerFrom(
        path.join(ATT, result.attemptId, 'runtime-snapshot'),
        `c34-checkpoint46-signature-source-${result.attemptId}`,
      ),
    ]),
  ));
  const records = signatureExpectationRows(acceptedResults).map((record) => {
    const expectedSignature =
      C.outputSignature(acceptedAnalyzers[record.attemptId](record.query));
    const actualSignature = C.outputSignature(analyze(record.query));
    return {
      ...record,
      expectedSignature,
      actualSignature,
      pass: actualSignature === expectedSignature,
    };
  });
  const byCandidate = Object.fromEntries(acceptedResults.map((result) => {
    const candidateRecords = records.filter((record) =>
      record.candidateId === result.candidateId);
    return [result.candidateId, {
      required: candidateRecords.length,
      failures: candidateRecords.filter((record) => !record.pass).length,
      pass: candidateRecords.every((record) => record.pass),
    }];
  }));
  return {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    finalActiveBaseHash: active.identity.servicesTreeDigest,
    required: records.length,
    byCandidate,
    records,
    failures: records.filter((record) => !record.pass),
    pass: records.every((record) => record.pass),
  };
}

async function computeFinalResidual(active, gates) {
  const analyze = await C.loadAnalyzerFrom(
    active.dir,
    `c34-checkpoint46-final-residual-${active.identity.servicesTreeDigest}`,
  );
  const rows = L.loadR3();
  const records = rows.flatMap((row) => {
    const evidence = analyze(row.query);
    if (C.rowPass(row, evidence)) return [];
    return [{
      oracleId: row.oracleId,
      query: row.query,
      sourceSet: row.sourceSet,
      primaryCategory: row.primaryCategory,
      expectedDecision: row.expectedDecision,
      expectedReason: row.expectedReasonCodeFamily,
      expectedRelations: (row.expectedRelations || []).map((relation) => relation.relation),
      actual: C.compactEvidence(evidence),
      reasonOnly:
        evidence.decision === row.expectedDecision
        && (row.expectedRelations || []).every((relation) =>
          (evidence.relations || []).some((actual) => actual.relation === relation.relation)),
    }];
  });
  const expectedReasonFamilies = records.reduce((counts, record) => {
    counts[record.expectedReason] = (counts[record.expectedReason] || 0) + 1;
    return counts;
  }, {});
  const actualReasonFamilies = records.reduce((counts, record) => {
    counts[record.actual.reasonCode] = (counts[record.actual.reasonCode] || 0) + 1;
    return counts;
  }, {});
  const inventory = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    activeBaseIdentity: active.identity,
    totalRows: rows.length,
    correctRows: rows.length - records.length,
    residualCount: records.length,
    expectedResidualFromReasonScore: 3720 - gates.metrics.reasonPassed,
    allReasonOnly: records.every((record) => record.reasonOnly),
    records,
    pass: records.length === 3720 - gates.metrics.reasonPassed
      && records.every((record) => record.reasonOnly),
  };
  const families = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: inventory.generatedUtc,
    activeBaseHash: active.identity.servicesTreeDigest,
    residualCount: records.length,
    expectedReasonFamilies,
    actualReasonFamilies,
    focusedReasonFamilies: gates.metrics.focusedReasonFamilies,
    sumExpectedFamilies: Object.values(expectedReasonFamilies)
      .reduce((sum, count) => sum + count, 0),
    pass: Object.values(expectedReasonFamilies)
      .reduce((sum, count) => sum + count, 0) === records.length,
  };
  return { inventory, families };
}

function validateRetryLinkage(registry, walRows) {
  const expected = [
    {
      original: TECHNICAL_ORIGINALS[0],
      retry: ACCEPTED_ATTEMPTS[0],
      reason: 'C34_FULL_HEAD_PATCH_INVALID',
      cycle: 'nt01-retry01',
    },
    {
      original: TECHNICAL_ORIGINALS[1],
      retry: ACCEPTED_ATTEMPTS[4],
      reason: 'C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED',
      cycle: 'tr01-retry01',
    },
  ];
  const records = expected.map((item) => {
    const original = registry.attempts.filter((attempt) =>
      attempt.attemptId === item.original);
    const retry = registry.attempts.filter((attempt) =>
      attempt.attemptId === item.retry);
    const retryPlans = walRows.filter((row) =>
      row.event === 'ALLOCATION_PLANNED' && row.retryOf === item.original);
    const adjudications = (registry.technicalAdjudications || []).filter((entry) =>
      entry.originalAttemptId === item.original);
    return {
      ...item,
      originalCount: original.length,
      retryCount: retry.length,
      retryPlanCount: retryPlans.length,
      adjudicationCount: adjudications.length,
      historicDisposition: original[0]?.disposition || null,
      retryStatus: retry[0]?.status || null,
      retryDisposition: retry[0]?.disposition || null,
      actualRetryOf: retry[0]?.retryOf || null,
      actualRetryReason: retry[0]?.retryReason || null,
      actualRetryType: retry[0]?.retryType || null,
      actualRetryCycle: retry[0]?.cycle || null,
      pass: original.length === 1
        && retry.length === 1
        && retryPlans.length === 1
        && adjudications.length === 1
        && original[0].status === 'technical_failure'
        && retry[0].status === 'completed'
        && retry[0].disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
        && retry[0].retryOf === item.original
        && retry[0].retryReason === item.reason
        && retry[0].retryType === 'TECHNICAL_LINKED_RETRY'
        && retry[0].cycle === item.cycle,
    };
  });
  return { records, pass: records.every((record) => record.pass) };
}

function registryWalReconciliation(active, expectedAttemptIds) {
  const registry = readJson(REGISTRY);
  const walRows = parseNdjson(WAL);
  const c34 = registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name).sort();
  const statusCounts = Object.fromEntries(
    [...new Set(registry.attempts.map((attempt) => attempt.status))].sort()
      .map((status) => [
        status,
        registry.attempts.filter((attempt) => attempt.status === status).length,
      ]),
  );
  const eventCounts = Object.fromEntries(
    [...new Set(walRows.map((row) => row.event))].sort().map((event) => [
      event,
      walRows.filter((row) => row.event === event).length,
    ]),
  );
  const retryLinkage = validateRetryLinkage(registry, walRows);
  const expected = {
    totalAttempts: 228,
    c34Attempts: 10,
    c34Directories: 10,
    walRows: 32,
    statusCounts: { completed: 226, technical_failure: 2 },
    eventCounts: {
      ALLOCATION_PLANNED: 10,
      ALLOCATION_REGISTERED: 10,
      ATTEMPT_TECHNICAL_ADJUDICATED: 2,
      ATTEMPT_TERMINAL: 10,
    },
    byCategory: {
      domain_campaign: 163,
      focused_suite: 13,
      other: 9,
      synthetic_validator: 43,
    },
    controlling: 225,
    nonControlling: 3,
  };
  const actual = {
    totalAttempts: registry.attempts.length,
    c34Attempts: c34.length,
    c34Directories: directories.length,
    walRows: walRows.length,
    statusCounts,
    eventCounts,
    byCategory: registry.summary.byCategory,
    controlling: registry.summary.controlling,
    nonControlling: registry.summary.nonControlling,
    orphan: registry.summary.orphan,
    dangling: registry.summary.dangling,
    running: registry.summary.c34RunningAttemptIds,
    selectedAttemptId: registry.selectedSemanticRuntime?.attemptId,
    selectedCandidateId: registry.selectedSemanticRuntime?.candidateId,
    selectedIdentity: registry.selectedSemanticRuntime?.identity?.servicesTreeDigest,
    c34AttemptIds: c34.map((attempt) => attempt.attemptId).sort(),
    c34DirectoryIds: directories,
  };
  const result = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    expected,
    actual,
    retryLinkage,
    prior218AttemptsSha256: sha(Buffer.from(JSON.stringify(registry.attempts.slice(0, 218)))),
    expectedPrior218AttemptsSha256:
      '8ffeba5e2f32b3399327afa4300f736f672125d86cd689f36acd1006a6c5947f',
  };
  result.pass =
    actual.totalAttempts === expected.totalAttempts
    && actual.c34Attempts === expected.c34Attempts
    && actual.c34Directories === expected.c34Directories
    && actual.walRows === expected.walRows
    && JSON.stringify(actual.statusCounts) === JSON.stringify(expected.statusCounts)
    && JSON.stringify(Object.entries(actual.eventCounts).sort())
      === JSON.stringify(Object.entries(expected.eventCounts).sort())
    && JSON.stringify(actual.byCategory) === JSON.stringify(expected.byCategory)
    && actual.controlling === expected.controlling
    && actual.nonControlling === expected.nonControlling
    && actual.orphan === 0
    && actual.dangling === 0
    && actual.running.length === 0
    && actual.selectedAttemptId === active.attemptId
    && actual.selectedCandidateId === active.candidateId
    && actual.selectedIdentity === active.identity.servicesTreeDigest
    && JSON.stringify(actual.c34AttemptIds) === JSON.stringify([...expectedAttemptIds].sort())
    && JSON.stringify(actual.c34AttemptIds) === JSON.stringify(actual.c34DirectoryIds)
    && result.prior218AttemptsSha256 === result.expectedPrior218AttemptsSha256
    && retryLinkage.pass;
  return result;
}

async function buildFinalClosure(executor, candidate6, composition) {
  requirePass(
    composition.attempt.status === 'completed'
      && composition.result?.pass === true
      && composition.result.disposition === 'ACCEPTED_CUMULATIVE_ORDER_INDEPENDENT',
    'C34_CP46_COMPOSITION_NOT_PASSING_FOR_CLOSURE',
  );
  const active = candidate6.selected;
  const candidateResults = composition.candidateResults;
  const acceptedResults = candidateResults.filter((result) => result.accepted);
  const expectedAcceptedIds = acceptedResults.map((result) => result.candidateId);
  requirePass(
    JSON.stringify(composition.result.acceptedCandidateIds)
      === JSON.stringify(expectedAcceptedIds)
      && C.sameRuntime(composition.result.forwardIdentity, active.identity)
      && composition.result.orderDrift.length === 0
      && composition.result.shadowing.length === 0,
    'C34_CP46_COMPOSITION_ACCEPTED_CHAIN_DRIFT',
  );
  const finalGates = await C.directGatesForDirectory(active.dir);
  const signatures = await finalSignatureValidation(acceptedResults, active);
  const residual = await computeFinalResidual(active, finalGates);
  const finalAnalyze = await C.loadAnalyzerFrom(
    active.dir,
    `c34-checkpoint46-final-preservation-${active.identity.servicesTreeDigest}`,
  );
  const baselinePreservation = executor.evaluatePreservation(
    executor.loadPreservationForRecovery(),
    finalAnalyze,
  );
  const cumulativePatch = C.canonicalPatch(composition.initialBase.dir, active.dir);
  const independentDualReplay = C.dualEnvironmentReplay(
    composition.initialBase.dir,
    active.dir,
    cumulativePatch,
    'c34_checkpoint46_final_cumulative',
  );
  const acceptedReplayRecords = acceptedResults.map((result) => ({
    candidateId: result.candidateId,
    attemptId: result.attemptId,
    candidateOnlyReplayPass: result.replay?.pass === true,
    fullHeadReplayPass: result.fullHeadDiff?.replay?.pass === true,
    canonicalPatchSha256: result.replay?.canonicalPatch?.sha256 || null,
    pass: result.replay?.pass === true && result.fullHeadDiff?.replay?.pass === true,
  }));
  const generalizationRecords = candidateResults.map((result) => ({
    candidateId: result.candidateId,
    attemptId: result.attemptId,
    accepted: result.accepted,
    disposition: result.disposition,
    generalizationPass: result.generalization?.pass === true,
    leaveOneFamilyOutPass: result.leaveOneFamilyOut?.pass === true,
    sentinelPass: result.sentinel?.pass === true,
    shufflePass: result.shuffle?.pass === true,
    taintPass: result.taint?.pass === true,
    featureAblationPass: result.featureAblation?.pass === true,
    requiredForFinalAcceptedChain: result.accepted,
    pass: !result.accepted || (
      result.generalization?.pass === true
      && result.leaveOneFamilyOut?.pass === true
      && result.sentinel?.pass === true
      && result.shuffle?.pass === true
      && result.taint?.pass === true
      && result.featureAblation?.pass === true
    ),
  }));
  const finalComposition = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    attemptId: composition.attempt.attemptId,
    attempt: hashRecord(path.join(composition.directory, 'ATTEMPT.json')),
    iterationResult: hashRecord(composition.resultFile),
    disposition: composition.result.disposition,
    acceptedCandidateIds: composition.result.acceptedCandidateIds,
    forwardIdentity: composition.result.forwardIdentity,
    reverseIdentity: composition.result.reverseIdentity,
    forwardMetrics: composition.result.forwardGates.metrics,
    reverseMetrics: composition.result.reverseGates.metrics,
    orderDrift: composition.result.orderDrift,
    shadowing: composition.result.shadowing,
    replayPass: composition.result.replay.pass,
    fullHeadReplayPass: composition.result.fullHeadDiff.replay.pass,
    pass: composition.result.pass,
  };
  writeOnceJson(ART.finalComposition, finalComposition);
  const finalChain = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    reconstructionAttemptId: RECONSTRUCTION_ATTEMPT,
    technicalOriginals: TECHNICAL_ORIGINALS.map((attemptId) =>
      readJson(path.join(ATT, attemptId, 'ATTEMPT.json'))),
    semanticCandidates: candidateResults.map((result, index) => ({
      ordinal: index + 1,
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      retryOf: result.retryOf || null,
      retryReason: result.retryReason || null,
      retryType: result.retryType || null,
      disposition: result.disposition,
      accepted: result.accepted,
      startingBaseHash: result.activeBase.identity.servicesTreeDigest,
      endingCandidateHash: result.candidateIdentity.servicesTreeDigest,
      selectedEndingHash: result.accepted
        ? result.candidateIdentity.servicesTreeDigest
        : result.activeBase.identity.servicesTreeDigest,
      metrics: result.metrics,
    })),
    acceptedCandidateIds: expectedAcceptedIds,
    acceptedAttemptIds: acceptedResults.map((result) => result.attemptId),
    selectedAttemptId: active.attemptId,
    selectedCandidateId: active.candidateId,
    selectedIdentity: active.identity,
    noTechnicalOriginalContamination: acceptedResults.every((result) =>
      !TECHNICAL_ORIGINALS.includes(result.attemptId)),
    pass: JSON.stringify(composition.result.acceptedCandidateIds)
      === JSON.stringify(expectedAcceptedIds)
      && acceptedResults.every((result) => result.accepted)
      && acceptedResults.every((result) => !TECHNICAL_ORIGINALS.includes(result.attemptId)),
  };
  writeOnceJson(ART.finalChain, finalChain);
  const finalActive = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    attemptId: active.attemptId,
    candidateId: active.candidateId,
    identity: active.identity,
    metrics: finalGates.metrics,
    runtimeSnapshot: rel(active.dir),
    compositionForwardIdentity: composition.result.forwardIdentity,
    reproducibleFromComposition:
      C.sameRuntime(active.identity, composition.result.forwardIdentity),
    reasonScoreReproduced:
      finalGates.metrics.reasonPassed === active.gates.metrics.reasonPassed,
    decisionRelationExact:
      finalGates.metrics.decisionPassed === 3720
      && finalGates.metrics.relationPassed === 3720,
    pass: C.sameRuntime(active.identity, composition.result.forwardIdentity)
      && finalGates.metrics.reasonPassed === active.gates.metrics.reasonPassed
      && finalGates.metrics.decisionPassed === 3720
      && finalGates.metrics.relationPassed === 3720,
  };
  writeOnceJson(ART.finalActive, finalActive);
  writeOnceJson(ART.finalResidual, residual.inventory);
  writeOnceJson(ART.finalResidualFamilies, residual.families);
  writeOnceJson(ART.finalSignatureRegression, signatures);
  const frozen = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    activeBaseHash: active.identity.servicesTreeDigest,
    gates: finalGates,
    required: {
      decisionPassed: 3720,
      relationPassed: 3720,
      reasonCounterfactualPassed: 344,
      collisionProbesPassed: 196,
      decisionCounterfactualPassed: 756,
      relationCounterfactualPassed: 282,
      clauseProbesPassed: 68,
      richContextGuardPassed: 7,
      reasonIntegrityPass: true,
      materialFalseAllows: 0,
      materialFalseRefusals: 0,
      clarifyMismatches: 0,
    },
    residualReconciliationPass: residual.inventory.pass,
    signatureRegressionPass: signatures.pass,
    pass: finalGates.frozenLocksHeld
      && finalGates.metrics.decisionPassed === 3720
      && finalGates.metrics.relationPassed === 3720
      && finalGates.metrics.reasonCounterfactualPassed === 344
      && finalGates.metrics.collisionProbesPassed === 196
      && finalGates.metrics.decisionCounterfactualPassed === 756
      && finalGates.metrics.relationCounterfactualPassed === 282
      && finalGates.metrics.clauseProbesPassed === 68
      && finalGates.metrics.richContextGuardPassed === 7
      && finalGates.metrics.reasonIntegrityPass === true
      && finalGates.metrics.materialFalseAllows === 0
      && finalGates.metrics.materialFalseRefusals === 0
      && finalGates.metrics.clarifyMismatches === 0
      && residual.inventory.pass
      && signatures.pass,
  };
  writeOnceJson(ART.finalFrozen, frozen);
  const dualReplay = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    cumulativeCanonicalPatch: {
      ...cumulativePatch,
      text: undefined,
    },
    independentDualReplay,
    acceptedCandidateReplays: acceptedReplayRecords,
    compositionReplay: {
      candidateOnlyReplayPass: composition.result.replay.pass,
      fullHeadReplayPass: composition.result.fullHeadDiff.replay.pass,
    },
    pass: cumulativePatch.pass
      && independentDualReplay.pass
      && acceptedReplayRecords.every((record) => record.pass)
      && composition.result.replay.pass
      && composition.result.fullHeadDiff.replay.pass,
  };
  writeOnceJson(ART.finalDualReplay, dualReplay);
  const generalization = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    records: generalizationRecords,
    acceptedCandidates: expectedAcceptedIds,
    acceptedSignatureValidation: hashRecord(ART.finalSignatureRegression),
    pass: generalizationRecords.every((record) => record.pass) && signatures.pass,
  };
  writeOnceJson(ART.finalGeneralization, generalization);
  const preservation = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    baselineM01rAndPrior: baselinePreservation,
    acceptedSignatureValidation: signatures,
    compositionRowLevel: {
      newlyRegressed: composition.result.rowLevel.newlyRegressed,
      wrongToDifferentWrong: composition.result.rowLevel.wrongToDifferentWrong,
      outsideTarget: composition.result.rowLevel.outsideTarget,
    },
    pass: baselinePreservation.pass
      && signatures.pass
      && composition.result.rowLevel.newlyRegressed.length === 0
      && composition.result.rowLevel.wrongToDifferentWrong.length === 0,
  };
  writeOnceJson(ART.finalPreservation, preservation);
  const aggregate = executor.aggregateEvidence(
    composition.initialBase,
    active,
    candidateResults,
    composition.result,
    executor.loadPreservationForRecovery(),
  );
  const expectedAttemptIds = [
    RECONSTRUCTION_ATTEMPT,
    ...TECHNICAL_ORIGINALS,
    ...ACCEPTED_ATTEMPTS,
    candidate6.attempt.attemptId,
    composition.attempt.attemptId,
  ];
  requirePass(
    new Set(expectedAttemptIds).size === 10,
    'C34_CP46_EXPECTED_FINAL_ATTEMPT_SET_NOT_TEN',
  );
  C.finalizeRegistryState({
    cumulativeThrough: 'commit5r1c34-terminal-incomplete',
    selectedSemanticRuntime: {
      attemptId: active.attemptId,
      candidateId: active.candidateId,
      identity: active.identity,
      metrics: finalGates.metrics,
      semanticBase: C.C33_IDENTITY.servicesTreeDigest,
    },
    reasonLayerClosure: finalGates.metrics.reasonPassed === 3720,
    runtimeClosure: false,
    expectedStartingAttemptCount: 218,
    expectedC34AttemptIds: expectedAttemptIds,
  });
  const ledger = C.reconcileC34AttemptLedger({ throwOnFailure: true });
  writeOnceJson(ART.finalLedger, ledger);
  const registryWal = registryWalReconciliation(active, expectedAttemptIds);
  writeOnceJson(ART.registryWal, registryWal);
  const liveIdentity = C.liveRuntimeIdentity();
  const environment = {
    processState: processState(),
    temporaryRuntimeDirectories: temporaryRuntimeDirectories().map(rel),
    allocationLocks: allocationLocks().map(rel),
    gitState: gitState(),
  };
  const serviceIdentity = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    executionMode: 'isolated immutable attempt snapshots',
    liveServicesWereSemanticBase: false,
    liveStartingHeadIdentity: liveIdentity,
    selectedSemanticRuntimeIdentity: active.identity,
    liveServicesTrackedDiffEmpty: environment.gitState.serviceDiff === '',
    restorePerformed: false,
    overwriteAttempted: false,
    pass: environment.gitState.serviceDiff === '',
  };
  writeOnceJson(ART.serviceIdentity, serviceIdentity);
  const closureDraft = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: finalComposition.generatedUtc,
    classification: 'C34_TERMINAL_BOUNDED_CANDIDATE_SET_PHASE_10A_OPEN',
    startingCheckpoint: 46,
    candidate6: {
      attemptId: candidate6.attempt.attemptId,
      disposition: candidate6.result.disposition,
      accepted: candidate6.result.accepted,
      metrics: candidate6.result.metrics,
      result: hashRecord(candidate6.resultFile),
    },
    composition: hashRecord(ART.finalComposition),
    acceptedRuleChain: hashRecord(ART.finalChain),
    finalActiveBase: hashRecord(ART.finalActive),
    finalResidualInventory: hashRecord(ART.finalResidual),
    finalResidualFamilySummary: hashRecord(ART.finalResidualFamilies),
    frozenGateResult: hashRecord(ART.finalFrozen),
    dualReplayResult: hashRecord(ART.finalDualReplay),
    generalizationResult: hashRecord(ART.finalGeneralization),
    preservationResult: hashRecord(ART.finalPreservation),
    attemptLedger: hashRecord(ART.finalLedger),
    registryWalReconciliation: hashRecord(ART.registryWal),
    aggregateFiles: aggregate.files.map(hashRecord),
    phase10AStatus: finalGates.metrics.reasonPassed === 3720 ? 'OPEN_RUNTIME_CLOSURE' : 'OPEN',
    r20Status: 'IN_PROGRESS',
    c34Status: 'TERMINAL_PENDING_INDEPENDENT_OPUS_REVIEW',
    reasonLayerClosure: finalGates.metrics.reasonPassed === 3720,
    runtimeClosure: false,
    candidateExhaustion: true,
    candidate7Authorized: false,
    c35Authorized: false,
    environment,
    pass: frozen.pass
      && dualReplay.pass
      && generalization.pass
      && preservation.pass
      && finalComposition.pass
      && finalChain.pass
      && finalActive.pass
      && residual.inventory.pass
      && residual.families.pass
      && ledger.pass
      && registryWal.pass
      && serviceIdentity.pass
      && environment.processState.inspectionSucceeded
      && environment.processState.activeC34.length === 0
      && environment.processState.unreadable.length === 0
      && environment.processState.listeners5173.length === 0
      && environment.temporaryRuntimeDirectories.length === 0
      && environment.allocationLocks.length === 0
      && environment.gitState.serviceDiff === ''
      && environment.gitState.staged === ''
      && !environment.gitState.indexLock
      && environment.gitState.c35Items.length === 0,
  };
  writeOnceJson(ART.finalClosureDraft, closureDraft);
  requirePass(closureDraft.pass, 'C34_CP46_FINAL_CLOSURE_GATES_FAILED');
  const checkpoint = ensureHistoricalOrAppendCheckpoint({
    updatedAtUtc: closureDraft.generatedUtc,
    stage: 'final frozen C34 closure gates',
    status: 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS',
    activeBaseHash: active.identity.servicesTreeDigest,
    artifacts: [
      ART.finalComposition,
      ART.finalChain,
      ART.finalActive,
      ART.finalResidual,
      ART.finalResidualFamilies,
      ART.finalSignatureRegression,
      ART.finalFrozen,
      ART.finalDualReplay,
      ART.finalGeneralization,
      ART.finalPreservation,
      ART.finalLedger,
      ART.registryWal,
      ART.serviceIdentity,
      ART.finalClosureDraft,
      REGISTRY,
      WAL,
    ],
    nextExactOperation:
      'Prepare manifest-bound Roadmap v9 and CURRENT_STATE drafts and obtain exactly one Claude Code Opus 4.8 read-only decision.',
    safeToResume: true,
  });
  return {
    active,
    finalGates,
    residual,
    signatures,
    frozen,
    dualReplay,
    generalization,
    preservation,
    ledger,
    registryWal,
    serviceIdentity,
    closureDraft,
    aggregate,
    checkpoint: checkpoint.event,
    candidateResults,
    acceptedResults,
    composition: finalComposition,
  };
}

function formatFamilyCounts(counts) {
  return Object.entries(counts)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([family, count]) => `${family}=${count}`)
    .join(', ');
}

function candidateDispositionLines(chain) {
  return chain.semanticCandidates.map((item) =>
    `- Candidate ${item.ordinal} (${item.candidateId}): **${item.disposition}**; `
      + `R3 reason ${item.metrics.reasonPassed}/3,720; attempt ${item.attemptId}.`)
    .join('\n');
}

function roadmapVariant(decision) {
  const before = fs.readFileSync(ROADMAP, 'utf8');
  const chain = readJson(ART.finalChain);
  const active = readJson(ART.finalActive);
  const residual = readJson(ART.finalResidual);
  const families = readJson(ART.finalResidualFamilies);
  const composition = readJson(ART.finalComposition);
  const registryWal = readJson(ART.registryWal);
  const candidate6 = readJson(ART.candidate6Result);
  const topLine =
    `**Current controlling result:** COMMIT 5R1-C34 terminal; bounded C34 candidates `
      + `ended at ${active.metrics.reasonPassed}/3,720 R3 reason with decision/relation `
      + `locked; Phase 10A remains OPEN and R20 remains IN PROGRESS`;
  const correctedTop = before.replace(
    /^\*\*Current controlling result:\*\*.*$/m,
    topLine,
  );
  const start = correctedTop.indexOf('## C33 active execution status');
  const end = correctedTop.indexOf('\n## 1. Controlling strategic decision');
  requirePass(start >= 0 && end > start, 'C34_CP46_ROADMAP_ACTIVE_SECTION_NOT_FOUND');
  const section = `## C34 terminal execution status

Latest controlling execution result after COMMIT 5R1-C34:

- Started from immutable recovery checkpoint **46** at Candidate-5 linked-retry active base \`${EXPECTED.activeBase}\`; an accidental no-allocation \`--help\` diagnostic checkpoint 47 was preserved and append-only superseded before Candidate 6.
- Both technical originals remain immutable non-semantic failures: NT01 \`${TECHNICAL_ORIGINALS[0]}\` and Candidate-5 TR01 \`${TECHNICAL_ORIGINALS[1]}\`.
- Candidate 5 was terminalized through exactly one accepted linked retry \`${ACCEPTED_ATTEMPTS[4]}\`; no Candidate 1-5 attempt was rerun or reallocated.
${candidateDispositionLines(chain)}
- Candidate 6 exact-once result: **${candidate6.disposition}**; reason delta ${candidate6.metricDelta.reasonPassed >= 0 ? '+' : ''}${candidate6.metricDelta.reasonPassed}; no Candidate 7 was authorized.
- Cumulative composition: **${composition.disposition}**; order drift ${composition.orderDrift.length}; shadowing ${composition.shadowing.length}; cumulative replay PASS.
- Selected runtime: **${active.candidateId}** in \`${active.attemptId}\`; services-tree digest \`${active.identity.servicesTreeDigest}\`.
- Final controls: R3 reason **${active.metrics.reasonPassed} / 3,720**; decision **${active.metrics.decisionPassed} / 3,720**; relation **${active.metrics.relationPassed} / 3,720**; reason suite **${active.metrics.reasonCounterfactualPassed} / 344**; collision **${active.metrics.collisionProbesPassed} / 196**; decision CF **${active.metrics.decisionCounterfactualPassed} / 756**; relation CF **${active.metrics.relationCounterfactualPassed} / 282**; clause **${active.metrics.clauseProbesPassed} / 68**; rich guard **${active.metrics.richContextGuardPassed} / 7**; reason integrity **PASS**.
- Final residual inventory: **${residual.residualCount}** reason-only rows; expected-reason families: ${formatFamilyCounts(families.expectedReasonFamilies)}.
- Registry/WAL/ledger: **PASS**; ${registryWal.actual.totalAttempts} registry attempts, ${registryWal.actual.c34Attempts} C34 attempts, ${registryWal.actual.walRows} C34 WAL rows, orphan/dangling/running all zero, two technical adjudications preserved.
- Independent final reviewer: Claude Code Opus 4.8 read-only decision **${decision}**. Any nonblocking observations are recorded in \`COMMIT_5R1C34_FINAL_OPUS_REVIEW.json\`.
- Final evidence identity: \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FINAL_EVIDENCE.sha256\`, deterministic and self-excluding, sealed after installation of the exact reviewed documentation variant.
- Git cutover in these reviewed bytes: pending explicit staging/commit/push; actual commit and remote facts are recorded in the post-commit Git verification artifacts.

Current controlling result: **COMMIT 5R1-C34 terminal; Phase 10A OPEN; R20 IN PROGRESS.**

Next exact task:

**Obtain a separately governed Phase-10A14-R20 continuation against the C34 selected runtime. This execution did not authorize or begin C35.**

No market-response implementation may bypass Phase 10A. Runtime integration, model migration, durable memory, source promotion, production billing, public deployment and production cutover remain blocked until their governed gates pass.

---
`;
  return correctedTop.slice(0, start) + section + correctedTop.slice(end + 1);
}

function currentStateVariant(decision) {
  const before = fs.readFileSync(CURRENT_STATE, 'utf8');
  const chain = readJson(ART.finalChain);
  const active = readJson(ART.finalActive);
  const residual = readJson(ART.finalResidual);
  const families = readJson(ART.finalResidualFamilies);
  const composition = readJson(ART.finalComposition);
  const registryWal = readJson(ART.registryWal);
  const candidate6 = readJson(ART.candidate6Result);
  const closure = readJson(ART.finalClosureDraft);
  const originalBody = before.replace(/^# CURRENT_STATE\.md\r?\n+/, '');
  return `# CURRENT_STATE.md

## TINA Controlling Continuity Status

Last updated: ${closure.generatedUtc} (COMMIT 5R1-C34 reviewed cutover)

PHASE-10A14-R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**, not PASS and not SATISFIED. COMMIT 5R1-C34 is terminal.

### COMMIT 5R1-C34 - Governed cumulative reason-layer continuation

- Start: immutable checkpoint **46**, \`safeToResume=true\`, no active attempt, Candidate-5 accepted linked-retry base \`${EXPECTED.activeBase}\`.
- No-allocation diagnostic continuity: checkpoint 47 from an unsupported runner \`--help\` call was preserved, forensically classified as CLI misuse, and append-only superseded before Candidate-6 authorization; registry, WAL, attempts, and services were unchanged.
- Candidate-1 technical original: \`${TECHNICAL_ORIGINALS[0]}\`, preserved as non-semantic technical failure; accepted linked retry: \`${ACCEPTED_ATTEMPTS[0]}\`.
- Candidate-5 technical original: \`${TECHNICAL_ORIGINALS[1]}\`, **TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE** caused by \`C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED\`, not a semantic rejection; exactly one accepted linked retry: \`${ACCEPTED_ATTEMPTS[4]}\`.
${candidateDispositionLines(chain)}
- Candidate 6: exactly one \`cp01\` attempt \`${candidate6.attemptId}\`, **${candidate6.disposition}**; reason delta ${candidate6.metricDelta.reasonPassed >= 0 ? '+' : ''}${candidate6.metricDelta.reasonPassed}. No Candidate 7 was created.
- Final accepted chain: ${chain.acceptedCandidateIds.join(' -> ')}.
- Composition: **${composition.disposition}**; order drift ${composition.orderDrift.length}; shadowing ${composition.shadowing.length}; replay controls PASS.
- Final selected runtime: \`${active.identity.servicesTreeDigest}\` from \`${active.attemptId}\` (${active.candidateId}).
- Final metrics: reason ${active.metrics.reasonPassed}/3,720; decision ${active.metrics.decisionPassed}/3,720; relation ${active.metrics.relationPassed}/3,720; reason suite ${active.metrics.reasonCounterfactualPassed}/344; collision ${active.metrics.collisionProbesPassed}/196; decision CF ${active.metrics.decisionCounterfactualPassed}/756; relation CF ${active.metrics.relationCounterfactualPassed}/282; clause ${active.metrics.clauseProbesPassed}/68; rich guard ${active.metrics.richContextGuardPassed}/7; reason integrity PASS; FA/FR/clarify 0.
- Final residual: ${residual.residualCount} reason-only rows; ${formatFamilyCounts(families.expectedReasonFamilies)}.
- Frozen closure controls: cumulative dual replay, accepted candidate replays, full-HEAD replay, generalization, leave-family-out, sentinel/shuffle/taint, feature ablation, M01R/prior preservation, accepted signatures, attempt ledger, and registry/WAL reconciliation all PASS.
- Registry: ${registryWal.actual.totalAttempts} attempts; ${registryWal.actual.c34Attempts} C34 attempt directories; ${registryWal.actual.walRows} C34 WAL rows; orphan 0; dangling 0; running 0; both technical adjudications and linked retries preserved.
- Mandatory independent reviewer: Claude Code Opus 4.8, read-only, explicit decision **${decision}**.
- Evidence manifest identity: \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FINAL_EVIDENCE.sha256\` (deterministic, self-excluding, sealed after exact reviewed-document installation).
- Reviewed Git status: explicit staging/commit/push pending at document cutover. Actual commit and remote synchronization are recorded outside the self-referential commit in \`COMMIT_5R1C34_FINAL_GIT_VERIFICATION.json\` and \`COMMIT_5R1C34_FINAL_REMOTE_VERIFICATION.json\`.
- Phase 10A: **OPEN**. R20: **IN PROGRESS**. C34: **TERMINAL**.
- Next exact operation: obtain separate governance for the next Phase-10A14-R20 unit against the selected C34 runtime. C35 was not authorized or begun here.

---

## Historical Continuity Record

${originalBody}`;
}

function statusPaths() {
  const output = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd: C.REPO, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 },
  );
  const records = [];
  const fields = output.split('\0').filter(Boolean);
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    const status = field.slice(0, 2);
    let file = field.slice(3).replace(/\\/g, '/');
    if (status.includes('R') || status.includes('C')) {
      index++;
      file = fields[index].replace(/\\/g, '/');
    }
    records.push({ status, path: file });
  }
  return records;
}

function authorizedStagePath(file) {
  if (
    file === rel(CHECKPOINT)
    || file === rel(CHECKPOINT_LOG)
    || file === rel(ART.gitVerification)
    || file === rel(ART.remoteVerification)
    || file === rel(ART.terminalState)
  ) {
    return false;
  }
  return file === 'evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json'
    || file === 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md'
    || file === 'knowledge/CURRENT_STATE.md'
    || /^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C34_/.test(file)
    || /^evaluation\/results\/phase-10a14-r20\/attempts\/[^/]*commit5r1c34-/.test(file)
    || /^evaluation\/runner\/phase-10a14-r20\/commit5r1c34-/.test(file);
}

function indexBlobBinding(source, targetPath = rel(source)) {
  const sourcePath = rel(source);
  const target = targetPath.replace(/\\/g, '/');
  const bytes = fs.readFileSync(path.resolve(C.REPO, sourcePath));
  const rawGitBlob = git(
    'hash-object',
    '--no-filters',
    '--',
    sourcePath,
  ).trim();
  const expectedIndexBlob = git(
    'hash-object',
    `--path=${target}`,
    '--',
    sourcePath,
  ).trim();
  return {
    sourcePath,
    targetPath: target,
    bytes: bytes.length,
    workingSha256: sha(bytes),
    rawGitBlob,
    expectedIndexBlob,
    indexBytesEqualWorkingTree: rawGitBlob === expectedIndexBlob,
    cleanFilterTransformation:
      rawGitBlob === expectedIndexBlob ? 'NONE' : 'RECORDED_GIT_CLEAN_FILTER_TRANSFORM',
  };
}

function proposedStagingSet(generatedUtc = readJson(ART.finalClosureDraft).generatedUtc) {
  const current = statusPaths()
    .filter((record) => authorizedStagePath(record.path))
    .map((record) => record.path);
  const nextOrdinal = parseNdjson(CHECKPOINT_LOG).length + 1;
  const future = [
    rel(numberedCheckpointPath(nextOrdinal, 'independent Opus review package')),
    rel(numberedCheckpointPath(
      nextOrdinal + 1,
      'independent Opus review approved documentation cutover',
    )),
    rel(ART.stagingDraft),
    rel(ART.reviewRequest),
    rel(ART.reviewedInventory),
    rel(ART.preReviewManifest),
    rel(ART.preReviewCheckpointLogSnapshot),
    rel(ART.opusInvocation),
    rel(ART.opusCapture),
    rel(ART.opusJson),
    rel(ART.opusMd),
    rel(ART.finalCheckpointLogSnapshot),
    rel(ART.finalManifest),
    rel(ART.finalManifestValidation),
    rel(ART.finalCommitContents),
    rel(ROADMAP),
    rel(CURRENT_STATE),
  ];
  const paths = [...new Set([...current, ...future])].sort();
  const documentationTargetBindings = {
    APPROVED: {
      roadmapV9: indexBlobBinding(ART.roadmapDraft, rel(ROADMAP)),
      currentState: indexBlobBinding(ART.currentStateDraft, rel(CURRENT_STATE)),
    },
    APPROVED_WITH_NONBLOCKING_OBSERVATIONS: {
      roadmapV9: indexBlobBinding(ART.roadmapDraftObserved, rel(ROADMAP)),
      currentState: indexBlobBinding(
        ART.currentStateDraftObserved,
        rel(CURRENT_STATE),
      ),
    },
  };
  const existingPathBindings = Object.fromEntries(paths
    .filter((file) =>
      file !== rel(ROADMAP)
      && file !== rel(CURRENT_STATE)
      && fs.existsSync(path.resolve(C.REPO, file)))
    .map((file) => [file, indexBlobBinding(file, file)]));
  return {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    policy: 'explicit file-by-file staging only; git add . and git add -A forbidden',
    paths,
    existingPathBindings,
    documentationTargetBindings,
    cleanFilterContract:
      'every review-time source is bound both to exact working SHA-256/raw Git blob and to its target-path filtered index blob; any line-ending clean-filter transformation is explicit and final staging must match the recorded filtered blob',
    exclusions: [
      '.claude/',
      '.vscode/',
      'evaluation/factcheck/',
      'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
      'knowledge/TINA_Updated_Roadmap_v7.md',
      'evaluation/oracles/',
      'services/',
      'all Candidate-7 and C35 paths',
    ],
    externalPostCommitAttestations: [
      rel(ART.gitVerification),
      rel(ART.remoteVerification),
      rel(ART.terminalState),
      rel(CHECKPOINT),
      rel(CHECKPOINT_LOG),
    ],
    proposedCommitMessage:
      'PHASE-10A14-R20 COMMIT 5R1-C34 terminal incomplete - preserve governed cumulative reason-layer evidence',
    pass: paths.length > 0
      && paths.every(authorizedStagePath)
      && !paths.some((item) =>
        /^\.claude\/|^\.vscode\/|^evaluation\/factcheck\/|5R1C35|commit5r1c35/i.test(item)),
  };
}

function makeManifest(file, files) {
  const manifestAbsolute = path.resolve(file);
  const unique = [...new Set(files.map((item) => path.resolve(item)))]
    .filter((item) => item !== manifestAbsolute)
    .sort((first, second) => rel(first).localeCompare(rel(second)));
  for (const target of unique) {
    requirePass(fs.existsSync(target), `C34_CP46_MANIFEST_TARGET_MISSING_${rel(target)}`);
  }
  const lines = unique.map((target) => `${sha(fs.readFileSync(target))}  ${rel(target)}`);
  writeOnceBuffer(manifestAbsolute, Buffer.from(`${lines.join('\n')}\n`));
  return verifyManifest(manifestAbsolute);
}

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? recursiveFiles(target) : [target];
  });
}

function preReviewManifestFiles() {
  const top = fs.readdirSync(RES, { withFileTypes: true })
    .filter((entry) =>
      entry.isFile()
      && entry.name.startsWith('COMMIT_5R1C34_')
      && entry.name !== path.basename(CHECKPOINT)
      && entry.name !== path.basename(CHECKPOINT_LOG)
      && entry.name !== path.basename(ART.preReviewManifest))
    .map((entry) => path.join(RES, entry.name));
  const attempts = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) =>
      entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .flatMap((entry) => recursiveFiles(path.join(ATT, entry.name)));
  const runners = fs.readdirSync(path.dirname(THIS_RUNNER), { withFileTypes: true })
    .filter((entry) =>
      entry.isFile() && entry.name.startsWith('commit5r1c34-'))
    .map((entry) => path.join(path.dirname(THIS_RUNNER), entry.name));
  return [
    ...top,
    ...attempts,
    ...runners,
    REGISTRY,
    ART.roadmapStartingSnapshot,
    ART.currentStateStartingSnapshot,
    ART.preReviewCheckpointLogSnapshot,
    ART.roadmapDraft,
    ART.roadmapDraftObserved,
    ART.currentStateDraft,
    ART.currentStateDraftObserved,
    ART.stagingDraft,
    ART.reviewRequest,
    ART.reviewedInventory,
    PROMPT,
    path.resolve('evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs'),
    path.resolve('evaluation/runner/phase-10a14-r20/commit5r1c20-gates.mjs'),
    path.resolve('package.json'),
    path.resolve('package-lock.json'),
    path.resolve('services/philippine-tax-intent-analyzer.js'),
    path.resolve('services/philippine-tax-domain-boundary.js'),
    path.resolve('services/philippine-tax-boundary-patterns.js'),
  ];
}

const REVIEW_VERIFICATION_KEYS = Object.freeze([
  'checkpoint46Continuity',
  'diagnostic47Adjudication',
  'candidate6ExactOnce',
  'candidates1Through5Preserved',
  'technicalRetryLinksPreserved',
  'compositionPass',
  'frozenGatesPass',
  'residualReconciled',
  'registryWalLedgerReconciled',
  'serviceAndGitHygiene',
  'manifestDraftValid',
  'roadmapDraftAccurate',
  'currentStateDraftAccurate',
  'stagingSetExplicit',
  'noCandidate7OrC35',
]);

const REVIEW_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'decision',
    'reviewedStateDigest',
    'reviewerTool',
    'reviewerModel',
    'independenceConfirmed',
    'readOnlyConfirmed',
    'summary',
    'verification',
    'blockingFindings',
    'nonblockingObservations',
    'commitSafe',
  ],
  properties: {
    decision: {
      type: 'string',
      enum: [
        'APPROVED',
        'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
        'REJECTED',
        'INCOMPLETE_REVIEW',
      ],
    },
    reviewedStateDigest: { type: 'string', pattern: '^[0-9a-f]{64}$' },
    reviewerTool: { type: 'string', const: 'Claude Code' },
    reviewerModel: { type: 'string', const: 'claude-opus-4-8' },
    independenceConfirmed: { type: 'boolean' },
    readOnlyConfirmed: { type: 'boolean' },
    summary: { type: 'string' },
    verification: {
      type: 'object',
      additionalProperties: false,
      required: REVIEW_VERIFICATION_KEYS,
      properties: Object.fromEntries(
        REVIEW_VERIFICATION_KEYS.map((key) => [key, { type: 'boolean' }]),
      ),
    },
    blockingFindings: { type: 'array', items: { type: 'string' } },
    nonblockingObservations: { type: 'array', items: { type: 'string' } },
    commitSafe: { type: 'boolean' },
  },
});

function reviewRequestText() {
  return `# PHASE-10A14-R20 COMMIT 5R1-C34 independent final review

You are the mandatory independent final reviewer: Claude Code Opus 4.8.

Operate read-only. Do not edit, create, delete, stage, commit, push, or start a
service. Inspect the manifest-bound files in this repository and return only the
structured response required by the supplied JSON schema.

The reviewed-state digest will be supplied below by the orchestrator. It is the
lowercase SHA-256 of the exact
\`COMMIT_5R1C34_FINAL_PRE_REVIEW_EVIDENCE.sha256\` bytes. Independently validate
manifest entries with read-only tools.

Review scope:

- immutable checkpoint 46 and append-only adjudication of the no-allocation
  diagnostic checkpoint 47;
- preservation of Candidates 1-5 and both technical originals;
- Candidate 6 exact-once authorization, allocation, terminal disposition, and
  protected-signature validation;
- accepted-chain composition, order independence, cumulative replay, final
  active identity, residual inventory, and every frozen closure gate;
- both linked retries, registry/WAL/attempt-ledger reconciliation, absence of
  Candidate 7/C35, service isolation, process/temp/lock/Git hygiene;
- both exact documentation variants. The APPROVED variant records APPROVED;
  the observation variant records APPROVED_WITH_NONBLOCKING_OBSERVATIONS. The
  finalizer may install only the variant matching your explicit decision;
- proposed explicit staging set and commit message.

Required evidence entry points:

- \`${rel(CHECKPOINT_46)}\`
- \`${rel(ART.diagnostic47)}\`
- \`${rel(ART.authorization)}\`
- \`${rel(ART.candidate6NonDuplication)}\`
- \`${rel(ART.candidate6Compatibility)}\`
- \`${rel(ART.candidate6Result)}\`
- \`${rel(ART.finalComposition)}\`
- \`${rel(ART.finalChain)}\`
- \`${rel(ART.finalActive)}\`
- \`${rel(ART.finalResidual)}\`
- \`${rel(ART.finalFrozen)}\`
- \`${rel(ART.finalDualReplay)}\`
- \`${rel(ART.finalGeneralization)}\`
- \`${rel(ART.finalPreservation)}\`
- \`${rel(ART.finalLedger)}\`
- \`${rel(ART.registryWal)}\`
- \`${rel(ART.finalClosureDraft)}\`
- \`${rel(ART.roadmapDraft)}\`
- \`${rel(ART.roadmapDraftObserved)}\`
- \`${rel(ART.currentStateDraft)}\`
- \`${rel(ART.currentStateDraftObserved)}\`
- \`${rel(ART.stagingDraft)}\`
- \`${rel(ART.reviewedInventory)}\`

Decision rules:

- APPROVED only if every verification field is true, blockingFindings is empty,
  and commitSafe is true.
- APPROVED_WITH_NONBLOCKING_OBSERVATIONS only under the same conditions, with
  every observation explicitly listed.
- REJECTED for a proven blocking defect.
- INCOMPLETE_REVIEW if evidence/tooling is insufficient to decide.

Do not infer Phase 10A closure from bounded C34 terminality. Unless the exact
metrics support closure, Phase 10A remains OPEN and R20 remains IN PROGRESS.
`;
}

function prepareReviewPackage() {
  const closure = readJson(ART.finalClosureDraft);
  requirePass(closure.pass, 'C34_CP46_REVIEW_PACKAGE_CLOSURE_NOT_PASSING');
  writeOnceBuffer(ART.roadmapStartingSnapshot, fs.readFileSync(ROADMAP));
  writeOnceBuffer(ART.currentStateStartingSnapshot, fs.readFileSync(CURRENT_STATE));
  writeOnceBuffer(ART.roadmapDraft, Buffer.from(roadmapVariant('APPROVED')));
  writeOnceBuffer(
    ART.roadmapDraftObserved,
    Buffer.from(roadmapVariant('APPROVED_WITH_NONBLOCKING_OBSERVATIONS')),
  );
  writeOnceBuffer(ART.currentStateDraft, Buffer.from(currentStateVariant('APPROVED')));
  writeOnceBuffer(
    ART.currentStateDraftObserved,
    Buffer.from(currentStateVariant('APPROVED_WITH_NONBLOCKING_OBSERVATIONS')),
  );
  const staging = proposedStagingSet();
  writeOnceJson(ART.stagingDraft, staging);
  requirePass(staging.pass, 'C34_CP46_STAGING_DRAFT_INVALID');
  writeOnceBuffer(ART.reviewRequest, Buffer.from(reviewRequestText()));
  const reviewed = stableGeneratedJson(ART.reviewedInventory, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    reviewedCommit: git('rev-parse', 'HEAD').trim(),
    reviewedStateDigestDefinition:
      'lowercase SHA-256 of the exact final pre-review evidence manifest bytes',
    preReviewManifestPath: rel(ART.preReviewManifest),
    startingCheckpoint46: hashRecord(CHECKPOINT_46),
    authorization: hashRecord(ART.authorization),
    candidate6Result: hashRecord(ART.candidate6Result),
    finalClosureDraft: hashRecord(ART.finalClosureDraft),
    roadmapVariants: {
      APPROVED: hashRecord(ART.roadmapDraft),
      APPROVED_WITH_NONBLOCKING_OBSERVATIONS: hashRecord(ART.roadmapDraftObserved),
    },
    currentStateVariants: {
      APPROVED: hashRecord(ART.currentStateDraft),
      APPROVED_WITH_NONBLOCKING_OBSERVATIONS:
        hashRecord(ART.currentStateDraftObserved),
    },
    startingDocumentationSnapshots: {
      roadmapV9: hashRecord(ART.roadmapStartingSnapshot),
      currentState: hashRecord(ART.currentStateStartingSnapshot),
    },
    stagingDraft: hashRecord(ART.stagingDraft),
    reviewRequest: hashRecord(ART.reviewRequest),
    proposedCommitMessage: staging.proposedCommitMessage,
    finalManifestDraftDefinition:
      'the immutable pre-review manifest binds all semantic/runtime inputs, shared runners, packages, live services, starting-document snapshots, both documentation variants, the pre-review checkpoint-log snapshot, external recovery prompt, and proposed staging/index-blob contract; the final self-excluding manifest retains that manifest as the reviewed-state binding, directly includes the selected live documentation and later exactly-once invocation/capture/decision/finalization evidence, includes the final checkpoint-log snapshot, omits mutable live checkpoint/log aliases, and does not repeat the external prompt as a separately staged file',
    pass: true,
  }));
  const checkpoint = ensureHistoricalOrAppendCheckpoint({
    updatedAtUtc: reviewed.generatedUtc,
    stage: 'independent Opus review package',
    status: 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS',
    activeBaseHash: readJson(ART.finalActive).identity.servicesTreeDigest,
    artifacts: [
      ART.reviewedInventory,
      ART.reviewRequest,
      ART.roadmapDraft,
      ART.roadmapDraftObserved,
      ART.currentStateDraft,
      ART.currentStateDraftObserved,
      ART.stagingDraft,
      ART.finalClosureDraft,
      ART.roadmapStartingSnapshot,
      ART.currentStateStartingSnapshot,
    ],
    nextExactOperation:
      'Invoke exactly one Claude Code Opus 4.8 read-only review bound to the pre-review manifest digest.',
    safeToResume: true,
  });
  writeOnceBuffer(
    ART.preReviewCheckpointLogSnapshot,
    fs.readFileSync(CHECKPOINT_LOG),
  );
  const manifest = makeManifest(ART.preReviewManifest, preReviewManifestFiles());
  requirePass(manifest.pass, 'C34_CP46_PRE_REVIEW_MANIFEST_INVALID');
  return { reviewed, checkpoint: checkpoint.event, manifest, staging };
}

function expectedReviewPrompt(reviewedStateDigest) {
  return `${fs.readFileSync(ART.reviewRequest, 'utf8')}

## Exact reviewed-state binding supplied by the C34 orchestrator

The lowercase SHA-256 of the exact pre-review evidence manifest bytes is:

\`${reviewedStateDigest}\`

Bind your decision to that exact digest. Return only the structured output
required by the supplied JSON schema.
`;
}

function expectedClaudeReviewArgv(reviewedStateDigest) {
  return [
    '-p',
    expectedReviewPrompt(reviewedStateDigest),
    '--model',
    'claude-opus-4-8',
    '--effort',
    'max',
    '--permission-mode',
    'plan',
    '--tools',
    'Read,Glob,Grep,Bash',
    '--allowedTools',
    'Read,Glob,Grep,Bash(sha256sum *)',
    '--safe-mode',
    '--no-session-persistence',
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(REVIEW_SCHEMA),
  ];
}

function invokeOpusReview() {
  if (fs.existsSync(ART.opusCapture)) {
    const existing = readJson(ART.opusCapture);
    requirePass(
      existing.reviewBudgetConsumed === true
        && fs.existsSync(ART.opusInvocation)
        && JSON.stringify(existing.invocation)
          === JSON.stringify(hashRecord(ART.opusInvocation)),
      'C34_CP46_EXISTING_OPUS_CAPTURE_INVALID',
    );
    return { capture: existing, invoked: false };
  }
  requirePass(
    !fs.existsSync(ART.opusInvocation),
    'C34_CP46_OPUS_INVOCATION_ALREADY_STARTED_WITHOUT_CAPTURE',
  );
  const reviewBudget = requireLongOperationBudget(
    'exactly one Claude Code Opus 4.8 read-only review',
    6 * 60 * 1000,
  );
  requirePass(
    !fs.existsSync(ART.opusJson) && !fs.existsSync(ART.opusMd),
    'C34_CP46_OPUS_REVIEW_ALREADY_FINALIZED',
  );
  const manifest = verifyManifest(ART.preReviewManifest);
  const status = gitState();
  const processes = processState();
  requirePass(
    manifest.pass
      && status.head === EXPECTED.startHead
      && status.upstream === EXPECTED.startHead
      && status.sync === '0\t0'
      && status.staged === ''
      && status.serviceDiff === ''
      && !status.indexLock
      && processes.inspectionSucceeded
      && processes.activeC34.length === 0
      && processes.unreadable.length === 0
      && processes.listeners5173.length === 0
      && temporaryRuntimeDirectories().length === 0
      && allocationLocks().length === 0,
    'C34_CP46_OPUS_INVOCATION_PREFLIGHT_FAILED',
  );
  const powershell = 'C:/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe';
  const resolution = spawnSync(
    powershell,
    [
      '-NoProfile',
      '-Command',
      "(Get-Command claude -CommandType ExternalScript,Application -ErrorAction Stop"
        + ' | Select-Object -First 1).Source',
    ],
    { cwd: C.REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const resolvedCliPath = (resolution.stdout || '').trim();
  requirePass(
    resolution.status === 0
      && !/[\r\n]/.test(resolvedCliPath)
      && /claude(?:\.ps1|\.cmd|\.exe)?$/i.test(resolvedCliPath),
    `C34_CP46_CLAUDE_CLI_RESOLUTION_FAILED_${resolution.status}_${resolution.stderr}`,
  );
  const versionResult = spawnSync(
    powershell,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolvedCliPath, '--version'],
    { cwd: C.REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const cliVersion = (versionResult.stdout || '').trim().split(/\s+/)[0];
  requirePass(
    versionResult.status === 0 && /^\d+\.\d+\.\d+/.test(cliVersion),
    `C34_CP46_CLAUDE_VERSION_FAILED_${versionResult.status}_${versionResult.stderr}`,
  );
  const argv = expectedClaudeReviewArgv(manifest.manifest.sha256);
  const invocation = stableGeneratedJson(
    ART.opusInvocation,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      reviewBudgetConsumed: true,
      status: 'STARTED_EXACTLY_ONCE',
      reviewedStateDigest: manifest.manifest.sha256,
      resolvedCliPath: resolvedCliPath.replace(/\\/g, '/'),
      cliVersion,
      cliArtifact: hashRecord(resolvedCliPath),
      argv,
      cwd: path.resolve(C.REPO).replace(/\\/g, '/'),
      budgetAtStart: reviewBudget,
      safeMode: true,
      noSessionPersistence: true,
      readOnlyPermissionMode: 'plan',
      pass: true,
    }),
  );
  const reviewResult = spawnSync(
    powershell,
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      resolvedCliPath,
      ...argv,
    ],
    {
      cwd: C.REPO,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 1024,
      timeout: Math.min(
        30 * 60 * 1000,
        reviewBudget.remainingMilliseconds - (5 * 60 * 1000),
      ),
    },
  );
  const rawStdout = reviewResult.stdout || '';
  const capture = {
    schemaVersion: 1,
    unit: UNIT,
    capturedUtc: now(),
    reviewBudgetConsumed: true,
    invocation: hashRecord(ART.opusInvocation),
    resolvedCliPath: resolvedCliPath.replace(/\\/g, '/'),
    cliVersion,
    argv,
    cwd: path.resolve(C.REPO).replace(/\\/g, '/'),
    exitCode: reviewResult.status,
    signal: reviewResult.signal,
    error: reviewResult.error ? String(reviewResult.error) : null,
    stderr: reviewResult.stderr || '',
    rawStdout,
    rawStdoutSha256: sha(Buffer.from(rawStdout)),
    reviewedStateDigest: manifest.manifest.sha256,
  };
  writeOnceJson(ART.opusCapture, capture);
  return { capture, invoked: true };
}

function extractStructuredReview(envelope) {
  if (envelope?.structured_output && typeof envelope.structured_output === 'object') {
    return envelope.structured_output;
  }
  if (envelope?.result && typeof envelope.result === 'object') return envelope.result;
  if (typeof envelope?.result === 'string') {
    try {
      return JSON.parse(envelope.result);
    } catch {
      // Continue to explicit failure.
    }
  }
  if (envelope?.review && typeof envelope.review === 'object') return envelope.review;
  if (envelope?.decision) return envelope;
  throw new Error('C34_CP46_OPUS_STRUCTURED_REVIEW_NOT_FOUND');
}

function installReviewedFile(
  source,
  target,
  startingSnapshot,
  manifestVerification,
) {
  const sourceAbsolute = path.resolve(source);
  const targetAbsolute = path.resolve(target);
  const startingSnapshotAbsolute = path.resolve(startingSnapshot);
  const sourceBytes = fs.readFileSync(sourceAbsolute);
  const targetBytes = fs.readFileSync(targetAbsolute);
  if (sha(targetBytes) === sha(sourceBytes)) {
    return { ...hashRecord(targetAbsolute), alreadyInstalled: true };
  }
  const manifestRecord = manifestVerification.records.find((record) =>
    path.resolve(C.REPO, record.path).toLowerCase()
      === startingSnapshotAbsolute.toLowerCase());
  requirePass(
    manifestRecord
      && manifestRecord.expectedSha256 === sha(fs.readFileSync(startingSnapshotAbsolute))
      && manifestRecord.pass,
    `C34_CP46_KNOWLEDGE_STARTING_SNAPSHOT_INVALID_${rel(targetAbsolute)}`,
  );
  requirePass(
    sha(targetBytes) === manifestRecord.expectedSha256,
    `C34_CP46_KNOWLEDGE_COMPARE_AND_SWAP_CONFLICT_${rel(targetAbsolute)}`,
  );
  const temporary =
    `${targetAbsolute}.c34-reviewed-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  let exists = false;
  try {
    fs.copyFileSync(sourceAbsolute, temporary, fs.constants.COPYFILE_EXCL);
    exists = true;
    fs.renameSync(temporary, targetAbsolute);
    exists = false;
  } finally {
    if (exists && fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  requirePass(
    sha(fs.readFileSync(targetAbsolute)) === sha(sourceBytes),
    `C34_CP46_KNOWLEDGE_INSTALLATION_DRIFT_${rel(targetAbsolute)}`,
  );
  return { ...hashRecord(targetAbsolute), alreadyInstalled: false };
}

function finalManifestFiles() {
  const excludedTop = new Set([
    path.basename(CHECKPOINT),
    path.basename(CHECKPOINT_LOG),
    path.basename(ART.finalManifest),
    path.basename(ART.finalManifestValidation),
    path.basename(ART.finalCommitContents),
    path.basename(ART.gitVerification),
    path.basename(ART.remoteVerification),
    path.basename(ART.terminalState),
  ]);
  const top = fs.readdirSync(RES, { withFileTypes: true })
    .filter((entry) =>
      entry.isFile()
      && entry.name.startsWith('COMMIT_5R1C34_')
      && !excludedTop.has(entry.name))
    .map((entry) => path.join(RES, entry.name));
  const attempts = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) =>
      entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .flatMap((entry) => recursiveFiles(path.join(ATT, entry.name)));
  const runners = fs.readdirSync(path.dirname(THIS_RUNNER), { withFileTypes: true })
    .filter((entry) =>
      entry.isFile() && entry.name.startsWith('commit5r1c34-'))
    .map((entry) => path.join(path.dirname(THIS_RUNNER), entry.name));
  return [
    ...top,
    ...attempts,
    ...runners,
    REGISTRY,
    ROADMAP,
    CURRENT_STATE,
    path.resolve('evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs'),
    path.resolve('evaluation/runner/phase-10a14-r20/commit5r1c20-gates.mjs'),
    path.resolve('package.json'),
    path.resolve('package-lock.json'),
    path.resolve('services/philippine-tax-intent-analyzer.js'),
    path.resolve('services/philippine-tax-domain-boundary.js'),
    path.resolve('services/philippine-tax-boundary-patterns.js'),
  ];
}

function finalCommitPathSet() {
  const current = statusPaths()
    .filter((record) => authorizedStagePath(record.path))
    .map((record) => record.path);
  return [...new Set([...current, rel(ART.finalCommitContents)])].sort();
}

function canonicalReviewMarkdown(canonical) {
  const payload = canonical.payload;
  return `# COMMIT 5R1-C34 Claude Code Opus 4.8 review

- Reviewer: ${payload.reviewerTool}
- Model: \`${payload.reviewerModel}\`
- Mode: read-only
- Reviewed-state digest: \`${payload.reviewedStateDigest}\`
- Decision: **${payload.decision}**
- Commit safe: **${payload.commitSafe}**

${payload.summary}

## Blocking findings

${payload.blockingFindings.length
    ? payload.blockingFindings.map((item) => `- ${item}`).join('\n')
    : '- None.'}

## Nonblocking observations

${payload.nonblockingObservations.length
    ? payload.nonblockingObservations.map((item) => `- ${item}`).join('\n')
    : '- None.'}
`;
}

function finalizeOpusReview() {
  requirePass(
    fs.existsSync(ART.opusInvocation) && fs.existsSync(ART.opusCapture),
    'C34_CP46_OPUS_INVOCATION_OR_CAPTURE_MISSING',
  );
  const manifest = verifyManifest(ART.preReviewManifest);
  requirePass(manifest.pass, 'C34_CP46_PRE_REVIEW_MANIFEST_CHANGED');
  const captureBytes = fs.readFileSync(ART.opusCapture);
  const capture = JSON.parse(captureBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const invocation = readJson(ART.opusInvocation);
  requirePass(
    invocation.reviewBudgetConsumed === true
      && invocation.status === 'STARTED_EXACTLY_ONCE'
      && invocation.reviewedStateDigest === manifest.manifest.sha256
      && JSON.stringify(invocation.argv)
        === JSON.stringify(expectedClaudeReviewArgv(manifest.manifest.sha256))
      && path.resolve(invocation.cwd).toLowerCase() === path.resolve(C.REPO).toLowerCase()
      && fs.existsSync(invocation.resolvedCliPath)
      && JSON.stringify(invocation.cliArtifact)
        === JSON.stringify(hashRecord(invocation.resolvedCliPath))
      && /^\d+\.\d+\.\d+/.test(invocation.cliVersion)
      && capture.reviewBudgetConsumed === true
      && JSON.stringify(capture.invocation)
        === JSON.stringify(hashRecord(ART.opusInvocation))
      && capture.resolvedCliPath === invocation.resolvedCliPath
      && capture.cliVersion === invocation.cliVersion
      && capture.exitCode === 0
      && capture.signal == null
      && capture.reviewedStateDigest === manifest.manifest.sha256
      && capture.rawStdoutSha256 === sha(Buffer.from(capture.rawStdout))
      && JSON.stringify(capture.argv)
        === JSON.stringify(expectedClaudeReviewArgv(manifest.manifest.sha256))
      && path.resolve(capture.cwd).toLowerCase() === path.resolve(C.REPO).toLowerCase(),
    'C34_CP46_OPUS_CAPTURE_BINDING_INVALID',
  );
  const envelope = JSON.parse(capture.rawStdout.replace(/^\uFEFF/, ''));
  requirePass(
    envelope.type === 'result'
      && envelope.subtype === 'success'
      && envelope.is_error === false
      && Array.isArray(envelope.permission_denials)
      && envelope.permission_denials.length === 0,
    'C34_CP46_OPUS_ENVELOPE_INVALID',
  );
  const modelUsageKeys = Object.keys(envelope.modelUsage || {});
  requirePass(
    modelUsageKeys.length === 1 && modelUsageKeys[0] === 'claude-opus-4-8',
    `C34_CP46_OPUS_MODEL_USAGE_${JSON.stringify(modelUsageKeys)}`,
  );
  const review = extractStructuredReview(envelope);
  const allowed = [
    'APPROVED',
    'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
    'REJECTED',
    'INCOMPLETE_REVIEW',
  ];
  requirePass(
    allowed.includes(review.decision)
      && review.reviewedStateDigest === manifest.manifest.sha256
      && review.reviewerTool === 'Claude Code'
      && review.reviewerModel === 'claude-opus-4-8'
      && review.independenceConfirmed === true
      && review.readOnlyConfirmed === true
      && review.verification
      && JSON.stringify(Object.keys(review.verification).sort())
        === JSON.stringify([...REVIEW_VERIFICATION_KEYS].sort())
      && REVIEW_VERIFICATION_KEYS.every((key) =>
        typeof review.verification[key] === 'boolean')
      && Array.isArray(review.blockingFindings)
      && Array.isArray(review.nonblockingObservations)
      && (
        (review.decision === 'APPROVED'
          && review.nonblockingObservations.length === 0)
        || (review.decision === 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS'
          && review.nonblockingObservations.length > 0)
        || ['REJECTED', 'INCOMPLETE_REVIEW'].includes(review.decision)
      )
      && typeof review.commitSafe === 'boolean',
    'C34_CP46_OPUS_STRUCTURED_DECISION_INVALID',
  );
  const approved = [
    'APPROVED',
    'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
  ].includes(review.decision);
  const approvalContract = review.blockingFindings.length === 0
    && REVIEW_VERIFICATION_KEYS.every((key) => review.verification[key] === true)
    && review.commitSafe === true;
  requirePass(
    !approved || approvalContract,
    'C34_CP46_OPUS_APPROVAL_CONTRACT_FAILED',
  );
  const canonical = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: capture.capturedUtc,
    reviewer: {
      tool: review.reviewerTool,
      model: review.reviewerModel,
      displayName: 'Claude Code Opus 4.8',
      mode: 'READ_ONLY_FINAL_REVIEW',
      independentOfExecution: true,
    },
    reviewedCommit: EXPECTED.startHead,
    reviewedStateDigest: review.reviewedStateDigest,
    capture: {
      artifact: rel(ART.opusCapture),
      bytes: captureBytes.length,
      sha256: sha(captureBytes),
      resolvedCliPath: capture.resolvedCliPath,
      cliVersion: capture.cliVersion,
      argv: capture.argv,
      rawStdoutSha256: capture.rawStdoutSha256,
      modelUsageKeys,
      permissionDenials: envelope.permission_denials,
    },
    payload: review,
    decision: review.decision,
    commitAuthorized: approved && approvalContract,
    pass: true,
  };
  writeOnceJson(ART.opusJson, canonical);
  writeOnceBuffer(ART.opusMd, Buffer.from(canonicalReviewMarkdown(canonical)));
  if (!canonical.commitAuthorized) {
    const status = review.decision === 'REJECTED'
      ? 'FOUR_HOUR_SAFE_PAUSE_OPUS_REJECTED'
      : 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS';
    const checkpoint = ensureHistoricalOrAppendCheckpoint({
      updatedAtUtc: canonical.generatedUtc,
      stage: 'independent Opus review terminal decision',
      status,
      activeBaseHash: readJson(ART.finalActive).identity.servicesTreeDigest,
      artifacts: [
        ART.opusInvocation,
        ART.opusCapture,
        ART.opusJson,
        ART.opusMd,
        ART.preReviewManifest,
      ],
      nextExactOperation: review.decision === 'REJECTED'
        ? 'Stop without staging, commit, or push. Resolve the exact blocking findings under separate governance; do not rerun this consumed review.'
        : 'Stop without staging, commit, or push. The one review invocation was incomplete; obtain new governance before any further review.',
      safeToResume: true,
      blocker: `CLAUDE_CODE_OPUS_4_8_${review.decision}`,
    });
    return { canonical, approved: false, checkpoint: checkpoint.event };
  }
  const roadmapSource = review.decision === 'APPROVED'
    ? ART.roadmapDraft
    : ART.roadmapDraftObserved;
  const currentSource = review.decision === 'APPROVED'
    ? ART.currentStateDraft
    : ART.currentStateDraftObserved;
  const roadmapInstalled = installReviewedFile(
    roadmapSource,
    ROADMAP,
    ART.roadmapStartingSnapshot,
    manifest,
  );
  const currentStateInstalled = installReviewedFile(
    currentSource,
    CURRENT_STATE,
    ART.currentStateStartingSnapshot,
    manifest,
  );
  const checkpoint = ensureHistoricalOrAppendCheckpoint({
    updatedAtUtc: canonical.generatedUtc,
    stage: 'independent Opus review approved documentation cutover',
    status: review.decision,
    activeBaseHash: readJson(ART.finalActive).identity.servicesTreeDigest,
    artifacts: [
      ART.opusInvocation,
      ART.opusCapture,
      ART.opusJson,
      ART.opusMd,
      roadmapSource,
      currentSource,
      ROADMAP,
      CURRENT_STATE,
      ART.finalClosureDraft,
    ],
    nextExactOperation:
      'Seal the deterministic final manifest, explicitly stage the reviewed C34 set, commit once, push, and verify remotely.',
    safeToResume: true,
  });
  writeOnceBuffer(ART.finalCheckpointLogSnapshot, fs.readFileSync(CHECKPOINT_LOG));
  const finalManifest = makeManifest(ART.finalManifest, finalManifestFiles());
  requirePass(finalManifest.pass, 'C34_CP46_FINAL_MANIFEST_INVALID');
  const validation = stableGeneratedJson(
    ART.finalManifestValidation,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      manifest: finalManifest.manifest,
      entries: finalManifest.entries,
      badHashes: finalManifest.badRecords,
      missingFiles: finalManifest.records.filter((record) => !record.exists),
      duplicatePaths: finalManifest.duplicatePaths,
      requiredPaths: {
        checkpointChainSnapshot: rel(ART.finalCheckpointLogSnapshot),
        opusReview: rel(ART.opusJson),
        roadmapV9: rel(ROADMAP),
        currentState: rel(CURRENT_STATE),
        registry: rel(REGISTRY),
        wal: rel(WAL),
        serviceIdentity: rel(ART.serviceIdentity),
      },
      excludedByDesign: [
        rel(ART.finalManifest),
        rel(ART.finalManifestValidation),
        rel(ART.finalCommitContents),
        rel(CHECKPOINT),
        rel(CHECKPOINT_LOG),
        rel(ART.gitVerification),
        rel(ART.remoteVerification),
        rel(ART.terminalState),
      ],
      selfExcluding: true,
      liveCheckpointRepresentedByImmutableSnapshot: true,
      postCommitAttestationsExternalToSealedCommit: true,
      pass: finalManifest.pass
        && [
          ART.finalCheckpointLogSnapshot,
          ART.opusJson,
          ROADMAP,
          CURRENT_STATE,
          REGISTRY,
          WAL,
          ART.serviceIdentity,
        ].every((file) =>
          finalManifest.records.some((record) => record.path === rel(file))),
    }),
  );
  requirePass(validation.pass, 'C34_CP46_FINAL_MANIFEST_VALIDATION_FAILED');
  const commitPaths = finalCommitPathSet();
  const stagingDraft = readJson(ART.stagingDraft);
  const expectedIndexBlobBindings = Object.fromEntries(commitPaths
    .filter((file) => file !== rel(ART.finalCommitContents))
    .map((file) => [file, indexBlobBinding(file, file)]));
  const commitContents = stableGeneratedJson(
    ART.finalCommitContents,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      reviewDecision: review.decision,
      reviewedStateDigest: review.reviewedStateDigest,
      finalManifest: hashRecord(ART.finalManifest),
      finalManifestValidation: hashRecord(ART.finalManifestValidation),
      paths: commitPaths,
      pathCount: commitPaths.length,
      proposedPaths: stagingDraft.paths,
      matchesProposedStagingSet:
        JSON.stringify(commitPaths) === JSON.stringify(stagingDraft.paths),
      proposedStagingSet: hashRecord(ART.stagingDraft),
      expectedIndexBlobBindings,
      indexBlobBindingPolicy:
        'all non-self commit paths are bound to exact working SHA-256, raw Git blob, and target-path filtered index blob; any clean-filter transformation is explicit and the staged index must match expectedIndexBlob',
      proposedCommitMessage: stagingDraft.proposedCommitMessage,
      externalPostCommitAttestations: stagingDraft.externalPostCommitAttestations,
      explicitFileByFileOnly: true,
      pass: commitPaths.length > 0
        && commitPaths.every(authorizedStagePath)
        && JSON.stringify(commitPaths) === JSON.stringify(stagingDraft.paths)
        && Object.keys(expectedIndexBlobBindings).length === commitPaths.length - 1
        && !commitPaths.some((item) =>
          /^\.claude\/|^\.vscode\/|^evaluation\/factcheck\/|5R1C35|commit5r1c35/i
            .test(item)),
    }),
  );
  requirePass(commitContents.pass, 'C34_CP46_FINAL_COMMIT_CONTENTS_INVALID');
  return {
    canonical,
    approved: true,
    roadmapInstalled,
    currentStateInstalled,
    checkpoint: checkpoint.event,
    finalManifest,
    validation,
    commitContents,
  };
}

function verifyApprovedCutover() {
  const review = readJson(ART.opusJson);
  const validation = readJson(ART.finalManifestValidation);
  const contents = readJson(ART.finalCommitContents);
  const manifest = verifyManifest(ART.finalManifest);
  const status = gitState();
  const processes = processState();
  const dirtyTrackedPaths = git('diff', '--name-only', 'HEAD')
    .split(/\r?\n/).filter(Boolean).sort();
  const indexBindingsPass = Object.entries(contents.expectedIndexBlobBindings || {})
    .every(([file, expected]) =>
      JSON.stringify(indexBlobBinding(file, file)) === JSON.stringify(expected));
  requirePass(
    review.commitAuthorized === true
      && ['APPROVED', 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS']
        .includes(review.decision)
      && validation.pass === true
      && contents.pass === true
      && manifest.pass
      && manifest.manifest.sha256 === validation.manifest.sha256
      && sha(fs.readFileSync(ART.finalManifest)) === contents.finalManifest.sha256
      && indexBindingsPass
      && dirtyTrackedPaths.every((file) => contents.paths.includes(file))
      && status.serviceDiff === ''
      && status.staged === ''
      && status.roadmapV7V8Diff === ''
      && status.oracleDiff === ''
      && !status.indexLock
      && status.c35Items.length === 0
      && processes.inspectionSucceeded
      && processes.activeC34.length === 0
      && processes.unreadable.length === 0
      && processes.listeners5173.length === 0
      && temporaryRuntimeDirectories().length === 0
      && allocationLocks().length === 0,
    'C34_CP46_APPROVED_CUTOVER_PREFLIGHT_FAILED',
  );
  return {
    review,
    validation,
    contents,
    manifest,
    status,
    processes,
    dirtyTrackedPaths,
    indexBindingsPass,
  };
}

function stagedIndexBlob(file) {
  const record = git('ls-files', '--stage', '--', file).trim();
  const match = /^\d+\s+([0-9a-f]{40,64})\s+\d+\t/.exec(record);
  requirePass(match, `C34_CP46_STAGED_INDEX_RECORD_INVALID_${file}`);
  return match[1];
}

function commitAndPush() {
  const commitBudget = requireOperationBudget(
    'explicit staging, commit, push, and remote verification',
    230,
    5 * 60 * 1000,
  );
  const approved = verifyApprovedCutover();
  const message = approved.contents.proposedCommitMessage;
  const currentHead = git('rev-parse', 'HEAD').trim();
  let commitHash;
  let parent;
  let tree;
  let expectedTree = null;
  let committedNow = false;
  let stagedBlobBindings = null;
  if (currentHead === EXPECTED.startHead) {
    for (const file of approved.contents.paths) {
      requirePass(
        authorizedStagePath(file) && fs.existsSync(path.resolve(C.REPO, file)),
        `C34_CP46_EXPLICIT_STAGE_PATH_INVALID_${file}`,
      );
      git('add', '--', file);
    }
    const staged = git('diff', '--cached', '--name-only')
      .split(/\r?\n/).filter(Boolean).sort();
    requirePass(
      JSON.stringify(staged) === JSON.stringify(approved.contents.paths),
      'C34_CP46_STAGED_SET_DIFFERS_FROM_REVIEWED_COMMIT_CONTENTS',
    );
    stagedBlobBindings = Object.fromEntries(staged.map((file) => {
      const expected = approved.contents.expectedIndexBlobBindings[file]
        || indexBlobBinding(file, file);
      const actualIndexBlob = stagedIndexBlob(file);
      requirePass(
        actualIndexBlob === expected.expectedIndexBlob
          && sha(fs.readFileSync(path.resolve(C.REPO, file)))
            === expected.workingSha256,
        `C34_CP46_STAGED_INDEX_BLOB_DIFFERS_${file}`,
      );
      return [file, { ...expected, actualIndexBlob, pass: true }];
    }));
    const unstagedTrackedAfterExplicitStage = git('diff', '--name-only').trim();
    requirePass(
      unstagedTrackedAfterExplicitStage === '',
      'C34_CP46_UNSTAGED_TRACKED_DIFF_AFTER_EXPLICIT_STAGE',
    );
    const stagedServices = git(
      'diff',
      '--cached',
      '--name-only',
      '--',
      'services/philippine-tax-intent-analyzer.js',
      'services/philippine-tax-domain-boundary.js',
      'services/philippine-tax-boundary-patterns.js',
    ).trim();
    const stagedLegacyRoadmaps = git(
      'diff',
      '--cached',
      '--name-only',
      '--',
      'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
      'knowledge/TINA_Updated_Roadmap_v7.md',
    ).trim();
    const stagedOracles = git(
      'diff',
      '--cached',
      '--name-only',
      '--',
      'evaluation/oracles',
    ).trim();
    requirePass(
      stagedServices === '' && stagedLegacyRoadmaps === '' && stagedOracles === '',
      'C34_CP46_FORBIDDEN_STAGED_PATH',
    );
    expectedTree = git('write-tree').trim();
    git('commit', '-m', message);
    committedNow = true;
    commitHash = git('rev-parse', 'HEAD').trim();
  } else {
    commitHash = currentHead;
  }
  parent = git('show', '-s', '--format=%P', commitHash).trim();
  tree = git('show', '-s', '--format=%T', commitHash).trim();
  const actualMessage = git('show', '-s', '--format=%B', commitHash).trim();
  const committedPaths = git(
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    commitHash,
  ).split(/\r?\n/).filter(Boolean).sort();
  const indexAfterCommit = git('diff', '--cached', '--name-only').trim();
  const trackedDiffAfterCommit = git('diff', '--name-only', 'HEAD').trim();
  if (stagedBlobBindings == null) {
    stagedBlobBindings = Object.fromEntries(approved.contents.paths.map((file) => {
      const expected = approved.contents.expectedIndexBlobBindings[file]
        || indexBlobBinding(file, file);
      const actualIndexBlob = git('rev-parse', `${commitHash}:${file}`).trim();
      requirePass(
        actualIndexBlob === expected.expectedIndexBlob
          && sha(fs.readFileSync(path.resolve(C.REPO, file)))
            === expected.workingSha256,
        `C34_CP46_COMMITTED_INDEX_BLOB_DIFFERS_${file}`,
      );
      return [file, { ...expected, actualIndexBlob, pass: true }];
    }));
  }
  requirePass(
    parent === EXPECTED.startHead
      && actualMessage === message
      && (expectedTree == null || tree === expectedTree)
      && JSON.stringify(committedPaths) === JSON.stringify(approved.contents.paths)
      && indexAfterCommit === ''
      && trackedDiffAfterCommit === '',
    'C34_CP46_LOCAL_COMMIT_VERIFICATION_FAILED',
  );
  const gitVerification = stableGeneratedJson(
    ART.gitVerification,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      reviewDecision: approved.review.decision,
      commitHash,
      parent,
      tree,
      expectedTree,
      message: actualMessage,
      committedNow,
      exactReviewedPaths: approved.contents.paths,
      exactReviewedPathCount: approved.contents.pathCount,
      committedPaths,
      stagedBlobBindings,
      committedPathsMatchReviewed:
        JSON.stringify(committedPaths) === JSON.stringify(approved.contents.paths),
      committedTreeMatchesExpected: expectedTree == null || tree === expectedTree,
      commitStartBudget: commitBudget,
      indexEmptyAfterCommit: indexAfterCommit === '',
      trackedTreeCleanAfterCommit: trackedDiffAfterCommit === '',
      serviceDiffEmpty: git(
        'diff',
        '--name-only',
        'HEAD',
        '--',
        'services/philippine-tax-intent-analyzer.js',
        'services/philippine-tax-domain-boundary.js',
        'services/philippine-tax-boundary-patterns.js',
      ).trim() === '',
      sealedManifest: hashRecord(ART.finalManifest),
      postCommitArtifactExternalToSealedCommit: true,
      pass: parent === EXPECTED.startHead
        && actualMessage === message
        && (expectedTree == null || tree === expectedTree)
        && JSON.stringify(committedPaths) === JSON.stringify(approved.contents.paths)
        && indexAfterCommit === ''
        && trackedDiffAfterCommit === '',
    }),
  );
  requirePass(gitVerification.pass, 'C34_CP46_GIT_VERIFICATION_ARTIFACT_FAILED');
  let pushError = null;
  try {
    git('push');
  } catch (error) {
    pushError = error;
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
  const upstreamName = git('rev-parse', '--abbrev-ref', '@{u}').trim();
  const [remote, ...remoteBranchParts] = upstreamName.split('/');
  const remoteBranch = remoteBranchParts.join('/');
  let lsRemoteHash = null;
  let lsRemoteError = null;
  try {
    const output = git('ls-remote', '--heads', remote, `refs/heads/${remoteBranch}`).trim();
    lsRemoteHash = output ? output.split(/\s+/)[0] : null;
  } catch (error) {
    lsRemoteError = String(error);
  }
  const upstreamHash = git('rev-parse', '@{u}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim();
  const remoteVerification = stableGeneratedJson(
    ART.remoteVerification,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      branch,
      upstreamName,
      remote,
      remoteBranch,
      localHead: commitHash,
      upstreamHash,
      lsRemoteHash,
      sync,
      pushError: pushError ? String(pushError) : null,
      lsRemoteError,
      postCommitArtifactExternalToSealedCommit: true,
      pass: pushError == null
        && lsRemoteError == null
        && upstreamHash === commitHash
        && lsRemoteHash === commitHash
        && sync === '0\t0',
    }),
  );
  return {
    committedNow,
    commitHash,
    parent,
    tree,
    message,
    gitVerification,
    remoteVerification,
    pass: remoteVerification.pass,
  };
}

function terminalContext() {
  const finalActive = fs.existsSync(ART.finalActive) ? readJson(ART.finalActive) : null;
  const candidate6 = fs.existsSync(ART.candidate6Result)
    ? readJson(ART.candidate6Result)
    : null;
  const composition = fs.existsSync(ART.finalComposition)
    ? readJson(ART.finalComposition)
    : null;
  const frozen = fs.existsSync(ART.finalFrozen) ? readJson(ART.finalFrozen) : null;
  const review = fs.existsSync(ART.opusJson) ? readJson(ART.opusJson) : null;
  const capture = fs.existsSync(ART.opusCapture) ? readJson(ART.opusCapture) : null;
  const invocation = fs.existsSync(ART.opusInvocation)
    ? readJson(ART.opusInvocation)
    : null;
  const manifest = fs.existsSync(ART.finalManifestValidation)
    ? readJson(ART.finalManifestValidation)
    : null;
  const gitVerification = fs.existsSync(ART.gitVerification)
    ? readJson(ART.gitVerification)
    : null;
  const remoteVerification = fs.existsSync(ART.remoteVerification)
    ? readJson(ART.remoteVerification)
    : null;
  const registry = readJson(REGISTRY);
  const walRows = parseNdjson(WAL);
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name).sort();
  const ledger = C.reconcileC34AttemptLedger({ throwOnFailure: true });
  const retryLinkage = validateRetryLinkage(registry, walRows);
  const processes = processState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const status = gitState();
  const allowedC34Cycles = new Set([
    'reconstruct',
    'nt01',
    'nt01-retry01',
    'nt02',
    'tx01',
    'tx02',
    'tr01',
    'tr01-retry01',
    'cp01',
    'compose',
  ]);
  const unauthorizedC34Attempts = registry.attempts.filter((attempt) =>
    attempt.attemptId?.includes('commit5r1c34-')
      && !allowedC34Cycles.has(attempt.cycle));
  return {
    finalActive,
    candidate6,
    composition,
    frozen,
    review,
    capture,
    invocation,
    manifest,
    gitVerification,
    remoteVerification,
    registry,
    walRows,
    directories,
    ledger,
    retryLinkage,
    processes,
    temporary,
    locks,
    status,
    unauthorizedC34Attempts,
  };
}

function terminalSafePause({
  classification,
  nextExactOperation,
  blocker = null,
}) {
  if (fs.existsSync(ART.terminalState)) {
    const existing = readJson(ART.terminalState);
    requirePass(
      existing.classification === classification,
      `C34_CP46_TERMINAL_CLASSIFICATION_CONFLICT_${existing.classification}_${classification}`,
    );
    const checkpoint = appendIdempotentCheckpoint({
      updatedAtUtc: existing.generatedUtc,
      stage: existing.stage,
      status: existing.classification,
      activeBaseHash: existing.activeBaseHash,
      artifacts: [
        ART.terminalState,
        ...(fs.existsSync(ART.candidate6Result) ? [ART.candidate6Result] : []),
        ...(fs.existsSync(ART.finalClosureDraft) ? [ART.finalClosureDraft] : []),
        ...(fs.existsSync(ART.opusInvocation) ? [ART.opusInvocation] : []),
        ...(fs.existsSync(ART.opusJson) ? [ART.opusJson] : []),
        ...(fs.existsSync(ART.finalManifestValidation)
          ? [ART.finalManifestValidation]
          : []),
        ...(fs.existsSync(ART.gitVerification) ? [ART.gitVerification] : []),
        ...(fs.existsSync(ART.remoteVerification) ? [ART.remoteVerification] : []),
        REGISTRY,
        WAL,
      ],
      nextExactOperation: existing.nextExactOperation,
      safeToResume: true,
      blocker: existing.blocker,
      ordinal: existing.endingCheckpointOrdinal,
    });
    return { state: existing, checkpoint, idempotent: !checkpoint.appended };
  }
  const context = terminalContext();
  const activeBaseHash = context.finalActive?.identity?.servicesTreeDigest
    || context.candidate6?.endingActiveBaseHash
    || EXPECTED.activeBase;
  const metrics = context.finalActive?.metrics
    || context.candidate6?.endingMetrics
    || {
      reasonPassed: 3575,
      reasonMismatches: 145,
      decisionPassed: 3720,
      relationPassed: 3720,
    };
  const endingCheckpointOrdinal = parseNdjson(CHECKPOINT_LOG).length + 1;
  const state = stableGeneratedJson(ART.terminalState, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    elapsedMilliseconds:
      Date.parse(generatedUtc) - Date.parse(EXPECTED.sessionStartedUtc),
    sessionStartedUtc: EXPECTED.sessionStartedUtc,
    sessionHardStopUtc: EXPECTED.sessionHardStopUtc,
    startingCheckpoint: 46,
    endingCheckpointOrdinal,
    stage: 'four-hour terminal reconciliation',
    classification,
    safeToResume: true,
    activeAttemptId: null,
    activeBaseHash,
    currentMetrics: metrics,
    candidate6: context.candidate6
      ? {
        attemptId: context.candidate6.attemptId,
        status: context.candidate6.status,
        disposition: context.candidate6.disposition,
        accepted: context.candidate6.accepted,
        metricDelta: context.candidate6.metricDelta,
      }
      : {
        attemptId: null,
        status: 'NOT_ALLOCATED',
        disposition: 'NOT_EXECUTED',
        accepted: false,
        metricDelta: null,
      },
    compositionStatus: context.composition?.disposition || 'NOT_COMPLETED',
    frozenGateStatus: context.frozen?.pass === true ? 'PASS' : 'NOT_COMPLETED_OR_FAILED',
    opus: context.review
      ? {
        invocationStatus: 'COMPLETED',
        decision: context.review.decision,
        commitAuthorized: context.review.commitAuthorized,
        observations: context.review.payload?.nonblockingObservations || [],
      }
      : {
        invocationStatus: context.capture
          ? 'INVOKED_WITHOUT_FINALIZED_DECISION'
          : context.invocation
            ? 'STARTED_WITHOUT_CAPTURE_REVIEW_BUDGET_CONSUMED'
            : 'NOT_INVOKED',
        decision: null,
        commitAuthorized: false,
        observations: [],
      },
    knowledge: {
      roadmapV9Status: context.review?.commitAuthorized
        ? 'EXACT_REVIEWED_VARIANT_INSTALLED'
        : 'UNCHANGED',
      currentStateStatus: context.review?.commitAuthorized
        ? 'EXACT_REVIEWED_VARIANT_INSTALLED_LAST'
        : 'UNCHANGED',
    },
    manifest: context.manifest
      ? {
        status: context.manifest.pass ? 'SEALED_PASS' : 'FAILED',
        artifact: rel(ART.finalManifest),
        sha256: context.manifest.manifest?.sha256 || null,
        entries: context.manifest.entries,
        badHashes: context.manifest.badHashes?.length || 0,
        duplicatePaths: context.manifest.duplicatePaths?.length || 0,
      }
      : { status: 'NOT_CREATED' },
    git: {
      stagedPaths: context.status.staged
        ? context.status.staged.split(/\r?\n/).filter(Boolean)
        : [],
      commit: context.gitVerification
        ? {
          hash: context.gitVerification.commitHash,
          parent: context.gitVerification.parent,
          tree: context.gitVerification.tree,
          message: context.gitVerification.message,
          pass: context.gitVerification.pass,
        }
        : null,
      push: context.remoteVerification
        ? {
          pass: context.remoteVerification.pass,
          upstreamHash: context.remoteVerification.upstreamHash,
          lsRemoteHash: context.remoteVerification.lsRemoteHash,
          sync: context.remoteVerification.sync,
        }
        : null,
      head: context.status.head,
      upstream: context.status.upstream,
      sync: context.status.sync,
      indexLock: context.status.indexLock,
      trackedServiceDiff: context.status.serviceDiff,
    },
    reconciliation: {
      registryAttempts: context.registry.attempts.length,
      registrySha256: sha(fs.readFileSync(REGISTRY)),
      walRows: context.walRows.length,
      walSha256: sha(fs.readFileSync(WAL)),
      attemptDirectories: context.directories.length,
      orphan: context.registry.summary.orphan,
      dangling: context.registry.summary.dangling,
      running: context.registry.summary.c34RunningAttemptIds,
      ledgerPass: context.ledger.pass,
      retryLinkage: context.retryLinkage,
    },
    allocationLocks: context.locks.map(rel),
    processState: context.processes,
    temporaryRuntimeDirectories: context.temporary.map(rel),
    port5173Free: context.processes.listeners5173.length === 0,
    serviceDiffEmpty: context.status.serviceDiff === '',
    candidate7Created: context.unauthorizedC34Attempts.length > 0,
    unauthorizedC34AttemptIds:
      context.unauthorizedC34Attempts.map((attempt) => attempt.attemptId),
    c35Items: context.status.c35Items,
    blocker,
    nextExactOperation,
    pass: context.ledger.pass
      && context.retryLinkage.pass
      && context.registry.summary.orphan === 0
      && context.registry.summary.dangling === 0
      && context.registry.summary.c34RunningAttemptIds.length === 0
      && context.processes.inspectionSucceeded
      && context.processes.activeC34.length === 0
      && context.processes.unreadable.length === 0
      && context.processes.listeners5173.length === 0
      && context.temporary.length === 0
      && context.locks.length === 0
      && context.status.serviceDiff === ''
      && !context.status.indexLock
      && context.status.c35Items.length === 0
      && context.unauthorizedC34Attempts.length === 0,
  }));
  requirePass(state.pass, 'C34_CP46_TERMINAL_STATE_NOT_RECONCILED');
  const artifacts = [
    ART.terminalState,
    ...(fs.existsSync(ART.candidate6Result) ? [ART.candidate6Result] : []),
    ...(fs.existsSync(ART.finalClosureDraft) ? [ART.finalClosureDraft] : []),
    ...(fs.existsSync(ART.opusInvocation) ? [ART.opusInvocation] : []),
    ...(fs.existsSync(ART.opusJson) ? [ART.opusJson] : []),
    ...(fs.existsSync(ART.finalManifestValidation)
      ? [ART.finalManifestValidation]
      : []),
    ...(fs.existsSync(ART.gitVerification) ? [ART.gitVerification] : []),
    ...(fs.existsSync(ART.remoteVerification) ? [ART.remoteVerification] : []),
    REGISTRY,
    WAL,
  ];
  const checkpoint = appendIdempotentCheckpoint({
    updatedAtUtc: state.generatedUtc,
    stage: state.stage,
    status: state.classification,
    activeBaseHash: state.activeBaseHash,
    artifacts,
    nextExactOperation: state.nextExactOperation,
    safeToResume: true,
    blocker: state.blocker,
    ordinal: state.endingCheckpointOrdinal,
  });
  const replay = appendIdempotentCheckpoint({
    updatedAtUtc: state.generatedUtc,
    stage: state.stage,
    status: state.classification,
    activeBaseHash: state.activeBaseHash,
    artifacts,
    nextExactOperation: state.nextExactOperation,
    safeToResume: true,
    blocker: state.blocker,
    ordinal: state.endingCheckpointOrdinal,
  });
  requirePass(
    !replay.appended
      && replay.event.eventSha256 === checkpoint.event.eventSha256,
    'C34_CP46_TERMINAL_CHECKPOINT_NOT_IDEMPOTENT',
  );
  return { state, checkpoint, idempotent: true };
}

function timeBudgetState() {
  const current = Date.now();
  return {
    nowUtc: new Date(current).toISOString(),
    sessionStartedUtc: EXPECTED.sessionStartedUtc,
    hardStopUtc: EXPECTED.sessionHardStopUtc,
    elapsedMilliseconds: current - Date.parse(EXPECTED.sessionStartedUtc),
    remainingMilliseconds: Date.parse(EXPECTED.sessionHardStopUtc) - current,
    withinLimit: current <= Date.parse(EXPECTED.sessionHardStopUtc),
  };
}

function requireOperationBudget(
  operation,
  latestStartMinute = 240,
  minimumRemainingMilliseconds = 0,
) {
  const budget = timeBudgetState();
  const latestStart = Date.parse(EXPECTED.sessionStartedUtc)
    + (latestStartMinute * 60 * 1000);
  const safeOperation = operation.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
  requirePass(
    budget.withinLimit
      && Date.now() <= latestStart
      && budget.remainingMilliseconds >= minimumRemainingMilliseconds,
    `C34_CP46_TIME_BUDGET_REFUSES_${safeOperation}`,
  );
  return {
    ...budget,
    operation,
    latestStartMinute,
    minimumRemainingMilliseconds,
  };
}

function requireLongOperationBudget(operation, minimumRemainingMilliseconds = 0) {
  return requireOperationBudget(
    operation,
    215,
    minimumRemainingMilliseconds,
  );
}

function inferredFailureClassification() {
  if (fs.existsSync(ART.opusInvocation) && !fs.existsSync(ART.opusCapture)) {
    return 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS';
  }
  if (fs.existsSync(ART.opusCapture) && !fs.existsSync(ART.opusJson)) {
    return 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS';
  }
  if (fs.existsSync(ART.opusJson)) {
    const review = readJson(ART.opusJson);
    if (review.decision === 'REJECTED') return 'FOUR_HOUR_SAFE_PAUSE_OPUS_REJECTED';
    if (!review.commitAuthorized) return 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS';
  }
  if (fs.existsSync(ART.finalFrozen)) {
    return 'FOUR_HOUR_SAFE_PAUSE_POST_FROZEN_GATES';
  }
  if (fs.existsSync(ART.finalComposition)) {
    return 'FOUR_HOUR_SAFE_PAUSE_POST_COMPOSITION';
  }
  if (fs.existsSync(ART.candidate6Result)) {
    const candidate6 = readJson(ART.candidate6Result);
    if (candidate6.status === 'technical_failure') {
      return 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER';
    }
    return 'FOUR_HOUR_SAFE_PAUSE_POST_CANDIDATE_6';
  }
  return 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER';
}

async function executeThroughReviewReady() {
  const budget = requireOperationBudget('checkpoint 46 continuation entry');
  const diagnostic = reconcileDiagnosticCheckpoint47();
  const sandboxDiagnostic = reconcilePreallocationSandboxDiagnostic();
  const startingLedgerGuardDiagnostic =
    reconcilePreallocationStartingLedgerGuardDiagnostic();
  const executor = await loadFrozenExecutor();
  const candidate6 = await executeCandidate6(executor);
  if (candidate6.attempt.status !== 'completed') {
    const terminal = terminalSafePause({
      classification: 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER',
      nextExactOperation:
        'Preserve the sole Candidate-6 technical attempt. Obtain new governance for forensic adjudication; do not allocate a replacement, Candidate 7, or C35.',
      blocker: 'C34_CANDIDATE_6_TECHNICAL_FAILURE',
    });
    return {
      budget,
      diagnostic,
      sandboxDiagnostic,
      startingLedgerGuardDiagnostic,
      candidate6: candidate6.outcome,
      terminal,
    };
  }
  const composition = await executeComposition(executor, candidate6);
  if (
    composition.attempt.status !== 'completed'
    || composition.result?.pass !== true
  ) {
    const technical = composition.attempt.status !== 'completed';
    const terminal = terminalSafePause({
      classification: technical
        ? 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
        : 'FOUR_HOUR_SAFE_PAUSE_POST_COMPOSITION',
      nextExactOperation:
        'Preserve the sole terminal composition attempt and its evidence. Obtain separate governance for adjudication; do not allocate another composition, Candidate 7, or C35.',
      blocker: technical
        ? 'C34_COMPOSITION_TECHNICAL_FAILURE'
        : 'C34_COMPOSITION_OR_ORDER_INTERFERENCE',
    });
    return {
      budget,
      diagnostic,
      sandboxDiagnostic,
      startingLedgerGuardDiagnostic,
      candidate6: candidate6.outcome,
      composition,
      terminal,
    };
  }
  requireLongOperationBudget('final cumulative frozen closure verification');
  const closure = await buildFinalClosure(executor, candidate6, composition);
  requireOperationBudget('pre-review evidence package sealing');
  const reviewPackage = prepareReviewPackage();
  return {
    budget,
    diagnostic: {
      appended: diagnostic.appended,
      checkpoint: diagnostic.checkpoint,
      evidence: hashRecord(ART.diagnostic47),
    },
    sandboxDiagnostic: sandboxDiagnostic
      ? {
        checkpoint: sandboxDiagnostic.checkpoint,
        evidence: hashRecord(ART.preallocationSandboxAdjudication),
      }
      : null,
    startingLedgerGuardDiagnostic: startingLedgerGuardDiagnostic
      ? {
        checkpoint: startingLedgerGuardDiagnostic.checkpoint,
        evidence: hashRecord(ART.preallocationStartingGuardAdjudication),
      }
      : null,
    candidate6: readJson(ART.candidate6Result),
    composition: readJson(ART.finalComposition),
    closure: {
      activeBase: closure.active.identity.servicesTreeDigest,
      metrics: closure.finalGates.metrics,
      residualCount: closure.residual.inventory.residualCount,
      frozenPass: closure.frozen.pass,
      dualReplayPass: closure.dualReplay.pass,
      generalizationPass: closure.generalization.pass,
      preservationPass: closure.preservation.pass,
      ledgerPass: closure.ledger.pass,
      registryWalPass: closure.registryWal.pass,
    },
    reviewReady: {
      reviewedStateDigest: reviewPackage.manifest.manifest.sha256,
      manifestEntries: reviewPackage.manifest.entries,
      request: rel(ART.reviewRequest),
      status: 'READY_FOR_EXACTLY_ONE_CLAUDE_CODE_OPUS_4_8_READ_ONLY_REVIEW',
    },
    pass: true,
  };
}

async function main() {
  const modes = [
    '--reconcile-diagnostic',
    '--through-review-ready',
    '--invoke-opus-review',
    '--finalize-opus-review',
    '--commit-push',
    '--terminal-idempotence',
  ].filter((mode) => process.argv.includes(mode));
  requirePass(modes.length === 1, 'C34_CP46_EXACTLY_ONE_MODE_REQUIRED');
  let result;
  if (modes[0] === '--reconcile-diagnostic') {
    result = reconcileDiagnosticCheckpoint47();
  } else if (modes[0] === '--through-review-ready') {
    result = await executeThroughReviewReady();
  } else if (modes[0] === '--invoke-opus-review') {
    result = invokeOpusReview();
    if (result.capture.exitCode !== 0) {
      result.terminal = terminalSafePause({
        classification: 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS',
        nextExactOperation:
          'The single Opus invocation did not return successfully. Preserve the capture and obtain new governance before any further review; do not stage, commit, or push.',
        blocker: 'CLAUDE_CODE_OPUS_4_8_INVOCATION_INCOMPLETE',
      });
    }
  } else if (modes[0] === '--finalize-opus-review') {
    requireLongOperationBudget(
      'Opus decision finalization, reviewed documentation cutover, and manifest sealing',
    );
    result = finalizeOpusReview();
    if (!result.approved) {
      const rejected = result.canonical.decision === 'REJECTED';
      result.terminal = terminalSafePause({
        classification: rejected
          ? 'FOUR_HOUR_SAFE_PAUSE_OPUS_REJECTED'
          : 'FOUR_HOUR_SAFE_PAUSE_PENDING_OPUS',
        nextExactOperation: rejected
          ? 'Resolve the exact Opus blocking findings under separate governance. The one review budget is consumed; do not stage, commit, push, or begin C35.'
          : 'The Opus review was incomplete. Preserve the exact capture and obtain new governance; do not stage, commit, push, or begin C35.',
        blocker: `CLAUDE_CODE_OPUS_4_8_${result.canonical.decision}`,
      });
    }
  } else if (modes[0] === '--commit-push') {
    const gitResult = commitAndPush();
    const successful = gitResult.pass;
    const active = readJson(ART.finalActive);
    result = {
      ...gitResult,
      terminal: terminalSafePause({
        classification: successful
          ? 'C34_COMMITTED_AND_PUSHED_PHASE_10A_OPEN'
          : 'FOUR_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER',
        nextExactOperation: successful
          ? 'C34 is terminal and pushed. Obtain separate governance for the next Phase-10A14-R20 unit against the selected C34 runtime; do not begin C35 in this execution.'
          : 'Preserve the verified local commit and retry only the failed push/remote verification under separate governance; do not create another commit.',
        blocker: successful ? null : 'C34_PUSH_OR_REMOTE_VERIFICATION_FAILED',
      }),
    };
  } else {
    requirePass(fs.existsSync(ART.terminalState), 'C34_CP46_TERMINAL_STATE_MISSING');
    const terminal = readJson(ART.terminalState);
    result = terminalSafePause({
      classification: terminal.classification,
      nextExactOperation: terminal.nextExactOperation,
      blocker: terminal.blocker,
    });
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  let terminal = null;
  let terminalError = null;
  try {
    terminal = terminalSafePause({
      classification: inferredFailureClassification(),
      nextExactOperation:
        'Resume from this reconciled safe checkpoint and address the recorded technical blocker. Do not duplicate Candidate 6 or composition, do not stage without Opus approval, and do not begin Candidate 7 or C35.',
      blocker: error?.message || String(error),
    });
  } catch (pauseError) {
    terminalError = pauseError?.stack || String(pauseError);
  }
  console.error(JSON.stringify({
    unit: UNIT,
    error: error?.stack || String(error),
    terminal,
    terminalError,
  }, null, 2));
  process.exitCode = 1;
});
