# PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1

## 2. Purpose

Create the first controlled Phase 9 runtime scaffold, for the `tax_memo`
workflow mode **only**. This adds a deterministic, side-effect-free tax-memo
runtime orchestrator and renderer that show how a future runtime execution
would assemble a structured tax memo draft from already-retrieved content,
existing source cards, missing facts, assumptions, and a human-review
notice, then pass it through the Phase 9G workflow output governance gate.
This patch does not activate live tax memo generation, does not change
`/ask` behavior, adds no routes, does not enable feature flags by default,
and does not modify the Phase 9G governance gate or the Phase 9H
runtime-wiring policy.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `48d4f63 PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1 add requirements request letter schema`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9A–9I COMPLETE; memory
  INACTIVE; production unchanged.
- All nine existing Phase 9 workflow files were **not** modified by this
  patch; the orchestrator imports only from `tax-memo-schema.js`,
  `workflow-output-governance-gate.js`, and `workflow-runtime-wiring-policy.js`.

## 4. Files changed

- `workflow/tax-memo-runtime-orchestrator.js` (new)
- `workflow/tax-memo-runtime-renderer.js` (new)
- `evaluation/fixtures/phase-09r-tax-memo-runtime-wiring-scaffold-1.fixture.json` (new)
- `tests/phase-09r-tax-memo-runtime-wiring-scaffold-1.test.mjs` (new)
- `PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No route/server/pipeline/ask-handler changes. No package/env/DB/frontend
files changed. No deployment. No memory activation. No client/matter
persistence. No generated work-product persistence. No external search. No
live tax memo generation activated. Neither the Phase 9G governance gate nor
the Phase 9H runtime-wiring policy was modified. Both new files call no AI
model, perform no retrieval, make no network calls, read no filesystem, read
no `process.env`, use no `Date.now()`/randomness, and have no side effects —
verified by the accompanying test's static source-scan and import-allowlist
checks. Every scaffold request is **blocked by default**; execution requires
the caller to explicitly supply a full set of safe runtime options including
`userExplicitApprovalForRuntimeWiring: true`.

## 6. Orchestrator exports

`PHASE_09R_TAX_MEMO_RUNTIME_ORCHESTRATOR_VERSION`, `TAX_MEMO_RUNTIME_MODE_ID`,
`TAX_MEMO_RUNTIME_SCHEMA_KEY`, `TAX_MEMO_RUNTIME_REQUIRED_INPUTS`,
`TAX_MEMO_RUNTIME_REQUIRED_RUNTIME_FLAGS`, `TAX_MEMO_RUNTIME_PROHIBITED_MODES`,
`createTaxMemoRuntimeResult()`, `normalizeTaxMemoRuntimeInput(input)`,
`validateTaxMemoRuntimeInput(input)`, `validateTaxMemoRuntimeOptions(runtimeOptions)`,
`buildTaxMemoDraftFromRuntimeInput(input)`, `runTaxMemoRuntimeGovernance(output, options)`,
`runTaxMemoRuntimeScaffold(request)`, `validateTaxMemoRuntimeScaffold()`.

**Design note on `featureFlagEnabled`:** the Phase 9H policy's
`validateWorkflowRuntimeWiringRequest()` treats `featureFlagEnabled: true` as
an *error*, because that field asserts "the environment default is on" (which
must never be true). This orchestrator's own `runtimeOptions.featureFlagEnabled`
is a distinct, call-scoped concept — "has the caller explicitly enabled
execution for this one call" — validated independently in
`validateTaxMemoRuntimeOptions()`. The orchestrator always passes
`featureFlagEnabled: false` into the Phase 9H policy call (since it never
asserts an environment-default-on state) while separately requiring the
caller's own `featureFlagEnabled: true` before proceeding. Neither check
implies or contradicts the other, and `workflow-runtime-wiring-policy.js`
was not modified to accommodate this.

## 7. Renderer exports

`PHASE_09R_TAX_MEMO_RUNTIME_RENDERER_VERSION`, `TAX_MEMO_RUNTIME_RENDER_SECTIONS`,
`createTaxMemoRuntimeRenderResult()`, `renderTaxMemoDraftToMarkdown(output, options)`,
`renderTaxMemoSourceCards(sourceCards)`, `validateTaxMemoRuntimeRenderedOutput(markdown, output)`,
`validateTaxMemoRuntimeRenderer()`.

## 8. Runtime mode

`tax_memo` only — `schemaKey: "taxMemoOutput"`.

## 9. Required inputs

`facts`, `issues`, `taxpayerType`, `taxPeriod`, `intendedAudience`,
`sourceCards`, `missingFacts`, `assumptions`, `humanReviewNotice`.

## 10. Required runtime flags

`featureFlagEnabled`, `userExplicitApprovalForRuntimeWiring`,
`governanceGatePassed`, `sourceCardsPresent`, `missingFactsPresent`,
`assumptionsPresent`, `humanReviewNoticePresent`,
`prohibitedClaimDetectionPassed`, plus the five must-be-false
conceptual flags (`persistenceRequestedFalse`, `memoryRequestedFalse`,
`thirdPartyEgressRequestedFalse`, `externalSearchRequestedFalse`,
`productionEnablementRequestedFalse`) mapped at runtime to
`persistenceRequested: false`, `memoryRequested: false`,
`thirdPartyEgressRequested: false`, `externalSearchRequested: false`,
`productionEnablementRequested: false` respectively.

## 11. Blocked modes

`bir_reply_protest_draft`, `audit_defense_matrix`, `client_advisory`,
`compliance_checklist`, `requirements_request_letter` — none of these are
runtime-wired by this patch, regardless of options supplied; the mode check
happens before any other validation.

## 12. Runtime scaffold boundary

`tax_memo` only; feature-flag governed; explicit caller approval required;
default execution blocked; no `process.env` reads; no live route wiring; no
`/ask` behavior change; no runtime persistence; no model calls; no retrieval
calls; no external calls; no generated legal analysis beyond provided input;
Phase 9G governance gate required before any result is returned as valid.

## 13. Renderer boundary

Renders only the provided output object; no new legal analysis; no
fabricated authorities; no link fetching or verification; no official-URL
verification claim unless the source card's own `currentnessStatus` already
says `"verified"`; draft-only and human-review notices always included.

## 14. Governance gate boundary

Every scaffold execution runs `validateWorkflowOutputGovernance()` from
Phase 9G; requires `sourceCards`/`missingFacts`/`assumptions`/
`humanReviewNotice` presence, safe metadata (`finalFiling: false`,
`automaticSubmission: false`, `runtimeWiring: false`,
`featureFlagDefault: "off"`), and no detected prohibited claims.

## 15. Source-card boundary

Current Phase 9: GDrive/archive source cards acceptable; `officialUrl`/
`canonicalSourceId` not required. Future Phase 10 (not implemented here):
`officialUrl` primary, `archiveUrl` secondary, `canonicalSourceId` internal
source of truth.

## 16. Retrieval boundary

Existing retrieval remains a future caller's responsibility — this scaffold
performs no retrieval execution itself; no live web search; no new authority
ingestion; no unapproved sources.

## 17. Authority boundary

No fabricated citations; no authorities added beyond the caller-provided
`applicableAuthorities`; controlling-authority prioritization and related-vs-
controlling disclosure remain the caller/retrieval layer's responsibility;
currentness-unknown disclosed; no guaranteed tax outcome.

## 18. Privacy/security boundary

No persistent client/matter storage; no generated work-product persistence;
no memory activation; no third-party egress; no n8n/Firecrawl/Crawlee; no
production change.

## 19. Phase 10 boundary

No authority search; no source intake; no officialUrl/archive/
canonicalSourceId implementation; no n8n/Firecrawl/Crawlee; no currentness
engine implementation.

## 20. Phase 11 boundary

No BM25; no re-ranking; no query cache; no source-card hydration cache; no
latency-optimization implementation.

## 21. Validation summary

```
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
  → GATE PASSED / 155 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 22. Decision

**PHASE 09R TAX MEMO RUNTIME WIRING SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 23. Strict recommendations

1. Do not import `tax-memo-runtime-orchestrator.js` or
   `tax-memo-runtime-renderer.js` from ask-handler.js, pipeline.js, server.js,
   routes, or the frontend — that requires a separate, later, explicitly
   approved integration patch.
2. Do not modify the Phase 9G governance gate or the Phase 9H runtime-wiring
   policy to accommodate this scaffold — none was required, and none was done.
3. Never call `runTaxMemoRuntimeScaffold()` with default or partially-supplied
   options and expect execution — it is blocked by design; every required
   flag must be explicitly and correctly supplied.
4. Keep `tax_memo` as the only runtime-wired mode until it is proven safe in
   a later, separately approved integration/staging patch; do not extend this
   pattern to any of the five blocked modes without explicit approval.
5. The renderer must never claim official URL verification or full
   currentness verification beyond what the underlying source card's own
   `currentnessStatus` field already supports.
6. Do not claim live tax memo generation is implemented, that `/ask` runtime
   wiring exists, or that any feature flag is enabled by default — none of
   these are true of this patch.
7. Treat this scaffold as a design proof, not a production capability; a
   staging smoke and integration design are required before any further step.

## 24. Next task

**PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1** — design (not
implement) how this scaffold would eventually be integrated behind the
feature flag into a real request path, still without live activation.

Recorded future patch plan also includes
`PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1` and `PHASE-09-GATE-CLOSURE-1`.
