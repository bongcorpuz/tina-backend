# PATCH-017J — Authority-Found Answer Body and Source Card Completion

## Status

IMPLEMENTED

## Summary

Fix two downstream rendering defects found in staging after PATCH-017I:

1. **Defect 1 — Answer body placeholder leakage**: When `AUTHORITY_FOUND`, placeholder
   strings injected by `answer-renderer.js` (`defaultBodyForHeading()` / `repairStructure()`)
   and PATCH-017I neutral replacements were passing through `ensureIndexedSourceLimitation()`
   uncleaned and appearing in the final rendered answer.

2. **Defect 2 — Incomplete VAT source-card restoration**: The AUTHORITY_FOUND restoration
   block in `pipeline.js` had a hard cap of `restored.length >= 2`, preventing restoration
   of more than 2 missing target authorities. For VAT queries with 5 target authorities
   (NIRC Sec. 105, 106, 107, 108, RR 16-2005), only the first 2 missing ones were restored.

## Files Changed

- `final-answer-compliance.js` — `ensureIndexedSourceLimitation()` AUTHORITY_FOUND path
- `pipeline.js` — AUTHORITY_FOUND restoration block

## Changes

### final-answer-compliance.js

Replaced PATCH-017I neutral replacement logic with a comprehensive placeholder strip list.
When `saeStatus === "AUTHORITY_FOUND"`, the following strings are now stripped to empty string:

- `Refer to the retrieved indexed authority.` (PATCH-017I neutral replacement — now itself a placeholder)
- `See the retrieved indexed authority.` (PATCH-017I neutral replacement)
- `Refer to applicable implementing regulations.` (PATCH-017I neutral replacement)
- `Indexed source not found.`
- `No legal basis was rendered.`
- `No supporting rules were rendered.`
- `No legal basis exists.`
- `No supporting rules exist.`
- `Consult the applicable provision and implementing regulation before relying on this answer.`
- `Refer to the relevant provision of the NIRC as amended.`
- `The implementing regulation applies. Refer to the relevant Revenue Regulation for operational details.`
- `Please refer to the applicable NIRC provision for the statutory definition.`
- `Verify the latest indexed authority before relying on the answer.`
- `Verify the latest indexed authority, controlling doctrine, and supporting documents before relying on the position.`
- `Implementing regulations applicable to this provision are pending index verification.`

Substantive legal/tax answer text (NIRC provisions, holdings, rates, etc.) is NOT touched.

### pipeline.js

Removed `if (restored.length >= 2) break;` from the AUTHORITY_FOUND restoration loop.
The loop now iterates all `targetAuths` and restores all available matching cards up to the
5-card total limit enforced by `.slice(0, 5)` in the merge step.

## Diagnostics Added

- `PATCH_017J_AUTHORITY_FOUND_PLACEHOLDER_BLOCKED` — when ≥1 placeholder pattern is stripped
- `PATCH_017J_AUTHORITY_FOUND_BODY_SANITIZED` — when blank-line normalization fires
- `PATCH_017J_SOURCE_CARD_TARGET_COMPLETION_CHECK` — logged before restoration attempt
- `PATCH_017J_VAT_SOURCE_CARD_RESTORATION_COMPLETED` — logged after cards are restored

## Preservation Guarantees

- PATCH-017D, 017E, 017F, 017G, 017H, 017I core logic: unchanged
- EWT fast path: unchanged
- VAT bridge eligibility logic: unchanged
- Retrieval engine: unchanged
- SAE assignment logic: unchanged
- Authority lock logic: unchanged
- NON-AUTHORITY_FOUND states (RELATED_AUTHORITY_ONLY, NO_INDEXED_SOURCE, etc.): still inject Framework knowledge labels as before
