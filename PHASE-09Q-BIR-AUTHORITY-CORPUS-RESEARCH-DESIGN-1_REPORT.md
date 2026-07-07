# PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1 — Report

## 1. Patch name

PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1

## 2. Purpose

Provide a design-only, non-runtime-active research design for how TINA will
eventually discover, prioritize, verify, classify, and cite official
Philippine tax/audit authorities (BIR issuances, NIRC/statutory provisions,
Supreme Court/CTA jurisprudence, DOF/PEZA/SEC/BOI issuances) needed for BIR
audit defense workflows. This patch designs the authority corpus research
layer only — it performs no live search, scraping, browsing, downloading,
ingestion, embedding, or database storage, and reaches no final legal or
tax conclusion.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `c84d56b PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1 add document compliance transmittal scaffold`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold/integration
  design/staging smoke COMPLETE; Phase 9L procedural fallback scaffold
  COMPLETE; Phase 9M BIR notice/LOA triage intent scaffold COMPLETE; Phase
  9N PAN/FAN/FLD/protest workflow scaffold COMPLETE; Phase 9O BIR audit
  defense matrix scaffold COMPLETE; Phase 9P BIR document compliance/
  transmittal scaffold COMPLETE; memory INACTIVE; production unchanged;
  MCP deferred until after the final planned phase (not introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `workflow/bir-authority-corpus-research-design.js` (new)
- `evaluation/fixtures/phase-09q-bir-authority-corpus-research-design-1.fixture.json` (new)
- `tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs` (new)
- `PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

No existing Phase 9 workflow file, route file, or runtime file was created
or modified by this patch.

## 5. Non-runtime declaration

Runtime impact: None.
Ask-handler impact: None.
Route impact: None.
Server impact: None.
Pipeline impact: None.
Feature flag impact: None.
Memory impact: None.
Persistence impact: None.
External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.
Production impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
/ask impact: None. This module is not imported by `ask-handler.js`,
`pipeline.js`, `server.js`, or any route, and is not reachable from the
`/ask` request path in any way.

The scaffold module has zero imports (fully standalone), performs no I/O, no
network calls, no OCR, reads no `process.env`, uses no `Date.now()`/
randomness, and has no side effects — verified by static source scan.

## 6. Design behavior summary

`workflow/bir-authority-corpus-research-design.js` exports a mode id,
version constant, supported source-type/tier/topic/workflow-stage/
verification-status lists, an input normalizer, an input validator, a
result builder (`createBirAuthorityCorpusResearchDesignResult`), a result
validator, and a prohibited-claim scanner
(`detectProhibitedAuthorityCorpusClaims`). It accepts a `userQuery`, a
`targetTopics` list, a caller-supplied `candidateAuthorities` array, and
`sourceCards`, and builds a per-topic `authorityTopicMap`, a ranked
`officialSourcePriority` list, an `authorityMetadataSchema`, a 12-stage
`researchWorkflowDesign`, `verificationRules`, a `conflictResolutionPolicy`,
a `futureIngestionPlan`, and a `citationPolicyDesign`. Every candidate
authority is always forced `liveVerified: false`, and every live/runtime/
scrape/download/ingest/embed/database-write option flag is always forced
to its safe value regardless of caller input.

## 7. Supported authority source types

20 total: `BIR_REVENUE_REGULATION`, `BIR_REVENUE_MEMORANDUM_CIRCULAR`,
`BIR_REVENUE_MEMORANDUM_ORDER`, `BIR_REVENUE_AUDIT_MEMORANDUM_ORDER`,
`BIR_RULING`, `BIR_FORM_OR_ANNEX`, `NIRC_PROVISION`,
`TRAIN_OR_CREATE_OR_EOPT_STATUTE`, `SUPREME_COURT_DECISION`,
`CTA_DECISION`, `CTA_EN_BANC_DECISION`, `DOF_ISSUANCE`, `PEZA_ISSUANCE`,
`SEC_ISSUANCE`, `BOI_ISSUANCE`, `OFFICIAL_GAZETTE_RECORD`,
`IMPLEMENTING_RULES`, `PRIVATE_REFERENCE_PATTERN`,
`SECONDARY_RESEARCH_LEAD`, `UNKNOWN_SOURCE_TYPE`.

## 8. Supported authority tiers

10 total: `controlling_primary_authority`, `persuasive_primary_authority`,
`official_administrative_guidance`, `official_procedural_guidance`,
`jurisprudential_authority`, `official_form_or_annex`,
`private_uploaded_pattern`, `secondary_lead_only`,
`future_verification_required`, `unknown_tier`.

## 9. Supported authority topics

43 total, including `LOA_AUTHORITY`, `ELA_AUTHENTICITY`,
`RMC_5_2026_LOA_VERIFIER`, `RMO_1_2026_SINGLE_INSTANCE_AUDIT`,
`RMO_6_2026_CONSOLIDATION_SAFEGUARDS`,
`RMC_14_2026_REPLACEMENT_ELA_CLARIFICATION`,
`RMC_107_2025_AUDIT_SUSPENSION`, `RMC_8_2026_AUDIT_RESUMPTION`,
`REPLACEMENT_ELA`, `CONSOLIDATED_ELA`, `VAT_NON_CONSOLIDATION`,
`VATAS_LTVAU_TRANSITION`, `TAX_VERIFICATION_NOTICE_SCOPE`,
`STANDARDIZED_CHECKLIST`, `ADDITIONAL_DOCUMENT_REQUEST_LIMITS`,
`VOLUMINOUS_RECORDS_ON_PREMISE_EXAMINATION`, `CERTIFIED_COPY_SUBMISSION`,
`SUBPOENA_DUCES_TECUM`, `NOD_DOD`, `PAN_REPLY`, `FAN_FLD_PROTEST`,
`REQUEST_FOR_RECONSIDERATION`, `REQUEST_FOR_REINVESTIGATION`, `FDDA`,
`CTA_APPEAL_PERIOD`, `CTA_INACTION_APPEAL`, `ASSESSMENT_PRESCRIPTION`,
`COLLECTION_PRESCRIPTION`, `WAIVER_OF_PRESCRIPTION`,
`DUE_PROCESS_FACTS_AND_LAW`, `PROPER_SERVICE`, `NO_REGRESSION_RULE`,
`TERMINATION_LETTER_SCOPE`, `VAT_EXEMPT_VS_ZERO_RATED`,
`PEZA_ZERO_RATING`, `INPUT_VAT_SUBSTANTIATION`, `CWT_SUBSTANTIATION`,
`WITHHOLDING_TAX_DEDUCTIBILITY`, `DIVIDEND_FWT`, `COMPROMISE_PENALTY`,
`SURCHARGE_AND_INTEREST`, `RELATED_PARTY_OR_INTERCOMPANY`,
`UNKNOWN_TOPIC`.

## 10. Supported research workflow stages

12 total: `SOURCE_DISCOVERY_DESIGN`, `OFFICIAL_SOURCE_PRIORITY_DESIGN`,
`AUTHORITY_METADATA_DESIGN`, `AUTHORITY_VERIFICATION_DESIGN`,
`AUTHORITY_TOPIC_MAPPING_DESIGN`, `CITATION_POLICY_DESIGN`,
`INGESTION_PIPELINE_DESIGN`, `DEDUPLICATION_AND_VERSIONING_DESIGN`,
`CONFLICT_RESOLUTION_DESIGN`, `HUMAN_REVIEW_GATE_DESIGN`,
`FUTURE_RUNTIME_WIRING_DESIGN`, `UNKNOWN_STAGE`.

## 11. Supported verification statuses

8 total: `not_verified_design_only`, `official_source_required`,
`official_source_identified_design_only`,
`secondary_lead_requires_primary_verification`,
`conflict_requires_human_review`, `stale_or_superseded_risk`,
`future_ingestion_required`, `unknown_status`.

## 12. Official source priority evidence

All 10 required official domains (`bir.gov.ph`, `bir-cdn.bir.gov.ph`,
`lawphil.net`, `sc.judiciary.gov.ph`, `cta.judiciary.gov.ph`,
`officialgazette.gov.ph`, `dof.gov.ph`, `peza.gov.ph`, `sec.gov.ph`,
`boi.gov.ph`) are present with a numeric `priority`, an `allowedUse`
description distinguishing BIR issuances/forms, NIRC/statutory records,
Supreme Court cases, CTA cases, official-record verification, and DOF/
PEZA/SEC/BOI issuances, plus per-entry `restrictions`. A dedicated
secondary-sources entry marks non-official leads "research lead only; must
verify against official source before use," with restrictions prohibiting
citation as final authority. `futureIngestionPlan.prohibitedSources` lists
low-trust sources (SEO blogs, social media, unverified summaries,
AI-generated summaries without source, commercial articles without
primary-source verification, outdated reposted PDFs).

## 13. Authority topic map evidence

`authorityTopicMap` includes one entry per requested topic (7 baseline
topics when none are supplied: `LOA_AUTHORITY`,
`RMO_1_2026_SINGLE_INSTANCE_AUDIT`, `PAN_REPLY`, `FAN_FLD_PROTEST`,
`ASSESSMENT_PRESCRIPTION`, `VAT_EXEMPT_VS_ZERO_RATED`,
`CWT_SUBSTANTIATION`), each with `requiredAuthorityTypes`,
`candidateAuthorities` (matched from caller input), `missingAuthorityGaps`,
`verificationStatus`, and `humanReviewRequired: true`. 21+ topics have an
explicit baseline `requiredAuthorityTypes` mapping (e.g. `LOA_AUTHORITY` →
NIRC Sec. 6(A), BIR LOA issuances, Supreme Court LOA jurisprudence;
`PAN_REPLY` → NIRC Sec. 228, RR No. 18-2013, RR No. 12-99 as amended;
`ASSESSMENT_PRESCRIPTION` → NIRC Sec. 203, NIRC Sec. 222, waiver issuances,
jurisprudence); unmapped topics fall back to a generic NIRC/BIR-issuance/
jurisprudence default.

## 14. Metadata schema evidence

`authorityMetadataSchema` defines `requiredFields` (title, sourceType,
authorityTier, topicTags, officialUrlOrDomain, issuanceOrDecisionDate,
effectiveDate, citationFormat), `recommendedFields`, `prohibitedFields`
(realTaxpayerName, realTin, realLoaOrElaNumber, realAuditCaseNumber,
realBirOfficerName, exactAssessmentAmount), `versioningFields`, and
`citationFields`.

## 15. Research workflow design evidence

`researchWorkflowDesign` has one entry per supported stage (12 total),
each with `purpose`, `allowedActionsFutureOnly` (explicitly future-only),
`prohibitedActionsThisPatch` (always non-empty), and
`outputExpectedInFuturePatch`.

## 16. Verification rules evidence

`verificationRules` always sets `officialPrimarySourceRequired`,
`secondarySourcesLeadOnly`, `requireDateAndVersionCheck`,
`requireSupersessionCheck`, `requireTopicMapping`,
`requireQuoteAndCitationDiscipline`, `requireHumanReviewForConflict`, and
`noFinalLegalConclusionFromUnverifiedAuthority` all `true`.

## 17. Conflict resolution policy evidence

`conflictResolutionPolicy` always sets `newerIssuanceCheck`,
`statuteVsRegulationHierarchyCheck`,
`jurisprudenceVsAdministrativeGuidanceCheck`,
`specialLawVsGeneralLawCheck`, `taxpayerFactSpecificityCheck`, and
`humanReviewRequiredForConflict` all `true`.

## 18. Future ingestion plan evidence

`futureIngestionPlan` lists the 10 `allowedOfficialDomains`,
`prohibitedSources` (low-trust sources), `futurePipelineStages` (the 11
non-`UNKNOWN_STAGE` workflow stages), `futureMetadataChecks`, and
`futureQualityGates` (human review gate, conflict resolution gate,
official source confirmation gate).

## 19. Citation policy evidence

`citationPolicyDesign` always sets `citationRequiredForLegalClaims`,
`citationRequiredForDeadlines`, `citationRequiredForAuthorityStatus`,
`rawUnsupportedCitationProhibited`, and `sourceCardRequired` all `true`,
with an `exactExcerptPolicy` string confirming no live-sourced excerpts are
included by this patch.

## 20. Source-card boundary

Source cards are design/reference cards only, restricted to the allowed
authority tiers. Every result includes the four required baseline design
source cards: "BIR official authority corpus design"
(`future_authority_corpus_required`), "Judicial authority corpus design"
(`future_authority_corpus_required`), "2026 BIR audit baseline authority
design" (`official_reference_required`), and "Private audit workflow
reference pattern" (`private_uploaded_pattern`). No source card claims
completed authority verification — verified by test.

## 21. Authority boundary

No live search, scraping, browsing, OCR, downloading, ingestion,
embedding, or database write is performed. Future official authority
sources are noted as future verification targets only. Every candidate
authority is forced `liveVerified: false`, and raw (non-domain-only)
source URLs are rejected on input.

## 22. Privacy boundary

All fixture examples use synthetic/public-authority-name references only.
No real taxpayer names, TINs, LOA/eLA numbers, audit case numbers,
addresses, BIR officer names, client names, or exact assessment amounts
from the user's private reference materials appear anywhere in this
patch — the module additionally rejects any of these known real fragments
on input and scans its own output for leakage, verified by test.

## 23. Runtime impact

None. This module is not imported by `ask-handler.js`, `pipeline.js`,
`server.js`, or any route, and has no dependency on authentication or the
Express/server runtime.

## 24. /ask impact

None. This module is not imported by `ask-handler.js`, `pipeline.js`,
`server.js`, or any route.

## 25. Route/server/pipeline impact

None. No route, server, or pipeline file was created or modified.

## 26. Feature flag impact

None. No feature flag is introduced, read, or enabled by this patch.

## 27. Memory/persistence/search/live-retrieval/scraping/download/ingestion/embedding/database/OpenAI/Supabase/GoogleDrive/n8n/Firecrawl/Crawlee/MCP/OCR impact

None. All are structurally impossible in this zero-import module and
verified absent by static source scan and by the always-false `metadata`
fields on every generated result.

## 28. Filing-ready document impact

None. This patch generates no filing-ready transmittal letter, affidavit,
certification, email, protest, CTA pleading, tax opinion, or legal opinion.

## 29. Automatic submission impact

None. No submission of any kind is performed or claimed by this patch.

## 30. Validation summary

```
node tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 466 assertions

node tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs
  → PASS / 36 passed / 0 failed / 332 assertions

node tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 604 assertions

node tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs
  → PASS / 35 passed / 0 failed / 335 assertions

node tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs
  → PASS / 47 passed / 0 failed / 398 assertions

node tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 184 assertions

node tests/phase-09r-tax-memo-runtime-staging-smoke-1.test.mjs
  → PASS / 36 passed / 0 failed / 179 assertions

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
  → GATE PASSED / 163 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 31. Decision

**PHASE 09Q BIR AUTHORITY CORPUS RESEARCH DESIGN PASS WITH STRICT RECOMMENDATIONS**

## 32. Strict recommendations

1. Proceed to PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1.
2. Do not wire this authority corpus research design to `/ask` until
   governance and runtime gates approve it.
3. Do not perform live scraping/downloading/ingestion until a separate
   authority ingestion phase is approved.
4. Require official-source verification before any legal/tax conclusion.
5. Treat secondary sources only as research leads.
6. Preserve source hierarchy, supersession checks, conflict checks, and
   human review.
7. Use this design to support future authority-corpus buildout.

## 33. Next task

**PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1**
