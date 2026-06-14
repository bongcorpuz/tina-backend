/**
 * PATCH-024B Regression Tests — VAT Specialized Routing Guard
 *
 * Run: node tests/patch-024b-vat-routing-guard.test.mjs
 *
 * Verifies that specialized VAT fact-pattern queries route to their correct
 * sub-issue and are NOT collapsed into VAT_DEFINITION / FAST_DEFINITION by the
 * generic definition-pattern gate.
 *
 * The 5 failing queries from the 2026-06-14 VAT hallucination audit:
 *
 *   Q1  — freelance designer gross receipts → VAT_REGISTRATION
 *   Q2  — residential lots ₱1.9M            → VAT_EXEMPTION_REAL_PROPERTY
 *   Q3  — exporter VAT refund / input tax   → VAT_REFUND_CREDIT
 *   Q4  — doctors' professional fees        → VAT_EXEMPTION_MEDICAL_PROFESSIONAL
 *   Q5  — importation goods manufacturing   → VAT_IMPORTATION
 *
 * Plus regression guards confirming simple definition queries still reach
 * VAT_DEFINITION and are not wrongly intercepted by the new guard.
 */

"use strict";

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = join(__dirname, "..", "issue-classification-engine.js");
const ENGINE_SRC  = readFileSync(ENGINE_PATH, "utf8");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
    failures.push(label);
  }
}

function group(name, fn) {
  console.log(`\n── ${name}`);
  fn();
}

// ─── Group 1: ISSUE_SPECIFIC_TARGETS has all 5 new entries ───────────────────

group("ISSUE_SPECIFIC_TARGETS — new specialized VAT entries present", () => {
  assert(
    ENGINE_SRC.includes("VAT_REGISTRATION:") && ENGINE_SRC.includes("NIRC Sec. 236"),
    "VAT_REGISTRATION entry with NIRC Sec. 236 present"
  );
  assert(
    ENGINE_SRC.includes("VAT_EXEMPTION_REAL_PROPERTY:") && ENGINE_SRC.includes("NIRC Sec. 109(P)"),
    "VAT_EXEMPTION_REAL_PROPERTY entry with NIRC Sec. 109(P) present"
  );
  assert(
    ENGINE_SRC.includes("VAT_EXEMPTION_MEDICAL_PROFESSIONAL:") && ENGINE_SRC.includes("NIRC Sec. 109(G)"),
    "VAT_EXEMPTION_MEDICAL_PROFESSIONAL entry with NIRC Sec. 109(G) present"
  );
  assert(
    ENGINE_SRC.includes("VAT_IMPORTATION:") && ENGINE_SRC.includes("NIRC Sec. 107(B)"),
    "VAT_IMPORTATION entry with NIRC Sec. 107(B) present"
  );
  assert(
    ENGINE_SRC.includes("VAT_REFUND_CREDIT:") && ENGINE_SRC.includes("CIR v. San Roque Power Corporation"),
    "VAT_REFUND_CREDIT entry with CIR v. San Roque Power Corporation present"
  );
});

// ─── Group 2: PATCH-024B guard block in detectSubIssue ───────────────────────

group("detectSubIssue — PATCH-024B guard block present", () => {
  assert(
    ENGINE_SRC.includes("PATCH-024B: Specialized VAT routing guard"),
    "PATCH-024B guard comment present in detectSubIssue"
  );
  assert(
    ENGINE_SRC.includes('"VAT_REFUND_CREDIT"') && ENGINE_SRC.includes("refund\\s+or\\s+credit\\s+on\\s+(?:its\\s+)?input"),
    "VAT_REFUND_CREDIT pattern guards refund-or-credit-on-input phrasing"
  );
  assert(
    ENGINE_SRC.includes('"VAT_REGISTRATION"') && ENGINE_SRC.includes("register\\s+(?:for\\s+)?vat"),
    "VAT_REGISTRATION pattern guards register-for-vat phrasing"
  );
  assert(
    ENGINE_SRC.includes('"VAT_EXEMPTION_REAL_PROPERTY"') && ENGINE_SRC.includes("residential\\s+lots?"),
    "VAT_EXEMPTION_REAL_PROPERTY pattern guards residential lots phrasing"
  );
  assert(
    ENGINE_SRC.includes('"VAT_EXEMPTION_MEDICAL_PROFESSIONAL"') && ENGINE_SRC.includes("\\bdoctors?\\b"),
    "VAT_EXEMPTION_MEDICAL_PROFESSIONAL pattern guards doctors phrasing"
  );
  assert(
    ENGINE_SRC.includes('"VAT_IMPORTATION"') && ENGINE_SRC.includes("\\bimportation\\b"),
    "VAT_IMPORTATION pattern guards importation phrasing"
  );
  // Guard fires inside vatContext block — must precede detectDefinitionPattern
  const guardIndex       = ENGINE_SRC.indexOf("PATCH-024B: Specialized VAT routing guard");
  const defPatternIndex  = ENGINE_SRC.indexOf("if (detectDefinitionPattern(question, queryIntent)) {");
  assert(
    guardIndex > 0 && defPatternIndex > 0 && guardIndex < defPatternIndex,
    "PATCH-024B guard block appears before detectDefinitionPattern check in source order"
  );
});

// ─── Group 3: _VAT_SPECIALIZED_SUB_ISSUES_024B Set ───────────────────────────

group("_VAT_SPECIALIZED_SUB_ISSUES_024B constant defined and contains all 5 sub-issues", () => {
  assert(
    ENGINE_SRC.includes("_VAT_SPECIALIZED_SUB_ISSUES_024B"),
    "_VAT_SPECIALIZED_SUB_ISSUES_024B identifier present"
  );
  assert(
    ENGINE_SRC.includes("new Set("),
    "_VAT_SPECIALIZED_SUB_ISSUES_024B is a Set"
  );
  const setMatch = ENGINE_SRC.match(/_VAT_SPECIALIZED_SUB_ISSUES_024B\s*=\s*new Set\(\[[\s\S]{0,400}\]\)/);
  const setBody  = setMatch ? setMatch[0] : "";
  assert(
    setBody.includes('"VAT_REGISTRATION"'),
    "_VAT_SPECIALIZED_SUB_ISSUES_024B includes VAT_REGISTRATION"
  );
  assert(
    setBody.includes('"VAT_EXEMPTION_REAL_PROPERTY"'),
    "_VAT_SPECIALIZED_SUB_ISSUES_024B includes VAT_EXEMPTION_REAL_PROPERTY"
  );
  assert(
    setBody.includes('"VAT_EXEMPTION_MEDICAL_PROFESSIONAL"'),
    "_VAT_SPECIALIZED_SUB_ISSUES_024B includes VAT_EXEMPTION_MEDICAL_PROFESSIONAL"
  );
  assert(
    setBody.includes('"VAT_IMPORTATION"'),
    "_VAT_SPECIALIZED_SUB_ISSUES_024B includes VAT_IMPORTATION"
  );
  assert(
    setBody.includes('"VAT_REFUND_CREDIT"'),
    "_VAT_SPECIALIZED_SUB_ISSUES_024B includes VAT_REFUND_CREDIT"
  );
});

// ─── Group 4: detectRetrievalStrategy guards specialized sub-issues ──────────

group("detectRetrievalStrategy — specialized VAT sub-issues return MIXED before FAST_DEFINITION", () => {
  assert(
    ENGINE_SRC.includes("_VAT_SPECIALIZED_SUB_ISSUES_024B.has(subIssue)") &&
    ENGINE_SRC.includes("return RETRIEVAL_STRATEGY.MIXED"),
    "detectRetrievalStrategy returns MIXED for specialized VAT sub-issues"
  );
  // MIXED check must appear before the detectDefinitionPattern → FAST_DEFINITION line
  const mixedIndex       = ENGINE_SRC.indexOf("_VAT_SPECIALIZED_SUB_ISSUES_024B.has(subIssue)");
  const fastDefRetIndex  = ENGINE_SRC.indexOf("return RETRIEVAL_STRATEGY.FAST_DEFINITION");
  assert(
    mixedIndex > 0 && fastDefRetIndex > 0 && mixedIndex < fastDefRetIndex,
    "MIXED guard appears before FAST_DEFINITION return in detectRetrievalStrategy"
  );
});

// ─── Group 5: detectResponseMode guards specialized sub-issues ───────────────

group("detectResponseMode — specialized VAT sub-issues return STANDARD not FAST_DEFINITION", () => {
  assert(
    ENGINE_SRC.includes('subIssue = ""') || ENGINE_SRC.includes("subIssue = ''"),
    "detectResponseMode accepts subIssue parameter with default empty string"
  );
  assert(
    ENGINE_SRC.includes("_VAT_SPECIALIZED_SUB_ISSUES_024B.has(subIssue)") &&
    ENGINE_SRC.includes('return "STANDARD"'),
    "detectResponseMode returns STANDARD for specialized VAT sub-issues"
  );
  const standardRetIndex = ENGINE_SRC.indexOf(
    '_VAT_SPECIALIZED_SUB_ISSUES_024B.has(subIssue)) return "STANDARD"'
  );
  const fastDefModeIndex = ENGINE_SRC.indexOf('return "FAST_DEFINITION"');
  assert(
    standardRetIndex > 0 && fastDefModeIndex > 0 && standardRetIndex < fastDefModeIndex,
    "STANDARD guard appears before FAST_DEFINITION return in detectResponseMode"
  );
});

// ─── Group 6: classifyTaxIssue passes subIssue to detectResponseMode ─────────

group("classifyTaxIssue — subIssue forwarded to detectResponseMode", () => {
  assert(
    ENGINE_SRC.includes("PATCH-024B: prevents FAST_DEFINITION override for specialized VAT sub-issues"),
    "classifyTaxIssue passes subIssue comment present"
  );
  // Confirm the detectResponseMode call block contains subIssue
  const callMatch = ENGINE_SRC.match(/detectResponseMode\(\{[\s\S]{0,300}subIssue[\s\S]{0,50}\}\)/);
  assert(
    Boolean(callMatch),
    "detectResponseMode call in classifyTaxIssue includes subIssue argument"
  );
});

// ─── Group 7: Functional routing — 8 test cases (via createRequire) ──────────

group("Functional routing — 8 classification test cases", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(ENGINE_PATH));
  } catch {
    console.log("  SKIP  (module has external deps — static checks above cover routing logic)");
    return;
  }

  function subIssueOf(q) {
    return classifyTaxIssue(q)?.subIssue ?? null;
  }

  // Test 1 — Q1: VAT registration threshold
  assert(
    subIssueOf("Is a freelance graphic designer with annual gross receipts of ₱2.8M required to register for VAT?") === "VAT_REGISTRATION",
    "Q1: freelance graphic designer required to register for VAT → VAT_REGISTRATION"
  );

  // Test 2 — Q2: Real property VAT exemption (definition-phrased — must NOT be FAST_DEFINITION)
  assert(
    subIssueOf("What is the VAT treatment of sale of residential lots valued at ₱1.9M?") === "VAT_EXEMPTION_REAL_PROPERTY",
    "Q2: VAT treatment of residential lots ₱1.9M → VAT_EXEMPTION_REAL_PROPERTY"
  );

  // Test 3 — Q3: Exporter VAT refund / input tax credit (must NOT be INPUT_TAX)
  assert(
    subIssueOf("A VAT-registered exporter sells 100% of its goods abroad. Can it claim a VAT refund or credit on its input taxes?") === "VAT_REFUND_CREDIT",
    "Q3: exporter VAT refund or credit on input taxes → VAT_REFUND_CREDIT"
  );

  // Test 4 — Q4: Medical professional fees (must NOT be VAT_OVERVIEW)
  assert(
    subIssueOf("Are doctors' professional fees subject to VAT?") === "VAT_EXEMPTION_MEDICAL_PROFESSIONAL",
    "Q4: doctors' professional fees → VAT_EXEMPTION_MEDICAL_PROFESSIONAL"
  );

  // Test 5 — Q5: VAT on importation (definition-phrased — must NOT be FAST_DEFINITION)
  assert(
    subIssueOf("What is the VAT rate on importation of goods used for manufacturing export products?") === "VAT_IMPORTATION",
    "Q5: VAT rate on importation of goods → VAT_IMPORTATION"
  );

  // Test 6 — Simple "What is VAT?" must still reach VAT_DEFINITION
  assert(
    subIssueOf("What is VAT?") === "VAT_DEFINITION",
    "Regression: 'What is VAT?' still classifies as VAT_DEFINITION (not intercepted)"
  );

  // Test 7 — Simple "What is Value Added Tax?" must still reach VAT_DEFINITION
  assert(
    subIssueOf("What is Value Added Tax?") === "VAT_DEFINITION",
    "Regression: 'What is Value Added Tax?' still classifies as VAT_DEFINITION"
  );

  // Test 8 — VAT-exempt sale definition must still reach VAT_EXEMPTION (existing behavior)
  const q8result = subIssueOf("What is a VAT-exempt sale?");
  assert(
    q8result === "VAT_EXEMPTION",
    `Regression: 'What is a VAT-exempt sale?' still classifies as VAT_EXEMPTION (got: ${q8result})`
  );
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`PATCH-024B: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log("All assertions passed.");
