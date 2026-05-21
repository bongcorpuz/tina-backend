// FILE: services/schema-validator.js
"use strict";

/**
 * TINA Centralized Schema Validator
 *
 * Single source of truth for all runtime JSON shape validation.
 * Uses Zod for declarative, exhaustive schema enforcement.
 *
 * Exports:
 *   Schemas:  QuizChoicesSchema, QuizQuestionSchema
 *   Parsers:  safeParseQuizQuestion()
 *   Helpers:  buildValidationError()
 */

import { z } from "zod";

/* ─── QUIZ SCHEMAS ───────────────────────────────────────────────────────── */

export const QuizChoicesSchema = z.object({
  A: z.string().min(1, "Choice A is required"),
  B: z.string().min(1, "Choice B is required"),
  C: z.string().min(1, "Choice C is required"),
  D: z.string().min(1, "Choice D is required")
});

export const QuizQuestionSchema = z.object({
  topic:             z.string().min(1).default("General Taxation"),
  subtopic:          z.string().default(""),
  difficulty:        z.number().int().min(1).max(5).default(1),
  question:          z.string().min(1, "Question text is required"),
  choices:           QuizChoicesSchema,
  correctAnswer:     z.enum(["A", "B", "C", "D"]),
  correctAnswerText: z.string().default(""),
  explanation:       z.string().default(""),
  cpaleTrap:         z.string().default(""),
  sourceSupport:     z.string().default(""),
  validationStatus:  z.string().default("UNVALIDATED")
});

/* ─── SAFE PARSERS ───────────────────────────────────────────────────────── */

/**
 * Validates a quiz question object against QuizQuestionSchema.
 * Returns { ok: true, data } on success or { ok: false, error } on failure.
 * Never throws.
 */
export function safeParseQuizQuestion(obj) {
  const result = QuizQuestionSchema.safeParse(obj);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}

/* ─── ERROR BUILDER ──────────────────────────────────────────────────────── */

/**
 * Builds a standardized TINA error response for validation failures.
 * Does not expose raw Zod internals to the frontend.
 */
export function buildValidationError(context = "UNKNOWN", zodError = null) {
  const issues = zodError?.issues
    ?.map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
    .join("; ") || String(zodError || "Unknown validation error");

  console.error(`[TINA SCHEMA] Validation failed — context=${context} issues=${issues}`);

  return {
    success: false,
    engine: "TINA_SCHEMA_VALIDATOR",
    mode: "VALIDATION_ERROR",
    context: String(context),
    answer: "TINA encountered a validation error. Please try again.",
    sourceStatus: "VALIDATION_ERROR",
    sources: [],
    sourcesUsed: [],
    vectorMatches: 0
  };
}
