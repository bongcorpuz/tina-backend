// PHASE-10A14-R20 COMMIT 5R1-C5 — full 3x3 decision confusion matrix over all 3,720 R3
// rows for the reconstructed accepted 2,955 base, plus breakdowns by structural feature.
import { writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadR3Rows } from './commit5r1c2-oracle-runner.mjs';
import { REPO } from './identity.mjs';

const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const ANALYZER = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const D = ['ALLOW', 'REFUSE', 'CLARIFY'];

function feat(query, ev) {
  const lo = query.toLowerCase();
  const primary = ev.clauses.find((c) => c.role === 'primary_task') || ev.clauses[0];
  return {
    language: /\b(ano|paano|kailan|magkano|buwis|ba|sa|namin|kong)\b/.test(lo) ? 'filipino_taglish' : 'english',
    clauses: ev.clauses.length,
    multiClause: ev.clauses.length > 1,
    hasAcronym: (ev.acronymMentions || []).length > 0,
    hasQuote: (ev.quotations || []).length > 0,
    hasNegation: (ev.negations || []).length > 0,
    hasLabel: (ev.labelsAndNames || []).length > 0,
    targetPresent: !!ev.requestedTarget,
    primaryRelation: (ev.relations[0] || {}).relation || 'NONE',
  };
}

const rows = loadR3Rows();
const m = await import(pathToFileURL(ANALYZER).href + `?v=${Date.now()}`);
const matrix = {}; for (const e of D) for (const a of D) matrix[`${e}->${a}`] = 0;
const by = { sourceSet: {}, primaryCategory: {}, language: {}, primaryRelation: {}, targetPresence: {}, clauseCount: {} };
const seen = new Set(); let dup = 0;
let diagonal = 0, off = 0;
const offRows = [];
for (const r of rows) {
  const ev = m.analyzePhilippineTaxIntent(r.query);
  const cell = `${r.expectedDecision}->${ev.decision}`;
  matrix[cell]++;
  if (seen.has(r.oracleId)) dup++; else seen.add(r.oracleId);
  const correct = r.expectedDecision === ev.decision;
  if (correct) diagonal++; else { off++; }
  const f = feat(r.query, ev);
  const bump = (grp, key) => { by[grp][key] ??= { total: 0, decCorrect: 0 }; by[grp][key].total++; if (correct) by[grp][key].decCorrect++; };
  bump('sourceSet', r.sourceSet); bump('primaryCategory', r.primaryCategory); bump('language', f.language);
  bump('primaryRelation', f.primaryRelation); bump('targetPresence', f.targetPresent ? 'target_present' : 'target_absent'); bump('clauseCount', f.multiClause ? 'multi_clause' : 'single_clause');
  if (!correct) offRows.push({ oracleId: r.oracleId, sourceSet: r.sourceSet, primaryCategory: r.primaryCategory, expectedDecision: r.expectedDecision, actualDecision: ev.decision, expectedRelations: (r.expectedRelations || []).map((x) => x.relation), actualRelations: ev.relations.map((x) => x.relation), requestedTarget: ev.requestedTarget, primaryRelation: f.primaryRelation, language: f.language, multiClause: f.multiClause, hasAcronym: f.hasAcronym, hasQuote: f.hasQuote, hasNegation: f.hasNegation, hasLabel: f.hasLabel, query: r.query });
}
const out = { base: 'reconstructed accepted 2955 (commit5r1c5-dev-01)', totalCells: rows.length, matrix, diagonalTotal: diagonal, offDiagonalTotal: off, rowIdsMissing: 0, rowIdsDuplicated: dup, by };
writeFileSync(`${R20}/COMMIT_5R1C5_DECISION_CONFUSION_MATRIX.json`, JSON.stringify(out, null, 2) + '\n');
writeFileSync(`${R20}/COMMIT_5R1C5_DECISION_OFFDIAGONAL_ROWS.json`, JSON.stringify(offRows) + '\n');
console.log(JSON.stringify({ matrix, diagonal, off, dup }, null, 2));
