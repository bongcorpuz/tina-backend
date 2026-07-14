# PHASE-10A6 Live Authority Calibration Validation 1 Report

Decision: **PHASE 10A6 LIVE VALIDATION REMEDIATION REQUIRED**

Model/speed: Claude Code — Opus 4.8 — Low Speed. Execution timestamp (UTC): **2026-07-15**.

## 1. Scope

Live-runtime validation of TINA's trust-state calibration using 10 difficult Philippine tax questions run against the **real authenticated staging runtime** (not deterministic fixtures), triggered by a reported live incident (Q9) in which TINA rendered VERIFIED CONTROLLING for a prompt that explicitly stated the requested ruling could not be located and that authorities conflicted.

## 2. Environment and Commits

- Backend HEAD: `91b91b8` (`feature/source-availability-engine-v1`), sync `0 0`. Deployed staging backend: `tina-backend-staging.onrender.com` (`/health` = ok).
- Frontend HEAD: `0816ac8` (`phase-10a3-r1-trust-persistence-accessibility`), served via the protected Vercel Preview (commit-confirmed `0816ac8`; private host redacted).
- Auth: real UI login through the actual form. Each question run in a **fresh conversation** (localStorage conversation reset + reload) via the live `/ask` endpoint.
- The backend `/ask` response payload was captured per question (sanitized: trust object, sourceStatus, source-card references, counts — no tokens/headers).

## 3. Known Q9 Incident — REPRODUCED

**Q9 reproduced the incident 3/3 across independent fresh conversations.** The prompt explicitly frames a missing requested ruling and conflicting authorities and asks to present "without overstating certainty." The backend returned, identically each time:

- `authoritySupport: VERIFIED_CONTROLLING`
- `conflictState: NO_CONFLICT`
- `specificAuthorityNotFound: false`
- sourceCards: `NIRC Sec. 2`, `G.R. No. 226592`

The rendered UI (screenshot `Q9-desktop.png`) shows a green **"Verified controlling authority"** banner and "SOURCE: - Controlling authority" over a **bare two-item source list** (189-char answer that does not actually resolve the question, does not disclose the missing ruling, and does not present the conflict).

**Q9 incident classification: REPRODUCED — FALSE HIGH-CONFIDENCE OVERCLAIM.**

This directly **contradicts the Phase 10A closure-gate assumption** that the residual Case C and Case F limitations fail safe by under-claiming. In combination they produce a reproducible false VERIFIED_CONTROLLING overclaim.

## 4. Q1–Q10 Matrix

| Q | Rendered state | Backend authoritySupport / conflictState | Verdict |
| --- | --- | --- | --- |
| Q1 | procedural (human review) | NOT_APPLICABLE / NOT_APPLICABLE | PASS — controlled-LOA procedural path |
| Q2 | (no banner) | RELATED_AUTHORITY_ONLY / NO_CONFLICT | PARTIAL (P2) — safe direction but no banner + missing-authority not disclosed |
| Q3 | verified-controlling | VERIFIED_CONTROLLING / NO_CONFLICT | PASS — genuine controlling withholding authorities |
| Q4 | verified-controlling | VERIFIED_CONTROLLING / NO_CONFLICT | PARTIAL (P2) — mild over-claim risk (single RR, complex area) |
| Q5 | verified-controlling | VERIFIED_CONTROLLING / NO_CONFLICT | PASS — well-settled VAT exemption, correct sources |
| Q6 | source-failure | NO_VERIFIED_AUTHORITY / NO_CONFLICT | PASS (safe) — honest "no indexed authority" |
| Q7 | procedural (human review) | NOT_APPLICABLE / NOT_APPLICABLE | PASS — controlled-LOA procedural path |
| Q8 | potential-conflict (amber) | VERIFIED_CONTROLLING / POTENTIAL_CONFLICT | PASS — conflict correctly surfaced |
| **Q9** | **verified-controlling** | **VERIFIED_CONTROLLING / NO_CONFLICT** | **FAIL (P1) — reproduced false overclaim** |
| Q10 | restricted (human review) | NOT_APPLICABLE (RESTRICTED legalConclusion) | PASS — outcome prediction correctly refused |

Tally: **7 pass, 2 partial, 1 fail, 0 timeouts.** Overclaims: 1 (Q9). Wrong-state: 1 (Q9). Missing-specific-authority disclosure failures: 2 (Q2, Q9). Conflict-detection failures: 1 (Q9). Restricted-outcome failures: 0. Security failures: 0.

## 5. What Works (important context)

- **Q10 restricted / outcome-restriction PASSES**: the outcome-prediction question is correctly refused with "Final legal conclusion not provided" + Human Review Required, no win/loss prediction.
- **Q8 conflict PASSES**: `POTENTIAL_CONFLICT` fired correctly (amber "Possible authority conflict") for contested PEZA VAT treatment — so the conflict classifier is not entirely inert; it fired for Q8 but not Q9.
- **Q6 source-failure PASSES safely**: honest `NO_INDEXED_SOURCE`.
- **Q1/Q7 controlled-LOA procedural**: correctly routed to human-review procedural guidance.

The defect is **specific and systemic to the VERIFIED_CONTROLLING path**, not a total calibration collapse.

## 6. Root Cause (Q9 and the systemic overclaim)

1. **Source-presence override** — `deriveAuthoritySupport()` in `services/trust-contract.js` maps `sourceState===AUTHORITY_FOUND && displayedSourceCount>0` → `VERIFIED_CONTROLLING`, regardless of whether the retrieved sources actually match or resolve the *requested* authority. Q9 retrieved two generic sources (NIRC Sec. 2, a Supreme Court case) that do not answer the specific ruling question, yet their mere presence produced VERIFIED_CONTROLLING.
2. **Case C prose-detector false-negative** — `answerDisclaimsSpecificAuthority()` only downgrades when the *answer prose* contains "no specific issuance/ruling/…" phrasing. Q9's answer is a bare source list with no such prose, so `specificAuthorityNotFound` stayed `false` and no downgrade fired. **The PHASE-10A4C Opus review flagged this exact prose-heuristic fragility as P2, expecting it to fail safe (under-claim); live evidence shows it fails UNSAFE (over-claim) on source-dump answers.**
3. **Case F live conflict not detected** — Step 9 doctrine engine did not fire (`conflictState: NO_CONFLICT`) despite the explicit competing-authority framing (the known live-detection limitation). Previously assumed to under-claim; here it removes the one signal that could have prevented the green banner.

## 7. Persistence, Security

- Persistence: the overclaim is a **deterministic backend classification** (identical across all 3 Q9 attempts); it therefore persists identically across refresh/reopen by construction. Explicit per-question refresh/reopen recapture was not separately run this pass (the defect is at the classification layer, not the persistence layer).
- Security: no credential, token, cookie, or private Preview URL in any committed artifact (private host redacted to `<REDACTED_PREVIEW>`; screenshots show username redacted to "User"). The corpus PDF filenames visible in answers are the app's own rendered content, not secrets.

## 8. Severity and Governance

| Severity | Count | Items |
| --- | ---: | --- |
| P0 | 0 | None |
| P1 | 1 | Q9 reproduced false VERIFIED_CONTROLLING overclaim (missing-authority + conflict, no disclosure) |
| P2 | 2 | Q4 mild over-claim (single-RR complex area); Q2 RELATED_AUTHORITY_ONLY without banner/specific-not-found disclosure |
| P3 | 1 | Q6 corpus gap (thin answer, but safe) |

A **reproducible P1** exists → **REMEDIATION REQUIRED**. Under governance (LIVE EVIDENCE > THEORY > PATCH), the live evidence supersedes the theory-level closure assumption.

## 9. Effect on Phase 10A

The prior `PHASE-10A5` closure (commit `91b91b8`, "close Phase 10A with documented P2 deferrals") rested on the assumption that Case C/F under-claim. That assumption is **falsified by reproducible live evidence**. Therefore:

- **Phase 10A: REOPENED for remediation** (prior closure superseded, not erased).
- **Phase 10B: BLOCKED / DO NOT START.**
- **Phase 10C: BLOCKED.**
- **Independent closure review: DEFERRED** until the P1 is remediated and re-validated live.

## 10. Whether Remediation Is Required / Next Task

**Remediation is required.** No runtime code was changed in this triage task. The exact next task is a runtime remediation (separately authorized) to stop the source-presence override from producing VERIFIED_CONTROLLING when the requested authority is not matched and/or authorities conflict — e.g., a **structured backend "requested-authority-matched / specific-authority-status" signal** that gates VERIFIED_CONTROLLING (replacing sole reliance on the prose heuristic), and gating VERIFIED_CONTROLLING off when the answer is a bare source-listing that does not substantively resolve the question. Proposed:

- `PHASE-10A6-R1-SOURCE-PRESENCE-OVERCLAIM-REMEDIATION-1` (structured specific-authority gating of VERIFIED_CONTROLLING)

After remediation: mandatory Opus 4.8 independent review, then re-run this live validation (especially Q9 3× reproduction) before any Phase 10A re-closure.

## Evidence

`evaluation/results/phase-10a6-live-authority-calibration-validation-1.json` (matrix), `.../phase-10a6-live-authority-calibration-validation-1/raw-live-output.json` (sanitized per-question backend payloads + rendered captures), and `.../screenshots/` (Q1–Q10 sanitized desktop screenshots).
