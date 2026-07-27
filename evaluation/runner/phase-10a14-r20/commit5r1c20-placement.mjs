// PHASE-10A14-R20 COMMIT 5R1-C20 — §9 shadow mode, target equivalence and placement
// non-interference. Runs BEFORE and AFTER each candidate.
import fs from 'node:fs';
import * as L from './commit5r1c20-lib.mjs';
import { evidenceView, RULES, resolveGovernedReasonOverride } from './commit5r1c20-override.mjs';

/**
 * Baseline capture: for every R3 row and every frozen-suite row, record the full
 * observable output. `branchSignature` is a stable proxy for the reason branch path —
 * the tuple the selector produced — so unmatched drift is detectable without
 * instrumenting the selector itself.
 */
export function captureBaseline(rows, analyze, keyOf) {
  const out = new Map();
  for (const r of rows) {
    const q = keyOf(r);
    const ev = analyze(q);
    const v = evidenceView(ev, q);
    out.set(q, {
      id: r.oracleId || q,
      decision: ev.decision,
      reason: ev.reasonCode,
      relations: (ev.relations || []).map((x) => x.relation).join('+'),
      branchSignature: `${ev.decision}|${ev.reasonCode}|${(ev.relations || []).map((x) => x.relation).join('+')}`,
      v,
    });
  }
  return out;
}

/**
 * Shadow mode: compute what the override WOULD assign, without changing any output.
 */
export function shadow(baseline, ruleNames, expectedOf) {
  const matched = [];
  const eff = { TP_CORRECTED: [], FP_CORRECT_ROW_REGRESSION: [], FP_WRONG_TO_DIFFERENT_WRONG: [], UNCHANGED: [] };
  for (const [q, b] of baseline) {
    const hit = resolveGovernedReasonOverride(b.v, ruleNames);
    if (!hit) continue;
    const expected = expectedOf(q);
    matched.push({ id: b.id, query: q, rule: hit.rule, current: b.reason, predicted: hit.reason, expected });
    if (hit.reason === b.reason) { eff.UNCHANGED.push(b.id); continue; }
    if (b.reason === expected) eff.FP_CORRECT_ROW_REGRESSION.push({ id: b.id, query: q, from: b.reason, to: hit.reason });
    else if (hit.reason === expected) eff.TP_CORRECTED.push({ id: b.id, from: b.reason, to: hit.reason });
    else eff.FP_WRONG_TO_DIFFERENT_WRONG.push({ id: b.id, query: q, expected, from: b.reason, to: hit.reason });
  }
  const tp = eff.TP_CORRECTED.length, fpc = eff.FP_CORRECT_ROW_REGRESSION.length, fpw = eff.FP_WRONG_TO_DIFFERENT_WRONG.length;
  return {
    rules: ruleNames,
    conditionSupport: matched.length,
    shadowMatchedIds: matched.map((m) => m.id),
    matched,
    TP_CORRECTED: tp, FP_CORRECT_ROW_REGRESSION: fpc, FP_WRONG_TO_DIFFERENT_WRONG: fpw,
    UNCHANGED: eff.UNCHANGED.length,
    netMismatchDelta: tp - fpc,
    forecastAcceptable: fpc === 0 && fpw === 0 && tp > 0,
    correctRowRegressions: eff.FP_CORRECT_ROW_REGRESSION.slice(0, 8),
    wrongToWrong: eff.FP_WRONG_TO_DIFFERENT_WRONG.slice(0, 8),
  };
}

/**
 * Applied mode: after the override is live, prove BOTH required properties.
 *   1. target equivalence over the matched set M
 *   2. placement non-interference over the unmatched set U
 */
export function verifyPlacement(baseline, postBaseline, shadowResult) {
  const matchedIds = new Set(shadowResult.shadowMatchedIds);
  const byId = new Map();
  for (const [q, b] of baseline) byId.set(b.id, { q, b });

  // --- target equivalence -------------------------------------------------
  const runtimeEntered = [];
  const reasonMismatch = [];
  for (const m of shadowResult.matched) {
    const post = postBaseline.get(m.query);
    if (!post) continue;
    if (post.reason === m.predicted) runtimeEntered.push(m.id);
    else reasonMismatch.push({ id: m.id, query: m.query, predicted: m.predicted, actual: post.reason });
  }
  const missingFromRuntime = shadowResult.shadowMatchedIds.filter((x) => !runtimeEntered.includes(x));
  const unexpectedInRuntime = runtimeEntered.filter((x) => !matchedIds.has(x));

  // --- placement non-interference over U -----------------------------------
  const drift = { reason: [], decision: [], relations: [], branchSignature: [] };
  for (const [q, b] of baseline) {
    if (matchedIds.has(b.id)) continue;
    const post = postBaseline.get(q);
    if (!post) continue;
    if (post.reason !== b.reason) drift.reason.push({ id: b.id, query: q, from: b.reason, to: post.reason });
    if (post.decision !== b.decision) drift.decision.push({ id: b.id, from: b.decision, to: post.decision });
    if (post.relations !== b.relations) drift.relations.push({ id: b.id, from: b.relations, to: post.relations });
    if (post.branchSignature !== b.branchSignature) drift.branchSignature.push({ id: b.id, from: b.branchSignature, to: post.branchSignature });
  }

  return {
    targetEquivalence: {
      shadowMatchedCount: matchedIds.size,
      runtimeOverrideAssignedCount: runtimeEntered.length,
      missingFromRuntime: missingFromRuntime.length,
      unexpectedInRuntime: unexpectedInRuntime.length,
      reasonMismatch: reasonMismatch.slice(0, 8),
      pass: missingFromRuntime.length === 0 && unexpectedInRuntime.length === 0 && reasonMismatch.length === 0,
    },
    placementNonInterference: {
      unmatchedRowsChecked: baseline.size - matchedIds.size,
      unmatchedReasonDrift: drift.reason.length,
      unmatchedDecisionDrift: drift.decision.length,
      unmatchedRelationDrift: drift.relations.length,
      unmatchedBranchSignatureDrift: drift.branchSignature.length,
      driftSamples: {
        reason: drift.reason.slice(0, 8),
        decision: drift.decision.slice(0, 4),
        relations: drift.relations.slice(0, 4),
      },
      pass: drift.reason.length === 0 && drift.decision.length === 0
        && drift.relations.length === 0 && drift.branchSignature.length === 0,
    },
  };
}

// ─── entry point: capture baseline + shadow every candidate ──────────────────
if (process.argv[1] && process.argv[1].endsWith('commit5r1c20-placement.mjs')) {
  const rows = L.loadR3();
  const analyze = await L.loadAnalyzer();
  const expected = new Map(rows.map((r) => [r.query, r.expectedReasonCodeFamily]));
  const baseline = captureBaseline(rows, analyze, (r) => r.query);

  L.writeJson(L.RES + 'COMMIT_5R1C20_BASELINE_BRANCH_OCCUPANCY.json', {
    unit: 'COMMIT 5R1-C20', generatedUtc: new Date().toISOString(),
    method: 'Full observable output captured for every R3 row before any change: decision, reason, relation set and a stable branch signature. Unmatched-row drift is measured against this snapshot.',
    rowsCaptured: baseline.size,
    reasonDistribution: [...baseline.values()].reduce((a, b) => { a[b.reason] = (a[b.reason] || 0) + 1; return a; }, {}),
    correctRows: [...baseline.values()].filter((b) => b.reason === expected.get([...baseline.entries()].find(([, x]) => x === b)?.[0] || '')).length,
  });

  const shadows = Object.keys(RULES).map((n) => shadow(baseline, [n], (q) => expected.get(q)))
    .sort((a, b) => b.netMismatchDelta - a.netMismatchDelta);

  L.writeJson(L.RES + 'COMMIT_5R1C20_SHADOW_OVERRIDE_RESULTS.json', {
    unit: 'COMMIT 5R1-C20', generatedUtc: new Date().toISOString(),
    method: 'Shadow mode computes what each override WOULD assign without changing any output. The same pure predicate is later injected into the runtime seam.',
    shadows: shadows.map((s) => ({ ...s, matched: s.matched.slice(0, 6) })),
  });

  console.log('baseline rows captured =', baseline.size);
  console.log('\nshadow-mode candidate rules:');
  for (const s of shadows) {
    console.log(`  ${s.rules[0].padEnd(40)} sup=${String(s.conditionSupport).padStart(4)} TP=${String(s.TP_CORRECTED).padStart(3)} FPc=${String(s.FP_CORRECT_ROW_REGRESSION).padStart(3)} FPw=${String(s.FP_WRONG_TO_DIFFERENT_WRONG).padStart(3)} net=${String(s.netMismatchDelta).padStart(4)} ${s.forecastAcceptable ? 'ACCEPTABLE' : 'reject'}`);
    for (const r of s.correctRowRegressions.slice(0, 2)) console.log(`      regress: ${JSON.stringify(r.query).slice(0, 60)} ${r.from} -> ${r.to}`);
    for (const r of s.wrongToWrong.slice(0, 2)) console.log(`      w2w: exp=${r.expected} ${r.from} -> ${r.to}`);
  }
}
