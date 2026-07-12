# PHASE-10A4-PRE1 Deployment Mapping Summary (Sanitized)

## Vercel Account / Team

- Vercel account: `bongcorpuz`
- Team/org: `bongcorpuzs-projects` (internal team ID redacted)
- Authentication: existing browser/CLI session already trusted by Vercel; no token was created, printed, or committed by this task.

## Projects Found

| Project | Production URL | Notes |
| --- | --- | --- |
| `tina-ai` | `https://tina-ai.vercel.app` | Name-matches `C:\Projects\tina-ai` repo. Treated as primary. Internal project ID redacted. |
| `tina` | `https://app.tina.bentoph.com` | Custom domain on `bentoph.com` (verified owned by same Vercel account). Legacy/parallel project connected to the same GitHub repo. Internal project ID redacted. |
| `tina-landing` | (not inspected) | `https://tina.bentoph.com` | Marketing/landing site, unrelated to the authenticated app. Out of scope. |

Both `tina-ai` and `tina` receive deployments from the same GitHub repository (`bongcorpuz/tina-ai`) and both produced a Preview deployment for commit `1748788` at the same time (~9h before this task ran), confirming duplicate/parallel project wiring rather than a single canonical project.

## GitHub Repository

- Repo: `bongcorpuz/tina-ai` (public)
- Default branch: `main` (confirmed via GitHub public API `default_branch` field)
- This corroborates `main` as the production branch for the connected Vercel project(s); Vercel's own per-project "Production Branch" setting was not independently viewable via CLI (dashboard-only field), but no evidence contradicts `main`.

## Preview Deployment For Target Commit

`tina-ai` project:

- Deployment/URL identifiers redacted (internal Vercel deployment ID and generated preview URL; not published here since this repository is public).
- Target: `preview` (confirmed, not production)
- Status: Ready
- Build log confirms: `Cloning github.com/bongcorpuz/tina-ai (Branch: phase-10a3-r1-trust-persistence-accessibility, Commit: 1748788)` — exact match to expected frontend HEAD `1748788ee5314eb495710f9b281ab6621b943109`.
- The deployment ID matches the GitHub commit status target recorded in the PHASE-10A4 report (`Vercel - tina-ai`), confirming it is the same deployment previously observed as inaccessible dashboard-only metadata.

`tina` project:

- Deployment/URL identifiers redacted (same reason as above).
- Target: `preview`
- Not further inspected (secondary/legacy project; `tina-ai` is primary).

## Deployment Protection

Confirmed via direct HTTP request to the `tina-ai` preview URL:

```
HTTP/1.1 302 Found
Location: https://vercel.com/sso-api?url=...&nonce=...
Set-Cookie: _vercel_sso_nonce=...
```

This is Vercel's standard "Vercel Authentication" (SSO) deployment protection. It is **enabled** on preview deployments for this project. Effect:

- A browser session already authenticated to the `bongcorpuzs-projects` Vercel team can pass through automatically (same mechanism that allowed the CLI `whoami`/`link` calls in this task to succeed without a manual token).
- A plain HTTP client (curl, headless script without cookies) is redirected to the SSO wall and cannot reach the app.
- Automated/headless testing (e.g., a browser-automation PHASE-10A4 executor) will need either (a) a real authenticated browser session under this Vercel account, or (b) a project-owner-issued "Protection Bypass for Automation" secret (a dashboard-configured value; existence not checked, generation not attempted — out of scope for this task, and doing so from the CLI without owner sign-off was avoided).

## Backend Environment Variables (Names Only)

`tina-ai` project, via `vercel env ls`:

| Name | Environments | Value |
| --- | --- | --- |
| `VITE_API_BASE` | Preview, Production | Encrypted (not extracted) |
| `VITE_API_URL` | Preview, Production | Encrypted (not extracted) |

Per task instructions, values were **not** extracted, printed, or pulled to a local file — an attempt to run `vercel env pull` was blocked by the environment's own safety controls before execution, consistent with "do not print environment-variable values."

Indirect corroborating evidence: the committed `vercel.json` CSP `connect-src` directive allow-lists both `https://tina-backend-staging.onrender.com` and `https://tina-backend-y11x.onrender.com`, meaning the built frontend is capable of reaching either host depending on which `VITE_API_*` value was baked in at build time for the Preview environment. **Which one is actually used by the Preview build was not empirically confirmed** — this must be verified during the PHASE-10A4 rerun itself (via authenticated browser Network-tab inspection), or the project owner can confirm the Preview-scoped value out of band.

## Staging Backend Health (Public, Non-Authenticated)

- `https://tina-backend-staging.onrender.com/health` → `200 { "status": "ok", "service": "tina-backend" }`. Reachable and healthy. No production API was called.

## Staging Test Account

No sanitized staging test account is documented anywhere in either repository (`tina-backend`, `tina-ai`) — searched commit history, `knowledge/CURRENT_STATE.md`, prior PHASE-10A reports, and source. The frontend authenticates against a custom `${API_BASE}/login` endpoint (not a third-party IdP); the backend exposes a registration route. No account was created during this task, because doing so would mutate staging state and requires the user's explicit go-ahead on what sanitized identity/role to use — this is left as an explicit follow-up, not fabricated or assumed.

## Local Artifacts Produced By This Task

- `C:\Projects\tina-ai\.vercel\project.json` — project/org IDs only, not a secret, left in place, already covered by `.gitignore`.
- `C:\Projects\tina-ai\.env.local` — Vercel OIDC token created by `vercel link`. Gitignored, untracked, not committed. Left in place (deleting it was declined by this session's own safety controls since it wasn't explicitly named by the user for deletion).
- `C:\Projects\tina-ai\.gitignore` — one-line addition confirming `.vercel` and `.env*` exclusion (was already effectively covered by an existing `.env*` pattern). Safe to commit if the user wants the explicit `.vercel` line preserved.
