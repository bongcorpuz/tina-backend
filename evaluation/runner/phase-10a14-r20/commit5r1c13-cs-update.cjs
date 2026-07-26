// PHASE-10A14-R20 COMMIT 5R1-C13 — CURRENT_STATE update (incomplete path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // ---- header block --------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C12
DECISION-LAYER COUNTERFACTUAL CLOSURE CONTINUATION 12 AGAINST R3
DECISION: INCOMPLETE — DECISION LAYER LOCK ACHIEVED;
          RELATION AND REASON LANES PENDING
\`\`\`

**Decision lock achieved.** All eleven lock conditions were met and independently
verified in a separate clean verification campaign against an unchanged runtime:

\`\`\`text
R3 decision            3,720 / 3,720
false allows           0
false refusals         0
clarify mismatches     0
counterfactual suite     756 / 756
closed controls        all closed
rich-context guard     7 / 7
focused regression     PASS (every bucket)
anti-memorization      PASS
determinism            PASS (150 queries x 100 reps; drift 0, byte drift 0)
runtime identity       unchanged across verification
\`\`\``,
    `PHASE-10A14-R20 — COMMIT 5R1-C13
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
condition is recorded as **unmet, not waived**.`],

  // ---- candidate identity ---------------------------------------------------
  ['attempt: R20-domain_campaign-r20_commit5r1c12_counterfactual_iteration_05-commit5r1c12-dev-05',
    'attempt: R20-domain_campaign-r20_commit5r1c13_relation_iteration_06-commit5r1c13-dev-06'],
  ['patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C12_LOCKED_CANDIDATE.patch',
    'patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C13_RELATION_CANDIDATE.patch'],
  ['verification attempt: R20-domain_campaign-r20_commit5r1c12_decision_layer_lock_verification-commit5r1c12-lock',
    'verification attempt: R20-focused_suite-r20_commit5r1c13_relation_lock_verification-commit5r1c13-lock'],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c12', 'cumulativeThrough:\ncommit5r1c13-incomplete'],
  ['total attempts:\n122', 'total attempts:\n130'],
  ['by category:\ndomain_campaign 60 | focused_suite 11 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 67 | focused_suite 12 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n120 / 2', 'controlling / non-controlling:\n128 / 2'],
  [`COMMIT 5R1-C12 new attempts:
6 (1 reconstruction, 4 material counterfactual iterations,
   1 clean decision-lock verification)`,
    `COMMIT 5R1-C12 new attempts:
6 (1 reconstruction, 4 material counterfactual iterations,
   1 clean decision-lock verification)

COMMIT 5R1-C13 new attempts:
8 (1 reconstruction, 5 material relation iterations, 1 rejected relation candidate,
   1 clean relation-lock verification)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C13
RELATION-LAYER CLOSURE AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C14
RELATION-LAYER CLOSURE CONTINUATION 14 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C12 commit as the new starting HEAD',
    'parent chain:             use the pushed C13 commit as the new starting HEAD'],
  ['COMMIT 5R1-C13 must:', 'COMMIT 5R1-C14 must:'],
  [`2. reconstruct the LOCKED C12 candidate (R3 decision 3,720 / 3,720; counterfactual 756 / 756) from its preserved attempt snapshot and verify the recorded services tree digest;`,
    `2. reconstruct the accepted C13 relation candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; decision counterfactual 756 / 756) from its preserved attempt snapshot and verify the recorded services tree digest;`],
  [`5. hold the decision lock intact — R3 3,720 / 3,720, counterfactual 756 / 756, closed controls, rich-context guard and anti-memorization — while remediating the relation lane only; any decision regression rejects the candidate immediately;`,
    `5. hold the decision lock AND the closed R3 relation lane intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, counterfactual 756 / 756, closed controls, rich-context guard and anti-memorization — while closing the eight open relation-focused queries; any regression rejects the candidate immediately;`],
  [`7. require exact decision 3,720 / 3,720 AND a fully passing combined counterfactual suite, plus a separate clean lock-verification run, before declaring a lock;`,
    `7. require exact decision 3,720 / 3,720, exact relation 3,720 / 3,720 AND a fully passing relation-focused suite, plus a separate clean lock-verification run, before declaring the relation lock;`],
  ['8. not begin relation or reason work, integration or freeze;',
    '8. not begin reason work, integration or freeze;'],
  ['COMMIT 5R1-C13 relation-layer closure\n→ COMMIT 5R1 relation-layer closure',
    'COMMIT 5R1-C14 relation-layer closure continuation\n→ COMMIT 5R1 relation-layer closure'],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
