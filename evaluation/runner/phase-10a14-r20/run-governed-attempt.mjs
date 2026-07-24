// PHASE-10A14-R20 governed tooling — governed attempt wrapper.
// Allocates an exclusive immutable attempt directory, captures identity,
// executes a supplied callback, imports stdout/stderr from external capture,
// and writes a terminal, immutable attempt record.
//
// NO tax-domain decision logic lives here. The wrapper may invoke the existing
// runtime classifier and normalize output FOR REPORTING ONLY.

import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  REPO, sha256Str, sha256File, gitObject, objectType,
  captureRuntimeIdentity, captureHarnessIdentity, captureEnvironmentFingerprint,
  dependencyLockDigest,
} from './identity.mjs';

const ATTEMPTS_DIR = `${REPO}/evaluation/results/phase-10a14-r20/attempts`;
const CLOSED_CATEGORIES = new Set([
  'domain_campaign', 'focused_suite', 'deterministic_runner',
  'staging_runner', 'synthetic_validator', 'other',
]);

// Deterministic, outcome-independent attempt id.
export function allocateAttemptId({ category, gate, cycle, ordinal, allocatedAtUtc }) {
  if (!CLOSED_CATEGORIES.has(category)) {
    throw new Error(`illegal attempt category: ${category}`);
  }
  const ts = allocatedAtUtc.replace(/[:.]/g, '-');
  return `R20-${category}-${gate}-${cycle}-ord${String(ordinal).padStart(2, '0')}-${ts}`;
}

function assertNoOverwrite(dir) {
  if (existsSync(join(dir, 'ATTEMPT.json'))) {
    throw new Error(`refuse to overwrite terminal attempt directory: ${dir}`);
  }
}

// runFn: async () => ({ status, disposition, resultFiles: {name: contentString}, stdout, stderr })
// resultFiles are written into the immutable attempt directory; resultPaths recorded.
export async function runGovernedAttempt(spec, runFn) {
  const {
    category, gate, cycle, ordinal, controlling,
    retryOf = null, retryReason = null,
  } = spec;

  const allocatedAtUtc = new Date().toISOString();
  const attemptId = allocateAttemptId({ category, gate, cycle, ordinal, allocatedAtUtc });
  const dir = join(ATTEMPTS_DIR, attemptId);

  if (existsSync(dir)) throw new Error(`attempt id collision: ${attemptId}`);
  assertNoOverwrite(dir);
  mkdirSync(dir, { recursive: true });

  const evidenceHeadAtAllocation = gitObject('HEAD');
  const runtime = captureRuntimeIdentity();
  const harness = captureHarnessIdentity();
  const env = captureEnvironmentFingerprint();

  const evidenceHeadAtStart = gitObject('HEAD');
  const startedAt = new Date().toISOString();

  // External capture outside the tracked repository.
  const extCapture = join(tmpdir(), `r20-capture-${attemptId}`);
  mkdirSync(extCapture, { recursive: true });
  const extStdout = join(extCapture, 'stdout.txt');
  const extStderr = join(extCapture, 'stderr.txt');

  let outcome;
  let exitCode = 0;
  let signal = null;
  let status = 'completed';
  let disposition = spec.disposition || (controlling ? 'controlling' : 'non_controlling');

  try {
    outcome = await runFn({ attemptId, dir });
    writeFileSync(extStdout, outcome.stdout ?? '');
    writeFileSync(extStderr, outcome.stderr ?? '');
    status = outcome.status ?? 'completed';
    disposition = outcome.disposition ?? disposition;
    exitCode = outcome.exitCode ?? 0;
  } catch (err) {
    status = 'technical_failure';
    disposition = 'technical_failure';
    exitCode = 1;
    writeFileSync(extStdout, '');
    writeFileSync(extStderr, String(err && err.stack ? err.stack : err));
    outcome = { resultFiles: {}, command: spec.command || 'inline', commandArgs: spec.commandArgs || [] };
  }

  // Import stdout/stderr bytes into the immutable directory, verify byte equality.
  const stdoutBytes = readFileSync(extStdout);
  const stderrBytes = readFileSync(extStderr);
  writeFileSync(join(dir, 'stdout.txt'), stdoutBytes);
  writeFileSync(join(dir, 'stderr.txt'), stderrBytes);
  // Byte-equality check: imported bytes must equal external-capture bytes.
  const okStdout = Buffer.compare(stdoutBytes, readFileSync(join(dir, 'stdout.txt'))) === 0;
  const okStderr = Buffer.compare(stderrBytes, readFileSync(join(dir, 'stderr.txt'))) === 0;
  if (okStdout && okStderr) {
    rmSync(extCapture, { recursive: true, force: true });
  }

  // Write result files into the immutable directory.
  const resultPaths = [];
  for (const [name, content] of Object.entries(outcome.resultFiles || {})) {
    const p = join(dir, name);
    writeFileSync(p, content);
    resultPaths.push(`evaluation/results/phase-10a14-r20/attempts/${attemptId}/${name}`);
  }

  const endedAt = new Date().toISOString();
  const evidenceHeadAtEnd = gitObject('HEAD');

  const command = outcome.command || spec.command || 'inline';
  const commandArgs = outcome.commandArgs || spec.commandArgs || [];
  const commandStr = [command, ...commandArgs].join(' ');

  const record = {
    attemptId,
    attemptCategory: category,
    gateName: gate,
    cycle,
    attemptOrdinal: ordinal,
    retryOf,
    retryReason,
    evidenceHeadAtAllocation,
    evidenceHeadAtStart,
    evidenceHeadAtEnd,
    runtimeBaselineCommit: runtime.startingCommit,
    runtimeTreeDigest: runtime.servicesTreeContentDigest,
    runtimeServicesTreeObject: runtime.servicesTreeObject,
    runtimeBlobs: runtime.runtimeBlobs,
    harnessTreeDigest: harness.testsTree,
    governedToolingContentDigest: harness.governedToolingContentDigest,
    dependencyLockDigest: dependencyLockDigest(),
    dependencyLockBlobs: runtime.dependencyLock,
    environmentFingerprint: env,
    command,
    commandArgs,
    commandHash: sha256Str(commandStr),
    startedAt,
    endedAt,
    exitCode,
    signal,
    status,
    disposition,
    controlling: !!controlling,
    stdoutPath: `evaluation/results/phase-10a14-r20/attempts/${attemptId}/stdout.txt`,
    stderrPath: `evaluation/results/phase-10a14-r20/attempts/${attemptId}/stderr.txt`,
    resultPaths,
    stdoutSha256: sha256File(join(dir, 'stdout.txt')),
    stderrSha256: sha256File(join(dir, 'stderr.txt')),
    externalCaptureRemoved: !existsSync(extCapture),
  };

  // Validate every referenced Git SHA is a real object (evidence heads, runtime baseline).
  record.gitObjectValidation = {
    evidenceHeadAtAllocation: objectType(evidenceHeadAtAllocation),
    evidenceHeadAtStart: objectType(evidenceHeadAtStart),
    evidenceHeadAtEnd: objectType(evidenceHeadAtEnd),
    runtimeBaselineCommit: objectType(runtime.startingCommit),
  };

  writeFileSync(join(dir, 'ATTEMPT.json'), JSON.stringify(record, null, 2) + '\n');
  return record;
}
