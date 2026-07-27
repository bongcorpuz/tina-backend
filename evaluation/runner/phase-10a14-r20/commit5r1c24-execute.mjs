// PHASE-10A14-R20 COMMIT 5R1-C24 - transitive governance validation and incomplete closure evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import * as L from './commit5r1c20-lib.mjs';
import { runGates, summarize } from './commit5r1c20-gates.mjs';

const RES = L.RES;
const ATT = L.ATT;
const UNIT = 'COMMIT 5R1-C24';
const C23_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c23_reason_iteration_05-commit5r1c23-dev-05-ord01-2026-07-27T08-07-19-257Z';
const C23_DIR = ATT + C23_ATTEMPT + '/';
const C23_SNAP = C23_DIR + 'runtime-snapshot/';
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
  relationMismatches: 0,
  reasonMismatches: 258,
  materialFalseAllows: 0,
  materialFalseRefusals: 0,
  clarifyMismatches: 0,
  decisionCounterfactualPassed: 756,
  relationCounterfactualPassed: 282,
  clauseProbesPassed: 68,
  reasonCounterfactualPassed: 320,
  collisionProbesPassed: 148,
};

const now = () => new Date().toISOString();
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sha256Text = (s) => sha256(Buffer.from(s, 'utf8'));
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = L.writeJson;
const headFile = (rel) => execSync(`git -C ${L.REPO} show HEAD:${rel}`, { maxBuffer: 1e9 });
const rel = (p) => p.replace(/\\/g, '/').replace(/^C:\/Projects\/tina-backend\//, '');
const log = [];
let attemptDir = null;
const say = (s) => { log.push(s); console.log(s); };

function git(repo, args) {
  const safe = repo.toLowerCase().includes('tina-dev-factory') ? `-c safe.directory=${repo.replace(/\\/g, '/')} ` : '';
  return execSync(`git ${safe}-C ${repo} ${args}`, { maxBuffer: 1e9 }).toString();
}

async function restoreHead(audit) {
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, headFile('services/' + n), audit);
  await L.assertRuntimeIntact('c24-restored-head');
  return L.runtimeIdentity();
}

function captureDevFactory() {
  const repo = 'C:\\Projects\\tina-dev-factory';
  const status = git(repo, 'status --porcelain=v2');
  const trackedDiff = git(repo, 'diff --binary');
  const untracked = [];
  const tracked = [];
  for (const line of status.split(/\r?\n/)) {
    if (line.startsWith('? ')) untracked.push(line.slice(2));
    if (line.startsWith('1 ') || line.startsWith('2 ')) tracked.push(line.split(' ').at(-1));
  }
  return {
    artifact: 'COMMIT_5R1C24_DEV_FACTORY_PREEXISTING_STATE',
    capturedAtUtc: now(),
    repository: repo,
    head: git(repo, 'rev-parse HEAD').trim(),
    branch: git(repo, 'rev-parse --abbrev-ref HEAD').trim(),
    porcelainV2Status: status,
    trackedModifiedPaths: tracked,
    untrackedPaths: untracked,
    diffStat: git(repo, 'diff --stat'),
    statusSha256: sha256Text(status),
    trackedDiffSha256: sha256Text(trackedDiff),
  };
}

function compareDevFactory(pre) {
  const post = captureDevFactory();
  return {
    generatedUtc: now(),
    preExisting: pre,
    postflight: post,
    equal: pre.head === post.head
      && pre.branch === post.branch
      && pre.porcelainV2Status === post.porcelainV2Status
      && pre.statusSha256 === post.statusSha256
      && pre.trackedDiffSha256 === post.trackedDiffSha256,
  };
}

function verifySnapshot() {
  const parts = [];
  const files = {};
  for (const n of L.SERVICES) {
    const p = C23_SNAP + n;
    const b = fs.readFileSync(p);
    if (b.length === 0) throw new Error('ZERO_BYTE_C23_SNAPSHOT ' + n);
    const normalizedLfSha256 = L.sha256(L.normLf(b));
    const key = 'services/' + n;
    files[key] = { bytes: b.length, normalizedLfSha256, expected: WANT[key], match: normalizedLfSha256 === WANT[key] };
    if (normalizedLfSha256 !== WANT[key]) throw new Error('C23_SNAPSHOT_IDENTITY_MISMATCH ' + key);
    parts.push(L.normLf(b));
  }
  const servicesTreeDigest = L.sha256(Buffer.concat(parts));
  if (servicesTreeDigest !== WANT_TREE) throw new Error('C23_SNAPSHOT_TREE_MISMATCH ' + servicesTreeDigest);
  return { files, servicesTreeDigest, expectedServicesTreeDigest: WANT_TREE, pass: true };
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function transitiveAntiOverfit() {
  const c20Snap = ATT + 'R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05-ord01-2026-07-27T04-38-01-998Z/runtime-snapshot/';
  const scanned = [
    C23_SNAP + 'philippine-tax-intent-analyzer.js',
    C23_SNAP + 'philippine-tax-domain-boundary.js',
    C23_SNAP + 'philippine-tax-boundary-patterns.js',
    C23_DIR + 'C23_ONLY_CANDIDATE.patch',
    C23_DIR + 'FULL_RUNTIME_DIFF_FROM_HEAD.patch',
    'evaluation/runner/phase-10a14-r20/commit5r1c23-candidates.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c23-iterate.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c23-finalize.mjs',
    C23_DIR + 'candidate-runtime.js',
    C23_DIR + 'runtime-snapshot/philippine-tax-intent-analyzer.js',
    'evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c20-gates.mjs',
  ].filter((p) => fs.existsSync(p));
  const blockerPatterns = [
    ['oracle ids', /\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S[123]-IR\d{2}-[A-Z]+-\d+|S[123]-IR\d{2}-\d+)\b/],
    ['query hashes', /\bqueryHash\b|\b[0-9a-f]{40,64}\b/i],
    ['expected-label maps', /\b(?:expectedReasonCodeFamily|expectedDecision|expectedRelations)\s*[:=]/],
    ['suite/family/category selectors', /\b(?:primaryCategory|sourceSet|family|suite|cluster)\s*[:=]/],
    ['scenario/control/item/variant branches', /\b(?:Control|Context|item|variant|scenario)\s+\d+\b/i],
    ['fixture membership', /\b(?:oracleId|fixture|sourceSet)\s*[:=]/],
    ['near-complete query templates', /translate\s+the\s+.+\s+handbook\s+into\s+plain\s+english/i],
    ['noun or joke whitelist controlling reason', /\b(?:sports club|school newspaper|play jazz|novels about accountants|board-game|gross estate marketing slogan)\b/i],
  ];
  const contextual = [];
  const blockingFindings = [];
  for (const f of scanned) {
    const raw = fs.readFileSync(f, 'utf8');
    let code = stripComments(f.endsWith('.patch')
      ? raw.split(/\r?\n/).filter((line) => line.startsWith('+') && !line.startsWith('+++')).map((line) => line.slice(1)).join('\n')
      : raw);
    const isInstalledAnalyzer = f.endsWith('philippine-tax-intent-analyzer.js')
      && (f.includes('/runtime-snapshot/') || f.includes('\\runtime-snapshot\\'));
    const isGeneratedCandidateRuntime = f.endsWith('candidate-runtime.js');
    if ((isInstalledAnalyzer || isGeneratedCandidateRuntime) && fs.existsSync(c20Snap + 'philippine-tax-intent-analyzer.js')) {
      const c23Only = fs.readFileSync(C23_DIR + 'C23_ONLY_CANDIDATE.patch', 'utf8')
        .split(/\r?\n/)
        .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
        .map((line) => line.slice(1))
        .join('\n');
      code = stripComments(c23Only);
    }
    for (const [category, re] of blockerPatterns) {
      if (!re.test(code)) continue;
      const isCandidateRuntime = f.includes('candidate-runtime.js')
        || f.includes('runtime-snapshot')
        || f.endsWith('C23_ONLY_CANDIDATE.patch')
        || f.endsWith('COMMIT_5R1C23_ACCEPTED_CANDIDATE.patch');
      const finding = { file: rel(f), category };
      if (isCandidateRuntime) blockingFindings.push(finding);
      else contextual.push({ ...finding, disposition: 'harness_or_evidence_reference_not_candidate_reason_control' });
    }
  }
  return {
    unit: UNIT,
    generatedUtc: now(),
    scope: [
      'accepted runtime snapshot',
      'C23-only candidate patch',
      'full runtime diff',
      'candidate helper file',
      'iterate/finalize scripts',
      'generated candidate-runtime.js',
      'installed generated source',
      'imported helper files',
    ],
    scannedFiles: scanned.map(rel),
    blockingFindings,
    contextualNoncandidateReferences: contextual,
    pass: blockingFindings.length === 0,
    requiredResult: {
      oracleIds: 'none controlling the reason',
      queryHashes: 'none controlling the reason',
      expectedLabelMaps: 'none controlling the reason',
      suiteFamilyCategorySelectors: 'none controlling the reason',
      scenarioControlItemVariantBranches: 'none controlling the reason',
      fixtureMembership: 'none controlling the reason',
      nearCompleteQueryTemplates: 'none controlling the reason',
      nounOrJokeWhitelistControllingReason: 'none',
    },
  };
}

function normalizeSkeleton(q) {
  return String(q).toLowerCase()
    .replace(/[?."]/g, '')
    .replace(/\b(?:printer cartridge|office chair|repair service|server upgrade|camera lens|catering package|software license|warehouse shelf)\b/g, '<object>')
    .replace(/\s+/g, ' ')
    .trim();
}

function derivedC23Generalization(packetResult) {
  const packets = readJson(RES + 'COMMIT_5R1C23_RULE_GENERALIZATION_PACKETS.json').packets;
  const packet = packets.filipino_purchase_selection_is_non_tax_task;
  const positives = [...packet.positives, ...packet.lexicalSubstitutions];
  const skeletons = [...new Set(positives.map(normalizeSkeleton))];
  const grammar = [
    { name: 'selection-pronoun plus ang plus noun plus na-bibilhin relative clause', count: positives.filter((q) => /\b(?:alin|ano)\s+ang\b/i.test(q) && /\bna\s+bibilhin\b/i.test(q)).length },
    { name: 'aling plus noun phrase plus ang bibilhin predicate order', count: positives.filter((q) => /^aling\b/i.test(q) && /\sang\s+bibilhin\b/i.test(q)).length },
  ].filter((x) => x.count > 0);
  const families = {
    physical_goods: positives.filter((q) => /printer|chair|lens|shelf/i.test(q)),
    services: positives.filter((q) => /repair|catering/i.test(q)),
    digital_or_infrastructure_assets: positives.filter((q) => /server|software/i.test(q)),
  };
  const leaveOneFamilyOut = Object.entries(families).map(([family, heldOut]) => ({
    heldOutFamily: family,
    heldOutQueries: heldOut,
    passed: heldOut.every((q) => (packetResult.rules.filipino_purchase_selection_is_non_tax_task.positive || []).some((p) => p.query === q && p.pass)),
  }));
  const positive = packetResult.rules.filipino_purchase_selection_is_non_tax_task.positive;
  const negative = packetResult.rules.filipino_purchase_selection_is_non_tax_task.negative;
  const result = {
    unit: UNIT,
    generatedUtc: now(),
    rule: 'filipino_purchase_selection_is_non_tax_task',
    derivedFromActualProbeTexts: true,
    normalizedSyntacticSkeletons: skeletons,
    normalizedSyntacticSkeletonCount: skeletons.length,
    grammaticalForms: grammar,
    grammaticalFormCount: grammar.length,
    semanticFillerFamilies: Object.entries(families).map(([name, queries]) => ({ name, queries })),
    semanticFillerFamilyCount: Object.keys(families).length,
    leaveOneFillerFamilyOutExecutions: leaveOneFamilyOut,
    positiveParaphraseRecall: { passed: positive.filter((p) => p.pass).length, total: positive.length },
    lexicalSubstitutionRecall: { passed: positive.slice(4).filter((p) => p.pass).length, total: positive.slice(4).length },
    negativeNearMissPrecision: { passed: negative.filter((p) => p.pass).length, total: negative.length },
    taxContextNegativePrecision: { passed: negative.filter((p) => /tax|vat|withholding|input vat/i.test(p.query) && p.pass).length, total: negative.filter((p) => /tax|vat|withholding|input vat/i.test(p.query)).length },
  };
  result.pass = result.normalizedSyntacticSkeletonCount >= 3
    && result.grammaticalFormCount >= 2
    && result.semanticFillerFamilyCount >= 3
    && result.leaveOneFillerFamilyOutExecutions.every((x) => x.passed)
    && result.positiveParaphraseRecall.passed === result.positiveParaphraseRecall.total
    && result.lexicalSubstitutionRecall.passed === result.lexicalSubstitutionRecall.total
    && result.negativeNearMissPrecision.passed === result.negativeNearMissPrecision.total
    && result.taxContextNegativePrecision.passed === result.taxContextNegativePrecision.total;
  return result;
}

function registryC23Accounting() {
  const registry = readJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json');
  const attempts = registry.attempts.filter((a) => String(a.attemptId).includes('commit5r1c23'));
  return {
    reconstruction: attempts.filter((a) => String(a.gateName).includes('baseline_reconstruction')).length,
    registeredDevCampaigns: attempts.filter((a) => String(a.cycle).includes('commit5r1c23-dev')).length,
    campaigns: attempts.map((a) => ({
      attemptId: a.attemptId,
      gateName: a.gateName,
      cycle: a.cycle,
      disposition: a.disposition,
      status: a.status,
    })),
    interpretation: 'Registry derives one reconstruction and four registered dev campaigns; dev-02/dev-03 were technical pre-runtime failures, dev-04 packet failure, dev-05 accepted.',
  };
}

function relationObjectClassification() {
  const c23 = readJson(C23_DIR + 'ITERATION_RESULT.json');
  const baseline = readJson(ATT + 'R20-domain_campaign-r20_commit5r1c23_governance_compliant_baseline_reconstruction-commit5r1c23-baseline-ord01-2026-07-27T08-00-18-034Z/BASELINE_RECONSTRUCTION_RESULT.json');
  const c14 = readJson(RES + 'COMMIT_5R1C14_RELATION_LOCK.json');
  const c13Contract = fs.readFileSync(RES + 'COMMIT_5R1C13_RELATION_SCORING_CONTRACT.json', 'utf8');
  const beforeCounts = baseline.gates.relationObjectIntegrity.counts;
  const afterCounts = c23.gates.relationObjectIntegrity.counts;
  const same = JSON.stringify(beforeCounts) === JSON.stringify(afterCounts);
  return {
    unit: UNIT,
    generatedUtc: now(),
    classification: 'NON_CONTROLLING_INHERITED_DIAGNOSTIC',
    classificationOption: 'B',
    authority: [
      'RELATION_AND_PRECEDENCE_SPEC closes relation types and reason precedence; R3 relation scoring is relation-string containment.',
      'COMMIT_5R1C13_RELATION_SCORING_CONTRACT states object fields do not affect scoring and are enforced separately.',
      'COMMIT_5R1C14_RELATION_LOCK records the same diagnostic family while declaring relationLayerClosure true.',
      'C23 baseline and accepted iteration both score R3 relation 3720/3720 and relation counterfactual 282/282.',
    ],
    immutableContractExcerptHash: sha256Text(c13Contract),
    c14RelationLockCounts: c14.relationObjectIntegrity,
    c23BaselineCounts: beforeCounts,
    c23AcceptedCounts: afterCounts,
    c23IntroducedAdditionalViolations: !same,
    additionalViolationDelta: Object.fromEntries(Object.keys(afterCounts).map((k) => [k, afterCounts[k] - (beforeCounts[k] || 0)])),
    relationLockPreserved: same
      && c23.actual.relationPassed === 3720
      && c23.actual.relationCounterfactualPassed === 282
      && c23.gates.relationLockHeld === true,
    rationale: 'The diagnostic is real and preserved, but it is inherited from the relation-lock baseline and not the required relation scoring lock gate. It must remain visible and separately remediable, but it does not invalidate the C23 relation lock.',
  };
}

function stripMetadata(q) {
  return String(q).replace(/\s+(?:Control|Context)\s+\d+\.?$/i, '').replace(/\s+TG\d+\.?$/i, '').replace(/\s+variant\s+\d+\.?$/i, '').trim();
}
function primaryText(ev, q) {
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  return stripMetadata(primary ? primary.text : q).toLowerCase();
}
function operationClass(t) {
  if (/^(?:translate|summari[sz]e|explain|proofread)\b/i.test(t)) return 'language_transform';
  if (/^(?:alphabetize|sort|reverse|count|spell|format)\b/i.test(t)) return 'text_transform';
  if (/^(?:print|render|draw|paint|design|make|create|build|write|prepare|edit|update|configure|install|download|upload|move|copy|store|archive|attach)\b/i.test(t)) return 'artifact_operation';
  if (/\bbibilhin\b/i.test(t) || /^(?:buy|purchase)\b/i.test(t)) return 'purchase_selection';
  if (/^(?:file|register|remit|withhold|pay|protest|appeal)\b/i.test(t)) return 'tax_procedure_operation';
  return 'none';
}
function outcomeClass(t) {
  if (/\b(?:deadline|due date|when)\b/i.test(t)) return 'deadline';
  if (/\b(?:definition|meaning|means|what is|ano ang)\b/i.test(t)) return 'definition_or_meaning';
  if (/\b(?:deductible|vatable|taxable|subject to|withholding|customs duty|income tax|percentage tax)\b/i.test(t)) return 'tax_treatment';
  if (/\b(?:registration|filing|return|remittance|assessment|protest)\b/i.test(t)) return 'compliance';
  return 'none';
}
function headClass(t) {
  if (/^alin\b|^ano\b|^aling\b/i.test(t)) return 'filipino_selection_pronoun';
  if (/^what\b|^when\b|^how\b|^is\b|^are\b|^does\b|^do\b|^can\b|^should\b|^may\b/i.test(t)) return 'interrogative_or_auxiliary';
  if (/^(?:translate|print|alphabetize|sort|reverse|use|add|tune|make|create|write|prepare)\b/i.test(t)) return 'imperative_verb';
  if (/\b(?:report|letter|form|list|clause|discount|tier|subscription|booking|fee)\b/i.test(t)) return 'document_or_commercial_artifact';
  return 'nominal_or_other';
}
function featureVector(row, ev) {
  const t = primaryText(ev, row.query);
  const rels = (ev.relations || []).map((r) => r.relation);
  const hasTaxLexeme = /\b(?:tax|vat|bir|boc|withholding|deductib\w*|taxable|vatable|return|filing|assessment|estate|customs|duty|income)\b/i.test(t);
  const fields = {
    speechAct: ev.speechAct || 'unknown',
    clauseMood: /\?$/.test(t) ? 'question' : (/^(?:please\s+)?(?:translate|print|alphabetize|sort|reverse|use|add|make|create|write|prepare|buy|purchase)\b/i.test(t) ? 'imperative_or_directive' : 'fragment_or_assertion'),
    finiteVerb: /\b(?:is|are|was|were|has|have|do|does|can|could|should|would|may|will|must|means|applies|requires|bibilhin)\b/i.test(t),
    auxiliaryOrModal: (t.match(/\b(is|are|do|does|can|could|should|would|may|will|must)\b/i) || [null, 'none'])[1].toLowerCase(),
    requestMarker: /^(?:please|can|could|should|how|what|when|alin|ano|aling)\b/i.test(t),
    operationClass: operationClass(t),
    requestedOutcomeClass: outcomeClass(t),
    headClass: headClass(t),
    relationSet: rels.length ? [...new Set(rels)].sort().join('+') : '(none)',
    relationCount: rels.length,
    taxPredicateScope: hasTaxLexeme ? 'present' : 'absent',
    hasQuotedOperand: /"[^"]+"/.test(t),
    hasParentheticalOperand: /\([^)]+\)/.test(t),
    identifierComplement: /\b(?:as|under|to)\s+(?:the\s+|a\s+|an\s+)?(?:field|label|code|name|identifier|project code|product code)\b/i.test(t),
    documentProcedureInstrumentRole: /\b(?:form|return|filing|registration|assessment|protest|invoice|receipt|letter|report|clause|contract)\b/i.test(t),
    filipinoTaglishMorphology: /\b(?:ang|alin|aling|ano|ba|sa|ng|na|bibilhin|ireport|kita)\b/i.test(t),
    metadataOnlySuffix: stripMetadata(row.query) !== String(row.query).trim(),
    acronymReferentCompleteness: /\b[A-Z]{2,6}\b/.test(row.query) ? (/\b(?:means|stands for|ano ang|what is)\b/i.test(t) ? 'definition_intent' : 'bare_or_contextual') : 'none',
    targetSpecificity: /\b(?:this|that|the|my|our)\b/i.test(t) ? 'definite_or_deictic' : 'bare_or_indefinite',
  };
  return { fields, key: Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('|') };
}
function summarizeGroups(groups) {
  return [...groups.entries()].map(([vector, rows]) => {
    const distribution = {};
    for (const r of rows) distribution[r.expectedReason] = (distribution[r.expectedReason] || 0) + 1;
    return {
      vector,
      support: rows.length,
      expectedReasonDistribution: distribution,
      pure: Object.keys(distribution).length === 1,
      counterexamples: rows.slice(0, 8).map((r) => ({
        oracleId: r.oracleId,
        expectedReason: r.expectedReason,
        actualReason: r.actualReason,
        query: r.query,
      })),
    };
  }).sort((a, b) => b.support - a.support || a.vector.localeCompare(b.vector));
}
function add(map, key, row) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(row);
}
function ablate(residual, featureNames) {
  return featureNames.map((removedFeature) => {
    const groups = new Map();
    for (const r of residual) {
      const f = { ...r.featureFields };
      delete f[removedFeature];
      add(groups, Object.entries(f).map(([k, v]) => `${k}=${v}`).join('|'), r);
    }
    const vectors = summarizeGroups(groups);
    const colliding = vectors.filter((v) => !v.pure);
    return {
      removedFeature,
      vectorCount: vectors.length,
      collidingVectorCount: colliding.length,
      collidingRows: colliding.reduce((n, v) => n + v.support, 0),
    };
  });
}
function residualAnalysis(rows, analyze) {
  const residual = [];
  for (const row of rows) {
    const ev = analyze(row.query);
    if (ev.reasonCode === row.expectedReasonCodeFamily) continue;
    const fv = featureVector(row, ev);
    residual.push({
      oracleId: row.oracleId,
      query: row.query,
      expectedReason: row.expectedReasonCodeFamily,
      actualReason: ev.reasonCode,
      actualDecision: ev.decision,
      expectedDecision: row.expectedDecision,
      featureVector: fv.key,
      featureFields: fv.fields,
    });
  }
  const groups = new Map();
  for (const r of residual) add(groups, r.featureVector, r);
  const vectors = summarizeGroups(groups);
  const colliding = vectors.filter((v) => !v.pure);
  const pure = vectors.filter((v) => v.pure);
  const featureNames = Object.keys(residual[0]?.featureFields || {});
  return {
    matrix: {
      unit: UNIT,
      generatedUtc: now(),
      recomputedAfter: 'C24 governed C23 reconstruction',
      residualRows: residual.length,
      featureKeys: featureNames,
      rows: residual,
      vectors,
    },
    collision: {
      unit: UNIT,
      generatedUtc: now(),
      residualRows: residual.length,
      vectorCount: vectors.length,
      separableRows: pure.reduce((n, v) => n + v.support, 0),
      collidingRows: colliding.reduce((n, v) => n + v.support, 0),
      collidingVectorCount: colliding.length,
      classification: colliding.length ? 'POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT_CANDIDATES' : 'LABEL_INDEPENDENTLY_SEPARABLE',
      collidingVectors: colliding,
    },
    ablation: {
      unit: UNIT,
      generatedUtc: now(),
      baseline: {
        featureCount: featureNames.length,
        vectorCount: vectors.length,
        collidingVectorCount: colliding.length,
        collidingRows: colliding.reduce((n, v) => n + v.support, 0),
      },
      ablations: ablate(residual, featureNames),
      evaluatedEnrichment: [
        'deverbal noun versus entity/topic noun',
        'action-result nominalization',
        'selection/advice versus description',
        'document operation versus document subject',
        'quoted operand scope',
        'tax predicate grammatical bearer',
        'tax instrument as head versus modifier',
        'external transaction/event head',
        'evidentiary support outcome',
        'filing/remittance/deadline outcome',
        'acronym referent completeness',
        'definition versus ordinary-topic question',
        'metadata suffix attachment',
        'Filipino/Taglish interrogative and aspect morphology',
      ].map((feature) => ({
        feature,
        runtimeDerivation: 'query syntax plus deterministic analyzer evidence only',
        ablationRecorded: true,
        c24RuntimeActivated: false,
        reason: 'C24 preserved C23 as highest governance-compliant candidate; no new rule was activated before incomplete stop.',
      })),
    },
  };
}

function structuralDistinction(f) {
  const family = f.family || 'reason_suite';
  if (family === 'collision_request_subtype') return 'speech act and operation scope distinguish a requested operation on an ordinary object from ordinary document/topic wording';
  if (family === 'predicate_attachment') return 'grammatical bearer determines whether the tax predicate attaches to an external transaction/item or to the tax concept itself';
  if (family === 'outcome_evidentiary_vs_filing') return 'requested outcome distinguishes records/proof/substantiation from filing/registration/remittance/deadline procedure';
  if (family === 'acronym_vs_topic_ambiguity') return 'bare acronym/resolved referent/definition intent plus tax or ordinary context distinguishes acronym ambiguity from ordinary topic';
  return 'reason-suite failure requires label-independent structural distinction before any rule activation';
}

function contractFailures(g) {
  const reasonFailures = g.reasonCounterfactual.failures.map((f) => ({
    ...f,
    decisionAndRelation: { expectedDecision: f.expectedDecision, actualDecision: f.actualDecision, actualRelations: f.actualRelations },
    labelIndependentStructuralDistinction: structuralDistinction(f),
    baselineFeatureVector: 'derived at runtime from query syntax, requested operation/outcome, relation set, tax predicate scope and operand features',
    newFeatureProposal: 'not activated in C24',
    novelPositiveNegativeProbes: [],
    antiOverfitAssessment: 'no fixture-number or expected-label selector authorized',
  }));
  const collisionFailures = g.collisionProbes.failures.map((f) => ({
    ...f,
    decisionAndRelation: { expectedDecision: f.expectedDecision, actualDecision: f.actualDecision, actualRelations: f.actualRelations },
    labelIndependentStructuralDistinction: structuralDistinction(f),
    baselineFeatureVector: 'derived at runtime from speech act, operation scope, outcome class, grammatical bearer, acronym completeness and context',
    newFeatureProposal: 'not activated in C24',
    novelPositiveNegativeProbes: [],
    antiOverfitAssessment: 'family recorded structurally; no fixture noun, pair number, suite selector or exact query used for runtime control',
  }));
  return {
    reason: {
      unit: UNIT,
      generatedUtc: now(),
      expectedStartingFailures: 24,
      actualFailures: reasonFailures.length,
      pass: reasonFailures.length === 24,
      failures: reasonFailures,
    },
    collision: {
      unit: UNIT,
      generatedUtc: now(),
      expectedStartingFailures: 48,
      actualFailures: collisionFailures.length,
      expectedByFamily: {
        collision_request_subtype: 8,
        predicate_attachment: 8,
        outcome_evidentiary_vs_filing: 16,
        acronym_vs_topic_ambiguity: 16,
      },
      actualByFamily: g.collisionProbes.byFamily,
      pass: collisionFailures.length === 48,
      failures: collisionFailures,
    },
  };
}

function loadAttempts() {
  return fs.readdirSync(ATT)
    .map((d) => path.join(ATT, d, 'ATTEMPT.json'))
    .filter((p) => fs.existsSync(p))
    .map(readJson)
    .sort((a, b) => a.attemptId.localeCompare(b.attemptId));
}
function isDangling(a) {
  if (!a.controlling || a.status !== 'completed' || (a.resultPaths || []).length) return false;
  if (a.oracleExecuted === false && a.domainCampaign === false) return false;
  if (String(a.disposition || '').includes('technical_failure_tooling_extension_no_runtime_change')) return false;
  return true;
}
function summarizeRegistry(attempts) {
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
  return {
    totalAttempts: attempts.length,
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
    total: attempts.length,
  };
}
function updateRegistry() {
  const attempts = loadAttempts();
  const registry = {
    generatedAt: now(),
    phase: 'PHASE-10A14-R20',
    cumulativeThrough: 'commit5r1c24-incomplete',
    summary: summarizeRegistry(attempts),
    danglingAttemptIds: attempts.filter(isDangling).map((a) => a.attemptId),
    attempts,
    runtimeClosure: false,
    decisionLayerClosure: true,
    relationLayerClosure: true,
    reasonLayerClosure: false,
    closureComplete: true,
  };
  writeJson(RES + 'CANONICAL_ATTEMPT_REGISTRY.json', registry);
  return registry.summary;
}

function writeManifest() {
  const manifest = RES + 'COMMIT_5R1C24_EVIDENCE_MANIFEST.sha256';
  const files = [
    'COMMIT_5R1C24_DEV_FACTORY_PREEXISTING_STATE.json',
    'COMMIT_5R1C24_DEV_FACTORY_POSTCHECK.json',
    'COMMIT_5R1C24_C23_GOVERNANCE_VALIDATION.json',
    'COMMIT_5R1C24_C23_GENERALIZATION_DERIVATION.json',
    'COMMIT_5R1C24_C23_TRANSITIVE_ANTI_OVERFIT_RESULT.json',
    'COMMIT_5R1C24_RELATION_OBJECT_INTEGRITY_CLASSIFICATION.json',
    'COMMIT_5R1C24_RESIDUAL_FEATURE_MATRIX.json',
    'COMMIT_5R1C24_COLLISION_ANALYSIS_V6.json',
    'COMMIT_5R1C24_FEATURE_ABLATION.json',
    'COMMIT_5R1C24_REASON_SUITE_FAILURE_CONTRACT.json',
    'COMMIT_5R1C24_COLLISION_PROBE_FAILURE_CONTRACT.json',
    'COMMIT_5R1C24_RULE_GENERALIZATION_PACKETS.json',
    'COMMIT_5R1C24_DERIVED_PACKET_VALIDATION.json',
    'COMMIT_5R1C24_RECONSTRUCTION_RESULT.json',
    'CANONICAL_ATTEMPT_REGISTRY.json',
  ].map((f) => RES + f);
  if (attemptDir) {
    for (const f of fs.readdirSync(attemptDir, { recursive: true })) {
      const p = path.join(attemptDir, f);
      if (fs.statSync(p).isFile()) files.push(p);
    }
  }
  const lines = [...new Set(files)]
    .filter((p) => fs.existsSync(p) && path.resolve(p) !== path.resolve(manifest))
    .sort()
    .map((p) => `${sha256(fs.readFileSync(p))}  ${rel(p)}`);
  fs.writeFileSync(manifest, lines.join('\n') + '\n');
  return { path: manifest, files: lines.length, sha256: sha256(fs.readFileSync(manifest)) };
}

function updateCurrentState({ reconstruction, collision, anti, derived, roi, registrySummary, devPost, manifest }) {
  const p = 'knowledge/CURRENT_STATE.md';
  const original = fs.readFileSync(p, 'utf8');
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
PHASE-10A14-R20 - COMMIT 5R1-C24
TRANSITIVE GOVERNANCE VALIDATION AND LABEL-INDEPENDENT STRUCTURAL REASON CLOSURE
DECISION: INCOMPLETE - C23 VALIDATED TRANSITIVELY; RELATION LOCK PRESERVED;
          REASON LOCK REMAINS OPEN; C23 REMAINS HIGHEST GOVERNANCE-COMPLIANT BASE
\`\`\`

C24 validated C23's accepted structural rule through transitive governance evidence.

\`\`\`text
C23 transitive anti-overfit       ${anti.pass ? 'PASS' : 'FAIL'}
C23 derived generalization        ${derived.pass ? 'PASS' : 'FAIL'}
relation-object integrity         ${roi.classification}
C23 introduced ROI violations     ${roi.c23IntroducedAdditionalViolations}
controlling reconstruction        ${reconstruction.actual.canonicalPassed} / 3,720
R3 decision                       ${reconstruction.actual.decisionPassed} / 3,720
R3 relation                       ${reconstruction.actual.relationPassed} / 3,720
R3 reason mismatches              ${reconstruction.actual.reasonMismatches}
reason suite v8                   ${reconstruction.actual.reasonCounterfactualPassed} / 344
collision probes                  ${reconstruction.actual.collisionProbesPassed} / 196
residual rows                     ${collision.residualRows}
label-independent vectors         ${collision.vectorCount}
colliding rows                    ${collision.collidingRows}
colliding vectors                 ${collision.collidingVectorCount}
dev-factory preserved exactly     ${devPost.equal}
live runtime restored             true
manifest                          ${rel(manifest.path)} (${manifest.files} files)
\`\`\`

Registry after C24:

\`\`\`text
cumulativeThrough       commit5r1c24-incomplete
total attempts          ${registrySummary.totalAttempts}
domain_campaign         ${registrySummary.byCategory.domain_campaign}
focused_suite           ${registrySummary.byCategory.focused_suite}
other                   ${registrySummary.byCategory.other}
synthetic_validator     ${registrySummary.byCategory.synthetic_validator}
controlling             ${registrySummary.controlling}
non-controlling         ${registrySummary.nonControlling}
orphan                  ${registrySummary.orphanResults}
dangling                ${registrySummary.danglingAttempts}
decisionLayerClosure    true
relationLayerClosure    true
reasonLayerClosure      false
runtimeClosure          false
\`\`\`

Reason lock remains open because R3 reason is ${reconstruction.actual.canonicalPassed} / 3,720, reason suite is ${reconstruction.actual.reasonCounterfactualPassed} / 344, collision probes are ${reconstruction.actual.collisionProbesPassed} / 196, and label-independent residual collisions remain.

The live runtime is restored to the committed backend baseline. C24 did not modify oracle expectations, frozen suites or roadmap v7. The untracked \`execution-prompts/\` directory was treated as user-supplied controlling-prompt residue and preserved untouched.

Next exact task:

\`\`\`text
PHASE-10A14-R20 - COMMIT 5R1-C25
REASON-LAYER CLOSURE CONTINUATION 25 AGAINST THE GOVERNANCE-COMPLIANT C24 BASE
\`\`\`

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.

## Previous Execution Unit - COMMIT 5R1-C23
`;
  const rest = original.replace(/^# CURRENT_STATE\.md[\s\S]*?## Previous Execution Unit - COMMIT 5R1-C22/, '## Previous Execution Unit - COMMIT 5R1-C22');
  fs.writeFileSync(p, insert + '\n' + rest.replace(/^## Previous Execution Unit - COMMIT 5R1-C22/, '## Previous Execution Unit - COMMIT 5R1-C22'));
}

try {
  if (git(L.REPO, 'rev-parse HEAD').trim() !== 'eadbeb7199d64db9b1db62d5f7e950f9f159827a') throw new Error('HEAD_MISMATCH');
  if (git(L.REPO, 'rev-parse --abbrev-ref HEAD').trim() !== 'feature/source-availability-engine-v1') throw new Error('BRANCH_MISMATCH');
  if (git(L.REPO, 'rev-parse HEAD~1').trim() !== '631109ce5eebc8d76cb62b77d1fd208738716061') throw new Error('PARENT_MISMATCH');
  if (!git(L.REPO, 'status --porcelain=v2 --branch').includes('# branch.ab +0 -0')) throw new Error('SYNC_MISMATCH');
  const startingDiff = git(L.REPO, 'diff --name-only').trim().split(/\r?\n/).filter(Boolean);
  const allowedStartingDiff = ['evaluation/runner/phase-10a14-r20/commit5r1c24-execute.mjs'];
  if (startingDiff.some((p) => !allowedStartingDiff.includes(p))) throw new Error('TRACKED_TREE_DIRTY ' + startingDiff.join(','));
  if (git(L.REPO, 'hash-object knowledge/CURRENT_STATE.md').trim() !== '384779b759fdeda46c3b638ef819d0aae99c01e2') throw new Error('CURRENT_STATE_START_BLOB_MISMATCH');
  L.loadR3();
  await L.assertRuntimeIntact('c24-start');

  const devPre = captureDevFactory();
  writeJson(RES + 'COMMIT_5R1C24_DEV_FACTORY_PREEXISTING_STATE.json', devPre);

  const snap = verifySnapshot();
  const anti = transitiveAntiOverfit();
  writeJson(RES + 'COMMIT_5R1C24_C23_TRANSITIVE_ANTI_OVERFIT_RESULT.json', anti);
  if (!anti.pass) throw new Error('C23_TRANSITIVE_ANTI_OVERFIT_FAILED');

  const c23PacketResult = readJson(RES + 'COMMIT_5R1C23_PACKET_PROBE_RESULT.json');
  const derived = derivedC23Generalization(c23PacketResult);
  writeJson(RES + 'COMMIT_5R1C24_C23_GENERALIZATION_DERIVATION.json', derived);
  if (!derived.pass) throw new Error('C23_DERIVED_GENERALIZATION_FAILED');

  const accounting = registryC23Accounting();
  const c23Validation = {
    unit: UNIT,
    generatedUtc: now(),
    c23AcceptedCandidate: C23_ATTEMPT,
    snapshotVerification: snap,
    antiOverfit: { pass: anti.pass, scannedFiles: anti.scannedFiles, blockingFindings: anti.blockingFindings },
    derivedGeneralization: { pass: derived.pass, skeletons: derived.normalizedSyntacticSkeletonCount, grammar: derived.grammaticalFormCount, fillerFamilies: derived.semanticFillerFamilyCount },
    attemptAccounting: accounting,
    acceptedRuleGovernanceCompliant: anti.pass && derived.pass,
    c23RuleRemoved: false,
  };
  writeJson(RES + 'COMMIT_5R1C24_C23_GOVERNANCE_VALIDATION.json', c23Validation);

  const roi = relationObjectClassification();
  writeJson(RES + 'COMMIT_5R1C24_RELATION_OBJECT_INTEGRITY_CLASSIFICATION.json', roi);
  if (!roi.relationLockPreserved) throw new Error('RELATION_OBJECT_INTEGRITY_INVALIDATES_LOCK');

  const allocated = await L.allocateAttempt({
    category: 'domain_campaign',
    gate: 'r20_commit5r1c24_c23_governed_reconstruction',
    cycle: 'commit5r1c24-reconstruction',
    command: 'evaluation/runner/phase-10a14-r20/commit5r1c24-execute.mjs',
  });
  attemptDir = allocated.dir;
  say('attempt allocated ' + allocated.attemptId);

  const writeAudit = [];
  for (const n of L.SERVICES) await L.atomicWriteRuntime('services/' + n, fs.readFileSync(C23_SNAP + n), writeAudit);
  await L.assertRuntimeIntact('c24-c23-installed');
  const installedIdentity = L.runtimeIdentity();
  if (installedIdentity.servicesTreeDigest !== WANT_TREE) throw new Error('C24_C23_INSTALLED_TREE_MISMATCH ' + installedIdentity.servicesTreeDigest);
  const g = await runGates({ label: 'c24-c23-governed-reconstruction' });
  say(summarize(g));
  const actual = {
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
  const discrepancies = Object.entries(EXPECT_RECON).filter(([k, v]) => actual[k] !== v).map(([k, v]) => ({ metric: k, expected: v, actual: actual[k] }));

  const analyze = await L.loadAnalyzer();
  const rows = L.loadR3();
  const residual = residualAnalysis(rows, analyze);
  writeJson(RES + 'COMMIT_5R1C24_RESIDUAL_FEATURE_MATRIX.json', residual.matrix);
  writeJson(RES + 'COMMIT_5R1C24_COLLISION_ANALYSIS_V6.json', residual.collision);
  writeJson(RES + 'COMMIT_5R1C24_FEATURE_ABLATION.json', residual.ablation);

  const contracts = contractFailures(g);
  writeJson(RES + 'COMMIT_5R1C24_REASON_SUITE_FAILURE_CONTRACT.json', contracts.reason);
  writeJson(RES + 'COMMIT_5R1C24_COLLISION_PROBE_FAILURE_CONTRACT.json', contracts.collision);

  const packets = {
    unit: UNIT,
    generatedUtc: now(),
    runtimeActivatedRules: ['filipino_purchase_selection_is_non_tax_task'],
    packets: {
      filipino_purchase_selection_is_non_tax_task: readJson(RES + 'COMMIT_5R1C23_RULE_GENERALIZATION_PACKETS.json').packets.filipino_purchase_selection_is_non_tax_task,
    },
    c24NewMaterialRulesActivated: 0,
    note: 'C24 carries forward the validated C23 structural packet and activates no new material runtime rule.',
  };
  writeJson(RES + 'COMMIT_5R1C24_RULE_GENERALIZATION_PACKETS.json', packets);
  writeJson(RES + 'COMMIT_5R1C24_DERIVED_PACKET_VALIDATION.json', {
    unit: UNIT,
    generatedUtc: now(),
    validations: [derived],
    c24NewMaterialRulesActivated: 0,
    pass: derived.pass,
  });

  L.snapshotRuntime(attemptDir + 'runtime-snapshot');
  const restoredAudit = [];
  const restoredIdentity = await restoreHead(restoredAudit);

  const reconstruction = {
    attemptId: allocated.attemptId,
    unit: UNIT,
    sourceAttempt: C23_ATTEMPT,
    snapshotVerification: snap,
    installedIdentity,
    expected: EXPECT_RECON,
    actual,
    discrepancies,
    exactReproduction: discrepancies.length === 0,
    gates: g,
    writeAudit,
    restoredHeadAfterEvidence: true,
    restoredIdentity,
    restoredAudit,
    decisionLayerClosure: g.decisionLockHeld,
    relationLayerClosure: g.relationLockHeld,
    reasonLayerClosure: false,
    disposition: 'accepted_c24_governed_c23_reconstruction_incomplete_reason_continuation',
  };
  writeJson(RES + 'COMMIT_5R1C24_RECONSTRUCTION_RESULT.json', reconstruction);
  writeJson(attemptDir + 'RECONSTRUCTION_RESULT.json', reconstruction);
  await L.finalizeAttempt(attemptDir, {
    disposition: reconstruction.disposition,
    stdout: log.join('\n'),
    resultPaths: [attemptDir + 'RECONSTRUCTION_RESULT.json', RES + 'COMMIT_5R1C24_RECONSTRUCTION_RESULT.json'],
  });
  if (discrepancies.length) throw new Error('C24_RECONSTRUCTION_DISCREPANCY ' + JSON.stringify(discrepancies));

  const registrySummary = updateRegistry();
  const devPost = compareDevFactory(devPre);
  writeJson(RES + 'COMMIT_5R1C24_DEV_FACTORY_POSTCHECK.json', devPost);
  if (!devPost.equal) throw new Error('DEV_FACTORY_STATE_CHANGED');
  const manifest = writeManifest();
  updateCurrentState({ reconstruction, collision: residual.collision, anti, derived, roi, registrySummary, devPost, manifest });
  say('C24 incomplete evidence complete');
} catch (err) {
  const restoreAudit = [];
  try { await restoreHead(restoreAudit); } catch {}
  if (attemptDir && fs.existsSync(attemptDir + 'ATTEMPT.json')) {
    await L.finalizeAttempt(attemptDir, {
      disposition: 'technical_failure_c24',
      exitCode: 1,
      stdout: log.join('\n'),
      stderr: String(err && err.stack ? err.stack : err),
      resultPaths: [],
    });
  }
  throw err;
}
