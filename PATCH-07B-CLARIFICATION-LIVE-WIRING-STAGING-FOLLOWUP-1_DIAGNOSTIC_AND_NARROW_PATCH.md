# PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-FOLLOWUP-1 - Diagnostic and Narrow Patch

## Patch Name

PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-FOLLOWUP-1 - Staging Smoke Diagnostic and Narrow Corrective Patch

## Base Commit

```text
e0465ff PATCH-07B-CLARIFICATION-LIVE-WIRING-1 wire clarification gate behind flag
```

## Staging Smoke Failure Summary

PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-SMOKE-1 did not pass. OFF-state smoke passed, but ON-state smoke found:

1. Public responses did not expose `responseType` or `structuredClarificationObject`.
2. Some `/ask` direct smoke requests resolved as `/audit`, consistent with sticky mode contamination.
3. The G.R. metadata query returned case metadata instead of a Phase 10 deferral orientation.

## OFF-State Safety Reset Summary

The user reset staging to:

```text
TINA_ENABLE_CLARIFICATION_ROUTE_GATE=false
```

This follow-up verified through Render env status that staging is currently OFF/invalid, not true-like enabled. Production was not changed.

## Root Cause - Public Metadata Exposure

`pipeline.js` already attached `responseType`, `structuredClarificationObject`, and `clarificationRouteGate` to the internal pipeline result when the live clarification route gate produced them.

`ask-handler.js` then built the public response payload and did not copy those fields. The backend therefore generated the metadata internally but dropped it before the public API response.

## Root Cause - `/ask` to `/audit` Contamination

Route files correctly attach concrete forced hooks:

```text
/ask   -> forcedHook "/ask"
/tax   -> forcedHook "/tax"
/audit -> forcedHook "/audit"
```

The issue was in sticky mode prepend logic inside `ask-handler.js`: it still prepended the stored `existingMode.active_hook` when `forcedHook === "/ask"`. That allowed a direct `/ask` route request to inherit a prior sticky `/audit` mode from the same smoke user/session.

This was a backend route-isolation issue exposed by the smoke methodology.

## Root Cause - Phase 10 G.R. Deferral

The live gate did not mark G.R. number case-name/metadata lookup queries as Phase 10 dependencies. The route decision could therefore continue with ordinary related-authority behavior, leaving OpenAI to answer case metadata rather than orienting the user to the deferred Phase 10 source-governance boundary.

## Files Changed

```text
ask-handler.js
clarification-boundary-policy.js
pipeline.js
tests/patch-07b-audit-risk-final-gate-1-workstream-final-gate.test.mjs
tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs
tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs
tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs
tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs
tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs
tests/patch-07b-final-gate-1-analytical-adversarial-final-gate.test.mjs
PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-FOLLOWUP-1_DIAGNOSTIC_AND_NARROW_PATCH.md
knowledge/CURRENT_STATE.md
```

Justification per file:

1. `ask-handler.js` - Root causes 1 and 2. (a) Public response assembly was dropping `responseType`, `structuredClarificationObject`, and `clarificationRouteGate`; the payload builder is the narrowest correct place to copy them because the pipeline already produced the fields and no route/controller redesign is needed. The fields are spread conditionally, so OFF-state responses still omit them and no frontend change was needed. (b) Sticky mode prepend previously ran when `forcedHook === "/ask"`, letting a direct `/ask` request inherit a stored sticky `/audit` hook; the condition is now `!forcedHook` only.
2. `pipeline.js` - Root cause 3. Narrow Step 12.6 input propagation only: detects G.R. number case-name/title/holding/status/metadata lookup queries and adds a `CASE_STATUS_METADATA` Phase 10 dependency flag to the clarification route input. No retrieval, reranker, or generation change.
3. `clarification-boundary-policy.js` - Root cause 3. One-line precedence change so explicit Phase 10 dependency flags always classify as `DISCLOSE_PHASE10_DEFERRAL` instead of being overridden by blocking-fact clarification. Narrow Phase 7 deferral classification; no Phase 10 implementation.
4. `tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs` - Adds focused coverage for the three fixes: G.R. metadata Phase 10 deferral orientation, public payload metadata exposure, and sticky-hook route isolation.
5. `tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs` - Aligns fixture expectations with the authorized Phase 10 precedence behavior; assertions are conditional on `phase10DependencyFlags` presence only, all other cases unchanged.
6. Guard tests (`...-final-gate-1-track-closure`, `...-live-wiring-scaffold-1-contract-fixture`, `...-route-scaffold-1-integration-fixture`, `...-audit-risk-final-gate-1`, `...-final-gate-1-analytical-adversarial`) - Extend the diff allowlists to include exactly this follow-up's files, and replace the blanket `ask-handler.js` protection with a strict `assertAuthorizedAskHandlerFollowup` check that verifies only the authorized conditional-spread and sticky-hook change shapes are present. Guards are not weakened globally.

## Narrow Corrective Actions

1. Public payload metadata:
   - `ask-handler.js` now copies `responseType`, `structuredClarificationObject`, and `clarificationRouteGate` from the pipeline result only when those fields exist.
   - OFF-state remains unchanged because the fields are absent when the flag is OFF.

2. Route isolation:
   - Sticky mode prepend now runs only when there is no concrete `forcedHook`.
   - Direct `/ask`, `/tax`, and `/audit` route requests keep their route-forced hook and cannot inherit sticky `/audit` mode.

3. Phase 10 G.R. metadata deferral:
   - The flagged clarification route input now detects G.R. number case-name/title/holding/status/metadata lookup queries and adds a compact `CASE_STATUS_METADATA` Phase 10 dependency flag.
   - The clarification boundary prioritizes explicit Phase 10 dependency flags into `DISCLOSE_PHASE10_DEFERRAL`.
   - No court-case metadata lookup, registry, source freshness runtime, supersession runtime, or Phase 10 implementation was added.

## Non-Scope Confirmation

No frontend changes, dependency changes, retrieval changes, reranker changes, sourceAvailability redesign, source-card redesign, DB/vector/indexing/corpus/ingestion changes, Phase 8 memory, Phase 9 workflow, Phase 10 metadata lookup/currentness/supersession runtime, or Phase 11 work were introduced.

No `package.json` or `package-lock.json` changes were made.

## Validation

All validation was run in the completion pass on 2026-07-03 and passed:

```text
node --check pipeline.js                        PASS
node --check ask-handler.js                     PASS
node --check clarification-boundary-policy.js   PASS

node tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs                    13 passed, 0 failed
node tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs            18 passed, 0 failed
node tests/patch-07b-clarification-final-gate-2-route-helper-workstream-closure.test.mjs       15 passed, 0 failed
node tests/patch-07b-clarification-route-gate-1-composition-safety-gate.test.mjs               17 passed, 0 failed
node tests/patch-07b-clarification-route-helper-1-narrow-orchestrator-helper.test.mjs          17 passed, 0 failed
node tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs               21 passed, 0 failed
node tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs                          8 passed, 0 failed
node tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs             12 passed, 0 failed
node tests/patch-07b-audit-risk-final-gate-1-workstream-final-gate.test.mjs                     7 passed, 0 failed
node tests/patch-07b-final-gate-1-analytical-adversarial-final-gate.test.mjs                    7 passed, 0 failed

npm test              Syntax checks: 10 run, 0 failed; Test suites: 113 run, 0 failed; GATE PASSED
npm run guard:files   PASS: No protected files modified
```

## Remaining Risks

1. Repeat staging smoke is still required. This patch only fixes the diagnosed backend issues locally.
2. ON-state behavior must be retested with isolated users/sessions or direct raw route calls after deployment.
3. `ON_FAIL_OPEN_OBSERVATION` should remain test-covered unless a safe staging-only induction path is available.

## Final Decision

PASS. The three staging smoke root causes were corrected with narrow backend-only changes, all validation passed, and the staging flag remains OFF. Do not proceed to final release gate until the staging smoke rerun passes.

## Required Next Step

```text
PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-SMOKE-1-RERUN
```

Do not start the smoke rerun inside this Codex task.
