// FILE: services/source-authority-selector.js
"use strict";

/**
 * Source Authority Selector — Stage 1: Passive Diagnostic
 * Version: 1.0.0-diagnostic
 *
 * Inspects existing reranked chunks and produces a candidate source selection
 * for diagnostic comparison only.  Does NOT affect visible source chips, answer
 * context, prompt construction, or any part of normal pipeline behavior.
 *
 * The selector replicates the same gate logic as the pipeline.js source-card
 * loop (Gates 1–3 + priority sort + outbound sanitizer) so that its output can
 * be compared side-by-side with the current sourceCards.  Any divergence is
 * surfaced in the diagnostics object.
 *
 * Exported API:
 *   selectSourceAuthorities(input) → { validatedSources, visibleSourceCards, diagnostics }
 *
 * Input fields:
 *   rerankedChunks      – ctx.rerankedChunks from pipeline
 *   issueClassification – ctx.issueClassification
 *   query               – original user query string
 *   answerText          – generated answer (reserved for Stage 2 answer-support scoring)
 *   mode                – pipeline mode string (e.g. "FULL", "FAST_DEFINITION")
 *   maxSources          – visible chip cap (default 5)
 *   currentSourceCards  – existing sourceCards from pipeline, for diff comparison
 *
 * Stage 2 note:
 *   answerText is accepted but not yet used.  Stage 2 will add answer-support
 *   overlap scoring (excerpt ↔ answer text) as an additional relevance signal.
 *
 * Safety: All errors are caught and returned inside diagnostics.error.
 *   A thrown exception never reaches the caller.
 */

import {
  canonicalSourceKey,
  inferIssuanceNumber
} from "../source-visibility-engine.js";

const SELECTOR_VERSION = "1.0.0-diagnostic";
const DEFAULT_CANDIDATE_CAP = 15;
const DEFAULT_MAX_VISIBLE    = 5;

// ─── Pure helpers (mirrors pipeline.js; no side-effects) ─────────────────────

function safeStr(v) {
  return typeof v === "string" ? v : String(v == null ? "" : v);
}

function sourceCardBasename(value = "") {
  return safeStr(value).replace(/^.*[/\\]/, "");
}

function sourceCardIdentityBlob(c = {}) {
  const meta = c.metadata || {};
  return [
    c.issuanceNumber, c.displayTitle, c.sourceTitle, c.source_title,
    c.document_title, c.documentTitle, c.source,
    c.originalSource, c.original_source, c.path, c.source_path,
    meta.documentTitle, meta.document_title, meta.originalFileName,
    meta.original_file_name, meta.originalSource, meta.path, meta.source_path
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
  const prefix  = safeStr(type).toUpperCase();
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
  const meta           = c.metadata || {};
  const identityBlob   = sourceCardIdentityBlob(c);
  const normalizedRef  =
    c.normalizedReference || c.normalized_reference ||
    meta.normalizedReference || meta.normalized_reference || "";

  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    return inferAdministrativeRef(identityBlob, linkedType);
  }

  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    const nircExtra = [
      c.title, c.sectionHeading, c.section_heading, c.sectionTitle, c.section_title,
      String(c.text || c.content || "").slice(0, 500)
    ].filter(Boolean).join(" ");
    const nircBlob = [normalizedRef, c.citation, c.reference, identityBlob, nircExtra]
      .filter(Boolean).join(" ");
    const direct = nircBlob.match(/\b(?:NIRC|Tax Code)\s+Sec(?:tion)?\.?\s*(\d+[A-Z]?)\b/i);
    if (direct) return `NIRC Sec. ${direct[1]}`;
    const normalizedMatch = nircBlob.match(/\b(?:NIRC|TAX_CODE)_SEC_(\d+[A-Z]?)\b/i);
    if (normalizedMatch) return `NIRC Sec. ${normalizedMatch[1]}`;
    const bare = nircBlob.match(/\bSec(?:tion)?\.?\s+(\d{1,3}[A-Z]?)\b/i);
    if (bare) return `NIRC Sec. ${bare[1]}`;
    return "Tax Code";
  }

  if (linkedType === "RA") {
    const match = identityBlob.match(/\bRA[-\s_]*(?:No\.?)?[-\s_]*(\d{4,6})\b/i);
    if (match) return `RA No. ${match[1]}`;
  }

  // Fallback: use inferIssuanceNumber from source-visibility-engine (no normalizedRef override)
  return inferIssuanceNumber({
    ...c,
    title:               "",
    normalizedReference: "",
    normalized_reference: "",
    metadata: {
      ...meta,
      normalizedReference:  "",
      normalized_reference: ""
    }
  });
}

function sourceCardLabelType(label = "") {
  const text = safeStr(label).trim().toUpperCase();
  if (/^NIRC\b|^TAX CODE\b/.test(text))                        return "NIRC";
  if (/^RR\b|^REVENUE REGULATIONS?\b/.test(text))              return "RR";
  if (/^RMC\b|^REVENUE MEMORANDUM CIRCULAR\b/.test(text))      return "RMC";
  if (/^RMO\b|^REVENUE MEMORANDUM ORDER\b/.test(text))         return "RMO";
  if (/^RAMO\b|^REVENUE AUDIT MEMORANDUM ORDER\b/.test(text))  return "RAMO";
  if (/^RA\b|^REPUBLIC ACT\b/.test(text))                      return "RA";
  return "";
}

function sourceCardIsConsistent(label = "", linkedType = "") {
  const labelType = sourceCardLabelType(label);
  if (!labelType || !linkedType) return true;
  if (labelType === "NIRC") return ["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType);
  if (labelType === "RA")   return ["RA",   "NIRC",    "STATUTE",  "TAX_CODE"].includes(linkedType);
  return labelType === linkedType;
}

function isTargetAllowedCard(provRef, linkedType, targetAuths) {
  if (!targetAuths.length) return true;
  const provKey = canonicalSourceKey(provRef);
  if (targetAuths.some(a => canonicalSourceKey(a) === provKey)) return true;
  if (/^tax code$/i.test(provRef)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a));
  }
  return false;
}

function deriveTargetSafeDocumentRef(c, linkedType, targetAuths) {
  if (!targetAuths.length) return null;
  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a)) ? "Tax Code" : null;
  }
  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    const adminRef = inferAdministrativeRef(sourceCardIdentityBlob(c), linkedType);
    if (adminRef && isTargetAllowedCard(adminRef, linkedType, targetAuths)) return adminRef;
    return null;
  }
  return null;
}

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

function sourceCardDocumentTitle(c = {}) {
  const meta = c.metadata || {};
  return safeStr(
    c.document_title || c.documentTitle || meta.documentTitle || meta.document_title ||
    meta.originalFileName || meta.original_file_name ||
    c.source || c.originalSource || c.original_source ||
    c.path || c.source_path || c.title || "Source"
  ).slice(0, 80);
}

function sanitizeSelectorCards(cards) {
  const result = [];
  for (const card of cards) {
    const labelRef  = (card.normalizedReference || card.citation || "").trim();
    const labelType = sourceCardLabelType(labelRef);
    if (!labelType) { result.push(card); continue; }

    const reChunk = {
      source:         card.source         || "",
      document_title: card.document_title || "",
      documentTitle:  card.documentTitle  || ""
    };
    const recomputedType = inferLinkedSourceType(reChunk);
    const effectiveType  = recomputedType || card.linkedSourceType || "";
    if (!effectiveType) { result.push(card); continue; }

    const consistent =
      labelType === effectiveType ||
      (labelType === "NIRC" && ["NIRC", "STATUTE", "TAX_CODE"].includes(effectiveType)) ||
      (labelType === "RA"   && ["RA",   "NIRC",    "STATUTE",  "TAX_CODE"].includes(effectiveType));

    if (consistent) { result.push(card); continue; }

    // Inconsistent: attempt relabel
    let correctedRef = "";
    if (["RR", "RMC", "RMO", "RAMO"].includes(effectiveType)) {
      correctedRef = inferAdministrativeRef(sourceCardIdentityBlob(reChunk), effectiveType);
    }
    if (!correctedRef) {
      // Cannot safely relabel — drop silently (no console.warn in diagnostic path)
      continue;
    }
    const docTitle  = card.documentTitle || card.document_title || "";
    const newTitle  = correctedRef && docTitle ? `${correctedRef} — ${docTitle}` : correctedRef || docTitle || "Source";
    result.push({
      ...card,
      title:               newTitle,
      citation:            correctedRef,
      normalizedReference: correctedRef,
      normalized_reference: correctedRef,
      linkedSourceType:    effectiveType
    });
  }
  return result;
}

// ─── Diff helper ──────────────────────────────────────────────────────────────

/**
 * Compare selector output with current pipeline sourceCards.
 * Returns { same, added, removed } where added/removed are arrays of refs.
 */
function diffSourceCards(selectorCards = [], currentCards = []) {
  const selectorRefs = new Set(
    selectorCards.map(c => canonicalSourceKey(c.normalizedReference || c.citation || "")).filter(Boolean)
  );
  const currentRefs  = new Set(
    currentCards.map(c => canonicalSourceKey(c.normalizedReference || c.citation || "")).filter(Boolean)
  );

  const added   = [...selectorRefs].filter(k => !currentRefs.has(k));
  const removed = [...currentRefs].filter(k => !selectorRefs.has(k));

  return {
    same:    added.length === 0 && removed.length === 0,
    added,   // in selector but absent from current sourceCards
    removed  // in current sourceCards but absent from selector
  };
}

// ─── Main selector ────────────────────────────────────────────────────────────

/**
 * selectSourceAuthorities
 *
 * Passive diagnostic — runs the same gate/sort logic as pipeline.js and
 * compares results with current sourceCards.  Never throws.
 *
 * @param {{
 *   rerankedChunks:      object[],
 *   issueClassification: object,
 *   query:               string,
 *   answerText:          string,
 *   mode:                string,
 *   maxSources:          number,
 *   currentSourceCards:  object[]
 * }} input
 * @returns {{ validatedSources: object[], visibleSourceCards: object[], diagnostics: object }}
 */
export function selectSourceAuthorities({
  rerankedChunks      = [],
  issueClassification = {},
  query               = "",      // eslint-disable-line no-unused-vars
  answerText          = "",      // eslint-disable-line no-unused-vars — reserved Stage 2
  mode                = "",      // eslint-disable-line no-unused-vars
  maxSources          = DEFAULT_MAX_VISIBLE,
  currentSourceCards  = []
} = {}) {
  try {
    const targetAuths          = issueClassification?.targetAuthorities || [];
    const hasTargetAuthorities = targetAuths.length > 0;
    const candidateCap         = Math.max(maxSources * 3, DEFAULT_CANDIDATE_CAP);
    const visibleCap           = Math.min(maxSources, DEFAULT_MAX_VISIBLE);

    const seen  = new Map();  // dedupeKey → { card, _targetMatch }
    const skip  = { contamination: 0, consistency: 0, issueRelevance: 0 };
    const rejectDetails = [];

    for (const c of rerankedChunks) {
      if (seen.size >= candidateCap) break;

      // Gate 1 — contamination (both flags required)
      if (hasTargetAuthorities && c.targetAuthorityMatch === false && c.issueMismatch === true) {
        skip.contamination++;
        rejectDetails.push({ ref: "(pre-label)", reason: "contamination",
          src: c.source || c.document_title || "" });
        continue;
      }

      if (!c.title && !c.document_title && !c.source && !c.originalSource) continue;

      const linkedType = inferLinkedSourceType(c);
      let   provRef    = inferSourceCardRef(c, linkedType);

      // Gate 2 — label/link consistency
      if (provRef && !sourceCardIsConsistent(provRef, linkedType)) {
        skip.consistency++;
        rejectDetails.push({ ref: provRef, reason: "label_link_mismatch", linkedType });
        continue;
      }

      // Priority signal (not a filter — sets _targetMatch flag)
      let _targetMatch = !hasTargetAuthorities;
      if (hasTargetAuthorities) {
        if (provRef) {
          _targetMatch = isTargetAllowedCard(provRef, linkedType, targetAuths);
        } else {
          const safeRef = deriveTargetSafeDocumentRef(c, linkedType, targetAuths);
          if (safeRef) { provRef = safeRef; _targetMatch = true; }
        }
      }

      // Gate 3 — issue relevance (non-target candidates only)
      if (!_targetMatch) {
        const rel = isIssueRelevantSourceCardCandidate(c);
        if (!rel.allowed) {
          skip.issueRelevance++;
          rejectDetails.push({ ref: provRef || "(no-ref)", reason: rel.reason,
            src: c.source || c.document_title || "" });
          continue;
        }
      }

      // Change-A guard — DB normalizedReference mislabel
      if (!provRef && linkedType) {
        const meta   = c.metadata || {};
        const dbRef  =
          c.normalizedReference || c.normalized_reference ||
          meta.normalizedReference || meta.normalized_reference || "";
        if (dbRef) {
          const dbLabelType = sourceCardLabelType(dbRef);
          if (dbLabelType && !sourceCardIsConsistent(dbRef, linkedType)) {
            skip.consistency++;
            rejectDetails.push({ ref: dbRef, reason: "label_link_mismatch", note: "db_normalizedRef_leak" });
            continue;
          }
        }
      }

      const docTitle  = sourceCardDocumentTitle(c);
      const dedupeKey = provRef
        ? canonicalSourceKey(provRef)
        : (docTitle + "|" + String(c.chunk_index || c.id || "")).toLowerCase().slice(0, 60);

      if (seen.has(dedupeKey)) continue;

      const meta = c.metadata || {};
      const url  =
        c.driveViewUrl    || c.drive_view_url    || c.url             || c.webViewLink     ||
        c.web_view_link   || c.sourceUrl         || c.source_url      ||
        meta.driveViewUrl || meta.drive_view_url || meta.url          || meta.webViewLink  ||
        meta.web_view_link || meta.sourceUrl     || meta.source_url   || "";

      seen.set(dedupeKey, {
        _targetMatch,
        title:               provRef && docTitle ? `${provRef} — ${docTitle}` : provRef || docTitle || "Source",
        citation:            provRef || c.citation || "",
        authorityType:       c.authorityType || c.authority_type || "UNKNOWN",
        driveViewUrl:        url,
        drive_view_url:      url,
        url,
        webViewLink:         c.webViewLink    || meta.webViewLink    || "",
        web_view_link:       c.web_view_link  || meta.web_view_link  || "",
        sourceUrl:           c.sourceUrl      || c.source_url        || meta.sourceUrl   || meta.source_url || "",
        source_url:          c.source_url     || meta.source_url     || "",
        documentTitle:       c.document_title || c.documentTitle     || meta.documentTitle || docTitle || "",
        document_title:      c.document_title || meta.documentTitle  || "",
        normalizedReference: provRef || c.normalizedReference || c.normalized_reference || meta.normalizedReference || "",
        normalized_reference: provRef || c.normalized_reference || meta.normalizedReference || "",
        reference:           c.reference || "",
        source:              c.source    || "",
        linkedSourceType:    linkedType,
        excerpt:             String(c.text || c.content || "").slice(0, 300)
      });
    }

    // Priority sort: target-matched first, then issue-relevant non-target
    const allCandidates    = [...seen.values()];
    const targetMatched    = allCandidates.filter(v =>  v._targetMatch);
    const nonTargetMatched = allCandidates.filter(v => !v._targetMatch);
    const sorted           = [...targetMatched, ...nonTargetMatched];

    // validatedSources = full sorted candidate list (before cap)
    // eslint-disable-next-line no-unused-vars
    const validatedSources = sorted.map(({ _targetMatch, ...card }) => card);

    // Slice to visible cap + run outbound sanitizer
    // eslint-disable-next-line no-unused-vars
    const preClean         = sorted.slice(0, visibleCap).map(({ _targetMatch, ...card }) => card);
    const visibleSourceCards = sanitizeSelectorCards(preClean);

    // Diff vs current sourceCards
    const diff = diffSourceCards(visibleSourceCards, currentSourceCards);

    const diagnostics = {
      selectorVersion:       SELECTOR_VERSION,
      computedAt:            new Date().toISOString(),
      totalChunksInspected:  rerankedChunks.length,
      candidatesCollected:   allCandidates.length,
      targetMatchedCount:    targetMatched.length,
      nonTargetMatchedCount: nonTargetMatched.length,
      accepted:              validatedSources.length,
      rejected:              skip.contamination + skip.consistency + skip.issueRelevance,
      rejectionBreakdown: {
        contamination:  skip.contamination,
        consistency:    skip.consistency,
        issueRelevance: skip.issueRelevance
      },
      rejectedDetails:       rejectDetails.slice(0, 10),
      visibleCount:          visibleSourceCards.length,
      targetAuths:           targetAuths.slice(0, 8),
      selectorLabels:        visibleSourceCards.map(c => c.normalizedReference || c.citation || "(none)"),
      currentLabels:         currentSourceCards.map(c => c.normalizedReference || c.citation || "(none)"),
      diffFromCurrentSourceCards: diff,
      note: diff.same
        ? "selector output matches current sourceCards"
        : "selector output DIFFERS from current sourceCards — review rejectedDetails and diff"
    };

    return { validatedSources, visibleSourceCards, diagnostics };

  } catch (err) {
    // Never throw — diagnostic failures must not affect pipeline
    const diagnostics = {
      selectorVersion: SELECTOR_VERSION,
      computedAt:      new Date().toISOString(),
      error:           String(err?.message || err),
      stack:           String(err?.stack || "").split("\n").slice(0, 5).join("\n"),
      totalChunksInspected: rerankedChunks?.length ?? 0
    };
    return { validatedSources: [], visibleSourceCards: [], diagnostics };
  }
}

export default { selectSourceAuthorities, SELECTOR_VERSION };
