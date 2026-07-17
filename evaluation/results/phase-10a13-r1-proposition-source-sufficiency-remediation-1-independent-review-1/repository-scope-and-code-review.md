# Repository, Scope, And Code Review

## Repository

- Path: `C:\Projects\tina-backend`
- Branch: `feature/source-availability-engine-v1`
- Review start HEAD: `5d42a173ee96a9b30643f28c91b67d73b6afccb9`
- Sync at start: `0 0`
- Protected untracked paths preserved: `.claude/`, `.vscode/`, `evaluation/factcheck/`

Expected ancestry confirmed:

`d6fbf2977d02c86c57dba85b44eea52220bd580f -> 508a64dce8219d2dcfc82dcd226ed7fdbc015fb6 -> f5bf024 -> 5d42a173ee96a9b30643f28c91b67d73b6afccb9`

## Commit Scope

| commit | scope |
|---|---|
| `508a64d` | Runtime validator change in `services/answer-support-validator.js`; focused test added; two existing tests adjusted. |
| `f5bf024` | Targeted live evidence and remediation design/preservation artifacts. |
| `5d42a17` | Report/result JSON/evidence manifest/runner logs/CURRENT_STATE. |

No corpus, vector, model, frontend, Dev Factory, schema, environment, database, deployment, or production change was found.

## Code Review

Reviewed `evaluatePropositionSourceSufficiency` and its `evaluateAnswerSupport` call site.

Confirmed:

- The new `registration_procedural` class requires registration-authority source cards for registration/form/procedure propositions.
- The new `vat_exception` class requires exemption/zero-rating/exception authority for exempt, zero-rated, not-subject-to-VAT, or outside-scope propositions.
- Deterministic failure returns before the LLM validator.
- The model validator cannot override a failed deterministic proposition-source-sufficiency gate.
- Runtime `Q38`/`Q46` references are comments only.
- No executable exact-prompt, question-ID, Form 1902 deny, BSP/gold pass/fail branch, fixture-only branch, hidden allowlist, or exact defective-answer match was found.

Runtime search note:

- `gold` appears in the executable VAT-context regex as one of several broad transaction words (`import|sale|lease|transaction|gold|export`). It only helps decide whether a VAT exception claim is in VAT/transaction context. It does not grant or deny sufficiency; sufficiency still depends on exception-authority source cards. I do not treat it as Q46 hardcoding.

Fixture adjudication:

- Q8 fixture correction supplies the `NIRC Sec. 109` source card that the exempt answer needs. It strengthens factual/source consistency.
- R6 non-applicability fixture correction removes registration from the "not applicable" bucket because registration is now intentionally covered, and adds a positive registration reachability assertion. It does not weaken behavior.

P2 caveat:

- The control is still source-card-label/provision-class based. It does not prove passage-level support for every exact form or statutory condition.
