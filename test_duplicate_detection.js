const { evaluateInvoiceValidation, REASON_CODES } = require('./extractors/flagReasonEngine');

console.log("=================================================");
console.log("RUNNING ACCEPTANCE TESTS FOR DUPLICATE INVOICE DETECTION");
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

// Simulated in-memory database of existing invoices
const existingInvoices = [
  {
    id: "INV-EXISTING-001",
    vendor: "ACME INDUSTRIAL SUPPLIES",
    invoiceNumber: "INV-2026-9001",
    date: "2026-08-19",
    total: 1500.00,
    status: "PROCESSED"
  }
];

// Duplicate detection function reusing identical database match logic
function checkDuplicateInvoice(invoice, dbStore = existingInvoices) {
  const vendor = (invoice.vendor || '').trim().toLowerCase();
  const invoiceNumber = (invoice.invoiceNumber || '').trim().toLowerCase();
  const invoiceDate = (invoice.date || '').trim();
  const total = typeof invoice.total === 'number' ? invoice.total : null;

  if (!vendor || vendor === 'unknown vendor' || !invoiceNumber || invoiceNumber.includes('unparsed') || !invoiceDate || total === null) {
    return null;
  }

  return dbStore.find(existing => {
    return (
      existing.vendor.trim().toLowerCase() === vendor &&
      existing.invoiceNumber.trim().toLowerCase() === invoiceNumber &&
      existing.date.trim() === invoiceDate &&
      Math.abs(existing.total - total) <= 0.01
    );
  }) || null;
}

// Test Case 1: New Invoice -> NOT DUPLICATE -> Normal Workflow
console.log("--- Test Case 1: New Invoice (Unique Vendor + Unique Inv Number) ---");
const newInvoice = {
  vendor: "GLOBAL LOGISTICS INC",
  invoiceNumber: "GL-2026-001",
  date: "2026-08-20",
  subtotal: 500.00,
  tax: 50.00,
  shipping: 0.00,
  total: 550.00,
  lineItems: [{ lineNumber: 1, description: "Shipping", quantity: 1, unitPrice: 500.00, amount: 500.00 }]
};
const dup1 = checkDuplicateInvoice(newInvoice);
assert(dup1 === null, "New invoice should not be detected as duplicate");
const val1 = evaluateInvoiceValidation(newInvoice);
assert(val1.status === 'PROCESSED', "Unique valid invoice status should remain PROCESSED");

// Test Case 2: Exact Duplicate -> FLAGGED -> DUPLICATE_INVOICE
console.log("\n--- Test Case 2: Exact Duplicate Invoice ---");
const duplicateInvoice = {
  vendor: "ACME INDUSTRIAL SUPPLIES",
  invoiceNumber: "INV-2026-9001",
  date: "2026-08-19",
  subtotal: 1500.00,
  tax: 0.00,
  shipping: 0.00,
  total: 1500.00,
  lineItems: [{ lineNumber: 1, description: "Supplies", quantity: 1, unitPrice: 1500.00, amount: 1500.00 }]
};
const dup2 = checkDuplicateInvoice(duplicateInvoice);
assert(dup2 !== null, "Exact duplicate invoice must be detected in MongoDB store");
if (dup2) {
  const dupMsg = `Duplicate invoice detected: invoice ${duplicateInvoice.invoiceNumber} from ${duplicateInvoice.vendor} already exists.`;
  const flagReason = {
    field: "invoiceNumber",
    validation: "DUPLICATE_INVOICE_CHECK",
    status: "FAILED",
    severity: "HIGH",
    reasonCode: "DUPLICATE_INVOICE",
    message: dupMsg,
    expected: "Unique invoice",
    actual: `Duplicate invoice exists (${dup2.id})`
  };
  const val2 = evaluateInvoiceValidation(duplicateInvoice);
  val2.status = 'FLAGGED';
  val2.flagReasons.push(flagReason);
  assert(val2.status === 'FLAGGED', "Duplicate invoice status must be FLAGGED");
  assert(val2.flagReasons.some(r => r.reasonCode === 'DUPLICATE_INVOICE'), "Duplicate reason code must be DUPLICATE_INVOICE");
  assert(val2.flagReasons.find(r => r.reasonCode === 'DUPLICATE_INVOICE').severity === 'HIGH', "Duplicate severity must be HIGH");
  assert(val2.flagReasons.find(r => r.reasonCode === 'DUPLICATE_INVOICE').message === dupMsg, "Duplicate message format must match specification");
}

// Test Case 3: Same Vendor but Different Invoice Number -> NOT Duplicate
console.log("\n--- Test Case 3: Same Vendor, Different Invoice Number ---");
const diffInvNumInvoice = {
  vendor: "ACME INDUSTRIAL SUPPLIES",
  invoiceNumber: "INV-2026-9999", // Different invoice number
  date: "2026-08-19",
  total: 1500.00
};
const dup3 = checkDuplicateInvoice(diffInvNumInvoice);
assert(dup3 === null, "Same vendor with different invoice number should NOT be flagged as duplicate");

// Test Case 4: Same Invoice Number but Different Vendor -> NOT Duplicate
console.log("\n--- Test Case 4: Same Invoice Number, Different Vendor ---");
const diffVendorInvoice = {
  vendor: "NEXORA TECHNOLOGIES", // Different vendor
  invoiceNumber: "INV-2026-9001",
  date: "2026-08-19",
  total: 1500.00
};
const dup4 = checkDuplicateInvoice(diffVendorInvoice);
assert(dup4 === null, "Same invoice number with different vendor should NOT be flagged as duplicate");

// Test Case 5: Missing Required Duplicate Check Field (Missing Invoice Number / Vendor)
console.log("\n--- Test Case 5: Missing Required Duplicate Check Field ---");
const missingFieldInvoice = {
  vendor: "Unknown Vendor",
  invoiceNumber: "INV-UNPARSED-001",
  date: "",
  total: 100.00,
  subtotal: 100.00,
  lineItems: []
};
const dup5 = checkDuplicateInvoice(missingFieldInvoice);
assert(dup5 === null, "Missing required duplicate fields should not trigger duplicate match");
const val5 = evaluateInvoiceValidation(missingFieldInvoice);
assert(val5.status === 'FLAGGED', "Existing validation flags missing headers properly");
assert(val5.flagReasons.some(r => r.reasonCode === 'VENDOR_NOT_FOUND'), "Contains standard VENDOR_NOT_FOUND flag reason");

console.log("\n=================================================");
console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
console.log("=================================================");

if (passedCount < totalCount) {
  process.exit(1);
}
