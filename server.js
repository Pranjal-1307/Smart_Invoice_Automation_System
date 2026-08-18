const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const User = require('./models/User');
const Invoice = require('./models/Invoice');
const AuditLog = require('./models/AuditLog');

const { loadModel, trainModel } = require('./train_model');
const { extractDocumentDetails } = require('./documentExtractor');

let trainedModel = loadModel();

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

      // Generate base64 for big_demo_invoice_usd.pdf if file exists
      let bigDemoPdfUrl = null;
      const bigDemoPath = path.join(__dirname, 'big_demo_invoice_usd.pdf');
      if (fs.existsSync(bigDemoPath)) {
        const buf = fs.readFileSync(bigDemoPath);
        bigDemoPdfUrl = `data:application/pdf;base64,${buf.toString('base64')}`;
      }

      await Invoice.insertMany([
        {
          id: "INV-2026-DEMO-0847",
          invoiceNumber: "INV-USD-2026-0847",
          inputType: "SINGLE_PDF",
          filename: "big_demo_invoice_usd.pdf",
          vendor: "NEXORA TECHNOLOGIES LLC",
          vendorEmail: "billing@nexoratech.example",
          date: "2026-08-19",
          dueDate: "2026-09-18",
          currency: "USD",
          poNumber: "PO-78421-ACME",
          paymentTerms: "Net 30",
          subtotal: 796210.00,
          tax: 65687.32,
          shipping: 1850.00,
          total: 863747.32,
          status: "PENDING",
          confidenceScore: 1.0,
          fieldConfidence: {
            vendor: 100,
            invoiceNumber: 100,
            date: 100,
            dueDate: 100,
            lineItems: 100,
            totals: 100
          },
          lineItems: Array.from({ length: 36 }, (_, i) => ({
            lineNumber: i + 1,
            description: `Enterprise Module & Service Component Item #${i + 1}`,
            quantity: (i % 5) + 1,
            unitPrice: 2000.00 + (i * 150),
            discountPercent: (i % 3 === 0 ? 5 : 0),
            amount: 2000.00 + (i * 150),
            total: 2000.00 + (i * 150)
          })),
          extraction: {
            method: "PDF_TEXT",
            ocrUsed: false,
            pageCount: 2,
            rawTextAvailable: true,
            rawTextLength: 3200,
            lineItemCount: 36,
            warnings: []
          },
          validation: {
            status: "VALID",
            subtotalMatch: true,
            taxMatch: true,
            shippingMatch: true,
            totalMatch: true,
            errors: [],
            warnings: []
          },
          processingLogs: [
            "Ingested single PDF file [big_demo_invoice_usd.pdf]",
            "Native PDF Text Extraction complete (2 pages, 36 line items)",
            "Extracted header: Vendor 'NEXORA TECHNOLOGIES LLC', Inv # 'INV-USD-2026-0847', PO # 'PO-78421-ACME'",
            "Arithmetic verification passed: Subtotal $796,210.00 + Tax $65,687.32 + Shipping $1,850.00 = Total Due $863,747.32",
            "Saved verified document into MongoDB collection 'invoices'"
          ],
          fileDataUrl: bigDemoPdfUrl,
          fileType: "pdf",
          createdBy: "user@invoice.com",
          createdAt: new Date("2026-08-19T10:00:00Z"),
          updatedAt: new Date("2026-08-19T10:00:00Z")
        }
      ]);
      console.log("Sample demo invoice seeded in MongoDB.");
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

// High-Accuracy Document Processing Engine Helper
async function runProcessingEngine(inputData) {
  const { type, name, fileData, userEmail, customVendor, customDate, notes, fileDataUrl, fileSize, fileType } = inputData;

  const rawUrl = fileDataUrl || (fileData && fileData.fileDataUrl ? fileData.fileDataUrl : null) || (fileData && fileData.rawContent ? fileData.rawContent : null);
  const filename = name || (fileData && fileData.name ? fileData.name : `Invoice_${Date.now()}.pdf`);
  const extractedFileType = fileType || (filename.endsWith('.xlsx') ? 'xlsx' : filename.endsWith('.csv') ? 'csv' : 'pdf');

  // Payload content passed to extractor
  const contentPayload = (fileData && fileData.rawContent) ? fileData.rawContent : (fileDataUrl || fileData);

  const count = type === 'MULTIPLE_PDF' ? Math.max(1, Math.floor(Math.random() * 2) + 1) : 1;
  const createdInvoices = [];

  for (let i = 0; i < count; i++) {
    const batchFileName = count > 1 ? filename.replace(/\.(pdf|csv|xlsx)$/i, `_${i+1}.$1`) : filename;
    
    // Extract real document fields using the trained ML model engine
    const extracted = await extractDocumentDetails(contentPayload, batchFileName, trainedModel, {
      customVendor,
      customDate
    });

    let resolvedInputType = type || "SINGLE_PDF";
    if (resolvedInputType === "SINGLE_PDF") {
      if (extractedFileType === "xlsx" || extractedFileType === "xls") {
        resolvedInputType = "SINGLE_EXCEL";
      } else if (extractedFileType === "csv") {
        resolvedInputType = "SINGLE_CSV";
      }
    }

    const invoiceObj = {
      id: `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: (extracted.invoiceNumber && extracted.invoiceNumber.trim().length > 0) ? extracted.invoiceNumber.trim() : `INV-UNPARSED-${Date.now().toString().slice(-4)}`,
      inputType: resolvedInputType,
      filename: batchFileName,
      vendor: extracted.vendor,
      vendorEmail: extracted.vendorEmail,
      date: extracted.date,
      dueDate: extracted.dueDate,
      currency: extracted.currency || 'USD',
      poNumber: extracted.poNumber || '',
      paymentTerms: extracted.paymentTerms || '',
      subtotal: extracted.subtotal,
      tax: extracted.tax,
      shipping: extracted.shipping || 0,
      total: extracted.total,
      status: extracted.status,
      confidenceScore: extracted.confidenceScore,
      fieldConfidence: extracted.fieldConfidence,
      lineItems: extracted.lineItems,
      extraction: extracted.extraction,
      validation: extracted.validation,
      processingLogs: [
        ...extracted.processingLogs,
        notes ? `User Note Attached: "${notes}"` : `Document persisted into MongoDB collection 'invoices'`
      ],
      rawText: extracted.rawText || '',
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
    details: `High-Accuracy Extraction completed for ${type} (${extractedFileType.toUpperCase()}). Ingested ${createdInvoices.length} document(s) into MongoDB`,
    userEmail: userEmail || 'system'
  });

  return createdInvoices;
}

// AI Model Training Endpoint
app.post('/api/train', async (req, res) => {
  try {
    trainedModel = trainModel();
    await AuditLog.create({
      action: "MODEL_RETRAINED",
      details: `AI Invoice Extraction Model retrained to version ${trainedModel.version} (${trainedModel.sampleCount} training corpus samples)`,
      userEmail: req.headers['x-user-email'] || 'admin@invoice.com'
    });
    res.json({
      success: true,
      message: "High-accuracy AI Invoice Model retrained successfully!",
      model: {
        version: trainedModel.version,
        trainedAt: trainedModel.trainedAt,
        accuracyScore: trainedModel.accuracyScore,
        sampleCount: trainedModel.sampleCount
      }
    });
  } catch (err) {
    console.error("Model training error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

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
