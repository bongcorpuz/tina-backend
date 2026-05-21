// FILE: routes/debug-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /debug — DEBUG_MODE
 * Internal pipeline diagnostics.
 * Does not expose secrets or private environment variables.
 */
export function createDebugRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/debug"), askHandler);
  return router;
}
