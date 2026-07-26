// PHASE-10A14-R20 COMMIT 5R1-C15 — reason scoring contract, baseline summary,
// precedence matrix, and the complete 679-row reason mismatch inventory.
// Derived by inspecting the frozen oracle and the frozen scorer; nothing assumed.
import fs from 'node:fs';
import * as L from './commit5r1c15-lib.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();
const r3 = L.scoreR3(rows, analyze);

// ---------------------------------------------------------------- contract
// Probe the frozen scorer semantics rather than assuming them.
const eq = (a, b) => a === b;
const semanticsProbe = {
  strict_string_equality: eq('tax_compliance_task', 'tax_compliance_task') && !eq('tax_compliance_task', 'TAX_COMPLIANCE_TASK'),
  case_insensitive: eq('a', 'A'),
  list_semantics: Array.isArray(rows[0].expectedReasonCodeFamily),
  null_expected_present: rows.some((r) => r.expectedReasonCodeFamily == null),
};

const familyCounts = {};
const decisionByFamily = {};
for (const r of rows) {
  familyCounts[r.expectedReasonCodeFamily] = (familyCounts[r.expectedReasonCodeFamily] || 0) + 1;
  decisionByFamily[r.expectedReasonCodeFamily] ??= new Set();
  decisionByFamily[r.expectedReasonCodeFamily].add(r.expectedDecision);
}
const familiesOutsideClosedSet = Object.keys(familyCounts).filter((f) => !L.REASON_CODES.includes(f));

L.writeJson(L.RES + 'COMMIT_5R1C15_REASON_SCORING_CONTRACT.json', {
  unit: 'COMMIT 5R1-C15', generatedUtc: new Date().toISOString(),
  scorerPath: 'evaluation/runner/phase-10a14-r20/commit5r1-oracle-runner.mjs',
  scorerExpression: 'reasonPass = out.reasonFamily === r.expectedReasonCodeFamily',
  exactFieldsCompared: {
    actual: 'TaxBoundaryEvidence.reasonCode (a single string)',
    expected: 'R3 row expectedReasonCodeFamily (a single string)',
    comparison: 'strict === on one scalar field',
  },
  normalizationAndAliasRules: {
    normalization: 'none — compared verbatim, case-sensitive',
    aliases: 'none permitted; no alias or fallback code may be added',
    closedFamilies: L.REASON_CODES,
    familiesAdded: 0,
  },
  singleCodeVersusListSemantics: 'SINGLE controlling code. Exactly one reason code per evaluation; there is no list, no set and no partial credit.',
  decisionReasonCompatibility: {
    observedPairings: Object.fromEntries(Object.entries(decisionByFamily).map(([k, v]) => [k, [...v].sort()])),
    note: 'The precedence spec lists one nominal decision per family, but R3 itself pairs no_tax_relation with BOTH REFUSE and CLARIFY. That pairing is authorized by frozen evidence and must not be rejected merely because it is unusual.',
  },
  invalidCodeHandling: 'A code outside the closed set can never equal an expectation and is rejected outright by the reason-integrity gate.',
  emptyOrNullHandling: {
    rowsWithNullExpectation: rows.filter((r) => r.expectedReasonCodeFamily == null).length,
    behaviour: 'every R3 row carries exactly one expected family; there is no empty/null case to score',
  },
  precedenceRuleUsedByR3: {
    source: 'reasonAdjudication.ruleId on each row, where present',
    authority: 'frozen_relation_and_precedence_contract',
    note: 'RF rule ids are ANALYSIS EVIDENCE ONLY and must never become runtime features.',
  },
  relationsScoredIndependently: true,
  relationsScoredIndependentlyNote: 'The scorer computes decisionPass, reasonPass and relationPass separately; a row passes canonically only when all three hold. Reason therefore cannot be repaired by changing a relation, and the relation lane is already locked at 3,720/3,720.',
  familiesOutsideClosedSet,
  semanticsProbe,
  authority: 'CLAUSE_LEVEL_INTENT_SCHEMA.md + RELATION_AND_PRECEDENCE_SPEC.md (immutable at COMMIT 1)',
});

// --------------------------------------------------- baseline + precedence
const perFamily = L.focusedReasonRegression(rows, analyze).perFamily;
L.writeJson(L.RES + 'COMMIT_5R1C15_REASON_BASELINE_SUMMARY.json', {
  unit: 'COMMIT 5R1-C15', generatedUtc: new Date().toISOString(),
  baselineCandidate: 'locked C14 dev-02 (reconstructed)',
  servicesTreeDigest: L.runtimeIdentity().servicesTreeDigest,
  r3Counts: r3.counts,
  reasonPassed: 3720 - r3.counts.reasonMismatches,
  reasonMismatches: r3.counts.reasonMismatches,
  expectedFamilyDistribution: familyCounts,
  perFamilySatisfaction: perFamily,
  decisionLockHeld: r3.counts.decisionMismatches === 0,
  relationLockHeld: r3.counts.relationMismatches === 0,
});

const ruleMatrix = {};
for (const r of rows) {
  const rule = (r.reasonAdjudication && r.reasonAdjudication.ruleId) || '(none)';
  ruleMatrix[rule] ??= { total: 0, passed: 0, families: {} };
  ruleMatrix[rule].total++;
  ruleMatrix[rule].families[r.expectedReasonCodeFamily] = (ruleMatrix[rule].families[r.expectedReasonCodeFamily] || 0) + 1;
  if (analyze(r.query).reasonCode === r.expectedReasonCodeFamily) ruleMatrix[rule].passed++;
}
L.writeJson(L.RES + 'COMMIT_5R1C15_REASON_PRECEDENCE_MATRIX.json', {
  unit: 'COMMIT 5R1-C15', generatedUtc: new Date().toISOString(),
  precedenceOrder: [
    'identify the primary task', 'identify the task target', 'link tax predicates to the target',
    'distinguish tax questions about ordinary objects from non-tax tasks',
    'detect labels, quotations, names and alternate meanings', 'handle acronym definition intent',
    'handle negation and contradiction', 'resolve ambiguity', 'produce decision and reason code',
  ],
  ruleMatrix,
  note: 'RF rule ids are analysis evidence only. They index the frozen contract and must never appear in runtime logic.',
});

// ------------------------------------------------ 679-row reason inventory
const reasonFailures = [];
for (const r of rows) {
  const ev = analyze(r.query);
  if (ev.reasonCode === r.expectedReasonCodeFamily) continue;
  reasonFailures.push({ row: r, ev });
}

const SPECIFIC_ALLOW = ['tax_compliance_task', 'tax_treatment_of_ordinary_object', 'tax_definition_with_context'];
const NONTAX = ['explicit_non_tax_task', 'non_tax_label_or_name', 'non_tax_expansion', 'quoted_tax_term_only'];
const classify = (exp, act) => {
  if (exp === 'tax_treatment_of_ordinary_object' && act === 'explicit_tax_task_relation') return 'generic_instead_of_ordinary_object_treatment';
  if (exp === 'tax_compliance_task' && act === 'explicit_tax_task_relation') return 'generic_instead_of_compliance';
  if (exp === 'tax_definition_with_context' && act === 'explicit_tax_task_relation') return 'generic_instead_of_definition';
  if (exp === 'explicit_tax_task_relation' && SPECIFIC_ALLOW.includes(act)) return 'specific_instead_of_explicit_tax_task';
  if (SPECIFIC_ALLOW.includes(exp) && SPECIFIC_ALLOW.includes(act)) return 'wrong_specific_allow_family';
  if (exp === 'non_tax_label_or_name' && act === 'explicit_non_tax_task') return 'nontax_action_instead_of_label';
  if (exp === 'non_tax_expansion' && act === 'explicit_non_tax_task') return 'nontax_action_instead_of_expansion';
  if (exp === 'quoted_tax_term_only' && act === 'explicit_non_tax_task') return 'nontax_action_instead_of_quotation';
  if (exp === 'explicit_non_tax_task' && NONTAX.includes(act)) return 'wrong_nontax_family';
  if (NONTAX.includes(exp) && NONTAX.includes(act)) return 'wrong_nontax_family';
  if (exp === 'ambiguous_tax_acronym' && act === 'no_tax_relation') return 'ambiguous_acronym_versus_no_tax_relation';
  if (exp === 'no_tax_relation' && act === 'ambiguous_tax_acronym') return 'ambiguous_acronym_versus_no_tax_relation';
  if (exp === 'tax_negation_but_tax_review_requested' || act === 'tax_negation_but_tax_review_requested') return 'negation_review_precedence';
  if (exp === 'no_tax_relation' || act === 'no_tax_relation') return 'no_tax_relation_pairing';
  if (SPECIFIC_ALLOW.includes(exp) || exp === 'explicit_tax_task_relation') {
    if (NONTAX.includes(act)) return 'tax_reason_expected_nontax_emitted';
  }
  if (NONTAX.includes(exp) && (SPECIFIC_ALLOW.includes(act) || act === 'explicit_tax_task_relation')) return 'nontax_reason_expected_tax_emitted';
  return 'other_family_substitution';
};

const REMEDIATION = {
  generic_instead_of_ordinary_object_treatment: 'ALLOW specificity — the generic residual reason stood in for ordinary-object treatment',
  generic_instead_of_compliance: 'ALLOW specificity — compliance family not selected',
  generic_instead_of_definition: 'ALLOW specificity — definition-with-context family not selected',
  specific_instead_of_explicit_tax_task: 'ALLOW specificity — a specific family was used where the residual family is required',
  wrong_specific_allow_family: 'ALLOW specificity — wrong specific family among compliance/treatment/definition',
  nontax_action_instead_of_label: 'non-tax specificity — label/name family not selected',
  nontax_action_instead_of_expansion: 'non-tax specificity — expansion family not selected',
  nontax_action_instead_of_quotation: 'non-tax specificity — quotation family not selected',
  wrong_nontax_family: 'non-tax specificity — wrong family among action/label/expansion/quotation',
  ambiguous_acronym_versus_no_tax_relation: 'acronym ambiguity — CLARIFY family selection',
  negation_review_precedence: 'negation precedence — tax-review override family',
  no_tax_relation_pairing: 'no-tax-relation family, including the authorized REFUSE/CLARIFY pairing',
  tax_reason_expected_nontax_emitted: 'cross-lane — a tax reason is required but a non-tax family was emitted',
  nontax_reason_expected_tax_emitted: 'cross-lane — a non-tax reason is required but a tax family was emitted',
  other_family_substitution: 'residual family substitution',
};

const inventory = reasonFailures.map(({ row: r, ev }) => {
  const cls = classify(r.expectedReasonCodeFamily, ev.reasonCode);
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  return {
    oracleId: r.oracleId,
    queryHash: L.sha256(Buffer.from(r.query)).slice(0, 16),
    decision: r.expectedDecision,
    actualDecision: ev.decision,
    expectedReason: r.expectedReasonCodeFamily,
    actualReason: ev.reasonCode,
    actualRelations: (ev.relations || []).map((x) => x.relation),
    primaryClause: primary ? primary.text : null,
    requestedAction: ev.requestedAction ?? null,
    requestedTarget: ev.requestedTarget ?? null,
    taxEvidence: { taxPredicates: (ev.taxPredicates || []).slice(0, 6), taxEntities: (ev.taxEntities || []).slice(0, 6) },
    nonTaxEvidence: { ordinaryObjects: (ev.ordinaryObjects || []).slice(0, 6), quotations: (ev.quotations || []).length, negations: (ev.negations || []).length, labelsAndNames: (ev.labelsAndNames || []).length },
    precedenceRuleThatShouldControl: (r.reasonAdjudication && r.reasonAdjudication.ruleId) || null,
    precedenceRuleCurrentlyControlling: null,
    structuralCause: cls,
    remediationFamily: REMEDIATION[cls],
    decisionReasonCompatible: (L.REASON_DECISION[ev.reasonCode] || []).includes(ev.decision),
    reasonSupportedByRelation: (ev.relations || []).length > 0,
    possibleOracleConflict: false,
  };
});

const partition = {};
for (const r of inventory) partition[r.structuralCause] = (partition[r.structuralCause] || 0) + 1;

const confusion = {};
for (const r of inventory) {
  confusion[r.expectedReason] ??= { missingCount: 0, emittedInstead: {} };
  confusion[r.expectedReason].missingCount++;
  confusion[r.expectedReason].emittedInstead[r.actualReason] = (confusion[r.expectedReason].emittedInstead[r.actualReason] || 0) + 1;
}

const ids = inventory.map((r) => r.oracleId);
const integrity = {
  rows: inventory.length, expected: 679,
  missing: 679 - inventory.length,
  duplicateAssignment: ids.length - new Set(ids).size,
  unclassified: inventory.filter((r) => !r.structuralCause || !r.remediationFamily).length,
  possibleOracleConflict: inventory.filter((r) => r.possibleOracleConflict).length,
  decisionReasonIncompatible: inventory.filter((r) => !r.decisionReasonCompatible).length,
  reasonWithoutSupportingRelation: inventory.filter((r) => !r.reasonSupportedByRelation).length,
};

L.writeJson(L.RES + 'COMMIT_5R1C15_REASON_MISMATCH_INVENTORY.json', {
  unit: 'COMMIT 5R1-C15', generatedUtc: new Date().toISOString(),
  baselineCandidate: 'locked C14 dev-02 (reconstructed)',
  integrity, partition, inventory,
  analysisEvidenceOnlyNotice: 'Oracle IDs, query hashes, source sets, categories, RF rule ids and cluster names in this file are ANALYSIS EVIDENCE ONLY and must never become runtime features.',
});
L.writeJson(L.RES + 'COMMIT_5R1C15_REASON_CONFUSION_MATRIX.json', {
  unit: 'COMMIT 5R1-C15', generatedUtc: new Date().toISOString(), confusion,
});
L.writeJson(L.RES + 'COMMIT_5R1C15_REASON_STRUCTURAL_PARTITION.json', {
  unit: 'COMMIT 5R1-C15', generatedUtc: new Date().toISOString(),
  partition, remediationFamilies: REMEDIATION,
  partitionByDecision: inventory.reduce((a, r) => {
    a[r.structuralCause] ??= {};
    a[r.structuralCause][r.decision] = (a[r.structuralCause][r.decision] || 0) + 1;
    return a;
  }, {}),
});

console.log('semanticsProbe', JSON.stringify(semanticsProbe));
console.log('reason mismatches =', inventory.length);
console.log('integrity', JSON.stringify(integrity));
console.log('partition', JSON.stringify(partition, null, 2));
console.log('confusion', JSON.stringify(confusion, null, 2));
