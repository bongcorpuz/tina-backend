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

/** Alias of isValidQuizAnswer — used by mode-session-manager and quiz-route. */
export function isQuizAnswer(input) {
  return isValidQuizAnswer(input);
}

export function isStatefulHook(hookCode) {
  return STATEFUL_HOOKS.has(String(hookCode || "").toLowerCase());
}

/** Returns true when input begins with a forward-slash (any slash command). */
export function isSlashCommand(input) {
  return String(input || "").trim().startsWith("/");
}

/**
 * Returns true when the user has typed an explicit slash command that differs
 * from the currently active hook — i.e., a mode-switch attempt.
 */
export function isModeSwitchAttempt(input, activeHook) {
  const text = String(input || "").trim().toLowerCase();
  const hook = String(activeHook || "").toLowerCase();
  if (!text.startsWith("/")) return false;
  const firstWord = text.split(/\s+/)[0];
  return firstWord !== hook;
}

/**
 * Enforces quiz-session input rules.
 *
 * Returns null when the input is allowed, or an error-response object when it
 * must be blocked.  Pass this object directly to res.json().
 *
 * session must contain:
 *   { active_hook, adaptive_context: { learning: { domain? } } }
 * pendingQuiz is the row from tina_learning_attempts (or null).
 */
export function enforceQuizSessionInput(input, session, pendingQuiz) {
  const activeHook = String(session?.active_hook || "").toLowerCase();

  if (activeHook !== "/quiz") return null;
  if (isExitCommand(input)) return null;

  const lower = String(input || "").toLowerCase().trim();
  const domain = session?.adaptive_context?.learning?.domain || null;

  if (!domain && !pendingQuiz) {
    // SELECTION PHASE — only /quiz <domain> commands are valid.
    const isValidDomainCommand = lower.startsWith("/quiz ") || lower === "/quiz";
    if (!isValidDomainCommand) {
      return {
        success: false,
        engine: "TINA_MODE_GUARD",
        mode: "QUIZ_SELECTION_LOCKED",
        hook: "/quiz",
        answer:
          "Quiz mode is waiting for a tax domain. Please choose one of the listed /quiz options, or type /bye to exit.",
        sourceStatus: "QUIZ_SELECTION_LOCKED",
        sources: [],
        sourcesUsed: [],
        vectorMatches: 0
      };
    }
    return null;
  }

  if (pendingQuiz) {
    // ANSWERING PHASE — only A/B/C/D answers and exit commands.
    if (!isValidQuizAnswer(input) && !isSlashCommand(input)) {
      const domainLabel = domain || "";
      const domainSuffix = domainLabel ? ` for ${domainLabel}` : "";
      return {
        success: false,
        engine: "TINA_MODE_GUARD",
        mode: "QUIZ_ANSWER_GATED",
        hook: "/quiz",
        answer: `Quiz mode is active${domainSuffix}. Please answer using A, B, C, or D only, or type /bye to exit.`,
        sourceStatus: "QUIZ_ANSWER_GATED",
        sources: [],
        sourcesUsed: [],
        vectorMatches: 0
      };
    }
  }

  return null;
}
