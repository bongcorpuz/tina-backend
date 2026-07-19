# PHASE-10A14-R9 — Calendar-Relative Deadline, Filing-Rationale Alignment & Canonical Inventory Closure Remediation 1

**Executor:** Claude Code — Opus 4.8 (low speed)
**Repository:** `C:\Projects\tina-backend` · branch `feature/source-availability-engine-v1`
**Starting HEAD:** `ee46cb51…` (expected) · sync `0 0` · **R9 runtime:** `0c80b12…` (staging auto-deployed, non-production)
**Runtime model:** `gpt-4o-mini` (unchanged)
**Decision (self-assessed):** **PASS** — formal decision belongs to the mandatory independent reviewer.

## Findings — all three CLOSED
| ID | Closure |
|---|---|
| **P1-E1-001** | New non-overridable `calendar-relative-deadline` gate: an affirmed today/last-day/already-late filing-deadline conclusion fails closed (temporal sufficiency not establishable). Narrow `ask-handler.js` WS4 safety note replaces the false affirmation. Live: SG-C-LASTDAY / R9-LASTDAY-REPRO / R9-DUETODAY → RELATED_AUTHORITY_ONLY, corrective note present. |
| **P1-E1-002** | New non-overridable `filing-rationale-alignment` gate: a filing conclusion whose **decisive** rationale (Short Answer + Controlling Authorities) is a Section 24 rate/threshold rule fails closed even with a Section 51 source card present. Live: ALL26-Q12-r1/r2/r3 + SG-A-Q12REV → RELATED_AUTHORITY_ONLY. |
| **P1-E1-003** | Complete literal A12–R8 inventory: **319 probes** with exact questions from machine-readable sources (A14 50-question bank, 26 verified slots, A14-R1/R2/R3 payloads, E1 115 probes) + identifier-level enumeration of the test-encoded A12/A13/A14-R4..R8 lineage. No original probe dropped. |

## Runtime remediation (WS2–WS8)
`services/answer-support-validator.js`: two pure deterministic gates wired into `evaluateAnswerSupport`
**before** the LLM stage (so they are non-overridable). `evaluateCalendarRelativeDeadline` keys on affirmed
calendar-relative deadline assertions; `evaluateFilingRationaleAlignment` extracts the decisive-rationale text
(excludes the Interpretation section) and fails a filing conclusion supported only by rate/threshold reasoning.
`ask-handler.js`: WS4 safety note limited to the `calendar-relative-deadline` stage. No model/prompt/temperature
change; the model validator cannot override either deterministic failure.

## Evidence (WS10–WS15)
- Focused suite `phase-10a14-r9` **15/0**; prior R1–R8 + phase-10a12-r6 suites preserved; deterministic all-26 stays **9/17/0**.
- WS11 impact/supersession: **94 affected reruns · 21 carried-forward (both gates provably `applicable=false`) · 9 new**.
- Differential live (R9 runtime, `0c80b12`): **103/103 probes, 0 technical failures**. Trust 35 VERIFIED / 58 RELATED / 10 NO_VERIFIED.
- Fresh live all-26: **Q12 = 0 verified, Q30 = 0 verified, Q34 = verified & supported (Sec 51 deadline)**.
- WS13 adjudication: **35/35 VALID / APPROPRIATELY VERIFIED**; questionable = over-verified = invalid = 0; false today-relative verified = 0; Section 24 laundering = 0.
- WS14 false-refusal: **material false refusal = 0**; required positive classes (filing obligation, deadline, substituted filing, multiple-employer, mixed-income, self-employed) all reachable with VALID verifieds.
- Persistence: corrected trust states (Q12 → RELATED, calendar-relative → RELATED) persist consistently (4/4, 0 mismatch).
- Reconciliation: payloads = runlog = manifest = **103**.

## Gates & scope (WS16/WS17)
Deterministic **199/0 ×2** (clean tree); staging **7/0 ×2**. No secrets/taxpayer data; no model/prompt/corpus/
vector/reindex/DB/schema/frontend/Dev-Factory change; no production deployment; protected paths preserved;
port 5173 untouched; sync `0 0`.

## Next task
PHASE-10A14-R9-…-INDEPENDENT-REVIEW-1 (Codex GPT-5, high reasoning, low speed; the reviewer must not execute R9).
After an independent R9 PASS → PHASE-10A15-FULL-FACTCHECK-RERUN-5. Phase 10A remains OPEN.
