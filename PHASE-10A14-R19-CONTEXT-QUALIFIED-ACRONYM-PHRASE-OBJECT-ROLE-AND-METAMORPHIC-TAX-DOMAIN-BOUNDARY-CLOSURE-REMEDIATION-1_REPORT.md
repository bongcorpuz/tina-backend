# PHASE-10A14-R19 — CONTEXT-QUALIFIED ACRONYM, PHRASE, OBJECT-ROLE AND METAMORPHIC TAX DOMAIN BOUNDARY CLOSURE — REMEDIATION 1

Executor: Sonnet 5 (low speed)
Controlling review: `PHASE-10A14-R18-...-INDEPENDENT-REVIEW-1` at `dcfcb77e` — REVISIONS REQUIRED (P1×2)
Mandatory starting HEAD: `dcfcb77e` — verified exactly before any artifact was created
**R19 final runtime: `b3e879b1`** (last commit touching a runtime file)
Runtime model: `gpt-4o-mini` — unchanged.

**Every count derives from `CANONICAL_ATTEMPT_REGISTRY.json`, by `attemptCategory`, never
from command-name inference.**

---

## Decision: PASS

```
R15 historical governance:  NOT SUPERSEDED
R16 prospective governance: NOT SATISFIED
R17 prospective governance: NOT SATISFIED
R18 prospective governance: NOT SATISFIED
R19 prospective governance: SATISFIED
```

**Phase 10A remains OPEN.** This is the executor's self-assessment. Only the mandatory
Codex 5.5 independent review may adjudicate R19 closure. R19 does not rewrite R18 or
independent-review history.

---

## 1. Findings

| Finding | Status |
|---|---|
| P1-R18-IR1-001 independent unseen domain campaign failed (497/567, 67 FA / 3 FR / 12 MM) | **CLOSED** |
| P1-R18-IR1-002 R18 acronym/phrase anchors over-expanded out-of-scope protection | **CLOSED** |

## 2. Root cause

Every one of the 67 material false allows and 12 metamorphic false-allow failures fired
with reason `strong_tax_signal`. Two sub-defects, diagnosed directly against the
controlling failure set before any patch was written:

1. **No veto pattern existed** for many non-tax object families the R18 veto never
   anticipated (software/code role markers, random/unknown code labels, physical
   devices, audio/music, culture/tradition, medicine, real-estate marketing,
   hobbies/games, school/class contexts, office mislabeling, explicit negation).
2. **Cosignals were over-permissive.** R18 wrongly listed bare 2-4 letter acronyms
   (`RMC`, `RMO`) as unambiguous cosignals — so "RMC is a radio music channel" defeated a
   correct veto with the very acronym that IS the ambiguity — and any cosignal phrase
   match anywhere in a sentence could defeat any veto match anywhere else, with no
   role-based judgment ("VAT return as function return value").

Full classification: `ROOT_CAUSE_TAXONOMY.json`, 14 reusable families, 70/70 classified.

## 3. Remedy

A new **dominant non-tax role veto** tier runs before the existing (cosignal-defeatable)
R18 veto and before the strong-signal check, and is **never defeated by any cosignal**,
because every pattern names an object ROLE (a variable, a device, a hobby, a body of
knowledge) orthogonal to whichever tax-shaped token happens to be nearby. Organized into
reusable rule families — no exact-question strings, verified by a static assertion.
`TAX_COSIGNAL_PATTERNS` is tightened so bare acronyms never count as cosignals.

Two developed further during iteration:
- A general structural heuristic: an acronym immediately followed by a **lowercase**
  parenthetical gloss is almost always a colloquial/joke expansion, since genuine tax
  citations use title case (`RCIT (Regular Corporate Income Tax)`).
- A narrowed `\bmethod\b` veto — the R18-era pattern was too broad, wrongly vetoing
  "valuation method" and "transfer pricing method" as programming signals.

## 4. Result across three required, independently frozen campaigns

| Campaign | Rows | Pass | False allows | False refusals | Metamorphic failures |
|---|---|---|---|---|---|
| Exact 567-probe reproduction (pre-fix) | 567 | 497 | 67 | 3 | 12 |
| Exact 567-probe reproduction (post-fix) | 567 | **567** | **0** | **0** | **0** |
| R19 development oracle | 873 | **873** | **0** | **0** | **0** |
| R19 executor unseen campaign | 726 | **726** | **0** | **0** | **0** |

Pre-fix reproduction is an **exact match** to the reviewer's own numbers
(497/567, 67/3/12), confirming the failure reproduces precisely before proving it is
closed. The development oracle (≥817 required) reuses all 567 review rows plus accepted
R15–R18 closures plus ≥250 new context variants. The unseen campaign (≥710 required) was
authored **after** the runtime was frozen, not used to design the patch, and
programmatically verified to reuse no complete sentence from either prior oracle.

## 5. Evidence-fixture defect discovered and disclosed (R18-IR-EF-001)

The independent review's own frozen oracle has a genuine data-integrity defect: for its
`acronym_context` class (38 of 567 rows, and no other class), the `text` and `expected`
JSON fields are swapped — `text` holds the literal string `"ALLOW"`/`"NOT_ALLOW"` and
`expected` holds the real probe sentence. Any runner reading `text` as the query —
including this one and, by inference, the reviewer's own runner that produced the frozen
70-failure count — evaluated the classifier against bare `"ALLOW"`/`"NOT_ALLOW"` strings
for these 38 rows, not real questions.

The frozen oracle file is **not altered**, per the prohibition against amending
independent-review history. Instead: documented in `ORACLE_FIELD_SWAP_FINDING.json`; the
real semantic content is separately verified under the corrected mapping
(`ACRONYM_CONTEXT_CORRECTED_VERIFICATION.json`, 38/38 passing); and represented correctly,
labeled, inside the R19 development oracle. Investigating it also surfaced one further
genuine, unrelated pre-existing gap — `RR No. 2-98` fell to weak/CLARIFY because the
strong pattern required a digit immediately after `RR` — fixed to match the
already-correct weak-tier pattern.

## 6. Gates and suites

| Gate | Result |
|---|---|
| Deterministic | **2 of 2 cycles** — syntax 10/0; **215 suites run, 0 failed**; GATE PASSED |
| Staging | **2 of 2 cycles** — 7 run, 0 failed; STAGING GATE PASSED |
| Focused | **22 of 22 suites, exit 0** |

Runtime digest `27b71035…167a2f` and harness digest `c79332af…` identical across all four
gate cycles. Registry: **4 attempts, 4 controlling, 0 non-controlling, 0 corrupt, 0
invalid provenance, validRetryCount 0 (no retry needed), retryErrors 0, integrity clean.**

## 7. Disclosed executor notes

- **Two dirty-tree false-positive failures** (`patch-07b`, `phase-09r-staging`) occurred
  transiently while `HARNESS_SCOPE_MANIFEST.json` was uncommitted, matching the same class
  documented for 09ZF in R18. Resolved on commit, re-verified 22/22 clean.
- **Two oracle-authoring errors** were caught and corrected **before freezing**, not after:
  a probe mislabeling the original R16 false-allow example as an accepted ALLOW closure,
  and a probe expecting `"What is the exemption threshold?"` to be ambiguous when it is a
  pre-existing (pre-R19, confirmed against R18 final runtime `8413e022`) strong anchor.

## 8. Scope

Three files changed outside R19 evidence: two runtime files (in the frozen allowlist) and
one R18 test-assertion widened (disclosed in COMMIT 3) to accept either veto reason since
the new dominant tier is a strict superset guarantee. `tax-keywords.js` and
`tax-classifier.js` were not modified. R13–R18 historical evidence is untouched, verified
by an empty diff. No listener remains; port 5173 untouched; no repository-local capture
directory. Full detail in `SECURITY_AND_CLEANUP.md`.

## 9. Stop

Executor evidence is committed, pushed and sync verified. **STOP.**

Next task: `PHASE-10A14-R19-...-INDEPENDENT-REVIEW-1`, executed by Codex 5.5 under separate
owner authorization. The executor did not perform or simulate it, did not start R20, did
not execute E2 or A15, did not close Phase 10A and did not begin Phase 10B/10C/10G/10H.
