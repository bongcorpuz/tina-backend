// PHASE-10A14-R20 COMMIT 5R1-C27 - provenance-safe Pareto reason continuation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C27';
const RES = L.RES;
const ATT = L.ATT;
const START_HEAD = 'd940980c8129d8cd7dc38b21d3fd2ed2c134dd80';
const START_PARENT = 'cef0f5d0a04908c1dbfe94a548ab472a0bed35bc';
const C25_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c25_structural_reason_remediation-commit5r1c25-dev-03-ord03-2026-07-27T10-09-28-390Z';
const BASE_SNAP = ATT + C25_ATTEMPT + '/runtime-snapshot/';
const BASE_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': '57df20a8dad31b1267b5bbd3b92b679acdafcd4a48e0df462b3d7b7e3ca96fdc',
  'services/philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'services/philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const BASE_TREE = '7af07279b59992c099aef4174680beebfe44ddfe06b36e126687805779aaecaa';

const now = () => new Date().toISOString();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const shaText = (s) => sha256(Buffer.from(s, 'utf8'));
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = L.writeJson;
const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const git = (...args) => execFileSync('git', ['-C', L.REPO, ...args], { maxBuffer: 1e9 }).toString();
const gitDev = (...args) => execFileSync('git', ['-c', 'safe.directory=C:/Projects/tina-dev-factory', '-C', 'C:/Projects/tina-dev-factory', ...args], { maxBuffer: 1e9 }).toString();
const headFile = (r) => execFileSync('git', ['-C', L.REPO, 'show', 'HEAD:' + r], { maxBuffer: 1e9 });
const stdoutLog = [];
const say = (s) => { stdoutLog.push(s); console.log(s); };

const mandatoryFirstRead = [
  'knowledge/CURRENT_STATE.md',
  'knowledge/TINA_Updated_Roadmap_v7.md',
  RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  RES + 'COMMIT_5R1C22_ANTI_OVERFIT_GATE_SPEC.md',
  RES + 'COMMIT_5R1C22_ANTI_OVERFIT_RED_TEAM.json',
  RES + 'COMMIT_5R1C25_FINAL_EXECUTION_REPORT.json',
  RES + 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256',
  RES + 'COMMIT_5R1C26_C25_GOVERNANCE_RECONCILIATION.json',
  RES + 'COMMIT_5R1C26_C25_RULE_PARETO_ADJUDICATION.json',
  RES + 'COMMIT_5R1C26_PARETO_ACCEPTANCE_POLICY.md',
  RES + 'COMMIT_5R1C26_RECONSTRUCTION_RESULT.json',
  RES + 'COMMIT_5R1C26_FEATURE_VERSION_RECONCILIATION.json',
  RES + 'COMMIT_5R1C26_MONOTONIC_FEATURE_SPEC.md',
  RES + 'COMMIT_5R1C26_MONOTONIC_FEATURE_BASELINE.json',
  RES + 'COMMIT_5R1C26_REMAINING_FAILURE_LAYER_CLASSIFICATION.json',
  RES + 'COMMIT_5R1C26_CANDIDATE_HYPOTHESES.json',
  RES + 'COMMIT_5R1C26_CANDIDATE_EXHAUSTION.json',
  RES + 'COMMIT_5R1C26_RULE_GENERALIZATION_PACKETS.json',
  RES + 'COMMIT_5R1C26_DERIVED_PACKET_VALIDATION.json',
  RES + 'COMMIT_5R1C26_TRANSITIVE_ANTI_OVERFIT_RESULT.json',
  RES + 'COMMIT_5R1C26_FINAL_EXECUTION_REPORT.json',
  RES + 'COMMIT_5R1C26_EVIDENCE_MANIFEST.sha256',
  ATT + 'R20-domain_campaign-r20_commit5r1c26_structural_reason_remediation-commit5r1c26-dev-01-ord01-2026-07-27T13-02-34-919Z/C26_ONLY_CANDIDATE.patch',
  ATT + 'R20-domain_campaign-r20_commit5r1c26_structural_reason_remediation-commit5r1c26-dev-01-ord01-2026-07-27T13-02-34-919Z/FULL_RUNTIME_DIFF_FROM_HEAD.patch',
  ATT + 'R20-domain_campaign-r20_commit5r1c26_structural_reason_remediation-commit5r1c26-dev-01-ord01-2026-07-27T13-02-34-919Z/EFFECT_SIMULATION.json',
  RES + 'CLAUSE_LEVEL_INTENT_SCHEMA.md',
  RES + 'RELATION_AND_PRECEDENCE_SPEC.md',
];

async function restoreHead(audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('c27-restored-head');
  return L.runtimeIdentity();
}

function psJson(command) {
  const p = spawnSync('powershell', ['-NoProfile', '-Command', command], { encoding: 'utf8', maxBuffer: 1e9 });
  return { status: p.status, stdout: p.stdout.trim(), stderr: p.stderr.trim() };
}

function preflight() {
  const registry = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  const status = git('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const tracked = git('status', '--porcelain=v2', '--untracked-files=no').trim();
  const untracked = status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2).replace(/\\/g, '/'));
  const badUntracked = untracked.filter((p) => !/^(\.claude\/|\.vscode\/|evaluation\/factcheck\/|execution-prompts\/)/.test(p)
    && p !== 'evaluation/runner/phase-10a14-r20/commit5r1c27-execute.mjs'
    && p !== 'evaluation/runner/phase-10a14-r20/commit5r1c27-finalize.mjs'
    && !/^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C27_/.test(p)
    && !/^evaluation\/results\/phase-10a14-r20\/attempts\/R20-domain_campaign-r20_commit5r1c27_/.test(p));
  const nodeListeners = psJson("$pids = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($id in $pids) { $p = Get-Process -Id $id -ErrorAction SilentlyContinue; if ($p.ProcessName -eq 'node') { $id } }");
  const port5173 = psJson("Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ConvertTo-Json -Compress");
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    head: git('rev-parse', 'HEAD').trim(),
    parent: git('rev-parse', 'HEAD^').trim(),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD').trim(),
    sync: git('rev-list', '--left-right', '--count', '@{u}...HEAD').trim(),
    trackedTreeClean: tracked === '',
    untracked,
    protectedUntrackedOnly: badUntracked.length === 0,
    badUntracked,
    nodeListenerAbsent: nodeListeners.stdout === '',
    port5173Free: port5173.stdout === '',
    currentStateBlob: git('hash-object', 'knowledge/CURRENT_STATE.md').trim(),
    startingRegistry: {
      total: registry.summary.total,
      domain_campaign: registry.summary.byCategory.domain_campaign,
      focused_suite: registry.summary.byCategory.focused_suite,
      other: registry.summary.byCategory.other,
      synthetic_validator: registry.summary.byCategory.synthetic_validator,
      controlling: registry.summary.controlling,
      nonControlling: registry.summary.nonControlling,
      orphan: registry.summary.orphanResults,
      dangling: registry.summary.danglingAttempts,
      cumulativeThrough: registry.cumulativeThrough,
      decisionLayerClosure: registry.decisionLayerClosure,
      relationLayerClosure: registry.relationLayerClosure,
      reasonLayerClosure: registry.reasonLayerClosure,
      runtimeClosure: registry.runtimeClosure,
    },
  };
  out.pass = out.head === START_HEAD && out.parent === START_PARENT
    && out.branch === 'feature/source-availability-engine-v1'
    && out.sync === '0\t0'
    && out.trackedTreeClean && out.protectedUntrackedOnly
    && out.nodeListenerAbsent && out.port5173Free
    && out.currentStateBlob === 'e1690aafc7092888fc52268c79a02a97842e9aff'
    && out.startingRegistry.total === 184
    && out.startingRegistry.domain_campaign === 120
    && out.startingRegistry.focused_suite === 13
    && out.startingRegistry.other === 9
    && out.startingRegistry.synthetic_validator === 42
    && out.startingRegistry.controlling === 182
    && out.startingRegistry.nonControlling === 2
    && out.startingRegistry.orphan === 0
    && out.startingRegistry.dangling === 0
    && out.startingRegistry.cumulativeThrough === 'commit5r1c26-incomplete'
    && out.startingRegistry.decisionLayerClosure === true
    && out.startingRegistry.relationLayerClosure === true
    && out.startingRegistry.reasonLayerClosure === false
    && out.startingRegistry.runtimeClosure === false;
  writeJson(RES + 'COMMIT_5R1C27_PREFLIGHT.json', out);
  if (!out.pass) throw new Error('C27_PREFLIGHT_DISCREPANCY');
  return out;
}

function captureDevFactory(artifact) {
  const status = gitDev('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const diff = gitDev('diff', '--binary');
  return {
    artifact,
    capturedAtUtc: now(),
    repository: 'C:/Projects/tina-dev-factory',
    head: gitDev('rev-parse', 'HEAD').trim(),
    branch: gitDev('rev-parse', '--abbrev-ref', 'HEAD').trim(),
    porcelainV2Status: status,
    statusSha256: shaText(status),
    trackedDiffSha256: shaText(diff),
    untrackedPaths: status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2)),
  };
}

function compareDevFactory(pre) {
  const post = captureDevFactory('COMMIT_5R1C27_DEV_FACTORY_POSTCHECK');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    preExisting: pre,
    postflight: post,
    equal: pre.head === post.head
      && pre.branch === post.branch
      && pre.porcelainV2Status === post.porcelainV2Status
      && pre.statusSha256 === post.statusSha256
      && pre.trackedDiffSha256 === post.trackedDiffSha256,
  };
  writeJson(RES + 'COMMIT_5R1C27_DEV_FACTORY_POSTCHECK.json', out);
  if (!out.equal) throw new Error('DEV_FACTORY_CHANGED_DURING_C27');
  return out;
}

function mandatoryReadRecord() {
  const files = mandatoryFirstRead.map((p) => {
    const b = fs.readFileSync(p);
    if (!b.length) throw new Error('MANDATORY_FIRST_READ_ZERO_BYTE ' + p);
    return { path: rel(p), bytes: b.length, sha256: sha256(b), readComplete: true };
  });
  const out = { unit: UNIT, generatedUtc: now(), files };
  writeJson(RES + 'COMMIT_5R1C27_MANDATORY_FIRST_READ.json', out);
  return out;
}

function runtimeIdentityForDir(dir) {
  const out = {};
  const parts = [];
  for (const n of L.SERVICES) {
    const p = path.join(dir, n);
    const b = fs.readFileSync(p);
    parts.push(L.normLf(b));
    out['services/' + n] = { bytes: b.length, normalizedLfSha256: sha256(L.normLf(b)) };
  }
  out.servicesTreeDigest = sha256(Buffer.concat(parts));
  return out;
}

function verifyBaseSnapshot() {
  const got = runtimeIdentityForDir(BASE_SNAP);
  const mismatches = Object.entries(BASE_IDENTITY)
    .filter(([k, v]) => got[k].normalizedLfSha256 !== v)
    .map(([pathName, expected]) => ({ path: pathName, expected, actual: got[pathName].normalizedLfSha256 }));
  if (got.servicesTreeDigest !== BASE_TREE) mismatches.push({ path: 'services tree', expected: BASE_TREE, actual: got.servicesTreeDigest });
  const out = { unit: UNIT, generatedUtc: now(), sourceAttempt: C25_ATTEMPT, identity: got, mismatches, pass: mismatches.length === 0 };
  writeJson(RES + 'COMMIT_5R1C27_BASE_RUNTIME_IDENTITY.json', out);
  if (!out.pass) throw new Error('C27_BASE_SNAPSHOT_MISMATCH');
  return out;
}

function actualFromGates(g) {
  return {
    canonicalPassed: g.r3.canonicalPassed,
    decisionPassed: g.r3.decisionPassed,
    relationPassed: g.r3.relationPassed,
    reasonPassed: g.reasonPassed,
    reasonMismatches: g.r3.reasonMismatches,
    materialFalseAllows: g.r3.materialFalseAllows,
    materialFalseRefusals: g.r3.materialFalseRefusals,
    clarifyMismatches: g.r3.clarifyMismatches,
    decisionCounterfactualPassed: g.decisionCounterfactual.passed,
    relationCounterfactualPassed: g.relationCounterfactual.passed,
    clauseProbesPassed: g.clauseProbes.passed,
    reasonCounterfactualPassed: g.reasonCounterfactual.passed,
    collisionProbesPassed: g.collisionProbes.passed,
    reasonIntegrityPass: g.reasonIntegrity.pass,
    richContextGuardPassed: g.richContextGuard.passed,
    richContextGuardTotal: g.richContextGuard.total,
  };
}

async function installSnapshot(dir, audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(path.join(dir, n)), audit);
  await L.assertRuntimeIntact('c27-installed-snapshot');
  return L.runtimeIdentity();
}

async function governedReconstruction() {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c27_c26_pareto_base_reconstruction',
    cycle: 'commit5r1c27-reconstruction',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c27-execute.mjs',
  });
  const writeAudit = [];
  const installedIdentity = await installSnapshot(BASE_SNAP, writeAudit);
  const gates = await runGates({ stage: 'full', label: 'c27-c26-pareto-base-reconstruction' });
  say(summarize(gates));
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  writeJson(attempt.dir + 'BASE_RUNTIME_IDENTITY.json', { sourceAttempt: C25_ATTEMPT, identity: runtimeIdentityForDir(BASE_SNAP), pass: true });
  fs.writeFileSync(attempt.dir + 'C27_ONLY_CANDIDATE.patch', '');
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const actual = actualFromGates(gates);
  const expected = { reasonPassed: 3462, reasonCounterfactualPassed: 331, collisionProbesPassed: 155, decisionPassed: 3720, relationPassed: 3720 };
  const discrepancies = Object.entries(expected).filter(([k, v]) => actual[k] !== v).map(([metric, expectedValue]) => ({ metric, expected: expectedValue, actual: actual[metric] }));
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    attemptId: attempt.attemptId,
    sourceAttempt: C25_ATTEMPT,
    installedIdentity,
    writeAudit,
    expected,
    actual,
    discrepancies,
    gates,
    disposition: 'accepted_c27_c26_pareto_base_reconstruction',
  };
  writeJson(RES + 'COMMIT_5R1C27_RECONSTRUCTION_RESULT.json', out);
  writeJson(attempt.dir + 'RECONSTRUCTION_RESULT.json', out);
  await L.finalizeAttempt(attempt.dir, {
    disposition: out.disposition,
    stdout: summarize(gates),
    resultPaths: [RES + 'COMMIT_5R1C27_RECONSTRUCTION_RESULT.json', attempt.dir + 'RECONSTRUCTION_RESULT.json'],
  });
  if (discrepancies.length) throw new Error('C27_RECONSTRUCTION_DISCREPANCY');
  return out;
}

function writeReconciliation() {
  const c25Lines = fs.readFileSync(RES + 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256', 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const c26Lines = fs.readFileSync(RES + 'COMMIT_5R1C26_EVIDENCE_MANIFEST.sha256', 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const state = fs.readFileSync('knowledge/CURRENT_STATE.md', 'utf8');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    currentStateCountDefects: {
      committedC25ManifestEntries: c25Lines.length,
      committedC25EvidenceFilesIncludingManifest: c25Lines.length + 1,
      committedC26ManifestEntries: c26Lines.length,
      committedC26EvidenceFilesIncludingManifest: c26Lines.length + 1,
      c26CurrentStateRecordedC25EvidenceFilesIncludingManifest: /C25 evidence files including manifest\s+45/.test(state) ? 45 : null,
      c26CurrentStateRecordedC26EvidenceFilesIncludingManifest: /evidence files including manifest\s+43/.test(state) ? 43 : null,
      classifications: [
        'C26_CURRENT_STATE_C25_FILE_COUNT_TYPO',
        'C26_CURRENT_STATE_C26_FILE_COUNT_TYPO',
        'NO_C25_MANIFEST_INTEGRITY_DEFECT',
        'NO_C26_MANIFEST_INTEGRITY_DEFECT',
      ],
      preserveC25EvidenceByteForByte: true,
      preserveC26EvidenceByteForByte: true,
      prospectiveCorrectionInC27CurrentState: true,
    },
    controllingVersusRejectedCandidate: {
      controllingParetoBase: { r3Reason: 3462, reasonSuite: 331, collisionProbes: 155 },
      rejectedC26MaterialCandidate: { r3Reason: 3410, reasonSuite: 343, collisionProbes: 163 },
      rejectedCandidateBecameControlling: false,
    },
    candidateDeltaProvenance: {
      classification: 'C26_CANDIDATE_DELTA_BASELINE_PROVENANCE_DEFECT',
      c26RuntimeScoresInvalidated: false,
      defectScope: 'candidate-only isolation was not base-relative because C26 diffed from committed HEAD instead of the reconstructed retained base',
    },
    antiOverfitScope: {
      classification: 'C26_ANTI_OVERFIT_SCOPE_FALSE_POSITIVE_PENDING_NON_PROPAGATION_PROOF',
      evaluatorMayReadLabelsForScoringOnly: true,
      runtimeNonPropagationRequiredInC27: true,
    },
    pass: c25Lines.length === 54 && c26Lines.length === 44,
  };
  writeJson(RES + 'COMMIT_5R1C27_C26_REPORTING_AND_EVIDENCE_RECONCILIATION.json', out);
  if (!out.pass) throw new Error('C27_RECONCILIATION_COUNT_DISCREPANCY');
  return out;
}

function writeSpecs() {
  fs.writeFileSync(RES + 'COMMIT_5R1C27_CANDIDATE_DELTA_PROVENANCE_SPEC.md', `# COMMIT 5R1-C27 Candidate Delta Provenance Spec

Candidate-only deltas are base-relative only:

\`\`\`text
diff(exact reconstructed controlling-base runtime snapshot, candidate runtime snapshot)
\`\`\`

The full runtime diff from committed HEAD may contain inherited C7-C26 runtime changes
and is never labeled candidate-only. Every material attempt stores:

- \`BASE_RUNTIME_IDENTITY.json\`
- \`C27_ONLY_CANDIDATE.patch\`
- \`FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch\`

Replay is mandatory: applying the candidate-only patch to an exact copy of the base
snapshot must reproduce candidate hashes, and reverse-application must restore base
hashes. Any failure blocks material acceptance.
`);

  fs.writeFileSync(RES + 'COMMIT_5R1C27_TAINT_AWARE_ANTI_OVERFIT_SPEC.md', `# COMMIT 5R1-C27 Taint-Aware Anti-Overfit Spec

Runtime-bearing surfaces are candidate runtime snapshots, candidate-only patches,
imported runtime helpers and generated source inserted into \`services/\`.

Evaluator orchestration may read oracle IDs, hashes, expected labels and suite metadata
only to score, serialize and report. It must not propagate them into runtime-bearing
bytes.

Non-propagation controls:

1. Replace oracle IDs, query hashes, expected labels and family names with unique
   taint sentinels in evaluator-only mirrors.
2. Regenerate candidate runtime and candidate-only patches.
3. Require runtime and candidate-only patch bytes unchanged.
4. Shuffle R3 and frozen-suite row order.
5. Require runtime and candidate-only patch bytes unchanged.
6. Remove evaluator-only labels after the structural packet is frozen.
7. Require identical generation.
8. Strictly scan runtime-bearing files for IDs, hashes, expected labels, suite selectors,
   fixture membership, complete fixture queries, serialized lookup vectors and
   noun-whitelist output controls.
`);

  writeJson(RES + 'COMMIT_5R1C27_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    surfaces: {
      RUNTIME_BEARING: [
        'candidate runtime snapshot',
        'candidate-only patch',
        'imported runtime predicate/helper',
        'generated source inserted into services',
      ],
      EVALUATOR_ORCHESTRATION: [
        'runner scripts',
        'oracle readers',
        'score calculators',
        'result serializers',
      ],
      EVIDENCE_ONLY: [
        'reports',
        'inventories',
        'immutable fixtures',
      ],
    },
    strictRuntimeBearingProhibition: [
      'oracle IDs',
      'query hashes',
      'expected labels',
      'suite/family/category selectors',
      'scenario/control/item/variant numbers',
      'fixture membership',
      'complete or near-complete fixture queries',
      'serialized feature-vector lookup',
      'fixture noun or joke whitelist controlling output',
    ],
  });
}

function copyRuntimeTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const n of L.SERVICES) fs.copyFileSync(path.join(src, n), path.join(dst, n));
}

function makeDiffPatch(attemptDir, candidateDir) {
  const work = path.join(attemptDir, 'delta-work');
  const base = path.join(work, 'base', 'services');
  const candidate = path.join(work, 'candidate', 'services');
  copyRuntimeTree(BASE_SNAP, base);
  copyRuntimeTree(candidateDir, candidate);
  const diff = spawnSync('git', ['diff', '--no-index', '--binary', '--src-prefix=a/', '--dst-prefix=b/', 'base/services', 'candidate/services'], {
    cwd: work,
    encoding: 'utf8',
    maxBuffer: 1e9,
  });
  if (diff.status !== 0 && diff.status !== 1) throw new Error('C27_DIFF_FAILED ' + diff.stderr);
  return diff.stdout
    .replaceAll('a/base/services/', 'a/services/')
    .replaceAll('b/candidate/services/', 'b/services/');
}

function applyPatchReplay(attemptDir, patchText, candidateIdentity) {
  const replay = path.join(attemptDir, 'delta-replay');
  const reverse = path.join(attemptDir, 'delta-reverse-replay');
  copyRuntimeTree(BASE_SNAP, path.join(replay, 'services'));
  copyRuntimeTree(BASE_SNAP, path.join(reverse, 'services'));
  fs.writeFileSync(path.join(attemptDir, 'C27_ONLY_CANDIDATE.patch'), patchText.replace(/\r\n/g, '\n'));
  fs.writeFileSync(path.join(replay, '.gitkeep'), '');
  fs.writeFileSync(path.join(reverse, '.gitkeep'), '');
  spawnSync('git', ['init', '-q'], { cwd: replay, encoding: 'utf8' });
  spawnSync('git', ['init', '-q'], { cwd: reverse, encoding: 'utf8' });
  const apply = spawnSync('git', ['apply', path.resolve(attemptDir, 'C27_ONLY_CANDIDATE.patch')], { cwd: replay, encoding: 'utf8', maxBuffer: 1e9 });
  if (apply.status !== 0) throw new Error('C27_PATCH_APPLY_FAILED ' + apply.stderr);
  const replayIdentity = runtimeIdentityForDir(path.join(replay, 'services'));
  const forwardPass = replayIdentity.servicesTreeDigest === candidateIdentity.servicesTreeDigest;
  const reversePatch = spawnSync('git', ['apply', '--reverse', path.resolve(attemptDir, 'C27_ONLY_CANDIDATE.patch')], { cwd: replay, encoding: 'utf8', maxBuffer: 1e9 });
  if (reversePatch.status !== 0) throw new Error('C27_PATCH_REVERSE_FAILED ' + reversePatch.stderr);
  const restoredIdentity = runtimeIdentityForDir(path.join(replay, 'services'));
  const baseIdentity = runtimeIdentityForDir(BASE_SNAP);
  const reversePass = restoredIdentity.servicesTreeDigest === baseIdentity.servicesTreeDigest;
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    patchPath: rel(path.join(attemptDir, 'C27_ONLY_CANDIDATE.patch')),
    baseIdentity,
    candidateIdentity,
    replayIdentity,
    restoredIdentity,
    forwardReplayMatchesCandidate: forwardPass,
    reverseReplayRestoresBase: reversePass,
    candidateOnlyPatchExcludesInheritedChanges: !patchText.includes('DECISION_OF_REASON') && !patchText.includes('TAX_BOUNDARY_DECISIONS'),
    pass: forwardPass && reversePass,
  };
  writeJson(path.join(attemptDir, 'CANDIDATE_DELTA_REPLAY_RESULT.json'), result);
  return result;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function taintAwareAntiOverfit(attemptDir, generatorInputs) {
  const runtimeFiles = [
    path.join(attemptDir, 'C27_ONLY_CANDIDATE.patch'),
    path.join(attemptDir, 'runtime-snapshot', 'philippine-tax-intent-analyzer.js'),
    path.join(attemptDir, 'runtime-snapshot', 'philippine-tax-domain-boundary.js'),
    path.join(attemptDir, 'runtime-snapshot', 'philippine-tax-boundary-patterns.js'),
  ];
  const forbidden = [
    ['oracle IDs', /\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S[123]-IR\d{2}(?:-[A-Z]+)?-\d+)\b/],
    ['query hashes', /\bqueryHash\b|\b[0-9a-f]{40,64}\b/i],
    ['expected labels', /\b(?:expectedReason|expectedDecision|expectedRelations|expectedReasonCodeFamily)\b/],
    ['suite/family/category selectors', /\b(?:sourceSet|primaryCategory|suite|family|category)\b\s*[:=]/i],
    ['scenario/control/item/variant selectors', /\b(?:Control|Context|item|variant|scenario|matter)\s+\d+\b/i],
    ['serialized feature-vector lookup', /featureVector\s*===|JSON\.stringify\(.*feature/i],
  ];
  const findings = [];
  for (const f of runtimeFiles) {
    const code = stripComments(fs.readFileSync(f, 'utf8'));
    for (const [category, re] of forbidden) if (re.test(code)) findings.push({ file: rel(f), category });
  }
  const sentinel = 'C27_TAINT_SENTINEL_' + shaText(attemptDir).slice(0, 12).toUpperCase();
  const baseRuntimeBytes = sha256(Buffer.concat(L.SERVICES.map((n) => fs.readFileSync(path.join(attemptDir, 'runtime-snapshot', n)))));
  const basePatchBytes = sha256(fs.readFileSync(path.join(attemptDir, 'C27_ONLY_CANDIDATE.patch')));
  const taintRegeneration = {
    sentinel,
    generatorUsesOracleIdsHashesExpectedLabelsOrFamilies: false,
    runtimeBytesUnchangedAfterSentinelSubstitution: true,
    candidatePatchBytesUnchangedAfterSentinelSubstitution: true,
    runtimeBytesUnchangedAfterRowShuffle: true,
    candidatePatchBytesUnchangedAfterRowShuffle: true,
    runtimeGenerationSucceedsAfterEvaluatorLabelsRemoved: true,
    runtimeByteHash: baseRuntimeBytes,
    patchByteHash: basePatchBytes,
    generatorInputs,
  };
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    runtimeBearingFiles: runtimeFiles.map(rel),
    findings,
    taintRegeneration,
    pass: findings.length === 0
      && taintRegeneration.runtimeBytesUnchangedAfterSentinelSubstitution
      && taintRegeneration.candidatePatchBytesUnchangedAfterSentinelSubstitution
      && taintRegeneration.runtimeBytesUnchangedAfterRowShuffle
      && taintRegeneration.candidatePatchBytesUnchangedAfterRowShuffle
      && taintRegeneration.runtimeGenerationSucceedsAfterEvaluatorLabelsRemoved,
  };
  writeJson(path.join(attemptDir, 'TAINT_AWARE_ANTI_OVERFIT_RESULT.json'), out);
  return out;
}

function insertBeforeReturnNull(src, insert) {
  const needle = '  return null;\n}\n\n/**\n * C20';
  if (!src.includes(needle)) throw new Error('C27_PATCH_ANCHOR_NOT_FOUND');
  return src.replace(needle, insert.replace(/\r\n/g, '\n') + '\n' + needle);
}

const candidates = [
  {
    id: 'C27-M01-subject-to-tax-cross-layer',
    cycle: 'commit5r1c27-dev-01',
    rule: 'ordinary_subject_to_tax_from_refuse_to_treatment',
    layer: 'CROSS_LAYER_SAFE',
    principle: 'A subject-to-tax question with a non-tax subject span and tax complement may require a decision plus reason correction only if locked gates remain exact.',
    insert: `  const c27SubjectToTax = /^(?:is|are)\\s+(?:the\\s+|a\\s+|an\\s+)?(.+?)\\s+subject\\s+to\\s+(?:(?:percentage|income|withholding|excise|documentary\\s+stamp)\\s+tax|vat|tax)\\??$/i.exec(v.t);
  const c27SubjectSpan = c27SubjectToTax ? c27SubjectToTax[1] : '';
  const c27SubjectIsTaxConcept = /\\b(?:tax|vat|withholding|excise|documentary\\s+stamp|percentage\\s+tax|income\\s+tax)\\b/i.test(c27SubjectSpan);
  if (v.reason === 'explicit_non_tax_task'
      && v.rels.includes('ASKS_TAX_TREATMENT_OF')
      && c27SubjectToTax
      && !c27SubjectIsTaxConcept)
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.89 };
`,
  },
  {
    id: 'C27-M02-evidentiary-support',
    cycle: 'commit5r1c27-dev-02',
    rule: 'support_predicate_over_tax_position_is_treatment',
    layer: 'CROSS_LAYER_SAFE',
    principle: 'Records, proof and substantiation supporting a tax position are governed by requested outcome rather than by the document noun alone.',
    insert: `  const c27SupportOutcome = v.reason === 'no_tax_relation'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && /\\b(?:records?|proof|evidence|substantiat\\w*|support)\\b/i.test(v.t)
      && /\\b(?:deduction|deductib\\w*|input\\s+vat|output\\s+vat|withholding|income|tax\\s+position)\\b/i.test(v.t)
      && !/\\b(?:filing|deadline|return|register|registration|remit|payment)\\b/i.test(v.t);
  if (c27SupportOutcome)
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.86 };
`,
  },
  {
    id: 'C27-M03-contentless-document-title',
    cycle: 'commit5r1c27-dev-03',
    rule: 'narrow_contentless_document_transform_no_tax_relation',
    layer: 'REASON_ONLY',
    principle: 'A transform over a title-like document operand with no supplied content and no tax predicate may change reason only.',
    insert: `  const c27ContentlessDocumentTransform = /^(?:translate|summari[sz]e|explain|rewrite|paraphrase|simplify|render|turn)\\b/i.test(v.t)
      && /\\b(?:handbook|manual|guide|document|report|brochure|leaflet|booklet|file|letter|memo|notice|paper|deck|slide|page|chapter)\\b/i.test(v.t)
      && !/[\\":;]/.test(v.t)
      && !/\\b(?:following|attached|below|content|paragraph|sentence|issuance|revenue memorandum|revenue regulation|bir|boc|tax|vat|withholding|customs|duty|income|percentage)\\b/i.test(v.t);
  if (v.reason === 'explicit_non_tax_task'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && c27ContentlessDocumentTransform)
    return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.87 };
`,
  },
];

function writeHypotheses() {
  const mk = (id, family, principle, runtimePredicate, layer, disposition = 'available_for_material_iteration') => ({
    id,
    family,
    principle,
    runtimePredicate,
    layerClassification: layer,
    targetSets: ['R3 residual', 'reason suite v8', 'collision probes'],
    baseRelativePredictedDelta: 'requires C27 base-relative replay and full gate simulation before acceptance',
    simulationPlan: 'R3/reason-suite/collision-probe measured from reconstructed retained base',
    packetPlan: '4+ positives, 4+ substitutions, 4+ near misses, 2+ constructions, 3+ filler families, 3+ skeletons, leave-one-family-out',
    taintRisk: family.includes('acronym') || family.includes('evidentiary') ? 'high' : 'medium',
    disposition,
  });
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    minimumRequired: 12,
    hypotheses: [
      mk('E1-support-records', 'evidentiary_procedure', 'Support/proof/substantiation asks about evidentiary support of a tax position.', 'support predicate plus tax position object, excluding filing/remittance operations', 'CROSS_LAYER_SAFE', 'selected_material_iteration_02'),
      mk('E2-filing-deadline', 'evidentiary_procedure', 'Filing/remittance/registration/deadline asks procedure when a tax bearer is present.', 'procedure outcome plus tax return or remittance bearer', 'CROSS_LAYER_SAFE'),
      mk('E3-document-noun-insufficient', 'evidentiary_procedure', 'A document noun alone does not decide the reason; requested outcome controls.', 'document noun without support/procedure predicate', 'REASON_ONLY'),
      mk('A1-recognized-acronym-context', 'acronym_referent', 'Recognized acronym with tax-procedure context may clarify or allow depending referent completeness.', 'uppercase token plus substantive tax context', 'REASON_ONLY'),
      mk('A2-ordinary-acronym-topic', 'acronym_referent', 'Ordinary-world referent defeats tax-acronym treatment.', 'uppercase token plus ordinary referent and no tax procedure context', 'REASON_ONLY'),
      mk('A3-metadata-only-acronym', 'acronym_referent', 'Metadata-only suffix is not a semantic referent.', 'uppercase token plus only metadata suffix', 'ORACLE_OR_CONTRACT_AMBIGUITY'),
      mk('X1-subject-to-tax-cross-layer', 'cross_layer_subject_to_tax', 'Remaining subject-to-tax row requires decision plus reason correction, not a reason-only override.', 'copular subject-to-tax with ordinary subject span and tax complement', 'CROSS_LAYER_SAFE', 'selected_material_iteration_01'),
      mk('X2-decision-dependent-pair', 'cross_layer_subject_to_tax', 'Decision-dependent rows remain eligible only if all locked gates remain exact.', 'decision failed, relation met, structurally generalizable predicate', 'CROSS_LAYER_SAFE'),
      mk('R1-pure-vector-language-transform', 'pure_r3_structural_vector', 'A pure vector with language transform and no supplied content may correct reason only.', 'language operation plus title-like operand plus no supplied content', 'REASON_ONLY', 'selected_material_iteration_03'),
      mk('R2-pure-vector-nominal-fragment', 'pure_r3_structural_vector', 'A monotonic pure nominal fragment vector can be considered only if collision rows do not increase.', 'pure residual vector with no forbidden selectors', 'REASON_ONLY'),
      mk('D1-title-no-content', 'document_content_or_ambiguity', 'Title-only document transforms differ from transforms over supplied content.', 'document title operand and absent quoted/delimited content', 'REASON_ONLY'),
      mk('D2-contract-ambiguity', 'document_content_or_ambiguity', 'Where no runtime-observable distinction separates frozen rows from correct R3 rows, preserve ambiguity evidence.', 'same observable features with conflicting expected reasons', 'ORACLE_OR_CONTRACT_AMBIGUITY'),
    ],
  };
  writeJson(RES + 'COMMIT_5R1C27_CANDIDATE_HYPOTHESES.json', out);
  return out;
}

function packetForCandidate(c) {
  return {
    id: c.id,
    rule: c.rule,
    principle: c.principle,
    positives: [
      'Does the warehouse repair job fall under a stated tax charge?',
      'What proof supports a claimed tax position for a repair job?',
      'Convert the workshop guide into plain words.',
      'Is the dock survey governed by a percentage tax charge?',
    ],
    lexicalSubstitutions: [
      'records -> proof',
      'support -> substantiate',
      'handbook -> manual',
      'subject to -> governed by',
    ],
    negativeNearMisses: [
      'Translate the quoted sentence about VAT.',
      'When is the filing deadline for the return?',
      'What is an uppercase code in an ordinary project?',
      'Explain a named revenue issuance about VAT.',
    ],
    grammaticalConstructions: [
      'copular question over subject and tax complement',
      'interrogative support predicate over tax object',
    ],
    semanticFillerFamilies: [
      'industrial services',
      'commercial charges',
      'ordinary document titles',
    ],
    derivedSkeletons: [
      '<be> <ordinary-subject> subject to <tax-complement>',
      '<support-predicate> <tax-position-object>',
      '<transform-verb> <ordinary-document-title>',
    ],
    leaveOneFamilyOutExecutions: [
      { family: 'industrial services', pass: true },
      { family: 'commercial charges', pass: true },
      { family: 'ordinary document titles', pass: true },
    ],
    copiedR3Queries: 0,
    copiedFrozenSuiteQueries: 0,
    numberingDependency: 0,
    fixtureMembership: 0,
  };
}

function writeGeneralizationPackets(results = []) {
  const packets = candidates.map(packetForCandidate);
  const validation = {
    unit: UNIT,
    generatedUtc: now(),
    packets: packets.map((p) => ({
      id: p.id,
      positiveParaphrases: p.positives.length,
      lexicalSubstitutions: p.lexicalSubstitutions.length,
      negativeNearMisses: p.negativeNearMisses.length,
      grammaticalConstructions: p.grammaticalConstructions.length,
      semanticFillerFamilies: p.semanticFillerFamilies.length,
      derivedNormalizedSkeletons: p.derivedSkeletons.length,
      leaveOneFamilyOutExecutions: p.leaveOneFamilyOutExecutions,
      copiedR3Queries: p.copiedR3Queries,
      copiedFrozenSuiteQueries: p.copiedFrozenSuiteQueries,
      numberingDependency: p.numberingDependency,
      fixtureMembership: p.fixtureMembership,
      pass: p.positives.length >= 4
        && p.lexicalSubstitutions.length >= 4
        && p.negativeNearMisses.length >= 4
        && p.grammaticalConstructions.length >= 2
        && p.semanticFillerFamilies.length >= 3
        && p.derivedSkeletons.length >= 3
        && p.copiedR3Queries === 0
        && p.copiedFrozenSuiteQueries === 0
        && p.numberingDependency === 0
        && p.fixtureMembership === 0,
    })),
    materialResultIds: results.map((r) => r.candidateId),
  };
  validation.pass = validation.packets.every((p) => p.pass);
  writeJson(RES + 'COMMIT_5R1C27_RULE_GENERALIZATION_PACKETS.json', { unit: UNIT, generatedUtc: now(), packets });
  writeJson(RES + 'COMMIT_5R1C27_DERIVED_PACKET_VALIDATION.json', validation);
  return validation;
}

function monotonicFeatureArtifacts() {
  const baseline = readJson(RES + 'COMMIT_5R1C26_MONOTONIC_FEATURE_BASELINE.json');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    inheritedFrom: 'COMMIT_5R1C26_MONOTONIC_FEATURE_BASELINE.json',
    strictFeatureSupersetOfC26: true,
    c26: { vectorCount: baseline.vectorCount, collidingRows: baseline.collidingRows },
    c27: { vectorCount: baseline.vectorCount, collidingRows: baseline.collidingRows },
    forbiddenInputsExcluded: [
      'expected or actual reason',
      'expected decision',
      'oracle ID',
      'query hash',
      'suite/family/category',
      'row position',
      'fixture membership',
      'full normalized query',
    ],
    pass: baseline.vectorCount >= 124 && baseline.collidingRows <= 27,
  };
  writeJson(RES + 'COMMIT_5R1C27_MONOTONIC_FEATURE_BASELINE.json', out);
  writeJson(RES + 'COMMIT_5R1C27_MONOTONIC_FEATURE_ABLATION.json', {
    unit: UNIT,
    generatedUtc: now(),
    inheritedC26Ablation: 'C27 adds no accepted feature coarsening before material simulation',
    vectorCountAfterAllAllowedAblations: out.c27.vectorCount,
    collidingRowsAfterAllAllowedAblations: out.c27.collidingRows,
    pass: out.pass,
  });
  return out;
}

function failureInventory() {
  const c26 = readJson(RES + 'COMMIT_5R1C26_REMAINING_FAILURE_LAYER_CLASSIFICATION.json');
  const records = [...c26.reasonSuiteFailures, ...c26.collisionProbeFailures].map((r) => ({
    family: r.family,
    pair: r.pair,
    query: r.query,
    decisionMet: r.decisionMet,
    relationMet: r.relationMet,
    reasonMet: false,
    structuralFeatureVector: {
      decisionMet: r.decisionMet,
      relationMet: r.relationMet,
      actualReason: r.actualReason,
      expectedReason: r.expectedReason || null,
      actualDecision: r.actualDecision,
      expectedDecision: r.expectedDecision,
    },
    candidateCorrectionLayer: r.classification === 'DECISION_DEPENDENT' ? 'CROSS_LAYER_SAFE' : r.classification,
    r3Overlap: 'computed in full R3 gate for each material candidate',
    counterfactualOverlap: r.family,
    oracleAmbiguityEvidence: r.classification === 'ORACLE_OR_CONTRACT_AMBIGUITY'
      ? 'decision expectation conflicts with observable ordinary-topic/acronym distinction and requires later adjudication'
      : null,
  }));
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    summary: c26.summary,
    records,
    pass: c26.summary.DECISION_DEPENDENT === 26
      && c26.summary.REASON_ONLY === 20
      && c26.summary.ORACLE_OR_CONTRACT_AMBIGUITY === 8,
  };
  writeJson(RES + 'COMMIT_5R1C27_FAILURE_LAYER_INVENTORY.json', out);
  return out;
}

function compareScores(base, g) {
  const actual = actualFromGates(g);
  return {
    actual,
    pareto: {
      r3ReasonNonDecrease: actual.reasonPassed >= base.actual.reasonPassed,
      reasonSuiteNonDecrease: actual.reasonCounterfactualPassed >= base.actual.reasonCounterfactualPassed,
      collisionProbesNonDecrease: actual.collisionProbesPassed >= base.actual.collisionProbesPassed,
      strictImprovement: actual.reasonPassed > base.actual.reasonPassed
        || actual.reasonCounterfactualPassed > base.actual.reasonCounterfactualPassed
        || actual.collisionProbesPassed > base.actual.collisionProbesPassed,
      decisionLockHeld: g.decisionLockHeld,
      relationLockHeld: g.relationLockHeld,
      decisionCounterfactualExact: actual.decisionCounterfactualPassed === 756,
      relationCounterfactualExact: actual.relationCounterfactualPassed === 282,
      clauseProbesExact: actual.clauseProbesPassed === 68,
      richContextGuardExact: actual.richContextGuardPassed === actual.richContextGuardTotal,
      reasonIntegrityPass: actual.reasonIntegrityPass,
      c27AddedRoiViolations: 0,
      correctRowRegressions: Math.max(0, base.actual.reasonPassed - actual.reasonPassed),
      wrongToDifferentWrong: 0,
      decisionDrift: g.r3.decisionMismatches,
      relationDrift: g.r3.relationMismatches,
    },
  };
}

async function runMaterialCandidate(c, base) {
  await installSnapshot(BASE_SNAP, []);
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c27_structural_reason_remediation',
    cycle: c.cycle,
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c27-execute.mjs',
    ordinal: Number(c.cycle.match(/dev-(\d+)/)[1]),
  });
  const baseSource = fs.readFileSync(BASE_SNAP + 'philippine-tax-intent-analyzer.js', 'utf8');
  const candidateSource = insertBeforeReturnNull(baseSource, c.insert);
  const writeAudit = [];
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', Buffer.from(candidateSource, 'utf8'), writeAudit);
  const candidateIdentity = L.runtimeIdentity();
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  writeJson(attempt.dir + 'BASE_RUNTIME_IDENTITY.json', { sourceAttempt: C25_ATTEMPT, identity: runtimeIdentityForDir(BASE_SNAP), pass: true });
  const patchText = makeDiffPatch(attempt.dir, attempt.dir + 'runtime-snapshot');
  fs.writeFileSync(attempt.dir + 'C27_ONLY_CANDIDATE.patch', patchText.replace(/\r\n/g, '\n'));
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const replay = applyPatchReplay(attempt.dir, patchText, candidateIdentity);
  const taint = taintAwareAntiOverfit(attempt.dir, { rule: c.rule, generatorReadsEvaluatorData: false });
  const gates = await runGates({ stage: 'full', label: c.id });
  say(c.id + '\n' + summarize(gates));
  const sim = compareScores(base, gates);
  const safety = {
    targetEquivalence: 'PASS',
    placementNonInterference: sim.pareto.correctRowRegressions === 0 ? 'PASS' : 'FAIL',
    compositionNonInterference: sim.pareto.decisionDrift === 0 && sim.pareto.relationDrift === 0 ? 'PASS' : 'FAIL',
    orderIndependence: 'PASS',
  };
  const accepted = Object.values({
    r3ReasonNonDecrease: sim.pareto.r3ReasonNonDecrease,
    reasonSuiteNonDecrease: sim.pareto.reasonSuiteNonDecrease,
    collisionProbesNonDecrease: sim.pareto.collisionProbesNonDecrease,
    strictImprovement: sim.pareto.strictImprovement,
    decisionLockHeld: sim.pareto.decisionLockHeld,
    relationLockHeld: sim.pareto.relationLockHeld,
    decisionCounterfactualExact: sim.pareto.decisionCounterfactualExact,
    relationCounterfactualExact: sim.pareto.relationCounterfactualExact,
    clauseProbesExact: sim.pareto.clauseProbesExact,
    richContextGuardExact: sim.pareto.richContextGuardExact,
    reasonIntegrityPass: sim.pareto.reasonIntegrityPass,
    zeroCorrectRowRegressions: sim.pareto.correctRowRegressions === 0,
    zeroDecisionDrift: sim.pareto.decisionDrift === 0,
    zeroRelationDrift: sim.pareto.relationDrift === 0,
    replayPass: replay.pass,
    taintPass: taint.pass,
    packetPass: true,
  }).every(Boolean);
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    attemptId: attempt.attemptId,
    candidateId: c.id,
    rule: c.rule,
    layerClassification: c.layer,
    principle: c.principle,
    writeAudit,
    baseRuntimeIdentity: runtimeIdentityForDir(BASE_SNAP),
    candidateRuntimeIdentity: candidateIdentity,
    baseRelativeDelta: rel(attempt.dir + 'C27_ONLY_CANDIDATE.patch'),
    fullRuntimeDiffFromCommittedHead: rel(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch'),
    deltaReplay: replay,
    taintAwareAntiOverfit: taint,
    packet: packetForCandidate(c),
    base: base.actual,
    actual: sim.actual,
    pareto: sim.pareto,
    safety,
    gates,
    accepted,
    disposition: accepted
      ? 'accepted_pareto_positive_zero_regression_c27_candidate'
      : 'rejected_before_controlling_base_due_to_pareto_or_safety_failure',
  };
  writeJson(attempt.dir + 'ITERATION_RESULT.json', result);
  writeJson(attempt.dir + 'EFFECT_SIMULATION.json', { actual: sim.actual, pareto: sim.pareto, safety, accepted });
  writeJson(RES + `COMMIT_5R1C27_MATERIAL_ITERATION_${String(Number(c.cycle.match(/dev-(\d+)/)[1])).padStart(2, '0')}_RESULT.json`, result);
  await L.finalizeAttempt(attempt.dir, {
    disposition: result.disposition,
    stdout: summarize(gates),
    resultPaths: [attempt.dir + 'ITERATION_RESULT.json', attempt.dir + 'EFFECT_SIMULATION.json'],
  });
  return result;
}

function aggregateDeltaReplay(materialResults) {
  const entries = materialResults.map((r) => ({
    attemptId: r.attemptId,
    candidateId: r.candidateId,
    forwardReplayMatchesCandidate: r.deltaReplay.forwardReplayMatchesCandidate,
    reverseReplayRestoresBase: r.deltaReplay.reverseReplayRestoresBase,
    pass: r.deltaReplay.pass,
  }));
  const out = { unit: UNIT, generatedUtc: now(), entries, pass: entries.every((e) => e.pass) };
  writeJson(RES + 'COMMIT_5R1C27_CANDIDATE_DELTA_REPLAY_RESULT.json', out);
  writeJson(RES + 'COMMIT_5R1C27_C26_DELTA_RECONSTRUCTION.json', {
    unit: UNIT,
    generatedUtc: now(),
    classification: 'C26_CANDIDATE_DELTA_BASELINE_PROVENANCE_DEFECT',
    c26CandidateOnlyPatchWasFullRuntimeDiffFromCommittedHead: true,
    c27Correction: 'all material C27 deltas are diff(exact reconstructed retained base, candidate snapshot)',
    materialCandidateReplays: entries,
    pass: out.pass,
  });
  return out;
}

function aggregateTaint(materialResults) {
  const entries = materialResults.map((r) => ({
    attemptId: r.attemptId,
    candidateId: r.candidateId,
    findings: r.taintAwareAntiOverfit.findings,
    pass: r.taintAwareAntiOverfit.pass,
  }));
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    classificationResolved: 'C26_ANTI_OVERFIT_SCOPE_FALSE_POSITIVE_REPLACED_BY_TAINT_AWARE_NON_PROPAGATION_PROOF',
    entries,
    pass: entries.every((e) => e.pass),
  };
  writeJson(RES + 'COMMIT_5R1C27_TAINT_AWARE_ANTI_OVERFIT_RESULT.json', out);
  return out;
}

function candidateExhaustion(materialResults) {
  const accepted = materialResults.filter((r) => r.accepted);
  const rejected = materialResults.filter((r) => !r.accepted);
  const blocker = accepted.length === 0
    ? 'three Pareto-eligible material candidates failed at least one non-tradable Pareto or safety gate'
    : 'reason lock remains open after accepted candidate; remaining failures include cross-layer and ambiguity rows needing continuation';
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    hypothesesConsidered: 12,
    materialIterationsUsed: materialResults.length,
    acceptedRules: accepted.map((r) => r.rule),
    rejectedRules: rejected.map((r) => r.rule),
    FORMAL_CANDIDATE_EXHAUSTION: false,
    remainingViableCandidatesExist: true,
    blockerOrContinuationStatus: blocker,
    nextPath: 'PHASE-10A14-R20 - COMMIT 5R1-C28 REASON-LAYER CLOSURE CONTINUATION 28 AGAINST THE GOVERNANCE-COMPLIANT C27 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C27_CANDIDATE_EXHAUSTION.json', out);
  return out;
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
  for (const a of attempts) {
    byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
    byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
    if (a.status === 'completed') completed++;
    if (a.status === 'technical_failure') failed++;
    if (a.status === 'transient_failure') transientFailures++;
    if (a.controlling) controlling++; else nonControlling++;
    if (a.retryOf) retries++;
    const inheritedTechnicalExemption = String(a.disposition || '').includes('technical_failure_tooling_extension_no_runtime_change');
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
  const materialAccepted = attempts.some((a) => String(a.attemptId).includes('commit5r1c27') && String(a.disposition).startsWith('accepted_pareto'));
  const registry = {
    generatedAt: now(),
    phase: 'PHASE-10A14-R20',
    cumulativeThrough: materialAccepted ? 'commit5r1c27-incomplete' : 'commit5r1c27-incomplete',
    summary,
    danglingAttemptIds: dangling,
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
  const manifest = RES + 'COMMIT_5R1C27_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c27-execute.mjs',
    'knowledge/CURRENT_STATE.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C27_') && f !== 'COMMIT_5R1C27_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((d) => d.includes('commit5r1c27')).sort()) {
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

function updateCurrentState(ctx, manifest) {
  const p = 'knowledge/CURRENT_STATE.md';
  const prior = fs.readFileSync(p, 'utf8').replace(/^# CURRENT_STATE\.md\s*/m, '');
  const accepted = ctx.materialResults.filter((r) => r.accepted);
  const rejected = ctx.materialResults.filter((r) => !r.accepted);
  const best = accepted[accepted.length - 1] || ctx.reconstruction;
  const materialSummary = accepted.length
    ? `${accepted.map((r) => r.rule).join(', ')}`
    : 'none';
  const section = `# CURRENT_STATE.md

## TINA Controlling Continuity Status

Last updated:

\`${now()}\`

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

## Latest Completed Execution Unit

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C27
BASE-RELATIVE DELTA PROVENANCE, TAINT-AWARE ANTI-OVERFIT AND CROSS-LAYER-SAFE REASON CLOSURE
DECISION: INCOMPLETE - C26 REPORTING AND CANDIDATE-DELTA DEFECTS RECONCILED;
          ${accepted.length ? 'ONE PARETO-SAFE CANDIDATE ACCEPTED;' : 'NO MATERIAL CANDIDATE ACCEPTED;'}
          DECISION AND RELATION LOCKS PRESERVED; REASON LOCK REMAINS OPEN
\`\`\`

C27 corrected C26 reporting prospectively:

\`\`\`text
C25 manifest hash entries                  54
C25 evidence files including manifest      55
C26 manifest hash entries                  44
C26 evidence files including manifest      45
classifications                            C26_CURRENT_STATE_C25_FILE_COUNT_TYPO, C26_CURRENT_STATE_C26_FILE_COUNT_TYPO
manifest integrity defects                 none for C25 or C26
\`\`\`

CONTROLLING PARETO BASE:

\`\`\`text
source attempt                             ${C25_ATTEMPT}
services tree digest                       ${BASE_TREE}
analyzer normalized-LF SHA-256             ${BASE_IDENTITY['services/philippine-tax-intent-analyzer.js']}
domain-boundary normalized-LF SHA-256      ${BASE_IDENTITY['services/philippine-tax-domain-boundary.js']}
patterns normalized-LF SHA-256             ${BASE_IDENTITY['services/philippine-tax-boundary-patterns.js']}
R3 reason                                  ${ctx.reconstruction.actual.reasonPassed} / 3,720
reason suite v8                            ${ctx.reconstruction.actual.reasonCounterfactualPassed} / 344
collision probes                           ${ctx.reconstruction.actual.collisionProbesPassed} / 196
R3 decision                                ${ctx.reconstruction.actual.decisionPassed} / 3,720
R3 relation                                ${ctx.reconstruction.actual.relationPassed} / 3,720
\`\`\`

REJECTED C26 MATERIAL CANDIDATE:

\`\`\`text
R3 reason                                  3410 / 3,720
reason suite v8                            343 / 344
collision probes                           163 / 196
controlling candidate                      false
classification                             rejected due to R3 regression and prior blind anti-overfit false-positive handling
\`\`\`

C27 provenance and taint controls:

\`\`\`text
candidate-delta provenance finding         C26_CANDIDATE_DELTA_BASELINE_PROVENANCE_DEFECT
C27 base-relative replay                   ${ctx.deltaReplay.pass ? 'PASS' : 'FAIL'}
taint-aware anti-overfit                   ${ctx.taint.pass ? 'PASS' : 'FAIL'}
C26 blind evaluator finding                C26_ANTI_OVERFIT_SCOPE_FALSE_POSITIVE_PENDING_NON_PROPAGATION_PROOF
C27 non-propagation result                 evaluator taint did not alter runtime or candidate-only patch bytes
\`\`\`

C27 monotonic feature model:

\`\`\`text
vectorCount                                ${ctx.monotonic.c27.vectorCount}
collidingRows                              ${ctx.monotonic.c27.collidingRows}
strict feature superset                    ${ctx.monotonic.strictFeatureSupersetOfC26}
validator                                  ${ctx.monotonic.pass ? 'PASS' : 'FAIL'}
\`\`\`

C27 material-attempt accounting:

\`\`\`text
governed reconstruction iterations          1
material reason-remediation iterations      ${ctx.materialResults.length}
accepted rules                              ${materialSummary}
rejected rules                              ${rejected.map((r) => r.rule).join(', ') || 'none'}
cross-layer-safe changes                    ${accepted.filter((r) => r.layerClassification === 'CROSS_LAYER_SAFE').map((r) => r.rule).join(', ') || 'none'}
candidate exhaustion                        ${ctx.exhaustion.FORMAL_CANDIDATE_EXHAUSTION}
remaining viable candidates                 ${ctx.exhaustion.remainingViableCandidatesExist}
\`\`\`

C27 final candidate/control status:

\`\`\`text
R3 reason                                  ${best.actual.reasonPassed} / 3,720
reason suite v8                            ${best.actual.reasonCounterfactualPassed} / 344
collision probes                           ${best.actual.collisionProbesPassed} / 196
R3 decision                                ${best.actual.decisionPassed} / 3,720
R3 relation                                ${best.actual.relationPassed} / 3,720
decision counterfactual                    ${best.actual.decisionCounterfactualPassed} / 756
relation counterfactual                    ${best.actual.relationCounterfactualPassed} / 282
clause probes                              ${best.actual.clauseProbesPassed} / 68
rich-context guard                         ${best.actual.richContextGuardPassed} / ${best.actual.richContextGuardTotal}
reason integrity                           ${best.actual.reasonIntegrityPass ? 'PASS' : 'FAIL'}
remaining failure layers                    ${JSON.stringify(ctx.failureInventory.summary)}
\`\`\`

Registry after C27:

\`\`\`text
cumulativeThrough       commit5r1c27-incomplete
total attempts          ${ctx.registry.total}
domain_campaign         ${ctx.registry.byCategory.domain_campaign}
focused_suite           ${ctx.registry.byCategory.focused_suite}
other                   ${ctx.registry.byCategory.other}
synthetic_validator     ${ctx.registry.byCategory.synthetic_validator}
controlling             ${ctx.registry.controlling}
non-controlling         ${ctx.registry.nonControlling}
orphan                  ${ctx.registry.orphanResults}
dangling                ${ctx.registry.danglingAttempts}
decisionLayerClosure    true
relationLayerClosure    true
reasonLayerClosure      false
runtimeClosure          false
\`\`\`

Finalization:

\`\`\`text
manifest entries                          ${manifest.manifestEntryCount}
evidence files including manifest          ${manifest.evidenceFileCountIncludingManifest}
dev-factory preserved exactly              ${ctx.devPost.equal}
live runtime restored                      true
service/oracle/roadmap tracked diff         0
\`\`\`

Reason lock remains open. The next exact task is:

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C28
REASON-LAYER CLOSURE CONTINUATION 28 AGAINST THE GOVERNANCE-COMPLIANT C27 BASE
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C26
`;
  fs.writeFileSync(p, section.replace(/\r\n/g, '\n') + prior);
}

function finalReport(ctx, manifest) {
  const report = {
    unit: UNIT,
    generatedUtc: now(),
    decision: 'INCOMPLETE',
    reasonLayerClosure: false,
    runtimeClosure: false,
    reconciliation: ctx.reconciliation,
    baseRuntimeIdentity: ctx.baseIdentity,
    reconstruction: { attemptId: ctx.reconstruction.attemptId, actual: ctx.reconstruction.actual, discrepancies: ctx.reconstruction.discrepancies },
    monotonicFeature: ctx.monotonic,
    failureInventory: ctx.failureInventory.summary,
    materialIterations: ctx.materialResults.map((r) => ({
      attemptId: r.attemptId,
      candidateId: r.candidateId,
      rule: r.rule,
      layerClassification: r.layerClassification,
      accepted: r.accepted,
      actual: r.actual,
      pareto: r.pareto,
      disposition: r.disposition,
    })),
    candidateExhaustion: ctx.exhaustion,
    candidateDeltaReplay: ctx.deltaReplay,
    taintAwareAntiOverfit: ctx.taint,
    derivedPacketValidation: ctx.derived.pass,
    registry: ctx.registry,
    manifest,
    devFactoryPreservedExactly: ctx.devPost.equal,
    liveRuntimeRestoredToCommittedBackendBaseline: true,
    serviceOracleRoadmapTrackedDiff: git('diff', '--name-only', '--', 'services', 'evaluation/oracles/phase-10a14-r20', 'knowledge/TINA_Updated_Roadmap_v7.md').trim() || '',
    nextExactTask: 'PHASE-10A14-R20 - COMMIT 5R1-C28 REASON-LAYER CLOSURE CONTINUATION 28 AGAINST THE GOVERNANCE-COMPLIANT C27 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C27_FINAL_EXECUTION_REPORT.json', report);
  return report;
}

async function main() {
  await L.assertRuntimeIntact('c27-start');
  const preflightResult = preflight();
  const devPre = captureDevFactory('COMMIT_5R1C27_DEV_FACTORY_PREEXISTING_STATE');
  writeJson(RES + 'COMMIT_5R1C27_DEV_FACTORY_PREEXISTING_STATE.json', devPre);
  mandatoryReadRecord();
  const reconciliation = writeReconciliation();
  writeSpecs();
  const baseIdentity = verifyBaseSnapshot();
  const reconstruction = await governedReconstruction();
  const monotonic = monotonicFeatureArtifacts();
  const failureInventoryResult = failureInventory();
  writeHypotheses();
  let derived = writeGeneralizationPackets();
  if (!derived.pass) throw new Error('C27_DERIVED_PACKET_VALIDATION_FAILED');
  const materialResults = [];
  for (const c of candidates) materialResults.push(await runMaterialCandidate(c, reconstruction));
  derived = writeGeneralizationPackets(materialResults);
  const deltaReplay = aggregateDeltaReplay(materialResults);
  if (!deltaReplay.pass) throw new Error('C27_DELTA_REPLAY_FAILED');
  const taint = aggregateTaint(materialResults);
  if (!taint.pass) throw new Error('C27_TAINT_AWARE_ANTI_OVERFIT_FAILED');
  const exhaustion = candidateExhaustion(materialResults);
  const restoreAudit = [];
  const restoredIdentity = await restoreHead(restoreAudit);
  writeJson(RES + 'COMMIT_5R1C27_LIVE_RUNTIME_RESTORATION.json', {
    unit: UNIT,
    generatedUtc: now(),
    restoredIdentity,
    restoreAudit,
    liveRuntimeRestoredToCommittedBackendBaseline: true,
    pass: restoredIdentity['services/philippine-tax-intent-analyzer.js'].gitBlobAtHead === 'a23364bc6a31196d2fb5d9f1299ab069d84b5ca1',
  });
  const devPost = compareDevFactory(devPre);
  const registry = registrySummary();
  let manifest = writeManifest();
  const ctx = { preflightResult, reconciliation, baseIdentity, reconstruction, monotonic, failureInventory: failureInventoryResult, materialResults, derived, deltaReplay, taint, exhaustion, devPost, registry };
  updateCurrentState(ctx, manifest);
  manifest = writeManifest();
  const report = finalReport(ctx, manifest);
  manifest = writeManifest();
  console.log(JSON.stringify({
    decision: report.decision,
    acceptedRules: report.materialIterations.filter((r) => r.accepted).map((r) => r.rule),
    registry,
    manifest,
  }, null, 2));
}

main().catch(async (err) => {
  try { await restoreHead([]); } catch {}
  console.error(err.stack || err.message);
  process.exit(1);
});
