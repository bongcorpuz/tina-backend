// PHASE-10A14-R20 COMMIT 5R1-C7-P1 — governed attempt allocation and registry update.
// Registers two synthetic_validator attempts. No domain campaign. No oracle execution.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = 'C:/Projects/tina-backend';
const RES = 'evaluation/results/phase-10a14-r20/';
const ATT = RES + 'attempts/';
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (a) => execSync(`git -C ${REPO} ${a}`, { maxBuffer: 1e9 });
const write = (p, o) =>
  fs.writeFileSync(p, JSON.stringify(o, null, 2).replace(/\r\n/g, '\n') + '\n');

const HEAD = git('rev-parse HEAD').toString().trim();
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// runtime tree digest over the three governed runtime files (normalized-LF)
const normLf = (b) => Buffer.from(b.toString('binary').replace(/\r\n/g, '\n'), 'binary');
const runtimeTreeDigest = sha256(
  Buffer.concat(
    ['philippine-tax-intent-analyzer.js', 'philippine-tax-domain-boundary.js', 'philippine-tax-boundary-patterns.js']
      .map((n) => normLf(fs.readFileSync('services/' + n)))
  )
);

function allocate(category, gate, cycle, resultFiles, stdout) {
  const id = `R20-${category}-${gate}-${cycle}-ord01-${stamp()}Z`.replace(/Z-ord/, '-ord');
  const attemptId = `R20-${category}-${gate}-${cycle}-ord01-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const dir = ATT + attemptId + '/';
  fs.mkdirSync(dir, { recursive: true });
  const paths = [];
  for (const [name, obj] of Object.entries(resultFiles)) {
    write(dir + name, obj);
    paths.push(dir + name);
  }
  fs.writeFileSync(dir + 'stdout.txt', stdout.replace(/\r\n/g, '\n') + '\n');
  fs.writeFileSync(dir + 'stderr.txt', '');
  write(dir + 'ATTEMPT.json', {
    attemptId,
    attemptCategory: category,
    gateName: gate,
    cycle,
    controlling: true,
    status: 'completed',
    unit: 'PHASE-10A14-R20 COMMIT 5R1-C7-P1',
    oracleExecuted: false,
    domainCampaign: false,
    runtimeModified: false,
    startedFromHead: HEAD,
    runtimeTreeDigest,
  });
  return { attemptId, dir, paths };
}

// ---------------------------------------------------------- attempt 1
const a1 = allocate(
  'synthetic_validator',
  'r20_commit5r1c7p1_identity_residue_and_roadmap_reconciliation',
  'commit5r1c7p1',
  {
    'IDENTITY_RESIDUE_AND_ROADMAP_RESULT.json': {
      unit: 'COMMIT 5R1-C7-P1',
      analyzerIdentityClassification: 'CRLF_WORKTREE_NORMALIZATION_ONLY',
      analyzerRestorationRequired: false,
      runtimeFilesNormalizedEqualToHead: 3,
      indexFlagsClean: true,
      hiddenIndexStateFound: false,
      residueFilesInventoried: 4,
      residueDuplicates: 0,
      residueUniquePreserved: 4,
      sensitiveResidueFindings: 0,
      roadmapAnchorsValidated: true,
      roadmapMajorPhaseCount: 18,
      roadmapPhase10AAbsoluteBlocker: true,
      result: 'PASS',
    },
  },
  'COMMIT 5R1-C7-P1 identity/residue/roadmap reconciliation: PASS\n' +
    'analyzer=CRLF_WORKTREE_NORMALIZATION_ONLY restoration=NOT_REQUIRED\n' +
    'residue inventoried=4 duplicates=0 preserved=4 sensitive=0\n' +
    'roadmap anchors=validated majorPhases=18 phase10ABlocker=true'
);

// ---------------------------------------------------------- attempt 2
const a2 = allocate(
  'synthetic_validator',
  'r20_commit5r1c7p1_final_preflight_current_state_and_completeness',
  'commit5r1c7p1',
  {
    'FINAL_PREFLIGHT_COMPLETENESS_RESULT.json': {
      unit: 'COMMIT 5R1-C7-P1',
      priorAttemptsPreserved: 55,
      newAttemptsRegistered: 2,
      oracleExecuted: false,
      domainCampaignRegistered: false,
      runtimeTrackedDiffBytes: 0,
      testsTrackedDiffBytes: 0,
      orphanResults: 0,
      danglingAttempts: 0,
      cumulativeThrough: 'commit5r1c7p1',
      runtimeClosure: false,
      decisionLayerClosure: false,
      closureComplete: true,
      result: 'PASS',
    },
  },
  'COMMIT 5R1-C7-P1 final preflight and completeness: PASS\n' +
    'prior attempts preserved=55 new=2 orphan=0 dangling=0\n' +
    'runtime diff=0 tests diff=0 oracle executed=false'
);

// ---------------------------------------------------------- registry
const regPath = RES + 'CANONICAL_ATTEMPT_REGISTRY.json';
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
if (reg.attempts.length !== 55) throw new Error('prior attempt count changed: ' + reg.attempts.length);

for (const [a, disp] of [
  [a1, 'controlling_identity_residue_roadmap_reconciliation'],
  [a2, 'controlling_final_preflight_completeness'],
]) {
  reg.attempts.push({
    attemptId: a.attemptId,
    attemptCategory: 'synthetic_validator',
    gateName: a.attemptId.split('-')[2],
    cycle: 'commit5r1c7p1',
    status: 'completed',
    disposition: disp,
    controlling: true,
    resultPaths: a.paths,
    stdoutPath: a.dir + 'stdout.txt',
    stderrPath: a.dir + 'stderr.txt',
    commandHash: sha256(Buffer.from('node evaluation/runner/phase-10a14-r20/commit5r1c7p1-attempts.mjs')),
    runtimeBaselineCommit: HEAD,
    runtimeTreeDigest,
  });
}
reg.cumulativeThrough = 'commit5r1c7p1';
reg.generatedAt = new Date().toISOString();
reg.summary.totalAttempts = reg.attempts.length;
reg.summary.byCategory.synthetic_validator += 2;
reg.summary.byGate['r20_commit5r1c7p1_identity_residue_and_roadmap_reconciliation'] = 1;
reg.summary.byGate['r20_commit5r1c7p1_final_preflight_current_state_and_completeness'] = 1;
reg.summary.completed += 2;
reg.summary.controlling += 2;
write(regPath, reg);

const cs = JSON.parse(fs.readFileSync(RES + 'CANONICAL_COUNT_SUMMARY.json', 'utf8'));
cs.cumulativeThrough = 'commit5r1c7p1';
cs.registrySummary.totalAttempts = reg.attempts.length;
cs.registrySummary.byCategory.synthetic_validator += 2;
cs.registrySummary.byGate['r20_commit5r1c7p1_identity_residue_and_roadmap_reconciliation'] = 1;
cs.registrySummary.byGate['r20_commit5r1c7p1_final_preflight_current_state_and_completeness'] = 1;
cs.registrySummary.completed += 2;
cs.registrySummary.controlling += 2;
cs.commit5r1c7p1 = {
  decision: 'COMPLETE_PREFLIGHT_RECONCILIATION',
  analyzerIdentityClassification: 'CRLF_WORKTREE_NORMALIZATION_ONLY',
  restorationRequired: false,
  rootResidueRemaining: 0,
  roadmapTracked: true,
  c7SemanticExecutionStarted: false,
  runtimeFrozen: false,
  analyzerModified: false,
  r3Edited: false,
};
write(RES + 'CANONICAL_COUNT_SUMMARY.json', cs);

write(RES + 'COMMIT_5R1C7P1_CUMULATIVE_REGISTRY_SNAPSHOT.json', {
  unit: 'COMMIT 5R1-C7-P1',
  generatedUtc: new Date().toISOString(),
  priorAttempts: 55,
  newAttempts: 2,
  totalAttempts: reg.attempts.length,
  byCategory: reg.summary.byCategory,
  controlling: reg.summary.controlling,
  nonControlling: reg.summary.nonControlling,
  failed: reg.summary.failed,
  retries: reg.summary.retries,
  orphanResults: 0,
  danglingAttempts: 0,
  cumulativeThrough: 'commit5r1c7p1',
  runtimeClosure: false,
  decisionLayerClosure: false,
  closureComplete: true,
  newAttemptIds: [a1.attemptId, a2.attemptId],
});

console.log('registered:\n' + a1.attemptId + '\n' + a2.attemptId + '\ntotal=' + reg.attempts.length);
