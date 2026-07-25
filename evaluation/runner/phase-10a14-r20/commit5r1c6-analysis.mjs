// PHASE-10A14-R20 COMMIT 5R1-C6 — rebuild the decision confusion matrix and the
// non-overlapping 305-row decision partition for the reconstructed 2,959 base (live).
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadR3Rows } from './commit5r1c2-oracle-runner.mjs';
import { REPO } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const ANALYZER = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const D = ['ALLOW', 'REFUSE', 'CLARIFY'];

const rows = loadR3Rows();
const m = await import(pathToFileURL(ANALYZER).href + `?v=${Date.now()}`);

// ── Confusion matrix ──
const matrix = {}; for (const e of D) for (const a of D) matrix[`${e}->${a}`] = 0;
const by = { sourceSet: {}, primaryCategory: {}, language: {}, primaryRelation: {}, targetPresence: {}, clauseCount: {} };
let diagonal = 0, off = 0; const offRows = []; const seen = new Set(); let dup = 0;
for (const r of rows) {
  const ev = m.analyzePhilippineTaxIntent(r.query);
  matrix[`${r.expectedDecision}->${ev.decision}`]++;
  if (seen.has(r.oracleId)) dup++; else seen.add(r.oracleId);
  const correct = r.expectedDecision === ev.decision;
  if (correct) diagonal++; else off++;
  const lo = r.query.toLowerCase();
  const lang = /\b(ano|paano|kailan|magkano|buwis|ba|sa|namin|kong)\b/.test(lo) ? 'filipino_taglish' : 'english';
  const primaryRelation = (ev.relations[0] || {}).relation || 'NONE';
  const bump = (grp, key) => { by[grp][key] ??= { total: 0, decCorrect: 0 }; by[grp][key].total++; if (correct) by[grp][key].decCorrect++; };
  bump('sourceSet', r.sourceSet); bump('primaryCategory', r.primaryCategory); bump('language', lang);
  bump('primaryRelation', primaryRelation); bump('targetPresence', ev.requestedTarget ? 'target_present' : 'target_absent'); bump('clauseCount', ev.clauses.length > 1 ? 'multi_clause' : 'single_clause');
  if (!correct) offRows.push({ oracleId: r.oracleId, sourceSet: r.sourceSet, primaryCategory: r.primaryCategory, expectedDecision: r.expectedDecision, actualDecision: ev.decision, expectedRelations: (r.expectedRelations || []).map((x) => x.relation), actualRelations: ev.relations.map((x) => x.relation), requestedTarget: ev.requestedTarget, primaryRelation, language: lang, multiClause: ev.clauses.length > 1, hasAcronym: (ev.acronymMentions || []).length > 0, hasQuote: (ev.quotations || []).length > 0, hasNegation: (ev.negations || []).length > 0, hasLabel: (ev.labelsAndNames || []).length > 0, query: r.query });
}
writeFileSync(`${R20}/COMMIT_5R1C6_DECISION_CONFUSION_MATRIX.json`, JSON.stringify({ base: 'reconstructed accepted 2959 (commit5r1c6-dev-01)', totalCells: rows.length, matrix, diagonalTotal: diagonal, offDiagonalTotal: off, rowIdsMissing: 0, rowIdsDuplicated: dup, by }, null, 2) + '\n');

// ── Non-overlapping partition ──
function cluster(r) {
  const lo = r.query.toLowerCase();
  const exp = r.expectedDecision, act = r.actualDecision;
  const expRels = r.expectedRelations || [];
  const labelNounRe = /\b(product code|database field|field label|course code|training code|channel name|team name|internal (?:label|phrase|project)|codename|project (?:code|phrase|name)|variable name|file ?name)\b/;
  const quoteRe = /\b(translate|quote|spell|count the|reverse|proofread|capitali[sz]e|repeat the|alphabet)\b|["'“]/;
  const negRe = /\b(do not discuss tax|don't discuss tax|not asking about tax|although|even if|non-?tax)\b/;
  const barePronoun = /^(?:is|are|does|do|can|should|when|what|how|will)\b[^?]*\b(?:this|that|it|the|there|i|these|those)\b/.test(lo);
  const scenarioRef = /\bfor (?:scenario|situation|item) \d+/.test(lo);
  const acr = r.hasAcronym;
  const filipino = r.language === 'filipino_taglish';
  if (exp === 'REFUSE' && expRels.includes('NAMES_AS_INTERNAL_LABEL') && act !== 'REFUSE') return 'LABEL_BINDING_MISSED';
  if (act === 'REFUSE' && r.actualRelations.includes('NAMES_AS_INTERNAL_LABEL') && exp !== 'REFUSE') return 'LABEL_BINDING_OVERAPPLIED';
  if (scenarioRef) return 'CONTENTLESS_REFERENT_MISCLASSIFIED';
  if (exp === 'ALLOW' && act !== 'ALLOW') {
    if (barePronoun && !/\bfor (?:a|an|the|our|my) [a-z]/.test(lo)) return 'CONCRETE_REFERENT_MISCLASSIFIED_AS_CONTENTLESS';
    if (labelNounRe.test(lo)) return 'LABEL_BINDING_OVERAPPLIED';
    if (acr) return 'CONTEXTUAL_ACRONYM_MISCLASSIFIED';
    return 'TAX_RELATION_MISSED_ON_CONCRETE_TARGET';
  }
  if (exp === 'REFUSE' && act === 'ALLOW') {
    if (quoteRe.test(lo)) return 'QUOTATION_SCOPE';
    if (barePronoun) return 'CONTENTLESS_REFERENT_MISCLASSIFIED';
    if (negRe.test(lo)) return 'NEGATION_SCOPE';
    if (labelNounRe.test(lo)) return 'LABEL_BINDING_MISSED';
    return 'NON_TAX_ACTION_MISREAD_AS_TAX';
  }
  if (exp === 'REFUSE' && act === 'CLARIFY') {
    if (filipino) return 'FILIPINO_TAGLISH_TASK_SELECTION';
    if (acr) return 'CONTEXTUAL_ACRONYM_MISCLASSIFIED';
    return 'NO_CONTROLLING_RELATION_FALLBACK';
  }
  if (exp === 'CLARIFY' && act === 'ALLOW') { if (acr) return 'BARE_ACRONYM_AMBIGUITY_MISSED'; return 'CONTEXTUAL_ACRONYM_MISCLASSIFIED'; }
  if (exp === 'CLARIFY' && act === 'REFUSE') return 'NO_CONTROLLING_RELATION_FALLBACK';
  return 'OTHER_DECISION_STRUCTURAL';
}
const byCluster = {}; const pseen = new Set(); let pdup = 0;
const prows = offRows.map((r) => { const c = cluster(r); byCluster[c] = (byCluster[c] || 0) + 1; if (pseen.has(r.oracleId)) pdup++; else pseen.add(r.oracleId); return { oracleId: r.oracleId, sourceSet: r.sourceSet, primaryCategory: r.primaryCategory, expectedDecision: r.expectedDecision, actualDecision: r.actualDecision, expectedRelations: r.expectedRelations, actualRelations: r.actualRelations, requestedTarget: r.requestedTarget, primaryRelation: r.primaryRelation, targetCompleteness: null, language: r.language, multiClause: r.multiClause, hasAcronym: r.hasAcronym, hasQuote: r.hasQuote, hasNegation: r.hasNegation, hasLabel: r.hasLabel, primaryCluster: c, query: r.query }; });
writeFileSync(`${R20}/COMMIT_5R1C6_DECISION_FAILURE_PARTITION.json`, JSON.stringify({ decisionMismatchRows: offRows.length, partitionedRows: prows.length, missing: 0, duplicatePrimaryAssignment: pdup, possibleOracleConflicts: byCluster.POSSIBLE_ORACLE_CONFLICT || 0, byCluster: Object.fromEntries(Object.entries(byCluster).sort((a, b) => b[1] - a[1])), rows: prows }, null, 2) + '\n');

console.log(JSON.stringify({ diagonal, off, dup, byCluster: Object.fromEntries(Object.entries(byCluster).sort((a, b) => b[1] - a[1])) }, null, 2));
