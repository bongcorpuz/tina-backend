# PATCH-08A-MEMORY-GOVERNANCE-DESIGN-1 - Memory Governance and User Learning Design

## 1. Patch Name

PATCH-08A-MEMORY-GOVERNANCE-DESIGN-1 - Phase 8 Memory Governance and User
Learning Design

Design-only. No runtime memory implemented, no database tables created, no
pipeline behavior changed, no dependencies added, no flags enabled.

Base commit: `6c59576 PATCH-07B-PHASE-7-FINAL-CLOSURE-GATE-1 close Phase 7`.

## 2. Purpose

Define, governance-first, how TINA should eventually support memory, user
learning, case/matter continuity, client-specific facts, and professional
working notes without violating privacy, confidentiality, source discipline,
tax/legal safety, or governance boundaries.

Core design principle (binding on all later Phase 8 patches):

- Memory may inform context, preferences, and known user/client facts.
- Memory must not replace legal/tax authority, source cards, retrieval, or
  evidence.
- Memory must never fabricate legal conclusions.
- Memory must not let TINA answer source-governed questions from memory alone
  when authority is required.

## 3. Phase 8 Scope

Phase 8 - Memory, User Learning & Governed Tax Intelligence - includes:

- User identity recognition (who is asking, in what professional role).
- User preferences (response style, format, language of analysis).
- Professional role/context (CPA, firm context, engagement style).
- Client/matter continuity (resume a matter without re-establishing facts).
- Known client facts (registration type, periods, entity type).
- Recurring working assumptions (per matter, user-approved).
- Prior clarification answers (so the same gate questions are not re-asked).
- Reusable document request preferences.
- User-approved persistent notes (professional working notes).
- Temporary session facts (used, then discarded unless approved).

## 4. Explicit Exclusions

Phase 8 must not become and must not include:

- Phase 7B pre-production-ON follow-up:
  PATCH-07B-CLARIFICATION-BOUNDARY-TUNING-1 (remains a Phase 7B item; not
  memory work).
- Phase 10: official source repository governance, court case metadata
  registry, G.R. number lookup, jurisprudence applicability / currentness /
  supersession, hallucination trap evaluation, legal-state validation,
  HAL-TEST.xlsx items, tax law updating, source freshness.
- Phase 11: observability, query evidence logging, cost/latency/error
  tracing, cache headers, backend/response compression, CDN/static caching,
  API response caching, vector/search performance optimization.
- Phase 12: document-aware advisory, uploaded client document intelligence,
  working-paper extraction.
- Phase 14: mobile app (after Phase 13 only).
- Any production enablement of TINA_ENABLE_CLARIFICATION_ROUTE_GATE.

## 5. Memory Taxonomy

Seven memory classes. Every stored item must carry exactly one class.

A. User profile memory - who the user is professionally.
   Examples: user is a CPA; firm context; recurring professional
   preferences; user manages TINA governance.
   Default permission: user-profile (section 6). Durable.

B. User preference memory - how the user wants TINA to respond.
   Examples: concise but powerful letters; Philippine-law based analysis;
   strict continuity in TINA development workflow.
   Default permission: user-profile. Durable, low sensitivity.

C. Matter memory - facts and state of a specific engagement or workstream.
   Examples: a specific BIR LOA matter; a condo corporation matter; WTE
   Bolinao matter; TINA development patch state.
   Default permission: matter-scoped. Durable within the matter only.

D. Client/entity memory - facts about a specific client or entity.
   Examples: client name; tax registration facts (VAT-registered,
   non-VAT); relevant taxable periods; known documents; recurring issues.
   Default permission: client-scoped, explicit consent required for
   sensitive facts. Durable within the client scope only.

E. Temporary session facts - supplied during one conversation.
   Examples: facts given for a single computation; draft-specific
   assumptions; facts not yet approved for storage.
   Default permission: session-only. Discarded at session end unless the
   user approves promotion to C or D.

F. Source-derived memory - facts about TINA's own indexed sources.
   Examples: file/document metadata already indexed; authority availability
   facts; source-card provenance notes.
   Default permission: system-governance memory. Not user-personal; never a
   substitute for live retrieval; must always defer to the current index
   state and sourceAvailability classification at answer time.

G. Prohibited or sensitive memory - must not be stored (or only with
   explicit, logged consent where legally necessary).
   Prohibited outright: passwords/secrets/API keys; private credentials;
   unsupported legal conclusions; unsupported accusations; raw confidential
   documents without storage approval.
   Sensitive (explicit consent + necessity required): health/personal data;
   personal data unrelated to the professional service; any data whose
   storage would create privilege or confidentiality risk.

## 6. Permission Levels

| Level | Meaning | Retention concept | Allowed use | Prohibited use | Example |
|---|---|---|---|---|---|
| no-store | Item must not be written at all | None | Use in the current response only | Any persistence, any log echo of the value | An API key pasted by mistake |
| session-only | Kept only for the active conversation | Expires with session | Contextual continuity within the session | Persistence, cross-session recall | "Assume 8% option for this computation" |
| matter-scoped | Attached to one matter/case | Until matter archived | Answers within that matter | Use in other matters/clients; use as general law | "This LOA covers TY 2023" |
| client-scoped | Attached to one client/entity | Until client relationship ended/erased | Answers about that client | Cross-client use; generalization into tax law | "Client X is VAT-registered" |
| user-profile | Attached to the user | Until user edits/deletes | Style, role, workflow continuity | Treating preferences as facts about clients | "User is a CPA; prefers concise memos" |
| system-governance | TINA development/governance continuity | Durable, auditable | Patch state, governance continuity | Storing user/client personal data under this label | "Phase 7 closed at commit 6c59576" |
| explicit-consent | May be stored only after an affirmative user approval recorded with the item | Per approval | As approved | Storage without a logged consent event | Sensitive client fact volunteered mid-conversation |
| prohibited | Must never be stored | None | None | Everything | Passwords, secrets, unsupported legal conclusions |

Rules:

- Every write carries exactly one permission level; unlabeled writes are
  rejected by policy.
- explicit-consent composes with a scope (e.g. explicit-consent +
  client-scoped); prohibited overrides everything.
- Downgrade (e.g. client-scoped -> session-only) is always allowed; upgrade
  requires a new consent event.

## 7. Consent Model

When TINA must ask before saving:

| Trigger | Consent behavior |
|---|---|
| User explicitly says "remember this" | Save; confirm scope in one sentence |
| Useful long-term professional context appears implicitly | Suggest saving; do not save until approved |
| Sensitive/confidential client fact | Always ask; require explicit approval; record consent event |
| Matter fact stated during work | Ask once per matter session: save to matter or session-only |
| User corrects TINA's understanding | Offer to update the stored item; show old vs new |
| User asks to forget | Delete without argument; confirm deletion; log the event |

Recommended UX wording (backend-provided prompt strings, frontend renders):

- Scope question: "Do you want TINA to remember this for this client/matter
  only, or just use it for this conversation?"
- Sensitive fact: "This looks like a confidential client fact. Should TINA
  store it under [client/matter], keep it for this conversation only, or not
  record it at all?"
- Correction: "TINA previously noted: [old]. Replace it with: [new]?"
- Forget confirmation: "Deleted. TINA will no longer use this fact."

Consent events are themselves stored (memory_events, section 16) with
timestamp, scope, and the user's choice.

## 8. Scoping Model

Scopes, narrowest wins:

1. session scope - active conversation only.
2. matter/case scope - one engagement/workstream.
3. client scope - one client/entity, spanning its matters.
4. firm/workspace scope - FUTURE ONLY; not designed for implementation in
   Phase 8 beyond reserving the concept.
5. global user scope - the user's own profile/preferences.
6. source/document scope - metadata bound to an indexed source.

Anti-contamination rules (mandatory, test-enforced in Phase 8B+):

- Matter facts must not leak into unrelated clients or unrelated tax
  opinions.
- Client facts must not become general tax law: a stored client fact can
  never be cited as legal authority or generalized beyond that client.
- Prior user assumptions must not override current user facts: a fact stated
  in the live conversation always outranks stored memory; on conflict, the
  stored item is marked contradicted and clarification is triggered.
- Reads are scope-filtered by the active matter/client resolution; a query
  with no resolved matter/client reads only user-profile and
  system-governance items.
- No cross-user reads, ever.

## 9. Use-in-Answer Policy

Memory is inserted as context constraints, never as authority.

Memory can contribute statements of the form:

- "User previously said this client is VAT-registered."
- "Matter notes indicate 2024 taxable year."
- "User prefers short management-facing comments."

Memory can never contribute:

- "Therefore the law is X" without source authority.
- "This case is current" without Phase 10 validation (deferred).
- "This BIR rule applies" without retrieval/authority confirmation.

Interaction with existing engines (all future integration, design only):

- Issue classification: memory may supply entity type/period as context
  hints; it must not change the classified legal issue or target
  authorities.
- Source availability (SAE): memory has zero influence; AUTHORITY_FOUND /
  NO_INDEXED_SOURCE / RELATED_AUTHORITY_ONLY are computed from retrieval
  exactly as today. Memory must not bypass sourceAvailability or authority
  gates, and must not promote or suppress source cards (Authority Lock).
- Clarification helper: memory may pre-fill known facts so the boundary
  policy sees them as provided (section 10); it must not flip
  answerAllowed on its own or suppress source-coverage limitations.
- Phase 7A answer formatting: preference memory may select tone/format
  within approved formats; it must not remove required sections, source
  limitation wording, or disclosures.
- Source cards: untouched by memory; memory never adds, removes, reorders,
  or reworded source cards.
- Audit-risk language helper: memory context must not weaken required
  cautious language.
- Phase 10 deferral: memory must not claim source currentness or case
  status; Phase 10 deferral disclosures continue to apply unchanged.

## 10. Clarification Reduction Policy

Goal: stop re-asking facts the user already established, without weakening
the gate.

If active matter memory contains user-confirmed facts, e.g.:

- client is VAT-registered
- taxable year is 2024
- taxpayer is a domestic corporation

then those facts may be passed to the clarification boundary as
already-provided facts, so the gate does not re-ask them.

TINA must still ask when:

- stored facts conflict with the live conversation;
- the matter scope is unclear or no matter is active;
- the user changes facts;
- the question is source/legal-governed and requires authority regardless of
  facts (memory never substitutes for authority);
- the tax period matters and the stored fact is stale (section 11) —
  period-sensitive facts must be re-confirmed when the stored period no
  longer matches the current date context.

Note: this policy composes with, but is separate from, the deferred Phase 7B
boundary tuning. Memory reduces repeated fact questions; the boundary tuning
(definitional/authority-lookup exemption) remains a Phase 7B follow-up and
must not be smuggled in as memory work.

## 11. Memory Confidence and Freshness Policy

Confidence states (every item carries one):

- user-confirmed - stated or approved explicitly by the user.
- inferred - deduced by TINA; must be labeled and is never sufficient alone
  to skip a clarification question.
- source-derived - from TINA's own index metadata; defers to live index
  state.
- stale - past its freshness horizon (e.g. period-bound facts after the
  period ends); usable only with re-confirmation.
- contradicted - conflicts with newer input; excluded from answers until
  resolved; triggers clarification.
- unverified - supplied by a third channel, not yet confirmed; treated like
  inferred.
- revoked - user deleted/withdrew; must not be used; retained only as a
  deletion audit event without the value where feasible.

Freshness display rule: when memory materially shapes an answer, disclose it
in-line and invite correction, e.g.:

"Using prior matter context: client was described as VAT-registered. Please
confirm if this changed."

High-risk contexts (assessments, protest posture, deadline-sensitive advice)
must always surface the memory summary being relied on (section 12).

## 12. Confidentiality and Professional-Risk Controls

Designed for a CPA / tax advisory context:

- Client confidentiality: client-scoped and matter-scoped items are
  retrievable only within their scope; no cross-client contamination
  (test-enforced).
- No automatic storage of sensitive client facts: explicit consent required
  (section 7).
- No storage of raw credentials/secrets: prohibited class; write policy
  rejects and does not echo values.
- Audit trail: every write, read-use-in-answer (high-risk contexts), edit,
  and deletion is an event with timestamp and scope.
- View/edit/delete: the user can list stored memory by scope, correct items,
  and delete items or whole matters.
- Matter-scoped storage for professional engagements: engagement facts
  default to matter scope, not client or global scope.
- User-visible memory summaries before use in high-risk contexts: before a
  memory-informed high-risk answer, TINA states which stored facts it is
  using so the professional can catch stale/wrong context.
- Privilege posture: TINA does not assert or waive privilege; storage of
  potentially privileged content requires explicit consent and is labeled
  sensitive.

## 13. Memory Write Policy

Allowed writes:

- User explicitly says "remember".
- User confirms a client/matter fact should be retained.
- User corrects TINA's understanding (update event).
- User approves a matter summary for storage.
- System records TINA development continuity state (system-governance).

Restricted writes (explicit consent + labeling required):

- Facts extracted from uploaded confidential documents (note: document
  intelligence itself is Phase 12; only user-stated facts about documents
  are in Phase 8 scope).
- Tax conclusions and legal conclusions: storable only as user working
  notes, labeled as the user's position, never as TINA-verified law.
- Health/personal/sensitive facts: only if necessary to the service and
  explicitly consented.

Prohibited writes (always rejected):

- Passwords/API keys/secrets/credentials.
- Unsupported accusations.
- Unverified tax/legal conclusions presented as verified.
- Private personal data unrelated to the service.
- Raw confidential file contents without explicit storage approval.

Write mechanics: no automatic writes in early Phase 8 (8E/8F scaffolds are
explicit-consent-only); every write carries class, scope, permission level,
confidence, and consent reference.

## 14. Memory Read Policy

Read when:

- User asks to continue a matter ("continue the WTE Bolinao matter").
- User references "same client".
- User asks continuity questions ("what was the last patch").
- User asks for client-specific advice with a resolved client/matter.
- The response would materially improve with prior context, and scope
  resolution is unambiguous.

Do not read when:

- The question is general tax law with no user/matter dependency (memory
  could bias a source-governed answer).
- Memory may bias the answer (e.g. adversarial analysis where prior
  assumptions could pre-judge the position) unless the user asks for
  continuity.
- The matter/client cannot be resolved unambiguously — ask instead of
  guessing scope.
- The item is contradicted, revoked, or prohibited.

Reads are least-privilege: only items in the resolved scope chain, only the
classes needed for the request.

## 15. Deletion / Correction Policy

- Forget by user request: immediate, unconditional, confirmed, logged.
- Correct/update: old value superseded, new value stored with a correction
  event; old value retained only in the audit trail unless the user asks for
  hard deletion.
- Archive matter: matter items become read-only and are excluded from
  answer-time reads unless the matter is reactivated.
- Expire session facts: automatic at session end; never promoted silently.
- Conflicting memory: newer user-confirmed fact wins; the loser is marked
  contradicted; if two user-confirmed facts conflict, TINA asks.
- Every deletion/correction produces an auditable memory event.

## 16. Conceptual Data Model

Design only - no migrations, no tables created in this patch.

- memory_items: id, user_id, class (A-G), scope_type, scope_id,
  permission_level, confidence_state, content (structured fact, not raw
  document text), labels (sensitive/privileged flags), consent_event_id,
  created_at, updated_at, expires_at, status (active/stale/contradicted/
  revoked/archived), source_ref_id (nullable).
- memory_scopes: id, user_id, scope_type (session/matter/client/user/
  system), parent_scope_id (client for a matter), name, status, created_at,
  archived_at.
- matter_profiles: id, client_profile_id, matter_name, engagement_type,
  periods_covered, status, working_assumptions (item refs), created_at.
- client_profiles: id, user_id, client_name, entity_type, registration_facts
  (item refs), status, created_at.
- user_preferences: id, user_id, preference_key, preference_value,
  confidence_state, updated_at.
- memory_events: id, memory_item_id, event_type (write/read-use/suggest/
  consent/correct/delete/archive/expire), actor (user/system), scope
  snapshot, timestamp, detail (no secret values).
- memory_permissions: id, permission_level, allowed_uses, prohibited_uses,
  retention_rule.
- memory_confidence: id, confidence_state, answer_use_rule,
  clarification_rule, display_rule.
- memory_source_refs: id, memory_item_id, source_type (indexed-document/
  conversation/user-statement), source_identifier, noted_at.

## 17. Conceptual Service / API Boundaries

Design only - no files created in this patch beyond this report.

- memory-governance-policy.js - single authority for classes, permission
  levels, prohibited content detection, write/read rules (pure policy, no
  I/O).
- memory-scope-resolver.js - resolves active session/matter/client scope
  chain for a request; refuses ambiguous resolution.
- memory-read-service.js - least-privilege scope-filtered reads; returns
  compact structured context only.
- memory-write-service.js - consent-checked writes; rejects unlabeled or
  prohibited writes.
- memory-consent-helper.js - builds consent prompts/response contracts;
  records consent events.
- memory-redaction-policy.js - strips secrets/credentials/sensitive values
  from anything bound for storage or logs.
- memory-conflict-resolver.js - contradiction detection, staleness marking,
  clarification triggers.
- matter-memory-registry.js - matter/client profile management, archive/
  reactivate.

All modules follow the existing helper discipline: no OpenAI calls, no
retrieval, no rendering inside policy helpers; orchestration composes them.

## 18. Future Pipeline Integration Concept

Design only - THIS PATCH WIRES NOTHING.

Future insertion points (flag-gated, each its own patch and gate):

1. Early request context enrichment - after route normalization, resolve
   scope chain and attach compact memory context to the request context.
2. Before issue classification - entity/period context hints only; must not
   alter classified issue or target authorities.
3. Before the clarification helper (existing Step 12.6) - pass
   user-confirmed scoped facts as provided facts to reduce repeated
   questions (section 10).
4. Before prompt construction (Step 13) - structured memory context as
   compact constraint metadata, mirroring how structuredClarificationObject
   is passed today; raw stored text never injected wholesale.
5. After response - explicit/approved memory writes only; no automatic
   write-backs from generated answers.

Hard rules: memory must not bypass sourceAvailability/authority gates; must
not alter SAE status; must not add/remove/reorder source cards (Authority
Lock); OFF-state (all memory flags OFF) must be byte-identical to current
behavior.

## 19. Privacy / Security Controls

- Redaction: memory-redaction-policy strips secrets/credentials and flags
  sensitive values before any storage or event logging.
- Least-privilege retrieval: scope-chain filtering on every read.
- Scope filtering: no cross-user, no cross-client, no cross-matter reads.
- Consent logging: every consent decision is an immutable event.
- Sensitive data labels: sensitive/privileged flags gate display and use.
- Retention policy: session facts expire automatically; matter/client items
  live until archived/erased; user can erase everything.
- No credentials storage: prohibited class, enforced by policy and tests.
- Audit trail: memory_events covers write/read-use/consent/correct/delete.
- Export/view/delete: user-facing inventory of stored memory by scope, with
  export and deletion.
- User confirmation for high-risk memory use: memory summaries surfaced
  before reliance in high-risk answers (section 12).

## 20. Phase 8 Implementation Roadmap

- Phase 8A - Memory Governance Design - THIS PATCH.
- Phase 8B - Memory Taxonomy Fixture and Policy Tests - no runtime memory;
  fixtures/tests for memory classes, permission levels, prohibited items,
  scope rules, anti-contamination rules.
  Next patch: PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1.
- Phase 8C - Matter/User Context Schema Design - data model and service
  boundary design detail; still no production memory writes.
- Phase 8D - Memory Consent UX / Backend Contract - design backend response
  objects for memory suggestions and consent prompts.
- Phase 8E - Memory Read Scaffold - non-production scaffold; feature flag
  OFF; no durable writes.
- Phase 8F - Memory Write Scaffold - explicit-consent-only test storage
  interface; no automatic writes.
- Phase 8G - Matter-Scoped Memory Pilot - controlled staging only.
- Phase 8H - Memory Governance Gate - privacy/confidentiality/cross-client
  review.
- Phase 8I - Staging Smoke / Release Gate - only after all safeguards pass.

## 21. Feature Flags

Future flags (none created or read by runtime in this patch):

- TINA_ENABLE_MEMORY_READS
- TINA_ENABLE_MEMORY_WRITES
- TINA_ENABLE_MATTER_MEMORY
- TINA_ENABLE_MEMORY_SUGGESTIONS
- TINA_ENABLE_MEMORY_DEBUG_TRACE

Requirements: default OFF; missing/invalid resolves OFF; production OFF
until Phase 8I release gate; no automatic writes in early phases
(TINA_ENABLE_MEMORY_WRITES gates only explicit-consent writes); OFF-state
must be byte-identical to current behavior (same discipline as
TINA_ENABLE_CLARIFICATION_ROUTE_GATE).

## 22. Test Strategy

Tests to be built starting Phase 8B (design commitments):

- No cross-client leakage: client A facts never appear in client B context.
- No matter leakage: matter facts never appear in unrelated matters or
  general questions.
- No storage of prohibited facts: secrets/credentials/unsupported
  conclusions rejected with no value echo.
- Explicit forget works: deleted items never re-enter context; deletion
  event logged.
- Conflicting facts trigger clarification, not silent override.
- Memory never replaces source authority: SAE status, source cards, and
  authority-gated answers identical with and without memory context on
  source-governed questions.
- Memory only reduces fact questions when scoped: unscoped/ambiguous
  requests still ask.
- Sensitive facts require consent: writes without a consent event are
  rejected.
- Session-only facts not persisted past session end.
- OFF-state: all memory flags OFF preserves current behavior byte-identical.

## 23. Gate Criteria

Before any memory feature can be live (Phase 8I):

- All governance tests (section 22) pass.
- Consent model approved at a design/governance gate.
- Deletion/correction demonstrated working end-to-end.
- Cross-client/cross-matter contamination tests pass.
- Source authority preservation tests pass (Authority Lock intact).
- Staging smoke passes (OFF and ON states, isolated users).
- Privacy review passes.
- Production memory writes separately approved (write flag approval is a
  distinct decision from read flag approval).

## 24. Open Questions

1. Matter resolution UX: should the backend require an explicit active
   matter selection per conversation, or infer with confirmation? (Leaning:
   explicit selection with lightweight confirmation.)
2. Retention horizon defaults: what default staleness horizon applies to
   period-bound client facts (e.g. re-confirm VAT registration after
   year-end)?
3. Multi-user/firm workspace: reserved as future-only; when firm scope
   arrives, does client memory belong to the user or the workspace?
4. Storage backend: Supabase table vs existing conversation store extension
   - Phase 8C decision; must not touch the vector table or index.
5. Consent granularity: per-item consent vs per-matter blanket consent for
   non-sensitive facts - Phase 8D decision.
6. Whether system-governance memory (patch continuity) should remain in
   knowledge/CURRENT_STATE.md exclusively or gain a structured store -
   current answer: CURRENT_STATE.md remains authoritative; no parallel
   store in early Phase 8.

## 25. Final Design Decision

```text
DESIGN PASS WITH STRICT RECOMMENDATIONS
```

Strict recommendations (binding on Phase 8B and later):

1. No durable memory writes until the explicit consent policy is
   fixture/test-covered (Phase 8B/8F) and separately approved.
2. Matter/client scope isolation must be test-proven before any runtime
   memory read or write exists.
3. Memory must never replace source authority: SAE, retrieval, source
   cards, and authority gates remain untouched by memory context, enforced
   by tests from Phase 8B onward.
4. Phase 10 legal-state validation remains deferred; memory must not claim
   source currentness or case status.
5. Production memory flags remain OFF until the Phase 8I release gate; all
   memory flags default OFF with missing/invalid resolving OFF.
6. PATCH-07B-CLARIFICATION-BOUNDARY-TUNING-1 remains a Phase 7B
   pre-production-ON follow-up and is not Phase 8 work.

## Required Next Step

```text
PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1
```

Not started inside this design task.
