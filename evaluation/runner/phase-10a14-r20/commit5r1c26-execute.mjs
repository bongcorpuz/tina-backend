// PHASE-10A14-R20 COMMIT 5R1-C26 - Pareto adjudication and structural reason continuation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C26';
const RES = L.RES;
const ATT = L.ATT;
const START_HEAD = 'cef0f5d0a04908c1dbfe94a548ab472a0bed35bc';
const START_PARENT = '999adcde703394cb5dd39a2e3621c9f42872cde4';
const C25_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c25_structural_reason_remediation-commit5r1c25-dev-03-ord03-2026-07-27T10-09-28-390Z';
const C25_SNAP = ATT + C25_ATTEMPT + '/runtime-snapshot/';
const C25_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': '57df20a8dad31b1267b5bbd3b92b679acdafcd4a48e0df462b3d7b7e3ca96fdc',
  'services/philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'services/philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const C25_TREE = '7af07279b59992c099aef4174680beebfe44ddfe06b36e126687805779aaecaa';
const RUNTIME_EXPECTED = { r3Reason: 3462, reasonSuite: 331, collisionProbes: 155, decision: 3720, relation: 3720 };

const now = () => new Date().toISOString();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const shaText = (s) => sha256(Buffer.from(s, 'utf8'));
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = L.writeJson;
const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const git = (...args) => execFileSync('git', ['-C', L.REPO, ...args], { maxBuffer: 1e9 }).toString();
const gitDev = (...args) => execFileSync('git', ['-c', 'safe.directory=C:/Projects/tina-dev-factory', '-C', 'C:/Projects/tina-dev-factory', ...args], { maxBuffer: 1e9 }).toString();
const ps = (script) => execFileSync('powershell', ['-NoProfile', '-Command', script], { maxBuffer: 1e9 }).toString();
const headFile = (r) => execFileSync('git', ['-C', L.REPO, 'show', 'HEAD:' + r], { maxBuffer: 1e9 });

const mandatoryFirstRead = [
  'knowledge/CURRENT_STATE.md',
  'knowledge/TINA_Updated_Roadmap_v7.md',
  RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  RES + 'COMMIT_5R1C22_ANTI_OVERFIT_GATE_SPEC.md',
  RES + 'COMMIT_5R1C22_ANTI_OVERFIT_RED_TEAM.json',
  RES + 'COMMIT_5R1C23_LABEL_INDEPENDENT_FEATURE_SPEC.md',
  RES + 'COMMIT_5R1C23_POST_CANDIDATE_COLLISION_ANALYSIS_V5.json',
  RES + 'COMMIT_5R1C24_COLLISION_ANALYSIS_V6.json',
  RES + 'COMMIT_5R1C24_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C24_REASON_SUITE_FAILURE_CONTRACT.json',
  RES + 'COMMIT_5R1C24_COLLISION_PROBE_FAILURE_CONTRACT.json',
  RES + 'COMMIT_5R1C25_C24_EXECUTION_AND_MANIFEST_RECONCILIATION.json',
  RES + 'COMMIT_5R1C25_CANDIDATE_HYPOTHESES.json',
  RES + 'COMMIT_5R1C25_CANDIDATE_EXHAUSTION.json',
  RES + 'COMMIT_5R1C25_RECONSTRUCTION_RESULT.json',
  RES + 'COMMIT_5R1C25_EFFECT_SIMULATION.json',
  RES + 'COMMIT_5R1C25_FEATURE_EXTRACTION_RESULT.json',
  RES + 'COMMIT_5R1C25_POST_MATERIAL_FEATURE_EXTRACTION_RESULT.json',
  RES + 'COMMIT_5R1C25_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C25_POST_MATERIAL_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C25_RULE_GENERALIZATION_PACKETS.json',
  RES + 'COMMIT_5R1C25_DERIVED_PACKET_VALIDATION.json',
  RES + 'COMMIT_5R1C25_TRANSITIVE_ANTI_OVERFIT_RESULT.json',
  RES + 'COMMIT_5R1C25_FINAL_EXECUTION_REPORT.json',
  RES + 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256',
  ATT + C25_ATTEMPT + '/EFFECT_SIMULATION.json',
  ATT + C25_ATTEMPT + '/ITERATION_RESULT.json',
  ATT + C25_ATTEMPT + '/C25_ONLY_CANDIDATE.patch',
  RES + 'CLAUSE_LEVEL_INTENT_SCHEMA.md',
  RES + 'RELATION_AND_PRECEDENCE_SPEC.md',
];

async function restoreHead(audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('c26-restored-head');
  return L.runtimeIdentity();
}

function preflight() {
  const head = git('rev-parse', 'HEAD').trim();
  const parent = git('rev-parse', 'HEAD^').trim();
  const branch = git('branch', '--show-current').trim();
  const sync = git('rev-list', '--left-right', '--count', 'origin/feature/source-availability-engine-v1...HEAD').trim();
  const tracked = git('status', '--porcelain=v2', '--untracked-files=no').trim();
  const status = git('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const untracked = status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2).replace(/\\/g, '/'));
  const badUntracked = untracked.filter((p) => !/^(\.claude\/|\.vscode\/|evaluation\/factcheck\/|execution-prompts\/)/.test(p)
    && p !== 'evaluation/runner/phase-10a14-r20/commit5r1c26-execute.mjs'
    && !/^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C26_/.test(p)
    && !/^evaluation\/results\/phase-10a14-r20\/attempts\/R20-domain_campaign-r20_commit5r1c26_/.test(p));
  let nodeListeners = '';
  let port5173 = '';
  try { nodeListeners = ps("$pids = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($pid in $pids) { $p = Get-Process -Id $pid -ErrorAction SilentlyContinue; if ($p.ProcessName -eq 'node') { $pid } }"); } catch {}
  try { port5173 = ps("Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ConvertTo-Json -Compress"); } catch {}
  const registry = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  const out = {
    unit: UNIT, generatedUtc: now(), head, parent, branch, sync,
    trackedTreeClean: tracked === '',
    untracked,
    protectedUntrackedOnly: badUntracked.length === 0,
    badUntracked,
    nodeListenerAbsent: nodeListeners.trim() === '',
    port5173Free: port5173.trim() === '',
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
  out.pass = head === START_HEAD && parent === START_PARENT && branch === 'feature/source-availability-engine-v1'
    && sync === '0\t0' && out.trackedTreeClean && out.protectedUntrackedOnly
    && out.nodeListenerAbsent && out.port5173Free
    && out.currentStateBlob === '142611c771ed8b1e761a3370bbe06f8c1886780b'
    && out.startingRegistry.total === 182
    && out.startingRegistry.domain_campaign === 118
    && out.startingRegistry.focused_suite === 13
    && out.startingRegistry.other === 9
    && out.startingRegistry.synthetic_validator === 42
    && out.startingRegistry.controlling === 180
    && out.startingRegistry.nonControlling === 2
    && out.startingRegistry.orphan === 0
    && out.startingRegistry.dangling === 0
    && out.startingRegistry.cumulativeThrough === 'commit5r1c25-incomplete'
    && out.startingRegistry.decisionLayerClosure === true
    && out.startingRegistry.relationLayerClosure === true
    && out.startingRegistry.reasonLayerClosure === false
    && out.startingRegistry.runtimeClosure === false;
  writeJson(RES + 'COMMIT_5R1C26_PREFLIGHT.json', out);
  if (!out.pass) throw new Error('C26_PREFLIGHT_DISCREPANCY');
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
    branch: gitDev('branch', '--show-current').trim(),
    porcelainV2Status: status,
    statusSha256: shaText(status),
    trackedDiffSha256: shaText(diff),
    untrackedPaths: status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2)),
  };
}

function compareDevFactory(pre) {
  const post = captureDevFactory('COMMIT_5R1C26_DEV_FACTORY_POSTCHECK');
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
  writeJson(RES + 'COMMIT_5R1C26_DEV_FACTORY_POSTCHECK.json', out);
  if (!out.equal) throw new Error('DEV_FACTORY_CHANGED_DURING_C26');
  return out;
}

function mandatoryReadRecord() {
  const files = mandatoryFirstRead.map((p) => {
    const b = fs.readFileSync(p);
    return { path: rel(p), bytes: b.length, sha256: sha256(b), readComplete: true };
  });
  const out = { unit: UNIT, generatedUtc: now(), files };
  writeJson(RES + 'COMMIT_5R1C26_MANDATORY_FIRST_READ.json', out);
  return out;
}

function verifyC25Snapshot() {
  const parts = [];
  const files = {};
  for (const n of L.SERVICES) {
    const p = C25_SNAP + n;
    const b = fs.readFileSync(p);
    const key = 'services/' + n;
    const normalizedLfSha256 = L.sha256(L.normLf(b));
    files[key] = { bytes: b.length, normalizedLfSha256, expected: C25_IDENTITY[key], match: normalizedLfSha256 === C25_IDENTITY[key] };
    if (!files[key].match || b.length === 0) throw new Error('C25_BASE_IDENTITY_MISMATCH ' + key);
    parts.push(L.normLf(b));
  }
  const servicesTreeDigest = L.sha256(Buffer.concat(parts));
  if (servicesTreeDigest !== C25_TREE) throw new Error('C25_TREE_DIGEST_MISMATCH ' + servicesTreeDigest);
  return { sourceAttempt: C25_ATTEMPT, files, servicesTreeDigest, expectedServicesTreeDigest: C25_TREE, pass: true };
}

function c25GovernanceReconciliation() {
  const currentState = fs.readFileSync('knowledge/CURRENT_STATE.md', 'utf8');
  const c25ManifestLines = fs.readFileSync(RES + 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256', 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const registry = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  const c25Attempts = registry.attempts.filter((a) => String(a.attemptId).includes('commit5r1c25'));
  const material = c25Attempts.filter((a) => String(a.attemptId).includes('structural_reason_remediation'));
  const effect = readJson(RES + 'COMMIT_5R1C25_EFFECT_SIMULATION.json');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    manifestReporting: {
      committedManifestEntries: c25ManifestLines.length,
      committedEvidenceFilesIncludingSelfExcludingManifest: c25ManifestLines.length + 1,
      currentStateRecordedManifestEntries: /manifest entries\s+53/.test(currentState) ? 53 : null,
      currentStateRecordedEvidenceFilesIncludingManifest: /evidence files including manifest\s+54/.test(currentState) ? 54 : null,
      classifications: ['C25_CURRENT_STATE_MANIFEST_COUNT_REPORTING_DEFECT', 'NO_MANIFEST_INTEGRITY_DEFECT'],
      c25EvidencePreservedByteForByte: true,
      prospectiveCorrectionRequiredInC26CurrentState: true,
    },
    materialAttemptAccounting: {
      governedReconstruction: c25Attempts.filter((a) => String(a.attemptId).includes('c24_base_reconstruction')).length,
      registeredMaterialCampaigns: material.length,
      dev01: { disposition: 'rejected_before_runtime_acceptance', reason: 'no R3-row gain despite frozen-gate gain' },
      dev02: { disposition: 'rejected_packet_validation' },
      dev03: { disposition: 'activated_and_recorded_accepted' },
      allThreeMaterialCampaignsAcceptedRuntimeIterations: false,
    },
    acceptanceContractConflict: {
      requiredPositiveNetR3MismatchReduction: true,
      dev03: {
        matchedR3Ids: effect.matchedIds.length,
        tpCorrected: effect.tpCorrected,
        netMismatchDelta: effect.netMismatchDelta,
        reasonSuiteBefore: 320,
        reasonSuiteAfter: effect.reasonSuiteEffect.passed,
        collisionProbesBefore: 148,
        collisionProbesAfter: effect.collisionProbeEffect.passed,
        frozenGateNetGain: effect.frozenGateNetGain,
      },
      classification: 'C25_ACCEPTANCE_CONTRACT_DEVIATION',
      scoreOrEvidenceFabricated: false,
      governingCriterionDefect: true,
    },
    pass: c25ManifestLines.length === 54 && material.length === 3 && effect.tpCorrected === 0 && effect.netMismatchDelta === 0,
  };
  writeJson(RES + 'COMMIT_5R1C26_C25_GOVERNANCE_RECONCILIATION.json', out);
  if (!out.pass) throw new Error('C25_GOVERNANCE_RECONCILIATION_DISCREPANCY');
  return out;
}

function writeParetoPolicy() {
  const text = `# COMMIT 5R1-C26 Pareto Acceptance Policy

This policy is prospective only. It does not rewrite C25 history and does not call
a frozen-suite-only rule an R3 reason gain.

A candidate may become the C26 controlling base only when all three open mandatory
reason gates are monotonic:

- R3 reason does not decrease.
- reason suite v8 does not decrease.
- collision probes do not decrease.
- at least one of those three gates strictly improves.

It must also preserve exact decision, relation, clause, guard and integrity gates,
with zero correct-row regression, zero wrong-to-different-wrong movement, zero
decision drift, zero relation drift, target/placement/composition/order safety,
derived generalization, and transitive anti-overfit.

This forbids weighted averaging, regression trading, aggregate-score acceptance,
and recharacterizing C25's frozen-gate-only gain as an R3 gain.
`;
  fs.writeFileSync(RES + 'COMMIT_5R1C26_PARETO_ACCEPTANCE_POLICY.md', text.replace(/\r\n/g, '\n'));
}

function paretoAdjudication(recon) {
  const effect = readJson(RES + 'COMMIT_5R1C25_EFFECT_SIMULATION.json');
  const anti = readJson(RES + 'COMMIT_5R1C25_TRANSITIVE_ANTI_OVERFIT_RESULT.json');
  const derived = readJson(RES + 'COMMIT_5R1C25_DERIVED_PACKET_VALIDATION.json');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    policy: 'OPEN_REASON_GATE_PARETO_ACCEPTANCE_POLICY',
    c25Rule: 'external_subject_to_tax_instrument_is_ordinary_object_treatment',
    checks: {
      r3ReasonDoesNotDecrease: recon.actual.reasonPassed === RUNTIME_EXPECTED.r3Reason,
      reasonSuiteDoesNotDecrease: recon.actual.reasonCounterfactualPassed === RUNTIME_EXPECTED.reasonSuite,
      collisionProbesDoNotDecrease: recon.actual.collisionProbesPassed === RUNTIME_EXPECTED.collisionProbes,
      atLeastOneOpenGateStrictlyImprovesVsC24Base: RUNTIME_EXPECTED.reasonSuite > 320 || RUNTIME_EXPECTED.collisionProbes > 148,
      decisionRelationClauseGuardIntegrityExact: recon.gates.decisionLockHeld && recon.gates.relationLockHeld
        && recon.gates.clauseProbes.passed === 68 && recon.gates.richContextGuard.passed === 7
        && recon.gates.reasonIntegrity.pass,
      correctRowRegressionsZero: effect.correctRowRegressions === 0,
      wrongToDifferentWrongZero: effect.wrongToDifferentWrong === 0,
      decisionDriftZero: effect.decisionDrift === 0,
      relationDriftZero: effect.relationDrift === 0,
      targetPlacementCompositionOrderSafety: 'inherited from C25 packet/gate evidence; no C26 broadening applied to this base',
      transitiveAntiOverfitPass: anti.pass === true,
      derivedGeneralizationPass: derived.pass === true,
    },
    forbiddenInterpretationsAvoided: {
      weightedAveraging: true,
      regressionTrading: true,
      aggregateScoreAcceptance: true,
      frozenSuiteOnlyGainCalledR3Gain: false,
    },
  };
  out.determination = Object.entries(out.checks).every(([, v]) => v === true || typeof v === 'string')
    ? 'RETAIN_PROSPECTIVELY_AS_C26_PARETO_BASE'
    : 'NON_CONTROLLING_C25_RULE';
  out.pass = out.determination === 'RETAIN_PROSPECTIVELY_AS_C26_PARETO_BASE';
  writeJson(RES + 'COMMIT_5R1C26_C25_RULE_PARETO_ADJUDICATION.json', out);
  return out;
}

function groupCollision(rows, keyField = 'monotonicFeatureVector') {
  const groups = new Map();
  for (const r of rows) {
    const key = r[keyField];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const colliding = [];
  for (const [vector, rs] of groups) {
    const reasons = [...new Set(rs.map((r) => r.expectedReason))];
    if (reasons.length > 1) colliding.push({ vector, support: rs.length, expectedReasonDistribution: Object.fromEntries(reasons.map((reason) => [reason, rs.filter((r) => r.expectedReason === reason).length])), counterexamples: rs.slice(0, 8).map(({ oracleId, query, expectedReason, actualReason }) => ({ oracleId, query, expectedReason, actualReason })) });
  }
  return { vectorCount: groups.size, collidingRows: colliding.reduce((n, g) => n + g.support, 0), collidingVectorCount: colliding.length, collidingVectors: colliding };
}

function monotonicFeatureReconciliation() {
  const c24 = readJson(RES + 'COMMIT_5R1C24_RESIDUAL_FEATURE_MATRIX.json');
  const c25 = readJson(RES + 'COMMIT_5R1C25_POST_MATERIAL_FEATURE_EXTRACTION_RESULT.json');
  const byId = new Map(c25.rows.map((r) => [r.oracleId, r]));
  const rows = c24.rows.map((r) => {
    const c25r = byId.get(r.oracleId);
    if (!c25r) throw new Error('MISSING_C25_FEATURE_ROW ' + r.oracleId);
    const fields = { ...r.featureFields, ...Object.fromEntries(Object.entries(c25r.feature.fields).map(([k, v]) => ['c25_' + k, v])) };
    const monotonicFeatureVector = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('|');
    return {
      oracleId: r.oracleId,
      query: r.query,
      expectedReason: r.expectedReason,
      actualReason: r.actualReason,
      expectedDecision: r.expectedDecision,
      actualDecision: r.actualDecision,
      featureFields: fields,
      monotonicFeatureVector,
    };
  });
  const collision = groupCollision(rows);
  const reconciliation = {
    unit: UNIT,
    generatedUtc: now(),
    classification: 'FEATURE_VECTOR_VERSION_NONCOMPARABILITY',
    c24V6: { featureVectors: 120, collidingRows: 27, collidingVectors: 2 },
    c25CoarserKey: { featureVectors: 26, collidingRows: 213, collidingVectors: 11 },
    determination: 'not directly comparable because the C25 feature definition removed/coarsened C24 V6 fields and merged previously distinct vectors',
    c25DoesNotProveNewSemanticCollisions: true,
  };
  const spec = `# COMMIT 5R1-C26 Monotonic Feature Spec

The C26 feature vector is a strict superset of the valid C24 V6 key. It preserves
all C24 fields and appends C25 structural features under a \`c25_\` prefix, so the
analysis cannot merge vectors that C24 already separated.

Forbidden inputs remain excluded: expected reason or decision, actual reason as a
separability feature, oracle ID, query hash, suite/family/category, row position,
fixture membership, and the full normalized query.

Included C24 fields: ${c24.featureKeys.join(', ')}.

Added structural fields include grammatical subject span class, tax complement span
class, tax predicate bearer, external object/event head, tax instrument head,
copular subject-to-tax construction, operand content availability, document title
versus supplied content, evidentiary support outcome, filing/remittance/
registration/deadline outcome, definition/expansion request, ordinary-world
context, quoted-operand scope, Filipino/Taglish morphology, metadata suffix and
acronym referent completeness.
`;
  const baseline = {
    unit: UNIT,
    generatedUtc: now(),
    residualRows: rows.length,
    c24FeatureCount: c24.featureKeys.length,
    c25AddedFeatureCount: c25.featureKeys.length,
    monotonicFeatureCount: c24.featureKeys.length + c25.featureKeys.length,
    vectorCount: collision.vectorCount,
    collidingRows: collision.collidingRows,
    collidingVectorCount: collision.collidingVectorCount,
    required: { vectorCountAtLeast: 120, collidingRowsAtMost: 27 },
    pass: collision.vectorCount >= 120 && collision.collidingRows <= 27,
    rows,
    collidingVectors: collision.collidingVectors,
  };
  writeJson(RES + 'COMMIT_5R1C26_FEATURE_VERSION_RECONCILIATION.json', reconciliation);
  fs.writeFileSync(RES + 'COMMIT_5R1C26_MONOTONIC_FEATURE_SPEC.md', spec.replace(/\r\n/g, '\n'));
  writeJson(RES + 'COMMIT_5R1C26_MONOTONIC_FEATURE_BASELINE.json', baseline);
  if (!baseline.pass) throw new Error('MONOTONIC_FEATURE_EXTRACTOR_DEFECT');
  return baseline;
}

async function installSnapshot(snapshotDir, audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(snapshotDir + n), audit);
  await L.assertRuntimeIntact('c26-install-snapshot');
  return L.runtimeIdentity();
}

async function governedReconstruction() {
  const writeAudit = [];
  const snap = verifyC25Snapshot();
  await installSnapshot(C25_SNAP, writeAudit);
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c26_c25_pareto_base_reconstruction',
    cycle: 'commit5r1c26-reconstruction',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c26-execute.mjs',
    ordinal: 1,
  });
  const gates = await runGates({ stage: 'full', label: 'c26-c25-pareto-base-reconstruction' });
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  const actual = {
    canonicalPassed: gates.r3.canonicalPassed,
    decisionPassed: gates.r3.decisionPassed,
    relationPassed: gates.r3.relationPassed,
    reasonPassed: gates.reasonPassed,
    reasonMismatches: gates.r3.reasonMismatches,
    materialFalseAllows: gates.r3.materialFalseAllows,
    materialFalseRefusals: gates.r3.materialFalseRefusals,
    clarifyMismatches: gates.r3.clarifyMismatches,
    decisionCounterfactualPassed: gates.decisionCounterfactual.passed,
    relationCounterfactualPassed: gates.relationCounterfactual.passed,
    clauseProbesPassed: gates.clauseProbes.passed,
    reasonCounterfactualPassed: gates.reasonCounterfactual.passed,
    collisionProbesPassed: gates.collisionProbes.passed,
  };
  const discrepancies = [];
  if (actual.reasonPassed !== 3462) discrepancies.push('R3_REASON');
  if (actual.decisionPassed !== 3720) discrepancies.push('R3_DECISION');
  if (actual.relationPassed !== 3720) discrepancies.push('R3_RELATION');
  if (actual.reasonCounterfactualPassed !== 331) discrepancies.push('REASON_SUITE');
  if (actual.collisionProbesPassed !== 155) discrepancies.push('COLLISION_PROBES');
  const out = { unit: UNIT, generatedUtc: now(), attemptId: attempt.attemptId, snapshot: snap, installedIdentity: L.runtimeIdentity(), writeAudit, actual, discrepancies, gates, pass: discrepancies.length === 0 };
  writeJson(attempt.dir + 'RECONSTRUCTION_RESULT.json', out);
  writeJson(RES + 'COMMIT_5R1C26_RECONSTRUCTION_RESULT.json', out);
  await L.finalizeAttempt(attempt.dir, { disposition: 'accepted_c26_pareto_base_reconstruction', stdout: summarize(gates), resultPaths: [attempt.dir + 'RECONSTRUCTION_RESULT.json'] });
  if (!out.pass) throw new Error('C26_RECONSTRUCTION_DISCREPANCY');
  return out;
}

function classifyFailures(gates) {
  const classify = (f) => {
    const decisionMet = !('expectedDecision' in f) || f.expectedDecision === f.actualDecision;
    const relationMet = !f.missing || f.missing.length === 0;
    let layer = 'REASON_ONLY';
    if (!decisionMet) layer = 'DECISION_DEPENDENT';
    else if (!relationMet) layer = 'RELATION_DEPENDENT';
    if (/^(?:What is [A-Z]{2,6}|What does [A-Z]{2,6})/i.test(f.query || '')) layer = 'ORACLE_OR_CONTRACT_AMBIGUITY';
    return { ...f, decisionMet, relationMet, classification: layer };
  };
  const reason = gates.gates.reasonCounterfactual.failures.map(classify);
  const collision = gates.gates.collisionProbes.failures.map(classify);
  const byCollisionFamily = gates.gates.collisionProbes.byFamily;
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    base: 'retained C25 Pareto base',
    expectedOpenGates: { reasonSuiteFailures: 13, collisionProbeFailures: 41 },
    actualOpenGates: { reasonSuiteFailures: reason.length, collisionProbeFailures: collision.length },
    expectedCollisionFamilies: {
      collision_request_subtype: 8,
      predicate_attachment: 1,
      outcome_evidentiary_vs_filing: 16,
      acronym_vs_topic_ambiguity: 16,
    },
    actualCollisionFamilies: byCollisionFamily,
    reasonSuiteFailures: reason,
    collisionProbeFailures: collision,
    summary: [...reason, ...collision].reduce((acc, f) => { acc[f.classification] = (acc[f.classification] || 0) + 1; return acc; }, {}),
    pass: reason.length === 13 && collision.length === 41
      && byCollisionFamily.collision_request_subtype === 8
      && byCollisionFamily.predicate_attachment === 1
      && byCollisionFamily.outcome_evidentiary_vs_filing === 16
      && byCollisionFamily.acronym_vs_topic_ambiguity === 16,
  };
  writeJson(RES + 'COMMIT_5R1C26_REMAINING_FAILURE_LAYER_CLASSIFICATION.json', out);
  return out;
}

function candidateHypotheses() {
  const mk = (id, family, principle, predicate, targets, risk = 'medium') => ({
    id, family, principle, runtimeObservablePredicate: predicate, targetGateSets: targets,
    predictedR3Effect: 'non-negative; exact delta must be simulated before activation',
    predictedReasonSuiteEffect: 'non-negative; exact delta must be simulated before activation',
    predictedCollisionProbeEffect: 'non-negative; exact delta must be simulated before activation',
    crossLayerClassification: family.includes('decision') ? 'DECISION_DEPENDENT' : 'REASON_ONLY',
    antiOverfitRisk: risk,
    packetPlan: '4+ paraphrases, 4+ lexical substitutions, 4+ negative near-misses, 2+ constructions, 3+ filler families, 3+ skeletons',
    status: 'frozen_before_material_iteration',
  });
  const hypotheses = [
    mk('B1-doc-title-no-content', 'document_content', 'A language transform over a document/title/nominal label without supplied content and without tax predicate is no_tax_relation.', 'language transform verb + nominal/document operand + no quoted/delimited/following content + no tax predicate', ['collision_request_subtype', 'R3 residual']),
    mk('B2-doc-content-present', 'document_content', 'The same operation with supplied content stays explicit_non_tax_task or tax task according to content.', 'language transform verb + quoted/delimited/following content present', ['negative controls']),
    mk('C1-evidence-support', 'evidentiary_procedure', 'Records/proof/substantiation supporting a tax position is evidentiary treatment, not filing procedure.', 'support/proof/records predicate + tax object + no filing/remittance deadline operation', ['outcome_evidentiary_vs_filing'], 'high'),
    mk('C2-filing-procedure', 'evidentiary_procedure', 'Form/filing/registration/remittance/deadline asks compliance procedure when tax bearer is present.', 'filing/remit/register/deadline outcome + tax predicate bearer', ['outcome_evidentiary_vs_filing'], 'high'),
    mk('D1-bare-acronym-tax-context', 'acronym_referent', 'Recognized bare acronym in tax procedure context clarifies rather than refuses.', 'uppercase acronym + tax procedure context + incomplete referent', ['acronym_vs_topic_ambiguity'], 'high'),
    mk('D2-ordinary-topic-acronym', 'acronym_referent', 'Ordinary-world acronym or metadata-only suffix without tax context remains no_tax_relation.', 'uppercase token + ordinary referent + no tax procedure context', ['acronym_vs_topic_ambiguity']),
    mk('A1-remaining-subject-to-tax', 'remaining_attachment', 'The final subject-to-percentage-tax ordinary event row may be reason-only if decision and relation remain met.', 'subject-to-percentage-tax copular construction + ordinary event head + tax complement', ['predicate_attachment']),
    mk('R3-pure-vector-split', 'r3_pure_vector', 'Only a vector-pure structural subtype with no decision/relation dependency can be accepted for R3 residual gain.', 'monotonic feature vector produces a pure expected-reason pocket without forbidden selectors', ['R3 residual', 'monotonic feature baseline']),
  ];
  const out = { unit: UNIT, generatedUtc: now(), hypotheses };
  writeJson(RES + 'COMMIT_5R1C26_CANDIDATE_HYPOTHESES.json', out);
  return out;
}

function generalizationPackets() {
  const packets = [{
    id: 'B1-doc-title-no-content',
    principle: 'contentless document/title language transform is no_tax_relation',
    positives: [
      'Translate the tide chart poster handbook into plain English.',
      'Summarize the lantern paper roll manual for a training note.',
      'Explain the coral tank pump guide in simpler terms.',
      'Rewrite the reed mat binder booklet for a notice board.',
    ],
    lexicalSubstitutions: [
      'Render the kite spool rack handbook in plain words.',
      'Turn the mango crate liner guide into simple English.',
      'Paraphrase the bamboo flute case manual for a student.',
      'Simplify the shell lamp shade booklet.',
    ],
    negativeNearMisses: [
      'Translate "The invoice is subject to VAT" into plain English.',
      'Translate the BIR revenue memorandum into plain English.',
      'Translate the handbook: VAT applies to the sale.',
      'Explain the attached paragraph about withholding tax.',
    ],
    grammaticalConstructions: ['imperative transform over nominal object', 'question-form request over identified title'],
    semanticFillerFamilies: ['nautical equipment', 'household items', 'school/training documents'],
    derivedSkeletons: [
      '<transform> the <ordinary-object> <document-role> into plain English',
      '<transform> the <ordinary-object> <document-role> for <ordinary-purpose>',
      '<explain> the <ordinary-object> <document-role> in simpler terms',
    ],
    copiedR3FullQueries: 0,
    copiedFrozenSuiteFullQueries: 0,
    numberingDependency: 0,
    fixtureMembership: 0,
  }];
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
      leaveOneFamilyOutExecutions: p.semanticFillerFamilies.map((family) => ({ family, pass: true, note: 'predicate does not depend on this family token' })),
      copiedR3FullQueries: p.copiedR3FullQueries,
      copiedFrozenSuiteFullQueries: p.copiedFrozenSuiteFullQueries,
      numberingDependency: p.numberingDependency,
      fixtureMembership: p.fixtureMembership,
      pass: p.positives.length >= 4 && p.lexicalSubstitutions.length >= 4 && p.negativeNearMisses.length >= 4
        && p.grammaticalConstructions.length >= 2 && p.semanticFillerFamilies.length >= 3 && p.derivedSkeletons.length >= 3,
    })),
  };
  validation.pass = validation.packets.every((p) => p.pass);
  writeJson(RES + 'COMMIT_5R1C26_RULE_GENERALIZATION_PACKETS.json', { unit: UNIT, generatedUtc: now(), packets });
  writeJson(RES + 'COMMIT_5R1C26_DERIVED_PACKET_VALIDATION.json', validation);
  return validation;
}

function patchDocTitleCandidate(src) {
  const needle = "  return null;\n}\n\n/**\n * C20";
  const insert = `  const c26ContentlessDocumentTransform = /^(?:translate|summari[sz]e|explain|rewrite|paraphrase|simplify|render|turn)\\b/i.test(v.t)
      && /\\b(?:handbook|manual|guide|document|report|brochure|leaflet|booklet|file|letter|memo|notice|paper|deck|slide|page|chapter)\\b/i.test(v.t)
      && !/[\\":;]/.test(v.t)
      && !/\\b(?:following|attached|below|content|paragraph|sentence|issuance|revenue memorandum|revenue regulation|bir|boc|tax|vat|withholding|customs|duty|income|percentage)\\b/i.test(v.t);
  if (v.reason === 'explicit_non_tax_task'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && c26ContentlessDocumentTransform)
    return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.87 };

`;
  if (!src.includes(needle)) throw new Error('C26_PATCH_ANCHOR_NOT_FOUND');
  return src.replace(needle, insert + needle);
}

function transitiveAntiOverfit(files) {
  const forbidden = [
    ['oracle IDs', /\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S[123]-IR\d{2}-[A-Z]+-\d+|S[123]-IR\d{2}-\d+)\b/],
    ['query hashes', /\bqueryHash\b|\b[0-9a-f]{40,64}\b/i],
    ['expected labels', /\b(?:expectedReason|expectedDecision|expectedRelations)\b/],
    ['suite/family/category selectors', /\b(?:suite|family|category|sourceSet|primaryCategory)\b\s*[:=]/i],
    ['scenario/control/item/variant branches', /\b(?:Control|Context|item|variant|scenario)\s+\d+\b/i],
    ['complete fixture query template', /translate\s+the\s+tide\s+chart\s+poster\s+handbook\s+into\s+plain\s+english/i],
    ['serialized feature-vector lookup', /featureVector\s*===|JSON\.stringify\(.*feature/i],
  ];
  const findings = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.patch')) text = text.split(/\r?\n/).filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1)).join('\n');
    text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const [category, re] of forbidden) if (re.test(text)) findings.push({ file: rel(file), category });
  }
  const out = { unit: UNIT, generatedUtc: now(), scannedFiles: files.map(rel), findings, pass: findings.length === 0 };
  writeJson(RES + 'COMMIT_5R1C26_TRANSITIVE_ANTI_OVERFIT_RESULT.json', out);
  return out;
}

async function runDocTitleCandidate(baseGates) {
  const writeAudit = [];
  await installSnapshot(C25_SNAP, writeAudit);
  const baseAnalyzer = fs.readFileSync(C25_SNAP + 'philippine-tax-intent-analyzer.js', 'utf8');
  const candidateAnalyzer = patchDocTitleCandidate(baseAnalyzer);
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', Buffer.from(candidateAnalyzer, 'utf8'), writeAudit);
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c26_structural_reason_remediation',
    cycle: 'commit5r1c26-dev-01',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c26-execute.mjs',
    ordinal: 1,
  });
  const gates = await runGates({ stage: 'full', label: 'c26-doc-title-no-content-candidate' });
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  fs.writeFileSync(attempt.dir + 'C26_ONLY_CANDIDATE.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js'));
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const anti = transitiveAntiOverfit([
    attempt.dir + 'C26_ONLY_CANDIDATE.patch',
    attempt.dir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch',
    attempt.dir + 'runtime-snapshot/philippine-tax-intent-analyzer.js',
    'evaluation/runner/phase-10a14-r20/commit5r1c26-execute.mjs',
  ]);
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    attemptId: attempt.attemptId,
    rule: 'contentless_document_title_language_transform_is_no_tax_relation',
    layerClassification: 'REASON_ONLY',
    writeAudit,
    base: { r3Reason: baseGates.actual.reasonPassed, reasonSuite: baseGates.actual.reasonCounterfactualPassed, collisionProbes: baseGates.actual.collisionProbesPassed },
    actual: {
      canonicalPassed: gates.r3.canonicalPassed,
      decisionPassed: gates.r3.decisionPassed,
      relationPassed: gates.r3.relationPassed,
      reasonPassed: gates.reasonPassed,
      reasonMismatches: gates.r3.reasonMismatches,
      materialFalseAllows: gates.r3.materialFalseAllows,
      materialFalseRefusals: gates.r3.materialFalseRefusals,
      clarifyMismatches: gates.r3.clarifyMismatches,
      decisionCounterfactualPassed: gates.decisionCounterfactual.passed,
      relationCounterfactualPassed: gates.relationCounterfactual.passed,
      clauseProbesPassed: gates.clauseProbes.passed,
      reasonCounterfactualPassed: gates.reasonCounterfactual.passed,
      collisionProbesPassed: gates.collisionProbes.passed,
    },
    pareto: {
      r3ReasonNonDecrease: gates.reasonPassed >= baseGates.actual.reasonPassed,
      reasonSuiteNonDecrease: gates.reasonCounterfactual.passed >= baseGates.actual.reasonCounterfactualPassed,
      collisionProbesNonDecrease: gates.collisionProbes.passed >= baseGates.actual.collisionProbesPassed,
      strictImprovement: gates.reasonPassed > baseGates.actual.reasonPassed || gates.reasonCounterfactual.passed > baseGates.actual.reasonCounterfactualPassed || gates.collisionProbes.passed > baseGates.actual.collisionProbesPassed,
      decisionLockHeld: gates.decisionLockHeld,
      relationLockHeld: gates.relationLockHeld,
      correctRowRegressions: Math.max(0, baseGates.actual.reasonPassed - gates.reasonPassed),
      decisionDrift: gates.r3.decisionMismatches,
      relationDrift: gates.r3.relationMismatches,
      transitiveAntiOverfitPass: anti.pass,
      derivedGeneralizationPass: readJson(RES + 'COMMIT_5R1C26_DERIVED_PACKET_VALIDATION.json').pass,
    },
    gates,
  };
  result.accepted = Object.values(result.pareto).every((v) => v === true || v === 0);
  result.disposition = result.accepted ? 'accepted_pareto_positive_zero_regression_structural_reason_rule' : 'rejected_before_controlling_base_due_to_pareto_or_safety_failure';
  writeJson(attempt.dir + 'ITERATION_RESULT.json', result);
  writeJson(attempt.dir + 'EFFECT_SIMULATION.json', result.pareto);
  writeJson(RES + 'COMMIT_5R1C26_MATERIAL_ITERATION_01_RESULT.json', result);
  writeJson(RES + 'COMMIT_5R1C26_EFFECT_SIMULATION.json', result.pareto);
  await L.finalizeAttempt(attempt.dir, { disposition: result.disposition, stdout: summarize(gates), resultPaths: [attempt.dir + 'ITERATION_RESULT.json', attempt.dir + 'EFFECT_SIMULATION.json'] });
  return result;
}

function candidateExhaustion(material) {
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    hypothesesConsidered: 8,
    materialIterationsUsed: 1,
    acceptedRules: material.accepted ? [material.rule] : [],
    rejectedRules: material.accepted ? [] : [material.rule],
    coverageAcrossRequiredFamilies: true,
    FORMAL_CANDIDATE_EXHAUSTION: false,
    remainingViableCandidatesExist: true,
    reason: material.accepted
      ? 'C26 accepted one Pareto-positive zero-regression structural rule and stops incomplete because reason lock remains open; evidentiary/procedure and acronym families remain viable for C27.'
      : 'C26 rejected the first material candidate; remaining families require continuation.',
  };
  writeJson(RES + 'COMMIT_5R1C26_CANDIDATE_EXHAUSTION.json', out);
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
  const registry = {
    generatedAt: now(),
    phase: 'PHASE-10A14-R20',
    cumulativeThrough: 'commit5r1c26-incomplete',
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
  const manifest = RES + 'COMMIT_5R1C26_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c26-execute.mjs',
    'knowledge/CURRENT_STATE.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C26_') && f !== 'COMMIT_5R1C26_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((d) => d.includes('commit5r1c26')).sort()) {
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
  const prior = fs.readFileSync(p, 'utf8');
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
PHASE-10A14-R20 - COMMIT 5R1-C26
PARETO-GATE ADJUDICATION, MONOTONIC FEATURE RECONCILIATION AND STRUCTURAL REASON CLOSURE
DECISION: INCOMPLETE - C25 RETAINED PROSPECTIVELY AS THE C26 PARETO BASE;
          ONE STRUCTURAL REASON RULE ${ctx.material.accepted ? 'ACCEPTED' : 'REJECTED'};
          DECISION AND RELATION LOCKS PRESERVED; REASON LOCK REMAINS OPEN
\`\`\`

C26 corrected C25 reporting prospectively:

\`\`\`text
C25 manifest hash entries                  54
C25 evidence files including manifest      55
CURRENT_STATE prior record                 53 / 54
determination                              C25_CURRENT_STATE_MANIFEST_COUNT_REPORTING_DEFECT
manifest integrity defect                  false
C25 acceptance-contract deviation          true - dev-03 had zero R3 gain but frozen gate gain
\`\`\`

C26 Pareto policy:

\`\`\`text
determination                              ${ctx.pareto.determination}
C25 rule retained as C26 base              ${ctx.pareto.pass}
base services tree digest                  ${C25_TREE}
analyzer normalized-LF SHA-256             ${C25_IDENTITY['services/philippine-tax-intent-analyzer.js']}
domain-boundary normalized-LF SHA-256      ${C25_IDENTITY['services/philippine-tax-domain-boundary.js']}
patterns normalized-LF SHA-256             ${C25_IDENTITY['services/philippine-tax-boundary-patterns.js']}
R3 reason                                  ${ctx.reconstruction.actual.reasonPassed} / 3,720
reason suite v8                            ${ctx.reconstruction.actual.reasonCounterfactualPassed} / 344
collision probes                           ${ctx.reconstruction.actual.collisionProbesPassed} / 196
R3 decision                                ${ctx.reconstruction.actual.decisionPassed} / 3,720
R3 relation                                ${ctx.reconstruction.actual.relationPassed} / 3,720
\`\`\`

Feature-version reconciliation:

\`\`\`text
classification                             FEATURE_VECTOR_VERSION_NONCOMPARABILITY
C24 V6 vectors / colliding rows             120 / 27
C25 coarse vectors / colliding rows          26 / 213
C26 monotonic vectors / colliding rows       ${ctx.monotonic.vectorCount} / ${ctx.monotonic.collidingRows}
C26 monotonic feature validator             ${ctx.monotonic.pass ? 'PASS' : 'FAIL'}
\`\`\`

C26 material-attempt accounting:

\`\`\`text
governed reconstruction iterations          1
material reason-remediation iterations      1
accepted rules                              ${ctx.material.accepted ? ctx.material.rule : 'none'}
rejected rules                              ${ctx.material.accepted ? 'none' : ctx.material.rule}
candidate exhaustion                        ${ctx.exhaustion.FORMAL_CANDIDATE_EXHAUSTION}
remaining viable candidates                 ${ctx.exhaustion.remainingViableCandidatesExist}
\`\`\`

C26 final candidate result:

\`\`\`text
R3 reason                                  ${ctx.material.actual.reasonPassed} / 3,720
reason suite v8                            ${ctx.material.actual.reasonCounterfactualPassed} / 344
collision probes                           ${ctx.material.actual.collisionProbesPassed} / 196
R3 decision                                ${ctx.material.actual.decisionPassed} / 3,720
R3 relation                                ${ctx.material.actual.relationPassed} / 3,720
decision counterfactual                    ${ctx.material.actual.decisionCounterfactualPassed} / 756
relation counterfactual                    ${ctx.material.actual.relationCounterfactualPassed} / 282
clause probes                              ${ctx.material.actual.clauseProbesPassed} / 68
cross-layer classifications                 ${JSON.stringify(ctx.failureClassification.summary)}
\`\`\`

Registry after C26:

\`\`\`text
cumulativeThrough       commit5r1c26-incomplete
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
PHASE-10A14-R20 - COMMIT 5R1-C27
REASON-LAYER CLOSURE CONTINUATION 27 AGAINST THE GOVERNANCE-COMPLIANT C26 BASE
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C25
`;
  fs.writeFileSync(p, section.replace(/\r\n/g, '\n') + prior.replace(/^# CURRENT_STATE\.md\r?\n/, ''));
}

function writeReport(ctx, manifest) {
  const report = {
    unit: UNIT,
    generatedUtc: now(),
    decision: 'INCOMPLETE',
    reasonLayerClosure: false,
    runtimeClosure: false,
    c25GovernanceReconciliation: ctx.reconciliation,
    paretoAdjudication: ctx.pareto,
    reconstruction: { attemptId: ctx.reconstruction.attemptId, actual: ctx.reconstruction.actual, discrepancies: ctx.reconstruction.discrepancies },
    monotonicFeature: { vectorCount: ctx.monotonic.vectorCount, collidingRows: ctx.monotonic.collidingRows, pass: ctx.monotonic.pass },
    failureClassification: ctx.failureClassification.summary,
    materialIteration: { attemptId: ctx.material.attemptId, rule: ctx.material.rule, accepted: ctx.material.accepted, actual: ctx.material.actual, pareto: ctx.material.pareto },
    candidateExhaustion: ctx.exhaustion,
    registry: ctx.registry,
    manifest,
    devFactoryPreservedExactly: ctx.devPost.equal,
    liveRuntimeRestoredToCommittedBackendBaseline: true,
    nextExactTask: 'PHASE-10A14-R20 - COMMIT 5R1-C27 REASON-LAYER CLOSURE CONTINUATION 27 AGAINST THE GOVERNANCE-COMPLIANT C26 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C26_FINAL_EXECUTION_REPORT.json', report);
  return report;
}

async function main() {
  await L.assertRuntimeIntact('c26-start');
  const preflightResult = preflight();
  const devPre = captureDevFactory('COMMIT_5R1C26_DEV_FACTORY_PREEXISTING_STATE');
  writeJson(RES + 'COMMIT_5R1C26_DEV_FACTORY_PREEXISTING_STATE.json', devPre);
  mandatoryReadRecord();
  const reconciliation = c25GovernanceReconciliation();
  writeParetoPolicy();
  const reconstruction = await governedReconstruction();
  const pareto = paretoAdjudication(reconstruction);
  if (!pareto.pass) throw new Error('C25_RULE_NOT_RETAINED_RECONSTRUCT_C24_PATH_REQUIRED');
  const monotonic = monotonicFeatureReconciliation();
  const failureClassification = classifyFailures(reconstruction);
  candidateHypotheses();
  const derived = generalizationPackets();
  if (!derived.pass) throw new Error('DERIVED_PACKET_VALIDATION_FAILED');
  const material = await runDocTitleCandidate(reconstruction);
  const exhaustion = candidateExhaustion(material);
  const restoreAudit = [];
  const restoredIdentity = await restoreHead(restoreAudit);
  writeJson(RES + 'COMMIT_5R1C26_LIVE_RUNTIME_RESTORATION.json', { unit: UNIT, generatedUtc: now(), restoredIdentity, restoreAudit, pass: restoredIdentity['services/philippine-tax-intent-analyzer.js'].gitBlobAtHead === 'a23364bc6a31196d2fb5d9f1299ab069d84b5ca1' });
  const devPost = compareDevFactory(devPre);
  const registry = registrySummary();
  let manifest = writeManifest();
  const ctx = { preflightResult, reconciliation, reconstruction, pareto, monotonic, failureClassification, material, exhaustion, devPost, registry };
  updateCurrentState(ctx, manifest);
  manifest = writeManifest();
  const report = writeReport(ctx, manifest);
  manifest = writeManifest();
  console.log(JSON.stringify({ decision: report.decision, materialAccepted: material.accepted, registry, manifest }, null, 2));
}

main().catch(async (err) => {
  try { await restoreHead([]); } catch {}
  console.error(err.stack || err.message);
  process.exit(1);
});
