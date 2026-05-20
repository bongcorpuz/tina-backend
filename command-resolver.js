// FILE: command-resolver.js
"use strict";

/**
 * TINA Global Command Resolver
 *
 * Layered resolution pipeline for all TINA slash commands and tax domains:
 * 1. Exact match
 * 2. Alias dictionary match
 * 3. Levenshtein distance (fast-levenshtein)
 * 4. Fuse.js fuzzy alias search
 * 5. Double Metaphone phonetic match
 * 6. Confidence threshold + ambiguity guard
 * 7. Safe fallback (show options, never guess low-confidence)
 *
 * Safety guarantees:
 * - Does NOT call OpenAI
 * - Does NOT trigger RAG retrieval
 * - Does NOT break existing routing when confidence is low
 * - Only intercepts inputs that start with "/" (slash commands)
 */

import Fuse from "fuse.js";
import lev from "fast-levenshtein";
import { doubleMetaphone } from "double-metaphone";
import { resolveTaxDomain } from "./learning/domain-normalizer.js";

export { resolveTaxDomain };

const RESOLVER_VERSION = "1.0.0";

// ─── thresholds ──────────────────────────────────────────────────────────────

const EXACT_CONFIDENCE    = 1.00;
const ALIAS_CONFIDENCE    = 0.95;
const LEV_THRESHOLD       = 0.65;  // minimum Levenshtein similarity to accept
const FUSE_THRESHOLD      = 0.65;  // minimum inverted Fuse score (1 - fuse.score) to accept
const PHONETIC_CONFIDENCE = 0.72;
const AMBIGUITY_GAP       = 0.05;  // if top-2 Lev scores are within this, flag as ambiguous

// ─── command definitions ─────────────────────────────────────────────────────

// Commands that accept a tax domain argument after the command word
const DOMAIN_ELIGIBLE_COMMANDS = new Set(["/quiz", "/review", "/diagnostic"]);

const COMMAND_DEFINITIONS = [
  {
    commandKey: "/ask",
    mode:        "STANDARD_TAX",
    description: "General Philippine tax questions",
    aliases: ["ask", "question", "query", "normal", "consult", "consultation", "general"]
  },
  {
    commandKey: "/tax",
    mode:        "SENIOR_COUNSEL_MEMO",
    description: "Formal tax memo and deep legal analysis",
    aliases: ["tax", "memo", "opinion", "legal", "analysis"]
  },
  {
    commandKey: "/review",
    mode:        "REVIEWER_MODE",
    description: "CPA/bar review teaching format",
    aliases: ["review", "reviewer", "revieu", "revew", "revue", "reveiw", "study", "refresher", "lecture", "teach", "teaching"]
  },
  {
    commandKey: "/quiz",
    mode:        "QUIZ_MODE",
    description: "MCQ practice with answer key",
    aliases: ["quiz", "quizz", "quize", "qiz", "test", "exam", "practice", "mcq", "mcqs", "assessment", "questionnaire"]
  },
  {
    commandKey: "/diagnostic",
    mode:        "QUIZ_MODE",
    description: "Diagnostic assessment",
    aliases: ["diagnostic", "diagnose", "diagnos", "diagnostik", "pretest", "evaluation"]
  },
  {
    commandKey: "/source",
    mode:        "SOURCE_LOOKUP",
    description: "Authority and citation lookup",
    aliases: ["source", "sourc", "sourse", "authority", "citation", "reference", "lookup"]
  },
  {
    commandKey: "/audit",
    mode:        "COMPLEX_ADVISORY",
    description: "BIR audit, protest, deficiency assessment",
    aliases: ["audit", "audt", "autdit", "investigation", "examination"]
  },
  {
    commandKey: "/case",
    mode:        "CASE_ANALYSIS",
    description: "Jurisprudence and case analysis",
    aliases: ["case", "cases", "cas", "jurisprudence", "ruling", "decision"]
  },
  {
    commandKey: "/debug",
    mode:        "DEBUG_MODE",
    description: "Internal pipeline diagnostics",
    aliases: ["debug", "debig", "debbug", "trace", "pipeline", "diagnostics"]
  },
  {
    commandKey: "/patch",
    mode:        "CODE_PATCH_MODE",
    description: "Backend code fix requests",
    aliases: ["patch", "patc", "pach", "repair", "fix"]
  },
  {
    commandKey: "/progress",
    mode:        "UTILITY",
    description: "Learner progress tracking",
    aliases: ["progress", "progess", "progrss", "status", "mastery", "stats", "tracking"]
  },
  {
    commandKey: "/feedback",
    mode:        "UTILITY",
    description: "Feedback capture",
    aliases: ["feedback", "feedbak", "fedback", "comment", "suggestion", "report"]
  }
];

// ─── lookup indexes ───────────────────────────────────────────────────────────

// Map: commandKey → definition
const CMD_BY_KEY = new Map(COMMAND_DEFINITIONS.map(c => [c.commandKey, c]));

// Map: alias (no slash, lowercase) → commandKey
const ALIAS_MAP = new Map();
for (const cmd of COMMAND_DEFINITIONS) {
  const bare = cmd.commandKey.slice(1); // strip /
  ALIAS_MAP.set(bare, cmd.commandKey);
  for (const alias of cmd.aliases) {
    if (!ALIAS_MAP.has(alias)) ALIAS_MAP.set(alias, cmd.commandKey);
  }
}

// Fuse.js index: search single-word aliases (no slashes)
const fuseItems = COMMAND_DEFINITIONS.flatMap(cmd =>
  [cmd.commandKey.slice(1), ...cmd.aliases].map(alias => ({
    alias,
    commandKey: cmd.commandKey,
    mode: cmd.mode
  }))
);

const fuseIndex = new Fuse(fuseItems, {
  keys:             ["alias"],
  threshold:        0.42,   // Fuse 0=perfect 1=no-match; 0.42 ≈ allows ~40% fuzz
  includeScore:     true,
  minMatchCharLength: 2,
  ignoreLocation:   true
});

// ─── helpers ──────────────────────────────────────────────────────────────────

export function normalizeUserInput(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripSlash(word = "") {
  return word.startsWith("/") ? word.slice(1) : word;
}

function levSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dist = lev.get(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function phoneticCodes(word) {
  try {
    return doubleMetaphone(word) || ["", ""];
  } catch {
    return ["", ""];
  }
}

function makeCommandResult({
  ok, commandKey = null, mode = null, confidence = 0,
  matchType = "none", originalInput = "", normalizedInput = "",
  reason, ambiguity
}) {
  return {
    ok: Boolean(ok),
    route:      commandKey,
    commandKey,
    mode,
    confidence: Math.round(confidence * 1000) / 1000,
    matchType,
    originalInput,
    normalizedInput,
    ...(reason    !== undefined && { reason }),
    ...(ambiguity !== undefined && { ambiguity })
  };
}

// ─── resolveSlashCommand ──────────────────────────────────────────────────────

/**
 * Resolve a (possibly misspelled) slash command to its canonical commandKey.
 * Input should be just the command word, e.g. "/quizz" or "quizz".
 * Returns a full resolution result object.
 */
export function resolveSlashCommand(input = "") {
  const originalInput = String(input || "").trim();
  const normalized    = normalizeUserInput(originalInput);
  const withSlash     = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const noSlash       = stripSlash(normalized);

  if (!noSlash) {
    return makeCommandResult({ ok: false, matchType: "none", originalInput, normalizedInput: normalized, reason: "empty input" });
  }

  // 1. Exact command key match
  if (CMD_BY_KEY.has(withSlash)) {
    const cmd = CMD_BY_KEY.get(withSlash);
    return makeCommandResult({ ok: true, commandKey: withSlash, mode: cmd.mode, confidence: EXACT_CONFIDENCE, matchType: "exact", originalInput, normalizedInput: normalized });
  }

  // 2. Alias exact match (without slash)
  if (ALIAS_MAP.has(noSlash)) {
    const commandKey = ALIAS_MAP.get(noSlash);
    const cmd = CMD_BY_KEY.get(commandKey);
    return makeCommandResult({ ok: true, commandKey, mode: cmd.mode, confidence: ALIAS_CONFIDENCE, matchType: "alias", originalInput, normalizedInput: normalized });
  }

  // 3. Levenshtein — score against every command key and every single-word alias
  let levBest = null, levBestSim = 0, levSecondSim = 0;

  for (const cmd of COMMAND_DEFINITIONS) {
    // Compare against bare command word (e.g., "quiz")
    const sim = levSimilarity(noSlash, cmd.commandKey.slice(1));
    if (sim > levBestSim) { levSecondSim = levBestSim; levBestSim = sim; levBest = cmd; }
    else if (sim > levSecondSim) { levSecondSim = sim; }

    // Compare against each single-word alias
    for (const alias of cmd.aliases) {
      if (alias.includes(" ")) continue;
      const aSim = levSimilarity(noSlash, alias);
      if (aSim > levBestSim) { levSecondSim = levBestSim; levBestSim = aSim; levBest = cmd; }
      else if (aSim > levSecondSim) { levSecondSim = aSim; }
    }
  }

  const levOk    = levBest && levBestSim >= LEV_THRESHOLD;
  const levAmbig = levOk && (levBestSim - levSecondSim) < AMBIGUITY_GAP;

  // 4. Fuse.js fuzzy alias search
  const fuseResults = fuseIndex.search(noSlash);
  const fuseTop     = fuseResults[0] || null;
  const fuseSim     = fuseTop ? 1 - (fuseTop.score || 0) : 0;
  const fuseOk      = fuseTop && fuseSim >= FUSE_THRESHOLD;

  // 5. Double Metaphone phonetic match
  const [inputP, inputS] = phoneticCodes(noSlash);
  let phoneticMatch = null;
  if (inputP) {
    for (const item of fuseItems) {
      const [cP, cS] = phoneticCodes(item.alias);
      if (
        (inputP && cP && inputP === cP) ||
        (inputS && cP && inputS === cP) ||
        (inputP && cS && inputP === cS)
      ) {
        phoneticMatch = item;
        break;
      }
    }
  }
  const phoneOk = Boolean(phoneticMatch);

  // 6. Resolve: prefer Levenshtein (precise for short words) unless Fuse is strictly better
  if (levAmbig && !fuseOk && !phoneOk) {
    return makeCommandResult({
      ok: false, matchType: "none", confidence: levBestSim,
      originalInput, normalizedInput: normalized,
      reason: "ambiguous — multiple commands equally close",
      ambiguity: [levBest?.commandKey]
    });
  }

  if (levOk && levBestSim >= (fuseSim - 0.05)) {
    return makeCommandResult({
      ok: !levAmbig,
      commandKey: levBest.commandKey,
      mode: levBest.mode,
      confidence: levBestSim,
      matchType: "levenshtein",
      originalInput,
      normalizedInput: normalized,
      ...(levAmbig && { ambiguity: [levBest.commandKey] })
    });
  }

  if (fuseOk) {
    const cmd = CMD_BY_KEY.get(fuseTop.item.commandKey);
    return makeCommandResult({
      ok: true,
      commandKey: fuseTop.item.commandKey,
      mode: cmd.mode,
      confidence: fuseSim,
      matchType: "fuzzy",
      originalInput,
      normalizedInput: normalized
    });
  }

  if (phoneOk) {
    const cmd = CMD_BY_KEY.get(phoneticMatch.commandKey);
    return makeCommandResult({
      ok: true,
      commandKey: phoneticMatch.commandKey,
      mode: cmd.mode,
      confidence: PHONETIC_CONFIDENCE,
      matchType: "phonetic",
      originalInput,
      normalizedInput: normalized,
      reason: "double metaphone phonetic match"
    });
  }

  return makeCommandResult({
    ok: false, matchType: "none",
    confidence: Math.max(levBestSim, fuseSim),
    originalInput, normalizedInput: normalized,
    reason: `no match above threshold (lev=${levBestSim.toFixed(2)}, fuse=${fuseSim.toFixed(2)})`
  });
}

// ─── resolveUserMode ──────────────────────────────────────────────────────────

/**
 * Resolve the user's intended mode from a raw input (full message or command word).
 * Strips the first word and resolves it as a slash command.
 */
export function resolveUserMode(input = "") {
  const normalized = normalizeUserInput(input);
  const firstWord  = normalized.split(/\s+/)[0] || "";
  return resolveSlashCommand(firstWord);
}

// ─── resolveCommandIntent ────────────────────────────────────────────────────

/**
 * Full intent resolution: command + optional tax domain.
 * Returns a combined result covering both command and domain.
 *
 * @param {string} rawInput - The full raw user input (e.g., "/revieu incame tax")
 * @returns {object} Combined resolution result
 */
export function resolveCommandIntent(rawInput = "") {
  const originalInput = String(rawInput || "").trim();
  const normalized    = normalizeUserInput(originalInput);
  const words         = normalized.split(/\s+/).filter(Boolean);
  const firstWord     = words[0] || "";
  const restText      = words.slice(1).join(" ");

  const commandResult = resolveSlashCommand(firstWord);

  let domainResult = null;
  if (
    commandResult.ok &&
    restText &&
    DOMAIN_ELIGIBLE_COMMANDS.has(commandResult.commandKey)
  ) {
    domainResult = resolveTaxDomain(restText);
  }

  return {
    ok:              commandResult.ok,
    route:           commandResult.commandKey,
    mode:            commandResult.mode,
    commandKey:      commandResult.commandKey,
    domain:          domainResult?.canonicalDomain || null,
    domainKey:       domainResult?.domainKey       || null,
    confidence:      commandResult.confidence,
    matchType:       commandResult.matchType,
    originalInput,
    normalizedInput: normalized,
    ...(commandResult.reason    && { reason:    commandResult.reason }),
    ...(commandResult.ambiguity && { ambiguity: commandResult.ambiguity }),
    commandResolution: commandResult,
    domainResolution:  domainResult
  };
}

// ─── test runner ─────────────────────────────────────────────────────────────

export function runCommandResolverTests() {
  const commandCases = [
    ["/quizz",        "/quiz"],
    ["/revieu",       "/review"],
    ["/tax",          "/tax"],
    ["/diagnose",     "/diagnostic"],
    ["/sourc",        "/source"],
    ["/audt",         "/audit"],
    ["/cas",          "/case"],
    ["/debig",        "/debug"],
    ["/patc",         "/patch"],
    ["/progess",      "/progress"],
    ["/feedbak",      "/feedback"]
  ];

  const intentCases = [
    ["/quizz vat",          "/quiz",       "VAT"],
    ["/revieu incame tax",  "/review",     "Income Tax"],
    ["/diagnose donor tax", "/diagnostic", "Donor's Tax"]
  ];

  const cmdResults = commandCases.map(([input, expected]) => {
    const r    = resolveSlashCommand(input);
    const pass = r.commandKey === expected;
    return { input, expected, got: r.commandKey, matchType: r.matchType, confidence: r.confidence, pass };
  });

  const intentResults = intentCases.map(([input, expectedCmd, expectedDomain]) => {
    const r         = resolveCommandIntent(input);
    const cmdPass   = r.commandKey === expectedCmd;
    const domPass   = !expectedDomain || r.domain === expectedDomain || r.domainKey?.includes(expectedDomain.toUpperCase().replace(/\s/g, "_").replace(/'/g, ""));
    const pass      = cmdPass && domPass;
    return { input, expectedCmd, expectedDomain, gotCmd: r.commandKey, gotDomain: r.domain, pass };
  });

  const allResults = [...cmdResults, ...intentResults];
  const passed     = allResults.filter(r => r.pass).length;

  return {
    passed,
    total: allResults.length,
    allPass: passed === allResults.length,
    commandResults: cmdResults,
    intentResults
  };
}

// ─── health check ─────────────────────────────────────────────────────────────

export function commandResolverHealthCheck() {
  return {
    ok: true,
    engine:          "TINA_COMMAND_RESOLVER",
    version:         RESOLVER_VERSION,
    commandCount:    COMMAND_DEFINITIONS.length,
    aliasCount:      ALIAS_MAP.size,
    fuseIndexSize:   fuseItems.length,
    domainEligible:  [...DOMAIN_ELIGIBLE_COMMANDS],
    layers:          ["exact", "alias", "levenshtein", "fuse-fuzzy", "double-metaphone"],
    levThreshold:    LEV_THRESHOLD,
    fuseThreshold:   FUSE_THRESHOLD,
    phoneticEnabled: true
  };
}
