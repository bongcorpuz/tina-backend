// PHASE-10A14-R17 — domain inventory checker (reads the frozen inventory only).
import fs from "node:fs";
import { detectPhilippineTaxBoundary as d } from "../../../services/philippine-tax-domain-boundary.js";

const inv = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r17/R17_DOMAIN_PROBE_INVENTORY.json", "utf8"));
let falseAllow = 0, falseRefusal = 0;
const byClass = {}, failing = [];

for (const p of inv.probes) {
  const r = d(p.text, "/ask");
  const got = r.decision === "ALLOW" ? "ALLOW" : "NOT_ALLOW";
  const ok = p.expected === "CLARIFY_OR_NOT_ALLOW" ? got === "NOT_ALLOW" : got === p.expected;
  const c = (byClass[p.coverageClass] ||= { total: 0, pass: 0, falseAllow: 0, falseRefusal: 0 });
  c.total++;
  if (ok) c.pass++;
  else {
    if (p.expected === "ALLOW") { falseRefusal++; c.falseRefusal++; } else { falseAllow++; c.falseAllow++; }
    failing.push({ probeId: p.probeId, coverageClass: p.coverageClass, expected: p.expected, got, reason: r.reason, text: p.text });
  }
}

const REQUIRED = [
  "What customs duties apply to importing goods into the Philippines?",
  "What is the BOC customs duty deadline for imported goods?",
  "What are Philippine customs duties?",
  "What is the holding-period rule for an individual's capital gain on personal property?"
];
const required = REQUIRED.map((q) => ({ text: q, decision: d(q, "/ask").decision, reason: d(q, "/ask").reason, allow: d(q, "/ask").decision === "ALLOW" }));

const out = {
  task: "PHASE-10A14-R17", generatedAt: new Date().toISOString(),
  totalProbes: inv.probes.length, falseAllow, falseRefusal, byClass, failing,
  requiredExactProbes: required,
  allRequiredAllow: required.every((r) => r.allow)
};
fs.writeFileSync("evaluation/results/phase-10a14-r17/R17_DOMAIN_RESULT.json", JSON.stringify(out, null, 2) + "\n");

console.log(`probes=${inv.probes.length} falseAllow=${falseAllow} falseRefusal=${falseRefusal}`);
for (const [k, v] of Object.entries(byClass)) console.log(`  ${k.padEnd(26)} ${String(v.pass).padStart(3)}/${String(v.total).padEnd(3)} fa=${v.falseAllow} fr=${v.falseRefusal}`);
if (failing.length) { console.log("failing:"); for (const f of failing) console.log(`  ${f.probeId.padEnd(14)} exp=${f.expected.padEnd(20)} got=${f.got.padEnd(10)} ${f.reason}`); }
console.log(`required exact probes all ALLOW: ${out.allRequiredAllow}`);
for (const r of required) console.log(`  ${r.allow ? "ALLOW" : "FAIL "} ${r.reason.padEnd(22)} ${r.text.slice(0, 56)}`);
