// PHASE-10A14-R20 COMMIT 5 — Stage A baseline + frozen-oracle reason-conflict
// blocker disclosure. NO runtime modification. The baseline is a planned
// diagnostic preserved regardless of result. A frozen-oracle expectation defect
// that blocks canonical closure is disclosed as a controlling blocker; per the
// freeze contract this yields COMMIT 5 INCOMPLETE / REVISIONS REQUIRED.

import { writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadFrozenRows, loadRuntime, scoreRows } from './commit5-oracle-runner.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, captureRuntimeIdentity, captureHarnessIdentity, captureEnvironmentFingerprint, gitObject, sha256File } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const writeR = (name, obj) => writeFileSync(join(R20, name), typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) + '\n');

// Classify each inherited reason-only mismatch as a frozen-oracle granularity
// conflict (analyzer reason is a legitimate refinement of the coarse frozen one).
const REFINEMENT = new Set([
  'explicit_tax_task_relation|tax_compliance_task',
  'explicit_tax_task_relation|tax_treatment_of_ordinary_object',
  'explicit_non_tax_task|non_tax_expansion',
  'explicit_non_tax_task|non_tax_label_or_name',
  'explicit_non_tax_task|quoted_tax_term_only',
]);

async function main() {
  writeR('COMMIT_5_PREFLIGHT.json', {
    phase: 'PHASE-10A14-R20', unit: 'COMMIT 5', startingHead: gitObject('HEAD'), parent: gitObject('HEAD~1'),
    analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    legacyDomainBoundaryBlob: gitObject('HEAD:services/philippine-tax-domain-boundary.js'),
    legacyPatternsBlob: gitObject('HEAD:services/philippine-tax-boundary-patterns.js'),
    frozenOracleSha256: sha256File(`${REPO}/evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json`),
    runtime: captureRuntimeIdentity(), harness: captureHarnessIdentity(),
    capturedAt: new Date().toISOString(),
  });
  writeR('COMMIT_5_FROZEN_ORACLE_IDENTITY.json', {
    path: 'evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json',
    sha256: sha256File(`${REPO}/evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json`),
    expected: '0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263',
  });

  const rows = loadFrozenRows();
  const rt = await loadRuntime('standalone');
  const { counts, failures } = scoreRows(rows, rt.classify);

  // Stage A baseline attempt (planned diagnostic; failures do not require STOP).
  const attemptBaseline = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5_pre_remediation_standalone_baseline', cycle: 'commit5-baseline', ordinal: 1, controlling: true, disposition: 'development_baseline', command: 'node commit5 baseline' },
    async ({ dir }) => {
      // Preserve exact tested runtime snapshot.
      const snap = join(dir, 'runtime-snapshot');
      mkdirSync(snap, { recursive: true });
      for (const f of ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) {
        cpSync(`${REPO}/services/${f}`, join(snap, f));
      }
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({
        analyzer: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
        domainBoundary: gitObject('HEAD:services/philippine-tax-domain-boundary.js'),
        patterns: gitObject('HEAD:services/philippine-tax-boundary-patterns.js'),
        note: 'Unchanged COMMIT 3 standalone analyzer; no COMMIT 5 runtime modification.',
      }, null, 2) + '\n');
      return {
        status: 'completed', disposition: 'development_baseline', exitCode: 0,
        stdout: JSON.stringify(counts, null, 2), stderr: '',
        resultFiles: { 'BASELINE_RESULT.json': JSON.stringify({ counts, failureCount: failures.length }, null, 2) + '\n' },
        command: 'node', commandArgs: ['commit5-oracle-runner.mjs', '--standalone-baseline'],
      };
    });

  // Baseline result + failure matrix (preserved regardless of result).
  writeR('COMMIT_5_DEVELOPMENT_BASELINE_RESULT.json', { sourceAttemptId: attemptBaseline.attemptId, runtime: 'standalone COMMIT 3 analyzer (unchanged)', counts, failureCount: failures.length });
  writeR('COMMIT_5_DEVELOPMENT_FAILURE_MATRIX.json', {
    total: counts.total, passed: counts.canonicalPassed,
    decisionMismatches: counts.decisionMismatches, reasonMismatches: counts.reasonMismatches, relationMismatches: counts.relationMismatches,
    bySourceSet: counts.bySourceSet, byCategory: counts.byCategory,
    metamorphicGroupsPassed: counts.metamorphicGroupsPassed, metamorphicGroupsTotal: counts.metamorphicGroupsTotal,
    failures,
  });

  // Frozen-oracle reason-granularity conflict analysis (the controlling blocker).
  const inheritedReasonOnly = failures.filter((f) => f.sourceSet !== 'r20_new' && f.decisionPass && !f.relationPass === false && !f.reasonPass && f.decisionPass);
  const conflictRows = [];
  let refinementCount = 0;
  for (const f of failures) {
    if (f.sourceSet === 'r20_new') continue;
    if (!f.decisionPass || f.reasonPass) continue;
    const key = `${f.expectedReasonCodeFamily}|${f.actualReasonFamily}`;
    const isRefinement = REFINEMENT.has(key);
    if (isRefinement) refinementCount++;
    conflictRows.push({ oracleId: f.oracleId, query: f.query, frozenExpectedReason: f.expectedReasonCodeFamily, analyzerReason: f.actualReasonFamily, classification: isRefinement ? 'frozen_coarse_analyzer_refinement' : 'analyzer_gap_or_other' });
  }
  writeR('COMMIT_5_FROZEN_ORACLE_REASON_CONFLICT.json', {
    finding: 'FROZEN_ORACLE_REASON_GRANULARITY_CONFLICT',
    summary: 'The COMMIT 4 frozen oracle assigned inherited-row (r19_1120 / r18_corrected_567 / r17_accepted_control) expectedReasonCodeFamily via a coarse heuristic (inheritedReasonFamily in commit4-oracle-builder.mjs). Those coarse families conflict with the analyzer\'s contract-required fine-grained reason taxonomy, so exact canonical reason match on all 3,720 rows is unreachable without editing the immutable frozen oracle or degrading the analyzer\'s reason grounding.',
    inheritedReasonOnlyMismatches: conflictRows.length,
    frozenCoarseVsAnalyzerRefinement: refinementCount,
    analyzerGapOrOther: conflictRows.length - refinementCount,
    exampleConflicts: conflictRows.filter((c) => c.classification === 'frozen_coarse_analyzer_refinement').slice(0, 10),
    governanceImplication: 'Per FINAL_RUNTIME_FREEZE / freeze contract, a frozen-oracle expectation defect that blocks canonical closure requires STOP + REVISIONS REQUIRED. The frozen oracle (expectationsMutable=false) must be re-frozen with corrected inherited-row reason families (a COMMIT 4 revision) before COMMIT 5 runtime closure is achievable.',
    ownerAdjudication: 'STOP — REVISIONS REQUIRED. Do not edit the frozen oracle in COMMIT 5; do not degrade the analyzer; do not patch exact rows. Baseline preserved.',
    noRuntimeModification: true,
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5';
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cycle: 'commit5', cumulativeThrough: 'commit5', summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5', registrySummary: registry.summary, commit5: { decision: 'INCOMPLETE_REVISIONS_REQUIRED', baseline: counts.canonicalPassed + '/' + counts.total, blocker: 'FROZEN_ORACLE_REASON_GRANULARITY_CONFLICT', runtimeModified: false } });

  return { baselineAttempt: attemptBaseline.attemptId, baseline: `${counts.canonicalPassed}/${counts.total}`, conflictRows: conflictRows.length, refinementCount, registry: registry.summary, recon };
}

main().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
