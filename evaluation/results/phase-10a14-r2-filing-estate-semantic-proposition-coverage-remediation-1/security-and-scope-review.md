# WS15 — Security & scope review

Runtime commit: `22b845afe1fe16bfa4821804d528f469366e4f8c` (start HEAD `7736cee`).

## Runtime scope

The only runtime change is `services/answer-support-validator.js` plus one new focused
test (`tests/phase-10a14-r2-filing-estate-semantic-proposition-coverage.test.mjs`). No
change to corpus, vector index, embeddings, model selection, frontend, Dev Factory,
database/schema, infrastructure, or deployment configuration. No question-bank or
source-bank modification. No prior committed evidence (A14, A14-R1, A13-R1) altered.

## Secret / PII hygiene

- No credentials, API keys, service-role keys, authorization headers, cookies, private
  deployment URLs, raw conversation identifiers, or taxpayer data appear in any committed
  artifact.
- Live payloads capture: id, group, prompt, answer, sanitized `trust` and `answerSupport`
  subsets, displayed source labels, and a truncated SHA-256 `sanitizedConversationRef`
  derived from `id|prompt|answer`. No raw conversation ID is present in the /ask response
  and none is stored. The JWT and test credentials live only in the session scratchpad,
  never committed.
- The local server was launched with a placeholder `GOOGLE_SERVICE_ACCOUNT_JSON`
  (invalid, non-secret) sufficient for `/ask`; no real service-account material was used
  or emitted.

## Protected paths (not touched)

`.claude/`, `.vscode/`, and `evaluation/factcheck/` remained untracked and unmodified;
they were never staged, normalized, restored, or deleted. No localhost port 5173 process
was touched.

## Authority integrity (governance)

The change strengthens Authority Lock: it fails closed BEFORE the model validator when a
decisive filing/deadline/estate proposition is not supported by a matching authority
class in the DISPLAYED source cards, and never upgrades trust. Locked/visible authorities
and source cards are unaffected; the gate only withholds VERIFIED_CONTROLLING, it does not
remove, downgrade, suppress, or hide any authority.

Result: **clean**.
