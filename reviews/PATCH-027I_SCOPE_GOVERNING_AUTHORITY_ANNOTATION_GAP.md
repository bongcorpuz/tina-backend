# PATCH-027I — Scope Document: Governing Authority Annotation Gap (RR/RMC/RMO Instance-Level Matching)

**Date:** 2026-06-16
**Repository:** tina-backend
**Branch:** feature/source-availability-engine-v1
**Mode:** Investigation / design only. No code changes. No SQL. No deployment. No runtime mutation.
**Predecessor documents:** `PATCH-027H_RELATED_AUTHORITY_ONLY_INVESTIGATION.md`, `PATCH-027H_ADDENDUM_DUAL_CLASSIFIER_RESOLVED.md`, `PATCH-027B-R3_EXECUTION_RESULTS.md`.

---

## 1. Executive Summary

PATCH-027H established that `RELATED_AUTHORITY_ONLY` (instead of `AUTHORITY_FOUND`) for RR 2-98, RR 12-2018, and RMO 24-2013 is caused by those candidates never reaching `authorityRole === "GOVERNING"`, and traced the gate to `directlyGovernsIssue()` → `docOnSpecificAuthorityPlan()` in `authority-utils.js`. This document goes one step further than PATCH-027H's Section 8 (which left the exact sub-gate unresolved) and identifies a **specific, generalizable structural defect** in `docOnSpecificAuthorityPlan` (`authority-utils.js:557–583`): it special-cases NIRC section-number matching but has **no fallback path at all** for the case where `retrieval-engine.js` has already confirmed an RR/RMC/RMO/RA instance-level match via `docMatchesSpecificAuthorityPlan()` (signaled by `authorityMatchTier === 3`). Tier 3 is silently treated as a failure inside `authority-utils.js`, even though it represents a real, already-computed positive match.

This is a candidate root cause that is generalizable (not authority-specific) and does not require hardcoding RR 12-2018 or RMO 24-2013. It must still be confirmed against runtime diagnostic data (Section 8) before any code change, per this document's own scope limits.

**Mission alignment:** This work directly serves "No retrieval = no authoritative answer" and "Authority integrity is more important than answer fluency" (governance North Star). A generalized fix reduces reliance on the narrow, per-query-shape bridges (PATCH-017B, PATCH-017H) that the governance repository's Authority Lock principles caution against perpetuating.

---

## 2. Current Confirmed Facts

1. `classifySourceAvailability` (`pipeline.js:1532–1684`) is the sole live SAE classifier; `computeSourceAvailability` (`pipeline.js:1286–1336`) is dead code (PATCH-027H Addendum).
2. `RELATED_AUTHORITY_ONLY` fires when at least one candidate is indexed/parsed but none reaches `authorityRole === "GOVERNING"` (`pipeline.js:1644–1654`).
3. `GOVERNING` requires `directlyGovernsIssue === true` plus `isIndexed`, `isParsed`, and `!higherAuthorityMissing` (`authority-utils.js:631–632`).
4. `directlyGovernsIssue(doc, issueClassification)` (`authority-utils.js:585–601`) gates on `docOnSpecificAuthorityPlan(doc)` **first** — if this returns `false`, the function short-circuits to `false` regardless of any exact/target authority match signal.
5. `docOnSpecificAuthorityPlan` (`authority-utils.js:557–583`):
   - Returns `true` immediately if `hasSpecificAuthorityPlan(issueClassification)` is `false` (i.e., the issue classification's planned authorities don't look like a specific NIRC section / RR / RMC / RMO / RA reference at all) — line 566.
   - Returns `true` if `authorityMatchTier <= 2` — line 569.
   - Otherwise, attempts a **NIRC-section-number-only** match (`extractNircSectionNumber`) between the doc and each planned authority — lines 571–580.
   - Returns `false` if none of the above succeed — line 582.
6. `authorityMatchTier` is computed upstream in `retrieval-engine.js`'s `computeAuthorityMatchTier` (lines 1538–1560):
   - Tier 1: exact NIRC section number match.
   - Tier 2: doc's NIRC section falls within a planned NIRC section range.
   - **Tier 3: `docMatchesSpecificAuthorityPlan(doc, classification)` returns `true`** — and that function (lines 1507–1536) checks NIRC sections **and** falls through to `generateAuthorityVariants(authority)` + `haystackIncludesVariant(doc, variant)`, i.e. a real, generalized RR/RMC/RMO/RA instance-text match against the doc.
   - Tier 4: no match at all.
7. **The defect:** tier 3 already represents a confirmed RR/RMC/RMO/RA instance-level match (computed in `retrieval-engine.js`), but `docOnSpecificAuthorityPlan` in `authority-utils.js` only accepts tier `<= 2` outright; for tier 3 it falls through to a NIRC-section-only check that **cannot succeed for a non-NIRC document** (an RR/RMO citation text has no extractable NIRC section number, so `extractNircSectionNumber(docCitationText(doc))` is `null`, and the loop at lines 573–579 never executes because of the `if (docSection !== null)` guard at line 572). The function therefore returns `false` at line 582 for every tier-3 RR/RMC/RMO candidate, discarding a signal that `retrieval-engine.js` already confirmed as a match.
8. This defect is structural and generalized — it is not specific to RR 12-2018 or RMO 24-2013. It would affect **any** RR/RMC/RMO/RA authority whose match strength resolves to tier 3 under a query that has `hasSpecificAuthorityPlan() === true`.
9. `PATCH-027B-R2`/`PATCH-027B-R3` (metadata `normalized_reference`/`normalized_aliases` repair, 30+5 sources, all PASS) are confirmed unrelated to this gate — they fixed retrieval/identity, not role annotation (PATCH-027H Section 5).

---

## 3. Closed Items (from PATCH-027H)

| Item | Status |
|---|---|
| Identify which function assigns `RELATED_AUTHORITY_ONLY` | Closed — `classifySourceAvailability`, confirmed sole live path |
| Resolve dual-classifier ambiguity (`computeSourceAvailability` vs `classifySourceAvailability`) | Closed — `computeSourceAvailability` is dead code, no call sites, not exported |
| Confirm whether source-card selection can promote/override SAE status | Closed — `validateSourceCardEligibility` is strictly downstream/enforcing, cannot promote status |
| Confirm whether PATCH-017B/PATCH-017H bridges apply to RR 12-2018 / RMO 24-2013 | Closed — neither bridge's activation condition can fire for either authority |
| Confirm `authority_type`/`authority_label` are not independently load-bearing for the gate | Closed — only `authorityType` (via `recognizedGoverningType`) and `authorityLevel` (via the `[12,13,14]` SECONDARY short-circuit, not applicable here) matter; `authority_label` is cosmetic |

---

## 4. Remaining Open Items

1. **Confirm the tier-3 hypothesis against live data** (this document's Section 8) for RR 2-98, RR 12-2018, RMO 24-2013, and contrast with RR 11-2018 / RR 8-2018 to confirm the passing two are passing via tier `<=2` or via `hasSpecificAuthorityPlan() === false`, not via some other path.
2. **Determine why `hasSpecificAuthorityPlan(issueClassification)` might be `true` for some of these queries and `false` for others** — this depends on what `targetAuthorities`/`controllingAuthorities` the issue-classification engine actually emits per query, which is not a static property of the document.
3. **Determine whether `semanticNoMatchGuard`** (`sourceMaterialTermsMatchAuthority`, the second gate in `directlyGovernsIssue`) independently fails for any of the three target authorities, which would mean fixing `docOnSpecificAuthorityPlan` alone is insufficient.
4. **Decide remediation approach** (Section 10) and validate it does not regress the 5 PATCH-027B-R2/R3-pilot authorities or the 3 additional R3-repaired authorities specified for this scope's test matrix.

---

## 5. Root-Cause Hypothesis

**Primary hypothesis (generalized, not authority-specific):**

`docOnSpecificAuthorityPlan` in `authority-utils.js` does not have a code path that accepts an `authorityMatchTier === 3` result (a confirmed RR/RMC/RMO/RA instance-level variant-text match already computed by `retrieval-engine.js`'s `docMatchesSpecificAuthorityPlan`). It only accepts tier `<= 2` (NIRC-section-specific) or a redundant, RR/RMC/RMO-incompatible NIRC-section re-check. Any RR/RMC/RMO/RA authority whose correct match resolves to tier 3 is therefore always rejected by this gate, regardless of how cleanly it actually matches the query's authority plan.

This would explain:
- Why RR 12-2018 and RMO 24-2013 — which have no rescue bridge — fail.
- Why RR 2-98 fails **except** when the WHT/EWT bridge happens to fire (the bridge bypasses `directlyGovernsIssue`/`docOnSpecificAuthorityPlan` entirely via its own independent matching logic in `pipeline.js:2846–2856`, so it is not subject to this gate at all).
- Why RR 11-2018 / RR 8-2018 might still pass: either (a) their queries' `issueClassification.targetAuthorities` did not populate a recognizable RR/RMC/RMO/RA-shaped term, so `hasSpecificAuthorityPlan()` returned `false` and the gate short-circuited `true` at line 566, or (b) some other tier-1/2-adjacent condition applied. This must be confirmed, not assumed (see Section 8).

**Alternative/contributing hypotheses (lower confidence, to be ruled out via diagnostics, not assumed false):**
- `semanticNoMatchGuard` (the second, independent gate inside `directlyGovernsIssue`, sourced from `issue-classification-engine.js:384–411`) could itself be failing for one or more of the three target authorities, in which case fixing `docOnSpecificAuthorityPlan` alone would not flip the outcome for that authority.
- `higherAuthorityMissing` (a separate condition in `getAuthorityRole`, `authority-utils.js:631`) could independently block `GOVERNING` even if `directlyGovernsIssue` is fixed, if `requiredAuthorityLevel` computation (`getRequiredAuthorityLevel`, lines 476–494) resolves unfavorably for any of the three authorities. Not yet ruled out.

---

## 6. Files and Functions In Scope

| File | Function(s) | Role |
|---|---|---|
| `authority-utils.js` | `docOnSpecificAuthorityPlan` (557–583), `hasSpecificAuthorityPlan` (537–544), `directlyGovernsIssue` (585–601), `getAuthorityRole` (603–636) | Primary candidate for the fix — the annotation gate itself |
| `retrieval-engine.js` | `computeAuthorityMatchTier` (1538–1560), `docMatchesSpecificAuthorityPlan` (1507–1536), `hasSpecificAuthorityTargets` (1498–1505), `generateAuthorityVariants` (referenced, not yet located/read in this investigation), `buildIssueClassificationMatch` (1724–1787) | Source of the `authorityMatchTier`/`targetAuthorityMatch`/`exactAuthorityMatch` signals that `authority-utils.js` consumes; read-only reference, not expected to change unless the diagnostic phase finds the tier computation itself is wrong |
| `issue-classification-engine.js` | `sourceMaterialTermsMatchAuthority` (384–411) | The semantic "unsupported qualifiers" guard — second gate inside `directlyGovernsIssue`; in scope for diagnostic verification, not assumed to need a code change |
| `pipeline.js` | `classifySourceAvailability` (1532–1684), call site (2737) | Consumer of the annotation; in scope only to confirm no other interaction effect, not expected to change |

---

## 7. Files and Functions Out of Scope

- `services/source-authority-selector.js` (`validateSourceCardEligibility`, 226–264) — confirmed downstream/enforcing only (PATCH-027H Section 6); no change anticipated.
- `pipeline.js`'s PATCH-017B (EWT, 2813–3001) and PATCH-017H (VAT, 3003+) bridges — explicitly not to be extended, replicated, or used as a template per governance guidance against accumulating narrow per-authority/per-domain bridges (PATCH-027H Recommended Remediation #1). They remain as-is.
- Any database/Supabase schema, `normalized_reference`, or `normalized_aliases` column data — already repaired and verified correct under PATCH-027B-R2/R3; not implicated by this gap (PATCH-027H Section 5).
- `authority_type` classification logic (`classifyAuthorityFromDocument`, `normalizeAuthorityType`) — confirmed not the cause; RR/RMC/RMO are already in `recognizedGoverningType`.
- Any ingestion, indexing, or embedding pipeline code — this gap is purely in post-retrieval annotation, not retrieval or indexing.
- Front-end/source-card rendering code — downstream of the decision point; out of scope by definition.

**Explicit non-goals for this patch** (per task constraints): no hardcoded RR 12-2018 or RMO 24-2013 special-casing; no new narrow bridge; no code or SQL changes in this scope-document phase.

---

## 8. Required Runtime Diagnostics (must precede any fix)

The following must be captured via a traced live request (or equivalent structured debug logging) for each of the 8 test-matrix queries (Section 9) before any remediation is implemented, to confirm or refute Section 5's hypothesis:

1. **Per-query `issueClassification` payload:** `targetAuthorities`, `controllingAuthorities`, `supportingAuthorities`, `authoritySearchTerms`, `semanticNoMatchGuard`, `primaryIssue`, `subIssue`. Available via `[PATCH_018A_PRE_SAE_COUNTS]` / `[SOURCE AVAILABILITY]` console output (`pipeline.js:2737`, `2789–2797`) or `diagnostics.partialPipelineState`.
2. **Per-candidate `authorityAnnotation`** for the top retrieved chunk(s) of each query: `authorityRole`, `directlyGovernsIssue`, `isParsed`, `isIndexed`, `higherAuthorityMissing`, `authorityMatchTier`, `semanticNoMatchGuard.active`.
3. **Explicit confirmation of `hasSpecificAuthorityPlan(issueClassification)`'s boolean result** for each query — this is the line-566 short-circuit and is the single most important value to capture, since the hypothesis in Section 5 predicts a specific true/false pattern across the 8 queries (`true` for the 3 failing + at least 1 of the 3 R3-repaired authorities if they also fail; `false` or tier `<=2` for the 2 passing controls).
4. **`authorityMatchTier` value** per candidate, to confirm whether failing authorities resolve to tier 3 (predicted) vs. tier 4 (would refute the hypothesis and point elsewhere, e.g. retrieval not finding the document at all under this query phrasing) vs. tier 1/2 (would mean the gate isn't the blocker and the defect is elsewhere, e.g. `higherAuthorityMissing` or the semantic guard).
5. **`semanticNoMatchGuard.matches` result independent of `docOnSpecificAuthorityPlan`** — to rule in/out the alternative hypothesis in Section 5.

These diagnostics are explicitly **not** to be gathered by modifying source code in this phase; they should be captured by running the existing, already-present console logging (`pipeline.js` already logs `[SOURCE AVAILABILITY]`, `[PATCH_018A_PRE_SAE_COUNTS]`, etc.) against a live or staging request for each test-matrix query, or via `diagnostics.partialPipelineState` if exposed in the API response. If no existing log line captures `authorityMatchTier` or `hasSpecificAuthorityPlan`'s result at a granular-enough level, that gap itself should be noted as a follow-up (additional temporary diagnostic logging), not as grounds to skip this step.

---

## 9. Test Matrix

| # | Query | Category | Expected outcome before fix | Expected outcome after a correct fix |
|---|---|---|---|---|
| 1 | Explain RR 11-2018 | PASS control | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` (no regression) |
| 2 | Explain RR 8-2018 | PASS control | `AUTHORITY_FOUND` | `AUTHORITY_FOUND` (no regression) |
| 3 | Explain RR 2-98 | Target (partial bridge coverage) | `RELATED_AUTHORITY_ONLY` (unless WHT/EWT bridge fires) | `AUTHORITY_FOUND` via the generalized gate, independent of query-domain classification |
| 4 | Explain RR 12-2018 | Target (no bridge) | `RELATED_AUTHORITY_ONLY` | `AUTHORITY_FOUND` |
| 5 | Explain RMO 24-2013 | Target (no bridge) | `RELATED_AUTHORITY_ONLY` | `AUTHORITY_FOUND` |
| 6 | Explain RR 9-98 | PATCH-027B-R3 repaired, regression check | Unknown — not previously tested against this gate; must be captured as part of Section 8 baseline | `AUTHORITY_FOUND` (must not regress if currently passing; must be fixed if currently also failing) |
| 7 | Explain RMC 65-2012 | PATCH-027B-R3 repaired, regression check | Unknown — same as above | Same as above |
| 8 | Explain RMO 20-2013 | PATCH-027B-R3 repaired, regression check | Unknown — same as above | Same as above |

**Note:** Queries 6–8 were not part of PATCH-027H's original 5-authority test set. Their pre-fix baseline status is currently unknown and must be established during the Section 8 diagnostic pass — they may already be passing (in which case they serve purely as regression guards) or may already be exhibiting the same tier-3 defect (in which case they become additional target cases, broadening the fix's confirmed impact). Either outcome is informative and must be recorded before the fix is designed in detail.

---

## 10. Proposed Remediation Options

**Option A — Accept tier 3 as a valid match in `docOnSpecificAuthorityPlan` (preferred, lowest blast radius).**
Add an explicit `if (tier === 3) return true;` (or equivalent) immediately alongside the existing `tier <= 2` check at `authority-utils.js:569`, since tier 3 already represents a confirmed `docMatchesSpecificAuthorityPlan` variant-text match computed upstream. This trusts `retrieval-engine.js`'s existing, already-correct RR/RMC/RMO/RA variant-matching logic rather than duplicating or re-deriving it inside `authority-utils.js`. Generalized; not authority-specific; touches one function.

**Option B — Re-implement RR/RMC/RMO/RA instance matching natively inside `docOnSpecificAuthorityPlan`.**
Port or call `docMatchesSpecificAuthorityPlan`'s variant-matching logic (or `generateAuthorityVariants`/`haystackIncludesVariant`) directly into `authority-utils.js`, rather than relying on the tier number as a proxy. More robust to future changes in tier semantics, but duplicates logic across two files (`retrieval-engine.js` and `authority-utils.js`) unless refactored into a shared module — higher implementation cost, same generalized benefit as Option A.

**Option C — Loosen `hasSpecificAuthorityPlan`'s coarse regex test instead.**
Not recommended as a primary fix: `hasSpecificAuthorityPlan` only decides whether the early-return-`true` short-circuit applies when there is *no* specific plan at all; it doesn't address the tier-3 rejection, which only matters when a specific plan *does* exist. Adjusting it would risk over-broadening the short-circuit (defeating the gate's purpose) without resolving the actual defect.

**Recommendation:** Option A, pending Section 8 diagnostic confirmation. It is the minimal, generalized change consistent with the task's explicit instruction to prefer generalized RR/RMC/RMO instance-level matching over further hardcoding.

---

## 11. Risk Analysis

| Risk | Severity | Mitigation |
|---|---|---|
| Tier-3 hypothesis is wrong or incomplete (e.g., semantic guard also fails) | Medium | Section 8 diagnostics must run and be reviewed before implementation; fix scope may need to expand to cover the semantic guard too |
| Accepting tier 3 as a pass over-broadens `GOVERNING` eligibility, allowing a loosely-related authority to be presented as controlling (violates Authority Lock / "no answer presented as controlling without verified governing status") | High if unmitigated | Tier 3 is not an arbitrary fuzzy match — it is produced by `docMatchesSpecificAuthorityPlan`, which requires either an NIRC section match or a `generateAuthorityVariants` text-variant hit against the doc, i.e. an actual citation-level match, not a semantic/vector similarity score. This is a meaningfully narrower bar than "retrieved at all." Still, the full test matrix (Section 9) including all 8 queries must pass with no new false-`GOVERNING` results before this is considered safe. |
| Regression on PATCH-027B-R2/R3-repaired authorities (5 + 3 = 8 total across both test sets) | Medium | Full regression run against all 8 test-matrix queries (Section 9) is mandatory before sign-off, not just the 3 target queries |
| Fix masks rather than resolves the underlying issue if `computeAuthorityMatchTier`'s tier-3 classification itself has false positives (e.g., `generateAuthorityVariants` over-matches) | Medium | Diagnostics (Section 8) should also spot-check that tier-3 matches for the target authorities are citation-accurate (i.e., manually confirm the matched variant text genuinely corresponds to the queried RR/RMC/RMO, not a coincidental substring match) |
| Governance non-negotiable: "No verified source = no legal citation" | Must not be violated | The proposed fix only changes which already-retrieved, already-indexed, already-parsed candidates can reach `GOVERNING` — it does not change retrieval, indexing, or fabricate any authority. No new code path bypasses indexing/parsing checks. |

---

## 12. Recommended Minimal Patch Path

1. Execute Section 8 diagnostics for all 8 test-matrix queries (read-only, log-capture only — no code change).
2. Confirm or refute the tier-3 hypothesis against the captured data.
3. If confirmed: implement Option A as a single, minimal, generalized conditional in `docOnSpecificAuthorityPlan` (`authority-utils.js:557–583`) — no new file, no new bridge, no authority-specific string matching.
4. If partially confirmed (e.g., tier-3 fix resolves RR 12-2018/RMO 24-2013 but not RR 2-98 due to the WHT bridge interaction, or one of the R3-repaired authorities needs the semantic-guard path addressed too): scope a follow-up sub-item rather than expanding this patch ad hoc.
5. Run the full 8-query test matrix (Section 9) plus the original PATCH-027H 5-authority set (already a subset) and the existing PATCH-027B-R2/R3 control-group/non-interference checks (no re-run of SQL needed — those are DB-layer and unaffected by an application-layer annotation change, but the *retrieval/annotation* behavior for those same authorities should still be spot-checked).
6. Document results in a `PATCH-027I_EXECUTION_RESULTS.md` (or equivalent) before requesting deployment approval, per this repository's governance hierarchy (no production deployment without governance approval).

This patch path explicitly avoids: hardcoding RR 12-2018 or RMO 24-2013, adding a new narrow bridge, or modifying `authority-utils.js` in this scoping phase.

---

## 13. Release-Gate Criteria

A future PATCH-027I implementation must satisfy all of the following before being considered for merge/deployment:

1. All 5 PASS/target queries from PATCH-027H (RR 11-2018, RR 8-2018, RR 2-98, RR 12-2018, RMO 24-2013) resolve to `AUTHORITY_FOUND`.
2. All 3 additional PATCH-027B-R3-repaired regression queries (RR 9-98, RMC 65-2012, RMO 20-2013) resolve to `AUTHORITY_FOUND` or, if they were already `AUTHORITY_FOUND` pre-fix, show no regression.
3. No change to `authority_type`, `authority_label`, `authority_level`, `text`, `embedding`, `metadata`, or any database content — this remains an application-layer-only annotation fix, consistent with the precedent set by PATCH-027B-R2/R3 (DB layer) being kept strictly separate from this (annotation layer) fix.
4. The fix introduces no authority-specific hardcoding (no literal "RR 12-2018" / "RMO 24-2013" string or regex anywhere in the change).
5. Existing PATCH-017B (EWT) and PATCH-017H (VAT) bridges are not modified, removed, or relied upon by the new fix — the new fix must work independently of those bridges' activation conditions.
6. `validateSourceCardEligibility` (`services/source-authority-selector.js`) continues to reject any `RELATED_AUTHORITY_ONLY`-tagged card from being marked `isGoverning === true` — i.e., the enforcement layer is unaffected and still functions as a backstop.
7. A spot-check of at least 3 authorities **not** in this test matrix (drawn from the broader RR/RMC/RMO corpus) confirms no unintended new `AUTHORITY_FOUND` upgrade for genuinely unrelated/non-matching authorities (false-positive guard against over-broadening).
8. Diagnostic evidence (Section 8) supporting the root-cause hypothesis is attached to the execution-results document, not asserted without evidence.
9. Governance sign-off per this repository's `RELEASE_GATES.md` and the Dev Factory's authority-integrity non-negotiables is obtained before production deployment — this scope document does not itself constitute that approval.

---

## Constraints Honored

This document is investigation/design only. No file other than this new scope document was created or modified. `authority-utils.js` was read but not modified. No bridge was added. No authority was hardcoded into any conditional logic. No SQL was executed. No database was queried. No deployment occurred.
