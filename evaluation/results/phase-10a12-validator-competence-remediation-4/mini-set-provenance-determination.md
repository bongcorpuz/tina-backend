# PHASE-10A12-R4 — Mini-Set Provenance Determination

## Step 1 — Final evidence-based attempt to establish the PRE-R3 canonical 30-set

Exhaustive search across all committed evidence and the full git history for any pre-R3
enumeration of a canonical 30-question (or 25-question) mini fact-check set:

- **Per-phase committed mini payloads:** A10-R1 = 6, A10-R2 = 6, A11-full-rerun = 0 (used the
  full Q1–Q49 set, not a mini set), A12-R1 = 15, A12-R2 = **20**.
- **Full git-history scan** (`git log` over `evaluation/results/**`, counting distinct `M-Q`
  IDs per commit): the maximum distinct mini IDs in any commit **predating A12-R3** is **20**
  (commit `a976ba6`, the A12-R2 evidence). Only the A12-R3 evidence commit (`09087cb`) and the
  independent-review commit (`c5b466d`, which references R3) contain 30.
- **Alternate ID schemes** (`mini-Q*`, `Q-mini*`, `MINI*`) in A12-R2 artifacts: none found.
- The A11 CURRENT_STATE narrative mentions a "25-question mini fact-check" as a *count*, but no
  committed artifact enumerates 25 (or 30) canonical mini IDs.

**Determination: the pre-R3 canonical 30-question membership CANNOT be proven from evidence
predating A12-R3.** This confirms the independent A12-R3 review finding P1-1 and the R3 report's
own statement that the intended 30-set had never been enumerated beyond 20. The A12-R3 30-set is
**not** retroactively validated.

## Step 2 — New PROSPECTIVE canonical 30-set (authorized under R4)

Because pre-R3 membership is unprovable, a NEW prospective canonical mini-set is created by a
documented, deterministic, comparable-difficulty selection method from the master question bank
`evaluation/factcheck/TINA_Tax_FactCheck_Corrected_Validated_Master_v3_0.md` (Q1–Q50).

**Selection rule (reproducible):**
1. Exclude the reserved cluster/control IDs `{5, 8, 28, 32, 34, 35, 41, 46, 47}` — Q5 (import-VAT
   / CREATE MORE cluster), Q8 (residential-lease VAT cluster), Q35 & Q41 (citation-relevance
   clusters), Q28/Q32/Q34/Q46/Q47 (verified-controlling reachability controls). This keeps the
   mini fact-check independent of the dedicated probe/control sets.
2. Sort the remaining eligible IDs (41) ascending by master number.
3. Take the first 30.

**Comparable difficulty:** every master question is a curated, PASS-gradeable fact-check item of
equivalent rigor (each has explicit correct-answer and PASS criteria in the master), so a
number-ordered slice of the eligible pool does not select for easier questions.

**Resulting canonical 30 (M-Q IDs):**
1,2,3,4,6,7,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,33,36.

**Freeze:** `canonical-mini-set-manifest.json` (with `canonicalSetSha256`) and
`canonical-mini-set-hashes.sha256` are committed **before any live test execution**. All 30 are
then rerun with fresh final-runtime conversations; live payloads are captured against this frozen
manifest.

`canonicalSetSha256` = `8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1`.
