// Checkpoint 71: checkpoint-70 prepared transport is byte-identical but cannot
// enter --invoke while its protected checkpoint-69 final-preflight output exists.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const RESULTS = path.dirname(SELF);
const REPO = path.resolve(RESULTS, '../../..');
const R = (name) => path.join(RESULTS, name);
const F = Object.freeze({
  prompt: 'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C37-FOUR-HOUR-DIRECT-OPUS-REVIEW-AND-COMPLETION-FROM-CHECKPOINT-70.md',
  cp70: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_70_transport_prepared_token_reserve_safe_pause_pre_invocation.json'),
  replay70: R('COMMIT_5R1C37_CHECKPOINT_70_IDEMPOTENCE_REPLAY.json'),
  evidence70: R('COMMIT_5R1C37_CHECKPOINT_70_TRANSPORT_PREPARED_TOKEN_SAFE_PAUSE_EVIDENCE.sha256'),
  handoff70: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_70.md'),
  directPreflight: R('COMMIT_5R1C37_CHECKPOINT_70_DIRECT_COMPLETION_PREFLIGHT.json'),
  authorization: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_EXTERNAL_AUTHORIZATION.json'),
  ledger: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson'),
  runner: path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c37-checkpoint69-opus.mjs'),
  finalPreflight69: R('COMMIT_5R1C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json'),
  sourceManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  detailedManifest: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  capsule: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.json'),
  coverage: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_COVERAGE_VALIDATION.json'),
  roleLedger: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ROLE_LEDGER.json'),
  allowlist: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ALLOWLIST.json'),
  toolPlan: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_PLAN.json'),
  toolValidation: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_VALIDATION.json'),
  bootstrapJson: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_BOOTSTRAP.json'),
  bootstrapMd: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_BOOTSTRAP.md'),
  contextProjection: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_CONTEXT_PROJECTION.json'),
  transportPreflight: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_TRANSPORT_PREFLIGHT.json'),
  protectedBaseline: R('COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
  protected68: R('COMMIT_5R1C37_CHECKPOINT_68_PROTECTED_RESIDUE_VERIFICATION.json'),
  protected69: R('COMMIT_5R1C37_CHECKPOINT_69_PROTECTED_RESIDUE_VERIFICATION.json'),
  registry: R('CANONICAL_ATTEMPT_REGISTRY.json'),
  c34Wal: R('COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),
  c35Wal: R('COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'),
  roadmap: path.join(REPO, 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md'),
  currentState: path.join(REPO, 'knowledge/CURRENT_STATE.md'),
  reconciliation: R('COMMIT_5R1C37_CHECKPOINT_71_PREPARED_TRANSPORT_MISMATCH_RECONCILIATION.json'),
  terminal: R('COMMIT_5R1C37_CHECKPOINT_71_PREPARED_TRANSPORT_MISMATCH_TERMINAL_STATE.json'),
  handoff71: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_71.md'),
  evidence71: R('COMMIT_5R1C37_CHECKPOINT_71_PREPARED_TRANSPORT_MISMATCH_EVIDENCE.sha256'),
  numbered71: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_71_prepared_transport_mismatch_pre_invocation.json'),
  replay71: R('COMMIT_5R1C37_CHECKPOINT_71_IDEMPOTENCE_REPLAY.json'),
  pointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
});

const CLASSIFICATION = 'C37_CHECKPOINT_70_PREPARED_TRANSPORT_MISMATCH';
const NEXT_EXACT = 'Start a separately governed continuation from checkpoint 71 that explicitly authorizes only a compatible invocation mechanism for the prepared runner checkpoint-69 final-preflight output binding. Preserve the completed capsule, package, bootstrap, 63 Read rules, nine spot checks, isolated MCP configuration, all existing evidence, and the still-unused manifest-indexed authorization. Revalidate the corrected invocation boundary before any marker or substantive submission; do not begin C38 or any later work.';
const EXPECTED = Object.freeze({
  prompt: '74df610ea1d7ed16cac942636a0630e3d0c2bbeebad40932e046bd3829293447',
  cp70: '4d7503bc4139dc0b5978e0afd47ac21f45e46861ac0512bfe7893660e60d7318',
  replay70: 'e467f4aa6b029a31eda8b1d89f3766ab05c818c3104e9d9750902f8318222f0e',
  evidence70: 'bc44bd1065e7f762f3fd4a35f0db9be836502dfabdd0eb06a1daf81846472738',
  handoff70: '633bbc89be409feb8896b79f773185ebdbfc91ca8520dc6b466a4e8d7bc39c2f',
  directPreflight: 'de32b5c4289e3f667885b8c80e38329f3f07197c2d6c1e4f4c5d99e68875ca49',
  authorization: '5261030505f27dbd9a1450b16d75876aa2141cf741bd83957ed50e8746bf5d44',
  runner: '87643d1079ff622617f4ede77d9497287f98e6df90a85f4b4dd0ddbd4db0c795',
  finalPreflight69: '6cd7062020d06ba7acdd71b52e8058e110b407ed7a22246b0f52c2856bb6cd1f',
  sourceManifest: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  detailedManifest: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0',
  packageAggregate: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',
  capsule: '7f223fe8386fcb23d1f2ecec4254ca44ee753fb2479fefb9c1d897ee767cf30f',
  coverage: 'c96fc58d459118dcc84a6492feb439e16e4677d8c34962e4450db3824e464799',
  roleLedger: '34cd2c404033581643540ba98ebe67266487a049d8aeec216841854937e0d860',
  allowlist: '069a873a90f5d339bd7c37b41e96b7fb07c1b2bb0fecfdc3b1b5d1ce5523469e',
  toolPlan: 'f8ec634e78016e1a19548c613922a45b3ffb62aeecde7f4654dc240d96f66d3e',
  toolValidation: 'f20bea8102cc23d8c4a17f8003d2634b8e85bc5bb41c281c875509522eabc10e',
  bootstrapJson: 'e58cd332e13718932e4820d0394cd089189028f0d74162958afe50fc32a23d43',
  bootstrapMd: '3c876ad0ce5e783df5c13bd04ad687b0bb10c928f65325b17686286691bc05dc',
  contextProjection: '700894ec8a0b813a391522b587236736814a758097e54392b616a9b542119494',
  transportPreflight: '7f8b18b8edbfbc2b95c88a8b589b4415821a2abbfd9caa284a922c13efd80d7f',
  protectedAggregate: '980cd3b5f2a5b75104bc91c9e6f4391e80bf5f0d772f48b61c79497e3d2ebd0a',
  c35Composite: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c',
  c34Reason: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  registry: 'a0261acfcc4cc69615794fe6f26117c00789d42862a75fae3e978b2e17a1e073',
  c34Wal: '2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2',
  c35Wal: 'd86f6fb331fa6010365debc13b7417704e4c71402af8803775744f00eef9260f',
  roadmap: '3a829e69216addfdcad0f45e975475c3b4b006bfc2481e6745157585bfeeec54',
  currentState: 'f53cf577c7b4a979b563f6a22b96b9f30164608a79de5054ead05c63016d6aa0',
  ledger14: '9c3e8a548dfdb44c63de785e442095e329fdff2688cc7b41336f560bf6f935ed',
  log70: 'cef841acc47d0b3c26909ef2074b7ac167e43cf458462b0bf2bd8f9bea70c6c4',
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
});

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const record = (file) => { const data = fs.readFileSync(file); return { path: rel(file), bytes: data.length, sha256: sha(data) }; };
const assert = (condition, code) => { if (!condition) throw new Error(`CHECKPOINT_71_BLOCKED:${code}`); };
const lines = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: 'utf8', windowsHide: true,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_GLOBAL: 'NUL' } }).trim();

function writeNew(file, value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const fd = fs.openSync(file, 'wx');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return record(file);
}

function writeOrVerify(file, value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  if (!fs.existsSync(file)) return writeNew(file, data);
  assert(fs.readFileSync(file).equals(data), `PARTIAL_RECOVERY_MISMATCH:${rel(file)}`);
  return record(file);
}

function replaceUnboundEvidence(file, value) {
  const data = Buffer.from(value, 'utf8');
  if (!fs.existsSync(file)) return writeNew(file, data);
  assert(!fs.existsSync(F.numbered71) && !fs.existsSync(F.replay71), 'EVIDENCE_ALREADY_BOUND');
  const fd = fs.openSync(file, 'w');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return record(file);
}

function validateManifest(file, expectedCount) {
  const rows = lines(file).map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `MANIFEST_LINE_${index + 1}`);
    const target = path.resolve(REPO, ...match[2].replaceAll('\\', '/').split('/'));
    const actual = fs.existsSync(target) ? record(target).sha256 : null;
    return { path: match[2].replaceAll('\\', '/'), expected: match[1], present: fs.existsSync(target), actual };
  });
  assert(rows.length === expectedCount, `MANIFEST_COUNT:${rows.length}:${expectedCount}`);
  return { rows: rows.length, present: rows.filter((x) => x.present).length,
    matching: rows.filter((x) => x.actual === x.expected).length,
    bad: rows.filter((x) => x.actual !== x.expected), pass: rows.every((x) => x.actual === x.expected) };
}

function validatePackage() {
  const rows = lines(F.sourceManifest).map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `PACKAGE_MANIFEST_LINE_${index + 1}`);
    const target = path.resolve(REPO, ...match[2].replaceAll('\\', '/').split('/'));
    const item = record(target);
    return { ordinal: index + 1, ...item, expectedSha256: match[1], pass: item.sha256 === match[1] };
  });
  const rawBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
  const aggregateSha256 = sha(Buffer.from(rows.map((row) => `${row.ordinal}\0${row.path}\0${row.bytes}\0${row.sha256}\n`).join(''), 'utf8'));
  assert(rows.length === 57 && rows.every((row) => row.pass) && rawBytes === 4109852 && aggregateSha256 === EXPECTED.packageAggregate, 'PACKAGE_57');
  return { entries: rows.length, present: rows.length, verifiedHashes: rows.length, rawBytes, aggregateSha256, pass: true };
}

function validateProtected() {
  const baseline = readJson(F.protectedBaseline);
  const records = [...baseline.records, ...baseline.protectedTrackedControls].map((expected) => {
    const target = path.resolve(REPO, ...expected.path.replaceAll('\\', '/').split('/'));
    const actual = record(target);
    return { ...actual, expectedBytes: expected.bytes, expectedSha256: expected.sha256,
      pass: actual.bytes === expected.bytes && actual.sha256 === expected.sha256 };
  });
  const untracked = records.slice(0, baseline.records.length);
  const aggregateSha256 = sha(Buffer.from(untracked.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join(''), 'utf8'));
  const components = ['ask-handler.js', 'conflict-engine.js', 'services/answer-support-evidence.js', 'services/answer-support-validator.js']
    .sort().map((name) => record(path.join(REPO, name)));
  const c35CompositeSha256 = sha(Buffer.from(components.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join(''), 'utf8'));
  const protected68 = readJson(F.protected68);
  const registry = record(F.registry);
  const c34Wal = record(F.c34Wal);
  const c35Wal = record(F.c35Wal);
  const pass = records.length === 22 && records.every((row) => row.pass) && aggregateSha256 === EXPECTED.protectedAggregate
    && c35CompositeSha256 === EXPECTED.c35Composite && protected68.runtime.selectedC34ReasonRuntimeSha256 === EXPECTED.c34Reason
    && registry.sha256 === EXPECTED.registry && c34Wal.sha256 === EXPECTED.c34Wal && c35Wal.sha256 === EXPECTED.c35Wal
    && !fs.existsSync(R('COMMIT_5R1C36_ATTEMPT_ALLOCATION_WAL.ndjson')) && !fs.existsSync(R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson'));
  assert(pass, 'PROTECTED_RUNTIME_ORACLE_FIXTURE_REGISTRY_WAL');
  return { baseline: record(F.protectedBaseline), recordsChecked: records.length, missingOrMismatch: records.filter((row) => !row.pass),
    aggregateSha256, c35: { components, compositeSha256: c35CompositeSha256 }, selectedC34ReasonRuntimeSha256: EXPECTED.c34Reason,
    registry, c34Wal, c35Wal, c36WalAbsent: true, c37WalAbsent: true, pass };
}

function hygiene() {
  const script = `$ErrorActionPreference='Stop';$nodes=@(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"|Select-Object ProcessId,CommandLine);$claudes=@(Get-CimInstance Win32_Process -Filter "Name = 'claude.exe'"|Select-Object ProcessId,ExecutablePath,CommandLine);$listeners=@(netstat -ano -p TCP|Where-Object{($_.Trim()-split '\\s+')[1]-match':5173$'-and($_.Trim()-split '\\s+')[3]-eq'LISTENING'});[ordered]@{otherNodePids=@($nodes|Where-Object{$_.ProcessId-ne ${process.pid}}|ForEach-Object{$_.ProcessId});taskClaudePids=@($claudes|Where-Object{$_.ExecutablePath-match'AppData\\\\Roaming\\\\npm\\\\node_modules\\\\@anthropic-ai\\\\claude-code'}|ForEach-Object{$_.ProcessId});vscodeClaudePids=@($claudes|Where-Object{$_.ExecutablePath-match'\\.vscode\\\\extensions\\\\anthropic\\.claude-code'}|ForEach-Object{$_.ProcessId});port5173=$listeners.Count}|ConvertTo-Json`;
  const state = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true }));
  state.validationTempExists = fs.existsSync('C:/tmp/c37-manifest-indexed-checkpoint69-validation');
  state.invocationTempExists = fs.existsSync('C:/tmp/c37-manifest-indexed-checkpoint69-invocation');
  state.indexLockExists = fs.existsSync(path.join(REPO, '.git/index.lock'));
  state.taskServiceCount = 0;
  state.pass = state.otherNodePids.length === 0 && state.taskClaudePids.length === 0 && state.vscodeClaudePids.includes(24136)
    && state.port5173 === 0 && !state.validationTempExists && !state.invocationTempExists && !state.indexLockExists;
  assert(state.pass, 'HYGIENE');
  return state;
}

for (const file of [F.numbered71, F.replay71]) assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
assert(record(F.prompt).sha256 === EXPECTED.prompt, 'PROMPT');
assert(record(F.cp70).sha256 === EXPECTED.cp70 && fs.readFileSync(F.pointer).equals(fs.readFileSync(F.cp70)), 'CHECKPOINT_70_POINTER');
assert(record(F.replay70).sha256 === EXPECTED.replay70 && readJson(F.replay70).pass === true, 'REPLAY_70');
assert(record(F.evidence70).sha256 === EXPECTED.evidence70, 'EVIDENCE_70_HASH');
const evidence70BeforeAppend = validateManifest(F.evidence70, 27);
assert(evidence70BeforeAppend.pass, 'EVIDENCE_70_PRE_APPEND');
assert(record(F.handoff70).sha256 === EXPECTED.handoff70, 'HANDOFF_70');

const direct = readJson(F.directPreflight);
assert(record(F.directPreflight).sha256 === EXPECTED.directPreflight
  && direct.classification === CLASSIFICATION && direct.pass === false
  && direct.contextMeasurement.gatePass === true && direct.contextMeasurement.calculatedEffectiveRemainingTokens === 222171
  && direct.preparedTransport.runner.byteIdentityPass === true && direct.preparedTransport.runner.continuationInvocationReady === false,
  'DIRECT_PREFLIGHT');

const cp70 = readJson(F.cp70);
assert(cp70.ordinal === 70 && cp70.safeToResume === true && cp70.activeAttemptId === null
  && cp70.eventSha256 === '05625e0b2f38585feeca762c0e4710a1030267f4cab9df590f5716897f9215a6', 'CHECKPOINT_70');
const authorization = readJson(F.authorization);
assert(record(F.authorization).sha256 === EXPECTED.authorization
  && authorization.newAuthorization.status === 'AUTHORIZED_UNUSED' && authorization.authorizationConsumed === false
  && authorization.newAuthorization.maximumInvocations === 1 && authorization.newAuthorization.retryAuthorized === false
  && authorization.invocationMarkerExists === false, 'AUTHORIZATION_UNUSED');

assert(record(F.runner).bytes === 79610 && record(F.runner).sha256 === EXPECTED.runner, 'RUNNER_IDENTITY');
assert(record(F.finalPreflight69).bytes === 5290 && record(F.finalPreflight69).sha256 === EXPECTED.finalPreflight69, 'PROTECTED_FINAL_PREFLIGHT');
const runnerText = fs.readFileSync(F.runner, 'utf8');
assert(runnerText.includes("finalPreflight: R('COMMIT_5R1C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json')")
  && runnerText.includes('const INVOCATION_OUTPUTS = [F.finalPreflight')
  && runnerText.includes("for (const file of INVOCATION_OUTPUTS) assert(!fs.existsSync(file), `EXACT_ONCE_OUTPUT_EXISTS:${rel(file)}`);"),
  'RUNNER_OUTPUT_COLLISION_PROOF');
for (const name of ['COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json', 'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_CLI_CAPTURE.json',
  'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_STDOUT.txt', 'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_STDERR.txt',
  'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW.json', 'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW.md',
  'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_TRANSMISSION_RECEIPT.json', 'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW_COVERAGE.json']) {
  assert(!fs.existsSync(R(name)), `UNEXPECTED_INVOCATION_OUTPUT:${name}`);
}

const preparedExpected = [[F.sourceManifest, EXPECTED.sourceManifest], [F.detailedManifest, EXPECTED.detailedManifest], [F.capsule, EXPECTED.capsule],
  [F.coverage, EXPECTED.coverage], [F.roleLedger, EXPECTED.roleLedger], [F.allowlist, EXPECTED.allowlist], [F.toolPlan, EXPECTED.toolPlan],
  [F.toolValidation, EXPECTED.toolValidation], [F.bootstrapJson, EXPECTED.bootstrapJson], [F.bootstrapMd, EXPECTED.bootstrapMd],
  [F.contextProjection, EXPECTED.contextProjection], [F.transportPreflight, EXPECTED.transportPreflight]];
for (const [file, expected] of preparedExpected) assert(record(file).sha256 === expected, `PREPARED_IDENTITY:${rel(file)}`);
const packageState = validatePackage();
const protectedState = validateProtected();
assert(record(F.protected69).sha256 === 'd9941d2750a52bfa7fe4c2f159c1bb2b454a9d5376330a90325b8c1914ee68f7', 'PROTECTED_69');
assert(record(F.roadmap).sha256 === EXPECTED.roadmap && record(F.currentState).sha256 === EXPECTED.currentState, 'GOVERNING_DOCUMENTS_UNCHANGED');

const head = git('rev-parse', 'HEAD');
const upstream = git('rev-parse', '@{upstream}');
const fetchHead = git('rev-parse', 'FETCH_HEAD');
const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').split(/\s+/).map(Number);
assert(head === EXPECTED.head && upstream === head && fetchHead === head && ahead === 0 && behind === 0, 'GIT_IDENTITY');
assert(git('status', '--porcelain=v1', '--untracked-files=no') === '' && git('diff', '--cached', '--name-only') === '', 'GIT_CLEAN');
const processHygiene = hygiene();

const registry = readJson(F.registry);
assert(registry.summary.totalAttempts === 230 && registry.summary.orphan === 0 && registry.summary.dangling === 0
  && registry.summary.c34RunningAttemptIds.length === 0 && registry.summary.c35RunningAttemptIds.length === 0, 'ATTEMPT_REGISTRY_STATE');
const c34WalLines = lines(F.c34Wal).length;
const c35WalLines = lines(F.c35Wal).length;
assert(c34WalLines === 32 && c35WalLines === 6, 'WAL_COUNTS');

const ledgerBytesBefore = fs.readFileSync(F.ledger);
const ledgerRows = lines(F.ledger).map(JSON.parse);
assert([14, 15].includes(ledgerRows.at(-1).sequence), 'LEDGER_SEQUENCE');
const ledgerPrefix = Buffer.from(`${ledgerRows.slice(0, 14).map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
assert(sha(ledgerPrefix) === EXPECTED.ledger14, 'LEDGER_14_PREFIX');
const generatedUtc = direct.contextMeasurement.eventTimestampUtc;
const ledger15 = {
  schemaVersion: 1, sequence: 15, timestampUtc: generatedUtc,
  measurementPoint: 'CHECKPOINT_70_DIRECT_COMPLETION_PREINVOCATION_TRANSPORT_COMPATIBILITY_GATE',
  currentOperation: 'Checkpoint-70 continuity and final context gate passed; the byte-identical prepared runner was proven unable to enter --invoke because its protected checkpoint-69 final-preflight output already exists',
  nextProposedAtomicOperation: 'Create checkpoint 71 prepared-transport-mismatch reconciliation and exact resumption handoff without consuming the authorization',
  telemetryAvailable: true, contextCapacityAvailable: true, modelConfiguredContextCapacityTokens: 272000,
  effectiveSessionContextWindowTokens: 258400, telemetryReportedActiveContextTokens: 36229,
  calculatedEffectiveRemainingTokens: 222171, calculatedEffectiveRemainingPercentage: Number((100 * 222171 / 258400).toFixed(4)),
  requiredPreSubmissionRemainingTokens: 120000, headroomAbovePreSubmissionRequirementTokens: 102171,
  requiredSafePauseReserveTokens: 54400, headroomAboveReserveTokens: 167771,
  decision: 'SAFE_PAUSE_PRE_INVOCATION_PREPARED_TRANSPORT_MISMATCH', method: direct.contextMeasurement.method,
  telemetrySource: `${direct.contextMeasurement.sessionFile} line ${direct.contextMeasurement.latestTokenEventLine} at ${direct.contextMeasurement.eventTimestampUtc}`,
  automaticCompactionObserved: true, stateIntegrity: 'PASS', directPreflight: record(F.directPreflight),
  preparedTransport: { runner: record(F.runner), finalPreflight69: record(F.finalPreflight69), toolPlan: record(F.toolPlan),
    toolValidation: record(F.toolValidation), bootstrap: record(F.bootstrapMd), contextProjection: record(F.contextProjection),
    transportPreflight: record(F.transportPreflight), byteIdentityPass: true, continuationInvocationReady: false },
  manifestIndexedAuthorizationStatus: 'AUTHORIZED_UNUSED', manifestIndexedInvocationCount: 0,
  manifestIndexedInvocationMarkerExists: false, providerRequestObserved: false, modelRequestSubmitted: false,
  requiredClassification: CLASSIFICATION,
};
if (ledgerRows.length === 14) {
  assert(sha(ledgerBytesBefore) === EXPECTED.ledger14, 'LEDGER_14_FULL_HASH');
  const fd = fs.openSync(F.ledger, 'a');
  try { fs.writeFileSync(fd, `${JSON.stringify(ledger15)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
} else assert(stable(ledgerRows[14]) === stable(ledger15), 'LEDGER_15_PARTIAL_RECOVERY_MISMATCH');
assert(lines(F.ledger).map(JSON.parse).at(-1).sequence === 15, 'LEDGER_APPEND');

const evidence70AfterAppend = validateManifest(F.evidence70, 27);
const evidence70BadPaths = evidence70AfterAppend.bad.map((row) => row.path);
assert(evidence70AfterAppend.present === 27 && evidence70AfterAppend.matching === 26
  && evidence70BadPaths.join(',') === 'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson', 'EVIDENCE_70_APPEND_ONLY');

const reconciliation = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: CLASSIFICATION, generatedUtc,
  startingCheckpoint: { ordinal: 70, ...record(F.cp70), eventSha256: cp70.eventSha256 }, endingCheckpoint: 71,
  checkpoint70EvidenceBeforeAuthorizedLedgerAppend: { ...record(F.evidence70), ...evidence70BeforeAppend,
    ledgerPrefixBytes: ledgerPrefix.length, ledgerPrefixSha256: sha(ledgerPrefix), appendOnlySequenceAdded: 15 },
  checkpoint70EvidenceAfterAuthorizedLedgerAppend: { ...record(F.evidence70), rows: 27, present: 27, matching: 26,
    onlyMismatch: evidence70AfterAppend.bad[0], appendOnlyLedgerMutation: true },
  tokenGate: { ledgerSequence: 15, ...direct.contextMeasurement, requiredSafePauseReserveTokens: 54400,
    headroomAboveReserveTokens: 167771, decision: 'THRESHOLD_PASS_BUT_TRANSPORT_COMPATIBILITY_GATE_FAIL' },
  package: { ...packageState, sourceManifest: record(F.sourceManifest), detailedManifest: record(F.detailedManifest) },
  capsule: { ...record(F.capsule), materialClaimsCovered: 222, materialClaimsTotal: 222, representedRows: 145,
    unsupportedClaims: 0, omittedUnfavorableEvidence: 0, semanticCoveragePercent: 100, conservativeEstimatedTokens: 188684 },
  transport: { runner: { ...record(F.runner), byteIdentityPass: true, continuationInvocationReady: false },
    finalPreflight69: { ...record(F.finalPreflight69), protected: true, collisionWithInvocationOutputs: true },
    toolPlan: record(F.toolPlan), toolValidation: record(F.toolValidation), bootstrapJson: record(F.bootstrapJson),
    bootstrapMarkdown: record(F.bootstrapMd), contextProjection: record(F.contextProjection), transportPreflight: record(F.transportPreflight),
    exactAllowedReads: 63, requiredOriginalSpotChecks: 9, evidenceClasses: 8, projectedTotalTokens: 504336,
    marginBelowProviderLimitTokens: 495664, byteIdentityPass: true, functionalContinuationPass: false },
  blocker: { code: 'EXACT_ONCE_OUTPUT_EXISTS:COMMIT_5R1C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json',
    detectedBeforeRunnerExecution: true, runnerExecuted: false, reason: 'The exact runner checks the protected checkpoint-69 final-preflight path for absence before measuring context, creating a marker, creating temp roots, or spawning Claude Code.' },
  authorization: { ...record(F.authorization), status: 'AUTHORIZED_UNUSED', consumed: false, invocationCount: 0,
    remainingInvocationCount: 1, retryAuthorized: false },
  cli: { version: '2.1.212 (Claude Code)', model: 'claude-opus-4-8', substantiveSubmissionAttempted: false,
    providerContacted: false, captureCreated: false },
  review: { reviewerObjectReceived: false, decision: null, substantivePathDecision: null,
    plannedOriginalSpotChecks: 9, observedOriginalSpotChecks: 0, observations: [], semanticRejection: false },
  protected: protectedState,
  registryWal: { registry: record(F.registry), totalAttempts: 230, controllingAttempts: 227, nonControllingAttempts: 3,
    orphanAttempts: 0, danglingAttempts: 0, runningAttempts: 0, c34Wal: record(F.c34Wal), c34WalRows: c34WalLines,
    c35Wal: record(F.c35Wal), c35WalRows: c35WalLines, c36WalAbsent: true, c37WalAbsent: true },
  governingDocuments: { roadmapV9: record(F.roadmap), currentState: record(F.currentState), modified: false },
  stagingPerformed: false, commitCreated: false, pushPerformed: false, head, upstream, fetchHead, ahead, behind,
  trackedWorktreeClean: true, stagingEmpty: true, hygiene: processHygiene,
  prohibitedWorkBegun: { c38: false, e2: false, a15: false, phase10B: false, deployment: false, reindexing: false,
    corpusOrDatabaseMigration: false, modelMigration: false },
  nextExactOperation: NEXT_EXACT, safeToResume: true, activeAttemptId: null, pass: true,
};
writeOrVerify(F.reconciliation, stable(reconciliation));

const handoff = `# C37 four-hour resume handoff from checkpoint 71\n\nClassification: \`${CLASSIFICATION}\`\n\nCheckpoint 70, its replay, and its 27-entry evidence manifest were verified before the authorized token-ledger append. Git HEAD, upstream, and live FETCH_HEAD remain ${head}, ahead/behind 0/0, with clean tracked and staged state. The 57-file package remains 57/57 over 4,109,852 bytes with aggregate SHA-256 ${EXPECTED.packageAggregate}. The capsule remains ${EXPECTED.capsule}, covering 222/222 material claims and 145/145 rows with zero unsupported claims and zero omitted unfavorable evidence.\n\nThe final current-session measurement passed: 36,229 active tokens in the 258,400-token effective window left 222,171, which is 102,171 above the 120,000 pre-submission threshold and 167,771 above the 54,400 post-capture reserve. All prepared bytes also matched: runner ${EXPECTED.runner}, 63 exact Read rules, nine original-file spot checks across eight evidence classes, isolated empty MCP, Claude Code 2.1.212, model claude-opus-4-8, and the 504,336-token projection with 495,664 margin.\n\nInvocation was nevertheless blocked before submission. The preserved runner binds its final-preflight output to \`COMMIT_5R1C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json\`, includes that path in \`INVOCATION_OUTPUTS\`, and requires every invocation output to be absent before it measures context, creates the marker or temp roots, or starts Claude Code. That protected file already exists at 5,290 bytes with SHA-256 ${EXPECTED.finalPreflight69}. Deleting, renaming, or overwriting it, or editing/rebuilding the runner, was prohibited. The runner was therefore not executed and Opus was not contacted. This is a functional prepared-transport/state mismatch, not byte drift and not a semantic rejection.\n\nThe manifest-indexed authorization remains \`AUTHORIZED_UNUSED\`, unconsumed, invocation count 0, remaining count 1, retry false. No marker, request, provider response, capture, review, or reviewer decision exists. Roadmap v9 and \`knowledge/CURRENT_STATE.md\` remain unchanged. Decision/relation/reason remain 3720/3720, 3720/3720, and 3575/3720 with 145 reason-only rows. C35 runtime and all protected runtime/oracle/fixture/registry/WAL evidence remain unchanged. No staging, commit, or push occurred. The user-owned VS Code Claude PID 24136 was untouched. No C38, E2, A15, Phase 10B, deployment, reindexing, migration, or model migration began.\n\nExact next operation: ${NEXT_EXACT}\n\nThis handoff grants no new review, invocation, phase, or mutation authority. The existing one-use authorization remains the sole unused authorization.\n`;
writeOrVerify(F.handoff71, handoff);

writeOrVerify(F.terminal, stable({
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: CLASSIFICATION, generatedUtc,
  checkpoint: 71, stage: 'checkpoint-70 direct completion pre-invocation prepared-transport mismatch safe pause',
  reason: 'The byte-identical runner cannot enter --invoke while its protected checkpoint-69 final-preflight output exists.',
  contextGatePass: true, remainingContextTokens: 222171, runnerByteIdentityPass: true, continuationInvocationReady: false,
  authorizationStatus: 'AUTHORIZED_UNUSED', authorizationConsumed: false, invocationCount: 0, invocationMarkerExists: false,
  providerRequestObserved: false, reviewerDecision: null, semanticRejection: false, docsUpdated: false,
  stagingPerformed: false, commitCreated: false, pushPerformed: false, safeToResume: true, activeAttemptId: null,
  nextExactOperation: NEXT_EXACT, pass: true,
}));

const evidenceFiles = [SELF, F.cp70, F.replay70, F.evidence70, F.handoff70, F.directPreflight, F.authorization, F.ledger,
  F.runner, F.finalPreflight69, F.sourceManifest, F.detailedManifest, F.capsule, F.coverage, F.roleLedger, F.allowlist,
  F.toolPlan, F.toolValidation, F.bootstrapJson, F.bootstrapMd, F.contextProjection, F.transportPreflight,
  F.protectedBaseline, F.protected68, F.protected69, F.registry, F.c34Wal, F.c35Wal, F.roadmap, F.currentState,
  F.reconciliation, F.handoff71, F.terminal].sort((a, b) => rel(a).localeCompare(rel(b)));
replaceUnboundEvidence(F.evidence71, `${evidenceFiles.map((file) => `${record(file).sha256}  ${rel(file)}`).join('\n')}\n`);
const evidence71 = validateManifest(F.evidence71, evidenceFiles.length);
assert(evidence71.pass, 'EVIDENCE_71');

const logShaBeforeAppend = record(F.log).sha256;
assert(logShaBeforeAppend === EXPECTED.log70, 'LOG_70_PREFIX');
const checkpointBase = {
  schemaVersion: 2, ordinal: 71, commitUnit: 'PHASE-10A14-R20 COMMIT 5R1-C37', updatedAtUtc: generatedUtc,
  stage: 'checkpoint-70 direct completion pre-invocation prepared-transport mismatch safe pause', status: CLASSIFICATION,
  head, upstream, remoteTip: fetchHead, parent: 'd5b25e676f623fbc1888608ff250824fcd34af99', branch: 'feature/source-availability-engine-v1',
  activeReasonBaseHash: EXPECTED.c34Reason, c35RuntimeHash: EXPECTED.c35Composite, activeAttemptId: null,
  decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', reasonOnlyRowsRemaining: 145,
  frozenDecision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', generalizedRuntimeDefects: 0,
  phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW', r20: 'IN_PROGRESS', c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL',
  c37: 'SAFE_PAUSED_PREPARED_TRANSPORT_MISMATCH_PRE_INVOCATION', priorAuthorizationsConsumed: 2,
  manifestIndexedAuthorizationStatus: 'AUTHORIZED_UNUSED', manifestIndexedAuthorizationConsumed: false,
  manifestIndexedInvocationCount: 0, manifestIndexedRetryAuthorized: false, providerRequestObserved: false,
  modelReviewReached: false, reviewerObjectReceived: false, decisionToken: null, substantivePathToken: null,
  package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: EXPECTED.sourceManifest,
    detailedManifestSha256: EXPECTED.detailedManifest, aggregateSha256: EXPECTED.packageAggregate, unchanged: true, pass: true },
  token: { ledgerSequence: 15, effectiveContextWindowTokens: 258400, activeContextTokens: 36229, remainingTokens: 222171,
    preSubmissionRequiredTokens: 120000, headroomAbovePreSubmissionRequirementTokens: 102171, requiredReserveTokens: 54400,
    headroomAboveReserveTokens: 167771, decision: 'THRESHOLD_PASS_BUT_TRANSPORT_COMPATIBILITY_GATE_FAIL' },
  capsuleCreated: true, capsuleValidated: true, capsuleSemanticCoveragePercent: 100, capsuleConservativeEstimatedTokens: 188684,
  bootstrapCreated: true, toolBoundaryValidated: true, providerContextPlanCreated: true, transportPreflightCreated: true,
  directCompletionPreflightCreated: true, directCompletionPreflightPass: false,
  onlyFailedDirectCompletionGate: 'exactPreparedRunnerCanInvokeFromCheckpoint70WithoutProhibitedMutation',
  runnerByteIdentityPass: true, continuationInvocationReady: false, invocationRunnerExecuted: false,
  invocationMarkerExists: false, roadmapV9Updated: false, currentStateUpdated: false, finalApprovalManifestCreated: false,
  stagingPerformed: false, commitCreated: false, pushPerformed: false, stagingEmpty: true, trackedWorktreeClean: true,
  headEqualsUpstream: true, ahead, behind, protectedResiduePreserved: true, hygiene: processHygiene,
  deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false, e2Begun: false, a15Begun: false,
  c38Begun: false, phase10BImplementationBegun: false,
  authorization: record(F.authorization), directCompletionPreflight: record(F.directPreflight), reconciliation: record(F.reconciliation),
  fourHourResumeHandoff: record(F.handoff71), terminalState: record(F.terminal), evidenceManifest: record(F.evidence71),
  capsule: record(F.capsule), preparedRunner: record(F.runner), protectedFinalPreflight69: record(F.finalPreflight69),
  previousCheckpoint: { ordinal: 70, ...record(F.cp70), eventSha256: cp70.eventSha256, logSha256BeforeAppend: logShaBeforeAppend },
  blocker: 'PREPARED_RUNNER_PROTECTED_FINAL_PREFLIGHT_OUTPUT_COLLISION', safePauseReason: CLASSIFICATION,
  nextExactOperation: NEXT_EXACT, safeToResume: true,
};
const eventSha256 = sha(Buffer.from(stable(checkpointBase), 'utf8'));
const checkpoint = { ...checkpointBase, eventSha256 };
writeNew(F.numbered71, stable(checkpoint));
const pointerFd = fs.openSync(F.pointer, 'w');
try { fs.writeFileSync(pointerFd, fs.readFileSync(F.numbered71)); fs.fsyncSync(pointerFd); } finally { fs.closeSync(pointerFd); }
assert(fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered71)), 'POINTER');
const before = lines(F.log).map(JSON.parse);
assert(before.map((row) => row.ordinal).join(',') === '64,65,66,67,68,69,70', 'LOG_BEFORE');
const logFd = fs.openSync(F.log, 'a');
try { fs.writeFileSync(logFd, `${JSON.stringify(checkpoint)}\n`); fs.fsyncSync(logFd); } finally { fs.closeSync(logFd); }
const after = lines(F.log).map(JSON.parse);
const replay = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_71_IDEMPOTENCE_REPLAY_PASS', generatedUtc,
  checkpoint: record(F.pointer), numberedCheckpoint: record(F.numbered71), checkpointLog: record(F.log), eventSha256,
  checkpointOrdinals: after.map((row) => row.ordinal), pointerEqualsNumberedCheckpoint: fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered71)),
  previousCheckpoint70Preserved: record(F.cp70).sha256 === checkpointBase.previousCheckpoint.sha256,
  noDuplicateCheckpoint: after.length === 8 && new Set(after.map((row) => row.ordinal)).size === 8,
  checkpoint71EvidenceManifestPass: validateManifest(F.evidence71, evidenceFiles.length).pass,
  preparedBytesPreserved: true, preparedTransportFunctionalMismatchProven: true, contextThresholdPassed: true,
  manifestIndexedAuthorizationUnused: true,
  noManifestIndexedInvocationMarker: !fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json')),
  noProviderRequestOrReview: true, governingDocumentsUnchanged: true, noStagingCommitPush: true,
  safeToResume: true, activeAttemptId: null, pass: true,
};
assert(replay.pointerEqualsNumberedCheckpoint && replay.noDuplicateCheckpoint && replay.checkpoint71EvidenceManifestPass, 'REPLAY_71');
writeNew(F.replay71, stable(replay));
process.stdout.write(`${JSON.stringify({ classification: CLASSIFICATION, checkpoint: record(F.numbered71), eventSha256,
  replay: record(F.replay71), evidence: record(F.evidence71), directPreflight: record(F.directPreflight),
  authorization: 'AUTHORIZED_UNUSED', invocationCount: 0, modelContacted: false, pass: true })}\n`);
