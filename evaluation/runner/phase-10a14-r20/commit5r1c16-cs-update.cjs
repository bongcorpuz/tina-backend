// PHASE-10A14-R20 COMMIT 5R1-C16 — CURRENT_STATE update (incomplete path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // ---- header block --------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C15
REASON-LAYER CLOSURE AGAINST R3
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing **65 of 679** reason mismatches
(679 → 614). The decision and relation locks were preserved exactly on every accepted
candidate:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C16
REASON-LAYER CLOSURE CONTINUATION 16 AGAINST R3
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing a further **79 of 614** reason
mismatches (614 → 535). Cumulatively across C15 and C16 the lane has moved
**679 → 535**. The decision and relation locks were preserved exactly on every accepted
candidate:`],

  // ---- metrics block --------------------------------------------------------
  [`\`\`\`text
R3 reason                     3,106 / 3,720   (mismatches 614, from 679)
canonical overall             3,106 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         304 / 344     (from 278)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS (no invalid code, no unauthorized pairing)
anti-memorization             PASS
\`\`\`

Because R3 reason is not exact, **no clean reason-lock verification was run**: §12
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.`,
    `\`\`\`text
R3 reason                     3,185 / 3,720   (mismatches 535, from 614)
canonical overall             3,185 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         304 / 344     (held; frozen at 344 queries)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS (no invalid code, no unauthorized pairing)
anti-memorization             PASS
\`\`\`

Because R3 reason is not exact, **no clean reason-lock verification was run**: §13
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.

### The measured separability ceiling — the controlling C16 result

C16 opened with the mandated pre-coding separability analysis rather than more regexes.
Every residual row was described by **runtime-available structural features only**
(speech act, clause role, predicate class, controlling relation, target semantic role,
unresolved kind, negation scope), and the 614 rows were grouped by their feature vector:

\`\`\`text
distinct residual feature vectors     69
rows in SEPARABLE vectors            378   all residual rows in the vector share one expected reason
rows in COLLIDING vectors            236   the same vector carries two or more expected reasons
\`\`\`

**This is a hard ceiling, not an effort limit.** Two rows with identical runtime evidence
that require different reasons cannot be separated by any rule over that evidence. The
three largest colliding vectors alone hold 176 rows:

\`\`\`text
n=87  assertion|none|REQUESTS_NON_TAX_ACTION_ON|none   no_tax_relation 84 | explicit_non_tax_task 3
n=49  request  |none|REQUESTS_NON_TAX_ACTION_ON|none   explicit_non_tax_task 38 | no_tax_relation 11
n=40  question |none|REQUESTS_NON_TAX_ACTION_ON|none   no_tax_relation 26 | explicit_non_tax_task 13
\`\`\`

The full analysis is preserved in \`COMMIT_5R1C16_REASON_FEATURE_SEPARABILITY.json\`,
\`COMMIT_5R1C16_REASON_MINIMAL_PAIR_ANALYSIS.json\` and the measured decision table in
\`COMMIT_5R1C16_REASON_DECISION_TABLE.md\`. **C16 predicted this ceiling in writing before
coding** and closed 79 of the 378 reachable rows.

### What was closed, and by what measured principle

\`\`\`text
typed reason evidence (§8)                       a reason-evidence layer derived only
  from the locked clause and relation evidence: speech act, action head and target,
  predicate class, controlling relation, target role, unresolved kind.

an OPERATION was requested (§9A)                 the REFUSE split
  a clause-initial imperative head naming something to act on, OR an advice/creative
  question, OR a local-redefinition assertion. Otherwise the refusal is explained by
  the absent tax relation. Measured precision 0.898 over 453 support.

the action head controls (§9B)                   64 rows
  an ordinary operation on a labelled artefact is an action, not a naming act; an
  asserted naming act carries no action head (precision 1.000, 0 counterexamples).

the requested OUTCOME controls (§9D)             41 rows
  which form applies, whether registration is required, what penalty attaches to late
  compliance. The C15 finding that substantiation wording is TREATMENT is preserved.

the object of ambiguity controls (§9E)           30 rows
  a raised topic is materially ambiguous only when the term has a live NON-TAX sense.
\`\`\`

### A rule measured, tried, and rejected

The §9C target-role conjunction (a specific treatment relation **and** an identified
ordinary object) measured **74.5% against 7.8%** — the sharpest single discriminator
found. Implemented, it regressed the suite 304 → 242 and R3 575 → 652, because its
coverage in situ is far below its precision. **The candidate was rejected and the prior
snapshot restored.** A plain external-object test was measured at 34.8% vs 51.3% and was
never implemented, per §7's prohibition on weakly separated rules.

Residual confusion (535), largest first:

\`\`\`text
116  no_tax_relation            <- explicit_non_tax_task
108  explicit_tax_task_relation <- tax_treatment_of_ordinary_object
108  explicit_non_tax_task      <- no_tax_relation
 52  tax_treatment_of_ordinary_object <- explicit_tax_task_relation
 41  explicit_non_tax_task      <- non_tax_label_or_name
 23  non_tax_label_or_name      <- explicit_non_tax_task
 22  no_tax_relation            <- non_tax_expansion
\`\`\``],

  // ---- candidate identity ---------------------------------------------------
  [`Best C15 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c15_reason_iteration_06-commit5r1c15-dev-06
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C15_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C15_REASON_LOCK.json
\`\`\`

No verification attempt exists: §12 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`,
    `Best C16 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c16_reason_iteration_06-commit5r1c16-dev-06
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C16_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C16_REASON_LOCK.json
\`\`\`

No verification attempt exists: §13 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c15-incomplete', 'cumulativeThrough:\ncommit5r1c16-incomplete'],
  ['total attempts:\n139', 'total attempts:\n145'],
  ['by category:\ndomain_campaign 75 | focused_suite 13 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 81 | focused_suite 13 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n137 / 2', 'controlling / non-controlling:\n143 / 2'],
  [`COMMIT 5R1-C15 new attempts:
6 (1 reconstruction, 5 material reason iterations;
   no lock verification — reason mismatches did not reach zero)`,
    `COMMIT 5R1-C15 new attempts:
6 (1 reconstruction, 5 material reason iterations;
   no lock verification — reason mismatches did not reach zero)

COMMIT 5R1-C16 new attempts:
6 (1 reconstruction, 4 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C16
REASON-LAYER CLOSURE CONTINUATION 16 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C17
REASON-LAYER CLOSURE CONTINUATION 17 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C15 commit as the new starting HEAD',
    'parent chain:             use the pushed C16 commit as the new starting HEAD'],
  ['COMMIT 5R1-C16 must:', 'COMMIT 5R1-C17 must:'],
  [`2. reconstruct the best accepted C15 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,106 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68) from its preserved attempt snapshot and verify the recorded services tree digest;`,
    `2. reconstruct the best accepted C16 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,185 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68; reason suite 304 / 344) from its preserved attempt snapshot and verify the recorded services tree digest;`],
  [`5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 614 reason mismatches; any decision or relation regression rejects the candidate immediately;`,
    `5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 535 reason mismatches; any decision or relation regression rejects the candidate immediately;`],
  ['COMMIT 5R1-C16 reason-layer closure continuation', 'COMMIT 5R1-C17 reason-layer closure continuation'],

  // ---- layer status ---------------------------------------------------------
  [`reason lock:     NOT ACHIEVED - R3 reason 3,106/3,720 (614 mismatches, from 679);
                 5 of 5 material iterations used; no lock verification was run
                 because reason mismatches did not reach zero`,
    `reason lock:     NOT ACHIEVED - R3 reason 3,185/3,720 (535 mismatches, from 614;
                 679 at the start of C15); 5 of 5 material iterations used in C16,
                 4 accepted and 1 rejected; no lock verification was run because
                 reason mismatches did not reach zero. A measured separability
                 ceiling of 236 colliding rows is recorded for C17.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
