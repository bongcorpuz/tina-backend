# PATCH-027I — Runtime Diagnostic Capture

**Date:** 2026-06-16
**Repository:** tina-backend
**Branch:** feature/source-availability-engine-v1
**Mode:** Investigation only. No production logic modified. No SQL. No deployment. No live DB/OpenAI calls.
**Predecessor documents:** `PATCH-027H_RELATED_AUTHORITY_ONLY_INVESTIGATION.md`, `PATCH-027H_ADDENDUM_DUAL_CLASSIFIER_RESOLVED.md`, `PATCH-027I_SCOPE_GOVERNING_AUTHORITY_ANNOTATION_GAP.md`.

---

## Method (and why it deviates from a live end-to-end run)

The user was asked to choose between (a) a deterministic harness calling the real production functions directly with synthetic-but-realistic inputs, at zero cost and with no live DB/API access, or (b) a full live pipeline run against the real Supabase vector store and OpenAI API using credentials present in `tina-backend/.env`. **(a) was selected.**

The harness script `_patch027i_runtime_diagnostic.mjs` (repo root, kept for repeatable validation, not committed) does the following, with no mocking of the decision logic itself:

- Imports and calls the **real, exported, deterministic** `classify()` from `issue-classification-engine.js` (confirmed via source inspection to make no OpenAI/network call — only the separate `classifyWithOpenAI` export does that, and it is not used by `classify()` or by `pipeline.js`'s `ctx.issueClassification = classify(query)` call site at `pipeline.js:1806`).
- Imports and calls the **real, exported** `buildAuthorityAnnotation()` from `authority-utils.js` — this is the actual function that produces `authorityRole`, `directlyGovernsIssue`, and `isGoverning` in production (`pipeline.js`'s `classifySourceAvailability` consumes exactly this annotation shape).
- Because `docOnSpecificAuthorityPlan`, `hasSpecificAuthorityPlan`, `directlyGovernsIssue`, and `getAuthorityRole` are **not exported** from `authority-utils.js` (private to the module), the script also includes a byte-for-byte mirror of `docOnSpecificAuthorityPlan`/`hasSpecificAuthorityPlan` (copied verbatim from the already-read source, not re-derived) solely to expose their individual intermediate return values. **The reported PASS/FAIL verdicts are taken from the real exported `buildAuthorityAnnotation()` call, not from the mirror** — the mirror is cross-checked against it for consistency only.
- Candidate documents were constructed using already-confirmed real metadata from `PATCH-027B-R3` (correct `normalizedReference` values: `RR_2_1998`, `RR_12_2018`, `RMO_24_2013`, `RR_11_2018`, `RR_8_2018`) plus realistic citation/content text, with `authorityMatchTier` forced to specific values to directly test the PATCH-027I hypothesis.

**Limitation, stated plainly:** this method does not exercise `retrieval-engine.js`'s actual chunk retrieval or its real tier computation for these queries against the live vector store — that would require the live-run option, which was not selected. It instead asks: *given the real annotation function and a candidate that retrieval-engine.js would have computed at a given tier, what does the real code do?* This isolates and proves the annotation-gate defect itself, independent of what tier production retrieval happens to assign to any specific document on any specific day.

---

## 1. Executive Verdict

**The PATCH-027I hypothesis is CONFIRMED at the annotation-gate level, using the real, exported `buildAuthorityAnnotation()` function with no mocking of decision logic.**

A controlled tier-isolation experiment (Section 3) — same document, same real `classify()`-produced issue classification, same `buildAuthorityAnnotation()` call, only the `authorityMatchTier` value varied — produced:

| Forced tier | `docOnSpecificAuthorityPlan` (real-function-consistent) | `authorityRole` | `isGoverning` |
|---|---|---|---|
| 1 | `true` | `GOVERNING` | `true` |
| 2 | `true` | `GOVERNING` | `true` |
| **3** | **`false`** | **`RELATED`** | **`false`** |
| 4 | `false` | `RELATED` | `false` |

This proves, deterministically and reproducibly, that the real `authority-utils.js` code path treats tier 3 identically to tier 4 (total non-match) — discarding the fact that tier 3 itself is only reachable in `retrieval-engine.js` because `docMatchesSpecificAuthorityPlan()` already confirmed a real citation/variant-text match. The defect is exactly as scoped in PATCH-027I Section 5: a confirmed match is being thrown away by a downstream gate that doesn't know how to interpret it.

**The required proof point is satisfied:** for all three target queries (RR 2-98, RR 12-2018, RMO 24-2013), forcing the realistic tier-3 condition produced `authorityMatchTier = 3 AND docOnSpecificAuthorityPlan = false AND authorityRole != GOVERNING`, via the real exported function. Combined with PATCH-027H's already-established, separately-confirmed empirical fact that these same three queries return `RELATED_AUTHORITY_ONLY` as the final pipeline status (Section 7 below addresses how these connect), this is sufficient evidence that the proof point holds end-to-end and **PATCH-027J should proceed**, subject to the residual caveat in Section 5.

---

## 2. Per-Query Diagnostic Table

All five queries below were run with `authorityMatchTier` forced to **3** (the hypothesis condition) for direct comparability — this is what makes the result below striking: the controls (RR 11-2018, RR 8-2018) behave **identically** to the targets under this forced condition, which is the expected and correct behavior of the gate itself (see Section 5 for what this does and does not prove about real production retrieval).

| Field | RR 2-98 | RR 12-2018 | RMO 24-2013 | RR 11-2018 (control) | RR 8-2018 (control) |
|---|---|---|---|---|---|
| query | Explain RR 2-98 | Explain RR 12-2018 | Explain RMO 24-2013 | Explain RR 11-2018 | Explain RR 8-2018 |
| source | `02_Revenue_Regulations/RR_2-98.pdf` | `02_Revenue_Regulations/RR_12-2018.pdf` | `04_RMO/RMO_24-2013.pdf` | `02_Revenue_Regulations/RR_11-2018.pdf` | `02_Revenue_Regulations/RR_8-2018.pdf` |
| document_title | REVENUE REGULATIONS NO. 2-98, May 17, 1998.pdf | REVENUE REGULATIONS NO. 12-2018, January 25, 2018.pdf | REVENUE MEMORANDUM ORDER NO. 24-2013.pdf | REVENUE REGULATIONS NO. 11-2018, January 25, 2018.pdf | REVENUE REGULATIONS NO. 8-2018, January 25, 2018.pdf |
| normalized_reference | RR_2_1998 | RR_12_2018 | RMO_24_2013 | RR_11_2018 | RR_8_2018 |
| authority_type | RR | RR | RMO | RR | RR |
| authority_label | Revenue Regulations No. 2-98 | Revenue Regulations No. 12-2018 | Revenue Memorandum Order No. 24-2013 | Revenue Regulations No. 11-2018 | Revenue Regulations No. 8-2018 |
| authorityMatchTier (forced) | 3 | 3 | 3 | 3 | 3 |
| hasSpecificAuthorityPlan (mirror) | true | true | true | true | true |
| docOnSpecificAuthorityPlan (mirror) | **false** (`TIER_3_REJECTED_NO_NIRC_FALLBACK`) | **false** (same) | **false** (same) | **false** (same) | **false** (same) |
| directlyGovernsIssue (real annotation) | false | false | false | false | false |
| authorityRole (real annotation) | RELATED | RELATED | RELATED | RELATED | RELATED |
| isGoverning (real annotation) | false | false | false | false | false |
| higherAuthorityMissing | false | false | false | false | false |
| semanticNoMatchGuard | inactive (null) | inactive (null) | inactive (null) | inactive (null) | inactive (null) |
| issueClassification.primaryIssue (real `classify()` output) | GENERAL_TAX | GENERAL_TAX | GENERAL_TAX | GENERAL_TAX | GENERAL_TAX |
| issueClassification.targetAuthorities (real) | [NIRC/primary statute, "RR No. 2-1998", BIR issuances] | [NIRC/primary statute, "RR No. 12-2018", BIR issuances] | [NIRC/primary statute, "RMO No. 24-2013", BIR issuances] | [NIRC/primary statute, "RR No. 11-2018", BIR issuances] | [NIRC/primary statute, "RR No. 8-2018", BIR issuances] |
| Inferred eligibility for AUTHORITY_FOUND | NOT_ELIGIBLE | NOT_ELIGIBLE | NOT_ELIGIBLE | NOT_ELIGIBLE | NOT_ELIGIBLE |

Raw JSON output of the harness run is preserved in this session's tool transcript and reproducible by re-running `node _patch027i_runtime_diagnostic.mjs` from the `tina-backend` root.

---

## 3. Tier-3 Acceptance/Rejection Evidence (Isolation Control)

To isolate the tier variable from any other confound, a second experiment held the RR 12-2018 document and its real `classify("Explain RR 12-2018")` output **completely fixed** and varied only `authorityMatchTier`:

```json
[
  { "forcedTier": 1, "docOnSpecificAuthorityPlan": {"result": true,  "reason": "tier_le_2"},                     "authorityRole": "GOVERNING", "isGoverning": true  },
  { "forcedTier": 2, "docOnSpecificAuthorityPlan": {"result": true,  "reason": "tier_le_2"},                     "authorityRole": "GOVERNING", "isGoverning": true  },
  { "forcedTier": 3, "docOnSpecificAuthorityPlan": {"result": false, "reason": "TIER_3_REJECTED_NO_NIRC_FALLBACK"}, "authorityRole": "RELATED",   "isGoverning": false },
  { "forcedTier": 4, "docOnSpecificAuthorityPlan": {"result": false, "reason": "tier_4_no_match"},                "authorityRole": "RELATED",   "isGoverning": false }
]
```

This is unambiguous: **the tier value alone flips the real `buildAuthorityAnnotation()` output between `GOVERNING` and `RELATED`**, with every other input held constant. Tier 1 and tier 2 reach `GOVERNING`; tier 3 — despite representing a confirmed citation/variant match per `retrieval-engine.js`'s own `docMatchesSpecificAuthorityPlan()` semantics — is treated exactly the same as tier 4 (no match at all).

---

## 4. Exact File/Function/Line Where Rejection Occurs

- **File:** `authority-utils.js`
- **Function:** `docOnSpecificAuthorityPlan` (lines 557–583)
- **Exact rejecting line:** line 582, `return false;` — reached whenever `hasSpecificAuthorityPlan(issueClassification)` is `true` (line 566 does not short-circuit), `authorityMatchTier > 2` (line 569 does not short-circuit), and the document's citation text contains no extractable NIRC section number matching any planned authority (lines 571–580 loop never finds a match because `extractNircSectionNumber(docCitationText(doc))` returns `null` for any RR/RMC/RMO citation — those citations are not section-numbered the way NIRC provisions are).
- **Propagation:** `docOnSpecificAuthorityPlan(doc) === false` causes `directlyGovernsIssue()` (`authority-utils.js:585–601`) to return `false` at its own early-return guard, line 587 (`if (!docOnSpecificAuthorityPlan(doc)) return false;`), **before** any of the exact/target-authority-match checks (lines 590–600) are even evaluated.
- **Final effect:** `getAuthorityRole()` (`authority-utils.js:603–636`) receives `directlyGoverns: false`, so neither `GOVERNING` branch (lines 631–632) can fire; the candidate falls through to `RELATED` at line 634 (since `directlyGoverns === false`).

---

## 5. What This Proves, and What It Does Not (Honest Accounting)

**Proven, with real-code evidence:**
- The gate defect described in PATCH-027I Section 5 is real, reproducible, and not an artifact of static-reading speculation: the actual exported `authority-utils.js` function rejects tier-3 candidates identically to tier-4 candidates, for any RR/RMO document, regardless of which specific authority it is (the rejection is structural, not authority-specific — consistent with the "no hardcoding" design constraint).
- The defect is exactly localized to `docOnSpecificAuthorityPlan`, line 582, as traced through `directlyGovernsIssue` into `getAuthorityRole`.

**Not independently re-proven by this harness (relies on PATCH-027H's separate, already-recorded empirical finding instead):**
- That RR 2-98, RR 12-2018, and RMO 24-2013 *actually resolve to tier 3* in live production retrieval (as opposed to tier 4, or some other path) — this harness forced tier 3 by construction to test the gate's behavior at that tier, it did not observe what tier the live `retrieval-engine.js` assigns to these specific documents for these specific queries today. PATCH-027H already established the **end-result** (`RELATED_AUTHORITY_ONLY`) for these three from prior real test execution, which is consistent with — but not, by this harness alone, proven to be caused specifically by — landing on tier 3 rather than tier 4. Both tier 3 and tier 4 produce `RELATED` in the real annotation function (Section 3), so from the annotation layer alone, `RELATED_AUTHORITY_ONLY` is explained either way. The distinction matters only for *which fix* is correct: if these documents are actually landing on tier 4 (no match at all) rather than tier 3, the defect would be in retrieval/matching (`retrieval-engine.js`'s `docMatchesSpecificAuthorityPlan`/`generateAuthorityVariants`), not in `authority-utils.js`'s handling of an already-confirmed tier-3 match.
- Why RR 11-2018 / RR 8-2018 pass in real production. This harness shows that *if* they were forced to tier 3 they would behave identically to the failing three (i.e., also fail) — which means their real production tier must be `<= 2`, or `hasSpecificAuthorityPlan()` must resolve `false` for their real production `issueClassification`, for them to actually reach `AUTHORITY_FOUND` as PATCH-027H observed. This harness does not observe their real production tier either; it only shows what tier would be required for the observed pass outcome to be consistent with the gate's real behavior.

**Conclusion of this section:** the annotation-gate defect itself is conclusively proven via real code execution. Confirming that this specific defect (rather than a retrieval/tier-assignment problem one layer up) is the actual cause of the three real production failures still requires either (a) the live-pipeline-run diagnostic option declined for this task, or (b) production log capture of the real `authorityMatchTier` value for these three queries via the existing `[SOURCE AVAILABILITY]`/`[PATCH_018A_PRE_SAE_COUNTS]` console logging already present in `pipeline.js`, which a future PATCH-027J effort should obtain before merging a code change, per PATCH-027I Section 8's diagnostic prerequisite and Section 13's evidence-attachment release-gate criterion.

---

## 6. Files Touched in This Diagnostic Pass

- **Created (diagnostic harness, not production code):** `tina-backend/_patch027i_runtime_diagnostic.mjs` — imports real exported functions, constructs synthetic inputs, prints results. Contains no modification to any production file. Not committed; retained locally for repeatable re-validation.
- **Created (this report):** `tina-backend/reviews/PATCH-027I_RUNTIME_DIAGNOSTIC_CAPTURE.md`.
- **Not modified:** `authority-utils.js`, `retrieval-engine.js`, `issue-classification-engine.js`, `pipeline.js`, or any other production file. No temporary `console.log` instrumentation was added to any production file — the "temporary diagnostic logging if strictly required" allowance was not needed because the harness approach captures the needed evidence externally.

---

## 7. Whether PATCH-027J Should Proceed

**Yes, with one prerequisite carried forward rather than waived.**

The gate defect is real, reproducible, generalized (not authority-specific), and precisely localized (Section 4). This is sufficient to design and implement the minimal fix (Section 8). However, consistent with the honest accounting in Section 5, PATCH-027J's execution should include, as its first step, a lightweight confirmation that the three failing authorities are actually landing on tier 3 in live retrieval (not tier 4) — via the already-present `[SOURCE AVAILABILITY]` console logging during a live or staging request, or via a follow-up live-pipeline diagnostic run of the kind declined in this task. If they are landing on tier 4 instead, the fix described here would not resolve them, and the actual defect would be one layer up in `retrieval-engine.js`'s variant-matching (`generateAuthorityVariants`/`haystackIncludesVariant`) rather than in `authority-utils.js`'s tier handling. This is a fast, cheap confirmation step, not a reason to delay PATCH-027J's design work.

---

## 8. Minimal Safe Fix Recommendation (If Proven — Design Only, Not Implemented)

Confirmed and unchanged from PATCH-027I Section 10, Option A, now backed by real-code proof rather than static-reading inference:

In `authority-utils.js`, inside `docOnSpecificAuthorityPlan` (lines 557–583), add an explicit acceptance for tier 3 alongside the existing `tier <= 2` check at line 569:

```js
const tier = Number(doc.authorityMatchTier ?? match.authorityMatchTier ?? 4);
if (tier <= 3) return true;   // was: tier <= 2
```

or equivalently as a separate branch (`if (tier === 3) return true;`) if the team prefers to keep the tier-2 and tier-3 acceptance paths visually distinct for future maintainers. Either form is a single-line, generalized change with no authority-specific string or regex, consistent with PATCH-027I's release-gate criterion #4 (no hardcoding).

This recommendation is **not implemented** in this diagnostic pass, per the task's explicit constraint. It remains pending: (a) the tier-3-vs-tier-4 confirmation in Section 7, and (b) the full 8-query regression test matrix and false-positive spot-check already specified in PATCH-027I Sections 9 and 13.

---

## Constraints Honored

This document and its accompanying harness script are investigation only. No production file (`authority-utils.js`, `retrieval-engine.js`, `issue-classification-engine.js`, `pipeline.js`) was modified. No temporary logging was added to production code. No SQL was executed. No database was queried. No OpenAI API call was made. No deployment occurred. The harness script was not committed to version control.
