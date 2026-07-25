// PHASE-10A14-R20 COMMIT 5R1-C2 — architecture remediation continuation 2 vs R3.
// INCOMPLETE: standalone R3 closure not reached. Registers the reconstructed dev-02
// R3 attempt (2716) and the improved iteration (2819), preserves snapshots + failure
// matrices, then restores the live runtime to the committed COMMIT 3 baseline. No
// integration, no freeze, no R3 edit.

import { writeFileSync, mkdirSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, gitObject, sha256File, captureRuntimeIdentity, captureHarnessIdentity } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SCRATCH = 'C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad';
const DEV02_SNAP = `${REPO}/evaluation/results/phase-10a14-r20/attempts/R20-domain_campaign-r20_commit5r1c1_development_iteration_02-commit5r1c1-dev-02-ord01-2026-07-25T05-13-14-795Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const CAND_2819 = `${SCRATCH}/analyzer_c2_dev02_2819.js`;
const R3_SHA = 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54';
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function scoreCandidate(path) {
  cpSync(path, ANALYZER_LIVE);
  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  return scoreRows(loadR3Rows(), classify);
}

async function main() {
  const r3Sha = sha256File(`${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json`);
  writeR('COMMIT_5R1C2_PREFLIGHT.json', { phase: 'PHASE-10A14-R20', unit: 'COMMIT 5R1-C2', startingHead: gitObject('HEAD'), parent: gitObject('HEAD~1'), r3Sha256: r3Sha, r3Matches: r3Sha === R3_SHA, runtime: captureRuntimeIdentity(), harness: captureHarnessIdentity(), capturedAt: new Date().toISOString() });
  writeR('COMMIT_5R1C2_R3_ORACLE_IDENTITY.json', { path: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', sha256: r3Sha, expected: R3_SHA, rows: loadR3Rows().length });

  // Dev-02 reconstruction source lock.
  const dev02Sha = sha256File(DEV02_SNAP);
  writeR('COMMIT_5R1C2_DEV02_RECONSTRUCTION_SOURCE_LOCK.json', { sourceSnapshot: 'attempts/…commit5r1c1-dev-02…/runtime-snapshot/philippine-tax-intent-analyzer.js', snapshotSha256: dev02Sha, patchBase: 'committed COMMIT 3 analyzer a23364bc', onlyAnalyzerDiffers: true });

  // ── Attempt: reconstructed dev-02 against R3 (2716). ──
  const rec = await scoreCandidate(DEV02_SNAP);
  const attemptRec = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c2_reconstructed_dev02_against_r3', cycle: 'commit5r1c2-dev-01', ordinal: 1, controlling: true, disposition: 'development_iteration_reconstructed' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(DEV02_SNAP, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Reconstructed COMMIT 5R1-C1 dev-02 candidate, re-scored against R3 (governed). Historical R2 score was 2777; governed R3 score below controls.', analyzerSha256: dev02Sha, patchBase: 'COMMIT 3 analyzer a23364bc', oracleVersion: 'R3' }, null, 2) + '\n');
      return { status: 'completed', disposition: 'development_iteration_reconstructed', exitCode: 0, stdout: JSON.stringify(rec.counts, null, 2), stderr: '', resultFiles: { 'DEV02_R3_RESULT.json': JSON.stringify({ counts: rec.counts, failureCount: rec.failures.length }, null, 2) + '\n' }, command: 'node', commandArgs: ['commit5r1c2-oracle-runner.mjs', '--reconstructed-dev02-r3'] };
    });
  writeR('COMMIT_5R1C2_DEV02_R3_RESULT.json', { sourceAttemptId: attemptRec.attemptId, historicalR2Score: '2777/3720', governedR3Score: `${rec.counts.canonicalPassed}/3720`, counts: rec.counts });
  writeR('COMMIT_5R1C2_DEV02_RECONSTRUCTED_IDENTITY.json', { analyzerSha256: dev02Sha, oracleVersion: 'R3', runtimeContentEqualToSnapshot: true });

  // ── Attempt: improved iteration dev-02 (2819) ──
  const imp = await scoreCandidate(CAND_2819);
  const impSha = sha256File(CAND_2819);
  const attemptImp = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c2_development_iteration_02', cycle: 'commit5r1c2-dev-02', ordinal: 1, controlling: true, disposition: 'development_iteration_incomplete' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(CAND_2819, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Improved clause-level/relation architecture iteration this continuation (scenario->no_tax_relation per R3, genuine-tax-question predicate relations, withholding/VAT relation typing, negation non-tax-action relation, expanded non-tax domain nouns). NOT applied to services/ (unit INCOMPLETE). Preserved for COMMIT 5R1-C3.', analyzerSha256: impSha, patchBase: 'reconstructed dev-02 candidate', oracleVersion: 'R3' }, null, 2) + '\n');
      writeFileSync(join(snap, 'DIFF_FROM_PREVIOUS_RUNTIME.patch'), (() => { try { return execFileSync('git', ['diff', '--no-index', '--', DEV02_SNAP, CAND_2819], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } })());
      return { status: 'completed', disposition: 'development_iteration_incomplete', exitCode: 0, stdout: JSON.stringify(imp.counts, null, 2), stderr: '', resultFiles: { 'DEV02_IMPROVED_RESULT.json': JSON.stringify({ counts: imp.counts, failureCount: imp.failures.length }, null, 2) + '\n', 'DEV02_IMPROVED_FAILURES.json': JSON.stringify(imp.failures) + '\n' }, command: 'node', commandArgs: ['commit5r1c2-oracle-runner.mjs', '--dev-iteration-02'] };
    });

  // Restore live runtime to committed COMMIT 3 baseline.
  execFileSync('git', ['checkout', 'HEAD', '--', 'services/philippine-tax-intent-analyzer.js'], { cwd: REPO });

  writeR('COMMIT_5R1C2_DEVELOPMENT_ITERATION_REGISTER.json', {
    iterations: [
      { iterationId: 'reconstructed-dev02', attemptId: attemptRec.attemptId, oracleVersion: 'R3', governedScore: `${rec.counts.canonicalPassed}/3720`, disposition: 'development_iteration_reconstructed', note: 'dev-02 re-scored against R3 (historical R2 score 2777).' },
      { iterationId: 'dev-02', attemptId: attemptImp.attemptId, parentIterationId: 'reconstructed-dev02', oracleVersion: 'R3', governedScore: `${imp.counts.canonicalPassed}/3720`, decisionMismatches: imp.counts.decisionMismatches, reasonMismatches: imp.counts.reasonMismatches, relationMismatches: imp.counts.relationMismatches, materialFalseAllows: imp.counts.materialFalseAllows, materialFalseRefusals: imp.counts.materialFalseRefusals, clarifyMismatches: imp.counts.clarifyMismatches, metamorphicGroupsPassed: imp.counts.metamorphicGroupsPassed, metamorphicGroupsFailed: imp.counts.metamorphicGroupsFailed, architecturalHypothesis: 'scenario dangling -> no_tax_relation (R3); genuine-tax-question predicate builds tax relation before homograph veto; withholding/VAT specific relation typing; negation non-tax-action relation; expanded non-tax domain-noun homograph veto.', disposition: 'development_iteration_incomplete', supersededBy: null, note: 'Did not reach 3720/3720; architecture remediation not closed.' },
    ],
  });
  writeR('COMMIT_5R1C2_DEVELOPMENT_FAILURE_MATRIX.json', { runtime: 'best dev-02 improved (2819)', total: 3720, passed: imp.counts.canonicalPassed, failed: 3720 - imp.counts.canonicalPassed, decisionMismatches: imp.counts.decisionMismatches, reasonMismatches: imp.counts.reasonMismatches, relationMismatches: imp.counts.relationMismatches, materialFalseAllows: imp.counts.materialFalseAllows, materialFalseRefusals: imp.counts.materialFalseRefusals, clarifyMismatches: imp.counts.clarifyMismatches, bySourceSet: imp.counts.bySourceSet, byCategory: imp.counts.byCategory, metamorphicGroupsPassed: imp.counts.metamorphicGroupsPassed, metamorphicGroupsTotal: imp.counts.metamorphicGroupsTotal });

  writeR('COMMIT_5R1C2_DECISION.json', {
    decision: 'COMMIT_5R1C2_INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED',
    reason: 'Standalone R3 closure (3720/3720 on decision+reason+relation) not reached. Best governed R3 candidate 2819/3720. Remaining failures are dominated by competing clause/task/target/relation constraints (genuine mixed-domain tax vs homograph traps; explicit_tax_task_relation vs tax_treatment_of_ordinary_object reason granularity on inherited rows).',
    r3Sha256: R3_SHA, r3Edited: false, reconstructedDev02R3: `${rec.counts.canonicalPassed}/3720`, bestGovernedR3: `${imp.counts.canonicalPassed}/3720`, remainingFailedRows: 3720 - imp.counts.canonicalPassed,
    runtimeIntegrated: false, runtimeFrozen: false, runtimeMutable: true, analyzerRestoredToBaseline: true, analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    accepted2819AsClosure: false, runtimeExceptionsCreated: false,
    next: 'PHASE-10A14-R20 COMMIT 5R1-C3: ARCHITECTURE REMEDIATION CONTINUATION 3 AGAINST R3 (resume from the preserved 2819 candidate).',
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1c2-incomplete';
  registry.runtimeClosure = false;
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1C2_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1C2_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1c2-incomplete', runtimeClosure: false, summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5r1c2-incomplete', runtimeClosure: false, registrySummary: registry.summary, commit5r1c2: { decision: 'INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED', reconstructedDev02R3: `${rec.counts.canonicalPassed}/3720`, bestGovernedR3: `${imp.counts.canonicalPassed}/3720`, remainingFailed: 3720 - imp.counts.canonicalPassed, runtimeFrozen: false, analyzerModified: false, r3Edited: false } });

  return { attemptRec: attemptRec.attemptId, reconstructed: `${rec.counts.canonicalPassed}/3720`, attemptImp: attemptImp.attemptId, best: `${imp.counts.canonicalPassed}/3720`, impCounts: imp.counts, registry: registry.summary, recon };
}

main().then((r) => console.log(JSON.stringify({ reconstructed: r.reconstructed, best: r.best, attempts: { rec: r.attemptRec, imp: r.attemptImp }, registry: r.registry, recon: r.recon }, null, 2))).catch((e) => { console.error(e); process.exit(1); });
