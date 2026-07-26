// PHASE-10A14-R20 COMMIT 5R1-C14 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // reconstruction narrative -> C14 reconstruction + locked candidate
  [`Accepted C13 relation candidate:

\`\`\`text
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  274 / 282
reason mismatches =   679   (diagnostic only in C13)
\`\`\``,
    `Reconstructed accepted C13 base (new governed campaign, controlling):

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
\`\`\``],

  // counterfactual controls
  [`accepted C13 candidate result = 756 / 756  (v3 331/331, v4 177/177, v5 134/134, v6 114/114)

new relation-focused suite v7: 296 authored queries / 148 pairs, all 12 relation types
282 controlling / 14 recorded non-controlling probes
accepted C13 candidate result = 274 / 282
exact R3 and v3-v6 leakage = 0`,
    `locked C14 candidate result = 756 / 756  (v3 331/331, v4 177/177, v5 134/134, v6 114/114)

relation-focused suite v7 FROZEN and unmodified in C14: 296 authored queries / 148 pairs
282 controlling / 14 visible non-controlling probes — denominator unchanged
locked C14 candidate result = 282 / 282
exact R3 and v3-v6 leakage = 0

new clause-segmentation probe suite: 68 probes / 34 pairs
acceptance gate only; explicitly NOT part of the 282-query denominator
locked C14 candidate result = 68 / 68
exact R3, decision-suite and relation-suite leakage = 0`],

  // remaining structural clusters
  [`Remaining structural clusters:

\`\`\`text
none in R3 - both the decision and relation partitions are empty at 3,720 / 3,720
one held-out relation family remains open: primary_vs_subordinate (8 queries)
\`\`\``,
    `Remaining structural clusters:

\`\`\`text
none - the decision and relation lanes are both closed and locked
R3 decision 3,720 / 3,720 | R3 relation 3,720 / 3,720
decision counterfactual 756 / 756 | relation counterfactual 282 / 282
the reason lane is the only remaining Phase 10A analyzer lane (679 mismatches)
\`\`\``],

  // remaining work paragraph
  [`No R3 relation work remains: the R3 relation partition is empty. What remains in the
relation lane is a single held-out structural family, \`primary_vs_subordinate\` (8 of 282
controlling relation-focused queries):

\`\`\`text
"Although the <tax object> is taxable, rename the <ordinary> folder."
expected  REFUSE + REQUESTS_NON_TAX_ACTION_ON
actual    ALLOW  + ASKS_TAX_TREATMENT_OF
\`\`\`

This is a genuine gap against §8B, not a suite defect: a concessive clause states
context, and the primary task is the ordinary imperative. A concessive rule was authored
and placed ahead of the tax-treatment family, but it does not take effect because the
segmenter emits the whole sentence as a single \`primary_task\` clause, so an earlier path
emits the tax relation first. Correcting it requires changing clause segmentation so a
leading concessive becomes its own \`context\` clause — a clause-layer change beyond the
relation lane and beyond the C13 iteration ceiling. R3 contains no row of this shape,
which is why the R3 relation lane closes without it. It is carried to C14 as OPEN.

Remaining Phase 10A work is this residual relation family, then the reason lane, then
standalone closure.`,
    `No relation work remains. The \`primary_vs_subordinate\` family that C13 carried forward
as OPEN is closed in C14 by the clause-layer correction:

\`\`\`text
"Although the <tax object> is taxable, rename the <ordinary> folder."
expected  REFUSE + REQUESTS_NON_TAX_ACTION_ON
actual    REFUSE + REQUESTS_NON_TAX_ACTION_ON   (8 / 8)
clauses   c01 role=context "Although the <tax object> is taxable,"
          c02 role=primary_task "rename the <ordinary> folder."
\`\`\`

C13 diagnosed this correctly: the segmenter emitted the whole sentence as one
\`primary_task\` clause. The correction splits a leading concessive at its closing
top-level comma when the remainder is a complete requested task, demotes the concessive
clause in primary-task scoring, and scopes both the relation build and the
\`taxRelationOverPrimaryTarget\` decision flag so a predicate confined to concessive
context cannot claim the primary target. No exact-query, object-name, family-name or
expected-decision shortcut was used; the correction is entirely structural.

Remaining Phase 10A work is the reason lane, then standalone closure, then integration
and runtime freeze.`],

  // iterations
  [`Material iterations: 5 of 5 permitted were used. One further candidate was rejected for
a decision-lock regression and is preserved with its rejection grounds. A separate clean
relation-lock verification campaign was executed against an unchanged runtime and is
recorded in full.`,
    `Material iterations: 1 of 4 permitted were used, accepted on the first candidate. A
separate clean relation-lock verification campaign was executed against an unchanged
runtime and is recorded in full; it met all sixteen lock conditions.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
