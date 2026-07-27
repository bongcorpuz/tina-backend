// PHASE-10A14-R20 COMMIT 5R1-C20 — §3 mandatory C19 iteration-accounting reconciliation.
// Runs BEFORE reconstruction or semantic coding. Reads committed evidence only; writes
// one new reconciliation record and does not touch any C19 file.
import fs from 'node:fs';
import * as L from './commit5r1c20-lib.mjs';

const reg = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C19_REASON_LOCK.json', 'utf8'));

const c19 = reg.attempts.filter((a) => a.attemptId.includes('commit5r1c19'));
const reconstruction = c19.filter((a) => a.cycle.endsWith('-recon'));
const material = c19.filter((a) => /-dev-\d+$/.test(a.cycle));
const accepted = material.filter((a) => String(a.disposition).startsWith('accepted'));
const rejected = material.filter((a) => a.disposition === 'rejected');
const verification = c19.filter((a) => a.cycle.includes('-lock'));

const dirs = fs.readdirSync(L.ATT);
const known = new Set(reg.attempts.map((a) => a.attemptId));
const orphanDirs = dirs.filter((d) => !known.has(d));
const danglingAttempts = reg.attempts.filter((a) => !dirs.includes(a.attemptId));
const unregisteredRuntimeAttemptExists = orphanDirs.length > 0;

const determination = unregisteredRuntimeAttemptExists
  ? 'ORPHAN_EVIDENCE_PRESENT_STOP_BEFORE_REMEDIATION'
  : 'HISTORICAL_ITERATION_ACCOUNTING_DEFECT';

L.writeJson(L.RES + 'COMMIT_5R1C20_C19_ITERATION_ACCOUNTING_RECONCILIATION.json', {
  unit: 'COMMIT 5R1-C20', generatedUtc: new Date().toISOString(),
  scope: 'Section 3 reconciliation of C19 iteration accounting against committed registry evidence. Reads only; no C19 file is rewritten, deleted or silently repaired.',
  registryTotals: { before: 154, after: reg.attempts.length, increase: reg.attempts.length - 154 },
  registryBacked: {
    newlyRegisteredCampaigns: c19.length,
    reconstruction: reconstruction.length,
    materialRuntimeCampaigns: material.length,
    accepted: accepted.length,
    rejected: rejected.length,
    cleanLockVerification: verification.length,
    cycles: c19.map((a) => ({ cycle: a.cycle, disposition: a.disposition, status: a.status })),
  },
  conflictingCommittedClaims: {
    commitMessageAndCurrentState: 'five registered material iterations (2 accepted, 2 rejected)',
    userFacingReport: 'five iterations — 2 accepted, 1 rejected, 2 neutral',
    reasonLockRecord: {
      materialIterationsUsed: lock.materialIterationsUsed,
      rejectedCandidates: lock.rejectedCandidates,
      iterationCeilingReached: lock.iterationCeilingReached,
    },
  },
  orphanCheck: {
    attemptDirectoriesOnDisk: dirs.length,
    registeredAttempts: reg.attempts.length,
    orphanDirectories: orphanDirs.length,
    danglingRegisteredAttempts: danglingAttempts.length,
    unregisteredRuntimeAttemptExists,
  },
  determination,
  authoritativeCount: {
    materialRuntimeIterations: material.length,
    accepted: accepted.length,
    rejected: rejected.length,
    permitted: 5,
    ceilingActuallyReached: material.length >= 5,
    basis: 'registry-backed campaign census',
  },
  defectAnalysis: {
    whatWasClaimed: 'C19 stated "five registered material iterations" in its commit message and CURRENT_STATE, and reported "2 accepted, 1 rejected, 2 neutral" to the user. Its own reason-lock record stated materialIterationsUsed=2, rejectedCandidates=2, iterationCeilingReached=true.',
    whatIsTrue: 'The registry records five newly registered C19 campaigns: ONE reconstruction plus FOUR material runtime campaigns (dev-02 accepted, dev-03 rejected, dev-04 rejected, dev-05 accepted).',
    rootCause: 'Two distinct miscounts. First, the reconstruction campaign was counted toward the material-iteration budget; a reconstruction reproduces a prior candidate and is not a remediation iteration. Second, the user-facing report described two rejected campaigns as "1 rejected, 2 neutral", which does not match their registered dispositions — both dev-03 and dev-04 carry disposition "rejected".',
    consequence: 'C19 recorded iterationCeilingReached=true when only four of five material iterations had been used. No result, score, gate or disposition is affected: every reported metric was produced by a registered campaign and is reproducible, and both accepted candidates were correctly registered.',
    scoresAffected: false,
    evidenceAffected: false,
    registryAffected: false,
  },
  recurrenceNote: 'This is the SECOND consecutive unit with an iteration-accounting defect. C19 reconciled the same class of error in C18 (simulations counted as iterations) and then produced a different miscount of its own (reconstruction counted as an iteration, and rejected campaigns reported as neutral). The prospective fix is mechanical rather than narrative: the material-iteration count must be derived from the registry by filtering for the -dev- cycle pattern, never asserted by hand. C20 derives it that way.',
  remediation: {
    c19FilesRewritten: 0,
    c19FilesDeleted: 0,
    correctionMethod: 'Prospective. The authoritative registry-backed count is recorded here and stated in the C20 CURRENT_STATE update. C19 evidence is preserved exactly as committed.',
  },
});

console.log('registry increase 154 ->', reg.attempts.length, '=', reg.attempts.length - 154, 'new campaigns');
console.log('C19 census: reconstruction', reconstruction.length, '| material', material.length,
  '(accepted', accepted.length, ', rejected', rejected.length, ') | lock verifications', verification.length);
console.log('orphan dirs:', orphanDirs.length, ' dangling:', danglingAttempts.length);
console.log('lock record claimed: used', lock.materialIterationsUsed, 'rejected', lock.rejectedCandidates, 'ceiling', lock.iterationCeilingReached);
console.log('DETERMINATION:', determination);
console.log('authoritative material iterations =', material.length, 'of 5; ceiling actually reached =', material.length >= 5);
