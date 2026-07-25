// PHASE-10A14-R20 COMMIT 5R1-C4 — layer-lane scorer. Derives decision / relation /
// reason lane scores from the SAME frozen R3 rows and the SAME governed classify
// output. No new oracle, no expectation change.
import { pathToFileURL } from 'node:url';
import { cpSync } from 'node:fs';
import { loadR3Rows } from './commit5r1c2-oracle-runner.mjs';
import { REPO } from './identity.mjs';

const ANALYZER_LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;

export async function laneScore(candidatePath) {
  if (candidatePath) cpSync(candidatePath, ANALYZER_LIVE);
  const m = await import(pathToFileURL(ANALYZER_LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const rows = loadR3Rows();
  const c = {
    total: rows.length,
    decisionPassed: 0, decisionFailed: 0,
    relationPassed: 0, relationFailed: 0,
    reasonPassed: 0, reasonFailed: 0,
    overallPassed: 0, overallFailed: 0,
    falseAllows: 0, falseRefusals: 0, clarifyMismatches: 0,
    decByDir: {}, decFails: [], relFails: [], reasonFails: [],
  };
  for (const r of rows) {
    const ev = m.analyzePhilippineTaxIntent(r.query);
    const decision = ev.decision, reasonFamily = ev.reasonCode;
    const rels = ev.relations.map((x) => x.relation);
    const expectedRels = (r.expectedRelations || []).map((x) => x.relation);
    const decisionPass = decision === r.expectedDecision;
    const relationPass = expectedRels.every((rt) => rels.includes(rt));
    const reasonPass = reasonFamily === r.expectedReasonCodeFamily;
    if (decisionPass) c.decisionPassed++; else {
      c.decisionFailed++;
      const dir = `${r.expectedDecision}->${decision}`; c.decByDir[dir] = (c.decByDir[dir] || 0) + 1;
      if (r.expectedDecision !== 'ALLOW' && decision === 'ALLOW') c.falseAllows++;
      else if (r.expectedDecision === 'ALLOW' && decision !== 'ALLOW') c.falseRefusals++;
      else c.clarifyMismatches++;
      c.decFails.push({ oracleId: r.oracleId, query: r.query, primaryCategory: r.primaryCategory, expectedDecision: r.expectedDecision, actualDecision: decision, expectedRelations: expectedRels, actualRelations: rels });
    }
    // Relation lane counted on decision-correct rows (relation defect independent of decision).
    if (relationPass) c.relationPassed++; else { c.relationFailed++; if (decisionPass) c.relFails.push({ oracleId: r.oracleId, query: r.query, primaryCategory: r.primaryCategory, expectedRelations: expectedRels, actualRelations: rels }); }
    if (reasonPass) c.reasonPassed++; else { c.reasonFailed++; if (decisionPass && relationPass) c.reasonFails.push({ oracleId: r.oracleId, query: r.query, primaryCategory: r.primaryCategory, expectedReason: r.expectedReasonCodeFamily, actualReason: reasonFamily }); }
    if (decisionPass && relationPass && reasonPass) c.overallPassed++; else c.overallFailed++;
  }
  return c;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = await laneScore(process.argv[2]);
  console.log(JSON.stringify({
    overall: `${c.overallPassed}/${c.total}`,
    decision: `${c.decisionPassed}/${c.total}`, decisionFailed: c.decisionFailed,
    relationFailed: c.relationFailed, reasonFailed: c.reasonFailed,
    falseAllows: c.falseAllows, falseRefusals: c.falseRefusals, clarifyMismatches: c.clarifyMismatches,
    decByDir: c.decByDir,
  }, null, 2));
}
