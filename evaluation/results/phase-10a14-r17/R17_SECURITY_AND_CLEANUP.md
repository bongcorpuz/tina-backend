# PHASE-10A14-R17 — SECURITY AND SCOPE REVIEW

Base: `0f2468bc4ac657eee4c8c1ee94ab3a0b9f0cc690` → Final runtime: `345f2db5`

## Runtime diff (excluding R17 evidence)

Exactly two files changed outside evidence, both inside the frozen allowlist:

| File | Nature |
|---|---|
| `services/philippine-tax-boundary-patterns.js` | customs, capital-gain, Filipino and BIR-enforcement signal categories; three narrowing corrections |
| `tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs` | `maxBuffer` raised on the test's `git()` helper plus an explicit `result.error` check |

Two new test files and the R17 evidence tree were added.

`services/philippine-tax-domain-boundary.js` was **not** modified: the pattern change alone
was sufficient, so the narrower option was taken.

## Authorization checklist

| Not authorized | Status |
|---|---|
| Modify historical R13 / R14 / R15 / R16 evidence | not done |
| Rewrite the R16 registry or result JSON | not done |
| Alter the corrupted R16 partial-import directory | not done |
| Delete or normalize the fabricated-SHA attempts | not done — detected and reported instead |
| Backdate evidence / amend Git history / hide failed attempts | not done |
| Change model, temperature, provider or prompt architecture | not done — model remains `gpt-4o-mini` |
| Modify retrieval, reranking, source cards or sourceAvailability | not done |
| Modify corpus, vectors, indexes; reindex, re-embed, ingest | not done |
| Change database schema or write directly to the database | not done |
| Modify frontend or `C:\Projects\tina-dev-factory` | not done |
| Touch `.claude/`, `.vscode/`, `evaluation/factcheck/` | not done |
| Deploy to production | not done |
| E2, A15, Phase 10A closure, Phase 10B/10C, model migration, Phase 10H | not done |
| Gemini | not used |
| `tax-keywords.js`, `tax-classifier.js` | not modified, as the frozen plan committed |

## One protected-evidence incident, disclosed

During COMMIT 7 the first all-26 attempt ran the **E1** runner directly. That runner writes
its result into `evaluation/results/phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json`, which is
protected historical evidence. The file was modified (`q32_reachable_check` flipped, and
per-slot stages moved from `unavailable` to `llm` because this run had LLM reachability
whereas the committed artifact was generated offline).

It was restored with `git checkout` of that single path and the tree verified clean. A
dedicated `all26-nonmutating.mjs` now replays the identical gate logic and writes **only**
into R17 evidence, opening no E1 file. The failed attempt is preserved and recorded
non-controlling. Final verification: `git status` on the E1 directory is empty.

## Protected-path command rule

`git add evaluation/` was never used in R17. Every commit used explicit pathspecs, and
`check-protected-paths.mjs` ran before every commit, failing on any staged path under
`.claude/`, `.vscode/` or `evaluation/factcheck/`. It reported `0 protected` on every R17
commit.

## Secrets and data handling

- No secret values appear in any R17 evidence file. `environment.json` records only Node
  version, platform and architecture — deliberately no environment values.
- `TINA_STAGING_ASK_URL` and `JWT_SECRET` are read from the environment and never written,
  logged or committed. Staging probes record only host, HTTP status, latency and a
  truncated health body.
- No taxpayer or client data was submitted or stored.

## Environment

- No backend listener was started by R17; the staging work targeted the existing approved
  non-production deployment. No listener remains.
- Port 5173 untouched.
- External capture lives outside the repository at `%TEMP%\tina-r17-capture`; no
  repository-local temporary capture directory exists.
- Scratch work used `/tmp`; nothing remains in the repository.
