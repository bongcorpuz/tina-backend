# TINA Dependency Map

Generated: 2026-05-19  
Branch: `tina-arch-2026-05-19`

---

## Entry Points

| File | Role |
|---|---|
| `server.js` | HTTP server, route registration, dependency injection |
| `pipeline.js` | **NEW** — single orchestration entry point (Law 1) |

---

## Active Pipeline (server.js → pipeline.js → engines)

```
server.js
  └── ask-handler.js          [route controller]
        └── pipeline.js       [ALL 16 pipeline steps]
              ├─ Step 1  ── issue-classification-engine.js
              │               └── main-tax-engine-classification.js
              │                     └── tax-engines/VAT/domain-config.js  ← NEW
              │                           └── tax-engines/shared/authority-hierarchy.js
              ├─ Step 2  ── adaptive-tina-master-prompt.js
              ├─ Step 3  ── authority-engine.js
              │               ├── authority-constants.js
              │               └── authority-utils.js
              ├─ Step 4  ── supersession-engine.js
              │               └── authority-engine.js
              ├─ Step 5  ── retrieval-engine.js              [Law 3 guard added]
              │               ├── authority-engine.js
              │               ├── supersession-engine.js
              │               ├── query-intent-engine.js
              │               │     └── issue-classification-engine.js
              │               └── reranker-engine.js
              ├─ Step 6  ── reranker-engine.js
              │               ├── authority-engine.js
              │               ├── supersession-engine.js
              │               └── query-intent-engine.js
              ├─ Step 7  ── fact-pattern-engine.js           [CJS — conditional]
              ├─ Step 8  ── doctrinal-engine.js
              │               ├── authority-engine.js
              │               └── conflict-engine.js
              ├─ Step 9  ── conflict-engine.js               [Four-Part Test upgraded]
              │               └── authority-engine.js
              ├─ Step 10 ── transaction-characterization-engine.js  [CJS — conditional]
              ├─ Step 11 ── evidence-evaluation-engine.js    [CJS — conditional]
              ├─ Step 12 ── risk-scoring-engine.js           [CJS]
              ├─ Step 13 ── adaptive-tina-master-prompt.js
              ├─ Step 14 ── context-orchestration-engine.js  [OpenAI]
              ├─ Step 15 ── answer-renderer.js
              └─ Step 16 ── final-answer-compliance.js
                              └── source-visibility-engine.js
```

---

## Supporting Infrastructure (server.js direct imports)

```
server.js
  ├── conversation-memory.js     [Supabase — Law 5]
  ├── drive-reader.js            [Google Drive]
  ├── auth.js                    [JWT/bcrypt]
  ├── vector-store.js            [OpenAI embeddings + Supabase pgvector]
  │     └── authority-engine.js
  ├── ask-helpers.js
  │     └── supersession-engine.js
  ├── reindex-service.js
  │     ├── drive-reader.js
  │     ├── vector-store.js
  │     └── authority-engine.js
  ├── query-intent-engine.js     [health check only]
  ├── issue-classification-engine.js  [health check only]
  ├── rag-answer-handler.js      [health check only]
  ├── adaptive-mode-engine.js    [health check only]
  ├── adaptive-response-planner.js   [health check only]
  └── context-orchestration-engine.js
```

---

## Assessment / Quiz Mode (parallel track — not through pipeline)

```
ask-handler.js
  └── assessment-handler.js
        ├── mode-state.js
        ├── memory-hooks.js
        ├── conversation-memory.js
        ├── adaptive-quiz.js
        │     └── learner-profile.js
        ├── vector-store.js
        ├── ask-helpers.js
        └── context-orchestration-engine.js
```

---

## npm Package Dependencies

| Package | Used By |
|---|---|
| `dotenv` | server.js, auth.js, drive-reader.js, vector-store.js |
| `express` | server.js |
| `cors` | server.js |
| `openai` | context-orchestration-engine.js, vector-store.js, tax-classifier.js |
| `@supabase/supabase-js` | server.js, auth.js, vector-store.js |
| `jsonwebtoken` | auth.js |
| `bcryptjs` | auth.js |
| `googleapis` | drive-reader.js |
| `pdf-parse` | drive-reader.js |
| `mammoth` | drive-reader.js |
| `pdfjs-dist` | pdf-to-images.js (orphaned) |
| `@napi-rs/canvas` | pdf-to-images.js (orphaned) |
| `@google-cloud/vision` | vision-ocr.js (orphaned) |
| `tesseract.js` | **UNUSED** — declared in package.json, not imported anywhere |

---

## Orphaned Engines (built but not yet wired into pipeline)

These engines exist, are fully implemented, and are approved for integration into future pipeline steps.

| Engine | Recommended Pipeline Step |
|---|---|
| `reasoning-engine.js` | Step 8 or 9 — legal reasoning enrichment |
| `jurisprudence-engine.js` | Step 8 — jurisprudence synthesis |
| `citation-formatting-engine.js` | Step 15 — citation display formatting |
| `provision-citation-engine.js` | Step 15 — provision-level citations |
| `legal-validation-engine.js` | Step 16 — legal position validation |
| `named-law-engine.js` | Step 1 — named law detection pre-classification |
| `doctrine-tagging-engine.js` | Step 8 — doctrine tag enrichment |
| `case-analysis-engine.js` | Step 9 — full case analysis for /case hook |
| `assumption-gap-engine.js` | Step 7 or 11 — assumption gap analysis |
| `position-strength-engine.js` | Step 12 — position strength alongside risk |
| `contract-interpretation-engine.js` | Step 10 — contract analysis for /case hook |
| `user-behavior-engine.js` | Outside pipeline — analytics |
| `topic-detector.js` | Step 1 pre-processing |
| `tax-classifier.js` | Step 1 fallback classification |
| `vision-ocr.js` | Pre-pipeline — image OCR |
| `pdf-to-images.js` | Pre-pipeline — PDF rendering |

---

## Tax-Engine Domain Status

| Domain | Config File | Status |
|---|---|---|
| VAT | `tax-engines/VAT/domain-config.js` | WIRED — merged into TAX_DOMAINS via `buildMergedDomainRegistry()` |
| CIT | `tax-engines/CIT/domain-config.js` | STUB (empty file) |
| WHT | `tax-engines/WHT/domain-config.js` | STUB (empty file) |
| CUS | `tax-engines/CUS/domain-config.js` | STUB (empty file) |
| DIS | `tax-engines/DIS/domain-config.js` | STUB (empty file) |
| EST | `tax-engines/EST/domain-config.js` | STUB (empty file) |
| EXC | `tax-engines/EXC/domain-config.js` | STUB (empty file) |
| LGT | `tax-engines/LGT/domain-config.js` | STUB (empty file) |
| PCT | `tax-engines/PCT/domain-config.js` | STUB (empty file) |
| PRE | `tax-engines/PRE/domain-config.js` | STUB (empty file) |
| SPC | `tax-engines/SPC/domain-config.js` | STUB (empty file) |

VAT sub-engines (8 files in `tax-engines/VAT/engines/`) are imported by `VAT/domain-config.js` but are not yet individually called by the pipeline. They are available for Step 5 retrieval routing.

---

## Circular Dependencies

None in the active (server-reachable) call graph.

---

## Architecture Law Compliance Summary

| Law | Status |
|---|---|
| LAW 1 — Pipeline Supremacy | ENFORCED (`pipeline.js` created, `ask-handler.js` refactored) |
| LAW 2 — Source Hierarchy | ENFORCED (`authority-engine.js` hierarchy unchanged) |
| LAW 3 — Issue-Targeted Retrieval | ENFORCED (semantic-only guard added in `retrieval-engine.js`) |
| LAW 4 — Four-Part Doctrine Test | ENFORCED (`sameStatuteGate` added to `conflict-engine.js`) |
| LAW 5 — Supabase-Persisted Memory | ENFORCED (`conversation-memory.js` unchanged — Supabase-backed) |
| LAW 6 — Senior Counsel Output | ENFORCED (prompt identity in `adaptive-tina-master-prompt.js`, compliance in Step 16) |
