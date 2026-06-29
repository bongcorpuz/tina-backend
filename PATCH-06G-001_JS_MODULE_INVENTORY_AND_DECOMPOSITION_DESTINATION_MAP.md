# PATCH-06G-001 - JS Module Inventory and Decomposition Destination Map

## 1. Objective

Begin Phase 6G with a diagnostic-only inventory of JavaScript and MJS modules, then map likely future decomposition targets to existing destination files wherever possible.

This report is planning evidence only. It does not authorize runtime extraction, behavior changes, source ingestion, vector updates, DB updates, or edits to `pipeline.js`.

## 2. Scope

In scope:

- Inventory `.js` and `.mjs` files in the backend repo, excluding dependency folders.
- Separate runtime modules from tests and stage harness files.
- Identify existing ownership boundaries for source authority, source-card, retrieval, reranking, mode routing, response formatting, evaluation, ingestion, memory, and document-intelligence logic.
- Recommend preferred existing destinations before considering new files.
- Flag duplicate or overlapping responsibility risks.
- Identify files that need extra evaluation coverage before future decomposition.

Out of scope:

- No runtime code edits.
- No refactor.
- No module moves.
- No `pipeline.js` edits.
- No DB, indexing, RAG, vector-store, or corpus updates.
- No staging behavior change.

## 3. Audit Method

Commands used for inventory:

```text
rg --files -g "*.js" -g "*.mjs" -g "!node_modules/**"
rg --files -g "*.js" -g "*.mjs" tests
rg --files -g "*.js" -g "*.mjs" evaluation learning prompts routes scripts services sessions shared tax-engines
```

Audit approach:

- Classify files by path and apparent responsibility.
- Treat root-level `.js` and `.mjs` files as runtime-root or local stage harness files.
- Treat `tests/*.mjs` and `_stage*.mjs` files as test/evaluation controls.
- Prefer established extracted modules from Phase 6B, Phase 6E, and Phase 6F before proposing any new destination.
- Preserve Phase 6F evaluation harness as the required guard before future decomposition.

## 4. Repo / Branch / Commit Baseline

Repo:

```text
C:/Projects/tina-backend
```

Branch:

```text
feature/source-availability-engine-v1
```

Baseline status at audit start:

```text
## feature/source-availability-engine-v1...origin/feature/source-availability-engine-v1
```

Recent baseline commit before this patch:

```text
7e59d6b PATCH-06F-GATE-1 close Phase 6F
```

## 5. JS/MJS File Inventory Summary

| Area | Count | Notes |
|---|---:|---|
| Runtime root modules | 71 | Main engine, orchestration, authority, retrieval, response, memory, ingestion, and legacy stage harness files at repo root. |
| Services | 9 | Source selector/sanitizer, tax boundary, schema, and observability services. |
| Routes | 13 | Express route surfaces for ask, tax, audit, source, learning, diagnostics, and support endpoints. |
| Shared | 4 | Shared mode, route, formatter, and tax-domain configuration helpers. |
| Tax engines | 34 | Domain classifiers/configuration plus VAT sub-engines and shared tax-engine registries. |
| Learning | 6 | Quiz, review, session, authority validation, and learning-domain routing. |
| Evaluation runner | 2 | Internal Phase 6F evaluation runner and report generator. |
| Scripts | 3 | Local regression, guard, and Supabase diagnostic scripts. |
| Prompt modules | 1 | Audit-mode prompt ownership. |
| Sessions | 1 | Mode session management. |
| Test and stage harness files | 73 | 67 files under `tests/` plus 6 root `_stage*.mjs` harness files. |
| Total JS/MJS files inventoried | 144 | Dependency folders excluded. |

## 6. Full JS/MJS File Inventory Table

| Area | File | Current apparent responsibility |
|---|---|---|
| Runtime root | `adaptive-mode-engine.js` | Adaptive mode selection and mode reasoning. |
| Runtime root | `adaptive-quiz.js` | Quiz/adaptive learning support. |
| Runtime root | `adaptive-response-planner.js` | Response planning and structure. |
| Runtime root | `adaptive-tina-master-prompt.js` | Main prompt composition and model instructions. |
| Runtime root | `answer-renderer.js` | Final answer rendering and public response shape. |
| Runtime root | `ask-handler.js` | Primary `/ask` handler orchestration. |
| Runtime root | `ask-helpers.js` | Ask-handler support helpers. |
| Runtime root | `assessment-handler.js` | Assessment workflow support. |
| Runtime root | `assumption-gap-engine.js` | Fact-gap and assumption detection. |
| Runtime root | `auth.js` | Authentication support. |
| Runtime root | `authority-alias-registry.js` | Authority alias definitions. |
| Runtime root | `authority-constants.js` | Authority constants and authority-family identifiers. |
| Runtime root | `authority-engine.js` | Authority matching/ranking behavior. |
| Runtime root | `authority-restoration-engine.js` | Authority restoration from retrieved material. |
| Runtime root | `authority-utils.js` | Authority parsing, normalization, and helper logic. |
| Runtime root | `case-analysis-engine.js` | Case analysis workflows. |
| Runtime root | `citation-formatting-engine.js` | Citation formatting. |
| Runtime root | `command-resolver.js` | Command/mode routing. |
| Runtime root | `conflict-engine.js` | Conflict analysis. |
| Runtime root | `context-orchestration-engine.js` | Context orchestration. |
| Runtime root | `contract-interpretation-engine.js` | Contract/document interpretation. |
| Runtime root | `conversation-memory.js` | Conversation memory. |
| Runtime root | `doctrinal-engine.js` | Doctrinal analysis. |
| Runtime root | `doctrine-authority-map.js` | Doctrine-to-authority mapping registry. |
| Runtime root | `doctrine-tagging-engine.js` | Doctrine tagging. |
| Runtime root | `document-conversion-service.js` | Document conversion pipeline. |
| Runtime root | `drive-reader.js` | Google Drive/source file reading. |
| Runtime root | `economic-substance-engine.js` | Economic substance analysis. |
| Runtime root | `evidence-evaluation-engine.js` | Evidence evaluation. |
| Runtime root | `fact-pattern-engine.js` | Fact pattern analysis. |
| Runtime root | `feedback-learning.js` | Feedback learning. |
| Runtime root | `final-answer-compliance.js` | Final response compliance checks. |
| Runtime root | `issue-classification-engine.js` | Issue classification and guarded authority signals. |
| Runtime root | `issue-exact-authority-detector.js` | Exact authority detection extracted in Phase 6E. |
| Runtime root | `jurisprudence-engine.js` | Jurisprudence/case-law handling. |
| Runtime root | `learner-profile.js` | Learner profile state. |
| Runtime root | `legal-citation-range-utils.js` | Legal citation range helpers. |
| Runtime root | `legal-validation-engine.js` | Legal validation. |
| Runtime root | `main-tax-engine-classification.js` | Main tax classification entrypoint. |
| Runtime root | `memory-hooks.js` | Runtime memory hooks. |
| Runtime root | `mode-state.js` | Mode state. |
| Runtime root | `named-law-engine.js` | Named-law matching and handling. |
| Runtime root | `pdf-to-images.js` | PDF image conversion. |
| Runtime root | `pipeline-observability.js` | Pipeline observability hooks. |
| Runtime root | `pipeline.js` | Main pipeline orchestration; high-risk and not to be touched without express approval. |
| Runtime root | `position-strength-engine.js` | Position strength analysis. |
| Runtime root | `provision-citation-engine.js` | Provision/citation matching. |
| Runtime root | `query-intent-engine.js` | Query intent detection. |
| Runtime root | `rag-answer-handler.js` | RAG answer handling. |
| Runtime root | `reasoning-engine.js` | Reasoning workflows. |
| Runtime root | `reindex-service.js` | Reindexing support. |
| Runtime root | `reranker-engine.js` | Retrieval reranking. |
| Runtime root | `reranker-issue-signals.js` | Reranker issue signals extracted in Phase 6E. |
| Runtime root | `reranker-normalizers.js` | Reranker normalizers extracted in Phase 6E. |
| Runtime root | `retrieval-engine.js` | Retrieval orchestration. |
| Runtime root | `risk-scoring-engine.js` | Risk scoring. |
| Runtime root | `server.js` | Backend server entrypoint. |
| Runtime root | `source-card-engine.js` | Source-card assembly and extracted source-card helpers. |
| Runtime root | `source-intent-registry.js` | Source intent registry. |
| Runtime root | `source-visibility-engine.js` | Source visibility and availability-related behavior. |
| Runtime root | `supersession-engine.js` | Supersession analysis. |
| Runtime root | `tax-classifier.js` | Tax classification. |
| Runtime root | `tax-keywords.js` | Tax keyword mappings. |
| Runtime root | `taxpayer-definition-registry.js` | Taxpayer definition registry. |
| Runtime root | `topic-detector.js` | Topic detection. |
| Runtime root | `transaction-characterization-engine.js` | Transaction characterization. |
| Runtime root | `user-behavior-engine.js` | User behavior learning. |
| Runtime root | `vector-authority-keyword-builders.js` | Vector authority keyword builders extracted in Phase 6E. |
| Runtime root | `vector-authority-reference-registry.js` | Vector authority reference registry. |
| Runtime root | `vector-store.js` | Vector store access. |
| Runtime root | `vision-ocr.js` | OCR/document vision support. |
| Services | `services/ask-handler-public-source-sanitizer.js` | Public source sanitizer for ask-handler output. |
| Services | `services/observability-service.js` | Observability service support. |
| Services | `services/philippine-tax-boundary-patterns.js` | Philippine tax boundary patterns extracted in Phase 6E. |
| Services | `services/philippine-tax-domain-boundary.js` | Philippine tax domain boundary support. |
| Services | `services/schema-validator.js` | Schema validation. |
| Services | `services/source-authority-selector-card-sanitizer.js` | Source-authority selector card sanitizer extracted in Phase 6E. |
| Services | `services/source-authority-selector-eligibility.js` | Selector eligibility extracted in Phase 6E. |
| Services | `services/source-authority-selector.js` | Source authority selection. |
| Services | `services/tax-concept-aliases.js` | Tax concept aliases. |
| Routes | `routes/ask-route.js` | `/ask` route surface. |
| Routes | `routes/audit-route.js` | `/audit` route surface. |
| Routes | `routes/case-route.js` | Case route surface. |
| Routes | `routes/debug-route.js` | Debug route surface. |
| Routes | `routes/diagnostic-route.js` | Diagnostic route surface. |
| Routes | `routes/feedback-route.js` | Feedback route surface. |
| Routes | `routes/index.js` | Route registration. |
| Routes | `routes/patch-route.js` | Patch/support route surface. |
| Routes | `routes/progress-route.js` | Progress route surface. |
| Routes | `routes/quiz-route.js` | Quiz route surface. |
| Routes | `routes/review-route.js` | Review route surface. |
| Routes | `routes/source-route.js` | Source route surface. |
| Routes | `routes/tax-route.js` | `/tax` route surface. |
| Shared | `shared/mode-formatters.js` | Shared mode formatting. |
| Shared | `shared/mode-guards.js` | Shared mode guard logic. |
| Shared | `shared/route-mode-config.js` | Shared route/mode configuration. |
| Shared | `shared/tax-domain-options.js` | Shared tax-domain option definitions. |
| Sessions | `sessions/mode-session-manager.js` | Mode session management. |
| Prompts | `prompts/audit-mode-prompt.js` | Audit mode prompt. |
| Learning | `learning/authority-validation.js` | Learning authority validation. |
| Learning | `learning/domain-normalizer.js` | Learning domain normalization. |
| Learning | `learning/question-bank-router.js` | Question bank routing. |
| Learning | `learning/quiz-engine.js` | Quiz engine. |
| Learning | `learning/review-engine.js` | Review engine. |
| Learning | `learning/session-engine.js` | Learning session engine. |
| Evaluation | `evaluation/runner/evaluation-report-generator.js` | Evaluation report generation. |
| Evaluation | `evaluation/runner/evaluation-runner.js` | Evaluation runner. |
| Scripts | `scripts/check-supabase.js` | Supabase diagnostic helper. |
| Scripts | `scripts/forbidden-files-guard.mjs` | Repository forbidden-file guard. |
| Scripts | `scripts/run-regressions.mjs` | Local regression runner. |
| Tax engines | `tax-engines/CIT/domain-config.js` | CIT domain configuration. |
| Tax engines | `tax-engines/CIT/subclassifier.js` | CIT subclassifier. |
| Tax engines | `tax-engines/CUST/subclassifier.js` | Customs subclassifier. |
| Tax engines | `tax-engines/DIS/domain-config.js` | Documentary stamp tax domain configuration. |
| Tax engines | `tax-engines/DIS/subclassifier.js` | Documentary stamp tax subclassifier. |
| Tax engines | `tax-engines/EST/domain-config.js` | Estate tax domain configuration. |
| Tax engines | `tax-engines/EST/subclassifier.js` | Estate tax subclassifier. |
| Tax engines | `tax-engines/EXC/domain-config.js` | Excise tax domain configuration. |
| Tax engines | `tax-engines/EXC/subclassifier.js` | Excise tax subclassifier. |
| Tax engines | `tax-engines/IIT/domain-config.js` | Individual income tax domain configuration. |
| Tax engines | `tax-engines/IIT/subclassifier.js` | Individual income tax subclassifier. |
| Tax engines | `tax-engines/LGT/domain-config.js` | Local government tax domain configuration. |
| Tax engines | `tax-engines/LGT/subclassifier.js` | Local government tax subclassifier. |
| Tax engines | `tax-engines/PCT/domain-config.js` | Percentage tax domain configuration. |
| Tax engines | `tax-engines/PCT/subclassifier.js` | Percentage tax subclassifier. |
| Tax engines | `tax-engines/PRE/domain-config.js` | Preferential tax domain configuration. |
| Tax engines | `tax-engines/PRE/subclassifier.js` | Preferential tax subclassifier. |
| Tax engines | `tax-engines/SPC/domain-config.js` | Special tax domain configuration. |
| Tax engines | `tax-engines/SPC/subclassifier.js` | Special tax subclassifier. |
| Tax engines | `tax-engines/VAT/domain-config.js` | VAT domain configuration. |
| Tax engines | `tax-engines/VAT/engines/definition-engine.js` | VAT definition engine. |
| Tax engines | `tax-engines/VAT/engines/exemption-engine.js` | VAT exemption engine. |
| Tax engines | `tax-engines/VAT/engines/input-tax-engine.js` | VAT input-tax engine. |
| Tax engines | `tax-engines/VAT/engines/output-tax-engine.js` | VAT output-tax engine. |
| Tax engines | `tax-engines/VAT/engines/refund-credit-engine.js` | VAT refund/credit engine. |
| Tax engines | `tax-engines/VAT/engines/registration-tax-engine.js` | VAT registration engine. |
| Tax engines | `tax-engines/VAT/engines/wvat-tax-engine.js` | Withholding VAT engine. |
| Tax engines | `tax-engines/VAT/engines/zero-rating-engine.js` | VAT zero-rating engine. |
| Tax engines | `tax-engines/VAT/subclassifier.js` | VAT subclassifier. |
| Tax engines | `tax-engines/WHT/domain-config.js` | Withholding tax domain configuration. |
| Tax engines | `tax-engines/WHT/subclassifier.js` | Withholding tax subclassifier. |
| Tax engines | `tax-engines/shared/authority-hierarchy.js` | Shared authority hierarchy. |
| Tax engines | `tax-engines/shared/domain-registry.js` | Shared domain registry. |
| Tax engines | `tax-engines/subprompt-router.js` | Tax subprompt routing. |
| Root stage harness | `_stage017i_test.mjs` | Local stage test harness. |
| Root stage harness | `_stage017j_test.mjs` | Local stage test harness. |
| Root stage harness | `_stage017k_test.mjs` | Local stage test harness. |
| Root stage harness | `_stage017l_test.mjs` | Local stage test harness. |
| Root stage harness | `_stage2a_test.mjs` | Local stage test harness. |
| Root stage harness | `_stage2c_test.mjs` | Local stage test harness. |
| Tests | `tests/patch-018a-regression.test.mjs` through `tests/patch-035b-ra10963-bridge.test.mjs` | Legacy regression, authority, retrieval, jurisprudence, source-card, and Phase 6B extraction coverage. |
| Tests | `tests/patch-06e-003-boundary-pattern-extraction.test.mjs` through `tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs` | Phase 6E extraction and source-availability guard coverage. |
| Tests | `tests/patch-06f-001-evaluation-runner-skeleton.test.mjs` through `tests/patch-06f-008-staging-evaluation-report-generator.test.mjs` | Phase 6F evaluation harness, authority/source-card, mode-format, and domain coverage. |

## 7. Existing Module Responsibility Map

| Responsibility | Existing owner candidates | Notes |
|---|---|---|
| Source-card assembly | `source-card-engine.js`, `services/source-authority-selector.js`, `answer-renderer.js` | `source-card-engine.js` is the preferred destination for assembly helpers. |
| Public source-card sanitization | `services/source-authority-selector-card-sanitizer.js`, `services/ask-handler-public-source-sanitizer.js` | Two existing sanitizers appear intentionally scoped by call site. Avoid merging until behavior is proven identical. |
| Source availability / visibility | `source-visibility-engine.js`, `services/source-authority-selector.js`, `issue-classification-engine.js`, `authority-engine.js` | High-risk boundary because classification, candidate selection, and public visibility interact. |
| Authority restoration | `authority-restoration-engine.js` | Clear existing destination. |
| Authority selector eligibility | `services/source-authority-selector-eligibility.js` | Clear existing destination. |
| Exact authority detection | `issue-exact-authority-detector.js` | Clear existing destination. |
| Authority patterns / aliases | `authority-utils.js`, `authority-constants.js`, `authority-alias-registry.js`, `services/philippine-tax-boundary-patterns.js`, `services/tax-concept-aliases.js` | Overlap risk exists; future work needs careful ownership split. |
| Retrieval orchestration | `retrieval-engine.js`, `rag-answer-handler.js`, `vector-store.js` | High-risk runtime behavior boundary. |
| Reranking | `reranker-engine.js`, `reranker-normalizers.js`, `reranker-issue-signals.js` | Phase 6E extracted helper destinations already exist. |
| Vector authority keyword building | `vector-authority-keyword-builders.js`, `vector-authority-reference-registry.js` | Clear existing destination. |
| Mode routing / intent | `command-resolver.js`, `adaptive-mode-engine.js`, `query-intent-engine.js`, `mode-state.js`, `shared/mode-guards.js`, `shared/route-mode-config.js`, `sessions/mode-session-manager.js` | Overlap risk between route-level mode, adaptive mode, and query intent. |
| Response formatting | `answer-renderer.js`, `final-answer-compliance.js`, `adaptive-response-planner.js`, `shared/mode-formatters.js`, `prompts/audit-mode-prompt.js` | High-risk because tone/format and source limitation wording are user visible. |
| Evaluation | `evaluation/runner/evaluation-runner.js`, `evaluation/runner/evaluation-report-generator.js`, `tests/patch-06f-*` | Phase 6F guard is available before decomposition. |
| Source ingestion / governance | `drive-reader.js`, `document-conversion-service.js`, `pdf-to-images.js`, `reindex-service.js`, `vector-store.js` | Defer deeper governance to Phase 10. |
| Memory / user learning | `conversation-memory.js`, `memory-hooks.js`, `feedback-learning.js`, `learner-profile.js`, `user-behavior-engine.js`, `learning/*` | Defer architecture to Phase 8. |
| Document intelligence | `vision-ocr.js`, `document-conversion-service.js`, `drive-reader.js`, `case-analysis-engine.js`, `evidence-evaluation-engine.js`, `contract-interpretation-engine.js` | Defer broader architecture to Phase 12. |

## 8. Candidate Destination Map for Future Decomposition

| Source logic area | Current likely source file | Preferred existing destination file | New file needed? yes/no/defer | Reason | Risk level | Recommended phase | Required evaluation coverage before implementation |
|---|---|---|---|---|---|---|---|
| Source-card assembly | `pipeline.js`, `services/source-authority-selector.js`, `answer-renderer.js` | `source-card-engine.js` | no | Existing extracted owner already exists for source-card construction. | Medium | Phase 6G, after architecture review | Phase 6F authority/source-card suite, case click-target tests, domain source-card coverage. |
| Public source-card sanitization | `ask-handler.js`, `services/source-authority-selector.js` | `services/ask-handler-public-source-sanitizer.js`, `services/source-authority-selector-card-sanitizer.js` | no | Existing call-site-specific sanitizers exist. | Low | Phase 6G | Phase 6E sanitizer extraction test plus Phase 6F source-card suite. |
| SourceAvailability classification | `issue-classification-engine.js`, `source-visibility-engine.js`, `services/source-authority-selector.js`, `authority-engine.js` | `source-visibility-engine.js` and `services/source-authority-selector.js` | defer | Availability is a cross-boundary behavior; choose exact owner only after architecture review. | High | Phase 6G or later | Generic-query guard, unavailable BIR Ruling guard, exact-source limitation, authority/source-card suite. |
| Authority restoration | `pipeline.js`, `authority-engine.js` | `authority-restoration-engine.js` | no | Existing extracted module has clear ownership. | Low | Phase 6G | Authority restoration and source-card regression coverage. |
| Authority selector eligibility | `services/source-authority-selector.js` | `services/source-authority-selector-eligibility.js` | no | Existing extracted module has clear ownership. | Low | Phase 6G | Phase 6E eligibility extraction test and Phase 6F authority/source-card suite. |
| Exact authority detection | `issue-classification-engine.js`, `authority-utils.js` | `issue-exact-authority-detector.js` | no | Existing extracted exact-authority detector exists. | Medium | Phase 6G | Exact-source limitation and exact-authority detector extraction tests. |
| BIR/NIRC/RR/RMC/RMO/CTA/G.R. pattern matching | `authority-utils.js`, `authority-constants.js`, `services/philippine-tax-boundary-patterns.js`, `services/tax-concept-aliases.js` | `services/philippine-tax-boundary-patterns.js`, `authority-constants.js`, `authority-alias-registry.js` | defer | Pattern ownership is split between boundary detection, aliases, and authority constants. | Medium | Phase 6G after review | Authority/source-card suite, CTA/G.R. click-target tests, domain coverage. |
| Generic-query guard logic | `issue-classification-engine.js`, `query-intent-engine.js`, `adaptive-mode-engine.js` | `issue-classification-engine.js` pending review | defer | Guarding generic queries affects promotion and fallback behavior. | High | Phase 6G or Phase 7A | Generic-query guard regression, TRAIN generic guard, unavailable-source guard. |
| Source-limitation wording logic | `answer-renderer.js`, `final-answer-compliance.js`, `adaptive-response-planner.js` | `answer-renderer.js` or `final-answer-compliance.js` pending review | defer | User-visible wording should stay stable until response-layer work. | High | Phase 7A | Exact-source limitation wording, mode-format evaluation. |
| Case-card/click-target logic | `source-card-engine.js`, `services/source-authority-selector.js`, `jurisprudence-engine.js` | `source-card-engine.js` | no | Source-card engine should own card target assembly once call paths are isolated. | Medium | Phase 6G | CTA/G.R. click-target integrity, jurisprudence source-card tests. |
| Retrieval orchestration | `pipeline.js`, `retrieval-engine.js`, `rag-answer-handler.js`, `vector-store.js` | `retrieval-engine.js`, `rag-answer-handler.js` | defer | Runtime retrieval orchestration is high blast radius. | High | Phase 6H or later | Full Phase 6F evaluation run plus focused retrieval/source-card regressions. |
| Reranker normalizers | `reranker-engine.js` | `reranker-normalizers.js` | no | Existing extracted helper module exists. | Low | Phase 6G | Phase 6E reranker normalizer extraction test. |
| Reranker issue signals | `reranker-engine.js` | `reranker-issue-signals.js` | no | Existing extracted helper module exists. | Low | Phase 6G | Phase 6E issue-signal extraction test and source-card suite. |
| Vector authority keyword builders | `retrieval-engine.js`, `vector-store.js` | `vector-authority-keyword-builders.js` | no | Existing extracted helper module exists. | Low | Phase 6G | Phase 6E vector keyword builder test. |
| Mode routing / intent detection | `command-resolver.js`, `adaptive-mode-engine.js`, `query-intent-engine.js`, routes | `command-resolver.js`, `shared/mode-guards.js`, `shared/route-mode-config.js` | defer | Multiple mode systems overlap; review boundary before extraction. | Medium | Phase 7A | Mode-format evaluation for `/ask`, `/tax`, `/audit`. |
| `/ask` response formatting | `ask-handler.js`, `answer-renderer.js`, `shared/mode-formatters.js` | `answer-renderer.js`, `shared/mode-formatters.js` | defer | Response-layer changes are visible and should align with Phase 7A. | High | Phase 7A | `/ask` mode-format evaluation, source limitation wording tests. |
| `/tax` senior memo formatting | `adaptive-response-planner.js`, `answer-renderer.js`, `shared/mode-formatters.js` | `shared/mode-formatters.js`, `answer-renderer.js` | defer | Senior memo formatting belongs to human response layer review. | High | Phase 7A | `/tax` mode-format evaluation. |
| `/audit` complex advisory formatting | `prompts/audit-mode-prompt.js`, `answer-renderer.js`, `shared/mode-formatters.js` | `prompts/audit-mode-prompt.js`, `shared/mode-formatters.js` | defer | Audit advisory formatting and prompt shape need coordinated response-layer work. | High | Phase 7A / 7B | `/audit` mode-format evaluation and adversarial reasoning coverage before behavior change. |
| Evaluation runner/report generation | `evaluation/runner/evaluation-runner.js`, `evaluation/runner/evaluation-report-generator.js` | Same files | no | Phase 6F already established these owners. | Low | Phase 6G support work | Evaluation runner/report generator tests. |
| Source ingestion/governance | `drive-reader.js`, `document-conversion-service.js`, `reindex-service.js`, `vector-store.js` | Existing files pending Phase 10 governance design | defer | Ingestion governance is a future architecture phase, not Phase 6G runtime work. | High | Phase 10 | Source governance tests, ingestion approval/rollback tests, no-indexing safety checks. |
| Memory/user learning | `conversation-memory.js`, `memory-hooks.js`, `feedback-learning.js`, `learning/*`, `learner-profile.js` | Existing memory and learning modules pending Phase 8 design | defer | Memory governance needs privacy, layer separation, and audit trail design. | Medium | Phase 8 | Memory governance tests and user/matter/global separation coverage. |
| Document intelligence | `vision-ocr.js`, `document-conversion-service.js`, `case-analysis-engine.js`, `evidence-evaluation-engine.js` | Existing document modules pending Phase 12 design | defer | Document-aware advisory needs matter-level grounding and document provenance. | Medium | Phase 12 | Document ingestion, OCR, provenance, and matter-grounding tests. |

## 9. Duplicate / Overlap Risk Findings

1. Authority matching and pattern logic is spread across `authority-utils.js`, `authority-engine.js`, `authority-constants.js`, `authority-alias-registry.js`, `vector-authority-reference-registry.js`, `services/philippine-tax-boundary-patterns.js`, and `services/tax-concept-aliases.js`.
2. Source-card sanitization has two existing modules: `services/source-authority-selector-card-sanitizer.js` and `services/ask-handler-public-source-sanitizer.js`. They should remain separate until call-site behavior is proven equivalent.
3. SourceAvailability behavior appears distributed across classification, visibility, selector, and authority matching modules. This is the highest-risk Phase 6G planning boundary.
4. Mode routing and response formatting overlap across `command-resolver.js`, `adaptive-mode-engine.js`, `query-intent-engine.js`, route files, `shared/mode-*`, `answer-renderer.js`, and `adaptive-response-planner.js`.
5. Tax-domain classification has multiple owners: `main-tax-engine-classification.js`, `tax-classifier.js`, `tax-engines/*`, `services/philippine-tax-domain-boundary.js`, and `tax-keywords.js`.
6. Source ingestion and document processing are split across `drive-reader.js`, `document-conversion-service.js`, `pdf-to-images.js`, `reindex-service.js`, and `vector-store.js`; defer deeper governance to Phase 10.

## 10. Prefer Existing File Recommendations

Prefer existing destinations for near-term Phase 6G decomposition planning:

- `source-card-engine.js` for source-card assembly and click-target assembly helpers.
- `services/source-authority-selector-card-sanitizer.js` for selector-side source-card sanitization.
- `services/ask-handler-public-source-sanitizer.js` for ask-handler public source-card sanitization.
- `source-visibility-engine.js` for source visibility and availability-facing logic after architecture review.
- `services/source-authority-selector-eligibility.js` for selector eligibility.
- `issue-exact-authority-detector.js` for exact authority detection.
- `authority-restoration-engine.js` for authority restoration.
- `services/philippine-tax-boundary-patterns.js` for reusable Philippine tax boundary patterns.
- `reranker-normalizers.js` and `reranker-issue-signals.js` for reranker helper logic.
- `vector-authority-keyword-builders.js` for vector authority keyword construction.
- `evaluation/runner/evaluation-runner.js` and `evaluation/runner/evaluation-report-generator.js` for evaluation execution/reporting.

## 11. New File Justified Later Recommendations

Do not create new files in Phase 6G unless a later architecture review finds no existing owner can safely hold the logic.

Potential later candidates, all deferred:

- SourceAvailability state reducer or policy module, only if `source-visibility-engine.js` and `services/source-authority-selector.js` cannot safely own the boundary.
- Response-section composer for Phase 7A, only after `/ask`, `/tax`, and `/audit` response ownership is reviewed.
- Source governance manifest/policy module for Phase 10.
- Memory governance policy module for Phase 8.
- Document-intelligence orchestration module for Phase 12.

## 12. High-Risk Files Requiring Extra Evaluation Coverage

| File | Risk reason | Minimum coverage before future edit |
|---|---|---|
| `pipeline.js` | Central orchestration and high blast radius. | Full Phase 6F evaluation run plus focused sourceAvailability/source-card cases; express approval required before edit. |
| `ask-handler.js` | Public `/ask` behavior and formatting. | `/ask` mode-format, source-card, source-limitation, and unavailable-source coverage. |
| `answer-renderer.js` | Final public answer shape. | Mode-format and source-limitation wording coverage. |
| `source-visibility-engine.js` | Source availability and public visibility behavior. | Generic-query guard, unavailable-source guard, exact authority coverage. |
| `services/source-authority-selector.js` | Source-card authority selection. | Authority/source-card suite, click-target tests, domain source-card coverage. |
| `issue-classification-engine.js` | Query classification and authority promotion/guard behavior. | Generic guard, exact authority, unavailable BIR Ruling, TRAIN/RA authority tests. |
| `authority-utils.js` | Core parsing and authority normalization helpers. | Authority/source-card suite and exact-authority tests. |
| `retrieval-engine.js` | Retrieval behavior and candidate creation. | Full evaluation plus retrieval/source-card regressions. |
| `rag-answer-handler.js` | RAG answer path behavior. | Source-card, answer formatting, and retrieval controls. |
| `reranker-engine.js` | Candidate reranking and issue signal application. | Reranker extraction tests plus authority/source-card suite. |
| `vector-store.js` | Vector-store access and retrieval data shape. | Retrieval controls and no-indexing safety verification. |
| `reindex-service.js` | Reindex behavior and ingestion risk. | Phase 10 governance coverage only; no Phase 6G edits recommended. |
| `adaptive-tina-master-prompt.js` | Prompt behavior and answer discipline. | Mode-format and answer compliance coverage. |
| `prompts/audit-mode-prompt.js` | Audit mode behavior. | `/audit` mode-format and future adversarial reasoning coverage. |
| Route files | Public API behavior. | Route-level smoke plus mode-format coverage for affected endpoints. |

## 13. `pipeline.js` Decomposition Readiness Assessment

`pipeline.js` is not ready for direct decomposition in this patch.

Current readiness:

- Phase 6F evaluation guard now exists.
- Several helper destinations already exist from Phase 6B and Phase 6E.
- Source-card, authority selector, reranker, exact-authority, and vector-keyword helper modules provide plausible destination boundaries.

Remaining concerns:

- SourceAvailability classification still crosses classification, visibility, selector, authority, retrieval, and answer rendering boundaries.
- Generic-query guard and unavailable-source behavior are sensitive and must not regress.
- Response wording and source limitation behavior are user visible and should remain out of Phase 6G runtime changes unless narrowly scoped.
- Any `pipeline.js` edit requires express approval, focused coverage, and small patch scope.

Assessment:

```text
NOT READY FOR DIRECT PIPELINE.JS EDITS IN PATCH-06G-001.
READY FOR ARCHITECTURE REVIEW AND BOUNDARY APPROVAL IN PATCH-06G-002.
```

## 14. Phase Placement Recommendations

| Phase | Recommended work |
|---|---|
| Phase 6G | Architecture review of inventory, sourceAvailability boundary, source-card/selector ownership, and safe decomposition order. |
| Phase 6H or later | Narrow retrieval/pipeline decomposition only after Phase 6G review and additional coverage. |
| Phase 7A | Human conversational response layer, `/ask` and `/tax` formatting, source limitation wording. |
| Phase 7B | Audit/adversarial reasoning layer and complex advisory structure. |
| Phase 8 | Memory, user learning, firm/matter/user/global knowledge separation. |
| Phase 10 | Source governance, ingestion workflow, approval, archive, indexing, rollback. |
| Phase 12 | Document-aware advisory and client-file intelligence. |

## 15. Recommended Next Task

```text
PATCH-06G-002 - Claude Code architecture review of JS module inventory and decomposition boundaries
```

Recommended focus for PATCH-06G-002:

- Review this inventory and destination map.
- Decide whether SourceAvailability belongs primarily in `source-visibility-engine.js`, `services/source-authority-selector.js`, a narrowly scoped new policy module, or a split boundary.
- Approve or reject candidate future extraction sequence.
- Identify the minimum Phase 6F evaluation subset required before each future runtime patch.
- Confirm `pipeline.js` remains untouched until an explicit narrow patch is approved.

## 16. Risk Assessment

Overall risk for this patch:

```text
LOW
```

Reason:

- Documentation/state-only patch.
- No runtime files edited.
- No source ingestion, vector, DB, corpus, prompt, route, or pipeline behavior changed.

Risk for future decomposition:

```text
MEDIUM to HIGH depending on target boundary.
```

Highest-risk future targets:

- `pipeline.js`
- SourceAvailability classification
- Generic-query guard behavior
- Source limitation wording
- Retrieval orchestration
- Public response formatting
- Ingestion/governance modules

## 17. Confirmation that no runtime behavior was changed

Confirmed:

```text
PATCH-06G-001 is diagnostic/planning only.
No runtime `.js` or `.mjs` files were edited.
No tests were changed.
No DB/indexing/RAG/vector/corpus updates were performed.
No source ingestion was performed.
No `pipeline.js` edits were made.
```
