import { pathToFileURL } from 'node:url';
import { cpSync } from 'node:fs';
import { loadR3Rows } from './commit5r1c2-oracle-runner.mjs';
import { REPO } from './identity.mjs';
const LIVE = `${REPO}/services/philippine-tax-intent-analyzer.js`;
const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
async function tc(path,label){
  cpSync(path, LIVE);
  const m = await import(pathToFileURL(LIVE).href + `?v=${Date.now()}-${Math.random()}`);
  const rows = loadR3Rows().filter(r=>r.primaryCategory==='tax_compliance_task');
  let decPass=0, overall=0;
  for(const r of rows){const ev=m.analyzePhilippineTaxIntent(r.query);
    if(ev.decision===r.expectedDecision) decPass++;
    const relOk=(r.expectedRelations||[]).map(x=>x.relation).every(x=>ev.relations.map(y=>y.relation).includes(x));
    if(ev.decision===r.expectedDecision && ev.reasonCode===r.expectedReasonCodeFamily && relOk) overall++;
  }
  console.log(`${label}: tax_compliance_task decisionPass=${decPass}/108 overall=${overall}/108`);
}
await tc(`${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_development_iteration_02-commit5r1c4-dev-02-ord01-2026-07-25T10-45-21-760Z/runtime-snapshot/philippine-tax-intent-analyzer.js`,'dev-02(2955)');
await tc(`${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_development_iteration_03-commit5r1c4-dev-03-ord01-2026-07-25T10-45-22-818Z/runtime-snapshot/philippine-tax-intent-analyzer.js`,'dev-03');
