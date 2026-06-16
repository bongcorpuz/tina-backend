# PATCH-027H — Addendum: Dual-Classifier Ambiguity Resolved

**Date:** 2026-06-16
**Repository:** tina-backend
**Branch:** feature/source-availability-engine-v1
**Mode:** Investigation only. No code changes. No SQL changes. No deployment.

---

## Purpose

Resolves Gap Item 3 from `PATCH-027H_RELATED_AUTHORITY_ONLY_INVESTIGATION.md` (Section 1, Section 8, Recommended Remediation #4): whether `computeSourceAvailability` (`pipeline.js:1286–1336`) can independently set/overwrite `ctx.saeStatus` after `classifySourceAvailability` runs.

## Finding

**`computeSourceAvailability` is dead code. It is not live-wired.**

- `Grep` for `computeSourceAvailability(` across the entire `tina-backend` repository returns exactly one match: its own function declaration at `pipeline.js:1286`. No call site exists anywhere.
- `Grep` for `export ... computeSourceAvailability` / `module.exports ... computeSourceAvailability` returns no matches — the function is not exported from `pipeline.js`, so no other module (e.g. `services/source-authority-selector.js`) can invoke it either.
- It is declared as a plain, non-exported function in the same file as `classifySourceAvailability`, which strongly suggests it is either a superseded earlier implementation or a draft never wired in, left in place.

**Conclusion:** `classifySourceAvailability` (`pipeline.js:1532–1684`, called at `pipeline.js:2737`) is the **sole live authority** for the initial `ctx.saeStatus` value. There is no second classifier competing with or silently overriding it.

## Confirmed legitimate post-classification overwrites

Re-read `pipeline.js:2789–3090` in full. After `classifySourceAvailability` runs, exactly two code paths overwrite `ctx.saeStatus`, both already known/documented:

1. **PATCH-017B Pre-Generation Authority Lock** (`pipeline.js:2813–3001`) — scoped to `WITHHOLDING`/`WHT`-classified queries (`_pgIsWht`) with EWT-domain target authorities or keywords (`_pgHasEwtTgts`/`_pgHasEwtKw`). Sets `ctx.saeStatus = "AUTHORITY_FOUND"` at line 2883 only if `_pgAccepted > 0` and (`_pgHasTarget` or `_pgAccepted >= 2`). This is the bridge that hardcodes an RR 2-98 regex (`/rr[\s\-.]?2[\s\-.]?98\b/i`) as one of two ways to satisfy `_pgHasEwtTgts` — it activates only when the *query* is classified into the WHT domain, not whenever RR 2-98 is merely retrieved.
2. **PATCH-017H VAT Definition Bridge** (`pipeline.js:3003+`) — gated on `isVatDefinitionQuery(ctx.issueClassification)` and only fires when prior status is `NO_INDEXED_SOURCE` or `RELATED_AUTHORITY_ONLY` (line 3024–3027). Sets `ctx.saeStatus = "AUTHORITY_FOUND"` at line 3078.

Neither bridge contains any condition that could fire for RR 12-2018 or RMO 24-2013 (no VAT-definition or WHT/EWT keyword/target-authority match applies to either). This corroborates PATCH-027H's original finding without contradiction: those two authorities have **zero rescue-bridge coverage**, and RR 2-98's rescue is conditional on query-domain classification, not guaranteed.

## Effect on PATCH-027H Recommended Remediation

Item 4 ("Resolve the dual-classifier ambiguity ... as a precursor to any fix") is now closed: there is only one live classifier (`classifySourceAvailability`), so a future root-cause fix to the `authorityRole`/`directlyGovernsIssue` annotation pipeline (Remediation Item 2 — `docOnSpecificAuthorityPlan`/`hasSpecificAuthorityPlan` RR/RMC/RMO instance-level precision) does not need to separately account for `computeSourceAvailability` ever intercepting or contradicting it.

No other remediation item from PATCH-027H is affected by this finding. Items 1, 3 (diagnostic data capture) and 5 (scope as PATCH-027I) remain open and unactioned.

---

## Constraints Honored

This document is investigation only. No file in `tina-backend` was modified. No SQL was executed. No database was queried. No deployment occurred. Findings are derived from static `Grep`/`Read` of already-existing source code only.
