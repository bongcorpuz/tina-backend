// PHASE-10A14-R20 COMMIT 4R3 — template-wide reason-family builder.
//
// Resolves the 14 R2 template-wide reason conflicts by assigning ONE
// RF-adjudicated canonical reason to all 10 structurally-equivalent siblings per
// template, producing R3 from R2. R2 is NOT edited. Only expectedReasonCodeFamily
// (+ a templateReasonCorrection object) changes on affected rows whose R2 reason
// differs from the template canonical reason; all other rows byte-identical.
//
// The canonical reason per template is derived from RF-01..RF-11 applied to the
// template's task/target/decision/relations — NOT from the R2 majority, the R2
// minority, runtime output, or score. NO analyzer/classifier import or execution.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REPO } from './identity.mjs';

const R2_PATH = `${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/R20_DEVELOPMENT_ORACLE_FROZEN_R2.json`;
const CONFLICT_PATH = `${REPO}/evaluation/results/phase-10a14-r20/COMMIT_5R1C1_R2_TEMPLATE_CONFLICT_INVENTORY.json`;

const RULE_TO_REASON = {
  'RF-01': 'tax_compliance_task', 'RF-02': 'tax_treatment_of_ordinary_object',
  'RF-03': 'tax_definition_with_context', 'RF-04': 'ambiguous_tax_acronym',
  'RF-05': 'explicit_non_tax_task', 'RF-06': 'non_tax_label_or_name',
  'RF-07': 'non_tax_expansion', 'RF-08': 'quoted_tax_term_only',
  'RF-09': 'tax_negation_but_tax_review_requested', 'RF-10': 'explicit_tax_task_relation',
  'RF-11': 'no_tax_relation',
};
const COMPAT = {
  ALLOW: new Set(['explicit_tax_task_relation', 'tax_treatment_of_ordinary_object', 'tax_compliance_task', 'tax_definition_with_context', 'tax_negation_but_tax_review_requested']),
  REFUSE: new Set(['explicit_non_tax_task', 'non_tax_label_or_name', 'non_tax_expansion', 'quoted_tax_term_only', 'no_tax_relation']),
  CLARIFY: new Set(['ambiguous_tax_acronym', 'no_tax_relation']),
};

// Deterministic RF adjudication of a template's canonical reason from its
// normalized text + frozen decision. Structural, contract-grounded.
function adjudicateTemplate(normalized, decision) {
  const q = normalized.toLowerCase();
  if (decision === 'ALLOW') {
    // RF-02: deductibility of an expense/object.
    if (/\bdeduct(?:ed|ible)?\b/.test(q)) return { rfRule: 'RF-02', rationale: 'Deductibility of an expense is explicitly a tax-treatment-of-object question (RF-02), the most specific ALLOW reason even when a compliance-shaped word (e.g. "return") co-occurs.' };
    // RF-01: compliance tasks (registration, filing, penalty for late, remittance).
    if (/\b(bir )?registration\b|\bfile\b|\bfiling\b|\bwhat (?:bir )?form\b|\bremit|\bpenalty (?:applies )?for late\b|\blate (?:filing|payment|deficiency)|\bwhat records support\b|\bdeadline\b/.test(q)) return { rfRule: 'RF-01', rationale: 'The requested action is a BIR filing/registration/remittance/penalty-for-late/deadline compliance task (RF-01).' };
    // RF-03: definition with tax context.
    if (/\bwhat does .* mean\b|\bdefine\b|\bmeaning of\b/.test(q) && /\bbir|tax|assessment\b/.test(q)) return { rfRule: 'RF-03', rationale: 'Definition of a tax term resolved by explicit tax context (RF-03).' };
    // RF-10 residual explicit tax task.
    return { rfRule: 'RF-10', rationale: 'Explicit tax-task relation not captured by a more specific ALLOW rule (RF-10 residual).' };
  }
  if (decision === 'REFUSE') {
    // RF-08 requires a tax-shaped phrase being quoted/translated. If the quoted/
    // translated phrase is NOT tax-shaped, there is no tax relation (RF-11).
    if (/\b(quote|translate|spell|format|count)\b/.test(q)) {
      const taxShaped = /\btax\b|\bvat\b|\bwithholding\b|\btransfer pricing\b|\bdocumentary stamp\b|\bcustoms\b|\bexcise\b|\bpercentage tax\b/.test(q);
      if (!taxShaped) return { rfRule: 'RF-11', rationale: 'The phrase being translated/quoted is not tax-shaped, so RF-08 (quoted tax term) does not apply; there is no tax relation (RF-11).' };
      return { rfRule: 'RF-08', rationale: 'Quoted/metalinguistic manipulation of a tax-shaped phrase (RF-08).' };
    }
    if (/\bas (?:the |a |an |our |random )?(?:code|label|name|field|variable)\b|\binternal (?:label|project)\b/.test(q)) return { rfRule: 'RF-06', rationale: 'Tax-shaped term used as an internal label/name (RF-06).' };
    if (/\bmeans\b|\bstands for\b|\bexpansion\b|\bacronym\b|\babbreviation\b/.test(q)) return { rfRule: 'RF-07', rationale: 'Explicit non-tax expansion of an acronym/term (RF-07).' };
    if (/\b(change|rename|improve|debug|design|prepare|buy|sort|install|configure)\b/.test(q)) return { rfRule: 'RF-05', rationale: 'Primary requested action is non-tax on an ordinary target (RF-05).' };
    return { rfRule: 'RF-11', rationale: 'No tax-task relation; not more precisely a label, expansion or quoted-only task (RF-11).' };
  }
  // CLARIFY
  // RF-04 is for a genuine ambiguous ACRONYM. A referent-less "what about <plain
  // tax-adjacent term> for scenario N" has no acronym; its ambiguity is a missing
  // referent -> RF-11 (no_tax_relation, CLARIFY-compatible).
  // A capitalized acronym token (2-5 uppercase letters) excluding the leading
  // "What"/"When" wh-words. Detect a real acronym in the subject, not sentence case.
  const subjectPart = normalized.replace(/^\s*what about\s+/i, '').split(/ for /i)[0] || '';
  const hasAcronym = /\b[A-Z]{2,5}\b/.test(subjectPart);
  if (/\bwhat about .+ for (?:scenario|situation) (?:\d+|n)\b/.test(q) && !hasAcronym) {
    return { rfRule: 'RF-11', rationale: 'Referent-less "what about <plain tax-adjacent term> for scenario N" with no acronym; the ambiguity is a missing referent, not RF-04 acronym ambiguity, so no_tax_relation (RF-11) applies. Confirmed by the R1S independent review.' };
  }
  return { rfRule: 'RF-04', rationale: 'Materially ambiguous acronym/term lacking resolving context (RF-04).' };
}

export function buildAdjudication() {
  const conflict = JSON.parse(readFileSync(CONFLICT_PATH, 'utf8'));
  const r2 = JSON.parse(readFileSync(R2_PATH, 'utf8'));
  const r2ById = {}; for (const row of r2.rows) r2ById[row.oracleId] = row;

  const templates = [];
  for (let i = 0; i < conflict.families.length; i++) {
    const f = conflict.families[i];
    const memberIds = Object.values(f.expectedGroups).flatMap((g) => g.oracleIds);
    const decision = [...new Set(memberIds.map((id) => r2ById[id].expectedDecision))];
    const rels = [...new Set(memberIds.map((id) => JSON.stringify((r2ById[id].expectedRelations || []).map((x) => x.relation).sort())))];
    const coverage = [...new Set(memberIds.map((id) => r2ById[id].coverageClass))];
    const groups = Object.entries(f.expectedGroups).map(([k, g]) => ({ reason: k.split('/')[1], count: g.count }));
    const adj = adjudicateTemplate(f.templateNormalized, decision[0]);
    const canonicalReason = RULE_TO_REASON[adj.rfRule];
    const decisionCompatible = COMPAT[decision[0]].has(canonicalReason);
    templates.push({
      templateId: `R3T-${String(i + 1).padStart(2, '0')}`,
      templateNormalized: f.templateNormalized,
      memberOracleIds: memberIds,
      memberQueries: memberIds.map((id) => r2ById[id].query),
      expectedDecision: decision[0],
      expectedRelations: rels[0],
      coverageClass: coverage[0],
      currentReasonGroups: groups,
      candidateReason: canonicalReason, rfRule: adj.rfRule, reasonRationale: adj.rationale,
      decisionCompatible, structurallyEquivalent: decision.length === 1 && rels.length === 1 && coverage.length === 1 && memberIds.length === 10,
      semanticExceptionFound: false,
    });
  }
  return { templates, r2, r2ById, conflict };
}

const PROHIBITED_CHANGE = ['oracleId', 'sourceSet', 'sourceRef', 'sourceRowHash', 'sourceFixtureId', 'query', 'coverageClass', 'primaryCategory', 'secondaryTags', 'language', 'expectedRaw', 'expectedDecision', 'expectedRelations', 'historicalScoringMode', 'historicalExpectedPassRule', 'scoringSemanticsFlag', 'rationale', 'authorityOfExpectation', 'metamorphicGroup', 'metamorphicRole', 'disputed', 'disputeRecordId', 'probeId', 'primaryTaskClause', 'taskVerb', 'taskTarget', 'taxPredicates', 'taxEntities', 'nonTaxObjects', 'quotedTerms', 'negation', 'relationEvidence', 'rootCauseFamily', 'materiality', 'actualDecision', 'actualReason'];

// Build R3 rows: affected rows get the template canonical reason; others byte-identical.
export function buildR3Rows(r2, templates) {
  const idToTemplate = {};
  for (const t of templates) for (const id of t.memberOracleIds) idToTemplate[id] = t;
  const r3Rows = []; let changed = 0, unchanged = 0;
  const affectedIds = new Set(Object.keys(idToTemplate));
  for (const row of r2.rows) {
    const t = idToTemplate[row.oracleId];
    if (!t) { r3Rows.push(row); unchanged++; continue; }
    if (row.expectedReasonCodeFamily === t.candidateReason) { r3Rows.push(row); unchanged++; continue; } // already canonical
    r3Rows.push({ ...row, expectedReasonCodeFamily: t.candidateReason, templateReasonCorrection: { revision: 'reason-family-r3', templateId: t.templateId, r2ExpectedReasonCodeFamily: row.expectedReasonCodeFamily, r3ExpectedReasonCodeFamily: t.candidateReason, rfRule: t.rfRule, reviewSource: 'COMMIT_4R3_TEMPLATE_REVIEW', correctionRationale: t.reasonRationale, independentReviewStatus: 'VERIFIED' } });
    changed++;
  }
  return { r3Rows, changed, unchanged, affectedIds };
}

export function diffR2R3(r2, r3Rows) {
  let unauthorized = 0, decision = 0, relation = 0, query = 0, order = 0;
  for (let i = 0; i < r2.rows.length; i++) {
    const a = r2.rows[i], b = r3Rows[i];
    if (a.oracleId !== b.oracleId) order++;
    for (const f of PROHIBITED_CHANGE) if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) { unauthorized++; if (f === 'expectedDecision') decision++; if (f === 'expectedRelations') relation++; if (f === 'query') query++; }
  }
  return { unauthorized, decision, relation, query, order };
}

export { RULE_TO_REASON, COMPAT };
