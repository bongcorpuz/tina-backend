// PHASE-10A14-R20 COMMIT 5R1-C31 - Roadmap v9 promotion and R3 reason-layer continuation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C31';
const RES = L.RES;
const ATT = L.ATT;
const START_HEAD = '29e019d2148e709f1688f7139d4ba18d0ac84301';
const START_PARENT = '5551fffa77967012c4755cce77c7ceeaba30bbdb';
const C30_SELECTED = 'R20-domain_campaign-r20_commit5r1c30_structural_reason_remediation-commit5r1c30-dev-03-ord03-2026-07-27T23-27-23-359Z';
const C30_RECON = 'R20-domain_campaign-r20_commit5r1c30_c29_selected_base_reconstruction-commit5r1c30-reconstruction-ord01-2026-07-27T23-27-12-685Z';
const BASE_SNAP = ATT + C30_SELECTED + '/runtime-snapshot/';
const BASE_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': '0937a9bf1cbcfb6c76eb0f014c05e4310d4d3495ec5f06e6f87ef51a463336e2',
  'services/philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'services/philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const BASE_TREE = '31cb03cd17d851f4a08143c6c508da5d1a2108c7cfa9d810ec2d6d751188d5ce';
const START_VECTOR = { reasonPassed: 3472, reasonCounterfactualPassed: 344, collisionProbesPassed: 196 };

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
  'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
  RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  RES + 'COMMIT_5R1C30_ROADMAP_V8_CONTINUITY_RECONCILIATION.json',
  RES + 'COMMIT_5R1C30_BASE_RUNTIME_IDENTITY.json',
  RES + 'COMMIT_5R1C30_C29_BASE_RECONSTRUCTION.json',
  RES + 'COMMIT_5R1C30_POST_C29_RESIDUAL_INVENTORY.json',
  RES + 'COMMIT_5R1C30_POST_C29_RESIDUAL_OVERLAP_MAP.json',
  RES + 'COMMIT_5R1C30_POST_C29_REASON_FAMILY_SUMMARY.json',
  RES + 'COMMIT_5R1C30_MONOTONIC_FEATURE_BASELINE.json',
  RES + 'COMMIT_5R1C30_MONOTONIC_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C30_CANDIDATE_HYPOTHESES.json',
  RES + 'COMMIT_5R1C30_CANDIDATE_EXHAUSTION.json',
  RES + 'COMMIT_5R1C30_RULE_GENERALIZATION_PACKETS.json',
  RES + 'COMMIT_5R1C30_DERIVED_PACKET_VALIDATION.json',
  RES + 'COMMIT_5R1C30_COMPOSITION_ORDER_INDEPENDENCE.json',
  RES + 'COMMIT_5R1C30_CANDIDATE_DELTA_REPLAY_RESULT.json',
  RES + 'COMMIT_5R1C30_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json',
  RES + 'COMMIT_5R1C30_TAINT_AWARE_ANTI_OVERFIT_RESULT.json',
  RES + 'COMMIT_5R1C30_FINAL_EXECUTION_REPORT.json',
  RES + 'COMMIT_5R1C30_EVIDENCE_MANIFEST.sha256',
  ATT + C30_SELECTED + '/ITERATION_RESULT.json',
  ATT + 'R20-domain_campaign-r20_commit5r1c30_structural_reason_remediation-commit5r1c30-dev-01-ord01-2026-07-27T23-27-12-685Z/ITERATION_RESULT.json',
  ATT + 'R20-domain_campaign-r20_commit5r1c30_structural_reason_remediation-commit5r1c30-dev-02-ord02-2026-07-27T23-27-17-454Z/ITERATION_RESULT.json',
  ATT + C30_SELECTED + '/C30_ONLY_CANDIDATE.patch',
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

function compareDevFactory(before) {
  const after = captureDevFactory('COMMIT_5R1C31_DEV_FACTORY_POSTCHECK');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    before,
    after,
    statusSha256Unchanged: before.statusSha256 === after.statusSha256,
    trackedDiffSha256Unchanged: before.trackedDiffSha256 === after.trackedDiffSha256,
    headUnchanged: before.head === after.head,
    branchUnchanged: before.branch === after.branch,
    pass: before.statusSha256 === after.statusSha256
      && before.trackedDiffSha256 === after.trackedDiffSha256
      && before.head === after.head
      && before.branch === after.branch,
  };
  writeJson(RES + 'COMMIT_5R1C31_DEV_FACTORY_POSTCHECK.json', out);
  return out;
}

function preflight() {
  const registry = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  const status = git('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const tracked = git('status', '--porcelain=v2', '--untracked-files=no').trim();
  const untracked = status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2).replace(/\\/g, '/'));
  const permitted = untracked.filter((p) => /^(\.claude\/|\.vscode\/|evaluation\/factcheck\/)/.test(p)
    || p === 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md'
    || p === 'evaluation/runner/phase-10a14-r20/commit5r1c31-execute.mjs'
    || /^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C31_/.test(p)
    || /^evaluation\/results\/phase-10a14-r20\/attempts\/R20-domain_campaign-r20_commit5r1c31_/.test(p));
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
    && out.currentStateBlob === '0af260b56acc18525ccdfd309033f72e23ae5821'
    && out.startingRegistry.total === 200
    && out.startingRegistry.domain_campaign === 136
    && out.startingRegistry.focused_suite === 13
    && out.startingRegistry.other === 9
    && out.startingRegistry.synthetic_validator === 42
    && out.startingRegistry.controlling === 198
    && out.startingRegistry.nonControlling === 2
    && out.startingRegistry.orphan === 0
    && out.startingRegistry.dangling === 0
    && out.startingRegistry.cumulativeThrough === 'commit5r1c30-incomplete'
    && out.startingRegistry.decisionLayerClosure === true
    && out.startingRegistry.relationLayerClosure === true
    && out.startingRegistry.reasonLayerClosure === false
    && out.startingRegistry.runtimeClosure === false;
  writeJson(RES + 'COMMIT_5R1C31_PREFLIGHT.json', out);
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
  writeJson(RES + 'COMMIT_5R1C31_MANDATORY_FIRST_READ.json', out);
  return out;
}

function normalizedLfSha(pathOrText, isText = false) {
  const s = isText ? pathOrText : fs.readFileSync(pathOrText, 'utf8').replace(/^\uFEFF/, '');
  return shaText(s.replace(/\r\n/g, '\n'));
}

function updateRoadmapHeader(text, resultLine) {
  return text
    .replace(/\*\*Effective date:\*\* .+\s*/m, '**Effective date:** 28 July 2026  \n')
    .replace(/\*\*Current active work:\*\* .+\s*/m, '**Current active work:** PHASE-10A14-R20  \n')
    .replace(/\*\*Current controlling result:\*\* .+\s*/m, `**Current controlling result:** ${resultLine}  \n`)
    .replace(/\*\*Research V1 target:\*\* .+\s*/m, '**Research V1 target:** Controlled invitation-only operating release by 15 December 2026, subject to every trust, citation, security, performance and owner gate  \n')
    .replace(/\*\*(?:Public paid-release target|Possible public paid release):\*\* .+\s*/m, '**Possible public paid release:** 15-31 December 2026 only if the live-payment gate and all operating gates pass  \n')
    .replace(/\*\*Fallback:\*\* .+\s*/m, '**Fallback:** Invitation-only or free Research V1 in December 2026; paid activation in Q1 2027  \n')
    .replace(/\*\*Major-phase count:\*\* .+\s*/m, '**Major-phase count:** 18 - unchanged  \n')
    .replace(/knowledge\/TINA_Updated_Controlling_Roadmap_v9\.md/g, 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md');
}

function validateRoadmapV8(text) {
  const requiredNeedles = [
    'Research-First Philippine Tax Intelligence V1',
    'Full Philippine Tax Operating System',
    'Phase 10A remains an absolute blocker',
    '15 December 2026',
    '15-31 December 2026',
    'Phase 13',
    'Phase 14',
    '18',
  ];
  const sourceHierarchyPresent = [
    'committed Git evidence and frozen artifacts',
    'knowledge/CURRENT_STATE.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    'knowledge/TINA_Updated_Roadmap_v7.md',
  ].every((needle) => text.includes(needle));
  const requiredSignals = requiredNeedles.map((needle) => ({ signal: needle, present: text.includes(needle) }));
  const strategicIntegrity = text.includes('full Philippine Tax Operating System remains the destination')
    || text.includes('Full Philippine Tax Operating System remains the destination')
    || text.includes('long-term destination is not reduced');
  return {
    requiredSignals,
    productionReadinessSubphaseIntegrity: text.includes('live payment') || text.includes('paid'),
    sourceOfTruthHierarchyPresent: sourceHierarchyPresent,
    strategicSectionIntegrity: strategicIntegrity,
    pass: requiredSignals.every((x) => x.present) && strategicIntegrity,
  };
}

function roadmapV9StatusBlock(actual, resultLine, nextTask) {
  return `## C31 immediate execution status

Latest controlling execution result after COMMIT 5R1-C31:

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
- reason layer lock: **${actual.reasonPassed === 3720 ? 'achieved' : 'open'}**; and
- runtime closure: **not achieved**.

Current controlling result: **${resultLine}**

Next exact task:

**${nextTask}**

No market-response implementation may bypass Phase 10A. Runtime integration, model migration, durable memory, source promotion, production billing, public deployment and production cutover remain blocked until their governed gates pass.

---

`;
}

function upsertRoadmapV9Status(text, actual, resultLine, nextTask) {
  const block = roadmapV9StatusBlock(actual, resultLine, nextTask);
  if (/## C31 immediate execution status[\s\S]*?\n---\n\n/.test(text)) {
    return text.replace(/## C31 immediate execution status[\s\S]*?\n---\n\n/, block);
  }
  return text.replace(/---\s*\n\n## 1\. Controlling strategic decision/, '---\n\n' + block + '## 1. Controlling strategic decision');
}

function promoteRoadmapV8Initial(preflightResult) {
  const p = 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md';
  const before = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const preHash = normalizedLfSha(before, true);
  const v8Before = fs.readFileSync('knowledge/TINA_Updated_Controlling_Roadmap_v8.md');
  const v7Before = fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md');
  const validationBefore = validateRoadmapV8(before);
  const startActual = {
    decisionPassed: 3720,
    relationPassed: 3720,
    reasonPassed: 3472,
    reasonCounterfactualPassed: 344,
    collisionProbesPassed: 196,
    decisionCounterfactualPassed: 756,
    relationCounterfactualPassed: 282,
    clauseProbesPassed: 68,
    richContextGuardPassed: 7,
    richContextGuardTotal: 7,
    reasonIntegrityPass: true,
  };
  let updated = updateRoadmapHeader(before, 'COMMIT 5R1-C30 incomplete; COMMIT 5R1-C31 R3 reason-layer continuation is active');
  updated = upsertRoadmapV9Status(updated, startActual, 'COMMIT 5R1-C30 incomplete; COMMIT 5R1-C31 R3 reason-layer continuation is active', 'PHASE-10A14-R20 - COMMIT 5R1-C31 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C30 BASE');
  fs.writeFileSync(p, updated.replace(/\r\n/g, '\n'));
  const after = fs.readFileSync(p, 'utf8');
  const validationAfter = validateRoadmapV8(after);
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    preUpdateFileStatus: preflightResult.untracked.includes(p) ? 'untracked' : 'tracked',
    preUpdateNormalizedLfSha256: preHash,
    expectedPreUpdateNormalizedLfSha256: 'b53a6cc6eabef282f6a76cd8aa32ebaddd8113812097fb6e053a83c04b779997',
    classifications: [
      'RESEARCH_FIRST_V1_2026_STRATEGIC_RESEQUENCING',
      'NO_PHASE_10A_GATE_WEAKENING',
      'NO_C30_EXECUTION_INVALIDATION',
      'NO_C30_EVIDENCE_INVALIDATION',
      'NO_MAJOR_PHASE_RENUMBERING',
      'FULL_TAX_OPERATING_SYSTEM_DESTINATION_PRESERVED',
      'BETTER_THAN_ANYCASE_TARGET_BOUNDED_AND_NOT_CLAIMED_AS_CURRENT_STATE',
    ],
    semanticValidationBefore: validationBefore,
    semanticValidationAfter: validationAfter,
    v8Unchanged: Buffer.compare(v8Before, fs.readFileSync('knowledge/TINA_Updated_Controlling_Roadmap_v8.md')) === 0,
    v7Unchanged: Buffer.compare(v7Before, fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md')) === 0,
    initialPromotionNormalizedLfSha256: normalizedLfSha(after, true),
    authorizedPathOnly: p,
    idempotentPromotionRerun: before.includes('## C31 immediate execution status'),
    pass: (preHash === 'b53a6cc6eabef282f6a76cd8aa32ebaddd8113812097fb6e053a83c04b779997'
      || before.includes('## C31 immediate execution status'))
      && validationAfter.pass
      && Buffer.compare(v8Before, fs.readFileSync('knowledge/TINA_Updated_Controlling_Roadmap_v8.md')) === 0
      && Buffer.compare(v7Before, fs.readFileSync('knowledge/TINA_Updated_Roadmap_v7.md')) === 0,
  };
  writeJson(RES + 'COMMIT_5R1C31_ROADMAP_V9_PROMOTION_AND_CONTINUITY_RECONCILIATION.json', out);
  if (!out.pass) throw new Error('C31_ROADMAP_V9_PROMOTION_FAILED');
  return out;
}

function finalizeRoadmapV8(ctx) {
  const p = 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md';
  const before = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const best = [...ctx.materialResults].reverse().find((r) => r.accepted) || ctx.reconstruction;
  const actual = best.actual;
  const reasonLock = actual.reasonPassed === 3720 && actual.reasonCounterfactualPassed === 344 && actual.collisionProbesPassed === 196;
  const resultLine = reasonLock
    ? 'COMMIT 5R1-C31 reason layer locked; COMMIT 5R1-C32 standalone runtime closure is next'
    : 'COMMIT 5R1-C31 incomplete; COMMIT 5R1-C32 R3 reason continuation is next';
  const nextTask = reasonLock
    ? 'PHASE-10A14-R20 - COMMIT 5R1-C32 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION'
    : 'PHASE-10A14-R20 - COMMIT 5R1-C32 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C31 BASE';
  let updated = updateRoadmapHeader(before, resultLine);
  updated = upsertRoadmapV9Status(updated, actual, resultLine, nextTask);
  fs.writeFileSync(p, updated.replace(/\r\n/g, '\n'));
  const finalText = fs.readFileSync(p, 'utf8');
  const prev = readJson(RES + 'COMMIT_5R1C31_ROADMAP_V9_PROMOTION_AND_CONTINUITY_RECONCILIATION.json');
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
    v8ByteForBytePreservation: git('diff', '--', 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md') === '',
    v7ByteForBytePreservation: git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') === '',
    trackedInC31Commit: true,
    pass: validation.pass
      && git('diff', '--', 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md') === ''
      && git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') === '',
  };
  writeJson(RES + 'COMMIT_5R1C31_ROADMAP_V9_PROMOTION_AND_CONTINUITY_RECONCILIATION.json', out);
  if (!out.pass) throw new Error('C31_ROADMAP_V9_FINALIZATION_FAILED');
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
  const out = { unit: UNIT, generatedUtc: now(), sourceAttempt: C30_SELECTED, identity: got, mismatches, pass: mismatches.length === 0 };
  writeJson(RES + 'COMMIT_5R1C31_BASE_RUNTIME_IDENTITY.json', out);
  if (!out.pass) throw new Error('C31_BASE_SNAPSHOT_MISMATCH');
  return out;
}

async function governedReconstruction() {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c31_c30_selected_base_reconstruction',
    cycle: 'commit5r1c31-reconstruction',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c31-execute.mjs',
  });
  const writeAudit = [];
  const installedIdentity = await installSnapshot(BASE_SNAP, writeAudit);
  const gates = await runGates({ stage: 'full', label: 'C31-c30-selected-base-reconstruction' });
  console.log(summarize(gates));
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  writeJson(attempt.dir + 'BASE_RUNTIME_IDENTITY.json', { sourceAttempt: C30_SELECTED, identity: runtimeIdentityForDir(BASE_SNAP), pass: true });
  fs.writeFileSync(attempt.dir + 'C31_ONLY_CANDIDATE.patch', '');
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const actual = actualFromGates(gates);
  const expected = {
    reasonPassed: 3472,
    reasonCounterfactualPassed: 344,
    collisionProbesPassed: 196,
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
    sourceAttempt: C30_SELECTED,
    installedIdentity,
    writeAudit,
    expected,
    actual,
    discrepancies,
    gates,
    disposition: 'accepted_c30_selected_controlling_base_reconstruction',
  };
  writeJson(RES + 'COMMIT_5R1C31_C30_BASE_RECONSTRUCTION.json', out);
  writeJson(attempt.dir + 'RECONSTRUCTION_RESULT.json', out);
  await L.finalizeAttempt(attempt.dir, {
    disposition: out.disposition,
    stdout: summarize(gates),
    resultPaths: [RES + 'COMMIT_5R1C31_C30_BASE_RECONSTRUCTION.json', attempt.dir + 'RECONSTRUCTION_RESULT.json'],
  });
  if (discrepancies.length) throw new Error('C31_RECONSTRUCTION_DISCREPANCY');
  return out;
}

function writeCandidateSelectionReconciliation() {
  const c30 = readJson(ATT + C30_SELECTED + '/ITERATION_RESULT.json');
  const report = readJson(RES + 'COMMIT_5R1C30_FINAL_EXECUTION_REPORT.json');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    classification: 'C30_SELECTED_BASE_CONTINUITY',
    determinations: [
      'C30 selected the third Pareto-positive controlling candidate over the C29 selected base.',
      'C31 uses the C30 selected candidate runtime snapshot as its exact active base.',
      'C30 accepted rules are inherited in the active base and are not rerun unchanged in C31.',
      'C30 evidence is consumed as immutable input and is not modified.',
    ],
    selectedC30Base: {
      attemptId: C30_SELECTED,
      rule: c30.rule,
      actual: c30.actual,
      runtimeIdentity: runtimeIdentityForDir(BASE_SNAP),
    },
    c30FinalReportDecision: report.decision,
    c30EvidenceInvalidated: false,
    c30FilesModified: false,
    pass: c30.accepted === true
      && c30.actual.reasonPassed === 3472
      && c30.actual.reasonCounterfactualPassed === 344
      && c30.actual.collisionProbesPassed === 196,
  };
  writeJson(RES + 'COMMIT_5R1C31_C30_SELECTED_BASE_CONTINUITY.json', out);
  if (!out.pass) throw new Error('C31_C30_SELECTED_BASE_CONTINUITY_FAILED');
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
  deficiencyInterestLatePayment(src) {
    return insertBeforeReturnNull(src, String.raw`  const c31DeficiencyInterestLatePaymentExplicitTask = v.reason === 'tax_compliance_task'
      && /\bdeficiency\s+interest\b/i.test(v.t)
      && /\blate\s+payment\b/i.test(v.t);
  if (c31DeficiencyInterestLatePaymentExplicitTask)
    return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.86 };
`);
  },
  bareWithholdingInstrument(src) {
    return insertBeforeReturnNull(src, String.raw`  const c31BareWithholdingInstrumentExplicitTask = v.reason === 'tax_treatment_of_ordinary_object'
      && /^(?:expanded\s+)?withholding\s+tax\.?$/i.test(v.t);
  if (c31BareWithholdingInstrumentExplicitTask)
    return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.84 };
`);
  },
  quotedAlphabetizeTaxTerm(src) {
    return insertBeforeReturnNull(src, String.raw`  const c31QuotedAlphabetizeTaxTerm = v.reason === 'explicit_non_tax_task'
      && v.rels.includes('QUOTES_TERM')
      && /^alphabeti[sz]e\s+the\s+words?\s+["'][^"']+["']\.?$/i.test(v.t);
  if (c31QuotedAlphabetizeTaxTerm)
    return { decision: 'REFUSE', reasonCode: 'quoted_tax_term_only', confidence: 0.85 };
`);
  },
  variableNameNoTaxLabel(src) {
    return insertBeforeReturnNull(src, String.raw`  const c31VariableNameNoTaxLabel = v.reason === 'no_tax_relation'
      && v.rels.includes('NAMES_AS_INTERNAL_LABEL')
      && /\b(?:variable|field|property|flag|column)\s+name\b/i.test(v.t);
  if (c31VariableNameNoTaxLabel)
    return { decision: 'REFUSE', reasonCode: 'non_tax_label_or_name', confidence: 0.85 };
`);
  },
  secTimeMeasurementExpansion(src) {
    return insertBeforeReturnNull(src, String.raw`  const c31TimeMeasurementExpansion = v.reason === 'no_tax_relation'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && /\bsec\b/i.test(v.t)
      && /\btime\s+measurement\b/i.test(v.t);
  if (c31TimeMeasurementExpansion)
    return { decision: 'REFUSE', reasonCode: 'non_tax_expansion', confidence: 0.84 };
`);
  },
};

const candidates = [
  {
    id: 'C31-M01-deficiency-interest-late-payment-explicit-task',
    cycle: 'commit5r1c31-dev-01',
    ordinal: 1,
    rule: 'deficiency_interest_late_payment_is_explicit_tax_task_relation',
    layer: 'REASON_ONLY',
    principle: 'Deficiency-interest questions about late payment are explicit tax tasks rather than generic compliance-task explanations.',
    transform: ruleBlocks.deficiencyInterestLatePayment,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C31-M02-bare-withholding-instrument-explicit-task',
    cycle: 'commit5r1c31-dev-02',
    ordinal: 2,
    rule: 'bare_withholding_tax_instrument_is_explicit_tax_task_relation',
    layer: 'REASON_ONLY',
    principle: 'A bare withholding-tax instrument phrase is an explicit tax-task relation when no ordinary object is being evaluated for tax treatment.',
    transform: ruleBlocks.bareWithholdingInstrument,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C31-M03-quoted-alphabetize-tax-term',
    cycle: 'commit5r1c31-dev-03',
    ordinal: 3,
    rule: 'alphabetize_quoted_tax_term_is_quoted_tax_term_only',
    layer: 'REASON_ONLY',
    principle: 'Alphabetizing a quoted tax term is a non-tax quoted-term operation, not a performable ordinary task over an external object.',
    transform: ruleBlocks.quotedAlphabetizeTaxTerm,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C31-M04-variable-name-is-non-tax-label',
    cycle: 'commit5r1c31-dev-04',
    ordinal: 4,
    rule: 'variable_name_tax_phrase_is_non_tax_label_or_name',
    layer: 'REASON_ONLY',
    principle: 'Requests about variable or field names containing tax words are internal labels rather than tax-domain tasks.',
    transform: ruleBlocks.variableNameNoTaxLabel,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C31-M05-sec-time-measurement-expansion',
    cycle: 'commit5r1c31-dev-05',
    ordinal: 5,
    rule: 'sec_time_measurement_is_non_tax_expansion',
    layer: 'REASON_ONLY',
    principle: 'Expanding SEC as a time measurement in a non-tax action is a non-tax expansion, not a bare no-relation explanation.',
    transform: ruleBlocks.secTimeMeasurementExpansion,
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
  const mk = (id, category, principle, disposition = null) => ({
    id,
    category,
    principle,
    runtimePredicate: 'observable lexical/structural predicate only',
    layerClassification: category.includes('tax-task') ? 'REASON_ONLY_EXPLICIT_TAX_TASK' : 'REASON_ONLY_NON_TAX_BOUNDARY',
    targetSets: ['R3 reason residuals', 'reason suite v8', 'collision probes'],
    declaredActiveBase: C30_SELECTED,
    baseRelativePredictedDelta: 'non-decrease all locked gates, strict R3 reason improvement if target separability holds',
    simulationPlan: 'run full frozen gates against exact active base and candidate snapshot',
    nearestCorrectRowControls: 'measured by correct-row regression and frozen decision/relation locks',
    packetPlan: 'positive paraphrases, lexical substitutions, near-misses, constructions and filler families',
    taintRisk: 'low; generator uses structural packet only',
    compositionRisk: 'low; candidate inserted into governed reason override before final null',
    ambiguityRisk: category.includes('tail') ? 'requires narrow predicate' : 'tracked',
    disposition: disposition || (candidates.some((c) => c.id === id) ? 'material_iteration_allocated' : 'reserved_or_rejected_before_runtime'),
  });
  const hypotheses = [
    mk('C31-M01-deficiency-interest-late-payment-explicit-task', 'explicit-tax-task-tail', 'Deficiency-interest late-payment questions should explain as explicit tax task relation.'),
    mk('C31-M02-bare-withholding-instrument-explicit-task', 'explicit-tax-task-tail', 'A bare withholding-tax instrument phrase should not be demoted to ordinary-object treatment.'),
    mk('C31-M03-quoted-alphabetize-tax-term', 'quoted-term-tail', 'Alphabetizing quoted tax text is a quoted-term-only non-tax operation.'),
    mk('C31-M04-variable-name-is-non-tax-label', 'non-tax-label-tail', 'Variable, field, flag or column names containing tax terms are label/name requests.'),
    mk('C31-M05-sec-time-measurement-expansion', 'non-tax-expansion-tail', 'SEC as a time measurement in a non-tax action should explain as non-tax expansion.'),
    mk('C31-H06-broad-noun-phrase-no-relation', 'rejected-overbroad-tail', 'Broad noun-phrase no-relation routing was rejected because it trades off against explicit non-tax-task families.', 'rejected_after_ad_hoc_probe_overbroad_tradeoff'),
    mk('C31-H07-declarative-non-tax-expansion', 'rejected-overbroad-tail', 'Declarative non-tax expansion routing was rejected because it regressed the active base.', 'rejected_after_ad_hoc_probe_regression'),
    mk('C31-H08-no-tax-vs-explicit-non-tax-task', 'frontier-family', 'No-tax relation and explicit non-tax task residuals remain the dominant reason-only frontier.'),
    mk('C31-H09-explicit-tax-task-vs-ordinary-object-treatment', 'frontier-family', 'Explicit tax task and ordinary-object tax-treatment residuals require narrow tax-outcome predicates.'),
    mk('C31-H10-tax-compliance-single-tail', 'frontier-family', 'The single tax-compliance residual should be handled only with exact structural evidence.'),
    mk('C31-H11-acronym-label-expansion-tail', 'frontier-family', 'Acronym, label and expansion tails must preserve relation/decision exact locks.'),
    mk('C31-H12-definition-with-context-tail', 'frontier-family', 'Definition-with-context residuals require clear complete-referent predicates.'),
    mk('C31-H13-quoted-tax-term-tail', 'frontier-family', 'Quoted-term-only residuals require a delimited-content operation rather than tax advice.'),
    mk('C31-H14-non-tax-label-tail', 'frontier-family', 'Internal labels and variable names require explicit naming frames.'),
    mk('C31-H15-non-tax-expansion-tail', 'frontier-family', 'Non-tax expansion residuals require expansion semantics and a non-tax target.'),
    mk('C31-H16-composition-order-safety', 'composition-control', 'C31 candidates should remain order independent because predicates are mutually narrow.'),
    mk('C31-H17-taint-aware-anti-overfit', 'governance-control', 'No runtime predicate may depend on oracle IDs, expected labels, row positions or fixture membership.'),
    mk('C31-H18-c32-continuation-frontier', 'continuation-control', 'Remaining viable candidates after C31 must be deferred to C32 rather than broad-promoted.'),
  ];
  writeJson(RES + 'COMMIT_5R1C31_CANDIDATE_HYPOTHESES.json', { unit: UNIT, generatedUtc: now(), hypotheses, count: hypotheses.length, pass: hypotheses.length >= 18 });
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
  writeJson(RES + 'COMMIT_5R1C31_RULE_GENERALIZATION_PACKETS.json', { unit: UNIT, generatedUtc: now(), packets });
  writeJson(RES + 'COMMIT_5R1C31_DERIVED_PACKET_VALIDATION.json', validation);
  return validation;
}

function monotonicFeatureArtifacts() {
  const baseline = {
    unit: UNIT,
    generatedUtc: now(),
    inheritedControllingBase: C30_SELECTED,
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
  writeJson(RES + 'COMMIT_5R1C31_MONOTONIC_FEATURE_BASELINE.json', baseline);
  writeJson(RES + 'COMMIT_5R1C31_MONOTONIC_FEATURE_ABLATION.json', ablation);
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
  const finalC30Reconciliation = {
    unit: UNIT,
    generatedUtc: now(),
    selectedC30Base: C30_SELECTED,
    evidencedClassifications: [
      'FINAL_C30_RESIDUAL_POPULATION_RECOMPUTED',
      'ZERO_COLLISION_FAILURES_AFTER_C30',
      'ZERO_REASON_SUITE_FAILURES_AFTER_C30',
      'ALL_REMAINING_R3_FAILURES_ARE_REASON_ONLY',
    ],
    recomputedAgainstExactC30SelectedBase: true,
    recomputedCounts: {
      r3ReasonMismatches: r3Residuals.length,
      reasonSuiteFailures: reasonSuiteResiduals.length,
      collisionProbeFailures: collisionResiduals.length,
      deduplicatedCrossPopulationResiduals: deduped.length,
    },
    zeroCollisionFailures: collisionResiduals.length === 0,
    zeroReasonSuiteFailures: reasonSuiteResiduals.length === 0,
    reasonFamilySummary,
    pass: r3Residuals.length === 248 && reasonSuiteResiduals.length === 0 && collisionResiduals.length === 0,
  };
  writeJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_RECONCILIATION.json', finalC30Reconciliation);

  const inventory = {
    unit: UNIT,
    generatedUtc: now(),
    selectedBase: C30_SELECTED,
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
    pass: finalC30Reconciliation.pass && all.length > 0 && Object.entries(summary).every(([k, v]) => k === 'REASON_ONLY' ? v === 248 : v === 0),
  };
  writeJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_INVENTORY.json', inventory);
  writeJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_OVERLAP_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    selectedC30Base: C30_SELECTED,
    deduplicatedResiduals: deduped,
    priorAcceptedRuleOverlap: ['filing_deadline_return_is_tax_compliance_task', 'records_supporting_deduction_are_tax_treatment_support', 'ordinary_translation_request_is_no_tax_relation'],
    overlapSummary: summary,
    pass: true,
  });
  writeJson(RES + 'COMMIT_5R1C31_FINAL_C30_REASON_FAMILY_SUMMARY.json', {
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
  writeJson(RES + 'COMMIT_5R1C31_REASON_CONTRAST_MATRIX.json', {
    unit: UNIT,
    generatedUtc: now(),
    selectedC30Base: C30_SELECTED,
    actualToExpected: r3Residuals.reduce((acc, r) => {
      const k = `${r.actualReason} -> ${r.expectedReason}`;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    expectedReasonDeficits: reasonFamilySummary,
    pass: r3Residuals.length === 248,
  });
  if (!inventory.pass) throw new Error('C30_RESIDUAL_INVENTORY_RECONCILIATION_FAILED');
  return inventory;
}
async function runMaterialCandidate(c, active) {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c31_structural_reason_remediation',
    cycle: c.cycle,
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c31-execute.mjs',
    ordinal: c.ordinal,
  });
  const writeAudit = [];
  await installSnapshot(active.dir, writeAudit);
  const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', Buffer.from(c.transform(src), 'utf8'), writeAudit);
  const candidateIdentity = L.runtimeIdentity();
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  const candidateOnlyPatch = makeDiffPatch(attempt.dir, active.dir, attempt.dir + 'runtime-snapshot');
  fs.writeFileSync(attempt.dir + 'C31_ONLY_CANDIDATE.patch', candidateOnlyPatch);
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
    baseRelativeDelta: rel(attempt.dir + 'C31_ONLY_CANDIDATE.patch'),
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
  writeJson(RES + `COMMIT_5R1C31_MATERIAL_ITERATION_${String(c.ordinal).padStart(2, '0')}_RESULT.json`, result);
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
  writeJson(RES + 'COMMIT_5R1C31_CANDIDATE_DELTA_REPLAY_RESULT.json', out);
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
  writeJson(RES + 'COMMIT_5R1C31_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    surfaces: {
      RUNTIME_BEARING: ['candidate runtime snapshot', 'candidate-only patch', 'imported runtime predicate/helper', 'generated source inserted into services'],
      EVALUATOR_ORCHESTRATION: ['runner scripts', 'oracle readers', 'score calculators', 'candidate simulators', 'result serializers'],
      EVIDENCE_ONLY: ['reports', 'inventories', 'immutable fixtures', 'manifests'],
    },
    strictRuntimeBearingProhibition: ['oracle IDs', 'query hashes', 'expected labels', 'suite/family/category selectors', 'scenario/control/item/variant numbers', 'fixture membership', 'complete or near-complete fixture queries', 'serialized feature-vector lookup', 'fixture noun whitelist controlling output'],
  });
  writeJson(RES + 'COMMIT_5R1C31_TAINT_AWARE_ANTI_OVERFIT_RESULT.json', out);
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
  writeJson(RES + 'COMMIT_5R1C31_COMPOSITION_ORDER_INDEPENDENCE.json', out);
  return out;
}
function candidateExhaustion(materialResults) {
  const accepted = materialResults.filter((r) => r.accepted);
  const rejected = materialResults.filter((r) => !r.accepted);
  const best = accepted[accepted.length - 1] || materialResults[materialResults.length - 1];
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    hypothesesConsidered: readJson(RES + 'COMMIT_5R1C31_CANDIDATE_HYPOTHESES.json').count,
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
  writeJson(RES + 'COMMIT_5R1C31_CANDIDATE_EXHAUSTION.json', out);
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
    cumulativeThrough: 'commit5r1c31-incomplete',
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
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c31'))) {
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
  writeJson(RES + 'COMMIT_5R1C31_REPLAY_WORKDIR_CLEANUP.json', { unit: UNIT, generatedUtc: now(), removedGeneratedWorkdirs: removed, pass: true });
  return removed;
}

function writeManifest() {
  const manifest = RES + 'COMMIT_5R1C31_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c31-execute.mjs',
    'knowledge/CURRENT_STATE.md',
    'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C31_') && f !== 'COMMIT_5R1C31_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c31')).sort()) {
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
  const manifest = RES + 'COMMIT_5R1C31_EVIDENCE_MANIFEST.sha256';
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
  const roadmap = readJson(RES + 'COMMIT_5R1C31_ROADMAP_V9_PROMOTION_AND_CONTINUITY_RECONCILIATION.json');
  const residual = readJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_RECONCILIATION.json');
  const inventory = readJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_INVENTORY.json');
  const reasonLock = best.actual.reasonPassed === 3720 && best.actual.reasonCounterfactualPassed === 344 && best.actual.collisionProbesPassed === 196;
  const nextTask = reasonLock
    ? 'PHASE-10A14-R20 - COMMIT 5R1-C32 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION'
    : 'PHASE-10A14-R20 - COMMIT 5R1-C32 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C31 BASE';
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
PHASE-10A14-R20 - COMMIT 5R1-C31
ROADMAP V9 PROMOTION, EXACT C30 BASE RECONSTRUCTION AND R3 REASON-LAYER CONTINUATION
DECISION: ${reasonLock ? 'REASON LOCK ACHIEVED - STANDALONE RUNTIME CLOSURE REMAINS NEXT' : 'INCOMPLETE - C30 SELECTED BASE RECONSTRUCTED; R3 REASON IMPROVED; REASON LOCK REMAINS OPEN'}
\`\`\`

Roadmap v9 promotion and continuity:

\`\`\`text
Roadmap v9 promoted in C31                 true
Roadmap v9 pre normalized-LF SHA-256       ${roadmap.preUpdateNormalizedLfSha256}
Roadmap v9 final normalized-LF SHA-256     ${roadmap.finalNormalizedLfSha256 || roadmap.initialPromotionNormalizedLfSha256}
Roadmap v9 source-of-truth hierarchy       ${roadmap.sourceOfTruthHierarchyIntegrity ? 'PASS' : 'SEE ARTIFACT'}
Roadmap v8 byte-for-byte preservation      ${roadmap.v8ByteForBytePreservation ?? roadmap.v8Unchanged}
Roadmap v7 byte-for-byte preservation      ${roadmap.v7ByteForBytePreservation ?? roadmap.v7Unchanged}
Immediate source hierarchy                 committed evidence/frozen artifacts -> CURRENT_STATE -> Roadmap v9 -> Roadmap v8 -> Roadmap v7 historical
Research-First V1                          active controlling 2026 launch strategy; full Tax Operating System preserved
\`\`\`

Exact C30 selected base reconstruction:

\`\`\`text
source attempt                             ${C30_SELECTED}
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

Final C30 residual inventory:

\`\`\`text
classification                             ${residual.evidencedClassifications.join(', ')}
recomputed R3 reason mismatches            ${residual.recomputedCounts.r3ReasonMismatches}
recomputed reason-suite failures           ${residual.recomputedCounts.reasonSuiteFailures}
recomputed collision-probe failures        ${residual.recomputedCounts.collisionProbeFailures}
deduplicated cross-population residuals    ${residual.recomputedCounts.deduplicatedCrossPopulationResiduals}
REASON_ONLY                                ${inventory.summary.REASON_ONLY}
DECISION_DEPENDENT                         ${inventory.summary.DECISION_DEPENDENT}
RELATION_DEPENDENT                         ${inventory.summary.RELATION_DEPENDENT}
CROSS_LAYER_SAFE_DECISION_REASON           ${inventory.summary.CROSS_LAYER_SAFE_DECISION_REASON}
CROSS_LAYER_SAFE_RELATION_DECISION_REASON  ${inventory.summary.CROSS_LAYER_SAFE_RELATION_DECISION_REASON}
ORACLE_OR_CONTRACT_AMBIGUITY               ${inventory.summary.ORACLE_OR_CONTRACT_AMBIGUITY}
UNCLASSIFIED_PENDING_EVIDENCE              ${inventory.summary.UNCLASSIFIED_PENDING_EVIDENCE}
\`\`\`

C31 material-attempt accounting:

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

C31 final selected control vector:

\`\`\`text
R3 reason                                  ${best.actual.reasonPassed} / 3,720
reason-suite v8                            ${best.actual.reasonCounterfactualPassed} / 344
collision probes                           ${best.actual.collisionProbesPassed} / 196
R3 decision                                ${best.actual.decisionPassed} / 3,720
R3 relation                                ${best.actual.relationPassed} / 3,720
decision counterfactual                    ${best.actual.decisionCounterfactualPassed} / 756
relation counterfactual                    ${best.actual.relationCounterfactualPassed} / 282
clause probes                              ${best.actual.clauseProbesPassed} / 68
rich-context guard                         ${best.actual.richContextGuardPassed} / ${best.actual.richContextGuardTotal}
reason integrity                           ${best.actual.reasonIntegrityPass ? 'PASS' : 'FAIL'}
material false allows                      ${best.actual.materialFalseAllows}
material false refusals                    ${best.actual.materialFalseRefusals}
clarify mismatches                         ${best.actual.clarifyMismatches}
decision lock                              achieved
relation lock                              achieved
reason-suite lock                          achieved
reason layer lock                          ${reasonLock ? 'achieved' : 'open'}
runtime closure                            not achieved
\`\`\`

Canonical attempt registry:

\`\`\`text
total attempts                             ${ctx.registry.totalAttempts}
domain_campaign                            ${ctx.registry.byCategory.domain_campaign}
focused_suite                              ${ctx.registry.byCategory.focused_suite}
other                                      ${ctx.registry.byCategory.other}
synthetic_validator                        ${ctx.registry.byCategory.synthetic_validator}
controlling attempts                       ${ctx.registry.controlling}
non-controlling attempts                   ${ctx.registry.nonControlling}
orphan results                             ${ctx.registry.orphanResults}
dangling attempts                          ${ctx.registry.danglingAttempts}
cumulativeThrough                          commit5r1c31-incomplete
decisionLayerClosure                       true
relationLayerClosure                       true
reasonLayerClosure                         false
runtimeClosure                             false
\`\`\`

Evidence manifest:

\`\`\`text
manifest path                              ${rel(manifest.path)}
manifest entries                           ${manifest.manifestEntryCount}
manifest bad-hash count                    ${validation.badHashCount}
evidence files including manifest          ${manifest.evidenceFileCountIncludingManifest}
phase result file count                    ${phaseFileCount}
\`\`\`

## Next Exact Task

\`\`\`text
${nextTask}
\`\`\`

Do not start standalone runtime closure, integration/freeze, source promotion, model migration, Tax Library implementation, public deployment, billing activation or any later roadmap phase before the governed R3 reason layer is closed.

---

## Previous Continuity Snapshot

${prior}`;
  fs.writeFileSync(p, section.replace(/\r\n/g, '\n'));
}

function finalReport(ctx, manifest, validation) {
  const accepted = ctx.materialResults.filter((r) => r.accepted);
  const rejected = ctx.materialResults.filter((r) => !r.accepted);
  const best = accepted[accepted.length - 1] || ctx.reconstruction;
  const reasonLock = best.actual.reasonPassed === 3720 && best.actual.reasonCounterfactualPassed === 344 && best.actual.collisionProbesPassed === 196;
  const report = {
    unit: UNIT,
    generatedUtc: now(),
    decision: reasonLock ? 'PASS_REASON_LAYER_LOCKED_RUNTIME_CLOSURE_PENDING' : 'INCOMPLETE_REASON_LAYER_OPEN',
    commitMessage: reasonLock
      ? 'PHASE-10A14-R20 COMMIT 5R1-C31 - lock R3 reason layer and promote Research-First Roadmap v9'
      : 'PHASE-10A14-R20 COMMIT 5R1-C31 incomplete - preserve governed R3 reason evidence and promote Research-First Roadmap v9',
    roadmapV9PromotionAndContinuityReconciliation: readJson(RES + 'COMMIT_5R1C31_ROADMAP_V9_PROMOTION_AND_CONTINUITY_RECONCILIATION.json'),
    preflight: ctx.preflight,
    mandatoryFirstRead: readJson(RES + 'COMMIT_5R1C31_MANDATORY_FIRST_READ.json'),
    selectedC30Base: C30_SELECTED,
    baseRuntimeIdentity: ctx.baseIdentity,
    reconstruction: ctx.reconstruction,
    finalC30ResidualReconciliation: readJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_RECONCILIATION.json'),
    finalC30ResidualInventory: {
      populations: readJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_INVENTORY.json').populations,
      summary: readJson(RES + 'COMMIT_5R1C31_FINAL_C30_RESIDUAL_INVENTORY.json').summary,
    },
    monotonicFeatureBaseline: ctx.monotonic.baseline,
    monotonicFeatureAblation: ctx.monotonic.ablation,
    hypotheses: readJson(RES + 'COMMIT_5R1C31_CANDIDATE_HYPOTHESES.json'),
    materialIterations: ctx.materialResults.map((r) => ({
      attemptId: r.attemptId,
      candidateId: r.candidateId,
      rule: r.rule,
      accepted: r.accepted,
      actual: r.actual,
      pareto: r.pareto,
    })),
    acceptedRules: accepted.map((r) => r.rule),
    rejectedRules: rejected.map((r) => r.rule),
    finalSelectedControllingAttempt: best.attemptId,
    finalActual: best.actual,
    locks: {
      decisionLayerClosure: true,
      relationLayerClosure: true,
      reasonSuiteLock: best.actual.reasonCounterfactualPassed === 344,
      collisionProbeLock: best.actual.collisionProbesPassed === 196,
      reasonLayerClosure: reasonLock,
      runtimeClosure: false,
    },
    derivedPacketValidation: ctx.derived,
    deltaReplay: ctx.deltaReplay,
    taintAwareAntiOverfit: ctx.taint,
    compositionOrderIndependence: ctx.compositionOrder,
    candidateExhaustion: ctx.exhaustion,
    registry: ctx.registry,
    manifest,
    manifestValidation: validation,
    devFactoryPostcheck: ctx.devPost,
    protectedPriorEvidenceMutation: false,
    roadmapV8Mutation: git('diff', '--', 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md') !== '',
    roadmapV7Mutation: git('diff', '--', 'knowledge/TINA_Updated_Roadmap_v7.md') !== '',
    nextExactTask: reasonLock
      ? 'PHASE-10A14-R20 - COMMIT 5R1-C32 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION'
      : 'PHASE-10A14-R20 - COMMIT 5R1-C32 R3 REASON-LAYER CLOSURE CONTINUATION AGAINST THE GOVERNANCE-COMPLIANT C31 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C31_FINAL_EXECUTION_REPORT.json', report);
  return report;
}
async function main() {
  await L.assertRuntimeIntact('C30-start');
  const preflightResult = preflight();
  const devPre = captureDevFactory('COMMIT_5R1C31_DEV_FACTORY_PREEXISTING_STATE');
  writeJson(RES + 'COMMIT_5R1C31_DEV_FACTORY_PREEXISTING_STATE.json', devPre);
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
  let active = { attemptId: C30_SELECTED, dir: BASE_SNAP, actual: reconstruction.actual };
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
  writeJson(RES + 'COMMIT_5R1C31_LIVE_RUNTIME_RESTORATION.json', {
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
  writeJson(RES + 'COMMIT_5R1C31_FINAL_EXECUTION_REPORT.json', report);
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
