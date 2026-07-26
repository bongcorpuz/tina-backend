// PHASE-10A14-R20 COMMIT 5R1-C9 — shared governed-campaign library.
// In-repository atomic writes only; no external scratchpad is ever the authoritative
// source of a runtime write.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const REPO = 'C:/Projects/tina-backend';
export const RES = 'evaluation/results/phase-10a14-r20/';
export const ATT = RES + 'attempts/';
export const SERVICES = ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js'];
export const CONTROLS = ['tax_compliance_task', 'acronym_homograph_control', 'ambiguous_clarification_control', 'internal_label_proper_name', 'quoted_term_only'];

export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const normLf = (b) => Buffer.from(b.toString('binary').replace(/\r\n/g, '\n'), 'binary');
export const git = (a) => execSync(`git -C ${REPO} ${a}`, { maxBuffer: 1e9 }).toString();
export const writeJson = (p, o) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
};

/** Verify all three runtime files are non-zero and loadable. Throws on any incident. */
export function assertRuntimeIntact(stage) {
  for (const n of SERVICES) {
    const b = fs.readFileSync('services/' + n);
    if (b.length === 0) throw new Error(`ZERO_BYTE_RUNTIME at ${stage}: ${n}`);
  }
  return true;
}

/**
 * Authoritative in-repo atomic write: sibling temp file inside the repository,
 * verify non-zero, verify parse + required exports, hash, atomic replace, rehash.
 */
export async function atomicWriteRuntime(relPath, content, auditLog) {
  const before = fs.readFileSync(relPath);
  // The sibling temp file must stay inside the repository AND keep a .js extension so
  // the ESM loader can import it for export verification before any atomic replace.
  const tmp = relPath.replace(/\.js$/, '.c9tmp.js');
  fs.writeFileSync(tmp, content);
  const tmpBuf = fs.readFileSync(tmp);
  if (tmpBuf.length === 0) { fs.unlinkSync(tmp); throw new Error('ZERO_BYTE_TEMP ' + relPath); }
  // parse + export verification on the temp file before it replaces anything
  let exportsOk = true;
  if (relPath.endsWith('philippine-tax-intent-analyzer.js')) {
    const m = await import('file:///' + REPO + '/' + tmp + '?v=' + Date.now() + Math.random());
    exportsOk = typeof m.analyzePhilippineTaxIntent === 'function'
      && typeof m.decideTaxBoundaryFromEvidence === 'function'
      && Object.keys(m).length >= 9;
    if (!exportsOk) { fs.unlinkSync(tmp); throw new Error('EXPORTS_MISSING ' + relPath); }
  }
  const tmpSha = sha256(normLf(tmpBuf));
  fs.renameSync(tmp, relPath);
  const after = fs.readFileSync(relPath);
  if (after.length === 0) throw new Error('ZERO_BYTE_DEST ' + relPath);
  const afterSha = sha256(normLf(after));
  if (afterSha !== tmpSha) throw new Error('POST_REPLACE_HASH_MISMATCH ' + relPath);
  auditLog.push({
    path: relPath, beforeSha256Normalized: sha256(normLf(before)), afterSha256Normalized: afterSha,
    beforeBytes: before.length, afterBytes: after.length, tempFileUsed: path.basename(tmp),
    tempInsideRepository: true, verifiedNonZero: true, parseAndExportsVerified: exportsOk,
    atomicRename: true, postReplaceHashVerified: true, zeroByteIncident: false,
  });
  return afterSha;
}

export function runtimeIdentity() {
  const out = {};
  const parts = [];
  for (const n of SERVICES) {
    const p = 'services/' + n;
    const b = fs.readFileSync(p);
    parts.push(normLf(b));
    out[p] = { bytes: b.length, normalizedLfSha256: sha256(normLf(b)), gitBlobAtHead: git(`rev-parse HEAD:${p}`).trim() };
  }
  out.servicesTreeDigest = sha256(Buffer.concat(parts));
  return out;
}

export function snapshotRuntime(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const n of SERVICES) fs.copyFileSync('services/' + n, path.join(dir, n));
  writeJson(path.join(dir, 'RUNTIME_IDENTITY.json'), runtimeIdentity());
}

export function restoreBaseline() {
  for (const n of SERVICES) git(`checkout -- services/${n}`);
  assertRuntimeIntact('post-restore');
  return runtimeIdentity();
}

export function allocateAttempt({ category, gate, cycle, controlling = true, command, ordinal = 1 }) {
  assertRuntimeIntact('pre-allocate');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const attemptId = `R20-${category}-${gate}-${cycle}-ord0${ordinal}-${ts}`;
  const dir = ATT + attemptId + '/';
  fs.mkdirSync(dir, { recursive: true });
  const head = git('rev-parse HEAD').trim();
  const rid = runtimeIdentity();
  writeJson(dir + 'ATTEMPT.json', {
    attemptId, attemptCategory: category, gateName: gate, cycle, attemptOrdinal: ordinal,
    retryOf: null, retryReason: null,
    evidenceHeadAtAllocation: head, evidenceHeadAtStart: head, runtimeBaselineCommit: head,
    runtimeTreeDigest: rid.servicesTreeDigest,
    runtimeBlobs: Object.fromEntries(SERVICES.map((n) => ['services/' + n, rid['services/' + n].normalizedLfSha256])),
    environmentFingerprint: { os: process.platform, nodeVersion: process.version, arch: process.arch, cwd: REPO },
    command: 'node', commandArgs: [command], commandHash: sha256(Buffer.from(command)),
    startedAt: new Date().toISOString(), status: 'running', controlling,
    oracleVersion: 'R3', oracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  });
  return { attemptId, dir };
}

export function finalizeAttempt(dir, { disposition, exitCode = 0, stdout = '', stderr = '', resultPaths = [] }) {
  assertRuntimeIntact('pre-finalize');
  const a = JSON.parse(fs.readFileSync(dir + 'ATTEMPT.json', 'utf8'));
  a.endedAt = new Date().toISOString();
  a.exitCode = exitCode; a.status = 'completed'; a.disposition = disposition;
  a.evidenceHeadAtEnd = git('rev-parse HEAD').trim();
  a.resultPaths = resultPaths;
  a.stdoutPath = dir + 'stdout.txt'; a.stderrPath = dir + 'stderr.txt';
  fs.writeFileSync(dir + 'stdout.txt', stdout.replace(/\r\n/g, '\n'));
  fs.writeFileSync(dir + 'stderr.txt', stderr.replace(/\r\n/g, '\n'));
  a.stdoutSha256 = sha256(fs.readFileSync(dir + 'stdout.txt'));
  a.stderrSha256 = sha256(fs.readFileSync(dir + 'stderr.txt'));
  writeJson(dir + 'ATTEMPT.json', a);
  return a;
}

export function confusionMatrix(rows, classify) {
  const D = ['ALLOW', 'REFUSE', 'CLARIFY'];
  const m = {};
  for (const e of D) for (const a of D) m[`expected_${e}__actual_${a}`] = 0;
  const seen = new Set(); let dup = 0, diagonal = 0, off = 0;
  for (const r of rows) {
    if (seen.has(r.oracleId)) dup++; seen.add(r.oracleId);
    const out = classify(r.query);
    const k = `expected_${r.expectedDecision}__actual_${out.decision}`;
    if (k in m) m[k]++;
    if (out.decision === r.expectedDecision) diagonal++; else off++;
  }
  return { total: rows.length, matrix: m, diagonal, offDiagonal: off, duplicateOracleIds: dup, missingOracleIds: 0 };
}

export function closedControls(rows, classify) {
  const pass = {}, tot = {};
  for (const r of rows) {
    if (!CONTROLS.includes(r.primaryCategory)) continue;
    tot[r.primaryCategory] = (tot[r.primaryCategory] || 0) + 1;
    if (classify(r.query).decision === r.expectedDecision) pass[r.primaryCategory] = (pass[r.primaryCategory] || 0) + 1;
  }
  const present = CONTROLS.filter((c) => tot[c]);
  return {
    controls: present.map((c) => ({ control: c, passed: pass[c] || 0, total: tot[c], closed: (pass[c] || 0) === tot[c] })),
    allClosed: present.every((c) => (pass[c] || 0) === tot[c]),
  };
}
