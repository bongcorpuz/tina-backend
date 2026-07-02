# PATCH-07B-CLARIFICATION-LIVE-DESIGN-1 — Live Clarification Route/Prompt Integration Design

## 1. Objective

Specify, without implementing, exactly how the completed Phase 7B ten-helper clarification reasoning chain will later be wired into the live `runPipeline()` request flow for `/ask`, `/tax`, and `/audit`. This design fixes the insertion point, the feature-flag contract, the answer-blocking rule, the `structuredClarificationObject` prompt-consumption shape, the `responseType` contract, per-mode behavior, error/rollback handling, and the future implementation/test/staging plan. It changes no runtime behavior.

## 2. Scope

Design-only. This patch adds one design report and one continuity update to `knowledge/CURRENT_STATE.md`. It does not modify routes, `ask-handler.js`, `pipeline.js`, `context-orchestration-engine.js`, prompt files, `answer-renderer.js`, any helper implementation, retrieval/reranker/sourceAvailability/source-card behavior, DB/vector/corpus/indexing/ingestion, frontend, or dependencies. No Phase 8/9/10/11/12 work. No court-case metadata, hallucination fixes, or jurisprudence applicability.

## 3. Current Phase 7B Closure State

The ten-helper chain is complete, composition-gated, and formally closed but unwired:

1. `issue-framing-engine.js`
2. `reasoning-safety-policy.js`
3. `fact-gap-helper.js`
4. `client-fact-checklist-output.js`
5. `authority-applicability-helper.js`
6. `adversarial-content-safety-policy.js`
7. `bir-vs-taxpayer-position-helper.js`
8. `audit-risk-language-helper.js`
9. `clarification-boundary-policy.js` (exports `assessClarificationNeed`, `buildClarificationChecklist`)
10. `clarification-route-orchestrator-helper.js` (exports `buildClarificationRouteDecision`, `normalizeClarificationResponseType`, `shouldBlockFullAnswerGeneration`)

The route/helper workstream closed at PATCH-07B-CLARIFICATION-FINAL-GATE-2 (commit `ad57e09`). No helper is imported by any route, handler, pipeline, or prompt file.

## 4. Gemini Review 15 Carry-Forward

Gemini Review 15 (PASS WITH STRICT RECOMMENDATIONS) approved the route-orchestrator helper and directed that live wiring proceed only after an explicit live-integration design (this patch) and a further mandatory Gemini review (Review 16). The carried-forward strict constraints are: feature-flag OFF by default with byte-identical OFF behavior; blocking is driven solely by `answerAllowed === false`; no raw document text into the prompt; source-card and verified-authority gates preserved; and `/audit` never emits protest/settlement/CTA strategy.

## 5. Existing Live Pipeline Map

Verified from source (`LIVE EVIDENCE > THEORY`):

- **Routes** `routes/ask-route.js`, `routes/tax-route.js`, `routes/audit-route.js` are thin; each does `router.post("/", authenticate, attachForcedHook("/ask"|"/tax"|"/audit"), askHandler)`. All three converge on one shared `askHandler`.
- **`ask-handler.js`** (v9.0.0, ~3277 lines) is a "route controller only": resolves hook/mode (`loadTaxHookConfig` → `buildHardcodedHookConfig`), then calls `runPipeline` (`pipeline.js`). It explicitly does not assemble prompts or call OpenAI. It owns the route-level timeout/error fallbacks (`buildRouteTimeoutFallback`, `buildPipelineErrorFallback`), both of which already pass their fallback text through `applyVerifiedAuthorityGate`.
- **`pipeline.js#runPipeline`** (from ~1594) runs a numbered 16-step sequence:
  - Step 1 Issue Classification (~1704)
  - Step 5 Retrieval (~1758), Step 5.5 compact set (~2471), Step 6 Reranker (~2604)
  - **Step 6.5 sourceAvailabilityClassification (~2650)** → `classifySourceAvailability` sets `ctx.sourceAvailability`, `ctx.saeStatus`, `ctx.limitationRequired`, `ctx.disclosureType`, `ctx.statusReason`, `ctx.eligibleCandidates`, `ctx.suppressedCandidates`.
  - Step 6.6 Pre-Generation Authority Lock (~2726) — existing pre-generation gate precedent.
  - Step 12 Risk Scoring (~3105) → `ctx.riskScore`; Step 12.5 Adaptive Response Plan `/ask` only (~3119) → `ctx.responsePlan`.
  - **Step 13 Build Adaptive Master Prompt (~3147)** → `ctx.promptContract = buildAdaptivePromptContract(ctx.mode, {...})`.
  - **Step 14 OpenAI Completion (~3289)** → `callOpenAIWithOrchestration(...)` (context-orchestration-engine.js).
  - Step 15 Format Answer (~3644) → `renderTinaAnswer({...})`; Step 16 Final Compliance (~3679) → `enforceFinalAnswerCompliance`, then PATCH-024A `buildSaeHardFailFallback(ctx)` (defined at ~130) — existing pre/post-generation safe early-exit return-object precedent.
- **Prompt construction**: `pipeline.js` Step 13 `buildAdaptivePromptContract` + `context-orchestration-engine.js#buildOpenAIContext` / `callOpenAIWithOrchestration` + `prompts/tax-mode-prompt.js`, `prompts/audit-mode-prompt.js`, `adaptive-tina-master-prompt.js`.
- **Terminal authority gate**: `answer-renderer.js#applyVerifiedAuthorityGate`.

## 6. Confirmed Exact Insertion Point

**A new Step 12.6 inside `runPipeline`, between the end of Step 12.5 (~line 3145) and the start of Step 13 `buildAdaptivePromptContract` (~line 3147).**

At that location the full input set the chain needs is materialized: `ctx.saeStatus` / `ctx.sourceAvailability` (Step 6.5), `ctx.issueClassification` (Step 1), `ctx.rerankedChunks` / `ctx.eligibleCandidates` (Steps 6–6.5), `ctx.riskScore` (Step 12), `ctx.responsePlan` (Step 12.5), `ctx.limitationRequired` / `ctx.disclosureType` / `ctx.statusReason`. Generation (Step 14) is strictly downstream, so a decision here can prevent prompt build and OpenAI call. This mirrors two existing idioms: the Step 6.6 pre-generation gate and the Step 12.5 mode-conditional pre-prompt planner. This confirms Required Decision A: after Step 6.5 SAE, before Step 13 prompt construction, before Step 14 OpenAI generation.

## 7. Future Files Likely to Change (in the later wiring patch, not now)

- `pipeline.js` — add flag-gated Step 12.6 block (compute chain → `buildClarificationRouteDecision`), and an early-exit branch returning a clarification-only result before Step 13; add `structuredClarificationObject` into the `buildAdaptivePromptContract` options for non-blocking cases.
- `context-orchestration-engine.js#buildOpenAIContext` — accept and thread `structuredClarificationObject` as compact constraint metadata (only when present).
- Possibly `ask-handler.js` — only if the clarification-only result needs a distinct passthrough shape at the controller boundary (prefer keeping it inside `runPipeline`'s existing return contract to minimize surface).
- A new env-flag read (see §9), read once inside `runPipeline` or passed from `ask-handler.js`.

No new helper files are needed — the ten helpers exist. `buildClarificationRouteDecision` already emits `INSERTION_POINT = "RUNPIPELINE_AFTER_STEP_6_5_BEFORE_STEP_13_14"` and the OFF/ON contract.

## 8. Files That Must Not Change in First Live Wiring Patch

`prompts/*` (behavior), `answer-renderer.js` (authority gate), all ten helper implementations, retrieval/reranker/`classifySourceAvailability` behavior, source-card selection/rendering, DB/vector/corpus/indexing/ingestion, `package.json`/`package-lock.json`, frontend, and all deferred Phase 10 assets. The wiring patch touches only the flag read, the Step 12.6 block, the early-exit branch, and the additive prompt-metadata threading.

## 9. Feature Flag Design

No existing `process.env.TINA_*` / `ENABLE_*` / `FEATURE_*` flag convention exists in the repo (verified by grep). Introduce a new one:

**`TINA_ENABLE_CLARIFICATION_ROUTE_GATE`**

- Default **OFF**. Missing env → OFF. Any value not exactly `"true"` (case-insensitive, trimmed) → OFF. Only `"true"` → ON.
- Read once and coerced to a boolean `featureFlagEnabled` passed into `buildClarificationRouteDecision({ featureFlagEnabled, ... })`.
- OFF must not instantiate the chain or the route branch. In the helper, `featureFlagEnabled !== true` already returns `{ enabled:false, routeBranchActive:false, responseType:"answer", shouldBuildFullAnswerPrompt:true, shouldCallOpenAIForFullAnswer:true, structuredClarificationObject:null }` — a pure passthrough. The wiring patch must additionally guard the *invocation* of Steps’ chain computation so OFF does zero extra work (do not even run the nine upstream helpers when OFF).

## 10. OFF-State Byte-Identical Proof Plan

Tests asserting, with the flag unset and set to `"false"`/`"0"`/garbage:

- Same route response object shape/keys as pre-patch (snapshot compare).
- Step 13 `buildAdaptivePromptContract` is reached and Step 14 `callOpenAIWithOrchestration` is called exactly as before (spy/mahal count = 1 OpenAI call on a normal query).
- No `structuredClarificationObject` field present; no `responseType` field added.
- No early exit occurs for any authority state.
- No source-card mutation (compare `sourceCards` before/after).
- No new frontend field emitted.
- `/ask`, `/tax`, `/audit` each produce identical rendered-answer shape vs. a pre-patch baseline.

Mechanism: because OFF must skip the entire Step 12.6 block, the strongest proof is a wiring guard `if (featureFlagEnabled) { ...Step 12.6... }` with a test confirming the block is not entered (e.g. a trace step `12.6` is absent from `trace.steps` when OFF).

## 11. ON-State Controlled Behavior Design

When `featureFlagEnabled === true`, at Step 12.6:

1. Build upstream helper outputs from `ctx` (see §12–§14).
2. Compute `clarificationResult = assessClarificationNeed(mappedInput)` (helper 9).
3. Compute `routeDecision = buildClarificationRouteDecision({ featureFlagEnabled:true, mode, clarificationResult, sourceAvailabilityState, authorityState, sourceCards, sourceCoverageNeeds, retrievalContext, knownFacts, helperOutputs })` (helper 10).
4. If `routeDecision.shouldBuildFullAnswerPrompt === false` or `routeDecision.shouldCallOpenAIForFullAnswer === false` (i.e. `answerAllowed === false`): early-exit with the clarification-only response (§15); do not run Steps 13/14.
5. Otherwise: continue to Step 13, passing `routeDecision.structuredClarificationObject` as additive constraint metadata into `buildAdaptivePromptContract`; preserve source cards and `applyVerifiedAuthorityGate`; preserve Phase 7A mode formatting.

## 12. Ten-Helper Chain Invocation Design

Invocation order at Step 12.6 (all deterministic, no OpenAI):

1. `frameTaxIssue` — from `query` (+ `ctx.issueClassification` as optional hints).
2. `applyReasoningSafetyPolicy` — from `mode`, `authorityState`.
3. `identifyFactGaps` — from `query` + issue frame.
4. `buildClientFactChecklistOutput` — from fact-gap + issue frame.
5. `assessAuthorityApplicability` — from `authorityState`, `sourceCoverageNeeds`, fact-gap.
6. `applyAdversarialContentSafetyPolicy` — safety envelope.
7. `assessBirTaxpayerPositions` — only meaningful for `/audit`/position queries; safe no-op otherwise.
8. `assessQualitativeAuditRisk` — qualitative label; `/audit`-oriented.
9. `assessClarificationNeed` — aggregates 1–8 into a decision.
10. `buildClarificationRouteDecision` — wraps 9 into the route contract + `structuredClarificationObject`.

**Missing-input finding (honest):** the live pipeline does **not** extract structured user facts (`knownFacts`, taxpayer type, period, documents) — it operates on `query` text + retrieval. The helper chain already tolerates this: every helper accepts `query` and treats absent `knownFacts`/`missingUserFacts` as "unknown," which conservatively drives *more* clarification, not less. **Safe deterministic mapping (no speculative runtime change):**

- `mode` ← `ctx.mode`/`hook` normalized (`/ask|/tax|/audit`).
- `query` ← the clean user question already in `ctx`.
- `authorityState` ← deterministic map from `ctx.saeStatus`: `AUTHORITY_FOUND→AUTHORITY_FOUND`, `RELATED_AUTHORITY_ONLY→RELATED_AUTHORITY_ONLY`, `NO_INDEXED_SOURCE→NO_INDEXED_SOURCE`, everything else general → `GENERAL_TAX`. **Non-answer SAE states** (`RETRIEVAL_TIMEOUT`, `PIPELINE_ERROR`, `SOURCE_LOOKUP_EMPTY`) must **bypass clarification entirely** and fall through to the existing timeout/error/hard-fail fallbacks — clarification must never mask an infrastructure failure as a "clarification."
- `sourceAvailabilityState` ← `ctx.saeStatus`.
- `sourceCoverageNeeds` ← derived from `ctx.sourceAvailability` (reason/limitation), not invented.
- `sourceCards` ← compacted `ctx.rerankedChunks`/`ctx.eligibleCandidates` (helper 10 already strips raw text via `RAW_TEXT_KEYS` and keeps only `COMPACT_SOURCE_CARD_FIELDS`).
- `knownFacts` ← left empty/`{}` (no fact extractor is built; helper 10 runs `compactMetadata` over it defensively).

No new fact-extraction engine is introduced; that would be a speculative Phase 8-like change and is out of scope.

## 13. SourceAvailability / SAE Dependency Design

The chain runs strictly after Step 6.5, so `ctx.saeStatus`/`ctx.sourceAvailability` are authoritative inputs, never recomputed. The SAE→authorityState map in §12 is the only transform. `RETRIEVAL_TIMEOUT`/`PIPELINE_ERROR`/`SOURCE_LOOKUP_EMPTY` short-circuit past clarification to existing fallbacks. No change to `classifySourceAvailability`, controllingAuthorities, or source-card selection.

## 14. structuredClarificationObject Construction Flow

`buildClarificationRouteDecision` already produces `structuredClarificationObject` with: `mode`, `decision`, `responseType`, `answerAllowed`, `canReachFinalConclusion` (forced false when blocked), `allowedAnswerPosture`, `prohibitedConclusions` (merged with the helper's hardened list), `sourceCoverageLimitations`, `phase10Deferrals`, `questions` (capped to 3), `documentRequests`, `sourceAvailabilityState`, `authorityState`, `sourceCoverageNeeds`, compacted `sourceCards`, `retrievalContext` (raw-text-stripped), `knownFacts` (compacted), `helperOutputsSummary` (summary only, no raw bodies), and `renderingHints`. The wiring patch consumes this object as-is; it does not re-derive any field.

## 15. answerAllowed False Early-Exit Design

When blocked, `runPipeline` returns a clarification-only result mirroring the existing `buildSaeHardFailFallback(ctx)` early-exit shape (so the controller/renderer contract is unchanged), with:

```
{
  responseType: "clarification",
  answerAllowed: false,
  answer: <safe clarification text rendered from questions/limitations, gated by applyVerifiedAuthorityGate>,
  questions: <=3,
  documentRequests: [...],            // if applicable
  allowedAnswerPosture: "NO_ANSWER_UNTIL_CLARIFIED",
  prohibitedConclusions: [...],
  sourceCoverageLimitations: [...],
  phase10Deferrals: [...],
  sourceCards: [...],                 // preserved if available; no mutation
  sourceAvailability: ctx.sourceAvailability,
  saeStatus: ctx.saeStatus,
  structuredClarificationObject: <full object>
}
```

No fake citations (the answer text passes `applyVerifiedAuthorityGate`); no full legal/tax/audit conclusion; Steps 13/14 are not executed.

## 16. Prompt Construction Constraint Design

For non-blocking cases, `structuredClarificationObject` is passed into `buildAdaptivePromptContract` (Step 13) and threaded through `buildOpenAIContext` as **compact constraint metadata**, never raw strings and never raw document text (`RAW_TEXT_KEYS` already excluded). The prompt contract must surface, as structured constraints: `allowedAnswerPosture`, `prohibitedConclusions`, `sourceCoverageLimitations`, `phase10Deferrals`, `documentRequests`, `questions`, and the mode boundary. `canReachFinalConclusion:false` (when set) forbids a final conclusion. The existing authority-hierarchy and source-limitation prompt behavior is preserved; clarification metadata is additive only.

## 17. DISCLOSE_SOURCE_LIMITATION Handling

`answerAllowed === true` (per helper): non-blocking. `responseType: "source_limited_orientation"`. Answer proceeds with source-limited orientation posture; source-limitation wording preserved (reuse existing PATCH-07A-008 renderer wording). The user is **not** asked to search the law or supply governing authority (helper enforces via prohibited-conclusions + `UNSAFE_REQUEST_PATTERN`). If a future case sets `answerAllowed === false`, it early-exits as clarification-only.

## 18. DISCLOSE_PHASE10_DEFERRAL Handling

`answerAllowed === true`: non-blocking. `responseType: "phase10_deferred_orientation"`. Answer proceeds with Phase 10 deferral disclosure; the user is **not** asked to determine currentness/supersession/hierarchy/source metadata (helper zeroes `questions` and `sourceCoverageLimitations` for this decision and lists deferrals instead). No court-case metadata, freshness, or supersession logic is invoked (Phase 10).

## 19. REQUEST_DOCUMENTS Handling

`answerAllowed === true`: non-blocking, cautious answer proceeds. `responseType: "document_request_with_cautious_answer"`. `documentRequests` rendered as a document-request section; each request is a paper ask, never a legal test (helper's `UNSAFE_REQUEST_PATTERN` and `SENSITIVE_IDENTIFIER_PATTERN` already filter unsafe/PII asks). No TIN/bank/personal-identifier requests.

## 20. ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP Handling

Non-blocking. `responseType: "answer_with_followup"`. Full answer proceeds under `CAUTIOUS_ANSWER_WITH_OPEN_ITEMS` posture; `questions` (≤3) injected as follow-up constraints; no final conclusion where the helper set `canReachFinalConclusion:false`.

## 21. ANSWER_NOW_NO_CLARIFICATION_NEEDED Handling

Non-blocking. `responseType: "answer"`. Normal Step 13/14 answer generation, still bounded by source cards, `applyVerifiedAuthorityGate`, and non-conclusion rules. Behaviorally closest to current pipeline output.

## 22. ResponseType Contract Design

Backend may safely emit `responseType ∈ { clarification, answer_with_followup, document_request_with_cautious_answer, source_limited_orientation, phase10_deferred_orientation, answer }` (helper's `RESPONSE_TYPES`). It is additive metadata; when the flag is OFF the field is absent (byte-identical). Frontend treatment is **deferred**: until the frontend is updated, all six should degrade gracefully to today's answer rendering (the `answer`/`answer_with_followup`/orientation types already carry answer text; `clarification` carries a safe answer string too). A later, separately-gated frontend design will add explicit clarification UI.

## 23. /ask Mode Contract

Conversational; ≤3 clarification questions (`renderingHints.maxQuestions = 3`); no senior-memo requirement; orientation allowed when `answerAllowed`. `clarification` early-exit renders a short conversational question set.

## 24. /tax Mode Contract

Senior-memo format preserved (`renderingHints.format = "senior_memo"`, `noFinalOpinionWhenClarificationRequired: true`); no final tax opinion when clarification is required; source-limitation wording preserved; ≤3 questions surfaced in the memo's facts-needed section.

## 25. /audit Mode Contract

Procedural-first (`renderingHints.format = "procedural_first"`, `noProtestSettlementCTAWhenClarificationRequired: true`); no protest/settlement/CTA/litigation strategy (enforced by both the clarification helper's `/audit` prohibited list and helper 10's `PROHIBITED_CONCLUSIONS`); no "assessment is void" conclusion; procedural-stage facts asked first.

## 26. Response Rendering Design

Non-blocking answers render through the existing Step 15 `renderTinaAnswer` + Step 16 `enforceFinalAnswerCompliance` + `applyVerifiedAuthorityGate` unchanged, with clarification sections added by the prompt contract. Blocking (`clarification`) responses bypass Steps 13/14 and return the §15 object; their `answer` text still passes `applyVerifiedAuthorityGate`. No renderer file behavior change is required for the first wiring patch beyond consuming the additive metadata.

## 27. Frontend Impact Assessment

The only new backend field is `responseType` (+ optional `structuredClarificationObject` for debugging). No frontend change is required for OFF (field absent). For ON, existing frontend continues to render `answer` text for all types (graceful degradation). A dedicated clarification UI (question chips, document-request panel) is a **later, separately-gated** frontend design — not this patch, not the first wiring patch unless expressly approved.

## 28. Source Card Preservation Design

Source cards are read-only inputs to the chain; helper 10 compacts them (keeps `COMPACT_SOURCE_CARD_FIELDS`, strips `RAW_TEXT_KEYS`) for the structured object but the pipeline's own `ctx.rerankedChunks`/source-card finalization path is untouched. Blocking responses still carry `sourceCards`. No source-card selection, ordering, URL, or click-target behavior changes.

## 29. Citation / Authority Integrity Boundary

`sourceAvailability`, controllingAuthorities, source cards, and `applyVerifiedAuthorityGate` are all preserved and never bypassed. Clarification runs upstream of the gate; the gate remains the terminal guard on any emitted answer (including the clarification-only fallback text). The chain fabricates no citations (adversarial-content-safety + verified-authority gate).

## 30. Phase 10 Deferral Boundary

Phase 10 flags are disclosed, never resolved and never turned into user questions. No currentness/supersession/hierarchy/effective-date/source-metadata/court-case logic is invoked. `DISCLOSE_PHASE10_DEFERRAL` lists deferrals and continues with a cautious answer.

## 31. Error Handling / Safe Fallback Design

- Flag OFF: zero impact (block not entered).
- Flag ON, chain throws: **fail safe** — catch inside the Step 12.6 block, log via the existing `trace.warnings`/checkpoint pattern (no stack trace to user), and **fall through to the normal answer path** (Step 13/14) as if clarification were absent for that request (equivalent to a transient OFF for that request). This never hallucinates and never blocks on error.
- Non-answer SAE (`RETRIEVAL_TIMEOUT`/`PIPELINE_ERROR`/`SOURCE_LOOKUP_EMPTY`): bypass clarification; existing `buildRouteTimeoutFallback`/`buildPipelineErrorFallback`/`buildSaeHardFailFallback` handle it.

## 32. Rollback Plan

- Set `TINA_ENABLE_CLARIFICATION_ROUTE_GATE` OFF (or unset) — instant, no deploy needed if env-configurable.
- No DB, corpus, vector, or index rollback needed (none touched).
- No frontend rollback needed (frontend not touched).
- If code-level revert required: revert the single wiring commit (`PATCH-07B-CLARIFICATION-LIVE-WIRING-1`); helpers and this design remain intact.

## 33. Future Implementation Patch Scope

**PATCH-07B-CLARIFICATION-LIVE-WIRING-1 — Narrow Live Clarification Route Wiring (Agent: Codex), after Gemini Review 16.** Strict scope: (a) add `TINA_ENABLE_CLARIFICATION_ROUTE_GATE` read; (b) add flag-gated Step 12.6 block computing the ten-helper chain + `buildClarificationRouteDecision`; (c) early-exit for `answerAllowed === false`; (d) thread `structuredClarificationObject` into `buildAdaptivePromptContract`/`buildOpenAIContext` for non-blocking cases; (e) SAE→authorityState map + non-answer-SAE bypass; (f) fail-safe try/catch. No frontend, no Phase 10, no new helper, no prompt-wording change, no dependency.

## 34. Future Test Plan

- OFF-state route regression: flag unset/`false`/garbage → byte-identical shape; Step 12.6 not entered; exactly one OpenAI call on a normal query; no `responseType`/`structuredClarificationObject`.
- ON blocking: `answerAllowed:false` → `responseType:"clarification"`, Steps 13/14 not executed (assert no `buildAdaptivePromptContract` / no `callOpenAIWithOrchestration`), ≤3 questions, source cards preserved, answer text passes authority gate.
- ON non-blocking source limitation / Phase 10 deferral / request documents / cautious-followup / answer-now — one test each, asserting responseType + constraint threading + no prohibited strategy language.
- `/ask`, `/tax`, `/audit` mode coverage (question cap, memo format, procedural-first, no protest/settlement/CTA).
- No raw document text in `structuredClarificationObject` (assert `RAW_TEXT_KEYS` absent).
- No Phase 10 resolution leakage; no fake citation.
- Fail-safe: chain throw → falls through to normal answer path.
- Guard test: wiring patch changes only intended files.

## 35. Required Staging Smoke Plan

On `tina-backend-staging`: (1) flag OFF baseline — run representative `/ask`, `/tax`, `/audit` queries, confirm unchanged answers and source cards; (2) flag ON — run a gating-fact query (expect `clarification`, blocked), a `NO_INDEXED_SOURCE` query (expect `source_limited_orientation`, non-blocked), and a normal query (expect `answer`); confirm no source-card loss, no frontend breakage (graceful degradation), safe blocked-response shape, and that the normal answer path still works; (3) flip flag OFF and re-confirm baseline.

## 36. Required Release Gate Plan

Focused clarification + route tests, full `npm test`, `npm run guard:files`, staging smoke (both flag states), rollback confirmation (flag OFF restores baseline), and Gemini or Claude review of the wiring diff. Ship flag OFF; enable only after smoke passes.

## 37. Risks and Mitigations

- **Generation not blocked** (highest): insertion is before Step 13; blocking driven solely by `answerAllowed===false`; test asserts Steps 13/14 skipped. Mitigated.
- **OFF not byte-identical**: guard the entire Step 12.6 block behind the flag; snapshot regression. Mitigated.
- **Prompt over-injection / raw text**: helper 10 strips `RAW_TEXT_KEYS`, compacts, caps questions to 3; pass structured metadata only. Mitigated.
- **SAE masking infra failure**: non-answer SAE states bypass clarification to existing fallbacks. Mitigated.
- **Missing structured facts** → over-clarification: acceptable (conservative, asks rather than concludes); no fact-extractor invented. Accepted.
- **`/audit` strategy leakage**: dual prohibition (clarification helper + helper 10). Mitigated.
- **Frontend not ready**: graceful degradation to answer text; explicit UI deferred. Mitigated.
- **Chain error**: fail-safe fall-through, no hallucination. Mitigated.

## 38. Required Fixes Before Implementation

None blocking. Recommendations to resolve during the wiring patch (not now): (1) finalize the SAE→authorityState map incl. non-answer states as a small pure function; (2) decide the exact clarification-only `answer` text template (must pass `applyVerifiedAuthorityGate`); (3) confirm `buildAdaptivePromptContract` can accept an additive optional `structuredClarificationObject` arg without altering existing callers (additive, defaulted). These are implementation details, not design blockers.

## 39. Recommended Next Task

**PATCH-07B-GEMINI-REVIEW-16 — Live Clarification Route/Prompt Integration Design Review** (reviewer: Gemini), before any live route wiring.

## 40. Gemini Review 16 Requirement

Mandatory before implementation. Gemini should confirm: insertion at Step 12.6 (after 6.5, before 13/14); `answerAllowed===false` as the sole blocking trigger; feature-flag OFF byte-identical guarantee and OFF-skips-the-block requirement; the SAE→authorityState map incl. non-answer-state bypass; no raw text / no fake citation / no Phase 10 resolution; `/audit` no-strategy; graceful frontend degradation; and fail-safe error fall-through.

## 41. Final Recommendation

The live pipeline is fully mapped, the insertion point is exact and precedented, the ten-helper contract already encodes the OFF/ON and blocking semantics, and every safety boundary maps to an existing gate. The one honest limitation — no structured user-fact extraction in the live pipeline — is safe because it biases toward asking, not concluding, and requires no speculative runtime change.

**DESIGN PASS WITH RECOMMENDATIONS — READY FOR GEMINI REVIEW 16.**
