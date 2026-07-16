# PHASE-10A12-R3 — Q5 Legal Proposition Matrix & Official-Authority Worksheet (STEP 3)

Primary and official Philippine tax authorities only. No Wikipedia, blogs, commercial
summaries, or unofficial explainers.

## Controlling provisions

| Dimension | Rule | Controlling authority | Operative basis | Effectivity |
|---|---|---|---|---|
| General import VAT rule | 12% VAT on every importation of goods, based on total value used by the Bureau of Customs plus duties/excise. | NIRC Sec. 107(A) (as amended) | "There shall be levied ... on every importation of goods a value-added tax equivalent to twelve percent (12%) based on the total value used by the Bureau of Customs ...". | TRAIN (RA 10963); 12% baseline |
| Statutory exemption (registered export enterprise) | VAT exemption on importation of capital equipment, raw materials, spare parts, or accessories DIRECTLY and EXCLUSIVELY used in the registered project/activity of a Registered Business Enterprise (RBE). | RA No. 12066 (CREATE MORE) amending NIRC Secs. 294–295 (Title XIII, fiscal incentives) | VAT exemption on importation is a registered-enterprise incentive tied to the registered export activity and direct attribution. | RA 12066 (CREATE MORE), effective 2025; IRR RR No. 3-2025 |
| Zero-rating (distinct from exemption) | VAT zero-rating applies to LOCAL purchases of goods/services directly attributable to the registered export activity, and to export SALES — NOT the same legal mechanism as import-VAT EXEMPTION. | NIRC Sec. 106(A)(2)/108(B) & CREATE/CREATE MORE zero-rating rules | Zero-rating (0% output VAT with input-VAT recovery) ≠ import-VAT exemption (no VAT imposed on importation). | TRAIN / CREATE / CREATE MORE |
| Taxpayer qualification | Must be a Registered Business Enterprise (export-oriented) registered with an Investment Promotion Agency (IPA); export-oriented threshold applies. | RA 11534 (CREATE) / RA 12066 (CREATE MORE); NIRC Sec. 293–295 | Incentive availability is conditioned on registration and export-orientation. | CREATE 2021 → CREATE MORE 2025 |
| Transaction qualification | Imported goods must be DIRECTLY attributable to the registered export project/activity. | RA 12066; IRR RR 3-2025 | Direct-attribution requirement. | 2025 |
| Non-qualifying importer | An ordinary / purely domestic importer that is NOT a registered export enterprise is subject to the general 12% import VAT — the incentive does not apply. | NIRC Sec. 107(A) | General rule controls when no incentive qualification exists. | current |

## Distinctions that must NOT be collapsed

- **VAT exemption** (no VAT on importation) vs **zero-rating** (0% output VAT, input-VAT recoverable).
- **Import VAT exemption** (on importation) vs **input VAT treatment** (credit/refund of VAT paid).
- **Aggregate ₱3,000,000 VAT-registration threshold** vs **incentive qualification** (registration + export-orientation).
- **Transition rule** (CREATE → CREATE MORE effectivity) vs settled current treatment.

## Unsupported formulations / prohibited overgeneralizations

- "Import VAT is ALWAYS 12% regardless of status" (ignores the CREATE MORE exemption for qualified RBEs).
- "All imports for export are AUTOMATICALLY VAT-exempt / zero-rated" (ignores qualification + direct attribution).
- Granting exemption/zero-rating for a qualified RBE citing ONLY NIRC Sec. 107 / RR 16-2005 (generic authority; no incentive basis).
- Substituting "zero-rated" for "exempt" (or vice versa) without the controlling incentive authority.
- Treating the ₱3M aggregate registration threshold as the incentive-qualification test.

## Gate mapping

- Incentive treatment (exemption/zero-rating) GRANTED on generic authority only → **fail closed**
  (`incentive-source-sufficiency`, reason `incentive_treatment_claimed_without_specific_incentive_authority`).
- Qualified-RBE incentive QUESTION answered on generic source cards only → **fail closed**
  (reason `qualified_incentive_question_answered_on_generic_authority`).
- Definitive incentive granted without a qualifying condition → **fail closed**
  (reason `incentive_granted_without_qualifying_condition`).
- Non-qualifying importer correctly given the 12% general rule on NIRC Sec. 107 → **may verify** (valid).
