// FILE: sessions/mode-session-manager.js
"use strict";

/**
 * TINA Mode Session Manager
 *
 * Thin factory wrapper over mode-state.js.
 * Provides a clean interface for route handlers and guards to query
 * and mutate session state without importing mode-state.js directly.
 */

import { getModeState, saveModeState, clearModeState } from "../mode-state.js";
import { isExitCommand as _isExitCommand, isValidQuizAnswer } from "../shared/mode-guards.js";
import { ROUTE_MODE_CONFIG } from "../shared/route-mode-config.js";

const STATEFUL_MODES = new Set(["/quiz", "/review", "/diagnostic"]);

export function createModeSessionManager({ supabase }) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createModeSessionManager requires a valid Supabase client.");
  }

  async function getModeSession(userId, conversationId = null) {
    return getModeState(supabase, userId, conversationId);
  }

  async function setModeSession(userId, conversationId = null, session = {}) {
    return saveModeState(supabase, {
      userId,
      sessionId: conversationId,
      ...session
    });
  }

  async function clearModeSession(userId, conversationId = null) {
    return clearModeState(supabase, userId, conversationId);
  }

  async function hasActiveModeSession(userId, conversationId = null) {
    const state = await getModeSession(userId, conversationId);
    return Boolean(state?.active_hook && state.active_hook !== "/ask");
  }

  function isExitCommand(input) {
    return _isExitCommand(input);
  }

  /**
   * Returns null if input is allowed, or an error string if the session is locked.
   * Only enforces locks for stateful modes (/quiz, /review, /diagnostic).
   */
  function enforceModeLock(input, session) {
    const activeHook = session?.active_hook || null;

    if (!activeHook || !STATEFUL_MODES.has(activeHook)) return null;

    const config = ROUTE_MODE_CONFIG[activeHook] || {};
    const allowedInputs = config.allowedInputs || [];

    if (_isExitCommand(input)) return null;

    const upper = String(input || "").toUpperCase().trim();
    if (isValidQuizAnswer(upper)) return null;

    const modeLabel = activeHook === "/quiz" ? "Quiz"
      : activeHook === "/review" ? "Reviewer"
      : "Diagnostic";

    const domain = session?.adaptive_context?.learning?.domain || "";
    const domainSuffix = domain ? ` for ${domain}` : "";

    return `${modeLabel} mode is active${domainSuffix}. Please answer using A, B, C, or D only, or type /bye to exit.`;
  }

  return {
    getModeSession,
    setModeSession,
    clearModeSession,
    hasActiveModeSession,
    isExitCommand,
    enforceModeLock
  };
}
