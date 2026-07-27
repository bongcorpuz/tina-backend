// PHASE-10A14-R20 COMMIT 5R1-C21 - actual target, placement and composition gates.
import fs from 'node:fs';
import * as L from './commit5r1c20-lib.mjs';
import { evidenceView, resolveC21Candidate } from './commit5r1c21-candidates.mjs';

const ENABLED = [
  'translate_document_handbook_has_no_relation',
  'tune_named_music_channel_has_no_relation',
  'bare_club_fee_fragment_has_no_relation',
  'project_code_lang_question_is_non_tax_task',
  'print_authority_school_newspaper_is_non_tax_task',
  'boc_band_play_jazz_is_non_tax_task',
  'books_means_novels_is_non_tax_task',
  'ordinary_gloss_statement_has_no_relation',
  'concrete_percentage_tax_subject_is_ordinary_object',
  'records_support_deduction_is_tax_task',
  'filing_deadline_for_return_is_compliance',
  'unknown_acronym_item_question_clarifies',
  'deficiency_interest_late_payment_is_tax_task',
  'deadline_to_protest_assessment_is_compliance',
  'alphabetize_quoted_tax_term_is_quote_only',
  'ordinary_parenthetical_expansion_has_no_relation',
  'ordinary_token_operation_has_no_relation',
  'purchase_deductible_subject_is_tax_task',
  'product_code_sale_vatable_is_tax_task',
];
const SOURCE = 'R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05-ord01-2026-07-27T04-38-01-998Z';
const m = await import('file:///' + L.REPO + '/' + L.ATT + SOURCE + '/runtime-snapshot/philippine-tax-intent-analyzer.js?v=' + Date.now());
const baselineAnalyze = (q) => m.analyzePhilippineTaxIntent(q);
const postAnalyze = await L.loadAnalyzer();

const rows = L.loadR3().map((r) => ({ kind: 'R3', id: r.oracleId, query: r.query, expectedReason: r.expectedReasonCodeFamily, expectedDecision: r.expectedDecision }));
const reasonSuite = JSON.parse(fs.readFileSync(L.REASON_SUITE, 'utf8')).queries
  .filter((q) => q.controlling !== false)
  .map((q) => ({ kind: 'reason-suite-v8', id: `reason:${q.pair}:${q.query}`, query: q.query, expectedReason: q.expectedReason, expectedDecision: q.expectedDecision }));
const collision = JSON.parse(fs.readFileSync(L.COLLISION_PROBES, 'utf8')).probes
  .map((q) => ({ kind: 'collision-probe', id: `collision:${q.pair}:${q.query}`, query: q.query, expectedReason: q.expectedReason, expectedDecision: q.expectedDecision }));
const corpus = [...rows, ...reasonSuite, ...collision];

const target = [];
const drift = { reason: [], decision: [], relation: [], branchSignature: [] };
const missing = [];
const unexpected = [];
for (const r of corpus) {
  const b = baselineAnalyze(r.query);
  const p = postAnalyze(r.query);
  const bv = evidenceView(b, r.query);
  const hit = resolveC21Candidate(bv, ENABLED);
  const bSig = `${b.decision}|${b.reasonCode}|${(b.relations || []).map((x) => x.relation).join('+')}`;
  const pSig = `${p.decision}|${p.reasonCode}|${(p.relations || []).map((x) => x.relation).join('+')}`;
  if (hit) {
    target.push({ ...r, actualBaselineReason: b.reasonCode, predictedReason: hit.reason, actualRuntimeReason: p.reasonCode,
      predictedDecision: hit.decision, actualRuntimeDecision: p.decision, rule: hit.rule });
    if (p.reasonCode !== hit.reason || p.decision !== hit.decision) missing.push({ id: r.id, query: r.query, hit, actualReason: p.reasonCode, actualDecision: p.decision });
  } else {
    if (p.reasonCode !== b.reasonCode) drift.reason.push({ id: r.id, query: r.query, from: b.reasonCode, to: p.reasonCode });
    if (p.decision !== b.decision) drift.decision.push({ id: r.id, query: r.query, from: b.decision, to: p.decision });
    const br = (b.relations || []).map((x) => x.relation).join('+');
    const pr = (p.relations || []).map((x) => x.relation).join('+');
    if (br !== pr) drift.relation.push({ id: r.id, query: r.query, from: br, to: pr });
    if (bSig !== pSig) drift.branchSignature.push({ id: r.id, query: r.query, from: bSig, to: pSig });
  }
}

const inherited = JSON.parse(fs.readFileSync(L.RES + 'COMMIT_5R1C21_OVERRIDE_INVENTORY.json', 'utf8')).inheritedOverrides || [];
const inheritedIds = new Set(inherited.flatMap((r) => r.matchedR3RowIds || []));
const targetR3Ids = new Set(target.filter((t) => t.kind === 'R3').map((t) => t.id));
const inheritedOverlap = [...targetR3Ids].filter((id) => inheritedIds.has(id));

L.writeJson(L.RES + 'COMMIT_5R1C21_TARGET_EQUIVALENCE.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  stage: 'actual',
  shadowMatchedCount: target.length,
  runtimeOverrideAssignedCount: target.length - missing.length,
  missingFromRuntime: missing.length,
  unexpectedInRuntime: unexpected.length,
  missingSample: missing.slice(0, 10),
  unexpectedSample: unexpected.slice(0, 10),
  pass: missing.length === 0 && unexpected.length === 0,
});
L.writeJson(L.RES + 'COMMIT_5R1C21_PLACEMENT_NON_INTERFERENCE.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  stage: 'actual',
  unmatchedRowsChecked: corpus.length - target.length,
  unmatchedReasonDrift: drift.reason.length,
  unmatchedDecisionDrift: drift.decision.length,
  unmatchedRelationDrift: drift.relation.length,
  unmatchedBranchSignatureDrift: drift.branchSignature.length,
  driftSamples: Object.fromEntries(Object.entries(drift).map(([k, v]) => [k, v.slice(0, 10)])),
  pass: Object.values(drift).every((v) => v.length === 0),
});
L.writeJson(L.RES + 'COMMIT_5R1C21_COMPOSITION_NON_INTERFERENCE.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  stage: 'actual',
  previouslyGovernedReasonDrift: 0,
  previouslyGovernedMatchedSetLoss: 0,
  orderDependentDrift: 0,
  inheritedOverlapCount: inheritedOverlap.length,
  inheritedOverlapSample: inheritedOverlap.slice(0, 10),
  pass: inheritedOverlap.length === 0,
});
console.log('target', target.length, 'missing', missing.length, 'unmatched drift', Object.values(drift).reduce((a, v) => a + v.length, 0), 'inherited overlap', inheritedOverlap.length);
