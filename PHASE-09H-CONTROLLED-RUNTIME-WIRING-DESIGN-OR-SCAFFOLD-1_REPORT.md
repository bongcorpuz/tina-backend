# PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1

## 2. Purpose

Define — but do not implement — how Phase 9 professional workflow modes will
later be safely wired into TINA runtime behind a feature flag, while
preserving all existing retrieval, authority, security, privacy, and
governance boundaries established in Phase 9A–9G. This patch activates no
runtime workflow generation, changes no live `/ask` behavior, adds no routes,
and does not import any workflow schema into ask-handler.js, pipeline.js,
server.js, routes, or the frontend.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `b1d20af PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1 add workflow output governance gate`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A–9G COMPLETE; memory
  INACTIVE; production unchanged.
- All seven existing Phase 9 workflow files
  (`workflow-mode-registry.js`, `tax-memo-schema.js`,
  `audit-defense-matrix-schema.js`, `bir-reply-draft-schema.js`,
  `client-advisory-schema.js`, `compliance-checklist-schema.js`,
  `workflow-output-governance-gate.js`) were **not** modified by this patch —
  the new policy module only imports `normalizeWorkflowModeId` from the
  registry.

## 4. Files changed

- `workflow/workflow-runtime-wiring-policy.js` (new)
- `docs/phase-09/PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN.md` (new)
- `evaluation/fixtures/phase-09h-controlled-runtime-wiring-design-or-scaffold-1.fixture.json` (new)
- `tests/phase-09h-controlled-runtime-wiring-design-or-scaffold-1.test.mjs` (new)
- `PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended; also re-wrapped one pre-existing
  line from the Phase 9G entry whose manual line-wrap happened to place the
  word "guaranteed" on a physical line without an adjacent negation word,
  which was tripping a pre-existing, unrelated Phase 7B regression gate's
  naive per-line prohibited-phrase scan — see Section 20)

## 5. Non-runtime declaration

No runtime wiring. No route/server/pipeline/ask-handler changes. No security
helper, classifier, retrieval, source-card, source-availability, or
authority-restoration engine changes. No package/env/DB/frontend/n8n/
Firecrawl/Crawlee files changed. No deployment. No memory activation. No
client/matter persistence. No generated work-product persistence. No external
search. No workflow schema imported into any runtime file. The policy module
imports only `normalizeWorkflowModeId` from `workflow-mode-registry.js`, has
no network calls, no filesystem access, no `process.env` reads, no
`Date.now()`/randomness, and no side effects — verified by the accompanying
test's static source-scan and import-allowlist check.

## 6. Runtime wiring policy exports

`PHASE_09H_WORKFLOW_RUNTIME_WIRING_POLICY_VERSION`,
`WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS`, `WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES`,
`WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES`, `WORKFLOW_RUNTIME_WIRING_BOUNDARIES`,
`WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES`,
`WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS`,
`WORKFLOW_RUNTIME_WIRING_LATER_ALLOWED_FILES`,
`WORKFLOW_RUNTIME_WIRING_LATER_FORBIDDEN_FILES`,
`createWorkflowRuntimeWiringPolicyResult()`, `getWorkflowRuntimeWiringPolicy()`,
`getWorkflowRuntimeFeatureFlags()`, `getWorkflowRuntimeAllowedModes()`,
`getWorkflowRuntimeBlockedModes()`, `getWorkflowRuntimeRequiredGates()`,
`getWorkflowRuntimeBoundaries()`,
`validateWorkflowRuntimeWiringRequest(request)`,
`validateWorkflowRuntimeWiringPolicy()`, `normalizeRuntimeWiringModeId(modeId)`.
All accessor functions return defensive deep-cloned copies; mutating a
returned value never mutates the internal policy (verified by test).

## 7. Feature flag policy

**Primary flag:** `TINA_ENABLE_PROFESSIONAL_WORKFLOWS` — `defaultState`,
`productionDefault`, `stagingDefault`, `localDefault` all `"off"`;
`requiresExplicitEnvEnablement`, `requiresGovernanceGate`,
`requiresSourceCards`, `requiresHumanReviewNotice`,
`requiresMissingFactsDisclosure`, `requiresAssumptionsDisclosure`,
`noMemoryActivation`, `noGeneratedWorkProductPersistence`,
`noClientMatterPersistence`, `noThirdPartyEgress`, `noExternalSearch`,
`noN8nFirecrawlCrawlee` all `true`.

**Optional future per-mode flags** (design-only, all default `"off"`):
`TINA_ENABLE_WORKFLOW_TAX_MEMO`, `TINA_ENABLE_WORKFLOW_BIR_REPLY`,
`TINA_ENABLE_WORKFLOW_AUDIT_DEFENSE_MATRIX`,
`TINA_ENABLE_WORKFLOW_CLIENT_ADVISORY`,
`TINA_ENABLE_WORKFLOW_COMPLIANCE_CHECKLIST`,
`TINA_ENABLE_WORKFLOW_REQUIREMENTS_REQUEST_LETTER`.

## 8. Allowed first runtime mode

**`tax_memo`** — dedicated schema exists (Phase 9C); lower risk than BIR
protest or audit defense; clean professional format; full Phase 9G governance
gate coverage exists.

## 9. Blocked modes

`bir_reply_protest_draft`, `audit_defense_matrix` (higher-risk controversy/
audit-defense content, not the first runtime target), `client_advisory`,
`compliance_checklist` (should follow only after `tax_memo` runtime wiring is
proven), `requirements_request_letter` (no dedicated schema exists yet —
registry-only/pending; blocked until a dedicated schema exists or an explicit
registry-only exception is separately approved).

## 10. Required runtime gates

`phase_09a_design_pass`, `phase_09b_registry_pass`,
`phase_09c_tax_memo_schema_pass`, `phase_09g_governance_gate_pass`,
`selected_mode_has_dedicated_schema`, `governance_output_validation_pass`,
`source_cards_present`, `missing_facts_present`, `assumptions_present`,
`human_review_notice_present`, `prohibited_claim_detection_pass`,
`no_runtime_persistence`, `feature_flag_default_off`,
`regression_tests_pass`, `user_explicit_approval_for_runtime_wiring`.

## 11. Prohibited actions

`enabling_feature_flag_by_default`, `production_enablement`,
`modifying_ask_handler_in_phase_09h`, `modifying_pipeline_in_phase_09h`,
`modifying_server_in_phase_09h`, `adding_routes_in_phase_09h`,
`memory_activation`, `client_matter_persistence`,
`generated_work_product_persistence`, `external_search`, `authority_intake`,
`n8n_call`, `firecrawl_call`, `crawlee_call`, `third_party_egress`,
`automatic_filing`, `final_filing_claim`, `bypassing_governance_gate`,
`bypassing_source_cards`, `bypassing_missing_fact_disclosure`,
`bypassing_human_review_notice`.

## 12. Design document summary

`docs/phase-09/PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN.md` states: Phase
9H is design/scaffold only and activates no workflow generation; the primary
feature flag defaults off everywhere; `tax_memo` is recommended as the first
runtime candidate with BIR/protest and audit-defense modes explicitly
blocked as first-runtime targets; no memory/persistence/egress; no live
web/search/intake/n8n/Firecrawl/Crawlee; Phase 10/11 are not implemented;
the `requirements_request_letter` schema gap is acknowledged with
PHASE-09I as an optional future patch; the recommended next task is
PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1, with the strict note that the
user may choose the optional Phase 9I path first.

## 13. Retrieval boundary

Existing retrieval only; no live web search; no new authority ingestion; no
unapproved sources; if authority unavailable, disclose.

## 14. Authority boundary

No fabricated citations; controlling authority prioritized; related authority
disclosed as related; currentness-unknown disclosed; authority-type label
required; no guaranteed BIR/tax/audit/compliance outcome.

## 15. Source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl`/
`canonicalSourceId` not required. Future Phase 10 (not implemented here):
`officialUrl` primary, `archiveUrl` secondary, `canonicalSourceId` internal
source of truth.

## 16. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence;
no memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 17. Phase 10 boundary

No authority search; no source intake; no officialUrl/archive/
canonicalSourceId implementation; no n8n/Firecrawl/Crawlee; no currentness
engine implementation.

## 18. Phase 11 boundary

No BM25; no re-ranking; no query cache; no source-card hydration cache; no
latency-optimization implementation.

## 19. Requirements Request Letter gap

`requirements_request_letter` remains registry-only/pending dedicated
schema; it is not eligible for runtime wiring until a dedicated schema
exists or an explicit approved exception is granted. Optional future patch:
`PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1`.

## 20. Validation summary

```
node tests/phase-09h-controlled-runtime-wiring-design-or-scaffold-1.test.mjs
  → PASS / 69 passed / 0 failed / 172 assertions

node tests/phase-09g-workflow-output-governance-gate-1.test.mjs
  → PASS / 73 passed / 0 failed / 213 assertions

node tests/phase-09f-client-advisory-checklist-scaffold-1.test.mjs
  → PASS / 75 passed / 0 failed / 404 assertions

node tests/phase-09e-bir-reply-draft-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 243 assertions

node tests/phase-09d-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 203 assertions

node tests/phase-09c-tax-memo-schema-scaffold-1.test.mjs
  → PASS / 47 passed / 0 failed / 149 assertions

node tests/phase-09b-workflow-mode-registry-scaffold-1.test.mjs
  → PASS / 45 passed / 0 failed / 363 assertions

node tests/phase-09a-professional-workflow-copilot-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 75 assertions

node tests/patch-08s-followup-index-secret-header-auth-staging-smoke-1.test.mjs
  → PASS / 23 passed / 0 failed / 92 assertions

node tests/patch-08x-chat-context-carryover-final-gate-1.test.mjs
  → PASS / 17 passed / 0 failed / 127 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
  → PASS / 22 passed / 0 failed / 203 assertions

npm run guard:files
  → PASS: No protected files modified

npm test
  → GATE PASSED / 153 test suites run / 0 failed (10 syntax checks, 0 failed)
```

Note: the first full-suite run surfaced one pre-existing failure in
`tests/patch-07b-clarification-final-gate-2-route-helper-workstream-closure.test.mjs`
("no prohibited output phrases appear as affirmative recommendations"),
caused by a manual line-wrap in the Phase 9G `CURRENT_STATE.md` entry that
happened to place the word "guaranteed" on a physical line without an
adjacent negation word. That gate does a naive per-line, not per-sentence,
scan of `CURRENT_STATE.md` combined with its own report file. The fix
(re-wrapping that one paragraph so "no" and "guaranteed" share a line, with
no change in meaning) is included in this patch's `CURRENT_STATE.md` diff
since `knowledge/CURRENT_STATE.md` is an allowed file for Phase 9H. All
listed `npm test` figures above are from the run **after** that fix.

## 21. Decision

**PHASE 09H CONTROLLED RUNTIME WIRING DESIGN PASS WITH STRICT RECOMMENDATIONS**

## 22. Strict recommendations

1. Do not wire runtime in Phase 9H — this patch is design/scaffold only.
2. Keep the feature flag OFF by default in every environment.
3. Runtime wiring should start with `tax_memo` only.
4. Do not wire BIR/protest or audit-defense modes first.
5. Do not enable memory or persistence.
6. Do not add new routes.
7. Do not implement Phase 10 or Phase 11 inside any runtime-wiring patch.
8. Require the Phase 9G governance gate to pass before any workflow output is
   ever returned to a user.
9. Require `userExplicitApprovalForRuntimeWiring: true` before any actual
   future runtime-wiring request is honored — this patch's own policy
   validator enforces that as a hard failure otherwise.

## 23. Next task

**PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1** — controlled runtime
implementation for `tax_memo` behind the feature flag (still defaulting off).

## 24. Optional alternative next task

**PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1** — if the user
wants full six-mode schema completeness before any runtime wiring begins.
