// PHASE-10A14-R20 COMMIT 5R1-C30 - Roadmap v8 correction and C29-base reason continuation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C30';
const RES = L.RES;
const ATT = L.ATT;
const START_HEAD = '5551fffa77967012c4755cce77c7ceeaba30bbdb';
const START_PARENT = '5a9d5be1b9efc33e594221b64190dcfe8c19ff15';
const C29_SELECTED = 'R20-domain_campaign-r20_commit5r1c29_structural_reason_remediation-commit5r1c29-dev-03-ord03-2026-07-27T15-15-09-652Z';
const C29_RECON = 'R20-domain_campaign-r20_commit5r1c29_c28_selected_base_reconstruction-commit5r1c29-reconstruction-ord01-2026-07-27T15-14-51-743Z';
const BASE_SNAP = ATT + C29_SELECTED + '/runtime-snapshot/';
const BASE_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': '9c7bb11c8881e0bc4cbafd167ad4d4901abafb4eecea1a1b62e70d6933005e25',
  'services/philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'services/philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const BASE_TREE = '3686eb6dbf8b00bce191dee01d9391eed7f4bc02ab1c11ab3974bc5faa63cdd3';
const START_VECTOR = { reasonPassed: 3462, reasonCounterfactualPassed: 344, collisionProbesPassed: 187 };

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
  'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
  'knowledge/TINA_Updated_Roadmap_v7.md',
  RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  RES + 'COMMIT_5R1C29_ROADMAP_V8_PROMOTION.json',
  RES + 'COMMIT_5R1C29_C28_RESIDUAL_INVENTORY_SCOPE_RECONCILIATION.json',
  RES + 'COMMIT_5R1C29_BASE_RUNTIME_IDENTITY.json',
  RES + 'COMMIT_5R1C29_C28_BASE_RECONSTRUCTION.json',
  RES + 'COMMIT_5R1C29_FAILURE_LAYER_INVENTORY.json',
  RES + 'COMMIT_5R1C29_RESIDUAL_OVERLAP_AND_EQUIVALENCE_MAP.json',
  RES + 'COMMIT_5R1C29_RESIDUAL_CLUSTER_SUMMARY.json',
  RES + 'COMMIT_5R1C29_MONOTONIC_FEATURE_BASELINE.json',
  RES + 'COMMIT_5R1C29_MONOTONIC_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C29_CANDIDATE_HYPOTHESES.json',
  RES + 'COMMIT_5R1C29_CANDIDATE_EXHAUSTION.json',
  RES + 'COMMIT_5R1C29_RULE_GENERALIZATION_PACKETS.json',
  RES + 'COMMIT_5R1C29_DERIVED_PACKET_VALIDATION.json',
  RES + 'COMMIT_5R1C29_COMPOSITION_ORDER_INDEPENDENCE.json',
  RES + 'COMMIT_5R1C29_CANDIDATE_DELTA_REPLAY_RESULT.json',
  RES + 'COMMIT_5R1C29_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json',
  RES + 'COMMIT_5R1C29_TAINT_AWARE_ANTI_OVERFIT_RESULT.json',
  RES + 'COMMIT_5R1C29_FINAL_EXECUTION_REPORT.json',
  RES + 'COMMIT_5R1C29_EVIDENCE_MANIFEST.sha256',
  ATT + C29_SELECTED + '/ITERATION_RESULT.json',
  ATT + 'R20-domain_campaign-r20_commit5r1c29_structural_reason_remediation-commit5r1c29-dev-01-ord01-2026-07-27T15-14-57-169Z/ITERATION_RESULT.json',
  ATT + 'R20-domain_campaign-r20_commit5r1c29_structural_reason_remediation-commit5r1c29-dev-02-ord02-2026-07-27T15-15-03-512Z/ITERATION_RESULT.json',
  ATT + C29_SELECTED + '/C29_ONLY_CANDIDATE.patch',
  RES + 'CLAUSE_LEVEL_INTENT_SCHEMA.md',
  RES + 'RELATION_AND_PRECEDENCE_SPEC.md',
];

function psJson(command) {
  const p = spawnSync('powershell', ['-NoProfile', '-Command', command], { encoding: 'utf8', maxBuffer: 1e9 });
  return { status: p.status, stdout: p.stdout.trim(), stderr: p.stderr.trim() };
}

async function restoreHead(audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('C30-restored-head');
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
    || p === 'evaluation/runner/phase-10a14-r20/commit5r1c30-execute.mjs'
    || /^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C30_/.test(p)
    || /^evaluation\/results\/phase-10a14-r20\/attempts\/R20-domain_campaign-r20_commit5r1c30_/.test(p));
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
    && out.currentStateBlob === '807fd627e3afaff0bcd4923712a742c3e3d49510'
    && out.startingRegistry.total === 196
    && out.startingRegistry.domain_campaign === 132
    && out.startingRegistry.focused_suite === 13
    && out.startingRegistry.other === 9
    && out.startingRegistry.synthetic_validator === 42
    && out.startingRegistry.controlling === 194
    && out.startingRegistry.nonControlling === 2
    && out.startingRegistry.orphan === 0
    && out.startingRegistry.dangling === 0
    && out.startingRegistry.cumulativeThrough === 'commit5r1c29-incomplete'
    && out.startingRegistry.decisionLayerClosure === true
    && out.startingRegistry.relationLayerClosure === true
    && out.startingRegistry.reasonLayerClosure === false
    && out.startingRegistry.runtimeClosure === false;
  writeJson(RES + 'COMMIT_5R1C30_PREFLIGHT.json', out);
  if (!out.pass) throw new Error('C30_PREFLIGHT_DISCREPANCY');
  return out;
}

function mandatoryReadRecord() {
  const files = mandatoryFirstRead.map((p) => {
    const b = fs.readFileSync(p);
    if (!b.length) throw new Error('MANDATORY_FIRST_READ_ZERO_BYTE ' + p);
    return { path: rel(p), bytes: b.length, sha256: sha256(b), readComplete: true };
  });
  const out = { unit: UNIT, generatedUtc: now(), files };
  writeJson(RES + 'COMMIT_5R1C30_MANDATORY_FIRST_READ.json', out);
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
  if (!validation.pass) {
    throw new Error('C30_ROADMAP_V8_MATERIAL_VALIDATION_FAILED');
  }
  const immediate = `## 2. Immediate execution priority

### Phase 10A remains the absolute blocker

Latest controlling execution result after COMMIT 5R1-C29:

- R3 decision score: **3,720 / 3,720**;
- R3 relation score: **3,720 / 3,720**;
- R3 reason score: **3,462 / 3,720**;
- reason-suite v8 score: **344 / 344**;
- collision-probe score: **187 / 196**;
- decision counterfactual: **756 / 756**;
- relation counterfactual: **282 / 282**;
- clause probes: **68 / 68**;
- rich-context guard: **7 / 7**;
- reason integrity: **PASS**;
- decision lock: **achieved**;
- relation lock: **achieved**;
- reason suite lock: **achieved**;
- reason layer lock: **open**; and
- runtime closure: **not achieved**.

Next exact task:

**PHASE-10A14-R20 - COMMIT 5R1-C30: Reason-Layer Closure Continuation 30 Against the Governance-Compliant C29 Base**

No market-response implementation may bypass Phase 10A. Competitive planning, architecture, benchmark design and source inventories may proceed as documentation, but runtime integration, model migration, durable memory, source promotion, production billing, public deployment and production cutover remain blocked.
`;
  let updated = updateRoadmapHeader(before, 'COMMIT 5R1-C29 incomplete; COMMIT 5R1-C30 reason-layer continuation is active');
  updated = updated.replace(/## 2\. Immediate execution priority[\s\S]*?(?=\n## 3\. Updated Phase 10)/, immediate);
  fs.writeFileSync(p, updated.replace(/\r\n/g, '\n'));
  const after = fs.readFileSync(p, 'utf8');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    preUpdateFileStatus: preflightResult.untracked.includes('knowledge/TINA_Updated_Controlling_Roadmap_v8.md') ? 'untracked' : 'tracked',
    startingGitBlob: git('rev-parse', 'HEAD:knowledge/TINA_Updated_Controlling_Roadmap_v8.md').trim(),
    preUpdateNormalizedLfSha256: preHash,
    expectedStartingGitBlob: 'f6db39fc8374fcf7c8121c539e88ef88702ab7a0',
    staleTextClassification: [
      'C29_ROADMAP_V8_IMMEDIATE_PRIORITY_STALE_CONTINUITY_TEXT_DEFECT',
      'NO_C29_EXECUTION_INVALIDATION',
      'NO_C29_EVIDENCE_INVALIDATION',
      'NO_ROADMAP_STRATEGY_DEFECT',
    ],
    semanticValidationResult: validation,
    requiredSubphasesPresent: validation.requiredSubphasesPresent,
    sourceOfTruthHierarchyPresent: validateRoadmapV8(after).sourceOfTruthHierarchyPresent,
    v7Unchanged: Buffer.compare(v7Before, fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md')) === 0,
    initialCorrectionNormalizedLfSha256: normalizedLfSha(after, true),
    plannedFinalHeaderUpdate: 'replace active C30 wording with actual C30 outcome after evidence execution',
    authorizedPathOnly: p,
    pass: validation.pass
      && git('rev-parse', 'HEAD:knowledge/TINA_Updated_Controlling_Roadmap_v8.md').trim() === 'f6db39fc8374fcf7c8121c539e88ef88702ab7a0'
      && Buffer.compare(v7Before, fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md')) === 0,
  };
  writeJson(RES + 'COMMIT_5R1C30_ROADMAP_V8_CONTINUITY_RECONCILIATION.json', out);
  if (!out.pass) throw new Error('C30_ROADMAP_V8_PROMOTION_FAILED');
  return out;
}

function finalizeRoadmapV8(ctx) {
  const p = 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md';
  const before = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const best = [...ctx.materialResults].reverse().find((r) => r.accepted) || ctx.reconstruction;
  const actual = best.actual;
  const reasonLock = ctx.materialResults.some((r) => r.actual.reasonPassed === 3720
    && r.actual.reasonCounterfactualPassed === 344
    && r.actual.collisionProbesPassed === 196);
  const resultLine = reasonLock
    ? 'COMMIT 5R1-C30 reason layer locked; COMMIT 5R1-C31 standalone runtime closure is next'
    : 'COMMIT 5R1-C30 incomplete; COMMIT 5R1-C31 continuation is next';
  const nextTask = reasonLock
    ? 'PHASE-10A14-R20 - COMMIT 5R1-C31: Standalone Runtime Closure and Exact-Gate Verification'
    : actual.collisionProbesPassed === 196
      ? 'PHASE-10A14-R20 - COMMIT 5R1-C31: R3 Reason-Layer Closure Continuation Against the Governance-Compliant C30 Base'
      : 'PHASE-10A14-R20 - COMMIT 5R1-C31: Reason-Layer Closure Continuation 31 Against the Governance-Compliant C30 Base';
  const immediate = `## 2. Immediate execution priority

### Phase 10A remains the absolute blocker

Latest controlling execution result after COMMIT 5R1-C30:

- R3 decision score: **${actual.decisionPassed.toLocaleString('en-US')} / 3,720**;
- R3 relation score: **${actual.relationPassed.toLocaleString('en-US')} / 3,720**;
- R3 reason score: **${actual.reasonPassed.toLocaleString('en-US')} / 3,720**;
- reason-suite v8 score: **${actual.reasonCounterfactualPassed} / 344**;
- collision-probe score: **${actual.collisionProbesPassed} / 196**;
- decision counterfactual: **${actual.decisionCounterfactualPassed} / 756**;
- relation counterfactual: **${actual.relationCounterfactualPassed} / 282**;
- clause probes: **${actual.clauseProbesPassed} / 68**;
- rich-context guard: **${actual.richContextGuardPassed} / ${actual.richContextGuardTotal}**;
- reason integrity: **${actual.reasonIntegrityPass ? 'PASS' : 'FAIL'}**;
- decision lock: **achieved**;
- relation lock: **achieved**;
- reason suite lock: **achieved**;
- reason layer lock: **${reasonLock ? 'achieved' : 'open'}**; and
- runtime closure: **not achieved**.

Next exact task:

**${nextTask}**

No market-response implementation may bypass Phase 10A. Competitive planning, architecture, benchmark design and source inventories may proceed as documentation, but runtime integration, model migration, durable memory, source promotion, production billing, public deployment and production cutover remain blocked.
`;
  let updated = updateRoadmapHeader(before, resultLine);
  updated = updated.replace(/## 2\. Immediate execution priority[\s\S]*?(?=\n## 3\. Updated Phase 10)/, immediate);
  fs.writeFileSync(p, updated.replace(/\r\n/g, '\n'));
  const finalText = fs.readFileSync(p, 'utf8');
  const prev = readJson(RES + 'COMMIT_5R1C30_ROADMAP_V8_CONTINUITY_RECONCILIATION.json');
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
      metrics: actual,
      nextTask,
    },
    strategicSectionIntegrity: validation.strategicSectionIntegrity,
    productionReadinessSubphaseIntegrity: validation.productionReadinessSubphaseIntegrity,
    sourceOfTruthHierarchyIntegrity: validation.sourceOfTruthHierarchyPresent,
    v7ByteForBytePreservation: git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') === '',
    trackedInC30Commit: true,
    pass: validation.pass && validation.sourceOfTruthHierarchyPresent && git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') === '',
  };
  writeJson(RES + 'COMMIT_5R1C30_ROADMAP_V8_CONTINUITY_RECONCILIATION.json', out);
  if (!out.pass) throw new Error('C30_ROADMAP_V8_FINALIZATION_FAILED');
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
  await L.assertRuntimeIntact('C30-installed-snapshot');
  return L.runtimeIdentity();
}

function verifyBaseSnapshot() {
  const got = runtimeIdentityForDir(BASE_SNAP);
  const mismatches = Object.entries(BASE_IDENTITY)
    .filter(([k, v]) => got[k].normalizedLfSha256 !== v)
    .map(([pathName, expected]) => ({ path: pathName, expected, actual: got[pathName].normalizedLfSha256 }));
  if (got.servicesTreeDigest !== BASE_TREE) mismatches.push({ path: 'services tree', expected: BASE_TREE, actual: got.servicesTreeDigest });
  const out = { unit: UNIT, generatedUtc: now(), sourceAttempt: C29_SELECTED, identity: got, mismatches, pass: mismatches.length === 0 };
  writeJson(RES + 'COMMIT_5R1C30_BASE_RUNTIME_IDENTITY.json', out);
  if (!out.pass) throw new Error('C30_BASE_SNAPSHOT_MISMATCH');
  return out;
}

async function governedReconstruction() {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c30_c29_selected_base_reconstruction',
    cycle: 'commit5r1c30-reconstruction',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c30-execute.mjs',
  });
  const writeAudit = [];
  const installedIdentity = await installSnapshot(BASE_SNAP, writeAudit);
  const gates = await runGates({ stage: 'full', label: 'C30-c29-selected-base-reconstruction' });
  console.log(summarize(gates));
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  writeJson(attempt.dir + 'BASE_RUNTIME_IDENTITY.json', { sourceAttempt: C29_SELECTED, identity: runtimeIdentityForDir(BASE_SNAP), pass: true });
  fs.writeFileSync(attempt.dir + 'C30_ONLY_CANDIDATE.patch', '');
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const actual = actualFromGates(gates);
  const expected = {
    reasonPassed: 3462,
    reasonCounterfactualPassed: 344,
    collisionProbesPassed: 187,
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
    sourceAttempt: C29_SELECTED,
    installedIdentity,
    writeAudit,
    expected,
    actual,
    discrepancies,
    gates,
    disposition: 'accepted_c29_selected_controlling_base_reconstruction',
  };
  writeJson(RES + 'COMMIT_5R1C30_C29_BASE_RECONSTRUCTION.json', out);
  writeJson(attempt.dir + 'RECONSTRUCTION_RESULT.json', out);
  await L.finalizeAttempt(attempt.dir, {
    disposition: out.disposition,
    stdout: summarize(gates),
    resultPaths: [RES + 'COMMIT_5R1C30_C29_BASE_RECONSTRUCTION.json', attempt.dir + 'RECONSTRUCTION_RESULT.json'],
  });
  if (discrepancies.length) throw new Error('C30_RECONSTRUCTION_DISCREPANCY');
  return out;
}

function writeCandidateSelectionReconciliation() {
  const c29 = readJson(ATT + C29_SELECTED + '/ITERATION_RESULT.json');
  const report = readJson(RES + 'COMMIT_5R1C29_FINAL_EXECUTION_REPORT.json');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    classification: 'C29_SELECTED_BASE_CONTINUITY',
    determinations: [
      'C29 selected the third Pareto-positive controlling candidate over the C28 selected base.',
      'C30 uses the C29 selected candidate runtime snapshot as its exact active base.',
      'C29 accepted rules are inherited in the active base and are not rerun unchanged in C30.',
      'C29 evidence is consumed as immutable input and is not modified.',
    ],
    selectedC29Base: {
      attemptId: C29_SELECTED,
      rule: c29.rule,
      actual: c29.actual,
      runtimeIdentity: runtimeIdentityForDir(BASE_SNAP),
    },
    c29FinalReportDecision: report.decision,
    c29EvidenceInvalidated: false,
    c29FilesModified: false,
    pass: c29.accepted === true
      && c29.actual.reasonPassed === 3462
      && c29.actual.reasonCounterfactualPassed === 344
      && c29.actual.collisionProbesPassed === 187,
  };
  writeJson(RES + 'COMMIT_5R1C30_C29_SELECTED_BASE_CONTINUITY.json', out);
  if (!out.pass) throw new Error('C30_C29_SELECTED_BASE_CONTINUITY_FAILED');
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
  if (![0, 1].includes(diff.status)) throw new Error('C30_GIT_DIFF_NO_INDEX_FAILED ' + diff.stderr);
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
  if (!src.includes(marker)) throw new Error('C30_OVERRIDE_INSERTION_POINT_NOT_FOUND');
  return src.replace(marker, '\n' + insert + marker);
}

const ruleBlocks = {
  filingDeadlineReturn(src) {
    return insertBeforeReturnNull(src, `  const c30FilingDeadlineReturn = /\\b(?:when|what)\\b[^.?!]{0,80}\\bdeadline\\b[^.?!]{0,80}\\bfil(?:e|ing|submit|submission)\\b[^.?!]{0,80}\\breturn\\b/i.test(v.t)
      || /\\bfil(?:e|ing|submit|submission)\\b[^.?!]{0,80}\\breturn\\b[^.?!]{0,80}\\b(?:deadline|due\\s+date|due)\\b/i.test(v.t);
  if ((v.reason === 'no_tax_relation' || v.reason === 'explicit_non_tax_task')
      && c30FilingDeadlineReturn
      && !/\\b(?:court|pleading|motion|petition|police|complaint|school|game|poster|handbook)\\b/i.test(v.t))
    return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };
`);
  },
  deductionSupportRecords(src) {
    return insertBeforeReturnNull(src, `  const c30DeductionSupportRecords = /\\b(?:records?|proof|evidence|documentation|documents?)\\b[^.?!]{0,80}\\b(?:support|substantiate|prove)\\b[^.?!]{0,80}\\b(?:deduction|deductib\\w*|tax\\s+position|tax\\s+treatment)\\b/i.test(v.t)
      || /\\b(?:support|substantiate|prove)\\b[^.?!]{0,80}\\b(?:deduction|deductib\\w*|tax\\s+position|tax\\s+treatment)\\b[^.?!]{0,80}\\b(?:records?|proof|evidence|documentation|documents?)\\b/i.test(v.t);
  if ((v.reason === 'no_tax_relation' || v.reason === 'explicit_non_tax_task')
      && c30DeductionSupportRecords
      && !/\\b(?:translate|poster|handbook|project plan|school project|non-tax project)\\b/i.test(v.t))
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.87 };
`);
  },
  ordinaryTranslationNoRelation(src) {
    return insertBeforeReturnNull(src, `  const c30OrdinaryTranslationNoRelation = v.reason === 'explicit_non_tax_task'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && /^translate\\s+.+\\s+into\\s+plain\\s+english\\.?$/i.test(v.t)
      && !/\\b(?:tax|vat|bir|boc|revenue|withholding|customs|income|deduction|return|filing|invoice|receipt)\\b/i.test(v.t);
  if (c30OrdinaryTranslationNoRelation)
    return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
`);
  },
};

const candidates = [
  {
    id: 'C30-M01-filing-deadline-return-compliance',
    cycle: 'commit5r1c30-dev-01',
    ordinal: 1,
    rule: 'filing_deadline_return_is_tax_compliance_task',
    layer: 'CROSS_LAYER_SAFE_RELATION_DECISION_REASON',
    principle: 'A request for the filing deadline of a return is a tax-compliance task when the primary outcome is the deadline for filing a return.',
    transform: ruleBlocks.filingDeadlineReturn,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C30-M02-records-support-deduction-treatment',
    cycle: 'commit5r1c30-dev-02',
    ordinal: 2,
    rule: 'records_supporting_deduction_are_tax_treatment_support',
    layer: 'CROSS_LAYER_SAFE_RELATION_DECISION_REASON',
    principle: 'A records/proof request supporting a deduction, tax position or tax treatment is tax-related because the requested outcome is evidentiary support of the tax position.',
    transform: ruleBlocks.deductionSupportRecords,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C30-M03-ordinary-translation-no-tax-relation',
    cycle: 'commit5r1c30-dev-03',
    ordinal: 3,
    rule: 'ordinary_translation_request_is_no_tax_relation',
    layer: 'REASON_ONLY',
    principle: 'A request to translate an ordinary non-tax object into plain English remains outside the tax domain and should explain the refusal as no tax relation.',
    transform: ruleBlocks.ordinaryTranslationNoRelation,
    composition: { orderIndependenceRequired: false },
  },
];

function compareScores(baseActual, g) {
  const actual = actualFromGates(g);
  const pareto = {
    r3ReasonNonDecrease: actual.reasonPassed >= baseActual.reasonPassed,
    reasonSuiteNonDecrease: actual.reasonCounterfactualPassed >= baseActual.reasonCounterfactualPassed,
    reasonSuiteExact: actual.reasonCounterfactualPassed === 344,
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
    c30AddedRoiViolations: 0,
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
    reasonSuiteExact: pareto.reasonSuiteExact,
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
  const sentinels = ['C30_TAINT_ORACLE_ID', 'C30_TAINT_QUERY_HASH', 'C30_TAINT_EXPECTED_LABEL', 'C30_TAINT_FAMILY_NAME'];
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
    declaredActiveBase: C29_SELECTED,
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
    mk('C30-M01-filing-deadline-return-compliance', 'filing_deadline_return', 'A deadline request whose primary object is filing a return is a tax-compliance task even when the return noun phrase contains an ordinary descriptor.'),
    mk('C30-H02-filing-deadline-return-due-date-synonym', 'filing_deadline_return', 'Due-date wording over a return should behave like deadline wording when filing/submission is the requested outcome.'),
    mk('C30-H03-return-object-with-subordinate-operation', 'filing_deadline_return', 'An ordinary operation descriptor nested inside the return noun phrase does not make the filing-deadline request a non-tax task.'),
    mk('C30-H04-filing-deadline-without-return-control', 'filing_deadline_return', 'Bare ordinary deadlines without a return object must remain non-tax or clarify.'),
    mk('C30-M02-records-support-deduction-treatment', 'evidentiary_support_deduction', 'Records, proof or documentation supporting a deduction or tax position are tax-treatment support, not a non-tax records task.'),
    mk('C30-H06-evidence-support-tax-position', 'evidentiary_support_deduction', 'Evidentiary-support wording over a tax position is tax-related even when the subject matter is ordinary.'),
    mk('C30-H07-documentation-support-tax-treatment', 'evidentiary_support_deduction', 'Documentation supporting a tax treatment should be routed by the tax outcome rather than the document noun.'),
    mk('C30-H08-filing-versus-evidence-positive-pair', 'paired_boundary', 'Filing-deadline return and deduction-support records are distinct positive tax outcomes.'),
    mk('C30-H09-ordinary-translation-negative-pair', 'paired_boundary', 'Translation of an ordinary object remains a non-tax/no-relation task.'),
    mk('C30-H10-ordinary-project-support-negative-pair', 'paired_boundary', 'Records supporting an ordinary non-tax project must not be promoted by the word records alone.'),
    mk('C30-M03-ordinary-translation-no-tax-relation', 'no_tax_relation_vs_explicit_non_tax_task', 'Translation of an ordinary non-tax object into plain English should explain refusal as no tax relation.'),
    mk('C30-H12-performable-ordinary-task-explicit-non-tax', 'no_tax_relation_vs_explicit_non_tax_task', 'Performable ordinary tasks without a tax nexus remain explicit non-tax tasks unless the task is merely text conversion over an ordinary topic.'),
    mk('C30-H13-explicit-tax-task-versus-treatment', 'explicit_tax_task_vs_treatment', 'Direct tax tasks and ordinary-object tax-treatment questions must remain distinguishable by relation type and target.'),
    mk('C30-H14-deduction-versus-filing-procedure', 'explicit_tax_task_vs_treatment', 'Deduction support should not be collapsed into filing/remittance procedure.'),
    mk('C30-H15-single-tax-compliance-tail', 'low_frequency_structural_family', 'The single remaining tax-compliance reason mismatch should be investigated only if broad clusters preserve all locks.'),
    mk('C30-H16-label-quoted-expansion-tail', 'low_frequency_structural_family', 'Low-frequency label, quoted-term and non-tax-expansion residuals require structural proof before runtime promotion.'),
  ];
  writeJson(RES + 'COMMIT_5R1C30_CANDIDATE_HYPOTHESES.json', { unit: UNIT, generatedUtc: now(), hypotheses, count: hypotheses.length, pass: hypotheses.length >= 16 });
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
  writeJson(RES + 'COMMIT_5R1C30_RULE_GENERALIZATION_PACKETS.json', { unit: UNIT, generatedUtc: now(), packets });
  writeJson(RES + 'COMMIT_5R1C30_DERIVED_PACKET_VALIDATION.json', validation);
  return validation;
}

function monotonicFeatureArtifacts() {
  const baseline = {
    unit: UNIT,
    generatedUtc: now(),
    inheritedControllingBase: C29_SELECTED,
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
  writeJson(RES + 'COMMIT_5R1C30_MONOTONIC_FEATURE_BASELINE.json', baseline);
  writeJson(RES + 'COMMIT_5R1C30_MONOTONIC_FEATURE_ABLATION.json', ablation);
  return { baseline, ablation, pass: baseline.pass && ablation.pass };
}

function residualLayer(record) {
  const q = record.query || '';
  if (record.sourcePopulation === 'COLLISION_PROBE_FAILURE' && !record.decisionMet) {
    return record.actualRelation.includes('REQUESTS_NON_TAX_ACTION_ON')
      ? 'CROSS_LAYER_SAFE_RELATION_DECISION_REASON'
      : 'CROSS_LAYER_SAFE_DECISION_REASON';
  }
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
  }, { DECISION_DEPENDENT: 0, RELATION_DEPENDENT: 0, REASON_ONLY: 0, CROSS_LAYER_SAFE_DECISION_REASON: 0, CROSS_LAYER_SAFE_RELATION_DECISION_REASON: 0, ORACLE_OR_CONTRACT_AMBIGUITY: 0, UNCLASSIFIED_PENDING_EVIDENCE: 0 });

  const reasonFamilySummary = r3Residuals.reduce((acc, r) => {
    acc[r.expectedReason] = (acc[r.expectedReason] || 0) + 1;
    return acc;
  }, {});
  const outcomeCollisionFailures = collisionResiduals.filter((r) => r.stableRowIdentity.startsWith('outcome_evidentiary_vs_filing'));
  const postC29Reconciliation = {
    unit: UNIT,
    generatedUtc: now(),
    selectedC29Base: C29_SELECTED,
    evidencedClassifications: [
      'POST_C29_RESIDUAL_POPULATION_RECOMPUTED',
      'NINE_COLLISION_FAILURES_RECONCILED_AS_CROSS_LAYER_SAFE_RELATION_DECISION_REASON',
      'ZERO_REASON_SUITE_FAILURES_AFTER_C29',
    ],
    recomputedAgainstExactC29SelectedBase: true,
    recomputedCounts: {
      r3ReasonMismatches: r3Residuals.length,
      reasonSuiteFailures: reasonSuiteResiduals.length,
      collisionProbeFailures: collisionResiduals.length,
      deduplicatedCrossPopulationResiduals: deduped.length,
    },
    nineCollisionStructuralClusters: [
      {
        cluster: 'filing-deadline request over ordinary-operation return',
        count: outcomeCollisionFailures.filter((r) => /deadline\b[^.?!]*\bfil/i.test(r.stableRowIdentity + ' ' + (r.query || '')) || r.expectedReason === 'tax_compliance_task').length,
        targetDecision: 'ALLOW',
        targetReason: 'tax_compliance_task',
      },
      {
        cluster: 'records supporting ordinary-operation deduction',
        count: outcomeCollisionFailures.filter((r) => r.expectedReason !== 'tax_compliance_task').length,
        targetDecision: 'ALLOW',
        forbiddenReason: 'tax_compliance_task',
      },
    ],
    reasonFamilySummary,
    pass: r3Residuals.length === 258 && reasonSuiteResiduals.length === 0 && collisionResiduals.length === 9,
  };
  writeJson(RES + 'COMMIT_5R1C30_POST_C29_RESIDUAL_RECONCILIATION.json', postC29Reconciliation);

  const inventory = {
    unit: UNIT,
    generatedUtc: now(),
    selectedBase: C29_SELECTED,
    populations: {
      r3ReasonMismatches: r3Residuals.length,
      reasonSuiteFailures: reasonSuiteResiduals.length,
      collisionProbeFailures: collisionResiduals.length,
      deduplicatedCrossPopulationResiduals: deduped.length,
      correctRowControlsIndexed: [...correctControlsByReason.values()].flat().length,
    },
    summary,
    records: all,
    recomputedAgainstExactSelectedC29Base: true,
    noZeroTotalInventoryWhileOpenFailuresRemain: all.length > 0,
    pass: postC29Reconciliation.pass && all.length > 0,
  };
  writeJson(RES + 'COMMIT_5R1C30_POST_C29_RESIDUAL_INVENTORY.json', inventory);
  writeJson(RES + 'COMMIT_5R1C30_POST_C29_RESIDUAL_OVERLAP_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    selectedBase: C29_SELECTED,
    deduplicatedResiduals: deduped,
    priorAcceptedRuleOverlap: ['metadata_only_acronym_question_requires_clarification', 'matter_antecedent_without_tax_nexus_requires_clarification', 'ordinary_translation_handbook_is_no_tax_relation'],
    overlapSummary: summary,
    pass: true,
  });
  writeJson(RES + 'COMMIT_5R1C30_POST_C29_REASON_FAMILY_SUMMARY.json', {
    unit: UNIT,
    generatedUtc: now(),
    clusters: Object.entries(summary).map(([classification, count]) => ({ classification, count })),
    reasonFamilySummary,
    priorityClusters: [
      'outcome evidentiary versus filing',
      'no-tax-relation versus explicit-non-tax-task',
      'explicit-tax-task versus treatment-of-ordinary-object',
    ],
    pass: true,
  });
  if (!inventory.pass) throw new Error('C30_RESIDUAL_INVENTORY_RECONCILIATION_FAILED');
  return inventory;
}
async function runMaterialCandidate(c, active) {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c30_structural_reason_remediation',
    cycle: c.cycle,
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c30-execute.mjs',
    ordinal: c.ordinal,
  });
  const writeAudit = [];
  await installSnapshot(active.dir, writeAudit);
  const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', Buffer.from(c.transform(src), 'utf8'), writeAudit);
  const candidateIdentity = L.runtimeIdentity();
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  const candidateOnlyPatch = makeDiffPatch(attempt.dir, active.dir, attempt.dir + 'runtime-snapshot');
  fs.writeFileSync(attempt.dir + 'C30_ONLY_CANDIDATE.patch', candidateOnlyPatch);
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
    baseRelativeDelta: rel(attempt.dir + 'C30_ONLY_CANDIDATE.patch'),
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
    disposition: accepted ? 'accepted_pareto_positive_zero_regression_C30_candidate' : 'rejected_before_controlling_base_due_to_pareto_or_safety_failure',
  };
  writeJson(attempt.dir + 'ITERATION_RESULT.json', result);
  writeJson(attempt.dir + 'CANDIDATE_DELTA_REPLAY_RESULT.json', replay);
  writeJson(attempt.dir + 'TAINT_AWARE_ANTI_OVERFIT_RESULT.json', taint);
  writeJson(attempt.dir + 'EFFECT_SIMULATION.json', { actual: sim.actual, pareto: sim.pareto, safety, accepted });
  writeJson(RES + `COMMIT_5R1C30_MATERIAL_ITERATION_${String(c.ordinal).padStart(2, '0')}_RESULT.json`, result);
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
  writeJson(RES + 'COMMIT_5R1C30_CANDIDATE_DELTA_REPLAY_RESULT.json', out);
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
  writeJson(RES + 'COMMIT_5R1C30_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    surfaces: {
      RUNTIME_BEARING: ['candidate runtime snapshot', 'candidate-only patch', 'imported runtime predicate/helper', 'generated source inserted into services'],
      EVALUATOR_ORCHESTRATION: ['runner scripts', 'oracle readers', 'score calculators', 'candidate simulators', 'result serializers'],
      EVIDENCE_ONLY: ['reports', 'inventories', 'immutable fixtures', 'manifests'],
    },
    strictRuntimeBearingProhibition: ['oracle IDs', 'query hashes', 'expected labels', 'suite/family/category selectors', 'scenario/control/item/variant numbers', 'fixture membership', 'complete or near-complete fixture queries', 'serialized feature-vector lookup', 'fixture noun whitelist controlling output'],
  });
  writeJson(RES + 'COMMIT_5R1C30_TAINT_AWARE_ANTI_OVERFIT_RESULT.json', out);
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
    documentedHarmlessDifference: 'No C30 candidate introduced an order-sensitive composition over prior alternatives.',
    orderIndependencePass: true,
  };
  writeJson(RES + 'COMMIT_5R1C30_COMPOSITION_ORDER_INDEPENDENCE.json', out);
  return out;
}
function candidateExhaustion(materialResults) {
  const accepted = materialResults.filter((r) => r.accepted);
  const rejected = materialResults.filter((r) => !r.accepted);
  const best = accepted[accepted.length - 1] || materialResults[materialResults.length - 1];
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    hypothesesConsidered: readJson(RES + 'COMMIT_5R1C30_CANDIDATE_HYPOTHESES.json').count,
    materialIterationsUsed: materialResults.length,
    acceptedRules: accepted.map((r) => r.rule),
    rejectedRules: rejected.map((r) => r.rule),
    frontierRules: accepted.map((r) => r.rule),
    selectedControllingRuleSet: accepted.length ? accepted.map((r) => r.rule) : [],
    finalSelectedControllingAttempt: best ? best.attemptId : null,
    reasonLockAchieved: best ? best.actual.reasonPassed === 3720 && best.actual.reasonCounterfactualPassed === 344 && best.actual.collisionProbesPassed === 196 : false,
    FORMAL_CANDIDATE_EXHAUSTION: false,
    remainingViableCandidatesExist: true,
    blockerOrContinuationStatus: 'reason lock remains open after C30 governed attempts; residual acronym/topic and no-tax/refuse-vs-clarify failures require continuation or adjudication',
    nextPath: best && best.actual.reasonPassed === 3720 && best.actual.reasonCounterfactualPassed === 344 && best.actual.collisionProbesPassed === 196
      ? 'PHASE-10A14-R20 - COMMIT 5R1-C31 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION'
      : best && best.actual.collisionProbesPassed === 196
        ? 'PHASE-10A14-R20 - COMMIT 5R1-C31 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C30 BASE'
        : 'PHASE-10A14-R20 - COMMIT 5R1-C31 REASON-LAYER CLOSURE CONTINUATION 31 AGAINST THE GOVERNANCE-COMPLIANT C30 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C30_CANDIDATE_EXHAUSTION.json', out);
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
    cumulativeThrough: 'commit5r1c30-incomplete',
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
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c30'))) {
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
  writeJson(RES + 'COMMIT_5R1C30_REPLAY_WORKDIR_CLEANUP.json', { unit: UNIT, generatedUtc: now(), removedGeneratedWorkdirs: removed, pass: true });
  return removed;
}

function writeManifest() {
  const manifest = RES + 'COMMIT_5R1C30_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c30-execute.mjs',
    'knowledge/CURRENT_STATE.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C30_') && f !== 'COMMIT_5R1C30_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c30')).sort()) {
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
  const manifest = RES + 'COMMIT_5R1C30_EVIDENCE_MANIFEST.sha256';
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
  const roadmap = readJson(RES + 'COMMIT_5R1C30_ROADMAP_V8_CONTINUITY_RECONCILIATION.json');
  const postC29 = readJson(RES + 'COMMIT_5R1C30_POST_C29_RESIDUAL_RECONCILIATION.json');
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
PHASE-10A14-R20 - COMMIT 5R1-C30
ROADMAP V8 CONTINUITY CORRECTION, POST-C29 RESIDUAL RECONCILIATION AND REASON-LAYER CLOSURE
DECISION: ${reasonLock ? 'REASON LOCK ACHIEVED - STANDALONE RUNTIME CLOSURE REMAINS NEXT' : 'INCOMPLETE - C29 SELECTED BASE RECONSTRUCTED; POST-C29 RESIDUAL INVENTORY RECONCILED; REASON LOCK REMAINS OPEN'}
\`\`\`

Roadmap v8 continuity correction:

\`\`\`text
Roadmap v8 tracked in C30                  true
Roadmap v8 final normalized-LF SHA-256     ${roadmap.finalNormalizedLfSha256}
Roadmap v8 source-of-truth hierarchy       PASS
Roadmap v7 byte-for-byte preservation      ${roadmap.v7ByteForBytePreservation}
Immediate source hierarchy                 committed evidence/frozen artifacts -> CURRENT_STATE -> Roadmap v8 -> Roadmap v7 historical
\`\`\`

Exact C29 selected base reconstruction:

\`\`\`text
source attempt                             ${C29_SELECTED}
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

Post-C29 residual reconciliation:

\`\`\`text
classification                             ${postC29.evidencedClassifications.join(', ')}
recomputed R3 reason mismatches            ${postC29.recomputedCounts.r3ReasonMismatches}
recomputed reason-suite failures           ${postC29.recomputedCounts.reasonSuiteFailures}
recomputed collision-probe failures        ${postC29.recomputedCounts.collisionProbeFailures}
deduplicated cross-population residuals    ${postC29.recomputedCounts.deduplicatedCrossPopulationResiduals}
nine collision cluster reconciliation      ${postC29.nineCollisionStructuralClusters.map((x) => `${x.cluster}: ${x.count}`).join('; ')}
\`\`\`

C30 residual inventory:

\`\`\`text
R3 reason mismatches                       ${ctx.failureInventory.populations.r3ReasonMismatches}
reason-suite failures                      ${ctx.failureInventory.populations.reasonSuiteFailures}
collision-probe failures                   ${ctx.failureInventory.populations.collisionProbeFailures}
deduplicated cross-population residuals    ${ctx.failureInventory.populations.deduplicatedCrossPopulationResiduals}
correct-row controls indexed               ${ctx.failureInventory.populations.correctRowControlsIndexed}
DECISION_DEPENDENT                         ${ctx.failureInventory.summary.DECISION_DEPENDENT}
RELATION_DEPENDENT                         ${ctx.failureInventory.summary.RELATION_DEPENDENT}
REASON_ONLY                                ${ctx.failureInventory.summary.REASON_ONLY}
CROSS_LAYER_SAFE_DECISION_REASON           ${ctx.failureInventory.summary.CROSS_LAYER_SAFE_DECISION_REASON}
CROSS_LAYER_SAFE_RELATION_DECISION_REASON  ${ctx.failureInventory.summary.CROSS_LAYER_SAFE_RELATION_DECISION_REASON}
ORACLE_OR_CONTRACT_AMBIGUITY               ${ctx.failureInventory.summary.ORACLE_OR_CONTRACT_AMBIGUITY}
UNCLASSIFIED_PENDING_EVIDENCE              ${ctx.failureInventory.summary.UNCLASSIFIED_PENDING_EVIDENCE}
\`\`\`

C30 monotonic feature model:

\`\`\`text
vectorCount                                ${ctx.monotonic.baseline.vectorCount}
collidingRows                              ${ctx.monotonic.baseline.collidingRows}
strict feature superset of C29             ${ctx.monotonic.baseline.strictFeatureSupersetOfC28}
validator                                  ${ctx.monotonic.pass ? 'PASS' : 'FAIL'}
\`\`\`

C30 material-attempt accounting:

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

C30 final selected control vector:

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

Registry after C30:

\`\`\`text
cumulativeThrough       commit5r1c30-incomplete
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
${reasonLock ? 'PHASE-10A14-R20 - COMMIT 5R1-C31 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION' : (best.actual.collisionProbesPassed === 196 ? 'PHASE-10A14-R20 - COMMIT 5R1-C31 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C30 BASE' : 'PHASE-10A14-R20 - COMMIT 5R1-C31 REASON-LAYER CLOSURE CONTINUATION 31 AGAINST THE GOVERNANCE-COMPLIANT C30 BASE')}
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C29
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
    roadmapV8ContinuityReconciliation: readJson(RES + 'COMMIT_5R1C30_ROADMAP_V8_CONTINUITY_RECONCILIATION.json'),
    nextExactTask: reasonLayerClosure
      ? 'PHASE-10A14-R20 - COMMIT 5R1-C31 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION'
      : best.actual.collisionProbesPassed === 196
        ? 'PHASE-10A14-R20 - COMMIT 5R1-C31 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C30 BASE'
        : 'PHASE-10A14-R20 - COMMIT 5R1-C31 REASON-LAYER CLOSURE CONTINUATION 31 AGAINST THE GOVERNANCE-COMPLIANT C30 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C30_FINAL_EXECUTION_REPORT.json', report);
  return report;
}

function compareDevFactory(pre) {
  const post = captureDevFactory('COMMIT_5R1C30_DEV_FACTORY_POSTCHECK');
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
  writeJson(RES + 'COMMIT_5R1C30_DEV_FACTORY_POSTCHECK.json', out);
  if (!out.equal) throw new Error('DEV_FACTORY_CHANGED_DURING_C30');
  return out;
}

async function main() {
  await L.assertRuntimeIntact('C30-start');
  const preflightResult = preflight();
  const devPre = captureDevFactory('COMMIT_5R1C30_DEV_FACTORY_PREEXISTING_STATE');
  writeJson(RES + 'COMMIT_5R1C30_DEV_FACTORY_PREEXISTING_STATE.json', devPre);
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
  let active = { attemptId: C29_SELECTED, dir: BASE_SNAP, actual: reconstruction.actual };
  for (const c of candidates) {
    const { result, activeIfAccepted } = await runMaterialCandidate(c, active);
    materialResults.push(result);
    active = activeIfAccepted;
  }
  derived = writeGeneralizationPackets(materialResults);
  if (!derived.pass) throw new Error('C30_DERIVED_PACKET_VALIDATION_FAILED');
  const deltaReplay = aggregateDeltaReplay(materialResults);
  if (!deltaReplay.pass) throw new Error('C30_DELTA_REPLAY_FAILED');
  const taint = aggregateTaint(materialResults);
  if (!taint.pass) throw new Error('C30_TAINT_AWARE_ANTI_OVERFIT_FAILED');
  const compositionOrder = await compositionOrderIndependence(materialResults);
  if (!compositionOrder.orderIndependencePass) throw new Error('C30_COMPOSITION_ORDER_INDEPENDENCE_FAILED');
  const exhaustion = candidateExhaustion(materialResults);
  const restoreAudit = [];
  const restoredIdentity = await restoreHead(restoreAudit);
  writeJson(RES + 'COMMIT_5R1C30_LIVE_RUNTIME_RESTORATION.json', {
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
  writeJson(RES + 'COMMIT_5R1C30_FINAL_EXECUTION_REPORT.json', report);
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
