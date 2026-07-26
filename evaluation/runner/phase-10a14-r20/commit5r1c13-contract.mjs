// PHASE-10A14-R20 COMMIT 5R1-C13 — relation scoring contract, baseline summary,
// cardinality/co-occurrence analysis, and the complete 162-row mismatch inventory.
// Derived by inspecting the frozen oracle and the frozen scorer; nothing assumed.
import fs from 'node:fs';
import * as L from './commit5r1c13-lib.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const r3 = L.scoreR3(rows, analyze);
const F = r3.relationFailures;

// ---------------------------------------------------------------- contract
// Empirically probe the frozen scorer semantics rather than assuming them.
const probe = (expected, actual) => expected.every((rt) => actual.includes(rt));
const semanticsProbe = {
  extra_relations_fail_a_row: !probe(['ASKS_DEFINITION_OF'], ['ASKS_DEFINITION_OF', 'QUOTES_TERM']),
  order_affects_scoring: !probe(['A', 'B'], ['B', 'A']),
  duplicates_affect_scoring: !probe(['A'], ['A', 'A']),
  empty_expectation_passes: probe([], []),
  empty_expectation_passes_with_extras: probe([], ['ASKS_DEFINITION_OF']),
};

L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_SCORING_CONTRACT.json', {
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(),
  scorerPath: 'evaluation/runner/phase-10a14-r20/commit5r1-oracle-runner.mjs',
  scorerExpression: 'relationPass = expectedRels.every((rt) => out.relations.includes(rt))',
  exactScorerComparisonFields: {
    compared: ['relation'],
    notCompared: ['source', 'target', 'clauseId', 'evidenceSpan'],
    note: 'The scorer maps every relation object to its `relation` string before comparison. Object fields therefore do NOT affect scoring and are enforced separately by relationObjectIntegrity.',
  },
  setListOrderSemantics: {
    semantics: 'SET CONTAINMENT (expected subset of actual)',
    orderSensitive: false, duplicateSensitive: false,
    extrasFailRow: false,
    consequence: 'Every relation mismatch is necessarily MISSING-ONLY. An extra emitted relation can never fail an R3 row.',
  },
  duplicateHandling: 'ignored by scoring; forbidden by relation-object integrity',
  emptyRelationSemantics: {
    rowsWithNoExpectedRelations: rows.filter((r) => !(r.expectedRelations || []).length).length,
    behaviour: 'a row with no expected relations passes the relation lane unconditionally',
  },
  genericVersusSpecificCooccurrence: {
    ASKS_TAX_TREATMENT_OF_appears_as_expectation: rows.some((r) => (r.expectedRelations || []).some((x) => x.relation === 'ASKS_TAX_TREATMENT_OF')),
    note: 'The generic treatment relation is never required by R3. Because extras are harmless under containment, emitting it alongside a specific relation is scoring-neutral; suppressing a REQUIRED specific relation is fatal.',
  },
  sourceTargetClauseEvidenceSpanAffectScoring: false,
  normalizationAndAliasRules: {
    aliasing: 'none — relation strings are compared verbatim',
    relationTypesClosed: L.RELATION_TYPES,
    aliasesAdded: 0, relationTypesAdded: 0,
  },
  invalidRelationHandling: 'A relation outside the closed set can never satisfy an expectation and is rejected by relation-object integrity.',
  semanticsProbe,
  authority: 'CLAUSE_LEVEL_INTENT_SCHEMA.md + RELATION_AND_PRECEDENCE_SPEC.md (immutable at COMMIT 1)',
});

// --------------------------------------------------- baseline + cardinality
const expCard = {}; const expTypeFreq = {}; const cooc = {};
let rowsWithExp = 0;
for (const r of rows) {
  const e = (r.expectedRelations || []).map((x) => x.relation);
  expCard[e.length] = (expCard[e.length] || 0) + 1;
  if (e.length) rowsWithExp++;
  for (const t of e) expTypeFreq[t] = (expTypeFreq[t] || 0) + 1;
  if (e.length > 1) { const k = [...e].sort().join(' + '); cooc[k] = (cooc[k] || 0) + 1; }
}
const actualTypeFreq = {};
for (const r of rows) for (const x of (analyze(r.query).relations || [])) actualTypeFreq[x.relation] = (actualTypeFreq[x.relation] || 0) + 1;

const perType = {};
for (const r of rows) {
  const e = (r.expectedRelations || []).map((x) => x.relation);
  if (!e.length) continue;
  const a = (analyze(r.query).relations || []).map((x) => x.relation);
  for (const t of e) {
    perType[t] ??= { required: 0, satisfied: 0, missing: 0 };
    perType[t].required++;
    if (a.includes(t)) perType[t].satisfied++; else perType[t].missing++;
  }
}

L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_BASELINE_SUMMARY.json', {
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(),
  baselineCandidate: 'locked C12 dev-05 (reconstructed)',
  servicesTreeDigest: L.runtimeIdentity().servicesTreeDigest,
  r3Counts: r3.counts,
  relationPassed: r3.counts.relationPassed, relationMismatches: r3.counts.relationMismatches,
  rowsWithExpectations: rowsWithExp, rowsWithoutExpectations: rows.length - rowsWithExp,
  relationRowsPassed: r3.counts.relationRowsPassed,
  perRelationTypeSatisfaction: perType,
  decisionLockHeld: r3.counts.decisionMismatches === 0,
  reasonMismatchesDiagnostic: r3.counts.reasonMismatches,
});

L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_CARDINALITY_AND_COOCCURRENCE.json', {
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(),
  expectedCardinalityHistogram: expCard,
  maxExpectedCardinality: Math.max(...Object.keys(expCard).map(Number)),
  expectedTypeFrequency: expTypeFreq,
  actualTypeFrequencyBaseline: actualTypeFreq,
  requiredCooccurrencePairs: cooc,
  cooccurrenceRule: 'Emit both members only where R3 requires that exact pair. Because extras are scoring-neutral under containment, no pair may be SUPPRESSED, and none must be invented for scoring purposes.',
  genericRelationNeverRequired: !expTypeFreq.ASKS_TAX_TREATMENT_OF,
});

// ------------------------------------------------ 162-row mismatch inventory
const classify = (f) => {
  const m = f.missing, e = f.extra;
  if (!m.length) return 'extra_only';
  const SPECIFIC = ['ASKS_DEDUCTIBILITY_OF', 'ASKS_VAT_TREATMENT_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON', 'ASKS_TAX_COMPLIANCE_FOR'];
  const NONTAX = ['NAMES_AS_INTERNAL_LABEL', 'EXPANDS_AS_NON_TAX', 'QUOTES_TERM', 'REQUESTS_NON_TAX_ACTION_ON'];
  if (m.includes('NEGATES_TAX_RELEVANCE')) return 'wrong_negation_relation';
  if (m.some((x) => NONTAX.includes(x))) {
    if (m.includes('EXPANDS_AS_NON_TAX')) return 'wrong_definition_or_acronym_relation';
    return 'wrong_non_tax_relation';
  }
  if (m.includes('ASKS_DEFINITION_OF')) return 'wrong_definition_or_acronym_relation';
  if (m.some((x) => SPECIFIC.includes(x))) {
    if (e.includes('ASKS_TAX_TREATMENT_OF')) return 'generic_specific_conflict';
    if (!e.length) return 'empty_nonempty_mismatch';
    return 'wrong_specific_relation';
  }
  if (m.length > 1) return 'wrong_cardinality_or_cooccurrence';
  return 'missing_only';
};

const inventory = F.map((f) => ({
  oracleId: f.oracleId,
  queryHash: L.sha256(Buffer.from(f.query)).slice(0, 16),
  sourceSet: f.sourceSet, primaryCategory: f.primaryCategory,
  expectedDecision: f.expectedDecision, actualDecision: f.actualDecision,
  expectedReasonCodeFamily: f.expectedReasonCodeFamily, actualReason: f.actualReason,
  primaryClause: f.primaryTaskClause ?? null,
  requestedAction: f.taskVerb ?? null, requestedTarget: f.taskTarget ?? null,
  expectedRelations: f.expectedRelations, actualRelations: f.actualRelations,
  missing: f.missing, extra: f.extra,
  substitutionCardinalityClass: f.missing.length && f.extra.length ? 'substitution'
    : f.missing.length && !f.extra.length ? 'omission_from_empty_or_subset'
    : 'extra_only',
  objectFieldsStatus: 'not scored by the frozen scorer; enforced by relation-object integrity',
  structuralPartition: classify(f),
  decisionPass: f.decisionPass, reasonPass: f.reasonPass,
  possibleOracleConflict: false,
}));

const partition = {};
for (const r of inventory) partition[r.structuralPartition] = (partition[r.structuralPartition] || 0) + 1;

const REMEDIATION = {
  wrong_definition_or_acronym_relation: 'definition/expansion relation family — emit ASKS_DEFINITION_OF / EXPANDS_AS_NON_TAX from definition intent',
  wrong_non_tax_relation: 'non-tax action family — emit label/quotation/non-tax-action relations from the requested action',
  wrong_negation_relation: 'negation family — emit NEGATES_TAX_RELEVANCE from explicit scoped negation',
  wrong_specific_relation: 'specific tax relation family — select the most specific supported relation from the tax predicate',
  generic_specific_conflict: 'specific tax relation family — generic emitted where a specific relation is required',
  empty_nonempty_mismatch: 'relation emission family — no relation emitted where one is required',
  wrong_cardinality_or_cooccurrence: 'co-occurrence family — required pair not emitted in full',
  missing_only: 'generic emission family',
  extra_only: 'not reachable under containment semantics',
};
for (const r of inventory) r.genericRemediationFamily = REMEDIATION[r.structuralPartition];

// confusion matrix: expected type -> what was emitted instead
const confusion = {};
for (const f of F) {
  for (const miss of f.missing) {
    confusion[miss] ??= { missingCount: 0, emittedInstead: {} };
    confusion[miss].missingCount++;
    const inst = f.actualRelations.length ? f.actualRelations.join('+') : '(none)';
    confusion[miss].emittedInstead[inst] = (confusion[miss].emittedInstead[inst] || 0) + 1;
  }
}

const ids = inventory.map((r) => r.oracleId);
const integrity = {
  rows: inventory.length, expected: 162,
  missing: 162 - inventory.length,
  duplicateAssignment: ids.length - new Set(ids).size,
  unclassified: inventory.filter((r) => !r.structuralPartition || !r.genericRemediationFamily).length,
  possibleOracleConflict: inventory.filter((r) => r.possibleOracleConflict).length,
  extraOnlyRows: partition.extra_only || 0,
};

L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_MISMATCH_INVENTORY.json', {
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(),
  baselineCandidate: 'locked C12 dev-05 (reconstructed)',
  integrity, partition, inventory,
  analysisEvidenceOnlyNotice: 'Oracle IDs, query hashes, source sets and cluster names in this file are ANALYSIS EVIDENCE ONLY and must never become runtime features.',
});
L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_CONFUSION_MATRIX.json', {
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(), confusion,
});
L.writeJson(L.RES + 'COMMIT_5R1C13_RELATION_STRUCTURAL_PARTITION.json', {
  unit: 'COMMIT 5R1-C13', generatedUtc: new Date().toISOString(),
  partition, remediationFamilies: REMEDIATION,
  partitionByExpectedDecision: inventory.reduce((a, r) => {
    a[r.structuralPartition] ??= {};
    a[r.structuralPartition][r.expectedDecision] = (a[r.structuralPartition][r.expectedDecision] || 0) + 1;
    return a;
  }, {}),
});

console.log('semanticsProbe', JSON.stringify(semanticsProbe));
console.log('relation mismatches =', F.length);
console.log('integrity', JSON.stringify(integrity));
console.log('partition', JSON.stringify(partition, null, 2));
console.log('perRelationTypeSatisfaction', JSON.stringify(perType, null, 2));
console.log('confusion', JSON.stringify(confusion, null, 2));
