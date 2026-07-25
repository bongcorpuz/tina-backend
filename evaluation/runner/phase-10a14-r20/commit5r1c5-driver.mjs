// PHASE-10A14-R20 COMMIT 5R1-C5 — incomplete-evidence driver (decision-lane).
// Registers iteration 02 (ACCEPTED best decision candidate, contentless target-completeness)
// and iteration 03 (REJECTED bare-tax-topic ALLOW, +false-allows) as governed attempts with
// snapshots/patches/lane scores, then restores the live runtime to the committed baseline.
// Decision Layer Lock NOT achieved. No relation/reason lane. No integration, no freeze.

import { writeFileSync, mkdirSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { decLane } from './commit5r1c5-declane.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, gitObject, sha256File } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SCRATCH = 'C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad';
const ACCEPTED = `${SCRATCH}/c5_iter02_accepted.js`;
const BASE = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_development_iteration_02-commit5r1c4-dev-02-ord01-2026-07-25T10-45-21-760Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

// Reconstruct the rejected iter-03 candidate = accepted iter-02 + the bare-tax-topic rule.
const REJECT_TMP = `${SCRATCH}/c5_iter03_rejected.js`;
(function buildRejected() {
  let s = readFileSync(ACCEPTED, 'utf8');
  const anchor = '  // 9. Lone ambiguous acronym.\n  if (acr.some((a) => a.ambiguous)) return decide(\'CLARIFY\', \'ambiguous_tax_acronym\', 0.55);';
  const insert = [
    '  // 8b. [REJECTED iteration] Bare tax-content phrase -> ALLOW. Over-allowed 8 non-tax',
    '  // rows containing a clear-tax term (net decision regression 305->311, +false-allows).',
    '  const loNorm = lower(evidence.normalizedText || \'\');',
    '  const isBareTaxTopic = clearTaxContent(loNorm)',
    '    && !/\\bfor (?:item|scenario|situation|case) \\d+/.test(loNorm)',
    '    && !/\\?\\s*$/.test((evidence.normalizedText || \'\').trim())',
    '    && (evidence.ordinaryObjects || []).length === 0',
    '    && !requestsNonTax && !namesLabel && !expandsNonTax && !quotesTerm;',
    '  if (isBareTaxTopic) return decide(\'ALLOW\', \'explicit_tax_task_relation\', 0.75);',
    '  // 9. Lone ambiguous acronym.',
    '  if (acr.some((a) => a.ambiguous)) return decide(\'CLARIFY\', \'ambiguous_tax_acronym\', 0.55);',
  ].join('\n');
  s = s.replace(anchor, insert);
  writeFileSync(REJECT_TMP, s);
})();

async function full(path) {
  cpSync(path, ANALYZER_LIVE);
  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  const { counts, failures } = scoreRows(loadR3Rows(), classify);
  const lane = await decLane();
  return { counts, failures, lane };
}
function patch(from, to) { try { return execFileSync('git', ['diff', '--no-index', '--', from, to], { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } }

async function reg({ gate, cycle, disposition, src, base, hypothesis, accepted, rationale, result }) {
  const sha = sha256File(src);
  return runGovernedAttempt(
    { category: 'domain_campaign', gate, cycle, ordinal: 1, controlling: true, disposition },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(src, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: `${disposition}. ${hypothesis}. activeLane=decision. NOT applied to services/ (INCOMPLETE).`, analyzerSha256: sha, patchBaseSnapshot: base.split('/').slice(-1)[0], oracleVersion: 'R3' }, null, 2) + '\n');
      writeFileSync(join(snap, 'PATCH_FROM_BASE.patch'), patch(base, src));
      return {
        status: 'completed', disposition, exitCode: 0,
        stdout: JSON.stringify({ overall: result.counts.canonicalPassed, decisionFailed: result.lane.decisionFailed }, null, 2), stderr: '',
        resultFiles: {
          'FULL_R3_RESULT.json': JSON.stringify({ counts: result.counts, failureCount: result.failures.length }, null, 2) + '\n',
          'DECISION_LANE.json': JSON.stringify({ decisionPassed: result.lane.decisionPassed, decisionFailed: result.lane.decisionFailed, falseAllows: result.lane.falseAllows, falseRefusals: result.lane.falseRefusals, clarifyMismatches: result.lane.clarifyMismatches, decByDir: result.lane.decByDir, closedControls: result.lane.closedControls, overallPassed: result.lane.overallPassed, relationFailed: result.lane.relationFailed, reasonFailed: result.lane.reasonFailed }, null, 2) + '\n',
          'ACCEPTANCE.json': JSON.stringify({ accepted, rationale, architecturalHypothesis: hypothesis, activeLane: 'decision' }, null, 2) + '\n',
        },
        command: 'node', commandArgs: ['commit5r1c5-driver.mjs', `--${cycle}`],
      };
    });
}

async function main() {
  writeR('COMMIT_5R1C5_R3_IDENTITY.json', { path: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', sha256: sha256File(`${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json`), expected: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54', changed: false, rows: loadR3Rows().length });

  const acc = await full(ACCEPTED);
  const rej = await full(REJECT_TMP);

  const a2 = await reg({ gate: 'r20_commit5r1c5_development_iteration_02', cycle: 'commit5r1c5-dev-02', disposition: 'development_iteration_accepted', src: ACCEPTED, base: BASE,
    hypothesis: 'Typed target-completeness (decision lane): a treatment-family relation over a CONTENTLESS bare pronoun/determiner tax-attribute (no concrete/resolved subject, no compliance procedure) -> no_tax_relation REFUSE. Relations left intact; compliance short-circuits, so the dev-03 reason regression is avoided',
    accepted: true, rationale: 'Decision failures 309->305; no closed-control regression (tax_compliance_task decision 108/108, acronym_homograph_control 200/200 preserved); false-refusals held at 143; overall 2955->2959. Accepted best decision base for C6.', result: acc });
  const a3 = await reg({ gate: 'r20_commit5r1c5_development_iteration_03', cycle: 'commit5r1c5-dev-03', disposition: 'development_iteration_rejected', src: REJECT_TMP, base: ACCEPTED,
    hypothesis: 'Bare tax-content phrase -> ALLOW before the CLARIFY fallback (for "RMC guidance", "RCIT", "OSD election")',
    accepted: false, rationale: 'REJECTED: net decision regression 305->311. The clearTaxContent anchor over-allowed 8 non-tax rows that merely contain a clear-tax term (REFUSE->ALLOW 99->107, false-allows +8), and did not fix the intended ALLOW->CLARIFY bare-phrase rows (clearTaxContent misses "RMC guidance"/"RCIT"). Preserved as diagnostic; the bare-tax-topic ALLOW needs a tighter structural anchor in C6.', result: rej });

  // Restore live runtime to committed baseline.
  execFileSync('git', ['-C', REPO, 'checkout', 'HEAD', '--', 'services/philippine-tax-intent-analyzer.js']);

  writeR('COMMIT_5R1C5_LAYER_SCORE_RECONCILIATION.json', {
    note: 'Lane scores derived from the same frozen R3 rows and governed classify output; no new oracle.',
    iterations: [
      { iterationId: 'dev-01-reconstructed-2955', activeLane: 'decision', decisionPassed: 3411, decisionFailed: 309, relationFailed: 250, reasonFailed: 764, overallPassed: 2955, overallFailed: 765, priorLocksPreserved: 'n/a', acceptedAsNextBase: 'base' },
      { iterationId: 'dev-02-accepted', activeLane: 'decision', decisionPassed: acc.lane.decisionPassed, decisionFailed: acc.lane.decisionFailed, relationFailed: acc.lane.relationFailed, reasonFailed: acc.lane.reasonFailed, overallPassed: acc.counts.canonicalPassed, overallFailed: 3720 - acc.counts.canonicalPassed, priorLocksPreserved: 'n/a (no lock achieved)', counterfactualPairsPassed: 'see COMMIT_5R1C5_DECISION_COUNTERFACTUAL_PAIRS.json', closedControlsPreserved: true, acceptedAsNextBase: true },
      { iterationId: 'dev-03-rejected', activeLane: 'decision', decisionPassed: rej.lane.decisionPassed, decisionFailed: rej.lane.decisionFailed, relationFailed: rej.lane.relationFailed, reasonFailed: rej.lane.reasonFailed, overallPassed: rej.counts.canonicalPassed, overallFailed: 3720 - rej.counts.canonicalPassed, priorLocksPreserved: 'n/a', closedControlsPreserved: true, acceptedAsNextBase: false },
    ],
  });

  writeR('COMMIT_5R1C5_DECISION_LAYER_NOT_LOCKED.json', {
    decisionLayerLock: 'NOT ACHIEVED',
    bestAcceptedDecision: `${acc.lane.decisionPassed}/3720`,
    remainingDecisionMismatches: acc.lane.decisionFailed,
    decByDir: acc.lane.decByDir,
    closedControlsAtDecision: { tax_compliance_task: `${acc.lane.closedControls.tax_compliance_task.decisionCorrect}/${acc.lane.closedControls.tax_compliance_task.total}`, acronym_homograph_control: `${acc.lane.closedControls.acronym_homograph_control.decisionCorrect}/${acc.lane.closedControls.acronym_homograph_control.total}` },
    remainingClusters: 'CONTEXTUAL_ACRONYM_MISCLASSIFIED (103), TAX_RELATION_MISSED_ON_CONCRETE_TARGET (58), QUOTATION_SCOPE (27), NON_TAX_ACTION_MISREAD_AS_TAX (26), plus smaller clusters — see COMMIT_5R1C5_DECISION_FAILURE_PARTITION.json (partition of the reconstructed base; dev-02 shifted counts slightly).',
    reason: 'Remaining clusters carry false-allow/false-refusal trade risk (bare tax-topic ALLOW over-allows non-tax rows; concrete-tax anchoring vs contentless suppression interact). Exact 0 not reached within the decision-lane budget used.',
    relationLayerLock: 'NOT STARTED', reasonLayerLock: 'NOT STARTED', standaloneClosure: 'NOT ACHIEVED', productionIntegration: 'NOT PERFORMED', runtimeFreeze: 'NOT PERFORMED',
  });

  writeR('COMMIT_5R1C5_ITERATION_ACCEPTANCE_REGISTER.json', {
    iterations: [
      { iterationId: 'dev-02', attemptId: a2.attemptId, accepted: true, activeLane: 'decision', decisionFailedDelta: acc.lane.decisionFailed - 309, closedControlRegression: false, taxComplianceDecision: '108/108', acronymHomographDecision: '200/200', falseAllowDelta: acc.counts.materialFalseAllows - 113, falseRefusalDelta: acc.counts.materialFalseRefusals - 143, becameNextBase: true },
      { iterationId: 'dev-03', attemptId: a3.attemptId, accepted: false, activeLane: 'decision', decisionFailedDelta: rej.lane.decisionFailed - acc.lane.decisionFailed, closedControlRegression: false, falseAllowDelta: rej.counts.materialFalseAllows - acc.counts.materialFalseAllows, becameNextBase: false, rejectionReason: 'net decision regression + false-allows' },
    ],
  });

  writeR('COMMIT_5R1C5_DEVELOPMENT_ITERATION_REGISTER.json', {
    iterations: [
      { iterationId: 'dev-01-reconstructed-2955', governedScore: '2955/3720', decisionScore: '3411/3720', disposition: 'development_iteration_reconstructed' },
      { iterationId: 'dev-02', attemptId: a2.attemptId, governedScore: `${acc.counts.canonicalPassed}/3720`, decisionScore: `${acc.lane.decisionPassed}/3720`, disposition: 'development_iteration_accepted', functionsChanged: ['classifyTargetCompleteness (new)', 'decideTaxBoundaryFromEvidence (rule 0b contentless)', 'analyzePhilippineTaxIntent (targetCompleteness wiring)'], newRegressions: 'none (decision-safe; reason/relation unchanged)', resolvedClusters: 'CONTENTLESS_REFERENT decision rows (REFUSE->ALLOW 103->99)' },
      { iterationId: 'dev-03', attemptId: a3.attemptId, governedScore: `${rej.counts.canonicalPassed}/3720`, decisionScore: `${rej.lane.decisionPassed}/3720`, disposition: 'development_iteration_rejected', functionsChanged: ['decideTaxBoundaryFromEvidence (rule 8b bare-tax-topic)'], newRegressions: 'REFUSE->ALLOW +8 false-allows', resolvedClusters: 'none net' },
    ],
  });

  writeR('COMMIT_5R1C5_DEVELOPMENT_FAILURE_MATRIX.json', {
    bestAcceptedBase: 'dev-02 (2959)', total: 3720, overallPassed: acc.counts.canonicalPassed, overallFailed: 3720 - acc.counts.canonicalPassed,
    decisionMismatches: acc.counts.decisionMismatches, relationMismatches: acc.counts.relationMismatches, reasonMismatches: acc.counts.reasonMismatches,
    materialFalseAllows: acc.counts.materialFalseAllows, materialFalseRefusals: acc.counts.materialFalseRefusals, clarifyMismatches: acc.counts.clarifyMismatches,
    bySourceSet: acc.counts.bySourceSet, byCategory: acc.counts.byCategory, metamorphicGroupsPassed: acc.counts.metamorphicGroupsPassed, metamorphicGroupsTotal: acc.counts.metamorphicGroupsTotal,
  });

  writeR('COMMIT_5R1C5_DECISION.json', {
    decision: 'COMMIT_5R1C5_INCOMPLETE_DECISION_LAYER_REMEDIATION_NOT_CLOSED',
    r3Sha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54', r3Edited: false,
    reconstructedAccepted2955R3: '2955/3720', bestOverallGovernedR3: `${acc.counts.canonicalPassed}/3720`, bestDecisionLayerResult: `${acc.lane.decisionPassed}/3720`, remainingDecisionMismatches: acc.lane.decisionFailed,
    decisionLayerLock: 'NOT ACHIEVED', relationLayerLock: 'NOT STARTED', reasonLayerLock: 'NOT STARTED', standaloneClosure: 'NOT ACHIEVED',
    runtimeIntegrated: false, runtimeFrozen: false, runtimeMutable: true, analyzerRestoredToBaseline: true, analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    geminiAvailable: false, substituteChallengeUsed: true, runtimeExceptionsCreated: false,
    next: 'PHASE-10A14-R20 COMMIT 5R1-C6: DECISION-CONFUSION / LAYER-LOCKED REMEDIATION CONTINUATION 6 AGAINST R3 (resume from the accepted dev-02 2959 candidate).',
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1c5-incomplete';
  registry.runtimeClosure = false;
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1C5_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1C5_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1c5-incomplete', runtimeClosure: false, summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5r1c5-incomplete', runtimeClosure: false, registrySummary: registry.summary, commit5r1c5: { decision: 'INCOMPLETE_DECISION_LAYER_NOT_CLOSED', reconstructedAccepted2955R3: '2955/3720', bestOverallGovernedR3: `${acc.counts.canonicalPassed}/3720`, bestDecisionLayerResult: `${acc.lane.decisionPassed}/3720`, remainingDecisionMismatches: acc.lane.decisionFailed, decisionLayerLock: 'NOT ACHIEVED', runtimeFrozen: false, analyzerModified: false, r3Edited: false } });

  return { a2: a2.attemptId, a3: a3.attemptId, accOverall: acc.counts.canonicalPassed, accDec: acc.lane.decisionPassed, rejDec: rej.lane.decisionPassed, registry: registry.summary, recon };
}
main().then((r) => console.log(JSON.stringify({ dev02: r.a2, dev03: r.a3, acceptedOverall: `${r.accOverall}/3720`, acceptedDecision: `${r.accDec}/3720`, rejectedDecision: `${r.rejDec}/3720`, registry: r.registry, recon: r.recon }, null, 2))).catch((e) => { console.error(e); process.exit(1); });
