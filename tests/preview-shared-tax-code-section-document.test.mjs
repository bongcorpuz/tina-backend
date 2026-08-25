import assert from "node:assert/strict";
import { sourceCardFromRetrievedTarget } from "../source-card-engine.js";

const taxCodeDocumentId = "1AbCdEfGhIjKlMnOpQrStUvWxYz_12345";
const taxCodeRecord = {
  title: "National Internal Revenue Code of 1997", authorityType: "STATUTE", authorityRole: "GOVERNING",
  metadata: { driveViewUrl: `https://drive.google.com/file/d/${taxCodeDocumentId}/view`, documentTitle: "Tax Code.pdf" }
};
const sections = ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108"];
const cards = sections.map((section) => sourceCardFromRetrievedTarget(taxCodeRecord, section));

assert.equal(cards.length, 3, "three visible section cards are constructed");
for (const [index, card] of cards.entries()) {
  assert.equal(card.citation, sections[index], `${sections[index]} preserves its own citation`);
  assert.equal(card.documentId, taxCodeDocumentId, `${sections[index]} retains the shared Tax Code document identity`);
  assert.equal(card.document_id, taxCodeDocumentId, `${sections[index]} retains the snake-case identity alias`);
  assert.equal("publicUrl" in card, false, `${sections[index]} does not expose the source Drive URL`);
}
console.log("TINA shared Tax Code section-card checks: 13 assertions passed");
