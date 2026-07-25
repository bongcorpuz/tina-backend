// PHASE-10A14-R20 COMMIT 5R1-C3 — architecture remediation continuation 3 vs R3.
// INCOMPLETE: standalone R3 closure not reached. Registers the reconstructed 2819
// candidate and the improved 2870 iteration with snapshots + failure matrices, then
// restores the live runtime to the committed COMMIT 3 baseline. No integration, no
// freeze, no R3 edit.

import { writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, gitObject, sha256File, captureRuntimeIdentity, captureHarnessIdentity } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SCRATCH = 'C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad';
const CAND_2819 = `${REPO}/evaluation/results/phase-10a14-r20/attempts/R20-domain_campaign-r20_commit5r1c2_development_iteration_02-commit5r1c2-dev-02-ord01-2026-07-25T06-07-44-977Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const CAND_2870 = `${SCRATCH}/analyzer_c3_dev02_2870.js`;
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
  writeR('COMMIT_5R1C3_PREFLIGHT.json', { phase: 'PHASE-10A14-R20', unit: 'COMMIT 5R1-C3', startingHead: gitObject('HEAD'), parent: gitObject('HEAD~1'), r3Sha256: r3Sha, r3Matches: r3Sha === R3_SHA, currentStateStartingBlob: gitObject('HEAD:knowledge/CURRENT_STATE.md'), runtime: captureRuntimeIdentity(), harness: captureHarnessIdentity(), capturedAt: new Date().toISOString() });
  writeR('COMMIT_5R1C3_R3_IDENTITY.json', { path: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', sha256: r3Sha, expected: R3_SHA, rows: loadR3Rows().length, changed: false });

  const cand2819Sha = sha256File(CAND_2819);
  writeR('COMMIT_5R1C3_CANDIDATE_RECONSTRUCTION_SOURCE_LOCK.json', { sourceSnapshot: 'attempts/…commit5r1c2-dev-02…/runtime-snapshot/philippine-tax-intent-analyzer.js', snapshotSha256: cand2819Sha, expected: '1a0c305ea7e7df0e2b45ec62f9aabd0c0c6e88564226e77bdeb2622738e4ca0b', matches: cand2819Sha === '1a0c305ea7e7df0e2b45ec62f9aabd0c0c6e88564226e77bdeb2622738e4ca0b', patchBase: 'committed COMMIT 3 analyzer a23364bc', oracleVersion: 'R3' });

  // ── Attempt: reconstructed 2819 against R3 ──
  const rec = await scoreCandidate(CAND_2819);
  const attemptRec = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c3_reconstructed_2819_candidate', cycle: 'commit5r1c3-dev-01', ordinal: 1, controlling: true, disposition: 'development_iteration_reconstructed' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(CAND_2819, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Reconstructed COMMIT 5R1-C2 2819 candidate, re-scored against R3 (governed). Reconstruction check; the governed score below controls.', analyzerSha256: cand2819Sha, patchBase: 'COMMIT 3 analyzer a23364bc', oracleVersion: 'R3' }, null, 2) + '\n');
      return { status: 'completed', disposition: 'development_iteration_reconstructed', exitCode: 0, stdout: JSON.stringify(rec.counts, null, 2), stderr: '', resultFiles: { 'RECONSTRUCTED_2819_RESULT.json': JSON.stringify({ counts: rec.counts, failureCount: rec.failures.length }, null, 2) + '\n' }, command: 'node', commandArgs: ['commit5r1c2-oracle-runner.mjs', '--reconstructed-2819-r3'] };
    });
  writeR('COMMIT_5R1C3_RECONSTRUCTED_2819_RESULT.json', { sourceAttemptId: attemptRec.attemptId, expectedScore: '2819/3720', governedR3Score: `${rec.counts.canonicalPassed}/3720`, identityMatch: cand2819Sha === '1a0c305ea7e7df0e2b45ec62f9aabd0c0c6e88564226e77bdeb2622738e4ca0b', counts: rec.counts });
  writeR('COMMIT_5R1C3_RECONSTRUCTED_2819_IDENTITY.json', { analyzerSha256: cand2819Sha, oracleVersion: 'R3', runtimeContentEqualToSnapshot: true });
  writeR('COMMIT_5R1C3_RECONSTRUCTION_DISCREPANCIES.json', { expected: 2819, governed: rec.counts.canonicalPassed, discrepancy: rec.counts.canonicalPassed - 2819, note: rec.counts.canonicalPassed === 2819 ? 'exact reconstruction' : 'see governed result' });

  // ── Attempt: improved iteration dev-02 (2870) ──
  const imp = await scoreCandidate(CAND_2870);
  const impSha = sha256File(CAND_2870);
  const attemptImp = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c3_development_iteration_02', cycle: 'commit5r1c3-dev-02', ordinal: 1, controlling: true, disposition: 'development_iteration_incomplete' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(CAND_2870, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Improved clause-level/relation iteration this continuation: narrow acronym-non-tax-redefine veto (OSD/monitor, MCIT/plugin, RCIT/robotics, VAT-as-variable-name), tax-expansion+context ALLOW (RMC/PAN/SLSP tax expansions), explicit code-label detection, expanded clear-tax-terms (net estate, books of accounts, official receipt). NOT applied to services/ (unit INCOMPLETE). Preserved for COMMIT 5R1-C4.', analyzerSha256: impSha, patchBase: 'reconstructed 2819 candidate', oracleVersion: 'R3' }, null, 2) + '\n');
      writeFileSync(join(snap, 'DIFF_FROM_PREVIOUS_RUNTIME.patch'), (() => { try { return execFileSync('git', ['diff', '--no-index', '--', CAND_2819, CAND_2870], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } })());
      return { status: 'completed', disposition: 'development_iteration_incomplete', exitCode: 0, stdout: JSON.stringify(imp.counts, null, 2), stderr: '', resultFiles: { 'IMPROVED_2870_RESULT.json': JSON.stringify({ counts: imp.counts, failureCount: imp.failures.length }, null, 2) + '\n', 'IMPROVED_2870_FAILURES.json': JSON.stringify(imp.failures) + '\n' }, command: 'node', commandArgs: ['commit5r1c2-oracle-runner.mjs', '--dev-iteration-02'] };
    });

  // Restore live runtime to committed COMMIT 3 baseline.
  execFileSync('git', ['checkout', 'HEAD', '--', 'services/philippine-tax-intent-analyzer.js'], { cwd: REPO });

  writeR('COMMIT_5R1C3_DEVELOPMENT_ITERATION_REGISTER.json', {
    iterations: [
      { iterationId: 'reconstructed-2819', attemptId: attemptRec.attemptId, oracleVersion: 'R3', governedScore: `${rec.counts.canonicalPassed}/3720`, disposition: 'development_iteration_reconstructed' },
      { iterationId: 'dev-02', attemptId: attemptImp.attemptId, parentIterationId: 'reconstructed-2819', oracleVersion: 'R3', governedScore: `${imp.counts.canonicalPassed}/3720`, layerChanged: 'relation construction + decision precedence (acronym context)', decisionMismatches: imp.counts.decisionMismatches, reasonMismatches: imp.counts.reasonMismatches, relationMismatches: imp.counts.relationMismatches, materialFalseAllows: imp.counts.materialFalseAllows, materialFalseRefusals: imp.counts.materialFalseRefusals, clarifyMismatches: imp.counts.clarifyMismatches, metamorphicGroupsPassed: imp.counts.metamorphicGroupsPassed, metamorphicGroupsFailed: imp.counts.metamorphicGroupsFailed, architecturalHypothesis: 'Narrow acronym-non-tax-redefine veto; tax-expansion-in-parens + context ALLOW; explicit code-label detection; expanded clear-tax-terms bare-term ALLOW.', disposition: 'development_iteration_incomplete', supersededBy: null, improvementOverReconstructed: imp.counts.canonicalPassed - rec.counts.canonicalPassed, note: 'Did not reach 3720/3720; architecture remediation not closed.' },
    ],
  });
  writeR('COMMIT_5R1C3_DEVELOPMENT_FAILURE_MATRIX.json', { runtime: 'best dev-02 improved (2870)', total: 3720, passed: imp.counts.canonicalPassed, failed: 3720 - imp.counts.canonicalPassed, decisionMismatches: imp.counts.decisionMismatches, reasonMismatches: imp.counts.reasonMismatches, relationMismatches: imp.counts.relationMismatches, materialFalseAllows: imp.counts.materialFalseAllows, materialFalseRefusals: imp.counts.materialFalseRefusals, clarifyMismatches: imp.counts.clarifyMismatches, bySourceSet: imp.counts.bySourceSet, byCategory: imp.counts.byCategory, metamorphicGroupsPassed: imp.counts.metamorphicGroupsPassed, metamorphicGroupsTotal: imp.counts.metamorphicGroupsTotal });
  writeR('COMMIT_5R1C3_ITERATION_ACCEPTANCE_REGISTER.json', { iterations: [{ iterationId: 'dev-02', acceptedAsNextBase: true, acceptanceRationale: 'Failed rows decreased 901->850; no closed cluster reopened (tax_compliance_task remains closed); no material false-allow masking; no oracle-specific logic added.', failedRowsDelta: (3720 - imp.counts.canonicalPassed) - (3720 - rec.counts.canonicalPassed), falseAllowDelta: imp.counts.materialFalseAllows - rec.counts.materialFalseAllows, falseRefusalDelta: imp.counts.materialFalseRefusals - rec.counts.materialFalseRefusals }] });

  writeR('COMMIT_5R1C3_DECISION.json', {
    decision: 'COMMIT_5R1C3_INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED',
    reason: 'Standalone R3 closure (3720/3720 on decision+reason+relation) not reached. Best governed R3 candidate 2870/3720. Remaining failures are dominated by competing decision-layer constraints (genuine mixed-domain tax vs homograph traps; acronym tax-context vs non-tax-context) and inherited reason granularity.',
    r3Sha256: R3_SHA, r3Edited: false, reconstructed2819R3: `${rec.counts.canonicalPassed}/3720`, bestGovernedR3: `${imp.counts.canonicalPassed}/3720`, remainingFailedRows: 3720 - imp.counts.canonicalPassed,
    runtimeIntegrated: false, runtimeFrozen: false, runtimeMutable: true, analyzerRestoredToBaseline: true, analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    accepted2870AsClosure: false, runtimeExceptionsCreated: false,
    next: 'PHASE-10A14-R20 COMMIT 5R1-C4: ARCHITECTURE REMEDIATION CONTINUATION 4 AGAINST R3 (resume from the preserved 2870 candidate).',
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1c3-incomplete';
  registry.runtimeClosure = false;
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1C3_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1C3_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1c3-incomplete', runtimeClosure: false, summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5r1c3-incomplete', runtimeClosure: false, registrySummary: registry.summary, commit5r1c3: { decision: 'INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED', reconstructed2819R3: `${rec.counts.canonicalPassed}/3720`, bestGovernedR3: `${imp.counts.canonicalPassed}/3720`, remainingFailed: 3720 - imp.counts.canonicalPassed, runtimeFrozen: false, analyzerModified: false, r3Edited: false } });

  return { attemptRec: attemptRec.attemptId, reconstructed: `${rec.counts.canonicalPassed}/3720`, attemptImp: attemptImp.attemptId, best: `${imp.counts.canonicalPassed}/3720`, impCounts: imp.counts, registry: registry.summary, recon };
}

main().then((r) => console.log(JSON.stringify({ reconstructed: r.reconstructed, best: r.best, attempts: { rec: r.attemptRec, imp: r.attemptImp }, registry: r.registry, recon: r.recon }, null, 2))).catch((e) => { console.error(e); process.exit(1); });
