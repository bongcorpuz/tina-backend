# PHASE-10A14-R9 Calendar-Relative Deadline, Filing-Rationale Alignment And Canonical Inventory Closure Remediation 1 Independent Review 1

Reviewer: Codex GPT-5, independent evidence-first review
Repository: C:\Projects\tina-backend
Branch: feature/source-availability-engine-v1
Review date: 2026-07-19
Decision: REVISIONS REQUIRED

## Executive Decision

R9 does not qualify for PASS. P0 = 0. P1 = 2. P2 = 1. The runtime gates do downgrade the E1 verified P1 payloads, the 103-payload package reconciles, and all runner gates passed. However, two PASS-blocking conditions remain:

- P1-R9-IR-001: the calendar-relative safety response is contradictory and incomplete. R9 downgrades SG-C-LASTDAY and R9-LASTDAY-REPRO to RELATED_AUTHORITY_ONLY, but the public answer still visibly contains the false sentence saying today is the last day to file. R9-DUETODAY and SG-C-DUETODAY remain publicly unsafe without the R9 filing-deadline note, while asserting or implying a due-today/April-15 condition on 2026-07-19. The review packet explicitly states that merely prepending a note while leaving the false sentence materially visible is P1.
- P1-R9-IR-002: the strict 319-probe inventory does not satisfy the literal original-ID requirement. The JSON has 319 unique rows, but A12/A13 are absent from the structured inventory and are only described at identifier/test level in prose. The inventory also leaves propositionClass null for 204 rows, expectedTrustBehavior null for all 319 rows, and 178 rows without either finalR9ExecutionId or existingE1Payload. The review packet requires individual A12/A13 enumeration and null material fields justified or replaced.

P1-E1-002 is materially closed for the observed Q12 live variants: ALL26-Q12-r1/r2/r3 and SG-A-Q12REV are now RELATED_AUTHORITY_ONLY, not VERIFIED_CONTROLLING. The filing-rationale gate has bounded regex limitations, but my probe variants were still blocked by the broader answer-support path; I classify that as P2 unless a future live bypass demonstrates verification.

## Repository And Five-Commit Chronology

Network fetch verified actual remote state. Before this review evidence commit:

- R9 base: ee46cb511e51c687761f83e01deb003839768422
- Final R9 execution HEAD: c9dbba52e592de5c8e20b36933e08d93dd6cffa1
- Confirmed R9 runtime commit: 0c80b121451678e8a1565d59bbfe06f36900328c
- Local HEAD = origin/feature/source-availability-engine-v1 = c9dbba52e592de5c8e20b36933e08d93dd6cffa1
- Sync: 0 0

| Commit | Parent | Time +0800 | Message | Scope |
|---|---|---:|---|---|
| 0d5213ccacbc63f0888f6cc15694b4fff99e4678 | ee46cb511e51c687761f83e01deb003839768422 | 2026-07-19 13:37:51 | PHASE-10A14-R9 COMMIT 1: manifest, P1 reproduction, complete A12-R8 inventory | evidence/inventory/manifest |
| 0c80b121451678e8a1565d59bbfe06f36900328c | 0d5213ccacbc63f0888f6cc15694b4fff99e4678 | 2026-07-19 13:38:07 | PHASE-10A14-R9 COMMIT 2: calendar-relative + filing-rationale runtime remediation | ask-handler.js, services/answer-support-validator.js, R9 focused test |
| eba1e60a8d2671c3ff66454641f2b466c7e285bd | 0c80b121451678e8a1565d59bbfe06f36900328c | 2026-07-19 14:11:51 | PHASE-10A14-R9 COMMIT 3: differential live evidence (103 payloads, R9 runtime) | raw R9 payloads/runlog |
| 392d7a1ad7217f9775f80633166d72e6d8e2fd33 | eba1e60a8d2671c3ff66454641f2b466c7e285bd | 2026-07-19 14:18:38 | PHASE-10A14-R9 COMMIT 4: adjudication, reconciliation, report, result, CURRENT_STATE | report/reconciliation/state |
| c9dbba52e592de5c8e20b36933e08d93dd6cffa1 | 392d7a1ad7217f9775f80633166d72e6d8e2fd33 | 2026-07-19 14:25:25 | PHASE-10A14-R9 COMMIT 5: clean-tree gates + evidence manifest | runner logs/manifest |

The runtime commit preceded the 103 live payloads, and every R9 payload records runtimeCommit 0c80b121451678e8a1565d59bbfe06f36900328c. R9 changed only the two intended runtime files plus the focused R9 test; no prompt/model/retrieval/reranker/source-card/corpus/vector/schema/frontend/Dev Factory/production file change was observed.

## Runtime And Staging Deployment Lock

The 103 payloads all record runtimeCommit 0c80b121451678e8a1565d59bbfe06f36900328c, stagingDeploymentId tina-backend-staging, and model gpt-4o-mini. R9_RECONCILIATION.json also records the same runtime commit and model. The staging auto-deployment is classified as AUTHORIZED NON-PRODUCTION EVALUATION DEPLOYMENT: it was branch-triggered, disclosed, isolated to staging, and necessary for the authorized differential live review. I found no production deployment evidence.

Corpus and vector state are accepted as unchanged from the R9 evidence: tina_vector_store, 5,346 vector rows, no source ingestion, no reindex, no vector mutation.

## P1-E1-001 Closure And Safety-Note Review

Pre-R9 E1 defect was reproduced: SG-C-LASTDAY had been VERIFIED_CONTROLLING while asserting a false today-relative April 15 deadline on 2026-07-19.

The deterministic calendar-relative gate exists and blocks direct examples at evaluateAnswerSupport stage calendar-relative-deadline. It also runs before the model validator, so the deterministic stage is non-overridable in that path.

Closure is not complete because the public answer is still unsafe:

| Payload | Trust | Note | Independent result |
|---|---|---|---|
| SG-C-LASTDAY | RELATED_AUTHORITY_ONLY | Present | Contradictory: after the note, Short Answer still says yes, today is the last day, and Practical Meaning says file by end of today. |
| R9-LASTDAY-REPRO | RELATED_AUTHORITY_ONLY | Present | Contradictory: after the note, Short Answer still says yes, today is the last day, and Practical Meaning says file by today. |
| R9-DUETODAY | RELATED_AUTHORITY_ONLY | Absent | Unsafe: answer says the annual ITR is due today, April 15, and says today is April 15. |
| SG-C-DUETODAY | RELATED_AUTHORITY_ONLY | Absent | Unsafe/contradictory risk: answer says due today if today is April 15 and tells the user to submit today if not filed. |

The code explains why: ask-handler.js prepends the note and leaves result.answer intact. The packet required the false assertion to be removed or neutralized, not merely preceded by a correction. P1-R9-IR-001 confirmed.

## P1-E1-002 Closure And Bypass Review

The observed E1 Q12 class is materially closed in R9 live evidence:

- ALL26-Q12-r1: RELATED_AUTHORITY_ONLY
- ALL26-Q12-r2: RELATED_AUTHORITY_ONLY
- ALL26-Q12-r3: RELATED_AUTHORITY_ONLY
- SG-A-Q12REV: RELATED_AUTHORITY_ONLY

These payloads no longer reach VERIFIED_CONTROLLING, so Section 24 threshold/rate reasoning no longer verifies for the observed Q12 live variants.

I also tested deterministic variants for Section 24 only, Section 24 plus Section 51 card, Section 51-A fact-complete substituted filing, no-tax-due/no-return-required, multiple-employer, mixed-income, one-employer/correct-withholding, and boundary/formatting examples. The standalone filing-rationale regex can miss formulations such as therefore no return is necessary, threshold rationale after the 700-character decisive window, or a filing-rule mention early in the answer that is not actually the decisive rationale. In the quick full evaluateAnswerSupport probes I ran, those variants still failed through the broader proposition-source-sufficiency or structural path, so I do not add a P1 bypass beyond the live evidence. This remains a bounded P2 diagnostic limitation.

## Filing Positive Reachability And Fresh All-26

Required positives remain reachable with VERIFIED_CONTROLLING examples:

- individual filing obligation: SG-B-COMPONLY, SG-B-MIXED, SG-B-MULTIEMP, SG-B-SELFEMP, R9-INDFILE-51
- multiple-employer filing: R9-MULTIEMP
- substituted filing: POS-SUBST-1/2/4/5 and R9-SUBST-COMPLETE
- filing deadline: POS-INDDEAD-1/2, ALL26-Q34-r1/r2/r3, SG-A-Q34REV

Fresh all-26 review:

- Q12-r1/r2/r3: VERIFIED_CONTROLLING = 0 for unsupported filing conclusion.
- Q30-r1/r2/r3: VERIFIED_CONTROLLING = 0 for unsupported estate computation.
- Q34-r1/r2/r3: VERIFIED_CONTROLLING and supported by Section 51(C) deadline authority.
- Other 17 slots: no independent invalid/questionable/over-verified finding confirmed.

## Strict 319-Probe Inventory Audit

The inventory has 319 rows and 319 unique originalProbeId values. Counts by structured originatingTask are A14=50, A14-slot=26, A14-R1=26, A14-R2=42, A14-R3=60, E1=115.

It fails the strict PASS standard:

- A12 rows in CANONICAL_A12_R8_INVENTORY.json: 0.
- A13 rows in CANONICAL_A12_R8_INVENTORY.json: 0.
- propositionClass null: 204 rows.
- expectedTrustBehavior null: 319 rows.
- existingE1Payload null: 204 rows.
- finalR9ExecutionId null: 293 rows.
- rows with neither finalR9ExecutionId nor existingE1Payload: 178.

WS10_A12_A13_R4R8_TESTMAP.md says A12/A13/R4-R8 probes are enumerated at identifier/test level because those tasks encode probes in deterministic test suites and result JSONs. The review packet requires A12/A13 test-encoded probes enumerated individually and every original probe ID mapped. Identifier-level prose is an improvement over E1 but not a strict literal inventory closure. P1-R9-IR-002 confirmed.

## Impact, Payload, Persistence, Counts, And Hashes

The differential classification reconciles at the top level: 94 affected reruns, 21 carried-forward E1 probes, and 9 new probes equals 124 total considered probes; 94 + 9 = 103 executed R9 payloads. R9 payloads = runlog = manifest = 103, with 0 technical failures and 0 retries found in the package.

All 103 payloads record runtimeCommit 0c80b121451678e8a1565d59bbfe06f36900328c. Trust counts: 35 VERIFIED_CONTROLLING, 58 RELATED_AUTHORITY_ONLY, 10 NO_VERIFIED_AUTHORITY.

All 35 VERIFIED_CONTROLLING answers were inspected at payload/head/source-card level and through WS13. I confirmed no additional P1 over-verified answer among the verified set. The PASS blocker is not that unsafe calendar answers verified; it is that unsafe calendar answers remain visible in public RELATED_AUTHORITY_ONLY responses where the task required correction/removal.

Persistence: 4/4 reported cases are trust/source consistent. However, the persistence artifact only records trust/source consistency and does not quote the persisted answers, so it does not independently cure the visible safety-response contradiction.

## Deterministic All-26 And Runner Verification

Deterministic all-26 remains accepted from R9 evidence: 9 blocked / 17 preserved / 0 mismatch. The expected blocked set is Q12-r1/r2/r3, Q30-r1/r2/r3, and Q34-r1/r2/r3. Q3/Q47 overfire and Q32 reachability remain clean.

Focused/prior suites are included in the full deterministic runner. Fresh independent execution:

- node scripts/run-regressions.mjs cycle 1: syntax 10/0, deterministic 199/0, exit 0.
- node scripts/run-regressions.mjs cycle 2: syntax 10/0, deterministic 199/0, exit 0.
- initial restricted staging run: preserved one reachability failure in phase-09r tax memo staging smoke.
- network-enabled node scripts/run-staging-smokes.mjs cycle 1: staging 7/0, exit 0.
- network-enabled node scripts/run-staging-smokes.mjs cycle 2: staging 7/0, exit 0.

## Security And Cleanup

No secret exposure, real taxpayer/client data, raw credential exposure, production deployment, production-data access, model/prompt change, retrieval/reranker change, corpus/vector mutation, reindex, re-embedding, direct DB write, schema migration, frontend/Dev Factory change, protected-path modification, or port 5173 touch was found. No local backend listener was started or left running by this independent review.

## Final Decision

REVISIONS REQUIRED

PASS fails because P1 > 0, P1-E1-001 is not fully closed at the public-answer level, contradictory safety response is not zero, and the strict literal canonical inventory requirements remain unproven.
