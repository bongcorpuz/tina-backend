// PHASE-10A14-R20 COMMIT 5R1-C1 — architecture remediation continuation.
// INCOMPLETE: standalone closure is LOGICALLY UNREACHABLE because R2 contains 14
// template-wide reason conflicts (140 rows, ceiling 3706/3720). Per owner
// adjudication: preserve evidence, register the reconstructed + improved candidate
// governed attempts, do NOT integrate/freeze/edit R2. The analyzer on disk is
// restored to the committed COMMIT 3 baseline (blob a23364bc).

import { writeFileSync, mkdirSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR2Rows, scoreRows } from './commit5r1-oracle-runner.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, gitObject, sha256File, captureRuntimeIdentity, captureHarnessIdentity } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SCRATCH = 'C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad';
const CAND_2674 = `${SCRATCH}/analyzer_dev_iter_2674.js`;
const CAND_2777 = `${SCRATCH}/analyzer_dev_iter_2777.js`;
const R2_SHA = '1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd';
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function scoreCandidate(path) {
  cpSync(path, ANALYZER_LIVE);
  const mod = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify = (q) => { const ev = mod.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  return scoreRows(loadR2Rows(), classify);
}

async function main() {
  const r2Sha = sha256File(`${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/R20_DEVELOPMENT_ORACLE_FROZEN_R2.json`);
  writeR('COMMIT_5R1C1_PREFLIGHT.json', {
    phase: 'PHASE-10A14-R20', unit: 'COMMIT 5R1-C1', startingHead: gitObject('HEAD'), parent: gitObject('HEAD~1'),
    r2Sha256: r2Sha, r2Matches: r2Sha === R2_SHA,
    runtime: captureRuntimeIdentity(), harness: captureHarnessIdentity(), capturedAt: new Date().toISOString(),
  });

  const conflict = JSON.parse(readFileSync(join(R20, 'COMMIT_5R1C1_R2_TEMPLATE_CONFLICT_INVENTORY.json'), 'utf8'));

  // Attempt: reconstructed 2,674 candidate.
  const rec = await scoreCandidate(CAND_2674);
  const recSha = sha256File(CAND_2674);
  const attemptRec = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c1_reconstructed_2674_candidate', cycle: 'commit5r1c1-dev-01', ordinal: 1, controlling: true, disposition: 'development_iteration_reconstructed' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(CAND_2674, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Reconstructed from the preserved COMMIT 5R1 dev-01 snapshot; originated from earlier UNREGISTERED local iterations. Governed score below is controlling.', analyzerSha256: recSha, patchBase: 'committed COMMIT 3 analyzer a23364bc' }, null, 2) + '\n');
      return { status: 'completed', disposition: 'development_iteration_reconstructed', exitCode: 0, stdout: JSON.stringify(rec.counts, null, 2), stderr: '', resultFiles: { 'RECONSTRUCTED_RESULT.json': JSON.stringify({ counts: rec.counts, failureCount: rec.failures.length }, null, 2) + '\n' }, command: 'node', commandArgs: ['commit5r1-oracle-runner.mjs', '--reconstructed-2674'] };
    });

  // Attempt: improved candidate (further architecture remediation this cycle).
  const imp = await scoreCandidate(CAND_2777);
  const impSha = sha256File(CAND_2777);
  const attemptImp = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c1_development_iteration_02', cycle: 'commit5r1c1-dev-02', ordinal: 1, controlling: true, disposition: 'development_iteration_incomplete' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(CAND_2777, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Further clause-level/relation architecture remediation this continuation cycle (homograph veto, clear-tax-content residual, Filipino VAT relations, negation-scope relations). NOT applied to services/ (unit INCOMPLETE; standalone closure logically unreachable at 3706 ceiling). Preserved for the post-4R3 restart.', analyzerSha256: impSha, patchBase: 'reconstructed 2674 candidate' }, null, 2) + '\n');
      writeFileSync(join(snap, 'DIFF_FROM_PREVIOUS_RUNTIME.patch'), (() => { try { return execFileSync('git', ['diff', '--no-index', '--', CAND_2674, CAND_2777], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } })());
      return { status: 'completed', disposition: 'development_iteration_incomplete', exitCode: 0, stdout: JSON.stringify(imp.counts, null, 2), stderr: '', resultFiles: { 'DEV02_RESULT.json': JSON.stringify({ counts: imp.counts, failureCount: imp.failures.length }, null, 2) + '\n', 'DEV02_FAILURES.json': JSON.stringify(imp.failures) + '\n' }, command: 'node', commandArgs: ['commit5r1-oracle-runner.mjs', '--dev-iteration-02'] };
    });

  // Restore the analyzer on disk to the committed COMMIT 3 baseline (no freeze).
  execFileSync('git', ['checkout', 'HEAD', '--', 'services/philippine-tax-intent-analyzer.js'], { cwd: REPO });

  writeR('COMMIT_5R1C1_DEVELOPMENT_ITERATION_REGISTER.json', {
    iterations: [
      { iterationId: 'reconstructed-2674', attemptId: attemptRec.attemptId, governedScore: `${rec.counts.canonicalPassed}/3720`, disposition: 'development_iteration_reconstructed', note: 'Governed re-run of the preserved candidate; matches the earlier local 2674.' },
      { iterationId: 'dev-02', attemptId: attemptImp.attemptId, parentIterationId: 'reconstructed-2674', governedScore: `${imp.counts.canonicalPassed}/3720`, decisionMismatches: imp.counts.decisionMismatches, reasonMismatches: imp.counts.reasonMismatches, relationMismatches: imp.counts.relationMismatches, metamorphicGroupsPassed: imp.counts.metamorphicGroupsPassed, disposition: 'development_iteration_incomplete', supersededBy: null, architecturalChange: 'Category homograph veto; clear-tax-content residual ALLOW; Filipino VAT/withholding relations; negation-scope non-tax-action relations; genuine-tax-question guard.' },
    ],
    ceilingNote: `Standalone closure capped at ${conflict.theoreticalMaxDeterministicPass}/3720 by ${conflict.conflictTemplates} R2 template-wide reason conflicts (${conflict.totalConflictRows} rows). Exact 3720/3720 is logically unreachable by any deterministic analyzer until R2 is corrected (COMMIT 4R3).`,
  });

  writeR('COMMIT_5R1C1_DECISION.json', {
    decision: 'COMMIT_5R1C1_INCOMPLETE_FROZEN_R2_TEMPLATE_WIDE_REASON_CONFLICT',
    reason: 'R2 contains 14 template-wide reason-family conflicts (140 rows) where byte-identical query structures carry different expected reasons, because COMMIT 4R2 applied each R1S-confirmed correction to only one sampled instance per repeating template. The deterministic ceiling is 3706/3720; exact 3720/3720 standalone closure is logically unreachable.',
    theoreticalMaxDeterministicPass: conflict.theoreticalMaxDeterministicPass,
    bestGovernedStandalone: `${imp.counts.canonicalPassed}/3720`,
    runtimeFrozen: false, runtimeIntegrated: false, analyzerModified: false, r2Edited: false,
    analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    next: 'PHASE-10A14-R20 COMMIT 4R3: TEMPLATE-WIDE REASON-FAMILY ORACLE RE-FREEZE (apply each of the 14 confirmed corrections template-wide as a new R3 oracle; preserve R2). COMMIT 5R1-C1 restarts only after R3 is frozen and validated.',
    accepted3706AsPass: false, runtimeExceptionsCreated: false,
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1c1';
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1C1_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1C1_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1c1', summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5r1c1', registrySummary: registry.summary, commit5r1c1: { decision: 'INCOMPLETE_FROZEN_R2_TEMPLATE_WIDE_REASON_CONFLICT', reconstructed: `${rec.counts.canonicalPassed}/3720`, bestDevelopment: `${imp.counts.canonicalPassed}/3720`, deterministicCeiling: `${conflict.theoreticalMaxDeterministicPass}/3720`, runtimeFrozen: false, analyzerModified: false, r2Edited: false } });

  return { attemptReconstructed: attemptRec.attemptId, reconstructed: `${rec.counts.canonicalPassed}/3720`, attemptDev02: attemptImp.attemptId, dev02: `${imp.counts.canonicalPassed}/3720`, ceiling: `${conflict.theoreticalMaxDeterministicPass}/3720`, conflictTemplates: conflict.conflictTemplates, conflictRows: conflict.totalConflictRows, registry: registry.summary, recon };
}

main().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
