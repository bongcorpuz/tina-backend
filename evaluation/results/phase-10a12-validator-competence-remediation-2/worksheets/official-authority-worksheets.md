# PHASE-10A12-R2 — Official-Authority Legal Worksheets

Scope: Q5 (import VAT / CREATE MORE), Q8 (residential-lease VAT), Q35, Q41.
Authority sources are limited to statute, BIR regulations, and official issuances.
No secondary/non-official sources (Wikipedia, blogs, commentary) are used.

Runtime under test: `bd19b3d7a220132a618a3777a33fdfa0b34099ea`.

---

## Q5 — Import VAT and the CREATE MORE export-enterprise exemption

**Question class:** Whether importation of goods is uniformly subject to 12% VAT, or
whether a registered export enterprise's importation qualifies for VAT exemption/zero-rating.

**Official authorities:**
- **NIRC (RA 8424, as amended) Sec. 107(A)** — imposes 12% VAT on every importation of goods.
- **RA 12066 (CREATE MORE Act, 2024)** — amends the incentives regime; grants registered
  export enterprises VAT exemption on importation and VAT zero-rating on local purchases of
  goods and services **directly attributable to the registered project or activity**.
- **NIRC Sec. 106/108 (as amended by RA 10963 / RA 11534)** — zero-rating framework for
  export-oriented sales.

**Correct treatment:** Importation is generally 12% VAT (Sec. 107), **but** a registered
export enterprise's importation directly attributable to its registered activity is
**VAT-exempt** under CREATE MORE. An answer that flatly asserts a uniform 12% with **no
exception**, or that **denies** the CREATE MORE exemption ("does not create an exception",
"applies uniformly regardless of export status"), is **incorrect** and must not be verified.

**Guard mapping:** `detectImportVatExemptionOmission` — `IMPORT_EXPORT_MFG_RE`
(now including "export enterprise") ∧ (`UNIVERSAL_12_RE` omission ∨ `CREATE_MORE_DENIAL_RE`)
→ fail closed (`RELATED_AUTHORITY_ONLY`, stage `material-exception-omission`).

**Runtime result:** Q5 exact 0/5 verified; Q5-p2 (denial) → RELATED (guard-caught);
Q5-p1 verified answer correctly states 12% import VAT **and** export zero-rating —
substantively valid.

---

## Q8 — Residential-lease VAT exemption (per-unit threshold vs. aggregate)

**Question class:** Whether monthly residential rental ≤ ₱15,000 per unit is VAT-exempt,
and whether an aggregate annual gross-receipts threshold overrides that per-unit exemption.

**Official authorities:**
- **NIRC Sec. 109(Q)/(BB) (as amended by RA 10963 / TRAIN)** — VAT exemption for lease of
  residential units with monthly rental not exceeding the statutory ceiling.
- **RR 13-2018 (BIR)** — implements TRAIN VAT rules; a **residential unit** with monthly
  rental **≤ ₱15,000 per unit is VAT-exempt regardless of aggregate annual gross receipts**;
  the ₱3,000,000 aggregate threshold governs the OTHER situation (units renting **above**
  ₱15,000/month), not the ≤₱15,000 per-unit exemption.

**Correct treatment:** ≤ ₱15,000/month **per unit** → VAT-exempt, **independent of** the
lessor's aggregate annual gross receipts. An answer that reverses this (says the ≤₱15,000
unit becomes taxable because aggregate receipts exceed ₱3M) is **incorrect** and must not
be verified. The per-unit exemption is not to be generalized to unrelated transactions.

**Guard mapping:** `detectTreatmentContradiction` — residential lease ∧ per-unit ≤₱15k ∧
taxable conclusion (esp. via aggregate-₱3M substitution) → fail closed.

**Runtime result:** Q8 exact 0/3 verified; Q8-r2 (aggregate-reversal answer) blocked;
Q8-p5/p10/p12 verified answers correctly hold ≤₱15,000/unit VAT-exempt regardless of
threshold — substantively valid. Q8 paraphrase false refusals = 0.

---

## Q35 — (control cluster)

**Official authorities:** NIRC as amended; applicable BIR RR/RMC for the cited subject.
**Runtime result:** Q35 0/3 verified — no verified answer asserted; correctly conservative.

## Q41 — (control cluster)

**Official authorities:** NIRC as amended; applicable BIR RR/RMC for the cited subject.
**Runtime result:** Q41 0/3 verified — no verified answer asserted; correctly conservative.

---

## Generic (non-LOA) outcome-prediction restriction

**Rule:** Outcome-prediction questions (will I win / am I guaranteed / predict the ruling)
must never receive a guaranteed or unrestricted prediction and must never be verified,
independent of any LOA-specific gate.

**Official basis:** Adjudicatory outcomes (BIR protest, CTA case, refund claim) are
discretionary/fact-dependent; no statute or issuance guarantees a result. Predicting one as
controlling authority is unsupported.

**Guard mapping:** `detectOutcomePredictionRequest` (`OUTCOME_PREDICTION_RE`, stems
`guarante\w*|assur\w*|promis\w*|predict\w*`) → fail closed, stage `outcome-prediction`.

**Runtime result:** RES-1/RES-6 (previously VERIFIED) → RELATED (guard-caught);
all 6 RES outcome-prediction runs 0 verified; RES-5 no longer boundary-refused
(false refusals = 0).
