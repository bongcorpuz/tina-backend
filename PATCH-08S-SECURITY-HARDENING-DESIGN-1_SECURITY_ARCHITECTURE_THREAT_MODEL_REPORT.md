# PATCH-08S-SECURITY-HARDENING-DESIGN-1 — Security Architecture / Threat-Model Report

## 1. Patch name and purpose

**Patch:** PATCH-08S-SECURITY-HARDENING-DESIGN-1

**Purpose:** Establish the Phase 8S security architecture and threat model for TINA
as a **report-only design patch** before Phase 9 (Professional Workflow
Co-Pilot) begins.

This patch is design-only. It contains:

- No runtime implementation.
- No middleware wiring.
- No `server.js` / route / auth / CORS / header / rate-limit / logging runtime changes.
- No Supabase/DB runtime changes.
- No `package.json` / `package-lock.json` changes and no dependency installs.
- No environment-variable, Render/Vercel, or deployment changes.
- No production changes.
- No Phase 9 / Phase 10 / Phase 11 work.
- No reopening of Phase 8 memory.

It defines the threat model, data-sensitivity classes, trust boundaries,
severity-ranked findings, pre-Phase-9 blockers, and the non-negotiable fixture
policies that later Phase 8S patches must implement and test.

## 2. Reviewers and decisions

- **Claude Code (Opus) — baseline security architecture / threat-model review:**
  **DESIGN PASS WITH STRICT RECOMMENDATIONS**
- **Gemini — independent adversarial review:**
  **ADVERSARIAL DESIGN PASS WITH STRICT RECOMMENDATIONS**

**Controlling rule:** Where the Gemini adversarial review is stricter than the
Claude baseline, **Gemini controls.** This report adopts Gemini's stricter
calibrations, notably: tenant/client isolation elevated to a CRITICAL
pre-Phase-9 architectural risk; Supabase service-role use treated as a CRITICAL
design risk when used as the default path for user/client/matter data; a
dedicated tenant-isolation gate added to the Phase 8S sequence; and the
chat-context carryover issue moved out of Phase 8S into a separate diagnostic.

## 3. Base repo state

- **Branch:** `feature/source-availability-engine-v1`
- **Sync:** `0 0` (local and origin identical)
- **Latest commit:** `958ec6f PATCH-08L-PHASE-8-FINAL-CLOSURE-GATE-1 close Phase 8`
- **Working tree:** clean except the four known deferred untracked paths
  (`.vscode/`, `evaluation/factcheck/`, `tests/TINA_Adversarial_Test_Set_PH_Tax.md`,
  `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`), which remain untouched.
- **Phase 8:** formally closed.
- **Phase 8 memory:** inactive — `memory-boundaries/` is contract-only, all
  `TINA_ENABLE_MEMORY_*` flags remain default-OFF, and there is no memory
  persistence, DB/Supabase memory schema, runtime consent, or pipeline/frontend
  memory integration.

## 4. Executive summary

Phase 8S is a necessary security-hardening gate inserted **after** Phase 8 and
**before** Phase 9. TINA's backend today is a **defensible baseline** — it is a
single Express application fronting an OpenAI + Supabase RAG/reasoning pipeline,
with JWT + bcrypt authentication applied to all twelve mode routes and to the
admin/index routes, and with no secrets committed to the repository. Phase 8
memory is correctly inactive.

However, the backend is **not ready for Phase 9 client-confidential workflows.**
Phase 9 will generate and handle tax memos, BIR replies, protest letters, audit
defense matrices, compliance calendars, checklists, client advisories, and
working-paper support — introducing client names, TINs, registration facts,
financial/audit figures, and legal/tax strategy into the same routes, logs, DB,
and third-party egress paths that currently lack rate limiting, security
headers, an enforced CORS allowlist, log redaction, consistent production error
handling, and — most importantly — any tenant/client isolation model.

Phase 8S must therefore be **policy-first and fixture/test-driven**: encode the
security policies as fixtures and tests, formalize a route inventory with drift
tests, design a mandatory tenant-isolation model, and only then scaffold and
(in later gated patches) wire runtime controls. **No runtime fixes are included
in this patch.**

## 5. Threat model scope — protected assets

- Backend API (Express app and its route surface).
- Authentication and session data (JWTs, bcrypt password hashes, session IDs).
- User prompts and conversation history.
- Client-confidential data (client identities, matter facts).
- TINs and tax registration facts.
- Financial and audit data.
- Legal/tax strategy (audit-defense positions, protest arguments, risk analysis).
- Generated professional documents (Phase 9 work product).
- Source corpus and authority metadata (integrity of NIRC/RR/RMC/jurisprudence).
- Supabase/Postgres data.
- OpenAI/model prompts and outputs.
- Langfuse / third-party observability data.
- Logs and diagnostics.
- Secrets and environment credentials.

## 6. Trust boundaries

1. **Browser/frontend → backend API** — crosses via CORS policy + JWT bearer
   token. Current weakest link: CORS default of wildcard-with-credentials.
2. **Backend → OpenAI / model provider** — outbound egress of assembled prompts
   (prompt assembly occurs in engines, not `server.js`); user data leaves the
   trust zone.
3. **Backend → Supabase / Postgres** — via **service-role key**, which bypasses
   row-level security. All DB access is server-mediated.
4. **Backend → Google Drive / source corpus** — ingestion via a service account.
5. **Backend → Langfuse / third-party observability** — outbound egress of
   query/answer content and token metadata when `LANGFUSE_*` is configured.
6. **Render/Vercel environment → runtime** — environment variables are the
   secret store; no dedicated vault.
7. **User/client/matter data → logs/diagnostics** — `console.*` output and
   health/debug routes are an internal → operator boundary that can leak
   sensitive data into platform log aggregation.
8. **Future Phase 9 document generation and storage** — generated work product
   will cross backend → frontend and backend → storage boundaries at the
   highest sensitivity level and must be access-controlled and integrity-protected.

## 7. Data sensitivity classification

| Class | Examples | Handling requirement |
|---|---|---|
| **P0 — Secrets/credentials** | `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `INDEX_SECRET`, `LANGFUSE_SECRET_KEY` | Never logged, never in URLs, never in responses; fail-fast if missing |
| **P1 — Client-confidential data** | client names, TINs, registration facts, financial/audit figures, uploaded document excerpts | Redact in logs; no unclassified third-party egress; requires tenant isolation in Phase 9 |
| **P1 — Legal/tax strategy** | audit-defense positions, protest arguments, risk assessments | Same as P1 confidential; access-controlled |
| **P2 — User prompts / conversation history** | mode-route queries, conversation records, account fields (email/mobile/company) | Auth-scoped; redact identifiers in logs |
| **P2 — Generated work product** | memos, BIR replies, protest letters, defense matrices, calendars, advisories | Auth-scoped; access control + integrity in Phase 9 |
| **P3 — Diagnostic/internal traces** | stack traces, DB identity, Render/instance metadata, pid | Never exposed in production responses |
| **P4 — Public legal/source data** | NIRC/RR/RMC text, jurisprudence | Integrity-protected; users cannot forge or upgrade authority |

## 8. Attack surface inventory summary

Known route categories observed in `server.js` and `routes/`:

- **Public routes (no auth):** `GET /`, `GET /routes`, `GET /health`,
  `POST /register`, `POST /login`, and the implicit 404/global error handlers.
  `/`, `/routes`, and `/health` are verbose and aid reconnaissance.
- **Authenticated mode routes (JWT):** `POST /ask /tax /review /quiz /diagnostic
  /source /audit /case /debug /patch /progress /feedback` — each mounts
  `authenticate` then `attachForcedHook` then `askHandler`. Also
  `POST /conversations`, `GET /conversations`, `GET /conversations/:id/messages`.
- **Admin / index routes (auth OR shared secret):** `GET /index-drive`,
  `/reindex`, `/admin/index-drive`, `/reindex-targeted`, `/index-status`,
  `/list`, `/read-drive`, `/vector-stats` — guarded by
  `allowAuthenticatedOrIndexSecret`.
- **Diagnostic/debug routes:** `GET /debug/db-identity` (guarded; discloses
  infrastructure metadata), plus the authenticated `POST /debug` mode route.
- **Expensive model/retrieval/DB routes:** all twelve mode routes (OpenAI +
  retrieval + DB), plus the index/reindex routes (Drive ingestion + DB writes).

**A formal, authoritative route inventory is required in
PATCH-08S-SECURITY-ROUTE-INVENTORY-1.** This report's inventory is a non-binding
summary only; the binding classification, guard mapping, and drift tests are
deferred to that patch.

## 9. STRIDE threat model

**Spoofing** — JWT-based identity with bcrypt(12) password hashing. Residual
risks: no token revocation/rotation story; `INDEX_SECRET` accepted via URL query
string (leaks into logs and browser/proxy history); CORS wildcard-with-credentials
enables credentialed cross-origin requests. **Source-authority spoofing:**
user-supplied "authority references" must never be trusted as verified
citations.

**Tampering** — The Supabase service-role key bypasses RLS, so any injection or
logic flaw operates with full DB privileges with no RLS backstop. Request bodies
are accepted up to a large limit with extended urlencoded parsing. Source-corpus
integrity depends on Drive/service-account trust.

**Repudiation** — No structured, tamper-evident security audit log of
admin/index actions or authentication failures; only `console.*` logging exists.

**Information disclosure** — Public `/health` reveals environment, model, commit
SHA, service name, and which secrets are configured; `/` and `/routes` enumerate
the admin surface (including `?secret=YOUR_SECRET` hints); several route `catch`
blocks return raw `error.message` regardless of `NODE_ENV`; Langfuse egress
transmits query/answer content.

**Denial of service** — **No rate limiting on any endpoint.** Every authenticated
mode route triggers OpenAI + retrieval + DB work; `/login` and `/register` are
exposed to credential-stuffing/brute-force; large request bodies amplify cost.
Reindex routes are DB-lock-guarded (good) but still triggerable.

**Elevation of privilege** — Registration hardcodes `role:"user"` server-side
(no body-driven escalation). Residual risks: `INDEX_SECRET` grants a synthetic
`role:"admin"` identity with no per-action scoping; **no tenant/client isolation**
— any authenticated user's JWT reaches all mode routes, and multi-client data
isolation is undefined and must be designed before Phase 9.

**LLM-specific risks:**

- **Prompt injection** — user input and retrieved content can attempt to alter
  model behavior or extract system context.
- **Source-authority spoofing** — attempts to make TINA treat user-provided text
  as verified legal authority.
- **User-provided fake citation/source references** — must not create citations
  or source cards or upgrade `sourceAvailability` / Authority Lock state.
- **Source card / citation fabrication attempts** — output-integrity risk.
- **Retrieval query manipulation** — crafted queries attempting to poison or
  bias retrieval.
- **Diagnostic trace leakage** — model/pipeline diagnostics must not expose
  internal traces or secrets to users.

## 10. Key findings and severity table

| # | Finding | Severity |
|---|---|---|
| 1 | Tenant/client/matter isolation architecture missing (required before Phase 9) | **CRITICAL** |
| 2 | Supabase service-role key as the default access path for user/client/matter data | **CRITICAL** |
| 3 | CORS wildcard-with-credentials (default `*` with `credentials:true`) | **HIGH** |
| 4 | No rate limiting on auth/model/retrieval/index endpoints | **HIGH** |
| 5 | Log / PII leakage (content-referencing `console.*` sites, no redaction) | **HIGH** |
| 6 | Langfuse / third-party egress without enforced redaction | **HIGH** |
| 7 | `INDEX_SECRET` accepted via URL query string | **HIGH** |
| 8 | Prompt / source-authority spoofing surface | **HIGH** |
| 9 | Public `/health` and `/routes` reconnaissance disclosure | **MEDIUM** |
| 10 | Raw `error.message` disclosure in route handlers | **MEDIUM** |
| 11 | Lack of security-header middleware | **MEDIUM** |
| 12 | No formal route inventory / drift test | **MEDIUM** |
| 13 | Dependency / `npm audit` posture not yet gated | **MEDIUM** |
| 14 | Staging/production boundary drift risk | **MEDIUM** |

**Calibrated severity rationale (Gemini controlling):**

- **CRITICAL** is reserved for the two architectural risks that must be resolved
  before Phase 9 can safely handle client data: (1) tenant/client isolation and
  (2) service-role key use as the default path for user/client/matter data.
- **Service-role calibration (disciplined wording):** Supabase service-role
  access **may be acceptable only for tightly controlled server-only
  administrative / source-corpus operations.** It is **not** acceptable as the
  default access path for user/client/matter data in Phase 9 without
  tenant-scoping, RLS, or an equivalent isolation model.
- **HIGH** covers exploitable exposure that must be closed before Phase 9: CORS,
  rate limiting, log/PII leakage, third-party egress, `INDEX_SECRET` in query,
  and prompt/source-authority spoofing.
- **MEDIUM** covers hardening and hygiene items that reduce reconnaissance and
  disclosure risk and must be addressed within Phase 8S.

## 11. Pre-Phase-9 blockers

Phase 9 (Professional Workflow Co-Pilot) **must not begin** until the following
Phase 8S patches have passed:

1. PATCH-08S-SECURITY-ROUTE-INVENTORY-1
2. PATCH-08S-SECURITY-POLICY-FIXTURE-1
3. PATCH-08S-TENANT-ISOLATION-GATE-1
4. PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1
5. PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1
6. PATCH-08S-STAGING-SECURITY-SMOKE-1
7. PATCH-08S-FINAL-CLOSURE-GATE-1

**Minimum bar:** at least the **tenant isolation**, **logging/egress redaction**,
**CORS**, and **rate-limit** policies must be approved before Phase 9 starts.

## 12. Non-negotiable future fixture policies

Later Phase 8S patches must encode and test these as hard requirements:

- Route inventory drift must fail tests.
- Every route must be classified public / authenticated / admin / debug /
  expensive.
- No admin/debug route without a guard.
- No wildcard CORS with credentials.
- Production CORS must fail closed without an explicit allowlist.
- Admin/index secrets must not be accepted via URL query string (header only).
- Model / retrieval / index / auth endpoints require a rate-limit policy.
- Logs must redact P0, P1, and P2 data.
- Production error responses must not expose raw `error.message` or stack traces.
- Langfuse / third-party egress requires a redaction and data-classification
  policy, defaulting off for P1 data.
- Supabase service-role use must be constrained to server-only administrative /
  source-corpus operations.
- User/client/matter data requires tenant/client isolation via RLS or an
  equivalent model.
- User-provided sources cannot create authority, citations, or source cards, and
  cannot upgrade `sourceAvailability` / Authority Lock state.
- No Phase 8 memory flags enabled.
- No Phase 10/11 implementation leakage.
- Security flags/policies must fail closed where applicable.

## 13. Phase 8S roadmap

Final Phase 8S sequence:

1. PATCH-08S-SECURITY-HARDENING-DESIGN-1 — security architecture / threat-model report (this patch).
2. PATCH-08S-SECURITY-ROUTE-INVENTORY-1 — formal route inventory, classification, guard classification, and drift tests.
3. PATCH-08S-SECURITY-POLICY-FIXTURE-1 — encode CORS, headers, rate limits, logging, secrets, error disclosure, tenant isolation, and authority-spoofing policies.
4. PATCH-08S-TENANT-ISOLATION-GATE-1 — mandatory tenant/client/matter isolation design before Phase 9.
5. PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1 — secrets, env validation, log redaction, third-party egress, and error-disclosure policy.
6. PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1 — scaffold policies for headers, CORS, and rate limits.
7. PATCH-08S-STAGING-SECURITY-SMOKE-1 — staging-only security smoke (no production deploy unless separately approved).
8. PATCH-08S-FINAL-CLOSURE-GATE-1 — close Phase 8S, then proceed to Phase 9.

## 14. Separate Phase 8X diagnostic

**PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1**

**Purpose:** Diagnose the short-term chat/session context carryover issue
observed in the live UI (e.g., after "is tobacco subject to VAT?", the follow-up
"how about fresh frozen seafood?" was treated as standalone/non-tax instead of
inheriting VAT context).

**Classification:**

- This is **not** persistent memory.
- This is **not** Phase 8 memory.
- This is **not** a Phase 8S security patch.
- This is **not** fixed in this patch.
- It should be run as a **separate parallel diagnostic** before Phase 9,
  independent of Phase 8S security hardening.

## 15. Out-of-scope boundaries

Explicitly excluded from this patch:

- Runtime security implementation.
- `package.json` / `package-lock.json` changes and dependency installs.
- Middleware wiring.
- Deployment (Render/Vercel).
- Environment-variable changes.
- Phase 8 memory enablement.
- Persistent memory.
- Phase 9 workflow implementation.
- Phase 10 source / currentness / court-metadata work.
- Phase 11 observability / performance work.
- Phase 7B clarification boundary tuning (remains a separate pre-production-ON
  follow-up; not part of Phase 8S).

## 16. Required validation

Commands run for this design patch:

```text
npm run guard:files       → PASS (no protected files modified)
npm test                  → GATE PASSED (0 failed)
node tests/patch-08s-security-hardening-design-1.test.mjs → PASS (optional design test)
```

Full security-control tests are **not** required in this patch; they are
deferred to the later Phase 8S fixture/scaffold/smoke patches.

## 17. Final design decision

```text
DESIGN PASS WITH STRICT RECOMMENDATIONS
```

## 18. Strict recommendations

1. Phase 8S proceeds design-first and fixture-first.
2. No runtime security changes until policies and the route inventory are approved.
3. The route inventory is the first substantive follow-up (PATCH-08S-SECURITY-ROUTE-INVENTORY-1).
4. Tenant/client isolation is mandatory before Phase 9.
5. CORS and rate-limit policies are mandatory before Phase 9.
6. Secrets / logging / redaction / third-party egress policies are mandatory before Phase 9.
7. Prompt / source-authority spoofing policy is mandatory before Phase 9.
8. Phase 8 memory remains inactive.
9. Phase 9 remains the Professional Workflow Co-Pilot (unchanged, not renamed or replaced).
10. Phase 10 and Phase 11 remain deferred.
11. The chat-context carryover issue moves to PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1, separate from Phase 8S.

## 19. Next required task

If this design patch passes:

```text
PATCH-08S-SECURITY-ROUTE-INVENTORY-1
```

Do not start it inside this patch.
