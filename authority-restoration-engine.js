// FILE: authority-restoration-engine.js
// Phase 6B PATCH-034C: Pure authority restoration helper functions.

"use strict";

function safeStr(value) {
  return typeof value === "string" ? value : String(value || "");
}

export function inferRestorationAuthorityType(target = "") {
  const text = safeStr(target);
  if (/\brr\b|\brevenue regulation/i.test(text)) return "RR";
  if (/\brmc\b|\bmemorandu[mo]\s+circular/i.test(text)) return "RMC";
  if (/\brmo\b|\bmemorandu[mo]\s+order/i.test(text)) return "RMO";
  if (/\bnirc\b|\btax code\b|\bsec(?:tion)?\.?\s*\d+/i.test(text)) return "STATUTE";
  return "STATUTE";
}

export function authorityRestorationCandidateMatchesTarget(candidate = {}, targetKey = "", deps = {}) {
  const {
    canonicalSourceKey,
    inferAdministrativeRef,
    sourceCardIdentityBlob,
    inferLinkedSourceType
  } = deps || {};

  if (!candidate || !targetKey || typeof canonicalSourceKey !== "function") return false;

  const meta = candidate.metadata || {};
  const refs = [
    candidate.citation,
    candidate.normalizedReference,
    candidate.normalized_reference,
    meta.normalizedReference,
    meta.normalized_reference,
    candidate.reference
  ].filter(Boolean);

  for (const ref of refs) {
    if (canonicalSourceKey(ref) === targetKey) return true;
    const rrNorm = safeStr(ref)
      .replace(/\brevenue regulation[s]?\b/gi, "rr")
      .replace(/\bno\.?\s*/gi, "");
    if (canonicalSourceKey(rrNorm) === targetKey) return true;
  }

  if (
    typeof inferLinkedSourceType === "function" &&
    typeof inferAdministrativeRef === "function" &&
    typeof sourceCardIdentityBlob === "function"
  ) {
    const linkedType = inferLinkedSourceType(candidate);
    if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
      const inferred = inferAdministrativeRef(sourceCardIdentityBlob(candidate), linkedType);
      if (inferred && canonicalSourceKey(inferred) === targetKey) return true;
    }
  }

  return false;
}

export function findAuthorityRestorationCandidate(rerankedChunks = [], targetKey = "", deps = {}) {
  if (!Array.isArray(rerankedChunks) || !targetKey) return null;
  return rerankedChunks.find((candidate) =>
    authorityRestorationCandidateMatchesTarget(candidate, targetKey, deps)
  ) || null;
}

export default {
  authorityRestorationCandidateMatchesTarget,
  findAuthorityRestorationCandidate,
  inferRestorationAuthorityType
};
