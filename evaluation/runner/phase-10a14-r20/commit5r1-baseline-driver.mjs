// PHASE-10A14-R20 COMMIT 5R1 — R2 baseline + development-iteration diagnostic.
// INCOMPLETE unit: the runtime did NOT reach 3720/3720 canonical closure, so no
// runtime freeze occurs. The unchanged COMMIT 3 analyzer baseline is registered;
// the best development iteration is preserved as diagnostic evidence. The analyzer
// on disk remains the committed COMMIT 3 baseline (blob a23364bc).

import { writeFileSync, mkdirSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR2Rows, scoreRows } from './commit5r1-oracle-runner.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, gitObject, sha256File, captureRuntimeIdentity, captureHarnessIdentity, captureEnvironmentFingerprint } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const R2_PATH = `${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/R20_DEVELOPMENT_ORACLE_FROZEN_R2.json`;
const R2_SHA = '1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd';
const DEV_ITER_PATH = 'C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad/analyzer_dev_iter_2674.js';
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function main() {
  const r2Sha = sha256File(R2_PATH);
  writeR('COMMIT_5R1_PREFLIGHT.json', {
    phase: 'PHASE-10A14-R20', unit: 'COMMIT 5R1', startingHead: gitObject('HEAD'), parent: gitObject('HEAD~1'),
    r2Sha256: r2Sha, r2Matches: r2Sha === R2_SHA,
    analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    legacyDomainBoundaryBlob: gitObject('HEAD:services/philippine-tax-domain-boundary.js'),
    legacyPatternsBlob: gitObject('HEAD:services/philippine-tax-boundary-patterns.js'),
    runtime: captureRuntimeIdentity(), harness: captureHarnessIdentity(),
    capturedAt: new Date().toISOString(),
  });
  writeR('COMMIT_5R1_R2_ORACLE_IDENTITY.json', { path: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/R20_DEVELOPMENT_ORACLE_FROZEN_R2.json', sha256: r2Sha, expected: R2_SHA, rows: loadR2Rows().length });

  const rows = loadR2Rows();

  // ── Stage A baseline: unchanged COMMIT 3 standalone analyzer vs R2 ──
  const baseMod = await import(pathToFileURL(`${REPO}/services/philippine-tax-intent-analyzer.js`).href + `?v=${Date.now()}`);
  const baseClassify = (q) => { const ev = baseMod.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  const base = scoreRows(rows, baseClassify);

  const attemptBaseline = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1_pre_remediation_r2_standalone_baseline', cycle: 'commit5r1-baseline', ordinal: 1, controlling: true, disposition: 'development_baseline' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot');
      mkdirSync(snap, { recursive: true });
      for (const f of ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ analyzer: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'), domainBoundary: gitObject('HEAD:services/philippine-tax-domain-boundary.js'), patterns: gitObject('HEAD:services/philippine-tax-boundary-patterns.js'), note: 'Unchanged COMMIT 3 standalone analyzer; R2 diagnostic baseline.' }, null, 2) + '\n');
      return { status: 'completed', disposition: 'development_baseline', exitCode: 0, stdout: JSON.stringify(base.counts, null, 2), stderr: '', resultFiles: { 'R2_BASELINE_RESULT.json': JSON.stringify({ counts: base.counts, failureCount: base.failures.length }, null, 2) + '\n' }, command: 'node', commandArgs: ['commit5r1-oracle-runner.mjs', '--r2-standalone-baseline'] };
    });
  writeR('COMMIT_5R1_R2_BASELINE_RESULT.json', { sourceAttemptId: attemptBaseline.attemptId, runtime: 'unchanged COMMIT 3 analyzer (blob a23364bc)', counts: base.counts, failureCount: base.failures.length });
  writeR('COMMIT_5R1_DEVELOPMENT_FAILURE_MATRIX.json', { runtime: 'baseline', total: base.counts.total, passed: base.counts.canonicalPassed, decisionMismatches: base.counts.decisionMismatches, reasonMismatches: base.counts.reasonMismatches, relationMismatches: base.counts.relationMismatches, bySourceSet: base.counts.bySourceSet, byCategory: base.counts.byCategory, metamorphicGroupsPassed: base.counts.metamorphicGroupsPassed, metamorphicGroupsTotal: base.counts.metamorphicGroupsTotal, failures: base.failures });

  // ── Development iteration diagnostic (best in-progress runtime, NOT applied to services) ──
  let devCounts = null, devAttemptId = null;
  if (existsSync(DEV_ITER_PATH)) {
    const devMod = await import(pathToFileURL(DEV_ITER_PATH).href + `?v=${Date.now()}`);
    const devClassify = (q) => { const ev = devMod.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
    const dev = scoreRows(rows, devClassify);
    devCounts = dev.counts;
    const attemptDev = await runGovernedAttempt(
      { category: 'domain_campaign', gate: 'r20_commit5r1_development_iteration_01', cycle: 'commit5r1-dev-01', ordinal: 1, controlling: true, disposition: 'development_iteration_incomplete' },
      async ({ dir }) => {
        const snap = join(dir, 'runtime-snapshot');
        mkdirSync(snap, { recursive: true });
        // Preserve the exact tested development analyzer inside the attempt directory.
        cpSync(DEV_ITER_PATH, join(snap, 'philippine-tax-intent-analyzer.js'));
        for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
        writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'In-progress clause-level/relation remediation iteration. NOT applied to services/ (unit is INCOMPLETE, no freeze). Preserved for the authorized continuation.', analyzerSha256: sha256File(DEV_ITER_PATH), domainBoundary: gitObject('HEAD:services/philippine-tax-domain-boundary.js'), patterns: gitObject('HEAD:services/philippine-tax-boundary-patterns.js') }, null, 2) + '\n');
        return { status: 'completed', disposition: 'development_iteration_incomplete', exitCode: 0, stdout: JSON.stringify(dev.counts, null, 2), stderr: '', resultFiles: { 'DEV_ITERATION_RESULT.json': JSON.stringify({ counts: dev.counts, failureCount: dev.failures.length }, null, 2) + '\n', 'DEV_ITERATION_FAILURES.json': JSON.stringify(dev.failures) + '\n' }, command: 'node', commandArgs: ['commit5r1-oracle-runner.mjs', '--dev-iteration-01'] };
      });
    devAttemptId = attemptDev.attemptId;
  }

  writeR('COMMIT_5R1_DEVELOPMENT_ITERATION_REGISTER.json', {
    iterations: [
      { iterationId: 'baseline', attemptId: attemptBaseline.attemptId, runtime: 'unchanged COMMIT 3 analyzer', canonicalPassed: base.counts.canonicalPassed, total: 3720, disposition: 'development_baseline', supersededBy: devAttemptId },
      ...(devCounts ? [{ iterationId: 'dev-01', attemptId: devAttemptId, parentIterationId: 'baseline', runtime: 'in-progress clause-level/relation remediation (preserved in attempt snapshot; not applied to services/)', canonicalPassed: devCounts.canonicalPassed, total: 3720, decisionMismatches: devCounts.decisionMismatches, reasonMismatches: devCounts.reasonMismatches, relationMismatches: devCounts.relationMismatches, metamorphicGroupsPassed: devCounts.metamorphicGroupsPassed, disposition: 'development_iteration_incomplete', supersededBy: null, note: 'Did not reach 3720/3720; architecture remediation not closed.' }] : []),
    ],
  });

  writeR('COMMIT_5R1_DECISION.json', {
    decision: 'COMMIT_5_RESTART_1_INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED',
    reason: 'The clause-level/relation runtime did not reach exact 3720/3720 canonical closure (decision+reason+relation) against R2. Per the frozen COMMIT 5R1 failure discipline, evidence is preserved and the unit STOPS without a runtime freeze.',
    baselineCanonicalPassed: base.counts.canonicalPassed,
    bestDevelopmentCanonicalPassed: devCounts ? devCounts.canonicalPassed : null,
    runtimeFrozen: false, analyzerModified: false, analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    next: 'Authorized continuation resumes remediation from the preserved development iteration toward 3720/3720, then integrates and freezes.',
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1';
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1', summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5r1', registrySummary: registry.summary, commit5r1: { decision: 'INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED', baseline: base.counts.canonicalPassed + '/3720', bestDevelopment: (devCounts ? devCounts.canonicalPassed : 'n/a') + '/3720', runtimeFrozen: false, analyzerModified: false } });

  return { baselineAttempt: attemptBaseline.attemptId, baseline: `${base.counts.canonicalPassed}/3720`, devAttempt: devAttemptId, dev: devCounts ? `${devCounts.canonicalPassed}/3720` : null, registry: registry.summary, recon };
}

main().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
