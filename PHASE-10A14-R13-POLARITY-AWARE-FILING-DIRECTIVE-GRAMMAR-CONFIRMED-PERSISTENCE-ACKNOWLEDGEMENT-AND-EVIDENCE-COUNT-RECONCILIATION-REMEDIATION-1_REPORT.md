# PHASE-10A14-R13 — Polarity-Aware Filing-Directive Grammar, Confirmed Persistence Acknowledgement & Evidence-Count Reconciliation Remediation 1

**Executor:** Claude Code — Opus 4.8 (low speed) · branch `feature/source-availability-engine-v1`
**Starting HEAD:** `16ad1a5…` · sync `0 0` · **R13 runtime:** `a311e97…` (staging auto-deployed, non-production)
**Decision (self-assessed):** **PASS** — formal decision belongs to the mandatory independent reviewer.

## Findings
| ID | Disposition |
|---|---|
| **P1-R12-IR-001** — semantic directive coverage incomplete | **CLOSED** — pre-fix **14 explicit + 40 grammar misses → 0**. |
| **P1-R12-IR-002** — safe negation/caution overfire | **CLOSED** — negation-scope analysis; pre-fix **3 overfires → 0**. |
| **P1-R12-IR-003** — persistenceStatus falsely PERSISTED | **CLOSED** — acknowledged receipt; pre-fix **5 false-PERSISTED → 0**. |
| **P3-R12-IR-004** — evidence count label | **CORRECTED** — counts separated by category. |

## Architecture — bounded polarity-aware clause-FRAME classifier (WS3)
Per the primary architectural requirement, the detector is **not** another expanding regex. Each clause is
decomposed into an inspectable frame (action family / temporal / speech-act / **polarity + negation-scope** /
penalty pressure / conditional scope), and the unsafe decision is derived from the frame. New coverage:
recommendation/advice families (suggest/advise/encourage/best course/wise/may wish/should consider, plus
nominalized "Filing today is advisable" and passive "The return should be filed today"); urgency grammar
(close of business / before midnight / within the day / do not wait / immediate…); inverted + `unless` penalty
pressure with weak modals; **WS7 negation scope** — safe epistemic/legal negation of the filing conclusion,
deadline, or recommendation suppresses, while negation of DELAY/POSTPONEMENT ("Do not delay… file now") stays
unsafe.

## Acknowledged persistence receipt (WS11)
`services/persistence-receipt.js` `derivePersistenceReceipt` returns `{attempted, persisted, status, …}` —
`PERSISTED` only when BOTH message inserts return acknowledged data; otherwise `PARTIAL_PERSISTENCE` /
`PERSISTENCE_FAILED` / `PERSISTENCE_TIMEOUT` / `NOT_PERSISTED_NO_CONVERSATION` / `NOT_PERSISTED_NO_USER`. No raw
DB error/credentials/SQL in the receipt. `saveConversationTurn` returns the receipt; the domain-boundary handler
derives `persistenceStatus` from it (not from ID presence). Existing callers that ignore the return are unaffected.

## Immutable pre-fix + post-fix evidence
- Pre-fix (against unchanged R12 `d91b697`, committed **`65781b0`** before remediation): 14 explicit + 40 grammar
  misses, 3 overfires, 3 metamorphic failures, **5 false-PERSISTED** claims.
- Post-fix (single deployed R13 `a311e97`): explicit/grammar/metamorphic misses **0**, overfires **0**,
  false-PERSISTED **0**, status mismatch **0**; **246** grammar cases + **10** metamorphic invariants + **9**
  persistence simulations all pass; **28** live probes: apiUnsafe **0**, API==history for all, rejected exposed **0**,
  domain-boundary **PERSISTED**.

## Preservation & gates
Focused `phase-10a14-r13` **32/0**; R12 47/0, R11 39/0, R10 22/0, R9 15/0; R12 84-probe campaign clean;
deterministic all-26 **9/17/0**. Deterministic **203/0 ×2** (clean tree); staging **7/0 ×2**. Governance (WS18):
self-assessed **SUPERSEDED BY COMPLETE R11/R12/R13 PROSPECTIVE EVIDENCE** (reviewer decides). No model/prompt/
filing-rationale/corpus/production change; protected paths preserved; port 5173 untouched; sync `0 0`.
**P1-R9-IR-002 reserved for E2; P2-R9-IR-003 bounded.**

## Next task
PHASE-10A14-R13-…-INDEPENDENT-REVIEW-1. After an independent R13 PASS → PHASE-10A14-E2. Phase 10A remains OPEN.
