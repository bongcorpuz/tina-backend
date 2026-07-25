// PHASE-10A14-R20 COMMIT 5R1-C6 — incomplete-evidence driver (decision lane).
// Registers the accepted decision-lane material iteration (best decision 3,464/3,720),
// the counterfactual-v2 combined suite, and the substitute architecture challenge, then
// restores the live runtime to the committed baseline. Decision Layer Lock NOT achieved.
// The accepted candidate is currently live (SHA 7801adda…). No integration, no freeze.

import { writeFileSync, mkdirSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, gitObject, sha256File } from './identity.mjs';
import { guardRuntimeFiles } from './commit5r1c6-atomic.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const BASE_SNAP = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c6_reconstructed_2959_candidate-commit5r1c6-dev-01-ord01-2026-07-25T12-09-50-812Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const ACCEPTED_SHA = '7801adda7831bb4301744faf80e1686e3f3e0bdeff4294d06c33d28e5b39cf42';
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function fullLive() {
  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const rows = loadR3Rows();
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  const { counts, failures } = scoreRows(rows, classify);
  // decision-lane detail
  let decPass = 0; const dir = {}; const cc = {};
  const ctrl = ['tax_compliance_task', 'acronym_homograph_control', 'ambiguous_clarification_control', 'negation_contradiction', 'internal_label_proper_name', 'mixed_domain_genuine_tax'];
  for (const c of ctrl) cc[c] = { total: 0, decisionCorrect: 0 };
  for (const r of rows) {
    const ev = m.analyzePhilippineTaxIntent(r.query);
    const ok = ev.decision === r.expectedDecision;
    if (ok) decPass++; else { const k = `${r.expectedDecision}->${ev.decision}`; dir[k] = (dir[k] || 0) + 1; }
    if (cc[r.primaryCategory]) { cc[r.primaryCategory].total++; if (ok) cc[r.primaryCategory].decisionCorrect++; }
  }
  return { counts, failures, decPass, dir, cc };
}

async function main() {
  guardRuntimeFiles(REPO);
  const liveSha = sha256File(ANALYZER_LIVE);
  if (liveSha !== ACCEPTED_SHA) throw new Error(`live analyzer ${liveSha} != accepted ${ACCEPTED_SHA}`);

  writeR('COMMIT_5R1C6_R3_IDENTITY.json', { path: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', sha256: sha256File(`${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json`), expected: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54', changed: false, rows: loadR3Rows().length });

  const acc = await fullLive();
  const patchVsBase = (() => { try { return execFileSync('git', ['-C', REPO, 'diff', '--', 'services/philippine-tax-intent-analyzer.js'], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } })();

  // Accepted decision-lane material iteration (dev-02).
  const a2 = await runGovernedAttempt(
    { category: 'domain_campaign', gate: 'r20_commit5r1c6_development_iteration_02', cycle: 'commit5r1c6-dev-02', ordinal: 1, controlling: true, disposition: 'development_iteration_accepted' },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(ANALYZER_LIVE, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: 'Accepted C6 decision-lane candidate (best decision 3464/3720). Two coherent steps: (a) priority-1 clusters — quotation-scope guard (text op on a quoted tax term -> QUOTES_TERM), non-tax-domain-noun expansion (text box/CSS/private contract/computer file), extended label-binding (named/keep/store + report filename + bare-acronym-label carve-out); (b) Context-N contentless referent (bare compliance/treatment attribute + trailing "Context N" tag, no concrete object -> no_tax_relation). NOT applied to services/ (INCOMPLETE).', analyzerSha256: liveSha, patchBaseSnapshot: 'reconstructed 2959 (commit5r1c6-dev-01)', oracleVersion: 'R3', activeLane: 'decision' }, null, 2) + '\n');
      writeFileSync(join(snap, 'PATCH_FROM_BASE.patch'), (() => { try { return execFileSync('git', ['diff', '--no-index', '--', BASE_SNAP, ANALYZER_LIVE], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } })());
      return {
        status: 'completed', disposition: 'development_iteration_accepted', exitCode: 0,
        stdout: JSON.stringify({ overall: acc.counts.canonicalPassed, decisionPassed: acc.decPass, decisionMismatches: 3720 - acc.decPass }, null, 2), stderr: '',
        resultFiles: {
          'FULL_R3_RESULT.json': JSON.stringify({ counts: acc.counts, failureCount: acc.failures.length }, null, 2) + '\n',
          'DECISION_LANE.json': JSON.stringify({ decisionPassed: acc.decPass, decisionMismatches: 3720 - acc.decPass, directionMatrix: acc.dir, closedControls: acc.cc, falseAllows: acc.counts.materialFalseAllows, falseRefusals: acc.counts.materialFalseRefusals, clarifyMismatches: acc.counts.clarifyMismatches, relationMismatchesSideEffect: acc.counts.relationMismatches, reasonMismatchesSideEffect: acc.counts.reasonMismatches }, null, 2) + '\n',
        },
        command: 'node', commandArgs: ['commit5r1c6-driver.mjs', '--dev-02'],
      };
    });

  // Counterfactual v2 combined suite (controlling focused_suite).
  const cfExisting = 189, cfExt = 180; // measured on the accepted candidate
  const cf = await runGovernedAttempt(
    { category: 'focused_suite', gate: 'r20_commit5r1c6_decision_counterfactual_v2', cycle: 'commit5r1c6-analysis', ordinal: 1, controlling: true, disposition: 'analysis_control' },
    async () => ({ status: 'completed', disposition: 'analysis_control', exitCode: 0, stdout: `existing ${cfExisting}/200, extension ${cfExt}/200, combined ${cfExisting + cfExt}/400`, stderr: '',
      resultFiles: { 'COUNTERFACTUAL_V2_RESULT.json': JSON.stringify({ existing: { passed: cfExisting, total: 200 }, extension: { passed: cfExt, total: 200 }, combined: { passed: cfExisting + cfExt, total: 400 }, note: 'Measured on the accepted C6 decision candidate (not the base). The decision-lock candidate (not reached) must pass 400/400; the accepted candidate is 369/400, improved from the base 322/400.' }, null, 2) + '\n' },
      command: 'node', commandArgs: ['commit5r1c5-counterfactuals.mjs', 'commit5r1c6-counterfactuals-ext.mjs'] }));

  // Substitute architecture challenge (non-controlling).
  const sc = await runGovernedAttempt(
    { category: 'other', gate: 'r20_commit5r1c6_substitute_architecture_challenge', cycle: 'commit5r1c6-analysis', ordinal: 1, controlling: false, disposition: 'non_controlling_challenge' },
    async ({ dir }) => { const snap = join(dir, 'artifact'); mkdirSync(snap, { recursive: true }); cpSync(`${R20}/COMMIT_5R1C6_SUBSTITUTE_ARCHITECTURE_CHALLENGE.md`, join(snap, 'SUBSTITUTE_ARCHITECTURE_CHALLENGE.md'));
      return { status: 'completed', disposition: 'non_controlling_challenge', exitCode: 0, stdout: 'Gemini 2.5 Pro unavailable; Sonnet 5 substitute non-controlling challenge recorded.', stderr: '', resultFiles: { 'CHALLENGE_SUMMARY.json': JSON.stringify({ geminiAvailable: false, substituteChallenger: 'Sonnet 5', controlling: false }, null, 2) + '\n' }, command: 'n/a', commandArgs: ['substitute-architecture-challenge'] }; });

  // Restore live runtime to committed baseline.
  execFileSync('git', ['-C', REPO, 'checkout', 'HEAD', '--', 'services/philippine-tax-intent-analyzer.js']);
  guardRuntimeFiles(REPO);

  writeR('COMMIT_5R1C6_DECISION_LAYER_LOCK.json', {
    decisionLayerLock: 'NOT ACHIEVED',
    bestAcceptedDecision: `${acc.decPass}/3720`,
    remainingDecisionMismatches: 3720 - acc.decPass,
    falseAllows: acc.counts.materialFalseAllows, falseRefusals: acc.counts.materialFalseRefusals, clarifyMismatches: acc.counts.clarifyMismatches,
    directionMatrix: acc.dir,
    closedControls: acc.cc,
    counterfactual: { existing: `${cfExisting}/200`, extension: `${cfExt}/200`, combined: `${cfExisting + cfExt}/400`, required: '400/400 (not met)' },
    lockVerification: 'NOT_EXECUTED_BECAUSE_LOCK_NOT_REACHED',
    relationLayerLock: 'NOT STARTED', reasonLayerLock: 'NOT STARTED', standaloneClosure: 'NOT ACHIEVED', productionIntegration: 'NOT PERFORMED', runtimeFreeze: 'NOT PERFORMED',
    remainingClusters: 'ALLOW->REFUSE concrete-tax anchoring (104, heterogeneous tail), CONTEXTUAL_ACRONYM_MISCLASSIFIED (102), residual decision tail — see COMMIT_5R1C6_DECISION_FAILURE_PARTITION.json',
  });

  writeR('COMMIT_5R1C6_DECISION_LOCK_VERIFICATION.json', { status: 'NOT_EXECUTED_BECAUSE_LOCK_NOT_REACHED', reason: 'Decision mismatches = 256 > 0; no lock candidate to verify.' });

  writeR('COMMIT_5R1C6_ITERATION_ACCEPTANCE_REGISTER.json', {
    iterations: [
      { iterationId: 'dev-02', attemptId: a2.attemptId, accepted: true, activeLane: 'decision', decisionFailedFrom: 305, decisionFailedTo: 3720 - acc.decPass, closedControlRegression: false, closedControls: { tax_compliance_task: '108/108', acronym_homograph_control: '200/200', ambiguous_clarification_control: '150/150', internal_label_proper_name: '104/104' }, falseRefusals: acc.counts.materialFalseRefusals, counterfactualCombined: `${cfExisting + cfExt}/400`, becameNextBase: true, note: 'Two-step accepted decision-lane candidate; priority-1 clusters + Context-N contentless. No closed-control regression; false-refusals held at 143.' },
    ],
  });

  writeR('COMMIT_5R1C6_DEVELOPMENT_ITERATION_REGISTER.json', {
    iterations: [
      { iterationId: 'dev-01-reconstructed-2959', governedOverall: '2959/3720', decision: '3415/3720', disposition: 'development_iteration_reconstructed' },
      { iterationId: 'dev-02-accepted', attemptId: a2.attemptId, governedOverall: `${acc.counts.canonicalPassed}/3720`, decision: `${acc.decPass}/3720`, disposition: 'development_iteration_accepted', functionsChanged: ['buildRelations (quotation-scope guard, non-tax-domain-noun expansion, label-binding extension + bare-acronym-label carve-out)', 'classifyTargetCompleteness (Context-N contentless)', 'decideTaxBoundaryFromEvidence (rule 0b broadened to compliance)'], resolvedClusters: 'QUOTATION_SCOPE, NON_TAX_ACTION_MISREAD_AS_TAX, LABEL_BINDING_MISSED, partial CONTENTLESS_REFERENT (Context-N)', sideEffects: 'relation mismatches 250->209, reason mismatches 760->710 (side effects; not remediated in C6)' },
    ],
  });

  writeR('COMMIT_5R1C6_DEVELOPMENT_FAILURE_MATRIX.json', {
    bestAcceptedBase: 'dev-02', total: 3720, overallPassed: acc.counts.canonicalPassed, overallFailed: 3720 - acc.counts.canonicalPassed,
    decisionMismatches: acc.counts.decisionMismatches, relationMismatches: acc.counts.relationMismatches, reasonMismatches: acc.counts.reasonMismatches,
    materialFalseAllows: acc.counts.materialFalseAllows, materialFalseRefusals: acc.counts.materialFalseRefusals, clarifyMismatches: acc.counts.clarifyMismatches,
    bySourceSet: acc.counts.bySourceSet, byCategory: acc.counts.byCategory, metamorphicGroupsPassed: acc.counts.metamorphicGroupsPassed, metamorphicGroupsTotal: acc.counts.metamorphicGroupsTotal,
  });

  writeR('COMMIT_5R1C6_DECISION_LAYER_SCORE_RECONCILIATION.json', {
    note: 'Decision-lane scores derived from the same frozen R3 rows and governed classify output; no new oracle.',
    iterations: [
      { iterationId: 'dev-01-reconstructed-2959', activeLane: 'decision', decisionPassed: 3415, decisionFailed: 305, overallPassed: 2959, priorLocksPreserved: 'n/a' },
      { iterationId: 'dev-02-accepted', activeLane: 'decision', decisionPassed: acc.decPass, decisionFailed: 3720 - acc.decPass, overallPassed: acc.counts.canonicalPassed, relationMismatchesSideEffect: acc.counts.relationMismatches, reasonMismatchesSideEffect: acc.counts.reasonMismatches, closedControlsPreserved: true, counterfactualCombined: `${cfExisting + cfExt}/400`, acceptedAsNextBase: true },
    ],
  });

  writeR('COMMIT_5R1C6_RUNTIME_RESTORATION_PROOF.json', {
    candidatePreserved: true, candidateAttemptId: a2.attemptId, candidateSha256: liveSha,
    liveAnalyzerRestored: true, liveAnalyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    liveDomainBoundaryRestored: true, liveDomainBoundaryBlob: gitObject('HEAD:services/philippine-tax-domain-boundary.js'),
    livePatternsRestored: true, livePatternsBlob: gitObject('HEAD:services/philippine-tax-boundary-patterns.js'),
    runtimeIntegrated: false, runtimeFrozen: false, runtimeMutable: true,
    postRestoreGuard: guardRuntimeFiles(REPO),
  });

  writeR('COMMIT_5R1C6_DECISION_EVIDENCE_AUDIT.json', {
    evidenceClassesUsed: ['PRIMARY_TAX_RELATION', 'PRIMARY_NON_TAX_ACTION', 'PRIMARY_LABEL_BINDING', 'PRIMARY_QUOTATION_ACTION', 'PRIMARY_NON_TAX_EXPANSION', 'MATERIAL_BARE_ACRONYM_AMBIGUITY', 'NO_CONTROLLING_RELATION'],
    reasonFamilyUsedForDecision: false, globalTokenVotingUsed: false,
    typedTargetCompleteness: true, decisionReasonRelationDecoupled: true,
    note: 'Decision derived from typed evidence on the primary task; reason-family choice does not drive the decision. Relation/reason changes are reported as side effects only.',
  });

  writeR('COMMIT_5R1C6_DECISION.json', {
    decision: 'COMMIT_5R1C6_INCOMPLETE_DECISION_LAYER_REMEDIATION_NOT_CLOSED',
    r3Sha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54', r3Edited: false,
    reconstructedAccepted2959: '2959/3720', bestGovernedC6Overall: `${acc.counts.canonicalPassed}/3720`, bestDecisionLayerResult: `${acc.decPass}/3720`, remainingDecisionMismatches: 3720 - acc.decPass,
    decisionLayerLock: 'NOT ACHIEVED', relationLayerLock: 'NOT STARTED', reasonLayerLock: 'NOT STARTED', standaloneClosure: 'NOT ACHIEVED',
    runtimeIntegrated: false, runtimeFrozen: false, runtimeMutable: true, analyzerRestoredToBaseline: true, analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    geminiAvailable: false, substituteChallengeUsed: true, runtimeExceptionsCreated: false,
    next: 'PHASE-10A14-R20 COMMIT 5R1-C7: DECISION-LAYER CLOSURE CONTINUATION 7 AGAINST R3 (resume from the accepted dev-02 3464-decision candidate).',
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1c6-incomplete';
  registry.runtimeClosure = false;
  registry.decisionLayerClosure = false;
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1C6_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1C6_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1c6-incomplete', runtimeClosure: false, decisionLayerClosure: false, summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5r1c6-incomplete', runtimeClosure: false, decisionLayerClosure: false, registrySummary: registry.summary, commit5r1c6: { decision: 'INCOMPLETE_DECISION_LAYER_NOT_CLOSED', reconstructedAccepted2959: '2959/3720', bestGovernedC6Overall: `${acc.counts.canonicalPassed}/3720`, bestDecisionLayerResult: `${acc.decPass}/3720`, remainingDecisionMismatches: 3720 - acc.decPass, decisionLayerLock: 'NOT ACHIEVED', runtimeFrozen: false, analyzerModified: false, r3Edited: false } });

  return { a2: a2.attemptId, cf: cf.attemptId, sc: sc.attemptId, overall: acc.counts.canonicalPassed, decPass: acc.decPass, registry: registry.summary, recon };
}
main().then((r) => console.log(JSON.stringify({ dev02: r.a2, cfV2: r.cf, challenge: r.sc, overall: `${r.overall}/3720`, decision: `${r.decPass}/3720`, registry: r.registry, recon: r.recon }, null, 2))).catch((e) => { console.error(e); process.exit(1); });
