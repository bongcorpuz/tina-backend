# PATCH-08S-SECURITY-POLICY-FIXTURE-1 — Security Policy Fixture Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-SECURITY-POLICY-FIXTURE-1

**Purpose:** Convert the Phase 8S threat model and route inventory findings into a
machine-readable, test-enforced set of security policies. This fixture is the
contract that later Phase 8S patches (tenant-isolation gate, secrets/logging
safety gate, headers/CORS/rate-limit scaffold, staging security smoke, final
closure) must implement and satisfy.

This is a **fixture / test / report / CURRENT_STATE patch only**:

- No runtime implementation and no middleware wiring.
- No CORS / security-header / rate-limit / auth / route / `server.js` behavior changes.
- No `package.json` / `package-lock.json` changes and no dependency installs.
- No DB/Supabase, environment, Render/Vercel, or deployment changes.
- No production changes.
- No Phase 9 / Phase 10 / Phase 11 work.
- No Phase 8 memory reopening.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit (base):** `56fd16d PATCH-08S-SECURITY-ROUTE-INVENTORY-1 add security route inventory`
- **Working tree:** clean except the four known deferred untracked paths, untouched.
- **Phase 8:** closed. **Phase 8S design + route inventory:** complete. **Memory:** inactive.

## 3. Policy fixture summary

The fixture `evaluation/fixtures/phase-8s-security-policy-fixture-1.fixture.json`
(policyVersion 1.0.0) encodes 20 policy categories, each marked
`noRuntimeChangeInThisPatch: true` and mapped to the future patch that will
enforce it:

CORS, security headers, rate limiting, route guard, admin/debug, query-secret
prohibition, secrets/env, logging/redaction, third-party egress, error
disclosure, tenant isolation, Supabase service-role constraint, prompt
injection, source-authority spoofing, request size, reconnaissance
minimization, Phase 8 memory-inactive posture, Phase 9 readiness blockers,
deferred boundaries, and Phase 8X diagnostic separation. It also carries a
`futurePatchDependencies` map, a `prohibitedClaims` list, and a `testCases`
index.

## 4. Route inventory integration summary

The policy fixture is cross-checked against the route inventory fixture, and the
test recomputes each number from the inventory and requires exact agreement:

- **30 routes** inventoried.
- **22 expensive-operation routes** → all covered by the rate-limit policy.
- **17 routes requiring `tenant_isolation`** → matches the tenant-isolation policy count.
- **9 admin routes flagged `no_query_secret`** → matches the query-secret policy count.
- **`GET /health` performs a DB read** and therefore requires `rate_limit` → recorded in both fixtures.

This binding means the two fixtures cannot drift apart without failing the test.

## 5. CORS policy findings

Future policy: wildcard origin must never be combined with `credentials:true`;
production must use an explicit origin allowlist; a missing production allowlist
must fail closed; staging and production origins are separately classified; CORS
must be tested before Phase 9. Severity HIGH. Enforced by the headers/CORS/rate-limit
scaffold patch. No runtime CORS change here.

## 6. Security headers policy findings

Future required headers: `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options` / `frame-ancestors`, `Content-Security-Policy` (where content
is rendered), `Permissions-Policy`, and `Cross-Origin-Resource-Policy` /
`Cross-Origin-Opener-Policy`. HSTS is to be evaluated at the platform/proxy
level. Severity MEDIUM. No runtime header implementation here.

## 7. Rate-limit policy findings

Future policy covers route groups `auth`, `mode`, `admin-index`, `admin-read`,
`debug`, and `health`; public auth endpoints require stricter limits + lockout;
all 22 expensive-operation routes require limits; `GET /health` requires a limit
because of its DB read. Severity HIGH. No runtime rate-limit implementation here.

## 8. Route guard / admin / debug policy findings

Every route must appear in the inventory and drift must fail tests; public routes
must be explicitly public; authenticated and mode routes require `authenticate`;
admin/index/read/debug routes require `allowAuthenticatedOrIndexSecret` or
stronger; an unknown guard is not acceptable for Phase 9. Admin routes require an
explicit `admin_guard` policy and debug routes a `debug_guard` policy;
diagnostic output must be minimized; `/routes` and `/health` require
reconnaissance minimization; admin/read/index routes require `log_redaction` and
`error_sanitization`.

## 9. Secrets / env / query-secret policy findings

P0 secrets must never be logged; required env vars must fail fast; optional env
vars must not silently enable insecure production fallbacks; production must not
default to wildcard CORS; no env values may be printed anywhere. `INDEX_SECRET`
(and any admin-equivalent secret) must not be accepted via URL query string in
the hardened state — the future accepted transport is header-only or stronger;
the current query-string acceptance (`server.js getAdminSecret` reads
`req.query.secret`) is recorded as a known risk, and all 9 admin routes carry the
`no_query_secret` flag.

## 10. Logging / redaction / third-party egress policy findings

Redaction is required for classes P0_SECRET, P1_CLIENT_CONFIDENTIAL,
P1_LEGAL_TAX_STRATEGY, P2_USER_DATA, P2_GENERATED_WORK_PRODUCT and for fields
TIN, client name, financial/audit figures, document excerpts, raw request
bodies, raw model prompts, and raw model answers. Production logs must not
contain raw user queries or PII/client identifiers. Third-party egress (Langfuse,
OpenAI, Google Drive) requires a redaction and data-classification policy; P1
data defaults to deny without an approved policy; query/answer content must be
classified and redacted before egress; egress must be test-gated before Phase 9.

## 11. Error disclosure policy findings

Production error responses must not expose raw `error.message` or stack traces;
route `catch` blocks must eventually route through a sanitizing helper/policy;
diagnostic detail must be gated. Severity MEDIUM. No runtime error-handling
change here.

## 12. Tenant isolation and Supabase service-role policy findings

Tenant/client/matter isolation is **CRITICAL** and mandatory before Phase 9;
user/client/matter data must be scoped; generated professional work product must
be access-controlled; the 17 conversation/mode/auth routes carry the
`tenant_isolation` flag; `PATCH-08S-TENANT-ISOLATION-GATE-1` is mandatory before
Phase 9.

Calibrated service-role wording (encoded verbatim in the fixture):

> Supabase service-role access may be acceptable only for tightly controlled
> server-only administrative/source-corpus operations. It is not acceptable as
> the default access path for user/client/matter data in Phase 9 without
> tenant-scoping, RLS, or an equivalent isolation model.

Service-role-as-default-path for user/client/matter data is a **CRITICAL** risk;
the tenant-isolation gate must define permitted service-role use. No DB/Supabase
change occurs here.

## 13. Prompt injection and source-authority spoofing policy findings

User prompts are untrusted; user-provided instructions cannot override
system/governance rules; prompt-injection tests are required before Phase 9;
generated documents must preserve source/authority discipline. User-provided
source references cannot create citations; user-provided URLs/text cannot create
source cards; user text cannot upgrade `sourceAvailability` or Authority Lock;
authority remains controlled by the retrieval/source-card system, not by memory
or user text. Phase 10 source-governance remains deferred.

## 14. Phase 9 readiness blockers

Phase 9 cannot begin until these complete: PATCH-08S-SECURITY-POLICY-FIXTURE-1,
PATCH-08S-TENANT-ISOLATION-GATE-1, PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1,
PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1,
PATCH-08S-STAGING-SECURITY-SMOKE-1, PATCH-08S-FINAL-CLOSURE-GATE-1. Minimum
approved-before-Phase-9 set: tenant_isolation, log_redaction,
third_party_egress_redaction, cors, rate_limit.

## 15. Deferred boundaries

- No Phase 9 implementation in this patch.
- Phase 10 (source governance / court metadata / currentness / supersession) deferred.
- Phase 11 (observability / performance / cache / compression) deferred.
- Phase 12 document advisory deferred; Phase 14 mobile after Phase 13.
- Phase 7B clarification boundary tuning remains separate.
- Phase 8 memory remains inactive; all `TINA_ENABLE_MEMORY_*` flags disabled.
- Phase 8X chat-context diagnostic is separate and not implemented here.

## 16. Test design

`tests/patch-08s-security-policy-fixture-1.test.mjs` loads the policy fixture and
the route inventory fixture as JSON and validates: all 30+ top-level sections;
the PASS decision and non-runtime flags; each policy category's required content
(CORS wildcard+credentials prohibition and fail-closed, headers list, rate-limit
coverage, guard-drift/unknown-guard rules, admin/debug guards, query-secret
prohibition, secrets/env, redaction classes/fields, egress redaction, error
sanitization, tenant isolation, calibrated service-role wording, prompt-injection
untrusted-input, authority-spoofing prevention, request size, recon
minimization, memory-inactive flags, Phase 9 blockers, deferred boundaries, 08X
separation); the prohibited-claims guard; and **cross-fixture agreement** by
recomputing the 22 expensive routes, 17 tenant-isolation routes, and 9
`no_query_secret` admin routes from the inventory and the `/health`
DB-read/rate-limit facts. It imports no `server.js`/routes/runtime modules,
starts no server, calls no external service, and reads no `process.env`. A
self-check enforces those import/env constraints.

Result: **29 tests / 0 failed / 154 assertions.**

## 17. Validation results

```text
node tests/patch-08s-security-policy-fixture-1.test.mjs
PASS - 29 passed, 0 failed, 154 assertions

node tests/patch-08s-security-route-inventory-1.test.mjs
PASS - 21 passed, 0 failed, 1193 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 0 failed
```

## 18. Final decision

```text
SECURITY POLICY FIXTURE PASS WITH STRICT RECOMMENDATIONS
```

## 19. Strict recommendations

1. Security policies must remain fixture/test-enforced.
2. No runtime security changes until the policy fixture is accepted.
3. The tenant/client isolation gate remains mandatory before Phase 9.
4. The secrets/env/logging/egress safety gate remains mandatory before Phase 9.
5. The headers/CORS/rate-limit scaffold remains mandatory before Phase 9.
6. The staging security smoke remains mandatory before Phase 9.
7. `INDEX_SECRET` query-string acceptance must be removed or replaced in a future
   hardened state (header-only or stronger).
8. `/health` and `/routes` require a reconnaissance-minimization policy in the
   future hardened state.
9. Langfuse / third-party egress requires a redaction / data-classification
   policy before Phase 9.
10. Prompt / source-authority spoofing policy must be preserved.
11. Phase 8 memory remains inactive.
12. Phase 9 remains the Professional Workflow Co-Pilot.
13. The Phase 8X chat-context diagnostic remains separate.

## 20. Next required task

```text
PATCH-08S-TENANT-ISOLATION-GATE-1
```

Do not start it inside this patch.
