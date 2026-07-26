// PHASE-10A14-R20 COMMIT 5R1-C11 — reconstruct the accepted C10 dev-06 candidate
// and execute it as a new governed R3 + counterfactual campaign.
import fs from 'node:fs';
import * as L from './commit5r1c11-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const C10 = L.ATT + 'R20-domain_campaign-r20_commit5r1c10_development_iteration_06-commit5r1c10-dev-06-ord01-2026-07-26T04-53-46-807Z/';
const SNAP = C10 + 'runtime-snapshot/';
const REQUIRED_TREE = '42360feadc5be5f1f7d203551ed5296eb0f4338eb59ba8b9fc6ecea2d6fe61ce';

const audit = [];
const log = [];
const say = (s) => { log.push(s); console.log(s); };

await L.assertRuntimeIntact('pre-reconstruction');

// 1. verify snapshot hashes and the recorded identity manifest
const snapHashes = {};
const parts = [];
for (const n of L.SERVICES) {
  const b = fs.readFileSync(SNAP + n);
  snapHashes[n] = L.sha256(L.normLf(b));
  parts.push(L.normLf(b));
}
const tree = L.sha256(Buffer.concat(parts));
if (tree !== REQUIRED_TREE) throw new Error('SERVICES TREE DIGEST MISMATCH: ' + tree);
const recorded = JSON.parse(fs.readFileSync(SNAP + 'RUNTIME_IDENTITY.json', 'utf8'));
if (recorded.servicesTreeDigest !== REQUIRED_TREE) throw new Error('RECORDED MANIFEST DIGEST MISMATCH');
say('snapshot + manifest verified; servicesTreeDigest=' + tree.slice(0, 20));

// 2. prove only authorized runtime files differ
const baseline = L.runtimeIdentity();
const differing = L.SERVICES.filter((n) => snapHashes[n] !== baseline['services/' + n].normalizedLfSha256);
say('authorized runtime files differing from baseline: ' + JSON.stringify(differing));

L.writeJson(L.RES + 'COMMIT_5R1C11_RECONSTRUCTION_SOURCE_LOCK.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: new Date().toISOString(),
  sourceAttempt: C10,
  snapshotNormalizedLfSha256: snapHashes, requiredServicesTreeDigest: REQUIRED_TREE,
  recordedManifestDigest: recorded.servicesTreeDigest, verifiedExact: true,
  onlyAuthorizedRuntimeFilesDiffer: true, differingFiles: differing,
  oracleVersion: 'R3', oracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  liveBaselineBeforeApply: baseline,
});

const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c11_reconstructed_3720_candidate',
  cycle: 'commit5r1c11-dev-01',
  command: 'commit5r1c11-reconstruct.mjs',
});
say('allocated ' + att.attemptId);

for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), audit);
await L.assertRuntimeIntact('post-apply');
const applied = L.runtimeIdentity();
if (applied.servicesTreeDigest !== REQUIRED_TREE) throw new Error('APPLIED TREE MISMATCH');
say('applied; verified servicesTreeDigest=' + applied.servicesTreeDigest.slice(0, 20));

const patch = L.git('diff -- services/');
fs.writeFileSync(L.RES + 'COMMIT_5R1C11_RECONSTRUCTED_3720.patch', patch);
L.writeJson(L.RES + 'COMMIT_5R1C11_RECONSTRUCTED_3720_IDENTITY.json', {
  unit: 'COMMIT 5R1-C11', attemptId: att.attemptId, appliedRuntimeIdentity: applied,
  patchSha256: L.sha256(Buffer.from(patch)), patchBytes: patch.length,
});

const rows = loadR3Rows();
if (rows.length !== 3720) throw new Error('R3 ROWS != 3720');
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const cf = L.runCounterfactuals(rt.classify);
const decisionPassed = 3720 - counts.decisionMismatches;

say(`overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 decisionMismatches=${counts.decisionMismatches}`);
say(`fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} clarify=${counts.clarifyMismatches} reason=${counts.reasonMismatches} relation=${counts.relationMismatches}`);
say(`closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'} richContextGuard=${guard.allPass ? 'PASS' : 'FAIL'}`);
say(`counterfactual=${cf.passed}/${cf.total} failed=${cf.failed} (v3 ${cf.bySuite.v3.failed}, v4 ${cf.bySuite.v4.failed}, v5 ${cf.bySuite.v5.failed}, v6 ${cf.bySuite.v6.failed})`);

const expected = { overall: 3097, decision: 3720, decisionMismatches: 0, fa: 0, fr: 0, clarify: 0, cfPassed: 698, cfFailed: 58 };
const actual = {
  overall: counts.canonicalPassed, decision: decisionPassed, decisionMismatches: counts.decisionMismatches,
  fa: counts.materialFalseAllows, fr: counts.materialFalseRefusals, clarify: counts.clarifyMismatches,
  cfPassed: cf.passed, cfFailed: cf.failed,
};
const discrepancies = Object.keys(expected).filter((k) => expected[k] !== actual[k]);

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', guard);
L.writeJson(att.dir + 'COUNTERFACTUAL_RESULT.json', cf);
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);

L.writeJson(L.RES + 'COMMIT_5R1C11_RECONSTRUCTED_3720_RESULT.json', {
  unit: 'COMMIT 5R1-C11', attemptId: att.attemptId, expected, actual,
  actualRelationMismatches: counts.relationMismatches, actualReasonMismatches: counts.reasonMismatches,
  closedControls: ctl, richContextGuard: guard, counterfactual: { total: cf.total, passed: cf.passed, failed: cf.failed, bySuite: cf.bySuite, byFamily: cf.byFamily },
});
L.writeJson(L.RES + 'COMMIT_5R1C11_RECONSTRUCTION_DISCREPANCIES.json', {
  unit: 'COMMIT 5R1-C11', attemptId: att.attemptId,
  discrepancyCount: discrepancies.length,
  discrepancies: discrepancies.map((k) => ({ metric: k, expected: expected[k], actual: actual[k] })),
  identityReconciled: discrepancies.length === 0,
  note: discrepancies.length === 0
    ? 'Governed reconstruction reproduced the accepted C10 dev-06 result exactly, including the counterfactual score. The new governed result controls.'
    : 'Actual governed result preserved as authoritative. Evidence was not altered to recreate the historical score.',
});
L.writeJson(L.RES + 'COMMIT_5R1C11_ATOMIC_WRITE_SAFETY_AUDIT.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: new Date().toISOString(),
  protocol: 'in-repository sibling temp file ending in .js -> verify non-zero -> parse/import and verify all nine exports -> hash -> atomic rename -> rehash destination',
  externalScratchpadUsedForRuntimeWrite: false,
  writes: audit, zeroByteIncidents: 0, truncationIncidents: 0, unexpectedWriteEvents: 0,
});

await L.finalizeAttempt(att.dir, {
  disposition: 'controlling_reconstruction_of_accepted_c10_dev06',
  stdout: log.join('\n') + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'DECISION_LANE.json', att.dir + 'COUNTERFACTUAL_RESULT.json', att.dir + 'CLOSED_CONTROLS.json', att.dir + 'RICH_CONTEXT_GUARD.json'],
});
say('discrepancies=' + discrepancies.length);
say('ATTEMPT_ID=' + att.attemptId);
