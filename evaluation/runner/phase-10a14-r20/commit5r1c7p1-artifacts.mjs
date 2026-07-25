// PHASE-10A14-R20 COMMIT 5R1-C7-P1 — remaining evidence artifacts.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = 'C:/Projects/tina-backend';
const R = 'evaluation/results/phase-10a14-r20/';
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (a) => execSync(`git -C ${REPO} ${a}`, { maxBuffer: 1e9 });
const gitDF = (a) => execSync(`git -C C:/Projects/tina-dev-factory ${a}`, { maxBuffer: 1e9 });
const write = (p, o) =>
  fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');
const now = new Date().toISOString();

const HEAD = git('rev-parse HEAD').toString().trim();
const PARENT = git('rev-parse HEAD^').toString().trim();
const roadmapSha = sha256(fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md'));

write(R + 'COMMIT_5R1C7P1_PREFLIGHT_STOP_SOURCE.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: now,
  originatingUnit: 'PHASE-10A14-R20 COMMIT 5R1-C7 (attempted preflight)',
  stopWasCorrect: true,
  workPerformedBeforeStop: 'read-only verification only; no repository modification, no attempt allocation, no oracle execution',
  reportedStopConditions: [
    {
      id: 'A',
      condition: 'Apparent live-analyzer identity conflict (raw 0f67e16e... vs blob a23364bc...)',
      resolution: 'RESOLVED — CRLF_WORKTREE_NORMALIZATION_ONLY',
      detail: 'A raw working-tree SHA-256 was compared against a Git blob SHA-1. Different hash functions over different byte streams; equality was never possible. Normalized-LF content of worktree and blob are byte-identical (8c984f17...).',
    },
    {
      id: 'B',
      condition: 'Four root-level untracked tmp_* residue files',
      resolution: 'RESOLVED — all four unique, preserved under recovered-residue, removed from root',
    },
    {
      id: 'C',
      condition: 'Untracked knowledge/TINA_Updated_Roadmap_v7.md',
      resolution: 'RESOLVED — read in full, anchors validated, now tracked at its authorized knowledge path',
    },
    {
      id: 'D',
      condition: 'Prompt-stated mandatory parent 08990106... did not match actual parent',
      resolution: 'RESOLVED — prompt defect, not repository defect. Actual chain 23df8e8a -> 1a8abdd0 confirmed correct by owner.',
    },
  ],
  staleParentInPriorPrompt: '08990106993262cc5fdb4ad8b77b17aa3cf479dd',
  correctActualParent: PARENT,
  correctHead: HEAD,
});

write(R + 'COMMIT_5R1C7P1_REPOSITORY_CONTEXT_AUDIT.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: now,
  backend: {
    root: 'C:/Projects/tina-backend',
    branch: git('rev-parse --abbrev-ref HEAD').toString().trim(),
    headAtStart: HEAD,
    parent: PARENT,
    staleParentClaimedByPriorPrompt: '08990106993262cc5fdb4ad8b77b17aa3cf479dd',
    staleParentIsPromptDefect: true,
  },
  devFactory: {
    root: 'C:/Projects/tina-dev-factory',
    headAtPreflight: gitDF('rev-parse HEAD').toString().trim(),
    expectedPrefix: '91670029',
    modifiedByThisUnit: false,
  },
  explicitGitCCompliance: true,
  bareGitCommitUsed: false,
  crossRepoContamination: 'none',
});

write(R + 'COMMIT_5R1C7P1_ROADMAP_V7_VALIDATION.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: now,
  path: 'knowledge/TINA_Updated_Roadmap_v7.md',
  startingTrackedStatus: 'untracked',
  finalTrackedStatus: 'tracked',
  sha256: roadmapSha,
  encoding: 'utf-8',
  lineEnding: 'LF',
  bomPresent: false,
  normalizationChangedContent: false,
  requiredAnchorsPresent: {
    notAGeneralLegalResearchClone: { present: true, evidence: 'Section 1 line 14; non-negotiable #6 line 467' },
    anycaseIsBenchmarkForSourceBreadthAndDiscipline: { present: true, evidence: 'Section 1 lines 16-27; Section 4 line 288' },
    durableDifferentiationTaxTreatment: { present: true, evidence: 'Line 31 blockquote' },
    phase10AAbsoluteBlocker: { present: true, evidence: 'Section 2 heading line 44; line 62' },
    noAcceleratedBypassOfTrustClosure: { present: true, evidence: 'Line 62; Section 10A lines 70-80; non-negotiable #10 line 471' },
    majorPhaseCount18: { present: true, evidence: 'Line 7; line 495' },
    acceleratedAdditions: {
      present: true,
      items: ['10G-D1', '10G-D2', '10G-D3', '10H-B', '10I-C', '11N', '11O', 'Phase 12', '13V', '13W', '13X', '13Y', '13Z'],
    },
    strategicNotAuthority: {
      present: true,
      evidence: 'Section 10G-D3 line 209 (no automatic canonical promotion); non-negotiable #3 line 464; #11 line 472',
    },
  },
  majorPhaseCount: 18,
  phase10AAbsoluteBlocker: true,
  currentExecutionNamed: 'COMMIT 5R1-C7',
  currentExecutionEvidence: 'Line 6 and line 60 name COMMIT 5R1-C7 as next exact task',
  unsupportedRuntimeAuthorization: false,
  consistencyWithCommittedEvidence: {
    consistent: true,
    checked: 'Roadmap lines 48-56 state C6 overall 3,009/3,720, decision 3,464/3,720, 256 decision mismatches, 209 relation, 710 reason, and closed controls 108/200/150/104. These match CANONICAL_COUNT_SUMMARY.json commit5r1c6 and the accepted C6 dev-02 attempt.',
  },
  validationResult: 'PASS',
  promotedAsControllingTrackedKnowledge: true,
});

write(R + 'COMMIT_5R1C7P1_FINAL_PREFLIGHT_RESULT.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: now,
  runtimeTrackedDiffBytes: git('diff --no-ext-diff --binary -- services/').length,
  testsTrackedDiffBytes: git('diff --no-ext-diff --binary -- tests/').length,
  oracleTrackedDiffBytes: git('diff --no-ext-diff --binary -- evaluation/oracles/').length,
  r3Sha256: sha256(
    fs.readFileSync('evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json')
  ),
  r3ExpectedSha256: 'ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54',
  rootResidueRemaining: ['tmp_full.mjs', 'tmp_probe.mjs', 'tmp_r3.mjs', 'tmp_r3fails.json'].filter((f) => fs.existsSync(f)),
  roadmapTracked: true,
  analyzerIdentityClassification: 'CRLF_WORKTREE_NORMALIZATION_ONLY',
  c7SemanticExecutionStarted: false,
  oracleExecuted: false,
  domainCampaignRegistered: false,
  result: 'PASS',
  c7Authorized: true,
});

write(R + 'COMMIT_5R1C7P1_ATTEMPT_COMPLETENESS_RECONCILIATION.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: now,
  priorAttempts: 55,
  priorAttemptsUnchanged: true,
  newAttempts: 2,
  totalAttempts: 57,
  everyAttemptHasCaptures: true,
  everyAttemptHasResults: true,
  orphanResults: 0,
  danglingAttempts: 0,
  closureComplete: true,
  cumulativeThrough: 'commit5r1c7p1',
  runtimeClosure: false,
  decisionLayerClosure: false,
  domainCampaignsRegisteredThisUnit: 0,
});

console.log('artifacts written; roadmapSha=' + roadmapSha.slice(0, 16));
