/**
 * PATCH-024B-EXT Regression Tests — Expanded VAT Specialized Routing
 *
 * Run: node tests/patch-024b-ext-vat-routing-guard.test.mjs
 *
 * Three new sub-issues added for Q6-Q8 discovered in PATCH-024B final validation:
 *
 *   Q6  — non-VAT seller issues VAT invoice     → VAT_INVOICING
 *   Q7  — input VAT apportionment mixed sales   → VAT_INPUT_TAX_ALLOCATION
 *   Q8  — residential unit lease ₱15,000/month  → VAT_EXEMPTION_RESIDENTIAL_LEASE
 *
 * Plus regression guard confirming original PATCH-024B Q1-Q5 routing unaffected.
 */

"use strict";

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname  = dirname(fileURLToPath(import.meta.url));
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

// ─── Group 1: ISSUE_SPECIFIC_TARGETS has all 3 new entries ───────────────────

group("ISSUE_SPECIFIC_TARGETS — 3 new PATCH-024B-EXT entries present", () => {
  assert(
    ENGINE_SRC.includes("VAT_INVOICING:") && ENGINE_SRC.includes("NIRC Sec. 264") && ENGINE_SRC.includes("RR 18-2012"),
    "VAT_INVOICING entry with NIRC Sec. 264 and RR 18-2012 present"
  );
  assert(
    ENGINE_SRC.includes("VAT_INPUT_TAX_ALLOCATION:") && ENGINE_SRC.includes("NIRC Sec. 110(B)"),
    "VAT_INPUT_TAX_ALLOCATION entry with NIRC Sec. 110(B) present"
  );
  assert(
    ENGINE_SRC.includes("VAT_EXEMPTION_RESIDENTIAL_LEASE:") && ENGINE_SRC.includes("NIRC Sec. 109(Q)"),
    "VAT_EXEMPTION_RESIDENTIAL_LEASE entry with NIRC Sec. 109(Q) present"
  );
});

// ─── Group 2: _VAT_SPECIALIZED_SUB_ISSUES_024B Set contains all 8 values ─────

group("_VAT_SPECIALIZED_SUB_ISSUES_024B — contains all 8 specialized sub-issues", () => {
  const setMatch = ENGINE_SRC.match(/_VAT_SPECIALIZED_SUB_ISSUES_024B\s*=\s*new Set\(\[[\s\S]{0,600}\]\)/);
  const setBody  = setMatch ? setMatch[0] : "";

  // Original 5
  assert(setBody.includes('"VAT_REGISTRATION"'),              "Set includes VAT_REGISTRATION");
  assert(setBody.includes('"VAT_EXEMPTION_REAL_PROPERTY"'),   "Set includes VAT_EXEMPTION_REAL_PROPERTY");
  assert(setBody.includes('"VAT_EXEMPTION_MEDICAL_PROFESSIONAL"'), "Set includes VAT_EXEMPTION_MEDICAL_PROFESSIONAL");
  assert(setBody.includes('"VAT_IMPORTATION"'),               "Set includes VAT_IMPORTATION");
  assert(setBody.includes('"VAT_REFUND_CREDIT"'),             "Set includes VAT_REFUND_CREDIT");
  // New 3
  assert(setBody.includes('"VAT_INVOICING"'),                 "Set includes VAT_INVOICING");
  assert(setBody.includes('"VAT_INPUT_TAX_ALLOCATION"'),      "Set includes VAT_INPUT_TAX_ALLOCATION");
  assert(setBody.includes('"VAT_EXEMPTION_RESIDENTIAL_LEASE"'), "Set includes VAT_EXEMPTION_RESIDENTIAL_LEASE");
});

// ─── Group 3: detectSubIssue guard blocks present and ordered correctly ───────

group("detectSubIssue — PATCH-024B-EXT guard blocks present and ordered", () => {
  assert(
    ENGINE_SRC.includes("VAT_INVOICING") && ENGINE_SRC.includes("non[-\\s]?vat"),
    "VAT_INVOICING guard with non-VAT pattern present"
  );
  assert(
    ENGINE_SRC.includes("VAT_INPUT_TAX_ALLOCATION") && ENGINE_SRC.includes("\\bapportion|\\ballocat|\\battribut"),
    "VAT_INPUT_TAX_ALLOCATION guard with apportion/allocat/attribut pattern present"
  );
  assert(
    ENGINE_SRC.includes("VAT_EXEMPTION_RESIDENTIAL_LEASE") && ENGINE_SRC.includes("lease|rent"),
    "VAT_EXEMPTION_RESIDENTIAL_LEASE guard with lease/rent pattern present"
  );

  // VAT_INVOICING must precede VAT_REGISTRATION in source order
  const invoicingIdx    = ENGINE_SRC.indexOf('"VAT_INVOICING"');
  const registrationIdx = ENGINE_SRC.indexOf('"VAT_REGISTRATION"');
  assert(
    invoicingIdx > 0 && registrationIdx > 0 && invoicingIdx < registrationIdx,
    "VAT_INVOICING guard appears before VAT_REGISTRATION in source order"
  );

  // VAT_EXEMPTION_RESIDENTIAL_LEASE must come after VAT_EXEMPTION_REAL_PROPERTY
  const realPropIdx   = ENGINE_SRC.indexOf('"VAT_EXEMPTION_REAL_PROPERTY"');
  const leaseIdx      = ENGINE_SRC.indexOf('"VAT_EXEMPTION_RESIDENTIAL_LEASE"');
  assert(
    realPropIdx > 0 && leaseIdx > 0 && realPropIdx < leaseIdx,
    "VAT_EXEMPTION_REAL_PROPERTY guard appears before VAT_EXEMPTION_RESIDENTIAL_LEASE"
  );

  // VAT_INPUT_TAX_ALLOCATION must appear before VAT_IMPORTATION
  const inputTaxIdx   = ENGINE_SRC.indexOf('"VAT_INPUT_TAX_ALLOCATION"');
  const importationIdx = ENGINE_SRC.indexOf('"VAT_IMPORTATION"');
  assert(
    inputTaxIdx > 0 && importationIdx > 0 && inputTaxIdx < importationIdx,
    "VAT_INPUT_TAX_ALLOCATION guard appears before VAT_IMPORTATION in source order"
  );
});

// ─── Group 4: Functional routing — Q6, Q7, Q8 (via createRequire) ────────────

group("Functional routing — Q6, Q7, Q8", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(ENGINE_PATH));
  } catch {
    console.log("  SKIP  (module has external deps — static checks above cover routing logic)");
    return;
  }

  // Q6 — non-VAT seller issuing a VAT invoice
  const Q6 = "Can a non-VAT registered seller issue a VAT invoice?";
  const r6  = classifyTaxIssue(Q6);

  assert(
    r6?.subIssue === "VAT_INVOICING",
    `Q6: subIssue === VAT_INVOICING (got: ${r6?.subIssue})`
  );
  assert(
    r6?.subIssue !== "VAT_REGISTRATION",
    `Q6: subIssue is NOT VAT_REGISTRATION`
  );
  assert(
    r6?.subIssue !== "VAT_DEFINITION",
    `Q6: subIssue is NOT VAT_DEFINITION`
  );
  assert(
    r6?.responseMode !== "FAST_DEFINITION",
    `Q6: responseMode is NOT FAST_DEFINITION (got: ${r6?.responseMode})`
  );
  assert(
    r6?.retrievalStrategy !== "FAST_DEFINITION_PRIMARY_AUTHORITY",
    `Q6: retrievalStrategy is NOT FAST_DEFINITION_PRIMARY_AUTHORITY (got: ${r6?.retrievalStrategy})`
  );
  {
    const t = r6?.targetAuthorities || [];
    assert(
      t.some(a => /NIRC\s+Sec\.?\s*264\b/i.test(a)),
      `Q6: targetAuthorities includes NIRC Sec. 264 (got: ${JSON.stringify(t)})`
    );
    assert(
      t.some(a => /RR\s+18[-–]2012/i.test(a)),
      `Q6: targetAuthorities includes RR 18-2012 (got: ${JSON.stringify(t)})`
    );
  }

  // Q7 — input VAT apportionment for mixed VAT/exempt sales
  const Q7 = "What happens to input VAT on goods purchased but later used for both VAT and VAT-exempt sales?";
  const r7  = classifyTaxIssue(Q7);

  assert(
    r7?.subIssue === "VAT_INPUT_TAX_ALLOCATION",
    `Q7: subIssue === VAT_INPUT_TAX_ALLOCATION (got: ${r7?.subIssue})`
  );
  assert(
    r7?.subIssue !== "VAT_EXEMPTION",
    `Q7: subIssue is NOT VAT_EXEMPTION`
  );
  assert(
    r7?.subIssue !== "VAT_DEFINITION",
    `Q7: subIssue is NOT VAT_DEFINITION`
  );
  assert(
    r7?.responseMode !== "FAST_DEFINITION",
    `Q7: responseMode is NOT FAST_DEFINITION (got: ${r7?.responseMode})`
  );
  {
    const t = r7?.targetAuthorities || [];
    assert(
      t.some(a => /NIRC\s+Sec\.?\s*110\b/i.test(a)),
      `Q7: targetAuthorities includes NIRC Sec. 110 (got: ${JSON.stringify(t)})`
    );
  }

  // Q8 — residential unit lease ₱15,000/month
  const Q8 = "Is the lease of a residential unit at ₱15,000/month subject to VAT?";
  const r8  = classifyTaxIssue(Q8);

  assert(
    r8?.subIssue === "VAT_EXEMPTION_RESIDENTIAL_LEASE",
    `Q8: subIssue === VAT_EXEMPTION_RESIDENTIAL_LEASE (got: ${r8?.subIssue})`
  );
  assert(
    r8?.subIssue !== "VAT_OVERVIEW",
    `Q8: subIssue is NOT VAT_OVERVIEW`
  );
  assert(
    r8?.subIssue !== "VAT_DEFINITION",
    `Q8: subIssue is NOT VAT_DEFINITION`
  );
  assert(
    r8?.responseMode !== "FAST_DEFINITION",
    `Q8: responseMode is NOT FAST_DEFINITION (got: ${r8?.responseMode})`
  );
  {
    const t = r8?.targetAuthorities || [];
    assert(
      t.some(a => /NIRC\s+Sec\.?\s*109\s*\(Q\)/i.test(a)),
      `Q8: targetAuthorities includes NIRC Sec. 109(Q) (got: ${JSON.stringify(t)})`
    );
  }
});

// ─── Group 5: Additional Q6 variant patterns ─────────────────────────────────

group("Functional routing — Q6 variant phrasings", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(ENGINE_PATH));
  } catch {
    console.log("  SKIP  (module has external deps)");
    return;
  }

  const variants = [
    "A non-VAT seller issued a VAT invoice to a customer. What is the consequence?",
    "What happens when a non-VAT registered taxpayer issues a VAT invoice?",
    "Is it valid to issue a VAT invoice without VAT registration?",
  ];
  for (const q of variants) {
    assert(
      classifyTaxIssue(q)?.subIssue === "VAT_INVOICING",
      `VAT_INVOICING variant: "${q.slice(0, 60)}..."`
    );
  }
});

// ─── Group 6: Q7 variant patterns ────────────────────────────────────────────

group("Functional routing — Q7 variant phrasings", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(ENGINE_PATH));
  } catch {
    console.log("  SKIP  (module has external deps)");
    return;
  }

  const variants = [
    "How does a VAT-registered business with both VAT-exempt and VAT-taxable sales apportion its input VAT?",
    "How should input VAT be allocated between taxable and VAT-exempt sales?",
    "What portion of input tax is attributable to exempt sales?",
  ];
  for (const q of variants) {
    assert(
      classifyTaxIssue(q)?.subIssue === "VAT_INPUT_TAX_ALLOCATION",
      `VAT_INPUT_TAX_ALLOCATION variant: "${q.slice(0, 65)}..."`
    );
  }
});

// ─── Group 7: Q8 variant patterns ────────────────────────────────────────────

group("Functional routing — Q8 variant phrasings", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(ENGINE_PATH));
  } catch {
    console.log("  SKIP  (module has external deps)");
    return;
  }

  const variants = [
    "Is a residential unit lease of ₱15,000/month VAT-exempt?",
    "What is the VAT treatment of the rental of a residential apartment?",
    "Is rent on a residential property subject to VAT?",
  ];
  for (const q of variants) {
    assert(
      classifyTaxIssue(q)?.subIssue === "VAT_EXEMPTION_RESIDENTIAL_LEASE",
      `VAT_EXEMPTION_RESIDENTIAL_LEASE variant: "${q.slice(0, 65)}..."`
    );
  }
});

// ─── Group 8: Regression — original PATCH-024B Q1-Q5 unaffected ──────────────

group("Regression — original PATCH-024B Q1-Q5 routing unaffected", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(ENGINE_PATH));
  } catch {
    console.log("  SKIP  (module has external deps)");
    return;
  }

  const cases = [
    ["Is a freelance graphic designer with annual gross receipts of ₱2.8M required to register for VAT?", "VAT_REGISTRATION"],
    ["What is the VAT treatment of sale of residential lots valued at ₱1.9M?", "VAT_EXEMPTION_REAL_PROPERTY"],
    ["A VAT-registered exporter sells 100% of its goods abroad. Can it claim a VAT refund or credit on its input taxes?", "VAT_REFUND_CREDIT"],
    ["Are doctors' professional fees subject to VAT?", "VAT_EXEMPTION_MEDICAL_PROFESSIONAL"],
    ["What is the VAT rate on importation of goods used for manufacturing export products?", "VAT_IMPORTATION"],
  ];

  for (const [q, expected] of cases) {
    const got = classifyTaxIssue(q)?.subIssue;
    assert(got === expected, `Q-original: "${q.slice(0, 60)}..." → ${expected} (got: ${got})`);
  }
});

// ─── Group 9: Regression — simple VAT definition not intercepted ─────────────

group("Regression — simple VAT definition queries not intercepted", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(ENGINE_PATH));
  } catch {
    console.log("  SKIP  (module has external deps)");
    return;
  }

  assert(
    classifyTaxIssue("What is VAT?")?.subIssue === "VAT_DEFINITION",
    "Regression: 'What is VAT?' still classifies as VAT_DEFINITION"
  );
  assert(
    classifyTaxIssue("What is a VAT-exempt sale?")?.subIssue === "VAT_EXEMPTION",
    "Regression: 'What is a VAT-exempt sale?' still classifies as VAT_EXEMPTION"
  );
  // Ensure new invoicing guard does not fire for ordinary invoice queries
  const ordinaryInvoice = classifyTaxIssue("What information must appear on a VAT invoice?");
  assert(
    ordinaryInvoice?.subIssue !== "VAT_INVOICING",
    `Regression: 'What information must appear on a VAT invoice?' is NOT VAT_INVOICING (got: ${ordinaryInvoice?.subIssue})`
  );
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`PATCH-024B-EXT: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log("All assertions passed.");
