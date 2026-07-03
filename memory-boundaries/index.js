// PATCH-08G scaffold index: exports contract/policy functions only.
// This file must not auto-run or import runtime application modules.

export {
  getMemoryClasses,
  getPermissionLevels,
  getConfidenceStates,
  getScopeTypes,
  isValidMemoryClass,
  isValidPermissionLevel,
  isValidConfidenceState,
  isValidScopeType
} from "./memory-taxonomy-registry.js";

export {
  validatePrimaryScopeContract,
  validateScopeReferenceContract,
  isScopeReadEligible,
  isScopeWriteEligible,
  explainScopeDecision
} from "./memory-scope-policy.js";

export {
  isConsentRequired,
  validateConsentRequestContract,
  validateConsentResponseContract,
  canCreateDurableMemory,
  applyConsentDecision,
  explainConsentDecision
} from "./memory-consent-policy.js";

export {
  validateMemoryAuthoritySeparation,
  assertMemoryDoesNotMutateAuthorityState,
  buildNonAuthorityMemoryContext,
  explainAuthoritySeparationDecision
} from "./memory-authority-separation-policy.js";

export {
  getServiceBoundaryContracts,
  getMemoryFeatureFlags,
  assertAllMemoryFlagsDefaultOff,
  getDeferredBoundaries,
  explainBoundaryContract
} from "./memory-service-boundary-contract.js";
