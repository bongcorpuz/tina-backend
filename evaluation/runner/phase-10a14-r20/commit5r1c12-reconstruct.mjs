// PHASE-10A14-R20 COMMIT 5R1-C12 — reconstruct the accepted C11 dev-07 candidate
// and execute it as a new governed R3 + counterfactual campaign.
import fs from 'node:fs';
import * as L from './commit5r1c12-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const C11 = L.ATT + 'R20-domain_campaign-r20_commit5r1c11_counterfactual_iteration_07-commit5r1c11-dev-07-ord01-2026-07-26T05-44-16-663Z/';
const SNAP = C11 + 'runtime-snapshot/';
const REQUIRED = {
  'philippine-tax-intent-analyzer.js': 'bbd2a313afc1b26e02348e86d7740136a39703f21c7d33b250368ab44031f40a',
  'philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const REQUIRED_TREE = '8c0ac8337b66528883185d337300f8b24293a05e245bb839c7f02b7f65863f93';

const audit = [];
const log = [];
const say = (s) => { log.push(s); console.log(s); };

await L.assertRuntimeIntact('pre-reconstruction');

const snapHashes = {};
const parts = [];
for (const n of L.SERVICES) {
  const b = fs.readFileSync(SNAP + n);
  const h = L.sha256(L.normLf(b));
  if (h !== REQUIRED[n]) throw new Error(`SNAPSHOT MISMATCH ${n}: ${h}`);
  snapHashes[n] = h;
  parts.push(L.normLf(b));
}
const tree = L.sha256(Buffer.concat(parts));
if (tree !== REQUIRED_TREE) throw new Error('SERVICES TREE DIGEST MISMATCH: ' + tree);
say('snapshot identity verified; servicesTreeDigest=' + tree.slice(0, 20));

const baseline = L.runtimeIdentity();
const differing = L.SERVICES.filter((n) => snapHashes[n] !== baseline['services/' + n].normalizedLfSha256);
say('authorized runtime files differing from baseline: ' + JSON.stringify(differing));

L.writeJson(L.RES + 'COMMIT_5R1C12_RECONSTRUCTION_SOURCE_LOCK.json', {
  unit: 'COMMIT 5R1-C12', generatedUtc: new Date().toISOString(),
  sourceAttempt: C11, snapshotNormalizedLfSha256: snapHashes,
  requiredServicesTreeDigest: REQUIRED_TREE, verifiedExact: true,
  onlyAuthorizedRuntimeFilesDiffer: true, differingFiles: differing,
  oracleVersion: 'R3', oracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  liveBaselineBeforeApply: baseline,
});

const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c12_reconstructed_739_candidate',
  cycle: 'commit5r1c12-dev-01',
  command: 'commit5r1c12-reconstruct.mjs',
});
say('allocated ' + att.attemptId);

for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), audit);
await L.assertRuntimeIntact('post-apply');
const applied = L.runtimeIdentity();
if (applied.servicesTreeDigest !== REQUIRED_TREE) throw new Error('APPLIED TREE MISMATCH');
say('applied; verified servicesTreeDigest=' + applied.servicesTreeDigest.slice(0, 20));

const patch = L.git('diff -- services/');
fs.writeFileSync(L.RES + 'COMMIT_5R1C12_RECONSTRUCTED_739.patch', patch);
L.writeJson(L.RES + 'COMMIT_5R1C12_RECONSTRUCTED_739_IDENTITY.json', {
  unit: 'COMMIT 5R1-C12', attemptId: att.attemptId, appliedRuntimeIdentity: applied,
  patchSha256: L.sha256(Buffer.from(patch)), patchBytes: patch.length,
});

const rows = loadR3Rows();
if (rows.length !== 3720) throw new Error('R3 ROWS != 3720');
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const cf = L.runCounterfactuals(rt.classify);
const am = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);
const decisionPassed = 3720 - counts.decisionMismatches;

say(`overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} clarify=${counts.clarifyMismatches}`);
say(`relation=${counts.relationMismatches} reason=${counts.reasonMismatches}`);
say(`closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'} richContextGuard=${guard.passed}/${guard.total}`);
say(`counterfactual=${cf.passed}/${cf.total} failed=${cf.failed} (v3 ${cf.bySuite.v3.failed}, v4 ${cf.bySuite.v4.failed}, v5 ${cf.bySuite.v5.failed}, v6 ${cf.bySuite.v6.failed})`);
say(`antiMemorization=${am.pass ? 'PASS' : 'FAIL ' + JSON.stringify(am.failed)}`);

const expected = { overall: 3077, decision: 3720, relation: 162, reason: 582, fa: 0, fr: 0, clarify: 0, cfPassed: 739, cfFailed: 17 };
const actual = {
  overall: counts.canonicalPassed, decision: decisionPassed, relation: counts.relationMismatches,
  reason: counts.reasonMismatches, fa: counts.materialFalseAllows, fr: counts.materialFalseRefusals,
  clarify: counts.clarifyMismatches, cfPassed: cf.passed, cfFailed: cf.failed,
};
const discrepancies = Object.keys(expected).filter((k) => expected[k] !== actual[k]);

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', guard);
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', cf);
L.writeJson(att.dir + 'ANTI_MEMORIZATION.json', am);
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);

L.writeJson(L.RES + 'COMMIT_5R1C12_RECONSTRUCTED_739_RESULT.json', {
  unit: 'COMMIT 5R1-C12', attemptId: att.attemptId, expected, actual,
  closedControls: ctl, richContextGuard: guard, antiMemorization: am,
  counterfactual: { total: cf.total, passed: cf.passed, failed: cf.failed, bySuite: cf.bySuite, byFamily: cf.byFamily },
});
L.writeJson(L.RES + 'COMMIT_5R1C12_RECONSTRUCTION_DISCREPANCIES.json', {
  unit: 'COMMIT 5R1-C12', attemptId: att.attemptId,
  discrepancyCount: discrepancies.length,
  discrepancies: discrepancies.map((k) => ({ metric: k, expected: expected[k], actual: actual[k] })),
  identityReconciled: discrepancies.length === 0,
  note: discrepancies.length === 0
    ? 'Governed reconstruction reproduced the accepted C11 dev-07 result exactly, including the counterfactual score. The new governed result controls.'
    : 'Actual governed result preserved as authoritative. Evidence was not altered to recreate the historical score.',
});
L.writeJson(L.RES + 'COMMIT_5R1C12_ATOMIC_WRITE_SAFETY_AUDIT.json', {
  unit: 'COMMIT 5R1-C12', generatedUtc: new Date().toISOString(),
  protocol: 'in-repository sibling temp file ending in .js -> verify non-zero -> parse/import and verify all nine exports -> hash -> atomic rename -> rehash destination',
  externalScratchpadUsedForRuntimeWrite: false,
  writes: audit, zeroByteIncidents: 0, truncationIncidents: 0, unexpectedWriteEvents: 0,
});

await L.finalizeAttempt(att.dir, {
  disposition: 'controlling_reconstruction_of_accepted_c11_dev07',
  stdout: log.join('\n') + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'COUNTERFACTUAL_RESULT.json', att.dir + 'CLOSED_CONTROLS.json', att.dir + 'RICH_CONTEXT_GUARD.json', att.dir + 'ANTI_MEMORIZATION.json'],
});
say('discrepancies=' + discrepancies.length);
say('ATTEMPT_ID=' + att.attemptId);
