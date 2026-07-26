# PHASE-10A14-R20 — COMMIT 5R1-C14

## Security and Scope Attestation

Unit: relation-layer lock continuation — primary-vs-subordinate clause segmentation.
Repository: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`.
Starting HEAD: `fa2f2975c96c668bce91a613ec088c7ac64cd39a` (parent `c75d19f5…`).

---

## Outcome — relation layer locked

A separate clean verification campaign against an unchanged runtime met **all sixteen**
lock conditions:

```text
R3 decision                 3,720 / 3,720
R3 relation                 3,720 / 3,720   (mismatches 0)
false allows / refusals     0 / 0
clarify mismatches          0
decision counterfactual       756 / 756
relation counterfactual       282 / 282     (denominator unchanged)
clause-segmentation probes     68 / 68      (not part of the denominator)
closed controls             all closed
rich-context guard          7 / 7
focused relation regression PASS
clause-schema regression    PASS
anti-memorization           PASS
reason integrity            PASS
determinism                 PASS (15,000 evaluations; decision drift 0, relation drift 0)
runtime identity            unchanged across verification
```

This is decision-layer **and** relation-layer closure. It is **not** runtime closure,
**not** standalone closure, and **not** R20 PASS. The reason lane has not been started.

## The clause-layer correction

The comma split fired only when the word AFTER the comma was a connector, so a LEADING
concessive never split and the whole sentence became one `primary_task` clause. Four
coordinated structural corrections:

1. Split at the top-level comma closing a leading concessive, but only when the
   remainder is a **complete requested task**.
2. Demote a leading concessive clause in primary-task scoring, so the main requested
   clause controls — by clause **role**, never by clause order alone.
3. Scope relation building: a tax predicate confined to concessive context does not
   build the controlling task relation over an ordinary primary task.
4. Scope `taxRelationOverPrimaryTarget`, which was computed over the whole text and so
   let a concessive predicate claim the primary target in the decision layer.

The split is evaluated **inside the existing scanner**, so quote-awareness and
parenthesis-awareness are inherited rather than reimplemented. Commas inside quotes,
commas inside parentheses, ordinary list commas, and leading concessives with an
incomplete remainder all correctly do not split; each is fixed by a probe.

**No exact-query shortcut was used.** No branch on the eight controlling queries, object
names, folder names, pair numbers, suite or family names, query hashes, or expected
decisions. Relations are still extracted before decision and reason, never backfilled
from an expected decision, and tax relations in genuine primary tax tasks are intact —
demonstrated by the reversed-polarity and tax-context-plus-tax-question probe families.

## Probe adjudication — three pre-existing behaviours descoped

Three authored probe expectations asserted behaviour **outside the authorized C14 scope**.
Each was verified against the untouched C13 baseline, where it behaves identically with
no concessive present, then reduced to assert only the segmentation structure:

- `"how is X taxed?"` refuses at baseline — `taxed` is not in the tax-anchor vocabulary.
  A lexical gap, not a clause-layer defect.
- The quoted-comma probe: `QUOTES_TERM` is not emitted for that shape at baseline.
- The trailing (non-leading) concessive: §7A authorizes the **leading** form only.

They were **not deleted and not weakened into passes** — each still fixes the no-split
behaviour so a later unit cannot regress it silently. No runtime change was made to
manufacture a pass for any of them.

## Denominator integrity

- The 282-query controlling relation suite is **frozen and unmodified**; tracked diff on
  `COMMIT_5R1C13_RELATION_COUNTERFACTUAL_V7_SUITE.json` is 0 bytes.
- The eight controlling queries were not edited, deleted, replaced or reclassified.
- The 68 clause probes are an **additional acceptance gate** and are explicitly not part
  of the denominator. The denominator was **not increased to dilute the gap**.

## Oracle integrity

- V1, R1, R2 and R3 unchanged. Tracked diff over `evaluation/oracles/` is 0 bytes.
- R3 verified `ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54`, 3,720 rows.
- No R3 expectation was edited. The 756-query decision suite is unchanged.
- `CLAUSE_LEVEL_INTENT_SCHEMA.md` and `RELATION_AND_PRECEDENCE_SPEC.md` unchanged.

## Reconstruction identity

The accepted C13 dev-06 candidate was verified file-by-file against the required
normalized-LF hashes and the services tree digest
`f2bb9051b576068c13e25708e8db0fdf8d8b0ebfd756f865e4f9bc0797b5ece6`, proven to differ from
the live baseline only in an authorized runtime file, and reproduced **exactly**:
canonical 3,041, decision 3,720/3,720, relation 3,720/3,720, reason 679, decision
counterfactual 756/756, relation counterfactual 274/282 — 0 discrepancies.

## Write safety

Every authoritative runtime write used an in-repository sibling temp ending in `.js`
(`.c14tmp.js`), verified non-zero, imported to confirm all nine exports, hashed,
atomically renamed, then rehashed. No external scratchpad was ever the source of a
runtime write. One patch iteration raised a `ReferenceError` (a block placed before the
`add` helper was initialized); it was caught immediately by the load check, the runtime
was restored from the verified base snapshot, and the change was reapplied at a correct
anchor. No broken runtime was ever scored or registered. No zero-byte, truncation or
unexplained-write incident occurred, and no temp residue remains.

## Runtime scope

- Only `services/philippine-tax-intent-analyzer.js` was modified during governed
  development; the other two runtime files were reconstructed and restored unchanged.
- No integration. No freeze. The locked candidate is **not** live.
- Live services restored to the committed baseline; tracked diff over `services/` is
  0 bytes and the analyzer's normalized-LF content equals
  `8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308`.
- Locked candidate preserved as `COMMIT_5R1C14_RELATION_LOCKED_CANDIDATE.patch` and in an
  immutable attempt snapshot.
- Tests unchanged: tracked diff over `tests/` is 0 bytes.

## Boundaries observed

- No reason-lane remediation. Reason mismatches (679, unchanged from the reconstructed
  base) are recorded as diagnostic only; no reason-specific branch was added.
- No standalone closure, integration, freeze, ingestion, reindex or deployment.
- No retrieval, LOA, corpus, database or frontend change.
- No model change; runtime remains free of model/network access.
- `knowledge/TINA_Updated_Roadmap_v7.md` unchanged (SHA `235cc336…`).
- `C:\Projects\tina-dev-factory` unchanged; identity verified before and after.
- All 130 prior attempts and their dispositions unchanged; all prior manifests preserved.
- Registry files updated only at their existing canonical paths.
- No secrets and no taxpayer or client data introduced.
- No protected path staged. `.vscode/` and `evaluation/factcheck/` remain untracked.
- No Node listener; port 5173 free.
- `knowledge/CURRENT_STATE.md` is the final substantive file change.

## Governance

R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**. Not PASS. Not SATISFIED.
Relation-layer closure is not runtime closure; the reason lane is pending.
