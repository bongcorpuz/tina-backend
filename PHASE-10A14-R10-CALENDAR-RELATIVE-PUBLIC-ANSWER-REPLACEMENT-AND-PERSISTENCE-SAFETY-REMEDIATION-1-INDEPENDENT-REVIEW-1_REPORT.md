# PHASE-10A14-R10 Calendar-Relative Public-Answer Replacement And Persistence Safety Remediation 1 Independent Review 1

Reviewer: Codex GPT-5, independent evidence-first review
Repository: C:\Projects\tina-backend
Branch: feature/source-availability-engine-v1
Review date: 2026-07-19
Decision: REVISIONS REQUIRED

## Executive Decision

R10 does not qualify for PASS. P0 = 0. P1 = 2. P2 = 1.

The final R10 runtime evidence materially improves the public answer path for the four R9 blocker payloads. SG-C-LASTDAY, R9-LASTDAY-REPRO, R9-DUETODAY and SG-C-DUETODAY now use runtime commit 05faa60dadc1b52214c162c51fae2c317d46f9af, return RELATED_AUTHORITY_ONLY, expose deterministic replacement text only, and have identical API/history hashes. I found no rejected-model-output exposure in the final payloads.

However, the independent review packet makes PASS dependent on two additional things that are not satisfied:

- P1-R10-IR-001: the reported mid-run R10-DUETOMORROW defect is not preserved as objective raw/intermediate evidence in the committed R10 package. The repo proves COMMIT 2b exists and final payloads were all rerun after it, but I could not verify the original failed DUETOMORROW response text, its unsafe directive, or that it was preserved rather than summarized after the fact. The required chronology is therefore NOT ADJUDICABLE, and PASS explicitly requires VALID DISCOVER-FIX-RERUN CHRONOLOGY.
- P1-R10-IR-002: the detector still misses material unsafe answer-introduced filing directives, including "Please file your annual income tax return today" and "File now to avoid penalties" under a neutral deadline question. These miss evaluateCalendarRelativeDeadline, so the R10 public-answer replacement would not run for those forms. With a live model validator, that can recreate the R9 class of unsafe downgraded public answer.

P1-R9-IR-001 is closed for the observed final-runtime payloads, but R10 as a review target remains REVISIONS REQUIRED.

## Key Positive Evidence

- Local HEAD, origin branch, and network-fetched remote matched at 40271fc81458928c7a3911ffca2de4ef01185e97 before this review evidence commit; sync was 0 0.
- R10 is a six-commit linear sequence from a6e6a54cd6db4fea48f16cc30eb2f4c10bf8a370.
- Runtime scope was narrow: ask-handler.js, services/answer-support-validator.js, and one R10 focused test, plus evidence/report/state.
- Final 15 payloads all record runtime commit 05faa60dadc1b52214c162c51fae2c317d46f9af and model gpt-4o-mini.
- Final payloads reconcile: 15 payloads, 15 runlog lines, 15 unique probe IDs, 0 technical failures, 0 API/history mismatch, 0 trust mismatch, 0 unsafe public answers, 0 unsafe history answers, 0 rejected-output exposure flags.
- Focused suites passed independently: R10 22/0 and R9 15/0.
- Independent full regression cycles passed twice: syntax 10/0 and deterministic suites 200/0 both cycles.
- Restricted-network staging attempt was preserved separately with 7 run / 1 failed due staging reachability; two network-enabled staging cycles then passed 7/0 and 7/0.
- R10 evidence manifest validated locally: 33 entries, 33 hash matches, 0 missing, 0 mismatches.

## Findings

### P1-R10-IR-001 - Mid-Run Defect Preservation Not Proven

The packet reports an initial R10-DUETOMORROW live defect, followed by COMMIT 2b and a complete final rerun. I verified the final rerun separation:

- COMMIT 2b is 05faa60dadc1b52214c162c51fae2c317d46f9af.
- COMMIT 2b is a one-line runtime detector amendment in services/answer-support-validator.js.
- Final live payloads are added only after COMMIT 2b, in 5ae6f249aa8129bf81edfded3608532cdfa48c69.
- Every final payload records runtime commit 05faa60dadc1b52214c162c51fae2c317d46f9af.

But I could not find a preserved raw first-run R10-DUETOMORROW payload, an intermediate runlog, or another immutable record containing the original defective answer text and hash. The committed evidence has a narrative trace and final payload only. That is insufficient for the packet's requirement to independently prove the original defect was preserved, not overwritten or relabeled.

Classification: NOT ADJUDICABLE, which blocks PASS.

### P1-R10-IR-002 - Detector Completeness Gap For Filing Directives

The R10 detector catches many unsafe forms, including due today, due tomorrow, submit today, submit by end of day, today is April 15, already late, still on time, deadline passed, and Taglish equivalents. But independent direct probes showed material misses:

- "Please file your annual income tax return today." -> applicable false, sufficient true.
- "File now to avoid penalties." -> applicable false, sufficient true.
- Under a neutral question ("When is my annual income tax return due?"), fuller answers containing "Please file your annual income tax return today to avoid penalties" or "File now to avoid penalties" also did not route to calendar-relative-deadline.

Those missed forms are within the packet's required unsafe-form set. Because ask-handler replacement runs only when answerSupport.stage is calendar-relative-deadline, these forms would not receive R10 replacement. If the live model validator downgrades rather than structurally rejects, unsafe text could remain visible in public API, persistence and history under RELATED_AUTHORITY_ONLY.

Classification: P1 within R10 scope.

### P2-R10-IR-003 - DUETOMORROW Replacement Is Slightly Mis-Tailored

The final R10-DUETOMORROW replacement answer is safe, but it says TINA cannot confirm that "today is that deadline" even though the user asked whether the return is due tomorrow. This is not an unsafe present-day deadline assertion and not a PASS-blocking contradiction by itself, but it is a wording quality/responsiveness issue in the reusable replacement text.

Classification: P2.

## Final Decision

REVISIONS REQUIRED.

Do not execute E2, A15, Phase 10B/10C, production deployment, source ingestion, corpus/vector mutation, frontend work, or Dev Factory work from this review.
