# PHASE-10A13-FULL-FACTCHECK-RERUN-3-INDEPENDENT-REVIEW-1

Decision: REVISIONS REQUIRED.

Reviewer: Codex GPT-5. I did not execute PHASE-10A13-FULL-FACTCHECK-RERUN-3. Scope was independent review only: repository inspection, evidence verification, legal adjudication, runner reproduction, review artifacts, CURRENT_STATE update, selective evidence commit, push, and process cleanup evidence. No remediation was performed.

## Bottom Line

A13 was executed under the governed manifest and frozen runtime, completed exactly 150 canonical evaluations, preserved hash-reconcilable evidence, and kept prior Q5/Q8/Q25/Q36 safeguards intact. The run is not passable because 4 VERIFIED_CONTROLLING results are not clean:

- Q38 is INVALID VERIFIED_CONTROLLING in 3/3 rounds.
- Q46-r1 is QUESTIONABLE VERIFIED_CONTROLLING.

Severity: P0=0, P1=2, P2=6, P3=1. Phase 10A remains open. Phase 10B and Phase 10C remain blocked. A13 closure, adversarial suite, production, reindexing, model change, and remediation are not authorized by this review.

## Repository And Chronology

Reviewed repository: `C:\Projects\tina-backend`

- Branch: `feature/source-availability-engine-v1`
- Review start HEAD: `938cb53f8539e014a4e29d126d9f9f67b0ce4734`
- Upstream sync: `0 0`
- Protected untracked paths preserved: `.claude/`, `.vscode/`, `evaluation/factcheck/`
- Ancestry confirmed: `9559bf3 -> d71b913 -> cb4c197 -> 938cb53`

Commit scopes:

- `d71b913`: pre-execution manifest, manifest hash, question hashes, pre-run runner logs.
- `cb4c197`: 150 payloads, runlog/retry log, reconciliation and adjudication worksheets.
- `938cb53`: result JSON, report, post-run runner logs, evidence manifest, security review, CURRENT_STATE.

No A13 evidence commit modified runtime code, validator code, test code, source bank, model configuration, corpus, retrieval, frontend, or Dev Factory files.

Chronology:

- Manifest commit: `2026-07-17T09:16:14+08:00`
- First canonical request: `2026-07-17T09:18:35.288+08:00`
- Evidence commit: `2026-07-17T10:01:27+08:00`
- Result/report commit: `2026-07-17T10:07:34+08:00`

Local git metadata proves manifest commit before first live request. It does not independently expose the exact remote push timestamp, though the current remote branch contains the manifest ancestor.

## Source Bank, Manifest, And 150-Run Reconciliation

Independent hashes reproduced:

- Source-bank snapshot SHA-256: `526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed`
- Manifest SHA-256: `7ef642344406546bc92fa820e41869c15fbd7ef1df7a619487eb65dfd6a86d79`

Direct parse of payloads and runlog reproduced:

- Payloads: 150
- Runlog entries: 150
- Unique questions: 50
- Rounds per question: 3
- Missing slots: 0
- Duplicate slots: 0
- Prompt mismatches: 0
- Runtime mismatches: 0
- Persistence failures: 0
- `persistence.count = 2` bad slots: 0
- Payload/runlog hash mismatches: 0

Authority-support counts:

| classification | count |
|---|---:|
| VERIFIED_CONTROLLING | 30 |
| RELATED_AUTHORITY_ONLY | 72 |
| NO_VERIFIED_AUTHORITY | 48 |
| Total | 150 |

Retry log: 3 preserved Q10 technical attempts, all degenerate 16-character responses, excluded from the 150 canonical total. I found no evidence that an unfavorable canonical legal answer was replaced.

Evidence manifest: 165 entries, 0 hash mismatches, 0 uncovered files under the A13 evidence directory.

## Verified Adjudication

I reviewed all 30 VERIFIED_CONTROLLING payloads directly. Result:

- VALID VERIFIED: 26
- QUESTIONABLE VERIFIED: 1
- INVALID VERIFIED: 3

Invalid/questionable IDs:

- `Q38-r1`, `Q38-r2`, `Q38-r3`: INVALID VERIFIED
- `Q46-r1`: QUESTIONABLE VERIFIED

The complete table is in `evaluation/results/phase-10a13-full-factcheck-rerun-3-independent-review-1/all-30-verified-adjudication.md`.

## Q38 Finding

Q38 asks whether a new business must register with the BIR and what form is used. All three verified answers cite withholding/foundational authorities (`RR 11-2018`, `RR 2-1998`, `NIRC Sec. 2`, `NIRC Sec. 3`) and state Form 1902 as part of the answer. Form 1902 is for compensation employees, not business registration. The answer omits Form 1903 for juridical entities and does not cite the controlling registration authority required by the frozen source bank.

Independent classification: INVALID VERIFIED_CONTROLLING, 3/3. Severity P1.

Systemic class: registration/procedural source sufficiency, taxpayer/entity classification, form selection, foundational-authority laundering, withholding-authority laundering.

## Q46 Finding

Q46 asks whether a sale of gold by a small-scale miner to the BSP is subject to VAT. Q46-r1 gives the broad answer "not subject to VAT" but verifies it on only general VAT-imposition authorities (`NIRC Secs. 105-108`, `RR 16-2005`) and hedged BSP/government-role reasoning. The correct legal analysis requires the specific VAT-exemption authority and qualification context. RA 10963 placed sale of gold to the BSP in NIRC Sec. 109's VAT-exempt transactions; RA 11256 and BSP guidance add registered small-scale miner/accredited trader and certification context for related tax exemptions.

Independent classification: QUESTIONABLE VERIFIED_CONTROLLING for Q46-r1. Rounds 2 and 3 were safely not verified. Severity P1 because unresolved questionable VERIFIED_CONTROLLING prevents PASS.

Systemic class: exemption-vs-zero-rating confusion, transaction-specific VAT treatment, general VAT-authority laundering, missing qualification, missing controlling exception authority.

## Additional Defect Search

No additional invalid or blocker-level questionable verified result was found among the other 26 verified runs.

Non-blocking observations:

- Q3 and Q34 are correct baseline answers but cite general same-tax-type authorities rather than the most specific provisions.
- Q30 correctly states the 6 percent estate-tax rate but retains prior accepted base/threshold imprecision.
- Q1, Q3, Q6, Q13, and Q15 show trust-state variation without material legal inconsistency in the verified answers.

Risk-based non-verified sample:

- Q5 remained non-verified by incentive-source-sufficiency.
- Q8 remained non-verified, including one treatment-contradiction stage.
- Q25 and Q36 remained non-verified by proposition-source-sufficiency.
- Q46 rounds 2 and 3 were not verified.

## Prior Remediation Preservation

Confirmed:

- Q5 verified count: 0/3
- Q8 verified count: 0/3
- Q25 verified count: 0/3
- Q36 verified count: 0/3
- Fabricated authority count: 0
- False refusal count: 0
- Unrestricted outcome prediction count: 0

I found no weakening of the prior Q5/Q8/Q25/Q36 safeguards during A13.

## Runner Verification

Committed A13 runner logs:

- Pre-run deterministic: 189 suites, 0 failures, exit 0.
- Pre-run staging: 7 suites, 0 failures, exit 0.
- Post-run deterministic: 189 suites, 0 failures, exit 0.
- Post-run staging: 7 suites, 0 failures, exit 0.

Independent reruns:

- `node scripts/run-regressions.mjs`: exit 0, syntax checks 10/0, suites 189/0.
- `node scripts/run-staging-smokes.mjs` in sandbox: exit 1 due staging unreachable/reachability consistency.
- `node scripts/run-staging-smokes.mjs` with network enabled: exit 0, suites 7/0.

Combined suite accounting: 196.

## Security And Scope

No credential-shaped secrets were found in the reviewed A13 evidence/report set. Broad matches were governance prose and test names. No raw Authorization header, JWT, cookie, service account, private key, or taxpayer/client data was found in the A13 artifacts.

No production deployment, reindexing, model change, frontend change, Dev Factory change, source-bank change, runtime change, validator change, or test-code change was performed by A13 or by this review.

Existing Node processes and localhost `5173` listeners were present before and after review; no backend port listener was observed in the checked port set. I did not terminate unrelated processes.

## Remediation Recommendation

Authorize a separate source-sufficiency remediation. It should target proposition classes, not Q38/Q46 strings or IDs:

1. Registration/procedural propositions: require registration/form/procedure authority and taxpayer/entity classification; reject foundational and withholding authorities for business-registration answers.
2. Exemption-vs-zero-rating and transaction-specific exceptions: require the specific exemption/zero-rating/exception authority and applicable taxpayer/transaction qualifications; reject general VAT-imposition authority when the answer depends on an exception.
3. Evidence architecture: move toward passage-level proposition support instead of displayed source-card labels alone.

## Final Status

PHASE 10A13 INDEPENDENT REVIEW 1 = REVISIONS REQUIRED.

Phase 10A status: `REOPENED_PENDING_SOURCE_SUFFICIENCY_REMEDIATION`.

Recommended next authorization: source-sufficiency remediation for registration/procedural and exemption-vs-zero-rating proposition classes, then a separately authorized rerun/review cycle. Do not close Phase 10A, begin the adversarial suite, begin Phase 10B/10C, deploy, reindex, or change the model from this review.
