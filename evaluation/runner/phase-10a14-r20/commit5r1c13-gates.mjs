// PHASE-10A14-R20 COMMIT 5R1-C13 — full gate battery for one candidate.
// Staged per the mandatory usage-efficient order: relation suite first, then R3,
// then the locked decision suite and guards.
import fs from 'node:fs';
import * as L from './commit5r1c13-lib.mjs';

export async function runGates({ stage = 'full', label = '' } = {}) {
  const rows = L.loadR3();
  const analyze = await L.loadAnalyzer();
  const out = { label, stage, runtimeIdentity: L.runtimeIdentity() };

  // stage 1 — relation-focused suite
  out.relationCounterfactual = L.runRelationCounterfactuals(analyze);
  if (stage === 'relation-only') return out;

  // stage 2 — full R3
  const r3 = L.scoreR3(rows, analyze);
  out.r3 = r3.counts;
  out.relationFailures = r3.relationFailures;
  out.decisionFailures = r3.decisionFailures;

  // stage 3 — locked decision suite, guards, controls, integrity
  out.decisionCounterfactual = L.runCounterfactuals(analyze);
  out.closedControls = L.closedControls(rows, analyze);
  out.richContextGuard = L.richContextGuard(analyze);
  out.reasonIntegrity = L.reasonIntegrity(rows, analyze);
  out.relationObjectIntegrity = L.relationObjectIntegrity(analyze, rows.slice(0, 400).map((r) => r.query));
  out.antiMemorization = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);

  out.decisionLockHeld = out.r3.decisionMismatches === 0
    && out.r3.materialFalseAllows === 0 && out.r3.materialFalseRefusals === 0
    && out.r3.clarifyMismatches === 0
    && out.decisionCounterfactual.passed === out.decisionCounterfactual.total
    && out.closedControls.allClosed && out.richContextGuard.allPass
    && out.antiMemorization.pass;
  return out;
}

export function summarize(g) {
  const l = [];
  l.push(`relation suite   = ${g.relationCounterfactual.passed} / ${g.relationCounterfactual.total}  (failed ${g.relationCounterfactual.failed})`);
  if (g.r3) {
    l.push(`R3 decision      = ${g.r3.decisionPassed} / 3720   FA=${g.r3.materialFalseAllows} FR=${g.r3.materialFalseRefusals} CL=${g.r3.clarifyMismatches}`);
    l.push(`R3 relation      = ${g.r3.relationPassed} / 3720   mismatches=${g.r3.relationMismatches}`);
    l.push(`R3 reason (diag) = ${g.r3.reasonMismatches} mismatches`);
    l.push(`decision suite   = ${g.decisionCounterfactual.passed} / ${g.decisionCounterfactual.total}`);
    l.push(`controls=${g.closedControls.allClosed} guard=${g.richContextGuard.passed}/${g.richContextGuard.total} antiMem=${g.antiMemorization.pass} reasonIntegrity=${g.reasonIntegrity.pass} relObjIntegrity=${g.relationObjectIntegrity.pass}`);
    l.push(`DECISION LOCK HELD = ${g.decisionLockHeld}`);
  }
  return l.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('commit5r1c13-gates.mjs')) {
  const g = await runGates({ label: process.argv[2] || 'adhoc' });
  console.log(summarize(g));
  if (process.argv[3]) L.writeJson(process.argv[3], g);
  if (g.relationCounterfactual.failed) {
    const byFam = g.relationCounterfactual.byFamily;
    console.log('\nrelation-suite failures by family:', JSON.stringify(byFam, null, 2));
    for (const f of g.relationCounterfactual.failures.slice(0, 12)) {
      console.log(`  [${f.family}] ${JSON.stringify(f.query)}\n    missing=${JSON.stringify(f.missing)} forbidden=${JSON.stringify(f.forbidden)} actual=${JSON.stringify(f.actualRelations)} dec=${f.actualDecision}/${f.expectedDecision}`);
    }
  }
}
