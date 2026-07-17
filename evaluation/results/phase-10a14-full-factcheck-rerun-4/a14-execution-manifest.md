# PHASE-10A14 Pre-Execution Manifest (human-readable)

- Task: PHASE-10A14-FULL-FACTCHECK-RERUN-4 (evaluation only)
- Branch: feature/source-availability-engine-v1
- Baseline runtime commit: e381e3c9dc34af70772a91ae693b68d2376d5a0a
- Model: gpt-4o-mini (frozen; no migration)
- Node: v22.18.0
- validatorHashSha256: 73379c05a0ab7af2b1410b08a64a18b5b173a5a8f5f6f8d1466a61b5641a9146
- sourceBankSnapshotSha256: 526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed
- Questions: 50 (Q1-Q50), rounds 3, canonical slots 150
- Frozen controls: registration_procedural + vat_exception (class-based, fail-closed, before validator). Hardcoding disclosure: No Q38/Q46 question-ID branch, no exact-prompt comparison, no defective-answer comparison, no Form-1902 deny condition, no BSP/gold pass-or-fail branch. Documentation comments reference Q38/Q46 as the defect classes. The vat_exception APPLICABILITY disjunction (line ~646) includes transaction-context keywords vat/value-added tax/sale/lease/import/transaction/gold/export -- 'gold' is one context keyword among many and does not determine pass/fail (the fail decision is authority-class based); a non-gold VAT-exception (e.g., agricultural products) triggers via 'sale'/'vat'. Runtime is FROZEN and not modified in A14.

## Sidecar reachability controls (outside canonical 150)
- **SIDE-REG-POS** (registration_positive): Is a newly organized domestic corporation required to register with the BIR before it begins business operations, and what BIR registration form does a corporation file?
  - expected authority: NIRC Sec 236 (registration); BIR Form 1903 (corporation/partnership registration)
  - expected: may reach VERIFIED_CONTROLLING only if the correct form (1903) and controlling registration authority (Sec 236) are present; demonstrates the registration_procedural gate does not blanket-suppress a correctly supported registration proposition.
- **SIDE-VATEXC-POS** (vat_exception_positive): Is the sale of agricultural and marine food products in their original state subject to VAT?
  - expected authority: NIRC Sec 109(A) (exempt transactions)
  - expected: may reach VERIFIED_CONTROLLING only if VAT-exemption is correctly classified (not zero-rating) on the specific exemption authority (Sec 109); demonstrates the vat_exception gate does not blanket-suppress a correctly supported exemption.
- **SIDE-GENVAT-POS** (general_vat_ordinary): What is the VAT rate on the sale of goods in the Philippines?
  - expected authority: NIRC Sec 106 (12% VAT imposition)
  - expected: an ordinary general-VAT-imposition proposition (12% rule, not an exception) must NOT be blocked by the vat_exception gate; verified reachability on the general rule is acceptable.

## Retry policy
Retries only for objective technical failure (transport/timeout/HTTP/reset/empty/invalid envelope/missing contract fields/truncated non-substantive output/persistence transport). Max 2 per slot (more only for a documented multi-request infrastructure incident). First technically-complete response is canonical; never select among complete answers on legal quality; never retry an unfavorable legal answer. Retries preserved separately and EXCLUDED from the 150 canonical total.

## Prohibited modifications
runtime, validator, tests, fixtures, question bank, prompts, source bank, corpus, vector index, model, reindex, deploy, frontend, Dev Factory, schema/db
