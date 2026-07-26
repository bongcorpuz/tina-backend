// PHASE-10A14-R20 COMMIT 5R1-C17 — CURRENT_STATE update (incomplete path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // ---- header block --------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C16
REASON-LAYER CLOSURE CONTINUATION 16 AGAINST R3
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing a further **79 of 614** reason
mismatches (614 → 535). Cumulatively across C15 and C16 the lane has moved
**679 → 535**. The decision and relation locks were preserved exactly on every accepted
candidate:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C17
REASON OBSERVABILITY ENRICHMENT AND REASON-LAYER CLOSURE CONTINUATION
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing a further **58 of 535** reason
mismatches (535 → 477). Cumulatively across C15, C16 and C17 the lane has moved
**679 → 477**. The decision and relation locks were preserved exactly on every accepted
candidate:`],

  // ---- metrics block --------------------------------------------------------
  [`\`\`\`text
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
coding** and closed 79 of the 378 reachable rows.`,
    `\`\`\`text
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
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.

### The controlling C17 result — the C16 ceiling was a feature defect, and it broke

C16 recorded 236 residual rows in colliding feature vectors and characterised that as a
hard ceiling. **§6 of the C17 specification called it a feature-observability defect, and
the measurement confirms that reading.** Recomputed over the 535 residual rows using
enriched deterministic features — question/request/assertion subtype, predicate
attachment and argument structure, requested-outcome class, target syntactic and semantic
role, topic completeness, discourse attachment:

\`\`\`text
                          vectors   separable rows   colliding rows
C16 feature set                69              325              210
ENRICHED feature set          131              494               41
collision reduction                                             169
\`\`\`

The reachable ceiling rose from 325 to **494 of 535 rows**. Per-feature collision
reduction, each added singly to the C16 set:

\`\`\`text
requestedOutcomeClass       110      questionOperator             37
requestOperationClass        84      assertionClass               34
targetSemanticRole           71      contextAttachment            26
topicCompleteness            57      predicateArgumentStructure   16
                                     predicateAttachment          10
                                     ambiguityObject               0
\`\`\`

\`ambiguityObject\` reduces nothing on its own and was **not implemented** as a control.

Recomputed at the end of C17 against the new 477-row residual, so C18 inherits current
evidence: C16 features 284 separable / 193 colliding; enriched features **436 separable /
41 colliding**.

### §8 learnability stop condition — assessed, not asserted

Four vectors totalling 41 rows remain identical across all enriched features while
requiring different reasons:

\`\`\`text
n=23   no_tax_relation  3 | explicit_non_tax_task 20
n=11   no_tax_relation  1 | explicit_non_tax_task 10
n= 4   no_tax_relation  2 | explicit_non_tax_task  2
n= 3   no_tax_relation  2 | non_tax_expansion      1
\`\`\`

Three of the four are strongly dominated by one reason. Because enrichment removed 169 of
the 210 C16 collisions, these are **not yet demonstrated** to be oracle defects — a
further deterministic feature may still separate them. They are recorded as
\`POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT\` **candidates only**, preserved in full, with
**no exception added, no oracle change, and no closure claimed** on their account.

Evidence: \`COMMIT_5R1C17_REASON_OBSERVABILITY_AUDIT.json\`,
\`COMMIT_5R1C17_COLLISION_GROUP_ANALYSIS.json\`,
\`COMMIT_5R1C17_ENRICHED_SEPARABILITY_BASELINE.json\`,
\`COMMIT_5R1C17_ENRICHED_FEATURE_SPEC.md\`.`],

  // ---- what closed ----------------------------------------------------------
  [`### What was closed, and by what measured principle

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
\`\`\``,
    `### What C17 closed, and by what measured principle

\`\`\`text
reason-observability layer V2 (§9)               read-only over everything locked
  requestedOutcomeClass, requestOperationClass and targetSemanticRole published from a
  deterministic parse of the primary clause and the locked relation output. It changes
  no clause segmentation, no decision, no relation and no relation object.

explicit DENIAL of tax relevance (P4)            48 rows — the largest single gain
  an utterance that explicitly denies tax relevance and asks for something else is a
  positively requested non-tax task, not the absence of a relation. Two enriched
  separable vectors; precedence step 7 places negation ahead of the absence step.

asserted naming act reaches the label family     23 rows
  the label relation is already emitted and the assertion class confirms the primary
  act reports what something is called rather than requesting an operation on it.

acronym operand is a term operand                11 rows
  a transformation whose operand is a recognised acronym handles that token as text,
  which is a quotation act; an explicit term marker is not the only signal.
\`\`\`

### Rules measured and REJECTED in C17

\`\`\`text
compliance outcome classes         form_selection 55.4%, deadline 44.6%, penalty (bare)
                                   0.0% — admitted only registration/remittance/
                                   penalty-for-late at 100%, which proved already covered.
naming operation class             routing every naming-class operation to the label
                                   family mislabels 46 R3 rows: "rename the X folder" is
                                   an OPERATION on an already named artefact (§10B).
target semantic role               receipt_income 86.3% and asset 84.4% measured over the
                                   whole family, but those rows already largely pass, so
                                   the rule flipped correct rows: R3 535 -> 566.
                                   Rejected and the prior snapshot restored.
\`\`\`

A methodological correction carried to C18: family-wide precision is **not** the right
statistic. A rule acts on the *residual*, so it must be measured against the failing rows
it would move, not against every row of the family.`],

  // ---- candidate identity ---------------------------------------------------
  [`Best C16 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c16_reason_iteration_06-commit5r1c16-dev-06
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C16_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C16_REASON_LOCK.json
\`\`\`

No verification attempt exists: §13 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`,
    `Best C17 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c17_reason_iteration_05-commit5r1c17-dev-05
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C17_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C17_REASON_LOCK.json
\`\`\`

No verification attempt exists: §15 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c16-incomplete', 'cumulativeThrough:\ncommit5r1c17-incomplete'],
  ['total attempts:\n145', 'total attempts:\n149'],
  ['by category:\ndomain_campaign 81 | focused_suite 13 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 85 | focused_suite 13 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n143 / 2', 'controlling / non-controlling:\n147 / 2'],
  [`COMMIT 5R1-C16 new attempts:
6 (1 reconstruction, 4 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)`,
    `COMMIT 5R1-C16 new attempts:
6 (1 reconstruction, 4 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)

COMMIT 5R1-C17 new attempts:
4 (1 reconstruction, 2 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C17
REASON-LAYER CLOSURE CONTINUATION 17 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C18
REASON-LAYER CLOSURE CONTINUATION 18 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C16 commit as the new starting HEAD',
    'parent chain:             use the pushed C17 commit as the new starting HEAD'],
  ['COMMIT 5R1-C17 must:', 'COMMIT 5R1-C18 must:'],
  [`2. reconstruct the best accepted C16 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,185 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68; reason suite 304 / 344) from its preserved attempt snapshot and verify the recorded services tree digest;`,
    `2. reconstruct the best accepted C17 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,243 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68; reason suite 304 / 344; collision probes 134 / 196) from its preserved attempt snapshot and verify the recorded services tree digest;`],
  [`5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 535 reason mismatches; any decision or relation regression rejects the candidate immediately;`,
    `5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 477 reason mismatches, of which 436 are reachable under the enriched feature set; any decision or relation regression rejects the candidate immediately;`],
  ['COMMIT 5R1-C17 reason-layer closure continuation', 'COMMIT 5R1-C18 reason-layer closure continuation'],

  // ---- layer status ---------------------------------------------------------
  [`reason lock:     NOT ACHIEVED - R3 reason 3,185/3,720 (535 mismatches, from 614;
                 679 at the start of C15); 5 of 5 material iterations used in C16,
                 4 accepted and 1 rejected; no lock verification was run because
                 reason mismatches did not reach zero. A measured separability
                 ceiling of 236 colliding rows is recorded for C17.`,
    `reason lock:     NOT ACHIEVED - R3 reason 3,243/3,720 (477 mismatches, from 535;
                 679 at the start of C15); 5 of 5 material iterations used in C17,
                 2 accepted and 1 rejected; no lock verification was run because
                 reason mismatches did not reach zero. The C16 "236 colliding rows"
                 ceiling was disproved: enriched deterministic features cut collisions
                 to 41 and leave 436 of the 477 residual rows reachable for C18.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
