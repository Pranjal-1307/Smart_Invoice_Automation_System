const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function parseNumeric(val) {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[\$€£₹\s,%]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDiscountPercent(cell) {
  if (!cell) return 0;
  if (cell.w && cell.w.includes('%')) {
    const val = parseFloat(cell.w.replace(/[%]/g, ''));
    if (!isNaN(val)) return val;
  }
  if (cell.v !== undefined && typeof cell.v === 'number') {
    if (cell.v > 0 && cell.v < 1) {
      return Math.round(cell.v * 100 * 100) / 100;
    }
    return cell.v;
  }
  return parseNumeric(cell.v);
}

function parseDate(cell) {
  if (!cell || cell.v === undefined) return '';
  if (cell.t === 'd' || cell.v instanceof Date) {
    const d = cell.v;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return normalizeDateString(String(cell.v));
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

function findNumInRow(row, startCol) {
  for (let c = startCol; c < row.length; c++) {
    const cell = row[c];
    if (cell && cell.v !== undefined && cell.v !== '') {
      const num = parseFloat(String(cell.v).replace(/[\$€£₹\s,%]/g, ''));
      if (!isNaN(num)) {
        return num;
      }
    }
  }
  return null;
}

async function extractExcel(fileContentPayload, filename = '', customModel = null, customFields = {}) {
  const logs = [];
  logs.push(`[Pipeline Stage 1: EXCEL_RECEIVED] Ingesting Excel spreadsheet: ${filename || 'Upload'}`);

  try {
    let buffer;
    if (typeof fileContentPayload === 'string') {
      if (fileContentPayload.startsWith('data:') || fileContentPayload.includes('base64,')) {
        const base64Data = fileContentPayload.includes('base64,') 
          ? fileContentPayload.split('base64,')[1] 
          : fileContentPayload;
        buffer = Buffer.from(base64Data, 'base64');
      } else if (fs.existsSync(fileContentPayload)) {
        buffer = fs.readFileSync(fileContentPayload);
      } else {
        throw new Error("Invalid file content format or file not found");
      }
    } else if (Buffer.isBuffer(fileContentPayload)) {
      buffer = fileContentPayload;
    } else {
      throw new Error("Unsupported Excel payload type");
    }

    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true, cellNF: true, cellFormula: true });
    
    // Sheet scoring to find the best invoice sheet
    const keywords = ['INVOICE', 'Invoice No', 'Invoice Number', 'Bill To', 'Subtotal', 'Total Due', 'Amount', 'Description'];
    let highestScore = -1;
    let selectedSheetName = workbook.SheetNames[0];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      let score = 0;
      for (const key in sheet) {
        if (key[0] === '!') continue;
        const cell = sheet[key];
        if (cell && cell.v) {
          const valStr = String(cell.v).toLowerCase();
          for (const kw of keywords) {
            if (valStr.includes(kw.toLowerCase())) {
              score++;
            }
          }
        }
      }
      if (score > highestScore) {
        highestScore = score;
        selectedSheetName = sheetName;
      }
    }

    logs.push(`[Excel Sheet Selection] Detected sheets: [${workbook.SheetNames.join(', ')}]. Selected sheet: "${selectedSheetName}" with score ${highestScore}`);

    const sheet = workbook.Sheets[selectedSheetName];
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const maxR = range.e.r;
    const maxC = range.e.c;
    
    // Parse sheet to 2D array of cell objects
    const sheetData = [];
    for (let r = 0; r <= maxR; r++) {
      const row = [];
      for (let c = 0; c <= maxC; c++) {
        const cellAddress = xlsx.utils.encode_cell({ r, c });
        row.push(sheet[cellAddress] || null);
      }
      sheetData.push(row);
    }

    // Extract Vendor
    let vendor = '';
    let vendorEmail = '';

    // First search top cells for vendor email
    for (let r = 0; r < Math.min(sheetData.length, 15); r++) {
      for (let c = 0; c < sheetData[r].length; c++) {
        const cell = sheetData[r][c];
        if (cell && cell.v) {
          const emailMatch = String(cell.v).match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
          if (emailMatch && !vendorEmail) {
            vendorEmail = emailMatch[1];
          }
        }
      }
    }

    // Search for BILL FROM label
    let foundLabel = false;
    for (let r = 0; r < Math.min(sheetData.length, 10); r++) {
      for (let c = 0; c < sheetData[r].length; c++) {
        const cell = sheetData[r][c];
        if (cell && cell.v) {
          const valStr = String(cell.v).trim();
          if (/^(bill\s+from|from|vendor|supplier)[:]?$/i.test(valStr)) {
            if (r + 1 < sheetData.length && sheetData[r+1][c] && sheetData[r+1][c].v) {
              vendor = String(sheetData[r+1][c].v).trim();
              foundLabel = true;
              break;
            }
            if (c + 1 < sheetData[r].length && sheetData[r][c+1] && sheetData[r][c+1].v) {
              vendor = String(sheetData[r][c+1].v).trim();
              foundLabel = true;
              break;
            }
          }
        }
      }
      if (foundLabel) break;
    }

    // Fallback: topmost cell that is a string, not invoice metadata
    if (!vendor) {
      for (let r = 0; r < Math.min(sheetData.length, 5); r++) {
        for (let c = 0; c < sheetData[r].length; c++) {
          const cell = sheetData[r][c];
          if (cell && cell.t === 's' && cell.v) {
            const valStr = String(cell.v).trim();
            if (valStr.length > 3 && !/invoice|bill\s*to|ship\s*to|date|po|currency|payment/i.test(valStr)) {
              vendor = valStr.split('\n')[0].trim();
              break;
            }
          }
        }
        if (vendor) break;
      }
    }

    if (customFields.customVendor && customFields.customVendor.trim().length > 0) {
      vendor = customFields.customVendor.trim();
    }

    // Extract Metadata via vertical / horizontal labels
    const metadata = {
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      poNumber: '',
      currency: '',
      paymentTerms: ''
    };

    const labelMappings = {
      invoiceNumber: [/invoice\s*no\.?/i, /invoice\s*number/i, /invoice\s*#/i, /inv\s*#/i, /invoice\s*id/i, /inv\s*no\.?/i],
      invoiceDate: [/invoice\s*date/i, /issue\s*date/i, /^date$/i],
      dueDate: [/due\s*date/i, /payment\s*due/i],
      poNumber: [/po\s*number/i, /po\s*#/i, /purchase\s*order/i],
      currency: [/currency/i],
      paymentTerms: [/payment\s*terms/i, /^terms$/i]
    };

    for (let r = 0; r < sheetData.length; r++) {
      for (let c = 0; c < sheetData[r].length; c++) {
        const cell = sheetData[r][c];
        if (cell && cell.v) {
          const valStr = String(cell.v).trim();
          for (const field in labelMappings) {
            const regexes = labelMappings[field];
            if (regexes.some(rx => rx.test(valStr))) {
              let value = '';
              let valueCell = null;
              if (c + 1 < sheetData[r].length && sheetData[r][c+1] && sheetData[r][c+1].v !== undefined) {
                value = String(sheetData[r][c+1].v).trim();
                valueCell = sheetData[r][c+1];
              }
              if (!value && r + 1 < sheetData.length && sheetData[r+1][c] && sheetData[r+1][c].v !== undefined) {
                value = String(sheetData[r+1][c].v).trim();
                valueCell = sheetData[r+1][c];
              }

              if (value && !metadata[field]) {
                if (field === 'invoiceDate' || field === 'dueDate') {
                  metadata[field] = parseDate(valueCell);
                } else if (field === 'currency') {
                  const match = value.match(/([A-Z]{3})/);
                  metadata[field] = match ? match[1] : value;
                } else {
                  metadata[field] = value;
                }
              }
            }
          }
        }
      }
    }

    if (customFields.customDate && customFields.customDate.trim().length > 0) {
      metadata.invoiceDate = normalizeDateString(customFields.customDate.trim());
    }

    // Auto-detect Currency from cell formatting if not found
    if (!metadata.currency) {
      let hasEuro = false;
      let hasRupee = false;
      let hasPound = false;
      for (let r = 0; r < sheetData.length; r++) {
        for (let c = 0; c < sheetData[r].length; c++) {
          const cell = sheetData[r][c];
          if (cell) {
            const text = String(cell.v) + (cell.w || '');
            if (text.includes('€')) hasEuro = true;
            if (text.includes('₹')) hasRupee = true;
            if (text.includes('£')) hasPound = true;
          }
        }
      }
      if (hasEuro) metadata.currency = 'EUR';
      else if (hasRupee) metadata.currency = 'INR';
      else if (hasPound) metadata.currency = 'GBP';
      else metadata.currency = 'USD';
    }

    logs.push(`[Header Result] Vendor: "${vendor}", Email: "${vendorEmail}", Inv #: "${metadata.invoiceNumber}", Date: "${metadata.invoiceDate}", Due: "${metadata.dueDate}", PO #: "${metadata.poNumber}", Currency: "${metadata.currency}"`);

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

    for (let r = 0; r < sheetData.length; r++) {
      const row = sheetData[r];
      let hasDescription = false;
      let hasQty = false;
      let hasPrice = false;
      let hasAmount = false;
      
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell && cell.v) {
          const text = String(cell.v).toLowerCase().trim();
          if (text === '#' || text === 'no' || text === 'sl' || text === 'item') {
            colIndices.lineNumber = c;
          } else if (text.includes('description') || text.includes('item name') || text.includes('product') || text.includes('service')) {
            colIndices.description = c;
            hasDescription = true;
          } else if (text === 'qty' || text.includes('quantity')) {
            colIndices.quantity = c;
            hasQty = true;
          } else if (text.includes('unit price') || text === 'price' || text.includes('rate') || text.includes('unitprice')) {
            colIndices.unitPrice = c;
            hasPrice = true;
          } else if (text.includes('discount')) {
            colIndices.discount = c;
          } else if (text === 'amount' || text === 'total' || text.includes('amount (') || text.includes('total (')) {
            colIndices.amount = c;
            hasAmount = true;
          }
        }
      }
      
      if (hasDescription && (hasQty || hasPrice || hasAmount)) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error("Invoice line-item header not found");
    }

    logs.push(`[Line Items Stage] Detected header row at index ${headerRowIndex + 1}`);

    const lineItems = [];
    for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
      const row = sheetData[r];
      const descCell = colIndices.description !== -1 ? row[colIndices.description] : null;
      const descVal = descCell && descCell.v ? String(descCell.v).trim() : '';

      if (!descVal) {
        let rowHasData = false;
        for (let c = 0; c < row.length; c++) {
          if (row[c] && row[c].v !== undefined && row[c].v !== '') {
            rowHasData = true;
            break;
          }
        }
        if (!rowHasData) continue;
        
        let isTotalsRow = false;
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          if (cell && cell.v && /subtotal|total|tax|vat|shipping|handling/i.test(String(cell.v))) {
            isTotalsRow = true;
            break;
          }
        }
        if (isTotalsRow) break;
        continue;
      }

      const qtyCell = colIndices.quantity !== -1 ? row[colIndices.quantity] : null;
      const priceCell = colIndices.unitPrice !== -1 ? row[colIndices.unitPrice] : null;
      const hasQty = qtyCell && qtyCell.v !== undefined && qtyCell.v !== '';
      const hasPrice = priceCell && priceCell.v !== undefined && priceCell.v !== '';
      
      const isTotalsOrSummary = /subtotal|total\s*due|grand\s*total|payment\s*method|amount\s+in\s+words/i.test(descVal) ||
        ((/shipping|handling|tax|vat|gst|cgst|sgst/i.test(descVal) || (row[0] && row[0].v && /subtotal|total|tax|vat|shipping|handling/i.test(String(row[0].v)))) && !hasQty && !hasPrice);
      
      if (isTotalsOrSummary) {
        break;
      }

      const lineNoCell = colIndices.lineNumber !== -1 ? row[colIndices.lineNumber] : null;
      const lineNo = lineNoCell && lineNoCell.v ? parseInt(lineNoCell.v, 10) : (lineItems.length + 1);

      const qty = qtyCell ? parseInt(qtyCell.v, 10) : 1;

      const unitPrice = priceCell ? parseNumeric(priceCell.v) : 0;

      const discCell = colIndices.discount !== -1 ? row[colIndices.discount] : null;
      const discountPercent = discCell ? parseDiscountPercent(discCell) : 0;

      const amtCell = colIndices.amount !== -1 ? row[colIndices.amount] : null;
      let amount = amtCell ? parseNumeric(amtCell.v) : null;

      const expectedAmount = Math.round(qty * unitPrice * (1 - discountPercent / 100.0) * 100) / 100;
      if (amount === null || isNaN(amount)) {
        amount = expectedAmount;
      }

      lineItems.push({
        lineNumber: lineNo,
        description: descVal,
        quantity: isNaN(qty) ? 1 : qty,
        unitPrice: unitPrice,
        discountPercent: isNaN(discountPercent) ? 0 : discountPercent,
        amount: amount,
        total: amount
      });
    }

    logs.push(`[Line Items Result] Extracted ${lineItems.length} line item(s)`);

    // Extract Totals
    let subtotal = null;
    let tax = 0;
    let shipping = 0;
    let total = null;

    const subtotalRegex = /subtotal|sub-total|net\s*amount|net\s*subtotal/i;
    const taxRegex = /sales\s*tax|tax|vat|gst|cgst|sgst/i;
    const shippingRegex = /shipping|handling|freight/i;
    const totalRegex = /grand\s*total|total\s*due|total\s*amount|total$/i;

    for (let r = 0; r < sheetData.length; r++) {
      const row = sheetData[r];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell && cell.v && cell.t === 's') {
          const text = String(cell.v).trim();
          if (shippingRegex.test(text)) {
            const val = findNumInRow(row, c + 1);
            if (val !== null) shipping = val;
          } else if (subtotalRegex.test(text)) {
            const val = findNumInRow(row, c + 1);
            if (val !== null) subtotal = val;
          } else if (totalRegex.test(text)) {
            const val = findNumInRow(row, c + 1);
            if (val !== null) total = val;
          } else if (taxRegex.test(text)) {
            const val = findNumInRow(row, c + 1);
            if (val !== null) tax += val;
          }
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
      invoiceNumber: metadata.invoiceNumber,
      vendor: vendor || 'Unknown Vendor',
      vendorEmail,
      date: metadata.invoiceDate,
      dueDate: metadata.dueDate,
      currency: metadata.currency,
      poNumber: metadata.poNumber,
      paymentTerms: metadata.paymentTerms,
      subtotal,
      tax,
      shipping,
      total,
      lineItems,
      extraction: {
        fileType: 'XLSX',
        method: 'SPREADSHEET',
        sheetName: selectedSheetName,
        rowCount: maxR + 1,
        columnCount: maxC + 1,
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
    logs.push(`[Excel Extraction Failed] Error: ${err.message}`);
    return {
      invoiceNumber: '',
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
      lineItems: [],
      extraction: {
        fileType: 'XLSX',
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
  extractExcel
};
