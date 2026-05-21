// FILE: shared/mode-guards.js
"use strict";

/**
 * Shared middleware and guards for TINA mode routing.
 * Extracted from server.js so all route files can import them uniformly.
 */

const EXIT_COMMANDS = new Set(["/bye", "/exit", "/quit"]);
const VALID_QUIZ_ANSWERS = new Set(["A", "B", "C", "D"]);
const STATEFUL_HOOKS = new Set(["/quiz", "/review", "/diagnostic"]);

/**
 * Express middleware — stamps req.body with the route's forced hook code
 * so ask-handler.js knows which mode to activate regardless of user input.
 */
export function attachForcedHook(hookCode) {
  return (req, res, next) => {
    req.body = {
      ...(req.body || {}),
      hook: req.body?.hook || hookCode,
      forcedHook: hookCode
    };
    console.log(
      `[TINA ROUTE] route=${hookCode} forcedHook=${req.body.forcedHook} ` +
      `question=${String(req.body.question || "").slice(0, 60)}`
    );
    return next();
  };
}

export function isExitCommand(input) {
  return EXIT_COMMANDS.has(String(input || "").toLowerCase().trim());
}

export function isValidQuizAnswer(input) {
  return VALID_QUIZ_ANSWERS.has(String(input || "").toUpperCase().trim());
}

export function isStatefulHook(hookCode) {
  return STATEFUL_HOOKS.has(String(hookCode || "").toLowerCase());
}
