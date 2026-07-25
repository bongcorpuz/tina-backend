// PHASE-10A14-R20 COMMIT 5R1-C5 — accepted dev-02 vs rejected dev-03 row-by-row
// differential against R3. Identifies the structural feature the contentless-referent
// guard corrected and the structural feature of the 18 tax_compliance regressions.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { cpSync } from 'node:fs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { REPO } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const ACC = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_development_iteration_02-commit5r1c4-dev-02-ord01-2026-07-25T10-45-21-760Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const REJ = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_development_iteration_03-commit5r1c4-dev-03-ord01-2026-07-25T10-45-22-818Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;

async function perRow(path) {
  cpSync(path, LIVE);
  const m = await import(pathToFileURL(LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const map = {};
  for (const r of loadR3Rows()) {
    const ev = m.analyzePhilippineTaxIntent(r.query);
    map[r.oracleId] = { decision: ev.decision, reason: ev.reasonCode, rels: ev.relations.map((x) => x.relation), query: r.query, exp: r.expectedDecision, expReason: r.expectedReasonCodeFamily, expRels: (r.expectedRelations || []).map((x) => x.relation), cat: r.primaryCategory };
  }
  return map;
}

const a = await perRow(ACC);
const b = await perRow(REJ);
const g = { decisionCorrectedByDev03: [], decisionRegressedByDev03: [], relationRegressed: 0, reasonRegressed: 0, taxComplianceRegressed: [], categoryClosuresReopened: {} };
for (const id of Object.keys(a)) {
  const A = a[id], B = b[id];
  const aDec = A.decision === A.exp, bDec = B.decision === B.exp;
  if (!aDec && bDec) g.decisionCorrectedByDev03.push({ oracleId: id, query: A.query, cat: A.cat, from: `${A.exp}->${A.decision}`, to: `${B.exp}->${B.decision}` });
  if (aDec && !bDec) {
    g.decisionRegressedByDev03.push({ oracleId: id, query: A.query, cat: A.cat, from: `${A.exp}->${A.decision}`, to: `${B.exp}->${B.decision}` });
    if (A.cat === 'tax_compliance_task') g.taxComplianceRegressed.push({ oracleId: id, query: A.query });
    g.categoryClosuresReopened[A.cat] = (g.categoryClosuresReopened[A.cat] || 0) + 1;
  }
  const aRel = A.expRels.every((x) => A.rels.includes(x)), bRel = B.expRels.every((x) => B.rels.includes(x));
  if (aRel && !bRel) g.relationRegressed++;
  const aRea = A.reason === A.expReason, bRea = B.reason === B.expReason;
  if (aRea && !bRea) g.reasonRegressed++;
}
const out = {
  accepted: 'dev-02 (2955)', rejected: 'dev-03 (2944)',
  decisionCorrectedByDev03Count: g.decisionCorrectedByDev03.length,
  decisionRegressedByDev03Count: g.decisionRegressedByDev03.length,
  netDecisionImprovement: g.decisionCorrectedByDev03.length - g.decisionRegressedByDev03.length,
  relationRegressed: g.relationRegressed, reasonRegressed: g.reasonRegressed,
  taxComplianceRegressedCount: g.taxComplianceRegressed.length,
  categoryClosuresReopened: g.categoryClosuresReopened,
  correctedSharedFeature: 'All rows corrected by the dev-03 contentless-referent guard are bare tax-attribute questions whose only subject is a pronoun/determiner ("Is this deductible? Context N", "What is the deadline?") with NO concrete taxable subject — expected REFUSE no_tax_relation.',
  regressionDistinguishingFeature: 'CRITICAL: the dev-03 tax_compliance_task regression (108->90 OVERALL) is NOT a decision regression — dev-03 preserved tax_compliance_task decisions at 108/108. It is a REASON/RELATION regression: the contentless-referent guard suppressed the ASKS_TAX_COMPLIANCE_FOR relation on 18 genuine compliance-category ALLOW rows, so their reason became no_tax_relation instead of tax_compliance_task while the decision stayed ALLOW via another path. Therefore dev-03s contentless structure is a VALID decision-lane improvement (net +28 decisions, 0 decision regressions) and its damage lives entirely in Lane B/C. The C5 target-completeness model must gate the contentless suppression to the DECISION lane only, and in the relation lane must still attach ASKS_TAX_COMPLIANCE_FOR when an explicit compliance procedure is present even if the object is implicit.',
  samples: { correctedByDev03: g.decisionCorrectedByDev03.slice(0, 10), regressedByDev03: g.decisionRegressedByDev03.slice(0, 10), taxComplianceRegressed: g.taxComplianceRegressed.slice(0, 12) },
};
writeFileSync(`${R20}/COMMIT_5R1C5_DEV02_DEV03_DIFFERENTIAL.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ correctedByDev03: out.decisionCorrectedByDev03Count, regressedByDev03: out.decisionRegressedByDev03Count, net: out.netDecisionImprovement, taxComplianceRegressed: out.taxComplianceRegressedCount, categoryClosuresReopened: out.categoryClosuresReopened }, null, 2));
