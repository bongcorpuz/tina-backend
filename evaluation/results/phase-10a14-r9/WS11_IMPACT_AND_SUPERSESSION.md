# PHASE-10A14-R9 — WS11 Differential Impact & Supersession Map

R9 runtime change is confined to two deterministic gates in `services/answer-support-validator.js`
(`evaluateCalendarRelativeDeadline`, `evaluateFilingRationaleAlignment`, wired into
`evaluateAnswerSupport` before the LLM stage) plus a narrow `ask-handler.js` WS4 safety note that
only activates on the `calendar-relative-deadline` stage. Both gates key on ANSWER text patterns:
(a) affirmed calendar-relative deadline conclusions; (b) filing conclusions whose decisive rationale
is a rate/threshold rule without a filing rule.

## Classification of the 115 E1 probes
- **AFFECTED — MUST RERUN (94):** every probe whose answer can contain a filing conclusion or a
  calendar-relative deadline assertion — all 26 `ALL26-*` slots; `SG-C-*` (deadline); `SG-A-Q*`,
  `SG-B-*` (filing obligation); `SG-D-OBLIG*`/`SG-D-RETPLUSDOC` (mixed-object filing);
  `POS-INDFILE/INDDEAD/SUBST/HIST` (filing positives); `SG-E-*`/`POS-ESTATE` (computation clauses that
  can carry "required to file" language); `POS-MCIT/DONOR/VATEXC/VATORD/REG/PROC` (rerun to bound
  impact confidently).
- **UNAFFECTED — CARRIED FORWARD (21):** VAT-specific safeguards without filing/deadline conclusions
  (`SG-I-Q5/Q8/Q46`, `SG-F-VATBYCORP/DONORBYVAT`, `SG-F-*` cross-tax, `SG-D-RETPLUSPAY/REFUNDPLUSRET/
  INVOICEPLUSRET`), outcome-prediction/accessor/model-override
  (`SG-I-OUTCOME/ACCESSOR/CONSTRUCTOR/MODELOVERRIDE`), penalty/EWT (`SG-I-Q25/Q36`). (The Section
  51(C)(2) `POS-51C2-*`/`SG-G-*`/`SG-H-*` probes were moved to AFFECTED — see Correction below.)
  Impact analysis: these answers contain neither a filing-conclusion
  clause nor a calendar-relative assertion, so neither new gate can fire; their proposition class,
  authority-compatibility, temporal path, final trust path and persistence representation are
  unchanged. Verified by re-running the two new gate functions against each carried-forward E1
  payload → `applicable=false` for both gates (no state change).
- **SUPERSEDED (5):** the E1 verifieds that R9 closes — `ALL26-Q12-r1/r2/r3`, `SG-A-Q12REV` (now fail
  `filing-rationale-alignment`), `SG-C-LASTDAY` (now fails `calendar-relative-deadline`). Only the
  final R9 evidence controls these classes.

## New executions (WS7 fact-complete + calendar controls) — 9
`R9-INCOMPLETE250K`, `R9-MULTIEMP`, `R9-MIXED`, `R9-NOTAXDUE-NOFILE`, `R9-SUBST-COMPLETE`,
`R9-INDFILE-51`, `R9-LASTDAY-REPRO`, `R9-DUETODAY`, `R9-ALREADYLATE`.

Only final R9 runtime evidence may control the affected proposition classes (calendar-relative
deadline; filing-conclusion rationale). Carried-forward E1 evidence remains valid for the 21
unaffected probes.

## Correction (rigor)
`POS-51C2-*`, `SG-G-*`, `SG-H-*` were moved from carried-forward to **AFFECTED/rerun** because 4
Section 51(C)(2) probes (`POS-51C2-JUN20/POST1/POST2/PRE2`) trip the filing-rationale gate on their
answer text (they returned NO_VERIFIED in E1, so the final outcome is unchanged, but rigor requires a
rerun rather than an assumption). Final counts: **94 affected/rerun · 21 carried-forward · 9 new**.
The 21 carried-forward were re-verified: **both new gates return `applicable=false` (0 fire)**, so their
outcome cannot change.
