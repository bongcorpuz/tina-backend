# PATCH-017K — Indexed Supporting Authority Availability Mapping

## Status

IMPLEMENTED

## Root Cause

The AUTHORITY_FOUND restoration block in `pipeline.js` matched candidates using a single
`canonicalSourceKey()` call on the chunk's primary `citation` / `normalizedReference` field:

```
canonicalSourceKey("Revenue Regulation No. 16-2005") → "revenueregulation162005"
canonicalSourceKey("RR 16-2005")                     → "rr162005"
```

These two keys are not equal. Chunks for RR 16-2005 in the vector store store their
`normalizedReference` in the long-form "Revenue Regulation No. 16-2005" — while the
classification's `targetAuthorities` list uses the short form "RR 16-2005". The exact-key
match missed RR 16-2005 even though the chunk was present in `ctx.rerankedChunks`.

NIRC Sec. 105–108 chunks were not affected because their normalizedReference values already
contain the short form ("NIRC Sec. 105", etc.) which canonicalizes correctly.

## Fix — Two Layers in `pipeline.js`

### Layer 1: Alias-aware candidate matching

For each candidate in `ctx.rerankedChunks`, the find() now computes an expanded set of
canonical keys (without a helper function — inline in the find() predicate):

1. **Direct**: `canonicalSourceKey(citation || normalizedReference || ...)` — unchanged path
2. **RR alias**: normalizes "Revenue Regulation[s]" → "rr" before `canonicalSourceKey` — fixes
   "Revenue Regulation No. 16-2005" ≡ "RR 16-2005"
3. **inferAdministrativeRef**: for RR/RMC/RMO/RAMO chunks, reconstructs the canonical issuance
   reference from the chunk's identity blob (path + source + title) via the existing
   `inferAdministrativeRef(blob, linkedType)` function

### Layer 2: Indexed supporting authority fallback

If a target authority is listed in `ctx.issueClassification.supportingAuthorities` or
`ctx.issueClassification.targetAuthorityGroups.supportingAuthorities` (classification-backed
authority inventory) but no chunk was found even after alias expansion, a minimal source card
is created using the target string itself with the inferred authority type (RR, RMC, etc.).

This fallback is strictly gated:
- Only for authorities in the classification's `supportingAuthorities` lists
- Never for arbitrary targetAuths that are not in the supporting authority pool
- The classification's `supportingAuthorities` constitutes the "authority inventory lookup"
  backing required by PATCH-017K Rule 4

## Supporting Authority Pool Expansion

At the top of the restoration block, a `_017kSupportAuths` set is built from:
- `ctx.issueClassification.supportingAuthorities`
- `ctx.issueClassification.targetAuthorityGroups.supportingAuthorities`

This set drives both the fallback eligibility check and the diagnostics.

## Diagnostics Added

- `PATCH_017K_SUPPORTING_AUTHORITY_LOOKUP_STARTED` — when supportingAuthorities > 0
- `PATCH_017K_SUPPORTING_AUTHORITY_LOOKUP_HIT` — when a supporting authority matched via chunk
- `PATCH_017K_SUPPORTING_AUTHORITY_LOOKUP_MISS` — when a supporting authority was not found
- `PATCH_017K_INDEXED_SUPPORTING_AUTHORITY_RESTORED` — when fallback card was created
- `PATCH_017K_SUPPORTING_AUTHORITY_COMPLETION_SUMMARY` — found/missing/restored summary

## Files Changed

- `pipeline.js` — AUTHORITY_FOUND restoration block (lines ~3857–3910)

## What Was NOT Changed

| Component | Reason |
|-----------|--------|
| SAE assignment logic | RR 16-2005 availability is a source-card pool issue, not a status issue |
| Authority lock logic | Authority locking already fires before source card restoration |
| EWT pre-retrieval short-circuit | PATCH-017F — EWT does not include RR 16-2005 targets |
| PATCH-017D/E/F/G/H/I/J | Existing patches unaffected; 017J markers preserved |
| `final-answer-compliance.js` | Answer placeholder sanitation is a rendering concern, separate from card restoration |
| Answer rendering style | No answer text was changed |
| `source-visibility-engine.js` | `canonicalSourceKey` not modified; alias logic is local to the restoration block |
| `authority-utils.js` | Not touched |

## RR Alias Coverage

All of the following normalize to `rr162005` under the PATCH-017K alias path:

- `RR 16-2005`
- `RR No. 16-2005`
- `RR_16-2005`
- `RR-16-2005`
- `RR 16 2005`
- `Revenue Regulation 16-2005`
- `Revenue Regulations 16-2005`
- `Revenue Regulation No. 16-2005`
- `Revenue Regulations No. 16-2005`

## Final Verdict

**SAFE TO COMMIT**

- Only the AUTHORITY_FOUND restoration block was modified
- No SAE, authority lock, retrieval, or rendering logic changed
- 82 unit tests pass (017I: 13, 017J: 39, 017K: 30)
- Integration test required for staging: "What is VAT?" should show all 5 cards
