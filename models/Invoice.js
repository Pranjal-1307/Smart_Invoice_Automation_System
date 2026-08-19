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

const flagReasonSchema = new mongoose.Schema({
  reasonCode: String,
  severity: String,
  message: String,
  field: String,
  expected: mongoose.Schema.Types.Mixed,
  actual: mongoose.Schema.Types.Mixed,
  difference: mongoose.Schema.Types.Mixed,
  scoreImpact: Number,
  confidenceImpact: Number,
  qualityImpact: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const validationResultSchema = new mongoose.Schema({
  field: String,
  validation: String,
  status: String,
  severity: String,
  reasonCode: String,
  message: String,
  expected: mongoose.Schema.Types.Mixed,
  actual: mongoose.Schema.Types.Mixed,
  difference: mongoose.Schema.Types.Mixed,
  scoreImpact: Number,
  confidenceImpact: Number,
  qualityImpact: Number
}, { _id: false });

const scoreBreakdownSchema = new mongoose.Schema({
  factor: String,
  maxScore: Number,
  earnedScore: Number,
  status: String,
  reasonCode: String
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
  documentType: {
    type: String,
    enum: ['INVOICE', 'DATASET', 'UNKNOWN'],
    default: 'INVOICE'
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
    default: 'PENDING'
  },
  confidenceScore: Number,
  dataQualityScore: Number,
  threshold: Number,
  score: {
    type: {
      type: String,
      default: 'CONFIDENCE'
    },
    value: Number,
    threshold: Number
  },
  decisionReason: String,
  recommendedAction: String,
  flagReasons: [flagReasonSchema],
  validationResults: [validationResultSchema],
  scoreBreakdown: [scoreBreakdownSchema],
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
