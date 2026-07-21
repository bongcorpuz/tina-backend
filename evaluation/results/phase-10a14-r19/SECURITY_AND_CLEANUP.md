# PHASE-10A14-R19 — SECURITY AND SCOPE REVIEW

Base: mandatory starting HEAD `dcfcb77e` → R19 final runtime (COMMIT 3c, `b3e879b1`).

## Complete change set outside R19 evidence

Exactly three files, verified by `git diff --name-only dcfcb77e HEAD` excluding the R19
evidence tree, report and R19 test files:

| File | Nature | Authorized |
|---|---|---|
| `services/philippine-tax-boundary-patterns.js` | dominant non-tax role veto, cosignal tightening, strong-signal additions | yes — in frozen allowlist |
| `services/philippine-tax-domain-boundary.js` | dominant-veto ordering before strong-signal check | yes — in frozen allowlist |
| `tests/phase-10a14-r18-domain-hardening.test.mjs` | one assertion widened to accept either R18 or R19 veto reason (disclosed in COMMIT 3) | yes — regression suite correction, disclosed |

No other runtime file was modified. `pipeline.js`, `server.js`, `ask-handler.js`,
`answer-renderer.js`, LOA workflow modules, retrieval/reranking modules,
`sourceAvailability`, corpus/index code are untouched. R19's own runtime/harness identity
modules (`identity.mjs`, `retry-validator.mjs`) are copies of the accepted R18 modules,
unmodified in substance (only the `R19_DIR` constant renamed).

## Prohibition checklist

| Not authorized | Status |
|---|---|
| Amend R18 or independent-review history | not done |
| Alter the frozen 567-probe independent oracle | not done — verified unmodified; the field-swap defect it contains is documented, not corrected in place |
| Delete or rewrite failed evidence | not done |
| Add complete failed questions as runtime exceptions | not done — every remedy is a reusable rule family, verified by a static no-exact-question-string assertion in the focused suite |
| Make every uppercase acronym an unconditional tax anchor | not done — dominant veto runs first for every acronym family |
| Make every bare acronym ALLOW | not done — bare acronym alone with no context ALLOWs only via definition-intent; any dominant-veto object still wins |
| Make every tax-associated word an unconditional signal | not done |
| Globally remove legitimate tax terms | not done — every accepted R15-R18 closure preserved and re-verified |
| Override explicit non-tax wording because TINA is a tax assistant | not done — the boundary contains no "always tax" fallback |
| Invent acronym expansions | not done — static scan asserts no invented full-name assertion exists in runtime |
| Implement Phase 10B-T | not done |
| Modify LOA runtime or ordering | not done |
| Modify retry/runtime-identity architecture | not done — R19 reuses the accepted R18 modules unmodified |
| Modify all-26 write isolation | not done — re-run as a regression check, unchanged, still passes |
| Weaken 09ZF prohibited-class guards | not done — not touched |
| Change model, provider, temperature, prompts, routing | not done — model remains `gpt-4o-mini` |
| Modify retrieval, reranking, source cards, sourceAvailability | not done |
| Modify corpus, vectors, indexes, database, frontend, Dev Factory | not done |
| Reindex, re-embed, ingest | not done |
| Deploy to production | not done |
| Execute E2 or A15 | not done |
| Close Phase 10A | not done |
| Begin Phase 10B/10C/10G/10H | not done |
| Use Gemini as executor or controlling reviewer | not used at all |
| Perform the independent review | not done |

## Protected-path discipline

Every commit staged explicit paths; `check-protected-paths.mjs` ran before every commit
and reported `0 protected` each time.

## Secrets and data

No secret values appear in any R19 evidence file. No taxpayer or client data was
submitted or stored. Staging credentials are read from the environment and never
written, logged or committed.

## Environment

No backend listener was started by R19; none remains. Port 5173 untouched. All gate and
campaign capture lives outside the repository under `%TEMP%`. No repository-local
temporary capture directory exists at any point.

## Disclosed executor notes

- Two focused-suite failures (`patch-07b`, `phase-09r-staging`) observed transiently
  before COMMIT 6 landed were dirty-tree artifacts of their own scope guards flagging an
  uncommitted evidence file; both resolved after commit and are recorded in COMMIT 6's
  message rather than silently re-run and left unexplained.
- Two oracle-authoring errors were caught and corrected before freezing (not after): a
  probe mislabeling the original R16 false-allow example as an accepted ALLOW closure,
  and a probe expecting "What is the exemption threshold?" to be ambiguous when it is in
  fact a pre-existing (pre-R19) strong anchor for the VAT registration threshold.
- The R18-IR-EF-001 evidence-fixture finding (text/expected field swap in the source
  independent-review oracle's `acronym_context` class) is documented in
  `ORACLE_FIELD_SWAP_FINDING.json` and the frozen source file is unmodified.
