# PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 — Report

## 1. Patch name

PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1

## 2. Purpose

Establish the Phase 9A design foundation for TINA's **Professional Workflow
Co-Pilot** — the architecture, scope, safeguards, professional modes, output
schemas, evidence requirements, validation gates, and future patch plan by which
TINA drafts professional tax work-products using its **existing** authority-grounded
retrieval. This is a design-only patch: it changes no runtime code and rebuilds
neither the search engine (Phase 10) nor retrieval optimization (Phase 11).

## 3. Base state

- Branch: `feature/source-availability-engine-v1`
- Base commit: `5a6f2f9 PATCH-08S-FOLLOWUP-INDEX-SECRET-HEADER-AUTH-STAGING-SMOKE-1 add header auth smoke evidence`
- Sync at start: `0 0`
- Only known deferred untracked files present (`.vscode/`, `evaluation/factcheck/`,
  `tests/TINA_Adversarial_Test_Set_PH_Tax.md`, `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`)
- Phase 8 CLOSED; Phase 8S CLOSED; 08X CLOSED; Phase 9 NOT STARTED before this patch;
  memory INACTIVE; production unchanged.

## 4. Files changed

- `docs/phase-09/PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN.md` (new; `docs/phase-09/` created)
- `evaluation/fixtures/phase-09a-professional-workflow-copilot-design-1.fixture.json` (new)
- `tests/phase-09a-professional-workflow-copilot-design-1.test.mjs` (new)
- `PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1_REPORT.md` (new, this file)
- `knowledge/CURRENT_STATE.md` (appended)

## 5. Non-runtime declaration

No runtime files changed. No route changes. No frontend changes. No DB migrations.
No API/OpenAI/Supabase/Google Drive calls. No n8n/Firecrawl/Crawlee implementation.
No deployment. No production changes. No memory activation. No persistent
client/matter storage. No generated work-product storage. No third-party egress.
No package/env/DB/frontend files touched. Deferred untracked files not touched.

## 6. Phase 9 scope

Professional work-product generation; structured drafting modes; authority-grounded
reasoning; evidence requirement mapping; human-review-first outputs; no automatic
filing/submission; no persistent client/matter storage unless later approved; no
memory activation.

## 7. Phase 9 exclusions

External authority search engine (Phase 10); n8n/Firecrawl/Crawlee crawling; new
source intake; officialUrl/archive/canonical source upgrade implementation; BM25 /
hybrid optimization (Phase 11); re-ranking; query cache; source-card hydration
cache; tenant isolation implementation; full logging-redaction implementation;
third-party egress implementation; production launch.

## 8. Professional modes defined

- **A. Tax Memo Mode** — facts, issues, applicable authorities, analysis, conclusion, risks/limitations, additional documents needed, source cards.
- **B. BIR Reply / Protest Draft Mode** — background, assessment issue, taxpayer position, legal basis, factual/documentary basis, requested action, attachments/evidence checklist, caveats, source cards.
- **C. Audit Defense Matrix Mode** — issue, BIR/auditor position, taxpayer position, authority, evidence needed, risk level, recommended action.
- **D. Client Advisory Mode** — plain-language answer, business impact, compliance action, deadlines if known, risks, documents needed, source cards.
- **E. Compliance Checklist Mode** — task, responsible party, required document, deadline/timing, authority/source, status, notes.
- **F. Requirements Request Letter Mode** — opening, requested documents, purpose of each request, deadline/requested timing, professional caveat, closing.

## 9. Retrieval contract

Existing retrieval only: existing query classification, authority detection, exact
lookup, vector retrieval, and source cards. No live web search; no new authority
ingestion; no unapproved sources; no unsupported citations; if authority is
unavailable, say so.

## 10. Authority discipline

Controlling authority prioritized; no hierarchy mixing without clarity; BIR
issuances labeled correctly; court cases labeled as jurisprudence; related authority
is not controlling authority; unknown currentness disclosed; "related only" stated
when applicable; **no fabricated RR/RMC/RMO/case citations.** Upholds Authority Lock.

## 11. Source-card policy

- **Current (Phase 9):** GDrive/archive source cards acceptable; existing mechanism preserved.
- **Future (Phase 10, NOT implemented here):** `officialUrl` primary legal citation,
  `archiveUrl` secondary evidence, `canonicalSourceId` internal source of truth, plus
  `retrievedAt`, `lastVerifiedAt`, `fileHash`, `currentnessStatus`, `reviewStatus`,
  `sourceLineage`, `supersedes`/`supersededBy`.

## 12. Privacy/security boundary

No persistent client/matter storage; no client document storage; no memory
activation; no generated work-product persistence; no third-party egress; no
crawling; no production change. Request-size policy, tenant isolation, logging
redaction, and egress controls remain OPEN (carried from Phase 8S).

## 13. Request-size policy placeholder

Placeholder only, not implemented. Before Phase 9 accepts large client
facts/documents, TINA needs: request size limits, max text length, attachment
handling policy, P1/P2 data redaction rules, logging controls, timeout controls,
output length controls.

## 14. Future patch plan

- PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 (this patch)
- PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1
- PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1
- PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1
- PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1
- PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1
- PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1
- PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1

## 15. Phase 9 exit criteria

Each professional mode has a schema; each mode has fixture tests; source-card
requirement enforced; missing facts/assumptions disclosed; no unsupported authority
claims; no live web/search/ingestion; no production memory; no client/matter
persistence without tenant controls; human-review disclaimers present; Phase 10/11
boundaries preserved.

## 16. Risk register summary

Hallucinated legal citations; outdated authorities; overreliance on related
authority; missing facts; client confidentiality; excessive request size; premature
professional filing use; source-card mismatch; unsafe storage/logging; external
egress; tenant isolation gap; user treating draft as final advice. Each has a
mitigation or a documented deferral in the design document.

## 17. Validation summary

```
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
  → GATE PASSED / 146 test suites run / 0 failed (10 syntax checks, 0 failed)
```

## 18. Decision

**PHASE 09A PROFESSIONAL WORKFLOW COPILOT DESIGN PASS WITH STRICT RECOMMENDATIONS**

## 19. Strict recommendations

1. Keep Phase 9 design-only until scaffold patches pass.
2. Do not activate memory.
3. Do not store client/matter work-products.
4. Do not enable external crawling.
5. Do not implement Phase 10 search inside Phase 9.
6. Do not implement Phase 11 optimization inside Phase 9.
7. Keep feature flags OFF by default for any later runtime wiring.
8. Require source cards for professional outputs.
9. Require missing-fact disclosure.

## 20. Next task

**PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1** — create a pure workflow mode
registry (no runtime wiring).
