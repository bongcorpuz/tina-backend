// FILE: routes/patch-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /patch — CODE_PATCH_MODE
 * Backend code fix requests.
 */
export function createPatchRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/patch"), askHandler);
  return router;
}
