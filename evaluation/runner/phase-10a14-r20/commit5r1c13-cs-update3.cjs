// PHASE-10A14-R20 COMMIT 5R1-C13 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // R3 invariant narrative
  [`The exact R3 decision invariant was enforced on every candidate. Three intermediate
candidates regressed R3 (to 3,701, 3,714 and 3,715); each was diagnosed and corrected
within the same iteration, and no candidate carrying an R3 regression was ever registered
as an accepted base.

Remaining counterfactual failures by suite:

\`\`\`text
v3  0 / 331
v4  0 / 177
v5  0 / 134
v6  0 / 114
\`\`\``,
    `The decision lock was enforced as a hard invariant on every C13 candidate. **Two
candidates regressed it and were rejected outright**: one drove R3 decision to 3,714 with
6 false refusals by reading "Define X as used in a BIR assessment" as a local
redefinition, and one drove it to 3,710 with 10 clarify mismatches by grounding a bare
ambiguous acronym as ordinary subject matter instead of leaving it in the clarification
lane. Each was diagnosed and corrected within its own iteration, and **no candidate
carrying a decision regression was ever registered as an accepted base**.

Remaining decision counterfactual failures by suite:

\`\`\`text
v3  0 / 331
v4  0 / 177
v5  0 / 134
v6  0 / 114
\`\`\``],

  // anti-memorization finding -> C13 statement
  [`Anti-memorization finding — leakage found and removed:

\`\`\`text
The C12 gate lowered the leakage threshold to three words and fired immediately. Three
whole counterfactual queries had their exact text in the runtime vocabulary from C9, and
two whole R3 rows were hard-coded as homograph patterns inherited from the pre-C7
baseline. All five were removed or replaced with generic structural patterns; the
counterfactual score fell 739 to 737 as the honest cost.
\`\`\``,
    `Anti-memorization and suite integrity in C13:

\`\`\`text
The C12 gate was carried forward unchanged and extended to cover the new relation suite,
plus a check that no oracle relation expectation is read at runtime. It passed on every
accepted candidate: no complete counterfactual or R3 query, no query hash, no oracle id,
no suite/family/cluster feature, no scenario number, no expected-decision or
expected-relation map.

The suite's own leakage gate fired three times while the relation suite was being
authored, on templates that collided exactly with R3 rows (Filipino compliance and
withholding frames, and bare tax noun phrases). All were replaced with distinct
structural fillers before any runtime change, so the suite tests structure rather than
reproducing oracle text.
\`\`\``],

  // counterfactual controls -> add relation suite
  [`combined v3+v4+v5+v6 suite preserved and rerun: 756 queries / 419 pairs
no new queries were added: the existing suite is the controlling closure set
exact R3 query leakage = 0
locked candidate result = 756 / 756  (v3 331/331, v4 177/177, v5 134/134, v6 114/114)`,
    `combined v3+v4+v5+v6 suite preserved and rerun: 756 queries / 419 pairs
no new decision queries were added: the existing suite is the controlling closure set
exact R3 query leakage = 0
accepted C13 candidate result = 756 / 756  (v3 331/331, v4 177/177, v5 134/134, v6 114/114)

new relation-focused suite v7: 296 authored queries / 148 pairs, all 12 relation types
282 controlling / 14 recorded non-controlling probes
accepted C13 candidate result = 274 / 282
exact R3 and v3-v6 leakage = 0`],

  // remaining structural clusters
  [`Remaining structural clusters:

\`\`\`text
none - the R3 decision partition is empty at 3,720 / 3,720
\`\`\``,
    `Remaining structural clusters:

\`\`\`text
none in R3 - both the decision and relation partitions are empty at 3,720 / 3,720
one held-out relation family remains open: primary_vs_subordinate (8 queries)
\`\`\`

Adjudication of the relation-focused residual is recorded in full in
\`COMMIT_5R1C13_RELATION_SUITE_ADJUDICATION.md\`. Of 33 residual failures, 16 were my own
suite's **over-strict forbidden lists**, which contradicted the frozen scorer's
containment semantics, and 9 were **unauthorized authored expectations** on invented
acronyms with no R3 counterpart; those 9 are retained in the file as non-controlling
probes rather than deleted, so the withdrawal stays visible. The remaining 8 are the
genuine open gap. **No expectation was edited to manufacture a pass and the denominator
was not increased.**

Two authored expectations were also found to contradict R3 during the pre-coding phase
and were corrected in R3's favour: the Filipino "i-withhold ang buwis sa X" frame
requires \`ASKS_VAT_TREATMENT_OF\`, and \`no_tax_relation\` with \`CLARIFY\` is a pairing R3
authorizes in 100 rows — there the integrity **gate** was wrong, not the runtime.`],

  // iterations
  [`Material iterations: 4 of 5 permitted were used, all accepted. A separate clean
lock-verification campaign was executed against an unchanged runtime and is recorded in
full.`,
    `Material iterations: 5 of 5 permitted were used. One further candidate was rejected for
a decision-lock regression and is preserved with its rejection grounds. A separate clean
relation-lock verification campaign was executed against an unchanged runtime and is
recorded in full.`],

  // layer status
  [`decision lock:   ACHIEVED - R3 3,720/3,720 and counterfactual 756/756,
                 independently verified
relation lock:   not started
reason lock:     not started`,
    `decision lock:   ACHIEVED and PRESERVED - R3 3,720/3,720 and counterfactual 756/756,
                 re-verified under the C13 candidate
relation lock:   NOT DECLARED - R3 relation closed at 3,720/3,720 with 0 mismatches,
                 13 of 14 lock conditions met; the relation-focused suite condition
                 is unmet at 274/282 and is recorded as unmet, not waived
reason lock:     not started`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
