# PHASE-10A12-R6 Independent Validator-Competence Review 1

Reviewer: Codex GPT-5, high reasoning / low speed  
Task: PHASE-10A12-R6-INDEPENDENT-VALIDATOR-COMPETENCE-REVIEW-1  
Reviewed remediation: PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-6  
Branch: feature/source-availability-engine-v1  
Review date: 2026-07-17

## Decision

PASS.

R6 independently clears the four R5 P1 findings. M-Q36 and M-Q25 are no longer VERIFIED_CONTROLLING; both fail closed at the deterministic `proposition-source-sufficiency` stage and are classified RELATED_AUTHORITY_ONLY. The governed mini-30 reused the unchanged R5 source bank and canonical manifest, reconciled 30/30, and produced 4 VERIFIED_CONTROLLING, 16 RELATED_AUTHORITY_ONLY, and 10 NO_VERIFIED_AUTHORITY with no invalid or questionable verified result requiring a blocker.

The deterministic runner lane passed twice with 189 suites and 0 failures. The staging lane initially failed under sandboxed network conditions, then passed twice with network access: 7 suites, 0 failures, exit 0 both cycles. Total suite accounting reconciles as 189 deterministic + 7 staging = 196.

A13 may proceed only to the next separately authorized A12 step. This review does not authorize the adversarial suite, Phase 10A closure, Phase 10B, Phase 10C, model change, reindexing, deployment, or production changes.

## Severity Summary

- P0: 0
- P1: 0
- P2: 6
- P3: 1
- Security: 0 confirmed secrets

## P1 Closure

| Prior R5 P1 | Independent R6 result | Decision |
| --- | --- | --- |
| M-Q36 invalid VERIFIED_CONTROLLING | M-Q36 now RELATED_AUTHORITY_ONLY, `verifiedEligible=false`, stage `proposition-source-sufficiency`, reason `penalty_proposition_without_penalty_authority`. | Closed |
| M-Q25 invalid/questionable VERIFIED_CONTROLLING | M-Q25 now RELATED_AUTHORITY_ONLY, `verifiedEligible=false`, stage `proposition-source-sufficiency`, reason `ewt_proposition_without_withholding_authority`. | Closed |
| Deterministic runner failed | `node scripts/run-regressions.mjs` passed twice: syntax 10/0, suites 189/0, exit 0. | Closed |
| Staging runner failed | `node scripts/run-staging-smokes.mjs` passed twice with network access: suites 7/0, exit 0. | Closed |

## Evidence Highlights

- HEAD reviewed: `fe7d22e4ca54d6415cd58b51fb4cf2cb2107cd70`.
- Expected commits present in order: `920ed53`, `09751a6`, `173e0b6`, `fe7d22e`.
- Start and final sync observed as `0 0` before review artifact commit.
- Protected untracked paths preserved: `.claude/`, `.vscode/`, `evaluation/factcheck/`.
- R5 governed manifest/source-bank path history shows only the original `cd04630` freeze commit.
- Source-bank snapshot SHA-256 reproduced: `526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed`.
- Canonical set SHA-256 reproduced: `8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1`.
- R6 evidence manifest hashes matched: 53/53.
- Focused R6 test passed directly: 16 passed, 0 failed, 30 assertions.

## Architecture Determination

`evaluatePropositionSourceSufficiency` is deterministic, fail-closed, and invoked before LLM/model approval in `evaluateAnswerSupport`. A failed deterministic gate returns immediately with `verifiedEligible=false`; model approval cannot override it. The gate is keyed by proposition class and authority class rather than question IDs, exact question text, or exact answer strings.

The implementation covers the two proven R5 legal-risk classes: penalty/procedural propositions and expanded/creditable withholding propositions. It also preserves non-applicability for final withholding tax, ordinary VAT/income/estate questions, and incidental penalty mentions in non-penalty questions.

Residual limitation: the authority-class check is based on displayed source-card labels, not passage-level source excerpts. That is adequate to close the R5 P1 laundering defect but remains a P2 source-grounding limitation.

## Legal Determinations

M-Q36: PASS. The prior fabricated monthly 25% penalty capped at 50% is no longer verified. R6 still produced an answer containing penalty claims, but because the retrieved source cards were general VAT authorities rather than penalty/procedural authorities, the deterministic gate blocked VERIFIED_CONTROLLING. RELATED_AUTHORITY_ONLY is appropriate and not a false refusal.

M-Q25: PASS. The answer still gives a categorical EWT conclusion from VAT registration/invoicing authority, but the deterministic EWT gate blocks VERIFIED_CONTROLLING because no withholding authority is in the source cards. RELATED_AUTHORITY_ONLY is appropriate and not over-conservative.

Verified mini-30 results inspected individually: M-Q6, M-Q12, M-Q15, and M-Q30. M-Q30 retains a known precision issue in phrasing the 5M standard-deduction concept as a threshold, but the asked proposition is the TRAIN estate-tax rate and the 6% rate is correct. I classify it as a non-blocking P2 precision carryover, not a current P1 invalid/questionable verified blocker.

## Runner Determination

R6 adds one deterministic focused suite and does not remove staging coverage. The suite count change reconciles from 195 to 196 as:

- Prior: 188 deterministic + 7 staging = 195.
- R6: 189 deterministic + 7 staging = 196.
- Delta: one new focused deterministic suite, `tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs`.

The 09ZF `.claude/` scope fix is narrow: it excludes only a governance-protected untracked path, alongside existing protected `.vscode/` and `evaluation/factcheck/` exclusions. Dirty tracked files and unrelated untracked paths remain subject to the allowed-file assertion.

## P2 / P3 Residuals

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| P2-A | P2 | Source excerpts are still not committed with payloads; review sees source-card labels, not full retrieved passages. | Carry forward. |
| P2-B | P2 | Proposition-source gate is class-based but not exhaustive; it covers penalty/EWT, not all procedural/form/deadline/DST/percentage-tax source-sufficiency classes. | Carry forward as extensibility work. |
| P2-C | P2 | Authority-class matching uses source-card labels/section names, not passage-level proposition support. | Carry forward. |
| P2-D | P2 | Positive penalty/EWT controls prove gate reachability, but do not independently prove full live LLM VERIFIED_CONTROLLING for a valid penalty/EWT answer in the mini-30. | Carry forward. |
| P2-E | P2 | M-Q30 remains imprecise on the 5M standard-deduction/base framing, though the 6% rate proposition is correct. | Carry forward as precision remediation. |
| P2-F | P2 | 09ZF simulated-reversion proof is mostly code-inspection/report evidence; no standalone simulation transcript was found. | Carry forward as evidence polish. |
| P3-A | P3 | Sandbox network denial can make staging appear unavailable; escalated network runs were required for clean staging evidence. | Monitor review environment. |

R5 executor P2 reconciliation: the prior P2 that Q5/Q8 cluster-specific guards did not cover the M-Q25/M-Q36 classes is closed for those two proven classes. It is reclassified into the broader non-exhaustive proposition-class coverage P2 above. The safe-under-claim precision issue is not fully closed because M-Q30 still carries precision debt. I therefore do not accept executor P2=4 exactly; independent P2 count is 6.

## A13 Recommendation

A13 may proceed only if there is a separate authorization for the next A12 step. R6 itself receives PASS, but this review does not authorize Phase 10A closure, adversarial execution, production deployment, model changes, reindexing, or Phase 10B/10C.