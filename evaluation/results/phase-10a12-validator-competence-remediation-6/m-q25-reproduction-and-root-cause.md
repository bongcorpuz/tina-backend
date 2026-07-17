# PHASE-10A12-R6 — M-Q25 Exact Reproduction & Root Cause (WS2)

Not assumed identical to M-Q36. Inspected directly.

## Exact reproduction (from governed R5 payload + R6 runtime)

- **Prompt (frozen manifest):** "Is EWT required on payments to a VAT-registered law firm?"
- **R5 committed answer (verbatim, excerpt):** "Yes, Expanded Withholding Tax (EWT) is required on
  payments to a VAT-registered law firm. ... VAT-registered professionals ... are required to issue
  VAT invoices ... the business ... must withhold EWT ...".
- **R5 source cards:** NIRC Sec. 109 (VAT-exempt transactions), Sec. 236 (registration), RR 16-2005,
  RMC 75-2015 — VAT registration/invoicing authorities.
- **R5 trust:** VERIFIED_CONTROLLING; answerSupport stage `llm`, verifiedEligible=true.

## Precise root cause (distinct from M-Q36)

This is **not** a penalty defect. Two linked defects:
1. **Authority-topic mismatch (generic-source-card laundering):** an EWT (creditable/expanded
   withholding) conclusion is verified on **VAT registration/invoicing** authority. VAT registration
   concerns business tax and **does not determine EWT**. The controlling authority for professional-
   fee EWT is the withholding regulations (RR 2-1998 as amended by RR 11-2018; RMC 50-2018).
2. **Missing statutory conditions / materially incomplete:** the answer says "yes categorically" and
   frames VAT registration as dispositive. Under the frozen bank the correct analysis turns on the
   **law firm's legal form**:
   - sole practitioner / individual professional: generally subject to professional-fee EWT;
   - **qualifying GPP: professional-fee receipts are NOT subject to creditable EWT** (partner-level
     treatment is separate);
   - taxable juridical professional entity (non-GPP): EWT depends on current-year income/declaration.
   The answer omits the GPP distinction, which can cause a withholding error.

Root-cause classification: **authority-topic mismatch + generic-source-card laundering + missing
statutory (legal-form) conditions** — a different class from M-Q36's penalty defect.

## R6 outcome

The deterministic `proposition-source-sufficiency` gate classifies this as a `withholding_ewt`
proposition and, finding no withholding authority in the source cards, fails closed
(`ewt_proposition_without_withholding_authority`). Live R6 rerun: M-Q25 -> RELATED_AUTHORITY_ONLY,
verifiedEligible=false. Invalid/questionable verified eliminated. Valid EWT reachability preserved:
an EWT answer that cites RR 2-1998/11-2018 passes the gate (focused test B3).
