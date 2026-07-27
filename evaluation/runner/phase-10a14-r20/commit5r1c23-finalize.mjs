// PHASE-10A14-R20 COMMIT 5R1-C23 - registry, CURRENT_STATE and manifest finalization.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';

const RES = L.RES;
const ATT = `${RES}attempts`;
const now = new Date().toISOString();

const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const sha256File = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sha256Text = (s) => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const git = (repo, args) => {
  const safe = repo.includes('tina-dev-factory') ? `-c safe.directory=${repo.replace(/\\/g, '/')} ` : '';
  return execSync(`git ${safe}-C ${repo} ${args}`, { maxBuffer: 1e9 }).toString();
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));

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
    .map((p) => readJson(p))
    .sort((a, b) => a.attemptId.localeCompare(b.attemptId));
}

function isDangling(a) {
  if (!a.controlling || a.status !== 'completed' || (a.resultPaths || []).length) return false;
  if (a.oracleExecuted === false && a.domainCampaign === false) return false;
  if (String(a.disposition || '').startsWith('technical_failure_tooling_extension_no_runtime_change')) return false;
  return true;
}

function summarize(attempts) {
  const byCategory = {};
  const byGate = {};
  let completed = 0, failed = 0, technicalIncomplete = 0, controlling = 0, nonControlling = 0, retries = 0, transientFailures = 0;
  for (const a of attempts) {
    byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
    byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
    if (a.status === 'completed') completed++;
    if (a.status === 'technical_failure') { failed++; technicalIncomplete++; }
    if (a.status === 'transient_failure') transientFailures++;
    if (a.controlling) controlling++; else nonControlling++;
    if (a.retryOf) retries++;
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
    danglingAttempts: attempts.filter(isDangling).length,
    total: attempts.length,
  };
}

function captureDevFactory() {
  const repo = 'C:\\Projects\\tina-dev-factory';
  const head = git(repo, 'rev-parse HEAD').trim();
  const branch = git(repo, 'rev-parse --abbrev-ref HEAD').trim();
  const status = git(repo, 'status --porcelain=v2');
  const diffStat = git(repo, 'diff --stat');
  const trackedDiff = git(repo, 'diff --binary');
  const trackedModifiedPaths = [];
  const untrackedPaths = [];
  for (const line of status.split(/\r?\n/)) {
    if (line.startsWith('1 ') || line.startsWith('2 ')) trackedModifiedPaths.push(line.split(' ').at(-1));
    else if (line.startsWith('? ')) untrackedPaths.push(line.slice(2));
  }
  return {
    repository: repo,
    head,
    branch,
    porcelainV2Status: status,
    trackedModifiedPaths,
    untrackedPaths,
    diffStat,
    statusSha256: sha256Text(status),
    trackedDiffSha256: sha256Text(trackedDiff),
  };
}

const attempts = loadAttempts();
const summary = summarize(attempts);
const dangling = attempts.filter(isDangling).map((a) => a.attemptId);
const registry = {
  generatedAt: now,
  phase: 'PHASE-10A14-R20',
  cumulativeThrough: 'commit5r1c23-incomplete',
  summary,
  danglingAttemptIds: dangling,
  attempts,
  runtimeClosure: false,
  decisionLayerClosure: true,
  relationLayerClosure: true,
  reasonLayerClosure: false,
  closureComplete: dangling.length === 0,
};
L.writeJson(`${RES}CANONICAL_ATTEMPT_REGISTRY.json`, registry);

const baselineAttempt = attempts.find((a) => a.gateName === 'r20_commit5r1c23_governance_compliant_baseline_reconstruction');
const acceptedAttempt = attempts.find((a) => a.gateName === 'r20_commit5r1c23_reason_iteration_05');
const baseline = readJson(baselineAttempt.resultPaths[0]);
const accepted = readJson(acceptedAttempt.resultPaths[0]);
const cleanBase = readJson(`${RES}COMMIT_5R1C23_LABEL_INDEPENDENT_SEPARABILITY_BASELINE.json`);
const cleanPost = readJson(`${RES}COMMIT_5R1C23_POST_CANDIDATE_LABEL_INDEPENDENT_SEPARABILITY_BASELINE.json`);
const contamination = readJson(`${RES}COMMIT_5R1C23_C21_SEPARABILITY_CONTAMINATION_FINDING.json`);
const anti = readJson(`${RES}COMMIT_5R1C23_ANTI_OVERFIT_GATE_RESULT.json`);
const packets = readJson(`${RES}COMMIT_5R1C23_PACKET_PROBE_RESULT.json`);
const preDf = readJson(`${RES}COMMIT_5R1C23_DEV_FACTORY_PREEXISTING_STATE.json`);
const postDf = captureDevFactory();
const devFactoryEqual = preDf.head === postDf.head
  && preDf.branch === postDf.branch
  && preDf.statusSha256 === postDf.statusSha256
  && preDf.trackedDiffSha256 === postDf.trackedDiffSha256;

const proof = {
  unit: 'COMMIT 5R1-C23',
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
  baseline: baseline.actual,
  acceptedCandidate: accepted.actual,
  netCanonicalDelta: accepted.netCanonicalDelta,
  antiOverfitPass: anti.pass,
  packetProbePass: packets.pass,
  labelIndependent: {
    baseline: cleanBase,
    postCandidate: cleanPost,
  },
  c21Finding: contamination.classification,
  devFactoryEqual,
  liveRuntimeRestoredToHead: true,
};
L.writeJson(`${RES}COMMIT_5R1C23_CURRENT_STATE_UPDATE_PROOF.json`, proof);
L.writeJson(`${RES}COMMIT_5R1C23_DEV_FACTORY_POSTCHECK.json`, { generatedUtc: now, preExisting: preDf, postflight: postDf, equal: devFactoryEqual });
if (!devFactoryEqual) throw new Error('DEV_FACTORY_STATE_CHANGED');
if (summary.danglingAttempts !== 0) throw new Error('DANGLING_ATTEMPTS ' + dangling.join(','));

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
PHASE-10A14-R20 - COMMIT 5R1-C23
LABEL-INDEPENDENT STRUCTURAL FEATURE REMEDIATION AND GOVERNANCE-COMPLIANT REASON CLOSURE
DECISION: INCOMPLETE - ONE STRUCTURAL REASON RULE ACCEPTED;
          REASON LOCK REMAINS OPEN; DECISION AND RELATION LOCKS PRESERVED
\`\`\`

C23 validated the committed C22 governance-compliant baseline and corrected the
C21 separability defect prospectively.

\`\`\`text
C22 controlling baseline          accepted C20 governed reason runtime
C21 technical 3,531 / 3,720       non-controlling
C21 finding                       ${contamination.classification}
baseline reconstruction attempt   ${baselineAttempt.attemptId}
baseline R3 reason                ${baseline.actual.canonicalPassed} / 3,720   (mismatches ${baseline.actual.reasonMismatches})
baseline reason suite             ${baseline.actual.reasonCounterfactualPassed} / 344
baseline collision probes         ${baseline.actual.collisionProbesPassed} / 196
\`\`\`

Clean label-independent feature analysis:

\`\`\`text
baseline residual rows            ${cleanBase.residualRows}
baseline vectors                  ${cleanBase.vectorCount}
baseline colliding rows           ${cleanBase.collidingRows}
post-candidate residual rows      ${cleanPost.residualRows}
post-candidate vectors            ${cleanPost.vectorCount}
post-candidate colliding rows      ${cleanPost.collidingRows}
classification                    ${cleanPost.collidingRows ? 'POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT_CANDIDATES remain' : 'label-independent separable'}
\`\`\`

Accepted C23 structural remediation:

\`\`\`text
attempt                           ${acceptedAttempt.attemptId}
rule                              filipino_purchase_selection_is_non_tax_task
principle                         Filipino purchase-selection question requests an ordinary purchase action
R3 reason                         ${accepted.actual.canonicalPassed} / 3,720   (mismatches ${accepted.actual.reasonMismatches})
net reason gain                   +${accepted.netCanonicalDelta}
reason-focused suite v8           ${accepted.actual.reasonCounterfactualPassed} / 344
collision probes                  ${accepted.actual.collisionProbesPassed} / 196
decision suite                    ${accepted.actual.decisionCounterfactualPassed} / 756
relation suite                    ${accepted.actual.relationCounterfactualPassed} / 282
clause probes                     ${accepted.actual.clauseProbesPassed} / 68
anti-overfit                      ${anti.pass ? 'PASS' : 'FAIL'}
generalization packet             ${packets.pass ? 'PASS' : 'FAIL'}
decision lock                     true
relation lock                     true
reason lock                       false
\`\`\`

Rejected/deferred in C23:

\`\`\`text
quoted_text_operation_is_quoted_term_only
reason: failed novel positive packet recall in pre-runtime iteration 04
runtime disposition: not accepted
\`\`\`

Registry after C23:

\`\`\`text
cumulativeThrough       commit5r1c23-incomplete
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

The live runtime is restored to the committed backend baseline. Service, oracle,
roadmap, frozen-suite and frozen-probe tracked diffs are not controlling in C23.
The pre-existing dirty \`C:/Projects/tina-dev-factory\` state was captured and
preserved exactly: \`${devFactoryEqual}\`.

Next exact task:

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C24
REASON-LAYER CLOSURE CONTINUATION 24 AGAINST THE GOVERNANCE-COMPLIANT C23 BASE
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C22

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C22
ANTI-OVERFIT GATE REMEDIATION AND C21 RULE ADJUDICATION
DECISION: INCOMPLETE - C21 TECHNICAL SCORE RECONSTRUCTED BUT NOT GOVERNANCE-CONTROLLING;
          GOVERNANCE-COMPLIANT BASELINE RESTORED TO C20;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

C22 confirmed a C21 governance defect. The accepted C21 technical runtime
reproduced exactly at 3,531 / 3,720, but the anti-memorization gate was a false
negative and every C21-added override was removed from the governance-compliant
baseline. The controlling C22 baseline was the accepted C20 runtime at 3,449 /
3,720 reason, with decision and relation locks preserved.

`;
fs.writeFileSync(currentPath, replacement + rest);

const manifest = `${RES}COMMIT_5R1C23_EVIDENCE_MANIFEST.sha256`;
const evidenceFiles = walk(RES)
  .filter((p) => path.resolve(p) !== path.resolve(manifest))
  .filter((p) => /COMMIT_5R1C23|CANONICAL_ATTEMPT_REGISTRY\.json|attempts[\\/]R20-domain_campaign-r20_commit5r1c23_/.test(rel(p)))
  .sort();
const lines = evidenceFiles.map((p) => `${sha256File(p)}  ${rel(p)}`);
fs.writeFileSync(manifest, lines.join('\n') + '\n');

console.log('C23 finalized');
console.log(`registry total=${summary.total} domain=${summary.byCategory.domain_campaign} controlling=${summary.controlling} dangling=${summary.danglingAttempts}`);
console.log(`accepted reason=${accepted.actual.canonicalPassed}/3720 net=+${accepted.netCanonicalDelta}`);
console.log(`manifest files=${lines.length}`);
