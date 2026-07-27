// PHASE-10A14-R20 COMMIT 5R1-C22 - governed compliant baseline after C21 adjudication.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const SOURCE_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05-ord01-2026-07-27T04-38-01-998Z';
const SNAP = L.ATT + SOURCE_ATTEMPT + '/runtime-snapshot/';
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

function headFile(rel) {
  return execSync(`git -C ${L.REPO} show HEAD:${rel}`, { maxBuffer: 1e9 });
}

async function restoreHead(audit) {
  for (const n of L.SERVICES) {
    await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  }
  await L.assertRuntimeIntact('c22-governed-baseline-restored-head');
  return L.runtimeIdentity();
}

const log = [];
const say = (s) => { log.push(s); console.log(s); };
let dir = null;
let attemptId = null;

try {
  await L.assertRuntimeIntact('c22-governed-baseline-start');
  L.loadR3();
  const parts = [];
  const snapVerify = {};
  for (const n of L.SERVICES) {
    const b = fs.readFileSync(SNAP + n);
    if (b.length === 0) throw new Error('ZERO_BYTE_SNAPSHOT ' + n);
    const got = L.sha256(L.normLf(b));
    parts.push(L.normLf(b));
    snapVerify[n] = { bytes: b.length, normalizedLfSha256: got };
  }
  const snapTree = L.sha256(Buffer.concat(parts));
  if (snapTree !== WANT_TREE) throw new Error('C20_BASELINE_TREE_DIGEST_MISMATCH ' + snapTree);
  say('C20 governed baseline snapshot verified; services tree digest ' + snapTree);

  ({ attemptId, dir } = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c22_governance_compliant_baseline',
    cycle: 'commit5r1c22-baseline',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c22-governed-baseline.mjs',
  }));
  say('attempt allocated ' + attemptId);

  const writeAudit = [];
  for (const n of L.SERVICES) {
    await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), writeAudit);
  }
  await L.assertRuntimeIntact('c22-governed-baseline-post-install');
  const g = await runGates({ label: 'c22-governance-compliant-baseline' });
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
  L.writeJson(dir + 'BASELINE_RESULT.json', {
    attemptId,
    unit: 'COMMIT 5R1-C22',
    baselineDefinition: 'C20 accepted pure override layer; all C21-added overrides removed by governance adjudication',
    sourceAttempt: SOURCE_ATTEMPT,
    oracle: 'R3',
    oracleSha256: L.R3_SHA,
    snapshotVerification: snapVerify,
    snapshotTreeDigest: snapTree,
    requiredTreeDigest: WANT_TREE,
    installedIdentity: g.runtimeIdentity,
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
    disposition: discrepancies.length === 0 ? 'accepted_governance_compliant_baseline' : 'governance_baseline_discrepancy',
    stdout: log.join('\n'),
    resultPaths: [dir + 'BASELINE_RESULT.json'],
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
