import { pathToFileURL } from 'node:url';
const R = await import(pathToFileURL('C:/Projects/tina-backend/evaluation/runner/phase-10a14-r20/commit5r1c2-oracle-runner.mjs').href);
const rows = R.loadR3Rows();
const rt = await R.loadRuntime('standalone');
const { counts } = R.scoreRows(rows, rt.classify);
console.log(JSON.stringify({passed:counts.canonicalPassed,failed:3720-counts.canonicalPassed,dec:counts.decisionMismatches,reason:counts.reasonMismatches,rel:counts.relationMismatches,fa:counts.materialFalseAllows,fr:counts.materialFalseRefusals,cm:counts.clarifyMismatches,mmPass:counts.metamorphicGroupsPassed,mmFail:counts.metamorphicGroupsFailed,bySet:counts.bySourceSet},null,1));
