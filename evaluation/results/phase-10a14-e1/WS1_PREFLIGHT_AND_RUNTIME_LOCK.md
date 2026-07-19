# PHASE-10A14-E1 — WS1 Preflight & Frozen Runtime Lock

## Repository / branch / HEAD / sync
- Repository: `C:\Projects\tina-backend`
- Branch: `feature/source-availability-engine-v1`
- Starting HEAD: `893820600ec2cb58c939817f0a04f8dc4afff4c3` ✅ matches expected
- Reviewed R8 runtime ancestor: `79be634df2068a5d5ba8f40aaf49b490c64811fb` ✅ `git merge-base --is-ancestor` = YES
- `git diff --name-only 79be634..HEAD` = review-evidence markdown/JSON + `knowledge/CURRENT_STATE.md` only → **no runtime file changed since the reviewed R8 runtime** (runtime is byte-identical to the approved R8 code)
- Sync: `0 0`
- Tracked worktree: clean (only protected untracked `.claude/`, `.vscode/`, `evaluation/factcheck/` present)

## Deployed staging runtime (authenticated `/debug/db-identity`)
- `RENDER_GIT_COMMIT`: `893820600ec2cb58c939817f0a04f8dc4afff4c3` (= current HEAD; runtime identical to approved R8 `79be634`)
- `RENDER_SERVICE_NAME`: `tina-backend-staging`
- `NODE_ENV`: `staging` (NOT production)
- Supabase project ref: `kjvrgkvooivmtxxkurth`
- `VECTOR_TABLE`: `tina_vector_store`, `vectorTableMatchExpected`: true
- `/index-status`: `vectorStore.chunks = 5346` ✅ (expected 5,346), `sources = 102`, storage supabase
- Runtime model: `gpt-4o-mini` (confirmed live via `openaiCalls[].model` in the WS1 connectivity probe)

**No staging deployment/alignment was required** — the deployed commit already carries the approved R8 runtime.

## Runtime hash lock
`RUNTIME_HASH_LOCK.sha256` (26 files): governed runtime (`legal-date-utils.js`, `section51-authority-chain.js`, `services/answer-support-validator.js`, `services/ask-handler-public-source-sanitizer.js`, `vector-store.js`, `pipeline.js`, `ask-handler.js`, `rag-answer-handler.js`, `answer-renderer.js`, `services/trust-contract.js`, `auth.js`), retrieval/reranker (`retrieval-engine.js`, `reranker-engine.js`, `reranker-issue-signals.js`, `reranker-normalizers.js`), prompts (`adaptive-tina-master-prompt.js`, `prompts/tax-mode-prompt.js`, `prompts/audit-mode-prompt.js`), and R1–R8 focused suites.
- `legal-date-utils.js` = `3b211daa…` and `section51-authority-chain.js` = `1c258f2e…` — **identical to the hashes in the R8 `EVIDENCE_MANIFEST.sha256`**, confirming zero runtime drift from the reviewed R8 code.

## WS1 live connectivity validation (single pre-manifest health probe — NOT a matrix call)
One synthetic probe was issued to confirm the live path before freezing the manifest:
- Auth: `/ask` verifies an app HS256 JWT signed with `JWT_SECRET` (see `auth.js`); the stored `TINA_STAGING_AUTH_HEADER_VALUE` returned 401 because it lacked the required `Bearer ` prefix. A short-lived token for a **synthetic eval user** (`id 00000000-0000-4000-8000-0000000e1001`, username `e1-eval-synthetic`) was minted with `JWT_SECRET` — an app credential already in `.env`, used only for synthetic test identifiers (authorized).
- Probe: *"Is an individual earning purely compensation income from a single employer required to file an annual income tax return under substituted filing?"*
- Result: HTTP 200, `success:true`, `trust.authoritySupport = VERIFIED_CONTROLLING`, `sourceState = AUTHORITY_FOUND`, `legalConclusion = ALLOWED`, 5 source cards, `openaiCalls[].model = gpt-4o-mini`, ~26s. Answer correctly stated substituted-filing exemption.
- This validates the live model + persistence path and is recorded here transparently as a pre-manifest connectivity check; all WS6–WS9 matrix probes execute only after the frozen manifest is committed.

## Persistence mode
Application-layer persistence via the governed `/ask` runtime (conversation-turn save) under a segregated synthetic namespace: `userId` prefix `00000000-0000-4000-8000-0000000e1xxx`, username `e1-eval-synthetic*`. No direct SQL, no schema change, no vector writes.
