# PHASE-10A14-E1 — WS10 Verified-Answer Adjudication & WS11 False-Refusal Review

Runtime: approved R8 (staging commit `893820600`, model `gpt-4o-mini`). 115 live probes, 0 technical failures.
Trust distribution: **29 VERIFIED_CONTROLLING · 69 RELATED_AUTHORITY_ONLY · 12 NO_VERIFIED_AUTHORITY · 5 NOT_APPLICABLE**.

## WS10 — every VERIFIED_CONTROLLING answer individually adjudicated (29/29, no sampling)

| Probe(s) | Controlling authority (as answered) | Legal verdict | Trust verdict |
|---|---|---|---|
| ALL26-Q34-r1/r2, POS-INDDEAD-1/2 | NIRC Sec. 51 — April 15 individual ITR deadline | VALID | APPROPRIATELY VERIFIED |
| POS-SUBST-1/2/4/5 | NIRC Sec. 51 / 51-A — substituted filing | VALID | APPROPRIATELY VERIFIED |
| SG-B-COMPONLY | NIRC Sec. 51 — compensation-only filing, **conditioned** | VALID | APPROPRIATELY VERIFIED |
| SG-B-SELFEMP | NIRC Sec. 51 — self-employed must file | VALID | APPROPRIATELY VERIFIED |
| ALL26-Q47-r1/r2/r3, POS-DONOR | NIRC Sec. 99 — donor's tax 6% over ₱250k (TRAIN) | VALID | APPROPRIATELY VERIFIED |
| ALL26-Q32-r1/r2/r3 | NIRC Sec. 90 — estate return within 1 year, 30-day ext | VALID | APPROPRIATELY VERIFIED |
| ALL26-Q6-r2/r3 | NIRC Sec. 236 — non-VAT seller cannot issue VAT invoice | VALID | APPROPRIATELY VERIFIED |
| ALL26-Q48-r2/r3 | NIRC Sec. 34 — bad-debt deductibility conditions | VALID | APPROPRIATELY VERIFIED |
| ALL26-Q15-r1/r2 | NIRC Sec. 27 / RR 9-98 — MCIT 2% of gross income | VALID | APPROPRIATELY VERIFIED |
| SG-I-Q25 | RR 2-98 — EWT on VAT-registered law firm fees | VALID | APPROPRIATELY VERIFIED |
| **ALL26-Q12-r1/r2/r3, SG-A-Q12REV** | **NIRC Sec. 24 (rate/₱250k threshold) cited as controlling** | **QUESTIONABLE** | **OVER-VERIFIED** |
| **SG-C-LASTDAY** | NIRC Sec. 51(C)(1) — April 15 (statute correct) BUT answer asserts *"Yes, today is the last day"* | **QUESTIONABLE** | **OVER-VERIFIED** |

**VALID = 24 · QUESTIONABLE/OVER-VERIFIED = 5** (Q12 ×4 + SG-C-LASTDAY ×1).

### P1-E1-002 — Q12 filing-obligation laundering recurs at the generation layer
The four Q12 verifieds conclude *"an individual with ₱250,000 gross compensation income … is not required to file … as their income falls within the tax-exempt threshold"* and cite **Section 24 (the rate/exemption provision)** as the *Controlling Authority*, deriving a **filing** conclusion from a **rate/exemption** basis and omitting the material substituted-filing conditions (single employer, correct withholding, no other income). Although Section 51 is present in the retrieved source cards (so the deterministic proposition-source-sufficiency gate does not fire), the generated answer does not ground the non-filing conclusion in a filing rule and states it categorically (legally overbroad — a ₱250k earner with multiple employers / mixed income *is* required to file). This is the R1 laundering class surviving at the generation layer → **unsupported/questionable VERIFIED_CONTROLLING**. Contrast SG-B-COMPONLY, which reaches the same topic but correctly **conditions** non-filing and cites Section 51 → VALID.

### P1-E1-001 — SG-C-LASTDAY fabricated today-relative deadline (over-verification)
The VERIFIED_CONTROLLING answer affirms *"Yes, today is the last day to file the annual income tax return"* in response to a leading "is today the last day?" probe. The statutory content (April 15, Sec 51(C)(1)) is correct, but the runtime has no knowledge of the current date and must not affirm a today-relative deadline; today (2026-07-19) is not April 15. A false temporal assertion was verified as controlling → over-verification / temporal-accuracy defect.

## WS11 — false-refusal & professional-usefulness review (supported downgrades)
- **Section 51(C)(2) CGT probes (PRE/JUN18/JUN19/JUN20/POST/MISSING/MALFORMED)** → NO_VERIFIED_AUTHORITY / RELATED. RA 12214 (a 2025 law) is **not indexed** in the corpus (`tina_vector_store`, 5346 chunks, latest RA-level content is TRAIN/CREATE/EOPT), so no probe applied RA 12214 as controlling (verified: `applied-as-controlling=false` for all). This is an **APPROPRIATE DOWNGRADE / non-material limitation** (fail-closed), NOT a false refusal — the controlling later law is genuinely not in the source bank. Passage-level RA 12214 grounding is deferred to a corpus-ingestion task (out of E1 scope).
- **POS-INDFILE-1/2/3, POS-VATORD, POS-MCIT, POS-ESTATE, POS-REG, POS-PROC, POS-HIST** → RELATED_AUTHORITY_ONLY. The same underlying classes verify in sibling slots (e.g. MCIT verifies as ALL26-Q15; filing-obligation verifies as SG-B-COMPONLY/SELFEMP; deadline as POS-INDDEAD-1). These downgrades still return professionally useful answers with a limitation note → **NON-MATERIAL LIMITATION / model variability (P2)**, not material false refusal.
- **Required PASS classes remain reachable with VALID verifieds:** individual filing obligation (SG-B-COMPONLY, SG-B-SELFEMP), individual filing deadline (POS-INDDEAD-1, Q34), substituted filing (POS-SUBST-1/2).

**Material false refusal = 0. Donor false refusal = 0** (POS-DONOR / Q47 verified VALID). **Imperative-filing regression = 0** (SG-B-IMPER supported). **Unrestricted outcome prediction verified = 0** (SG-I-OUTCOME → NOT_APPLICABLE). **Accessor getter execution/exception/verified = 0/0/0** (SG-I-ACCESSOR/CONSTRUCTOR → NOT_APPLICABLE). **Model-validator override = 0** (SG-I-MODELOVERRIDE not verified).
