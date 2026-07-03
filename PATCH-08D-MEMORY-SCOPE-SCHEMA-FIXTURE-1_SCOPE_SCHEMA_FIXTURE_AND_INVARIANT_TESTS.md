# PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1 - Scope/Schema Fixture and Invariant Tests

## 1. Patch Name

PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1 - Scope/Schema Fixture and Invariant
Tests (Phase 8D)

## 2. Purpose

Convert the approved Phase 8C memory scope and schema design
(PATCH-08C-MEMORY-SCOPE-SCHEMA-DESIGN-1, DESIGN PASS WITH STRICT
RECOMMENDATIONS) into a testable contract: a fixture encoding the scope
hierarchy, the ten conceptual schema entities with field contracts, the 17
schema invariants, read/write eligibility rules, consent/conflict
lifecycles, authority-separation rules, the default-OFF flag contract, and
deferred boundaries - plus an invariant test enforcing all of it. This must
exist before any runtime memory, database schema, migration, service
boundary, read/write scaffold, or pipeline integration is attempted.

Fixture/test/report only. No runtime memory was implemented.

## 3. Base Commit

```text
389474a PATCH-08C-MEMORY-SCOPE-SCHEMA-DESIGN-1 design memory scope schema
```

## 4. Scope

In scope: one fixture JSON, one invariant test file, this report, and a
knowledge/CURRENT_STATE.md update after validation.

Out of scope and not performed: runtime memory implementation, database
migrations/tables, Supabase changes, durable memory writes, memory
read/write services or any memory service module, pipeline integration,
route/controller changes, ask-handler changes, retrieval/reranker changes,
sourceAvailability changes, source-card changes, Authority Lock changes,
Phase 10 work, Phase 11 work, frontend changes, dependency/package changes,
deferred untracked files, and any feature-flag enablement.

## 5. Files Created

```text
evaluation/fixtures/phase-8d-memory-scope-schema-fixture-1-invariants.fixture.json
tests/patch-08d-memory-scope-schema-fixture-1-invariants.test.mjs
PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1_SCOPE_SCHEMA_FIXTURE_AND_INVARIANT_TESTS.md
```

Plus a knowledge/CURRENT_STATE.md update after validation.

## 6. Scope Hierarchy Summary

Six scopes, matching the Phase 8B scope types exactly, each with parent/
child rules, primary/reference eligibility, allowed/prohibited classes,
read/write eligibility, leakage prohibitions, consent, and retention:

- global_user (root; user_profile + user_preference; no client confidential
  facts).
- firm_workspace_future (future-only; no Phase 8 classes; not a primary
  scope).
- client (client_entity; no leakage to other clients or general tax law).
- matter (matter class; parent must be client unless internal/system; no
  leakage to unrelated clients/matters or general tax opinions).
- session (temporary_session + transient preferences; attaches to
  matter/client only after user confirmation; expires with session).
- source_document (reference/provenance only; never a primary scope; never
  expands read eligibility; cannot assert currentness/case status).

Nine hierarchy rules encode the Phase 8C binding outputs, including: every
memory item has exactly one primary scope, and reference scopes never
expand read eligibility.

## 7. Conceptual Entity Summary

Exactly the ten Phase 8C entities, each with `implementationHereAllowed:
false`, requiredFields, optionalFields, prohibitedFields, invariants, and
examples: memory_items, memory_scopes, client_profiles, matter_profiles,
memory_consent_events, memory_audit_events, memory_conflict_events,
memory_source_refs, memory_retention_policies, memory_access_policies.

Key field contracts: memory_items requires the identity/class/level/primary-
scope fields plus always-true `authority_use_prohibited` and
`legal_conclusion_prohibited`, and prohibits legal-state fields
(legal_authority_status, source_currentness_status, citation_authority,
case_status, supersession_status) and secret fields (password, api_key,
secret). memory_source_refs requires `citation_prohibited_as_authority`.

## 8. Schema Invariant Summary

All 17 Phase 8C invariants are encoded with description, appliesTo,
required/violation outcomes, and pass/fail examples: exactly-one class /
permission level / primary scope type / primary scope id; durable
non-system requires consent; prohibited rejected; no_store never persisted;
session_only never durable; explicit_consent requires a granted consent
event; revoked never readable; contradicted never silently reduces
clarification; memory never legal authority; source-derived never
currentness; client and matter scope isolation; global_user holds no client
confidential facts; all memory flags default OFF.

## 9. Read Eligibility Rule Summary

Eleven rules: scope match required (with scope proof); explicit user
reference allowed only after scope confirmation; unrelated client and
unrelated matter reads prohibited; revoked / prohibited-class / no_store
never read; stale requires confirmation; contradicted triggers
clarification; source-derived is provenance-only; authority-governed
questions require sources regardless of memory.

## 10. Write Eligibility Rule Summary

Nine rules: no automatic durable writes in early Phase 8; permission level
required on every write; scope confirmation for client/matter writes;
explicit consent for sensitive client facts; session-only never persisted;
prohibited rejected without value echo; source-derived requires provenance;
tax/legal conclusions rejected as authority (consented non-authority user
notes only); system_governance limited to TINA continuity state.

## 11. Consent/Conflict Lifecycle Summary

Consent lifecycle (8 states): candidate_detected -> scope_proposed ->
consent_requested -> granted/rejected -> memory_written -> consent_revoked
-> memory_not_readable_after_revocation; rules block durable writes before
required consent, require consent events, audit revocations, and make
revoked memory unreadable.

Conflict lifecycle (7 states): detected -> marked_contradicted ->
user_prompted -> resolved (updated/revoked/archived) or
retained_with_warning; rules: live facts override stored memory, conflict
prevents automatic clarification reduction, audit event required,
contradicted memory never silently read as fact.

## 12. Authority Separation Summary

Ten rules with required/prohibited behavior and examples: memory is context
not authority; no SAE mutation; no retrieval mutation; no source-card
mutation (Authority Lock); no authority-gate override; no fake citations;
no legal currentness; no case status; no Phase 10 bypass; allowed phrasing
limited to "user/matter context indicates ..." forms (never "the law is
...").

## 13. Deferred Boundary Summary

Seven boundaries, each `implementationAllowedHere: false`: Phase 7B
boundary-tuning follow-up (remains PATCH-07B-CLARIFICATION-BOUNDARY-TUNING-1,
a Phase 7B pre-production-ON follow-up), Phase 10 source governance, Phase
10 court metadata / G.R. lookup, Phase 10 hallucination traps, Phase 11
observability/performance/cache/compression, Phase 12 document advisory,
Phase 14 mobile after Phase 13.

## 14. Test Coverage Summary

`tests/patch-08d-memory-scope-schema-fixture-1-invariants.test.mjs` - 29
tests, all passing, covering the 60 required assertions. The test loads
both the Phase 8D fixture and the Phase 8B fixture and enforces: patch
identity and all seven disallowed-implementation flags; exact scope set
(cross-checked against Phase 8B scope types); exact ten-entity set;
future-only firm workspace; source_document reference-only with no read
expansion; one-primary-scope and no-reference-expansion hierarchy rules;
parent/child hierarchy rules (root global_user, matter-client requirement,
session confirmation); complete field contracts for all ten entities
including memory_items required/prohibited fields and
citation_prohibited_as_authority on source refs; all 17 invariants with
full shapes; all 11 read rules and 9 write rules with full shapes; conflict
and consent lifecycle states and rules; all 10 authority-separation rules
including the phrasing restriction; flag default-OFF contract; deferred
boundary exclusions; all 30 fixture test-case ids; Phase 8B taxonomy id
consistency (classes, levels, confidence states, and scope-to-class
references); empty implementationOutputs with no runtime/DB/pipeline
artifact names in the fixture; and the leakage/persistence rules
(cross-client, matter, global_user confidential facts, no_store,
session_only, revoked).

No runtime memory modules are imported because none exist.

## 15. Validation Commands and Results

```text
node tests/patch-08d-memory-scope-schema-fixture-1-invariants.test.mjs
  29 passed, 0 failed

npm run guard:files
  PASS: No protected files modified

npm test
  Syntax checks: 10 run, 0 failed
  Test suites: 115 run, 0 failed
  GATE PASSED
```

(npm test now counts 115 suites: the prior 114 plus this patch's new test.)

## 16. Confirmation - No Runtime Memory Implementation

No runtime memory implementation occurred. No memory service module exists.
No memory flag is read anywhere in runtime code. The only files created are
a fixture JSON, a fixture-contract test, and this report.

## 17. Confirmation - No Out-of-Scope Work

No DB migrations or tables, no Supabase changes, no durable writes, no
memory read/write services, no pipeline wiring, no route/controller or
ask-handler changes, no frontend changes, no dependency or
package.json/package-lock.json changes, no
retrieval/reranker/sourceAvailability/source-card/Authority Lock changes,
no Phase 10 work, no Phase 11 work, and no changes to deferred untracked
files. TINA_ENABLE_CLARIFICATION_ROUTE_GATE was not touched and remains
OFF/not approved for production.

## 18. Final Decision

```text
FIXTURE PASS WITH STRICT RECOMMENDATIONS
```

Strict recommendations carried into Phase 8E:

1. Phase 8E must preserve the exact scope hierarchy and conceptual entity
   set unless a design revision is approved.
2. No DB migration or runtime memory tables until schema invariants become
   enforceable contract tests against a real schema.
3. No memory read/write service until read/write eligibility rules are
   tested at service-boundary level.
4. No pipeline memory integration until source-authority separation tests
   are enforced.
5. Cross-client and matter leakage tests must be carried into every future
   runtime scaffold.
6. Memory flags remain default-OFF and production-OFF until Phase 8I/8J
   gates pass.

## 19. Next Required Task

```text
PATCH-08E-MEMORY-CONSENT-CONTRACT-DESIGN-1
```

Not started inside this task.
