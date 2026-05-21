// FILE: routes/audit-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /audit — COMPLEX_ADVISORY
 * BIR audit defense, LOA, PAN, FAN, deficiency assessment, protest.
 */
export function createAuditRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/audit"), askHandler);
  return router;
}
