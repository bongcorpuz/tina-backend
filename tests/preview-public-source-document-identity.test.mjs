import assert from "node:assert/strict";
import { sanitizePublicSourceCard } from "../services/ask-handler-public-source-sanitizer.js";

const validId = "1AbCdEfGhIjKlMnOpQrStUvWxYz_12345";
let assertions = 0;
function check(value, message) { assertions += 1; assert(value, message); }

const preserved = sanitizePublicSourceCard({
  label: "NIRC Sec. 105", title: "National Internal Revenue Code", citation: "NIRC Sec. 105",
  authorityType: "STATUTE", limitationRequired: true,
  metadata: { fileId: validId, driveViewUrl: `https://drive.google.com/file/d/${validId}/view`, path: "01-tax-code/nirc.pdf", storage: { private: true } },
  driveDownloadUrl: `https://drive.google.com/uc?export=download&id=${validId}`,
  source: "C:\\internal\\nirc.pdf", text: "private indexed chunk"
});
check(preserved.documentId === validId && preserved.document_id === validId, "valid canonical document identity is preserved with its compatibility alias");
check(preserved.authorityType === "STATUTE" && preserved.citation === "NIRC Sec. 105" && preserved.limitationRequired === true, "existing public trust/source fields remain unchanged");
check(!Object.keys(preserved).some((key) => /drive|download|path|storage|metadata|source|text/i.test(key)), "Drive URLs, paths, storage metadata, and chunks remain stripped");

const rejected = sanitizePublicSourceCard({
  title: "Malformed source", documentId: "not a valid document id",
  driveViewUrl: "https://evil.example/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_12345/view", path: "/private/indexed/file.pdf"
});
check(!("documentId" in rejected) && !("document_id" in rejected), "malformed or untrusted document identity is rejected");
check(!Object.keys(rejected).some((key) => /drive|path|metadata|storage/i.test(key)), "malformed input does not widen the public card surface");

console.log(`TINA public source document identity checks: ${assertions} assertions passed`);
