import { pathToFileURL } from 'node:url';
const A = await import(pathToFileURL('C:/Projects/tina-backend/services/philippine-tax-intent-analyzer.js').href+'?v='+Date.now());
for(const q of ['net estate','books of accounts','official receipt','What penalty applies for late deficiency interest in case 199.','Does transfer pricing documentation apply? Group MM-1.','Can input VAT be claimed for a culture class? Mixed 1.']){
  const ev=A.analyzePhilippineTaxIntent(q);
  console.log(ev.decision.padEnd(7),ev.reasonCode.padEnd(30),'rels:['+ev.relations.map(r=>r.relation)+']','|',q.slice(0,40));
}
