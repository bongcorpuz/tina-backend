export async function resolveExactCitation(query) {}
export async function hybridRetrieve(query, options = {}) {}
export function normalizeRetrievedEvidence(docs = []) {}
export function detectEvidenceConflicts(evidence = []) {}
export function rankEvidenceByAuthority(evidence = []) {}
export function buildClaimEvidenceMap(claims = [], evidence = []) {}
export async function synthesizeGroundedAnswer(payload) {}
export async function saveReasoningRun(supabase, payload) {}
export async function saveReasoningEvidence(supabase, payload) {}
export async function saveReasoningConflicts(supabase, payload) {}
