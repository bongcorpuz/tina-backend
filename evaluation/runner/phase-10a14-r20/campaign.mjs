// PHASE-10A14-R20 governed tooling — pre-fix campaign execution & result derivation.
// Executes a frozen oracle against the UNCHANGED runtime classifier and derives
// results. Adds no decision logic. Records raw + canonical decisions and both
// strict-canonical and historical-lenient scoring so any scoring divergence is
// preserved, never concealed.

import { readFileSync } from 'node:fs';
import { classifyRow, canonicalizeDecision, NORMALIZATION_RULE } from './classifier-adapter.mjs';
import { annotateRow } from './inventory-annotator.mjs';
import { sha256File } from './identity.mjs';

const canonExpected = (e) => canonicalizeDecision(e);

// Strict-canonical scoring: canonical(actual) === canonical(expected).
// Historical-lenient scoring (for divergence disclosure only): an expected
// non-ALLOW (REFUSE) is satisfied by any non-ALLOW actual (REFUSE or CLARIFY);
// ALLOW must match ALLOW; CLARIFY expected must match CLARIFY.
function historicalLenientPass(eCanon, aCanon) {
  if (eCanon === 'ALLOW') return aCanon === 'ALLOW';
  if (eCanon === 'CLARIFY') return aCanon === 'CLARIFY';
  // eCanon === 'REFUSE'
  return aCanon === 'REFUSE' || aCanon === 'CLARIFY';
}

function failureKind(eCanon, aCanon) {
  if (eCanon === aCanon) return null;
  if (eCanon !== 'ALLOW' && aCanon === 'ALLOW') return 'material_false_allow';
  if (eCanon === 'ALLOW' && aCanon !== 'ALLOW') return 'material_false_refusal';
  return 'clarify_mismatch';
}

function rootCauseFamily(kind) {
  if (kind === 'material_false_allow') return 'false_allow';
  if (kind === 'material_false_refusal') return 'false_refuse';
  if (kind === 'clarify_mismatch') return 'clarify_mismatch';
  return 'none';
}

export function runCampaign({ oracleAbsPath, oracleRelPath, annotate = false }) {
  const oracle = JSON.parse(readFileSync(oracleAbsPath, 'utf8'));
  const rows = oracle.rows;
  const oracleSha256 = sha256File(oracleAbsPath);

  const results = [];
  let strictPassed = 0;
  let lenientPassed = 0;
  const counts = {
    total: rows.length, passed: 0,
    materialFalseAllows: 0, materialFalseRefusals: 0, clarifyMismatches: 0,
    metamorphicFailures: 0,
    byClass: {}, byReason: {},
  };

  for (const r of rows) {
    const cls = classifyRow(r.text);
    const eCanon = canonExpected(r.expected);
    const aCanon = cls.actualDecision;
    const strictOk = eCanon === aCanon;
    const lenientOk = historicalLenientPass(eCanon, aCanon);
    if (strictOk) strictPassed++;
    if (lenientOk) lenientPassed++;
    const kind = strictOk ? null : failureKind(eCanon, aCanon);

    const row = {
      probeId: r.id,
      query: r.text,
      coverageClass: r.coverageClass,
      expectedRaw: r.expected,
      expectedDecision: eCanon,
      actualRawDecision: cls.actualRawDecision,
      actualDecision: aCanon,
      actualReason: cls.actualReason,
      actualDomain: cls.actualDomain,
      confidence: cls.confidence,
      normalizationRule: NORMALIZATION_RULE,
      strictCanonicalPass: strictOk,
      historicalLenientPass: lenientOk,
      failureKind: kind,
      primaryRootCauseFamily: rootCauseFamily(kind),
      metamorphicFailure: false,
      metamorphicGroup: r.metamorphicGroup || null,
      metamorphicRole: r.metamorphicRole || null,
    };

    if (annotate) {
      const ann = annotateRow(r);
      row.runtimeObserved = {
        actualRawDecision: cls.actualRawDecision,
        actualDecision: aCanon,
        actualReason: cls.actualReason,
        actualDomain: cls.actualDomain,
        confidence: cls.confidence,
      };
      row.executorInventoryAnnotation = ann;
      // Surface annotation fields at row level per frozen inventory schema,
      // explicitly flagged as annotations (not runtime output).
      row.primaryTaskClause = ann.primaryTaskClause;
      row.taskVerb = ann.taskVerb;
      row.taskTarget = ann.taskTarget;
      row.taxPredicates = ann.taxPredicates;
      row.taxEntities = ann.taxEntities;
      row.nonTaxObjects = ann.nonTaxObjects;
      row.quotedTerms = ann.quotedTerms;
      row.negation = ann.negation;
      row.relationEvidence = ann.relationEvidence;
      row.rootCauseFamily = rootCauseFamily(kind);
      row.materiality = kind && kind !== 'clarify_mismatch' ? 'material' : (kind ? 'material' : 'immaterial');
    }

    results.push(row);

    counts.byClass[r.coverageClass] ??= { total: 0, passed: 0, failed: 0 };
    counts.byClass[r.coverageClass].total++;
    if (strictOk) counts.byClass[r.coverageClass].passed++;
    else counts.byClass[r.coverageClass].failed++;
    counts.byReason[cls.actualReason] = (counts.byReason[cls.actualReason] || 0) + 1;
    if (kind === 'material_false_allow') counts.materialFalseAllows++;
    else if (kind === 'material_false_refusal') counts.materialFalseRefusals++;
    else if (kind === 'clarify_mismatch') counts.clarifyMismatches++;
  }
  counts.passed = strictPassed;

  return {
    oraclePath: oracleRelPath,
    oracleSha256,
    total: rows.length,
    strictCanonicalPassed: strictPassed,
    historicalLenientPassed: lenientPassed,
    counts,
    results,
  };
}

// Metamorphic view: a group fails if any member's strict-canonical decision is wrong.
export function metamorphicView(results) {
  const groups = {};
  for (const r of results) {
    if (r.coverageClass !== 'metamorphic') continue;
    const g = r.metamorphicGroup || 'UNGROUPED';
    groups[g] ??= { group: g, members: [], failed: false };
    groups[g].members.push(r);
    if (!r.strictCanonicalPass) groups[g].failed = true;
  }
  const failedGroups = Object.values(groups).filter((g) => g.failed);
  // Mark member rows belonging to failed groups.
  for (const g of failedGroups) for (const m of g.members) m.metamorphicFailure = true;
  return { groups: Object.values(groups), failedGroupCount: failedGroups.length, failedGroups };
}
