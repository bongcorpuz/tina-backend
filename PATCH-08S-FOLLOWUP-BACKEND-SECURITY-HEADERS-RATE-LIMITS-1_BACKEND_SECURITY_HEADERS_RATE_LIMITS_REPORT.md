# PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1 — Backend Security Headers and Basic Rate Limits Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1

**Purpose:** Address three accepted Phase 8S future hardening items on the backend:
(1) backend security response headers, (2) basic route-level rate limiting, and
(3) suppression of the Express `x-powered-by` disclosure. This is code/config
evidence only — no deployment, no env change, no DB change, no Phase 9 work, and
Phase 8S is **not** reopened.

## 2. Base repo state

- **Repo:** `C:/Projects/tina-backend`
- **Branch:** `feature/source-availability-engine-v1`
- **Sync (pre-patch):** `0 0`
- **Base commit:** `ec7f455 PATCH-08X-CHAT-CONTEXT-CARRYOVER-FINAL-GATE-1 close chat context carryover`
- **Working tree:** clean except the four known deferred untracked paths
  (`.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`,
  `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`) — all untouched.

## 3. Phase status

Phase 8 closed; Phase 8S closed and **not reopened** (this is a tracked Phase 8S
follow-up hardening item); 08X closed; Phase 9 **not started**; Phases 10/11
deferred; memory **inactive** (`TINA_ENABLE_MEMORY_*` and
`TINA_ENABLE_CHAT_CONTEXT_CARRYOVER` remain OFF; none introduced or changed).

Frontend security headers follow-up `PATCH-08S-FOLLOWUP-FRONTEND-SECURITY-HEADERS-1`
is complete in the `tina-ai` repo at commit `23503ba` (frontend Vercel headers
only, not backend).

## 4. Files changed

| File | Type | Change |
|---|---|---|
| `server.js` | runtime | disable `x-powered-by`; wire security-headers + rate-limit middleware |
| `security/security-headers.js` | new helper | pure API-only security header map + middleware |
| `security/rate-limit.js` | new helper | dependency-free in-memory fixed-window limiter |
| `evaluation/fixtures/phase-08s-followup-backend-security-headers-rate-limits-1.fixture.json` | evidence | fixture |
| `tests/patch-08s-followup-backend-security-headers-rate-limits-1.test.mjs` | evidence | focused test |
| `PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1_BACKEND_SECURITY_HEADERS_RATE_LIMITS_REPORT.md` | evidence | this report |
| `knowledge/CURRENT_STATE.md` | governance | status update |

No other runtime files changed. `ask-handler.js`, `pipeline.js`, the chat-context
helper, route files, classifier/retrieval/source engines, package files, DB/
migration files, frontend, and env files were **not** touched.

## 5. Security headers implemented

Applied globally by `createSecurityHeadersMiddleware()` (after CORS, before body
parser and routes):

| Header | Value |
|---|---|
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Cross-Origin-Resource-Policy | `same-site` |
| Content-Security-Policy | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` |
| Cache-Control | `no-store` |

`Cache-Control: no-store` is applied to all backend responses because the backend
is API/JSON-only (no static assets or HTML documents are served), so authenticated
JSON is never cached by shared proxies or browsers.

## 6. Backend CSP summary

The backend is API-only, so the CSP is deliberately conservative and does **not**
copy the frontend CSP:

```
default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
```

No `script-src`/`style-src`/`img-src`/`connect-src` sources are granted, and
there is no `unsafe-inline` / `unsafe-eval` — the API never returns an HTML
document or executes browser script.

## 7. x-powered-by suppression

- `app.disable("x-powered-by")` is set in `server.js` immediately after
  `const app = express()`, before CORS/middleware/routes.
- Defense in depth: the security-headers middleware also calls
  `res.removeHeader("X-Powered-By")` on every response in case the framework
  default is ever re-added.

## 8. Rate-limit implementation

Dependency-free, in-memory, fixed-window limiter in `security/rate-limit.js`. No
new package was installed (no `express-rate-limit`); no Redis; no env required.

- **Tiers (window / max):**
  - general: 60_000 ms / 120
  - expensive (ask/mode/retrieval): 60_000 ms / 20
  - admin/index: 60_000 ms / 10
- **Route matching:** `getRateLimitTier(req)` classifies by path. Admin routes are
  matched **before** expensive routes so `/debug/db-identity` (admin) is not
  misread as `/debug` (expensive).
  - expensive: `/ask /tax /review /quiz /diagnostic /source /audit /case /debug /patch /progress /feedback`
  - admin: `/index-drive /reindex /admin /reindex-targeted /index-status /debug/db-identity /list /read-drive /vector-stats`
  - general: everything else (`/`, `/routes`, `/register`, `/login`, `/conversations`, …)
- **429 response:**
  ```json
  { "error": "rate_limited", "message": "Too many requests. Please try again later.", "retryAfterSeconds": <number> }
  ```
- **Headers:** `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` (unix seconds). The `X-RateLimit-*` trio is set on both
  allowed and blocked responses.
- **Keying strategy:** prefers an already-present `req.user.id` (`u:<id>`),
  otherwise `req.ip` (`ip:<addr>`). No new `trust proxy` behavior is introduced.
  IPs, tokens, headers, cookies, and bodies are **never logged**.
- **Limitation:** per-instance only (see §11).

## 9. Health / OPTIONS handling

- **OPTIONS** (CORS preflight) requests bypass the limiter entirely — never
  counted, never blocked — so preflight and the Phase 8S fail-closed CORS
  behavior are unaffected.
- **/health** is exempt from rate limiting so Render's health polling is never
  throttled; the strict ask/expensive limiter is never applied to `/health`.
- No static/favicon route exists on the API-only backend, so none is blocked.

## 10. Security impact

- Removes framework disclosure (`x-powered-by`).
- Blocks clickjacking (`X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`).
- Blocks MIME sniffing (`nosniff`).
- Reduces referrer leakage; locks down camera/microphone/geolocation.
- Adds cross-origin isolation (COOP/CORP) and a fail-closed API CSP.
- Prevents caching of authenticated JSON (`no-store`).
- Adds basic burst/abuse protection with tiered per-minute limits and standard
  `429` + `Retry-After` semantics.

## 11. Limitations

- The rate limiter is **in-memory and per-instance only**; counters are not shared
  across multiple Render instances/replicas.
- **Not a distributed limiter**; **no Redis / shared store**.
- **Production tuning required** (limits are conservative staging defaults).
- **Not deployed**; **post-deploy validation / scanner retest required**.
- Does **not** implement tenant/client/matter isolation.
- Does **not** remove the `INDEX_SECRET` query-string acceptance.
- Does **not** minimize `/routes` or `/health` payloads.
- Remaining Phase 8S items still open: `/routes` minimization, `/health`
  minimization, `INDEX_SECRET` query-string removal, tenant isolation, full
  logging redaction, third-party/Langfuse egress controls, Phase 9 request-size
  policy.

## 12. Validation results

```text
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

## 13. Final decision

```text
BACKEND SECURITY HEADERS RATE LIMITS FOLLOWUP PASS WITH STRICT RECOMMENDATIONS
```

Basis: backend headers added; `x-powered-by` suppressed; dependency-free rate
limiter added and wired; all focused and regression tests pass; guard passes; no
prohibited files changed; no deployment performed.

## 14. Strict recommendations

1. Deploy to staging after review (separate approved step).
2. Run a curl/header smoke against staging.
3. Confirm `x-powered-by` is absent on responses.
4. Confirm all security headers are present.
5. Confirm `/ask` rate-limits (429) after the threshold.
6. Confirm `/health` remains healthy and unthrottled under Render polling.
7. Tune limits before production.
8. Consider a Redis/distributed limiter before production scale.
9. Continue the remaining Phase 8S hardening items separately.
10. Do not start Phase 9 until the user chooses.

## 15. Next task

User chooses the next priority:

- `PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1` — minimize `/routes`
  and `/health` disclosure, or
- `PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1` — remove `INDEX_SECRET`
  query-string acceptance, or
- `PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1` — begin the Phase 9 design gate.
