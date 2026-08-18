const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: String,
  quantity: Number,
  unitPrice: Number,
  total: Number
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
    enum: ['SINGLE_PDF', 'MULTIPLE_PDF', 'DATASET_CSV'],
    default: 'SINGLE_PDF'
  },
  filename: String,
  vendor: String,
  vendorEmail: String,
  date: String,
  dueDate: String,
  subtotal: Number,
  tax: Number,
  total: Number,
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'],
    default: 'PENDING'
  },
  confidenceScore: Number,
  lineItems: [lineItemSchema],
  processingLogs: [String],
  fileDataUrl: String,
  fileType: String,
  fileSize: Number,
  notes: String,
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
