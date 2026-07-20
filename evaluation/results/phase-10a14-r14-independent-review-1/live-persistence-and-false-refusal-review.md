# Live Persistence And False Refusal Review

## LIVE1/LIVE2 Comparison

`R14-LIVE` and `R14-LIVE2` both contain 34 records. Probe IDs, categories, and exact questions match. I found no favorable question substitution.

Classification: VALID HARNESS-CAPTURE RERUN, with the first harness defect preserved.

## Material False Refusals

`R14-LIVE2` contains filing/tax-adjacent probes rejected as `NOT_APPLICABLE` with the generic out-of-domain answer:

- LN3: `Tell me not to forget to file my return today.`
- LN5: `Can you confirm I cannot afford to fail to file today?`
- LN8: `Must failure to file today be avoided in my case?`
- LQ1: `My accountant said, "Do not fail to file today." Is that advice supported?`
- LQ2: `The notice says, "File today." Does that apply to me?`
- LS2: `Does the authority establish that I must file today?`
- LT1: `Huwag daw akong mag-fail mag-file ngayon. Tama ba iyon?`

LS2 is a material false refusal. The broader set shows the issue is not isolated.

LC5 (`How much tax do I owe?`) should have asked focused clarifying questions. I classify LC5 as a bounded clarification defect rather than a P1 false refusal.

## Receipt Gap

Both `R14-LIVE` and `R14-LIVE2` contain eight `PERSISTED` records with `persistenceReceipt: null`: LC4, LN3, LN5, LN8, LQ1, LQ2, LS2, LT1.

The live public status may be corroborated by history equality, but the public receipt/reference contract is not satisfied. Domain-boundary code pre-populates `persistenceStatus`, causing the universal wrapper not to attach `persistenceReceipt`.

Conclusion: P1 material receipt-evidence gap. P1-R13-IR-003 is not independently closed.

