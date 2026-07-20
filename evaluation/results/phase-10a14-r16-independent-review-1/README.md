# PHASE-10A14-R16 Independent Review 1 Evidence

Decision: REVISIONS REQUIRED.

R15 historical governance: NOT SUPERSEDED.

R16 prospective governance: NOT SATISFIED.

Primary blockers:

- Independent deterministic gates failed twice, and the observed failures were deterministic/local (`patch-07b-clarification-final-gate-1` and `phase-10a8`), not the executor-claimed six OpenAI/network suites.
- Independent staging gates failed twice: 7 suites run, 1 failed (`phase-09r-tax-memo-runtime-staging-smoke-1`).
- Independent domain campaign found customs-duties false refusals; standalone `phase-10a8` also reports a valid capital-gain tax question no longer ALLOWs.
- The canonical registry counts a corrupted partial import as `COMPLETED_PASS` and `controlling:true` despite its own recovery adjudication saying `INVALID_PARTIAL_IMPORT_NON_CONTROLLING`.
- Retry ceiling accounting is not validly linked: registry `retries=0` and every deterministic `retryOf=null`.
- One fabricated 40-character SHA remains in 11 attempts; Git rejects it, while registry integrity remains `clean:true`.

Raw logs are preserved in this directory. Long logs were captured outside the repository first, then imported only after clean-tree-sensitive gates completed.
