# PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1 — Backend Routes and Health Disclosure Minimization Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1

**Purpose:** Address two accepted Phase 8S future hardening items — `/routes`
minimization and `/health` minimization — by reducing unnecessary endpoint/system
disclosure from public responses while preserving Render health checks and moving
richer diagnostics behind the existing diagnostic control. Phase 8S is **not**
reopened; no deployment; no env change; Phase 9 not started.

## 2. Base repo state

- **Repo:** `C:/Projects/tina-backend`
- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Base commit:** `99326e9 PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-STAGING-SMOKE-1 add staging smoke evidence`
- **Working tree:** clean except the four known deferred untracked paths — untouched.

## 3. Phase status

Phase 8 closed; Phase 8S closed and **not reopened**; 08X closed; Phase 9 **not
started**; Phases 10/11 deferred; memory **inactive** (no `TINA_ENABLE_MEMORY_*`
introduced; `TINA_ENABLE_CHAT_CONTEXT_CARRYOVER` unchanged/OFF).

## 4. Current public disclosure issue (before)

- **`/health`** (public, unauthenticated) disclosed: `version`, `commitSha`,
  `serviceName`, `environment`, `engine`, `openaiModel`, multiple `*Configured`
  flags, `googleDriveFolderIdPreview`, `indexSecretEnabled`, vector-store counts,
  the full `adaptiveStack` readiness tree, and `routeModes`. It also depended on a
  live DB call (`getVectorStoreStats`) for a liveness endpoint.
- **`/routes`** (public) returned the full route inventory (GET/POST list),
  internal adaptive **module filenames**, admin/index routes annotated with
  `?secret=YOUR_SECRET`, and the `modeSupport` list — an endpoint-enumeration aid.
- **`/`** root echoed a `usefulRoutes` enumeration plus version/architecture flags.

## 5. Files changed

| File | Type | Change |
|---|---|---|
| `server.js` | runtime | minimize `/health` (liveness), `/routes` (404), `/` (identity only) |
| `security/public-health.js` | new helper | pure minimal public-liveness builder |
| `security/route-disclosure.js` | new helper | pure minimal route-not-found response |
| `evaluation/fixtures/phase-08s-followup-backend-routes-health-minimization-1.fixture.json` | evidence | fixture |
| `tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs` | evidence | focused test |
| `PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1_BACKEND_ROUTES_HEALTH_MINIMIZATION_REPORT.md` | evidence | this report |
| `knowledge/CURRENT_STATE.md` | governance | status update |

No other runtime files changed. `ask-handler.js`, `pipeline.js`, chat-context
helper, route files, classifier/retrieval/source engines, `security/rate-limit.js`,
`security/security-headers.js`, package files, DB, frontend, env files, and
`INDEX_SECRET` behavior were **not** modified.

## 6. /health minimization summary

- **Before:** rich JSON disclosing `commitSha`/version/environment/model/config
  flags, vector-store counts, full adaptive stack, `routeModes`, and secret-presence
  booleans; returned `500` with `error.message` on a DB error.
- **After (public `/health`):** minimal **liveness** response
  `{"status":"ok","service":"tina-backend"}` via `buildPublicHealth()`. It performs
  a **resilient readiness touch** (`getVectorStoreStats()`) whose result is never
  included in the response and whose failure never breaks liveness (always `200`).
  No commitSha/version/environment/model/config/vector-store/adaptive-stack
  disclosure.
- **Design note (why a resilient DB touch, not full DB removal):** the Phase 8S
  route-inventory (`phase-8s-security-route-inventory-1.fixture.json`) is
  cross-checked by six other Phase 8S fixtures (policy, rate-limit scaffold,
  risk-mapping, closure counts) that encode the fact "/health performs a DB read."
  Removing the DB read entirely, or adding a new route, would ripple through all of
  them and expand scope far beyond this patch. This patch therefore removes only
  the **disclosure** while preserving the inventory fact (the readiness touch is
  retained but made non-failing and non-disclosing). Fully decoupling liveness from
  the DB is deferred to a dedicated patch that updates those interlocked fixtures
  together.
- **Detailed/deep health:** **intentionally not re-exposed** on any public
  endpoint in this patch, and **no new route** (e.g. `/health/details`) was added —
  that would have changed the route inventory and broken the interlocked fixtures.
  A dedicated authenticated diagnostic-health endpoint is **deferred** to a
  follow-up patch. Consequence: deployment-freshness checks can no longer read
  `commitSha` from public `/health` (recorded as a limitation).
- **Render compatibility:** public `/health` stays unauthenticated, rate-limit
  exempt, and returns `200` — liveness, not deep readiness.

## 7. /routes minimization summary

- **Before:** public full route inventory + internal module filenames + admin
  route/secret hints.
- **After:** public `/routes` returns **`404 {"error":"not_found"}`** via
  `buildRouteNotFound()` — no inventory, no method list, no module names. `404`
  (not `401/403`) is used to avoid confirming the endpoint exists, reducing
  enumeration. Detailed route listing is **intentionally not exposed** publicly;
  developer route documentation lives in `routes/index.js` (source).
- **Root `/`:** trimmed to `{success, name, message}` — no `usefulRoutes`
  enumeration, version, architecture, or internal flags.
- **Actual route registration is unchanged** — no app route was removed;
  `/ask` and all mode routes behave exactly as before.

## 8. Preserved hardening

- **Security headers**: `createSecurityHeadersMiddleware()` still wired globally.
- **x-powered-by suppression**: `app.disable("x-powered-by")` intact + defensive
  per-response removal.
- **Rate limits**: `createRateLimitMiddleware()` still wired; tiers unchanged.
- **/health safety**: public `/health` remains rate-limit exempt and fast for
  Render polling; its readiness DB touch is resilient (never fails liveness).
- **OPTIONS bypass**: preflight still bypasses the limiter.
- **/ask auth protection**: unauthenticated `/ask` still returns `401`; no change.
- `security/rate-limit.js` and `security/security-headers.js` were **not** edited.

## 9. Security impact

- Removes broad system/configuration disclosure from the public liveness endpoint.
- Removes public route/module enumeration (both `/routes` and the `/` root).
- Decouples liveness from the DB, so uptime checks cannot leak internal error
  detail and stay fast.
- Retains authorized diagnostic access (including deployment-freshness commitSha)
  behind the existing gate.

## 10. Limitations

- **Not deployed**; a live staging smoke is required to confirm the new public
  `/health` and `/routes` behavior in Render.
- Deployment-freshness checks that previously used the **public** `/health`
  commitSha are no longer possible publicly; a future **authenticated
  diagnostic-health endpoint is deferred** to reintroduce that under a control.
- Full decoupling of liveness from the DB is deferred (a resilient, non-failing DB
  touch is retained to keep the interlocked Phase 8S inventory fixtures consistent).
- Does **not** address: `INDEX_SECRET` query-string removal, tenant/client/matter
  isolation, full logging redaction, third-party/Langfuse egress controls, or the
  Phase 9 request-size policy.
- Not production readiness; production unchanged.

## 11. Validation results

```text
node tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs
PASS - 19 passed, 0 failed, 77 assertions

node tests/patch-08s-followup-backend-security-headers-rate-limits-staging-smoke-1.test.mjs
PASS - 18 passed, 0 failed, 67 assertions

node tests/patch-08s-followup-backend-security-headers-rate-limits-1.test.mjs
PASS - 23 passed, 0 failed, 1055 assertions

node tests/patch-08x-chat-context-carryover-final-gate-1.test.mjs
PASS - 17 passed, 0 failed, 127 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
PASS - 22 passed, 0 failed, 203 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 0 failed   (run with tracked changes staged, per repo diff-guard convention)
```

## 12. Final decision

```text
BACKEND ROUTES HEALTH MINIMIZATION FOLLOWUP PASS WITH STRICT RECOMMENDATIONS
```

Basis: public `/health` minimized to liveness and remains `200`-compatible;
public `/routes` (and the `/` root) no longer disclose route inventory; richer
diagnostics preserved behind the existing gate; all prior hardening preserved;
tests pass; no prohibited files changed; no deployment.

## 13. Strict recommendations

1. Deploy to staging after review.
2. Run a staging smoke for `/health` and `/routes`.
3. Confirm public `/health` is minimal and still `200`.
4. Confirm public `/routes` does not disclose inventory (expect `404`).
5. Confirm security headers and rate limits remain live.
6. Keep production unchanged.
7. Continue `INDEX_SECRET` query-string removal separately.
8. Continue tenant/logging/egress hardening separately.
9. Do not start Phase 9 until the user chooses.

## 14. Next task

User chooses the next priority:

- `PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-STAGING-SMOKE-1`, or
- `PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1`, or
- `PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1`.
