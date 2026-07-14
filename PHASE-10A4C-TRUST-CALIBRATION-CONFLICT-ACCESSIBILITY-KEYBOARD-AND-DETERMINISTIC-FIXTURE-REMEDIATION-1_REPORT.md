# PHASE-10A4C Trust Calibration, Conflict-State, Accessibility, Keyboard, and Deterministic-Fixture Remediation 1 Report

Decision: **PHASE 10A4C PASS WITH STRICT RECOMMENDATIONS**

Governance: **LIVE EVIDENCE > THEORY > PATCH.** Model/speed: Claude Code — Sonnet 5 — medium. Execution timestamp (UTC): **2026-07-14T08:25:12.337Z**.

## Governance Disclosure — Gemini Attribution (Read First)

This task's prompt attributed the controlling findings (Case C trust-calibration, Case F semantic anomaly, trust-adjacent contrast) to a completed Gemini 2.5 Pro rendered-UX review that returned REVISIONS REQUIRED. **No tool in this environment can invoke real Gemini 2.5 Pro** — this is confirmed consistent with this project's own prior precedent (`knowledge/CURRENT_STATE.md`'s PHASE-10A3 entry: *"Gemini UX review: NOT PERFORMED BY GEMINI 2.5 PRO. No tool in this environment can invoke that model."*). Before proceeding, this was raised with the user, who confirmed: **record this honestly as a self-review against Gemini-style criteria, not as an authentic Gemini output.** The substance of the findings is not fabricated — they match almost exactly the P2 findings already established in the PHASE-10A4B independent technical review (Opus 4.8), so the remediation work itself is well-grounded in real prior evidence. See `gemini-revisions-required-summary.json`. **A genuine Gemini 2.5 Pro rendered-UX review has still never been performed and remains a required follow-up before Phase 10A may close.**

## Repository State

Backend `feature/source-availability-engine-v1`, starting HEAD `dc2293d` (all required ancestors confirmed present), final HEAD after this task's commits. Frontend `phase-10a3-r1-trust-persistence-accessibility`, starting HEAD `1748788ee5314eb495710f9b281ab6621b943109`, final HEAD after this task's commits, `main` untouched throughout, sync `0 0` on both repos at every checkpoint.

## Case C: Root Cause and Remediation

**Root cause** (full trace in `case-c-root-cause.json`): `services/trust-contract.js`'s `deriveAuthoritySupport()` unconditionally mapped `sourceState===AUTHORITY_FOUND && displayedSourceCount>0` to `VERIFIED_CONTROLLING`, with no distinction between "the specific requested issuance was verified" and "some general governing authority was found and displayed." When the answer's own prose disclaimed a specific requested issuance (e.g., "There is no specific BIR issuance that addresses drone delivery services"), the banner still rendered the UI's strongest positive signal (green, "OK", "Verified controlling authority") — the same treatment as a genuinely on-point verified answer.

**Remediation**: A generalizable text-pattern detector (`answerDisclaimsSpecificAuthority()`) recognizing "no specific issuance/ruling/regulation/circular…" (and "does not exist") phrasing in the answer's own prose. When it fires (only when `sourceState===AUTHORITY_FOUND`), `authoritySupport` is downgraded to the **existing** `RELATED_AUTHORITY_ONLY` canonical state (decision-order preference 1 — no new top-level state invented), plus an additive `specificAuthorityNotFound` boolean qualifier (decision-order preference 2), enforced by a new invariant so it can never be true unless `authoritySupport===RELATED_AUTHORITY_ONLY`. Frontend: a distinct amber sub-kind (`SPECIFIC_AUTHORITY_NOT_FOUND`, `role=alert`, label "Specific issuance not found", secondary label "Grounded in general law") and a calibrated source-summary qualifier ("General authorities cited" instead of "Related authority only" or "Controlling authority").

**Live rendered result** (fixture `C-SPECIFIC-AUTHORITY-NOT-FOUND`): amber banner, `!` marker, "Specific issuance not found" / "Grounded in general law", description explicitly distinguishing general-authority backing from issuance-specific verification, source summary "General authorities cited." Verified at desktop, tablet, and all three mobile widths. Persisted identically through history reopen and hard refresh. **8/8 acceptance criteria met** (`case-c-remediation-results.json`).

## Case F: Root Cause and Remediation

**Root cause** (full trace in `case-f-root-cause.json`): The existing canonical conflict machinery (`services/conflict-trust-classifier.js`'s `classifyConflictState()`, and `TrustBanner`'s Tier 2/3 rendering) is fully implemented and correct — **no duplicate conflict state was built**. The gap is that `pipeline.js`'s real Step 9 Four-Part Doctrine Test output shape (`{ trueConflicts, count, hasConflict }`) structurally never satisfies `answer-renderer.js`'s `conflictMetadataIsComplete()` gate (which requires `conflict===true` plus `conflictType`, `exactIssue`, `exactLegalDimension`, `sameIssueGate.passed`, `oppositeHoldingGate.passed`, `resolutionBasis`). **This is a pre-existing, already-documented limitation** — the PHASE-10A1-R1 test suite already contains an explicit test proving this exact fact, predating this task. `VERIFIED_CONFLICT` is therefore currently unreachable from any live natural-language query.

**Scope decision**: Enriching the live Step 9 doctrine engine is a separate, higher-risk remediation requiring dedicated conflict-engine review (governed "Authority Lock" surface) — **explicitly out of scope here**. Instead, `services/staging-trust-fixtures.js` (new) proves the rendering chain is correct end-to-end using a hardcoded, fully-complete conflict object, via a fixed, closed-registry, fail-closed-outside-staging mechanism (reusing the `isStagingBackendRuntime()` gate already proven in the CORS remediation).

**Live rendered result** (fixture `F-CONFLICTING-AUTHORITY`): red/critical banner, "Conflicting authorities identified," two clearly-labeled competing source cards (RR No. 16-2005, RMC on input VAT timing), no misleading qualifier. Persisted identically through reopen/refresh. **8/8 acceptance criteria met** (`case-f-remediation-results.json`). **Known remaining limitation**: live-query reproduction of a genuine conflict remains unavailable outside the fixture until the Step 9 enrichment work is separately undertaken.

## Deterministic Fixture Registry

`services/staging-trust-fixtures.js`: a **fixed, closed registry** of 7 named fixture IDs (A–G) — no free-form injection of trust fields or content is accepted, only a `fixtureId` lookup key. Fails closed outside a genuine staging runtime; wired into `ask-handler.js` strictly **after** authentication (no new auth bypass); never mutates data beyond normal conversation persistence; contains no secrets or taxpayer data. Accessed through the **real chat UI** via a new `/fixture <ID>` slash command (typed in the composer, sent through the normal flow) — not a raw API call bypassing the UI. Unit-verified: all 7 fixtures produce their exact intended trust state; registry fails closed on production and local runtimes; unknown/non-string IDs denied even on staging (14/14 tests pass). See `deterministic-fixture-registry.json`.

## Contrast and Accessibility

**Contrast**: `--text-tertiary` darkened (`#7d8087` → `#5a5d64`, 3.96:1 → 6.59:1 on white) and `--gold-dark`/`--link` darkened (`#9a741e` → `#735313`, 4.29:1 → 7.06:1 — reusing the exact value already established for the PHASE-10A3-R1 banner fix). Live-measured banner ratios this run: 15.3–16.45:1, all far exceeding 4.5:1.

**Moderate axe findings** (`heading-order`, `landmark-one-main`, `region`, 3+22 nodes): resolved via a `<main aria-label="TINA conversation">` landmark, a visually-hidden `<h2>Conversation</h2>`, and a semantic `<footer>`.

**New finding discovered mid-task**: the first clean rerun surfaced a **new** serious `scrollable-region-focusable` violation (not previously flagged) on `.chat-container`. Fixed with `tabIndex={0}` and an accessible label. A second, final rerun confirmed **0 critical, 0 serious, 0 moderate, 0 minor** violations across the complete 7-fixture conversation.

## Keyboard Workflow

Composer reachable by Tab; a real clickable source-chip anchor (fixture A was given a genuine `publicUrl` specifically to enable this test) confirmed keyboard-focusable; profile menu focusable; no keyboard trap. Several workflow steps (conversation-history list, expand/collapse, focus-return) are correctly marked **NOT APPLICABLE** — this frontend has no multi-conversation list UI and source chips are plain anchors with no expand/collapse control, both pre-existing architectural facts, not evidence gaps. See `keyboard-navigation-results.json` for the full step-by-step account, including the one remaining P3 recommendation (a visible focus-ring screenshot).

## Complete A–G Rendered Matrix

All 7 canonical states were exercised via the fixture registry through the real authenticated browser (Playwright/Chromium, normal web security enabled) — **not merely 7 responses to natural-language prompts, but 7 verified reproductions of the intended canonical trust state**, each independently correlated against the backend-intended state with 0 prohibited contradictions found (`rendered-a-g-matrix-results.json`, `backend-render-correlation-results.json`).

| Case | Intended State | Rendered Kind | Result |
| --- | --- | --- | --- |
| A | verified-controlling | verified-controlling | PASS |
| B | related-authority-only | related-authority-only | PASS |
| C | specific-authority-not-found | specific-authority-not-found | PASS (remediation) |
| D | source-failure | source-failure | PASS |
| E | restricted | restricted | PASS |
| F | verified-conflict | verified-conflict | PASS (remediation, via fixture) |
| G | verified-controlling (proportionate) | verified-controlling | PASS |

## Persistence, History Reopen, Hard Refresh

All 7 fixture cases were sent in one conversation. Banner kinds were read before reload, after in-session history reopen, and after a real browser hard refresh — **byte-identical across all three checkpoints for every one of the 7 states** (`persistence-history-reopen-results.json`, `hard-refresh-results.json`).

## Responsive

No horizontal overflow at any of the 5 required viewports for the general conversation state, **and** Case C and Case F were each individually captured at all 5 viewports as specifically required (`responsive-results.json`) — closing the coverage gap the prior PHASE-10A4B rerun left open.

## Production Safety and Security

Only the non-production Preview and `tina-backend-staging.onrender.com` were contacted; the fixture registry is unit-verified to fail closed on a simulated production runtime; no runtime code was touched beyond the reviewed diff; no real taxpayer/client data used. Security scan: no credential, token, cookie, private Preview URL, or infrastructure ID in any committed artifact; all 23 screenshots visually reviewed and confirmed sanitized (durable `context.addInitScript()` redaction, learned from the PHASE-10A4B incident, held up across every navigation/reload/viewport-change this run — no repeat of that defect).

## Test Suite Results

New `tests/phase-10a4c-....test.mjs`: **14 passed, 0 failed, 76 assertions**. Full backend regression suite after commit: **186 run, 1 failed** — the single failure is the pre-existing, already-documented `phase-09zf` self-referential guard (fails for any HEAD that isn't its own commit; unrelated to this task, first documented in the PHASE-10A4B-PRE1 CORS review). A transient run *while changes were still uncommitted* showed 32 failures; all were confirmed (by direct per-suite re-execution) to be self-referential "no disallowed file in the uncommitted diff" guards that cleared immediately upon commit — not functional regressions.

## Findings (P0–P3)

| Severity | Finding | Status |
| --- | --- | --- |
| P0 | None | Clear |
| — | Case C trust-calibration | **RESOLVED** |
| — | Case F semantic anomaly (rendering chain) | **RESOLVED via fixture** |
| — | Trust-adjacent contrast (3.95:1) | **RESOLVED** (6.59–7.06:1) |
| — | Moderate axe findings (heading-order/landmark/region) | **RESOLVED** |
| — | New scrollable-region-focusable finding | **DISCOVERED AND RESOLVED** mid-task |
| P2 | Live-query conflict detection (Step 9 enrichment) | **Out of scope** — separate conflict-engine task required |
| P3 | Visible focus-ring screenshot not captured | Follow-up recommended |
| — | Actual Gemini 2.5 Pro review | **Still not performed** — genuine follow-up required |

## Unresolved Defects

None requiring further work *in this task's scope*. The Step 9 conflict-engine enrichment is a known, separately-scoped, higher-risk item.

## Readiness

- **Technical independent review ready**: Yes.
- **Gemini re-review ready**: Yes — but note this would be the **first genuine** Gemini review of this evidence chain, not a re-review of an actual prior Gemini pass.
- **Phase 10A closure**: NOT authorized — pending both reviews below and, ideally, the separate conflict-engine task.
- **Phase 10B / 10C**: remain BLOCKED.

## Evidence

`evaluation/results/phase-10a4c-trust-calibration-conflict-accessibility-keyboard-fixture-remediation-1.json` (main) and `.../phase-10a4c-trust-calibration-conflict-accessibility-keyboard-fixture-remediation-1/` → 19 JSON evidence files + `screenshots/` (23 images).

## Exact Next Task

1. Mandatory Opus 4.8 independent technical/security/accessibility/governance review of this remediation.
2. A genuine Gemini 2.5 Pro rendered-UX review (first real one for this evidence chain).
3. A separately-scoped conflict-engine remediation task to enrich `pipeline.js`'s Step 9 output so live-query conflicts can satisfy `conflictMetadataIsComplete()`.

## Mandatory Independent Review Prompt (Opus 4.8, low speed)

> Independently review PHASE-10A4C. Verify from the committed evidence (not the report narrative alone): backend and frontend commits, sync `0 0` both repos, `main` untouched; the Case C detector genuinely fires only on disclaiming prose (not hardcoded to one test query) and does not regress ordinary verified/related-authority-only cases; the Case F root-cause claim (pipeline Step 9 pre-existing limitation) is credible and the fixture mechanism is genuinely closed/fail-closed/post-authentication with no new attack surface; the contrast fixes are real (recompute at least one ratio independently); the accessibility result (0/0/0/0) is credible given the evidence; all 7 fixtures reproduce their intended state via the live screenshots, not just the JSON; persistence/reopen/hard-refresh evidence is genuine; the governance disclosure about Gemini non-invocation is accurate and was not glossed over; no secret or private identifier appears in any committed artifact including all 23 screenshots. Confirm whether PASS WITH STRICT RECOMMENDATIONS is justified and whether Gemini review and the separate conflict-engine task may proceed. Do not authorize Phase 10A closure, Phase 10B, or Phase 10C.

## Exact Gemini 2.5 Pro Rendered-UX Review Prompt

> This is the FIRST genuine Gemini rendered-UX review for this evidence chain (all prior "Gemini" attributions in this project's history were self-reviews; no tool could invoke Gemini before now). Review the sanitized screenshots in `evaluation/results/phase-10a4c-trust-calibration-conflict-accessibility-keyboard-fixture-remediation-1/screenshots/` (manifest: `screenshot-manifest.json`). Assess: (1) whether the new Case C amber "Specific issuance not found" banner (screenshots `case-C-*.png`) clearly and sufficiently distinguishes general-authority backing from issuance-specific verification at every viewport, better than the prior green verified-controlling treatment; (2) whether the Case F "Conflicting authorities identified" banner and its two competing source cards are visually clear and not confusable with an ordinary verified answer; (3) whether the responsive layouts (`responsive-*.png`, `case-C-*.png`, `case-F-*.png`) show any visual awkwardness not caught by automated overflow checks; (4) overall whether the calibrated trust-communication design now meets a professional tax-research-tool bar. Do not authorize Phase 10A closure — that rests with Dev Factory governance after this review and the Opus 4.8 technical review are both complete.
