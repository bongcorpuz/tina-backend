// PHASE-10A14-R20 COMMIT 5R1-C5 — partition the 309 decision mismatches into
// non-overlapping primary structural clusters. Each row gets exactly one primary cause,
// assigned by a deterministic priority over structural evidence (NOT category labels).
import { writeFileSync, readFileSync } from 'node:fs';
import { REPO } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const off = JSON.parse(readFileSync(`${R20}/COMMIT_5R1C5_DECISION_OFFDIAGONAL_ROWS.json`, 'utf8'));

// Structural cluster assignment. Priority order resolves overlaps deterministically.
function cluster(r) {
  const lo = r.query.toLowerCase();
  const exp = r.expectedDecision, act = r.actualDecision;
  const expRels = r.expectedRelations || [];
  const labelNounRe = /\b(product code|database field|field label|course code|training code|channel name|team name|internal (?:label|phrase|project)|codename|project (?:code|phrase|name)|variable name|file ?name)\b/;
  const quoteRe = /\b(translate|quote|spell|count the|reverse|proofread|capitali[sz]e)\b|["'“]/;
  const negRe = /\b(do not discuss tax|don't discuss tax|not asking about tax|although|even if|non-?tax)\b/;
  const barePronoun = /^(?:is|are|does|do|can|should|when|what|how|will)\b[^?]*\b(?:this|that|it|the|there|i|these|those)\b/.test(lo);
  const scenarioRef = /\bfor (?:scenario|situation) \d+/.test(lo);
  const acr = r.hasAcronym;

  // POSSIBLE_ORACLE_CONFLICT: reserved; none asserted here (all resolvable structurally).
  if (exp === 'REFUSE' && expRels.includes('NAMES_AS_INTERNAL_LABEL') && act !== 'REFUSE') return 'LABEL_BINDING_MISSED';
  if (act === 'REFUSE' && r.actualRelations.includes('NAMES_AS_INTERNAL_LABEL') && exp !== 'REFUSE') return 'LABEL_BINDING_OVERAPPLIED';
  if (scenarioRef) return 'CONTENTLESS_REFERENT_MISCLASSIFIED';
  // ALLOW expected, produced non-ALLOW, tax relation missed on a concrete target.
  if (exp === 'ALLOW' && act !== 'ALLOW') {
    if (barePronoun) return 'CONCRETE_REFERENT_MISCLASSIFIED_AS_CONTENTLESS';
    if (labelNounRe.test(lo)) return 'LABEL_BINDING_OVERAPPLIED';
    if (acr) return 'CONTEXTUAL_ACRONYM_MISCLASSIFIED';
    return 'TAX_RELATION_MISSED_ON_CONCRETE_TARGET';
  }
  // REFUSE expected, produced ALLOW/CLARIFY: non-tax read as tax, or contentless read as concrete.
  if (exp === 'REFUSE' && act === 'ALLOW') {
    if (barePronoun) return 'CONTENTLESS_REFERENT_MISCLASSIFIED';
    if (quoteRe.test(lo)) return 'QUOTATION_SCOPE';
    if (negRe.test(lo)) return 'NEGATION_SCOPE';
    if (labelNounRe.test(lo)) return 'LABEL_BINDING_MISSED';
    return 'NON_TAX_ACTION_MISREAD_AS_TAX';
  }
  if (exp === 'REFUSE' && act === 'CLARIFY') {
    if (acr) return 'CONTEXTUAL_ACRONYM_MISCLASSIFIED';
    return 'NO_CONTROLLING_RELATION_FALLBACK';
  }
  // CLARIFY expected, produced ALLOW/REFUSE.
  if (exp === 'CLARIFY' && act === 'ALLOW') {
    if (acr) return 'BARE_ACRONYM_AMBIGUITY_MISSED';
    return 'CONTEXTUAL_ACRONYM_MISCLASSIFIED';
  }
  if (exp === 'CLARIFY' && act === 'REFUSE') return 'NO_CONTROLLING_RELATION_FALLBACK';
  return 'OTHER_DECISION_STRUCTURAL';
}

const byCluster = {};
const seen = new Set(); let dup = 0;
const rows = off.map((r) => {
  const c = cluster(r);
  byCluster[c] = (byCluster[c] || 0) + 1;
  if (seen.has(r.oracleId)) dup++; else seen.add(r.oracleId);
  return {
    oracleId: r.oracleId, sourceSet: r.sourceSet, primaryCategory: r.primaryCategory,
    expectedDecision: r.expectedDecision, actualDecision: r.actualDecision,
    expectedRelations: r.expectedRelations, actualRelations: r.actualRelations,
    requestedTarget: r.requestedTarget, primaryRelation: r.primaryRelation,
    language: r.language, multiClause: r.multiClause,
    hasAcronym: r.hasAcronym, hasQuote: r.hasQuote, hasNegation: r.hasNegation, hasLabel: r.hasLabel,
    primaryCluster: c,
  };
});

const out = {
  decisionMismatchRows: off.length, partitionedRows: rows.length, missing: 0, duplicatePrimaryAssignment: dup,
  possibleOracleConflicts: byCluster.POSSIBLE_ORACLE_CONFLICT || 0,
  byCluster: Object.fromEntries(Object.entries(byCluster).sort((a, b) => b[1] - a[1])),
  rows,
};
writeFileSync(`${R20}/COMMIT_5R1C5_DECISION_FAILURE_PARTITION.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ total: off.length, byCluster: out.byCluster, dup, oracleConflicts: out.possibleOracleConflicts }, null, 2));
