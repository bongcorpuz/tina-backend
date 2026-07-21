// PHASE-10A14-R19 — domain campaign runner. Pre-fix, development-oracle and unseen
// campaigns all use this same runner against the same live boundary classifier; only the
// oracle file and the runtime differ between invocations.
// Usage: node run-domain-campaign.mjs <oraclePath> <outputPath> <phaseLabel>
import fs from "node:fs";
import { execSync } from "node:child_process";
import { detectPhilippineTaxBoundary } from "../../../services/philippine-tax-domain-boundary.js";

const [oraclePath, outPath, phase] = process.argv.slice(2);
if (!oraclePath || !outPath) {
  console.error("usage: node run-domain-campaign.mjs <oraclePath> <outputPath> <phaseLabel>");
  process.exit(2);
}

const oracle = JSON.parse(fs.readFileSync(oraclePath, "utf8"));
const rows = oracle.rows || oracle.probes;

const satisfies = (expected, decision) =>
  expected === "ALLOW" ? decision === "ALLOW" : decision === "REJECT" || decision === "CLARIFY";

const results = [];
for (const p of rows) {
  const r = detectPhilippineTaxBoundary(p.text, "/ask");
  const pass = satisfies(p.expected, r.decision);
  results.push({
    id: p.id || p.probeId, coverageClass: p.coverageClass, text: p.text,
    expected: p.expected, decision: r.decision, reason: r.reason,
    detectedDomain: r.detectedDomain, confidence: r.confidence, pass,
    failureKind: pass ? null : (p.expected === "NOT_ALLOW" && r.decision === "ALLOW" ? "material_false_allow" : "material_false_refusal")
  });
}

const byClass = {};
for (const r of results) {
  const c = (byClass[r.coverageClass] ||= { total: 0, pass: 0, falseAllow: 0, falseRefusal: 0 });
  c.total++;
  if (r.pass) c.pass++;
  else if (r.failureKind === "material_false_allow") c.falseAllow++;
  else c.falseRefusal++;
}

const failing = results.filter((r) => !r.pass);
const falseAllows = failing.filter((r) => r.failureKind === "material_false_allow");
const falseRefusals = failing.filter((r) => r.failureKind === "material_false_refusal");

let metamorphicFailures = 0;
const mm = results.filter((r) => r.coverageClass === "metamorphic");
for (let i = 0; i < mm.length; i += 2) if (!mm[i]?.pass || !mm[i + 1]?.pass) metamorphicFailures++;

const out = {
  task: "PHASE-10A14-R19",
  phase,
  generatedAt: new Date().toISOString(),
  runtimeHead: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  oraclePath, oracleTotal: rows.length,
  totalProbes: results.length,
  passed: results.filter((r) => r.pass).length,
  materialFalseAllows: falseAllows.length,
  materialFalseRefusals: falseRefusals.length,
  metamorphicFailures,
  byClass,
  falseAllows, falseRefusals,
  results
};
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`[${phase}] ${out.passed}/${out.totalProbes} pass | falseAllow=${out.materialFalseAllows} falseRefusal=${out.materialFalseRefusals} mmFail=${metamorphicFailures}`);
