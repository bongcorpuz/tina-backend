# Findings And Severity Register

## P0

None.

## P1

P1-RETRIEVAL-51-51A: Section 51/51-A individual filing and substituted-filing authority is not surfaced live.

Evidence: POS-01-indfile, POS-03-inddl, POSX-indfile-1, POSX-indfile-2, POSX-inddl-1, POSX-inddl-2, POS-02-subst, POSX-subst-1. Common and explicit Section 51/51(C)/51-A prompts surfaced only Sec 23/24/27 or no displayed source. The validator correctly failed closed or was not invoked after fallback. This blocks PASS.

## P2

P2-IMPERATIVE-FILING: bare imperative "file the annual income tax return" without an obligation modal is not classified as filing_obligation. Modal forms are covered. This is coverage debt, not a former-P1 survivor.

P2-STAGE-LOCALIZATION: committed artifacts localize the live blocker to retrieval/source surfacing before displayed source-card compatibility, but do not expose enough internal stage evidence to choose one root cause among corpus absence, aliasing, vector recall, reranker exclusion, or finalization.

## P3

None from this review.
