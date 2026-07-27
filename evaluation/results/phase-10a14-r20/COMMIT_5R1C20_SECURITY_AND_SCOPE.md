# PHASE-10A14-R20 — COMMIT 5R1-C20

## Security and Scope Attestation

Unit: placement-safe shadow-override reason-layer closure continuation.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `4d7842f534cb3abc564d46884aefd3d9cd60faf3` (parent `7ea15b24…`).

---

## Outcome — reason lane NOT closed; both prior locks preserved

```text
R3 reason                     3,449 / 3,720   (mismatches 271, from 383)
canonical overall             3,449 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         320 / 344     (frozen; held)
collision probes                148 / 196     (from 140; frozen)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS
anti-memorization             PASS
target equivalence            PASS on all five shipped rules
placement non-interference    PASS — zero drift on every unmatched row
```

Four registered material iterations — **all four accepted, none rejected**. 112 of 383
mismatches closed; cumulatively across C15–C20 the lane has moved **679 → 271**. This is
the largest single-unit gain of the sequence. **The reason lock is not declared.** Per §17
a clean reason-lock verification is authorized only after reason mismatches reach zero,
so **no verification campaign was run**; its absence is recorded rather than substituted.

## §3 — C19 iteration-accounting reconciliation, completed before any coding

```text
registry increase          154 -> 159 = 5 newly registered campaigns
registered C19 campaigns   1 reconstruction + 4 material (2 accepted, 2 rejected)
orphan directories         0
dangling registered rows   0

commit + CURRENT_STATE     "five registered material iterations"
user-facing report         "2 accepted, 1 rejected, 2 neutral"
reason lock record         materialIterationsUsed 2, rejected 2, ceiling true
registry-backed truth      4 material iterations, 2 accepted, 2 rejected
```

**Determination: `HISTORICAL_ITERATION_ACCOUNTING_DEFECT`.** No unregistered
evidence-bearing runtime attempt exists — 159 directories, 159 registered, zero orphans,
zero dangling — so C20 proceeded rather than stopping for orphan registration.

**Two distinct miscounts:** the *reconstruction* campaign was counted toward the material
budget, and two campaigns carrying disposition `rejected` were described as "neutral" in
the user-facing report. C19 recorded `iterationCeilingReached = true` when only four of
five had been used.

**No score, gate, disposition or evidence file is affected.** C19 files preserved exactly
as committed — **zero rewritten, zero deleted**. Because this was the **second consecutive**
unit with an accounting defect, C20 stopped asserting the count by hand: it is now derived
mechanically from the registry by filtering the `-dev-` cycle pattern.

## §8 — the placement-safe architecture

C19 proved predicate identity is necessary but not sufficient: a rule can match exactly
the right rows and still change others through its placement. C20 answers that
architecturally rather than by discipline.

The original selector is preserved **byte-identical** as
`decideTaxBoundaryFromEvidenceOriginal`; a thin wrapper consults a **pure**
`resolveGovernedReasonOverride` and otherwise delegates to it. **No existing branch was
replaced, reordered, broadened or narrowed.** Every unmatched row therefore executes the
same code path it did before.

```text
rule                                         unmatched rows   reason   decision   relations   branch sig
token_gloss_assigns_no_identifier                     3,714        0          0           0            0
nominalized_transaction_head_is_tax_task              3,655        0          0           0            0
external_income_item_is_ordinary_object               3,693        0          0           0            0
filipino + issuance (iteration 05)                    3,698        0          0           0            0
```

Target equivalence passed on every rule: 4 = 4, 63 = 63, 25 = 25, 20 = 20.

**Every shipped rule landed exactly its shadow forecast: +4, +63, +25, +20.** Across four
iterations the predicted and actual R3 deltas never diverged by a single row, and **no
candidate had to be reverted** — in contrast to C18 and C19, which each lost iterations to
placement failures.

## Rules shipped

- **`nominalized_transaction_head_is_tax_task` (§12C)** — 63 rows, largest single gain.
- **`external_income_item_is_ordinary_object` (§12C)** — 25 rows.
- **`filipino_tax_instrument_is_subject` (§12C)** — 10 rows.
- **`issuance_over_filing_position_is_compliance` (§12D)** — 10 rows.
- **`token_gloss_assigns_no_identifier` (§12E)** — 4 rows.

## Rules rejected in shadow, before any runtime change

```text
rule                                     support   TP   FP_correct   net
finite_directive_requests_operation          225    4          220  -216
nominal_fragment_requests_no_operation        21   12            9    +3
operation_on_named_artefact                   27    0           27   -27
```

The first would have regressed **220 correct rows to fix 4**. The second has a *positive*
net delta and was still rejected under the zero-regression rule. Its matched set contains
structurally identical pairs with opposite expectations — `"office duty roster"` expects
`no_tax_relation` while `"office cabinet filing layout"` expects `explicit_non_tax_task` —
which is a genuine collision, preserved in the candidates file rather than forced.

## §13 — collision status

```text
residual rows      271
separable          200
colliding           71   across 7 vectors, most dominated by a single reason
```

Recorded as `POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT` **candidates only**. Three prior
units each saw a declared ceiling move once features or method improved. **No exception was
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
serialized full-feature-vector lookup        not used
mere tax-token presence                      not used
mere homograph presence                      not used
```

No external model and no new dependency; all parsing is deterministic. Oracle identifiers
appear only inside analysis JSON, used solely to prove set equality and non-interference.

## Oracle and suite integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited.
- **Reason suite v8 frozen and unmodified** — 344 queries / 172 pairs; 0-byte diff.
- **C17 collision probes frozen and unmodified** — 196 probes; 0-byte diff.
- Decision suite, relation suite and clause probes unchanged.
- **All C19 evidence unchanged** — 0-byte diff across every `COMMIT_5R1C19_*` file.
- No expectation deleted, no failure removed, no denominator increased.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.
- No relation was altered to make reason selection easier.

## Reconstruction identity

The accepted C19 dev-05 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`3ef61436e642cd6a42537dc8cdf349dc5999579d5be65252339059ed5ab28028`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**:
canonical 3,337, decision 3,720/3,720, relation 3,720/3,720, reason 383 mismatches,
decision counterfactual 756/756, relation counterfactual 282/282, clause probes 68/68,
reason suite 320/344, collision probes 140/196 — 0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c20tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a runtime
write. One patch script produced a malformed predicate extraction; it was caught before
any runtime write and corrected with string-index extraction plus a sanity assertion. No
broken runtime was ever scored or registered. No zero-byte, truncation or
unexplained-write incident occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No standalone closure. No integration. No freeze. The best candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Best candidate preserved as `COMMIT_5R1C20_BEST_REASON_CANDIDATE.patch` and in an
  immutable attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 159 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision and relation layers are locked; the reason lane is open and carried to C21
with 200 of 271 residual rows measured as reachable.
