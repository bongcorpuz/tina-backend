// PHASE-10A14-R20 COMMIT 5R1-C14 — staged gate battery (§9 usage-efficient order).
// 1 the 8 controlling failures -> 2 clause probes -> 3 all 282 relation queries
// -> 4 clause-schema + focused relation regression -> 5 full R3 -> 6 756 decision + rest.
import fs from 'node:fs';
import * as L from './commit5r1c14-lib.mjs';

/** The eight controlling primary_vs_subordinate queries, read from the frozen suite. */
export function openEight() {
  const s = JSON.parse(fs.readFileSync(L.RELATION_SUITE, 'utf8'));
  return s.queries.filter((q) => q.family === 'primary_vs_subordinate' && q.controlling !== false
    && (q.expectedRelations || []).includes('REQUESTS_NON_TAX_ACTION_ON'));
}

export async function runGates({ stage = 'full', label = '' } = {}) {
  const analyze = await L.loadAnalyzer();
  const out = { label, stage, runtimeIdentity: L.runtimeIdentity() };

  // stage 1 — the eight controlling failures
  const eight = openEight();
  const eightRes = eight.map((q) => {
    const ev = analyze(q.query);
    const rels = (ev.relations || []).map((x) => x.relation);
    const missing = (q.expectedRelations || []).filter((r) => !rels.includes(r));
    const decOk = !q.expectedDecision || ev.decision === q.expectedDecision;
    return { query: q.query, expectedDecision: q.expectedDecision, actualDecision: ev.decision, missing, actualRelations: rels, pass: !missing.length && decOk };
  });
  out.openEight = { total: eightRes.length, passed: eightRes.filter((r) => r.pass).length, results: eightRes };
  if (stage === 'eight') return out;

  // stage 2 — clause probes
  out.clauseProbes = L.runClauseProbes(analyze);
  if (stage === 'probes') return out;

  // stage 3 — full controlling relation suite (282)
  out.relationCounterfactual = L.runRelationCounterfactuals(analyze);
  if (stage === 'relation') return out;

  // stage 4 — clause-schema and focused relation regression
  const rows = L.loadR3();
  out.clauseSchemaRegression = L.clauseSchemaRegression(analyze, rows.slice(0, 400).map((r) => r.query));
  const perType = {};
  for (const r of rows) {
    const e = (r.expectedRelations || []).map((x) => x.relation);
    if (!e.length) continue;
    const a = (analyze(r.query).relations || []).map((x) => x.relation);
    for (const t of e) { perType[t] ??= { required: 0, satisfied: 0 }; perType[t].required++; if (a.includes(t)) perType[t].satisfied++; }
  }
  out.focusedRelationRegression = { perType, allBucketsPass: Object.values(perType).every((v) => v.required === v.satisfied) };
  if (stage === 'regression') return out;

  // stage 5 — full R3
  const r3 = L.scoreR3(rows, analyze);
  out.r3 = r3.counts;
  out.relationFailures = r3.relationFailures;
  out.decisionFailures = r3.decisionFailures;
  if (stage === 'r3') return out;

  // stage 6 — decision suite, controls, guards, integrity
  out.decisionCounterfactual = L.runCounterfactuals(analyze);
  out.closedControls = L.closedControls(rows, analyze);
  out.richContextGuard = L.richContextGuard(analyze);
  out.reasonIntegrity = L.reasonIntegrity(rows, analyze);
  out.relationObjectIntegrity = L.relationObjectIntegrity(analyze, rows.slice(0, 400).map((r) => r.query));
  out.antiMemorization = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);

  out.decisionLockHeld = out.r3.decisionMismatches === 0
    && out.r3.materialFalseAllows === 0 && out.r3.materialFalseRefusals === 0 && out.r3.clarifyMismatches === 0
    && out.decisionCounterfactual.passed === out.decisionCounterfactual.total
    && out.closedControls.allClosed && out.richContextGuard.allPass && out.antiMemorization.pass;
  out.r3RelationHeld = out.r3.relationMismatches === 0;
  return out;
}

export function summarize(g) {
  const l = [];
  if (g.openEight) l.push(`open eight       = ${g.openEight.passed} / ${g.openEight.total}`);
  if (g.clauseProbes) l.push(`clause probes    = ${g.clauseProbes.passed} / ${g.clauseProbes.total}  (failed ${g.clauseProbes.failed})`);
  if (g.relationCounterfactual) l.push(`relation suite   = ${g.relationCounterfactual.passed} / ${g.relationCounterfactual.total}  (failed ${g.relationCounterfactual.failed})`);
  if (g.clauseSchemaRegression) l.push(`clause schema    = ${g.clauseSchemaRegression.pass}  ${JSON.stringify(g.clauseSchemaRegression.counts)}`);
  if (g.focusedRelationRegression) l.push(`focused relation = ${g.focusedRelationRegression.allBucketsPass}`);
  if (g.r3) {
    l.push(`R3 decision      = ${g.r3.decisionPassed} / 3720   FA=${g.r3.materialFalseAllows} FR=${g.r3.materialFalseRefusals} CL=${g.r3.clarifyMismatches}`);
    l.push(`R3 relation      = ${g.r3.relationPassed} / 3720   mismatches=${g.r3.relationMismatches}`);
    l.push(`R3 reason (diag) = ${g.r3.reasonMismatches}`);
  }
  if (g.decisionCounterfactual) {
    l.push(`decision suite   = ${g.decisionCounterfactual.passed} / ${g.decisionCounterfactual.total}`);
    l.push(`controls=${g.closedControls.allClosed} guard=${g.richContextGuard.passed}/${g.richContextGuard.total} antiMem=${g.antiMemorization.pass} reasonInt=${g.reasonIntegrity.pass}`);
    l.push(`DECISION LOCK HELD = ${g.decisionLockHeld}   R3 RELATION HELD = ${g.r3RelationHeld}`);
  }
  return l.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('commit5r1c14-gates.mjs')) {
  const g = await runGates({ stage: process.argv[2] || 'full', label: process.argv[3] || 'adhoc' });
  console.log(summarize(g));
  if (process.argv[4]) L.writeJson(process.argv[4], g);
  if (g.openEight && g.openEight.passed < g.openEight.total) {
    console.log('\nopen-eight detail:');
    for (const r of g.openEight.results.filter((x) => !x.pass).slice(0, 3)) {
      console.log(`  ${JSON.stringify(r.query)}\n    dec ${r.actualDecision}/${r.expectedDecision} missing=${JSON.stringify(r.missing)} actual=${JSON.stringify(r.actualRelations)}`);
    }
  }
  if (g.clauseProbes && g.clauseProbes.failed) {
    console.log('\nclause-probe failures by family:', JSON.stringify(g.clauseProbes.byFamily));
    for (const f of g.clauseProbes.failures.slice(0, 10)) {
      console.log(`  [${f.family}] ${JSON.stringify(f.query)}\n    ${f.problems.join(' | ')}\n    clauses=${JSON.stringify(f.clauses.map((c) => c.role + ':' + c.text))}`);
    }
  }
}
