# PHASE-10A14-R12 Semantic Filing Directive Coverage, NOT_APPLICABLE History Consistency And Evidence Manifest Hygiene Remediation 1 Independent Review 1

Decision: REVISIONS REQUIRED
Reviewer: Codex GPT-5
Review date: 2026-07-19
Repository: C:\Projects\tina-backend
Branch: feature/source-availability-engine-v1
Reviewed HEAD: af4baabe8a52230e2b3e3fd65a13af1d17daa1a3
R12 base: b4575bacfd941967132caacffd0ff792057025e4
Pre-fix evidence commit: 70790c3158cd32a877e87d9a401354878d383cd0
Runtime remediation commit: d91b6978cda1ed3e31740566de8ef5f2061868ce

## Executive Decision

R12 is not approved for PASS. The review accepts the main evidence chronology: the frozen plan and pre-fix evidence were committed before remediation, final runtime evidence was generated after the corrected runtime commit, the 84-probe campaign reconciles, and R12 manifests prospectively exclude themselves and validate.

The PASS blockers are runtime/contract issues. Independent semantic probes found material advice/recommendation filing directives that still bypass the `calendar-relative-deadline` replacement path. Independent safe-control probes also found safe negation overfires. Finally, the domain-boundary persistence implementation can falsely report `persistenceStatus: "PERSISTED"` when the underlying save fails, because the status is derived from the presence of IDs rather than confirmed write success.

## Findings

### P1-R12-IR-001 - Semantic directive coverage remains incomplete

Status: OPEN / PASS-blocking.

The frozen R12 detector campaign closes its own enumerated unsafe cases, but materially equivalent directive forms still miss. Independent probes that did not trigger the safe replacement path include:

- "I suggest that you file today."
- "My advice is to file today."
- "You may wish to file today immediately."
- "The best course is to file today."
- "It is best to submit today."
- "I strongly encourage filing today."
- "It may be wise to file today."
- "Complete the filing before close of business."
- "You may lodge the return today to prevent a surcharge."
- "Unless you file today, penalties may apply."

Full `evaluateAnswerSupport` probes for suggestion/best-course/wise/unless variants did not route to `calendar-relative-deadline`; they reached `proposition-source-sufficiency` instead. Because public replacement depends on the calendar-relative stage, this is a material directive bypass.

### P1-R12-IR-002 - Safe negation overfire remains possible

Status: OPEN / PASS-blocking.

Independent safe controls overfired:

- "The available authority does not establish that you must file today."
- "Do not assume that today is the filing deadline."

The second form also routed through full `evaluateAnswerSupport` to `calendar-relative-deadline`. These are safe cautionary statements, not unsafe filing directives. Overwriting or downgrading them as false calendar-relative directives violates the required safe-false-positive/material-false-refusal criteria.

### P1-R12-IR-003 - Domain-boundary persistenceStatus can falsely claim PERSISTED on save failure

Status: OPEN / PASS-blocking.

R12 adds a domain-boundary save call and live success evidence for the normal successful path. However, `saveConversationTurn` catches and swallows persistence errors, returning no success/failure signal. The domain-boundary branch computes `_boundaryPersisted = Boolean(conversationId && userId)` before the save call and returns `persistenceStatus: "PERSISTED"` whenever IDs are present.

Therefore if either message insert fails, the memory hook save fails, the Supabase call returns no data, or a timeout/error is swallowed by `saveConversationTurn`, the API can still claim `PERSISTED`. The review packet explicitly classifies any false persistence claim as P1.

### P3-R12-IR-004 - Non-material detector count label inconsistency

Status: OPEN_NON_MATERIAL.

The R12 result JSON says `totalDetectorProbes: 80`, while `POST_FIX_DETECTOR_SUMMARY.json` and reconciliation say 81 detector probes. The actual file inventory is 81 detector payloads plus 4 persistence payloads, with `P1-F32-CONDITIONAL` intentionally appearing in both detector and persistence evidence, yielding 84 unique frozen probe IDs. This is not a missing-evidence defect, but the result JSON count label should be corrected in a future evidence packet.

## Accepted Evidence

- Local HEAD and origin were synchronized at `af4baabe8a52230e2b3e3fd65a13af1d17daa1a3` before review artifact creation.
- R12 is a six-commit linear sequence from `b4575bacfd941967132caacffd0ff792057025e4`.
- Pre-fix evidence commit `70790c3158cd32a877e87d9a401354878d383cd0` is a strict ancestor of runtime commit `d91b6978cda1ed3e31740566de8ef5f2061868ce`.
- Pre-fix evidence under `evaluation/results/phase-10a14-r12/prefix` was not modified after commit 2.
- Runtime files and R12 focused test were not modified after commit 3.
- Frozen manifest contains 84 unique probe IDs: 65 unsafe and 19 safe; category counts are R11=38, H=12, I=8, J=4, K=3, L=4, M=5, N=6, P=4.
- Pre-fix detector evidence has 81 payloads against runtime `90d70fec2dde9e9985c0b2a17c2c19f199923fa6`, with 25 unsafe misses and 0 safe false positives.
- Post-fix detector evidence has 81 payloads against runtime `d91b6978cda1ed3e31740566de8ef5f2061868ce`, with 0 unsafe misses and 0 safe false positives for the frozen set.
- Four persistence payloads reproduce the R11 mismatch and show successful-path consistency post-fix.
- The 20 live payloads all record runtime `d91b6978cda1ed3e31740566de8ef5f2061868ce`, with API unsafe=0, history unsafe=0, API/history mismatch=0, rejected exposure=0.
- R12 prefix, postfix, and final manifests have zero self-entries and validate with zero missing files and zero hash mismatches.
- The disclosed L1/L2/M5 and persistenceStatus placement corrections are classified as valid pre-commit development iterations for the final R12 evidence, because no committed incomplete-runtime campaign was found and final post-fix payloads record the corrected runtime.

## Governance Supersession Decision

NOT SUPERSEDED. The original R10 intermediate payload remains unavailable and was not recovered, reconstructed, or backdated. R11/R12 prospective evidence is real, but the required conditions for supersession include no material directive bypass, persistence/history consistency closed, and no P1 evidence defect. Those conditions are not met.

## Independent Gates

Focused suites:

- `node tests/phase-10a14-r12-semantic-filing-directive-and-not-applicable-persistence.test.mjs` -> 47 passed, 0 failed.
- `node tests/phase-10a14-r11-calendar-directive-completeness-and-contextual-safe-answer.test.mjs` -> 39 passed, 0 failed.
- `node tests/phase-10a14-r10-calendar-relative-public-answer-replacement.test.mjs` -> 22 passed, 0 failed.
- `node tests/phase-10a14-r9-calendar-relative-deadline-and-filing-rationale-alignment.test.mjs` -> 15 passed, 0 failed.

Full deterministic runner:

- Cycle 1: syntax 10/0, deterministic suites 202/0.
- Cycle 2: syntax 10/0, deterministic suites 202/0.

Staging smoke runner:

- Initial restricted-sandbox run: 7 suites run, 1 failed because phase-09r staging reachability was not available in restricted network execution.
- Network-enabled cycle 1: 7/0, STAGING GATE PASSED.
- Network-enabled cycle 2: 7/0, STAGING GATE PASSED.

Deterministic all-26 artifact:

- `DETERMINISTIC_ALL26_R12.json`: blocked 9, preserved 17, mismatch 0, pass true.

## Security And Scope

No secret exposure, real taxpayer data, raw credential disclosure, production deployment, model/prompt/temperature change, filing-rationale redesign, retrieval/reranker change, source ingestion, corpus/vector mutation, reindex/re-embedding, direct DB write, schema migration, frontend/Dev Factory change, protected-path modification, or port 5173 touch was found by this review. No backend listener was started or left running.

## Final Classification

REVISIONS REQUIRED. P0=0, P1=3, P2=0, P3=1.

Phase 10A remains OPEN. Do not execute E2/A15 or close Phase 10A until a separate authorized remediation closes these findings.
