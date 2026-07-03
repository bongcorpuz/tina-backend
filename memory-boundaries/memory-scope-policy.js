// PATCH-08G scaffold: contract-only memory scope policy.
// Pure structured decisions only; no runtime reads/writes or service integration.

const decision = (allowed, code, reason, extra = {}) => Object.freeze({ allowed, code, reason, ...extra });

function valueCount(values) {
  return values.filter((value) => value !== undefined && value !== null && value !== "").length;
}

export function validatePrimaryScopeContract(candidate = {}) {
  const typeCount = valueCount([candidate.primary_scope_type, candidate.primaryScopeType]);
  const idCount = valueCount([candidate.primary_scope_id, candidate.primaryScopeId]);
  const scopeType = candidate.primary_scope_type ?? candidate.primaryScopeType;

  if (typeCount !== 1) {
    return decision(false, "PRIMARY_SCOPE_TYPE_REQUIRED_EXACTLY_ONCE", "Exactly one primary_scope_type is required.");
  }
  if (idCount !== 1) {
    return decision(false, "PRIMARY_SCOPE_ID_REQUIRED_EXACTLY_ONCE", "Exactly one primary_scope_id is required.");
  }
  if (scopeType === "source_document") {
    return decision(false, "SOURCE_DOCUMENT_REFERENCE_ONLY", "source_document is provenance/reference only and cannot be a primary read-expanding scope.");
  }
  if (scopeType === "firm_workspace_future") {
    return decision(false, "FIRM_WORKSPACE_FUTURE_ONLY", "firm_workspace_future is reserved and cannot be a Phase 8 primary scope.");
  }
  return decision(true, "PRIMARY_SCOPE_VALID", "Primary scope contract is satisfied.");
}

export function validateScopeReferenceContract(candidate = {}) {
  const refs = Array.isArray(candidate.referenceScopes) ? candidate.referenceScopes : [];
  const expandsRead = refs.some((ref) => ref?.expandsReadEligibility === true || ref?.readExpanding === true);
  if (expandsRead) {
    return decision(false, "REFERENCE_SCOPE_NO_READ_EXPANSION", "Reference scopes do not expand read eligibility.");
  }
  if (refs.some((ref) => ref?.scopeType === "source_document" && ref?.authorityUseAllowed === true)) {
    return decision(false, "SOURCE_DOCUMENT_PROVENANCE_ONLY", "source_document references are provenance only.");
  }
  return decision(true, "REFERENCE_SCOPE_VALID", "Reference scopes are non-expanding provenance links.");
}

export function isScopeReadEligible(memoryItem = {}, requestContext = {}) {
  if (memoryItem.status === "revoked" || memoryItem.consentState === "revoked") {
    return decision(false, "REVOKED_MEMORY_UNREADABLE", "Revoked memory is unreadable immediately.");
  }
  if (memoryItem.primary_scope_type === "source_document" || memoryItem.primaryScopeType === "source_document") {
    return decision(false, "SOURCE_DOCUMENT_REFERENCE_ONLY", "source_document cannot be a primary read-expanding scope.");
  }
  if (memoryItem.memoryClass === "client_entity" || memoryItem.memory_class === "client_entity") {
    const itemClient = memoryItem.primary_scope_id ?? memoryItem.primaryScopeId ?? memoryItem.clientId;
    const requestClient = requestContext.clientId ?? requestContext.primary_scope_id ?? requestContext.primaryScopeId;
    if (!itemClient || itemClient !== requestClient) {
      return decision(false, "CLIENT_SCOPE_MISMATCH", "Client memory cannot be read in unrelated client context.");
    }
  }
  if (memoryItem.memoryClass === "matter" || memoryItem.memory_class === "matter") {
    const itemMatter = memoryItem.primary_scope_id ?? memoryItem.primaryScopeId ?? memoryItem.matterId;
    const requestMatter = requestContext.matterId ?? requestContext.primary_scope_id ?? requestContext.primaryScopeId;
    if (itemMatter !== requestMatter && requestContext.explicitMatterTransferConfirmed !== true) {
      return decision(false, "MATTER_SCOPE_MISMATCH", "Matter memory cannot be read outside the matter unless explicitly confirmed.");
    }
  }
  return decision(true, "SCOPE_READ_ELIGIBLE", "Scope read eligibility contract is satisfied.");
}

export function isScopeWriteEligible(candidate = {}, requestContext = {}) {
  const scopeType = candidate.primary_scope_type ?? candidate.primaryScopeType;
  if (!scopeType || scopeType === "ambiguous") {
    return decision(false, "AMBIGUOUS_SCOPE_SESSION_ONLY", "Ambiguous scope defaults to session-only.", { defaultScopeType: "session" });
  }
  const primary = validatePrimaryScopeContract(candidate);
  if (!primary.allowed) return primary;
  if (scopeType === "session" && (candidate.attachToClientId || candidate.attachToMatterId) && requestContext.userConfirmedAttachment !== true) {
    return decision(false, "SESSION_ATTACHMENT_REQUIRES_CONFIRMATION", "Session attaches to client/matter only with user confirmation.");
  }
  return decision(true, "SCOPE_WRITE_ELIGIBLE", "Scope write eligibility contract is satisfied.");
}

export function explainScopeDecision(scopeDecision) {
  return `${scopeDecision.code}: ${scopeDecision.reason}`;
}
