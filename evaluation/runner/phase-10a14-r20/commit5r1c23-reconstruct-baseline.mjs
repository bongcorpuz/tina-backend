// PHASE-10A14-R20 COMMIT 5R1-C23 - governed reconstruction of the C20 compliant baseline.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const SOURCE_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05-ord01-2026-07-27T04-38-01-998Z';
const SNAP = L.ATT + SOURCE_ATTEMPT + '/runtime-snapshot/';
const WANT = {
  'philippine-tax-intent-analyzer.js': '66b13c4d5f42eabf115c2347c81e96458ea1986de99dc58da7e67e82fbafb0d9',
  'philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const WANT_TREE = '68f35b67344ce865204d82072d1a1138e78daaa44c0eacc24df68afd8cd0abcc';
const EXPECT = {
  canonicalPassed: 3449,
  decisionPassed: 3720,
  relationPassed: 3720,
  relationMismatches: 0,
  reasonMismatches: 271,
  materialFalseAllows: 0,
  materialFalseRefusals: 0,
  clarifyMismatches: 0,
  decisionCounterfactualPassed: 756,
  relationCounterfactualPassed: 282,
  clauseProbesPassed: 68,
  reasonCounterfactualPassed: 320,
  collisionProbesPassed: 148,
};

const headFile = (rel) => execSync(`git -C ${L.REPO} show HEAD:${rel}`, { maxBuffer: 1e9 });

async function restoreHead(audit) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('c23-baseline-restored-head');
  return L.runtimeIdentity();
}

const log = [];
const say = (s) => { log.push(s); console.log(s); };
let dir = null;

try {
  await L.assertRuntimeIntact('c23-baseline-start');
  const rows = L.loadR3();
  say(`R3 verified ${L.R3_SHA} rows=${rows.length}`);

  const snapVerify = {};
  const parts = [];
  for (const [n, want] of Object.entries(WANT)) {
    const b = fs.readFileSync(SNAP + n);
    if (b.length === 0) throw new Error('ZERO_BYTE_SNAPSHOT ' + n);
    const got = L.sha256(L.normLf(b));
    parts.push(L.normLf(b));
    snapVerify[n] = { bytes: b.length, normalizedLfSha256: got, expected: want, match: got === want };
    if (got !== want) throw new Error('C20_BASELINE_SNAPSHOT_IDENTITY_MISMATCH ' + n + ' ' + got);
  }
  const snapTree = L.sha256(Buffer.concat(parts));
  if (snapTree !== WANT_TREE) throw new Error('C20_BASELINE_TREE_DIGEST_MISMATCH ' + snapTree);
  say('C20 governed baseline snapshot verified; services tree digest ' + snapTree);

  const allocated = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c23_governance_compliant_baseline_reconstruction',
    cycle: 'commit5r1c23-baseline',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c23-reconstruct-baseline.mjs',
  });
  dir = allocated.dir;
  say('attempt allocated ' + allocated.attemptId);

  const writeAudit = [];
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), writeAudit);
  await L.assertRuntimeIntact('c23-baseline-post-install');
  const installed = L.runtimeIdentity();
  if (installed.servicesTreeDigest !== WANT_TREE) throw new Error('POST_INSTALL_TREE_MISMATCH ' + installed.servicesTreeDigest);

  const g = await runGates({ label: 'c23-governance-compliant-baseline-reconstruction' });
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
  L.writeJson(dir + 'BASELINE_RECONSTRUCTION_RESULT.json', {
    attemptId: allocated.attemptId,
    unit: 'COMMIT 5R1-C23',
    sourceAttempt: SOURCE_ATTEMPT,
    oracle: 'R3',
    oracleSha256: L.R3_SHA,
    snapshotVerification: snapVerify,
    snapshotTreeDigest: snapTree,
    requiredTreeDigest: WANT_TREE,
    installedIdentity: installed,
    expected: EXPECT,
    actual,
    discrepancies,
    exactBaselineReproduction: discrepancies.length === 0,
    gates: g,
    writeAudit,
    restoredHeadAfterEvidence: true,
    restoredIdentity,
    restoredAudit,
    decisionLayerClosure: g.decisionLockHeld,
    relationLayerClosure: g.relationLockHeld,
    reasonLayerClosure: false,
  });
  await L.finalizeAttempt(dir, {
    disposition: discrepancies.length === 0 ? 'accepted_c23_baseline_reconstruction_exact' : 'c23_baseline_reconstruction_discrepancy',
    stdout: log.join('\n'),
    resultPaths: [dir + 'BASELINE_RECONSTRUCTION_RESULT.json'],
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
