// FILE: routes/quiz-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /quiz — QUIZ_MODE
 * Stateful MCQ session. A/B/C/D only while active.
 * Session locked until /bye, /exit, or /quit.
 * Evaluates answers and auto-generates next question.
 */
export function createQuizRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/quiz"), askHandler);
  return router;
}
