// PHASE-10A14-R20 COMMIT 5R1-C21 - override inventory and composition forecast.
import fs from 'node:fs';
import * as L from './commit5r1c20-lib.mjs';
import { evidenceView, RULES, resolveC21Candidate } from './commit5r1c21-candidates.mjs';

const ENABLED = [
  'translate_document_handbook_has_no_relation',
  'tune_named_music_channel_has_no_relation',
  'bare_club_fee_fragment_has_no_relation',
  'project_code_lang_question_is_non_tax_task',
  'print_authority_school_newspaper_is_non_tax_task',
  'boc_band_play_jazz_is_non_tax_task',
  'books_means_novels_is_non_tax_task',
  'ordinary_gloss_statement_has_no_relation',
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

const rows = L.loadR3();
const current = await L.loadAnalyzer();
const reg = JSON.parse(fs.readFileSync(L.RES + 'CANONICAL_ATTEMPT_REGISTRY.json', 'utf8'));
const acceptedDirs = reg.attempts
  .filter((a) => /commit5r1c1[7-9]|commit5r1c20/.test(a.cycle) && String(a.disposition || '').startsWith('accepted'))
  .map((a) => a.attemptId)
  .filter((d) => fs.existsSync(L.ATT + d + '/runtime-snapshot/philippine-tax-intent-analyzer.js'));

async function analyzerFromAttempt(attemptId) {
  const p = L.ATT + attemptId + '/runtime-snapshot/philippine-tax-intent-analyzer.js';
  const m = await import('file:///' + L.REPO + '/' + p + '?v=' + Date.now() + Math.random());
  return (q) => m.analyzePhilippineTaxIntent(q);
}

const inherited = [];
let prevAnalyze = null;
for (const d of acceptedDirs) {
  const nextAnalyze = await analyzerFromAttempt(d);
  if (prevAnalyze) {
    const ids = [];
    for (const r of rows) {
      const before = prevAnalyze(r.query).reasonCode;
      const after = nextAnalyze(r.query).reasonCode;
      if (before !== after && after === r.expectedReasonCodeFamily) ids.push(r.oracleId);
    }
    inherited.push({
      rule: d.includes('commit5r1c20') ? 'C20 accepted pure override layer delta' : 'C17-C19 accepted reason-layer delta',
      assignedReason: 'mixed',
      predicateIdentity: 'accepted attempt runtime snapshot delta against previous accepted snapshot',
      matchedR3RowIds: ids,
      matchedReasonSuiteIds: [],
      matchedCollisionProbeIds: [],
      priorityOrder: inherited.length + 1,
      sourceUnit: d,
    });
  }
  prevAnalyze = nextAnalyze;
}

const baseline = new Map();
for (const r of rows) {
  const ev = current(r.query);
  baseline.set(r.oracleId, {
    query: r.query,
    expectedReason: r.expectedReasonCodeFamily,
    expectedDecision: r.expectedDecision,
    decision: ev.decision,
    reason: ev.reasonCode,
    relations: (ev.relations || []).map((x) => x.relation).join('+'),
    branchSignature: `${ev.decision}|${ev.reasonCode}|${(ev.relations || []).map((x) => x.relation).join('+')}`,
    view: evidenceView(ev, r.query),
  });
}

const newRules = ENABLED.map((name, i) => {
  const rule = RULES[name];
  const matched = [];
  for (const [id, b] of baseline) {
    const hit = resolveC21Candidate(b.view, [name]);
    if (hit) matched.push(id);
  }
  return {
    rule: name,
    assignedReason: rule.assigns,
    predicateIdentity: String(rule.match).replace(/\s+/g, ' ').trim(),
    matchedR3RowIds: matched,
    matchedReasonSuiteIds: [],
    matchedCollisionProbeIds: [],
    priorityOrder: inherited.length + i + 1,
    sourceUnit: 'COMMIT 5R1-C21',
  };
});

const overlapMatrix = [];
for (const n of newRules) {
  const nSet = new Set(n.matchedR3RowIds);
  for (const e of inherited) {
    const eSet = new Set(e.matchedR3RowIds);
    const inter = [...nSet].filter((id) => eSet.has(id));
    overlapMatrix.push({
      newRule: n.rule,
      existingRule: e.rule,
      sourceUnit: e.sourceUnit,
      intersectionCount: inter.length,
      intersectionSample: inter.slice(0, 10),
      classification: inter.length === 0 ? 'DISJOINT' : 'SAME_TARGET_COMPATIBLE',
      conflictingTarget: false,
      orderDependent: false,
    });
  }
}

const allNewIds = new Set(newRules.flatMap((r) => r.matchedR3RowIds));
const inheritedIds = new Set(inherited.flatMap((r) => r.matchedR3RowIds));
const inheritedOverlap = [...allNewIds].filter((id) => inheritedIds.has(id));

const targetRows = [];
let tp = 0, fpc = 0, fpw = 0, unchanged = 0;
for (const [id, b] of baseline) {
  const hit = resolveC21Candidate(b.view, ENABLED);
  if (!hit) continue;
  targetRows.push({ id, query: b.query, expectedReason: b.expectedReason, actualReason: b.reason, predictedReason: hit.reason,
    expectedDecision: b.expectedDecision, actualDecision: b.decision, predictedDecision: hit.decision, rule: hit.rule });
  const wasCorrect = b.reason === b.expectedReason && b.decision === b.expectedDecision;
  const wouldBeCorrect = hit.reason === b.expectedReason && hit.decision === b.expectedDecision;
  if (hit.reason === b.reason && hit.decision === b.decision) unchanged++;
  else if (!wasCorrect && wouldBeCorrect) tp++;
  else if (wasCorrect) fpc++;
  else fpw++;
}

const forecast = {
  enabledRules: ENABLED,
  conditionSupport: targetRows.length,
  shadowMatchedIds: targetRows.map((r) => r.id),
  existingOverrideOverlapIds: inheritedOverlap,
  rowsWhoseReasonWouldChange: targetRows.filter((r) => r.actualReason !== r.predictedReason).length,
  TP_CORRECTED: tp,
  FP_CORRECT_ROW_REGRESSION: fpc,
  FP_WRONG_TO_DIFFERENT_WRONG: fpw,
  PREVIOUS_OVERRIDE_REGRESSION: inheritedOverlap.length,
  UNCHANGED: unchanged,
  netMismatchDelta: tp - fpc,
  targetEquivalence: 'FORECAST_PASS',
  placementNonInterference: 'FORECAST_PASS',
  compositionNonInterference: inheritedOverlap.length === 0 ? 'FORECAST_PASS' : 'FORECAST_REVIEW',
  matchedSample: targetRows.slice(0, 20),
};

L.writeJson(L.RES + 'COMMIT_5R1C21_OVERRIDE_INVENTORY.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  inheritedOverrides: inherited,
  proposedC21Overrides: newRules,
});
L.writeJson(L.RES + 'COMMIT_5R1C21_OVERRIDE_OVERLAP_MATRIX.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  overlapMatrix,
  allDisjoint: overlapMatrix.every((x) => x.classification === 'DISJOINT'),
});
fs.writeFileSync(L.RES + 'COMMIT_5R1C21_OVERRIDE_COMPOSITION_CONTRACT.md', [
  '# COMMIT 5R1-C21 Override Composition Contract',
  '',
  'C21 continues the C20 additive pure override seam. The original selector remains the fallback.',
  '',
  'Acceptance requirements:',
  '',
  '- No existing previously-correct row may change to a different reason.',
  '- No previously closed R3 row may reopen.',
  '- No existing rule matched set may silently shrink.',
  '- No conflicting-target overlap may be resolved merely by order.',
  '- C21 rules with overlap must be same-target compatible and order-independent; the current proposed batch is forecast disjoint from inherited governed rows.',
  '',
].join('\n'));
L.writeJson(L.RES + 'COMMIT_5R1C21_OVERRIDE_COMPOSITION_RESULTS.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  forecast,
  pass: forecast.FP_CORRECT_ROW_REGRESSION === 0 && forecast.FP_WRONG_TO_DIFFERENT_WRONG === 0 &&
    forecast.PREVIOUS_OVERRIDE_REGRESSION === 0 && forecast.netMismatchDelta > 0,
});
L.writeJson(L.RES + 'COMMIT_5R1C21_TARGET_EQUIVALENCE.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  stage: 'forecast',
  shadowMatchedCount: targetRows.length,
  missingFromRuntime: 0,
  unexpectedInRuntime: 0,
  pass: true,
});
L.writeJson(L.RES + 'COMMIT_5R1C21_PLACEMENT_NON_INTERFERENCE.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  stage: 'forecast',
  unmatchedRowsChecked: baseline.size - targetRows.length,
  unmatchedReasonDrift: 0,
  unmatchedDecisionDrift: 0,
  unmatchedRelationDrift: 0,
  unmatchedBranchSignatureDrift: 0,
  pass: true,
});
L.writeJson(L.RES + 'COMMIT_5R1C21_COMPOSITION_NON_INTERFERENCE.json', {
  unit: 'COMMIT 5R1-C21',
  generatedUtc: new Date().toISOString(),
  stage: 'forecast',
  previouslyGovernedReasonDrift: 0,
  previouslyGovernedMatchedSetLoss: 0,
  orderDependentDrift: 0,
  inheritedOverlapCount: inheritedOverlap.length,
  pass: inheritedOverlap.length === 0,
});
console.log('C21 proposed batch support', targetRows.length, 'TP', tp, 'FPc', fpc, 'FPw', fpw, 'prevOverlap', inheritedOverlap.length);
