// FILE: services/tax-concept-aliases.js
"use strict";

/**
 * Deterministic retrieval alias planner for Philippine tax concepts.
 *
 * Maps normalized topic strings to compact lists of authoritative aliases
 * suitable for lightweight ILIKE retrieval against:
 *   - normalized_reference  (e.g. "NIRC Sec. 27", "RR 9-1998")
 *   - document_title        (e.g. "Minimum Corporate Income Tax")
 *   - source                (e.g. "mcit-notes", "rr-2-98")
 *
 * Rules:
 *  - No standalone broad terms ("tax", "income", "vat", "nirc", "bir")
 *  - NIRC section refs use stored format "NIRC Sec. N" (matches detectNircSectionHeading output)
 *  - Max 6 aliases per concept
 *  - Keys are lowercase-trimmed topic strings (primary queries from buildRetrievalHints)
 */

// ─── Lookup table ─────────────────────────────────────────────────────────────

const CONCEPT_ALIAS_MAP = {

  // ── INCOME TAX: CORPORATE ─────────────────────────────────────────────────

  // RCIT
  "section 27":                    ["regular corporate income tax", "rcit", "NIRC Sec. 27"],
  "regular corporate income tax":  ["rcit", "regular corporate income tax", "NIRC Sec. 27"],
  "rcit":                          ["regular corporate income tax", "rcit", "NIRC Sec. 27"],
  "domestic corporation tax":      ["rcit", "regular corporate income tax", "NIRC Sec. 27"],

  // MCIT
  "section 27(e)":                 ["minimum corporate income tax", "mcit", "NIRC Sec. 27", "RR 9-1998"],
  "minimum corporate income tax":  ["minimum corporate income tax", "mcit", "NIRC Sec. 27", "section 27(e)", "RR 9-1998"],
  "mcit":                          ["minimum corporate income tax", "mcit", "NIRC Sec. 27", "section 27(e)", "RR 9-1998"],
  "2 percent minimum tax":         ["minimum corporate income tax", "mcit", "NIRC Sec. 27", "section 27(e)"],

  // NOLCO
  "net operating loss":            ["net operating loss", "nolco", "NIRC Sec. 34", "section 34(d)(3)"],
  "nolco carry over":              ["nolco", "net operating loss", "NIRC Sec. 34"],
  "nolco":                         ["net operating loss carryover", "nolco", "NIRC Sec. 34", "section 34(d)(3)"],
  "section 34(d)(3)":              ["nolco", "net operating loss", "NIRC Sec. 34"],

  // Special rates / CREATE
  "create act":                    ["CREATE Act", "income tax holiday", "special economic zone", "NIRC Sec. 27"],
  "income tax holiday":            ["CREATE Act", "income tax holiday", "special economic zone"],
  "special economic zone":         ["CREATE Act", "income tax holiday", "special economic zone"],
  "domestic market enterprise":    ["CREATE Act", "income tax holiday", "NIRC Sec. 27"],

  // ── INCOME TAX: DEDUCTIONS ────────────────────────────────────────────────

  // General deductions
  "section 34":                    ["allowable deductions", "NIRC Sec. 34", "ordinary necessary expense"],
  "allowable deductions":          ["allowable deductions", "ordinary necessary expense", "NIRC Sec. 34"],
  "ordinary necessary expense":    ["allowable deductions", "NIRC Sec. 34", "section 34"],

  // OSD
  "optional standard deduction":   ["optional standard deduction", "osd", "NIRC Sec. 34", "section 34(l)"],
  "osd":                           ["optional standard deduction", "osd", "NIRC Sec. 34", "section 34(l)"],
  "section 34(l)":                 ["optional standard deduction", "osd", "NIRC Sec. 34"],
  "40 percent osd":                ["optional standard deduction", "osd", "NIRC Sec. 34", "section 34(l)"],

  // De minimis
  "de minimis benefits":           ["de minimis benefits", "RR 11-2018", "exempt de minimis"],
  "de minimis":                    ["de minimis benefits", "RR 11-2018"],
  "exempt de minimis":             ["de minimis benefits", "RR 11-2018", "exempt fringe benefit"],
  "rr 11-2018":                    ["RR 11-2018", "de minimis benefits", "withholding on compensation"],

  // 13th month pay
  "13th month pay":                ["13th month pay", "NIRC Sec. 32", "section 32(b)(7)", "90000 exempt"],
  "section 32(b)(7)":              ["13th month pay", "NIRC Sec. 32", "90000 limit"],
  "90000 exempt":                  ["13th month pay", "NIRC Sec. 32", "section 32(b)(7)"],
  "90000 limit":                   ["13th month pay", "NIRC Sec. 32", "section 32(b)(7)"],

  // ── INCOME TAX: INDIVIDUAL ────────────────────────────────────────────────

  // Gross income
  "section 32":                    ["gross income", "NIRC Sec. 32", "exclusions from gross income"],
  "gross income exclusions":       ["gross income", "NIRC Sec. 32", "section 32", "items gross income"],
  "items gross income":            ["gross income", "NIRC Sec. 32", "section 32"],

  // Compensation income
  "section 24(a)":                 ["compensation income", "NIRC Sec. 24", "graduated tax rates"],
  "compensation income":           ["compensation income", "NIRC Sec. 24", "section 24(a)", "graduated tax rates"],
  "graduated tax rates individual":["compensation income", "NIRC Sec. 24", "section 24(a)"],

  // Capital gains
  "section 24(d)":                 ["capital gains tax", "NIRC Sec. 24", "6 percent capital gains"],
  "capital gains tax":             ["capital gains tax", "NIRC Sec. 24", "section 24(d)", "real property 6 percent"],
  "real property 6 percent":       ["capital gains tax", "NIRC Sec. 24", "section 24(d)"],

  // Dividends
  "section 24(b)":                 ["dividends income", "NIRC Sec. 24", "NIRC Sec. 27"],
  "dividends income":              ["dividends", "NIRC Sec. 24", "section 24(b)", "section 27(d)"],
  "section 27(d)":                 ["dividends", "NIRC Sec. 27", "section 24(b)"],

  // Passive income
  "passive income":                ["passive income", "interest income", "NIRC Sec. 24", "royalty income"],
  "interest income":               ["passive income", "interest income", "NIRC Sec. 24"],
  "royalty income":                ["passive income", "royalty", "NIRC Sec. 24"],

  // Self-employment / professional
  "professional income":           ["professional income", "self employed income", "NIRC Sec. 24"],
  "self employed income":          ["professional income", "self employed", "NIRC Sec. 24"],
  "business income individual":    ["professional income", "NIRC Sec. 24", "self employed"],

  // Mixed income
  "mixed income earner":           ["mixed income earner", "NIRC Sec. 24", "section 24(a)(2)"],
  "section 24(a)(2)":              ["mixed income earner", "minimum wage earner", "NIRC Sec. 24"],
  "compensation plus business":    ["mixed income earner", "NIRC Sec. 24"],

  // Minimum wage earner
  "minimum wage earner":           ["minimum wage earner", "NIRC Sec. 24", "section 24(a)(2)", "exempt mwe"],
  "exempt mwe":                    ["minimum wage earner", "NIRC Sec. 24"],
  "exempt minimum wage":           ["minimum wage earner", "NIRC Sec. 24"],

  // Fringe benefit tax
  "fringe benefit tax":            ["fringe benefit tax", "fbt", "NIRC Sec. 33", "section 33"],
  "fbt":                           ["fringe benefit tax", "fbt", "NIRC Sec. 33", "section 33"],
  "fbt grossed up":                ["fringe benefit tax", "fbt", "NIRC Sec. 33", "grossed up monetary value"],
  "managerial supervisory fbt":    ["fringe benefit tax", "fbt", "NIRC Sec. 33"],
  "section 33":                    ["fringe benefit tax", "fbt", "NIRC Sec. 33"],

  // Alien / NRA
  "nonresident alien":             ["nonresident alien", "nra", "NIRC Sec. 25"],
  "nra":                           ["nonresident alien", "nra", "NIRC Sec. 25"],
  "nra engaged trade":             ["nonresident alien", "nra", "NIRC Sec. 25"],
  "alien income taxation":         ["nonresident alien", "nra", "NIRC Sec. 25"],
  "resident alien":                ["resident alien", "alien individual income", "NIRC Sec. 24"],
  "alien individual income":       ["resident alien", "alien income", "NIRC Sec. 24"],

  // Transfer pricing
  "transfer pricing":              ["transfer pricing", "NIRC Sec. 50", "arm length transaction", "RR 2-2013"],
  "section 50":                    ["transfer pricing", "NIRC Sec. 50", "arm length transaction", "RR 2-2013"],
  "arm length transaction":        ["transfer pricing", "NIRC Sec. 50", "RR 2-2013"],
  "rr 2-2013":                     ["transfer pricing", "RR 2-2013", "NIRC Sec. 50"],

  // Tax treaty
  "tax treaty":                    ["tax treaty", "double taxation", "treaty benefit", "certificate of residency"],
  "double taxation":               ["tax treaty", "double taxation agreement", "treaty benefit"],
  "treaty benefit":                ["tax treaty", "double taxation", "certificate of residency"],
  "certificate of residency":      ["tax treaty", "certificate of residency", "treaty rate"],

  // Accounting method
  "accounting method":             ["accounting method", "cash basis accrual", "NIRC Sec. 43"],
  "cash basis accrual":            ["accounting method", "NIRC Sec. 43"],
  "percentage of completion":      ["accounting method", "percentage of completion", "NIRC Sec. 43"],

  // ── VAT ──────────────────────────────────────────────────────────────────

  "value added tax":               ["value added tax", "NIRC Sec. 105", "section 105", "vat nature"],
  "section 105":                   ["value added tax", "NIRC Sec. 105", "vat nature"],
  "vat nature":                    ["value added tax", "NIRC Sec. 105", "section 105"],

  // VAT Exempt
  "section 109":                   ["vat exempt", "exempt transactions", "NIRC Sec. 109"],
  "vat exempt":                    ["vat exempt", "exempt transactions", "NIRC Sec. 109", "section 109"],
  "exempt transactions":           ["exempt transactions", "vat exempt", "NIRC Sec. 109"],
  "vat exemption":                 ["vat exempt", "exempt transactions", "NIRC Sec. 109", "section 109"],
  "rr 16-2005":                    ["RR 16-2005", "vat compliance", "vat regulations"],

  // Zero rating
  "zero rated sales":              ["zero rated", "zero-rated sales", "NIRC Sec. 106", "export sales vat"],
  "export sales vat":              ["zero rated", "zero-rated", "NIRC Sec. 106", "NIRC Sec. 108"],
  "section 106":                   ["zero rated sales", "output vat", "NIRC Sec. 106"],
  "section 108(b)":                ["zero rated services", "NIRC Sec. 108", "zero-rated"],
  "section 108":                   ["vat on services", "NIRC Sec. 108"],

  // Input tax
  "input tax credit":              ["input tax credit", "NIRC Sec. 110", "section 110", "creditable input tax"],
  "creditable input tax":          ["input tax credit", "NIRC Sec. 110", "section 110"],
  "section 110":                   ["input tax credit", "creditable input tax", "NIRC Sec. 110"],

  // Output VAT
  "output vat":                    ["output tax", "output vat", "NIRC Sec. 106", "section 106"],
  "output tax":                    ["output tax", "output vat", "NIRC Sec. 106"],

  // VAT Refund
  "section 112":                   ["vat refund", "input tax refund", "NIRC Sec. 112", "120 day rule"],
  "vat refund":                    ["vat refund", "input tax refund", "NIRC Sec. 112", "section 112"],
  "input tax refund":              ["vat refund", "NIRC Sec. 112", "120 day rule"],
  "120 day 30 day":                ["vat refund", "NIRC Sec. 112", "section 112", "120 day rule"],
  "120 day rule":                  ["vat refund", "NIRC Sec. 112", "section 112"],

  // VAT Registration
  "vat registration":              ["vat registration", "NIRC Sec. 236", "section 236", "3 million threshold"],
  "section 236":                   ["vat registration", "NIRC Sec. 236", "3 million threshold"],
  "3 million threshold":           ["vat registration", "NIRC Sec. 236", "section 236"],

  // Transitional input tax
  "section 111":                   ["transitional input tax", "beginning inventory vat", "NIRC Sec. 111"],
  "transitional input tax":        ["transitional input tax", "beginning inventory vat", "NIRC Sec. 111", "section 111"],
  "beginning inventory vat":       ["transitional input tax", "NIRC Sec. 111", "section 111"],
  "presumptive input tax":         ["transitional input tax", "NIRC Sec. 111", "section 111"],

  // Withholding VAT
  "withholding vat":               ["withholding vat", "government withholding vat", "5 percent vat withholding"],
  "government withholding vat":    ["withholding vat", "5 percent vat withholding"],
  "5 percent vat":                 ["withholding vat", "government withholding vat", "NIRC Sec. 114"],

  // VAT compliance / BIR forms
  "bir form 2550":                 ["BIR Form 2550", "vat return", "quarterly vat"],
  "vat return":                    ["vat return", "BIR Form 2550", "vat compliance"],

  // ── WITHHOLDING TAX ──────────────────────────────────────────────────────

  "expanded withholding tax":      ["expanded withholding tax", "ewt", "RR 2-98", "creditable withholding tax"],
  "ewt":                           ["expanded withholding tax", "ewt", "RR 2-98", "creditable withholding"],
  "creditable withholding tax":    ["expanded withholding tax", "ewt", "RR 2-98"],
  "rr 2-98":                       ["expanded withholding tax", "RR 2-98", "ewt"],

  "final withholding tax":         ["final withholding tax", "fwt", "NIRC Sec. 57", "passive income withholding"],
  "fwt":                           ["final withholding tax", "fwt", "NIRC Sec. 57"],
  "passive income withholding":    ["final withholding tax", "fwt", "NIRC Sec. 57"],
  "section 57":                    ["final withholding tax", "fwt", "NIRC Sec. 57"],

  "withholding on compensation":   ["withholding on compensation", "payroll withholding", "RR 11-2018"],
  "payroll withholding":           ["withholding on compensation", "RR 11-2018"],

  "withholding agent obligation":  ["withholding agent", "payor withholding", "withholding obligation"],
  "payor withholding":             ["withholding agent", "withholding obligation"],

  "government withholding":        ["government withholding", "procuring entity", "1601E"],
  "procuring entity":              ["government withholding", "1601E", "procuring entity"],

  "treaty withholding rate":       ["treaty withholding", "reduced withholding rate", "certificate of residency"],
  "reduced withholding rate":      ["treaty withholding", "treaty rate", "certificate of residency"],

  "bir form 2307":                 ["BIR Form 2307", "creditable certificate withholding", "form 2307"],
  "bir form 2306":                 ["BIR Form 2306", "final tax certificate", "form 2306"],
  "form 2307":                     ["BIR Form 2307", "creditable withholding certificate"],
  "form 2306":                     ["BIR Form 2306", "final withholding certificate"],

  "1601-eq quarterly":             ["1601-EQ", "quarterly withholding return", "withholding remittance"],
  "filing deadline":               ["withholding remittance", "1601-EQ", "filing deadline withholding"],

  // ── ESTATE TAX ───────────────────────────────────────────────────────────

  "section 85":                    ["gross estate", "NIRC Sec. 85", "decedent property estate"],
  "gross estate":                  ["gross estate", "NIRC Sec. 85", "section 85", "decedent property"],
  "decedent property estate":      ["gross estate", "NIRC Sec. 85", "section 85"],

  "section 86":                    ["estate deductions", "NIRC Sec. 86", "family home deduction"],
  "estate deductions":             ["estate deductions", "NIRC Sec. 86", "section 86", "family home"],
  "family home deduction":         ["estate deductions", "NIRC Sec. 86", "family home", "section 86"],
  "standard deduction estate":     ["estate deductions", "NIRC Sec. 86"],

  "section 84":                    ["estate tax rate", "NIRC Sec. 84", "6 percent net estate"],
  "estate tax rate":               ["estate tax rate", "NIRC Sec. 84", "section 84", "6 percent net estate"],
  "6 percent net estate":          ["estate tax rate", "NIRC Sec. 84", "section 84"],

  "section 90":                    ["estate tax return", "NIRC Sec. 90", "one year filing estate"],
  "estate tax return":             ["estate tax return", "NIRC Sec. 90", "section 90", "one year filing"],
  "one year filing estate":        ["estate tax return", "NIRC Sec. 90", "section 90"],

  "estate tax amnesty":            ["estate tax amnesty", "RA 11213", "amnesty availment"],
  "ra 11213":                      ["estate tax amnesty", "tax amnesty", "RA 11213"],
  "amnesty availment":             ["estate tax amnesty", "RA 11213"],

  "conjugal property":             ["conjugal property", "absolute community property", "conjugal partnership"],
  "absolute community property":   ["conjugal property", "absolute community property", "acp"],
  "conjugal partnership":          ["conjugal property", "cpg", "conjugal partnership of gains"],

  // ── DONOR'S TAX ──────────────────────────────────────────────────────────

  "section 99":                    ["donor's tax", "NIRC Sec. 99", "6 percent donation"],
  "donor's tax":                   ["donor's tax", "NIRC Sec. 99", "section 99", "6 percent donation"],
  "6 percent donation":            ["donor's tax", "NIRC Sec. 99", "section 99"],

  "section 101":                   ["exempt donation", "NIRC Sec. 101", "dowry gift exempt"],
  "exempt donation":               ["exempt donation", "NIRC Sec. 101", "section 101", "dowry"],
  "dowry gift exempt":             ["exempt donation", "NIRC Sec. 101", "section 101"],

  "donation valuation":            ["donation valuation", "fair market value donation", "appraised value"],
  "fair market value donation":    ["donation valuation", "fair market value", "appraised value"],

  "stranger donor tax":            ["stranger donor", "related party donation", "donor's tax"],
  "related party donation":        ["related party donation", "stranger donor", "donor's tax"],

  "corporate donation":            ["corporate donation", "deductible contribution", "NIRC Sec. 34"],
  "deductible contribution":       ["corporate donation", "deductible contribution", "section 34(h)"],
  "section 34(h)":                 ["corporate donation", "deductible contribution", "NIRC Sec. 34"],

  // ── PERCENTAGE TAX ───────────────────────────────────────────────────────

  "section 116":                   ["percentage tax", "NIRC Sec. 116", "3 percent non-vat"],
  "percentage tax general":        ["percentage tax", "NIRC Sec. 116", "section 116", "3 percent non-vat"],
  "3 percent non-vat":             ["percentage tax", "NIRC Sec. 116", "section 116"],

  "section 24(a)(2)(b)":           ["8 percent option", "NIRC Sec. 24", "flat 8 percent tax"],
  "8 percent option":              ["8 percent option", "NIRC Sec. 24", "section 24(a)(2)(b)", "flat 8 percent"],
  "flat 8 percent tax":            ["8 percent option", "NIRC Sec. 24", "section 24(a)(2)(b)"],

  "section 117":                   ["common carrier tax", "NIRC Sec. 117", "transport percentage tax"],
  "common carrier tax":            ["common carrier", "NIRC Sec. 117", "section 117", "transport percentage"],
  "transport percentage tax":      ["common carrier", "NIRC Sec. 117", "section 117"],

  "section 119":                   ["franchise tax", "NIRC Sec. 119", "franchisee percentage"],
  "franchise tax":                 ["franchise tax", "NIRC Sec. 119", "section 119", "franchisee"],
  "franchisee percentage":         ["franchise tax", "NIRC Sec. 119", "section 119"],

  "section 120":                   ["overseas communication tax", "NIRC Sec. 120"],
  "overseas communication tax":    ["overseas dispatch", "NIRC Sec. 120", "section 120"],

  "section 127":                   ["stock transaction tax", "stt", "NIRC Sec. 127"],
  "stock transaction tax":         ["stock transaction tax", "stt", "NIRC Sec. 127", "section 127"],
  "stt":                           ["stock transaction tax", "stt", "NIRC Sec. 127", "section 127"],

  "section 121":                   ["bank percentage tax", "NIRC Sec. 121", "non-bank financial"],
  "bank percentage tax":           ["bank percentage tax", "NIRC Sec. 121", "section 121"],
  "non-bank financial intermediary":["bank percentage tax", "NIRC Sec. 121", "section 121"],

  "section 118":                   ["international carrier tax", "NIRC Sec. 118", "shipping percentage"],
  "international carrier tax":     ["international carrier", "NIRC Sec. 118", "section 118"],

  "vat registration election":     ["vat election", "opt into vat", "non-vat to vat"],
  "2551q quarterly":               ["2551Q", "quarterly percentage tax", "percentage tax return"],

  // ── EXCISE TAX ───────────────────────────────────────────────────────────

  "section 145":                   ["tobacco excise", "cigarette tax", "NIRC Sec. 145"],
  "cigarette excise tax":          ["tobacco excise", "cigarette tax", "NIRC Sec. 145", "section 145"],
  "tobacco excise":                ["tobacco excise", "cigarette tax", "NIRC Sec. 145", "section 145"],

  "section 143":                   ["alcohol excise", "NIRC Sec. 143", "fermented liquor distilled"],
  "alcohol excise tax":            ["alcohol excise", "NIRC Sec. 143", "section 143", "fermented liquor"],
  "fermented liquor distilled spirits":["alcohol excise", "NIRC Sec. 143", "section 143"],

  "section 148":                   ["petroleum excise", "NIRC Sec. 148", "fuel oil excise"],
  "petroleum excise tax":          ["petroleum excise", "NIRC Sec. 148", "section 148", "fuel oil excise"],
  "fuel oil excise":               ["petroleum excise", "NIRC Sec. 148", "section 148"],

  "section 149":                   ["automobile excise", "NIRC Sec. 149", "motor vehicle excise"],
  "automobile excise tax":         ["automobile excise", "NIRC Sec. 149", "section 149", "motor vehicle"],
  "motor vehicle excise":          ["automobile excise", "NIRC Sec. 149", "section 149"],

  "section 150(b)":                ["sweetened beverage", "NIRC Sec. 150", "sugar tax"],
  "sweetened beverage tax":        ["sweetened beverage", "sugar tax", "NIRC Sec. 150", "section 150(b)"],
  "sugar tax":                     ["sweetened beverage", "NIRC Sec. 150", "section 150(b)"],

  "section 151":                   ["mineral excise", "NIRC Sec. 151", "mining excise"],
  "mineral excise tax":            ["mineral excise", "NIRC Sec. 151", "section 151", "mining excise"],
  "mining excise":                 ["mineral excise", "NIRC Sec. 151", "section 151"],

  "section 150(a)":                ["cosmetic procedure", "NIRC Sec. 150", "aesthetic procedure tax"],
  "cosmetic procedure tax":        ["cosmetic procedure", "NIRC Sec. 150", "section 150(a)", "aesthetic"],

  "excise tax exemption":          ["excise tax exempt", "diplomatic exempt excise"],
  "diplomatic exemption excise":   ["excise tax exempt", "diplomatic exempt"],

  "section 130":                   ["removal marking excise", "NIRC Sec. 130"],
  "removal marking excise":        ["removal marking", "NIRC Sec. 130", "section 130"],

  "excise tax refund":             ["excise tax refund", "NIRC Sec. 204"],

  // ── PRESCRIPTION ─────────────────────────────────────────────────────────

  "section 203":                   ["3 year prescription", "NIRC Sec. 203", "ordinary prescriptive period"],
  "3 year prescriptive period":    ["3 year prescription", "NIRC Sec. 203", "section 203"],
  "ordinary prescription tax":     ["3 year prescription", "NIRC Sec. 203", "section 203"],
  "ordinary prescriptive period":  ["3 year prescription", "NIRC Sec. 203", "section 203"],

  "section 222(a)":                ["10 year prescription", "NIRC Sec. 222", "fraudulent false return"],
  "10 year prescription":          ["10 year prescription", "NIRC Sec. 222", "section 222(a)", "fraudulent return"],
  "fraudulent false return":       ["10 year prescription", "NIRC Sec. 222", "section 222(a)"],

  "waiver prescription":           ["waiver prescription", "RMO 20-90", "valid waiver requirements"],
  "rmo 20-90":                     ["waiver prescription", "RMO 20-90", "valid waiver"],
  "valid waiver requirements":     ["waiver", "RMO 20-90", "waiver prescription"],
  "rdao 05-01":                    ["waiver", "RDAO 05-01", "RMO 20-90"],

  "letter of authority":           ["letter of authority", "loa", "loa validity"],
  "loa validity":                  ["letter of authority", "loa", "letter notice BIR"],
  "letter notice bir":             ["letter notice", "loa", "letter of authority"],

  "section 228":                   ["pre-assessment notice", "pan", "NIRC Sec. 228", "tax assessment"],
  "pre-assessment notice":         ["pre-assessment notice", "pan", "NIRC Sec. 228", "section 228"],
  "pan":                           ["pre-assessment notice", "pan", "NIRC Sec. 228"],
  "final assessment notice fdda":  ["final assessment notice", "fdda", "NIRC Sec. 228"],

  "metro star superama":           ["metro star", "GR 185371", "due process assessment void"],
  "gr 185371":                     ["metro star", "GR 185371", "due process assessment"],
  "due process assessment void":   ["metro star", "GR 185371", "no pan void assessment"],

  "section 222(c)":                ["5 year collection prescription", "NIRC Sec. 222", "collection prescription"],
  "5 year collection prescription":["collection prescription", "NIRC Sec. 222", "section 222(c)"],
  "collection prescription":       ["collection prescription", "NIRC Sec. 222", "section 222(c)"],

  "tolling prescription":          ["tolling prescription", "interruption prescriptive period"],
  "interruption prescriptive period":["tolling prescription", "interruption"],

  "amended return prescription":   ["amended return prescription", "prescription amended"],
  "filing amended return":         ["amended return", "prescription amended"],

  "section 6(d)":                  ["jeopardy assessment", "NIRC Sec. 6", "immediate collection"],
  "jeopardy assessment":           ["jeopardy assessment", "NIRC Sec. 6", "section 6(d)", "immediate collection"],

  // ── TAX DISPUTE ──────────────────────────────────────────────────────────

  "tax protest":                   ["tax protest", "NIRC Sec. 228", "section 228", "30 day protest"],
  "30 day protest period":         ["tax protest", "NIRC Sec. 228", "section 228"],
  "formal letter of demand":       ["final assessment notice", "NIRC Sec. 228", "fdda"],

  "reconsideration reinvestigation":["reconsideration reinvestigation", "protest types", "submission documents"],
  "protest types":                 ["reconsideration reinvestigation", "protest types"],
  "submission documents protest":  ["reconsideration reinvestigation", "protest types"],

  "inaction 180 days":             ["inaction", "constructive denial", "180 days inaction", "NIRC Sec. 228"],
  "constructive denial":           ["inaction", "180 days inaction", "30 days cta appeal"],
  "30 days cta appeal":            ["inaction", "constructive denial", "cta appeal"],

  "court of tax appeals":          ["court of tax appeals", "cta", "petition for review cta", "RA 1125"],
  "cta division":                  ["court of tax appeals", "cta", "petition review", "RA 1125"],
  "petition for review cta":       ["court of tax appeals", "cta", "petition review"],
  "cta en banc":                   ["cta en banc", "appeal en banc cta"],
  "appeal en banc cta":            ["cta en banc", "court of tax appeals"],

  "supreme court tax":             ["supreme court", "certiorari tax", "rule 45 tax"],

  "section 204":                   ["compromise settlement", "abatement", "NIRC Sec. 204"],
  "compromise settlement":         ["compromise", "abatement", "NIRC Sec. 204", "section 204"],
  "abatement penalty":             ["abatement", "compromise", "NIRC Sec. 204", "section 204"],
  "doubtful validity":             ["compromise", "doubtful validity", "NIRC Sec. 204"],

  "tax amnesty":                   ["tax amnesty", "RA 11213", "immunity from prosecution"],
  "immunity from prosecution":     ["tax amnesty", "RA 11213"],

  "section 229":                   ["tax refund claim", "NIRC Sec. 229", "2 year refund period"],
  "tax refund claim":              ["tax refund", "NIRC Sec. 229", "section 229", "2 year refund"],
  "2 year refund period":          ["tax refund", "NIRC Sec. 229", "section 229"],

  "section 218":                   ["no injunction rule", "NIRC Sec. 218", "injunction tax"],
  "no injunction tax collection":  ["no injunction rule", "NIRC Sec. 218", "section 218"],
  "injunction tax":                ["no injunction rule", "NIRC Sec. 218", "section 218"],

  "section 254":                   ["criminal liability tax", "NIRC Sec. 254", "tax evasion"],
  "criminal liability tax":        ["criminal tax", "NIRC Sec. 254", "section 254", "tax evasion"],
  "tax evasion prosecution":       ["criminal tax", "NIRC Sec. 254", "section 254"]
};

// Standalone broad terms that must never appear as aliases (would pull unrelated results)
const BROAD_TERMS = new Set([
  "tax", "income", "vat", "nirc", "bir", "law", "rate", "code",
  "section", "sec", "act", "rule", "regulation", "memo", "circular"
]);

/**
 * Returns up to 6 retrieval aliases for a given topic string.
 * Aliases are formatted for ILIKE matching against normalized_reference,
 * document_title, and source columns.
 *
 * @param {string} topic - Normalized topic string (primaryQuery from buildRetrievalHints)
 * @returns {string[]} Array of specific alias strings (max 6, no broad terms)
 */
export function buildTaxConceptRetrievalAliases(topic = "") {
  const key = String(topic || "").toLowerCase().trim();
  if (!key || key.length < 3) return [];

  const raw = CONCEPT_ALIAS_MAP[key];
  if (!raw || !raw.length) return [];

  return raw
    .filter(a => {
      const lower = a.toLowerCase().trim();
      return lower.length >= 3 && !BROAD_TERMS.has(lower);
    })
    .slice(0, 6);
}
