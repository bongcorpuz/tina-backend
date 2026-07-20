# PHASE-10A14-R15 — SECURITY AND SCOPE REVIEW

Base: `768059ccd5248f83fd29ce85be06c7d6f4921a43` → Final runtime: `c38a073b814559d9e02139fcb7c61e310e46bc21`

## Runtime diff (excluding R15 evidence)

```
ask-handler.js                                159 +-
services/answer-support-validator.js          147 +-
services/philippine-tax-boundary-patterns.js   51 +
services/philippine-tax-domain-boundary.js     26 +-
services/runtime-identity.js                   85 +   (new)
services/tax-computation-clarification.js      72 +   (new)
tests/…r15-crash-visible-attempt-journal        260 +   (new)
tests/…r15-semantic-…-persistence-receipt       277 +   (new)
8 files changed, 1030 insertions(+), 47 deletions(-)
```

All eight are inside the authorized allowlist. `services/persistence-receipt.js` was
**not** modified — no independently reproduced defect required it, and its derivation was
already correct.

## Authorization checklist

| Not authorized | Status |
|---|---|
| Alter or delete R13 / R14 / R14-independent-review evidence | not done |
| Recreate the missing R13 COMMIT 3b attempt | not done |
| Recreate the deleted R14 gate logs | not done |
| Backdate any attempt | not done |
| Label recreated evidence as original | not done |
| Modify `.claude/`, `.vscode/`, `evaluation/factcheck/` | not done — untracked and unchanged |
| Modify frontend or `C:\Projects\tina-dev-factory` | not done |
| Production deployment | not done — approved non-production staging only |
| Change runtime model / migrate to GPT-5.6 / temperature / routing | not done — model remains `gpt-4o-mini` |
| Change prompts | not done |
| Change retrieval, reranking, source selection or source cards | not done |
| Source ingestion, corpus/vector/index mutation, reindex, re-embed | not done |
| Database schema migration or direct manual DB write | not done |
| Phase 10B–10G, E2, A15, Phase 10A closure, Phase 10H | not done |
| Gemini | not used |

## Scope decisions taken deliberately, and why

1. **Public `/health` was NOT modified.** WS10 lists a `/health` field as one acceptable
   identity mechanism, but `PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1`
   deliberately minimized that endpoint and lists `commitSha` as a **forbidden** public
   field, enforced by a staging smoke test. Adding it would have overridden a standing
   governance decision and broken a mandatory gate. The authorization's alternative — "a
   minimal authenticated diagnostics field" — was used instead: identity is returned only
   on an authenticated request carrying `x-tina-runtime-identity: 1`. Ordinary users never
   receive it.
2. **`answer-renderer.js` / `pipeline.js` were NOT modified for LC5.** The
   no-indexed-authority fallback originates there, but neither file is in the authorized
   allowlist. The clarification is implemented as an in-scope helper
   (`services/tax-computation-clarification.js`) invoked from `ask-handler.js`.
3. **No new P1 outside scope was introduced.** Two findings proved *broader* than the
   review recorded (17 live false refusals rather than 7; 21 `PERSISTED`-without-receipt
   records rather than 8), but both are within their existing finding classes, so this is
   depth rather than scope expansion.

## Secrets and data handling

- A scan for JWT payloads (`eyJ…`) and API keys (`sk-…`) across the entire R15 evidence
  tree returns **nothing**.
- `TINA_STAGING_ASK_URL` and `JWT_SECRET` are referenced by **name only**; values are read
  from the environment at runtime and never written, logged or committed.
- The live campaigns used a synthetic evaluation user
  (`00000000-0000-4000-8000-0000000e1001`). No real taxpayer data was submitted or stored.
- Public persistence receipts expose only `reasonCode` and `safeDiagnostic`. A dedicated
  test asserts no raw DB error, SQL, connection string or credential reaches the receipt.
- `services/runtime-identity.js` exposes only `runtimeCommit`, `runtimeCommitSource`,
  `deploymentId` and `service`, and never guesses a value — an unresolvable commit is
  `null`.

## Environment

- No backend listener was started by R15; all live work targeted the existing approved
  non-production staging deployment. No listener remains.
- Port 5173 was not touched.
- Scratch work used Git Bash `/tmp` and OS temp directories; no repo-local temporary
  directory was required and none remains.
- PowerShell remains broken in this environment (`System.Data.dll` load failure). All work
  was performed from Git Bash. No script was modified to accommodate it, and both
  mandatory runners are Node entry points unaffected by it.
