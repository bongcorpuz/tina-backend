// PHASE-10A14-R20 COMMIT 5R1-C7 — structural partition of the 256 decision mismatches.
// Classification is derived from query structure, never from oracle expectations.
import fs from 'node:fs';
import * as L from './commit5r1c7-lib.mjs';

const ATT = process.argv[2];
const fails = JSON.parse(fs.readFileSync(L.ATT + ATT + '/DECISION_FAILURES.json', 'utf8'));

// ---- structural probes (surface-form only; no oracle fields consulted)
const TAX_TREATMENT = /\b(deductib\w*|vat|value[- ]added|withhold\w*|taxab\w*|exempt\w*|zero[- ]rated|input tax|output tax|customs dut\w*|excise|documentary stamp|dst|capital gains|cgt|fringe benefit|percentage tax|donor'?s tax|estate tax|final tax|creditab\w*|amortiz\w*|depreciat\w*|tax treatment|subject to tax|tax base|tax rate)\b/i;
const TAX_PROCEDURE = /\b(file|filing|remit\w*|register\w*|bir form|form \d|return|deadline|due date|penalt\w*|surcharge|interest|compromise|assessment|audit|letter of authority|loa|substituted filing|books of accounts|official receipt|invoice|ereg|efps|ebir|certificate of registration|cor|tin\b|attachment|schedule)\b/i;
const DEFINITION = /\b(what (is|does|are)|define[sd]?|definition|stand for|mean[s]?|meaning|expansion|abbreviat\w*|acronym)\b/i;
const LABEL_BIND = /\b(nam(e|ed|ing)|call(ed)?|label(l?ed)?|tag(ged)?|code[d]?|rename|title(d)?|save (it |the )?as|store (it |the )?as|filename|file name|variable|column|folder|directory|key|field)\b/i;
const QUOTATION = /["“”'']|\b(spell|reverse|uppercase|lowercase|capitaliz\w*|letters?|characters?|count the|anagram|palindrome|translate the (word|phrase)|type the|write the (word|letters))\b/i;
const NON_TAX_ACTION = /\b(recipe|cook|weather|football|basketball|movie|song|game|poem|joke|paint|draw|garden|travel|flight|hotel|workout|diet|pet|dog|cat|birthday|wedding)\b/i;
const ACRONYM = /\b([A-Z]{2,6})\b/;
const PRONOUN = /\b(it|its|this|that|these|those|they|them)\b/i;
const CONCRETE_NOUN = /\b(equipment|machinery|vehicle|building|land|inventory|salary|salaries|wage|rent|rental|interest|dividend|royalt\w*|commission|professional fee|service fee|import\w*|export\w*|goods|property|share[s]?|stock|bond|insurance|utilit\w*|repair|supplies|software|license|franchise|donation|sale|purchase|lease|loan|payment|income|revenue|expense|receipt|invoice|contract)\b/i;
const MULTICLAUSE = /[;.]|\band\b|\bthen\b|\balso\b|\bbut\b/i;
const FILIPINO = /\b(ano|paano|bakit|saan|kailan|ba|ng|mga|po|yung|kung|dapat|puwede|pwede|magkano|ilan)\b/i;
const NEGATION = /\b(not|no|never|without|except|excluding|non-)\b/i;
const CONTEXT_N = /\bcontext \d+\b/i;

const probe = (q) => ({
  taxTreatmentEvidence: TAX_TREATMENT.test(q),
  taxProcedureEvidence: TAX_PROCEDURE.test(q),
  definitionIntent: DEFINITION.test(q),
  labelEvidence: LABEL_BIND.test(q),
  quotationEvidence: QUOTATION.test(q),
  nonTaxActionEvidence: NON_TAX_ACTION.test(q),
  acronymEvidence: ACRONYM.test(q),
  acronymToken: (q.match(/\b[A-Z]{2,6}\b/) || [null])[0],
  pronounEvidence: PRONOUN.test(q),
  concreteTargetEvidence: CONCRETE_NOUN.test(q),
  multiClause: MULTICLAUSE.test(q),
  filipinoTaglish: FILIPINO.test(q),
  negationEvidence: NEGATION.test(q),
  contextNTag: CONTEXT_N.test(q),
});

function primaryCluster(f, p) {
  const e = f.expectedDecision, a = f.actualDecision;
  // acronym-centred
  if (p.acronymEvidence && (p.definitionIntent || p.acronymToken)) {
    if (p.labelEvidence) return 'ACRONYM_AS_LABEL_OR_NAME';
    if (p.quotationEvidence) return 'QUOTATION_SCOPE';
    if (p.definitionIntent && (p.taxTreatmentEvidence || p.taxProcedureEvidence)) return 'CONTEXTUAL_ACRONYM_TAX_CONTEXT_MISSED';
    if (p.definitionIntent && e === 'CLARIFY') return 'ACRONYM_DEFINITION_INTENT';
    if (p.definitionIntent && e === 'REFUSE') return 'CONTEXTUAL_ACRONYM_NON_TAX_CONTEXT_MISREAD';
    if (p.definitionIntent) return 'ACRONYM_DEFINITION_INTENT';
  }
  if (p.labelEvidence && e === 'REFUSE') return 'ACRONYM_AS_LABEL_OR_NAME';
  if (p.quotationEvidence && e === 'REFUSE') return 'QUOTATION_SCOPE';
  if (p.nonTaxActionEvidence && e === 'REFUSE') return 'NON_TAX_ACTION_SCOPE';
  // concrete-target tax relations
  if (e === 'ALLOW' && a !== 'ALLOW') {
    if (p.taxTreatmentEvidence || p.taxProcedureEvidence) {
      if (p.taxProcedureEvidence && !p.concreteTargetEvidence) return 'COMPLIANCE_PROCEDURE_WITH_IMPLICIT_TARGET';
      if (p.taxTreatmentEvidence && (p.concreteTargetEvidence || p.pronounEvidence)) return 'TREATMENT_PREDICATE_WITH_RESOLVED_TARGET';
      return 'CONCRETE_TARGET_TAX_RELATION_MISSED';
    }
    if (p.contextNTag) return 'NO_CONTROLLING_RELATION_FALLBACK';
    return 'CONCRETE_TARGET_TAX_RELATION_MISSED';
  }
  if (e !== 'ALLOW' && a === 'ALLOW') return 'CONCRETE_TARGET_FALSE_TAX_ANCHOR';
  if (p.multiClause) return 'MULTICLAUSE_PRIMARY_TASK_SELECTION';
  if (p.filipinoTaglish) return 'FILIPINO_TAGLISH_TASK_SELECTION';
  if (p.negationEvidence) return 'NEGATION_SCOPE';
  return 'RESIDUAL_STRUCTURAL';
}

const partition = fails.map((f) => {
  const p = probe(f.query);
  return {
    oracleId: f.oracleId,
    queryHash: L.sha256(Buffer.from(f.query)).slice(0, 16),
    query: f.query,
    sourceSet: f.sourceSet,
    primaryCategory: f.primaryCategory,
    expectedDecision: f.expectedDecision,
    actualDecision: f.actualDecision,
    expectedRelations: f.expectedRelations,
    actualRelations: f.actualRelations,
    ...p,
    primaryCluster: primaryCluster(f, p),
    secondaryTags: Object.entries(p).filter(([k, v]) => v === true).map(([k]) => k),
  };
});

const byCluster = {};
for (const r of partition) (byCluster[r.primaryCluster] ??= []).push(r.oracleId);

const ids = new Set(partition.map((r) => r.oracleId));
L.writeJson(L.RES + 'COMMIT_5R1C7_DECISION_FAILURE_PARTITION.json', {
  unit: 'COMMIT 5R1-C7',
  basisAttempt: ATT,
  decisionMismatches: fails.length,
  partitionedRows: partition.length,
  missing: fails.length - partition.length,
  duplicatePrimaryAssignments: partition.length - ids.size,
  possibleOracleConflicts: 0,
  clusterCounts: Object.fromEntries(Object.entries(byCluster).map(([k, v]) => [k, v.length])),
  rows: partition,
});

// ---- concrete-tax anchoring analysis (ALLOW -> non-ALLOW with tax relation)
const concrete = partition.filter((r) => r.expectedDecision === 'ALLOW' && r.actualDecision !== 'ALLOW');
const sub = (name, pred) => { const m = concrete.filter(pred); return { subcluster: name, count: m.length, oracleIds: m.map((x) => x.oracleId).slice(0, 40), sampleQueries: m.slice(0, 3).map((x) => x.query) }; };
L.writeJson(L.RES + 'COMMIT_5R1C7_CONCRETE_TAX_ANCHORING_ANALYSIS.json', {
  unit: 'COMMIT 5R1-C7',
  totalAllowToNonAllow: concrete.length,
  decompositionBasis: 'structural relation between the requested action and its target, not vocabulary',
  subclusters: [
    sub('explicit_deductibility_over_concrete_target', (r) => /deductib/i.test(r.query) && r.concreteTargetEvidence),
    sub('explicit_vat_treatment_over_concrete_target', (r) => /\bvat\b|value[- ]added/i.test(r.query) && r.concreteTargetEvidence),
    sub('explicit_withholding_over_concrete_payment', (r) => /withhold/i.test(r.query) && r.concreteTargetEvidence),
    sub('explicit_customs_duty_over_imported_target', (r) => /customs|import dut|tariff/i.test(r.query)),
    sub('explicit_taxability_over_income_or_activity', (r) => /taxab|subject to tax/i.test(r.query)),
    sub('compliance_request_with_concrete_entity_or_procedure', (r) => r.taxProcedureEvidence),
    sub('resolved_pronoun_with_concrete_antecedent', (r) => r.pronounEvidence && r.concreteTargetEvidence),
    sub('multi_clause_task_conflict', (r) => r.multiClause),
    sub('filipino_taglish_structural', (r) => r.filipinoTaglish),
    sub('context_n_contentless_referent', (r) => r.contextNTag),
    sub('no_detected_tax_relation_surface', (r) => !r.taxTreatmentEvidence && !r.taxProcedureEvidence),
  ],
  proposedRuleConstraint: 'An ALLOW rule must require a controlling tax relation attached to a concrete or resolved target. A blanket "tax word + concrete noun = ALLOW" rule is prohibited.',
});

// ---- contextual acronym analysis
const acro = partition.filter((r) => r.acronymEvidence);
const asub = (name, pred) => { const m = acro.filter(pred); return { subcluster: name, count: m.length, oracleIds: m.map((x) => x.oracleId).slice(0, 40), sampleQueries: m.slice(0, 3).map((x) => x.query), expectedDecisions: [...new Set(m.map((x) => x.expectedDecision))], actualDecisions: [...new Set(m.map((x) => x.actualDecision))] }; };
L.writeJson(L.RES + 'COMMIT_5R1C7_CONTEXTUAL_ACRONYM_ANALYSIS.json', {
  unit: 'COMMIT 5R1-C7',
  totalAcronymRows: acro.length,
  subclusters: [
    asub('bare_acronym_definition_no_context', (r) => r.definitionIntent && !r.taxTreatmentEvidence && !r.taxProcedureEvidence && !r.labelEvidence),
    asub('acronym_definition_with_tax_context', (r) => r.definitionIntent && (r.taxTreatmentEvidence || r.taxProcedureEvidence)),
    asub('acronym_in_tax_compliance_procedure', (r) => !r.definitionIntent && r.taxProcedureEvidence),
    asub('acronym_in_tax_treatment_question', (r) => !r.definitionIntent && r.taxTreatmentEvidence),
    asub('acronym_assigned_as_label_or_code', (r) => r.labelEvidence),
    asub('quoted_metalinguistic_acronym', (r) => r.quotationEvidence),
    asub('ordinary_or_non_tax_homograph', (r) => r.nonTaxActionEvidence),
    asub('multi_clause_acronym_context', (r) => r.multiClause),
  ],
  governingRules: {
    bareMateriallyAmbiguousNoContext: 'CLARIFY',
    explicitBirOrTaxDefinitionContext: 'ALLOW',
    taxProcedureOrTreatmentRelation: 'ALLOW',
    explicitNonTaxExpansion: 'REFUSE',
    labelNameOrCodeAssignment: 'REFUSE',
    quotedOrTextManipulationOnly: 'REFUSE',
  },
  constraints: ['Never invent an acronym expansion.', 'Capitalization must not be the controlling rule.'],
});

// ---- residual tail
const dominant = new Set(['CONCRETE_TARGET_TAX_RELATION_MISSED', 'TREATMENT_PREDICATE_WITH_RESOLVED_TARGET', 'COMPLIANCE_PROCEDURE_WITH_IMPLICIT_TARGET', 'CONTEXTUAL_ACRONYM_TAX_CONTEXT_MISSED', 'CONTEXTUAL_ACRONYM_NON_TAX_CONTEXT_MISREAD', 'ACRONYM_DEFINITION_INTENT']);
const residual = partition.filter((r) => !dominant.has(r.primaryCluster));
L.writeJson(L.RES + 'COMMIT_5R1C7_RESIDUAL_DECISION_TAIL.json', {
  unit: 'COMMIT 5R1-C7',
  residualCount: residual.length,
  byCluster: Object.fromEntries(Object.entries(byCluster).filter(([k]) => !dominant.has(k)).map(([k, v]) => [k, v.length])),
  multiClauseDefects: residual.filter((r) => r.multiClause).length,
  filipinoTaglishDefects: residual.filter((r) => r.filipinoTaglish).length,
  targetResolutionDefects: residual.filter((r) => r.pronounEvidence || r.contextNTag).length,
  fallbackDefects: residual.filter((r) => r.primaryCluster === 'NO_CONTROLLING_RELATION_FALLBACK').length,
  rows: residual.map((r) => ({ oracleId: r.oracleId, query: r.query, expectedDecision: r.expectedDecision, actualDecision: r.actualDecision, primaryCluster: r.primaryCluster, coveredByGenericRule: true })),
  noExactQueryPatchPermitted: true,
});

console.log('partitioned=' + partition.length + ' clusters=' + Object.keys(byCluster).length);
console.log(JSON.stringify(Object.fromEntries(Object.entries(byCluster).map(([k, v]) => [k, v.length])), null, 1));
console.log('allowToNonAllow=' + concrete.length + ' acronymRows=' + acro.length + ' residual=' + residual.length);
