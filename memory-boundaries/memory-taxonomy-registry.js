// PATCH-08G scaffold: contract-only memory taxonomy registry.
// Pure data helpers only; no runtime imports, I/O, DB, network, or authority inference.

const MEMORY_CLASSES = Object.freeze([
  "user_profile",
  "user_preference",
  "matter",
  "client_entity",
  "temporary_session",
  "source_derived",
  "prohibited_sensitive"
]);

const PERMISSION_LEVELS = Object.freeze([
  "no_store",
  "session_only",
  "matter_scoped",
  "client_scoped",
  "user_profile",
  "system_governance",
  "explicit_consent",
  "prohibited"
]);

const CONFIDENCE_STATES = Object.freeze([
  "user_confirmed",
  "inferred",
  "source_derived",
  "stale",
  "contradicted",
  "unverified",
  "revoked"
]);

const SCOPE_TYPES = Object.freeze([
  "global_user",
  "firm_workspace_future",
  "client",
  "matter",
  "session",
  "source_document"
]);

const clone = (values) => values.slice();

export function getMemoryClasses() {
  return clone(MEMORY_CLASSES);
}

export function getPermissionLevels() {
  return clone(PERMISSION_LEVELS);
}

export function getConfidenceStates() {
  return clone(CONFIDENCE_STATES);
}

export function getScopeTypes() {
  return clone(SCOPE_TYPES);
}

export function isValidMemoryClass(value) {
  return MEMORY_CLASSES.includes(value);
}

export function isValidPermissionLevel(value) {
  return PERMISSION_LEVELS.includes(value);
}

export function isValidConfidenceState(value) {
  return CONFIDENCE_STATES.includes(value);
}

export function isValidScopeType(value) {
  return SCOPE_TYPES.includes(value);
}
