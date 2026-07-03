# PATCH-08C-MEMORY-SCOPE-SCHEMA-DESIGN-1 - Memory Scope and Schema Design

## 1. Patch Name and Purpose

PATCH-08C-MEMORY-SCOPE-SCHEMA-DESIGN-1 - Phase 8C Memory Scope and Schema
Design.

Design the future memory scope model, conceptual data schema, service
boundaries, lifecycle rules, and validation rules needed before any memory
runtime implementation.

Status: design-only.

- No runtime implementation.
- No database migrations or tables; no Supabase schema changes.
- No pipeline wiring; no memory read/write services.
- No dependencies; no frontend changes; no flag enablement.

## 2. Base State

- Phase 7 is formally closed (commit 6c59576, PASS WITH STRICT
  RECOMMENDATIONS). TINA_ENABLE_CLARIFICATION_ROUTE_GATE production ON
  remains NOT approved; boundary tuning remains a Phase 7B follow-up.
- Phase 8A complete (commit 2fbd73a): memory governance design, DESIGN PASS
  WITH STRICT RECOMMENDATIONS. Core rule: memory is context, never
  authority; memory must not affect SAE, retrieval, source cards, Authority
  Lock, authority gates, source currentness, case status, or legal-state
  validation.
- Phase 8B complete (commit 9a26bda): taxonomy fixture and policy tests,
  FIXTURE PASS WITH STRICT RECOMMENDATIONS; 26/0 focused tests; npm test 114
  suites / 0 failed; guard:files PASS.
- Latest commit reviewed: `9a26bda PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1 add
  memory taxonomy policy fixture`.
- Strict recommendations carried forward: exact taxonomy/permission
  preservation; no runtime reads/writes before service-boundary tests;
  exactly one permission level per item; leakage tests before staging pilot;
  source-authority separation as a hard gate.

This design preserves the Phase 8B taxonomy exactly: 7 memory classes, 8
permission levels, 7 confidence states, 6 scope types, 5 default-OFF flags.

## 3. Design Decision

```text
DESIGN PASS WITH STRICT RECOMMENDATIONS
```

Details in section 22.

## 4. Scope Model Overview

A memory item must belong to exactly one primary scope. A memory item may
carry reference links to other scopes (memory_source_refs, section 6.H), but
reference links must not expand read eligibility without policy approval.

| Scope | Purpose | Allowed classes | Prohibited classes | Parent | Isolation boundary | Example | Retention | Consent | Read eligibility | Write eligibility |
|---|---|---|---|---|---|---|---|---|---|---|
| global_user | The user's own professional identity and preferences | user_profile, user_preference | client_entity, matter, prohibited_sensitive | none (root) | per-user; never cross-user | "user is a CPA" | until user edits/deletes | confirm scope; explicit for sensitive | any request by that user | user action or confirmed suggestion |
| firm_workspace_future | Reserved for future multi-user firm workspaces | none in Phase 8 | all in Phase 8 | global_user (future) | per-firm (future) | reserved | n/a | n/a | none in Phase 8 | none in Phase 8 |
| client | One client/entity across its matters | client_entity | user_profile, prohibited_sensitive | global_user (owner) or firm (future) | per-client; no cross-client reads | "client X is VAT-registered" | until relationship ended/erased | explicit for sensitive facts | requests resolved to that client | consented client facts only |
| matter | One engagement/case/workstream | matter | prohibited_sensitive | client (or internal/system) | per-matter; no cross-matter reads | "LOA covers TY 2023" | until matter archived | scope confirmation once per matter session | requests resolved to that matter | consented matter facts only |
| session | The active conversation | temporary_session, user_preference (transient) | all durable classes without promotion consent | matter or client (only if user confirms) else standalone | single conversation | "assume 8% option here" | expires with session | none for session use | same session only | automatic (non-durable) |
| source_document | Provenance/reference attachment to an indexed source | source_derived | all others | none (attaches as reference only) | per-source; no legal-state claims | "provenance note for indexed RMC" | defers to live index; no durable store in Phase 8 | none (not user-personal) | as provenance context only | no durable writes in Phase 8 |

## 5. Scope Hierarchy

```text
global_user
  -> firm_workspace_future   (optional, future only)
       -> client
            -> matter
                 -> session (attached)
session may also attach directly to client, or stand alone

source_document: provenance/reference scope only; attaches to memory items
as memory_source_refs; never a parent in the user hierarchy.
```

Required rules:

1. session may attach to a matter or client only if the user confirms the
   scope; unconfirmed sessions stay standalone and session-only.
2. matter must belong to a client, unless explicitly marked as an
   internal/system matter (e.g. TINA development continuity).
3. client facts may not be promoted to global tax law.
4. matter facts may not leak into unrelated clients.
5. source_document facts may not become source currentness claims
   (Phase 10 remains deferred).

## 6. Conceptual Schema

Conceptual entities only. No tables are created by this patch; no migration
may be written until schema invariants are fixture-tested (Phase 8D).

### A. memory_items

memory_id, memory_class (one of 7), permission_level (one of 8),
primary_scope_type, primary_scope_id, content_summary (short human-readable
fact), structured_payload (typed fact, never raw document text),
sensitivity_label (none/sensitive/privileged), confidence_state (one of 7),
source_type (user_statement/conversation/indexed_document/system),
source_ref (nullable), consent_event_id (nullable per invariants),
created_by, created_at, updated_at, expires_at (nullable), revoked_at
(nullable), status (active/stale/expired/contradicted/archived/revoked),
authority_use_prohibited (always true), legal_conclusion_prohibited (always
true), notes.

### B. memory_scopes

scope_id, scope_type (one of 6), parent_scope_id (nullable per hierarchy),
display_name, normalized_name, owner_user_id, client_id (nullable),
matter_id (nullable), lifecycle_status (active/archived), created_at,
updated_at, archived_at.

### C. client_profiles

client_id, display_name, normalized_name, entity_type, jurisdiction,
tax_registration_status, sensitive_profile_flag, created_at, updated_at,
archived_at.

### D. matter_profiles

matter_id, client_id (nullable only for internal/system matters),
matter_name, matter_type, tax_period, jurisdiction, issue_tags,
matter_status (active/on_hold/archived), confidentiality_level, created_at,
updated_at, archived_at.

### E. memory_consent_events

consent_event_id, memory_id, user_id, consent_type
(save/promote/correct/revoke/forget), consent_scope, consent_text (the
wording shown to the user), granted (boolean), granted_at, revoked_at
(nullable), revocation_reason (nullable), source_interaction_id.

### F. memory_audit_events

audit_event_id, memory_id, event_type
(write/read_use/suggest/consent/correct/delete/archive/expire/conflict),
actor_type (user/system), actor_id, previous_value_hash, new_value_hash,
reason, created_at. Secret values never appear in audit events.

### G. memory_conflict_events

conflict_event_id, memory_id, conflicting_input_summary, conflict_type
(live_fact_conflict/memory_vs_memory/stale_period), resolution_status
(open/resolved), resolution_action
(updated/revoked/archived/retained_with_warning), created_at, resolved_at.

### H. memory_source_refs

source_ref_id, memory_id, source_type
(indexed_document/conversation/user_statement), source_id, source_title,
source_card_id (nullable), document_hash (nullable),
citation_prohibited_as_authority (always true), created_at.

### I. memory_retention_policies

policy_id, permission_level, memory_class, default_retention,
max_retention, requires_review (boolean), deletion_behavior
(hard_delete/audit_stub), created_at.

### J. memory_access_policies

policy_id, scope_type, memory_class, permission_level,
can_read_for_answer_context, can_write_automatically (false everywhere in
early Phase 8), requires_explicit_consent, requires_scope_confirmation,
prohibited_in_general_queries, created_at.

## 7. Required Invariants

Schema invariants, to be fixture-tested in Phase 8D before any DB work:

1. Every memory item has exactly one memory_class.
2. Every memory item has exactly one permission_level.
3. Every memory item has exactly one primary_scope_type.
4. Every memory item has exactly one primary_scope_id.
5. Every durable memory item has consent_event_id, unless its
   class/permission is system_governance.
6. prohibited memory cannot be stored (write rejected; no value echo).
7. no_store memory cannot be persisted.
8. session_only cannot become durable (promotion requires a new consent
   event and a new item under the durable scope).
9. explicit_consent memories require consent_event_id with granted=true.
10. revoked memories cannot be read.
11. contradicted memories cannot silently reduce clarification questions.
12. memory cannot be marked as legal authority
    (authority_use_prohibited=true on every item, no exceptions).
13. source-derived memory cannot assert source currentness.
14. client-scoped memory cannot be read in an unrelated client context.
15. matter-scoped memory cannot be read outside its matter unless the user
    confirms transfer.
16. global_user memory cannot contain client confidential facts.
17. All memory flags default OFF; missing/invalid resolves OFF.

## 8. Permission Enforcement Design

| Permission level | Storage/read/write behavior |
|---|---|
| no_store | Never persisted; value may be used only inside the current response assembly; rejected by the write policy with no value echo |
| session_only | Retained only in request/session context; dropped at session end; no durable representation |
| matter_scoped | Durable only with a valid matter primary scope and matter scope-confirmation consent; readable only inside that matter |
| client_scoped | Durable only with a valid client primary scope and consent rules; readable only in that client's context |
| user_profile | Durable only for non-sensitive user profile/preferences, or consented sensitive items (which become explicit_consent); readable in any of that user's requests |
| system_governance | Durable for TINA development/system continuity state only; never client facts; readable in governance/continuity contexts |
| explicit_consent | Durable only with a logged granted consent event; composes with a scope; read follows the composed scope |
| prohibited | Rejected at write time, always |

## 9. Read Eligibility Design

Inputs: user_id, current route, current query, detected client scope,
detected matter scope, session id, explicit user reference, consent state,
permission level, confidence state, freshness state.

Rules:

1. Memory is read only if the resolved scope chain matches the item's
   primary scope, or the user explicitly references it (and the reference
   itself resolves the scope).
2. High-risk tax/legal questions require source authority regardless of
   memory; memory never substitutes for retrieval or SAE.
3. Conflicted or stale memory triggers clarification instead of silent use.
4. Unrelated client/matter memory is never read.
5. prohibited/revoked/no_store items are never read.
6. source-derived memory can supply provenance context only, never
   currentness/supersession/case status.
7. Reads are least-privilege: only classes needed by the request, only
   within the resolved scope chain; every high-risk read-use is audited.
8. If client/matter resolution is ambiguous, no scoped memory is read; the
   resolver asks or falls back to session-only context.

## 10. Write Eligibility Design

Inputs: user command, inferred candidate memory, memory class, sensitivity,
target scope, permission level, consent status, source type.

Rules:

1. No automatic durable writes in early Phase 8 (through 8G at minimum);
   can_write_automatically is false across the access-policy matrix.
2. Explicit consent required for sensitive client facts.
3. Scope confirmation required for matter/client memory.
4. Session-only facts are not persisted.
5. Prohibited facts are rejected with no value echo into logs/events.
6. Source-derived facts require provenance (memory_source_refs) and cannot
   become legal conclusions.
7. Tax/legal conclusions are not written as memory unless framed as a user
   note, marked non-authority (legal_conclusion_prohibited=true still
   applies to use), and explicitly consented.
8. Every write carries class, permission level, primary scope, confidence
   state, and (where required) consent_event_id; unlabeled writes are
   rejected (Phase 8B contract).

## 11. Conflict Handling Design

Lifecycle: detected -> marked contradicted -> user prompted -> resolved by
update, revoke, archive, or retain-with-warning -> audit event recorded
(memory_conflict_events + memory_audit_events).

Rules:

- Live facts override memory for the current answer, always.
- Old memory cannot silently override current user input.
- A conflict prevents automatic clarification reduction for the affected
  facts until resolved.
- Conflict resolution preserves the audit trail (previous value hash
  retained; hard deletion only on explicit forget).

## 12. Freshness / Retention Design

Freshness/lifecycle states: active, stale, expired, archived, revoked
(status field on memory_items, aligned with the Phase 8B confidence states;
contradicted is tracked via confidence_state + conflict events).

Rules:

- Tax-period-sensitive facts need periodic confirmation; when the stored
  period no longer matches the current period context, the item becomes
  stale and requires re-confirmation before use.
- Client registration facts become stale after a defined period (default
  horizon: end of the taxable year they describe; exact periods are an open
  question for Phase 8D/8E) or upon contradictory input.
- Session facts expire automatically at session end.
- Source-derived memory never proves source currentness; it always defers
  to the live index and SAE classification at answer time.
- Retention differs by permission level and memory class via
  memory_retention_policies (section 6.I); explicit forget always wins over
  any retention policy.

## 13. Consent and Audit Trail Design

Consent lifecycle: candidate memory detected -> scope proposed -> user
consents or rejects -> consent event logged -> memory written only after
consent -> user can revoke at any time -> revocation creates an audit event
-> revoked memory is never read again.

Recommended consent text examples (backend supplies strings; frontend
renders):

- User preference: "Should TINA remember this preference for all your
  future conversations?"
- Client fact: "Save this as a fact about [client] for future work with
  this client, or use it only in this conversation?"
- Matter fact: "Do you want TINA to remember this for this client/matter
  only, or just use it for this conversation?"
- Sensitive client fact: "This looks like a confidential client fact.
  Store it under [client/matter], keep it for this conversation only, or
  not record it at all?"
- Source-derived note: "Attach this note to the indexed source [title] as
  provenance context? It will never be cited as authority."
- Correction/update: "TINA previously noted: [old]. Replace it with:
  [new]?"
- Forget request: "Deleted. TINA will no longer use this fact."

## 14. Cross-Client Contamination Prevention

Mandatory controls:

1. The scope resolver must default to session-only when client/matter
   resolution is ambiguous - never guess a client.
2. No automatic promotion from matter scope to client or global scope;
   promotion requires explicit user consent and creates a new item.
3. Client facts cannot become legal doctrine or general tax law.
4. Answer generation cannot use unrelated client memory; the read service
   filters by the resolved scope chain before anything reaches prompt
   context.
5. Every memory read result must include scope proof (item scope +
   resolved request scope) so downstream layers and audits can verify the
   match.
6. Tests must simulate client A / client B leakage attempts (fixture tests
   in Phase 8D, runtime tests before any staging pilot).

## 15. Authority Separation Design

Memory is context, never authority. Operational rules:

- Memory context is carried in a structure separate from source cards and
  is never merged into them.
- Memory cannot create citations; memory_source_refs carry
  citation_prohibited_as_authority=true.
- Memory cannot alter AUTHORITY_FOUND / RELATED_AUTHORITY_ONLY /
  SOURCE_LIMITED / NO_INDEXED_SOURCE states.
- Memory cannot satisfy sourceAvailability; a source-governed question with
  no indexed source stays NO_INDEXED_SOURCE regardless of memory.
- Memory cannot assert law currentness or case status; those claims are
  Phase 10 and remain deferred.
- Memory cannot bypass Phase 10 deferral disclosures.
- Memory phrasing in answers is limited to the form "user/matter context
  indicates ..." - never "the law is ...".

## 16. API / Service Boundary Design

Future modules, design only (no files created by this patch). All are
policy/orchestration helpers in the existing discipline: no OpenAI calls,
no retrieval, no rendering inside policy modules.

| Module | Purpose | Allowed input | Output | Prohibited responsibilities |
|---|---|---|---|---|
| memory-governance-policy.js | Single authority for classes, permission levels, prohibited detection | candidate item, class, level | allow/reject + reason | I/O, storage, retrieval, rendering |
| memory-taxonomy-registry.js | Canonical taxonomy constants mirroring the 8B fixture | none | class/level/state registries | policy decisions, storage |
| memory-scope-resolver.js | Resolve session/matter/client scope chain for a request | user, route, query, session, explicit refs | scope chain or "ambiguous" | guessing scopes, reads/writes |
| memory-schema-contract.js | Invariant validation for item shapes (section 7) | candidate item | valid/invalid + violated invariant | storage, migration |
| memory-read-policy.js | Read eligibility decisions (section 9) | item, scope chain, query risk class | readable yes/no + scope proof | performing reads, prompt assembly |
| memory-write-policy.js | Write eligibility decisions (section 10) | candidate, consent state, scope | writable yes/no + required consent | performing writes, storage |
| memory-consent-helper.js | Build consent prompts/contracts; record consent decisions | candidate, scope proposal | consent prompt object / consent event record | storing memory itself |
| memory-conflict-resolver.js | Conflict detection and lifecycle (section 11) | item, live facts | conflict state + required action | silent overrides, deletion |
| memory-retention-policy.js | Retention/freshness evaluation (section 12) | item, current date/period | active/stale/expired + action | deletion without policy/audit |
| memory-audit-service.js | Append-only audit event recording | event data (no secret values) | audit event id | mutating memory items |
| matter-memory-registry.js | Matter profile lifecycle (create/archive/reactivate) | matter data, client link | matter profile state | storing memory items |
| client-memory-registry.js | Client profile lifecycle | client data | client profile state | cross-client queries |

## 17. Future Pipeline Integration Concept

Design only - THIS PATCH WIRES NOTHING. All insertion points are future,
flag-gated, and individually patched/gated:

A. Request normalization / route context - resolve user/session/client/
   matter hints; no memory reads unless TINA_ENABLE_MEMORY_READS is ON.
B. Pre-issue classification context - pass scoped context as non-authority
   facts; must not alter the classified issue or target authorities.
C. Pre-clarification helper (existing Step 12.6) - provide already-confirmed
   matter facts to reduce repeated questions; conflicts/staleness disable
   reduction.
D. Pre-prompt construction (Step 13) - pass structuredMemoryContext as
   compact context constraints, mirroring structuredClarificationObject
   handling; raw stored text never injected wholesale.
E. Post-response candidate write - suggest memory writes only with consent
   (TINA_ENABLE_MEMORY_SUGGESTIONS); no automatic durable writes in early
   phases.

Rules: memory flags default OFF; OFF-state preserves current behavior
byte-identically; memory cannot bypass sourceAvailability; memory cannot
alter source cards.

## 18. Future Validation Strategy

Tests to be created in Phase 8D and later:

- Schema invariant tests (all 17 invariants in section 7).
- Permission mapping tests (level -> storage/read/write behavior).
- Read eligibility tests (scope match, ambiguity fallback, high-risk
  authority requirement).
- Write eligibility tests (consent, scope confirmation, unlabeled
  rejection).
- Consent required tests (sensitive facts, promotion, corrections).
- Prohibited memory rejection tests (credentials, conclusions, no value
  echo).
- Cross-client leakage tests (client A / client B simulations).
- Matter leakage tests (matter A / matter B, matter -> general query).
- Conflict resolution tests (live-fact override, contradicted lifecycle).
- Stale memory clarification tests (period-bound facts).
- Source-authority separation tests (SAE/source cards identical with and
  without memory context).
- Memory flag OFF-state tests (byte-identical behavior).
- No-durable-writes-without-consent tests.
- No Phase 10 leakage tests (no currentness/case-status assertions).

## 19. Phase 8C Outputs to Carry Forward

Phase 8D must inherit, unchanged unless a design revision is approved:

- The scope hierarchy and isolation model (sections 4-5).
- The conceptual schema (section 6) and the 17 invariants (section 7).
- Permission enforcement mapping (section 8).
- Read/write eligibility concepts (sections 9-10).
- Conflict, freshness/retention, consent/audit lifecycles (sections 11-13).
- Cross-client contamination controls (section 14).
- Authority separation rules (section 15).
- Future module boundaries (section 16) and integration concept
  (section 17).
- The validation strategy (section 18).

## 20. Phase 8 Roadmap Update

Confirmed sequence (next patch is 08D; the fixture patch is a distinct step
after this design, consistent with the 8A->8B design->fixture pattern):

- PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1 - scope/schema fixture and
  invariant tests (NEXT).
- PATCH-08E-MEMORY-CONSENT-CONTRACT-DESIGN-1 - consent UX/backend contract
  design.
- PATCH-08F-MEMORY-SERVICE-BOUNDARY-SCAFFOLD-1 - non-runtime
  service-boundary scaffolds/tests only.
- PATCH-08G-MEMORY-READ-SCAFFOLD-1 - feature-flagged read scaffold, no
  durable writes.
- PATCH-08H-MEMORY-WRITE-SCAFFOLD-1 - explicit-consent write scaffold,
  staging only.
- PATCH-08I-MEMORY-GOVERNANCE-GATE-1 - governance gate before any pilot.
- PATCH-08J-MEMORY-STAGING-SMOKE-1 - staging smoke, only if gates pass.

(Note: earlier Phase 8A text sketched an 8A-8I lettering; this sequence
supersedes it by inserting the schema fixture step as 08D and shifts the
governance gate/smoke to 08I/08J. CURRENT_STATE.md records this sequence as
authoritative.)

## 21. Open Questions

1. Exact retention periods per permission level and class (e.g. staleness
   horizon for registration facts) - decide in Phase 8D/8E.
2. Whether firm/workspace scope will be implemented before multi-user
   support exists - currently future-only; revisit at Phase 8I.
3. Whether client profiles are user-local or firm-shared once firm scope
   arrives - default user-local until firm scope is designed.
4. How memory export/view/delete UI will be exposed (backend contract in
   8E; frontend out of Phase 8 backend scope).
5. Whether source-derived memory should store only source ids or also
   short summaries - lean: ids + minimal provenance note, never document
   text.
6. How to treat client facts derived from uploaded confidential documents
   - document intelligence is Phase 12; in Phase 8 only user-stated facts
   about documents are eligible, with explicit consent.
7. Storage backend choice (Supabase table vs conversation-store extension)
   - Phase 8D+ decision; must not touch the vector table or index.

## 22. Final Decision

```text
DESIGN PASS WITH STRICT RECOMMENDATIONS
```

Strict recommendations (binding on Phase 8D and later):

1. Phase 8D must convert this design into fixture/invariant tests before
   any runtime memory.
2. No DB schema/migration until schema invariants are fixture-tested.
3. No memory read/write service until scope isolation and consent
   eligibility are tested.
4. Every future memory item must enforce exactly one memory_class, one
   permission_level, one primary_scope_type, and one primary_scope_id.
5. Source-authority separation must be tested in every memory
   implementation patch.
6. Production memory flags remain OFF until Phase 8 governance and smoke
   gates pass.

## Required Next Step

```text
PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1
```

Not started inside this design task.
