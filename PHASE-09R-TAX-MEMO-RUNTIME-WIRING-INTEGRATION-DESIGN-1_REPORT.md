# PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1 — Report

## 1. Patch name

PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1

## 2. Purpose

Create the controlled integration design for later wiring the existing
`tax_memo` runtime scaffold (`workflow/tax-memo-runtime-orchestrator.js`,
`workflow/tax-memo-runtime-renderer.js`) into TINA's `/ask` flow behind
strict feature flags and governance gates. This patch designs, documents,
and tests the future integration boundary only — it does not wire
`tax_memo` into `/ask`, does not modify `ask-handler.js`, `pipeline.js`,
`server.js`, or any route, does not activate workflow generation, and does
not enable any feature flag by default.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `36db1a7 PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1 add tax memo runtime scaffold`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R
  scaffold COMPLETE; memory INACTIVE; production unchanged.
- All eleven existing Phase 9 workflow files were **not** modified by this
  patch; the new integration-policy module imports only from
  `workflow-runtime-wiring-policy.js`, `tax-memo-runtime-orchestrator.js`,
  `tax-memo-runtime-renderer.js`, and `workflow-output-governance-gate.js`.

## 4. Files changed

- `workflow/tax-memo-runtime-integration-policy.js` (new)
- `docs/phase-09/PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN.md` (new)
- `evaluation/fixtures/phase-09r-tax-memo-runtime-wiring-integration-design-1.fixture.json` (new)
- `tests/phase-09r-tax-memo-runtime-wiring-integration-design-1.test.mjs` (new)
- `PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No route/server/pipeline/ask-handler changes. No package/env/DB/frontend
files changed. No deployment. No memory activation. No client/matter
persistence. No generated work-product persistence. No external search. No
workflow generation activated. No feature flag enabled by default. The
integration-policy module calls no AI model, performs no retrieval, makes no
network calls, reads no filesystem, reads no `process.env`, uses no
`Date.now()`/randomness, and has no side effects — verified by the
accompanying test's static source-scan and import-allowlist checks.

## 6. Orchestrator/renderer/gate/policy exports referenced (unchanged)

This patch does not add new orchestrator/renderer/gate/policy exports — it
consumes the existing Phase 9G/9H/9R exports as-is via its own self-check
(`validateTaxMemoIntegrationPolicy()` calls `validateWorkflowRuntimeWiringPolicy()`,
`validateTaxMemoRuntimeScaffold()`, `validateTaxMemoRuntimeRenderer()`, and
`validateWorkflowGovernanceGate()`).

## 7. Integration policy exports (new)

`PHASE_09R_TAX_MEMO_RUNTIME_INTEGRATION_POLICY_VERSION`,
`TAX_MEMO_INTEGRATION_TARGET_ROUTE`, `TAX_MEMO_INTEGRATION_ALLOWED_MODE`,
`TAX_MEMO_INTEGRATION_BLOCKED_MODES`, `TAX_MEMO_INTEGRATION_FEATURE_FLAGS`,
`TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS`,
`TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS`,
`TAX_MEMO_INTEGRATION_OPTIONAL_FUTURE_PIPELINE_FIELDS`,
`TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES`,
`TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES`,
`TAX_MEMO_INTEGRATION_LATER_ALLOWED_FILES`,
`TAX_MEMO_INTEGRATION_LATER_FORBIDDEN_FILES`,
`TAX_MEMO_INTEGRATION_ROLLOUT_STAGES`, `TAX_MEMO_INTEGRATION_CURRENT_STAGE`,
`createTaxMemoIntegrationPolicyResult()`,
`getTaxMemoRuntimeIntegrationPolicy()`, `getTaxMemoIntegrationFeatureFlags()`,
`getTaxMemoIntegrationRequiredCallerFields()`,
`getTaxMemoIntegrationRequiredPipelineOutputFields()`,
`getTaxMemoIntegrationRequiredGovernanceGates()`,
`getTaxMemoIntegrationRolloutStages()`,
`validateTaxMemoIntegrationCandidate(candidate)`,
`validateTaxMemoIntegrationPolicy()`. All accessor functions return
defensive deep-cloned copies; mutating a returned value never mutates the
internal policy (verified by test).

## 8. Runtime/route/server/pipeline changes

None. `ask-handler.js`, `pipeline.js`, `server.js`, and all route files
remain untouched.

## 9. Governance gates

Every future integrated execution will be required to pass:
`phase_09h_runtime_policy_pass`, `phase_09g_output_governance_gate_pass`,
`phase_09r_orchestrator_validation_pass`, `phase_09r_renderer_validation_pass`,
`selected_mode_tax_memo_only`, `source_cards_nonempty`,
`missing_facts_present`, `assumptions_present`, `human_review_notice_present`,
`no_prohibited_claims`, `no_final_filing_claim`, `no_automatic_submission`,
`no_persistence`, `no_memory`, `no_external_search`, `no_third_party_egress`,
`no_production_enablement`.

## 10. Feature-flag/rollout summary

Both `TINA_ENABLE_PROFESSIONAL_WORKFLOWS` (primary) and
`TINA_ENABLE_WORKFLOW_TAX_MEMO` (mode) default OFF everywhere; the
integration-policy module never reads `process.env`. Seven-stage rollout:
`design_only_current_patch` (this patch) →
`local_unit_integration_with_no_route_change` →
`ask_handler_guarded_integration_feature_flag_off` →
`staging_flag_on_tax_memo_only` → `staging_smoke_evidence` → `closure_gate` →
`production_consideration_only_after_explicit_approval`. Current stage:
`design_only_current_patch`.

## 11. Blocked modes

`bir_reply_protest_draft`, `audit_defense_matrix`, `client_advisory`,
`compliance_checklist`, `requirements_request_letter` remain future-only —
no active runtime integration path is designed for any of them here.

## 12. Validation summary

```
node tests/phase-09r-tax-memo-runtime-wiring-integration-design-1.test.mjs
  → PASS / 54 passed / 0 failed / 202 assertions

node tests/phase-09r-tax-memo-runtime-wiring-scaffold-1.test.mjs
  → PASS / 113 passed / 0 failed / 212 assertions

node tests/phase-09i-requirements-request-letter-schema-scaffold-1.test.mjs
  → PASS / 56 passed / 0 failed / 333 assertions

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
  → GATE PASSED / 156 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 13. Decision

**PHASE 09R TAX MEMO RUNTIME WIRING INTEGRATION DESIGN PASS WITH STRICT RECOMMENDATIONS**

## 14. Strict recommendations

1. Do not wire `tax_memo` into `/ask` in this or any future design-only
   patch — only an explicitly scoped integration patch may do so, and only
   after passing through every rollout stage in order.
2. Keep both `TINA_ENABLE_PROFESSIONAL_WORKFLOWS` and
   `TINA_ENABLE_WORKFLOW_TAX_MEMO` OFF by default in every environment.
3. Any future integration patch must call every required governance gate
   (Section 9) on every execution, not merely validate them at design time.
4. Do not extend integration design or wiring to any of the five blocked
   modes without a separate, explicitly approved patch.
5. Do not implement Phase 10 or Phase 11 inside any integration patch.
6. Treat the seven rollout stages as sequential and gated — do not skip a
   stage.
7. Production enablement requires explicit user approval and remains out of
   scope for every stage documented here except the final one, and even
   then only after that approval is given.
8. Do not claim this patch implements live tax memo generation, `/ask`
   runtime wiring, or that any feature flag is enabled by default — none of
   these are true.

## 15. Next task

**PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1** — the recommended next task,
corresponding to preparing rollout stages 2–5 (local integration through
staging smoke evidence) under continued strict governance.

Future plan also includes **PHASE-09-GATE-CLOSURE-1** (final Phase 9 closure
gate, after tax-memo integration work is complete).
