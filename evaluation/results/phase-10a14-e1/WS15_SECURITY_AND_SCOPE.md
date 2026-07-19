# PHASE-10A14-E1 — WS15 Security & Scope Review

## Confirmations
- **No secret/credential exposure** — secret scan of all E1 evidence (115 payloads + artifacts) for JWT/`sk-`/service-role/PEM/Bearer patterns returned nothing. The harness reads `.env` at runtime; no secret is embedded in any committed file.
- **No private deployment URL / raw auth header / cookie / private key** in evidence.
- **No real taxpayer or client data** — all probes use synthetic hypotheticals; persistence namespace is the synthetic `userId 00000000-0000-4000-8000-0000000e1001` / `e1-eval-synthetic`.
- **No runtime / test / prompt / model / retrieval / reranker / validator change** — E1 added only evidence + harness/analysis scripts under `evaluation/results/phase-10a14-e1/`. `RUNTIME_HASH_LOCK.sha256` proves runtime files are byte-identical to approved R8 (`legal-date-utils.js`, `section51-authority-chain.js` hashes match the R8 manifest).
- **No temperature/sampling change** — runtime default; evidence-only.
- **Persistence** — only application-layer `/ask` conversation-turn writes under the synthetic namespace (authorized). No direct SQL, no schema migration, no backfill, no production-data access.
- **No vector mutation / reindex / re-embedding / source ingestion / source-bank or corpus change.**
- **No frontend or Dev Factory change. No production deployment** (staging `NODE_ENV=staging`).
- **Protected paths preserved** — `.claude/`, `.vscode/`, `evaluation/factcheck/` untouched.
- **Port 5173 untouched**; no backend listener started locally (all calls hit the remote staging service); none left running.

## Authentication note
The `/ask` route verifies an app HS256 JWT signed with `JWT_SECRET` (see `auth.js`). E1 minted short-lived tokens
for a **synthetic** eval user using the `JWT_SECRET` already present in `.env` — a legitimate application-layer
credential used strictly for synthetic test identifiers. No production user data was accessed; no auth bypass was
introduced (the same signature the runtime issues to real logins).

## Tree / sync
- Tracked worktree clean after each commit; only protected untracked paths remain.
- Evidence-only commits; no runtime/test commit.
