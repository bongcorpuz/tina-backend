// PHASE-10A14-R20 COMMIT 5R1-C15 — CURRENT_STATE update (incomplete path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // ---- header block --------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C14
RELATION-LAYER LOCK CONTINUATION — PRIMARY-vs-SUBORDINATE CLAUSE SEGMENTATION
DECISION: INCOMPLETE — RELATION LAYER LOCK ACHIEVED;
          REASON LANE PENDING
\`\`\`

**The relation layer is locked.** The eight-query \`primary_vs_subordinate\` gap carried
forward from C13 is closed, and a separate clean verification campaign against an
unchanged runtime met **all sixteen** lock conditions:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C15
REASON-LAYER CLOSURE AGAINST R3
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing **65 of 679** reason mismatches
(679 → 614). The decision and relation locks were preserved exactly on every accepted
candidate:

\`\`\`text
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
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.

### The reason scoring contract, established before coding

The frozen scorer computes \`out.reasonFamily === r.expectedReasonCodeFamily\` — **strict
equality on one scalar field**, case-sensitive, no aliasing, no list semantics and no
partial credit. Exactly one controlling reason code per evaluation. Decision, reason and
relation are scored **independently**, so reason cannot be repaired by altering a
relation, and no relation was altered to obtain a reason score.

R3 authorizes \`no_tax_relation\` with **both** REFUSE (463 rows) and CLARIFY (100 rows).
That pairing was honoured rather than rejected as unusual. All expected families lie
inside the closed set of eleven; none was added.

### What was closed, and by what principle

\`\`\`text
speech act separates the two REFUSE families      the largest single insight
  explicit_non_tax_task requires a non-tax ACTION to be requested; a QUESTION about
  subject matter carrying no tax relation is explained by no_tax_relation.
  Measured: 12.0% interrogative vs 60.3% (REFUSE) and 100% (CLARIFY).

reason follows the controlling relation           compliance / definition / label
  an explicit filing-or-remittance frame is a compliance task; a definitional verb
  under controlling tax context is a tax definition; an asserted naming act is
  explained by the label relation; a text operation over a term is a quotation act.

what is UNRESOLVED selects the CLARIFY family     50 rows
  a materially ambiguous TOPIC needs the term disambiguated exactly as an ambiguous
  acronym does; an unambiguously tax-domain topic simply has no relation. Both remain
  CLARIFY, so the decision lane is untouched.
\`\`\`

### Why the lane did not close — stated plainly

The 679 failures span **438 distinct templates**; the largest accounts for 10 rows and
the top thirteen cover only 130. There is no small set of high-yield rules left.

Two candidate discriminators were tested and **rejected on the evidence**, not adopted:

\`\`\`text
tax-token presence          24.4% vs 40.8% — does not separate the REFUSE families
homograph token on an       16.7% vs 36.8% — separates in the WRONG direction
  imperative
\`\`\`

The two largest residual groups are **mutually contradictory on near-identical
structure**: "Is the purchase of a cooling fan deductible for income tax?" requires the
generic \`explicit_tax_task_relation\` while "Are receipts from a medical prescription
taxable?" requires \`tax_treatment_of_ordinary_object\`. The oracle's own structured
fields (\`taskVerb\`, \`taskTarget\`, \`nonTaxObjects\`) are null on every row in both
families, so they supply no discriminator, and \`primaryCategory\` is forbidden as a
runtime feature. Closing these rows would require many narrow rules of exactly the kind
the anti-memorization gate exists to reject.

Separability itself is not in doubt: normalizing away trailing enumeration devices
yields 2,675 distinct templates and **zero templates mapping to two different expected
reasons**. The lane is closable in principle; it needs further structural insight, not
more narrow rules.

Residual confusion (614), largest first:

\`\`\`text
232  no_tax_relation            <- explicit_non_tax_task
108  explicit_tax_task_relation <- tax_treatment_of_ordinary_object
 52  tax_treatment_of_ordinary_object <- explicit_tax_task_relation
 47  explicit_non_tax_task      <- no_tax_relation
 41  tax_compliance_task        <- explicit_tax_task_relation
 41  explicit_non_tax_task      <- non_tax_label_or_name
 30  no_tax_relation            <- ambiguous_tax_acronym
\`\`\``],

  // ---- candidate identity ---------------------------------------------------
  [`Locked C14 relation candidate (preserved, not live):

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
**not** R20 PASS. The reason lane has not been started.`,
    `Best C15 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c15_reason_iteration_06-commit5r1c15-dev-06
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C15_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C15_REASON_LOCK.json
\`\`\`

No verification attempt exists: §12 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.

Decision- and relation-layer closure are **not** runtime closure, **not** standalone
closure, and **not** R20 PASS. The reason lane remains open.`],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c14', 'cumulativeThrough:\ncommit5r1c15-incomplete'],
  ['total attempts:\n133', 'total attempts:\n139'],
  ['by category:\ndomain_campaign 69 | focused_suite 13 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 75 | focused_suite 13 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n131 / 2', 'controlling / non-controlling:\n137 / 2'],
  [`COMMIT 5R1-C14 new attempts:
3 (1 reconstruction, 1 material clause/relation iteration,
   1 clean relation-lock verification)`,
    `COMMIT 5R1-C14 new attempts:
3 (1 reconstruction, 1 material clause/relation iteration,
   1 clean relation-lock verification)

COMMIT 5R1-C15 new attempts:
6 (1 reconstruction, 5 material reason iterations;
   no lock verification — reason mismatches did not reach zero)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C15
REASON-LAYER CLOSURE AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C16
REASON-LAYER CLOSURE CONTINUATION 16 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C14 commit as the new starting HEAD',
    'parent chain:             use the pushed C15 commit as the new starting HEAD'],
  ['COMMIT 5R1-C15 must:', 'COMMIT 5R1-C16 must:'],
  [`2. reconstruct the LOCKED C14 relation candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282) from its preserved attempt snapshot and verify the recorded services tree digest;`,
    `2. reconstruct the best accepted C15 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,106 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68) from its preserved attempt snapshot and verify the recorded services tree digest;`],
  [`5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes, closed controls, rich-context guard and anti-memorization — while remediating the reason lane only; any decision or relation regression rejects the candidate immediately;`,
    `5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 614 reason mismatches; any decision or relation regression rejects the candidate immediately;`],
  [`7. require exact decision 3,720 / 3,720, exact relation 3,720 / 3,720, both counterfactual suites fully passing AND a materially reduced reason-mismatch count, plus a separate clean lock-verification run, before declaring a reason lock;`,
    `7. require exact decision 3,720 / 3,720, exact relation 3,720 / 3,720, exact reason 3,720 / 3,720, all suites fully passing, plus a separate clean lock-verification run, before declaring the reason lock;`],
  ['COMMIT 5R1-C15 reason-layer closure', 'COMMIT 5R1-C16 reason-layer closure continuation'],

  // ---- layer status ---------------------------------------------------------
  [`relation lock:   ACHIEVED - R3 relation 3,720/3,720 and relation counterfactual
                 282/282, all 16 lock conditions met, independently verified
reason lock:     not started`,
    `relation lock:   ACHIEVED and PRESERVED - R3 relation 3,720/3,720 and relation
                 counterfactual 282/282, re-verified under the C15 candidate
reason lock:     NOT ACHIEVED - R3 reason 3,106/3,720 (614 mismatches, from 679);
                 5 of 5 material iterations used; no lock verification was run
                 because reason mismatches did not reach zero`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
