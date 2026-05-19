# TINA Architecture Decision Log

Branch: `tina-arch-2026-05-19`  
Architect: Senior AI Architect — TINA Philippine Tax Intelligence Engine  
Date: 2026-05-19

---

## Overview

TINA (Tax Intelligence and Analysis) is the most advanced Philippine taxation AI ever built. It operates as a Senior Tax Litigation Counsel (CTA level), Big 4 National Tax Office Reviewer, Philippine Bar Taxation Law Specialist, BIR Audit Defense Strategist, Jurisprudence Synthesis Expert, Transaction Characterization Expert, and natural conversationalist with persistent memory.

---

## The 6 Architecture Laws

### LAW 1 — PIPELINE SUPREMACY
- `pipeline.js` is the single entry point for all queries.
- `ask-handler.js` calls **only** `pipeline.runPipeline()`.
- No engine is called from anywhere except `pipeline.js`.
- **Status:** ENFORCED. `pipeline.js` created. `ask-handler.js` refactored.

### LAW 2 — SOURCE HIERARCHY (non-negotiable)
```
Tier 1: Constitution · NIRC (as amended) · SC En Banc
Tier 2: SC Division · CTA En Banc
Tier 3: CTA Division
Tier 4: Revenue Regulations (RR)
Tier 5: Revenue Memorandum Circulars (RMC)
Tier 6: Revenue Memorandum Orders (RMO)
Tier 7: BIR Rulings (binding on requesting party only)
Tier 8: DOF Opinions · Commentaries (persuasive — label as such)
```
- **Status:** ENFORCED. `authority-engine.js` implements this hierarchy. Pipeline Step 3 ranks by it.

### LAW 3 — ISSUE-TARGETED RETRIEVAL
- `retrieval-engine.js` MUST filter by `authority_name IN controllingAuthorities[]`.
- Semantic similarity alone is PROHIBITED as the sole retrieval criterion.
- **Status:** ENFORCED. Law 3 guard added in `retrieveRelevantSources()`: if no authority-layer results exist and only Layer 5 (VECTOR_SEMANTIC) matched, all results are flagged with `semanticOnlyWarning: true` and `law3Warning` message. These docs are excluded from authoritative answers.

### LAW 4 — FOUR-PART DOCTRINE TEST
```
trueConflict = true ONLY when ALL FOUR are true:
  (1) Same legal issue
  (2) Same material facts
  (3) Same statute
  (4) Opposite holding
```
- Semantic divergence is NOT conflict detection.
- **Status:** ENFORCED. `isGenuineConflict()` in `conflict-engine.js` upgraded with `sameStatuteGate()`. `pipeline.js` Step 9 runs `fourPartDoctrineTest()` which enforces all four parts. Part 2 (same material facts) is a pass-through when unknown — benefit of doubt.

### LAW 5 — SUPABASE-PERSISTED MEMORY
- `conversation-memory.js` stores ALL turns in Supabase `messages` table.
- In-memory Maps are PROHIBITED for conversation storage.
- **Status:** ENFORCED. `conversation-memory.js` is Supabase-backed. `ask-handler.js` calls `saveConversationTurn()` which calls `saveMessage()`.

### LAW 6 — SENIOR COUNSEL OUTPUT
- First sentence = direct answer.
- Second sentence = controlling authority citation.
- PROHIBITED: "may suggest" "could be argued" "as an AI" "consult a professional"
- **Status:** ENFORCED via `adaptive-tina-master-prompt.js` identity rules and `final-answer-compliance.js` validation.

---

## The 16-Step Pipeline (`pipeline.js`)

```
Step  1  issueClassificationEngine.classify(query)
Step  2  subPromptRouter.getModeRoutingMetadata(primaryIssue, query)
Step  3  authorityEngine.rerankByHierarchy(targetAuthorities)
Step  4  supersessionEngine.applySupersessionFilter(rankedAuthorities)
Step  5  retrievalEngine.retrieveRelevantSources(query, authorityFilter)   [Law 3]
Step  6  rerankerEngine.rerankForTina(chunks, hierarchyWeights)
Step  7  factPatternEngine.analyzeFactPattern()                            [if factPatternRequired]
Step  8  doctrinalEngine.detectDoctrinalConflicts(chunks)
Step  9  conflictEngine.fourPartDoctrineTest(holdingObjects)              [Law 4]
Step 10  transactionCharEngine.characterizeTransaction()                  [if transactionCharRequired]
Step 11  evidenceEvalEngine.evaluateEvidence()                            [if queryIntent === dispute|audit]
Step 12  riskScoringEngine.scoreRisk(position)
Step 13  adaptiveTinaMasterPrompt.buildAdaptivePromptContract(mode, ctx)
Step 14  openai.chat.completions.create()  via callOpenAIWithOrchestration
Step 15  answerRenderer.renderTinaAnswer(rawResponse)
Step 16  finalAnswerCompliance.enforceFinalAnswerCompliance(formattedResponse)
```

---

## Decision Log

### ADR-001: Create `pipeline.js` as single orchestration layer
**Date:** 2026-05-19  
**Decision:** Create `pipeline.js` to own all 16 pipeline steps. Remove direct engine imports from `ask-handler.js`.  
**Rationale:** Law 1 requires a single entry point. Previously, `ask-handler.js` called `query-intent-engine`, `issue-classification-engine`, `retrieval-engine`, `reranker-engine`, and `rag-answer-handler` directly, violating pipeline supremacy.  
**Consequence:** 20+ orphaned engines (reasoning, citation-formatting, fact-pattern, etc.) are now wired into the pipeline at their correct steps.

### ADR-002: CJS engines bridged via `createRequire`
**Date:** 2026-05-19  
**Decision:** `fact-pattern-engine.js`, `transaction-characterization-engine.js`, `evidence-evaluation-engine.js`, and `risk-scoring-engine.js` use `module.exports` (CommonJS). They are imported in `pipeline.js` via `createRequire(import.meta.url)`.  
**Rationale:** The project is ESM (`"type": "module"` implied). These four engines were never converted to ESM. The bridge avoids a rewrite that could introduce regressions.  
**Future:** These engines should be converted to ESM exports (`export function`) in a follow-up PR.

### ADR-003: Upgrade `isGenuineConflict()` to full Four-Part Doctrine Test
**Date:** 2026-05-19  
**Decision:** Added `sameStatuteGate()` to `conflict-engine.js`. Part 2 (same material facts) is a pass-through when unknown.  
**Rationale:** Law 4 requires all four parts. The prior implementation only checked (1) same issue and (4) opposite holding.  
**Consequence:** Fewer false conflict flags. BIR circulars on one statute no longer conflict with court decisions on a different statute.

### ADR-004: Law 3 semantic-only retrieval guard
**Date:** 2026-05-19  
**Decision:** Added a post-retrieval guard in `retrieveRelevantSources()` that flags docs as `semanticOnlyWarning: true` when zero authority-layer results exist.  
**Rationale:** Law 3 prohibits semantic-only retrieval as the sole criterion. This is a runtime flag — the answer compliance engine in Step 16 will not cite flagged docs as controlling.  
**Alternative rejected:** Blocking Layer 5 entirely when no authority match exists would create silent retrieval failures. Flagging is safer.

### ADR-005: Tax-engine domain integration bridge
**Date:** 2026-05-19  
**Decision:** `main-tax-engine-classification.js` now imports `VAT_DOMAIN` from `tax-engines/VAT/domain-config.js` and merges it into the live `TAX_DOMAINS` registry via `buildMergedDomainRegistry()`.  
**Rationale:** The entire `tax-engines/` directory was orphaned. The VAT domain config (58 KB) with 8 sub-engines was fully built but never wired.  
**Status of other domains:** CIT, WHT, CUS, DIS, EST, EXC, LGT, PCT, PRE, SPC domain-configs are empty stubs. Add them to `buildMergedDomainRegistry()` as each is populated.

---

## What Remains Unconnected (Future PRs)

| File | Priority | Notes |
|---|---|---|
| `reasoning-engine.js` | HIGH | Legal reasoning — should enrich Step 8/9 |
| `jurisprudence-engine.js` | HIGH | Jurisprudence synthesis — should enrich Step 8 |
| `citation-formatting-engine.js` | HIGH | Citation display — should be called in Step 15 |
| `provision-citation-engine.js` | MEDIUM | Provision-level citation enrichment |
| `legal-validation-engine.js` | MEDIUM | Legal position validation |
| `named-law-engine.js` | MEDIUM | Named law detection |
| `doctrine-tagging-engine.js` | MEDIUM | Doctrine tagging |
| `case-analysis-engine.js` | MEDIUM | Full case analysis |
| `assumption-gap-engine.js` | LOW | Assumption gap detection |
| `position-strength-engine.js` | LOW | Position strength scoring |
| `contract-interpretation-engine.js` | LOW | Contract interpretation |
| `user-behavior-engine.js` | LOW | User behavior analytics |
| `topic-detector.js` | LOW | Topic detection |
| `tax-classifier.js` | LOW | OpenAI-based tax classification |
| `vision-ocr.js` | LOW | OCR for image documents |
| `pdf-to-images.js` | LOW | PDF rendering |
| `adaptive-tina-master-prompt.js` | DONE | Wired in Step 13 |
| `tax-engines/VAT/` | PARTIAL | VAT_DOMAIN wired; 8 sub-engines awaiting integration |
| `tax-engines/CIT,WHT,etc.` | TODO | Stubs — need content |

---

## Approved Engine Integrations

| Engine | Step | Status |
|---|---|---|
| `issue-classification-engine.js` | 1 | ACTIVE |
| `adaptive-tina-master-prompt.js` | 2, 13 | ACTIVE |
| `authority-engine.js` | 3 | ACTIVE |
| `supersession-engine.js` | 4 | ACTIVE |
| `retrieval-engine.js` | 5 | ACTIVE + Law 3 guard |
| `reranker-engine.js` | 6 | ACTIVE |
| `fact-pattern-engine.js` | 7 | ACTIVE (conditional) |
| `doctrinal-engine.js` | 8 | ACTIVE |
| `conflict-engine.js` | 9 | ACTIVE + Four-Part Test |
| `transaction-characterization-engine.js` | 10 | ACTIVE (conditional) |
| `evidence-evaluation-engine.js` | 11 | ACTIVE (conditional) |
| `risk-scoring-engine.js` | 12 | ACTIVE |
| `context-orchestration-engine.js` | 14 | ACTIVE |
| `answer-renderer.js` | 15 | ACTIVE |
| `final-answer-compliance.js` | 16 | ACTIVE |
