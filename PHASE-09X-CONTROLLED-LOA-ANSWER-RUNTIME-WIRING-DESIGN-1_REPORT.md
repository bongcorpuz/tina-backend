# PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1 — Report

## 1. Patch name

PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1

## 2. Purpose

Create a design-only controlled runtime-wiring plan for a future
implementation patch to safely answer the narrow live `/ask` query family
"I received a BIR LOA, what should I do?" by routing through the closed
Phase 9 scaffold stack (09L, 09M, 09O, 09P, 09Q, 09S) behind an intent
guard and scope guard. This patch does not wire anything to `/ask`, does
not activate runtime behavior, and does not produce final legal
conclusions or filing-ready output. It prepares
PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1; it does not
implement it.

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `134678e PHASE-09-GATE-CLOSURE-1 close phase 9 scaffold gate`
- Sync at start: `0 0`
- Only known deferred untracked files present.
- Phase 9 formally CLOSED, scaffold-complete, governance-safe,
  non-runtime-active. Runtime governance recommendation from the closure
  gate: PASS_WITH_RUNTIME_WIRING_DEFERRED. Internal LOA answer modeling
  readiness: PASS. Live `/ask` LOA answer readiness and runtime activation
  both remained NOT APPROVED at closure.
- No workflow, route, server, or runtime file required modification for
  this design.

## 4. Files changed

- `evaluation/fixtures/phase-09x-controlled-loa-answer-runtime-wiring-design-1.fixture.json` (new)
- `tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs` (new)
- `PHASE-09X-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-DESIGN-1_REPORT.md` (new)
- `knowledge/CURRENT_STATE.md` (appended)

No workflow source file, route file, server file, or runtime file was
created or modified by this patch.

## 5. Design type

Controlled runtime-wiring design. No runtime implementation, no route
behavior change, no DB migration, no deployment.

## 6. Screenshot evidence note

Observed live behavior: The current live app returned the authority
fallback message for "I received a BIR LOA, what should I do?" This is
expected because Phase 9 scaffolds are closed but not wired to `/ask`.
09X does not change that behavior; it designs the future controlled
wiring path.

## 7. Current live behavior explanation

The message "I cannot present the available source as controlling
authority for this issue. Only related or supporting authority was
found..." is the existing authority-safe fallback response produced by
the current live retrieval/answer-rendering path when it cannot confirm
controlling authority for a query. It is expected under the current
runtime precisely because none of the Phase 9 BIR audit-defense scaffolds
(09L, 09M, 09O, 09P, 09Q, 09S) are wired into `/ask`, `pipeline.js`, or
`ask-handler.js` — they remain internal, non-runtime-active design
modules per the Phase 9 closure gate. This patch does not change that;
only a separately approved PHASE-09Y implementation patch could.

## 8. Supported future query intents

12 example intents are defined, covering: a received BIR LOA; a received
BIR eLA; "Letter of Authority" phrasing; first-steps phrasing; an
electronic LOA; document-preparation phrasing; a replacement eLA; a
consolidated eLA; a checklist of requirements; a notice for presentation/
submission; and a pre-subpoena/reminder-before-subpoena scenario.

## 9. Excluded future query intents

11 example intents are defined that must never receive a final-conclusion
answer, covering: LOA/eLA validity or voidness questions; "can I ignore
it" questions; "can BIR assess me" questions; assessment-finality
questions; CTA appeal-strategy questions; FAN/FDDA validity/appealability
questions; outcome-prediction questions; and requests for an immediate
filing-ready protest draft or automatic BIR submission. These must route
to the authority-safe procedural fallback and human tax/legal review, with
no final legal conclusion and no filing-ready output.

## 10. Future runtime routing design

A 10-step controlled sequence is specified: (1) intent guard for narrow
procedural LOA-help detection; (2) scope guard confirming the question is
about next steps rather than a final conclusion; (3) 09L authority-safe
procedural fallback for safe first steps; (4) 09M notice/LOA triage to
classify the notice type; (5) 09S 2026 audit-baseline signals for
replacement/consolidated-eLA, VATAS/LTVAU, and TVN-scope review points;
(6) 09P document compliance planning for the document matrix and
controlled transmittal; (7) 09O audit defense matrix used only for issue
organization; (8) 09Q authority corpus requirement stating official-source
verification is required; (9) a safe response renderer producing a
procedural-safe answer with a preserved human review notice; (10)
source-card discipline restricted to design/reference cards unless
verified source cards are confirmed available.

## 11. Future safe response template evidence

The design fixture includes the full target answer template (preserve
date/manner of receipt; capture taxpayer/TIN/taxable period/tax types/
issuing office/LOA-eLA number/audit case number/officer names/documents
requested; verify via the BIR REVIE/LOA Verifier process under RMC No.
5-2026 where relevant; classify as original/replacement/consolidated eLA,
TVN, Mission Order, checklist, notice for presentation/submission, or
pre-subpoena reminder; treat 2026 audit-framework signals as review
points; build a document compliance matrix; submit via controlled
transmittal with receiving proof; never fabricate unavailable/
non-existent documents, offering substitute proof instead; avoid
unnecessary admissions; monitor NOD/DOD/PAN/FAN/FLD/protest/FDDA/CTA
appeal-watch next stages; and close with a statement that validity,
prescription, finality, appealability, protest strategy, CTA strategy, and
legal conclusions all require official-source verification and human
tax/legal review). The template is paired with a categorical list of
response patterns the future renderer must avoid (validity/invalidity
claims, "BIR cannot assess" claims, "safe to ignore" claims, outcome
predictions, claims the matter is resolved in the taxpayer's favor, and
overly certain deadline assertions) rather than the literal banned
sentences themselves, so this design artifact does not itself reproduce
any prohibited phrase.

## 12. Future response modes

7 modes are defined: `SAFE_BASIC_LOA_GUIDANCE`,
`REPLACEMENT_ELA_REVIEW_GUIDANCE`, `CONSOLIDATED_ELA_REVIEW_GUIDANCE`,
`DOCUMENT_CHECKLIST_GUIDANCE`, `PRE_SUBPOENA_ESCALATION_GUIDANCE`,
`UNKNOWN_BIR_NOTICE_GUIDANCE`, and `HUMAN_REVIEW_REQUIRED` (the terminal
mode for every excluded intent).

## 13. Future source-card policy

Future runtime answers may cite or display source cards only if verified
by the existing retrieval/SAE/source-card systems; otherwise the answer
must avoid legal citation phrasing, use procedural-safe language, and
state that official-source verification is required. Required future
source categories: RMC No. 5-2026 (LOA/eLA verification), RMO No. 1-2026
(single-instance audit framework/standardized checklist/document request
limits), RMO No. 6-2026 (consolidation safeguards/FDDA and final-FAN
limits/proper service/no-regression), RMC No. 14-2026 (replacement
eLA/TVN scope/prior notices/VATAS-LTVAU transition), RR No. 18-2013
(PAN/FAN/protest/reinvestigation procedure), NIRC Sec. 228 (due process
for assessment), RR No. 12-99 as amended (service/assessment procedure),
and CTA rules (appeal-watch only, never a conclusion).

## 14. Future runtime safety gates

12 gates are required before any future `/ask` activation: `runtimeActive`
remains false until a separately approved implementation patch;
feature-flag-off-by-default unless separately approved; a narrow LOA
intent guard; no final validity/finality/protest/CTA-strategy conclusions;
no automatic filing-ready output; no automatic BIR submission; no real
taxpayer data in tests; no live authority claim without verified source
cards; a safe fallback whenever controlling authority cannot be verified;
an always-present human review notice; unchanged security headers/
authentication behavior; and unchanged unrelated `/ask` behavior.

## 15. Non-runtime boundary evidence

This design is scaffold/document-only: no workflow module was created or
modified, `runtimeActive` remains false in the design's own governance
boundary, and the design is not wired to `/ask`, routes, server, or
pipeline. Live LOA `/ask` behavior is explicitly unchanged by this patch.
This patch states each of the following required exact statements:

Runtime impact: None.
Ask-handler impact: None.
Route impact: None.
Server impact: None.
Pipeline impact: None.
Feature flag impact: None.
Memory impact: None.
Persistence impact: None.
Production impact: None.
Filing-ready document impact: None.
Automatic submission impact: None.
/ask impact: None.
Runtime implementation impact: None.
Live LOA /ask behavior changed: No.

## 16. External operation boundary evidence

No live retrieval, external search, scraping, download, OCR, ingestion,
embedding, database writes, OpenAI/Supabase/Google Drive/n8n/Firecrawl/
Crawlee/MCP calls, external HTTP calls, or environment secret access are
implemented or referenced by this design's new files — confirmed by
static source scan of the new test/fixture/report. This patch states each
of the following:

External search impact: None.
Live retrieval impact: None.
Scraping/download/ingestion impact: None.
Database/embedding impact: None.
OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR impact: None.

## 17. Privacy boundary evidence

All example queries and template text use generic, non-taxpayer-specific
phrasing. No real taxpayer names, TINs, LOA/eLA numbers, audit case
numbers, BIR officer names, or exact assessment amounts appear anywhere in
this patch's new files.

## 18. Legal-safety boundary evidence

Neither the new fixture nor the new report contains any of the documented
prohibited final-legal-conclusion or overreach phrases (validity/
invalidity claims, "BIR cannot assess" claims, "ignore it" claims,
guaranteed-outcome claims, "assessment is cancelled" claims, or overly
certain deadline claims) — confirmed by direct case-insensitive substring
scan. The future safe response template closes with an explicit statement
that validity, prescription, finality, appealability, protest strategy,
CTA strategy, and legal conclusions require official-source verification
and human tax/legal review.

## 19. Runtime governance boundary

This patch is design-only and does not constitute runtime approval. Any
future implementation requires a separately approved
PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1 patch. Runtime
activation remains not approved by this design.

## 20. Future 09Y implementation boundary

PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1 is the next
expected task if controlled live LOA answering remains the immediate
priority. It must implement the narrow intent/scope guards, the 10-step
routing sequence, the 7 response modes, and all 12 runtime safety gates
defined by this design before any `/ask`-facing activation.

## 21. Phase 10 boundary

Not implemented by this design. Phase 10 — Evaluation / Fact-Check /
Legal-Tax QA System — remains an alternative next phase if broader
reliability work is preferred before runtime activation.

## 22. Authority ingestion boundary

No live authority ingestion, search, or retrieval is implemented or
designed for implementation by this patch. 09Q's authority corpus
research design remains the design-only prerequisite for any future,
separately approved authority ingestion phase.

## 23. Memory/persistence boundary

Memory remains inactive; no persistence, client/matter storage, or
generated-work-product storage is introduced or designed by this patch.
Any future memory/persistence phase requires separate approval.

## 24. MCP deferral evidence

MCP remains deferred until after the final planned phase. No MCP files or
configuration were introduced by this patch. No MCP runtime integration
exists. No MCP test calls were made by this patch's test.

## 25. Mobile app deferral evidence

Mobile app work remains deferred until after Phase 13. No mobile app
artifacts were introduced by this patch.

## 26. Validation summary

```
node tests/phase-09x-controlled-loa-answer-runtime-wiring-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 180 assertions

node tests/phase-09-gate-closure-1.test.mjs
  → PASS / 29 passed / 0 failed / 1475 assertions

node tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs
  → PASS / 76 passed / 0 failed / 363 assertions

node tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs
  → PASS / 30 passed / 0 failed / 467 assertions

node tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs
  → PASS / 36 passed / 0 failed / 333 assertions

node tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs
  → PASS / 33 passed / 0 failed / 605 assertions

node tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs
  → PASS / 35 passed / 0 failed / 336 assertions

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
  → GATE PASSED / 166 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 27. Decision

**PHASE 09X CONTROLLED LOA ANSWER RUNTIME WIRING DESIGN PASS WITH STRICT RECOMMENDATIONS**

## 28. Strict recommendations

1. Proceed to PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1
   only if controlled live LOA answering remains the immediate priority.
2. Keep 09X design-only; do not treat this patch as runtime approval.
3. Future 09Y must use a narrow LOA intent guard.
4. Future 09Y must preserve fallback behavior for validity, finality,
   prescription, CTA, and filing strategy questions.
5. Future 09Y must not generate filing-ready documents or submit anything
   to BIR.
6. Future 09Y must preserve source-card discipline and authority
   verification.
7. Future 09Y must preserve human tax/legal review notice.
8. If broader reliability is preferred before runtime activation, proceed
   to Phase 10 first.

## 29. Next task

**PHASE-09Y-CONTROLLED-LOA-ANSWER-RUNTIME-WIRING-SCAFFOLD-1**, if
controlled live LOA answering remains the immediate priority.

Alternative: **PHASE 10 — Evaluation / Fact-Check / Legal-Tax QA System**.
