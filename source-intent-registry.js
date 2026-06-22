// FILE: source-intent-registry.js
// Phase 6B PATCH-034D: Pure source-intent/source-pattern detection helpers.

"use strict";

function lower(value = "") {
  return String(value || "").toLowerCase();
}

export function isExplicitSourceInventoryRequest(question = "") {
  const q = lower(question);

  return Boolean(
    /\b(?:what|which)\s+(?:are\s+)?(?:your\s+|the\s+)?sources?\b/i.test(q) ||
      /\bsources?\s+do\s+you\s+have\b/i.test(q) ||
      /\b(?:show|list|provide|give|display|cite)\b[\s\S]{0,50}\b(?:indexed\s+)?(?:sources?|source\s+cards?|citations?|authorities?)\b/i.test(q) ||
      /\b(?:sources?|citations?|authorities?)\s+for\b/i.test(q) ||
      /\b(source\s+cards?|legal basis|citation|citations|basis only|source only)\b/i.test(q)
  );
}

export function isIncomeSourceLegalTerm(question = "") {
  const q = lower(question);

  return Boolean(
    /\b(?:philippine|foreign)[-\s]+source\s+income\b/i.test(q) ||
      /\bincome\s+from\s+sources?\s+(?:within|without)(?:\s+and\s+without)?(?:\s+the\s+philippines)?\b/i.test(q) ||
      /\bsources?\s+within\s+and\s+without\s+the\s+philippines\b/i.test(q) ||
      /\bsource\s+of\s+income\b/i.test(q)
  );
}

export function detectSourcePattern(question = "", queryIntent = {}) {
  const q = lower(question);

  if (queryIntent?.requiresSourceVisibility || queryIntent?.requiresSourceInventory) return true;

  const explicitSourceInventoryRequest = isExplicitSourceInventoryRequest(q);
  const incomeSourceLegalTerm = isIncomeSourceLegalTerm(q);

  if (incomeSourceLegalTerm && !explicitSourceInventoryRequest) return false;

  return Boolean(
    explicitSourceInventoryRequest ||
      /\b(source|sources|authority|authorities)\b/i.test(q)
  );
}

export default {
  detectSourcePattern,
  isExplicitSourceInventoryRequest,
  isIncomeSourceLegalTerm
};
