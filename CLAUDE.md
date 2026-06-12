# TINA Backend — Claude Code Bridge

Project: TINA — Philippine Tax Research Platform.
This repo contains runtime code and executable gates only. All governance,
standards, and procedures live in the canonical repository:
`c:\Projects\tina-dev-factory`. Do not restate policy here — reference it.

## Execution facts

- Regression gate (run before any commit): `npm test`
  (syntax checks + all `tests/*.test.mjs` + all `_stage*_test.mjs`)
- Protected-file check: `npm run guard:files`
  (the protected list lives in `scripts/forbidden-files-guard.mjs` — single source of truth)
- Active branch: `feature/source-availability-engine-v1`; PRs target `main`
- Current phase: RELEASE GATE VALIDATION
- Patch work follows `c:\Projects\tina-dev-factory\workflows\PATCH_WORKFLOW.md`

## Canonical governance (read before patch work — do not copy into this repo)

- Authority hierarchy: `c:\Projects\tina-dev-factory\docs\AUTHORITY_HIERARCHY.md`
- Authority Lock (mandatory): `c:\Projects\tina-dev-factory\docs\AUTHORITY_LOCK.md`
- Master prompts: `c:\Projects\tina-dev-factory\docs\TINA_MASTER_PROMPT.md`, `TINA_SUB_MASTER_PROMPT.md`
- Architecture & contracts (SAE, source cards, retrieval, protected systems): `c:\Projects\tina-dev-factory\architecture\`
- Release gate: `c:\Projects\tina-dev-factory\tina_harness\RELEASE_GATE.md`

## Agent references (consult by reading these files; never duplicate)

- Patch review: `c:\Projects\tina-dev-factory\.claude\agents\patch-reviewer.md`
- Authority correctness: `c:\Projects\tina-dev-factory\.claude\agents\tax-validator.md`
- Retrieval defects: `c:\Projects\tina-dev-factory\.claude\agents\retrieval-engineer.md`
- Source-card defects: `c:\Projects\tina-dev-factory\.claude\agents\source-card-specialist.md`

## Output routing

Review reports, audit inputs, and state documents produced during backend
sessions are written to `c:\Projects\tina-dev-factory\reviews\records\`
(or `patches\records\`), never to backend-local directories.
