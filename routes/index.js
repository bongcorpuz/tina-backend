// FILE: routes/index.js
"use strict";

/**
 * TINA Route Registry
 *
 * Call registerTinaRoutes(app, { askHandler }) from server.js to mount all
 * mode routes. Each route file is a thin factory that delegates to askHandler
 * with the correct forcedHook — preserving the full existing pipeline.
 */

import { createAskRoute }        from "./ask-route.js";
import { createTaxRoute }        from "./tax-route.js";
import { createReviewRoute }     from "./review-route.js";
import { createQuizRoute }       from "./quiz-route.js";
import { createDiagnosticRoute } from "./diagnostic-route.js";
import { createSourceRoute }     from "./source-route.js";
import { createAuditRoute }      from "./audit-route.js";
import { createCaseRoute }       from "./case-route.js";
import { createDebugRoute }      from "./debug-route.js";
import { createPatchRoute }      from "./patch-route.js";
import { createProgressRoute }   from "./progress-route.js";
import { createFeedbackRoute }   from "./feedback-route.js";

/**
 * Mount all TINA mode routes onto the Express app.
 *
 * @param {import("express").Application} app
 * @param {{ askHandler: Function }} deps
 */
export function registerTinaRoutes(app, { askHandler }) {
  app.use("/ask",        createAskRoute({ askHandler }));
  app.use("/tax",        createTaxRoute({ askHandler }));
  app.use("/review",     createReviewRoute({ askHandler }));
  app.use("/quiz",       createQuizRoute({ askHandler }));
  app.use("/diagnostic", createDiagnosticRoute({ askHandler }));
  app.use("/source",     createSourceRoute({ askHandler }));
  app.use("/audit",      createAuditRoute({ askHandler }));
  app.use("/case",       createCaseRoute({ askHandler }));
  app.use("/debug",      createDebugRoute({ askHandler }));
  app.use("/patch",      createPatchRoute({ askHandler }));
  app.use("/progress",   createProgressRoute({ askHandler }));
  app.use("/feedback",   createFeedbackRoute({ askHandler }));
}
