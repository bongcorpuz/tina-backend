// PHASE-10A14-R20 COMMIT 5R1-C4 — incomplete-evidence driver. Registers the two
// material decision-lane iterations (dev-02 accepted best base 2955; dev-03 rejected
// closed-category regression, best decisions 3439) as governed attempts with runtime
// snapshots, patches and lane scores, then restores the live runtime to the committed
// COMMIT 3 baseline. Decision lock NOT achieved. No integration, no freeze, no R3 edit.
//
// Note on iteration ordinals: dev-01 = reconstructed 2870 (already registered by
// commit5r1c4-reconstruct.mjs). This driver registers the two NEW material iterations
// as development_iteration_02 (accepted, 2955) and development_iteration_03 (rejected,
// dec-3439). The scratch file c4_dev03_2955.js is the accepted base for C5; the scratch
// file c4_dev04_dec281.js is the rejected 3439-decision candidate.

import { writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runGovernedAttempt } from './run-governed-attempt.mjs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { laneScore } from './commit5r1c4-lanes.mjs';
import { loadAttemptRecords, buildRegistry, reconcileCompleteness } from './registry.mjs';
import { REPO, gitObject, sha256File } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const SCRATCH = 'C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad';
const ACCEPTED = `${SCRATCH}/c4_dev03_2955.js`;      // decision 3411, overall 2955, accepted
const REJECTED = `${SCRATCH}/c4_dev04_dec281.js`;    // decision 3439, overall 2944, rejected (closed-cat regression)
const BASELINE = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_reconstructed_2870_candidate-commit5r1c4-dev-01-ord01-2026-07-25T10-29-12-965Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const writeR = (n, o) => writeFileSync(join(R20, n), JSON.stringify(o, null, 2) + '\n');

async function full(path) {
  cpSync(path, ANALYZER_LIVE);
  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  const { counts, failures } = scoreRows(loadR3Rows(), classify);
  const lane = await laneScore();
  return { counts, failures, lane };
}

function patch(fromPath, toPath) {
  try { return execFileSync('git', ['diff', '--no-index', '--', fromPath, toPath], { encoding: 'utf8' }); }
  catch (e) { return (e.stdout || '') + ''; }
}

async function registerIteration({ gate, cycle, disposition, srcPath, basePath, hypothesis, result, accepted, acceptanceRationale }) {
  const sha = sha256File(srcPath);
  return runGovernedAttempt(
    { category: 'domain_campaign', gate, cycle, ordinal: 1, controlling: true, disposition },
    async ({ dir }) => {
      const snap = join(dir, 'runtime-snapshot'); mkdirSync(snap, { recursive: true });
      cpSync(srcPath, join(snap, 'philippine-tax-intent-analyzer.js'));
      for (const f of ['philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']) cpSync(`${REPO}/services/${f}`, join(snap, f));
      writeFileSync(join(snap, 'RUNTIME_IDENTITY.json'), JSON.stringify({ note: `${disposition}. ${hypothesis}. NOT applied to services/ (unit INCOMPLETE).`, analyzerSha256: sha, patchBaseSnapshot: basePath.split('/').slice(-1)[0], oracleVersion: 'R3', activeLayer: 'decision' }, null, 2) + '\n');
      writeFileSync(join(snap, 'PATCH_FROM_BASE.patch'), patch(basePath, srcPath));
      return {
        status: 'completed', disposition, exitCode: 0,
        stdout: JSON.stringify({ overall: result.counts.canonicalPassed, decisionPassed: result.lane.decisionPassed, decisionFailed: result.lane.decisionFailed }, null, 2), stderr: '',
        resultFiles: {
          'FULL_R3_RESULT.json': JSON.stringify({ counts: result.counts, failureCount: result.failures.length }, null, 2) + '\n',
          'LANE_SCORES.json': JSON.stringify({ decisionPassed: result.lane.decisionPassed, decisionFailed: result.lane.decisionFailed, relationFailed: result.lane.relationFailed, reasonFailed: result.lane.reasonFailed, decByDir: result.lane.decByDir, overall: result.counts.canonicalPassed }, null, 2) + '\n',
          'ACCEPTANCE.json': JSON.stringify({ accepted, acceptanceRationale, architecturalHypothesis: hypothesis, activeLayer: 'decision' }, null, 2) + '\n',
        },
        command: 'node', commandArgs: ['commit5r1c4-driver.mjs', `--${cycle}`],
      };
    });
}

async function main() {
  writeR('COMMIT_5R1C4_R3_IDENTITY.json', { path: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json', sha256: sha256File(`${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json`), expected: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54', changed: false, rows: loadR3Rows().length });

  const acc = await full(ACCEPTED);
  const rej = await full(REJECTED);

  const a2 = await registerIteration({
    gate: 'r20_commit5r1c4_development_iteration_02', cycle: 'commit5r1c4-dev-02', disposition: 'development_iteration_accepted',
    srcPath: ACCEPTED, basePath: BASELINE,
    hypothesis: 'Decision lane: (a) dangling-scenario referent forced to CLARIFY before treatment/compliance rules; (b) label-binding — tax-shaped acronym bound to an ordinary label-noun via a naming/assignment/checklist act, guarded by absence of a genuine tax question predicate -> NAMES_AS_INTERNAL_LABEL/REQUESTS_NON_TAX_ACTION_ON REFUSE',
    result: acc, accepted: true,
    acceptanceRationale: 'Decision failures 404->309; no closed-category regression (tax_compliance_task 108/108, acronym_homograph_control 200/200 preserved); no material false-allow masking; overall 2870->2955. Accepted best base for COMMIT 5R1-C5.',
  });
  const a3 = await registerIteration({
    gate: 'r20_commit5r1c4_development_iteration_03', cycle: 'commit5r1c4-dev-03', disposition: 'development_iteration_rejected',
    srcPath: REJECTED, basePath: ACCEPTED,
    hypothesis: 'Decision lane: contentless-referent guard — a bare tax-attribute question ("Is this deductible?", "What is the penalty?") with only a pronoun/determiner subject and no concrete taxable subject -> no_tax_relation REFUSE; concrete-subject carve-out preserves genuine questions',
    result: rej, accepted: false,
    acceptanceRationale: 'REJECTED as next base: although decision failures improved 309->281 (best decision-layer result 3439/3720), it introduced a CLOSED-CATEGORY REGRESSION (tax_compliance_task 108->90) because the contentless guard also suppressed legitimately-bare compliance asks. Under the layer-lock acceptance rule (no material closed-category regression), it cannot become the next base. Preserved as a governed rejected candidate; the discriminator is carried to C5 for refinement.',
  });

  // Restore live runtime to committed baseline.
  execFileSync('git', ['-C', REPO, 'checkout', 'HEAD', '--', 'services/philippine-tax-intent-analyzer.js']);

  const laneRecon = {
    note: 'Lane scores derived from the same frozen R3 rows and the same governed classify output; no new oracle, no expectation change.',
    iterations: [
      { iterationId: 'dev-01-reconstructed-2870', activeLane: 'decision', decisionPassed: 3720 - 404, decisionFailed: 404, relationFailed: 315, reasonFailed: 849, overallPassed: 2870, overallFailed: 850, priorLocksPreserved: 'n/a' },
      { iterationId: 'dev-02-accepted', activeLane: 'decision', decisionPassed: acc.lane.decisionPassed, decisionFailed: acc.lane.decisionFailed, relationFailed: acc.lane.relationFailed, reasonFailed: acc.lane.reasonFailed, overallPassed: acc.counts.canonicalPassed, overallFailed: 3720 - acc.counts.canonicalPassed, priorLocksPreserved: 'n/a (no lock achieved)' },
      { iterationId: 'dev-03-rejected', activeLane: 'decision', decisionPassed: rej.lane.decisionPassed, decisionFailed: rej.lane.decisionFailed, relationFailed: rej.lane.relationFailed, reasonFailed: rej.lane.reasonFailed, overallPassed: rej.counts.canonicalPassed, overallFailed: 3720 - rej.counts.canonicalPassed, priorLocksPreserved: 'n/a (rejected: closed-category regression)' },
    ],
  };
  writeR('COMMIT_5R1C4_LAYER_SCORE_RECONCILIATION.json', laneRecon);

  writeR('COMMIT_5R1C4_DECISION_LAYER_NOT_LOCKED.json', {
    decisionLayerLock: 'NOT ACHIEVED',
    bestDecisionResult: `${rej.lane.decisionPassed}/3720`,
    bestDecisionCandidate: 'dev-03 (rejected as next base due to tax_compliance_task 108->90 closed-category regression)',
    bestAcceptedBase: `dev-02 (decision ${acc.lane.decisionPassed}/3720, overall ${acc.counts.canonicalPassed}/3720)`,
    remainingDecisionMismatches: acc.lane.decisionFailed,
    decByDir: acc.lane.decByDir,
    reason: 'Mutually-trading decision-precedence clusters (ALLOW->REFUSE, REFUSE->ALLOW, REFUSE->CLARIFY). Tightening the concrete-subject discriminator to fix REFUSE->ALLOW reopened tax_compliance_task; the two directions trade under coupled patching.',
    relationLayerLock: 'NOT STARTED', reasonLayerLock: 'NOT STARTED', standaloneClosure: 'NOT ACHIEVED', productionIntegration: 'NOT PERFORMED', runtimeFreeze: 'NOT PERFORMED',
  });

  writeR('COMMIT_5R1C4_ITERATION_ACCEPTANCE_REGISTER.json', {
    iterations: [
      { iterationId: 'dev-02', attemptId: a2.attemptId, accepted: true, activeLane: 'decision', decisionFailedDelta: acc.lane.decisionFailed - 404, closedCategoryRegression: false, falseAllowDelta: acc.counts.materialFalseAllows - 155, falseRefusalDelta: acc.counts.materialFalseRefusals - 143, becameNextBase: true, rationale: 'decision 404->309, no closed-category regression, tax_compliance_task 108/108 preserved' },
      { iterationId: 'dev-03', attemptId: a3.attemptId, accepted: false, activeLane: 'decision', decisionFailedDelta: rej.lane.decisionFailed - acc.lane.decisionFailed, closedCategoryRegression: true, closedCategoryRegressionDetail: 'tax_compliance_task 108->90', falseAllowDelta: rej.counts.materialFalseAllows - acc.counts.materialFalseAllows, becameNextBase: false, rationale: 'decision 309->281 but tax_compliance_task closed-category regression -> rejected as next base' },
    ],
  });

  writeR('COMMIT_5R1C4_DEVELOPMENT_ITERATION_REGISTER.json', {
    iterations: [
      { iterationId: 'dev-01-reconstructed-2870', attemptId: 'see COMMIT_5R1C4_RECONSTRUCTED_2870_IDENTITY.json', governedScore: '2870/3720', disposition: 'development_iteration_reconstructed' },
      { iterationId: 'dev-02', attemptId: a2.attemptId, governedScore: `${acc.counts.canonicalPassed}/3720`, decisionScore: `${acc.lane.decisionPassed}/3720`, disposition: 'development_iteration_accepted', functionsChanged: ['decideTaxBoundaryFromEvidence (dangling precedence)', 'buildRelations (label-binding)'], newRegressions: 'none material', resolvedClusters: 'dangling-scenario CLARIFY (40 dec), internal-label REFUSE (55 dec)' },
      { iterationId: 'dev-03', attemptId: a3.attemptId, governedScore: `${rej.counts.canonicalPassed}/3720`, decisionScore: `${rej.lane.decisionPassed}/3720`, disposition: 'development_iteration_rejected', functionsChanged: ['buildRelations (contentless-referent guard)'], newRegressions: 'tax_compliance_task 108->90 (closed-category)', resolvedClusters: 'REFUSE->ALLOW Context-N bare-referent (28 dec)' },
    ],
  });

  writeR('COMMIT_5R1C4_DEVELOPMENT_FAILURE_MATRIX.json', {
    bestAcceptedBase: 'dev-02 (2955)',
    total: 3720, overallPassed: acc.counts.canonicalPassed, overallFailed: 3720 - acc.counts.canonicalPassed,
    decisionMismatches: acc.counts.decisionMismatches, relationMismatches: acc.counts.relationMismatches, reasonMismatches: acc.counts.reasonMismatches,
    materialFalseAllows: acc.counts.materialFalseAllows, materialFalseRefusals: acc.counts.materialFalseRefusals, clarifyMismatches: acc.counts.clarifyMismatches,
    bySourceSet: acc.counts.bySourceSet, byCategory: acc.counts.byCategory, metamorphicGroupsPassed: acc.counts.metamorphicGroupsPassed, metamorphicGroupsTotal: acc.counts.metamorphicGroupsTotal,
  });

  writeR('COMMIT_5R1C4_DECISION.json', {
    decision: 'COMMIT_5R1C4_INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED',
    r3Sha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54', r3Edited: false,
    reconstructed2870R3: '2870/3720', bestOverallGovernedR3: `${acc.counts.canonicalPassed}/3720`, bestDecisionLayerResult: `${rej.lane.decisionPassed}/3720`, remainingDecisionMismatches: acc.lane.decisionFailed,
    decisionLayerLock: 'NOT ACHIEVED', relationLayerLock: 'NOT STARTED', reasonLayerLock: 'NOT STARTED', standaloneClosure: 'NOT ACHIEVED',
    runtimeIntegrated: false, runtimeFrozen: false, runtimeMutable: true, analyzerRestoredToBaseline: true, analyzerBlob: gitObject('HEAD:services/philippine-tax-intent-analyzer.js'),
    accepted3439AsDecisionLock: false, runtimeExceptionsCreated: false,
    next: 'PHASE-10A14-R20 COMMIT 5R1-C5: LAYER-LOCKED ARCHITECTURE REMEDIATION CONTINUATION 5 AGAINST R3 (resume from the accepted dev-02 2955 candidate).',
  });

  const allRecords = loadAttemptRecords();
  const registry = buildRegistry(allRecords);
  registry.cumulativeThrough = 'commit5r1c4-incomplete';
  registry.runtimeClosure = false;
  writeR('CANONICAL_ATTEMPT_REGISTRY.json', registry);
  const recon = reconcileCompleteness(allRecords);
  writeR('COMMIT_5R1C4_ATTEMPT_COMPLETENESS_RECONCILIATION.json', recon);
  writeR('COMMIT_5R1C4_CUMULATIVE_REGISTRY_SNAPSHOT.json', { snapshotAt: new Date().toISOString(), cumulativeThrough: 'commit5r1c4-incomplete', runtimeClosure: false, summary: registry.summary, attemptIds: allRecords.map((r) => r.attemptId) });
  writeR('CANONICAL_COUNT_SUMMARY.json', { task: 'PHASE-10A14-R20', cumulativeThrough: 'commit5r1c4-incomplete', runtimeClosure: false, registrySummary: registry.summary, commit5r1c4: { decision: 'INCOMPLETE_ARCHITECTURE_REMEDIATION_NOT_CLOSED', reconstructed2870R3: '2870/3720', bestOverallGovernedR3: `${acc.counts.canonicalPassed}/3720`, bestDecisionLayerResult: `${rej.lane.decisionPassed}/3720`, remainingDecisionMismatches: acc.lane.decisionFailed, decisionLayerLock: 'NOT ACHIEVED', runtimeFrozen: false, analyzerModified: false, r3Edited: false } });

  return { a2: a2.attemptId, a3: a3.attemptId, accepted: acc.counts.canonicalPassed, accDecFailed: acc.lane.decisionFailed, rejDecFailed: rej.lane.decisionFailed, registry: registry.summary, recon };
}
main().then((r) => console.log(JSON.stringify({ dev02: r.a2, dev03: r.a3, acceptedOverall: `${r.accepted}/3720`, dev02DecFailed: r.accDecFailed, dev03DecFailed: r.rejDecFailed, registry: r.registry, recon: r.recon }, null, 2))).catch((e) => { console.error(e); process.exit(1); });
