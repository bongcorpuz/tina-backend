import assert from "node:assert/strict";
import { sanitizePublicSourceCard as sanitizePipelineCard } from "../source-card-engine.js";
import { sanitizePublicSourceCard as sanitizeAskCard } from "../services/ask-handler-public-source-sanitizer.js";

const validId = "1AbCdEfGhIjKlMnOpQrStUvWxYz_12345";
let assertions = 0;
function check(value, message) { assertions += 1; assert(value, message); }

const pipelineCard = sanitizePipelineCard({
  title: "National Internal Revenue Code", citation: "NIRC Sec. 108", authorityType: "STATUTE",
  driveViewUrl: `https://drive.google.com/file/d/${validId}/view`, metadata: { driveViewUrl: `https://drive.google.com/file/d/${validId}/view` }
});
check(pipelineCard.documentId === validId && pipelineCard.document_id === validId, "pipeline fallback card retains only the canonical document identity");
check(!("publicUrl" in pipelineCard), "pipeline fallback card does not expose a raw Drive URL");

const publicCard = sanitizeAskCard(pipelineCard);
check(publicCard.documentId === validId && publicCard.document_id === validId, "ask-handler public card preserves the opaque viewer identity");
check(!Object.keys(publicCard).some((key) => /drive|download|path|storage|metadata/i.test(key)), "final public card still strips Drive and storage fields");

const malformed = sanitizePipelineCard({ title: "Unknown", citation: "Unknown", driveViewUrl: "https://evil.example/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_12345/view" });
check(!("documentId" in malformed) && !("document_id" in malformed), "untrusted URL never becomes a canonical document identity");

console.log(`TINA final source-card document identity checks: ${assertions} assertions passed`);
