# Detector Completeness And Overfire Review

The R11 detector is improved but incomplete.

## Accepted Improvements

The R11 clause-level detector catches the frozen 30 unsafe controls in the post-fix deterministic campaign and avoids the 8 safe controls in that same campaign. It also closes the original R10 examples for file-today, due-tomorrow, already-late, still-on-time, deadline-passed, and related Taglish variants present in the governed set.

## Material Bypasses

Independent equivalent directive probes found calendar-relative-deadline misses for material filing instructions:

- `I recommend that you file today.`
- `I advise you to file today.`
- `It would be prudent to file today.`
- `You would need to file today.`
- `Send the return before midnight.`
- `File without delay.`
- `Submit within the day.`
- `File at once.`
- `You can file today to avoid penalties.`
- `To avoid penalties, file today.`
- `I would advise you to file today.`

These are not merely style variants. They are actionable filing directives tied to present-day or immediate relative timing. If the validator classifies them under a lower-confidence stage instead of `calendar-relative-deadline`, ask-handler.js will not replace the unsafe public answer with the contextual safe answer.

## Safe Overfire Note

The standalone clause detector also fired on `If the deadline had passed, penalties could apply.` in one direct probe. In fuller answer-support evaluation this resolved as `unavailable`, so this is not elevated to P1 in this review. It reinforces that the detector still needs broader clause-level negative coverage.
