// PHASE-10A14-R20 COMMIT 5R1-C16 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // reconstruction narrative
  [`Reconstructed locked C14 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,041 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,041 / 3,720   (679 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C14 dev-02 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`e34842a9…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C15 reason candidate:

\`\`\`text
canonical overall = 3,106 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,106 / 3,720   (614 mismatches, from 679)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344   (from 278)
\`\`\``,
    `Reconstructed accepted C15 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,106 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,106 / 3,720   (614 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C15 dev-06 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`e8577e35…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C16 reason candidate:

\`\`\`text
canonical overall = 3,185 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,185 / 3,720   (535 mismatches, from 614)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344   (held)
\`\`\``],

  // remaining clusters
  [`the reason lane remains OPEN: 614 mismatches across a long tail of templates
\`\`\`

The reason residual is genuinely long-tailed. The 679 baseline failures spanned 438
distinct templates, the largest accounting for 10 rows; 65 were closed by three
structural principles and the remainder need further insight rather than more narrow
rules. The two largest residual groups are mutually contradictory on near-identical
structure, and the oracle's own \`taskVerb\`, \`taskTarget\` and \`nonTaxObjects\` fields are
null on every row in both, so they supply no discriminator. Full analysis is preserved in
\`COMMIT_5R1C15_REASON_MISMATCH_INVENTORY.json\`,`,
    `the reason lane remains OPEN: 535 mismatches, of which a measured 236 are unreachable
  with the current runtime feature set
\`\`\`

C16 replaced the C15 template-count description with a **measured separability ceiling**.
Grouping every residual row by its runtime feature vector shows 378 rows in vectors whose
residual rows all share one expected reason (reachable by a rule) and **236 rows in
colliding vectors** where identical runtime evidence carries different expected reasons.
No rule over that evidence can separate the colliding rows; they need an additional
feature, which is the substantive question carried to C17. Full analysis is preserved in
\`COMMIT_5R1C16_REASON_FEATURE_SEPARABILITY.json\`,
\`COMMIT_5R1C16_REASON_MINIMAL_PAIR_ANALYSIS.json\`,
\`COMMIT_5R1C16_REASON_DECISION_TABLE.md\`,
\`COMMIT_5R1C15_REASON_MISMATCH_INVENTORY.json\`,`],

  // iterations
  [`Material iterations: 5 of 5 permitted were used, all accepted. Three candidates
regressed R3 reason during development (742, 687 and 685 against a 679 baseline) and
each was narrowed against measured evidence within its own iteration before acceptance;
no candidate carrying a regression was registered as an accepted base. No clean
reason-lock verification was run, because §12 authorizes it only after reason mismatches
reach zero.`,
    `Material iterations: 5 of 5 permitted were used in C16 — four accepted and one
rejected. The rejected candidate implemented the §9C target-role conjunction, the
sharpest discriminator measured (74.5% against 7.8%); in situ its coverage proved far
below its precision, regressing the suite 304 → 242 and R3 575 → 652, so it was rejected
and the prior snapshot restored. Two further candidates regressed R3 during development
(645 and 654 against a 614 baseline) and were narrowed against measured evidence within
their own iteration before acceptance. No candidate carrying a regression was registered
as an accepted base. No clean reason-lock verification was run, because §13 authorizes it
only after reason mismatches reach zero.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
