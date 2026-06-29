/**
 * PATCH-06E-009 - Ask-Handler Public Source Sanitizer Extraction
 *
 * Run: node tests/patch-06e-009-ask-handler-public-source-sanitizer-extraction.test.mjs
 *
 * Verifies the extracted route-level public source/card sanitizer preserves
 * ask-handler field shape, defaults, URL filtering, and internal field stripping.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  publicSourceCardText,
  publicSourceCardUrl,
  sanitizePublicSourceCard,
  sanitizePublicSourceCards
} from "../services/ask-handler-public-source-sanitizer.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASK_SRC = readFileSync(join(ROOT, "ask-handler.js"), "utf8");
const SANITIZER_SRC = readFileSync(
  join(ROOT, "services", "ask-handler-public-source-sanitizer.js"),
  "utf8"
);

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

function deepEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function group(name, fn) {
  console.log(`\n-- ${name}`);
  fn();
}

group("Extraction wiring", () => {
  assert(
    ASK_SRC.includes('from "./services/ask-handler-public-source-sanitizer.js"'),
    "ask-handler imports the extracted sanitizer module"
  );
  assert(
    !/function\s+publicSourceCardText\s*\(/.test(ASK_SRC) &&
      !/function\s+publicSourceCardUrl\s*\(/.test(ASK_SRC) &&
      !/function\s+sanitizePublicSourceCard\s*\(/.test(ASK_SRC) &&
      !/function\s+sanitizePublicSourceCards\s*\(/.test(ASK_SRC),
    "ask-handler no longer contains local public source sanitizer helper bodies"
  );
  assert(
    SANITIZER_SRC.includes("export function sanitizePublicSourceCards"),
    "new sanitizer module exports sanitizePublicSourceCards"
  );
});

group("Text and URL sanitization", () => {
  assert(publicSourceCardText("  NIRC   Sec. 57  ") === "NIRC Sec. 57", "text collapses whitespace");
  assert(publicSourceCardText("C:\\internal\\nirc.pdf") === "", "text strips Windows paths");
  assert(publicSourceCardText("/tmp/nirc.pdf") === "", "text strips slash paths");
  assert(publicSourceCardText("nirc-section-57.pdf") === "", "text strips file-looking labels");
  assert(
    publicSourceCardText("123e4567-e89b-12d3-426614174000") === "",
    "text strips UUID-like internal identifiers matched by the baseline rule"
  );
  assert(publicSourceCardUrl("https://example.test/source") === "https://example.test/source", "https URL survives");
  assert(publicSourceCardUrl("http://example.test/source") === "http://example.test/source", "http URL survives");
  assert(publicSourceCardUrl("file:///tmp/source.pdf") === "", "non-http URL is stripped");
});

group("Public card shape", () => {
  const sanitized = sanitizePublicSourceCard({
    citation: " RR   No. 2-98 ",
    label: "Revenue Regulations No. 2-98",
    title: "Expanded Withholding Tax",
    authority_type: " RR ",
    limitationRequired: true,
    public_url: "https://example.test/rr-2-98",
    id: "internal-id",
    source: "C:\\internal\\rr-2-98.pdf",
    metadata: { private: true },
    text: "internal chunk"
  });

  assert(
    deepEqual(Object.keys(sanitized), [
      "label",
      "title",
      "citation",
      "authorityType",
      "displayLabel",
      "limitationRequired",
      "publicUrl"
    ]),
    "sanitized card exposes the expected public keys in order"
  );
  assert(sanitized.label === "Revenue Regulations No. 2-98", "label uses display label fallback order");
  assert(sanitized.title === "Expanded Withholding Tax", "title is preserved");
  assert(sanitized.citation === "RR No. 2-98", "citation is normalized");
  assert(sanitized.authorityType === "RR", "authority_type maps to authorityType");
  assert(sanitized.displayLabel === sanitized.label, "displayLabel mirrors label");
  assert(sanitized.limitationRequired === true, "limitationRequired preserves true only");
  assert(sanitized.publicUrl === "https://example.test/rr-2-98", "public_url maps to publicUrl");
  assert(!("source" in sanitized) && !("metadata" in sanitized) && !("text" in sanitized), "internal fields are stripped");
});

group("Defaults and arrays", () => {
  assert(
    deepEqual(sanitizePublicSourceCard({}), {
      label: "Source",
      title: "Source",
      citation: "",
      authorityType: "",
      displayLabel: "Source",
      limitationRequired: false
    }),
    "empty card preserves default public shape"
  );
  assert(
    deepEqual(sanitizePublicSourceCards(null), []),
    "null card list sanitizes to an empty array"
  );
  assert(
    sanitizePublicSourceCards([{ title: "NIRC Sec. 23" }, null, { title: "RR 2-98" }]).length === 2,
    "card arrays filter falsey entries before sanitizing"
  );
});

console.log(`\n${"-".repeat(56)}`);
console.log(`PATCH-06E-009: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  - ${f}`);
}
process.exit(failed > 0 ? 1 : 0);
