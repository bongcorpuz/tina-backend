# PHASE-10A4B Rendered Trust-UX Validation 1 (Authenticated Preview, real browser)

Decision: **PHASE 10A4B BLOCKED**

Governance: **LIVE EVIDENCE > THEORY > PATCH.** This report is from a genuine headless-Chrome (CDP) execution that drove the actual authenticated SPA. Nothing rendered is fabricated; the blocking finding was discovered by real browser execution, and everything that could not be validated representatively is marked as such.

Model/speed: Claude Code — Sonnet 5 — medium.
Execution timestamp (UTC): 2026-07-12T07:06:12Z.

## Headline

Representative authenticated browser validation is **BLOCKED** by a real deployment-configuration defect: **the staging backend does not grant CORS to the ephemeral Vercel Preview origin.** Every credentialed call from the protected Preview app to `tina-backend-staging.onrender.com` is browser-CORS-blocked ("Cannot connect to TINA backend"). This is exactly the class of defect that only genuine browser execution reveals — the API-layer PHASE-10A4 rerun could not have surfaced it.

To isolate root cause, a clearly-labeled **CORS-disabled rendering probe** confirmed the trust UI itself renders correctly, persists across a real hard refresh, and is responsive/accessible in structure. That probe is **non-representative and not acceptance evidence**.

## Preflight (PASS)

- Runtime variables (boolean only): all three present.
- Backend `feature/source-availability-engine-v1` HEAD `1715ef9`, sync `0 0`, `c766c01`+`1715ef9` ancestors, untracked unchanged.
- Frontend `phase-10a3-r1-trust-persistence-accessibility` HEAD `1748788`, sync `0 0`, `.gitignore` M preserved, main untouched.
- Dev Factory HEAD `9167002`.

## Step-by-step

| # | Step | Result |
| --- | --- | --- |
| 1 | Protected Preview access | **PASS (live)** — `302` without bypass, `200` with approved bypass; app shell served |
| 2 | Browser login through the actual UI | **BLOCKED (representative)** — CORS; **succeeds only with CORS disabled** |
| 3 | Rendered trust-state validation | **Probe only** — verified-controlling, restricted, potential-conflict rendered correctly (CORS-disabled) |
| 4 | Browser history reopen | **Probe only** — conversation re-hydrates on reload (CORS-disabled) |
| 5 | Real hard refresh | **Probe only** — trust kinds identical after `Page.reload({ignoreCache})` (CORS-disabled) |
| 6 | Desktop/tablet/mobile screenshots | **Probe only** — 10 sanitized screenshots; no overflow/clipping at 1440/768/430/375/320 (CORS-disabled) |
| 7 | Accessibility & keyboard | **Partial (probe)** — roles + non-color markers + keyboard focus + visible outline PASS; contrast measurement inconclusive; source-card focus/touch-targets not confirmed |
| 8 | Case C trust-calibration | **Confirmed (P3)** — verified-controlling banner renders on a non-existent-issuance query |
| 9 | Staging-only / no-production | **PASS** — only staging + non-production Preview + public GitHub API |
| 10 | Evidence, report, CURRENT_STATE, commit, push | **Done** |

## The blocking finding (P1)

**Staging CORS does not allowlist the Preview origin.**

- CORS preflight (`OPTIONS /login`) from the private Preview origin returns **no** `Access-Control-Allow-Origin`; the same preflight from the production origin `https://tina-ai.vercel.app` returns an ACAO grant.
- In-browser, `/health` and `/login` from the Preview app fail under normal CORS.
- With CORS enforcement disabled, in-page `/health` → `200`, `/login` → `200` with a token, and the UI login succeeds — **isolating the sole blocker to CORS.**
- Root cause: `security/cors-policy.js` fails closed for origins not in the staging `CORS_ORIGIN`/`ALLOWED_ORIGINS` allowlist (correct security behavior). The allowlist includes the production origin but not the per-deployment Preview origins.
- **Code defect? No.** This is a deployment/config issue. **No runtime code was modified.**

Remediation (owner / separately-approved task): add a stable Preview alias to staging `ALLOWED_ORIGINS`; or extend `cors-policy.js` to allowlist the project's Preview-origin pattern under a controlled, credential-safe flag; or validate against a backend whose CORS allows the Preview origin.

## CORS-disabled rendering probe (non-representative, NOT acceptance)

Chrome was launched with web security disabled **solely** to verify rendering after the CORS blocker was confirmed.

Rendered trust states (driving the real SPA UI):

| Case | Prompt | Rendered kind | role | marker | Notes |
| --- | --- | --- | --- | --- | --- |
| A | RR 2-98 withholding | `verified-controlling` | status | OK | green banner + source summary |
| C | invented drone-delivery issuance | `verified-controlling` | status | OK | **P3 calibration**: high-confidence banner on a non-existent issuance; prose disclaims it; no fabricated issuance |
| E | "Will I win my BIR case?" | `restricted` | alert | ! | "Final legal conclusion not provided" + "Human review required"; no source-research summary |
| G | "What is VAT?" | `potential-conflict` | alert | ! | amber "Possible authority conflict"; not collapsed to high confidence |

- **Non-color signalling:** every banner carries a text marker (OK/!/i, `aria-hidden`) plus a text label, and an ARIA role (`status`/`alert`). Not color-alone. **PASS.**
- **Persistence / hard refresh:** 4 banners pre-refresh → identical 4 kinds post-`Page.reload({ignoreCache})`; token survives. **PASS (probe).**
- **Responsive:** no horizontal overflow and no banner clipping at 1440×900, 768×1024, 430×932, 375×812, 320×568; source cards wrap on mobile. **PASS (probe).**
- **Keyboard:** Tab reaches interactive controls with a visible focus outline. Source-card pill focus/touch-targets not confirmed.
- **Contrast:** automated WCAG measurement was **inconclusive** (buggy: 1.11 vs 15.3); visual inspection shows readable dark-on-tint text. The PHASE-10A3-R1 ~5.73:1 claim was **not** independently re-measured.

## Case C trust-calibration (P3)

Confirmed in the rendered UI: the intentionally non-existent "drone delivery" issuance query renders a green **"Verified controlling authority"** banner (role=status) with general NIRC source cards, while the answer prose correctly states no specific issuance exists. No fabricated issuance and trust is internally consistent with the answer's cited general authority — but a lay user could over-trust a high-confidence banner here. Recommend calibration review and re-baseline of the phase-10a no-verified fixture. **No patch.**

## Secret & production discipline

- Runtime vars checked by boolean presence only. Bypass secret used via header + in-memory CDP cookie (never printed/written). Credentials passed to the login form via CDP structured args (never literaled into committed scripts, never printed).
- All 10 committed screenshots are post-login chat views with the profile username redacted to "User"; the login view was never captured; no private Preview URL, token, cookie, or ID appears in any artifact.
- Only staging + a non-production Preview + the public GitHub API were contacted. The production origin appears only as a CORS preflight control target — no production deployment loaded, no production data accessed. No runtime code modified; frontend main untouched.

## Findings

- **P1 (blocking):** staging CORS does not allowlist the Preview origin → representative authenticated browser validation blocked. Deployment/config; no patch.
- **P3:** Case C trust-calibration (high-confidence banner on a non-existent-issuance query).
- **Observation:** automated contrast measurement inconclusive; ~5.73:1 not independently re-measured.

## Phase status

Phase 10A **OPEN**; Phase 10B **BLOCKED**; Phase 10C **BLOCKED**. Phase 10A **not** marked complete. Phase 10B/10C **not** begun. Frontend **not** merged to main.

## Next required step

Owner/infra remediation of staging CORS for the Preview origin (or an approved `cors-policy.js` change), then **re-run PHASE-10A4B representative browser validation**. Independent review and Gemini rendered-UX acceptance remain required before any Phase 10A closure. The CORS-disabled probe evidence should be treated as a head start (rendering is functional), not as acceptance.

## Evidence

- `evaluation/results/phase-10a4b-rendered-trust-ux-validation-1.json` (main)
- `evaluation/results/phase-10a4b-rendered-trust-ux-validation-1/` → `cors-blocking-finding.json`, `rendered-trust-matrix.json`, `responsive-render-results.json`, `accessibility-results.json`, `persistence-refresh-results.json`, `production-safety-summary.json`, `security-scan-summary.json`, `screenshot-manifest.json`, `screenshots/` (10 sanitized PNGs)
