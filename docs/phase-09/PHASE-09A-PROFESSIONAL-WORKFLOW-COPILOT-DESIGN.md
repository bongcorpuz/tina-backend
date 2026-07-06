# PHASE-09A — Professional Workflow Co-Pilot Design

Status: DESIGN-ONLY FOUNDATION
Patch: PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1
Base commit: 5a6f2f9 PATCH-08S-FOLLOWUP-INDEX-SECRET-HEADER-AUTH-STAGING-SMOKE-1 add header auth smoke evidence
Repository: tina-backend
Branch: feature/source-availability-engine-v1

> This document is a design foundation. It changes no runtime code, no routes, no
> frontend, no database, and performs no API/OpenAI/Supabase/Google Drive/n8n/
> Firecrawl/Crawlee calls. It activates no memory and deploys nothing.

---

## 1. Executive Summary

Phase 9 turns TINA from a question-and-answer tax assistant into a **Professional
Workflow Co-Pilot** that can draft structured professional tax work-products —
tax memoranda, BIR replies/protest drafts, audit-defense matrices, client
advisories, compliance checklists, and requirements-request letters — using
TINA's **existing** authority-grounded retrieval, authority discipline, source
cards, and answer-generation capabilities.

Phase 9 does not rebuild the search engine. It consumes the retrieval pipeline
that already exists (query classification, authority-type detection, exact
authority lookup, vector search, answer generation, GDrive source cards). It does
not implement the Phase 10 Authority Search and Research Engine, and it does not
implement Phase 11 retrieval-speed/quality optimization. Every professional output
is a **human-review-first draft**, never a final legal filing, and every output
must carry source cards and disclose missing facts and assumptions.

---

## 2. Phase Boundary

### Phase 9 includes

- Professional work-product generation
- Structured drafting modes
- Authority-grounded reasoning
- Evidence requirement mapping
- Human-review-first outputs
- No automatic filing/submission
- No persistent client/matter storage unless later approved
- No memory activation

### Phase 9 excludes

- External authority search engine (Phase 10)
- n8n / Firecrawl / Crawlee crawling (Phase 10)
- New source intake (Phase 10)
- Official URL / archive / canonical source upgrade implementation (Phase 10)
- BM25 / hybrid retrieval optimization (Phase 11)
- Re-ranking optimization (Phase 11)
- Query cache (Phase 11)
- Source-card hydration cache (Phase 11)
- Tenant isolation implementation
- Full logging-redaction implementation
- Third-party egress implementation
- Production launch

**Phase 10 = Authority Search and Research Engine.** Not implemented here. Later
includes: authority source registry; official URL + archive URL + canonical source
record; metadata filters; source currentness/supersession; authority intake from
official Philippine sources; source-card upgrade; n8n + Firecrawl primary fetch;
Crawlee backup; GDrive/archive preservation; canonical TINA source governance.

**Phase 11 = Retrieval speed and quality optimization.** Not implemented here.
Later includes: hybrid vector + keyword/BM25 + exact lookup; re-ranking; query
cache; source-card hydration cache; authority packs; latency monitoring; query
execution optimization.

---

## 3. Design Principles

- **Authority-first** — controlling authority drives every conclusion.
- **Human-review-first** — outputs are drafts for a professional to review.
- **No unsupported legal/tax conclusions** — do not assert what retrieval cannot ground.
- **No invented citations** — never fabricate an RR/RMC/RMO/case citation.
- **Retrieval-grounded drafting** — all authority comes from existing retrieval.
- **Clear issue framing** — state the tax issues explicitly before analysis.
- **Assumption disclosure** — every assumption is labeled as an assumption.
- **Evidence gap disclosure** — missing facts/documents are surfaced, not hidden.
- **Conservative professional tone** — cautious, professional, non-overclaiming.
- **Philippines tax/legal context** — NIRC, RR/RMC/RMO, BIR issuances, PH jurisprudence.
- **Source-card preservation** — Authority Lock: source cards must survive drafting.
- **Governance prevails over code** — Dev Factory governance overrides implementation.

---

## 4. User Roles / Professional Modes

Six initial professional modes are defined for Phase 9.

### A. Tax Memo Mode

Purpose: produce structured professional tax memoranda.

Output sections:
- Facts provided
- Issues
- Applicable authorities
- Analysis
- Conclusion
- Risks/limitations
- Additional documents needed
- Source cards

### B. BIR Reply / Protest Draft Mode

Purpose: draft reply/protest language for BIR assessments — LOA, PAN, FAN, FDDA,
NOD, subpoena, or audit findings.

Output sections:
- Background
- Assessment issue
- Taxpayer position
- Legal basis
- Factual/documentary basis
- Requested action
- Attachments/evidence checklist
- Caveats
- Source cards

### C. Audit Defense Matrix Mode

Purpose: map an audit or tax assessment issue to defense position, authority,
documentary support, risk level, and next action.

Output columns:
- Issue
- BIR/auditor position
- Taxpayer position
- Authority
- Evidence needed
- Risk level
- Recommended action

### D. Client Advisory Mode

Purpose: generate management/client-facing explanation.

Output sections:
- Plain-language answer
- Business impact
- Compliance action
- Deadlines if known
- Risks
- Documents needed
- Source cards

### E. Compliance Checklist Mode

Purpose: generate a task checklist for compliance, registration, closure, VAT/EWT,
withholding, SEC/BIR requirements.

Output sections:
- Task
- Responsible party
- Required document
- Deadline/timing
- Authority/source
- Status
- Notes

### F. Requirements Request Letter Mode

Purpose: generate a professional request-list letter/email for clients.

Output sections:
- Opening
- Requested documents
- Purpose of each request
- Deadline/requested timing
- Professional caveat
- Closing

---

## 5. Input Contract

Each mode requires inputs. Representative inputs across modes:

- taxpayer type
- facts
- tax year/period
- issue
- assessment stage
- BIR document type
- amount involved
- relevant returns
- available documents
- requested output type
- intended audience
- jurisdiction
- urgency/deadline

**Missing-facts rule:** if required facts are missing, Phase 9 output must either
ask clarifying questions or mark assumptions clearly. Phase 9 must never silently
invent missing facts.

---

## 6. Retrieval Contract

Phase 9 uses existing retrieval only:

- Use existing query classification
- Use existing authority detection
- Use existing exact lookup
- Use existing vector retrieval
- Use existing source cards
- Do not perform live web search
- Do not ingest new authorities
- Do not use unapproved sources
- Do not cite unsupported sources
- If authority is unavailable, say so

Phase 9 introduces no new retrieval engine, no new index, and no new source.

---

## 7. Authority Discipline

- Controlling authority must be prioritized.
- NIRC / RR / RMC / RMO / court doctrine must not be mixed without a clear hierarchy.
- BIR rulings/issuances must be labeled correctly (ruling vs regulation vs circular vs order).
- Court cases must be labeled as jurisprudence.
- Related authority is **not** equal to controlling authority.
- If currentness is unknown, disclose it.
- If only related authority exists, say "related only".
- **No fabricated RR/RMC/RMO/case citations.**

This upholds the Authority Lock rule: locked, found, and visible authorities and
their source cards must survive downstream drafting and must not be suppressed by
formatting or response optimization.

---

## 8. Source Card Requirements

### Current acceptable source card model (Phase 9)

- GDrive/archive link acceptable for the current stage.
- Existing source-card mechanism preserved.

### Future Phase 10 source card model (NOT implemented here)

- `officialUrl` as primary legal citation
- `archiveUrl` as secondary evidence
- `canonicalSourceId` as internal source of truth
- `retrievedAt`
- `lastVerifiedAt`
- `fileHash`
- `currentnessStatus`
- `reviewStatus`
- `sourceLineage`
- `supersedes` / `supersededBy`

Phase 9 must **not** implement the Phase 10 source-card upgrade. It records the
future model only as a forward-looking target.

---

## 9. Output Governance

Professional outputs must:

- be drafts, not final legal filings;
- state assumptions;
- state missing facts;
- include source cards;
- avoid overclaiming;
- use professional language;
- avoid pretending to be a retained lawyer/CPA unless the user frames the request as drafting assistance;
- avoid automatic submission;
- preserve the human-review requirement.

---

## 10. Privacy and Security Boundary

- No persistent client/matter storage in Phase 9A.
- No client document storage unless later separately designed.
- No memory activation.
- No generated work-product database persistence.
- No third-party egress.
- No sending to n8n / Firecrawl / Crawlee.
- No production launch.
- Phase 9 request-size policy remains open.
- Tenant isolation remains open.
- Logging redaction remains open.
- Egress controls remain open.

These map to the known Phase 8S remaining limitations (tenant isolation, logging
redaction, egress controls, request-size policy) which remain open and gate any
future runtime wiring of Phase 9.

---

## 11. Request-Size Policy Placeholder

This is a placeholder policy, not an implementation. Before Phase 9 accepts large
client facts/documents, TINA needs:

- request size limits
- max text length
- attachment handling policy
- P1/P2 data redaction rules
- logging controls
- timeout controls
- output length controls

No request-size enforcement is implemented in this patch.

---

## 12. Professional Output Schemas

Conceptual JSON-like schemas (design targets, not runtime types).

```jsonc
taxMemoOutput: {
  "mode": "tax_memo",
  "factsProvided": [],
  "issues": [],
  "authorities": [],
  "analysis": [],
  "conclusion": "",
  "risks": [],
  "missingFacts": [],
  "documentsNeeded": [],
  "sourceCards": []
}

birReplyDraftOutput: {
  "mode": "bir_reply_draft",
  "background": "",
  "assessmentIssue": "",
  "taxpayerPosition": "",
  "legalBasis": [],
  "factualDocumentaryBasis": [],
  "requestedAction": "",
  "attachmentsEvidenceChecklist": [],
  "caveats": [],
  "missingFacts": [],
  "sourceCards": []
}

auditDefenseMatrixOutput: {
  "mode": "audit_defense_matrix",
  "rows": [
    {
      "issue": "",
      "birPosition": "",
      "taxpayerPosition": "",
      "authority": [],
      "evidenceNeeded": [],
      "riskLevel": "",
      "recommendedAction": ""
    }
  ],
  "missingFacts": [],
  "sourceCards": []
}

clientAdvisoryOutput: {
  "mode": "client_advisory",
  "plainLanguageAnswer": "",
  "businessImpact": "",
  "complianceAction": [],
  "deadlines": [],
  "risks": [],
  "documentsNeeded": [],
  "missingFacts": [],
  "sourceCards": []
}

complianceChecklistOutput: {
  "mode": "compliance_checklist",
  "items": [
    {
      "task": "",
      "responsibleParty": "",
      "requiredDocument": "",
      "deadlineTiming": "",
      "authoritySource": [],
      "status": "",
      "notes": ""
    }
  ],
  "missingFacts": [],
  "sourceCards": []
}

requirementsRequestLetterOutput: {
  "mode": "requirements_request_letter",
  "opening": "",
  "requestedDocuments": [
    { "document": "", "purpose": "", "deadlineTiming": "" }
  ],
  "professionalCaveat": "",
  "closing": "",
  "missingFacts": [],
  "sourceCards": []
}
```

Every schema carries `sourceCards` and `missingFacts`, enforcing source-card and
missing-fact disclosure at the schema level.

---

## 13. Phase 9 Patch Plan

- **PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1** — design-only foundation (this patch).
- **PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1** — create a pure mode registry; no runtime wiring.
- **PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1** — pure schema + fixture for tax memo output.
- **PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1** — pure schema + fixture for audit defense matrix.
- **PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1** — pure schema + fixture for BIR reply/protest draft.
- **PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1** — pure schema + fixture for advisory/checklist.
- **PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1** — tests/gates ensuring no unsupported citations, no final-filing claims, no missing source-card disclosure.
- **PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1** — only after pure schemas pass; may later wire one mode behind a feature flag.

---

## 14. Phase 9 Exit Criteria

- Each professional mode has a schema.
- Each mode has fixture tests.
- Source-card requirement enforced.
- Missing facts/assumptions disclosed.
- No unsupported authority claims.
- No live web/search/ingestion.
- No production memory.
- No client/matter persistence without tenant controls.
- Human-review disclaimers present.
- Phase 10/11 boundaries preserved.

---

## 15. Risk Register

- **Hallucinated legal citations** — mitigated by retrieval-grounded drafting + no-fabrication rule.
- **Outdated authorities** — mitigated by currentness disclosure; hardened in Phase 10.
- **Overreliance on related authority** — mitigated by "related only" labeling and controlling-authority priority.
- **Missing facts** — mitigated by mandatory missing-fact disclosure and clarifying questions.
- **Client confidentiality** — mitigated by no persistent client/matter storage in Phase 9A.
- **Excessive request size** — mitigated by request-size policy placeholder (enforcement deferred).
- **Premature professional filing use** — mitigated by human-review-first, no-auto-submission governance.
- **Source-card mismatch** — mitigated by Authority Lock source-card preservation.
- **Unsafe storage/logging** — mitigated by no persistence + logging-redaction remaining open.
- **External egress** — mitigated by no third-party egress in Phase 9.
- **Tenant isolation gap** — remains open; gates client/matter persistence.
- **User treating draft as final advice** — mitigated by explicit human-review disclaimers.

---

## 16. Strict Recommendations

1. Keep Phase 9 design-only until scaffold patches pass.
2. Do not activate memory.
3. Do not store client/matter work-products.
4. Do not enable external crawling.
5. Do not implement Phase 10 search inside Phase 9.
6. Do not implement Phase 11 optimization inside Phase 9.
7. Keep feature flags OFF by default for any later runtime wiring.
8. Require source cards for professional outputs.
9. Require missing-fact disclosure.

---

## 17. Next Task

**PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1** — create a pure workflow mode
registry (no runtime wiring), consuming the mode definitions and schemas in this
design.
