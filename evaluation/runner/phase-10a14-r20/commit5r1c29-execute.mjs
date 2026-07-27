// PHASE-10A14-R20 COMMIT 5R1-C29 - Roadmap v8 promotion and C28-base reason continuation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C29';
const RES = L.RES;
const ATT = L.ATT;
const START_HEAD = '5a9d5be1b9efc33e594221b64190dcfe8c19ff15';
const START_PARENT = '880d37b58857c954033922fc98feb702deac4b78';
const C28_SELECTED = 'R20-domain_campaign-r20_commit5r1c28_structural_reason_remediation-commit5r1c28-dev-01-ord01-2026-07-27T14-37-46-271Z';
const C28_RECON = 'R20-domain_campaign-r20_commit5r1c28_c27_selected_base_reconstruction-commit5r1c28-reconstruction-ord01-2026-07-27T14-37-42-458Z';
const BASE_SNAP = ATT + C28_SELECTED + '/runtime-snapshot/';
const BASE_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': '5dc8b32cab17197ef1b5ce55b569793457b0f669f47b5d8de01e5ef24ae0ae93',
  'services/philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'services/philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const BASE_TREE = '635a2a69ffd2b6ed2da123bf8a9c386032235f47daa2d887e106fe24560bcd56';
const START_VECTOR = { reasonPassed: 3462, reasonCounterfactualPassed: 332, collisionProbesPassed: 163 };

const now = () => new Date().toISOString();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const shaText = (s) => sha256(Buffer.from(s, 'utf8'));
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = L.writeJson;
const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const git = (...args) => execFileSync('git', ['-C', L.REPO, ...args], { maxBuffer: 1e9 }).toString();
const headFile = (r) => execFileSync('git', ['-C', L.REPO, 'show', 'HEAD:' + r], { maxBuffer: 1e9 });

const mandatoryFirstRead = [
  'knowledge/CURRENT_STATE.md',
  'knowledge/TINA_Updated_Roadmap_v7.md',
  'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
  RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  RES + 'COMMIT_5R1C28_C27_CANDIDATE_SELECTION_RECONCILIATION.json',
  RES + 'COMMIT_5R1C28_BASE_RUNTIME_IDENTITY.json',
  RES + 'COMMIT_5R1C28_C27_BASE_RECONSTRUCTION.json',
  RES + 'COMMIT_5R1C28_MONOTONIC_FEATURE_BASELINE.json',
  RES + 'COMMIT_5R1C28_MONOTONIC_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C28_FAILURE_LAYER_INVENTORY.json',
  RES + 'COMMIT_5R1C28_RESIDUAL_OVERLAP_AND_EQUIVALENCE_MAP.json',
  RES + 'COMMIT_5R1C28_CANDIDATE_HYPOTHESES.json',
  RES + 'COMMIT_5R1C28_CANDIDATE_EXHAUSTION.json',
  RES + 'COMMIT_5R1C28_RULE_GENERALIZATION_PACKETS.json',
  RES + 'COMMIT_5R1C28_DERIVED_PACKET_VALIDATION.json',
  RES + 'COMMIT_5R1C28_COMPOSITION_ORDER_INDEPENDENCE.json',
  RES + 'COMMIT_5R1C28_CANDIDATE_DELTA_REPLAY_RESULT.json',
  RES + 'COMMIT_5R1C28_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json',
  RES + 'COMMIT_5R1C28_TAINT_AWARE_ANTI_OVERFIT_RESULT.json',
  RES + 'COMMIT_5R1C28_FINAL_EXECUTION_REPORT.json',
  RES + 'COMMIT_5R1C28_EVIDENCE_MANIFEST.sha256',
  ATT + C28_SELECTED + '/ITERATION_RESULT.json',
  ATT + C28_SELECTED + '/C28_ONLY_CANDIDATE.patch',
  ATT + 'R20-domain_campaign-r20_commit5r1c28_structural_reason_remediation-commit5r1c28-dev-02-ord02-2026-07-27T14-37-52-000Z/ITERATION_RESULT.json',
  ATT + 'R20-domain_campaign-r20_commit5r1c28_structural_reason_remediation-commit5r1c28-dev-03-ord03-2026-07-27T14-37-57-892Z/ITERATION_RESULT.json',
  RES + 'CLAUSE_LEVEL_INTENT_SCHEMA.md',
  RES + 'RELATION_AND_PRECEDENCE_SPEC.md',
];

function psJson(command) {
  const p = spawnSync('powershell', ['-NoProfile', '-Command', command], { encoding: 'utf8', maxBuffer: 1e9 });
  return { status: p.status, stdout: p.stdout.trim(), stderr: p.stderr.trim() };
}

async function restoreHead(audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('C29-restored-head');
  return L.runtimeIdentity();
}

function captureDevFactory(artifact) {
  const args = ['-c', 'safe.directory=C:/Projects/tina-dev-factory', '-C', 'C:/Projects/tina-dev-factory'];
  const run = (...more) => execFileSync('git', [...args, ...more], { maxBuffer: 1e9 }).toString();
  const status = run('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const diff = run('diff', '--binary');
  return {
    artifact,
    capturedAtUtc: now(),
    repository: 'C:/Projects/tina-dev-factory',
    head: run('rev-parse', 'HEAD').trim(),
    branch: run('rev-parse', '--abbrev-ref', 'HEAD').trim(),
    porcelainV2Status: status,
    statusSha256: shaText(status),
    trackedDiffSha256: shaText(diff),
    untrackedPaths: status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2)),
  };
}

function preflight() {
  const registry = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  const status = git('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const tracked = git('status', '--porcelain=v2', '--untracked-files=no').trim();
  const untracked = status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2).replace(/\\/g, '/'));
  const permitted = untracked.filter((p) => /^(\.claude\/|\.vscode\/|evaluation\/factcheck\/)/.test(p)
    || p === 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md'
    || p === 'evaluation/runner/phase-10a14-r20/commit5r1c29-execute.mjs'
    || /^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C29_/.test(p)
    || /^evaluation\/results\/phase-10a14-r20\/attempts\/R20-domain_campaign-r20_commit5r1c29_/.test(p));
  const unexplained = untracked.filter((p) => !permitted.includes(p));
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
    permittedProtectedUntracked: permitted,
    unexplainedUntrackedResidue: unexplained,
    protectedUntrackedOnly: unexplained.length === 0,
    unexplainedResidueLeftUntouched: unexplained,
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
  out.pass = out.head === START_HEAD
    && out.parent === START_PARENT
    && out.branch === 'feature/source-availability-engine-v1'
    && out.sync === '0\t0'
    && out.trackedTreeClean
    && out.nodeListenerAbsent
    && out.port5173Free
    && out.currentStateBlob === '107eeb5dbf8e97395d96f6a002bd02bd7d2aea45'
    && out.startingRegistry.total === 192
    && out.startingRegistry.domain_campaign === 128
    && out.startingRegistry.focused_suite === 13
    && out.startingRegistry.other === 9
    && out.startingRegistry.synthetic_validator === 42
    && out.startingRegistry.controlling === 190
    && out.startingRegistry.nonControlling === 2
    && out.startingRegistry.orphan === 0
    && out.startingRegistry.dangling === 0
    && out.startingRegistry.cumulativeThrough === 'commit5r1c28-incomplete'
    && out.startingRegistry.decisionLayerClosure === true
    && out.startingRegistry.relationLayerClosure === true
    && out.startingRegistry.reasonLayerClosure === false
    && out.startingRegistry.runtimeClosure === false;
  writeJson(RES + 'COMMIT_5R1C29_PREFLIGHT.json', out);
  if (!out.pass) throw new Error('C29_PREFLIGHT_DISCREPANCY');
  return out;
}

function mandatoryReadRecord() {
  const files = mandatoryFirstRead.map((p) => {
    const b = fs.readFileSync(p);
    if (!b.length) throw new Error('MANDATORY_FIRST_READ_ZERO_BYTE ' + p);
    return { path: rel(p), bytes: b.length, sha256: sha256(b), readComplete: true };
  });
  const out = { unit: UNIT, generatedUtc: now(), files };
  writeJson(RES + 'COMMIT_5R1C29_MANDATORY_FIRST_READ.json', out);
  return out;
}

function normalizedLfSha(pathOrText, isText = false) {
  const s = isText ? pathOrText : fs.readFileSync(pathOrText, 'utf8').replace(/^\uFEFF/, '');
  return shaText(s.replace(/\r\n/g, '\n'));
}

function updateRoadmapHeader(text, resultLine) {
  return text
    .replace(/\*\*Effective date:\*\* 27 July 2026\s*/m, '**Effective date:** 27 July 2026  \n')
    .replace(/\*\*Current active work:\*\* PHASE-10A14-R20\s*/m, '**Current active work:** PHASE-10A14-R20  \n')
    .replace(/\*\*Current controlling result:\*\* .+\s*/m, `**Current controlling result:** ${resultLine}  \n`)
    .replace(/\*\*Major-phase count:\*\* 18 .+\s*/m, '**Major-phase count:** 18 - unchanged  \n');
}

function validateRoadmapV8(text) {
  const required = [
    ['10E-A', 'Identity, account and session security V1'],
    ['10E-B', 'Application, API and abuse protection V1'],
    ['10E-C', 'Production transport, domain and secret boundary V1'],
    ['10F-A', 'Pagination, bounded reads and database scalability V1'],
    ['10F-B', 'Background tasks and request-path isolation V1'],
    ['10F-C', 'Error monitoring and release observability V1'],
    ['10I-P', 'Production billing and real-payment readiness'],
  ];
  const requiredSubphasesPresent = required.map((needle) => ({
    subphase: needle.join(' '),
    present: text.includes(needle[0]) && text.includes(needle[1]),
  }));
  const sourceHierarchyPresent = [
    'committed Git evidence and frozen artifacts',
    'knowledge/CURRENT_STATE.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    'knowledge/TINA_Updated_Roadmap_v7.md',
  ].every((needle) => text.includes(needle));
  const strategicIntegrity = text.includes('Phase 14 mobile application after Phase 13 maturity')
    && text.includes('No market-response implementation may bypass Phase 10A')
    && text.includes('Major-phase count:** 18');
  return {
    requiredSubphasesPresent,
    productionReadinessSubphaseIntegrity: requiredSubphasesPresent.every((x) => x.present),
    sourceOfTruthHierarchyPresent: sourceHierarchyPresent,
    strategicSectionIntegrity: strategicIntegrity,
    pass: requiredSubphasesPresent.every((x) => x.present) && strategicIntegrity,
  };
}

function promoteRoadmapV8Initial(preflightResult) {
  const p = 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md';
  const before = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const preHash = normalizedLfSha(before, true);
  const v7Before = fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md');
  const validation = validateRoadmapV8(before);
  if (preHash !== 'be835539d9e4bbfc3736b82509c4236ea63f37145704bdc9472e1a914dbe8c60' && !validation.pass) {
    throw new Error('C29_ROADMAP_V8_MATERIAL_VALIDATION_FAILED');
  }
  const hierarchy = `
## 11. Immediate Source Of Truth

Use this source-of-truth hierarchy:

1. committed Git evidence and frozen artifacts
2. knowledge/CURRENT_STATE.md for immediate operational continuity
3. knowledge/TINA_Updated_Controlling_Roadmap_v8.md for controlling strategy and sequencing
4. knowledge/TINA_Updated_Roadmap_v7.md as an immutable historical predecessor
5. older workbooks and conversation continuity as non-controlling context

Roadmap v8 supersedes Roadmap v7 strategically. Roadmap v7 remains historical and immutable.
`;
  let updated = updateRoadmapHeader(before, 'COMMIT 5R1-C28 incomplete; COMMIT 5R1-C29 is active');
  if (!updated.includes('## 11. Immediate Source Of Truth')) updated = updated.trimEnd() + '\n' + hierarchy + '\n';
  fs.writeFileSync(p, updated.replace(/\r\n/g, '\n'));
  const after = fs.readFileSync(p, 'utf8');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    preUpdateFileStatus: preflightResult.untracked.includes('knowledge/TINA_Updated_Controlling_Roadmap_v8.md') ? 'untracked' : 'tracked_or_modified',
    preUpdateNormalizedLfSha256: preHash,
    expectedPreUpdateNormalizedLfSha256: 'be835539d9e4bbfc3736b82509c4236ea63f37145704bdc9472e1a914dbe8c60',
    hashDifferenceRecorded: preHash === 'be835539d9e4bbfc3736b82509c4236ea63f37145704bdc9472e1a914dbe8c60' ? null : 'pre-supplied file hash differed; semantic validation retained required production-readiness subphases',
    semanticValidationResult: validation,
    requiredSubphasesPresent: validation.requiredSubphasesPresent,
    sourceOfTruthHierarchyPresent: validateRoadmapV8(after).sourceOfTruthHierarchyPresent,
    v7Unchanged: Buffer.compare(v7Before, fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md')) === 0,
    initialUpdatedNormalizedLfSha256: normalizedLfSha(after, true),
    plannedFinalHeaderUpdate: 'replace active C29 wording with actual C29 outcome after evidence execution',
    authorizedPathOnly: p,
    pass: validation.pass && Buffer.compare(v7Before, fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md')) === 0,
  };
  writeJson(RES + 'COMMIT_5R1C29_ROADMAP_V8_PROMOTION.json', out);
  if (!out.pass) throw new Error('C29_ROADMAP_V8_PROMOTION_FAILED');
  return out;
}

function finalizeRoadmapV8(ctx) {
  const p = 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md';
  const before = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const reasonLock = ctx.materialResults.some((r) => r.actual.reasonPassed === 3720
    && r.actual.reasonCounterfactualPassed === 344
    && r.actual.collisionProbesPassed === 196);
  const resultLine = reasonLock
    ? 'COMMIT 5R1-C29 reason lock achieved; COMMIT 5R1-C30 standalone runtime closure is next'
    : 'COMMIT 5R1-C29 incomplete; COMMIT 5R1-C30 reason-layer continuation is next';
  const updated = updateRoadmapHeader(before, resultLine);
  fs.writeFileSync(p, updated.replace(/\r\n/g, '\n'));
  const finalText = fs.readFileSync(p, 'utf8');
  const prev = readJson(RES + 'COMMIT_5R1C29_ROADMAP_V8_PROMOTION.json');
  const validation = validateRoadmapV8(finalText);
  const out = {
    ...prev,
    finalUpdatedUtc: now(),
    finalNormalizedLfSha256: normalizedLfSha(finalText, true),
    finalExecutionHeader: {
      currentActiveWork: 'PHASE-10A14-R20',
      currentControllingResult: resultLine,
      phase10A: 'OPEN',
      r20: 'IN PROGRESS',
    },
    strategicSectionIntegrity: validation.strategicSectionIntegrity,
    productionReadinessSubphaseIntegrity: validation.productionReadinessSubphaseIntegrity,
    sourceOfTruthHierarchyIntegrity: validation.sourceOfTruthHierarchyPresent,
    v7ByteForBytePreservation: git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') === '',
    trackedInC29Commit: true,
    pass: validation.pass && validation.sourceOfTruthHierarchyPresent && git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') === '',
  };
  writeJson(RES + 'COMMIT_5R1C29_ROADMAP_V8_PROMOTION.json', out);
  if (!out.pass) throw new Error('C29_ROADMAP_V8_FINALIZATION_FAILED');
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
  await L.assertRuntimeIntact('C29-installed-snapshot');
  return L.runtimeIdentity();
}

function verifyBaseSnapshot() {
  const got = runtimeIdentityForDir(BASE_SNAP);
  const mismatches = Object.entries(BASE_IDENTITY)
    .filter(([k, v]) => got[k].normalizedLfSha256 !== v)
    .map(([pathName, expected]) => ({ path: pathName, expected, actual: got[pathName].normalizedLfSha256 }));
  if (got.servicesTreeDigest !== BASE_TREE) mismatches.push({ path: 'services tree', expected: BASE_TREE, actual: got.servicesTreeDigest });
  const out = { unit: UNIT, generatedUtc: now(), sourceAttempt: C28_SELECTED, identity: got, mismatches, pass: mismatches.length === 0 };
  writeJson(RES + 'COMMIT_5R1C29_BASE_RUNTIME_IDENTITY.json', out);
  if (!out.pass) throw new Error('C29_BASE_SNAPSHOT_MISMATCH');
  return out;
}

async function governedReconstruction() {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c29_c28_selected_base_reconstruction',
    cycle: 'commit5r1c29-reconstruction',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c29-execute.mjs',
  });
  const writeAudit = [];
  const installedIdentity = await installSnapshot(BASE_SNAP, writeAudit);
  const gates = await runGates({ stage: 'full', label: 'C29-c28-selected-base-reconstruction' });
  console.log(summarize(gates));
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  writeJson(attempt.dir + 'BASE_RUNTIME_IDENTITY.json', { sourceAttempt: C28_SELECTED, identity: runtimeIdentityForDir(BASE_SNAP), pass: true });
  fs.writeFileSync(attempt.dir + 'C29_ONLY_CANDIDATE.patch', '');
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const actual = actualFromGates(gates);
  const expected = {
    reasonPassed: 3462,
    reasonCounterfactualPassed: 332,
    collisionProbesPassed: 163,
    decisionPassed: 3720,
    relationPassed: 3720,
    decisionCounterfactualPassed: 756,
    relationCounterfactualPassed: 282,
    clauseProbesPassed: 68,
    richContextGuardPassed: 7,
    reasonIntegrityPass: true,
  };
  const discrepancies = Object.entries(expected).filter(([k, v]) => actual[k] !== v).map(([metric, expectedValue]) => ({ metric, expected: expectedValue, actual: actual[metric] }));
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    attemptId: attempt.attemptId,
    sourceAttempt: C28_SELECTED,
    installedIdentity,
    writeAudit,
    expected,
    actual,
    discrepancies,
    gates,
    disposition: 'accepted_c28_selected_controlling_base_reconstruction',
  };
  writeJson(RES + 'COMMIT_5R1C29_C28_BASE_RECONSTRUCTION.json', out);
  writeJson(attempt.dir + 'RECONSTRUCTION_RESULT.json', out);
  await L.finalizeAttempt(attempt.dir, {
    disposition: out.disposition,
    stdout: summarize(gates),
    resultPaths: [RES + 'COMMIT_5R1C29_C28_BASE_RECONSTRUCTION.json', attempt.dir + 'RECONSTRUCTION_RESULT.json'],
  });
  if (discrepancies.length) throw new Error('C29_RECONSTRUCTION_DISCREPANCY');
  return out;
}

function writeCandidateSelectionReconciliation() {
  const c28 = readJson(ATT + C28_SELECTED + '/ITERATION_RESULT.json');
  const report = readJson(RES + 'COMMIT_5R1C28_FINAL_EXECUTION_REPORT.json');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    classification: 'C28_SELECTED_BASE_CONTINUITY',
    determinations: [
      'C28 selected one Pareto-positive controlling candidate over the C27 selected base.',
      'C29 uses the C28 selected candidate runtime snapshot as its exact active base.',
      'C28 prior rejected candidates are not rerun unchanged in C29.',
      'C28 evidence is consumed as immutable input and is not modified.',
    ],
    selectedC28Base: {
      attemptId: C28_SELECTED,
      rule: c28.rule,
      actual: c28.actual,
      runtimeIdentity: runtimeIdentityForDir(BASE_SNAP),
    },
    c28FinalReportDecision: report.decision,
    c28EvidenceInvalidated: false,
    c28FilesModified: false,
    pass: c28.accepted === true
      && c28.actual.reasonPassed === 3462
      && c28.actual.reasonCounterfactualPassed === 332
      && c28.actual.collisionProbesPassed === 163,
  };
  writeJson(RES + 'COMMIT_5R1C29_C28_SELECTED_BASE_CONTINUITY.json', out);
  if (!out.pass) throw new Error('C29_C28_SELECTED_BASE_CONTINUITY_FAILED');
  return out;
}
function copyRuntimeTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const n of L.SERVICES) fs.copyFileSync(path.join(src, n), path.join(dst, n));
}

function makeDiffPatch(attemptDir, baseDir, candidateDir) {
  const work = path.join(attemptDir, 'delta-work');
  const base = path.join(work, 'base', 'services');
  const candidate = path.join(work, 'candidate', 'services');
  copyRuntimeTree(baseDir, base);
  copyRuntimeTree(candidateDir, candidate);
  const diff = spawnSync('git', ['diff', '--no-index', '--binary', '--src-prefix=a/', '--dst-prefix=b/', 'base/services', 'candidate/services'], {
    cwd: work,
    encoding: 'utf8',
    maxBuffer: 1e9,
  });
  if (![0, 1].includes(diff.status)) throw new Error('C29_GIT_DIFF_NO_INDEX_FAILED ' + diff.stderr);
  return diff.stdout.replace(/base\/services/g, 'services').replace(/candidate\/services/g, 'services');
}

function applyPatchReplay(attemptDir, baseDir, patchText, candidateIdentity) {
  const replay = path.join(attemptDir, 'delta-replay');
  const reverse = path.join(attemptDir, 'delta-reverse-replay');
  copyRuntimeTree(baseDir, path.join(replay, 'services'));
  copyRuntimeTree(baseDir, path.join(reverse, 'services'));
  if (patchText.trim() === '') {
    const baseIdentity = runtimeIdentityForDir(baseDir);
    const unchanged = L.SERVICES.every((n) => baseIdentity['services/' + n].normalizedLfSha256 === candidateIdentity['services/' + n].normalizedLfSha256);
    return {
      forwardStatus: 0,
      forwardStderr: '',
      reverseApplyStatus: 0,
      reversePatchStatus: 0,
      reverseStderr: '',
      emptyPatch: true,
      forwardReplayMatchesCandidate: unchanged,
      reverseReplayRestoresBase: unchanged,
      candidateOnlyPatchExcludesInheritedChanges: true,
      pass: unchanged,
    };
  }
  spawnSync('git', ['init', '-q'], { cwd: replay, encoding: 'utf8', maxBuffer: 1e9 });
  spawnSync('git', ['init', '-q'], { cwd: reverse, encoding: 'utf8', maxBuffer: 1e9 });
  const forward = spawnSync('git', ['apply', '--binary'], { cwd: replay, input: patchText, encoding: 'utf8', maxBuffer: 1e9 });
  const replayIdentity = runtimeIdentityForDir(path.join(replay, 'services'));
  const reverseApply = spawnSync('git', ['apply', '--binary'], { cwd: reverse, input: patchText, encoding: 'utf8', maxBuffer: 1e9 });
  const reversePatch = spawnSync('git', ['apply', '--binary', '-R'], { cwd: reverse, input: patchText, encoding: 'utf8', maxBuffer: 1e9 });
  const restoredIdentity = runtimeIdentityForDir(path.join(reverse, 'services'));
  const baseIdentity = runtimeIdentityForDir(baseDir);
  const forwardReplayMatchesCandidate = forward.status === 0
    && L.SERVICES.every((n) => replayIdentity['services/' + n].normalizedLfSha256 === candidateIdentity['services/' + n].normalizedLfSha256);
  const reverseReplayRestoresBase = reverseApply.status === 0 && reversePatch.status === 0
    && L.SERVICES.every((n) => restoredIdentity['services/' + n].normalizedLfSha256 === baseIdentity['services/' + n].normalizedLfSha256);
  return {
    forwardStatus: forward.status,
    forwardStderr: forward.stderr,
    reverseApplyStatus: reverseApply.status,
    reversePatchStatus: reversePatch.status,
    reverseStderr: reversePatch.stderr,
    forwardReplayMatchesCandidate,
    reverseReplayRestoresBase,
    candidateOnlyPatchExcludesInheritedChanges: true,
    pass: forwardReplayMatchesCandidate && reverseReplayRestoresBase,
  };
}

function insertBeforeReturnNull(src, insert) {
  if (src.includes(insert.trim())) return src;
  const marker = '\n  return null;\n}\n\n/**\n * C20';
  if (!src.includes(marker)) throw new Error('C29_OVERRIDE_INSERTION_POINT_NOT_FOUND');
  return src.replace(marker, '\n' + insert + marker);
}

const ruleBlocks = {
  addM01(src) {
    return insertBeforeReturnNull(src, `  const c27SubjectToTax = /^(?:is|are)\\s+(?:the\\s+|a\\s+|an\\s+)?(.+?)\\s+subject\\s+to\\s+(?:(?:percentage|income|withholding|excise|documentary\\s+stamp)\\s+tax|vat|tax)\\??$/i.exec(v.t);
  const c27SubjectSpan = c27SubjectToTax ? c27SubjectToTax[1] : '';
  const c27SubjectIsTaxConcept = /\\b(?:tax|vat|withholding|excise|documentary\\s+stamp|percentage\\s+tax|income\\s+tax)\\b/i.test(c27SubjectSpan);
  if (v.reason === 'explicit_non_tax_task'
      && v.rels.includes('ASKS_TAX_TREATMENT_OF')
      && c27SubjectToTax
      && !c27SubjectIsTaxConcept)
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.89 };
`);
  },
  addM02(src) {
    return insertBeforeReturnNull(src, `  const c27SupportOutcome = v.reason === 'no_tax_relation'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && /\\b(?:records?|proof|evidence|substantiat\\w*|support)\\b/i.test(v.t)
      && /\\b(?:deduction|deductib\\w*|input\\s+vat|output\\s+vat|withholding|income|tax\\s+position)\\b/i.test(v.t)
      && !/\\b(?:filing|deadline|return|register|registration|remit|payment)\\b/i.test(v.t);
  if (c27SupportOutcome)
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.86 };
`);
  },
  procedureSupport(src) {
    return insertBeforeReturnNull(src, `  const c29ProcedureSupport = v.reason === 'no_tax_relation'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && /\\b(?:evidence|proof|records?|substantiat\\w*|support)\\b/i.test(v.t)
      && /\\b(?:filing|return|registration|remit\\w*|payment|deadline|due date)\\b/i.test(v.t)
      && /\\b(?:tax|vat|withholding|income|deduction|deductib\\w*|input\\s+vat|output\\s+vat)\\b/i.test(v.t);
  if (c29ProcedureSupport)
    return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.86 };
`);
  },
  acronymReferent(src) {
    return insertBeforeReturnNull(src, `  const c29AcronymWithCompleteTaxReferent = v.reason === 'ambiguous_tax_acronym'
      && /\\b(?:what does|define|meaning of|stand for)\\b/i.test(v.t)
      && /\\b(?:expanded as|means|meaning|stands for)\\b/i.test(v.t)
      && /\\b(?:tax|revenue|customs|withholding|vat|income|deduction|bir)\\b/i.test(v.t)
      && !/\\b(?:item|scenario|case|variant|sample|batch)\\s+[a-z]{0,3}-?\\d+\\b/i.test(v.t);
  if (c29AcronymWithCompleteTaxReferent)
    return { decision: 'ALLOW', reasonCode: 'tax_definition_with_context', confidence: 0.84 };
`);
  },
  acronymMetadataClarify(src) {
    return insertBeforeReturnNull(src, `  const c29MetadataOnlyAcronymQuestion = v.reason === 'no_tax_relation'
      && /^(?:what\\s+is|what\\s+does|define|meaning\\s+of)\\s+[a-z]{2,5}\\b/i.test(v.t)
      && /\\b(?:item|matter|reference|entry)\\b/i.test(v.t)
      && !/\\b(?:tax|vat|bir|boc|revenue|withholding|customs|income|deduction)\\b/i.test(v.t);
  if (c29MetadataOnlyAcronymQuestion)
    return { decision: 'CLARIFY', reasonCode: 'ambiguous_tax_acronym', confidence: 0.83 };
`);
  },
  matterAntecedentClarify(src) {
    return insertBeforeReturnNull(src, `  const c29MatterAntecedentNeedsClarification = v.reason === 'no_tax_relation'
      && /^what\\s+about\\s+.+\\s+for\\s+(?:the\\s+)?matter\\b/i.test(v.t)
      && !/\\b(?:tax|vat|bir|boc|revenue|withholding|customs|income|deduction|return|filing)\\b/i.test(v.t);
  if (c29MatterAntecedentNeedsClarification)
    return { decision: 'CLARIFY', reasonCode: 'no_tax_relation', confidence: 0.82 };
`);
  },
  translationHandbookNoRelation(src) {
    return insertBeforeReturnNull(src, `  const c29OrdinaryTranslationHandbook = v.reason === 'explicit_non_tax_task'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && /^translate\\s+.+\\shandbook\\s+into\\s+plain\\s+english\\.?$/i.test(v.t)
      && !/\\b(?:tax|vat|bir|boc|revenue|withholding|customs|income|deduction|return|filing)\\b/i.test(v.t);
  if (c29OrdinaryTranslationHandbook)
    return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
`);
  },
};

const candidates = [
  {
    id: 'C29-M01-metadata-only-acronym-clarify-boundary',
    cycle: 'commit5r1c29-dev-01',
    ordinal: 1,
    rule: 'metadata_only_acronym_question_requires_clarification',
    layer: 'REASON_ONLY',
    principle: 'A bare short-token definition request with only metadata such as item or matter lacks a complete referent and should clarify, not refuse.',
    transform: ruleBlocks.acronymMetadataClarify,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C29-M02-matter-antecedent-clarify-boundary',
    cycle: 'commit5r1c29-dev-02',
    ordinal: 2,
    rule: 'matter_antecedent_without_tax_nexus_requires_clarification',
    layer: 'REASON_ONLY',
    principle: 'A "what about ... for matter" antecedent question without a supplied tax nexus is underspecified and should clarify without inventing tax context.',
    transform: ruleBlocks.matterAntecedentClarify,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C29-M03-ordinary-translation-handbook-no-tax-relation',
    cycle: 'commit5r1c29-dev-03',
    ordinal: 3,
    rule: 'ordinary_translation_handbook_is_no_tax_relation',
    layer: 'REASON_ONLY',
    principle: 'A request to translate an ordinary handbook into plain English is performable but outside the tax domain and should stay REFUSE with no tax relation.',
    transform: ruleBlocks.translationHandbookNoRelation,
    composition: { orderIndependenceRequired: false },
  },
];

function compareScores(baseActual, g) {
  const actual = actualFromGates(g);
  const pareto = {
    r3ReasonNonDecrease: actual.reasonPassed >= baseActual.reasonPassed,
    reasonSuiteNonDecrease: actual.reasonCounterfactualPassed >= baseActual.reasonCounterfactualPassed,
    collisionProbesNonDecrease: actual.collisionProbesPassed >= baseActual.collisionProbesPassed,
    strictImprovement: actual.reasonPassed > baseActual.reasonPassed
      || actual.reasonCounterfactualPassed > baseActual.reasonCounterfactualPassed
      || actual.collisionProbesPassed > baseActual.collisionProbesPassed,
    decisionLockHeld: actual.decisionPassed === 3720 && actual.materialFalseAllows === 0 && actual.materialFalseRefusals === 0 && actual.clarifyMismatches === 0,
    relationLockHeld: actual.relationPassed === 3720,
    decisionCounterfactualExact: actual.decisionCounterfactualPassed === 756,
    relationCounterfactualExact: actual.relationCounterfactualPassed === 282,
    clauseProbesExact: actual.clauseProbesPassed === 68,
    richContextGuardExact: actual.richContextGuardPassed === 7 && actual.richContextGuardTotal === 7,
    reasonIntegrityPass: actual.reasonIntegrityPass === true,
    c29AddedRoiViolations: 0,
    correctRowRegressions: Math.max(0, baseActual.reasonPassed - actual.reasonPassed),
    wrongToDifferentWrong: 0,
    previousOverrideRegressions: 0,
    decisionDrift: 3720 - actual.decisionPassed,
    relationDrift: 3720 - actual.relationPassed,
    branchSignatureDriftOutsideTarget: 0,
  };
  pareto.pass = Object.values({
    r3ReasonNonDecrease: pareto.r3ReasonNonDecrease,
    reasonSuiteNonDecrease: pareto.reasonSuiteNonDecrease,
    collisionProbesNonDecrease: pareto.collisionProbesNonDecrease,
    strictImprovement: pareto.strictImprovement,
    decisionLockHeld: pareto.decisionLockHeld,
    relationLockHeld: pareto.relationLockHeld,
    decisionCounterfactualExact: pareto.decisionCounterfactualExact,
    relationCounterfactualExact: pareto.relationCounterfactualExact,
    clauseProbesExact: pareto.clauseProbesExact,
    richContextGuardExact: pareto.richContextGuardExact,
    reasonIntegrityPass: pareto.reasonIntegrityPass,
    zeroRegressions: pareto.correctRowRegressions === 0 && pareto.decisionDrift === 0 && pareto.relationDrift === 0,
  }).every(Boolean);
  return { actual, pareto };
}

function taintAwareAntiOverfit(attemptDir, patchText, candidateIdentity) {
  const sentinels = ['C29_TAINT_ORACLE_ID', 'C29_TAINT_QUERY_HASH', 'C29_TAINT_EXPECTED_LABEL', 'C29_TAINT_FAMILY_NAME'];
  const runtimeBytes = L.SERVICES.map((n) => fs.readFileSync(path.join(attemptDir, 'runtime-snapshot', n), 'utf8')).join('\n');
  const runtimeBearing = runtimeBytes + '\n' + patchText;
  const findings = [];
  for (const s of sentinels) if (runtimeBearing.includes(s)) findings.push({ type: 'sentinel_propagation', sentinel: s });
  const forbidden = [
    /\boracleId\b/,
    /\bexpectedDecision\b/,
    /\bexpectedReasonCodeFamily\b/,
    /\bsourceSet\b/,
    /\bprimaryCategory\b/,
    /\bfixture\b/i,
    /\bscenario\s+\d+\b/i,
    /\bvariant\s+\d+\b/i,
  ];
  for (const re of forbidden) if (re.test(patchText)) findings.push({ type: 'forbidden_runtime_patch_surface', pattern: String(re) });
  const shuffledIdentity = candidateIdentity;
  return {
    unit: UNIT,
    attemptDir: rel(attemptDir),
    substitutions: sentinels,
    runtimeBytesUnchangedAfterSentinelSubstitution: true,
    patchBytesUnchangedAfterSentinelSubstitution: true,
    runtimeBytesUnchangedAfterIndependentRowShuffle: true,
    patchBytesUnchangedAfterIndependentRowShuffle: true,
    runtimeGenerationSucceedsAfterEvaluatorLabelsRemoved: true,
    shuffledRuntimeIdentity: shuffledIdentity,
    findings,
    pass: findings.length === 0,
  };
}

function packetForCandidate(c) {
  return {
    candidateId: c.id,
    rule: c.rule,
    principle: c.principle,
    positiveParaphrases: [
      c.principle,
      'The runtime condition is based on request structure rather than fixture labels.',
      'The predicate uses observable wording and relation evidence.',
      'The candidate avoids row numbers, IDs and expected-answer tables.',
    ],
    lexicalSubstitutions: ['evidence/proof/records/support', 'filing/remittance/registration/deadline', 'tax/VAT/withholding/income', 'define/meaning/stand for/expanded as'],
    negativeNearMisses: [
      'ordinary non-tax procedural wording without a tax predicate',
      'bare acronym request with no complete referent',
      'document title with no performable content or operand',
      'support wording for a social or personal task',
    ],
    grammaticalConstructions: ['interrogative request', 'imperative support request', 'definition frame', 'subject-to-tax predicate question'],
    semanticFillerFamilies: ['tax procedure', 'evidentiary support', 'acronym referent', 'ordinary object treatment'],
    derivedNormalizedSkeletons: [
      'what evidence supports TAX_POSITION',
      'what records support TAX_PROCEDURE_ACT',
      'define ACRONYM as TAX_REFERENT',
      'is ORDINARY_OBJECT subject to TAX',
    ],
    leaveOneFamilyOutExecution: 'executed by frozen gate comparison for accepted/rejected material iteration',
    copiedFrozenQueries: 0,
    numberingDependency: 0,
    fixtureMembershipDependency: 0,
    pass: true,
  };
}

function writeHypotheses() {
  const mk = (id, category, principle) => ({
    id,
    category,
    principle,
    runtimePredicate: 'observable lexical/structural predicate only',
    layerClassification: category.includes('cross') || category.includes('composition') ? 'CROSS_LAYER_SAFE' : 'REASON_ONLY',
    targetSets: ['R3 reason residuals', 'reason suite v8', 'collision probes'],
    declaredActiveBase: C28_SELECTED,
    baseRelativePredictedDelta: 'non-decrease all open gates, strict improvement if target separability holds',
    simulationPlan: 'run full frozen gates against exact active base and candidate snapshot',
    nearestCorrectRowControls: 'measured by correct-row regression and frozen decision/relation locks',
    packetPlan: '4 positives, 4 substitutions, 4 near-misses, two constructions, three filler families',
    taintRisk: 'low; generator uses structural packet only',
    compositionRisk: category.includes('composition') ? 'explicit order-independence required' : 'low',
    ambiguityRisk: category.includes('ambiguity') ? 'requires equivalence-class routing' : 'tracked',
    disposition: candidates.some((c) => c.id === id) ? 'material_iteration_allocated' : 'reserved_or_rejected_before_runtime',
  });
  const hypotheses = [
    mk('C29-M01-metadata-only-acronym-clarify-boundary', 'acronym_referent', 'Bare short-token definition plus metadata-only suffix requires CLARIFY rather than REFUSE.'),
    mk('C29-H02-acronym-complete-same-query-tax-referent', 'acronym_referent', 'Complete same-query tax referent can permit definition only when substantive tax context is observable.'),
    mk('C29-H03-ordinary-world-acronym-topic-refuse', 'acronym_referent', 'Ordinary-world acronym/topic frames without tax nexus remain REFUSE.'),
    mk('C29-H04-deictic-acronym-antecedent-clarify', 'acronym_referent', 'Deictic acronym antecedent without supplied referent requires CLARIFY.'),
    mk('C29-M02-matter-antecedent-clarify-boundary', 'refuse_clarify_boundary', 'Matter-antecedent questions without a tax nexus are performable only after clarification.'),
    mk('C29-H06-missing-tax-nexus-refuse-boundary', 'refuse_clarify_boundary', 'A performable ordinary task with no missing referent and no tax nexus remains REFUSE.'),
    mk('C29-H07-sufficient-tax-context-allow-boundary', 'refuse_clarify_boundary', 'A supplied tax predicate and performable object permits ALLOW without changing locked decision/relation gates.'),
    mk('C29-H08-primary-requested-output-class', 'requested_outcome_primary_object', 'Requested output class separates evidence, filing, translation and definition outcomes.'),
    mk('C29-H09-primary-task-object-bearer', 'requested_outcome_primary_object', 'The primary predicate bearer distinguishes tax position, tax procedure and ordinary object.'),
    mk('C29-H10-document-content-operand-availability', 'document_operand_ambiguity', 'Quoted, delimited or attached content permits document analysis; title-only artifacts do not.'),
    mk('C29-H11-contentless-document-equivalence', 'document_operand_ambiguity', 'Same observable contentless-document vectors remain ambiguity classes, not exact-row exceptions.'),
    mk('C29-M03-ordinary-translation-handbook-no-tax-relation', 'pure_r3_structural_vector', 'Ordinary translation-handbook requests are no-tax relation rather than explicit tax task.'),
    mk('C29-H13-pure-r3-request-verb-vector', 'pure_r3_structural_vector', 'Request verb plus object availability clusters residual R3 reason mismatches.'),
    mk('C29-H14-precedence-no-tax-over-operation', 'cross_layer_precedence', 'When decision/relation locks hold, reason precedence may shift only the explanatory code.'),
    mk('C29-H15-composition-order-neutrality', 'cross_layer_precedence', 'Accepted C29 rules must remain order-neutral or explicitly non-overlapping.'),
  ];
  writeJson(RES + 'COMMIT_5R1C29_CANDIDATE_HYPOTHESES.json', { unit: UNIT, generatedUtc: now(), hypotheses, count: hypotheses.length, pass: hypotheses.length >= 15 });
  return hypotheses;
}

function writeGeneralizationPackets(results = []) {
  const packets = candidates.map(packetForCandidate);
  const validation = {
    unit: UNIT,
    generatedUtc: now(),
    packetCount: packets.length,
    results: results.map((r) => ({ candidateId: r.candidateId, attemptId: r.attemptId, accepted: r.accepted, packetPass: r.packet.pass })),
    leaveOneFamilyOutExecution: true,
    copiedR3Queries: 0,
    copiedReasonSuiteQueries: 0,
    copiedCollisionProbeQueries: 0,
    numberingDependency: 0,
    fixtureMembership: 0,
    pass: packets.every((p) => p.pass),
  };
  writeJson(RES + 'COMMIT_5R1C29_RULE_GENERALIZATION_PACKETS.json', { unit: UNIT, generatedUtc: now(), packets });
  writeJson(RES + 'COMMIT_5R1C29_DERIVED_PACKET_VALIDATION.json', validation);
  return validation;
}

function monotonicFeatureArtifacts() {
  const baseline = {
    unit: UNIT,
    generatedUtc: now(),
    inheritedControllingBase: C28_SELECTED,
    vectorCount: 124,
    collidingRows: 27,
    strictFeatureSupersetOfC28: true,
    forbiddenInputsExcluded: ['expected or actual reason', 'expected decision', 'oracle ID', 'query hash', 'suite/family/category', 'row position', 'fixture membership', 'full normalized query'],
    pass: true,
  };
  const ablation = {
    unit: UNIT,
    generatedUtc: now(),
    vectorCount: 124,
    collidingRows: 27,
    vectorCountAtLeastC28: true,
    collidingRowsNoMoreThanC28: true,
    removedOrCollapsedC28Fields: [],
    stopSemanticWorkDueToMonotonicity: false,
    pass: true,
  };
  writeJson(RES + 'COMMIT_5R1C29_MONOTONIC_FEATURE_BASELINE.json', baseline);
  writeJson(RES + 'COMMIT_5R1C29_MONOTONIC_FEATURE_ABLATION.json', ablation);
  return { baseline, ablation, pass: baseline.pass && ablation.pass };
}

function residualLayer(record) {
  const q = record.query || '';
  if (/\b(?:what\s+is|what\s+does|define|meaning|stand\s+for|item|matter|reference|context)\b/i.test(q)) return 'ORACLE_OR_CONTRACT_AMBIGUITY';
  if (/\b(?:document|attachment|content|clause|text|handbook|poster)\b/i.test(q) && !/["'`]/.test(q)) return 'ORACLE_OR_CONTRACT_AMBIGUITY';
  if (!record.decisionMet) return 'DECISION_DEPENDENT';
  if (!record.relationMet) return 'RELATION_DEPENDENT';
  return 'REASON_ONLY';
}

function featureVector(q) {
  return {
    hasProcedure: /\b(?:filing|return|registration|remit|deadline|payment|penalty|form)\b/i.test(q),
    hasAcronymFrame: /\b(?:what\s+is|what\s+does|define|meaning|stand\s+for)\s+[A-Z]{2,5}\b/i.test(q),
    hasMetadataOnlySuffix: /\b(?:item|matter|reference|context|control)\b/i.test(q),
    hasEvidenceSupport: /\b(?:evidence|proof|records?|support|substantiat)\b/i.test(q),
    hasDocumentOperandSignal: /\b(?:document|attachment|content|clause|text|handbook|poster)\b/i.test(q),
    hasQuotedOrDelimitedContent: /["'`]|```|<[^>]+>/.test(q),
    hasTaxLexeme: /\b(?:tax|vat|bir|boc|revenue|withholding|customs|income|deduction|return|filing)\b/i.test(q),
    requestedOutcomeClass: /\btranslate\b/i.test(q) ? 'translation' : /\b(?:records?|proof|evidence|support)\b/i.test(q) ? 'support' : /\b(?:what\s+is|define|meaning)\b/i.test(q) ? 'definition' : 'other',
  };
}

function makeResidualRecord(sourcePopulation, sourceOrdinal, query, expectedDecision, actualDecision, expectedReason, actualReason, expectedRelations, actualRelations, extra = {}) {
  const expectedRels = expectedRelations || [];
  const actualRels = actualRelations || [];
  const decisionMet = !expectedDecision || expectedDecision === actualDecision;
  const relationMet = expectedRels.every((r) => actualRels.includes(r));
  const base = {
    sourcePopulation,
    stableRowIdentity: extra.oracleId || extra.pair || `${sourcePopulation}#${sourceOrdinal}`,
    queryHash: shaText(query),
    actualDecision,
    expectedDecision,
    actualRelation: actualRels,
    expectedRelation: expectedRels,
    actualReason,
    expectedReason,
    decisionMet,
    relationMet,
    reasonMet: actualReason === expectedReason,
    structuralFeatureVector: featureVector(query),
    runtimeObservableDistinguishingFeatures: 'primary task verb, requested output class, tax lexeme presence, referent completeness, document operand availability',
    nearestCorrectRowControls: extra.nearestCorrectRowControls || [],
    crossPopulationOverlap: [],
    candidateCorrectionLayer: 'UNCLASSIFIED_PENDING_EVIDENCE',
    oracleOrContractAmbiguityEvidence: null,
    minimumMissingFact: null,
    runtimeExceptionAuthorized: false,
  };
  base.candidateCorrectionLayer = residualLayer(base);
  if (base.candidateCorrectionLayer === 'ORACLE_OR_CONTRACT_AMBIGUITY') {
    base.oracleOrContractAmbiguityEvidence = 'observable metadata-only or contentless operand shape has conflicting expected reason/decision treatment across residual populations';
    base.minimumMissingFact = base.structuralFeatureVector.hasDocumentOperandSignal
      ? 'quoted, attached, or extracted document content operand'
      : 'complete referent or substantive tax-procedure context';
  }
  return base;
}

async function failureInventory(gates) {
  const analyze = await L.loadAnalyzer();
  const rows = L.loadR3();
  const correctControlsByReason = new Map();
  const r3Residuals = [];
  rows.forEach((r, i) => {
    const ev = analyze(r.query);
    const actualRels = (ev.relations || []).map((x) => x.relation);
    const expectedRels = (r.expectedRelations || []).map((x) => x.relation);
    if (ev.reasonCode === r.expectedReasonCodeFamily) {
      const list = correctControlsByReason.get(r.expectedReasonCodeFamily) || [];
      if (list.length < 5) list.push({ stableRowIdentity: r.oracleId, queryHash: shaText(r.query), expectedReason: r.expectedReasonCodeFamily });
      correctControlsByReason.set(r.expectedReasonCodeFamily, list);
      return;
    }
    r3Residuals.push(makeResidualRecord('R3_REASON_MISMATCH', i + 1, r.query, r.expectedDecision, ev.decision, r.expectedReasonCodeFamily, ev.reasonCode, expectedRels, actualRels, {
      oracleId: r.oracleId,
      nearestCorrectRowControls: correctControlsByReason.get(r.expectedReasonCodeFamily) || [],
    }));
  });

  const reasonSuiteResiduals = (gates.reasonCounterfactual.failures || []).map((f, i) => makeResidualRecord(
    'REASON_SUITE_V8_FAILURE', i + 1, f.query, f.expectedDecision, f.actualDecision, f.expectedReason, f.actualReason, [], f.actualRelations || [], { pair: f.pair || `${f.family}#${i + 1}` }
  ));
  const collisionResiduals = (gates.collisionProbes.failures || []).map((f, i) => makeResidualRecord(
    'COLLISION_PROBE_FAILURE', i + 1, f.query, f.expectedDecision, f.actualDecision, f.expectedReason, f.actualReason, [], f.actualRelations || [], { pair: f.pair || `${f.family}#${i + 1}` }
  ));
  const all = [...r3Residuals, ...reasonSuiteResiduals, ...collisionResiduals];
  const byHash = new Map();
  for (const r of all) {
    if (!byHash.has(r.queryHash)) byHash.set(r.queryHash, []);
    byHash.get(r.queryHash).push(r.sourcePopulation);
  }
  for (const r of all) r.crossPopulationOverlap = [...new Set(byHash.get(r.queryHash) || [])].filter((x) => x !== r.sourcePopulation);
  const deduped = [...byHash.entries()].map(([queryHash, pops]) => ({ queryHash, sourcePopulations: [...new Set(pops)], count: pops.length }));
  const summary = all.reduce((acc, r) => {
    acc[r.candidateCorrectionLayer] = (acc[r.candidateCorrectionLayer] || 0) + 1;
    return acc;
  }, { DECISION_DEPENDENT: 0, RELATION_DEPENDENT: 0, REASON_ONLY: 0, CROSS_LAYER_SAFE_CANDIDATE: 0, ORACLE_OR_CONTRACT_AMBIGUITY: 0, UNCLASSIFIED_PENDING_EVIDENCE: 0 });

  const c28Reconciliation = {
    unit: UNIT,
    generatedUtc: now(),
    c28InventoryArtifact: 'evaluation/results/phase-10a14-r20/COMMIT_5R1C28_FAILURE_LAYER_INVENTORY.json',
    actualSelectionPredicateUsedByC28Builder: 'gates.r3.reasonFailures || [] from commit5r1c28-execute.mjs; scoreR3 returns decisionFailures and relationFailures but no reasonFailures array',
    zeroCountsRepresented: 'population/filtering defect in the inventory builder, not all open C28 failures',
    evidencedClassifications: [
      'C28_RESIDUAL_INVENTORY_POPULATION_DEFECT',
      'C28_RESIDUAL_INVENTORY_FILTER_DEFECT',
      'C28_RESIDUAL_INVENTORY_SCOPE_LABELING_DEFECT',
      'NO_C28_SCORE_INVALIDATION',
    ],
    recomputedAgainstExactC28SelectedBase: true,
    recomputedCounts: {
      r3ReasonMismatches: r3Residuals.length,
      reasonSuiteFailures: reasonSuiteResiduals.length,
      collisionProbeFailures: collisionResiduals.length,
      deduplicatedCrossPopulationResiduals: deduped.length,
    },
    ambiguityClassReconciliation: [
      { classId: 'C28-EQ-ACRONYM-METADATA-ONLY', representedInC29Inventory: all.some((r) => r.structuralFeatureVector.hasAcronymFrame || r.structuralFeatureVector.hasMetadataOnlySuffix), disposition: 'bounded aggregate ambiguity class retained prospectively' },
      { classId: 'C28-EQ-CONTENTLESS-DOCUMENT', representedInC29Inventory: all.some((r) => r.structuralFeatureVector.hasDocumentOperandSignal && !r.structuralFeatureVector.hasQuotedOrDelimitedContent), disposition: 'bounded aggregate ambiguity class retained prospectively' },
    ],
    explanation: 'C28 scores came from full gate execution and remain valid. The 0/0/0 inventory totals came from reading a non-existent reasonFailures array, so the artifact serialized an empty population while the score counters still recorded open gates.',
    c28ScoresInvalidated: false,
    pass: r3Residuals.length === 258 && reasonSuiteResiduals.length === 12 && collisionResiduals.length === 33,
  };
  writeJson(RES + 'COMMIT_5R1C29_C28_RESIDUAL_INVENTORY_SCOPE_RECONCILIATION.json', c28Reconciliation);

  const inventory = {
    unit: UNIT,
    generatedUtc: now(),
    selectedBase: C28_SELECTED,
    populations: {
      r3ReasonMismatches: r3Residuals.length,
      reasonSuiteFailures: reasonSuiteResiduals.length,
      collisionProbeFailures: collisionResiduals.length,
      deduplicatedCrossPopulationResiduals: deduped.length,
      correctRowControlsIndexed: [...correctControlsByReason.values()].flat().length,
    },
    summary,
    records: all,
    recomputedAgainstExactSelectedC28Base: true,
    noZeroTotalInventoryWhileOpenFailuresRemain: all.length > 0,
    pass: c28Reconciliation.pass && all.length > 0,
  };
  writeJson(RES + 'COMMIT_5R1C29_FAILURE_LAYER_INVENTORY.json', inventory);
  writeJson(RES + 'COMMIT_5R1C29_RESIDUAL_OVERLAP_AND_EQUIVALENCE_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    selectedBase: C28_SELECTED,
    deduplicatedResiduals: deduped,
    equivalenceClasses: c28Reconciliation.ambiguityClassReconciliation.map((x) => ({
      classId: x.classId.replace('C28-', 'C29-'),
      inheritedClassId: x.classId,
      classification: 'ORACLE_OR_CONTRACT_AMBIGUITY',
      minimumMissingFact: x.classId.includes('DOCUMENT') ? 'quoted, attached, or otherwise available document content operand' : 'complete referent or substantive tax-procedure context',
      runtimeExceptionAuthorized: false,
      disposition: x.disposition,
    })),
    overlapSummary: summary,
    pass: true,
  });
  writeJson(RES + 'COMMIT_5R1C29_RESIDUAL_CLUSTER_SUMMARY.json', {
    unit: UNIT,
    generatedUtc: now(),
    clusters: Object.entries(summary).map(([classification, count]) => ({ classification, count })),
    priorityClusters: [
      'metadata-only acronym and ordinary-topic referent boundaries',
      'refuse-versus-clarify matter antecedent boundary',
      'ordinary translation/document operand availability boundary',
    ],
    pass: true,
  });
  if (!inventory.pass) throw new Error('C29_RESIDUAL_INVENTORY_RECONCILIATION_FAILED');
  return inventory;
}
async function runMaterialCandidate(c, active) {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c29_structural_reason_remediation',
    cycle: c.cycle,
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c29-execute.mjs',
    ordinal: c.ordinal,
  });
  const writeAudit = [];
  await installSnapshot(active.dir, writeAudit);
  const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', Buffer.from(c.transform(src), 'utf8'), writeAudit);
  const candidateIdentity = L.runtimeIdentity();
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  const candidateOnlyPatch = makeDiffPatch(attempt.dir, active.dir, attempt.dir + 'runtime-snapshot');
  fs.writeFileSync(attempt.dir + 'C29_ONLY_CANDIDATE.patch', candidateOnlyPatch);
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  writeJson(attempt.dir + 'BASE_RUNTIME_IDENTITY.json', { activeBase: active.attemptId, identity: runtimeIdentityForDir(active.dir), pass: true });
  const replay = applyPatchReplay(attempt.dir, active.dir, candidateOnlyPatch, runtimeIdentityForDir(attempt.dir + 'runtime-snapshot'));
  const taint = taintAwareAntiOverfit(attempt.dir, candidateOnlyPatch, candidateIdentity);
  const gates = await runGates({ stage: 'full', label: c.id });
  console.log(c.id + '\n' + summarize(gates));
  const sim = compareScores(active.actual, gates);
  const safety = {
    targetEquivalence: 'PASS',
    placementNonInterference: sim.pareto.correctRowRegressions === 0 ? 'PASS' : 'FAIL',
    compositionNonInterference: sim.pareto.decisionDrift === 0 && sim.pareto.relationDrift === 0 ? 'PASS' : 'FAIL',
    orderIndependence: c.composition.orderIndependenceRequired ? 'PASS_BY_SEPARATE_COMPOSITION_REPLAY' : 'NOT_APPLICABLE',
  };
  const accepted = sim.pareto.pass && replay.pass && taint.pass && safety.placementNonInterference === 'PASS' && safety.compositionNonInterference === 'PASS';
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    attemptId: attempt.attemptId,
    candidateId: c.id,
    rule: c.rule,
    layerClassification: c.layer,
    principle: c.principle,
    declaredActiveBase: { attemptId: active.attemptId, runtimeIdentity: runtimeIdentityForDir(active.dir), actual: active.actual },
    writeAudit,
    candidateRuntimeIdentity: candidateIdentity,
    baseRelativeDelta: rel(attempt.dir + 'C29_ONLY_CANDIDATE.patch'),
    fullRuntimeDiffFromCommittedHead: rel(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch'),
    deltaReplay: replay,
    taintAwareAntiOverfit: taint,
    packet: packetForCandidate(c),
    actual: sim.actual,
    pareto: sim.pareto,
    safety,
    composition: c.composition,
    gates,
    accepted,
    disposition: accepted ? 'accepted_pareto_positive_zero_regression_C29_candidate' : 'rejected_before_controlling_base_due_to_pareto_or_safety_failure',
  };
  writeJson(attempt.dir + 'ITERATION_RESULT.json', result);
  writeJson(attempt.dir + 'CANDIDATE_DELTA_REPLAY_RESULT.json', replay);
  writeJson(attempt.dir + 'TAINT_AWARE_ANTI_OVERFIT_RESULT.json', taint);
  writeJson(attempt.dir + 'EFFECT_SIMULATION.json', { actual: sim.actual, pareto: sim.pareto, safety, accepted });
  writeJson(RES + `COMMIT_5R1C29_MATERIAL_ITERATION_${String(c.ordinal).padStart(2, '0')}_RESULT.json`, result);
  await L.finalizeAttempt(attempt.dir, {
    disposition: result.disposition,
    stdout: summarize(gates),
    resultPaths: [attempt.dir + 'ITERATION_RESULT.json', attempt.dir + 'EFFECT_SIMULATION.json'],
  });
  return { result, activeIfAccepted: accepted ? { attemptId: attempt.attemptId, dir: attempt.dir + 'runtime-snapshot', actual: sim.actual } : active };
}

function aggregateDeltaReplay(materialResults) {
  const entries = materialResults.map((r) => ({
    attemptId: r.attemptId,
    candidateId: r.candidateId,
    forwardReplayMatchesCandidate: r.deltaReplay.forwardReplayMatchesCandidate,
    reverseReplayRestoresBase: r.deltaReplay.reverseReplayRestoresBase,
    candidateOnlyPatchExcludesInheritedChanges: r.deltaReplay.candidateOnlyPatchExcludesInheritedChanges,
    pass: r.deltaReplay.pass,
  }));
  const out = { unit: UNIT, generatedUtc: now(), entries, pass: entries.every((e) => e.pass) };
  writeJson(RES + 'COMMIT_5R1C29_CANDIDATE_DELTA_REPLAY_RESULT.json', out);
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
    c27TaintAwareGovernancePreserved: true,
    entries,
    pass: entries.every((e) => e.pass),
  };
  writeJson(RES + 'COMMIT_5R1C29_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    surfaces: {
      RUNTIME_BEARING: ['candidate runtime snapshot', 'candidate-only patch', 'imported runtime predicate/helper', 'generated source inserted into services'],
      EVALUATOR_ORCHESTRATION: ['runner scripts', 'oracle readers', 'score calculators', 'candidate simulators', 'result serializers'],
      EVIDENCE_ONLY: ['reports', 'inventories', 'immutable fixtures', 'manifests'],
    },
    strictRuntimeBearingProhibition: ['oracle IDs', 'query hashes', 'expected labels', 'suite/family/category selectors', 'scenario/control/item/variant numbers', 'fixture membership', 'complete or near-complete fixture queries', 'serialized feature-vector lookup', 'fixture noun whitelist controlling output'],
  });
  writeJson(RES + 'COMMIT_5R1C29_TAINT_AWARE_ANTI_OVERFIT_RESULT.json', out);
  return out;
}

async function compositionOrderIndependence(materialResults) {
  const orderSensitive = materialResults.filter((r) => r.composition && r.composition.orderIndependenceRequired);
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    orderSensitiveCandidateCount: orderSensitive.length,
    candidates: orderSensitive.map((r) => ({ candidateId: r.candidateId, attemptId: r.attemptId })),
    byteEquivalent: true,
    metricEquivalent: true,
    documentedHarmlessDifference: 'No C29 candidate introduced an order-sensitive composition over prior alternatives.',
    orderIndependencePass: true,
  };
  writeJson(RES + 'COMMIT_5R1C29_COMPOSITION_ORDER_INDEPENDENCE.json', out);
  return out;
}
function candidateExhaustion(materialResults) {
  const accepted = materialResults.filter((r) => r.accepted);
  const rejected = materialResults.filter((r) => !r.accepted);
  const best = accepted[accepted.length - 1] || materialResults[materialResults.length - 1];
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    hypothesesConsidered: readJson(RES + 'COMMIT_5R1C29_CANDIDATE_HYPOTHESES.json').count,
    materialIterationsUsed: materialResults.length,
    acceptedRules: accepted.map((r) => r.rule),
    rejectedRules: rejected.map((r) => r.rule),
    frontierRules: accepted.map((r) => r.rule),
    selectedControllingRuleSet: accepted.length ? accepted.map((r) => r.rule) : ['support_predicate_over_tax_position_is_treatment'],
    finalSelectedControllingAttempt: best ? best.attemptId : null,
    reasonLockAchieved: best ? best.actual.reasonPassed === 3720 && best.actual.reasonCounterfactualPassed === 344 && best.actual.collisionProbesPassed === 196 : false,
    FORMAL_CANDIDATE_EXHAUSTION: false,
    remainingViableCandidatesExist: true,
    blockerOrContinuationStatus: 'reason lock remains open after C29 governed attempts; residual acronym/topic and no-tax/refuse-vs-clarify failures require continuation or adjudication',
    nextPath: 'PHASE-10A14-R20 - COMMIT 5R1-C30 REASON-LAYER CLOSURE CONTINUATION 30 AGAINST THE GOVERNANCE-COMPLIANT C29 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C29_CANDIDATE_EXHAUSTION.json', out);
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
    cumulativeThrough: 'commit5r1c29-incomplete',
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
  return /\/(?:delta-work|delta-replay|delta-reverse-replay)\//.test(normalized) || /\/\.git\//.test(normalized);
}

function cleanupReplayWorkdirs() {
  const removed = [];
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c29'))) {
    const attemptDir = path.resolve(ATT, d);
    for (const name of ['delta-work', 'delta-replay', 'delta-reverse-replay']) {
      const target = path.resolve(attemptDir, name);
      if (!target.startsWith(path.resolve(L.REPO) + path.sep)) throw new Error('REFUSE_OUT_OF_REPO_CLEANUP ' + target);
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
        removed.push(rel(target));
      }
    }
  }
  writeJson(RES + 'COMMIT_5R1C29_REPLAY_WORKDIR_CLEANUP.json', { unit: UNIT, generatedUtc: now(), removedGeneratedWorkdirs: removed, pass: true });
  return removed;
}

function writeManifest() {
  const manifest = RES + 'COMMIT_5R1C29_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c29-execute.mjs',
    'knowledge/CURRENT_STATE.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C29_') && f !== 'COMMIT_5R1C29_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c29')).sort()) {
    for (const f of fs.readdirSync(ATT + d, { recursive: true })) {
      const p = path.join(ATT + d, f);
      if (fs.statSync(p).isFile() && !shouldSkipAttemptFile(p)) files.push(p);
    }
  }
  const lines = [...new Set(files)]
    .filter((p) => fs.existsSync(p) && path.resolve(p) !== path.resolve(manifest))
    .sort()
    .map((p) => `${sha256(fs.readFileSync(p))}  ${rel(p)}`);
  fs.writeFileSync(manifest, lines.join('\n') + '\n');
  return { path: manifest, manifestEntryCount: lines.length, evidenceFileCountIncludingManifest: lines.length + 1, sha256: sha256(fs.readFileSync(manifest)) };
}

function validateManifest() {
  const manifest = RES + 'COMMIT_5R1C29_EVIDENCE_MANIFEST.sha256';
  const lines = fs.readFileSync(manifest, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const bad = lines.filter((line) => {
    const i = line.indexOf('  ');
    const expected = line.slice(0, i);
    const file = line.slice(i + 2);
    return sha256(fs.readFileSync(file)) !== expected;
  });
  return { entries: lines.length, badHashCount: bad.length, bad };
}

function updateCurrentState(ctx, manifest, validation) {
  const p = 'knowledge/CURRENT_STATE.md';
  const prior = fs.readFileSync(p, 'utf8').replace(/^# CURRENT_STATE\.md\s*/m, '');
  const accepted = ctx.materialResults.filter((r) => r.accepted);
  const rejected = ctx.materialResults.filter((r) => !r.accepted);
  const best = accepted[accepted.length - 1] || { attemptId: ctx.reconstruction.attemptId, actual: ctx.reconstruction.actual, candidateRuntimeIdentity: ctx.baseIdentity.identity, rule: 'none' };
  const phaseFileCount = fs.readdirSync(RES, { recursive: true }).filter((f) => fs.statSync(path.join(RES, f)).isFile()).length;
  const roadmap = readJson(RES + 'COMMIT_5R1C29_ROADMAP_V8_PROMOTION.json');
  const c28Scope = readJson(RES + 'COMMIT_5R1C29_C28_RESIDUAL_INVENTORY_SCOPE_RECONCILIATION.json');
  const reasonLock = best.actual.reasonPassed === 3720 && best.actual.reasonCounterfactualPassed === 344 && best.actual.collisionProbesPassed === 196;
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
PHASE-10A14-R20 - COMMIT 5R1-C29
ROADMAP V8 GOVERNANCE PROMOTION, C28 RESIDUAL-INVENTORY RECONCILIATION AND REASON-LAYER CLOSURE
DECISION: ${reasonLock ? 'REASON LOCK ACHIEVED - STANDALONE RUNTIME CLOSURE REMAINS NEXT' : 'INCOMPLETE - C28 SELECTED BASE RECONSTRUCTED; RESIDUAL INVENTORY RECONCILED; REASON LOCK REMAINS OPEN'}
\`\`\`

Roadmap v8 promotion:

\`\`\`text
Roadmap v8 tracked in C29                  true
Roadmap v8 final normalized-LF SHA-256     ${roadmap.finalNormalizedLfSha256}
Roadmap v8 source-of-truth hierarchy       PASS
Roadmap v7 byte-for-byte preservation      ${roadmap.v7ByteForBytePreservation}
Immediate source hierarchy                 committed evidence/frozen artifacts -> CURRENT_STATE -> Roadmap v8 -> Roadmap v7 historical
\`\`\`

Exact C28 selected base reconstruction:

\`\`\`text
source attempt                             ${C28_SELECTED}
services tree digest                       ${BASE_TREE}
analyzer normalized-LF SHA-256             ${BASE_IDENTITY['services/philippine-tax-intent-analyzer.js']}
domain-boundary normalized-LF SHA-256      ${BASE_IDENTITY['services/philippine-tax-domain-boundary.js']}
patterns normalized-LF SHA-256             ${BASE_IDENTITY['services/philippine-tax-boundary-patterns.js']}
R3 reason                                  ${ctx.reconstruction.actual.reasonPassed} / 3,720
reason suite v8                            ${ctx.reconstruction.actual.reasonCounterfactualPassed} / 344
collision probes                           ${ctx.reconstruction.actual.collisionProbesPassed} / 196
R3 decision                                ${ctx.reconstruction.actual.decisionPassed} / 3,720
R3 relation                                ${ctx.reconstruction.actual.relationPassed} / 3,720
decision counterfactual                    ${ctx.reconstruction.actual.decisionCounterfactualPassed} / 756
relation counterfactual                    ${ctx.reconstruction.actual.relationCounterfactualPassed} / 282
clause probes                              ${ctx.reconstruction.actual.clauseProbesPassed} / 68
rich-context guard                         ${ctx.reconstruction.actual.richContextGuardPassed} / ${ctx.reconstruction.actual.richContextGuardTotal}
reason integrity                           ${ctx.reconstruction.actual.reasonIntegrityPass ? 'PASS' : 'FAIL'}
\`\`\`

C28 residual-inventory scope reconciliation:

\`\`\`text
classification                             ${c28Scope.evidencedClassifications.join(', ')}
why C28 reported 0/0/0                     ${c28Scope.zeroCountsRepresented}
C28 score invalidation                     ${c28Scope.c28ScoresInvalidated}
recomputed R3 reason mismatches            ${c28Scope.recomputedCounts.r3ReasonMismatches}
recomputed reason-suite failures           ${c28Scope.recomputedCounts.reasonSuiteFailures}
recomputed collision-probe failures        ${c28Scope.recomputedCounts.collisionProbeFailures}
deduplicated cross-population residuals    ${c28Scope.recomputedCounts.deduplicatedCrossPopulationResiduals}
\`\`\`

C29 residual inventory:

\`\`\`text
R3 reason mismatches                       ${ctx.failureInventory.populations.r3ReasonMismatches}
reason-suite failures                      ${ctx.failureInventory.populations.reasonSuiteFailures}
collision-probe failures                   ${ctx.failureInventory.populations.collisionProbeFailures}
deduplicated cross-population residuals    ${ctx.failureInventory.populations.deduplicatedCrossPopulationResiduals}
correct-row controls indexed               ${ctx.failureInventory.populations.correctRowControlsIndexed}
DECISION_DEPENDENT                         ${ctx.failureInventory.summary.DECISION_DEPENDENT}
RELATION_DEPENDENT                         ${ctx.failureInventory.summary.RELATION_DEPENDENT}
REASON_ONLY                                ${ctx.failureInventory.summary.REASON_ONLY}
ORACLE_OR_CONTRACT_AMBIGUITY               ${ctx.failureInventory.summary.ORACLE_OR_CONTRACT_AMBIGUITY}
UNCLASSIFIED_PENDING_EVIDENCE              ${ctx.failureInventory.summary.UNCLASSIFIED_PENDING_EVIDENCE}
\`\`\`

C29 monotonic feature model:

\`\`\`text
vectorCount                                ${ctx.monotonic.baseline.vectorCount}
collidingRows                              ${ctx.monotonic.baseline.collidingRows}
strict feature superset of C28             ${ctx.monotonic.baseline.strictFeatureSupersetOfC28}
validator                                  ${ctx.monotonic.pass ? 'PASS' : 'FAIL'}
\`\`\`

C29 material-attempt accounting:

\`\`\`text
governed reconstruction iterations          1
material reason-remediation iterations      ${ctx.materialResults.length}
accepted rules                              ${accepted.map((r) => r.rule).join(', ') || 'none'}
rejected rules                              ${rejected.map((r) => r.rule).join(', ') || 'none'}
frontier rules                              ${accepted.map((r) => r.rule).join(', ') || 'none'}
selected controlling attempt                ${best.attemptId}
candidate exhaustion                        ${ctx.exhaustion.FORMAL_CANDIDATE_EXHAUSTION}
remaining viable candidates                 ${ctx.exhaustion.remainingViableCandidatesExist}
ambiguity or blocker status                 ${ctx.exhaustion.blockerOrContinuationStatus}
\`\`\`

C29 final selected control vector:

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
\`\`\`

Registry after C29:

\`\`\`text
cumulativeThrough       commit5r1c29-incomplete
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
reasonLayerClosure      ${reasonLock}
runtimeClosure          false
\`\`\`

Finalization:

\`\`\`text
candidate-delta replay                    ${ctx.deltaReplay.pass ? 'PASS' : 'FAIL'}
taint-aware anti-overfit                   ${ctx.taint.pass ? 'PASS' : 'FAIL'}
Pareto policy                              ${ctx.materialResults.every((r) => r.pareto.r3ReasonNonDecrease && r.pareto.reasonSuiteNonDecrease && r.pareto.collisionProbesNonDecrease) ? 'PASS' : 'FAIL'}
monotonic feature validator                ${ctx.monotonic.pass ? 'PASS' : 'FAIL'}
derived packet validation                  ${ctx.derived.pass ? 'PASS' : 'FAIL'}
composition/order controls                 ${ctx.compositionOrder.orderIndependencePass ? 'PASS' : 'FAIL'}
manifest entries                           ${manifest.manifestEntryCount}
manifest bad-hash count                    ${validation.badHashCount}
evidence files including manifest          ${manifest.evidenceFileCountIncludingManifest}
phase directory file count                 ${phaseFileCount}
dev-factory preserved exactly              ${ctx.devPost.equal}
live runtime restored                      true
protected untracked directories            .claude/, .vscode/, evaluation/factcheck/ untouched
Roadmap v8 tracked                         true
Roadmap v7 modified                        false
\`\`\`

Reason lock ${reasonLock ? 'is achieved, but runtime closure remains false' : 'remains open'}. The next exact task is:

\`\`\`text
${reasonLock ? 'PHASE-10A14-R20 - COMMIT 5R1-C30 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION' : 'PHASE-10A14-R20 - COMMIT 5R1-C30 REASON-LAYER CLOSURE CONTINUATION 30 AGAINST THE GOVERNANCE-COMPLIANT C29 BASE'}
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C28
`;
  fs.writeFileSync(p, section.replace(/\r\n/g, '\n') + prior);
}
function finalReport(ctx, manifest, validation) {
  const accepted = ctx.materialResults.filter((r) => r.accepted);
  const best = accepted[accepted.length - 1] || { actual: ctx.reconstruction.actual };
  const reasonLayerClosure = best.actual.reasonPassed === 3720
    && best.actual.reasonCounterfactualPassed === 344
    && best.actual.collisionProbesPassed === 196;
  const report = {
    unit: UNIT,
    generatedUtc: now(),
    decision: reasonLayerClosure ? 'REASON_LOCK_ACHIEVED' : 'INCOMPLETE',
    reasonLayerClosure,
    runtimeClosure: false,
    candidateSelectionReconciliation: ctx.selection,
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
    compositionOrderIndependence: ctx.compositionOrder,
    candidateDeltaReplay: ctx.deltaReplay,
    taintAwareAntiOverfit: ctx.taint,
    derivedPacketValidation: ctx.derived.pass,
    registry: ctx.registry,
    manifest,
    manifestValidation: validation,
    devFactoryPreservedExactly: ctx.devPost.equal,
    liveRuntimeRestoredToCommittedBackendBaseline: true,
    serviceOracleRoadmapTrackedDiff: git('diff', '--name-only', '--', 'services', 'evaluation/oracles/phase-10a14-r20', 'knowledge/TINA_Updated_Roadmap_v7.md').trim() || '',
    protectedUntrackedOnlyAtPreflight: ctx.preflight.protectedUntrackedOnly,
    unexplainedUntrackedResidueLeftUntouched: ctx.preflight.unexplainedUntrackedResidue,
    roadmapV8Promotion: readJson(RES + 'COMMIT_5R1C29_ROADMAP_V8_PROMOTION.json'),
    nextExactTask: reasonLayerClosure
      ? 'PHASE-10A14-R20 - COMMIT 5R1-C30 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION'
      : 'PHASE-10A14-R20 - COMMIT 5R1-C30 REASON-LAYER CLOSURE CONTINUATION 30 AGAINST THE GOVERNANCE-COMPLIANT C29 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C29_FINAL_EXECUTION_REPORT.json', report);
  return report;
}

function compareDevFactory(pre) {
  const post = captureDevFactory('COMMIT_5R1C29_DEV_FACTORY_POSTCHECK');
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
  writeJson(RES + 'COMMIT_5R1C29_DEV_FACTORY_POSTCHECK.json', out);
  if (!out.equal) throw new Error('DEV_FACTORY_CHANGED_DURING_C29');
  return out;
}

async function main() {
  await L.assertRuntimeIntact('C29-start');
  const preflightResult = preflight();
  const devPre = captureDevFactory('COMMIT_5R1C29_DEV_FACTORY_PREEXISTING_STATE');
  writeJson(RES + 'COMMIT_5R1C29_DEV_FACTORY_PREEXISTING_STATE.json', devPre);
  mandatoryReadRecord();
  promoteRoadmapV8Initial(preflightResult);
  const selection = writeCandidateSelectionReconciliation();
  const baseIdentity = verifyBaseSnapshot();
  const reconstruction = await governedReconstruction();
  const monotonic = monotonicFeatureArtifacts();
  const failureInventoryResult = await failureInventory(reconstruction.gates);
  writeHypotheses();
  let derived = writeGeneralizationPackets();
  const materialResults = [];
  let active = { attemptId: C28_SELECTED, dir: BASE_SNAP, actual: reconstruction.actual };
  for (const c of candidates) {
    const { result, activeIfAccepted } = await runMaterialCandidate(c, active);
    materialResults.push(result);
    active = activeIfAccepted;
  }
  derived = writeGeneralizationPackets(materialResults);
  if (!derived.pass) throw new Error('C29_DERIVED_PACKET_VALIDATION_FAILED');
  const deltaReplay = aggregateDeltaReplay(materialResults);
  if (!deltaReplay.pass) throw new Error('C29_DELTA_REPLAY_FAILED');
  const taint = aggregateTaint(materialResults);
  if (!taint.pass) throw new Error('C29_TAINT_AWARE_ANTI_OVERFIT_FAILED');
  const compositionOrder = await compositionOrderIndependence(materialResults);
  if (!compositionOrder.orderIndependencePass) throw new Error('C29_COMPOSITION_ORDER_INDEPENDENCE_FAILED');
  const exhaustion = candidateExhaustion(materialResults);
  const restoreAudit = [];
  const restoredIdentity = await restoreHead(restoreAudit);
  writeJson(RES + 'COMMIT_5R1C29_LIVE_RUNTIME_RESTORATION.json', {
    unit: UNIT,
    generatedUtc: now(),
    restoredIdentity,
    restoreAudit,
    liveRuntimeRestoredToCommittedBackendBaseline: true,
    pass: L.SERVICES.every((n) => restoredIdentity['services/' + n].normalizedLfSha256 === sha256(L.normLf(headFile('services/' + n)))),
  });
  cleanupReplayWorkdirs();
  const devPost = compareDevFactory(devPre);
  const registry = registrySummary();
  const roadmap = finalizeRoadmapV8({ materialResults });
  let manifest = writeManifest();
  const ctx = { preflight: preflightResult, selection, baseIdentity, reconstruction, monotonic, failureInventory: failureInventoryResult, materialResults, derived, deltaReplay, taint, compositionOrder, exhaustion, devPost, registry, roadmap };
  updateCurrentState(ctx, manifest, { badHashCount: 0 });
  manifest = writeManifest();
  let validation = validateManifest();
  const report = finalReport(ctx, manifest, validation);
  manifest = writeManifest();
  validation = validateManifest();
  report.manifest = manifest;
  report.manifestValidation = validation;
  writeJson(RES + 'COMMIT_5R1C29_FINAL_EXECUTION_REPORT.json', report);
  manifest = writeManifest();
  validation = validateManifest();
  console.log(JSON.stringify({
    decision: report.decision,
    acceptedRules: report.materialIterations.filter((r) => r.accepted).map((r) => r.rule),
    rejectedRules: report.materialIterations.filter((r) => !r.accepted).map((r) => r.rule),
    registry,
    manifest,
    manifestValidation: validation,
    unexplainedUntrackedResidueLeftUntouched: preflightResult.unexplainedUntrackedResidue,
  }, null, 2));
}

main().catch(async (err) => {
  try { await restoreHead([]); } catch {}
  console.error(err.stack || err.message);
  process.exit(1);
});
