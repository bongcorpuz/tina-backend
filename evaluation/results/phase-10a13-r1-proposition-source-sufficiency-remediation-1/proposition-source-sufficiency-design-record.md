# PHASE-10A13-R1 — Proposition-Source-Sufficiency Design Record (WS2/WS3/WS4)

Extends `evaluatePropositionSourceSufficiency` (services/answer-support-validator.js) with two
proposition classes. Class-based; NO question IDs, exact prompts, answer strings, or deny lists.
Deterministic and source-card-keyed. Runs before the gpt-4o-mini validator; fails closed; never
upgrades trust.

## registration_procedural (Q38 class)
- Proposition (question-led): obligation to register; registration category; applicable registration
  form (BIR Form 190x); registration procedure (amend/update/close/transfer/cancel). A tax-RETURN-form
  question is NOT a registration act (not misclassified).
- Required authority (source cards): registration provisions/issuances — NIRC Sec 236/237/238/258,
  registration RRs (7-2012, 11-2008, 7-2024, ...) / RMCs.
- Fails closed on: foundational (Sec 1-6), withholding, general, or topically adjacent authority.

## vat_exception (Q46 class)
- Proposition (answer-led): a transaction-specific exception to the general 12% imposition — VAT-exempt,
  zero-rated, not subject to VAT, or outside VAT scope.
- Required authority (source cards): exemption/zero-rating/exception authority — NIRC Sec 109 (exempt
  transactions), the zero-rating subsections (Sec 106(A)(2)/108(B)), specific exception laws
  (RA 11256, 9994, ...), incentive authority (RA 12066/11534/CREATE MORE/PEZA).
- Fails closed on: general VAT-imposition authority alone (Sec 105-108, RR 16-2005). Catches
  exemption/zero-rating conflation and "not subject to VAT" without an adequate classification basis.

## Authority classes (deterministic, reviewable)
FOUNDATIONAL (Sec 1-6), WITHHOLDING (RR 2-1998/11-2018/..., Sec 57/58), REGISTRATION (Sec 236/237/238,
registration RRs/RMCs), GENERAL_VAT_IMPOSITION (Sec 105-108, RR 16-2005), VAT_EXCEPTION (Sec 109,
zero-rating subsections, specific exception/incentive laws), PENALTY (Sec 248/249/..., EOPT), plus the
pre-existing incentive class. A keyword in a title is not automatically sufficient — the class regexes
target the controlling provisions.

## Passage grounding
Not attempted here (would require retrieval/corpus changes). Recorded as a continuing P2; the control
uses displayed source-card labels only, which is sufficient to close the Q38/Q46 laundering classes.

## Reachability preservation
Verified reachable when the matching authority is cited: registration + Sec 236; VAT-exemption + Sec 109
/ RA 11256; valid Q5 + RA 12066. General 12% VAT (not an exception) and income-tax exemption are not in
scope. No blanket suppression of registration or VAT answers.
