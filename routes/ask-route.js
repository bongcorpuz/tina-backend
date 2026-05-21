// FILE: routes/ask-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /ask — STANDARD_TAX
 * General Philippine tax questions via full RAG pipeline.
 */
export function createAskRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/ask"), askHandler);
  return router;
}
