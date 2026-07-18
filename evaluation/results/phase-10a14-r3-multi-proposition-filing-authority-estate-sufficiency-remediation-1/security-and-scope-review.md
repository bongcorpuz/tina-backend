# WS17 — Security & scope review

Start HEAD `d5cfceb`. Runtime commit `f44490dffb3acac1b0ff7b0f1a88f90b534a213c`.

## Runtime scope

The only runtime change is `services/answer-support-validator.js` plus one new focused
test (`tests/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency.test.mjs`).
No change to corpus, source bank, vector index, embeddings, model selection, prompt bank,
question bank, frontend, Dev Factory, database/schema, infrastructure, or deployment
configuration. No reindexing. No prior committed evidence (R2, R2 independent review,
R1, R1 review, A13) altered.

## Secret / PII hygiene

- No credentials, API keys, service-role keys, authorization headers, cookies, private
  keys, private deployment URLs, environment secrets, raw conversation identifiers, or
  taxpayer/client data appear in any committed artifact.
- Live payloads capture: id, group, prompt, answer, sanitized `trust`/`answerSupport`
  subsets (including the proposition ledger, authority classes, and failed proposition),
  displayed source labels, request/response hashes, and a truncated SHA-256
  `sanitizedConversationRef`. The `/ask` response contains no raw conversation ID; none is
  stored. Persistence count is not exposed in the `/ask` response body and is recorded as
  null (not fabricated). JWT and test credentials live only in the session scratchpad,
  never committed.
- The local server was launched with a placeholder `GOOGLE_SERVICE_ACCOUNT_JSON`
  (invalid, non-secret) sufficient for `/ask`; no real service-account material was used.

## Protected paths

`.claude/`, `.vscode/`, and `evaluation/factcheck/` remained untracked and unmodified —
never staged, normalized, restored, or deleted. No localhost port 5173 process was
touched. The backend server started for live validation was stopped after the run; no
backend server remains.

## Authority integrity (governance)

The change strengthens Authority Lock: it fails closed BEFORE the model validator when a
decisive filing/deadline/estate proposition is not supported by MATCHING controlling
authority (exact tax/return type; estate rate/base/deduction), and never upgrades trust.
Locked/visible authorities and source cards are unaffected; the gate only withholds
VERIFIED_CONTROLLING — it does not remove, downgrade, suppress, or hide any authority.

Result: **clean**.
