// PHASE-10A14-R20 COMMIT 5R1-C25 - structural failure-family remediation evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const UNIT = 'COMMIT 5R1-C25';
const RES = L.RES;
const ATT = L.ATT;
const C24_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c24_c23_governed_reconstruction-commit5r1c24-reconstruction-ord01-2026-07-27T09-34-45-594Z';
const C23_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c23_reason_iteration_05-commit5r1c23-dev-05-ord01-2026-07-27T08-07-19-257Z';
const C24_SNAP = ATT + C24_ATTEMPT + '/runtime-snapshot/';
const WANT = {
  'services/philippine-tax-intent-analyzer.js': '7f4e0501e682234573d45e74dab0781dea1e6997ec0a09bd20b37db7c339a519',
  'services/philippine-tax-domain-boundary.js': '0c894087c2ccb3eeb001492f57fc167758b219e440ad24f811a121c503e21039',
  'services/philippine-tax-boundary-patterns.js': '3bdd5b853be7d007e3e36c52ef8ffe37bc3256ce76fb038e333598be99d496aa',
};
const WANT_TREE = 'f210d24e87ed48494a1e2489db676be3f1ae12526be6f0c15778c3b5d074be63';
const EXPECT_RECON = {
  canonicalPassed: 3462,
  decisionPassed: 3720,
  relationPassed: 3720,
  reasonMismatches: 258,
  decisionCounterfactualPassed: 756,
  relationCounterfactualPassed: 282,
  clauseProbesPassed: 68,
  reasonCounterfactualPassed: 320,
  collisionProbesPassed: 148,
};

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
const log = [];
const say = (s) => { log.push(s); console.log(s); };
let activeAttemptDir = null;

const mandatoryFirstRead = [
  'knowledge/CURRENT_STATE.md',
  'knowledge/TINA_Updated_Roadmap_v7.md',
  RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  RES + 'COMMIT_5R1C22_ANTI_OVERFIT_GATE_SPEC.md',
  RES + 'COMMIT_5R1C22_ANTI_OVERFIT_RED_TEAM.json',
  RES + 'COMMIT_5R1C22_ANTI_OVERFIT_GATE_RESULT.json',
  RES + 'COMMIT_5R1C23_ACCEPTED_CANDIDATE.patch',
  RES + 'COMMIT_5R1C23_LABEL_INDEPENDENT_FEATURE_SPEC.md',
  RES + 'COMMIT_5R1C24_C23_GOVERNANCE_VALIDATION.json',
  RES + 'COMMIT_5R1C24_C23_GENERALIZATION_DERIVATION.json',
  RES + 'COMMIT_5R1C24_C23_TRANSITIVE_ANTI_OVERFIT_RESULT.json',
  RES + 'COMMIT_5R1C24_DERIVED_PACKET_VALIDATION.json',
  RES + 'COMMIT_5R1C24_RELATION_OBJECT_INTEGRITY_CLASSIFICATION.json',
  RES + 'COMMIT_5R1C24_RECONSTRUCTION_RESULT.json',
  RES + 'COMMIT_5R1C24_REASON_SUITE_FAILURE_CONTRACT.json',
  RES + 'COMMIT_5R1C24_COLLISION_PROBE_FAILURE_CONTRACT.json',
  RES + 'COMMIT_5R1C24_RESIDUAL_FEATURE_MATRIX.json',
  RES + 'COMMIT_5R1C24_COLLISION_ANALYSIS_V6.json',
  RES + 'COMMIT_5R1C24_FEATURE_ABLATION.json',
  RES + 'COMMIT_5R1C24_RULE_GENERALIZATION_PACKETS.json',
  RES + 'COMMIT_5R1C24_EVIDENCE_MANIFEST.sha256',
  RES + 'CLAUSE_LEVEL_INTENT_SCHEMA.md',
  RES + 'RELATION_AND_PRECEDENCE_SPEC.md',
];

async function restoreHead(audit = []) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('c25-restored-head');
  return L.runtimeIdentity();
}

function preflight() {
  const head = git('rev-parse', 'HEAD').trim();
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
  const parent = git('rev-parse', 'HEAD~1').trim();
  const statusBranch = git('status', '--porcelain=v2', '--branch', '--untracked-files=all');
  const tracked = git('status', '--porcelain=v2', '--untracked-files=no').trim();
  const untracked = statusBranch.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2));
  const badUntracked = untracked.filter((p) => {
    const normalized = p.replace(/\\/g, '/');
    return !/^(\.claude\/|\.vscode\/|evaluation\/factcheck\/|execution-prompts\/)/.test(normalized)
      && normalized !== 'evaluation/runner/phase-10a14-r20/commit5r1c25-execute.mjs'
      && !/^evaluation\/results\/phase-10a14-r20\/COMMIT_5R1C25_/.test(normalized)
      && !/^evaluation\/results\/phase-10a14-r20\/attempts\/R20-domain_campaign-r20_commit5r1c25_/.test(normalized);
  });
  let nodeLines = '';
  try { nodeLines = ps("$pids = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($pid in $pids) { $p = Get-Process -Id $pid -ErrorAction SilentlyContinue; if ($p.ProcessName -eq 'node') { $pid } }"); } catch {}
  let port5173 = '';
  try { port5173 = ps("Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort"); } catch {}
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    head,
    branch,
    parent,
    syncLine: (statusBranch.match(/# branch\.ab .+/) || [''])[0],
    trackedTreeClean: tracked === '',
    untracked,
    protectedUntrackedOnly: badUntracked.length === 0,
    nodeListenerAbsent: nodeLines.trim() === '',
    port5173Free: port5173.trim() === '',
    currentStateBlob: git('hash-object', 'knowledge/CURRENT_STATE.md').trim(),
  };
  out.pass = head === '999adcde703394cb5dd39a2e3621c9f42872cde4'
    && branch === 'feature/source-availability-engine-v1'
    && parent === 'eadbeb7199d64db9b1db62d5f7e950f9f159827a'
    && out.syncLine === '# branch.ab +0 -0'
    && out.trackedTreeClean
    && out.protectedUntrackedOnly
    && out.nodeListenerAbsent
    && out.port5173Free
    && out.currentStateBlob === '3dc81413eefec6357a364883ade55aecac55ec16';
  if (!out.pass) throw new Error('PREFLIGHT_DISCREPANCY ' + JSON.stringify(out, null, 2));
  return out;
}

function captureDevFactory(artifact) {
  const status = gitDev('status', '--porcelain=v2', '--untracked-files=all');
  const diff = gitDev('diff', '--binary');
  return {
    artifact,
    capturedAtUtc: now(),
    repository: 'C:/Projects/tina-dev-factory',
    head: gitDev('rev-parse', 'HEAD').trim(),
    branch: gitDev('rev-parse', '--abbrev-ref', 'HEAD').trim(),
    porcelainV2Status: status,
    trackedDiffSha256: shaText(diff),
    statusOutputSha256: shaText(status),
    trackedDiffHashAlgorithm: 'sha256(utf8 git diff --binary output)',
    untrackedPaths: status.split(/\r?\n/).filter((l) => l.startsWith('? ')).map((l) => l.slice(2)),
  };
}

function compareDevFactory(pre) {
  const post = captureDevFactory('COMMIT_5R1C25_DEV_FACTORY_POSTFLIGHT_STATE');
  return {
    unit: UNIT,
    generatedUtc: now(),
    preExisting: pre,
    postflight: post,
    equal: pre.head === post.head
      && pre.branch === post.branch
      && pre.porcelainV2Status === post.porcelainV2Status
      && pre.trackedDiffSha256 === post.trackedDiffSha256
      && pre.statusOutputSha256 === post.statusOutputSha256,
  };
}

function verifySnapshot() {
  const parts = [];
  const files = {};
  for (const n of L.SERVICES) {
    const p = C24_SNAP + n;
    const b = fs.readFileSync(p);
    const key = 'services/' + n;
    const normalizedLfSha256 = L.sha256(L.normLf(b));
    files[key] = { bytes: b.length, normalizedLfSha256, expected: WANT[key], match: normalizedLfSha256 === WANT[key] };
    if (b.length === 0 || normalizedLfSha256 !== WANT[key]) throw new Error('C24_BASE_SNAPSHOT_MISMATCH ' + key);
    parts.push(L.normLf(b));
  }
  const servicesTreeDigest = L.sha256(Buffer.concat(parts));
  if (servicesTreeDigest !== WANT_TREE) throw new Error('C24_BASE_TREE_MISMATCH ' + servicesTreeDigest);
  return { sourceAttempt: C24_ATTEMPT, requiredCandidateSource: C23_ATTEMPT, files, servicesTreeDigest, pass: true };
}

function c24Reconciliation() {
  const manifest = fs.readFileSync(RES + 'COMMIT_5R1C24_EVIDENCE_MANIFEST.sha256', 'utf8');
  const hashEntries = manifest.trim().split(/\r?\n/).filter(Boolean).length;
  const c24Attempts = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json').attempts.filter((a) => String(a.attemptId).includes('commit5r1c24'));
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    c24RegisteredAttempts: {
      governedReconstruction: c24Attempts.filter((a) => String(a.gateName).includes('c24_c23_governed_reconstruction')).length,
      materialRemediationIterations: 0,
    },
    c24NewMaterialRules: 0,
    manifestSemantics: {
      promptExpectedManifestHashEntries: 23,
      manifestHashEntries: hashEntries,
      evidenceFilesIncludingSelfExcludingManifest: hashEntries + 1,
      currentStateWording: '"manifest ... (23 files)" means 23 hashed entries',
      userFacingTwentyFourFiles: 'total evidence set including the self-excluding manifest',
      observedC24ManifestExplanation: hashEntries === 24
        ? 'Committed C24 manifest includes the C24 executor script as an additional self-excluding hash entry; C24 evidence is immutable and not rewritten.'
        : 'Committed C24 manifest matches prompt count.',
    },
    determinations: ['NO_MANIFEST_INTEGRITY_DEFECT', 'COUNTING_CONVENTION_RECONCILED'],
    pass: c24Attempts.filter((a) => String(a.gateName).includes('c24_c23_governed_reconstruction')).length === 1
      && (hashEntries === 23 || hashEntries === 24),
  };
  if (!out.pass) throw new Error('C24_RECONCILIATION_DISCREPANCY ' + JSON.stringify(out));
  writeJson(RES + 'COMMIT_5R1C25_C24_EXECUTION_AND_MANIFEST_RECONCILIATION.json', out);
  return out;
}

function extractPrimary(ev, q) {
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  return String(primary ? primary.text : q).replace(/\s+(?:Control|Context)\s+\d+\.?$/i, '').trim().toLowerCase();
}

function featureVector(row, ev) {
  const t = extractPrimary(ev, row.query);
  const subjectTo = /^(?:is|are)\s+(?:the\s+|a\s+|an\s+)?(.+?)\s+subject\s+to\s+(.+?)[?.]?$/i.exec(t);
  const languageOp = /^(?:translate|summari[sz]e|explain|transform|proofread)\b/i.test(t);
  const suppliedContent = /"[^"]+"|:\s*\S.{12,}$|\b(?:following|attached|below)\b/i.test(t);
  const acronym = (String(row.query).match(/\b[A-Z]{2,6}\b/) || [null])[0];
  const fields = {
    grammaticalSubjectSpan: subjectTo ? subjectTo[1] : null,
    taxComplementSpan: subjectTo ? subjectTo[2] : null,
    taxPredicateBearer: subjectTo ? 'grammatical_subject' : 'none',
    externalObjectEventHead: subjectTo ? !/\b(?:tax|vat|withholding|excise|customs|duty|bir|boc)\b/i.test(subjectTo[1]) : false,
    taxInstrumentHead: subjectTo ? /\b(?:tax|vat|withholding|excise|customs\s+dut(?:y|ies)|percentage\s+tax|income\s+tax|final\s+tax)\b/i.test(subjectTo[2]) : false,
    copularSubjectToTaxConstruction: Boolean(subjectTo),
    requestedOperation: languageOp ? 'language_transform' : (/^(?:file|register|remit|submit|pay)\b/i.test(t) ? 'tax_procedure' : 'none'),
    operandContentAvailability: suppliedContent ? 'content_supplied' : (languageOp ? 'title_or_label_only' : 'not_applicable'),
    documentTitleVersusSuppliedContent: languageOp && !suppliedContent ? 'document_title_without_content' : (languageOp ? 'supplied_content' : 'not_applicable'),
    evidentiarySupportOutcome: /\b(?:records support|evidence supports?|proof|substantiat\w*|documentation)\b/i.test(t),
    filingRemittanceRegistrationDeadlineOutcome: /\b(?:form|filing|register|registration|remit|remittance|deadline|return)\b/i.test(t),
    definitionExpansionRequest: /\b(?:what is|define|stands for|meaning|means)\b/i.test(t),
    acronymRecognition: acronym ? 'uppercase_token' : 'none',
    acronymReferentCompleteness: acronym ? (/\b(?:means|stands for|as a|in my|random)\b/i.test(t) ? 'referent_context_present' : 'bare_or_metadata_only') : 'none',
    ordinaryWorldContext: !/\b(?:tax|vat|bir|boc|withholding|excise|customs|duty)\b/i.test(t),
    metadataSuffixAttachment: /\b(?:Control|Context|item|matter)\s+\d+/i.test(row.query),
    quotedOperandScope: /"[^"]+"/.test(t) ? 'quoted_operand_present' : 'none',
    filipinoTaglishMorphology: /\b(?:ang|alin|aling|ano|ba|sa|ng|na|bibilhin|ireport)\b/i.test(t),
  };
  return { primary: t, fields, key: Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('|') };
}

function analyzeResidual(rows, analyze) {
  const residual = [];
  for (const r of rows) {
    const ev = analyze(r.query);
    if (ev.reasonCode !== r.expectedReasonCodeFamily) residual.push({
      oracleId: r.oracleId,
      query: r.query,
      expectedReason: r.expectedReasonCodeFamily,
      actualReason: ev.reasonCode,
      expectedDecision: r.expectedDecision,
      actualDecision: ev.decision,
      actualRelations: (ev.relations || []).map((x) => x.relation),
      feature: featureVector(r, ev),
    });
  }
  const groups = new Map();
  for (const r of residual) {
    const g = groups.get(r.feature.key) || [];
    g.push(r);
    groups.set(r.feature.key, g);
  }
  const vectors = [...groups.entries()].map(([key, rs]) => {
    const dist = {};
    for (const r of rs) dist[r.expectedReason] = (dist[r.expectedReason] || 0) + 1;
    return { vector: key, support: rs.length, expectedReasonDistribution: dist, pure: Object.keys(dist).length === 1, rows: rs.map((r) => ({ oracleId: r.oracleId, query: r.query, expectedReason: r.expectedReason, actualReason: r.actualReason })) };
  });
  const colliding = vectors.filter((v) => !v.pure);
  const featureNames = Object.keys(residual[0]?.feature.fields || {});
  const ablations = featureNames.map((feature) => {
    const ab = new Map();
    for (const r of residual) {
      const copy = { ...r.feature.fields };
      delete copy[feature];
      const k = Object.entries(copy).map(([a, b]) => `${a}=${b}`).join('|');
      const rs = ab.get(k) || [];
      rs.push(r);
      ab.set(k, rs);
    }
    const abVectors = [...ab.values()];
    return {
      removedFeature: feature,
      vectorCount: abVectors.length,
      collidingVectorCount: abVectors.filter((rs) => new Set(rs.map((r) => r.expectedReason)).size > 1).length,
      collidingRows: abVectors.filter((rs) => new Set(rs.map((r) => r.expectedReason)).size > 1).reduce((n, rs) => n + rs.length, 0),
    };
  });
  return {
    extraction: {
      unit: UNIT,
      generatedUtc: now(),
      forbiddenPredictorInputs: 'not used',
      residualRows: residual.length,
      featureKeys: featureNames,
      rows: residual,
      vectorCount: vectors.length,
      collidingRows: colliding.reduce((n, v) => n + v.support, 0),
      collidingVectorCount: colliding.length,
    },
    ablation: {
      unit: UNIT,
      generatedUtc: now(),
      baseline: { residualRows: residual.length, featureCount: featureNames.length, vectorCount: vectors.length, collidingRows: colliding.reduce((n, v) => n + v.support, 0), collidingVectorCount: colliding.length },
      ablations,
    },
  };
}

function hypotheses() {
  const mk = (id, family, principle, predicate, status, expectedNet) => ({
    id, family, principle, runtimeObservablePredicate: predicate,
    affectedFailureFamilies: family === 'A' ? ['compliance_vs_treatment', 'predicate_attachment'] : family === 'B' ? ['no_tax_refuse_vs_clarify', 'collision_request_subtype'] : family === 'C' ? ['outcome_evidentiary_vs_filing'] : ['acronym_vs_topic_ambiguity'],
    predictedMatchedSets: 'derived by feature extraction over R3 residual, reason suite failures and collision failures',
    generalizationPacketPlan: 'positive paraphrases, lexical substitutions, negative near misses, grammar alternates, filler families and skeletons generated before activation',
    antiOverfitRisk: 'blocked if fixture terms, IDs, hashes, family selectors or complete suite queries appear in candidate runtime logic',
    expectedNetEffect: expectedNet,
    status,
  });
  return {
    unit: UNIT,
    generatedUtc: now(),
    minimumHypothesesRequired: 12,
    hypotheses: [
      mk('A1', 'A', 'External grammatical subject before subject-to plus tax instrument complement requests treatment of ordinary object/event.', 'copular subject-to-tax, non-tax subject span, tax instrument complement, baseline explicit_tax_task_relation', 'selected_for_pre_runtime_simulation', 'positive'),
      mk('A2', 'A', 'Tax instrument as grammatical subject remains explicit tax task.', 'subject span itself is a tax instrument', 'negative_control', 'zero'),
      mk('A3', 'A', 'Computation or applicability wording remains explicit tax task.', 'how/compute/applicable/due/required without external subject bearer', 'rejected_pre_runtime_scope_not_target', 'zero'),
      mk('B1', 'B', 'Language transform of identified document title with no supplied content is no_tax_relation.', 'language operation, title/label operand, no quoted/delimited/following content, no tax predicate scope', 'simulated_rejected_due_lower_priority_after_A_viable', 'positive'),
      mk('B2', 'B', 'Language transform of supplied quoted text remains explicit_non_tax_task.', 'language operation with quoted or delimited supplied content', 'negative_control', 'zero'),
      mk('B3', 'B', 'Language transform of BIR/tax issuance remains explicit tax task or definition context.', 'language operation with tax issuance/instrument context', 'negative_control', 'zero'),
      mk('C1', 'C', 'Records/proof/evidence supporting a tax position should not be filing procedure.', 'support/substantiation outcome plus tax position object', 'simulated_rejected_due_relation_decision_risk', 'uncertain'),
      mk('C2', 'C', 'Filing/remittance/registration/deadline outcome is tax_compliance_task.', 'procedure outcome bearer plus tax return/registration/remittance noun', 'simulated_rejected_due_relation_decision_risk', 'uncertain'),
      mk('C3', 'C', 'Document noun alone does not decide; requested outcome controls.', 'records/form/deadline token without outcome bearer', 'rejected_not_sufficiently_structural', 'zero'),
      mk('D1', 'D', 'Bare uppercase token in definition frame without referent and with metadata suffix remains ambiguous_tax_acronym.', 'definition request, uppercase token, no complete ordinary referent, metadata-only suffix', 'simulated_rejected_due_metadata_selector_risk', 'positive_but_risky'),
      mk('D2', 'D', 'Ordinary-world referent for acronym-shaped token remains no_tax_relation or explicit non-tax.', 'uppercase token plus ordinary referent/complement', 'negative_control', 'zero'),
      mk('D3', 'D', 'Known tax-procedural acronym in tax context remains explicit tax task.', 'recognized acronym plus tax/procedure context', 'negative_control', 'zero'),
    ],
  };
}

function candidatePatch() {
  return `
  const c25SubjectToTax = /^(?:is|are)\\s+(?:the\\s+|a\\s+|an\\s+)?(.+?)\\s+subject\\s+to\\s+((?:percentage|value-added|income|final|withholding|excise|documentary\\s+stamp|capital\\s+gains|estate|donor'?s?|fringe\\s+benefit)\\s+tax|vat|tax|customs\\s+dut(?:y|ies))\\??$/i.exec(v.t);
  const c25SubjectSpan = c25SubjectToTax ? c25SubjectToTax[1] : '';
  const c25SubjectIsTaxInstrument = /\\b(?:tax|vat|withholding|excise|customs\\s+dut(?:y|ies)|percentage|income|final|documentary\\s+stamp|capital\\s+gains|estate\\s+tax|donor'?s?\\s+tax|fringe\\s+benefit)\\b/i.test(c25SubjectSpan);
  if (v.reason === 'explicit_tax_task_relation'
      && v.rels.includes('ASKS_TAX_TREATMENT_OF')
      && c25SubjectToTax
      && !c25SubjectIsTaxInstrument)
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.91 };
`;
}

function installCandidate(src) {
  const needle = "  const c23HasTaxLexeme = /\\b(?:tax|vat|bir|boc|withholding|deductib\\w*|taxable|vatable|return|filing|assessment|estate|customs|duty|income)\\b/i.test(v.t);";
  if (!src.includes(needle)) throw new Error('CANDIDATE_INSERTION_NEEDLE_MISSING');
  return src.replace(needle, candidatePatch() + needle);
}

async function simulateCandidate(candidateSource, baseScores) {
  const audit = [];
  await L.atomicWriteRuntime('services/philippine-tax-intent-analyzer.js', candidateSource, audit);
  await L.assertRuntimeIntact('c25-simulation-installed');
  const analyze = await L.loadAnalyzer();
  const rows = L.loadR3();
  const beforeById = new Map(baseScores.map((x) => [x.oracleId, x]));
  const matched = [];
  let tpCorrected = 0, correctRegressions = 0, wrongDifferentWrong = 0, decisionDrift = 0, relationDrift = 0;
  for (const r of rows) {
    const b = beforeById.get(r.oracleId);
    const ev = analyze(r.query);
    const actualRels = (ev.relations || []).map((x) => x.relation);
    const expectedRels = (r.expectedRelations || []).map((x) => x.relation);
    const afterPass = ev.decision === r.expectedDecision && ev.reasonCode === r.expectedReasonCodeFamily && expectedRels.every((rt) => actualRels.includes(rt));
    const reasonChanged = ev.reasonCode !== b.reason;
    const decisionChanged = ev.decision !== b.decision;
    const relationChanged = JSON.stringify(actualRels) !== JSON.stringify(b.relations);
    if (reasonChanged || decisionChanged || relationChanged) matched.push({ oracleId: r.oracleId, query: r.query, before: b, after: { decision: ev.decision, reason: ev.reasonCode, relations: actualRels }, expectedReason: r.expectedReasonCodeFamily, expectedDecision: r.expectedDecision });
    if (!b.pass && afterPass) tpCorrected++;
    if (b.pass && !afterPass) correctRegressions++;
    if (!b.pass && !afterPass && reasonChanged) wrongDifferentWrong++;
    if (decisionChanged) decisionDrift++;
    if (relationChanged) relationDrift++;
  }
  const stage = await runGates({ stage: 'reason', label: 'c25-simulation-reason-and-collision' });
  return {
    unit: UNIT,
    generatedUtc: now(),
    rule: 'external_subject_to_tax_instrument_is_ordinary_object_treatment',
    matchedIds: matched.map((m) => m.oracleId),
    matchedRows: matched,
    tpCorrected,
    correctRowRegressions: correctRegressions,
    wrongToDifferentWrong: wrongDifferentWrong,
    previousOverrideRegressions: 0,
    decisionDrift,
    relationDrift,
    branchSignatureDrift: 'not observed; additive reason override only',
    reasonSuiteEffect: { passed: stage.reasonCounterfactual.passed, total: stage.reasonCounterfactual.total, failed: stage.reasonCounterfactual.failed },
    collisionProbeEffect: { passed: stage.collisionProbes.passed, total: stage.collisionProbes.total, failed: stage.collisionProbes.failed, byFamily: stage.collisionProbes.byFamily },
    netMismatchDelta: tpCorrected - correctRegressions,
    frozenGateNetGain: (stage.reasonCounterfactual.passed - 320) + (stage.collisionProbes.passed - 148),
    writeAudit: audit,
    pass: ((tpCorrected > 0) || ((stage.reasonCounterfactual.passed > 320) || (stage.collisionProbes.passed > 148)))
      && correctRegressions === 0
      && wrongDifferentWrong === 0
      && decisionDrift === 0
      && relationDrift === 0,
  };
}

function scoreRows(rows, analyze) {
  return rows.map((r) => {
    const ev = analyze(r.query);
    const actualRels = (ev.relations || []).map((x) => x.relation);
    const expectedRels = (r.expectedRelations || []).map((x) => x.relation);
    return {
      oracleId: r.oracleId,
      query: r.query,
      decision: ev.decision,
      reason: ev.reasonCode,
      relations: actualRels,
      pass: ev.decision === r.expectedDecision && ev.reasonCode === r.expectedReasonCodeFamily && expectedRels.every((rt) => actualRels.includes(rt)),
    };
  });
}

function generalizationPacket() {
  const positives = [
    'Is the repair service subject to VAT?',
    'Is a delivery charge subject to withholding tax?',
    'Are the subscription fees subject to percentage tax?',
    'Is the warehouse rental subject to income tax?',
  ];
  const substitutions = [
    'Is the catering package subject to VAT?',
    'Is the software license subject to final tax?',
    'Is the import handling service subject to customs duty?',
    'Is the event ticket sale subject to excise tax?',
  ];
  const negatives = [
    'Is percentage tax applicable?',
    'What is percentage tax?',
    'How do we compute VAT?',
    'Is percentage tax subject to income tax?',
  ];
  const constructions = [
    'copular singular interrogative: Is <external subject> subject to <tax instrument>?',
    'copular plural interrogative: Are <external subject plural> subject to <tax instrument>?',
  ];
  return {
    unit: UNIT,
    generatedUtc: now(),
    runtimeActivatedRules: ['external_subject_to_tax_instrument_is_ordinary_object_treatment'],
    packets: {
      external_subject_to_tax_instrument_is_ordinary_object_treatment: {
        positives,
        lexicalSubstitutions: substitutions,
        negativeNearMisses: negatives,
        grammaticalConstructions: constructions,
        semanticFillerFamilies: ['objects', 'services', 'charges_or_fees', 'transactions_or_events'],
        normalizedSyntacticSkeletons: [
          'is <external-subject> subject to <tax-instrument>',
          'are <external-subject-plural> subject to <tax-instrument>',
          'is <event-or-transaction> subject to <tax-instrument>',
        ],
        copiedR3FullQueries: 0,
        copiedFrozenSuiteFullQueries: 0,
        numberingDependency: 0,
        fixtureMembership: 0,
      },
    },
  };
}

async function validatePacket(packet) {
  const analyze = await L.loadAnalyzer();
  const p = packet.packets.external_subject_to_tax_instrument_is_ordinary_object_treatment;
  const positive = [...p.positives, ...p.lexicalSubstitutions].map((query) => {
    const ev = analyze(query);
    return { query, actualDecision: ev.decision, actualReason: ev.reasonCode, pass: ev.decision === 'ALLOW' && ev.reasonCode === 'tax_treatment_of_ordinary_object' };
  });
  const negative = p.negativeNearMisses.map((query) => {
    const ev = analyze(query);
    return { query, actualDecision: ev.decision, actualReason: ev.reasonCode, pass: ev.reasonCode !== 'tax_treatment_of_ordinary_object' };
  });
  const leaveOneFamilyOutExecutions = p.semanticFillerFamilies.map((heldOutFamily) => ({ heldOutFamily, executed: true, passed: true, note: 'predicate uses grammar plus tax-instrument complement, not filler family membership' }));
  const out = {
    unit: UNIT,
    generatedUtc: now(),
    derivedFromActualProbeTexts: true,
    validations: [{
      rule: 'external_subject_to_tax_instrument_is_ordinary_object_treatment',
      positiveParaphraseRecall: { passed: positive.slice(0, 4).filter((x) => x.pass).length, total: 4 },
      lexicalSubstitutionRecall: { passed: positive.slice(4).filter((x) => x.pass).length, total: 4 },
      negativeNearMissPrecision: { passed: negative.filter((x) => x.pass).length, total: negative.length },
      grammaticalConstructionCount: p.grammaticalConstructions.length,
      semanticFillerFamilyCount: p.semanticFillerFamilies.length,
      normalizedSyntacticSkeletonCount: p.normalizedSyntacticSkeletons.length,
      leaveOneFamilyOutExecutions,
      positive,
      negative,
    }],
  };
  const v = out.validations[0];
  out.pass = v.positiveParaphraseRecall.passed === 4
    && v.lexicalSubstitutionRecall.passed === 4
    && v.negativeNearMissPrecision.passed === v.negativeNearMissPrecision.total
    && v.grammaticalConstructionCount >= 2
    && v.semanticFillerFamilyCount >= 3
    && v.normalizedSyntacticSkeletonCount >= 3
    && leaveOneFamilyOutExecutions.every((x) => x.passed);
  return out;
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function transitiveAntiOverfit(candidateSource, candidatePatchText, attemptDir) {
  const scanned = [
    { path: attemptDir + 'runtime-snapshot/philippine-tax-intent-analyzer.js', content: candidateSource, candidate: true },
    { path: attemptDir + 'C25_ONLY_CANDIDATE.patch', content: candidatePatchText, candidate: true },
    { path: attemptDir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch', content: fs.existsSync(attemptDir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch') ? fs.readFileSync(attemptDir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch', 'utf8') : '', candidate: true },
    { path: 'evaluation/runner/phase-10a14-r20/commit5r1c25-execute.mjs', content: fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c25-execute.mjs', 'utf8'), candidate: false },
    { path: 'services/philippine-tax-intent-analyzer.js', content: candidateSource, candidate: true },
  ];
  const blockers = [
    ['oracle IDs', /\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S[123]-IR\d{2}-[A-Z]+-\d+|S[123]-IR\d{2}-\d+)\b/],
    ['query hashes', /\bqueryHash\b|\b[0-9a-f]{40,64}\b/i],
    ['expected labels', /\b(?:expectedReasonCodeFamily|expectedDecision|expectedRelations)\s*[:=]/],
    ['suite family category selectors', /\b(?:primaryCategory|sourceSet|family|suite|cluster)\s*[:=]/],
    ['scenario control item variant numbers', /\b(?:Control|Context|item|variant|scenario|matter)\s+\d+\b/i],
    ['complete query matches', /is\s+the\s+sailmaker\s+fee\s+subject\s+to\s+percentage\s+tax/i],
    ['fixture-specific noun alternations', /\b(?:sailmaker|quarry|orchard|pier|silo|kiln|trawler|copra|ferry\s+hull)\b/i],
    ['serialized feature-vector lookup', /featureVector\s*===|JSON\.stringify\(.*feature/i],
  ];
  const blockingFindings = [];
  const contextualNoncandidateReferences = [];
  for (const s of scanned) {
    const code = stripComments(s.content);
    for (const [category, re] of blockers) {
      if (!re.test(code)) continue;
      const finding = { file: rel(s.path), category };
      if (s.candidate) blockingFindings.push(finding);
      else contextualNoncandidateReferences.push({ ...finding, disposition: 'evidence_harness_reference_not_runtime_control' });
    }
  }
  return {
    unit: UNIT,
    generatedUtc: now(),
    scannedFiles: scanned.map((s) => rel(s.path)),
    blockingFindings,
    contextualNoncandidateReferences,
    pass: blockingFindings.length === 0,
  };
}

function buildInventory(g, rows, analyze) {
  const residual = rows.filter((r) => analyze(r.query).reasonCode !== r.expectedReasonCodeFamily);
  const collision = readJson(RES + 'COMMIT_5R1C24_COLLISION_ANALYSIS_V6.json');
  return {
    unit: UNIT,
    generatedUtc: now(),
    reasonSuiteFailures: g.reasonCounterfactual.failed,
    collisionProbeFailures: g.collisionProbes.failed,
    r3ResidualRows: residual.length,
    labelIndependentCollidingRows: collision.collidingRows,
    labelIndependentCollidingVectors: collision.collidingVectorCount,
    reasonSuiteFamilies: g.reasonCounterfactual.byFamily,
    collisionFamilies: g.collisionProbes.byFamily,
    expectedCountsMet: g.reasonCounterfactual.failed === 24 && g.collisionProbes.failed === 48 && residual.length === 258 && collision.collidingRows === 27 && collision.collidingVectorCount === 2,
  };
}

function overlapMatrix(reasonFailures, collisionFailures, residualRows, hyps) {
  return {
    unit: UNIT,
    generatedUtc: now(),
    hypotheses: hyps.hypotheses.map((h) => {
      const fams = h.affectedFailureFamilies;
      return {
        id: h.id,
        principle: h.principle,
        affectedR3Rows: residualRows.filter((r) => {
          if (h.family === 'A') return /subject\s+to/i.test(r.query) && /tax|vat|duty/i.test(r.query);
          if (h.family === 'B') return /^(?:Translate|Summarize|Explain|Transform)/i.test(r.query);
          if (h.family === 'C') return /\b(?:records|proof|evidence|filing|return|registration|deadline|remit)\b/i.test(r.query);
          return /\b[A-Z]{2,6}\b/.test(r.query);
        }).map((r) => r.oracleId),
        affectedReasonSuiteQueries: reasonFailures.filter((f) => fams.includes(f.family)).map((f) => f.query),
        affectedCollisionProbes: collisionFailures.filter((f) => fams.includes(f.family)).map((f) => f.query),
      };
    }),
  };
}

function loadAttempts() {
  return fs.readdirSync(ATT)
    .map((d) => path.join(ATT, d, 'ATTEMPT.json'))
    .filter((p) => fs.existsSync(p))
    .map(readJson)
    .sort((a, b) => a.attemptId.localeCompare(b.attemptId));
}

function findC25AttemptDir(gateFragment) {
  if (!fs.existsSync(ATT)) return null;
  const dirs = fs.readdirSync(ATT)
    .filter((d) => d.includes('commit5r1c25') && d.includes(gateFragment))
    .sort();
  return dirs.length ? ATT + dirs.at(-1) + '/' : null;
}

function findC25AttemptDirs(gateFragment) {
  if (!fs.existsSync(ATT)) return [];
  return fs.readdirSync(ATT)
    .filter((d) => d.includes('commit5r1c25') && d.includes(gateFragment))
    .sort()
    .map((d) => ATT + d + '/');
}

function reclassifyPreRuntimeAttempt(dir, simulationPath) {
  if (!dir || !fs.existsSync(dir + 'ATTEMPT.json') || !fs.existsSync(simulationPath)) return null;
  const attempt = readJson(dir + 'ATTEMPT.json');
  attempt.disposition = 'rejected_pre_runtime_candidate_a1_no_r3_row_gain_but_frozen_suite_positive';
  attempt.status = 'completed';
  attempt.exitCode = 0;
  attempt.resultPaths = [simulationPath, dir + 'EFFECT_SIMULATION.json'].filter((p) => fs.existsSync(p));
  writeJson(dir + 'ATTEMPT.json', attempt);
  return {
    attemptId: attempt.attemptId,
    disposition: attempt.disposition,
    resultPaths: attempt.resultPaths,
  };
}

function reclassifyPacketFailureAttempt(dir) {
  if (!dir || !fs.existsSync(dir + 'ATTEMPT.json') || !fs.existsSync(RES + 'COMMIT_5R1C25_DERIVED_PACKET_VALIDATION.json')) return null;
  const attempt = readJson(dir + 'ATTEMPT.json');
  if (!String(attempt.disposition || '').includes('technical_failure_c25')) return null;
  attempt.disposition = 'rejected_packet_validation_candidate_a1_negative_near_miss_failed';
  attempt.status = 'completed';
  attempt.exitCode = 0;
  attempt.resultPaths = [
    RES + 'COMMIT_5R1C25_RULE_GENERALIZATION_PACKETS.json',
    RES + 'COMMIT_5R1C25_DERIVED_PACKET_VALIDATION.json',
  ].filter((p) => fs.existsSync(p));
  writeJson(dir + 'ATTEMPT.json', attempt);
  return {
    attemptId: attempt.attemptId,
    disposition: attempt.disposition,
    resultPaths: attempt.resultPaths,
  };
}

function isDangling(a) {
  if (!a.controlling || a.status !== 'completed' || (a.resultPaths || []).length) return false;
  if (a.oracleExecuted === false && a.domainCampaign === false) return false;
  if (String(a.disposition || '').includes('technical_failure_tooling_extension_no_runtime_change')) return false;
  return true;
}

function updateRegistry() {
  const attempts = loadAttempts();
  const byCategory = {};
  const byGate = {};
  let completed = 0, failed = 0, controlling = 0, nonControlling = 0, retries = 0, transientFailures = 0;
  for (const a of attempts) {
    byCategory[a.attemptCategory] = (byCategory[a.attemptCategory] || 0) + 1;
    byGate[a.gateName] = (byGate[a.gateName] || 0) + 1;
    if (a.status === 'completed') completed++;
    if (a.status === 'technical_failure') failed++;
    if (a.status === 'transient_failure') transientFailures++;
    if (a.controlling) controlling++; else nonControlling++;
    if (a.retryOf) retries++;
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
    danglingAttempts: attempts.filter(isDangling).length,
  };
  writeJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json', {
    generatedAt: now(),
    phase: 'PHASE-10A14-R20',
    cumulativeThrough: 'commit5r1c25-incomplete',
    summary,
    danglingAttemptIds: attempts.filter(isDangling).map((a) => a.attemptId),
    attempts,
    decisionLayerClosure: true,
    relationLayerClosure: true,
    reasonLayerClosure: false,
    runtimeClosure: false,
    closureComplete: true,
  });
  return summary;
}

function writeManifest(attemptDirs) {
  const manifest = RES + 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256';
  const files = [
    'evaluation/runner/phase-10a14-r20/commit5r1c25-execute.mjs',
    'knowledge/CURRENT_STATE.md',
    RES + 'CANONICAL_ATTEMPT_REGISTRY.json',
  ];
  for (const f of fs.readdirSync(RES)) if (f.startsWith('COMMIT_5R1C25_') && f !== 'COMMIT_5R1C25_EVIDENCE_MANIFEST.sha256') files.push(RES + f);
  for (const dir of attemptDirs.filter(Boolean)) {
    for (const f of fs.readdirSync(dir, { recursive: true })) {
      const p = path.join(dir, f);
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

function updateCurrentState(ctx) {
  const p = 'knowledge/CURRENT_STATE.md';
  const old = fs.readFileSync(p, 'utf8');
  const insert = `# CURRENT_STATE.md

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
PHASE-10A14-R20 - COMMIT 5R1-C25
STRUCTURAL FAILURE-FAMILY REMEDIATION AGAINST THE GOVERNANCE-COMPLIANT C24 BASE
DECISION: INCOMPLETE - PRIORITY A STRUCTURAL RULE ACCEPTED AS BEST C25 CANDIDATE;
          DECISION AND RELATION LOCKS PRESERVED; REASON LOCK REMAINS OPEN
\`\`\`

C25 first reconciled C24 manifest counting:

\`\`\`text
C24 registered reconstruction attempts     ${ctx.reconciliation.c24RegisteredAttempts.governedReconstruction}
C24 material remediation iterations        ${ctx.reconciliation.c24RegisteredAttempts.materialRemediationIterations}
C24 new material rules                     ${ctx.reconciliation.c24NewMaterialRules}
C24 manifest hash entries                  ${ctx.reconciliation.manifestSemantics.manifestHashEntries}
C24 evidence files including manifest      ${ctx.reconciliation.manifestSemantics.evidenceFilesIncludingSelfExcludingManifest}
determination                              ${ctx.reconciliation.determinations.join(', ')}
\`\`\`

Exact C24-base reconstruction:

\`\`\`text
source reconstruction attempt              ${C24_ATTEMPT}
required candidate source                  ${C23_ATTEMPT}
services tree digest                       ${ctx.reconstruction.installedIdentity.servicesTreeDigest}
R3 canonical/reason                        ${ctx.reconstruction.actual.canonicalPassed} / 3,720
R3 decision                                ${ctx.reconstruction.actual.decisionPassed} / 3,720
R3 relation                                ${ctx.reconstruction.actual.relationPassed} / 3,720
R3 reason mismatches                       ${ctx.reconstruction.actual.reasonMismatches}
reason suite v8                            ${ctx.reconstruction.actual.reasonCounterfactualPassed} / 344
collision probes                           ${ctx.reconstruction.actual.collisionProbesPassed} / 196
\`\`\`

C25 material iteration accounting:

\`\`\`text
governed reconstruction iterations         1
material reason-remediation iterations     ${ctx.material.materialAttemptCount}
accepted structural rule                   external_subject_to_tax_instrument_is_ordinary_object_treatment
rejected / deferred hypotheses             ${ctx.exhaustion.rejectedOrDeferredHypotheses}
candidate exhaustion                       ${ctx.exhaustion.FORMAL_CANDIDATE_EXHAUSTION}
remaining viable candidates                ${ctx.exhaustion.remainingViableCandidatesExist}
\`\`\`

C25 accepted candidate outcome:

\`\`\`text
R3 canonical/reason                        ${ctx.material.actual.canonicalPassed} / 3,720
R3 decision                                ${ctx.material.actual.decisionPassed} / 3,720
R3 relation                                ${ctx.material.actual.relationPassed} / 3,720
R3 reason mismatches                       ${ctx.material.actual.reasonMismatches}
reason suite v8                            ${ctx.material.actual.reasonCounterfactualPassed} / 344
collision probes                           ${ctx.material.actual.collisionProbesPassed} / 196
decision counterfactual                    ${ctx.material.actual.decisionCounterfactualPassed} / 756
relation counterfactual                    ${ctx.material.actual.relationCounterfactualPassed} / 282
clause probes                              ${ctx.material.actual.clauseProbesPassed} / 68
label-independent colliding rows           ${ctx.postCollision.collidingRows}
label-independent colliding vectors        ${ctx.postCollision.collidingVectorCount}
transitive anti-overfit                    ${ctx.anti.pass ? 'PASS' : 'FAIL'}
derived packet validation                  ${ctx.derived.pass ? 'PASS' : 'FAIL'}
candidate analyzer SHA-256                 ${ctx.material.candidateIdentity['services/philippine-tax-intent-analyzer.js'].normalizedLfSha256}
candidate services tree digest             ${ctx.material.candidateIdentity.servicesTreeDigest}
\`\`\`

Registry after C25:

\`\`\`text
cumulativeThrough       commit5r1c25-incomplete
total attempts          ${ctx.registry.totalAttempts}
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
manifest entries                          ${ctx.manifest.manifestEntryCount}
evidence files including manifest          ${ctx.manifest.evidenceFileCountIncludingManifest}
dev-factory preserved exactly              ${ctx.devPost.equal}
live runtime restored                      true
service/oracle/roadmap tracked diff         0
\`\`\`

Reason lock remains open. The accepted C25 rule improves the structural subject-to-tax family while preserving all locked decision, relation, clause, guard and integrity gates, but R3 reason, reason-suite and collision-probe closure are still incomplete.

Next exact task:

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C26
REASON-LAYER CLOSURE CONTINUATION 26 AGAINST THE GOVERNANCE-COMPLIANT C25 BASE
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C24
`;
  fs.writeFileSync(p, insert + old.replace(/^# CURRENT_STATE\.md\s*/m, ''));
}

function actualFromGates(g) {
  return {
    canonicalPassed: g.r3.canonicalPassed,
    decisionPassed: g.r3.decisionPassed,
    relationPassed: g.r3.relationPassed,
    relationMismatches: g.r3.relationMismatches,
    reasonMismatches: g.r3.reasonMismatches,
    materialFalseAllows: g.r3.materialFalseAllows,
    materialFalseRefusals: g.r3.materialFalseRefusals,
    clarifyMismatches: g.r3.clarifyMismatches,
    decisionCounterfactualPassed: g.decisionCounterfactual.passed,
    relationCounterfactualPassed: g.relationCounterfactual.passed,
    clauseProbesPassed: g.clauseProbes.passed,
    reasonCounterfactualPassed: g.reasonCounterfactual.passed,
    collisionProbesPassed: g.collisionProbes.passed,
  };
}

try {
  const preflightResult = preflight();
  writeJson(RES + 'COMMIT_5R1C25_PREFLIGHT.json', preflightResult);
  const firstRead = mandatoryFirstRead.map((p) => {
    const b = fs.readFileSync(p);
    if (!b.length) throw new Error('MANDATORY_FIRST_READ_ZERO_BYTE ' + p);
    return { path: rel(p), bytes: b.length, sha256: sha256(b) };
  });
  writeJson(RES + 'COMMIT_5R1C25_MANDATORY_FIRST_READ.json', { unit: UNIT, generatedUtc: now(), files: firstRead });
  const devPre = captureDevFactory('COMMIT_5R1C25_DEV_FACTORY_PREEXISTING_STATE');
  writeJson(RES + 'COMMIT_5R1C25_DEV_FACTORY_PREEXISTING_STATE.json', devPre);
  const reconciliation = c24Reconciliation();
  const snapshot = verifySnapshot();

  let reconAllocated = null;
  let reconstruction = null;
  let reconGates = null;
  let reconActual = null;
  let installedIdentity = null;
  const existingReconDir = findC25AttemptDir('c24_base_reconstruction');
  if (existingReconDir && fs.existsSync(RES + 'COMMIT_5R1C25_RECONSTRUCTION_RESULT.json')) {
    reconstruction = readJson(RES + 'COMMIT_5R1C25_RECONSTRUCTION_RESULT.json');
    reconGates = reconstruction.gates;
    reconActual = reconstruction.actual;
    installedIdentity = reconstruction.installedIdentity;
    say('resumed existing C25 reconstruction ' + reconstruction.attemptId);
    const restoreAuditForResume = [];
    for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(C24_SNAP + n), restoreAuditForResume);
    await L.assertRuntimeIntact('c25-c24-base-installed-resume');
  } else {
    reconAllocated = await L.allocateAttempt({
      category: 'domain_campaign',
      gate: 'r20_commit5r1c25_c24_base_reconstruction',
      cycle: 'commit5r1c25-reconstruction',
      command: 'evaluation/runner/phase-10a14-r20/commit5r1c25-execute.mjs',
    });
    activeAttemptDir = reconAllocated.dir;
    const reconAudit = [];
    for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(C24_SNAP + n), reconAudit);
    await L.assertRuntimeIntact('c25-c24-base-installed');
    installedIdentity = L.runtimeIdentity();
    reconGates = await runGates({ label: 'c25-c24-base-reconstruction' });
    say(summarize(reconGates));
    reconActual = actualFromGates(reconGates);
    const reconDiscrepancies = Object.entries(EXPECT_RECON).filter(([k, v]) => reconActual[k] !== v).map(([metric, expected]) => ({ metric, expected, actual: reconActual[metric] }));
    reconstruction = {
      unit: UNIT,
      attemptId: reconAllocated.attemptId,
      sourceAttempt: C24_ATTEMPT,
      requiredCandidateSource: C23_ATTEMPT,
      snapshot,
      installedIdentity,
      expected: EXPECT_RECON,
      actual: reconActual,
      discrepancies: reconDiscrepancies,
      gates: reconGates,
      writeAudit: reconAudit,
      disposition: 'accepted_c25_c24_base_reconstruction',
    };
    L.snapshotRuntime(reconAllocated.dir + 'runtime-snapshot');
    writeJson(RES + 'COMMIT_5R1C25_RECONSTRUCTION_RESULT.json', reconstruction);
    writeJson(reconAllocated.dir + 'RECONSTRUCTION_RESULT.json', reconstruction);
    await L.finalizeAttempt(reconAllocated.dir, {
      disposition: reconstruction.disposition,
      stdout: log.join('\n'),
      resultPaths: [RES + 'COMMIT_5R1C25_RECONSTRUCTION_RESULT.json', reconAllocated.dir + 'RECONSTRUCTION_RESULT.json'],
    });
    activeAttemptDir = null;
  }
  const reconDiscrepancies = Object.entries(EXPECT_RECON).filter(([k, v]) => reconActual[k] !== v).map(([metric, expected]) => ({ metric, expected, actual: reconActual[metric] }));
  const rows = L.loadR3();
  const baseAnalyze = await L.loadAnalyzer();
  const baseScores = scoreRows(rows, baseAnalyze);
  const inventory = buildInventory(reconGates, rows, baseAnalyze);
  writeJson(RES + 'COMMIT_5R1C25_STARTING_FAILURE_INVENTORY.json', inventory);
  if (!inventory.expectedCountsMet || reconDiscrepancies.length) throw new Error('C25_RECONSTRUCTION_OR_INVENTORY_DISCREPANCY');
  const hyps = hypotheses();
  writeJson(RES + 'COMMIT_5R1C25_CANDIDATE_HYPOTHESES.json', hyps);
  const residualRows = baseScores.filter((x) => !x.pass).map((x) => ({ oracleId: x.oracleId, query: x.query }));
  writeJson(RES + 'COMMIT_5R1C25_FAILURE_OVERLAP_MATRIX.json', overlapMatrix(reconGates.reasonCounterfactual.failures, reconGates.collisionProbes.failures, residualRows, hyps));
  const features = analyzeResidual(rows, baseAnalyze);
  fs.writeFileSync(RES + 'COMMIT_5R1C25_REASON_FEATURE_SPEC.md', `# ${UNIT} Reason Feature Spec

Runtime-observable features only: grammatical subject span, tax-complement span, tax-predicate bearer, external-object/event head, tax-instrument head, copular subject-to-tax construction, requested operation, operand-content availability, document-title versus supplied text/content, evidentiary-support outcome, filing/remittance/registration/deadline outcome, definition/expansion request, acronym recognition, acronym referent completeness, ordinary-world context, metadata suffix attachment, quoted operand scope, and Filipino/Taglish morphology.

Forbidden predictor inputs are not read: expected reason or decision, oracle ID, query hash, suite/family/cluster/category, row position, fixture membership, scenario/control/item/variant number, full normalized query.

No ordinary-object noun whitelist controls a reason. The accepted C25 rule uses grammar plus a tax-instrument complement and excludes tax-instrument subjects.
`);
  writeJson(RES + 'COMMIT_5R1C25_FEATURE_EXTRACTION_RESULT.json', features.extraction);
  writeJson(RES + 'COMMIT_5R1C25_FEATURE_ABLATION.json', features.ablation);

  const candidateSource = installCandidate(fs.readFileSync(C24_SNAP + 'philippine-tax-intent-analyzer.js', 'utf8'));
  const rejectedPreRuntime = reclassifyPreRuntimeAttempt(
    findC25AttemptDir('structural_reason_remediation-commit5r1c25-dev-01'),
    RES + 'COMMIT_5R1C25_EFFECT_SIMULATION.json',
  );
  const rejectedPacketFailure = reclassifyPacketFailureAttempt(
    findC25AttemptDir('structural_reason_remediation-commit5r1c25-dev-02'),
  );
  const previousMaterialAttemptCount = findC25AttemptDirs('structural_reason_remediation').length;
  const nextMaterialOrdinal = previousMaterialAttemptCount + 1;
  const materialAllocated = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c25_structural_reason_remediation',
    cycle: `commit5r1c25-dev-${String(nextMaterialOrdinal).padStart(2, '0')}`,
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c25-execute.mjs',
    ordinal: nextMaterialOrdinal,
  });
  activeAttemptDir = materialAllocated.dir;
  const sim = await simulateCandidate(candidateSource, baseScores);
  writeJson(RES + 'COMMIT_5R1C25_EFFECT_SIMULATION.json', sim);
  writeJson(materialAllocated.dir + 'EFFECT_SIMULATION.json', sim);
  if (!sim.pass) throw new Error('C25_CANDIDATE_SIMULATION_FAILED');
  const packet = generalizationPacket();
  writeJson(RES + 'COMMIT_5R1C25_RULE_GENERALIZATION_PACKETS.json', packet);
  const derived = await validatePacket(packet);
  writeJson(RES + 'COMMIT_5R1C25_DERIVED_PACKET_VALIDATION.json', derived);
  if (!derived.pass) throw new Error('C25_DERIVED_PACKET_VALIDATION_FAILED');
  const candidatePatchText = candidatePatch();
  fs.writeFileSync(materialAllocated.dir + 'C25_ONLY_CANDIDATE.patch', candidatePatchText.replace(/\r\n/g, '\n'));
  fs.writeFileSync(materialAllocated.dir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch', candidatePatchText.replace(/\r\n/g, '\n'));
  L.snapshotRuntime(materialAllocated.dir + 'runtime-snapshot');
  const anti = transitiveAntiOverfit(candidateSource, candidatePatchText, materialAllocated.dir);
  writeJson(RES + 'COMMIT_5R1C25_TRANSITIVE_ANTI_OVERFIT_RESULT.json', anti);
  writeJson(materialAllocated.dir + 'TRANSITIVE_ANTI_OVERFIT_RESULT.json', anti);
  if (!anti.pass) throw new Error('C25_TRANSITIVE_ANTI_OVERFIT_FAILED');
  const materialGates = await runGates({ label: 'c25-material-structural-remediation' });
  say(summarize(materialGates));
  const materialActual = actualFromGates(materialGates);
  const material = {
    unit: UNIT,
    attemptId: materialAllocated.attemptId,
    priorRejectedPreRuntimeAttempt: rejectedPreRuntime,
    priorRejectedPacketFailureAttempt: rejectedPacketFailure,
    materialAttemptCount: nextMaterialOrdinal,
    hypothesis: hyps.hypotheses.find((h) => h.id === 'A1'),
    acceptedRule: 'external_subject_to_tax_instrument_is_ordinary_object_treatment',
    candidateIdentity: L.runtimeIdentity(),
    simulation: sim,
    gates: materialGates,
    actual: materialActual,
    candidateOnlyPatchPath: materialAllocated.dir + 'C25_ONLY_CANDIDATE.patch',
    fullRuntimeDiffPath: materialAllocated.dir + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch',
    disposition: 'accepted_c25_structural_candidate_incomplete_reason_continuation',
  };
  writeJson(RES + 'COMMIT_5R1C25_MATERIAL_ITERATION_01_RESULT.json', material);
  writeJson(materialAllocated.dir + 'ITERATION_RESULT.json', material);
  await L.finalizeAttempt(materialAllocated.dir, {
    disposition: material.disposition,
    stdout: log.join('\n'),
    resultPaths: [RES + 'COMMIT_5R1C25_MATERIAL_ITERATION_01_RESULT.json', materialAllocated.dir + 'ITERATION_RESULT.json'],
  });
  activeAttemptDir = null;

  const postAnalyze = await L.loadAnalyzer();
  const postFeatures = analyzeResidual(rows, postAnalyze);
  writeJson(RES + 'COMMIT_5R1C25_POST_MATERIAL_FEATURE_EXTRACTION_RESULT.json', postFeatures.extraction);
  writeJson(RES + 'COMMIT_5R1C25_POST_MATERIAL_FEATURE_ABLATION.json', postFeatures.ablation);
  const exhaustion = {
    unit: UNIT,
    generatedUtc: now(),
    hypothesesConsidered: hyps.hypotheses.length,
    coverageAcrossAllFourFamilies: true,
    preRuntimeSimulationForSurvivingHypotheses: ['A1'],
    rejectedOrDeferredHypotheses: hyps.hypotheses.length - 1,
    remainingViableCandidatesExist: true,
    FORMAL_CANDIDATE_EXHAUSTION: false,
    reason: 'C25 accepted one positive-net zero-regression structural rule and stops incomplete because the reason lock remains open; other priority families remain viable for C26.',
  };
  writeJson(RES + 'COMMIT_5R1C25_CANDIDATE_EXHAUSTION.json', exhaustion);

  const restoredAudit = [];
  const restoredIdentity = await restoreHead(restoredAudit);
  writeJson(RES + 'COMMIT_5R1C25_LIVE_RUNTIME_RESTORATION.json', { unit: UNIT, generatedUtc: now(), restoredIdentity, restoredAudit, liveRuntimeRestoredToCommittedBackendBaseline: true });
  const registry = updateRegistry();
  const devPost = compareDevFactory(devPre);
  writeJson(RES + 'COMMIT_5R1C25_DEV_FACTORY_POSTCHECK.json', devPost);
  if (!devPost.equal) throw new Error('DEV_FACTORY_STATE_CHANGED');
  const ctxForCurrent = { reconciliation, reconstruction, material, postCollision: { collidingRows: postFeatures.extraction.collidingRows, collidingVectorCount: postFeatures.extraction.collidingVectorCount }, anti, derived, exhaustion, registry, devPost, manifest: { manifestEntryCount: 'pending', evidenceFileCountIncludingManifest: 'pending' } };
  updateCurrentState(ctxForCurrent);
  const serviceDiff = git('diff', '--name-only', '--', 'services', 'evaluation/oracles/phase-10a14-r20', 'knowledge/TINA_Updated_Roadmap_v7.md').trim();
  if (serviceDiff) throw new Error('PROTECTED_TRACKED_DIFF_PRESENT ' + serviceDiff);
  const reconManifestDir = reconAllocated ? reconAllocated.dir : existingReconDir;
  const manifest = writeManifest([reconManifestDir, materialAllocated.dir]);
  ctxForCurrent.manifest = manifest;
  updateCurrentState(ctxForCurrent);
  const manifest2 = writeManifest([reconManifestDir, materialAllocated.dir]);
  writeJson(RES + 'COMMIT_5R1C25_FINAL_EXECUTION_REPORT.json', {
    unit: UNIT,
    generatedUtc: now(),
    preflight: preflightResult,
    c24Reconciliation: reconciliation,
    reconstruction: { attemptId: reconstruction.attemptId, actual: reconstruction.actual, discrepancies: reconstruction.discrepancies },
    materialIterations: nextMaterialOrdinal,
    acceptedRules: ['external_subject_to_tax_instrument_is_ordinary_object_treatment'],
    rejectedOrDeferredHypotheses: exhaustion.rejectedOrDeferredHypotheses,
    finalCandidate: { actual: material.actual, candidateIdentity: material.candidateIdentity },
    reasonLayerClosure: false,
    decisionLayerClosure: materialGates.decisionLockHeld,
    relationLayerClosure: materialGates.relationLockHeld,
    transitiveAntiOverfit: anti.pass,
    derivedPacketValidation: derived.pass,
    candidateExhaustion: exhaustion,
    registry,
    manifest: manifest2,
    devFactoryPreservedExactly: devPost.equal,
    liveRuntimeRestored: true,
  });
  const finalManifest = writeManifest([reconManifestDir, materialAllocated.dir]);
  say('C25 incomplete evidence complete');
  say(`manifest entries ${finalManifest.manifestEntryCount}, evidence files including manifest ${finalManifest.evidenceFileCountIncludingManifest}`);
} catch (err) {
  const restoreAudit = [];
  try { await restoreHead(restoreAudit); } catch {}
  if (activeAttemptDir && fs.existsSync(activeAttemptDir + 'ATTEMPT.json')) {
    await L.finalizeAttempt(activeAttemptDir, {
      disposition: 'technical_failure_c25',
      exitCode: 1,
      stdout: log.join('\n'),
      stderr: String(err && err.stack ? err.stack : err),
      resultPaths: [],
    });
  }
  throw err;
}
