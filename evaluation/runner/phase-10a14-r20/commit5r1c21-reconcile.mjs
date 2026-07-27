// PHASE-10A14-R20 COMMIT 5R1-C21 - mandatory C20 accounting reconciliation.
// Reads committed C20 evidence and derives all iteration counts mechanically.
import fs from 'node:fs';
import * as L from './commit5r1c20-lib.mjs';

const reg = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C20_REASON_LOCK.json', 'utf8'));

const c20 = reg.attempts.filter((a) => a.attemptId.includes('commit5r1c20'));
const reconstruction = c20.filter((a) => a.cycle === 'commit5r1c20-recon' || a.cycle.endsWith('-recon'));
const material = c20.filter((a) => /^commit5r1c20-dev-\d+$/.test(a.cycle));
const accepted = material.filter((a) => String(a.disposition || '').startsWith('accepted'));
const rejected = material.filter((a) => a.disposition === 'rejected');
const other = material.filter((a) => !String(a.disposition || '').startsWith('accepted') && a.disposition !== 'rejected');
const verification = c20.filter((a) => /lock|verification/.test(a.cycle));

const dirs = fs.readdirSync(L.ATT).filter((d) => d.includes('commit5r1c20'));
const registered = new Set(c20.map((a) => a.attemptId));
const orphanDirs = dirs.filter((d) => !registered.has(d));
const dangling = c20.filter((a) => !fs.existsSync(L.ATT + a.attemptId + '/ATTEMPT.json'));
const materialIterationsPermitted = 5;
const derivedIterationCeilingReached = material.length >= materialIterationsPermitted;

if (c20.length !== 5 || reconstruction.length !== 1 || material.length !== 4 ||
    accepted.length !== 4 || rejected.length !== 0 || orphanDirs.length || dangling.length) {
  const detail = { c20: c20.length, reconstruction: reconstruction.length, material: material.length,
    accepted: accepted.length, rejected: rejected.length, orphanDirs, dangling: dangling.map((a) => a.attemptId) };
  throw new Error('C20_ACCOUNTING_RECONCILIATION_STOP ' + JSON.stringify(detail));
}

const reconciliation = {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  scope: 'Section 3 reconciliation of C20 iteration accounting before C21 reconstruction or semantic coding.',
  registryBackedC20Evidence: {
    registryIncrease: { before: 159, after: 164, increase: 5 },
    campaigns: c20.map((a) => ({ attemptId: a.attemptId, cycle: a.cycle, disposition: a.disposition, status: a.status })),
    reconstructionCount: reconstruction.length,
    materialRuntimeIterations: material.length,
    acceptedMaterialIterations: accepted.length,
    rejectedMaterialIterations: rejected.length,
    otherMaterialDispositions: other.map((a) => ({ cycle: a.cycle, disposition: a.disposition })),
    permitted: materialIterationsPermitted,
  },
  committedInconsistency: {
    source: 'COMMIT_5R1C20_REASON_LOCK.json',
    materialIterationsUsed: lock.materialIterationsUsed,
    materialIterationsPermitted: lock.materialIterationsPermitted,
    iterationCeilingReached: lock.iterationCeilingReached,
  },
  requiredMechanicalDerivation: {
    expression: 'materialIterationsUsed >= materialIterationsPermitted',
    materialIterationsUsed: material.length,
    materialIterationsPermitted,
    derivedIterationCeilingReached,
  },
  determination: lock.iterationCeilingReached !== derivedIterationCeilingReached
    ? 'HISTORICAL_ITERATION_CEILING_FLAG_DEFECT'
    : 'NO_C20_ITERATION_CEILING_FLAG_DEFECT',
  consequence: {
    c20ScoreInvalidated: false,
    c20GateInvalidated: false,
    c20CandidateInvalidated: false,
    c20AttemptDispositionInvalidated: false,
    c20RuntimeEvidenceInvalidated: false,
    c20FilesRewritten: 0,
    prospectiveCorrectionInC21CurrentStateRequired: true,
  },
  orphanCheck: {
    attemptDirectoriesOnDisk: dirs.length,
    registeredC20Attempts: c20.length,
    orphanDirectories: orphanDirs.length,
    danglingRegisteredAttempts: dangling.length,
  },
};

const validator = {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  source: 'CANONICAL_ATTEMPT_REGISTRY.json',
  derivation: 'Counts are derived from registered attempt cycles, not hand-entered.',
  prefix: 'commit5r1c20',
  reconstructionCount: reconstruction.length,
  materialDevCount: material.length,
  acceptedMaterialCount: accepted.length,
  rejectedMaterialCount: rejected.length,
  otherDispositions: other.map((a) => ({ attemptId: a.attemptId, cycle: a.cycle, disposition: a.disposition })),
  materialBudgetUsed: material.length,
  materialBudgetPermitted: materialIterationsPermitted,
  materialBudgetRemaining: Math.max(0, materialIterationsPermitted - material.length),
  iterationCeilingReached: derivedIterationCeilingReached,
  cleanLockVerificationCount: verification.length,
  registryTotal: reg.attempts.length,
  registrySummary: reg.summary,
  orphanDirectories: orphanDirs,
  danglingRegisteredAttempts: dangling.map((a) => a.attemptId),
  pass: reconstruction.length === 1 && material.length === 4 && accepted.length === 4 &&
    rejected.length === 0 && other.length === 0 && !derivedIterationCeilingReached &&
    orphanDirs.length === 0 && dangling.length === 0,
};

L.writeJson(L.RES + 'COMMIT_5R1C21_C20_ITERATION_AND_CONTINUITY_RECONCILIATION.json', reconciliation);
L.writeJson(L.RES + 'COMMIT_5R1C21_ITERATION_ACCOUNTING_VALIDATOR.json', validator);

console.log('C20 campaigns:', c20.length, '= recon', reconstruction.length, '+ material', material.length);
console.log('accepted', accepted.length, 'rejected', rejected.length, 'permitted', materialIterationsPermitted);
console.log('iterationCeilingReached derived =', derivedIterationCeilingReached);
console.log('determination:', reconciliation.determination);
