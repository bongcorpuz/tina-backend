import assert from "node:assert/strict";
import { buildVisibleSources } from "../ask-helpers.js";

const validId = "1AbCdEfGhIjKlMnOpQrStUvWxYz_12345";
let assertions = 0;
function check(value, message) { assertions += 1; assert(value, message); }

const visible = buildVisibleSources([{
  title: "National Internal Revenue Code", citation: "NIRC Sec. 106",
  metadata: { driveViewUrl: `https://drive.google.com/file/d/${validId}/view`, normalizedReference: "NIRC Sec. 106" },
  authorityType: "STATUTE", text: "VAT source"
}]);
check(visible.length === 1, "fallback projection returns the visible VAT source");
check(visible[0].documentId === validId && visible[0].document_id === validId, "fallback visible source preserves a canonical document identity");
check(visible[0].citation === "NIRC Sec. 106" && visible[0].authorityType === "STATUTE", "fallback preserves existing source and authority fields");

const malformed = buildVisibleSources([{
  title: "Unknown source", citation: "NIRC Sec. 999", metadata: { driveViewUrl: "https://evil.example/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_12345/view" }
}]);
check(malformed.length === 1 && malformed[0].documentId === null && malformed[0].document_id === null, "untrusted legacy URL never becomes a canonical document identity");

console.log(`TINA visible source document identity checks: ${assertions} assertions passed`);
