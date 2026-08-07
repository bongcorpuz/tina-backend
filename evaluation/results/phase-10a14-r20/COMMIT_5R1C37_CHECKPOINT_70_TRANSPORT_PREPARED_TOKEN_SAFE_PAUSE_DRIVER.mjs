// Checkpoint 70: transport prepared, final 120k-token gate failed, no invocation.
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
  prompt: 'C:/Projects/tina-execution-prompts/PHASE-10A14-R20-COMMIT-5R1-C37-FOUR-HOUR-MANIFEST-INDEXED-OPUS-REVIEW-AND-FINALIZATION-FROM-CHECKPOINT-69.md',
  transportDriver: path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c37-checkpoint69-opus.mjs'),
  authorization: R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_EXTERNAL_AUTHORIZATION.json'),
  ledger: R('COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson'),
  cp69: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_69_manifest_indexed_capsule_complete_token_reserve_safe_pause_pre_invocation.json'),
  replay69: R('COMMIT_5R1C37_CHECKPOINT_69_IDEMPOTENCE_REPLAY.json'),
  evidence69: R('COMMIT_5R1C37_CHECKPOINT_69_CAPSULE_COMPLETE_TOKEN_SAFE_PAUSE_EVIDENCE.sha256'),
  continuation: R('COMMIT_5R1C37_CHECKPOINT_69_CONTINUATION_PREFLIGHT.json'),
  protected: R('COMMIT_5R1C37_CHECKPOINT_69_PROTECTED_RESIDUE_VERIFICATION.json'),
  capsuleContinuity: R('COMMIT_5R1C37_CHECKPOINT_69_CAPSULE_CONTINUITY_VERIFICATION.json'),
  authContinuity: R('COMMIT_5R1C37_CHECKPOINT_69_AUTHORIZATION_CONTINUITY.json'),
  toolPlan: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_PLAN.json'),
  toolValidation: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_READ_ONLY_TOOL_VALIDATION.json'),
  bootstrapJson: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_BOOTSTRAP.json'),
  bootstrapMd: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_BOOTSTRAP.md'),
  contextProjection: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_CONTEXT_PROJECTION.json'),
  transportPreflight: R('COMMIT_5R1C37_CHECKPOINT_69_OPUS_TRANSPORT_PREFLIGHT.json'),
  finalPreflight: R('COMMIT_5R1C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT.json'),
  capsule: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_CAPSULE.json'),
  coverage: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_COVERAGE_VALIDATION.json'),
  roleLedger: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ROLE_LEDGER.json'),
  allowlist: R('COMMIT_5R1C37_MANIFEST_INDEXED_REVIEW_ALLOWLIST.json'),
  sourceManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  detailedManifest: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  reconciliation: R('COMMIT_5R1C37_CHECKPOINT_70_TRANSPORT_PREPARED_TOKEN_SAFE_PAUSE_RECONCILIATION.json'),
  terminal: R('COMMIT_5R1C37_CHECKPOINT_70_TRANSPORT_PREPARED_TOKEN_SAFE_PAUSE_TERMINAL_STATE.json'),
  handoff: R('COMMIT_5R1C37_FOUR_HOUR_RESUME_HANDOFF_FROM_CHECKPOINT_70.md'),
  evidence: R('COMMIT_5R1C37_CHECKPOINT_70_TRANSPORT_PREPARED_TOKEN_SAFE_PAUSE_EVIDENCE.sha256'),
  numbered: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_70_transport_prepared_token_reserve_safe_pause_pre_invocation.json'),
  replay: R('COMMIT_5R1C37_CHECKPOINT_70_IDEMPOTENCE_REPLAY.json'),
  pointer: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  log: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT_LOG.ndjson'),
});

const classification = 'C37_FOUR_HOUR_TOKEN_RESERVE_SAFE_PAUSE_PRE_INVOCATION';
const nextExact = 'Start a brand-new governed session from checkpoint 70. Measure live Codex context before creating continuation artifacts; reverify checkpoint 70, Git, protected residue, the immutable capsule/package, authorization, and the completed checkpoint-69 read-only transport. Reuse the prepared bootstrap and tool boundary byte-for-byte. Create a checkpoint-70 continuation final preflight and invoke the existing authorization exactly once only if at least 120,000 tokens remain and every gate passes.';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const record = (file) => { const data = fs.readFileSync(file); return { path: rel(file), bytes: data.length, sha256: sha(data) }; };
const assert = (condition, code) => { if (!condition) throw new Error(`CHECKPOINT_70_BLOCKED:${code}`); };
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
  assert(!fs.existsSync(F.numbered) && !fs.existsSync(F.replay), 'EVIDENCE_ALREADY_BOUND');
  const fd = fs.openSync(file, 'w');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return record(file);
}

function validateManifest(file, expectedCount) {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `MANIFEST_LINE_${index + 1}`);
    const target = path.resolve(REPO, ...match[2].replaceAll('\\', '/').split('/'));
    return { path: match[2].replaceAll('\\', '/'), expected: match[1], present: fs.existsSync(target),
      actual: fs.existsSync(target) ? record(target).sha256 : null };
  });
  assert(rows.length === expectedCount, 'MANIFEST_COUNT');
  return { rows: rows.length, present: rows.filter((x) => x.present).length,
    matching: rows.filter((x) => x.actual === x.expected).length, bad: rows.filter((x) => x.actual !== x.expected), pass: rows.every((x) => x.actual === x.expected) };
}

function hygiene() {
  const script = `$ErrorActionPreference='Stop';$nodes=@(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"|Select-Object ProcessId,CommandLine);$claudes=@(Get-CimInstance Win32_Process -Filter "Name = 'claude.exe'"|Select-Object ProcessId,ExecutablePath,CommandLine);$listeners=@(netstat -ano -p TCP|Where-Object{($_.Trim()-split '\\s+')[1]-match':5173$'-and($_.Trim()-split '\\s+')[3]-eq'LISTENING'});[ordered]@{otherNodePids=@($nodes|Where-Object{$_.ProcessId-ne ${process.pid}}|ForEach-Object{$_.ProcessId});taskClaudePids=@($claudes|Where-Object{$_.ExecutablePath-match'AppData\\\\Roaming\\\\npm\\\\node_modules\\\\@anthropic-ai\\\\claude-code'}|ForEach-Object{$_.ProcessId});vscodeClaudePids=@($claudes|Where-Object{$_.ExecutablePath-match'\\.vscode\\\\extensions\\\\anthropic\\.claude-code'}|ForEach-Object{$_.ProcessId});port5173=$listeners.Count}` + '|ConvertTo-Json';
  const state = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true }));
  state.validationTempExists = fs.existsSync('C:/tmp/c37-manifest-indexed-checkpoint69-validation');
  state.invocationTempExists = fs.existsSync('C:/tmp/c37-manifest-indexed-checkpoint69-invocation');
  state.indexLockExists = fs.existsSync(path.join(REPO, '.git/index.lock'));
  state.pass = state.otherNodePids.length === 0 && state.taskClaudePids.length === 0 && state.vscodeClaudePids.includes(24136)
    && state.port5173 === 0 && !state.validationTempExists && !state.invocationTempExists && !state.indexLockExists;
  return state;
}

for (const file of [F.numbered, F.replay]) assert(!fs.existsSync(file), `WRITE_ONCE_EXISTS:${rel(file)}`);
assert(record(F.prompt).sha256 === 'ca192be195a35cedbaefb6e208a051e788d10a163137091e303d60da6f6f75f4', 'PROMPT');
const cp69 = readJson(F.cp69);
const replay69 = readJson(F.replay69);
const authorization = readJson(F.authorization);
const finalPreflight = readJson(F.finalPreflight);
const transport = readJson(F.transportPreflight);
const toolValidation = readJson(F.toolValidation);
const contextProjection = readJson(F.contextProjection);
assert(record(F.cp69).sha256 === 'bc2201dbfb8d8f7a5938939090069d89ead4d9743461c5d20e42ee6b7f93a607'
  && cp69.ordinal === 69 && cp69.safeToResume === true && cp69.activeAttemptId === null && replay69.pass === true, 'CHECKPOINT_69');
let evidence69BeforeAppend = validateManifest(F.evidence69, 19);
assert(record(F.evidence69).sha256 === '07e329f8ec4eebc8588a8cda4e016a5018c3f74f458f32a4e8c2f3d1062c88a5', 'EVIDENCE_69_HASH');
assert(authorization.newAuthorization.status === 'AUTHORIZED_UNUSED' && authorization.authorizationConsumed === false
  && authorization.invocationMarkerExists === false && authorization.newAuthorization.maximumInvocations === 1
  && authorization.newAuthorization.retryAuthorized === false, 'AUTHORIZATION');
assert(transport.pass === true && toolValidation.pass === true && contextProjection.pass === true, 'TRANSPORT');
assert(finalPreflight.pass === false && finalPreflight.classification === 'C37_CHECKPOINT_69_MANIFEST_INDEXED_OPUS_FINAL_PREFLIGHT_FAIL'
  && finalPreflight.token.gatePass === false && finalPreflight.token.calculatedEffectiveRemainingTokens === 104917
  && Object.entries(finalPreflight.gates).filter(([, value]) => !value).map(([key]) => key).join(',') === 'remainingCodexContextAtLeast120000', 'FINAL_PREFLIGHT');
for (const name of ['COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json', 'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_CLI_CAPTURE.json',
  'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_REVIEW.json', 'COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_TRANSMISSION_RECEIPT.json']) assert(!fs.existsSync(R(name)), `FORBIDDEN_OUTPUT:${name}`);

const head = git('rev-parse', 'HEAD');
const upstream = git('rev-parse', '@{upstream}');
const fetchHead = git('rev-parse', 'FETCH_HEAD');
const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...@{upstream}').split(/\s+/).map(Number);
assert(head === 'ee664eab4529c636f34cb6d37d23a6a497886a17' && upstream === head && fetchHead === head && ahead === 0 && behind === 0, 'GIT_IDENTITY');
assert(git('status', '--porcelain=v1', '--untracked-files=no') === '' && git('diff', '--cached', '--name-only') === '', 'GIT_CLEAN');
const processHygiene = hygiene();
assert(processHygiene.pass, 'HYGIENE');

const ledgerCurrent = fs.readFileSync(F.ledger);
const ledgerRows = ledgerCurrent.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert([13, 14].includes(ledgerRows.at(-1).sequence), 'LEDGER_SEQUENCE');
const ledgerPrefix = Buffer.from(`${ledgerRows.slice(0, 13).map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
assert(sha(ledgerPrefix) === 'cc7c6d19a5044fe9c0e1eb811a18e0b5fc27793a71e5c0810ea5467554298d9b', 'LEDGER_PREFIX_HASH');
if (ledgerRows.length === 14) {
  const badNonLedger = evidence69BeforeAppend.bad.filter((x) => x.path !== 'evaluation/results/phase-10a14-r20/COMMIT_5R1C37_TOKEN_CONTEXT_BUDGET_LEDGER.ndjson');
  assert(badNonLedger.length === 0 && evidence69BeforeAppend.matching === 18, 'EVIDENCE_69_APPEND_ONLY_RECOVERY');
  evidence69BeforeAppend = { rows: 19, present: 19, matching: 19, bad: [], pass: true };
} else assert(evidence69BeforeAppend.pass, 'EVIDENCE_69');
const now = ledgerRows.length === 14 ? ledgerRows[13].timestampUtc : new Date().toISOString();
const ledger14 = {
  schemaVersion: 1, sequence: 14, timestampUtc: now, measurementPoint: 'CHECKPOINT_69_TRANSPORT_COMPLETE_FINAL_PREINVOCATION_TOKEN_GATE',
  currentOperation: 'Checkpoint-69 continuity and compact read-only Opus transport completed and provider-free validated; final pre-invocation context gate measured before any marker or substantive submission',
  nextProposedAtomicOperation: 'Create checkpoint 70 token-safe-pause reconciliation and a fresh-session handoff; preserve the prepared transport and unused authorization',
  telemetryAvailable: true, contextCapacityAvailable: true, modelConfiguredContextCapacityTokens: 272000,
  effectiveSessionContextWindowTokens: finalPreflight.token.effectiveContextWindowTokens,
  telemetryReportedActiveContextTokens: finalPreflight.token.telemetryReportedActiveContextTokens,
  calculatedEffectiveRemainingTokens: finalPreflight.token.calculatedEffectiveRemainingTokens,
  calculatedEffectiveRemainingPercentage: Number((100 * finalPreflight.token.calculatedEffectiveRemainingTokens / finalPreflight.token.effectiveContextWindowTokens).toFixed(4)),
  requiredPreSubmissionRemainingTokens: 120000, headroomAbovePreSubmissionRequirementTokens: finalPreflight.token.headroomAbovePreSubmissionRequirementTokens,
  requiredSafePauseReserveTokens: 54400, headroomAboveReserveTokens: finalPreflight.token.headroomAboveReserveTokens,
  decision: 'SAFE_PAUSE_PRE_INVOCATION_AFTER_TRANSPORT_PREPARATION', method: finalPreflight.token.method,
  telemetrySource: `${finalPreflight.token.sessionFile} line ${finalPreflight.token.latestTokenEventLine} at ${finalPreflight.token.eventTimestampUtc}`,
  automaticCompactionObserved: true, stateIntegrity: 'PASS', preparedTransport: { toolPlan: record(F.toolPlan), toolValidation: record(F.toolValidation),
    bootstrap: record(F.bootstrapMd), contextProjection: record(F.contextProjection), transportPreflight: record(F.transportPreflight), finalPreflight: record(F.finalPreflight) },
  manifestIndexedAuthorizationStatus: 'AUTHORIZED_UNUSED', manifestIndexedInvocationCount: 0,
  manifestIndexedInvocationMarkerExists: false, providerRequestObserved: false, modelRequestSubmitted: false, requiredClassification: classification,
};
if (ledgerRows.length === 13) {
  const ledgerFd = fs.openSync(F.ledger, 'a');
  try { fs.writeFileSync(ledgerFd, `${JSON.stringify(ledger14)}\n`); fs.fsyncSync(ledgerFd); } finally { fs.closeSync(ledgerFd); }
} else assert(stable(ledgerRows[13]) === stable(ledger14), 'LEDGER_14_PARTIAL_RECOVERY_MISMATCH');
assert(fs.readFileSync(F.ledger, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).at(-1).sequence === 14, 'LEDGER_APPEND');

const reconciliation = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification, generatedUtc: now,
  startingCheckpoint: { ordinal: 69, ...record(F.cp69), eventSha256: cp69.eventSha256 }, endingCheckpoint: 70,
  checkpoint69EvidenceBeforeAuthorizedLedgerAppend: { ...record(F.evidence69), ...evidence69BeforeAppend,
    ledgerPrefixBytes: ledgerPrefix.length, ledgerPrefixSha256: sha(ledgerPrefix), appendOnlySequenceAdded: 14 },
  tokenGate: { ledgerSequence: 14, ...finalPreflight.token, shortfallTokens: 15083,
    decision: 'SAFE_PAUSE_PRE_INVOCATION_AFTER_TRANSPORT_PREPARATION' },
  capsule: { ...record(F.capsule), packageEntries: 57, packageBytes: 4109852, semanticCoveragePercent: 100,
    representedRows: 145, unsupportedClaims: 0, omittedUnfavorableEvidence: 0, conservativeEstimatedTokens: 188684 },
  transport: { driver: record(F.transportDriver), continuation: record(F.continuation), protected: record(F.protected),
    capsuleContinuity: record(F.capsuleContinuity), authorizationContinuity: record(F.authContinuity), toolPlan: record(F.toolPlan),
    toolValidation: record(F.toolValidation), bootstrapJson: record(F.bootstrapJson), bootstrapMarkdown: record(F.bootstrapMd),
    contextProjection: record(F.contextProjection), transportPreflight: record(F.transportPreflight), finalPreflight: record(F.finalPreflight),
    exactAllowedReads: 63, requiredOriginalSpotChecks: 9, projectedTotalTokens: 504336, marginBelowProviderLimitTokens: 495664, pass: true },
  authorization: { ...record(F.authorization), status: 'AUTHORIZED_UNUSED', consumed: false, invocationCount: 0, remainingInvocationCount: 1, retryAuthorized: false },
  providerRequestObserved: false, modelRequestSubmitted: false, reviewerObjectReceived: false,
  invocationMarkerExists: false, runtimeOracleFixtureRegistryWalMutations: 0, roadmapV9Updated: false, currentStateUpdated: false,
  stagingPerformed: false, commitCreated: false, pushPerformed: false, head, upstream, fetchHead, ahead, behind,
  trackedWorktreeClean: true, stagingEmpty: true, hygiene: processHygiene,
  blocker: 'CODEX_PRE_SUBMISSION_120000_TOKEN_GATE_NOT_MET_AFTER_TRANSPORT_PREPARATION', nextExactOperation: nextExact,
  safeToResume: true, activeAttemptId: null, pass: true,
};
writeOrVerify(F.reconciliation, stable(reconciliation));

const handoff = `# C37 four-hour resume handoff from checkpoint 70\n\nClassification: \`${classification}\`\n\nCheckpoint 69, its 19-entry evidence manifest, replay, live Git identity, protected residue, the immutable 57-file package, completed semantic capsule, and the existing manifest-indexed authorization all reverified. Package integrity remains 57/57 over 4,109,852 bytes; capsule SHA-256 remains 7f223fe8386fcb23d1f2ecec4254ca44ee753fb2479fefb9c1d897ee767cf30f; semantic coverage remains 100% over 222 material claims and all 145 rows, with zero unsupported claims and zero omitted unfavorable evidence.\n\nThe compact checkpoint-69 read-only transport is now complete and provider-free validated: Claude Code 2.1.212, model claude-opus-4-8, safe mode, an empty isolated working directory, only the Read tool, dontAsk fail-closed permissions, 63 exact absolute Read rules (57 originals plus six capsule/manifest/bootstrap files), strict empty MCP configuration, nine required original spot checks covering all eight evidence classes, no persistent configuration mutation, no temp residue, and a projected 504,336-token provider context with 495,664-token margin. The bootstrap is 6,773 bytes and was not expanded or submitted.\n\nThe final checkpoint-69 pre-invocation measurement reported 153,483 active tokens in the 258,400-token effective window, leaving 104,917. This is 15,083 below the mandatory 120,000-token gate while retaining 50,517 above the 54,400-token reserve. The final preflight therefore failed only \`remainingCodexContextAtLeast120000\`. No invocation marker was created, no substantive request was submitted, no provider/model response was attempted, and the sole manifest-indexed authorization remains \`AUTHORIZED_UNUSED\` with invocation count 0 and retry false.\n\nRoadmap v9 and \`knowledge/CURRENT_STATE.md\` remain unchanged. HEAD, upstream, and live FETCH_HEAD remain ${head}, ahead/behind 0/0, with clean tracked and staged state. Runtime/oracle/fixture/registry/WAL state remains preserved. The user-owned VS Code Claude PID 24136 was untouched. No C38, E2, A15, Phase 10B, deployment, reindexing, or model migration work began.\n\nExact next operation: ${nextExact}\n\nThis handoff grants no additional review or phase authority. The existing one-use authorization remains the sole unused authorization.\n`;
writeOrVerify(F.handoff, handoff);
writeOrVerify(F.terminal, stable({
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification, generatedUtc: now,
  checkpoint: 70, stage: 'checkpoint-69 transport complete; final pre-invocation token-reserve safe pause',
  reason: 'Every non-token final preflight gate passed, but only 104,917 Codex tokens remained versus the mandatory 120,000.',
  capsuleComplete: true, transportComplete: true, transportValidatedWithoutModelContact: true, finalPreflightPass: false,
  onlyFailedGate: 'remainingCodexContextAtLeast120000', authorizationStatus: 'AUTHORIZED_UNUSED', invocationCount: 0,
  invocationMarkerExists: false, providerRequestObserved: false, reviewerDecision: null,
  docsUpdated: false, stagingPerformed: false, commitCreated: false, pushPerformed: false,
  safeToResume: true, activeAttemptId: null, nextExactOperation: nextExact, pass: true,
}));

const evidenceFiles = [SELF, F.transportDriver, F.authorization, F.ledger, F.cp69, F.replay69, F.evidence69,
  F.continuation, F.protected, F.capsuleContinuity, F.authContinuity, F.toolPlan, F.toolValidation, F.bootstrapJson,
  F.bootstrapMd, F.contextProjection, F.transportPreflight, F.finalPreflight, F.capsule, F.coverage, F.roleLedger,
  F.allowlist, F.sourceManifest, F.detailedManifest, F.reconciliation, F.handoff, F.terminal].sort((a, b) => rel(a).localeCompare(rel(b)));
replaceUnboundEvidence(F.evidence, `${evidenceFiles.map((file) => `${record(file).sha256}  ${rel(file)}`).join('\n')}\n`);
const evidence70 = validateManifest(F.evidence, evidenceFiles.length);
assert(evidence70.pass, 'EVIDENCE_70');

const logShaBeforeAppend = record(F.log).sha256;
const checkpointBase = {
  schemaVersion: 2, ordinal: 70, commitUnit: 'PHASE-10A14-R20 COMMIT 5R1-C37', updatedAtUtc: now,
  stage: 'checkpoint-69 transport complete final pre-invocation token-reserve safe pause', status: classification,
  head, upstream, remoteTip: fetchHead, parent: 'd5b25e676f623fbc1888608ff250824fcd34af99', branch: 'feature/source-availability-engine-v1',
  activeReasonBaseHash: '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775',
  c35RuntimeHash: '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c', activeAttemptId: null,
  decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', reasonOnlyRowsRemaining: 145,
  frozenDecision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', generalizedRuntimeDefects: 0,
  phase10A: 'PHASE_10A_OPEN_PENDING_MANDATORY_INDEPENDENT_REVIEW', r20: 'IN_PROGRESS', c36: 'SAFE_PAUSED_UNCOMMITTED_NOT_TERMINAL',
  c37: 'SAFE_PAUSED_MANIFEST_INDEXED_TRANSPORT_COMPLETE_PRE_INVOCATION', priorAuthorizationsConsumed: 2,
  manifestIndexedAuthorizationStatus: 'AUTHORIZED_UNUSED', manifestIndexedAuthorizationConsumed: false,
  manifestIndexedInvocationCount: 0, manifestIndexedRetryAuthorized: false, providerRequestObserved: false,
  modelReviewReached: false, reviewerObjectReceived: false, decisionToken: null, substantivePathToken: null,
  package: { entries: 57, rawEvidenceBytes: 4109852, sourceManifestSha256: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
    detailedManifestSha256: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0', aggregateSha256: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08', unchanged: true, pass: true },
  token: { ledgerSequence: 14, effectiveContextWindowTokens: 258400, activeContextTokens: 153483, remainingTokens: 104917,
    preSubmissionRequiredTokens: 120000, preSubmissionShortfallTokens: 15083, requiredReserveTokens: 54400,
    headroomAboveReserveTokens: 50517, decision: 'SAFE_PAUSE_PRE_INVOCATION_AFTER_TRANSPORT_PREPARATION' },
  roleLedgerCreated: true, allowlistCreated: true, capsuleCreated: true, capsuleValidated: true,
  capsuleSemanticCoveragePercent: 100, capsuleConservativeEstimatedTokens: 188684,
  bootstrapCreated: true, toolBoundaryValidated: true, providerContextPlanCreated: true, transportPreflightCreated: true,
  finalPreflightCreated: true, finalPreflightPass: false, onlyFailedFinalPreflightGate: 'remainingCodexContextAtLeast120000',
  invocationMarkerExists: false, roadmapV9Updated: false, currentStateUpdated: false, finalApprovalManifestCreated: false,
  stagingPerformed: false, commitCreated: false, pushPerformed: false, stagingEmpty: true, trackedWorktreeClean: true,
  headEqualsUpstream: true, ahead, behind, protectedResiduePreserved: true, hygiene: processHygiene,
  deploymentPerformed: false, reindexPerformed: false, modelMigrationPerformed: false, e2Begun: false, a15Begun: false, c38Begun: false, phase10BImplementationBegun: false,
  authorization: record(F.authorization), reconciliation: record(F.reconciliation), fourHourResumeHandoff: record(F.handoff),
  terminalState: record(F.terminal), evidenceManifest: record(F.evidence), capsule: record(F.capsule), transportPreflight: record(F.transportPreflight),
  finalPreflight: record(F.finalPreflight), previousCheckpoint: { ordinal: 69, ...record(F.cp69), eventSha256: cp69.eventSha256, logSha256BeforeAppend: logShaBeforeAppend },
  blocker: 'CODEX_PRE_SUBMISSION_120000_TOKEN_GATE_NOT_MET_AFTER_TRANSPORT_PREPARATION', safePauseReason: classification,
  nextExactOperation: nextExact, safeToResume: true,
};
const eventSha256 = sha(Buffer.from(stable(checkpointBase), 'utf8'));
const checkpoint = { ...checkpointBase, eventSha256 };
writeNew(F.numbered, stable(checkpoint));
const pointerFd = fs.openSync(F.pointer, 'w');
try { fs.writeFileSync(pointerFd, fs.readFileSync(F.numbered)); fs.fsyncSync(pointerFd); } finally { fs.closeSync(pointerFd); }
assert(fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered)), 'POINTER');
const before = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert(before.map((row) => row.ordinal).join(',') === '64,65,66,67,68,69', 'LOG_BEFORE');
const logFd = fs.openSync(F.log, 'a');
try { fs.writeFileSync(logFd, `${JSON.stringify(checkpoint)}\n`); fs.fsyncSync(logFd); } finally { fs.closeSync(logFd); }
const after = fs.readFileSync(F.log, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const replay = {
  schemaVersion: 1, unit: 'PHASE-10A14-R20 COMMIT 5R1-C37', classification: 'C37_CHECKPOINT_70_IDEMPOTENCE_REPLAY_PASS', generatedUtc: new Date().toISOString(),
  checkpoint: record(F.pointer), numberedCheckpoint: record(F.numbered), checkpointLog: record(F.log), eventSha256,
  checkpointOrdinals: after.map((row) => row.ordinal), pointerEqualsNumberedCheckpoint: fs.readFileSync(F.pointer).equals(fs.readFileSync(F.numbered)),
  previousCheckpoint69Preserved: record(F.cp69).sha256 === checkpointBase.previousCheckpoint.sha256,
  noDuplicateCheckpoint: after.length === 7 && new Set(after.map((row) => row.ordinal)).size === 7,
  checkpoint70EvidenceManifestPass: validateManifest(F.evidence, evidenceFiles.length).pass,
  capsuleCompleteAndValidated: true, readOnlyTransportCompleteAndValidated: true, finalPreflightFailedOnlyTokenGate: true,
  manifestIndexedAuthorizationUnused: true, noManifestIndexedInvocationMarker: !fs.existsSync(R('COMMIT_5R1C37_MANIFEST_INDEXED_OPUS_INVOCATION_MARKER.json')),
  noProviderRequestOrReview: true, governingDocumentsUnchanged: true, noStagingCommitPush: true,
  safeToResume: true, activeAttemptId: null, pass: true,
};
writeNew(F.replay, stable(replay));
process.stdout.write(`${JSON.stringify({ classification, checkpoint: record(F.numbered), eventSha256,
  replay: record(F.replay), evidence: record(F.evidence), transport: record(F.transportPreflight),
  finalPreflight: record(F.finalPreflight), authorization: 'AUTHORIZED_UNUSED', invocationCount: 0, pass: true })}\n`);
