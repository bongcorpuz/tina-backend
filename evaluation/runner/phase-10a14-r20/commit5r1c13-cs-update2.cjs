// PHASE-10A14-R20 COMMIT 5R1-C13 — CURRENT_STATE narrative sections.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // candidate identity block
  [`Locked candidate:

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c12_counterfactual_iteration_05-commit5r1c12-dev-05
verification attempt:
R20-domain_campaign-r20_commit5r1c12_decision_layer_lock_verification-commit5r1c12-lock
services tree digest:
184119a72d8d9589fb6d7d560a08ced8d2e2eb97831f7df09438a06daac191b2
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C12_LOCKED_CANDIDATE.patch
\`\`\`

Decision-layer closure is **not** runtime closure, **not** standalone closure, and
**not** R20 PASS. The relation and reason lanes have not been started.`,
    `Accepted C13 relation candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c13_relation_iteration_06-commit5r1c13-dev-06
verification attempt:
R20-focused_suite-r20_commit5r1c13_relation_lock_verification-commit5r1c13-lock
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C13_RELATION_CANDIDATE.patch
lock record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C13_RELATION_LOCK.json
\`\`\`

Closing the R3 relation lane is **not** runtime closure, **not** standalone closure, and
**not** R20 PASS. The relation lock is not declared and the reason lane is not started.`],

  // reconstruction narrative
  [`Reconstructed accepted C11 base (new governed campaign, controlling):

\`\`\`text
R3 decision    = 3,720 / 3,720
counterfactual =   739 / 756
reconstruction discrepancies = 0 (exact identity match on all nine metrics)
\`\`\`

The C11 dev-07 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`8c0ac833…\`, and only an authorized runtime file
differed from the live baseline.

Locked C12 candidate:

\`\`\`text
R3 decision    = 3,720 / 3,720
counterfactual =   756 / 756
\`\`\``,
    `Reconstructed locked C12 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,028 / 3,720
R3 decision       = 3,720 / 3,720
relation passed   = 3,558 / 3,720   (162 mismatches)
reason mismatches =   631
decision counterfactual = 756 / 756
reconstruction discrepancies = 0 (exact identity match on all nine metrics)
\`\`\`

The C12 dev-05 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`184119a7…\`, and only an authorized runtime file
differed from the live baseline.

Accepted C13 relation candidate:

\`\`\`text
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  274 / 282
reason mismatches =   679   (diagnostic only in C13)
\`\`\`

### The relation scoring contract, established before coding

The frozen scorer computes \`expectedRels.every(rt => actual.includes(rt))\`. This is
**set containment on the relation field only**: \`source\`, \`target\`, \`clauseId\` and
\`evidenceSpan\` do not affect scoring, order and duplicates are irrelevant, and an empty
expectation passes unconditionally. It follows that an extra relation can never fail a
row, so **all 162 baseline mismatches were missing-only** (\`extraOnlyRows = 0\`), and the
lane closes by emitting absent relations rather than suppressing present ones.
\`ASKS_TAX_TREATMENT_OF\` is never required by any R3 row.

### The four structural causes

\`\`\`text
EXPANDS_AS_NON_TAX          48   declarative equational expansion was unrecognised
REQUESTS_NON_TAX_ACTION_ON  46   the relation was gated on a VERB list, so a verbless
                                 ordinary noun phrase produced no relation at all
ASKS_VAT_TREATMENT_OF       45   selection ORDER: compliance and withholding branches
                                 were tested before VAT
ASKS_DEFINITION_OF          23   definition intent scoped by an in/within tax context
\`\`\`

Every one of the 162 rows already carried the **correct decision**; the lane was a pure
relation-emission gap and no decision change was needed to close it.

### The controlling architectural finding

Two early-return paths — the homograph veto and the acronym-redefinition guard —
returned with **no relation at all**, leaving their refusals ungrounded. The precedence
spec requires every decision to rest on a relation with an evidence span. Grounding
those exits, and hoisting the declarative-redefinition test above the veto so a
tax-shaped token can still be redefined locally, closed 24 of the last 34 rows.`],

  // remaining work
  [`No decision-layer work remains: both the R3 decision partition and the counterfactual
failure set are empty. Remaining Phase 10A work is the relation lane, then the reason
lane, then standalone closure.`,
    `No R3 relation work remains: the R3 relation partition is empty. What remains in the
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
standalone closure.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
