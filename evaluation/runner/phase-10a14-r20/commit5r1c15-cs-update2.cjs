// PHASE-10A14-R20 COMMIT 5R1-C15 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // reconstruction narrative
  [`Reconstructed accepted C13 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,041 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  274 / 282
reason mismatches =   679
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C13 dev-06 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`f2bb9051…\`, and only an authorized runtime file
differed from the live baseline.

Locked C14 relation candidate:

\`\`\`text
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason mismatches =   679   (diagnostic only in C14; unchanged from the base)
\`\`\``,
    `Reconstructed locked C14 base (new governed campaign, controlling):

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
\`\`\``],

  // remaining structural clusters
  [`Remaining structural clusters:

\`\`\`text
none - the decision and relation lanes are both closed and locked
R3 decision 3,720 / 3,720 | R3 relation 3,720 / 3,720
decision counterfactual 756 / 756 | relation counterfactual 282 / 282
the reason lane is the only remaining Phase 10A analyzer lane (679 mismatches)
\`\`\`

Remaining Phase 10A work is the reason lane, then standalone closure, then integration
and runtime freeze.`,
    `Remaining structural clusters:

\`\`\`text
none in the decision or relation lanes - both remain closed and locked
R3 decision 3,720 / 3,720 | R3 relation 3,720 / 3,720
decision counterfactual 756 / 756 | relation counterfactual 282 / 282 | probes 68 / 68
the reason lane remains OPEN: 614 mismatches across a long tail of templates
\`\`\`

The reason residual is genuinely long-tailed. The 679 baseline failures spanned 438
distinct templates, the largest accounting for 10 rows; 65 were closed by three
structural principles and the remainder need further insight rather than more narrow
rules. The two largest residual groups are mutually contradictory on near-identical
structure, and the oracle's own \`taskVerb\`, \`taskTarget\` and \`nonTaxObjects\` fields are
null on every row in both, so they supply no discriminator. Full analysis is preserved in
\`COMMIT_5R1C15_REASON_MISMATCH_INVENTORY.json\`,
\`COMMIT_5R1C15_REASON_CONFUSION_MATRIX.json\` and
\`COMMIT_5R1C15_REASON_PRECEDENCE_MATRIX.json\`.

Remaining Phase 10A work is the reason lane, then standalone closure, then integration
and runtime freeze.`],

  // iterations
  [`Material iterations: 1 of 4 permitted were used, accepted on the first candidate. A
separate clean relation-lock verification campaign was executed against an unchanged
runtime and is recorded in full; it met all sixteen lock conditions.`,
    `Material iterations: 5 of 5 permitted were used, all accepted. Three candidates
regressed R3 reason during development (742, 687 and 685 against a 679 baseline) and
each was narrowed against measured evidence within its own iteration before acceptance;
no candidate carrying a regression was registered as an accepted base. No clean
reason-lock verification was run, because §12 authorizes it only after reason mismatches
reach zero.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
