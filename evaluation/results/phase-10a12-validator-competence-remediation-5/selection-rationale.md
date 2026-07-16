# PHASE-10A12-R5 — Governed Canonical Mini-30: Selection Rationale & Freeze

Prospective only. Does NOT retroactively validate A12-R3 or A12-R4.

## Governed freeze (committed + pushed BEFORE any live execution)

1. **Immutable source-bank snapshot** — a verbatim byte-for-byte copy of the master bank
   `evaluation/factcheck/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md` is frozen at
   `source-bank-snapshot/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.SNAPSHOT.md`.
   `sourceBankSnapshotSha256 = 526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed`.
2. **Per-question text hashes** — every source-bank question (Q1–Q50) is individually hashed
   (`canonical-mini-set-hashes.sha256`), so the selection is auditable against the frozen bank.
3. **Selection rationale** — this document.
4. **Canonical manifest** — `canonical-mini-set-manifest.json` (bank hashes + selected 30 +
   `canonicalSetSha256`).

## Deterministic selection rule (independently validated in A12-R4)

From the frozen master bank (Q1–Q50, 50 questions):
1. Exclude the reserved cluster/control IDs `{5, 8, 28, 32, 34, 35, 41, 46, 47}`:
   - Q5 — import-VAT / CREATE MORE cluster
   - Q8 — residential-lease VAT cluster
   - Q35, Q41 — citation-relevance clusters
   - Q28, Q32, Q34, Q46, Q47 — verified-controlling reachability controls
   Excluded so the mini fact-check stays independent of the dedicated probe/control sets.
2. Sort the remaining **41** eligible IDs ascending by master number.
3. Select the first **30**.

**Comparable difficulty:** every master question is a curated, PASS-gradeable fact-check item
of equivalent rigor (each carries an explicit correct-answer and PASS criteria in the bank), so a
number-ordered slice of the eligible pool does not select for easier questions.

## Result

Canonical 30 (M-Q IDs):
`1,2,3,4,6,7,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,33,36`.

`canonicalSetSha256 = 8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1`
(identical to the A12-R4 canonical set hash — confirming the rule is deterministic and
reproducible against the frozen snapshot).

## Governance

- This manifest, the immutable snapshot, and the hashes are committed and pushed **before** any
  live test execution. The subsequent live rerun captures one payload per frozen question and its
  membership/runtime is verified to match this manifest exactly.
- Prospective only: this establishes a governed canonical mini-30 going forward. It makes no claim
  about — and does not validate — the A12-R3 or A12-R4 mini sets.
