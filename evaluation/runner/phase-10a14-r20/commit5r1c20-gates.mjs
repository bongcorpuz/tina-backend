// PHASE-10A14-R20 COMMIT 5R1-C15 — staged gate battery (§10 usage-efficient order).
// 1 reason suite -> 2 integrity gates -> 3 full R3 -> 4 locked decision/relation/clause.
import * as L from './commit5r1c20-lib.mjs';

export async function runGates({ stage = 'full', label = '' } = {}) {
  const analyze = await L.loadAnalyzer();
  const out = { label, stage, runtimeIdentity: L.runtimeIdentity() };
  const rows = L.loadR3();

  // stage 1 — collision probes
  out.collisionProbes = L.runCollisionProbes(analyze);
  if (stage === 'collision') return out;

  // stage 2 — reason-focused suite
  out.reasonCounterfactual = L.runReasonCounterfactuals(analyze);
  if (stage === 'reason') return out;

  // stage 2 — decision/reason compatibility and reason integrity
  out.reasonIntegrity = L.reasonIntegrity(rows, analyze);
  if (stage === 'integrity') return out;

  // stage 3 — full R3
  const r3 = L.scoreR3(rows, analyze);
  out.r3 = r3.counts;
  out.reasonPassed = 3720 - r3.counts.reasonMismatches;
  out.focusedReasonRegression = L.focusedReasonRegression(rows, analyze);
  out.decisionFailures = r3.decisionFailures;
  out.relationFailures = r3.relationFailures;
  if (stage === 'r3') return out;

  // stage 4 — the locked gates
  out.decisionCounterfactual = L.runCounterfactuals(analyze);
  out.relationCounterfactual = L.runRelationCounterfactuals(analyze);
  out.clauseProbes = L.runClauseProbes(analyze);
  out.closedControls = L.closedControls(rows, analyze);
  out.richContextGuard = L.richContextGuard(analyze);
  out.relationObjectIntegrity = L.relationObjectIntegrity(analyze, rows.slice(0, 400).map((r) => r.query));
  out.clauseSchemaRegression = L.clauseSchemaRegression(analyze, rows.slice(0, 400).map((r) => r.query));
  out.antiMemorization = L.antiMemorization('services/philippine-tax-intent-analyzer.js', rows);

  out.decisionLockHeld = out.r3.decisionMismatches === 0
    && out.r3.materialFalseAllows === 0 && out.r3.materialFalseRefusals === 0 && out.r3.clarifyMismatches === 0
    && out.decisionCounterfactual.passed === out.decisionCounterfactual.total
    && out.closedControls.allClosed && out.richContextGuard.allPass && out.antiMemorization.pass;
  out.relationLockHeld = out.r3.relationMismatches === 0
    && out.relationCounterfactual.failed === 0 && out.clauseProbes.failed === 0;
  return out;
}

export function summarize(g) {
  const l = [];
  if (g.collisionProbes) l.push(`collision probes = ${g.collisionProbes.passed} / ${g.collisionProbes.total}  (failed ${g.collisionProbes.failed})`);
  if (g.reasonCounterfactual) l.push(`reason suite     = ${g.reasonCounterfactual.passed} / ${g.reasonCounterfactual.total}  (failed ${g.reasonCounterfactual.failed})`);
  if (g.reasonIntegrity) l.push(`reason integrity = ${g.reasonIntegrity.pass}  (invalid ${g.reasonIntegrity.invalidCodeCount}, incompatible ${g.reasonIntegrity.incompatibleCount})`);
  if (g.r3) {
    l.push(`R3 reason        = ${g.reasonPassed} / 3720   mismatches=${g.r3.reasonMismatches}`);
    l.push(`R3 decision      = ${g.r3.decisionPassed} / 3720   FA=${g.r3.materialFalseAllows} FR=${g.r3.materialFalseRefusals} CL=${g.r3.clarifyMismatches}`);
    l.push(`R3 relation      = ${g.r3.relationPassed} / 3720   mismatches=${g.r3.relationMismatches}`);
    l.push(`canonical overall= ${g.r3.canonicalPassed} / 3720`);
    l.push(`focused reason   = ${g.focusedReasonRegression.allBucketsPass}`);
  }
  if (g.decisionCounterfactual) {
    l.push(`decision suite   = ${g.decisionCounterfactual.passed} / ${g.decisionCounterfactual.total}`);
    l.push(`relation suite   = ${g.relationCounterfactual.passed} / ${g.relationCounterfactual.total}`);
    l.push(`clause probes    = ${g.clauseProbes.passed} / ${g.clauseProbes.total}`);
    l.push(`controls=${g.closedControls.allClosed} guard=${g.richContextGuard.passed}/${g.richContextGuard.total} antiMem=${g.antiMemorization.pass}`);
    l.push(`DECISION LOCK = ${g.decisionLockHeld}   RELATION LOCK = ${g.relationLockHeld}`);
  }
  return l.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('commit5r1c20-gates.mjs')) {
  const g = await runGates({ stage: process.argv[2] || 'full', label: process.argv[3] || 'adhoc' });
  console.log(summarize(g));
  if (process.argv[4]) L.writeJson(process.argv[4], g);
  if (g.collisionProbes && g.collisionProbes.failed) {
    console.log('\ncollision-probe failures by family:', JSON.stringify(g.collisionProbes.byFamily, null, 2));
    for (const f of g.collisionProbes.failures.slice(0, 8)) {
      console.log(`  [${f.family}] ${JSON.stringify(f.query)}\n    reason ${f.actualReason} != ${f.expectedReason}  dec ${f.actualDecision}/${f.expectedDecision}`);
    }
  }
  if (g.reasonCounterfactual && g.reasonCounterfactual.failed) {
    console.log('\nreason-suite failures by family:', JSON.stringify(g.reasonCounterfactual.byFamily, null, 2));
    for (const f of g.reasonCounterfactual.failures.slice(0, 10)) {
      console.log(`  [${f.family}] ${JSON.stringify(f.query)}\n    reason ${f.actualReason} != ${f.expectedReason}  dec ${f.actualDecision}/${f.expectedDecision}  rels=${JSON.stringify(f.actualRelations)}`);
    }
  }
}
