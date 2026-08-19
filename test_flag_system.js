const {
  evaluateInvoiceValidation,
  evaluateDatasetValidation,
  REASON_CODES
} = require('./extractors/flagReasonEngine');

console.log("=================================================");
console.log("RUNNING ACCEPTANCE TESTS FOR FLAG REASON SYSTEM");
console.log("=================================================\n");

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName) {
  totalCount++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// Test Case 1: Valid PDF Invoice
console.log("--- Test Case 1: Valid PDF Invoice ---");
const validInvoice = {
  vendor: "NORTHSTAR LOGISTICS",
  invoiceNumber: "NSL-2026-4821",
  date: "2026-08-19",
  dueDate: "2026-09-18",
  subtotal: 1000.00,
  tax: 100.00,
  shipping: 0.00,
  total: 1100.00,
  lineItems: [
    { lineNumber: 1, description: "Freight Transport Services", quantity: 1, unitPrice: 1000.00, discountPercent: 0, amount: 1000.00 }
  ]
};

const res1 = evaluateInvoiceValidation(validInvoice, { threshold: 85 });
assert(res1.status === 'PROCESSED', "Valid PDF invoice status should be PROCESSED");
assert(res1.flagReasons.length === 0, "Valid PDF invoice should have 0 flag reasons");
assert(res1.confidenceScore === 100, "Valid PDF invoice confidence score should be 100%");
assert(res1.scoreBreakdown.length === 7, "Score breakdown factors should contain 7 elements");

// Test Case 2: PDF with Incorrect Subtotal ($201,287.00 calculated vs $200,287.00 extracted)
console.log("\n--- Test Case 2: PDF with Incorrect Subtotal ---");
const subtotalMismatchInvoice = {
  vendor: "NORTHSTAR LOGISTICS",
  invoiceNumber: "NSL-2026-4821",
  date: "2026-08-19",
  dueDate: "2026-09-18",
  subtotal: 200287.00, // Actual found in document
  tax: 0.00,
  shipping: 0.00,
  total: 200287.00,
  lineItems: [
    { lineNumber: 1, description: "Logistics Hub Cargo Component A", quantity: 1, unitPrice: 100000.00, amount: 100000.00 },
    { lineNumber: 2, description: "Logistics Hub Cargo Component B", quantity: 1, unitPrice: 101287.00, amount: 101287.00 }
  ] // Calculated line sum = 201,287.00
};

const res2 = evaluateInvoiceValidation(subtotalMismatchInvoice, { threshold: 85 });
assert(res2.status === 'FLAGGED', "Incorrect subtotal invoice status should be FLAGGED");
const subMismatchReason = res2.flagReasons.find(r => r.reasonCode === 'SUBTOTAL_MISMATCH');
assert(subMismatchReason !== undefined, "Should contain SUBTOTAL_MISMATCH reason code");
assert(subMismatchReason.expected === 201287.00, "Expected subtotal should be 201287.00");
assert(subMismatchReason.actual === 200287.00, "Actual subtotal should be 200287.00");
assert(subMismatchReason.difference === 1000.00, "Difference should be 1000.00");
assert(subMismatchReason.confidenceImpact === -15, "Confidence impact should be -15%");

// Test Case 3: CSV Dataset Missing Required Column 'Price'
console.log("\n--- Test Case 3: CSV Dataset Missing Required Column 'Price' ---");
const datasetMissingCol = {
  headers: ["ItemCode", "Description", "Quantity"],
  rows: [
    ["ITM-01", "Widget A", "10"],
    ["ITM-02", "Widget B", "5"]
  ],
  rowCount: 2,
  columnCount: 3,
  missingCount: 0
};

const res3 = evaluateDatasetValidation(datasetMissingCol, { requiredColumns: ["Price"], threshold: 80 });
assert(res3.status === 'FLAGGED_FOR_REVIEW', "Missing required column dataset status should be FLAGGED_FOR_REVIEW");
const missingColReason = res3.flagReasons.find(r => r.reasonCode === 'MISSING_REQUIRED_COLUMN');
assert(missingColReason !== undefined, "Should contain MISSING_REQUIRED_COLUMN reason code");
assert(missingColReason.expected === "'Price' Column", "Expected should mention Price Column");
assert(missingColReason.actual === "Column missing", "Actual should state Column missing");

// Test Case 4: Excel Dataset with Missing Cell Values
console.log("\n--- Test Case 4: Excel Dataset with Invalid/Blank Rows ---");
const datasetBlankCells = {
  headers: ["ID", "Name", "Category", "Status"],
  rows: [
    ["1", "", "", ""],
    ["2", "", "", ""],
    ["3", "", "", ""]
  ],
  rowCount: 3,
  columnCount: 4,
  missingCount: 9 // High missing ratio (9 / 12 = 75%)
};

const res4 = evaluateDatasetValidation(datasetBlankCells, { threshold: 80 });
assert(res4.status === 'FLAGGED_FOR_REVIEW', "Dataset with excessive blank cells should be FLAGGED_FOR_REVIEW");
const emptyValReason = res4.flagReasons.find(r => r.reasonCode === 'EMPTY_REQUIRED_VALUE' || r.reasonCode === 'DATA_QUALITY_BELOW_THRESHOLD');
assert(emptyValReason !== undefined, "Should contain EMPTY_REQUIRED_VALUE or DATA_QUALITY_BELOW_THRESHOLD reason code");

// Test Case 5: Missing Invoice Vendor & Missing Number
console.log("\n--- Test Case 5: Invoice Missing Vendor & Invoice Number ---");
const missingHeaderInvoice = {
  vendor: "Unknown Vendor",
  invoiceNumber: "INV-UNPARSED-9999",
  subtotal: 100.00,
  total: 100.00,
  lineItems: []
};

const res5 = evaluateInvoiceValidation(missingHeaderInvoice, { threshold: 85 });
assert(res5.status === 'FLAGGED', "Missing critical headers should set status to FLAGGED");
assert(res5.flagReasons.some(r => r.reasonCode === 'VENDOR_NOT_FOUND'), "Should list VENDOR_NOT_FOUND");
assert(res5.flagReasons.some(r => r.reasonCode === 'INVOICE_NUMBER_NOT_FOUND'), "Should list INVOICE_NUMBER_NOT_FOUND");

console.log("\n=================================================");
console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
console.log("=================================================");

if (passedCount < totalCount) {
  process.exit(1);
}
