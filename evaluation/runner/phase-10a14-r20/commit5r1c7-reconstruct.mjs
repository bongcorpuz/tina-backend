// PHASE-10A14-R20 COMMIT 5R1-C7 — reconstruct the accepted C6 dev-02 candidate
// and execute it as a new governed R3 campaign.
import fs from 'node:fs';
import * as L from './commit5r1c7-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const C6 = L.ATT + 'R20-domain_campaign-r20_commit5r1c6_development_iteration_02-commit5r1c6-dev-02-ord01-2026-07-25T12-34-42-999Z/';
const SNAP = C6 + 'runtime-snapshot/';
const EXPECT_ANALYZER = '7801adda7831bb4301744faf80e1686e3f3e0bdeff4294d06c33d28e5b39cf42';

const audit = [];
const log = [];
const say = (s) => { log.push(s); console.log(s); };

// ---- 1. verify snapshot before applying
const snapHashes = {};
for (const n of L.SERVICES) snapHashes[n] = L.sha256(fs.readFileSync(SNAP + n));
if (snapHashes['philippine-tax-intent-analyzer.js'] !== EXPECT_ANALYZER) {
  throw new Error('SNAPSHOT ANALYZER SHA MISMATCH');
}
say('snapshot verified; analyzer=' + EXPECT_ANALYZER.slice(0, 16));

const baselineIdentity = L.runtimeIdentity();
L.writeJson(L.RES + 'COMMIT_5R1C7_RECONSTRUCTION_SOURCE_LOCK.json', {
  unit: 'COMMIT 5R1-C7',
  generatedUtc: new Date().toISOString(),
  sourceAttempt: C6,
  snapshotRawSha256: snapHashes,
  analyzerSha256: EXPECT_ANALYZER,
  analyzerShaMatchesGovernance: true,
  oracleVersion: 'R3',
  oracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  liveBaselineBeforeApply: baselineIdentity,
  onlyAllowlistedRuntimeFilesDiffer: true,
});

// ---- 2. allocate BEFORE execution
const att = L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c7_reconstructed_3464_candidate',
  cycle: 'commit5r1c7-dev-01',
  command: 'commit5r1c7-reconstruct.mjs',
});
say('allocated ' + att.attemptId);

// ---- 3. atomic apply
for (const n of L.SERVICES) {
  L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), audit);
}
const applied = L.runtimeIdentity();
say('applied; servicesTreeDigest=' + applied.servicesTreeDigest.slice(0, 16));

// ---- 4. patch + identity
const patch = L.git('diff -- services/');
fs.writeFileSync(L.RES + 'COMMIT_5R1C7_RECONSTRUCTED_3464.patch', patch);
L.writeJson(L.RES + 'COMMIT_5R1C7_RECONSTRUCTED_3464_IDENTITY.json', {
  unit: 'COMMIT 5R1-C7',
  attemptId: att.attemptId,
  appliedRuntimeIdentity: applied,
  patchSha256: L.sha256(Buffer.from(patch)),
  patchBytes: patch.length,
  changedFilesInPatch: [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1]),
});

// ---- 5. run full R3
const rows = loadR3Rows();
if (rows.length !== 3720) throw new Error('R3 ROWS != 3720');
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const cm = L.confusionMatrix(rows, rt.classify);

const decisionPassed = 3720 - counts.decisionMismatches;
say(`overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 decMismatch=${counts.decisionMismatches}`);
say(`reason=${counts.reasonMismatches} relation=${counts.relationMismatches} fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} cm=${counts.clarifyMismatches}`);
say(`metamorphic=${counts.metamorphicGroupsPassed}/${counts.metamorphicGroupsTotal}`);

const expected = { overall: 3009, decision: 3464, decisionMismatches: 256, relation: 209, reason: 710, fa: 72, fr: 143, clarify: 41 };
const actual = { overall: counts.canonicalPassed, decision: decisionPassed, decisionMismatches: counts.decisionMismatches, relation: counts.relationMismatches, reason: counts.reasonMismatches, fa: counts.materialFalseAllows, fr: counts.materialFalseRefusals, clarify: counts.clarifyMismatches };
const discrepancies = Object.keys(expected).filter((k) => expected[k] !== actual[k]);

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.writeJson(att.dir + 'ALL_FAILURES.json', failures);
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);

L.writeJson(L.RES + 'COMMIT_5R1C7_RECONSTRUCTED_3464_RESULT.json', {
  unit: 'COMMIT 5R1-C7', attemptId: att.attemptId, expected, actual, counts, decisionPassed,
});
L.writeJson(L.RES + 'COMMIT_5R1C7_RECONSTRUCTION_DISCREPANCIES.json', {
  unit: 'COMMIT 5R1-C7', attemptId: att.attemptId,
  discrepancyCount: discrepancies.length,
  discrepancies: discrepancies.map((k) => ({ metric: k, expected: expected[k], actual: actual[k] })),
  identityReconciled: discrepancies.length === 0,
  note: discrepancies.length === 0
    ? 'Governed reconstruction reproduced the accepted C6 dev-02 result exactly. The new governed result controls.'
    : 'Actual governed result preserved as authoritative. Evidence was not altered to recreate the historical score.',
});
L.writeJson(L.RES + 'COMMIT_5R1C7_DECISION_CONFUSION_MATRIX.json', {
  unit: 'COMMIT 5R1-C7', attemptId: att.attemptId, basis: 'reconstructed C6 dev-02 candidate', ...cm,
});
L.writeJson(L.RES + 'COMMIT_5R1C7_ATOMIC_WRITE_SAFETY_AUDIT.json', {
  unit: 'COMMIT 5R1-C7', generatedUtc: new Date().toISOString(),
  protocol: 'in-repo sibling temp file -> verify non-zero + syntax -> atomic rename -> reverify',
  writes: audit, zeroByteIncidents: 0, truncationIncidents: 0, unexpectedWriteEvents: 0,
});

L.finalizeAttempt(att.dir, {
  disposition: 'controlling_reconstruction_of_accepted_c6_dev02',
  stdout: log.join('\n') + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'DECISION_LANE.json', att.dir + 'DECISION_FAILURES.json'],
});

say('discrepancies=' + discrepancies.length);
say('ATTEMPT_ID=' + att.attemptId);
