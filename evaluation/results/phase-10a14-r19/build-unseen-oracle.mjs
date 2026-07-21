// PHASE-10A14-R19 — executor unseen campaign oracle.
// Authored AFTER the final runtime (COMMIT 3/3b) was frozen. Not used to design the
// patch. Reuses no complete sentence from the 567-row independent-review oracle or the
// 873-row R19 development oracle — verified programmatically below before freezing.
import fs from "node:fs";

const rows = [];
let n = 0;
const add = (coverageClass, text, expected) => {
  rows.push({ id: `R19-UNSEEN-${String(++n).padStart(4, "0")}`, coverageClass, text, expected });
};

// ── 1. Explicit tax controls (≥150) — must ALLOW ─────────────────────────────
const explicitTax = [
  "How is percentage tax computed for a non-VAT taxpayer?",
  "What is the deadline for filing quarterly income tax returns?",
  "Explain the difference between input tax and output tax.",
  "What documentation supports a claim for input VAT credit?",
  "How do I compute donor's tax on a gift of real property?",
  "What is the estate tax amnesty coverage period?",
  "When must a corporation register for VAT?",
  "What penalties apply for failure to withhold tax on compensation?",
  "How is fringe benefit tax computed for a company car?",
  "What is the de minimis threshold for rice subsidy benefits?",
  "Can a taxpayer amend a previously filed income tax return?",
  "What are the requirements for a valid tax treaty relief application?",
  "How does the BIR compute surcharge on a deficiency tax assessment?",
  "What is the venue for filing a judicial claim for tax refund?",
  "What triggers issuance of a Final Assessment Notice?",
  "How long does a taxpayer have to respond to a Preliminary Assessment Notice?",
  "What is the effect of a waiver of the statute of limitations on assessment?",
  "How is excise tax on cigarettes computed?",
  "What is the threshold for mandatory e-invoicing under EOPT?",
  "How do local government units impose real property tax?",
  "What is the tax treatment of stock dividends?",
  "How is creditable withholding tax applied to rental income?",
  "What is the process for securing a BIR tax clearance certificate?",
  "How does double taxation relief work under a tax treaty?",
  "What is the VAT treatment of export sales by a PEZA-registered enterprise?",
  "What are the requirements for claiming input tax on capital goods?",
  "How is the net taxable estate computed after deductions?",
  "What is the effect of late payment on interest computation for deficiency tax?",
  "What BIR form is used to report withholding tax on professional fees?",
  "How do I apply for a tax identification number as a self-employed individual?",
  "What is the coverage of the expanded withholding tax system?",
  "How does the BIR audit selection process work?",
  "What constitutes a valid electronic official receipt under BIR rules?",
  "What is the threshold for optional VAT registration?",
  "How is the holding period computed for long-term capital gains on shares?",
  "What is the tax base for documentary stamp tax on a loan agreement?",
  "How do cooperatives qualify for tax exemption under the Cooperative Code?",
  "What is the procedure for protesting a warrant of distraint and levy?",
  "How is percentage tax different from VAT for small businesses?",
  "What is the effect of a tax amnesty on pending BIR cases?",
  "How does the BIR compute compromise penalty for late registration?",
  "What is required to claim the optional standard deduction instead of itemized deductions?",
  "How is the fair market value of shares determined for capital gains tax?",
  "What is a certificate of no tax liability and when is it required?",
  "How does the BIR treat unclaimed input VAT after two years?",
  "What is the deadline to file a claim for tax credit certificate conversion?",
  "How is withholding tax on dividends computed for a resident foreign corporation?",
  "What is the process for BIR ruling requests on novel tax questions?",
  "How does the substituted filing system work for compensation earners?",
  "What is the tax treatment of separation pay due to redundancy?",
  "How is the gross selling price determined for VAT on real property sales?",
];
for (const t of explicitTax) add("explicit_tax", t, "ALLOW");
// pad to 150 with short, varied phrasings
const explicitTaxShort = [
  "withholding tax on professional fees", "quarterly VAT return filing", "estate tax amnesty coverage",
  "BIR compliance for freelancers", "creditable withholding certificate", "input tax credit rules",
  "percentage tax registration threshold", "documentary stamp tax on leases", "excise tax on fuel products",
  "final withholding tax on royalties", "tax clearance for government bidding", "VAT zero-rating for exporters",
  "capital gains tax on land sale", "donor's tax exemption threshold", "compromise penalty schedule",
  "BIR Form 2307 usage", "electronic filing and payment system", "tax mapping inspection procedure",
  "BIR ruling on VAT exemption", "deficiency interest computation", "amnesty on delinquent accounts",
  "PEZA fiscal incentive availment", "BOI income tax holiday qualification", "transfer pricing risk assessment",
  "related party transaction disclosure", "tax sparing credit application", "permanent establishment risk in PH",
  "CREATE Act incentive menu", "tax treaty relief for dividends", "input VAT refund processing time",
  "BIR audit notification letter", "PAN response period", "FAN protest deadline",
  "FDDA appeal to CTA", "judicial claim for VAT refund", "administrative claim prescriptive period",
  "estate tax return attachments", "donor's tax return filing", "capital gains tax return deadline",
  "documentary stamp tax on shares", "withholding tax on interest income", "final tax on prizes and winnings",
  "fringe benefit tax rate", "de minimis benefits list", "13th month pay tax exemption",
  "optional standard deduction election", "itemized deduction substantiation", "net operating loss carryover",
  "minimum corporate income tax relief", "improperly accumulated earnings tax",
  "branch profit remittance tax", "regional operating headquarters tax", "offshore banking unit taxation",
  "tax-free exchange of property", "merger and consolidation tax relief", "spin-off tax treatment",
  "installment sale tax reporting", "deferred payment sale of real property", "VAT on lease of commercial space",
  "zero-rated sale to PEZA locator", "effectively zero-rated sale documentation", "input tax attribution rules",
  "advance VAT on sugar importation", "creditable withholding tax on government payments", "VAT on digital services",
  "withholding tax on non-resident aliens", "final tax on capital gains from unlisted shares",
  "estate tax deduction for family home", "vanishing deduction on property", "claims against the estate deduction",
  "medical expenses deduction for decedent", "funeral expenses deduction limit", "judicial expenses deduction estate",
  "standard deduction for estate tax", "donor's tax rate for strangers", "donor's tax exemption for dowry",
  "gift tax on relatives versus strangers", "BIR Form 1701 filing", "BIR Form 1702 corporate filing",
  "quarterly percentage tax return", "annual registration fee for business", "authority to print receipts",
  "computerized accounting system accreditation", "loose-leaf books of accounts permit",
  "electronic bookkeeping requirements", "VAT relief data entry requirements", "alphalist attachment format",
  "SAWT summary alphalist withholding tax", "MAP monthly alphalist of payees", "BIR eFPS enrollment steps",
  "eBIRForms offline package", "online registration and update system", "TIN verification service",
  "authority for tax exemption for non-stock non-profit", "tax exemption ruling renewal",
  "advance income tax payment for shipping lines", "improperly accumulated profits surtax",
  "tax treatment of employee stock options", "creditable withholding tax on construction contracts",
];
for (const t of explicitTaxShort) add("explicit_tax", `What is the rule on ${t}?`, "ALLOW");
const explicitTaxMore = [
  "How do I compute the tax due on a mixed-income earner's return?",
  "What is the effect of a BIR letter notice on a taxpayer's filing?",
  "How does the BIR treat unreported income discovered during audit?",
  "What is the difference between a tax credit and a tax deduction?",
  "How is the taxable base for local business tax determined for a manufacturer?",
];
for (const t of explicitTaxMore) add("explicit_tax", t, "ALLOW");

// ── 2. Explicit non-tax controls (≥150) — must NOT_ALLOW ─────────────────────
const explicitNonTax = [
  "What is the boiling point of water at sea level?",
  "Explain how photosynthesis converts sunlight into energy.",
  "What is the plot of the latest superhero movie?",
  "How do I train for a half marathon?",
  "What ingredients go into a classic carbonara?",
  "Who directed the award-winning film last year?",
  "What is the best way to learn a new language?",
  "How do I fix a leaking kitchen faucet?",
  "What is quantum entanglement in simple terms?",
  "How do I set up a home wireless network?",
  "What are the rules of chess castling?",
  "How do I propagate a succulent from a leaf cutting?",
  "What is the history of the Roman Colosseum?",
  "How does a car's transmission system work?",
  "What are the symptoms of seasonal allergies?",
  "How do I write a compelling short story?",
  "What is the difference between a crocodile and an alligator?",
  "How do I improve my public speaking skills?",
  "What are the primary colors in painting?",
  "How does GPS determine your location?",
  "What is the tallest mountain in the world?",
  "How do I bake a sourdough loaf from scratch?",
  "What causes a rainbow to appear after rain?",
  "How do I organize a bookshelf by genre?",
  "What is the migration pattern of monarch butterflies?",
  "How do I meditate for beginners?",
  "What are common houseplant care mistakes?",
  "How does a refrigerator keep food cold?",
  "What is the origin of the game of chess?",
  "How do I choose running shoes for flat feet?",
  "What is the difference between a virus and a bacterium?",
  "How do solar panels convert sunlight to electricity?",
  "What are the stages of a butterfly's life cycle?",
  "How do I plan a backpacking trip through Europe?",
  "What is the etiquette for a formal dinner party?",
  "How do I compose a haiku poem?",
  "What causes jet lag and how do I minimize it?",
  "How do I train a puppy to sit and stay?",
  "What is the significance of the Mona Lisa in art history?",
  "How does an electric guitar produce sound?",
  "What is the best way to store fresh herbs?",
  "How do I calculate my body mass index?",
  "What is the difference between weather and climate?",
  "How do I set up a compost bin at home?",
  "What are the basic rules of volleyball?",
  "How do I whiten my teeth naturally?",
  "What is the process of making cheese from milk?",
  "How do I choose a good camping tent?",
  "What is the lifecycle of a star?",
  "How do I remove a wine stain from carpet?",
  "What are the benefits of interval training?",
];
for (const t of explicitNonTax) add("explicit_non_tax", t, "NOT_ALLOW");
const explicitNonTaxShort = [
  "sourdough starter maintenance", "marathon pace strategy", "houseplant watering schedule",
  "guitar string replacement", "watercolor painting technique", "vegetable garden crop rotation",
  "yoga breathing exercises", "car oil change interval", "bicycle chain lubrication",
  "chess opening theory", "poker hand rankings", "board game night planning",
  "movie marathon snack ideas", "book club discussion questions", "photography composition rules",
  "hiking trail difficulty rating", "campfire cooking recipes", "kayak paddling technique",
  "swimming stroke form", "rock climbing grip strength", "surfing wave etiquette",
  "skateboard trick progression", "snowboard binding adjustment", "ice skating balance tips",
  "origami folding patterns", "knitting stitch types", "pottery wheel centering technique",
  "woodworking joint types", "furniture refinishing steps", "home painting color scheme",
  "interior design lighting tips", "landscaping plant selection", "lawn mower maintenance",
  "pool chemical balance", "aquarium fish compatibility", "bird feeder placement",
  "beekeeping hive inspection", "vineyard grape harvesting", "coffee roasting profile",
  "tea brewing temperature", "wine pairing with cheese", "cocktail mixing ratios",
  "bread proofing time", "pasta dough hydration", "grilling temperature control",
  "smoking meat technique", "baking pan substitution", "cake decorating piping tips",
  "candle wax melting point", "soap making lye safety", "perfume scent layering",
  "makeup contouring technique", "skincare routine order", "hair braiding styles",
  "nail polish application", "tattoo aftercare instructions", "piercing healing time",
  "dog leash training", "cat litter box placement", "fish tank cycling process",
  "hamster wheel size", "rabbit diet requirements", "horse riding posture",
  "car detailing wax type", "motorcycle helmet fitting", "bicycle gear shifting",
  "kite flying wind speed", "drone flight regulations for hobbyists", "model rocket launch safety",
  "telescope focal length", "star constellation identification", "weather forecasting symbols",
  "cloud type classification", "volcano eruption stages", "earthquake magnitude scale",
  "tide pool ecosystem", "coral reef bleaching causes", "rainforest canopy layers",
  "desert survival tips", "mountain altitude sickness", "cave exploration safety",
  "museum exhibit curation", "art gallery lighting", "sculpture material choice",
  "theater stage blocking", "orchestra seating chart", "choir vocal warmup",
  "dance choreography counts", "ballet barre exercises", "tap dance rhythm patterns",
  "juggling three balls", "unicycle balance practice", "magic trick misdirection",
  "puppet show scriptwriting", "circus tent rigging", "clown makeup application",
];
for (const t of explicitNonTaxShort) add("explicit_non_tax", `What is the best approach to ${t}?`, "NOT_ALLOW");
const explicitNonTaxMore = [
  "How do I plan a surprise birthday party for a friend?",
  "What is the correct way to fold a fitted bed sheet?",
  "How do I choose the right size bicycle frame?",
  "What is the difference between a novel and a novella?",
  "How do I set up a tent in windy conditions?",
  "What is the best way to declutter a closet?",
  "How do I train for my first triathlon?",
  "What causes static electricity on a dry day?",
  "How do I pick ripe avocados at the market?",
];
for (const t of explicitNonTaxMore) add("explicit_non_tax", t, "NOT_ALLOW");

// ── 3. Acronym / homograph traps (≥150) — mix of ALLOW and NOT_ALLOW ─────────
const acronymTrapPairs = [
  ["What is the LGU tax rate for our municipality?", "Our LGU (little green ufo) mascot won the parade contest."],
  ["What is the CGT due on the sale of unlisted shares?", "The CGT (community garden team) meets every Saturday morning."],
  ["What is the ITH availment period for a new PEZA locator?", "The ITH thermostat in our lobby needs recalibration."],
  ["What SCIT rate applies after the ITH period ends?", "SCIT is the mascot name for our university robotics club."],
  ["What is a DTA relief application for dividend income?", "The DTA (drive-thru attendant) forgot my order today."],
  ["What NIC number identifies a specific BIR notice?", "The NIC (network interface card) in my PC needs a driver update."],
  ["What is a CTA petition for review filing fee?", "The CTA (closed to auto) sign is posted at the intersection."],
  ["What LOA scope limitation applies to a tax audit?", "The LOA (letter of acceptance) for my job offer arrived today."],
  ["What eLA replacement procedure applies mid-audit?", "The eLA (electronic learning app) crashed during the exam."],
  ["What FDDA appeal period applies after receipt?", "FDDA is the abbreviation my classmates use for our dance crew."],
  ["What NIRC provision governs withholding on royalties?", "NIRC doesn't ring a bell for anyone in our study group."],
  ["What RMC clarified the VAT treatment of digital goods?", "RMC 96.7 is my favorite easy-listening radio station."],
  ["What RR governs the imposition of DST on loan documents?", "RR Martinez is a popular character in the telenovela."],
  ["What RMO outlines the audit program for large taxpayers?", "RMO stands for nothing in our vocabulary at the workshop."],
  ["What BOC bonded warehouse rule applies to bonded goods?", "Our BOC (battle of the classes) event is next Friday."],
  ["What CMTA provision covers seizure of smuggled goods?", "CMTA doesn't mean anything to our book club."],
  ["What TIN issuance rule applies to a one-time taxpayer?", "The TIN roof on the old barn needs replacing."],
  ["What ITR schedule reports passive income separately?", "ITR isn't an acronym we use in our gardening group."],
  ["What eFPS payment deadline applies to large taxpayers?", "eFPS is a random config flag in our test suite."],
  ["What FIRB approval threshold applies to tax incentives?", "FIRB is the nickname of my neighbor's parrot."],
  ["What BOI registration category covers pioneer status?", "BOI stands for nothing meaningful in my crossword puzzle."],
  ["What PEZA export requirement applies to a locator firm?", "PEZA doesn't mean anything in our trivia night categories."],
  ["What LBT rate applies to a wholesaler under the LGC?", "LBT isn't a term used in our accounting club at school."],
  ["What RPT idle land surcharge applies under the LGC?", "RPT doesn't come up in our hobby forum discussions."],
  ["What FLD computation includes accrued interest?", "FLD is the shorthand my coworkers use for 'friendly local diner'."],
  ["What PAN response deadline applies before a FAN issues?", "PAN is just the brand name of our new cookware set."],
  ["What FAN protest period applies before an FDDA issues?", "FAN mail from listeners keeps arriving at the radio station."],
  ["What SLSP format applies to a quarterly VAT filer?", "SLSP isn't an acronym anyone recognizes on our engineering team."],
  ["What OSD computation limit applies to gross sales?", "OSD is the setting menu on our new projector."],
  ["What Alphalist attachment applies to withholding agents?", "Alphalist isn't a term used in our library cataloging system."],
  ["What MCIT relief applies during the pandemic recovery period?", "MCIT isn't a term used on our factory floor."],
  ["What RCIT rate applies to a proprietary educational institution?", "RCIT doesn't come up in our chess tournament bracket names."],
  ["What DST rate applies to an original issue of shares?", "DST just means the clocks change tonight, nothing more."],
  ["What VAT invoicing rule applies to a mixed transaction?", "VAT is simply the paint swatch code on our color chart."],
  ["What BOC valuation method applies to imported vehicles?", "BOC stands for nothing on our trivia night answer sheet."],
  ["What customs bonded manufacturing rule applies here?", "Local customs at the festival include a lantern parade."],
  ["What gross estate inclusion rule applies to life insurance proceeds?", "The gross estate sale sign outside looks like a bad pun for a yard sale."],
  ["What prescriptive period applies to a false or fraudulent return?", "My prescription glasses need a stronger lens this year."],
  ["What transfer pricing method applies to intercompany loans?", "Transfer pricing came up as a rule in our fantasy trading card game."],
  ["What permanent establishment test applies to a service PE?", "The permanent establishment of the food truck is just its usual parking spot."],
  ["What registered business enterprise incentive applies post-CREATE?", "Our registered business enterprise for the school fair is a lemonade stand."],
  ["What compromise offer percentage applies to a criminal violation case?", "My compromise offer to split the pizza evenly was accepted."],
  ["What reconsideration ground applies to a denied refund claim?", "I requested reconsideration of my parking ticket from the office."],
  ["What informal conference notice period applies before a PAN?", "The informal conference room booking conflicted with our team meeting."],
  ["What import duty exemption applies to returning residents?", "The import duty scene in this adventure game is oddly detailed."],
  ["What Bureau of Customs accreditation applies to brokers?", "The Bureau of Customs mural downtown is a popular photo spot."],
  ["What capital gain holding period applies to real property classified as capital asset?", "The capital gain knob on this vintage amplifier boosts the treble."],
  ["What deficiency interest rate applies after TRAIN law amendments?", "My vitamin deficiency test results came back normal."],
  ["What surcharge percentage applies to willful neglect to file?", "The airline's baggage surcharge caught me off guard."],
  ["What official receipt numbering rule applies to a new business?", "The receipt printer at our garage sale keeps jamming."],
  ["What annual information return covers one-time transactions?", "Our club's annual report just lists membership dues collected."],
  ["What refund claim documentary requirement applies to erroneous payment?", "My eyeglass prescription refill takes two weeks at the clinic."],
];
for (const [tax, nonTax] of acronymTrapPairs) {
  add("acronym_homograph_trap", tax, "ALLOW");
  add("acronym_homograph_trap", nonTax, "NOT_ALLOW");
}
const acronymTrapExtra = [
  ["Is a CTA petition subject to a docket fee?", "ALLOW"], ["What does CTA stand for in web design buttons?", "NOT_ALLOW"],
  ["What is the FLD due date after PAN reply?", "ALLOW"], ["FLD is the abbreviation for our fantasy league draft.", "NOT_ALLOW"],
  ["What BIR office handles a specific RDO's taxpayers?", "ALLOW"], ["Our RDO stands for 'really delicious oatmeal' as a joke.", "NOT_ALLOW"],
  ["What EWT rate applies to rental of properties?", "ALLOW"], ["EWT isn't an acronym used on our esports team.", "NOT_ALLOW"],
  ["What FWT rate applies to interest on bank deposits?", "ALLOW"], ["FWT means nothing to our knitting circle.", "NOT_ALLOW"],
  ["What TCVD focus industries were announced this year?", "ALLOW"], ["TCVD is the license plate on my uncle's old truck.", "NOT_ALLOW"],
  ["What RATE case classification applies to large-scale evasion?", "ALLOW"], ["The song's RATE feels slower in this remix.", "NOT_ALLOW"],
  ["What compromise penalty schedule applies to late registration?", "ALLOW"], ["Our team's compromise on lunch spots took forever.", "NOT_ALLOW"],
  ["What SCIT registration deadline applies to existing PEZA firms?", "ALLOW"], ["SCIT is just a nonsense word my kids made up for a game.", "NOT_ALLOW"],
  ["What ITH extension applies to a pioneer enterprise?", "ALLOW"], ["The ITH light on the dashboard means low tire pressure, not tax.", "NOT_ALLOW"],
  ["What DTA benefit applies to a resident of a treaty partner country?", "ALLOW"], ["DTA is the callsign of my favorite podcast.", "NOT_ALLOW"],
  ["What BIR NIC letter format is used to schedule a conference?", "ALLOW"], ["My computer's NIC card was replaced last week for gaming.", "NOT_ALLOW"],
  ["What is the FIRB threshold for VAT incentive approval?", "ALLOW"], ["FIRB is the name of the goldfish in my classroom aquarium.", "NOT_ALLOW"],
  ["What LBT exemption applies to a barangay micro business enterprise?", "ALLOW"], ["LBT isn't a term that comes up in our cooking class.", "NOT_ALLOW"],
  ["What RPT special levy funds the local school building program?", "ALLOW"], ["RPT doesn't mean anything in our stamp collecting hobby.", "NOT_ALLOW"],
  ["What CMTA penalty applies to misdeclaration of imported goods?", "ALLOW"], ["CMTA is just the name tag on my locker at the gym.", "NOT_ALLOW"],
  ["What eFPS validation error applies to a duplicate filing?", "ALLOW"], ["eFPS is a placeholder variable name in my unfinished code.", "NOT_ALLOW"],
  ["What BOI registration renews annually for a pioneer project?", "ALLOW"], ["BOI is the mascot nickname for our intramurals team.", "NOT_ALLOW"],
  ["What VAT deferral applies to importation of capital equipment?", "ALLOW"], ["VAT is the shorthand my sister uses for 'very avid traveler'.", "NOT_ALLOW"],
  ["What TIN card replacement process applies after loss?", "ALLOW"], ["TIN roofing sheets are on sale at the hardware store.", "NOT_ALLOW"],
  ["What BIR examiner authority is limited to the LOA period covered?", "ALLOW"], ["BIR is just a mispronunciation of 'beer' at the party.", "NOT_ALLOW"],
  ["What NIRC amendment introduced the EOPT simplifications?", "ALLOW"], ["NIRC is not a word in our vocabulary quiz bank.", "NOT_ALLOW"],
  ["What RMO governs the conduct of a tax compliance check?", "ALLOW"], ["RMO isn't recognized in our fishing club abbreviations.", "NOT_ALLOW"],
];
for (const [t, e] of acronymTrapExtra) add("acronym_homograph_trap", t, e);

// ── 4. Ambiguous controls (≥100) — must NOT_ALLOW (clarify or reject) ────────
const ambiguous = [
  "What is due?", "What is owed?", "What is the amount?", "What is required?",
  "What is the basis?", "What is covered?", "What is included?", "What is excluded?",
  "What is the treatment?", "What is the classification?", "What is the category?",
  "What is the standard?", "What is the limit?", "What is the ceiling?", "What is the floor?",
  "What is the scope?", "What is the coverage?", "Who qualifies?", "Who is liable?",
  "Who is exempt?", "Is it mandatory?", "Is it optional?", "Is it required?",
  "Is it allowed?", "Is it valid?", "Is it final?", "Is it binding?",
  "Is it enforceable?", "Is it appealable?", "What is the process?", "What is the procedure?",
  "What is the timeline?", "What is the schedule?", "What is the cutoff?", "What is the threshold?",
  "What is the trigger?", "What is the condition?", "What is the requirement?", "What form is used?",
  "What document is needed?", "What proof is required?", "How is it computed?", "How is it filed?",
  "How is it paid?", "How is it reported?", "How is it disclosed?", "How is it verified?",
  "When does it start?", "When does it end?", "When is it due?", "When is it effective?",
  "Where is it filed?", "Where is it submitted?", "What is the fee?", "What is the rate?",
  "What is the percentage?", "What is the interest?", "What penalty amount is imposed?", "What is the fine?",
  "What is the sanction?", "What happens if late?", "What happens if missed?", "What is the remedy?",
  "What is the recourse?", "Can it be extended?", "Can it be waived?", "Can it be reduced?",
  "Can it be contested?", "Can it be revoked?", "Can it be renewed?", "What is the basis for computation?",
  "What is the applicable period?", "What documents support the claim?", "What is the effective date of the change?",
  "What is the ruling on this matter?", "What is the interpretation?", "What is the guidance?",
  "What is the policy?", "What is the regulation?", "What circular applies?", "What memorandum applies?",
  "What order applies?", "What is the reference number?", "What office handles this?", "What agency is responsible?",
  "What is the jurisdiction?", "What court has authority?", "What tribunal decides this?", "What is the venue?",
  "What is the applicable law?", "What section applies?", "What chapter covers this?", "What article governs this?",
  // "exemption threshold" is a pre-existing (pre-R19) strong anchor for the VAT
  // registration threshold, not an ambiguous phrase; using "qualification" instead here.
  "What is the general rule?", "What is the exception?", "What is the general qualification?", "What qualifies as an exemption?",
  "What is the base amount?", "What multiplier applies?", "What is the factor?", "What is the ratio?",
  "What is the maximum?", "What is the minimum?", "Is there a grace period?", "What is the grace period?",
];
for (const t of ambiguous) add("ambiguous", t, "NOT_ALLOW");

// ── 5. Filipino / Taglish controls (≥80) ──────────────────────────────────────
const filipinoTax = [
  "Ano ang rate ng withholding tax sa upa?", "Paano mag-claim ng refund sa BIR?",
  "Kailan ang huling araw ng pag-file ng quarterly return?", "Ano ang epekto ng late payment sa buwis?",
  "Paano kinakalkula ang estate tax sa mana?", "Ano ang requirements para sa VAT registration?",
  "Sino ang kailangang mag-withhold ng expanded withholding tax?", "Paano mag-apply ng tax amnesty?",
  "Ano ang penalty kung hindi nag-file ng ITR?", "Paano kumuha ng tax clearance certificate?",
  "Ano ang ibig sabihin ng zero-rated sale para sa VAT?", "Paano mag-compute ng capital gains tax sa lupa?",
  "Ano ang proseso ng pag-apela sa BIR assessment?", "Kailangan ba ng resibo para sa business expense?",
  "Paano mag-renew ng BIR registration taun-taon?", "Ano ang epekto ng waiver sa prescriptive period?",
  "Paano mag-file ng amended return sa BIR?", "Ano ang requirements ng official receipt sa negosyo?",
  "Paano kumuha ng TIN bilang self-employed?", "Ano ang mga kasamang dokumento sa VAT refund claim?",
  "Paano gamitin ang eFPS sa pagbabayad ng buwis?", "Ano ang schedule ng percentage tax filing?",
  "Paano protestahan ang isang deficiency assessment?", "Ano ang basehan ng computation ng donor's tax?",
  "Ano ang requirements para maging VAT-registered?", "Paano mag-file ng SLSP kada quarter?",
  "Ano ang OSD at paano ito gamitin sa deductions?", "Paano mag-request ng reconsideration sa BIR?",
  "Ano ang official receipt requirement para sa maliit na negosyo?", "Paano mag-ayos ng books of accounts?",
  "Ano ang MCIT at kailan ito ginagamit?", "Paano mag-avail ng income tax holiday sa PEZA?",
  "Ano ang gross estate para sa computation ng estate tax?", "Paano mag-claim ng transfer pricing documentation?",
  "Ano ang prescriptive period para sa refund claim?", "Paano mag-compute ng surcharge sa late filing?",
];
for (const t of filipinoTax) add("filipino_taglish", t, "ALLOW");
const filipinoNonTax = [
  "Ano ang pinakamasarap na putahe sa Pilipinas?", "Paano mag-alaga ng halaman sa bahay?",
  "Ano ang kasaysayan ng Rizal Park?", "Paano mag-swimming nang tama?",
  "Ano ang pinakamahusay na paraan ng pag-aaral?", "Paano mag-ayos ng silid-tulugan?",
  "Ano ang kailangan para sa isang camping trip?", "Paano mag-drive sa mabigat na trapiko?",
  "Ano ang pinakabagong kanta sa radyo?", "Paano magluto ng adobo nang tama?",
  "Ano ang kasaysayan ng Barasoain Church?", "Paano mag-aral ng ibang wika?",
  "Ano ang pinakamagandang lugar bakasyunan sa Cebu?", "Paano mag-alaga ng aso sa bahay?",
  "Ano ang mga sikat na palabas sa TV ngayon?", "Paano mag-ehersisyo tuwing umaga?",
  "Ano ang mga tradisyon sa Pasko sa Pilipinas?", "Paano mag-ayos ng hardin sa bakuran?",
  "Ano ang pinakamahusay na paraan ng pagluluto ng kanin?", "Paano mag-organisa ng aparador?",
  "Ano ang kasaysayan ng jeepney sa Maynila?", "Paano mag-alaga ng isda sa aquarium?",
  "MCIT ba ay uri ng laro sa telepono?", "SLSP ba ay codename lang ng proyekto naming software?",
  "Ano ang pinakamagandang kanta ni Ben&Ben?", "Paano gumawa ng homemade ice cream?",
  "Ano ang tamang paraan ng pagbuhos ng kape?", "Paano mag-ayos ng sirang gripo sa banyo?",
  "Ano ang kasaysayan ng EDSA Shrine?", "Paano mag-alaga ng orchids sa hardin?",
  "Ano ang mga tanawin sa Batanes?", "Paano mag-drive ng manual transmission?",
  "Ano ang OSD ba yan ay setting lang sa TV monitor?", "BIR ba yan ay ibon lang na hindi ko na-spell nang tama?",
  "FAN ba yan ay bentilador lang sa kwarto ko?", "PAN ba yan ay kawali lang sa kusina namin?",
  "RMC ba yan ay istasyon lang ng radyo na paborito ko?", "customs ba yan ay tradisyon lang sa kasal?",
  "Ano ang tamang paraan ng pag-file ng kuko?", "Paano mag-ayos ng kama nang maayos?",
  "Ano ang pinakamahusay na sapatos pantakbo?", "Paano mag-imbak ng gulay sa refrigerator?",
  "Ano ang pinakamagandang lugar para mag-picnic?", "Paano mag-empake para sa paglalakbay?",
];
for (const t of filipinoNonTax) add("filipino_taglish", t, "NOT_ALLOW");

// ── 6. Metamorphic pairs (≥40 pairs = 80 rows) ────────────────────────────────
const metamorphicPairs = [
  ["What is the DST rate on an original issue of shares?", "What time does DST end in the fall?"],
  ["What is the tax treatment of a merger under Section 40(C)(2)?", "What is a corporate merger in a business simulation game?"],
  ["What CTA division has jurisdiction over this case?", "What CTA copy converts best on this landing page?"],
  ["What is a valid LOA scope for a full audit?", "What is the LOA I received for my scholarship application?"],
  ["What FAN elements are required for validity?", "What FAN speed setting cools the room fastest?"],
  ["What PAN must state to be valid?", "What PAN size fits a dozen cupcakes?"],
  ["What TIN format applies to corporations versus individuals?", "What TIN metal alloy is used in this can?"],
  ["What RR governs invoicing requirements post-EOPT?", "What RR character appears in this weekend's episode?"],
  ["What RMC clarifies the VAT zero-rating documentary requirements?", "What RMC playlist do you listen to while driving?"],
  ["What BOC memorandum order covers de minimis importation?", "What BOC song is trending on the radio?"],
  ["What customs duty rate applies to imported steel?", "What customs are observed during a traditional wedding?"],
  ["What is capital gains tax on a sale of a capital asset?", "What is the capital gain knob setting on this mixer?"],
  ["What is a gross estate deduction for funeral expenses?", "What is the gross estate sale advertised on that lawn sign?"],
  ["What prescriptive period applies to a BIR assessment?", "What is my dentist's prescription for teeth whitening?"],
  ["What is a compromise penalty schedule for late filing?", "What is our team's compromise for the project deadline?"],
  ["What informal conference precedes a formal assessment?", "What informal outfit is appropriate for the office party?"],
  ["What is a reconsideration request format for a denied claim?", "What is the reconsideration process for my college application?"],
  ["What Formal Letter of Demand triggers a 30-day appeal period?", "What formal letter format is used for a resignation?"],
  ["What transfer pricing documentation is required annually?", "What transfer pricing rule applies in this trading card game?"],
  ["What permanent establishment risk arises from a dependent agent?", "What permanent establishment does this pop-up shop have downtown?"],
  ["What registered business enterprise benefits from CREATE incentives?", "What registered business enterprise sponsors the school fun run?"],
  ["What import duty applies to used machinery?", "What import duty level does this video game quest require?"],
  ["What Bureau of Customs form is filed for import entry?", "What Bureau of Customs statue stands at the port entrance?"],
  ["What deficiency assessment interest rate currently applies?", "What deficiency in my diet is causing this fatigue?"],
  ["What surcharge applies for willful failure to file?", "What surcharge does the ride-hailing app add during rush hour?"],
  ["What official receipt series is required for a new store?", "What receipt paper size fits this old cash register?"],
  ["What annual information return is required from a withholding agent?", "What annual return does our reading club submit to the library?"],
  ["What refund claim prescriptive period applies to erroneous VAT payment?", "What is the refill schedule for my allergy prescription?"],
  ["What is the MCIT rate for a domestic corporation this year?", "What is the MCIT code stamped on this random shipping label?"],
  ["What is the RCIT rate after the CREATE Act reduction?", "What is the RCIT abbreviation used in our robotics club logs?"],
  ["What SLSP submission format does BIR require quarterly?", "What SLSP codename does our unreleased mobile app use?"],
  ["What OSD percentage applies to gross sales for individuals?", "What OSD menu option adjusts my monitor brightness?"],
  ["What Alphalist schedule accompanies the annual return?", "What alphalist of surnames did the teacher post on the board?"],
  ["What FLD amount includes accrued surcharge and interest?", "What FLD stands for in our fantasy football league?"],
  ["What BOC valuation applies to a used vehicle import?", "What BOC trivia question stumped the whole team?"],
  ["What VAT invoice details are mandatory under RR 16-2005?", "What VAT color shade did the designer choose for the logo?"],
  ["What input VAT is creditable against output VAT this quarter?", "What input field validates VAT-formatted text in this form?"],
  ["What taxable compensation income excludes de minimis benefits?", "What taxable class selector styles this button in CSS?"],
  ["What gross receipts tax applies to a bank's interest income?", "What gross receipts did the school fair raffle raise this year?"],
  ["What books of accounts must a VAT-registered taxpayer maintain?", "What books of account fiction novels are on the bestseller list?"],
];
for (const [taxSide, nonTaxSide] of metamorphicPairs) {
  add("metamorphic", taxSide, "ALLOW");
  add("metamorphic", nonTaxSide, "NOT_ALLOW");
}

// ── Dedup check against prior oracles ─────────────────────────────────────────
const priorTexts = new Set();
const ir18 = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r19/PRE_FIX_567_ORACLE_REFERENCE.json", "utf8"));
for (const r of ir18.rows) priorTexts.add(r.text.toLowerCase().trim());
const devOracle = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r19/R19_DEVELOPMENT_ORACLE.json", "utf8"));
for (const r of devOracle.rows) priorTexts.add(r.text.toLowerCase().trim());

const dupes = rows.filter((r) => priorTexts.has(r.text.toLowerCase().trim()));
if (dupes.length > 0) {
  console.error(`REUSED SENTENCES DETECTED — refusing to freeze (${dupes.length}):`);
  dupes.forEach((d) => console.error("  ", d.id, JSON.stringify(d.text)));
  process.exit(1);
}

// ── Internal consistency invariant ────────────────────────────────────────────
const byText = new Map();
for (const r of rows) {
  const k = r.text.toLowerCase();
  if (!byText.has(k)) byText.set(k, []);
  byText.get(k).push(r);
}
const contradictions = [...byText.values()].filter((v) => new Set(v.map((r) => r.expected)).size > 1);
if (contradictions.length > 0) {
  console.error("ORACLE CONTRADICTION — refusing to freeze:", JSON.stringify(contradictions, null, 2));
  process.exit(1);
}

const counts = {};
for (const r of rows) counts[r.coverageClass] = (counts[r.coverageClass] || 0) + 1;

const oracle = {
  task: "PHASE-10A14-R19",
  frozen: true,
  frozenAt: new Date().toISOString(),
  note: "Authored AFTER the R19 final runtime was frozen (COMMIT 3/3b). Not used to design the patch. Verified programmatically to reuse no complete sentence from the 567-row independent-review oracle or the 873-row R19 development oracle.",
  noReuseVerified: true,
  requiredMinimums: {
    explicit_tax: 150, explicit_non_tax: 150, acronym_homograph_trap: 150,
    ambiguous: 100, filipino_taglish: 80, metamorphic: 80
  },
  counts,
  total: rows.length,
  rows
};
fs.writeFileSync("evaluation/results/phase-10a14-r19/R19_EXECUTOR_UNSEEN_ORACLE.json", JSON.stringify(oracle, null, 2) + "\n");
console.log("total:", oracle.total);
console.log(JSON.stringify(counts, null, 1));

