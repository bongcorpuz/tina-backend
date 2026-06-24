/**
 * PATCH-06E-008 Regression Tests
 * Source authority selector eligibility helper extraction.
 *
 * Run: node tests/patch-06e-008-source-authority-selector-eligibility-extraction.test.mjs
 */

"use strict";

import { readFileSync } from "node:fs";
import {
  CARD_ELIGIBLE_SAE_STATUSES,
  CARD_SUPPRESSED_SAE_STATUSES,
  normalizeStatus,
  normalizedEligibilityFields,
  patch021fCourtRef,
  patch021fCourtSourceType,
  resolveSaeStatus,
  validateSourceCardEligibility
} from "../services/source-authority-selector-eligibility.js";
import { selectSourceAuthorities } from "../services/source-authority-selector.js";

const SELECTOR_SRC = readFileSync(new URL("../services/source-authority-selector.js", import.meta.url), "utf8");
const ELIGIBILITY_SRC = readFileSync(
  new URL("../services/source-authority-selector-eligibility.js", import.meta.url),
  "utf8"
);

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed += 1;
  } else {
    console.error(`  FAIL  ${label}`);
    failed += 1;
    failures.push(label);
  }
}

function group(name, fn) {
  console.log(`\n-- ${name}`);
  fn();
}

const governingNirc57 = {
  id: "nirc-57",
  authorityId: "nirc-57",
  source: "01-tax-code/NIRC-1997-RA-10963.pdf",
  document_title: "NIRC-1997-RA-10963 (BIR).pdf",
  normalizedReference: "NIRC Sec. 57",
  normalized_reference: "NIRC Sec. 57",
  citation: "NIRC Sec. 57",
  displayLabel: "NIRC Sec. 57",
  authorityType: "STATUTE",
  authorityRole: "governing",
  authorityLevel: 2,
  isIndexed: "true",
  isParsed: true,
  isGoverning: true,
  limitationRequired: false,
  targetAuthorityMatch: true,
  issueMismatch: false,
  text: "SEC. 57. Withholding of Tax at Source. Withholding tax rules apply to specified income payments."
};

const relatedRr298 = {
  id: "rr-2-98",
  authorityId: "rr-2-98",
  source: "03-regulations/RR 2-1998.pdf",
  document_title: "Revenue Regulations No. 2-1998.pdf",
  normalizedReference: "RR No. 2-1998",
  citation: "RR No. 2-1998",
  displayLabel: "RR No. 2-1998",
  authorityType: "RR",
  authorityRole: "supporting",
  authorityLevel: 6,
  isIndexed: true,
  isParsed: true,
  isGoverning: false,
  limitationRequired: true,
  targetAuthorityMatch: true,
  issueMismatch: false,
  text: "Revenue Regulations No. 2-1998 provides rules on expanded withholding tax."
};

const ctaCase9369 = {
  id: "cta-9369",
  source: "06-court-cases/cta-cases-on-ewt",
  document_title: "CTA Case No. 9369.pdf",
  normalizedReference: "CTA Case No. 9369",
  normalized_reference: "CTA Case No. 9369",
  citation: "CTA Case No. 9369",
  authorityType: "CTA_DIVISION",
  authority_type: "CTA_DIVISION",
  targetAuthorityMatch: false,
  issueMismatch: true,
  text: "The Court of Tax Appeals discussed expanded withholding tax assessment issues."
};

function runSelector(chunks, options = {}) {
  return selectSourceAuthorities({
    rerankedChunks: chunks,
    issueClassification: {
      primaryIssue: "WITHHOLDING_TAX",
      subIssue: "EXPANDED_WITHHOLDING_TAX",
      targetAuthorities: ["NIRC Sec. 57", "RR 2-98"],
      controllingAuthorities: ["NIRC Sec. 57"],
      supportingAuthorities: ["RR 2-98"],
      isJurisprudenceQuery: false,
      ...options.issueClassification
    },
    query: options.query || "What does NIRC Section 57 provide?",
    answerText: "",
    mode: "STANDARD_TAX_MODE",
    maxSources: 5,
    saeStatus: options.saeStatus || "AUTHORITY_FOUND",
    sourceAvailabilityMetadata: options.sourceAvailabilityMetadata || {}
  });
}

group("Extracted helper exports preserve status and field normalization", () => {
  assert(CARD_ELIGIBLE_SAE_STATUSES.has("AUTHORITY_FOUND"), "AUTHORITY_FOUND remains card-eligible");
  assert(CARD_SUPPRESSED_SAE_STATUSES.has("SOURCE_LOOKUP_EMPTY"), "SOURCE_LOOKUP_EMPTY remains card-suppressed");
  assert(normalizeStatus(" related_authority_only ") === "RELATED_AUTHORITY_ONLY", "normalizeStatus uppercases strings");
  assert(normalizeStatus({ status: "AUTHORITY_FOUND" }) === "", "normalizeStatus preserves object guard");
  assert(resolveSaeStatus({ saeStatus: "authority_found" }) === "AUTHORITY_FOUND", "resolveSaeStatus prefers direct saeStatus");
  assert(
    resolveSaeStatus({ sourceAvailabilityMetadata: { sourceAvailability: "related_authority_only" } }) ===
      "RELATED_AUTHORITY_ONLY",
    "resolveSaeStatus keeps sourceAvailabilityMetadata fallback"
  );

  const fields = normalizedEligibilityFields(governingNirc57);
  assert(fields.authorityType === "STATUTE", "authorityType normalized");
  assert(fields.authorityRole === "GOVERNING", "authorityRole normalized");
  assert(fields.isIndexed === true && fields.isParsed === true, "boolean eligibility fields normalized");
});

group("Eligibility validation preserves keep/drop criteria", () => {
  const governing = validateSourceCardEligibility(governingNirc57, "AUTHORITY_FOUND");
  assert(governing.eligible === true, "governing AUTHORITY_FOUND card remains eligible");

  const related = validateSourceCardEligibility(relatedRr298, "RELATED_AUTHORITY_ONLY");
  assert(related.eligible === true, "related-only supporting card remains eligible");

  const supportingOnly = validateSourceCardEligibility({ ...governingNirc57, isSupportingOnly: true }, "AUTHORITY_FOUND");
  assert(supportingOnly.eligible === false, "isSupportingOnly remains prohibited");
  assert(
    supportingOnly.validationFailures.includes("isSupportingOnly_prohibited"),
    "isSupportingOnly suppression reason preserved"
  );

  const missing = validateSourceCardEligibility({ citation: "NIRC Sec. 57" }, "AUTHORITY_FOUND");
  assert(missing.eligible === false, "missing required fields remain ineligible");
  assert(missing.validationFailures.includes("missing_authorityId"), "missing field diagnostics preserved");
});

group("PATCH-021F court eligibility helpers remain pure and intact", () => {
  assert(patch021fCourtSourceType(ctaCase9369) === "CTA_DIVISION", "CTA division source type recognized");
  assert(patch021fCourtRef(ctaCase9369) === "CTA Case No. 9369", "CTA case reference preserved");
});

group("Selector integration uses extracted eligibility without source-card behavior drift", () => {
  const authorityFound = runSelector([governingNirc57]);
  const authorityLabels = authorityFound.visibleSourceCards.map((card) => card.citation || card.displayLabel || "");
  assert(authorityLabels.some((label) => label === "NIRC Sec. 57"), "AUTHORITY_FOUND NIRC Sec. 57 card remains visible");
  assert(authorityFound.diagnostics.eligibilityStatus === "ENFORCED", "AUTHORITY_FOUND eligibility gate remains enforced");

  const missingRequired = runSelector([{ ...governingNirc57, authorityId: "" }]);
  assert(missingRequired.visibleSourceCards.length === 0, "missing eligibility field still drops card");
  assert(missingRequired.diagnostics.rejectionBreakdown.eligibility === 1, "eligibility rejection counted");

  const suppressed = runSelector([governingNirc57], { saeStatus: "SOURCE_LOOKUP_EMPTY" });
  assert(suppressed.visibleSourceCards.length === 0, "suppressed SAE status returns no visible cards");
  assert(suppressed.diagnostics.eligibilityStatus === "SUPPRESSED", "suppressed SAE status remains diagnosed");

  const court = runSelector([ctaCase9369, governingNirc57], {
    issueClassification: {
      isJurisprudenceQuery: true,
      targetAuthorities: ["NIRC Sec. 57", "RR 2-98"],
      controllingAuthorities: ["NIRC Sec. 57"],
      supportingAuthorities: ["RR 2-98"]
    },
    query: "Are there jurisprudence cases on withholding tax?"
  });
  const courtLabels = court.visibleSourceCards.map((card) => card.citation || card.displayLabel || "");
  assert(courtLabels.some((label) => label === "CTA Case No. 9369"), "CTA court source card remains visible");
});

group("Extraction boundary stays narrow", () => {
  assert(
    SELECTOR_SRC.includes('from "./source-authority-selector-eligibility.js"'),
    "source-authority-selector imports extracted eligibility module"
  );
  assert(SELECTOR_SRC.includes("stripInternalCardFields"), "sanitizer wiring remains in selector");
  assert(!ELIGIBILITY_SRC.includes("sanitizePublicSelectorCard"), "eligibility module does not move sanitizer behavior");
  assert(!ELIGIBILITY_SRC.includes("selectSourceAuthorities"), "eligibility module does not move selector assembly");
  assert(!ELIGIBILITY_SRC.includes("sourceMaterialTermsMatchAuthority"), "eligibility module does not move issue relevance");
  assert(!ELIGIBILITY_SRC.includes("canonicalSourceKey"), "eligibility module does not move source-card sorting/dedupe");
  assert(!ELIGIBILITY_SRC.includes("pipeline.js"), "eligibility module does not touch pipeline wiring");
});

console.log(`\nPATCH-06E-008 eligibility extraction: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
