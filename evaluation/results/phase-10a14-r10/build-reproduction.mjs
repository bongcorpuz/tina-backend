import fs from "node:fs";
const R = "evaluation/results/phase-10a14-r9/raw/payloads/";
const trace = {};
for (const id of ["SG-C-LASTDAY", "R9-LASTDAY-REPRO", "R9-DUETODAY", "SG-C-DUETODAY"]) {
  const p = JSON.parse(fs.readFileSync(R + id + ".json", "utf8"));
  const a = String(p.answer || "");
  trace[id] = {
    trust: p.finalTrustState, sourceStatus: p.sourceStatus,
    hasSafetyNote: /Filing-deadline note:/.test(a),
    unsafeTodayPhrases: /today is the last day|due today|file today|by the end of|today is april 15|already late|submit.*today/i.test(a),
    answerHead: a.slice(0, 260).replace(/\n/g, " ")
  };
}
const out = {
  task: "PHASE-10A14-R10 P1-R9-IR-001 reproduction and defect trace",
  rootCause: {
    note_prepend_retains_unsafe: "SG-C-LASTDAY and R9-LASTDAY-REPRO: R9 prepended the safety note but retained the model answer, so the unsafe 'today is the last day / file today' text remained visible, persisted (payload.answer) and restored in history.",
    gate_ordering: "R9-DUETODAY and SG-C-DUETODAY: proposition-source-sufficiency returned BEFORE the calendar-relative gate, so the stage was not calendar-relative-deadline and no note was applied; 'due today, April 15' reached the public answer."
  },
  apiPersistenceHistory: "ask-handler payload.answer = result.answer; saveConversationTurn(answerText: payload.answer); history read-back returns the persisted content. So the unsafe answer propagated to API + persistence + history in R9.",
  remediation: {
    validator: "calendar-relative gate moved BEFORE proposition-source-sufficiency; detector broadened (due today / file today / submit by end of day / today is April 15 / directives / Taglish).",
    helper: "buildCalendarRelativeSafeAnswer(sources): deterministic safe replacement; states April 15 only when a Sec 51 deadline authority is present.",
    askHandler: "REPLACE result.answer with the safe response (was prepend+retain); rejected model output kept only in internal result.rejectedModelAnswer (non-public)."
  },
  payloadTrace: trace
};
fs.writeFileSync("evaluation/results/phase-10a14-r10/WS1_REPRODUCTION_AND_TRACE.json", JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(trace)) console.log(k, "note=" + v.hasSafetyNote, "unsafe=" + v.unsafeTodayPhrases);
