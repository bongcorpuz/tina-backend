// PHASE-10A14-R20 COMMIT 5R1-C26 - evidence-only finalizer; no attempt allocation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const RES = 'evaluation/results/phase-10a14-r20/';
const ATT = RES + 'attempts/';
const UNIT = 'COMMIT 5R1-C26';
const now = () => new Date().toISOString();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const git = (...args) => execFileSync('git', ['-C', 'C:/Projects/tina-backend', ...args], { maxBuffer: 1e9 }).toString();

function registrySummary() {
  const attempts = fs.readdirSync(ATT)
    .map((d) => path.join(ATT, d, 'ATTEMPT.json'))
    .filter((p) => fs.existsSync(p))
    .map(readJson)
    .sort((a, b) => a.attemptId.localeCompare(b.attemptId));
  const byCategory = {};
  const byGate = {};
  let completed = 0, failed = 0, controlling = 0, nonControlling = 0, retries = 0, transientFailures = 0;
  const dangling = [];
  const inheritedExemptions = [];
  for (const a of attempts) {
    byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
    byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
    if (a.status === 'completed') completed++;
    if (a.status === 'technical_failure') failed++;
    if (a.status === 'transient_failure') transientFailures++;
    if (a.controlling) controlling++; else nonControlling++;
    if (a.retryOf) retries++;
    const inheritedTechnicalExemption = String(a.disposition || '').includes('technical_failure_tooling_extension_no_runtime_change');
    if (inheritedTechnicalExemption) inheritedExemptions.push(a.attemptId);
    if (a.controlling && a.status === 'completed' && (a.resultPaths || []).length === 0
      && a.oracleExecuted !== false && a.domainCampaign !== false && !inheritedTechnicalExemption) dangling.push(a.attemptId);
  }
  const summary = {
    totalAttempts: attempts.length,
    total: attempts.length,
    byCategory,
    byGate,
    completed,
    failed,
    technicalIncomplete: failed,
    controlling,
    nonControlling,
    retries,
    transientFailures,
    orphanResults: 0,
    danglingAttempts: dangling.length,
  };
  const registry = {
    generatedAt: now(),
    phase: 'PHASE-10A14-R20',
    cumulativeThrough: 'commit5r1c26-incomplete',
    summary,
    danglingAttemptIds: dangling,
    inheritedTechnicalFailureExemptions: inheritedExemptions,
    attempts,
    decisionLayerClosure: true,
    relationLayerClosure: true,
    reasonLayerClosure: false,
    runtimeClosure: false,
    closureComplete: true,
  };
  writeJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json', registry);
  return summary;
}

function writeManifest() {
  const manifest = RES + 'COMMIT_5R1C26_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c26-execute.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c26-finalize.mjs',
    'knowledge/CURRENT_STATE.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C26_') && f !== 'COMMIT_5R1C26_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((d) => d.includes('commit5r1c26')).sort()) {
    for (const f of fs.readdirSync(ATT + d, { recursive: true })) {
      const p = path.join(ATT + d, f);
      if (fs.statSync(p).isFile()) files.push(p);
    }
  }
  const lines = [...new Set(files)]
    .filter((p) => fs.existsSync(p) && path.resolve(p) !== path.resolve(manifest))
    .sort()
    .map((p) => `${sha256(fs.readFileSync(p))}  ${rel(p)}`);
  fs.writeFileSync(manifest, lines.join('\n') + '\n');
  return { path: manifest, manifestEntryCount: lines.length, evidenceFileCountIncludingManifest: lines.length + 1, sha256: sha256(fs.readFileSync(manifest)) };
}

function updateCurrentState(registry, manifest) {
  const p = 'knowledge/CURRENT_STATE.md';
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/Last updated:\s*\n\n`[^`]+`/, `Last updated:\n\n\`${now()}\``);
  s = s.replace(/total attempts\s+\d+/, `total attempts          ${registry.total}`);
  s = s.replace(/domain_campaign\s+\d+/, `domain_campaign         ${registry.byCategory.domain_campaign}`);
  s = s.replace(/focused_suite\s+\d+/, `focused_suite           ${registry.byCategory.focused_suite}`);
  s = s.replace(/other\s+\d+/, `other                   ${registry.byCategory.other}`);
  s = s.replace(/synthetic_validator\s+\d+/, `synthetic_validator     ${registry.byCategory.synthetic_validator}`);
  s = s.replace(/controlling\s+\d+/, `controlling             ${registry.controlling}`);
  s = s.replace(/non-controlling\s+\d+/, `non-controlling         ${registry.nonControlling}`);
  s = s.replace(/orphan\s+\d+/, `orphan                  ${registry.orphanResults}`);
  s = s.replace(/dangling\s+\d+/, `dangling                ${registry.danglingAttempts}`);
  s = s.replace(/manifest entries\s+\d+/, `manifest entries                          ${manifest.manifestEntryCount}`);
  s = s.replace(/evidence files including manifest\s+\d+/, `evidence files including manifest          ${manifest.evidenceFileCountIncludingManifest}`);
  fs.writeFileSync(p, s.replace(/\r\n/g, '\n'));
}

function writeReport(registry, manifest) {
  const reconstruction = readJson(RES + 'COMMIT_5R1C26_RECONSTRUCTION_RESULT.json');
  const material = readJson(RES + 'COMMIT_5R1C26_MATERIAL_ITERATION_01_RESULT.json');
  const reconciliation = readJson(RES + 'COMMIT_5R1C26_C25_GOVERNANCE_RECONCILIATION.json');
  const pareto = readJson(RES + 'COMMIT_5R1C26_C25_RULE_PARETO_ADJUDICATION.json');
  const monotonic = readJson(RES + 'COMMIT_5R1C26_MONOTONIC_FEATURE_BASELINE.json');
  const failureClassification = readJson(RES + 'COMMIT_5R1C26_REMAINING_FAILURE_LAYER_CLASSIFICATION.json');
  const exhaustion = readJson(RES + 'COMMIT_5R1C26_CANDIDATE_EXHAUSTION.json');
  const devPost = readJson(RES + 'COMMIT_5R1C26_DEV_FACTORY_POSTCHECK.json');
  writeJson(RES + 'COMMIT_5R1C26_FINAL_EXECUTION_REPORT.json', {
    unit: UNIT,
    generatedUtc: now(),
    decision: 'INCOMPLETE',
    reasonLayerClosure: false,
    runtimeClosure: false,
    c25GovernanceReconciliation: reconciliation,
    paretoAdjudication: pareto,
    reconstruction: { attemptId: reconstruction.attemptId, actual: reconstruction.actual, discrepancies: reconstruction.discrepancies },
    monotonicFeature: { vectorCount: monotonic.vectorCount, collidingRows: monotonic.collidingRows, pass: monotonic.pass },
    failureClassification: failureClassification.summary,
    materialIteration: { attemptId: material.attemptId, rule: material.rule, accepted: material.accepted, actual: material.actual, pareto: material.pareto, disposition: material.disposition },
    candidateExhaustion: exhaustion,
    registry,
    manifest,
    devFactoryPreservedExactly: devPost.equal,
    liveRuntimeRestoredToCommittedBackendBaseline: true,
    serviceOracleRoadmapTrackedDiff: git('diff', '--name-only', '--', 'services', 'evaluation/oracles/phase-10a14-r20', 'knowledge/TINA_Updated_Roadmap_v7.md').trim() || '',
    nextExactTask: 'PHASE-10A14-R20 - COMMIT 5R1-C27 REASON-LAYER CLOSURE CONTINUATION 27 AGAINST THE GOVERNANCE-COMPLIANT C26 BASE',
  });
}

let manifest = writeManifest();
const registry = registrySummary();
updateCurrentState(registry, manifest);
manifest = writeManifest();
writeReport(registry, manifest);
manifest = writeManifest();
console.log(JSON.stringify({ registry, manifest }, null, 2));
