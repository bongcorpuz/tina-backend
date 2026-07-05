# PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-DOMAIN-BOUNDARY-REMEDIATION-1 — Report

## 1. Patch name and purpose

**Patch:** PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-DOMAIN-BOUNDARY-REMEDIATION-1

**Purpose:** Fix the remaining follow-up carryover failure found in Render
staging logs — the **pipeline-level** defense-in-depth domain boundary in
`pipeline.js` still evaluated the raw follow-up query and rejected it, even though
the route-level boundary (56b20f3) correctly allowed the rewritten standalone
query. This patch makes the pipeline boundary evaluate the same `effectiveQuery`
when carryover applies, **without** removing or bypassing the boundary.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `56b20f3 PATCH-08X-CHAT-CONTEXT-CARRYOVER-DOMAIN-BOUNDARY-WIRING-1 wire flag-gated boundary carryover`
- **Working tree:** clean except the four known deferred untracked paths.
- **Phase 8:** closed. **Phase 8S:** closed. **Phase 9:** not started. **Memory:** inactive.

## 3. Render log evidence summary

Route-level boundary (ask-handler.js, working):
`[DOMAIN BOUNDARY CHECK] query: "Is fresh frozen seafood subject to VAT in the
Philippines?" detectedDomain: PHILIPPINE_TAX isPhilippineTax: true decision: ALLOW
domainBoundaryCarryoverApplied: true inheritedTaxType: VAT boundedTurnCount: 2`.

Pipeline-level boundary (pipeline.js, failing):
`[PIPELINE DOMAIN BOUNDARY CHECK] query: "How about fresh frozen seafood?"
detectedDomain: UNCLASSIFIED isPhilippineTax: false decision: REJECT reason:
fail_closed_no_tax_signal` → `[PIPELINE DOMAIN BOUNDARY BLOCKED] blocked: true`
→ `sourceAvailabilityStatus: DOMAIN_BOUNDARY_REJECT, retrievedCount: 0`.

**Root cause:** `PIPELINE_DOMAIN_BOUNDARY_CONTEXT_GAP` — the second, in-pipeline
boundary used the raw current query. Not a frontend/auth/session/flag/helper
issue.

## 4. Runtime files changed

- `pipeline.js` — the only runtime file modified. `ask-handler.js` was **not**
  changed (the route-level boundary already works).

## 5. Feature flag

- **Name:** `TINA_ENABLE_CHAT_CONTEXT_CARRYOVER` — reused; **default OFF**; no env
  changed; production not enabled. Staging was behaviorally ON during the log
  capture (unchanged by this patch).

## 6. Remediation summary

The pipeline domain boundary pre-check in `runPipeline`:

- **Before:** `detectPhilippineTaxBoundary(query || "", hook || "/ask")` — the raw
  current query.
- **After:** `detectPhilippineTaxBoundary(effectiveQuery || "", hook || "/ask")` —
  the `effectiveQuery` already resolved earlier by
  PATCH-08X-…-PIPELINE-WIRING-1 (`effectiveQuery = decision.applied ?
  decision.standaloneQuery : query`). The two boundary log lines now show the
  effective query, plus safe carryover trace fields
  (`pipelineDomainBoundaryCarryoverEnabled/Applied/StandaloneQueryUsed`,
  `inheritedTaxType`, `inheritedJurisdiction`, `boundedTurnCount`) — no raw recent
  turns.

The boundary **still runs and still decides** ALLOW/REJECT (no bypass).
Classification (`classify(effectiveQuery)`) and retrieval
(`retrieveRelevantSources({ query: effectiveQuery })`) remain aligned to the same
effective query. The original `query` is still used for final answer generation.

**Verified locally:** flag OFF → boundary on "How about fresh frozen seafood?" =
REJECT (unchanged); flag ON → boundary on the resolved standalone "Is fresh frozen
seafood subject to VAT in the Philippines?" = ALLOW.

## 7. Flag-off behavior

With the flag OFF (default), `effectiveQuery === query`, so the pipeline boundary
evaluates the raw query exactly as before — **no live behavior change**. Confirmed
by the full regression gate.

## 8. Flag-on behavior

For "Is tobacco subject to VAT?" then "How about fresh frozen seafood?", the
pipeline boundary now evaluates the standalone VAT query and returns ALLOW, so the
pipeline proceeds to classification → retrieval → source availability →
generation → rendering → response. The final answer still answers the original
user query.

## 9. Rejection controls preserved

Non-tax ("What is the weather?", "Tell me about seafood recipes.") → the helper
does not apply, `effectiveQuery` stays raw, boundary REJECTs. Reset ("Forget VAT,
explain EWT.") and jurisdiction switch ("In the US, how is this taxed?") → helper
does not inherit (`applied: false`), so no Philippine-VAT is injected. No-context
follow-up → not auto-allowed. The boundary must still pass on the effective query.

## 10. Source authority discipline

No citations, source cards, or source availability from history; retrieval must
still find indexed authorities; SAE and source cards are unchanged. The carryover
only determines whether the follow-up reaches the pipeline.

## 11. Security/privacy controls

No persistent memory; no `TINA_ENABLE_MEMORY_*` flags; no raw recent-turn logging
(safe trace fields only); no P1/P2 third-party egress added; no DB/persistence
expansion.

## 12. Staging/production status

No deployment by this patch. The staging flag is unchanged (still behaviorally
ON); staging must be **redeployed** and the smoke **rerun** to confirm the live
follow-up now reaches generation. Production remains OFF. The live issue is fixed
in code and verified locally but **not** claimed fixed live until the smoke reruns.

## 13. Validation results

```text
node tests/patch-08x-chat-context-carryover-pipeline-domain-boundary-remediation-1.test.mjs
PASS - 16 passed, 0 failed, 114 assertions

node tests/patch-08x-chat-context-carryover-domain-boundary-wiring-1.test.mjs
PASS - 18 passed, 0 failed, 130 assertions

node tests/patch-08x-chat-context-carryover-pipeline-wiring-1.test.mjs
PASS - 19 passed, 0 failed, 138 assertions

node tests/patch-08x-chat-context-carryover-scaffold-1.test.mjs
PASS - 15 passed, 0 failed, 231 assertions

node tests/patch-08x-chat-context-carryover-design-1.test.mjs
PASS - 27 passed, 0 failed, 168 assertions

node tests/patch-08x-chat-context-carryover-diagnostic-1.test.mjs
PASS - 20 passed, 0 failed, 145 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
PASS - 22 passed, 0 failed, 203 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 0 failed (run with pipeline.js staged; the Phase 8 memory diff-guard
suites assert an empty unstaged `git diff`. pipeline.js is not in any guard's
forbidden protected-file list.)
```

The focused test does not import `pipeline.js`/the services boundary (side-effect
imports); it imports the pure helper, mirrors the effective-query resolution, and
statically verifies the `pipeline.js` remediation.

## 14. Final decision

```text
CHAT CONTEXT CARRYOVER PIPELINE DOMAIN BOUNDARY REMEDIATION PASS WITH STRICT RECOMMENDATIONS
```

## 15. Strict recommendations

1. Deploy staging after push.
2. Keep the production flag OFF.
3. Rerun the staging smoke with the same conversation/logs.
4. Confirm the pipeline domain boundary now checks the standalone query (ALLOW).
5. Confirm retrieval/generation proceed and source cards are source-backed.
6. Confirm reset/jurisdiction/non-tax controls remain safe.
7. Do not use persistent memory.
8. Preserve source authority discipline.
9. Do not start Phase 9 until the 08X final gate.

## 16. Next task

```text
PATCH-08X-CHAT-CONTEXT-CARRYOVER-STAGING-SMOKE-1-RERUN
```

After the staging redeploy of this commit, rerun the staging smoke (or the
Render-log evidence step) to confirm the follow-up now reaches generation.
