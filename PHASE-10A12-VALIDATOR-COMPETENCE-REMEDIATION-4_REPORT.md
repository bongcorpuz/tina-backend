# PHASE-10A12-VALIDATOR-COMPETENCE-REMEDIATION-4 — REPORT

**Model:** Claude Code — Opus 4.8 — Low speed.
**Governance:** LIVE EVIDENCE > THEORY > PATCH.
**Manifest commit (pre-run freeze) = runtime commit:** `1b36eeadb26d69f2b9ae28c8422afcc3fdd5c6d2`.
**Decision:** PHASE 10A12-R4 PASS WITH RECOMMENDATIONS.

This task does NOT retroactively validate the A12-R3 mini set, does NOT authorize A13, does NOT
authorize the adversarial suite, and does NOT close Phase 10A.

---

## 1. Mandate

Under explicit R4 authorization: (a) make one final evidence-based attempt to establish the
pre-R3 canonical 30-question mini fact-check membership; (b) if unprovable from pre-A12-R3
evidence, create a new prospective canonical 30-set by a documented deterministic
comparable-difficulty method from the master bank; (c) commit the canonical manifest + hashes
**before** any live run; (d) rerun all 30 at a fresh final runtime.

## 2. Step 1 — pre-R3 membership determination (unprovable)

Exhaustive search (`mini-set-provenance-determination.md`): full git-history scan over
`evaluation/results/**` shows the maximum distinct mini IDs in any commit **predating A12-R3** is
**20** (`a976ba6`, A12-R2). Only the R3 evidence (`09087cb`) and its independent review
(`c5b466d`) contain 30. No alternate ID scheme exists. **Pre-R3 canonical 30 membership cannot be
proven** — confirming independent-review finding P1-1 and the R3 report's own admission. The
A12-R3 mini set is **not** retroactively validated.

## 3. Step 2 — new prospective canonical 30-set (deterministic)

From master `TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md` (Q1–Q50):
1. Exclude reserved cluster/control IDs `{5, 8, 28, 32, 34, 35, 41, 46, 47}` — Q5/Q8 clusters,
   Q35/Q41 citation clusters, Q28/Q32/Q34/Q46/Q47 verified-controlling controls.
2. Sort the remaining 41 eligible IDs ascending; take the first 30.

Result: `M-Q{1,2,3,4,6,7,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,33,36}`.
Fully reproducible; every master question is a curated PASS-gradeable item (comparable difficulty).
`canonicalSetSha256 = 8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1`.

## 4. Step 3 — manifest frozen and committed BEFORE any live run

`canonical-mini-set-manifest.json` + `canonical-mini-set-hashes.sha256` +
`mini-set-provenance-determination.md` committed at `1b36eea` and **pushed** before the harness
ran. Runtime code is unchanged from the A12-R3 validator (`6ce2d6f`); the manifest commit adds no
code, so runtime behavior is the R3 validator.

## 5. Step 4 — fresh live rerun of all 30

30/30 completed at runtime `1b36eea`, fresh conversations, one committed sanitized payload each,
`persistence.count = 2`. **Membership EXACT match to the frozen manifest** (30/30 IDs),
**0 runtime-stamp mismatches**, **0 prompt mismatches vs manifest**.

Counts (`count-reconciliation.json`): VERIFIED_CONTROLLING 5 + RELATED_AUTHORITY_ONLY 16 +
NO_VERIFIED_AUTHORITY 9 = 30.

## 6. Verified audit

5 verified (`verified-audit.md`), **all VALID**: M-Q1 (₱2.8M < ₱3M threshold → registration not
mandatory), M-Q6 (non-VAT seller cannot issue VAT invoice), M-Q12 (₱250k → not required to file),
M-Q15 (MCIT 2% gross income), M-Q30 (estate 6% under TRAIN; minor "exceeding ₱5M" imprecision —
the ₱5M is the standard deduction; core rate correct). Invalid verified = 0; questionable = 0;
all `schemaValid=true`.

## 7. Manual audit

`mini-factcheck-manual-audit.md`: invalid verified 0, fabricated authority 0, false refusal 0,
unrestricted prediction 0, missing/schema-invalid verified 0, accessor bypass 0, persistence
failures 0, security 0. The 9 NO_VERIFIED are honest no-indexed-authority states (responsive, not
refusals).

## 8. Independent-review P1-2 (repo runner) reconciliation

`repo-runner-reconciliation.md`: the A12-R3 "runner exit 0" claim was **inaccurate** (misread
backgrounded output). Truth: `node scripts/run-regressions.mjs` **exits 1**, but both failures are
the **working-tree git-diff-scope / forbidden-files guard** tripping on untracked evaluation
evidence + `.claude/.codex/.gemini` + protected paths — the same guard also accounts for
`phase-09zf`'s 2 failing assertions (its 6 functional controlled-LOA assertions all PASS; it does
not import the changed module). **Functional regressions from the R3/R4 change: 0.** All 7
validator/trust suites exercising the changed module pass (`test-outputs.txt`). Recommendation:
scope the runner's guard to staged/committed changes so working-tree evidence is not counted as a
failure.

## 9. Architecture (honest labels retained)

`sourceExcerptGrounded = false`; `guardArchitecture = CLUSTER_SPECIFIC_WITH_FAIL_CLOSED_SCHEMA`.
No relabeling.

## 10. Security

Clean (`security-scan.md`) — no credentials, tokens, JWTs, Authorization headers, conversation
IDs, or PII in changed/evidence files; `sanitizedConversationRef` is a truncated SHA-256.

## 11. Final severity

| Severity | Count | Notes |
|---|---:|---|
| P0 | 0 | — |
| P1 | 0 | Canonical mini-set now has a frozen, deterministic, pre-run-committed manifest with membership + prompt + runtime verified; P1-2 runner claim corrected and reconciled (0 functional regressions). |
| P2 | 5 | Carryover: no full operative source-excerpt grounding; guard cluster-specific with fail-closed schema; Q5 guard cluster-specific; safe-under-claim precision not separately calibrated; gpt-4o-mini validator limitation + latency. Plus review carryovers P2-4 (Q5 period diagnostic-only) and P2-5 (placeholder-env retrieval-equivalence evidence) remain open recommendations. |
| P3 | 1 | Occasional transient pipeline truncation requiring bounded retry; repo-runner scope-guard noise on untracked evidence. |

## 12. Exact next task

Independent A12-R4 review (a model that did not execute it) confirming: pre-R3 membership
determination, deterministic selection method, pre-run manifest freeze, 30/30 membership/runtime
match, verified audit, and the P1-2 reconciliation. A13, the adversarial suite, and Phases
10B/10C remain not authorized; Phase 10A remains open.
