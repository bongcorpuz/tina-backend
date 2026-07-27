// PHASE-10A14-R20 COMMIT 5R1-C18 — §7 residual-conditioned rule-effect simulator.
//
// C17's controlling correction: family-wide precision is NOT the acceptance statistic.
// A rule acts on the rows matched by its exact runtime condition, so every candidate is
// scored by what it would ACTUALLY change against the accepted C17 runtime, using the
// four mandated classes:
//
//   TP_CORRECTED                 wrong -> expected
//   FP_CORRECT_ROW_REGRESSION    correct -> wrong        (must be 0)
//   FP_WRONG_TO_DIFFERENT_WRONG  wrong -> another wrong  (must be 0 unless offset)
//   UNCHANGED
//
// This module exports the simulator; the rule catalogue is supplied by the caller.
import fs from 'node:fs';
import * as L from './commit5r1c18-lib.mjs';

/** Snapshot the current reason verdict for every R3 row, plus the enriched features. */
export function buildBaseline(rows, analyze) {
  const TAX_CONCEPT = /\b(?:income tax|value[- ]added tax|withholding tax|percentage tax|excise tax|documentary stamp|capital gains tax|estate tax|donor'?s? tax|customs dut\w*|final tax|tax amnesty|deficiency interest|tax credit|tax refund|net operating loss|minimum corporate income tax|regular corporate income tax|optional standard deduction|nolco|mcit|rcit|iaet|cgt|cwt|ewt|fwt|dst|fbt|osd|input vat|output vat)\b/i;
  const TRANSACTION = /\b(?:transaction|purchase|sale|sales|payment|import|imports|expense|lease|rental|contract|billing|commission|royalt\w*|dividend)\b/i;
  const RECEIPT = /\b(?:receipts?|income|proceeds|earnings|kita)\b/i;
  const SERVICE = /\b(?:service|services|fee|fees)\b/i;
  const ASSET = /\b(?:asset|property|land|building|equipment|vehicle|goods|suppl(?:y|ies))\b/i;
  const PROCEDURE = /\b(?:bir form|filing|registration|remittance|deadline|penalty|alphalist|slsp|books of account|tax clearance)\b/i;
  const ARTEFACT = /\b(?:folder|file|document|handbook|manual|brochure|poster|slide|deck|spreadsheet|column|font|typeface|css|typescript|javascript|enum|variable|class list|web form|directory|archive|draft)\b/i;

  const out = [];
  for (const r of rows) {
    const ev = analyze(r.query);
    const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
    const t = String(primary ? primary.text : r.query).trim().toLowerCase();
    const rels = (ev.relations || []).map((x) => x.relation);

    const imperativeHead = /^(?:please\s+)?(?:change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule|edit|make|create|summari[sz]e|list|translate|explain|tune|format|archive|move|copy|store|upload|export|attach|duplicate|count|repeat|spell|reverse|proofread|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\b/i.test(t);
    const interrogOpener = /^(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\b/i.test(t);

    out.push({
      oracleId: r.oracleId,
      query: r.query,
      expected: r.expectedReasonCodeFamily,
      actual: ev.reasonCode,
      correct: ev.reasonCode === r.expectedReasonCodeFamily,
      decision: ev.decision,
      f: {
        primaryLo: t,
        relations: rels,
        controllingRelation: rels.length ? rels[0] : '(none)',
        speechAct: imperativeHead ? 'request' : interrogOpener ? 'question' : /\?/.test(t) ? 'question_marked_assertion' : 'assertion',
        imperativeHead,
        interrogOpener,
        // modal / deontic force
        modalOperator: /\b(?:must|should|shall|need to|required to|kailangan)\b/i.test(t) ? 'deontic'
          : /\b(?:can|could|may|might)\b/i.test(t) ? 'epistemic' : 'none',
        polarity: /\b(?:not|hindi|never|no longer|walang)\b/i.test(t) ? 'negative' : 'positive',
        // argument structure
        hasDirectObject: !!(primary && primary.taskObject),
        objectComplement: /\b(?:as|to mean|to be|into)\s+(?:a|an|the|our|my)?\s*\S+/i.test(t),
        localDefinitionOperator: /\b(?:means|stands for|refers to|is short for|to mean|i\.e\.)\b|\s=\s/i.test(t),
        documentLocalScope: /\b(?:here|in this|in our|our|namin|sa amin|locally|internally)\b/i.test(t),
        // roles
        targetSemanticRole: PROCEDURE.test(t) ? 'procedure'
          : (TAX_CONCEPT.test(t) && !TRANSACTION.test(t) && !RECEIPT.test(t) && !SERVICE.test(t) && !ASSET.test(t)) ? 'tax_concept'
          : TRANSACTION.test(t) ? 'transaction'
          : RECEIPT.test(t) ? 'receipt_income'
          : SERVICE.test(t) ? 'service'
          : ASSET.test(t) ? 'asset'
          : ARTEFACT.test(t) ? 'artefact' : 'other',
        // acts
        namingAssignment: /\b(?:name (?:it|this|that|the)|call (?:it|this|that)|title (?:it|this)|label (?:it|this|as)|tag (?:it|as)|code-?named|is called|is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename))\b/i.test(t),
        quotationOperand: /\bthe (?:phrase|word|term)\b/i.test(t),
        unresolvedKind: (ev.ambiguityFlags || []).includes('ambiguous_acronym') ? 'acronym'
          : (ev.ambiguityFlags || []).includes('dangling_referent') ? 'referent' : 'none',
        topicFragment: !/\?/.test(t) && !imperativeHead && t.split(/\s+/).length <= 6,
        wordCount: t.split(/\s+/).filter(Boolean).length,
      },
    });
  }
  return out;
}

/**
 * Simulate one rule. `cond(row)` selects rows the rule fires on; `assign` is the reason
 * the rule would emit. Returns the four mandated effect classes.
 */
export function simulate(baseline, name, cond, assign, principle) {
  const eff = { TP_CORRECTED: [], FP_CORRECT_ROW_REGRESSION: [], FP_WRONG_TO_DIFFERENT_WRONG: [], UNCHANGED: [] };
  let support = 0;
  for (const b of baseline) {
    if (!cond(b)) continue;
    support++;
    const newReason = typeof assign === 'function' ? assign(b) : assign;
    if (newReason === b.actual) { eff.UNCHANGED.push(b.oracleId); continue; }
    if (b.correct) eff.FP_CORRECT_ROW_REGRESSION.push({ oracleId: b.oracleId, from: b.actual, to: newReason, query: b.query });
    else if (newReason === b.expected) eff.TP_CORRECTED.push({ oracleId: b.oracleId, from: b.actual, to: newReason });
    else eff.FP_WRONG_TO_DIFFERENT_WRONG.push({ oracleId: b.oracleId, expected: b.expected, from: b.actual, to: newReason });
  }
  const tp = eff.TP_CORRECTED.length;
  const fpc = eff.FP_CORRECT_ROW_REGRESSION.length;
  const fpw = eff.FP_WRONG_TO_DIFFERENT_WRONG.length;
  return {
    rule: name, principle,
    conditionSupport: support,
    rowsChanged: tp + fpc + fpw,
    TP_CORRECTED: tp,
    FP_CORRECT_ROW_REGRESSION: fpc,
    FP_WRONG_TO_DIFFERENT_WRONG: fpw,
    UNCHANGED: eff.UNCHANGED.length,
    netMismatchDelta: tp - fpc,
    forecastAcceptable: fpc === 0 && fpw === 0 && tp > 0,
    correctRowRegressions: eff.FP_CORRECT_ROW_REGRESSION.slice(0, 10),
    wrongToWrong: eff.FP_WRONG_TO_DIFFERENT_WRONG.slice(0, 10),
    correctedSample: eff.TP_CORRECTED.slice(0, 6),
  };
}

export function writeSafetySet(baseline) {
  const correct = baseline.filter((b) => b.correct);
  const byReason = {};
  for (const b of correct) byReason[b.actual] = (byReason[b.actual] || 0) + 1;
  L.writeJson(L.RES + 'COMMIT_5R1C18_CORRECT_ROW_SAFETY_SET.json', {
    unit: 'COMMIT 5R1-C18', generatedUtc: new Date().toISOString(),
    purpose: 'The set of R3 rows whose reason is ALREADY correct under the accepted C17 runtime. Any candidate rule that would change a reason for any row in this set is rejected before implementation.',
    correctRowCount: correct.length,
    residualRowCount: baseline.length - correct.length,
    correctByReason: byReason,
    oracleIdsAreAnalysisEvidenceOnly: true,
    correctOracleIds: correct.map((b) => b.oracleId),
  });
  return correct.length;
}
