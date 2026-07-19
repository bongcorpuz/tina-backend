# PHASE-10A14-R12 — Semantic Filing-Directive Coverage, NOT_APPLICABLE History Consistency & Evidence-Manifest Hygiene Remediation 1

**Executor:** Claude Code — Opus 4.8 (low speed) · branch `feature/source-availability-engine-v1`
**Starting HEAD:** `b4575ba…` · sync `0 0` · **R12 runtime:** `d91b697…` (staging auto-deployed, non-production)
**Decision (self-assessed):** **PASS** — formal decision belongs to the mandatory independent reviewer.

## Findings
| ID | Disposition |
|---|---|
| **P1-R11-IR-001** — detector missed recommendation/advice/urgency/inverted/passive/permission-pressure directives | **CLOSED** — structured classification; pre-fix **25 misses → 0**. |
| **P1-R11-IR-002** — live NOT_APPLICABLE API/history inconsistency | **CLOSED** — domain-boundary responses now **PERSISTED** with explicit `persistenceStatus`; `apiEqualsHistory` false → true. |
| **P3-R11-IR-003** — manifests included self-referential hash entries | **CORRECTED prospectively** — R12 manifests exclude themselves (0 self-entries); R11 historical manifests untouched. |

## Immutable pre-fix evidence (committed BEFORE remediation)
A frozen **84-probe** campaign (38 R11-inherited + 46 R12 extension) run against the unchanged R11 runtime
(`90d70fe`), committed at **`70790c3`** (COMMIT 2, strict ancestor of the fix), preserving **25 directive
misses** and reproducing **P1-R11-IR-002** (P2-DOMAIN-BOUNDARY `apiEqualsHistory=false`, empty history).

## Remediation
- `services/answer-support-validator.js`: **structured current-user directive classification** — filing action +
  relative time + present application (directive force / recommendation-advice / sentence-initial or post-comma
  imperative / Tagalog filing verb / passive obligation / penalty pressure / affirmative assertion), suppressed
  only by genuine counterfactual/hypothetical/historical/negated/general-advisory scope (bare would/should/can/
  may/if no longer auto-suppress). New relative-time coverage (before midnight/without delay/within the day/at
  once/right away/close of business/this morning/tonight; kaagad/bago maghatinggabi/sa loob ng araw; tapusin).
- `ask-handler.js`: domain-boundary NOT_APPLICABLE responses **persist** via `saveConversationTurn` when a
  `conversationId` is present and declare an explicit `persistenceStatus` (`PERSISTED` /
  `NOT_PERSISTED_NO_CONVERSATION`) in ordinary application behavior (WS8 contract).

## Post-fix rerun (deployed R12 `d91b697`)
- Deterministic: **0 misses, 0 false-positives**; pre/post reconcile **1:1** (80 fixtures).
- Live campaign (20 probes): **apiUnsafe=0, historyUnsafe=0, API==history for all, rejected exposed=0**;
  domain-boundary responses **PERSISTED** with `apiEqualsHistory=true`.
- Focused `phase-10a14-r12` **47/0**; R11 39/0, R10 22/0, R9 15/0; deterministic all-26 **9/17/0**.

## Governance & scope
WS15 self-assessed **SUPERSEDED BY COMPLETE R11/R12 PROSPECTIVE EVIDENCE** (reviewer decides); original R10
payload not recovered. Manifests self-exclude (WS13). Deterministic **202/0 ×2** (clean tree); staging **7/0 ×2**.
No model/prompt/filing-rationale/corpus/production change; protected paths preserved; port 5173 untouched;
sync `0 0`. **P1-R9-IR-002 reserved for E2; P2-R9-IR-003 bounded.**

## Next task
PHASE-10A14-R12-…-INDEPENDENT-REVIEW-1. After an independent R12 PASS → PHASE-10A14-E2. Phase 10A remains OPEN.
