# PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1 — Report

## 1. Patch name

PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1

## 2. Purpose

Implement a design-only, non-runtime-active scaffold enabling TINA to give
authority-safe procedural triage for practical Philippine BIR audit workflow
questions (LOA, document checklist, unavailable documents, pre-subpoena
reminder, PAN, FAN/FLD, action on protest, termination letter) instead of
stopping at "consult a tax professional." This patch designs and tests the
scaffold only — it performs no live authority retrieval, is not wired into
`/ask`, and produces no final legal conclusions.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `0f35b61 PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1 add tax memo runtime smoke evidence`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 8/8S/08X CLOSED; Phase 9A–9I COMPLETE; Phase 9R scaffold/integration
  design/staging smoke COMPLETE; memory INACTIVE; production unchanged; MCP
  deferred until after the final planned phase (not introduced here).
- No existing Phase 9 workflow file required modification.

## 4. Files changed

- `workflow/authority-safe-procedural-fallback.js` (new)
- `evaluation/fixtures/phase-09l-authority-safe-procedural-fallback-scaffold-1.fixture.json` (new)
- `tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs` (new)
- `PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1_REPORT.md` (new)
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
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP impact: None.
Production impact: None.

The scaffold module has zero imports (fully standalone), performs no I/O, no
network calls, reads no `process.env`, uses no `Date.now()`/randomness, and
has no side effects — verified by static source scan.

## 6. Scaffold behavior summary

`workflow/authority-safe-procedural-fallback.js` exports a mode id, a
version constant, a list of supported procedural fallback types, an input
normalizer, an input validator, a result builder
(`createAuthoritySafeProceduralFallbackResult`), and a result validator. The
result builder always forces `runtimeActive: false` and safe metadata
regardless of caller input; the input validator is the gate that flags any
attempt to request unsafe option values (`runtimeActive: true`,
`scaffoldOnly: false`, `allowLegalConclusion: true`,
`allowLiveRetrieval: true`) or a source card claiming completed authority
verification. Every result includes `authorityStatus`, `proceduralContext`,
`immediateSafeSteps`, `missingFacts`, `documentsNeeded`, `riskWarnings`,
`workflowRecommendation`, `humanReviewNotice`, `sourceCards`, and a
`metadata` block that is always scaffold-only-safe. A conservative,
deterministic prohibited-claim phrase scanner
(`detectProhibitedProceduralFallbackClaims`) is run by the result validator
against the full result to catch any reckless or overreaching claim.

## 7. Supported fallback types

Required (8): `LOA_RECEIVED_WHAT_TO_DO`, `BIR_DOCUMENT_CHECKLIST_RECEIVED`,
`BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE`,
`PRE_SUBPOENA_REMINDER_RECEIVED`, `PAN_RECEIVED_WHAT_TO_DO`,
`FAN_FLD_RECEIVED_WHAT_TO_DO`, `ACTION_ON_PROTEST_RECEIVED`,
`TERMINATION_LETTER_RECEIVED`.

Optional additional (4, also implemented): `REPLACEMENT_LOA_RECEIVED`,
`ADDITIONAL_DOCUMENT_REQUEST_RECEIVED`, `FDDA_RECEIVED`,
`REQUEST_FOR_RECONSIDERATION_OR_REINVESTIGATION`.

## 8. Output shape evidence

Every generated result has the exact required shape: `phase: "09L"`,
`mode: "authority_safe_procedural_fallback"`, `version`, `runtimeActive:
false`, `authorityStatus` (`status`, `limitationNotice`,
`controllingAuthorityNeeded`), `proceduralContext` (`noticeType`,
`taxablePeriodKnown`, `receiptDateKnown`, `deadlineComputable`,
`authorityDocumentKnown`), `immediateSafeSteps[]`, `missingFacts[]`,
`documentsNeeded[]`, `riskWarnings[]`, `workflowRecommendation`
(`nextStep`, `recommendedWorkflow[]`, `prohibitedOverreach[]`),
`humanReviewNotice`, `sourceCards[]` (never empty), and `metadata`
(`scaffoldOnly: true`, `legalConclusionProvided: false`,
`liveRetrievalPerformed: false`, `externalSearchPerformed: false`,
`generatedFilingReadyDocument: false`, `automaticSubmission: false`,
`finalOutcomeGuaranteed: false`). Validated for all 12 supported types.

## 9. LOA fallback evidence

For "I received an LOA from the BIR, what should I do?", the scaffold
recommends: verify LOA authenticity; record date of receipt; identify LOA
number, audit case number, taxable period, tax types, RO, GS, office, and
signatory; confirm scope of audit; calendar the document submission
deadline; prepare a document compliance matrix; submit available documents
with transmittal and receiving proof; mark unavailable/non-applicable/
non-existent documents clearly; avoid unnecessary admissions; and escalate
to professional review. `authorityStatus.status` is `authority_limited`,
with `controllingAuthorityNeeded` listing NIRC examination authority, BIR
LOA/eLA rules, RMC No. 5-2026 (or current LOA verification issuance),
applicable RMO/RR on audit procedures, and relevant jurisprudence.

## 10. Checklist fallback evidence

For a document checklist question, the scaffold recommends controlled
classification of each item (provided/to follow/not applicable/unavailable/
non-existent), a written transmittal, preserved proof of receipt, and
scope-limited handling of any additional requests, with a risk warning
against uncontrolled submission creating unnecessary admissions or scope
exposure.

## 11. Unavailable/non-applicable document fallback evidence

For unavailable/non-existent documents, the scaffold recommends never
fabricating documents, explaining non-existence/inapplicability, submitting
substitute proof (affidavit, management certification, AFS note, tax
return, or other reliable record), using without-prejudice language, and
preserving proof of submission, with a risk warning against false or
careless statements creating audit, civil, or criminal exposure.

## 12. Pre-subpoena reminder fallback evidence

For a reminder before issuance of subpoena duces tecum, the scaffold treats
it as an escalation warning, recommends an itemized status response with
proof of prior submission, prompt filing, and escalation to professional
review before the subpoena stage, with a risk warning that failure to
respond may lead to a formal subpoena or worsened procedural posture.

## 13. PAN fallback evidence

For a PAN, the scaffold recommends recording the date of receipt,
calendaring the 15-day reply period, building an issue-by-issue defense
matrix, attaching supporting documents, and never ignoring the PAN, with a
risk warning that failure to reply may lead to a FAN/FLD and weaken the
taxpayer's position. `controllingAuthorityNeeded` references RR No. 18-2013
(or current protest/due-process rules), RMO No. 56-2022 (or current
assessment format rules), relevant NIRC provisions, and due process
jurisprudence.

## 14. FAN/FLD fallback evidence

For a FAN/FLD, the scaffold recommends recording the date of receipt,
calendaring the 30-day protest period, choosing between reconsideration and
reinvestigation, preparing a supported protest, and monitoring for an FDDA,
with a risk warning that a valid protest must be filed within the required
period or the assessment may become final, executory, and demandable.

## 15. Action-on-protest fallback evidence

For an action letter granting reconsideration, the scaffold states that
acceptance for re-evaluation does not automatically mean the assessment was
cancelled, and recommends confirming exactly what was granted, monitoring
for further BIR action, and calendaring CTA appeal watch points. The result
never claims the assessment is cancelled, that the case is won, or that no
further action is needed (verified by test).

## 16. Termination-letter fallback evidence

For a termination letter, the scaffold states the audit case is closed for
the covered LOA, tax period, and tax types only, without prejudice to
future action if fraud, false return, or refund-related issues later arise,
and recommends permanent retention of the letter and related records. The
result never claims permanent, full, or blanket immunity (verified by
test).

## 17. Source-card boundary

Source cards are design/reference cards only, restricted to the four
allowed authority tiers (`official_reference_required`,
`uploaded_reference_pattern`, `future_authority_corpus_required`,
`procedural_design_reference`). Every result includes the three required
baseline design source cards (LOA authenticity verification reference,
assessment/protest procedure reference, uploaded professional reference
pattern). No source card claims live authority verification is complete —
verified across all 12 supported types by test.

## 18. Authority boundary

No live search, scraping, browsing, or authority retrieval is performed.
Future official authority sources (bir.gov.ph, bir-cdn.bir.gov.ph,
lawphil.net, sc.judiciary.gov.ph, cta.judiciary.gov.ph,
officialgazette.gov.ph, dof.gov.ph, peza.gov.ph, sec.gov.ph, boi.gov.ph) are
noted as future verification targets only. Phase 10 (Authority Search and
Research Engine) is not implemented here.

## 19. Privacy boundary

All fixture examples use sanitized, synthetic identifiers (`SAMPLE
TAXPAYER INC.`, `DEMO LOGISTICS CORP.`, `SYNTHETIC HOLDINGS INC.`) and
placeholder-style LOA number patterns (`eLA20XX000000000`,
`AUDM00-000-20XX-000000`). No real taxpayer names, TINs, LOA numbers, audit
case numbers, addresses, BIR officer names, client names, or assessment
amounts from the user's private reference materials appear anywhere in this
patch — verified by test.

## 20. Runtime impact

None. `runtimeActive` is forced `false` in every result; `scaffoldOnly` is
forced `true`; `allowLegalConclusion` and `allowLiveRetrieval` are forced
`false`.

## 21. /ask impact

/ask impact: None. This module is not imported by `ask-handler.js`,
`pipeline.js`, `server.js`, or any route, and has no dependency on
authentication or the Express/server runtime.

## 22. Route/server/pipeline impact

None. No route, server, or pipeline file was created, modified, or
imported.

## 23. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced. No MCP runtime integration exists. No MCP
test calls were made by this patch's test.

## 24. Validation summary

```
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
  → GATE PASSED / 158 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 25. Decision

**PHASE 09L AUTHORITY SAFE PROCEDURAL FALLBACK SCAFFOLD PASS WITH STRICT RECOMMENDATIONS**

## 26. Strict recommendations

1. Proceed to PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1.
2. Do not wire procedural fallback to `/ask` until notice triage and
   governance gates are complete.
3. Keep real taxpayer data out of fixtures.
4. Require authority verification before final legal conclusions.
5. Add authority-corpus research design before any claim of current
   official legal support.
6. Preserve human review notices for LOA/PAN/FAN/FLD/protest workflows.

## 27. Next task

**PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1**

Future plan also includes **PHASE-09-GATE-CLOSURE-1**.
