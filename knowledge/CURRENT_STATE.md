# CURRENT_STATE.md

## TINA Continuity Status

Current phase:

```text
PHASE 7B - Analytical / Adversarial Reasoning Layer
```

Current status:

```text
PHASE 6F CLOSED / PASS
PHASE 6G CLOSED / PASS
PHASE 6H CLOSED / PASS
PHASE 7A CLOSED / PASS
PHASE 7B ACTIVE / READY
PATCH-06F-GATE-1 COMPLETE / LOCAL PASS
PATCH-06G-001 COMPLETE / LOCAL PASS
PATCH-06G-002 COMPLETE / LOCAL PASS
PATCH-06G-003 COMPLETE / LOCAL PASS
PATCH-06G-004 COMPLETE / LOCAL PASS
PATCH-06G-005 COMPLETE / LOCAL PASS
PATCH-06G-GATE-1 COMPLETE / LOCAL PASS
PATCH-06H-001 COMPLETE / LOCAL PASS
PATCH-06H-002 COMPLETE / LOCAL PASS
PATCH-06H-003 COMPLETE / LOCAL PASS
PATCH-06H-004 COMPLETE / LOCAL PASS
PATCH-06H-005 COMPLETE / LOCAL PASS
PATCH-06H-006 COMPLETE / LOCAL PASS
PATCH-06H-007 COMPLETE / LOCAL PASS
PATCH-06H-GATE-1 COMPLETE / LOCAL PASS
PATCH-07A-001 COMPLETE / LOCAL PASS
PATCH-07A-002 COMPLETE / LOCAL PASS
PATCH-07A-003 COMPLETE / LOCAL PASS
PATCH-07A-004 COMPLETE / LOCAL PASS
PATCH-07A-005 COMPLETE / LOCAL PASS
PATCH-07A-006 COMPLETE / LOCAL PASS
PATCH-07A-007 COMPLETE / LOCAL PASS
PATCH-07A-007R COMPLETE / LOCAL PASS
PATCH-07A-008 COMPLETE / LOCAL PASS
PATCH-07A-GATE-1 COMPLETE / LOCAL PASS
PATCH-07B-001 COMPLETE / LOCAL PASS
PATCH-07B-002 COMPLETE / LOCAL PASS
PATCH-07B-003 COMPLETE / LOCAL PASS
PATCH-07B-004 COMPLETE / LOCAL PASS
PATCH-07B-005 COMPLETE / LOCAL PASS
PATCH-07B-006 COMPLETE / LOCAL PASS
PATCH-07B-007 COMPLETE / LOCAL PASS
PATCH-07B-008 COMPLETE / LOCAL PASS
PATCH-07B-009 COMPLETE / LOCAL PASS
PATCH-07B-010 COMPLETE / LOCAL PASS
PATCH-07B-011 COMPLETE / LOCAL PASS
PATCH-07B-012 COMPLETE / LOCAL PASS
PATCH-07B-GATE-1 COMPLETE / LOCAL PASS / PASS WITH RECOMMENDATIONS
PATCH-07B-013R COMPLETE / LOCAL PASS
PATCH-07B-014 COMPLETE / LOCAL PASS
```

Current backend branch:

```text
feature/source-availability-engine-v1
```

Current repo:

```text
C:/Projects/tina-backend
```

Backend service:

```text
tina-backend-staging
```

Environment:

```text
staging
```

Current known staging baseline:

```text
/health: ok
indexingRunning: false
vector store: 5,346 chunks / 102 sources
```

Current corpus / ingestion rule:

```text
No DB/indexing/RAG/vector/corpus updates unless expressly approved.
New Google Drive / Backblaze B2 / other source files remain parked or mirrored only.
No automatic ingestion until Phase 10 source-governance workflow is implemented.
```

Deferred roadmap / monitoring backlog:

```text
frontend state cleanup if needed
streaming response UX if needed
Zustand frontend evaluation if frontend state issues appear
Vercel AI SDK streaming/chat UX only if UX evidence supports it
Phase 7C/6F-LIVE answer-grounding/citation-faithfulness
Phase 8 memory/user learning/governed tax intelligence
Phase 9 professional workflow co-pilot
Phase 10 source governance, official-source acquisition, n8n/Crawlee/Apify/Google Drive/source repository
Phase 10 Tax Accuracy Evaluation and Reliability QA using deferred fact-check assets:
  tests/TINA_Tax_FactCheck_Answer_Key_v2.md
  evaluation/factcheck/README.md
  evaluation/factcheck/TINA_Tax_FactCheck_Test_Plan_v2.md
  evaluation/factcheck/TINA_Tax_FactCheck_Test_Cases_v2.md
  evaluation/factcheck/TINA_Tax_FactCheck_Scoring_Rubric_v2.md
  evaluation/factcheck/TINA_Tax_FactCheck_Run_Log_Template_v2.md
  evaluation/factcheck/TINA_Tax_FactCheck_Evaluation_Report_Template_v2.md
Phase 11 observability/query evidence/adaptive operations
Phase 12 document-aware advisory
Phase 13 full Philippine Tax Operating System
Phase 14 mobile app after Phase 13
Phase 15 long-term autonomous governance
source-governance red-team after Phase 10
full Tax Operating System red-team after Phase 13
```

Latest implemented patch:

```text
PATCH-07B-013R - Adversarial Content-Safety and Risk-Language Policy
```

Latest pushed commit:

```text
PATCH-07B-013R add adversarial content safety policy
```

Current working state:

```text
PATCH-07A-GATE-1 COMPLETE / LOCAL PASS
Phase 6H closed through stabilization gate (PATCH-06H-GATE-1).
Phase 7A is closed / PASS.
Phase 7B is active / ready for architecture review.
Key Phase 7A architecture findings:
- PATCH-07A-001 completed a full read-only architecture review for Phase 7A.
- Existing answer-renderer.js (v5.2.0) is a pure formatting-only layer — no OpenAI calls.
  It is the correct target for heading set and format changes.
- context-orchestration-engine.js (v5.0.0) is the sole file allowed to assemble OpenAI
  messages and call OpenAI. It is the correct target for tone and authority-state policy.
- prompts/audit-mode-prompt.js shows the correct pattern for mode-specific prompt separation.
  PATCH-07A-005 created prompts/tax-mode-prompt.js as prompt-only /tax guidance.
- The SAE disclosure layer in answer-renderer.js (buildSourceAvailabilityDisclosure) is
  already mandatory and must not be weakened by Phase 7A conversational formatting.
- The existing A-F heading structure should be preserved for /tax mode.
  A lighter conversational heading set should replace it for /ask general queries.
- Authority-state awareness must be injected into the OpenAI system prompt as an explicit
  instruction clause before response generation — not just as a formatting hint.
- applyVerifiedAuthorityGate (ask-handler.js imports from answer-renderer.js) must be
  assessed for compatibility with short /ask responses before PATCH-07A-004 begins.
- PATCH-07A-002 fixtures must be complete and passing before any runtime change begins.
- PATCH-07A-002 added local/static human response mode-format fixtures and focused
  regression tests for /ask conversational format, /tax senior memo format, /audit
  advisory format, authority-state response policy, source-card/source-limitation
  preservation, generic-query non-promotion, and mode escalation.
- PATCH-07A-002 did not change runtime behavior, prompts, routes/controllers, retrieval,
  reranker, authority normalization, source-card, sourceAvailability, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, or secrets.
- PATCH-07A-003 added local/static authority-state response policy fixtures and focused
  compatibility tests for short /ask answers, RELATED_AUTHORITY_ONLY caution,
  NO_INDEXED_SOURCE non-fabrication, GENERAL_TAX/generic guard non-promotion, /tax
  and /audit structure safety, and representative applyVerifiedAuthorityGate behavior.
- PATCH-07A-003 confirmed applyVerifiedAuthorityGate can be imported safely in local tests
  and preserves verified short answers, relabels related-only controlling headings, blocks
  citation leakage under NO_INDEXED_SOURCE, and blocks unverified citations even under
  AUTHORITY_FOUND.
- PATCH-07A-003 did not change runtime behavior, prompts, routes/controllers, retrieval,
  reranker, authority normalization, source-card, sourceAvailability, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, or secrets.
- PATCH-07A-004 implemented a narrow `/ask`-only conversational formatting pass in
  answer-renderer.js for FAST_DEFINITION, QUICK, and EMERGENCY_TRIM responses.
- PATCH-07A-004 maps eligible `/ask` answers to lighter Direct answer, Key explanation,
  Practical note, and Source / authority note sections while preserving downstream SAE
  disclosure and source-card behavior.
- PATCH-07A-004 protects `/tax` and `/audit` formatting through route/hook eligibility
  checks and focused regression tests.
- PATCH-07A-004 did not change prompts, routes/controllers, retrieval, reranker,
  authority normalization, source-card, sourceAvailability, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, or secrets.
- PATCH-07A-005 formalized `/tax` senior memo headings in answer-renderer.js:
  A. Short Answer / Conclusion, B. Governing Authority, C. Analysis,
  D. Compliance Effect, E. Caveats / Missing Facts, and F. Sources / Source Cards.
- PATCH-07A-005 created prompts/tax-mode-prompt.js as prompt-only guidance with
  authority-state caution and no retrieval, sourceAvailability, source-card, OpenAI,
  external-search, or Phase 7B reasoning logic.
- PATCH-07A-005 confirmed `/ask` conversational formatting and `/audit` advisory
  formatting remain isolated from `/tax` senior memo formatting.
- PATCH-07A-005 did not change routes/controllers, context orchestration, retrieval,
  reranker, authority normalization, source-card, sourceAvailability,
  package/dependency, DB/indexing/RAG/vector/corpus, ingestion, env, or secrets.
- PATCH-07A-006 formalized `/audit` advisory headings in answer-renderer.js:
  Quick Assessment, BIR Likely Position, Taxpayer Position / Defenses,
  Documentary Support Needed, Procedural Issues, Risk Level, Recommended Action,
  and Sources / Source Cards.
- PATCH-07A-006 strengthened prompts/audit-mode-prompt.js as prompt-only guidance
  with audit advisory structure, authority-state caution, source limitation discipline,
  and no outcome guarantees.
- PATCH-07A-006 confirmed `/ask` conversational formatting and `/tax` senior memo
  formatting remain isolated from `/audit` advisory formatting.
- PATCH-07A-006 did not change routes/controllers, context orchestration, retrieval,
  reranker, authority normalization, source-card, sourceAvailability,
  package/dependency, DB/indexing/RAG/vector/corpus, ingestion, env, or secrets.
- PATCH-07A-007 added a limited offline Phase 7A response-safety red-team fixture
  with 30 adversarial cases across /ask, /tax, and /audit.
- PATCH-07A-007 covers generic authority traps, fake citation bait,
  related-authority overclaiming, NO_INDEXED_SOURCE fabrication pressure,
  source-card misuse, prompt-injection-style safeguard suppression, forced yes/no
  overconfidence, mode confusion, structure contamination, and audit outcome
  overconfidence.
- PATCH-07A-007 added focused fixture tests only and did not change runtime behavior,
  prompts, routes/controllers, context orchestration, retrieval, reranker,
  authority normalization, source-card, sourceAvailability, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, or secrets.
- PATCH-07A-007R expanded the existing PATCH-07A-007 response-safety red-team
  fixture from 30 to 53 local/static cases after Gemini PASS WITH
  RECOMMENDATIONS review.
- PATCH-07A-007R strengthened safeguard-suppression prompts, source-card misuse
  traps, RELATED_AUTHORITY_ONLY overclaim traps, NO_INDEXED_SOURCE fabrication
  pressure, structure-contamination cases, forced yes/no caveat-removal cases,
  and audit-outcome overconfidence traps.
- PATCH-07A-007R hardened fixture tests with direct assertions for safeguard
  preservation, exact-vs-related distinction, no fabricated authority,
  mode-boundary preservation, material caveat preservation, source-card role
  preservation, and no guaranteed audit outcomes.
- PATCH-07A-007R did not change runtime behavior, prompts, routes/controllers,
  context orchestration, retrieval, reranker, authority normalization, source-card,
  sourceAvailability, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, or secrets.
- PATCH-07A-008 added a local/static source limitation wording and mode-boundary
  hardening fixture with 27 live-evidence-verified cases across /ask, /tax, /audit, RELATED_AUTHORITY_ONLY,
  NO_INDEXED_SOURCE, source-card authority status, safeguard suppression, and
  cross-mode contamination.
- PATCH-07A-008 added focused fixture/policy tests and pure renderer heading checks
  confirming /ask remains conversational, /tax remains senior memo, /audit remains
  audit advisory, and source limitation/source-card authority policies remain locked.
- PATCH-07A-008 did not change runtime behavior, prompts, routes/controllers,
  context orchestration, retrieval, reranker, authority normalization, source-card,
  sourceAvailability, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, or secrets.
- Recommended Phase 7A sequence: 002 fixtures -> 003 policy scaffold -> 004 /ask ->
  005 /tax -> 006 /audit -> 007 red-team fixture -> 007R coverage expansion ->
  008 hardening -> GATE-1.
- No pipeline.js, retrieval, reranker, sourceAvailability, source-card, DB/indexing/RAG/
  vector/corpus/ingestion, package/dependency, env, prompt, route, or controller changes
  occurred in PATCH-07A-001.
- PATCH-07A-GATE-1 validated Phase 7A artifacts, /ask, /tax, and /audit response
  formatting protections, authority-state/source-limitation discipline, red-team
  coverage, mode-boundary hardening, deferred roadmap notation, full regression
  suite, and protected-file guard.
- PATCH-07A-GATE-1 closed Phase 7A / PASS and did not implement Phase 7B,
  frontend cleanup, streaming UX, source governance/acquisition, DB/indexing/RAG/
  vector/corpus/ingestion, or full red-team work.
- PATCH-07B-001 completed a full read-only architecture review for Phase 7B.
- Key Phase 7B architecture decisions:
  1. Phase 7B reasoning feeds into Phase 7A format sections, not around them.
     Phase 7A /ask, /tax, and /audit section structures are preserved.
  2. Reasoning-safety-policy (Component 10) gates all Phase 7B reasoning components.
     It must be implemented before any reasoning engine is activated.
  3. Phase 10 temporal dependency is explicitly excluded from Phase 7B.
     Effective-date computation, supersession detection, and authority freshness
     checking are Phase 10 work. Phase 7B fixtures must include explicit
     temporal-dependency placeholders.
  4. Fixture-first always: PATCH-07B-002 through 07B-007 fixtures must all pass
     before PATCH-07B-008 first implementation begins.
  5. Gemini review of the architecture report is suggested before PATCH-07B-008.
  6. BIR Form 2307/2550M (PATCH-025B) requires Phase 7B-002 diagnostic fixture first.
     Runtime fix only if fixture confirms the issue is classification/reasoning,
     not corpus coverage.
  7. CTA 9711/9369/Seagate: Phase 7B designs reasoning cautions for case-applicability
     checks; live answer-grounding belongs to Phase 7C/6F-LIVE.
- Phase 7B proposed reasoning components (design only, not implemented):
  issue-framing-engine, fact-gap-detector, authority-applicability-engine,
  authority-conflict-advisor (placeholder only), bir-position-engine,
  taxpayer-position-engine, audit-defense-risk-engine, documentary-support-engine,
  procedural-issue-engine, reasoning-safety-policy, advisory-output-policy.
- Recommended Phase 7B sequence: 001 arch review -> 002 issue-framing fixture ->
  003 fact-gap fixture -> 004 applicability fixture -> 005 BIR/taxpayer position
  fixture -> 006 risk-language fixture -> 007 reasoning safety fixture -> 008 first
  narrow implementation -> GATE-1.
- PATCH-07B-001 did not change runtime behavior, prompts, routes, retrieval, reranker,
  sourceAvailability, source-card, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, or secrets.
- PATCH-07B-002 created a local/static analytical reasoning issue-framing fixture
  with 31 cases across WHT/EWT, VAT zero-rating, NOLCO, deductibility/
  substantiation, CWT/Form 2307, BIR audit procedure, invoice mismatch/VAT input,
  reimbursable/pass-through billing, authority-state reasoning posture, and
  policy-first/non-engine scaffold coverage.
- PATCH-07B-002 added focused scaffold tests confirming top-level runtime-safety
  metadata, mode coverage, authority-state coverage, user fact gap vs source
  coverage gap separation, Phase 10 metadata/source governance deferrals,
  authority hierarchy/conflict placeholders, supersession/effective-date deferrals,
  numeric risk scoring deferral, and Phase 7A safeguard preservation.
- PATCH-07B-002 did not create runtime engines and did not change runtime behavior,
  prompts, routes, retrieval, reranker, sourceAvailability, source-card,
  package/dependency, DB/indexing/RAG/vector/corpus, ingestion, env, or secrets.
- PATCH-07B-003 added a local/static fact-gap detector fixture with 36 cases across
  withholding/EWT, VAT zero-rating, NOLCO, deductibility/substantiation,
  CWT/Form 2307, BIR audit procedure, invoice mismatch/VAT input,
  reimbursable/pass-through billing, authority-state fact-gap behavior, client
  fact-pattern checklist scaffold, and policy-first/non-engine scaffold coverage.
- PATCH-07B-003 added focused fixture tests confirming top-level runtime-safety
  metadata, mode coverage, authority-state coverage, critical versus helpful
  missing fact separation, assumptions-not-allowed coverage, document/timing/
  taxpayer-status/transaction-character/assessment-stage gap coverage, user fact
  gap versus source coverage gap separation, Phase 10 metadata/source governance
  deferrals, hierarchy/conflict placeholders, supersession/effective-date
  deferrals, numeric risk scoring deferral, client checklist fact-gathering-only
  behavior, policy-first non-engine safeguards, and Phase 7A safeguard preservation.
- PATCH-07B-003 did not create runtime engines and did not change runtime behavior,
  prompts, routes, retrieval, reranker, sourceAvailability, source-card,
  issue-classification, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, or secrets.
- PATCH-07B-004 added a local/static authority applicability policy fixture with
  35 cases across statutory/NIRC applicability, Revenue Regulation applicability,
  RMC/RMO applicability, BIR ruling applicability, court decision applicability,
  effective-date/transition placeholders, supersession/amendment placeholders,
  taxpayer-type/transaction-type applicability, procedural posture applicability,
  authority-state applicability behavior, and policy-first/non-engine scaffold
  coverage.
- PATCH-07B-004 added focused fixture tests confirming runtime-safety metadata,
  mode coverage, authority-state coverage, authority type coverage, applicability
  classification coverage, required field completeness, user fact gap versus
  source coverage gap separation, taxpayer/transaction/period checklist coverage,
  hierarchy/effective-date/supersession placeholder treatment, RELATED_AUTHORITY_ONLY
  and NO_INDEXED_SOURCE non-overclaim behavior, GENERAL_TAX non-promotion,
  BIR ruling non-addressee limits, court decision fact/procedural posture limits,
  Phase 10 dependency policy, policy-first non-engine safeguards, and Phase 7A
  safeguard preservation.
- PATCH-07B-004 did not create runtime engines and did not change runtime behavior,
  prompts, routes, retrieval, reranker, sourceAvailability, source-card,
  issue-classification, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, or secrets.
- PATCH-07B-005 added a local/static BIR vs taxpayer position policy fixture with
  40 cases across EWT/withholding deficiency, CWT/Form 2307 disallowance,
  VAT zero-rating disallowance, input VAT invoice mismatch, deductibility/
  substantiation, reimbursable/pass-through billing, LOA/PAN/FAN/FDDA procedure,
  prescription/assessment timing, NOLCO disallowance, authority-state BIR vs
  taxpayer behavior, settlement/protest posture scaffold, and policy-first/
  non-engine scaffold coverage.
- PATCH-07B-005 added focused fixture tests confirming runtime-safety metadata,
  mode coverage, authority-state coverage, authority support level policy,
  risk-level policy, settlement/protest posture policy, required field
  completeness, user fact gap versus source coverage gap separation, BIR likely
  position versus taxpayer position distinction, strongest support versus weakest
  facts/documents distinction, required documents coverage, qualitative exposure
  indicators, no guaranteed outcome policy, no hidden weakness policy,
  RELATED_AUTHORITY_ONLY and NO_INDEXED_SOURCE non-overclaim behavior,
  GENERAL_TAX orientation-only behavior, Phase 10 dependency policy,
  policy-first non-engine safeguards, and Phase 7A safeguard preservation.
- PATCH-07B-005 did not create runtime engines and did not change runtime behavior,
  prompts, routes, retrieval, reranker, sourceAvailability, source-card,
  issue-classification, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, or secrets.
- PATCH-07B-006 added a local/static audit-defense risk-language policy fixture
  with 41 cases across EWT/withholding deficiency, CWT/Form 2307 disallowance,
  VAT zero-rating, input VAT invoice mismatch, deductibility/substantiation,
  reimbursable/pass-through billing, LOA/PAN/FAN/FDDA procedure, prescription/
  assessment timing, NOLCO disallowance, authority-state risk-language behavior,
  settlement/protest posture, and policy-first/non-engine risk-language traps.
- PATCH-07B-006 added focused fixture tests confirming runtime-safety metadata,
  mode coverage, authority-state coverage, authority/fact/document/procedural
  strength policy values, risk-level policy, uncertainty-level policy,
  settlement/protest posture policy, required field completeness, user fact gap
  versus source coverage gap separation, qualitative exposure indicators,
  prohibited numeric scoring, no guaranteed outcome policy, no hidden weakness
  policy, RELATED_AUTHORITY_ONLY and NO_INDEXED_SOURCE risk-language limits,
  GENERAL_TAX orientation-only behavior, AUTHORITY_FOUND not overriding weak
  facts/documents, Phase 10 dependency policy, policy-first non-engine safeguards,
  and Phase 7A safeguard preservation.
- PATCH-07B-006 did not create runtime engines and did not change runtime behavior,
  prompts, routes, retrieval, reranker, sourceAvailability, source-card,
  issue-classification, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, secrets, or deferred Phase 10 fact-check assets.
- PATCH-07B-007 added a local/static reasoning-safety and source-state guard
  fixture with 44 cases across authority-state discipline, source-card discipline,
  fact gaps, source-coverage gaps, authority applicability, BIR-vs-taxpayer
  reasoning, audit risk language, settlement/protest posture, mode boundaries,
  Phase 10 boundaries, and policy-first/non-engine traps.
- PATCH-07B-007 added focused fixture tests confirming runtime-safety metadata,
  mode coverage, authority-state coverage, allowed safety postures, allowed
  source-card states, required field completeness, user fact gap versus source
  coverage gap separation, related-authority caution, no-indexed-source
  non-fabrication, GENERAL_TAX non-promotion, AUTHORITY_FOUND not overriding
  weak facts/documents, source cards not overriding sourceAvailability,
  assumptions not becoming facts, no live source acquisition claims, Phase 10
  dependency policy, no hidden weakness, no guaranteed outcome, no numeric
  scoring, settlement/protest caution, mode-boundary preservation, policy-first
  non-engine safeguards, and Phase 7A safeguard preservation.
- PATCH-07B-007 did not create runtime engines and did not change runtime behavior,
  prompts, routes, retrieval, reranker, sourceAvailability, source-card,
  issue-classification, package/dependency, DB/indexing/RAG/vector/corpus,
  ingestion, env, secrets, or deferred Phase 10 fact-check assets.
- PATCH-07B-GEMINI-REVIEW-1 returned PASS WITH RECOMMENDATIONS and approved
  proceeding to PATCH-07B-008 as a narrow runtime implementation limited to issue
  framing and reasoning-safety policy.
- PATCH-07B-008 added issue-framing-engine.js as a deterministic, dependency-free,
  issue-framing-only helper with controlled issue-family and tax-type taxonomy,
  preserved known facts, missing facts, source coverage needs, source-state caution,
  mode boundary, prohibited conclusions, and implementationScope
  ISSUE_FRAMING_ONLY.
- PATCH-07B-008 added reasoning-safety-policy.js as a deterministic,
  dependency-free safety helper for AUTHORITY_FOUND, RELATED_AUTHORITY_ONLY,
  NO_INDEXED_SOURCE, and GENERAL_TAX postures, source-card discipline, unsafe
  instruction rejection, and /ask, /tax, /audit mode boundaries.
- PATCH-07B-008 strengthened NO_INDEXED_SOURCE /audit posture by prohibiting BIR
  legal-position generation, taxpayer legal-position generation, fabricated
  authority, direct legal support, and legal conclusions from unavailable indexed
  authority.
- PATCH-07B-008 did not implement BIR/taxpayer runtime engines, audit risk runtime
  scoring, authority conflict resolution, hierarchy runtime, supersession runtime,
  effective-date runtime, source governance/acquisition, memory, workflow
  generation, observability, frontend, streaming, prompt changes, retrieval,
  reranker, sourceAvailability, source-card behavior, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, secrets, or deferred Phase 10
  fact-check assets.
- PATCH-07B-009 added fact-gap-helper.js as a deterministic, dependency-free,
  fact-gap-helper-only runtime module with identifyFactGaps(input) and
  buildFactChecklist(inputOrFactGapResult).
- PATCH-07B-009 identifies critical missing facts, helpful missing facts,
  document gaps, timing/period gaps, taxpayer-status gaps, transaction-character
  gaps, assessment-stage gaps, and checklist questions while preserving known
  facts and source coverage needs separately.
- PATCH-07B-009 integrates narrowly with issue-framing-engine.js and
  reasoning-safety-policy.js from PATCH-07B-008, preserving NO_INDEXED_SOURCE
  /audit caution and RELATED_AUTHORITY_ONLY / GENERAL_TAX posture without
  broad reasoning.
- PATCH-07B-009 did not implement BIR/taxpayer runtime engines, audit risk runtime
  scoring, settlement/protest strategy runtime, authority applicability runtime,
  authority conflict resolution, hierarchy runtime, supersession runtime,
  effective-date runtime, source governance/acquisition, memory, workflow
  generation, observability, frontend, streaming, prompt changes, retrieval,
  reranker, sourceAvailability, source-card behavior, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, secrets, or deferred Phase 10
  fact-check assets.
- PATCH-07B-010 added client-fact-checklist-output.js as a deterministic,
  dependency-free client fact-pattern checklist output helper with
  buildClientFactChecklistOutput(input), formatChecklistForMode(checklistResult,
  mode), buildModeBoundaryCaution(mode), and
  buildProhibitedNextSteps(inputOrChecklistResult).
- PATCH-07B-010 exposes checklistType CLIENT_FACT_PATTERN_CHECKLIST and
  implementationScope CLIENT_FACT_CHECKLIST_OUTPUT_ONLY while preserving known
  facts, critical questions, helpful questions, document requests, timing/period
  questions, taxpayer-status questions, transaction-character questions,
  assessment-stage questions, source coverage needs, source-state caution, mode
  boundary caution, must-answer-before-final-advice items, and prohibited next
  steps.
- PATCH-07B-010 integrates narrowly with fact-gap-helper.js,
  issue-framing-engine.js, and reasoning-safety-policy.js without changing their
  public behavior, and preserves NO_INDEXED_SOURCE /audit caution.
- PATCH-07B-010 did not implement BIR/taxpayer runtime engines, audit risk
  runtime scoring, settlement/protest strategy runtime, authority applicability
  runtime conclusions, authority conflict resolution, hierarchy runtime,
  supersession runtime, effective-date runtime, source governance/acquisition,
  memory, workflow generation, observability, frontend, streaming, prompt
  changes, retrieval, reranker, sourceAvailability, source-card behavior,
  package/dependency, DB/indexing/RAG/vector/corpus, ingestion, env, secrets, or
  deferred Phase 10 fact-check assets.
- PATCH-07B-011 added authority-applicability-helper.js as a deterministic,
  dependency-free authority-applicability-helper-only runtime module with
  assessAuthorityApplicability(input) and
  buildAuthorityApplicabilityChecklist(input).
- PATCH-07B-011 classifies applicabilityLevel and mechanically derived
  applicabilityPosture from already-known inputs, preserves missing
  applicability facts separately from source coverage needs, preserves
  source-state caution through reasoning-safety-policy.js, and flags Phase 10
  dependency needs without resolving them.
- PATCH-07B-011 activated all 35 PATCH-07B-004 authority applicability fixture
  cases in focused runtime tests and preserved authority-state hard caps for
  NO_INDEXED_SOURCE, RELATED_AUTHORITY_ONLY, GENERAL_TAX, and AUTHORITY_FOUND.
- PATCH-07B-011 did not implement BIR/taxpayer runtime engines, audit risk
  runtime scoring, settlement/protest strategy runtime, authority conflict
  resolution, hierarchy runtime, supersession runtime, effective-date runtime,
  source currentness runtime, source governance/acquisition, memory, workflow
  generation, observability, frontend, streaming, prompt changes, retrieval,
  reranker, sourceAvailability, source-card behavior, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, secrets, or deferred Phase 10
  fact-check assets.
- PATCH-07B-012 completed reasoning runtime integration guard and composition
  tests for issue-framing-engine.js, reasoning-safety-policy.js,
  fact-gap-helper.js, client-fact-checklist-output.js, and
  authority-applicability-helper.js.
- PATCH-07B-012 added a test-only composed helper chain covering /ask, /tax,
  /audit, GENERAL_TAX, NO_INDEXED_SOURCE, RELATED_AUTHORITY_ONLY, and
  AUTHORITY_FOUND scenarios, plus VAT zero-rating, CWT/Form 2307, BIR audit
  procedure, and NOLCO fact-gap scenarios.
- PATCH-07B-012 confirmed composed output remains issue-framing only,
  fact-gathering only, checklist-oriented, authority-applicability posture-only,
  source-state cautious, mode-boundary preserving, and free from final legal
  conclusions.
- PATCH-07B-012 confirmed there is no live route/prompt integration yet, no
  BIR/taxpayer runtime engine yet, no audit risk runtime engine yet, no
  settlement/protest strategy runtime yet, and no authority
  conflict/hierarchy/supersession/effective-date runtime engine yet.
- PATCH-07B-012 did not change prompts, routes/controllers, retrieval,
  reranker, sourceAvailability, source-card behavior, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, secrets, or deferred Phase 10
  fact-check assets.
- PATCH-07B-GATE-1 completed the Phase 7B narrow runtime safety gate with a
  PASS WITH RECOMMENDATIONS decision.
- PATCH-07B-GATE-1 validated the narrow runtime block PATCH-07B-008 through
  PATCH-07B-012, including helper existence, focused tests, composition safety,
  source-state caution, mode-boundary preservation, user fact gap versus source
  coverage gap separation, and authority-state hard caps.
- PATCH-07B-GATE-1 confirmed there is no live route/prompt integration yet, no
  BIR/taxpayer runtime engine yet, no audit risk runtime engine yet, no
  settlement/protest strategy runtime yet, and no authority
  conflict/hierarchy/supersession/effective-date runtime engine yet.
- PATCH-07B-GATE-1 did not change runtime helper behavior, prompts,
  routes/controllers, retrieval, reranker, sourceAvailability, source-card
  behavior, package/dependency, DB/indexing/RAG/vector/corpus, ingestion, env,
  secrets, or deferred Phase 10 fact-check assets.
- PATCH-07B-013R added adversarial-content-safety-policy.js as the centralized
  adversarial content-safety and risk-language policy module required before any
  BIR/taxpayer runtime helper.
- PATCH-07B-013R centralizes deterministic sanitization, context-aware
  prohibited conclusions, hidden-weakness policy, numeric-risk policy,
  settlement/protest policy, Phase 10 dependency flag handling, and structured
  adversarial safety assertions.
- PATCH-07B-013R confirmed there was still no BIR/taxpayer runtime helper yet,
  no audit-risk runtime helper yet, no settlement/protest runtime yet, no
  authority conflict/hierarchy/supersession/effective-date runtime engine yet,
  and no live route/prompt integration yet.
- PATCH-07B-013R did not change prompts, routes/controllers, retrieval,
  reranker, sourceAvailability, source-card behavior, package/dependency,
  DB/indexing/RAG/vector/corpus, ingestion, env, secrets, or deferred Phase 10
  fact-check assets.
- PATCH-07B-014 added bir-vs-taxpayer-position-helper.js as the first narrow
  BIR vs taxpayer position runtime helper.
- PATCH-07B-014 exposes assessBirTaxpayerPositions(input) and
  buildPositionFramingChecklist(input) with implementationScope
  BIR_TAXPAYER_POSITION_HELPER_ONLY and hard false capability flags for final
  conclusions, risk scoring, and settlement recommendation.
- PATCH-07B-014 integrates adversarial-content-safety-policy.js directly through
  applyAdversarialContentSafetyPolicy, sanitizeAdversarialText, and
  assertAdversarialSafety; generated position text is conditional, sanitized,
  weakness-paired, and non-conclusive.
- PATCH-07B-014 preserves authority-state boundaries for NO_INDEXED_SOURCE,
  GENERAL_TAX, RELATED_AUTHORITY_ONLY, and AUTHORITY_FOUND, and preserves
  Phase 10 dependency flags without resolving hierarchy, conflict,
  supersession, effective date, currentness, ruling/case status, or source
  metadata.
- PATCH-07B-014 did not implement audit-risk runtime helper, settlement/protest
  runtime, CTA/forum strategy runtime, compromise calculation, authority
  conflict/hierarchy/supersession/effective-date runtime engine, live
  route/prompt integration, source governance, retrieval/reranker changes,
  sourceAvailability/source-card changes, package/dependency changes,
  DB/indexing/vector/corpus/ingestion changes, or deferred Phase 10 assets.
```

Immediate next task:

```text
PATCH-07B-GEMINI-REVIEW-5 - BIR vs Taxpayer Position Runtime Helper Review
```

Recommended agent:

```text
Gemini
```

Gemini review:

```text
Required after PATCH-07B-014 because this is the first runtime helper capable of generating BIR-side and taxpayer-side position framing.
```

Expected next gate:

```text
TBD after PATCH-07B-GEMINI-REVIEW-5 recommendations
```

Next phase:

```text
PHASE 7B - Analytical / Adversarial Reasoning Layer
```

Recommended agent:

```text
Codex
```

Gemini review for next task:

```text
Required; Gemini should review adversarial-content-safety integration and strict boundary preservation before any further adversarial runtime work.
```

---

## Governance Rule

TINA development must follow:

```text
LIVE EVIDENCE > THEORY > PATCH
```

Required backend workflow:

```text
1. UI or live evidence
2. Render/staging logs where available
3. Investigation
4. Root-cause classification
5. Patch approval
6. Narrow implementation
7. Local tests
8. Commit
9. Push
10. Staging validation
11. Only then proceed
```

Do not patch from assumptions.

Do not broaden patch scope.

Do not mix unrelated features with decomposition or diagnostics.

Do not touch `pipeline.js` unless expressly approved.

Do not update DB/indexing/RAG/vector/corpus unless expressly approved.

---

## Work Owner Rule

### Codex

Use **Codex** for:

```text
narrow implementation
small extraction patches
test writing
local validation
commits
pushes
staging validation
diagnostic runs
repo verification
```

Codex remains the primary implementation worker for the current Phase 6E work.

### Claude Code

Use **Claude Code** for:

```text
broad architecture planning
large refactor strategy
pipeline decomposition design
phase planning
risk analysis
module boundary design
future system architecture
```

Claude Code is the architecture/refactor planning owner, especially before deep work on:

```text
pipeline.js
source-authority-selector.js
authority-utils.js
route/controller decomposition
memory architecture
workflow orchestration
source-governance architecture
```

### Gemini / GLM / GitHub Copilot / other coding agents

Status:

```text
PARKED
```

Use only later as optional reviewers or experiments after the relevant phase or after all TINA phases are complete.

Current rule:

```text
Do not switch primary implementation away from Codex during Phase 6E closure.
```

### External GitHub / AI Tools

The following are parked for now:

```text
Claude Cookbooks
DSPy
nanoGPT
Honeycomb
Hermes Agent
OpenDesign / opencode
Headroom
DeepSeek-R1-Distill-Qwen-14B
GLM 5.2
Gemini
GitHub Copilot Agent Mode
other external GitHub tool explorations
```

They are not abandoned, but they are deferred until the relevant later phase.

---

# Completed Phase Status

## Phase 1 â€” Core Tax Assistant

Status:

```text
COMPLETE
```

## Phase 2 â€” Retrieval Foundation

Status:

```text
COMPLETE
```

## Phase 3 â€” Authority-Aware Retrieval

Status:

```text
COMPLETE
```

## Phase 4 â€” Retrieval Integrity and Authority Discipline

Status:

```text
COMPLETE
```

## Phase 5 â€” Source Availability Engine V1

Status:

```text
COMPLETE / STAGING PASS
```

TINA reached:

```text
Authority-Safe Candidate
```

## Phase 6 â€” NIRC Metadata and Authority Normalization

Status:

```text
COMPLETE / STABILIZED
```

## Phase 6B â€” Controlled Decomposition and Registry Extraction

Status:

```text
COMPLETE / STABILIZED
```

Key result:

```text
PATCH-034A through PATCH-034H completed.
Phase 6B extracted-module behavior stable.
```

## Phase 6C â€” Known Authority Backlog Fixes

Status:

```text
COMPLETE / STABILIZED
```

Key result:

```text
PATCH-035 series completed.
TRAIN Law / RA 10963 retrieval bridge and source-card behavior stabilized.
```

## Phase 6D â€” Post-PATCH-035 Stabilization

Status:

```text
COMPLETE
```

Key result:

```text
PATCH-035D post-035 stabilization gate completed.
No DB/indexing/RAG/vector/corpus changes.
```

---

# Closed Phase

## Phase 6E - Controlled Source Authority Extraction

Status:

```text
CLOSED / PASS
```

Purpose:

```text
Continue safe JavaScript decomposition and source-authority helper extraction without changing behavior.
Preserve authority safety, sourceAvailability, source-card labels, public URLs, click targets, exact authority behavior, and guarded fallback behavior.
```

Current Phase 6E completed work:

```text
PATCH-06E-001  â€” Safe JS decomposition plan
PATCH-06E-002  â€” Source-authority selector card sanitizer extraction
PATCH-06E-002S â€” Source-card sanitizer staging smoke
PATCH-06E-003  â€” Philippine tax boundary pattern constants extraction
PATCH-06E-003S â€” Boundary pattern staging smoke
PATCH-06E-004  â€” Reranker normalizers extraction
PATCH-06E-004S â€” Reranker normalizers staging smoke
PATCH-06E-005  â€” Reranker issue-signal helpers extraction
PATCH-06E-005S â€” Reranker issue signals staging smoke
PATCH-06E-GATE-1 â€” First-wave stabilization gate
PATCH-06E-006  â€” Issue exact-authority detector extraction
PATCH-06E-006S â€” Issue exact-authority detector staging smoke
PATCH-06E-007  â€” Vector authority keyword builders extraction
PATCH-06E-007S â€” Vector authority keyword builders staging smoke
PATCH-06E-GATE-2 â€” Post-006/007 stabilization gate
PATCH-06E-008  â€” Source-authority selector eligibility extraction
PATCH-06E-008S â€” Source-authority selector eligibility staging smoke
PATCH-06E-009  â€” Ask-handler public source sanitizer extraction
PATCH-06E-009S â€” Ask-handler sanitizer staging diagnostic
PATCH-06E-009T â€” BIR Ruling DA-489-03 promotion diagnostic
PATCH-06E-010  â€” Unavailable BIR Ruling SourceAvailability Guard
PATCH-06E-010S â€” Unavailable BIR Ruling Guard Staging Smoke
PATCH-06E-GATE-3 - Phase 6E Closure Gate
```

Current pending work inside Phase 6E:

```text
None. Phase 6E is closed.
```

Optional only if closure gate identifies a remaining issue:

```text
PATCH-06E-011 â€” Last narrow extraction or diagnostic only if needed
```

---

# Latest Patch Detail

## PATCH-06E-010 â€” Unavailable BIR Ruling SourceAvailability Guard

Status:

```text
COMPLETE / PUSHED / LOCAL PASS
```

Commit:

```text
c2b6380 PATCH-06E-010 guard unavailable BIR Ruling promotion
```

Purpose:

```text
Prevent specific unavailable BIR Ruling-number queries from being promoted to AUTHORITY_FOUND through unrelated G.R./NIRC substitute cards.
```

Root-cause diagnostic from PATCH-06E-009T:

```text
Query:
What is BIR Ruling DA-489-03?

Observed staging behavior before PATCH-06E-010:
AUTHORITY_FOUND with public cards:
- G.R. No. 187485
- G.R. No. 226592
- NIRC Sec. 2

No BIR Ruling DA-489-03 source card was exposed.

Root cause:
Primary: sourceAvailability promotion gap.
Secondary: missing source / expected unavailable-source behavior and BIR Ruling exclusion gap.
Not caused by PATCH-06E-009 sanitizer extraction.

Corpus status:
BIR Ruling DA-489-03 does not exist in the staging vector-store source list.
```

Guard location:

```text
Narrow classifier-side guard in issue-classification-engine.js.
```

Guard behavior:

```text
Specific BIR Ruling-number queries now get a specific BIR Ruling signal/reference.
Non-matching/non-BIR candidates fail the existing material-authority match path.
Unrelated G.R./NIRC candidates should no longer become AUTHORITY_FOUND for unavailable specific BIR Ruling queries.
```

Files reported changed:

```text
issue-classification-engine.js
tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
```

Note for next validation:

```text
User display also showed authority-utils.js +6/-6 in the edited file list.
Before PATCH-06E-010S, verify actual committed file list with:
git show --name-only --stat c2b6380
```

Local validation:

```text
Focused 06E-010 test: PASS
Targeted authority/source-card/EWT-WHT controls: PASS
npm test: PASS, 10 syntax checks + 65 suites, 0 failures
npm run guard:files: PASS
```

Staging validation:

```text
PASS on staging.
Deployed commit matched c2b6380.
indexingRunning=false.
Vector store remained 5,346 chunks / 102 sources.
Unavailable BIR Ruling DA-489-03 variants returned NO_INDEXED_SOURCE with zero cards and no unrelated G.R./NIRC substitute promotion.
```

Next required task:

```text
PATCH-06G-002 - Claude Code architecture review of JS module inventory and decomposition boundaries
```

---

# Immediate Next Codex Task

## PATCH-06G-002 - Claude Code architecture review of JS module inventory and decomposition boundaries

Objective:

```text
Review the PATCH-06G-001 JS module inventory and decomposition destination map before any runtime decomposition begins.
Keep pipeline.js untouched unless a later narrow patch expressly approves it.
```

---

# Current Extracted / New Modules

The following extracted modules now exist or have been added through Phase 6B and Phase 6E:

```text
source-card-engine.js
authority-restoration-engine.js
source-intent-registry.js
taxpayer-definition-registry.js
authority-alias-registry.js
vector-authority-reference-registry.js
doctrine-authority-map.js
services/source-authority-selector-card-sanitizer.js
services/philippine-tax-boundary-patterns.js
reranker-normalizers.js
reranker-issue-signals.js
issue-exact-authority-detector.js
vector-authority-keyword-builders.js
services/source-authority-selector-eligibility.js
services/ask-handler-public-source-sanitizer.js
```

---

# Phase 6F - Automated Evaluation & Regression Harness

Status:

```text
CLOSED / PASS
```

Start condition:

```text
Phase 6E is closed. PATCH-06F-001 completed the local evaluation runner skeleton.
```

Purpose:

```text
Create a permanent testing/evaluation harness inspired by evaluation-cookbook patterns, but governed for TINA.
This is not a replacement for TINA and not an external repo integration.
It is an internal evaluation layer.
```

Planned work:

```text
PATCH-06F-001 â€” Create TINA evaluation runner skeleton - COMPLETE / LOCAL PASS
PATCH-06F-001R â€” Codex crash recovery report - COMPLETE / PUSHED
PATCH-06F-002 â€” Authority/source-card regression suite - COMPLETE / LOCAL PASS
PATCH-06F-003 â€” CTA / G.R. click-target integrity tests - COMPLETE / LOCAL PASS
PATCH-06F-004 â€” Generic-query guard regression tests - COMPLETE / LOCAL PASS
PATCH-06F-005 â€” Exact-source limitation wording regression tests - COMPLETE / LOCAL PASS
PATCH-06F-006 â€” Mode-format evaluation: /ask, /tax, /audit - COMPLETE / LOCAL PASS
PATCH-06F-007 â€” Domain source-card coverage tests: EWT, VAT, PEZA, LOA - COMPLETE / LOCAL PASS
PATCH-06F-008 â€” Staging evaluation report generator - COMPLETE / LOCAL PASS
PATCH-06F-GATE-1 â€” Phase 6F Evaluation Harness Stabilization Gate - COMPLETE / LOCAL PASS
```

Critical behaviors to lock:

```text
NIRC Sec. 57 source card appears
NIRC Sec. 58 remains correct
RR 2-98 authority identity preserved
RR 12-2018 source behavior preserved
RMC 65-2012 source behavior preserved
RMO 20-2013 / RMO 24-2013 source behavior preserved
Generic EWT/WHT does not over-promote authority
Generic TRAIN query does not falsely promote RA 10963
Generic Republic Act query is rejected or guarded
BIR Ruling exclusion / unavailable-source guard remains preserved
CTA Case No. 9369 source card opens the correct case
Source-card label, public URL, and click target match
```

---

# Future Phase Roadmap

## Phase 6H - Retrieval / Reranker / Authority Normalization Under Evaluation Guard

Status:

```text
CLOSED / PASS
```

Purpose:

```text
Mapped retrieval, reranker, authority normalization, PATCH-029-style bare citation normalization, and possible classifySourceAvailability extraction planning under the completed Phase 6F evaluation guard.
Closed through PATCH-06H-GATE-1 with no retrieval/reranker/sourceAvailability runtime changes beyond the narrow exact-authority detector normalization fix.
```

## Phase 7A â€” Human Conversational Response Layer

Status:

```text
CLOSED / PASS
```

Purpose:

```text
Make TINA answer like a professional tax adviser, not merely a retrieval engine.
Improve clarity, structure, tone, examples, and practical explanation while preserving authority discipline.
```

## Phase 7B â€” Analytical / Adversarial Reasoning Layer

Status:

```text
ACTIVE / READY
```

Purpose:

```text
Risk flags, conflicts, counterarguments, fact gaps, supersession checks, audit/litigation positioning, and adversarial review.
Validator false-positive fixes such as BIR Form 2307 / 2550M may be routed here if they are response/analysis-layer issues rather than retrieval baseline issues.
```

## Phase 7C / 6F-LIVE - Live Answer-Grounding and Citation-Faithfulness Evaluation

Status:

```text
NOT STARTED
```

Purpose:

```text
Live answer-grounding and citation-faithfulness evaluation, including CTA 9711 / CTA 9369 / Seagate-style grounding checks.
```

## Phase 8 â€” Memory, User Learning & Governed Tax Intelligence

Status:

```text
NOT STARTED
```

Purpose:

```text
Implement governed continuous learning, user learning, /quiz and /review progress, firm memory, client/matter memory, and Tax Guru personalization.
```

Knowledge separation rule:

```text
User questions teach TINA demand patterns and personalization.
Quiz/review results teach TINA user mastery and weaknesses.
Client/matter facts teach TINA private matter context.
Only approved source-backed materials teach TINA the law.
```

Knowledge layers:

```text
Global Knowledge:
Approved tax/legal/regulatory sources available to all users.

Firm Knowledge:
BCCPAs templates, workflows, methodology, preferred formats, internal playbooks.

User Memory:
User preferences, quiz/review history, learning weaknesses, frequent topics, answer style.

Matter Memory:
Client/entity/case-specific facts, assumptions, documents, issue history.
```

Suggested work:

```text
PATCH-08A â€” Memory governance design
PATCH-08B â€” Global vs firm vs user vs matter memory schema
PATCH-08C â€” User query learning log
PATCH-08D â€” /quiz and /review learning memory
PATCH-08E â€” Matter/client memory
PATCH-08F â€” Firm knowledge layer
PATCH-08G â€” Global knowledge promotion workflow
PATCH-08H â€” Tax Guru personalization engine
PATCH-08I â€” Memory privacy and audit trail
```

## Phase 9 â€” Professional Workflow Co-Pilot

Status:

```text
NOT STARTED
```

Purpose:

```text
Professional outputs and practice workflows.
```

Examples:

```text
BIR replies
audit defense matrices
client letters
engagement checklists
tax position memos
compliance trackers
document workflows
```

## Phase 10 â€” Regulatory Monitoring, Source Governance & Ingestion Automation

Status:

```text
NOT STARTED
```

Purpose:

```text
Controlled regulatory source monitoring, archival, approval, ingestion, metadata governance, validation, and rollback.
Metadata schema/source registry design, authority metadata fields, and PATCH-026-style source coverage belong here unless explicitly pulled forward by an approved gate.
```

Tool roles later:

```text
Apify:
Source discovery / crawler layer for BIR, SEC, CTA, Supreme Court, DOF, PEZA, BOI, LGU and other regulatory pages.

n8n:
Workflow orchestration for scheduled monitoring, download workflows, manifest creation, checksum generation, Backblaze B2 archiving, human approval routing, ingestion queue creation, validation, notifications, and rollback.

Backblaze B2:
Source archive / standby source-of-truth storage after governance.
```

Critical rule:

```text
Apify finds.
n8n orchestrates.
B2 stores.
Human/governance approves.
TINA ingests only approved sources.
```

## Phase 11 â€” Speed, Scaling, Token, Model & Deployment Optimization

Status:

```text
NOT STARTED
```

Purpose:

```text
Token efficiency, model comparison, open-weights testing, observability, deployment optimization, and scaling.
Query evidence logging and possible Langfuse / Vercel AI SDK use belong here unless explicitly approved earlier.
```

Parked tools for later review:

```text
Headroom
GLM
Gemini
DeepSeek-R1-Distill-Qwen-14B
GitHub Copilot Agent Mode
Honeycomb
other model/deployment/observability tools
```

Current rule:

```text
No external tool integration during Phase 6E closure.
Headroom may be used only as developer-side token-efficiency tooling, not inside TINA runtime.
```

## Phase 12 â€” Document-Aware Advisory & Client File Intelligence

Status:

```text
NOT STARTED
```

Purpose:

```text
Client-file-aware advisory, document understanding, matter-specific answers, document-grounded workflows.
```

## Phase 13 â€” Philippine Tax Operating System / Full Tax Guru

Status:

```text
NOT STARTED
```

Purpose:

```text
Mature TINA as a Philippine Tax Operating System and full Tax Guru platform.
```

Target maturity:

```text
authority-safe retrieval
automated evaluation
human conversational layer
adversarial tax reasoning
memory and personalization
governed source ingestion
professional workflows
document intelligence
continuous regulatory monitoring
firm/client/matter knowledge
```

## Phase 14 - Mobile App / Distribution

Status:

```text
NOT STARTED
```

Purpose:

```text
Mobile app and distribution work after Phase 13 platform maturity.
```

---

# Source Storage / Backblaze B2 Status

Current storage posture:

```text
Google Drive:
Working source repository.

Backblaze B2:
Backup / standby archive only.

MEGA:
Optional private encrypted archive.
```

Current B2 rule:

```text
Backblaze B2 is not connected to TINA ingestion yet.
No B2-to-RAG ingestion.
No automatic indexing.
No vector update.
```

Known B2 setup:

```text
Bucket:
tina-source-archive

Purpose now:
GDrive mirror / backup / standby archive

Future Phase 10 purpose:
Governed source archive and ingestion source-of-truth candidate.
```

Recommended rclone posture:

```text
Use rclone copy, not rclone sync.
Back up selected folders only, not the whole Google Drive unless expressly intended.
```

Suggested TINA source mirror:

```text
Source:
gdrive:TINA TAX LIBRARY

Destination:
b2:tina-source-archive/gdrive-mirror/raw/TINA TAX LIBRARY
```

---

# Strategic Direction

TINA is moving from:

```text
single large tax chatbot backend
```

toward:

```text
Philippine Tax Operating System / Full Tax Guru
```

Long-term direction:

```text
Philippine tax research
authority-grounded legal/tax answers
BIR/SEC/LGU/PEZA/BOI/Customs compliance intelligence
document-aware advisory
regulatory monitoring
filing/preparation workflows
case/jurisprudence intelligence
client/entity/matter memory
professional-grade tax/legal operating workflows
controlled source governance
continuous user learning
```

Current objective:

```text
Begin Phase 7B with an Analytical / Adversarial Reasoning Layer architecture review before reasoning implementation.
```

---

# Phase 6G - Authority / Pipeline Decomposition Planning Under Evaluation Guard

Status:

```text
CLOSED / PASS
```

Purpose:

```text
Plan future authority/pipeline decomposition under the completed Phase 6F evaluation guard.
Do not start actual decomposition before inventorying existing JS modules and destination boundaries.
Do not touch pipeline.js unless expressly approved in a later narrow patch.
```

Planned work:

```text
PATCH-06G-001 - JS module inventory and decomposition destination map - COMPLETE / LOCAL PASS
PATCH-06G-002 - Claude Code architecture review of JS module inventory and decomposition boundaries - COMPLETE / LOCAL PASS
PATCH-06G-003 - Source-card wrapper equivalence test lock (test-only) - COMPLETE / LOCAL PASS
PATCH-06G-004 - Source-card wrapper collapse in pipeline.js (approved by PATCH-06G-002 review) - COMPLETE / LOCAL PASS
PATCH-06G-005 - Source-availability boundary documentation hardening - COMPLETE / LOCAL PASS
PATCH-06G-GATE-1 - Phase 6G stabilization gate - COMPLETE / LOCAL PASS
```

Immediate next task:

```text
PATCH-06H-001 - Retrieval / Reranker / Authority Normalization Baseline Map
```

---

# Phase 6H - Retrieval / Reranker / Authority Normalization Under Evaluation Guard

Status:

```text
CLOSED / PASS
```

Purpose:

```text
Mapped retrieval, reranker, authority normalization, PATCH-029-style bare citation normalization, and classifier extraction planning boundaries before implementation.
Closed through PATCH-06H-GATE-1 without prohibited runtime, dependency, DB, vector, corpus, ingestion, or external-tool changes.
```

Planned work:

```text
PATCH-06H-001 - Retrieval / Reranker / Authority Normalization Baseline Map - COMPLETE / LOCAL PASS
PATCH-06H-002 - Bare citation normalization regression tests - COMPLETE / LOCAL PASS
PATCH-06H-003 - Bare citation normalization fix - COMPLETE / LOCAL PASS
PATCH-06H-004 - Retrieval / reranker baseline evaluation report - COMPLETE / LOCAL PASS
PATCH-06H-005 - Retrieval / reranker comparison plan, no dependency - COMPLETE / LOCAL PASS
PATCH-06H-006 - Retrieval / reranker comparison fixture and test scaffold, no runtime change - COMPLETE / LOCAL PASS
PATCH-06H-007 - Retrieval / reranker comparison report generator, no runtime change - COMPLETE / LOCAL PASS
PATCH-06H-GATE-1 - Phase 6H Stabilization Gate - COMPLETE / LOCAL PASS
```

Immediate next task:

```text
PATCH-07B-007 - Reasoning Safety Policy and Source-State Guard Tests
```

---

# Continuity Instruction for New Chat

Continue TINA development from the latest continuity state.

Current phase:

```text
PHASE 7B - Analytical / Adversarial Reasoning Layer
```

Current latest pushed commit:

```text
PATCH-07B-013R add adversarial content safety policy
```

Current status:

```text
PHASE 6F CLOSED / PASS
PHASE 6G CLOSED / PASS
PHASE 6H CLOSED / PASS
PHASE 7A CLOSED / PASS
PHASE 7B ACTIVE / READY
PATCH-06F-GATE-1 COMPLETE / LOCAL PASS
PATCH-06G-001 COMPLETE / LOCAL PASS
PATCH-06G-002 COMPLETE / LOCAL PASS
PATCH-06G-003 COMPLETE / LOCAL PASS
PATCH-06G-004 COMPLETE / LOCAL PASS
PATCH-06G-005 COMPLETE / LOCAL PASS
PATCH-06G-GATE-1 COMPLETE / LOCAL PASS
PATCH-06H-001 COMPLETE / LOCAL PASS
PATCH-06H-002 COMPLETE / LOCAL PASS
PATCH-06H-003 COMPLETE / LOCAL PASS
PATCH-06H-004 COMPLETE / LOCAL PASS
PATCH-06H-005 COMPLETE / LOCAL PASS
PATCH-06H-006 COMPLETE / LOCAL PASS
PATCH-06H-007 COMPLETE / LOCAL PASS
PATCH-06H-GATE-1 COMPLETE / LOCAL PASS
PATCH-07A-001 COMPLETE / LOCAL PASS
PATCH-07A-002 COMPLETE / LOCAL PASS
PATCH-07A-003 COMPLETE / LOCAL PASS
PATCH-07A-004 COMPLETE / LOCAL PASS
PATCH-07A-005 COMPLETE / LOCAL PASS
PATCH-07A-006 COMPLETE / LOCAL PASS
PATCH-07A-007 COMPLETE / LOCAL PASS
PATCH-07A-007R COMPLETE / LOCAL PASS
PATCH-07A-008 COMPLETE / LOCAL PASS
PATCH-07A-GATE-1 COMPLETE / LOCAL PASS
PATCH-07B-001 COMPLETE / LOCAL PASS
PATCH-07B-002 COMPLETE / LOCAL PASS
PATCH-07B-003 COMPLETE / LOCAL PASS
PATCH-07B-004 COMPLETE / LOCAL PASS
PATCH-07B-005 COMPLETE / LOCAL PASS
PATCH-07B-006 COMPLETE / LOCAL PASS
PATCH-07B-007 COMPLETE / LOCAL PASS
PATCH-07B-008 COMPLETE / LOCAL PASS
PATCH-07B-009 COMPLETE / LOCAL PASS
PATCH-07B-010 COMPLETE / LOCAL PASS
PATCH-07B-011 COMPLETE / LOCAL PASS
PATCH-07B-012 COMPLETE / LOCAL PASS
PATCH-07B-GATE-1 COMPLETE / LOCAL PASS / PASS WITH RECOMMENDATIONS
PATCH-07B-013R COMPLETE / LOCAL PASS
PATCH-07B-014 COMPLETE / LOCAL PASS
```

Immediate next task:

```text
PATCH-07B-GEMINI-REVIEW-5 - BIR vs Taxpayer Position Runtime Helper Review
```

Recommended agent for next task:

```text
Gemini
```

Gemini review:

```text
Required after PATCH-07B-014 before any further adversarial runtime work.
```

After that:

```text
Phase 7B approved sequence:
PATCH-07B-005 - BIR vs taxpayer position architecture fixture and tests
PATCH-07B-006 - Audit-defense risk-language fixture and tests
PATCH-07B-007 - Reasoning safety policy and source-state guard tests
PATCH-07B-GEMINI-REVIEW-1 - Phase 7B Pre-Implementation Scaffold Review
PATCH-07B-008 - First narrow issue-framing implementation, if fixtures support it
PATCH-07B-009 - Narrow fact-gap runtime helper, if kept narrow
PATCH-07B-010 - Client fact-pattern checklist output integration, if kept checklist-only
PATCH-07B-011 - Narrow authority applicability runtime helper, if kept posture-only
PATCH-07B-012 - Reasoning runtime integration guard and composition tests
PATCH-07B-GATE-1 - Phase 7B Stabilization Gate

Phase 6H runtime retrieval/reranker changes remain deferred unless a later approved phase
reopens them with local comparison fixture/report artifacts, measurable baseline metrics,
and conservative pass/fail thresholds.
```

Key Phase 6G architecture findings:

```text
1. Wrapper adapter pattern was confirmed and then collapsed safely:
   pipeline.js now uses direct source-card-engine.js imports.
2. classifySourceAvailability is exported from pipeline.js and imported by 6+ test files.
   It was not moved in Phase 6G. Extraction is Phase 6H minimum.
3. source-visibility-engine.js is a utility/display module, NOT a SAE classifier.
   Do NOT route classifySourceAvailability to source-visibility-engine.js.
   Correct future destination: new dedicated source-availability-classifier.js (Phase 6H+).
4. Two SAE functions in pipeline.js: computeSourceAvailability (private) and
   classifySourceAvailability (exported). They serve different pipeline stages.
5. All retrieval, mode/response, and other decomposition is deferred (Phase 6H+).
```

Work owner rules:

```text
Codex for narrow implementation, diagnostics, tests, commits, staging validation.
Claude Code for broad architecture/refactor planning.
Gemini/GLM/Copilot/external tools parked unless expressly approved later.
```

Important current guard:

```text
Specific unavailable BIR Ruling-number queries should not be promoted to AUTHORITY_FOUND through unrelated non-BIR substitute authorities.
BIR Ruling DA-489-03 is not in the corpus and should not expose a BIR Ruling source card.
```
