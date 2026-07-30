// PHASE-10A14-R20 COMMIT 5R1-C34
// Additive checkpoint-57 Opus CLI recovery and finalization.
// This runner has no candidate, composition, or frozen-gate execution path.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C34';
const THIS_RUNNER = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(THIS_RUNNER), '../../..');
const RES = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const ATT = path.join(RES, 'attempts');
const REGISTRY = path.join(RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
const WAL = path.join(RES, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson');
const CHECKPOINT = path.join(RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT.json');
const CHECKPOINT_LOG = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson',
);
const CHECKPOINT_57 = path.join(
  RES,
  'COMMIT_5R1C34_RECOVERY_CHECKPOINT_57_four_hour_terminal_reconciliation.json',
);
const ROADMAP = path.join(
  REPO,
  'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
);
const CURRENT_STATE = path.join(REPO, 'knowledge/CURRENT_STATE.md');
const PROMPT = path.resolve(
  'C:/Projects/tina-execution-prompts/'
    + 'PHASE-10A14-R20-COMMIT-5R1-C34-TWO-HOUR-OPUS-RECOVERY-AND-FINALIZATION-FROM-CHECKPOINT-57.md',
);

const EXPECTED = Object.freeze({
  sessionStartedUtc: '2026-07-30T12:25:15.9159860Z',
  sessionHardStopUtc: '2026-07-30T14:25:15.9159860Z',
  head: '7c95019622d7174c8b1fd258b9a10137e59feb57',
  activeBase:
    '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  checkpoint57:
    '73f4484700c9985606849040e776afd968350a5cdff423f94cef3de62d874574',
  checkpoint57Event:
    'a283de89e1f9911e9a71dcc1f2c77bcfb11252a03d8a44739d67bea95683694d',
  checkpointLogThrough57:
    'c9caa644fd18fb7d005d9aabaf03fcbb78f5198616231808cdd53751aff01052',
  oldTerminal:
    'b659fcba624ad3103654096721469a9079d1bd8e37b272ebace8450128d07326',
  oldPreReviewManifest:
    '06e6466a781a3906307bf57b05e87619ef1adc59dd38fa34ce52cc24426529be',
  priorInvocation:
    '0248fc7b51a71b67159d5140663d2d7d7cbebe734d1f64b2d562369b147565ab',
  priorCapture:
    '675a282c92738b589b0bb7e4d181e0d1b5f42d184ca12b43fffea314a553ad9a',
  candidate6:
    'a749e62d3d11cd589450b6deadb6ebb61c5fd1b903589d16830ce52381a1c56d',
  composition:
    '4b31eee57e85818c786451c8c7fac13840e0fcedfe4878296fcb0294298e4327',
  frozen:
    '027f4f7fb0881d3caf3a20fc4c54e296647ed6f8222b3ed4bc2dd7a2fe421444',
  closure:
    '8ef654ca38d370fe68844afb4db3e6097c032f71c1f18b1b8c279b182c33ab5d',
  activeIdentity:
    '30eae37b9f9257048ff129ff18d94addfde9f8c6ffa37b252c18b65bc34d9232',
  registry:
    'b42e030f49c3e30959ad6043d2897af55029d268aaeea17cc37bfbe93c383e43',
  wal:
    '2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2',
  priorSchema:
    '10a328e79b179c6469cfd3a8a425e7ab3a035bfc2a1f36245310bcdabbc1dade',
  claudeVersion: '2.1.212',
  nativeClaude:
    'fe639693fd7e9a881c799867711abb7666dec2a5fefbaba41af6a09e71bcbefa',
  claudeShim:
    'b5f3d62824ffd02d9e9ca8786868f4d1233d78a68a199d8e91d3cd3a9a11b4f7',
  candidate6Attempt:
    'R20-domain_campaign-commit5r1c34-cp01-ord07-2026-07-30T05-56-19-881Z',
  compositionAttempt:
    'R20-domain_campaign-commit5r1c34-compose-ord01-2026-07-30T05-57-05-814Z',
});

const OLD = Object.freeze({
  terminal: path.join(RES, 'COMMIT_5R1C34_FOUR_HOUR_TERMINAL_STATE_FINAL.json'),
  preReviewManifest: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_PRE_REVIEW_EVIDENCE.sha256',
  ),
  invocation: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_OPUS_REVIEW_INVOCATION.json',
  ),
  capture: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_OPUS_REVIEW_CLI_CAPTURE.json',
  ),
  roadmapDraft: path.join(RES, 'COMMIT_5R1C34_FINAL_ROADMAP_V9_DRAFT.md'),
  roadmapDraftObserved: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_ROADMAP_V9_DRAFT_APPROVED_WITH_NONBLOCKING_OBSERVATIONS.md',
  ),
  currentDraft: path.join(RES, 'COMMIT_5R1C34_FINAL_CURRENT_STATE_DRAFT.md'),
  currentDraftObserved: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CURRENT_STATE_DRAFT_APPROVED_WITH_NONBLOCKING_OBSERVATIONS.md',
  ),
  roadmapStartingSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_ROADMAP_V9_STARTING_SNAPSHOT.md',
  ),
  currentStartingSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CURRENT_STATE_STARTING_SNAPSHOT.md',
  ),
  stagingDraft: path.join(RES, 'COMMIT_5R1C34_FINAL_STAGING_SET_DRAFT.json'),
});

const EVIDENCE = Object.freeze({
  candidate6: path.join(RES, 'COMMIT_5R1C34_CANDIDATE_6_CONTINUATION_RESULT.json'),
  composition: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CUMULATIVE_COMPOSITION.json',
  ),
  frozen: path.join(RES, 'COMMIT_5R1C34_FINAL_FROZEN_GATE_RESULT.json'),
  closure: path.join(RES, 'COMMIT_5R1C34_FINAL_CLOSURE_DECISION_DRAFT.json'),
  active: path.join(RES, 'COMMIT_5R1C34_FINAL_ACTIVE_BASE_IDENTITY.json'),
  residual: path.join(RES, 'COMMIT_5R1C34_FINAL_RESIDUAL_INVENTORY.json'),
  chain: path.join(RES, 'COMMIT_5R1C34_FINAL_ACCEPTED_RULE_CHAIN.json'),
  ledger: path.join(RES, 'COMMIT_5R1C34_FINAL_ATTEMPT_LEDGER.json'),
  registryWal: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_REGISTRY_WAL_RECONCILIATION.json',
  ),
  serviceIdentity: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_SERVICE_RUNTIME_IDENTITY.json',
  ),
});

const ART = Object.freeze({
  authorization: path.join(
    RES,
    'COMMIT_5R1C34_CHECKPOINT_57_CONTINUATION_AUTHORIZATION.json',
  ),
  continuity: path.join(
    RES,
    'COMMIT_5R1C34_CHECKPOINT_57_CONTINUITY_VALIDATION.json',
  ),
  rootCause: path.join(RES, 'COMMIT_5R1C34_OPUS_CLI_DEFECT_ROOT_CAUSE.json'),
  rootCauseMd: path.join(RES, 'COMMIT_5R1C34_OPUS_CLI_DEFECT_ROOT_CAUSE.md'),
  priorAdjudication: path.join(
    RES,
    'COMMIT_5R1C34_PRIOR_OPUS_INVOCATION_ADJUDICATION.json',
  ),
  remediation: path.join(
    RES,
    'COMMIT_5R1C34_OPUS_CLI_REMEDIATION_RESULT.json',
  ),
  preflight: path.join(
    RES,
    'COMMIT_5R1C34_OPUS_CLI_INVOCATION_PREFLIGHT.json',
  ),
  outputContract: path.join(
    RES,
    'COMMIT_5R1C34_OPUS_CLI_OUTPUT_CONTRACT_VALIDATION.json',
  ),
  roadmapDraft: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_ROADMAP_V9_CHECKPOINT_57_DRAFT.md',
  ),
  roadmapDraftObserved: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_ROADMAP_V9_CHECKPOINT_57_DRAFT_APPROVED_WITH_NONBLOCKING_OBSERVATIONS.md',
  ),
  currentDraft: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CURRENT_STATE_CHECKPOINT_57_DRAFT.md',
  ),
  currentDraftObserved: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_CURRENT_STATE_CHECKPOINT_57_DRAFT_APPROVED_WITH_NONBLOCKING_OBSERVATIONS.md',
  ),
  stagingDraft: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_STAGING_SET_CHECKPOINT_57_DRAFT.json',
  ),
  reviewRequest: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_OPUS_REVIEW_REQUEST_REPLACEMENT.md',
  ),
  reviewedInventory: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_REVIEWED_STATE_INVENTORY_REPLACEMENT.json',
  ),
  preReviewLogSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_CHECKPOINT_57_OPUS_REPLACEMENT_PRE_REVIEW_CHECKPOINT_LOG_SNAPSHOT.ndjson',
  ),
  preReviewManifest: path.join(
    RES,
    'COMMIT_5R1C34_CHECKPOINT_57_OPUS_REPLACEMENT_PRE_REVIEW_EVIDENCE.sha256',
  ),
  replacementInvocation: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_OPUS_REVIEW_INVOCATION_REPLACEMENT.json',
  ),
  replacementCapture: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_OPUS_REVIEW_CLI_CAPTURE_REPLACEMENT.json',
  ),
  reviewJson: path.join(RES, 'COMMIT_5R1C34_FINAL_OPUS_REVIEW.json'),
  reviewMd: path.join(RES, 'COMMIT_5R1C34_FINAL_OPUS_REVIEW.md'),
  finalLogSnapshot: path.join(
    RES,
    'COMMIT_5R1C34_FINAL_RECOVERY_CHECKPOINT_LOG_SNAPSHOT.ndjson',
  ),
  finalManifest: path.join(RES, 'COMMIT_5R1C34_FINAL_EVIDENCE.sha256'),
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
  terminal: path.join(
    RES,
    'COMMIT_5R1C34_TWO_HOUR_OPUS_RECOVERY_TERMINAL_STATE.json',
  ),
});

const STAGE_58 = 'checkpoint 57 Opus CLI remediation and replacement review package';
const STAGE_59_APPROVED = 'replacement Opus review approved documentation cutover';
const STAGE_TERMINAL = 'two-hour checkpoint-57 terminal reconciliation';
const COMMIT_MESSAGE =
  'PHASE-10A14-R20 COMMIT 5R1-C34 complete - preserve governed cumulative reason-layer evidence';

const sha = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');
const now = () => new Date().toISOString();
const requirePass = (condition, code) => {
  if (!condition) throw new Error(code);
};
const readJson = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const parseNdjson = (file) => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const rel = (file) => {
  const absolute = path.resolve(file).replace(/\\/g, '/');
  const root = REPO.replace(/\\/g, '/');
  return absolute.startsWith(`${root}/`) ? absolute.slice(root.length + 1) : absolute;
};
const hashRecord = (file) => {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), bytes: bytes.length, sha256: sha(bytes) };
};
const git = (...args) => execFileSync('git', args, {
  cwd: REPO,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 1024,
});

function writeOnceBuffer(file, bytes) {
  const absolute = path.resolve(file);
  const value = Buffer.from(bytes);
  if (fs.existsSync(absolute)) {
    requirePass(
      fs.readFileSync(absolute).equals(value),
      `C34_CP57_EXISTING_EVIDENCE_DIFFERS_${rel(absolute)}`,
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

function stableGeneratedJson(file, factory) {
  if (fs.existsSync(file)) return readJson(file);
  writeOnceJson(file, factory(now()));
  return readJson(file);
}

function writeMutableJson(file, value) {
  const temporary =
    `${path.resolve(file)}.c34-cp57-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  let exists = false;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    exists = true;
    fs.renameSync(temporary, path.resolve(file));
    exists = false;
  } finally {
    if (exists && fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
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

function checkpointPrefixSha(rows) {
  const lines = fs.readFileSync(CHECKPOINT_LOG, 'utf8')
    .split(/\r?\n/).filter(Boolean);
  requirePass(lines.length >= rows, `C34_CP57_LOG_SHORT_${lines.length}`);
  return sha(Buffer.from(`${lines.slice(0, rows).join('\n')}\n`));
}

function numberedCheckpointPath(ordinal, stage) {
  const safeStage = stage.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return path.join(
    RES,
    `COMMIT_5R1C34_RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_${safeStage}.json`,
  );
}

function appendCheckpoint({
  updatedAtUtc,
  stage,
  status,
  activeBaseHash = EXPECTED.activeBase,
  artifacts,
  nextExactOperation,
  blocker = null,
}) {
  for (const file of artifacts) {
    requirePass(fs.existsSync(file), `C34_CP57_CHECKPOINT_ARTIFACT_MISSING_${rel(file)}`);
  }
  const existing = parseNdjson(CHECKPOINT_LOG).filter((event) => event.stage === stage);
  requirePass(existing.length <= 1, `C34_CP57_DUPLICATE_CHECKPOINT_STAGE_${stage}`);
  if (existing.length === 1) {
    const event = existing[0];
    requirePass(
      event.updatedAtUtc === updatedAtUtc
        && event.status === status
        && event.activeBaseHash === activeBaseHash
        && event.activeAttemptId == null
        && event.nextExactOperation === nextExactOperation
        && event.safeToResume === true
        && event.blocker === blocker
        && event.artifactHashes.length === artifacts.length
        && event.artifactHashes.every(
          (record, index) =>
            JSON.stringify(record) === JSON.stringify(hashRecord(artifacts[index])),
        ),
      `C34_CP57_EXISTING_CHECKPOINT_DIFFERS_${event.ordinal}`,
    );
    return {
      event,
      numbered: numberedCheckpointPath(event.ordinal, stage),
      appended: false,
    };
  }
  const logBytes = fs.readFileSync(CHECKPOINT_LOG);
  const lines = logBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  const ordinal = lines.length + 1;
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal,
    commitUnit: UNIT,
    updatedAtUtc,
    stage,
    status,
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
  const numbered = numberedCheckpointPath(ordinal, stage);
  writeOnceJson(numbered, event);
  fs.appendFileSync(CHECKPOINT_LOG, `${JSON.stringify(event)}\n`);
  writeMutableJson(CHECKPOINT, event);
  return { event, numbered, appended: true };
}

function verifyManifest(file, expectedEntries = null) {
  const bytes = fs.readFileSync(file);
  const lines = bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  const seen = new Set();
  const duplicates = [];
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!match) return { line, pass: false, reason: 'FORMAT' };
    const target = path.isAbsolute(match[2])
      ? path.resolve(match[2])
      : path.resolve(REPO, match[2]);
    if (seen.has(match[2])) duplicates.push(match[2]);
    seen.add(match[2]);
    const exists = fs.existsSync(target);
    const actual = exists ? sha(fs.readFileSync(target)) : null;
    return {
      path: match[2],
      expectedSha256: match[1],
      actualSha256: actual,
      exists,
      pass: exists && actual === match[1],
    };
  });
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

function makeManifest(file, files) {
  const manifest = path.resolve(file);
  const unique = [...new Set(files.map((target) => path.resolve(target)))]
    .filter((target) => target !== manifest)
    .sort((first, second) => rel(first).localeCompare(rel(second)));
  for (const target of unique) {
    requirePass(fs.existsSync(target), `C34_CP57_MANIFEST_TARGET_MISSING_${rel(target)}`);
  }
  const lines = unique.map(
    (target) => `${sha(fs.readFileSync(target))}  ${rel(target)}`,
  );
  writeOnceBuffer(manifest, Buffer.from(`${lines.join('\n')}\n`));
  return verifyManifest(manifest);
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
  const roots = [...new Set([os.tmpdir(), 'C:/Temp'].map((root) => path.resolve(root)))];
  return roots.flatMap((root) => {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) =>
        entry.isDirectory() && prefixes.some((prefix) => entry.name.startsWith(prefix)))
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
      + 'listeners5173=$listeners} | ConvertTo-Json -Depth 6',
  ].join('; ');
  const result = spawnSync(
    powershell,
    ['-NoProfile', '-Command', script],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
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
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  return {
    branch: git('branch', '--show-current').trim(),
    head: git('rev-parse', 'HEAD').trim(),
    upstream: git('rev-parse', '@{upstream}').trim(),
    sync: git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').trim(),
    serviceDiff: git('diff', '--name-only', 'HEAD', '--', 'services').trim(),
    staged: git('diff', '--cached', '--name-only').trim(),
    trackedDiff: git('diff', '--name-only', 'HEAD').trim(),
    roadmapV7V8Diff: git(
      'diff',
      '--name-only',
      'HEAD',
      '--',
      'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
      'knowledge/TINA_Updated_Roadmap_v7.md',
    ).trim(),
    oracleDiff: git('diff', '--name-only', 'HEAD', '--', 'evaluation/oracles').trim(),
    indexLock: fs.existsSync(path.join(REPO, '.git', 'index.lock')),
    c35Items: status.split(/\r?\n/).filter((line) =>
      /5R1C35|commit5r1c35/i.test(line)),
    porcelainEntries: status.split(/\r?\n/).filter(Boolean).length,
  };
}

function statusPaths() {
  const output = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 },
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

function repositoryMutationSnapshot() {
  const rawStatus = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 },
  );
  const records = statusPaths().map((record) => {
    const target = path.resolve(REPO, record.path);
    return {
      ...record,
      exists: fs.existsSync(target),
      bytes: fs.existsSync(target) && fs.statSync(target).isFile()
        ? fs.statSync(target).size : null,
      sha256: fs.existsSync(target) && fs.statSync(target).isFile()
        ? sha(fs.readFileSync(target)) : null,
    };
  });
  return {
    head: git('rev-parse', 'HEAD').trim(),
    upstream: git('rev-parse', '@{upstream}').trim(),
    sync: git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').trim(),
    rawStatusSha256: sha(Buffer.from(rawStatus)),
    records,
  };
}

function exactAttemptState() {
  const registry = readJson(REGISTRY);
  const wal = parseNdjson(WAL);
  const directories = fs.readdirSync(ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name).sort();
  const c34 = registry.attempts.filter((attempt) =>
    attempt.attemptId?.includes('commit5r1c34-'));
  const c34Directories = directories.filter((name) => name.includes('commit5r1c34-'));
  return { registry, wal, directories, c34, c34Directories };
}

function verifyAnchoredEvidence() {
  const chain = validateCheckpointChain();
  const checkpoint57 = readJson(CHECKPOINT_57);
  const candidate6 = readJson(EVIDENCE.candidate6);
  const composition = readJson(EVIDENCE.composition);
  const frozen = readJson(EVIDENCE.frozen);
  const closure = readJson(EVIDENCE.closure);
  const active = readJson(EVIDENCE.active);
  const state = exactAttemptState();
  const oldManifest = verifyManifest(OLD.preReviewManifest, 476);
  const c6Records = state.c34.filter((attempt) =>
    attempt.attemptId === EXPECTED.candidate6Attempt);
  const c6Directories = state.c34Directories.filter((name) =>
    name === EXPECTED.candidate6Attempt);
  const c6Wal = state.wal.filter((row) =>
    row.attemptId === EXPECTED.candidate6Attempt);
  const compositionRecords = state.c34.filter((attempt) =>
    attempt.attemptId === EXPECTED.compositionAttempt);
  const compositionDirectories = state.c34Directories.filter((name) =>
    name === EXPECTED.compositionAttempt);
  const compositionWal = state.wal.filter((row) =>
    row.attemptId === EXPECTED.compositionAttempt);
  const allowedCycles = new Set([
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
  const unauthorized = state.c34.filter((attempt) => !allowedCycles.has(attempt.cycle));
  const evidenceHashes = {
    checkpoint57: sha(fs.readFileSync(CHECKPOINT_57)),
    oldTerminal: sha(fs.readFileSync(OLD.terminal)),
    oldPreReviewManifest: sha(fs.readFileSync(OLD.preReviewManifest)),
    priorInvocation: sha(fs.readFileSync(OLD.invocation)),
    priorCapture: sha(fs.readFileSync(OLD.capture)),
    candidate6: sha(fs.readFileSync(EVIDENCE.candidate6)),
    composition: sha(fs.readFileSync(EVIDENCE.composition)),
    frozen: sha(fs.readFileSync(EVIDENCE.frozen)),
    closure: sha(fs.readFileSync(EVIDENCE.closure)),
    activeIdentity: sha(fs.readFileSync(EVIDENCE.active)),
    registry: sha(fs.readFileSync(REGISTRY)),
    wal: sha(fs.readFileSync(WAL)),
  };
  const pass = chain.pass
    && chain.rows >= 57
    && checkpointPrefixSha(57) === EXPECTED.checkpointLogThrough57
    && checkpoint57.eventSha256 === EXPECTED.checkpoint57Event
    && checkpoint57.ordinal === 57
    && checkpoint57.safeToResume === true
    && checkpoint57.activeAttemptId == null
    && checkpoint57.activeBaseHash === EXPECTED.activeBase
    && JSON.stringify(evidenceHashes) === JSON.stringify({
      checkpoint57: EXPECTED.checkpoint57,
      oldTerminal: EXPECTED.oldTerminal,
      oldPreReviewManifest: EXPECTED.oldPreReviewManifest,
      priorInvocation: EXPECTED.priorInvocation,
      priorCapture: EXPECTED.priorCapture,
      candidate6: EXPECTED.candidate6,
      composition: EXPECTED.composition,
      frozen: EXPECTED.frozen,
      closure: EXPECTED.closure,
      activeIdentity: EXPECTED.activeIdentity,
      registry: EXPECTED.registry,
      wal: EXPECTED.wal,
    })
    && oldManifest.pass
    && oldManifest.manifest.sha256 === EXPECTED.oldPreReviewManifest
    && candidate6.attemptId === EXPECTED.candidate6Attempt
    && candidate6.status === 'completed'
    && candidate6.accepted === false
    && candidate6.disposition === 'REJECTED_FEATUREABLATIONPASS_PRECEDENCEPASS'
    && candidate6.metricDelta.reasonPassed === 0
    && candidate6.metricDelta.reasonMismatches === 0
    && candidate6.metricDelta.decisionPassed === 0
    && candidate6.metricDelta.relationPassed === 0
    && candidate6.pass === true
    && c6Records.length === 1
    && c6Directories.length === 1
    && c6Wal.length === 3
    && composition.attemptId === EXPECTED.compositionAttempt
    && composition.disposition === 'ACCEPTED_CUMULATIVE_ORDER_INDEPENDENT'
    && composition.pass === true
    && compositionRecords.length === 1
    && compositionDirectories.length === 1
    && compositionWal.length === 3
    && frozen.pass === true
    && closure.pass === true
    && closure.phase10AStatus === 'OPEN'
    && closure.r20Status === 'IN_PROGRESS'
    && (active.identity?.servicesTreeDigest || active.servicesTreeDigest)
      === EXPECTED.activeBase
    && state.registry.attempts.length === 228
    && state.c34.length === 10
    && state.wal.length === 32
    && state.c34Directories.length === 10
    && state.registry.summary.orphan === 0
    && state.registry.summary.dangling === 0
    && state.registry.summary.c34RunningAttemptIds.length === 0
    && unauthorized.length === 0;
  return {
    chain,
    checkpoint57,
    candidate6,
    composition,
    frozen,
    closure,
    active,
    state,
    oldManifest,
    evidenceHashes,
    candidate6ExactOnce: {
      registryRecords: c6Records.length,
      directories: c6Directories.length,
      walRows: c6Wal.length,
    },
    compositionExactOnce: {
      registryRecords: compositionRecords.length,
      directories: compositionDirectories.length,
      walRows: compositionWal.length,
    },
    unauthorizedAttemptIds: unauthorized.map((attempt) => attempt.attemptId),
    pass,
  };
}

function requireEnvironmentClean({ allowCommittedHead = false } = {}) {
  const processes = processState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const status = gitState();
  requirePass(
    processes.inspectionSucceeded
      && processes.activeC34.length === 0
      && processes.unreadable.length === 0
      && processes.listeners5173.length === 0
      && temporary.length === 0
      && locks.length === 0
      && !status.indexLock
      && status.serviceDiff === ''
      && status.staged === ''
      && status.roadmapV7V8Diff === ''
      && status.oracleDiff === ''
      && status.c35Items.length === 0
      && (allowCommittedHead || (
        status.head === EXPECTED.head
        && status.upstream === EXPECTED.head
        && status.sync === '0\t0'
      )),
    'C34_CP57_ENVIRONMENT_NOT_CLEAN',
  );
  return { processes, temporary, locks, status };
}

function elapsedMilliseconds() {
  return Date.now() - Date.parse(EXPECTED.sessionStartedUtc);
}

function requireBudget(operation, minimumRemainingMilliseconds = 5 * 60 * 1000) {
  const remainingMilliseconds =
    Date.parse(EXPECTED.sessionHardStopUtc) - Date.now();
  requirePass(
    remainingMilliseconds >= minimumRemainingMilliseconds,
    `C34_CP57_TIME_BUDGET_INSUFFICIENT_${operation.replace(/\W+/g, '_')}`,
  );
  return {
    operation,
    checkedUtc: now(),
    elapsedMilliseconds: elapsedMilliseconds(),
    remainingMilliseconds,
    sessionStartedUtc: EXPECTED.sessionStartedUtc,
    sessionHardStopUtc: EXPECTED.sessionHardStopUtc,
  };
}

const REVIEW_KEYS = Object.freeze([
  'checkpoint57Continuity',
  'priorInvocationTechnicalIncomplete',
  'cliRemediationPass',
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
      required: REVIEW_KEYS,
      properties: Object.fromEntries(
        REVIEW_KEYS.map((key) => [key, { type: 'boolean' }]),
      ),
    },
    blockingFindings: { type: 'array', items: { type: 'string' } },
    nonblockingObservations: { type: 'array', items: { type: 'string' } },
    commitSafe: { type: 'boolean' },
  },
});

function nativeClaudePath() {
  const shim = path.resolve(
    'C:/Users/USER/AppData/Roaming/npm/claude.ps1',
  );
  const native = path.resolve(
    'C:/Users/USER/AppData/Roaming/npm/node_modules/'
      + '@anthropic-ai/claude-code/bin/claude.exe',
  );
  requirePass(fs.existsSync(shim) && fs.existsSync(native), 'C34_CP57_CLAUDE_PATH_MISSING');
  return { shim, native };
}

function expectedReviewArgv(reviewedStateDigest) {
  return [
    '-p',
    replacementReviewPrompt(reviewedStateDigest),
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

function forensicTransportProbe(priorArgv, proposedArgv) {
  const { shim, native } = nativeClaudePath();
  const probeRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tina-c34-review-cli-probe-'),
  );
  requirePass(
    path.resolve(probeRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)
      && path.basename(probeRoot).startsWith('tina-c34-review-cli-probe-'),
    'C34_CP57_PROBE_TEMP_OWNERSHIP_INVALID',
  );
  const dumpJs = path.join(probeRoot, 'argv-dump.js');
  const forwardPs1 = path.join(probeRoot, 'forward.ps1');
  const powershell = 'C:/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe';
  try {
    fs.writeFileSync(
      dumpJs,
      "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n",
      { flag: 'wx' },
    );
    fs.writeFileSync(
      forwardPs1,
      `$node=(Get-Command node.exe -ErrorAction Stop).Source\n`
        + `& $node '${dumpJs.replace(/'/g, "''")}' $args\n`
        + 'exit $LASTEXITCODE\n',
      { flag: 'wx' },
    );
    const priorSchemaIndex = priorArgv.indexOf('--json-schema');
    const priorSchema = priorArgv[priorSchemaIndex + 1];
    const forwarded = spawnSync(
      powershell,
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        forwardPs1,
        '--json-schema',
        priorSchema,
      ],
      { cwd: REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );
    const forwardedArgs = JSON.parse(forwarded.stdout || '[]');
    const direct = spawnSync(
      process.execPath,
      [dumpJs, ...proposedArgv],
      { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const directArgs = JSON.parse(direct.stdout || '[]');
    const newSchemaIndex = proposedArgv.indexOf('--json-schema');
    const parserNegativeControl = spawnSync(
      native,
      [
        '--json-schema',
        proposedArgv[newSchemaIndex + 1],
        '--permission-mode',
        '__C34_INTENTIONAL_INVALID_PROBE__',
        '-p',
        'NO_MODEL_CALL_EXPECTED',
      ],
      {
        cwd: REPO,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30 * 1000,
      },
    );
    return {
      priorSchema: {
        expectedLength: priorSchema.length,
        expectedSha256: sha(Buffer.from(priorSchema)),
        expectedJsonValid: (() => {
          try {
            JSON.parse(priorSchema);
            return true;
          } catch {
            return false;
          }
        })(),
        powerShellForwardedLength: forwardedArgs[1]?.length ?? null,
        powerShellForwardedSha256:
          typeof forwardedArgs[1] === 'string'
            ? sha(Buffer.from(forwardedArgs[1])) : null,
        powerShellForwardedJsonValid: (() => {
          try {
            JSON.parse(forwardedArgs[1]);
            return true;
          } catch {
            return false;
          }
        })(),
        powerShellRemovedEmbeddedQuotes:
          typeof forwardedArgs[1] === 'string'
          && !forwardedArgs[1].includes('"')
          && priorSchema.includes('"'),
      },
      directTransport: {
        expectedArgc: proposedArgv.length,
        actualArgc: directArgs.length,
        exactArgvRoundTrip:
          JSON.stringify(directArgs) === JSON.stringify(proposedArgv),
      },
      nativeParserNegativeControl: {
        exitCode: parserNegativeControl.status,
        signal: parserNegativeControl.signal,
        stderr: parserNegativeControl.stderr || '',
        schemaRejected: /json-schema is not valid JSON/i.test(
          `${parserNegativeControl.stdout || ''}${parserNegativeControl.stderr || ''}`,
        ),
        intentionalLaterOptionGateReached:
          /permission-mode/i.test(parserNegativeControl.stderr || '')
          && /invalid/i.test(parserNegativeControl.stderr || ''),
      },
      launcher: {
        shim: hashRecord(shim),
        native: hashRecord(native),
      },
      pass: forwarded.status === 0
        && forwardedArgs[0] === '--json-schema'
        && forwardedArgs[1] !== priorSchema
        && !(() => {
          try {
            JSON.parse(forwardedArgs[1]);
            return true;
          } catch {
            return false;
          }
        })()
        && direct.status === 0
        && JSON.stringify(directArgs) === JSON.stringify(proposedArgv)
        && parserNegativeControl.status === 1
        && !/json-schema is not valid JSON/i.test(
          `${parserNegativeControl.stdout || ''}${parserNegativeControl.stderr || ''}`,
        )
        && /permission-mode/i.test(parserNegativeControl.stderr || ''),
    };
  } finally {
    const resolved = path.resolve(probeRoot);
    requirePass(
      resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)
        && path.basename(resolved).startsWith('tina-c34-review-cli-probe-'),
      'C34_CP57_PROBE_TEMP_CLEANUP_REFUSED',
    );
    fs.rmSync(resolved, { recursive: true, force: false });
  }
}

function reviewedDocumentVariant(source, decision, type) {
  let text = fs.readFileSync(source, 'utf8');
  const priorLine =
    '- Prior mandatory Opus invocation at checkpoint **57**: '
    + '**TECHNICAL_INCOMPLETE_REVIEW_INVOCATION**; Claude Code 2.1.212 rejected '
    + 'the PowerShell-forwarded `--json-schema` before evidence review; '
    + '**NOT_A_REVIEW_REJECTION**, no decision, no approval.';
  const sequenceLine =
    '- Checkpoint sequence: frozen C34 closure **55**; original review package '
    + '**56**; technical-incomplete pause **57**; CLI remediation/replacement '
    + 'package **58**; governed replacement approval cutover **59**; terminal '
    + 'reconciliation **60**.';
  const replacementLine =
    `- Governed replacement independent reviewer: Claude Code Opus 4.8, `
    + `read-only, explicit decision **${decision}**.`;
  const candidateClarification =
    '- Candidate 6 trial result reached reason 3576/3,720 in isolation, but the '
    + 'candidate was semantically rejected; the accepted controlling result '
    + 'remains 3575/3,720 and its controlling metric delta is zero.';
  if (type === 'roadmap') {
    requirePass(
      /^- Independent final reviewer:.*$/m.test(text),
      'C34_CP57_ROADMAP_REVIEW_LINE_MISSING',
    );
    text = text.replace(
      /^- Independent final reviewer:.*$/m,
      `${priorLine}\n${sequenceLine}\n${candidateClarification}\n${replacementLine}`,
    );
  } else {
    requirePass(
      /^- Mandatory independent reviewer:.*$/m.test(text),
      'C34_CP57_CURRENT_REVIEW_LINE_MISSING',
    );
    text = text.replace(
      /^- Mandatory independent reviewer:.*$/m,
      `${priorLine}\n${sequenceLine}\n${candidateClarification}\n${replacementLine}`,
    );
  }
  return text;
}

function authorizedStagePath(file) {
  const normalized = file.replace(/\\/g, '/');
  const excluded = new Set([
    rel(CHECKPOINT),
    rel(CHECKPOINT_LOG),
    rel(ART.gitVerification),
    rel(ART.remoteVerification),
    rel(ART.terminal),
    rel(numberedCheckpointPath(60, STAGE_TERMINAL)),
  ]);
  if (excluded.has(normalized)) return false;
  return normalized === rel(REGISTRY)
    || normalized === rel(ROADMAP)
    || normalized === rel(CURRENT_STATE)
    || /^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C34_/.test(normalized)
    || /^evaluation\/results\/phase-10a14-r20\/attempts\/[^/]*commit5r1c34-/.test(
      normalized,
    )
    || /^evaluation\/runner\/phase-10a14-r20\/commit5r1c34-/.test(normalized);
}

function indexBlobBinding(source, targetPath = rel(source)) {
  const sourcePath = rel(source);
  const target = targetPath.replace(/\\/g, '/');
  const bytes = fs.readFileSync(path.resolve(REPO, sourcePath));
  const rawGitBlob = git('hash-object', '--no-filters', '--', sourcePath).trim();
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
      rawGitBlob === expectedIndexBlob
        ? 'NONE' : 'RECORDED_GIT_CLEAN_FILTER_TRANSFORM',
  };
}

function proposedStagingDraft(generatedUtc) {
  const current = statusPaths()
    .filter((record) => authorizedStagePath(record.path))
    .map((record) => record.path);
  const future = [
    rel(numberedCheckpointPath(58, STAGE_58)),
    rel(numberedCheckpointPath(59, STAGE_59_APPROVED)),
    rel(ART.stagingDraft),
    rel(ART.reviewRequest),
    rel(ART.reviewedInventory),
    rel(ART.preReviewLogSnapshot),
    rel(ART.preReviewManifest),
    rel(ART.replacementInvocation),
    rel(ART.replacementCapture),
    rel(ART.reviewJson),
    rel(ART.reviewMd),
    rel(ART.finalLogSnapshot),
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
      currentState: indexBlobBinding(ART.currentDraft, rel(CURRENT_STATE)),
    },
    APPROVED_WITH_NONBLOCKING_OBSERVATIONS: {
      roadmapV9: indexBlobBinding(ART.roadmapDraftObserved, rel(ROADMAP)),
      currentState: indexBlobBinding(ART.currentDraftObserved, rel(CURRENT_STATE)),
    },
  };
  const existingPathBindings = Object.fromEntries(paths
    .filter((file) =>
      file !== rel(ROADMAP)
      && file !== rel(CURRENT_STATE)
      && fs.existsSync(path.resolve(REPO, file)))
    .map((file) => [file, indexBlobBinding(file, file)]));
  return {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    supersedes: hashRecord(OLD.stagingDraft),
    policy: 'explicit file-by-file staging only; git add . and git add -A forbidden',
    paths,
    pathCount: paths.length,
    existingPathBindings,
    documentationTargetBindings,
    futureWriteOncePaths: future.filter((file) => !fs.existsSync(path.resolve(REPO, file))),
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
      rel(ART.terminal),
      rel(numberedCheckpointPath(60, STAGE_TERMINAL)),
      rel(CHECKPOINT),
      rel(CHECKPOINT_LOG),
    ],
    proposedCommitMessage: COMMIT_MESSAGE,
    pass: paths.length > 0
      && paths.every(authorizedStagePath)
      && !paths.some((item) =>
        /^\.claude\/|^\.vscode\/|^evaluation\/factcheck\/|5R1C35|commit5r1c35/i
          .test(item)),
  };
}

function replacementReviewRequestText() {
  return `# PHASE-10A14-R20 COMMIT 5R1-C34 replacement independent review

This is the exactly-one governed replacement review authorized from checkpoint
57. The prior Claude Code invocation was TECHNICAL_INCOMPLETE_REVIEW_INVOCATION:
PowerShell 5.1 stripped JSON-schema quotes before the native CLI parsed them.
No prior evidence review or decision occurred. It was not a rejection.

Operate read-only. Do not edit, create, delete, stage, commit, push, start a
service, or change runtime state. Review the exact replacement pre-review
manifest and the immutable 476-entry original pre-review manifest it binds.

Verify checkpoint-57 continuity; Candidates 1-5 and both technical originals;
Candidate 6 exact-once semantic rejection with zero controlling metric delta;
the accepted chain; cumulative composition; all frozen gates; active-base
identity; residuals; registry/WAL/ledger; the CLI adjudication and direct-native
repair; both new decision-matching document drafts; final-manifest definition;
the exact proposed staging set and commit message; absence of Candidate 7/C35;
and Phase 10A OPEN / R20 IN PROGRESS wording.

Required recovery entry points:

- ${rel(CHECKPOINT_57)}
- ${rel(OLD.terminal)}
- ${rel(OLD.invocation)}
- ${rel(OLD.capture)}
- ${rel(OLD.preReviewManifest)}
- ${rel(ART.continuity)}
- ${rel(ART.rootCause)}
- ${rel(ART.priorAdjudication)}
- ${rel(ART.remediation)}
- ${rel(ART.preflight)}
- ${rel(ART.outputContract)}
- ${rel(EVIDENCE.candidate6)}
- ${rel(EVIDENCE.composition)}
- ${rel(EVIDENCE.frozen)}
- ${rel(EVIDENCE.closure)}
- ${rel(EVIDENCE.active)}
- ${rel(EVIDENCE.residual)}
- ${rel(EVIDENCE.ledger)}
- ${rel(EVIDENCE.registryWal)}
- ${rel(ART.roadmapDraft)}
- ${rel(ART.roadmapDraftObserved)}
- ${rel(ART.currentDraft)}
- ${rel(ART.currentDraftObserved)}
- ${rel(ART.stagingDraft)}
- ${rel(ART.reviewedInventory)}
- ${rel(ART.preReviewLogSnapshot)}

Return only the JSON object required by the supplied schema. APPROVED or
APPROVED_WITH_NONBLOCKING_OBSERVATIONS is valid only when every verification
field is true, blockingFindings is empty, and commitSafe is true. Use REJECTED
for a proven blocking defect and INCOMPLETE_REVIEW if evidence/tooling is
insufficient. Do not infer Phase 10A closure from C34 terminality.
`;
}

function replacementReviewPrompt(reviewedStateDigest) {
  const request = fs.existsSync(ART.reviewRequest)
    ? fs.readFileSync(ART.reviewRequest, 'utf8')
    : replacementReviewRequestText();
  return `${request}

## Exact reviewed-state binding

The lowercase SHA-256 of the exact replacement pre-review evidence manifest
bytes is:

\`${reviewedStateDigest}\`

Bind the decision to that exact digest. The replacement invocation marker is
${rel(ART.replacementInvocation)}. Return only schema-conforming structured
output with one exact decision token.
`;
}

function prepareRecovery() {
  const budget = requireBudget('prepare_checkpoint57_recovery');
  const existing58 = parseNdjson(CHECKPOINT_LOG)
    .find((event) => event.stage === STAGE_58);
  if (existing58) {
    requirePass(
      fs.existsSync(ART.preReviewManifest)
        && verifyManifest(ART.preReviewManifest).pass
        && readJson(ART.preflight).status === 'PASS_READY_FOR_REPLACEMENT_OPUS_REVIEW',
      'C34_CP57_EXISTING_PREPARATION_INVALID',
    );
    return {
      budget,
      checkpoint: existing58,
      prepared: false,
      reviewedStateDigest: sha(fs.readFileSync(ART.preReviewManifest)),
    };
  }
  const anchored = verifyAnchoredEvidence();
  requirePass(anchored.pass, 'CHECKPOINT_57_CONTINUITY_MISMATCH');
  const environment = requireEnvironmentClean();
  requirePass(
    validateCheckpointChain().rows === 57
      && !fs.existsSync(ART.replacementInvocation)
      && !fs.existsSync(ART.replacementCapture)
      && !fs.existsSync(ART.reviewJson)
      && !fs.existsSync(ART.finalManifest)
      && !fs.existsSync(ART.terminal),
    'C34_CP57_REPLACEMENT_NON_DUPLICATION_FAILED',
  );

  const continuity = stableGeneratedJson(ART.continuity, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: 'CHECKPOINT_57_CONTINUITY_PASS',
    checkpoint57: hashRecord(CHECKPOINT_57),
    checkpoint57EventSha256: EXPECTED.checkpoint57Event,
    checkpointLogThrough57Sha256: EXPECTED.checkpointLogThrough57,
    oldTerminal: hashRecord(OLD.terminal),
    oldPreReviewManifest: anchored.oldManifest.manifest,
    oldPreReviewEntries: anchored.oldManifest.entries,
    candidate6: hashRecord(EVIDENCE.candidate6),
    candidate6ExactOnce: anchored.candidate6ExactOnce,
    candidate6Disposition: anchored.candidate6.disposition,
    candidate6MetricDelta: anchored.candidate6.metricDelta,
    composition: hashRecord(EVIDENCE.composition),
    compositionExactOnce: anchored.compositionExactOnce,
    compositionDisposition: anchored.composition.disposition,
    frozen: hashRecord(EVIDENCE.frozen),
    closure: hashRecord(EVIDENCE.closure),
    activeBaseHash: EXPECTED.activeBase,
    metrics: {
      reasonPassed: 3575,
      reasonTotal: 3720,
      reasonMismatches: 145,
      decisionPassed: 3720,
      relationPassed: 3720,
    },
    ledger: {
      registryAttempts: anchored.state.registry.attempts.length,
      c34Attempts: anchored.state.c34.length,
      walRows: anchored.state.wal.length,
      c34Directories: anchored.state.c34Directories.length,
      orphan: anchored.state.registry.summary.orphan,
      dangling: anchored.state.registry.summary.dangling,
      running: anchored.state.registry.summary.c34RunningAttemptIds,
    },
    environment,
    candidate7Authorized: false,
    c35Authorized: false,
    pass: true,
  }));

  const priorInvocation = readJson(OLD.invocation);
  const priorCapture = readJson(OLD.capture);
  const priorSchemaIndex = priorInvocation.argv.indexOf('--json-schema');
  const priorSchema = priorInvocation.argv[priorSchemaIndex + 1];
  const proposedProbeArgv = expectedReviewArgv('0'.repeat(64));
  const transport = forensicTransportProbe(priorInvocation.argv, proposedProbeArgv);
  const { shim, native } = nativeClaudePath();
  const version = spawnSync(native, ['--version'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const help = spawnSync(native, ['--help'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  requirePass(
    transport.pass
      && sha(Buffer.from(priorSchema)) === EXPECTED.priorSchema
      && JSON.parse(priorSchema)
      && priorCapture.exitCode === 1
      && priorCapture.rawStdout === ''
      && /--json-schema is not valid JSON/i.test(priorCapture.stderr)
      && /Expected '\}'/.test(priorCapture.stderr)
      && version.status === 0
      && (version.stdout || '').trim().startsWith(EXPECTED.claudeVersion)
      && help.status === 0
      && /--json-schema <schema>/.test(help.stdout || '')
      && sha(fs.readFileSync(native)) === EXPECTED.nativeClaude
      && sha(fs.readFileSync(shim)) === EXPECTED.claudeShim,
    'C34_CP57_CLI_FORENSICS_FAILED',
  );

  const rootCause = stableGeneratedJson(ART.rootCause, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: 'OPUS_CLI_INVOCATION_TRANSPORT_DEFECT',
    priorInvocation: hashRecord(OLD.invocation),
    priorCapture: hashRecord(OLD.capture),
    claudeVersion: (version.stdout || '').trim(),
    intendedSchema: {
      bytes: Buffer.byteLength(priorSchema),
      characters: priorSchema.length,
      sha256: sha(Buffer.from(priorSchema)),
      jsonValid: true,
      bomPresent: priorSchema.charCodeAt(0) === 0xFEFF,
      newlinePresent: /[\r\n]/.test(priorSchema),
    },
    authoritativeLocalHelp: {
      nativeExecutable: hashRecord(native),
      helpSha256: sha(Buffer.from(help.stdout || '')),
      jsonSchemaOptionPresent: /--json-schema <schema>/.test(help.stdout || ''),
    },
    transport,
    ruledOut: {
      invalidSourceJson: true,
      bomOrEncoding: true,
      pathQuoting: true,
      unsupportedOption: true,
      cliVersionIncompatibility: true,
      commandLengthOverflow: true,
    },
    rootCause:
      'Windows PowerShell 5.1 received the correct JSON argument at the -File script boundary, but the npm claude.ps1 shim expanded $args into native claude.exe. That second PowerShell-to-native boundary removed embedded double quotes, converting valid JSON into an invalid object-like token before evidence review.',
    repair:
      'Spawn the verified native claude.exe directly from Node with an argv array and shell=false. Do not invoke powershell.exe, claude.ps1, claude.cmd, or a shell-joined command.',
    pass: true,
  }));
  writeOnceBuffer(
    ART.rootCauseMd,
    Buffer.from(`# C34 checkpoint-57 Opus CLI defect root cause

- Classification: **OPUS_CLI_INVOCATION_TRANSPORT_DEFECT**
- Prior disposition: **TECHNICAL_INCOMPLETE_REVIEW_INVOCATION**
- Source schema: valid JSON, ${rootCause.intendedSchema.characters} characters,
  SHA-256 \`${rootCause.intendedSchema.sha256}\`
- Failing boundary: Windows PowerShell 5.1 \`claude.ps1\` \`$args\` forwarding
  into native \`claude.exe\`
- Observed mutation: embedded JSON double quotes removed before native parsing
- Repair: direct Node \`spawnSync(nativeClaudeExe, argv, { shell: false })\`
- Semantic disposition: **NOT_A_REVIEW_REJECTION / NO_DECISION / NO_APPROVAL**
`),
  );
  const priorAdjudication = stableGeneratedJson(
    ART.priorAdjudication,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      classification: 'TECHNICAL_INCOMPLETE_REVIEW_INVOCATION',
      priorInvocation: hashRecord(OLD.invocation),
      priorCapture: hashRecord(OLD.capture),
      exitCode: priorCapture.exitCode,
      stdoutBytes: Buffer.byteLength(priorCapture.rawStdout),
      stderr: priorCapture.stderr,
      evidenceReviewPerformed: false,
      decisionReturned: false,
      approvalReturned: false,
      semanticDisposition: 'NOT_A_REVIEW_REJECTION',
      priorPromptInvocationConsumed: true,
      replacementAuthorizedOnlyByCheckpoint57Prompt: true,
      priorArtifactsPreservedUnchanged: true,
      pass: true,
    }),
  );
  const remediation = stableGeneratedJson(ART.remediation, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: 'OPUS_CLI_DIRECT_NATIVE_TRANSPORT_REMEDIATED',
    rootCause: hashRecord(ART.rootCause),
    oldTransport: {
      executable: 'powershell.exe',
      intermediateLauncher: hashRecord(shim),
      shellBoundaryCount: 2,
      safe: false,
    },
    newTransport: {
      executable: hashRecord(native),
      caller: 'Node child_process.spawnSync',
      argvArray: true,
      shell: false,
      shellBoundaryCount: 0,
      fullArgvRoundTrip: transport.directTransport,
      parserNegativeControl: transport.nativeParserNegativeControl,
      safe: true,
    },
    runtimeModified: false,
    candidateEvidenceModified: false,
    compositionModified: false,
    frozenEvidenceModified: false,
    oldReviewArtifactsModified: false,
    pass: true,
  }));
  const outputContract = stableGeneratedJson(
    ART.outputContract,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      classification: 'STRUCTURED_OUTPUT_CONTRACT_VALIDATED',
      allowedDecisionTokens:
        REVIEW_SCHEMA.properties.decision.enum,
      exactDecisionRequired: true,
      narrativeApprovalInferenceForbidden: true,
      schema: REVIEW_SCHEMA,
      schemaSha256: sha(Buffer.from(JSON.stringify(REVIEW_SCHEMA))),
      schemaParsesLocally: JSON.parse(JSON.stringify(REVIEW_SCHEMA)) != null,
      envelopeRequirements: {
        type: 'result',
        subtype: 'success',
        isError: false,
        permissionDenials: 0,
        structuredOutputRequired: true,
      },
      failureHandling:
        'Any timeout, nonzero exit, schema failure, missing token, invalid binding, REJECTED, or INCOMPLETE_REVIEW stops without staging/commit/push and consumes the replacement invocation.',
      pass: true,
    }),
  );
  const commandCharacters = proposedProbeArgv
    .reduce((sum, argument) => sum + argument.length + 3, native.length);
  const preflight = stableGeneratedJson(ART.preflight, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    status: 'PASS_READY_FOR_REPLACEMENT_OPUS_REVIEW',
    continuity: hashRecord(ART.continuity),
    priorAdjudication: hashRecord(ART.priorAdjudication),
    rootCause: hashRecord(ART.rootCause),
    remediation: hashRecord(ART.remediation),
    outputContract: hashRecord(ART.outputContract),
    nativeExecutable: hashRecord(native),
    claudeVersion: (version.stdout || '').trim(),
    directArgvRoundTrip: transport.directTransport,
    parserNegativeControl: transport.nativeParserNegativeControl,
    proposedArgv: proposedProbeArgv,
    proposedArgvBindings: proposedProbeArgv.map((argument, index) => ({
      index,
      characters: argument.length,
      bytes: Buffer.byteLength(argument),
      sha256: sha(Buffer.from(argument)),
    })),
    commandCharacters,
    commandLengthBelowWindowsLimit: commandCharacters < 30000,
    utf8: true,
    directNativeNoShell: true,
    readOnlyMode: 'plan',
    safeMode: true,
    noSessionPersistence: true,
    timeoutCapture: true,
    stdoutStderrExitCapture: true,
    explicitDecisionCapture: true,
    repositoryMutationSnapshotRequired: true,
    replacementInvocationArtifactsAbsent: true,
    environment,
    pass: commandCharacters < 30000
      && transport.pass
      && temporaryRuntimeDirectories().length === 0,
  }));
  requirePass(
    preflight.pass
      && preflight.status === 'PASS_READY_FOR_REPLACEMENT_OPUS_REVIEW',
    'C34_CP57_PREFLIGHT_NOT_READY',
  );
  const authorization = stableGeneratedJson(ART.authorization, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    sessionStartedUtc: EXPECTED.sessionStartedUtc,
    sessionHardStopUtc: EXPECTED.sessionHardStopUtc,
    sourcePrompt: hashRecord(PROMPT),
    startingCheckpoint: hashRecord(CHECKPOINT_57),
    priorInvocationAdjudication: hashRecord(ART.priorAdjudication),
    exactlyOneReplacementOpusReviewAuthorized: true,
    candidateExecutionAuthorized: false,
    compositionExecutionAuthorized: false,
    frozenGateExecutionAuthorized: false,
    candidate7Authorized: false,
    c35Authorized: false,
    stagingAuthorizedBeforeApproval: false,
    commitAuthorizedBeforeApproval: false,
    activeBaseHash: EXPECTED.activeBase,
    pass: true,
  }));

  writeOnceBuffer(
    ART.roadmapDraft,
    Buffer.from(reviewedDocumentVariant(OLD.roadmapDraft, 'APPROVED', 'roadmap')),
  );
  writeOnceBuffer(
    ART.roadmapDraftObserved,
    Buffer.from(reviewedDocumentVariant(
      OLD.roadmapDraftObserved,
      'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
      'roadmap',
    )),
  );
  writeOnceBuffer(
    ART.currentDraft,
    Buffer.from(reviewedDocumentVariant(OLD.currentDraft, 'APPROVED', 'current')),
  );
  writeOnceBuffer(
    ART.currentDraftObserved,
    Buffer.from(reviewedDocumentVariant(
      OLD.currentDraftObserved,
      'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
      'current',
    )),
  );
  writeOnceBuffer(ART.reviewRequest, Buffer.from(replacementReviewRequestText()));
  const stagingDraft = proposedStagingDraft(preflight.generatedUtc);
  writeOnceJson(ART.stagingDraft, stagingDraft);
  requirePass(stagingDraft.pass, 'C34_CP57_STAGING_DRAFT_INVALID');
  const reviewedInventory = stableGeneratedJson(
    ART.reviewedInventory,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      reviewedCommit: EXPECTED.head,
      replacementReviewedStateDigestDefinition:
        'lowercase SHA-256 of the exact checkpoint-57 replacement pre-review manifest bytes',
      semanticBaseManifest: hashRecord(OLD.preReviewManifest),
      checkpoint57: hashRecord(CHECKPOINT_57),
      oldTerminal: hashRecord(OLD.terminal),
      priorInvocation: hashRecord(OLD.invocation),
      priorCapture: hashRecord(OLD.capture),
      continuity: hashRecord(ART.continuity),
      cliRootCause: hashRecord(ART.rootCause),
      priorAdjudication: hashRecord(ART.priorAdjudication),
      remediation: hashRecord(ART.remediation),
      preflight: hashRecord(ART.preflight),
      outputContract: hashRecord(ART.outputContract),
      candidate6: hashRecord(EVIDENCE.candidate6),
      composition: hashRecord(EVIDENCE.composition),
      frozen: hashRecord(EVIDENCE.frozen),
      closure: hashRecord(EVIDENCE.closure),
      activeBase: hashRecord(EVIDENCE.active),
      documentVariants: {
        APPROVED: {
          roadmap: hashRecord(ART.roadmapDraft),
          currentState: hashRecord(ART.currentDraft),
        },
        APPROVED_WITH_NONBLOCKING_OBSERVATIONS: {
          roadmap: hashRecord(ART.roadmapDraftObserved),
          currentState: hashRecord(ART.currentDraftObserved),
        },
      },
      stagingDraft: hashRecord(ART.stagingDraft),
      reviewRequest: hashRecord(ART.reviewRequest),
      proposedCommitMessage: COMMIT_MESSAGE,
      finalManifestDefinition:
        'self-excluding exact commit evidence manifest generated only after decision-matching reviewed documentation installation; validation and commit-contents are separately staged; live checkpoint/log, terminal, and post-commit Git/remote attestations are external',
      pass: true,
    }),
  );
  const cp58 = appendCheckpoint({
    updatedAtUtc: preflight.generatedUtc,
    stage: STAGE_58,
    status: 'PASS_READY_FOR_REPLACEMENT_OPUS_REVIEW',
    artifacts: [
      ART.authorization,
      ART.continuity,
      ART.rootCause,
      ART.rootCauseMd,
      ART.priorAdjudication,
      ART.remediation,
      ART.preflight,
      ART.outputContract,
      ART.stagingDraft,
      ART.reviewRequest,
      ART.reviewedInventory,
      OLD.invocation,
      OLD.capture,
    ],
    nextExactOperation:
      'Invoke exactly one replacement Claude Code Opus 4.8 read-only review through the validated direct-native argv path.',
  });
  requirePass(cp58.event.ordinal === 58, 'C34_CP57_REMEDIATION_CHECKPOINT_NOT_58');
  writeOnceBuffer(ART.preReviewLogSnapshot, fs.readFileSync(CHECKPOINT_LOG));
  const manifest = makeManifest(ART.preReviewManifest, [
    OLD.preReviewManifest,
    CHECKPOINT_57,
    OLD.terminal,
    OLD.invocation,
    OLD.capture,
    EVIDENCE.candidate6,
    EVIDENCE.composition,
    EVIDENCE.frozen,
    EVIDENCE.closure,
    EVIDENCE.active,
    EVIDENCE.residual,
    EVIDENCE.chain,
    EVIDENCE.ledger,
    EVIDENCE.registryWal,
    EVIDENCE.serviceIdentity,
    REGISTRY,
    WAL,
    THIS_RUNNER,
    ART.authorization,
    ART.continuity,
    ART.rootCause,
    ART.rootCauseMd,
    ART.priorAdjudication,
    ART.remediation,
    ART.preflight,
    ART.outputContract,
    ART.roadmapDraft,
    ART.roadmapDraftObserved,
    ART.currentDraft,
    ART.currentDraftObserved,
    ART.stagingDraft,
    ART.reviewRequest,
    ART.reviewedInventory,
    ART.preReviewLogSnapshot,
    cp58.numbered,
    PROMPT,
  ]);
  requirePass(manifest.pass, 'C34_CP57_REPLACEMENT_PRE_REVIEW_MANIFEST_INVALID');
  return {
    budget,
    checkpoint: cp58.event,
    prepared: true,
    rootCause,
    priorAdjudication,
    remediation,
    preflight,
    outputContract,
    authorization,
    reviewedInventory,
    stagingDraft,
    reviewedStateDigest: manifest.manifest.sha256,
    manifestEntries: manifest.entries,
    pass: true,
  };
}

function sameJson(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function replacementPreparation() {
  const chain = validateCheckpointChain();
  const cp58 = chain.records.find((record) => record.event.stage === STAGE_58);
  requirePass(
    chain.pass
      && cp58
      && cp58.row === 58
      && cp58.event.status === 'PASS_READY_FOR_REPLACEMENT_OPUS_REVIEW'
      && cp58.event.safeToResume === true
      && cp58.event.activeAttemptId == null
      && cp58.event.activeBaseHash === EXPECTED.activeBase,
    'C34_CP57_REPLACEMENT_CHECKPOINT_58_INVALID',
  );
  const manifest = verifyManifest(ART.preReviewManifest);
  const preflight = readJson(ART.preflight);
  const authorization = readJson(ART.authorization);
  requirePass(
    manifest.pass
      && preflight.pass
      && preflight.status === 'PASS_READY_FOR_REPLACEMENT_OPUS_REVIEW'
      && authorization.pass
      && authorization.exactlyOneReplacementOpusReviewAuthorized === true
      && authorization.candidateExecutionAuthorized === false
      && authorization.candidate7Authorized === false
      && authorization.c35Authorized === false,
    'C34_CP57_REPLACEMENT_PACKAGE_INVALID',
  );
  return {
    chain,
    checkpoint58: cp58.event,
    manifest,
    preflight,
    authorization,
    reviewedStateDigest: manifest.manifest.sha256,
  };
}

function invokeReplacementReview() {
  const budget = requireBudget(
    'invoke_exactly_one_replacement_opus_review',
    20 * 60 * 1000,
  );
  const prepared = replacementPreparation();
  const environment = requireEnvironmentClean();
  requirePass(
    prepared.chain.rows === 58
      && sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
      && sha(fs.readFileSync(WAL)) === EXPECTED.wal
      && sha(fs.readFileSync(EVIDENCE.candidate6)) === EXPECTED.candidate6
      && sha(fs.readFileSync(EVIDENCE.composition)) === EXPECTED.composition
      && sha(fs.readFileSync(EVIDENCE.frozen)) === EXPECTED.frozen,
    'C34_CP57_REPLACEMENT_PRE_INVOKE_CONTINUITY_FAILED',
  );

  if (fs.existsSync(ART.replacementCapture)) {
    requirePass(
      fs.existsSync(ART.replacementInvocation),
      'C34_CP57_CAPTURE_WITHOUT_INVOCATION_MARKER',
    );
    return {
      budget,
      invocation: readJson(ART.replacementInvocation),
      capture: readJson(ART.replacementCapture),
      invoked: false,
      replacementBudgetAlreadyConsumed: true,
    };
  }
  requirePass(
    !fs.existsSync(ART.replacementInvocation)
      && !fs.existsSync(ART.reviewJson)
      && !fs.existsSync(ART.reviewMd),
    'C34_CP57_REPLACEMENT_BUDGET_ALREADY_CONSUMED_NO_REINVOKE',
  );

  const { native } = nativeClaudePath();
  const version = spawnSync(native, ['--version'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const argv = expectedReviewArgv(prepared.reviewedStateDigest);
  const commandCharacters = argv
    .reduce((sum, argument) => sum + argument.length + 3, native.length);
  requirePass(
    version.status === 0
      && (version.stdout || '').trim().startsWith(EXPECTED.claudeVersion)
      && sha(fs.readFileSync(native)) === EXPECTED.nativeClaude
      && commandCharacters < 30000
      && sameJson(
        argv.map((argument, index) => ({
          index,
          characters: argument.length,
          bytes: Buffer.byteLength(argument),
          sha256: sha(Buffer.from(argument)),
        })),
        prepared.preflight.proposedArgvBindings.map((binding, index) => {
          const actualArgument = argv[index];
          return {
            index,
            characters: actualArgument.length,
            bytes: Buffer.byteLength(actualArgument),
            sha256: sha(Buffer.from(actualArgument)),
          };
        }),
      ),
    'C34_CP57_REPLACEMENT_EXACT_ARGV_PREFLIGHT_FAILED',
  );

  const snapshotBeforeMarker = repositoryMutationSnapshot();
  const timeoutMilliseconds = Math.min(
    45 * 60 * 1000,
    Math.max(5 * 60 * 1000, budget.remainingMilliseconds - 12 * 60 * 1000),
  );
  const invocation = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    replacementReviewBudgetConsumed: true,
    replacementOrdinal: 1,
    status: 'STARTED_EXACTLY_ONCE',
    priorInvocation: hashRecord(OLD.invocation),
    priorInvocationDisposition: 'TECHNICAL_INCOMPLETE_REVIEW_INVOCATION',
    reviewedState: prepared.manifest.manifest,
    reviewedStateDigest: prepared.reviewedStateDigest,
    resolvedCliPath: native.replace(/\\/g, '/'),
    cliVersion: (version.stdout || '').trim(),
    cliArtifact: hashRecord(native),
    transport: {
      caller: 'Node child_process.spawnSync',
      shell: false,
      powershellUsed: false,
      npmShimUsed: false,
      argvArray: true,
    },
    argv,
    argvBindings: argv.map((argument, index) => ({
      index,
      characters: argument.length,
      bytes: Buffer.byteLength(argument),
      sha256: sha(Buffer.from(argument)),
    })),
    commandCharacters,
    cwd: REPO.replace(/\\/g, '/'),
    timeoutMilliseconds,
    budgetAtStart: budget,
    repositorySnapshotBeforeMarker: snapshotBeforeMarker,
    safeMode: true,
    noSessionPersistence: true,
    readOnlyPermissionMode: 'plan',
    candidateExecutionAuthorized: false,
    candidate7Authorized: false,
    c35Authorized: false,
    pass: true,
  };

  // This write-once marker consumes the only replacement budget before launch.
  writeOnceJson(ART.replacementInvocation, invocation);
  const repositoryBefore = repositoryMutationSnapshot();
  const startedUtc = now();
  const startedMilliseconds = Date.now();
  const result = spawnSync(native, argv, {
    cwd: REPO,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: timeoutMilliseconds,
    killSignal: 'SIGTERM',
    maxBuffer: 1024 * 1024 * 1024,
    env: {
      ...process.env,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    },
  });
  const completedUtc = now();
  const repositoryAfter = repositoryMutationSnapshot();
  const rawStdout = result.stdout || '';
  const rawStderr = result.stderr || '';
  const capture = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: completedUtc,
    replacementReviewBudgetConsumed: true,
    replacementOrdinal: 1,
    invocation: hashRecord(ART.replacementInvocation),
    priorInvocation: hashRecord(OLD.invocation),
    priorCapture: hashRecord(OLD.capture),
    reviewedState: prepared.manifest.manifest,
    reviewedStateDigest: prepared.reviewedStateDigest,
    nativeExecutable: hashRecord(native),
    directNativeNoShell: true,
    exactArgvBindings: invocation.argvBindings,
    startedUtc,
    completedUtc,
    elapsedMilliseconds: Date.now() - startedMilliseconds,
    timeoutMilliseconds,
    timedOut:
      result.error?.code === 'ETIMEDOUT'
      || result.error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
    exitCode: result.status,
    signal: result.signal,
    error: result.error
      ? {
        name: result.error.name,
        code: result.error.code || null,
        message: result.error.message,
      }
      : null,
    rawStdout,
    rawStdoutBytes: Buffer.byteLength(rawStdout),
    rawStdoutSha256: sha(Buffer.from(rawStdout)),
    stderr: rawStderr,
    stderrBytes: Buffer.byteLength(rawStderr),
    stderrSha256: sha(Buffer.from(rawStderr)),
    repositoryBefore,
    repositoryAfter,
    repositoryMutationDetected: !sameJson(repositoryBefore, repositoryAfter),
    environmentBefore: environment,
    status:
      result.status === 0
        && !result.error
        && sameJson(repositoryBefore, repositoryAfter)
        ? 'CAPTURED_FOR_CONTRACT_VALIDATION'
        : 'TECHNICAL_INCOMPLETE_REPLACEMENT_REVIEW',
    pass:
      result.status === 0
      && !result.error
      && sameJson(repositoryBefore, repositoryAfter),
  };
  writeOnceJson(ART.replacementCapture, capture);
  return {
    budget,
    invocation,
    capture,
    invoked: true,
    replacementBudgetAlreadyConsumed: true,
  };
}

function extractStructuredReview(capture) {
  let envelope;
  try {
    envelope = JSON.parse(capture.rawStdout);
  } catch (error) {
    return {
      envelope: null,
      structured: null,
      resultStructured: null,
      extractionError: error.message,
      pass: false,
    };
  }
  let resultStructured = null;
  try {
    resultStructured =
      typeof envelope.result === 'string'
        ? JSON.parse(envelope.result)
        : envelope.result;
  } catch {
    resultStructured = null;
  }
  const structured =
    envelope.structured_output
    && typeof envelope.structured_output === 'object'
      ? envelope.structured_output
      : resultStructured;
  return {
    envelope,
    structured,
    resultStructured,
    extractionError: null,
    pass:
      structured != null
      && typeof structured === 'object'
      && !Array.isArray(structured)
      && resultStructured != null
      && sameJson(structured, resultStructured),
  };
}

function validateReviewContract(extracted, reviewedStateDigest) {
  const envelope = extracted.envelope || {};
  const review = extracted.structured || {};
  const exactTopLevelKeys =
    Object.keys(review).sort().join('\n')
    === REVIEW_SCHEMA.required.slice().sort().join('\n');
  const verification = review.verification || {};
  const exactVerificationKeys =
    Object.keys(verification).sort().join('\n')
    === REVIEW_KEYS.slice().sort().join('\n');
  const decisionAllowed =
    REVIEW_SCHEMA.properties.decision.enum.includes(review.decision);
  const allVerificationTrue =
    exactVerificationKeys
    && REVIEW_KEYS.every((key) => verification[key] === true);
  const blockingFindingsValid =
    Array.isArray(review.blockingFindings)
    && review.blockingFindings.every((item) => typeof item === 'string');
  const observationsValid =
    Array.isArray(review.nonblockingObservations)
    && review.nonblockingObservations.every((item) => typeof item === 'string');
  const approved =
    review.decision === 'APPROVED'
    || review.decision === 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS';
  const approvalContract =
    !approved
    || (
      review.independenceConfirmed === true
      && review.readOnlyConfirmed === true
      && allVerificationTrue
      && blockingFindingsValid
      && review.blockingFindings.length === 0
      && review.commitSafe === true
    );
  const usageKeys =
    envelope.modelUsage
    && typeof envelope.modelUsage === 'object'
      ? Object.keys(envelope.modelUsage)
      : [];
  const opus48UsageKeys = usageKeys.filter((key) =>
    /(?:^|-)opus-4-8(?:-|$)/i.test(key));
  const permissionDenials =
    Array.isArray(envelope.permission_denials)
      ? envelope.permission_denials
      : null;
  const pass =
    extracted.pass
    && envelope.type === 'result'
    && envelope.subtype === 'success'
    && envelope.is_error === false
    && envelope.terminal_reason === 'completed'
    && permissionDenials != null
    && permissionDenials.length === 0
    && usageKeys.length > 0
    && opus48UsageKeys.length > 0
    && exactTopLevelKeys
    && decisionAllowed
    && review.reviewedStateDigest === reviewedStateDigest
    && review.reviewerTool === 'Claude Code'
    && review.reviewerModel === 'claude-opus-4-8'
    && typeof review.independenceConfirmed === 'boolean'
    && typeof review.readOnlyConfirmed === 'boolean'
    && typeof review.summary === 'string'
    && review.summary.trim().length > 0
    && exactVerificationKeys
    && REVIEW_KEYS.every((key) => typeof verification[key] === 'boolean')
    && blockingFindingsValid
    && observationsValid
    && typeof review.commitSafe === 'boolean'
    && approvalContract;
  return {
    envelope: {
      type: envelope.type ?? null,
      subtype: envelope.subtype ?? null,
      isError: envelope.is_error ?? null,
      terminalReason: envelope.terminal_reason ?? null,
      permissionDenials,
      modelUsageKeys: usageKeys,
      opus48UsageKeys,
      auxiliaryModelUsageKeys: usageKeys.filter(
        (key) => !opus48UsageKeys.includes(key),
      ),
      totalCostUsd: envelope.total_cost_usd ?? null,
      durationMilliseconds: envelope.duration_ms ?? null,
      turns: envelope.num_turns ?? null,
    },
    exactTopLevelKeys,
    exactVerificationKeys,
    decisionAllowed,
    allVerificationTrue,
    blockingFindingsValid,
    observationsValid,
    approvalContract,
    approved,
    pass,
  };
}

function canonicalReviewMarkdown(reviewJson) {
  const review = reviewJson.review;
  const checks = REVIEW_KEYS
    .map((key) => `- ${key}: **${review.verification[key] ? 'PASS' : 'FAIL'}**`)
    .join('\n');
  const blockers = review.blockingFindings.length
    ? review.blockingFindings.map((item) => `- ${item}`).join('\n')
    : '- None.';
  const observations = review.nonblockingObservations.length
    ? review.nonblockingObservations.map((item) => `- ${item}`).join('\n')
    : '- None.';
  return `# PHASE-10A14-R20 COMMIT 5R1-C34 replacement Opus review

- Decision: **${review.decision}**
- Reviewer: **${review.reviewerTool} / ${review.reviewerModel}**
- Reviewed-state digest: \`${review.reviewedStateDigest}\`
- Independent: **${review.independenceConfirmed}**
- Read-only: **${review.readOnlyConfirmed}**
- Commit safe: **${review.commitSafe}**

## Summary

${review.summary}

## Verification

${checks}

## Blocking findings

${blockers}

## Nonblocking observations

${observations}
`;
}

function compareAndSwapInstall(source, startingSnapshot, target) {
  const sourceBytes = fs.readFileSync(source);
  const startingBytes = fs.readFileSync(startingSnapshot);
  const targetBytes = fs.readFileSync(target);
  if (targetBytes.equals(sourceBytes)) {
    return {
      source: hashRecord(source),
      startingSnapshot: hashRecord(startingSnapshot),
      target: hashRecord(target),
      installed: false,
      alreadyInstalled: true,
      pass: true,
    };
  }
  requirePass(
    targetBytes.equals(startingBytes),
    `C34_CP57_DOCUMENT_COMPARE_AND_SWAP_FAILED_${rel(target)}`,
  );
  const temporary =
    `${path.resolve(target)}.c34-cp57-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  let exists = false;
  try {
    fs.writeFileSync(temporary, sourceBytes, { flag: 'wx' });
    exists = true;
    fs.renameSync(temporary, target);
    exists = false;
  } finally {
    if (exists && fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  requirePass(
    fs.readFileSync(target).equals(sourceBytes),
    `C34_CP57_DOCUMENT_INSTALL_VERIFY_FAILED_${rel(target)}`,
  );
  return {
    source: hashRecord(source),
    startingSnapshot: hashRecord(startingSnapshot),
    target: hashRecord(target),
    installed: true,
    alreadyInstalled: false,
    pass: true,
  };
}

function buildFinalEvidence(decision, cp59) {
  const staging = readJson(ART.stagingDraft);
  const finalExcluded = new Set([
    rel(ART.finalManifest),
    rel(ART.finalManifestValidation),
    rel(ART.finalCommitContents),
  ]);
  requirePass(
    staging.pass
      && staging.paths.includes(rel(cp59.numbered))
      && staging.paths.includes(rel(ROADMAP))
      && staging.paths.includes(rel(CURRENT_STATE))
      && staging.paths.includes(rel(ART.replacementCapture))
      && staging.paths.includes(rel(ART.reviewJson)),
    'C34_CP57_FINAL_STAGING_DRAFT_INCOMPLETE',
  );
  const manifestFiles = staging.paths
    .filter((file) => !finalExcluded.has(file))
    .map((file) => path.resolve(REPO, file));
  const manifest = makeManifest(ART.finalManifest, manifestFiles);
  const records = manifest.records;
  const requiredPaths = [
    rel(OLD.capture),
    rel(ART.replacementCapture),
    rel(ART.reviewJson),
    rel(ART.reviewMd),
    rel(EVIDENCE.candidate6),
    rel(EVIDENCE.composition),
    rel(EVIDENCE.frozen),
    rel(REGISTRY),
    rel(WAL),
    rel(EVIDENCE.serviceIdentity),
    rel(ROADMAP),
    rel(CURRENT_STATE),
  ];
  const pathSet = new Set(records.map((record) => record.path));
  const c34CheckpointCount = records.filter((record) =>
    /^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C34_RECOVERY_CHECKPOINT_\d+_/i
      .test(record.path)).length;
  const validation = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    decision,
    manifest: manifest.manifest,
    entries: manifest.entries,
    badHashes: manifest.badRecords,
    badHashCount: manifest.badRecords.length,
    missingFiles: manifest.badRecords
      .filter((record) => !record.exists).map((record) => record.path),
    duplicatePaths: manifest.duplicatePaths,
    requiredPaths,
    missingRequiredPaths: requiredPaths.filter((file) => !pathSet.has(file)),
    c34CheckpointCount,
    bothOpusCliCapturesIncluded:
      pathSet.has(rel(OLD.capture))
      && pathSet.has(rel(ART.replacementCapture)),
    replacementReviewIncluded: pathSet.has(rel(ART.reviewJson)),
    documentationIncluded:
      pathSet.has(rel(ROADMAP)) && pathSet.has(rel(CURRENT_STATE)),
    registryWalIncluded:
      pathSet.has(rel(REGISTRY)) && pathSet.has(rel(WAL)),
    serviceRuntimeIdentityIncluded: pathSet.has(rel(EVIDENCE.serviceIdentity)),
    candidate7OrC35Paths: records
      .map((record) => record.path)
      .filter((file) => /candidate.?7|5R1C35|commit5r1c35/i.test(file)),
    pass:
      manifest.pass
      && requiredPaths.every((file) => pathSet.has(file))
      && c34CheckpointCount >= 45
      && !records.some((record) =>
        /^\.vscode\/|^evaluation\/factcheck\/|5R1C35|commit5r1c35/i
          .test(record.path)),
  };
  writeOnceJson(ART.finalManifestValidation, validation);
  requirePass(validation.pass, 'C34_CP57_FINAL_MANIFEST_INVALID');

  const bindings = Object.fromEntries(staging.paths
    .filter((file) => file !== rel(ART.finalCommitContents))
    .map((file) => {
      requirePass(
        fs.existsSync(path.resolve(REPO, file)),
        `C34_CP57_FINAL_COMMIT_PATH_MISSING_${file}`,
      );
      return [file, indexBlobBinding(file, file)];
    }));
  const contents = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    decision,
    parentCommit: EXPECTED.head,
    proposedCommitMessage: COMMIT_MESSAGE,
    stagingDraft: hashRecord(ART.stagingDraft),
    finalManifest: hashRecord(ART.finalManifest),
    finalManifestValidation: hashRecord(ART.finalManifestValidation),
    paths: staging.paths,
    pathCount: staging.paths.length,
    expectedIndexBlobBindings: bindings,
    selfBindingPolicy:
      'This artifact cannot bind its own bytes; its staged and committed blob is attested by post-commit Git verification.',
    explicitFileByFileOnly: true,
    pass:
      staging.paths.length > 0
      && staging.paths.every(authorizedStagePath)
      && Object.keys(bindings).length === staging.paths.length - 1,
  };
  writeOnceJson(ART.finalCommitContents, contents);
  requirePass(contents.pass, 'C34_CP57_FINAL_COMMIT_CONTENTS_INVALID');
  return { manifest, validation, contents };
}

function finalizeReplacementReview() {
  const budget = requireBudget('finalize_replacement_opus_review');
  const prepared = replacementPreparation();
  requirePass(
    fs.existsSync(ART.replacementInvocation)
      && fs.existsSync(ART.replacementCapture),
    'C34_CP57_REPLACEMENT_CAPTURE_MISSING',
  );
  const invocation = readJson(ART.replacementInvocation);
  const capture = readJson(ART.replacementCapture);
  const expectedArgv = expectedReviewArgv(prepared.reviewedStateDigest);
  const environment = requireEnvironmentClean();
  requirePass(
    prepared.chain.rows === 58
      && invocation.replacementOrdinal === 1
      && invocation.status === 'STARTED_EXACTLY_ONCE'
      && invocation.reviewedStateDigest === prepared.reviewedStateDigest
      && sameJson(invocation.argv, expectedArgv)
      && capture.replacementOrdinal === 1
      && capture.invocation.sha256 === sha(fs.readFileSync(ART.replacementInvocation))
      && capture.reviewedStateDigest === prepared.reviewedStateDigest
      && capture.exitCode === 0
      && capture.error == null
      && capture.pass === true
      && capture.repositoryMutationDetected === false
      && sameJson(capture.repositoryBefore, capture.repositoryAfter)
      && environment.status.staged === '',
    'C34_CP57_REPLACEMENT_CAPTURE_TECHNICAL_INCOMPLETE',
  );

  const extracted = extractStructuredReview(capture);
  const contract = validateReviewContract(
    extracted,
    prepared.reviewedStateDigest,
  );
  requirePass(contract.pass, 'C34_CP57_REPLACEMENT_OUTPUT_CONTRACT_INVALID');
  const review = extracted.structured;
  const reviewJson = stableGeneratedJson(ART.reviewJson, (generatedUtc) => ({
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    classification: 'REPLACEMENT_OPUS_REVIEW_DECISION',
    priorInvocationDisposition: 'TECHNICAL_INCOMPLETE_REVIEW_INVOCATION',
    invocation: hashRecord(ART.replacementInvocation),
    cliCapture: hashRecord(ART.replacementCapture),
    reviewedState: prepared.manifest.manifest,
    decision: review.decision,
    review,
    contract,
    pass: true,
  }));
  writeOnceBuffer(ART.reviewMd, Buffer.from(canonicalReviewMarkdown(reviewJson)));
  requirePass(
    reviewJson.decision === review.decision
      && reviewJson.review.reviewedStateDigest === prepared.reviewedStateDigest,
    'C34_CP57_CANONICAL_REVIEW_BINDING_FAILED',
  );

  if (!contract.approved) {
    const classification =
      review.decision === 'REJECTED'
        ? 'TWO_HOUR_SAFE_PAUSE_OPUS_REJECTED'
        : 'TWO_HOUR_SAFE_PAUSE_OPUS_INCOMPLETE';
    const terminal = reconcileTerminal({
      classification,
      blocker:
        review.blockingFindings.length > 0
          ? review.blockingFindings.join(' | ')
          : `Replacement Opus decision: ${review.decision}`,
      reviewDecision: review.decision,
      nextExactOperation:
        'Resolve the recorded replacement Opus finding under a new governed prompt; do not invoke another replacement review from checkpoint 57.',
    });
    return {
      budget,
      decision: review.decision,
      approved: false,
      review: reviewJson,
      terminal,
    };
  }

  const decisionSources =
    review.decision === 'APPROVED'
      ? {
        roadmap: ART.roadmapDraft,
        current: ART.currentDraft,
      }
      : {
        roadmap: ART.roadmapDraftObserved,
        current: ART.currentDraftObserved,
      };
  const roadmapInstall = compareAndSwapInstall(
    decisionSources.roadmap,
    OLD.roadmapStartingSnapshot,
    ROADMAP,
  );
  const currentInstall = compareAndSwapInstall(
    decisionSources.current,
    OLD.currentStartingSnapshot,
    CURRENT_STATE,
  );
  requirePass(
    roadmapInstall.pass
      && currentInstall.pass
      && fs.readFileSync(ROADMAP).equals(fs.readFileSync(decisionSources.roadmap))
      && fs.readFileSync(CURRENT_STATE).equals(
        fs.readFileSync(decisionSources.current),
      ),
    'C34_CP57_DOCUMENTATION_CUTOVER_FAILED',
  );

  const cp59 = appendCheckpoint({
    updatedAtUtc: reviewJson.generatedUtc,
    stage: STAGE_59_APPROVED,
    status: review.decision,
    artifacts: [
      ART.replacementInvocation,
      ART.replacementCapture,
      ART.reviewJson,
      ART.reviewMd,
      decisionSources.roadmap,
      decisionSources.current,
      ROADMAP,
      CURRENT_STATE,
    ],
    nextExactOperation:
      'Validate the final manifest and explicit staging set, then commit and push only if every finalization gate remains satisfied.',
  });
  requirePass(cp59.event.ordinal === 59, 'C34_CP57_APPROVAL_CHECKPOINT_NOT_59');
  writeOnceBuffer(ART.finalLogSnapshot, fs.readFileSync(CHECKPOINT_LOG));
  const evidence = buildFinalEvidence(review.decision, cp59);
  const actualAuthorized = statusPaths()
    .filter((record) => authorizedStagePath(record.path))
    .map((record) => record.path).sort();
  const expectedAuthorized = readJson(ART.stagingDraft).paths.slice().sort();
  requirePass(
    sameJson(actualAuthorized, expectedAuthorized),
    'C34_CP57_AUTHORIZED_DIRTY_SET_DIFFERS_FROM_STAGING_DRAFT',
  );
  return {
    budget,
    decision: review.decision,
    approved: true,
    review: reviewJson,
    documentation: { roadmapInstall, currentInstall },
    checkpoint: cp59.event,
    finalEvidence: evidence,
    authorizedDirtyPaths: actualAuthorized,
    pass: true,
  };
}

function expectedCommittedBlob(file, finalContents) {
  if (file === rel(ART.finalCommitContents)) {
    return git('hash-object', `--path=${file}`, '--', file).trim();
  }
  const binding = finalContents.expectedIndexBlobBindings[file];
  requirePass(binding, `C34_CP57_MISSING_COMMIT_BINDING_${file}`);
  return binding.expectedIndexBlob;
}

function commitPathBlob(commitHash, file) {
  const output = git('ls-tree', commitHash, '--', file).trim();
  const match = /^\d+\s+blob\s+([0-9a-f]{40})\t/.exec(output);
  requirePass(match, `C34_CP57_COMMIT_BLOB_MISSING_${file}`);
  return match[1];
}

function validateFinalizationForCommit() {
  const chain = validateCheckpointChain();
  const cp59 = chain.records.find((record) =>
    record.event.stage === STAGE_59_APPROVED);
  const reviewJson = readJson(ART.reviewJson);
  const review = reviewJson.review;
  const approved =
    review.decision === 'APPROVED'
    || review.decision === 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS';
  const staging = readJson(ART.stagingDraft);
  const validation = readJson(ART.finalManifestValidation);
  const contents = readJson(ART.finalCommitContents);
  const manifest = verifyManifest(ART.finalManifest);
  const source =
    review.decision === 'APPROVED'
      ? { roadmap: ART.roadmapDraft, current: ART.currentDraft }
      : { roadmap: ART.roadmapDraftObserved, current: ART.currentDraftObserved };
  requirePass(
    chain.pass
      && chain.rows === 59
      && cp59
      && cp59.row === 59
      && cp59.event.status === review.decision
      && approved
      && reviewJson.contract.pass
      && reviewJson.contract.approved
      && review.commitSafe === true
      && review.blockingFindings.length === 0
      && REVIEW_KEYS.every((key) => review.verification[key] === true)
      && fs.readFileSync(ROADMAP).equals(fs.readFileSync(source.roadmap))
      && fs.readFileSync(CURRENT_STATE).equals(fs.readFileSync(source.current))
      && manifest.pass
      && validation.pass
      && contents.pass
      && sameJson(staging.paths, contents.paths)
      && contents.proposedCommitMessage === COMMIT_MESSAGE,
    'C34_CP57_FINALIZATION_NOT_COMMIT_READY',
  );
  return {
    chain,
    checkpoint59: cp59.event,
    reviewJson,
    review,
    staging,
    validation,
    contents,
    manifest,
    source,
  };
}

function verifyCommittedUnit(commitHash, ready) {
  const parent = git('rev-parse', `${commitHash}^`).trim();
  const tree = git('rev-parse', `${commitHash}^{tree}`).trim();
  const message = git('log', '-1', '--pretty=%B', commitHash).trim();
  const committedPaths = git(
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    `${commitHash}^`,
    commitHash,
  ).split(/\r?\n/).filter(Boolean).sort();
  const expectedPaths = ready.staging.paths.slice().sort();
  const blobRecords = expectedPaths.map((file) => {
    const expected = expectedCommittedBlob(file, ready.contents);
    const actual = commitPathBlob(commitHash, file);
    return { path: file, expectedBlob: expected, actualBlob: actual, pass: actual === expected };
  });
  const pass =
    parent === EXPECTED.head
    && message === COMMIT_MESSAGE
    && sameJson(committedPaths, expectedPaths)
    && blobRecords.every((record) => record.pass)
    && git('diff', '--cached', '--name-only').trim() === ''
    && git('diff', '--name-only').trim() === ''
    && git('diff', '--name-only', `${commitHash}^`, commitHash, '--', 'services')
      .trim() === ''
    && git(
      'diff',
      '--name-only',
      `${commitHash}^`,
      commitHash,
      '--',
      'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
      'knowledge/TINA_Updated_Roadmap_v7.md',
    ).trim() === ''
    && git(
      'diff',
      '--name-only',
      `${commitHash}^`,
      commitHash,
      '--',
      'evaluation/oracles',
    ).trim() === '';
  return {
    commitHash,
    parent,
    tree,
    message,
    committedPaths,
    pathCount: committedPaths.length,
    expectedPaths,
    blobRecords,
    stagedAfterCommit: git('diff', '--cached', '--name-only').trim(),
    trackedDiffAfterCommit: git('diff', '--name-only').trim(),
    pass,
  };
}

function commitAndPushApprovedUnit() {
  const budget = requireBudget(
    'explicit_stage_commit_and_push',
    8 * 60 * 1000,
  );
  if (fs.existsSync(ART.terminal)) {
    return {
      budget,
      alreadyTerminal: true,
      terminal: readJson(ART.terminal),
    };
  }
  const ready = validateFinalizationForCommit();
  const initialHead = git('rev-parse', 'HEAD').trim();
  let commitHash;
  let newlyCommitted = false;

  if (initialHead === EXPECTED.head) {
    const environment = requireEnvironmentClean();
    const actualAuthorized = statusPaths()
      .filter((record) => authorizedStagePath(record.path))
      .map((record) => record.path).sort();
    const expectedPaths = ready.staging.paths.slice().sort();
    requirePass(
      environment.status.staged === ''
        && environment.status.serviceDiff === ''
        && environment.status.roadmapV7V8Diff === ''
        && environment.status.oracleDiff === ''
        && sameJson(actualAuthorized, expectedPaths),
      'C34_CP57_PRE_STAGE_HYGIENE_FAILED',
    );

    // Every path is named explicitly. Broad staging forms are intentionally absent.
    for (const file of ready.staging.paths) {
      git('add', '--', file);
    }
    const stagedPaths = git('diff', '--cached', '--name-only')
      .split(/\r?\n/).filter(Boolean).sort();
    const stagedBlobRecords = stagedPaths.map((file) => {
      const output = git('ls-files', '--stage', '--', file).trim();
      const match = /^\d+\s+([0-9a-f]{40})\s+0\t/.exec(output);
      requirePass(match, `C34_CP57_STAGED_BLOB_MISSING_${file}`);
      const expected = expectedCommittedBlob(file, ready.contents);
      return {
        path: file,
        expectedBlob: expected,
        stagedBlob: match[1],
        pass: match[1] === expected,
      };
    });
    requirePass(
      sameJson(stagedPaths, expectedPaths)
        && stagedBlobRecords.every((record) => record.pass)
        && git('diff', '--cached', '--name-only', '--', 'services').trim() === ''
        && git(
          'diff',
          '--cached',
          '--name-only',
          '--',
          'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
          'knowledge/TINA_Updated_Roadmap_v7.md',
        ).trim() === ''
        && git(
          'diff',
          '--cached',
          '--name-only',
          '--',
          'evaluation/oracles',
        ).trim() === '',
      'C34_CP57_EXACT_STAGED_SET_VALIDATION_FAILED',
    );
    const expectedTree = git('write-tree').trim();
    git('commit', '-m', COMMIT_MESSAGE);
    commitHash = git('rev-parse', 'HEAD').trim();
    newlyCommitted = true;
    requirePass(
      git('rev-parse', `${commitHash}^{tree}`).trim() === expectedTree,
      'C34_CP57_COMMITTED_TREE_DIFFERS_FROM_STAGED_TREE',
    );
  } else {
    commitHash = initialHead;
  }

  const verification = verifyCommittedUnit(commitHash, ready);
  requirePass(verification.pass, 'C34_CP57_POST_COMMIT_VERIFICATION_FAILED');
  const gitVerification = stableGeneratedJson(
    ART.gitVerification,
    (generatedUtc) => ({
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc,
      decision: ready.review.decision,
      parentRequired: EXPECTED.head,
      ...verification,
      newlyCommitted,
      finalCommitContents: hashRecord(ART.finalCommitContents),
      pass: true,
    }),
  );
  requirePass(
    gitVerification.pass
      && gitVerification.commitHash === commitHash
      && gitVerification.parent === EXPECTED.head,
    'C34_CP57_GIT_VERIFICATION_ARTIFACT_INVALID',
  );

  const branch = git('branch', '--show-current').trim();
  const pushStartedUtc = now();
  const push = spawnSync(
    'git',
    ['push', '--porcelain', 'origin', `HEAD:${branch}`],
    {
      cwd: REPO,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 256 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    },
  );
  const pushCompletedUtc = now();
  let lsRemote = {
    status: null,
    stdout: '',
    stderr: '',
    error: null,
  };
  if (push.status === 0 && !push.error) {
    const remoteResult = spawnSync(
      'git',
      ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`],
      {
        cwd: REPO,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
        timeout: 5 * 60 * 1000,
      },
    );
    lsRemote = {
      status: remoteResult.status,
      stdout: remoteResult.stdout || '',
      stderr: remoteResult.stderr || '',
      error: remoteResult.error
        ? {
          code: remoteResult.error.code || null,
          message: remoteResult.error.message,
        }
        : null,
    };
  }
  const upstream = git('rev-parse', '@{upstream}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}')
    .trim();
  const remoteHash = (lsRemote.stdout.trim().split(/\s+/)[0] || null);
  const remoteVerification = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: now(),
    commitHash,
    branch,
    remote: 'origin',
    pushStartedUtc,
    pushCompletedUtc,
    pushExitCode: push.status,
    pushSignal: push.signal,
    pushStdout: push.stdout || '',
    pushStderr: push.stderr || '',
    pushError: push.error
      ? {
        code: push.error.code || null,
        message: push.error.message,
      }
      : null,
    lsRemote,
    remoteHash,
    localHead: git('rev-parse', 'HEAD').trim(),
    upstream,
    sync,
    pass:
      push.status === 0
      && !push.error
      && lsRemote.status === 0
      && remoteHash === commitHash
      && upstream === commitHash
      && sync === '0\t0',
  };
  writeOnceJson(ART.remoteVerification, remoteVerification);
  if (!remoteVerification.pass) {
    const terminal = reconcileTerminal({
      classification: 'TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER',
      blocker:
        `Local commit ${commitHash} is preserved, but push/remote verification failed. `
        + `pushExit=${push.status}; remoteHash=${remoteHash}; upstream=${upstream}; sync=${sync}`,
      reviewDecision: ready.review.decision,
      nextExactOperation:
        `Verify credentials/network, then push existing local commit ${commitHash} without amending or rewriting it; do not rerun Opus.`,
    });
    return {
      budget,
      commitHash,
      gitVerification,
      remoteVerification,
      terminal,
      pass: false,
    };
  }

  const terminal = reconcileTerminal({
    classification: 'C34_COMMITTED_AND_PUSHED_PHASE_10A_OPEN',
    blocker: null,
    reviewDecision: ready.review.decision,
    nextExactOperation:
      'C34 is committed and pushed; continue only with the next separately governed Phase 10A commit unit. Do not begin C35 under this prompt.',
  });
  return {
    budget,
    commitHash,
    gitVerification,
    remoteVerification,
    terminal,
    pass: true,
  };
}

function existingTerminalReplay(terminal) {
  const checkpointArtifacts = terminal.checkpointArtifactPaths
    .map((file) => path.resolve(REPO, file));
  const beforeFiles = [
    CHECKPOINT,
    CHECKPOINT_LOG,
    ART.terminal,
    path.resolve(REPO, terminal.endingCheckpointArtifact.path),
    ...checkpointArtifacts,
  ];
  const before = Object.fromEntries(beforeFiles
    .filter((file) => fs.existsSync(file))
    .map((file) => [rel(file), hashRecord(file)]));
  const replay = appendCheckpoint({
    updatedAtUtc: terminal.generatedUtc,
    stage: STAGE_TERMINAL,
    status: terminal.classification,
    artifacts: checkpointArtifacts,
    nextExactOperation: terminal.nextExactOperation,
    blocker: terminal.blocker,
  });
  const after = Object.fromEntries(beforeFiles
    .filter((file) => fs.existsSync(file))
    .map((file) => [rel(file), hashRecord(file)]));
  const environment = processState();
  requirePass(
    replay.appended === false
      && sameJson(before, after)
      && validateCheckpointChain().records.filter(
        (record) => record.event.stage === STAGE_TERMINAL,
      ).length === 1
      && environment.inspectionSucceeded
      && environment.activeC34.length === 0
      && environment.unreadable.length === 0
      && environment.listeners5173.length === 0
      && temporaryRuntimeDirectories().length === 0
      && allocationLocks().length === 0
      && !fs.existsSync(path.join(REPO, '.git', 'index.lock')),
    'C34_CP57_TERMINAL_IDEMPOTENCE_FAILED',
  );
  return {
    terminal,
    checkpointAppended: replay.appended,
    before,
    after,
    noEvidenceMutation: sameJson(before, after),
    noDuplicateCheckpoint: true,
    noDuplicateOpusInvocation: true,
    noActiveProcess: true,
    pass: true,
  };
}

function reconcileTerminal({
  classification,
  blocker,
  reviewDecision = null,
  nextExactOperation,
}) {
  if (fs.existsSync(ART.terminal)) {
    const terminal = readJson(ART.terminal);
    requirePass(
      terminal.classification === classification
        && terminal.safeToResume === true
        && terminal.activeAttemptId == null,
      'C34_CP57_EXISTING_TERMINAL_DIFFERS',
    );
    return existingTerminalReplay(terminal);
  }

  const chainBefore = validateCheckpointChain();
  requirePass(
    chainBefore.pass
      && (chainBefore.rows === 58 || chainBefore.rows === 59)
      && !chainBefore.records.some(
        (record) => record.event.stage === STAGE_TERMINAL,
      ),
    'C34_CP57_TERMINAL_CHAIN_POSITION_INVALID',
  );
  const artifacts = [
    ART.authorization,
    ART.continuity,
    ART.rootCause,
    ART.rootCauseMd,
    ART.priorAdjudication,
    ART.remediation,
    ART.preflight,
    ART.outputContract,
    ART.preReviewManifest,
    ART.replacementInvocation,
    ART.replacementCapture,
    ART.reviewJson,
    ART.reviewMd,
    ART.finalManifest,
    ART.finalManifestValidation,
    ART.finalCommitContents,
    ART.gitVerification,
    ART.remoteVerification,
    EVIDENCE.candidate6,
    EVIDENCE.composition,
    EVIDENCE.frozen,
    EVIDENCE.closure,
    EVIDENCE.active,
    REGISTRY,
    WAL,
  ].filter((file) => fs.existsSync(file));
  const generatedUtc = now();
  const terminalCheckpoint = appendCheckpoint({
    updatedAtUtc: generatedUtc,
    stage: STAGE_TERMINAL,
    status: classification,
    artifacts,
    nextExactOperation,
    blocker,
  });
  const processes = processState();
  const temporary = temporaryRuntimeDirectories();
  const locks = allocationLocks();
  const gitStatus = gitState();
  const anchored = verifyAnchoredEvidence();
  const attemptState = exactAttemptState();
  const currentCheckpoint = readJson(CHECKPOINT);
  const review =
    fs.existsSync(ART.reviewJson) ? readJson(ART.reviewJson) : null;
  const manifest =
    fs.existsSync(ART.finalManifest)
      ? verifyManifest(ART.finalManifest) : null;
  const remote =
    fs.existsSync(ART.remoteVerification)
      ? readJson(ART.remoteVerification) : null;
  const success =
    classification === 'C34_COMMITTED_AND_PUSHED_PHASE_10A_OPEN';
  const safetyPass =
    anchored.pass
    && currentCheckpoint.activeAttemptId == null
    && currentCheckpoint.activeBaseHash === EXPECTED.activeBase
    && processes.inspectionSucceeded
    && processes.activeC34.length === 0
    && processes.unreadable.length === 0
    && processes.listeners5173.length === 0
    && temporary.length === 0
    && locks.length === 0
    && !gitStatus.indexLock
    && gitStatus.serviceDiff === ''
    && gitStatus.roadmapV7V8Diff === ''
    && gitStatus.oracleDiff === ''
    && gitStatus.c35Items.length === 0
    && sha(fs.readFileSync(REGISTRY)) === EXPECTED.registry
    && sha(fs.readFileSync(WAL)) === EXPECTED.wal
    && attemptState.registry.summary.c34RunningAttemptIds.length === 0
    && (!success || (
      review
      && (
        review.decision === 'APPROVED'
        || review.decision === 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS'
      )
      && manifest?.pass
      && remote?.pass
      && gitStatus.head === gitStatus.upstream
      && gitStatus.sync === '0\t0'
      && gitStatus.staged === ''
    ));
  requirePass(safetyPass, 'C34_CP57_TERMINAL_SAFETY_RECONCILIATION_FAILED');

  const terminal = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc,
    sessionStartedUtc: EXPECTED.sessionStartedUtc,
    sessionHardStopUtc: EXPECTED.sessionHardStopUtc,
    elapsedMilliseconds: elapsedMilliseconds(),
    startingCheckpoint: 57,
    endingCheckpoint: terminalCheckpoint.event.ordinal,
    endingCheckpointArtifact: hashRecord(terminalCheckpoint.numbered),
    classification,
    blocker,
    safeToResume: true,
    activeAttemptId: null,
    activeBaseHash: EXPECTED.activeBase,
    nextExactOperation,
    checkpoint57Verification: hashRecord(ART.continuity),
    priorOpus: {
      invocation: hashRecord(OLD.invocation),
      capture: hashRecord(OLD.capture),
      classification: 'TECHNICAL_INCOMPLETE_REVIEW_INVOCATION',
      semanticRejection: false,
    },
    cliRecovery: {
      rootCause: hashRecord(ART.rootCause),
      remediation: hashRecord(ART.remediation),
      preflight: hashRecord(ART.preflight),
      status: 'PASS_READY_FOR_REPLACEMENT_OPUS_REVIEW',
    },
    replacementOpus: {
      invocation:
        fs.existsSync(ART.replacementInvocation)
          ? hashRecord(ART.replacementInvocation) : null,
      capture:
        fs.existsSync(ART.replacementCapture)
          ? hashRecord(ART.replacementCapture) : null,
      review:
        fs.existsSync(ART.reviewJson) ? hashRecord(ART.reviewJson) : null,
      status:
        fs.existsSync(ART.replacementCapture)
          ? readJson(ART.replacementCapture).status : 'NOT_STARTED',
      explicitDecision: reviewDecision,
      observations: review?.review?.nonblockingObservations || [],
      replacementBudgetConsumed: fs.existsSync(ART.replacementInvocation),
    },
    candidate6: {
      attemptId: EXPECTED.candidate6Attempt,
      disposition: anchored.candidate6.disposition,
      accepted: anchored.candidate6.accepted,
      metricDelta: anchored.candidate6.metricDelta,
      exactOnce: anchored.candidate6ExactOnce,
      result: hashRecord(EVIDENCE.candidate6),
    },
    acceptedChain: hashRecord(EVIDENCE.chain),
    composition: hashRecord(EVIDENCE.composition),
    frozenGates: hashRecord(EVIDENCE.frozen),
    closure: hashRecord(EVIDENCE.closure),
    metrics: {
      reasonPassed: 3575,
      reasonTotal: 3720,
      reasonMismatches: 145,
      decisionPassed: 3720,
      relationPassed: 3720,
    },
    registryWalLedger: {
      registry: hashRecord(REGISTRY),
      wal: hashRecord(WAL),
      ledger: hashRecord(EVIDENCE.ledger),
      registryAttempts: attemptState.registry.attempts.length,
      c34Attempts: attemptState.c34.length,
      walRows: attemptState.wal.length,
      c34Directories: attemptState.c34Directories.length,
      orphan: attemptState.registry.summary.orphan,
      dangling: attemptState.registry.summary.dangling,
      running: attemptState.registry.summary.c34RunningAttemptIds,
    },
    documentation: {
      roadmapV9: hashRecord(ROADMAP),
      currentState: hashRecord(CURRENT_STATE),
      cutoverComplete: fs.existsSync(ART.finalManifest),
      phase10AStatus: 'OPEN',
      r20Status: 'IN_PROGRESS',
    },
    manifest: manifest
      ? {
        artifact: manifest.manifest,
        entries: manifest.entries,
        badRecords: manifest.badRecords.length,
        duplicatePaths: manifest.duplicatePaths,
        pass: manifest.pass,
      }
      : null,
    git: {
      ...gitStatus,
      statusPaths: statusPaths(),
      gitVerification:
        fs.existsSync(ART.gitVerification)
          ? hashRecord(ART.gitVerification) : null,
      remoteVerification:
        fs.existsSync(ART.remoteVerification)
          ? hashRecord(ART.remoteVerification) : null,
      terminalArtifactWillRemainExternal: rel(ART.terminal),
      liveCheckpointAndLogRemainExternal: [rel(CHECKPOINT), rel(CHECKPOINT_LOG)],
    },
    runtime: {
      processes,
      temporaryRuntimeDirectories: temporary,
      allocationLocks: locks,
      port5173Free: processes.listeners5173.length === 0,
      gitIndexLock: gitStatus.indexLock,
    },
    candidate7Authorized: false,
    candidate7Created: false,
    c35Authorized: false,
    c35Started: false,
    checkpointArtifactPaths: artifacts.map(rel),
    liveCheckpoint: hashRecord(CHECKPOINT),
    checkpointLog: hashRecord(CHECKPOINT_LOG),
    phase10AStatus: 'OPEN',
    r20Status: 'IN_PROGRESS',
    pass: true,
  };
  writeOnceJson(ART.terminal, terminal);
  return {
    terminal,
    checkpointAppended: terminalCheckpoint.appended,
    pass: true,
  };
}

function terminalIdempotence() {
  requirePass(fs.existsSync(ART.terminal), 'C34_CP57_TERMINAL_MISSING');
  return existingTerminalReplay(readJson(ART.terminal));
}

function modeClassification(error, mode) {
  const message = String(error?.message || error);
  if (
    mode === '--invoke-replacement'
    || /OPUS|REPLACEMENT_CAPTURE|OUTPUT_CONTRACT|CLAUDE/i.test(message)
  ) {
    return 'TWO_HOUR_SAFE_PAUSE_OPUS_INCOMPLETE';
  }
  return 'TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER';
}

function main() {
  const mode = process.argv[2];
  requirePass(
    [
      '--prepare',
      '--invoke-replacement',
      '--finalize-review',
      '--commit-push',
      '--terminal-idempotence',
    ].includes(mode),
    'USAGE: --prepare | --invoke-replacement | --finalize-review | --commit-push | --terminal-idempotence',
  );
  let result;
  if (mode === '--prepare') result = prepareRecovery();
  if (mode === '--invoke-replacement') result = invokeReplacementReview();
  if (mode === '--finalize-review') result = finalizeReplacementReview();
  if (mode === '--commit-push') result = commitAndPushApprovedUnit();
  if (mode === '--terminal-idempotence') result = terminalIdempotence();
  process.stdout.write(`${JSON.stringify({ mode, result }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const mode = process.argv[2] || null;
  let terminal = null;
  let terminalError = null;
  try {
    if (
      mode !== '--prepare'
      && fs.existsSync(ART.preReviewManifest)
      && parseNdjson(CHECKPOINT_LOG).some((event) => event.stage === STAGE_58)
    ) {
      if (fs.existsSync(ART.terminal)) {
        terminal = terminalIdempotence();
      } else {
        const classification = modeClassification(error, mode);
        terminal = reconcileTerminal({
          classification,
          blocker: String(error?.message || error),
          reviewDecision:
            fs.existsSync(ART.reviewJson)
              ? readJson(ART.reviewJson).decision : null,
          nextExactOperation:
            classification === 'TWO_HOUR_SAFE_PAUSE_OPUS_INCOMPLETE'
              ? 'Preserve the consumed replacement invocation and diagnose the recorded capture under a new governed prompt; do not invoke Opus again from checkpoint 57.'
              : 'Resolve the recorded technical blocker from this idempotent terminal checkpoint without rerunning Candidate 6, composition, frozen gates, or Opus.',
        });
      }
    }
  } catch (reconciliationError) {
    terminalError = reconciliationError.stack || reconciliationError.message;
  }
  process.stderr.write(`${JSON.stringify({
    mode,
    error: error.stack || error.message,
    terminal,
    terminalError,
  }, null, 2)}\n`);
  process.exitCode = 1;
}
