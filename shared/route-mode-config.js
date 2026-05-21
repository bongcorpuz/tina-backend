// FILE: shared/route-mode-config.js
"use strict";

/**
 * Central registry mapping every TINA route to its mode configuration.
 * Import this wherever you need authoritative route→mode metadata.
 */

export const ROUTE_MODE_CONFIG = Object.freeze({
  "/ask": {
    route: "/ask",
    mode: "STANDARD_TAX",
    description: "General Philippine tax questions",
    stateful: false
  },
  "/tax": {
    route: "/tax",
    mode: "SENIOR_COUNSEL_MEMO",
    description: "Formal tax memo, deep technical analysis",
    stateful: false
  },
  "/review": {
    route: "/review",
    mode: "REVIEWER_MODE",
    description: "CPA/bar exam-style teaching format",
    stateful: true,
    allowedInputs: ["A", "B", "C", "D", "/bye", "/exit", "/quit"]
  },
  "/quiz": {
    route: "/quiz",
    mode: "QUIZ_MODE",
    description: "MCQ with answer key, explanation, reviewer trap",
    stateful: true,
    allowedInputs: ["A", "B", "C", "D", "/bye", "/exit", "/quit"]
  },
  "/diagnostic": {
    route: "/diagnostic",
    mode: "QUIZ_MODE",
    diagnostic: true,
    description: "Diagnostic assessment",
    stateful: true,
    allowedInputs: ["A", "B", "C", "D", "/bye", "/exit", "/quit"]
  },
  "/source": {
    route: "/source",
    mode: "SOURCE_LOOKUP",
    description: "Authority identification only",
    stateful: false
  },
  "/audit": {
    route: "/audit",
    mode: "COMPLEX_ADVISORY",
    description: "BIR audit, LOA, deficiency assessment, protest",
    stateful: false
  },
  "/case": {
    route: "/case",
    mode: "CASE_ANALYSIS",
    description: "Case-focused jurisprudence breakdown",
    stateful: false
  },
  "/debug": {
    route: "/debug",
    mode: "DEBUG_MODE",
    description: "Internal pipeline diagnostics",
    stateful: false
  },
  "/patch": {
    route: "/patch",
    mode: "CODE_PATCH_MODE",
    description: "Backend code fix requests",
    stateful: false
  },
  "/progress": {
    route: "/progress",
    mode: "UTILITY",
    utilityType: "PROGRESS",
    description: "Learner profile / progress",
    stateful: false
  },
  "/feedback": {
    route: "/feedback",
    mode: "UTILITY",
    utilityType: "FEEDBACK",
    description: "Feedback capture",
    stateful: false
  }
});

export function getRouteConfig(hookCode) {
  return ROUTE_MODE_CONFIG[hookCode] || null;
}

export function isStatefulRoute(hookCode) {
  return Boolean(ROUTE_MODE_CONFIG[hookCode]?.stateful);
}

export function getAllRoutes() {
  return Object.keys(ROUTE_MODE_CONFIG);
}
