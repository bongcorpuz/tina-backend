import { pathToFileURL } from 'node:url';
const m = await import(pathToFileURL(process.env.TINA_REPO_ROOT ? process.env.TINA_REPO_ROOT + '/services/philippine-tax-intent-analyzer.js' : '/c/Projects/tina-backend/services/philippine-tax-intent-analyzer.js').href + '?v=' + Date.now());
for (const q of ['What penalty applies for late deficiency interest in case 19?', 'Can input VAT be claimed for a culture class? Mixed 12.', 'Does a culture class need BIR documentation? Mixed 27.']) {
  const ev = m.analyzePhilippineTaxIntent(q);
  console.log(JSON.stringify({ q, decision: ev.decision, reason: ev.reasonCode, rels: ev.relations.map(r=>r.relation), target: ev.requestedTarget, primary: ev.clauses.find(c=>c.role==='primary_task')?.text }));
}
