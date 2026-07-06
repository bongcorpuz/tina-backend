# PHASE-09R — Tax Memo Runtime Wiring Integration Design

Status: DESIGN-ONLY — NO LIVE `/ask` WIRING ACTIVATED
Patch: PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1
Base commit: 36db1a7 PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1 add tax memo runtime scaffold
Repository: tina-backend
Branch: feature/source-availability-engine-v1

---

## 1. Executive Summary

This document is the **controlled integration design** for later wiring the
existing `tax_memo` runtime scaffold (Phase 9R scaffold:
`workflow/tax-memo-runtime-orchestrator.js`,
`workflow/tax-memo-runtime-renderer.js`) into TINA's `/ask` flow. **It does not
wire tax_memo into `/ask`, does not modify `ask-handler.js`, `pipeline.js`, or
`server.js`, does not add or modify routes, does not activate workflow
generation, and does not enable any feature flag by default.** It defines the
caller contract, pipeline-output contract, required governance gates,
forbidden runtime changes, and a seven-stage rollout plan that any future
integration patch must follow.

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
- Phase 9H (controlled runtime wiring design/scaffold): COMPLETE
- Phase 9I (requirements request letter schema): COMPLETE
- Phase 9R scaffold (tax memo runtime orchestrator/renderer): COMPLETE
- Phase 9R integration design (this patch): CURRENT
- Latest commit before this patch: `36db1a7 PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1 add tax memo runtime scaffold`
- Memory: INACTIVE
- Production: unchanged

---

## 3. Why Integration Must Be Controlled

Wiring the tax-memo scaffold into a live request path — even behind a feature
flag — introduces risks that this design exists to bound:

- **Premature activation** — a flag flipped on accidentally, or a code path
  that executes regardless of flag state, would generate unreviewed
  professional output from a live user request.
- **Silent scope creep** — once one mode is wired, it becomes tempting to
  wire the other five without the same governance rigor. This design keeps
  the allowed mode list to exactly one: `tax_memo`.
- **Pipeline contract drift** — if the shape of data the `/ask` pipeline
  passes to the orchestrator drifts from the Phase 9C schema's expectations,
  outputs could silently fail governance or, worse, silently degrade.
- **Change-scope creep** — an integration patch that "just adds one small
  route change" or "just touches ask-handler.js a little" defeats the
  purpose of a staged, reviewable rollout.
- **Bypassing governance** — any integration must call the Phase 9G output
  governance gate and the Phase 9H runtime-wiring policy on every single
  execution; this design makes both a hard, structural requirement rather
  than an implementation detail left to chance.

---

## 4. Feature Flag Policy

Two flags govern any future integration, **both default OFF everywhere**:

- **Primary flag:** `TINA_ENABLE_PROFESSIONAL_WORKFLOWS` — the master switch
  for the whole Professional Workflow Co-Pilot feature area (defined in
  Phase 9H).
- **Mode flag:** `TINA_ENABLE_WORKFLOW_TAX_MEMO` — the tax-memo-specific
  switch defined in Phase 9H as an optional per-mode flag, now designated as
  required for tax-memo integration specifically.

Both flags share the same policy: `defaultState`, `productionDefault`,
`stagingDefault`, `localDefault` all `"off"`; `requiresExplicitEnvEnablement:
true`; `mustNotBeEnabledByDefault: true`. **This integration-policy module
itself never reads `process.env`** — flag state is always supplied
explicitly by the (future) caller, never inferred.

---

## 5. Integration Target and Allowed Mode

**Target route:** `/ask` (the only route this design contemplates).

**Allowed mode:** `tax_memo` only — the sole mode a future integration patch
may wire into `/ask`.

---

## 6. Blocked Modes

`bir_reply_protest_draft`, `audit_defense_matrix`, `client_advisory`,
`compliance_checklist`, `requirements_request_letter` remain **future-only**.
No active runtime path is designed for any of them here; they may only be
considered after `tax_memo` integration is proven safe through the full
rollout sequence (Section 11) and a separate, explicitly approved patch.

---

## 7. Required Caller Fields

A future integration call into the orchestrator must supply: `modeId`,
`runtimeOptions`, `userExplicitApprovalForRuntimeWiring`,
`featureFlagEnabled`, `governanceGatePassed`,
`prohibitedClaimDetectionPassed`. These mirror the Phase 9R scaffold's own
`validateTaxMemoRuntimeOptions()` contract — no new caller-facing concept is
introduced.

---

## 8. Required Pipeline Output Fields

The `/ask` pipeline, when it eventually calls the orchestrator, must supply a
pipeline-output object containing: `facts`, `issues`, `taxpayerType`,
`taxPeriod`, `intendedAudience`, `sourceCards`, `missingFacts`, `assumptions`,
`humanReviewNotice`. Recommended optional future fields: `analysisNotes`,
`applicableAuthorities`, `conclusion`, `risksLimitations`, `documentsNeeded`.
This is the same shape the Phase 9R scaffold's
`buildTaxMemoDraftFromRuntimeInput()` already consumes — the pipeline's job
is to populate it from whatever retrieval/classification it already performs,
not to introduce a new data model.

---

## 9. Required Governance Gates

Every future integrated execution must pass all of:
`phase_09h_runtime_policy_pass`, `phase_09g_output_governance_gate_pass`,
`phase_09r_orchestrator_validation_pass`, `phase_09r_renderer_validation_pass`,
`selected_mode_tax_memo_only`, `source_cards_nonempty`,
`missing_facts_present`, `assumptions_present`, `human_review_notice_present`,
`no_prohibited_claims`, `no_final_filing_claim`, `no_automatic_submission`,
`no_persistence`, `no_memory`, `no_external_search`, `no_third_party_egress`,
`no_production_enablement`.

---

## 10. Forbidden Runtime Changes (In This Patch and Enforced By Design)

`enabling_feature_flag_by_default`, `adding_new_route`,
`modifying_server_in_this_patch`, `modifying_ask_handler_in_this_patch`,
`modifying_pipeline_in_this_patch`, `modifying_frontend_in_this_patch`,
`enabling_memory`, `adding_persistence`, `adding_client_matter_storage`,
`adding_generated_work_product_storage`,
`calling_openai_from_integration_policy`,
`calling_supabase_from_integration_policy`,
`calling_google_drive_from_integration_policy`, `calling_external_search`,
`calling_n8n`, `calling_firecrawl`, `calling_crawlee`,
`implementing_phase_10`, `implementing_phase_11`, `production_enablement`.

---

## 11. Rollout Stages

1. **`design_only_current_patch`** ← **this patch is here**
2. `local_unit_integration_with_no_route_change` — wire the orchestrator into
   a local pipeline helper, with no `/ask` route change and the flags still
   off.
3. `ask_handler_guarded_integration_feature_flag_off` — add the guarded call
   inside `ask-handler.js`/`pipeline.js`, still gated behind both flags
   defaulting off.
4. `staging_flag_on_tax_memo_only` — flip both flags on in staging only, for
   `tax_memo` only.
5. `staging_smoke_evidence` — live staging smoke test with recorded evidence
   (mirroring the Phase 8S staging-smoke pattern used throughout this
   repository).
6. `closure_gate` — a final closure gate patch confirming all prior stages
   passed and all governance/regression tests are green.
7. `production_consideration_only_after_explicit_approval` — production
   enablement is considered **only** after the user explicitly approves it;
   this design does not authorize it.

**Current stage: `design_only_current_patch`.** No later stage is
implemented by this patch.

---

## 12. Later Allowed / Forbidden Files

**Later-allowed (future-only, not this patch):** `ask-handler.js`,
`pipeline.js`, `workflow/tax-memo-runtime-orchestrator.js`,
`workflow/tax-memo-runtime-renderer.js`,
`tests/future-tax-memo-runtime-integration-test-file`.

**Later-forbidden (unless separately approved):** `server.js` (unless a new
route is separately approved), DB/migration files (unless persistence is
separately approved), env files, frontend files (unless UI wiring is
separately approved), n8n files, Firecrawl/Crawlee files.

---

## 13. Privacy and Security Boundary

No persistent client/matter storage. No generated work-product persistence.
No memory activation. No third-party egress. No n8n/Firecrawl/Crawlee. No
production enablement by this or any Phase 9R-adjacent design patch.

---

## 14. Retrieval Boundary

Existing retrieval remains entirely the `/ask` pipeline's responsibility, now
and in any future integration — this design and the underlying scaffold
perform no retrieval themselves. No live web search. No new authority
ingestion.

---

## 15. Authority Boundary

No fabricated citations. No authorities added beyond what the pipeline
provides. Controlling-authority prioritization and related-vs-controlling
disclosure remain the retrieval/pipeline layer's responsibility. Currentness-
unknown disclosed. No guaranteed tax outcome.

---

## 16. Phase 10 / Phase 11 Boundary

Phase 10 (Authority Search and Research Engine) and Phase 11 (retrieval
speed/quality optimization) are **not implemented here** and are not
implemented by any future integration patch under this policy.

---

## 17. Future Patch Plan

- **PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1** — recommended next task;
  corresponds to preparing rollout stages 2–5 (local integration through
  staging smoke evidence) under continued strict governance.
- **PHASE-09-GATE-CLOSURE-1** — final Phase 9 closure gate, after tax-memo
  integration (and any other approved mode work) is complete.

---

## 18. Strict Recommendations

1. Do not wire `tax_memo` into `/ask` in this or any design-only patch.
2. Keep both feature flags OFF by default in every environment.
3. Any future integration patch must pass every gate in Section 9 on every
   execution, not just at design time.
4. Do not extend integration design or wiring to any of the five blocked
   modes without a separate, explicitly approved patch.
5. Do not implement Phase 10 or Phase 11 inside any integration patch.
6. Treat rollout stages 2–7 as sequential and gated — do not skip stages.
7. Production enablement requires explicit user approval and is out of scope
   for every stage documented here except stage 7, and even then only after
   that approval is given.
