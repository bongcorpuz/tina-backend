# PHASE-10A14-R20 — COMMIT 5R1-C18

## Security and Scope Attestation

Unit: residual-conditioned reason-layer closure continuation 18 against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `dce33b974370a6b215b06b2d5f82b15893a86af0` (parent `288223a3…`).

---

## Outcome — reason lane NOT closed; both prior locks preserved

```text
R3 reason                     3,313 / 3,720   (mismatches 407, from 477)
canonical overall             3,313 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         320 / 344     (from 304; frozen)
collision probes                134 / 196     (frozen; held)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS
anti-memorization             PASS
```

Five of five permitted material iterations were used — **three accepted, one rejected**.
70 of 477 mismatches closed; cumulatively across C15–C18 the lane has moved
**679 → 407**. **The reason lock is not declared.** Per §14 a clean reason-lock
verification is authorized only after reason mismatches reach zero, so **no verification
campaign was run**; its absence is recorded rather than substituted.

## The residual-conditioned method, and what it caught

C17 ended by recording that family-wide precision is the wrong acceptance statistic. C18
built that correction into a **rule-effect simulator** executed before any coding: every
candidate is scored against the accepted C17 runtime over all 3,720 rows in the four
mandated classes, and implemented only when it regresses zero currently-correct rows.

Six rules were rejected **before any runtime change**:

```text
rule                                        support   TP   FP_correct    net
tax_concept_is_the_requested_subject            204    7          197   -190
expansion_requires_local_reassignment           104   20           81    -61
external_object_governed_by_tax_predicate        92   25           67    -42
question_over_ordinary_no_relation               81   24           57    -33
generic_placeholder_subject_is_tax_task          44   15           29    -14
topic_fragment_without_any_tax_token            121   14            7     +7
```

The first would have destroyed **197 correct rows to fix 7** — and it is exactly the kind
of rule that looks compelling under a family-wide statistic. The last has a *positive*
net delta and was still rejected, because §7 requires `FP_CORRECT_ROW_REGRESSION = 0`.

## Rules implemented, each simulated regression-free

- **The object complement decides a naming act (§9B)** — 41 rows, the largest single
  gain. An imperative acting on an already-named artefact, with no as-identifier
  complement, performs an operation; the naming act requires the complement.
- **A requested procedural outcome is a compliance task (§9E)** — 21 rows.
- **A label relation with no requested operation (§9B)** — 13 rows.
- **A bare generic placeholder subject is a tax task (§9D)** — 10 rows. "The transaction"
  immediately carrying the predicate names no particular thing; a modified noun phrase
  ("the company vehicle") does, and is excluded.

## The rejected candidate, and the correction it produced

Iteration 04 simulated the object-complement rule cleanly (support 41, TP 41, zero
regressions) but gated the runtime branch on the **label relation**, which those rows do
not carry — they reach the label family through a display-action branch. The guard never
fired, R3 regressed 448 → 454, and the candidate was **rejected with the prior snapshot
restored**. Iteration 05 re-simulated against the **actual branch predicate** and landed
the full 41 rows plus 14 reason-suite rows.

**Correction carried to C19:** the simulator condition and the runtime branch predicate
must be the same predicate. A clean forecast against a condition the branch does not use
is not a forecast at all.

## Collision status — §10

Recomputed over the C18 residual with the additional deterministic features §10 lists
(modal operator, polarity, object complement, direct object, document-local scope,
local-definition operator, naming assignment):

```text
residual rows      407
separable          323
colliding           84   across 10 vectors, most dominated by a single reason
```

Recorded as `POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT` **candidates only**. C17 watched
one "hard ceiling" fall to feature enrichment, and C18 closed a 41-row group C17 had left
colliding, so a shared vector is not yet evidence of an oracle defect. **No exception was
added, R3 was not modified, and no closure is claimed** on their account. The
learnability-conflict path was **not** taken.

## Prohibited controls — none used

```text
primaryCategory or other oracle metadata     not used
expected reason                              not used
source set / oracle or query ID              not used
template identity / complete query text      not used
exact object-name list                       not used
suite / family / cluster name                not used
mere tax-token presence                      not used
mere homograph presence                      not used
```

No rule branches on a serialized feature vector as a surrogate query identity. Every
implemented rule states a human-readable linguistic principle and matches ≥ 10 R3 rows
across multiple templates and lexical fillers. Oracle identifiers appear only inside
analysis JSON, explicitly labelled analysis evidence.

## Oracle and suite integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited.
- **Reason suite v8 frozen and unmodified** — 344 queries / 172 pairs; 0-byte diff.
- **C17 collision probes frozen and unmodified** — 196 probes; 0-byte diff.
- The 756-query decision suite, 282-query relation suite and 68 clause probes unchanged.
- No expectation deleted, no failure removed, no denominator increased.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.
- No relation was altered to make reason selection easier; the relation lane stays exact.

## Reconstruction identity

The accepted C17 dev-05 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`90983f5784a52b16c70138b0ce4475f1da5386317ae803e4c510a35e87601841`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**:
canonical 3,243, decision 3,720/3,720, relation 3,720/3,720, reason 477 mismatches,
decision counterfactual 756/756, relation counterfactual 282/282, clause probes 68/68,
reason suite 304/344, collision probes 134/196 — 0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c18tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a
runtime write. One patch script raised a syntax error (unescaped backticks in a template
literal); it was caught before any runtime write and corrected. No broken runtime was
ever scored or registered. No zero-byte, truncation or unexplained-write incident
occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No standalone closure. No integration. No freeze. The best candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Best candidate preserved as `COMMIT_5R1C18_BEST_REASON_CANDIDATE.patch` and in an
  immutable attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access. No new dependency.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 149 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision and relation layers are locked; the reason lane is open and carried to C19
with 323 of 407 residual rows measured as reachable.
