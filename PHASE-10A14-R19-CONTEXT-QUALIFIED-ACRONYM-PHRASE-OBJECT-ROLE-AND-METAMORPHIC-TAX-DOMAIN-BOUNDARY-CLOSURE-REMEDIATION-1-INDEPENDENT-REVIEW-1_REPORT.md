# PHASE-10A14-R19 Independent Review 1

Decision: REVISIONS REQUIRED

R19 prospective governance: NOT SATISFIED. Phase 10A remains OPEN.

## Blocking Findings

- P1-IR19-001 (P1): Independent semantic campaign failed. INDEPENDENT_SEMANTIC_CAMPAIGN_RESULT.json: 729/1120, falseAllows=179, falseRefusals=162, metamorphicFailures=36.
- P1-IR19-002 (P1): Dominant veto rejects genuine mixed-domain tax questions. mixed-domain-genuine-tax-report.json: 102/210 failed.
- P1-IR19-003 (P1): Tax-shaped anchors still create false allows for explicit non-tax meanings. explicit-non-tax-report.json: 74/260 failed; lowercase-titlecase-heuristic-review.json: 110/200 failed.
- P1-IR19-004 (P1): Executor unseen campaign is not independent for the final runtime. Commit b3e879b1 message states runtime refinements were discovered while building and iterating the executor unseen campaign; commit 23f71a39 later records the 726-row unseen evidence.
- P1-IR19-005 (P1): Governed attempt registry omits required invocations. CANONICAL_ATTEMPT_REGISTRY.json counts: total=4, domain_campaign=0, focused_suite=0; executor report separately relies on three domain campaigns and 22 focused suites.

## Independent Runtime Campaign

Frozen oracle: evaluation/results/phase-10a14-r19-independent-review-1/INDEPENDENT_SEMANTIC_ORACLE_1120_PLUS.json

Oracle SHA-256: 55183f06b043187c0b26cd66e7e699a8265721fedb293ffe79b2b5825a66cd2f

Result: 729/1120; material false allows 179; material false refusals 162; clarify mismatches 50; metamorphic failures 36.

False refusal examples:
- IR19-0020: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 20?
- IR19-0040: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 40?
- IR19-0060: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 60?
- IR19-0080: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 80?
- IR19-0100: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 100?
- IR19-0120: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 120?
- IR19-0140: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 140?
- IR19-0160: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context: How do we document NOLCO in case 160?

False allow examples:
- IR19-0205: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Create a checklist for database field label FLD. Control 5.
- IR19-0208: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Sort records by culture and customs lesson. Control 8.
- IR19-0210: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Debug the board-game transfer pricing mechanic. Control 10.
- IR19-0212: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Which gross estate marketing slogan is best? Control 12.
- IR19-0225: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Create a checklist for database field label FLD. Control 25.
- IR19-0228: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Sort records by culture and customs lesson. Control 28.
- IR19-0230: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Debug the board-game transfer pricing mechanic. Control 30.
- IR19-0232: expected NOT_ALLOW, got ALLOW/strong_tax_signal: Which gross estate marketing slogan is best? Control 32.

## R18 Corrected Oracle

The R18 acronym_context field swap is real and limited to 38 rows. Corrected derivative passes 38/38; corrected semantic 567 passes 567/567. This does not cure the independent R19 campaign failures.

## Freeze And Unseen Result

The executor 726-row campaign passes 726/726, but it is not a valid unseen holdout for final runtime b3e879b1. The b3e879b1 commit message says runtime refinements were discovered while building and iterating that campaign.

## Registry Result

The frozen plan required domain campaigns and focused batches to be registered attempts. Actual registry has totalAttempts=4, domain_campaign=0, focused_suite=0. This is incomplete and blocks governance.

## Gates

Independent deterministic cycles: 2/2 exit 0. Independent staging cycles: 2/2 exit 0. These passes do not cure P1 semantic and evidence-governance defects.

## Claim Adjudication

See evaluation/results/phase-10a14-r19-independent-review-1/claim-adjudication.json. PASS, R19 governance satisfaction, unseen-holdout status, registry completeness, dominant-veto safety, strong-anchor safety and title-case/lowercase heuristic safety are rejected.

## Next Remediation

Smallest next remediation: R20 should redesign the dominant-veto/strong-anchor precedence so explicit tax questions about ordinary objects remain reachable, explicit non-tax meanings remain excluded, and the governed attempt registry records every campaign/focused/gate/transient invocation required by the frozen contract. Do not start R20 in this review.
