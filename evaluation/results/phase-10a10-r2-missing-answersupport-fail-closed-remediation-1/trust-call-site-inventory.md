# PHASE-10A10-R2 Trust Call-Site Inventory

buildResponseTrust / buildTrustContract call sites and answerSupport handling after R2:

| Call site | answerSupport supplied | Verified reachable? | Behavior when absent |
| --- | --- | --- | --- |
| ask-handler.js payload (main /ask path) | Yes -- set from evaluateAnswerSupport for verified-candidate responses (schemaValid + verifiedEligible) | Yes | Non-candidate paths never reach AUTHORITY_FOUND-verified; validator error/unavailable -> answerSupport with schemaValid/verifiedEligible false -> fail closed |
| ask-handler.js staging-fixture route | Fixture object (A/G fixtures now carry a canonical attestation) | Yes (fixtures) | n/a |
| ask-handler.js domain-boundary fallback | n/a (DOMAIN_BOUNDARY) | No | NOT_APPLICABLE (precedence) |
| services/staging-trust-fixtures.js registry | A-VERIFIED-CONTROLLING & G-GENERAL supply { schemaValid:true, verifiedEligible:true } | Yes | other fixtures are non-verified states |
| tests (10a1/10a4c/10a6/10a8/10a10) | legitimate-verified tests now supply a canonical attestation; legacy-seam tests expect safe downgrade | Yes | RELATED_AUTHORITY_ONLY |

Key rule: `deriveAuthoritySupport` AUTHORITY_FOUND branch now requires `isVerifiedAnswerSupport(result.answerSupport).eligible === true` before VERIFIED_CONTROLLING. There is no remaining production path that reaches VERIFIED_CONTROLLING without a present, valid (own boolean schemaValid===true AND verifiedEligible===true) attestation. Higher-priority states (RESTRICTED, source-failure, verified-conflict, source-only-fallback/missing-authority) are evaluated before the AUTHORITY_FOUND branch, so a missing attestation only prevents verified -- it never overrides a higher-priority safe state.
