# PHASE-10A14-R20 — COMMIT 5R1-C19

## Security and Scope Attestation

Unit: branch-identical residual-conditioned reason-layer closure.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `7ea15b24acae4246007ddf21ce05c6ee86d86a52` (parent `dce33b97…`).

---

## Outcome — reason lane NOT closed; both prior locks preserved

```text
R3 reason                     3,337 / 3,720   (mismatches 383, from 407)
canonical overall             3,337 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         320 / 344     (frozen; held)
collision probes                140 / 196     (from 134; frozen)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS
anti-memorization             PASS
branch equivalence            PASS on both accepted rules
```

Five registered material iterations — **two accepted, two rejected**. 24 of 407
mismatches closed; cumulatively across C15–C19 the lane has moved **679 → 383**. **The
reason lock is not declared.** Per §15 a clean reason-lock verification is authorized only
after reason mismatches reach zero, so **no verification campaign was run**; its absence
is recorded rather than substituted.

## §3 — C18 iteration-accounting reconciliation, completed before any coding

C18's committed statements disagreed with each other and with the registry:

```text
registry increase          149 -> 154 = 5 newly registered campaigns
registered C18 campaigns   1 reconstruction + 4 material (3 accepted, 1 rejected)
orphan directories         0
dangling registered rows   0

commit + CURRENT_STATE     "five of five material iterations"
reason lock record         materialIterationsUsed 3, rejectedCandidates 2
registry-backed truth      4 material iterations, 3 accepted, 1 rejected
```

**Determination: `HISTORICAL_ITERATION_ACCOUNTING_DEFECT`.** No unregistered
evidence-bearing runtime attempt exists — 154 directories, 154 registered, zero orphans,
zero dangling — so C19 proceeded rather than stopping for orphan registration.

**Root cause:** pre-implementation rule *simulations* were counted toward the material
iteration budget. A simulation allocates no attempt, writes no runtime file and produces
no evidence-bearing campaign, so it is not a material iteration. C18 therefore reported
its budget exhausted when one iteration remained available.

**No score, gate, disposition or evidence file is affected.** Every C18 metric was
produced by a registered campaign and is reproducible. **C18 files were preserved exactly
as committed — zero rewritten, zero deleted** — and the correction is prospective, recorded
in `COMMIT_5R1C19_C18_ITERATION_ACCOUNTING_RECONCILIATION.json` and in CURRENT_STATE.

The stale `Last updated` value (`2026-07-25T12:30:00Z`) was replaced with the actual C19
final UTC timestamp in the mandatory final update.

## §8 — the branch-identical method

C18 ended by recording that the simulator condition and the runtime branch predicate must
be the same predicate, after a cleanly-forecast rule was gated on a predicate the
controlling branch did not use and regressed R3 448 → 454.

C19 removes that failure mode **by construction**. Each rule is defined once in
`commit5r1c19-predicates.mjs` as `{ principle, assigns, match }`, and the patch script
**extracts and injects the predicate source verbatim** into the runtime. The simulator,
the runtime and the trace harness evaluate byte-identical logic. Equivalence is asserted
after implementation:

```text
rule                                    simulator   runtime   missing   unexpected
definition_outcome_under_tax_context           14        14         0            0
registration_outcome_is_compliance             10        10         0            0
```

Both accepted rules landed **exactly** their forecast: +14 and +10.

## A new finding, carried to C20

**Branch equivalence proves the targeted row set matches; it does not prove the runtime
placement leaves other rows untouched.** Iteration 03 passed equivalence 6 = 6 with zero
missing and zero unexpected, and still regressed R3 393 → 403 — the branch it replaced
also served 28 rows the predicate never matched, which moved collaterally. Iteration 04
hoisted the same rule to the head of the decision walk and regressed further, to 460.
Both were rejected and the prior snapshot restored.

Placement safety is a **separate property** from predicate identity. C20 must verify it
explicitly: a rule must be shown not to divert rows outside its matched set.

## Rules implemented, each simulated regression-free

- **`definition_outcome_under_tax_context` (§10D)** — 14 rows. The requested outcome is
  the meaning of a term asked inside genuine tax context; procedural vocabulary does not
  change it. A measured exclusion: `"what is X within Y"` qualifies, `"what is X in Y"`
  does not — the latter is the residual tax task in R3, and admitting it would regress a
  correct row. Support was narrowed 15 → 14 on that evidence.
- **`registration_outcome_is_compliance` (§10D)** — 10 rows. An explicit registration
  requirement is a procedural compliance outcome; the requested outcome controls the
  family, not the grammatical subject.

## Rules rejected before implementation

```text
rule                                     support   TP   FP_correct   net
general_world_gloss_not_reassignment          92   20           69   -49
bare_topic_fragment_no_operation              18    9            9     0
expansion_requires_local_reassignment          6    5            1    +4
token_gloss_fragment_no_operation              5    4            1    +3
```

Two have a **positive net delta** and were still rejected: §9 requires
`FP_CORRECT_ROW_REGRESSION = 0`.

## §11 — collision status

Recomputed over the C19 residual with eight further deterministic features: question
focus, propositional versus entity target, modal scope, polarity, verb valency,
object-complement type, parenthetical form, token-initial position.

```text
residual rows      383
separable          306
colliding           77   across 8 vectors, most dominated by a single reason
```

Recorded as `POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT` **candidates only**. C17 saw one
declared ceiling fall to enrichment, C18 closed a 41-row group C17 had left colliding, and
C19's added features moved the count again. **No exception was added, R3 was not modified,
and no closure is claimed** on their account. The learnability-conflict path was **not**
taken.

## Prohibited controls — none used

```text
primaryCategory or other oracle metadata     not used
expected reason                              not used
source set / oracle or query ID              not used
template identity / complete query text      not used
exact object-name list                       not used
suite / family / cluster name                not used
serialized full-feature-vector lookup        not used
mere tax-token presence                      not used
mere homograph presence                      not used
```

No external model and no new dependency was introduced; all parsing is deterministic.
Oracle identifiers appear only inside analysis JSON, explicitly labelled analysis
evidence and used solely to prove simulator/runtime set equality.

## Oracle and suite integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited.
- **Reason suite v8 frozen and unmodified** — 344 queries / 172 pairs; 0-byte diff.
- **C17 collision probes frozen and unmodified** — 196 probes; 0-byte diff.
- Decision suite, relation suite and clause probes unchanged.
- **All C18 evidence unchanged** — 0-byte diff across every `COMMIT_5R1C18_*` file.
- No expectation deleted, no failure removed, no denominator increased.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.
- No relation was altered to make reason selection easier.

## Reconstruction identity

The accepted C18 dev-05 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`09081d31aef2e6853dede84936fdf560bef7309018a40f4ad0f107b768fc3fe8`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**:
canonical 3,313, decision 3,720/3,720, relation 3,720/3,720, reason 407 mismatches,
decision counterfactual 756/756, relation counterfactual 282/282, clause probes 68/68,
reason suite 320/344, collision probes 134/196 — 0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c19tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a
runtime write. One patch script produced a malformed predicate extraction; the load check
caught it before any scoring, the runtime was restored from the verified base snapshot,
and the extraction was corrected with an added sanity assertion. No broken runtime was
ever scored or registered. No zero-byte, truncation or unexplained-write incident
occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No standalone closure. No integration. No freeze. The best candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Best candidate preserved as `COMMIT_5R1C19_BEST_REASON_CANDIDATE.patch` and in an
  immutable attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 154 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision and relation layers are locked; the reason lane is open and carried to C20
with 306 of 383 residual rows measured as reachable.
