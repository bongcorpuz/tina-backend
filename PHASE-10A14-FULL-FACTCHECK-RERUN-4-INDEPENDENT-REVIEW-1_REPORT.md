# PHASE-10A14-FULL-FACTCHECK-RERUN-4-INDEPENDENT-REVIEW-1 REPORT

Decision: REVISIONS REQUIRED

## Executive Decision

A14 mechanically reconciles: 150/150 canonical payloads exist, runlog hashes match payloads, persistence is 2 for all canonical runs, runtimeCommit is 87ce0c7 for all payloads, high-risk Q5/Q8/Q25/Q36/Q38/Q46 clusters failed closed, Q38/Q46 were 0/3 verified, retries were technical and preserved, and independent runner verification passed 190 deterministic + 7 staging suites.

However, A14 does not satisfy the PASS criterion requiring questionable verified = 0. Independent adjudication found 9 QUESTIONABLE VERIFIED_CONTROLLING payloads across Q12, Q30, and Q34. These are P1 trust/legal-support defects because the answers were promoted to VERIFIED_CONTROLLING even though the displayed authorities did not adequately support the decisive proposition or the answer overstated statutory base/conditions.

## Independent Counts

- Canonical questions: 50.
- Canonical rounds: 3.
- Canonical payloads: 150.
- VERIFIED_CONTROLLING from payloads: 26.
- RELATED_AUTHORITY_ONLY from payloads: 76.
- NO_VERIFIED_AUTHORITY from payloads: 48.
- Mechanical checksum: 26 + 76 + 48 = 150.
- Independently valid verified: 17.
- Independently questionable verified: 9.
- Independently invalid verified: 0.
- P0: 0.
- P1: 3.
- P2: 3.
- P3: 1.

## P1 Findings

1. IR1-P1-001: Q12-r1/r2/r3 were verified for a no-filing-required answer based on PHP 250,000 gross compensation income, but the source cards were NIRC Sec. 24, Sec. 23, and Sec. 27. Those sources do not establish the income-tax-return filing rule or substituted-filing/no-filing conditions. The answer converts a rate/no-tax conclusion into a filing-obligation conclusion without controlling filing authority.

2. IR1-P1-002: Q30-r1/r2/r3 were verified for an estate-tax answer stating the TRAIN rate as 6% on the estate value exceeding PHP 5,000,000. RA 10963 Sec. 84 sets 6% based on the value of the net estate; Sec. 86 separately supplies deductions and distinguishes taxpayer classes. The answer blurs rate, base, deduction, and taxpayer classification.

3. IR1-P1-003: Q34-r1/r2/r3 were verified for the individual AITR deadline using NIRC Sec. 23, Sec. 24, and Sec. 27 source cards. Those provisions do not establish the April 15 filing deadline. Filing-specific authority such as NIRC Sec. 51/BIR filing instructions is required.

## Non-Blocking Findings

- Registration-positive sidecar and VAT-exception-positive sidecar remain P2 retrieval/source-surfacing limitations. They failed closed correctly rather than proving blanket suppression.
- Q3 citation precision is P2: broad RR/source labels were used for exporter input-VAT refund support; this should be tightened but is not independently release-blocking.
- Q10 degenerate retry behavior is P3: preserved, technical, and not evidence of answer selection.

## Runner Verification

- node scripts/run-regressions.mjs: exit 0; syntax 10/0; deterministic suites 190/0.
- node scripts/run-staging-smokes.mjs: sandbox run failed one reachability assertion; approved network-enabled rerun exit 0; staging suites 7/0.
- Combined final runner total: 197 passed, 0 failed.

## Final

REVISIONS REQUIRED. Phase 10A remains open. No Phase 10A closure, Phase 10B, Phase 10C, adversarial testing, reindexing, deployment, production change, frontend work, model migration, or remediation was performed.
