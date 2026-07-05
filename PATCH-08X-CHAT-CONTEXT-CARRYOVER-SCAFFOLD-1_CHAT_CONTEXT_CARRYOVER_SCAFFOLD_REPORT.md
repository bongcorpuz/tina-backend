# PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1 — Pure Follow-Up Rewrite Helper Scaffold Report

## 1. Patch name and purpose

**Patch:** PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1

**Purpose:** Implement the **pure helper layer only** for bounded short-term
chat/session context carryover — a deterministic `standaloneQuery` / follow-up
rewrite helper that a **later** patch can wire before issue classification and
retrieval. This patch adds no runtime wiring and changes no live behavior.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `dae4128 PATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1 design short-term context carryover`
- **Working tree:** clean except the four known deferred untracked paths.
- **Phase 8:** closed. **Phase 8S:** closed. **08X diagnostic + design:** complete.
  **Phase 9:** not started. **Memory:** inactive.

## 3. Diagnostic / design basis

Per the 08X diagnostic (`38d5b9e`), classification and retrieval are
current-query-only (root cause **CLASSIFICATION_CONTEXT_GAP + RETRIEVAL_REWRITE_GAP**),
and the prompt was not the root cause. Per the 08X design (`dae4128`), the fix is
a bounded `standaloneQuery` / rewrite stage run **before** classification and
retrieval, fed by bounded recent turns of the active conversation/session only —
not persistent memory. This patch builds that helper as a pure module.

## 4. Helper created

`helpers/chat-context-carryover.js` — a pure ESM module (new `helpers/`
directory). No I/O, no network, no env reads, no logging of recent turns, no
persistence, no runtime imports; never mutates inputs; returns frozen decision
objects.

## 5. Helper API

Exported pure functions: `normalizeText`, `boundRecentTurns`, `detectReset`,
`detectJurisdictionSwitch`, `detectFollowUp`, `extractPriorTaxContext`,
`buildStandaloneQuery`, `buildContextCarryoverDecision`, and the top-level
`buildShortTermContextCarryover({ currentQuery, recentTurns, activeConversationId,
maxRewriteTurns, jurisdictionDefault })`.

Return object: `{ applied, reason, confidence, originalQuery, standaloneQuery,
inheritedIssueType, inheritedTaxType, inheritedJurisdiction, sourceTurnIndexes,
riskFlags, fallbackClarification, boundedTurnCount, memoryBoundary:
{ persistentMemoryUsed: false, durableWriteRequired: false } }`.

## 6. Behavior summary

`originalQuery` is always preserved; when no rewrite is applied,
`standaloneQuery === originalQuery`. Recent turns are bounded (default 6, hard max
20) and tolerate `{role,content}`, `{sender,message}`, and `{type,text}` shapes
without mutation. Follow-up detection strips elliptical prefixes ("how about",
"what about", "same with", "and", "does that apply to", "what if …") to extract
the subject. Prior tax context is scanned newest-first for VAT / EWT / withholding
tax / NOLCO / MCIT / PEZA zero-rating / percentage tax / income tax signals, with
Philippine jurisdiction (explicit or inferred). Deterministic confidence scoring
(follow-up +0.35, prior issue +0.35, jurisdiction +0.10, subject +0.15, inferred
jurisdiction −0.05) with a 0.70 threshold. The helper returns only a rewritten
question and metadata — no citations, no conclusions.

## 7. Positive case summary (all rewrite applied)

- Tobacco VAT → "How about fresh frozen seafood?" ⇒ "Is fresh frozen seafood subject to VAT in the Philippines?" (VAT)
- Rent EWT → "How about condominium dues?" ⇒ "Is condominium dues subject to expanded withholding tax (EWT) in the Philippines?" (EWT)
- NOLCO → "What about a corporation with no income?" ⇒ "Can a corporation with no income claim NOLCO in the Philippines?" (NOLCO)
- PEZA zero-rating → "What about local purchases?" ⇒ "Are local purchases involving PEZA zero-rated for VAT in the Philippines?" (PEZA zero-rating)
- MCIT → "How about newly registered corporation?" ⇒ "Is MCIT applicable to newly registered corporation in the Philippines?" (MCIT)
- Rent withholding → "What about security deposit?" ⇒ "Is security deposit subject to withholding tax in the Philippines?" (withholding tax)

## 8. Negative case summary (no rewrite; standaloneQuery == originalQuery)

Explicit new question ("New question: …") and reset ("Forget VAT, …") →
`explicit_reset_detected`; jurisdiction switch ("In the US, …") →
`jurisdiction_switch_detected`; non-tax ("What is the weather?", "Tell me about
seafood recipes.") → `non_tax_query_detected`; complete standalone ("What is
VAT?") → `standalone_query_detected`; no recent turns → `no_prior_tax_issue` with
a fallback clarification.

## 9. False-positive controls

Explicit reset phrases, jurisdiction-switch phrases, a 0.70 confidence threshold,
bounded max age/turn distance (last 6, hard max 20), an ambiguity control
(`ambiguous_prior_issue` when ≥2 distinct tax families co-occur), a standalone
control, and a non-tax control.

## 10. Security/privacy controls

Bounded recent turns; no raw recent-turn logs; no third-party egress; no
persistent memory; no memory flags; no DB writes; no client/matter persistence;
no citations or legal answers. Aligned with the Phase 8S secrets/logging and
tenant-isolation gates for the future wiring patch.

## 11. Source authority discipline

The helper produces no citations, no tax conclusion (no "taxable"/"exempt"
verdicts), does not bypass the SAE or source cards, and never claims authority
found. Its `standaloneQuery` is a question. The final answer still requires
retrieval/source-backed authority downstream.

## 12. Runtime wiring status

```text
runtimeWired: false
askHandlerUsesHelper: false
classificationUsesHelper: false
retrievalUsesHelper: false
liveBehaviorChanged: false
featureFlagAdded: false
```

The helper is imported by its focused test only; it is not imported by any
runtime module.

## 13. Memory boundary

No persistent memory; no `TINA_ENABLE_MEMORY_*` flags; no memory DB; no durable
writes. Every decision object reports `memoryBoundary.persistentMemoryUsed:
false` and `durableWriteRequired: false`.

## 14. Phase boundaries

Phase 8 closed; Phase 8S closed; Phase 9 not started; Phase 10 deferred; Phase 11
deferred.

## 15. Validation results

```text
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
GATE PASSED - 0 failed
```

## 16. Final decision

```text
CHAT CONTEXT CARRYOVER SCAFFOLD PASS WITH STRICT RECOMMENDATIONS
```

## 17. Strict recommendations

1. Do not claim the live issue is fixed yet.
2. Do not wire into runtime until the next patch.
3. The next patch must be feature-flagged OFF by default.
4. Confirm the frontend `conversationId`/`sessionId` behavior before staging smoke.
5. Preserve source-authority discipline.
6. Do not enable memory.
7. Do not log raw recent turns.
8. Do not send recent turns to third-party observability.
9. Add live staging smoke only after pipeline wiring.
10. Keep Phase 9 not started until 08X runtime behavior is validated or explicitly accepted.

## 18. Next task

```text
PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1
```

Do not start it inside this patch.
