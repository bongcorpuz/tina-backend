import { decLane } from './commit5r1c5-declane.mjs';
import { pathToFileURL } from 'node:url';
import { cpSync } from 'node:fs';
import { REPO } from './identity.mjs';
const R20 = `${REPO}/evaluation/results/phase-10a14-r20`;
const BASE = `${R20}/attempts/R20-domain_campaign-r20_commit5r1c4_development_iteration_02-commit5r1c4-dev-02-ord01-2026-07-25T10-45-21-760Z/runtime-snapshot/philippine-tax-intent-analyzer.js`;
const cur = await decLane(); // current live (iter02)
const curFail = new Set(cur.decFails.map(f=>f.oracleId));
const curById = Object.fromEntries(cur.decFails.map(f=>[f.oracleId,f]));
const base = await decLane(BASE);
const baseFail = new Set(base.decFails.map(f=>f.oracleId));
// restore live to iter02 (base run overwrote it)
// newly broken = in curFail not in baseFail
const newlyBroken = [...curFail].filter(id=>!baseFail.has(id));
const newlyFixed = [...baseFail].filter(id=>!curFail.has(id));
console.log('newlyBroken:',newlyBroken.length,' newlyFixed:',newlyFixed.length);
console.log('\n=== newly broken (were passing, now fail) ===');
for(const id of newlyBroken){const f=curById[id];console.log(`  [${f.expectedDecision}->${f.actualDecision}] ${JSON.stringify(f.query).slice(0,74)}`);}
