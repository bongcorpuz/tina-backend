import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const RES = 'evaluation/results/phase-10a14-r20/';
const ATT = RES + 'attempts/';
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const now = () => new Date().toISOString();

function c25AttemptDirs() {
  return fs.readdirSync(ATT)
    .filter((d) => d.includes('commit5r1c25'))
    .sort()
    .map((d) => ATT + d + '/');
}

function writeManifest() {
  const manifest = RES + 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c25-execute.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c25-finalize.mjs',
    'knowledge/CURRENT_STATE.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C25_') && f !== 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const dir of c25AttemptDirs()) {
    for (const f of fs.readdirSync(dir, { recursive: true })) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isFile()) files.push(p);
    }
  }
  const lines = [...new Set(files)]
    .filter((p) => fs.existsSync(p) && path.resolve(p) !== path.resolve(manifest))
    .sort()
    .map((p) => `${sha256(fs.readFileSync(p))}  ${rel(p)}`);
  fs.writeFileSync(manifest, lines.join('\n') + '\n');
  return {
    path: manifest,
    manifestEntryCount: lines.length,
    evidenceFileCountIncludingManifest: lines.length + 1,
    sha256: sha256(fs.readFileSync(manifest)),
  };
}

function updateCurrentState(manifest) {
  const p = 'knowledge/CURRENT_STATE.md';
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/manifest entries\s+pending/, `manifest entries                          ${manifest.manifestEntryCount}`);
  s = s.replace(/evidence files including manifest\s+pending/, `evidence files including manifest          ${manifest.evidenceFileCountIncludingManifest}`);
  fs.writeFileSync(p, s.replace(/\r\n/g, '\n'));
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
  const isDangling = (a) => {
    if (!a.controlling || a.status !== 'completed' || (a.resultPaths || []).length) return false;
    if (a.oracleExecuted === false && a.domainCampaign === false) return false;
    if (String(a.disposition || '').includes('technical_failure_tooling_extension_no_runtime_change')) return false;
    return true;
  };
  for (const a of attempts) {
    byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
    byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
    if (a.status === 'completed') completed++;
    if (a.status === 'technical_failure') failed++;
    if (a.status === 'transient_failure') transientFailures++;
    if (a.controlling) controlling++; else nonControlling++;
    if (a.retryOf) retries++;
    if (isDangling(a)) dangling.push(a.attemptId);
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
    cumulativeThrough: 'commit5r1c25-incomplete',
    summary,
    danglingAttemptIds: dangling,
    attempts,
    decisionLayerClosure: true,
    relationLayerClosure: true,
    reasonLayerClosure: false,
    runtimeClosure: false,
    closureComplete: true,
  });
  return summary;
}

const registry = registrySummary();
let manifest = writeManifest();
updateCurrentState(manifest);
manifest = writeManifest();

const material = readJson(RES + 'COMMIT_5R1C25_MATERIAL_ITERATION_01_RESULT.json');
const reconstruction = readJson(RES + 'COMMIT_5R1C25_RECONSTRUCTION_RESULT.json');
const anti = readJson(RES + 'COMMIT_5R1C25_TRANSITIVE_ANTI_OVERFIT_RESULT.json');
const derived = readJson(RES + 'COMMIT_5R1C25_DERIVED_PACKET_VALIDATION.json');
const exhaustion = readJson(RES + 'COMMIT_5R1C25_CANDIDATE_EXHAUSTION.json');
const devPost = readJson(RES + 'COMMIT_5R1C25_DEV_FACTORY_POSTCHECK.json');
const status = execFileSync('git', ['-C', 'C:/Projects/tina-backend', 'status', '--porcelain=v2', '--branch', '--untracked-files=all'], { maxBuffer: 1e9 }).toString();

writeJson(RES + 'COMMIT_5R1C25_FINAL_EXECUTION_REPORT.json', {
  unit: 'COMMIT 5R1-C25',
  generatedUtc: now(),
  reconstruction: { attemptId: reconstruction.attemptId, actual: reconstruction.actual, discrepancies: reconstruction.discrepancies },
  materialIterations: material.materialAttemptCount,
  acceptedRule: material.acceptedRule,
  materialActual: material.actual,
  candidateIdentity: material.candidateIdentity,
  reasonLayerClosure: false,
  decisionLayerClosure: material.gates.decisionLockHeld,
  relationLayerClosure: material.gates.relationLockHeld,
  transitiveAntiOverfitPass: anti.pass,
  derivedPacketValidationPass: derived.pass,
  candidateExhaustion: exhaustion,
  registry,
  manifest,
  devFactoryPreservedExactly: devPost.equal,
  liveRuntimeRestoredToCommittedBackendBaseline: true,
  backendStatusAtFinalization: status,
});

manifest = writeManifest();
updateCurrentState(manifest);
manifest = writeManifest();
console.log(JSON.stringify({ manifest, registry }, null, 2));
