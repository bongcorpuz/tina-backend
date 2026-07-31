# C35 proposition-to-passage root cause

Live evidence proves a generalized runtime defect, not a VAT wording preference.

The pipeline retains passage-bearing retrieved chunks, while the public response correctly receives sanitized source cards. The defect occurs because `ask-handler.js` sends those sanitized cards—not the private retrieved passages—to `evaluateAnswerSupport`. The validator then gives its controlled reviewer only citation labels and the final answer. A schema-valid “all safe” verdict can therefore produce `VERIFIED_CONTROLLING` without any exact passage being reviewed.

The frozen pre-fix matrix reproduces this twice:

- a label-only NIRC source receives `verifiedEligible=true`; and
- the exact live VAT answer reaches the reviewer while none of its retrieved passages do.

This is independent of Candidate 1. Candidate 1 decides whether two authority records actually conflict. Candidate 2 decides whether the final answer’s material propositions are supported by the displayed authorities’ exact passages. A response may correctly have no authority conflict while still lacking sufficient proposition support.

The bounded repair is generalized: build a private displayed-authority-to-retrieved-passage packet, fail closed for missing passages, include the exact final-answer and passage digests in controlled review, and host-validate returned proposition bindings. Public source cards and conflict computation remain unchanged.
