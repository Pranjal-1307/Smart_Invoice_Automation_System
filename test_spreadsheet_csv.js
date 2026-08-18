const path = require('path');
const fs = require('fs');
const { extractDocumentDetails } = require('./documentExtractor');

// Create test_files directory and write CSV test cases
const testDir = path.join(__dirname, 'test_files');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

const csvCases = {
  'csv_metadata_items.csv': `Invoice Number,INV-1001
Vendor,ABC Corporation
Invoice Date,2026-08-10
Currency,USD

Description,Qty,Unit Price,Amount
Product A,2,500,1000
Product B,3,250,750

Subtotal,,,1750
Tax,,,140
Total,,,1890`,

  'csv_items_only.csv': `Description,Quantity,Unit Price,Discount,Amount
Product A,2,500,0,1000
Product B,3,250,10,675`,

  'csv_semicolon.csv': `Invoice Number;INV-2002
Vendor;Nexora Services
Invoice Date;2026-08-11
Currency;EUR

Description;Qty;Unit Price;Amount
Service X;1;1500;1500
Service Y;2;600;1200

Subtotal;;;2700
Tax;;;540
Total;;;3240`,

  'csv_quoted_desc.csv': `Invoice Number,INV-3003
Vendor,Global Logistics
Invoice Date,2026-08-12
Currency,USD

Description,Qty,Unit Price,Amount
"Shipping, Handling, and Freight",1,250,250
"Cloud Platform, Premium Package",2,12500,25000

Subtotal,,,25250
Tax,,,2525
Total,,,27775`,

  'csv_multi_currency.csv': `Invoice Number,INV-4004
Vendor,Euro-US Trading GmbH
Invoice Date,2026-08-13
Currency,EUR

Description,Qty,Unit Price,Amount
Consulting (USD Rate),10,150,1500
Software License (EUR Rate),1,2000,2000

Subtotal,,,3500
Tax,,,700
Total,,,4200`
};

for (const name in csvCases) {
  fs.writeFileSync(path.join(testDir, name), csvCases[name], 'utf8');
}

async function runTests() {
  console.log("==================================================");
  console.log("  EXCEL AND CSV EXTRACTION TEST RUNNER");
  console.log("==================================================");

  let failures = [];

  // --- TEST 1: demo_invoice_xlsx_orbit_eur.xlsx ---
  try {
    console.log("\n[Test 1] Testing Excel: demo_invoice_xlsx_orbit_eur.xlsx");
    const filePath = path.join(__dirname, 'demo_invoice_xlsx_orbit_eur.xlsx');
    const result = await extractDocumentDetails(filePath, 'demo_invoice_xlsx_orbit_eur.xlsx');

    // Assertions
    if (result.vendor !== 'ORBIT DIGITAL SERVICES GmbH') failures.push(`[Test 1] Vendor expected 'ORBIT DIGITAL SERVICES GmbH', got '${result.vendor}'`);
    if (result.vendorEmail !== 'billing@orbitdigital.example') failures.push(`[Test 1] Vendor Email expected 'billing@orbitdigital.example', got '${result.vendorEmail}'`);
    if (result.invoiceNumber !== 'ORB-2026-7714') failures.push(`[Test 1] Invoice Number expected 'ORB-2026-7714', got '${result.invoiceNumber}'`);
    if (result.date !== '2026-06-03') failures.push(`[Test 1] Date expected '2026-06-03', got '${result.date}'`);
    if (result.dueDate !== '2026-07-03') failures.push(`[Test 1] Due Date expected '2026-07-03', got '${result.dueDate}'`);
    if (result.poNumber !== 'PO-ALPHA-90831') failures.push(`[Test 1] PO expected 'PO-ALPHA-90831', got '${result.poNumber}'`);
    if (result.paymentTerms !== 'Net 30') failures.push(`[Test 1] Terms expected 'Net 30', got '${result.paymentTerms}'`);
    if (result.currency !== 'EUR') failures.push(`[Test 1] Currency expected 'EUR', got '${result.currency}'`);
    if (result.lineItems.length !== 12) failures.push(`[Test 1] Line item count expected 12, got ${result.lineItems.length}`);
    if (Math.abs(result.subtotal - 327260.00) > 0.01) failures.push(`[Test 1] Subtotal expected 327260.00, got ${result.subtotal}`);
    if (Math.abs(result.tax - 62179.40) > 0.01) failures.push(`[Test 1] Tax expected 62179.40, got ${result.tax}`);
    if (Math.abs(result.shipping - 3200.00) > 0.01) failures.push(`[Test 1] Shipping expected 3200.00, got ${result.shipping}`);
    if (Math.abs(result.total - 392639.40) > 0.01) failures.push(`[Test 1] Total expected 392639.40, got ${result.total}`);
    if (result.validation.status !== 'VALID') failures.push(`[Test 1] Status expected 'VALID', got '${result.validation.status}'`);

    console.log("  Line Items check:");
    result.lineItems.forEach(item => {
      console.log(`    Item #${item.lineNumber}: ${item.description.slice(0, 40)}... | Qty: ${item.quantity} | Price: ${item.unitPrice} | Disc: ${item.discountPercent}% | Amt: ${item.amount}`);
    });
    console.log(`  Subtotal: ${result.subtotal} | Tax: ${result.tax} | Shipping: ${result.shipping} | Total: ${result.total}`);
    console.log("  -> SUCCESS");
  } catch (err) {
    failures.push(`[Test 1] Threw error: ${err.message}`);
  }

  // --- TEST 2: demo_invoice.xlsx ---
  try {
    console.log("\n[Test 2] Testing Excel: demo_invoice.xlsx");
    const filePath = path.join(__dirname, 'demo_invoice.xlsx');
    const result = await extractDocumentDetails(filePath, 'demo_invoice.xlsx');

    // Assertions
    if (result.vendor !== 'ABC Technologies Pvt. Ltd.') failures.push(`[Test 2] Vendor expected 'ABC Technologies Pvt. Ltd.', got '${result.vendor}'`);
    if (result.invoiceNumber !== 'INV-2026-001') failures.push(`[Test 2] Invoice Number expected 'INV-2026-001', got '${result.invoiceNumber}'`);
    if (result.date !== '2026-08-11') failures.push(`[Test 2] Date expected '2026-08-11', got '${result.date}'`);
    if (result.dueDate !== '2026-08-25') failures.push(`[Test 2] Due Date expected '2026-08-25', got '${result.dueDate}'`);
    if (result.lineItems.length !== 3) failures.push(`[Test 2] Line item count expected 3, got ${result.lineItems.length}`);
    if (Math.abs(result.subtotal - 45000) > 0.01) failures.push(`[Test 2] Subtotal expected 45000, got ${result.subtotal}`);
    // CGST (4050) + SGST (4050) = 8100
    if (Math.abs(result.tax - 8100) > 0.01) failures.push(`[Test 2] Tax expected 8100, got ${result.tax}`);
    if (Math.abs(result.total - 53100) > 0.01) failures.push(`[Test 2] Total expected 53100, got ${result.total}`);
    if (result.validation.status !== 'VALID') failures.push(`[Test 2] Status expected 'VALID', got '${result.validation.status}'`);

    console.log(`  Subtotal: ${result.subtotal} | Tax: ${result.tax} | Total: ${result.total}`);
    console.log("  -> SUCCESS");
  } catch (err) {
    failures.push(`[Test 2] Threw error: ${err.message}`);
  }

  // --- TEST 3: csv_metadata_items.csv ---
  try {
    console.log("\n[Test 3] Testing CSV: csv_metadata_items.csv");
    const filePath = path.join(testDir, 'csv_metadata_items.csv');
    const result = await extractDocumentDetails(filePath, 'csv_metadata_items.csv');

    if (result.vendor !== 'ABC Corporation') failures.push(`[Test 3] Vendor expected 'ABC Corporation', got '${result.vendor}'`);
    if (result.invoiceNumber !== 'INV-1001') failures.push(`[Test 3] Invoice Number expected 'INV-1001', got '${result.invoiceNumber}'`);
    if (result.date !== '2026-08-10') failures.push(`[Test 3] Date expected '2026-08-10', got '${result.date}'`);
    if (result.currency !== 'USD') failures.push(`[Test 3] Currency expected 'USD', got '${result.currency}'`);
    if (result.lineItems.length !== 2) failures.push(`[Test 3] Line item count expected 2, got ${result.lineItems.length}`);
    if (result.subtotal !== 1750) failures.push(`[Test 3] Subtotal expected 1750, got ${result.subtotal}`);
    if (result.tax !== 140) failures.push(`[Test 3] Tax expected 140, got ${result.tax}`);
    if (result.total !== 1890) failures.push(`[Test 3] Total expected 1890, got ${result.total}`);
    if (result.validation.status !== 'VALID') failures.push(`[Test 3] Status expected 'VALID', got '${result.validation.status}'`);

    console.log("  -> SUCCESS");
  } catch (err) {
    failures.push(`[Test 3] Threw error: ${err.message}`);
  }

  // --- TEST 4: csv_items_only.csv ---
  try {
    console.log("\n[Test 4] Testing CSV: csv_items_only.csv");
    const filePath = path.join(testDir, 'csv_items_only.csv');
    const result = await extractDocumentDetails(filePath, 'csv_items_only.csv');

    if (result.lineItems.length !== 2) failures.push(`[Test 4] Line item count expected 2, got ${result.lineItems.length}`);
    if (result.validation.status !== 'PARTIAL') failures.push(`[Test 4] Status expected 'PARTIAL', got '${result.validation.status}'`);
    if (!result.validation.warnings.includes("Invoice number not found")) failures.push(`[Test 4] Missing Invoice number warning`);
    if (!result.validation.warnings.includes("Vendor not found")) failures.push(`[Test 4] Missing Vendor warning`);

    console.log("  -> SUCCESS");
  } catch (err) {
    failures.push(`[Test 4] Threw error: ${err.message}`);
  }

  // --- TEST 5: csv_semicolon.csv ---
  try {
    console.log("\n[Test 5] Testing CSV: csv_semicolon.csv");
    const filePath = path.join(testDir, 'csv_semicolon.csv');
    const result = await extractDocumentDetails(filePath, 'csv_semicolon.csv');

    if (result.vendor !== 'Nexora Services') failures.push(`[Test 5] Vendor expected 'Nexora Services', got '${result.vendor}'`);
    if (result.invoiceNumber !== 'INV-2002') failures.push(`[Test 5] Invoice Number expected 'INV-2002', got '${result.invoiceNumber}'`);
    if (result.currency !== 'EUR') failures.push(`[Test 5] Currency expected 'EUR', got '${result.currency}'`);
    if (result.lineItems.length !== 2) failures.push(`[Test 5] Line item count expected 2, got ${result.lineItems.length}`);
    if (result.total !== 3240) failures.push(`[Test 5] Total expected 3240, got ${result.total}`);

    console.log("  -> SUCCESS");
  } catch (err) {
    failures.push(`[Test 5] Threw error: ${err.message}`);
  }

  // --- TEST 6: csv_quoted_desc.csv ---
  try {
    console.log("\n[Test 6] Testing CSV: csv_quoted_desc.csv");
    const filePath = path.join(testDir, 'csv_quoted_desc.csv');
    const result = await extractDocumentDetails(filePath, 'csv_quoted_desc.csv');

    if (result.lineItems.length !== 2) failures.push(`[Test 6] Line item count expected 2, got ${result.lineItems.length}`);
    if (result.lineItems[0].description !== "Shipping, Handling, and Freight") failures.push(`[Test 6] Description 0 expected 'Shipping, Handling, and Freight', got '${result.lineItems[0].description}'`);
    if (result.lineItems[1].description !== "Cloud Platform, Premium Package") failures.push(`[Test 6] Description 1 expected 'Cloud Platform, Premium Package', got '${result.lineItems[1].description}'`);

    console.log("  -> SUCCESS");
  } catch (err) {
    failures.push(`[Test 6] Threw error: ${err.message}`);
  }

  // --- TEST 7: csv_multi_currency.csv ---
  try {
    console.log("\n[Test 7] Testing CSV: csv_multi_currency.csv");
    const filePath = path.join(testDir, 'csv_multi_currency.csv');
    const result = await extractDocumentDetails(filePath, 'csv_multi_currency.csv');

    if (result.currency !== 'EUR') failures.push(`[Test 7] Currency expected 'EUR', got '${result.currency}'`);
    if (result.lineItems.length !== 2) failures.push(`[Test 7] Line item count expected 2, got ${result.lineItems.length}`);
    if (result.total !== 4200) failures.push(`[Test 7] Total expected 4200, got ${result.total}`);

    console.log("  -> SUCCESS");
  } catch (err) {
    failures.push(`[Test 7] Threw error: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log("  TEST SUMMARY");
  console.log("==================================================");
  if (failures.length === 0) {
    console.log("✅ ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.log(`❌ ${failures.length} TEST(S) FAILED:`);
    failures.forEach((f, i) => console.log(`  ${i+1}. ${f}`));
    process.exit(1);
  }
}

runTests();
