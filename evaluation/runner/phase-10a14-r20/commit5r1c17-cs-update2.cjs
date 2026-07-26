// PHASE-10A14-R20 COMMIT 5R1-C17 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // reconstruction narrative
  [`Reconstructed accepted C15 base (new governed campaign, controlling):

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
\`\`\``,
    `Reconstructed accepted C16 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,185 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,185 / 3,720   (535 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C16 dev-06 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`1ac0d460…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C17 reason candidate:

\`\`\`text
canonical overall = 3,243 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,243 / 3,720   (477 mismatches, from 535)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344   (held)
collision probes        =  134 / 196   (new acceptance gate)
\`\`\``],

  // remaining clusters
  [`the reason lane remains OPEN: 535 mismatches, of which a measured 236 are unreachable
  with the current runtime feature set
\`\`\`

C16 replaced the C15 template-count description with a **measured separability ceiling**.
Grouping every residual row by its runtime feature vector shows 378 rows in vectors whose
residual rows all share one expected reason (reachable by a rule) and **236 rows in
colliding vectors** where identical runtime evidence carries different expected reasons.
No rule over that evidence can separate the colliding rows; they need an additional
feature, which is the substantive question carried to C17. Full analysis is preserved in
\`COMMIT_5R1C16_REASON_FEATURE_SEPARABILITY.json\`,`,
    `the reason lane remains OPEN: 477 mismatches, of which a measured 436 are REACHABLE
  under the enriched feature set and 41 are not
\`\`\`

C17 revisited the C16 ceiling and **disproved it**. C16 grouped residual rows by a
four-field feature vector and found 236 colliding rows; C17 enriched the description with
deterministic parse features — question/request/assertion subtype, predicate attachment
and argument structure, requested-outcome class, target syntactic and semantic role,
topic completeness, discourse attachment — and the collision count fell from 210 to 41
over the same residual. The ceiling was a **feature-observability defect**, exactly as the
C17 specification anticipated, not a property of the oracle. Full analysis is preserved in
\`COMMIT_5R1C17_REASON_OBSERVABILITY_AUDIT.json\`,
\`COMMIT_5R1C17_COLLISION_GROUP_ANALYSIS.json\`,
\`COMMIT_5R1C17_ENRICHED_SEPARABILITY_BASELINE.json\`,
\`COMMIT_5R1C17_ENRICHED_FEATURE_SPEC.md\`,
\`COMMIT_5R1C16_REASON_FEATURE_SEPARABILITY.json\`,`],

  // iterations
  [`Material iterations: 5 of 5 permitted were used in C16 — four accepted and one
rejected. The rejected candidate implemented the §9C target-role conjunction, the
sharpest discriminator measured (74.5% against 7.8%); in situ its coverage proved far
below its precision, regressing the suite 304 → 242 and R3 575 → 652, so it was rejected
and the prior snapshot restored. Two further candidates regressed R3 during development
(645 and 654 against a 614 baseline) and were narrowed against measured evidence within
their own iteration before acceptance. No candidate carrying a regression was registered
as an accepted base. No clean reason-lock verification was run, because §13 authorizes it
only after reason mismatches reach zero.`,
    `Material iterations: 5 of 5 permitted were used in C17 — two accepted, one rejected,
and two narrowed against measured evidence within their own iteration before reaching a
neutral result. The rejected candidate applied the §10C target semantic role at the two
roles measuring above 84% precision; because those rows already largely passed, the rule
flipped correct rows and regressed R3 535 → 566, so it was rejected and the prior
snapshot restored. No candidate carrying a regression was registered as an accepted base.
No clean reason-lock verification was run, because §15 authorizes it only after reason
mismatches reach zero.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
