// PHASE-10A14-R15 — deterministic campaign runner (semantic + routing + persistence).
//
// Usage: node evaluation/results/phase-10a14-r15/run-deterministic-campaign.mjs <PHASE> <runtimeCommit>
//
// Executes the frozen inventories against the CURRENT working-tree runtime under the
// crash-visible journal. Expectations are read from the frozen JSON and are never
// recomputed from the runtime.

import fs from "node:fs";
import { AttemptJournal, reviewCampaign } from "./journal.mjs";
import { evaluateCalendarRelativeDeadline } from "../../../services/answer-support-validator.js";
import { detectPhilippineTaxBoundary } from "../../../services/philippine-tax-domain-boundary.js";
import { derivePersistenceReceipt } from "../../../services/persistence-receipt.js";

const D = "evaluation/results/phase-10a14-r15/";
const TASK = "PHASE-10A14-R15";
const phase = process.argv[2];
const runtimeCommit = process.argv[3];
if (!phase || !runtimeCommit) { console.error("usage: run-deterministic-campaign.mjs <PHASE> <runtimeCommit>"); process.exit(2); }

const load = (f) => JSON.parse(fs.readFileSync(D + f, "utf8"));
const semantic = load("R15_SEMANTIC_PROBE_INVENTORY.json");
const routing = load("R15_ROUTING_PROBE_INVENTORY.json");
const persistence = load("R15_PERSISTENCE_PROBE_INVENTORY.json");

const campaignId = `R15-${phase}-${runtimeCommit.slice(0, 12)}`;
const journal = new AttemptJournal({ task: TASK, campaignId, runtimeCommit, executionMode: "DETERMINISTIC" });

const classify = (question, answer) => {
  const r = evaluateCalendarRelativeDeadline({ question, answer });
  const unsafe = Boolean(r.applicable && !r.sufficient);
  return { unsafe, actualClassification: unsafe ? "UNSAFE" : "SAFE", diagnostics: r.diagnostics ?? null };
};

const stats = {
  semantic: { independent: t(), manual: t(), generated: t(), metamorphic: t() },
  routing: { falseRefusals: t(), adjacentPositives: t(), negativeControls: t() },
  persistence: { sims: t() }
};
function t() { return { total: 0, pass: 0, unsafeMisses: 0, safeOverfires: 0, failIds: [] }; }
function score(bucket, id, expectedUnsafe, gotUnsafe) {
  bucket.total++;
  if (expectedUnsafe === gotUnsafe) { bucket.pass++; return true; }
  if (expectedUnsafe) bucket.unsafeMisses++; else bucket.safeOverfires++;
  bucket.failIds.push(id);
  return false;
}

// ── Semantic: independent / manual / generated ──────────────────────────────
for (const [key, list] of [["independent", semantic.independent], ["manual", semantic.manual], ["generated", semantic.generated]]) {
  for (const p of list) {
    await journal.run(p.probeId, {
      exactQuestion: p.question || semantic.independent[0].question,
      answerFixtureOrRawAnswer: p.text,
      expectedClassification: p.expectedUnsafe ? "UNSAFE" : "SAFE",
      extra: { suite: `semantic-${key}`, coverageClass: p.coverageClass ?? null, params: p.params ?? null }
    }, async () => {
      const c = classify(p.question || "When must I file?", p.text);
      score(stats.semantic[key], p.probeId, p.expectedUnsafe, c.unsafe);
      return { actualClassification: c.actualClassification, validatorStage: c.unsafe ? "calendar-relative-deadline" : null };
    });
  }
}

// ── Semantic: metamorphic variants ──────────────────────────────────────────
for (const inv of semantic.metamorphic) {
  inv.variants.forEach(async () => {});
  for (let i = 0; i < inv.variants.length; i++) {
    const [text, expectedUnsafe] = inv.variants[i];
    await journal.run(`${inv.id}-v${i}`, {
      exactQuestion: "When must I file?", answerFixtureOrRawAnswer: text,
      expectedClassification: expectedUnsafe ? "UNSAFE" : "SAFE",
      extra: { suite: "semantic-metamorphic", invariantId: inv.id, rule: inv.rule }
    }, async () => {
      const c = classify("When must I file?", text);
      score(stats.semantic.metamorphic, `${inv.id}-v${i}`, expectedUnsafe, c.unsafe);
      return { actualClassification: c.actualClassification };
    });
  }
}

// ── Routing ─────────────────────────────────────────────────────────────────
const routeGroups = [
  ["falseRefusals", routing.falseRefusals], ["adjacentPositives", routing.adjacentPositives],
  ["negativeControls", routing.negativeControls]
];
for (const [key, list] of routeGroups) {
  for (const p of list) {
    await journal.run(p.probeId, {
      exactQuestion: p.text, expectedClassification: p.expectedBoundaryDecision,
      extra: { suite: `routing-${key}` }
    }, async () => {
      const r = detectPhilippineTaxBoundary(p.text, "/ask");
      const allowed = r.decision === "ALLOW";
      const expectAllow = p.expectedBoundaryDecision === "ALLOW";
      const b = stats.routing[key];
      b.total++;
      if (allowed === expectAllow) b.pass++; else { b.failIds.push(p.probeId); if (expectAllow) b.unsafeMisses++; else b.safeOverfires++; }
      return {
        actualClassification: allowed ? "ALLOW" : "NOT_ALLOW",
        boundaryDecision: r.decision, detectedDomain: r.detectedDomain, boundaryReason: r.reason
      };
    });
  }
}
// LC5 boundary baseline (its defect is downstream, recorded for completeness)
await journal.run("LC5-boundary", {
  exactQuestion: routing.clarification.text, expectedClassification: "ALLOW",
  extra: { suite: "routing-clarification", note: routing.clarification.currentDefect }
}, async () => {
  const r = detectPhilippineTaxBoundary(routing.clarification.text, "/ask");
  return { actualClassification: r.decision === "ALLOW" ? "ALLOW" : "NOT_ALLOW", boundaryDecision: r.decision, detectedDomain: r.detectedDomain };
});

// ── Persistence receipt simulations ─────────────────────────────────────────
for (const s of persistence.receiptSims) {
  await journal.run(s.simId, {
    expectedClassification: s.expectedStatus,
    extra: { suite: "persistence-sims", simulation: s.input, note: s.note ?? null }
  }, async () => {
    const r = derivePersistenceReceipt(s.input);
    const b = stats.persistence.sims;
    b.total++;
    if (r.status === s.expectedStatus) b.pass++; else b.failIds.push(s.simId);
    return { actualClassification: r.status, persistenceStatus: r.status, persistenceReceipt: r };
  });
}

// ── Emit ────────────────────────────────────────────────────────────────────
const review = reviewCampaign(journal.dir);
const summary = { campaignId, runtimeCommit, phase, stats, review: { ...review, attempts: undefined } };
fs.writeFileSync(`${journal.dir}/SUMMARY.json`, JSON.stringify(summary, null, 2) + "\n");

const line = (n, b) => `  ${n.padEnd(22)} ${String(b.pass).padStart(4)}/${String(b.total).padEnd(5)} miss=${b.unsafeMisses} overfire=${b.safeOverfires}`;
console.log(`campaign ${campaignId}`);
console.log(`  attempts allocated=${review.allocated} completed=${review.completed} incomplete=${review.incompleteOrCrashed} malformed=${review.malformed} technicalFailures=${review.technicalFailures}`);
for (const k of Object.keys(stats.semantic)) console.log(line(`semantic-${k}`, stats.semantic[k]));
for (const k of Object.keys(stats.routing)) console.log(line(`routing-${k}`, stats.routing[k]));
console.log(line("persistence-sims", stats.persistence.sims));
const totalFail = Object.values(stats.semantic).concat(Object.values(stats.routing), Object.values(stats.persistence)).reduce((n, b) => n + (b.total - b.pass), 0);
console.log(`  TOTAL FAILURES: ${totalFail}`);
