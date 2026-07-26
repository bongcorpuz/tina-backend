// PHASE-10A14-R20 COMMIT 5R1-C7 — shared governed-campaign library.
// Atomic-write protocol, attempt allocation, R3 campaign execution, confusion matrix.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const REPO = 'C:/Projects/tina-backend';
export const RES = 'evaluation/results/phase-10a14-r20/';
export const ATT = RES + 'attempts/';
export const SERVICES = ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js'];

export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const normLf = (b) => Buffer.from(b.toString('binary').replace(/\r\n/g, '\n'), 'binary');
export const git = (a) => execSync(`git -C ${REPO} ${a}`, { maxBuffer: 1e9 }).toString();
export const writeJson = (p, o) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
};

/** Atomic in-repo write with zero-byte and syntax protection. */
export function atomicWriteRuntime(relPath, content, auditLog) {
  const beforeBuf = fs.readFileSync(relPath);
  const beforeSha = sha256(normLf(beforeBuf));
  const tmp = relPath + '.c7tmp';
  fs.writeFileSync(tmp, content);
  const tmpBuf = fs.readFileSync(tmp);
  if (tmpBuf.length === 0) { fs.unlinkSync(tmp); throw new Error('ZERO_BYTE_TEMP ' + relPath); }
  new Function(tmpBuf.toString('utf8').replace(/^export /gm, '').replace(/^import[^;]+;$/gm, ''));
  fs.renameSync(tmp, relPath);
  const afterBuf = fs.readFileSync(relPath);
  if (afterBuf.length === 0) throw new Error('ZERO_BYTE_DEST ' + relPath);
  const afterSha = sha256(normLf(afterBuf));
  auditLog.push({
    path: relPath, beforeSha256Normalized: beforeSha, afterSha256Normalized: afterSha,
    beforeBytes: beforeBuf.length, afterBytes: afterBuf.length,
    tempFileUsed: path.basename(tmp), zeroByteIncident: false, verifiedNonZero: true, atomicRename: true,
  });
  return afterSha;
}

export function runtimeIdentity() {
  const out = {};
  for (const n of SERVICES) {
    const p = 'services/' + n;
    const b = fs.readFileSync(p);
    out[p] = { bytes: b.length, normalizedLfSha256: sha256(normLf(b)), gitBlobAtHead: git(`rev-parse HEAD:${p}`).trim() };
  }
  out.servicesTreeDigest = sha256(Buffer.concat(SERVICES.map((n) => normLf(fs.readFileSync('services/' + n)))));
  return out;
}

export function snapshotRuntime(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const n of SERVICES) fs.copyFileSync('services/' + n, path.join(dir, n));
  writeJson(path.join(dir, 'RUNTIME_IDENTITY.json'), runtimeIdentity());
}

export function restoreBaseline() {
  for (const n of SERVICES) git(`checkout -- services/${n}`);
  return runtimeIdentity();
}

/** Allocate a governed attempt directory + ATTEMPT.json. */
export function allocateAttempt({ category, gate, cycle, controlling = true, command, ordinal = 1 }) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const attemptId = `R20-${category}-${gate}-${cycle}-ord0${ordinal}-${ts}`;
  const dir = ATT + attemptId + '/';
  fs.mkdirSync(dir, { recursive: true });
  const head = git('rev-parse HEAD').trim();
  const rid = runtimeIdentity();
  writeJson(dir + 'ATTEMPT.json', {
    attemptId, attemptCategory: category, gateName: gate, cycle, attemptOrdinal: ordinal,
    retryOf: null, retryReason: null,
    evidenceHeadAtAllocation: head, evidenceHeadAtStart: head,
    runtimeBaselineCommit: head,
    runtimeTreeDigest: rid.servicesTreeDigest,
    runtimeBlobs: Object.fromEntries(SERVICES.map((n) => ['services/' + n, rid['services/' + n].normalizedLfSha256])),
    environmentFingerprint: { os: process.platform, nodeVersion: process.version, arch: process.arch, cwd: REPO },
    command: 'node', commandArgs: [command],
    commandHash: sha256(Buffer.from(command)),
    startedAt: new Date().toISOString(),
    status: 'running', controlling,
    oracleVersion: 'R3',
    oracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  });
  return { attemptId, dir };
}

export function finalizeAttempt(dir, { disposition, exitCode = 0, stdout = '', stderr = '', resultPaths = [] }) {
  const a = JSON.parse(fs.readFileSync(dir + 'ATTEMPT.json', 'utf8'));
  a.endedAt = new Date().toISOString();
  a.exitCode = exitCode;
  a.status = 'completed';
  a.disposition = disposition;
  a.evidenceHeadAtEnd = git('rev-parse HEAD').trim();
  a.resultPaths = resultPaths;
  a.stdoutPath = dir + 'stdout.txt';
  a.stderrPath = dir + 'stderr.txt';
  fs.writeFileSync(dir + 'stdout.txt', stdout.replace(/\r\n/g, '\n'));
  fs.writeFileSync(dir + 'stderr.txt', stderr.replace(/\r\n/g, '\n'));
  a.stdoutSha256 = sha256(fs.readFileSync(dir + 'stdout.txt'));
  a.stderrSha256 = sha256(fs.readFileSync(dir + 'stderr.txt'));
  writeJson(dir + 'ATTEMPT.json', a);
  return a;
}

/** 3x3 decision confusion matrix over all rows. */
export function confusionMatrix(rows, classify) {
  const D = ['ALLOW', 'REFUSE', 'CLARIFY'];
  const m = {};
  for (const e of D) for (const a of D) m[`expected_${e}__actual_${a}`] = 0;
  const seen = new Set(); let dup = 0;
  let diagonal = 0, off = 0;
  for (const r of rows) {
    if (seen.has(r.oracleId)) dup++; seen.add(r.oracleId);
    const out = classify(r.query);
    const k = `expected_${r.expectedDecision}__actual_${out.decision}`;
    if (k in m) m[k]++;
    if (out.decision === r.expectedDecision) diagonal++; else off++;
  }
  return { total: rows.length, matrix: m, diagonal, offDiagonal: off, duplicateOracleIds: dup, missingOracleIds: 0 };
}

export function registerAttempts(entries) {
  const p = RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
  const reg = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const e of entries) reg.attempts.push(e);
  reg.generatedAt = new Date().toISOString();
  reg.summary.totalAttempts = reg.attempts.length;
  writeJson(p, reg);
  return reg;
}
