# TINA Philippine Tax Fact-Check Evaluation Package

**Version:** 2.0

## Purpose

This package contains the necessary files to conduct a non-invasive, factual accuracy evaluation of the TINA AI platform on core Philippine tax law concepts. Its primary goal is to provide a standardized, repeatable methodology for testing TINA's knowledge and adherence to legal and regulatory sources.

## Source & Recency

- **Master Answer Key:** `tests/TINA_Tax_FactCheck_Answer_Key_v2.md`
- **Verified As Of:** July 1, 2026
- **Scope of Law:** This evaluation covers the National Internal Revenue Code (NIRC) as amended by major tax reforms including:
  - TRAIN (RA 10963)
  - CREATE (RA 11534)
  - EOPT (RA 11976)
  - CREATE MORE (RA 12066)
  - CMEPA (RA 12214)
  - Implementing Revenue Regulations (RR) and Revenue Memorandum Circulars (RMC) current through Q1 2026.

## How to Use

1.  **Review the Test Plan:** Start with `TINA_Tax_FactCheck_Test_Plan_v2.md` to understand the objectives and procedures.
2.  **Review the Test Cases:** Familiarize yourself with the 50 test cases in `TINA_Tax_FactCheck_Test_Cases_v2.md`.
3.  **Execute the Test:** Following the safe execution rules, query TINA for each of the 50 test cases.
4.  **Log Results:** Use `TINA_Tax_FactCheck_Run_Log_Template_v2.md` to create a new run log file (e.g., `Run_Log_YYYY-MM-DD.md`) and capture TINA's raw answers.
5.  **Score and Analyze:** Use the `TINA_Tax_FactCheck_Scoring_Rubric_v2.md` to score each answer in your run log.
6.  **Produce Report:** Summarize your findings using the `TINA_Tax_FactCheck_Evaluation_Report_Template_v2.md`.

## Governance

**STRICT RULE:** This is an evaluation-only procedure. No patches, commits, or deployments are to be made during the test. Any code or data changes must be proposed and approved separately after the evaluation is complete and reviewed.