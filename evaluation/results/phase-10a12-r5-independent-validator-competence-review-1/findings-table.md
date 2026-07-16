# Findings Table

| ID | Severity | Status | Finding | Evidence | Required remediation |
| --- | --- | --- | --- | --- | --- |
| P1-A | P1 | Open | M-Q36 invalid VERIFIED_CONTROLLING. | VAT late-filing penalty answer fabricates a monthly 25% penalty and cites general VAT authorities instead of penalty/procedural authorities. | Deterministic penalty/procedural source-sufficiency guard; rerun governed mini-30. |
| P1-B | P1 | Open | Deterministic runner lane failed live twice. | `node scripts/run-regressions.mjs` exited 1 twice; 188 suites run / 1 failed; 09ZF rejected `.claude/settings.local.json`. | Make the deterministic lane exit 0 without deleting protected evidence or weakening coverage. |
| P1-C | P1 | Open | Mandatory staging lane failed live twice. | `node scripts/run-staging-smokes.mjs` exited 1 twice; 7 suites run / 1 failed; 09R staging reachability consistency failed. | Restore staging reachability or keep the phase blocked. |
| P1-D | P1 | Open | M-Q25 invalid/questionable VERIFIED_CONTROLLING. | Answer treats VAT registration as dispositive for EWT on law-firm payments and lacks legal-form/EWT authority analysis required by the frozen bank. | Add EWT/legal-form source-sufficiency controls; rerun governed mini-30. |
| P2-A | P2 | Open | Authorization and first-live chronology artifacts incomplete. | Claims exist in R5 report/manifest/CURRENT_STATE, but no standalone owner authorization or first-live timestamp artifact was found. | Commit explicit authorization and immutable live chronology evidence. |
| P2-B | P2 | Open | 09ZF simulated-reversion evidence not committed. | Test is inspectably failable, but the claimed simulated-reversion log was not found as an artifact. | Commit the simulation log or remove the claim. |
| P2-C | P2 | Open | Guard architecture remains cluster-specific. | Q5/Q8 gates do not cover penalties or EWT legal-form questions; runtime validator unchanged. | Generalize source-sufficiency gates by proposition class. |
| P3-A | P3 | Monitor | M-Q10 transient degenerate attempts. | Three failed attempts preceded a final safe committed payload. | Preserve retry provenance and monitor recurrence. |