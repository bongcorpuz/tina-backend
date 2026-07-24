// PHASE-10A14-R20 COMMIT 3 driver — orchestrates Attempts E/F/G/H, updates the
// cumulative registry, and writes COMMIT 3 evidence. Evidence/tooling only.

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { staticScopeAndExports, determinismAndSerialization, evidenceCompleteness } from './commit3-validators.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, captureRuntimeIdentity, captureHarnessIdentity, captureEnvironmentFingerprint, sha256File, gitObject } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const write = (name, obj) => {
  writeFileSync(join(R20, name), typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) + '\n');
};

const TEST_FILES = [
  'tests/phase-10a14-r20/analyzer-schema-contract.test.mjs',
  'tests/phase-10a14-r20/analyzer-clause-and-relation.test.mjs',
  'tests/phase-10a14-r20/analyzer-decision-precedence.test.mjs',
  'tests/phase-10a14-r20/analyzer-determinism.test.mjs',
  'tests/phase-10a14-r20/analyzer-non-integration.test.mjs',
];

function runNodeTest() {
  let stdout = '', exitCode = 0;
  try {
    stdout = execFileSync('node', ['--test', ...TEST_FILES], { cwd: REPO, encoding: 'utf8' });
  } catch (e) {
    stdout = (e.stdout || '') + (e.stderr || '');
    exitCode = e.status ?? 1;
  }
  const tests = Number((stdout.match(/# tests (\d+)/) || [])[1] || 0);
  const pass = Number((stdout.match(/# pass (\d+)/) || [])[1] || 0);
  const fail = Number((stdout.match(/# fail (\d+)/) || [])[1] || 0);
  return { stdout, exitCode, tests, pass, fail };
}

async function main() {
  // ── COMMIT_3_PREFLIGHT ──
  write('COMMIT_3_PREFLIGHT.json', {
    phase: 'PHASE-10A14-R20', unit: 'COMMIT 3',
    startingHead: gitObject('HEAD'), parent: gitObject('HEAD~1'),
    branch: 'feature/source-availability-engine-v1',
    analyzerPresent: gitObject('HEAD:services/philippine-tax-intent-analyzer.js') === 'ABSENT'
      ? 'new (uncommitted, to be added in COMMIT 3)' : 'tracked',
    legacyDomainBoundaryBlob: gitObject('HEAD:services/philippine-tax-domain-boundary.js'),
    legacyPatternsBlob: gitObject('HEAD:services/philippine-tax-boundary-patterns.js'),
    runtime: captureRuntimeIdentity(),
    harness: captureHarnessIdentity(),
    capturedAt: new Date().toISOString(),
  });

  // ── Attempt E: static scope & exports ──
  const eResult = await staticScopeAndExports();
  const attemptE = await runGovernedAttempt(
    { category: 'synthetic_validator', gate: 'r20_commit3_static_scope_and_exports', cycle: 'commit3', ordinal: 1, controlling: true, disposition: 'controlling_static_scope', command: 'node commit3 static-scope' },
    async () => ({
      status: eResult.allPassed ? 'completed' : 'technical_failure',
      disposition: eResult.allPassed ? 'controlling_static_scope' : 'technical_failure',
      exitCode: eResult.allPassed ? 0 : 1,
      stdout: JSON.stringify(eResult, null, 2), stderr: '',
      resultFiles: { 'STATIC_SCOPE_RESULT.json': JSON.stringify(eResult, null, 2) + '\n' },
      command: 'node', commandArgs: ['commit3-validators.mjs', '--static-scope'],
    }));

  // ── Attempt F: focused unit suite ──
  const fResult = runNodeTest();
  const attemptF = await runGovernedAttempt(
    { category: 'focused_suite', gate: 'r20_commit3_analyzer_focused_suite', cycle: 'commit3', ordinal: 1, controlling: true, disposition: 'controlling_focused_suite', command: 'node --test tests/phase-10a14-r20' },
    async () => ({
      status: fResult.fail === 0 && fResult.exitCode === 0 ? 'completed' : 'technical_failure',
      disposition: fResult.fail === 0 && fResult.exitCode === 0 ? 'controlling_focused_suite' : 'development_failure',
      exitCode: fResult.exitCode,
      stdout: fResult.stdout, stderr: '',
      resultFiles: { 'FOCUSED_SUITE_TAP.txt': fResult.stdout, 'FOCUSED_SUITE_SUMMARY.json': JSON.stringify({ tests: fResult.tests, pass: fResult.pass, fail: fResult.fail, exitCode: fResult.exitCode, testFiles: TEST_FILES }, null, 2) + '\n' },
      command: 'node', commandArgs: ['--test', ...TEST_FILES],
    }));

  // ── Attempt G: determinism & serialization ──
  const gResult = await determinismAndSerialization();
  const attemptG = await runGovernedAttempt(
    { category: 'synthetic_validator', gate: 'r20_commit3_determinism_and_serialization', cycle: 'commit3', ordinal: 1, controlling: true, disposition: 'controlling_determinism', command: 'node commit3 determinism' },
    async () => ({
      status: gResult.allPassed ? 'completed' : 'technical_failure',
      disposition: gResult.allPassed ? 'controlling_determinism' : 'technical_failure',
      exitCode: gResult.allPassed ? 0 : 1,
      stdout: JSON.stringify(gResult, null, 2), stderr: '',
      resultFiles: { 'DETERMINISM_RESULT.json': JSON.stringify(gResult, null, 2) + '\n' },
      command: 'node', commandArgs: ['commit3-validators.mjs', '--determinism'],
    }));

  // ── Attempt H: evidence completeness (after E/F/G registered) ──
  const attemptH = await runGovernedAttempt(
    { category: 'synthetic_validator', gate: 'r20_commit3_evidence_completeness', cycle: 'commit3', ordinal: 1, controlling: true, disposition: 'controlling_completeness', command: 'node commit3 completeness' },
    async () => {
      const h = evidenceCompleteness();
      return {
        status: h.allPassed ? 'completed' : 'technical_failure',
        disposition: h.allPassed ? 'controlling_completeness' : 'technical_failure',
        exitCode: h.allPassed ? 0 : 1,
        stdout: JSON.stringify(h, null, 2), stderr: '',
        resultFiles: { 'COMMIT3_COMPLETENESS_RESULT.json': JSON.stringify(h, null, 2) + '\n' },
        command: 'node', commandArgs: ['commit3-validators.mjs', '--completeness'],
      };
    });

  // ── Top-level COMMIT 3 result artifacts ──
  write('COMMIT_3_TEST_RESULT.json', {
    task: 'PHASE-10A14-R20-COMMIT-3', unit: 'focused_suite',
    sourceAttemptId: attemptF.attemptId,
    testFiles: TEST_FILES,
    tests: fResult.tests, passed: fResult.pass, failed: fResult.fail, exitCode: fResult.exitCode,
  });
  write('COMMIT_3_DETERMINISM_RESULT.json', { task: 'PHASE-10A14-R20-COMMIT-3', sourceAttemptId: attemptG.attemptId, ...gResult });
  write('COMMIT_3_IMPLEMENTATION_CONTRACT.json', {
    task: 'PHASE-10A14-R20-COMMIT-3', unit: 'implementation_contract',
    analyzerFile: 'services/philippine-tax-intent-analyzer.js',
    exports: ['TAX_BOUNDARY_DECISIONS', 'TAX_BOUNDARY_REASON_CODES', 'TAX_RELATION_TYPES', 'TAX_BOUNDARY_SPEECH_ACTS', 'normalizeTaxBoundaryText', 'segmentTaxBoundaryClauses', 'analyzePhilippineTaxIntent', 'decideTaxBoundaryFromEvidence', 'serializeTaxBoundaryEvidence'],
    schemaFields: 19, relationTypes: 12, decisions: 3, reasonCodes: 11, speechActs: 5,
    staticScopeResult: eResult,
    integration: 'NONE — analyzer not wired into detectPhilippineTaxBoundary (deferred to COMMIT 5).',
  });
  write('COMMIT_3_RUNTIME_SCOPE_IDENTITY.json', {
    ...captureRuntimeIdentity(),
    environmentFingerprint: captureEnvironmentFingerprint(),
    legacyBoundaryFilesUnchanged: {
      'services/philippine-tax-domain-boundary.js': gitObject('HEAD:services/philippine-tax-domain-boundary.js') === '97986ed7c9a05f74db44b60c8766f9ab45b96a7d',
      'services/philippine-tax-boundary-patterns.js': gitObject('HEAD:services/philippine-tax-boundary-patterns.js') === 'd98e63992bfa7d4b21acea7bb03fa62ffbf9827a',
    },
    capturedAt: new Date().toISOString(),
  });

  // ── Cumulative registry (append COMMIT 3) + snapshot ──
  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  write('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  write('COMMIT_3_CUMULATIVE_REGISTRY_SNAPSHOT.json', {
    snapshotAt: new Date().toISOString(), cycle: 'commit3',
    summary: registry.summary,
    attemptIds: allRecords.map((r) => r.attemptId),
  });
  const recon = reconcileCompleteness(allRecords);
  write('COMMIT_3_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  write('CANONICAL_COUNT_SUMMARY.json', {
    task: 'PHASE-10A14-R20', cumulativeThrough: 'commit3',
    registrySummary: registry.summary,
    commit3: {
      focusedSuite: { tests: fResult.tests, passed: fResult.pass, failed: fResult.fail },
      determinism: { byteMismatches: gResult.byteMismatches, mutationFailures: gResult.mutationFailures },
      staticScope: { passed: eResult.passed, total: eResult.total },
    },
  });

  return {
    attempts: { E: attemptE.attemptId, F: attemptF.attemptId, G: attemptG.attemptId, H: attemptH.attemptId },
    tests: { total: fResult.tests, pass: fResult.pass, fail: fResult.fail },
    determinism: { byteMismatches: gResult.byteMismatches, mutationFailures: gResult.mutationFailures },
    staticScope: { passed: eResult.passed, total: eResult.total, allPassed: eResult.allPassed },
    registry: registry.summary,
    reconciliation: recon,
  };
}

main().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
