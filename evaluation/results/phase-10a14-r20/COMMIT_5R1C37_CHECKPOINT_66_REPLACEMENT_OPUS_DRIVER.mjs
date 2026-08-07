// PHASE-10A14-R20 COMMIT 5R1-C37
// Exact-once checkpoint-66 replacement Opus submission and atomic capture.
// This driver never edits runtime, oracle, registry, WAL, documentation, or Git.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const CLI = 'C:/Users/USER/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe';
const CONFIG_ROOT = 'C:/tmp/c37-replacement-checkpoint66-20260801T123200Z';
const CONFIG = path.join(CONFIG_ROOT, 'empty-mcp.json');
const WORK = path.join(CONFIG_ROOT, 'work');
const RUNTIME = path.join(CONFIG_ROOT, 'runtime');

const EXPECTED = Object.freeze({
  head: 'ee664eab4529c636f34cb6d37d23a6a497886a17',
  checkpoint: '8348750e6fb07df633514d8170c2da9c9493980f96eb61d656f205e7f4631626',
  prompt: '870a85330fb54c3c32871e67aebec0698d65e3aca61b1e0b51ea570ff2d632f1',
  authorization: '72a6c3eb7cbefec17c8bd19062c4002ca7b9322533ddfef3cae605032985452e',
  sourceManifest: 'e317b2dabce69c32bcfbeb88c3c4541d37fd82e3e914b9ffc81a385bf60c97fb',
  detailedManifest: 'b0f270906c4ca406ac475d51d48286c55d93ab7ab5af71815c8e165a23d7e6e0',
  aggregate: '7fbc288baf7738e1c9c8d57b56aafe05b66c6dbabcbfe6074d4eb38568f41a08',
  packageBytes: 4109852,
  packageEntries: 57,
  existingRequestJson: 'abe554cbac877d63e1ea5438a7a12deb0449cc0990da060b4f883eb52a017e79',
  existingRequestMd: '0551f3cc2dbe899ca5d8f495ff6cd15462623017fd13017596a3c9d747f60449',
  replacementWrapperJson: '1311ff53a80e93d5c7fe35fdbc5c2029ab789d68c2e5cb41dafb11f90554f712',
  replacementWrapperMd: 'ad8511245e2b4fecc7d12a0f53de560c62a3601b138be664bcfaa9c35a130ec8',
  checkpoint66WrapperJson: '7533999219d398cccba423ddd169b54437ef2a98be321888d96d6083e75d5c36',
  checkpoint66WrapperMd: '1ffdf578a00957b9bb2a7da520cd44c29e52059754977ac17cf29d6b15e1b9b6',
  config: 'e93fc8db2b1bd77107fe6c758bca9545fa864cf7cce8ab93a7b2b93a1d566a7b',
  cli: 'fe639693fd7e9a881c799867711abb7666dec2a5fefbaba41af6a09e71bcbefa',
  cliBytes: 255334560,
  cliVersion: '2.1.212 (Claude Code)',
  model: 'claude-opus-4-8',
  reserve: 54400,
  preInvocationMinimum: 78400,
});

const R = (name) => path.join(RESULTS, name);
const F = Object.freeze({
  checkpoint: R('COMMIT_5R1C37_RECOVERY_CHECKPOINT.json'),
  authorization: R('COMMIT_5R1C37_REPLACEMENT_OPUS_EXTERNAL_AUTHORIZATION.json'),
  sourceManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  packageSha: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE.sha256'),
  packageManifest: R('COMMIT_5R1C37_OPUS_EXTERNAL_TRANSMISSION_PACKAGE_MANIFEST.json'),
  requestJson: R('COMMIT_5R1C37_FINAL_OPUS_REQUEST.json'),
  requestMd: R('COMMIT_5R1C37_FINAL_OPUS_REQUEST.md'),
  replacementWrapperJson: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REQUEST_WRAPPER.json'),
  replacementWrapperMd: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REQUEST_WRAPPER.md'),
  checkpoint66WrapperJson: R('COMMIT_5R1C37_CHECKPOINT_66_OPUS_REVIEW_CONTINUATION_WRAPPER.json'),
  checkpoint66WrapperMd: R('COMMIT_5R1C37_CHECKPOINT_66_OPUS_REVIEW_CONTINUATION_WRAPPER.md'),
  authorizationContinuity: R('COMMIT_5R1C37_CHECKPOINT_66_AUTHORIZATION_CONTINUITY.json'),
  continuationPreflight: R('COMMIT_5R1C37_CHECKPOINT_66_CONTINUATION_PREFLIGHT.json'),
  protectedVerification: R('COMMIT_5R1C37_CHECKPOINT_66_PROTECTED_RESIDUE_VERIFICATION.json'),
  isolatedRevalidation: R('COMMIT_5R1C37_CHECKPOINT_66_ISOLATED_CONFIG_REVALIDATION.json'),
  packageContinuity: R('COMMIT_5R1C37_CHECKPOINT_66_PACKAGE_AND_REQUEST_CONTINUITY.json'),
  finalPreflight: R('COMMIT_5R1C37_CHECKPOINT_66_REPLACEMENT_OPUS_FINAL_PREFLIGHT.json'),
  driver: fileURLToPath(import.meta.url),
  marker: R('COMMIT_5R1C37_REPLACEMENT_OPUS_INVOCATION_MARKER.json'),
  capture: R('COMMIT_5R1C37_REPLACEMENT_OPUS_CLI_CAPTURE.json'),
  stdout: R('COMMIT_5R1C37_REPLACEMENT_OPUS_STDOUT.txt'),
  stderr: R('COMMIT_5R1C37_REPLACEMENT_OPUS_STDERR.txt'),
  reviewJson: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REVIEW.json'),
  reviewMd: R('COMMIT_5R1C37_REPLACEMENT_OPUS_REVIEW.md'),
  receipt: R('COMMIT_5R1C37_REPLACEMENT_OPUS_TRANSMISSION_RECEIPT.json'),
});

const OUTPUTS = [F.marker, F.capture, F.stdout, F.stderr, F.reviewJson, F.reviewMd, F.receipt];
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = (file) => sha(fs.readFileSync(file));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const now = () => new Date().toISOString();
const rel = (file) => path.relative(REPO, file).replaceAll('\\', '/');
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const git = (...args) => execFileSync('git.exe', args, { cwd: REPO, encoding: 'utf8' }).trim();

function fileRecord(file) {
  const data = fs.readFileSync(file);
  return { path: rel(file), bytes: data.length, sha256: sha(data) };
}

function writeNew(file, data) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const fd = fs.openSync(file, 'wx');
  try {
    let offset = 0;
    while (offset < payload.length) offset += fs.writeSync(fd, payload, offset, payload.length - offset);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return fileRecord(file);
}

function parseManifest() {
  const raw = fs.readFileSync(F.sourceManifest, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  assert(lines.length === EXPECTED.packageEntries, 'PACKAGE_COUNT');
  return lines.map((line, index) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `PACKAGE_MANIFEST_LINE_${index + 1}`);
    return { ordinal: index + 1, sha256: match[1], path: match[2].replaceAll('\\', '/') };
  });
}

function resolvePackage() {
  assert(shaFile(F.sourceManifest) === EXPECTED.sourceManifest, 'SOURCE_MANIFEST_HASH');
  assert(shaFile(F.packageSha) === EXPECTED.sourceManifest, 'TRANSMISSION_SHA_HASH');
  assert(fs.readFileSync(F.sourceManifest).equals(fs.readFileSync(F.packageSha)), 'SHA_MANIFEST_NOT_IDENTICAL');
  assert(shaFile(F.packageManifest) === EXPECTED.detailedManifest, 'DETAILED_MANIFEST_HASH');
  const manifest = readJson(F.packageManifest);
  const rows = parseManifest();
  const seen = new Set();
  let rawBytes = 0;
  for (const row of rows) {
    const normalized = path.posix.normalize(row.path);
    assert(normalized === row.path && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized), `PACKAGE_PATH_${row.ordinal}`);
    assert(!seen.has(row.path), `PACKAGE_DUPLICATE_${row.ordinal}`);
    seen.add(row.path);
    const file = path.resolve(REPO, ...row.path.split('/'));
    assert(file.toLowerCase().startsWith(`${REPO.toLowerCase()}${path.sep}`), `PACKAGE_ESCAPE_${row.ordinal}`);
    const stat = fs.lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink(), `PACKAGE_NONREGULAR_${row.ordinal}`);
    const data = fs.readFileSync(file);
    assert(sha(data) === row.sha256, `PACKAGE_HASH_${row.ordinal}`);
    assert(Buffer.from(data.toString('utf8'), 'utf8').equals(data) && !data.includes(0), `PACKAGE_UTF8_${row.ordinal}`);
    rawBytes += data.length;
  }
  assert(rawBytes === EXPECTED.packageBytes, 'PACKAGE_BYTES');
  const framing = rows.map((row) => {
    const file = path.resolve(REPO, ...row.path.split('/'));
    return `${row.ordinal}\0${row.path}\0${fs.statSync(file).size}\0${row.sha256}\n`;
  }).join('');
  assert(sha(Buffer.from(framing, 'utf8')) === EXPECTED.aggregate, 'PACKAGE_AGGREGATE');
  assert(manifest.entryCount === 57 && manifest.entries.length === 57 && manifest.pass === true, 'DETAILED_MANIFEST_FIELDS');
  return { rows, manifest, rawBytes };
}

function buildSubmission(pkg) {
  const parts = [];
  let metadataBytes = 0;
  let entryFramingBytes = 0;
  const pushText = (text) => { const b = Buffer.from(text, 'utf8'); parts.push(b); metadataBytes += b.length; };
  pushText('=== AUTHORIZED C37 EXISTING FINAL REVIEW REQUEST BEGIN ===\n');
  pushText(fs.readFileSync(F.requestMd, 'utf8'));
  pushText('\n=== AUTHORIZED C37 EXISTING FINAL REVIEW REQUEST END ===\n');
  pushText('=== AUTHORIZED C37 CHECKPOINT-65 REPLACEMENT WRAPPER BEGIN ===\n');
  pushText(fs.readFileSync(F.replacementWrapperMd, 'utf8'));
  pushText('\n=== AUTHORIZED C37 CHECKPOINT-65 REPLACEMENT WRAPPER END ===\n');
  pushText('=== AUTHORIZED C37 CHECKPOINT-66 CONTINUATION WRAPPER BEGIN ===\n');
  pushText(fs.readFileSync(F.checkpoint66WrapperMd, 'utf8'));
  pushText('\n=== AUTHORIZED C37 CHECKPOINT-66 CONTINUATION WRAPPER END ===\n');
  pushText('=== AUTHORIZED C37 57-ENTRY DETAILED MANIFEST BEGIN ===\n');
  pushText(fs.readFileSync(F.packageManifest, 'utf8'));
  pushText('\n=== AUTHORIZED C37 57-ENTRY DETAILED MANIFEST END ===\n');
  pushText('=== AUTHORIZED C37 57-LINE SHA MANIFEST BEGIN ===\n');
  pushText(fs.readFileSync(F.packageSha, 'utf8'));
  pushText('=== AUTHORIZED C37 57-LINE SHA MANIFEST END ===\n');
  pushText('=== AUTHORIZED C37 57-ENTRY RAW EVIDENCE PACKAGE BEGIN ===\n');
  let evidenceBytes = 0;
  for (const row of pkg.rows) {
    const file = path.resolve(REPO, ...row.path.split('/'));
    const data = fs.readFileSync(file);
    assert(sha(data) === row.sha256, `PRE_SUBMISSION_HASH_${row.ordinal}`);
    const header = Buffer.from(`--- ENTRY ${row.ordinal} OF 57 BEGIN ---\nPATH_UTF8=${row.path}\nRAW_BYTES=${data.length}\nSHA256=${row.sha256}\nCONTENT_BYTES_BEGIN\n`, 'utf8');
    const footer = Buffer.from(`\nCONTENT_BYTES_END\n--- ENTRY ${row.ordinal} OF 57 END ---\n`, 'utf8');
    parts.push(header, data, footer);
    evidenceBytes += data.length;
    entryFramingBytes += header.length + footer.length;
  }
  pushText('=== AUTHORIZED C37 57-ENTRY RAW EVIDENCE PACKAGE END ===\n');
  const buffer = Buffer.concat(parts);
  return { buffer, evidenceBytes, metadataBytes, entryFramingBytes, totalBytes: buffer.length, sha256: sha(buffer) };
}

function inputSnapshot(pkg) {
  const inputs = [
    F.driver, F.checkpoint, F.authorization, F.sourceManifest, F.packageSha, F.packageManifest,
    F.requestJson, F.requestMd, F.replacementWrapperJson, F.replacementWrapperMd,
    F.checkpoint66WrapperJson, F.checkpoint66WrapperMd, F.authorizationContinuity,
    F.continuationPreflight, F.protectedVerification, F.isolatedRevalidation,
    F.packageContinuity, F.finalPreflight, CONFIG,
    ...pkg.rows.map((row) => path.resolve(REPO, ...row.path.split('/'))),
  ];
  const records = [...new Set(inputs)].sort().map(fileRecord);
  return { count: records.length, aggregateSha256: sha(Buffer.from(records.map((r) => `${r.path}\0${r.bytes}\0${r.sha256}\n`).join(''), 'utf8')) };
}

function parseOutput(stdout) {
  const envelope = JSON.parse(stdout.toString('utf8').replace(/^\uFEFF/, '').trim());
  let review = envelope.structured_output ?? null;
  if (!review && typeof envelope.result === 'string') review = JSON.parse(envelope.result.trim());
  if (!review && typeof envelope.decision === 'string') review = envelope;
  assert(review && typeof review === 'object' && !Array.isArray(review), 'NO_REVIEWER_OBJECT');
  return { envelope, review };
}

function validateReview(review, schema) {
  const expectedVerificationCount = Object.keys(schema.properties.verification.properties).length;
  const values = Object.values(review.verification ?? {});
  const approval = review.decision === 'APPROVED' || review.decision === 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS';
  const pass = approval
    && review.substantivePathDecision === 'NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED'
    && review.reviewedStateDigest === EXPECTED.sourceManifest
    && review.reviewedPackageManifestSha256 === EXPECTED.detailedManifest
    && review.reviewedPackageAggregateSha256 === EXPECTED.aggregate
    && review.complete57EntryPackageReviewed === true
    && review.dataBeyondAuthorizedPackageReviewed === false
    && review.reviewerTool === 'Claude Code'
    && review.reviewerModel === EXPECTED.model
    && review.independenceConfirmed === true
    && review.readOnlyConfirmed === true
    && values.length === expectedVerificationCount
    && values.every((value) => value === true)
    && review.runtimeCandidateRequestedForC37 === false
    && Array.isArray(review.blockingFindings) && review.blockingFindings.length === 0
    && Array.isArray(review.nonblockingObservations)
    && review.commitSafe === true;
  return { approval, expectedVerificationCount, verificationCount: values.length, allVerificationTrue: values.every((v) => v === true), pass };
}

function validateInputs() {
  for (const output of OUTPUTS) assert(!fs.existsSync(output), `EXACT_ONCE_OUTPUT_EXISTS:${rel(output)}`);
  assert(shaFile(F.checkpoint) === EXPECTED.checkpoint, 'CHECKPOINT_HASH');
  assert(shaFile(F.authorization) === EXPECTED.authorization && readJson(F.authorization).replacementAuthorization.status === 'AUTHORIZED_UNUSED', 'AUTHORIZATION');
  assert(shaFile(F.requestJson) === EXPECTED.existingRequestJson && shaFile(F.requestMd) === EXPECTED.existingRequestMd, 'REQUEST_HASH');
  assert(shaFile(F.replacementWrapperJson) === EXPECTED.replacementWrapperJson && shaFile(F.replacementWrapperMd) === EXPECTED.replacementWrapperMd, 'REPLACEMENT_WRAPPER_HASH');
  assert(shaFile(F.checkpoint66WrapperJson) === EXPECTED.checkpoint66WrapperJson && shaFile(F.checkpoint66WrapperMd) === EXPECTED.checkpoint66WrapperMd, 'CHECKPOINT66_WRAPPER_HASH');
  for (const file of [F.authorizationContinuity, F.continuationPreflight, F.protectedVerification, F.isolatedRevalidation, F.packageContinuity, F.finalPreflight]) assert(readJson(file).pass === true, `PREFLIGHT_FAIL:${rel(file)}`);
  const token = readJson(F.finalPreflight).token;
  assert(token.calculatedEffectiveRemainingTokens >= EXPECTED.preInvocationMinimum && token.gatePass === true, 'TOKEN_GATE');
  assert(fs.statSync(CLI).size === EXPECTED.cliBytes && shaFile(CLI) === EXPECTED.cli, 'CLI_IDENTITY');
  assert(fs.statSync(CONFIG).size === 18 && shaFile(CONFIG) === EXPECTED.config, 'CONFIG_IDENTITY');
  assert(fs.readdirSync(WORK).length === 0, 'WORKDIR_NOT_EMPTY');
  assert(git('rev-parse', 'HEAD') === EXPECTED.head && git('rev-parse', '@{upstream}') === EXPECTED.head, 'GIT_IDENTITY');
  assert(git('diff', '--cached', '--name-only') === '' && git('status', '--porcelain=v1', '--untracked-files=no') === '', 'GIT_NOT_CLEAN');
}

async function invoke() {
  validateInputs();
  const pkg = resolvePackage();
  const request = readJson(F.requestJson);
  const schema = request.outputSchema;
  assert(schema?.type === 'object' && schema.additionalProperties === false, 'SCHEMA_MISSING');
  const submission = buildSubmission(pkg);
  assert(submission.evidenceBytes === EXPECTED.packageBytes, 'SUBMISSION_PACKAGE_BYTES');
  const before = inputSnapshot(pkg);
  const cliVersion = execFileSync(CLI, ['--version'], { encoding: 'utf8' }).trim();
  assert(cliVersion === EXPECTED.cliVersion, 'CLI_VERSION');
  const systemPrompt = 'You are the sole independent C37 reviewer. Treat stdin as the complete authorized record. No tools are available. Do not inspect the filesystem, environment, credentials, configuration, network, repository, or any data outside stdin. Do not invoke another model or agent. Perform a read-only review and return only the strict schema-conforming JSON object.';
  const args = [
    '--print', '--model', EXPECTED.model, '--effort', 'max',
    '--permission-mode', 'plan', '--safe-mode', '--no-session-persistence', '--no-chrome',
    '--mcp-config', CONFIG, '--strict-mcp-config', '--disable-slash-commands', '--tools', '',
    '--output-format', 'json', '--json-schema', JSON.stringify(schema), '--system-prompt', systemPrompt,
  ];
  const safeArgs = args.map((arg, index) => args[index - 1] === '--json-schema'
    ? `<JSON_SCHEMA_SHA256:${sha(Buffer.from(arg, 'utf8'))}>`
    : args[index - 1] === '--system-prompt'
      ? `<SYSTEM_PROMPT_SHA256:${sha(Buffer.from(arg, 'utf8'))}>`
      : arg);
  const startedUtc = now();
  const marker = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: 'C37_REPLACEMENT_OPUS_INVOCATION_MARKER_SUBMISSION_IMMINENT',
    checkpoint: { ordinal: 66, sha256: EXPECTED.checkpoint },
    governingPromptSha256: EXPECTED.prompt,
    authorization: { sha256: EXPECTED.authorization, statusBeforeSubmission: 'AUTHORIZED_UNUSED', invocationOrdinal: 1, maximumInvocations: 1, retryAuthorized: false },
    cli: { path: CLI, bytes: EXPECTED.cliBytes, sha256: EXPECTED.cli, version: cliVersion },
    model: EXPECTED.model,
    config: { path: CONFIG, bytes: 18, sha256: EXPECTED.config, strict: true },
    package: { entries: 57, rawEvidenceBytes: EXPECTED.packageBytes, sourceManifestSha256: EXPECTED.sourceManifest, detailedManifestSha256: EXPECTED.detailedManifest, aggregateSha256: EXPECTED.aggregate },
    wrappers: { checkpoint65JsonSha256: EXPECTED.replacementWrapperJson, checkpoint65MarkdownSha256: EXPECTED.replacementWrapperMd, checkpoint66JsonSha256: EXPECTED.checkpoint66WrapperJson, checkpoint66MarkdownSha256: EXPECTED.checkpoint66WrapperMd },
    finalPreflight: fileRecord(F.finalPreflight),
    driver: fileRecord(F.driver),
    stdin: { totalBytes: submission.totalBytes, sha256: submission.sha256, evidenceBytes: submission.evidenceBytes },
    startedUtc,
  };
  writeNew(F.marker, stable(marker));

  const stdoutFd = fs.openSync(F.stdout, 'wx');
  const stderrFd = fs.openSync(F.stderr, 'wx');
  let child;
  let childPid = null;
  let spawnObserved = false;
  let spawnError = null;
  let exitCode = null;
  let signal = null;
  let timedOut = false;
  let stdinWriteInitiated = false;
  let stdinFinishObserved = false;
  let stdinEndCallbackObserved = false;
  let stdinError = null;
  let authorizationConsumed = false;
  try {
    const childEnv = {};
    for (const name of ['SystemRoot', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']) if (process.env[name]) childEnv[name] = process.env[name];
    childEnv.TEMP = RUNTIME;
    childEnv.TMP = RUNTIME;
    childEnv.NO_COLOR = '1';
    childEnv.CLAUDE_CODE_SAFE_MODE = '1';
    childEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
    child = spawn(CLI, args, { cwd: WORK, env: childEnv, windowsHide: true, shell: false, stdio: ['pipe', stdoutFd, stderrFd] });
    childPid = child.pid ?? null;
    child.once('spawn', () => { spawnObserved = true; });
    child.stdin.once('finish', () => { stdinFinishObserved = true; });
    child.stdin.once('error', (error) => { stdinError = error instanceof Error ? error.message : String(error); });
    stdinWriteInitiated = true;
    authorizationConsumed = true;
    child.stdin.end(submission.buffer, () => { stdinEndCallbackObserved = true; });
    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        timedOut = true;
        if (child && child.pid === childPid) child.kill();
      }, 45 * 60 * 1000);
      child.once('error', (error) => { clearTimeout(timer); resolve({ error }); });
      child.once('close', (code, childSignal) => { clearTimeout(timer); resolve({ code, signal: childSignal }); });
    });
    if (result.error) spawnError = result.error instanceof Error ? result.error.message : String(result.error);
    exitCode = result.code ?? null;
    signal = result.signal ?? null;
  } catch (error) {
    spawnError = error instanceof Error ? error.message : String(error);
  } finally {
    fs.fsyncSync(stdoutFd); fs.closeSync(stdoutFd);
    fs.fsyncSync(stderrFd); fs.closeSync(stderrFd);
  }

  const endedUtc = now();
  const stdout = fs.readFileSync(F.stdout);
  const stderr = fs.readFileSync(F.stderr);
  let parsed = null;
  let parseError = null;
  let gate = null;
  try {
    assert(spawnObserved && !spawnError && exitCode === 0 && signal === null && !timedOut, 'CLI_TECHNICAL_INCOMPLETE');
    parsed = parseOutput(stdout);
    gate = validateReview(parsed.review, schema);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  const actualReview = parsed?.review ?? null;
  const reviewArtifact = actualReview ?? {
    schemaVersion: 1,
    classification: 'C37_REPLACEMENT_OPUS_NO_VALID_REVIEWER_OBJECT_CAPTURED',
    reviewerObjectReceived: false,
    actualDecisionToken: null,
    actualSubstantivePathToken: null,
    executorTechnicalError: parseError,
    rawStdoutSha256: sha(stdout),
    rawStderrSha256: sha(stderr),
    note: 'Executor capture only. No synthetic reviewer decision or substantive token is asserted.',
  };
  writeNew(F.reviewJson, stable(reviewArtifact));
  const reviewMd = `# C37 replacement Opus review\n\n- Reviewer object received: ${actualReview !== null}\n- CLI exit: ${exitCode}\n- Decision: \`${actualReview?.decision ?? 'NOT_RECEIVED'}\`\n- Substantive path: \`${actualReview?.substantivePathDecision ?? 'NOT_RECEIVED'}\`\n- Complete 57-entry package reviewed: ${actualReview?.complete57EntryPackageReviewed === true}\n- Approval gate: ${gate?.pass === true ? 'PASS' : 'FAIL'}\n- Authorization consumed: ${authorizationConsumed}\n- Retry authorized: false\n- Parse/technical error: ${parseError ?? 'none'}\n- Blocking findings: ${JSON.stringify(actualReview?.blockingFindings ?? [])}\n- Nonblocking observations: ${JSON.stringify(actualReview?.nonblockingObservations ?? [])}\n`;
  writeNew(F.reviewMd, reviewMd);

  const after = inputSnapshot(pkg);
  const repositoryInputsUnchanged = before.aggregateSha256 === after.aggregateSha256
    && git('diff', '--cached', '--name-only') === ''
    && git('status', '--porcelain=v1', '--untracked-files=no') === '';
  const receipt = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: authorizationConsumed ? 'C37_REPLACEMENT_OPUS_SINGLE_SUBMISSION_RECEIPT' : 'C37_REPLACEMENT_OPUS_SUBMISSION_NOT_INITIATED',
    provider: 'Anthropic', reviewerTool: 'Claude Code', reviewerModel: EXPECTED.model,
    startedUtc, endedUtc, childPid, spawnObserved, spawnError, exitCode, signal, timedOut,
    authorization: { sha256: EXPECTED.authorization, consumed: authorizationConsumed, invocationOrdinal: 1, maximumInvocations: 1, retryAuthorized: false },
    applicationSubmission: {
      inputMethod: 'binary-safe child stdin', stdinWriteInitiated, stdinFinishObserved, stdinEndCallbackObserved, stdinError,
      completeChildStdinAcceptanceConfirmed: stdinFinishObserved && stdinEndCallbackObserved && stdinError === null,
      totalStdinBytes: submission.totalBytes, stdinSha256: submission.sha256,
      evidenceEntries: 57, rawEvidenceBytes: submission.evidenceBytes,
      requestAndManifestMetadataBytes: submission.metadataBytes,
      entryFramingBytes: submission.entryFramingBytes,
      evidenceBeyondAuthorizedPackageIncluded: false,
      credentialsEnvironmentFilesOrUnrelatedClientDataIncludedInApplicationPayload: false
    },
    transportObservability: { providerRequestObserved: parsed !== null ? true : null, providerRequestObservationMethod: parsed !== null ? 'Claude Code response envelope captured' : 'not directly instrumented', modelEnvelopeObserved: parsed !== null, exactProviderWireBytes: null, exactProviderProtocolFramingObservable: false },
    response: { stdout: fileRecord(F.stdout), stderr: fileRecord(F.stderr), reviewerObjectReceived: actualReview !== null, decisionToken: actualReview?.decision ?? null, substantivePathToken: actualReview?.substantivePathDecision ?? null },
    repositoryInputsUnchanged,
    authorizationStatusAfterInvocation: authorizationConsumed ? 'CONSUMED_NO_RETRY_AUTHORIZED' : 'UNUSED',
    pass: authorizationConsumed && repositoryInputsUnchanged,
  };
  writeNew(F.receipt, stable(receipt));

  let cleanupError = null;
  try {
    const resolved = path.resolve(CONFIG_ROOT);
    assert(resolved.toLowerCase().startsWith(`${path.resolve('C:/tmp').toLowerCase()}${path.sep}`), 'CLEANUP_OUTSIDE_TMP');
    assert(path.basename(resolved) === 'c37-replacement-checkpoint66-20260801T123200Z', 'CLEANUP_BASENAME');
    assert(!child || child.exitCode !== null || child.signalCode !== null || spawnError !== null, 'CHILD_STILL_ACTIVE');
    fs.rmSync(resolved, { recursive: true, force: true });
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error);
  }

  const capture = {
    schemaVersion: 1,
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C37',
    classification: gate?.pass === true && repositoryInputsUnchanged && !cleanupError
      ? 'C37_REPLACEMENT_OPUS_CLI_CAPTURE_APPROVAL_GATES_PASS'
      : 'C37_REPLACEMENT_OPUS_CLI_CAPTURE_NOT_APPROVED',
    commandWithoutCredentials: [CLI, ...safeArgs],
    commandLineContainsEvidenceOrCredentials: false,
    startedUtc, endedUtc, childPid, spawnObserved, spawnError, exitCode, signal, timedOut,
    stdinWriteInitiated, stdinFinishObserved, stdinEndCallbackObserved, stdinError,
    authorizationConsumed, retryAuthorized: false,
    marker: fileRecord(F.marker),
    request: fileRecord(F.requestMd),
    wrappers: { checkpoint65: fileRecord(F.replacementWrapperMd), checkpoint66: fileRecord(F.checkpoint66WrapperMd) },
    config: { path: CONFIG, bytes: 18, sha256: EXPECTED.config, removedAfterClosedChildCapture: !fs.existsSync(CONFIG_ROOT), cleanupError },
    package: { entries: 57, rawEvidenceBytes: EXPECTED.packageBytes, sourceManifestSha256: EXPECTED.sourceManifest, detailedManifestSha256: EXPECTED.detailedManifest, aggregateSha256: EXPECTED.aggregate },
    response: { stdout: fileRecord(F.stdout), stderr: fileRecord(F.stderr), reviewJson: fileRecord(F.reviewJson), reviewMd: fileRecord(F.reviewMd), receipt: fileRecord(F.receipt), reviewerObjectReceived: actualReview !== null, parseError },
    decisionToken: actualReview?.decision ?? null,
    substantivePathToken: actualReview?.substantivePathDecision ?? null,
    observations: actualReview?.nonblockingObservations ?? [],
    reviewGate: gate,
    repositoryInputsUnchanged,
    pass: gate?.pass === true && repositoryInputsUnchanged && !cleanupError,
  };
  writeNew(F.capture, stable(capture));

  const classification = capture.pass
    ? 'C37_REPLACEMENT_OPUS_APPROVED_FINALIZATION_AUTHORIZED'
    : actualReview?.decision === 'REJECTED'
      ? 'C37_REPLACEMENT_OPUS_REJECTED'
      : actualReview?.substantivePathDecision === 'MORE_EVIDENCE_REQUIRED'
        ? 'C37_REPLACEMENT_OPUS_MORE_EVIDENCE_REQUIRED'
        : 'C37_REPLACEMENT_OPUS_TECHNICAL_INCOMPLETE';
  process.stdout.write(stable({ classification, exitCode, decision: actualReview?.decision ?? null, substantivePathDecision: actualReview?.substantivePathDecision ?? null, reviewGatePass: gate?.pass === true, authorizationConsumed, retryAuthorized: false, cleanupError }));
  if (!capture.pass) process.exitCode = 2;
}

if (process.argv[2] !== '--invoke') throw new Error('Usage: node COMMIT_5R1C37_CHECKPOINT_66_REPLACEMENT_OPUS_DRIVER.mjs --invoke');
await invoke();
