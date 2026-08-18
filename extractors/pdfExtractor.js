const fs = require('fs');
const path = require('path');
const { loadModel } = require('../train_model');

let PDFParseModule;
try {
  const pdfParsePkg = require('pdf-parse');
  PDFParseModule = pdfParsePkg.PDFParse || pdfParsePkg;
} catch (e) {
  PDFParseModule = null;
}

/**
 * High-Accuracy Multi-Page PDF Text Extraction Engine
 */
async function extractTextFromPdfDataUrl(fileDataUrl) {
  try {
    if (!fileDataUrl || typeof fileDataUrl !== 'string') {
      return { fullText: '', pages: [], pageCount: 0, method: 'PDF_TEXT', ocrUsed: false };
    }

    let buffer;
    if (fileDataUrl.startsWith('data:') || fileDataUrl.includes('base64,')) {
      const base64Data = fileDataUrl.includes('base64,') 
        ? fileDataUrl.split('base64,')[1] 
        : fileDataUrl;
      buffer = Buffer.from(base64Data, 'base64');
    } else if (fs.existsSync(fileDataUrl)) {
      buffer = fs.readFileSync(fileDataUrl);
    } else {
      // Direct raw text passed
      return { fullText: fileDataUrl, pages: [{ num: 1, text: fileDataUrl }], pageCount: 1, method: 'PDF_TEXT', ocrUsed: false };
    }

    if (PDFParseModule) {
      try {
        const parser = new PDFParseModule({ data: buffer });
        const res = await parser.getText();
        if (res && res.text && res.text.trim().length > 10) {
          const pages = res.pages || [{ num: 1, text: res.text }];
          return {
            fullText: res.text.trim(),
            pages: pages,
            pageCount: res.total || pages.length,
            method: 'PDF_TEXT',
            ocrUsed: false
          };
        }
      } catch (err) {
        console.warn("[PDF_EXTRACTOR] PDFParse notice:", err.message);
      }
    }

    // Direct binary text fallback for stream inspection
    const rawString = buffer.toString('binary');
    const matches = [];
    const parenthesisRegex = /\(([^()\\]|\\[\s\S])*\)/g;
    let match;

    while ((match = parenthesisRegex.exec(rawString)) !== null) {
      const text = match[0].slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\([()])/g, '$1');
      
      if (/[a-zA-Z0-9_\-\$\.,:\s]{3,}/.test(text)) {
        matches.push(text.trim());
      }
    }

    const extracted = matches.length > 0 ? matches.join('\n') : rawString.replace(/[\x00-\x1F\x7F-\xFF]/g, ' ');
    return {
      fullText: extracted,
      pages: [{ num: 1, text: extracted }],
      pageCount: 1,
      method: extracted.length > 20 ? 'PDF_TEXT' : 'OCR',
      ocrUsed: extracted.length <= 20
    };
  } catch (err) {
    console.error("[PDF_EXTRACTOR] Error decoding PDF stream:", err.message);
    return { fullText: '', pages: [], pageCount: 0, method: 'EXTRACTION_FAILED', ocrUsed: false };
  }
}

/**
 * Extracts line item table rows across multi-page document layout
 */
function extractTableLineItems(text) {
  const lineItems = [];
  const lines = text.split(/\r?\n/);
  let pendingDesc = '';

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Ignore headers, footers, bank details
    if (/^(invoice|bill to|invoice details|page \d+|service & product|additional deliverables|bank:|payment method|swift|account|subtotal|sales tax|shipping|total due|grand total)/i.test(trimmed)) {
      pendingDesc = '';
      continue;
    }

    // Pattern 1: # Description Qty UnitPrice Discount Amount
    const p1 = trimmed.match(/^(\d+)\s+(.+?)\s+(\d+)\s+[\$€£₹]?\s*([\-\d,]+\.\d{2})\s+(\d+)%\s+[\$€£₹]?\s*([\-\d,]+\.\d{2})$/);
    if (p1) {
      const lineNum = parseInt(p1[1], 10);
      const desc = (pendingDesc ? pendingDesc + ' ' + p1[2] : p1[2]).trim();
      pendingDesc = '';
      const qty = parseInt(p1[3], 10);
      const unitPrice = parseFloat(p1[4].replace(/,/g, ''));
      const disc = parseFloat(p1[5]);
      const amount = parseFloat(p1[6].replace(/,/g, ''));

      lineItems.push({
        lineNumber: lineNum,
        description: desc,
        quantity: qty,
        unitPrice: unitPrice,
        discountPercent: disc,
        amount: amount,
        total: amount
      });
      continue;
    }

    // Pattern 2: Description Qty UnitPrice Amount (Without # or Discount)
    const p2 = trimmed.match(/^(.+?)\s+(\d+)\s+[\$€£₹]?\s*([\-\d,]+\.\d{2})\s+[\$€£₹]?\s*([\-\d,]+\.\d{2})$/);
    if (p2) {
      const descCandidate = (pendingDesc ? pendingDesc + ' ' + p2[1] : p2[1]).trim();
      pendingDesc = '';

      if (!/subtotal|total|tax|discount|due|amount/i.test(descCandidate)) {
        const qty = parseInt(p2[2], 10);
        const unitPrice = parseFloat(p2[3].replace(/,/g, ''));
        const amount = parseFloat(p2[4].replace(/,/g, ''));

        lineItems.push({
          lineNumber: lineItems.length + 1,
          description: descCandidate,
          quantity: qty,
          unitPrice: unitPrice,
          discountPercent: 0,
          amount: amount,
          total: amount
        });
      }
      continue;
    }

    // Handle wrapped multi-line descriptions
    if (trimmed.length > 3 && !/\d+\s+[\$€£₹]?[\d,]+\.\d{2}/.test(trimmed) && !/invoice|date|due|details|summary|deliverables|subtotal|total|page/i.test(trimmed)) {
      pendingDesc = pendingDesc ? pendingDesc + ' ' + trimmed : trimmed;
    } else {
      pendingDesc = '';
    }
  }

  return lineItems;
}

function normalizeDate(rawStr) {
  if (!rawStr) return '';
  try {
    const cleaned = rawStr.replace(/^(date|issue date|invoice date|due date)[:\s]*/i, '').trim();
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return rawStr;
}

/**
 * Main PDF Extraction logic
 */
async function extractPdf(fileContentPayload, filename = '', customModel = null, customFields = {}) {
  const model = customModel || loadModel();
  const logs = [];
  const warnings = [];

  logs.push(`[Pipeline Stage 1: FILE_RECEIVED] Ingesting document: ${filename || 'Upload'}`);

  const pdfResult = await extractTextFromPdfDataUrl(fileContentPayload);
  const rawText = pdfResult.fullText || '';
  logs.push(`[Pipeline Stage 2: PDF_TEXT_EXTRACTION] Extracted ${rawText.length} characters across ${pdfResult.pageCount} page(s) using method ${pdfResult.method}`);

  if (pdfResult.ocrUsed) {
    logs.push(`[Pipeline Stage 3: OCR_FALLBACK] Native text sparse/absent. OCR extraction flagged: ${pdfResult.ocrUsed}`);
  }

  if (!rawText || rawText.trim().length < 15) {
    logs.push(`[Extraction Error] Document contains no parseable text.`);
    return {
      invoiceNumber: '',
      vendor: '',
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
      status: 'FAILED',
      confidenceScore: 0,
      fieldConfidence: { vendor: 0, invoiceNumber: 0, date: 0, dueDate: 0, lineItems: 0, totals: 0 },
      lineItems: [],
      extraction: {
        fileType: 'PDF',
        method: 'EXTRACTION_FAILED',
        sheetName: null,
        rowCount: null,
        columnCount: null,
        ocrUsed: pdfResult.ocrUsed,
        pageCount: pdfResult.pageCount,
        rawTextAvailable: false,
        rawTextLength: 0,
        lineItemCount: 0,
        warnings: ["Insufficient or empty text extracted from document"]
      },
      validation: {
        status: 'FAILED',
        subtotalMatch: false,
        taxMatch: false,
        shippingMatch: false,
        totalMatch: false,
        errors: ["PDF Extraction Failed: No readable text found"],
        warnings: []
      },
      processingLogs: logs,
      rawText: ''
    };
  }

  const fullContext = `${filename}\n${rawText}`;

  // HEADER EXTRACTION
  logs.push(`[Pipeline Stage 4: HEADER_EXTRACTION] Extracting header metadata (Vendor, Invoice #, Dates, PO #)...`);

  let vendor = '';
  let vendorEmail = '';

  const headerLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const billFromMatch = fullContext.match(/(?:BILL\s+FROM|FROM|Vendor)[:\s]+([A-Za-z0-9\s.,&\(\)\-]+?)(?=\r?\n|BILL\s+TO|INVOICE|GSTIN|#|$)/i);
  if (billFromMatch && billFromMatch[1] && billFromMatch[1].trim().length > 2) {
    vendor = billFromMatch[1].trim().split(/\r?\n/)[0].trim();
  }

  if (!vendor) {
    for (let i = 0; i < Math.min(5, headerLines.length); i++) {
      const line = headerLines[i];
      if (/^(INVOICE|BILL TO|INVOICE DETAILS|PAGE|SERVICE|DESCRIPTION)/i.test(line)) continue;
      if (/[A-Z0-9\s.,&]{4,}/.test(line) && !line.includes(':') && !/^(date|due|total|subtotal)/i.test(line)) {
        vendor = line.replace(/–|-|\(.*?\)/g, '').trim();
        break;
      }
    }
  }

  if (!vendor || vendor.length < 3) {
    for (const sig of (model.vendorSignatures || [])) {
      if (sig.keywords && sig.keywords.some(kw => fullContext.toLowerCase().includes(kw))) {
        vendor = sig.vendor;
        vendorEmail = sig.email || vendorEmail;
        break;
      }
    }
  }

  if (customFields.customVendor && customFields.customVendor.trim().length > 0) {
    vendor = customFields.customVendor.trim();
  }

  const emailMatch = fullContext.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    vendorEmail = emailMatch[1];
  }

  let invoiceNumber = '';
  const invNumMatch = fullContext.match(/(?:Invoice\s*Number|Invoice\s*#|Inv\s*#|Invoice\s*ID|Invoice\s*No\.?|Ref\s*#)[:\s]*([A-Z0-9\-]{3,25})/i)
                   || fullContext.match(/\b(INV-[A-Z0-9\-]{3,20})\b/i);

  if (invNumMatch) {
    invoiceNumber = invNumMatch[1].trim();
  }

  let date = customFields.customDate || '';
  let dueDate = '';

  const dateMatch = fullContext.match(/(?:Invoice\s*Date|Issue\s*Date|Date)[:\s]*([A-Za-z0-9, /\-]{6,25})/i);
  if (dateMatch) {
    date = normalizeDate(dateMatch[1]);
  }

  const dueDateMatch = fullContext.match(/(?:Due\s*Date|Payment\s*Due)[:\s]*([A-Za-z0-9, /\-]{6,25})/i);
  if (dueDateMatch) {
    dueDate = normalizeDate(dueDateMatch[1]);
  }

  let poNumber = '';
  const poMatch = fullContext.match(/(?:PO\s*Number|PO\s*#|Purchase\s*Order)[:\s]*([A-Z0-9\-]{3,25})/i) || fullContext.match(/\b(PO-[A-Z0-9\-]{3,20})\b/i);
  if (poMatch) {
    poNumber = poMatch[1].trim();
  }

  let currency = 'USD';
  const currMatch = fullContext.match(/(?:Currency|Currency Code)[:\s]*([A-Z]{3})/i);
  if (currMatch) {
    currency = currMatch[1].toUpperCase();
  } else if (fullContext.includes('€')) {
    currency = 'EUR';
  } else if (fullContext.includes('£')) {
    currency = 'GBP';
  } else if (fullContext.includes('₹')) {
    currency = 'INR';
  }

  let paymentTerms = '';
  const termsMatch = fullContext.match(/(?:Payment\s*Terms|Terms)[:\s]*([A-Za-z0-9\s]+?)(?=\r?\n|\.|$)/i);
  if (termsMatch) {
    paymentTerms = termsMatch[1].trim();
  }

  logs.push(`[Header Result] Vendor: "${vendor}", Email: "${vendorEmail}", Inv #: "${invoiceNumber}", Date: "${date}", Due: "${dueDate}", PO #: "${poNumber}", Currency: "${currency}"`);

  // LINE ITEM TABLE EXTRACTION
  logs.push(`[Pipeline Stage 5: LINE_ITEM_EXTRACTION] Extracting table rows across multi-page layout...`);
  const lineItems = extractTableLineItems(rawText);
  logs.push(`[Line Items Result] Extracted ${lineItems.length} line item(s)`);

  // FINANCIAL TOTALS EXTRACTION
  logs.push(`[Pipeline Stage 6: TOTAL_EXTRACTION] Extracting financial summary totals (Subtotal, Tax, Shipping, Total Due)...`);
  
  let subtotal = null;
  let tax = 0.00;
  let shipping = 0.00;
  let total = null;

  const subtotalMatch = fullContext.match(/(?:Subtotal|Sub-Total|Net Subtotal|Net Amount)[:\s]*[\$€£₹]?\s*([\-\d,]+\.\d{2})/i);
  if (subtotalMatch) {
    subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
  }

  const taxMatch = fullContext.match(/(?:Sales\s*Tax|Tax(?:\s*\([\d\.]*%\))?)[:\s]*[\$€£₹]?\s*([\-\d,]+\.\d{2})/i);
  if (taxMatch) {
    tax = parseFloat(taxMatch[1].replace(/,/g, ''));
  }

  const shippingMatch = fullContext.match(/(?:Shipping\s*&\s*Handling|Shipping|Freight|Handling)[:\s]*[\$€£₹]?\s*([\-\d,]+\.\d{2})/i);
  if (shippingMatch) {
    shipping = parseFloat(shippingMatch[1].replace(/,/g, ''));
  }

  const totalMatch = fullContext.match(/(?:Total\s*Due|Grand\s*Total|Total\s*Amount\s*Due)(?:\s*\(.*?\))?[:\s]*[\$€£₹]?\s*([\-\d,]+\.\d{2})/i)
                  || fullContext.match(/(?:Total)(?:\s*\(.*?\))?[:\s]*[\$€£₹]?\s*([\-\d,]+\.\d{2})/i);
  if (totalMatch) {
    total = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  const calculatedLineSubtotal = Math.round(lineItems.reduce((sum, item) => sum + (item.amount || item.total || 0), 0) * 100) / 100;
  if (subtotal === null && lineItems.length > 0) {
    subtotal = calculatedLineSubtotal;
  }
  if (total === null) {
    if (subtotal !== null) {
      total = Math.round((subtotal + tax + shipping) * 100) / 100;
    } else if (calculatedLineSubtotal > 0) {
      total = Math.round((calculatedLineSubtotal + tax + shipping) * 100) / 100;
      subtotal = calculatedLineSubtotal;
    }
  }

  subtotal = subtotal !== null ? parseFloat(subtotal.toFixed(2)) : 0.00;
  tax = parseFloat(tax.toFixed(2));
  shipping = parseFloat(shipping.toFixed(2));
  total = total !== null ? parseFloat(total.toFixed(2)) : 0.00;

  logs.push(`[Totals Result] Extracted Subtotal: $${subtotal.toFixed(2)}, Tax: $${tax.toFixed(2)}, Shipping: $${shipping.toFixed(2)}, Total: $${total.toFixed(2)}`);

  return {
    invoiceNumber,
    vendor,
    vendorEmail,
    date,
    dueDate,
    currency,
    poNumber,
    paymentTerms,
    subtotal,
    tax,
    shipping,
    total,
    lineItems,
    extraction: {
      fileType: 'PDF',
      method: pdfResult.method,
      sheetName: null,
      rowCount: null,
      columnCount: null,
      ocrUsed: pdfResult.ocrUsed,
      pageCount: pdfResult.pageCount,
      rawTextAvailable: rawText.length > 0,
      rawTextLength: rawText.length,
      lineItemCount: lineItems.length,
      warnings: warnings
    },
    processingLogs: logs,
    rawText: rawText
  };
}

module.exports = {
  extractPdf
};
