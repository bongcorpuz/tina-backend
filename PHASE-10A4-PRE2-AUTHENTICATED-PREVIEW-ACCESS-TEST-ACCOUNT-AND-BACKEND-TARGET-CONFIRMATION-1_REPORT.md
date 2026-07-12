# PHASE-10A4-PRE2 Authenticated Preview Access, Test Account, and Backend-Target Confirmation (rerun 1)

Decision: **PHASE 10A4 PRE2 PASS WITH STRICT RECOMMENDATIONS**

Governance applied: **LIVE EVIDENCE > THEORY > PATCH.** This report is generated from live evidence captured during a single clean re-execution. The prior PRE2 draft was **not** treated as controlling evidence; every claim below was re-established this session.

Execution timestamp (UTC): **2026-07-12T03:29:03Z**
Environment: **AUTHENTICATED_PREVIEW_STAGING**

## Result Summary

| Step | Item | Result |
| --- | --- | --- |
| 1 | Runtime variables present (boolean only) | **PASS** — all three present |
| 2 | Access protected non-production Preview via approved bypass | **PASS** — `200` after `307` handshake |
| 3 | Preview remains protected without bypass | **PASS** — `302` to Vercel SSO |
| 4 | Authenticate to staging (username/password) | **PASS** — `200`, `success:true`, token present |
| 5 | One sanitized general-tax `/ask` | **PASS** — `200`, answer length 575 |
| 6 | Request goes only to `tina-backend-staging` | **PASS** — only staging contacted |
| 7 | Create/confirm related conversation | **PASS** — `201`, created |
| 8 | User + assistant turns persisted | **PASS** — both roles present after reopen |
| 9 | List conversations, locate synthetic conversation | **PASS** — found in list |
| 10 | Reopen messages; confirm count and roles | **PASS** — count `2`, roles `user, assistant` |
| 11 | No production host/API/deployment/data contacted | **PASS** |
| 12 | Delete transient jars, bundles, scripts, tokens, traces | **PASS** |

## Secret-Handling Discipline

- The three required runtime variables (`VERCEL_AUTOMATION_BYPASS_SECRET`, `TINA_STAGING_TEST_USERNAME`, `TINA_STAGING_TEST_PASSWORD`) were confirmed present by **boolean presence only**. No value, length, hash, measurement, copy, or derivative was read, printed, or logged.
- The bypass secret was passed to `curl` only via the `x-vercel-protection-bypass` request header sourced from the environment variable — never a command literal.
- Staging credentials were passed to the login request only via environment-variable references inside the JSON body — never literals — and were never printed. Login success is reported as booleans.
- No `.env` file was opened, printed, parsed, or copied.
- No secret value, auth token, cookie, private Preview URL, Vercel deployment/project ID, or raw conversation content appears in this report or any committed artifact. The private Preview host is redacted.
- Correlation uses a one-way SHA-256-derived synthetic reference (`conv-8293b4f99abb`) only; the real conversation id is not emitted.

## Repository State

- Backend: `feature/source-availability-engine-v1`, HEAD `19e45638eec2b576d5456def2531d9ba642b3ac0`. Runtime code **not modified**.
- Frontend: `phase-10a3-r1-trust-persistence-accessibility`, HEAD `1748788ee5314eb495710f9b281ab6621b943109`. **Not** merged to `main`.

## 1. Runtime Variables (PASS)

Boolean presence at process scope: `VERCEL_AUTOMATION_BYPASS_SECRET` present, `TINA_STAGING_TEST_USERNAME` present, `TINA_STAGING_TEST_PASSWORD` present.

## 2–3. Protected Preview Access (PASS)

The private Preview URL for frontend commit `1748788` was resolved via the **public GitHub deployment-status API** (deployment environment `Preview – tina-ai`), because no Vercel CLI session or token is provisioned to this environment. The URL was captured to a transient local file, never printed, and deleted at cleanup.

| Request | HTTP | Meaning |
| --- | --- | --- |
| Unauthenticated (no bypass) | `302` → Vercel SSO | Deployment Protection genuinely enforced |
| Authorized bypass handshake | `307` (sets bypass cookie) | Cookie handshake |
| Authorized final (bypass cookie) | **`200`**, 1 hop, HTML app shell | Authorized access succeeds |

No SSO wall was defeated; access was granted by the owner-provided automation bypass secret exactly as designed, and protection remains enforced for unauthenticated requests.

## 4. Preview Backend Target (PASS — resolves PRE1 P2)

The Preview production bundle (`/assets/index-<contenthash>.js`, 380,484 bytes, fetched with the authorized bypass cookie) was searched for backend hosts:

| Host | Occurrences in Preview bundle |
| --- | --- |
| `tina-backend-staging.onrender.com` | **1 (sole backend host)** |
| `tina-backend-y11x.onrender.com` | **0 (absent)** |

Empirical conclusion: the authenticated Preview build calls **staging only**; the alternate/production host is not compiled into the shipped bundle. `previewBackendTargetConfirmed = true`, `previewUsesStagingBackend = true`.

## 5–10. Staging Smoke (PASS)

Executed against `tina-backend-staging.onrender.com` with credentials sourced only from environment variables:

| Call | HTTP | Sanitized result |
| --- | --- | --- |
| `GET /health` | `200` | `status: ok` |
| `POST /login` | `200` | `success:true`, token present |
| `POST /conversations` | `201` | conversation created |
| `POST /ask` (with `conversationId`) | `200` | answer length 575; response includes `trust` + `sourceCards` metadata |
| `GET /conversations` | `200` | `success:true`; synthetic conversation present in list |
| `GET /conversations/:id/messages` | `200` | count `2`, roles `user, assistant` |

Both the user turn and the assistant turn survived save-and-reopen — conversation persistence and history retrieval validated for the authenticated staging account.

Cold-start note: an initial `POST /login` returned a connection-level failure (no HTTP response), consistent with Render free-tier cold start; it succeeded on warm retry. This is an infrastructure characteristic, not an auth failure.

## 11. Production Isolation (PASS)

Only `tina-backend-staging.onrender.com` (API) and the non-production `preview`-target Vercel deployment were contacted. `tina-backend-y11x.onrender.com`, any production Vercel deployment, and all production data were **never** touched. No production deployment was created; no production API was called.

## 12. Transient Cleanup (PASS)

The Vercel bypass cookie jar, downloaded Preview HTML shell, downloaded JS bundle, the resolved-Preview-URL file, GitHub API response files, and all temporary smoke scripts were deleted. No token capture files were created. Nothing secret was written to a tracked path.

## Findings / Strict Recommendations

| Severity | Finding | Recommendation |
| --- | --- | --- |
| P2 | Preview URL resolution depended on the public GitHub deployment-status API (no Vercel CLI/token provisioned to the agent environment) | Provision a first-party, auditable Vercel bypass-URL path for automated preview verification |
| P2 | Two parallel Vercel projects (`tina-ai`, `tina`) deploy Previews for the same commit (carried from PRE1) | Resolve canonical project as a governance cleanup item |
| P3 | Render staging exhibits free-tier cold-start connection resets on the first heavy POST | Smoke harnesses should tolerate one cold-start retry (implemented this run) |

## Authorization

PHASE-10A4 is **not** authorized by this report. Authorization remains **pending mandatory Opus 4.8 low-speed independent review**. `phase10A4RerunAuthorized = false`.

## Evidence References

- `evaluation/results/phase-10a4-pre2-authenticated-preview-access-test-account-and-backend-target-confirmation-1.json`
- `evaluation/results/phase-10a4-pre2-authenticated-preview-access-test-account-and-backend-target-confirmation-1/execution-summary.json`
- `evaluation/results/phase-10a4-pre2-authenticated-preview-access-test-account-and-backend-target-confirmation-1/sanitized-http-results.json`
- `evaluation/results/phase-10a4-pre2-authenticated-preview-access-test-account-and-backend-target-confirmation-1/security-scan-summary.json`

## Mandatory Independent Review Prompt

Use Opus 4.8 at low speed. Review PHASE-10A4-PRE2 (authenticated preview access, test account, and backend-target confirmation, rerun 1) as a deployment-governance prerequisite. Verify: backend HEAD `19e45638eec2b576d5456def2531d9ba642b3ac0` and frontend HEAD `1748788ee5314eb495710f9b281ab6621b943109` on their expected branches; the three runtime variables were checked by boolean presence only with no value/length/hash/cookie/token/credential/private-URL emitted or committed; the Preview returned `302` unauthenticated and `200` only with the owner-provided bypass header (cookie handshake), with no SSO wall defeated and protection still enforced; the Preview production bundle references `tina-backend-staging.onrender.com` and not `tina-backend-y11x.onrender.com`; the staging smoke executed end-to-end live (login `200`/`success:true`/token → `POST /conversations` `201` → `POST /ask` `200`, 575-char answer with trust+sourceCards → `GET /conversations` shows the synthetic conversation → `GET /conversations/:id/messages` returns 2 messages, roles user,assistant, both turns persisted) and was not fabricated; only staging and a non-production Preview were contacted with no production deployment/API/data touched; runtime code was not modified and frontend was not merged to main; transient artifacts were deleted. Confirm the decision **PASS WITH STRICT RECOMMENDATIONS** is justified and that PHASE-10A4 authorization correctly remains pending this review.
