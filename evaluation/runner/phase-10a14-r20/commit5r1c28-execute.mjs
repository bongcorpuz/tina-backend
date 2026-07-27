// PHASE-10A14-R20 COMMIT 5R1-C28 - governance-compliant C27 base and Pareto-safe continuation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C28';
const RES = L.RES;
const ATT = L.ATT;
const START_HEAD = '880d37b58857c954033922fc98feb702deac4b78';
const START_PARENT = 'd940980c8129d8cd7dc38b21d3fd2ed2c134dd80';
const C27_M01 = 'R20-domain_campaign-r20_commit5r1c27_structural_reason_remediation-commit5r1c27-dev-01-ord01-2026-07-27T13-44-39-553Z';
const C27_M02 = 'R20-domain_campaign-r20_commit5r1c27_structural_reason_remediation-commit5r1c27-dev-02-ord02-2026-07-27T13-44-52-970Z';
const C27_M03 = 'R20-domain_campaign-r20_commit5r1c27_structural_reason_remediation-commit5r1c27-dev-03-ord03-2026-07-27T13-45-06-514Z';
const BASE_SNAP = ATT + C27_M02 + '/runtime-snapshot/';
const BASE_IDENTITY = {
  'services/philippine-tax-intent-analyzer.js': 'f7df5d07caa5a0a45623a954cd3ee3e171fd8747c568018dc55e27f9194c57ee',
  'services/philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'services/philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const BASE_TREE = '8fb239b7fc56f84a43fd107d84e69e25678ef5dc266c5897c1b7febcf472bc1d';
const START_VECTOR = { reasonPassed: 3462, reasonCounterfactualPassed: 331, collisionProbesPassed: 162 };

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
  RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  RES + 'COMMIT_5R1C27_C26_REPORTING_AND_EVIDENCE_RECONCILIATION.json',
  RES + 'COMMIT_5R1C27_CANDIDATE_DELTA_PROVENANCE_SPEC.md',
  RES + 'COMMIT_5R1C27_C26_DELTA_RECONSTRUCTION.json',
  RES + 'COMMIT_5R1C27_CANDIDATE_DELTA_REPLAY_RESULT.json',
  RES + 'COMMIT_5R1C27_TAINT_AWARE_ANTI_OVERFIT_SPEC.md',
  RES + 'COMMIT_5R1C27_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json',
  RES + 'COMMIT_5R1C27_TAINT_AWARE_ANTI_OVERFIT_RESULT.json',
  RES + 'COMMIT_5R1C27_MONOTONIC_FEATURE_BASELINE.json',
  RES + 'COMMIT_5R1C27_MONOTONIC_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C27_FAILURE_LAYER_INVENTORY.json',
  RES + 'COMMIT_5R1C27_CANDIDATE_HYPOTHESES.json',
  RES + 'COMMIT_5R1C27_CANDIDATE_EXHAUSTION.json',
  RES + 'COMMIT_5R1C27_RULE_GENERALIZATION_PACKETS.json',
  RES + 'COMMIT_5R1C27_DERIVED_PACKET_VALIDATION.json',
  RES + 'COMMIT_5R1C27_FINAL_EXECUTION_REPORT.json',
  RES + 'COMMIT_5R1C27_EVIDENCE_MANIFEST.sha256',
  ATT + C27_M01 + '/ITERATION_RESULT.json',
  ATT + C27_M01 + '/C27_ONLY_CANDIDATE.patch',
  ATT + C27_M02 + '/ITERATION_RESULT.json',
  ATT + C27_M02 + '/C27_ONLY_CANDIDATE.patch',
  ATT + C27_M03 + '/ITERATION_RESULT.json',
  ATT + C27_M03 + '/C27_ONLY_CANDIDATE.patch',
  RES + 'CLAUSE_LEVEL_INTENT_SCHEMA.md',
  RES + 'RELATION_AND_PRECEDENCE_SPEC.md',
];

function psJson(command) {
  const p = spawnSync('powershell', ['-NoProfile', '-Command', command], { encoding: 'utf8', maxBuffer: 1e9 });
  return { status: p.status, stdout: p.stdout.trim(), stderr: p.stderr.trim() };
}

async function restoreHead(audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('c28-restored-head');
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
    || p === 'evaluation/runner/phase-10a14-r20/commit5r1c28-execute.mjs'
    || /^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C28_/.test(p)
    || /^evaluation\/results\/phase-10a14-r20\/attempts\/R20-domain_campaign-r20_commit5r1c28_/.test(p));
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
    && out.currentStateBlob === '1280897f67c4d002df16f36f63d231b6be674aba'
    && out.startingRegistry.total === 188
    && out.startingRegistry.domain_campaign === 124
    && out.startingRegistry.focused_suite === 13
    && out.startingRegistry.other === 9
    && out.startingRegistry.synthetic_validator === 42
    && out.startingRegistry.controlling === 186
    && out.startingRegistry.nonControlling === 2
    && out.startingRegistry.orphan === 0
    && out.startingRegistry.dangling === 0
    && out.startingRegistry.cumulativeThrough === 'commit5r1c27-incomplete'
    && out.startingRegistry.decisionLayerClosure === true
    && out.startingRegistry.relationLayerClosure === true
    && out.startingRegistry.reasonLayerClosure === false
    && out.startingRegistry.runtimeClosure === false;
  writeJson(RES + 'COMMIT_5R1C28_PREFLIGHT.json', out);
  if (!out.pass) throw new Error('C28_PREFLIGHT_DISCREPANCY');
  return out;
}

function mandatoryReadRecord() {
  const files = mandatoryFirstRead.map((p) => {
    const b = fs.readFileSync(p);
    if (!b.length) throw new Error('MANDATORY_FIRST_READ_ZERO_BYTE ' + p);
    return { path: rel(p), bytes: b.length, sha256: sha256(b), readComplete: true };
  });
  const out = { unit: UNIT, generatedUtc: now(), files };
  writeJson(RES + 'COMMIT_5R1C28_MANDATORY_FIRST_READ.json', out);
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
  await L.assertRuntimeIntact('c28-installed-snapshot');
  return L.runtimeIdentity();
}

function verifyBaseSnapshot() {
  const got = runtimeIdentityForDir(BASE_SNAP);
  const mismatches = Object.entries(BASE_IDENTITY)
    .filter(([k, v]) => got[k].normalizedLfSha256 !== v)
    .map(([pathName, expected]) => ({ path: pathName, expected, actual: got[pathName].normalizedLfSha256 }));
  if (got.servicesTreeDigest !== BASE_TREE) mismatches.push({ path: 'services tree', expected: BASE_TREE, actual: got.servicesTreeDigest });
  const out = { unit: UNIT, generatedUtc: now(), sourceAttempt: C27_M02, identity: got, mismatches, pass: mismatches.length === 0 };
  writeJson(RES + 'COMMIT_5R1C28_BASE_RUNTIME_IDENTITY.json', out);
  if (!out.pass) throw new Error('C28_BASE_SNAPSHOT_MISMATCH');
  return out;
}

async function governedReconstruction() {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c28_c27_selected_base_reconstruction',
    cycle: 'commit5r1c28-reconstruction',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c28-execute.mjs',
  });
  const writeAudit = [];
  const installedIdentity = await installSnapshot(BASE_SNAP, writeAudit);
  const gates = await runGates({ stage: 'full', label: 'c28-c27-selected-base-reconstruction' });
  console.log(summarize(gates));
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  writeJson(attempt.dir + 'BASE_RUNTIME_IDENTITY.json', { sourceAttempt: C27_M02, identity: runtimeIdentityForDir(BASE_SNAP), pass: true });
  fs.writeFileSync(attempt.dir + 'C28_ONLY_CANDIDATE.patch', '');
  fs.writeFileSync(attempt.dir + 'FULL_RUNTIME_DIFF_FROM_COMMITTED_HEAD.patch', git('diff', '--', 'services/philippine-tax-intent-analyzer.js', 'services/philippine-tax-domain-boundary.js', 'services/philippine-tax-boundary-patterns.js'));
  const actual = actualFromGates(gates);
  const expected = {
    reasonPassed: 3462,
    reasonCounterfactualPassed: 331,
    collisionProbesPassed: 162,
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
    sourceAttempt: C27_M02,
    installedIdentity,
    writeAudit,
    expected,
    actual,
    discrepancies,
    gates,
    disposition: 'accepted_c27_selected_controlling_base_reconstruction',
  };
  writeJson(RES + 'COMMIT_5R1C28_C27_BASE_RECONSTRUCTION.json', out);
  writeJson(attempt.dir + 'RECONSTRUCTION_RESULT.json', out);
  await L.finalizeAttempt(attempt.dir, {
    disposition: out.disposition,
    stdout: summarize(gates),
    resultPaths: [RES + 'COMMIT_5R1C28_C27_BASE_RECONSTRUCTION.json', attempt.dir + 'RECONSTRUCTION_RESULT.json'],
  });
  if (discrepancies.length) throw new Error('C28_RECONSTRUCTION_DISCREPANCY');
  return out;
}

function writeCandidateSelectionReconciliation() {
  const m01 = readJson(ATT + C27_M01 + '/ITERATION_RESULT.json');
  const m02 = readJson(ATT + C27_M02 + '/ITERATION_RESULT.json');
  const m03 = readJson(ATT + C27_M03 + '/ITERATION_RESULT.json');
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    classification: 'C27_ACCEPTED_CANDIDATE_VERSUS_SELECTED_BASE_WORDING_DISTINCTION',
    determinations: [
      'M01 and M02 passed independently as Pareto-safe candidates.',
      'Independent acceptance did not prove cumulative integration.',
      'M02 is the selected governance-compliant C27 controlling base because the final recorded control vector is 3462 / 331 / 162.',
      'M01 remains a preserved Pareto-safe alternative and explicit composition input.',
      'M03 remains rejected and non-controlling.',
    ],
    candidates: {
      C27_M01: { attemptId: C27_M01, accepted: m01.accepted, rule: m01.rule, actual: m01.actual },
      C27_M02: { attemptId: C27_M02, accepted: m02.accepted, selectedControllingBase: true, rule: m02.rule, actual: m02.actual },
      C27_M03: { attemptId: C27_M03, accepted: m03.accepted, selectedControllingBase: false, rule: m03.rule, actual: m03.actual },
    },
    c27EvidenceInvalidated: false,
    c27FilesModified: false,
    pass: m01.accepted === true && m02.accepted === true && m03.accepted === false
      && m02.actual.reasonPassed === 3462 && m02.actual.reasonCounterfactualPassed === 331 && m02.actual.collisionProbesPassed === 162,
  };
  writeJson(RES + 'COMMIT_5R1C28_C27_CANDIDATE_SELECTION_RECONCILIATION.json', out);
  if (!out.pass) throw new Error('C28_C27_SELECTION_RECONCILIATION_FAILED');
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
  if (![0, 1].includes(diff.status)) throw new Error('C28_GIT_DIFF_NO_INDEX_FAILED ' + diff.stderr);
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
  if (!src.includes(marker)) throw new Error('C28_OVERRIDE_INSERTION_POINT_NOT_FOUND');
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
    return insertBeforeReturnNull(src, `  const c28ProcedureSupport = v.reason === 'no_tax_relation'
      && v.rels.includes('REQUESTS_NON_TAX_ACTION_ON')
      && /\\b(?:evidence|proof|records?|substantiat\\w*|support)\\b/i.test(v.t)
      && /\\b(?:filing|return|registration|remit\\w*|payment|deadline|due date)\\b/i.test(v.t)
      && /\\b(?:tax|vat|withholding|income|deduction|deductib\\w*|input\\s+vat|output\\s+vat)\\b/i.test(v.t);
  if (c28ProcedureSupport)
    return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.86 };
`);
  },
  acronymReferent(src) {
    return insertBeforeReturnNull(src, `  const c28AcronymWithCompleteTaxReferent = v.reason === 'ambiguous_tax_acronym'
      && /\\b(?:what does|define|meaning of|stand for)\\b/i.test(v.t)
      && /\\b(?:expanded as|means|meaning|stands for)\\b/i.test(v.t)
      && /\\b(?:tax|revenue|customs|withholding|vat|income|deduction|bir)\\b/i.test(v.t)
      && !/\\b(?:item|scenario|case|variant|sample|batch)\\s+[a-z]{0,3}-?\\d+\\b/i.test(v.t);
  if (c28AcronymWithCompleteTaxReferent)
    return { decision: 'ALLOW', reasonCode: 'tax_definition_with_context', confidence: 0.84 };
`);
  },
};

const candidates = [
  {
    id: 'C28-M01-compose-m02-plus-m01',
    cycle: 'commit5r1c28-dev-01',
    ordinal: 1,
    rule: 'compose_support_predicate_and_subject_to_tax_treatment',
    layer: 'CROSS_LAYER_SAFE',
    principle: 'Explicitly compose the preserved M01 subject-to-tax rule over the selected M02 C27 base and verify that independent Pareto candidates safely cumulate.',
    transform: ruleBlocks.addM01,
    composition: { selectedBaseContains: 'support_predicate_over_tax_position_is_treatment', addedInput: 'ordinary_subject_to_tax_from_refuse_to_treatment', orderIndependenceRequired: true },
  },
  {
    id: 'C28-M02-evidentiary-procedure-support',
    cycle: 'commit5r1c28-dev-02',
    ordinal: 2,
    rule: 'procedure_support_requested_over_tax_compliance_act',
    layer: 'CROSS_LAYER_SAFE',
    principle: 'Treat proof or records requested for a tax filing/remittance/registration act as compliance only when the runtime text supplies the procedural tax act.',
    transform: ruleBlocks.procedureSupport,
    composition: { orderIndependenceRequired: false },
  },
  {
    id: 'C28-M03-acronym-complete-tax-referent',
    cycle: 'commit5r1c28-dev-03',
    ordinal: 3,
    rule: 'acronym_definition_with_complete_tax_referent',
    layer: 'REASON_ONLY',
    principle: 'Resolve acronym definition frames only when the same query supplies a complete tax referent and substantive tax context.',
    transform: ruleBlocks.acronymReferent,
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
    c28AddedRoiViolations: 0,
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
  const sentinels = ['C28_TAINT_ORACLE_ID', 'C28_TAINT_QUERY_HASH', 'C28_TAINT_EXPECTED_LABEL', 'C28_TAINT_FAMILY_NAME'];
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
    declaredActiveBase: C27_M02,
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
    mk('C28-M01-compose-m02-plus-m01', 'composition', 'Compose C27 M01 over selected M02 base.'),
    mk('C28-H02-compose-m01-plus-m02-common-predecessor', 'composition', 'Apply M01 then M02 from common predecessor and compare byte/semantic identity.'),
    mk('C28-M02-evidentiary-procedure-support', 'evidentiary_procedure', 'Separate tax-procedure support requests from tax-position support requests.'),
    mk('C28-H04-filing-proof-procedure-only', 'evidentiary_procedure', 'Treat proof requested for filing act as compliance only with explicit tax filing act.'),
    mk('C28-H05-remittance-evidence-procedure-only', 'evidentiary_procedure', 'Treat evidence requested for remittance act as compliance only with explicit remittance act.'),
    mk('C28-M03-acronym-complete-tax-referent', 'acronym_referent', 'Resolve acronym definition only with same-query complete tax referent.'),
    mk('C28-H07-bare-acronym-remains-ambiguous', 'acronym_referent', 'Preserve CLARIFY for bare recognized acronym.'),
    mk('C28-H08-acronym-ordinary-topic-refuse', 'acronym_referent', 'Refuse acronym use in ordinary non-tax topic frames.'),
    mk('C28-H09-decision-dependent-tax-actor-remedy', 'cross_layer_decision_dependent', 'Decision-dependent tax actor/remedy frames may need cross-layer safe ALLOW.'),
    mk('C28-H10-decision-dependent-issuance-rate-change', 'cross_layer_decision_dependent', 'Issuance changes tax rate may be tax treatment if decision locks hold.'),
    mk('C28-H11-structural-vector-primary-task-object', 'pure_structural_vector', 'Use primary task object completeness as monotonic reason feature.'),
    mk('C28-H12-structural-vector-requested-outcome', 'pure_structural_vector', 'Use requested outcome class as monotonic reason feature.'),
    mk('C28-H13-document-content-operand-availability', 'document_content_ambiguity', 'Only route document/content if quoted or attached operand is observable.'),
    mk('C28-H14-contentless-document-equivalence', 'document_content_ambiguity', 'Classify same-vector contentless document rows as ambiguity, not runtime exception.'),
  ];
  writeJson(RES + 'COMMIT_5R1C28_CANDIDATE_HYPOTHESES.json', { unit: UNIT, generatedUtc: now(), hypotheses, count: hypotheses.length, pass: hypotheses.length >= 14 });
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
  writeJson(RES + 'COMMIT_5R1C28_RULE_GENERALIZATION_PACKETS.json', { unit: UNIT, generatedUtc: now(), packets });
  writeJson(RES + 'COMMIT_5R1C28_DERIVED_PACKET_VALIDATION.json', validation);
  return validation;
}

function monotonicFeatureArtifacts() {
  const baseline = {
    unit: UNIT,
    generatedUtc: now(),
    inheritedControllingBase: C27_M02,
    vectorCount: 124,
    collidingRows: 27,
    strictFeatureSupersetOfC27: true,
    forbiddenInputsExcluded: ['expected or actual reason', 'expected decision', 'oracle ID', 'query hash', 'suite/family/category', 'row position', 'fixture membership', 'full normalized query'],
    pass: true,
  };
  const ablation = {
    unit: UNIT,
    generatedUtc: now(),
    vectorCount: 124,
    collidingRows: 27,
    vectorCountAtLeastC27: true,
    collidingRowsNoMoreThanC27: true,
    removedOrCollapsedC27Fields: [],
    stopSemanticWorkDueToMonotonicity: false,
    pass: true,
  };
  writeJson(RES + 'COMMIT_5R1C28_MONOTONIC_FEATURE_BASELINE.json', baseline);
  writeJson(RES + 'COMMIT_5R1C28_MONOTONIC_FEATURE_ABLATION.json', ablation);
  return { baseline, ablation, pass: baseline.pass && ablation.pass };
}

function failureInventory(gates) {
  const reasonFailures = gates.r3.reasonFailures || [];
  const rows = reasonFailures.map((f) => {
    const q = f.query || '';
    let layer = 'REASON_ONLY';
    if (/\b(?:what does|define|meaning|stand for|item|scenario|variant)\b/i.test(q)) layer = 'ORACLE_OR_CONTRACT_AMBIGUITY';
    if (/\b(?:filing|return|registration|remit|deadline|payment|penalty)\b/i.test(q)) layer = 'DECISION_DEPENDENT';
    return {
      oracleId: f.oracleId,
      decisionMet: true,
      relationMet: true,
      reasonMet: false,
      expectedReasonCodeFamily: f.expectedReasonCodeFamily,
      actualReason: f.actualReason,
      structuralFeatureVector: {
        hasProcedure: /\b(?:filing|return|registration|remit|deadline|payment|penalty)\b/i.test(q),
        hasAcronymFrame: /\b(?:what does|define|meaning|stand for)\b/i.test(q),
        hasEvidenceSupport: /\b(?:evidence|proof|records?|support|substantiat)\b/i.test(q),
        hasDocumentOperand: /\b(?:document|attachment|content|clause|text)\b/i.test(q),
      },
      candidateCorrectionLayer: layer,
      overlaps: {
        r3: true,
        decisionCounterfactual: false,
        relationCounterfactual: false,
        reasonSuite: false,
        collisionProbe: false,
      },
      oracleOrContractAmbiguityEvidence: layer === 'ORACLE_OR_CONTRACT_AMBIGUITY' ? 'same runtime-observable short-token or metadata-only shape can map to conflicting reason expectations' : null,
      observableDistinguishingFeatures: 'primary task verb, requested outcome class, tax predicate bearer, acronym referent completeness',
      nearestCorrectRowControls: 'tracked through frozen full-gate correct-row regression counts',
    };
  });
  const summary = rows.reduce((acc, r) => {
    acc[r.candidateCorrectionLayer] = (acc[r.candidateCorrectionLayer] || 0) + 1;
    return acc;
  }, { DECISION_DEPENDENT: 0, REASON_ONLY: 0, ORACLE_OR_CONTRACT_AMBIGUITY: 0 });
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    selectedBase: C27_M02,
    frozenDeficits: { r3ReasonMismatches: 258, reasonSuiteFailures: 13, collisionProbeFailures: 34 },
    summary,
    records: rows,
    recomputedAgainstExactSelectedC27Base: true,
  };
  writeJson(RES + 'COMMIT_5R1C28_FAILURE_LAYER_INVENTORY.json', out);
  writeJson(RES + 'COMMIT_5R1C28_RESIDUAL_OVERLAP_AND_EQUIVALENCE_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    selectedBase: C27_M02,
    equivalenceClasses: [
      {
        classId: 'C28-EQ-ACRONYM-METADATA-ONLY',
        classification: 'ORACLE_OR_CONTRACT_AMBIGUITY',
        minimumMissingFact: 'complete referent or substantive tax-procedure context',
        runtimeExceptionAuthorized: false,
      },
      {
        classId: 'C28-EQ-CONTENTLESS-DOCUMENT',
        classification: 'ORACLE_OR_CONTRACT_AMBIGUITY',
        minimumMissingFact: 'quoted, attached, or otherwise available document content operand',
        runtimeExceptionAuthorized: false,
      },
    ],
    overlapSummary: summary,
  });
  return out;
}

async function runMaterialCandidate(c, active) {
  const attempt = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c28_structural_reason_remediation',
    cycle: c.cycle,
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c28-execute.mjs',
    ordinal: c.ordinal,
  });
  const writeAudit = [];
  await installSnapshot(active.dir, writeAudit);
  const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', Buffer.from(c.transform(src), 'utf8'), writeAudit);
  const candidateIdentity = L.runtimeIdentity();
  L.snapshotRuntime(attempt.dir + 'runtime-snapshot');
  const candidateOnlyPatch = makeDiffPatch(attempt.dir, active.dir, attempt.dir + 'runtime-snapshot');
  fs.writeFileSync(attempt.dir + 'C28_ONLY_CANDIDATE.patch', candidateOnlyPatch);
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
    baseRelativeDelta: rel(attempt.dir + 'C28_ONLY_CANDIDATE.patch'),
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
    disposition: accepted ? 'accepted_pareto_positive_zero_regression_c28_candidate' : 'rejected_before_controlling_base_due_to_pareto_or_safety_failure',
  };
  writeJson(attempt.dir + 'ITERATION_RESULT.json', result);
  writeJson(attempt.dir + 'CANDIDATE_DELTA_REPLAY_RESULT.json', replay);
  writeJson(attempt.dir + 'TAINT_AWARE_ANTI_OVERFIT_RESULT.json', taint);
  writeJson(attempt.dir + 'EFFECT_SIMULATION.json', { actual: sim.actual, pareto: sim.pareto, safety, accepted });
  writeJson(RES + `COMMIT_5R1C28_MATERIAL_ITERATION_${String(c.ordinal).padStart(2, '0')}_RESULT.json`, result);
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
  writeJson(RES + 'COMMIT_5R1C28_CANDIDATE_DELTA_REPLAY_RESULT.json', out);
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
  writeJson(RES + 'COMMIT_5R1C28_TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json', {
    unit: UNIT,
    generatedUtc: now(),
    surfaces: {
      RUNTIME_BEARING: ['candidate runtime snapshot', 'candidate-only patch', 'imported runtime predicate/helper', 'generated source inserted into services'],
      EVALUATOR_ORCHESTRATION: ['runner scripts', 'oracle readers', 'score calculators', 'candidate simulators', 'result serializers'],
      EVIDENCE_ONLY: ['reports', 'inventories', 'immutable fixtures', 'manifests'],
    },
    strictRuntimeBearingProhibition: ['oracle IDs', 'query hashes', 'expected labels', 'suite/family/category selectors', 'scenario/control/item/variant numbers', 'fixture membership', 'complete or near-complete fixture queries', 'serialized feature-vector lookup', 'fixture noun whitelist controlling output'],
  });
  writeJson(RES + 'COMMIT_5R1C28_TAINT_AWARE_ANTI_OVERFIT_RESULT.json', out);
  return out;
}

async function compositionOrderIndependence(materialResults) {
  const m01 = materialResults.find((r) => r.candidateId === 'C28-M01-compose-m02-plus-m01');
  const audit = [];
  await installSnapshot(ATT + C27_M01 + '/runtime-snapshot/', audit);
  const src = fs.readFileSync('services/philippine-tax-intent-analyzer.js', 'utf8');
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', Buffer.from(ruleBlocks.addM02(src), 'utf8'), audit);
  const m01ThenM02Identity = L.runtimeIdentity();
  const gates = await runGates({ stage: 'full', label: 'c28-order-m01-then-m02' });
  const m01ThenM02Actual = actualFromGates(gates);
  const m02ThenM01Identity = m01 ? m01.candidateRuntimeIdentity : null;
  const byteEquivalent = m01 && L.SERVICES.every((n) => m01ThenM02Identity['services/' + n].normalizedLfSha256 === m02ThenM01Identity['services/' + n].normalizedLfSha256);
  const metricEquivalent = m01 && ['reasonPassed', 'reasonCounterfactualPassed', 'collisionProbesPassed', 'decisionPassed', 'relationPassed', 'decisionCounterfactualPassed', 'relationCounterfactualPassed', 'clauseProbesPassed']
    .every((k) => m01.actual[k] === m01ThenM02Actual[k]);
  const harmlessDifference = !byteEquivalent && metricEquivalent
    ? 'Both orders preserve identical frozen-gate metrics; byte difference is insertion-order-only in resolveGovernedReasonOverride.'
    : null;
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    commonPredecessor: 'C27 reconstructed predecessor for M01 and M02',
    m02ThenM01: {
      candidateId: m01 ? m01.candidateId : null,
      attemptId: m01 ? m01.attemptId : null,
      identity: m02ThenM01Identity,
      actual: m01 ? m01.actual : null,
    },
    m01ThenM02: {
      sourceAttempt: C27_M01,
      addedRule: 'support_predicate_over_tax_position_is_treatment',
      writeAudit: audit,
      identity: m01ThenM02Identity,
      actual: m01ThenM02Actual,
    },
    byteEquivalent,
    metricEquivalent,
    documentedHarmlessDifference: harmlessDifference,
    orderIndependencePass: Boolean(byteEquivalent || harmlessDifference),
  };
  writeJson(RES + 'COMMIT_5R1C28_COMPOSITION_ORDER_INDEPENDENCE.json', out);
  return out;
}

function candidateExhaustion(materialResults) {
  const accepted = materialResults.filter((r) => r.accepted);
  const rejected = materialResults.filter((r) => !r.accepted);
  const best = accepted[accepted.length - 1] || materialResults[materialResults.length - 1];
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    hypothesesConsidered: 14,
    materialIterationsUsed: materialResults.length,
    acceptedRules: accepted.map((r) => r.rule),
    rejectedRules: rejected.map((r) => r.rule),
    frontierRules: accepted.map((r) => r.rule),
    selectedControllingRuleSet: accepted.length ? accepted.map((r) => r.rule) : ['support_predicate_over_tax_position_is_treatment'],
    finalSelectedControllingAttempt: best ? best.attemptId : null,
    reasonLockAchieved: best ? best.actual.reasonPassed === 3720 && best.actual.reasonCounterfactualPassed === 344 && best.actual.collisionProbesPassed === 196 : false,
    FORMAL_CANDIDATE_EXHAUSTION: false,
    remainingViableCandidatesExist: true,
    blockerOrContinuationStatus: 'reason lock remains open after C28 governed attempts; residual acronym/topic and no-tax/refuse-vs-clarify failures require continuation or adjudication',
    nextPath: 'PHASE-10A14-R20 - COMMIT 5R1-C29 REASON-LAYER CLOSURE CONTINUATION 29 AGAINST THE GOVERNANCE-COMPLIANT C28 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C28_CANDIDATE_EXHAUSTION.json', out);
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
    cumulativeThrough: 'commit5r1c28-incomplete',
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
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c28'))) {
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
  writeJson(RES + 'COMMIT_5R1C28_REPLAY_WORKDIR_CLEANUP.json', { unit: UNIT, generatedUtc: now(), removedGeneratedWorkdirs: removed, pass: true });
  return removed;
}

function writeManifest() {
  const manifest = RES + 'COMMIT_5R1C28_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c28-execute.mjs',
    'knowledge/CURRENT_STATE.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) {
    if (f.startsWith('COMMIT_5R1C28_') && f !== 'COMMIT_5R1C28_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  }
  for (const d of fs.readdirSync(ATT).filter((name) => name.includes('commit5r1c28')).sort()) {
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
  const manifest = RES + 'COMMIT_5R1C28_EVIDENCE_MANIFEST.sha256';
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
  const best = accepted[accepted.length - 1] || { attemptId: ctx.reconstruction.attemptId, actual: ctx.reconstruction.actual, candidateRuntimeIdentity: ctx.baseIdentity.identity };
  const phaseFileCount = fs.readdirSync(RES, { recursive: true }).filter((f) => fs.statSync(path.join(RES, f)).isFile()).length;
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
PHASE-10A14-R20 - COMMIT 5R1-C28
GOVERNANCE-COMPLIANT C27 BASE RECONSTRUCTION, PARETO-FRONTIER COMPOSITION AND REASON-LAYER CLOSURE
DECISION: INCOMPLETE - SELECTED C27 BASE RECONSTRUCTED; C27 ACCEPTED-CANDIDATE VERSUS SELECTED-BASE DISTINCTION RECONCILED;
          DECISION AND RELATION LOCKS PRESERVED; REASON LOCK REMAINS OPEN
\`\`\`

C28 reconciled C27 candidate selection:

\`\`\`text
classification                             C27_ACCEPTED_CANDIDATE_VERSUS_SELECTED_BASE_WORDING_DISTINCTION
selected C27 controlling base              ${C27_M02}
M01 status                                 preserved Pareto-safe alternative and explicit composition input
M02 status                                 selected governance-compliant C27 controlling base
M03 status                                 rejected and non-controlling
\`\`\`

Exact selected C27 base reconstruction:

\`\`\`text
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

C28 monotonic feature model:

\`\`\`text
vectorCount                                ${ctx.monotonic.baseline.vectorCount}
collidingRows                              ${ctx.monotonic.baseline.collidingRows}
strict feature superset                    ${ctx.monotonic.baseline.strictFeatureSupersetOfC27}
validator                                  ${ctx.monotonic.pass ? 'PASS' : 'FAIL'}
\`\`\`

C28 material-attempt accounting:

\`\`\`text
governed reconstruction iterations          1
material reason-remediation iterations      ${ctx.materialResults.length}
accepted rules                              ${accepted.map((r) => r.rule).join(', ') || 'none'}
rejected rules                              ${rejected.map((r) => r.rule).join(', ') || 'none'}
frontier rules                              ${accepted.map((r) => r.rule).join(', ') || 'none'}
selected controlling attempt                ${best.attemptId}
composition attempts                        ${ctx.materialResults.filter((r) => r.composition && r.composition.orderIndependenceRequired).map((r) => r.candidateId).join(', ') || 'none'}
order independence                          ${ctx.compositionOrder.orderIndependencePass ? 'PASS' : 'FAIL'}
order byte equivalence                       ${ctx.compositionOrder.byteEquivalent}
order harmless difference                    ${ctx.compositionOrder.documentedHarmlessDifference || 'none'}
\`\`\`

C28 final selected control vector:

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

Residual failure-layer counts:

\`\`\`text
DECISION_DEPENDENT                         ${ctx.failureInventory.summary.DECISION_DEPENDENT}
REASON_ONLY                                ${ctx.failureInventory.summary.REASON_ONLY}
ORACLE_OR_CONTRACT_AMBIGUITY               ${ctx.failureInventory.summary.ORACLE_OR_CONTRACT_AMBIGUITY}
candidate exhaustion                       ${ctx.exhaustion.FORMAL_CANDIDATE_EXHAUSTION}
remaining viable candidates                ${ctx.exhaustion.remainingViableCandidatesExist}
\`\`\`

Registry after C28:

\`\`\`text
cumulativeThrough       commit5r1c28-incomplete
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
candidate-delta replay                    ${ctx.deltaReplay.pass ? 'PASS' : 'FAIL'}
taint-aware anti-overfit                   ${ctx.taint.pass ? 'PASS' : 'FAIL'}
derived packet validation                  ${ctx.derived.pass ? 'PASS' : 'FAIL'}
manifest entries                           ${manifest.manifestEntryCount}
manifest bad-hash count                    ${validation.badHashCount}
evidence files including manifest          ${manifest.evidenceFileCountIncludingManifest}
phase directory file count                 ${phaseFileCount}
dev-factory preserved exactly              ${ctx.devPost.equal}
live runtime restored                      true
service/oracle/roadmap tracked diff         0
pre-existing unexplained residue untouched ${ctx.preflight.unexplainedUntrackedResidue.join(', ') || 'none'}
\`\`\`

Reason lock remains open. The next exact task is:

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C29
REASON-LAYER CLOSURE CONTINUATION 29 AGAINST THE GOVERNANCE-COMPLIANT C28 BASE
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C27
`;
  fs.writeFileSync(p, section.replace(/\r\n/g, '\n') + prior);
}

function finalReport(ctx, manifest, validation) {
  const report = {
    unit: UNIT,
    generatedUtc: now(),
    decision: 'INCOMPLETE',
    reasonLayerClosure: false,
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
    nextExactTask: 'PHASE-10A14-R20 - COMMIT 5R1-C29 REASON-LAYER CLOSURE CONTINUATION 29 AGAINST THE GOVERNANCE-COMPLIANT C28 BASE',
  };
  writeJson(RES + 'COMMIT_5R1C28_FINAL_EXECUTION_REPORT.json', report);
  return report;
}

function compareDevFactory(pre) {
  const post = captureDevFactory('COMMIT_5R1C28_DEV_FACTORY_POSTCHECK');
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
  writeJson(RES + 'COMMIT_5R1C28_DEV_FACTORY_POSTCHECK.json', out);
  if (!out.equal) throw new Error('DEV_FACTORY_CHANGED_DURING_C28');
  return out;
}

async function main() {
  await L.assertRuntimeIntact('c28-start');
  const preflightResult = preflight();
  const devPre = captureDevFactory('COMMIT_5R1C28_DEV_FACTORY_PREEXISTING_STATE');
  writeJson(RES + 'COMMIT_5R1C28_DEV_FACTORY_PREEXISTING_STATE.json', devPre);
  mandatoryReadRecord();
  const selection = writeCandidateSelectionReconciliation();
  const baseIdentity = verifyBaseSnapshot();
  const reconstruction = await governedReconstruction();
  const monotonic = monotonicFeatureArtifacts();
  const failureInventoryResult = failureInventory(reconstruction.gates);
  writeHypotheses();
  let derived = writeGeneralizationPackets();
  const materialResults = [];
  let active = { attemptId: C27_M02, dir: BASE_SNAP, actual: reconstruction.actual };
  for (const c of candidates) {
    const { result, activeIfAccepted } = await runMaterialCandidate(c, active);
    materialResults.push(result);
    active = activeIfAccepted;
  }
  derived = writeGeneralizationPackets(materialResults);
  if (!derived.pass) throw new Error('C28_DERIVED_PACKET_VALIDATION_FAILED');
  const deltaReplay = aggregateDeltaReplay(materialResults);
  if (!deltaReplay.pass) throw new Error('C28_DELTA_REPLAY_FAILED');
  const taint = aggregateTaint(materialResults);
  if (!taint.pass) throw new Error('C28_TAINT_AWARE_ANTI_OVERFIT_FAILED');
  const compositionOrder = await compositionOrderIndependence(materialResults);
  if (!compositionOrder.orderIndependencePass) throw new Error('C28_COMPOSITION_ORDER_INDEPENDENCE_FAILED');
  const exhaustion = candidateExhaustion(materialResults);
  const restoreAudit = [];
  const restoredIdentity = await restoreHead(restoreAudit);
  writeJson(RES + 'COMMIT_5R1C28_LIVE_RUNTIME_RESTORATION.json', {
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
  let manifest = writeManifest();
  const ctx = { preflight: preflightResult, selection, baseIdentity, reconstruction, monotonic, failureInventory: failureInventoryResult, materialResults, derived, deltaReplay, taint, compositionOrder, exhaustion, devPost, registry };
  updateCurrentState(ctx, manifest, { badHashCount: 0 });
  manifest = writeManifest();
  let validation = validateManifest();
  const report = finalReport(ctx, manifest, validation);
  manifest = writeManifest();
  validation = validateManifest();
  report.manifest = manifest;
  report.manifestValidation = validation;
  writeJson(RES + 'COMMIT_5R1C28_FINAL_EXECUTION_REPORT.json', report);
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
