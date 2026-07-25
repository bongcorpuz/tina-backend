import { pathToFileURL } from 'node:url';
import { cpSync } from 'node:fs';
import { loadR3Rows, scoreRows } from './commit5r1c2-oracle-runner.mjs';
import { REPO } from './identity.mjs';
const LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
async function full(path){
  cpSync(path, LIVE);
  const m = await import(pathToFileURL(LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const classify=(q)=>{const ev=m.analyzePhilippineTaxIntent(q);return{decision:ev.decision,reasonFamily:ev.reasonCode,relations:ev.relations.map(r=>r.relation)};};
  const {counts}=scoreRows(loadR3Rows(),classify);
  return counts;
}
const SCRATCH='C:/Users/USER/AppData/Local/Temp/claude/c--Projects-tina-dev-factory/41c48ca1-2847-414b-818c-1ee1981e27c4/scratchpad';
const c=await full(`${SCRATCH}/c5_iter02_accepted.js`);
console.log(JSON.stringify({overall:c.canonicalPassed,dec:c.decisionMismatches,rel:c.relationMismatches,reason:c.reasonMismatches,fa:c.materialFalseAllows,fr:c.materialFalseRefusals,clarify:c.clarifyMismatches,mm:`${c.metamorphicGroupsPassed}/${c.metamorphicGroupsTotal}`,bySourceSet:c.bySourceSet},null,2));
