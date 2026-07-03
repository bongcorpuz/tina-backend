// PATCH-08G scaffold: contract-only source-authority separation policy.
// No retrieval, source-card, sourceAvailability, OpenAI, or pipeline imports.

const decision = (allowed, code, reason, extra = {}) => Object.freeze({ allowed, code, reason, ...extra });

export function validateMemoryAuthoritySeparation(candidateOrContext = {}) {
  if (candidateOrContext.mutateSAE || candidateOrContext.mutateSourceAvailability) {
    return decision(false, "MEMORY_CANNOT_MUTATE_SAE_OR_SOURCE_AVAILABILITY", "Memory cannot mutate SAE/sourceAvailability states.");
  }
  if (candidateOrContext.mutateRetrieval) {
    return decision(false, "MEMORY_CANNOT_MUTATE_RETRIEVAL", "Memory cannot mutate retrieval.");
  }
  if (candidateOrContext.mutateSourceCards) {
    return decision(false, "MEMORY_CANNOT_MUTATE_SOURCE_CARDS", "Memory cannot create or modify source cards.");
  }
  if (candidateOrContext.createCitation || candidateOrContext.citationAuthority === true) {
    return decision(false, "MEMORY_CANNOT_CREATE_CITATIONS", "Memory cannot create citations.");
  }
  if (candidateOrContext.claimsLegalCurrentness || candidateOrContext.sourceCurrentnessStatus) {
    return decision(false, "MEMORY_CANNOT_CLAIM_LEGAL_CURRENTNESS", "Memory cannot claim legal currentness.");
  }
  if (candidateOrContext.claimsCaseStatus || candidateOrContext.caseStatus) {
    return decision(false, "MEMORY_CANNOT_CLAIM_CASE_STATUS", "Memory cannot claim case status.");
  }
  if (candidateOrContext.bypassPhase10Deferral) {
    return decision(false, "MEMORY_CANNOT_BYPASS_PHASE10_DEFERRAL", "Memory cannot bypass Phase 10 deferral.");
  }
  if (candidateOrContext.authorityUseProhibited === false || candidateOrContext.legalConclusionProhibited === false) {
    return decision(false, "MEMORY_CONTEXT_NOT_AUTHORITY", "Memory is context, never authority.");
  }
  return decision(true, "AUTHORITY_SEPARATION_VALID", "Memory authority-separation contract is satisfied.");
}

export function assertMemoryDoesNotMutateAuthorityState(candidateOrContext = {}) {
  return validateMemoryAuthoritySeparation(candidateOrContext);
}

export function buildNonAuthorityMemoryContext(memoryItems = []) {
  return memoryItems.map((item) => Object.freeze({
    memoryId: item.memoryId ?? item.memory_id ?? null,
    phrasing: `user/matter context indicates: ${item.contentSummary ?? item.summary ?? ""}`,
    authorityUseProhibited: true,
    legalConclusionProhibited: true,
    sourceCardMutationAllowed: false,
    retrievalMutationAllowed: false,
    citationAuthorityAllowed: false
  }));
}

export function explainAuthoritySeparationDecision(authorityDecision) {
  return `${authorityDecision.code}: ${authorityDecision.reason}`;
}
