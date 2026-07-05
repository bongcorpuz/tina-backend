# PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-STAGING-SMOKE-1 — Backend Security Headers and Rate Limits Staging Smoke Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-STAGING-SMOKE-1

**Purpose:** Verify on live Render **staging** that the backend security headers,
`x-powered-by` suppression, backend API CSP, and rate-limit middleware from
`PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1` (commit `ee65dc6`) are
actually active. This patch records staging evidence only — it implements no
runtime code and performs no deployment.

## 2. Base repo state

- **Repo:** `C:/Projects/tina-backend`
- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `ee65dc6 PATCH-08S-FOLLOWUP-BACKEND-SECURITY-HEADERS-RATE-LIMITS-1 add backend headers and limits`
- **Working tree:** clean except the four known deferred untracked paths
  (`.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`,
  `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`) — all untouched.

## 3. Staging target

`https://tina-backend-staging.onrender.com`

Production was **not** touched. No env, Render dashboard, or deployment change.

## 4. Deployment freshness

**`confirmed_commit_ee65dc6`.** `GET /health` returned
`commitSha: ee65dc626eb64eebbc6f8458e06a115bab768e4c`, `environment: staging`,
`serviceName: tina-backend-staging`, `version: 5.0.0`. The staging service is
running the backend hardening commit.

## 5. Probe summary

| Probe | Method / Path | Status | Result |
|---|---|---|---|
| A | `GET /health` | 200 | PASS — all headers, no X-Powered-By, commit confirmed |
| B | `OPTIONS /ask` (preflight) | 204 | PASS — not 429; CORS sane |
| C | `POST /ask` (no auth) | 401 | PASS — protected; headers + rate-limit headers present |
| D | rate-limit observation | — | WARNING — headers observed live; 429 not forced (avoid load) |

## 6. Header findings

All eight required headers were observed on both `GET /health` and the
`POST /ask` 401 response:

| Header | Observed value |
|---|---|
| Content-Security-Policy | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Cross-Origin-Resource-Policy | `same-site` |
| Cache-Control | `no-store` |

Note: the security headers are intentionally **not** present on the `OPTIONS`
preflight (204) response — the `cors` middleware answers and ends the preflight
before the security-headers middleware runs. This is expected and does not affect
actual GET/POST API responses, which carry the full header set.

## 7. X-Powered-By finding

**Absent** on all observed responses (`/health` 200 and `/ask` 401).
`app.disable("x-powered-by")` plus the defensive `res.removeHeader` are effective
in staging.

## 8. CSP finding

Backend CSP present and API-conservative:
`default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`.
No `unsafe-inline` / `unsafe-eval`. It does not resemble the frontend CSP.

## 9. Rate-limit finding

**`headers_present`.** The unauthenticated `POST /ask` response carried live
rate-limit headers:

```
x-ratelimit-limit: 20
x-ratelimit-remaining: 19
x-ratelimit-reset: 1783249030
```

This proves the limiter is active, runs **before** authentication, and correctly
classifies `/ask` into the **expensive** tier (limit 20/min). `GET /health`
carried **no** `X-RateLimit-*` headers, confirming `/health` is exempt from the
limiter. A `429` was **not** forced: doing so would require 20+ rapid `/ask`
requests, which is borderline load-like and disallowed. The 429 response shape and
headers are already covered by the prior focused test
(`patch-08s-followup-backend-security-headers-rate-limits-1.test.mjs`).

## 10. CORS / OPTIONS finding

`OPTIONS /ask` returned **204 (not 429)** and reflected the allowlisted origin
`https://tina-fawn.vercel.app` with `access-control-allow-credentials: true`. No
CORS regression was observed; the Phase 8S fail-closed CORS behavior is intact and
the rate limiter does not block preflight.

## 11. Auth protection finding

Unauthenticated `POST /ask` returned **401** `{"error":"Authentication required"}`.
Unauthenticated access to the expensive `/ask` route remains protected; the rate
limiter running before auth does not weaken authentication.

## 12. Security / privacy finding

- No JWTs, cookies, or authorization headers were sent, captured, or stored.
- No tokens stored.
- No real client data, TINs, or financial statements used — only a synthetic
  non-client question (`"Is tobacco subject to VAT?"`) was sent to `/ask`.
- No load testing; no admin/index routes probed; `INDEX_SECRET` not tested.
- Production untouched. Only a short, non-sensitive body snippet was recorded.

## 13. Limitations

- The rate-limit live threshold (`429`) was **not** fully exercised, to avoid load
  testing.
- The limiter is **in-memory and per-instance only** (not distributed).
- **Production tuning required**; this is **not** production readiness.
- Remaining Phase 8S items still open: `/routes` minimization, `/health`
  minimization, `INDEX_SECRET` query-string removal, tenant isolation, full
  logging redaction, third-party/Langfuse egress controls, Phase 9 request-size
  policy.

## 14. Validation results

```text
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
GATE PASSED - 0 failed
```

## 15. Final decision

```text
BACKEND SECURITY HEADERS RATE LIMITS STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS
```

Basis: deployment freshness confirmed (`ee65dc6`); `/health` 200 with all required
headers; `X-Powered-By` absent; API-conservative CSP present; `OPTIONS` not
429-blocked and CORS sane; unauthenticated `/ask` protected (401) with headers;
rate-limit headers observed live on `/ask` (expensive tier, limit 20) with 429
intentionally not forced for safety; no CORS regression; no security/privacy
issue; fixture test passes.

## 16. Strict recommendations

1. Keep production unchanged.
2. Tune limits before production.
3. Consider a distributed/Redis limiter before scale.
4. Continue the remaining Phase 8S items separately.
5. Do not start Phase 9 until the user chooses.
6. Do not claim production readiness.

## 17. Next task

User chooses the next priority:

- `PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1`, or
- `PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1`, or
- `PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1`.
