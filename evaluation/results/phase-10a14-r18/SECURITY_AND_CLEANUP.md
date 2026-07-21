# PHASE-10A14-R18 — SECURITY AND SCOPE REVIEW

Base: mandatory starting HEAD `2108d447` → R18 final runtime `8413e022`.

## Complete change set outside R18 evidence

Exactly seven files, verified by `git diff --name-only 2108d447 HEAD` excluding the R18
evidence tree and report:

| File | Nature | In frozen allowlist |
|---|---|---|
| `services/philippine-tax-boundary-patterns.js` | non-tax object veto, tax co-signals, 26 false-refusal anchors | yes |
| `services/philippine-tax-domain-boundary.js` | veto ordering before the strong-signal allow | yes |
| `tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs` | evidence-artifact classification only | yes |
| `tests/phase-10a14-r18-runtime-identity-and-retry.test.mjs` | new R18 suite | yes |
| `tests/phase-10a14-r18-domain-hardening.test.mjs` | new R18 suite | yes |
| `tests/phase-10a14-r18-all26-write-isolation.test.mjs` | new R18 suite | yes |
| `tests/phase-10a14-r18-09zf-scope-guard.test.mjs` | new R18 suite | yes |

`tax-keywords.js` and `tax-classifier.js` were **not** modified, as the frozen plan
committed. `pipeline.js`, `server.js`, `ask-handler.js` and `answer-renderer.js` were not
modified.

## Prohibition checklist

| Not authorized | Status |
|---|---|
| Amend the R17 frozen contract, attempts, registry, retry errors, report, result JSON or manifests | not done |
| Modify R13–R17 historical evidence | not done — verified empty diff across E1 and R13–R17 |
| Backdate evidence, amend Git history, hide failed attempts | not done — A1's externally terminated attempt is preserved and reported |
| Weaken tax-domain boundaries broadly | not done — VAT, BOC, taxable, customs and capital-gain all still allow standalone |
| Disable the 09ZF scope guard or exclude arbitrary runtime files | not done — guard proven live on every prohibited class |
| Write any all-26 result into a historical R13–R17 location | not done — structurally refused before opening |
| Run a replay that restores a file after mutating it | not done — no restore was needed or issued |
| Classify mutation-detection-plus-restore as non-mutating | not done — explicitly rejected in design and asserted in tests |
| Change model, temperature, provider, routing or prompt architecture | not done — model remains `gpt-4o-mini` |
| Modify retrieval, reranking, source cards or sourceAvailability | not done |
| Modify corpus, vectors, indexes; reindex, re-embed, ingest | not done |
| Change database schema or write directly to the database | not done |
| Modify frontend | not done |
| Modify `C:\Projects\tina-dev-factory` | not done |
| Touch `.claude/`, `.vscode/`, `evaluation/factcheck/` | not done |
| Deploy to production | not done |
| E2, A15, Phase 10A closure, Phase 10B/10C, Phase 10H, model migration | not done |
| Gemini as executor or controlling reviewer | not used at all |
| Perform the independent review | not done |

## Protected-path discipline

`git add evaluation/` and other broad pathspecs were never used. Every commit staged
explicit paths, and `check-protected-paths.mjs` ran before every commit, reporting
`0 protected` each time.

## Secrets and data

- No secret values appear in any R18 evidence file. The environment fingerprint records
  only Node version, platform and architecture — deliberately no environment values — and a
  test asserts no secret-shaped field names are present.
- Staging credentials are read from the environment and never written, logged or committed.
- No taxpayer or client data was submitted or stored.

## Environment

- No backend listener was started by R18; none remains.
- Port 5173 untouched.
- All gate and campaign capture lives outside the repository under `%TEMP%`. **No
  repository-local temporary capture directory exists at any point.**

## Disclosed executor errors

Recorded rather than concealed, each fixed in the open:

1. **Commit 046f6ac2 (7b) was pushed while its suite was failing 31/1**, and its message
   claimed 32/0. The suite was re-run but its output was not read before committing. The
   error is disclosed in commit 74943bb9 (7c) and history is not rewritten.
2. A validator spread its detail object over the error code, masking
   `RETRY_FORGED_BASELINE`.
3. A test used `git rev-parse <sha>^`, which `cmd.exe` consumed as an escape character on
   Windows, making a negative control vacuously pass.
4. The all-26 CLI entrypoint guard compared against a hand-built `file://` URL, so on
   Windows it became a no-op that exited 0 without writing anything.
5. Attempt-directory allocation failed ENOENT because the `attempts/` parent did not exist.
