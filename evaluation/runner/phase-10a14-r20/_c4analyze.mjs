import { laneScore } from './commit5r1c4-lanes.mjs';
const c = await laneScore();
const byDirCat = {};
for (const r of c.decFails) { const k = `${r.expectedDecision}->${r.actualDecision} | ${r.primaryCategory}`; byDirCat[k] = (byDirCat[k] || 0) + 1; }
console.log('ALLOW->REFUSE / REFUSE->ALLOW by category:');
Object.entries(byDirCat).filter(([k]) => k.startsWith('ALLOW->REFUSE') || k.startsWith('REFUSE->ALLOW')).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}  ${k}`));
console.log('\nALLOW->REFUSE samples:');
c.decFails.filter((r) => r.expectedDecision === 'ALLOW' && r.actualDecision === 'REFUSE').slice(0, 12).forEach((r) => console.log('   ' + JSON.stringify(r.query).slice(0, 78) + '  act=' + JSON.stringify(r.actualRelations)));
console.log('\nREFUSE->ALLOW samples:');
c.decFails.filter((r) => r.expectedDecision === 'REFUSE' && r.actualDecision === 'ALLOW').slice(0, 12).forEach((r) => console.log('   ' + JSON.stringify(r.query).slice(0, 78) + '  act=' + JSON.stringify(r.actualRelations)));
