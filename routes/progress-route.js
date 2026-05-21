// FILE: routes/progress-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /progress — UTILITY (PROGRESS)
 * Learner profile and progress summary.
 */
export function createProgressRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/progress"), askHandler);
  return router;
}
