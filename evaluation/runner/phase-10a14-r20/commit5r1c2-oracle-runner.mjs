// PHASE-10A14-R20 COMMIT 5R1-C2 — R3 frozen-oracle scoring runner.
// Scores a runtime against the frozen 3,720-row R3 development oracle on the
// canonical lane: decision + reason-family + expected-relations. Reads expectations
// from R3; does not decide them.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REPO } from './identity.mjs';

const R3 = `${REPO}/evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json`;

export function loadR3Rows() { return JSON.parse(readFileSync(R3, 'utf8')).rows; }

export async function loadRuntime(mode, analyzerPath) {
  const bust = `?v=${Date.now()}-${Math.random()}`;
  const aPath = analyzerPath || `${REPO}/services/philippine-tax-intent-analyzer.js`;
  if (mode === 'standalone') {
    const m = await import(pathToFileURL(aPath).href + bust);
    return { classify: (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; } };
  }
  const m = await import(pathToFileURL(`${REPO}/services/philippine-tax-domain-boundary.js`).href + bust);
  return { classify: (q) => {
    const out = m.detectPhilippineTaxBoundary(q, '/ask', { includeEvidence: true });
    const canon = out.decision === 'REJECT' ? 'REFUSE' : out.decision;
    const relations = (out.evidence?.relations || out.relations || []).map((r) => r.relation || r);
    return { decision: canon, reasonFamily: out.reason, relations, rawPublicDecision: out.decision };
  } };
}

export function scoreRows(rows, classify) {
  const results = [];
  const counts = { total: rows.length, canonicalPassed: 0, decisionMismatches: 0, reasonMismatches: 0, relationMismatches: 0, materialFalseAllows: 0, materialFalseRefusals: 0, clarifyMismatches: 0, bySourceSet: {}, byCategory: {} };
  const mmGroupFail = {};
  for (const r of rows) {
    const out = classify(r.query);
    const decisionPass = out.decision === r.expectedDecision;
    const reasonPass = out.reasonFamily === r.expectedReasonCodeFamily;
    const expectedRels = (r.expectedRelations || []).map((x) => x.relation);
    const relationPass = expectedRels.every((rt) => out.relations.includes(rt));
    const pass = decisionPass && reasonPass && relationPass;
    if (pass) counts.canonicalPassed++;
    if (!decisionPass) counts.decisionMismatches++;
    if (!reasonPass) counts.reasonMismatches++;
    if (!relationPass) counts.relationMismatches++;
    if (!decisionPass) {
      if (r.expectedDecision !== 'ALLOW' && out.decision === 'ALLOW') counts.materialFalseAllows++;
      else if (r.expectedDecision === 'ALLOW' && out.decision !== 'ALLOW') counts.materialFalseRefusals++;
      else counts.clarifyMismatches++;
    }
    counts.bySourceSet[r.sourceSet] ??= { total: 0, passed: 0 };
    counts.bySourceSet[r.sourceSet].total++; if (pass) counts.bySourceSet[r.sourceSet].passed++;
    counts.byCategory[r.primaryCategory] ??= { total: 0, passed: 0 };
    counts.byCategory[r.primaryCategory].total++; if (pass) counts.byCategory[r.primaryCategory].passed++;
    if (r.metamorphicGroup) { mmGroupFail[r.metamorphicGroup] ??= false; if (!pass) mmGroupFail[r.metamorphicGroup] = true; }
    if (!pass) results.push({ oracleId: r.oracleId, query: r.query, sourceSet: r.sourceSet, primaryCategory: r.primaryCategory, expectedDecision: r.expectedDecision, actualDecision: out.decision, expectedReasonCodeFamily: r.expectedReasonCodeFamily, actualReasonFamily: out.reasonFamily, expectedRelations: expectedRels, actualRelations: out.relations, decisionPass, reasonPass, relationPass });
  }
  const mmGroups = Object.keys(mmGroupFail);
  counts.metamorphicGroupsTotal = mmGroups.length;
  counts.metamorphicGroupsFailed = mmGroups.filter((g) => mmGroupFail[g]).length;
  counts.metamorphicGroupsPassed = counts.metamorphicGroupsTotal - counts.metamorphicGroupsFailed;
  return { counts, failures: results };
}
