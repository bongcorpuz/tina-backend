# CURRENT_STATE.md

## TINA Controlling Continuity Status

Last updated:

`2026-07-25T12:30:00Z`

Repository:

`C:/Projects/tina-backend`

Branch:

`feature/source-availability-engine-v1`

## Current Controlling Phase

```text
PHASE 10 — V1 RELEASE GATES
PHASE 10A — TRUST, LIMITATION AND AUTHORITY-CONFIDENCE CLOSURE
PHASE 10A14-R20 — ACTIVE / IN PROGRESS
```

Phase 10A is OPEN.

R20 is not PASS and is not governance-satisfied.

Phases 10B-M0 through 10E remain gated and must not begin before Phase 10A closure.

## Latest Completed Execution Unit

```text
PHASE-10A14-R20 — COMMIT 5R1-C15
REASON-LAYER CLOSURE AGAINST R3
DECISION: INCOMPLETE — REASON LAYER REMEDIATION NOT CLOSED;
          DECISION AND RELATION LOCKS PRESERVED
```

**The reason lane is not closed and the reason lock is NOT declared.** Five of five
permitted material iterations were used, closing **65 of 679** reason mismatches
(679 → 614). The decision and relation locks were preserved exactly on every accepted
candidate:

```text
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
```

Because R3 reason is not exact, **no clean reason-lock verification was run**: §12
authorizes it only after reason mismatches reach zero. The lane is recorded as **open**.

### The reason scoring contract, established before coding

The frozen scorer computes `out.reasonFamily === r.expectedReasonCodeFamily` — **strict
equality on one scalar field**, case-sensitive, no aliasing, no list semantics and no
partial credit. Exactly one controlling reason code per evaluation. Decision, reason and
relation are scored **independently**, so reason cannot be repaired by altering a
relation, and no relation was altered to obtain a reason score.

R3 authorizes `no_tax_relation` with **both** REFUSE (463 rows) and CLARIFY (100 rows).
That pairing was honoured rather than rejected as unusual. All expected families lie
inside the closed set of eleven; none was added.

### What was closed, and by what principle

```text
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
```

### Why the lane did not close — stated plainly

The 679 failures span **438 distinct templates**; the largest accounts for 10 rows and
the top thirteen cover only 130. There is no small set of high-yield rules left.

Two candidate discriminators were tested and **rejected on the evidence**, not adopted:

```text
tax-token presence          24.4% vs 40.8% — does not separate the REFUSE families
homograph token on an       16.7% vs 36.8% — separates in the WRONG direction
  imperative
```

The two largest residual groups are **mutually contradictory on near-identical
structure**: "Is the purchase of a cooling fan deductible for income tax?" requires the
generic `explicit_tax_task_relation` while "Are receipts from a medical prescription
taxable?" requires `tax_treatment_of_ordinary_object`. The oracle's own structured
fields (`taskVerb`, `taskTarget`, `nonTaxObjects`) are null on every row in both
families, so they supply no discriminator, and `primaryCategory` is forbidden as a
runtime feature. Closing these rows would require many narrow rules of exactly the kind
the anti-memorization gate exists to reject.

Separability itself is not in doubt: normalizing away trailing enumeration devices
yields 2,675 distinct templates and **zero templates mapping to two different expected
reasons**. The lane is closable in principle; it needs further structural insight, not
more narrow rules.

Residual confusion (614), largest first:

```text
232  no_tax_relation            <- explicit_non_tax_task
108  explicit_tax_task_relation <- tax_treatment_of_ordinary_object
 52  tax_treatment_of_ordinary_object <- explicit_tax_task_relation
 47  explicit_non_tax_task      <- no_tax_relation
 41  tax_compliance_task        <- explicit_tax_task_relation
 41  explicit_non_tax_task      <- non_tax_label_or_name
 30  no_tax_relation            <- ambiguous_tax_acronym
```

```text
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
```

**Relation-layer closure is not runtime closure and is not R20 PASS.** The reason lane
has not been started.

### The clause-layer correction

The cause was in segmentation, exactly as C13 recorded. The comma split fired only when
the word AFTER the comma was a connector, so a LEADING concessive — whose marker sits at
the START of the sentence — never produced a split, and the whole sentence became one
`primary_task` clause. The concessive tax context then supplied the task relation.

Four coordinated corrections, all structural:

```text
1. split at the top-level comma closing a leading concessive, but only when the
   remainder is a COMPLETE requested task (imperative, interrogative or request);
2. demote a leading concessive clause in primary-task scoring so the main requested
   clause controls, by clause role and never by clause order alone;
3. scope relation building: a tax predicate confined to concessive context does not
   build the controlling task relation over an ordinary primary task;
4. scope taxRelationOverPrimaryTarget, which was computed over the WHOLE text and so
   let a concessive predicate claim the primary target in the decision layer.
```

The split inherits quote- and parenthesis-awareness because it is evaluated inside the
existing scanner where quote state and paren depth are already tracked. Commas inside
quotes, commas inside parentheses, ordinary list commas, and leading concessives with an
incomplete remainder all correctly do NOT split, and each is fixed by a probe.

### Probe adjudication

Three probe expectations were authored and then found to assert **pre-existing baseline
behaviour outside the authorized C14 scope**. Each was verified against the untouched C13
baseline, where it behaves identically with no concessive present, and was then reduced
to assert only the segmentation structure:

```text
"how is X taxed?"                  refuses at baseline: "taxed" is not in the
                                   tax-anchor vocabulary (lexical gap, not clause layer)
quoted-comma probe                 QUOTES_TERM not emitted at baseline for this shape
trailing (non-leading) concessive  out of scope; §7A authorizes the LEADING form only
```

They were **not deleted and not weakened into passes** — they still fix the no-split
behaviour so a later unit cannot regress it silently. No runtime change was made to
manufacture a pass for any of them.

Best C15 reason candidate (preserved, not live):

```text
candidate attempt:
R20-domain_campaign-r20_commit5r1c15_reason_iteration_06-commit5r1c15-dev-06
patch:
evaluation/results/phase-10a14-r20/COMMIT_5R1C15_BEST_REASON_CANDIDATE.patch
record:
evaluation/results/phase-10a14-r20/COMMIT_5R1C15_REASON_LOCK.json
```

No verification attempt exists: §12 authorizes a clean reason-lock verification only
after reason mismatches reach zero, and they did not.

Decision- and relation-layer closure are **not** runtime closure, **not** standalone
closure, and **not** R20 PASS. The reason lane remains open.

R3 remains canonical and unchanged:

```text
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54
rows = 3,720
```

Reconstructed locked C12 base (new governed campaign, controlling):

```text
canonical overall = 3,028 / 3,720
R3 decision       = 3,720 / 3,720
relation passed   = 3,558 / 3,720   (162 mismatches)
reason mismatches =   631
decision counterfactual = 756 / 756
reconstruction discrepancies = 0 (exact identity match on all nine metrics)
```

The C12 dev-05 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest `184119a7…`, and only an authorized runtime file
differed from the live baseline.

Reconstructed locked C14 base (new governed campaign, controlling):

```text
canonical overall = 3,041 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,041 / 3,720   (679 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reconstruction discrepancies = 0 (exact identity match on every metric)
```

The C14 dev-02 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest `e34842a9…`, and only an authorized runtime file
differed from the live baseline.

Best accepted C15 reason candidate:

```text
canonical overall = 3,106 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,106 / 3,720   (614 mismatches, from 679)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344   (from 278)
```

### The relation scoring contract, established before coding

The frozen scorer computes `expectedRels.every(rt => actual.includes(rt))`. This is
**set containment on the relation field only**: `source`, `target`, `clauseId` and
`evidenceSpan` do not affect scoring, order and duplicates are irrelevant, and an empty
expectation passes unconditionally. It follows that an extra relation can never fail a
row, so **all 162 baseline mismatches were missing-only** (`extraOnlyRows = 0`), and the
lane closes by emitting absent relations rather than suppressing present ones.
`ASKS_TAX_TREATMENT_OF` is never required by any R3 row.

### The four structural causes

```text
EXPANDS_AS_NON_TAX          48   declarative equational expansion was unrecognised
REQUESTS_NON_TAX_ACTION_ON  46   the relation was gated on a VERB list, so a verbless
                                 ordinary noun phrase produced no relation at all
ASKS_VAT_TREATMENT_OF       45   selection ORDER: compliance and withholding branches
                                 were tested before VAT
ASKS_DEFINITION_OF          23   definition intent scoped by an in/within tax context
```

Every one of the 162 rows already carried the **correct decision**; the lane was a pure
relation-emission gap and no decision change was needed to close it.

### The controlling architectural finding

Two early-return paths — the homograph veto and the acronym-redefinition guard —
returned with **no relation at all**, leaving their refusals ungrounded. The precedence
spec requires every decision to rest on a relation with an evidence span. Grounding
those exits, and hoisting the declarative-redefinition test above the veto so a
tax-shaped token can still be redefined locally, closed 24 of the last 34 rows.

Decision confusion on the best candidate:

```text
false allows        = 0
false refusals      = 0
clarify mismatches  = 0
```

The decision lock was enforced as a hard invariant on every C13 candidate. **Two
candidates regressed it and were rejected outright**: one drove R3 decision to 3,714 with
6 false refusals by reading "Define X as used in a BIR assessment" as a local
redefinition, and one drove it to 3,710 with 10 clarify mismatches by grounding a bare
ambiguous acronym as ordinary subject matter instead of leaving it in the clarification
lane. Each was diagnosed and corrected within its own iteration, and **no candidate
carrying a decision regression was ever registered as an accepted base**.

Remaining decision counterfactual failures by suite:

```text
v3  0 / 331
v4  0 / 177
v5  0 / 134
v6  0 / 114
```

Anti-memorization and suite integrity in C13:

```text
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

The C12 terminology separation is retained: canonical Philippine tax terms that coincide
with bare-term R3 rows remain recorded as domain vocabulary, not memorization.
```

Counterfactual expectation adjudication:

```text
The 19-row pre-coding contract carried forward the C11 adjudication: every row was
previously assessed as structurally valid. No counterfactual expectation was edited in
C12, and the suite denominator was not increased — closure is 756/756 on the existing
suite with no new controlling queries added.
```

Closed decision controls — all preserved at every accepted iteration:

```text
tax_compliance_task             108 / 108
acronym_homograph_control       200 / 200
ambiguous_clarification_control 150 / 150
internal_label_proper_name      104 / 104
quoted_term_only                closed
```

Counterfactual controls:

```text
combined v3+v4+v5+v6 suite preserved and rerun: 756 queries / 419 pairs
no new decision queries were added: the existing suite is the controlling closure set
exact R3 query leakage = 0
locked C14 candidate result = 756 / 756  (v3 331/331, v4 177/177, v5 134/134, v6 114/114)

relation-focused suite v7 FROZEN and unmodified in C14: 296 authored queries / 148 pairs
282 controlling / 14 visible non-controlling probes — denominator unchanged
locked C14 candidate result = 282 / 282
exact R3 and v3-v6 leakage = 0

new clause-segmentation probe suite: 68 probes / 34 pairs
acceptance gate only; explicitly NOT part of the 282-query denominator
locked C14 candidate result = 68 / 68
exact R3, decision-suite and relation-suite leakage = 0
```

Remaining structural clusters:

```text
none in the decision or relation lanes - both remain closed and locked
R3 decision 3,720 / 3,720 | R3 relation 3,720 / 3,720
decision counterfactual 756 / 756 | relation counterfactual 282 / 282 | probes 68 / 68
the reason lane remains OPEN: 614 mismatches across a long tail of templates
```

The reason residual is genuinely long-tailed. The 679 baseline failures spanned 438
distinct templates, the largest accounting for 10 rows; 65 were closed by three
structural principles and the remainder need further insight rather than more narrow
rules. The two largest residual groups are mutually contradictory on near-identical
structure, and the oracle's own `taskVerb`, `taskTarget` and `nonTaxObjects` fields are
null on every row in both, so they supply no discriminator. Full analysis is preserved in
`COMMIT_5R1C15_REASON_MISMATCH_INVENTORY.json`,
`COMMIT_5R1C15_REASON_CONFUSION_MATRIX.json` and
`COMMIT_5R1C15_REASON_PRECEDENCE_MATRIX.json`.

Adjudication of the relation-focused residual is recorded in full in
`COMMIT_5R1C13_RELATION_SUITE_ADJUDICATION.md`. Of 33 residual failures, 16 were my own
suite's **over-strict forbidden lists**, which contradicted the frozen scorer's
containment semantics, and 9 were **unauthorized authored expectations** on invented
acronyms with no R3 counterpart; those 9 are retained in the file as non-controlling
probes rather than deleted, so the withdrawal stays visible. The remaining 8 are the
genuine open gap. **No expectation was edited to manufacture a pass and the denominator
was not increased.**

Two authored expectations were also found to contradict R3 during the pre-coding phase
and were corrected in R3's favour: the Filipino "i-withhold ang buwis sa X" frame
requires `ASKS_VAT_TREATMENT_OF`, and `no_tax_relation` with `CLARIFY` is a pairing R3
authorizes in 100 rows — there the integrity **gate** was wrong, not the runtime.

No relation work remains. The `primary_vs_subordinate` family that C13 carried forward
as OPEN is closed in C14 by the clause-layer correction:

```text
"Although the <tax object> is taxable, rename the <ordinary> folder."
expected  REFUSE + REQUESTS_NON_TAX_ACTION_ON
actual    REFUSE + REQUESTS_NON_TAX_ACTION_ON   (8 / 8)
clauses   c01 role=context "Although the <tax object> is taxable,"
          c02 role=primary_task "rename the <ordinary> folder."
```

C13 diagnosed this correctly: the segmenter emitted the whole sentence as one
`primary_task` clause. The correction splits a leading concessive at its closing
top-level comma when the remainder is a complete requested task, demotes the concessive
clause in primary-task scoring, and scopes both the relation build and the
`taxRelationOverPrimaryTarget` decision flag so a predicate confined to concessive
context cannot claim the primary target. No exact-query, object-name, family-name or
expected-decision shortcut was used; the correction is entirely structural.

Remaining Phase 10A work is the reason lane, then standalone closure, then integration
and runtime freeze.

Material iterations: 5 of 5 permitted were used, all accepted. Three candidates
regressed R3 reason during development (742, 687 and 685 against a 679 baseline) and
each was narrowed against measured evidence within its own iteration before acceptance;
no candidate carrying a regression was registered as an accepted base. No clean
reason-lock verification was run, because §12 authorizes it only after reason mismatches
reach zero.

Rich-context regression guard (introduced after the C9 iteration-06 regression on richer
RMC-issuance questions) — final state of all seven shapes:

```text
bare_term                      ALLOW
recognized_acronym             CLARIFY
acronym_with_issuance_context  ALLOW
acronym_with_procedure_context ALLOW
ordinary_homograph             REFUSE
richer_tax_sentence            ALLOW
metadata_suffixed_contentless  REFUSE
```

Verification gates run against the locked candidate:

```text
decision-focused regression   PASS (every bucket)
anti-memorization             PASS (no complete counterfactual or R3 query, no query hash,
                              no oracle id, no suite/family/cluster feature, no scenario
                              number, no expected-decision map)
decision determinism          PASS (150 queries x 100 reps; drift 0, byte drift 0)
rich-context guard            PASS on all seven shapes
clean lock verification       PASS - all eleven lock conditions met, identity unchanged
```

Principal architectural findings:

```text
1. A tax-compliance relation requires a tax-domain object, institution or procedure at the
   relation-building stage, not merely at the decision layer. The procedural word alone
   (return, due, file, claim, registration, list, output, assessment) carries an ordinary
   sense that keeps its own domain.
2. A governed tax predicate over the primary target defeats every domain guard - the
   controlling relation decides, not the domain of a surrounding noun. This now holds
   uniformly across the domain-noun veto, the controlling-domain guard and the homograph
   veto.
3. A named statute, code or instrument inside a tax question is subject matter and
   survives the homograph veto; assigning one as a name remains label binding.
4. A contract question whose requested subject is the tax treatment itself is a tax
   question about that clause; the domain guards exist for contractual remedies.
5. A tax-canonical acronym is self-resolving only when no metadata-only referent frames
   it; a for-item suffix supplies no subject and stays materially ambiguous.
8. A governed tax predicate stops the label and contentless guards from displacing a real
   tax question, but the styling/program-artefact guard yields only when the artefact is
   the OBJECT of a commercial tax transaction: a tax-shaped word that names or defines an
   artefact is a homograph.
9. The homograph veto is defeated only by a subordinate code or tag clause under a
   governed tax predicate, never by the mere presence of a tax predicate.
10. Operator precedence matters in guard expressions: a negation followed by an
    unparenthesised alternation guards only the first alternative. The label-binding
    alternation had this defect and was the last counterfactual failure.
6. A metadata-suffixed query is contentless when the clause left after stripping the
   suffix has no subject of its own. Naming a tax does not supply a subject, so the
   discriminator is a non-deictic subject, not the presence of a tax term.
7. A governed tax predicate over a definite noun-phrase subject, a prepositional target,
   a nominalised transaction or an antecedent-resolved deictic all name real targets.
```

Layer status:

```text
decision lock:   ACHIEVED and PRESERVED - R3 3,720/3,720 and counterfactual 756/756,
                 re-verified under the C13 candidate
relation lock:   ACHIEVED and PRESERVED - R3 relation 3,720/3,720 and relation
                 counterfactual 282/282, re-verified under the C15 candidate
reason lock:     NOT ACHIEVED - R3 reason 3,106/3,720 (614 mismatches, from 679);
                 5 of 5 material iterations used; no lock verification was run
                 because reason mismatches did not reach zero
standalone:      not achieved
integration:     not performed
freeze:          not performed
```

Runtime:

```text
not integrated
not frozen
runtimeMutable = true
live services restored to the committed COMMIT 3 baseline
tracked diff over services/ and tests/ = 0 bytes
```

Preserved candidate:

```text
attempt: R20-domain_campaign-r20_commit5r1c13_relation_iteration_06-commit5r1c13-dev-06
snapshot: the attempt's runtime-snapshot directory
patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C13_RELATION_CANDIDATE.patch
verification attempt: R20-focused_suite-r20_commit5r1c13_relation_lock_verification-commit5r1c13-lock
```

All rejected and superseded iterations are preserved in their own attempt directories.

## Prior Execution Unit — COMMIT 5R1-C7-P1

```text
PHASE-10A14-R20 — COMMIT 5R1-C7-P1
PREFLIGHT RUNTIME-IDENTITY RECONCILIATION,
RESIDUE RECOVERY AND ROADMAP CANONICALIZATION
DECISION: COMPLETE
```

This unit existed because the attempted COMMIT 5R1-C7 preflight correctly stopped before
runtime reconstruction, attempt allocation, oracle execution, semantic remediation or any
repository modification. It cleared the preflight ambiguity without losing evidence.

Canonical oracle:

```text
R3, unchanged
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54
```

Runtime:

```text
committed COMMIT 3 baseline
not integrated
not frozen
runtimeMutable = true
```

Analyzer identity:

```text
classification: CRLF_WORKTREE_NORMALIZATION_ONLY
```

The earlier stop compared a raw working-tree SHA-256 against a Git blob SHA-1. Those are
different hash functions over different byte streams and can never be equal. Under
`core.autocrlf=true` the working tree holds CRLF while the blob holds LF. No drift existed
and no restoration was required or performed.

```text
raw working-tree SHA-256:   0f67e16e4377aac9e46287ca59e90825926949fe19bea2eea56c408662702484
Git blob (SHA-1):           a23364bc6a31196d2fb5d9f1299ab069d84b5ca1
normalized-LF identity:     8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308
                            (working tree, blob content and raw blob all equal)
byte-length delta:          697, exactly the CRLF pair count
index flag:                 H (no assume-unchanged, no skip-worktree)
attributes/filters:         none applying to the path
module load / exports:      PASS, all nine required exports present
```

Identity policy adopted for C7: the Git blob SHA-1 remains the canonical committed identity,
and content identity is asserted on normalized-LF SHA-256 wherever `core.autocrlf=true` applies.

Root residue:

```text
4 files inventoried (tmp_full.mjs, tmp_probe.mjs, tmp_r3.mjs, tmp_r3fails.json)
0 duplicate of committed evidence
4 uniquely recovered and preserved with sidecar metadata
0 remaining at repository root
0 sensitive findings
```

All four were C6-era ad-hoc diagnostic scratch files. Exact bytes were copied to
`evaluation/results/phase-10a14-r20/commit5r1c7p1-recovered-residue/root-files/` and destination
hashes verified equal to source before removal. They are marked non-controlling and must not be
executed. The single secret-scan regex hit was the literal word "tokens" inside the synthetic
non-tax benchmark query `board game pricing tokens mechanic` (oracleId `R20N-ENT-0556`), not a
credential.

Roadmap:

```text
knowledge/TINA_Updated_Roadmap_v7.md
tracked
SHA-256: 235cc3366b018b74fa252d8c5f7546b5ed3abd4b43b2be3a0a9e1cbf8cfb6daa
Phase 10A absolute blocker preserved
18 major phases preserved
```

The roadmap was read in full before any classification or write. Its stated C6 results match the
committed evidence. It is strategic governance only: not a legal authority, not a runtime oracle,
not a test-expectation source, and not authorization to bypass Phase 10A, ingest or promote
sources, deploy or commercialize.

Git parent chain:

```text
23df8e8aa098bd4518fbbccbebfd50c3ee14b7da -> 1a8abdd098a5bc93ce0371a0ed0b056f712501cd
```

The prior C7 prompt stated a mandatory parent of `08990106993262cc5fdb4ad8b77b17aa3cf479dd`.
That was a prompt defect, not a repository defect; `08990106` is the parent of C5.

Registry:

```text
prior attempts:          55 (all preserved and unchanged)
new C7-P1 attempts:       2 (both synthetic_validator, controlling)
total attempts:          57
domain campaigns:         0 registered in this unit
oracle executed:          false
cumulativeThrough = commit5r1c7p1
runtimeClosure = false
decisionLayerClosure = false
closureComplete = true
orphan = 0
dangling = 0
```

R20 remains IN PROGRESS.
Phase 10A remains OPEN.
The preflight reconciliation is not decision closure and is not R20 PASS.

## Prior Execution Unit

```text
PHASE-10A14-R20 — COMMIT 5R1-C6
DECISION-LAYER CLOSURE CONTINUATION 6 AGAINST R3
DECISION: INCOMPLETE — DECISION LAYER REMEDIATION NOT CLOSED
```

Canonical oracle:

```text
R3, unchanged
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54
```

Reconstructed accepted C5 candidate:

`2,959 / 3,720` overall (decision 3,415 / 3,720)

Best governed C6 decision candidate:

`3,464 / 3,720` decisions (overall 3,009 / 3,720)

Remaining decision mismatches:

`256`

Layer status:

```text
decision lock:   not achieved (best decision 3,464/3,720)
relation lock:   not started
reason lock:     not started
standalone:      not achieved
integration:     not performed
freeze:          not performed
```

Best accepted candidate (dev-02) mismatch matrix:

```text
overall passed:            3,009 / 3,720
decision mismatches:       256
relation mismatches:       209  (side effect; not remediated in C6)
reason mismatches:         710  (side effect; not remediated in C6)
material false allows:      72
material false refusals:   143
clarify mismatches:         41
metamorphic groups passed:  72 / 100
```

Decision controls closed by the accepted candidate:

```text
tax_compliance_task decisions:          108 / 108
acronym_homograph_control decisions:    200 / 200
ambiguous_clarification_control:        150 / 150 decision-correct
internal_label_proper_name:             104 / 104 decision-correct
counterfactual controls (combined):     369 / 400  (existing 189/200, extension 180/200)
```

Note: the combined counterfactual suite is 369/400 on the accepted candidate
(improved from the reconstructed base's 322/400); the 400/400 target belongs to the
final decision-locked candidate, which was not reached.

Runtime:

```text
not integrated
not frozen
runtimeMutable = true
live services restored to the committed baseline
```

Agent availability:

```text
Gemini 2.5 Pro: unavailable in this environment (not fabricated)
substitute non-controlling challenger: Sonnet 5 (recorded, advisory only)
controlling decision issued by: Opus 4.8 (primary executor)
```

Atomic-write safety:

```text
in-repo atomic source-write protocol used (no scratchpad Temp write-back);
guard passed before/after every evidence-bearing execution; no zero-byte
or truncation incident; live runtime equals the committed baseline after restore.
```

C6 accepted decision-lane change (two coherent steps):

```text
1. priority-1 clusters — quotation-scope guard (a text operation on a quoted
   tax term -> QUOTES_TERM/REFUSE), non-tax-domain-noun expansion (text box,
   CSS class, private lease/contract, computer file, function), extended
   label-binding (named/keep/store + report filename) with a bare-acronym-label
   carve-out;
2. Context-N contentless referent (a bare compliance/treatment attribute with a
   trailing "Context N" tag and no concrete object -> no_tax_relation/REFUSE).
Decisions 3,415 -> 3,464; all closed controls preserved; false-refusals held 143.
```

Remaining decision clusters (for C7):

```text
- ALLOW->REFUSE concrete-tax anchoring (104; heterogeneous "other" tail);
- CONTEXTUAL_ACRONYM_MISCLASSIFIED (102);
- residual decision tail;
these carry documented false-allow versus false-refusal trade risk.
```

Preserved candidates and controls:

```text
reconstructed accepted 2,959 (dev-01):
  attempt: R20-domain_campaign-r20_commit5r1c6_reconstructed_2959_candidate-commit5r1c6-dev-01
accepted best decision candidate 3,464 / overall 3,009 (dev-02):
  attempt: R20-domain_campaign-r20_commit5r1c6_development_iteration_02-commit5r1c6-dev-02
C6 decision confusion matrix (diagonal 3,415) + updated 11-cluster partition preserved;
combined 400-query / 200-pair / 10-family counterfactual controls (369/400 on candidate);
runtime snapshots + patches preserved in the attempt directories (not applied to services/)
```

The accepted candidate is not a Decision Layer Lock and is not a PASS.

## Why COMMIT 4R3 Was Required

COMMIT 5R1-C1 proved that canonical R2 contained:

```text
14 conflicting query templates
140 affected rows
10 siblings per template
9/1 reason-family split per template
14 irreducible deterministic failures
R2 deterministic ceiling: 3,706 / 3,720
```

The conflict affected frozen reason-family expectations only.

Queries, canonical decisions, expected relations, coverage classes and row order were not changed.

R2 was preserved as immutable historical evidence.

## Canonical Oracle Chain

### V1

```text
path:
evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json

SHA-256:
0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263

status:
IMMUTABLE HISTORICAL DEVELOPMENT EVIDENCE
```

### R1

```text
path:
evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/
R20_DEVELOPMENT_ORACLE_FROZEN_R1.json

SHA-256:
ba0163932fc64d59070d8bba93a23645d03598abb07d612cea25607684503f1f

status:
IMMUTABLE HISTORICAL DEVELOPMENT EVIDENCE
```

### R2

```text
path:
evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/
R20_DEVELOPMENT_ORACLE_FROZEN_R2.json

SHA-256:
1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd

status:
IMMUTABLE HISTORICAL DEVELOPMENT EVIDENCE
SUPERSEDED FOR FUTURE DEVELOPMENT SCORING BY R3
```

### R3 — Current Canonical Development Oracle

```text
path:
evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/
R20_DEVELOPMENT_ORACLE_FROZEN_R3.json

SHA-256:
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54

rows:
3,720

template conflicts resolved:
14 / 14

affected rows reviewed:
140 / 140

rows changed from R2:
102

query changes:
0

decision changes:
0

expected-relation changes:
0

row-order changes:
0

unaffected-row changes:
0

remaining template conflicts:
0

status:
FROZEN CANONICAL DEVELOPMENT EVIDENCE FOR R20 RUNTIME REMEDIATION
NOT INDEPENDENT
NOT UNSEEN
NOT A HOLDOUT
```

## Runtime State

The live runtime remains the committed COMMIT 3 baseline:

```text
services/philippine-tax-intent-analyzer.js
Git blob:
a23364bc6a31196d2fb5d9f1299ab069d84b5ca1

services/philippine-tax-domain-boundary.js
Git blob:
97986ed7c9a05f74db44b60c8766f9ab45b96a7d

services/philippine-tax-boundary-patterns.js
Git blob:
d98e63992bfa7d4b21acea7bb03fa62ffbf9827a
```

Current runtime status:

```text
standalone analyzer scaffold only
not integrated into production boundary
runtimeMutable = true
runtime freeze = NOT ACHIEVED
production integration = NOT PERFORMED
model = gpt-4o-mini
```

## Preserved Runtime-Remediation Evidence

```text
R2 baseline (historical):
1,089 / 3,720

R2 reconstructed candidate (historical):
2,674 / 3,720

R2 best COMMIT 5R1-C1 candidate (historical):
2,777 / 3,720

R3 reconstructed dev-02 (governed):
2,716 / 3,720

R3 best COMMIT 5R1-C2 candidate (governed):
2,819 / 3,720

R3 best COMMIT 5R1-C3 candidate (governed):
2,870 / 3,720

R3 best COMMIT 5R1-C4 candidate — overall (governed):
2,955 / 3,720

R3 best COMMIT 5R1-C4 result — decision layer (governed):
3,439 / 3,720

R3 best COMMIT 5R1-C5 candidate — overall (governed):
2,959 / 3,720

R3 best COMMIT 5R1-C5 result — decision layer (governed):
3,415 / 3,720

R3 best COMMIT 5R1-C6 candidate — overall (governed):
3,009 / 3,720

R3 best COMMIT 5R1-C6 result — decision layer (governed):
3,464 / 3,720
```

The R2 scores are historical only.

The best current governed R3 candidate is the accepted COMMIT 5R1-C6 dev-02 candidate at
3,009 / 3,720 overall (decision layer 3,464 / 3,720), preserved as its attempt runtime-snapshot
(with its patch from the reconstructed 2,959 base and hashes). It closed the priority-1 decision
clusters (quotation-scope, non-tax-action, label-binding) and the Context-N contentless referent,
preserving all decision controls (tax_compliance_task 108/108, acronym_homograph_control 200/200,
ambiguous_clarification_control 150/150, internal_label_proper_name 104/104) and holding
false-refusals at 143. The reconstructed accepted 2,959 base is preserved as the COMMIT 5R1-C6
dev-01 attempt.

None is applied to the live `services/` tree; the live runtime is the committed baseline.
COMMIT 5R1-C7 must resume from the accepted 3,464-decision candidate.

## Current Evidence Registry

```text
cumulativeThrough:
commit5r1c15-incomplete

runtimeClosure:
false

decisionLayerClosure:
true

total attempts:
139

by category:
domain_campaign 75 | focused_suite 13 | other 9 | synthetic_validator 42

controlling / non-controlling:
137 / 2

COMMIT 5R1-C6 new attempts:
4

COMMIT 5R1-C7-P1 new attempts:
2 (synthetic_validator, controlling; no domain campaign, no oracle execution)

COMMIT 5R1-C7 new attempts:
12 (1 reconstruction, 5 material decision iterations, 1 counterfactual suite,
    1 decision-focused regression, 1 anti-overfit, 1 determinism, 2 analysis)

COMMIT 5R1-C8 new attempts:
9 (1 reconstruction, 5 material decision iterations,
   1 decision-focused regression, 1 anti-overfit, 1 determinism)

COMMIT 5R1-C9 new attempts:
10 (1 preserved technical failure, 1 reconstruction, 5 material decision iterations,
    1 decision-focused regression, 1 anti-overfit, 1 determinism)

COMMIT 5R1-C10 new attempts:
10 (1 reconstruction, 5 material decision iterations, 1 clean lock verification,
    1 decision-focused regression, 1 anti-overfit, 1 determinism)

COMMIT 5R1-C11 new attempts:
18 (1 reconstruction, 5 material counterfactual iterations, 1 flat superseded,
    1 anti-overfit remediation, 2 clean lock verifications,
    2 decision-focused regressions, 3 anti-overfit, 3 determinism)

COMMIT 5R1-C12 new attempts:
6 (1 reconstruction, 4 material counterfactual iterations,
   1 clean decision-lock verification)

COMMIT 5R1-C13 new attempts:
8 (1 reconstruction, 5 material relation iterations, 1 rejected relation candidate,
   1 clean relation-lock verification)

COMMIT 5R1-C14 new attempts:
3 (1 reconstruction, 1 material clause/relation iteration,
   1 clean relation-lock verification)

COMMIT 5R1-C15 new attempts:
6 (1 reconstruction, 5 material reason iterations;
   no lock verification — reason mismatches did not reach zero)

closureComplete:
true

orphan results:
0

dangling attempts:
0
```

All prior attempts and failed/incomplete development states remain immutable.

## Next Exact Task

```text
PHASE-10A14-R20 — COMMIT 5R1-C16
REASON-LAYER CLOSURE CONTINUATION 16 AGAINST R3
```

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:

```text
analyzer identity policy: Git blob canonical; normalized-LF content identity accepted
                          where core.autocrlf=true applies
working-tree drift:       none unresolved
root residue:             none
roadmap:                  tracked strategic governance
parent chain:             use the pushed C15 commit as the new starting HEAD
```

COMMIT 5R1-C16 must:

1. verify R3 and all immutable history;
2. reconstruct the best accepted C15 reason candidate (R3 decision 3,720 / 3,720; R3 relation 3,720 / 3,720; R3 reason 3,106 / 3,720; decision counterfactual 756 / 756; relation counterfactual 282 / 282; clause probes 68 / 68) from its preserved attempt snapshot and verify the recorded services tree digest;
3. execute it as a new governed R3 campaign and preserve the actual result;
4. preserve all C7 through C10 analysis and the combined counterfactual v3+v4+v5+v6 controls;
5. hold the decision lock AND the relation lock intact — R3 decision 3,720 / 3,720, R3 relation 3,720 / 3,720, decision counterfactual 756 / 756, relation counterfactual 282 / 282, clause probes 68 / 68, closed controls, rich-context guard and anti-memorization — while closing the remaining 614 reason mismatches; any decision or relation regression rejects the candidate immediately;
6. permit up to five new material decision iterations;
7. require exact decision 3,720 / 3,720, exact relation 3,720 / 3,720, exact reason 3,720 / 3,720, all suites fully passing, plus a separate clean lock-verification run, before declaring the reason lock;
8. not begin standalone closure, integration or freeze;
9. update CURRENT_STATE as the final substantive change;
10. commit, push and STOP.

Do not add exact-row exceptions. Do not name COMMIT 6 as the next task.

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.
Decision closure is not runtime closure. COMMIT 6 becomes the next task only after standalone
closure, integration and a successful runtime freeze in later units.

## Remaining Phase 10A Sequence

```text
COMMIT 5R1-C16 reason-layer closure continuation
→ reason-layer closure
→ standalone overall closure
→ integration and runtime freeze
→ COMMIT 6 post-freeze campaigns and focused evidence
→ deterministic clean cycles
→ staging clean cycles
→ R20 Independent Review 1 by Codex 5.5
→ E2
→ A15 final Phase 10A closure gate
```

Any material failure inserts another governed remediation.

Do not give a fixed remaining task count.

## Hard Constraints

```text
No V1/R1/R2/R3 expectation edit after freeze.
No runtime exact-query or oracle-ID special casing.
No model call, embeddings or network inside the boundary classifier.
No source ingestion, reindexing or corpus/vector update without separate authorization.
No production deployment before the applicable release gate.
No COMMIT 6 before runtime freeze.
No E2 or A15 before R20 independent review passes.
No Phase 10B-M0 or later phase before Phase 10A closure.
```

## Current Staging and Corpus Baseline

```text
backend service:
tina-backend-staging

environment:
staging

indexingRunning:
false

vector store:
5,346 chunks / 102 sources
```

No DB, indexing, RAG, vector, corpus or ingestion update occurred in R20.

## Phase 10 Roadmap Position

```text
10A     ACTIVE / OPEN
10A14   ACTIVE
R20     IN PROGRESS

10B-M0 through 10B-M6   NOT STARTED / GATED
10B-T                    NOT STARTED / GATED
10B                      NOT STARTED / GATED
10C                      NOT STARTED / GATED
10C-T                    NOT STARTED / GATED
10D                      FORMAL GATE NOT STARTED
10E                      FORMAL GATE NOT STARTED
```

R20 is a Philippine-tax domain-boundary classifier remediation.

R20 does not replace the future canonical terminology registry, acronym-resolution architecture, tax ontology, proposition-level grounding, legal-reliance controls or production-security gates.

## Source of Truth

Use this priority:

```text
1. committed Git evidence and frozen artifacts
2. knowledge/CURRENT_STATE.md
3. knowledge/TINA_Updated_Roadmap_v7.md
4. controlling roadmap workbook
5. conversation continuity
```

When CURRENT_STATE.md conflicts with committed evidence, committed evidence controls.

When a roadmap statement conflicts with committed execution evidence, committed evidence controls.
The roadmap is strategic governance: it is not a legal authority, not a runtime oracle, not a
test-expectation source, and not authorization to bypass Phase 10A, ingest or promote sources,
deploy or commercialize TINA.
