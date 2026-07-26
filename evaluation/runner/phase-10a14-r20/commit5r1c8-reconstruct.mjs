// PHASE-10A14-R20 COMMIT 5R1-C8 — reconstruct the accepted C7 dev-06 candidate
// and execute it as a new governed R3 campaign.
import fs from 'node:fs';
import * as L from './commit5r1c8-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const C7 = L.ATT + 'R20-domain_campaign-r20_commit5r1c7_development_iteration_06-commit5r1c7-dev-06-ord01-2026-07-25T23-55-29-678Z/';
const SNAP = C7 + 'runtime-snapshot/';
const REQUIRED = {
  'philippine-tax-intent-analyzer.js': 'd6c063de45719636b08939366c229d2a93fd5889a80c8539c4d157dea2fe031e',
  'philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const REQUIRED_TREE = '585b9344821934a16d5d99da03ade650576b490ae3def68d1d713b8e084596c7';

const audit = [];
const log = [];
const say = (s) => { log.push(s); console.log(s); };

// 1. verify snapshot identity before applying
const parts = [];
for (const [n, want] of Object.entries(REQUIRED)) {
  const got = L.sha256(L.normLf(fs.readFileSync(SNAP + n)));
  if (got !== want) throw new Error(`SNAPSHOT MISMATCH ${n}: ${got}`);
  parts.push(L.normLf(fs.readFileSync(SNAP + n)));
}
const treeDigest = L.sha256(Buffer.concat(parts));
if (treeDigest !== REQUIRED_TREE) throw new Error('SERVICES TREE DIGEST MISMATCH: ' + treeDigest);
say('snapshot identity verified; servicesTreeDigest=' + treeDigest.slice(0, 20));

const baseline = L.runtimeIdentity();
L.writeJson(L.RES + 'COMMIT_5R1C8_RECONSTRUCTION_SOURCE_LOCK.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: new Date().toISOString(),
  sourceAttempt: C7,
  requiredNormalizedLfSha256: REQUIRED, requiredServicesTreeDigest: REQUIRED_TREE,
  verifiedExact: true,
  oracleVersion: 'R3', oracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  liveBaselineBeforeApply: baseline,
  identityPolicy: 'Git blob canonical; normalized-LF SHA-256 for content comparison under core.autocrlf=true',
});

// 2. allocate BEFORE execution
const att = L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c8_reconstructed_3623_candidate',
  cycle: 'commit5r1c8-dev-01',
  command: 'commit5r1c8-reconstruct.mjs',
});
say('allocated ' + att.attemptId);

// 3. atomic apply
for (const n of L.SERVICES) L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), audit);
const applied = L.runtimeIdentity();
if (applied.servicesTreeDigest !== REQUIRED_TREE) throw new Error('APPLIED TREE MISMATCH');
say('applied; verified servicesTreeDigest=' + applied.servicesTreeDigest.slice(0, 20));

const patch = L.git('diff -- services/');
fs.writeFileSync(L.RES + 'COMMIT_5R1C8_RECONSTRUCTED_3623.patch', patch);
L.writeJson(L.RES + 'COMMIT_5R1C8_RECONSTRUCTED_3623_IDENTITY.json', {
  unit: 'COMMIT 5R1-C8', attemptId: att.attemptId,
  appliedRuntimeIdentity: applied, patchSha256: L.sha256(Buffer.from(patch)), patchBytes: patch.length,
  changedFilesInPatch: [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1]),
});

// 4. run full R3
const rows = loadR3Rows();
if (rows.length !== 3720) throw new Error('R3 ROWS != 3720');
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const cm = L.confusionMatrix(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const decisionPassed = 3720 - counts.decisionMismatches;

say(`overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 decisionMismatches=${counts.decisionMismatches}`);
say(`fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} cm=${counts.clarifyMismatches} reason=${counts.reasonMismatches} relation=${counts.relationMismatches}`);
say(`closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'}`);

const expected = { overall: 3047, decision: 3623, decisionMismatches: 97, relation: 200, reason: 630, fa: 37, fr: 57, clarify: 3 };
const actual = { overall: counts.canonicalPassed, decision: decisionPassed, decisionMismatches: counts.decisionMismatches, relation: counts.relationMismatches, reason: counts.reasonMismatches, fa: counts.materialFalseAllows, fr: counts.materialFalseRefusals, clarify: counts.clarifyMismatches };
const discrepancies = Object.keys(expected).filter((k) => expected[k] !== actual[k]);

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'DECISION_CONFUSION_MATRIX.json', cm);
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.writeJson(att.dir + 'ALL_FAILURES.json', failures);
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);

L.writeJson(L.RES + 'COMMIT_5R1C8_RECONSTRUCTED_3623_RESULT.json', { unit: 'COMMIT 5R1-C8', attemptId: att.attemptId, expected, actual, counts, decisionPassed, closedControls: ctl });
L.writeJson(L.RES + 'COMMIT_5R1C8_RECONSTRUCTION_DISCREPANCIES.json', {
  unit: 'COMMIT 5R1-C8', attemptId: att.attemptId,
  discrepancyCount: discrepancies.length,
  discrepancies: discrepancies.map((k) => ({ metric: k, expected: expected[k], actual: actual[k] })),
  identityReconciled: discrepancies.length === 0,
  note: discrepancies.length === 0
    ? 'Governed reconstruction reproduced the accepted C7 dev-06 result exactly. The new governed result controls.'
    : 'Actual governed result preserved as authoritative. Evidence was not altered to recreate the historical score.',
});
L.writeJson(L.RES + 'COMMIT_5R1C8_DECISION_CONFUSION_MATRIX.json', { unit: 'COMMIT 5R1-C8', attemptId: att.attemptId, basis: 'reconstructed C7 dev-06 candidate', ...cm });
L.writeJson(L.RES + 'COMMIT_5R1C8_ATOMIC_WRITE_SAFETY_AUDIT.json', {
  unit: 'COMMIT 5R1-C8', generatedUtc: new Date().toISOString(),
  protocol: 'in-repo sibling temp file -> verify non-zero -> atomic rename -> reverify',
  writes: audit, zeroByteIncidents: 0, truncationIncidents: 0, unexpectedWriteEvents: 0,
});

L.finalizeAttempt(att.dir, {
  disposition: 'controlling_reconstruction_of_accepted_c7_dev06',
  stdout: log.join('\n') + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'DECISION_LANE.json', att.dir + 'DECISION_CONFUSION_MATRIX.json'],
});
say('discrepancies=' + discrepancies.length);
say('ATTEMPT_ID=' + att.attemptId);
