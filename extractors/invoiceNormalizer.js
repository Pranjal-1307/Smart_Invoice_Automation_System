const {
  evaluateInvoiceValidation,
  evaluateDatasetValidation,
  REASON_CODES,
  SEVERITY,
  createValidationResult
} = require('./flagReasonEngine');

function normalizeInvoice(rawResult, fileType, options = {}) {
  const docType = rawResult.documentType || (options.isDataset ? 'DATASET' : 'INVOICE');

  if (docType === 'DATASET') {
    const evalRes = evaluateDatasetValidation(rawResult, options);

    return {
      id: rawResult.id,
      documentType: 'DATASET',
      invoiceNumber: rawResult.filename || `DS-${Date.now().toString().slice(-4)}`,
      filename: rawResult.filename || 'dataset.csv',
      vendor: 'Tabular Dataset',
      vendorEmail: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      currency: 'N/A',
      poNumber: '',
      paymentTerms: '',
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      status: evalRes.status,
      confidenceScore: evalRes.confidenceScore,
      dataQualityScore: evalRes.dataQualityScore,
      threshold: evalRes.threshold,
      score: evalRes.score,
      decisionReason: evalRes.decisionReason,
      recommendedAction: evalRes.recommendedAction,
      flagReasons: evalRes.flagReasons,
      validationResults: evalRes.validationResults,
      scoreBreakdown: evalRes.scoreBreakdown,
      lineItems: rawResult.lineItems || [],
      extraction: {
        fileType: fileType,
        method: (rawResult.extraction && rawResult.extraction.method) || 'CSV',
        sheetName: (rawResult.extraction && rawResult.extraction.sheetName) || null,
        rowCount: rawResult.rowCount || (rawResult.rows ? rawResult.rows.length : null),
        columnCount: rawResult.columnCount || (rawResult.headers ? rawResult.headers.length : null),
        ocrUsed: false,
        pageCount: 1,
        rawTextAvailable: false,
        rawTextLength: 0,
        lineItemCount: 0,
        warnings: (rawResult.extraction && rawResult.extraction.warnings) || []
      },
      validation: {
        status: evalRes.status,
        errors: evalRes.flagReasons.map(f => f.message),
        warnings: []
      },
      processingLogs: rawResult.processingLogs || [],
      rawText: rawResult.rawText || ''
    };
  }

  // Else INVOICE classification
  const evalRes = evaluateInvoiceValidation(rawResult, options);

  const errors = evalRes.flagReasons.map(f => f.message);
  const warnings = evalRes.validationResults.filter(v => v.status === 'WARNING').map(v => v.message);

  let subtotalMatch = !evalRes.flagReasons.some(f => f.reasonCode === REASON_CODES.SUBTOTAL_MISMATCH);
  let totalMatch = !evalRes.flagReasons.some(f => f.reasonCode === REASON_CODES.TOTAL_MISMATCH);

  let validationStatus = 'VALID';
  if (evalRes.flagReasons.some(f => f.severity === SEVERITY.CRITICAL)) {
    validationStatus = 'FAILED';
  } else if (!rawResult.vendor || rawResult.vendor === 'Unknown Vendor' || !rawResult.invoiceNumber || (rawResult.lineItems || []).length === 0) {
    validationStatus = 'PARTIAL';
  } else if (evalRes.status === 'FLAGGED' || evalRes.flagReasons.length > 0) {
    validationStatus = 'WARNING';
  }

  if (!rawResult.invoiceNumber && !warnings.includes("Invoice number not found")) {
    warnings.push("Invoice number not found");
  }
  if ((!rawResult.vendor || rawResult.vendor === 'Unknown Vendor') && !warnings.includes("Vendor not found")) {
    warnings.push("Vendor not found");
  }

  return {
    documentType: 'INVOICE',
    invoiceNumber: (rawResult.invoiceNumber && rawResult.invoiceNumber.trim().length > 0)
      ? rawResult.invoiceNumber.trim()
      : `INV-UNPARSED-${Date.now().toString().slice(-4)}`,
    vendor: rawResult.vendor || 'Unknown Vendor',
    vendorEmail: rawResult.vendorEmail || '',
    date: rawResult.date || '',
    dueDate: rawResult.dueDate || '',
    currency: rawResult.currency || 'USD',
    poNumber: rawResult.poNumber || '',
    paymentTerms: rawResult.paymentTerms || '',
    subtotal: typeof rawResult.subtotal === 'number' ? rawResult.subtotal : 0,
    tax: typeof rawResult.tax === 'number' ? rawResult.tax : 0,
    shipping: typeof rawResult.shipping === 'number' ? rawResult.shipping : 0,
    total: typeof rawResult.total === 'number' ? rawResult.total : 0,
    status: evalRes.status,
    confidenceScore: evalRes.confidenceScore / 100.0,
    threshold: evalRes.threshold,
    score: {
      type: 'CONFIDENCE',
      value: evalRes.confidenceScore,
      threshold: evalRes.threshold
    },
    decisionReason: evalRes.decisionReason,
    recommendedAction: evalRes.recommendedAction,
    flagReasons: evalRes.flagReasons,
    validationResults: evalRes.validationResults,
    scoreBreakdown: evalRes.scoreBreakdown,
    fieldConfidence: {
      vendor: (rawResult.vendor && rawResult.vendor !== 'Unknown Vendor') ? 100 : 0,
      invoiceNumber: rawResult.invoiceNumber ? 100 : 0,
      date: rawResult.date ? 100 : 0,
      dueDate: rawResult.dueDate ? 100 : 0,
      lineItems: (rawResult.lineItems && rawResult.lineItems.length > 0) ? 100 : 0,
      totals: (subtotalMatch && totalMatch) ? 100 : 50
    },
    lineItems: rawResult.lineItems || [],
    extraction: {
      fileType: fileType,
      method: (rawResult.extraction && rawResult.extraction.method) || 'PDF_TEXT',
      sheetName: (rawResult.extraction && rawResult.extraction.sheetName) || null,
      rowCount: (rawResult.extraction && rawResult.extraction.rowCount) || null,
      columnCount: (rawResult.extraction && rawResult.extraction.columnCount) || null,
      ocrUsed: (rawResult.extraction && rawResult.extraction.ocrUsed) || false,
      pageCount: (rawResult.extraction && rawResult.extraction.pageCount) || 1,
      rawTextAvailable: (rawResult.extraction && rawResult.extraction.rawTextAvailable) || false,
      rawTextLength: (rawResult.extraction && rawResult.extraction.rawTextLength) || 0,
      lineItemCount: (rawResult.lineItems || []).length,
      warnings: (rawResult.extraction && rawResult.extraction.warnings) || []
    },
    validation: {
      status: validationStatus,
      subtotalMatch,
      taxMatch: true,
      shippingMatch: true,
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
