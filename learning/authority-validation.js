"use strict";

// Court/case authority types that can never satisfy statutory/regulatory
// requirements for WHT/EWT/CWT learning content.
const COURT_CASE_AUTHORITY_TYPES = new Set([
  "CTA", "CTA_CASE", "CTA_DIVISION", "CTA_EN_BANC",
  "COURT", "COURT_DECISION",
  "CASE", "CASE_LAW",
  "JURISPRUDENCE",
  "SUPREME_COURT", "SC_DECISION", "SC_EN_BANC", "SC_DIVISION"
]);

const COURT_CASE_TITLE_PATTERNS = [
  /\bcta\s+case\b/i,
  /\bcta\s+eb\b/i,
  /\bc\.t\.a\.\s+case\b/i,
  /\bcourt\s+of\s+tax\s+appeals\b/i,
  /\bvs?\.\s+cir\b/i,
  /\bv\s+cir\b/i,
  /\bg\.r\.\s+no\./i
];

const STATUTORY_REGULATORY_AUTHORITY_TYPES = new Set([
  "NIRC", "NIRC_SECTION", "TAX_CODE",
  "REPUBLIC_ACT", "RA",
  "REVENUE_REGULATION", "REVENUE_REGULATIONS", "RR",
  "REVENUE_MEMORANDUM_CIRCULAR", "RMC",
  "REVENUE_MEMORANDUM_ORDER", "RMO",
  "RAMO", "REVENUE_AUDIT_MEMORANDUM_ORDER",
  "BIR_RULING", "BIR_RULINGS",
  "BIR_ISSUANCE", "BIR_ISSUANCES",
  "BIR_REGULATION", "BIR_REGULATIONS",
  "STATUTE", "LAW"
]);

const WHT_DOMAINS = new Set([
  "WITHHOLDING_TAX", "WHT", "EWT", "CWT", "WITHHOLDING"
]);

function normalizeAuthorityType(value = "") {
  return String(value || "").toUpperCase().replace(/[\s\-]/g, "_");
}

function combinedTitleCitation(chunk = "") {
  return (String(chunk.title || "") + " " + String(chunk.citation || "")).toLowerCase();
}

export function isCourtOrCaseSource(chunk = {}) {
  const type = normalizeAuthorityType(chunk.authorityType || chunk.authority_type);
  if (COURT_CASE_AUTHORITY_TYPES.has(type)) return true;
  const combined = combinedTitleCitation(chunk);
  return COURT_CASE_TITLE_PATTERNS.some(p => p.test(combined));
}

export function isStatutoryOrRegulatorySource(chunk = {}) {
  // Court/case sources must never satisfy the statutory authority requirement,
  // even when their title/citation quotes a regulation like RR 2-98 or NIRC.
  if (isCourtOrCaseSource(chunk)) return false;

  const type = normalizeAuthorityType(chunk.authorityType || chunk.authority_type);
  if (STATUTORY_REGULATORY_AUTHORITY_TYPES.has(type)) return true;

  const combined = combinedTitleCitation(chunk);
  return (
    /\bnirc\b/.test(combined) ||
    /national internal revenue code/i.test(combined) ||
    /\btax code\b/i.test(combined) ||
    /\bsec(?:tion)?\.?\s*5[78]\b/.test(combined) ||
    /revenue regulations?/i.test(combined) ||
    /rev(?:enue)?\.?\s*regs?\./i.test(combined) ||
    /\brr\s*no\.?\s*\d/.test(combined) ||
    /\brr\s*\d/.test(combined) ||
    /revenue\s+memorandum\s+circular/i.test(combined) ||
    /\brmc\b/.test(combined) ||
    /revenue\s+memorandum\s+order/i.test(combined) ||
    /\brmo\b/.test(combined) ||
    /revenue\s+audit\s+memorandum/i.test(combined) ||
    /\bramo\b/.test(combined) ||
    /bir\s+ruling/i.test(combined) ||
    /bir\s+issuance/i.test(combined)
  );
}

export function validateLearningAuthorityForDomain({
  domain,
  subtopic,
  sourceChunks = [],
  mode = "learning"
} = {}) {
  const chunks = Array.isArray(sourceChunks) ? sourceChunks.filter(Boolean) : [];
  const normDomain = normalizeAuthorityType(domain);

  if (!WHT_DOMAINS.has(normDomain)) {
    return {
      ok: true,
      reason: null,
      primaryAuthority: null,
      sourceCount: chunks.length,
      validSourceCount: chunks.length
    };
  }

  const validSources = chunks.filter(isStatutoryOrRegulatorySource);
  const primaryAuthority = validSources[0] || null;

  if (!primaryAuthority) {
    const allCourt = chunks.length > 0 && chunks.every(isCourtOrCaseSource);
    const reason = allCourt
      ? "court_or_case_source_not_controlling_for_wht"
      : "insufficient_valid_authority";

    console.warn("[LEARNING_AUTHORITY_VALIDATION_REJECTED]", {
      mode,
      domain,
      subtopic,
      reason,
      sourceCount: chunks.length,
      validSourceCount: validSources.length,
      primaryAuthorityTitle: null,
      primaryAuthorityType: null
    });

    return {
      ok: false,
      reason,
      primaryAuthority: null,
      sourceCount: chunks.length,
      validSourceCount: validSources.length
    };
  }

  console.info("[LEARNING_AUTHORITY_VALIDATION_PASSED]", {
    mode,
    domain,
    subtopic,
    reason: null,
    sourceCount: chunks.length,
    validSourceCount: validSources.length,
    primaryAuthorityTitle: primaryAuthority.title || "N/A",
    primaryAuthorityType: primaryAuthority.authorityType || primaryAuthority.authority_type || "UNKNOWN"
  });

  return {
    ok: true,
    reason: null,
    primaryAuthority,
    sourceCount: chunks.length,
    validSourceCount: validSources.length
  };
}
