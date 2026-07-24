// PHASE-10A14-R20 COMMIT 4R1S — full blind review packet builder + auditor.
// Extracts ONLY the authorized fields for all 1,897 inherited R1 rows. No
// analyzer/classifier import or execution. No V1/baseline/change metadata.

import { readFileSync, writeFileSync } from 'node:fs';
import { REPO } from './identity.mjs';

const R1_PATH = `${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/R20_DEVELOPMENT_ORACLE_FROZEN_R1.json`;

const ALLOWED_FIELDS = ['oracleId', 'query', 'expectedDecision', 'expectedRelations', 'r1ExpectedReasonCodeFamily', 'ruleId', 'primaryRationale'];
const PROHIBITED_FIELDS = ['sourceSet', 'sourceRef', 'sourceRowHash', 'sourceFixtureId', 'coverageClass', 'primaryCategory', 'secondaryTags', 'language', 'expectedRaw', 'expectedReasonCodeFamily', 'historicalScoringMode', 'historicalExpectedPassRule', 'scoringSemanticsFlag', 'rationale', 'authorityOfExpectation', 'metamorphicGroup', 'metamorphicRole', 'disputed', 'disputeRecordId', 'probeId', 'primaryTaskClause', 'taskVerb', 'taskTarget', 'taxPredicates', 'taxEntities', 'nonTaxObjects', 'quotedTerms', 'negation', 'relationEvidence', 'rootCauseFamily', 'materiality', 'actualDecision', 'actualReason', 'reasonAdjudication', 'changedFromV1', 'v1Reason', 'v1ExpectedReasonCodeFamily', 'baselinePassed', 'baselineFailed', 'conflictSetMembership', 'priorChallengeStatus'];

export function buildBlindPacket() {
  const r1 = JSON.parse(readFileSync(R1_PATH, 'utf8'));
  const inherited = r1.rows.filter((r) => r.sourceSet !== 'r20_new');
  const packet = inherited.map((r) => ({
    oracleId: r.oracleId,
    query: r.query,
    expectedDecision: r.expectedDecision,
    expectedRelations: r.expectedRelations,
    r1ExpectedReasonCodeFamily: r.expectedReasonCodeFamily,
    ruleId: r.reasonAdjudication.ruleId,
    primaryRationale: r.reasonAdjudication.rationale,
  }));
  return { packet, inheritedCount: inherited.length };
}

export function auditPacket(packet) {
  let prohibitedFound = 0;
  const foundFields = new Set();
  for (const row of packet) {
    for (const f of Object.keys(row)) {
      if (!ALLOWED_FIELDS.includes(f)) { prohibitedFound++; foundFields.add(f); }
    }
    for (const f of PROHIBITED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(row, f)) { prohibitedFound++; foundFields.add(f); }
    }
  }
  const allowedFieldsPresent = ALLOWED_FIELDS.every((f) => packet.length === 0 || Object.prototype.hasOwnProperty.call(packet[0], f));
  return {
    rowsAudited: packet.length,
    allowedFields: ALLOWED_FIELDS,
    prohibitedFieldsChecked: PROHIBITED_FIELDS,
    prohibitedFieldOccurrences: prohibitedFound,
    prohibitedFieldsFound: [...foundFields],
    allowedFieldsPresent,
    clean: prohibitedFound === 0 && allowedFieldsPresent,
  };
}
