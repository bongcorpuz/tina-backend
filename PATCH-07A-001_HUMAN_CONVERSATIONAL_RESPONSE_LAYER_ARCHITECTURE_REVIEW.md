# PATCH-07A-001 - Human Conversational Response Layer Architecture Review

Status: COMPLETE / ARCHITECTURE REVIEW / LOCAL PASS

Branch: feature/source-availability-engine-v1

---

## 1. Objective

Perform a read-only architecture review for Phase 7A — Human Conversational Response Layer.

Design how TINA can answer more naturally, professionally, and less robotically while preserving authority discipline, source-card integrity, sourceAvailability state, and /ask, /tax, /audit mode boundaries.

No runtime behavior was changed in this patch.

---

## 2. Scope

Architecture/design review only.

Confirmed out of scope for this patch:

```text
runtime behavior changes
response generation changes
prompt/template changes
route/controller changes
retrieval behavior changes
reranker behavior changes
authority-normalization behavior changes
source-card behavior changes
sourceAvailability behavior changes
issue-classification behavior changes
ask/tax/audit runtime behavior changes
new dependencies
new external tools
Phase 7B, 7C, 8, 9, 10, 11, 12, 13, 14, 15 work
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

Pre-existing `.vscode/` remained untracked and untouched before and after this review.

Recent history confirmed:

```text
7fb97ed PATCH-06H-GATE-1 close Phase 6H
991c1bb PATCH-06H-007 add retrieval reranker comparison report generator
99c805d PATCH-06H-006 add retrieval reranker comparison scaffold
ef776f4 PATCH-06H-005 add retrieval reranker comparison plan
e2f4ff3 PATCH-06H-004 add retrieval reranker baseline evaluation
d671a85 PATCH-06H-003 fix bare citation normalization
1c0a689 PATCH-06H-002 add bare citation normalization regression tests
95036d1 PATCH-06H-001 add retrieval reranker authority baseline map
ed0af67 PATCH-06G-GATE-1 close Phase 6G
```

Baseline confirmed: `7fb97ed PATCH-06H-GATE-1 close Phase 6H`.

---

## 4. Reviewed Inputs

The following files were read as part of this architecture review:

```text
knowledge/CURRENT_STATE.md
PATCH-06H-GATE-1_PHASE_6H_STABILIZATION_GATE.md
PATCH-06H-004_RETRIEVAL_RERANKER_BASELINE_EVALUATION_REPORT.md
PATCH-06H-005_RETRIEVAL_RERANKER_COMPARISON_PLAN_NO_DEPENDENCY.md
PATCH-06F-GATE-1_PHASE_6F_EVALUATION_HARNESS_STABILIZATION_GATE.md
PATCH-06F-006_MODE_FORMAT_EVALUATION_ASK_TAX_AUDIT.md
tests/patch-06f-006-mode-format-evaluation.test.mjs
evaluation/fixtures/phase-6f-006-mode-format-evaluation.fixture.json (via test file)
ask-handler.js (architecture read, no edit)
answer-renderer.js (architecture read, no edit)
rag-answer-handler.js (architecture read, no edit)
context-orchestration-engine.js (architecture read, no edit)
prompts/audit-mode-prompt.js (existence confirmed)
source-visibility-engine.js (existence confirmed)
```

No runtime files were edited.

---

## 5. Phase 7A Purpose

TINA currently answers from a mechanical retrieval template. The A-F heading structure
(A. DIRECT ANSWER / B. CONTROLLING LEGAL BASIS / C. SUPPORTING RULES / D. SUPPORTING
JURISPRUDENCE / E. DOCTRINAL STATUS / F. PRACTICAL NOTE) is architecturally sound but
is applied uniformly across all questions regardless of complexity, user sophistication, or
mode intent. The result is a system that feels robotic and template-driven even when the
underlying authority is solid.

Phase 7A exists to make TINA answer like a competent Filipino tax professional: clear,
direct, practically useful, and adapted to the nature of the question and the authority
state — while retaining strict source discipline.

Phase 7A must not weaken:

```text
source-card integrity
authority state (AUTHORITY_FOUND / RELATED_AUTHORITY_ONLY / NO_INDEXED_SOURCE)
source limitation disclosure wording
generic-query guard discipline
/ask, /tax, /audit mode boundaries
exact authority handling
RELATED_AUTHORITY_ONLY caution
NO_INDEXED_SOURCE non-fabrication discipline
professional tax risk disclaimers where required
```

---

## 6. Human Response Goals

### 6.1 What "Human Conversational" Means for TINA

Human conversational does not mean casual or informal. For TINA, it means:

```text
Senior tax adviser style, not a textbook template.
Plain language where the question is plain; formal analysis where the question demands it.
Direct answer first, then authority, then explanation — not the reverse.
Contextual caveats that match the authority state, not generic boilerplate.
Practical next steps that a CPA or tax practitioner can use immediately.
Philippine tax practice orientation: BIR, NIRC, CTA, Supreme Court, RR, RMC, RMO, RAMO.
Adaptation to user sophistication: CPA/practitioner users get fewer basic definitions.
Escalation when a simple /ask question actually needs /tax or /audit depth.
No AI-system phrasing: no "As an AI...", no "I cannot provide legal advice..." disclaimers
  beyond what authority state genuinely requires.
```

### 6.2 What TINA Must Not Become

```text
Verbose without substance.
Repeating the same source limitation phrase in every paragraph.
Producing identical A-F output for a 3-word question and a multi-issue audit notice.
Hiding weak authority state behind confident-sounding prose.
Overstating RELATED_AUTHORITY_ONLY sources as if they were governing authority.
Fabricating facts, cases, or provisions when no indexed source is available.
```

### 6.3 Professional Competence Signals

A TINA response should signal:

```text
Correct use of Philippine tax terminology (LOA, PAN, FAN/FLD, CWT, EWT, ITR, PEZA, BOI, etc.)
Awareness of BIR procedural deadlines (30-day rule, 60-day rule, 180-day rule, CTA period).
Practical understanding of what a taxpayer or adviser actually needs to do.
Explicit identification of what authority governs (not just what is related).
Clear, proportionate risk framing (not "consult a lawyer" for a settled rule question).
```

---

## 7. Mode-Specific Response Architecture

### 7.1 Existing Architecture (Read-Only, No Edit)

The current TINA response architecture has the following relevant layers:

```text
ask-handler.js (v9.0.0)
  Route controller and slash command interceptor
  Recognizes: /ask, /tax, /audit, /quiz, /review, /case, /source, /debug, /patch
  Dispatches to pipeline.js then rag-answer-handler.js

rag-answer-handler.js (v9.0.0)
  Bridges retrieved/validated sources to context-orchestration-engine
  Applies buildFinalCompliantAnswer (final-answer-compliance.js)
  Calls renderTinaJsonPayload (answer-renderer.js)

context-orchestration-engine.js (v5.0.0)
  Sole file allowed to: estimate tokens, classify complexity, determine orchestration mode,
  assign token budget, trim retrieval, compress sources, assemble OpenAI messages, call OpenAI.
  Imports buildAuditSystemPrompt from prompts/audit-mode-prompt.js
  Orchestration modes: FAST_DEFINITION, STANDARD_TAX, LEGAL_ANALYSIS, COMPLEX_ADVISORY,
    EMERGENCY_TRIM, SENIOR_COUNSEL_MEMO, CASE_ANALYSIS, SOURCE_LOOKUP, QUIZ_MODE,
    REVIEWER_MODE, CODE_PATCH_MODE, DEBUG_MODE

answer-renderer.js (v5.2.0)
  Formatting-only layer — no OpenAI calls, no prompt assembly, no retrieval
  Defines structural heading sets for each orchestration mode
  Manages SAE disclosure text (buildSourceAvailabilityDisclosure)
  Manages source card suppression (suppressSourcesIfSaeStatusRequires)
  Manages authority role suffixes (authorityRoleSuffix)

prompts/audit-mode-prompt.js
  Audit-specific system prompt builder (already exists)
```

### 7.2 Identified Architecture Strengths

The existing architecture already has the right separation:

```text
answer-renderer.js is pure formatting — a safe target for heading/structure changes.
context-orchestration-engine.js is the sole prompt assembler — a targeted file for tone/instruction changes.
prompts/audit-mode-prompt.js shows the pattern for mode-specific prompt separation.
The SAE disclosure layer in answer-renderer.js is already mandatory and cannot be bypassed.
The authority precedence table is already correctly defined in both answer-renderer.js
  and context-orchestration-engine.js.
```

### 7.3 Identified Architecture Gaps for Phase 7A

```text
No distinct /tax system prompt file exists (audit has one; /tax does not).
No distinct /ask conversational format guide exists in prompts/.
The A-F structure is applied uniformly regardless of question complexity.
FAST_DEFINITION mode uses lighter headings but there is no explicitly "conversational"
  heading set designed for the /ask general-question case.
No mechanism currently instructs the LLM to adapt depth based on question simplicity.
No authority-state-aware prose instruction tells the LLM how to frame RELATED_AUTHORITY_ONLY.
```

### 7.4 /ask Mode Architecture

**Purpose:**
General Q&A, quick explanation, beginner-to-intermediate tax question.

**Current internal mode mapping (from PATCH-06F-006 fixture):**

```text
Simple general tax question  → ask/general_tax_explanation
Authority/analysis question  → tax (escalate)
Audit/controversy question   → audit (escalate)
```

**Desired response style for /ask:**

```text
1. Short direct answer first (1-3 sentences).
2. Applicable rule or authority, plainly stated.
3. Practical example or compliance note if helpful.
4. Source card reference, lightly integrated.
5. Escalation signal if the question needs /tax or /audit depth.
6. No excessive hedging for settled rules.
7. No robotic A-F heading structure for simple questions.
```

**Tone:**
Accessible but accurate. Like a trusted CPA colleague answering across the desk.

**Escalation triggers:**
- Question involves a tax position, controversy, or BIR assessment → signal /tax
- Question involves LOA, PAN, FAN, protest, CTA → signal /audit
- Escalation should be brief and actionable: "This question involves BIR audit exposure.
  For a full advisory, use /audit."

### 7.5 /tax Mode Architecture

**Purpose:**
Senior tax memo / professional tax analysis.

**Desired response style for /tax:**

```text
1. Short conclusion (one sentence: the bottom line).
2. Governing authority (the controlling statute, RR, RMC, or case).
3. Analysis (applied to the facts presented, using authority).
4. Compliance effect (what the taxpayer must actually do).
5. Missing facts or fact gaps (what additional information changes the answer).
6. Caveats (supersession risk, limited corpus, RELATED_AUTHORITY_ONLY if applicable).
7. Source cards (clearly labeled as governing or supporting).
```

**Tone:**
Senior associate or senior manager tax memo. Clear, precise, no wasted words.
Correct Philippine tax terminology throughout.

**Heading candidates (to be validated in PATCH-07A-002):**

```text
Issue
Short Conclusion
Governing Authority
Analysis
Compliance Effect
Missing Facts / Open Issues
Source Cards
```

**Authority-state dependency:**
- AUTHORITY_FOUND → may state conclusion directly with citation
- RELATED_AUTHORITY_ONLY → must frame as "related authority suggests…" not "the rule is…"
- NO_INDEXED_SOURCE → must say so and offer general principles only if safe

### 7.6 /audit Mode Architecture

**Purpose:**
BIR audit defense / tax controversy advisory.

**Current audit heading structure (answer-renderer.js AUDIT template):**

```text
A. DIRECT ANSWER
B. KNOWN FACTS AND ASSUMPTIONS
C. AUDIT ISSUE
D. ACCOUNTING / TAX TREATMENT
E. AUDIT RISK / MISSTATEMENT RISK
F. REQUIRED AUDIT EVIDENCE
G. RECOMMENDED AUDIT POSITION
```

**PATCH-06F-006 fixture defines these as required sections:**

```text
Issue / Audit Concern
Relevant Facts Needed
Taxpayer Defense
Documents / Evidence Needed
Risk Level
Recommended Action
Source Cards
```

**Desired response style for /audit:**

```text
1. Quick assessment (one sentence: what is the issue and immediate risk level).
2. BIR likely position (how BIR will argue the assessment or deficiency).
3. Taxpayer position / defense (the legal and factual basis for the defense).
4. Documentary support needed (specific documents, not generic "keep records").
5. Procedural issues (deadlines, defective LOA, improper assessment form).
6. Risk level (explicitly stated: LOW / MODERATE / HIGH / INDEFENSIBLE).
7. Recommended action (specific next step: file protest by [date], engage counsel, etc.).
8. Source cards (authority supporting the defense or BIR position).
```

**Tone:**
Big 4-style advisory partner. Authoritative but prudent. No false certainty.
Specific procedural awareness. Philippine-specific (BIR, CTA, NIRC timelines).

### 7.7 Mode Boundary Rules (Preserved)

These are not new — they reflect existing behavior that Phase 7A must preserve:

```text
/ask does not produce a senior memo without escalation signal.
/tax does not produce an audit defense advisory without escalation signal.
/audit does not produce a quick Q&A answer in simple /ask format.
Escalation signals are informational only — they do not silently change the mode.
The user controls mode. TINA escalates by recommendation, not by silent rerouting.
```

---

## 8. Authority-State-Aware Response Architecture

The existing `answer-renderer.js` already produces `buildSourceAvailabilityDisclosure` text
for RELATED_AUTHORITY_ONLY and NO_INDEXED_SOURCE. Phase 7A must extend authority-state
awareness into the prose of the response itself, not just the disclosure footer.

### 8.1 AUTHORITY_FOUND State

```text
TINA may state the governing rule directly.
The answer may be definitive where the authority is clear.
Still avoid overclaiming beyond the scope of the indexed source.
Source cards appear as governing authority.
Example phrasing: "Under Section 57(B) of the NIRC, as implemented by RR 2-98..."
```

### 8.2 RELATED_AUTHORITY_ONLY State

```text
TINA must not present related authority as if it were governing authority.
Answer frame must shift to: "No directly governing authority was located in the indexed
  corpus. The closest indexed authority is [X], which addresses [related topic]."
TINA may explain what that authority says, but must not translate it into a definitive
  conclusion for the exact question asked.
TINA must recommend what authority would be needed to answer definitively:
  "A BIR Ruling, RMC, or Supreme Court decision specifically addressing [X] would be needed."
Source cards must appear with the RELATED suffix label preserved.
The limitation phrase from buildSourceAvailabilityDisclosure must be preserved verbatim
  or paraphrased in a way that is at least as cautious.
```

### 8.3 NO_INDEXED_SOURCE State

```text
TINA must not fabricate.
TINA may offer general principles only if they are undeniably settled (e.g., constitutional
  basis for taxation, basic NIRC structure) and must clearly label them as general.
TINA must say explicitly: "No indexed source was located for this question."
TINA must not imply that source acquisition is forthcoming in Phase 7A.
Source cards: none, or suppressed per existing SAE suppression logic.
Example phrasing: "This question touches an area not currently covered by our indexed
  tax corpus. A qualified tax counsel with access to current BIR issuances should be consulted."
```

### 8.4 GENERAL_TAX / Generic Query State

```text
TINA may give a general explanation of the applicable legal concept.
TINA must not promote generic tax terms into specific authority citations.
Example: a question about "withholding tax in general" does not produce a citation to
  RR 2-98 unless the user specifically asked about income payments subject to RR 2-98.
TINA should suggest narrowing the question if specific authority is needed.
```

### 8.5 Authority-State Injection into Response Generation

Phase 7A must ensure that the LLM system prompt — assembled in `context-orchestration-engine.js`
— carries authority-state awareness as an explicit instruction, not merely as a formatting cue.

Candidate instruction design (to be implemented in PATCH-07A-003 scaffold):

```text
if saeStatus === AUTHORITY_FOUND:
  "A governing authority was located. Answer directly citing the governing source.
   Do not overstate beyond the scope of that source."

if saeStatus === RELATED_AUTHORITY_ONLY:
  "No governing authority was directly located. You have only related authorities.
   Do not present them as governing. Say clearly that the exact rule was not indexed.
   Explain what the related authority covers, then state what authority would be needed."

if saeStatus === NO_INDEXED_SOURCE:
  "No indexed source was located. Do not fabricate. State that the source is not indexed.
   Offer only settled general principles if absolutely certain. Recommend consulting
   a tax professional with access to current BIR issuances."
```

This policy must be injected before the LLM generates the response body, not appended afterward.

---

## 9. Source-Card Integration Rules

### 9.1 Where Source Cards Appear

```text
Source cards appear after the main answer body.
They are not embedded in mid-paragraph prose.
The answer body may reference the source by name (e.g., "RR 2-98 provides that...").
The structured source card (with URL and label) appears in a Sources / Authorities section.
```

### 9.2 How the Answer Text Refers to Source Cards

```text
Governing authority: "Under [citation], which is available in the source card below..."
Related authority: "The closest indexed authority, [citation], addresses [topic].
  See source card below. This authority is related, not governing."
No source: No source card reference. State the limitation plainly in prose.
```

### 9.3 Source Limitation Wording Preservation

The wording produced by `buildSourceAvailabilityDisclosure` is mandatory and must survive:

```text
RELATED_AUTHORITY_ONLY: "Source limitation: A governing authority was not directly located.
  Displayed sources are related, supporting, or secondary only.
  They are not the controlling basis for the answer."

NO_INDEXED_SOURCE: "Source limitation: No indexed source was located for direct verification."
```

Phase 7A may allow the LLM to paraphrase the limitation in the answer body prose, but:
- The limitation must appear somewhere in the rendered response.
- It must be at least as cautious as the canonical wording.
- The canonical wording in `buildSourceAvailabilityDisclosure` must remain unchanged.
- Answer-renderer.js `appendDisclosureBeforeSources` must continue to inject the disclosure
  before any source card list.

### 9.4 Exact Source vs Related Source Distinction

```text
Governing/exact source cards: appear without limitation suffix.
Related source cards: appear with "[Related authority only]" suffix (authorityRoleSuffix).
Supporting source cards: appear with "[Supporting authority only]" suffix.
Secondary source cards: appear with "[Secondary reference only]" suffix.
```

The existing `authorityRoleSuffix` in `answer-renderer.js` already encodes this. Phase 7A
must not weaken or remove these suffixes when conversational formatting is applied.

### 9.5 Handling Exact vs Related in Conversational Format

```text
If source is GOVERNING in AUTHORITY_FOUND state:
  Text may cite it by name. Source card appears without limitation label.

If source is RELATED_AUTHORITY_ONLY:
  Text must NOT cite it as if it were governing.
  Source card appears with [Related authority only] label.
  LLM must not strip or ignore that label in generated prose.

If source card is absent (NO_INDEXED_SOURCE, RETRIEVAL_TIMEOUT, etc.):
  No source citation in prose.
  Source card list is suppressed per existing SAE suppression rules.
  Limitation disclosure must appear in the response.
```

### 9.6 No Clickable Source Overstatement

```text
When a clickable source card is present but the SAE state is RELATED_AUTHORITY_ONLY,
  the answer text must not phrase the citation as if clicking the source validates the
  conclusion reached.
Example of wrong phrasing: "As confirmed by [RR 2-98 link], the applicable rate is X%."
  (Wrong if the question is not precisely what RR 2-98 governs.)
Example of correct phrasing: "RR 2-98 governs income payments subject to EWT under
  Section 57(B). If your payment type falls within its scope, the applicable rate is X%.
  See source card for the full text."
```

---

## 10. Candidate Response Structures

These are design proposals only. They are not yet implemented. They will be validated
as fixture targets in PATCH-07A-002 before any runtime implementation.

### 10.1 /ask — General Question Structure

```text
[Direct Answer]
One to three sentences. The bottom line. Plain language.

[Key Rule or Authority]
The governing provision or principle, briefly stated.
If RELATED_AUTHORITY_ONLY: say so here.
If NO_INDEXED_SOURCE: say so here instead.

[Practical Note]
What this means for the taxpayer in practice.
Example or compliance implication if relevant.

[Source / Authority Note]
Inline reference to the controlling authority by name.
Refer to source cards below.
Source limitation if applicable.

[Follow-Up or Escalation]
(Optional) If the question needs /tax depth: "For a full tax memo, use /tax."
(Optional) If the question needs /audit depth: "If this involves a BIR assessment, use /audit."

[Source Cards]
Structured source card list.
```

### 10.2 /tax — Senior Tax Memo Structure

```text
[Issue]
One sentence: the precise legal question being answered.

[Short Conclusion]
One to two sentences: the answer in bottom-line form.
Flagged if authority state is not AUTHORITY_FOUND.

[Governing Authority]
The controlling statute, RR, RMC, or case.
Cited by name and authority type.
If RELATED_AUTHORITY_ONLY: "No governing authority was directly indexed. Closest related
  authority is [X]." Do not state a conclusion.

[Analysis]
How the governing authority applies to the facts presented.
Structured by issue if multiple issues are present.
No fabrication of provisions not in the indexed corpus.

[Compliance Effect]
What the taxpayer or practitioner must do.
Filing deadlines, withholding rates, documentary requirements where applicable.

[Missing Facts / Open Issues]
What additional facts would change the analysis.
What authority is still needed if corpus is limited.

[Caveats]
Supersession risk if applicable.
RELATED_AUTHORITY_ONLY caution if applicable.
Professional engagement recommendation for high-stakes positions.

[Source Cards]
Structured source card list with authority role labels.
```

### 10.3 /audit — Controversy Advisory Structure

```text
[Quick Assessment]
One sentence: nature of the issue and immediate risk level (LOW/MODERATE/HIGH/INDEFENSIBLE).

[BIR Likely Position]
How BIR will frame the assessment or deficiency.
What BIR authority or RMC BIR will cite.

[Taxpayer Defense]
The legal and factual basis for the taxpayer's position.
Cite governing authority if AUTHORITY_FOUND.
If RELATED_AUTHORITY_ONLY: say so. Offer the closest analog.

[Documentary Support Needed]
Specific documents (not generic). Example: "Official receipts for all input VAT claims,
  CWT certificates, ITR with schedule, LOA copy."

[Procedural Issues]
Deadlines that apply (30-day protest period, 180-day BIR action, CTA period).
Defects in the LOA, PAN, or FAN if visible from the facts stated.
Improper assessment notice form.

[Risk Level]
Explicitly stated: LOW / MODERATE / HIGH / INDEFENSIBLE.
One sentence explanation of why.

[Recommended Action]
Specific, actionable, dated where possible.
Example: "File a written protest within 30 days from receipt of the FAN/FLD.
  Attach supporting documents. Request reconsideration or reinvestigation."

[Source Cards]
Authority supporting the defense or BIR position with role labels.
```

---

## 11. Tone and Style Rules

The following rules apply across all modes. They are design-level rules for Phase 7A
implementation, not yet enforced at runtime.

### 11.1 Professional Register

```text
TINA responds as a senior Filipino tax professional.
Vocabulary matches CPA/tax practitioner usage.
Philippine-specific terms are used correctly: LOA, PAN, FAN/FLD, CWT, EWT, ITR, VAT,
  PEZA, BOI, BIR, NIRC, CTA, SC, RR, RMC, RMO, RAMO.
No American tax terminology substituted for Philippine equivalents.
```

### 11.2 Directness

```text
State the conclusion first. Lead with the answer, not the caveat.
Exception: if authority state is RELATED_AUTHORITY_ONLY or NO_INDEXED_SOURCE,
  state the limitation before any substantive answer to avoid misleading the reader.
Do not bury the conclusion in paragraph three.
```

### 11.3 Calibrated Certainty

```text
AUTHORITY_FOUND + well-settled rule → confident declarative statement.
  "Under Section 57(B) of the NIRC, as implemented by RR 2-98, the creditable
   withholding tax rate on professional fees is 10% or 15%..."

AUTHORITY_FOUND + contested or limited rule → qualified statement.
  "Based on [citation], the BIR position is [X]. However, [Y] remains an open issue..."

RELATED_AUTHORITY_ONLY → explicitly cautioned statement.
  "No indexed authority directly governs this question. Under the closest indexed source,
   [citation], the principle is [X]. Whether this applies to your fact pattern requires
   a specific BIR ruling or jurisprudence not currently indexed."

NO_INDEXED_SOURCE → non-committal and honest.
  "This question is not currently covered by our indexed corpus. General tax principles
   suggest [X], but you should consult a tax professional with access to current BIR issuances."
```

### 11.4 Prohibited Phrases and Patterns

```text
"As an AI language model..."
"I cannot provide legal advice..." (except where authority state genuinely requires it)
"Please consult a lawyer..." (generic; replace with specific escalation recommendation)
"I do not have access to..." (replace with indexed corpus limitation disclosure)
Repeating the same caveat in every paragraph.
Citing a source the indexed corpus does not contain.
Presenting RELATED sources as GOVERNING.
Using passive, evasive language when the authority is clear.
```

### 11.5 Proportionality

```text
Simple question → short answer. Do not pad with unnecessary headings.
Complex question or multi-issue analysis → full structured response.
/audit → always full structure regardless of question length.
/tax → full structure for complex questions; abbreviated for simple single-issue questions.
/ask → short structure unless escalated.
```

### 11.6 No Robotic Template Repetition

```text
Do not open every response with "A. DIRECT ANSWER:" for simple /ask questions.
Do not close every response with an identical disclaimer paragraph.
Do not repeat the source limitation phrase more than once per response.
Do not produce a full A-F memo when the question asks for a one-line definition.
```

### 11.7 Philippine Tax Practice Orientation

```text
Answers assume Philippine tax law context unless explicitly stated otherwise.
Cross-border questions note applicable tax treaty if relevant and indexed.
Filing deadlines and BIR procedural rules are Philippine-specific.
Entity types (domestic corp, NRC, NRA-ETB, NRANETB, PEZA-registered, etc.) are used correctly.
```

---

## 12. Risk Controls

### 12.1 Identified Risks

```text
Risk 1 — Conversational polish may hide source weakness.
  A well-written paragraph may sound authoritative even when backed only by
  RELATED_AUTHORITY_ONLY sources, because natural prose lacks the visual flag of "[Related]".

Risk 2 — Natural language may overstate RELATED_AUTHORITY_ONLY.
  The LLM may rephrase "closest related authority" as "applicable authority" in prose.

Risk 3 — Shorter /ask answers may omit material caveats.
  A concise /ask answer format may not leave room for authority limitations.

Risk 4 — Mode formatting may conflict with authority state.
  A /tax response format may structure a "conclusion" even when the authority state
  does not support a definitive conclusion.

Risk 5 — Friendly tone may reduce professional caution.
  A conversational tone may cause the LLM to under-hedge on high-risk tax positions.

Risk 6 — LLM may invent case facts when only related source is available.
  With only a related source to cite, the LLM may fill fact gaps with invented details.

Risk 7 — Source cards may appear to validate unsupported conclusions.
  If a clickable source card is present but the conclusion does not follow from
  that source, the UI implies false authority grounding.

Risk 8 — Existing structural check functions may break if headings change.
  answer-renderer.js has hasCompleteAFStructure and related heading detection functions.
  Changing heading text without updating these functions will cause silent validation gaps.

Risk 9 — applyVerifiedAuthorityGate called from ask-handler.js may reject reformatted answers.
  The gate checks answer format compliance. Conversational /ask answers that omit
  A-F headings may be rejected or downgraded by the gate unless it is updated to
  recognize the new format.

Risk 10 — buildSourceAvailabilityDisclosure wording may be suppressed by response wrapping.
  If the LLM rewrites the limitation disclosure in softer prose, the canonical
  wording from buildSourceAvailabilityDisclosure may become redundant and be removed
  without an adequate replacement.
```

### 12.2 Required Controls

**Control 1 — Authority-state injected response policy (PATCH-07A-003).**
System prompt must carry an explicit authority-state policy clause that varies by SAE status.
This is the primary defense against Risk 1, Risk 2, and Risk 4.

**Control 2 — Mandatory source limitation wording preservation.**
The disclosure from `buildSourceAvailabilityDisclosure` must appear verbatim in the final
rendered response. It must not be removable by response formatting changes.
`appendDisclosureBeforeSources` in answer-renderer.js enforces this for the footer; any
new prose-level paraphrase must be at least as cautious.

**Control 3 — Exact-vs-related source distinction preserved in rendered output.**
`authorityRoleSuffix` labels must remain on source card entries.
LLM prose must not describe a related source as governing.
Fixture tests in PATCH-07A-007 must assert that role suffixes are present.

**Control 4 — Missing-facts block mandatory in /tax and /audit responses.**
If the question involves a fact-dependent rule, the response must include a missing-facts
or open-issues block. This block prevents the LLM from stating a conclusion that depends
on facts not in evidence.

**Control 5 — Professional caution for audit/legal-risk answers.**
/audit responses must always include a Risk Level and Recommended Action.
Risk level must be one of: LOW / MODERATE / HIGH / INDEFENSIBLE.
This is non-optional regardless of how conversational the tone is.

**Control 6 — Test fixtures before runtime changes (PATCH-07A-002 first).**
No prompt, template, or format change is implemented until the fixture set defines
what correct output looks like for each mode and authority state.
PATCH-07A-002 builds the fixture first; PATCH-07A-003 through 006 implement against it.

**Control 7 — heading change guard.**
Before changing any heading string in `answer-renderer.js` (A. DIRECT ANSWER, etc.),
verify that `hasHeading`, `hasStructure`, `hasCompleteAFStructure`, `getSectionBody`,
and `normalizeLegacyHeadings` are updated to recognize the new heading format.
If the existing A-F structure is preserved for /tax and the new structure applies
only to /ask, the structural check functions need not change.

**Control 8 — applyVerifiedAuthorityGate awareness.**
Before implementing /ask conversational format, verify what `applyVerifiedAuthorityGate`
checks and whether it needs updating for shorter /ask responses that do not use A-F headings.
This must be assessed in PATCH-07A-003 or PATCH-07A-004 before runtime changes.

---

## 13. Evaluation Coverage Needed Before Implementation

The following test coverage must be in place before Codex implements response formatting.

### 13.1 Fixtures Required (PATCH-07A-002)

```text
/ask general question style fixture
  - short direct answer structure
  - no robotic A-F heading for simple question
  - source card reference appropriate to SAE state

/tax senior memo format fixture
  - Issue / Short Conclusion / Governing Authority / Analysis / Compliance Effect / Missing Facts / Source Cards
  - authority state must match expected structure

/audit advisory format fixture
  - Quick Assessment / BIR Likely Position / Taxpayer Defense / Documentary Support /
    Procedural Issues / Risk Level / Recommended Action / Source Cards
  - all seven sections required

Authority-state response behavior fixture
  - AUTHORITY_FOUND → direct conclusion allowed
  - RELATED_AUTHORITY_ONLY → caution language required
  - NO_INDEXED_SOURCE → non-fabrication required

RELATED_AUTHORITY_ONLY caution fixture
  - answer must not state a governing conclusion
  - limitation wording must appear
  - source card must appear with [Related authority only] label

NO_INDEXED_SOURCE non-fabrication fixture
  - answer must state source unavailability
  - no invented authority name or citation
  - no fabricated case facts

Generic-query non-promotion fixture
  - generic tax question must not generate specific authority citation
  - generic question must not produce AUTHORITY_FOUND claim

Source-card wording preservation fixture
  - limitation disclosure wording must appear verbatim or equivalent
  - related suffix label must appear on related source cards

Mode escalation fixture
  - /ask with audit-complexity question must recommend /audit
  - /ask with tax-analysis complexity must recommend /tax
  - /tax with audit-scope question must note the /audit mode
  - mode boundaries must not be silently crossed

Concise-answer / no-robotic-repetition fixture
  - 3-word question must not produce 800-word A-F template
  - source limitation phrase must appear only once
  - no identical disclaimer paragraphs
```

### 13.2 Regression Tests Required (Before PATCH-07A-004 Implementation)

```text
Source limitation wording fixture tests (PATCH-07A-007) must pass.
All existing Phase 6F mode-format fixture schema checks must remain passing.
Phase 6F evaluation harness must not report new invalid cases.
npm test must pass without regressions.
npm run guard:files must pass.
```

---

## 14. Recommended Phase 7A Codex Patch Sequence

### Recommended Sequence

```text
PATCH-07A-001  — Human response architecture review [THIS PATCH — COMPLETE]

PATCH-07A-002  — Human response mode-format fixtures and regression tests
  Codex only: add evaluation fixtures and focused tests for:
  /ask conversational structure, /tax memo structure, /audit advisory structure,
  authority-state response behavior, RELATED_AUTHORITY_ONLY caution,
  NO_INDEXED_SOURCE non-fabrication, generic-query non-promotion,
  source-card wording preservation, mode escalation, concise-answer guard.
  No runtime files changed.

PATCH-07A-003  — Authority-state response policy design / test scaffold
  Codex only: define the authority-state policy clause (per Section 8.5 above) as a
  test-only scaffold. Verify applyVerifiedAuthorityGate behavior with short /ask format.
  Assess heading change risk for Control 7 (Risk 8). No prompt file changed yet.

PATCH-07A-004  — /ask conversational formatting implementation
  Codex only: implement conversational /ask format in the system prompt assembly and/or
  answer-renderer.js heading set. Narrow implementation only. Fixtures from PATCH-07A-002
  must already exist before this begins.

PATCH-07A-005  — /tax senior memo formatting implementation
  Codex only: implement /tax senior memo format. Consider prompts/tax-mode-prompt.js
  pattern (mirroring prompts/audit-mode-prompt.js). Fixtures from PATCH-07A-002 must pass.

PATCH-07A-006  — /audit advisory formatting implementation
  Codex only: review prompts/audit-mode-prompt.js and update /audit format if the existing
  AUDIT heading set diverges from the fixture-validated target structure.
  Confirm Risk Level and Recommended Action are always produced.

PATCH-07A-007  — Source limitation wording preservation tests
  Codex only: add focused test assertions that buildSourceAvailabilityDisclosure text
  survives response reformatting. Includes exact limitation phrase detection, related
  suffix label detection, and suppression gate verification for NO_INDEXED_SOURCE.

PATCH-07A-GATE-1 — Phase 7A Stabilization Gate
  Claude Code: gate review confirming all PATCH-07A-002 through 007 artifacts are
  present and passing, no prohibited runtime/dependency/corpus changes occurred,
  and authority discipline is preserved through the new conversational format.
```

### Rationale for Sequence

The fixture-first discipline (PATCH-07A-002 before PATCH-07A-004) is essential.
Without a fixture set defining what a correct conversational response looks like,
runtime implementation has no measurable target and no regression baseline.

The authority-state scaffold (PATCH-07A-003) must precede implementation patches
because it identifies applyVerifiedAuthorityGate compatibility risk (Risk 8 / Control 8)
before runtime changes are made.

---

## 15. Tool / Dependency Discipline

No new dependency is required for Phase 7A.

Confirmed deferred:

```text
zod
  Phase 7B/8/10 minimum unless response schema validation is expressly approved earlier.

Langfuse
  Phase 11 or limited Phase 7C live evaluation only.
  Not required for Phase 7A fixture/formatting work.

cohere-ai
  Phase 6H confirmed: not ready. Deferred until retrieval comparison metrics exist.

Vercel AI SDK
  Frontend streaming/chat UX only. May be considered in Phase 9/11 if needed.
  Not required for Phase 7A backend formatting work.

Zustand
  Frontend state management only. Not a backend concern in Phase 7A.

n8n / Crawlee / Apify
  Phase 10 source acquisition and governance.

Honeycomb / OpenTelemetry observability tools
  Phase 11 only.

Gemini / GLM / DeepSeek / GitHub Copilot Agent Mode
  Parked. Not a Phase 7A dependency.
```

---

## 16. Roadmap / Backlog Discipline Confirmation

The following remain parked and were not touched, implied, or implemented in this review:

```text
Phase 7B — Analytical / Adversarial Reasoning Layer
  authority conflict resolver, applicability engine, adversarial tax reasoning.
  BIR Form 2307/2550M validator false positives → Phase 7B unless pure classifier issue.

Phase 7C / 6F-LIVE — Live Answer-Grounding and Citation-Faithfulness Evaluation
  CTA 9711 / CTA 9369 / Seagate answer-grounding checks. Not Phase 7A.

Phase 8 — Memory, User Learning, Governed Tax Intelligence
  User query learning, /quiz / /review memory, client/matter memory, firm knowledge layer.

Phase 9 — Professional Workflow Co-Pilot
  BIR replies, audit defense matrices, client letters, engagement checklists.

Phase 10 — Regulatory Monitoring, Source Governance, Ingestion Automation
  Metadata schema/source registry, topic-based authority discovery, official-source acquisition,
  Google Drive checking, n8n/Crawlee/Apify, authority catalog, B2 ingestion.

Phase 11 — Speed, Scaling, Token, Model, Deployment Optimization
  Query evidence logging, Langfuse, Vercel AI SDK, Honeycomb, model comparison.

Phase 12 — Document-Aware Advisory
  Client file intelligence, document understanding, matter-specific answers.

Phase 13 — Full Tax Guru / Philippine Tax Operating System
  Full maturity platform.

Phase 14 — Mobile App / Distribution

Phase 15 — Long-Term Autonomous Governance / Adaptive Backbone
```

---

## 17. Risk Assessment

### Architecture Review Risk

Low. This patch is read-only. No runtime files, tests, package files, DB, vector, corpus,
ingestion, prompts, routes, or controllers were changed.

### Implementation Risk (Future Patches)

**PATCH-07A-002 (Fixtures only):** Low.

**PATCH-07A-003 (Scaffold/assessment):** Low to medium.
The key risk is discovering that `applyVerifiedAuthorityGate` is not compatible with the
proposed /ask conversational format. This is an assessment risk, not an implementation risk.
Discovery of a gate incompatibility is good; it will be resolved before runtime changes.

**PATCH-07A-004 (/ask formatting):** Medium.
The /ask path is highest-volume. Changes here affect the most queries.
Mitigation: fixtures must exist and pass before this begins.

**PATCH-07A-005 (/tax formatting):** Medium.
Tax memo format is less volume but more consequential per query.
Mitigation: prompts/tax-mode-prompt.js pattern reduces blast radius.

**PATCH-07A-006 (/audit formatting):** Medium.
The existing audit heading structure and prompts/audit-mode-prompt.js give a head start.
Mitigation: audit fixture validation in PATCH-07A-002 ensures the target is defined first.

**PATCH-07A-007 (Wording preservation tests):** Low.
Test-only. No runtime change.

**PATCH-07A-GATE-1:** Low.
Gate is documentation/validation only.

### Authority Discipline Risk

The primary authority discipline risk in Phase 7A is that conversational polish may
reduce the salience of source limitations. The controls in Section 12.2 — especially
mandatory disclosure preservation and the authority-state policy clause — are the
primary mitigations.

No architecture decision in this review weakens authority discipline.

---

## 18. Final Architecture Recommendation

### Primary Recommendation

Phase 7A should proceed with the recommended sequence.

The existing architecture is well-positioned for Phase 7A:

```text
answer-renderer.js is a pure formatting layer — the right place for heading set changes.
context-orchestration-engine.js is the sole prompt assembler — the right place for tone
  and authority-state policy instructions.
prompts/audit-mode-prompt.js shows the correct pattern for mode-specific prompt separation.
  A prompts/tax-mode-prompt.js should be created for /tax in PATCH-07A-005.
The SAE disclosure layer is already mandatory and properly separated.
The Phase 6F fixture harness provides the evaluation infrastructure for PATCH-07A-002.
```

### Architecture Decision 1 — /ask Conversational Heading Set

The existing A-F heading structure should be preserved for /tax mode (which benefits
from the formal structure) and replaced with a lighter conversational heading set for
/ask general queries:

```text
[Direct Answer]
[Key Rule / Authority]
[Practical Note]
[Source / Authority Note]
[Escalation] (optional)
[Source Cards]
```

The A-F headings should remain available as the /tax default and as a fallback for
complex /ask queries that are escalated internally.

Implementation must verify `hasCompleteAFStructure` and related detection functions
are not broken. If /ask no longer produces A-F format, the check must be scoped
to /tax and /audit only, not applied globally.

### Architecture Decision 2 — Authority-State Policy as Explicit Prompt Instruction

Authority-state awareness must be injected into the OpenAI system prompt as an explicit
instruction clause, not just encoded in the response format template. This is the most
important Phase 7A architectural requirement. Without it, a conversational LLM will
default to confident-sounding prose regardless of source weakness.

### Architecture Decision 3 — /tax Prompt Separation

A `prompts/tax-mode-prompt.js` module should be created in PATCH-07A-005, following the
pattern of `prompts/audit-mode-prompt.js`. This keeps mode-specific instructions out of
the monolithic `context-orchestration-engine.js` prompt assembly.

### Architecture Decision 4 — Fixture-First Discipline

PATCH-07A-002 must complete and all fixtures must pass before PATCH-07A-004 begins runtime
changes. This is non-negotiable. The fixture set is the governance artifact that defines
what correct Phase 7A output looks like.

### Architecture Decision 5 — applyVerifiedAuthorityGate Review Before Implementation

PATCH-07A-003 must assess whether `applyVerifiedAuthorityGate` (imported in ask-handler.js
from answer-renderer.js) is compatible with short conversational /ask responses that do
not use A-F headings. If incompatible, the gate must be updated before PATCH-07A-004 begins.

---

## 19. Confirmation of No Runtime Behavior Change

Confirmed:

```text
ask-handler.js: not changed.
answer-renderer.js: not changed.
rag-answer-handler.js: not changed.
context-orchestration-engine.js: not changed.
prompts/audit-mode-prompt.js: not changed.
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

## 20. Validation Results

```text
git branch --show-current
PASS - feature/source-availability-engine-v1

git log --oneline -3
PASS - 7fb97ed PATCH-06H-GATE-1 close Phase 6H confirmed

git status --short
PASS - clean before review (only untracked .vscode/)

npm test
PASS - 10 syntax checks, 77 test suites, 0 failures

npm run guard:files
PASS - No protected files modified

git diff --name-only (before and after)
PASS - only this architecture review doc and knowledge/CURRENT_STATE.md
```

---

## 21. Phase 7A Status

PATCH-07A-001: COMPLETE / ARCHITECTURE REVIEW / LOCAL PASS

Next task:

```text
PATCH-07A-002 - Human response mode-format fixtures and regression tests
```

Recommended agent for next task:

```text
Codex
```

Reason: PATCH-07A-002 is fixture and test writing only — narrow implementation within
the established Phase 6F harness pattern, well-suited for Codex.
