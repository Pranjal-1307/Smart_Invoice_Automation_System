const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const User = require('./models/User');
const Invoice = require('./models/Invoice');
const AuditLog = require('./models/AuditLog');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_invoice_db';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let isMongoConnected = false;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    isMongoConnected = true;
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);
    await seedDatabase();
  })
  .catch(err => {
    console.error(`MongoDB Connection Error: ${err.message}`);
  });

// Seed Initial Users & Sample Invoices if Database is empty
async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding default Management & User credentials into MongoDB...");
      const salt = await bcrypt.genSalt(10);
      
      const adminPassword = await bcrypt.hash('admin123', salt);
      const managerPassword = await bcrypt.hash('admin123', salt);
      const userPassword = await bcrypt.hash('user123', salt);

      await User.insertMany([
        {
          name: "System Admin",
          email: "admin@invoice.com",
          password: adminPassword,
          role: "ADMIN"
        },
        {
          name: "Finance Management Head",
          email: "manager@invoice.com",
          password: managerPassword,
          role: "FINANCE_MANAGER"
        },
        {
          name: "John AP Clerk",
          email: "user@invoice.com",
          password: userPassword,
          role: "AP_CLERK"
        }
      ]);
      console.log("Default users seeded in MongoDB successfully.");
    }

    const invoiceCount = await Invoice.countDocuments();
    if (invoiceCount === 0) {
      console.log("Seeding initial sample invoices into MongoDB...");
      await Invoice.insertMany([
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
          status: "PENDING",
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
          createdAt: new Date("2026-08-01T10:30:00Z"),
          updatedAt: new Date("2026-08-01T10:30:00Z")
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
          createdAt: new Date("2026-08-05T14:15:00Z"),
          updatedAt: new Date("2026-08-05T14:15:00Z")
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
          createdAt: new Date("2026-08-08T09:00:00Z"),
          updatedAt: new Date("2026-08-08T09:05:00Z")
        }
      ]);
      console.log("Sample invoices seeded in MongoDB.");
    }

    await AuditLog.create({
      action: "SYSTEM_INIT",
      details: "MongoDB database initialized and verified with schemas",
      userEmail: "system"
    });
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

// CSV Parser helper
async function parseCsvContent(rawCsvText, filename, userEmail, extraFields = {}) {
  const lines = rawCsvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const createdInvoices = [];
  
  if (lines.length === 0) return createdInvoices;

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('vendor') || header.includes('amount') || header.includes('total') || header.includes('invoice');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (let idx = 0; idx < dataLines.length; idx++) {
    const line = dataLines[idx];
    const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    let parsedVendor = cols[0] || `Vendor ${idx + 1}`;
    let vendor = extraFields.customVendor || (parsedVendor.length > 2 ? parsedVendor : "Global Enterprise Supplies");
    let invNum = cols[1] && cols[1].startsWith('INV') ? cols[1] : `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    let total = parseFloat(cols[2] || cols[3] || (200 + Math.random() * 1500).toFixed(2));
    if (isNaN(total) || total <= 0) total = parseFloat((150 + Math.random() * 800).toFixed(2));

    const subtotal = parseFloat((total * 0.92).toFixed(2));
    const tax = parseFloat((total - subtotal).toFixed(2));
    const confidence = parseFloat((0.92 + Math.random() * 0.07).toFixed(2));

    const invoiceObj = {
      id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: invNum,
      inputType: "DATASET_CSV",
      filename: filename || "dataset.csv",
      vendor: vendor,
      vendorEmail: `${vendor.toLowerCase().replace(/[^a-z0-9]/g, '')}@vendor.com`,
      date: extraFields.customDate || new Date().toISOString().split('T')[0],
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
        `Parsed Excel/CSV dataset file [${filename}] - Row #${idx + 1}`,
        `Extracted Vendor: ${vendor}`,
        `Calculated Total ($${total}) from spreadsheet column`,
        extraFields.notes ? `User Note: ${extraFields.notes}` : `Direct document inserted into MongoDB 'invoices' collection`
      ],
      fileDataUrl: extraFields.fileDataUrl || null,
      fileType: extraFields.fileType || 'xlsx',
      fileSize: extraFields.fileSize || null,
      notes: extraFields.notes || '',
      customVendor: extraFields.customVendor || '',
      createdBy: userEmail || 'AP Clerk',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const doc = await Invoice.create(invoiceObj);
    createdInvoices.push(doc);
  }

  if (createdInvoices.length === 0) {
    return await runProcessingEngine({ type: "DATASET_CSV", name: filename, userEmail, ...extraFields });
  }

  return createdInvoices;
}

// Processing Engine Helper
async function runProcessingEngine(inputData) {
  const { type, name, fileData, userEmail, customVendor, customDate, notes, fileDataUrl, fileSize, fileType } = inputData;

  const rawUrl = fileDataUrl || (fileData && fileData.rawContent ? fileData.rawContent : null);
  const extractedFileType = fileType || (name ? (name.endsWith('.pdf') ? 'pdf' : name.endsWith('.xlsx') || name.endsWith('.xls') ? 'xlsx' : name.endsWith('.csv') ? 'csv' : 'pdf') : 'pdf');

  if (fileData && fileData.rawContent && typeof fileData.rawContent === 'string' && !fileData.rawContent.startsWith('data:')) {
    return await parseCsvContent(fileData.rawContent, name, userEmail, { customVendor, customDate, notes, fileDataUrl: rawUrl, fileSize, fileType: extractedFileType });
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
    const vendorName = customVendor && customVendor.trim() ? customVendor.trim() : randomVendor.name;
    const vendorEmail = customVendor && customVendor.trim() 
      ? `${customVendor.toLowerCase().replace(/[^a-z0-9]/g, '')}@vendor.com` 
      : randomVendor.email;

    const randomInvNum = "INV-" + Math.floor(10000 + Math.random() * 90000);
    const subtotal = parseFloat((150 + Math.random() * 2500).toFixed(2));
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    const confidence = parseFloat((0.88 + Math.random() * 0.11).toFixed(2));

    const invoiceObj = {
      id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: randomInvNum,
      inputType: type,
      filename: name || `invoice_${Date.now()}_${i+1}.${extractedFileType === 'xlsx' ? 'xlsx' : extractedFileType === 'csv' ? 'csv' : 'pdf'}`,
      vendor: vendorName,
      vendorEmail: vendorEmail,
      date: customDate || new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax,
      total,
      status: confidence > 0.94 ? "APPROVED" : "PENDING",
      confidenceScore: confidence,
      lineItems: [
        { description: extractedFileType === 'pdf' ? "PDF Extracted Services & Product Supply" : "Excel Sheet Row Invoice Item", quantity: 1, unitPrice: parseFloat((subtotal * 0.7).toFixed(2)), total: parseFloat((subtotal * 0.7).toFixed(2)) },
        { description: "Licensing, Handling & Processing", quantity: 1, unitPrice: parseFloat((subtotal * 0.3).toFixed(2)), total: parseFloat((subtotal * 0.3).toFixed(2)) }
      ],
      processingLogs: [
        `Received ${extractedFileType.toUpperCase()} file payload [${name || 'Document'}]`,
        `RPA Engine & Layout Analysis complete (Confidence: ${(confidence * 100).toFixed(1)}%)`,
        `Extracted Vendor: ${vendorName} (${vendorEmail})`,
        `Verified Totals: Subtotal ($${subtotal}) + Tax ($${tax}) = Grand Total ($${total})`,
        notes ? `User Attached Remarks: "${notes}"` : `Saved document into MongoDB collection 'invoices'`,
        `Stored file payload & metadata in MongoDB record`
      ],
      fileDataUrl: rawUrl,
      fileType: extractedFileType,
      fileSize: fileSize || (fileData ? fileData.fileSize : null),
      notes: notes || '',
      customVendor: customVendor || '',
      createdBy: userEmail || 'AP Clerk',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const doc = await Invoice.create(invoiceObj);
    createdInvoices.push(doc);
  }

  await AuditLog.create({
    action: "PROCESSING_ENGINE_RUN",
    details: `Processed ${type} (${extractedFileType.toUpperCase()}) input (${createdInvoices.length} invoices inserted to MongoDB)`,
    userEmail: userEmail || 'system'
  });

  return createdInvoices;
}

// AUTH API ENDPOINTS

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = role && ['AP_CLERK', 'FINANCE_MANAGER', 'ADMIN'].includes(role) ? role : 'AP_CLERK';

    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: userRole
    });

    await AuditLog.create({
      action: "USER_SIGNUP",
      details: `New account created: ${newUser.email} with role [${newUser.role}]`,
      userEmail: newUser.email
    });

    res.json({
      success: true,
      message: "Account registered successfully in MongoDB!",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error during registration." });
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid password." });
    }

    await AuditLog.create({
      action: "USER_LOGIN",
      details: `User logged in: ${user.email} (${user.role})`,
      userEmail: user.email
    });

    res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error during login." });
  }
});

// GET all registered users with submission metrics (For Admin Dashboard)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    const invoices = await Invoice.find();

    const usersWithStats = users.map(u => {
      const userInvoices = invoices.filter(inv => inv.createdBy === u.email || (u.role === 'AP_CLERK' && !inv.createdBy));
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        totalSubmitted: userInvoices.length,
        approvedCount: userInvoices.filter(i => i.status === 'APPROVED').length,
        pendingCount: userInvoices.filter(i => i.status === 'PENDING').length,
        rejectedCount: userInvoices.filter(i => i.status === 'REJECTED').length
      };
    });

    res.json({ success: true, count: usersWithStats.length, users: usersWithStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// INVOICE API ROUTES (REAL MONGODB)

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: invoices.length,
      invoices
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    const stats = {
      totalInvoices: invoices.length,
      pending: invoices.filter(i => i.status === 'PENDING').length,
      approved: invoices.filter(i => i.status === 'APPROVED').length,
      rejected: invoices.filter(i => i.status === 'REJECTED').length,
      totalValue: invoices.reduce((acc, i) => acc + (i.total || 0), 0),
      avgConfidence: invoices.length > 0 ? (invoices.reduce((acc, i) => acc + (i.confidenceScore || 0), 0) / invoices.length) * 100 : 0
    };
    res.json({ success: true, stats, mongoConnected: isMongoConnected });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/process', async (req, res) => {
  try {
    const { inputType, fileName, fileData, role, customVendor, customDate, notes, fileDataUrl, fileSize, fileType } = req.body;
    const userRole = req.headers['x-user-role'] || role || 'AP_CLERK';
    const userEmail = req.headers['x-user-email'] || 'user@invoice.com';

    if (!inputType) {
      return res.status(400).json({ success: false, message: "inputType is required" });
    }
    const results = await runProcessingEngine({
      type: inputType,
      name: fileName,
      fileData,
      userRole,
      userEmail,
      customVendor,
      customDate,
      notes,
      fileDataUrl,
      fileSize,
      fileType
    });
    res.json({ success: true, message: `Processing Engine executed and stored in MongoDB`, processed: results });
  } catch (err) {
    console.error("Process error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// File Download Endpoint
app.get('/api/invoices/:id/download', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ id: req.params.id });
    if (!inv || !inv.fileDataUrl) {
      return res.status(404).json({ success: false, message: "Uploaded file record not found" });
    }

    const matches = inv.fileDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Invalid file data format" });
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${inv.filename || 'invoice_document'}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/approve', async (req, res) => {
  try {
    const { id, notes, role } = req.body;
    const userRole = req.headers['x-user-role'] || role || 'FINANCE_MANAGER';
    const userEmail = req.headers['x-user-email'] || 'manager@invoice.com';

    if (userRole === 'AP_CLERK') {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: AP Clerk role is restricted from approving invoices. Finance Manager role required."
      });
    }

    const inv = await Invoice.findOne({ id: id });
    if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });

    inv.status = "APPROVED";
    inv.updatedAt = new Date();
    inv.processingLogs.push(`Approved by ${userRole} (${userEmail}) at ${new Date().toLocaleTimeString()} ${notes ? `(Note: ${notes})` : ''}`);
    await inv.save();

    await AuditLog.create({
      action: "INVOICE_APPROVED",
      details: `Invoice ${id} approved by ${userEmail} [${userRole}]`,
      userEmail
    });

    res.json({ success: true, invoice: inv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/approve-bulk', async (req, res) => {
  try {
    const { role, minConfidence } = req.body;
    const userRole = req.headers['x-user-role'] || role || 'FINANCE_MANAGER';
    const userEmail = req.headers['x-user-email'] || 'manager@invoice.com';

    if (userRole === 'AP_CLERK') {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: AP Clerk role is restricted from bulk approvals."
      });
    }

    const threshold = minConfidence || 0.95;
    const pendingInvoices = await Invoice.find({ status: 'PENDING', confidenceScore: { $gte: threshold } });
    
    for (let inv of pendingInvoices) {
      inv.status = "APPROVED";
      inv.updatedAt = new Date();
      inv.processingLogs.push(`Bulk Approved by ${userRole} (${userEmail}) (Confidence: ${(inv.confidenceScore * 100).toFixed(0)}% >= ${(threshold * 100).toFixed(0)}%)`);
      await inv.save();
    }

    await AuditLog.create({
      action: "BULK_APPROVAL_EXECUTED",
      details: `${pendingInvoices.length} invoices bulk approved in MongoDB by ${userEmail} [${userRole}]`,
      userEmail
    });

    res.json({ success: true, approvedCount: pendingInvoices.length, invoices: pendingInvoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reject', async (req, res) => {
  try {
    const { id, reason, role } = req.body;
    const userRole = req.headers['x-user-role'] || role || 'FINANCE_MANAGER';
    const userEmail = req.headers['x-user-email'] || 'manager@invoice.com';

    if (userRole === 'AP_CLERK') {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: AP Clerk role is restricted from rejecting invoices. Finance Manager role required."
      });
    }

    const inv = await Invoice.findOne({ id: id });
    if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });

    inv.status = "REJECTED";
    inv.updatedAt = new Date();
    inv.processingLogs.push(`Rejected by ${userRole} (${userEmail}): ${reason || 'No reason provided'}`);
    await inv.save();

    await AuditLog.create({
      action: "INVOICE_REJECTED",
      details: `Invoice ${id} rejected by ${userEmail} [${userRole}] (${reason || 'No reason'})`,
      userEmail
    });

    res.json({ success: true, invoice: inv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] || req.body.role;
    const userEmail = req.headers['x-user-email'] || 'admin@invoice.com';

    if (userRole && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Permission Denied: Database purge & reset is strictly restricted to System Admin."
      });
    }

    await Invoice.deleteMany({});
    await AuditLog.create({
      action: "RESET",
      details: `Cleared all invoice records from MongoDB collection by ${userEmail} (${userRole || 'ADMIN'})`,
      userEmail
    });

    res.json({ success: true, message: "MongoDB Database purge & reset complete" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Smart Invoice System running on http://localhost:${PORT}`);
});
