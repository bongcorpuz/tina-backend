# PATCH-08S-SECURITY-ROUTE-INVENTORY-1 — Route Inventory Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-SECURITY-ROUTE-INVENTORY-1

**Purpose:** Create a formal, test-enforced security route inventory that
classifies every currently mounted backend route and verifies the inventory does
not drift from the actual Express route declarations. The inventory is the
foundation for the later Phase 8S policy fixture, tenant-isolation gate,
secrets/logging safety gate, and headers/CORS/rate-limit scaffold.

This is a **fixture / test / report / CURRENT_STATE patch only**:

- No runtime implementation and no middleware wiring.
- No `server.js` / route / auth / CORS / header / rate-limit / logging behavior changes.
- No `package.json` / `package-lock.json` changes and no dependency installs.
- No DB/Supabase, environment, Render/Vercel, or deployment changes.
- No production changes.
- No Phase 9 / Phase 10 / Phase 11 work.
- No Phase 8 memory reopening.

## 2. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0`
- **Latest commit (base):** `70d7684 PATCH-08S-SECURITY-HARDENING-DESIGN-1 add security threat model design`
- **Working tree:** clean except the four known deferred untracked paths
  (`.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`,
  `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`), untouched.
- **Phase 8:** closed. **Phase 8S design:** complete. **Memory:** inactive.

## 3. Route inventory summary

**Total routes inventoried: 30** (29 declared routes + 1 terminal 404 fallback).

By category:

- **Public: 6** — `GET /`, `GET /routes`, `GET /health`, `POST /register`,
  `POST /login`, plus the `fallback-404` handler.
- **Authenticated (conversation): 3** — `POST /conversations`,
  `GET /conversations`, `GET /conversations/:conversationId/messages`.
- **Mode: 12** — `POST /ask /tax /review /quiz /diagnostic /source /audit /case
  /debug /patch /progress /feedback`.
- **Admin/index: 5** — `GET /index-drive`, `/reindex`, `/admin/index-drive`,
  `/reindex-targeted`, `/index-status`.
- **Admin/read: 3** — `GET /list`, `/read-drive`, `/vector-stats`.
- **Debug: 1** — `GET /debug/db-identity`.

Cross-cutting counts:

- **Expensive operation routes: 22** — all 12 mode routes, all 8 admin
  index/read routes, `GET /debug/db-identity`, and `GET /health` (which performs
  a DB read via `getVectorStoreStats`).
- **Model/retrieval routes: 12** — all mode routes.
- **DB read possible: 20**; **DB write possible: 6** (`/register`, `/login`,
  `/conversations` POST, and the four index/reindex routes).
- **Indexing routes: 4** — `/index-drive`, `/reindex`, `/admin/index-drive`,
  `/reindex-targeted`.
- **Third-party egress possible: 15** — 12 mode routes (OpenAI + optional
  Langfuse) and 3 Drive-touching admin routes (`/index-drive` group counts 4
  indexing + `/list` + `/read-drive`; net distinct egress routes = 12 mode + 4
  indexing + `/list` + `/read-drive`).
- **Routes requiring `tenant_isolation`: 17** — all conversation, mode, and auth
  routes.
- **Routes requiring `log_redaction`: all 30** entries name it where user/admin
  content or diagnostics may be logged.
- **Routes requiring `rate_limit`: 29** (every declared route; the fallback names
  recon/error policies only).

## 4. Public route findings

- **`GET /`** and **`GET /routes`** — unauthenticated banner + full route
  enumeration, including admin routes advertised with `?secret=YOUR_SECRET`
  hints. Reconnaissance surface; require `route_recon_minimization`.
- **`GET /health`** — unauthenticated, and it performs a **DB read** via
  `getVectorStoreStats` (marked `expensiveOperation`), while disclosing
  environment, model, commit SHA, service name, and which secrets are configured.
  Requires `rate_limit`, `route_recon_minimization`, `log_redaction`,
  `error_sanitization`.
- **`POST /register`** — role hardcoded server-side to `"user"` (no body-driven
  privilege escalation); bcrypt(12). Abuse/enumeration target — needs strict
  `rate_limit`.
- **`POST /login`** — generic failure message; updates last-login metadata (DB
  write). Credential-stuffing target — needs strict `rate_limit` + lockout.

Auth endpoints are classified `public` (routeGroup `auth`, `publicExposure:true`,
`authRequired:false`) per the design guidance, because they are the pre-auth
entry points.

## 5. Authenticated route findings

- **Conversation routes** (`POST/GET /conversations`,
  `GET /conversations/:conversationId/messages`) — `authenticate`-guarded and
  user-scoped via `getUserId`. Message content becomes P1-sensitive once Phase 9
  begins. Require `auth_guard`, `rate_limit`, `log_redaction`,
  `tenant_isolation`, `error_sanitization`.
- **Mode routes** (12) — all `authenticate` + `attachForcedHook` + `askHandler`;
  each triggers the full RAG pipeline (OpenAI + retrieval + DB) with third-party
  egress to OpenAI and, when configured, Langfuse. All marked
  `expensiveOperation:true`, `modelCallPossible:true`, `retrievalPossible:true`,
  `thirdPartyEgressPossible:true`, `logsUserContentPossible:true`,
  `sensitivityClass:MIXED`, `phase9Risk:high`. Require `rate_limit`,
  `log_redaction`, `tenant_isolation`, `third_party_egress_redaction`,
  `prompt_injection_control`, `authority_spoofing_control`, `error_sanitization`,
  `request_size_limit`. `/source` in particular carries authority-spoofing risk;
  `/audit` and `/case` carry legal/tax-strategy sensitivity.

## 6. Admin/index/debug route findings

- **Index/reindex routes** (`/index-drive`, `/reindex`, `/admin/index-drive`,
  `/reindex-targeted`) — `allowAuthenticatedOrIndexSecret`-guarded; DB writes +
  Google Drive egress; DB-lock-guarded against concurrent runs. Require
  `admin_guard`, `rate_limit`, `log_redaction`, `error_sanitization`,
  `route_recon_minimization`, and **`no_query_secret`** (the guard currently
  accepts `INDEX_SECRET` via `req.query.secret`, which leaks into logs/history).
- **Admin read routes** (`/list`, `/read-drive`, `/vector-stats`,
  `/index-status`) — Drive egress and/or DB reads; `/read-drive` returns file
  text previews (also `request_size_limit`).
- **`GET /debug/db-identity`** — admin-or-secret guarded; discloses Supabase
  project ref/host, Render instance metadata, and pid. Requires `debug_guard`,
  `admin_guard`, `error_sanitization`, `route_recon_minimization`,
  `log_redaction`, `no_query_secret`.

## 7. Guard posture findings

- **Public by design:** `GET /`, `GET /routes`, `GET /health`, `POST /register`,
  `POST /login`, and the 404 fallback — no route-level guard.
- **Guarded (authenticate):** all 3 conversation routes and all 12 mode routes
  (statically confirmed `authenticate` mounted before `attachForcedHook`).
- **Guarded (allowAuthenticatedOrIndexSecret):** all 8 admin index/read routes
  and `GET /debug/db-identity`.
- **Needs later stronger policy:** admin routes need header-only secret
  (`no_query_secret`); public recon routes need minimization; the global error
  handler sanitizes `error.message` only when `NODE_ENV=production`, while
  several route `catch` blocks return raw `error.message` regardless of
  environment (→ `error_sanitization`).
- **Unknown/warning items:** none — every mounted route was classified. No route
  is left `unknown`. **No route claims security hardening is implemented.**

## 8. Expensive operation findings

Routes that may trigger model calls, retrieval, DB reads/writes, indexing, or
third-party egress are all marked `expensiveOperation:true`: the 12 mode routes
(model + retrieval + DB + OpenAI/Langfuse egress), the 4 indexing routes (DB
write + Drive egress), the 4 admin read/status routes (DB read and/or Drive
egress), `GET /debug/db-identity` (DB read), and `GET /health` (DB read). These
require `rate_limit` in a later patch, and the egress/logging routes require
`log_redaction` and `third_party_egress_redaction`.

## 9. Sensitivity and Phase 9 readiness findings

The 12 mode routes and the conversation routes rise to **high** Phase 9 risk once
professional workflows generate tax memos, BIR replies, protest letters, audit
defense matrices, compliance calendars, checklists, advisories, and working
papers — introducing client-confidential data (P1), legal/tax strategy (P1), and
generated work product (P2) into the same request/response/log/egress paths.
**Tenant/client/matter isolation is mandatory before Phase 9** and is flagged on
all 17 user/client/matter-touching routes via the `tenant_isolation` future
policy. Generated work product will additionally need access control and
redaction policies (deferred to the tenant-isolation and secrets/logging gates).

## 10. Drift test design

`tests/patch-08s-security-route-inventory-1.test.mjs` is fully static:

- It **reads** `server.js` and `routes/*-route.js` as text (via `readFileSync`)
  and **does not import** `server.js`, routes, `auth.js`, the pipeline, or any
  runtime module; it does not start the server, bind ports, or call
  OpenAI/Supabase/Drive/Langfuse; it reads no `process.env.<NAME>`.
- It extracts declared routes with two regexes —
  `app.(get|post|put|delete)("<path>"` from `server.js` and
  `attachForcedHook("<hook>")` from each route file — and reconciles them against
  the fixture **in both directions**: every declared route must have an inventory
  entry, and every non-fallback inventory entry must map to a declared route.
- It validates fixture shape (required fields, unique ids, unique method+path),
  the guard/classification/policy rules (public exposure, mode expensiveness,
  admin `no_query_secret`, debug `debug_guard`, `tenant_isolation`), and the
  Phase-8-memory-inactive / no-Phase-9/10/11 / 08X-separation invariants.
- A self-check asserts the test file imports no runtime/server modules and reads
  no env vars.

Result: **21 tests / 0 failed / 1193 assertions.**

## 11. Limitations

- The inventory is **static/source-based**; there is no live route probing and no
  runtime behavior observation.
- Field values (e.g. `dbReadPossible`, `thirdPartyEgressPossible`) are derived
  from reading the handlers and their imports, not from runtime tracing.
- No security control is implemented; every `requiredFuturePolicies` entry
  describes work for later Phase 8S patches.
- The global error handler and `express.json`/`urlencoded` body-limit middleware
  are described in the fixture `guardModel`/notes and report but are not route
  entries; the 404 fallback is the only middleware included as an entry.

## 12. Validation results

```text
node tests/patch-08s-security-route-inventory-1.test.mjs
PASS - 21 passed, 0 failed, 1193 assertions

npm run guard:files
PASS - No protected files modified

npm test
GATE PASSED - 10 syntax checks + all suites, 0 failed
```

## 13. Final decision

```text
ROUTE INVENTORY PASS WITH STRICT RECOMMENDATIONS
```

## 14. Strict recommendations

1. The route inventory must remain test-enforced.
2. Future route drift (added/removed/renamed routes, or changed guards) must fail
   the drift test.
3. The route inventory must feed the next patch, PATCH-08S-SECURITY-POLICY-FIXTURE-1.
4. Public `/health` and `/routes` require a reconnaissance-minimization policy.
5. Auth endpoints (`/register`, `/login`) require a stricter rate-limit (and
   lockout) policy.
6. Mode / model / retrieval routes require rate-limit and log-redaction policies.
7. Admin/index routes require `admin_guard`, header-only secret (`no_query_secret`),
   and rate-limit policies.
8. Debug/diagnostic routes require `debug_guard` and error-sanitization policies.
9. Tenant/client isolation remains mandatory before Phase 9.
10. No runtime security changes until policies are approved.
11. Phase 8 memory remains inactive.
12. Phase 9 remains the Professional Workflow Co-Pilot.
13. The chat-context carryover issue remains PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1,
    separate from Phase 8S and not persistent memory.

## 15. Next required task

```text
PATCH-08S-SECURITY-POLICY-FIXTURE-1
```

Do not start it inside this patch.
