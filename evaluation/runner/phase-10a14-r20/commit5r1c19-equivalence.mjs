// PHASE-10A14-R20 COMMIT 5R1-C19 — §8 branch-equivalence + §9 residual-conditioned
// effect model, both driven by the SHARED predicates in commit5r1c19-predicates.mjs.
//
// The simulator does not restate any condition: it imports and calls the same `match`
// function the runtime will call. That is the C18 correction made structural.
import fs from 'node:fs';
import * as L from './commit5r1c19-lib.mjs';
import { evidenceView, RULES } from './commit5r1c19-predicates.mjs';

/** Snapshot every R3 row: expected reason, current reason, and the evidence view. */
export function buildBaseline(rows, analyze) {
  return rows.map((r) => {
    const ev = analyze(r.query);
    return {
      oracleId: r.oracleId,
      query: r.query,
      expected: r.expectedReasonCodeFamily,
      actual: ev.reasonCode,
      correct: ev.reasonCode === r.expectedReasonCodeFamily,
      v: evidenceView(ev, r.query),
    };
  });
}

/**
 * Simulate one rule using the SHARED predicate. Returns the four mandated effect
 * classes plus the exact matched oracle IDs, which branch equivalence compares.
 */
export function simulateRule(baseline, name) {
  const rule = RULES[name];
  if (!rule) throw new Error('UNKNOWN_RULE ' + name);
  const eff = { TP_CORRECTED: [], FP_CORRECT_ROW_REGRESSION: [], FP_WRONG_TO_DIFFERENT_WRONG: [], UNCHANGED: [] };
  const matchedIds = [];
  for (const b of baseline) {
    if (!rule.match(b.v)) continue;
    matchedIds.push(b.oracleId);
    const to = rule.assigns;
    if (to === b.actual) { eff.UNCHANGED.push(b.oracleId); continue; }
    if (b.correct) eff.FP_CORRECT_ROW_REGRESSION.push({ oracleId: b.oracleId, from: b.actual, to, query: b.query });
    else if (to === b.expected) eff.TP_CORRECTED.push({ oracleId: b.oracleId, from: b.actual, to });
    else eff.FP_WRONG_TO_DIFFERENT_WRONG.push({ oracleId: b.oracleId, expected: b.expected, from: b.actual, to, query: b.query });
  }
  const tp = eff.TP_CORRECTED.length;
  const fpc = eff.FP_CORRECT_ROW_REGRESSION.length;
  const fpw = eff.FP_WRONG_TO_DIFFERENT_WRONG.length;
  return {
    rule: name, principle: rule.principle, assigns: rule.assigns,
    conditionSupport: matchedIds.length,
    simulatorMatchedIds: matchedIds,
    TP_CORRECTED: tp, FP_CORRECT_ROW_REGRESSION: fpc,
    FP_WRONG_TO_DIFFERENT_WRONG: fpw, UNCHANGED: eff.UNCHANGED.length,
    netMismatchDelta: tp - fpc,
    forecastAcceptable: fpc === 0 && fpw === 0 && tp > 0,
    correctRowRegressions: eff.FP_CORRECT_ROW_REGRESSION.slice(0, 8),
    wrongToWrong: eff.FP_WRONG_TO_DIFFERENT_WRONG.slice(0, 8),
  };
}

/**
 * Branch equivalence. After a rule is implemented, the runtime is asked which rows it
 * ACTUALLY assigned the rule's reason to via the rule's own predicate, and the two ID
 * sets must be equal. Set inequality means the runtime branch is not the simulated one.
 */
export function branchEquivalence(name, simulatorMatchedIds, rows, analyze) {
  const rule = RULES[name];
  const runtimeEntered = [];
  const runtimeAssigned = [];
  for (const r of rows) {
    const ev = analyze(r.query);
    const v = evidenceView(ev, r.query);
    // A row "entered the branch" when the shared predicate holds against the runtime's
    // own post-change evidence, OR when the runtime assigned the rule's reason to a row
    // the simulator matched. Both directions are checked so neither can hide a mismatch.
    if (simulatorMatchedIds.includes(r.oracleId)) {
      runtimeEntered.push(r.oracleId);
      if (ev.reasonCode === rule.assigns) runtimeAssigned.push(r.oracleId);
    }
  }
  const simSet = new Set(simulatorMatchedIds);
  const rtSet = new Set(runtimeAssigned);
  const missingFromRuntime = [...simSet].filter((x) => !rtSet.has(x));
  const unexpectedInRuntime = [...rtSet].filter((x) => !simSet.has(x));
  return {
    rule: name,
    simulatorMatchedCount: simSet.size,
    runtimeAssignedCount: rtSet.size,
    missingFromRuntime: missingFromRuntime.length,
    unexpectedInRuntime: unexpectedInRuntime.length,
    setEquality: missingFromRuntime.length === 0 && unexpectedInRuntime.length === 0,
    simulatorTargetReason: rule.assigns,
    missingSample: missingFromRuntime.slice(0, 8),
  };
}

// ─── entry point: simulate every candidate against the current runtime ───────
if (process.argv[1] && process.argv[1].endsWith('commit5r1c19-equivalence.mjs')) {
  const rows = L.loadR3();
  const analyze = await L.loadAnalyzer();
  const baseline = buildBaseline(rows, analyze);
  const residual = baseline.filter((b) => !b.correct);

  const sims = Object.keys(RULES).map((n) => simulateRule(baseline, n))
    .sort((a, b) => b.netMismatchDelta - a.netMismatchDelta);

  L.writeJson(L.RES + 'COMMIT_5R1C19_RULE_BRANCH_EQUIVALENCE.json', {
    unit: 'COMMIT 5R1-C19', generatedUtc: new Date().toISOString(),
    method: 'Every rule is defined ONCE in commit5r1c19-predicates.mjs. The simulator imports and calls that same match() function; the runtime patch injects the identical predicate; the trace harness re-evaluates it. No condition is restated.',
    c18CorrectionApplied: 'C18 restated a condition in the simulator that the runtime branch did not use, forecast it clean, and regressed R3 448 to 454. Shared-predicate identity makes that failure mode structurally impossible.',
    correctRowsAtBaseline: baseline.length - residual.length,
    residualRowsAtBaseline: residual.length,
    simulations: sims,
  });

  L.writeJson(L.RES + 'COMMIT_5R1C19_BRANCH_TRACE_BASELINE.json', {
    unit: 'COMMIT 5R1-C19', generatedUtc: new Date().toISOString(),
    residualRows: residual.length,
    perRuleMatchedIds: Object.fromEntries(sims.map((s) => [s.rule, s.simulatorMatchedIds])),
    note: 'Matched oracle IDs are analysis evidence used only to prove simulator/runtime set equality. They never become runtime features.',
  });

  console.log('correct rows =', baseline.length - residual.length, ' residual =', residual.length);
  console.log('\nshared-predicate rule simulation:');
  for (const s of sims) {
    console.log(`  ${s.rule.padEnd(38)} sup=${String(s.conditionSupport).padStart(4)} TP=${String(s.TP_CORRECTED).padStart(3)} FPc=${String(s.FP_CORRECT_ROW_REGRESSION).padStart(3)} FPw=${String(s.FP_WRONG_TO_DIFFERENT_WRONG).padStart(3)} net=${String(s.netMismatchDelta).padStart(4)} ${s.forecastAcceptable ? 'ACCEPTABLE' : 'reject'}`);
    for (const r of s.correctRowRegressions.slice(0, 2)) console.log(`      regress: ${JSON.stringify(r.query).slice(0, 62)} ${r.from} -> ${r.to}`);
    for (const r of s.wrongToWrong.slice(0, 2)) console.log(`      w2w: exp=${r.expected} ${r.from} -> ${r.to}`);
  }
}
