// PHASE-10A14-R20 COMMIT 5R1-C11 — shared governed-campaign library.
// In-repository sibling temp files ending in .js only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const REPO = 'C:/Projects/tina-backend';
export const RES = 'evaluation/results/phase-10a14-r20/';
export const ATT = RES + 'attempts/';
export const SERVICES = ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js'];
export const CONTROLS = ['tax_compliance_task', 'acronym_homograph_control', 'ambiguous_clarification_control', 'internal_label_proper_name', 'quoted_term_only'];
export const REQUIRED_EXPORTS = ['TAX_BOUNDARY_DECISIONS', 'TAX_BOUNDARY_REASON_CODES', 'TAX_BOUNDARY_SPEECH_ACTS', 'TAX_RELATION_TYPES', 'analyzePhilippineTaxIntent', 'decideTaxBoundaryFromEvidence', 'normalizeTaxBoundaryText', 'segmentTaxBoundaryClauses', 'serializeTaxBoundaryEvidence'];
export const SUITES = [
  ['v3', RES + 'COMMIT_5R1C7_DECISION_COUNTERFACTUAL_V3_SUITE.json'],
  ['v4', RES + 'COMMIT_5R1C8_DECISION_COUNTERFACTUAL_V4_SUITE.json'],
  ['v5', RES + 'COMMIT_5R1C9_DECISION_COUNTERFACTUAL_V5_SUITE.json'],
  ['v6', RES + 'COMMIT_5R1C10_DECISION_COUNTERFACTUAL_V6_SUITE.json'],
];

export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const normLf = (b) => Buffer.from(b.toString('binary').replace(/\r\n/g, '\n'), 'binary');
export const git = (a) => execSync(`git -C ${REPO} ${a}`, { maxBuffer: 1e9 }).toString();
export const writeJson = (p, o) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
};

export async function assertRuntimeIntact(stage) {
  for (const n of SERVICES) {
    const b = fs.readFileSync('services/' + n);
    if (b.length === 0) throw new Error(`ZERO_BYTE_RUNTIME at ${stage}: ${n}`);
  }
  const m = await import('file:///' + REPO + '/services/philippine-tax-intent-analyzer.js?v=' + Date.now() + Math.random());
  for (const e of REQUIRED_EXPORTS) if (!(e in m)) throw new Error(`MISSING_EXPORT at ${stage}: ${e}`);
  return true;
}

export async function atomicWriteRuntime(relPath, content, auditLog) {
  const before = fs.readFileSync(relPath);
  const tmp = relPath.replace(/\.js$/, '.c11tmp.js');
  fs.writeFileSync(tmp, content);
  const tmpBuf = fs.readFileSync(tmp);
  if (tmpBuf.length === 0) { fs.unlinkSync(tmp); throw new Error('ZERO_BYTE_TEMP ' + relPath); }
  let exportsVerified = false;
  if (relPath.endsWith('philippine-tax-intent-analyzer.js')) {
    const m = await import('file:///' + REPO + '/' + tmp + '?v=' + Date.now() + Math.random());
    for (const e of REQUIRED_EXPORTS) {
      if (!(e in m)) { fs.unlinkSync(tmp); throw new Error('EXPORTS_MISSING ' + e); }
    }
    exportsVerified = true;
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
    tempInsideRepository: true, tempEndsWithJs: true, verifiedNonZero: true,
    parseAndExportsVerified: exportsVerified, atomicRename: true, postReplaceHashVerified: true,
    zeroByteIncident: false,
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

export async function restoreBaseline() {
  for (const n of SERVICES) git(`checkout -- services/${n}`);
  await assertRuntimeIntact('post-restore');
  return runtimeIdentity();
}

export async function allocateAttempt({ category, gate, cycle, controlling = true, command, ordinal = 1 }) {
  await assertRuntimeIntact('pre-allocate');
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

export async function finalizeAttempt(dir, { disposition, exitCode = 0, stdout = '', stderr = '', resultPaths = [] }) {
  await assertRuntimeIntact('pre-finalize');
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

/** Seven-shape rich-context invariant. No candidate may regress any shape. */
export const GUARD_SHAPES = [
  { shape: 'bare_term', query: 'holding period', expected: 'ALLOW' },
  { shape: 'recognized_polysemous_acronym', query: 'RMC', expected: 'CLARIFY' },
  { shape: 'issuance_context', query: 'What did the RMC issuance say about VAT?', expected: 'ALLOW' },
  { shape: 'procedure_context', query: 'Explain RMC for BIR issuances.', expected: 'ALLOW' },
  { shape: 'ordinary_homograph', query: 'Can a supplier reject a return of goods?', expected: 'REFUSE' },
  { shape: 'richer_tax_sentence', query: 'How is the holding period applied to a capital gains tax computation on land?', expected: 'ALLOW' },
  { shape: 'metadata_suffixed_contentless', query: 'What is the holding period? Context 1.', expected: 'REFUSE' },
];
export function richContextGuard(classify) {
  const probes = GUARD_SHAPES.map((g) => {
    const actual = classify(g.query).decision;
    return { ...g, actual, pass: actual === g.expected };
  });
  return { probes, allPass: probes.every((p) => p.pass) };
}

/** Run the full combined counterfactual suite. */
export function runCounterfactuals(classify) {
  const bySuite = {}; const failures = [];
  let total = 0, passed = 0;
  for (const [name, p] of SUITES) {
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    let k = 0;
    for (const q of s.queries) {
      const got = classify(q.query).decision;
      if (got === q.expectedDecision) k++;
      else failures.push({ suite: name, family: q.family, query: q.query, expected: q.expectedDecision, actual: got, contrast: q.contrast });
    }
    bySuite[name] = { total: s.queries.length, passed: k, failed: s.queries.length - k };
    total += s.queries.length; passed += k;
  }
  const byFamily = {};
  for (const f of failures) byFamily[f.family] = (byFamily[f.family] || 0) + 1;
  return { total, passed, failed: failures.length, bySuite, byFamily, failures };
}
