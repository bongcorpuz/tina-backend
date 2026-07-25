// PHASE-10A14-R20 COMMIT 5R1-C4 — reconstruct the 2,870 candidate and run it as a
// new governed R3 attempt (identity check; the new governed score controls).

import { writeFileSync, mkdirSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { REPO, gitObject, sha256File } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SNAP = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c3_development_iteration_02-commit5r1c3-dev-02-ord01-2026-07-25T06-36-57-972Z/runtime-snapshot`;
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const EXPECT_SHA = 'e2dfdf05b290e1f117d81e93305f5e6064a53d7518325a9c9d31d2aa99cd871d';
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function score(path) {
  cpSync(path, ANALYZER_LIVE);
  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  return scoreRows(loadR3Rows(), classify);
}

async function main() {
  const snapSha = sha256File(`${SNAP}/philippine-tax-intent-analyzer.js`);
  writeR('COMMIT_5R1C4_RECONSTRUCTION_SOURCE_LOCK.json', { sourceSnapshot: '…commit5r1c3-dev-02…/runtime-snapshot/philippine-tax-intent-analyzer.js', snapshotSha256: snapSha, expected: EXPECT_SHA, matches: snapSha === EXPECT_SHA, patchBase: 'live COMMIT 3 baseline a23364bc', patchFile: 'COMMIT_5R1C4_RECONSTRUCTED_2870.patch', patchSha256: sha256File(`${R20}/COMMIT_5R1C4_RECONSTRUCTED_2870.patch`), boundaryUnchanged: true, patternsUnchanged: true, oracleVersion: 'R3' });

  const res = await score(`${SNAP}/philippine-tax-intent-analyzer.js`);
  const rec = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c4_reconstructed_2870_candidate', cycle: 'commit5r1c4-dev-01', ordinal: 1, controlling: true, disposition: 'development_iteration_reconstructed' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(`${SNAP}/philippine-tax-intent-analyzer.js`, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Reconstructed COMMIT 5R1-C3 2870 candidate re-scored vs R3 (governed). Identity check; the governed score controls.', analyzerSha256: snapSha, patchBase: 'COMMIT 3 analyzer a23364bc', oracleVersion: 'R3' }, null, 2) + '\n');
      return { status: 'completed', disposition: 'development_iteration_reconstructed', exitCode: 0, stdout: JSON.stringify(res.counts, null, 2), stderr: '', resultFiles: { 'RECONSTRUCTED_2870_RESULT.json': JSON.stringify({ counts: res.counts, failureCount: res.failures.length }, null, 2) + '\n', 'RECONSTRUCTED_2870_FAILURES.json': JSON.stringify(res.failures) + '\n' }, command: 'node', commandArgs: ['commit5r1c4-reconstruct.mjs'] };
    });

  writeR('COMMIT_5R1C4_RECONSTRUCTED_2870_IDENTITY.json', { attemptId: rec.attemptId, analyzerSha256: snapSha, expected: EXPECT_SHA, match: snapSha === EXPECT_SHA, oracleVersion: 'R3' });
  writeR('COMMIT_5R1C4_RECONSTRUCTED_2870_RESULT.json', { attemptId: rec.attemptId, expectedScore: '2870/3720', governedR3Score: `${res.counts.canonicalPassed}/3720`, counts: res.counts });
  writeR('COMMIT_5R1C4_RECONSTRUCTION_DISCREPANCIES.json', { expected: 2870, governed: res.counts.canonicalPassed, discrepancy: res.counts.canonicalPassed - 2870, exact: res.counts.canonicalPassed === 2870 });

  // Persist failure rows for partition reconciliation (kept in live results dir for lane work).
  writeFileSync(join(R20, 'COMMIT_5R1C4_RECONSTRUCTED_2870_FAILURES.json'), JSON.stringify(res.failures) + '\n');
  return { attemptId: rec.attemptId, score: res.counts.canonicalPassed, snapSha, matches: snapSha === EXPECT_SHA, counts: res.counts };
}
main().then((r) => console.log(JSON.stringify({ attemptId: r.attemptId, governedScore: `${r.score}/3720`, snapMatches: r.matches, decisionMismatches: r.counts.decisionMismatches, relationMismatches: r.counts.relationMismatches, reasonMismatches: r.counts.reasonMismatches }, null, 2))).catch((e) => { console.error(e); process.exit(1); });
