// PHASE-10A14-R20 COMMIT 5R1-C22 - governed reconstruction of accepted C21.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const SOURCE_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c21_reason_iteration_06-commit5r1c21-dev-06-ord01-2026-07-27T05-39-23-533Z';
const SNAP = L.ATT + SOURCE_ATTEMPT + '/runtime-snapshot/';
const WANT = {
  'philippine-tax-intent-analyzer.js': 'e74b480398390c775834dc481ff81bea017622c8f098b8c61886e9f1be7eecb0',
  'philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const WANT_TREE = 'dc7cd13f66843bb25bda8996ed380f8bf0911bc6bd6c313d10ab9a4b90f64567';
const EXPECT = {
  canonicalPassed: 3531,
  decisionPassed: 3720,
  relationPassed: 3720,
  relationMismatches: 0,
  reasonMismatches: 189,
  materialFalseAllows: 0,
  materialFalseRefusals: 0,
  clarifyMismatches: 0,
  decisionCounterfactualPassed: 756,
  relationCounterfactualPassed: 282,
  clauseProbesPassed: 68,
  reasonCounterfactualPassed: 344,
  collisionProbesPassed: 188,
};

function headFile(rel) {
  return execSync(`git -C ${L.REPO} show HEAD:${rel}`, { maxBuffer: 1e9 });
}

async function restoreHead(audit) {
  for (const n of L.SERVICES) {
    await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  }
  await L.assertRuntimeIntact('c22-c21-reconstruct-restored-head');
  return L.runtimeIdentity();
}

const log = [];
const say = (s) => { log.push(s); console.log(s); };
let dir = null;
let attemptId = null;

try {
  await L.assertRuntimeIntact('c22-c21-reconstruct-start');
  L.loadR3();

  const snapVerify = {};
  const parts = [];
  for (const [n, want] of Object.entries(WANT)) {
    const b = fs.readFileSync(SNAP + n);
    if (b.length === 0) throw new Error('ZERO_BYTE_SNAPSHOT ' + n);
    const got = L.sha256(L.normLf(b));
    parts.push(L.normLf(b));
    snapVerify[n] = { bytes: b.length, normalizedLfSha256: got, expected: want, match: got === want };
    if (got !== want) throw new Error('SNAPSHOT_IDENTITY_MISMATCH ' + n + ' ' + got);
  }
  const snapTree = L.sha256(Buffer.concat(parts));
  if (snapTree !== WANT_TREE) throw new Error('SNAPSHOT_TREE_DIGEST_MISMATCH ' + snapTree);
  say('C21 snapshot identity verified; services tree digest ' + snapTree);

  ({ attemptId, dir } = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c22_c21_technical_reconstruction',
    cycle: 'commit5r1c22-c21-recon',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c22-reconstruct-c21.mjs',
  }));
  say('attempt allocated ' + attemptId);

  const writeAudit = [];
  for (const n of Object.keys(WANT)) {
    await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), writeAudit);
  }
  await L.assertRuntimeIntact('c22-c21-reconstruct-post-install');

  const g = await runGates({ label: 'c22-c21-technical-reconstruction' });
  say(summarize(g));
  const actual = {
    canonicalPassed: g.r3.canonicalPassed,
    decisionPassed: g.r3.decisionPassed,
    relationPassed: g.r3.relationPassed,
    relationMismatches: g.r3.relationMismatches,
    reasonMismatches: g.r3.reasonMismatches,
    materialFalseAllows: g.r3.materialFalseAllows,
    materialFalseRefusals: g.r3.materialFalseRefusals,
    clarifyMismatches: g.r3.clarifyMismatches,
    decisionCounterfactualPassed: g.decisionCounterfactual.passed,
    relationCounterfactualPassed: g.relationCounterfactual.passed,
    clauseProbesPassed: g.clauseProbes.passed,
    reasonCounterfactualPassed: g.reasonCounterfactual.passed,
    collisionProbesPassed: g.collisionProbes.passed,
  };
  const discrepancies = Object.entries(EXPECT)
    .filter(([k, v]) => actual[k] !== v)
    .map(([k, v]) => ({ metric: k, expected: v, actual: actual[k] }));
  L.snapshotRuntime(dir + 'runtime-snapshot');
  const restoredAudit = [];
  const restoredIdentity = await restoreHead(restoredAudit);
  L.writeJson(dir + 'RECONSTRUCTION_RESULT.json', {
    attemptId,
    unit: 'COMMIT 5R1-C22',
    reconstructionOf: 'COMMIT 5R1-C21 accepted technical candidate',
    sourceAttempt: SOURCE_ATTEMPT,
    oracle: 'R3',
    oracleSha256: L.R3_SHA,
    snapshotVerification: snapVerify,
    snapshotTreeDigest: snapTree,
    requiredTreeDigest: WANT_TREE,
    installedIdentity: g.runtimeIdentity,
    writeAudit,
    expected: EXPECT,
    actual,
    discrepancies,
    exactTechnicalReproduction: discrepancies.length === 0,
    gates: g,
    restoredHeadAfterEvidence: true,
    restoredIdentity,
    restoredAudit,
    governanceAcceptance: 'NOT_ESTABLISHED_BY_TECHNICAL_RECONSTRUCTION',
  });
  await L.finalizeAttempt(dir, {
    disposition: discrepancies.length === 0 ? 'accepted_c21_technical_reconstruction' : 'c21_reconstruction_discrepancy',
    stdout: log.join('\n'),
    resultPaths: [dir + 'RECONSTRUCTION_RESULT.json'],
  });
  if (discrepancies.length) {
    console.error(JSON.stringify(discrepancies, null, 2));
    process.exit(2);
  }
} catch (err) {
  const restoreAudit = [];
  try { await restoreHead(restoreAudit); } catch {}
  if (dir && fs.existsSync(dir + 'ATTEMPT.json')) {
    await L.finalizeAttempt(dir, {
      disposition: 'technical_failure',
      exitCode: 1,
      stdout: log.join('\n'),
      stderr: String(err && err.stack ? err.stack : err),
      resultPaths: [],
    });
  }
  throw err;
}
