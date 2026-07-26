# PHASE-10A14-R20 — COMMIT 5R1-C17

## Security and Scope Attestation

Unit: reason observability enrichment and reason-layer closure continuation.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `288223a36d0e40ebb8004a82a325b6cb68a7264a` (parent `a6d0a074…`).

---

## Outcome — reason lane NOT closed; both prior locks preserved

```text
R3 reason                     3,243 / 3,720   (mismatches 477, from 535)
canonical overall             3,243 / 3,720
R3 decision                   3,720 / 3,720   FA 0  FR 0  clarify 0
R3 relation                   3,720 / 3,720   (mismatches 0)
decision counterfactual         756 / 756
relation counterfactual         282 / 282
clause probes                    68 / 68
reason-focused suite v8         304 / 344     (frozen; held)
collision probes                134 / 196     (new acceptance gate)
closed controls               all closed
rich-context guard            7 / 7
reason integrity              PASS
anti-memorization             PASS
```

Five of five permitted material iterations were used — **two accepted, one rejected, two
narrowed to a neutral result**. 58 of 535 mismatches closed; cumulatively across C15, C16
and C17 the lane has moved **679 → 477**. **The reason lock is not declared.** Per §15 a
clean reason-lock verification is authorized only after reason mismatches reach zero, so
**no verification campaign was run**; its absence is recorded rather than substituted.

## The controlling result — the C16 ceiling was a feature defect, and it broke

C16 recorded 236 residual rows in colliding feature vectors and characterised that as a
hard ceiling. §6 of this specification called it a feature-observability defect. **The
measurement confirms the specification and refutes the C16 characterisation.**

Recomputed over the 535 residual rows using enriched deterministic features:

```text
                          vectors   separable rows   colliding rows
C16 feature set                69              325              210
ENRICHED feature set          131              494               41
collision reduction                                             169
```

Per-feature collision reduction, each added singly to the C16 set:

```text
requestedOutcomeClass       110      questionOperator             37
requestOperationClass        84      assertionClass               34
targetSemanticRole           71      contextAttachment            26
topicCompleteness            57      predicateArgumentStructure   16
                                     predicateAttachment          10
                                     ambiguityObject               0
```

`ambiguityObject` reduces nothing on its own — it is fully determined by the existing
unresolved-kind field — and was **not implemented** as a control.

Recomputed at the end of C17 against the new 477-row residual so C18 inherits current
evidence: C16 features 284 separable / 193 colliding; enriched features **436 separable /
41 colliding**.

## §8 learnability stop condition — assessed, not asserted

Four vectors totalling 41 rows remain identical across all enriched features while
requiring different reasons; three are strongly dominated by one reason. Because
enrichment removed 169 of the 210 C16 collisions, these are **not yet demonstrated** to be
oracle defects — a further deterministic feature may still separate them. They are
recorded as `POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT` **candidates only**, preserved in
full, with **no exception added, no oracle change, and no closure claimed** on their
account. The learnability-conflict CURRENT_STATE path was therefore **not** taken.

## Rules implemented, each from measured evidence

- **Reason-observability layer V2 (§9)** — `requestedOutcomeClass`,
  `requestOperationClass`, `reasonTargetSemanticRole` and `reasonDenialAssertion`
  published from a deterministic parse of the primary clause and the locked relation
  output. It changes no clause segmentation, no decision, no relation, no relation object.
- **P4 explicit denial of tax relevance** (48 rows, the largest single gain) — an
  utterance that explicitly denies tax relevance and asks for something else is a
  positively requested non-tax task, not the absence of a relation. Precedence step 7
  places negation ahead of the absence step.
- **Asserted naming act reaches the label family** (23 rows).
- **Acronym operand is a term operand** (11 rows) — a transformation over a recognised
  acronym handles that token as text, which is a quotation act.

## Rules measured and REJECTED

```text
compliance outcome classes   form_selection 55.4%, deadline 44.6%, bare penalty 0.0%.
                             Only registration/remittance/penalty-for-late reach 100%,
                             and those proved already covered.
naming operation class       routing every naming-class operation to the label family
                             mislabels 46 R3 rows: "rename the X folder" is an OPERATION
                             on an already named artefact (§10B, the action head controls).
target semantic role         receipt_income 86.3% and asset 84.4% measured over the whole
                             family, but those rows already largely pass, so the rule
                             flipped correct rows: R3 535 -> 566. Rejected and the prior
                             snapshot restored.
```

**Methodological correction carried to C18:** family-wide precision is the wrong
statistic. A rule acts on the *residual*, so it must be measured against the failing rows
it would move, not against every row of the family. Two of the three rejections in this
unit trace to that error, and stating it plainly is more useful than the rows it cost.

## Prohibited controls — none used

```text
primaryCategory or other oracle metadata     not used
expected reason                              not used
source set / query id / oracle id            not used
template identity / complete query text      not used
exact object-name lists                      not used
mere tax-token presence                      not used (rejected in C15)
mere homograph presence                      not used (rejected in C15)
```

No external model and no new dependency was introduced; all parsing is deterministic.
Oracle identifiers appear only inside analysis JSON, explicitly labelled analysis
evidence.

## Oracle and suite integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited.
- **Reason suite v8 frozen and unmodified** — 344 queries, 172 pairs; 0-byte diff.
- The 756-query decision suite, 282-query relation suite and 68 clause probes unchanged.
- The 196 collision probes are an **additional acceptance gate** and explicitly not part
  of any frozen denominator.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.
- No relation was altered to make reason selection easier; the relation lane stays exact.

## Reconstruction identity

The accepted C16 dev-06 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`1ac0d4609b9dcc6d6c507805f29f354f4f1f11c5a7ed36d65ed6fe5c778901c3`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**:
canonical 3,185, decision 3,720/3,720, relation 3,720/3,720, reason 535 mismatches,
decision counterfactual 756/756, relation counterfactual 282/282, clause probes 68/68,
reason suite 304/344 — 0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c17tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a
runtime write. One patch script raised a syntax error (backticks inside a template
literal); it was caught before any runtime write, corrected, and reapplied. No broken
runtime was ever scored or registered. No zero-byte, truncation or unexplained-write
incident occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No standalone closure. No integration. No freeze. The best candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Best candidate preserved as `COMMIT_5R1C17_BEST_REASON_CANDIDATE.patch` and in an
  immutable attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 145 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
The decision and relation layers are locked; the reason lane is open and carried to C18
with 436 of 477 residual rows measured as reachable under the enriched feature set.
