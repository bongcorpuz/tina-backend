// FILE: services/controlled-loa-audit-procedure-boundary.js
// PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1
//
// Single shared source of truth for the narrow Philippine tax audit-procedure
// boundary-candidate signal set (originally introduced by PHASE-09ZE inside
// pipeline.js only). This module answers only: "is this input a narrow
// LOA/eLA audit-procedure candidate that should be allowed past the generic
// Philippine-tax domain boundary for evaluation by the controlled LOA gate?"
//
// It does not generate an answer, does not determine final legal eligibility,
// does not declare a query legally safe, and does not override exclusions.
// Final classification remains the sole responsibility of
// evaluateControlledLoaAskGate() in pipeline.js.

export const CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS = Object.freeze([
  /\be-?la\b/i,
  /electronic\s+letter\s+of\s+authority/i,
  /replacement\s+e-?la/i,
  /consolidated\s+e-?la/i,
  /notice\s+for\s+presentation/i,
  /notice\s+for\s+presentation\/submission/i,
  /presentation\/submission\s+of\s+documents/i,
  /presentation\s+or\s+submission\s+of\s+documents/i,
  /reminder\s+before\s+subpoena/i,
  /pre-subpoena/i,
  /subpoena\s+duces\s+tecum/i,
  /tax\s+verification\s+notice/i,
  /\bTVN\b/i,
  /mission\s+order/i,
  /audit\s+checklist/i,
  /document\s+checklist/i,
  /audit\s+case/i,
  /group\s+supervisor/i,
  /revenue\s+officer/i
]);

export function isControlledLoaAuditProcedureBoundaryCandidate(query = "", routeMode = "/ask") {
  const q = String(query || "");
  const h = String(routeMode || "/ask").toLowerCase();
  return h === "/ask" && CONTROLLED_LOA_AUDIT_PROCEDURE_BOUNDARY_PATTERNS.some((pattern) => pattern.test(q));
}

export function applyControlledLoaAuditProcedureBoundaryOverlay(baseDecision, query = "", routeMode = "/ask") {
  if (baseDecision?.decision === "ALLOW") return baseDecision;

  if (isControlledLoaAuditProcedureBoundaryCandidate(query, routeMode)) {
    return {
      isPhilippineTax: true,
      decision: "ALLOW",
      detectedDomain: "PHILIPPINE_TAX_AUDIT_PROCEDURE",
      reason: "controlled_loa_audit_procedure_boundary_signal",
      confidence: 0.90
    };
  }

  return baseDecision;
}
