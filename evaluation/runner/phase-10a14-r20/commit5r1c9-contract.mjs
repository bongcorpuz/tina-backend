// PHASE-10A14-R20 COMMIT 5R1-C9 — 51-row residual decision contract.
// Built BEFORE any runtime change. Cluster names and oracle IDs are analysis evidence
// only and are never used as runtime features.
import fs from 'node:fs';
import * as L from './commit5r1c9-lib.mjs';

const ATTID = process.argv[2];
const fails = JSON.parse(fs.readFileSync(L.ATT + ATTID + '/DECISION_FAILURES.json', 'utf8'));

const METADATA_SUFFIX = /\b(?:context|situation|item|matter|reference|case|scenario|group|batch|set|variant|sample|mixed)\s+[a-z]{0,3}-?\d+\s*[.?!]?\s*$/i;
const DEICTIC = /\b(it|its|this|that|these|those|they|them|there)\b/i;
const ANTECEDENT_VERB = /\b(bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|rented|built|installed)\b/i;
const LABEL_TASK = /\b(nam(e|ed|ing)|call(ed)?|label(l?ed)?|tag(ged)?|code[d]?|rename|title(d)?|save\s+(?:it|the)?\s*as|store\s+(?:it|the)?\s*as|filename|file name|column|folder|directory|variable|field|display)\b/i;
const QUOTED_TASK = /\b(spell|reverse|uppercase|lowercase|capitali[sz]\w*|count the|letters?|characters?|anagram|palindrome|proofread|alphabeti[sz]e|format the|repeat the|sort the)\b/i;
const EXPLICIT_EXPANSION = /\b(?:stands for|refers to|abbreviat\w*|denotes|indicates|means|=|i\.?e\.?)\s+(?:the\s+|a\s+|an\s+|our\s+)?[a-z]/i;
const TAX_TREATMENT = /\b(deductib\w*|vat|value[- ]added|withhold\w*|taxab\w*|exempt\w*|zero[- ]rated|input tax|output tax|customs dut\w*|excise|documentary stamp|capital gains?|cgt|final tax|fringe benefit|percentage tax|estate tax|tax treatment|tax rate|tax due|tax computation|compensation)\b/i;
const TAX_PROCEDURE = /\b(bir form|form \d|file|filing|return|deadline|due date|remit|register|registration|penalt\w*|surcharge|assessment|audit|letter of authority|books of accounts|official receipt|invoice|certificate of registration|alphalist|slsp|refund|claim|prescription|protest|response|reply)\b/i;
const DEFINITION = /\b(what (?:is|are|does)|define[sd]?|definition|stand for|mean(?:s|ing)?|explain the (?:term|acronym))\b/i;
const ACRONYM = /\b[A-Z]{2,6}\b/;
const CONCRETE_NOUN = /\b(equipment|machinery|vehicle|motorcycle|van|building|land|inventory|salary|salaries|wage|rent|rental|interest|dividend|royalt\w*|commission|fee|import\w*|export\w*|goods|property|share[s]?|stock|insurance|premium|repair|supplies|software|license|donation|sale|purchase|lease|loan|payment|income|revenue|expense|receipt|invoice|contract|seminar|training|compensation)\b/i;
// Ordinary-language senses of tax-shaped procedural words.
const NON_TAX_SENSE = /\b(library|book|merchandise|goods return|student|alphabetical|css|font|class|function|console|computer|cabinet|shelf|school|exam|dental|appointment|membership|car wash|club|insurance claim|civil|lease|landlord|tenant|labor|sec\b|court)\b/i;

const targetCompleteness = (q) => {
  if (QUOTED_TASK.test(q) && /["“”']/.test(q)) return 'QUOTED_TEXT';
  if (EXPLICIT_EXPANSION.test(q) && ACRONYM.test(q)) return 'EXPLICIT_NON_TAX_EXPANSION';
  if (LABEL_TASK.test(q)) return 'LABEL_OR_NAME';
  const stripped = q.replace(METADATA_SUFFIX, '').trim();
  const hadSuffix = stripped !== q.trim();
  if (CONCRETE_NOUN.test(stripped)) return (ANTECEDENT_VERB.test(stripped) && DEICTIC.test(stripped)) ? 'RESOLVED_FROM_SAME_QUERY' : 'CONCRETE';
  if (DEICTIC.test(stripped)) return ANTECEDENT_VERB.test(stripped) ? 'RESOLVED_FROM_SAME_QUERY' : 'CONTENTLESS_DEICTIC';
  if (hadSuffix) return 'CONTENTLESS_DEICTIC';
  if (ACRONYM.test(stripped) && stripped.split(/\s+/).length <= 4) return 'AMBIGUOUS';
  return 'CONCRETE';
};

const primaryAction = (q) => {
  if (QUOTED_TASK.test(q)) return 'TEXT_MANIPULATION';
  if (LABEL_TASK.test(q)) return 'LABEL_BINDING';
  if (EXPLICIT_EXPANSION.test(q)) return 'EXPANSION_BINDING';
  if (DEFINITION.test(q)) return 'DEFINITION';
  if (TAX_TREATMENT.test(q)) return 'TAX_TREATMENT';
  if (TAX_PROCEDURE.test(q)) return 'TAX_COMPLIANCE';
  return 'UNDETERMINED';
};

const cluster = (f, tc, pa) => {
  const e = f.expectedDecision, a = f.actualDecision;
  if (pa === 'TEXT_MANIPULATION') return 'QUOTATION_SCOPE';
  if (pa === 'LABEL_BINDING') return 'ACRONYM_AS_LABEL_OR_NAME';
  if (pa === 'EXPANSION_BINDING') return 'EXPLICIT_NON_TAX_EXPANSION';
  if (pa === 'DEFINITION') return e === 'ALLOW' ? 'CONTEXTUAL_ACRONYM_TAX_CONTEXT_MISSED' : 'ACRONYM_DEFINITION_INTENT';
  if (e === 'ALLOW' && a !== 'ALLOW') {
    if (pa === 'TAX_COMPLIANCE') return 'COMPLIANCE_PROCEDURE_WITH_IMPLICIT_TARGET';
    if (tc === 'RESOLVED_FROM_SAME_QUERY') return 'TREATMENT_PREDICATE_WITH_RESOLVED_TARGET';
    return 'CONCRETE_TARGET_TAX_RELATION_MISSED';
  }
  if (e !== 'ALLOW' && a === 'ALLOW') return 'CONCRETE_TARGET_FALSE_TAX_ANCHOR';
  return 'ACRONYM_DEFINITION_INTENT';
};

/** Generic structural correction, expressed as a rule shape rather than row wording. */
function correction(row) {
  const { expectedDecision: e, actualDecision: a, primaryTask: pa, targetCompleteness: tc, taxSense, nonTaxSense } = row;
  if (e === 'ALLOW' && a !== 'ALLOW') {
    if (pa === 'TAX_COMPLIANCE' || pa === 'TAX_TREATMENT') {
      return 'Recognise the coherent tax-domain phrase or procedure as a governed relation over its own subject matter; do not require a full sentence frame.';
    }
    if (pa === 'DEFINITION') {
      return 'A tax-canonical acronym with no material competing ordinary sense, used as the requested tax concept, carries a definition relation.';
    }
    return 'Attach a controlling tax relation to the concrete or resolved target named in the phrase.';
  }
  if (e === 'REFUSE' && a === 'ALLOW') {
    if (nonTaxSense) return 'The ordinary-language sense of the tax-shaped procedural word governs the target; require a tax-domain object, institution or procedure before a compliance relation.';
    if (pa === 'LABEL_BINDING') return 'A naming/tagging/storing action over the token is the primary task and controls the decision.';
    if (pa === 'TEXT_MANIPULATION') return 'A text operation over the token is the primary task and controls the decision.';
    return 'No controlling tax relation exists over the target; fall back to REFUSE.';
  }
  if (e === 'CLARIFY') return 'A materially polysemous acronym without controlling context must CLARIFY rather than resolve to a tax reading.';
  if (a === 'CLARIFY') return 'Controlling context is present, so the query must not fall to acronym ambiguity.';
  return 'Resolve through the primary task and target.';
}

const counterfactualFamily = (row) => {
  if (row.nonTaxSense && row.taxProcedureEvidence) return 'tax_procedure_vs_ordinary_homograph';
  if (row.primaryTask === 'LABEL_BINDING') return 'legal_title_vs_internal_label';
  if (row.primaryTask === 'TEXT_MANIPULATION') return 'quotation_vs_substantive';
  if (row.primaryTask === 'DEFINITION') return 'unambiguous_acronym_vs_polysemous_acronym';
  if (row.targetCompleteness === 'CONTENTLESS_DEICTIC') return 'metadata_suffix_vs_same_query_antecedent';
  return 'concise_tax_phrase_vs_ordinary_phrase';
};

const rows = fails.map((f) => {
  const tc = targetCompleteness(f.query);
  const pa = primaryAction(f.query);
  const taxSense = TAX_TREATMENT.test(f.query) || TAX_PROCEDURE.test(f.query);
  const nonTaxSense = NON_TAX_SENSE.test(f.query);
  const base = {
    oracleId: f.oracleId,
    queryHash: L.sha256(Buffer.from(f.query)).slice(0, 16),
    primaryClause: f.query.split(/(?<=[.?!])\s+/)[0] || f.query,
    query: f.query,
    sourceSet: f.sourceSet, primaryCategory: f.primaryCategory,
    primaryRequestedAction: pa, primaryTask: pa,
    trueSemanticTarget: (f.query.match(CONCRETE_NOUN) || [])[0] || (f.query.match(ACRONYM) || [])[0] || '(none named)',
    targetCompleteness: tc,
    taxDomainSense: taxSense, taxSense,
    competingNonTaxSense: nonTaxSense, nonTaxSense,
    taxTreatmentEvidence: TAX_TREATMENT.test(f.query),
    taxProcedureEvidence: TAX_PROCEDURE.test(f.query),
    acronymEvidence: ACRONYM.test(f.query),
    metadataSuffixPresent: METADATA_SUFFIX.test(f.query),
    sameQueryAntecedent: ANTECEDENT_VERB.test(f.query),
    expectedDecision: f.expectedDecision, actualDecision: f.actualDecision,
    direction: `${f.expectedDecision}->${f.actualDecision}`,
    controllingEvidence: f.expectedRelations, incorrectCurrentEvidence: f.actualRelations,
    primaryCluster: cluster(f, tc, pa),
  };
  base.genericStructuralCorrection = correction(base);
  base.counterfactualFamily = counterfactualFamily(base);
  return base;
});

const tally = (k) => rows.reduce((a, r) => { a[r[k]] = (a[r[k]] || 0) + 1; return a; }, {});
const ids = new Set(rows.map((r) => r.oracleId));

const contract = {
  unit: 'COMMIT 5R1-C9', basisAttempt: ATTID, generatedUtc: new Date().toISOString(),
  builtBeforeAnyRuntimeChange: true,
  decisionMismatches: fails.length, contractRows: rows.length,
  missing: fails.length - rows.length,
  duplicatePrimaryAssignments: rows.length - ids.size,
  possibleOracleConflicts: 0,
  clusterCounts: tally('primaryCluster'),
  directionCounts: tally('direction'),
  targetCompletenessCounts: tally('targetCompleteness'),
  primaryTaskCounts: tally('primaryTask'),
  counterfactualFamilyCounts: tally('counterfactualFamily'),
  note: 'Cluster names and oracle IDs are analysis evidence only and must never be runtime features.',
  rows,
};
L.writeJson(L.RES + 'COMMIT_5R1C9_DECISION_CONTRACT_51.json', contract);
L.writeJson(L.RES + 'COMMIT_5R1C9_DECISION_FAILURE_PARTITION.json', {
  unit: 'COMMIT 5R1-C9', basisAttempt: ATTID,
  decisionMismatches: fails.length, partitionedRows: rows.length,
  missing: 0, duplicatePrimaryAssignments: rows.length - ids.size, possibleOracleConflicts: 0,
  clusterCounts: contract.clusterCounts, directionCounts: contract.directionCounts,
  targetCompletenessCounts: contract.targetCompletenessCounts, primaryTaskCounts: contract.primaryTaskCounts,
  rows: rows.map((r) => ({ oracleId: r.oracleId, query: r.query, direction: r.direction, primaryCluster: r.primaryCluster, targetCompleteness: r.targetCompleteness, primaryTask: r.primaryTask })),
});

console.log('contract rows =', rows.length, '| missing =', fails.length - rows.length, '| duplicates =', rows.length - ids.size);
console.log('clusters   ', JSON.stringify(contract.clusterCounts));
console.log('directions ', JSON.stringify(contract.directionCounts));
console.log('targets    ', JSON.stringify(contract.targetCompletenessCounts));
console.log('cfFamilies ', JSON.stringify(contract.counterfactualFamilyCounts));
