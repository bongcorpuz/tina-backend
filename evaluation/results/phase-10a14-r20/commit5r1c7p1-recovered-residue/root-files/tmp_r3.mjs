import { pathToFileURL } from 'node:url';
const R = await import(pathToFileURL('C:/Projects/tina-backend/evaluation/runner/phase-10a14-r20/commit5r1c2-oracle-runner.mjs').href);
const rows = R.loadR3Rows();
const rt = await R.loadRuntime('standalone');
const { counts, failures } = R.scoreRows(rows, rt.classify);
console.log('R3 passed',counts.canonicalPassed+'/3720','| dec',counts.decisionMismatches,'reason',counts.reasonMismatches,'rel',counts.relationMismatches,'| mm',counts.metamorphicGroupsPassed+'/'+counts.metamorphicGroupsTotal);
console.log('bySourceSet:',JSON.stringify(counts.bySourceSet));
console.log('r17 pass:',counts.bySourceSet.r17_accepted_control.passed);
import('fs').then(fs=>fs.writeFileSync('C:/Projects/tina-backend/tmp_r3fails.json',JSON.stringify(failures)));
