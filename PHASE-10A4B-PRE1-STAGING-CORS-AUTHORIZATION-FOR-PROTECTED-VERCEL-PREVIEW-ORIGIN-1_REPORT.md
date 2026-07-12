# PHASE-10A4B-PRE1 Staging CORS Authorization for the Protected tina-ai Vercel Preview Origin

Decision: **PHASE 10A4B PRE1 PASS WITH STRICT RECOMMENDATIONS**

Governance: **LIVE EVIDENCE > THEORY > PATCH.** The fix is verified live: preflight matrix against staging + a real browser smoke with CORS enforced (not disabled).

Model/speed: Claude Code — Sonnet 5 — medium. Timestamp (UTC): 2026-07-12T07:41:33Z.

## Preflight
- Runtime vars present (boolean only). Backend `feature/source-availability-engine-v1` start HEAD `65f9a34`, sync `0 0`, `c766c01`+`1715ef9` ancestors, untracked unchanged. Frontend HEAD `1748788`, main untouched, `.gitignore` M preserved. Dev Factory `9167002`.

## Root cause
`security/cors-policy.js` authorizes only exact origins from the staging `CORS_ORIGIN`/`ALLOWED_ORIGINS` env allowlist and fails closed otherwise (correct). The allowlist contained the production origin but **not** the ephemeral, per-deployment Vercel Preview origin, so the browser blocked all credentialed Preview→staging requests. Staging CORS config lives in the Render dashboard (no committed `render.yaml`).

## Selected remediation (decision order)
- **Priority 1 (config: add the stable Preview alias to staging `ALLOWED_ORIGINS`)** is the ideal, narrowest fix but requires Render dashboard access not available to the executor. **Recommended owner follow-up.**
- **Priority 3 (strictly constrained canonical tina-ai Preview-host validation, code)** was implemented as the narrowest self-contained, deployable, testable path.

Change in `security/cors-policy.js`: a **staging-only** authorization branch for the owner-team-anchored, SSO-protected tina-ai Preview origin. Gated on **server-injected Render markers** (`RENDER_SERVICE_NAME`/`RENDER_EXTERNAL_URL`), **not** the client `Host` header. `https`-only; anchored to the owner's globally-unique Vercel team suffix; `tina-` project prefix; exact `$` hostname anchors block suffix/lookalike injection. Reflects **only** the specific pattern-validated origin (never a wildcard with credentials). **Never applies on production.**

### Why narrower/safer than alternatives
- Not arbitrary `*.vercel.app` — team + project + https + exact anchors.
- Production CORS unchanged (staging-gated; verified live).
- No wildcard-with-credentials; no arbitrary Origin reflection.
- Fails closed for unknown/malformed/http/wrong-team/non-vercel.
- No ephemeral private hostname embedded in code — only the stable, public project+team policy shape.

### Rejected alternatives
- Priority 1/2 (env allowlist): correct and narrower, but env is Render-dashboard-only (no access, no `render.yaml`). Recommended as owner tightening.
- Priority 4 (broad runtime change): unnecessary.

## Policy-security analysis
Credentials are granted only to explicitly approved origins; unknown origins fail closed with no `Access-Control-Allow-Origin`; scheme + hostname validated; staging/production separation preserved; no env values or private hostnames logged.

## Test matrix (live preflight against staging)
| Case | Status | Allow-Origin granted | Credentials | Verdict |
| --- | --- | --- | --- | --- |
| Approved protected Preview | 204 | yes (matches origin) | true | PASS |
| Production frontend origin | 204 | yes | true | PASS (unchanged) |
| Unknown Vercel origin | 404 | no | — | PASS (denied) |
| Malformed lookalike | 404 | no | — | PASS (denied) |
| HTTP (not HTTPS) | 404 | no | — | PASS (denied) |
| Non-Vercel origin | 404 | no | — | PASS (denied) |
| localhost/dev origin | 404 | no | — | PASS (denied on staging) |

Unit tests: `tests/phase-10a4b-pre1-staging-cors-preview-origin-1.test.mjs` — 11 tests / 21 assertions, all pass; existing `patch-08s` CORS tests preserved (12 pass).

## Actual browser smoke (CORS enforced, NOT disabled)
Real headless Chrome, web security **enabled**, bypass cookie for the protected Preview, staging only:
- UI login through the actual form: **succeeded** (token present, authenticated shell loaded)
- One sanitized authenticated `GET /conversations` from the browser: **`200`**
- **0** CORS console/log errors; **0** "Cannot connect" errors
- Screenshot (sanitized, username redacted to "User"): `screenshots/authenticated-preview-smoke.png`

## Regression
Functional trust-contract suites pass. The prior-phase **file-scope guards** (`git diff --name-only HEAD`) failed only while my change was uncommitted; **all pass after commit** (clean tree). One **pre-existing, unrelated** failure remains — `phase-09zf`'s self-referential last-commit guard, which fails for any HEAD that is not the 09ZF commit (also fails at baseline `65f9a34`); **not introduced here**. Gate status excluding that pre-existing artifact: **PASS**.

## Production safety
Only `api.github.com`, the non-production Preview, and `tina-backend-staging.onrender.com` were contacted. The production origin was used **only** as an Origin header on a staging preflight (control) — **no** production API/deployment/data. Pushing to the feature branch triggered a **staging** redeploy (target env for this branch); no production deploy. Frontend main untouched.

## Code/config changes
- `security/cors-policy.js` — narrow staging-only preview authorization (runtime code modified: **yes**, sanctioned by the task patch policy).
- `tests/phase-10a4b-pre1-staging-cors-preview-origin-1.test.mjs` — new unit tests.
- Committed `4600fb2`, pushed; staging redeployed and the fix is live.

## Findings
- **P0/P1:** none.
- **P2:** the code authorization is team-SCOPED (owner-team tina-* previews, incl. sibling "tina" project) — broader than the ideal exact-origin config. Tighten via priority-1 env allowlist when Render access is available.
- **P3:** staging gate relies on Render service identifiers (re-verify if renamed). Gate-hygiene: repair the pre-existing `phase-09zf` self-referential guard.

## Is PHASE-10A4B rerun ready?
The CORS blocker is resolved and verified live. **PHASE-10A4B representative rendered validation can be re-run** (against the CORS-authorized preview) — **after** the mandatory independent review of this remediation. `phase10A4BRerunAuthorized` remains **false** pending that review.

## Phase status
Phase 10A **OPEN**; 10B **BLOCKED**; 10C **BLOCKED**. Phase 10A not marked complete.

## Exact independent-review prompt
> Use Opus 4.8 at low speed. Independently review PHASE-10A4B-PRE1 (staging CORS authorization for the protected tina-ai Vercel Preview origin), commit `4600fb2`. Verify from the code and committed evidence: root cause (exact-allowlist CORS with the Preview origin absent) is correct; the `security/cors-policy.js` change authorizes the Preview origin ONLY on the staging runtime (gated on server-injected Render markers, never the client Host header), is https-only and owner-team+project anchored, reflects only the specific validated origin, introduces no wildcard-with-credentials and no arbitrary Origin reflection, embeds no ephemeral private hostname or secret, and leaves production CORS behavior unchanged; the live preflight matrix is correct (approved preview granted+credentialed; production preserved; unknown/malformed/http/non-vercel/localhost denied); the real browser smoke succeeded with CORS ENFORCED (login + one authenticated GET /conversations = 200, zero CORS errors, screenshot sanitized); unit tests cover approved and rejected origins and existing CORS tests are preserved; the only regression-gate failure (`phase-09zf`) is a pre-existing self-referential guard unrelated to this task; no production API/deployment/data was contacted and frontend main is untouched. Confirm whether the decision PASS WITH STRICT RECOMMENDATIONS is justified, whether to require tightening to an exact-origin env allowlist (priority 1), and confirm that PHASE-10A4B representative rendered validation may proceed after this review. Keep phase10A4BRerunAuthorized false until you pass this review. Do not authorize Phase 10A/10B/10C.

## Evidence
`evaluation/results/phase-10a4b-pre1-staging-cors-authorization-for-protected-vercel-preview-origin-1.json` (main) and `.../phase-10a4b-pre1-staging-cors-authorization-for-protected-vercel-preview-origin-1/` → `cors-policy-analysis.json`, `remediation-decision.json`, `preflight-results.json`, `browser-smoke-results.json`, `regression-results.json`, `production-safety-summary.json`, `security-scan-summary.json`, `screenshots/authenticated-preview-smoke.png`.
