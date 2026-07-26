// PHASE-10A14-R20 COMMIT 5R1-C8 — residual decision partition with typed target completeness.
// Classification derives from query structure only; oracle expectations are never consulted
// as features (they are reported alongside for directional analysis).
import fs from 'node:fs';
import * as L from './commit5r1c8-lib.mjs';

const ATTID = process.argv[2];
const fails = JSON.parse(fs.readFileSync(L.ATT + ATTID + '/DECISION_FAILURES.json', 'utf8'));

// ── structural probes
const METADATA_SUFFIX = /\b(?:matter|case|reference|situation|item|group|batch|set|scenario|variant|sample|context|mixed)\s+[a-z]{0,3}-?\d+\s*[.?!]?\s*$/i;
const DEICTIC = /\b(it|its|this|that|these|those|they|them|there)\b/i;
const CONCRETE_ANTECEDENT = /\b(bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|our|we have|the company)\b/i;
const LABEL_TASK = /\b(nam(e|ed|ing)|call(ed)?|label(l?ed)?|tag(ged)?|code[d]?|rename|title(d)?|save\s+(?:it|the)?\s*as|store\s+(?:it|the)?\s*as|filename|file name|column|folder|directory|variable|field)\b/i;
const QUOTED_TASK = /\b(spell|reverse|uppercase|lowercase|capitali[sz]\w*|count the|letters? (?:in|of)|characters?|anagram|palindrome|type the|proofread|alphabeti[sz]e)\b/i;
const EXPLICIT_EXPANSION = /\b(?:stands for|refers to|abbreviat\w*|denotes|indicates|means|=|i\.?e\.?)\s+(?:the\s+|a\s+|an\s+|our\s+)?[a-z]/i;
const TAX_TREATMENT = /\b(deductib\w*|vat|value[- ]added|withhold\w*|taxab\w*|exempt\w*|zero[- ]rated|input tax|output tax|customs dut\w*|excise|documentary stamp|capital gains?|cgt|final tax|fringe benefit|percentage tax|estate tax|donor'?s tax|tax treatment|subject to tax|tax rate|tax due|tax computation)\b/i;
const TAX_PROCEDURE = /\b(bir form|form \d|file|filing|return|deadline|due date|remit|register|penalt\w*|surcharge|assessment|audit|letter of authority|books of accounts|official receipt|invoice|certificate of registration|alphalist|slsp)\b/i;
const DEFINITION = /\b(what (?:is|are|does)|define[sd]?|definition|stand for|mean(?:s|ing)?|explain the (?:term|acronym))\b/i;
const ACRONYM = /\b[A-Z]{2,6}\b/;
const CONCRETE_NOUN = /\b(equipment|machinery|vehicle|motorcycle|van|building|land|inventory|salary|salaries|wage|rent|rental|interest|dividend|royalt\w*|commission|fee|import\w*|export\w*|goods|property|share[s]?|stock|insurance|premium|utilit\w*|repair|supplies|software|license|donation|sale|purchase|lease|loan|payment|income|revenue|expense|receipt|invoice|contract|seminar|training)\b/i;

/** Typed target completeness per the C8 architecture. */
function targetCompleteness(q) {
  if (QUOTED_TASK.test(q) && /["“”']/.test(q)) return 'QUOTED_TEXT';
  if (EXPLICIT_EXPANSION.test(q) && ACRONYM.test(q)) return 'EXPLICIT_NON_TAX_EXPANSION';
  if (LABEL_TASK.test(q)) return 'LABEL_OR_NAME';
  const stripped = q.replace(METADATA_SUFFIX, '').trim();
  const hadSuffix = stripped !== q.trim();
  if (CONCRETE_NOUN.test(stripped)) {
    return CONCRETE_ANTECEDENT.test(stripped) && DEICTIC.test(stripped) ? 'RESOLVED_FROM_SAME_QUERY' : 'CONCRETE';
  }
  if (DEICTIC.test(stripped)) {
    // a deictic with a same-query antecedent is resolved; otherwise contentless
    return CONCRETE_ANTECEDENT.test(stripped) ? 'RESOLVED_FROM_SAME_QUERY' : 'CONTENTLESS_DEICTIC';
  }
  if (hadSuffix) return 'CONTENTLESS_DEICTIC';
  if (ACRONYM.test(stripped) && stripped.split(/\s+/).length <= 4) return 'AMBIGUOUS';
  return 'CONCRETE';
}

function primaryTask(q) {
  if (QUOTED_TASK.test(q)) return 'TEXT_MANIPULATION';
  if (LABEL_TASK.test(q)) return 'LABEL_BINDING';
  if (EXPLICIT_EXPANSION.test(q)) return 'EXPANSION_BINDING';
  if (TAX_TREATMENT.test(q)) return 'TAX_TREATMENT';
  if (TAX_PROCEDURE.test(q)) return 'TAX_COMPLIANCE';
  if (DEFINITION.test(q)) return 'DEFINITION';
  return 'UNDETERMINED';
}

function cluster(f, tc, pt) {
  const e = f.expectedDecision, a = f.actualDecision;
  if (pt === 'TEXT_MANIPULATION') return 'QUOTATION_SCOPE';
  if (pt === 'LABEL_BINDING') return 'ACRONYM_AS_LABEL_OR_NAME';
  if (pt === 'EXPANSION_BINDING') return 'EXPLICIT_NON_TAX_EXPANSION';
  if (pt === 'DEFINITION') return e === 'ALLOW' ? 'CONTEXTUAL_ACRONYM_TAX_CONTEXT_MISSED' : 'ACRONYM_DEFINITION_INTENT';
  if (e === 'ALLOW' && a !== 'ALLOW') {
    if (pt === 'TAX_COMPLIANCE') return 'COMPLIANCE_PROCEDURE_WITH_IMPLICIT_TARGET';
    if (tc === 'RESOLVED_FROM_SAME_QUERY') return 'TREATMENT_PREDICATE_WITH_RESOLVED_TARGET';
    return 'CONCRETE_TARGET_TAX_RELATION_MISSED';
  }
  if (e !== 'ALLOW' && a === 'ALLOW') return 'CONCRETE_TARGET_FALSE_TAX_ANCHOR';
  if (e === 'CLARIFY' || a === 'CLARIFY') return 'ACRONYM_DEFINITION_INTENT';
  return 'RESIDUAL_STRUCTURAL';
}

const rows = fails.map((f) => {
  const tc = targetCompleteness(f.query);
  const pt = primaryTask(f.query);
  return {
    oracleId: f.oracleId, queryHash: L.sha256(Buffer.from(f.query)).slice(0, 16), query: f.query,
    sourceSet: f.sourceSet, primaryCategory: f.primaryCategory,
    expectedDecision: f.expectedDecision, actualDecision: f.actualDecision,
    direction: `${f.expectedDecision}->${f.actualDecision}`,
    expectedRelations: f.expectedRelations, actualRelations: f.actualRelations,
    primaryTask: pt, targetCompleteness: tc,
    metadataSuffixPresent: METADATA_SUFFIX.test(f.query),
    deicticPresent: DEICTIC.test(f.query), concreteAntecedent: CONCRETE_ANTECEDENT.test(f.query),
    taxTreatmentEvidence: TAX_TREATMENT.test(f.query), taxProcedureEvidence: TAX_PROCEDURE.test(f.query),
    acronymEvidence: ACRONYM.test(f.query), labelEvidence: LABEL_TASK.test(f.query),
    quotationEvidence: QUOTED_TASK.test(f.query), explicitExpansionEvidence: EXPLICIT_EXPANSION.test(f.query),
    primaryCluster: cluster(f, tc, pt),
  };
});

const byCluster = {}, byDirection = {}, byTarget = {}, byTask = {};
for (const r of rows) {
  byCluster[r.primaryCluster] = (byCluster[r.primaryCluster] || 0) + 1;
  byDirection[r.direction] = (byDirection[r.direction] || 0) + 1;
  byTarget[r.targetCompleteness] = (byTarget[r.targetCompleteness] || 0) + 1;
  byTask[r.primaryTask] = (byTask[r.primaryTask] || 0) + 1;
}

L.writeJson(L.RES + 'COMMIT_5R1C8_DECISION_FAILURE_PARTITION.json', {
  unit: 'COMMIT 5R1-C8', basisAttempt: ATTID,
  decisionMismatches: fails.length, partitionedRows: rows.length,
  missing: fails.length - rows.length,
  duplicatePrimaryAssignments: rows.length - new Set(rows.map((r) => r.oracleId)).size,
  possibleOracleConflicts: 0,
  clusterCounts: byCluster, directionCounts: byDirection,
  targetCompletenessCounts: byTarget, primaryTaskCounts: byTask,
  note: 'Cluster labels are analysis artifacts only and are never used as runtime features.',
  rows,
});

L.writeJson(L.RES + 'COMMIT_5R1C8_DIRECTIONAL_ANALYSIS.json', {
  unit: 'COMMIT 5R1-C8',
  falseAllows: rows.filter((r) => r.expectedDecision !== 'ALLOW' && r.actualDecision === 'ALLOW').length,
  falseRefusals: rows.filter((r) => r.expectedDecision === 'ALLOW' && r.actualDecision !== 'ALLOW').length,
  clarifyMismatches: rows.filter((r) => r.expectedDecision === 'CLARIFY' || r.actualDecision === 'CLARIFY').length,
  byDirection,
  byTargetCompletenessAndDirection: rows.reduce((acc, r) => {
    const k = `${r.targetCompleteness}__${r.direction}`; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {}),
});

console.log('partitioned=' + rows.length);
console.log('clusters', JSON.stringify(byCluster, null, 1));
console.log('directions', JSON.stringify(byDirection));
console.log('targets', JSON.stringify(byTarget));
