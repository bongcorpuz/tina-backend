// FILE: services/answer-support-evidence.js
// PHASE-10A14-R20 COMMIT 5R1-C35 Candidate 2
//
// Builds a PRIVATE, bounded answer-support evidence packet by joining the
// final displayed authority identities to passage-bearing retrieved chunks.
// This packet is used only by the post-generation support validator. It is
// never serialized as a public source card and never exposes corpus paths.

"use strict";

import crypto from "node:crypto";

export const ANSWER_SUPPORT_EVIDENCE_VERSION = "C35-PASSAGE-BINDING-V1";
export const ANSWER_SUPPORT_EVIDENCE_LIMITS = Object.freeze({
  maxDisplayedSources: 12,
  maxPassagesPerSource: 4,
  maxPassageChars: 1800,
  maxTotalPassageChars: 24000
});

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safeText(value = "") {
  return typeof value === "string" ? value.trim() : String(value || "").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sourceLabel(source = {}) {
  return safeText(
    source.citation ||
      source.normalizedReference ||
      source.normalized_reference ||
      source.displayLabel ||
      source.display_label ||
      source.label ||
      source.title ||
      ""
  );
}

function sourceAuthorityType(source = {}) {
  const meta = source.metadata && typeof source.metadata === "object" ? source.metadata : {};
  return safeText(
    source.authorityType ||
      source.authority_type ||
      meta.authorityType ||
      meta.authority_type ||
      ""
  );
}

function passageCandidates(source = {}) {
  const meta = source.metadata && typeof source.metadata === "object" ? source.metadata : {};
  return [
    source.text,
    source.content,
    source.excerpt,
    source.snippet,
    source.chunkText,
    source.chunk_text,
    source.pageContent,
    source.page_content,
    meta.text,
    meta.content,
    meta.excerpt,
    meta.snippet,
    meta.chunkText,
    meta.chunk_text,
    meta.pageContent,
    meta.page_content
  ];
}

function normalizedAuthorityType(value = "") {
  const type = safeText(value).toUpperCase().replace(/[\s-]+/g, "_");
  if (["RR", "REVENUE_REGULATION", "REVENUE_REGULATIONS"].includes(type)) return "RR";
  if (["STATUTE", "NIRC", "TAX_CODE", "REPUBLIC_ACT", "RA"].includes(type)) return "STATUTE";
  return type;
}

function normalizeYear(value = "") {
  const year = safeText(value);
  return year.length === 2 ? `19${year}` : year;
}

function provisionLocator(reference = "") {
  const normalized = safeText(reference)
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-");
  const match = normalized.match(
    /(?:(?:\b(sec(?:tion)?s?|art(?:icle)?s?|rules?))|(?:§{1,2}))\s*\.?\s*([0-9]+(?:\.[0-9a-z]+)*(?:-[0-9a-z]+)*(?:\s*\([0-9a-z]+\))*)/i
  );
  if (!match) return "";
  const kind = /^art/i.test(match[1] || "") ? "art" : /^rule/i.test(match[1] || "") ? "rule" : "sec";
  const locator = match[2].toLowerCase().replace(/\s+/g, "");
  return `${kind}:${locator}`;
}

/**
 * Evidence joins are deliberately stricter than public-card deduplication.
 * A public card may collapse an issuance to one display identity, but a
 * passage from one provision may never be relabeled as another provision.
 */
export function answerSupportEvidenceIdentity(source = {}) {
  const reference = sourceLabel(source);
  const normalizedReference = reference
    .normalize("NFKC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const lower = normalizedReference.toLowerCase();
  let provision = provisionLocator(normalizedReference);
  const admin = lower.match(
    /\b(rr|rmc|rmo|ramo|revenue\s+regulations?)\s*(?:no\.?\s*)?(\d{1,4})[-\s]+(\d{2,4})\b/i
  );
  let authorityKey = "";
  if (admin) {
    const kind = /^revenue/i.test(admin[1]) ? "rr" : admin[1].toLowerCase();
    authorityKey = `${kind}:${Number(admin[2])}-${normalizeYear(admin[3])}`;
    if (!provision) {
      const remainder = normalizedReference.slice((admin.index || 0) + admin[0].length).trim();
      const bareLocator = remainder.match(
        /^(?:[,;:]\s*)?([0-9]+\.[0-9a-z]+(?:-[0-9a-z]+)*(?:\s*\([0-9a-z]+\))*)\b/i
      );
      if (bareLocator) {
        provision = `sec:${bareLocator[1].toLowerCase().replace(/\s+/g, "")}`;
      } else if (/\d/.test(remainder)) {
        // A numeric residual that is not safely parsed is provision-specific
        // uncertainty, never permission to fall back to issuance-level joining.
        provision = `unparsed:${remainder.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
      }
    }
  } else if (/\b(?:nirc|national\s+internal\s+revenue\s+code|tax\s+code)\b/i.test(lower)) {
    authorityKey = "nirc";
    if (!provision) {
      const codeAlias = normalizedReference.match(
        /\b(?:nirc|national\s+internal\s+revenue\s+code|tax\s+code)\b/i
      );
      const remainder = codeAlias
        ? normalizedReference.slice((codeAlias.index || 0) + codeAlias[0].length).trim()
        : "";
      const bareLocator = remainder.match(
        /^(?:[,;:]\s*)?([0-9]+[a-z]?(?:-[0-9]+[a-z]?)*(?:\s*\([0-9a-z]+\))*)\b/i
      );
      if (bareLocator) {
        provision = `sec:${bareLocator[1].toLowerCase().replace(/\s+/g, "")}`;
      } else if (/\d/.test(remainder)) {
        provision = `unparsed:${remainder.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
      }
    }
  } else {
    authorityKey = lower
      .replace(/\bno\.?\s*/g, "")
      .replace(/[^a-z0-9]/g, "");
  }
  const declaredType = normalizedAuthorityType(sourceAuthorityType(source));
  return {
    authorityKey,
    provisionLocator: provision,
    declaredType,
    normalizedReference,
    matchKey: `${authorityKey}\u0000${provision || "issuance"}`
  };
}

function sameEvidenceIdentity(left = {}, right = {}) {
  const a = answerSupportEvidenceIdentity(left);
  const b = answerSupportEvidenceIdentity(right);
  if (!a.authorityKey || a.authorityKey !== b.authorityKey) return false;
  if (a.declaredType && b.declaredType && a.declaredType !== b.declaredType) return false;
  if (a.provisionLocator || b.provisionLocator) {
    return Boolean(
      a.provisionLocator &&
        b.provisionLocator &&
        a.provisionLocator === b.provisionLocator
    );
  }
  return true;
}

/**
 * Build passage evidence for every final displayed source, preserving displayed
 * order. Missing matches remain explicit records with passages=[] so the
 * validator can fail closed rather than silently discard an ungrounded card.
 */
export function buildAnswerSupportEvidence({
  displayedSources = [],
  retrievedSources = [],
  limits = ANSWER_SUPPORT_EVIDENCE_LIMITS
} = {}) {
  const allCards = safeArray(displayedSources);
  const cards = allCards.slice(0, limits.maxDisplayedSources);
  const retrieved = safeArray(retrievedSources);
  let remainingChars = limits.maxTotalPassageChars;

  const packet = cards.map((card, displayedIndex) => {
    const identity = answerSupportEvidenceIdentity(card);
    const matches = retrieved
      .map((source, retrievedIndex) => ({ source, retrievedIndex }))
      .filter(({ source }) => sameEvidenceIdentity(card, source));
    const seenPassages = new Set();
    const passages = [];

    for (const { source, retrievedIndex } of matches) {
      for (const candidate of passageCandidates(source)) {
        if (passages.length >= limits.maxPassagesPerSource || remainingChars <= 0) break;
        const raw = safeText(candidate);
        if (!raw) continue;
        const text = raw.slice(0, Math.min(limits.maxPassageChars, remainingChars));
        if (!text || seenPassages.has(text)) continue;
        seenPassages.add(text);
        remainingChars -= text.length;
        passages.push({
          retrievedIndex,
          retrievedCitation: sourceLabel(source),
          evidenceJoinKey: answerSupportEvidenceIdentity(source).matchKey,
          text,
          passageSha256: sha256(text)
        });
      }
      if (passages.length >= limits.maxPassagesPerSource || remainingChars <= 0) break;
    }

    const citation = sourceLabel(card);
    return {
      supportEvidenceVersion: ANSWER_SUPPORT_EVIDENCE_VERSION,
      displayedIndex,
      label: safeText(card.label || card.displayLabel || citation),
      displayLabel: safeText(card.displayLabel || card.label || citation),
      title: safeText(card.title || citation),
      citation,
      authorityType: safeText(card.authorityType || card.authority_type || ""),
      canonicalKey: identity.matchKey,
      provisionLocator: identity.provisionLocator,
      matchedRetrievedSourceCount: matches.length,
      passages
    };
  });

  if (allCards.length > limits.maxDisplayedSources) {
    packet.push({
      supportEvidenceVersion: ANSWER_SUPPORT_EVIDENCE_VERSION,
      displayedIndex: limits.maxDisplayedSources,
      label: "(displayed source overflow)",
      displayLabel: "(displayed source overflow)",
      title: "(displayed source overflow)",
      citation: "(displayed source overflow)",
      authorityType: "",
      canonicalKey: "overflow",
      provisionLocator: "",
      matchedRetrievedSourceCount: 0,
      overflow: {
        displayedSourceCount: allCards.length,
        maxDisplayedSources: limits.maxDisplayedSources
      },
      passages: []
    });
  }

  return packet;
}

export default {
  ANSWER_SUPPORT_EVIDENCE_VERSION,
  ANSWER_SUPPORT_EVIDENCE_LIMITS,
  answerSupportEvidenceIdentity,
  buildAnswerSupportEvidence
};
