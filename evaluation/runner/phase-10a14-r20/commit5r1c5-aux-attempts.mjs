// PHASE-10A14-R20 COMMIT 5R1-C5 — register the counterfactual focused-suite (controlling)
// and the substitute architecture-challenge (non-controlling) governed attempts. No runtime
// change on disk (analyzer already restored to baseline).
import { writeFileSync, mkdirSync, readFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function main() {
  const cf = JSON.parse(readFileSync(`${R20}/COMMIT_5R1C5_DECISION_COUNTERFACTUAL_PAIRS.json`, 'utf8'));
  const cfAttempt = await runGovernedAttempt(
    { category: 'focused_suite', gate: 'r20_commit5r1c5_decision_counterfactual_pairs', cycle: 'commit5r1c5-analysis', ordinal: 1, controlling: true, disposition: 'analysis_control' },
    async ({ dir }) => ({
      status: 'completed', disposition: 'analysis_control', exitCode: 0,
      stdout: JSON.stringify({ totalQueries: cf.totalQueries, families: cf.families, passOnBase: cf.passOnBase, failOnBase: cf.failOnBase }, null, 2), stderr: '',
      resultFiles: { 'COUNTERFACTUAL_RESULT.json': JSON.stringify({ totalQueries: cf.totalQueries, pairs: cf.totalQueries / 2, families: cf.families, passOnAccepted2955Base: cf.passOnBase, failOnBase: cf.failOnBase, note: 'Authored from frozen structural rules; no model; no exact R3 query. Run against the accepted 2955 base — failures are the decision-lane targets for C6. The suite must pass on the final decision-locked runtime.' }, null, 2) + '\n' },
      command: 'node', commandArgs: ['commit5r1c5-counterfactuals.mjs'],
    }));

  const scAttempt = await runGovernedAttempt(
    { category: 'other', gate: 'r20_commit5r1c5_substitute_architecture_challenge', cycle: 'commit5r1c5-analysis', ordinal: 1, controlling: false, disposition: 'non_controlling_challenge' },
    async ({ dir }) => {
      const snap = join(dir, 'artifact'); mkdirSync(snap, { recursive: true });
      cpSync(`${R20}/COMMIT_5R1C5_SUBSTITUTE_ARCHITECTURE_CHALLENGE.md`, join(snap, 'SUBSTITUTE_ARCHITECTURE_CHALLENGE.md'));
      return {
        status: 'completed', disposition: 'non_controlling_challenge', exitCode: 0,
        stdout: 'Gemini 2.5 Pro unavailable; Sonnet 5 substitute non-controlling challenge recorded. Did not alter R3/runtime/tests; did not issue the controlling decision.', stderr: '',
        resultFiles: { 'CHALLENGE_SUMMARY.json': JSON.stringify({ geminiAvailable: false, substituteChallenger: 'Sonnet 5', controlling: false, artifact: 'COMMIT_5R1C5_SUBSTITUTE_ARCHITECTURE_CHALLENGE.md' }, null, 2) + '\n' },
        command: 'n/a', commandArgs: ['substitute-architecture-challenge'],
      };
    });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1c5-incomplete';
  registry.runtimeClosure = false;
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1C5_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1C5_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1c5-incomplete', runtimeClosure: false, summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  const ccs = JSON.parse(readFileSync(`${R20}/CANONICAL_COUNT_SUMMARY.json`, 'utf8'));
  ccs.registrySummary = registry.summary;
  writeR('CANONICAL_COUNT_SUMMARY.json', ccs);
  return { cf: cfAttempt.attemptId, sc: scAttempt.attemptId, registry: registry.summary, recon };
}
main().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
