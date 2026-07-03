# PATCH-08F-MEMORY-CONSENT-CONTRACT-FIXTURE-1 - Consent Contract Fixture and Policy Tests

## Purpose

Convert the approved Phase 8E memory consent contract design into a testable
fixture/policy contract before any runtime consent handling, memory service,
database schema, route/controller behavior, frontend UI, or pipeline
integration is attempted.

Base commit:

```text
f621747 PATCH-08E-MEMORY-CONSENT-CONTRACT-DESIGN-1 design memory consent contract
```

## Scope

Fixture/test/report only.

Files created:

- `evaluation/fixtures/phase-8f-memory-consent-contract-fixture-1-policy.fixture.json`
- `tests/patch-08f-memory-consent-contract-fixture-1-policy.test.mjs`
- `PATCH-08F-MEMORY-CONSENT-CONTRACT-FIXTURE-1_CONSENT_CONTRACT_FIXTURE_AND_POLICY_TESTS.md`

## Consent Philosophy Summary

The fixture codifies that consent authorizes storage only, never authority use.
It requires allowed permission levels, explicit consent for sensitive facts,
confirmation for inferred durable memory, no implied raw confidential document
storage, no credentials/secrets storage, scoped/revocable/auditable consent,
respect for refusals, and no degradation of the current session after storage
denial.

## Consent Requirement Matrix Summary

The matrix covers all seven Phase 8B memory classes:

- `user_profile`: durable storage requires confirmation; inferred profile
  memory requires confirmation before durable write.
- `user_preference`: durable storage requires explicit or clear user approval.
- `matter`: requires matter scope visibility and explicit/scope-confirmed
  consent behavior.
- `client_entity`: requires client scope visibility and explicit/scope-confirmed
  consent behavior.
- `temporary_session`: session-only allowed without durable consent; durable
  write is false unless later explicit conversion creates a new consented item.
- `source_derived`: provenance only; cannot assert source currentness.
- `prohibited_sensitive`: durable write is false.

Sensitive client/matter facts require explicit consent and visible scope.

## Consent States and Events Summary

The fixture defines exactly nine consent states: `not_required`,
`required_pending`, `requested`, `granted`, `denied`, `revoked`, `expired`,
`superseded`, and `invalid`.

The fixture defines exactly eleven event types: `candidate_detected`,
`consent_prompted`, `consent_granted`, `consent_denied`, `consent_revoked`,
`consent_expired`, `consent_superseded`, `memory_written_after_consent`,
`memory_not_written_no_consent`, `memory_deleted_after_revocation`, and
`consent_scope_changed`. Events are append-only and must not contain secret
values.

## Object Contract Summary

`memorySuggestion` is a non-durable candidate object. It cannot create memory,
cannot create authority, must show visible scope, prohibits raw confidential
document text and credentials/secrets, and carries
`authorityUseProhibited=true` and `legalConclusionProhibited=true`.

`memoryConsentRequest` defines the future prompt/request shape. Its default
response is limited to `deny` or `session_only`, never `approve`; sensitive
data requires explicit approval; client/matter scope must be visible; unrelated
or multi-client scopes cannot be bundled.

`memoryConsentResponse` defines user responses and no-write outcomes. `deny`,
`session_only`, and `ask_later` create no durable memory;
`approve_with_edits` supersedes the original candidate;
`choose_different_scope` requires scope validation; `forget` applies only to
existing memory; `approved=true` requires `approve` or `approve_with_edits`.

## Prompt and Policy Summary

The prompt library includes templates for user preference, user profile, client
fact, matter fact, sensitive client fact, source provenance, correction/update,
forget request, and session-only use. Prohibited wording blocks automatic
remembering, authority claims, law/currentness claims, and approve-by-default
language.

Scope rules require visible client/matter scope, session-only default for
ambiguous scope, no silent durable scope inference, confirmation on scope
changes, no cross-client consent without future multi-client design, and
source-document provenance only.

Sensitive-data rules cover client tax registration details, BIR audit facts,
financial exposure amounts, legal dispute facts, personal identifiers,
health/personal sensitive data, confidential documents, and credentials/secrets.
Credentials/secrets are never stored; raw confidential document storage is
prohibited; sensitive client facts prefer matter scope; health/personal
sensitive data requires explicit necessity and consent or no-store.

Denial/session-only, revocation/forget, conflict, and freshness rules enforce:
no durable write after denial/session-only/ask_later, immediate unreadability
after revocation, honored forget requests, live facts winning the current
answer, no automatic clarification reduction from contradicted memory, consent
required for updates, stale/high-risk confirmation, period confirmation for tax
period facts, and expiry blocking durable use until refreshed.

## Source-Authority Separation Summary

Consent does not authorize legal authority use, does not make a source current,
does not validate a tax conclusion, does not bypass sourceAvailability, does
not create citation authority, and does not replace retrieval/source cards for
tax/legal answers. Source-derived memory is provenance only.

## Deferred Boundary Summary

The fixture lists future service boundary names as contract boundaries only,
with `implementationHereAllowed=false`. All future memory flags default OFF,
production OFF, and require a production gate.

Deferred boundaries remain excluded: Phase 7B clarification boundary tuning,
Phase 10 source governance/court metadata/hallucination traps, Phase 11
observability/performance/cache/compression, Phase 12 document advisory, and
Phase 14 mobile.

## Test Coverage Summary

The focused test validates the fixture contract only and imports no runtime
memory or consent modules. It checks patch metadata, base-contract consistency
with Phase 8B/8D, consent philosophy, matrix outcomes, exact states/events,
object contracts, prompt library, scope/sensitive/denial/revocation/conflict/
freshness/source-authority rules, future service boundaries, flags, deferred
boundaries, fixture test case ids, and no implementation outputs.

## Validation Commands and Results

```text
node tests/patch-08f-memory-consent-contract-fixture-1-policy.test.mjs
PASS - 20 passed, 0 failed, 284 assertions

npm run guard:files
PASS - No protected files modified
```

`npm test` was not run for this fixture-only patch because the required minimum
validation passed and this patch created no runtime implementation.

## Runtime/Implementation Confirmation

No runtime consent implementation occurred.
No runtime memory implementation occurred.
No DB migrations, database tables, or Supabase schema changes occurred.
No memory read service, write service, consent service, route/controller,
ask-handler, pipeline, retrieval, reranker, sourceAvailability, source-card,
Authority Lock, frontend/UI, dependency, Phase 10, or Phase 11 work occurred.
No memory flags were enabled or implemented.

## Final Decision

```text
FIXTURE PASS WITH STRICT RECOMMENDATIONS - proceed to Phase 8G only with
recommendations carried forward.
```

Strict recommendations:

1. Phase 8G must preserve the exact consent object contracts unless a design
   revision is approved.
2. No runtime consent handler until consent denial, revocation, sensitive-data,
   and scope-confirmation tests are represented at service-boundary level.
3. No durable memory write service until deny/session_only/ask_later no-write
   behavior is service-tested.
4. No frontend consent UI until backend consent contract is stable and
   fixture-tested.
5. Source-authority separation must remain test-enforced in every consent and
   memory implementation patch.
6. Memory flags remain default-OFF and production-OFF until Phase 8J/8K gates
   pass.

## Next Required Task

```text
PATCH-08G-MEMORY-SERVICE-BOUNDARY-SCAFFOLD-1
```
