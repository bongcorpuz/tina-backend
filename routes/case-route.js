// FILE: routes/case-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /case — CASE_ANALYSIS
 * Case-focused jurisprudence breakdown.
 */
export function createCaseRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/case"), askHandler);
  return router;
}
