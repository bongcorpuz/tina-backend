import assert from "node:assert/strict";
import { canonicalDocumentIdOf, extractDriveDocumentId } from "../services/source-document-identity.js";

const validId = "1AbCdEfGhIjKlMnOpQrStUvWxYz_12345";
let assertions = 0;
function check(value, message) {
  assertions += 1;
  assert(value, message);
}

check(canonicalDocumentIdOf({ metadata: { fileId: validId } }) === validId, "explicit indexed metadata fileId is preserved");
check(canonicalDocumentIdOf({ metadata: { drive_file_id: validId } }) === validId, "legacy indexed metadata drive_file_id is preserved");
check(canonicalDocumentIdOf({ metadata: { driveViewUrl: `https://drive.google.com/file/d/${validId}/view` } }) === validId, "legacy indexed Drive view URL resolves only to its opaque ID");
check(canonicalDocumentIdOf({ metadata: { driveDownloadUrl: `https://drive.google.com/uc?export=download&id=${validId}` } }) === validId, "legacy indexed Drive download URL resolves only to its opaque ID");
check(canonicalDocumentIdOf({ metadata: { webViewLink: `https://docs.google.com/document/d/${validId}/edit` } }) === validId, "legacy indexed Docs URL resolves only to its opaque ID");
check(extractDriveDocumentId(`https://evil.example/file/d/${validId}/view`) === null, "non-Google host is rejected");
check(extractDriveDocumentId("https://drive.google.com/file/d/not a valid id/view") === null, "malformed identifier is rejected");
check(canonicalDocumentIdOf({ url: "https://example.com/document" }) === null, "arbitrary URL is not converted into a document identity");

console.log(`TINA source document identity checks: ${assertions} assertions passed`);
