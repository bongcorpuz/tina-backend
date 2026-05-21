// FILE: routes/feedback-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /feedback — UTILITY (FEEDBACK)
 * Feedback capture.
 */
export function createFeedbackRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/feedback"), askHandler);
  return router;
}
