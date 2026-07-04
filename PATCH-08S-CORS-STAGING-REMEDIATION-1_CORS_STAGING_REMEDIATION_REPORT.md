# PATCH-08S-CORS-STAGING-REMEDIATION-1 — CORS Staging Fail-Closed Remediation Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-CORS-STAGING-REMEDIATION-1

**Purpose:** Approved narrow runtime security remediation for the confirmed
critical CORS failure found by the (uncommitted) PATCH-08S-STAGING-SECURITY-SMOKE-1
attempt. Staging reflected an arbitrary unknown origin together with
`Access-Control-Allow-Credentials: true`. This patch makes staging/production
CORS **fail closed** so unlisted origins are never reflected and never receive a
credentialed CORS grant.

Scope discipline — this patch changes **CORS response behavior only**:

- No security-header implementation (other than the CORS origin/credentials decision).
- No rate-limit implementation.
- No tenant isolation implementation.
- No logging/redaction implementation.
- No Langfuse change.
- No DB/Supabase change, no migrations, no RLS, no auth change.
- No package/dependency changes (no installs).
- No deployment.
- No Phase 9 / Phase 10 / Phase 11 work.
- No Phase 8 memory reopening.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit (base):** `f5a9d4b PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1 add security scaffold`
- **Working tree:** clean except the four known deferred untracked paths.
- **Phase 8:** closed. **Phase 8S gates so far:** design, route inventory,
  policy fixture, tenant isolation, secrets/env/logging, headers/CORS/rate-limit
  scaffold — all complete. **Staging smoke:** FAILED and was correctly not
  committed. **Memory:** inactive.

## 3. Live failure being remediated (safe summary)

- Unknown `Origin: https://phase8s-smoke.invalid` was **reflected** as
  `access-control-allow-origin: https://phase8s-smoke.invalid`.
- `access-control-allow-credentials: true` was observed.
- Affected: `OPTIONS /health`, `OPTIONS /login`, `GET /health`.
- No secrets, tokens, or response bodies are included in this report.

## 4. Root cause

In `server.js`, `buildAllowedOrigins()` returned the string `"*"` whenever
`CORS_ORIGIN` / `ALLOWED_ORIGINS` were unset (the staging condition). The cors
origin callback then executed `if (allowedOrigins === "*") return callback(null, true)`
while `credentials: true` was configured. `callback(null, true)` tells the cors
library to **reflect the request Origin**, and with credentials enabled this
emitted `Access-Control-Allow-Credentials: true` for **any** origin — arbitrary
credentialed CORS reflection.

## 5. Remediation summary

CORS origin/credentials decisions were extracted into a pure, deterministic
helper `security/cors-policy.js` and wired into `server.js` via
`app.use(cors(buildCorsOptionsDelegate(process.env)))`. The new behavior:

- **Staging/production require an explicit allowlist.** `CORS_ORIGIN` /
  `ALLOWED_ORIGINS` are parsed as comma-separated exact origins (trimmed, empties
  ignored).
- **Missing or `"*"` allowlist outside local/dev fails closed.** Unknown browser
  origins receive `{ origin: false, credentials: false }` — no
  `Access-Control-Allow-Origin` and no `Access-Control-Allow-Credentials`.
- **Unknown origins are rejected and never reflected** in staging/production.
- **Credentials remain tied to an explicit exact origin match** outside local/dev;
  an allowlisted origin is reflected exactly (not wildcarded) with credentials.
- **Local development remains explicitly bounded:** loopback origins
  (`localhost` / `127.0.0.1` / `[::1]`) and any explicit allowlist entries are
  allowed; the permissive wildcard default applies **only** in local/dev.
- **Render markers force non-local classification** (`RENDER`,
  `RENDER_SERVICE_NAME`, `RENDER_EXTERNAL_URL`, `RENDER_INSTANCE_ID`) so hosted
  staging fails closed even if `NODE_ENV=development` there — this is exactly the
  observed staging condition.
- **No-Origin requests** (server-to-server / curl / same-origin) remain allowed
  but receive no credentialed browser grant (there is no origin to reflect).
- The helper logs nothing and exposes no env values; `summarizeCorsPolicy()`
  reports counts/booleans only.

## 6. Files changed

- `server.js` — removed the inline `buildAllowedOrigins()` + unsafe origin
  callback; added the import of and delegation to the CORS policy helper (minimal
  change, CORS block only).
- `security/cors-policy.js` — new pure CORS policy helper module.
- `tests/patch-08s-cors-staging-remediation-1.test.mjs` — new focused test.
- `PATCH-08S-CORS-STAGING-REMEDIATION-1_CORS_STAGING_REMEDIATION_REPORT.md` — this report.
- `knowledge/CURRENT_STATE.md` — updated.

## 7. Tests added

`tests/patch-08s-cors-staging-remediation-1.test.mjs` (pure helper tests, no
server start, no HTTP, no env vars, no env-value printing) asserts: allowlist
parsing (trim/empty/`"*"`); environment classification (Render forces non-local;
development is local); production/staging fail-closed for unknown origin; `"*"`
config fails closed; the exact staging (Render) condition reflects nothing for an
unknown origin and grants no credentials (reproduces and fixes the live failure);
explicit allowlisted origins are allowed with credentials and exact reflection;
no-Origin requests are allowed without a credentialed grant; local dev is bounded
(loopback allowed, wildcard permissive **only** locally, not on staging/prod);
`summarizeCorsPolicy` exposes no env values; the helper and server.js no longer
contain the unsafe `allowedOrigins === "*" → callback(null, true)` pattern; and
the remediation is CORS-scoped (no memory/Phase 9/10/11 coupling).

## 8. Validation results

```text
node tests/patch-08s-cors-staging-remediation-1.test.mjs
PASS - 12 passed, 0 failed, 42 assertions

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
GATE PASSED - 0 failed (run with the patch staged; several Phase 7B/Phase 8
diff-guard suites assert an empty unstaged `git diff --name-only`, so the gate
is run with tracked changes staged — the established repo convention)
```

Note: `server.js` is not a `guard:files` protected file and is not in any
diff-guard's forbidden list (`package.json`, `pipeline.js`, `ask-handler.js`,
`retrieval-engine.js`, `source-card-engine.js`, `source-availability-engine.js`).
The diff guards simply require tracked edits to be staged before the gate runs.

## 9. Deployment requirement

This patch **must be deployed to staging** before PATCH-08S-STAGING-SECURITY-SMOKE-1
is rerun. If Render auto-deploys from the pushed branch, the smoke rerun must
occur **only after the new deploy is live**. This report does **not** claim the
live CORS exposure is fixed — only that the code now fails closed; post-deploy
smoke must confirm that an unknown origin is no longer reflected with credentials.
An explicit `CORS_ORIGIN` allowlist (the real frontend origin[s]) should be
configured in the Render staging environment so legitimate browser clients are
allowed; without it, staging correctly denies all browser origins.

## 10. Remaining Phase 8S status

- PATCH-08S-STAGING-SECURITY-SMOKE-1 must be **rerun** after deployment.
- Phase 8S **final closure remains blocked** until the staging smoke is PASS or
  an acceptable WARNING.
- Tenant isolation remains policy/gate-only (still mandatory before Phase 9).
- Secrets/env/logging remains policy/gate-only (still mandatory before Phase 9).
- Security headers and rate limits remain policy/scaffold-only — **except** this
  CORS remediation, which is now runtime.
- **Phase 9 remains blocked.**

## 11. Prohibited claims

This patch does **not** claim: all security hardening complete; security headers
implemented; rate limits implemented; tenant isolation implemented; logging
redaction implemented; Langfuse egress fixed; query-secret risk fixed; Phase 9
unblocked; persistent memory active; Phase 8 memory active.

## 12. Final decision

```text
CORS STAGING REMEDIATION PASS WITH STRICT RECOMMENDATIONS
```

## 13. Strict recommendations

1. Deploy this patch to staging.
2. Rerun PATCH-08S-STAGING-SECURITY-SMOKE-1 after deployment.
3. Confirm an unknown origin is no longer reflected with credentials.
4. Configure explicit allowed staging/frontend origin values (`CORS_ORIGIN`) in Render if browser clients must be allowed.
5. Do not proceed to Phase 8S final closure until staging smoke is PASS or acceptable WARNING.
6. Keep security headers and rate limits as future approved implementation items unless separately patched.
7. Keep tenant isolation and secrets/env/logging gates in force.
8. Keep Phase 8 memory inactive.
9. Keep Phase 9 blocked pending Phase 8S final closure.

## 14. Next required task

After this remediation is committed, pushed, and **deployed to staging**, rerun:

```text
PATCH-08S-STAGING-SECURITY-SMOKE-1  (rerun)
```

Do not start it inside this patch.
