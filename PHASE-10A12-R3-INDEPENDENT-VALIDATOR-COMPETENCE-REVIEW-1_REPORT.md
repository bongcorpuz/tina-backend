# PHASE-10A12-R3-INDEPENDENT-VALIDATOR-COMPETENCE-REVIEW-1

Reviewer: Codex GPT-5, high reasoning, low speed  
Date: 2026-07-16  
Repository: C:\Projects\tina-backend  
Branch: feature/source-availability-engine-v1  
Reviewed remediation: PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-3  
Runtime commit reviewed: 6ce2d6fd613e7f3109022f5a0f5ea006e9122546  
Evidence/final commit reviewed: 09087cb8e3fc8c63741e584aec183f2dc6055c84

## Decision

REVISIONS REQUIRED.

A13 is NOT AUTHORIZED. Phase 10A remains reopened. Phase 10B and Phase 10C remain blocked. The adversarial suite remains deferred.

This review did not execute PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-3 and did not modify remediation runtime code. The review modified only review artifacts and knowledge state.

## Severity Summary

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | No security, persistence, or architecture-wide emergency defect found. |
| P1 | 2 | Mini-set canonical membership not proven; claimed repository regression runner pass not reproduced live. |
| P2 | 5 | M-Q33 retry provenance gap; source excerpts not threaded to validator; guard architecture remains cluster-specific; Q5 period applicability is diagnostic rather than independently fail-closed; GOOGLE_SERVICE_ACCOUNT_JSON placeholder/runtime-equivalence provenance is not explicitly evidenced in R3 artifacts. |
| P3 | 1 | Environmental noise: unrelated dirty/untracked worktrees and a localhost 5173 listener were observed; no backend process started by this review. |

## Positive Findings

The R3 runtime change is narrowly scoped to validator behavior and tests. Commit 6ce2d6f modifies services/answer-support-validator.js and validator test files; evidence commit 09087cb adds the R3 report, result JSON, payload evidence, manifests, and CURRENT_STATE update.

The Q5-p1 remediation is materially supported. The prior A12-R2 invalid VERIFIED_CONTROLLING case is reproduced in committed evidence, and the R3 replay fails closed at incentive-source-sufficiency. The new evaluateImportVatIncentiveSourceSufficiency path keys specific CREATE MORE / RA 12066 / PEZA / incentive authority to displayed source cards, not prose-only citation laundering. Q5 committed payloads show 18 total Q5 runs, 0 invalid verified, and 2 valid general-rule verified cases.

Committed payload count reconciliation independently matched R3 claims: 66 payloads = 12 VERIFIED_CONTROLLING + 47 RELATED_AUTHORITY_ONLY + 7 NO_VERIFIED_AUTHORITY. Payload groups matched the expected inventory: mini 30, q5exact 5, q5para 10, q5r2exact 3, q8aggregate 2, q8exact 2, q8incomplete 2, q8para 4, restriction 3, vcontrol 5. All 66 payloads record runtime commit 6ce2d6fd613e7f3109022f5a0f5ea006e9122546. No duplicate payload IDs or payload hashes were found. The 82-line SHA-256 manifest verified cleanly.

Focused regression suites rerun by this review passed: A12-R3 20/20, A12-R2 10/10, A12-R1 19/19, A10-R1 22/22, A10-R2 27/27, A10 verified 18/18, A8 24/24.

Security scan evidence was inspected. No credentials, API keys, JWTs, cookies, Authorization headers, private URLs, or raw conversation IDs were found in the R3 result/report/evidence paths reviewed.

## Blocking Findings

### P1-1: Mini fact-check canonical membership is not proven

The R3 evidence proves 30 committed mini payloads exist at the R3 runtime. It does not prove that the exact 30-question membership was a pre-existing canonical mini-set before R3.

Live evidence:

- The R3 report states the previously missing 10 were comparable-difficulty master questions and that "the intended 30-set had never been enumerated beyond 20".
- knowledge/CURRENT_STATE.md repeats that the intended 30-set had never been enumerated beyond 20.
- Prior A12-R2 evidence contains only 20 mini question IDs.
- Searches of prior artifacts/history did not find a pre-R3 canonical list containing the exact 30 IDs now used by R3.
- The added 10 are real master fact-check questions, but that proves full-corpus provenance, not pre-existing canonical mini-set membership.

The user assignment explicitly required: if the original canonical 30 membership cannot be proven, classify this as a remaining P1 and do not pass A12-R3. Under that controlling rule, this review must mark A12-R3 as revisions required.

Determination: 30/30 payload completion is proven; exact pre-existing canonical membership of these 30 is not proven.

### P1-2: Claimed repo regression runner pass was not reproduced live

R3 report and CURRENT_STATE claim `node scripts/run-regressions.mjs` exited 0. This review reran the repository regression runner live, and it exited 1.

Live rerun summary:

- Syntax checks: 10 run, 0 failed.
- Test suites: 195 run, 2 failed.
- Failed suite 1: tests\phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs. Failure: fixture staging validation summary expected staging reachability consistent with decision; run logged staging temporarily unreachable.
- Failed suite 2: tests\phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs. Failures: allowed-file scope check reported .claude/settings.local.json; diff-scope check expected pipeline.js in reported scope.

The failures appear environmental or older-suite scope related rather than direct A12-R3 runtime regressions, and the focused A12/A10/A8 suites passed. However, LIVE EVIDENCE > CLAIMS: the review cannot confirm the executor claim that the repository regression runner passes at current state. CURRENT_STATE must not continue to present that claim as currently verified by this independent review.

Determination: repository-wide regression pass is not live-confirmed; A12-R3 cannot be authorized forward on the claimed all-regressions-green basis.

## P2 Findings

### P2-1: M-Q33 retry provenance is incomplete

Final M-Q33 payload is clean, but provenance around the retry path is incomplete. set-mini10-runlog.json records M-Q33 attempt 1 with persist=0 and a different hash from the final payload. set-mq-retry-runlog.json later records a clean M-Q33. transient-retry-and-missing-inventory.md discusses M-Q36 but does not explicitly document M-Q33 as an initial non-persisted retry case.

### P2-2: sourceExcerptGrounded is false

The R3 result honestly records `sourceExcerptGrounded:false` and `guardArchitecture:CLUSTER_SPECIFIC_WITH_FAIL_CLOSED_SCHEMA`. This is not a new contradiction, but it means the validator still does not consume full operative source excerpts. The limitation remains a carryover risk.

### P2-3: Guard architecture remains cluster-specific

The Q5 and Q8 remediations are deterministic and useful for known clusters, but they remain cluster-specific. A future full rerun can still surface an unseen validator-competence false approval pattern.

### P2-4: Q5 period applicability is diagnosed but not independently hard-fail enforced

The Q5 incentive sufficiency path records period applicability diagnostics, but the hard failure conditions focus on missing specific source authority, generic-only authority for incentive questions, and definitive grant without qualifying conditions. A time/period mismatch unsupported by source cards is not independently fail-closed unless it also falls into one of those hard failure branches.

### P2-5: Placeholder/runtime-equivalence provenance is not explicitly evidenced

No R3-specific repository change or artifact was found proving that GOOGLE_SERVICE_ACCOUNT_JSON placeholder handling could not silently alter retrieval behavior during the evidence run. The committed payloads contain source states and source cards, and no direct evidence showed retrieval disabled. Still, the placeholder override/runtime-equivalence point is not independently proven by R3 artifacts.

## Required Reconciliation

The R3 remediation should not proceed to A13 until both P1 items are resolved:

1. Produce or reconstruct verifiable pre-R3 canonical provenance for the exact 30-question mini-set, or reframe the mini-set evidence as a newly documented 30-question sample and obtain governance acceptance for that substitution.
2. Re-run and commit current repository regression evidence, or correct state/reporting so only focused suite pass claims are made and the repo-wide runner failure is explicitly reconciled.

## A13 Authorization Recommendation

A13 is NOT AUTHORIZED from this review.

Minimum gates to authorize A13 later: P0=0, P1=0, exact mini-set provenance resolved or governance-approved, live regression claims reconciled, payload/hash/count evidence still clean, and CURRENT_STATE updated with accurate state.
