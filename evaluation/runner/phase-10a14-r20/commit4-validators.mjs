// PHASE-10A14-R20 COMMIT 4 validators. No classifier/analyzer import; no model/
// network. Pure structural validation of the frozen oracle and its provenance.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REPO } from './identity.mjs';

const normExact = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
const nearSig = (s) => normExact(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(case|no)\s*\d+\b/g, '').replace(/\s+/g, ' ').trim();

const DECISIONS = ['ALLOW', 'REFUSE', 'CLARIFY'];
const REASON_FAMILIES = [
  'explicit_tax_task_relation', 'tax_treatment_of_ordinary_object', 'tax_compliance_task',
  'tax_definition_with_context', 'ambiguous_tax_acronym', 'explicit_non_tax_task',
  'non_tax_label_or_name', 'non_tax_expansion', 'quoted_tax_term_only',
  'tax_negation_but_tax_review_requested', 'no_tax_relation',
];
const RELATION_TYPES = [
  'ASKS_TAX_TREATMENT_OF', 'ASKS_TAX_COMPLIANCE_FOR', 'ASKS_DEDUCTIBILITY_OF', 'ASKS_VAT_TREATMENT_OF',
  'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON', 'ASKS_DEFINITION_OF', 'NAMES_AS_INTERNAL_LABEL',
  'EXPANDS_AS_NON_TAX', 'QUOTES_TERM', 'NEGATES_TAX_RELEVANCE', 'REQUESTS_NON_TAX_ACTION_ON',
];

const PRIMARY_QUOTAS = {
  mixed_domain_genuine_tax: 300, explicit_non_tax_task: 300, acronym_capitalization_expansion: 200,
  quoted_term_only: 100, negation_contradiction: 100, internal_label_proper_name: 100, tax_compliance_task: 100,
};
const CROSS_CUTTING_QUOTAS = {
  filipino_taglish: 100, capitalization_variant: 100, multi_clause: 50, definition_intent: 100,
  ordinary_object_tax: 300, non_tax_homograph: 150, bare_ambiguous_acronym: 75,
  non_tax_expansion: 75, bir_context_acronym: 75, quoted_metalinguistic: 100, negation_scope: 100,
};

// Source-integrity + contamination (Attempt I).
export function sourceIntegrityAndContamination(sourceHashes) {
  const expected = {
    r19_1120: '55183f06b043187c0b26cd66e7e699a8265721fedb293ffe79b2b5825a66cd2f',
    r18_567: 'e403594110c92f35eba6d64b4aadda62e0c7d4c3cc3d8c2e35b6803a7c1ceec4',
  };
  const checks = [];
  const ok = (n, c, d = '') => checks.push({ name: n, pass: !!c, detail: d });
  ok('r19_1120_sha256', sourceHashes.r19_1120.sha256 === expected.r19_1120, sourceHashes.r19_1120.sha256);
  ok('r18_567_sha256', sourceHashes.r18_567.sha256 === expected.r18_567, sourceHashes.r18_567.sha256);
  ok('r17_210_present', typeof sourceHashes.r17_210.sha256 === 'string' && sourceHashes.r17_210.sha256.length === 64);

  // Static contamination: builder & new-row source must not import any classifier.
  const builderSrc = readFileSync(`${REPO}/evaluation/runner/phase-10a14-r20/commit4-oracle-builder.mjs`, 'utf8');
  const newRowsSrc = readFileSync(`${REPO}/evaluation/runner/phase-10a14-r20/commit4-new-rows.mjs`, 'utf8');
  for (const [name, src] of [['builder', builderSrc], ['new-rows', newRowsSrc]]) {
    ok(`${name}_no_analyzer_import`, !/philippine-tax-intent-analyzer/.test(src));
    ok(`${name}_no_domain_boundary_import`, !/philippine-tax-domain-boundary/.test(src));
    ok(`${name}_no_model_network`, !/openai|anthropic|fetch\(|node-fetch|axios|embed|rerank/.test(src));
  }
  const passed = checks.filter((c) => c.pass).length;
  return { validator: 'r20-commit4-source-integrity-and-contamination', total: checks.length, passed, allPassed: passed === checks.length, checks };
}

// Schema / quota / expectation (Attempt K).
export function schemaQuotaExpectation(rows) {
  const checks = [];
  const ok = (n, c, d = '') => checks.push({ name: n, pass: !!c, detail: d });

  // Schema: every row has one decision, one reason family, closed relations, no analyzer output.
  let badDec = 0, badRF = 0, badRel = 0, contaminated = 0, missingId = 0;
  for (const r of rows) {
    if (!DECISIONS.includes(r.expectedDecision)) badDec++;
    if (!REASON_FAMILIES.includes(r.expectedReasonCodeFamily)) badRF++;
    for (const rel of r.expectedRelations || []) if (!RELATION_TYPES.includes(rel.relation)) badRel++;
    if (r.actualDecision !== null || r.actualReason !== null) contaminated++;
    if (!r.oracleId) missingId++;
  }
  ok('all_decisions_closed', badDec === 0, `bad=${badDec}`);
  ok('all_reason_families_closed', badRF === 0, `bad=${badRF}`);
  ok('all_relations_closed', badRel === 0, `bad=${badRel}`);
  ok('no_analyzer_output_contamination', contaminated === 0, `contaminated=${contaminated}`);
  ok('all_rows_have_id', missingId === 0);

  // Source counts.
  const bySet = {};
  for (const r of rows) bySet[r.sourceSet] = (bySet[r.sourceSet] || 0) + 1;
  ok('source_1120', bySet.r19_1120 === 1120, `${bySet.r19_1120}`);
  ok('source_567', bySet.r18_corrected_567 === 567, `${bySet.r18_corrected_567}`);
  ok('source_210', bySet.r17_accepted_control === 210, `${bySet.r17_accepted_control}`);

  // New primary-category quotas (compositional new rows only, exclude metamorphic).
  const newComp = rows.filter((r) => r.sourceSet === 'r20_new' && r.primaryCategory !== 'metamorphic');
  const catCounts = {};
  for (const r of newComp) catCounts[r.primaryCategory] = (catCounts[r.primaryCategory] || 0) + 1;
  for (const [cat, min] of Object.entries(PRIMARY_QUOTAS)) {
    ok(`quota_${cat}`, (catCounts[cat] || 0) >= min, `${catCounts[cat] || 0}/${min}`);
  }
  ok('new_compositional_min_1200', newComp.length >= 1200, `${newComp.length}`);

  // Cross-cutting quotas (over all new rows incl. metamorphic tags).
  const newRows = rows.filter((r) => r.sourceSet === 'r20_new');
  const secCounts = {};
  for (const r of newRows) for (const t of r.secondaryTags || []) secCounts[t] = (secCounts[t] || 0) + 1;
  for (const [tag, min] of Object.entries(CROSS_CUTTING_QUOTAS)) {
    ok(`crosscut_${tag}`, (secCounts[tag] || 0) >= min, `${secCounts[tag] || 0}/${min}`);
  }

  // Dual scoring preserved on all 567; 56 divergence tagged.
  const dual = rows.filter((r) => r.sourceSet === 'r18_corrected_567' && r.historicalScoringMode === 'dual').length;
  const div = rows.filter((r) => r.scoringSemanticsFlag === 'SCORING_SEMANTICS_DIVERGENCE').length;
  ok('dual_scoring_567', dual === 567, `${dual}`);
  ok('divergence_tagged_56', div === 56, `${div}`);

  const passed = checks.filter((c) => c.pass).length;
  return { validator: 'r20-commit4-schema-quota-expectation', total: checks.length, passed, allPassed: passed === checks.length, checks, categoryCounts: catCounts, crossCuttingCounts: secCounts, bySet };
}

// Duplicate + metamorphic (Attempt L).
export function duplicateAndMetamorphic(rows, mmGroups) {
  const checks = [];
  const ok = (n, c, d = '') => checks.push({ name: n, pass: !!c, detail: d });

  // Duplicate oracleIds across the whole oracle.
  const ids = new Set(); let dupId = 0;
  for (const r of rows) { if (ids.has(r.oracleId)) dupId++; ids.add(r.oracleId); }
  ok('no_duplicate_oracleId', dupId === 0, `${dupId}`);

  // Exact-duplicate NEW queries = 0 (inherited source dups are preserved, reported separately).
  const newRows = rows.filter((r) => r.sourceSet === 'r20_new');
  const nex = new Map(); let dupNew = 0;
  for (const r of newRows) { const e = normExact(r.query); if (nex.has(e)) dupNew++; else nex.set(e, r.oracleId); }
  ok('no_exact_duplicate_new_queries', dupNew === 0, `${dupNew}`);

  // Inherited exact duplicates (report, do not fail).
  const inh = rows.filter((r) => r.sourceSet !== 'r20_new');
  const iex = new Map(); let dupInh = 0;
  for (const r of inh) { const e = normExact(r.query); if (iex.has(e)) dupInh++; else iex.set(e, r.oracleId); }

  // Near-duplicate clusters over new rows; no cluster > 10% of any primary quota.
  const clusters = new Map();
  for (const r of newRows) { const k = nearSig(r.query); clusters.set(k, (clusters.get(k) || 0) + 1); }
  const maxCluster = Math.max(...clusters.values());
  ok('near_dup_cluster_bounded', maxCluster <= 30, `maxCluster=${maxCluster}`); // 30 = 10% of smallest 300 quota; small clusters here

  // Metamorphic: >=36 groups, >=3 variants, complete invariant/rationale.
  ok('metamorphic_group_count', mmGroups.length >= 36, `${mmGroups.length}`);
  let badGroup = 0;
  for (const g of mmGroups) {
    if (g.members.length < 3) badGroup++;
    if (!g.invariantExpectedDecision || !g.whyInvariant || !g.transformationType) badGroup++;
    if (g.memberIds.length !== g.members.length) badGroup++;
  }
  ok('metamorphic_groups_well_formed', badGroup === 0, `bad=${badGroup}`);

  const passed = checks.filter((c) => c.pass).length;
  return {
    validator: 'r20-commit4-duplicate-and-metamorphic',
    total: checks.length, passed, allPassed: passed === checks.length, checks,
    duplicateNewQueries: dupNew, duplicateOracleIds: dupId,
    inheritedExactDuplicates: dupInh, maxNearDupCluster: maxCluster,
    metamorphicGroups: mmGroups.length,
  };
}
