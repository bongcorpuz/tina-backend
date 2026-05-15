// FILE: case-analysis-engine.js
"use strict";

/**
 * TINA Enterprise Case Analysis Engine
 * Version: 3.1.0
 * Fully ESM Compatible
 */

import {
  rerankByHierarchy,
  selectTopLegalBases,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} from "./authority-engine.js";

import {
  detectHierarchyConflict,
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair
} from "./conflict-engine.js";

import {
  applySupersessionFilter
} from "./supersession-engine.js";

import {
  selectIssueRelevantJurisprudence,
  buildJurisprudencePayload
} from "./jurisprudence-engine.js";

import {
  reconcileDoctrine
} from "./doctrinal-engine.js";

import {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
} from "./legal-validation-engine.js";

const ENGINE_VERSION = "3.1.0";
