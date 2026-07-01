# PATCH-07B-001 - Analytical / Adversarial Reasoning Layer Architecture Review

Status: COMPLETE / ARCHITECTURE REVIEW / LOCAL PASS

Branch: feature/source-availability-engine-v1

---

## 1. Objective

Perform a read-only architecture review for Phase 7B — Analytical / Adversarial Reasoning Layer.

Design how TINA can reason like a senior Philippine tax practitioner — identifying competing
positions, surfacing fact gaps, assessing authority applicability, and supporting audit defense
reasoning — while preserving authority discipline, source-card integrity, sourceAvailability
state, applyVerifiedAuthorityGate protection, and the Phase 7A response mode boundaries for
/ask, /tax, and /audit.

No runtime behavior was changed in this patch.

---

## 2. Scope

Architecture/design review only.

Confirmed out of scope for this patch:

```text
reasoning logic implementation
authority conflict resolver implementation
applicability engine implementation
fact/date/taxpayer engine implementation
BIR vs taxpayer position engine implementation
audit defense/risk-position engine implementation
settlement strategy engine implementation
documentary support scoring implementation
procedural defect decision engine implementation
validator false-positive fixes
CTA 9711 / CTA 9369 / Seagate live answer-grounding (Phase 7C/6F-LIVE)
Phase 8 memory / user learning
Phase 9 professional workflow co-pilot
Phase 10 source governance / official-source acquisition
Phase 11 observability / query evidence logging
frontend state cleanup
streaming UX
any modification to answer-renderer.js, ask-handler.js, context-orchestration-engine.js,
  rag-answer-handler.js, prompts/tax-mode-prompt.js, prompts/audit-mode-prompt.js,
  pipeline.js, retrieval-engine.js, reranker-engine.js, source-card-engine.js,
  issue-classification-engine.js, or any route/controller file
new dependencies
```

---

## 3. Current Branch / Commit Baseline

Branch verified:

```text
feature/source-availability-engine-v1
```

Pre-work git status:

```text
untracked: .vscode/
```

Pre-existing `.vscode/` remained untracked and untouched.

Recent history confirmed:

```text
db82f4b PATCH-07A-GATE-1 close Phase 7A
1a1f607 PATCH-07A-008 harden source limitation and mode boundaries
3fb3ea4 PATCH-07A-007R expand response safety red-team coverage
b3d1ef9 PATCH-07A-007 add response safety red-team fixture
7bf2525 PATCH-07A-006 protect audit advisory formatting
28e3599 PATCH-07A-005 protect tax senior memo formatting
bd56568 PATCH-07A-004 implement ask conversational formatting
81fa76a PATCH-07A-003 add authority-state response policy tests
```

Baseline confirmed: `db82f4b PATCH-07A-GATE-1 close Phase 7A`.

---

## 4. Reviewed Inputs

The following files were read as part of this architecture review:

```text
knowledge/CURRENT_STATE.md
PATCH-07A-GATE-1_PHASE_7A_STABILIZATION_GATE.md
PATCH-07A-001_HUMAN_CONVERSATIONAL_RESPONSE_LAYER_ARCHITECTURE_REVIEW.md
PATCH-07A-003_AUTHORITY_STATE_RESPONSE_POLICY_AND_GATE_COMPATIBILITY_TESTS.md
PATCH-07A-007_PHASE_7A_RESPONSE_SAFETY_RED_TEAM_FIXTURE_AND_TESTS.md
PATCH-07A-007R_RESPONSE_SAFETY_RED_TEAM_COVERAGE_EXPANSION.md
PATCH-07A-008_SOURCE_LIMITATION_WORDING_AND_MODE_BOUNDARY_REGRESSION_HARDENING.md
evaluation/fixtures/phase-7a-002-human-response-mode-format.fixture.json (referenced)
evaluation/fixtures/phase-7a-003-authority-state-response-policy.fixture.json (referenced)
evaluation/fixtures/phase-7a-007-response-safety-red-team.fixture.json (referenced)
evaluation/fixtures/phase-7a-008-source-limitation-mode-boundary-hardening.fixture.json (referenced)
answer-renderer.js (architecture read, no edit)
prompts/tax-mode-prompt.js (architecture read, no edit)
prompts/audit-mode-prompt.js (architecture read, no edit)
context-orchestration-engine.js (architecture read, no edit)
issue-classification-engine.js (architecture read, no edit)
```

No runtime files were edited.

---

## 5. Phase 7B Purpose and Boundaries

### 5.1 Purpose

Phase 7A made TINA answer like a professional. Phase 7B makes TINA reason like a professional.

The difference is significant:

```text
Phase 7A: structured, professional, mode-appropriate format and tone.
Phase 7B: analytical depth — competing positions, fact gaps, authority applicability,
           audit-defense reasoning, risk posture — inside the Phase 7A format containers.
```

Phase 7B adds reasoning signal to the content that fills Phase 7A's structural sections.
It does not replace Phase 7A's sections. It deepens what goes inside them.

### 5.2 What Belongs in Phase 7B

```text
Analytical reasoning design — how TINA identifies competing interpretations of authority.
Issue framing — converting user questions into professional issue statements.
Fact-gap detection — identifying missing material facts before professional conclusions.
Authority applicability analysis — whether a retrieved authority applies to the stated facts.
BIR vs taxpayer position — distinguishing the likely BIR position from the taxpayer's defense.
Risk-position language — cautious risk framing proportionate to authority and fact support.
Audit-defense reasoning architecture — structured support for the /audit advisory sections.
Documentary support design — specific document categories for Philippine tax defense.
Procedural issue reasoning — BIR procedural defect detection logic design.
Authority conflict/hierarchy placeholder design — framework for later Phase 10 enrichment.
Validation strategy — fixture/test scaffolds before any reasoning implementation.
```

### 5.3 What Does Not Belong in Phase 7B

```text
Source acquisition — Phase 10.
Metadata schema / source registry — Phase 10.
Source freshness / supersession engine — requires Phase 10 metadata schema to exist first.
Effective-date computation engine — requires Phase 10 temporal metadata.
Phase 8 memory / user learning / governed tax intelligence.
Phase 9 document generation workflow (BIR reply drafts, protest letters, engagement checklists).
Phase 10 official-source acquisition, n8n, Crawlee, Apify.
Phase 11 observability / query evidence logging.
Full source-governance red-team — after Phase 10.
Full Tax Operating System red-team — after Phase 13.
Live CTA/Seagate answer-grounding — Phase 7C/6F-LIVE.
Frontend state cleanup or streaming UX — optional deferred items.
```

### 5.4 Phase 7A Must Not Be Weakened

Phase 7B reasoning components are additions, not replacements:

```text
Phase 7A /ask conversational structure is preserved.
Phase 7A /tax A-F senior memo structure is preserved.
Phase 7A /audit advisory section structure is preserved.
Source limitation wording from answer-renderer.js is preserved.
applyVerifiedAuthorityGate remains in place.
Source-card discipline is preserved.
RELATED_AUTHORITY_ONLY caution is preserved.
NO_INDEXED_SOURCE caution is preserved.
Generic-query non-promotion is preserved.
```

Phase 7B reasoning outputs feed the content inside Phase 7A structures, not around them.

---

## 6. Relationship to Phase 7A

### 6.1 How Phase 7B Extends Phase 7A

Phase 7A established:

```text
/ask answers are direct, conversational, structured by: Direct Answer / Key Rule / Practical Note /
  Source Note / [optional escalation] / Source Cards.
/tax answers follow A-F senior memo: Short Answer-Conclusion / Governing Authority / Analysis /
  Compliance Effect / Caveats-Missing Facts / Sources-Source Cards.
/audit answers follow the advisory matrix: Quick Assessment / BIR Likely Position / Taxpayer
  Position-Defenses / Documentary Support Needed / Procedural Issues / Risk Level /
  Recommended Action / Sources-Source Cards.
```

Phase 7B improves the content quality of these sections:

```text
/ask:
  Phase 7A → "Key Rule" section names the authority.
  Phase 7B → Issue framing and applicability check clarify whether that authority governs the user's
              exact question or is merely related.

/tax:
  Phase 7A → "C. Analysis" exists as a section.
  Phase 7B → Analytical reasoning deepens Analysis with: competing interpretations, BIR likely
              reading vs taxpayer reading, what facts change the outcome, what authority gaps exist.
  Phase 7A → "E. Caveats / Missing Facts" exists.
  Phase 7B → Fact-gap detector populates this with specific, relevant missing facts for the issue.

/audit:
  Phase 7A → "2. BIR Likely Position" and "3. Taxpayer Position / Defenses" exist.
  Phase 7B → BIR position engine and taxpayer position engine deepen these sections with structured
              adversarial analysis.
  Phase 7A → "4. Documentary Support Needed" exists.
  Phase 7B → Documentary support engine identifies the specific Philippine tax documents relevant
              to the exact issue type and assessment stage.
  Phase 7A → "5. Procedural Issues" exists.
  Phase 7B → Procedural issue reasoning identifies specific BIR procedural defects applicable
              to the stated assessment stage.
  Phase 7A → "6. Risk Level" exists with LOW/MODERATE/HIGH/CRITICAL labels.
  Phase 7B → Audit-defense risk engine grounds risk level in authority state, fact support,
              documentary support, procedural posture, and materiality.
```

### 6.2 Critical Architectural Rule: Reasoning Feeds Into Format, Not Around It

Phase 7B reasoning components must be designed as upstream inputs to response generation,
not as post-processing layers that rewrite Phase 7A format. The flow must be:

```text
User query
  → issue-classification-engine.js (existing, unchanged)
  → query-intent-engine.js (existing, unchanged)
  → retrieval + reranker (existing, unchanged)
  → sourceAvailability classification (existing, unchanged)
  → [Phase 7B reasoning components, if activated]
      → issue-framing-engine (enriched issue frame)
      → fact-gap-detector (missing facts list)
      → authority-applicability-engine (applicability assessment)
      → reasoning-safety-policy (gate: may Phase 7B reason here?)
      → bir-position-engine / taxpayer-position-engine / documentary-support-engine
      → advisory-output-policy (translate reasoning to Phase 7A section content)
  → context-orchestration-engine.js (prompt assembly with enriched context)
  → LLM (OpenAI) → answer-renderer.js / applyVerifiedAuthorityGate
```

Phase 7B components activate between sourceAvailability classification and prompt assembly.
They do not modify what happens after prompt assembly.

---

## 7. Proposed Reasoning Layer Components

The following candidate components are defined at architecture level only.
None are implemented in this patch.

### Component 1 — issue-framing-engine

**Purpose:**
Convert a user question and existing issueClassification into a professional issue frame
that structures the analytical response.

**Inputs:**
- `query` — raw user query string
- `issueClassification` — from issue-classification-engine.js (already exists; no change needed)
- `queryIntent` — from query-intent-engine.js (already exists; no change needed)
- `sourceAvailabilityState` — SAE state from pipeline.js

**Outputs:**
- `issueStatement` — one-sentence professional issue frame
- `relevantTaxType` — primary issue type (VAT, WHT, CIT, etc.)
- `legalDimension` — from existing LEGAL_DIMENSION constants (SUBSTANTIVE, PROCEDURAL, etc.)
- `factsKnown[]` — facts asserted or inferable from query
- `factsMissing[]` — critical missing facts
- `authoritiesNeeded[]` — what authority would resolve the issue
- `riskOfAnsweringWithoutFacts` — LOW / MODERATE / HIGH

**Dependencies:**
- issue-classification-engine.js (read-only; uses its output, does not modify it)
- LEGAL_DIMENSION constants (already defined)
- sourceAvailability state (read-only)

**Authority-state constraints:**
- If NO_INDEXED_SOURCE: issue frame must note that authority is unavailable.
- If RELATED_AUTHORITY_ONLY: issue frame must note that no directly governing authority was located.

**Risk:** Low. This is structural transformation of what the pipeline already knows.

**Phase 7B:** YES — fixture and implementation both viable.

---

### Component 2 — fact-gap-detector

**Purpose:**
Identify missing material facts before generating professional conclusions, especially
for fact-sensitive queries (COMPLEX or MULTI_ISSUE complexity, HIGH fact sensitivity).

**Inputs:**
- `issueFrame` — from issue-framing-engine
- `issueClassification.primaryIssue` — issue type
- `issueClassification.factSensitivity` — LOW/MODERATE/HIGH (already classified)
- `queryText` — user query

**Outputs:**
- `criticalMissing[]` — facts without which a professional conclusion should not be stated
- `helpfulButOptional[]` — facts that would improve the analysis but are not blocking
- `assumptionsNotToTreatAsFacts[]` — inferences that must not be treated as established facts
- `factSensitivityLevel` — confirmed fact sensitivity

**Candidate fact categories by issue type:**

```text
WHT/EWT issues:
  taxpayer type (individual, corp, NRC, NRA-ETB, NRANETB)
  payment type (professional fee, rent, service, dividend, etc.)
  payee registration status
  VAT/non-VAT status
  amount (below or above threshold)

VAT issues:
  taxpayer VAT registration status
  transaction type (sale, service, import, export)
  buyer type (PEZA, BOI, domestic, foreign)
  zero-rated / exempt / taxable classification
  invoice/OR type and compliance
  effective date of registration

BIR Audit / Assessment issues:
  assessment stage (LOA received / NIC / PAN / FAN-FLD / FDDA / subpoena)
  date of LOA / date of receipt of PAN / date of receipt of FAN
  tax period covered
  amount assessed (per tax type)
  filing/payment evidence available
  protest deadline status

Deductibility issues:
  expense type (ordinary and necessary / capital / entertainment / representation)
  CWT certificate availability (BIR Form 2307)
  OR / invoice support
  period incurred

Prescription issues:
  date of filing of return (did taxpayer file?)
  did BIR waive prescription through a waiver/LOA?
  date of issuance of LOA
  date of issuance of final assessment notice
```

**Authority-state constraints:**
- Fact-gap detector must be proportionate to issue complexity.
- Simple FAST_DEFINITION or GENERAL_TAX queries: minimal fact gaps needed.
- COMPLEX or AUDIT queries: full fact-gap detection recommended.

**Risk:** Medium. The detector must not interrogate users excessively for simple questions.
Activation should be gated by `factSensitivity >= HIGH` or `complexity >= COMPLEX` for /ask,
and should always activate for /tax and /audit professional analysis.

**Phase 7B:** YES — fixture first (PATCH-07B-003), then implementation.

---

### Component 3 — authority-applicability-engine

**Purpose:**
Assess whether each retrieved authority actually applies to the user's stated facts,
distinguishing governing authority from related/supporting authority for the specific
fact pattern.

**Inputs:**
- `issueFrame` — from issue-framing-engine
- `factsKnown` — from fact-gap-detector
- `sourceCards[]` — retrieved/classified source cards
- `sourceAvailabilityState` — SAE state

**Outputs:**
- `governingIfFacts[]` — authorities that govern if the stated/assumed facts are correct
- `relatedOnly[]` — authorities that are related but do not directly govern the issue
- `notApplicable[]` — authorities retrieved but not applicable to the issue
- `applicabilityGaps[]` — what authority or fact would be needed to make a definitive ruling

**Applicability checks (without Phase 10 metadata):**

```text
Jurisdiction check: is the authority Philippine?
Tax type match: does the authority address the same tax type as the issue?
Taxpayer type match: does the authority apply to the taxpayer's entity type?
Transaction type match: does the authority cover this kind of transaction?
Hierarchy adequacy: is this authority at the right level for the conclusion sought?
Factual similarity: does the authority address sufficiently similar facts?
```

**Phase 10 dependent checks (design placeholder only; not implemented in Phase 7B):**

```text
Effective date: was this authority in force during the relevant tax period?
Amendment/supersession: has this authority been amended, modified, or revoked?
Source status: is this source still current and available?
```

**Authority-state constraints:**
- AUTHORITY_FOUND: applicability engine may assess whether source governs the exact question.
- RELATED_AUTHORITY_ONLY: applicability engine confirms the limitation and identifies what would be needed.
- NO_INDEXED_SOURCE: applicability engine must produce empty `governingIfFacts` and must not fabricate.

**Risk:** High for effective-date/supersession (Phase 10 dependency).
Medium for other applicability checks (already inferable from issueClassification).

**Phase 7B:** Design and fixture only (PATCH-07B-004). First narrow implementation may proceed
if fixture passes and Phase 10 dependencies are explicitly excluded from the implementation.

---

### Component 4 — authority-conflict-and-hierarchy-advisor

**Purpose:**
Identify apparent conflicts between retrieved authorities and flag hierarchy issues
for professional analysis.

**Inputs:**
- `sourceCards[]` — retrieved authorities
- `AUTHORITY_PRECEDENCE` (already in answer-renderer.js and context-orchestration-engine.js)
- `applicabilityAssessment` — from authority-applicability-engine

**Outputs:**
- `conflicts[]` — apparent conflicts between retrieved authorities
- `hierarchyNotes[]` — notes on which authority controls when there is a hierarchy question
- `supersessionPlaceholders[]` — flags for possible supersession; must be confirmed against
  Phase 10 source metadata before being treated as definitive

**Authority-state constraints:**
- This component must not fabricate conflicts that do not exist in the retrieved source set.
- Supersession/amendment conclusions require Phase 10 metadata; Phase 7B may only flag
  the possibility, not assert it.

**Risk:** High. Incorrectly flagging a conflict or supersession could mislead users.

**Phase 7B:** Design placeholder only. No implementation until Phase 10 source metadata exists.
Fixture design (PATCH-07B-004) may define the expected output shape.

---

### Component 5 — bir-position-engine

**Purpose:**
Generate a structured representation of the likely BIR position on the issue.

**Note on existing coverage:**
`prompts/audit-mode-prompt.js` already includes "2. BIR Likely Position" in AUDIT_ADVISORY_SECTIONS
and instructs the LLM to separate BIR position from taxpayer position. This component
formalizes that as a structured pre-prompt input rather than relying on the LLM to infer it.

**Inputs:**
- `issueFrame` — from issue-framing-engine
- `factsKnown` — from fact-gap-detector
- `sourceCards[]` — retrieved/classified authorities
- `sourceAvailabilityState` — SAE state
- `issueClassification.primaryIssue` — issue type

**Outputs:**
- `birLikelyPosition` — one-paragraph description of the likely BIR argument
- `authoritiesBIRWillCite[]` — indexed authorities BIR is likely to rely on
- `birProcedure[]` — procedural steps BIR is likely to follow
- `birPositionWeaknesses[]` — identified weaknesses in BIR's likely position

**Authority-state constraints:**
- AUTHORITY_FOUND: BIR position may cite the governing authority.
- RELATED_AUTHORITY_ONLY: BIR position must note that indexed authority is indirect.
- NO_INDEXED_SOURCE: BIR position must be clearly hedged as based on general principles
  without indexed authority support.
- The component must not invent BIR arguments based on authorities not in the indexed corpus.

**Risk:** High. BIR position generation could mislead users if not grounded in indexed authority.

**Phase 7B:** Design and fixture (PATCH-07B-005). Implementation only after fixture passes.

---

### Component 6 — taxpayer-position-engine

**Purpose:**
Generate a structured representation of the taxpayer's best legal and factual position.

**Note on existing coverage:**
`prompts/audit-mode-prompt.js` already covers "3. Taxpayer Position / Defenses." This component
formalizes the structure as a pre-prompt input.

**Inputs:**
- `issueFrame` — from issue-framing-engine
- `factsKnown` — from fact-gap-detector
- `sourceCards[]` — retrieved/classified authorities
- `applicabilityAssessment` — from authority-applicability-engine
- `birPosition` — from bir-position-engine
- `sourceAvailabilityState` — SAE state

**Outputs:**
- `taxpayerPosition` — one-paragraph description of the taxpayer's best position
- `controllingAuthority[]` — indexed authorities supporting the taxpayer's position
- `weakeningFacts[]` — facts that weaken the taxpayer's position
- `documentaryNeeds[]` — specific documents needed to support the position
- `positionStrength` — LOW / MODERATE / HIGH (corresponds to /audit Risk Level inverse)

**Authority-state constraints:**
- Must not guarantee taxpayer victory.
- Must not describe a RELATED_AUTHORITY_ONLY source as controlling.
- Must not fabricate precedent supporting the taxpayer when no indexed authority exists.
- `positionStrength` must be downgraded if `sourceAvailabilityState` is not AUTHORITY_FOUND.

**Risk:** High. Taxpayer position generation could produce overconfident defense advice.

**Phase 7B:** Design and fixture (PATCH-07B-005). Implementation only after fixture passes.

---

### Component 7 — audit-defense-risk-engine

**Purpose:**
Produce a structured risk assessment and defense posture for BIR audit and controversy matters.

**Inputs:**
- `birPosition` — from bir-position-engine
- `taxpayerPosition` — from taxpayer-position-engine
- `factsKnown` — from fact-gap-detector
- `factsMissing` — from fact-gap-detector
- `applicabilityAssessment` — from authority-applicability-engine
- `sourceAvailabilityState` — SAE state

**Outputs:**
- `riskLevel` — LOW / MODERATE / HIGH / CRITICAL / UNKNOWN_INSUFFICIENT_FACTS
- `riskBasis` — one-sentence reason for the risk level
- `defensePriority` — highest-priority defense action
- `nextStep` — specific recommended action with Philippine-law context
- `caveats[]` — material limitations on the risk assessment

**Risk-level rules:**

```text
AUTHORITY_FOUND + strong facts + strong documentary support → LOW or MODERATE
AUTHORITY_FOUND + weak facts or missing documents → MODERATE or HIGH
RELATED_AUTHORITY_ONLY → at least MODERATE regardless of facts
NO_INDEXED_SOURCE → UNKNOWN_INSUFFICIENT_FACTS or HIGH
UNKNOWN facts (critical missing) → UNKNOWN_INSUFFICIENT_FACTS
Prescription/due-process procedural defect confirmed → possible risk reduction
Amount above materiality threshold → risk escalation
```

**Authority-state constraints:**
- Must never state LOW risk when source state is NO_INDEXED_SOURCE.
- Must preserve RELATED_AUTHORITY_ONLY limitation in risk basis.
- Must explicitly state UNKNOWN_INSUFFICIENT_FACTS when critical facts are missing.

**Risk:** High. Risk-level language has significant professional consequences.

**Phase 7B:** Design and fixture (PATCH-07B-006). Implementation only after fixture passes
and Gemini review of the risk-language fixture confirms coverage.

---

### Component 8 — documentary-support-engine

**Purpose:**
Identify the specific Philippine tax documents needed for the defense or compliance position,
keyed to the issue type, assessment stage, and taxpayer type.

**Inputs:**
- `issueClassification.primaryIssue` — issue type
- `issueFrame.factsKnown` — what facts are known (including taxpayer type, assessment stage)
- `assessmentStage` — LOA / NIC / PAN / FAN / FDDA (if derivable from query)

**Outputs:**
- `criticalDocs[]` — documents without which defense or compliance cannot proceed
- `supportingDocs[]` — additional documentary support that strengthens the position
- `archiveSources[]` — where to obtain or verify the documents (generic categories, not URLs)

**Philippine document categories by issue type:**

```text
EWT/WHT deficiency:
  BIR Form 2307 (CWT certificates from payees)
  contracts / service agreements
  official receipts / invoices
  proof of remittance (BIR Form 1601-EQ or 0619-E)
  alpha list of payees

VAT zero-rating:
  BIR Form 2550M or 2550Q (VAT return)
  sales invoices and official receipts
  PEZA / BOI registration certificate
  export documentation (Inward Remittance Certificate, airwaybill, etc.)
  purchase invoices with VAT
  BIR certification if applicable

Input VAT substantiation:
  official receipts / VAT invoices from suppliers
  VAT-registered seller certification
  evidence of business purpose (delivery receipts, etc.)

Deductibility (income tax):
  official receipts / invoices
  BIR Form 2307 (CWT received)
  contracts
  board resolutions if required

BIR Audit / Assessment defense:
  LOA copy (to verify authority coverage, scope, tax type, period)
  PAN / FAN copy (to verify computation and assess protest ground)
  proof of receipt (to determine protest deadline)
  original and amended returns for the period
  books of accounts / general ledger
  subsidiary records per tax type assessed
```

**Risk:** Low to Medium. Documentary lists are domain-specific knowledge, not legal conclusions.
Risk arises if the list implies that listed documents guarantee a defense outcome.

**Phase 7B:** YES — design and fixture (PATCH-07B-003 or 07B-006). Implementation feasible
once fixture passes.

---

### Component 9 — procedural-issue-engine

**Purpose:**
Identify BIR procedural defects that may affect the validity or enforceability of an assessment.

**Inputs:**
- `assessmentStage` — from query or fact-gap-detector
- `loaPresent` — whether LOA has been received
- `panPresent` — whether PAN has been received
- `fanPresent` — whether FAN/FLD has been received
- `dateReceived` — dates relevant to prescription and protest deadlines
- `taxPeriodCovered` — period of assessment

**Outputs:**
- `defects[]` — identified or possible procedural defects
- `deadlines[]` — applicable BIR/CTA procedural deadlines (computed from inputs)
- `prescriptionRisk` — LOW / MODERATE / HIGH (is prescription a viable defense?)
- `dueProcessIssues[]` — possible Section 228 NIRC issues

**Philippine procedural reference design (architecture; not legal conclusions):**

```text
LOA validity checks (design placeholders):
  Does the LOA cover the tax period being assessed?
  Is the LOA signed by the appropriate BIR officer?
  Has the LOA been previously issued for the same period? (re-issuance concern)

PAN/FAN procedural compliance:
  Was the PAN issued? (required under Section 228 NIRC)
  Was the FAN/FLD issued within 15 days of PAN? (NIRC requirement)
  Does the FAN match the PAN amounts / issues?

Protest deadline:
  30 days from receipt of FAN/FLD to file protest (Section 228 NIRC)

Prescription (Section 203 vs 222 NIRC):
  3-year ordinary prescription from filing date (Section 203)
  10-year extraordinary prescription for fraudulent/non-filing (Section 222)
  Waiver of statute of limitations validity checks

CTA appeal timeline (after denial of protest):
  30 days from receipt of denial to appeal to CTA Division
  BIR inaction for 180 days = constructive denial (taxpayer may appeal)
```

**Authority-state constraints:**
- Procedural deadlines must be disclosed as requiring verification against current NIRC provisions.
- Phase 7B must not invent procedural rules not in the indexed corpus.
- Phase 10 temporal metadata will later improve accuracy of deadline computation.

**Risk:** Medium. Deadline computation errors could cause taxpayers to miss protest deadlines.
TINA must always recommend verification with qualified counsel.

**Phase 7B:** Design and fixture. Implementation of deadline computation requires
careful fact-input validation before proceeding.

---

### Component 10 — reasoning-safety-policy

**Purpose:**
Govern when Phase 7B reasoning components may activate and what conclusions they are
permitted to reach, based on authority state, issue complexity, fact sensitivity, and mode.

This is the most critical Phase 7B component. It is the governance control that prevents
analytical depth from becoming analytical overconfidence.

**Inputs:**
- `sourceAvailabilityState` — SAE state
- `issueClassification.factSensitivity` — LOW/MODERATE/HIGH
- `issueClassification.complexity` — SIMPLE/MODERATE/COMPLEX/MULTI_ISSUE
- `mode` — ask / tax / audit

**Outputs:**
- `mayReason` — boolean: may Phase 7B components activate for this query?
- `requiresFactsFirst` — boolean: must fact-gap-detector surface missing facts before concluding?
- `mustDiscloseWeakAuthority` — boolean: must the response disclose weak authority state?
- `prohibitedClaims[]` — list of claim types prohibited for this query's state

**Policy table (design):**

```text
SAE: NO_INDEXED_SOURCE
  mayReason: true for issue framing and fact gap only
  mayReason: false for applicability, BIR position, taxpayer position, risk assessment
  prohibitedClaims: [governing-authority-claim, definitive-risk-assessment, outcome-guarantee]

SAE: RELATED_AUTHORITY_ONLY
  mayReason: true for issue framing, fact gap, applicability (with caution required)
  mayReason: limited for BIR and taxpayer position (must note related-only limitation)
  prohibitedClaims: [governing-authority-claim, definitive-conclusion, high-confidence-risk]

SAE: AUTHORITY_FOUND, SIMPLE/MODERATE complexity
  mayReason: true for all components
  requiresFactsFirst: based on factSensitivity
  prohibitedClaims: [outcome-guarantee, supersession-claim-without-metadata]

SAE: AUTHORITY_FOUND, COMPLEX/MULTI_ISSUE
  mayReason: true for all components
  requiresFactsFirst: true (fact gap must surface before conclusion)
  prohibitedClaims: [outcome-guarantee, supersession-claim-without-metadata]
```

**Risk:** Low. This component is a control gate, not a reasoning engine.

**Phase 7B:** YES — implement before any reasoning engine is activated.

---

### Component 11 — advisory-output-policy

**Purpose:**
Translate Phase 7B reasoning outputs into Phase 7A format section content, ensuring that
Phase 7B analytical depth flows into Phase 7A sections without replacing or reordering them.

**Inputs:**
- All Phase 7B component outputs
- Current mode (ask / tax / audit)
- `sourceAvailabilityState`

**Outputs:**
- Enriched context map keyed to Phase 7A section names:
  ```text
  /ask:  directAnswer, keyRule, practicalNote, sourceNote
  /tax:  shortConclusion, governingAuthority, analysis, complianceEffect, caveatsAndMissingFacts
  /audit: quickAssessment, birPosition, taxpayerPosition, documentarySupport, proceduralIssues,
           riskLevel, recommendedAction
  ```

**Constraint:**
- Advisory output policy must not add sections outside Phase 7A structure.
- It must not remove Phase 7A mandatory sections.
- Phase 7B reasoning that cannot fit into existing sections should be folded into Caveats/Missing Facts.

**Risk:** Low as a policy module. Risk is in the component outputs it translates.

**Phase 7B:** YES.

---

### Component 12 — reasoning-evaluation-fixtures

**Purpose:**
Provide the fixture-first testing layer for Phase 7B reasoning components before any
runtime implementation.

This follows the same fixture-first pattern established in Phases 6F, 6H, and 7A.

**Fixture categories needed:**

```text
Issue-framing test cases (PATCH-07B-002)
Fact-gap detection test cases (PATCH-07B-003)
Authority applicability test cases (PATCH-07B-004)
BIR vs taxpayer position test cases (PATCH-07B-005)
Audit-defense risk-language test cases (PATCH-07B-006)
Reasoning safety policy gate test cases (PATCH-07B-007)
```

**Phase 7B:** YES — all fixtures before any implementation.

---

## 8. Authority-State-Aware Reasoning Architecture

### 8.1 AUTHORITY_FOUND State

```text
Phase 7B may:
  - activate all reasoning components
  - identify governing authority from retrieved source cards
  - state the applicability of authority to known facts
  - generate BIR likely position and taxpayer position
  - assess risk level based on facts and authority

Phase 7B must not:
  - overclaim beyond the scope of the indexed source
  - assert supersession or effective-date changes without Phase 10 metadata
  - guarantee outcomes even with strong authority
```

### 8.2 RELATED_AUTHORITY_ONLY State

```text
Phase 7B may:
  - activate issue framing and fact-gap detection fully
  - perform applicability analysis with mandatory limitation framing
  - generate a hedged BIR likely position noting that authority is indirect
  - generate a hedged taxpayer position noting the authority limitation
  - assess risk as MODERATE minimum (no strong authority = elevated risk)

Phase 7B must not:
  - present related authority as governing
  - state a definitive conclusion on the issue
  - generate a confident risk-level assessment without acknowledging authority gap
  - issue a LOW risk rating without governing authority
```

### 8.3 NO_INDEXED_SOURCE State

```text
Phase 7B may:
  - activate issue framing: identify the issue type and what authority would be needed
  - activate fact-gap detection: identify what facts would matter once authority is found

Phase 7B must not:
  - activate applicability engine (no source to assess)
  - activate BIR position engine (would require fabricating BIR authority)
  - activate taxpayer position engine (would require fabricating defense authority)
  - produce a risk-level assessment (basis is unavailable)
  - imply live source acquisition or future authority retrieval
```

### 8.4 GENERAL_TAX / Generic State

```text
Phase 7B may:
  - activate issue framing to clarify what specific issue the generic question implies
  - recommend narrowing the question before professional analysis

Phase 7B must not:
  - promote generic terms into specific authority citations
  - treat a general tax concept query as an exact authority analysis
  - activate full BIR vs taxpayer position analysis for a generic definitional question
```

### 8.5 Authority-State Gate as Pre-Condition

The reasoning-safety-policy (Component 10) gates all other Phase 7B components.
No Phase 7B reasoning component may produce output that the reasoning-safety-policy
has flagged as prohibited for the current authority state.

This rule is non-negotiable and must be enforced before Phase 7B implementation begins.

---

## 9. Issue-Framing Architecture

### 9.1 Existing Issue Classification Coverage

The existing `issue-classification-engine.js` (v7.0.0) already classifies:

```text
PRIMARY_ISSUE: VAT, CIT, IIT, WHT, PCT, EXC, DST, CGT, EST, LGT, RPT, CUS, SPC, PRE,
  DIS, CON, VAT_LIABILITY, VAT_REFUND, VAT_EXEMPTION, ZERO_RATED_SALES, INPUT_TAX,
  OUTPUT_TAX, INCOME_TAX, WITHHOLDING, DEDUCTIONS, EXEMPTIONS, TAX_REFUND_CREDIT,
  ASSESSMENT, PRESCRIPTION, PROCEDURAL, EVIDENTIARY, JURISDICTIONAL, TRANSACTION,
  CONTRACT, ECONOMIC_SUBSTANCE, ACCOUNTING, AUDIT, DOCTRINE, CASE_LAW, ISSUANCE,
  NAMED_LAW, GENERAL_TAX, BIR_ORGANIZATION

LEGAL_DIMENSION: SUBSTANTIVE, PROCEDURAL, EVIDENTIARY, JURISDICTIONAL, TEMPORAL,
  ADMINISTRATIVE, FACTUAL, CONTRACTUAL, ECONOMIC_SUBSTANCE, TRANSACTION, ACCOUNTING,
  AUDIT, CONSTITUTIONAL, COMPUTATIONAL, GENERAL

COMPLEXITY: SIMPLE, MODERATE, COMPLEX, MULTI_ISSUE
FACT_SENSITIVITY: LOW, MODERATE, HIGH
QUERY_INTENT: DEFINITION, OVERVIEW, ANALYSIS, COMPLIANCE, DISPUTE, PLANNING, ADVISORY,
  COMPUTATION, SOURCE_INVENTORY, REVIEW
```

Phase 7B issue-framing-engine should:
- Consume these existing classifications without modifying issue-classification-engine.js
- Add a professional `issueStatement` wrapping the classification
- Add the `factsKnown` / `factsMissing` / `authoritiesNeeded` layer on top

### 9.2 Issue-Framing Examples

```text
Query: "Can we deduct this expense?"
  issueClassification.primaryIssue: DEDUCTIONS
  issueStatement: "Whether the claimed expense satisfies the requirements for deductibility
    under Section 34 of the NIRC, including substantiation and withholding-tax compliance."
  factsKnown: [expense claimed]
  factsMissing: [expense type, amount, business purpose, OR/invoice support, CWT compliance,
    period incurred]
  authoritiesNeeded: [NIRC Sec. 34, applicable RR for CWT compliance]
  riskOfAnsweringWithoutFacts: HIGH

Query: "Can we win this BIR audit?"
  issueClassification.primaryIssue: AUDIT
  issueStatement: "Assessment of the taxpayer's legal and procedural position in the pending
    BIR audit, including the validity of the LOA, the substantiation of items assessed, and
    the available defenses."
  factsKnown: [pending BIR audit]
  factsMissing: [LOA validity, assessment stage, tax types assessed, amounts, documentary support,
    protest deadline status, tax period]
  authoritiesNeeded: [NIRC Sec. 228, applicable RR/RMC for due process, CTA jurisprudence]
  riskOfAnsweringWithoutFacts: CRITICAL

Query: "Is this VAT zero-rated?"
  issueClassification.primaryIssue: ZERO_RATED_SALES
  issueStatement: "Whether the transaction qualifies as a zero-rated sale under Section 106(A)
    or 108(B) of the NIRC, considering the nature of the transaction, taxpayer registration
    status, buyer status, and documentary compliance."
  factsKnown: [transaction exists]
  factsMissing: [transaction type (goods/services), buyer type (PEZA/export/domestic), taxpayer
    VAT registration, invoice/OR type, PEZA/BOI certification if buyer is zone-registered,
    amount, period]
  authoritiesNeeded: [NIRC Sec. 106(A), 108(B), applicable RR for zero-rating documentation]
  riskOfAnsweringWithoutFacts: HIGH
```

### 9.3 Relationship to Phase 7A /tax Section "E. Caveats / Missing Facts"

The issue-framing-engine's `factsMissing[]` output directly populates the content of
"E. Caveats / Missing Facts" in /tax mode. Phase 7A defined the section; Phase 7B
fills it with specific, query-appropriate content.

---

## 10. Fact-Gap Detector Architecture

### 10.1 Design Principle

The fact-gap detector must be proportionate:

```text
SIMPLE complexity + LOW factSensitivity → minimal detection (1-2 critical facts max)
MODERATE complexity + MODERATE factSensitivity → targeted detection (3-5 critical facts)
COMPLEX/MULTI_ISSUE + HIGH factSensitivity → full detection (all known categories)
/audit mode → always full detection regardless of complexity
```

### 10.2 Output Distinctions

```text
criticalMissing: without these facts, TINA must not state a professional conclusion.
  Example: assessment stage is critical for /audit; without it, risk level cannot be computed.

helpfulButOptional: these facts would improve analysis but are not blocking.
  Example: exact amounts help quantify risk but are not required to frame the issue.

assumptionsNotToTreatAsFacts: inferences made from context that have not been stated by the user.
  Example: if user says "our deduction was disallowed" — TINA must not assume this means the
  FAN was already issued unless the user says so.
```

### 10.3 Integration with Response

When critical facts are missing and the query is complex or in /tax or /audit mode:
- Phase 7B should surface the fact gap before generating a conclusion.
- The response should ask for the specific missing facts before giving a professional analysis.
- For /ask simple queries, fact gaps may be noted without blocking the answer.

---

## 11. Authority Applicability Architecture

### 11.1 Current Applicability Signal (Existing)

The existing pipeline already provides:
- `issueClassification.targetAuthorities[]` — what authority the classifier expects
- `exactAuthorityMatch` / `authorityMatchTier` on retrieved source candidates
- `sourceCards[].authorityRole` — GOVERNING / SUPPORTING / RELATED / SECONDARY / UNKNOWN

Phase 7B authority-applicability-engine enriches this with a professional-language output:
whether the authority applies to the user's specific facts (beyond just matching the issue type).

### 11.2 Applicability vs Retrieval Match

```text
Retrieval match: "this source was retrieved for this issue type" (existing).
Applicability assessment: "this source governs the specific transaction/taxpayer/fact pattern
  that the user described" (Phase 7B addition).
```

These are different. A source on EWT may be retrieved for any EWT query, but it may only
govern income payments subject to a specific rate or category. Issue-type match ≠ factual applicability.

### 11.3 Phase 10 Dependency Boundary

Phase 7B must clearly boundary the following:

```text
Phase 7B can assess: tax type match, taxpayer type match, transaction type match, hierarchy level.
Phase 7B cannot reliably assess: effective date, supersession, amendment status.
Phase 10 provides: temporal metadata enabling effective-date and supersession checks.
```

Phase 7B design should include placeholder fields (`temporalApplicability: "requires Phase 10 metadata"`)
so that when Phase 10 lands, the applicability engine can be enriched without architectural rework.

---

## 12. BIR vs Taxpayer Position Architecture

### 12.1 Existing Foundation

`prompts/audit-mode-prompt.js` already instructs the LLM to:
- Separate BIR likely position from taxpayer position/defenses
- Cite only verified authorities
- Not guarantee audit or protest outcomes
- Apply authority hierarchy

Phase 7B's BIR-position-engine and taxpayer-position-engine formalize this as structured
pre-prompt inputs, moving from "LLM instruction" to "structured context passed to LLM."

The benefit: structured context is more reliably interpreted by the LLM than general instruction.

### 12.2 BIR Position Design Principles

```text
BIR is adversarial: the BIR position assumes the worst lawful interpretation against the taxpayer.
BIR cites authority: the BIR position should cite the authority BIR is most likely to rely on,
  not the taxpayer's preferred authority.
BIR has procedural advantages: BIR can reopen assessments, issue subpoenas, extend prescription
  with waivers. The position should acknowledge this.
BIR weaknesses: BIR must follow due process (Sec. 228 NIRC); invalid LOA is a defense;
  prescription may apply; the correct form/procedure must be used.
```

### 12.3 Taxpayer Position Design Principles

```text
Taxpayer position is defensive: identify the strongest legal and factual basis for the defense.
Distinguish documented positions from undocumented ones: "if documents are complete" vs
  "subject to verification of supporting documents."
Never guarantee: "taxpayer has strong grounds" ≠ "taxpayer will win."
Acknowledge weakness: if the position is weak, say so and recommend appropriate action
  (settle, compromise, escalate to counsel).
Position strength must track authority state:
  AUTHORITY_FOUND → may describe position as well-supported
  RELATED_AUTHORITY_ONLY → must describe position as analogical or uncertain
  NO_INDEXED_SOURCE → must describe position as uncertain or unsupported
```

### 12.4 Integration with /audit Advisory Structure

```text
Phase 7A section "2. BIR Likely Position" ← BIR position engine output
Phase 7A section "3. Taxpayer Position / Defenses" ← taxpayer position engine output
Phase 7A section "4. Documentary Support Needed" ← documentary support engine output
Phase 7A section "5. Procedural Issues" ← procedural issue engine output
Phase 7A section "6. Risk Level" ← audit-defense risk engine output
Phase 7A section "7. Recommended Action" ← risk engine's nextStep + defensePriority
```

All Phase 7B outputs flow into existing Phase 7A sections. No new top-level sections
are created by Phase 7B.

---

## 13. Audit-Defense Reasoning Architecture

### 13.1 Current Audit Scope

`prompts/audit-mode-prompt.js` already covers:
- LOA validity and defects
- NIC, PAN, FAN/FLD, FDDA
- Deficiency assessment computation
- Protest (reconsideration and reinvestigation)
- VAT / income tax / withholding tax audit
- DST / percentage tax / excise exposure
- Prescription (Sec. 203 and 222 NIRC)
- Due process defects (Sec. 228 NIRC)
- Procedural defects
- Documentary evidence gaps
- Settlement and compromise (Sec. 204 NIRC)
- CTA preparation

Phase 7B should structure this existing knowledge into deterministic reasoning components
rather than relying entirely on LLM generalization from the prompt.

### 13.2 Priority Reasoning Areas for Phase 7B

The following areas have the highest practical impact and the clearest structured logic:

```text
Priority 1 — LOA validity check
  Is the LOA issued by the authorized BIR officer? Does it cover the right period and tax type?
  Is there a possible LOA re-issuance issue?

Priority 2 — Protest deadline tracking
  30 days from FAN receipt (Sec. 228 NIRC).
  If deadline has passed: what options remain? (limited)
  If within 30 days: protest type (reconsideration vs reinvestigation).

Priority 3 — Prescription assessment
  Was the return filed? (3-year vs 10-year prescription)
  Was a valid waiver signed? (strict construction required)
  Was the LOA issued before prescription?

Priority 4 — EWT/CWT substantiation (BIR Form 2307)
  Are BIR Form 2307s available for income subject to CWT?
  Is the discrepancy due to missing 2307s or incorrect classification?

Priority 5 — Input VAT substantiation
  Invoice compliance (VAT invoice / official receipt requirements)
  Supplier VAT registration
  Business-purpose documentation
```

### 13.3 Phase 7B vs Phase 9 Boundary

Phase 7B designs the reasoning logic. Phase 9 produces the workflow outputs:

```text
Phase 7B → "what is the protest ground and what documents are needed?"
Phase 9 → "draft the protest letter based on those grounds and documents"
Phase 7B → "what is the risk level and recommended action?"
Phase 9 → "produce the audit defense matrix for the client"
```

Phase 7B must not start generating Phase 9 document outputs (protest drafts, engagement checklists,
BIR reply templates). If a reasoning output prompts a user to ask for a draft, TINA should note
that document generation is a more advanced feature and recommend qualified counsel.

---

## 14. Risk Language / Risk Scoring Architecture

### 14.1 Risk Labels

Permitted risk labels (consistent with Phase 7A /audit structure):

```text
LOW — strong indexed authority, adequate facts, adequate documentary support,
      no material procedural defect, prescription not an issue for BIR.

MODERATE — authority is indexed but applicability is fact-dependent, or facts/documents
            are incomplete, or procedural posture has minor vulnerabilities.

HIGH — authority is related-only or weak, or critical facts/documents are missing,
        or BIR position is strong relative to available defense.

CRITICAL — no indexed authority, no documented defense, significant amount/materiality,
            prescriptive period has not expired, no viable procedural defense.

UNKNOWN / INSUFFICIENT FACTS — critical material facts are missing and risk cannot be
    reliably assessed. TINA must ask for specific facts before providing a risk assessment.
```

### 14.2 Risk Language Rules

```text
Must not guarantee outcome: "Your chances of winning are X%" is prohibited.
Must scale with authority state: NO_INDEXED_SOURCE cannot produce LOW or MODERATE risk.
Must acknowledge fact dependence: risk level must include the key fact assumptions.
Must acknowledge document dependence: risk level must note if assessment assumes documentary support.
Must recommend professional engagement for HIGH and CRITICAL: a qualified Philippine tax counsel
  should be consulted for material assessments or CTA appeals.
Must not use numeric scores without defined methodology: qualitative labels preferred until a
  calibrated scoring model can be developed in a later phase.
```

### 14.3 Risk Language Integration with applyVerifiedAuthorityGate

`applyVerifiedAuthorityGate` already relabels GOVERNING/CONTROLLING headings to
RELATED/SUPPORTING under RELATED_AUTHORITY_ONLY. Phase 7B risk language must be consistent:
if the gate relabels an authority as related-only, the risk level must reflect the
weaker authority state.

---

## 15. Validator False-Positive Placement

### 15.1 Background

PATCH-025B identified validator false positives for BIR Form 2307 and BIR Form 2550M:

```text
BIR Form 2307: CWT certificate — the primary support document for EWT/CWT deductibility
  and credit. If TINA incorrectly classifies a query about Form 2307 as unrelated to WHT/EWT,
  it may retrieve incorrect authority or produce an incorrect issue frame.

BIR Form 2550M: Monthly VAT declaration — if TINA incorrectly routes a Form 2550M query
  to a non-VAT issue classification, it may fail to retrieve VAT-specific authority.
```

### 15.2 Phase Placement Decision

**If the issue is classification/reasoning/interpretation:**

```text
→ Phase 7B
The issue-framing-engine (Component 1) should correctly frame queries about Form 2307 as
WHT/EWT issues and Form 2550M queries as VAT issues.
The fact-gap-detector (Component 2) should include Form 2307 availability as a critical fact
for EWT deficiency queries.
This is a reasoning and issue-framing improvement, not a retrieval or metadata issue.
```

**If the issue is missing source coverage or authority metadata:**

```text
→ Phase 10
If the indexed corpus lacks sufficient RR/RMC coverage of the specific form requirements,
improving classification will not help — Phase 10 source acquisition is needed.
```

**Architecture recommendation:**

Phase 7B-002 should include a diagnostic fixture case for Form 2307 (EWT/CWT issue) and
Form 2550M (VAT issue) to determine whether the classification correctly routes these queries
before any runtime fix is attempted. If fixtures reveal a classification gap, a narrow
PATCH-07B-00X fix to issue-classification-engine.js (already modifiable) may be approved.
If fixtures reveal a corpus gap, defer to Phase 10.

This placement is: Phase 7B diagnostic first, then Phase 7B fix or Phase 10 as determined.

---

## 16. CTA 9711 / CTA 9369 / Seagate Placement

### 16.1 Background

CTA 9711, CTA 9369, and the Seagate case (G.R. No. 153866) are important Philippine tax
authorities that have been indexed or partially indexed. The concern is:

```text
RELATED_AUTHORITY_ONLY situations: if TINA retrieves a related but not exact authority for
  a Seagate-type zero-rating question, the response should note the distinction clearly.

Citation faithfulness: if the answer cites CTA 9369 or Seagate, the source card should open
  the correct case, not a similar one.

Answer grounding: if the answer makes a factual claim about what CTA 9711 held, it should be
  verifiable against the indexed text of that case.
```

### 16.2 Phase Placement Decision

```text
Phase 7B (reasoning caution design):
  The authority-applicability-engine (Component 3) should treat case authority (CTA/GR) as
  subject to factual similarity checks. CIR v. Seagate Technology governs zero-rating for
  PEZA-registered enterprises; it should not be treated as governing for non-PEZA zero-rating.
  Phase 7B fixtures should include a case-applicability check: "does Seagate apply to this
  fact pattern?" This is reasoning design, not live grounding.

Phase 7C / 6F-LIVE (live answer-grounding):
  Checking whether TINA's answer faithfully represents what CTA 9711 or CTA 9369 actually
  held — comparing generated text against indexed source text — belongs to Phase 7C live
  answer-grounding and citation-faithfulness evaluation.

Phase 10 (source metadata):
  If the indexed source for CTA 9711, CTA 9369, or Seagate is incomplete or lacks correct
  metadata, Phase 10 source governance and metadata improvement addresses that.
```

**Architecture recommendation:**
Phase 7B should design reasoning cautions around case authority applicability. Phase 7C/6F-LIVE
implements live grounding checks. Phase 10 improves source metadata. These are three distinct
layers and must not be conflated in Phase 7B.

---

## 17. Evaluation-First Implementation Strategy

Phase 7B must follow the fixture-first discipline established in Phases 6F, 6H, 7A, and now
required for all future implementation phases.

### 17.1 Fixture-First Principle

```text
No Phase 7B runtime logic is implemented until a fixture exists that defines
the expected output of that logic.
No Phase 7B fixture is considered passing until it also passes the reasoning-safety-policy
  gate for the relevant authority state.
Gemini review of the reasoning architecture and fixtures is recommended before
  PATCH-07B-008 (first runtime implementation).
```

### 17.2 Component Implementation Readiness

```text
Issue-framing-engine: Low risk, fixture-first, implement after 07B-002 fixture passes.
Fact-gap-detector: Medium risk, fixture-first, implement after 07B-003 fixture passes.
Authority-applicability-engine: Medium/High risk, fixture-first, narrow implementation only.
Authority-conflict-advisor: High risk, design/placeholder only in Phase 7B.
BIR-position-engine: High risk, fixture-first, implement cautiously after 07B-005 passes.
Taxpayer-position-engine: High risk, fixture-first, implement cautiously after 07B-005 passes.
Audit-defense-risk-engine: High risk, fixture-first, implement cautiously after 07B-006 passes.
Documentary-support-engine: Low/Medium risk, implement after 07B-006 or 07B-003 fixture passes.
Procedural-issue-engine: Medium risk (deadline computation), fixture-first, cautious implementation.
Reasoning-safety-policy: Low risk (control gate), implement first before any reasoning engine.
Advisory-output-policy: Low risk (translation layer), implement before first reasoning engine output.
```

---

## 18. Recommended Phase 7B Patch Sequence

```text
PATCH-07B-001  — Analytical reasoning architecture review [THIS PATCH — COMPLETE]

PATCH-07B-002  — Analytical reasoning fixture and issue-framing test scaffold
  Codex only: add fixture for issue-framing-engine expected outputs across:
  WHT/EWT deficiency, VAT zero-rating, BIR audit/assessment, deductibility, prescription,
  BIR Form 2307 and Form 2550M diagnostic cases.
  Add focused test. No runtime change.

PATCH-07B-003  — Fact-gap detector fixture and tests
  Codex only: add fixture for fact-gap-detector expected outputs across issue types and
  assessment stages. Include critical vs optional distinction, assumption guards.
  Include documentary support design cases.
  Add focused test. No runtime change.

PATCH-07B-004  — Authority applicability policy fixture and tests
  Codex only: add fixture for authority-applicability-engine expected outputs across
  SAE states (AUTHORITY_FOUND, RELATED_AUTHORITY_ONLY, NO_INDEXED_SOURCE) and
  issue types. Include Phase 10 temporal dependency placeholders.
  Include case-applicability check for Seagate/CTA zero-rating scenarios.
  Add focused test. No runtime change.

PATCH-07B-005  — BIR vs taxpayer position architecture fixture and tests
  Codex only: add fixture for BIR-position-engine and taxpayer-position-engine expected
  outputs. Include authority-state-dependent positioning, no-outcome-guarantee policy,
  position-strength scaling by SAE state.
  Add focused test. No runtime change.

PATCH-07B-006  — Audit-defense risk-language fixture and tests
  Codex only: add fixture for audit-defense-risk-engine expected outputs. Include all
  risk labels (LOW through UNKNOWN/INSUFFICIENT FACTS). Include procedural-issue-engine
  design cases (LOA validity, protest deadline, prescription, CWT substantiation).
  Add focused test. No runtime change.
  Gemini review recommended for this fixture before PATCH-07B-007.

PATCH-07B-007  — Reasoning safety policy and source-state guard tests
  Codex only: add fixture for reasoning-safety-policy gate behavior across all SAE states
  and complexity levels. Verify prohibition of fabrication under NO_INDEXED_SOURCE,
  prohibition of outcome guarantees, prohibition of governing claims under RELATED_AUTHORITY_ONLY.
  Add focused test. No runtime change.

PATCH-07B-008  — First narrow issue-framing implementation, if fixtures support it
  Codex only: implement issue-framing-engine and reasoning-safety-policy as runtime modules.
  No BIR position, taxpayer position, risk-scoring, or applicability engine in this patch.
  Add narrowly scoped runtime tests. Must pass before next reasoning engine is activated.
  Prerequisite: PATCH-07B-002 through 07B-007 all passing.
  Prerequisite: PATCH-07B-001 Gemini review favorable.

PATCH-07B-GATE-1  — Phase 7B Stabilization Gate
  Claude Code: verify all PATCH-07B-002 through 07B-008 artifacts, no prohibited
  runtime/dependency/corpus changes, authority discipline preserved, Phase 7A format
  boundaries intact, reasoning-safety-policy active.
```

### 18.1 Adjustment Conditions

The sequence above may be adjusted if:

```text
PATCH-07B-002 fixtures reveal that BIR Form 2307/2550M is a retrieval gap (not classification)
  → defer to Phase 10; remove Form 2307/2550M diagnostic from Phase 7B sequence.

PATCH-07B-004 fixtures reveal that authority-applicability requires Phase 10 temporal metadata
  even for simple applicability checks → reduce scope of 07B-004 to classification-level only.

Gemini review of PATCH-07B-006 fixtures identifies high-risk reasoning patterns
  → add PATCH-07B-006R expansion before proceeding to 07B-007.

PATCH-07B-008 implementation shows unexpected scope or runtime diff
  → stop, diagnose, and add a targeted diagnostic before proceeding to gate.
```

---

## 19. Tool / Dependency Discipline

No new dependency is required for PATCH-07B-001.

Confirmed deferred for all of Phase 7B:

```text
zod
  May be considered for structured reasoning schema validation in a later Phase 7B patch
  if the advisory-output-policy benefits from runtime schema enforcement. Not in PATCH-07B-001.

Langfuse
  Phase 11 only or limited Phase 7C for live evaluation.

cohere-ai
  Deferred from Phase 6H; not a Phase 7B dependency.

Vercel AI SDK
  Frontend streaming/chat UX only. Not a Phase 7B backend concern.

Zustand
  Frontend state management only. Not a Phase 7B backend concern.

n8n / Crawlee / Apify
  Phase 10 source acquisition and governance. Not Phase 7B.

Honeycomb / OpenTelemetry
  Phase 11 observability only.

Gemini / GLM / DeepSeek / GitHub Copilot Agent Mode
  Parked. Not a Phase 7B dependency.
```

---

## 20. Deferred Roadmap / Monitoring Notation

The following items remain deferred/optional and were not touched, implied, or implemented
in this review:

```text
frontend state cleanup if needed
streaming response UX if needed
Zustand frontend evaluation if frontend state issues appear
Vercel AI SDK only if streaming/chat UX evidence supports it
Phase 7C/6F-LIVE answer-grounding/citation-faithfulness evaluation
Phase 8 memory/user learning/governed tax intelligence
Phase 9 professional workflow co-pilot (BIR replies, protest drafts, engagement checklists)
Phase 10 source governance, official-source acquisition, n8n, Crawlee, Apify, Google Drive
Phase 11 observability/query evidence/adaptive operations
Phase 12 document-aware advisory
Phase 13 full Philippine Tax Operating System
Phase 14 mobile app after Phase 13
Phase 15 long-term autonomous governance
source-governance red-team after Phase 10
full Tax Operating System red-team after Phase 13
```

---

## 21. Risk Assessment

### 21.1 Architecture Review Risk

Low. This patch is read-only. No runtime files, tests, package files, DB, vector, corpus,
ingestion, prompts, routes, or controllers were changed.

### 21.2 Implementation Risk by Component

```text
issue-framing-engine: Low. Transforms existing classification outputs.
fact-gap-detector: Medium. Proportionality control needed for simple queries.
authority-applicability-engine: Medium/High. Phase 10 dependency boundary critical.
authority-conflict-advisor: High. Design/placeholder only; do not implement in Phase 7B.
bir-position-engine: High. Must not fabricate BIR authority.
taxpayer-position-engine: High. Must not guarantee outcomes.
audit-defense-risk-engine: High. Risk labels have professional consequences.
documentary-support-engine: Low/Medium. Domain-specific knowledge, not legal conclusions.
procedural-issue-engine: Medium. Deadline computation is fact-sensitive.
reasoning-safety-policy: Low. It is a control, not a reasoning engine.
advisory-output-policy: Low. It is a translation layer.
```

### 21.3 Cross-Cutting Risks

```text
Risk A — Analytical depth creates analytical overconfidence.
  TINA's reasoning may sound more certain than its authority state warrants.
  Mitigation: reasoning-safety-policy (Component 10) gates all other components.
  Mitigation: PATCH-07A-007/007R red-team fixtures already cover overconfidence traps.

Risk B — Phase 10 dependency leakage.
  Effective-date or supersession reasoning in Phase 7B may produce incorrect conclusions
  if the indexed corpus lacks temporal metadata.
  Mitigation: authority-conflict-advisor and temporal reasoning are design-only in Phase 7B.
  Mitigation: PATCH-07B-004 fixtures must explicitly test Phase 10 dependency boundary.

Risk C — Phase 9 scope creep.
  Phase 7B reasoning outputs (what documents are needed, what is the defense) may be
  mistaken for Phase 9 document generation outputs (the draft document itself).
  Mitigation: advisory-output-policy (Component 11) explicitly translates reasoning into
  Phase 7A section content, not into standalone documents.

Risk D — Phase 7A boundary weakening.
  Phase 7B reasoning components might be implemented in a way that bypasses or replaces
  Phase 7A format sections rather than filling them.
  Mitigation: architectural rule (Section 6.2): reasoning feeds into format, not around it.

Risk E — BIR Form 2307/2550M false-positive introduction.
  A Phase 7B fix to Form 2307/2550M classification may inadvertently affect other WHT/VAT
  queries if the fix is too broad.
  Mitigation: PATCH-07B-002 diagnostic fixture first; narrow fix only after fixture confirms scope.
```

---

## 22. Gemini Review Recommendation

Gemini review of this architecture report is recommended before PATCH-07B-008 (first runtime
implementation) begins.

### 22.1 What Gemini Should Review

```text
Missing reasoning risks not identified in this review.
Authority conflict / hierarchy architecture concerns (Component 4).
BIR vs taxpayer position architecture completeness (Components 5 and 6).
Audit-defense overconfidence risks in Components 5, 6, and 7.
Issue-framing adequacy for Philippine tax practice (Component 1).
Fact-gap-detector proportionality for simple vs complex queries (Component 2).
Whether the proposed reasoning-safety-policy (Component 10) is sufficient.
Whether the recommended fixture sequence (PATCH-07B-002 through 07B-007) is safe.
Whether Phase 7B vs Phase 10 dependency boundaries are correctly drawn.
Whether BIR Form 2307/2550M placement (Phase 7B diagnostic) is correct.
Whether CTA 9711/9369/Seagate placement (Phase 7B caution + Phase 7C grounding) is correct.
Whether the risk-language schema (Section 14) is appropriate for Philippine tax practice.
```

### 22.2 What Gemini Must Not Do

```text
Do not implement code.
Do not propose runtime behavior changes in this pass.
Do not suggest Phase 10, Phase 11, or Phase 9 work as Phase 7B items.
Do not suggest adding new dependencies.
Do not mark Phase 7B as ready to implement without fixture validation.
```

### 22.3 Timing of Gemini Review

```text
Suggested: after PATCH-07B-001 is committed and pushed (this patch).
Suggested: again after PATCH-07B-006 audit-defense risk-language fixture, before PATCH-07B-007.
Optional: after PATCH-07B-007 reasoning safety policy, before PATCH-07B-008 implementation.
```

---

## 23. Final Architecture Recommendation

### 23.1 Proceed

Phase 7B should proceed with the recommended sequence. The foundation from Phases 6F, 6H, and 7A
provides a strong base:

```text
The existing issue-classification-engine.js already classifies issues, complexity, fact sensitivity,
  and legal dimension. Phase 7B issue-framing-engine enriches this output without modifying the engine.
The existing prompts/audit-mode-prompt.js already separates BIR position from taxpayer position.
  Phase 7B formalizes this as structured pre-prompt context.
The existing applyVerifiedAuthorityGate already enforces authority-state discipline on generated text.
  Phase 7B reasoning-safety-policy provides the upstream governance gate before generation.
The existing Phase 7A red-team fixtures (53 cases) already cover major overconfidence traps.
  Phase 7B reasoning fixtures extend these with structured analytical reasoning cases.
```

### 23.2 Key Architecture Decisions

```text
Decision 1 — Reasoning feeds into format, not around it.
  Phase 7B component outputs must be input to Phase 7A section content, not additional top-level
  sections. No new response sections are added by Phase 7B.

Decision 2 — Reasoning-safety-policy is implemented first.
  PATCH-07B-007 (reasoning safety policy) must pass before PATCH-07B-008 (first implementation).
  No reasoning engine may activate without the safety policy in place.

Decision 3 — Phase 10 temporal dependency is explicitly excluded from Phase 7B.
  Effective-date computation, supersession detection, and authority freshness checking are
  Phase 10 work. Phase 7B fixtures must include explicit placeholders marking these as deferred.

Decision 4 — Fixture-first, always.
  No PATCH-07B-008 implementation may begin before PATCH-07B-002 through 07B-007 fixtures
  all pass and Gemini review is favorable.

Decision 5 — Documentary-support-engine and procedural-issue-engine are lower-risk starting points.
  These components involve domain knowledge (document types, deadline rules) rather than
  competing legal interpretations. They should be implemented before BIR/taxpayer position
  engines if PATCH-07B-008 scope needs to be further narrowed.

Decision 6 — BIR Form 2307/2550M requires diagnostic first.
  PATCH-07B-002 must include diagnostic fixture cases. Runtime fix only if fixture confirms
  the issue is classification/reasoning rather than corpus coverage.

Decision 7 — Gemini review before first implementation.
  Gemini should review this architecture report. If Gemini identifies material gaps,
  a PATCH-07B-001R supplement may be added before proceeding.
```

---

## 24. Confirmation of No Runtime Behavior Change

Confirmed:

```text
answer-renderer.js: not changed.
ask-handler.js: not changed.
rag-answer-handler.js: not changed.
context-orchestration-engine.js: not changed.
prompts/audit-mode-prompt.js: not changed.
prompts/tax-mode-prompt.js: not changed.
pipeline.js: not changed.
retrieval-engine.js: not changed.
reranker-engine.js: not changed.
source-card-engine.js: not changed.
issue-classification-engine.js: not changed.
source-visibility-engine.js: not changed.
classifySourceAvailability: not moved, not changed.
computeSourceAvailability: not moved, not changed.
sourceAvailability behavior: not changed.
source-card behavior: not changed.
retrieval behavior: not changed.
reranker behavior: not changed.
authority-normalization behavior: not changed.
tests: not changed.
package.json: not changed.
package-lock.json: not changed.
dependencies: not changed.
DB/indexing/RAG/vector/corpus/ingestion: not changed.
environment/secrets: not changed.
.vscode/: not touched (remained untracked).
```

---

## 25. Validation Results

```text
git branch --show-current
PASS - feature/source-availability-engine-v1

git log --oneline -3
PASS - db82f4b PATCH-07A-GATE-1 close Phase 7A confirmed

git status --short
PASS - clean before review (only untracked .vscode/)

npm test
PASS - 10 syntax checks, 84 test suites, 0 failures

npm run guard:files
PASS - No protected files modified

git diff --name-only
PASS - only this architecture review doc and knowledge/CURRENT_STATE.md
```

---

## 26. Phase 7B Status

PATCH-07B-001: COMPLETE / ARCHITECTURE REVIEW / LOCAL PASS

Next task:

```text
PATCH-07B-002 - Analytical reasoning fixture and issue-framing test scaffold
```

Recommended agent for next task:

```text
Codex
```

Gemini review:

```text
Suggested — review this architecture report before PATCH-07B-008 implementation begins.
```

Reason: Phase 7B introduces BIR vs taxpayer position reasoning, audit-defense risk scoring,
and authority applicability analysis — all high-risk areas for a Philippine tax system.
Gemini review of the architecture design before implementation reduces the risk of
building reasoning logic that overclaims authority or produces overconfident legal analysis.
