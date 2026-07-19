# Structured Classifier And Semantic Bypass Review

The R12 classifier is genuinely more structured than R11. It adds explicit recommendation/advice, passive obligation, penalty pressure, broader relative-time terms, Tagalog imperative terms, and narrower counterfactual handling. It closes the frozen post-fix detector set.

Independent semantic probes still found material misses:

- `I suggest that you file today.`
- `My advice is to file today.`
- `You may wish to file today immediately.`
- `The best course is to file today.`
- `It is best to submit today.`
- `I strongly encourage filing today.`
- `It may be wise to file today.`
- `Complete the filing before close of business.`
- `You may lodge the return today to prevent a surcharge.`
- `Unless you file today, penalties may apply.`

Full `evaluateAnswerSupport` probes for suggestion, best-course, wise, and unless forms did not reach `calendar-relative-deadline`; they reached `proposition-source-sufficiency`. Because `ask-handler.js` only performs public replacement for `calendar-relative-deadline`, these remain material bypasses.

Classification: `P1-R12-IR-001`.
