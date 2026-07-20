import {
  detectPhilippineTaxBoundary,
} from "../../../services/philippine-tax-domain-boundary.js";

const cases = [
  {
    id: "IR-SEM-001",
    expected: true,
    text:
      "For BIR withholding tax, if the deadline falls on a holiday, should I file on the next business day?",
  },
  {
    id: "IR-SEM-002",
    expected: true,
    text:
      "Please check if our VAT return due date changes when the last day lands on a Sunday.",
  },
  {
    id: "IR-SEM-003",
    expected: true,
    text:
      "Sa BIR Form 1701Q, next working day ba ang deadline kung holiday ang original due date?",
  },
  {
    id: "IR-SEM-004",
    expected: true,
    text:
      "Corporate income tax payment: if the due date is a weekend, does the deadline move?",
  },
  {
    id: "IR-SEM-005",
    expected: true,
    text:
      "For percentage tax in the Philippines, what happens to the filing deadline during a declared non-working day?",
  },
  {
    id: "IR-SEM-006",
    expected: false,
    text:
      "My passport appointment is on a holiday. Can I move it to the next working day?",
  },
  {
    id: "IR-SEM-007",
    expected: false,
    text:
      "When a school assignment is due on Sunday, should the teacher accept it Monday?",
  },
  {
    id: "IR-SEM-008",
    expected: false,
    text:
      "For a private lease payment, does the weekend rule automatically extend my deadline?",
  },
  {
    id: "IR-SEM-009",
    expected: false,
    text:
      "Can a court filing deadline that falls on a holiday be moved to the next business day?",
  },
  {
    id: "IR-SEM-010",
    expected: false,
    text:
      "If my HR payroll cutoff lands on a holiday, is it due next working day?",
  },
];

const results = cases.map((entry) => {
  const classification = detectPhilippineTaxBoundary(entry.text, "/ask");
  const actual = classification.isPhilippineTax;
  return {
    id: entry.id,
    expected: entry.expected,
    actual,
    decision: classification.decision,
    reason: classification.reason,
    passed: actual === entry.expected,
  };
});

const failed = results.filter((entry) => !entry.passed);

console.log(JSON.stringify({
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
}, null, 2));

if (failed.length) {
  process.exitCode = 1;
}
