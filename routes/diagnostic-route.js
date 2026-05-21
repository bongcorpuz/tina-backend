// FILE: routes/diagnostic-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /diagnostic — QUIZ_MODE (diagnostic variant)
 * Stateful adaptive diagnostic assessment.
 * Tracks score, weak areas, and strong areas.
 * Session locked until /bye, /exit, or /quit.
 */
export function createDiagnosticRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/diagnostic"), askHandler);
  return router;
}
