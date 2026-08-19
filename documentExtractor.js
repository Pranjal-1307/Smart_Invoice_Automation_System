const { extractPdf, extractTextFromPdfDataUrl } = require('./extractors/pdfExtractor');
const { extractExcel } = require('./extractors/excelExtractor');
const { extractCsv } = require('./extractors/csvExtractor');
const { normalizeInvoice } = require('./extractors/invoiceNormalizer');
const { REASON_CODES, SEVERITY, createValidationResult } = require('./extractors/flagReasonEngine');

function detectFileType(payload, filename = '') {
  const fileStr = typeof payload === 'string' ? payload : '';
  const name = String(filename || '').toLowerCase();
  
  // 1. Check data URL mime types
  if (fileStr.startsWith('data:')) {
    const mimeMatch = fileStr.match(/^data:([^;]+);/);
    if (mimeMatch) {
      const mime = mimeMatch[1].toLowerCase();
      if (mime === 'application/pdf') return 'PDF';
      if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'XLSX';
      if (mime === 'application/vnd.ms-excel') return 'XLS';
      if (mime === 'text/csv' || mime === 'application/csv') return 'CSV';
    }
  }
  
  // 2. Check filename extension
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.xlsx')) return 'XLSX';
  if (name.endsWith('.xls')) return 'XLS';
  if (name.endsWith('.csv')) return 'CSV';
  
  // 3. Check PDF header signatures in base64/raw
  if (fileStr.startsWith('JVBER') || fileStr.includes('base64,JVBER')) return 'PDF';
  
  // Default fallback if filename has spreadsheet keywords
  if (name.includes('xlsx')) return 'XLSX';
  if (name.includes('xls')) return 'XLS';
  if (name.includes('csv')) return 'CSV';
  
  throw new Error(`Unsupported or undecipherable file type for: "${filename}"`);
}

/**
 * Main Document Details Extraction Routing Engine
 */
async function extractDocumentDetails(fileContentPayload, filename = '', customModel = null, customFields = {}) {
  const logs = [];
  logs.push(`[Pipeline Stage 1: FILE_RECEIVED] Ingesting document: ${filename || 'Upload'}`);
  
  try {
    const fileType = detectFileType(fileContentPayload, filename);
    logs.push(`[File Type Detection] Detected normalized file type: ${fileType}`);
    
    let rawResult;
    switch (fileType) {
      case 'PDF':
        rawResult = await extractPdf(fileContentPayload, filename, customModel, customFields);
        break;
        
      case 'XLSX':
      case 'XLS':
        rawResult = await extractExcel(fileContentPayload, filename, customModel, customFields);
        break;
        
      case 'CSV':
        rawResult = await extractCsv(fileContentPayload, filename, customModel, customFields);
        break;
        
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Normalize the result
    const normalized = normalizeInvoice(rawResult, fileType, {
      isDataset: customFields.isDataset || (rawResult && rawResult.documentType === 'DATASET')
    });
    
    // Merge processing logs
    normalized.processingLogs = [
      ...logs,
      ...normalized.processingLogs
    ];
    
    return normalized;
    
  } catch (err) {
    console.error("[documentExtractor] Extraction process error:", err.message);
    const failLogs = [
      ...logs,
      `[Extraction Error] Failed to process document: ${err.message}`
    ];
    
    const fallbackType = filename.toLowerCase().endsWith('.csv') ? 'CSV' : (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls') ? 'XLSX' : 'PDF');
    const isDatasetFile = fallbackType === 'CSV' || fallbackType === 'XLSX';

    const failReason = createValidationResult({
      field: 'file',
      validation: 'FILE_PARSING',
      status: 'FAILED',
      severity: SEVERITY.CRITICAL,
      reasonCode: fallbackType === 'PDF' ? REASON_CODES.UNREADABLE_PDF : REASON_CODES.FILE_PARSE_FAILED,
      message: `Document processing failed: ${err.message}`,
      expected: 'Valid parseable file stream',
      actual: 'File parse exception',
      confidenceImpact: -100,
      qualityImpact: -100
    });

    return {
      documentType: isDatasetFile ? 'DATASET' : 'INVOICE',
      invoiceNumber: `INV-UNPARSED-${Date.now().toString().slice(-4)}`,
      filename: filename || 'unparsed_file',
      vendor: 'Unknown Vendor',
      vendorEmail: '',
      date: '',
      dueDate: '',
      currency: 'USD',
      poNumber: '',
      paymentTerms: '',
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      status: 'FLAGGED',
      confidenceScore: 0,
      dataQualityScore: 0,
      threshold: 85,
      score: {
        type: isDatasetFile ? 'QUALITY' : 'CONFIDENCE',
        value: 0,
        threshold: 85
      },
      decisionReason: `Processing failed: ${err.message}`,
      recommendedAction: 'Verify that the uploaded file is not corrupted or password-protected and upload a valid PDF/CSV/Excel document.',
      flagReasons: [failReason],
      validationResults: [failReason],
      scoreBreakdown: [
        {
          factor: 'Document File Parsing',
          maxScore: 100,
          earnedScore: 0,
          status: 'FAILED',
          reasonCode: failReason.reasonCode
        }
      ],
      fieldConfidence: { vendor: 0, invoiceNumber: 0, date: 0, dueDate: 0, lineItems: 0, totals: 0 },
      lineItems: [],
      extraction: {
        fileType: fallbackType,
        method: 'EXTRACTION_FAILED',
        sheetName: null,
        rowCount: null,
        columnCount: null,
        ocrUsed: false,
        pageCount: 0,
        rawTextAvailable: false,
        rawTextLength: 0,
        lineItemCount: 0,
        warnings: [err.message]
      },
      validation: {
        status: 'FAILED',
        subtotalMatch: false,
        taxMatch: false,
        shippingMatch: false,
        totalMatch: false,
        errors: [err.message],
        warnings: []
      },
      processingLogs: failLogs,
      rawText: ''
    };
  }
}

module.exports = {
  extractDocumentDetails,
  extractTextFromPdfDataUrl
};
