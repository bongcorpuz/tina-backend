# PHASE-10A14-R9 — WS13 Verified-Answer Adjudication & WS14 False-Refusal Review

R9 differential live run: 103 probes against the R9 runtime (staging commit `0c80b12`, `gpt-4o-mini`),
0 technical failures. Trust: **35 VERIFIED_CONTROLLING · 58 RELATED_AUTHORITY_ONLY · 10 NO_VERIFIED_AUTHORITY**.

## WS13 — every VERIFIED_CONTROLLING answer adjudicated (35/35, no sampling)
All 35 are **VALID / APPROPRIATELY VERIFIED**. Each filing conclusion cites a filing rule (Sec 51 / 51-A)
decisively; each deadline cites Sec 51(C); estate/donor/VAT/MCIT cite their controlling provisions:

| Class | Probes | Controlling authority | Verdict |
|---|---|---|---|
| Individual filing obligation | SG-B-COMPONLY, SG-B-MIXED, SG-B-MULTIEMP, SG-B-SELFEMP, R9-INDFILE-51 | NIRC Sec. 51 (decisive) | VALID |
| Multiple-employer filing | R9-MULTIEMP | Sec. 51 (concurrent-employer rule) | VALID |
| Substituted filing | POS-SUBST-1/2/4/5, R9-SUBST-COMPLETE | Sec. 51 / 51-A | VALID |
| Individual filing deadline | POS-INDDEAD-1/2, ALL26-Q34-r1/r2/r3, SG-A-Q34REV | Sec. 51(C) (April 15) | VALID |
| Conditional "already late" | R9-ALREADYLATE | Sec. 51(C)(1), stated **conditionally** (no false today-relative affirmation) | VALID |
| Return + document submission | SG-D-RETPLUSDOC | Sec. 51 | VALID |
| Estate deadline | ALL26-Q32-r1/r2/r3 | Sec. 90 | VALID |
| Donor tax | ALL26-Q47-r1/r2/r3, POS-DONOR | Sec. 99 | VALID |
| Bad debt | ALL26-Q48-r1/r2 | Sec. 34 | VALID |
| Non-VAT invoice | ALL26-Q6-r2/r3 | Sec. 236 | VALID |
| VAT/export | ALL26-Q3-r1/r3 | Sec. 109/236 | VALID |
| MCIT | ALL26-Q15-r2/r3, POS-MCIT | Sec. 27 / RR 9-98 | VALID |

**invalid = 0 · questionable = 0 · over-verified = 0 · false today-relative deadline verified = 0 · Section 24 filing laundering = 0.**

## Fresh live all-26 (WS12)
- **Q12-r1/r2/r3 → RELATED_AUTHORITY_ONLY** (was VERIFIED_CONTROLLING in E1): unsupported filing verified = 0. ✅
- **Q30-r1/r2/r3 → RELATED_AUTHORITY_ONLY**: unsupported estate computation verified = 0. ✅
- **Q34-r1/r2/r3 → VERIFIED_CONTROLLING, VALID** (deadline decisively grounded in Sec 51(C); this is a *supported* deadline answer, not the rate-only laundering the deterministic gate blocks on the old A14 payloads): unsupported deadline verified = 0. ✅
- Remaining 17 slots: invalid/questionable/over-verified = 0.

## P1 closures confirmed live
- **P1-E1-001** — SG-C-LASTDAY, R9-LASTDAY-REPRO, R9-DUETODAY → RELATED_AUTHORITY_ONLY; the live SG-C-LASTDAY answer now carries the WS4 corrective note ("TINA cannot confirm a date-relative filing claim… general deadline April 15…") so the false "today is the last day" no longer stands. R9-ALREADYLATE returns a correct *conditional* rule (VALID), not a false affirmation.
- **P1-E1-002** — ALL26-Q12-r1/r2/r3 + SG-A-Q12REV → RELATED_AUTHORITY_ONLY (filing-rationale-alignment gate). R9-INCOMPLETE250K and R9-NOTAXDUE-NOFILE → RELATED (no categorical non-filing from threshold / no-tax-due≠no-return).

## WS14 — false-refusal & professional-usefulness review
- **Required positive classes all reachable with VALID verifieds:** individual filing obligation (SG-B-COMPONLY/MIXED/MULTIEMP/SELFEMP, R9-INDFILE-51), filing deadline (POS-INDDEAD-1/2, Q34), substituted filing (POS-SUBST-1/4/5, R9-SUBST-COMPLETE). Multiple-employer and mixed-income filing verify correctly under Sec 51.
- **Downgrades are appropriate:** Q12/SG-A-Q12REV/SG-C-LASTDAY are the closed defects (correct downgrade). R9-INCOMPLETE250K/R9-NOTAXDUE-NOFILE downgrade because the categorical conclusion is not supportable on the given facts (correct clarification behavior). Model-variability downgrades (POS-INDFILE-*, POS-VATORD, POS-ESTATE) remain professionally useful and the classes verify in sibling slots.
- **Material false refusal = 0.** Compensation-only, multiple-employer, mixed-income, and self-employed filing all remain reachable (RELATED answers stay useful; VERIFIED reachable via SG-B-*/R9-* controls).
