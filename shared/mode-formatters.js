// FILE: shared/mode-formatters.js
"use strict";

/**
 * Shared response formatters for TINA mode routes.
 */

import { ROUTE_MODE_CONFIG } from "./route-mode-config.js";

export function buildModeLockedResponse(activeHook, lockedDomain = "") {
  const config = ROUTE_MODE_CONFIG[activeHook] || {};
  const modeLabel = activeHook === "/quiz" ? "Quiz" : activeHook === "/review" ? "Reviewer" : "Assessment";
  const domainSuffix = lockedDomain ? ` for ${lockedDomain}` : "";

  return {
    success: false,
    engine: "TINA_MODE_GUARD",
    mode: "MODE_SESSION_LOCKED",
    hook: activeHook,
    answer: `You are currently in ${modeLabel} Mode${domainSuffix}. Type /bye, /exit, or /quit first before switching modes.`,
    sourceStatus: "MODE_SESSION_LOCKED",
    sources: [],
    sourcesUsed: [],
    vectorMatches: 0
  };
}

export function buildAnswerGatedResponse(activeHook, lockedDomain = "") {
  const modeLabel = activeHook === "/quiz" ? "Quiz" : "Reviewer";
  const domainSuffix = lockedDomain ? ` for ${lockedDomain}` : "";

  return {
    success: false,
    engine: "TINA_MODE_GUARD",
    mode: "MODE_ANSWER_GATED",
    hook: activeHook,
    answer: `${modeLabel} mode is active${domainSuffix}. Please answer using A, B, C, or D only, or type /bye to exit.`,
    sourceStatus: "MODE_ANSWER_GATED",
    sources: [],
    sourcesUsed: [],
    vectorMatches: 0
  };
}

export function buildRouteErrorResponse(hookCode, message = "TINA could not process this request.") {
  return {
    success: false,
    engine: "TINA_ROUTE_HANDLER",
    hook: hookCode,
    mode: ROUTE_MODE_CONFIG[hookCode]?.mode || "UNKNOWN",
    answer: message,
    sources: [],
    sourcesUsed: [],
    vectorMatches: 0
  };
}
