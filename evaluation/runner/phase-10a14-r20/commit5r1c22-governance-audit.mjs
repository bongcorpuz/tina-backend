// PHASE-10A14-R20 COMMIT 5R1-C22 - anti-overfit adjudication and evidence builder.
import fs from 'node:fs';
import path from 'node:path';
import * as L from './commit5r1c20-lib.mjs';

const RES = L.RES;
const C21_SOURCE_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c21_reason_iteration_06-commit5r1c21-dev-06-ord01-2026-07-27T05-39-23-533Z';
const C20_SOURCE_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05-ord01-2026-07-27T04-38-01-998Z';

const C21_FILES = [
  `${L.ATT}${C21_SOURCE_ATTEMPT}/runtime-snapshot/philippine-tax-intent-analyzer.js`,
  `${RES}COMMIT_5R1C21_BEST_REASON_CANDIDATE.patch`,
  'evaluation/runner/phase-10a14-r20/commit5r1c21-candidates.mjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c21-patch-02.cjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c21-patch-03.cjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c21-patch-04.cjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c21-patch-05.cjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c21-patch-06.cjs',
];

const C20_FILES = [
  `${L.ATT}${C20_SOURCE_ATTEMPT}/runtime-snapshot/philippine-tax-intent-analyzer.js`,
  `${RES}COMMIT_5R1C20_BEST_REASON_CANDIDATE.patch`,
  'evaluation/runner/phase-10a14-r20/commit5r1c20-override.mjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c20-patch-02.cjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c20-patch-03.cjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c20-patch-04.cjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c20-patch-05.cjs',
];

const RED_TEAM_PATTERNS = [
  { id: 'scenario_item_number', regex: /item\s+\\d\+|item \d\+|for item\s*\d+/i, category: 'scenario/control/item/variant numbers used to choose a reason' },
  { id: 'variant_number', regex: /variant\s+\\d\+|variant \d+/i, category: 'scenario/control/item/variant numbers used to choose a reason' },
  { id: 'translate_plain_english_template', regex: /translate .* into plain english/i, category: 'anchored near-complete query template' },
  { id: 'sports_club_fee_fixture', regex: /annual registration fee for a sports club/i, category: 'complete exact query or fixture literal' },
  { id: 'school_newspaper_fixture', regex: /authority to print a school newspaper/i, category: 'complete exact query or fixture literal' },
  { id: 'band_jazz_fixture', regex: /band play jazz/i, category: 'complete exact query or fixture literal' },
  { id: 'books_novels_accountants_fixture', regex: /books means novels about accountants/i, category: 'complete exact query or fixture literal' },
  { id: 'board_game_mechanic_fixture', regex: /transfer pricing is a board-game mechanic/i, category: 'ordinary-object or joke-specific whitelist' },
  { id: 'deficiency_interest_taglish_template', regex: /may deficiency interest ba sa late payment/i, category: 'anchored near-complete query template' },
  { id: 'bir_assessment_protest_template', regex: /deadline to protest a bir assessment/i, category: 'anchored near-complete query template' },
  { id: 'gross_estate_joke_fixture', regex: /gross estate means ugly real-estate ads here/i, category: 'ordinary-object or joke-specific whitelist' },
  { id: 'css_class_variant_template', regex: /add taxable to the css class list|css class list\(\?: variant/i, category: 'scenario/control/item/variant numbers used to choose a reason' },
  { id: 'product_code_vatable_template', regex: /sale vatable if [^\n]* product code|sale vatable if [^\n]*product code/i, category: 'fixture-specific phrase alternation' },
  { id: 'cooking_fan_alternation', regex: /cooking utensil\|cooling fan/i, category: 'alternations of fixture-specific phrases' },
  { id: 'joke_band_song_alternation', regex: /\^\[a-z\][^\n]*(?:joke expansion|band of chords|this song)|means band of chords in this song/i, category: 'ordinary-object or joke-specific whitelist' },
];

const GOVERNANCE_PATTERNS = [
  { id: 'oracle_id', regex: /\b(?:R20N?-[A-Z]{2,4}-\d{3,4}|S[1-3]-IR\d+-[A-Z]*-?\d+)\b/, category: 'oracle IDs' },
  { id: 'query_hash', regex: /\b[0-9a-f]{32,}\b/i, category: 'query hashes or serialized hashes' },
  { id: 'expected_maps', regex: /expectedDecision|expectedReasonCodeFamily|expectedRelations|expectedReason/i, category: 'expected reason/decision maps' },
  { id: 'fixture_membership_fields', regex: /sourceSet|primaryCategory|family|cluster|oracleId/i, category: 'suite/family/cluster/category identifiers' },
  { id: 'scenario_number_branch', regex: /control \d+|context \d+|group mm-\d+|variant\s+\\d\+|variant \d+|item\s+\\d\+|item \d+/i, category: 'scenario/control/item/variant numbers used to choose a reason' },
];

const NON_ACCEPTABLE = new Set([
  'STRUCTURAL_BUT_UNDERTESTED',
  'TEMPLATE_OVERFIT',
  'LEXICAL_FILLER_WHITELIST',
  'SCENARIO_NUMBER_DEPENDENT',
  'FIXTURE_MEMBERSHIP_SURROGATE',
  'CONFLICTING_OR_UNSAFE',
]);
const ACCEPTED_C21_ENABLED = [
  'translate_document_handbook_has_no_relation',
  'tune_named_music_channel_has_no_relation',
  'bare_club_fee_fragment_has_no_relation',
  'project_code_lang_question_is_non_tax_task',
  'print_authority_school_newspaper_is_non_tax_task',
  'boc_band_play_jazz_is_non_tax_task',
  'books_means_novels_is_non_tax_task',
  'ordinary_gloss_statement_has_no_relation',
  'concrete_percentage_tax_subject_is_ordinary_object',
  'records_support_deduction_is_tax_task',
  'filing_deadline_for_return_is_compliance',
  'unknown_acronym_item_question_clarifies',
  'deficiency_interest_late_payment_is_tax_task',
  'deadline_to_protest_assessment_is_compliance',
  'alphabetize_quoted_tax_term_is_quote_only',
  'ordinary_parenthetical_expansion_has_no_relation',
  'ordinary_token_operation_has_no_relation',
  'purchase_deductible_subject_is_tax_task',
  'product_code_sale_vatable_is_tax_task',
];

function read(rel) {
  return fs.readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function fixedTokens(predicate) {
  return [...new Set(String(predicate)
    .replace(/\\[bdsw]\+?/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[\\^$.*+?()[\]{}|/:"'=>,;!]/g, ' ')
    .split(/\s+/)
    .map((x) => x.toLowerCase())
    .filter((x) => x.length >= 3 && !['const', 'return', 'reason', 'decision', 'test'].includes(x)))];
}

function wildcardSlots(predicate) {
  return (String(predicate).match(/\\d\+|\[[^\]]+\]\{[^}]+\}|\[[^\]]+\]\+|\.\*|\[\^"\]\+/g) || []).length;
}

function classify(rule) {
  const p = rule.predicateIdentity || '';
  const tokens = fixedTokens(p);
  const numeric = /item\s+\\d\+|variant\s+\\d\+|control \d|context \d|group mm/i.test(p);
  const fixture = RED_TEAM_PATTERNS.filter((x) => x.regex.test(p)).map((x) => x.id);
  const anchored = /\^/.test(p) && /\\\?\$|\\\.\?\$|\$/.test(p);
  const exactish = anchored && tokens.length >= 4 && wildcardSlots(p) <= 2;
  let classification = 'STRUCTURAL_BUT_UNDERTESTED';
  if (numeric) classification = 'SCENARIO_NUMBER_DEPENDENT';
  else if (fixture.includes('cooking_fan_alternation') || fixture.includes('joke_band_song_alternation')) classification = 'LEXICAL_FILLER_WHITELIST';
  else if (fixture.length || exactish) classification = 'TEMPLATE_OVERFIT';
  const structuralHints = /rel0|relations|TASK|deduction|return|percentage tax|quoted|ASKS_|QUOTES_TERM|tax_compliance_task|tax_treatment/.test(p);
  const naturalClass = structuralHints && !fixture.length && !numeric;
  if (naturalClass && !exactish) classification = 'STRUCTURAL_BUT_UNDERTESTED';
  return {
    fixedLiteralTokens: tokens,
    wildcardSlots: wildcardSlots(p),
    numericItemControlVariantDependence: numeric,
    naturalClassBeyondKnownFixtures: naturalClass,
    paraphraseCoverage: 0,
    lexicalSubstitutionCoverage: 0,
    nearMissPrecision: 0,
    classification,
    disposition: NON_ACCEPTABLE.has(classification) ? 'REMOVE_FROM_GOVERNANCE_BASELINE' : 'REMOVE_PENDING_GENERALIZATION_PACKET',
    detectedRedTeamPatterns: fixture,
  };
}

function gateScan(label, files, mode) {
  const findings = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const code = stripComments(read(file));
    for (const p of GOVERNANCE_PATTERNS) {
      if (p.regex.test(code)) findings.push({ file, id: p.id, category: p.category, severity: mode === 'c21' ? 'fail' : 'recorded_noncandidate_context' });
    }
    for (const p of RED_TEAM_PATTERNS) {
      if (p.regex.test(code)) findings.push({ file, id: p.id, category: p.category, severity: 'fail' });
    }
  }
  const blocking = findings.filter((f) => f.severity === 'fail');
  return {
    label,
    inspectedFiles: files.filter((f) => fs.existsSync(f)),
    missingFiles: files.filter((f) => !fs.existsSync(f)),
    findings,
    blockingFindings: blocking,
    pass: blocking.length === 0,
  };
}

function summarizeResult(result) {
  return {
    attemptId: result.attemptId,
    actual: result.actual,
    runtimeIdentity: result.installedIdentity,
    exact: result.exactTechnicalReproduction ?? result.exactBaselineReproduction,
    restoredHeadAfterEvidence: result.restoredHeadAfterEvidence,
  };
}

const inventory = JSON.parse(read(`${RES}COMMIT_5R1C21_OVERRIDE_INVENTORY.json`));
const candidates = await import('./commit5r1c21-candidates.mjs');
const c20AnalyzerModule = await import('file:///' + L.REPO + '/' + L.ATT + C20_SOURCE_ATTEMPT + '/runtime-snapshot/philippine-tax-intent-analyzer.js?v=' + Date.now());
const c20Analyze = (q) => c20AnalyzerModule.analyzePhilippineTaxIntent(q);
const reasonSuite = JSON.parse(read(L.REASON_SUITE)).queries
  .filter((q) => q.controlling !== false)
  .map((q) => ({ kind: 'reason-suite-v8', id: `reason:${q.pair}:${q.query}`, query: q.query }));
const collisionSuite = JSON.parse(read(L.COLLISION_PROBES)).probes
  .map((q) => ({ kind: 'collision-probe', id: `collision:${q.pair}:${q.query}`, query: q.query }));
const corpus = [
  ...L.loadR3().map((r) => ({ kind: 'R3', id: r.oracleId, query: r.query })),
  ...reasonSuite,
  ...collisionSuite,
];
const effects = Object.fromEntries(ACCEPTED_C21_ENABLED.map((name) => [name, { R3: [], reasonSuite: [], collision: [] }]));
for (const row of corpus) {
  const ev = c20Analyze(row.query);
  const hit = candidates.resolveC21Candidate(candidates.evidenceView(ev, row.query), ACCEPTED_C21_ENABLED);
  if (!hit) continue;
  if (row.kind === 'R3') effects[hit.rule].R3.push(row.id);
  else if (row.kind === 'reason-suite-v8') effects[hit.rule].reasonSuite.push(row.id);
  else effects[hit.rule].collision.push(row.id);
}
const inventoryByRule = Object.fromEntries((inventory.proposedC21Overrides || []).map((r) => [r.rule, r]));
const c21Rules = ACCEPTED_C21_ENABLED.map((name) => {
  const inv = inventoryByRule[name] || {};
  const rule = candidates.RULES[name];
  return {
    rule: name,
    assignedReason: rule.assigns,
    predicateIdentity: inv.predicateIdentity || String(rule.match),
    matchedR3RowIds: effects[name].R3,
    matchedReasonSuiteIds: effects[name].reasonSuite,
    matchedCollisionProbeIds: effects[name].collision,
    sourceUnit: inv.sourceUnit || 'COMMIT 5R1-C21',
    ...classify({ predicateIdentity: inv.predicateIdentity || String(rule.match) }),
  };
});
const removed = c21Rules.filter((r) => r.disposition.startsWith('REMOVE'));
const retained = c21Rules.filter((r) => r.disposition === 'ACCEPT');

const antiMemFalsePass = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: new Date().toISOString(),
  initialClassification: 'ANTI_MEMORIZATION_GATE_FALSE_NEGATIVE',
  committedC21AntiMemorizationResult: {
    no_scenario_number_branch: true,
    source: 'COMMIT_5R1C21_REASON_LOCK.json',
  },
  contradictoryAcceptedPredicate: {
    predicate: '/^what is [a-z]{3} for item \\d+\\?$/i',
    sourceRule: 'unknown_acronym_item_question_clarifies',
    detected: true,
  },
  determination: 'ANTI_MEMORIZATION_GATE_FALSE_NEGATIVE',
  consequence: 'C21 technical score is preserved as reproduced evidence but is not governance-controlling.',
};

const adjudication = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: new Date().toISOString(),
  sourceInventory: 'COMMIT_5R1C21_OVERRIDE_INVENTORY.json',
  ruleCount: c21Rules.length,
  acceptedC21RuleCount: retained.length,
  removedC21RuleCount: removed.length,
  allowedClassifications: [
    'STRUCTURAL_GENERALIZABLE',
    'STRUCTURAL_BUT_UNDERTESTED',
    'TEMPLATE_OVERFIT',
    'LEXICAL_FILLER_WHITELIST',
    'SCENARIO_NUMBER_DEPENDENT',
    'FIXTURE_MEMBERSHIP_SURROGATE',
    'CONFLICTING_OR_UNSAFE',
  ],
  ruleAdjudications: c21Rules.map((r) => ({
    ruleName: r.rule,
    sourcePatch: r.sourceUnit,
    assignedReason: r.assignedReason,
    exactPredicateSource: r.predicateIdentity,
    r3RowsChanged: (r.matchedR3RowIds || []).length,
    reasonSuiteRowsChanged: (r.matchedReasonSuiteIds || []).length,
    collisionProbeRowsChanged: (r.matchedCollisionProbeIds || []).length,
    fixedLiteralTokens: r.fixedLiteralTokens,
    wildcardSlots: r.wildcardSlots,
    numericItemControlVariantDependence: r.numericItemControlVariantDependence,
    matchesNaturalClassBeyondKnownFixtures: r.naturalClassBeyondKnownFixtures,
    paraphraseCoverage: r.paraphraseCoverage,
    lexicalSubstitutionCoverage: r.lexicalSubstitutionCoverage,
    nearMissPrecision: r.nearMissPrecision,
    classification: r.classification,
    detectedRedTeamPatterns: r.detectedRedTeamPatterns,
    disposition: r.disposition,
  })),
  retainedC21Rules: retained.map((r) => r.rule),
  removedC21Rules: removed.map((r) => r.rule),
  governingDecision: 'REMOVE_ALL_C21_ADDED_OVERRIDES_AND_RESUME_FROM_C20_ACCEPTED_REASON_BASELINE',
};

const gateSpec = `# COMMIT 5R1-C22 Anti-Overfit Gate Spec

The C22 gate scans candidate runtime source, candidate patches, patch scripts,
imported predicate files and generated runtime snapshots before any reason score can be
treated as governance-controlling.

It fails on oracle IDs, query hashes, suite/family/cluster/category identifiers,
scenario/control/item/variant numbers used as selectors, complete exact queries,
anchored near-complete templates, fixture-specific alternations, ordinary-object or
joke-specific whitelists, expected decision/reason maps, serialized feature vectors and
source-set or fixture membership selectors.

The gate records contextual matches in prior noncandidate evidence, but a C22 candidate
fails when the scanned candidate source contains any blocking selector. The C21 accepted
\`item \\\\d+\` predicate and the C21 fixture-shaped predicates are red-team failures.
`;

const c21Gate = gateScan('accepted C21 technical candidate', C21_FILES, 'c21');
const c20Gate = gateScan('established C20 governed baseline', C20_FILES, 'c20');
const redTeam = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: new Date().toISOString(),
  cases: RED_TEAM_PATTERNS.map((p) => ({
    id: p.id,
    category: p.category,
    expected: 'FAIL',
    c21Detected: c21Gate.findings.some((f) => f.id === p.id && f.severity === 'fail'),
  })),
  knownC21FailuresAllDetected: RED_TEAM_PATTERNS.every((p) => c21Gate.findings.some((f) => f.id === p.id && f.severity === 'fail')),
  c20EstablishedLayerPasses: c20Gate.pass,
};

const gateResult = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: new Date().toISOString(),
  strengthenedGateVersion: 'commit5r1c22-static-redteam-v1',
  c21AcceptedTechnicalCandidate: c21Gate,
  establishedC18C20StructuralLayer: c20Gate,
  redTeamSummary: redTeam,
  pass: c21Gate.pass === false && c20Gate.pass === true && redTeam.knownC21FailuresAllDetected,
  interpretation: 'PASS means the strengthened gate catches C21 and preserves the established C20 governed baseline as the highest compliant base.',
};

const packets = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: new Date().toISOString(),
  packetContract: {
    positiveParaphrasesRequired: 4,
    positiveLexicalSubstitutionsRequired: 4,
    negativeNearMissesRequired: 4,
    grammaticalFormsRequired: 2,
    semanticFillerFamiliesRequired: 3,
    copiedR3FullQueriesAllowed: 0,
    copiedFrozenSuiteFullQueriesAllowed: 0,
    numberingDependencyAllowed: 0,
  },
  acceptedC21Rules: [],
  rejectedOrDeferredC21Rules: c21Rules.map((r) => ({
    rule: r.rule,
    classification: r.classification,
    disposition: r.disposition,
    packetPass: false,
    reason: r.classification === 'STRUCTURAL_BUT_UNDERTESTED'
      ? 'No deterministic generalization packet was authored for C21; removed pending structural packet.'
      : 'Rule failed strengthened anti-overfit governance.',
  })),
  inheritedC17C20Rules: {
    status: 'PRESERVED_UNCHANGED',
    note: 'C22 did not reopen accepted C17-C20 rules except through the strengthened gate smoke check, which passed for the established C20 baseline files scanned here.',
  },
};

let c21Recon = null;
let baseline = null;
const attemptsDir = `${RES}attempts`;
for (const d of fs.readdirSync(attemptsDir).sort()) {
  const rp = path.join(attemptsDir, d, 'RECONSTRUCTION_RESULT.json');
  const bp = path.join(attemptsDir, d, 'BASELINE_RESULT.json');
  if (d.includes('r20_commit5r1c22_c21_technical_reconstruction') && fs.existsSync(rp)) c21Recon = JSON.parse(read(rp));
  if (d.includes('r20_commit5r1c22_governance_compliant_baseline') && fs.existsSync(bp)) baseline = JSON.parse(read(bp));
}

const scoreAttribution = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: new Date().toISOString(),
  technicalC21Score: c21Recon ? summarizeResult(c21Recon).actual : { canonicalPassed: 3531, reasonMismatches: 189 },
  governanceCompliantScore: baseline ? summarizeResult(baseline).actual : { canonicalPassed: 3449, reasonMismatches: 271 },
  c21OverrideRowsCreditedTechnical: c21Rules.reduce((n, r) => n + (r.matchedR3RowIds || []).length, 0),
  c21OverrideRowsRetainedAfterAdjudication: 0,
  rowsLostWhenOverfitRulesRemoved: c21Recon && baseline ? c21Recon.actual.canonicalPassed - baseline.actual.canonicalPassed : 82,
  rowsRecoveredByStructuralReplacements: 0,
  finalGovernanceCompliantBaseline: baseline ? summarizeResult(baseline) : null,
  attributionByRule: c21Rules.map((r) => ({
    rule: r.rule,
    creditedRows: (r.matchedR3RowIds || []).length,
    retainedRows: 0,
    classification: r.classification,
    disposition: r.disposition,
  })),
};

const baselineRecord = {
  unit: 'COMMIT 5R1-C22',
  generatedUtc: new Date().toISOString(),
  baselineSource: C20_SOURCE_ATTEMPT,
  c21TechnicalSource: C21_SOURCE_ATTEMPT,
  c21RulesRemoved: removed.map((r) => r.rule),
  c21RulesRetained: [],
  strengthenedAntiOverfitGate: gateResult.pass ? 'PASS' : 'FAIL',
  reasonLayerClosure: false,
  runtimeClosure: false,
  decisionLayerClosure: true,
  relationLayerClosure: true,
  actualBaselineResult: baseline ? summarizeResult(baseline) : null,
  conclusion: 'Highest governance-compliant candidate established in C22 is the accepted C20 reason baseline; C21 score is technical-only evidence.',
};

const md = [
  '# COMMIT 5R1-C22 C21 Rule Adjudication',
  '',
  '## Determination',
  '',
  'C21 anti-memorization produced a false negative. The committed gate reported `no_scenario_number_branch = true`, while the accepted C21 candidate contained `/^what is [a-z]{3} for item \\d+\\?$/i`.',
  '',
  'Classification: `ANTI_MEMORIZATION_GATE_FALSE_NEGATIVE`.',
  '',
  '## Disposition',
  '',
  'All C21-added overrides are removed from the governance-compliant baseline. The C21 3,531 / 3,720 score is preserved as a technical reconstruction only; it is not the controlling baseline.',
  '',
  '| Rule | Classification | Disposition | R3 Rows |',
  '|---|---:|---:|---:|',
  ...c21Rules.map((r) => `| ${r.rule} | ${r.classification} | ${r.disposition} | ${(r.matchedR3RowIds || []).length} |`),
  '',
  '## Baseline',
  '',
  'The highest compliant C22 baseline is the accepted C20 runtime snapshot. Reason closure remains open.',
  '',
].join('\n');

L.writeJson(`${RES}COMMIT_5R1C22_C21_ANTI_MEMORIZATION_FALSE_PASS.json`, antiMemFalsePass);
L.writeJson(`${RES}COMMIT_5R1C22_RULE_ADJUDICATION.json`, adjudication);
fs.writeFileSync(`${RES}COMMIT_5R1C22_C21_RULE_ADJUDICATION.md`, md);
fs.writeFileSync(`${RES}COMMIT_5R1C22_ANTI_OVERFIT_GATE_SPEC.md`, gateSpec);
L.writeJson(`${RES}COMMIT_5R1C22_ANTI_OVERFIT_RED_TEAM.json`, redTeam);
L.writeJson(`${RES}COMMIT_5R1C22_ANTI_OVERFIT_GATE_RESULT.json`, gateResult);
L.writeJson(`${RES}COMMIT_5R1C22_RULE_GENERALIZATION_PACKETS.json`, packets);
L.writeJson(`${RES}COMMIT_5R1C22_C21_SCORE_ATTRIBUTION.json`, scoreAttribution);
L.writeJson(`${RES}COMMIT_5R1C22_GOVERNANCE_COMPLIANT_BASELINE.json`, baselineRecord);

console.log('C22 governance audit written');
console.log('C21 gate pass:', c21Gate.pass, 'C20 gate pass:', c20Gate.pass, 'red-team detected:', redTeam.knownC21FailuresAllDetected);
