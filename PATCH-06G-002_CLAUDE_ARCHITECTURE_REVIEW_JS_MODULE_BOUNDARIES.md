# PATCH-06G-002 — Claude Code Architecture Review: JS Module Boundaries

## 1. Objective

Review the PATCH-06G-001 JS module inventory and decomposition destination map to validate module ownership, decomposition boundaries, risk sequencing, and future implementation strategy before any runtime code is changed.

This review is architecture and documentation only. No runtime code was changed.

## 2. Scope

- Validate the PATCH-06G-001 inventory and destination map.
- Assess module ownership by reading key source files directly.
- Identify the correct boundaries for source-card, sourceAvailability, authority, retrieval, reranker, mode, and response modules.
- Identify duplicate responsibility and circular dependency risks.
- Assess Phase 6F coverage adequacy.
- Recommend a safe Codex implementation sequence.

Out of scope:

- No runtime code edits.
- No `pipeline.js` edits.
- No decomposition implementation.
- No DB, indexing, RAG, vector, corpus, or ingestion changes.

## 3. Reviewed Inputs

| Input | Status |
|---|---|
| `PATCH-06G-001_JS_MODULE_INVENTORY_AND_DECOMPOSITION_DESTINATION_MAP.md` | Read in full |
| `knowledge/CURRENT_STATE.md` | Read in full |
| `pipeline.js` | Read: header, imports, exports, `classifySourceAvailability`, `computeSourceAvailability`, wrapper functions, line count (4,841) |
| `source-visibility-engine.js` | Read: exports, imports, line count (2,068) |
| `issue-classification-engine.js` | Read: exports, imports, line count (2,065) |
| `authority-utils.js` | Read: exports, line count (1,344) |
| `services/source-authority-selector.js` | Read: imports, line count (901) |
| `source-card-engine.js` | Read in full (203 lines) |
| `authority-restoration-engine.js` | Read in full (73 lines) |
| `answer-renderer.js` | Read: imports, saeStatus usage, line count (1,936) |
| `ask-handler.js` | Read: imports, line count (3,276) |
| `retrieval-engine.js` | Read: line count (4,015) |
| `reranker-engine.js` | Read: line count (1,362) |

Test run at review time:

```text
npm test: 10 syntax checks, 73 test suites, 0 failures — PASS
npm run guard:files: PASS — no protected files modified
```

## 4. Executive Architecture Findings

### Finding 1 — Wrapper adapter pattern is already in place for source-card-engine.js (CONFIRMED)

`pipeline.js` imports all six functions from `source-card-engine.js` using `engine*` aliases:

```text
engineFinalSourceCardCanonicalKey
engineMergeFinalSourceCards
engineResolveIndexedSourceCardTarget
engineSanitizePublicSourceCard
engineSourceCardFromRetrievedTarget
engineSourceCardPublicUrlFromDoc
```

Pipeline.js then re-exposes each as a local wrapper that delegates 100% to the engine version:

```js
function sanitizePublicSourceCard(card = {}) {
  return engineSanitizePublicSourceCard(card);
}
// identical pattern for all six functions
```

**Implication**: The real implementation is already in `source-card-engine.js`. The remaining decomposition work for this cluster is wrapper collapse — removing the six wrappers and having internal callers reference the engine imports directly. This is the lowest-risk first Phase 6G implementation step available.

### Finding 2 — `classifySourceAvailability` is exported from `pipeline.js` and directly imported by test files (CRITICAL COUPLING)

`classifySourceAvailability` is a 200+ line function exported from `pipeline.js`. It is directly imported by at least 6 test files:

```text
tests/patch-027n-wht-jurisprudence-sae-guard.test.mjs
tests/patch-027o-generic-ewt-acronym-guard.test.mjs
tests/patch-035b-ra10963-bridge.test.mjs
tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
tests/patch-018a-regression.test.mjs (inlined copy)
tests/patch-018b-018c-regression.test.mjs (inlined subset)
```

This coupling means `classifySourceAvailability` cannot be moved out of `pipeline.js` without updating all test imports. This was not called out explicitly in PATCH-06G-001 and must be treated as a hard extraction constraint.

### Finding 3 — Two SAE functions coexist in pipeline.js with different purposes

`pipeline.js` has:

1. `computeSourceAvailability` (private, ~50 lines, line 1108): Legacy internal SAE outcome function. Called only within `pipeline.js`. Uses `displayedCount` and `rerankedCount` logic.
2. `classifySourceAvailability` (exported, 200+ lines, line 1497): Primary SAE classifier. Evaluates annotated candidates against governing/direct-authority criteria. Called by the pipeline at line 2748 and by test files directly.

These two functions are NOT the same. They represent different classification paths for different pipeline stages. Any extraction or renaming must treat them independently. PATCH-06G-001 did not distinguish between them.

### Finding 4 — `source-visibility-engine.js` is a utility/display module, not a SAE classifier

Despite its name, `source-visibility-engine.js` exports:
- Document utility functions: `sourceTitleOf`, `sourcePathOf`, `fileIdOf`, `authorityTypeOf`, `authorityLevelOf`, `shouldHideSource`
- Display functions: `filterVisibleSources`, `buildFinalRoutePayload`, `formatDocType`
- Normalization helpers: `normalizeText`, `normalizeLooseText`
- Supersession preflight: `runSupersessionPreflight`

It does NOT contain SAE classification logic. The recommendation in PATCH-06G-001 to route sourceAvailability logic toward `source-visibility-engine.js` is **incorrect** given the module's actual scope. Moving `classifySourceAvailability` there would misname the concern and create a misleading module boundary.

**Correct recommendation**: If `classifySourceAvailability` is ever extracted from `pipeline.js`, it should go to a new dedicated module (e.g., `source-availability-classifier.js`) — not `source-visibility-engine.js`.

### Finding 5 — `authority-restoration-engine.js` is pure and safe

73 lines, no external imports except `../source-visibility-engine.js` (via deps pattern). It is a clean, pure helper with a stable boundary. No further decomposition needed in Phase 6G.

### Finding 6 — Phase 6F evaluation coverage is sufficient for wrapper collapse but not for classifySourceAvailability extraction

Phase 6F provides: authority/source-card regression, CTA/G.R. click-target tests, generic-query guard, exact-source wording, mode-format evaluation, and domain source-card coverage. These collectively cover the wrapper collapse safely.

Phase 6F does NOT provide a direct test for the equivalence of `classifySourceAvailability` behavior if it were moved — test files import it from `pipeline.js` directly, so a module move would require all test import paths to update simultaneously. That is Phase 6H or later work.

## 5. Validation of PATCH-06G-001 Inventory

| Section | Assessment | Status |
|---|---|---|
| Section 5: File count summary | Counts verified against filesystem (71 root, 9 services, 13 routes, 4 shared, 34 tax-engines, 6 learning, 2 evaluation, 3 scripts, 1 prompts, 1 sessions, 73 tests/harness) | CONFIRMED ACCURATE |
| Section 6: Full inventory table | File classifications are correct. No material omission. | CONFIRMED ACCURATE |
| Section 7: Module responsibility map | Ownership candidates are reasonable. Two amendments required (see Findings 3, 4). | CONFIRMED WITH AMENDMENTS |
| Section 8: Destination map | Existing-file preference is correct policy. sourceAvailability destination should NOT be `source-visibility-engine.js` (see Finding 4). | CONFIRMED WITH AMENDMENT |
| Section 9: Overlap risks | Correctly identifies the major risk areas. Missing: the two-function SAE distinction inside pipeline.js. | CONFIRMED WITH AMENDMENT |
| Section 10: Prefer existing files | Correct policy. | CONFIRMED |
| Section 11: New file deferred | Correct. One new module (`source-availability-classifier.js`) may be justified later for `classifySourceAvailability` extraction, but not in Phase 6G. | CONFIRMED WITH CLARIFICATION |
| Section 12: High-risk files | List is correct and complete. | CONFIRMED |
| Section 13: Pipeline.js readiness | Correctly assessed as NOT READY for direct decomposition. The wrapper adapter pattern discovered here is an additional reason to prefer wrapper-collapse as the only safe pipeline.js touch in Phase 6G. | CONFIRMED AND STRENGTHENED |
| Section 14: Phase placement | Placements are correct. | CONFIRMED |
| Section 15: Recommended next task | PATCH-06G-002 was the correct next step. | CONFIRMED |

## 6. Module Ownership Assessment

| Module | Confirmed Owner | Current State | Phase 6G Action |
|---|---|---|---|
| `source-card-engine.js` | Source-card assembly and finalization helpers | Already the real owner; pipeline.js has 6 wrapper delegates | Collapse wrappers (PATCH-06G-003/004) |
| `authority-restoration-engine.js` | Authority restoration helpers | Pure, 73 lines, complete | None needed |
| `services/source-authority-selector-card-sanitizer.js` | Selector-side source-card sanitization | Complete, call-site scoped | None needed |
| `services/ask-handler-public-source-sanitizer.js` | Ask-handler public source sanitization | Complete, call-site scoped | None needed |
| `services/source-authority-selector-eligibility.js` | Selector eligibility logic | Complete, Phase 6E extracted | None needed |
| `issue-exact-authority-detector.js` | Exact authority detection | Complete, Phase 6E extracted | None needed |
| `reranker-normalizers.js` | Reranker normalizer helpers | Complete, Phase 6E extracted | None needed |
| `reranker-issue-signals.js` | Reranker issue-signal helpers | Complete, Phase 6E extracted | None needed |
| `vector-authority-keyword-builders.js` | Vector authority keyword building | Complete, Phase 6E extracted | None needed |
| `pipeline.js` | Primary orchestration (`runPipeline`), SAE classification (`classifySourceAvailability`, `computeSourceAvailability`), source-card wrappers (temporary) | 4,841 lines; wrappers are safe to collapse; SAE functions are not ready to extract | Wrapper collapse only |
| `source-visibility-engine.js` | Document utility and display functions | 2,068 lines; NOT an SAE classifier | None — name clarification only |
| `classifySourceAvailability` | SAE outcome classifier; exported from `pipeline.js` | Deeply tested via direct import; must stay in pipeline.js for Phase 6G | No move until Phase 6H/later |
| `computeSourceAvailability` | Internal legacy SAE path; private in `pipeline.js` | Private; stable; not to be touched | No move |

## 7. Boundary Assessment by Domain

### A. Authority / Source-Card Boundary

| Concern | Boundary Decision |
|---|---|
| Source-card assembly helpers | OWNER: `source-card-engine.js`. Wrapper collapse in pipeline.js is safe and supported. |
| Public source-card sanitization (selector side) | OWNER: `services/source-authority-selector-card-sanitizer.js`. Complete. |
| Public source-card sanitization (ask-handler side) | OWNER: `services/ask-handler-public-source-sanitizer.js`. Complete. |
| Source availability classification (SAE) | OWNER: `pipeline.js` for Phase 6G. Future extraction requires a new dedicated module, not `source-visibility-engine.js`. |
| Authority restoration | OWNER: `authority-restoration-engine.js`. Complete. |
| Selector eligibility | OWNER: `services/source-authority-selector-eligibility.js`. Complete. |
| Exact authority detection | OWNER: `issue-exact-authority-detector.js`. Complete. |
| BIR/NIRC/RR/RMC/RMO/CTA/G.R. pattern matching | SPLIT: `authority-constants.js`, `authority-alias-registry.js`, `services/philippine-tax-boundary-patterns.js`. Defer unification to Phase 6H after review. |
| Generic-query guards | OWNER: `issue-classification-engine.js`. Do not move. High risk to authority promotion behavior. |
| Source-limitation wording | OWNER: `answer-renderer.js`, `final-answer-compliance.js`. Defer to Phase 7A. |
| Case-card / click-target integrity | OWNER: `source-card-engine.js` (target assembly). `source-card-engine.js` is the safe long-term home. |

### B. Pipeline.js Boundary

Current ownership state of pipeline.js:

| Logic cluster | Current status | Phase 6G recommendation |
|---|---|---|
| `runPipeline()` orchestration (steps 1–16) | Core — pipeline.js owns this permanently | Do not extract |
| `classifySourceAvailability` | Exported SAE classifier, 200+ lines, tightly test-coupled | Do not extract in Phase 6G |
| `computeSourceAvailability` | Private internal SAE path | Do not extract; private |
| Source-card wrapper functions (6 wrappers) | Wrappers only; real logic is in `source-card-engine.js` | Collapse wrappers (Phase 6G safe patch) |
| `fourPartDoctrineTest` | Exported test utility | No change needed |
| `patch027n*`, `patch027o*`, `patch030a*` internal helpers | Private pipeline step helpers | No change needed in Phase 6G |
| SAE helper private functions (`_saeOutcomeCategory`, `_saeFallbackStatus`, `_saeArray`, etc.) | Private; serve `classifySourceAvailability` | Do not extract until `classifySourceAvailability` is extracted |

**Pipeline.js extraction readiness assessment**:

```text
Source-card wrappers: READY FOR COLLAPSE (Phase 6G, after Phase 6F test confirmation)
classifySourceAvailability: NOT READY FOR EXTRACTION (Phase 6H minimum)
computeSourceAvailability: NOT READY (private; depends on private helpers)
runPipeline: DO NOT EXTRACT (permanent pipeline owner)
All other pipeline internals: NOT READY FOR PHASE 6G
```

**Safest extraction principle for pipeline.js**: Pure helpers first, no behavior change, existing destinations preferred, one concern per patch.

### C. Retrieval / Reranker Boundary

| Concern | Boundary Decision |
|---|---|
| Retrieval orchestration (`retrieveRelevantSources`) | OWNER: `retrieval-engine.js`. High blast radius (4,015 lines). Do not touch in Phase 6G. Defer to Phase 6H or later. |
| Reranker normalizers | OWNER: `reranker-normalizers.js`. Complete (Phase 6E). |
| Reranker issue signals | OWNER: `reranker-issue-signals.js`. Complete (Phase 6E). |
| Vector authority keyword builders | OWNER: `vector-authority-keyword-builders.js`. Complete (Phase 6E). |
| `rag-answer-handler.js` | Current owner of RAG answer path. High risk. Do not touch in Phase 6G. |
| `vector-store.js` | Vector-store access. Do not touch at any phase without express governance approval. |

### D. Mode / Response Boundary

| Concern | Boundary Decision |
|---|---|
| `/ask` response formatting | OWNER: `ask-handler.js`, `answer-renderer.js`. Defer to Phase 7A. |
| `/tax` senior memo format | OWNER: `adaptive-response-planner.js`, `shared/mode-formatters.js`. Defer to Phase 7A. |
| `/audit` complex advisory format | OWNER: `prompts/audit-mode-prompt.js`, `answer-renderer.js`. Defer to Phase 7A/7B. |
| Mode routing and intent | OWNER: `command-resolver.js`, `adaptive-mode-engine.js`, `query-intent-engine.js`. Defer to Phase 7A. |
| Source-limitation wording | OWNER: `answer-renderer.js`, `final-answer-compliance.js`. Defer to Phase 7A. |

### E. Future-Phase Boundaries (PARKED)

| Phase | Concern | Status |
|---|---|---|
| Phase 7A | Human conversational response layer, `/ask` and `/tax` formatting, source limitation wording, mode routing | PARKED |
| Phase 7B | Adversarial reasoning layer, `/audit` complex advisory, risk flags, conflict analysis | PARKED |
| Phase 8 | Memory architecture, user learning, matter/firm/global knowledge separation | PARKED |
| Phase 9 | Professional workflow co-pilot, BIR replies, audit defense, client letters | PARKED |
| Phase 10 | Source governance, ingestion workflow, approval, archiving, indexing, rollback | PARKED |
| Phase 11 | Scaling, observability, Terraform/OpenTofu, model comparison | PARKED |
| Phase 12 | Document-aware advisory, client-file intelligence, matter-grounded answers | PARKED |

## 8. Pipeline.js Decomposition Risk Assessment

| Risk area | Assessment | Recommendation |
|---|---|---|
| `runPipeline()` extraction | Catastrophically high. This is the 16-step query pipeline. It cannot be decomposed without a full integration test harness, not just unit tests. | Do not attempt. |
| `classifySourceAvailability` extraction | High. 6+ test files import from pipeline.js directly. Any move requires simultaneous test update and a new destination module. | Defer to Phase 6H minimum. |
| `computeSourceAvailability` extraction | Medium-high. Private; serves internal pipeline stages. No test directly covers it in isolation. | Defer to Phase 6H minimum. |
| Source-card wrapper collapse | Low. Wrappers are one-line delegates. Phase 6F covers the affected source-card behaviors. Risk is limited to confirming pass-through equivalence before collapse. | Recommended for Phase 6G (PATCH-06G-003/004). |
| `fourPartDoctrineTest` extraction | Low. Already exported. Could eventually move to `authority-utils.js` or `authority-engine.js` but there is no urgent reason. | No action needed in Phase 6G. |
| SAE private helper extraction (`_sae*` functions) | Medium. They are tightly coupled to `classifySourceAvailability` and cannot be sensibly extracted before it. | Defer with `classifySourceAvailability`. |
| `patch027n*` / `patch027o*` internal helpers | Medium. These embed business logic (WHT/EWT query guards, court authority checks) that is tested only through `classifySourceAvailability`. | Do not extract separately from `classifySourceAvailability`. |

**Overall pipeline.js decomposition verdict**:

```text
Phase 6G: Wrapper collapse ONLY.
Phase 6H or later: classifySourceAvailability extraction, if justified and a new destination module is designed.
All other pipeline decomposition: NOT RECOMMENDED for Phase 6G.
```

## 9. Source-Authority / Source-Card Boundary Recommendations

1. **source-card-engine.js is the confirmed long-term owner of source-card assembly and finalization helpers**. The six pipeline.js wrappers confirm this. Phase 6G should collapse these wrappers (PATCH-06G-003/004).

2. **The two sanitizers should remain separate**. `source-authority-selector-card-sanitizer.js` sanitizes selector-side output. `ask-handler-public-source-sanitizer.js` sanitizes ask-handler public output. Their call-site scopes are different. Merging before proving behavioral equivalence is high risk.

3. **`classifySourceAvailability` must stay in pipeline.js during Phase 6G**. Its extraction is a Phase 6H concern. A new dedicated module (`source-availability-classifier.js`) is the correct future destination — not `source-visibility-engine.js`.

4. **`source-visibility-engine.js` boundary clarification**: This module owns document utility functions (title, path, authority type, visibility filtering, supersession preflight). It does NOT own SAE classification. Future work should not expand its scope to include `classifySourceAvailability` or `computeSourceAvailability`.

5. **Authority pattern ownership unification** (BIR/NIRC/RR/RMC/RMO/CTA/G.R. matching) should be deferred to Phase 6H after a separate boundary review. The split across `authority-constants.js`, `authority-alias-registry.js`, `services/philippine-tax-boundary-patterns.js`, and `services/tax-concept-aliases.js` is a real risk but does not require immediate action.

## 10. Retrieval / Reranker Boundary Recommendations

1. **retrieval-engine.js is the confirmed retrieval orchestration owner**. At 4,015 lines it is a high-risk file. No Phase 6G edits recommended.

2. **Phase 6E reranker extractions are complete and stable**. No further reranker decomposition is needed in Phase 6G.

3. **vector-authority-keyword-builders.js is complete**. No action needed.

4. **rag-answer-handler.js should not be touched in Phase 6G**. It is part of the retrieval/answer boundary and its behavior is covered by Phase 6F authority/source-card tests — but not with sufficient isolation coverage to support decomposition.

5. **Retrieval / reranker decomposition belongs to Phase 6H**, after Phase 6G planning work is stabilized.

## 11. Mode / Response Boundary Recommendations

1. All `/ask`, `/tax`, and `/audit` response formatting belongs in Phase 7A (Human Conversational Response Layer).
2. Source-limitation wording belongs in Phase 7A. It is user-visible and tone-sensitive.
3. Mode routing and intent detection belong in Phase 7A.
4. No mode or response module should be extracted in Phase 6G.
5. `prompts/audit-mode-prompt.js` belongs to Phase 7A/7B work, not Phase 6G.

## 12. Existing File vs New File Recommendations

| Decision | Recommendation |
|---|---|
| Use `source-card-engine.js` | YES — wrapper collapse target. Already the real owner. |
| Use `authority-restoration-engine.js` | YES — complete and stable. |
| Use `source-authority-selector-eligibility.js` | YES — complete and stable. |
| Use `issue-exact-authority-detector.js` | YES — complete and stable. |
| Use `reranker-normalizers.js` / `reranker-issue-signals.js` | YES — complete and stable. |
| Use `source-visibility-engine.js` for SAE logic | NO — incorrect destination. Name does not match scope. |
| Create `source-availability-classifier.js` | DEFERRED — justified only when `classifySourceAvailability` is ready for extraction (Phase 6H or later). |
| Create a new file in Phase 6G | NOT RECOMMENDED — no unhoused logic justifies a new file during the wrapper collapse phase. |

## 13. Duplicate / Overlap Risks

| Risk | Severity | Recommended resolution |
|---|---|---|
| Six source-card functions exist in BOTH `pipeline.js` (as wrappers) and `source-card-engine.js` (as real implementations) | Low — already resolved by the wrapper adapter pattern; wrappers delegate 100% to the engine | Collapse wrappers (Phase 6G) |
| `computeSourceAvailability` (private, pipeline.js line 1108) vs `classifySourceAvailability` (exported, pipeline.js line 1497) | Medium — two SAE functions with different purposes are both in pipeline.js; no immediate conflict, but naming could confuse future maintainers | Document distinction; do not merge; extract `classifySourceAvailability` separately in Phase 6H |
| Authority pattern matching split across 5 files | Medium — no immediate runtime conflict, but future pattern changes need to touch multiple files | Defer unification review to Phase 6H |
| Mode routing overlap across `command-resolver.js`, `adaptive-mode-engine.js`, `query-intent-engine.js`, and route files | Medium — functional overlap but each file has a different call-site scope | Defer boundary review to Phase 7A |
| Two sanitizers with similar-sounding names | Low — both are correctly scoped by call site | Keep separate; document the call-site distinction before any merge consideration |
| Tax-domain classification split across `main-tax-engine-classification.js`, `tax-classifier.js`, `tax-engines/*`, `services/philippine-tax-domain-boundary.js`, `tax-keywords.js` | Medium — all tax-engine files are expected to have domain-specific logic; this is by design | No action in Phase 6G |

## 14. Circular Dependency Risks

| Candidate move | Circular dependency risk |
|---|---|
| Source-card wrapper collapse in `pipeline.js` | None. `source-card-engine.js` only imports from `source-visibility-engine.js`. No cycle. |
| Moving `classifySourceAvailability` to `source-visibility-engine.js` | New dependency: `source-visibility-engine.js` → `issue-classification-engine.js` (for `hasSemanticNoMatchGuard`, `sourceMaterialTermsMatchAuthority`). Currently `source-visibility-engine.js` does NOT import from `issue-classification-engine.js`. No cycle, but new cross-dependency. Not recommended because destination is wrong. |
| Moving `classifySourceAvailability` to a new `source-availability-classifier.js` | Depends on what it imports. `classifySourceAvailability` uses `hasSemanticNoMatchGuard`, `sourceMaterialTermsMatchAuthority`, `isEwtBridgeEligible` from `issue-classification-engine.js` and several private helper functions from pipeline.js. A clean extraction would need all `_sae*` private helpers to move with it. No circular dependency risk if the new module imports from `issue-classification-engine.js` and `services/source-authority-selector-eligibility.js` only. |
| Any retrieval-engine.js decomposition | High circular risk until the full import graph is mapped. Defer. |
| Any source-authority-selector.js decomposition | Medium risk. It imports from `source-visibility-engine.js`, `issue-classification-engine.js`, `source-authority-selector-card-sanitizer.js`, and `source-authority-selector-eligibility.js`. Any split must not create a cycle with these. Defer to Phase 6H. |

## 15. Evaluation Coverage Adequacy

| Coverage area | Phase 6F test | Adequate for Phase 6G wrapper collapse? |
|---|---|---|
| Authority/source-card regression | `patch-06f-002` | YES |
| CTA / G.R. click-target integrity | `patch-06f-003` | YES |
| Generic-query guard regression | `patch-06f-004` | YES |
| Exact-source limitation wording | `patch-06f-005` | YES |
| Mode-format evaluation | `patch-06f-006` | YES |
| Domain source-card coverage | `patch-06f-007` | YES |
| Evaluation report generator | `patch-06f-008` | YES |
| Source-card engine extraction tests | `patch-06e-002`, `patch-06e-009` | YES — wrapper collapse is a subset of what these cover |
| `classifySourceAvailability` in isolation | Test files inline or import from `pipeline.js` directly | NO — insufficient for extracting the function to a new module |
| `computeSourceAvailability` in isolation | Not covered in isolation | NO — insufficient for any extraction |
| Retrieval orchestration in isolation | Not covered | NO — insufficient for any retrieval decomposition |

**Coverage verdict for Phase 6G wrapper collapse**: ADEQUATE.
**Coverage verdict for `classifySourceAvailability` extraction**: INSUFFICIENT.
**Coverage verdict for retrieval decomposition**: INSUFFICIENT.

## 16. Additional Evaluation Coverage Needed Before Implementation

The following coverage gaps should be filled before the work that requires them:

| Gap | Required before | Recommended coverage patch |
|---|---|---|
| Wrapper equivalence lock: confirm pipeline.js wrappers produce identical output to engine functions | Before wrapper collapse (PATCH-06G-004) | PATCH-06G-003: Focused equivalence tests for all 6 wrapper pairs |
| `classifySourceAvailability` self-contained test suite | Before extracting `classifySourceAvailability` from pipeline.js | Pre-Phase 6H: SAE classifier integration test that imports from its new home after it moves |
| `computeSourceAvailability` isolation tests | Before any attempt to extract or separate | Not Phase 6G work |
| Retrieval step isolation tests | Before any retrieval-engine.js decomposition | Phase 6H pre-work |

## 17. Recommended Phase Placement

| Concern | Recommended phase |
|---|---|
| Source-card wrapper collapse (pipeline.js → source-card-engine.js, calling directly) | **Phase 6G** |
| `classifySourceAvailability` extraction to new dedicated module | **Phase 6H or later** |
| Authority pattern unification across 5 pattern files | **Phase 6H after review** |
| `source-authority-selector.js` decomposition | **Phase 6H after review** |
| Retrieval orchestration decomposition | **Phase 6H or later** |
| Mode routing clarification and extraction | **Phase 7A** |
| `/ask`, `/tax`, `/audit` response formatting | **Phase 7A** |
| Source limitation wording changes | **Phase 7A** |
| Adversarial reasoning / `/audit` prompt work | **Phase 7B** |
| Memory architecture, user/matter/firm learning | **Phase 8** |
| Source governance, ingestion, approval workflows | **Phase 10** |
| Scaling, observability, Terraform/OpenTofu | **Phase 11** |
| Document-aware advisory, client-file intelligence | **Phase 12** |

## 18. Recommended Codex Implementation Sequence

The following sequence is supported by this architecture review. It proceeds from lowest-risk to higher-risk, respects the existing evaluation guard, and makes no behavior changes.

---

**PATCH-06G-003 — Source-card wrapper equivalence test lock**

Purpose: Write a focused test that confirms the six pipeline.js wrapper functions produce identical output to their source-card-engine.js counterparts for the full range of source-card inputs.

Scope: Test file only. No runtime code change. No pipeline.js edit.

Why first: Locks the equivalence contract before collapsing the wrappers. Phase 6F provides coverage of behaviors but does not explicitly test wrapper-vs-engine equivalence at the unit level.

Risk: Low (test only).

Required before: PATCH-06G-004.

---

**PATCH-06G-004 — Source-card wrapper collapse in pipeline.js**

Purpose: Remove the six one-line wrapper functions from pipeline.js and update all internal callers to reference the engine imports directly.

Scope: `pipeline.js` only. Six function removals, internal caller updates.

Why safe: Real implementation is already in `source-card-engine.js`. Wrappers are 100% pass-throughs. Phase 6F + PATCH-06G-003 provide the guard.

Required guard: Full Phase 6F run before and after the change.

Risk: Low-medium (pipeline.js is touched, but only wrappers are removed; no business logic changes).

Express approval: This review approves this single pipeline.js touch only, subject to PATCH-06G-003 equivalence test passing.

---

**PATCH-06G-005 — Source-availability boundary documentation hardening**

Purpose: Document the two SAE functions in pipeline.js (`computeSourceAvailability` and `classifySourceAvailability`) with explicit ownership comments and future extraction pre-conditions. No code behavior change. No module move.

Scope: Comments only in `pipeline.js`. Optionally, a reference document.

Why: Reduces confusion for future maintainers about the naming of these functions and their relationship to `source-visibility-engine.js`.

Risk: Negligible (comments only).

---

**PATCH-06G-GATE-1 — Phase 6G Stabilization Gate**

Purpose: Confirm that PATCH-06G-003 and PATCH-06G-004 passed without regression. Verify npm test (full suite), npm run guard:files, and staging health. Close Phase 6G if all pass.

Scope: Validation only.

---

**DEFERRED: PATCH-06H-001 — `classifySourceAvailability` extraction planning**

This is Phase 6H work, not Phase 6G. It requires:
1. A new dedicated module (`source-availability-classifier.js`).
2. Updating all test file imports from `pipeline.js` to the new module.
3. Moving all `_sae*` private helpers that `classifySourceAvailability` depends on.
4. Updating `pipeline.js` to import from the new module.
5. Full Phase 6F + Phase 6H evaluation run.

Do not begin this until Phase 6G is closed.

## 19. Things Not To Do

| What | Why |
|---|---|
| Move `classifySourceAvailability` to `source-visibility-engine.js` | Wrong destination. Name mismatch. Would contaminate the utility/display module. |
| Extract `computeSourceAvailability` without `classifySourceAvailability` | Private function; tightly coupled. No isolated test coverage. |
| Touch `pipeline.js` beyond wrapper collapse | All other pipeline internals have insufficient isolated coverage and high blast radius. |
| Merge the two source-card sanitizers | Call-site scopes are different. Merging before equivalence is proven is high risk to public source-card output. |
| Extract `source-authority-selector.js` in Phase 6G | 901 lines with multi-file imports. Requires Phase 6H boundary review first. |
| Touch `retrieval-engine.js`, `rag-answer-handler.js`, or `vector-store.js` | High blast radius. Phase 6H or later minimum. No isolated coverage exists. |
| Start Phase 7A response or mode work during Phase 6G | Separate concern. Mode/response changes are user-visible. They require a coordinated human response layer review. |
| Create new modules in Phase 6G without an identified unhoused logic cluster | No unhoused logic has been identified that cannot fit in an existing extracted module. |
| Merge authority pattern files without a Phase 6H boundary review | Five files, multiple call sites. Pattern unification needs a dedicated review pass. |
| Change prompts, route handlers, or response templates | These are behavior-visible. Out of scope for Phase 6G. |

## 20. Final Architecture Recommendation

**PATCH-06G-001 inventory is CONFIRMED VALID** with three amendments:

1. `classifySourceAvailability` is exported from `pipeline.js` and directly imported by at least 6 test files. This was not called out explicitly in the inventory and is the primary extraction constraint for SAE classification.

2. There are two distinct SAE functions in `pipeline.js` (`computeSourceAvailability` private, `classifySourceAvailability` exported). These are not the same function and must be treated separately in any future extraction.

3. `source-visibility-engine.js` is a utility/display module, not a SAE classifier. It is NOT the correct destination for `classifySourceAvailability` if it is ever extracted. The correct future destination is a new dedicated module (`source-availability-classifier.js`), deferred to Phase 6H.

**Source-card engine wrapper collapse is the only safe Phase 6G decomposition work**:

The wrapper adapter pattern in pipeline.js (six one-line delegate functions pointing to source-card-engine.js) is the lowest-risk next step. It involves touching pipeline.js minimally, with no business logic change, covered by Phase 6F and a new equivalence test.

**All other decomposition is deferred**:

- `classifySourceAvailability`: Phase 6H minimum.
- Retrieval orchestration: Phase 6H minimum.
- Mode/response formatting: Phase 7A.
- All future phases: as documented in Section 17.

**Phase 6G closes after**:

- PATCH-06G-003: Equivalence test lock (test only)
- PATCH-06G-004: Wrapper collapse (pipeline.js wrappers removed, callers point to engine)
- PATCH-06G-005: SAE boundary documentation
- PATCH-06G-GATE-1: Stabilization gate

**Final recommendation**:

```text
PATCH-06G-001 CONFIRMED: inventory and destination map are valid with amendments.
PATCH-06G-002 COMPLETE: architecture review confirms wrapper collapse is the safe Phase 6G path.
PATCH-06G-003 is the recommended next Codex task.
```

---

## Appendix: Key File Metrics at Review Time

| File | Lines | Status |
|---|---|---|
| `pipeline.js` | 4,841 | HIGH RISK — wrapper collapse only in Phase 6G |
| `retrieval-engine.js` | 4,015 | HIGH RISK — Phase 6H or later |
| `ask-handler.js` | 3,276 | HIGH RISK — Phase 7A |
| `answer-renderer.js` | 1,936 | HIGH RISK — Phase 7A |
| `reranker-engine.js` | 1,362 | MEDIUM — Phase 6E helpers complete; no further Phase 6G action |
| `authority-utils.js` | 1,344 | MEDIUM — Phase 6H pattern review |
| `source-visibility-engine.js` | 2,068 | MEDIUM — utility module; not SAE classifier; no Phase 6G action |
| `issue-classification-engine.js` | 2,065 | HIGH RISK — generic guard and BIR Ruling guard; do not decompose in Phase 6G |
| `services/source-authority-selector.js` | 901 | MEDIUM — Phase 6H after review |
| `source-card-engine.js` | 203 | SAFE — wrapper collapse destination |
| `authority-restoration-engine.js` | 73 | COMPLETE — no action needed |

## Appendix: Test Suite State at Review Time

```text
npm test
10 syntax checks: PASS
73 test suites: PASS
0 failures
GATE PASSED

npm run guard:files
PASS — no protected files modified
```
