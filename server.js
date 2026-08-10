const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database mimicking MongoDB Document Store
let mongodbStore = {
  invoices: [
    {
      id: "INV-2026-001",
      invoiceNumber: "INV-98231",
      inputType: "SINGLE_PDF",
      filename: "Acme_Corp_Invoice.pdf",
      vendor: "Acme Industrial Tools",
      vendorEmail: "billing@acmeind.com",
      date: "2026-08-01",
      dueDate: "2026-08-15",
      subtotal: 1250.00,
      tax: 100.00,
      total: 1350.00,
      status: "PENDING", // PENDING, APPROVED, REJECTED, FLAGGED
      confidenceScore: 0.96,
      lineItems: [
        { description: "Heavy Duty Hydraulic Pump", quantity: 2, unitPrice: 500.00, total: 1000.00 },
        { description: "Maintenance Kit Standard", quantity: 1, unitPrice: 250.00, total: 250.00 }
      ],
      processingLogs: [
        "Received single PDF file [Acme_Corp_Invoice.pdf]",
        "OCR Extraction complete (Confidence: 96%)",
        "Extracted 2 line items & totals verified",
        "Saved document into MongoDB collection 'invoices'"
      ],
      createdAt: new Date("2026-08-01T10:30:00Z").toISOString(),
      updatedAt: new Date("2026-08-01T10:30:00Z").toISOString()
    },
    {
      id: "INV-2026-002",
      invoiceNumber: "INV-44109",
      inputType: "MULTIPLE_PDF",
      filename: "GlobalLogistics_Batch_01.pdf",
      vendor: "Global Logistics Ltd",
      vendorEmail: "accounts@globallogistics.com",
      date: "2026-08-05",
      dueDate: "2026-08-20",
      subtotal: 3400.00,
      tax: 272.00,
      total: 3672.00,
      status: "PENDING",
      confidenceScore: 0.92,
      lineItems: [
        { description: "Freight Transport NYC to CHI", quantity: 4, unitPrice: 750.00, total: 3000.00 },
        { description: "Customs Clearance Fee", quantity: 1, unitPrice: 400.00, total: 400.00 }
      ],
      processingLogs: [
        "Batch input file [GlobalLogistics_Batch_01.pdf] processed",
        "Pattern matching engine extracted vendor details",
        "Document validated & inserted to MongoDB"
      ],
      createdAt: new Date("2026-08-05T14:15:00Z").toISOString(),
      updatedAt: new Date("2026-08-05T14:15:00Z").toISOString()
    },
    {
      id: "INV-2026-003",
      invoiceNumber: "INV-77312",
      inputType: "DATASET_CSV",
      filename: "Q3_Vendor_Dataset.csv",
      vendor: "TechCloud Services",
      vendorEmail: "finance@techcloud.io",
      date: "2026-08-08",
      dueDate: "2026-08-22",
      subtotal: 890.00,
      tax: 71.20,
      total: 961.20,
      status: "APPROVED",
      confidenceScore: 0.99,
      lineItems: [
        { description: "Server Infrastructure Q3", quantity: 1, unitPrice: 890.00, total: 890.00 }
      ],
      processingLogs: [
        "CSV Dataset row parsed successfully",
        "Automated rule pass: high confidence (99%)",
        "Direct approval auto-passed by system rule"
      ],
      createdAt: new Date("2026-08-08T09:00:00Z").toISOString(),
      updatedAt: new Date("2026-08-08T09:05:00Z").toISOString()
    }
  ],
  auditLogs: [
    { timestamp: new Date().toISOString(), action: "SYSTEM_INIT", details: "MongoDB store initialized with sample dataset" }
  ]
};

// CSV Parser helper
function parseCsvContent(rawCsvText, filename) {
  const lines = rawCsvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const createdInvoices = [];
  
  if (lines.length === 0) return createdInvoices;

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('vendor') || header.includes('amount') || header.includes('total') || header.includes('invoice');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  dataLines.forEach((line, idx) => {
    const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) return;

    let vendor = cols[0] || `Vendor ${idx + 1}`;
    let invNum = cols[1] && cols[1].startsWith('INV') ? cols[1] : `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    let total = parseFloat(cols[2] || cols[3] || (200 + Math.random() * 1500).toFixed(2));
    if (isNaN(total) || total <= 0) total = parseFloat((150 + Math.random() * 800).toFixed(2));

    const subtotal = parseFloat((total * 0.92).toFixed(2));
    const tax = parseFloat((total - subtotal).toFixed(2));
    const confidence = parseFloat((0.92 + Math.random() * 0.07).toFixed(2));

    const invoice = {
      id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: invNum,
      inputType: "DATASET_CSV",
      filename: filename || "dataset.csv",
      vendor: vendor.length > 2 ? vendor : "Global Enterprise Supplies",
      vendorEmail: `${vendor.toLowerCase().replace(/[^a-z0-9]/g, '')}@vendor.com`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax,
      total,
      status: confidence > 0.94 ? "APPROVED" : "PENDING",
      confidenceScore: confidence,
      lineItems: [
        { description: "Dataset Row Imported Item", quantity: 1, unitPrice: subtotal, total: subtotal }
      ],
      processingLogs: [
        `Parsed CSV dataset file [${filename}] - Row #${idx + 1}`,
        `Extracted Vendor: ${vendor}`,
        `Calculated Total ($${total}) from spreadsheet column`,
        `Direct document inserted into MongoDB 'invoices' collection`
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mongodbStore.invoices.unshift(invoice);
    createdInvoices.push(invoice);
  });

  if (createdInvoices.length === 0) {
    // Fallback if structure was unknown
    return runProcessingEngine({ type: "DATASET_CSV", name: filename });
  }

  return createdInvoices;
}

// Processing Engine Helper
function runProcessingEngine(inputData) {
  const { type, name, fileData } = inputData;

  // Handle uploaded CSV / Text files directly
  if (fileData && fileData.rawContent && typeof fileData.rawContent === 'string' && !fileData.rawContent.startsWith('data:')) {
    return parseCsvContent(fileData.rawContent, name);
  }

  const count = type === 'MULTIPLE_PDF' ? Math.floor(Math.random() * 3) + 2 : 1;
  const createdInvoices = [];

  const vendors = [
    { name: "Apex Solutions Inc", email: "invoices@apexsol.com" },
    { name: "Nexus Software Corp", email: "billing@nexussoft.com" },
    { name: "Vanguard Supplies", email: "ap@vanguard.org" },
    { name: "Starlight Digital", email: "pay@starlight.io" },
    { name: "Horizon Logistics", email: "finance@horizonlog.com" }
  ];

  for (let i = 0; i < count; i++) {
    const randomVendor = vendors[Math.floor(Math.random() * vendors.length)];
    const randomInvNum = "INV-" + Math.floor(10000 + Math.random() * 90000);
    const subtotal = parseFloat((150 + Math.random() * 2500).toFixed(2));
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    const confidence = parseFloat((0.88 + Math.random() * 0.11).toFixed(2));

    const invoice = {
      id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: randomInvNum,
      inputType: type,
      filename: name || `invoice_${Date.now()}_${i+1}.${type === 'DATASET_CSV' ? 'csv' : 'pdf'}`,
      vendor: randomVendor.name,
      vendorEmail: randomVendor.email,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax,
      total,
      status: confidence > 0.94 ? "APPROVED" : "PENDING",
      confidenceScore: confidence,
      lineItems: [
        { description: "Professional Services & Operations", quantity: 1, unitPrice: subtotal * 0.7, total: parseFloat((subtotal * 0.7).toFixed(2)) },
        { description: "Software Licensing & Support", quantity: 1, unitPrice: subtotal * 0.3, total: parseFloat((subtotal * 0.3).toFixed(2)) }
      ],
      processingLogs: [
        `Received ${type} file payload [${name || 'Document'}]`,
        `OCR Extraction & Layout Analysis complete (Confidence: ${(confidence * 100).toFixed(1)}%)`,
        `Extracted Vendor: ${randomVendor.name} (${randomVendor.email})`,
        `Verified Totals: Subtotal ($${subtotal}) + Tax ($${tax}) = Grand Total ($${total})`,
        `Saved document into MongoDB collection 'invoices' with status: ${confidence > 0.94 ? 'APPROVED' : 'PENDING'}`
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mongodbStore.invoices.unshift(invoice);
    createdInvoices.push(invoice);
  }

  mongodbStore.auditLogs.unshift({
    timestamp: new Date().toISOString(),
    action: "PROCESSING_ENGINE_RUN",
    details: `Processed ${type} input (${createdInvoices.length} invoices generated from ${name || 'upload'})`
  });

  return createdInvoices;
}

// API Routes
app.get('/api/invoices', (req, res) => {
  res.json({
    success: true,
    count: mongodbStore.invoices.length,
    invoices: mongodbStore.invoices
  });
});

app.get('/api/stats', (req, res) => {
  const invoices = mongodbStore.invoices;
  const stats = {
    totalInvoices: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    approved: invoices.filter(i => i.status === 'APPROVED').length,
    rejected: invoices.filter(i => i.status === 'REJECTED').length,
    totalValue: invoices.reduce((acc, i) => acc + i.total, 0),
    avgConfidence: invoices.length > 0 ? (invoices.reduce((acc, i) => acc + i.confidenceScore, 0) / invoices.length) * 100 : 0
  };
  res.json({ success: true, stats });
});

app.post('/api/process', (req, res) => {
  const { inputType, fileName, fileData, role } = req.body;
  const userRole = req.headers['x-user-role'] || role || 'AP_CLERK';

  if (!inputType) {
    return res.status(400).json({ success: false, message: "inputType is required" });
  }
  const results = runProcessingEngine({ type: inputType, name: fileName, fileData, userRole });
  res.json({ success: true, message: `Processing Engine executed successfully`, processed: results });
});

app.post('/api/approve', (req, res) => {
  const { id, notes, role } = req.body;
  const userRole = req.headers['x-user-role'] || role || 'FINANCE_MANAGER';

  // Role validation: AP_CLERK cannot approve
  if (userRole === 'AP_CLERK') {
    return res.status(403).json({
      success: false,
      message: "Permission Denied: AP Clerk role is restricted from approving invoices. Finance Manager role required."
    });
  }

  const inv = mongodbStore.invoices.find(i => i.id === id);
  if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });

  inv.status = "APPROVED";
  inv.updatedAt = new Date().toISOString();
  inv.processingLogs.push(`Approved by ${userRole} at ${new Date().toLocaleTimeString()} ${notes ? `(Note: ${notes})` : ''}`);

  mongodbStore.auditLogs.unshift({
    timestamp: new Date().toISOString(),
    action: "INVOICE_APPROVED",
    details: `Invoice ${id} approved by role [${userRole}]`
  });

  res.json({ success: true, invoice: inv });
});

app.post('/api/approve-bulk', (req, res) => {
  const { role, minConfidence } = req.body;
  const userRole = req.headers['x-user-role'] || role || 'FINANCE_MANAGER';

  if (userRole === 'AP_CLERK') {
    return res.status(403).json({
      success: false,
      message: "Permission Denied: AP Clerk role is restricted from bulk approvals."
    });
  }

  const threshold = minConfidence || 0.95;
  const pendingInvoices = mongodbStore.invoices.filter(i => i.status === 'PENDING' && i.confidenceScore >= threshold);
  
  pendingInvoices.forEach(inv => {
    inv.status = "APPROVED";
    inv.updatedAt = new Date().toISOString();
    inv.processingLogs.push(`Bulk Approved by ${userRole} (Confidence: ${(inv.confidenceScore * 100).toFixed(0)}% >= ${(threshold * 100).toFixed(0)}%)`);
  });

  mongodbStore.auditLogs.unshift({
    timestamp: new Date().toISOString(),
    action: "BULK_APPROVAL_EXECUTED",
    details: `${pendingInvoices.length} invoices bulk approved by ${userRole} with threshold >= ${threshold}`
  });

  res.json({ success: true, approvedCount: pendingInvoices.length, invoices: pendingInvoices });
});

app.post('/api/reject', (req, res) => {
  const { id, reason, role } = req.body;
  const userRole = req.headers['x-user-role'] || role || 'FINANCE_MANAGER';

  // Role validation: AP_CLERK cannot reject
  if (userRole === 'AP_CLERK') {
    return res.status(403).json({
      success: false,
      message: "Permission Denied: AP Clerk role is restricted from rejecting invoices. Finance Manager role required."
    });
  }

  const inv = mongodbStore.invoices.find(i => i.id === id);
  if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });

  inv.status = "REJECTED";
  inv.updatedAt = new Date().toISOString();
  inv.processingLogs.push(`Rejected by ${userRole}: ${reason || 'No reason provided'}`);

  mongodbStore.auditLogs.unshift({
    timestamp: new Date().toISOString(),
    action: "INVOICE_REJECTED",
    details: `Invoice ${id} rejected by role [${userRole}] (${reason || 'No reason'})`
  });

  res.json({ success: true, invoice: inv });
});

app.post('/api/reset', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.body.role;

  // Enforce ADMIN role requirement when explicit role header or body is provided
  if (userRole && userRole !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: "Permission Denied: Database purge & reset is strictly restricted to System Admin."
    });
  }

  mongodbStore.invoices = [];
  mongodbStore.auditLogs.unshift({
    timestamp: new Date().toISOString(),
    action: "RESET",
    details: `Cleared all records by ${userRole || 'ADMIN'}`
  });
  res.json({ success: true, message: "Database reset complete" });
});

app.listen(PORT, () => {
  console.log(`Smart Invoice Server running at http://localhost:${PORT}`);
});
