// PHASE-10A14-R20 COMMIT 5R1-C19 — CURRENT_STATE update (incomplete path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');
const STAMP = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const reps = [
  // ---- §3: the stale Last updated timestamp -------------------------------
  ['Last updated:\n\n`2026-07-25T12:30:00Z`', 'Last updated:\n\n`' + STAMP + '`'],

  // ---- header block --------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C18
RESIDUAL-CONDITIONED REASON-LAYER CLOSURE CONTINUATION 18 AGAINST R3
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing a further **70 of 477** reason
mismatches (477 → 407). Cumulatively across C15 through C18 the lane has moved
**679 → 407**. The decision and relation locks were preserved exactly on every accepted
candidate:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C19
BRANCH-IDENTICAL RESIDUAL-CONDITIONED REASON-LAYER CLOSURE
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five registered
material iterations were used, closing a further **24 of 407** reason mismatches
(407 → 383). Cumulatively across C15 through C19 the lane has moved **679 → 383**. The
decision and relation locks were preserved exactly on every accepted candidate:`],

  // ---- metrics block --------------------------------------------------------
  [`\`\`\`text
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
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.`,
    `\`\`\`text
R3 reason                     3,337 / 3,720   (mismatches 383, from 407)
canonical overall             3,337 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         320 / 344     (frozen at 344; held)
collision probes                140 / 196     (from 134; frozen at 196)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS (no invalid code, no unauthorized pairing)
anti-memorization             PASS
branch equivalence            PASS on both accepted rules
\`\`\`

Because R3 reason is not exact, **no clean reason-lock verification was run**: §15
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.

### C18 iteration-accounting reconciliation (§3), completed before any C19 coding

C18's committed statements disagreed with each other and with the registry. The
reconciliation is recorded in
\`COMMIT_5R1C19_C18_ITERATION_ACCOUNTING_RECONCILIATION.json\`:

\`\`\`text
registry increase          149 -> 154 = 5 newly registered campaigns
registered C18 campaigns   1 reconstruction + 4 material (3 accepted, 1 rejected)
orphan directories         0
dangling registered rows   0

committed claim (commit + CURRENT_STATE)   "five of five material iterations"
committed claim (reason lock record)       materialIterationsUsed 3, rejected 2
registry-backed truth                      4 material iterations, 3 accepted, 1 rejected
\`\`\`

**Determination: \`HISTORICAL_ITERATION_ACCOUNTING_DEFECT\`.** No unregistered
evidence-bearing runtime attempt exists, so C19 proceeded. The root cause is that
pre-implementation rule **simulations** were counted toward the material-iteration
budget; a simulation allocates no attempt, writes no runtime file and produces no
evidence-bearing campaign, so it is not a material iteration. C18 therefore reported its
budget exhausted when one iteration remained available.

**No score, gate, disposition or evidence file is affected** — every C18 metric was
produced by a registered campaign and is reproducible. C18 files are preserved exactly as
committed; the correction is prospective and recorded here.

### The branch-identical method (§8) — C18's correction made structural

C18 ended by recording that the simulator condition and the runtime branch predicate must
be the same predicate, after a rule that simulated cleanly was gated on a predicate the
controlling branch did not use and regressed R3 448 → 454.

C19 removes that failure mode by construction. Each rule is defined **once** in
\`commit5r1c19-predicates.mjs\` as \`{ principle, assigns, match }\`, and the patch script
**injects the predicate source verbatim** into the runtime. The simulator, the runtime and
the trace harness evaluate byte-identical logic. Equivalence is then asserted:

\`\`\`text
rule                                    simulator   runtime   missing   unexpected
definition_outcome_under_tax_context           14        14         0            0
registration_outcome_is_compliance             10        10         0            0
\`\`\`

Both accepted rules landed **exactly** their forecast: +14 and +10.

### A new finding, carried to C20

**Branch equivalence proves the targeted row set matches; it does not prove the runtime
placement leaves other rows untouched.** Iteration 03 passed equivalence 6 = 6 with zero
missing and zero unexpected, and still regressed R3 393 → 403 — because the branch it
replaced also served 28 rows the predicate never matched, which moved collaterally.
Iteration 04 hoisted the same rule to the head of the decision walk and regressed further,
to 460. Both were rejected and the prior snapshot restored.

Placement safety is therefore a **separate property** from predicate identity, and C20
must verify it explicitly: a rule must be shown not to divert rows outside its matched set.

### What C19 closed

\`\`\`text
definition_outcome_under_tax_context (§10D)   14 rows
  the requested OUTCOME is the meaning of a term asked inside genuine tax context;
  surrounding procedural or compliance vocabulary does not change it. A measured
  exclusion: "what is X WITHIN Y" qualifies, "what is X IN Y" does not — the latter is
  the residual tax task in R3, and admitting it would regress a correct row.

registration_outcome_is_compliance (§10D)     10 rows
  an explicit registration requirement is a procedural compliance outcome; the requested
  outcome controls the family, not the grammatical subject of the question.
\`\`\`

### Rules rejected before implementation

\`\`\`text
rule                                     support   TP   FP_correct   net
general_world_gloss_not_reassignment          92   20           69   -49
bare_topic_fragment_no_operation              18    9            9     0
expansion_requires_local_reassignment          6    5            1    +4
token_gloss_fragment_no_operation              5    4            1    +3
\`\`\`

Two have a **positive net delta** and were still rejected: §9 requires
\`FP_CORRECT_ROW_REGRESSION = 0\`, and a positive net delta with any correct-row
regression remains prohibited.

### Collision status

Recomputed over the C19 residual with eight further deterministic features (§11):
question focus, propositional versus entity target, modal scope, polarity, verb valency,
object-complement type, parenthetical form, token-initial position.

\`\`\`text
residual rows      383
separable          306
colliding           77   across 8 vectors, most dominated by a single reason
\`\`\`

Recorded as \`POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT\` **candidates only**. C17 saw one
declared ceiling fall to enrichment, C18 closed a 41-row group C17 had left colliding, and
C19's added features moved the count again. **No exception was added, R3 was not modified,
and no closure is claimed** on their account. The learnability-conflict path was **not**
taken.`],

  // ---- candidate identity ---------------------------------------------------
  [`Best C18 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c18_reason_iteration_05-commit5r1c18-dev-05
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C18_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C18_REASON_LOCK.json
\`\`\`

No verification attempt exists: §14 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`,
    `Best C19 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c19_reason_iteration_05-commit5r1c19-dev-05
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C19_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C19_REASON_LOCK.json
\`\`\`

No verification attempt exists: §15 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c18-incomplete', 'cumulativeThrough:\ncommit5r1c19-incomplete'],
  ['total attempts:\n154', 'total attempts:\n159'],
  ['by category:\ndomain_campaign 90 | focused_suite 13 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 95 | focused_suite 13 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n152 / 2', 'controlling / non-controlling:\n157 / 2'],
  [`COMMIT 5R1-C18 new attempts:
5 (1 reconstruction, 3 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)`,
    `COMMIT 5R1-C18 new attempts:
5 (1 reconstruction, 3 accepted reason iterations, 1 rejected candidate;
   no lock verification — reason mismatches did not reach zero)
   NOTE: C18 reported "five of five material iterations"; the registry-backed count is
   four material iterations. See the C19 iteration-accounting reconciliation.

COMMIT 5R1-C19 new attempts:
5 (1 reconstruction, 2 accepted reason iterations, 2 rejected candidates;
   no lock verification — reason mismatches did not reach zero)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C19
REASON-LAYER CLOSURE CONTINUATION 19 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C20
REASON-LAYER CLOSURE CONTINUATION 20 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C18 commit as the new starting HEAD',
    'parent chain:             use the pushed C19 commit as the new starting HEAD'],
  ['COMMIT 5R1-C19 must:', 'COMMIT 5R1-C20 must:'],
  [`2. reconstruct the best accepted C18 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,313 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68; reason suite 320 / 344; collision probes 134 / 196) from its preserved attempt snapshot and verify the recorded services tree digest;`,
    `2. reconstruct the best accepted C19 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,337 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68; reason suite 320 / 344; collision probes 140 / 196) from its preserved attempt snapshot and verify the recorded services tree digest;`],
  [`5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 407 reason mismatches, of which 323 are reachable under the extended feature set; every candidate rule must be simulated against the rows its exact runtime branch predicate would change, and rejected on any predicted correct-row regression;`,
    `5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 383 reason mismatches, of which 306 are reachable; every rule must use one shared predicate across simulator and runtime, AND must additionally be shown not to divert rows outside its matched set, which branch equivalence alone does not establish;`],
  ['COMMIT 5R1-C19 reason-layer closure continuation', 'COMMIT 5R1-C20 reason-layer closure continuation'],

  // ---- layer status ---------------------------------------------------------
  [`reason lock:     NOT ACHIEVED - R3 reason 3,313/3,720 (407 mismatches, from 477;
                 679 at the start of C15); 5 of 5 material iterations used in C18,
                 3 accepted and 1 rejected; no lock verification was run because
                 reason mismatches did not reach zero. C18 introduced a
                 residual-conditioned rule-effect simulator that rejected six rules
                 before implementation, including one that would have regressed 197
                 correct rows to fix 7. 323 of the 407 residual rows remain reachable.`,
    `reason lock:     NOT ACHIEVED - R3 reason 3,337/3,720 (383 mismatches, from 407;
                 679 at the start of C15); 5 registered material iterations used in
                 C19, 2 accepted and 2 rejected; no lock verification was run because
                 reason mismatches did not reach zero. C19 made C18's correction
                 structural: each rule is defined once and injected verbatim into the
                 runtime, and both accepted rules landed exactly their forecast with
                 branch equivalence PASS. New finding: branch equivalence does not
                 establish placement safety. 306 of the 383 residual rows remain
                 reachable.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed, '; timestamp =', STAMP);
