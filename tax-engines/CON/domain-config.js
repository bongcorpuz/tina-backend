// FILE: tax-engines/CON/domain-config.js
"use strict";

/**
 * TINA CON Domain Config — Constitutional Tax Issues
 * Version: 1.0.0
 *
 * Covers: tax exemption grants, uniformity, due process in assessment,
 * equal protection, non-impairment, double taxation, and other
 * constitutional limitations on the power to tax.
 */

export const CON_DOMAIN_CONFIG_VERSION = "1.0.0";

export const CON_AUTHORITY_HIERARCHY = Object.freeze([
  "CONSTITUTION",
  "STATUTE",
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "CTA_DIVISION",
  "RR",
  "RMC",
  "BIR_RULING",
  "SECONDARY"
]);

export const CON_SUB_ISSUES = Object.freeze([
  "TAX_EXEMPTION_GRANT",
  "STRICT_INTERPRETATION_EXEMPTION",
  "UNIFORMITY_AND_EQUITY",
  "DUE_PROCESS_ASSESSMENT",
  "EQUAL_PROTECTION",
  "DOUBLE_TAXATION",
  "NON_IMPAIRMENT_CLAUSE",
  "POWER_TO_TAX_GENERAL"
]);

export const CON_CONTROLLING_AUTHORITIES = Object.freeze([
  "1987 Philippine Constitution Art. VI Sec. 28",
  "1987 Philippine Constitution Art. VI Sec. 29",
  "Supreme Court constitutional tax jurisprudence",
  "NIRC applicable exemption provisions"
]);

export const CON_RETRIEVAL_STRATEGY = "ISSUE_JURISPRUDENCE_FIRST";

export const CON_RESPONSE_STRUCTURE = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

export default {
  CON_DOMAIN_CONFIG_VERSION,
  CON_AUTHORITY_HIERARCHY,
  CON_SUB_ISSUES,
  CON_CONTROLLING_AUTHORITIES,
  CON_RETRIEVAL_STRATEGY,
  CON_RESPONSE_STRUCTURE
};
