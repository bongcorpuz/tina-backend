// PHASE-10A14-R20 COMMIT 5 — frozen-oracle scoring runner.
//
// Scores a runtime (standalone analyzer OR integrated production boundary)
// against the frozen 3,720-row development oracle on the canonical R20 lane:
//   decisionPass  = canonical(actualDecision) === expectedDecision
//   reasonPass    = actualReasonFamily === expectedReasonCodeFamily
//   relationPass  = every expectedRelation type present in analyzer relations
// The runner does NOT decide expectations; it reads them from the frozen oracle.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REPO } from './identity.mjs';

const FROZEN = `${REPO}/evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json`;

export function loadFrozenRows() {
  return JSON.parse(readFileSync(FROZEN, 'utf8')).rows;
}

// mode: 'standalone' -> analyzePhilippineTaxIntent ; 'integrated' -> detectPhilippineTaxBoundary
export async function loadRuntime(mode) {
  if (mode === 'standalone') {
    const m = await import(pathToFileURL(`${REPO}/services/philippine-tax-intent-analyzer.js`).href + `?v=${Date.now()}`);
    return { classify: (q) => {
      const ev = m.analyzePhilippineTaxIntent(q);
      return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) };
    } };
  }
  // integrated: map public REJECT back to canonical REFUSE for scoring.
  const m = await import(pathToFileURL(`${REPO}/services/philippine-tax-domain-boundary.js`).href + `?v=${Date.now()}`);
  return { classify: (q) => {
    const out = m.detectPhilippineTaxBoundary(q, '/ask', {});
    const canon = out.decision === 'REJECT' ? 'REFUSE' : out.decision;
    return { decision: canon, reasonFamily: out.reason, relations: (out.relations || []).map((r) => r.relation || r), rawPublicDecision: out.decision };
  } };
}

export function scoreRows(rows, classify) {
  const results = [];
  const counts = {
    total: rows.length, canonicalPassed: 0,
    decisionMismatches: 0, reasonMismatches: 0, relationMismatches: 0,
    bySourceSet: {}, byCategory: {},
    materialFalseAllows: 0, materialFalseRefusals: 0, clarifyMismatches: 0,
  };
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

    if (!pass) {
      results.push({
        oracleId: r.oracleId, query: r.query, sourceSet: r.sourceSet, primaryCategory: r.primaryCategory,
        expectedDecision: r.expectedDecision, actualDecision: out.decision,
        expectedReasonCodeFamily: r.expectedReasonCodeFamily, actualReasonFamily: out.reasonFamily,
        expectedRelations: expectedRels, actualRelations: out.relations,
        decisionPass, reasonPass, relationPass,
      });
    }
  }
  const mmGroups = Object.keys(mmGroupFail);
  counts.metamorphicGroupsTotal = mmGroups.length;
  counts.metamorphicGroupsFailed = mmGroups.filter((g) => mmGroupFail[g]).length;
  counts.metamorphicGroupsPassed = counts.metamorphicGroupsTotal - counts.metamorphicGroupsFailed;
  return { counts, failures: results };
}
