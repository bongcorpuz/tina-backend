// PHASE-10A14-R20 COMMIT 4R2 — R2 oracle builder.
//
// Derives exactly 73 confirmed reason-family corrections from the COMMITTED R1S
// resolution register (authoritative) and applies them to R1 to produce R2.
// R1 is NOT edited. Only expectedReasonCodeFamily (+ a reasonCorrection object)
// changes on the 73 confirmed-defect rows; all other 3,647 rows are byte-identical.
//
// NO analyzer/classifier/production-boundary import or execution. NO runtime output.
// The prepared adjudicator is used ONLY as a cross-check aid; the resolution
// register is controlling. Any adjudicator-vs-register conflict => STOP (surfaced).

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REPO } from './identity.mjs';

const R1_PATH = `${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/R20_DEVELOPMENT_ORACLE_FROZEN_R1.json`;
const RC = `${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/review-completion`;

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
const queryHash = (q) => createHash('sha256').update(q, 'utf8').digest('hex').slice(0, 24);

export function loadR1() { return JSON.parse(readFileSync(R1_PATH, 'utf8')); }

// Build the authoritative 73-correction source from the committed resolution register,
// using the ACTUAL frozen R1 reason as the "from" value (per owner adjudication).
export function buildCorrectionSource() {
  const resolution = JSON.parse(readFileSync(`${RC}/R20_REASON_FAMILY_R1_FULL_REVIEW_RESOLUTION_REGISTER.json`, 'utf8'));
  const challengeReg = JSON.parse(readFileSync(`${RC}/R20_REASON_FAMILY_R1_FULL_REVIEW_CHALLENGE_REGISTER.json`, 'utf8'));
  const chalById = {}; for (const c of challengeReg.challenges) chalById[c.oracleId] = c;
  const r1 = loadR1();
  const r1ById = {}; for (const row of r1.rows) r1ById[row.oracleId] = row;

  const confirmed = resolution.resolutions.filter((r) => r.resolution === 'R1_DEFECT_CONFIRMED');
  const corrections = [];
  const labelDiscrepancies = [];
  const errors = [];

  for (const r of confirmed) {
    const row = r1ById[r.oracleId];
    if (!row) { errors.push({ oracleId: r.oracleId, error: 'oracleId not in R1' }); continue; }
    const actualR1Reason = row.expectedReasonCodeFamily;
    const target = r.resolvedReason;
    // Contract checks (STOP conditions).
    if (!target) { errors.push({ oracleId: r.oracleId, error: 'empty resolvedReason' }); continue; }
    if (RULE_TO_REASON[r.ruleBasis] !== target) { errors.push({ oracleId: r.oracleId, error: `resolvedReason ${target} does not match RF rule ${r.ruleBasis}` }); continue; }
    if (!COMPAT[row.expectedDecision].has(target)) { errors.push({ oracleId: r.oracleId, error: `resolvedReason ${target} incompatible with decision ${row.expectedDecision}` }); continue; }

    const reviewedReason = r.reviewedReason;
    if (reviewedReason !== actualR1Reason) {
      labelDiscrepancies.push({
        oracleId: r.oracleId, queryHash: queryHash(row.query),
        challengeRegisterReviewedReason: reviewedReason, actualFrozenR1Reason: actualR1Reason,
        committedResolvedReason: target, ruleBasis: r.ruleBasis,
        targetCorrectionUnchanged: true, decisionUnchanged: true, relationsUnchanged: true,
        classification: 'REVIEW_SOURCE_LABEL_CLERICAL_DISCREPANCY',
      });
    }

    corrections.push({
      correctionId: `R2C-${r.oracleId}`, oracleId: r.oracleId, queryHash: queryHash(row.query),
      r1ExpectedReasonCodeFamily: actualR1Reason,          // actual frozen R1 reason (authoritative "from")
      r2ExpectedReasonCodeFamily: target,                  // committed resolvedReason (authoritative target)
      historicalReviewedReasonLabel: reviewedReason,       // retained for transparency
      labelDiscrepancy: reviewedReason !== actualR1Reason,
      ruleBasis: r.ruleBasis, reviewerRationale: chalById[r.oracleId]?.rationale || r.rationale,
      resolution: r.resolution, resolutionRationale: r.rationale,
      sourceChallengePath: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/review-completion/R20_REASON_FAMILY_R1_FULL_REVIEW_CHALLENGE_REGISTER.json',
      sourceResolutionPath: 'evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/review-completion/R20_REASON_FAMILY_R1_FULL_REVIEW_RESOLUTION_REGISTER.json',
    });
  }

  return { corrections, labelDiscrepancies, errors, confirmedCount: confirmed.length };
}

const PROHIBITED_CHANGE = ['oracleId', 'sourceSet', 'sourceRef', 'sourceRowHash', 'sourceFixtureId', 'query', 'coverageClass', 'primaryCategory', 'secondaryTags', 'language', 'expectedRaw', 'expectedDecision', 'expectedRelations', 'historicalScoringMode', 'historicalExpectedPassRule', 'scoringSemanticsFlag', 'rationale', 'authorityOfExpectation', 'metamorphicGroup', 'metamorphicRole', 'disputed', 'disputeRecordId', 'probeId', 'primaryTaskClause', 'taskVerb', 'taskTarget', 'taxPredicates', 'taxEntities', 'nonTaxObjects', 'quotedTerms', 'negation', 'relationEvidence', 'rootCauseFamily', 'materiality', 'actualDecision', 'actualReason'];

// Apply corrections to R1 -> R2 rows. Only expectedReasonCodeFamily + reasonCorrection change.
export function buildR2Rows(r1, corrections) {
  const corrById = {}; for (const c of corrections) corrById[c.oracleId] = c;
  const r2Rows = [];
  let changed = 0, unchanged = 0;
  for (const row of r1.rows) {
    const c = corrById[row.oracleId];
    if (!c) { r2Rows.push(row); unchanged++; continue; }
    // Strip any pre-existing reasonAdjudication is NOT allowed (would change fields);
    // keep the row as-is and only replace expectedReasonCodeFamily + add reasonCorrection.
    const newRow = { ...row, expectedReasonCodeFamily: c.r2ExpectedReasonCodeFamily, reasonCorrection: {
      revision: 'reason-family-r2', r1ExpectedReasonCodeFamily: c.r1ExpectedReasonCodeFamily,
      r2ExpectedReasonCodeFamily: c.r2ExpectedReasonCodeFamily, ruleBasis: c.ruleBasis,
      reviewSource: 'COMMIT_4R1S_FULL_INDEPENDENT_REVIEW', challengeId: `CH-${row.oracleId}`,
      resolution: 'R1_DEFECT_CONFIRMED', correctionRationale: c.resolutionRationale,
      correctionReviewerStatus: 'VERIFIED',
    } };
    r2Rows.push(newRow);
    changed++;
  }
  return { r2Rows, changed, unchanged };
}

// Field-by-field R1/R2 diff excluding the two authorized changes on corrected rows.
export function diffR1R2(r1, r2Rows, corrById) {
  let unauthorizedDiffs = 0, decisionDiffs = 0, relationDiffs = 0, queryDiffs = 0, newRowChanges = 0, orderChanges = 0;
  for (let i = 0; i < r1.rows.length; i++) {
    const a = r1.rows[i], b = r2Rows[i];
    if (a.oracleId !== b.oracleId) orderChanges++;
    if (a.sourceSet === 'r20_new') {
      if (JSON.stringify(a) !== JSON.stringify(b)) newRowChanges++;
      continue;
    }
    for (const f of PROHIBITED_CHANGE) {
      if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) {
        unauthorizedDiffs++;
        if (f === 'expectedDecision') decisionDiffs++;
        if (f === 'expectedRelations') relationDiffs++;
        if (f === 'query') queryDiffs++;
      }
    }
  }
  return { unauthorizedDiffs, decisionDiffs, relationDiffs, queryDiffs, newRowChanges, orderChanges };
}

export { RULE_TO_REASON, COMPAT };
