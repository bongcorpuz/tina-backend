// PHASE-10A14-R20 COMMIT 5R1-C14 — CURRENT_STATE update (success path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // ---- header block --------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C13
RELATION-LAYER CLOSURE AGAINST R3
DECISION: INCOMPLETE — R3 RELATION LANE CLOSED;
          RELATION LOCK NOT DECLARED; REASON LANE NOT STARTED
\`\`\`

**The R3 relation lane is closed: 3,720 / 3,720, zero mismatches, from a baseline of
162.** The decision lock was preserved exactly throughout. A separate clean verification
campaign against an unchanged runtime met **thirteen of the fourteen** lock conditions:

\`\`\`text
R3 decision                 3,720 / 3,720
R3 relation                 3,720 / 3,720   (mismatches 0)
false allows                0
false refusals              0
clarify mismatches          0
decision counterfactual       756 / 756
relation counterfactual       274 / 282     <-- UNMET
closed controls             all closed
rich-context guard          7 / 7
focused relation regression PASS (every relation type fully satisfied)
anti-memorization           PASS
reason integrity            PASS (no invalid code, no unauthorized pairing)
determinism                 PASS (15,000 evaluations; decision drift 0, relation drift 0)
runtime identity            unchanged across verification
\`\`\`

**The relation lock is NOT declared.** The lock additionally requires the complete
relation-focused suite to pass. Eight of 282 controlling queries still fail, and that
condition is recorded as **unmet, not waived**.`,
    `PHASE-10A14-R20 — COMMIT 5R1-C14
RELATION-LAYER LOCK CONTINUATION — PRIMARY-vs-SUBORDINATE CLAUSE SEGMENTATION
DECISION: INCOMPLETE — RELATION LAYER LOCK ACHIEVED;
          REASON LANE PENDING
\`\`\`

**The relation layer is locked.** The eight-query \`primary_vs_subordinate\` gap carried
forward from C13 is closed, and a separate clean verification campaign against an
unchanged runtime met **all sixteen** lock conditions:

\`\`\`text
R3 decision                 3,720 / 3,720
R3 relation                 3,720 / 3,720   (mismatches 0)
false allows                0
false refusals              0
clarify mismatches          0
decision counterfactual       756 / 756
relation counterfactual       282 / 282     (denominator unchanged)
clause-segmentation probes     68 / 68      (34 pairs; not part of the denominator)
closed controls             all closed
rich-context guard          7 / 7
focused relation regression PASS (every relation type fully satisfied)
clause-schema regression    PASS (positional ids, exactly one primary_task, stable)
anti-memorization           PASS
reason integrity            PASS
determinism                 PASS (15,000 evaluations; decision drift 0, relation drift 0)
runtime identity            unchanged across verification
\`\`\`

**Relation-layer closure is not runtime closure and is not R20 PASS.** The reason lane
has not been started.

### The clause-layer correction

The cause was in segmentation, exactly as C13 recorded. The comma split fired only when
the word AFTER the comma was a connector, so a LEADING concessive — whose marker sits at
the START of the sentence — never produced a split, and the whole sentence became one
\`primary_task\` clause. The concessive tax context then supplied the task relation.

Four coordinated corrections, all structural:

\`\`\`text
1. split at the top-level comma closing a leading concessive, but only when the
   remainder is a COMPLETE requested task (imperative, interrogative or request);
2. demote a leading concessive clause in primary-task scoring so the main requested
   clause controls, by clause role and never by clause order alone;
3. scope relation building: a tax predicate confined to concessive context does not
   build the controlling task relation over an ordinary primary task;
4. scope taxRelationOverPrimaryTarget, which was computed over the WHOLE text and so
   let a concessive predicate claim the primary target in the decision layer.
\`\`\`

The split inherits quote- and parenthesis-awareness because it is evaluated inside the
existing scanner where quote state and paren depth are already tracked. Commas inside
quotes, commas inside parentheses, ordinary list commas, and leading concessives with an
incomplete remainder all correctly do NOT split, and each is fixed by a probe.

### Probe adjudication

Three probe expectations were authored and then found to assert **pre-existing baseline
behaviour outside the authorized C14 scope**. Each was verified against the untouched C13
baseline, where it behaves identically with no concessive present, and was then reduced
to assert only the segmentation structure:

\`\`\`text
"how is X taxed?"                  refuses at baseline: "taxed" is not in the
                                   tax-anchor vocabulary (lexical gap, not clause layer)
quoted-comma probe                 QUOTES_TERM not emitted at baseline for this shape
trailing (non-leading) concessive  out of scope; §7A authorizes the LEADING form only
\`\`\`

They were **not deleted and not weakened into passes** — they still fix the no-split
behaviour so a later unit cannot regress it silently. No runtime change was made to
manufacture a pass for any of them.`],

  // ---- candidate identity ---------------------------------------------------
  [`Accepted C13 relation candidate (preserved, not live):

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
**not** R20 PASS. The relation lock is not declared and the reason lane is not started.`,
    `Locked C14 relation candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c14_clause_relation_iteration_02-commit5r1c14-dev-02
verification attempt:
R20-focused_suite-r20_commit5r1c14_relation_lock_verification-commit5r1c14-lock
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C14_RELATION_LOCKED_CANDIDATE.patch
lock record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C14_RELATION_LOCK.json
\`\`\`

Relation-layer closure is **not** runtime closure, **not** standalone closure, and
**not** R20 PASS. The reason lane has not been started.`],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c13-incomplete', 'cumulativeThrough:\ncommit5r1c14'],
  ['total attempts:\n130', 'total attempts:\n133'],
  ['by category:\ndomain_campaign 67 | focused_suite 12 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 69 | focused_suite 13 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n128 / 2', 'controlling / non-controlling:\n131 / 2'],
  [`COMMIT 5R1-C13 new attempts:
8 (1 reconstruction, 5 material relation iterations, 1 rejected relation candidate,
   1 clean relation-lock verification)`,
    `COMMIT 5R1-C13 new attempts:
8 (1 reconstruction, 5 material relation iterations, 1 rejected relation candidate,
   1 clean relation-lock verification)

COMMIT 5R1-C14 new attempts:
3 (1 reconstruction, 1 material clause/relation iteration,
   1 clean relation-lock verification)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C14
RELATION-LAYER CLOSURE CONTINUATION 14 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C15
REASON-LAYER CLOSURE AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C13 commit as the new starting HEAD',
    'parent chain:             use the pushed C14 commit as the new starting HEAD'],
  ['COMMIT 5R1-C14 must:', 'COMMIT 5R1-C15 must:'],
  [`2. reconstruct the accepted C13 relation candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; decision counterfactual 756 / 756) from its preserved attempt snapshot and verify the recorded services tree digest;`,
    `2. reconstruct the LOCKED C14 relation candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282) from its preserved attempt snapshot and verify the recorded services tree digest;`],
  [`5. hold the decision lock AND the closed R3 relation lane intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, counterfactual 756 / 756, closed controls, rich-context guard and anti-memorization — while closing the eight open relation-focused queries; any regression rejects the candidate immediately;`,
    `5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes, closed controls, rich-context guard and anti-memorization — while remediating the reason lane only; any decision or relation regression rejects the candidate immediately;`],
  [`7. require exact decision 3,720 / 3,720, exact relation 3,720 / 3,720 AND a fully passing relation-focused suite, plus a separate clean lock-verification run, before declaring the relation lock;`,
    `7. require exact decision 3,720 / 3,720, exact relation 3,720 / 3,720, both counterfactual suites fully passing AND a materially reduced reason-mismatch count, plus a separate clean lock-verification run, before declaring a reason lock;`],
  ['8. not begin reason work, integration or freeze;',
    '8. not begin standalone closure, integration or freeze;'],
  ['COMMIT 5R1-C14 relation-layer closure continuation\n→ COMMIT 5R1 relation-layer closure',
    'COMMIT 5R1-C15 reason-layer closure'],

  // ---- layer status ---------------------------------------------------------
  [`relation lock:   NOT DECLARED - R3 relation closed at 3,720/3,720 with 0 mismatches,
                 13 of 14 lock conditions met; the relation-focused suite condition
                 is unmet at 274/282 and is recorded as unmet, not waived
reason lock:     not started`,
    `relation lock:   ACHIEVED - R3 relation 3,720/3,720 and relation counterfactual
                 282/282, all 16 lock conditions met, independently verified
reason lock:     not started`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
