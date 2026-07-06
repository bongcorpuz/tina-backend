# PHASE-09H — Controlled Runtime Wiring Design

Status: DESIGN/SCAFFOLD-ONLY — NO RUNTIME WIRING ACTIVATED
Patch: PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1
Base commit: b1d20af PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1 add workflow output governance gate
Repository: tina-backend
Branch: feature/source-availability-engine-v1

---

## 1. Executive Summary

Phase 9H is a **controlled runtime-wiring design/scaffold only**. It defines
the feature-flag policy, allowed/blocked first-runtime modes, runtime
boundaries, required gates, and prohibited actions that will govern any
future wiring of a Phase 9 professional workflow mode into TINA runtime. **It
does not activate workflow generation, does not change live `/ask` behavior,
does not add routes, and does not import any workflow schema into
ask-handler.js, pipeline.js, server.js, routes, or the frontend.** All
retrieval, authority, security, privacy, and governance boundaries
established in Phase 9A–9G remain untouched and unbypassed.

---

## 2. Current State

- Phase 8: CLOSED
- Phase 8S: CLOSED
- 08X: CLOSED
- Phase 9A (design): COMPLETE
- Phase 9B (workflow mode registry): COMPLETE
- Phase 9C (tax memo schema): COMPLETE
- Phase 9D (audit defense matrix schema): COMPLETE
- Phase 9E (BIR reply/protest draft schema): COMPLETE
- Phase 9F (client advisory / compliance checklist schemas): COMPLETE
- Phase 9G (workflow output governance gate): COMPLETE
- Latest commit before this patch: `b1d20af PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1 add workflow output governance gate`
- Memory: INACTIVE
- Production: unchanged

---

## 3. Why Runtime Wiring Must Be Controlled

Wiring a Phase 9 schema into the live `/ask` path without controls risks:

- **Professional output overclaim** — a draft being presented or perceived as
  final professional advice.
- **Unsupported citations** — authority references that outrun what retrieval
  actually found.
- **Final filing misuse** — a user (or downstream automation) treating a
  drafted BIR reply, protest, or memo as an actual filing.
- **Missing facts silently assumed** — gaps in user-supplied facts papered
  over instead of disclosed.
- **Client confidentiality** — any accidental persistence of client/matter
  content beyond the single request/response.
- **Persistence/logging leakage** — generated work-product or client facts
  ending up in logs, memory, or a database without an approved retention
  design.
- **Source-card gaps** — professional output rendered without the source
  cards that ground its authority claims.
- **Phase 10/11 boundary leakage** — runtime wiring accidentally reaching for
  live web search, new authority ingestion, or retrieval-optimization
  behavior that belongs to later, unapproved phases.

Every one of these risks is addressed by a corresponding boundary or gate in
this design (Sections 4, 7, 8, 9, 10, 11).

---

## 4. Feature Flag Policy

**Primary flag:** `TINA_ENABLE_PROFESSIONAL_WORKFLOWS`

Default: **OFF everywhere** — `defaultState`, `productionDefault`,
`stagingDefault`, and `localDefault` are all `"off"`. Enabling it requires
explicit environment configuration (`requiresExplicitEnvEnablement: true`) and
is not something any code path in this patch can flip.

The primary flag's policy additionally requires (all `true`):
`requiresGovernanceGate`, `requiresSourceCards`,
`requiresHumanReviewNotice`, `requiresMissingFactsDisclosure`,
`requiresAssumptionsDisclosure`, `noMemoryActivation`,
`noGeneratedWorkProductPersistence`, `noClientMatterPersistence`,
`noThirdPartyEgress`, `noExternalSearch`, `noN8nFirecrawlCrawlee`.

**Optional future per-mode flags** (design-only, all default `"off"`):
`TINA_ENABLE_WORKFLOW_TAX_MEMO`, `TINA_ENABLE_WORKFLOW_BIR_REPLY`,
`TINA_ENABLE_WORKFLOW_AUDIT_DEFENSE_MATRIX`,
`TINA_ENABLE_WORKFLOW_CLIENT_ADVISORY`,
`TINA_ENABLE_WORKFLOW_COMPLIANCE_CHECKLIST`,
`TINA_ENABLE_WORKFLOW_REQUIREMENTS_REQUEST_LETTER`.

---

## 5. First Runtime Candidate

**Recommended: `tax_memo`.**

Reasons:

- Phase 9C already gave it a dedicated, fully-governed schema.
- It is a lower-risk professional format than BIR/protest or audit-defense
  content — a memo is inherently framed as internal analysis, not a filing.
- Its output shape (facts, issues, authorities, analysis, conclusion, risks,
  missing facts, documents needed, source cards) is the cleanest baseline for
  proving the runtime-wiring pattern end to end.
- Phase 9G's governance gate already covers it fully.

**Blocked first-runtime modes** (see `WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES`):

- `bir_reply_protest_draft` — higher-risk tax-controversy content; a
  premature draft here carries more real-world consequence than a memo.
- `audit_defense_matrix` — higher-risk audit-defense content, same rationale.
- `client_advisory` — should follow only after `tax_memo` runtime wiring is
  proven safe in practice.
- `compliance_checklist` — same as `client_advisory`.
- `requirements_request_letter` — **no dedicated schema exists yet** (it is
  registry-only/pending); it cannot be runtime-wired until a dedicated schema
  exists or an explicit registry-only exception is separately approved.

---

## 6. Later Runtime Wiring Shape (Design Only — Not Implemented)

```
User query
  → existing classification/retrieval (unchanged)
  → workflow-mode detection or explicit user-selected mode
  → selected workflow schema (from the dedicated Phase 9 schema file)
  → existing source cards (unchanged retrieval/source-card mechanism)
  → draft output assembly (populates the schema's required fields)
  → workflow-output-governance-gate (validateWorkflowOutputGovernance)
  → response to user, including the human-review notice
```

No step in this flow is implemented by this patch. This is the intended shape
for a future patch (see Section 13) operating strictly behind the primary
feature flag, defaulting off.

---

## 7. Required Runtime Gates

Before any future runtime wiring may be enabled, all of the following must
pass: `phase_09a_design_pass`, `phase_09b_registry_pass`,
`phase_09c_tax_memo_schema_pass`, `phase_09g_governance_gate_pass`,
`selected_mode_has_dedicated_schema`, `governance_output_validation_pass`,
`source_cards_present`, `missing_facts_present`, `assumptions_present`,
`human_review_notice_present`, `prohibited_claim_detection_pass`,
`no_runtime_persistence`, `feature_flag_default_off`,
`regression_tests_pass`, `user_explicit_approval_for_runtime_wiring`.

---

## 8. Output Requirements

Every workflow output — now and in any future runtime-wired form — must
include: `sourceCards`, `missingFacts`, `assumptions`, `humanReviewNotice`,
`metadata` with `finalFiling: false` and `automaticSubmission: false`, and no
detected prohibited claims (per Phase 9G's
`validateWorkflowOutputGovernance()`).

---

## 9. Privacy and Storage Boundary

No memory activation. No generated work-product persistence. No
client/matter persistence. No third-party egress. No production enablement by
this or any Phase 9H-adjacent patch.

---

## 10. Retrieval Boundary

Existing retrieval only. No live web search. No new authority ingestion. No
n8n/Firecrawl/Crawlee calls of any kind.

---

## 11. Phase 10/11 Boundary

Phase 10 (Authority Search and Research Engine) and Phase 11 (retrieval
speed/quality optimization) are **not implemented here** and are not
implemented by any future runtime-wiring patch under this policy. Runtime
wiring consumes the existing retrieval pipeline exactly as it exists today.

---

## 12. Requirements Request Letter Gap

`requirements_request_letter` remains **registry-only / pending dedicated
schema**. It must not be runtime-wired until a dedicated schema exists (see
optional future patch below) or an explicit registry-only exception is
separately approved by the user. This design does not fabricate or imply a
dedicated schema for this mode.

Optional future patch: **PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1**.

---

## 13. Future Runtime Patch Recommendation

Two reasonable next steps exist after Phase 9H:

- **Option A — PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1**, if
  the user wants full six-mode schema completeness before any runtime wiring
  begins.
- **Option B — PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1**, if the user
  wants to begin controlled runtime implementation for `tax_memo` behind the
  feature flag (still defaulting off).

This patch's fixture records **PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1**
as the next task, with the strict note that the user may choose optional
Phase 9I first.

---

## 14. Strict Recommendations

1. Do not wire runtime in Phase 9H — this patch is design/scaffold only.
2. Keep the feature flag OFF by default in every environment.
3. Runtime wiring should start with `tax_memo` only.
4. Do not wire BIR/protest or audit-defense modes first.
5. Do not enable memory or persistence.
6. Do not add new routes.
7. Do not implement Phase 10 or Phase 11 inside any runtime-wiring patch.
8. Require the Phase 9G governance gate to pass before any workflow output is
   ever returned to a user.
