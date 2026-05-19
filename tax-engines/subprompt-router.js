// FILE: tax-engines/subprompt-router.js
"use strict";

/**
 * TINA Sub-Prompt Router
 * Version: 1.0.0
 *
 * Routes a domainCode to its domain-specific LLM sub-classifier.
 * Each sub-classifier runs gpt-4o-mini at temperature=0 to produce
 * fine-grained sub-issue + target-authority metadata within the domain.
 *
 * Callers: pipeline.js Step 2 (domain sub-classification).
 * LAW D: only pipeline.js calls this.
 */

import * as vatSub  from "./VAT/subclassifier.js";
import * as citSub  from "./CIT/subclassifier.js";
import * as iitSub  from "./IIT/subclassifier.js";
import * as whtSub  from "./WHT/subclassifier.js";
import * as estSub  from "./EST/subclassifier.js";
import * as pctSub  from "./PCT/subclassifier.js";
import * as excSub  from "./EXC/subclassifier.js";
import * as preSub  from "./PRE/subclassifier.js";
import * as disSub  from "./DIS/subclassifier.js";
import * as lgtSub  from "./LGT/subclassifier.js";
import * as cusSub  from "./CUS/subclassifier.js";
import * as spcSub  from "./SPC/subclassifier.js";
import * as conSub  from "./CON/subclassifier.js";

export const SUBPROMPT_ROUTER_VERSION = "1.0.0";

const DOMAIN_MAP = Object.freeze({
  VAT:     vatSub,
  CIT:     citSub,
  IIT:     iitSub,
  WHT:     whtSub,
  EST:     estSub,
  PCT:     pctSub,
  EXC:     excSub,
  PRE:     preSub,
  DIS:     disSub,
  LGT:     lgtSub,
  CUS:     cusSub,
  SPC:     spcSub,
  CON:     conSub,
  // aliases
  DONORS:            estSub,
  ESTATE:            estSub,
  PERCENTAGE:        pctSub,
  EXCISE:            excSub,
  PRESCRIPTION:      preSub,
  DISPUTE:           disSub,
  LOCAL_TAX:         lgtSub,
  CUSTOMS:           cusSub,
  TRANSFER_PRICING:  spcSub,
  CONSTITUTIONAL:    conSub
});

/**
 * Return the sub-classifier module for a domain code.
 * Returns null if the domain has no sub-classifier.
 */
export function routeToSubclassifier(domainCode = "") {
  const key = String(domainCode || "").trim().toUpperCase();
  return DOMAIN_MAP[key] || null;
}

/**
 * Run the LLM sub-classification for the given domain.
 * Falls back to { success: false } if domain unknown or openai missing.
 */
export async function classifySubIssue(domainCode = "", question = "", openai = null) {
  const sub = routeToSubclassifier(domainCode);

  if (!sub) {
    return {
      success: false,
      error: `No sub-classifier for domain: ${domainCode}`,
      result: null,
      metadata: { domainCode }
    };
  }

  if (!openai || !question) {
    return {
      success: false,
      error: "Requires openai client and question.",
      result: null,
      metadata: { domainCode }
    };
  }

  const result = await sub.classifySubIssue(question, openai);
  return { ...result, metadata: { ...(result.metadata || {}), domainCode } };
}

/**
 * Return the list of all supported domain codes.
 */
export function supportedDomains() {
  return Object.keys(DOMAIN_MAP).filter(
    (key, idx, arr) => arr.indexOf(key) === idx && DOMAIN_MAP[key] !== undefined
  );
}

export function subpromptRouterHealthCheck() {
  return {
    ok: true,
    engine: "TINA_SUBPROMPT_ROUTER",
    version: SUBPROMPT_ROUTER_VERSION,
    domainsLoaded: Object.keys(DOMAIN_MAP).length,
    esmCompatible: true,
    openAiModel: "gpt-4o-mini",
    temperature: 0
  };
}

export default {
  SUBPROMPT_ROUTER_VERSION,
  routeToSubclassifier,
  classifySubIssue,
  supportedDomains,
  subpromptRouterHealthCheck
};
