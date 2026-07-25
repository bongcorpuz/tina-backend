import { laneScore } from './commit5r1c4-lanes.mjs';
const SCRATCH = 'C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad';
const cands = [
  ['dev02(dangling)', `${SCRATCH}/c4_dev02.js`],       // placeholder — dev02 not separately saved; recompute below
];
// dev02 was not separately preserved; dev03 (2955) and dev04 (dec281) are. Score those + full scoreRows for overall/false metrics.
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { pathToFileURL } from 'node:url';
import { cpSync } from 'node:fs';
import { REPO } from './identity.mjs';
const LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
async function full(path) {
  cpSync(path, LIVE);
  const m = await import(pathToFileURL(LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify = (q) => { const ev = m.analyzePhilippineTaxIntent(q); return { decision: ev.decision, reasonFamily: ev.reasonCode, relations: ev.relations.map((r) => r.relation) }; };
  const { counts } = scoreRows(loadR3Rows(), classify);
  const lane = await laneScore();
  return { overall: counts.canonicalPassed, decisionFailed: lane.decisionFailed, decisionPassed: lane.decisionPassed, relationFailed: lane.relationFailed, reasonFailed: lane.reasonFailed, falseAllows: counts.materialFalseAllows, falseRefusals: counts.materialFalseRefusals, clarifyMismatches: counts.clarifyMismatches, mmPassed: counts.metamorphicGroupsPassed, mmTotal: counts.metamorphicGroupsTotal, bySourceSet: counts.bySourceSet, byCategory: counts.byCategory, decByDir: lane.decByDir };
}
const targets = [
  ['dev03_2955', `${SCRATCH}/c4_dev03_2955.js`],
  ['dev04_dec281', `${SCRATCH}/c4_dev04_dec281.js`],
];
const out = {};
for (const [name, path] of targets) out[name] = await full(path);
console.log(JSON.stringify(out, null, 2));
