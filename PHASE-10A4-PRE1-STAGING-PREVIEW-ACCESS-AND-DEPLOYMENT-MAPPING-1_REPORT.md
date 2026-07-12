# PHASE-10A4-PRE1 Staging Preview Access And Deployment Mapping 1 Report

Decision: **PHASE 10A4 PRE1 BLOCKED**

This is a partial-BLOCKED result: substantial deployment-mapping progress was made relative to PHASE-10A4 (which had no mapping evidence at all), but two hard prerequisites — automated access past deployment protection, and a sanitized staging test account — remain outstanding and require project-owner action, not further investigation.

## Repository State

Backend: `C:\Projects\tina-backend`, branch `feature/source-availability-engine-v1`, HEAD `9180041e26b31c63aaf5a266addc134d00f2ec74`, sync `0 0`. Untracked items unchanged (`.vscode/`, `evaluation/factcheck/`, two `tests/*.md`).

Frontend: `C:\Projects\tina-ai`, branch `phase-10a3-r1-trust-persistence-accessibility`, HEAD `1748788ee5314eb495710f9b281ab6621b943109`, sync `0 0`. No merge or commit to `main`.

## Deployment Investigation

Vercel CLI authentication succeeded using this environment's existing trusted session (no token requested, printed, or committed). Two Vercel projects are connected to `github.com/bongcorpuz/tina-ai` (internal project IDs redacted below — this report is committed to a public repository):

- `tina-ai` — production URL `https://tina-ai.vercel.app`. Treated as primary (name-matches the repo).
- `tina` — production URL `https://app.tina.bentoph.com` (custom domain on `bentoph.com`, confirmed owned by the same account). Legacy/parallel project; noted as a governance cleanup item but not further investigated.

GitHub's public API confirms `default_branch: main` for `bongcorpuz/tina-ai`, corroborating `main` as the production branch (Vercel's own per-project Production Branch setting is dashboard-only and was not independently read).

Both projects auto-produced a **Preview** (not Production) deployment for the target commit, confirming feature branches do not deploy to production.

## Approved Preview Deployment

`tina-ai` preview deployment for the target commit (internal deployment ID and generated preview/branch-alias URLs redacted — available to the project owner via the Vercel dashboard, not published in this public repository):

- Target: `preview`, Status: `Ready`
- Build log: `Cloning github.com/bongcorpuz/tina-ai (Branch: phase-10a3-r1-trust-persistence-accessibility, Commit: 1748788)` — exact match to the expected frontend HEAD.
- The deployment ID matches the GitHub commit status target (`Vercel - tina-ai`) previously cited in the PHASE-10A4 report as an inaccessible dashboard-only URL. It is now confirmed to be this specific preview deployment.

This resolves PHASE-10A4's original P1 finding ("approved authenticated frontend staging/preview URL unavailable") — the preview **exists** and is **not production**.

## Deployment Protection

Confirmed enabled: an unauthenticated request to the preview URL returns `302` to `https://vercel.com/sso-api` (Vercel Authentication / SSO), with a `_vercel_sso_nonce` cookie set. This is the mechanism that also let the CLI `whoami`/`link` calls in this task succeed transparently — the session already carried a trusted Vercel identity.

Effect: any human or agent with an authenticated browser session under the `bongcorpuzs-projects` Vercel account can load the preview. A plain HTTP client or headless script without such a session cannot. **No bypass token was generated, requested, or printed by this task.**

## Backend Environment Mapping

`vercel env ls` confirms `VITE_API_BASE` and `VITE_API_URL` are defined for both Preview and Production environments in `tina-ai`, both `Encrypted`. Values were **not** extracted — an attempt to `vercel env pull` the Preview-scoped values to a local file was blocked by this session's own safety controls before it ran, consistent with the "do not print environment-variable values" instruction.

The committed `vercel.json` CSP `connect-src` allow-lists both `https://tina-backend-staging.onrender.com` and a second host (`https://tina-backend-y11x.onrender.com`), so the Preview build is capable of reaching either. **Which one the Preview build actually uses was not empirically confirmed** and must be verified during the PHASE-10A4 rerun (Network-tab inspection in an authenticated browser) or confirmed out-of-band by the project owner.

`https://tina-backend-staging.onrender.com/health` was independently re-verified: `200 { "status": "ok", "service": "tina-backend" }`. No production API was called.

## Staging Test Account

No sanitized staging test account is documented anywhere in either repository. The frontend authenticates against a custom `${API_BASE}/login` endpoint; the backend exposes a registration route. No account was created during this task — doing so would mutate staging state and requires the user's explicit choice of a sanitized identity, which is outside this task's read/map-only scope.

## Limited Health Check

- URL resolves: yes. TLS valid: yes.
- Frontend shell load: **blocked** — the deployment-protection SSO redirect prevents an unauthenticated/headless request from reaching the app. This is expected behavior for a protected preview, not a defect.
- No production endpoint was contacted at any point.

## Security Result

No tokens, cookies, passwords, JWTs, or environment values were printed, exposed, or committed. `vercel link` created a local `.env.local` (Vercel OIDC token) and `.vercel/project.json`; both are gitignored and untracked, and neither was committed. Two separate actions in this task — pulling decrypted env values, and reading raw local Vercel credential storage — were both blocked by the session's own safety controls before execution. `.gitignore` was updated to add an explicit `.vercel` line (the `.env*` pattern already existed); this is the only frontend change under consideration for commit, and it contains no secret material.

## Remaining Blockers

1. **Protection Bypass for Automation** (or equivalent authenticated-browser access) must be provided or configured by the project owner before an automated/headless PHASE-10A4 executor can load the preview.
2. **A sanitized staging test account** must be created or provided.
3. **Preview build's actual backend target host** must be confirmed as `tina-backend-staging.onrender.com`.

None of these three requires further investigation — each requires a decision or credential from the project owner (the user).

## Findings

| Severity | Finding | Status |
| --- | --- | --- |
| P0 | None | Clear |
| P1 | Deployment protection blocks automated/headless preview access | Owner action required |
| P1 | No sanitized staging test account exists | Owner action required |
| P2 | Preview's actual backend target not empirically confirmed | Verify during rerun or via owner confirmation |
| P2 | Two parallel Vercel projects (`tina-ai`, `tina`) connected to the same repo | Governance cleanup item, non-blocking |
| P3 | Vercel Production Branch setting not directly read via CLI (dashboard-only) | Inferred from GitHub default_branch, uncontradicted |

## Recommendation

PHASE-10A4 may **not** yet be rerun. Deployment mapping is now substantially resolved (a major improvement over PHASE-10A4's total blocker), but the rerun cannot proceed "without ambiguity" per this task's own success criteria while the protection-bypass path, test account, and backend-target confirmation remain open. The next action is for the user to either:

(a) provide/generate a Vercel Protection Bypass for Automation secret and a sanitized staging test account, or
(b) authorize an authenticated-browser-based manual walkthrough (using the already-trusted Vercel session) in place of headless automation for the PHASE-10A4 rerun, plus authorize creation of a sanitized test account.

Phase 10A remains OPEN. Phase 10B and Phase 10C remain blocked.

## Mandatory Independent Review Prompt

Use Opus 4.8 at low speed. Review PHASE-10A4-PRE1-STAGING-PREVIEW-ACCESS-AND-DEPLOYMENT-MAPPING-1 as a deployment-governance prerequisite task. Verify: backend HEAD `9180041e26b31c63aaf5a266addc134d00f2ec74` and frontend HEAD `1748788ee5314eb495710f9b281ab6621b943109` match expected with `0 0` sync; the `tina-ai` Vercel project preview deployment (internal ID redacted in the public repo, available via Vercel dashboard) genuinely corresponds to commit `1748788` on branch `phase-10a3-r1-trust-persistence-accessibility`; deployment protection (Vercel SSO) is genuinely enabled and was not bypassed; no environment-variable values, tokens, or cookies were exposed or committed; no staging test account was fabricated; no production deployment or API call occurred; the BLOCKED classification is justified given the three remaining owner-action blockers; Phase 10A correctly remains open and Phase 10B/10C correctly remain blocked; the next required action is owner-provided (bypass secret + test account), not further agent investigation.
