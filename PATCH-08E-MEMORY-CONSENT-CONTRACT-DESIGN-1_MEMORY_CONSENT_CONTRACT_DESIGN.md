# PATCH-08E-MEMORY-CONSENT-CONTRACT-DESIGN-1 - Memory Consent Contract Design

## 1. Patch Name and Purpose

PATCH-08E-MEMORY-CONSENT-CONTRACT-DESIGN-1 - Phase 8E Memory Consent
Contract Design.

Define the future consent UX/backend contract: consent requirements, consent
states, consent event types, the memorySuggestion / memoryConsentRequest /
memoryConsentResponse objects, prompt wording, scope rules, sensitive-data
handling, denial/revocation behavior, conflict and freshness interaction,
source-authority separation, and audit requirements - all before any runtime
memory read/write or consent service is implemented.

Status: design-only.

- No runtime implementation; no consent runtime.
- No database migrations/tables; no Supabase changes.
- No pipeline wiring; no memory or consent services.
- No frontend/UI implementation.
- No dependencies; no flag enablement.

## 2. Base State

- Phase 7 formally closed (6c59576, PASS WITH STRICT RECOMMENDATIONS);
  clarification route gate production ON remains NOT approved; boundary
  tuning remains a Phase 7B follow-up.
- Phase 8A complete (2fbd73a): governance design. Core rule: memory is
  context, never authority; no effect on SAE, retrieval, source cards,
  Authority Lock, authority gates, source currentness, case status, or
  legal-state validation.
- Phase 8B complete (9a26bda): taxonomy fixture/policy tests (26/0).
- Phase 8C complete (389474a): scope/schema design - one primary scope per
  item; reference links never expand read eligibility; source_document is
  provenance-only.
- Phase 8D complete (63fe2b1): scope/schema fixture and invariant tests
  (29/0; npm test 115 suites / 0 failed).
- Latest commit reviewed: `63fe2b1 PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1
  add scope schema invariant fixture`.
- Phase 8D strict recommendations carried forward: exact hierarchy/entity
  preservation; no DB until enforceable contract tests; no read/write
  services until service-boundary tests; no pipeline integration until
  authority-separation tests enforced; leakage tests in every scaffold;
  flags default-OFF/production-OFF until 8I/8J-class gates.

## 3. Design Decision

```text
DESIGN PASS WITH STRICT RECOMMENDATIONS
```

Details in section 24.

## 4. Consent Philosophy

Core principles, binding on all later consent work:

1. No durable memory write without an allowed permission level.
2. No sensitive client/matter fact stored without explicit consent.
3. No inferred durable memory without user confirmation.
4. No raw confidential document storage by implication.
5. No credentials or secrets storage, ever.
6. No unsupported tax/legal conclusion storage (consented non-authority
   user notes only).
7. Consent is scoped, revocable, and auditable.
8. Refusal must be respected - denial is final for that candidate unless
   the user reintroduces the topic.
9. Memory is context, never authority; consent authorizes storage, never
   authority use.

## 5. Consent Requirement Matrix

| Memory class | Default consent requirement | Explicit consent mandatory | Scope confirmation mandatory | Session-only use without durable consent | Durable write allowed | Example |
|---|---|---|---|---|---|---|
| user_profile | Confirmation before durable storage; explicit if sensitive | Only for sensitive items; always for inferred items | No (global_user implied) | Yes | Yes, after confirmation | "User is a CPA" confirmed once, stored to profile |
| user_preference | Clear user approval (explicit save or confirmed suggestion) | No, unless sensitive | No | Yes | Yes, with clear approval | "Prefers concise memos" approved via suggestion |
| matter | Matter scope confirmation once per matter session | For sensitive facts | Yes - matter scope must be confirmed | Yes | Yes, after scope confirmation | "LOA covers TY 2023" saved to the LOA matter |
| client_entity | Client scope confirmation; explicit consent for sensitive facts | For sensitive facts | Yes - client scope must be confirmed | Yes | Yes, after confirmation/consent | "Client X is VAT-registered" saved to client X |
| temporary_session | None for session use; promotion requires full consent flow | For promotion of sensitive content | For promotion to matter/client | Yes (its natural mode) | No (promotion creates a new item) | "Assume 8% option" used this session only |
| source_derived | Not user-personal; provenance notes only; no durable store in Phase 8 | No | No | Yes (as provenance context) | Not in Phase 8; later provenance-only | Provenance note for an indexed RMC, never currentness |
| prohibited_sensitive | Never stored | n/a - storage prohibited | n/a | Values must not even be echoed | Never | Pasted API key rejected outright |

Required rules restated: matter memory requires matter scope confirmation;
client_entity requires client scope confirmation; sensitive client facts
require explicit consent; prohibited_sensitive is never stored;
temporary_session usable in-session without durable write; source_derived
stores provenance notes only, never legal currentness; user preference
storable with explicit or clear approval; inferred user profile requires
confirmation before durable storage.

## 6. Consent States

| State | Description | Read behavior | Write behavior | User-visible behavior | Audit event | Transitions |
|---|---|---|---|---|---|---|
| not_required | Class/level needs no consent (e.g. session-only use, system_governance) | Per scope rules | Per permission rules | None | No (normal write audit still applies) | -> required_pending if content becomes sensitive |
| required_pending | Consent needed, prompt not yet issued | Item not readable (does not exist durably) | Blocked | None yet | No | -> requested |
| requested | Prompt shown, awaiting response | Blocked | Blocked | Consent prompt visible | consent_prompted | -> granted / denied / expired |
| granted | User approved with scope | Readable per scope rules | Durable write allowed once | Confirmation shown | consent_granted | -> revoked / expired / superseded |
| denied | User refused | Never readable (never written) | Blocked permanently for this candidate | Acknowledgement; no re-ask unless reintroduced | consent_denied | terminal unless user reintroduces |
| revoked | User withdrew a prior grant | Item unreadable from revocation onward | Blocked; item revoked | Deletion confirmation | consent_revoked + memory_deleted_after_revocation | terminal |
| expired | Grant or request passed its expiry | Blocked until refreshed | Blocked until refreshed | Re-confirmation prompt when relevant | consent_expired | -> requested (refresh) |
| superseded | Replaced by a newer consent (scope change, correction) | Old grant inert; new grant governs | Old grant unusable | Update confirmation | consent_superseded | terminal for the old record |
| invalid | Malformed/unverifiable consent record | Blocked | Blocked | Treated as absent; re-prompt if needed | audit with reason | -> requested |

## 7. Consent Event Types

All events are append-only, carry consent_event/audit identifiers,
timestamps, actor, scope snapshot, and never contain secret values.

| Event type | Purpose | Required fields | Emitted when | Audit requirement |
|---|---|---|---|---|
| candidate_detected | Record that a memory candidate was identified | suggestionId, memoryClass, scope proposal, sensitivity | Suggestion built post-response | Yes |
| consent_prompted | Record that a prompt was shown | consentRequestId, consentText, scope, riskLevel | Prompt issued | Yes |
| consent_granted | Record approval | consentRequestId, userResponse, selected scope, respondedAt | User approves | Yes |
| consent_denied | Record refusal | consentRequestId, respondedAt | User denies | Yes (see section 23 open question on retention) |
| consent_revoked | Record withdrawal of a grant | consent_event_id of grant, reason, revoked_at | User revokes | Yes |
| consent_expired | Record expiry | consentRequestId or grant id, expiry time | Expiry reached | Yes |
| consent_superseded | Record replacement | old grant id, new grant id, reason | Scope change/correction approved | Yes |
| memory_written_after_consent | Link write to its grant | memory_id, consent_event_id | Durable write completes | Yes |
| memory_not_written_no_consent | Record blocked write | suggestionId, blocking reason | Write attempted without grant | Yes |
| memory_deleted_after_revocation | Record deletion | memory_id, revocation event id | Deletion completes | Yes |
| consent_scope_changed | Record scope adjustment | old scope, new scope, confirmation | User picks a different scope | Yes |

## 8. Memory Suggestion Object

Future backend object `memorySuggestion` (design only):

Required fields: suggestionId, suggestionType, memoryClass,
proposedPermissionLevel, proposedScopeType, proposedScopeId,
proposedScopeLabel, contentSummary, structuredCandidate, sensitivityLabel,
confidenceState, consentRequired, consentReason, userPrompt, allowedActions,
prohibitedUses, authorityUseProhibited (always true),
legalConclusionProhibited (always true), sourceRefs, expiresAt, createdAt.

Allowed suggestionType values: remember_user_preference,
remember_user_profile, remember_client_fact, remember_matter_fact,
remember_source_provenance, update_existing_memory, forget_existing_memory,
keep_session_only.

Allowed actions: approve, deny, session_only, choose_scope, edit_summary,
forget, ask_later.

Rules:

1. A suggestion object is not durable memory.
2. A suggestion must not itself create memory.
3. A suggestion must not include raw confidential document text.
4. A suggestion must not include credentials/secrets (redaction applies
   before the object is built).
5. A suggestion must not create legal authority.
6. A suggestion must clearly state its proposed scope
   (proposedScopeLabel is human-readable and mandatory).

## 9. Consent Request Object

Future backend object `memoryConsentRequest` (design only):

Required fields: consentRequestId, suggestionId, userId, requestedAction,
memoryClass, permissionLevel, scopeType, scopeId, scopeLabel, consentText,
consentReason, riskLevel, sensitiveDataPresent, allowedUserResponses,
defaultResponse, expiresAt, createdAt.

Rules:

1. defaultResponse must be deny or session_only - never approve.
2. sensitiveDataPresent=true requires an explicit approve response;
   silence, timeout, or defaults never approve.
3. Client/matter scope must be visible to the user (scopeLabel in the
   prompt).
4. consentText must be plain-language (no policy jargon).
5. No consent request may bundle unrelated scopes.
6. One consent request cannot approve memory for multiple clients; batch
   multi-client consent is prohibited unless an explicit multi-scope
   design is approved later.

## 10. Consent Response Object

Future backend object `memoryConsentResponse` (design only):

Required fields: consentRequestId, userResponse, approved,
selectedScopeType, selectedScopeId, editedContentSummary, permissionLevel,
retentionPreference, userNotes, respondedAt.

Allowed userResponse values: approve, deny, session_only,
approve_with_edits, choose_different_scope, forget, ask_later.

Rules:

1. approve_with_edits creates a new candidate summary (the edited text
   becomes the stored contentSummary; the original is superseded).
2. choose_different_scope requires scope validation against the hierarchy
   and a fresh scope confirmation.
3. session_only must not create durable memory.
4. deny must not create durable memory.
5. ask_later must not create durable memory (candidate may resurface only
   when contextually relevant, never nagging).
6. forget triggers the deletion/revocation flow only if existing memory
   exists; otherwise it simply discards the candidate.

## 11. Consent Prompt Wording Library

Recommended plain-language templates (backend supplies strings; frontend
renders):

- A. User preference: "Do you want TINA to remember this as your
  preference for future responses?"
- B. User profile: "Should TINA remember this as part of your professional
  profile?"
- C. Client fact: "Do you want TINA to remember this for [Client Name]
  only?"
- D. Matter fact: "Do you want TINA to remember this for the
  [Matter Name] matter only?"
- E. Sensitive client fact: "This may be sensitive client information.
  Should TINA remember it for this matter only, or use it only in this
  conversation?"
- F. Source-derived provenance: "Should TINA remember that this source was
  used for this matter as a provenance note? This will not be treated as
  legal authority."
- G. Correction/update: "You corrected a stored fact. Should TINA update
  the existing memory, keep both with a warning, or use the correction
  only in this conversation?"
- H. Forget request: "I can forget this stored memory. Do you want to
  remove it from future use?"
- I. Session-only: "I'll use this only for this conversation and will not
  store it as memory."

## 12. Consent Scope Rules

- global_user consent: covers the user's own profile/preferences only;
  never client confidential facts.
- client consent: names the client explicitly; covers that client only.
- matter consent: names the matter explicitly; covers that matter only.
- session-only handling: no consent needed for in-session use; expiry at
  session end; promotion requires the full consent flow.
- source_document provenance consent: provenance note attachment only;
  explicitly non-authority.
- future firm_workspace consent: reserved; no Phase 8 design commitment
  beyond the placeholder.

Rules: scope must be explicit for client/matter memory; ambiguous scope
defaults to session-only; scope cannot be inferred silently for durable
memory; changing scope requires user confirmation
(consent_scope_changed event); cross-client scope is prohibited unless a
future multi-client design is approved.

## 13. Sensitive/Confidential Data Consent

High-risk categories: client tax registration details, BIR audit facts,
financial exposure amounts, legal dispute facts, personal identifiers,
health/personal sensitive data, documents marked confidential,
credentials/secrets.

Rules:

1. Credentials/secrets are always prohibited (never stored, never echoed).
2. Sensitive client facts require explicit consent and scope confirmation.
3. Raw confidential document contents must not be stored automatically
   (document intelligence itself is Phase 12).
4. Summaries derived from confidential material require user approval of
   the summary text before storage.
5. Sensitive-data suggestions should prefer matter-scoped storage over
   global or client-wide storage (smallest sufficient scope).

## 14. Consent Denial Behavior

If the user denies:

- No durable memory write occurs.
- The fact may still be used in the current session if the user permits
  (session context is unaffected by storage denial).
- A non-storage event (memory_not_written_no_consent / consent_denied) is
  recorded only where audit logging is allowed.
- TINA does not ask again for the same candidate unless the user
  reintroduces the issue.
- Answer quality is not degraded where session context is available -
  denial of storage never punishes the current conversation.

If the user chooses session_only: use in the current conversation only;
expire at session end; never persist; no repeat prompt in the same session.

## 15. Revocation / Forget Behavior

- The user can revoke consent at any time.
- Revoked memory becomes unreadable immediately.
- The deletion/revocation event is logged (consent_revoked +
  memory_deleted_after_revocation).
- Derived suggestions tied to revoked memory are invalidated.
- Future answers must not use revoked memory.
- Prior outputs that used the memory before revocation are not
  retroactively changed, but all future use stops.
- A forget request must be honored - immediately, unconditionally,
  confirmed to the user.

## 16. Consent and Conflict Handling

When new user input conflicts with stored memory:

1. Live facts win for the current answer, always.
2. The stored memory is marked contradicted.
3. The user is asked whether to update, revoke, keep with warning, or use
   the new fact session-only (prompt G in section 11).
4. Contradicted memory produces no automatic clarification reduction.
5. Updating the stored memory requires consent (the update is a new
   consent flow; the old grant becomes superseded).
6. An audit event is recorded for the conflict and its resolution.

## 17. Consent and Freshness/Expiry

- Consent can expire (expiresAt on requests and, where policy requires, on
  grants).
- Stale memory requires confirmation before use in high-risk contexts.
- Tax-period-specific facts require period confirmation when the stored
  period no longer matches the current period context.
- Client registration facts require periodic confirmation (horizon per the
  retention policy; exact durations remain an open question).
- Expired consent blocks durable write/read until refreshed via a new
  consent flow.
- Session-only always expires at session end.

## 18. Consent and Source-Authority Separation

- Consent can authorize memory storage - never legal authority use.
- Memory consent does not make a source current.
- Memory consent does not make a tax conclusion valid.
- Memory consent does not bypass sourceAvailability.
- Memory consent does not create citation authority.
- Source-derived memory must state provenance only.
- Any answer relying on law/tax authority still requires retrieval and
  source cards, exactly as today. Consent flows carry
  authorityUseProhibited and legalConclusionProhibited through every
  object.

## 19. Consent and Future Pipeline Integration

Design only - THIS PATCH WIRES NOTHING.

- A. Post-response memory suggestion generation: candidates suggested only
  after the response is complete (TINA_ENABLE_MEMORY_SUGGESTIONS); no
  automatic durable write ever.
- B. Pre-prompt memory read context: only approved, scoped memories, only
  under TINA_ENABLE_MEMORY_READS.
- C. Clarification helper integration: approved matter facts may reduce
  repeated questions; contradicted/stale facts trigger clarification
  instead.
- D. Consent response handling endpoint or service: future only; no
  implementation, route, or controller here.

All flags default OFF; OFF-state preserves current behavior
byte-identically.

## 20. API / Service Boundary Concept

Future modules, design only (no files created). Policy modules do no I/O,
no OpenAI calls, no retrieval, no rendering.

| Module | Purpose | Allowed inputs | Outputs | Prohibited responsibilities |
|---|---|---|---|---|
| memory-consent-contract.js | Canonical consent states, event types, object shapes (this design as constants) | none | contract registries | policy decisions, storage |
| memory-consent-policy.js | Decide when consent is required and which flow applies | candidate, class, sensitivity, scope | consent requirement decision | building prompts, storing events |
| memory-suggestion-builder.js | Build memorySuggestion objects from candidates | redacted candidate, scope proposal | memorySuggestion | creating memory, storing anything |
| memory-consent-request-builder.js | Build memoryConsentRequest with plain-language text | memorySuggestion, user context | memoryConsentRequest | approving anything, defaulting to approve |
| memory-consent-response-validator.js | Validate memoryConsentResponse against its request | request + response | valid/invalid + normalized response | writing memory, mutating scope silently |
| memory-consent-audit-policy.js | Define which events are recorded and their shapes | event type, context | audit event spec | storing secret values, skipping required events |
| memory-revocation-policy.js | Revocation/forget lifecycle rules | revocation request, item state | revocation actions | leaving revoked items readable |
| memory-sensitive-data-policy.js | Classify sensitivity, enforce prohibited categories, redact | candidate content | sensitivity label / rejection | storing or echoing prohibited values |

## 21. Consent Test Strategy

Tests for Phase 8F (fixture) and later scaffolds:

- Consent required for sensitive client facts.
- Denial prevents durable write.
- session_only never persisted.
- Revoked memory unreadable.
- Consent text includes visible scope.
- No bundled multi-client consent.
- Ambiguous scope defaults to session-only.
- Explicit consent required for inferred durable memory.
- Source-derived memory cannot become authority.
- Credentials/secrets rejected with no value echo.
- Conflict update requires consent; contradicted memory reduces nothing.
- Expired consent blocks use until refreshed.
- defaultResponse never approve.
- All memory flags OFF preserve current behavior byte-identically.

## 22. Gate Criteria

Before any durable memory write is allowed anywhere:

- Consent contract fixture/tests pass (Phase 8F).
- Scope/schema invariants pass (Phase 8D, carried forward).
- Sensitive data policy tests pass.
- Revocation/forget contract tests pass.
- Cross-client leakage tests pass.
- Source-authority separation tests pass.
- The memory write flag remains OFF in production.
- Staging pilot approval completed at the governance gate.

## 23. Open Questions

1. Exact retention duration for consent records (grants and denials).
2. Whether denied consent events are stored at all, and for how long
   (privacy-minimal default: store the denial fact without content).
3. Whether firm/workspace consent must exist before multi-user support.
4. Exact UI form for scope selection (frontend decision; backend supplies
   scopeLabel and allowed actions).
5. Whether consent can be batch-approved for many low-risk preferences
   (lean: yes for user_preference only, never for client/matter facts).
6. Whether client profile facts need periodic re-consent or only staleness
   re-confirmation.
7. How uploaded document-derived summaries are reviewed before a memory
   suggestion may reference them (interim answer: they may not, until
   Phase 12 defines document intelligence).

## 24. Final Decision

```text
DESIGN PASS WITH STRICT RECOMMENDATIONS
```

Strict recommendations (binding on Phase 8F and later):

1. Phase 8F must convert this design into consent contract fixtures/tests
   before any runtime consent handling.
2. No durable memory write service until consent denial, revocation,
   sensitive-data, and scope-confirmation tests pass.
3. The default response for any consent request must never be approve.
4. All sensitive client/matter memory requires explicit consent and
   visible scope.
5. Source-authority separation must remain test-enforced in consent flows.
6. Production memory flags remain OFF until Phase 8 governance and smoke
   gates pass.

## Roadmap Note - Updated Phase 8 Sequence

A consent contract fixture step is inserted before service-boundary
scaffolds, shifting the remaining sequence. The updated, authoritative
Phase 8 sequence (superseding the sequence recorded at Phase 8C):

- PATCH-08E-MEMORY-CONSENT-CONTRACT-DESIGN-1 - THIS PATCH.
- PATCH-08F-MEMORY-CONSENT-CONTRACT-FIXTURE-1 - consent contract fixture
  and policy tests (NEXT).
- PATCH-08G-MEMORY-SERVICE-BOUNDARY-SCAFFOLD-1 - non-runtime
  service-boundary scaffolds/tests only.
- PATCH-08H-MEMORY-READ-SCAFFOLD-1 - feature-flagged read scaffold, no
  durable writes.
- PATCH-08I-MEMORY-WRITE-SCAFFOLD-1 - explicit-consent write scaffold,
  staging only.
- PATCH-08J-MEMORY-GOVERNANCE-GATE-1 - governance gate before any pilot.
- PATCH-08K-MEMORY-STAGING-SMOKE-1 - staging smoke, only if gates pass.

knowledge/CURRENT_STATE.md is updated to reflect this sequence.

## Required Next Step

```text
PATCH-08F-MEMORY-CONSENT-CONTRACT-FIXTURE-1
```

Not started inside this design task.
