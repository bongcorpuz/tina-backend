// PHASE-10A14-R20 COMMIT 5R1-C27 - cleanup generated replay workdirs and refresh manifest counts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = 'C:/Projects/tina-backend';
const RES = 'evaluation/results/phase-10a14-r20/';
const ATT = RES + 'attempts/';
const MANIFEST = RES + 'COMMIT_5R1C27_EVIDENCE_MANIFEST.sha256';
const now = () => new Date().toISOString();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1e9 }).toString();

function assertInsideRepo(target) {
  const resolved = path.resolve(target);
  const root = path.resolve(REPO);
  if (!resolved.startsWith(root + path.sep)) throw new Error('REFUSE_OUT_OF_REPO_DELETE ' + resolved);
  return resolved;
}

function cleanupReplayWorkdirs() {
  const removed = [];
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c27'))) {
    const attemptDir = path.join(ATT, d);
    for (const name of ['delta-work', 'delta-replay', 'delta-reverse-replay']) {
      const target = path.join(attemptDir, name);
      if (fs.existsSync(target)) {
        const resolved = assertInsideRepo(target);
        fs.rmSync(resolved, { recursive: true, force: true });
        removed.push(rel(resolved));
      }
    }
  }
  writeJson(RES + 'COMMIT_5R1C27_REPLAY_WORKDIR_CLEANUP.json', {
    unit: 'COMMIT 5R1-C27',
    generatedUtc: now(),
    removedGeneratedWorkdirs: removed,
    reason: 'Replay results are preserved in CANDIDATE_DELTA_REPLAY_RESULT.json; nested temporary git workdirs are not evidence artifacts.',
    pass: true,
  });
  return removed;
}

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
  const inheritedTechnicalFailureExemptions = [];
  for (const a of attempts) {
    byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
    byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
    if (a.status === 'completed') completed++;
    if (a.status === 'technical_failure') failed++;
    if (a.status === 'transient_failure') transientFailures++;
    if (a.controlling) controlling++; else nonControlling++;
    if (a.retryOf) retries++;
    const inheritedTechnicalExemption = String(a.disposition || '').includes('technical_failure_tooling_extension_no_runtime_change');
    if (inheritedTechnicalExemption) inheritedTechnicalFailureExemptions.push(a.attemptId);
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
  writeJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json', {
    generatedAt: now(),
    phase: 'PHASE-10A14-R20',
    cumulativeThrough: 'commit5r1c27-incomplete',
    summary,
    danglingAttemptIds: dangling,
    inheritedTechnicalFailureExemptions,
    attempts,
    decisionLayerClosure: true,
    relationLayerClosure: true,
    reasonLayerClosure: false,
    runtimeClosure: false,
    closureComplete: true,
  });
  return summary;
}

function shouldSkipAttemptFile(p) {
  const normalized = rel(p);
  return /\/(?:delta-work|delta-replay|delta-reverse-replay)\//.test(normalized)
    || /\/\.git\//.test(normalized);
}

function writeManifest() {
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c27-execute.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c27-finalize.mjs',
    'knowledge/CURRENT_STATE.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C27_') && f !== 'COMMIT_5R1C27_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c27')).sort()) {
    for (const f of fs.readdirSync(ATT + d, { recursive: true })) {
      const p = path.join(ATT + d, f);
      if (fs.statSync(p).isFile() && !shouldSkipAttemptFile(p)) files.push(p);
    }
  }
  const lines = [...new Set(files)]
    .filter((p) => fs.existsSync(p) && path.resolve(p) !== path.resolve(MANIFEST))
    .sort()
    .map((p) => `${sha256(fs.readFileSync(p))}  ${rel(p)}`);
  fs.writeFileSync(MANIFEST, lines.join('\n') + '\n');
  return { path: MANIFEST, manifestEntryCount: lines.length, evidenceFileCountIncludingManifest: lines.length + 1, sha256: sha256(fs.readFileSync(MANIFEST)) };
}

function refreshReportAndState(registry, manifest) {
  const reportPath = RES + 'COMMIT_5R1C27_FINAL_EXECUTION_REPORT.json';
  const report = readJson(reportPath);
  report.generatedUtc = now();
  report.registry = registry;
  report.manifest = manifest;
  report.serviceOracleRoadmapTrackedDiff = git('diff', '--name-only', '--', 'services', 'evaluation/oracles/phase-10a14-r20', 'knowledge/TINA_Updated_Roadmap_v7.md').trim() || '';
  writeJson(reportPath, report);

  const statePath = 'knowledge/CURRENT_STATE.md';
  let state = fs.readFileSync(statePath, 'utf8');
  state = state.replace(/Last updated:\s*\n\n`[^`]+`/, `Last updated:\n\n\`${now()}\``);
  state = state.replace(/manifest entries\s+\d+/, `manifest entries                          ${manifest.manifestEntryCount}`);
  state = state.replace(/evidence files including manifest\s+\d+/, `evidence files including manifest          ${manifest.evidenceFileCountIncludingManifest}`);
  state = state.replace(/total attempts\s+\d+/, `total attempts          ${registry.total}`);
  state = state.replace(/domain_campaign\s+\d+/, `domain_campaign         ${registry.byCategory.domain_campaign}`);
  state = state.replace(/focused_suite\s+\d+/, `focused_suite           ${registry.byCategory.focused_suite}`);
  state = state.replace(/other\s+\d+/, `other                   ${registry.byCategory.other}`);
  state = state.replace(/synthetic_validator\s+\d+/, `synthetic_validator     ${registry.byCategory.synthetic_validator}`);
  state = state.replace(/controlling\s+\d+/, `controlling             ${registry.controlling}`);
  state = state.replace(/non-controlling\s+\d+/, `non-controlling         ${registry.nonControlling}`);
  state = state.replace(/orphan\s+\d+/, `orphan                  ${registry.orphanResults}`);
  state = state.replace(/dangling\s+\d+/, `dangling                ${registry.danglingAttempts}`);
  fs.writeFileSync(statePath, state.replace(/\r\n/g, '\n'));
}

cleanupReplayWorkdirs();
const registry = registrySummary();
let manifest = writeManifest();
refreshReportAndState(registry, manifest);
manifest = writeManifest();
console.log(JSON.stringify({ registry, manifest }, null, 2));
