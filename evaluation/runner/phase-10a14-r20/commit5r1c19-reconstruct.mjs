// PHASE-10A14-R20 COMMIT 5R1-C13 — governed reconstruction of the LOCKED C12 candidate.
// Verifies snapshot identity, proves only authorized runtime files differ, installs the
// candidate via atomic sibling .js writes, and re-scores it as a NEW governed campaign.
import fs from 'node:fs';
import * as L from './commit5r1c19-lib.mjs';

const SNAP = L.ATT + 'R20-domain_campaign-r20_commit5r1c18_reason_iteration_05-commit5r1c18-dev-05-ord01-2026-07-27T02-34-51-139Z/runtime-snapshot/';
const WANT = {
  'philippine-tax-intent-analyzer.js': '982ffd181277570495a894b637c527dc303f5dbe3bc55c63f0a479268bde5e1f',
  'philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const WANT_TREE = '09081d31aef2e6853dede84936fdf560bef7309018a40f4ad0f107b768fc3fe8';
const BASELINE_ANALYZER = '8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308';

const EXPECT = {
  canonicalPassed: 3313, decisionPassed: 3720, relationPassed: 3720,
  relationMismatches: 0, reasonMismatches: 407,
  materialFalseAllows: 0, materialFalseRefusals: 0, clarifyMismatches: 0,
  counterfactualPassed: 756, relationCounterfactualPassed: 282, clauseProbesPassed: 68,
  reasonCounterfactualPassed: 320, collisionProbesPassed: 134,
};

const log = [];
const say = (s) => { log.push(s); console.log(s); };

await L.assertRuntimeIntact('reconstruct-start');
const rows = L.loadR3();
say(`R3 verified ${L.R3_SHA} rows=${rows.length}`);

// --- snapshot identity, file by file ---
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
say(`snapshot identity verified; tree digest ${snapTree}`);

// --- prove only authorized runtime files differ from the live baseline ---
const live = L.runtimeIdentity();
const differing = Object.keys(WANT).filter((n) => live['services/' + n].normalizedLfSha256 !== WANT[n]);
say(`live baseline analyzer = ${live['services/philippine-tax-intent-analyzer.js'].normalizedLfSha256}`);
if (live['services/philippine-tax-intent-analyzer.js'].normalizedLfSha256 !== BASELINE_ANALYZER) {
  throw new Error('LIVE_NOT_AT_COMMITTED_BASELINE');
}
say(`files differing from candidate: ${differing.join(', ') || '(none)'}`);
const unauthorized = differing.filter((n) => !L.SERVICES.includes(n));
if (unauthorized.length) throw new Error('UNAUTHORIZED_DIFF ' + unauthorized.join(','));

// --- allocate the governed campaign BEFORE execution ---
const { attemptId, dir } = await L.allocateAttempt({
  category: 'domain_campaign', gate: 'r20_commit5r1c19_reconstruction',
  cycle: 'commit5r1c19-recon', command: 'evaluation/runner/phase-10a14-r20/commit5r1c19-reconstruct.mjs',
});
say(`attempt allocated ${attemptId}`);

// --- install the candidate atomically ---
const audit = [];
for (const n of Object.keys(WANT)) {
  await L.atomicWriteRuntime('services/' + n, fs.readFileSync(SNAP + n), audit);
}
await L.assertRuntimeIntact('post-install');
const installed = L.runtimeIdentity();
if (installed.servicesTreeDigest !== WANT_TREE) throw new Error('POST_INSTALL_TREE_MISMATCH ' + installed.servicesTreeDigest);
say(`candidate installed; tree digest ${installed.servicesTreeDigest}`);

// --- score as a new governed campaign; the NEW result controls ---
const analyze = await L.loadAnalyzer();
const r3 = L.scoreR3(rows, analyze);
const cf = L.runCounterfactuals(analyze);
const relCf = L.runRelationCounterfactuals(analyze);
const probes = L.runClauseProbes(analyze);
const reasonCf = L.runReasonCounterfactuals(analyze);
const collCf = L.runCollisionProbes(analyze);
const ctl = L.closedControls(rows, analyze);
const guard = L.richContextGuard(analyze);
const am = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);

say(`canonical  = ${r3.counts.canonicalPassed} / 3720`);
say(`decision   = ${r3.counts.decisionPassed} / 3720   FA=${r3.counts.materialFalseAllows} FR=${r3.counts.materialFalseRefusals} CL=${r3.counts.clarifyMismatches}`);
say(`relation   = ${r3.counts.relationPassed} / 3720   mismatches=${r3.counts.relationMismatches}`);
say(`reason mismatches = ${r3.counts.reasonMismatches}`);
say(`counterfactual = ${cf.passed} / ${cf.total}`);
say(`relation counterfactual = ${relCf.passed} / ${relCf.total}`);
say(`clause probes = ${probes.passed} / ${probes.total}`);
say(`reason passed = ${3720 - r3.counts.reasonMismatches} / 3720`);
say(`reason suite v8 = ${reasonCf.passed} / ${reasonCf.total}`);
say(`collision probes = ${collCf.passed} / ${collCf.total}`);
say(`closedControls allClosed=${ctl.allClosed}  guard=${guard.passed}/${guard.total}  antiMemorization=${am.pass}`);

const actual = {
  canonicalPassed: r3.counts.canonicalPassed, decisionPassed: r3.counts.decisionPassed,
  relationPassed: r3.counts.relationPassed, relationMismatches: r3.counts.relationMismatches,
  reasonMismatches: r3.counts.reasonMismatches,
  materialFalseAllows: r3.counts.materialFalseAllows, materialFalseRefusals: r3.counts.materialFalseRefusals,
  clarifyMismatches: r3.counts.clarifyMismatches, counterfactualPassed: cf.passed,
  relationCounterfactualPassed: relCf.passed, clauseProbesPassed: probes.passed,
  reasonCounterfactualPassed: reasonCf.passed, collisionProbesPassed: collCf.passed,
};
const discrepancies = Object.entries(EXPECT).filter(([k, v]) => actual[k] !== v)
  .map(([k, v]) => ({ metric: k, expected: v, actual: actual[k] }));
say(`reconstruction discrepancies = ${discrepancies.length}`);
for (const d of discrepancies) say(`  DISCREPANCY ${d.metric}: expected ${d.expected} actual ${d.actual}`);

L.snapshotRuntime(dir + 'runtime-snapshot');
L.writeJson(dir + 'RECONSTRUCTION_RESULT.json', {
  attemptId, oracle: 'R3', oracleSha256: L.R3_SHA,
  sourceAttempt: SNAP.replace(L.ATT, '').replace('/runtime-snapshot/', ''),
  snapshotVerification: snapVerify, snapshotTreeDigest: snapTree, requiredTreeDigest: WANT_TREE,
  liveBaselineBeforeInstall: live, installedIdentity: installed, writeAudit: audit,
  expected: EXPECT, actual, discrepancies, exactReproduction: discrepancies.length === 0,
  r3Counts: r3.counts, counterfactual: { total: cf.total, passed: cf.passed, bySuite: cf.bySuite },
  closedControls: ctl, richContextGuard: guard, antiMemorization: am,
  reasonCounterfactual: { total: reasonCf.total, passed: reasonCf.passed, failed: reasonCf.failed, byFamily: reasonCf.byFamily },
  clauseProbes: { total: probes.total, passed: probes.passed, failed: probes.failed },
  relationCounterfactual: { total: relCf.total, passed: relCf.passed, failed: relCf.failed, byFamily: relCf.byFamily, nonControllingProbes: relCf.nonControllingProbes },
  relationScoringSemantics: 'expected-set containment on the relation field only',
});
L.writeJson(dir + 'RELATION_FAILURES_RAW.json', { count: r3.relationFailures.length, failures: r3.relationFailures });

await L.finalizeAttempt(dir, {
  disposition: discrepancies.length === 0 ? 'accepted_reconstruction_exact' : 'reconstruction_discrepancy',
  stdout: log.join('\n'),
  resultPaths: [dir + 'RECONSTRUCTION_RESULT.json', dir + 'RELATION_FAILURES_RAW.json'],
});
say('attempt finalized');
if (discrepancies.length) { console.error('RECONSTRUCTION DISCREPANCY — STOP'); process.exit(2); }
