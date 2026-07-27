// PHASE-10A14-R20 COMMIT 5R1-C19 — §3 mandatory C18 iteration-accounting reconciliation.
// Runs BEFORE any coding or reconstruction. Reads committed evidence only; writes one
// new reconciliation record and does not touch any C18 file.
import fs from 'node:fs';
import * as L from './commit5r1c19-lib.mjs';

const reg = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C18_REASON_LOCK.json', 'utf8'));

// ---- registry-backed C18 campaign census ---------------------------------------
const c18 = reg.attempts.filter((a) => a.attemptId.includes('commit5r1c18'));
const reconstruction = c18.filter((a) => a.cycle.endsWith('-recon'));
const material = c18.filter((a) => /-dev-\d+$/.test(a.cycle));
const accepted = material.filter((a) => String(a.disposition).startsWith('accepted'));
const rejected = material.filter((a) => a.disposition === 'rejected');
const verification = c18.filter((a) => a.cycle.includes('-lock'));

// ---- orphan / dangling proof ----------------------------------------------------
const dirs = fs.readdirSync(L.ATT);
const known = new Set(reg.attempts.map((a) => a.attemptId));
const orphanDirs = dirs.filter((d) => !known.has(d));
const danglingAttempts = reg.attempts.filter((a) => !dirs.includes(a.attemptId));

// ---- committed claims in conflict ------------------------------------------------
const claims = {
  commitMessageAndCurrentState: 'five of five material iterations (3 accepted, 1 rejected)',
  reasonLockRecord: {
    materialIterationsUsed: lock.materialIterationsUsed,
    materialIterationsPermitted: lock.materialIterationsPermitted,
    rejectedCandidates: lock.rejectedCandidates,
    iterationCeilingReached: lock.iterationCeilingReached,
  },
};

const registryBacked = {
  newlyRegisteredCampaigns: c18.length,
  reconstruction: reconstruction.length,
  materialRuntimeCampaigns: material.length,
  accepted: accepted.length,
  rejected: rejected.length,
  cleanLockVerification: verification.length,
  cycles: c18.map((a) => ({ cycle: a.cycle, disposition: a.disposition, status: a.status, controlling: a.controlling !== false })),
};

// The determination. No unregistered evidence-bearing runtime attempt exists, so the
// first §3 branch applies.
const unregisteredRuntimeAttemptExists = orphanDirs.length > 0;
const determination = unregisteredRuntimeAttemptExists
  ? 'ORPHAN_EVIDENCE_PRESENT_STOP_BEFORE_REMEDIATION'
  : 'HISTORICAL_ITERATION_ACCOUNTING_DEFECT';

L.writeJson(L.RES + 'COMMIT_5R1C19_C18_ITERATION_ACCOUNTING_RECONCILIATION.json', {
  unit: 'COMMIT 5R1-C19', generatedUtc: new Date().toISOString(),
  scope: 'Section 3 reconciliation of C18 iteration accounting against committed registry evidence. Reads only; no C18 file is rewritten or deleted.',
  registryTotals: { before: 149, after: reg.attempts.length, increase: reg.attempts.length - 149 },
  registryBacked,
  conflictingCommittedClaims: claims,
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
    whatWasClaimed: 'C18 reported "five of five material iterations". Its own reason-lock record separately reported materialIterationsUsed=3 with rejectedCandidates=2, which sums to 5 but does not match the registry either (3 accepted + 1 rejected = 4).',
    whatIsTrue: 'Four material runtime campaigns were registered and executed: dev-02 accepted, dev-03 accepted, dev-04 rejected, dev-05 accepted. Plus one reconstruction. Five newly registered campaigns in total.',
    rootCause: 'Pre-implementation rule SIMULATIONS were counted toward the material-iteration budget. Six candidate rules were simulated and rejected before any runtime write; a simulation allocates no attempt, writes no runtime file and produces no evidence-bearing campaign, so it is not a material iteration.',
    consequence: 'C18 reported its iteration budget as exhausted when one material iteration remained available. No result, score, gate or disposition is affected: every reported metric was produced by a registered campaign and is reproducible.',
    scoresAffected: false,
    evidenceAffected: false,
    registryAffected: false,
  },
  sixSimulationsAreNotRuntimeAttempts: {
    statement: 'The six rules rejected by the C18 rule-effect simulator are recorded in COMMIT_5R1C18_RULE_EFFECT_SIMULATOR.json and its batch files. They are analysis artefacts, not runtime attempts, and are correctly absent from the registry.',
    simulatorEvidencePaths: [
      L.RES + 'COMMIT_5R1C18_RULE_EFFECT_SIMULATOR.json',
      L.RES + 'COMMIT_5R1C18_RULE_EFFECT_SIMULATOR_BATCH2.json',
      L.RES + 'COMMIT_5R1C18_RULE_EFFECT_SIMULATOR_BATCH3.json',
    ],
  },
  remediation: {
    c18FilesRewritten: 0,
    c18FilesDeleted: 0,
    correctionMethod: 'Prospective. The authoritative registry-backed count is recorded here and stated in the C19 CURRENT_STATE update. C18 evidence is preserved exactly as committed.',
  },
  currentStateStaleTimestamp: {
    observed: '2026-07-25T12:30:00Z',
    finding: 'The CURRENT_STATE "Last updated" value has not tracked the units committed since. It is replaced with the actual C19 final UTC timestamp in the mandatory final update.',
  },
});

console.log('registry increase 149 ->', reg.attempts.length, '=', reg.attempts.length - 149, 'new campaigns');
console.log('C18 census: reconstruction', reconstruction.length, '| material', material.length,
  '(accepted', accepted.length, ', rejected', rejected.length, ') | lock verifications', verification.length);
console.log('orphan dirs:', orphanDirs.length, ' dangling:', danglingAttempts.length);
console.log('lock record claimed: used', lock.materialIterationsUsed, 'rejected', lock.rejectedCandidates);
console.log('DETERMINATION:', determination);
console.log('authoritative material iterations =', material.length, 'of 5 permitted; ceiling actually reached =', material.length >= 5);
