# PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-STAGING-SMOKE-1 — Backend Routes and Health Minimization Staging Smoke Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-STAGING-SMOKE-1

**Purpose:** Verify on live Render **staging** that the `/health`, `/routes`, and
root disclosure-minimization from `PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1`
(commit `0b5b336`) is live and safe, and that the previous security-headers /
rate-limit hardening remains intact. Evidence only — no runtime code, env, or
deployment change.

## 2. Base repo state

- **Repo:** `C:/Projects/tina-backend`
- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit:** `0b5b336 PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1 minimize health and route disclosure`
- **Working tree:** clean except the four known deferred untracked paths — untouched.

## 3. Staging target

`https://tina-backend-staging.onrender.com` (production untouched).

## 4. Deployment freshness

**`behavioral_match_0b5b336_public_health_minimized`.** By design, commit `0b5b336`
removed `commitSha` from public `/health`, so freshness is confirmed by a strong
**behavioral match** rather than a public commitSha:

- public `/health` returns only `{"status":"ok","service":"tina-backend"}`;
- public `/routes` returns `404 {"error":"not_found"}`;
- root `/` no longer lists `usefulRoutes`.

All three are the exact behaviors introduced by `0b5b336`, and none was present at
the prior commit `99326e9`.

## 5. Probe summary

| Probe | Method / Path | Status | Result |
|---|---|---|---|
| A | `GET /health` | 200 | PASS — minimal body, all headers, no X-Powered-By, no X-RateLimit (exempt) |
| B | `GET /routes` | 404 | PASS — `{"error":"not_found"}`, no inventory |
| C | `GET /` | 200 | PASS — `{success,name,message}`, no usefulRoutes |
| D | `OPTIONS /ask` | 204 | PASS — not 429; CORS sane |
| E | `POST /ask` (no auth) | 401 | PASS — protected; headers + expensive rate-limit headers |
| F | `GET /favicon.ico` | 404 | PASS — fallback echoes only path/method, no inventory |

## 6. /health finding

- **Status:** `200`.
- **Body shape:** exactly `{"status":"ok","service":"tina-backend"}`.
- **Minimal:** yes.
- **Forbidden fields absent:** yes — none of `commitSha`, version, environment,
  model, embeddings, vector/chunk/source counts, drive preview, `indexSecretEnabled`,
  `adaptiveStack`, `routeModes`, config flags, database details, or `error.message`
  were present.
- **Liveness preserved:** yes — `200`, and no `X-RateLimit-*` headers (confirming
  `/health` remains rate-limit exempt for Render polling).

## 7. /routes finding

- **Status:** `404`.
- **Body shape:** `{"error":"not_found"}`.
- **Route inventory absent:** yes.
- **Module filenames absent:** yes.
- **`?secret=YOUR_SECRET` hints absent:** yes.
- (Carries `X-RateLimit-Limit: 120` — general tier, as expected now that `/routes`
  is no longer special-cased.)

## 8. Root route finding

- **`usefulRoutes` absent:** yes.
- **Route inventory absent:** yes.
- **Secret hints absent:** yes.
- Body: `{"success":true,"name":"TINA Backend","message":"Backend is running."}`.

## 9. Security header findings

All eight required headers present on non-OPTIONS API responses (`/health`,
`/routes` 404, `/ask` 401, `/favicon.ico` 404): Content-Security-Policy,
X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy,
Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Cache-Control (`no-store`).

## 10. X-Powered-By finding

**Absent** on every observed response.

## 11. CSP finding

Present and API-conservative:
`default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`
— no `unsafe-inline` / `unsafe-eval`.

## 12. OPTIONS / CORS finding

`OPTIONS /ask` → **204 (not 429)**; allowlisted origin `https://tina-fawn.vercel.app`
reflected with `access-control-allow-credentials: true`. No CORS regression.

## 13. Unauthenticated /ask finding

`POST /ask` (no auth) → **401** `{"error":"Authentication required"}`. Protected;
all security headers present; no `X-Powered-By`.

## 14. Rate-limit finding

- `/ask` carried `X-RateLimit-Limit: 20` / `Remaining: 19` (expensive tier) — limiter
  active and running before auth.
- `/routes` carried `X-RateLimit-Limit: 120` (general tier).
- `/health` carried **no** `X-RateLimit-*` headers — exempt confirmed.
- `429` was not forced (avoids load testing; the 429 shape is covered by the prior
  focused test).

## 15. Security / privacy finding

No JWTs, cookies, or authorization headers were sent, captured, or stored; no
tokens stored; no real client data/TINs/financial statements — only a synthetic
non-client question. No load testing; no admin/index routes; `INDEX_SECRET` not
tested; production untouched; only short minimal bodies recorded.

## 16. Limitations

- Public `/health` no longer exposes `commitSha`, so deployment freshness relied on
  a Render behavioral match rather than a public commitSha.
- The gated **diagnostic-health endpoint is deferred** (not implemented here).
- Does **not** address: `INDEX_SECRET` query-string removal, tenant/client/matter
  isolation, full logging redaction, third-party/Langfuse egress controls, or the
  Phase 9 request-size policy.
- Not production readiness; production unchanged.

## 17. Validation results

```text
node tests/patch-08s-followup-backend-routes-health-minimization-staging-smoke-1.test.mjs
PASS - 21 passed, 0 failed, 78 assertions

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
GATE PASSED - 0 failed
```

## 18. Final decision

```text
BACKEND ROUTES HEALTH MINIMIZATION STAGING SMOKE PASS WITH STRICT RECOMMENDATIONS
```

Basis: deployment confirmed by behavioral match to `0b5b336`; `/health` 200 minimal
with no forbidden fields; `/routes` 404 with no inventory; root has no `usefulRoutes`;
all security headers present; `X-Powered-By` absent; `OPTIONS /ask` not blocked;
unauthenticated `/ask` protected; no critical security/privacy issue; fixture test
passes.

## 19. Strict recommendations

1. Keep production unchanged.
2. Do not re-expose `commitSha` on public `/health`.
3. If deployment-freshness introspection is needed, create a **gated diagnostic
   health endpoint** in a separate patch.
4. Continue `INDEX_SECRET` query-string removal next.
5. Continue tenant/logging/egress hardening separately.
6. Do not start Phase 9 until `INDEX_SECRET` removal and its smoke are complete per
   the approved sequence.
7. Do not claim production readiness.

## 20. Next task

`PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1` (next in the approved sequence).
