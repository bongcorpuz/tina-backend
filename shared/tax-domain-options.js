// FILE: shared/tax-domain-options.js
"use strict";

/**
 * Canonical list of TINA tax domains for /quiz, /review, and /diagnostic menus.
 * Use buildTaxDomainChoiceMessage() to produce a Markdown-formatted vertical list.
 */

export const TAX_DOMAIN_OPTIONS = Object.freeze([
  "VAT",
  "Income Tax",
  "Withholding Tax",
  "Estate Tax",
  "Donor's Tax",
  "Percentage Tax",
  "Excise Tax",
  "Prescription",
  "Tax Dispute"
]);

/**
 * Returns a Markdown bullet list of domain choices for the given command.
 * Each domain is on its own line — do NOT use .join(" ").
 */
export function buildTaxDomainChoiceMessage(command = "/quiz") {
  const action = command.replace("/", "");

  return [
    `Choose a Philippine tax domain to ${action}:`,
    "",
    ...TAX_DOMAIN_OPTIONS.map((domain) => `- \`${command} ${domain}\``),
    "",
    `Example: **${command} VAT** or **${command} Income Tax**`
  ].join("\n");
}
