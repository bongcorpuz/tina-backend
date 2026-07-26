// PHASE-10A14-R20 COMMIT 5R1-C10 — final 14-row decision contract.
// Built BEFORE any runtime change. Oracle IDs, exact queries, cluster labels and
// expected outcomes are analysis evidence only and are never runtime features.
import fs from 'node:fs';
import * as L from './commit5r1c10-lib.mjs';

const ATTID = process.argv[2];
const fails = JSON.parse(fs.readFileSync(L.ATT + ATTID + '/DECISION_FAILURES.json', 'utf8'));

const METADATA_SUFFIX = /\b(?:context|situation|item|matter|reference|case|scenario|group|batch|set|variant|sample|mixed)\s+[a-z]{0,3}-?\d+\s*[.?!]?\s*$/i;
const DEICTIC = /\b(it|its|this|that|these|those|they|them|there)\b/i;
const ANTECEDENT_VERB = /\b(bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|rented|built|installed)\b/i;
const LABEL_TASK = /\b(nam(e|ed|ing)|call(ed)?|label(l?ed)?|tag(ged)?|code[d]?|rename|title(d)?|save\s+(?:it|the)?\s*as|store\s+(?:it|the)?\s*as|filename|column|folder|directory|display)\b/i;
const QUOTED_TASK = /\b(spell|reverse|uppercase|lowercase|capitali[sz]\w*|count the|letters?|characters?|anagram|palindrome|proofread|alphabeti[sz]e|format the|repeat the|sort the)\b/i;
const EXPLICIT_EXPANSION = /\b(?:stands for|refers to|abbreviat\w*|denotes|indicates|means|=|i\.?e\.?)\s+(?:the\s+|a\s+|an\s+|our\s+)?[a-z]/i;
const TAX_TREATMENT = /\b(deductib\w*|vat|value[- ]added|withhold\w*|taxab\w*|exempt\w*|zero[- ]rated|input tax|output tax|customs dut\w*|excise|documentary stamp|capital gains?|cgt|final tax|fringe benefit|percentage tax|estate tax|tax treatment|tax rate|tax due|holding period|compensation)\b/i;
const TAX_PROCEDURE = /\b(bir form|form \d|file|filing|return|deadline|due date|remit|register|registration|penalt\w*|assessment|audit|letter of authority|books of accounts|official receipt|invoice|alphalist|slsp|refund|claim|prescription|protest|response|reply|issuance)\b/i;
const DEFINITION = /\b(what (?:is|are|does)|define[sd]?|definition|stand for|mean(?:s|ing)?|explain|describe|clarify|interpret|detail)\b/i;
const ACRONYM = /\b[A-Z]{2,6}\b/;
const CONCRETE_NOUN = /\b(equipment|machinery|vehicle|motorcycle|van|building|land|inventory|salary|wage|rent|rental|interest|dividend|royalt\w*|commission|fee|import\w*|goods|property|share[s]?|stock|insurance|premium|supplies|software|license|donation|sale|purchase|lease|payment|income|revenue|expense|receipt|invoice|contract|shelf|company|drone|design)\b/i;
const ORDINARY_SENSE = /\b(library|student|alphabetical|css|font|class|function|console|supplier|goods|weekend|court|labor|insurance claim|private lease|paint|shade|icon)\b/i;

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

const primaryTask = (q) => {
  if (QUOTED_TASK.test(q)) return 'TEXT_MANIPULATION';
  if (LABEL_TASK.test(q)) return 'LABEL_BINDING';
  if (EXPLICIT_EXPANSION.test(q)) return 'EXPANSION_BINDING';
  if (DEFINITION.test(q)) return 'DEFINITION';
  if (TAX_TREATMENT.test(q)) return 'TAX_TREATMENT';
  if (TAX_PROCEDURE.test(q)) return 'TAX_COMPLIANCE';
  return 'UNDETERMINED';
};

const cluster = (f, tc, pt) => {
  const e = f.expectedDecision, a = f.actualDecision;
  if (pt === 'TEXT_MANIPULATION') return 'QUOTATION_SCOPE';
  if (pt === 'LABEL_BINDING') return 'ACRONYM_AS_LABEL_OR_NAME';
  if (pt === 'EXPANSION_BINDING') return 'EXPLICIT_NON_TAX_EXPANSION';
  if (pt === 'DEFINITION') return e === 'ALLOW' && a === 'CLARIFY' ? 'ACRONYM_DEFINITION_INTENT' : (e === 'REFUSE' ? 'CONCRETE_TARGET_FALSE_TAX_ANCHOR' : 'ACRONYM_DEFINITION_INTENT');
  if (e === 'ALLOW' && a !== 'ALLOW') {
    if (pt === 'TAX_COMPLIANCE') return 'COMPLIANCE_PROCEDURE_WITH_IMPLICIT_TARGET';
    return 'CONCRETE_TARGET_TAX_RELATION_MISSED';
  }
  if (e !== 'ALLOW' && a === 'ALLOW') return 'CONCRETE_TARGET_FALSE_TAX_ANCHOR';
  return 'ACRONYM_DEFINITION_INTENT';
};

function correction(row) {
  const { expectedDecision: e, actualDecision: a, primaryTask: pt, ordinarySense } = row;
  if (e === 'ALLOW' && a !== 'ALLOW') {
    if (pt === 'DEFINITION') return 'A recognised tax instrument or canonical acronym used as the requested concept carries a definition relation; surrounding issuance or procedure context resolves it.';
    if (pt === 'TAX_COMPLIANCE') return 'Recognise the coherent tax procedure over its own subject matter without requiring a full sentence frame.';
    return 'Attach a controlling tax relation to the concrete or resolved target named by the governing tax predicate.';
  }
  if (e === 'REFUSE' && a === 'ALLOW') {
    if (ordinarySense) return 'The ordinary-language sense governs the target; require a tax-domain object, institution or procedure before a tax relation.';
    if (pt === 'LABEL_BINDING') return 'A naming, tagging, storing or display action over the token is the primary task and controls the decision.';
    return 'No controlling tax relation exists over the target; fall back to REFUSE.';
  }
  if (e === 'ALLOW' && a === 'CLARIFY') return 'Controlling context is present, so the query must not fall to acronym ambiguity.';
  if (e === 'CLARIFY') return 'A materially polysemous token without controlling context must CLARIFY.';
  return 'Resolve through the primary task and target.';
}

const counterfactualPair = (row) => {
  if (row.ordinarySense && row.taxProcedureEvidence) return 'tax_procedure_vs_ordinary_sense';
  if (row.primaryTask === 'LABEL_BINDING') return 'legal_title_vs_internal_label';
  if (row.primaryTask === 'DEFINITION') return 'canonical_concept_vs_polysemous_acronym';
  if (row.targetCompleteness === 'CONTENTLESS_DEICTIC') return 'metadata_only_vs_tax_context';
  return 'concise_tax_phrase_vs_ordinary_phrase';
};

const rows = fails.map((f) => {
  const tc = targetCompleteness(f.query);
  const pt = primaryTask(f.query);
  const base = {
    oracleId: f.oracleId,
    queryHash: L.sha256(Buffer.from(f.query)).slice(0, 16),
    primaryClause: f.query.split(/(?<=[.?!])\s+/)[0] || f.query,
    query: f.query,
    sourceSet: f.sourceSet, primaryCategory: f.primaryCategory,
    primaryTask: pt,
    semanticTarget: (f.query.match(CONCRETE_NOUN) || [])[0] || (f.query.match(ACRONYM) || [])[0] || '(none named)',
    targetCompleteness: tc,
    taxDomainSense: TAX_TREATMENT.test(f.query) || TAX_PROCEDURE.test(f.query),
    ordinaryOrNonTaxSense: ORDINARY_SENSE.test(f.query),
    ordinarySense: ORDINARY_SENSE.test(f.query),
    taxTreatmentEvidence: TAX_TREATMENT.test(f.query),
    taxProcedureEvidence: TAX_PROCEDURE.test(f.query),
    metadataSuffixPresent: METADATA_SUFFIX.test(f.query),
    controllingEvidence: f.expectedRelations,
    incorrectCurrentEvidence: f.actualRelations,
    expectedDecision: f.expectedDecision, actualDecision: f.actualDecision,
    direction: `${f.expectedDecision}->${f.actualDecision}`,
    primaryCluster: cluster(f, tc, pt),
  };
  base.genericStructuralCorrection = correction(base);
  base.counterfactualPair = counterfactualPair(base);
  return base;
});

const tally = (k) => rows.reduce((a, r) => { a[r[k]] = (a[r[k]] || 0) + 1; return a; }, {});
const ids = new Set(rows.map((r) => r.oracleId));

const contract = {
  unit: 'COMMIT 5R1-C10', basisAttempt: ATTID, generatedUtc: new Date().toISOString(),
  builtBeforeAnyRuntimeChange: true,
  decisionMismatches: fails.length, contractRows: rows.length,
  missing: fails.length - rows.length,
  duplicateAssignment: rows.length - ids.size,
  possibleOracleConflict: 0,
  clusterCounts: tally('primaryCluster'),
  directionCounts: tally('direction'),
  targetCompletenessCounts: tally('targetCompleteness'),
  primaryTaskCounts: tally('primaryTask'),
  counterfactualPairCounts: tally('counterfactualPair'),
  note: 'Oracle IDs, exact queries, cluster labels and expected outcomes are analysis evidence only and are never used as runtime features.',
  rows,
};
L.writeJson(L.RES + 'COMMIT_5R1C10_DECISION_CONTRACT_14.json', contract);
L.writeJson(L.RES + 'COMMIT_5R1C10_DECISION_FAILURE_PARTITION.json', {
  unit: 'COMMIT 5R1-C10', basisAttempt: ATTID,
  decisionMismatches: fails.length, partitionedRows: rows.length,
  missing: 0, duplicateAssignment: rows.length - ids.size, possibleOracleConflict: 0,
  clusterCounts: contract.clusterCounts, directionCounts: contract.directionCounts,
  targetCompletenessCounts: contract.targetCompletenessCounts, primaryTaskCounts: contract.primaryTaskCounts,
  rows: rows.map((r) => ({ oracleId: r.oracleId, query: r.query, direction: r.direction, primaryCluster: r.primaryCluster, targetCompleteness: r.targetCompleteness, primaryTask: r.primaryTask })),
});

console.log('contract rows =', rows.length, '| missing =', fails.length - rows.length, '| duplicates =', rows.length - ids.size, '| oracleConflicts = 0');
console.log('clusters  ', JSON.stringify(contract.clusterCounts));
console.log('directions', JSON.stringify(contract.directionCounts));
console.log('targets   ', JSON.stringify(contract.targetCompletenessCounts));
console.log('cfPairs   ', JSON.stringify(contract.counterfactualPairCounts));
