// PHASE-10A14-R20 COMMIT 5R1-C18 — CURRENT_STATE update (incomplete path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // ---- header block --------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C17
REASON OBSERVABILITY ENRICHMENT AND REASON-LAYER CLOSURE CONTINUATION
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing a further **58 of 535** reason
mismatches (535 → 477). Cumulatively across C15, C16 and C17 the lane has moved
**679 → 477**. The decision and relation locks were preserved exactly on every accepted
candidate:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C18
RESIDUAL-CONDITIONED REASON-LAYER CLOSURE CONTINUATION 18 AGAINST R3
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing a further **70 of 477** reason
mismatches (477 → 407). Cumulatively across C15 through C18 the lane has moved
**679 → 407**. The decision and relation locks were preserved exactly on every accepted
candidate:`],

  // ---- metrics block --------------------------------------------------------
  [`\`\`\`text
R3 reason                     3,243 / 3,720   (mismatches 477, from 535)
canonical overall             3,243 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         304 / 344     (held; frozen at 344 queries)
collision probes                134 / 196     (new; acceptance gate, not a denominator)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS (no invalid code, no unauthorized pairing)
anti-memorization             PASS
\`\`\`

Because R3 reason is not exact, **no clean reason-lock verification was run**: §15
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.`,
    `\`\`\`text
R3 reason                     3,313 / 3,720   (mismatches 407, from 477)
canonical overall             3,313 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         320 / 344     (from 304; frozen at 344 queries)
collision probes                134 / 196     (frozen at 196; held)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS (no invalid code, no unauthorized pairing)
anti-memorization             PASS
\`\`\`

Because R3 reason is not exact, **no clean reason-lock verification was run**: §14
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.

### The residual-conditioned method — C17's correction, applied and vindicated

C17 ended by recording that family-wide precision is the wrong acceptance statistic: a
rule acts on the rows its exact runtime condition matches. C18 built that into a
**rule-effect simulator** run before any coding. Every candidate is scored against the
accepted C17 runtime over all 3,720 rows in four classes: TP_CORRECTED,
FP_CORRECT_ROW_REGRESSION, FP_WRONG_TO_DIFFERENT_WRONG and UNCHANGED, and is
implemented only when it regresses **zero** currently-correct rows.

The simulator paid for itself immediately. Six rules were rejected **before** any runtime
change, including several that look excellent under the old statistic:

\`\`\`text
rule                                        support   TP   FP_correct    net
tax_concept_is_the_requested_subject            204    7          197   -190
expansion_requires_local_reassignment           104   20           81    -61
external_object_governed_by_tax_predicate        92   25           67    -42
question_over_ordinary_no_relation               81   24           57    -33
generic_placeholder_subject_is_tax_task          44   15           29    -14
topic_fragment_without_any_tax_token            121   14            7     +7
\`\`\`

The first would have destroyed **197 correct rows to fix 7**. Under C16/C17 statistics it
would have been an obvious candidate.

### What C18 closed

\`\`\`text
the object complement decides a naming act (§9B)       41 rows — largest single gain
  an imperative acting on an already-named artefact, with no as-identifier complement,
  performs an OPERATION; the naming act requires the complement.

a requested procedural outcome is compliance (§9E)     21 rows
a label relation with no requested operation (§9B)     13 rows
a bare generic placeholder subject is a tax task (§9D) 10 rows
  "the transaction" immediately carrying the predicate names no particular thing; a
  MODIFIED noun phrase ("the company vehicle") does, and is excluded.
\`\`\`

### The one rejected candidate, and why

Iteration 04 simulated the object-complement rule cleanly (support 41, TP 41, zero
regressions) but gated the runtime branch on the **label relation**, which those rows do
not carry — they reach the label family through a display-action branch instead. The
guard never fired and R3 regressed 448 → 454, so the candidate was rejected and the prior
snapshot restored. Iteration 05 re-simulated against the **actual branch predicate** and
landed the full 41 rows plus 14 reason-suite rows.

**Correction carried to C19:** the simulator condition and the runtime branch predicate
must be the *same* predicate. A clean forecast against a condition the branch does not
use is not a forecast at all.

### Collision status

Recomputed over the C18 residual with the additional deterministic features §10 lists
(modal operator, polarity, object complement, direct object, document-local scope,
local-definition operator, naming assignment):

\`\`\`text
residual rows      407
separable          323
colliding           84   across 10 vectors, most dominated by a single reason
\`\`\`

These are recorded as POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT **candidates only**.
C17 already watched one "hard ceiling" fall to feature enrichment, and C18 closed a
41-row group C17 had left colliding — so a shared vector is not yet evidence of an oracle
defect. **No exception was added, R3 was not modified, and no closure is claimed** on
their account. The learnability-conflict path was **not** taken.`],

  // ---- candidate identity ---------------------------------------------------
  [`Best C17 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c17_reason_iteration_05-commit5r1c17-dev-05
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C17_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C17_REASON_LOCK.json
\`\`\`

No verification attempt exists: §15 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`,
    `Best C18 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c18_reason_iteration_05-commit5r1c18-dev-05
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C18_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C18_REASON_LOCK.json
\`\`\`

No verification attempt exists: §14 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c17-incomplete', 'cumulativeThrough:\ncommit5r1c18-incomplete'],
  ['total attempts:\n149', 'total attempts:\n154'],
  ['by category:\ndomain_campaign 85 | focused_suite 13 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 90 | focused_suite 13 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n147 / 2', 'controlling / non-controlling:\n152 / 2'],
  [`COMMIT 5R1-C17 new attempts:
4 (1 reconstruction, 2 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)`,
    `COMMIT 5R1-C17 new attempts:
4 (1 reconstruction, 2 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)

COMMIT 5R1-C18 new attempts:
5 (1 reconstruction, 3 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C18
REASON-LAYER CLOSURE CONTINUATION 18 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C19
REASON-LAYER CLOSURE CONTINUATION 19 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C17 commit as the new starting HEAD',
    'parent chain:             use the pushed C18 commit as the new starting HEAD'],
  ['COMMIT 5R1-C18 must:', 'COMMIT 5R1-C19 must:'],
  [`2. reconstruct the best accepted C17 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,243 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68; reason suite 304 / 344; collision probes 134 / 196) from its preserved attempt snapshot and verify the recorded services tree digest;`,
    `2. reconstruct the best accepted C18 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,313 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68; reason suite 320 / 344; collision probes 134 / 196) from its preserved attempt snapshot and verify the recorded services tree digest;`],
  [`5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 477 reason mismatches, of which 436 are reachable under the enriched feature set; any decision or relation regression rejects the candidate immediately;`,
    `5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 407 reason mismatches, of which 323 are reachable under the extended feature set; every candidate rule must be simulated against the rows its exact runtime branch predicate would change, and rejected on any predicted correct-row regression;`],
  ['COMMIT 5R1-C18 reason-layer closure continuation', 'COMMIT 5R1-C19 reason-layer closure continuation'],

  // ---- layer status ---------------------------------------------------------
  [`reason lock:     NOT ACHIEVED - R3 reason 3,243/3,720 (477 mismatches, from 535;
                 679 at the start of C15); 5 of 5 material iterations used in C17,
                 2 accepted and 1 rejected; no lock verification was run because
                 reason mismatches did not reach zero. The C16 "236 colliding rows"
                 ceiling was disproved: enriched deterministic features cut collisions
                 to 41 and leave 436 of the 477 residual rows reachable for C18.`,
    `reason lock:     NOT ACHIEVED - R3 reason 3,313/3,720 (407 mismatches, from 477;
                 679 at the start of C15); 5 of 5 material iterations used in C18,
                 3 accepted and 1 rejected; no lock verification was run because
                 reason mismatches did not reach zero. C18 introduced a
                 residual-conditioned rule-effect simulator that rejected six rules
                 before implementation, including one that would have regressed 197
                 correct rows to fix 7. 323 of the 407 residual rows remain reachable.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
