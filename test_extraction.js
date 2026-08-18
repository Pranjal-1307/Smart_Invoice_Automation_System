const path = require('path');
const fs = require('fs');
const { extractDocumentDetails } = require('./documentExtractor');

async function runTest() {
  console.log("==================================================");
  console.log("  INVOICE EXTRACTION COMPARISON AUTOMATED TEST");
  console.log("==================================================");

  const testPdfPath = path.join(__dirname, 'big_demo_invoice_usd.pdf');
  if (!fs.existsSync(testPdfPath)) {
    console.error("FAIL: Test PDF 'big_demo_invoice_usd.pdf' not found at path:", testPdfPath);
    process.exit(1);
  }

  console.log(`[Test] Reading PDF file: ${testPdfPath}`);
  const pdfBuffer = fs.readFileSync(testPdfPath);
  const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

  console.log("[Test] Running extraction engine on PDF payload...");
  const startTime = Date.now();
  const result = await extractDocumentDetails(dataUrl, 'big_demo_invoice_usd.pdf');
  const duration = Date.now() - startTime;

  console.log(`[Test] Extraction completed in ${duration}ms\n`);

  // Expected Targets
  const expected = {
    vendor: 'NEXORA TECHNOLOGIES LLC',
    vendorEmail: 'billing@nexoratech.example',
    invoiceNumber: 'INV-USD-2026-0847',
    date: '2026-08-19',
    dueDate: '2026-09-18',
    currency: 'USD',
    poNumber: 'PO-78421-ACME',
    subtotal: 796210.00,
    tax: 65687.32,
    shipping: 1850.00,
    total: 863747.32,
    lineItemCount: 36
  };

  const failures = [];

  // 1. Vendor
  if (result.vendor !== expected.vendor) {
    failures.push(`Vendor Mismatch: Expected '${expected.vendor}', Got '${result.vendor}'`);
  }
  // 2. Vendor Email
  if (result.vendorEmail !== expected.vendorEmail) {
    failures.push(`Vendor Email Mismatch: Expected '${expected.vendorEmail}', Got '${result.vendorEmail}'`);
  }
  // 3. Invoice Number
  if (result.invoiceNumber !== expected.invoiceNumber) {
    failures.push(`Invoice Number Mismatch: Expected '${expected.invoiceNumber}', Got '${result.invoiceNumber}'`);
  }
  // 4. Invoice Date
  if (result.date !== expected.date) {
    failures.push(`Date Mismatch: Expected '${expected.date}', Got '${result.date}'`);
  }
  // 5. Due Date
  if (result.dueDate !== expected.dueDate) {
    failures.push(`Due Date Mismatch: Expected '${expected.dueDate}', Got '${result.dueDate}'`);
  }
  // 6. Currency
  if (result.currency !== expected.currency) {
    failures.push(`Currency Mismatch: Expected '${expected.currency}', Got '${result.currency}'`);
  }
  // 7. PO Number
  if (result.poNumber !== expected.poNumber) {
    failures.push(`PO Number Mismatch: Expected '${expected.poNumber}', Got '${result.poNumber}'`);
  }
  // 8. Subtotal
  if (Math.abs(result.subtotal - expected.subtotal) > 0.01) {
    failures.push(`Subtotal Mismatch: Expected ${expected.subtotal.toFixed(2)}, Got ${result.subtotal.toFixed(2)}`);
  }
  // 9. Tax
  if (Math.abs(result.tax - expected.tax) > 0.01) {
    failures.push(`Tax Mismatch: Expected ${expected.tax.toFixed(2)}, Got ${result.tax.toFixed(2)}`);
  }
  // 10. Shipping
  if (Math.abs(result.shipping - expected.shipping) > 0.01) {
    failures.push(`Shipping Mismatch: Expected ${expected.shipping.toFixed(2)}, Got ${result.shipping.toFixed(2)}`);
  }
  // 11. Total
  if (Math.abs(result.total - expected.total) > 0.01) {
    failures.push(`Total Mismatch: Expected ${expected.total.toFixed(2)}, Got ${result.total.toFixed(2)}`);
  }
  // 12. Line Items Count
  if (result.lineItems.length !== expected.lineItemCount) {
    failures.push(`Line Item Count Mismatch: Expected ${expected.lineItemCount}, Got ${result.lineItems.length}`);
  }
  // 13. Validation Status
  if (result.validation.status !== 'VALID') {
    failures.push(`Arithmetic Validation Failed: Status is '${result.validation.status}', Errors: ${JSON.stringify(result.validation.errors)}`);
  }

  console.log("==================================================");
  console.log("  EXTRACTION SUMMARY & ASSERTION RESULTS");
  console.log("==================================================");
  console.log(`• Vendor Name:      ${result.vendor} (Expected: ${expected.vendor})`);
  console.log(`• Vendor Email:     ${result.vendorEmail} (Expected: ${expected.vendorEmail})`);
  console.log(`• Invoice Number:   ${result.invoiceNumber} (Expected: ${expected.invoiceNumber})`);
  console.log(`• Issue Date:       ${result.date} (Expected: ${expected.date})`);
  console.log(`• Due Date:         ${result.dueDate} (Expected: ${expected.dueDate})`);
  console.log(`• PO Number:        ${result.poNumber} (Expected: ${expected.poNumber})`);
  console.log(`• Currency:         ${result.currency} (Expected: ${expected.currency})`);
  console.log(`• Subtotal:         $${result.subtotal.toFixed(2)} (Expected: $${expected.subtotal.toFixed(2)})`);
  console.log(`• Sales Tax:        $${result.tax.toFixed(2)} (Expected: $${expected.tax.toFixed(2)})`);
  console.log(`• Shipping:         $${result.shipping.toFixed(2)} (Expected: $${expected.shipping.toFixed(2)})`);
  console.log(`• Total Due:        $${result.total.toFixed(2)} (Expected: $${expected.total.toFixed(2)})`);
  console.log(`• Line Item Count:  ${result.lineItems.length} (Expected: ${expected.lineItemCount})`);
  console.log(`• Validation State: ${result.validation.status}`);
  console.log(`• Confidence Score: ${(result.confidenceScore * 100).toFixed(0)}%`);

  if (failures.length === 0) {
    console.log("\n✅ ALL ASSERTIONS PASSED! Extracted data perfectly matches the PDF.");
    process.exit(0);
  } else {
    console.error("\n❌ TEST FAILED WITH THE FOLLOWING ERRORS:");
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  }
}

runTest();
