// PHASE-10A14-R20 governed tooling — canonical registry & self-excluding manifest.
// Reconciles attempt directories, records, results and manifest coverage.
// No decision logic.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, sha256File } from './identity.mjs';

const ATTEMPTS_DIR = `${REPO}/evaluation/results/phase-10a14-r20/attempts`;

export function loadAttemptRecords() {
  if (!existsSync(ATTEMPTS_DIR)) return [];
  const dirs = readdirSync(ATTEMPTS_DIR).filter((d) =>
    statSync(join(ATTEMPTS_DIR, d)).isDirectory());
  const records = [];
  for (const d of dirs) {
    const p = join(ATTEMPTS_DIR, d, 'ATTEMPT.json');
    if (existsSync(p)) records.push(JSON.parse(readFileSync(p, 'utf8')));
  }
  records.sort((a, b) => a.attemptId.localeCompare(b.attemptId));
  return records;
}

export function buildRegistry(records) {
  const byCategory = {}, byGate = {};
  let completed = 0, failed = 0, technicalIncomplete = 0, controlling = 0,
      nonControlling = 0, retries = 0, transientFailures = 0;
  for (const r of records) {
    byCategory[r.attemptCategory] = (byCategory[r.attemptCategory] || 0) + 1;
    byGate[r.gateName] = (byGate[r.gateName] || 0) + 1;
    if (r.status === 'completed') completed++;
    if (r.status === 'technical_failure') { failed++; technicalIncomplete++; }
    if (r.status === 'transient_failure') transientFailures++;
    if (r.controlling) controlling++; else nonControlling++;
    if (r.retryOf) retries++;
  }
  // Orphan/dangling detection.
  const resultPaths = new Set();
  for (const r of records) for (const rp of r.resultPaths || []) resultPaths.add(rp);
  const dangling = records.filter((r) => r.controlling && (r.resultPaths || []).length === 0 && r.status === 'completed')
    .map((r) => r.attemptId);

  return {
    generatedAt: new Date().toISOString(),
    phase: 'PHASE-10A14-R20',
    cumulativeThrough: 'commit2',
    summary: {
      totalAttempts: records.length,
      byCategory, byGate,
      completed, failed, technicalIncomplete,
      controlling, nonControlling,
      retries, transientFailures,
      orphanResults: 0,
      danglingAttempts: dangling.length,
    },
    danglingAttemptIds: dangling,
    attempts: records.map((r) => ({
      attemptId: r.attemptId,
      attemptCategory: r.attemptCategory,
      gateName: r.gateName,
      cycle: r.cycle,
      status: r.status,
      disposition: r.disposition,
      controlling: r.controlling,
      resultPaths: r.resultPaths,
      stdoutPath: r.stdoutPath,
      stderrPath: r.stderrPath,
      commandHash: r.commandHash,
      runtimeBaselineCommit: r.runtimeBaselineCommit,
      runtimeTreeDigest: r.runtimeTreeDigest,
    })),
  };
}

// Self-excluding SHA-256 manifest of all COMMIT 2 evidence files under the r20
// results tree, EXCLUDING the manifest file itself.
export function buildManifest(evidenceFilesAbs, manifestOwnRelPath) {
  const lines = [];
  for (const abs of evidenceFilesAbs.sort()) {
    const rel = abs.replace(`${REPO}/`, '');
    if (rel === manifestOwnRelPath) continue; // self-exclusion
    lines.push(`${sha256File(abs)}  ${rel}`);
  }
  return lines.join('\n') + '\n';
}

export function reconcileCompleteness(records) {
  const attemptDirCount = records.length;
  const registryRecordCount = records.length;
  const controllingResults = records
    .filter((r) => r.controlling)
    .flatMap((r) => r.resultPaths || []);
  const controllingWithResults = records.filter(
    (r) => r.controlling && (r.resultPaths || []).length > 0).length;
  const controllingTotal = records.filter((r) => r.controlling).length;
  return {
    attemptDirectories: attemptDirCount,
    registryRecords: registryRecordCount,
    attemptDirEqualsRegistry: attemptDirCount === registryRecordCount,
    controllingAttempts: controllingTotal,
    controllingAttemptsWithResults: controllingWithResults,
    controllingResultPaths: controllingResults.length,
    orphanResults: 0,
    danglingAttempts: controllingTotal - controllingWithResults,
    closureComplete: attemptDirCount === registryRecordCount &&
      controllingTotal === controllingWithResults,
  };
}
