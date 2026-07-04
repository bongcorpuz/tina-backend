# PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1 — Security Headers / CORS / Rate-Limit Scaffold Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1

**Purpose:** Define non-runtime scaffold policy contracts for security headers,
CORS, rate limiting, and request-size posture before Phase 9, binding them to the
route inventory, security policy fixture, tenant-isolation gate, and
secrets/env/logging safety gate.

This is a **fixture / test / report / CURRENT_STATE patch only**:

- No runtime implementation.
- No CORS, security-header, rate-limit, or request-size implementation.
- No `package.json` / `package-lock.json` changes and no dependency installs
  (no helmet, express-rate-limit, or cors install).
- No middleware wiring, no `server.js` / route / auth / DB / Supabase / env /
  logging / Langfuse / error-handling changes.
- No deployment and no production changes.
- No Phase 9 / Phase 10 / Phase 11 work.
- No Phase 8 memory reopening.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit (base):** `b81579f PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1 add secrets env logging safety gate`
- **Working tree:** clean except the four known deferred untracked paths, untouched.
- **Phase 8:** closed. **Phase 8S design, route inventory, security policy fixture,
  tenant isolation gate, secrets/env/logging safety gate:** complete. **Memory:** inactive.

## 3. Scaffold summary

The fixture `evaluation/fixtures/phase-8s-security-headers-cors-rate-limit-scaffold-1.fixture.json`
(scaffoldVersion 1.0.0, all implementation flags `false`) encodes:

- **CORS scaffold** — no wildcard+credentials; production explicit allowlist;
  fail-closed when the allowlist is missing; local/staging/production origin
  classes; credentials require explicit origin match; rejection must not leak
  diagnostics.
- **Security headers scaffold** — required future headers classified as
  `required_backend_header`, `required_platform_or_proxy_review`,
  `conditional_browser_policy`, or `future_review_required` (HSTS = platform/proxy
  review).
- **Rate-limit scaffold** — route-group tiers covering auth, mode, admin, health,
  and public routes; fail-closed for unclassified expensive routes.
- **Request-size scaffold** — policy-controlled limits for auth, expensive, and
  future Phase 9 document routes (current 25mb body limit recorded as a finding
  only).
- **Route-group mapping**, **future smoke requirements**, **Phase 9 blockers**,
  and a **prohibited-claims** guard.

This patch approves policy/scaffold only, not implementation.

## 4. Route inventory integration summary

Cross-checked and required to agree by the test (recomputed from the route
inventory fixture):

- **30 routes** inventoried.
- **22 expensive-operation routes** — all listed in the expensive-route mapping
  and covered by the rate-limit scaffold.
- **17 `tenant_isolation` routes.**
- **9 `no_query_secret` admin routes** — matched by the admin/debug mapping count.
- **12 mode routes**, **3 conversation routes**, **1 debug route**, **6 public routes.**
- **`GET /health` performs a DB read** and therefore requires `rate_limit`.

## 5. Security policy integration summary

The scaffold cross-checks the security policy fixture categories `corsPolicy`,
`securityHeadersPolicy`, `rateLimitPolicy`, `requestSizePolicy`,
`reconnaissanceMinimizationPolicy`, `errorDisclosurePolicy`,
`loggingRedactionPolicy`, `querySecretPolicy`, `tenantIsolationPolicy`, and
`thirdPartyEgressPolicy`, and the test verifies those categories exist in that
fixture. The route-group mapping carries the corresponding future policies
(`cors`, `security_headers`, `rate_limit`, `request_size_limit`,
`route_recon_minimization`, `error_sanitization`, `log_redaction`,
`no_query_secret`, `tenant_isolation`, `third_party_egress_redaction`).

## 6. Tenant isolation and secrets/env/logging dependencies

- This scaffold **does not replace** tenant isolation.
- This scaffold **does not replace** secrets/env/logging safety.
- Tenant/client/matter isolation **remains mandatory before Phase 9**
  (`PATCH-08S-TENANT-ISOLATION-GATE-1`).
- P0/P1/P2 logging/egress redaction, env validation, and error sanitization
  policies **remain mandatory before Phase 9**
  (`PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1`).

## 7. CORS scaffold findings

Future CORS must never combine wildcard origin with `credentials:true`; must use
an explicit production allowlist; must fail closed when the allowlist is missing;
must classify local/staging/production origins separately; must require an
explicit origin match when credentials are allowed; and must not leak diagnostic
details on rejection. A read-only source observation recorded that `server.js`
currently defaults to `'*'` with `credentials:true` when `CORS_ORIGIN`/`ALLOWED_ORIGINS`
are unset — this patch changes nothing.

## 8. Security headers scaffold findings

Required future headers and classifications: `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` (backend headers);
`frame-ancestors`, `Content-Security-Policy`, `Cross-Origin-Resource-Policy`,
`Cross-Origin-Opener-Policy` (conditional browser policy); `Strict-Transport-Security`
(platform/proxy review). No security-header middleware exists today; none is added.

## 9. Rate-limit scaffold findings

Route-group coverage: public auth (`/register`, `/login`) stricter limits + future
lockout; public recon (`/`, `/routes`, `/health`); all 12 mode routes; all 22
expensive-operation routes; all 9 `no_query_secret` admin routes; and `/health`
because of its DB read. Future policy supports route-group tiers and fail-closed
for unclassified expensive routes. No rate-limiting is implemented.

## 10. Request-size scaffold findings

Request-size limits must be policy-controlled; expensive endpoints need stricter
size/rate policy; auth endpoints need strict body expectations; future Phase 9
generated-document routes need a size policy before implementation. The observed
25mb default is recorded as a finding only.

## 11. Public reconnaissance findings

`GET /`, `GET /routes`, `GET /health`, and the `fallback-404` handler require
future `route_recon_minimization`, `security_headers`, `rate_limit`, and
`error_sanitization`, with output minimization in the hardened state. `/health`
also requires `log_redaction` given the data it returns.

## 12. Admin/debug findings

The 9 admin/index/read + debug routes require `no_query_secret`, `admin_guard`,
`rate_limit`, `error_sanitization`, `log_redaction`, and `route_recon_minimization`;
debug routes additionally require `debug_guard`. This aligns with the route
inventory's `no_query_secret` flag on all admin routes.

## 13. Future implementation constraints

Runtime implementation of CORS, headers, rate limits, or request-size must occur
only in a separate approved patch. No package may be installed and no middleware
wired until this scaffold policy passes and governance approves the implementation
patch. CORS must fail closed in production; unclassified routes and route
inventory drift must fail tests; headers must be explicitly classified; rate-limit
tiers must be route-group mapped; all expensive routes must be covered; all admin
routes must carry `no_query_secret`; all public diagnostic routes must carry
reconnaissance minimization.

## 14. Future staging smoke requirements

CORS rejects unapproved origins and permits only approved staging/production
origins; wildcard+credentials cannot pass; security headers present where
expected; rate-limit triggers on auth/model/admin routes; `/health` does not leak
sensitive details; `/routes` output minimized or gated; production-mode errors
sanitized; no secret values in responses or logs.

## 15. Phase 9 blocker finding

Phase 9 remains blocked until the headers/CORS/rate-limit scaffold is either
implemented through approved future patches and smoke-tested, or explicitly
approved by a later Phase 8S gate. Other outstanding Phase 8S blockers:
`PATCH-08S-STAGING-SECURITY-SMOKE-1` and `PATCH-08S-FINAL-CLOSURE-GATE-1`. The
tenant-isolation gate and secrets/env/logging safety gate must remain satisfied.

## 16. Phase 8 memory and Phase 8X diagnostic boundary

- Phase 8 memory remains inactive; no persistent memory; all `TINA_ENABLE_MEMORY_*`
  flags disabled.
- The chat-context carryover diagnostic remains `PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1`,
  separate from Phase 8S and not persistent memory; not implemented here.

## 17. Deferred boundaries

- Phase 9 not started.
- Phase 10 (source governance / court metadata / currentness / supersession) deferred.
- Phase 11 (observability / performance / cache / compression) deferred.
- Phase 12 document advisory deferred; Phase 14 mobile after Phase 13.
- Phase 7B clarification boundary tuning remains separate.

## 18. Test design

`tests/patch-08s-security-headers-cors-rate-limit-scaffold-1.test.mjs` loads five
fixtures (scaffold, route inventory, security policy, tenant isolation gate,
secrets/env/logging safety gate) as JSON and validates: all top-level sections;
the scaffold PASS decision and every non-runtime flag; the CORS/headers/rate-limit/
request-size policy content; route-group, expensive-route, admin/debug, health, and
public-recon mappings; integration references to the policy fixture categories and
to both gates (verified by their `patch.id`); the future implementation
constraints, smoke requirements, Phase 9 blockers, prohibited-claims, deferred
boundaries, and memory-inactive posture; and **cross-fixture agreement** by
recomputing 22 expensive / 12 mode / 9 no_query_secret counts and the `/health`
DB-read/rate-limit fact from the route inventory. It imports no `server.js`/routes/
runtime modules, starts no server, calls no external service, reads no
`process.env`, and prints no env values (enforced by a self-check).

Result: **27 tests / 0 failed / 208 assertions.**

## 19. Validation results

```text
node tests/patch-08s-security-headers-cors-rate-limit-scaffold-1.test.mjs
PASS - 27 passed, 0 failed, 208 assertions

node tests/patch-08s-secrets-env-logging-safety-gate-1.test.mjs
PASS - 24 passed, 0 failed, 230 assertions

node tests/patch-08s-tenant-isolation-gate-1.test.mjs
PASS - 21 passed, 0 failed, 163 assertions

node tests/patch-08s-security-policy-fixture-1.test.mjs
PASS - 29 passed, 0 failed, 154 assertions

node tests/patch-08s-security-route-inventory-1.test.mjs
PASS - 21 passed, 0 failed, 1193 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 0 failed
```

## 20. Final decision

```text
SECURITY HEADERS CORS RATE LIMIT SCAFFOLD PASS WITH STRICT RECOMMENDATIONS
```

## 21. Strict recommendations

1. CORS must fail closed in production and must not allow wildcard origin with credentials.
2. Security headers must be explicitly classified before runtime implementation.
3. Rate limits must cover all public auth, mode/model/retrieval, admin/index/read/debug, expensive, and `/health` DB-read routes.
4. Request-size limits must be policy-controlled before Phase 9 generated document routes.
5. `/health` and `/routes` require a reconnaissance-minimization policy in the future hardened state.
6. Admin/index routes require the `no_query_secret` future hardened state.
7. Runtime implementation must occur only in a separate approved patch.
8. No package installation until the implementation patch is approved.
9. Tenant isolation remains mandatory and is not replaced by this scaffold.
10. Secrets/env/logging safety remains mandatory and is not replaced by this scaffold.
11. Staging security smoke remains mandatory.
12. Phase 8 memory remains inactive.
13. Phase 9 remains the Professional Workflow Co-Pilot.
14. The Phase 8X chat-context diagnostic remains separate.

## 22. Next required task

```text
PATCH-08S-STAGING-SECURITY-SMOKE-1
```

Do not start it inside this patch.
