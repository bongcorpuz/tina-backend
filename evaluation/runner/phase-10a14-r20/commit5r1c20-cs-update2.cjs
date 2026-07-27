// PHASE-10A14-R20 COMMIT 5R1-C20 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  [`Reconstructed accepted C18 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,313 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,313 / 3,720   (407 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344
collision probes        =  134 / 196
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C18 dev-05 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`09081d31…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C19 reason candidate:

\`\`\`text
canonical overall = 3,337 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,337 / 3,720   (383 mismatches, from 407)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344   (held)
collision probes        =  140 / 196   (from 134)
\`\`\``,
    `Reconstructed accepted C19 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,337 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,337 / 3,720   (383 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344
collision probes        =  140 / 196
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C19 dev-05 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`3ef61436…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C20 reason candidate:

\`\`\`text
canonical overall = 3,449 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,449 / 3,720   (271 mismatches, from 383)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344   (held)
collision probes        =  148 / 196   (from 140)
\`\`\``],

  [`the reason lane remains OPEN: 383 mismatches, of which a measured 306 are REACHABLE
  and 77 are not
\`\`\`

C19 added a second acceptance property. C18 established that a rule must be measured
against the rows its exact condition changes; C19 established that the simulator and the`,
    `the reason lane remains OPEN: 271 mismatches, of which a measured 200 are REACHABLE
  and 71 are not
\`\`\`

C20 completed the acceptance framework. C18 established that a rule must be measured
against the rows its exact condition changes; C19 established that the simulator and the
runtime must evaluate the same predicate; C20 established that the rule must additionally
be applied through a seam that cannot disturb any unmatched row. With all three in place,
four rules shipped in four iterations, each landing exactly its forecast and none needing
to be reverted.

C19 added a second acceptance property. C18 established that a rule must be measured
against the rows its exact condition changes; C19 established that the simulator and the`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
