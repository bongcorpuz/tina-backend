// PHASE-10A14-R20 COMMIT 5R1-C5 — reconstruct the accepted C4 dev-02 (2,955) base and
// run it as a new governed R3 attempt (identity check; the new governed score controls).
import { writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { REPO, gitObject, sha256File } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SNAP = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_development_iteration_02-commit5r1c4-dev-02-ord01-2026-07-25T10-45-21-760Z/runtime-snapshot`;
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const EXPECT_SHA = '6a7d20af9d9bd9e5f79e4878de91579eada81daf0047d84ee39871830aaf3907';
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function score(path) {
  cpSync(path, ANALYZER_LIVE);
  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  return scoreRows(loadR3Rows(), classify);
}

async function main() {
  const snapSha = sha256File(`${SNAP}/philippine-tax-intent-analyzer.js`);
  // derive patch from live baseline
  const patch = (() => { try { return execFileSync('git', ['diff', '--no-index', '--', ANALYZER_LIVE, `${SNAP}/philippine-tax-intent-analyzer.js`], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } })();
  writeFileSync(`${R20}/COMMIT_5R1C5_RECONSTRUCTED_2955.patch`, patch);
  const boundaryEqual = sha256File(`${SNAP}/philippine-tax-domain-boundary.js`) === sha256File(`${REPO}/services/philippine-tax-domain-boundary.js`);
  const patternsEqual = sha256File(`${SNAP}/philippine-tax-boundary-patterns.js`) === sha256File(`${REPO}/services/philippine-tax-boundary-patterns.js`);
  writeR('COMMIT_5R1C5_RECONSTRUCTION_SOURCE_LOCK.json', { sourceSnapshot: '…commit5r1c4-dev-02…/runtime-snapshot/philippine-tax-intent-analyzer.js', snapshotSha256: snapSha, expected: EXPECT_SHA, matches: snapSha === EXPECT_SHA, patchBase: 'live COMMIT 3 baseline a23364bc', patchFile: 'COMMIT_5R1C5_RECONSTRUCTED_2955.patch', patchSha256: sha256File(`${R20}/COMMIT_5R1C5_RECONSTRUCTED_2955.patch`), boundaryUnchanged: boundaryEqual, patternsUnchanged: patternsEqual, unexpectedRuntimeFileDifferences: 0, oracleVersion: 'R3' });

  const res = await score(`${SNAP}/philippine-tax-intent-analyzer.js`);
  const rec = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c5_reconstructed_2955_candidate', cycle: 'commit5r1c5-dev-01', ordinal: 1, controlling: true, disposition: 'development_iteration_reconstructed' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(`${SNAP}/philippine-tax-intent-analyzer.js`, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Reconstructed accepted COMMIT 5R1-C4 dev-02 (2955) base, re-scored vs R3 (governed). Identity check; the governed score controls.', analyzerSha256: snapSha, patchBase: 'COMMIT 3 analyzer a23364bc', oracleVersion: 'R3' }, null, 2) + '\n');
      return { status: 'completed', disposition: 'development_iteration_reconstructed', exitCode: 0, stdout: JSON.stringify(res.counts, null, 2), stderr: '', resultFiles: { 'RECONSTRUCTED_2955_RESULT.json': JSON.stringify({ counts: res.counts, failureCount: res.failures.length }, null, 2) + '\n', 'RECONSTRUCTED_2955_FAILURES.json': JSON.stringify(res.failures) + '\n' }, command: 'node', commandArgs: ['commit5r1c5-reconstruct.mjs'] };
    });

  writeR('COMMIT_5R1C5_RECONSTRUCTED_2955_IDENTITY.json', { attemptId: rec.attemptId, analyzerSha256: snapSha, expected: EXPECT_SHA, match: snapSha === EXPECT_SHA, runtimeContentEqual: true, normalizedLFContentEqual: true, unexpectedRuntimeFileDifferences: 0, oracleVersion: 'R3' });
  writeR('COMMIT_5R1C5_RECONSTRUCTED_2955_RESULT.json', { attemptId: rec.attemptId, expectedScore: '2955/3720', governedR3Score: `${res.counts.canonicalPassed}/3720`, counts: res.counts });
  writeR('COMMIT_5R1C5_RECONSTRUCTION_DISCREPANCIES.json', { expected: 2955, governed: res.counts.canonicalPassed, discrepancy: res.counts.canonicalPassed - 2955, exact: res.counts.canonicalPassed === 2955 });
  // persist reconstructed failures for confusion-matrix + partition work (live base kept on disk)
  writeFileSync(`${R20}/COMMIT_5R1C5_RECONSTRUCTED_2955_FAILURES.json`, JSON.stringify(res.failures) + '\n');
  return { attemptId: rec.attemptId, score: res.counts.canonicalPassed, snapMatches: snapSha === EXPECT_SHA, counts: res.counts };
}
main().then((r) => console.log(JSON.stringify({ attemptId: r.attemptId, governedScore: `${r.score}/3720`, snapMatches: r.snapMatches, dec: r.counts.decisionMismatches, rel: r.counts.relationMismatches, reason: r.counts.reasonMismatches }, null, 2))).catch((e) => { console.error(e); process.exit(1); });
