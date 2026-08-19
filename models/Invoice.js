const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  lineNumber: Number,
  description: String,
  quantity: Number,
  unitPrice: Number,
  discountPercent: {
    type: Number,
    default: 0
  },
  amount: Number,
  total: Number
}, { _id: false });

const extractionSchema = new mongoose.Schema({
  fileType: {
    type: String,
    default: 'PDF'
  },
  method: {
    type: String,
    enum: ['PDF_TEXT', 'OCR', 'SPREADSHEET', 'CSV', 'EXTRACTION_FAILED'],
    default: 'PDF_TEXT'
  },
  sheetName: {
    type: String,
    default: null
  },
  rowCount: {
    type: Number,
    default: null
  },
  columnCount: {
    type: Number,
    default: null
  },
  ocrUsed: {
    type: Boolean,
    default: false
  },
  pageCount: {
    type: Number,
    default: 1
  },
  rawTextAvailable: {
    type: Boolean,
    default: true
  },
  rawTextLength: {
    type: Number,
    default: 0
  },
  lineItemCount: {
    type: Number,
    default: 0
  },
  warnings: [String]
}, { _id: false });

const validationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['VALID', 'WARNING', 'FAILED', 'PARTIAL', 'EXTRACTION_FAILED'],
    default: 'VALID'
  },
  subtotalMatch: {
    type: Boolean,
    default: true
  },
  taxMatch: {
    type: Boolean,
    default: true
  },
  shippingMatch: {
    type: Boolean,
    default: true
  },
  totalMatch: {
    type: Boolean,
    default: true
  },
  errors: [String],
  warnings: [String]
}, { _id: false });

const fieldConfidenceSchema = new mongoose.Schema({
  vendor: { type: Number, default: 0 },
  invoiceNumber: { type: Number, default: 0 },
  date: { type: Number, default: 0 },
  dueDate: { type: Number, default: 0 },
  lineItems: { type: Number, default: 0 },
  totals: { type: Number, default: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  inputType: {
    type: String,
    enum: ['SINGLE_PDF', 'MULTIPLE_PDF', 'DATASET_CSV', 'SINGLE_EXCEL', 'SINGLE_CSV'],
    default: 'SINGLE_PDF'
  },
  filename: String,
  vendor: String,
  vendorEmail: String,
  date: String,
  dueDate: String,
  currency: {
    type: String,
    default: 'USD'
  },
  poNumber: String,
  paymentTerms: String,
  subtotal: Number,
  tax: Number,
  shipping: {
    type: Number,
    default: 0
  },
  total: Number,
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'EXTRACTION_FAILED'],
    default: 'PENDING'
  },
  confidenceScore: Number,
  fieldConfidence: fieldConfidenceSchema,
  lineItems: [lineItemSchema],
  extraction: extractionSchema,
  validation: validationSchema,
  processingLogs: [String],
  rawText: String,
  fileDataUrl: String,
  fileType: String,
  fileSize: Number,
  notes: String,
  rejectionReason: {
    type: String,
    default: ''
  },
  approvalReason: {
    type: String,
    default: ''
  },
  customVendor: String,
  createdBy: {
    type: String,
    default: 'AP Clerk'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);

