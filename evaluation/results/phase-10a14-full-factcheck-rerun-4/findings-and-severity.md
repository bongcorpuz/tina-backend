# PHASE-10A14 — Findings & Severity Register

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| — | P0 | none | — |
| — | P1 | none | invalid verified 0; questionable verified 0; Q38 0/3; Q46 0/3; Q5/Q8/Q25/Q36 0/3; fabricated 0; outcome-prediction 0; model override 0; accessor 0/0/0; no material false refusal; no material cross-round legal contradiction |
| P2-A | P2 | SIDE-REG-POS and SIDE-VATEXC-POS did not reach VERIFIED live | correct answers, but retrieval surfaced non-controlling authority (foundational Sec 2/3; general VAT 105-108) instead of Sec 236/Sec 109; gate correctly failed closed. NOT blanket suppression -- Q1-r3 verified registration live on Sec 236; general-VAT sidecar verified. Retrieval/source-surfacing limitation. |
| P2-B | P2 | Passage-level source grounding not implemented | control uses displayed source-card labels only (standing carryover) |
| P2-C | P2 | Proposition-source-sufficiency is class-enumerated | penalty/EWT/registration/vat_exception covered; extensible but not exhaustive; A14 surfaced no new invalid-verified class |
| P2-D | P2 | gpt-4o-mini validator limitation + latency | standing carryover; deterministic gates carry the safety load |
| P2-E | P2 | Q3/Q34 verified with same-tax-type (not most-specific) authority | correct proposition, not misleading (prior-accepted) |
| P3-A | P3 | Q10 intermittent degenerate 16-char generation | technical transient; retried; excluded from canonical; Q10-r1/r2 completed |

Severity totals: P0=0, P1=0, P2=5, P3=1.
