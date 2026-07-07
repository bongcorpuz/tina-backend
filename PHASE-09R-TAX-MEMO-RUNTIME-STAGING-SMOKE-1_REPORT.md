# PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1 — Report

## 1. Patch name

PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1

## 2. Purpose

Verify, with recorded evidence, that the `tax_memo` runtime scaffold
(Phase 9R scaffold) and its integration design (Phase 9R integration design)
remain safe, unwired, feature-flag governed, and non-production-active. This
patch is a staging-smoke / evidence gate only: it performs local
static/source safety validations of the pure workflow modules and safe,
unauthenticated, non-secret public HTTP smoke checks against the staging
environment. It implements no live tax memo generation and does not wire
`tax_memo` into `/ask`.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `0f68a37 PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1 add tax memo runtime integration policy`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold COMPLETE;
  Phase 9R integration design COMPLETE; memory INACTIVE; production
  unchanged; MCP deferred until after the final planned phase (not
  introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs` (new)
- `evaluation/fixtures/phase-09r-tax-memo-runtime-staging-smoke-1.fixture.json` (new)
- `PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

No runtime source file was created or modified by this patch.

## 5. Non-runtime declaration

No route/server/pipeline/ask-handler changes. No package/env/DB/frontend
files changed. No deployment beyond the existing staging environment already
running from prior patches. No memory activation. No client/matter
persistence. No generated work-product persistence. No external search. No
n8n/Firecrawl/Crawlee. No MCP. No live tax-memo activation. No feature flag
enabled by default.

## 6. Local scaffold validation summary

All local static/source safety validations passed:

- Orchestrator, renderer, and integration-policy files exist and their
  respective self-checks (`validateTaxMemoRuntimeScaffold`,
  `validateTaxMemoRuntimeRenderer`, `validateTaxMemoIntegrationPolicy`) all
  return `valid: true`, as do the Phase 9G governance gate
  (`validateWorkflowGovernanceGate`) and Phase 9H runtime-wiring policy
  (`validateWorkflowRuntimeWiringPolicy`) self-checks.
- `runTaxMemoRuntimeScaffold` blocks: the default request, a request missing
  `runtimeOptions`, `featureFlagEnabled: false`, explicit-approval `false`,
  missing `sourceCards`, an unsupported mode, and all five prohibited modes
  (`bir_reply_protest_draft`, `audit_defense_matrix`, `client_advisory`,
  `compliance_checklist`, `requirements_request_letter`).
- `runTaxMemoRuntimeScaffold` passes only for an explicitly safe `tax_memo`
  request; the resulting output has the required shape (`mode: "tax_memo"`,
  `schemaKey: "taxMemoOutput"`, nonempty `sourceCards`, array
  `missingFacts`/`assumptions`, nonblank `humanReviewNotice`,
  `metadata.finalFiling: false`, `metadata.automaticSubmission: false`) and
  contains no final-filing, automatic-submission, production-ready, or
  guaranteed-outcome claims.
- `renderTaxMemoDraftToMarkdown` renders the safe output with draft-only,
  human-review, source-card, missing-facts, and assumptions sections, no
  prohibited claims, and `validateTaxMemoRuntimeRenderedOutput` passes.
- `validateTaxMemoIntegrationCandidate` validates a safe design candidate as
  policy-valid but still `blocked: true` for live execution (flags off,
  `design_only_current_patch` stage); it fails when any forbidden
  change-scope field (`askHandlerModified`, `pipelineModified`,
  `serverModified`, `routeAdded`, `memoryEnabled`, `persistenceAdded`,
  `externalSearchAdded`, `thirdPartyEgressAdded`, `productionEnabled`) is
  `true`, and fails for every blocked mode.
- `git diff --name-only` confirms only this patch's four allowed files are
  changed; no route/server/pipeline/ask-handler/package/env/DB/frontend/
  existing-workflow/MCP files are modified.
- Static self-scan of the test file confirms no secrets, no forbidden
  service imports/URLs, no `process.env` reads, no `Authorization` header
  usage, and no protected shared-secret env var referenced in code.

## 7. Staging smoke summary

Staging (`https://tina-backend-staging.onrender.com`) was reachable during
this test run. All five safe public endpoint checks passed:

## 8. /health evidence

`GET /health` → `200`, body `{"status":"ok","service":"tina-backend"}`, no
`commitSha` exposed, full security-header set present
(Content-Security-Policy, X-Content-Type-Options, X-Frame-Options,
Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy,
Cross-Origin-Resource-Policy, Cache-Control), `X-Powered-By` absent.

## 9. / root evidence

`GET /` → `200`, body `{"success":true,"name":"TINA Backend","message":"Backend is running."}`,
no route-inventory disclosure, full security-header set present,
`X-Powered-By` absent.

## 10. /routes evidence

`GET /routes` → `404`, body `{"error":"not_found"}`, minimized safe response,
no route-inventory disclosure, full security-header set present,
`X-Powered-By` absent.

## 11. OPTIONS /ask evidence

`OPTIONS /ask` → `204 No Content`, safe CORS preflight
(`access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE`), not
rate-limit-blocked, `X-Powered-By` absent. (Preflight responses do not carry
the full CSP/security-header set present on substantive responses — this is
normal Express/CORS-middleware behavior and does not indicate a hardening
regression.)

## 12. Unauthenticated POST /ask evidence

`POST /ask` with harmless payload `{"question":"ping","mode":"default"}`,
no `Authorization` header → `401 Unauthorized`, body
`{"error":"Authentication required"}`. No `taxMemoOutput` schema key, no
professional-workflow output, no source-card section — full security-header
set present, `X-Powered-By` absent.

## 13. Tax memo runtime activation evidence

Not exposed through `/ask` in any form. Unauthenticated `/ask` returns a
protected-behavior error only; no tax-memo draft, markdown, or workflow
output of any kind is returned.

## 14. Feature flag evidence

`TINA_ENABLE_PROFESSIONAL_WORKFLOWS` and `TINA_ENABLE_WORKFLOW_TAX_MEMO`
remain default-off everywhere; neither is enabled by this or any prior
patch; this patch's test/fixture never read `process.env`.

## 15. Route/server/pipeline/ask-handler change evidence

None. `server.js`, `ask-handler.js`, `pipeline.js`, and all route files
remain untouched, confirmed via `git diff --name-only` and via the live
`/ask` protected-behavior smoke check.

## 16. Security-header evidence

Present on `/health`, `/`, `/routes`, and `POST /ask`: Content-Security-Policy,
X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy,
Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Cache-Control.
`X-Powered-By` absent on every checked endpoint including `OPTIONS /ask`.

## 17. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced. No MCP runtime integration exists. No MCP
test calls were made by this patch's test.

## 18. Source-card boundary

`sourceCards` remains a required, nonempty field on every safe scaffold
output; no source cards are fabricated; the existing source-card engine is
untouched by this patch.

## 19. Retrieval boundary

Existing retrieval remains the `/ask` pipeline's sole responsibility; this
patch performs no retrieval, no live web search, and no new authority
ingestion; the retrieval engine is untouched.

## 20. Authority boundary

No fabricated citations. Controlling-authority prioritization is unaffected.
Currentness-unknown disclosure and the no-guaranteed-tax-outcome invariant
are preserved in every safe scaffold output checked by this patch.

## 21. Privacy/security boundary

No persistent client/matter storage. No generated work-product persistence.
No memory activation. No third-party egress. No n8n/Firecrawl/Crawlee. No
production enablement.

## 22. Phase 10 boundary

The Authority Search and Research Engine (Phase 10) is not implemented by
this patch.

## 23. Phase 11 boundary

Retrieval speed/quality optimization (Phase 11) is not implemented by this
patch.

## 24. Validation summary

```
node tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs
  → PASS / 36 passed / 0 failed / 178 assertions
    (includes 5 live staging HTTP smoke checks against
    https://tina-backend-staging.onrender.com, all reachable and safe)

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
  → GATE PASSED / 157 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 25. Decision

**PHASE 09R TAX MEMO RUNTIME STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS**

## 26. Strict recommendations

1. Do not wire `tax_memo` into `/ask` based on this patch — it is evidence of
   current safety, not authorization to integrate.
2. Keep `TINA_ENABLE_PROFESSIONAL_WORKFLOWS` and
   `TINA_ENABLE_WORKFLOW_TAX_MEMO` off by default in every environment.
3. Treat this smoke gate as a point-in-time snapshot; re-run it before any
   future integration-rollout-stage patch, since staging behavior (headers,
   rate limits, response shape) can drift between patches.
4. Do not extend staging smoke coverage to any of the five blocked modes.
5. Do not implement Phase 10 or Phase 11 inside any smoke-evidence patch.
6. Do not introduce MCP; it remains deferred until after the final planned
   phase.
7. Production enablement remains out of scope and requires separate,
   explicit user approval.
8. Do not claim this patch implements live tax memo generation, `/ask`
   runtime wiring, or production readiness — none of these are true.

## 27. Next task

**PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1** — the recommended
next task per this patch's fixture and future-patch plan.

Future plan also includes **PHASE-09-GATE-CLOSURE-1** (final Phase 9 closure
gate, after tax-memo integration work and any other approved mode work is
complete).
