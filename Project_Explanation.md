# 📘 SMART INVOICE AUTOMATION SYSTEM — Complete Project Explanation

> **Project Name:** Smart Invoice Automation System  
> **Technology Stack:** Node.js, Express.js, MongoDB (Mongoose), Robot Framework (Python), HTML/CSS/JavaScript  
> **Course:** Semester 9 — Robotic Process Automation (RPA)  
> **Date:** August 2026  

---

## 📑 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Complete Directory Structure](#3-complete-directory-structure)
4. [Detailed File-by-File Explanation](#4-detailed-file-by-file-explanation)
   - [Root Configuration Files](#41-root-configuration-files)
   - [Server & Backend](#42-server--backend-serverjs)
   - [Mongoose Data Models](#43-mongoose-data-models-models)
   - [Document Extraction Pipeline](#44-document-extraction-pipeline)
   - [AI Model Training Engine](#45-ai-model-training-engine)
   - [Frontend Web Application](#46-frontend-web-application-public)
   - [Robot Framework (RPA & Testing)](#47-robot-framework-rpa--testing)
   - [Test Scripts & Data Files](#48-test-scripts--data-files)
5. [System Workflow & Data Flow](#5-system-workflow--data-flow)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [How to Run the Project](#8-how-to-run-the-project)

---

## 1. Project Overview

The **Smart Invoice Automation System** is a full-stack web application that automates the entire lifecycle of invoice processing — from document ingestion and data extraction to approval workflows and audit logging. It combines:

- **Multi-Format Document Extraction** — Parses PDF, Excel (.xlsx/.xls), and CSV invoice files
- **AI/ML Pattern Matching** — Uses a trainable model with regex patterns and vendor signature matching for field extraction
- **Role-Based Dashboards** — Three separate dashboards for User (AP Clerk), Management (Finance Manager), and Admin
- **MongoDB Persistence** — All invoices, users, and audit logs are stored in a MongoDB database
- **Robot Framework RPA** — Automated robotic process automation tasks and API test suites
- **Approval Workflow Engine** — Finance managers can approve/reject invoices, with audit trail logging

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                           │
│  public/index.html + public/style.css + public/app.js               │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Auth Page │→│ USER Dashboard   │  │ MGMT Dashboard   │          │
│  │ Login/    │  │ Upload + History │  │ Approve/Reject   │          │
│  │ Signup    │  └──────────────────┘  └──────────────────┘          │
│  └──────────┘  ┌──────────────────┐                                 │
│                │ ADMIN Dashboard  │                                  │
│                │ Users + Engine   │                                  │
│                │ + MongoDB Viewer │                                  │
│                └──────────────────┘                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP REST API (fetch)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + Express)                    │
│                          server.js                                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Auth Endpoints │  │ Invoice CRUD     │  │ Processing Engine  │  │
│  │ /api/auth/*    │  │ /api/invoices    │  │ /api/process       │  │
│  └────────────────┘  │ /api/approve     │  │ /api/train         │  │
│                      │ /api/reject      │  └────────┬───────────┘  │
│                      │ /api/stats       │           │              │
│                      └──────────────────┘           ▼              │
│                                          ┌──────────────────────┐  │
│                                          │ documentExtractor.js │  │
│                                          │  ├─ pdfExtractor     │  │
│                                          │  ├─ excelExtractor   │  │
│                                          │  ├─ csvExtractor     │  │
│                                          │  └─ invoiceNormalizer│  │
│                                          └──────────────────────┘  │
│                                          ┌──────────────────────┐  │
│                                          │ train_model.js       │  │
│                                          │ (AI Pattern Engine)  │  │
│                                          └──────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Mongoose ODM
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     MongoDB Database                                │
│                   smart_invoice_db                                   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ users    │  │ invoices     │  │ auditlogs    │                  │
│  └──────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              ROBOT FRAMEWORK (Python RPA + Test Suite)               │
│  robot_framework/                                                   │
│  ├─ rpa_tasks.robot        (RPA Automation Workflows)               │
│  ├─ api_tests.robot        (Automated API Test Suite)               │
│  ├─ resources/             (Reusable Keywords)                      │
│  └─ libraries/             (Custom Python Library)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Directory Structure

```
Invoice_System/
│
├── .gitignore                          # Git ignore rules
├── README.md                           # Project README documentation
├── package.json                        # Node.js dependencies & scripts
├── package-lock.json                   # Lock file for exact dependency versions
│
├── server.js                           # 🔥 MAIN BACKEND SERVER (Express.js + MongoDB)
├── documentExtractor.js                # 🔀 Document routing engine (detects PDF/Excel/CSV)
├── train_model.js                      # 🤖 AI Model training pipeline
│
├── models/                             # 📦 Mongoose Schema Definitions
│   ├── Invoice.js                      # Invoice document schema
│   ├── User.js                         # User authentication schema
│   ├── AuditLog.js                     # Audit log trail schema
│   └── trained_invoice_model.json      # Serialized trained model (JSON weights)
│
├── extractors/                         # 📄 Format-Specific Extraction Engines
│   ├── pdfExtractor.js                 # PDF text extraction & parsing
│   ├── excelExtractor.js               # Excel (.xlsx/.xls) workbook parsing
│   ├── csvExtractor.js                 # CSV file parsing with delimiter detection
│   └── invoiceNormalizer.js            # Normalization, validation & confidence scoring
│
├── public/                             # 🌐 Frontend Web Application
│   ├── index.html                      # Main HTML (Auth + 3 Dashboards)
│   ├── style.css                       # Complete CSS styling (50KB+)
│   └── app.js                          # Frontend JavaScript logic (58KB+)
│
├── robot_framework/                    # 🤖 Robot Framework RPA & Tests
│   ├── api_tests.robot                 # Automated API test suite
│   ├── rpa_tasks.robot                 # RPA automation workflow tasks
│   ├── libraries/
│   │   └── InvoiceLibrary.py           # Custom Python keyword library
│   ├── resources/
│   │   └── invoice_keywords.resource   # Reusable Robot Framework keywords
│   └── results/                        # Test execution results (HTML reports)
│       ├── log.html
│       ├── output.xml
│       └── report.html
│
├── run_robot.py                        # Python script to launch Robot Framework
├── create_test_pdf.py                  # Python script to generate demo PDF invoice
├── test_extraction.js                  # Node.js test: PDF extraction accuracy
├── test_spreadsheet_csv.js             # Node.js test: Excel & CSV extraction accuracy
├── multipage_pdf_payload.json          # Sample multi-page PDF (base64 encoded)
│
├── big_demo_invoice_usd.pdf            # Demo 2-page invoice PDF (36 line items)
├── demo_invoice.xlsx                   # Demo Excel invoice (INR, 3 items)
├── demo_invoice_xlsx_orbit_eur.xlsx    # Demo Excel invoice (EUR, 12 items)
│
└── test_files/                         # Auto-generated CSV test fixtures
    ├── csv_metadata_items.csv
    ├── csv_items_only.csv
    ├── csv_semicolon.csv
    ├── csv_quoted_desc.csv
    └── csv_multi_currency.csv
```

---

## 4. Detailed File-by-File Explanation

---

### 4.1 Root Configuration Files

---

#### 📄 `package.json`
**Purpose:** Node.js project manifest — defines project metadata, scripts, and dependencies.

| Field | Value | Description |
|-------|-------|-------------|
| `name` | `smart-invoice-automation-system` | NPM package name |
| `version` | `1.0.0` | Project version |
| `main` | `server.js` | Entry point when `node .` is run |

**NPM Scripts:**
| Script | Command | Purpose |
|--------|---------|---------|
| `npm start` | `node server.js` | Start the Express web server |
| `npm run train:model` | `node train_model.js` | Train the AI extraction model |
| `npm run rpa:robot` | `python run_robot.py rpa` | Run Robot Framework RPA tasks |
| `npm run test:robot` | `python run_robot.py api` | Run Robot Framework API tests |

**Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `bcryptjs` | `^3.0.3` | Password hashing for user authentication |
| `cors` | `^2.8.6` | Cross-Origin Resource Sharing middleware |
| `express` | `^4.22.2` | Web server framework |
| `mongoose` | `^9.9.2` | MongoDB ODM (Object Document Mapper) |
| `pdf-parse` | `^2.4.5` | Native PDF text extraction library |
| `xlsx` | `^0.18.5` | Excel/CSV spreadsheet parsing library |

---

#### 📄 `.gitignore`
**Purpose:** Specifies files and directories that Git should NOT track.

**Ignored patterns include:**
- `node_modules/` — NPM dependencies (downloaded via `npm install`)
- `.env`, `.env.*` — Environment configuration secrets
- `__pycache__/`, `*.pyc` — Python bytecode files
- `output.xml`, `log.html`, `report.html` — Robot Framework results
- IDE folders (`.vscode/`, `.idea/`)

---

#### 📄 `README.md`
**Purpose:** Project documentation — explains setup, features, architecture, API endpoints, and usage instructions for the entire system.

---

### 4.2 Server & Backend (`server.js`)

**File:** [`server.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/server.js)  
**Size:** 604 lines | 20.9 KB  
**Purpose:** The **main application server** — handles ALL API endpoints, database connectivity, authentication, invoice processing, and approval workflows.

#### Key Sections:

**1. Imports & Initialization (Lines 1–24)**
- Imports Express, Mongoose, bcryptjs, cors
- Imports Mongoose models: `User`, `Invoice`, `AuditLog`
- Imports `trainModel`/`loadModel` from `train_model.js`
- Imports `extractDocumentDetails` from `documentExtractor.js`
- Loads the pre-trained AI model into memory on startup
- Configures Express middleware: CORS, JSON body parsing (50MB limit), static file serving

**2. MongoDB Connection (Lines 26–37)**
- Connects to MongoDB at `mongodb://127.0.0.1:27017/smart_invoice_db`
- On successful connection, runs `seedDatabase()` to populate defaults
- Tracks connection status via `isMongoConnected` flag

**3. Database Seeding (`seedDatabase()`, Lines 40–165)**
- If no users exist, creates 3 default accounts:
  - **System Admin** (`admin@invoice.com` / `admin123`) — Role: `ADMIN`
  - **Finance Manager** (`manager@invoice.com` / `admin123`) — Role: `FINANCE_MANAGER`
  - **AP Clerk** (`user@invoice.com` / `user123`) — Role: `AP_CLERK`
- Passwords are hashed using bcrypt with salt rounds of 10
- If no invoices exist, seeds one demo invoice from `big_demo_invoice_usd.pdf`
- Logs a `SYSTEM_INIT` audit event

**4. Processing Engine (`runProcessingEngine()`, Lines 168–247)**
- Core function that orchestrates document ingestion
- Accepts payload with file data, type, vendor overrides, notes
- Calls `extractDocumentDetails()` to parse the document
- Creates Invoice objects in MongoDB with extracted data
- Logs `PROCESSING_ENGINE_RUN` audit events
- Supports `SINGLE_PDF`, `MULTIPLE_PDF`, `DATASET_CSV`, `SINGLE_EXCEL`, `SINGLE_CSV` input types

**5. API Endpoints:**

| Endpoint | Method | Lines | Purpose |
|----------|--------|-------|---------|
| `/api/train` | POST | 250–272 | Retrain the AI extraction model |
| `/api/auth/signup` | POST | 277–321 | User registration (name, email, password, role) |
| `/api/auth/login` | POST | 324–361 | User login with email/password verification |
| `/api/users` | GET | 364–388 | List all users with invoice submission metrics (Admin) |
| `/api/invoices` | GET | 392–403 | Fetch all invoices from MongoDB |
| `/api/stats` | GET | 405–420 | Dashboard statistics (counts, totals, avg confidence) |
| `/api/process` | POST | 422–449 | Submit a document for extraction & processing |
| `/api/invoices/:id/download` | GET | 452–473 | Download original uploaded file |
| `/api/approve` | POST | 475–506 | Approve a single invoice (Manager/Admin only) |
| `/api/approve-bulk` | POST | 508–541 | Bulk approve high-confidence invoices |
| `/api/reject` | POST | 543–574 | Reject an invoice with reason (Manager/Admin only) |
| `/api/reset` | POST | 576–599 | Purge all invoice data (Admin only) |

**6. Role-Based Access Control:**
- **AP_CLERK** — Cannot approve or reject invoices (returns 403)
- **FINANCE_MANAGER** — Can approve/reject, can bulk approve
- **ADMIN** — Full access including database purge/reset

---

### 4.3 Mongoose Data Models (`models/`)

---

#### 📄 `models/User.js`
**File:** [`User.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/User.js)  
**Size:** 32 lines  
**Purpose:** Defines the MongoDB schema for user accounts.

**Schema Fields:**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | String | Required, Trim | User's full name |
| `email` | String | Required, Unique, Lowercase, Trim | Login email (primary key) |
| `password` | String | Required | Bcrypt-hashed password |
| `role` | String | Enum: `AP_CLERK`, `FINANCE_MANAGER`, `ADMIN` | Dashboard access level |
| `createdAt` | Date | Default: `Date.now` | Account creation timestamp |

---

#### 📄 `models/Invoice.js`
**File:** [`Invoice.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/Invoice.js)  
**Size:** 162 lines  
**Purpose:** Defines the comprehensive MongoDB schema for invoice documents with embedded sub-schemas.

**Main Invoice Schema Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (Unique) | Custom invoice ID (e.g., `INV-1724012345-456`) |
| `invoiceNumber` | String | Extracted invoice number from document |
| `inputType` | String (Enum) | `SINGLE_PDF`, `MULTIPLE_PDF`, `DATASET_CSV`, `SINGLE_EXCEL`, `SINGLE_CSV` |
| `filename` | String | Original uploaded filename |
| `vendor` | String | Extracted vendor/company name |
| `vendorEmail` | String | Extracted vendor email |
| `date` | String | Invoice issue date |
| `dueDate` | String | Payment due date |
| `currency` | String | Currency code (USD, EUR, GBP, INR) |
| `poNumber` | String | Purchase order number |
| `paymentTerms` | String | Payment terms (e.g., "Net 30") |
| `subtotal` | Number | Line items sum |
| `tax` | Number | Tax amount |
| `shipping` | Number | Shipping/handling amount |
| `total` | Number | Grand total (subtotal + tax + shipping) |
| `status` | String (Enum) | `PENDING`, `APPROVED`, `REJECTED`, `FLAGGED`, `EXTRACTION_FAILED` |
| `confidenceScore` | Number | 0.0–1.0 extraction confidence |
| `fieldConfidence` | Sub-schema | Per-field confidence (vendor, invoiceNumber, date, etc.) |
| `lineItems` | Array of Sub-schema | Line item details (description, qty, unitPrice, discount, amount) |
| `extraction` | Sub-schema | Extraction metadata (method, page count, OCR used, etc.) |
| `validation` | Sub-schema | Arithmetic validation results (subtotalMatch, totalMatch, etc.) |
| `processingLogs` | Array of Strings | Step-by-step processing pipeline log messages |
| `rawText` | String | Raw extracted text from document |
| `fileDataUrl` | String | Base64-encoded original file data |
| `createdBy` | String | Email of user who uploaded |
| `createdAt` / `updatedAt` | Date | Timestamps |

**Embedded Sub-Schemas:**
- **`lineItemSchema`** — Individual invoice line item (lineNumber, description, quantity, unitPrice, discountPercent, amount, total)
- **`extractionSchema`** — Metadata about how the document was extracted (fileType, method, sheetName, rowCount, ocrUsed, pageCount, etc.)
- **`validationSchema`** — Arithmetic verification results (subtotalMatch, taxMatch, totalMatch, errors, warnings)
- **`fieldConfidenceSchema`** — Per-field confidence scores (vendor: 0-100, invoiceNumber: 0-100, etc.)

---

#### 📄 `models/AuditLog.js`
**File:** [`AuditLog.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/AuditLog.js)  
**Size:** 17 lines  
**Purpose:** Records every significant system action for accountability and compliance.

**Schema Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | Date | When the action occurred |
| `action` | String (Required) | Action type (e.g., `USER_LOGIN`, `INVOICE_APPROVED`, `SYSTEM_INIT`) |
| `details` | String | Description of what happened |
| `userEmail` | String | Who performed the action |

**Logged Actions Include:**
`SYSTEM_INIT`, `USER_SIGNUP`, `USER_LOGIN`, `PROCESSING_ENGINE_RUN`, `INVOICE_APPROVED`, `INVOICE_REJECTED`, `BULK_APPROVAL_EXECUTED`, `MODEL_RETRAINED`, `RESET`

---

#### 📄 `models/trained_invoice_model.json`
**File:** [`trained_invoice_model.json`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/trained_invoice_model.json)  
**Size:** 206 lines | 4.2 KB  
**Purpose:** The serialized output of the AI training pipeline. This JSON file is loaded into memory when the server starts and is used by extractors to match vendor patterns and extract fields.

**Contents:**
| Key | Description |
|-----|-------------|
| `version` | Model version (`2.0.0-trained-notax`) |
| `trainedAt` | ISO timestamp of last training run |
| `accuracyScore` | Reported accuracy (0.992 = 99.2%) |
| `sampleCount` | Number of training corpus samples (6) |
| `vendorSignatures` | Array of known vendor patterns with keywords |
| `tokenWeights` | Word frequency map from training corpus tokenization |
| `extractionRules` | Regex patterns for invoice number, date, subtotal, total |
| `confidenceWeights` | Weighted importance of each field for confidence scoring |

---

### 4.4 Document Extraction Pipeline

This is the **core intelligence** of the system — a multi-stage pipeline that takes raw file data and produces structured invoice objects.

---

#### 📄 `documentExtractor.js`
**File:** [`documentExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/documentExtractor.js)  
**Size:** 138 lines  
**Purpose:** The **routing engine** — detects file format and delegates to the appropriate format-specific extractor.

**Key Functions:**

**`detectFileType(payload, filename)`** — Determines file type using 3 strategies:
1. **MIME type detection** from data URL prefix (e.g., `data:application/pdf;base64,...`)
2. **File extension** matching (`.pdf`, `.xlsx`, `.xls`, `.csv`)
3. **Binary signature** inspection (e.g., `JVBER` = PDF magic bytes in base64)

**`extractDocumentDetails(fileContentPayload, filename, customModel, customFields)`** — Main orchestrator:
1. Calls `detectFileType()` to determine format
2. Routes to appropriate extractor:
   - `PDF` → `extractPdf()` from `pdfExtractor.js`
   - `XLSX`/`XLS` → `extractExcel()` from `excelExtractor.js`
   - `CSV` → `extractCsv()` from `csvExtractor.js`
3. Normalizes the raw result via `normalizeInvoice()` from `invoiceNormalizer.js`
4. Returns a fully structured invoice object with confidence scores and validation results
5. On any error, returns a safe fallback with `EXTRACTION_FAILED` status

---

#### 📄 `extractors/pdfExtractor.js`
**File:** [`pdfExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/pdfExtractor.js)  
**Size:** 422 lines | 14.3 KB  
**Purpose:** Extracts structured invoice data from PDF documents through a multi-stage pipeline.

**Pipeline Stages:**

**Stage 1 — PDF Text Extraction (`extractTextFromPdfDataUrl()`):**
- Accepts base64 data URLs, file paths, or raw text
- Attempts native PDF text extraction using `pdf-parse` library
- Falls back to binary stream parsing (extracts text from PDF object streams using parenthesis regex)
- Returns: `{ fullText, pages[], pageCount, method, ocrUsed }`

**Stage 2 — Line Item Table Extraction (`extractTableLineItems()`):**
- Parses text line-by-line looking for tabular data patterns
- **Pattern 1:** `# Description Qty UnitPrice Discount% Amount` (full structured row)
- **Pattern 2:** `Description Qty UnitPrice Amount` (simplified row)
- Handles multi-line wrapped descriptions
- Ignores headers, footers, bank details, summary rows

**Stage 3 — Header/Metadata Extraction (`extractPdf()`):**
- **Vendor detection:** Searches for "BILL FROM" label, top header lines, or ML model vendor signatures
- **Email extraction:** Regex-based email pattern matching
- **Invoice number:** Multiple regex patterns (Invoice #, Inv #, INV-XXXXX)
- **Date/Due Date:** Date format regex with normalization
- **PO Number:** Purchase Order pattern matching
- **Currency:** Symbol detection (`€` → EUR, `£` → GBP, `₹` → INR) and explicit label matching
- **Payment Terms:** Label-based extraction

**Stage 4 — Financial Totals Extraction:**
- Extracts Subtotal, Tax, Shipping, Total using regex patterns
- Falls back to line item sum calculation if no explicit subtotal found
- Performs arithmetic: `total = subtotal + tax + shipping`

---

#### 📄 `extractors/excelExtractor.js`
**File:** [`excelExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/excelExtractor.js)  
**Size:** 528 lines | 18.4 KB  
**Purpose:** Extracts invoice data from Excel workbooks (.xlsx/.xls) using the `xlsx` library.

**Key Capabilities:**

**1. File Ingestion:**
- Accepts base64 data URLs, file paths, or raw Buffers
- Uses `xlsx.read()` with options: `cellDates`, `cellNF`, `cellFormula`

**2. Sheet Selection:**
- Scores each sheet in the workbook by keyword density
- Keywords: `INVOICE`, `Invoice No`, `Bill To`, `Subtotal`, `Total Due`, `Amount`, `Description`
- Selects the sheet with the highest relevance score

**3. Vendor Extraction:**
- Searches for "BILL FROM" / "FROM" / "Vendor" labels
- Falls back to topmost non-metadata string cell

**4. Metadata Extraction:**
- Uses label-mapping system with multiple regex patterns per field
- Searches both horizontal (label → value in next column) and vertical (label → value in row below) layouts
- Auto-detects currency from cell formatting symbols

**5. Line Item Table Detection:**
- Dynamically detects header row by scanning for column headers: Description, Qty, Unit Price, Discount, Amount
- Extracts data rows until a totals/summary row is encountered
- Handles percentage discounts from Excel cell formatting
- Validates per-line: `amount = qty × unitPrice × (1 - discount/100)`

**6. Totals Extraction:**
- Scans sheet for label-value pairs: Subtotal, Tax/VAT/GST/CGST/SGST, Shipping, Grand Total

**Helper Functions:**
- `parseNumeric(val)` — Strips currency symbols and parses to float
- `parseDiscountPercent(cell)` — Handles percentage format cells
- `parseDate(cell)` — Handles Excel date objects and date strings
- `findNumInRow(row, startCol)` — Scans row for first numeric value

---

#### 📄 `extractors/csvExtractor.js`
**File:** [`csvExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/csvExtractor.js)  
**Size:** 430 lines | 14.5 KB  
**Purpose:** Extracts invoice data from CSV files with auto-delimiter detection and quoted field support.

**Key Capabilities:**

**1. File Ingestion:**
- Decodes base64 data URLs, reads file paths, or accepts raw CSV text
- Strips BOM (Byte Order Mark) characters

**2. Delimiter Auto-Detection (`detectDelimiter()`):**
- Tests 4 delimiters: `,`, `;`, `|`, `\t`
- Scores each by frequency and consistency across first 5 rows
- Selects the delimiter with highest score

**3. CSV Line Parsing (`parseCSVLine()`):**
- RFC-compliant CSV parser
- Handles quoted fields with escaped double-quotes
- Correctly handles commas inside quoted descriptions

**4. Metadata Extraction:**
- Scans first 15 rows for key-value pairs in columns 0 and 1
- Regex-based label matching for: Invoice Number, Vendor, Date, Due Date, Currency, Payment Terms
- Email extraction from any cell in the file

**5. Line Item & Totals Extraction:**
- Same dynamic header detection as Excel extractor
- Same totals scanning logic (Subtotal, Tax, Shipping, Total)

---

#### 📄 `extractors/invoiceNormalizer.js`
**File:** [`invoiceNormalizer.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/invoiceNormalizer.js)  
**Size:** 169 lines | 6.3 KB  
**Purpose:** The **final stage** of the extraction pipeline — normalizes raw extractor output into a standardized format, performs arithmetic validation, and computes confidence scores.

**Validation Steps:**

1. **Subtotal Verification:**
   - Compares sum of line item amounts vs. extracted subtotal
   - Tolerance: ±0.015 (to handle floating-point precision)

2. **Total Verification:**
   - Checks: `subtotal + tax + shipping ≈ total`
   - Reports mismatches as warnings

3. **Per-Line-Item Verification:**
   - For each line item: `qty × unitPrice × (1 - discount/100) ≈ amount`
   - Reports individual item mismatches

4. **Missing Field Detection:**
   - Warns if invoice number is missing
   - Warns if vendor is "Unknown Vendor"
   - Warns if date or due date is missing

**Validation Status Resolution:**
| Status | Condition |
|--------|-----------|
| `VALID` | All checks pass |
| `WARNING` | Subtotal or total arithmetic mismatch |
| `PARTIAL` | Missing critical fields or no line items |
| `FAILED` | Extraction method returned `EXTRACTION_FAILED` |

**Confidence Score Calculation (0–100 points):**
| Factor | Points |
|--------|--------|
| Vendor found | +10 |
| Invoice number found | +10 |
| Issue date found | +5 |
| Due date found | +5 |
| Line items extracted | +30 |
| Validation is VALID | +15 |
| Subtotal matches | +10 |
| Tax matches | +5 |
| Total matches | +10 |

**Status Mapping:**
- Score < 0.85 or validation WARNING/PARTIAL → `FLAGGED`
- Validation FAILED → `EXTRACTION_FAILED`
- Otherwise → `PENDING` (ready for approval)

---

### 4.5 AI Model Training Engine

---

#### 📄 `train_model.js`
**File:** [`train_model.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/train_model.js)  
**Size:** 193 lines | 5.6 KB  
**Purpose:** Defines the AI model training pipeline that creates vendor signature patterns, token frequency weights, and regex extraction rules.

**Training Corpus:**
Contains 6 sample invoice text templates from different vendors:
1. **Acme Industrial Tools** — Industrial supply invoice
2. **Global Logistics Ltd** — Freight/logistics invoice
3. **TechCloud Services** — Cloud infrastructure invoice
4. **Apex Solutions Inc** — Software consulting invoice
5. **Nexus Software Corp** — Enterprise software invoice
6. **Vanguard Supplies** — Office supplies invoice

**`trainModel()` Function:**
1. Extracts vendor signatures (name, email, keywords) from each training sample
2. Tokenizes all corpus text and builds a word frequency map (`tokenWeights`)
3. Defines regex extraction rules for:
   - Invoice numbers (4 patterns)
   - Dates (3 patterns)
   - Due dates (2 patterns)
   - Subtotals (2 patterns)
   - Totals (2 patterns)
4. Sets confidence weights: vendor (25%), invoice number (25%), dates (20%), totals (30%)
5. Saves the model to `models/trained_invoice_model.json`

**`loadModel()` Function:**
- Loads model from JSON file if it exists
- If file missing or corrupt, auto-trains a new model

**Can be run standalone:** `node train_model.js` or via `npm run train:model`

---

### 4.6 Frontend Web Application (`public/`)

---

#### 📄 `public/index.html`
**File:** [`index.html`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/public/index.html)  
**Size:** 790 lines | 35.5 KB  
**Purpose:** The complete single-page web application with authentication screen and 3 role-based dashboards.

**Major Sections:**

**1. Authentication Page (Lines 18–159):**
- Animated background with glassmorphic orbs
- Brand header with "InvoiceEngine" branding
- **Login form** — Email + Password with visibility toggle
- **Signup form** — Name + Email + Password + Role selector
- **Quick Demo Login panel** — 1-click credential auto-fill for all 3 roles
- Tab switching between Login and Signup

**2. Main Application Container (Lines 162–772):**

**Sidebar (`<aside class="sidebar">`):**
- Brand logo and text
- Dynamic navigation menu (injected by JavaScript based on role)
- MongoDB connection status indicator

**Top Header:**
- Page title and subtitle
- User profile widget (name, role badge, logout button)
- Stats pills: Total Value, Accuracy, Pending count

**Role Banner:**
- Dynamic banner showing active dashboard role and description

**3. USER Dashboard (`#userDashboardView`, Lines 239–461):**
- **Instructions Card** — 3-step guide (Upload → Auto-Extract → Track History)
- **Upload Section** — 3 input cards:
  1. PDF file upload with drag-and-drop zone + vendor/date/notes fields
  2. Excel/CSV file upload with drag-and-drop zone + vendor/notes fields
  3. Batch multi-file upload with drag-and-drop zone
- **Quick Test Buttons** — Simulate PDF, Excel, and Batch inputs
- **Personal History Table** — Searchable, filterable table of user's submissions

**4. MANAGEMENT Dashboard (`#mgrDashboardView`, Lines 466–588):**
- **Summary Cards** — Pending count, Approved total, Rejected total, Avg Confidence
- **Approval Desk** — Tabbed view (Pending/Approved/Rejected) with approval cards grid
- **Bulk Approve button** — Auto-approve all invoices with confidence ≥95%
- **Analysis Panel:**
  - Status distribution bar chart (Approved/Pending/Rejected percentages)
  - Top vendors breakdown table

**5. ADMIN Dashboard (`#adminDashboardView`, Lines 593–768):**
- **User Inspector Panel** — Grid of user cards (click to inspect user's submissions)
- **Selected User Detail Panel** — Shows specific user's submitted invoices table
- **RPA Engine Administration** — Confidence threshold slider, engine diagnostics, console log viewer
- **AI Model Trainer Card** — Displays model version, accuracy, and retrain button
- **Processing Pipeline Visual** — 4-step visual: Input Parsing → Pattern Extraction → Validation Rules → MongoDB Sync
- **Engine Log Console** — Real-time processing logs
- **MongoDB Collection Viewer** — Raw database table view with status filter

**6. Invoice Detail Modal (Lines 775–785):**
- Overlay modal for inspecting individual invoice documents
- Shows all extracted fields, line items, processing logs, and raw text

---

#### 📄 `public/app.js`
**File:** [`app.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/public/app.js)  
**Size:** 1,451 lines | 58.7 KB  
**Purpose:** All frontend JavaScript logic — authentication, API calls, dashboard rendering, file upload handling, drag-and-drop, approval workflows, data tables, and UI state management.

**Key Functional Areas:**

**Authentication System:**
- `initAuth()` — Checks localStorage for saved session, restores login state
- `handleLoginSubmit()` — POST to `/api/auth/login`, saves user to localStorage
- `handleSignupSubmit()` — POST to `/api/auth/signup`, auto-login after registration
- `handleLogout()` — Clears session, shows auth page
- `switchAuthTab()` — Toggles between Login and Signup forms
- `fillQuickCredentials()` — Auto-fills demo credentials
- `togglePasswordVisibility()` — Shows/hides password field

**Dashboard Management:**
- `updateAuthUserUI()` — Sets user info in header, triggers role-specific rendering
- `switchDashboardRole()` — Shows/hides dashboard sections based on role
- `renderSidebarNav()` — Injects role-specific navigation menu items

**Invoice Processing:**
- `fetchInvoices()` — GET `/api/invoices`, stores in `currentInvoices`, renders tables
- `triggerProcess()` — POST `/api/process` for quick test simulations
- `handleFileSelect()` — Reads file via FileReader, encodes to base64, sends to server
- `initDragAndDrop()` — Sets up drag-and-drop zones for all upload cards

**Approval Workflows (Management):**
- `renderApprovalCards()` — Creates visual approval cards with all invoice details
- `approveInvoice()` — POST `/api/approve` for individual approval
- `rejectInvoice()` — POST `/api/reject` with reason prompt
- `executeBulkApproval()` — POST `/api/approve-bulk` for mass approval
- `filterApproval()` — Tab switching between Pending/Approved/Rejected views

**Admin Features:**
- `loadAdminUsers()` — GET `/api/users`, renders user card grid
- `inspectUserBox()` — Filters invoices by selected user, displays in table
- `confirmResetDatabase()` — Prompts confirmation, POST `/api/reset`
- `triggerModelTraining()` — POST `/api/train`, updates model status badge
- `simulateEngineDiagnostic()` — Runs visual diagnostic animation

**Data Rendering:**
- `renderUserHistoryTable()` — User's personal submission history
- `renderMongoDBTable()` — Admin's raw MongoDB document viewer
- `renderMgrAnalysis()` — Management metrics (status bars, vendor breakdown)
- `showInvoiceDetail()` — Opens modal with full invoice inspection

---

#### 📄 `public/style.css`
**File:** [`style.css`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/public/style.css)  
**Size:** ~51 KB  
**Purpose:** Complete visual styling for the entire application.

**Design Features:**
- **Google Font:** Plus Jakarta Sans (headings) + JetBrains Mono (code/labels)
- **Auth Page:** Animated glassmorphic blobs, gradient backgrounds, card with border-radius
- **Sidebar:** Dark gradient sidebar with hover animations and navigation items
- **Dashboard Layout:** CSS Grid-based layout with responsive panels
- **Upload Cards:** Drag-and-drop zones with dashed borders and hover effects
- **Tables:** Styled data tables with alternating row colors
- **Status Badges:** Color-coded pills (green=Approved, amber=Pending, red=Rejected)
- **Pipeline Visual:** Step-by-step animated pipeline indicators
- **Modal:** Overlay modal with slide-in animation
- **Responsive:** Mobile-friendly breakpoints

---

### 4.7 Robot Framework (RPA & Testing)

---

#### 📄 `robot_framework/api_tests.robot`
**File:** [`api_tests.robot`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/api_tests.robot)  
**Size:** 62 lines  
**Purpose:** Automated API test suite that validates all backend endpoints.

**Test Cases:**

| Test Case | What It Tests |
|-----------|---------------|
| **Verify Initial Server State** | GET `/api/stats` returns valid response |
| **Test Ingest Single PDF** | POST `/api/process` with SINGLE_PDF, verifies 1 invoice returned |
| **Test Ingest Multiple PDF Batch** | POST `/api/process` with MULTIPLE_PDF, verifies ≥2 invoices |
| **Test Ingest Dataset CSV** | POST `/api/process` with DATASET_CSV, verifies filename match |
| **Test Manager Approval Workflow** | Processes invoice → approves → verifies status = APPROVED |
| **Test Manager Rejection Workflow** | Processes invoice → rejects → verifies status = REJECTED |
| **Test System Reset Endpoint** | POST `/api/reset` → verifies 0 invoices remain |

---

#### 📄 `robot_framework/rpa_tasks.robot`
**File:** [`rpa_tasks.robot`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/rpa_tasks.robot)  
**Size:** 56 lines  
**Purpose:** Automated RPA workflow that simulates real-world invoice processing operations.

**RPA Tasks:**

| Task | What It Does |
|------|--------------|
| **Task 1: Multi-Format Ingestion** | Ingests single PDF, batch PDF, and CSV dataset automatically |
| **Task 2: Automated Decisioning** | Fetches pending invoices, calculates confidence tier (HIGH/MEDIUM/LOW), auto-approves HIGH tier |
| **Task 3: Audit Summary** | Fetches final stats and generates execution summary report |

---

#### 📄 `robot_framework/resources/invoice_keywords.resource`
**File:** [`invoice_keywords.resource`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/resources/invoice_keywords.resource)  
**Size:** 92 lines  
**Purpose:** Reusable Robot Framework keywords that abstract HTTP API calls.

**Keywords:**

| Keyword | Purpose |
|---------|---------|
| `Connect To Invoice Server` | Creates HTTP session to `http://localhost:3000` |
| `Reset Database State` | POST `/api/reset` |
| `Fetch All Invoices` | GET `/api/invoices`, returns invoice list |
| `Fetch System Stats` | GET `/api/stats`, returns stats object |
| `Process Single PDF Invoice` | Generates mock payload → POST `/api/process` |
| `Process Multiple PDF Batch` | Same, with `MULTIPLE_PDF` type |
| `Process Dataset CSV` | Same, with `DATASET_CSV` type |
| `Approve Invoice By ID` | POST `/api/approve` with invoice ID |
| `Reject Invoice By ID` | POST `/api/reject` with invoice ID and reason |
| `Verify Invoice Status` | Checks invoice status in database matches expected |

**Libraries Used:**
- `RequestsLibrary` — HTTP client for API calls
- `Collections` — List/dictionary manipulation
- `InvoiceLibrary.py` — Custom Python library

---

#### 📄 `robot_framework/libraries/InvoiceLibrary.py`
**File:** [`InvoiceLibrary.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/libraries/InvoiceLibrary.py)  
**Size:** 67 lines  
**Purpose:** Custom Python keyword library providing helper functions for Robot Framework.

**Keywords:**

| Keyword | Purpose |
|---------|---------|
| `Validate Invoice Totals` | Asserts `subtotal + tax + shipping = total` (±0.02 tolerance) |
| `Generate Mock Invoice Payload` | Creates API payload using the demo PDF or fallback text |
| `Calculate Confidence Tier` | Returns `HIGH` (≥95%), `MEDIUM` (≥85%), or `LOW` (<85%) |
| `Filter Pending Invoices` | Filters list to only PENDING status invoices |
| `Summarize RPA Batch Run` | Generates human-readable summary string |

---

#### 📄 `run_robot.py`
**File:** [`run_robot.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/run_robot.py)  
**Size:** 39 lines  
**Purpose:** Python launcher script for Robot Framework execution.

**Usage:**
- `python run_robot.py rpa` — Runs `rpa_tasks.robot` (RPA automation)
- `python run_robot.py api` — Runs `api_tests.robot` (API testing)
- Results saved to `robot_framework/results/` directory

---

### 4.8 Test Scripts & Data Files

---

#### 📄 `test_extraction.js`
**File:** [`test_extraction.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/test_extraction.js)  
**Size:** 127 lines  
**Purpose:** Automated test that verifies PDF extraction accuracy by comparing extracted fields against known expected values from `big_demo_invoice_usd.pdf`.

**Tests 13 Assertions:**
Vendor, Vendor Email, Invoice Number, Date, Due Date, Currency, PO Number, Subtotal ($796,210.00), Tax ($65,687.32), Shipping ($1,850.00), Total ($863,747.32), Line Item Count (36), Validation Status (VALID)

**Run:** `node test_extraction.js`

---

#### 📄 `test_spreadsheet_csv.js`
**File:** [`test_spreadsheet_csv.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/test_spreadsheet_csv.js)  
**Size:** 234 lines  
**Purpose:** Comprehensive test suite for Excel and CSV extraction covering 7 test cases.

**Test Cases:**

| Test | File | Tests |
|------|------|-------|
| Test 1 | `demo_invoice_xlsx_orbit_eur.xlsx` | EUR currency, 12 line items, discounts, shipping |
| Test 2 | `demo_invoice.xlsx` | INR currency, 3 items, CGST+SGST tax |
| Test 3 | `csv_metadata_items.csv` | Metadata + items with vendor, date, currency |
| Test 4 | `csv_items_only.csv` | Items-only CSV (no metadata) — expects PARTIAL status |
| Test 5 | `csv_semicolon.csv` | Semicolon-delimited CSV, EUR currency |
| Test 6 | `csv_quoted_desc.csv` | Quoted descriptions with embedded commas |
| Test 7 | `csv_multi_currency.csv` | EUR currency detection from metadata |

**Run:** `node test_spreadsheet_csv.js`

---

#### 📄 `create_test_pdf.py`
**File:** [`create_test_pdf.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/create_test_pdf.py)  
**Size:** 238 lines  
**Purpose:** Python script (uses ReportLab) to generate the demo 2-page invoice PDF (`big_demo_invoice_usd.pdf`).

**Generated Invoice Details:**
- **Vendor:** NEXORA TECHNOLOGIES LLC
- **Invoice #:** INV-USD-2026-0847
- **PO #:** PO-78421-ACME
- **36 line items** across 2 pages (page break at item #29)
- **Financial totals:** Subtotal $796,210.00 + Tax $65,687.32 + Shipping $1,850.00 = **Total $863,747.32**
- Professional styling with table headers, grid lines, and color theming

---

#### 📄 `multipage_pdf_payload.json`
**File:** [`multipage_pdf_payload.json`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/multipage_pdf_payload.json)  
**Size:** 6.2 KB  
**Purpose:** A complete sample API payload containing a base64-encoded multi-page PDF. Used for direct API testing via tools like Postman or curl.

---

#### 📄 Sample Invoice Files

| File | Format | Details |
|------|--------|---------|
| `big_demo_invoice_usd.pdf` | PDF | 2-page, 36 items, USD, $863,747.32 total |
| `demo_invoice.xlsx` | Excel | INR invoice, 3 items, CGST+SGST tax |
| `demo_invoice_xlsx_orbit_eur.xlsx` | Excel | EUR invoice, 12 items, discounts, €392,639.40 total |

#### 📄 Test CSV Files (`test_files/`)

| File | Tests |
|------|-------|
| `csv_metadata_items.csv` | Standard CSV with metadata headers + line items |
| `csv_items_only.csv` | Items without any metadata (partial extraction) |
| `csv_semicolon.csv` | Semicolon-delimited CSV |
| `csv_quoted_desc.csv` | Quoted descriptions containing commas |
| `csv_multi_currency.csv` | EUR currency detection |

---

## 5. System Workflow & Data Flow

### Complete Invoice Processing Pipeline:

```
USER uploads file (PDF/Excel/CSV) via Browser
        │
        ▼
Frontend (app.js) reads file → encodes to Base64
        │
        ▼ POST /api/process
        │
server.js → runProcessingEngine()
        │
        ▼
documentExtractor.js → detectFileType()
        │
        ├── PDF?  → pdfExtractor.js → extractPdf()
        │           ├── extractTextFromPdfDataUrl() (text extraction)
        │           ├── extractTableLineItems()     (line items parsing)
        │           └── Header/Financial extraction  (vendor, dates, totals)
        │
        ├── XLSX? → excelExtractor.js → extractExcel()
        │           ├── Sheet scoring & selection
        │           ├── Vendor & metadata extraction
        │           ├── Line item table detection
        │           └── Financial totals scanning
        │
        └── CSV?  → csvExtractor.js → extractCsv()
                    ├── Auto-delimiter detection
                    ├── Metadata label scanning
                    ├── Line item extraction
                    └── Financial totals scanning
        │
        ▼
invoiceNormalizer.js → normalizeInvoice()
        ├── Arithmetic validation (subtotal + tax = total)
        ├── Per-line-item amount verification
        ├── Missing field detection
        ├── Confidence score calculation
        └── Status resolution (PENDING / FLAGGED / EXTRACTION_FAILED)
        │
        ▼
server.js → Invoice.create() → MongoDB insert
        │
        ▼ AuditLog.create()
        │
        ▼ HTTP Response → Frontend renders result
```

### Approval Workflow:

```
FINANCE_MANAGER logs in → sees Pending invoices
        │
        ├── Clicks "Approve" → POST /api/approve → Status = APPROVED
        ├── Clicks "Reject"  → POST /api/reject  → Status = REJECTED
        └── Clicks "Bulk Approve" → POST /api/approve-bulk → All ≥95% = APPROVED
        │
        ▼ AuditLog records every decision
```

---

## 6. Role-Based Access Control (RBAC)

| Role | Dashboard | Upload | Approve/Reject | Bulk Approve | View All Users | Reset DB | Train Model |
|------|-----------|--------|-----------------|--------------|----------------|----------|-------------|
| **AP_CLERK** (User) | USER | ✅ | ❌ (403) | ❌ (403) | ❌ | ❌ | ❌ |
| **FINANCE_MANAGER** (Manager) | MANAGEMENT | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ADMIN** (Admin) | ADMIN | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 7. API Endpoints Reference

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login with credentials |
| GET | `/api/users` | Admin | List all users with stats |
| GET | `/api/invoices` | Any | Fetch all invoices |
| GET | `/api/stats` | Any | Dashboard statistics |
| POST | `/api/process` | Any | Process uploaded document |
| GET | `/api/invoices/:id/download` | Any | Download original file |
| POST | `/api/approve` | Manager/Admin | Approve single invoice |
| POST | `/api/approve-bulk` | Manager/Admin | Bulk approve ≥95% confidence |
| POST | `/api/reject` | Manager/Admin | Reject invoice with reason |
| POST | `/api/reset` | Admin | Purge all invoices |
| POST | `/api/train` | Admin | Retrain AI model |

---

## 8. How to Run the Project

### Prerequisites:
- **Node.js** v18+ installed
- **MongoDB** running locally on port 27017
- **Python 3** (for Robot Framework, optional)

### Steps:

```bash
# 1. Install Node.js dependencies
npm install

# 2. (Optional) Train the AI model
npm run train:model

# 3. Start the server
npm start
# Server runs at http://localhost:3000

# 4. Open browser and navigate to http://localhost:3000
# Use demo credentials:
#   USER:    user@invoice.com    / user123
#   MANAGER: manager@invoice.com / admin123
#   ADMIN:   admin@invoice.com   / admin123

# 5. (Optional) Run extraction tests
node test_extraction.js
node test_spreadsheet_csv.js

# 6. (Optional) Run Robot Framework
npm run rpa:robot    # RPA automation tasks
npm run test:robot   # API test suite
```

---

> **Document Generated:** August 19, 2026  
> **Total Files in Project:** 30+ source files  
> **Total Lines of Code:** ~5,000+ lines (Backend + Frontend + Tests + RPA)
