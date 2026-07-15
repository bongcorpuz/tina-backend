# PHASE-10A6-R4-FULL-LIVE-REVALIDATION-1 Report

## Decision

PHASE 10A6-R4 FULL LIVE REVALIDATION PASS WITH RECOMMENDATIONS.

Phase 10A is not closed. Phase 10A status is REOPENED - R4 PASSED, PENDING PHASE-10A7. Phase 10B remains BLOCKED. Phase 10C remains BLOCKED. Independent closure review remains DEFERRED.

## 1. Independent R3 Review

Reviewer/executor: Codex GPT-5, high-reasoning posture, medium speed. Reviewer independence confirmed: this session did not execute PHASE-10A6-R3.

R3 runtime commit reviewed: 2259dec560cae88e839767728e7fa9dbfcc33707.
R3 evidence commit reviewed: 5a6a12d229ea16b9b777044e1d097d6f958b8cec.

Decision: R3 INDEPENDENT REVIEW PASS WITH RECOMMENDATIONS.

Runtime commit scope was limited to ask-handler.js, services/source-fallback-disclosure.js, services/trust-contract.js, and the R3 targeted test. Evidence commit scope was limited to the R3 report, result JSON, evidence directory, and CURRENT_STATE update. No frontend change was present.

Recommendation: git show --check on the R3 evidence commit reports trailing whitespace in generated HTML evidence. This is evidence-format debt only; the R3 runtime commit is clean and the defect does not affect runtime behavior.

## 2. Fallback Design Assessment

R3 replaces bare SOURCE-mode source listings with a structured explanatory body when the answer starts from the app-generated "Indexed sources found:" marker and visible sources exist. The fallback discloses that a requested authority was not located or verified without claiming non-existence, presents conflict/uncertainty when the query frames it, explains hierarchy, lists related authorities, and recommends professional review.

The design is generalizable beyond exact Q9: detectors look for classes of specific authority requests and conflict/uncertainty framing. It is not a hardcoded exact-Q9 answer and does not fabricate authority content or a final legal conclusion.

## 3. Structured Fields

The field design is coherent. result.sourceOnlyFallback is an input-side signal that prevents the enriched fallback body from regressing to VERIFIED_CONTROLLING. trust.specificAuthorityNotFound remains in the frozen trust shape and is set for the source-only fallback path. payload.sourceFallbackDisclosure carries additive metadata without changing the canonical trust contract shape. The duplication between trust.specificAuthorityNotFound and payload.sourceFallbackDisclosure.specificAuthorityNotFound is intentional and not contradictory.

## 4. Test Quality

R3 targeted tests passed locally during this review: 11/11, 54 assertions. Coverage includes exact Q9, Q9 paraphrase, missing RMC, conflict without missing authority, generic bare fallback, legitimate verified control, restricted control, source failure, general answer, persistence payload fields, and detector non-overfit checks.

## 5. Environment And Lineage

Backend branch: feature/source-availability-engine-v1.
Backend start HEAD: 5a6a12d229ea16b9b777044e1d097d6f958b8cec.
Frontend HEAD: 0816ac865b4ee55d5bb92534834dadbb0dcfba87; frontend untouched, including the existing unrelated .gitignore modification.

Live environment: real authenticated staging /ask API using a fresh local JWT minted from ignored JWT_SECRET and an active Supabase user record; screenshots are sanitized payload-rendered evidence, not protected-preview UI captures.

The live Q9 behavior confirms the staging backend includes the R3 runtime path: Q9 returned structured sourceFallbackDisclosure metadata and substantive fallback bodies, not bare source listings.

## 6. Full Matrix

| Question | Verdict | Trust result | Evidence note |
| --- | --- | --- | --- |
| Q1 | PASS | procedural / NOT_APPLICABLE | Controlled LOA procedural boundary; no unsupported legal conclusion. |
| Q2 | PASS | related-authority-only / RELATED_AUTHORITY_ONLY | 3/3 substantive, missing requested RMC disclosed in prose, 0/3 VERIFIED_CONTROLLING, persistence consistent. |
| Q3 | PASS | verified-controlling / VERIFIED_CONTROLLING | Verified-controlling remains reachable; substantive answer with displayed authority cards. |
| Q4 | PARTIAL_P2 | verified-controlling / VERIFIED_CONTROLLING | Broad freight-forwarder answer remains VERIFIED_CONTROLLING on limited source support; no P1 because no missing requested authority or outcome prediction. |
| Q5 | PASS | verified-controlling / VERIFIED_CONTROLLING | Verified-controlling remains reachable; VAT-exemption/source-card path preserved. |
| Q6 | PASS | source-failure / NO_VERIFIED_AUTHORITY | No indexed-source match failed closed to NO_VERIFIED_AUTHORITY/source-failure. |
| Q7 | PASS | procedural / NOT_APPLICABLE | Controlled LOA procedural boundary; no unsupported final validity conclusion. |
| Q8 | PARTIAL_P2 | potential-conflict / VERIFIED_CONTROLLING | Competing-treatment answer remains VERIFIED_CONTROLLING while POTENTIAL_CONFLICT is surfaced; documented conflict completeness limitation. |
| Q9 | PASS | specific-authority-not-found / RELATED_AUTHORITY_ONLY | 3/3 substantive fallback bodies; missing ruling disclosed; conflict/uncertainty and hierarchy explained; 0/3 VERIFIED_CONTROLLING. |
| Q10 | PASS | restricted / NOT_APPLICABLE | Restricted outcome boundary preserved; no win/loss prediction; human review required. |

Questions passed: 8. Questions partial: 2. Questions failed: 0. Timeouts: 0.

## 7. Q2 x3

Q2 passed 3/3. All three runs were substantive, disclosed that the requested circular was not located/verified in prose, distinguished related/general authority, avoided VERIFIED_CONTROLLING, and persisted after hard refresh/history reopen. Structured specificAuthorityNotFound remains false, which is P2 but safe because the user-visible answer and trust state are related-only.

## 8. Q9 x3

Q9 passed 3/3. All three runs returned substantive structured fallback bodies, disclosed the requested ruling was not located or verified, disclosed conflict/need for harmonization, explained authority hierarchy, avoided settled-law framing, avoided VERIFIED_CONTROLLING, and persisted after refresh/reopen.

Q9 VERIFIED_CONTROLLING count: 0/3.

## 9. Legitimate Verified Controls

Legitimate verified-control preservation passed 2/2 using Q3-r1 and Q5-r1. VERIFIED_CONTROLLING remains reachable for substantive source-backed answers; no missing specific authority or verified conflict was present on those control runs.

## 10. Restricted Control

Q10 passed. It did not predict success, explained the boundary of legal analysis, required human tax/legal review, and rendered RESTRICTED.

## 11. Persistence

Persistence passed 14/14. Each fresh conversation returned two messages after hard refresh and history reopen, and the assistant trust state matched the original response.

## 12. Security

Evidence was sanitized. Secret scan is expected to find only descriptive words such as token/JWT in the manifest text, not secret values. Security failures: 0.

## 13. P2 Dispositions

Q2 structured specificAuthorityNotFound: MAY DEFER WITH DOCUMENTED LIMITATION. The structured flag remains false for Q2 even when prose discloses the missing circular, but the run is user-visible safe because authoritySupport is RELATED_AUTHORITY_ONLY and the answer does not imply the requested circular was verified.

Potential conflict completeness: MAY DEFER WITH DOCUMENTED LIMITATION. Q8 surfaces POTENTIAL_CONFLICT, while Q4/Q8-class analytical competing-treatment answers can still remain VERIFIED_CONTROLLING. This is a narrow completeness/calibration issue without a reproduced P1 in R4.

## 14. P0-P3 Table

| Severity | Count | Items |
| --- | ---: | --- |
| P0 | 0 | None |
| P1 | 0 | None |
| P2 | 2 | Q2 structured signal mismatch; potential-conflict completeness |
| P3 | 1 | Some sanitized local screenshot captures failed; payload and persistence evidence are complete. |

## 15. Governance Status

Phase 10A: REOPENED - R4 PASSED, PENDING PHASE-10A7.
Phase 10B: BLOCKED.
Phase 10C: BLOCKED.
Independent closure review: DEFERRED.

Phase 10A7 may proceed as the next authorized task. Phase 10A is still not closed.

## 16. Artifacts

- Result JSON: evaluation/results/phase-10a6-r4-full-live-revalidation-1.json
- Evidence directory: evaluation/results/phase-10a6-r4-full-live-revalidation-1/
- Evidence files: execution-manifest.json, independent-review-notes.json, sanitized payloads, sanitized HTML/screenshots, run-log.json, persistence-evidence.json, scoring-matrix.json, evidence-manifest.json with SHA-256 hashes

## 17. Exact Next Task

PHASE-10A7-TAX-FACTCHECK-CAPABILITY-EVALUATION-1.
