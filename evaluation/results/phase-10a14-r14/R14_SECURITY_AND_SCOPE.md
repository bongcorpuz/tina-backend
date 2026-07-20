# R14 — SECURITY AND SCOPE REVIEW

Base: `b4f0db419449adf615d9060dcafd68e57e99d824` → Final runtime: `31f2326c1ebfa5acea8871361db97323f61c644e`

## Runtime diff (excluding R14 evidence)

```
ask-handler.js                                      67 +-
services/answer-support-validator.js               113 +-
tests/phase-10a14-r14-...-persistence-status.test.mjs  290 +
3 files changed, 456 insertions(+), 14 deletions(-)
```

Exactly the authorized surface. `services/persistence-receipt.js` was **not** modified —
its derivation was already correct; R14 needed only propagation.

## Authorization checklist

| Not authorized | Status |
|---|---|
| Reconstruction of the missing R13 COMMIT 3b attempt | not done |
| Alteration or deletion of R10–R13 historical evidence | not done — the all-26 replay output was byte-identical, so git recorded no change to the E1 artifact |
| Direct manual database writes | none |
| Database schema migration | none |
| Broad persistence architecture redesign | none — propagation only |
| Transaction or idempotency redesign | none — P2-R13-IR-004 preserved as a bounded limitation |
| Canonical inventory reconstruction / E2 / A15 | none |
| Prompt or model changes | none — runtime model remains `gpt-4o-mini` |
| Temperature or sampling changes | none |
| Filing-rationale redesign | none |
| Retrieval or reranker changes | none |
| Source ingestion / corpus or vector mutation | none |
| Reindexing or re-embedding | none |
| Production deployment | none — staging only |
| Frontend or Dev Factory changes | none |
| Phase 10A closure / 10B / 10C / GPT-5.6 / Gemini | none |

## Secrets and data handling

- No secret **values** appear anywhere in R14 evidence. A scan for JWT payloads
  (`eyJ…`), API keys (`sk-…`) and credential material over the entire R14 tree returns
  nothing.
- `run-live-campaign.mjs` references `process.env.JWT_SECRET` and
  `TINA_STAGING_ASK_URL` by **name only**; values are read from the environment at
  runtime and never written to disk, logged, or committed.
- The live campaign used a synthetic evaluation user
  (`00000000-0000-4000-8000-0000000e1001`). No real taxpayer data was submitted or
  recorded.
- Persistence receipts expose only `safeDiagnostic` and `reasonCode`. A dedicated test
  asserts no raw DB error, SQL, connection string or credential reaches the receipt.
- `.env` was read via `node --env-file` and never printed, copied or committed.

## Protected paths

`.claude/`, `.vscode/` and `evaluation/factcheck/` were not modified, staged, restored,
deleted, normalized or cleaned. They remain untracked exactly as at preflight.

## Environment

- No backend listener was started by R14; the live campaign targeted the existing
  approved non-production staging deployment. No listener remains.
- Port 5173 was not touched; no process on it was inspected or terminated.
- A repo-local temporary directory was **not** required: Git Bash `/tmp` was writable,
  so all scratch work stayed outside the repository. No `.r14-tmp/` exists.

## Notes for the reviewer

- PowerShell in this environment fails to initialize (`System.Data.dll` load failure).
  All work was performed from Git Bash. No script was modified to accommodate this, and
  both mandatory runners are Node entry points unaffected by it.
- 29 suites appeared to fail mid-run while the working tree was dirty. These are
  patch-scope guards that shell out to `git diff --name-only`; they pass on a clean tree
  and are not semantic failures. Final clean-tree result is 204/0.
