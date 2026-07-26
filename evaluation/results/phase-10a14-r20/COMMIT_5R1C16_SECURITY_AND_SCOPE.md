# PHASE-10A14-R20 — COMMIT 5R1-C16

## Security and Scope Attestation

Unit: reason-layer closure continuation 16 against R3.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `a6d0a074d2504b76580d5dcea45aafa47f6d2ca7` (parent `8c1163d5…`).

---

## Outcome — reason lane NOT closed; both prior locks preserved

```text
R3 reason                     3,185 / 3,720   (mismatches 535, from 614)
canonical overall             3,185 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         304 / 344     (held; frozen)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS
anti-memorization             PASS
```

Five of five permitted material iterations were used — **four accepted, one rejected**.
79 of 614 mismatches closed; cumulatively across C15 and C16 the lane has moved
**679 → 535**. **The reason lock is not declared.** Per §13 a clean reason-lock
verification is authorized only after reason mismatches reach zero, so **no verification
campaign was run**; its absence is recorded rather than substituted.

## The measured separability ceiling — the controlling result

C16 began with the mandated §7 analysis rather than more regexes. Every residual row was
described using **runtime-available structural features only** and grouped by feature
vector:

```text
distinct residual feature vectors     69
rows in SEPARABLE vectors            378
rows in COLLIDING vectors            236
```

Two rows with identical runtime evidence that require different expected reasons cannot
be separated by any rule over that evidence. **This ceiling was written down before
coding** in `COMMIT_5R1C16_REASON_DECISION_TABLE.md` §7, and the unit closed 79 of the
378 reachable rows.

## Rules implemented, each from measured evidence

- **§8 typed reason evidence** — a reason-evidence layer derived solely from the locked
  clause and relation evidence: speech act, action head and target, predicate class,
  controlling relation, target role, unresolved kind. No oracle field is present.
- **§9A the REFUSE split** — an operation is requested when a clause-initial imperative
  head names something to act on, or an advice/creative question asks for one, or a
  local-redefinition assertion performs one. Measured precision 0.898 over 453 support.
- **§9B the action head controls** — an ordinary operation on a labelled artefact is an
  action, not a naming act; an asserted naming act carries no action head (precision
  1.000, 0 counterexamples).
- **§9D the requested outcome controls** — which form applies, whether registration is
  required, what penalty attaches to late compliance. The C15 finding that
  substantiation wording is *treatment* is preserved.
- **§9E the object of ambiguity controls** — a raised topic is materially ambiguous only
  when the term has a live non-tax sense.

## A rule measured, implemented, and rejected

The §9C target-role conjunction (specific treatment relation **and** identified ordinary
object) measured **74.5% against 7.8%** — the sharpest discriminator found. Implemented,
it regressed the reason suite 304 → 242 and R3 575 → 652 because its in-situ coverage is
far below its precision. **The candidate was rejected and the prior snapshot restored.**
A plain external-object test measured 34.8% vs 51.3% and was **never implemented**, per
§7's prohibition on weakly separated rules.

Two further candidates regressed R3 during development (645 and 654 against a 614
baseline) and were narrowed against measured evidence within their own iteration before
acceptance. No candidate carrying a regression was registered as an accepted base.

## Prohibited controls — none used

```text
mere tax-token presence                    not used (rejected in C15)
mere homograph-token on an imperative      not used (rejected in C15)
primaryCategory or any oracle metadata     not used
exact template/query/source-set/ID match   not used
specific R3 objects (cooling fan, etc.)    not used
```

No oracle ID, exact query, query hash, source set, category, coverage class, RF rule id,
cluster name or expected-reason map appears anywhere in runtime code. Oracle identifiers
appear only inside analysis JSON, which is explicitly labelled analysis evidence.

## Oracle and suite integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited.
- **Reason suite v8 is frozen and unmodified** — 344 queries, 172 pairs; tracked diff
  0 bytes. No expectation edited, no denominator increased.
- The 756-query decision suite, the 282-query relation suite and the 68 clause probes are
  unchanged; tracked diff on each is 0 bytes.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.
- No relation was altered to obtain a reason score; the relation lane remains exact.

## Reconstruction identity

The accepted C15 dev-06 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`e8577e35efc7bc3193b796e1bd7a6a422a98f8568411b69b2f67c496f0c85ba7`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**:
canonical 3,106, decision 3,720/3,720, relation 3,720/3,720, reason 614 mismatches,
decision counterfactual 756/756, relation counterfactual 282/282, clause probes 68/68,
reason suite 304/344 — 0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c16tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a
runtime write. One patch raised a `ReferenceError` (a typed-evidence block placed after
its first consumer); the load check caught it, the runtime was restored from the verified
base snapshot, and the change was reapplied at a correct anchor. No broken runtime was
ever scored or registered. No zero-byte, truncation or unexplained-write incident
occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No standalone closure. No integration. No freeze. The best candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Best candidate preserved as `COMMIT_5R1C16_BEST_REASON_CANDIDATE.patch` and in an
  immutable attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 139 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision and relation layers are locked; the reason lane is open and carried to C17
together with the measured colliding-vector analysis.
