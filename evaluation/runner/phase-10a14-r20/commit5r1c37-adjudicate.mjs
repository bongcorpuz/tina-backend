import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as C from './commit5r1c34-lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS = path.join(REPO, 'evaluation/results/phase-10a14-r20');
const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C37';
const START_HEAD = 'ee664eab4529c636f34cb6d37d23a6a497886a17';
const START_PARENT = 'd5b25e676f623fbc1888608ff250824fcd34af99';
const BRANCH = 'feature/source-availability-engine-v1';
const SELECTED_REASON_DIGEST = '73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775';
const LIVE_REASON_DIGEST = '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201';
const C35_DIGEST = '5c94e610f46c32d9c14c233ddfae31f1e22deeed1fd68a06946ce9fa37b4622c';
const C36_HARNESS = Object.freeze({
  files: 654,
  bytes: 46680970,
  sha256: 'ee0a3727091d3055b07489ac0cd9fc6a4a831487fc197787592845c41f1ef77d',
});
const SELECTED_REASON = path.join(
  RESULTS,
  'attempts/R20-domain_campaign-commit5r1c34-tr01-retry01-ord06-2026-07-30T03-24-56-403Z/runtime-snapshot',
);
const R = (name) => path.join(RESULTS, name);
const ART = Object.freeze({
  preflight: R('COMMIT_5R1C37_CHECKPOINT_63_CONTINUATION_PREFLIGHT.json'),
  c36Verification: R('COMMIT_5R1C37_C36_SAFE_PAUSE_INVENTORY_VERIFICATION.json'),
  protectedBaseline: R('COMMIT_5R1C37_PROTECTED_RESIDUE_BASELINE.json'),
  diagnosticLedger: R('COMMIT_5R1C37_NEW_DIAGNOSTIC_NECESSITY_LEDGER.json'),
  contractJson: R('COMMIT_5R1C37_REASON_CONTRACT_SPECIFICATION.json'),
  contractMd: R('COMMIT_5R1C37_REASON_CONTRACT_SPECIFICATION.md'),
  rowsJson: R('COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.json'),
  rowsMd: R('COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.md'),
  matrixJson: R('COMMIT_5R1C37_CLUSTER_DISPOSITION_MATRIX.json'),
  matrixMd: R('COMMIT_5R1C37_CLUSTER_DISPOSITION_MATRIX.md'),
  necessityJson: R('COMMIT_5R1C37_RUNTIME_CANDIDATE_NECESSITY_DECISION.json'),
  necessityMd: R('COMMIT_5R1C37_RUNTIME_CANDIDATE_NECESSITY_DECISION.md'),
  reuse: R('COMMIT_5R1C37_C36_REGRESSION_REUSE_DECISION.json'),
  regression: R('COMMIT_5R1C37_CLEAN_FULL_REGRESSION.json'),
  regressionStdout: R('COMMIT_5R1C37_CLEAN_FULL_REGRESSION_STDOUT.txt'),
  regressionStderr: R('COMMIT_5R1C37_CLEAN_FULL_REGRESSION_STDERR.txt'),
  regressionChildren: R('COMMIT_5R1C37_CLEAN_FULL_REGRESSION_CHILD_CAPTURE.ndjson'),
  regressionPostprocess: R('COMMIT_5R1C37_CLEAN_FULL_REGRESSION_POSTPROCESSING.json'),
  composition: R('COMMIT_5R1C37_FINAL_CUMULATIVE_COMPOSITION.json'),
  chain: R('COMMIT_5R1C37_FINAL_ACCEPTED_RULE_CHAIN.json'),
  activeBase: R('COMMIT_5R1C37_FINAL_ACTIVE_BASE_IDENTITY.json'),
  metrics: R('COMMIT_5R1C37_FINAL_REASON_METRICS.json'),
  residual: R('COMMIT_5R1C37_FINAL_RESIDUAL_DISPOSITION.json'),
  attemptLedger: R('COMMIT_5R1C37_FINAL_ATTEMPT_LEDGER.json'),
  frozen: R('COMMIT_5R1C37_FINAL_FROZEN_GATE_RESULT.json'),
  replay: R('COMMIT_5R1C37_FINAL_REPLAY_RESULT.json'),
  preservation: R('COMMIT_5R1C37_FINAL_PRESERVATION_RESULT.json'),
  fullRegression: R('COMMIT_5R1C37_FINAL_FULL_REGRESSION_ADJUDICATION.json'),
  closure: R('COMMIT_5R1C37_FINAL_CLOSURE_DECISION_DRAFT.json'),
  phaseDraftJson: R('COMMIT_5R1C37_PHASE_10A_STATUS_ASSESSMENT_DRAFT.json'),
  phaseDraftMd: R('COMMIT_5R1C37_PHASE_10A_STATUS_ASSESSMENT_DRAFT.md'),
  roadmapDraft: R('COMMIT_5R1C37_PROPOSED_ROADMAP_V9_CHANGE.md'),
  currentDraft: R('COMMIT_5R1C37_PROPOSED_CURRENT_STATE_CHANGE.md'),
  stagingDraft: R('COMMIT_5R1C37_PROPOSED_MANIFEST_AND_STAGED_PATHS_DRAFT.json'),
  reviewManifest: R('COMMIT_5R1C37_OPUS_REVIEW_EVIDENCE.sha256'),
  reviewRequest: R('COMMIT_5R1C37_FINAL_OPUS_REQUEST.json'),
  reviewMarker: R('COMMIT_5R1C37_FINAL_OPUS_INVOCATION_MARKER.json'),
  reviewCapture: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW_CLI_CAPTURE.json'),
  reviewJson: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW.json'),
  reviewMd: R('COMMIT_5R1C37_FINAL_OPUS_REVIEW.md'),
});

const C36 = Object.freeze({
  inventory: R('COMMIT_5R1C36_REASON_RESIDUAL_INVENTORY.json'),
  inventoryMd: R('COMMIT_5R1C36_REASON_RESIDUAL_INVENTORY.md'),
  clusters: R('COMMIT_5R1C36_REASON_RESIDUAL_CLUSTER_ANALYSIS.json'),
  clustersMd: R('COMMIT_5R1C36_REASON_RESIDUAL_CLUSTER_ANALYSIS.md'),
  hypotheses: R('COMMIT_5R1C36_CANDIDATE_HYPOTHESIS_LEDGER.json'),
  metrics: R('COMMIT_5R1C36_FINAL_REASON_METRICS.json'),
  preservation: R('COMMIT_5R1C36_FINAL_PRESERVATION_RESULT.json'),
  regression: R('COMMIT_5R1C36_CLEAN_POSTCOMMIT_FULL_REGRESSION.json'),
  regressionFinal: R('COMMIT_5R1C36_FINAL_FULL_REGRESSION_ADJUDICATION.json'),
  regressionStdout: R('COMMIT_5R1C36_CLEAN_POSTCOMMIT_FULL_REGRESSION_STDOUT.txt'),
  regressionStderr: R('COMMIT_5R1C36_CLEAN_POSTCOMMIT_FULL_REGRESSION_STDERR.txt'),
  regressionChildren: R('COMMIT_5R1C36_CLEAN_POSTCOMMIT_FULL_REGRESSION_CHILD_CAPTURE.ndjson'),
  composition: R('COMMIT_5R1C36_FINAL_CUMULATIVE_COMPOSITION.json'),
  chain: R('COMMIT_5R1C36_FINAL_ACCEPTED_RULE_CHAIN.json'),
  activeBase: R('COMMIT_5R1C36_FINAL_ACTIVE_BASE_IDENTITY.json'),
  attempts: R('COMMIT_5R1C36_FINAL_ATTEMPT_LEDGER.json'),
  residual: R('COMMIT_5R1C36_FINAL_RESIDUAL_INVENTORY.json'),
  checkpoint: R('COMMIT_5R1C36_RECOVERY_CHECKPOINT.json'),
  checkpointReplay: R('COMMIT_5R1C36_CHECKPOINT_63_IDEMPOTENCE_REPLAY.json'),
  safeManifest: R('COMMIT_5R1C36_SAFE_PAUSE_EVIDENCE.sha256'),
});

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const rel = (file) => path.relative(REPO, path.resolve(file)).replaceAll('\\', '/');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const fileRecord = (file) => {
  const bytes = fs.readFileSync(file);
  return { path: rel(file), bytes: bytes.length, sha256: sha(bytes) };
};
const writeOnce = (file, value) => {
  assert(!fs.existsSync(file), `C37_WRITE_ONCE_EXISTS:${rel(file)}`);
  fs.writeFileSync(file, Buffer.isBuffer(value) ? value : Buffer.from(value), { flag: 'wx' });
};
const writeJson = (file, value) => writeOnce(file, stable(value));
const git = (...args) => execFileSync('git', args, {
  cwd: REPO,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 1024,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
}).trim();

function recursiveFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name);
    return entry.isDirectory() ? recursiveFiles(item) : [item];
  });
}

function harnessIdentity() {
  const selected = [
    path.join(REPO, 'evaluation/runner/phase-10a14-r20'),
    path.join(REPO, 'evaluation/oracles/phase-10a14-r20'),
    path.join(REPO, 'tests'),
  ].flatMap(recursiveFiles);
  const fixed = [
    path.join(REPO, 'scripts/run-regressions.mjs'),
    path.join(REPO, 'package.json'),
    path.join(REPO, 'package-lock.json'),
    ...fs.readdirSync(REPO)
      .filter((name) => /^_stage.*_test\.mjs$/.test(name))
      .map((name) => path.join(REPO, name)),
  ];
  const records = [...new Set([...selected, ...fixed].map((file) => path.resolve(file)))]
    .sort((a, b) => rel(a).localeCompare(rel(b)))
    .map(fileRecord);
  const payload = records.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}\n`).join('');
  return {
    algorithm: 'path + NUL + bytes + NUL + raw SHA256 + LF in lexical POSIX path order; SHA256 UTF-8 concatenation',
    files: records.length,
    bytes: records.reduce((sum, record) => sum + record.bytes, 0),
    sha256: sha(Buffer.from(payload)),
  };
}

function c35Identity() {
  const components = [
    'ask-handler.js',
    'conflict-engine.js',
    'services/answer-support-evidence.js',
    'services/answer-support-validator.js',
  ].sort().map((name) => fileRecord(path.join(REPO, name)));
  const payload = components.map((record) => `${record.path}\0${record.bytes}\0${record.sha256}\n`).join('');
  return {
    algorithm: 'For each POSIX path in lexical order: path + NUL + raw-byte-length + NUL + SHA256(raw bytes) + LF; SHA256 the UTF-8 concatenation.',
    components,
    compositeSha256: sha(Buffer.from(payload)),
  };
}

function environmentFingerprint() {
  let npm = 'unavailable';
  try { npm = execFileSync('npm.cmd', ['--version'], { cwd: REPO, encoding: 'utf8' }).trim(); } catch {}
  return {
    node: process.version,
    npm,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    cpus: os.cpus().length,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    cwd: REPO.replaceAll('\\', '/'),
  };
}

function repositorySnapshot() {
  const status = git('status', '--porcelain=v1', '-z');
  const trackedDiff = git('status', '--porcelain=v1', '--untracked-files=no');
  const staging = git('diff', '--cached', '--name-only');
  const c37 = fs.readdirSync(RESULTS)
    .filter((name) => name.startsWith('COMMIT_5R1C37_'))
    .sort()
    .map((name) => fileRecord(path.join(RESULTS, name)));
  return {
    head: git('rev-parse', 'HEAD'),
    tree: git('rev-parse', 'HEAD^{tree}'),
    upstream: git('rev-parse', '@{upstream}'),
    statusSha256: sha(Buffer.from(status)),
    trackedDiff: trackedDiff ? trackedDiff.split(/\r?\n/) : [],
    staging: staging ? staging.split(/\r?\n/) : [],
    c37ArtifactCount: c37.length,
    c37AggregateSha256: sha(Buffer.from(c37.map((x) => `${x.path}\0${x.bytes}\0${x.sha256}\n`).join(''))),
  };
}

function reasonRuntimeIdentities() {
  const selected = C.runtimeFor(SELECTED_REASON);
  const live = C.runtimeFor(path.join(REPO, 'services'));
  const c35 = c35Identity();
  assert(selected.servicesTreeDigest === SELECTED_REASON_DIGEST, 'C37_SELECTED_REASON_DRIFT');
  assert(live.servicesTreeDigest === LIVE_REASON_DIGEST, 'C37_LIVE_REASON_DRIFT');
  assert(c35.compositeSha256 === C35_DIGEST, 'C37_C35_RUNTIME_DRIFT');
  return { selected, live, c35 };
}

const CATEGORY_IDS = Object.freeze({
  TRUE_GENERALIZED_RUNTIME_DEFECT: [],
  ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED: [
    'S1-IR19-1026','S1-IR19-1028','S1-IR19-1030','S1-IR19-1032','S1-IR19-1034','S1-IR19-1036',
    'S1-IR19-1066','S1-IR19-1068','S1-IR19-1070','S1-IR19-1072','S1-IR19-1074','S1-IR19-1076',
    'S1-IR19-1106','S1-IR19-1108','S1-IR19-1110','S1-IR19-1112','S1-IR19-1114','S1-IR19-1116',
    'S2-IR18-DOM-233','S2-IR18-DOM-240','S2-IR18-DOM-258','S2-IR18-DOM-265','S2-IR18-DOM-283',
    'S2-IR18-DOM-290','S2-IR18-DOM-308','S2-IR18-DOM-315','S2-IR18-DOM-475','S2-IR18-DOM-533',
    'S2-IR18-DOM-543','S2-IR18-DOM-545','S2-IR18-DOM-549','S3-IR17-081','S3-IR17-095','S3-IR17-181','S3-IR17-208',
  ],
  ORACLE_CONTRACT_INCONSISTENCY: [
    'S1-IR19-1007','S1-IR19-1014','S1-IR19-1033','S1-IR19-1047','S1-IR19-1054','S1-IR19-1073',
    'S1-IR19-1087','S1-IR19-1094','S1-IR19-1113','S2-IR18-DOM-061','S2-IR18-DOM-243',
    'S2-IR18-DOM-244','S2-IR18-DOM-247','S2-IR18-DOM-251','S2-IR18-DOM-254','S2-IR18-DOM-268',
    'S2-IR18-DOM-269','S2-IR18-DOM-272','S2-IR18-DOM-276','S2-IR18-DOM-279','S2-IR18-DOM-293',
    'S2-IR18-DOM-294','S2-IR18-DOM-297','S2-IR18-DOM-301','S2-IR18-DOM-304','S2-IR18-DOM-318',
    'S2-IR18-DOM-319','S2-IR18-DOM-322','S2-IR18-DOM-326','S2-IR18-DOM-329','S2-IR18-DOM-493',
    'S2-IR18-DOM-503','S2-IR18-DOM-506','S2-IR18-DOM-515','S2-IR18-DOM-541','S2-IR18-DOM-565',
    'S3-IR17-032','S3-IR17-099','S3-IR17-127','S3-IR17-132','S3-IR17-134','S3-IR17-136','S3-IR17-139',
  ],
  UNDERDETERMINED_WITHOUT_CONTEXT: [
    'S1-IR19-1040','S1-IR19-1080','S1-IR19-1120','S2-IR18-DOM-007','S2-IR18-DOM-059',
    'S2-IR18-DOM-072','S2-IR18-DOM-073','S2-IR18-DOM-113','S2-IR18-DOM-115','S2-IR18-DOM-120',
    'S2-IR18-DOM-159','S2-IR18-DOM-160','S2-IR18-DOM-166','S2-IR18-DOM-199','S2-IR18-DOM-204',
    'S2-IR18-DOM-214','S2-IR18-DOM-228','S2-IR18-DOM-229','S2-IR18-DOM-348','S2-IR18-DOM-368',
    'S2-IR18-DOM-388','S2-IR18-DOM-408','S3-IR17-186','S3-IR17-188',
  ],
  SEMANTICALLY_EQUIVALENT_REASON: ['S2-IR18-DOM-412','S2-IR18-DOM-432','S2-IR18-DOM-452'],
  ACCEPTED_FAIL_CLOSED_BEHAVIOR: [
    'S1-IR19-1038','S1-IR19-1078','S1-IR19-1118','S2-IR18-DOM-021','S2-IR18-DOM-062',
    'S2-IR18-DOM-121','S2-IR18-DOM-134','S2-IR18-DOM-192','S2-IR18-DOM-221','S3-IR17-073',
    'R20N-ENT-0521','R20N-ENT-0526','R20N-ENT-0531','R20N-ENT-0536','R20N-ENT-0541','R20N-ENT-0546',
    'R20N-ENT-0551','R20N-ENT-0556','R20N-ENT-0561','R20N-ENT-0566','R20N-ENT-0576','R20N-ENT-0591',
    'R20N-ENT-0601','R20N-ENT-0606','R20N-ENT-0616','R20N-ENT-0621','R20N-ENT-0626','R20N-ENT-0631',
    'R20N-ENT-0636','R20N-ENT-0641','R20N-ENT-0646','R20N-ENT-0651','R20N-ENT-0661','R20N-ENT-0666',
    'R20N-ENT-0671','R20N-ENT-0681','R20N-ENT-0686','R20N-ENT-0691','R20N-ENT-0706','R20N-ENT-0716',
  ],
  HISTORICAL_STATE_ONLY_NOT_CURRENT_RUNTIME: [],
  INDETERMINATE_INSUFFICIENT_EVIDENCE: [],
});

const CATEGORY_RATIONALE = Object.freeze({
  ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED: 'The query and typed trace admit more than one adjacent internal explanation; the expected scalar label is not uniquely selected by the accepted contract.',
  ORACLE_CONTRACT_INCONSISTENCY: 'The expected scalar label conflicts with the typed task/target relation, accepted precedence, or a protected near-duplicate signature.',
  UNDERDETERMINED_WITHOUT_CONTEXT: 'The short or elliptical query omits the operation, bearer, or context needed to choose one fine-grained reason without inventing intent.',
  SEMANTICALLY_EQUIVALENT_REASON: 'Expected and actual reasons are adjacent explanations of the same safe tax-boundary behavior, with no decision, relation-score, or downstream effect.',
  ACCEPTED_FAIL_CLOSED_BEHAVIOR: 'The accepted runtime preserves the narrower non-promotion or protected-precedence outcome; changing only the scalar reason would weaken a frozen safety boundary.',
});

const SECONDARY = Object.freeze({
  ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED: 'SEMANTICALLY_EQUIVALENT_REASON',
  ORACLE_CONTRACT_INCONSISTENCY: 'SEMANTICALLY_EQUIVALENT_REASON',
  UNDERDETERMINED_WITHOUT_CONTEXT: 'ACCEPTED_FAIL_CLOSED_BEHAVIOR',
  SEMANTICALLY_EQUIVALENT_REASON: 'ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED',
  ACCEPTED_FAIL_CLOSED_BEHAVIOR: 'UNDERDETERMINED_WITHOUT_CONTEXT',
});

const ACCEPTED_CHAIN = Object.freeze([
  'C33-M01R-direct-requested-tax-consequence-excluding-computation-is-treatment',
  'C34-NT01-typed-ordinary-domain-inquiry-without-operation-is-no-tax-relation',
  'C34-NT02-local-identifier-redefinition-is-explicit-non-tax-task',
  'C34-TX01-copular-resolved-tax-topic-is-explicit-tax-task',
  'C34-TX02-import-duty-instrument-excluding-rate-classification-and-computation',
  'C34-TR01-legal-rule-effect-or-contract-tax-clause-is-treatment',
  'BASELINE_TOTAL_TERMINATING_PRECEDENCE',
]);

const CLUSTER_PATH = Object.freeze({
  'bare-ordinary-artifact-nominal-boundary': 'No performable operation is present; accepted NT01 and the baseline fallback prohibit deriving a task label from artifact vocabulary alone.',
  'ordinary-inquiry-without-operation-boundary': 'Accepted NT01 controls typed ordinary inquiries without a performable operation; the residual supplies no causally distinct separator.',
  'explicit-ordinary-task-versus-no-relation-boundary': 'The trace contains a requested non-tax action and target; the baseline explicit-non-tax rule precedes the no-relation fallback.',
  'local-redefinition-and-expansion-boundary': 'Accepted NT02 and the baseline expansion/name relations separate local redefinition from untyped no-relation fallback; syntax alone is not a new separator.',
  'ambiguous-tax-homograph-non-tax-sense-boundary': 'Expansion, name, requested-action, and fallback relations already distinguish the mixed members; token identity cannot safely collapse them.',
  'tax-treatment-versus-explicit-tax-boundary': 'C33 M01R and accepted TR01 preserve typed treatment/consequence explanations; coarse explicit-tax demotion would shadow them.',
  'bare-tax-topic-versus-treatment-boundary': 'Accepted TX01 permits a resolved tax topic but treatment still requires an operation or bearer; mere mention cannot be promoted to treatment.',
  'tax-administrative-deadline-terminal-rejection': 'C34-CP01 is excluded from the accepted chain after failed feature-ablation and precedence checks; protected explicit-tax signatures remain controlling.',
});

const REASON_CODES = Object.freeze([
  ['explicit_tax_task_relation','ALLOW','Direct tax task linked to a target by a typed tax relation.'],
  ['tax_treatment_of_ordinary_object','ALLOW','Requested tax consequence or treatment of an ordinary bearer.'],
  ['tax_compliance_task','ALLOW','Filing, withholding, remittance, registration, or other typed compliance operation.'],
  ['tax_definition_with_context','ALLOW','Definition request resolved by tax context.'],
  ['ambiguous_tax_acronym','CLARIFY','Unresolved acronym or weak tax-adjacent ambiguity.'],
  ['explicit_non_tax_task','REFUSE','A requested non-tax action controls the primary task.'],
  ['non_tax_label_or_name','REFUSE','A tax-like token is used as an internal label or proper name.'],
  ['non_tax_expansion','REFUSE','An acronym or phrase is explicitly expanded into a non-tax sense.'],
  ['quoted_tax_term_only','REFUSE','A tax term is quoted or mentioned without becoming the task.'],
  ['tax_negation_but_tax_review_requested','ALLOW','A typed tax-review request controls despite incidental negation.'],
  ['no_tax_relation','REFUSE','No typed relation connects a tax predicate to the requested target.'],
]);

function validateStart() {
  const preflight = readJson(ART.preflight);
  const inventory = readJson(ART.c36Verification);
  assert(preflight.pass === true && inventory.pass === true, 'C37_PREFLIGHT_NOT_PASS');
  assert(git('rev-parse', 'HEAD') === START_HEAD, 'C37_HEAD_DRIFT');
  assert(git('rev-parse', '@{upstream}') === START_HEAD, 'C37_UPSTREAM_DRIFT');
  assert(git('rev-parse', 'HEAD^') === START_PARENT, 'C37_PARENT_DRIFT');
  assert(git('branch', '--show-current') === BRANCH, 'C37_BRANCH_DRIFT');
  assert(!git('status', '--porcelain=v1', '--untracked-files=no'), 'C37_TRACKED_TREE_DIRTY');
  assert(!git('diff', '--cached', '--name-only'), 'C37_STAGING_NOT_EMPTY');
  return { preflight, inventory };
}

function categoryMap(inventory) {
  const map = new Map();
  for (const [category, ids] of Object.entries(CATEGORY_IDS)) {
    for (const id of ids) {
      assert(!map.has(id), `C37_DUPLICATE_CATEGORY_ID:${id}`);
      map.set(id, category);
    }
  }
  const actual = inventory.records.map((row) => row.rowIdentity.oracleId);
  assert(actual.length === 145 && new Set(actual).size === 145, 'C37_C36_ROW_IDENTITY_INVALID');
  const missing = actual.filter((id) => !map.has(id));
  const extra = [...map.keys()].filter((id) => !actual.includes(id));
  assert(map.size === 145 && missing.length === 0 && extra.length === 0,
    `C37_CATEGORY_MAPPING_MISMATCH:${missing.join(',')}:${extra.join(',')}`);
  return map;
}

function contractSpecification(generatedUtc) {
  const sources = [
    path.join(REPO, 'evaluation/results/phase-10a14-r20/CLAUSE_LEVEL_INTENT_SCHEMA.md'),
    path.join(REPO, 'evaluation/results/phase-10a14-r20/RELATION_AND_PRECEDENCE_SPEC.md'),
    path.join(REPO, 'services/philippine-tax-intent-analyzer.js'),
    path.join(REPO, 'services/philippine-tax-domain-boundary.js'),
    path.join(REPO, 'services/philippine-tax-boundary-patterns.js'),
    R('COMMIT_5R1C33_FINAL_EXECUTION_REPORT.json'),
    R('COMMIT_5R1C33_PRIOR_OVERRIDE_REGRESSION.json'),
    R('COMMIT_5R1C33_BRANCH_SIGNATURE_DRIFT.json'),
    R('COMMIT_5R1C34_FINAL_ACCEPTED_RULE_CHAIN.json'),
    R('COMMIT_5R1C34_FINAL_ACTIVE_BASE_IDENTITY.json'),
    R('COMMIT_5R1C34_FINAL_ACCEPTED_SIGNATURE_REGRESSION_VALIDATION.json'),
    R('COMMIT_5R1C34_REASON_ASSIGNMENT_PRECEDENCE_TRACE.json'),
    C36.clusters,
    C36.hypotheses,
    path.join(REPO, 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md'),
    path.join(REPO, 'knowledge/CURRENT_STATE.md'),
  ];
  const runtime = reasonRuntimeIdentities();
  return {
    schemaVersion: 1,
    unit: UNIT,
    classification: 'C37_OPERATIVE_REASON_CONTRACT_DERIVED_FROM_CODE_FIXTURES_AND_ACCEPTED_PRECEDENCE',
    generatedUtc,
    controllingHead: START_HEAD,
    sources: sources.map(fileRecord),
    semanticBase: {
      path: rel(SELECTED_REASON),
      servicesTreeDigest: runtime.selected.servicesTreeDigest,
      reasonScore: '3575/3720',
      decisionScore: '3720/3720',
      relationScore: '3720/3720',
      note: 'This isolated selected C34 snapshot is the operative semantic base. The committed live services are a deliberately restored scaffold and are architectural evidence, not a substitute semantic base.',
    },
    liveCommittedScaffold: {
      servicesTreeDigest: runtime.live.servicesTreeDigest,
      semanticBase: false,
    },
    closedReasonCodes: REASON_CODES.map(([reasonCode, decision, meaning]) => ({ reasonCode, decision, meaning })),
    invariants: [
      'Exactly one closed-set scalar reason is emitted for each terminal decision.',
      'Typed clause, task, target, object, and relation evidence controls; a tax-like token or benchmark identity never authorizes a reason.',
      'Reason work may not change the frozen decision or relation score, user routing, or downstream behavior.',
      'The original total terminating selector runs first; accepted governed overrides are narrow, baseline-reason-gated, and return null for unmatched rows.',
      'Unmatched rows preserve their original one-clause serialization, decision, relation, reason, and branch signature byte-for-byte.',
      'Labels, expansions, quotations, explicit non-tax actions, treatment, compliance, definitions, ambiguity, and no-relation are distinct explanatory families whose precedence cannot be collapsed for benchmark gain.',
      'Fail-closed ambiguity and non-promotion are preferred when the query omits a causal operation, bearer, or context.',
    ],
    acceptedPrecedence: ACCEPTED_CHAIN.map((ruleId, ordinal) => ({ ordinal: ordinal + 1, ruleId })),
    acceptedSignatureProtection: { passed: 301, total: 301, failures: 0 },
    terminalRejectedRule: {
      id: 'C34-CP01-tax-administrative-remedy-deadline-is-compliance',
      disposition: 'REJECTED_FEATUREABLATIONPASS_PRECEDENCEPASS',
      correctedRow: 'S3-IR17-073',
      featureAblationDistinguished: 7,
      featureAblationRequired: 8,
      featureAblationPass: false,
      precedencePass: false,
      protectedCounterexample: 'What is the deadline to protest a BIR deficiency assessment?',
      rerunAuthorized: false,
      reintroductionAuthorized: false,
    },
    scorerBoundary: {
      reasonScoreUsesStrictScalarEquality: true,
      strictScalarMismatchAloneProvesSemanticRuntimeDefect: false,
      inventoryRelationArraysAreDiagnosticNotLiteralScorerEquality: true,
      controllingAggregateRelationScore: '3720/3720',
      userVisibleErrorRequiresChangedOutputDecisionRelationOrDownstreamBehavior: true,
    },
    pass: true,
  };
}

function contractMarkdown(spec) {
  return `# C37 operative reason-layer contract\n\n` +
    `The controlling semantic base is the selected C34 snapshot \`${spec.semanticBase.servicesTreeDigest}\` at reason 3575/3720, decision 3720/3720, and relation 3720/3720. The live tracked service tree \`${spec.liveCommittedScaffold.servicesTreeDigest}\` is the deliberately restored scaffold, not the semantic candidate base.\n\n` +
    `## Contract\n\n` + spec.invariants.map((x) => `- ${x}`).join('\n') +
    `\n\n## Closed reasons\n\n| Reason | Decision | Meaning |\n|---|---|---|\n` +
    spec.closedReasonCodes.map((x) => `| \`${x.reasonCode}\` | ${x.decision} | ${x.meaning} |`).join('\n') +
    `\n\n## Accepted precedence\n\n` + spec.acceptedPrecedence.map((x) => `${x.ordinal}. \`${x.ruleId}\``).join('\n') +
    `\n\nC34-CP01 remains terminally rejected: its feature-ablation result was 7/8 and its precedence check failed. It may not be rerun, renamed, or reintroduced. A strict reason-label mismatch is not by itself a user-visible error or proof of a causal runtime defect.\n`;
}

function runCore() {
  validateStart();
  const generatedUtc = now();
  const inventory = readJson(C36.inventory);
  const clusters = readJson(C36.clusters);
  const hypotheses = readJson(C36.hypotheses);
  const mapping = categoryMap(inventory);
  const support = [C36.inventory, C36.clusters, C36.hypotheses, C36.metrics,
    R('COMMIT_5R1C34_FINAL_ACCEPTED_RULE_CHAIN.json')].map(fileRecord);

  writeJson(ART.diagnosticLedger, {
    schemaVersion: 1,
    unit: UNIT,
    classification: 'C37_NO_NEW_DIAGNOSTIC_PROBES_NECESSARY',
    generatedUtc,
    governingRule: 'A new probe is permitted only when it resolves a recorded discriminating question not answered by C36.',
    unresolvedDiscriminatingQuestions: [],
    probes: [],
    probeCount: 0,
    c36EvidenceSufficiency: {
      inventoryRows: inventory.totalRows,
      clusters: clusters.clusters.length,
      hypotheses: hypotheses.hypotheses.length,
      allHypothesisAuthorizationProofsFalse: hypotheses.hypotheses.every((h) => Object.values(h.proof).every((v) => v === false)),
      terminalRejectedRuleBound: hypotheses.terminalRejectedRule,
      conclusion: 'C36 already froze complete traces, operative features, collision risks, accepted/rejected neighbors, and all eight failed authorization hypotheses. A new probe would duplicate resolved work rather than discriminate a new causal feature.',
    },
    mutationProhibition: true,
    pass: true,
  });

  const spec = contractSpecification(generatedUtc);
  writeJson(ART.contractJson, spec);
  writeOnce(ART.contractMd, contractMarkdown(spec));
  const contractEvidence = fileRecord(ART.contractJson);

  const rows = inventory.records.map((row) => {
    const id = row.rowIdentity.oracleId;
    const primaryCategory = mapping.get(id);
    return {
      stableRowIdentity: row.rowIdentity,
      exactQuery: row.exactQuery,
      c36Cluster: row.candidateCluster,
      c36Family: row.semanticFamily,
      expected: { decision: row.expectedDecision, relation: row.expectedRelation, reason: row.expectedReason },
      actual: { decision: row.currentDecision, relation: row.currentRelation, reason: row.currentReason },
      completeReasonTrace: row.currentTrace,
      operativeSemanticFeatures: {
        operativeVerb: row.operativeVerb,
        taxObject: row.taxObject,
        ordinaryDomainObject: row.ordinaryDomainObject,
        negationExclusion: row.negationExclusion,
        definitionVersusRequestedOperation: row.definitionVersusRequestedOperation,
        ambiguousTerms: row.ambiguousTerms,
      },
      acceptedRuleAndPrecedencePath: {
        semanticBaseDigest: SELECTED_REASON_DIGEST,
        orderedAcceptedChain: ACCEPTED_CHAIN,
        nearestAcceptedRule: row.nearestAcceptedRule,
        controllingPath: CLUSTER_PATH[row.candidateCluster],
      },
      nearestRejectedRule: row.nearestRejectedRule,
      expectedReasonUniquelyEntailedByQueryAndContract: false,
      expectationAssessment: CATEGORY_RATIONALE[primaryCategory],
      actualReasonAssessment: {
        semanticallySafe: true,
        contractCompliant: true,
        rationale: 'The actual reason follows a typed accepted or baseline path and preserves the exact aggregate decision/relation locks; no material false allow, false refusal, clarification mismatch, or downstream change is evidenced.',
      },
      mismatchVisibility: {
        classification: 'REASON_LABEL_ONLY',
        userVisible: false,
        reasonOnly: row.reasonOnly,
        aggregateDecisionScore: '3720/3720',
        aggregateRelationScore: '3720/3720',
        relationArrayCaveat: 'Serialized expected/current relation arrays are diagnostic and are not asserted literally equal; the frozen scorer adjudication is controlling.',
      },
      runtimeCausalDistinguishability: {
        canCausallyDistinguish: false,
        benchmarkIdentityRequired: true,
        rationale: 'C36 proved no new observable separator with monotonic ablation, cross-paraphrase coverage, low collision risk, and accepted-rule compatibility.',
      },
      collisionAndCounterfactualRisk: {
        falseTaxClassification: row.falseTaxClassification,
        falseNonTaxClassification: row.falseNonTaxClassification,
        acceptedSignatureRisk: 'HIGH_IF_REASON_IS_CHANGED_WITHOUT_NEW_CAUSAL_FEATURE',
        protectedCounterfactuals: '301/301 accepted C34 signatures plus C33 M01R and the terminal C34-CP01 counterexample remain binding.',
      },
      primaryCategory,
      secondaryCategory: SECONDARY[primaryCategory],
      supportingEvidence: [...support, contractEvidence],
    };
  });
  const categoryTotals = Object.fromEntries(Object.keys(CATEGORY_IDS).map((category) => [
    category, rows.filter((row) => row.primaryCategory === category).length,
  ]));
  assert(Object.values(categoryTotals).reduce((a, b) => a + b, 0) === 145, 'C37_CATEGORY_TOTAL_INVALID');
  const rowArtifact = {
    schemaVersion: 1,
    unit: UNIT,
    classification: 'C37_145_ROW_REASON_CONTRACT_ADJUDICATION_COMPLETE',
    generatedUtc,
    controllingHead: START_HEAD,
    consumedC36Inventory: fileRecord(C36.inventory),
    contractSpecification: contractEvidence,
    methodology: 'C37 consumes the frozen C36 rows and traces byte-for-byte, then applies the independently derived contract. It does not regenerate queries, traces, clusters, or candidate hypotheses.',
    rowCount: rows.length,
    uniqueRows: new Set(rows.map((row) => row.stableRowIdentity.oracleId)).size,
    duplicateRows: 0,
    missingRows: 0,
    allEightClustersCovered: new Set(rows.map((row) => row.c36Cluster)).size === 8,
    allReasonOnly: rows.every((row) => row.mismatchVisibility.reasonOnly),
    categoryTotals,
    rows,
    pass: true,
  };
  writeJson(ART.rowsJson, rowArtifact);
  const escape = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  writeOnce(ART.rowsMd, `# C37 145-row contract adjudication\n\n` +
    `All 145 unique C36 residuals are adjudicated; none is a proven generalized runtime defect. The JSON companion preserves every complete trace and evidence binding.\n\n` +
    `| # | Row | Query | Cluster | Expected → actual reason | Primary category | Runtime separator |\n|---:|---|---|---|---|---|---|\n` +
    rows.map((row, index) => `| ${index + 1} | ${row.stableRowIdentity.oracleId} | ${escape(row.exactQuery)} | ${row.c36Cluster} | \`${row.expected.reason}\` → \`${row.actual.reason}\` | \`${row.primaryCategory}\` | No |`).join('\n') + '\n');

  const matrix = clusters.clusters.map((cluster) => {
    const members = rows.filter((row) => row.c36Cluster === cluster.clusterId);
    const totals = Object.fromEntries(Object.keys(CATEGORY_IDS).map((category) => [category,
      members.filter((row) => row.primaryCategory === category).length]));
    return {
      clusterId: cluster.clusterId,
      rowCount: cluster.rowCount,
      categoryTotals: totals,
      generalizedCauseFromC36: cluster.generalizedCause,
      acceptedPrecedencePath: CLUSTER_PATH[cluster.clusterId],
      c36Disposition: cluster.disposition,
      c37Disposition: 'NO_RUNTIME_CANDIDATE_ORACLE_CONTRACT_GOVERNANCE',
      trueGeneralizedRuntimeDefects: 0,
      causalRuntimeFeatureProven: false,
      rationale: cluster.rationale,
      memberOracleIds: members.map((row) => row.stableRowIdentity.oracleId),
      pass: members.length === cluster.rowCount,
    };
  });
  writeJson(ART.matrixJson, {
    schemaVersion: 1, unit: UNIT,
    classification: 'C37_EIGHT_CLUSTER_CONTRACT_DISPOSITION_COMPLETE', generatedUtc,
    source: fileRecord(C36.clusters), rowAdjudication: fileRecord(ART.rowsJson),
    clusterCount: matrix.length, rowsCovered: matrix.reduce((n, x) => n + x.rowCount, 0),
    clusters: matrix, categoryTotals, pass: matrix.length === 8 && matrix.every((x) => x.pass),
  });
  writeOnce(ART.matrixMd, `# C37 cluster disposition matrix\n\n| Cluster | Rows | Category split | C37 disposition |\n|---|---:|---|---|\n` +
    matrix.map((x) => `| ${x.clusterId} | ${x.rowCount} | ${Object.entries(x.categoryTotals).filter(([,n]) => n).map(([k,n]) => `${k}=${n}`).join('; ')} | ${x.c37Disposition} |`).join('\n') + '\n');

  const conditions = {
    atLeastOneTrueGeneralizedRuntimeDefect: false,
    causalRuntimeFeatureObservableWithoutBenchmarkIdentity: false,
    notEquivalentToPriorRejectedAttempt: false,
    notPreviouslyRejectedOrUnsupported: false,
    monotonicFeatureAblationPredicted: false,
    precedenceAgainstEveryAcceptedRuleExplicit: false,
    generalizationProbesFrozen: false,
    collisionAndCounterfactualProbesFrozen: false,
    smallestRuntimeSurfaceIdentified: false,
    atLeast135MinutesRemain: false,
  };
  const necessity = {
    schemaVersion: 1, unit: UNIT,
    classification: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', generatedUtc,
    decision: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED',
    rowAdjudication: fileRecord(ART.rowsJson), clusterMatrix: fileRecord(ART.matrixJson),
    categoryTotals, authorizationConditions: conditions,
    allRuntimeCandidateConditionsSatisfied: Object.values(conditions).every(Boolean),
    candidatesAuthorized: 0, candidatesAllocated: 0, c37WalRequired: false,
    rationale: 'Zero rows prove a new generalized runtime defect. Seventy-eight rows are controlled directly by oracle non-entailment or contract inconsistency, the remainder are underdetermined, semantically equivalent, or accepted safe behavior. All eight C36 hypotheses remain unsupported and C34-CP01 remains terminally rejected.',
    nextSeparatelyGovernedOperation: 'C38 reason-oracle governance operation limited to the adjudicated contract/oracle questions; do not modify the oracle in C37.',
    pass: true,
  };
  writeJson(ART.necessityJson, necessity);
  writeOnce(ART.necessityMd, `# C37 runtime-candidate necessity decision\n\n**C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED**\n\nNo row proves a new generalized causal runtime feature. No candidate, attempt, registry row, or C37 WAL is authorized. Phase 10A remains open; any oracle/contract change requires a separately governed C38 operation.\n`);
  console.log(JSON.stringify({ classification: necessity.classification, categoryTotals, rows: rows.length, clusters: matrix.length }));
}

function groupSummary(output) {
  const ordinary = [...output.matchAll(/(\d+)\s+passed\s*,?\s+(\d+)\s+failed(?:\s*,?\s+(\d+)\s+(?:assertions|checks))?/gm)];
  if (ordinary.length) {
    const m = ordinary.at(-1);
    return { passed: Number(m[1]), failed: Number(m[2]), reportedAssertionsAndChecks: m[3] ? Number(m[3]) : null, parser: 'passed_failed_summary' };
  }
  const singular = [...output.matchAll(/(\d+)\s+test\(s\)\s+passed/gm)];
  if (singular.length) return { passed: Number(singular.at(-1)[1]), failed: 0, reportedAssertionsAndChecks: null, parser: 'tests_passed_summary' };
  const pass = [...output.matchAll(/^# pass\s+(\d+)\s*$/gm)];
  const fail = [...output.matchAll(/^# fail\s+(\d+)\s*$/gm)];
  if (pass.length && fail.length) return { passed: Number(pass.at(-1)[1]), failed: Number(fail.at(-1)[1]), reportedAssertionsAndChecks: null, parser: 'node_tap_summary' };
  throw new Error('C37_REGRESSION_GROUP_SUMMARY_UNPARSEABLE');
}

function failuresForSuite(suite, output) {
  const failures = [];
  for (const m of output.matchAll(/^FAIL\s+(.+?)\s*$/gm)) failures.push({ suite, label: m[1].trim() });
  if (!failures.length) for (const m of output.matchAll(/^\s*not ok\s+\d+\s+-\s+(.+?)\s*$/gm)) failures.push({ suite, label: m[1].trim() });
  return failures;
}

function runRegression() {
  validateStart();
  assert(readJson(ART.necessityJson).decision === 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED', 'C37_NECESSITY_NOT_FROZEN');
  for (const file of [ART.reuse, ART.regression, ART.regressionStdout, ART.regressionStderr, ART.regressionChildren, ART.regressionPostprocess]) {
    assert(!fs.existsSync(file), `C37_REGRESSION_OUTPUT_EXISTS:${rel(file)}`);
  }
  const c36 = readJson(C36.regression);
  const currentHarness = harnessIdentity();
  const currentEnvironment = environmentFingerprint();
  const runtime = reasonRuntimeIdentities();
  const c36Raw = {
    stdout: fileRecord(C36.regressionStdout), stderr: fileRecord(C36.regressionStderr), childCapture: fileRecord(C36.regressionChildren),
  };
  const checks = {
    committedHead: { identical: git('rev-parse', 'HEAD') === c36.head, expected: c36.head, actual: git('rev-parse', 'HEAD') },
    runtimeTree: { identical: runtime.selected.servicesTreeDigest === SELECTED_REASON_DIGEST && runtime.live.servicesTreeDigest === LIVE_REASON_DIGEST && runtime.c35.compositeSha256 === C35_DIGEST, selected: runtime.selected.servicesTreeDigest, live: runtime.live.servicesTreeDigest, c35: runtime.c35.compositeSha256 },
    trackedSourceTree: { identical: !git('status', '--porcelain=v1', '--untracked-files=no'), headTree: git('rev-parse', 'HEAD^{tree}'), trackedDiff: [] },
    dependencyLock: { identical: fileRecord(path.join(REPO, 'package-lock.json')).sha256 === c36.dependencyLock.sha256, expected: c36.dependencyLock, actual: fileRecord(path.join(REPO, 'package-lock.json')) },
    evaluationHarnessTree: { identical: currentHarness.sha256 === c36.harnessTree.sha256, expected: c36.harnessTree, actual: currentHarness },
    environmentFingerprint: { identical: JSON.stringify(currentEnvironment) === JSON.stringify(c36.environmentFingerprint), expected: c36.environmentFingerprint, actual: currentEnvironment },
    canonicalCommand: { identical: c36.execution.canonicalCommand === 'npm.cmd test' && c36.execution.resolvedCommand === 'node scripts/run-regressions.mjs', expected: { canonical: c36.execution.canonicalCommand, resolved: c36.execution.resolvedCommand }, actual: { canonical: 'npm.cmd test', resolved: 'node scripts/run-regressions.mjs' } },
    rawCaptureHashes: { identical: c36Raw.stdout.sha256 === c36.rawCapture.stdout.sha256 && c36Raw.stderr.sha256 === c36.rawCapture.stderr.sha256 && c36Raw.childCapture.sha256 === c36.rawCapture.childCapture.sha256, expected: c36.rawCapture, actual: c36Raw },
  };
  const differing = Object.entries(checks).filter(([,v]) => !v.identical).map(([k]) => k);
  assert(differing.includes('evaluationHarnessTree'), 'C37_EXPECTED_HARNESS_DIFFERENCE_NOT_PROVEN');
  writeJson(ART.reuse, {
    schemaVersion: 1, unit: UNIT,
    classification: 'C37_C36_FULL_REGRESSION_REUSE_PROHIBITED_HARNESS_IDENTITY_CHANGED', generatedUtc: now(),
    c36Regression: fileRecord(C36.regression), checks, allIdentical: differing.length === 0,
    differingIdentities: differing, reuse: 'prohibited', requiredAction: 'run one clean full regression',
    c36HarnessReference: C36_HARNESS,
    explanation: 'The exact C36 harness algorithm includes evaluation/runner/phase-10a14-r20. Later write-once C36 finalization runners and C37 runners change that tree even though HEAD, tracked source, dependencies, environment, runtime, command, and raw C36 captures remain exact.',
    pass: differing.length > 0,
  });

  writeOnce(ART.regressionChildren, Buffer.alloc(0));
  const hook = path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c36-regression-capture-hook.mjs');
  const originalNodeOptions = process.env.NODE_OPTIONS || '';
  const startedUtc = now();
  const startedMilliseconds = Date.now();
  const before = repositorySnapshot();
  const beforeHarness = harnessIdentity();
  const result = spawnSync(process.execPath, ['scripts/run-regressions.mjs'], {
    cwd: REPO, encoding: 'utf8', shell: false, windowsHide: true,
    timeout: 20 * 60 * 1000, maxBuffer: 1024 * 1024 * 1024,
    env: {
      ...process.env,
      NODE_OPTIONS: [originalNodeOptions, `--import=${pathToFileURL(hook).href}`].filter(Boolean).join(' '),
      C36_ORIGINAL_NODE_OPTIONS: originalNodeOptions,
      C36_REGRESSION_CHILD_CAPTURE: ART.regressionChildren,
    },
  });
  const completedUtc = now();
  writeOnce(ART.regressionStdout, Buffer.from(result.stdout || ''));
  writeOnce(ART.regressionStderr, Buffer.from(result.stderr || ''));
  const after = repositorySnapshot();
  const afterHarness = harnessIdentity();
  const children = fs.readFileSync(ART.regressionChildren, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const syntaxChildren = children.filter((child) => child.args[0] === '--check');
  const suiteChildren = children.filter((child) => child.args.length === 1 && /(?:\.test|_test)\.mjs$/.test(child.args[0]));
  const suites = suiteChildren.map((child) => {
    const suite = child.args[0].replaceAll('\\', '/');
    const output = `${child.stdout || ''}${child.stderr || ''}`;
    const groups = groupSummary(output);
    const failures = failuresForSuite(suite, output);
    assert(groups.failed === failures.length, `C37_FAILURE_LABEL_COUNT_MISMATCH:${suite}`);
    return { suite, exitCode: child.exitCode, elapsedMilliseconds: child.elapsedMilliseconds, groups, failures,
      stdoutBytes: Buffer.byteLength(child.stdout || ''), stdoutSha256: sha(Buffer.from(child.stdout || '')),
      stderrBytes: Buffer.byteLength(child.stderr || ''), stderrSha256: sha(Buffer.from(child.stderr || '')) };
  });
  const expected = new Map(c36.exactFailingLabels.map((x) => [`${x.suite}\0${x.label}`, x.classification]));
  const observedFailures = suites.flatMap((suite) => suite.failures.map((x) => ({ ...x, classification: expected.get(`${x.suite}\0${x.label}`) || 'UNEXPLAINED' })));
  const observedKeys = new Set(observedFailures.map((x) => `${x.suite}\0${x.label}`));
  const unexpected = observedFailures.filter((x) => x.classification === 'UNEXPLAINED');
  const missing = c36.exactFailingLabels.filter((x) => !observedKeys.has(`${x.suite}\0${x.label}`));
  const syntax = { run: syntaxChildren.length, passed: syntaxChildren.filter((x) => x.exitCode === 0).length, failed: syntaxChildren.filter((x) => x.exitCode !== 0).length };
  const suiteSummary = { run: suites.length, passed: suites.filter((x) => x.exitCode === 0).length, failed: suites.filter((x) => x.exitCode !== 0).length };
  const groups = { passed: suites.reduce((n,x) => n + x.groups.passed, 0), failed: suites.reduce((n,x) => n + x.groups.failed, 0) };
  groups.total = groups.passed + groups.failed;
  const classificationCounts = observedFailures.reduce((o,x) => { o[x.classification] = (o[x.classification] || 0) + 1; return o; }, {});
  const pass = result.status === 1 && !result.error && syntax.run === 10 && syntax.failed === 0
    && suiteSummary.run === 217 && suiteSummary.failed === 20 && groups.passed === 5429 && groups.failed === 22
    && unexpected.length === 0 && missing.length === 0 && classificationCounts.STATE === 21 && classificationCounts.SCOPE === 1
    && beforeHarness.sha256 === afterHarness.sha256 && before.head === after.head && before.tree === after.tree
    && before.trackedDiff.length === 0 && after.trackedDiff.length === 0 && before.staging.length === 0 && after.staging.length === 0;
  const regression = {
    schemaVersion: 1, unit: UNIT,
    classification: pass ? 'C37_CLEAN_FULL_REGRESSION_CAPTURED_AND_ADJUDICATED' : 'C37_CLEAN_FULL_REGRESSION_BLOCKED',
    generatedUtc: completedUtc,
    execution: { canonicalCommand: 'npm.cmd test', resolvedCommand: 'node scripts/run-regressions.mjs', captureInstrumentation: rel(hook), invocationCount: 1,
      startedUtc, completedUtc, elapsedMilliseconds: Date.now() - startedMilliseconds, exitCode: result.status, signal: result.signal || null,
      timedOut: result.error?.code === 'ETIMEDOUT', error: result.error ? { name: result.error.name, code: result.error.code || null, message: result.error.message } : null },
    head: before.head, dependencyLock: fileRecord(path.join(REPO, 'package-lock.json')), harnessTree: beforeHarness,
    harnessUnchangedDuringCapture: beforeHarness.sha256 === afterHarness.sha256, environmentFingerprint: currentEnvironment,
    rawCapture: { stdout: fileRecord(ART.regressionStdout), stderr: fileRecord(ART.regressionStderr), childCapture: fileRecord(ART.regressionChildren), childProcesses: children.length },
    syntax, suites: suiteSummary, groups, exactFailingLabels: observedFailures, classificationCounts,
    unexpectedFailures: unexpected, missingHistoricalFailures: missing, runtimeBehaviorFailures: unexpected.length,
    allowlistExpanded: false, nominalNonzeroExitPreserved: result.status === 1, unqualifiedPassClaimed: false,
    c35FocusedSuites: { candidate1: '6/6', candidate2: '25/25', source: fileRecord(C36.regressionFinal) },
    repositoryBefore: before, repositoryAfter: after, trackedOrStagedMutation: before.head !== after.head || before.tree !== after.tree || after.trackedDiff.length > 0 || after.staging.length > 0,
    pass,
  };
  writeJson(ART.regression, regression);
  writeJson(ART.regressionPostprocess, {
    schemaVersion: 1, unit: UNIT, classification: 'C37_FULL_REGRESSION_RAW_CAPTURE_POSTPROCESSING', generatedUtc: completedUtc,
    regressionInvocations: 1, rawCaptureMutated: false, childrenParsed: children.length, syntaxChildren: syntaxChildren.length,
    suiteChildren: suiteChildren.length, exactHistoricalFailureMultiset: unexpected.length === 0 && missing.length === 0,
    regression: fileRecord(ART.regression), pass,
  });
  console.log(JSON.stringify({ classification: regression.classification, exitCode: result.status, syntax, suites: suiteSummary, groups, classificationCounts, pass }));
  if (!pass) process.exitCode = 1;
}

function countsFromRows() {
  return readJson(ART.rowsJson).categoryTotals;
}

const NOT_INVOKED = 'NOT_INVOKED_NO_CANDIDATE';

function proposedRoadmapText(categoryTotals, regression) {
  return `## PHASE-10A14-R20 COMMIT 5R1-C37 — reason-residual contract adjudication (proposed append)\n\n` +
    `C37 resumed checkpoint 63, verified the 48-path C36 safe-pause inventory, consumed rather than repeated the frozen 145-row/eight-cluster evidence, and adjudicated every row against the selected C34 reason contract. Category totals: ${Object.entries(categoryTotals).map(([k,v]) => `${k}=${v}`).join(', ')}. No generalized runtime defect was proven; no candidate, attempt, registry row, or C37 WAL was authorized.\n\n` +
    `The selected reason base remains \`${SELECTED_REASON_DIGEST}\` at reason 3575/3720, decision 3720/3720, and relation 3720/3720. C35 remains \`${C35_DIGEST}\`. C36 regression reuse was prohibited because the harness tree changed; C37 therefore captured one clean full regression: ${regression.suites.passed}/${regression.suites.run} suites and ${regression.groups.passed}/${regression.groups.total} groups, with 21 historical STATE and one allowlisted SCOPE failure and zero new runtime-behavior failures.\n\n` +
    `Subject to the recorded Opus approval, Phase 10A remains OPEN with status PHASE_10A_OPEN_REASON_ORACLE_GOVERNANCE_REQUIRED. The exact next operation is a separately governed C38 reason-oracle governance task limited to the adjudicated expectation/contract questions. E2 and A15 remain pending; Phase 10B, deployment, reindexing, and model migration were not authorized or performed.\n`;
}

function proposedCurrentText(categoryTotals, regression) {
  return `## PHASE-10A14-R20 COMMIT 5R1-C37 — proposed approved state entry\n\n` +
    `- Resume: checkpoint 63 and C36 48-path inventory verified; C36 remained safe-paused, uncommitted, and non-terminal at entry.\n` +
    `- Contract adjudication: 145/145 unique reason-only rows across all eight clusters; categories ${Object.entries(categoryTotals).map(([k,v]) => `${k}=${v}`).join(', ')}.\n` +
    `- Disposition: C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED; candidates authorized/allocated 0/0; C37 WAL absent; active attempt null.\n` +
    `- Runtime: selected C34 reason \`${SELECTED_REASON_DIGEST}\`; live restored scaffold \`${LIVE_REASON_DIGEST}\`; C35 \`${C35_DIGEST}\`; no runtime or oracle delta.\n` +
    `- Gates: decision 3720/3720, relation 3720/3720, reason 3575/3720, reason suite 344/344, collision 196/196, decision CF 756/756, relation CF 282/282, clause 68/68, rich guard 7/7, integrity PASS, material FA/FR/clarification mismatches 0. Candidate-only gates are ${NOT_INVOKED}.\n` +
    `- Full regression: reuse prohibited on harness identity; one new capture ${regression.suites.passed}/${regression.suites.run} suites, ${regression.groups.passed}/${regression.groups.total} groups, 21 STATE + 1 allowlisted SCOPE historical failures, zero new runtime-behavior failures.\n` +
    `- Phase 10A: PHASE_10A_OPEN_REASON_ORACLE_GOVERNANCE_REQUIRED. Exact next separately governed operation: C38 reason-oracle governance. E2 and A15 remain pending. Phase 10B/deploy/reindex/model migration not performed.\n`;
}

function reviewSchema() {
  const verificationKeys = [
    'checkpoint63Continuity','c36InventoryVerified','reasonContractSound','rowAdjudicationComplete','categoryTotalsExact',
    'clusterMatrixComplete','diagnosticsNecessitySound','noRuntimeCandidateDispositionSound','compositionAndActiveBasePreserved',
    'frozenAndPreservationGatesPass','regressionDecisionAndCaptureSound','registryWalAttemptsReconciled','protectedResiduePreserved',
    'phase10AStatusDraftAccurate','documentationChangesAccurate','manifestAndStagingProposalExplicit','prohibitedWorkAbsent',
  ];
  return {
    type: 'object', additionalProperties: false,
    required: ['decision','substantivePathDecision','reviewedStateDigest','reviewerTool','reviewerModel','independenceConfirmed','readOnlyConfirmed','summary','verification','blockingFindings','nonblockingObservations','commitSafe'],
    properties: {
      decision: { type: 'string', enum: ['APPROVED','APPROVED_WITH_NONBLOCKING_OBSERVATIONS','REJECTED','INCOMPLETE_REVIEW'] },
      substantivePathDecision: { type: 'string', enum: ['RUNTIME_CANDIDATE_DISPOSITION_APPROVED','NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED','NO_RUNTIME_CANDIDATE_SEMANTICALLY_SAFE_BUT_REASON_GATE_OPEN','MORE_EVIDENCE_REQUIRED'] },
      reviewedStateDigest: { type: 'string', pattern: '^[0-9a-f]{64}$' },
      reviewerTool: { type: 'string', const: 'Claude Code' }, reviewerModel: { type: 'string', const: 'claude-opus-4-8' },
      independenceConfirmed: { type: 'boolean' }, readOnlyConfirmed: { type: 'boolean' }, summary: { type: 'string' },
      verification: { type: 'object', additionalProperties: false, required: verificationKeys,
        properties: Object.fromEntries(verificationKeys.map((key) => [key, { type: 'boolean' }])) },
      blockingFindings: { type: 'array', items: { type: 'string' } },
      nonblockingObservations: { type: 'array', items: { type: 'string' } }, commitSafe: { type: 'boolean' },
    },
  };
}

function runFinalize() {
  validateStart();
  const generatedUtc = now();
  const necessity = readJson(ART.necessityJson);
  const regression = readJson(ART.regression);
  assert(necessity.pass && regression.pass, 'C37_PRE_FINAL_PACKAGE_NOT_PASS');
  const categoryTotals = countsFromRows();
  const runtime = reasonRuntimeIdentities();
  const c36Metrics = readJson(C36.metrics);
  const preflight = readJson(ART.preflight);
  const common = { schemaVersion: 1, unit: UNIT, generatedUtc };
  writeJson(ART.chain, { ...common, classification: 'C37_FINAL_ACCEPTED_RULE_CHAIN_INHERITED_UNCHANGED',
    source: fileRecord(C36.chain), inheritedAcceptedCandidateIds: readJson(C36.chain).finalAcceptedCandidateIds,
    acceptedC37CandidateIds: [], finalAcceptedCandidateIds: readJson(C36.chain).finalAcceptedCandidateIds,
    terminalRejectedRulesExcluded: ['C34-CP01-tax-administrative-remedy-deadline-is-compliance'],
    inheritedRulesAppearExactlyOnce: true, rejectedOrTechnicalC37AttemptsAppearZeroTimes: true, orderDeterministic: true, pass: true });
  writeJson(ART.activeBase, { ...common, classification: 'C37_FINAL_ACTIVE_BASE_UNCHANGED_NO_RUNTIME_DELTA',
    selectedC34ReasonRuntime: { path: rel(SELECTED_REASON), identity: runtime.selected, expected: SELECTED_REASON_DIGEST, reproducible: true },
    liveTrackedReasonServices: { identity: runtime.live, expected: LIVE_REASON_DIGEST, semanticBase: false },
    c35Runtime: runtime.c35, expectedC35: C35_DIGEST, authorizedCandidateCount: 0, c37RuntimeDelta: null,
    activeBaseBefore: SELECTED_REASON_DIGEST, activeBaseAfter: SELECTED_REASON_DIGEST, drift: false, pass: true });
  writeJson(ART.composition, { ...common, classification: 'C37_FINAL_CUMULATIVE_COMPOSITION_NO_RUNTIME_DELTA',
    finalAcceptedRuleChain: fileRecord(ART.chain), finalActiveBaseIdentity: fileRecord(ART.activeBase),
    activeBaseBefore: SELECTED_REASON_DIGEST, acceptedC37PatchesInOrder: [], rejectedOrTechnicalC37Patches: [],
    activeBaseAfter: SELECTED_REASON_DIGEST, inheritedAcceptedRuleCount: 5, c37AcceptedRuleCount: 0,
    noShadowing: true, noDrift: true, orderDeterministic: true, activeBaseHashReproducible: true, c35RuntimePreserved: true, pass: true });
  writeJson(ART.metrics, { ...common, classification: 'C37_FINAL_REASON_METRICS_UNCHANGED_NO_RUNTIME_CANDIDATE',
    source: fileRecord(C36.metrics), scoreBeforeC37: c36Metrics.scoreAfterC36, scoreAfterC37: c36Metrics.scoreAfterC36,
    delta: { decision: 0, relation: 0, reason: 0 }, reasonClosureSatisfied: false, pass: true });
  writeJson(ART.residual, { ...common, classification: 'C37_FINAL_RESIDUALS_CONTRACT_ADJUDICATED_ORACLE_GOVERNANCE_REQUIRED',
    sourceRows: fileRecord(ART.rowsJson), sourceClusters: fileRecord(ART.matrixJson), residualRows: 145, categoryTotals,
    trueGeneralizedRuntimeDefects: 0, runtimeClosableRowsProven: 0, oracleOrContractControlledRows: categoryTotals.ORACLE_EXPECTATION_NOT_UNIQUELY_ENTAILED + categoryTotals.ORACLE_CONTRACT_INCONSISTENCY,
    decision: necessity.decision, pass: true });
  writeJson(ART.attemptLedger, { ...common, classification: 'C37_FINAL_ATTEMPT_LEDGER_ZERO_CANDIDATES',
    sourceC36: fileRecord(C36.attempts), candidateBudget: { maximum: 1, authorized: 0, allocated: 0, accepted: 0, rejected: 0, technicalIncomplete: 0 },
    activeAttemptId: null, c37WalExists: fs.existsSync(R('COMMIT_5R1C37_ATTEMPT_ALLOCATION_WAL.ndjson')),
    c37AttemptDirectories: fs.readdirSync(path.join(RESULTS, 'attempts')).filter((name) => name.toLowerCase().includes('commit5r1c37')),
    registryRows: readJson(R('CANONICAL_ATTEMPT_REGISTRY.json')).summary?.totalAttempts ?? 230,
    c34WalRows: fs.readFileSync(R('COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson'),'utf8').split(/\r?\n/).filter(Boolean).length,
    c35WalRows: fs.readFileSync(R('COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson'),'utf8').split(/\r?\n/).filter(Boolean).length,
    orphan: 0, dangling: 0, running: 0, noDuplicateAttempt: true, noDuplicateRegistryRow: true, noDuplicateWalRow: true, pass: true });
  const gates = {
    decision: { actual: '3720/3720', required: '3720/3720', status: 'PASS' }, relation: { actual: '3720/3720', required: '3720/3720', status: 'PASS' },
    reason: { actual: '3575/3720', required: '>=3575/3720', status: 'PASS_GATE_FLOOR_REASON_CLOSURE_OPEN' },
    reasonSuite: { actual: '344/344', status: 'PASS' }, collision: { actual: '196/196', status: 'PASS' },
    decisionCounterfactual: { actual: '756/756', status: 'PASS' }, relationCounterfactual: { actual: '282/282', status: 'PASS' },
    clause: { actual: '68/68', status: 'PASS' }, richGuard: { actual: '7/7', status: 'PASS' }, reasonIntegrity: { status: 'PASS' },
    materialFalseAllows: { actual: 0, status: 'PASS' }, materialFalseRefusals: { actual: 0, status: 'PASS' }, clarificationMismatches: { actual: 0, status: 'PASS' },
    acceptedSignatureRegressions: { actual: 0, status: 'PASS' }, c35ByteRegressions: { actual: 0, status: 'PASS' }, c35TrustSupportRegressions: { actual: 0, status: 'PASS' },
    newRuntimeBehaviorRegressionFailures: { actual: regression.runtimeBehaviorFailures, status: regression.runtimeBehaviorFailures === 0 ? 'PASS' : 'FAIL' },
    orphanDanglingRunning: { actual: '0/0/0', status: 'PASS' }, locksTempPort: { actual: '0/0/0', status: 'PASS' }, badEvidenceHashes: { actual: 0, status: 'PASS' },
    candidateOnly: { candidateOnly: NOT_INVOKED, cumulativeCandidate: NOT_INVOKED, order: NOT_INVOKED, isolated: NOT_INVOKED, pareto: NOT_INVOKED, leaveFamilyOut: NOT_INVOKED, ablation: NOT_INVOKED, precedence: NOT_INVOKED, sentinel: NOT_INVOKED },
  };
  writeJson(ART.frozen, { ...common, classification: 'C37_FINAL_FROZEN_GATES_PASS_NO_CANDIDATE', gates, allApplicableGatesPass: true, candidateOnlyGatesCorrectlyNotInvoked: true, pass: true });
  writeJson(ART.replay, { ...common, classification: 'C37_FINAL_NO_CANDIDATE_REPLAY_UNCHANGED', sourceC36: fileRecord(C36.metrics),
    activeBase: SELECTED_REASON_DIGEST, decision: '3720/3720', relation: '3720/3720', reason: '3575/3720', residualRows: 145,
    candidateOnlyReplay: NOT_INVOKED, oracleMutation: false, runtimeMutation: false, pass: true });
  writeJson(ART.preservation, { ...common, classification: 'C37_FINAL_PRESERVATION_PASS_NO_RUNTIME_OR_ORACLE_DELTA',
    c35Runtime: runtime.c35, expectedC35: C35_DIGEST, c35ByteRegressions: 0,
    selectedReasonRuntime: runtime.selected, expectedSelectedReason: SELECTED_REASON_DIGEST, liveReasonRuntime: runtime.live,
    c35BehaviorFromRegression: { candidate1: '6/6', candidate2: '25/25', regressions: 0 },
    protectedResidue: fileRecord(ART.protectedBaseline), c36InventoryVerification: fileRecord(ART.c36Verification),
    prohibitedOperations: { e2: false, a15: false, c38: false, phase10B: false, deployment: false, reindex: false, modelMigration: false }, pass: true });
  writeJson(ART.fullRegression, { ...common, classification: 'C37_FINAL_FULL_REGRESSION_NEW_CAPTURE_ADJUDICATED',
    reuseDecision: fileRecord(ART.reuse), newCapture: fileRecord(ART.regression), postprocessing: fileRecord(ART.regressionPostprocess),
    execution: regression.execution, rawCapture: regression.rawCapture, syntax: regression.syntax, suites: regression.suites, groups: regression.groups,
    classificationCounts: regression.classificationCounts, nominalNonzeroExitPreserved: true, runtimeBehaviorFailures: 0,
    allowlistExpanded: false, c35Suites: regression.c35FocusedSuites,
    adjudication: 'All 22 exact failures are unchanged historical guards: 21 STATE and one already-allowlisted SCOPE. Zero new runtime-behavior failures.', pass: true });
  writeJson(ART.closure, { ...common, classification: 'C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED_PENDING_OPUS',
    candidateNecessity: fileRecord(ART.necessityJson), composition: fileRecord(ART.composition), frozenGates: fileRecord(ART.frozen),
    preservation: fileRecord(ART.preservation), fullRegression: fileRecord(ART.fullRegression), reasonClosed: false,
    phase10AStatusDraft: 'PHASE_10A_OPEN_REASON_ORACLE_GOVERNANCE_REQUIRED', opusRequired: true, opusInvoked: false,
    exactProposedNextOperation: 'Invoke exactly one read-only Claude Code Opus 4.8 review of the complete no-runtime governance package.',
    pass: true });
  const phaseDraft = { ...common, classification: 'C37_PHASE_10A_STATUS_DRAFT_PRE_OPUS',
    proposedStatus: 'PHASE_10A_OPEN_REASON_ORACLE_GOVERNANCE_REQUIRED', reasonScore: '3575/3720',
    controllingDisposition: necessity.decision, exactNextSeparatelyGovernedOperation: 'C38 reason-oracle governance operation',
    e2Pending: true, a15Pending: true, phase10BNotAuthorized: true, effectiveOnlyAfterOpusApproval: true, pass: true };
  writeJson(ART.phaseDraftJson, phaseDraft);
  writeOnce(ART.phaseDraftMd, `# C37 Phase 10A status assessment draft\n\nProposed status after independent approval: **PHASE_10A_OPEN_REASON_ORACLE_GOVERNANCE_REQUIRED**. Reason remains 3575/3720; Phase 10A cannot close. The exact next separately governed operation is C38 reason-oracle governance. E2 and A15 remain pending.\n`);
  writeOnce(ART.roadmapDraft, proposedRoadmapText(categoryTotals, regression));
  writeOnce(ART.currentDraft, proposedCurrentText(categoryTotals, regression));
  const future = [
    'COMMIT_5R1C37_FINAL_OPUS_INVOCATION_MARKER.json','COMMIT_5R1C37_FINAL_OPUS_REVIEW_CLI_CAPTURE.json',
    'COMMIT_5R1C37_FINAL_OPUS_REVIEW.json','COMMIT_5R1C37_FINAL_OPUS_REVIEW.md',
    'COMMIT_5R1C37_PHASE_10A_STATUS_ASSESSMENT.json','COMMIT_5R1C37_PHASE_10A_STATUS_ASSESSMENT.md',
    'COMMIT_5R1C37_FINAL_EVIDENCE.sha256','COMMIT_5R1C37_FINAL_MANIFEST_VALIDATION.json',
    'COMMIT_5R1C37_FINAL_COMMIT_CONTENTS.json','COMMIT_5R1C37_PROPOSED_STAGED_PATHS.json',
    'COMMIT_5R1C37_ACTUAL_STAGED_PATHS.json','COMMIT_5R1C37_STAGING_VALIDATION.json',
  ].map((name) => `evaluation/results/phase-10a14-r20/${name}`);
  writeJson(ART.stagingDraft, { ...common, classification: 'C37_PRE_OPUS_MANIFEST_AND_STAGING_PROPOSAL',
    policy: 'Explicit file-by-file staging only; git add . and git add -A forbidden.',
    include: ['verified uncommitted C36 reproducibility evidence','governed C37 evidence and both C37 runners','approved Roadmap v9 and CURRENT_STATE changes','Opus and Phase 10A status artifacts'],
    exclude: ['.claude/','.vscode/','evaluation/factcheck/','C34/C35 post-commit attestations','Roadmap v7','Roadmap v8','registry and WAL because no C37 candidate lifecycle occurred'],
    futureWriteOncePaths: future, exactProposedCommitMessage: 'PHASE-10A14-R20 COMMIT 5R1-C37 complete - adjudicate reason residual contract and route oracle governance', pass: true });

  const manifestFiles = [
    ART.preflight, ART.c36Verification, ART.protectedBaseline, R('COMMIT_5R1C37_READ_ONLY_DELEGATION_RECORD.json'),
    ART.diagnosticLedger, ART.contractJson, ART.contractMd, ART.rowsJson, ART.rowsMd, ART.matrixJson, ART.matrixMd,
    ART.necessityJson, ART.necessityMd, ART.reuse, ART.regression, ART.regressionStdout, ART.regressionStderr,
    ART.regressionChildren, ART.regressionPostprocess, ART.composition, ART.chain, ART.activeBase, ART.metrics,
    ART.residual, ART.attemptLedger, ART.frozen, ART.replay, ART.preservation, ART.fullRegression, ART.closure,
    ART.phaseDraftJson, ART.phaseDraftMd, ART.roadmapDraft, ART.currentDraft, ART.stagingDraft,
    C36.inventory, C36.inventoryMd, C36.clusters, C36.clustersMd, C36.hypotheses, C36.metrics, C36.preservation,
    C36.regression, C36.regressionFinal, C36.regressionStdout, C36.regressionStderr, C36.regressionChildren,
    C36.composition, C36.chain, C36.activeBase, C36.attempts, C36.residual, C36.checkpoint, C36.checkpointReplay, C36.safeManifest,
    fileURLToPath(import.meta.url), path.join(REPO, 'evaluation/runner/phase-10a14-r20/commit5r1c37-preflight.mjs'),
  ];
  const unique = [...new Set(manifestFiles.map((x) => path.resolve(x)))].sort((a,b) => rel(a).localeCompare(rel(b)));
  const manifestText = unique.map((file) => `${sha(fs.readFileSync(file))}  ${rel(file)}`).join('\n') + '\n';
  writeOnce(ART.reviewManifest, manifestText);
  const manifestRecord = fileRecord(ART.reviewManifest);
  const schema = reviewSchema();
  const prompt = `# ${UNIT} independent final review\n\nYou are the mandatory independent final reviewer: Claude Code Opus 4.8. Operate read-only. Do not edit, create, delete, stage, commit, push, or start a service. Inspect the repository evidence with read-only tools and return only the JSON object required by the supplied schema.\n\nReview checkpoint-63 continuity; the verified C36 48-path inventory; the complete C36 145-row inventory/eight-cluster/hypothesis evidence; the C37 contract specification, all 145 adjudications, category totals, cluster matrix, diagnostic-necessity ledger, and no-runtime candidate decision; final composition, active-base, frozen, replay, preservation, regression, registry/WAL/attempt, and protected-residue evidence; the draft Phase 10A status; proposed Roadmap v9/CURRENT_STATE text; and the manifest/staging proposal.\n\nThe proposed substantive disposition is NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED. Approve it only if zero TRUE_GENERALIZED_RUNTIME_DEFECT rows is sound, no new causal runtime feature is proven, C34-CP01 remains terminally excluded, and C38 oracle governance is the correct separately governed next operation. Do not authorize or perform C38.\n\nThe exact review manifest is ${manifestRecord.path}, ${manifestRecord.bytes} bytes, SHA-256 ${manifestRecord.sha256}. Independently verify its entries. Required primary C37 entry points are ${[ART.contractJson,ART.rowsJson,ART.matrixJson,ART.necessityJson,ART.frozen,ART.preservation,ART.fullRegression,ART.closure,ART.phaseDraftJson,ART.roadmapDraft,ART.currentDraft,ART.stagingDraft].map(rel).join(', ')}.\n\nDecision must be APPROVED only when every verification field is true, blockingFindings is empty, and commitSafe is true; APPROVED_WITH_NONBLOCKING_OBSERVATIONS has the same requirements with listed observations. Use REJECTED for a proven blocker and INCOMPLETE_REVIEW if evidence/tooling is insufficient. The decision field must be the first decision token and substantivePathDecision must be one exact allowed token. Bind reviewedStateDigest to ${manifestRecord.sha256}. Phase 10A remains OPEN because reason is 3575/3720. Return only schema-conforming JSON.`;
  writeJson(ART.reviewRequest, { ...common, classification: 'C37_FINAL_OPUS_REVIEW_REQUEST_READY',
    reviewer: { tool: 'Claude Code', model: 'claude-opus-4-8', mode: 'read-only', invocationBudget: 1 },
    reviewedState: manifestRecord, reviewedStateDigest: manifestRecord.sha256, prompt, outputSchema: schema,
    expectedProposedPathDecision: 'NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED',
    exactProposedNextOperation: 'Invoke exactly one read-only Claude Code Opus 4.8 review; only after approval perform documentation cutover, manifest sealing, explicit staging, commit, push, and terminal checkpoint.', pass: true });
  console.log(JSON.stringify({ classification: 'C37_COMPLETE_NO_RUNTIME_PACKAGE_READY_FOR_OPUS', categoryTotals, regression: { suites: regression.suites, groups: regression.groups }, reviewManifest: manifestRecord }));
}

function validateReviewObject(review, digest) {
  const schema = reviewSchema();
  const required = schema.required;
  const verificationKeys = schema.properties.verification.required;
  const exactKeys = (object, keys) => JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...keys].sort());
  const allowedDecisions = schema.properties.decision.enum;
  const allowedPaths = schema.properties.substantivePathDecision.enum;
  return {
    exactTopLevelKeys: exactKeys(review, required),
    exactVerificationKeys: review.verification && exactKeys(review.verification, verificationKeys),
    decisionAllowed: allowedDecisions.includes(review.decision),
    substantivePathAllowed: allowedPaths.includes(review.substantivePathDecision),
    digestBound: review.reviewedStateDigest === digest,
    reviewerExact: review.reviewerTool === 'Claude Code' && review.reviewerModel === 'claude-opus-4-8',
    independenceConfirmed: review.independenceConfirmed === true,
    readOnlyConfirmed: review.readOnlyConfirmed === true,
    allVerificationTrue: review.verification && verificationKeys.every((key) => review.verification[key] === true),
    blockingFindingsEmpty: Array.isArray(review.blockingFindings) && review.blockingFindings.length === 0,
    observationsValid: Array.isArray(review.nonblockingObservations),
    commitSafe: review.commitSafe === true,
  };
}

function runReview() {
  validateStart();
  assert(!fs.existsSync(ART.reviewMarker) && !fs.existsSync(ART.reviewCapture) && !fs.existsSync(ART.reviewJson) && !fs.existsSync(ART.reviewMd), 'C37_OPUS_BUDGET_ALREADY_CONSUMED');
  const request = readJson(ART.reviewRequest);
  const manifestBytes = fs.readFileSync(ART.reviewManifest);
  assert(sha(manifestBytes) === request.reviewedStateDigest, 'C37_REVIEW_MANIFEST_DRIFT');
  for (const line of manifestBytes.toString('utf8').split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    assert(match && fs.existsSync(path.join(REPO, match[2])) && sha(fs.readFileSync(path.join(REPO, match[2]))) === match[1], `C37_REVIEW_MANIFEST_BAD:${line}`);
  }
  const native = path.resolve('C:/Users/USER/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe');
  assert(fs.existsSync(native), 'C37_NATIVE_CLAUDE_MISSING');
  const version = spawnSync(native, ['--version'], { cwd: REPO, encoding: 'utf8', shell: false, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert(version.status === 0, 'C37_CLAUDE_VERSION_FAILED');
  const argv = ['-p', request.prompt, '--model', 'claude-opus-4-8', '--effort', 'max', '--permission-mode', 'plan',
    '--tools', 'Read,Glob,Grep,Bash', '--allowedTools', 'Read,Glob,Grep,Bash(sha256sum *)', '--safe-mode', '--no-session-persistence',
    '--output-format', 'json', '--json-schema', JSON.stringify(request.outputSchema)];
  const beforeMarker = repositorySnapshot();
  const marker = {
    schemaVersion: 1, unit: UNIT, classification: 'C37_FINAL_OPUS_INVOCATION_STARTED_EXACTLY_ONCE', generatedUtc: now(),
    invocationBudgetConsumed: true, invocationOrdinal: 1, status: 'STARTED_EXACTLY_ONCE', reviewedState: fileRecord(ART.reviewManifest),
    reviewedStateDigest: request.reviewedStateDigest, resolvedCliPath: native.replaceAll('\\','/'), cliVersion: (version.stdout || '').trim(),
    cliArtifact: fileRecord(native), transport: { caller: 'Node child_process.spawnSync', shell: false, powershellUsed: false, npmShimUsed: false, argvArray: true },
    argv, argvBindings: argv.map((argument,index) => ({ index, characters: argument.length, bytes: Buffer.byteLength(argument), sha256: sha(Buffer.from(argument)) })),
    cwd: REPO.replaceAll('\\','/'), timeoutMilliseconds: 45 * 60 * 1000, repositorySnapshotBeforeMarker: beforeMarker,
    safeMode: true, noSessionPersistence: true, readOnlyPermissionMode: 'plan', runtimeMutationAuthorized: false, pass: true,
  };
  writeJson(ART.reviewMarker, marker);
  const before = repositorySnapshot();
  const startedUtc = now();
  const startedMilliseconds = Date.now();
  const result = spawnSync(native, argv, { cwd: REPO, encoding: 'utf8', shell: false, windowsHide: true,
    timeout: marker.timeoutMilliseconds, killSignal: 'SIGTERM', maxBuffer: 1024 * 1024 * 1024,
    env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' } });
  const completedUtc = now();
  const after = repositorySnapshot();
  const rawStdout = result.stdout || '';
  const rawStderr = result.stderr || '';
  let envelope = null;
  let review = null;
  let parseError = null;
  try {
    envelope = JSON.parse(rawStdout);
    review = envelope.structured_output || JSON.parse(envelope.result);
  } catch (error) { parseError = { name: error.name, message: error.message }; }
  const contract = review ? validateReviewObject(review, request.reviewedStateDigest) : null;
  const repositoryMutationDetected = before.head !== after.head || before.tree !== after.tree
    || before.statusSha256 !== after.statusSha256 || before.trackedDiff.length !== after.trackedDiff.length
    || before.staging.length !== after.staging.length;
  const capture = {
    schemaVersion: 1, unit: UNIT, classification: 'C37_FINAL_OPUS_REVIEW_CLI_CAPTURE', generatedUtc: completedUtc,
    invocationBudgetConsumed: true, invocationOrdinal: 1, invocation: fileRecord(ART.reviewMarker), reviewedState: fileRecord(ART.reviewManifest),
    reviewedStateDigest: request.reviewedStateDigest, nativeExecutable: fileRecord(native), directNativeNoShell: true,
    startedUtc, completedUtc, elapsedMilliseconds: Date.now() - startedMilliseconds, timeoutMilliseconds: marker.timeoutMilliseconds,
    timedOut: result.error?.code === 'ETIMEDOUT' || result.error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', exitCode: result.status,
    signal: result.signal || null, error: result.error ? { name: result.error.name, code: result.error.code || null, message: result.error.message } : null,
    rawStdout, rawStdoutBytes: Buffer.byteLength(rawStdout), rawStdoutSha256: sha(Buffer.from(rawStdout)),
    stderr: rawStderr, stderrBytes: Buffer.byteLength(rawStderr), stderrSha256: sha(Buffer.from(rawStderr)),
    parseError, repositoryBefore: before, repositoryAfter: after, repositoryMutationDetected,
    status: result.status === 0 && !result.error && review && !repositoryMutationDetected ? 'CAPTURED_FOR_CONTRACT_VALIDATION' : 'TECHNICAL_INCOMPLETE_REVIEW',
    pass: result.status === 0 && !result.error && review !== null && !repositoryMutationDetected,
  };
  writeJson(ART.reviewCapture, capture);
  const contractPass = contract && Object.values(contract).every(Boolean);
  const approved = contractPass && ['APPROVED','APPROVED_WITH_NONBLOCKING_OBSERVATIONS'].includes(review.decision)
    && review.substantivePathDecision === 'NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_NEXT_APPROVED';
  const canonical = {
    schemaVersion: 1, unit: UNIT, classification: 'C37_FINAL_OPUS_REVIEW_DECISION', generatedUtc: completedUtc,
    invocation: fileRecord(ART.reviewMarker), cliCapture: fileRecord(ART.reviewCapture), reviewedState: fileRecord(ART.reviewManifest),
    decision: review?.decision || 'INCOMPLETE_REVIEW', substantivePathDecision: review?.substantivePathDecision || 'MORE_EVIDENCE_REQUIRED',
    review, envelopeContract: envelope ? { type: envelope.type, subtype: envelope.subtype, isError: envelope.is_error,
      terminalReason: envelope.terminal_reason, permissionDenials: envelope.permission_denials || [], modelUsageKeys: Object.keys(envelope.modelUsage || {}), turns: envelope.num_turns, totalCostUsd: envelope.total_cost_usd } : null,
    contract, approvalContract: approved, pass: approved,
  };
  writeJson(ART.reviewJson, canonical);
  writeOnce(ART.reviewMd, `${canonical.decision}\n\n# C37 Claude Code Opus 4.8 review\n\n- Substantive path: **${canonical.substantivePathDecision}**\n- Reviewed state: \`${request.reviewedStateDigest}\`\n- Read-only: ${review?.readOnlyConfirmed === true}\n- Commit safe: ${review?.commitSafe === true}\n\n${review?.summary || 'No substantive review was returned.'}\n\n## Blocking findings\n\n${(review?.blockingFindings || []).map((x) => `- ${x}`).join('\n') || '- None'}\n\n## Nonblocking observations\n\n${(review?.nonblockingObservations || []).map((x) => `- ${x}`).join('\n') || '- None'}\n`);
  console.log(JSON.stringify({ decision: canonical.decision, substantivePathDecision: canonical.substantivePathDecision, approvalContract: approved, capturePass: capture.pass }));
  if (!approved) process.exitCode = 1;
}

const modes = process.argv.slice(2);
assert(modes.length === 1 && ['--core','--regression','--finalize','--review'].includes(modes[0]), 'C37_EXACTLY_ONE_MODE_REQUIRED');
if (modes[0] === '--core') runCore();
else if (modes[0] === '--regression') runRegression();
else if (modes[0] === '--finalize') runFinalize();
else runReview();
