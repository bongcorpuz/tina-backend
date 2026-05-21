// FILE: routes/review-route.js
"use strict";

import { Router } from "express";
import { authenticate } from "../auth.js";
import { attachForcedHook } from "../shared/mode-guards.js";

/**
 * /review — REVIEWER_MODE
 * Stateful CPA/bar exam-style teaching format.
 * Session locked until /bye, /exit, or /quit.
 * Does not reveal answers before user responds.
 */
export function createReviewRoute({ askHandler }) {
  const router = Router();
  router.post("/", authenticate, attachForcedHook("/review"), askHandler);
  return router;
}
