# PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-STAGING-SMOKE-1

## 1. Patch name and purpose

**PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-STAGING-SMOKE-1** — INDEX_SECRET Query-Removal Staging Smoke.

Purpose: verify, with live evidence against Render staging, that commit `77f8160`
(PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1) is deployed and behaving as designed — query-string
INDEX_SECRET authorization is rejected on protected routes (including all five recognized aliases), header-based
authorization (`X-TINA-INDEX-SECRET`, `Authorization: Bearer`) is the only supported path, no secret is echoed,
and all prior Phase 8S hardening remains intact. This patch is **non-runtime**: it records evidence only.

## 2. Base repo state

```
branch: feature/source-availability-engine-v1
sync:   0 0 (relative to origin/feature/source-availability-engine-v1)
latest commit (pre-check): 77f8160 PATCH-08S-FOLLOWUP-INDEX-SECRET-QUERY-REMOVAL-1 remove query-string index secret auth
untracked (deferred, untouched): .vscode/, evaluation/factcheck/, tests/TINA_Adversarial_Test_Set_PH_Tax.md,
tests/TINA_Tax_FactCheck_Answer_Key_v2.md
```

Pre-check matched the expected state exactly. No repo drift was observed.

## 3. Staging target

`https://tina-backend-staging.onrender.com`

## 4. Deployment freshness

**Method: behavioral match** (`behavioral_match_77f8160_query_secret_rejected`), **not** a Render
dashboard/log commit confirmation.

Public `/health` no longer exposes `commitSha` by design (commit `0b5b336`), so no public commit hash was
available to check directly, and this smoke did not have Render dashboard/API access.

Instead, freshness was confirmed by strong behavioral evidence:

- `security/index-secret-auth.js` was newly created in commit `77f8160` — confirmed via
  `git show 77f8160^:security/index-secret-auth.js`, which fails with *"exists on disk, but not in `77f8160^`"*.
- The live rejection body returned by staging for a query-string secret is **exactly**
  `{"error":"unauthorized","message":"Index authorization must be supplied using an approved header."}` — the
  literal output of `sanitizeIndexAuthFailure()` in that new file.
- All five recognized aliases (`secret`, `indexSecret`, `INDEX_SECRET`, `token`, `key`) are rejected with this
  exact body, matching the described post-77f8160 behavior precisely.

This is a strong behavioral match but is recorded as such, not as a Render-confirmed deployment.

## 5. Probe summary

| Probe | Result |
|---|---|
| GET /health | 200, `{"status":"ok","service":"tina-backend"}`, all required headers present, X-Powered-By absent |
| GET /routes | 404, `{"error":"not_found"}` |
| GET / | 200, `{"success":true,"name":"TINA Backend","message":"Backend is running."}`, no usefulRoutes |
| OPTIONS /ask | 204, not 429, origin `https://tina-fawn.vercel.app` reflected, credentials true |
| POST /ask (unauthenticated) | 401, `{"error":"Authentication required"}` |
| Query-secret rejection (5 aliases) | all 401, safe body, no echo, no protected payload |
| Header auth (X-TINA-INDEX-SECRET) | SKIPPED — no safe staging secret supplied |
| Bearer auth (Authorization: Bearer) | SKIPPED — no safe staging secret supplied |
| Missing/wrong secret | 401, falls through to JWT auth (`{"error":"Authentication required"}`) |
| Stale hint check | not live-checked (write route avoided); source-confirmed removed |

## 6. Query-secret rejection finding

- **Route tested:** `GET /index-status` (read-only protected route; avoided `/index-drive`, `/admin/index-drive`,
  `/reindex`, `/reindex-targeted`).
- **Aliases tested:** `secret`, `indexSecret`, `INDEX_SECRET`, `token`, `key` — all 5.
- **Status codes:** 401 for all 5 aliases.
- **Safe rejection body (identical for all 5):**
  ```json
  {"error":"unauthorized","message":"Index authorization must be supplied using an approved header."}
  ```
- **No secret echo:** confirmed — the submitted synthetic value never appeared in any response body.
- **Protected route payload not returned:** confirmed — no `indexing`/`vectorStore` fields were present in any
  rejection response.
- **No operation performed:** confirmed — the rejection occurs before route-handler logic runs (per
  `security/index-secret-auth.js` source and matching live behavior).

## 7. Header auth finding

**Skipped.** No safe staging `INDEX_SECRET` value was available to this smoke. Per the task's safety rules
(do not store the actual secret, do not put the secret in a URL, do not paste/store authorization headers), no
attempt was made to obtain or use one. `headerValueStored: false`. `authorized: skipped`.

## 8. Bearer auth finding

**Skipped**, same reason as header auth. `authorizationHeaderStored: false`. `authorized: skipped`.

## 9. Missing/wrong secret finding

`GET /index-status` with no `X-TINA-INDEX-SECRET` header, and separately with a wrong synthetic header value,
both fell through to the existing JWT `authenticate()` middleware and returned `401
{"error":"Authentication required"}`. No protected operation executed; no secret echoed.

## 10. Stale hint finding

Not live-checked: the historical `?secret=YOUR_SECRET` hint lived in the `/reindex` full-reindex-started response
body, a write-triggering route this smoke deliberately avoided. Source-confirmed removed via
`git show 77f8160 -- server.js`, which shows:

```
-    statusUrl: "/index-status?secret=YOUR_SECRET"
+    statusUrl: "/index-status (send X-TINA-INDEX-SECRET header)"
```

The stale hint also did not appear in any of the live responses actually observed during this smoke (health,
routes, root, ask, index-status rejections).

## 11. Preserved hardening

All confirmed live and unregressed:

- `/health` minimal liveness-only body, 200.
- `/routes` 404 `{"error":"not_found"}`, no inventory.
- Root `/` — no `usefulRoutes`, no inventory.
- Security headers present: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Cache-Control.
- X-Powered-By absent on all observed responses.
- `/ask` unauthenticated protected (401).
- OPTIONS /ask not blocked (204, not 429); no CORS regression.

## 12. Security/privacy finding

- No secret, token, cookie, or Authorization header value was stored anywhere in the fixture, test, report, or
  this conversation.
- No query-string secret values were stored (synthetic placeholder text only).
- No real client data, TINs, or financial statements were used.
- No admin/index write routes were executed (`/index-drive`, `/admin/index-drive`, `/reindex`,
  `/reindex-targeted` were not triggered).
- No load testing, brute forcing, or account creation performed.
- Production was not accessed or touched.

## 13. Limitations

- Header auth success (`X-TINA-INDEX-SECRET`) and bearer auth success (`Authorization: Bearer`) were **skipped**
  because no safe staging secret was supplied to this smoke.
- Deployment freshness relies on behavioral match, not a Render dashboard/log commit confirmation, because public
  `/health` no longer exposes `commitSha` by design.
- No secret rotation performed.
- Internal caller migration (n8n/scripts/manual curl) to `X-TINA-INDEX-SECRET` is not verified by this smoke.
- Tenant isolation, full logging redaction, third-party/Langfuse egress controls, and Phase 9 request-size policy
  remain open and are out of scope for this patch.
- This smoke is **not** a production readiness assessment.

## 14. Validation results

```
node tests/patch-08s-followup-index-secret-query-removal-staging-smoke-1.test.mjs
  PASS / 25 passed, 0 failed, 73 assertions

node tests/patch-08s-followup-index-secret-query-removal-1.test.mjs
  PASS / 32 passed, 0 failed, 105 assertions

node tests/patch-08s-followup-backend-routes-health-minimization-staging-smoke-1.test.mjs
  PASS / 21 passed, 0 failed, 78 assertions

node tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs
  PASS / 19 passed, 0 failed, 77 assertions

node tests/patch-08s-followup-backend-security-headers-rate-limits-staging-smoke-1.test.mjs
  PASS / 18 passed, 0 failed, 67 assertions

node tests/patch-08s-followup-backend-security-headers-rate-limits-1.test.mjs
  PASS / 23 passed, 0 failed, 1055 assertions

node tests/patch-08x-chat-context-carryover-final-gate-1.test.mjs
  PASS / 17 passed, 0 failed, 127 assertions

node tests/patch-08s-final-closure-gate-1.test.mjs
  PASS / 22 passed, 0 failed, 203 assertions

npm run guard:files
  PASS: No protected files modified

npm test
  GATE PASSED — Syntax checks: 10 run, 0 failed. Test suites: 144 run, 0 failed.
```

## 15. Final decision

**INDEX SECRET QUERY REMOVAL STAGING SMOKE WARNING WITH STRICT RECOMMENDATIONS**

Rationale: query-string secret rejection is fully confirmed live across all 5 aliases with a safe, non-echoing
body and no protected-payload leakage, and deployment freshness is behaviorally confirmed. However, header auth
(`X-TINA-INDEX-SECRET`) and bearer auth (`Authorization: Bearer`) success could not be tested live because no
safe staging secret was supplied — per the decision rules, this combination is WARNING, not PASS.

## 16. Strict recommendations

1. Keep production unchanged.
2. Migrate n8n/scripts/manual curl callers to the `X-TINA-INDEX-SECRET` header.
3. Do not use query-string secrets going forward.
4. Consider secret rotation after migration if URL-leakage risk (logs, browser history, proxies) is material.
5. Continue tenant isolation / logging redaction / egress hardening as separate, dedicated patches.
6. Proceed to `PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1` only after this smoke is committed.
7. Do not claim production readiness.

## 17. Next task

**PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1** (user chooses priority). If the user wants header/bearer
auth success confirmed live first, a narrow follow-up smoke using a safe staging-only secret (supplied
out-of-band, never pasted into chat/fixture/report) can close that gap before Phase 9A design begins.
