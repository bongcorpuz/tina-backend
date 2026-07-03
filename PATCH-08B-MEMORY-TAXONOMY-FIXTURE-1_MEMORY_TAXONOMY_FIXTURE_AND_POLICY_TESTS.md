# PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1 - Memory Taxonomy Fixture and Policy Tests

## 1. Patch Name

PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1 - Memory Taxonomy Fixture and Policy
Tests (Phase 8B)

## 2. Purpose

Convert the approved Phase 8A memory governance design
(PATCH-08A-MEMORY-GOVERNANCE-DESIGN-1, DESIGN PASS WITH STRICT
RECOMMENDATIONS) into a testable contract: a fixture that encodes the memory
taxonomy, permission levels, consent rules, scope-isolation rules,
authority-safety rules, deferred boundaries, and default-OFF feature-flag
contract, plus a policy test that enforces the fixture's shape and content.

Fixture/policy-test scaffold only. No runtime memory was implemented.

## 3. Base Commit

```text
2fbd73a PATCH-08A-MEMORY-GOVERNANCE-DESIGN-1 design memory governance
```

## 4. Scope

In scope: one fixture JSON, one fixture-contract test file, this report, and
a knowledge/CURRENT_STATE.md update after validation.

Out of scope and not performed: runtime memory implementation, database
migrations/tables, Supabase changes, durable memory writes, memory services,
pipeline integration, route/controller changes, ask-handler changes,
retrieval/reranker changes, sourceAvailability changes, source-card changes,
Authority Lock changes, Phase 10 work, Phase 11 work, frontend changes,
dependency/package changes, deferred untracked files, and any feature-flag
enablement.

## 5. Files Created

```text
evaluation/fixtures/phase-8b-memory-taxonomy-fixture-1-policy.fixture.json
tests/patch-08b-memory-taxonomy-fixture-1-policy.test.mjs
PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1_MEMORY_TAXONOMY_FIXTURE_AND_POLICY_TESTS.md
```

Plus a knowledge/CURRENT_STATE.md update after validation.

## 6. Memory Class Taxonomy Summary

Exactly seven classes, matching Phase 8A, each with
`mustNotAffectAuthority: true`:

| Class | Default permission | Allowed scopes |
|---|---|---|
| user_profile | user_profile | global_user |
| user_preference | user_profile | global_user, session |
| matter | matter_scoped | matter |
| client_entity | client_scoped | client |
| temporary_session | session_only | session |
| source_derived | no_store | source_document |
| prohibited_sensitive | prohibited | none |

Each class carries description, consent requirement, allowed/prohibited
uses, and examples from the approved design.

## 7. Permission Level Summary

Exactly eight levels: no_store, session_only, matter_scoped, client_scoped,
user_profile, system_governance, explicit_consent, prohibited. Each defines
retention concept, allowed use, prohibited use, consent behavior
(`requiresExplicitConsent`), and an example. `explicit_consent` is the only
level with `requiresExplicitConsent: true`; it composes with a scope.
Unlabeled writes are contractually rejected
(`no_durable_write_without_permission_level`).

## 8. Consent-Policy Contract Summary

Eight consent rules: explicit save command allowed (with scope
confirmation); sensitive client facts require explicit consent; matter
memory requires scope confirmation; inferred memory requires confirmation
before durable write; user corrections update memory with scope; forget
requests must be honored; no automatic confidential-document storage; no
durable write without a permission level.

## 9. Scope-Isolation Contract Summary

Six scope types (global_user, firm_workspace_future [future-only, no allowed
classes], client, matter, session, source_document), each restricting which
memory classes it can hold and declaring prohibited leakage targets:

- client scope: no leakage to other clients, general tax law, or unrelated
  matters;
- matter scope: no leakage to unrelated clients/matters or general tax
  opinions;
- session scope: no leakage into durable memory without consent;
- source_document scope: no leakage into legal-currentness or case-status
  claims.

## 10. Authority-Safety Contract Summary

Ten rules, all test-enforced: memory is context not authority; memory must
not change SAE status, retrieval, or source cards (Authority Lock); must not
override authority gates; must not create fake citations; must not assert
legal currentness; must not replace source availability; live facts override
memory; conflicting memory triggers clarification.

## 11. Deferred Boundary Summary

Seven boundaries, each `excludedFromPhase8B: true` and
`implementationAllowedHere: false`: Phase 7B boundary-tuning follow-up
(PATCH-07B-CLARIFICATION-BOUNDARY-TUNING-1 remains Phase 7B work), Phase 10
source governance, Phase 10 court metadata / G.R. lookup, Phase 10
hallucination traps, Phase 11 observability/performance/cache/compression,
Phase 12 document advisory, Phase 14 mobile after Phase 13.

## 12. Feature Flag Default-OFF Contract

Five future flags (TINA_ENABLE_MEMORY_READS, TINA_ENABLE_MEMORY_WRITES,
TINA_ENABLE_MATTER_MEMORY, TINA_ENABLE_MEMORY_SUGGESTIONS,
TINA_ENABLE_MEMORY_DEBUG_TRACE), each with `defaultEnabled: false`,
`productionEnabled: false`, `requiresGateBeforeProduction: true`,
`allowedBeforePhase8I: false`. No flag was created or read by runtime code in
this patch; this is contract only.

## 13. Test Coverage Summary

`tests/patch-08b-memory-taxonomy-fixture-1-policy.test.mjs` - 26 tests, all
passing, covering the 32 required assertions: patch identity and
disallowed-implementation flags; exact class set (7) and permission set (8);
one default permission per class, each resolving to a declared level; the
approved default-permission mapping; mustNotAffectAuthority on every class;
prohibited_sensitive defaults; consent behavior on every permission level;
flag default-OFF/production-OFF/gate-required contract; the ten authority
safety rules; consent rules (sensitive facts, unlabeled-write rejection);
prohibited rules (passwords/API keys/credentials, unsupported tax/legal
conclusions, G.R. lookup conclusions before Phase 10, supersession claims
before Phase 10, cross-client assumptions, matter-facts-as-law); scope
leakage prohibitions; confidence states including contradicted and revoked;
live-facts-over-memory; Phase 10 and Phase 11 exclusions; boundary tuning
not Phase 8; session-only non-persistence; source-derived
no-legal-currentness; forget requirement; all 16 fixture testCases present
by id; no runtime module names referenced by the fixture; and scope-to-class
referential integrity (firm workspace future-only).

The test loads only the fixture JSON. It imports no runtime memory modules
because none exist.

## 14. Validation Commands and Results

```text
node tests/patch-08b-memory-taxonomy-fixture-1-policy.test.mjs
  26 passed, 0 failed

npm run guard:files
  PASS: No protected files modified

npm test
  Syntax checks: 10 run, 0 failed
  Test suites: 114 run, 0 failed
  GATE PASSED
```

(npm test now counts 114 suites: the prior 113 plus this patch's new test.)

## 15. Confirmation - No Runtime Memory Implementation

No runtime memory implementation occurred. No memory service module exists.
No memory flag is read anywhere in runtime code. The only files created are
a fixture JSON, a fixture-contract test, and this report.

## 16. Confirmation - No Out-of-Scope Work

No durable writes, no DB tables or migrations, no Supabase changes, no
pipeline wiring, no route/controller or ask-handler changes, no frontend
changes, no dependency or package.json/package-lock.json changes, no
retrieval/reranker/sourceAvailability/source-card/Authority Lock changes, no
Phase 10 work (court metadata, G.R. lookup, source currentness,
hallucination traps), no Phase 11 work
(performance/cache/compression/observability), and no changes to deferred
untracked files. TINA_ENABLE_CLARIFICATION_ROUTE_GATE was not touched and
remains OFF/not approved for production.

## 17. Final Decision

```text
FIXTURE PASS WITH STRICT RECOMMENDATIONS
```

Strict recommendations carried into Phase 8C:

1. Phase 8C must preserve the exact taxonomy (7 classes) and permission
   levels (8) unless a design revision is approved.
2. No runtime memory reads/writes until policy tests expand into
   service-boundary tests.
3. Any future storage schema must enforce exactly one permission level per
   memory item.
4. Cross-client/matter leakage tests must become runtime tests before any
   staging pilot.
5. Source-authority separation must remain a hard gate in all Phase 8
   implementation patches.

## 18. Next Required Task

```text
PATCH-08C-MEMORY-SCOPE-SCHEMA-DESIGN-1
```

Not started inside this task.
