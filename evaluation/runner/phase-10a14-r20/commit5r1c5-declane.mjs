// PHASE-10A14-R20 COMMIT 5R1-C5 — decision-lane scorer. Reports decision-level metrics
// AND decision-level closed-control status (tax_compliance_task, acronym_homograph_control),
// plus reason/relation effects separately (for later lanes; non-blocking in Lane A).
import { pathToFileURL } from 'node:url';
import { cpSync } from 'node:fs';
import { loadR3Rows } from './commit5r1c2-oracle-runner.mjs';
import { REPO } from './identity.mjs';

const LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;

export async function decLane(candidatePath) {
  if (candidatePath) cpSync(candidatePath, LIVE);
  const m = await import(pathToFileURL(LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const rows = loadR3Rows();
  const c = {
    total: rows.length, decisionPassed: 0, decisionFailed: 0,
    falseAllows: 0, falseRefusals: 0, clarifyMismatches: 0,
    decByDir: {}, decByCluster: {},
    overallPassed: 0, relationFailed: 0, reasonFailed: 0,
    closedControls: {}, decFails: [],
  };
  const controlCats = ['tax_compliance_task', 'acronym_homograph_control', 'negation_contradiction', 'internal_label_proper_name', 'ambiguous_clarification_control', 'mixed_domain_genuine_tax'];
  for (const cat of controlCats) c.closedControls[cat] = { total: 0, decisionCorrect: 0, overallPass: 0 };
  for (const r of rows) {
    const ev = m.analyzePhilippineTaxIntent(r.query);
    const rels = ev.relations.map((x) => x.relation);
    const expRels = (r.expectedRelations || []).map((x) => x.relation);
    const decOk = ev.decision === r.expectedDecision;
    const relOk = expRels.every((x) => rels.includes(x));
    const reaOk = ev.reasonCode === r.expectedReasonCodeFamily;
    if (decOk) c.decisionPassed++; else {
      c.decisionFailed++;
      const dir = `${r.expectedDecision}->${ev.decision}`; c.decByDir[dir] = (c.decByDir[dir] || 0) + 1;
      if (r.expectedDecision !== 'ALLOW' && ev.decision === 'ALLOW') c.falseAllows++;
      else if (r.expectedDecision === 'ALLOW' && ev.decision !== 'ALLOW') c.falseRefusals++;
      else c.clarifyMismatches++;
      c.decFails.push({ oracleId: r.oracleId, query: r.query, primaryCategory: r.primaryCategory, expectedDecision: r.expectedDecision, actualDecision: ev.decision, expectedRelations: expRels, actualRelations: rels });
    }
    if (!relOk) c.relationFailed++;
    if (!reaOk) c.reasonFailed++;
    if (decOk && relOk && reaOk) c.overallPassed++;
    if (c.closedControls[r.primaryCategory]) {
      const cc = c.closedControls[r.primaryCategory];
      cc.total++; if (decOk) cc.decisionCorrect++; if (decOk && relOk && reaOk) cc.overallPass++;
    }
  }
  return c;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = await decLane(process.argv[2]);
  console.log(JSON.stringify({
    decision: `${c.decisionPassed}/${c.total}`, decisionFailed: c.decisionFailed,
    falseAllows: c.falseAllows, falseRefusals: c.falseRefusals, clarifyMismatches: c.clarifyMismatches,
    decByDir: c.decByDir,
    overallPassed: c.overallPassed, relationFailed: c.relationFailed, reasonFailed: c.reasonFailed,
    closedControls_decision: Object.fromEntries(Object.entries(c.closedControls).map(([k, v]) => [k, `${v.decisionCorrect}/${v.total} (overall ${v.overallPass})`])),
  }, null, 2));
}
