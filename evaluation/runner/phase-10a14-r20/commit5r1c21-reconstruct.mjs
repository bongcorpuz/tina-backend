// PHASE-10A14-R20 COMMIT 5R1-C21 - governed reconstruction of accepted C20.
import fs from 'node:fs';
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

const log = [];
const say = (s) => { log.push(s); console.log(s); };

await L.assertRuntimeIntact('c21-reconstruct-start');
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
say('snapshot identity verified; services tree digest ' + snapTree);

const { attemptId, dir } = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c21_reconstruction',
  cycle: 'commit5r1c21-recon',
  command: 'evaluation/runner/phase-10a14-r20/commit5r1c21-reconstruct.mjs',
});
say('attempt allocated ' + attemptId);

const audit = [];
for (const n of Object.keys(WANT)) {
  await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), audit);
}
await L.assertRuntimeIntact('c21-reconstruct-post-install');

const g = await runGates({ label: 'c21-reconstruction' });
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
L.writeJson(dir + 'RECONSTRUCTION_RESULT.json', {
  attemptId,
  oracle: 'R3',
  oracleSha256: L.R3_SHA,
  sourceAttempt: SOURCE_ATTEMPT,
  snapshotVerification: snapVerify,
  snapshotTreeDigest: snapTree,
  requiredTreeDigest: WANT_TREE,
  installedIdentity: L.runtimeIdentity(),
  writeAudit: audit,
  expected: EXPECT,
  actual,
  discrepancies,
  exactReproduction: discrepancies.length === 0,
  gates: g,
});

await L.finalizeAttempt(dir, {
  disposition: discrepancies.length === 0 ? 'accepted_reconstruction_exact' : 'reconstruction_discrepancy',
  stdout: log.join('\n'),
  resultPaths: [dir + 'RECONSTRUCTION_RESULT.json'],
});
if (discrepancies.length) {
  console.error(JSON.stringify(discrepancies, null, 2));
  process.exit(2);
}
