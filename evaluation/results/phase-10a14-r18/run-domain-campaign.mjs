// PHASE-10A14-R18 — domain campaign runner (pre-fix and final use the same runner
// and the same frozen oracle; only the runtime differs).
// Usage: node run-domain-campaign.mjs <outputPath> <phaseLabel>
import fs from "node:fs";
import { execSync } from "node:child_process";
import { detectPhilippineTaxBoundary } from "../../../services/philippine-tax-domain-boundary.js";

const outPath = process.argv[2];
const phase = process.argv[3] || "unspecified";
if (!outPath) {
  console.error("output path is required — there is deliberately no default destination");
  process.exit(2);
}

const oracle = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r18/DOMAIN_ORACLE.json", "utf8"));

const satisfies = (expected, decision) =>
  expected === "ALLOW" ? decision === "ALLOW" : decision === "REJECT" || decision === "CLARIFY";

const results = [];
for (const p of oracle.probes) {
  const r = detectPhilippineTaxBoundary(p.text, "/ask");
  const pass = satisfies(p.expected, r.decision);
  results.push({
    probeId: p.probeId, coverageClass: p.coverageClass, text: p.text,
    expected: p.expected, decision: r.decision, reason: r.reason,
    detectedDomain: r.detectedDomain, confidence: r.confidence, pass
  });
}

const byClass = {};
for (const r of results) {
  const c = (byClass[r.coverageClass] ||= { total: 0, pass: 0, falseAllow: 0, falseRefusal: 0 });
  c.total++;
  if (r.pass) c.pass++;
  else if (r.expected === "NOT_ALLOW" && r.decision === "ALLOW") c.falseAllow++;
  else c.falseRefusal++;
}

const failing = results.filter((r) => !r.pass);
const falseAllows = failing.filter((r) => r.expected === "NOT_ALLOW" && r.decision === "ALLOW");
const falseRefusals = failing.filter((r) => r.expected === "ALLOW" && r.decision !== "ALLOW");

// Metamorphic pair integrity: both sides of every pair must satisfy the oracle.
const mm = results.filter((r) => r.coverageClass === "metamorphic");
let metamorphicFailures = 0;
for (let i = 0; i < mm.length; i += 2) if (!mm[i].pass || !mm[i + 1].pass) metamorphicFailures++;

// The three exact independent-review false allows.
const EXACT = [
  "What is the taxable font in a CSS file?",
  "Is the BOC a band of chords?",
  "How do I close a VAT color palette?"
];
const exactProbes = EXACT.map((t) => {
  const r = detectPhilippineTaxBoundary(t, "/ask");
  return { text: t, decision: r.decision, reason: r.reason, closed: r.decision !== "ALLOW" };
});

// Accepted R15-R17 closures that must remain ALLOW (regression gates).
const PRESERVED = [
  "What customs duties apply to importing goods into the Philippines?",
  "What is the BOC customs duty deadline for imported goods?",
  "What are Philippine customs duties?",
  "What is the holding-period rule for an individual's capital gain on personal property?",
  "What is Oplan Kandado and when can it be applied?",
  "Is the gain taxable?"
];
const preserved = PRESERVED.map((t) => {
  const r = detectPhilippineTaxBoundary(t, "/ask");
  return { text: t, decision: r.decision, reason: r.reason, allow: r.decision === "ALLOW" };
});

const out = {
  task: "PHASE-10A14-R18",
  phase,
  generatedAt: new Date().toISOString(),
  runtimeHead: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  oracleTotal: oracle.total,
  totalProbes: results.length,
  passed: results.filter((r) => r.pass).length,
  materialFalseAllows: falseAllows.length,
  materialFalseRefusals: falseRefusals.length,
  metamorphicFailures,
  byClass,
  exactIndependentReviewProbes: exactProbes,
  allThreeExactClosed: exactProbes.every((p) => p.closed),
  preservedClosures: preserved,
  allPreservedAllow: preserved.every((p) => p.allow),
  falseAllows,
  falseRefusals,
  results
};
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`[${phase}] ${out.passed}/${out.totalProbes} pass | falseAllow=${out.materialFalseAllows} falseRefusal=${out.materialFalseRefusals} mmFail=${metamorphicFailures}`);
console.log(`[${phase}] exact three closed=${out.allThreeExactClosed} | preserved closures allow=${out.allPreservedAllow}`);
