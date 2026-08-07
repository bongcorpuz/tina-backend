// PHASE-10A14-R20 COMMIT 5R1-C37
// Write-once checkpoint-64 continuation driver. This file prepares the exact
// 57-entry external-review package and performs at most one read-only Opus
// invocation. It never edits runtime, oracle, registry, WAL, or frozen C37
// evidence.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const ATTEMPTS = path.join(RESULTS, 'attempts');
const PROMPT = 'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C37-TWO-HOUR-OPUS-REVIEW-AND-FINALIZATION-FROM-CHECKPOINT-64.md';
const CLI = 'C:/Users/USER/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe';

const EXPECTED = Object.freeze({
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  parent: 'd5b25e676f623fbc1888608ff250824fcd34af99',
  branch: 'feature/source-availability-engine-v1',
  promptBytes: 25764,
  promptSha256: '144d55fc96403292eae094363723d14a2eada55d8442e1fd20db596ccbe8312b',
  checkpointSha256: 'c2041ad4b9d437aa801752e10dcf58bffedcc5b638013d6079b4fce672acd6e9',
  checkpointReplaySha256: '80ae4bff8d2671ad3261abff5ab3e1d16da3520c97dedebc2379eb203960bade',
  checkpointEventSha256: '853ae993a069fd9f677f62b20d90ebaed155384c4cdb7416a6aace76db93af15',
  sourceManifestSha256: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  sourceManifestBytes: 8473,
  packageEntries: 57,
  packageBytes: 4109852,
  existingRequestSha256: 'abe554cbac877d63e1ea5438a7a12deb0449cc0990da060b4f883eb52a017e79',
  registrySha256: 'a0261acfcc4cc69615794fe6f26117c00789d42862a75fae3e978b2e17a1e073',
  c34WalSha256: '2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2',
  c35WalSha256: 'd86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f',
  c35Composite: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
  selectedReason: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  liveReason: '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201',
  cliVersion: '2.1.212 (Claude Code)',
  model: 'claude-opus-4-8',
});

const F = Object.freeze({
  checkpoint: path.join(RESULTS, 'COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  numberedCheckpoint: path.join(RESULTS, 'COMMIT_5R1C37_RECOVERY_CHECKPOINT_64_external_opus_transmission_authorization_safe_pause.json'),
  checkpointReplay: path.join(RESULTS, 'COMMIT_5R1C37_CHECKPOINT_64_IDEMPOTENCE_REPLAY.json'),
  checkpointLog: path.join(RESULTS, 'COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
  safePauseTerminal: path.join(RESULTS, 'COMMIT_5R1C37_SAFE_PAUSE_PENDING_OPUS_TERMINAL_STATE.json'),
  safePauseReconciliation: path.join(RESULTS, 'COMMIT_5R1C37_SAFE_PAUSE_PENDING_OPUS_RECONCILIATION.json'),
  safePauseDriver: path.join(RESULTS, 'COMMIT_5R1C37_SAFE_PAUSE_CHECKPOINT_DRIVER.mjs'),
  delegationRecord: path.join(RESULTS, 'COMMIT_5R1C37_READ_ONLY_DELEGATION_RECORD.json'),
  adjudicateRunner: path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c37-adjudicate.mjs'),
  preflightRunner: path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c37-preflight.mjs'),
  protectedBaseline: path.join(RESULTS, 'COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
  c36Manifest: path.join(RESULTS, 'COMMIT_5R1C36_SAFE_PAUSE_EVIDENCE.sha256'),
  sourceManifest: path.join(RESULTS, 'COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  existingRequest: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_REQUEST.json'),
  candidateDecision: path.join(RESULTS, 'COMMIT_5R1C37_RUNTIME_CANDIDATE_NECESSITY_DECISION.json'),
  adjudication: path.join(RESULTS, 'COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.json'),
  regression: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_FULL_REGRESSION_ADJUDICATION.json'),
  preservation: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_PRESERVATION_RESULT.json'),
  attemptLedger: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_ATTEMPT_LEDGER.json'),
  registry: path.join(RESULTS, 'CANONICAL_ATTEMPT_REGISTRY.json'),
  c34Wal: path.join(RESULTS, 'COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c35Wal: path.join(RESULTS, 'COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c36Wal: path.join(RESULTS, 'COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c37Wal: path.join(RESULTS, 'COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson'),
  continuationPreflight: path.join(RESULTS, 'COMMIT_5R1C37_CHECKPOINT_64_CONTINUATION_PREFLIGHT.json'),
  protectedVerification: path.join(RESULTS, 'COMMIT_5R1C37_CHECKPOINT_64_PROTECTED_RESIDUE_VERIFICATION.json'),
  authorization: path.join(RESULTS, 'COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_AUTHORIZATION.json'),
  packageManifest: path.join(RESULTS, 'COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  packageSha: path.join(RESULTS, 'COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE.sha256'),
  scopeValidation: path.join(RESULTS, 'COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_SCOPE_VALIDATION.json'),
  sensitiveScan: path.join(RESULTS, 'COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_SENSITIVE_DATA_SCAN.json'),
  requestMd: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_REQUEST.md'),
  marker: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_INVOCATION_MARKER.json'),
  capture: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_REVIEW_CLI_CAPTURE.json'),
  stdout: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_REVIEW_STDOUT.txt'),
  stderr: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_REVIEW_STDERR.txt'),
  reviewJson: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_REVIEW.json'),
  reviewMd: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_REVIEW.md'),
  receipt: path.join(RESULTS, 'COMMIT_5R1C37_FINAL_OPUS_TRANSMISSION_RECEIPT.json'),
});

const PREP_OUTPUTS = [
  F.continuationPreflight, F.protectedVerification, F.authorization,
  F.packageManifest, F.packageSha, F.scopeValidation, F.sensitiveScan,
  F.requestMd,
];
const REVIEW_OUTPUTS = [F.marker, F.capture, F.stdout, F.stderr, F.reviewJson, F.reviewMd, F.receipt];

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const now = () => new Date().toISOString();
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const assert = (condition, code) => {
  if (!condition) throw new Error(code);
};
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: 'utf8' }).trim();
const lineCount = (file) => fs.existsSync(file)
  ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim()).length
  : 0;

function fileRecord(file) {
  const data = fs.readFileSync(file);
  return { path: rel(file), bytes: data.length, sha256: sha(data) };
}

function atomicWriteNew(file, data) {
  assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const temp = `${file}.write-once-${process.pid}-${crypto.randomBytes(8).toString('hex')}.tmp`;
  let renamed = false;
  try {
    const fd = fs.openSync(temp, 'wx');
    try {
      fs.writeFileSync(fd, payload);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    assert(!fs.existsSync(file), `WRITE_ONCE_RACE:${rel(file)}`);
    fs.renameSync(temp, file);
    renamed = true;
  } finally {
    if (!renamed && fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
  return fileRecord(file);
}

function parseShaManifest(file) {
  const raw = fs.readFileSync(file, 'utf8');
  assert(!raw.includes('\u0000'), 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:NUL_IN_MANIFEST');
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
  return lines.map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:MALFORMED_LINE_${index + 1}`);
    return { ordinal: index + 1, expectedSha256: match[1], repositoryRelativePath: match[2].replaceAll('\\', '/') };
  });
}

function roleFor(relativePath) {
  const name = path.posix.basename(relativePath);
  if (/COMMIT_5R1C36_/.test(name)) return ['C36_INHERITED_SOURCE_EVIDENCE', 'Required to reproduce the inherited 145-row residual inventory, clustering, hypotheses, regression, preservation, and checkpoint-63 state.'];
  if (/commit5r1c37-(?:adjudicate|preflight)\.mjs/.test(name)) return ['C37_REPRODUCTION_AND_REVIEW_TOOLING', 'Required to inspect the exact deterministic adjudication/preflight implementation without executing or modifying it.'];
  if (/(?:PROPOSED_|STATUS_ASSESSMENT_DRAFT|FINAL_CLOSURE_DECISION_DRAFT)/.test(name)) return ['C37_FINALIZATION_DRAFT', 'Required to review proposed documentation, status, manifest, staging, and closure wording, including unfavorable or superseded draft details.'];
  if (/(?:CLEAN_FULL_REGRESSION|FINAL_FULL_REGRESSION|FINAL_FROZEN|FINAL_REPLAY|FINAL_PRESERVATION)/.test(name)) return ['C37_REGRESSION_AND_GATE_EVIDENCE', 'Required to verify the new full-regression capture, zero new runtime failures, replay/frozen gates, and preservation.'];
  if (/(?:REASON_CONTRACT|145_ROW|CLUSTER_DISPOSITION|DIAGNOSTIC_NECESSITY|RUNTIME_CANDIDATE_NECESSITY)/.test(name)) return ['C37_CONTRACT_AND_ROW_ADJUDICATION', 'Required to review the contract, all 145 row dispositions, eight clusters, diagnostic necessity, and no-runtime-candidate decision.'];
  return ['C37_CONTINUITY_AND_PROVENANCE', 'Required to verify checkpoint continuity, active-base/composition/metrics, protected residue, attempts, and accepted rule provenance.'];
}

const SECRET_PATTERNS = Object.freeze([
  ['PRIVATE_KEY_PEM', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['ANTHROPIC_OR_OPENAI_KEY', /\b(?:sk-ant-|sk-proj-|sk-[A-Za-z0-9_-]{24,})[A-Za-z0-9_-]*/g],
  ['GITHUB_TOKEN', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g],
  ['AWS_ACCESS_KEY', /\bAKIA[0-9A-Z]{16}\b/g],
  ['BEARER_CREDENTIAL', /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}={0,2}\b/gi],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['CREDENTIAL_URI', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@/gi],
  ['CREDENTIAL_ASSIGNMENT', /\b(?:api[_-]?key|client[_-]?secret|password|passwd|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["']?[A-Za-z0-9._~+\/-]{16,}/gi],
  ['EMAIL_ADDRESS', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['PH_TIN', /\b\d{3}-\d{3}-\d{3}(?:-\d{3})?\b/g],
  ['PH_PHONE', /(?:\+63|0063|0)9\d{9}\b/g],
  ['CLIENT_PERSON_FIELD', /["'](?:clientName|customerName|taxpayerName|fullName)["']\s*:/gi],
]);

function scanText(text) {
  const hits = [];
  for (const [name, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    let count = 0;
    while (pattern.exec(text) && count < 1000) count += 1;
    if (count) hits.push({ pattern: name, count });
  }
  return hits;
}

function parentChainHasSymlink(file) {
  let current = path.resolve(file);
  const repoRoot = path.resolve(REPO);
  for (;;) {
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) return true;
    if (current.toLowerCase() === repoRoot.toLowerCase()) return false;
    const parent = path.dirname(current);
    assert(parent !== current, 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:PARENT_ESCAPE');
    current = parent;
  }
}

function resolvePackage() {
  const source = fileRecord(F.sourceManifest);
  assert(source.bytes === EXPECTED.sourceManifestBytes && source.sha256 === EXPECTED.sourceManifestSha256, 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:SOURCE_MANIFEST_IDENTITY');
  const parsed = parseShaManifest(F.sourceManifest);
  assert(parsed.length === EXPECTED.packageEntries, 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:COUNT');
  const paths = new Set();
  const ordinals = new Set();
  const records = [];
  for (const entry of parsed) {
    assert(!ordinals.has(entry.ordinal), 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:DUPLICATE_ORDINAL');
    ordinals.add(entry.ordinal);
    const normalized = path.posix.normalize(entry.repositoryRelativePath);
    assert(normalized === entry.repositoryRelativePath && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized), `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:PATH_${entry.ordinal}`);
    assert(!paths.has(normalized), 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:DUPLICATE_PATH');
    paths.add(normalized);
    const absolute = path.resolve(REPO, ...normalized.split('/'));
    assert(absolute.toLowerCase().startsWith(`${path.resolve(REPO).toLowerCase()}${path.sep}`), `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:ESCAPE_${entry.ordinal}`);
    assert(fs.existsSync(absolute), `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:MISSING_${entry.ordinal}`);
    const stat = fs.lstatSync(absolute);
    assert(stat.isFile() && !stat.isSymbolicLink() && !parentChainHasSymlink(absolute), `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:NON_REGULAR_${entry.ordinal}`);
    const real = fs.realpathSync.native(absolute);
    assert(real.toLowerCase().startsWith(`${fs.realpathSync.native(REPO).toLowerCase()}${path.sep}`), `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:REALPATH_ESCAPE_${entry.ordinal}`);
    const data = fs.readFileSync(absolute);
    assert(sha(data) === entry.expectedSha256, `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:HASH_${entry.ordinal}`);
    const decoded = data.toString('utf8');
    assert(Buffer.from(decoded, 'utf8').equals(data) && !data.includes(0), `C37_OPUS_EXTERNAL_TRANSMISSION_SCOPE_BLOCKED:NON_UTF8_${entry.ordinal}`);
    const hits = scanText(decoded);
    const [evidenceRole, whyRequiredForReview] = roleFor(normalized);
    records.push({
      ordinal: entry.ordinal,
      repositoryRelativePath: normalized,
      bytes: data.length,
      sha256: entry.expectedSha256,
      evidenceRole,
      whyRequiredForReview,
      regularFile: true,
      repositoryContainedRealPath: true,
      symlinkOrReparseEscape: false,
      mutableTemporaryFile: false,
      sensitiveDataScanResult: hits.length ? 'BLOCKED' : 'PASS_NO_DISALLOWED_CONTENT',
      sensitiveDataFindingClasses: hits.map((hit) => hit.pattern),
      transmissionAuthorized: hits.length === 0,
    });
  }
  const payloadBytes = records.reduce((sum, record) => sum + record.bytes, 0);
  assert(payloadBytes === EXPECTED.packageBytes, 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:BYTE_TOTAL');
  assert(records.every((record) => record.transmissionAuthorized), 'C37_OPUS_EXTERNAL_TRANSMISSION_SCOPE_BLOCKED:SENSITIVE_SCAN');
  const aggregateFraming = records.map((record) => `${record.ordinal}\0${record.repositoryRelativePath}\0${record.bytes}\0${record.sha256}\n`).join('');
  return {
    sourceManifest: source,
    records,
    payloadBytes,
    aggregateAlgorithm: 'For ordinal 1 through 57: decimal ordinal + NUL + POSIX repository-relative path + NUL + raw-byte-length + NUL + SHA256(raw bytes) + LF; SHA256 the UTF-8 concatenation.',
    aggregateSha256: sha(Buffer.from(aggregateFraming, 'utf8')),
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
  return {
    observedUtc: now(),
    currentExecutor: { imageName: 'node.exe', pid: process.pid, excludedFromExternalNodeCount: true },
    nodeProcessesExcludingCurrentExecutor: nodeProcesses,
    preExistingClaudeProcesses: claudeProcesses,
    preExistingClaudeProcessAdjudication: claudeProcesses.length === 0 ? null : {
      relatedToC37Invocation: false,
      basis: 'Observed before any C37 invocation marker existed. The only identified process is the user-owned VS Code Claude Code extension stream service; this continuation did not create, control, or terminate it.',
      identifiedExecutable: 'C:/Users/USER/.vscode/extensions/anthropic.claude-code-2.1.220-win32-x64/resources/native-binary/claude.exe',
      c37ReviewCliExecutable: CLI,
    },
    port5173Listeners,
    temporaryRuntimes,
    locks,
    stagingEmpty: git('diff', '--cached', '--name-only') === '',
    trackedTreeClean: git('status', '--porcelain=v1', '--untracked-files=no') === '',
    c37InvocationMarkerAbsent: !fs.existsSync(F.marker),
    c37ReviewCaptureAbsent: !fs.existsSync(F.capture) && !fs.existsSync(F.reviewJson) && !fs.existsSync(F.receipt),
    pass: nodeProcesses.length === 0 && port5173Listeners.length === 0 && temporaryRuntimes.length === 0 && locks.length === 0,
  };
}

function validateRegistryWalAttempts() {
  const registry = readJson(F.registry);
  const attempts = registry.attempts;
  const ids = attempts.map((attempt) => attempt.attemptId);
  const uniqueIds = new Set(ids);
  const directories = fs.readdirSync(ATTEMPTS, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const directoryIds = new Set(directories);
  const state = {
    registry: fileRecord(F.registry),
    registryAttempts: attempts.length,
    uniqueAttemptIds: uniqueIds.size,
    attemptDirectories: directories.length,
    orphan: directories.filter((id) => !uniqueIds.has(id)),
    dangling: ids.filter((id) => !directoryIds.has(id)),
    running: attempts.filter((attempt) => attempt.status === 'running').map((attempt) => attempt.attemptId),
    activeAttemptId: registry.c35?.activeAttemptId ?? null,
    c34Wal: { ...fileRecord(F.c34Wal), rows: lineCount(F.c34Wal) },
    c35Wal: { ...fileRecord(F.c35Wal), rows: lineCount(F.c35Wal) },
    c36Wal: { path: rel(F.c36Wal), exists: fs.existsSync(F.c36Wal), rows: lineCount(F.c36Wal) },
    c37Wal: { path: rel(F.c37Wal), exists: fs.existsSync(F.c37Wal), rows: lineCount(F.c37Wal) },
    c36RowsOrDirectories: [...attempts.filter((a) => String(a.gateName || '').includes('commit5r1c36') || String(a.attemptId || '').includes('commit5r1c36')).map((a) => a.attemptId), ...directories.filter((id) => id.includes('commit5r1c36'))],
    c37RowsOrDirectories: [...attempts.filter((a) => String(a.gateName || '').includes('commit5r1c37') || String(a.attemptId || '').includes('commit5r1c37')).map((a) => a.attemptId), ...directories.filter((id) => id.includes('commit5r1c37'))],
  };
  state.pass = state.registry.sha256 === EXPECTED.registrySha256
    && state.registryAttempts === 230 && state.uniqueAttemptIds === 230 && state.attemptDirectories === 230
    && state.orphan.length === 0 && state.dangling.length === 0 && state.running.length === 0 && state.activeAttemptId === null
    && state.c34Wal.sha256 === EXPECTED.c34WalSha256 && state.c34Wal.rows === 32
    && state.c35Wal.sha256 === EXPECTED.c35WalSha256 && state.c35Wal.rows === 6
    && !state.c36Wal.exists && !state.c37Wal.exists
    && state.c36RowsOrDirectories.length === 0 && state.c37RowsOrDirectories.length === 0;
  assert(state.pass, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:REGISTRY_WAL_ATTEMPTS');
  return state;
}

function validateC35() {
  const expected = Object.freeze({
    'ask-handler.js': 'c10d913f3b6bd09b0a38ce319845bb2e908f46a6e829f02c13129d45b8827602',
    'conflict-engine.js': 'a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d',
    'services/answer-support-evidence.js': 'ed7a0873e9be3980092596946b5b765d90e459ee56fec3660c8fcbe8cd592d37',
    'services/answer-support-validator.js': '885f0dd8666b979e478bc2be5218281f2cd91445368d5604b3fb7a46e53b764e',
  });
  const components = Object.keys(expected).sort().map((name) => fileRecord(path.join(REPO, name)));
  const framing = components.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}\n`).join('');
  const compositeSha256 = sha(Buffer.from(framing, 'utf8'));
  const pass = components.every((record) => record.sha256 === expected[record.path]) && compositeSha256 === EXPECTED.c35Composite;
  assert(pass, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:C35_RUNTIME');
  return { components, compositeSha256, expectedCompositeSha256: EXPECTED.c35Composite, pass };
}

function verifyManifestFile(manifestFile) {
  const rows = parseShaManifest(manifestFile);
  const paths = new Set();
  const bad = [];
  for (const row of rows) {
    const file = path.resolve(REPO, ...row.repositoryRelativePath.split('/'));
    if (paths.has(row.repositoryRelativePath) || !fs.existsSync(file) || shaFile(file) !== row.expectedSha256) bad.push(row.repositoryRelativePath);
    paths.add(row.repositoryRelativePath);
  }
  return { manifest: fileRecord(manifestFile), rows: rows.length, uniquePaths: paths.size, bad, pass: bad.length === 0 && rows.length === paths.size };
}

function verifyProtectedResidue() {
  const baseline = readJson(F.protectedBaseline);
  const records = [...baseline.records, ...baseline.protectedTrackedControls].map((record) => {
    const file = path.resolve(REPO, ...record.path.split('/'));
    const actual = fileRecord(file);
    return { path: record.path, expectedBytes: record.bytes, expectedSha256: record.sha256, actualBytes: actual.bytes, actualSha256: actual.sha256, pass: actual.bytes === record.bytes && actual.sha256 === record.sha256 };
  });
  const c36 = verifyManifestFile(F.c36Manifest);
  const checkpointInputs = [
    F.checkpoint, F.numberedCheckpoint, F.checkpointReplay, F.checkpointLog,
    F.safePauseTerminal, F.safePauseReconciliation, F.safePauseDriver,
    F.delegationRecord, F.adjudicateRunner, F.preflightRunner, F.existingRequest,
    F.sourceManifest,
  ].map(fileRecord);
  const reconciliation = readJson(F.safePauseReconciliation);
  const expectedByPath = new Map(Object.values(reconciliation).filter((value) => value && typeof value === 'object' && typeof value.path === 'string' && typeof value.sha256 === 'string').map((value) => [value.path, value.sha256]));
  const reconciliationChecks = checkpointInputs.filter((record) => expectedByPath.has(record.path)).map((record) => ({ ...record, expectedSha256: expectedByPath.get(record.path), pass: record.sha256 === expectedByPath.get(record.path) }));
  const pass = records.every((record) => record.pass) && c36.pass && reconciliationChecks.every((record) => record.pass)
    && shaFile(F.existingRequest) === EXPECTED.existingRequestSha256;
  assert(pass, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:PROTECTED_RESIDUE');
  return {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_CHECKPOINT_64_PROTECTED_RESIDUE_VERIFIED',
    generatedUtc: now(),
    baseline: fileRecord(F.protectedBaseline),
    protectedBaselineRecords: records,
    c36SafePauseInventory: c36,
    c37Checkpoint64ProtectedInputs: checkpointInputs,
    reconciliationBoundChecks: reconciliationChecks,
    existingJsonRequestPreservation: {
      path: rel(F.existingRequest),
      sha256: shaFile(F.existingRequest),
      protectedAndNotOverwritten: true,
      continuationConflictAdjudication: 'The checkpoint-64 continuation requires a stricter request and also prohibits overwriting completed evidence. The immutable JSON remains preserved; the new Markdown request is the controlling checkpoint-64 overlay and removes the prohibited runtime-candidate token.',
    },
    mismatches: records.filter((record) => !record.pass).map((record) => record.path),
    pass,
  };
}

function outputSchema(packageManifestSha256, packageAggregateSha256) {
  const bools = [
    'checkpoint64Continuity', 'packageCountAndIntegrity', 'sensitiveScopeBoundaryAccepted',
    'c36InventoryVerified', 'reasonContractSound', 'rowAdjudicationComplete',
    'categoryTotalsExact', 'clusterMatrixComplete', 'diagnosticsNecessitySound',
    'noRuntimeCandidateDispositionSound', 'c35Preserved', 'c34ReasonRuntimePreserved',
    'noRuntimeOracleRegistryWalMutation', 'regressionAcceptedZeroNewRuntimeFailures',
    'phase10ARemainsOpen', 'c38NextSeparateOperation',
    'documentationFinalizationPlanAccurate', 'manifestAndExplicitStagingPlanAccurate',
    'prohibitedWorkAbsent',
  ];
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'decision', 'substantivePathDecision', 'reviewedStateDigest',
      'reviewedPackageManifestSha256', 'reviewedPackageAggregateSha256',
      'complete57EntryPackageReviewed', 'dataBeyondAuthorizedPackageReviewed',
      'reviewerTool', 'reviewerModel', 'independenceConfirmed', 'readOnlyConfirmed',
      'summary', 'verification', 'runtimeCandidateRequestedForC37',
      'blockingFindings', 'nonblockingObservations', 'commitSafe',
    ],
    properties: {
      decision: { type: 'string', enum: ['APPROVED', 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS', 'REJECTED', 'INCOMPLETE_REVIEW'] },
      substantivePathDecision: { type: 'string', enum: ['NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED', 'NO_RUNTIME_CANDIDATE_SEMANTICALLY_SAFE_BUT_REASON_GATE_OPEN', 'MORE_EVIDENCE_REQUIRED'] },
      reviewedStateDigest: { type: 'string', const: EXPECTED.sourceManifestSha256 },
      reviewedPackageManifestSha256: { type: 'string', const: packageManifestSha256 },
      reviewedPackageAggregateSha256: { type: 'string', const: packageAggregateSha256 },
      complete57EntryPackageReviewed: { type: 'boolean' },
      dataBeyondAuthorizedPackageReviewed: { type: 'boolean' },
      reviewerTool: { type: 'string', const: 'Claude Code' },
      reviewerModel: { type: 'string', const: EXPECTED.model },
      independenceConfirmed: { type: 'boolean' },
      readOnlyConfirmed: { type: 'boolean' },
      summary: { type: 'string' },
      verification: {
        type: 'object', additionalProperties: false, required: bools,
        properties: Object.fromEntries(bools.map((name) => [name, { type: 'boolean' }])),
      },
      runtimeCandidateRequestedForC37: { type: 'boolean' },
      blockingFindings: { type: 'array', items: { type: 'string' } },
      nonblockingObservations: { type: 'array', items: { type: 'string' } },
      commitSafe: { type: 'boolean' },
    },
  };
}

function requestMarkdown(packageInfo, packageManifestRecord, schema) {
  return `# PHASE-10A14-R20 COMMIT 5R1-C37 independent checkpoint-64 review\n\n` +
    `You are the mandatory independent reviewer: **Claude Code Opus 4.8**. This is the sole authorized invocation. The review is read-only. Return only one JSON object conforming to the supplied schema; the first property and decision token must be \`decision\`.\n\n` +
    `## Absolute boundaries\n\n` +
    `Do not edit, create, delete, rename, stage, commit, push, deploy, reindex, inspect credentials or environment data, invoke another model or agent, or perform network/web research. No tools are available. Review only the request metadata and the 57 byte-exact evidence entries framed in this single submission. Do not infer access to the source repository or any file outside the submitted package.\n\n` +
    `The evidence package has exactly 57 entries and ${packageInfo.payloadBytes} raw evidence bytes. The source 57-line manifest SHA-256 is \`${EXPECTED.sourceManifestSha256}\`. The detailed transmission manifest SHA-256 is \`${packageManifestRecord.sha256}\`. The deterministic package aggregate SHA-256 is \`${packageInfo.aggregateSha256}\` using the algorithm recorded in that manifest. Package/request framing and these instructions are authorized metadata, not evidence entry 58.\n\n` +
    `## Required determinations\n\n` +
    `Review the complete 57-entry package, including unfavorable and superseded draft evidence. Determine whether all 145/145 residual rows were adjudicated, whether zero TRUE_GENERALIZED_RUNTIME_DEFECT rows is supported, and whether \`C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED\` is correct. Verify reason remains 3575/3720 while decision and relation remain 3720/3720; C35 trust/support behavior and the selected C34 reason-runtime evidence remain preserved; no runtime, oracle, registry, or WAL mutation is hidden; and the new 197/217-suite, 5429/5451-group regression has exactly 21 historical STATE plus one allowlisted SCOPE failure and zero new runtime-behavior failures.\n\n` +
    `Phase 10A must remain OPEN. The only proposed approving substantive token is \`NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED\`, with separately governed C38 reason-oracle governance next. Do not authorize or request a runtime candidate in C37. If a runtime defect may exist, return REJECTED or MORE_EVIDENCE_REQUIRED and identify the evidence; no fix is authorized.\n\n` +
    `Review finalization scope as follows: Roadmap v9 is updated first and CURRENT_STATE.md last only after approval; Roadmap v7/v8 and all runtime/oracle/registry/WAL files remain unchanged; Phase 10A status becomes \`PHASE_10A_OPEN_REASON_ORACLE_GOVERNANCE_REQUIRED\`; R20 remains IN PROGRESS; E2 is BLOCKED, A15 is pending, and Phase 10B is blocked. C36 remains safe-paused, uncommitted, and nonterminal. C37 becomes terminal only after its exact commit and normal push are verified. The required commit message is exactly \`PHASE-10A14-R20 COMMIT 5R1-C37 complete - adjudicate reason residual contract and preserve open gate\`. Commit SHA/push/checkpoint-65 facts must be recorded in post-commit attestations rather than invented in a self-referential commit.\n\n` +
    `The frozen JSON request and proposed documentation/staging drafts are historical package evidence. Where they conflict with this checkpoint-64 continuation (including an obsolete runtime-candidate enum, the draft commit-message wording, incomplete external-review facts, or E2 called pending), this request controls. Those are correctable documentation/evidence-index details only if no adjudication, runtime, oracle, registry, WAL, or no-candidate semantic change is required.\n\n` +
    `Approval requires every verification boolean true, \`complete57EntryPackageReviewed=true\`, \`dataBeyondAuthorizedPackageReviewed=false\`, \`runtimeCandidateRequestedForC37=false\`, an empty \`blockingFindings\` array, and \`commitSafe=true\`. APPROVED_WITH_NONBLOCKING_OBSERVATIONS has the same requirements and may list only documentation/evidence-index corrections that need no second review.\n\n` +
    `## Output schema\n\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\n`;
}

function prepare() {
  for (const output of PREP_OUTPUTS) assert(!fs.existsSync(output), `WRITE_ONCE_EXISTS:${rel(output)}`);
  for (const output of REVIEW_OUTPUTS) assert(!fs.existsSync(output), `C37_CHECKPOINT_64_CONTINUITY_MISMATCH:PREEXISTING_REVIEW_ARTIFACT:${rel(output)}`);

  const promptRecord = { path: PROMPT, bytes: fs.statSync(PROMPT).size, sha256: shaFile(PROMPT) };
  assert(promptRecord.bytes === EXPECTED.promptBytes && promptRecord.sha256 === EXPECTED.promptSha256, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:AUTHORIZATION_PROMPT');
  const checkpoint = readJson(F.checkpoint);
  const checkpointReplay = readJson(F.checkpointReplay);
  assert(shaFile(F.checkpoint) === EXPECTED.checkpointSha256 && shaFile(F.numberedCheckpoint) === EXPECTED.checkpointSha256, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:CHECKPOINT_HASH');
  assert(fs.readFileSync(F.checkpoint).equals(fs.readFileSync(F.numberedCheckpoint)), 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:CHECKPOINT_COPY');
  assert(shaFile(F.checkpointReplay) === EXPECTED.checkpointReplaySha256 && checkpointReplay.pass === true, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:CHECKPOINT_REPLAY');
  assert(checkpoint.ordinal === 64 && checkpoint.eventSha256 === EXPECTED.checkpointEventSha256 && checkpoint.safeToResume === true && checkpoint.activeAttemptId === null, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:CHECKPOINT_STATE');
  assert(checkpoint.opusInvocationCount === 0 && checkpoint.reviewBudgetConsumed === false && checkpoint.stagingPerformed === false && checkpoint.commitCreated === false && checkpoint.pushPerformed === false, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:CHECKPOINT_ACTION_STATE');

  const head = git('rev-parse', 'HEAD');
  const parent = git('rev-parse', 'HEAD^');
  const branch = git('branch', '--show-current');
  const upstream = git('rev-parse', '@{upstream}');
  const remoteTracking = git('rev-parse', `refs/remotes/origin/${EXPECTED.branch}`);
  const counts = git('rev-list', '--left-right', '--count', `HEAD...refs/remotes/origin/${EXPECTED.branch}`).split(/\s+/).map(Number);
  assert(head === EXPECTED.head && parent === EXPECTED.parent && branch === EXPECTED.branch && upstream === EXPECTED.head && remoteTracking === EXPECTED.head && counts[0] === 0 && counts[1] === 0, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:GIT_IDENTITY');
  assert(git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '', 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:DIRTY_TRACKED_OR_STAGED');

  const hygiene = inspectHygiene();
  assert(hygiene.pass && hygiene.stagingEmpty && hygiene.trackedTreeClean && hygiene.c37InvocationMarkerAbsent && hygiene.c37ReviewCaptureAbsent, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:HYGIENE');
  const registryWalAttempts = validateRegistryWalAttempts();
  const c35 = validateC35();
  const candidate = readJson(F.candidateDecision);
  const adjudication = readJson(F.adjudication);
  const regression = readJson(F.regression);
  const preservation = readJson(F.preservation);
  const attemptLedger = readJson(F.attemptLedger);
  assert(candidate.decision === 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED' && candidate.candidatesAuthorized === 0 && candidate.candidatesAllocated === 0, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:CANDIDATE_DECISION');
  assert(adjudication.rowCount === 145 && adjudication.uniqueRows === 145 && adjudication.categoryTotals.TRUE_GENERALIZED_RUNTIME_DEFECT === 0, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:ADJUDICATION');
  assert(regression.suites.passed === 197 && regression.suites.run === 217 && regression.groups.passed === 5429 && regression.groups.total === 5451 && regression.runtimeBehaviorFailures === 0, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:REGRESSION');
  assert(preservation.c35Runtime.compositeSha256 === EXPECTED.c35Composite && preservation.selectedReasonRuntime.servicesTreeDigest === EXPECTED.selectedReason && preservation.liveReasonRuntime.servicesTreeDigest === EXPECTED.liveReason && preservation.pass === true, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:PRESERVATION');
  assert(attemptLedger.candidateBudget.authorized === 0 && attemptLedger.candidateBudget.allocated === 0 && attemptLedger.c37WalExists === false && attemptLedger.c37AttemptDirectories.length === 0 && attemptLedger.pass === true, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:ATTEMPT_LEDGER');

  const protectedVerification = verifyProtectedResidue();
  const packageInfo = resolvePackage();
  const packageShaText = fs.readFileSync(F.sourceManifest);
  assert(sha(packageShaText) === EXPECTED.sourceManifestSha256, 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:SHA_COPY_SOURCE');

  const preflight = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_CHECKPOINT_64_CONTINUATION_PREFLIGHT_PASS',
    generatedUtc: now(),
    authorizationPrompt: promptRecord,
    git: { head, parent, branch, upstream, remoteTracking, ahead: counts[0], behind: counts[1], stagingEmpty: true, trackedTreeClean: true },
    checkpoint: fileRecord(F.checkpoint),
    numberedCheckpoint: fileRecord(F.numberedCheckpoint),
    checkpointReplay: fileRecord(F.checkpointReplay),
    checkpointState: { ordinal: checkpoint.ordinal, eventSha256: checkpoint.eventSha256, safeToResume: checkpoint.safeToResume, activeAttemptId: checkpoint.activeAttemptId, idempotencePass: checkpointReplay.pass },
    priorReviewerState: { invocationMarkerAbsent: true, requestNotSubmitted: true, transmittedEvidenceBytes: 0, invocationCount: 0, reviewBudgetConsumed: false },
    frozenC37Result: {
      rowAdjudication: '145/145', generalizedRuntimeDefects: 0,
      decision: candidate.decision, candidatesAuthorized: 0, candidatesAllocated: 0,
      reason: '3575/3720', decisionMetric: '3720/3720', relationMetric: '3720/3720',
      runtimeChanges: 0, oracleChanges: 0, documentationCutoverPerformed: false,
      stagingCommitPushPerformed: false,
      preReviewClassification: 'C37_SAFE_PAUSE_NO_RUNTIME_CANDIDATE_PENDING_OPUS',
    },
    regression: { suites: '197/217', groups: '5429/5451', classificationCounts: regression.classificationCounts, newRuntimeBehaviorFailures: regression.runtimeBehaviorFailures },
    c35,
    selectedC34ReasonRuntimeSha256: EXPECTED.selectedReason,
    liveTrackedReasonScaffoldSha256: EXPECTED.liveReason,
    registryWalAttempts,
    hygiene,
    prohibitedMutationCounts: { runtime: 0, oracle: 0, registry: 0, wal: 0, candidate: 0 },
    pass: true,
  };

  const packageManifest = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_OPUS_EXTERNAL_TRANSMISSION_EXACT_57_ENTRY_PACKAGE',
    generatedUtc: now(),
    source57EntryManifest: packageInfo.sourceManifest,
    entryCount: packageInfo.records.length,
    ordinalRange: { first: 1, last: 57, unique: 57, complete: true },
    uniquePaths: 57,
    rawEvidenceBytes: packageInfo.payloadBytes,
    aggregateAlgorithm: packageInfo.aggregateAlgorithm,
    aggregateSha256: packageInfo.aggregateSha256,
    entries: packageInfo.records,
    metadataTransport: {
      evidenceEntries: 57,
      packageManifestIsEvidenceEntry: false,
      packageShaFileIsEvidenceEntry: false,
      finalRequestIsEvidenceEntry: false,
      method: 'The detailed package manifest, 57-line SHA file, request Markdown, JSON schema, and bounded framing are supplied as authorized request metadata. Each of the 57 source files is then included byte-for-byte in ordinal order inside the single stdin submission; none becomes a convenience entry and no repository/tool access is exposed.',
    },
    missingRequiredReviewInputs: 0,
    unrelatedConvenienceFiles: 0,
    mutableTemporaryFiles: 0,
    pass: true,
  };

  // Write the manifest first so the controlling request can bind its exact hash.
  const packageManifestRecord = atomicWriteNew(F.packageManifest, stable(packageManifest));
  const schema = outputSchema(packageManifestRecord.sha256, packageInfo.aggregateSha256);
  const request = requestMarkdown(packageInfo, packageManifestRecord, schema);

  const scopeValidation = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_OPUS_EXTERNAL_TRANSMISSION_SCOPE_VALIDATION_PASS', generatedUtc: now(),
    sourceManifest: packageInfo.sourceManifest,
    detailedManifest: packageManifestRecord,
    checks: {
      exactly57Entries: true, ordinalsUniqueAndComplete: true, pathsUnique: true,
      allFilesExist: true, allHashesRecomputed: true, missingRequiredInputs: 0,
      unrelatedConvenienceFiles: 0, repositoryEscapePaths: 0, symlinkOrReparseEscapes: 0,
      mutableTemporaryFiles: 0, strictUtf8Files: 57, nulContainingFiles: 0,
      packageMetadataNotCountedAsEntry58: true,
    },
    transmissionMethod: 'One binary-safe stdin submission with authorized metadata framing and all 57 raw UTF-8 file byte sequences in ordinal order; Claude tools disabled and cwd isolated.',
    pass: true,
  };
  const sensitiveScan = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_OPUS_EXTERNAL_TRANSMISSION_SENSITIVE_DATA_SCAN_PASS', generatedUtc: now(),
    scannedEntries: 57, scannedRawBytes: packageInfo.payloadBytes,
    automatedHighConfidenceFindingCount: packageInfo.records.reduce((sum, record) => sum + record.sensitiveDataFindingClasses.length, 0),
    resultByEntry: packageInfo.records.map((record) => ({ ordinal: record.ordinal, repositoryRelativePath: record.repositoryRelativePath, result: record.sensitiveDataScanResult, findingClasses: record.sensitiveDataFindingClasses })),
    adjudicatedHeuristics: {
      credentialsOrSecrets: 0, privateKeyHeaders: 0, credentialBearingUris: 0,
      environmentFilesOrSerializedEnvironmentValues: 0, clientOrPersonalData: 0,
      emails: 0, taxpayerIdentifiers: 0, phoneNumbers: 0,
      notes: [
        'All JSON/NDJSON evidence parsed in the independent bounded audit; sensitive-name keys were short semantic token labels or Boolean anti-memorization flags, not credentials.',
        'process.env occurrences are PASS text or runner inheritance code, not captured environment values.',
        'Windows user paths use the literal placeholder USER; URL occurrences are public technical/common-service or official-government references without URI credentials or private endpoints.',
        'client occurrences are technical test/path vocabulary without person, customer, taxpayer, or client PII companions.',
      ],
    },
    forbiddenFileClassesPresent: { environmentFiles: 0, npmCredentials: 0, sshKeys: 0, cloudCredentialFiles: 0 },
    pass: true,
  };
  const authorization = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_OPUS_EXTERNAL_TRANSMISSION_EXPLICIT_ONE_USE_AUTHORIZATION', generatedUtc: now(),
    authorizationSource: promptRecord,
    authorizationStatement: 'Project owner explicitly approved exactly one read-only Claude Code Opus 4.8 invocation and transmission to Anthropic of only the verified 57-entry C37 review package, subject to all prompt restrictions.',
    externalServiceProvider: 'Anthropic', reviewerTool: 'Claude Code', reviewerModel: EXPECTED.model,
    invocationOrdinalAuthorized: 1, maximumInvocations: 1, retryAuthorized: false,
    package: { entries: 57, rawEvidenceBytes: packageInfo.payloadBytes, sourceManifestSha256: EXPECTED.sourceManifestSha256, detailedManifestSha256: packageManifestRecord.sha256, aggregateSha256: packageInfo.aggregateSha256 },
    authorizedMetadata: ['detailed package manifest', '57-line SHA file', 'checkpoint-64 review instructions', 'strict JSON schema', 'binary-safe ordinal/path/byte/hash framing'],
    excludedData: ['credentials and credential files', 'environment files and serialized environment values', 'unrelated files', 'client or personal information', 'all repository content outside the verified package'],
    excludedWork: ['runtime or oracle change', 'candidate allocation', 'C38', 'E2', 'A15', 'Phase 10B', 'deployment', 'reindexing', 'model migration', 'second invocation or retry'],
    statusBeforeInvocation: 'AUTHORIZED_NOT_YET_CONSUMED',
    pass: true,
  };

  atomicWriteNew(F.packageSha, packageShaText);
  atomicWriteNew(F.scopeValidation, stable(scopeValidation));
  atomicWriteNew(F.sensitiveScan, stable(sensitiveScan));
  atomicWriteNew(F.authorization, stable(authorization));
  atomicWriteNew(F.requestMd, request);
  atomicWriteNew(F.protectedVerification, stable(protectedVerification));
  atomicWriteNew(F.continuationPreflight, stable(preflight));

  const result = {
    classification: 'C37_CHECKPOINT_64_CONTINUATION_PACKAGE_READY',
    packageEntries: 57,
    rawEvidenceBytes: packageInfo.payloadBytes,
    packageManifestSha256: packageManifestRecord.sha256,
    packageAggregateSha256: packageInfo.aggregateSha256,
    requestSha256: sha(Buffer.from(request, 'utf8')),
    authorizationSha256: shaFile(F.authorization),
    pass: PREP_OUTPUTS.every((file) => fs.existsSync(file)),
  };
  process.stdout.write(`${stable(result)}`);
}

function buildSubmission(packageManifest, requestText) {
  const parts = [];
  const pushText = (text) => parts.push(Buffer.from(text, 'utf8'));
  pushText('=== AUTHORIZED C37 CHECKPOINT-64 REVIEW REQUEST METADATA BEGIN ===\n');
  pushText(requestText);
  pushText('\n=== AUTHORIZED C37 CHECKPOINT-64 REVIEW REQUEST METADATA END ===\n');
  pushText('=== AUTHORIZED C37 57-ENTRY PACKAGE MANIFEST METADATA BEGIN ===\n');
  pushText(fs.readFileSync(F.packageManifest, 'utf8'));
  pushText('=== AUTHORIZED C37 57-ENTRY PACKAGE MANIFEST METADATA END ===\n');
  pushText('=== AUTHORIZED C37 57-LINE SHA METADATA BEGIN ===\n');
  parts.push(fs.readFileSync(F.packageSha));
  pushText('=== AUTHORIZED C37 57-LINE SHA METADATA END ===\n');
  pushText('=== AUTHORIZED C37 57-ENTRY RAW EVIDENCE PACKAGE BEGIN ===\n');
  let evidenceBytes = 0;
  let entryMetadataBytes = 0;
  for (const entry of packageManifest.entries) {
    const header = `--- ENTRY ${entry.ordinal} OF 57 BEGIN ---\nPATH_UTF8=${entry.repositoryRelativePath}\nRAW_BYTES=${entry.bytes}\nSHA256=${entry.sha256}\nCONTENT_BYTES_BEGIN\n`;
    const footer = `\nCONTENT_BYTES_END\n--- ENTRY ${entry.ordinal} OF 57 END ---\n`;
    const headerBuffer = Buffer.from(header, 'utf8');
    const footerBuffer = Buffer.from(footer, 'utf8');
    const file = path.resolve(REPO, ...entry.repositoryRelativePath.split('/'));
    const data = fs.readFileSync(file);
    assert(data.length === entry.bytes && sha(data) === entry.sha256, `C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:PRE_SUBMISSION_${entry.ordinal}`);
    parts.push(headerBuffer, data, footerBuffer);
    evidenceBytes += data.length;
    entryMetadataBytes += headerBuffer.length + footerBuffer.length;
  }
  pushText('=== AUTHORIZED C37 57-ENTRY RAW EVIDENCE PACKAGE END ===\n');
  const buffer = Buffer.concat(parts);
  return {
    buffer,
    evidenceBytes,
    requestMetadataBytes: Buffer.byteLength(requestText, 'utf8'),
    packageManifestMetadataBytes: fs.statSync(F.packageManifest).size,
    packageShaMetadataBytes: fs.statSync(F.packageSha).size,
    entryMetadataBytes,
    totalStdinBytes: buffer.length,
    stdinSha256: sha(buffer),
  };
}

function repoReadOnlySnapshot(packageManifest) {
  const protectedFiles = [
    fileURLToPath(import.meta.url),
    ...packageManifest.entries.map((entry) => path.resolve(REPO, ...entry.repositoryRelativePath.split('/'))),
    F.checkpoint, F.numberedCheckpoint, F.checkpointReplay, F.checkpointLog,
    F.safePauseTerminal, F.safePauseReconciliation, F.safePauseDriver,
    F.delegationRecord, F.adjudicateRunner, F.preflightRunner, F.existingRequest,
    ...PREP_OUTPUTS,
  ];
  const unique = [...new Set(protectedFiles.map((file) => path.resolve(file)))].sort((a, b) => rel(a).localeCompare(rel(b)));
  const records = unique.map(fileRecord);
  const framing = records.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}\n`).join('');
  return {
    trackedTreeClean: git('status', '--porcelain=v1', '--untracked-files=no') === '',
    stagingEmpty: git('diff', '--cached', '--name-only') === '',
    fileCount: records.length,
    aggregateAlgorithm: 'POSIX path + NUL + bytes + NUL + SHA256 + LF in lexical path order; SHA256 UTF-8 framing.',
    aggregateSha256: sha(Buffer.from(framing, 'utf8')),
  };
}

function parseReviewerOutput(stdoutBuffer) {
  const text = stdoutBuffer.toString('utf8').replace(/^\uFEFF/, '').trim();
  const envelope = JSON.parse(text);
  let structured = envelope.structured_output ?? null;
  if (!structured && typeof envelope.result === 'string') structured = JSON.parse(envelope.result.trim());
  if (!structured && envelope && typeof envelope.decision === 'string') structured = envelope;
  assert(structured && typeof structured === 'object', 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE:NO_STRUCTURED_OUTPUT');
  return { envelope, structured };
}

function validateReview(review, packageManifest, schema) {
  const verificationValues = Object.values(review.verification || {});
  const approvalToken = review.decision === 'APPROVED' || review.decision === 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS';
  const pass = approvalToken
    && review.substantivePathDecision === 'NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED'
    && review.reviewedStateDigest === EXPECTED.sourceManifestSha256
    && review.reviewedPackageManifestSha256 === shaFile(F.packageManifest)
    && review.reviewedPackageAggregateSha256 === packageManifest.aggregateSha256
    && review.complete57EntryPackageReviewed === true
    && review.dataBeyondAuthorizedPackageReviewed === false
    && review.reviewerTool === 'Claude Code' && review.reviewerModel === EXPECTED.model
    && review.independenceConfirmed === true && review.readOnlyConfirmed === true
    && verificationValues.length === Object.keys(schema.properties.verification.properties).length
    && verificationValues.every((value) => value === true)
    && review.runtimeCandidateRequestedForC37 === false
    && Array.isArray(review.blockingFindings) && review.blockingFindings.length === 0
    && Array.isArray(review.nonblockingObservations)
    && review.commitSafe === true;
  return {
    approvalToken,
    requiredSubstantivePath: review.substantivePathDecision === 'NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED',
    allVerificationFieldsTrue: verificationValues.length === Object.keys(schema.properties.verification.properties).length && verificationValues.every((value) => value === true),
    noBlockingFindings: Array.isArray(review.blockingFindings) && review.blockingFindings.length === 0,
    pass,
  };
}

async function invoke() {
  for (const file of PREP_OUTPUTS) assert(fs.existsSync(file), `C37_TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER:MISSING_PREP:${rel(file)}`);
  for (const file of REVIEW_OUTPUTS) assert(!fs.existsSync(file), `C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE:INVOCATION_ALREADY_ATTEMPTED:${rel(file)}`);
  const packageManifest = readJson(F.packageManifest);
  assert(packageManifest.entryCount === 57 && packageManifest.entries.length === 57 && packageManifest.pass === true, 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:PRE_INVOKE_MANIFEST');
  assert(shaFile(F.packageSha) === EXPECTED.sourceManifestSha256 && fs.readFileSync(F.packageSha).equals(fs.readFileSync(F.sourceManifest)), 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:PRE_INVOKE_SHA');
  assert(readJson(F.scopeValidation).pass === true && readJson(F.sensitiveScan).pass === true && readJson(F.authorization).statusBeforeInvocation === 'AUTHORIZED_NOT_YET_CONSUMED', 'C37_OPUS_EXTERNAL_TRANSMISSION_SCOPE_BLOCKED:PRE_INVOKE_GATE');
  assert(git('rev-parse', 'HEAD') === EXPECTED.head && git('rev-parse', '@{upstream}') === EXPECTED.head && git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '', 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:PRE_INVOKE_GIT');
  const hygiene = inspectHygiene();
  assert(hygiene.nodeProcessesExcludingCurrentExecutor.length === 0 && hygiene.port5173Listeners.length === 0 && hygiene.temporaryRuntimes.length === 0 && hygiene.locks.length === 0, 'C37_CHECKPOINT_64_CONTINUITY_MISMATCH:PRE_INVOKE_HYGIENE');
  const cliVersion = execFileSync(CLI, ['--version'], { encoding: 'utf8' }).trim();
  assert(cliVersion === EXPECTED.cliVersion, 'C37_TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER:CLI_VERSION');
  const requestText = fs.readFileSync(F.requestMd, 'utf8');
  const schema = outputSchema(shaFile(F.packageManifest), packageManifest.aggregateSha256);
  const submission = buildSubmission(packageManifest, requestText);
  assert(submission.evidenceBytes === EXPECTED.packageBytes, 'C37_OPUS_57_ENTRY_PACKAGE_MISMATCH:SUBMISSION_BYTES');

  const isolatedRoot = fs.mkdtempSync('C:/tmp/c37-opus-review-');
  const runtimeTemp = fs.mkdtempSync('C:/tmp/c37-opus-runtime-');
  const rootPrefix = `${path.resolve('C:/tmp')}${path.sep}`.toLowerCase();
  assert(path.resolve(isolatedRoot).toLowerCase().startsWith(rootPrefix) && path.basename(isolatedRoot).startsWith('c37-opus-review-'), 'C37_TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER:TEMP_ROOT');
  assert(path.resolve(runtimeTemp).toLowerCase().startsWith(rootPrefix) && path.basename(runtimeTemp).startsWith('c37-opus-runtime-'), 'C37_TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER:RUNTIME_TEMP_ROOT');

  const systemPrompt = 'You are the sole independent C37 reviewer. Treat stdin as the complete authorized record. No tools are available. Do not inspect the filesystem, environment, credentials, settings, network, repository, parent directories, or any data outside stdin. Do not invoke another model or agent. Perform a read-only review and return only the strict schema-conforming JSON object.';
  const args = [
    '--print', '--model', EXPECTED.model, '--effort', 'max',
    '--permission-mode', 'plan', '--safe-mode', '--no-session-persistence',
    '--no-chrome', '--strict-mcp-config', '--mcp-config', '{}',
    '--disable-slash-commands', '--tools', '', '--output-format', 'json',
    '--json-schema', JSON.stringify(schema), '--system-prompt', systemPrompt,
  ];
  const safeCommand = [CLI, ...args.map((arg, index) => (args[index - 1] === '--json-schema' ? `<JSON_SCHEMA_SHA256:${sha(Buffer.from(arg, 'utf8'))}>` : args[index - 1] === '--system-prompt' ? `<SYSTEM_PROMPT_SHA256:${sha(Buffer.from(arg, 'utf8'))}>` : arg))];
  const beforeSnapshot = repoReadOnlySnapshot(packageManifest);
  const startedUtc = now();
  const marker = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_FINAL_OPUS_INVOCATION_MARKER_SUBMISSION_IMMINENT',
    checkpoint: { ordinal: 64, path: rel(F.checkpoint), sha256: EXPECTED.checkpointSha256, eventSha256: EXPECTED.checkpointEventSha256 },
    committedHead: EXPECTED.head,
    package: { count: 57, sourceManifestSha256: EXPECTED.sourceManifestSha256, detailedManifestSha256: shaFile(F.packageManifest), aggregateSha256: packageManifest.aggregateSha256, rawEvidenceBytes: EXPECTED.packageBytes },
    finalRequest: fileRecord(F.requestMd),
    externalTransmissionAuthorization: fileRecord(F.authorization),
    cli: { executablePath: CLI, bytes: fs.statSync(CLI).size, sha256: shaFile(CLI), version: cliVersion },
    model: EXPECTED.model, mode: 'read-only', invocationOrdinal: 1, maximumInvocations: 1,
    retryAuthorized: false, startedUtc, stdinBytes: submission.totalStdinBytes, stdinSha256: submission.stdinSha256,
    isolatedWorkingDirectoryCreated: true, toolsExposedToReviewer: [],
    preExistingNonC37ClaudeProcesses: hygiene.preExistingClaudeProcesses,
    repositorySnapshotBeforeMarker: beforeSnapshot,
  };
  atomicWriteNew(F.marker, stable(marker));
  const snapshotAfterMarker = repoReadOnlySnapshot(packageManifest);

  const stdoutChunks = [];
  const stderrChunks = [];
  let child = null;
  let spawnError = null;
  let exitCode = null;
  let signal = null;
  let submitted = false;
  try {
    const childEnv = {};
    for (const name of ['SystemRoot', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA']) {
      if (process.env[name]) childEnv[name] = process.env[name];
    }
    childEnv.TEMP = runtimeTemp;
    childEnv.TMP = runtimeTemp;
    childEnv.NO_COLOR = '1';
    childEnv.CLAUDE_CODE_SAFE_MODE = '1';
    child = spawn(CLI, args, { cwd: isolatedRoot, env: childEnv, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.stdin.on('error', (error) => { if (!spawnError) spawnError = error; });
    child.stdin.end(submission.buffer);
    submitted = true;
    const result = await new Promise((resolve) => {
      child.once('error', (error) => resolve({ error }));
      child.once('close', (code, childSignal) => resolve({ code, signal: childSignal }));
    });
    if (result.error) spawnError = result.error;
    exitCode = result.code ?? null;
    signal = result.signal ?? null;
  } catch (error) {
    spawnError = error;
  }
  const endedUtc = now();
  const stdoutBuffer = Buffer.concat(stdoutChunks);
  const stderrBuffer = Buffer.concat(stderrChunks);
  const afterSnapshot = repoReadOnlySnapshot(packageManifest);
  const repositoryUnchanged = beforeSnapshot.aggregateSha256 === afterSnapshot.aggregateSha256 && afterSnapshot.trackedTreeClean && afterSnapshot.stagingEmpty;

  let parsed = null;
  let parseError = null;
  let reviewGate = null;
  try {
    assert(submitted && !spawnError && exitCode === 0 && signal === null, 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE:CLI');
    parsed = parseReviewerOutput(stdoutBuffer);
    reviewGate = validateReview(parsed.structured, packageManifest, schema);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  atomicWriteNew(F.stdout, stdoutBuffer);
  atomicWriteNew(F.stderr, stderrBuffer);
  if (parsed?.structured) atomicWriteNew(F.reviewJson, stable(parsed.structured));
  else atomicWriteNew(F.reviewJson, stable({ decision: 'INCOMPLETE_REVIEW', substantivePathDecision: 'MORE_EVIDENCE_REQUIRED', classification: 'C37_OPUS_TECHNICAL_INCOMPLETE_SYNTHETIC_CAPTURE_ONLY', technicalError: parseError, note: 'This is executor adjudication because no valid schema-conforming reviewer object was available; it is not a second reviewer response.' }));

  const review = parsed?.structured ?? readJson(F.reviewJson);
  const reviewMd = `# C37 final Opus review\n\n- CLI status: ${!spawnError && exitCode === 0 ? 'completed' : 'technical incomplete'}\n- Decision: \`${review.decision ?? 'INCOMPLETE_REVIEW'}\`\n- Substantive path: \`${review.substantivePathDecision ?? 'MORE_EVIDENCE_REQUIRED'}\`\n- Complete 57-entry package reviewed: ${review.complete57EntryPackageReviewed === true}\n- Approval gates: ${reviewGate?.pass === true ? 'PASS' : 'FAIL'}\n- Authorization consumed: ${submitted}\n- Retry authorized: false\n- Blocking findings: ${JSON.stringify(review.blockingFindings ?? [])}\n- Nonblocking observations: ${JSON.stringify(review.nonblockingObservations ?? [])}\n- Technical parse/CLI error: ${parseError ?? 'none'}\n`;
  atomicWriteNew(F.reviewMd, reviewMd);

  const capture = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: reviewGate?.pass ? 'C37_FINAL_OPUS_REVIEW_CLI_CAPTURE_APPROVAL_GATES_PASS' : 'C37_FINAL_OPUS_REVIEW_CLI_CAPTURE_NOT_APPROVED',
    commandWithoutCredentials: safeCommand,
    commandLineContainsEvidenceOrCredentials: false,
    reviewerTool: 'Claude Code', model: EXPECTED.model, cliVersion,
    startedUtc, endedUtc, exitCode, signal,
    spawnError: spawnError ? (spawnError instanceof Error ? spawnError.message : String(spawnError)) : null,
    submissionCompletedToChildStdin: submitted,
    authorizationConsumed: submitted,
    request: fileRecord(F.requestMd),
    package: { count: 57, aggregateSha256: packageManifest.aggregateSha256, manifestSha256: shaFile(F.packageManifest), rawEvidenceBytes: EXPECTED.packageBytes },
    stdin: {
      evidenceBytes: submission.evidenceBytes,
      requestMetadataBytes: submission.requestMetadataBytes,
      packageManifestMetadataBytes: submission.packageManifestMetadataBytes,
      packageShaMetadataBytes: submission.packageShaMetadataBytes,
      entryMetadataBytes: submission.entryMetadataBytes,
      totalStdinBytes: submission.totalStdinBytes,
      stdinSha256: submission.stdinSha256,
      rawSubmissionBufferRetainedInCapture: false,
    },
    response: { stdout: fileRecord(F.stdout), stderr: fileRecord(F.stderr), envelopeSha256: sha(stdoutBuffer), parsed: parsed !== null, parseError },
    firstDecisionToken: review.decision ?? null,
    substantivePathToken: review.substantivePathDecision ?? null,
    observations: review.nonblockingObservations ?? [],
    repositorySnapshotAfterMarker: snapshotAfterMarker,
    repositorySnapshotAfterInvocation: afterSnapshot,
    repositoryProtectedAndTrackedStateUnchanged: repositoryUnchanged,
    reviewGate,
    retryAuthorized: false,
    pass: reviewGate?.pass === true && repositoryUnchanged,
  };
  atomicWriteNew(F.capture, stable(capture));

  const receipt = {
    schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: submitted ? 'C37_FINAL_OPUS_SINGLE_TRANSMISSION_RECEIPT' : 'C37_FINAL_OPUS_SUBMISSION_NOT_COMPLETED',
    externalServiceProvider: 'Anthropic', reviewerTool: 'Claude Code', reviewerModel: EXPECTED.model,
    authorization: { ...fileRecord(F.authorization), invocationOrdinal: 1, maximumInvocations: 1, consumed: submitted, retryAuthorized: false },
    transmissionStartedUtc: startedUtc, transmissionEndedUtc: endedUtc,
    exactApplicationPayload: {
      inputMethod: 'binary-safe child stdin',
      totalStdinBytes: submission.totalStdinBytes, stdinSha256: submission.stdinSha256,
      exactEvidenceEntryCount: 57, exactRawEvidenceBytes: submission.evidenceBytes,
      requestMetadataBytes: submission.requestMetadataBytes,
      detailedManifestMetadataBytes: submission.packageManifestMetadataBytes,
      shaManifestMetadataBytes: submission.packageShaMetadataBytes,
      entryFramingMetadataBytes: submission.entryMetadataBytes,
      jsonSchemaBytes: Buffer.byteLength(JSON.stringify(schema), 'utf8'),
      systemPromptBytes: Buffer.byteLength(systemPrompt, 'utf8'),
      evidenceFilesIncludedByteForByte: true,
      evidenceBeyondAuthorized57EntryPackageIncluded: false,
      authorizedRequestAndFramingMetadataIncluded: true,
      credentialsEnvironmentFilesOrClientDataIncludedInApplicationPayload: false,
    },
    transportQualification: 'Exact application stdin and explicit metadata bytes are observable and recorded. Provider protocol framing, built-in service authentication headers, and exact wire byte count are internal to Claude Code and were neither exposed nor captured.',
    filesystemAndToolIsolation: { isolatedEmptyWorkingDirectory: true, safeMode: true, sessionPersistence: false, toolsExposed: [], repositoryPathExposedToReviewer: false, parentDirectoryReadsRequested: false },
    dataBeyondAuthorizedPackageTransmitted: false,
    note: 'The false value excludes explicitly authorized request/package framing metadata and ordinary opaque provider authentication/protocol mechanics; no credential value or environment-file content was placed in the review payload or evidence.',
    cliExitCode: exitCode, signal, responseSha256: sha(stdoutBuffer), firstDecisionToken: review.decision ?? null,
    substantivePathToken: review.substantivePathDecision ?? null, observations: review.nonblockingObservations ?? [],
    authorizationStatusAfterInvocation: submitted ? 'CONSUMED_NO_RETRY_AUTHORIZED' : 'NOT_SUBMITTED',
    pass: submitted && repositoryUnchanged,
  };
  atomicWriteNew(F.receipt, stable(receipt));

  let cleanupError = null;
  try {
    for (const target of [isolatedRoot, runtimeTemp]) {
      const resolved = path.resolve(target);
      assert(resolved.toLowerCase().startsWith(rootPrefix) && /^c37-opus-(?:review|runtime)-/.test(path.basename(resolved)), 'C37_TWO_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER:CLEANUP_SCOPE');
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error);
  }

  const result = {
    classification: reviewGate?.pass && repositoryUnchanged && !cleanupError
      ? 'C37_OPUS_APPROVED_FINALIZATION_AUTHORIZED'
      : review.decision === 'REJECTED'
        ? 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_REJECTED'
        : review.substantivePathDecision === 'MORE_EVIDENCE_REQUIRED'
          ? 'C37_TWO_HOUR_SAFE_PAUSE_MORE_EVIDENCE_REQUIRED'
          : 'C37_TWO_HOUR_SAFE_PAUSE_OPUS_TECHNICAL_INCOMPLETE',
    exitCode, signal, decision: review.decision ?? null,
    substantivePathDecision: review.substantivePathDecision ?? null,
    reviewGatePass: reviewGate?.pass === true,
    repositoryUnchanged, authorizationConsumed: submitted,
    retryAuthorized: false, cleanupError,
  };
  process.stdout.write(stable(result));
  if (!(reviewGate?.pass && repositoryUnchanged && !cleanupError)) process.exitCode = 2;
}

const mode = process.argv[2];
if (mode === '--prepare') prepare();
else if (mode === '--invoke') await invoke();
else throw new Error('Usage: node COMMIT_5R1C37_CHECKPOINT_64_CONTINUATION_DRIVER.mjs --prepare|--invoke');
