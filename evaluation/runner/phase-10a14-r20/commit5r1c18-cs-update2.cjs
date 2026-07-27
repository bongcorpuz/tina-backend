// PHASE-10A14-R20 COMMIT 5R1-C18 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // reconstruction narrative
  [`Reconstructed accepted C16 base (new governed campaign, controlling):

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
\`\`\``,
    `Reconstructed accepted C17 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,243 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,243 / 3,720   (477 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344
collision probes        =  134 / 196
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C17 dev-05 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`90983f57…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C18 reason candidate:

\`\`\`text
canonical overall = 3,313 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,313 / 3,720   (407 mismatches, from 477)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344   (from 304)
collision probes        =  134 / 196   (held)
\`\`\``],

  // remaining clusters
  [`the reason lane remains OPEN: 477 mismatches, of which a measured 436 are REACHABLE
  under the enriched feature set and 41 are not
\`\`\`

C17 revisited the C16 ceiling and **disproved it**. C16 grouped residual rows by a`,
    `the reason lane remains OPEN: 407 mismatches, of which a measured 323 are REACHABLE
  under the extended feature set and 84 are not
\`\`\`

C18 replaced the ceiling question with an **acceptance question**. Rather than asking how
many rows are separable in principle, it asks what each candidate rule would actually do
to the rows its runtime branch matches — and rejects any rule that would regress a
currently-correct row. Six rules were rejected before implementation on that test.

C17 revisited the C16 ceiling and **disproved it**. C16 grouped residual rows by a`],

  // iterations
  [`Material iterations: 5 of 5 permitted were used in C17 — two accepted, one rejected,
and two narrowed against measured evidence within their own iteration before reaching a
neutral result. The rejected candidate applied the §10C target semantic role at the two
roles measuring above 84% precision; because those rows already largely passed, the rule
flipped correct rows and regressed R3 535 → 566, so it was rejected and the prior
snapshot restored. No candidate carrying a regression was registered as an accepted base.
No clean reason-lock verification was run, because §15 authorizes it only after reason
mismatches reach zero.`,
    `Material iterations: 5 of 5 permitted were used in C18 — three accepted and one
rejected, with one further iteration spent re-simulating a rule whose runtime placement
was wrong. The rejected candidate had a clean forecast but was gated on a predicate the
controlling branch does not use, so the guard never fired and R3 regressed 448 → 454; it
was rejected and the prior snapshot restored, then re-simulated against the actual branch
predicate and landed 41 rows plus 14 reason-suite rows. No candidate carrying a
regression was registered as an accepted base. No clean reason-lock verification was run,
because §14 authorizes it only after reason mismatches reach zero.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
