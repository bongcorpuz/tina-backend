# PHASE-10A12-R5 Independent Validator-Competence Review 1

Reviewer: Codex GPT-5, high reasoning / low speed  
Task: PHASE-10A12-R5-INDEPENDENT-VALIDATOR-COMPETENCE-REVIEW-1  
Reviewed remediation: PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-5  
Branch: feature/source-availability-engine-v1  
Review date: 2026-07-16

## Decision

REVISIONS REQUIRED.

R5 did materially improve the governance evidence for the prospective mini-30 by committing a source-bank snapshot, manifest, hashes, and selection rationale before the R5 evidence commit. The frozen source-bank hash, selected IDs, canonical set hash, evidence manifest hashes, and 30 committed payloads reconciled independently.

However, the independent review does not confirm R5's claimed acceptance state. The mandatory runner gates did not pass live, and the live mini-30 contains invalid VERIFIED_CONTROLLING answers. A13 is NOT AUTHORIZED.

## Severity Summary

- P0: 0
- P1: 4
- P2: 3
- P3: 1
- Security: 0 confirmed secrets; one harmless scan false-positive on the word risk-classified

## P1 Findings

| ID | Severity | Finding | Evidence | Required action |
| --- | --- | --- | --- | --- |
| P1-A | P1 | M-Q36 is INVALID VERIFIED_CONTROLLING. | Payload `M-Q36.json` verifies a VAT late-filing penalty answer that cites only general VAT authorities and states a fabricated monthly 25% penalty capped at 50%. The frozen bank requires penalty/procedural authorities and differentiated EOPT treatment. | Add a deterministic penalty/procedural source-sufficiency guard and rerun the governed mini-30. |
| P1-B | P1 | Deterministic regression gate failed live twice. | `node scripts/run-regressions.mjs` exited 1 both independent runs: syntax 10/0, suites 188 run / 1 failed. The failing suite was `tests\phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs`, rejecting `.claude/settings.local.json` despite the assignment requiring protected untracked directories to be preserved. | Make the deterministic lane pass from the governed working state without deleting protected evidence or weakening coverage. |
| P1-C | P1 | Mandatory staging-smoke gate failed live twice. | `node scripts/run-staging-smokes.mjs` exited 1 both independent runs: 7 suites run / 1 failed. `tests\phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs` failed because staging was not reachable for a PASS decision. | Staging lane must exit 0 twice, or the phase must remain blocked. |
| P1-D | P1 | M-Q25 is also invalid/questionable as VERIFIED_CONTROLLING. | Payload `M-Q25.json` answers categorically that EWT is required on payments to a VAT-registered law firm and cites VAT registration/invoicing authorities, while the frozen bank requires legal-form distinctions, states VAT registration is not determinative, and requires EWT authorities such as RR 2-1998 as amended by RR 11-2018 and RMC 50-2018. | Add source/proposition controls for EWT/legal-form questions and rerun the governed mini-30. |

## P2 Findings

| ID | Severity | Finding | Evidence | Required action |
| --- | --- | --- | --- | --- |
| P2-A | P2 | Owner authorization and first-live chronology remain incomplete as independent artifacts. | R5 report, manifest, and CURRENT_STATE assert explicit R5 authorization and pre-live push, and git ancestry supports freeze-before-evidence. No separate owner authorization artifact or immutable first-live request timestamp was found in committed evidence. | Add explicit governed authorization and immutable live-run chronology artifacts for future reruns. |
| P2-B | P2 | 09ZF simulated-reversion proof is claimed but not independently evidenced as a committed artifact. | The revised suite is inspectably failable for missing pipeline marker/fixture, but the referenced simulated reverted-pipeline log was not found as standalone evidence. | Commit the simulation output or remove the claim. |
| P2-C | P2 | Validator architecture remains cluster-specific and LLM-dependent. | R5 did not change validator runtime. Existing Q5/Q8 safeguards do not generalize to penalties, EWT legal-form distinctions, or other procedural/source-sufficiency classes. | Generalize deterministic source-sufficiency gates by proposition class. |

## P3 Finding

| ID | Severity | Finding | Evidence | Required action |
| --- | --- | --- | --- | --- |
| P3-A | P3 | M-Q10 had transient degenerate attempts before a final safe payload. | R5 runlogs show three failed M-Q10 attempts in `set-r5mini30-runlog.json`, then a separate successful retry in `set-r5-q10-runlog.json`. The committed payload is safe, but the retry trail should remain visible. | Keep retry provenance and monitor for recurrent degenerate generations. |

## Gate Decisions

| Gate | Decision | Notes |
| --- | --- | --- |
| Source-bank snapshot | PASS | Snapshot hash reproduced as `526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed`; local master was byte-identical to committed snapshot. |
| Canonical mini-30 selection | PASS | Selected IDs reproduced exactly and canonical set SHA-256 reproduced as `8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1`. |
| Evidence manifest | PASS | 43/43 manifest hashes matched. |
| Mini-30 mechanics | PASS | 30 payloads, no missing/extra IDs, no duplicate IDs, 30 unique payload hashes, no prompt/runtime mismatches. |
| Verified legal audit | FAIL | M-Q36 invalid verified; M-Q25 also invalid/questionable verified. |
| Deterministic runner lane | FAIL | Two live independent runs exited 1. |
| Staging runner lane | FAIL | Two live independent runs exited 1. |
| Q5 prior remediation | PASS for preservation | R5 did not alter validator runtime; prior A12/Q5 suites passed inside deterministic lane despite the overall lane failure. |
| Overall R5 | REVISIONS REQUIRED | A13 NOT AUTHORIZED. |

## Runner Live Evidence

The independent reviewer ran the exact commands required by the assignment in clean Node processes.

`node scripts/run-regressions.mjs`:

- Run 1: exit 1; syntax 10 run / 0 failed; suites 188 run / 1 failed; failed 09ZF allowed-file scope assertion on `.claude/settings.local.json`.
- Run 2: exit 1; syntax 10 run / 0 failed; suites 188 run / 1 failed; same failure.

`node scripts/run-staging-smokes.mjs`:

- Run 1: exit 1; 7 suites run / 1 failed; failed 09R staging reachability consistency.
- Run 2: exit 1; 7 suites run / 1 failed; same failure.

This contradicts the R5 report's claimed clean deterministic 188/0 and staging 7/7 live state. Under LIVE EVIDENCE > CLAIMS, the runner gate is failed.

## Legal Validator Findings

M-Q36 asks: "What penalties apply to late filing of a VAT return?"

The verified answer states a PHP 1,000 fine plus an additional 25% of the tax due for each month of delay, capped at 50%. That is not the controlling Philippine VAT late-filing penalty framework. The cited sources are general VAT sections 105 to 108 and RR 16-2005, not the penalty/procedural authorities. The frozen source bank requires NIRC sections 114, 248, and 249, RA 11976, RR 6-2024, and RMC 52-2023, including micro/small EOPT reduced penalties, ordinary surcharge/interest rules, fraud/willful neglect treatment, and form-deadline distinctions.

M-Q25 asks: "Is EWT required on payments to a VAT-registered law firm?"

The verified answer says yes categorically and treats VAT registration as effectively dispositive. The frozen source bank says VAT registration is not determinative, and that TINA must distinguish sole practitioners/individual professionals, qualifying GPPs, and taxable juridical professional entities. The payload cites VAT registration/invoicing authorities rather than EWT authorities. This is at least materially unsupported and, against the frozen PASS/FAIL standard, invalid as VERIFIED_CONTROLLING.

## Root Cause

R5 did not modify validator runtime. The same architecture that protected Q5 remains too narrow: it has cluster-specific deterministic gates plus LLM adjudication. It does not have proposition-specific source-sufficiency requirements for penalty/procedural questions or EWT/legal-form questions. Generic source-card acceptance can therefore launder unsupported legal propositions into VERIFIED_CONTROLLING.

## R6 Recommendations

1. Add a general deterministic source-sufficiency layer keyed by proposition class, not by a single question ID.
2. For penalty/procedural questions, require penalty/procedure authorities such as NIRC sections 114, 248, 249, 250, 255, 255A, 264, RA 11976, RR 6-2024, RMC 52-2023, or other topic-specific sources as applicable; fail closed when only generic substantive VAT sections are present.
3. For EWT/professional-fee questions, require EWT authorities and legal-form analysis; fail closed when VAT registration/invoicing authorities are the only support.
4. Preserve the two-lane runner design, but make both lanes pass from the protected working state without deleting `.claude/`, `.vscode/`, or `evaluation/factcheck/`.
5. Commit explicit authorization and immutable first-live request chronology artifacts for the next governed rerun.
6. Rerun the governed canonical mini-30 after remediation and require 0 invalid VERIFIED_CONTROLLING payloads.

## A13 Decision

A13 is NOT AUTHORIZED. Phase 10A remains reopened and blocked on R6 remediation/review. Phase 10B, Phase 10C, production changes, reindexing, and model changes remain blocked unless separately authorized.