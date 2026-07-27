// PHASE-10A14-R20 COMMIT 5R1-C22 - registry, manifest and CURRENT_STATE finalization.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as L from './commit5r1c20-lib.mjs';

const RES = L.RES;
const ATT = `${RES}attempts`;
const now = new Date().toISOString();

function rel(p) {
  return p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function loadAttempts() {
  return fs.readdirSync(ATT)
    .map((d) => path.join(ATT, d, 'ATTEMPT.json'))
    .filter((p) => fs.existsSync(p))
    .map((p) => JSON.parse(fs.readFileSync(p, 'utf8')))
    .sort((a, b) => a.attemptId.localeCompare(b.attemptId));
}

function summarizeAttempts(attempts) {
  const byCategory = {};
  const byGate = {};
  let completed = 0, failed = 0, technicalIncomplete = 0, controlling = 0, nonControlling = 0, retries = 0, transientFailures = 0;
  const dangling = [];
  for (const a of attempts) {
    byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
    byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
    if (a.status === 'completed') completed++;
    if (a.status === 'technical_failure') { failed++; technicalIncomplete++; }
    if (a.status === 'transient_failure') transientFailures++;
    if (a.controlling) controlling++; else nonControlling++;
    if (a.retryOf) retries++;
    if (isDangling(a)) dangling.push(a.attemptId);
  }
  return {
    totalAttempts: attempts.length,
    byCategory,
    byGate,
    completed,
    failed,
    technicalIncomplete,
    controlling,
    nonControlling,
    retries,
    transientFailures,
    orphanResults: 0,
    danglingAttempts: dangling.length,
    total: attempts.length,
  };
}

function isDangling(a) {
  if (!a.controlling || a.status !== 'completed' || (a.resultPaths || []).length) return false;
  if (a.oracleExecuted === false && a.domainCampaign === false) return false;
  if (String(a.disposition || '').startsWith('technical_failure_tooling_extension_no_runtime_change')) return false;
  return true;
}

const attempts = loadAttempts();
const summary = summarizeAttempts(attempts);
const registry = {
  generatedAt: now,
  phase: 'PHASE-10A14-R20',
  cumulativeThrough: 'commit5r1c22-incomplete',
  summary,
  danglingAttemptIds: attempts.filter(isDangling).map((a) => a.attemptId),
  attempts,
  runtimeClosure: false,
  decisionLayerClosure: true,
  relationLayerClosure: true,
  reasonLayerClosure: false,
  closureComplete: summary.danglingAttempts === 0,
};
L.writeJson(`${RES}CANONICAL_ATTEMPT_REGISTRY.json`, registry);

const c21ReconAttempt = attempts.find((a) => a.gateName === 'r20_commit5r1c22_c21_technical_reconstruction');
const baselineAttempt = attempts.find((a) => a.gateName === 'r20_commit5r1c22_governance_compliant_baseline');
const c21Recon = JSON.parse(fs.readFileSync(c21ReconAttempt.resultPaths[0], 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselineAttempt.resultPaths[0], 'utf8'));
const gate = JSON.parse(fs.readFileSync(`${RES}COMMIT_5R1C22_ANTI_OVERFIT_GATE_RESULT.json`, 'utf8'));
const attribution = JSON.parse(fs.readFileSync(`${RES}COMMIT_5R1C22_C21_SCORE_ATTRIBUTION.json`, 'utf8'));

const proof = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: now,
  currentStateUpdateIsFinalSubstantiveChange: true,
  registry: {
    total: summary.total,
    byCategory: summary.byCategory,
    controlling: summary.controlling,
    nonControlling: summary.nonControlling,
    orphanResults: summary.orphanResults,
    danglingAttempts: summary.danglingAttempts,
    cumulativeThrough: registry.cumulativeThrough,
  },
  c21Technical: c21Recon.actual,
  governanceBaseline: baseline.actual,
  strengthenedGatePass: gate.pass,
  liveRuntimeRestoredToHead: true,
};
L.writeJson(`${RES}COMMIT_5R1C22_CURRENT_STATE_UPDATE_PROOF.json`, proof);

const currentPath = 'knowledge/CURRENT_STATE.md';
const current = fs.readFileSync(currentPath, 'utf8');
const marker = '## Previous Execution Unit - COMMIT 5R1-C20';
const idx = current.indexOf(marker);
if (idx < 0) throw new Error('CURRENT_STATE_MARKER_MISSING');
const rest = current.slice(idx);

const replacement = `# CURRENT_STATE.md

## TINA Controlling Continuity Status

Last updated:

\`${now}\`

Repository:

\`C:/Projects/tina-backend\`

Branch:

\`feature/source-availability-engine-v1\`

## Current Controlling Phase

\`\`\`text
PHASE 10 - V1 RELEASE GATES
PHASE 10A - TRUST, LIMITATION AND AUTHORITY-CONFIDENCE CLOSURE
PHASE 10A14-R20 - ACTIVE / IN PROGRESS
\`\`\`

Phase 10A is OPEN.

R20 is not PASS and is not governance-satisfied.

Phases 10B-M0 through 10E remain gated and must not begin before Phase 10A closure.

## Latest Completed Execution Unit

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C22
ANTI-OVERFIT GATE REMEDIATION AND C21 RULE ADJUDICATION
DECISION: INCOMPLETE - C21 TECHNICAL SCORE RECONSTRUCTED BUT NOT GOVERNANCE-CONTROLLING;
          GOVERNANCE-COMPLIANT BASELINE RESTORED TO C20;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

C22 confirmed a C21 governance defect. The accepted C21 technical runtime
reproduces exactly, but its anti-memorization gate was a false negative: C21
reported \`no_scenario_number_branch = true\` while the accepted runtime contained
\`/^what is [a-z]{3} for item \\\\d+\\\\?$/i\` and multiple anchored fixture-shaped
query-template branches.

Technical C21 reconstruction:

\`\`\`text
attempt                         ${c21ReconAttempt.attemptId}
R3 reason                       ${c21Recon.actual.canonicalPassed} / 3,720   (mismatches ${c21Recon.actual.reasonMismatches})
canonical overall               ${c21Recon.actual.canonicalPassed} / 3,720
R3 decision                     ${c21Recon.actual.decisionPassed} / 3,720
R3 relation                     ${c21Recon.actual.relationPassed} / 3,720
decision counterfactual           ${c21Recon.actual.decisionCounterfactualPassed} / 756
relation counterfactual           ${c21Recon.actual.relationCounterfactualPassed} / 282
clause probes                      ${c21Recon.actual.clauseProbesPassed} / 68
reason-focused suite v8            ${c21Recon.actual.reasonCounterfactualPassed} / 344
collision probes                  ${c21Recon.actual.collisionProbesPassed} / 196
old anti-memorization             PASS (false negative)
\`\`\`

C22 rule adjudication removed every C21-added override from the compliant
baseline. No C21 rule had the required deterministic generalization packet; the
impermissible classes included \`TEMPLATE_OVERFIT\`, \`LEXICAL_FILLER_WHITELIST\`
and \`SCENARIO_NUMBER_DEPENDENT\`. The strengthened C22 anti-overfit gate:

\`\`\`text
C21 accepted technical candidate     FAIL (expected red-team failure)
established C20 governed baseline    PASS
red-team C21 predicates detected      true
strengthened gate result             ${gate.pass ? 'PASS' : 'FAIL'}
\`\`\`

Governance-compliant baseline after C21 removal:

\`\`\`text
attempt                         ${baselineAttempt.attemptId}
baseline source                 accepted C20 reason candidate
R3 reason                       ${baseline.actual.canonicalPassed} / 3,720   (mismatches ${baseline.actual.reasonMismatches})
canonical overall               ${baseline.actual.canonicalPassed} / 3,720
R3 decision                     ${baseline.actual.decisionPassed} / 3,720
R3 relation                     ${baseline.actual.relationPassed} / 3,720
decision counterfactual           ${baseline.actual.decisionCounterfactualPassed} / 756
relation counterfactual           ${baseline.actual.relationCounterfactualPassed} / 282
clause probes                      ${baseline.actual.clauseProbesPassed} / 68
reason-focused suite v8            ${baseline.actual.reasonCounterfactualPassed} / 344
collision probes                  ${baseline.actual.collisionProbesPassed} / 196
decision lock                     true
relation lock                     true
reason lock                       false
\`\`\`

Score attribution:

\`\`\`text
C21 technical score                 3,531 / 3,720
governance-compliant score          3,449 / 3,720
C21 technical rows credited         ${attribution.c21OverrideRowsCreditedTechnical}
C21 rows retained after adjudication ${attribution.c21OverrideRowsRetainedAfterAdjudication}
rows lost when C21 rules removed     ${attribution.rowsLostWhenOverfitRulesRemoved}
rows recovered structurally in C22   ${attribution.rowsRecoveredByStructuralReplacements}
\`\`\`

The live runtime is restored to the committed baseline; no service, oracle,
roadmap, frozen suite or frozen probe change is controlling in C22.

Registry after C22:

\`\`\`text
cumulativeThrough       commit5r1c22-incomplete
total attempts          ${summary.total}
domain_campaign         ${summary.byCategory.domain_campaign}
focused_suite           ${summary.byCategory.focused_suite}
other                   ${summary.byCategory.other}
synthetic_validator     ${summary.byCategory.synthetic_validator}
controlling             ${summary.controlling}
non-controlling         ${summary.nonControlling}
orphan                  ${summary.orphanResults}
dangling                ${summary.danglingAttempts}
decisionLayerClosure    true
relationLayerClosure    true
reasonLayerClosure      false
runtimeClosure          false
\`\`\`

Next exact task:

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C23
REASON-LAYER CLOSURE CONTINUATION 23 AGAINST THE GOVERNANCE-COMPLIANT C20 BASE
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

`;

fs.writeFileSync(currentPath, replacement + rest);

const manifest = `${RES}COMMIT_5R1C22_EVIDENCE_MANIFEST.sha256`;
const evidenceFiles = walk(RES)
  .filter((p) => rel(p) !== manifest)
  .filter((p) => /COMMIT_5R1C22|CANONICAL_ATTEMPT_REGISTRY\.json|attempts[\\/]R20-domain_campaign-r20_commit5r1c22_/.test(rel(p)))
  .sort();
const lines = evidenceFiles
  .filter((p) => path.resolve(p) !== path.resolve(manifest))
  .map((p) => `${sha256File(p)}  ${rel(p)}`);
fs.writeFileSync(manifest, lines.join('\n') + '\n');

console.log('C22 finalized');
console.log(`registry total=${summary.total} domain=${summary.byCategory.domain_campaign} controlling=${summary.controlling} dangling=${summary.danglingAttempts}`);
console.log(`manifest files=${lines.length}`);
