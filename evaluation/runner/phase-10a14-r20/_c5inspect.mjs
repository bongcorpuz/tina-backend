import { decLane } from './commit5r1c5-declane.mjs';
const c = await decLane(); // live (iter02)
const g = {};
for (const f of c.decFails) { const k=`${f.expectedDecision}->${f.actualDecision}|${f.primaryCategory}`; g[k]=(g[k]||0)+1; }
// show ALLOW->REFUSE and ALLOW->CLARIFY concrete tax that should allow
console.log("ALLOW->REFUSE (should allow), sample:");
c.decFails.filter(f=>f.expectedDecision==="ALLOW"&&f.actualDecision==="REFUSE").slice(0,12).forEach(f=>console.log(`   ${JSON.stringify(f.query).slice(0,70)}  rel=${JSON.stringify(f.actualRelations)}`));
console.log("\nALLOW->CLARIFY (should allow), sample:");
c.decFails.filter(f=>f.expectedDecision==="ALLOW"&&f.actualDecision==="CLARIFY").slice(0,12).forEach(f=>console.log(`   ${JSON.stringify(f.query).slice(0,70)}  rel=${JSON.stringify(f.actualRelations)}`));
console.log("\nREFUSE->CLARIFY (should refuse), sample:");
c.decFails.filter(f=>f.expectedDecision==="REFUSE"&&f.actualDecision==="CLARIFY").slice(0,10).forEach(f=>console.log(`   ${JSON.stringify(f.query).slice(0,70)}  rel=${JSON.stringify(f.actualRelations)}`));
