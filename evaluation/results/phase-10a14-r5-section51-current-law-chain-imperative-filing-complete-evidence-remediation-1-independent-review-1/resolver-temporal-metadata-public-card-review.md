# Resolver, Temporal Gate, Metadata, And Public Source-Card Review

## Resolver

section51-authority-chain.js is proposition-oriented and does not use question IDs or exact live probe IDs. It distinguishes filing_obligation, filing_deadline, filing_deadline_transaction, and substituted_filing.

Findings:

- Current ordinary filing resolves to BASE_PROVISION_UNCHANGED_BUT_CHAIN_REVIEWED with NIRC Sec. 51 and RA 10963/RA 11976 reviewed.
- Current transaction-specific filing timing resolves to LATER_AMENDMENT_REQUIRED and includes RA 12214 when taxableYear >= 2025.
- Missing transaction period returns filing_period_not_resolved.
- Sec. 51-A resolver output is wrong/incomplete: officialLaws contains RA 8424 only even though Sec. 51-A was created by RA 10963.
- Ordinary historical filing ignores taxableYear: a 2023 filing proposition still includes RA 11976 in amendingAuthorities.

## Temporal Sufficiency Gate

The temporal gate runs inside evaluatePropositionSourceSufficiency before ordinary filing-authority compatibility. Independent probes:

- Current CGT/transaction timing without RA 12214 -> section_51_later_amendment_missing.
- Same class with RA 12214 -> temporal gate does not block, though compatibility may still fail on unknown return-type classification.
- Ordinary April 15 deadline on Sec. 51(C) -> sufficient.
- Unrelated Sec. 24 authority for ordinary deadline -> filing_deadline_proposition_without_matching_return_authority.

## Metadata Propagation

Read-only exactAuthoritySearch confirms bridge rows carry amendmentChainReviewed=true at top level and in metadata. The R5 live matrix shows public/result cards chainReviewed=false for all rows. Therefore the metadata exists earlier and is dropped before public output, matching the executor's claimed finalSourceCards projection gap.

## Public Source Card Representation

The public sanitizer can preserve amendmentChainReviewed when the field is present. The live result demonstrates that the field is absent by the time public cards are generated. PASS requires public source cards accurately reflect reviewed currentness, so this remains P1.
