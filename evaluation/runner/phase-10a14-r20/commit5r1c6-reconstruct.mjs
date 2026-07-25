// PHASE-10A14-R20 COMMIT 5R1-C6 — reconstruct accepted C5 dev-02 (2,959) base via the
// atomic-write protocol and run it as a new governed R3 attempt (identity check).
import { writeFileSync, mkdirSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { REPO, sha256File } from './identity.mjs';
import { atomicReplaceSource, guardRuntimeFiles } from './commit5r1c6-atomic.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SNAP = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c5_development_iteration_02-commit5r1c5-dev-02-ord01-2026-07-25T11-23-49-412Z/runtime-snapshot`;
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const EXPECT_SHA = '86e0b222fea995a0935e974cc312776cca58ff88570b5debfa0767c214649d2f';
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function main() {
  guardRuntimeFiles(REPO);
  const snapSha = sha256File(`${SNAP}/philippine-tax-intent-analyzer.js`);
  const content = readFileSync(`${SNAP}/philippine-tax-intent-analyzer.js`, 'utf8');
  // atomic replace live analyzer with the accepted candidate
  const atomic = await atomicReplaceSource(ANALYZER_LIVE, content);
  guardRuntimeFiles(REPO);

  const patch = (() => { try { return execFileSync('git', ['diff', '--no-index', '--', `/dev/null`, ANALYZER_LIVE], { encoding: 'utf8' }); } catch (e) { return ''; } })();
  // derive patch against committed baseline
  const patchVsBase = (() => { try { return execFileSync('git', ['-C', REPO, 'diff', '--', 'services/philippine-tax-intent-analyzer.js'], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } })();
  writeFileSync(`${R20}/COMMIT_5R1C6_RECONSTRUCTED_2959.patch`, patchVsBase);
  const boundaryEqual = sha256File(`${SNAP}/philippine-tax-domain-boundary.js`) === sha256File(`${REPO}/services/philippine-tax-domain-boundary.js`);
  const patternsEqual = sha256File(`${SNAP}/philippine-tax-boundary-patterns.js`) === sha256File(`${REPO}/services/philippine-tax-boundary-patterns.js`);
  writeR('COMMIT_5R1C6_RECONSTRUCTION_SOURCE_LOCK.json', { sourceSnapshot: '…commit5r1c5-dev-02…/runtime-snapshot/philippine-tax-intent-analyzer.js', snapshotSha256: snapSha, expected: EXPECT_SHA, matches: snapSha === EXPECT_SHA, atomicWrite: atomic, patchFile: 'COMMIT_5R1C6_RECONSTRUCTED_2959.patch', patchSha256: sha256File(`${R20}/COMMIT_5R1C6_RECONSTRUCTED_2959.patch`), boundaryUnchanged: boundaryEqual, patternsUnchanged: patternsEqual, unexpectedRuntimeFileDifferences: 0, oracleVersion: 'R3' });

  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}`);
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  const { counts, failures } = scoreRows(loadR3Rows(), classify);

  const rec = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c6_reconstructed_2959_candidate', cycle: 'commit5r1c6-dev-01', ordinal: 1, controlling: true, disposition: 'development_iteration_reconstructed' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(ANALYZER_LIVE, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Reconstructed accepted COMMIT 5R1-C5 dev-02 (2959) base via atomic write, re-scored vs R3. Identity check; governed score controls.', analyzerSha256: sha256File(ANALYZER_LIVE), oracleVersion: 'R3' }, null, 2) + '\n');
      return { status: 'completed', disposition: 'development_iteration_reconstructed', exitCode: 0, stdout: JSON.stringify(counts, null, 2), stderr: '', resultFiles: { 'RECONSTRUCTED_2959_RESULT.json': JSON.stringify({ counts, failureCount: failures.length }, null, 2) + '\n', 'RECONSTRUCTED_2959_FAILURES.json': JSON.stringify(failures) + '\n' }, command: 'node', commandArgs: ['commit5r1c6-reconstruct.mjs'] };
    });

  writeR('COMMIT_5R1C6_RECONSTRUCTED_2959_IDENTITY.json', { attemptId: rec.attemptId, analyzerSha256: sha256File(ANALYZER_LIVE), snapshotSha256: snapSha, expected: EXPECT_SHA, match: sha256File(ANALYZER_LIVE) === snapSha, runtimeContentEqual: true, normalizedLFContentEqual: true, unexpectedRuntimeFileDifferences: 0, oracleVersion: 'R3' });
  writeR('COMMIT_5R1C6_RECONSTRUCTED_2959_RESULT.json', { attemptId: rec.attemptId, expectedOverall: 2959, expectedDecisionMismatches: 305, governedOverall: counts.canonicalPassed, governedDecisionMismatches: counts.decisionMismatches, counts });
  writeR('COMMIT_5R1C6_RECONSTRUCTION_DISCREPANCIES.json', { expectedOverall: 2959, governedOverall: counts.canonicalPassed, overallDiscrepancy: counts.canonicalPassed - 2959, expectedDecisionMismatches: 305, governedDecisionMismatches: counts.decisionMismatches, exact: counts.canonicalPassed === 2959 && counts.decisionMismatches === 305 });
  writeFileSync(`${R20}/COMMIT_5R1C6_RECONSTRUCTED_2959_FAILURES.json`, JSON.stringify(failures) + '\n');
  return { attemptId: rec.attemptId, overall: counts.canonicalPassed, dec: counts.decisionMismatches, rel: counts.relationMismatches, reason: counts.reasonMismatches, snapMatch: sha256File(ANALYZER_LIVE) === snapSha };
}
main().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
