// PHASE-10A14-R20 COMMIT 5R1-C20 — CURRENT_STATE update (incomplete path).
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');
const STAMP = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const reps = [
  // ---- timestamp ------------------------------------------------------------
  [/Last updated:\n\n`[^`]+`/, 'Last updated:\n\n`' + STAMP + '`'],

  // ---- header block ---------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C19
BRANCH-IDENTICAL RESIDUAL-CONDITIONED REASON-LAYER CLOSURE
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Five registered
material iterations were used, closing a further **24 of 407** reason mismatches
(407 → 383). Cumulatively across C15 through C19 the lane has moved **679 → 383**. The
decision and relation locks were preserved exactly on every accepted candidate:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C20
PLACEMENT-SAFE SHADOW-OVERRIDE REASON-LAYER CLOSURE CONTINUATION
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
\`\`\`

**The reason lane is not closed and the reason lock is NOT declared.** Four registered
material iterations were used — **all four accepted, none rejected** — closing a further
**112 of 383** reason mismatches (383 → 271). Cumulatively across C15 through C20 the
lane has moved **679 → 271**. This is the largest single-unit gain of the sequence. The
decision and relation locks were preserved exactly on every accepted candidate:`],

  // ---- metrics block --------------------------------------------------------
  [`\`\`\`text
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
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.`,
    `\`\`\`text
R3 reason                     3,449 / 3,720   (mismatches 271, from 383)
canonical overall             3,449 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         320 / 344     (frozen at 344; held)
collision probes                148 / 196     (from 140; frozen at 196)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS (no invalid code, no unauthorized pairing)
anti-memorization             PASS
target equivalence            PASS on all five shipped rules
placement non-interference    PASS — zero drift on every unmatched row
\`\`\`

Because R3 reason is not exact, **no clean reason-lock verification was run**: §17
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.

### C19 iteration-accounting reconciliation (§3), completed before any C20 coding

Recorded in \`COMMIT_5R1C20_C19_ITERATION_ACCOUNTING_RECONCILIATION.json\`:

\`\`\`text
registry increase          154 -> 159 = 5 newly registered campaigns
registered C19 campaigns   1 reconstruction + 4 material (2 accepted, 2 rejected)
orphan directories         0
dangling registered rows   0

commit + CURRENT_STATE     "five registered material iterations"
user-facing report         "2 accepted, 1 rejected, 2 neutral"
reason lock record         materialIterationsUsed 2, rejected 2, ceiling true
registry-backed truth      4 material iterations, 2 accepted, 2 rejected
\`\`\`

**Determination: \`HISTORICAL_ITERATION_ACCOUNTING_DEFECT\`.** No unregistered
evidence-bearing runtime attempt exists, so C20 proceeded. Two distinct miscounts: the
**reconstruction** campaign was counted toward the material budget, and two campaigns
carrying disposition \`rejected\` were described as "neutral". C19 recorded
\`iterationCeilingReached = true\` when only four of five had been used.

**No score, gate, disposition or evidence file is affected**, and C19 files are preserved
exactly as committed. This was the **second consecutive** unit with an accounting defect,
so C20 stopped asserting the count by hand: it is now **derived mechanically** from the
registry by filtering the \`-dev-\` cycle pattern.

### The placement-safe override architecture (§8) — C19's finding answered

C19 established that predicate identity is necessary but **not sufficient**: a rule can
match exactly the right rows and still change others through its placement. C20 answers
that with an architecture rather than a discipline.

The original selector is preserved **byte-identical** as
\`decideTaxBoundaryFromEvidenceOriginal\`. A thin wrapper consults a **pure**
\`resolveGovernedReasonOverride\` and otherwise delegates:

\`\`\`text
const baseline = decideTaxBoundaryFromEvidenceOriginal(evidence);
const override = resolveGovernedReasonOverride({ ...evidence, baselineReason });
if (override != null) return override;
return baseline;
\`\`\`

**No existing branch was replaced, reordered, broadened or narrowed.** Every unmatched row
therefore executes the same code path it did before — which is exactly what the placement
gate asserts, measured on all four observable dimensions:

\`\`\`text
rule                                         unmatched rows   reason   decision   relations   branch sig
token_gloss_assigns_no_identifier                     3,714        0          0           0            0
nominalized_transaction_head_is_tax_task              3,655        0          0           0            0
external_income_item_is_ordinary_object               3,693        0          0           0            0
filipino + issuance (iteration 05)                    3,698        0          0           0            0
\`\`\`

**Every shipped rule landed exactly its shadow forecast: +4, +63, +25, +20.** Across four
iterations the predicted and actual deltas never diverged by a single row.

### What C20 closed

\`\`\`text
nominalized_transaction_head_is_tax_task (§12C)   63 rows — largest single gain
  a nominalized transaction head takes the ordinary object as a genitive or
  prepositional dependent, so the transaction itself is the requested subject. A named
  GAIN or real property is excluded as a governed target in its own right.

external_income_item_is_ordinary_object (§12C)    25 rows
  receipts from a source, or a first-person disclosure of the taxpayer's own item, is an
  external item governed by the tax predicate.

filipino_tax_instrument_is_subject (§12C)         10 rows
  where the tax instrument is the grammatical subject and the object sits inside a
  prepositional scope phrase, the tax itself is the requested subject.

issuance_over_filing_position_is_compliance (§12D) 10 rows
  an issuance applied to a stated filing position asks how the filing must be handled.

token_gloss_assigns_no_identifier (§12E)           4 rows
  a bare token gloss to ordinary subject matter assigns no identifier and requests
  nothing; a gloss whose complement is itself an identifier noun stays with the label
  family.
\`\`\`

### Rules rejected in shadow, before any runtime change

\`\`\`text
rule                                     support   TP   FP_correct   net
finite_directive_requests_operation          225    4          220  -216
nominal_fragment_requests_no_operation        21   12            9    +3
operation_on_named_artefact                   27    0           27   -27
\`\`\`

The first would have regressed **220 correct rows to fix 4**. The second has a positive
net delta and was still rejected, because §10 requires \`FP_CORRECT_ROW_REGRESSION = 0\`.
**No candidate reached the runtime and had to be reverted** — shadow mode caught all three.

### Collision status

Recomputed over the C20 residual:

\`\`\`text
residual rows      271
separable          200
colliding           71   across 7 vectors, most dominated by a single reason
\`\`\`

Recorded as \`POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT\` **candidates only**. Three prior
units each saw a declared ceiling move once features or method improved, so a shared
vector is not evidence of an oracle defect. **No exception was added, R3 was not modified,
and no closure is claimed** on their account. The learnability-conflict path was **not**
taken.`],

  // ---- candidate identity ---------------------------------------------------
  [`Best C19 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c19_reason_iteration_05-commit5r1c19-dev-05
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C19_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C19_REASON_LOCK.json
\`\`\`

No verification attempt exists: §15 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`,
    `Best C20 reason candidate (preserved, not live):

\`\`\`text
candidate attempt:
R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C20_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C20_REASON_LOCK.json
\`\`\`

No verification attempt exists: §17 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.`],

  // ---- registry -------------------------------------------------------------
  ['cumulativeThrough:\ncommit5r1c19-incomplete', 'cumulativeThrough:\ncommit5r1c20-incomplete'],
  ['total attempts:\n159', 'total attempts:\n164'],
  ['by category:\ndomain_campaign 95 | focused_suite 13 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 100 | focused_suite 13 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n157 / 2', 'controlling / non-controlling:\n162 / 2'],
  [`COMMIT 5R1-C19 new attempts:
5 (1 reconstruction, 2 accepted reason iterations, 2 rejected candidates;
   no lock verification — reason mismatches did not reach zero)`,
    `COMMIT 5R1-C19 new attempts:
5 (1 reconstruction, 2 accepted reason iterations, 2 rejected candidates;
   no lock verification — reason mismatches did not reach zero)
   NOTE: C19 reported "five registered material iterations"; the registry-backed count
   is four. See the C19 iteration-accounting reconciliation above.

COMMIT 5R1-C20 new attempts:
5 (1 reconstruction, 4 accepted reason iterations, 0 rejected;
   no lock verification — reason mismatches did not reach zero)`],

  // ---- next task ------------------------------------------------------------
  [`PHASE-10A14-R20 — COMMIT 5R1-C20
REASON-LAYER CLOSURE CONTINUATION 20 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`,
    `PHASE-10A14-R20 — COMMIT 5R1-C21
REASON-LAYER CLOSURE CONTINUATION 21 AGAINST R3
\`\`\`

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:`],
  ['parent chain:             use the pushed C19 commit as the new starting HEAD',
    'parent chain:             use the pushed C20 commit as the new starting HEAD'],
  ['COMMIT 5R1-C20 must:', 'COMMIT 5R1-C21 must:'],
  ['COMMIT 5R1-C20 reason-layer closure continuation', 'COMMIT 5R1-C21 reason-layer closure continuation'],

  // ---- layer status ---------------------------------------------------------
  [`reason lock:     NOT ACHIEVED - R3 reason 3,337/3,720 (383 mismatches, from 407;
                 679 at the start of C15); 5 registered material iterations used in
                 C19, 2 accepted and 2 rejected; no lock verification was run because
                 reason mismatches did not reach zero. C19 made C18's correction
                 structural: each rule is defined once and injected verbatim into the
                 runtime, and both accepted rules landed exactly their forecast with
                 branch equivalence PASS. New finding: branch equivalence does not
                 establish placement safety. 306 of the 383 residual rows remain
                 reachable.`,
    `reason lock:     NOT ACHIEVED - R3 reason 3,449/3,720 (271 mismatches, from 383;
                 679 at the start of C15); 4 registered material iterations used in
                 C20, all four accepted and none rejected; no lock verification was
                 run because reason mismatches did not reach zero. C20 answered C19's
                 finding with an additive pure override seam that leaves the original
                 selector byte-identical, so placement non-interference is provable:
                 zero drift on every unmatched row across all four dimensions. Every
                 shipped rule landed exactly its shadow forecast. 200 of the 271
                 residual rows remain reachable.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (a instanceof RegExp) {
    if (!a.test(s)) { console.log('MISS(regex): ' + a); missed++; } else s = s.replace(a, b);
    continue;
  }
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed, '; timestamp =', STAMP);
