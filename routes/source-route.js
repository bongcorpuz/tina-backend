// FILE: routes/source-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /source — SOURCE_LOOKUP
 * Authority identification only.
 * Returns indexed authorities without long advisory.
 */
export function createSourceRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/source"), askHandler);
  return router;
}
