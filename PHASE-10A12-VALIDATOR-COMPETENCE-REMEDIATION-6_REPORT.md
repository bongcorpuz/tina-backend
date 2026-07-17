# PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-6 — REPORT

**Model:** Claude Code — Opus 4.8 — Low speed.
**Governance:** LIVE EVIDENCE > THEORY > CLAIMS.
**Start HEAD:** `6622cf1`. **Validator commit:** `920ed53`. **Runner-fix commit = runtime commit:** `09751a6`.
**Decision:** PHASE 10A12-R6 PASS.

Does NOT authorize A13, the adversarial suite, Phase 10A closure, 10B, 10C, model change,
reindexing, or deployment.

---

## The four R5 P1 findings — all remediated with live evidence

### P1-1 / P1-A — M-Q36 invalid VERIFIED_CONTROLLING (penalty)

`m-q36-reproduction-and-root-cause.md`. The R5 answer fabricated a "25% of the tax due for each
month of delay, not exceeding 50%" penalty, confusing the **one-time 25% surcharge** (NIRC Sec 248)
with **periodic 12% p.a. interest** (Sec 249), and cited only **general VAT-imposition** provisions
(Sec 105-108, RR 16-2005) — not penalty/procedural authority. Root cause: **penalty proposition
verified on non-penalty authority** (source-card laundering). **Remediated:** the penalty sub-gate
requires penalty authority (Sec 248/249/250/253/254/255, RA 11976/EOPT, RR 6-2024, RMC 52-2023).
Live R6: **M-Q36 → RELATED_AUTHORITY_ONLY** (stage `proposition-source-sufficiency`).

### P1-2 / P1-D — M-Q25 invalid/questionable VERIFIED_CONTROLLING (EWT)

`m-q25-reproduction-and-root-cause.md`. Inspected independently (not assumed identical to M-Q36).
The R5 answer said "yes categorically" and framed VAT registration as dispositive for EWT, citing
**VAT registration/invoicing** authority (Sec 109/236, RR 16-2005, RMC 75-2015). Root cause
(distinct): **authority-topic mismatch + generic-source-card laundering + missing statutory
(legal-form/GPP) conditions** — VAT registration does not determine EWT; the controlling authority is
the withholding regulations (RR 2-1998/11-2018, RMC 50-2018), and the answer omits the qualifying-GPP
distinction. **Remediated:** the EWT sub-gate requires withholding authority. Live R6:
**M-Q25 → RELATED_AUTHORITY_ONLY** (stage `proposition-source-sufficiency`).

### P1-3 / P1-B — deterministic runner failed twice

`runner-remediation-evidence.md`. Root cause: 09ZF's allowed-file scope check flagged untracked
`.claude/settings.local.json` because its untracked filter excluded `.vscode/`,
`evaluation/factcheck/`, `.env` but **not** `.claude/` (a protected untracked path) — an
environment-dependent assumption (global-gitignore variance), not an R5 change or functional
regression. **Fix (`09751a6`):** add `.claude/` to the 09ZF untracked exclusion. No suite deleted,
weakened, skipped, forced, or made non-blocking; the guard still fails on real disallowed changes
(proven by simulation); the R5 simulated-reversion capability is preserved. **Result: deterministic
lane 189/0, exit 0 (twice).**

### P1-4 / P1-C — staging runner failed twice

Root cause: **actual transient staging unavailability** during the review window; 09R correctly
FAILS (does not skip) when staging is down. No change to the staging lane (it must remain mandatory
and blocking). Staging is reachable at R6 execution. **Result: staging lane 7/7, exit 0 (twice).**
Had staging remained unreachable, R6 would have stayed REVISIONS REQUIRED.

## The remediation control (WS3)

`source-sufficiency-design-record.md`. `evaluatePropositionSourceSufficiency` — a deterministic
pre-gate before the gpt-4o-mini validator, failing closed when a decisive proposition lacks a
controlling authority of its own class. Keyed on **proposition class + authority class**, not
question IDs, exact strings, prompt hardcoding, or answer deny lists. Covers a legal-risk class: it
hardened the entire EWT cluster (M-Q24/26/27/29) and the penalty question (M-Q36) deterministically,
not just the two flagged IDs. Preserves valid reachability (penalty answer citing Sec 248/249, EWT
answer citing RR 2-1998/11-2018 both remain sufficient); never upgrades trust. 16 focused adversarial
tests (`tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs`): penalty/procedural,
M-Q25 EWT class, cross-domain non-applicability — all pass.

## Governed mini-30 rerun (WS7)

UNCHANGED R5 frozen manifest (`canonicalSetSha256 8e019480…`, `sourceBankSnapshotSha256 526106e5…`).
30/30 at runtime `09751a6`: membership EXACT match, 0 runtime-stamp mismatches, 0 prompt mismatches,
`persistence.count = 2` all. Counts: VERIFIED_CONTROLLING 4 + RELATED 16 + NO_VERIFIED 10 = 30.
**Invalid verified = 0, questionable = 0, fabricated authority = 0, false refusal = 0, unrestricted
prediction = 0, persistence failures = 0.** Verified: M-Q6, M-Q12, M-Q15, M-Q30 — all VALID
(`verified-audit.md`; M-Q30 carries the R5-review-accepted minor "exceeding ₱5M" imprecision — the
asked proposition, the 6% rate, is correct). **M-Q25 and M-Q36 both RELATED** (remediation confirmed).

## Prior-remediation preservation (WS8)

Live focused regression at `09751a6`: Q5-p1 exact ×3 → RELATED (Q5 invalid verified = 0); Q5-rbe1
(domestic importer 12%) and Q5-rbe2 (non-qualifying importer 12%) → VERIFIED **(valid Q5 reachability
preserved)**; Q8 exact → RELATED and Q8 aggregate-substitution → treatment-contradiction (Q8 invalid
verified = 0; reversal blocked); RES-2 → outcome-prediction (restriction holds). The Q5
incentive-source-sufficiency gate is preserved unchanged. Validator/trust suites all pass: A12-R6 16,
A12-R3 20, A12-R2 10, A12-R1 19, A10-R1 22, A10-R2 27, A10-verified 18, A8 24 (accessor getter
executions 0, exceptions 0, accessor verified 0).

## Runner evidence, reconciliation, security

Two clean cycles each: deterministic lane exits 0 twice (189/0), staging lane exits 0 twice (7/7) —
logs committed. Suite accounting: 189 deterministic + 7 staging = 196 combined; +1 vs prior 195 is
the new R6 focused suite (justified, reconciled). `count-reconciliation.json` ties manifest, payload
index, hash manifest, result JSON, report, and CURRENT_STATE. Security: clean (`security-scan.md`) —
`sanitizedConversationRef` only; no secrets, private URLs, conversation IDs, or PII. Protected
untracked paths untouched; no frontend/Dev Factory/production/reindex/model changes.

## Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | All four R5 P1 findings remediated with live evidence. |
| P2 | 4 | Source-excerpt grounding still false; guard remains proposition-class-specific (extensible but not exhaustive); gpt-4o-mini validator limitation + latency; deadline/form procedural class is a monitored future extension. |
| P3 | 1 | Intermittent degenerate generation / transient truncation requiring bounded retry. |

## Decision

**PHASE 10A12-R6 PASS** — all four R5 P1 findings remediated; governed mini-30 30/30 with 0
invalid/questionable verified; deterministic and staging lanes each exit 0 twice with no coverage
weakened; valid verified reachability preserved; official authorities only; security clean; worktree
clean; pushed; sync 0 0. Phase 10A remains open pending the independent R6 review.

## Exact next task

PHASE-10A12-R6-INDEPENDENT-VALIDATOR-COMPETENCE-REVIEW-1 (a model that did not execute this
remediation). A13, the adversarial suite, 10A closure, 10B/10C, model change, reindexing, and
deployment remain unauthorized.
