// PHASE-10A14-R14 — deterministic campaign runner.
//
// Usage: node evaluation/results/phase-10a14-r14/run-campaign.mjs <phase> <runtimeCommit>
//   phase: PREFIX | POSTFIX1 | POSTFIX2 | ... | FINAL
//
// Executes the frozen campaign (explicit probes + generated negation matrix +
// metamorphic invariants + persistence simulations) against the CURRENT working-tree
// runtime, under append-only attempt-journal protection.
//
// Expectations come from the frozen JSON artifacts, never recomputed from the runtime.

import fs from "node:fs";
import { AttemptJournal } from "./journal.mjs";
import { evaluateCalendarRelativeDeadline } from "../../../services/answer-support-validator.js";
import { derivePersistenceReceipt } from "../../../services/persistence-receipt.js";

const D = "evaluation/results/phase-10a14-r14/";
const TASK = "PHASE-10A14-R14-NEGATED-NONPERFORMANCE-DIRECTIVE-COVERAGE-UNIVERSAL-PERSISTENCE-STATUS-AND-IMMUTABLE-ATTEMPT-JOURNAL-REMEDIATION-1";

const phase = process.argv[2];
const runtimeCommit = process.argv[3];
if (!phase || !runtimeCommit) {
  console.error("usage: run-campaign.mjs <phase> <runtimeCommit>");
  process.exit(2);
}

const load = (f) => JSON.parse(fs.readFileSync(D + f, "utf8"));
const explicitPlan = load("R14_EXPLICIT_PROBE_PLAN.json");
const matrix = load("R14_NEGATED_NONPERFORMANCE_MATRIX.json");
const metamorphic = load("R14_METAMORPHIC_INVARIANTS.json");
const persistence = load("R14_PERSISTENCE_STATUS_MATRIX.json");

const campaignId = `R14-${phase}-${runtimeCommit.slice(0, 12)}`;
const journal = new AttemptJournal({
  task: TASK, campaignId, runtimeCommit, executionMode: "DETERMINISTIC",
});

/** Run the calendar-relative detector and normalize to UNSAFE/SAFE. */
function classify(question, answer) {
  const r = evaluateCalendarRelativeDeadline({ question, answer });
  const unsafe = Boolean(r.applicable && !r.sufficient);
  return {
    actualClassification: unsafe ? "UNSAFE" : "SAFE",
    validatorStage: unsafe ? "calendar-relative-deadline" : null,
    detector: { applicable: Boolean(r.applicable), sufficient: Boolean(r.sufficient), reason: r.reason ?? null },
  };
}

// ── 1. Explicit probes ──────────────────────────────────────────────────────
for (const p of explicitPlan.probes) {
  journal.run(p.probeId, {
    exactQuestion: p.question,
    answerFixtureOrRawAnswer: p.answer,
    expectedClassification: p.kind === "unsafe" ? "UNSAFE" : "SAFE",
    extra: { suite: "explicit", group: p.group },
  }, () => classify(p.question, p.answer));
}

// ── 2. Generated negation matrix ────────────────────────────────────────────
for (const c of matrix.cases) {
  journal.run(c.caseId, {
    exactQuestion: matrix.question || explicitPlan.question,
    answerFixtureOrRawAnswer: c.text,
    expectedClassification: c.expectedUnsafe ? "UNSAFE" : "SAFE",
    extra: { suite: "matrix", params: c.params, frame: c.frame },
  }, () => classify(explicitPlan.question, c.text));
}

// ── 3. Metamorphic invariants (one attempt per variant) ─────────────────────
for (const inv of metamorphic.invariants) {
  inv.variants.forEach((v, idx) => {
    const [text, expectedUnsafe] = Array.isArray(v) ? v : [v, inv.expectedUnsafe];
    journal.run(`${inv.id}-v${idx}`, {
      exactQuestion: explicitPlan.question,
      answerFixtureOrRawAnswer: text,
      expectedClassification: expectedUnsafe ? "UNSAFE" : "SAFE",
      extra: { suite: "metamorphic", invariantId: inv.id, rule: inv.rule },
    }, () => classify(explicitPlan.question, text));
  });
}

// ── 4. Persistence simulations ──────────────────────────────────────────────
for (const sim of persistence.simulations) {
  journal.run(sim.simId, {
    exactQuestion: null,
    answerFixtureOrRawAnswer: null,
    expectedClassification: sim.expectedStatus,
    extra: { suite: "persistence", simulation: sim.input, note: sim.note ?? null },
  }, () => {
    const receipt = derivePersistenceReceipt(sim.input);
    return {
      actualClassification: receipt.status,
      persistenceStatus: receipt.status,
      persistenceReceipt: receipt,
    };
  });
}

// ── Derived summary ─────────────────────────────────────────────────────────
const summary = journal.summarize();
const bySuite = {};
for (const line of fs.readFileSync(journal.file, "utf8").split("\n").filter(Boolean)) {
  const r = JSON.parse(line);
  const s = (bySuite[r.suite] ||= { total: 0, mismatches: 0, unsafeMisses: 0, safeOverfires: 0, ids: [] });
  s.total++;
  if (!r.technicalFailure && r.expectedClassification !== r.actualClassification) {
    s.mismatches++;
    if (r.expectedClassification === "UNSAFE") s.unsafeMisses++;
    else if (r.expectedClassification === "SAFE") s.safeOverfires++;
    s.ids.push(r.probeId);
  }
}
summary.bySuite = bySuite;
fs.writeFileSync(`${journal.dir}/SUMMARY.json`, JSON.stringify(summary, null, 2) + "\n");

console.log(`campaign ${campaignId}`);
console.log(`  attempts=${summary.totalAttempts} technicalFailures=${summary.technicalFailures}`);
console.log(`  mismatches=${summary.mismatches} (unsafeMisses=${summary.unsafeMisses} safeOverfires=${summary.safeOverfires})`);
for (const [k, v] of Object.entries(bySuite)) {
  console.log(`  ${k.padEnd(12)} total=${String(v.total).padStart(3)} mismatches=${String(v.mismatches).padStart(3)} (miss=${v.unsafeMisses} overfire=${v.safeOverfires})`);
}
