/**
 * Universal Flag Reason and Validation Explanation System Engine
 * Standardizes reason codes, structured validation results, score breakdowns,
 * and status decisions across PDF, CSV, XLS, and XLSX documents.
 */

// Standardized Reason Codes
const REASON_CODES = {
  // Invoice Extraction Reasons
  VENDOR_NOT_FOUND: 'VENDOR_NOT_FOUND',
  INVOICE_NUMBER_NOT_FOUND: 'INVOICE_NUMBER_NOT_FOUND',
  INVOICE_DATE_NOT_FOUND: 'INVOICE_DATE_NOT_FOUND',
  DUE_DATE_NOT_FOUND: 'DUE_DATE_NOT_FOUND',
  LINE_ITEMS_NOT_FOUND: 'LINE_ITEMS_NOT_FOUND',
  PARTIAL_LINE_ITEMS: 'PARTIAL_LINE_ITEMS',
  SUBTOTAL_NOT_FOUND: 'SUBTOTAL_NOT_FOUND',
  TOTAL_NOT_FOUND: 'TOTAL_NOT_FOUND',
  CURRENCY_NOT_FOUND: 'CURRENCY_NOT_FOUND',
  UNREADABLE_PDF: 'UNREADABLE_PDF',
  OCR_LOW_CONFIDENCE: 'OCR_LOW_CONFIDENCE',
  FIELD_EXTRACTION_FAILED: 'FIELD_EXTRACTION_FAILED',

  // Invoice Validation Reasons
  SUBTOTAL_MISMATCH: 'SUBTOTAL_MISMATCH',
  TOTAL_MISMATCH: 'TOTAL_MISMATCH',
  LINE_ITEM_CALCULATION_MISMATCH: 'LINE_ITEM_CALCULATION_MISMATCH',
  TAX_CALCULATION_MISMATCH: 'TAX_CALCULATION_MISMATCH',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  DUPLICATE_INVOICE: 'DUPLICATE_INVOICE',
  CONFIDENCE_BELOW_THRESHOLD: 'CONFIDENCE_BELOW_THRESHOLD',

  // Dataset Validation Reasons
  FILE_PARSE_FAILED: 'FILE_PARSE_FAILED',
  HEADERS_NOT_FOUND: 'HEADERS_NOT_FOUND',
  MISSING_REQUIRED_COLUMN: 'MISSING_REQUIRED_COLUMN',
  INVALID_COLUMN_FORMAT: 'INVALID_COLUMN_FORMAT',
  INVALID_DATA_TYPE: 'INVALID_DATA_TYPE',
  EMPTY_REQUIRED_VALUE: 'EMPTY_REQUIRED_VALUE',
  TOO_MANY_INVALID_ROWS: 'TOO_MANY_INVALID_ROWS',
  DUPLICATE_RECORDS: 'DUPLICATE_RECORDS',
  DATA_QUALITY_BELOW_THRESHOLD: 'DATA_QUALITY_BELOW_THRESHOLD',

  // System Reasons
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  DATABASE_SAVE_FAILED: 'DATABASE_SAVE_FAILED',
  ROBOT_WORKFLOW_FAILED: 'ROBOT_WORKFLOW_FAILED',
  UNSUPPORTED_FILE_FORMAT: 'UNSUPPORTED_FILE_FORMAT',
  UNKNOWN_DOCUMENT_TYPE: 'UNKNOWN_DOCUMENT_TYPE'
};

const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

/**
 * Creates a standardized validation result object.
 */
function createValidationResult({
  field,
  validation,
  status = 'PASSED', // PASSED, FAILED, WARNING
  severity = SEVERITY.LOW,
  reasonCode = null,
  message = '',
  expected = null,
  actual = null,
  difference = null,
  confidenceImpact = 0,
  qualityImpact = 0
}) {
  return {
    field: field || 'general',
    validation: validation || 'GENERAL_CHECK',
    status,
    severity,
    reasonCode,
    message,
    expected: expected !== undefined ? expected : null,
    actual: actual !== undefined ? actual : null,
    difference: difference !== undefined ? difference : null,
    confidenceImpact: confidenceImpact || 0,
    qualityImpact: qualityImpact || 0,
    scoreImpact: confidenceImpact || qualityImpact || 0
  };
}

/**
 * Evaluates Invoice document validation, score breakdown, and flag decision.
 */
function evaluateInvoiceValidation(rawInvoice, options = {}) {
  const threshold = options.threshold || 85; // 85% default confidence threshold
  const validationResults = [];
  const flagReasons = [];
  const scoreBreakdown = [];

  const lineItems = rawInvoice.lineItems || [];
  const extractedSubtotal = typeof rawInvoice.subtotal === 'number' ? rawInvoice.subtotal : 0;
  const extractedTax = typeof rawInvoice.tax === 'number' ? rawInvoice.tax : 0;
  const extractedShipping = typeof rawInvoice.shipping === 'number' ? rawInvoice.shipping : 0;
  const extractedTotal = typeof rawInvoice.total === 'number' ? rawInvoice.total : 0;

  const vendor = (rawInvoice.vendor || '').trim();
  const invoiceNumber = (rawInvoice.invoiceNumber || '').trim();
  const date = (rawInvoice.date || '').trim();
  const dueDate = (rawInvoice.dueDate || '').trim();

  // 1. Vendor Check
  const hasVendor = vendor && vendor !== 'Unknown Vendor';
  if (hasVendor) {
    scoreBreakdown.push({
      factor: 'Vendor Detection',
      maxScore: 15,
      earnedScore: 15,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'vendor',
      validation: 'VENDOR_DETECTION',
      status: 'PASSED',
      message: `Vendor identified: ${vendor}`,
      expected: 'Valid vendor name',
      actual: vendor
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Vendor Detection',
      maxScore: 15,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.VENDOR_NOT_FOUND
    });
    const result = createValidationResult({
      field: 'vendor',
      validation: 'VENDOR_DETECTION',
      status: 'FAILED',
      severity: SEVERITY.HIGH,
      reasonCode: REASON_CODES.VENDOR_NOT_FOUND,
      message: 'Vendor name could not be identified in the document.',
      expected: 'Vendor name',
      actual: 'Unknown Vendor',
      confidenceImpact: -15
    });
    validationResults.push(result);
    flagReasons.push(result);
  }

  // 2. Invoice Number Check
  const hasInvNum = invoiceNumber && !invoiceNumber.includes('UNPARSED');
  if (hasInvNum) {
    scoreBreakdown.push({
      factor: 'Invoice Number',
      maxScore: 15,
      earnedScore: 15,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'invoiceNumber',
      validation: 'INVOICE_NUMBER_DETECTION',
      status: 'PASSED',
      message: `Invoice number extracted: ${invoiceNumber}`,
      expected: 'Valid invoice number',
      actual: invoiceNumber
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Invoice Number',
      maxScore: 15,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.INVOICE_NUMBER_NOT_FOUND
    });
    const result = createValidationResult({
      field: 'invoiceNumber',
      validation: 'INVOICE_NUMBER_DETECTION',
      status: 'FAILED',
      severity: SEVERITY.HIGH,
      reasonCode: REASON_CODES.INVOICE_NUMBER_NOT_FOUND,
      message: 'Invoice number was not found in document.',
      expected: 'Invoice number identifier',
      actual: 'Missing / Unparsed',
      confidenceImpact: -15
    });
    validationResults.push(result);
    flagReasons.push(result);
  }

  // 3. Invoice Date Check
  if (date) {
    scoreBreakdown.push({
      factor: 'Invoice Date',
      maxScore: 5,
      earnedScore: 5,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'date',
      validation: 'DATE_FORMAT',
      status: 'PASSED',
      message: `Invoice date parsed: ${date}`,
      expected: 'YYYY-MM-DD Date',
      actual: date
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Invoice Date',
      maxScore: 5,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.INVOICE_DATE_NOT_FOUND
    });
    const result = createValidationResult({
      field: 'date',
      validation: 'DATE_FORMAT',
      status: 'WARNING',
      severity: SEVERITY.MEDIUM,
      reasonCode: REASON_CODES.INVOICE_DATE_NOT_FOUND,
      message: 'Invoice issue date was not detected.',
      expected: 'Issue Date',
      actual: 'Missing',
      confidenceImpact: -5
    });
    validationResults.push(result);
    flagReasons.push(result);
  }

  // 4. Due Date Check
  if (dueDate) {
    scoreBreakdown.push({
      factor: 'Due Date',
      maxScore: 5,
      earnedScore: 5,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'dueDate',
      validation: 'DUE_DATE_FORMAT',
      status: 'PASSED',
      message: `Due date parsed: ${dueDate}`,
      expected: 'YYYY-MM-DD Date',
      actual: dueDate
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Due Date',
      maxScore: 5,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.DUE_DATE_NOT_FOUND
    });
    const result = createValidationResult({
      field: 'dueDate',
      validation: 'DUE_DATE_FORMAT',
      status: 'WARNING',
      severity: SEVERITY.LOW,
      reasonCode: REASON_CODES.DUE_DATE_NOT_FOUND,
      message: 'Due date was not detected.',
      expected: 'Payment Due Date',
      actual: 'Missing',
      confidenceImpact: -5
    });
    validationResults.push(result);
    // LOW severity missing due date is recorded in validationResults but does not trigger document flag status
  }

  // 5. Line Items Extraction Check
  if (lineItems.length > 0) {
    scoreBreakdown.push({
      factor: 'Line Items',
      maxScore: 30,
      earnedScore: 30,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'lineItems',
      validation: 'LINE_ITEM_EXTRACTION',
      status: 'PASSED',
      message: `Extracted ${lineItems.length} line item(s).`,
      expected: '>= 1 Line Items',
      actual: `${lineItems.length} Items`
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Line Items',
      maxScore: 30,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.LINE_ITEMS_NOT_FOUND
    });
    const result = createValidationResult({
      field: 'lineItems',
      validation: 'LINE_ITEM_EXTRACTION',
      status: 'FAILED',
      severity: SEVERITY.HIGH,
      reasonCode: REASON_CODES.LINE_ITEMS_NOT_FOUND,
      message: 'No line item table rows were extracted from document.',
      expected: 'At least 1 item row',
      actual: '0 Items',
      confidenceImpact: -30
    });
    validationResults.push(result);
    flagReasons.push(result);
  }

  // 6. Line Item Level Arithmetic Verification
  let lineItemErrors = 0;
  lineItems.forEach((item, idx) => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const disc = item.discountPercent || 0;
    const expectedAmt = Math.round(qty * price * (1 - disc / 100.0) * 100) / 100;
    const actualAmt = typeof item.amount === 'number' ? item.amount : (item.total || 0);
    const diff = Math.round(Math.abs(expectedAmt - actualAmt) * 100) / 100;

    if (diff > 0.015) {
      lineItemErrors++;
      const result = createValidationResult({
        field: `lineItems[${idx}]`,
        validation: 'LINE_ITEM_CALCULATION',
        status: 'FAILED',
        severity: SEVERITY.HIGH,
        reasonCode: REASON_CODES.LINE_ITEM_CALCULATION_MISMATCH,
        message: `Line item #${item.lineNumber || idx + 1} calculation mismatch for "${item.description || 'Item'}".`,
        expected: expectedAmt,
        actual: actualAmt,
        difference: diff,
        confidenceImpact: -5
      });
      validationResults.push(result);
      flagReasons.push(result);
    }
  });

  // 7. Subtotal Arithmetic Validation
  const calculatedLineSubtotal = Math.round(lineItems.reduce((sum, item) => sum + (item.amount || item.total || 0), 0) * 100) / 100;
  const subtotalDiff = Math.round(Math.abs(calculatedLineSubtotal - extractedSubtotal) * 100) / 100;
  const subtotalMatches = lineItems.length === 0 || subtotalDiff <= 0.015;

  if (subtotalMatches && extractedSubtotal > 0) {
    scoreBreakdown.push({
      factor: 'Subtotal Validation',
      maxScore: 15,
      earnedScore: 15,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'subtotal',
      validation: 'LINE_ITEM_TOTAL_MATCH',
      status: 'PASSED',
      message: 'Calculated line item total matches invoice subtotal.',
      expected: extractedSubtotal,
      actual: extractedSubtotal,
      difference: 0
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Subtotal Validation',
      maxScore: 15,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.SUBTOTAL_MISMATCH
    });
    const result = createValidationResult({
      field: 'subtotal',
      validation: 'LINE_ITEM_TOTAL_MATCH',
      status: 'FAILED',
      severity: SEVERITY.CRITICAL,
      reasonCode: REASON_CODES.SUBTOTAL_MISMATCH,
      message: 'The subtotal does not match the calculated sum of line items.',
      expected: calculatedLineSubtotal,
      actual: extractedSubtotal,
      difference: subtotalDiff,
      confidenceImpact: -15
    });
    validationResults.push(result);
    flagReasons.push(result);
  }

  // 8. Total Arithmetic Validation
  const expectedTotal = Math.round((extractedSubtotal + extractedTax + extractedShipping) * 100) / 100;
  const totalDiff = Math.round(Math.abs(expectedTotal - extractedTotal) * 100) / 100;
  const totalMatches = totalDiff <= 0.015 && extractedTotal > 0;

  if (totalMatches) {
    scoreBreakdown.push({
      factor: 'Total Arithmetic Validation',
      maxScore: 15,
      earnedScore: 15,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'total',
      validation: 'TOTAL_ARITHMETIC_MATCH',
      status: 'PASSED',
      message: 'Subtotal + Tax + Shipping equals extracted Total Due.',
      expected: extractedTotal,
      actual: extractedTotal,
      difference: 0
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Total Arithmetic Validation',
      maxScore: 15,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.TOTAL_MISMATCH
    });
    const result = createValidationResult({
      field: 'total',
      validation: 'TOTAL_ARITHMETIC_MATCH',
      status: 'FAILED',
      severity: SEVERITY.CRITICAL,
      reasonCode: REASON_CODES.TOTAL_MISMATCH,
      message: 'Extracted total due does not match subtotal + tax + shipping.',
      expected: expectedTotal,
      actual: extractedTotal,
      difference: totalDiff,
      confidenceImpact: -15
    });
    validationResults.push(result);
    flagReasons.push(result);
  }

  // Calculate Earned Score & Confidence Percentage (0..100)
  const earnedSum = scoreBreakdown.reduce((sum, item) => sum + item.earnedScore, 0);
  const confidenceScore = Math.max(0, Math.min(100, earnedSum));

  // Check if confidence is below threshold
  if (confidenceScore < threshold) {
    const scoreDiff = threshold - confidenceScore;
    const lowConfResult = createValidationResult({
      field: 'confidenceScore',
      validation: 'CONFIDENCE_THRESHOLD_CHECK',
      status: 'FAILED',
      severity: SEVERITY.HIGH,
      reasonCode: REASON_CODES.CONFIDENCE_BELOW_THRESHOLD,
      message: `Final confidence score (${confidenceScore}%) is below required threshold (${threshold}%).`,
      expected: `${threshold}%`,
      actual: `${confidenceScore}%`,
      difference: `${scoreDiff}%`,
      confidenceImpact: 0
    });

    if (!flagReasons.some(r => r.reasonCode === REASON_CODES.CONFIDENCE_BELOW_THRESHOLD)) {
      flagReasons.push(lowConfResult);
    }
  }

  // Determine Final Status
  const hasCritical = flagReasons.some(r => r.severity === SEVERITY.CRITICAL);
  const isFlagged = hasCritical || confidenceScore < threshold || flagReasons.length > 0;
  const status = isFlagged ? 'FLAGGED' : 'PROCESSED';

  // Build Human-Readable Decision Reason & Recommended Action
  let decisionReason = `Confidence score ${confidenceScore}% is ${confidenceScore >= threshold ? 'at or above' : 'below'} the required threshold of ${threshold}%.`;
  if (flagReasons.length > 0) {
    decisionReason = `File flagged: ${flagReasons.map(r => r.message).join(' ')}`;
  }

  let recommendedAction = 'No action required. Document passed all validation checks.';
  if (isFlagged) {
    if (flagReasons.some(r => r.reasonCode === REASON_CODES.SUBTOTAL_MISMATCH)) {
      recommendedAction = 'Review line item unit prices & amounts, and update extracted subtotal to match sum of items.';
    } else if (flagReasons.some(r => r.reasonCode === REASON_CODES.TOTAL_MISMATCH)) {
      recommendedAction = 'Verify tax & shipping values and verify grand total arithmetic.';
    } else if (flagReasons.some(r => r.reasonCode === REASON_CODES.VENDOR_NOT_FOUND)) {
      recommendedAction = 'Manually specify custom vendor name and re-verify document.';
    } else {
      recommendedAction = 'Review flagged fields in document detail modal and manually correct extracted values.';
    }
  }

  return {
    documentType: 'INVOICE',
    status,
    confidenceScore,
    threshold,
    score: {
      type: 'CONFIDENCE',
      value: confidenceScore,
      threshold
    },
    decisionReason,
    flagReasons,
    validationResults,
    scoreBreakdown,
    recommendedAction
  };
}

/**
 * Evaluates Dataset document quality, score breakdown, and flag decision.
 */
function evaluateDatasetValidation(rawDataset, options = {}) {
  const threshold = options.threshold || 80; // 80% default quality threshold
  const validationResults = [];
  const flagReasons = [];
  const scoreBreakdown = [];

  const headers = rawDataset.headers || [];
  const rows = rawDataset.rows || [];
  const totalRows = rawDataset.rowCount !== undefined ? rawDataset.rowCount : rows.length;
  const columnCount = rawDataset.columnCount !== undefined ? rawDataset.columnCount : headers.length;
  const missingCount = rawDataset.missingCount || 0;
  const totalCells = totalRows * columnCount;
  const missingRatio = totalCells > 0 ? missingCount / totalCells : 0;

  // 1. File Parsing & Header Detection
  const hasHeaders = headers.length > 0;
  if (hasHeaders) {
    scoreBreakdown.push({
      factor: 'Header Detection',
      maxScore: 25,
      earnedScore: 25,
      status: 'PASSED',
      reasonCode: null
    });
    validationResults.push(createValidationResult({
      field: 'headers',
      validation: 'HEADER_DETECTION',
      status: 'PASSED',
      message: `Detected ${headers.length} header column(s).`,
      expected: 'Valid tabular headers',
      actual: `${headers.length} columns`
    }));
  } else {
    scoreBreakdown.push({
      factor: 'Header Detection',
      maxScore: 25,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.HEADERS_NOT_FOUND
    });
    const result = createValidationResult({
      field: 'headers',
      validation: 'HEADER_DETECTION',
      status: 'FAILED',
      severity: SEVERITY.CRITICAL,
      reasonCode: REASON_CODES.HEADERS_NOT_FOUND,
      message: 'Tabular headers were not found in the dataset file.',
      expected: 'Column Headers',
      actual: 'Missing',
      qualityImpact: -25
    });
    validationResults.push(result);
    flagReasons.push(result);
  }

  // 2. Required Columns Check (if specified)
  const requiredCols = options.requiredColumns || [];
  let missingRequiredCols = [];
  if (requiredCols.length > 0) {
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
    missingRequiredCols = requiredCols.filter(rc => !lowerHeaders.includes(rc.toLowerCase().trim()));
  }

  if (missingRequiredCols.length === 0) {
    scoreBreakdown.push({
      factor: 'Required Columns Check',
      maxScore: 25,
      earnedScore: 25,
      status: 'PASSED',
      reasonCode: null
    });
  } else {
    scoreBreakdown.push({
      factor: 'Required Columns Check',
      maxScore: 25,
      earnedScore: 0,
      status: 'FAILED',
      reasonCode: REASON_CODES.MISSING_REQUIRED_COLUMN
    });
    missingRequiredCols.forEach(col => {
      const result = createValidationResult({
        field: 'headers',
        validation: 'REQUIRED_COLUMN_CHECK',
        status: 'FAILED',
        severity: SEVERITY.CRITICAL,
        reasonCode: REASON_CODES.MISSING_REQUIRED_COLUMN,
        message: `Required column '${col}' was not found in dataset.`,
        expected: `'${col}' Column`,
        actual: 'Column missing',
        qualityImpact: -20
      });
      validationResults.push(result);
      flagReasons.push(result);
    });
  }

  // 3. Row Completeness & Missing Value Ratio
  const completenessScore = Math.max(0, Math.round((1.0 - missingRatio * 0.8) * 50));
  scoreBreakdown.push({
    factor: 'Row Completeness & Cell Integrity',
    maxScore: 50,
    earnedScore: completenessScore,
    status: completenessScore >= 40 ? 'PASSED' : 'FAILED',
    reasonCode: completenessScore < 40 ? REASON_CODES.EMPTY_REQUIRED_VALUE : null
  });

  if (missingCount > 0) {
    const severity = (missingRatio > 0.2) ? SEVERITY.HIGH : SEVERITY.MEDIUM;
    const result = createValidationResult({
      field: 'rows',
      validation: 'CELL_COMPLETENESS',
      status: severity === SEVERITY.HIGH ? 'FAILED' : 'WARNING',
      severity: severity,
      reasonCode: REASON_CODES.EMPTY_REQUIRED_VALUE,
      message: `${missingCount} cell(s) (${(missingRatio * 100).toFixed(1)}%) contain missing or blank values.`,
      expected: 'Complete non-null cells',
      actual: `${missingCount} empty cells`,
      difference: `${missingCount} cells`,
      qualityImpact: -(50 - completenessScore)
    });
    validationResults.push(result);
    if (severity === SEVERITY.HIGH || missingRatio > 0.15) {
      flagReasons.push(result);
    }
  }

  // 4. Line Item / Row Calculation Mismatch Check
  const lineItems = rawDataset.lineItems || [];
  let lineItemCalcErrors = 0;
  lineItems.forEach((item, idx) => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const disc = item.discountPercent || 0;
    const expectedAmt = Math.round(qty * price * (1 - disc / 100.0) * 100) / 100;
    const actualAmt = typeof item.amount === 'number' ? item.amount : (typeof item.total === 'number' ? item.total : 0);
    const diff = Math.round(Math.abs(expectedAmt - actualAmt) * 100) / 100;

    if (qty > 0 && price > 0 && diff > 0.015) {
      lineItemCalcErrors++;
      const result = createValidationResult({
        field: `lineItems[${idx}]`,
        validation: 'LINE_ITEM_CALCULATION',
        status: 'FAILED',
        severity: SEVERITY.HIGH,
        reasonCode: REASON_CODES.LINE_ITEM_CALCULATION_MISMATCH,
        message: `Line item / Row #${item.lineNumber || idx + 1} calculation mismatch for "${item.description || 'Dataset Row'}".`,
        expected: expectedAmt,
        actual: actualAmt,
        difference: diff,
        qualityImpact: -10
      });
      validationResults.push(result);
      flagReasons.push(result);
    }
  });

  if (lineItems.length > 0) {
    scoreBreakdown.push({
      factor: 'Row Arithmetic Verification',
      maxScore: 20,
      earnedScore: lineItemCalcErrors === 0 ? 20 : 0,
      status: lineItemCalcErrors === 0 ? 'PASSED' : 'FAILED',
      reasonCode: lineItemCalcErrors > 0 ? REASON_CODES.LINE_ITEM_CALCULATION_MISMATCH : null
    });
  }

  // Calculate Overall Data Quality Score (0..100)
  const earnedSum = scoreBreakdown.reduce((sum, item) => sum + item.earnedScore, 0);
  const dataQualityScore = Math.max(0, Math.min(100, earnedSum));

  if (dataQualityScore < threshold) {
    const scoreDiff = threshold - dataQualityScore;
    const lowQualityResult = createValidationResult({
      field: 'dataQualityScore',
      validation: 'DATA_QUALITY_THRESHOLD_CHECK',
      status: 'FAILED',
      severity: SEVERITY.HIGH,
      reasonCode: REASON_CODES.DATA_QUALITY_BELOW_THRESHOLD,
      message: `Data Quality Score (${dataQualityScore}%) is below required threshold (${threshold}%).`,
      expected: `${threshold}%`,
      actual: `${dataQualityScore}%`,
      difference: `${scoreDiff}%`,
      qualityImpact: 0
    });
    if (!flagReasons.some(r => r.reasonCode === REASON_CODES.DATA_QUALITY_BELOW_THRESHOLD)) {
      flagReasons.push(lowQualityResult);
    }
  }

  const isFlagged = flagReasons.length > 0 || dataQualityScore < threshold;
  const status = isFlagged ? 'FLAGGED_FOR_REVIEW' : 'VALIDATED';

  let decisionReason = `Data Quality Score ${dataQualityScore}% is ${dataQualityScore >= threshold ? 'at or above' : 'below'} the required threshold of ${threshold}%.`;
  if (flagReasons.length > 0) {
    decisionReason = `Dataset flagged: ${flagReasons.map(r => r.message).join(' ')}`;
  }

  let recommendedAction = 'No action required. Dataset meets quality standards.';
  if (isFlagged) {
    if (missingRequiredCols.length > 0) {
      recommendedAction = `Add missing required column(s): ${missingRequiredCols.join(', ')} to the CSV/Excel file.`;
    } else {
      recommendedAction = 'Clean missing cell values or update invalid data formats in the spreadsheet.';
    }
  }

  return {
    documentType: 'DATASET',
    status,
    dataQualityScore,
    confidenceScore: dataQualityScore / 100.0,
    threshold,
    score: {
      type: 'QUALITY',
      value: dataQualityScore,
      threshold
    },
    decisionReason,
    flagReasons,
    validationResults,
    scoreBreakdown,
    recommendedAction
  };
}

module.exports = {
  REASON_CODES,
  SEVERITY,
  createValidationResult,
  evaluateInvoiceValidation,
  evaluateDatasetValidation
};
