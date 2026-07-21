# PHASE-10A14-R18 — FROZEN PLAN

Frozen before implementation. Not amendable after implementation begins.
If a true contract defect is discovered, the failure is preserved and R18 ends
REVISIONS REQUIRED. It is never silently amended.

Executor: Claude Code — Opus 4.8 (low speed), primary executor per owner authorization.
Mandatory starting HEAD: `2108d447df5a87695002d558a667c03ede8e29fb`
Controlling review: PHASE-10A14-R17-INDEPENDENT-REVIEW-1
R17 final runtime: `345f2db5` — R17 evidence HEAD: `c358b399`

R18 is narrow, evidence-first, pre-fix-preserving, prospective, non-production,
single-runtime, adversarial, no-best-answer-retry and immutable-evidence governed.

R18 does not rewrite R17 history. **R17 remains NOT SATISFIED regardless of R18.**

---

## 1. Authorized scope

R18 remediates only these controlling findings:

| Finding | Subject |
|---|---|
| P1-R17-IR1-001 | Invalid retry / runtime-identity model |
| P1-R17-IR1-002 | Three material substring false allows |
| P1-R17-IR1-003 | "Non-mutating" all-26 replay still writes historical evidence |
| P1-R17-IR1-004 | Deterministic gate remains failed (09ZF) |
| P2-R17-IR1-005 | Count classification ambiguity (non-blocking, prospective) |

Accepted closures are regression gates only and are not reopened without direct
regression evidence.

## 2. Exact allowed-file inventory

Runtime files R18 may modify:

- `services/philippine-tax-boundary-patterns.js` — context-aware substring hardening
- `services/philippine-tax-domain-boundary.js` — strong-signal veto ordering, only if
  the pattern layer alone cannot close the three false allows

Harness / test files R18 may modify:

- `tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs` — scope-guard
  classification only, if and only if the pre-fix matrix proves it necessary

New files R18 may add:

- `tests/phase-10a14-r18-runtime-identity-and-retry.test.mjs`
- `tests/phase-10a14-r18-domain-hardening.test.mjs`
- `tests/phase-10a14-r18-all26-write-isolation.test.mjs`
- `tests/phase-10a14-r18-09zf-scope-guard.test.mjs`
- everything under `evaluation/results/phase-10a14-r18/`
- the R18 report and `evaluation/results/phase-10a14-r18-result.json`
- `knowledge/CURRENT_STATE.md` (append only)

**Every other file is forbidden.** Explicitly forbidden: `tax-keywords.js`,
`tax-classifier.js`, `server.js`, `ask-handler.js`, `pipeline.js`, `answer-renderer.js`,
routes, auth, `package.json`, `package-lock.json`, `.env`, database/migration files,
retrieval/reranker/source-card/sourceAvailability files, corpus/vectors/indexes,
frontend, `C:\Projects\tina-dev-factory`, `.claude/`, `.vscode/`,
`evaluation/factcheck/`, and all R13–R17 historical evidence.

## 3. Expected commit sequence

| # | Content |
|---|---|
| 1 | Frozen plan and contract only — no implementation |
| 2 | Immutable pre-fix evidence |
| 3 | Runtime/harness identity + retry tooling (no domain or LOA change) |
| 4 | Context-aware domain hardening (final runtime) |
| 5 | Write-isolated all-26 replay |
| 6 | 09ZF closure (only if pre-fix evidence proves a change is needed) |
| 7 | Final focused evidence |
| 8+ | Governed gates, one attempt per commit, pushed before any retry |
| final | Report, result JSON, CURRENT_STATE, manifest |

## 4. Stop rules

R18 stops and reports REVISIONS REQUIRED if any of the following occurs:

- a preflight precondition fails;
- a contract defect is discovered that would require amending this plan;
- historical evidence is mutated and cannot be shown never to have been written;
- a retry link fails validation (a failed retry does not establish the ceiling and is
  itself a blocker);
- the deterministic gate does not reach 2 successful cycles within one attempt plus two
  **valid** technical retries per cycle;
- the staging gate does not reach 2 successful cycles;
- any focused suite exits nonzero;
- a material false allow or material false refusal remains;
- scope, security or protected-path integrity is broken.

R18 stops unconditionally after executor evidence is committed, pushed and sync verified.
The executor does not perform the independent review.

## 5. Decision rule

Permitted: **PASS** or **REVISIONS REQUIRED**. No conditional PASS.
PASS requires every condition in the owner authorization's FINAL DECISION section.
Any failure ⇒ REVISIONS REQUIRED.

## 6. Governance statement format

```text
R15 historical governance: NOT SUPERSEDED
R16 prospective governance: NOT SATISFIED
R17 prospective governance: NOT SATISFIED
R18 prospective governance: SATISFIED | NOT SATISFIED
```

Phase 10A remains OPEN after executor completion. Only the mandatory Codex 5.5
independent review may adjudicate R18 closure.
