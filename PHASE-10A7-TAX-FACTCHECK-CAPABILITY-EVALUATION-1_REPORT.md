# PHASE-10A7 Tax Fact-Check Capability Evaluation 1 Report

Decision: **PHASE 10A7 FACTCHECK EVALUATION REMEDIATION REQUIRED**

Executor: Claude Code — Opus 4.8 — Low Speed. Timestamp (UTC): **2026-07-15**.
Backend HEAD `9ac5ba4` (feature/source-availability-engine-v1, sync 0 0). Frontend `0816ac8` (untouched, `.gitignore` mod preserved). Dev Factory `9167002` (untouched). No runtime, frontend, fixture, or source-template file was modified.

## 1. Executive Conclusion

TINA was evaluated live against the controlling v3.0 fact-check master (50 canonical Philippine tax questions, 3 fresh runs each = **150 live runs**). It is **not release-ready**. Repeatability is excellent (trust state and legal conclusion were identical across all three runs for every one of the 50 cases; 0 timeouts, 0 technical failures, 0 unsafe inconsistency, no fabricated authorities), but there is a **systemic trust-state calibration failure**: `VERIFIED_CONTROLLING` ("Verified Controlling Authority") is assigned from retrieval/source-presence rather than answer correctness, so **materially wrong and even empty answers carry a verified-controlling banner**. Nine reproducible false-high-confidence answers (several directly harmful — wrong VAT treatment, wrong withholding rate, invented exemption, obsolete threshold) confirm and broaden the PHASE-10A6 Q9 concern. Only **10 of 50** questions earned a clean PASS; 9 FAIL/UNSAFE, 18 PARTIAL, 13 not answered.

## 2. Framework Reviewed & Integrity

Controlling artifact: `evaluation/factcheck/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md` (v3.0; 50 validated Q&A each with category, canonical question, validated answer, controlling authorities, explicit PASS-requires and FAIL/unsafe indicators, recency flag; plus a core official-source register and release-governance rules). It supersedes the legally defective v2 set.

Framework-integrity findings:
- **Complete and internally consistent** for execution: all 50 cases parsed with a canonical question and PASS criteria (none missing).
- **The separate v2 template files named in the task prompt** (Test_Plan/Test_Cases/Scoring_Rubric/Report/Run_Log v2) **are not present as standalone files.** The v2 answer key and adversarial set exist under `tests/`. The v3.0 master is the consolidated controlling document and was used. Recorded as an observation, not a defect.
- **No fixed numeric pass threshold** is defined; scoring is categorical (PASS/PARTIAL/FAIL/NOT-ANSWERED + UNSAFE) and requires human review of every non-PASS. Derived numeric scores below are an evaluator supplement, clearly labeled, and do not alter the categorical gate.
- Hallucination vs. weak-sourcing is distinguishable from the FAIL/unsafe indicators; repeatability is required by governance rule 4–5 and was tested (3 runs/case).

The source templates were **not modified** and are **not staged** (their repository ownership is unconfirmed; they remain untracked).

## 3. Test Environment

Local authenticated server (`node server.js` at HEAD `9ac5ba4`) against the **real staging Supabase vector store + real OpenAI (gpt-4o-mini)**; JWT minted in memory from `JWT_SECRET` for an active `app_users` record; controlled-LOA ask gate enabled to match staging; Google Drive stubbed (ingestion-only, not used at query-time retrieval). Every canonical question queried **verbatim**, 3 fresh conversations per question, hard-refresh + history-reopen checked each run. Authenticated: yes. Fresh conversation per run: yes. Deterministic fixtures were **not** used.

## 4. Commits & Deployments

Backend `9ac5ba4` (PHASE-10A6-R4 evidence commit; the runtime under test includes the R1–R3 disclosure/overclaim fixes). Frontend `0816ac8`. No deployment or runtime change performed by this task.

## 5. Test Inventory & Run Counts

50 cases defined, 50 executed, 3 runs each, **150/150 completed**, 0 timeouts, 0 technical failures. Full per-case table: `evaluation/results/phase-10a7-tax-factcheck-capability-evaluation-1/TINA_Tax_FactCheck_Run_Log_v2_COMPLETED.md`.

## 6. Overall Scoring (evaluator supplement — categorical gate is authoritative)

| Metric | Value |
| --- | --- |
| Correctness: PASS / PARTIAL / FAIL / NOT-ANSWERED | 10 / 18 / 9 / 13 |
| Substantive PASS rate | 20% (51% among the 37 answered) |
| UNSAFE answers | 9 |
| Citation existence validity | ~0.98 (no fabricated authorities) |
| Citation proposition-support validity | ~0.50 |
| Cross-run consistency | 1.00 (50/50 cases identical across 3 runs) |
| Trust-state calibration | ~0.62 |
| Overall weighted (acc .40 / calib .30 / cite .15 / consistency .15) | ~0.58 |

## 7. Hallucination Findings

- **H1 fabricated authority: 0** — every cited authority (NIRC sections, RR 2-98, RR 16-2005, RR 9-1998, Sec 99, Sec 264, etc.) is real.
- **H2 incorrect citation detail: 2** — Q2 attributes an obsolete ₱1.5M residential-lot VAT threshold to the NIRC.
- **H3 unsupported proposition: 6** — Q8, Q9, Q27, Q29, Q49 (authority cited but does not support the wrong stated rule/rate/treatment).
- **H4 misquotation: 0.**
- **H5 authority-status hallucination: 9** — retrieved authority presented as *controlling the exact proposition* when it is wrong or absent (the false VERIFIED_CONTROLLING cases).
- **H7 false completeness: 3** — empty/near-empty answers (Q37, Q41, Q31) presented as complete, verified answers.

## 8. Citation-Validity Findings

No nonexistent issuances were cited. The defect is **misapplication**, not fabrication: real authorities are attached to wrong or empty conclusions, and the trust banner blesses them. Many strong answers (Q14, Q28, Q32, Q33, Q34, Q46, Q47) are correctly grounded.

## 9. Legal-Proposition Support

FULLY SUPPORTED: the 10 PASS cases. PARTIALLY SUPPORTED: 18. UNSUPPORTED/CONTRADICTED: 9 FAIL (Q2 contradicts current law; Q8/Q9/Q27/Q29/Q49 unsupported; Q37/Q41/Q31 not assessable/empty). NOT ASSESSABLE: 13 not answered.

## 10. Consistency Findings

**Strength.** Trust state and legal conclusion were identical across all 3 runs for **all 50 cases**; no unsafe inconsistency. (Note: the wrong answers are *consistently* wrong — reproducible, not random.)

## 11. Trust-State Calibration Findings (headline)

Systemic **false high-confidence**: 9 reproducible `VERIFIED_CONTROLLING` classifications over wrong or empty answers (Q2, Q8, Q9, Q27, Q29, Q31, Q37, Q41, Q49). An additional ~10 verified answers are materially incomplete PARTIALs. The prior safe under-claim behavior is intact where retrieval fails (11 could-not-identify cases correctly avoid a verified state), but when retrieval succeeds the verified state is granted without correctness/completeness verification. This is the same defect class the PHASE-10A6 line addressed for the narrow bare-source-listing path — here it is shown to be **general**.

## 12. Omission Findings

MATERIAL/CRITICAL omissions: ~22 (the 13 not-answered plus verified answers omitting rate conditions, thresholds, or exemptions). Q23 and Q43 omit the entire answer via a false domain-boundary refusal.

## 13. Source-Hierarchy Findings

Where answers cite statute + regulation they generally order them correctly; no case inverted statute below a circular. The hierarchy problem is indirect: a wrong proposition is labeled controlling.

## 14. Persistence Findings

No trust-state mutation across hard-refresh or history-reopen on any run. Q23/Q43 domain-boundary refusals returned fewer than two persisted messages on reopen — recorded as **P3** (tied to the false-boundary defect, not a trust mutation). Persistence trust-mutation failures: **0**.

## 15. Security Findings

Evidence secret-scan clean: no JWTs, cookies, Authorization headers, tokens, private keys, Supabase host, conversation UUIDs, or taxpayer/client data. Payloads sanitized (UUID/host/JWT redaction), conversation references SHA-256-derived. **0 security failures.**

## 16. Practitioner-Safety Findings

- **UNSAFE (9):** Q2, Q8, Q9, Q27, Q29, Q31, Q37, Q41, Q49 — a practitioner relying on the verified banner could adopt a wrong VAT/withholding/filing position.
- **SAFE FOR PRACTITIONER REVIEW:** the 10 PASS cases.
- **SAFE (under-claim):** the 11 could-not-identify cases and the 2 boundary refusals (refuse rather than mislead).

## 17. P0–P3 Findings

| Severity | Count | Summary |
| --- | ---: | --- |
| P0 | 0 | Considered for the systemic false-verified calibration (widespread false certainty); **not** assigned — no fabricated authority, retrieval gaps fail safe, results reproducible, defect caught pre-production. Treated as a severe P1 cluster. |
| P1 | 8 | Systemic false VERIFIED_CONTROLLING calibration (9 instances); Q2 obsolete threshold; Q8 reversed lease VAT; Q9 wrong joint-filing rule; Q27 wrong rental EWT rate; Q29 invented WHT exemption; Q49 wrong returning-resident VAT; empty answers verified (Q37/Q41/Q31). |
| P2 | 3 | False DOMAIN_BOUNDARY refusals (Q23, Q43); retrieval coverage gap (11 could-not-identify); over-confident PARTIALs verified with missing conditions. |
| P3 | 2 | Q23/Q43 boundary responses not persisting 2 messages on reopen; minor form-label error (Q38). |

## 18. Root-Cause Categories

1. **Calibration keyed off retrieval, not correctness** — VERIFIED_CONTROLLING granted on AUTHORITY_FOUND + displayed sources without verifying the answer supports the exact proposition (systemic).
2. **Answer-generation quality gap** — wrong rates/treatments, obsolete thresholds, invented exemptions, reversed rules, and empty bodies from retrieved context.
3. **Retrieval coverage gap** — 11 valid questions unanswered (safe); 2 valid questions misrouted to a false domain-boundary refusal.

## 19. Governance Consequences

A reproducible P1 cluster exists → **REMEDIATION REQUIRED**. Phase 10A is **REOPENED FOR REMEDIATION**; Phase 10B and Phase 10C remain **BLOCKED**; the independent Phase 10A closure review remains **DEFERRED**. The prior "PHASE 10A FINAL CLOSURE GATE PASS WITH DEFERRED P2 ITEMS" record is preserved and is now superseded by this live evidence, consistent with LIVE EVIDENCE > THEORY > PATCH.

## 20. Remediation Requirements

1. Make VERIFIED_CONTROLLING contingent on proposition-level support, not source presence — a verified state must require that the answer's key proposition is actually supported by the cited controlling authority (and is non-empty/complete). Fail closed to RELATED_AUTHORITY_ONLY / needs-review otherwise.
2. Fix the confirmed wrong answers' generation defects (Q2, Q8, Q9, Q27, Q29, Q49) and the empty-answer paths (Q37, Q41, Q31).
3. Fix the false DOMAIN_BOUNDARY router misclassification (Q23, Q43).
4. Address the retrieval coverage gap for the 11 unanswered valid questions (safe but incomplete).
5. Re-run this 50×3 fact-check under an independent executor after remediation.

## 21. Exact Next Task

**`PHASE-10A8-TRUST-CALIBRATION-AND-ANSWER-CORRECTNESS-REMEDIATION-1`** — remediate the systemic false-verified calibration and the confirmed wrong-answer / false-boundary defects (runtime), then an independent re-run of this fact-check evaluation. Do not begin Phase 10B/10C; do not run the independent closure review in this task.

## Evidence

`evaluation/results/phase-10a7-tax-factcheck-capability-evaluation-1.json`; `.../phase-10a7-tax-factcheck-capability-evaluation-1/` (execution-manifest.json, run-log.json, TINA_Tax_FactCheck_Run_Log_v2_COMPLETED.md, scoring-worksheet.json, scoring-verdicts.json, payloads/ ×150, evidence-manifest.json with SHA-256). Framework: v3.0 master (unmodified, untracked).
