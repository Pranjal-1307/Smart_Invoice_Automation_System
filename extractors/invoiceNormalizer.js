function normalizeInvoice(rawResult, fileType) {
  const errors = [];
  const warnings = [];
  
  // 1. Line Items and Totals Math Validation
  const lineItems = rawResult.lineItems || [];
  const calculatedLineSubtotal = Math.round(lineItems.reduce((sum, item) => sum + (item.amount || item.total || 0), 0) * 100) / 100;
  
  const extractedSubtotal = rawResult.subtotal !== undefined ? rawResult.subtotal : 0;
  const extractedTax = rawResult.tax !== undefined ? rawResult.tax : 0;
  const extractedShipping = rawResult.shipping !== undefined ? rawResult.shipping : 0;
  const extractedTotal = rawResult.total !== undefined ? rawResult.total : 0;
  
  let subtotalMatch = true;
  let taxMatch = true;
  let shippingMatch = true;
  let totalMatch = true;
  
  // Rounding tolerance of 0.015 (incorporating floating-point precision)
  if (lineItems.length > 0) {
    const subtotalDiff = Math.abs(calculatedLineSubtotal - extractedSubtotal);
    if (subtotalDiff > 0.015) {
      subtotalMatch = false;
      warnings.push(`Subtotal mismatch: line items sum is ${calculatedLineSubtotal.toFixed(2)}, extracted subtotal is ${extractedSubtotal.toFixed(2)}`);
    }
  }
  
  const expectedTotal = Math.round((extractedSubtotal + extractedTax + extractedShipping) * 100) / 100;
  const totalDiff = Math.abs(expectedTotal - extractedTotal);
  if (totalDiff > 0.015) {
    totalMatch = false;
    warnings.push(`Total mismatch: subtotal + tax + shipping is ${expectedTotal.toFixed(2)}, extracted total is ${extractedTotal.toFixed(2)}`);
  }
  
  // Verification check for each line item amount
  lineItems.forEach((item, idx) => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const disc = item.discountPercent || 0;
    const expectedAmt = Math.round(qty * price * (1 - disc / 100.0) * 100) / 100;
    const diff = Math.abs(expectedAmt - item.amount);
    if (diff > 0.015) {
      warnings.push(`Line item #${item.lineNumber || idx+1} amount mismatch: calculated ${expectedAmt.toFixed(2)} vs extracted ${item.amount.toFixed(2)}`);
    }
  });

  // Missing fields warnings
  let isMissingCritical = false;
  if (!rawResult.invoiceNumber) {
    warnings.push("Invoice number not found");
    isMissingCritical = true;
  }
  if (!rawResult.vendor || rawResult.vendor === 'Unknown Vendor') {
    warnings.push("Vendor not found");
    isMissingCritical = true;
  }
  if (!rawResult.date) {
    warnings.push("Invoice date not found");
  }
  if (!rawResult.dueDate) {
    warnings.push("Due date not found");
  }
  
  // Status resolution
  let validationStatus = 'VALID';
  if (rawResult.extraction && rawResult.extraction.method === 'EXTRACTION_FAILED') {
    validationStatus = 'FAILED';
    errors.push(rawResult.extraction.warnings[0] || 'Extraction failed');
  } else if (!subtotalMatch || !totalMatch) {
    validationStatus = 'WARNING';
  } else if (isMissingCritical || lineItems.length === 0) {
    validationStatus = 'PARTIAL';
  }
  
  if (rawResult.extraction && rawResult.extraction.warnings && rawResult.extraction.warnings.length > 0) {
    const criticalError = rawResult.extraction.warnings.some(w => 
      w.includes("could not be opened") || 
      w.includes("could not be determined") ||
      w.includes("header not found")
    );
    if (criticalError) {
      validationStatus = 'FAILED';
      errors.push(...rawResult.extraction.warnings);
    }
  }

  // Confidence calculations
  let vendorScore = (rawResult.vendor && rawResult.vendor !== 'Unknown Vendor') ? 100 : 0;
  let invNumScore = rawResult.invoiceNumber ? 100 : 0;
  let dateScore = rawResult.date ? 100 : 0;
  let dueDateScore = rawResult.dueDate ? 100 : 0;
  let lineItemsScore = lineItems.length > 0 ? 100 : 0;
  let totalsScore = (subtotalMatch && totalMatch && extractedTotal > 0) ? 100 : 50;

  let scorePoints = 0;
  if (vendorScore === 100) scorePoints += 10;
  if (invNumScore === 100) scorePoints += 10;
  if (dateScore === 100) scorePoints += 5;
  if (dueDateScore === 100) scorePoints += 5;
  if (lineItemsScore === 100) scorePoints += 30;
  if (validationStatus === 'VALID') scorePoints += 15;
  if (subtotalMatch) scorePoints += 10;
  if (taxMatch) scorePoints += 5;
  if (totalMatch) scorePoints += 10;

  const confidenceScore = scorePoints / 100.0;
  
  let dbStatus = 'PENDING';
  if (validationStatus === 'FAILED') {
    dbStatus = 'EXTRACTION_FAILED';
  } else if (validationStatus === 'WARNING' || validationStatus === 'PARTIAL' || confidenceScore < 0.85) {
    dbStatus = 'FLAGGED';
  }

  return {
    invoiceNumber: (rawResult.invoiceNumber && rawResult.invoiceNumber.trim().length > 0) ? rawResult.invoiceNumber.trim() : `INV-UNPARSED-${Date.now().toString().slice(-4)}`,
    vendor: rawResult.vendor || 'Unknown Vendor',
    vendorEmail: rawResult.vendorEmail || '',
    date: rawResult.date || '',
    dueDate: rawResult.dueDate || '',
    currency: rawResult.currency || 'USD',
    poNumber: rawResult.poNumber || '',
    paymentTerms: rawResult.paymentTerms || '',
    subtotal: extractedSubtotal,
    tax: extractedTax,
    shipping: extractedShipping,
    total: extractedTotal,
    status: dbStatus,
    confidenceScore,
    fieldConfidence: {
      vendor: vendorScore,
      invoiceNumber: invNumScore,
      date: dateScore,
      dueDate: dueDateScore,
      lineItems: lineItemsScore,
      totals: totalsScore
    },
    lineItems,
    extraction: {
      fileType: fileType,
      method: rawResult.extraction.method,
      sheetName: rawResult.extraction.sheetName || null,
      rowCount: rawResult.extraction.rowCount || null,
      columnCount: rawResult.extraction.columnCount || null,
      ocrUsed: rawResult.extraction.ocrUsed || false,
      pageCount: rawResult.extraction.pageCount || 1,
      rawTextAvailable: rawResult.extraction.rawTextAvailable || false,
      rawTextLength: rawResult.extraction.rawTextLength || 0,
      lineItemCount: lineItems.length,
      warnings: rawResult.extraction.warnings || []
    },
    validation: {
      status: validationStatus,
      subtotalMatch,
      taxMatch,
      shippingMatch,
      totalMatch,
      errors,
      warnings
    },
    processingLogs: rawResult.processingLogs || [],
    rawText: rawResult.rawText || ''
  };
}

module.exports = {
  normalizeInvoice
};
