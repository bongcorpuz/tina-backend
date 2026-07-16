# M-Q25 Additional Verified Analysis

## Prompt

Is EWT required on payments to a VAT-registered law firm?

## Payload Determination

The R5 payload marks M-Q25 as VERIFIED_CONTROLLING.

## Frozen Bank Standard

The frozen source bank requires TINA to determine the law firm's legal form:

- Sole practitioner or individual professional: generally subject to professional-fee EWT under the applicable rate structure.
- Qualifying GPP: the GPP itself is not subject to income tax and professional-fee receipts are not subject to creditable EWT under the relevant guidance; partner-level treatment is separate.
- Taxable juridical professional entity that is not a GPP: professional-fee EWT depends on current-year income/declaration conditions.
- VAT registration concerns business tax and does not determine EWT.

The bank identifies EWT/legal-form authorities such as RR 2-1998 as amended by RR 11-2018 and RMC 50-2018.

## Payload Problem

The verified answer says yes categorically and frames VAT registration as effectively supporting EWT. It does not distinguish sole practitioner, GPP, and taxable juridical professional entity. Its sources are VAT registration/invoicing authorities rather than EWT/legal-form authorities.

## Severity

P1. Against the frozen PASS/FAIL standard, the answer is materially incomplete and unsupported as VERIFIED_CONTROLLING. It can cause a withholding error, especially for qualifying GPP receipts.