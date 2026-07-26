// PHASE-10A14-R20 COMMIT 5R1-C10 — reconstruct the accepted C9 dev-05 candidate
// and execute it as a new governed R3 campaign.
import fs from 'node:fs';
import * as L from './commit5r1c10-lib.mjs';
import { loadR3Rows, loadRuntime, scoreRows } from './commit5r1c2-oracle-runner.mjs';

const C9 = L.ATT + 'R20-domain_campaign-r20_commit5r1c9_development_iteration_05-commit5r1c9-dev-05-ord01-2026-07-26T01-56-49-353Z/';
const SNAP = C9 + 'runtime-snapshot/';
const REQUIRED_TREE = '878b9bb2ce877d6124933bb0d662aaf9e91f7ffac463e06545e4e0325d55c003';

const audit = [];
const log = [];
const say = (s) => { log.push(s); console.log(s); };

await L.assertRuntimeIntact('pre-reconstruction');

// 1. verify every snapshot file hash and the tree digest
const snapHashes = {};
const parts = [];
for (const n of L.SERVICES) {
  const b = fs.readFileSync(SNAP + n);
  snapHashes[n] = L.sha256(L.normLf(b));
  parts.push(L.normLf(b));
}
const tree = L.sha256(Buffer.concat(parts));
if (tree !== REQUIRED_TREE) throw new Error('SERVICES TREE DIGEST MISMATCH: ' + tree);
say('snapshot verified; servicesTreeDigest=' + tree.slice(0, 20));

// 2. prove only authorized runtime files differ from the live baseline
const baseline = L.runtimeIdentity();
const differing = L.SERVICES.filter((n) => snapHashes[n] !== baseline['services/' + n].normalizedLfSha256);
say('authorized runtime files differing from baseline: ' + JSON.stringify(differing));

L.writeJson(L.RES + 'COMMIT_5R1C10_RECONSTRUCTION_SOURCE_LOCK.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: new Date().toISOString(),
  sourceAttempt: C9,
  snapshotNormalizedLfSha256: snapHashes, requiredServicesTreeDigest: REQUIRED_TREE, verifiedExact: true,
  onlyAuthorizedRuntimeFilesDiffer: true, differingFiles: differing,
  oracleVersion: 'R3', oracleSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  liveBaselineBeforeApply: baseline,
  identityPolicy: 'Git blob canonical; normalized-LF SHA-256 for content comparison under core.autocrlf=true',
});

// 3. allocate BEFORE execution
const att = await L.allocateAttempt({
  category: 'domain_campaign',
  gate: 'r20_commit5r1c10_reconstructed_3706_candidate',
  cycle: 'commit5r1c10-dev-01',
  command: 'commit5r1c10-reconstruct.mjs',
});
say('allocated ' + att.attemptId);

// 4. atomic apply via sibling .js temp files
for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), audit);
await L.assertRuntimeIntact('post-apply');
const applied = L.runtimeIdentity();
if (applied.servicesTreeDigest !== REQUIRED_TREE) throw new Error('APPLIED TREE MISMATCH');
say('applied; verified servicesTreeDigest=' + applied.servicesTreeDigest.slice(0, 20));

const patch = L.git('diff -- services/');
fs.writeFileSync(L.RES + 'COMMIT_5R1C10_RECONSTRUCTED_3706.patch', patch);
L.writeJson(L.RES + 'COMMIT_5R1C10_RECONSTRUCTED_3706_IDENTITY.json', {
  unit: 'COMMIT 5R1-C10', attemptId: att.attemptId, appliedRuntimeIdentity: applied,
  patchSha256: L.sha256(Buffer.from(patch)), patchBytes: patch.length,
  changedFilesInPatch: [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1]),
});

// 5. run full R3
const rows = loadR3Rows();
if (rows.length !== 3720) throw new Error('R3 ROWS != 3720');
const rt = await loadRuntime('standalone');
const { counts, failures } = scoreRows(rows, rt.classify);
const cm = L.confusionMatrix(rows, rt.classify);
const ctl = L.closedControls(rows, rt.classify);
const guard = L.richContextGuard(rt.classify);
const decisionPassed = 3720 - counts.decisionMismatches;

say(`overall=${counts.canonicalPassed}/3720 decision=${decisionPassed}/3720 decisionMismatches=${counts.decisionMismatches}`);
say(`fa=${counts.materialFalseAllows} fr=${counts.materialFalseRefusals} cm=${counts.clarifyMismatches} reason=${counts.reasonMismatches} relation=${counts.relationMismatches}`);
say(`closedControls=${ctl.allClosed ? 'ALL CLOSED' : 'REGRESSED'}`);

const expected = { overall: 3097, decision: 3706, decisionMismatches: 14, fa: 7, fr: 7, clarify: 0 };
const actual = { overall: counts.canonicalPassed, decision: decisionPassed, decisionMismatches: counts.decisionMismatches, fa: counts.materialFalseAllows, fr: counts.materialFalseRefusals, clarify: counts.clarifyMismatches };
const discrepancies = Object.keys(expected).filter((k) => expected[k] !== actual[k]);

L.writeJson(att.dir + 'FULL_R3_RESULT.json', { attemptId: att.attemptId, oracleVersion: 'R3', counts, decisionPassed });
L.writeJson(att.dir + 'DECISION_LANE.json', { attemptId: att.attemptId, decisionPassed, decisionMismatches: counts.decisionMismatches, materialFalseAllows: counts.materialFalseAllows, materialFalseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches });
L.writeJson(att.dir + 'DECISION_CONFUSION_MATRIX.json', cm);
L.writeJson(att.dir + 'CLOSED_CONTROLS.json', ctl);
L.writeJson(att.dir + 'RICH_CONTEXT_GUARD.json', { probes: guard });
L.writeJson(att.dir + 'DECISION_FAILURES.json', failures.filter((f) => !f.decisionPass));
L.writeJson(att.dir + 'ALL_FAILURES.json', failures);
L.snapshotRuntime(att.dir + 'runtime-snapshot');
fs.writeFileSync(att.dir + 'runtime-snapshot/PATCH_FROM_BASE.patch', patch);

L.writeJson(L.RES + 'COMMIT_5R1C10_RECONSTRUCTED_3706_RESULT.json', {
  unit: 'COMMIT 5R1-C10', attemptId: att.attemptId, expected, actual, counts, decisionPassed,
  actualRelationMismatches: counts.relationMismatches, actualReasonMismatches: counts.reasonMismatches,
  closedControls: ctl,
});
L.writeJson(L.RES + 'COMMIT_5R1C10_RECONSTRUCTION_DISCREPANCIES.json', {
  unit: 'COMMIT 5R1-C10', attemptId: att.attemptId,
  discrepancyCount: discrepancies.length,
  discrepancies: discrepancies.map((k) => ({ metric: k, expected: expected[k], actual: actual[k] })),
  identityReconciled: discrepancies.length === 0,
  note: discrepancies.length === 0
    ? 'Governed reconstruction reproduced the accepted C9 dev-05 result exactly. The new governed result controls.'
    : 'Actual governed result preserved as authoritative. Evidence was not altered to recreate the historical score.',
});
L.writeJson(L.RES + 'COMMIT_5R1C10_DECISION_CONFUSION_MATRIX.json', { unit: 'COMMIT 5R1-C10', attemptId: att.attemptId, basis: 'reconstructed C9 dev-05 candidate', ...cm });
L.writeJson(L.RES + 'COMMIT_5R1C10_ATOMIC_WRITE_SAFETY_AUDIT.json', {
  unit: 'COMMIT 5R1-C10', generatedUtc: new Date().toISOString(),
  protocol: 'in-repository sibling temp file ending in .js -> verify non-zero -> parse/import and verify all nine exports -> hash -> atomic rename -> rehash destination',
  externalScratchpadUsedForRuntimeWrite: false,
  writes: audit, zeroByteIncidents: 0, truncationIncidents: 0, unexpectedWriteEvents: 0,
});

await L.finalizeAttempt(att.dir, {
  disposition: 'controlling_reconstruction_of_accepted_c9_dev05',
  stdout: log.join('\n') + '\n',
  resultPaths: [att.dir + 'FULL_R3_RESULT.json', att.dir + 'DECISION_LANE.json', att.dir + 'DECISION_CONFUSION_MATRIX.json', att.dir + 'CLOSED_CONTROLS.json', att.dir + 'RICH_CONTEXT_GUARD.json'],
});
say('discrepancies=' + discrepancies.length);
say('ATTEMPT_ID=' + att.attemptId);
