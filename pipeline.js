// FILE: pipeline.js
// TINA 16-Step Query Pipeline
// Version: 1.0.0
//
// LAW 1 — PIPELINE SUPREMACY
// Every query enters through runPipeline() only.
// ask-handler.js calls ONLY pipeline.runPipeline().
// No engine is called from anywhere except this file.
//
// LAW 3 — authority_name filter enforced in Step 5 (semantic-only retrieval PROHIBITED)
// LAW 4 — Full Four-Part Doctrine Test enforced in Step 9

"use strict";

import { classify }                               from "./issue-classification-engine.js";
import {
  getModeRoutingMetadata,
  buildAdaptivePromptContract
}                                                 from "./adaptive-tina-master-prompt.js";
import { planAdaptiveResponse }                   from "./adaptive-response-planner.js";
import {
  rerankByHierarchy,
  annotateAuthorityCandidates
}                                                 from "./authority-engine.js";
import { applySupersessionFilter }                from "./supersession-engine.js";
import { retrieveRelevantSources }                from "./retrieval-engine.js";
import {
  searchSimilar,
  exactAuthoritySearch,
  normalizedCitationSearch,
  titleMetadataSearch,
  exactProvisionSearch
}                                                 from "./vector-store.js";
import { rerankForTina }                          from "./reranker-engine.js";
import { detectDoctrinalConflicts }               from "./doctrinal-engine.js";
import {
  isGenuineConflict,
  analyzeConflictPair
}                                                 from "./conflict-engine.js";
import { callOpenAIWithOrchestration }            from "./context-orchestration-engine.js";
import {
  generateTraceId,
  startTrace,
  endTrace,
  flushObservability
}                                                 from "./services/observability-service.js";
import {
  renderTinaAnswer,
  renderFastDefinitionConversational
}                                                 from "./answer-renderer.js";
import { enforceFinalAnswerCompliance }           from "./final-answer-compliance.js";
import { analyzeFactPattern }                     from "./fact-pattern-engine.js";
import { characterizeTransaction }                from "./transaction-characterization-engine.js";
import { evaluateEvidence }                       from "./evidence-evaluation-engine.js";
import { scoreRisk }                              from "./risk-scoring-engine.js";
import {
  inferIssuanceNumber,
  sourceTitleOf,
  canonicalSourceKey,
  filterDisplayedSourcesByDirectSupport,
  shouldHideSource
}                                                 from "./source-visibility-engine.js";
import {
  detectPhilippineTaxBoundary,
  BOUNDARY_REJECTION_MESSAGE
}                                                 from "./services/philippine-tax-domain-boundary.js";
import { selectSourceAuthorities }                from "./services/source-authority-selector.js";

const PIPELINE_VERSION = "1.0.0";

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeStr(v) {
  return typeof v === "string" ? v : String(v || "");
}

function detectQueryFlags(issueClassification, hook = "/ask") {
  const qi = safeStr(issueClassification?.queryIntent).toLowerCase();
  const pi = safeStr(issueClassification?.primaryIssue).toLowerCase();
  return {
    isDispute:     hook === "/audit" || /dispute|audit|assessment|protest|litigation/.test(qi),
    isTransaction: /transaction|characteriz|agency|sale.*service|pass.through|principal/.test(qi + " " + pi),
    isFactPattern: /fact.?pattern|complex|multiple|parties|transaction.*flow/.test(qi)
  };
}

// ─── Four-Part Doctrine Test (Law 4) ─────────────────────────────────────────
// trueConflict = true ONLY when ALL FOUR are satisfied:
//   (1) Same legal issue
//   (2) Same material facts   (unknown → pass-through; does not block)
//   (3) Same statute
//   (4) Opposite holding

function sourceCardBasename(value = "") {
  return safeStr(value).replace(/^.*[/\\]/, "");
}

function sourceCardIdentityBlob(c = {}) {
  const meta = c.metadata || {};
  return [
    c.issuanceNumber,
    c.displayTitle,
    c.sourceTitle,
    c.source_title,
    c.document_title,
    c.documentTitle,
    c.source,
    c.originalSource,
    c.original_source,
    c.path,
    c.source_path,
    meta.documentTitle,
    meta.document_title,
    meta.originalFileName,
    meta.original_file_name,
    meta.originalSource,
    meta.path,
    meta.source_path
  ]
    .filter(Boolean)
    .map(sourceCardBasename)
    .join(" ");
}

function inferLinkedSourceType(c = {}) {
  const blob = sourceCardIdentityBlob(c).toLowerCase();
  if (/(^|[\s_/.-])rr[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue regulation")) return "RR";
  if (/(^|[\s_/.-])rmc[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum circular")) return "RMC";
  if (/(^|[\s_/.-])rmo[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum order")) return "RMO";
  if (/(^|[\s_/.-])ramo[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue audit memorandum order")) return "RAMO";
  if (blob.includes("01_tax_code") || blob.includes("nirc") || blob.includes("tax code")) return "NIRC";
  if (/\bra[\s_.-]*(?:no[\s_.-]*)?\d{4,6}\b/.test(blob) || blob.includes("republic act")) return "RA";
  return "";
}

function sourceCardYear(value = "") {
  const text = safeStr(value);
  if (text.length !== 2) return text;
  return Number(text) <= 30 ? `20${text}` : `19${text}`;
}

function inferAdministrativeRef(blob = "", type = "") {
  const prefix = safeStr(type).toUpperCase();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${escaped}[-\\s_]*(?:No\\.?)?[-\\s_]*0*(\\d+)[-\\s_/](\\d{2,4})\\b`, "i"),
    new RegExp(`\\bRevenue\\s+(?:Audit\\s+)?(?:Regulations?|Memorandum\\s+(?:Circulars?|Orders?))[-\\s_]*(?:No\\.?)?[-\\s_]*0*(\\d+)[-\\s_/](\\d{2,4})\\b`, "i")
  ];
  for (const pattern of patterns) {
    const match = safeStr(blob).match(pattern);
    if (match) return `${prefix} No. ${Number(match[1])}-${sourceCardYear(match[2])}`;
  }
  return "";
}

function inferSourceCardRef(c = {}, linkedType = "") {
  const meta = c.metadata || {};
  const identityBlob = sourceCardIdentityBlob(c);
  const normalizedRef =
    c.normalizedReference ||
    c.normalized_reference ||
    meta.normalizedReference ||
    meta.normalized_reference ||
    "";

  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    return inferAdministrativeRef(identityBlob, linkedType);
  }

  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    // Search normalizedRef + citation + reference + identity blob
    // PLUS chunk title and text preview — normalizedReference is often null for
    // NIRC Sec. 105-108 chunks, so the section number must be extracted from
    // the section heading (c.title) or the chunk text itself.
    const nircExtra = [
      c.title,
      c.sectionHeading,
      c.section_heading,
      c.sectionTitle,
      c.section_title,
      String(c.text || c.content || "").slice(0, 500)
    ].filter(Boolean).join(" ");
    const nircBlob = [normalizedRef, c.citation, c.reference, identityBlob, nircExtra]
      .filter(Boolean).join(" ");
    // 1. Qualified "NIRC Sec. NNN" / "Tax Code Section NNN" reference
    const direct = nircBlob.match(/\b(?:NIRC|Tax Code)\s+Sec(?:tion)?\.?\s*(\d+[A-Z]?)\b/i);
    if (direct) return `NIRC Sec. ${direct[1]}`;
    // 2. DB-normalised NIRC_SEC_NNN / TAX_CODE_SEC_NNN form (normalizedRef column)
    const normalizedMatch = nircBlob.match(/\b(?:NIRC|TAX_CODE)_SEC_(\d+[A-Z]?)\b/i);
    if (normalizedMatch) return `NIRC Sec. ${normalizedMatch[1]}`;
    // 3. Bare "Section NNN" / "Sec. NNN" — present in NIRC chunk headings and text.
    //    Range capped at 1–999 (all NIRC provisions) to avoid false positives from
    //    year literals or large RPC/civil code article numbers.
    const bare = nircBlob.match(/\bSec(?:tion)?\.?\s+(\d{1,3}[A-Z]?)\b/i);
    if (bare) return `NIRC Sec. ${bare[1]}`;
    // 4. No section number found — return a NIRC-typed document-level label.
    //    Do NOT fall through to inferIssuanceNumber here: inferIssuanceNumber would
    //    match "RA-10963" in the NIRC filename and return "RA No. 10963", collapsing
    //    ALL NIRC chunks into a single mislabeled "RA No. 10963" card.
    return "Tax Code";
  }

  if (linkedType === "RA") {
    const match = identityBlob.match(/\bRA[-\s_]*(?:No\.?)?[-\s_]*(\d{4,6})\b/i);
    if (match) return `RA No. ${match[1]}`;
  }

  return inferIssuanceNumber({
    ...c,
    title: "",
    normalizedReference: "",
    normalized_reference: "",
    metadata: {
      ...meta,
      normalizedReference: "",
      normalized_reference: ""
    }
  });
}

/**
 * Resolves the canonical display label for a source card chip.
 *
 * Extends inferSourceCardRef with additional provision-scope metadata fields
 * that the DB sometimes stores in sectionScope / metadata-nested heading fields.
 * Also upgrades the generic "Tax Code" fallback to the more descriptive "NIRC Tax Code".
 *
 * HARD RULE: NIRC section labels (e.g. "NIRC Sec. 116") are derived only from
 * source-side metadata — answer text is never consulted here.
 *
 * Priority for NIRC/statute family:
 *   1-4.  normalizedReference / metadata.normalizedReference  (via inferSourceCardRef)
 *   5-6.  sectionScope / metadata.sectionScope               (checked here first)
 *   7.    metadata.sectionHeading / metadata.section_heading  (checked here first)
 *   8-9.  citation / reference                                (via inferSourceCardRef)
 *  10.    section number in c.title / c.sectionHeading / chunk text (via inferSourceCardRef)
 *  11.    "NIRC Tax Code" — document-family fallback
 *
 * For RR / RMC / RMO / RAMO / RA: delegates directly to inferSourceCardRef.
 */
function resolveSourceCardDisplayRef(c = {}, linkedType = "") {
  const meta = c.metadata || {};

  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    // Priority 5-6: explicit sectionScope field in source/metadata
    const sectionScope = safeStr(
      meta.sectionScope  || meta.section_scope ||
      c.sectionScope     || c.section_scope    || ""
    );
    if (sectionScope) {
      const m = sectionScope.match(/\b(?:NIRC\s+)?Sec(?:tion)?\.?\s*(\d{1,3}[A-Z]?)\b/i);
      if (m) return `NIRC Sec. ${m[1]}`;
    }

    // Priority 7: metadata-nested section heading (not inspected by inferSourceCardRef)
    const metaHeading = safeStr(
      meta.sectionHeading || meta.section_heading ||
      meta.sectionTitle   || meta.section_title   || ""
    );
    if (metaHeading) {
      const m = metaHeading.match(/\b(?:NIRC\s+)?Sec(?:tion)?\.?\s*(\d{1,3}[A-Z]?)\b/i);
      if (m) return `NIRC Sec. ${m[1]}`;
    }

    // Delegate to inferSourceCardRef for all remaining patterns
    // (normalizedRef, citation, top-level sectionHeading, chunk text excerpt)
    const base = inferSourceCardRef(c, linkedType);

    // Upgrade the generic "Tax Code" fallback to the more descriptive family label
    return base === "Tax Code" ? "NIRC Tax Code" : base;
  }

  // All other types: delegate directly
  return inferSourceCardRef(c, linkedType);
}

function sourceCardLabelType(label = "") {
  const text = safeStr(label).trim().toUpperCase();
  if (/^NIRC\b|^TAX CODE\b/.test(text)) return "NIRC";
  if (/^RR\b|^REVENUE REGULATIONS?\b/.test(text)) return "RR";
  if (/^RMC\b|^REVENUE MEMORANDUM CIRCULAR\b/.test(text)) return "RMC";
  if (/^RMO\b|^REVENUE MEMORANDUM ORDER\b/.test(text)) return "RMO";
  if (/^RAMO\b|^REVENUE AUDIT MEMORANDUM ORDER\b/.test(text)) return "RAMO";
  if (/^RA\b|^REPUBLIC ACT\b/.test(text)) return "RA";
  return "";
}

function sourceCardIsConsistent(label = "", linkedType = "") {
  const labelType = sourceCardLabelType(label);
  if (!labelType || !linkedType) return true;
  if (labelType === "NIRC") return ["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType);
  if (labelType === "RA") return ["RA", "NIRC", "STATUTE", "TAX_CODE"].includes(linkedType);
  return labelType === linkedType;
}

/**
 * Visible-source target whitelist.
 *
 * When targetAuthorities is non-empty this is a strict allowlist — only two
 * categories of cards survive:
 *
 *   1. Exact canonical match: canonicalSourceKey(provRef) === canonicalSourceKey(target)
 *      e.g. "NIRC Sec. 105" ↔ target "NIRC Sec. 105"
 *           "RR No. 16-2005" ↔ target "RR 16-2005"   (canonicalization strips "No.")
 *
 *   2. NIRC document-level fallback "Tax Code" — allowed only when at least one
 *      target authority is a NIRC/statute provision (correct document family).
 *      Specific section labels like "NIRC Sec. 4" do NOT fall into this bucket —
 *      they must match a target via case 1 or be rejected.
 *
 * Everything else is rejected, including:
 *   - off-target NIRC sections (NIRC Sec. 4 for a VAT query)
 *   - off-target administrative issuances (RMC 65-2012 for a VAT query)
 *   - RA labels that are not themselves in targetAuthorities
 *
 * When targetAuthorities is empty the gate is open (returns true for all).
 */
function isTargetAllowedCard(provRef, linkedType, targetAuths) {
  if (!targetAuths.length) return true;

  const provKey = canonicalSourceKey(provRef);

  // 1. Canonical match — covers "RR No. 16-2005" ≡ target "RR 16-2005"
  if (targetAuths.some(a => canonicalSourceKey(a) === provKey)) return true;

  // 2. NIRC document-level fallback — both "Tax Code" and "NIRC Tax Code" labels.
  //    Only valid when the target list includes at least one NIRC/statute provision.
  if (/^(?:nirc\s+)?tax\s+code$/i.test(provRef)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a));
  }

  return false;
}

/**
 * For chunks where inferSourceCardRef returned "" (no issuance label derived),
 * attempts to return a safe visible-card reference when targetAuthorities exist.
 *
 * Returns a non-empty string if the chunk's document identity can be tied to a
 * target authority; returns null when it cannot be verified and the chunk should
 * be suppressed (prevents arbitrary docTitle cards from bypassing the whitelist).
 *
 * Rules:
 *   NIRC/statute/tax-code: "Tax Code" when any target is a NIRC/statute provision.
 *     (inferSourceCardRef already returns "Tax Code" for this family, so this helper
 *      acts as a defensive backstop for edge cases.)
 *   RR/RMC/RMO/RAMO: re-attempts inferAdministrativeRef on the document identity blob;
 *     returns the derived label only when it is an exact canonical target match.
 *     A non-matching or empty label → null (suppressed).
 *   RA or unknown linkedType → null (cannot safely verify target match).
 */
function deriveTargetSafeDocumentRef(c, linkedType, targetAuths) {
  if (!targetAuths.length) return null;

  // NIRC/statute family — document-level "Tax Code" is safe when NIRC targets exist
  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a)) ? "Tax Code" : null;
  }

  // Administrative issuances — only allow exact canonical target match
  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    const adminRef = inferAdministrativeRef(sourceCardIdentityBlob(c), linkedType);
    if (adminRef && isTargetAllowedCard(adminRef, linkedType, targetAuths)) return adminRef;
    return null;
  }

  // RA or unknown — cannot safely determine target match from document identity alone
  return null;
}

/**
 * Returns whether a non-target-matched chunk has sufficient affirmative issue
 * relevance to appear as a visible source chip.
 *
 * Leverages the reranker's issueClassificationMatch.matched flag, which is
 * computed by buildIssueClassificationMatch and captures:
 *   • compatible — whether the doc's detected issues are compatible with the query
 *   • issueOverlap — whether query and doc issues share a common issue type
 *   • issueMismatch — whether there is an explicit cross-domain mismatch
 *
 * The `matched` flag is `false` when the reranker explicitly determined that the
 * chunk's subject matter is incompatible with the query (e.g. a VAT section chunk
 * for an EWT query, where detectDocIssues found ["VAT"] and compatible === false).
 *
 * Rules (applied in order — caller should only invoke for non-target chunks):
 *  1. issueMismatch === true  → reject ("issue_mismatch")
 *  2. No issueClassificationMatch data → allow ("no_icm_data") — conservative pass
 *  3. icm.matched === false   → reject ("non_target_no_issue_relevance")
 *  4. icm.matched === true or undefined → allow
 *
 * @param {object} c - Reranked chunk (must have c.issueClassificationMatch)
 * @returns {{ allowed: boolean, reason: string }}
 */
function isIssueRelevantSourceCardCandidate(c) {
  if (c.issueMismatch === true) {
    return { allowed: false, reason: "issue_mismatch" };
  }
  const icm = c.issueClassificationMatch;
  if (!icm || typeof icm !== "object") {
    return { allowed: true, reason: "no_icm_data" };
  }
  if (icm.matched === false) {
    return { allowed: false, reason: "non_target_no_issue_relevance" };
  }
  return { allowed: true, reason: icm.matched === true ? "issue_match" : "unknown_allow" };
}

/**
 * Final outbound consistency sanitizer for source cards.
 *
 * Re-derives the actual document type from each card's stable identity fields
 * (source, document_title, documentTitle) and compares it with the visible chip
 * label type.  Catches mismatches that escaped the per-chunk gates — most commonly
 * a chunk whose DB-stored normalizedReference says "NIRC Sec. X" but whose source
 * field identifies it as an RR or RMC document.
 *
 * Outcomes per card:
 *   consistent              → kept unchanged
 *   inconsistent, relabeled → card re-emitted with corrected RR/RMC label
 *   inconsistent, no label  → card dropped
 *
 * NOTE: targetAuths is accepted for legacy call-site compatibility but is no longer
 * used to drop relabeled cards.  Target-priority ordering is handled upstream by
 * the source-card loop before this function is called.
 */
function sanitizeOutboundSourceCards(cards, targetAuths = []) {
  const result = [];
  for (const card of cards) {
    const labelRef  = (card.normalizedReference || card.citation || "").trim();
    const labelType = sourceCardLabelType(labelRef);

    // No typed chip label — nothing to validate
    if (!labelType) { result.push(card); continue; }

    // Re-derive actual document type from the card's source-identity fields.
    // These are set from c.source / c.document_title / c.documentTitle in the loop
    // and survive independently of whatever linkedType was inferred at chunk level.
    const reChunk = {
      source:         card.source         || "",
      document_title: card.document_title || "",
      documentTitle:  card.documentTitle  || ""
    };
    const recomputedType = inferLinkedSourceType(reChunk);
    const effectiveType  = recomputedType || card.linkedSourceType || "";

    // Cannot determine document type — keep as-is
    if (!effectiveType) { result.push(card); continue; }

    // Is the label type compatible with the actual document type?
    const consistent =
      labelType === effectiveType ||
      (labelType === "NIRC" && ["NIRC", "STATUTE", "TAX_CODE"].includes(effectiveType)) ||
      (labelType === "RA"   && ["RA",   "NIRC",    "STATUTE",  "TAX_CODE"].includes(effectiveType));

    if (consistent) { result.push(card); continue; }

    // Inconsistency detected (e.g. "NIRC Sec. 4" label on an RR document).
    // Attempt to derive the correct label from the card's identity fields.
    let correctedRef = "";
    if (["RR", "RMC", "RMO", "RAMO"].includes(effectiveType)) {
      correctedRef = inferAdministrativeRef(sourceCardIdentityBlob(reChunk), effectiveType);
    }

    if (!correctedRef) {
      // Cannot safely relabel — drop the card
      console.warn("[SC SANITIZE] drop (no relabel):", {
        labelRef, labelType, effectiveType, source: reChunk.source || "(none)"
      });
      continue;
    }

    // Accept with corrected label (canonical authority label only; filename stays in documentTitle)
    const newTitle = correctedRef || card.documentTitle || card.document_title || "Source";
    console.warn("[SC SANITIZE] relabeled:", { from: labelRef, to: correctedRef, effectiveType });
    result.push({
      ...card,
      title:               newTitle,
      citation:            correctedRef,
      normalizedReference: correctedRef,
      normalized_reference: correctedRef,
      linkedSourceType:    effectiveType
    });
  }

  if (result.length !== cards.length) {
    console.log("[SC SANITIZE] summary:", {
      before: cards.length, after: result.length,
      dropped: cards.length - result.length
    });
  }

  return result;
}

function sourceCardDocumentTitle(c = {}) {
  const meta = c.metadata || {};
  return safeStr(
    c.document_title ||
      c.documentTitle ||
      meta.documentTitle ||
      meta.document_title ||
      meta.originalFileName ||
      meta.original_file_name ||
      c.source ||
      c.originalSource ||
      c.original_source ||
      c.path ||
      c.source_path ||
      c.title ||
      "Source"
  ).slice(0, 80);
}

function detectSameStatute(a, b) {
  const normalize = v =>
    safeStr(v?.statute || v?.primaryStatute || v?.normalizedReference || v?.citation || "")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  const aS = normalize(a);
  const bS = normalize(b);
  if (!aS || !bS) return false;
  return aS === bS || aS.includes(bS) || bS.includes(aS);
}

function detectSameMaterialFacts(a, b) {
  const extract = v =>
    safeStr(v?.factPattern || v?.facts || v?.factContext || v?.holding || "")
      .toLowerCase();
  const aF = extract(a);
  const bF = extract(b);
  if (!aF && !bF) return null;
  if (!aF || !bF) return null;
  const tokens = t => new Set(t.split(/\W+/).filter(w => w.length > 4));
  const aT = tokens(aF);
  const bT = tokens(bF);
  let overlap = 0;
  for (const t of aT) { if (bT.has(t)) overlap++; }
  return overlap >= 3;
}

export function fourPartDoctrineTest(a, b) {
  const pairAnalysis = analyzeConflictPair(a, b);

  // Parts 1 & 4: sameIssue + oppositeHolding (delegated to existing functions)
  const sameIssueAndOppositeHolding =
    pairAnalysis.genuineConflict === true || isGenuineConflict(a, b);

  // Part 2: same material facts — unknown (null) is a pass-through (benefit of doubt)
  const sameFacts = detectSameMaterialFacts(a, b);
  const factPartPassed = sameFacts === null || sameFacts === true;

  // Part 3: same statute
  const sameStatutePassed = detectSameStatute(a, b);

  const trueConflict = sameIssueAndOppositeHolding && factPartPassed && sameStatutePassed;

  return {
    trueConflict,
    parts: {
      sameIssue:       pairAnalysis.sameIssue?.passed ?? sameIssueAndOppositeHolding,
      sameMaterialFacts: sameFacts,
      sameStatute:     sameStatutePassed,
      oppositeHolding: pairAnalysis.oppositeHolding?.passed ?? sameIssueAndOppositeHolding
    },
    pairAnalysis
  };
}

// ─── Stage 2C: Educational Source Layer ──────────────────────────────────────
// Pure function — no retrieval, no OpenAI, no async.
// Input: reranked chunks (already authority-ranked), responseStyle, query string.
// Output: educationalSources object or null.
// Gate: called only when hook === "/ask" && ctx.mode === "FAST_DEFINITION".

function buildEducationalSources(chunks = [], responseStyle = null, query = "") {
  if (!Array.isArray(chunks) || !chunks.length) return null;

  const STYLE_CONFIG = {
    CONCISE:     { displayStyle: "SOURCE",          label: "Source",          max: 2, allowRMC: false },
    STANDARD:    { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 3, allowRMC: true  },
    EXPLAIN:     { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 4, allowRMC: true  },
    PROCEDURAL:  { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 4, allowRMC: true  },
    EXAMPLE:     { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 4, allowRMC: true  },
    BEGINNER:    { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 3, allowRMC: false },
    TAGLISH:     { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 3, allowRMC: false },
    COMPARATIVE: { displayStyle: "COMPARE_SOURCES", label: "Compare Sources", max: 6, allowRMC: true  }
  };
  const cfg = STYLE_CONFIG[responseStyle] || STYLE_CONFIG.STANDARD;

  const WEAK_TYPES  = new Set(["SECONDARY", "UNKNOWN", "CPA_NOTES", "REVIEW_MATERIALS"]);
  const COURT_TYPES = new Set([
    "SUPREME_COURT_EN_BANC", "SUPREME_COURT", "SC",
    "CTA_EN_BANC", "CTA_DIVISION", "COURT_OF_APPEALS"
  ]);
  const RMC_TYPES   = new Set(["RMC", "RMO", "RAMO"]);

  function docType(doc) {
    return String(doc.authorityType || doc.authority_type || doc.metadata?.authorityType || "UNKNOWN")
      .trim().toUpperCase().replace(/[\s-]+/g, "_");
  }

  function docLevel(doc) {
    const n = Number(
      doc.authorityLevel    ?? doc.authority_level    ??
      doc.controllingPrecedence ?? doc.controlling_precedence ??
      doc.metadata?.authorityLevel ?? NaN
    );
    if (Number.isFinite(n) && n > 0) return n;
    const t = docType(doc);
    if (t === "CONSTITUTION")                                             return 1;
    if (["STATUTE","NIRC","TAX_CODE","REPUBLIC_ACT","RA","CMTA","LGC"].includes(t)) return 2;
    if (["TAX_TREATY","TREATY"].includes(t))                             return 3;
    if (t === "SUPREME_COURT_EN_BANC")                                   return 4;
    if (["SUPREME_COURT","SC"].includes(t))                              return 5;
    if (t === "CTA_EN_BANC")                                             return 6;
    if (["CTA_DIVISION","COURT_OF_APPEALS"].includes(t))                 return 7;
    if (["RR","REVENUE_REGULATION"].includes(t))                         return 8;
    if (["RMC","RMO","RAMO"].includes(t))                                return 9;
    if (t === "BIR_RULING")                                              return 10;
    return 99;
  }

  const wantsCase = /\b(doctrine|ruling|case|supreme court|cta|jurisprudence)\b/i.test(query);

  // COMPARATIVE: extract two concept terms from query
  function extractComparativeTerms(q) {
    const pats = [
      /difference between\s+(.+?)\s+and\s+(.+)/i,
      /compare\s+(.+?)\s+(?:and|vs\.?)\s+(.+)/i,
      /(.+?)\s+vs\.?\s+(.+)/i,
      /(.+?)\s+versus\s+(.+)/i
    ];
    for (const re of pats) {
      const m = q.match(re);
      if (m?.[1] && m?.[2]) {
        const a = m[1].trim().replace(/[?]+$/, "").trim();
        const b = m[2].trim().replace(/[?]+$/, "").trim();
        if (a.length > 1 && a.length < 50 && b.length > 1 && b.length < 50) return [a, b];
      }
    }
    return [];
  }

  const comparativeTerms =
    responseStyle === "COMPARATIVE" ? extractComparativeTerms(query) : [];

  // Assign a comparative group only if one concept clearly dominates.
  // Generic words ("tax") are excluded to avoid false matches.
  const GENERIC_WORDS = new Set(["tax", "the", "and", "for", "not", "are", "this", "that"]);
  function assignGroup(doc, chipLabel) {
    if (comparativeTerms.length !== 2) return null;
    const blob = [
      chipLabel,
      String(doc.title || ""),
      String(doc.source || ""),
      String(doc.text || doc.content || "").slice(0, 300),
      String(doc.normalizedReference || doc.normalized_reference || "")
    ].join(" ").toLowerCase();
    const scores = comparativeTerms.map(term => {
      const words = term.toLowerCase().split(/\s+/)
        .filter(w => w.length >= 3 && !GENERIC_WORDS.has(w));
      if (!words.length) return 0;
      return words.filter(w => {
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${esc}\\b`).test(blob);
      }).length;
    });
    if (scores[0] === scores[1]) return null;
    const winner = comparativeTerms[scores[0] > scores[1] ? 0 : 1];
    return winner.charAt(0).toUpperCase() + winner.slice(1);
  }

  // Filter to educational-quality authorities only
  const eligible = chunks.filter(doc => {
    const t   = docType(doc);
    const lvl = docLevel(doc);
    if (WEAK_TYPES.has(t))               return false;
    if (COURT_TYPES.has(t) && !wantsCase) return false;
    if (RMC_TYPES.has(t) && !cfg.allowRMC) return false;
    if (lvl > 10)                         return false;
    return true;
  });

  if (!eligible.length) return null;

  // Build chips; deduplicate by normalized label, prefer entry with URL.
  // Learn More must show document-level labels ("NIRC 1997 as amended"),
  // NOT provision-level labels ("NIRC Sec. 105") — those belong in sourceCards.
  // Multiple chunks from the same parent document collapse to one chip here.
  const seen = new Map();
  for (const doc of eligible) {
    // Document-level title: prefer explicit document_title metadata over filename.
    const rawDocTitle   = String(
      doc.document_title    || doc.documentTitle    ||
      doc.metadata?.documentTitle || doc.metadata?.document_title ||
      doc.metadata?.originalFileName || doc.metadata?.original_file_name ||
      ""
    ).trim();
    const issuanceLabel = inferIssuanceNumber(doc);
    // Section-level provision references ("NIRC Sec. 105") belong in sourceCards.
    // For Learn More use the broader parent document label instead.
    const isSection     = /\bsec(?:tion)?\.?\s*\d/i.test(issuanceLabel);
    const fallback      = sourceTitleOf(doc)?.slice(0, 60) || "";
    const chipLabel     = rawDocTitle
      ? rawDocTitle.slice(0, 80)
      : (isSection ? fallback : (issuanceLabel || fallback));
    if (!chipLabel) continue;

    const normKey = chipLabel.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normKey) continue;

    const meta = doc.metadata || {};
    const url  =
      doc.driveViewUrl  || doc.drive_view_url   ||
      doc.url           || doc.webViewLink       ||
      doc.web_view_link || doc.sourceUrl         ||
      doc.source_url    ||
      meta.driveViewUrl || meta.drive_view_url   ||
      meta.url          || meta.webViewLink       ||
      meta.web_view_link || meta.sourceUrl        ||
      meta.source_url   || null;

    const lvl  = docLevel(doc);
    const kind = lvl <= 3 ? "primary" : lvl <= 9 ? "regulation" : lvl === 10 ? "ruling" : "other";
    const title = String(
      rawDocTitle || doc.title || doc.document_title || doc.documentTitle || doc.source || chipLabel
    ).slice(0, 120);

    const chip = { label: chipLabel, title, url, group: assignGroup(doc, chipLabel), kind };
    if (!seen.has(normKey)) {
      seen.set(normKey, chip);
    } else if (url && !seen.get(normKey).url) {
      seen.set(normKey, chip);
    }
  }

  const chips = Array.from(seen.values()).slice(0, cfg.max);
  if (!chips.length) return null;

  return {
    label:         cfg.label,
    responseStyle: responseStyle || "STANDARD",
    displayStyle:  cfg.displayStyle,
    chips
  };
}

// ─── Source Availability Classification ──────────────────────────────────────

const _SA_WARNING_STARTS = [
  "Indexed source not found.",
  "Indexed source retrieval timed out.",
  "I found related indexed material",
];

/**
 * Classifies source availability after all filtering stages are complete.
 * Must be called ONLY after filterDisplayedSourcesByDirectSupport has run.
 *
 * Invariant: AUTHORITY_FOUND requires displayedCount > 0 (renderer-visible cards).
 * acceptedSourceCount alone never produces AUTHORITY_FOUND.
 *
 * Priority order:
 *  1. AUTHORITY_FOUND      — displayedCount > 0 (visible cards exist; timeout is diagnostic only)
 *  2. RETRIEVAL_TIMEOUT    — timedOut and no visible card
 *  3. SOURCE_LOOKUP_EMPTY  — /source or SOURCE_LOOKUP mode with no visible card
 *  4. RELATED_AUTHORITY_ONLY — retrieved/accepted chunks exist but none survived to visible card
 *  5. NO_INDEXED_SOURCE    — nothing retrieved, no timeout
 *
 * acceptedSourceCount > 0 upgrades the no-visible-card path from NO_INDEXED_SOURCE to
 * RELATED_AUTHORITY_ONLY (sources were retrieved and passed Gates 1–3 but were filtered
 * out before display).  It never claims AUTHORITY_FOUND.
 *
 * timedOut is always preserved as retrievalTimedOut in the return value for diagnostics.
 */
function computeSourceAvailability({
  mode,
  hook,
  rerankedChunks,
  finalSourceCards,
  retrievalDiagnostics,
  acceptedSourceCount = 0
}) {
  const timedOut       = Boolean(retrievalDiagnostics?.timedOut);
  const isSourceLookup = String(mode || "").toUpperCase() === "SOURCE_LOOKUP" || hook === "/source";
  const rerankedCount  = Array.isArray(rerankedChunks) ? rerankedChunks.length : 0;
  const displayedCount = Array.isArray(finalSourceCards) ? finalSourceCards.length : 0;

  let sourceAvailability;
  let sourceAvailabilityReason;

  if (displayedCount > 0) {
    // Only path that may produce AUTHORITY_FOUND — visible cards must exist.
    sourceAvailability      = "AUTHORITY_FOUND";
    sourceAvailabilityReason = timedOut
      ? `${displayedCount} direct-support source card(s) verified; partial retrieval timeout occurred but authority found.`
      : `${displayedCount} direct-support source card(s) passed all filters.`;
  } else if (timedOut) {
    sourceAvailability      = "RETRIEVAL_TIMEOUT";
    sourceAvailabilityReason = "Retrieval timed out; no indexed source verification was possible.";
  } else if (isSourceLookup) {
    sourceAvailability      = "SOURCE_LOOKUP_EMPTY";
    sourceAvailabilityReason = "SOURCE_LOOKUP mode: no indexed source card survived the direct-support filter.";
  } else if (rerankedCount > 0 || acceptedSourceCount > 0) {
    // Chunks were retrieved and/or passed pre-filter gates, but none survived to a
    // visible source card.  acceptedSourceCount > 0 prevents misclassification as
    // NO_INDEXED_SOURCE when sources did exist — just filtered before display.
    sourceAvailability      = "RELATED_AUTHORITY_ONLY";
    sourceAvailabilityReason = acceptedSourceCount > 0
      ? `${acceptedSourceCount} accepted authority source(s) retrieved but no source card survived display filtering.`
      : `${rerankedCount} reranked chunk(s) retrieved but no source card survived direct-support filter.`;
  } else {
    sourceAvailability      = "NO_INDEXED_SOURCE";
    sourceAvailabilityReason = "No reranked chunks retrieved and retrieval did not time out.";
  }

  return {
    sourceAvailability,
    sourceStatus:             sourceAvailability,
    sourceAvailabilityReason,
    retrievalTimedOut:        timedOut,
    retrievedSourceCount:     rerankedCount,
    displayedSourceCount:     displayedCount,
    relatedSourceCount:       sourceAvailability === "RELATED_AUTHORITY_ONLY" ? rerankedCount : 0
  };
}

function _saeOutcomeCategory(input = {}) {
  return String(
    input.outcomeCategory ||
    input.retrievalMeta?.outcomeCategory ||
    input.retrievalMeta?.retrievalMeta?.outcomeCategory ||
    ""
  ).toUpperCase();
}

function _saeFallbackStatus(input = {}) {
  return String(input.fallbackStatus?.saeStatus || input.fallbackStatus || "").toUpperCase();
}

function _saeIsParsed(candidate = {}) {
  if (candidate.isParsed === true) return true;
  if (candidate.authorityAnnotation?.isParsed === true) return true;
  return String(candidate.parseStatus || candidate.parse_status || "").toLowerCase() === "success";
}

function _saeHasRequiredAuthorityLevel(candidate = {}) {
  const required = candidate.requiredAuthorityLevel ?? candidate.authorityAnnotation?.requiredAuthorityLevel;
  const actual = candidate.authorityLevel ?? candidate.authorityAnnotation?.authorityLevel;
  if (!Number.isFinite(Number(required))) return true;
  if (!Number.isFinite(Number(actual))) return false;
  return Number(actual) <= Number(required);
}

function _saeSuppressionReason(candidate = {}) {
  if (!_saeIsParsed(candidate)) return "SOURCE_PARSE_ERROR";
  if (candidate.isIndexed !== true && candidate.authorityAnnotation?.isIndexed !== true) return "NOT_INDEXED";
  if (candidate.authorityRole !== "GOVERNING") return "NON_GOVERNING_AUTHORITY";
  if (candidate.directlyGovernsIssue !== true) return "DOES_NOT_DIRECTLY_GOVERN_ISSUE";
  if (candidate.higherAuthorityMissing === true) return "HIGHER_AUTHORITY_MISSING";
  if (!_saeHasRequiredAuthorityLevel(candidate)) return "REQUIRED_AUTHORITY_LEVEL_NOT_SATISFIED";
  return "NOT_ELIGIBLE_FOR_AUTHORITY_FOUND";
}

/**
 * Classifies source availability before prompt assembly.
 *
 * Priority order:
 *  1. RETRIEVAL_TIMEOUT
 *  2. SOURCE_LOOKUP_EMPTY
 *  3. SOURCE_PARSE_ERROR
 *  4. AUTHORITY_FOUND
 *  5. RELATED_AUTHORITY_ONLY
 *  6. NO_INDEXED_SOURCE
 */
export function classifySourceAvailability(input = {}) {
  const annotatedCandidates = Array.isArray(input.annotatedCandidates)
    ? input.annotatedCandidates
    : [];
  const outcomeCategory = _saeOutcomeCategory(input);
  const fallbackStatus = _saeFallbackStatus(input);
  const retrievalTimedOut =
    outcomeCategory === "RETRIEVAL_TIMEOUT" ||
    fallbackStatus === "RETRIEVAL_TIMEOUT" ||
    input.retrievalDiagnostics?.timedOut === true ||
    input.retrievalMeta?.retrievalDiagnostics?.timedOut === true;

  const eligibleCandidates = annotatedCandidates.filter((candidate) =>
    candidate.authorityRole === "GOVERNING" &&
    candidate.directlyGovernsIssue === true &&
    candidate.isIndexed === true &&
    _saeIsParsed(candidate) === true &&
    candidate.higherAuthorityMissing === false
  );
  const suppressedCandidates = annotatedCandidates
    .filter((candidate) => !eligibleCandidates.includes(candidate))
    .map((candidate) => ({
      ...candidate,
      sourceAvailabilitySuppressionReason: _saeSuppressionReason(candidate)
    }));

  const base = {
    eligibleCandidates,
    suppressedCandidates,
    limitationRequired: true,
    disclosureType:    "LIMITATION",
    statusReason:      ""
  };

  if (retrievalTimedOut) {
    return {
      ...base,
      saeStatus:      "RETRIEVAL_TIMEOUT",
      disclosureType: "RETRIEVAL_TIMEOUT",
      statusReason:  "Retrieval timed out; source availability could not be verified within the retrieval window."
    };
  }

  if (outcomeCategory === "NO_CANDIDATES" && annotatedCandidates.length === 0) {
    return {
      ...base,
      saeStatus:      "SOURCE_LOOKUP_EMPTY",
      disclosureType: "SOURCE_LOOKUP_EMPTY",
      statusReason:  "Retrieval completed successfully and returned zero candidates."
    };
  }

  if (
    annotatedCandidates.length > 0 &&
    annotatedCandidates.every((candidate) => !_saeIsParsed(candidate))
  ) {
    return {
      ...base,
      saeStatus:      "SOURCE_PARSE_ERROR",
      disclosureType: "SOURCE_PARSE_ERROR",
      statusReason:  "Candidates were retrieved, but all relevant candidates failed source parsing."
    };
  }

  if (eligibleCandidates.length > 0) {
    return {
      ...base,
      saeStatus:          "AUTHORITY_FOUND",
      limitationRequired: false,
      disclosureType:     null,
      statusReason:       `${eligibleCandidates.length} governing indexed parsed candidate(s) directly govern the issue.`
    };
  }

  const hasRelatedAuthority = annotatedCandidates.some((candidate) =>
    candidate.authorityRole !== "GOVERNING" ||
    candidate.directlyGovernsIssue === false ||
    candidate.higherAuthorityMissing === true ||
    !_saeHasRequiredAuthorityLevel(candidate)
  );
  if (hasRelatedAuthority) {
    return {
      ...base,
      saeStatus:      "RELATED_AUTHORITY_ONLY",
      disclosureType: "RELATED_AUTHORITY_ONLY",
      statusReason:  "Indexed candidates exist, but none satisfy governing direct-authority requirements."
    };
  }

  console.warn("[SOURCE AVAILABILITY] NO_INDEXED_SOURCE emitted", {
    outcomeCategory,
    candidateCount: annotatedCandidates.length
  });
  return {
    ...base,
    saeStatus:      "NO_INDEXED_SOURCE",
    disclosureType: "NO_INDEXED_SOURCE",
    statusReason:  "No indexed source candidate satisfied source availability classification."
  };
}

/**
 * Prepends a source-availability caveat to the answer.
 * Skips prepend when the answer already opens with the relevant warning text.
 * For /audit fail-closed statuses, replaces the answer entirely.
 * Returns the answer unchanged for AUTHORITY_FOUND.
 */
function prependSourceAvailabilityWarning(answer, sourceAvailability, mode, hook) {
  if (sourceAvailability === "AUTHORITY_FOUND") return answer;

  const trimmed = String(answer || "").trimStart();
  if (_SA_WARNING_STARTS.some(s => trimmed.startsWith(s))) return answer;

  const isAuditMode =
    hook === "/audit" ||
    String(mode || "").toUpperCase() === "COMPLEX_ADVISORY" ||
    String(mode || "").toUpperCase() === "AUDIT_MODE";

  // RETRIEVAL_TIMEOUT must use timeout-specific language in all modes.
  // Audit mode still fails closed but with the correct reason (timeout ≠ no-source).
  if (sourceAvailability === "RETRIEVAL_TIMEOUT") {
    if (isAuditMode) {
      return "Indexed source retrieval timed out. TINA cannot provide an audit or legal conclusion for this mode because the indexed knowledge base could not be verified within the retrieval window.";
    }
    return "Indexed source retrieval timed out. I could not verify this answer against TINA's indexed knowledge base within the retrieval window.\n\n" + answer;
  }

  // NO_INDEXED_SOURCE and RELATED_AUTHORITY_ONLY in audit mode: fail closed.
  if (isAuditMode) {
    return "Indexed source not found. TINA cannot provide an audit or legal conclusion for this mode without a directly supporting indexed authority.";
  }

  if (sourceAvailability === "NO_INDEXED_SOURCE") {
    return "Indexed source not found. I could not locate a directly supporting authority in TINA's indexed knowledge base. The following is general information only and should not be treated as a cited Philippine tax authority.\n\n" + answer;
  }
  if (sourceAvailability === "RELATED_AUTHORITY_ONLY") {
    return "I found related indexed material, but no directly supporting source card survived TINA's direct-support filter. Treat this as a cautious general explanation, not a source-grounded legal conclusion.\n\n" + answer;
  }
  return answer;
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function runPipeline({
  query,
  hook = "/ask",
  supabase,
  openai,
  model,
  conversationHistory = [],
  issueClassificationOverride = null,
  modeOverride = null
} = {}) {
  const trace          = { steps: [], warnings: [] };
  const ctx            = {};
  const traceId        = generateTraceId();
  const pipelineStartMs = Date.now();

  startTrace({
    traceId,
    name: "tina-pipeline",
    hook,
    metadata: {
      queryLength:     (query || "").length,
      pipelineVersion: PIPELINE_VERSION,
      hook
    }
  });

  // ── Defense-in-depth: Philippine Tax Domain Boundary (FAIL-CLOSED) ─────────
  // Catches any direct call to runPipeline() that bypassed ask-handler.js.
  // Both REJECT and CLARIFY abort the pipeline — no retrieval, no OpenAI.
  {
    const _pipelineBoundaryCheck = detectPhilippineTaxBoundary(query || "", hook || "/ask");
    console.log("[PIPELINE DOMAIN BOUNDARY CHECK]", {
      query:           (query || "").slice(0, 120),
      hook,
      detectedDomain:  _pipelineBoundaryCheck.detectedDomain,
      isPhilippineTax: _pipelineBoundaryCheck.isPhilippineTax,
      decision:        _pipelineBoundaryCheck.decision,
      reason:          _pipelineBoundaryCheck.reason,
      confidence:      _pipelineBoundaryCheck.confidence,
    });
    if (_pipelineBoundaryCheck.decision === "REJECT" || _pipelineBoundaryCheck.decision === "CLARIFY") {
      console.log("[PIPELINE DOMAIN BOUNDARY REJECTED]", {
        query:      (query || "").slice(0, 120),
        hook,
        decision:   _pipelineBoundaryCheck.decision,
        reason:     _pipelineBoundaryCheck.reason,
        confidence: _pipelineBoundaryCheck.confidence,
        blocked:    true,
      });
      endTrace({ traceId, name: "tina-pipeline", status: "DOMAIN_BOUNDARY_REJECT", hook });
      return {
        answer:                   BOUNDARY_REJECTION_MESSAGE,
        sources:                  [],
        sourcesUsed:              [],
        sourceCards:              [],
        vectorMatches:            0,
        sourceStatus:             "DOMAIN_BOUNDARY_REJECT",
        domainBoundary:           true,
        domainBoundaryDecision:   _pipelineBoundaryCheck.decision,
        domainBoundaryReason:     _pipelineBoundaryCheck.reason,
        domainBoundaryConfidence: _pipelineBoundaryCheck.confidence,
        detectedDomain:           _pipelineBoundaryCheck.detectedDomain,
        pipelineVersion:          PIPELINE_VERSION,
      };
    }
  }
  // ── End Defense-in-depth ──────────────────────────────────────────────────

  // ── Step 1: Issue Classification ──────────────────────────────────────────
  ctx.issueClassification = issueClassificationOverride || classify(query);
  trace.steps.push({ step: 1, name: "issueClassification", done: true });

  // ── Step 2: Sub-Prompt / Mode Routing ────────────────────────────────────
  // Hook takes precedence over issue-classification mode for explicit route modes.
  const HOOK_MODE_MAP = {
    "/case":       "CASE_ANALYSIS",
    "/audit":      "COMPLEX_ADVISORY",
    "/review":     "REVIEWER_MODE",
    "/quiz":       "QUIZ_MODE",
    "/diagnostic": "QUIZ_MODE",
    "/source":     "SOURCE_LOOKUP",
    "/tax":        "SENIOR_COUNSEL_MEMO",
    "/patch":      "CODE_PATCH_MODE",
    "/debug":      "DEBUG_MODE",
    "/progress":   "UTILITY",
    "/feedback":   "UTILITY"
  };
  const primaryIssue   = ctx.issueClassification?.primaryIssue || "GENERAL_TAX";
  ctx.routingMetadata  = getModeRoutingMetadata(primaryIssue);
  ctx.mode             = modeOverride || HOOK_MODE_MAP[hook] || ctx.routingMetadata?.mode || "STANDARD_TAX_MODE";
  trace.steps.push({ step: 2, name: "subPromptRouting", mode: ctx.mode, hook, done: true });

  // ── Step 3: Authority Ranking (by Source Hierarchy — Law 2) ──────────────
  const rawTargets     = ctx.issueClassification?.targetAuthorities || [];
  const authorityDocs  = rawTargets.map(a => ({
    normalizedReference: a,
    authorityType: a,
    source: a
  }));
  ctx.rankedAuthorities = rerankByHierarchy(authorityDocs, query);
  trace.steps.push({ step: 3, name: "authorityRanking", count: ctx.rankedAuthorities.length, done: true });

  // ── Step 4: Supersession Filter ───────────────────────────────────────────
  ctx.activeAuthorities = applySupersessionFilter(ctx.rankedAuthorities);
  trace.steps.push({ step: 4, name: "supersessionFilter", done: true });

  // ── Step 5: Issue-Targeted Retrieval (Law 3) ──────────────────────────────
  // authority_name IN controllingAuthorities[] is passed explicitly.
  // Semantic similarity alone is PROHIBITED as the sole retrieval criterion.
  // retrieval-engine.js Layer 1 (EXACT_NORMALIZED_AUTHORITY) runs first;
  // Layer 5 (VECTOR_SEMANTIC) only fires after all authority-targeted layers.
  // Per-step timeout: Supabase free-tier cold starts can hang without rejecting.
  // After 15 s, fall through with empty chunks so the pipeline still completes.
  const controllingAuthorities = rawTargets;

  // Adaptive timeout: authority-priority fast path (Phase 3) + early exit (Phase 3B)
  // complete quickly per query, but Render / Supabase free-tier TCP cold starts can add
  // 10–25 s before the first indexed row returns.  The old hard-coded 15 s was correct
  // for a single semantic query but too short for the layered indexed authority retrieval
  // now in place.  UTILITY / DEBUG modes keep the short timeout — they do not produce
  // user-facing answers and do not need full authority traversal.
  const _RETRIEVAL_TIMEOUT_MAP = {
    FAST_DEFINITION:     20_000,   // definitional — fast path sufficient
    STANDARD_TAX_MODE:   35_000,   // primary /ask path
    FULL_DOCUMENT_MODE:  35_000,
    CASE_ANALYSIS:       40_000,
    SOURCE_LOOKUP:       30_000,
    SENIOR_COUNSEL_MEMO: 45_000,   // complex advisory — more authority layers
    COMPLEX_ADVISORY:    45_000,
    REVIEWER_MODE:       25_000,
    QUIZ_MODE:           20_000,
    CODE_PATCH_MODE:     20_000,
    UTILITY:             15_000,   // no user-facing answer needed
    DEBUG_MODE:          15_000,
  };
  const RETRIEVAL_STEP_TIMEOUT_MS = _RETRIEVAL_TIMEOUT_MAP[ctx.mode] ?? 35_000;
  console.log("[RETRIEVAL TIMEOUT CONFIG]", { mode: ctx.mode, timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS });

  // Authority-priority routing wrapper.
  // callSearchCallable() passes opts.retrievalLayer — each layer dispatches to the
  // correct vector-store.js function (metadata-column searches only; no semantic).
  // Semantic vector search is a TRUE FALLBACK: it fires only when layers 1–4 have
  // not yet accumulated enough results.
  //
  // _uniqueAuthorityCandidates (Set) tracks deduplicated authority docs from layers
  // 1–4.  Once .size + _semanticHits >= _SEMANTIC_SKIP_THRESHOLD, semantic calls
  // return [] to prevent noisy semantic results from burying authority-targeted ones.
  //
  // smartSearch() is NOT used for any layer — it performs a nested semantic
  // fallback internally (exact→normalized→title→semantic) which would run semantic
  // retrieval before Layer 5 is reached.
  // Unique authority candidate tracking.
  // Using a Set of stable doc keys so that the same doc retrieved by multiple
  // Layer 1–4 queries (e.g. "NIRC Sec. 105" via Layer 1 AND via Layer 2) is counted
  // only once toward the semantic skip threshold.  Only docs with usable text AND an
  // authority-identifying field are counted — guards against empty/partial metadata rows.
  const _authorityDocKey = (doc) => {
    if (doc.id) return `id:${doc.id}`;
    const src = String(doc.source        || doc.document_title || "");
    const ref = String(doc.normalized_reference || doc.normalizedReference ||
                       (doc.chunk_index != null ? doc.chunk_index : ""));
    return `${src}|${ref}`;
  };
  const _isUsableAuthorityDoc = (doc) => {
    const hasText = Boolean(doc.text || doc.content);
    const hasAuth = Boolean(
      doc.source || doc.document_title ||
      doc.normalized_reference || doc.normalizedReference || doc.authority_type
    );
    return hasText && hasAuth;
  };
  const _uniqueAuthorityCandidates = new Set();
  let _semanticHits = 0;
  const _SEMANTIC_SKIP_THRESHOLD = 12; // matches topK: 12 passed to retrieveRelevantSources

  // Returns true when a Layer 3/4 query is an exact NIRC section or provision
  // reference (e.g. "NIRC Sec. 105", "Section 105 of the NIRC", "NIRC 105").
  // These are safe to intercept with the indexed normalized_reference fast-path.
  // Broad topic queries ("VAT refund", "withholding tax", "BIR LOA") return false
  // and fall through to the standard titleMetadataSearch path unchanged.
  const _isExactProvisionQuery = (q = "") =>
    /\b(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)(?:\s+sec(?:tion)?\.?\s*|\s+)\d{1,3}[A-Z]?\b/i.test(q) ||
    /\bsec(?:tion)?\.?\s*\d{1,3}[A-Z]?\s+(?:of\s+(?:the\s+)?)?(?:nirc|tax\s+code)\b/i.test(q) ||
    /\bnirc\s+\d{1,3}[A-Z]?\b/i.test(q);

  const _vectorSearchFn = async (q, opts = {}) => {
    const layer = opts.retrievalLayer || "";
    const base  = {
      query:                 q,
      supabase,
      topK:                  opts.topK || 48,
      issueClassification:   opts.issueClassification || ctx.issueClassification || null,
      targetAuthorities:     opts.targetAuthorities   || controllingAuthorities  || [],
      controllingAuthorities
    };

    if (layer === "LAYER_1_EXACT_NORMALIZED_AUTHORITY") {
      console.log("[EXACT RETRIEVAL]",      { query: q, layer });
      const r = await exactAuthoritySearch(base);
      for (const doc of r) {
        if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
      }
      return r;
    }
    if (layer === "LAYER_2_CITATION_VARIANT") {
      console.log("[NORMALIZED RETRIEVAL]", { query: q, layer });
      const r = await normalizedCitationSearch(base);
      for (const doc of r) {
        if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
      }
      return r;
    }
    if (layer === "LAYER_3_TITLE_PATH_METADATA" || layer === "LAYER_4_CONTENT_KEYWORD") {
      // Use titleMetadataSearch (metadata-column only) — NOT smartSearch, which
      // cascades into semantic search internally before Layer 5 is reached.
      console.log("[DOMAIN RETRIEVAL]", { query: q, layer });

      // ── Exact provision fast-path for Layer 3/4 ───────────────────────────
      // When the Layer 3/4 query itself is an exact NIRC section reference
      // (e.g. "NIRC Sec. 105" injected into titlePathMetadataQueries by
      // buildRetrievalQuerySet for a "what is VAT" or direct provision query),
      // try the indexed normalized_reference.in() lookup first.
      //
      // titleMetadataSearch also runs this fast-path internally, but intercepting
      // here lets us skip titleMetadataSearch entirely when we have enough hits,
      // avoiding the 10-sub-term ILIKE loop even when Layer 3 is not individually
      // sufficient per the isAuthoritySufficient gate.
      if (_isExactProvisionQuery(q)) {
        const exactHits = await exactProvisionSearch({ ...base, query: q });

        if (exactHits.length > 0) {
          for (const doc of exactHits) {
            if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
          }
          // Skip the slow ILIKE path when we have enough exact results.
          // Threshold: topK/4 ensures we don't skip when only 1-2 chunks matched
          // across a 48-doc pool — the isAuthoritySufficient gate will decide.
          const needed = Math.max(1, Math.floor((opts.topK || 48) / 4));
          if (exactHits.length >= needed) {
            console.log("[METADATA SEARCH SKIPPED FOR EXACT PROVISION]", {
              query:      q,
              layer,
              exactFound: exactHits.length,
              needed
            });
            return exactHits;
          }
          // Partial exact hit — merge with titleMetadataSearch.
          // titleMetadataSearch internally tries fastRefLookup again (idempotent)
          // and catches any 57014 gracefully, so duplicates sort out in dedup.
          const slowR = await titleMetadataSearch(base);
          const combined = [...exactHits, ...slowR];
          for (const doc of combined) {
            if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
          }
          return combined;
        }
        // Exact lookup missed (normalized_reference null/unindexed for this doc).
        // Fall through to titleMetadataSearch which catches 57014 internally
        // via [METADATA SEARCH TIMEOUT FALLBACK] and returns partial results
        // rather than wiping accumulated candidates.
      }
      // ── End exact provision fast-path ─────────────────────────────────────

      const r = await titleMetadataSearch(base);
      for (const doc of r) {
        if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
      }
      return r;
    }

    // Layer 5 (VECTOR_SEMANTIC), Layer 6 (BROAD_TAX_DOMAIN_FALLBACK), unlabelled:
    // Skip semantic if unique authority candidates (deduplicated via Set) plus any
    // previous semantic pass have already accumulated enough results.  Using
    // _uniqueAuthorityCandidates.size + _semanticHits prevents Layer 6 from running
    // a duplicate semantic pass when Layer 5 already found sufficient candidates.
    const _totalHits = _uniqueAuthorityCandidates.size + _semanticHits;
    if (_totalHits >= _SEMANTIC_SKIP_THRESHOLD) {
      console.log("[SEMANTIC FALLBACK SKIPPED]", { query: q, layer, uniqueAuthorityCount: _uniqueAuthorityCandidates.size, semanticHits: _semanticHits, total: _totalHits });
      return [];
    }
    // Wrap searchSimilar so intentional skips ([SEMANTIC FALLBACK SKIPPED]) are
    // distinguishable from real search failures ([SEMANTIC FALLBACK FAILED]) in logs.
    console.log("[SEMANTIC FALLBACK]", { query: q, layer, uniqueAuthorityCount: _uniqueAuthorityCandidates.size, semanticHits: _semanticHits });
    try {
      const r = await searchSimilar(base);
      _semanticHits += r.length;
      return r;
    } catch (err) {
      console.warn("[SEMANTIC FALLBACK FAILED]", { query: q, layer, error: err?.message || String(err) });
      trace.warnings.push({ step: 5, warning: `semanticFallbackFailed: ${err?.message || "unknown"}`, layer });
      return [];
    }
  };

  // _retrievalWon is set inside the .then() wrapper before Promise.race resolves,
  // so it is guaranteed true when checked immediately after the await if retrieval
  // completed before the timeout arm fired.
  let _retrievalWon = false;
  const retrievalPromise = retrieveRelevantSources({
    query,
    supabase,
    vectorSearch:         _vectorSearchFn,
    issueClassification:  ctx.issueClassification,
    targetAuthorities:    controllingAuthorities,
    controllingAuthorities,
    topK:   12,
    poolK:  48
  }).then((r) => { _retrievalWon = true; return r; });

  const timeoutFallbackPromise = new Promise(resolve =>
    setTimeout(() => {
      trace.warnings.push({ step: 5, warning: `Retrieval timed out after ${RETRIEVAL_STEP_TIMEOUT_MS} ms — proceeding with empty chunks`, timedOut: true });
      // Return object shape (not bare []) so the normalizer stores retrievalDiagnostics
      // with timedOut: true and downstream code can distinguish timeout from
      // genuine empty retrieval.  The normalizer handles both [] and object shapes.
      resolve({
        retrievedSources:     [],
        sources:              [],
        retrievalDiagnostics: {
          timedOut:  true,
          timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS
        }
      });
    }, RETRIEVAL_STEP_TIMEOUT_MS)
  );

  // SOURCE_LOOKUP awaits retrieval directly — the timeout fallback must not win
  // before retrieval completes, which would produce a false-empty response while
  // the real retrieval runs in the background.  All other modes keep the existing
  // Promise.race behaviour so their latency characteristics are unchanged.
  const isSourceLookupRetrieval =
    String(ctx.mode || "").toUpperCase() === "SOURCE_LOOKUP";

  // Authority-critical retrieval: queries whose answer is meaningless without the
  // canonical primary authorities (e.g. "What is VAT?" requires Sec. 105-108).
  // Accepting a timeout-empty fallback would cascade to zero source cards even
  // though retrieval eventually finds the right documents.  Like SOURCE_LOOKUP,
  // these await the real retrieval promise and skip the race entirely.
  const isAuthorityCriticalRetrieval =
    ctx.issueClassification?.subIssue === "VAT_DEFINITION" ||
    String(ctx.issueClassification?.retrievalStrategy || "").includes("VAT_DEFINITION") ||
    ctx.issueClassification?.requiresAuthorityCriticalRetrieval === true;

  if (isAuthorityCriticalRetrieval) {
    console.log("[RETRIEVAL AWAIT MODE]", {
      reason:            "authority_critical",
      mode:              ctx.mode,
      subIssue:          ctx.issueClassification?.subIssue || null,
      retrievalStrategy: ctx.issueClassification?.retrievalStrategy || null
    });
  }

  const _retrievalRaw = (isSourceLookupRetrieval || isAuthorityCriticalRetrieval)
    ? await retrievalPromise
    : await Promise.race([retrievalPromise, timeoutFallbackPromise]);

  if (_retrievalWon) {
    console.log("[RETRIEVAL COMPLETED BEFORE TIMEOUT]", {
      mode:      ctx.mode,
      timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS
    });
  }

  // ── TEMP TRACE: inspect raw retrieval shape before normalization ───────────
  // Remove after retrieval audit is complete.
  console.log(
    "[RPC RAW FULL]",
    JSON.stringify(
      Array.isArray(_retrievalRaw)
        ? _retrievalRaw.slice(0, 2)
        : _retrievalRaw,
      null,
      2
    )
  );
  // ── TEMP TRACE: authority-priority layer hit distribution ─────────────────
  // Uses the real buildCompactDiagnostics() field names (no layerHits sub-object).
  if (_retrievalRaw && typeof _retrievalRaw === "object" && !Array.isArray(_retrievalRaw)) {
    const _diag = _retrievalRaw.retrievalDiagnostics;
    console.log("[AUTHORITY PRIORITY ORDER]", {
      layer1_exact:      _diag?.exactAuthorityMatches    ?? "n/a",
      layer2_citation:   _diag?.citationVariantMatches   ?? "n/a",
      layer3_metadata:   _diag?.metadataMatches          ?? "n/a",
      layer4_keyword:    _diag?.contentKeywordMatches    ?? "n/a",
      layer5_semantic:   _diag?.semanticMatches          ?? "n/a",
      layer6_fallback:   _diag?.fallbackMatches          ?? "n/a",
      supabaseFallback:  _diag?.supabaseFallbackMatches  ?? "n/a",
      wrapperAuthorityHits: _uniqueAuthorityCandidates.size,
      wrapperSemanticHits:  _semanticHits,
      totalCandidates:   Array.isArray(_retrievalRaw.retrievedSources)
        ? _retrievalRaw.retrievedSources.length : "n/a"
    });
  }
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  // ── Retrieval contract normalizer ─────────────────────────────────────────
  // retrieveRelevantSources() returns an object { retrievedSources, sources, … }.
  // The timeout fallback returns [].  All downstream consumers (reranker,
  // renderer, compliance gate) require ctx.retrievedChunks to be a plain array.
  if (Array.isArray(_retrievalRaw)) {
    ctx.retrievedChunks      = _retrievalRaw;
    ctx.retrievalMeta        = null;
    ctx.retrievalDiagnostics = null;
  } else if (_retrievalRaw && typeof _retrievalRaw === "object") {
    const _chunks =
      Array.isArray(_retrievalRaw.retrievedSources) ? _retrievalRaw.retrievedSources :
      Array.isArray(_retrievalRaw.sources)           ? _retrievalRaw.sources          :
      Array.isArray(_retrievalRaw.results)            ? _retrievalRaw.results           :
      null;
    if (_chunks === null) {
      console.warn("[PIPELINE] Step 5: retrieval result has no recognizable source array — normalizing to []");
      ctx.retrievedChunks = [];
    } else {
      ctx.retrievedChunks = _chunks;
    }
    ctx.retrievalMeta        = _retrievalRaw;
    ctx.retrievalDiagnostics = _retrievalRaw.retrievalDiagnostics || null;
  } else {
    console.warn("[PIPELINE] Step 5: retrieval returned malformed data — normalizing to []");
    ctx.retrievedChunks      = [];
    ctx.retrievalMeta        = null;
    ctx.retrievalDiagnostics = null;
  }

  trace.steps.push({ step: 5, name: "retrieval", chunksFound: ctx.retrievedChunks.length, done: true });

  // ── TEMP TRACE: Stage 1-3 — retrieval output + authority distribution ──────
  // Remove after retrieval audit is complete.
  console.log("[RPC RAW COUNT]", {
    rawType:          typeof _retrievalRaw,
    isArray:          Array.isArray(_retrievalRaw),
    chunksNormalized: ctx.retrievedChunks.length,
    retrievedKey:     Array.isArray(_retrievalRaw?.retrievedSources)
      ? _retrievalRaw.retrievedSources.length : "n/a",
    sourcesKey:       Array.isArray(_retrievalRaw?.sources)
      ? _retrievalRaw.sources.length : "n/a"
  });
  if (ctx.retrievedChunks.length > 0) {
    const _s = ctx.retrievedChunks[0];
    console.log("[RPC SAMPLE]", {
      id:            _s.id ?? null,
      authorityType: _s.authorityType || _s.authority_type || "MISSING",
      title:         (_s.title || _s.document_title || "?").slice(0, 80),
      hasText:       Boolean(_s.text || _s.content),
      score:         _s.score ?? 0
    });
  }
  const _authDist = ctx.retrievedChunks.reduce((a, c) => {
    const t = c.authorityType || c.authority_type || "MISSING";
    a[t] = (a[t] || 0) + 1; return a;
  }, {});
  console.log("[AUTHORITY FILTER]", {
    total:             ctx.retrievedChunks.length,
    distribution:      _authDist,
    unknownOrMissing:  (_authDist.UNKNOWN || 0) + (_authDist.MISSING || 0)
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  // ── Step 6: Reranker ──────────────────────────────────────────────────────
  const rerankResult = rerankForTina({
    docs:               ctx.retrievedChunks,
    query,
    issueClassification: ctx.issueClassification
  });
  ctx.rerankedChunks = rerankResult?.results || rerankResult?.sources || rerankResult?.retrievedSources || [];
  // ── TEMP TRACE: Stage 5 — reranker output ─────────────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[RERANK]", {
    input:               ctx.retrievedChunks.length,
    output:              ctx.rerankedChunks.length,
    suppressWeakDefault: true,
    auditSummary: rerankResult?.audit
      ? {
          inputCount:      rerankResult.audit.inputCount,
          outputCount:     rerankResult.audit.outputCount,
          suppressedWeak:  rerankResult.audit.suppressWeakSecondary
        }
      : "no audit field"
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────
  trace.steps.push({ step: 6, name: "reranker", done: true });

  // Step 6.5: Source Availability Engine classification.
  ctx.rerankedChunks = annotateAuthorityCandidates(ctx.rerankedChunks || [], {
    issueClassification: ctx.issueClassification,
    outcomeCategory:     ctx.retrievalMeta?.outcomeCategory || ctx.retrievalMeta?.retrievalMeta?.outcomeCategory || null
  });
  ctx.sourceAvailability = classifySourceAvailability({
    annotatedCandidates:  ctx.rerankedChunks || [],
    outcomeCategory:      ctx.retrievalMeta?.outcomeCategory || ctx.retrievalMeta?.retrievalMeta?.outcomeCategory || null,
    retrievalDiagnostics: ctx.retrievalDiagnostics,
    retrievalMeta:        ctx.retrievalMeta,
    fallbackStatus:       ctx.retrievalMeta?.fallbackStatus || null
  });
  ctx.saeStatus            = ctx.sourceAvailability.saeStatus;
  ctx.eligibleCandidates   = ctx.sourceAvailability.eligibleCandidates;
  ctx.suppressedCandidates = ctx.sourceAvailability.suppressedCandidates;
  ctx.limitationRequired   = ctx.sourceAvailability.limitationRequired;
  ctx.disclosureType       = ctx.sourceAvailability.disclosureType;
  ctx.statusReason         = ctx.sourceAvailability.statusReason;
  console.log("[SOURCE AVAILABILITY]", {
    saeStatus:          ctx.saeStatus,
    reason:             ctx.statusReason,
    eligibleCount:      ctx.eligibleCandidates.length,
    suppressedCount:    ctx.suppressedCandidates.length,
    outcomeCategory:    ctx.retrievalMeta?.outcomeCategory || ctx.retrievalMeta?.retrievalMeta?.outcomeCategory || null,
    retrievalTimedOut:  Boolean(ctx.retrievalDiagnostics?.timedOut),
    limitationRequired: ctx.limitationRequired
  });
  trace.steps.push({ step: "6.5", name: "sourceAvailabilityClassification", saeStatus: ctx.saeStatus, done: true });

  // ── Step 7: Fact Pattern Reconstruction (conditional) ────────────────────
  const flags = detectQueryFlags(ctx.issueClassification, hook);
  ctx.factPattern = null;
  if (flags.isFactPattern) {
    try {
      ctx.factPattern = analyzeFactPattern(query);
    } catch (e) {
      trace.warnings.push({ step: 7, warning: `factPatternEngine: ${e.message}` });
    }
  }
  trace.steps.push({ step: 7, name: "factPattern", skipped: !flags.isFactPattern, done: true });

  // ── Step 8: Doctrinal Analysis ────────────────────────────────────────────
  ctx.doctrinalStatus = detectDoctrinalConflicts(ctx.rerankedChunks || [], {
    issueClassification: ctx.issueClassification
  });
  trace.steps.push({ step: 8, name: "doctrinalAnalysis", done: true });

  // ── Step 9: Four-Part Doctrine Test (Law 4) ───────────────────────────────
  // Semantic divergence is NOT conflict. Only all-four-parts = trueConflict.
  const docs = ctx.rerankedChunks || [];
  const trueConflicts = [];
  const limit = Math.min(docs.length, 10);
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const result = fourPartDoctrineTest(docs[i], docs[j]);
      if (result.trueConflict) trueConflicts.push(result);
    }
  }
  ctx.conflictAnalysis = {
    trueConflicts,
    count:       trueConflicts.length,
    hasConflict: trueConflicts.length > 0
  };
  trace.steps.push({ step: 9, name: "fourPartDoctrineTest", trueConflicts: trueConflicts.length, done: true });

  // ── Step 10: Transaction Characterization (conditional) ───────────────────
  ctx.transactionChar = null;
  if (flags.isTransaction) {
    try {
      ctx.transactionChar = characterizeTransaction(query);
    } catch (e) {
      trace.warnings.push({ step: 10, warning: `transactionCharEngine: ${e.message}` });
    }
  }
  trace.steps.push({ step: 10, name: "transactionChar", skipped: !flags.isTransaction, done: true });

  // ── Step 11: Evidence Evaluation (conditional: dispute | audit) ───────────
  ctx.evidenceEval = null;
  if (flags.isDispute) {
    try {
      ctx.evidenceEval = evaluateEvidence(query);
    } catch (e) {
      trace.warnings.push({ step: 11, warning: `evidenceEvalEngine: ${e.message}` });
    }
  }
  trace.steps.push({ step: 11, name: "evidenceEvaluation", skipped: !flags.isDispute, done: true });

  // ── Step 12: Risk Scoring ─────────────────────────────────────────────────
  ctx.riskScore = null;
  try {
    ctx.riskScore = scoreRisk({
      query,
      issueClassification: ctx.issueClassification,
      conflictAnalysis:    ctx.conflictAnalysis,
      evidenceEval:        ctx.evidenceEval
    });
  } catch (e) {
    trace.warnings.push({ step: 12, warning: `riskScoringEngine: ${e.message}` });
  }
  trace.steps.push({ step: 12, name: "riskScoring", done: true });

  // ── Step 12.5: Adaptive Response Plan (/ask only) ─────────────────────────
  // Selects an /ask research profile (BASIC_RESEARCH, LEGAL_INTERPRETATION, etc.)
  // and builds the rendererContract used by Steps 14–16.  No OpenAI calls here.
  ctx.responsePlan = null;
  if (hook === "/ask" || !hook) {
    try {
      ctx.responsePlan = planAdaptiveResponse({
        hook,
        query,
        issueClassification:  ctx.issueClassification,
        factPattern:          ctx.factPattern,
        transactionChar:      ctx.transactionChar,
        evidenceEvaluation:   ctx.evidenceEval,
        riskScore:            ctx.riskScore,
        conflictAnalysis:     ctx.conflictAnalysis
      });
      console.log("[ASK PROFILE]", {
        profile:   ctx.responsePlan?.askProfile,
        sections:  ctx.responsePlan?.askProfileSections?.length ?? 0,
        mode:      ctx.responsePlan?.responseMode,
        limitation: ctx.responsePlan?.mustIncludeLimitation
      });
    } catch (e) {
      trace.warnings.push({ step: "12.5", warning: `adaptiveResponsePlanner: ${e.message || e}` });
    }
  }
  trace.steps.push({ step: "12.5", name: "adaptiveResponsePlan", done: true, askProfile: ctx.responsePlan?.askProfile || null });

  // ── Step 13: Build Adaptive Master Prompt ────────────────────────────────
  ctx.promptContract = buildAdaptivePromptContract(ctx.mode, {
    issueClassification: ctx.issueClassification,
    conflictAnalysis:    ctx.conflictAnalysis,
    riskScore:           ctx.riskScore,
    factPattern:         ctx.factPattern,
    transactionChar:     ctx.transactionChar,
    responsePlan:        ctx.responsePlan
  });
  trace.steps.push({ step: 13, name: "masterPromptBuilt", done: true });

  // ── TEMP TRACE: Stage 7 — final sources entering OpenAI ───────────────────
  // Remove after retrieval audit is complete.
  console.log("[FINAL SOURCES TO MODEL]", {
    count:  (ctx.rerankedChunks || []).length,
    types:  (ctx.rerankedChunks || []).map(c => c.authorityType || "?"),
    titles: (ctx.rerankedChunks || []).map(c => (c.title || c.document_title || "?").slice(0, 60))
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  // ── Step 14: OpenAI Completion ────────────────────────────────────────────
  let openAiResult;
  try {
    openAiResult = await callOpenAIWithOrchestration({
      openai,
      model,
      query,
      userQuery:            query,
      retrievedSources:     ctx.rerankedChunks || [],
      issueClassification:  ctx.issueClassification,
      taxDomainClassification: ctx.routingMetadata,
      conflictAnalysis:     ctx.conflictAnalysis,
      systemPrompt:         ctx.promptContract?.masterPrompt,
      conversationHistory,
      mode:                 ctx.mode,
      responsePlan:         ctx.responsePlan,
      adaptiveContext: {
        activeHook:        hook,
        orchestrationMode: ctx.mode,
        responsePlan:      ctx.responsePlan
      },
      _traceId:             traceId
    });
  } catch (e) {
    const label = `OpenAI step-14 error [${e?.name || e?.constructor?.name}] status=${e?.status} code=${e?.code}: ${e?.message}`;
    trace.warnings.push({ step: 14, warning: label });
    throw new Error(label);
  }
  ctx.rawAnswer    = openAiResult?.answer || "";
  ctx.orchestration = openAiResult?.orchestration || {};
  trace.steps.push({ step: 14, name: "openAiCompletion", done: true });

  // Refine rendering mode from the orchestration engine's determineMode() result.
  // ctx.mode (Step 2) reflects only the hook type (e.g. "STANDARD_TAX_MODE" for /ask).
  // The orchestration engine analyzes query intent and returns a specific rendering
  // mode: FAST_DEFINITION for "what is VAT?", LEGAL_ANALYSIS for doctrinal queries, etc.
  // Specialized hook modes (QUIZ_MODE, REVIEWER_MODE, etc.) are pinned and must not
  // be overridden by orchestration inference.
  const PINNED_HOOK_MODES = new Set([
    "QUIZ_MODE", "REVIEWER_MODE", "CASE_ANALYSIS", "SOURCE_LOOKUP",
    "SENIOR_COUNSEL_MEMO", "COMPLEX_ADVISORY"
  ]);
  const orchestrationRefinedMode = ctx.orchestration?.mode;
  if (orchestrationRefinedMode && !PINNED_HOOK_MODES.has(ctx.mode)) {
    console.log(`[TINA MODE] Refining ctx.mode from '${ctx.mode}' → '${orchestrationRefinedMode}' (orchestration)`);
    ctx.mode = orchestrationRefinedMode;
  }
  ctx.responseStyle = ctx.orchestration?.responseStyle || null;
  // isAskMode: plain queries (no explicit hook) are rendering-equivalent to /ask.
  // Renderer selection must rely on ctx.mode, not raw hook string detection.
  const isAskMode = !hook || hook === "/ask";
  if (ctx.mode !== "FAST_DEFINITION" || !isAskMode) {
    if (ctx.responseStyle) {
      console.log(`[MODE ISOLATION] responseStyle cleared: hook=${hook} mode=${ctx.mode}`);
    }
    ctx.responseStyle = null;
  }

  // ── Step 15: Format Answer ────────────────────────────────────────────────
  ctx.formattedAnswer = renderTinaAnswer({
    answer:              ctx.rawAnswer,
    sources:             ctx.rerankedChunks || [],
    includeSources:      false,  // sourceCards chip-rendered by frontend; no duplicate text block
    issueClassification: ctx.issueClassification,
    mode:                ctx.mode,
    responsePlan:        ctx.responsePlan,
    conflict:            ctx.conflictAnalysis?.hasConflict ? ctx.conflictAnalysis : null
  });
  trace.steps.push({ step: 15, name: "answerRenderer", done: true });

  // ── Step 16: Final Compliance Validation ──────────────────────────────────
  const compliantResult = enforceFinalAnswerCompliance({
    draftAnswer:         ctx.formattedAnswer,
    sources:             ctx.rerankedChunks || [],
    retrievedSources:    ctx.rerankedChunks || [],
    conflicts:           ctx.conflictAnalysis?.trueConflicts || [],
    issueClassification: ctx.issueClassification,
    mode:                ctx.mode,
    responsePlan:        ctx.responsePlan,
    query
  });
  trace.steps.push({ step: 16, name: "finalAnswerCompliance", done: true });

  // ── Step 17: Presentation Transform (FAST_DEFINITION only) ─────────────────
  // Converts validated structured output to conversational paragraphs.
  // Compliance gate output is preserved as fallback if section parsing fails.
  // Strip "Validated Indexed Sources" appendix added by final-answer-compliance —
  // the frontend renders sourceCards as chips; text source lists are redundant.
  const rawFinalAnswer = (compliantResult?.finalAnswer || compliantResult?.answer || ctx.formattedAnswer)
    .replace(/\n+Validated Indexed Sources[\s\S]*$/i, "")
    .trim();
  // FAST_DEFINITION conversational rendering only fires when no /ask profile
  // is active — /ask profiles use their own section headings and must not be
  // reparsed by the FAST_DEFINITION paragraph converter.
  const finalAnswer = (ctx.mode === "FAST_DEFINITION" && isAskMode && !ctx.responsePlan?.askProfile)
    ? renderFastDefinitionConversational(rawFinalAnswer, query, ctx.responseStyle)
    : rawFinalAnswer;

  // ── Stage 2C: Educational sources (FAST_DEFINITION ask-mode only) ────────
  const educationalSources =
    (isAskMode && ctx.mode === "FAST_DEFINITION")
      ? buildEducationalSources(ctx.rerankedChunks, ctx.responseStyle, query)
      : null;

  // Build provision-aware source cards with dedup.
  // Title = canonical authority label only (e.g. "NIRC Sec. 105", "RR No. 16-2005").
  // Raw filename / documentTitle is preserved in the documentTitle field.
  // Dedup key = provision reference, so each distinct section gets one card;
  // multiple chunks of the same section are collapsed to the first one.
  // This is semantically distinct from educationalSources (Learn More) which
  // groups at document level — same PDF appears in both but with different labels.
  //
  // Priority model (replaces Gate 3 exclusive whitelist):
  //   • Gate 1 (contamination) and Gate 2 (consistency) are hard blocks.
  //   • targetAuthorities is a RANKING signal, not a mandatory whitelist.
  //   • Retrieved, issue-relevant implementing regs (e.g. RR 2-98 for EWT) that
  //     are absent from targetAuthorities still appear as chips — just sorted after
  //     explicitly targeted authorities.
  //   • After collecting up to CANDIDATE_CAP unique candidates, sort target-matched
  //     cards first (preserving reranker order within each group), then slice to 5.
  const CANDIDATE_CAP  = 15; // collect more before priority-sort; final slice is 5
  const _scSeen        = new Map();
  const targetAuths    = ctx.issueClassification?.targetAuthorities || [];
  const hasTargetAuthorities = targetAuths.length > 0;
  // Skip counters — aggregated into a single structured log after the loop.
  const _scSkip = { contamination: 0, consistency: 0, issueRelevance: 0 };
  const _scSkipIssueDetail = [];   // up to 5 rejected non-target provRef values
  const isSourceLookupMode = String(ctx.mode || "").toUpperCase() === "SOURCE_LOOKUP";

  for (const c of (ctx.rerankedChunks || [])) {
    if (_scSeen.size >= CANDIDATE_CAP) break;

    // Identity derivation — computed before Gate 1 so sourcePathAuthorityHit can
    // protect RR/RMC/RMO/RAMO chunks whose normalized_reference was corrupted at
    // index time (e.g. "NIRC Sec. 4" written into an RR 16-2005 chunk).
    const linkedType = inferLinkedSourceType(c);
    let provRef = resolveSourceCardDisplayRef(c, linkedType);   // `let` — may be promoted below

    // True when this is a SOURCE_LOOKUP query and the chunk is a well-formed
    // RR/RMC/RMO/RAMO card whose source path unambiguously identifies the issuance.
    // Exempts such chunks from Gate 1 contamination and Gate 3 issue-relevance
    // rejection that was triggered by a stale/malformed normalized_reference.
    const sourcePathAuthorityHit =
      isSourceLookupMode &&
      ["RR", "RMC", "RMO", "RAMO"].includes(linkedType) &&
      Boolean(provRef) &&
      sourceCardIsConsistent(provRef, linkedType);

    // Gate 1 (contamination): hard-blocks cross-domain chunks flagged by reranker
    // as BOTH off-target AND issue-mismatched (the strictest reranker signal).
    // sourcePathAuthorityHit exempts correctly-identified RR/RMC/RMO/RAMO cards in
    // SOURCE_LOOKUP — their source path is authoritative even when normalized_reference
    // misled the reranker.
    if (
      !sourcePathAuthorityHit &&
      hasTargetAuthorities &&
      c.targetAuthorityMatch === false &&
      c.issueMismatch === true
    ) {
      _scSkip.contamination++;
      continue;
    }

    if (!c.title && !c.document_title && !c.source && !c.originalSource) continue;

    // Gate 0 (visibility): hidden/reviewer-only materials must not appear as source
    // chips outside reviewer/quiz modes.  Mirrors the same gate in filterVisibleSources().
    if (shouldHideSource(c, ctx.issueClassification)) continue;

    // Gate 2 (consistency): NIRC labels must link to NIRC/statute documents, etc.
    if (provRef && !sourceCardIsConsistent(provRef, linkedType)) {
      _scSkip.consistency++;
      continue;
    }

    // Priority signal: does this chunk canonically match a target authority?
    // Non-matching chunks are not immediately rejected — they become lower-priority
    // candidates if they also pass Gate 3 (issue relevance) below.
    let _isTargetMatch = !hasTargetAuthorities; // no targets → everything is "matched"
    if (hasTargetAuthorities) {
      if (provRef) {
        _isTargetMatch = isTargetAllowedCard(provRef, linkedType, targetAuths);
      } else {
        // Try to boost unlabeled chunk with a target-safe label.
        // If found, promote provRef and mark as target-matched.
        // If not found, chunk still passes as a lower-priority candidate (Gate 3 decides).
        const _safeRef = deriveTargetSafeDocumentRef(c, linkedType, targetAuths);
        if (_safeRef) {
          provRef       = _safeRef;
          _isTargetMatch = true;
        }
      }
    }

    // Gate 3 (issue relevance): non-target candidates must have affirmative
    // issue relevance according to the reranker's issueClassificationMatch.matched
    // signal.  This blocks VAT-domain chunks (NIRC Sec. 106, RMC 65-2012) from
    // appearing as chips in an EWT query, while still allowing retrieved
    // implementing regs whose doc issues genuinely overlap with the query
    // (e.g. RR 2-98 for EWT, RMC 65-2012 for condo-dues VAT queries).
    //
    // Target-matched chunks bypass this gate — they were explicitly requested by
    // the issue classifier and are always relevant by definition.
    // sourcePathAuthorityHit also bypasses — the source path is more reliable than
    // the reranker's issue-match signal when normalized_reference is corrupted.
    if (!_isTargetMatch && !sourcePathAuthorityHit) {
      const _rel = isIssueRelevantSourceCardCandidate(c);
      if (!_rel.allowed) {
        _scSkip.issueRelevance++;
        if (_scSkipIssueDetail.length < 5) {
          _scSkipIssueDetail.push({ ref: provRef || "(no-ref)", reason: _rel.reason });
        }
        continue;
      }
    }

    // Guard: when no issuance label was derived (provRef still ""), validate any
    // DB-stored normalizedReference against the actual linkedType before allowing it
    // to become the chip label.  Without this check, a chunk whose DB field says
    // normalizedReference="NIRC Sec. 4" but whose linkedType is "RR" would produce
    // a chip labeled "NIRC Sec. 4" that opens an RR PDF.
    //
    // Only fires when linkedType is known — unknown types (linkedType="") fall through
    // so that legitimate DB labels are still inherited when we have no counter-evidence.
    if (!provRef && linkedType) {
      const _cMeta  = c.metadata || {};
      const _dbRef  =
        c.normalizedReference || c.normalized_reference ||
        _cMeta.normalizedReference || _cMeta.normalized_reference || "";
      if (_dbRef) {
        const _dbLabelType = sourceCardLabelType(_dbRef);
        if (_dbLabelType && !sourceCardIsConsistent(_dbRef, linkedType)) {
          _scSkip.consistency++;
          continue;
        }
      }
    }

    const docTitle = sourceCardDocumentTitle(c);

    // Dedup: canonical authority key (strips "No.", punctuation, separators) so that
    // variant encodings of the same issuance (RR No. 16-2005 / RR_16_2005 / rr-16-2005)
    // all collapse to one card ("rr162005").  Falls back to raw docTitle+chunk for
    // sources without any issuance signal.
    const dedupeKey = provRef
      ? canonicalSourceKey(provRef)
      : (docTitle + "|" + String(c.chunk_index || c.id || "")).toLowerCase().slice(0, 60);

    const meta = c.metadata || {};
    const url  =
      c.driveViewUrl    || c.drive_view_url    ||
      c.url             || c.webViewLink        ||
      c.web_view_link   || c.sourceUrl          ||
      c.source_url      ||
      meta.driveViewUrl || meta.drive_view_url  ||
      meta.url          || meta.webViewLink      ||
      meta.web_view_link || meta.sourceUrl       ||
      meta.source_url   || "";

    if (_scSeen.has(dedupeKey)) continue;

    _scSeen.set(dedupeKey, {
      _targetMatch:        _isTargetMatch,  // priority tag — stripped before output
      title:               provRef || docTitle || "Source",
      citation:            provRef || c.citation || "",
      authorityType:       c.authorityType || c.authority_type || "UNKNOWN",
      driveViewUrl:        url,
      drive_view_url:      url,
      url,
      webViewLink:         c.webViewLink   || meta.webViewLink   || "",
      web_view_link:       c.web_view_link || meta.web_view_link || "",
      sourceUrl:           c.sourceUrl     || c.source_url       || meta.sourceUrl || meta.source_url || "",
      source_url:          c.source_url    || meta.source_url    || "",
      documentTitle:       c.document_title || c.documentTitle   || meta.documentTitle || docTitle || "",
      document_title:      c.document_title || meta.documentTitle || "",
      normalizedReference: provRef || c.normalizedReference || c.normalized_reference || meta.normalizedReference || "",
      normalized_reference: provRef || c.normalized_reference || meta.normalizedReference || "",
      reference:           c.reference || "",
      source:              c.source    || "",
      linkedSourceType:    linkedType,
      excerpt:             String(c.text || c.content || "").slice(0, 300)
    });
  }

  // Sort: target-matched candidates first (reranker order preserved within group),
  // then non-target candidates.  Slice to 5 visible chips.
  const _scCandidateArray = [..._scSeen.values()];
  const _scTargetMatched  = _scCandidateArray.filter(v =>  v._targetMatch);
  const _scNonTarget      = _scCandidateArray.filter(v => !v._targetMatch);
  const _scSorted         = [..._scTargetMatched, ..._scNonTarget];

  console.log("[SOURCE CARD CANDIDATES]", {
    total:              _scCandidateArray.length,
    targetMatched:      _scTargetMatched.length,
    nonTarget:          _scNonTarget.length,
    skipContamination:  _scSkip.contamination,
    skipConsistency:    _scSkip.consistency,
    skipIssueRelevance: _scSkip.issueRelevance,
    targetMatched_labels: _scTargetMatched.map(v => v.normalizedReference || v.title || "?"),
    nonTarget_labels:     _scNonTarget.map(v => v.normalizedReference || v.title || "?").slice(0, 5),
    ...(_scSkipIssueDetail.length > 0 && { rejectedByIssue: _scSkipIssueDetail })
  });

  const _scFiltered = _scSorted.slice(0, 5);
  // Strip internal priority tag before passing to sanitizer / outbound response.
  // eslint-disable-next-line no-unused-vars
  const _scFilteredClean = _scFiltered.map(({ _targetMatch, ...card }) => card);

  console.log("[SOURCE CARD FILTERED]", {
    count:  _scFilteredClean.length,
    labels: _scFilteredClean.map(v => v.normalizedReference || v.title || "?")
  });

  // Non-empty safety fallback ─────────────────────────────────────────────────
  // Fires only when the main loop produced zero candidates (all chunks rejected
  // by Gates 1–3, or rerankedChunks is empty).  Applies the same three gates as
  // the main loop so fallback cannot reintroduce chunks that Gate 3 already
  // rejected (e.g. NIRC Sec. 106/107 or RMC 65-2012 for an EWT query).
  if (_scFilteredClean.length === 0) {
    const _fbCandidates = (ctx.rerankedChunks || []).filter(c => {
      if (!c.title && !c.document_title && !c.source && !c.originalSource) return false;
      // Gate 0 (visibility): mirrors the gate in the primary loop.
      if (shouldHideSource(c, ctx.issueClassification)) return false;
      // Derive identity here so sourcePathAuthorityHit can protect Gate 1 and Gate 3
      // (mirrors the main loop restructuring above).
      const _fbLType = inferLinkedSourceType(c);
      const _fbRef   = resolveSourceCardDisplayRef(c, _fbLType);
      const _fbSourcePathAuthorityHit =
        isSourceLookupMode &&
        ["RR", "RMC", "RMO", "RAMO"].includes(_fbLType) &&
        Boolean(_fbRef) &&
        sourceCardIsConsistent(_fbRef, _fbLType);
      // Gate 1: explicit contamination
      if (
        !_fbSourcePathAuthorityHit &&
        hasTargetAuthorities &&
        c.targetAuthorityMatch === false &&
        c.issueMismatch === true
      ) return false;
      // Gate 3: issue relevance for non-target chunks (mirrors main loop)
      if (!c.targetAuthorityMatch && !_fbSourcePathAuthorityHit) {
        const _rel = isIssueRelevantSourceCardCandidate(c);
        if (!_rel.allowed) return false;
      }
      return true;
    });
    if (_fbCandidates.length > 0) {
      for (const c of _fbCandidates) {
        const _fbLType    = inferLinkedSourceType(c);
        const _fbRef      = resolveSourceCardDisplayRef(c, _fbLType) ||
                            deriveTargetSafeDocumentRef(c, _fbLType, targetAuths) || "";
        const _fbDocTitle = sourceCardDocumentTitle(c);
        const _fbKey      = _fbRef
          ? canonicalSourceKey(_fbRef)
          : (_fbDocTitle + "|" + String(c.chunk_index || c.id || "")).toLowerCase().slice(0, 60);
        if (!_fbKey) continue;
        if (_scFilteredClean.some(x =>
          x.normalizedReference && canonicalSourceKey(x.normalizedReference) === _fbKey
        )) continue;
        const _fbMeta = c.metadata || {};
        const _fbUrl  =
          c.driveViewUrl  || c.drive_view_url  || c.url          || c.webViewLink  ||
          c.web_view_link || c.sourceUrl       || c.source_url   ||
          _fbMeta.driveViewUrl || _fbMeta.drive_view_url || _fbMeta.url ||
          _fbMeta.webViewLink  || _fbMeta.web_view_link  ||
          _fbMeta.sourceUrl    || _fbMeta.source_url     || "";
        _scFilteredClean.push({
          title:               _fbRef || _fbDocTitle || "Source",
          citation:            _fbRef || c.citation || "",
          authorityType:       c.authorityType || c.authority_type || "UNKNOWN",
          driveViewUrl:        _fbUrl,
          drive_view_url:      _fbUrl,
          url:                 _fbUrl,
          webViewLink:         c.webViewLink  || _fbMeta.webViewLink  || "",
          web_view_link:       c.web_view_link || _fbMeta.web_view_link || "",
          sourceUrl:           c.sourceUrl    || c.source_url || _fbMeta.sourceUrl || _fbMeta.source_url || "",
          source_url:          c.source_url   || _fbMeta.source_url || "",
          documentTitle:       c.document_title || _fbMeta.document_title || _fbDocTitle || "",
          document_title:      c.document_title || _fbMeta.document_title || "",
          normalizedReference: _fbRef || c.normalizedReference || c.normalized_reference || _fbMeta.normalizedReference || "",
          normalized_reference: _fbRef || c.normalized_reference || _fbMeta.normalizedReference || "",
          reference:           c.reference || "",
          source:              c.source    || "",
          linkedSourceType:    _fbLType,
          excerpt:             String(c.text || c.content || "").slice(0, 300)
        });
        if (_scFilteredClean.length >= 5) break;
      }
      console.warn("[SOURCE CARDS FALLBACK]", {
        reason:     "main loop 0 candidates; rebuilt applying Gates 1+3 (no target whitelist)",
        produced:   _scFilteredClean.length,
        candidates: _fbCandidates.length,
        labels:     _scFilteredClean.map(v => v.normalizedReference || v.title || "?").slice(0, 6)
      });
    }
  }

  // Final outbound sanitizer: re-check each card's label↔document-type consistency.
  // Relabels or drops cards that slipped through earlier gates (e.g. a card with
  // normalizedReference="NIRC Sec. 4" whose source field identifies it as RR).
  const sourceCards = sanitizeOutboundSourceCards(_scFilteredClean, targetAuths);

  // Diagnostic log — shows the exact array that will be sent as result.sourceCards.
  // Each entry shows the chip label (ref), document type (type), source identity field
  // (src — what the sanitizer uses to re-derive type), and whether a clickable URL exists.
  console.log("[SOURCE CARDS FINAL]", {
    count:      sourceCards.length,
    targetAuths: targetAuths.slice(0, 8),
    cards: sourceCards.map(c => ({
      ref:    c.normalizedReference || c.citation || "(none)",
      type:   c.linkedSourceType   || "",
      src:    c.source             || c.document_title || "(none)",
      hasUrl: Boolean(c.driveViewUrl || c.drive_view_url || c.url)
    }))
  });

  // ── Stage 1: Source Authority Selector — active selection (runs BEFORE DSF) ──
  // SAS is now the active Single Source of Truth for authority-priority ordering.
  // It selects and orders cards from the reranked pool by:
  //   Tier 1 exact controlling authorities (classifier order)
  //   →  Tier 2 range members  →  Tier 1 supporting  →  Tier 3/4 generic
  // Never throws; exceptions returned in diagnostics.error.
  const _sasResult = selectSourceAuthorities({
    rerankedChunks:      ctx.rerankedChunks || [],
    issueClassification: ctx.issueClassification || {},
    query,
    answerText:          finalAnswer || "",
    mode:                ctx.mode   || "",
    maxSources:          5
  });
  trace._sourceAuthoritySelectorDiagnostics = _sasResult.diagnostics;

  // Gate 0 on SAS cards: shouldHideSource is not called inside SAS, so apply it here.
  const _sasVisible = (_sasResult.visibleSourceCards || [])
    .filter(c => !shouldHideSource(c, ctx.issueClassification));

  if (!_sasResult.diagnostics.error) {
    console.log("[SAS ACTIVE]", {
      version:        _sasResult.diagnostics.selectorVersion,
      inspected:      _sasResult.diagnostics.totalChunksInspected,
      accepted:       _sasResult.diagnostics.accepted,
      rejected:       _sasResult.diagnostics.rejected,
      visible:        _sasVisible.length,
      selectorLabels: _sasResult.diagnostics.selectorLabels
    });
  } else {
    console.warn("[SAS ERROR] (non-blocking):", _sasResult.diagnostics.error);
  }

  // ── Direct-support display filter ────────────────────────────────────────────
  // DSF is a display-safety filter — it does NOT determine authority priority order.
  // When SAS produced authority-ordered cards, DSF operates on that ordered list.
  // When SAS produced nothing, DSF falls back to the pipeline loop's sourceCards.
  // HARD RULE: only controls what is DISPLAYED; does not touch retrieval / LLM context.
  const _dsfInput = _sasVisible.length > 0 ? _sasVisible : sourceCards;
  const {
    displayedSources: _dsFiltered,
    diagnostics:      _dsDiag
  } = filterDisplayedSourcesByDirectSupport({
    candidateSources:    _dsfInput,
    answerText:          finalAnswer,
    issueClassification: ctx.issueClassification,
    query,
    legalBasisText:      "",
    keyTerms:            [],
    mode:                ctx.mode,
    hook
  });
  console.log("[DIRECT SUPPORT FILTER]", _dsDiag);

  // ── Final source card resolution ──────────────────────────────────────────────
  // SAS is primary; DSF is a display safety filter.
  // Key invariant: Tier 1 exact controlling authorities selected by SAS cannot be
  // suppressed by a partial DSF result.  They are restored at the front before cap.
  let finalSourceCards;
  if (_sasVisible.length > 0) {
    if (_dsFiltered.length > 0) {
      // Restore any Tier 1 exact controlling authority cards that DSF dropped.
      // These are the classifier's highest-confidence authorities (exact provision
      // match) and must appear regardless of DSF answer-text proximity scoring.
      const _dsKeys = new Set(
        _dsFiltered
          .map(c => canonicalSourceKey(c.normalizedReference || c.citation || ""))
          .filter(Boolean)
      );
      // Restore exact authority cards (authorityMatchTier === 1) that DSF dropped.
      // This covers both exact controlling authorities (e.g. "NIRC Sec. 84") AND
      // exact supporting authorities (e.g. "RR No. 16-2005" for VAT).  Both are
      // Tier 1 exact matches against the classifier's authority plan and must not
      // be suppressed by DSF's answer-text proximity scoring.
      const _tier1Dropped = _sasVisible.filter(c => {
        const k = canonicalSourceKey(c.normalizedReference || c.citation || "");
        return k && Number(c.authorityMatchTier || 4) === 1 && !_dsKeys.has(k);
      });
      if (_tier1Dropped.length > 0) {
        // Prepend restored exact-authority cards (in SAS order), then DSF cards.
        const _restoreSeen = new Set();
        finalSourceCards = [..._tier1Dropped, ..._dsFiltered]
          .filter(c => {
            const k = canonicalSourceKey(c.normalizedReference || c.citation || "") ||
                      ((c.documentTitle || "") + "|" + (c.source || "")).toLowerCase().slice(0, 60);
            if (_restoreSeen.has(k)) return false;
            _restoreSeen.add(k);
            return true;
          })
          .slice(0, 5);
        console.log("[SAS EXACT AUTHORITY RESTORED]", {
          restored: _tier1Dropped.map(c => c.normalizedReference || c.citation || "?"),
          dsfKept:  _dsFiltered.length,
          final:    finalSourceCards.length
        });
      } else {
        finalSourceCards = _dsFiltered;
      }
    } else {
      // DSF dropped all cards — use SAS output directly (authority-priority ordered).
      finalSourceCards = _sasVisible.slice(0, 5);
      console.log("[SAS FALLBACK ACTIVATED]", {
        reason:  "direct_support_filter_dropped_all_cards",
        count:   finalSourceCards.length,
        labels:  finalSourceCards.map(c => c.normalizedReference || c.citation || "?")
      });
    }
  } else {
    // SAS found nothing — preserve existing DSF behavior as last resort.
    finalSourceCards = _dsFiltered;
  }
  // ── End Stage 1 ──────────────────────────────────────────────────────────────

  // ── Source Availability Classification ────────────────────────────────────────
  // Step 6.5 already classified source availability before prompt assembly.
  // This wrapper preserves legacy response fields without recalculating status.
  const _sourceAvail = {
    ...ctx.sourceAvailability,
    sourceAvailability:       ctx.saeStatus,
    sourceStatus:             ctx.saeStatus,
    sourceAvailabilityReason: ctx.statusReason,
    retrievalTimedOut:        Boolean(ctx.retrievalDiagnostics?.timedOut),
    retrievedSourceCount:     ctx.rerankedChunks?.length || 0,
    displayedSourceCount:     finalSourceCards.length,
    relatedSourceCount:       ctx.saeStatus === "RELATED_AUTHORITY_ONLY" ? ctx.suppressedCandidates?.length || 0 : 0
  };

  // Apply mode-specific answer modifications based on source availability.
  // finalAnswer is const; _outputAnswer holds the post-modification result.
  let _outputAnswer = finalAnswer;
  const _isLearningMode =
    String(ctx.mode || "").toUpperCase() === "REVIEWER_MODE" ||
    String(ctx.mode || "").toUpperCase() === "QUIZ_MODE";

  if (_sourceAvail.sourceAvailability === "SOURCE_LOOKUP_EMPTY") {
    // /source: return deterministic message, no general answer.
    _outputAnswer = "Indexed source not found. I could not locate this authority in TINA's indexed knowledge base.";
  } else if (_isLearningMode && _sourceAvail.sourceAvailability !== "AUTHORITY_FOUND") {
    // /review and /quiz: no grounded source available — guard only; these hooks
    // normally route through learningHandler, not pipeline.
    _outputAnswer = "No grounded source available.";
  } else {
    _outputAnswer = prependSourceAvailabilityWarning(
      _outputAnswer,
      _sourceAvail.sourceAvailability,
      ctx.mode,
      hook
    );
  }
  // ── End Source Availability ───────────────────────────────────────────────────

  endTrace({
    traceId,
    metadata: {
      mode:              ctx.mode,
      primaryIssue:      ctx.issueClassification?.primaryIssue || null,
      sourceCount:       ctx.rerankedChunks?.length || 0,
      trueConflicts:     ctx.conflictAnalysis?.count || 0,
      riskLevel:         ctx.riskScore?.level || null,
      warnings:          trace.warnings.length,
      pipelineLatencyMs: Date.now() - pipelineStartMs
    }
  });

  // Flush all queued Langfuse observations before the HTTP response is sent.
  // Without this, the SDK's background timer (flushInterval) may fire after
  // the response is returned, causing observations to appear empty in the UI.
  // Capped at 2 s so a slow Langfuse API never delays TINA's answer.
  await Promise.race([
    flushObservability(),
    new Promise(resolve => setTimeout(resolve, 2000))
  ]);

  return {
    answer:                           _outputAnswer,
    sources:                          ctx.rerankedChunks || [],
    sourcesUsed:                      ctx.rerankedChunks || [],
    sourceCards:                      finalSourceCards,
    sourceCardsDirectSupportFiltered: true,
    retrievedSourceCount:             ctx.rerankedChunks?.length || 0,
    displayedSourceCount:             finalSourceCards.length,
    saeStatus:                        ctx.saeStatus,
    sourceAvailabilityMetadata:       ctx.sourceAvailability,
    eligibleCandidates:               ctx.eligibleCandidates,
    suppressedCandidates:             ctx.suppressedCandidates,
    limitationRequired:               ctx.limitationRequired,
    disclosureType:                   ctx.disclosureType,
    statusReason:                     ctx.statusReason,
    sourceAvailability:               _sourceAvail.sourceAvailability,
    sourceStatus:                     _sourceAvail.sourceStatus,
    sourceAvailabilityReason:         _sourceAvail.sourceAvailabilityReason,
    retrievalTimedOut:                _sourceAvail.retrievalTimedOut,
    relatedSourceCount:               _sourceAvail.relatedSourceCount,
    educationalSources,
    issueClassification: ctx.issueClassification,
    conflictAnalysis:    ctx.conflictAnalysis,
    riskScore:           ctx.riskScore,
    orchestration:       ctx.orchestration,
    mode:                ctx.mode,
    orchestrationMode:   ctx.mode,
    responseMode:        ctx.mode,
    pipelineVersion:     PIPELINE_VERSION,
    traceId,
    trace
  };
}

export function pipelineHealthCheck() {
  return {
    ok:      true,
    version: PIPELINE_VERSION,
    steps:   16,
    laws:    ["LAW_1_PIPELINE_SUPREMACY", "LAW_2_SOURCE_HIERARCHY", "LAW_3_ISSUE_TARGETED_RETRIEVAL", "LAW_4_FOUR_PART_DOCTRINE_TEST"]
  };
}

export default { runPipeline, fourPartDoctrineTest, pipelineHealthCheck, PIPELINE_VERSION };
