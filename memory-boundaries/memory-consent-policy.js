// PATCH-08G scaffold: contract-only memory consent policy.
// Pure structured decisions only; no writes, persistence, controllers, or runtime consent handling.

const NO_DURABLE_RESPONSES = Object.freeze(["deny", "session_only", "ask_later"]);
const APPROVAL_RESPONSES = Object.freeze(["approve", "approve_with_edits"]);

const decision = (allowed, code, reason, extra = {}) => Object.freeze({ allowed, code, reason, ...extra });

function hasSensitiveClientOrMatterFact(candidate = {}) {
  const cls = candidate.memoryClass ?? candidate.memory_class;
  return (cls === "client_entity" || cls === "matter") && (
    candidate.sensitiveDataPresent === true ||
    candidate.sensitivityLabel === "sensitive" ||
    candidate.riskLevel === "high"
  );
}

export function isConsentRequired(candidate = {}) {
  const cls = candidate.memoryClass ?? candidate.memory_class;
  if (hasSensitiveClientOrMatterFact(candidate)) {
    return decision(true, "SENSITIVE_CLIENT_MATTER_REQUIRES_EXPLICIT_CONSENT", "Sensitive client/matter facts require explicit consent and visible scope.");
  }
  if (candidate.confidenceState === "inferred" || candidate.proposedPermissionLevel === "explicit_consent") {
    return decision(true, "DURABLE_OR_INFERRED_MEMORY_REQUIRES_CONSENT", "Inferred or explicit-consent durable memory requires confirmation.");
  }
  if (cls === "temporary_session" || candidate.proposedPermissionLevel === "session_only") {
    return decision(false, "SESSION_ONLY_NO_DURABLE_CONSENT", "Session-only use does not create durable memory.");
  }
  return decision(Boolean(candidate.consentRequired), candidate.consentRequired ? "CONSENT_REQUIRED" : "CONSENT_NOT_REQUIRED", "Consent requirement follows the candidate contract.");
}

export function validateConsentRequestContract(request = {}) {
  if (!["deny", "session_only"].includes(request.defaultResponse)) {
    return decision(false, "DEFAULT_RESPONSE_NOT_APPROVE", "defaultResponse must be deny or session_only, never approve.");
  }
  if ((request.memoryClass === "client_entity" || request.memoryClass === "matter") && !request.scopeLabel) {
    return decision(false, "CLIENT_MATTER_SCOPE_VISIBLE_REQUIRED", "Client/matter consent requires a visible scope label.");
  }
  if (request.sensitiveDataPresent === true && !(request.allowedUserResponses ?? []).includes("approve")) {
    return decision(false, "SENSITIVE_DATA_REQUIRES_EXPLICIT_APPROVE", "Sensitive data requires explicit approve as an available user response.");
  }
  return decision(true, "CONSENT_REQUEST_VALID", "Consent request contract is satisfied.");
}

export function validateConsentResponseContract(response = {}) {
  if (response.approved === true && !APPROVAL_RESPONSES.includes(response.userResponse)) {
    return decision(false, "APPROVED_TRUE_REQUIRES_APPROVE_RESPONSE", "approved=true requires approve or approve_with_edits.");
  }
  if (response.userResponse === "choose_different_scope" && (!response.selectedScopeType || !response.selectedScopeId)) {
    return decision(false, "DIFFERENT_SCOPE_REQUIRES_SCOPE_VALIDATION", "choose_different_scope requires selected scope fields for validation.");
  }
  if (response.userResponse === "forget" && response.existingMemoryPresent !== true) {
    return decision(false, "FORGET_REQUIRES_EXISTING_MEMORY", "forget acts only on existing memory.");
  }
  return decision(true, "CONSENT_RESPONSE_VALID", "Consent response contract is satisfied.");
}

export function canCreateDurableMemory(candidate = {}, consentState = {}) {
  const state = typeof consentState === "string" ? { id: consentState } : consentState;
  if (candidate.memoryClass === "source_derived" || candidate.memory_class === "source_derived") {
    return decision(false, "SOURCE_DERIVED_PROVENANCE_ONLY", "Source-derived memory remains provenance-only.");
  }
  if (state.id === "revoked") {
    return decision(false, "REVOKED_MEMORY_UNREADABLE", "Revoked consent makes memory unreadable and cannot create durable memory.");
  }
  if (state.id === "expired") {
    return decision(false, "EXPIRED_CONSENT_BLOCKS_DURABLE_USE", "Expired consent blocks durable use until refreshed.");
  }
  if (state.id !== "granted") {
    return decision(false, "GRANTED_CONSENT_REQUIRED", "Durable memory requires granted consent.");
  }
  if (candidate.authorityUseProhibited !== true || candidate.legalConclusionProhibited !== true) {
    return decision(false, "CONSENT_NOT_AUTHORITY", "Consent does not authorize legal authority use.");
  }
  return decision(true, "DURABLE_MEMORY_ALLOWED_BY_CONTRACT", "Durable memory creation would be contract-eligible in a future write patch.");
}

export function applyConsentDecision(candidate = {}, consentResponse = {}) {
  if (NO_DURABLE_RESPONSES.includes(consentResponse.userResponse)) {
    return decision(false, "NO_DURABLE_MEMORY_FROM_RESPONSE", `${consentResponse.userResponse} creates no durable memory.`, { resultingMode: consentResponse.userResponse === "session_only" ? "session_only" : "no_store" });
  }
  if (consentResponse.userResponse === "approve_with_edits") {
    return decision(true, "APPROVE_WITH_EDITS_SUPERSEDES_ORIGINAL", "approve_with_edits supersedes the original candidate.", { supersedesOriginalCandidate: true });
  }
  if (consentResponse.userResponse === "approve") {
    return decision(true, "APPROVE_SELECTED", "Approved response selected.", { approvedCandidate: { ...candidate } });
  }
  if (consentResponse.userResponse === "forget") {
    return decision(false, "FORGET_EXISTING_MEMORY_ONLY", "forget triggers revocation/deletion flow only for existing memory.");
  }
  return decision(false, "UNSUPPORTED_CONSENT_RESPONSE", "Unsupported consent response creates no durable memory.");
}

export function explainConsentDecision(consentDecision) {
  return `${consentDecision.code}: ${consentDecision.reason}`;
}
