# PHASE-10A6-R2-LIVE-AUTHORITY-CALIBRATION-REVALIDATION-1 Report

## Decision

PHASE 10A6-R2 LIVE REVALIDATION REMEDIATION REQUIRED.

Phase 10A remains REOPENED. Phase 10B remains BLOCKED. Phase 10C remains BLOCKED. Independent closure review remains DEFERRED.

## Executor And Scope

Executed by Codex GPT-5, high-reasoning posture, medium speed, independent of the PHASE-10A6-R1 executor recorded as Claude Code Opus 4.8.

Backend start HEAD reviewed: 687e55d0b254b7a0776f6e753c12f46ffa79cc17. Backend branch: feature/source-availability-engine-v1. Frontend HEAD observed: 0816ac865b4ee55d5bb92534834dadbb0dcfba87; frontend was not modified. Dev Factory was not modified. Runtime code, frontend code, fixtures, Gemini, and closure gate were not rerun or changed.

## Part I - Independent R1 Review

Reviewed R1 remediation commit 665bd303dca7051ed6c485b372ed17e04a063f6e and record commit 687e55d0b254b7a0776f6e753c12f46ffa79cc17.

Decision: R1 REMEDIATION REVIEW PASS WITH RECOMMENDATIONS.

The R1 guard is structural enough for the defect it targeted: the app-generated SOURCE-mode marker "Indexed sources found:" is detected before AUTHORITY_FOUND can become VERIFIED_CONTROLLING. Conflict, source-failure, restricted, and related-only precedence remain intact. R1 tests cover the captured Q9 pattern, paraphrase, prose disclaimer, legitimate verified-control preservation, source failure, conflict, and restricted-control paths.

R1 does not remediate the broader missing-requested-authority and conflict-disclosure problem. That limitation is material in R2.

## Part II - Live Revalidation

Environment: authenticated staging /ask API using a fresh local JWT minted from ignored JWT_SECRET and an active Supabase user record; screenshots are sanitized payload-rendered evidence, not protected-preview UI captures.

Run count: 14/14 required live authenticated staging /ask calls completed with HTTP 200. Q2 was run 3 times in fresh conversations. Q9 was run 3 times in fresh conversations.

Persistence: all 14 conversations were created through the backend conversation API before /ask. Hard-refresh and history-reopen checks returned two messages and the same assistant trust state for every run.

Screenshots: 11/14 sanitized payload-rendered screenshots were captured. These are not protected-preview UI screenshots. Three local Chrome captures failed with exit code 3221225477; payload JSON and persistence evidence are complete.

## Matrix Result

| Question | Verdict | Trust result | Evidence note |
| --- | --- | --- | --- |
| Q1 | PASS | procedural / NOT_APPLICABLE | Controlled LOA/procedural boundary preserved. |
| Q2 x3 | PASS WITH P2 | related-authority-only / RELATED_AUTHORITY_ONLY | All three runs disclose in prose that the requested circular could not be located and avoid verified-control implication; structured specificAuthorityNotFound remains false. |
| Q3 | PASS | verified-controlling / VERIFIED_CONTROLLING | Analytical verified path preserved. |
| Q4 | PARTIAL P2 | verified-controlling / VERIFIED_CONTROLLING | Prior mild over-claim risk remains on broad freight-forwarder answer with one displayed source. |
| Q5 | PASS | verified-controlling / VERIFIED_CONTROLLING | VAT-exemption answer retained displayed-source support. |
| Q6 | PASS | source-failure / NO_VERIFIED_AUTHORITY | Failed closed when no indexed source matched. |
| Q7 | PASS | procedural / NOT_APPLICABLE | Controlled LOA/procedural boundary preserved. |
| Q8 | PASS | potential-conflict / POTENTIAL_CONFLICT | Potential-conflict trust state surfaced and persisted. |
| Q9 x3 | FAIL P1 | related-authority-only / RELATED_AUTHORITY_ONLY | R1 fixed the green verified-control overclaim, but every answer remained a bare source list with no missing-ruling disclosure and no conflict presentation. |
| Q10 | PASS | restricted / RESTRICTED | Outcome prediction remained restricted and required human review. |

## Critical Finding

P1: Q9 still fails 3/3. The original high-confidence verified-controlling banner is gone, which confirms R1 addressed the source-presence overclaim. But the live answer body still says only "Indexed sources found" and lists two authorities. It does not disclose that the requested BIR ruling was not located, and it does not present or qualify the prompt-stated conflict among authorities.

Because the R2 acceptance criteria require the missing requested ruling and conflict/uncertainty to be explicitly presented, Phase 10A cannot re-close.

## Counts

P0: 0. P1: 1. P2: 2. P3: 1.

P2 items: Q2 structured specificAuthorityNotFound remains false despite safe prose disclosure; Q4 mild verified-controlling overclaim risk remains.

P3 item: three sanitized local screenshot captures failed, though live payload and persistence evidence are complete.

## Artifacts

- Result JSON: evaluation/results/phase-10a6-r2-live-authority-calibration-revalidation-1.json
- Evidence directory: evaluation/results/phase-10a6-r2-live-authority-calibration-revalidation-1/
- Key evidence: run-log.json, execution-manifest.json, persistence-evidence.json, source-summaries.json, payloads/, html/, screenshots/

## Next Task

PHASE-10A6-R3-SPECIFIC-AUTHORITY-AND-CONFLICT-DISCLOSURE-REMEDIATION-1.

Do not begin Phase 10B. Do not close Phase 10A until the Q9 disclosure/conflict defect is remediated and revalidated live.
