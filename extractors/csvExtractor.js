const fs = require('fs');
const path = require('path');

function parseNumeric(val) {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[\$€£₹\s,%]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDiscountPercentStr(val) {
  if (!val) return 0;
  const trimmed = val.replace(/[%]/g, '').trim();
  if (val.includes('%')) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) return num;
  }
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    if (num > 0 && num < 1) return num * 100;
    return num;
  }
  return 0;
}

function normalizeDateString(rawStr) {
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

function detectDelimiter(content) {
  const delimiters = [',', ';', '|', '\t'];
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return ',';
  
  let bestDelim = ',';
  let maxScore = -1;
  
  for (const delim of delimiters) {
    let counts = lines.map(line => line.split(delim).length - 1);
    let totalCount = counts.reduce((a, b) => a + b, 0);
    let nonZeroRows = counts.filter(c => c > 0).length;
    let score = totalCount * (nonZeroRows / lines.length);
    if (score > maxScore) {
      maxScore = score;
      bestDelim = delim;
    }
  }
  return bestDelim;
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
}

function findNumInRowCSV(row, startCol) {
  for (let c = startCol; c < row.length; c++) {
    const cellVal = row[c].trim();
    if (cellVal !== '') {
      const num = parseFloat(cellVal.replace(/[\$€£₹\s,%]/g, ''));
      if (!isNaN(num)) {
        return num;
      }
    }
  }
  return null;
}

async function extractCsv(fileContentPayload, filename = '', customModel = null, customFields = {}) {
  const logs = [];
  logs.push(`[Pipeline Stage 1: CSV_RECEIVED] Ingesting CSV file: ${filename || 'Upload'}`);

  try {
    let rawContent = '';
    if (typeof fileContentPayload === 'string') {
      if (fileContentPayload.startsWith('data:') || fileContentPayload.includes('base64,')) {
        const base64Data = fileContentPayload.includes('base64,') 
          ? fileContentPayload.split('base64,')[1] 
          : fileContentPayload;
        rawContent = Buffer.from(base64Data, 'base64').toString('utf8');
      } else if (fs.existsSync(fileContentPayload)) {
        rawContent = fs.readFileSync(fileContentPayload, 'utf8');
      } else {
        rawContent = fileContentPayload;
      }
    } else if (Buffer.isBuffer(fileContentPayload)) {
      rawContent = fileContentPayload.toString('utf8');
    } else {
      throw new Error("Unsupported CSV payload type");
    }

    // Strip BOM if present
    if (rawContent.charCodeAt(0) === 0xFEFF) {
      rawContent = rawContent.slice(1);
    }

    const delimiter = detectDelimiter(rawContent);
    logs.push(`[CSV Delimiter Detection] Auto-detected delimiter: "${delimiter === '\t' ? '\\t' : delimiter}"`);

    const lines = rawContent.split(/\r?\n/);
    const rows = lines.map(line => parseCSVLine(line, delimiter));

    // Extract Metadata
    let vendor = '';
    let vendorEmail = '';
    let invoiceNumber = '';
    let invoiceDate = '';
    let dueDate = '';
    let poNumber = '';
    let currency = '';
    let paymentTerms = '';

    const metadataLabelMappings = {
      invoiceNumber: [/invoice\s*number/i, /invoice\s*no\.?/i, /invoice\s*#/i, /inv\s*#/i, /invoice\s*id/i],
      vendor: [/vendor/i, /supplier/i, /bill\s*from/i],
      invoiceDate: [/invoice\s*date/i, /issue\s*date/i, /^date$/i],
      dueDate: [/due\s*date/i],
      currency: [/currency/i],
      paymentTerms: [/payment\s*terms/i, /^terms$/i]
    };

    // Scan first 15 rows for key-value labels in columns 0 and 1
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      if (row.length >= 2) {
        const label = row[0].trim();
        const val = row[1].trim();
        if (label && val) {
          for (const field in metadataLabelMappings) {
            if (metadataLabelMappings[field].some(rx => rx.test(label))) {
              if (field === 'invoiceNumber' && !invoiceNumber) invoiceNumber = val;
              else if (field === 'vendor' && !vendor) vendor = val;
              else if (field === 'invoiceDate' && !invoiceDate) invoiceDate = normalizeDateString(val);
              else if (field === 'dueDate' && !dueDate) dueDate = normalizeDateString(val);
              else if (field === 'currency' && !currency) {
                const match = val.match(/([A-Z]{3})/i);
                currency = match ? match[1].toUpperCase() : val.toUpperCase();
              }
              else if (field === 'paymentTerms' && !paymentTerms) paymentTerms = val;
            }
          }
        }
      }
    }

    // Extract Email from any cell in the file
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const cellVal = rows[r][c];
        const emailMatch = cellVal.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
        if (emailMatch) {
          vendorEmail = emailMatch[1];
        }
      }
    }

    // Auto-detect Currency from symbols
    if (!currency) {
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          const text = rows[r][c].toUpperCase();
          if (text.includes('EUR') || text.includes('€')) {
            currency = 'EUR';
            break;
          } else if (text.includes('USD') || text.includes('$')) {
            currency = 'USD';
            break;
          } else if (text.includes('GBP') || text.includes('£')) {
            currency = 'GBP';
            break;
          } else if (text.includes('INR') || text.includes('₹')) {
            currency = 'INR';
            break;
          }
        }
        if (currency) break;
      }
    }
    if (!currency) currency = 'USD';

    if (customFields.customVendor && customFields.customVendor.trim().length > 0) {
      vendor = customFields.customVendor.trim();
    }
    if (customFields.customDate && customFields.customDate.trim().length > 0) {
      invoiceDate = normalizeDateString(customFields.customDate.trim());
    }

    // Line Item Table detection
    let headerRowIndex = -1;
    let colIndices = {
      lineNumber: -1,
      description: -1,
      quantity: -1,
      unitPrice: -1,
      discount: -1,
      amount: -1
    };

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      let hasDescription = false;
      let hasQty = false;
      let hasPrice = false;
      
      for (let c = 0; c < row.length; c++) {
        const val = row[c].toLowerCase().trim();
        if (val === '#' || val === 'no' || val === 'item') {
          colIndices.lineNumber = c;
        } else if (val.includes('description') || val.includes('item') || val.includes('product') || val.includes('service')) {
          colIndices.description = c;
          hasDescription = true;
        } else if (val === 'qty' || val.includes('quantity')) {
          colIndices.quantity = c;
          hasQty = true;
        } else if (val.includes('unit price') || val === 'price' || val === 'rate' || val.includes('unitprice')) {
          colIndices.unitPrice = c;
          hasPrice = true;
        } else if (val.includes('discount')) {
          colIndices.discount = c;
        } else if (val === 'amount' || val === 'total') {
          colIndices.amount = c;
        }
      }
      
      if (hasDescription && (hasQty || hasPrice)) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error("CSV line-item header not found");
    }

    logs.push(`[Line Items Stage] Detected header row at index ${headerRowIndex + 1}`);

    const lineItems = [];
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 0 || row.every(c => c.trim() === '')) continue;
      
      const descVal = colIndices.description !== -1 && row[colIndices.description] ? row[colIndices.description].trim() : '';
      if (!descVal) continue;
      
      const qtyStr = colIndices.quantity !== -1 && row[colIndices.quantity] ? row[colIndices.quantity].trim() : '';
      const priceStr = colIndices.unitPrice !== -1 && row[colIndices.unitPrice] ? row[colIndices.unitPrice].trim() : '';
      
      const isTotalsOrSummary = /subtotal|total\s*due|grand\s*total|payment\s*method|amount\s+in\s+words/i.test(descVal) ||
        ((/shipping|handling|tax|vat|gst|cgst|sgst/i.test(descVal) || /subtotal|total|tax|vat|shipping|handling/i.test(row[0] || '')) && !qtyStr && !priceStr);
      
      if (isTotalsOrSummary) {
        break;
      }

      const lineNo = colIndices.lineNumber !== -1 && row[colIndices.lineNumber] ? parseInt(row[colIndices.lineNumber], 10) : (lineItems.length + 1);
      const qty = colIndices.quantity !== -1 && row[colIndices.quantity] ? parseInt(row[colIndices.quantity], 10) : 1;
      const unitPrice = colIndices.unitPrice !== -1 && row[colIndices.unitPrice] ? parseNumeric(row[colIndices.unitPrice]) : 0;
      const discountPercent = colIndices.discount !== -1 && row[colIndices.discount] ? parseDiscountPercentStr(row[colIndices.discount]) : 0;
      const amount = colIndices.amount !== -1 && row[colIndices.amount] ? parseNumeric(row[colIndices.amount]) : null;

      const expectedAmount = Math.round(qty * unitPrice * (1 - discountPercent / 100.0) * 100) / 100;
      const finalAmount = amount === null || isNaN(amount) ? expectedAmount : amount;

      lineItems.push({
        lineNumber: isNaN(lineNo) ? (lineItems.length + 1) : lineNo,
        description: descVal,
        quantity: isNaN(qty) ? 1 : qty,
        unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
        discountPercent: isNaN(discountPercent) ? 0 : discountPercent,
        amount: finalAmount,
        total: finalAmount
      });
    }

    logs.push(`[Line Items Result] Extracted ${lineItems.length} line item(s)`);

    // Extract Totals
    let subtotal = null;
    let tax = 0;
    let shipping = 0;
    let total = null;

    const subtotalRegex = /subtotal|sub-total|net\s*amount/i;
    const taxRegex = /sales\s*tax|tax|vat|gst|cgst|sgst/i;
    const shippingRegex = /shipping|handling|freight/i;
    const totalRegex = /grand\s*total|total\s*due|total\s*amount|total$/i;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const valStr = row[c].trim();
        if (!valStr) continue;

        if (shippingRegex.test(valStr)) {
          const val = findNumInRowCSV(row, c + 1);
          if (val !== null) shipping = val;
        } else if (subtotalRegex.test(valStr)) {
          const val = findNumInRowCSV(row, c + 1);
          if (val !== null) subtotal = val;
        } else if (totalRegex.test(valStr)) {
          const val = findNumInRowCSV(row, c + 1);
          if (val !== null) total = val;
        } else if (taxRegex.test(valStr)) {
          const val = findNumInRowCSV(row, c + 1);
          if (val !== null) tax += val;
        }
      }
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
      vendor: vendor || '',
      vendorEmail,
      date: invoiceDate,
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
        fileType: 'CSV',
        method: 'CSV',
        sheetName: null,
        rowCount: rows.length,
        columnCount: rows[0] ? rows[0].length : 0,
        ocrUsed: false,
        pageCount: 1,
        rawTextAvailable: false,
        rawTextLength: 0,
        lineItemCount: lineItems.length,
        warnings: []
      },
      processingLogs: logs,
      rawText: ''
    };
  } catch (err) {
    logs.push(`[CSV Extraction Failed] Error: ${err.message}`);
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
      lineItems: [],
      extraction: {
        fileType: 'CSV',
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
      processingLogs: logs,
      rawText: ''
    };
  }
}

module.exports = {
  extractCsv
};
