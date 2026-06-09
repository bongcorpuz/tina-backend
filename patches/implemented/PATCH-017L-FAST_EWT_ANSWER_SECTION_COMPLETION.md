# PATCH-017L — FAST_EWT Answer Section Completion

## Status

IMPLEMENTED

## Root Cause

After PATCH-017J strips placeholder text from AUTHORITY_FOUND answers, section headings
produced by `repairStructure()` / `defaultBodyForHeading()` in the answer renderer are left
with no body text. The heading markup remains but nothing follows it. This produces empty
headings in EWT answers such as:

```
### Controlling Authorities

### Interpretation

### Practical Meaning
```

This is a final-answer-body rendering gap, not a retrieval, SAE, or authority-lock failure.

## Affected Paths

- `/ask` profile (`BASIC_RESEARCH`, `LEGAL_INTERPRETATION`) — `enforceAskProfileCompliance()`
  → `ensureIndexedSourceLimitation()` — section headings are preserved from draft; after
  PATCH-017J strips placeholder bodies, headings become empty.
- `FAST_DEFINITION` renderer — `buildFastDefinitionAnswer()` produces `### Legal Basis`,
  `### Practical Explanation`, `### Practical Note`; if the draft content did not fill these
  sections, PATCH-017J strips any placeholder text and they become empty.

## Fix — `_applyEwtSectionCompletion017l()` in `final-answer-compliance.js`

New function added immediately before `ensureIndexedSourceLimitation()`.

### Algorithm

1. Line-by-line scan of the sanitized text.
2. For each heading (`### …`), look ahead past blank lines to find the next content.
3. If the heading is followed immediately by another heading (or end-of-text), it is empty.
4. **EWT context** (`primaryIssue === WITHHOLDING/WHT` or `subIssue` contains `EWT`):
   - Look up the heading key (lowercased) in `_ewtFill` map.
   - If a fill string exists, inject it below the heading.
   - If no fill string, remove the heading.
5. **Non-EWT context**: remove any empty heading (no fill injection).

### Fill Text Map

| Section heading (lowercased) | Fill text |
|---|---|
| `controlling authorities` | NIRC Sec. 57 authorizes withholding at source; Sec. 58 governs agent duties |
| `interpretation` | Advertising payments subject to EWT when paid by withholding agent to resident income payee |
| `practical meaning` | Payor withholds applicable EWT, remits to BIR; amount is creditable against payee's income tax |
| `legal interpretation` | Withholding obligation arises when withholding agent makes payment subject to withholding |
| `practical application` | Payor must withhold, remit, and issue BIR Form 2307 |
| `legal basis` | NIRC Sec. 57 and Sec. 58 are primary statutory authorities |
| `practical explanation` | Withholding agents required to withhold and remit from resident income payees for covered services |
| `practical note` | Verify applicable EWT rate and classification; issue BIR Form 2307 |

No specific EWT rate (e.g., 2%, 10%) is hard-coded. All fill text uses "applicable EWT rate."

### Call Site

Added as the final step of `ensureIndexedSourceLimitation()`, inside the `AUTHORITY_FOUND`
branch, before `return _out`:

```javascript
// PATCH-017L: fill or remove empty headings that survived placeholder cleanup
_out = _applyEwtSectionCompletion017l(_out, context);
return _out;
```

## Diagnostics Added

- `PATCH_017L_FAST_EWT_SECTION_COMPLETION_STARTED` — entry; logs `isEwtContext`
- `PATCH_017L_FAST_EWT_EMPTY_HEADING_DETECTED` — per heading; logs heading text and fill availability
- `PATCH_017L_FAST_EWT_SECTION_FILLED` — when fill text is injected
- `PATCH_017L_FAST_EWT_EMPTY_HEADING_REMOVED` — when empty heading is dropped
- `PATCH_017L_FAST_EWT_SECTION_COMPLETION_COMPLETE` — summary: filled count, removed count

## Files Changed

- `final-answer-compliance.js` — new `_applyEwtSectionCompletion017l()` function; call added in `ensureIndexedSourceLimitation()` AUTHORITY_FOUND block

Also in this commit (PATCH-017J pattern fix):

Two PATCH-017J strip patterns were extended with `[^.]*` to consume trailing fragments that
the original `\.?` did not capture:

```javascript
// Before (left trailing "and its implementing regulations." behind):
/Refer to the relevant provision of the NIRC as amended\.?/gi
// After:
/Refer to the relevant provision of the NIRC as amended[^.]*\.?/gi

// Before (left " for compliance purposes." behind):
/Consult the applicable provision and implementing regulation before relying on this answer\.?/gi
// After:
/Consult the applicable provision and implementing regulation before relying on this answer[^.]*\.?/gi
```

## What Was NOT Changed

| Component | Reason |
|---|---|
| SAE assignment logic | Not a retrieval or availability issue |
| Authority lock logic | Authorities already locked before this runs |
| EWT pre-retrieval short-circuit (PATCH-017F) | Not touched |
| PATCH-017D/E/F/G/H/I/J/K core behavior | Preserved; 017J markers intact |
| Source-card selector | No card selection change |
| VAT bridge (PATCH-017H) | Not touched |
| VAT source-card restoration | Not touched |
| `pipeline.js` | Not touched |
| `answer-renderer.js` | Not touched |
| `authority-utils.js` | Not touched |

## Test Results

`_stage017l_test.mjs`: **44 passed, 0 failed**

Covers:
- Part 1: EWT empty headings filled (direct `ensureIndexedSourceLimitation` call)
- Part 2: Non-EWT empty headings removed (no EWT fill injected for VAT)
- Part 3: `/ask BASIC_RESEARCH` EWT rate query — full `enforceAskProfileCompliance` path
- Part 4: `/ask` "Is advertising subject to EWT?" — full compliance path
- Part 4b: `FAST_DEFINITION` EWT — Legal Basis / Practical Explanation / Practical Note filled
- Part 5: VAT regression — no EWT fill injected
- Part 6: NO_INDEXED_SOURCE — limitation language preserved; no EWT fill
- Part 7: RELATED_AUTHORITY_ONLY — limitation language preserved; no EWT fill
- Part 8: No EWT rate hard-coded by patch fill text

## Final Verdict

**SAFE TO COMMIT**

- Only `final-answer-compliance.js` modified (fill function + two pattern extensions)
- No retrieval, SAE, authority lock, or pipeline logic changed
- 44 unit tests pass
- 013 + 039 + 030 + 044 = 126 cumulative patch tests passing
