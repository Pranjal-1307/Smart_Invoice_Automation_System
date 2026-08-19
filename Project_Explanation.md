# 📘 SMART INVOICE AUTOMATION SYSTEM — Complete Project Explanation

> **Project Name:** Smart Invoice Automation System  
> **Technology Stack:** Node.js, Express.js, MongoDB (Mongoose), Robot Framework (Python), SheetJS (xlsx), pdf-parse, HTML5, CSS3, JavaScript (ES6+)  
> **Course:** Semester 9 — Robotic Process Automation (RPA)  
> **Date:** August 2026  

---

## 📑 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Complete Directory Structure](#3-complete-directory-structure)
4. [Detailed File-by-File Explanation](#4-detailed-file-by-file-explanation)
   - [4.1 Root Configuration Files](#41-root-configuration-files)
   - [4.2 Server & Backend (`server.js`)](#42-server--backend-serverjs)
   - [4.3 Mongoose Data Models (`models/`)](#43-mongoose-data-models-models)
   - [4.4 Document Extraction Pipeline](#44-document-extraction-pipeline)
   - [4.5 AI Model Training Engine](#45-ai-model-training-engine)
   - [4.6 Frontend Web Application (`public/`)](#46-frontend-web-application-public)
   - [4.7 Robot Framework (RPA & Testing)](#47-robot-framework-rpa--testing)
   - [4.8 Test Scripts & Data Files](#48-test-scripts--data-files)
5. [System Workflow & Data Flow](#5-system-workflow--data-flow)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [How to Run the Project](#8-how-to-run-the-project)

---

## 1. Project Overview

The **Smart Invoice Automation System** is an **RPA-based Automated Invoice and Document Processing System** powered by **Robot Framework as its core automation engine and RPA orchestration layer**.

- **Robot Framework = Main Automation Engine** — Orchestrates the complete end-to-end automation workflow from document ingestion, classification, and workflow selection to validation, scoring, MongoDB persistence, and logging.
- **AI Invoice Model = Supporting Extraction Component** — Functions as a supporting component module invoked inside the Invoice Processing Robot Workflow for vendor pattern recognition and field extraction.
- **Multi-Format Ingestion** — Parses PDF documents, multi-page PDFs, Excel workbooks (`.xlsx`/`.xls`), and CSV datasets.
- **Dual Robot Workflows**:
  - **Invoice Processing Robot** — Executes field extraction, vendor validation, date checks, arithmetic verification (`Subtotal + Tax + Shipping = Total`), confidence scoring, and status assignment (`HIGH_CONFIDENCE`, `PENDING_REVIEW`, `FLAGGED`, `PROCESSING_FAILED`).
  - **Dataset Processing Robot** — Parses generic tabular CSV/Excel datasets, detects headers, validates missing values and data types, and calculates Data Quality Scores without imposing invoice-specific validation rules.
- **MongoDB Persistence & Audit Logging** — Stores all documents, users, and detailed RPA execution traces in MongoDB with auto-seeding.
- **Role-Based Web Dashboards** — Three distinct role views: **AP Clerk** (Upload & History), **Finance Manager** (Approval Desk & Analytics), and **System Admin** (RPA Engine Inspector, AI Trainer, DB Purge).

---

## 2. High-Level System Architecture

```text
                    USER / ADMIN
                         │
                         ▼
                    WEB APPLICATION
                         │
                         ▼
              🤖 ROBOT FRAMEWORK 🤖
                RPA ORCHESTRATOR
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   FILE PROCESSING   AI EXTRACTION    VALIDATION
        │                │                │
        ├──── PDF        ├─ Invoice       ├─ Invoice
        ├──── CSV        │  Patterns      │  Validation
        └──── XLSX       │                │
                         └─ OCR / AI      └─ Dataset
                                                Validation
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                    MONGODB
                         │
                         ▼
               DASHBOARD / REPORTS
```

---

## 3. Complete Directory Structure

```text
Invoice_System/
├── .gitignore                          # Git ignore rules
├── README.md                           # Comprehensive project documentation
├── Project_Explanation.md              # Exhaustive academic & developer guide
├── package.json                        # Node.js dependencies & scripts manifest
├── package-lock.json                   # Locked dependency tree
├── server.js                           # Backend server REST API
├── robot_orchestrator.py               # 🤖 Python Robot Framework RPA Orchestration Engine Bridge
├── documentExtractor.js                # Document routing engine
├── train_model.js                      # AI Invoice Extraction Model Trainer (Supporting Component)
│
├── models/                             # 📦 Mongoose Schema Definitions
│   ├── Invoice.js                      # Invoice schema with embedded sub-schemas
│   ├── User.js                         # User account & RBAC schema
│   ├── AuditLog.js                     # System audit log schema
│   └── trained_invoice_model.json      # Serialized ML model weights & rules
│
├── extractors/                         # 📄 Format-Specific Extraction Engines
│   ├── pdfExtractor.js                 # PDF text extraction & regex parsing
│   ├── excelExtractor.js               # Excel (.xlsx/.xls) workbook parsing
│   ├── csvExtractor.js                 # Multi-delimiter CSV parsing
│   └── invoiceNormalizer.js            # Arithmetic audit & confidence scoring
│
├── public/                             # 🌐 Frontend Web Application (Robot Framework Hero UI)
│   ├── index.html                      # Single Page Application HTML
│   ├── style.css                       # Complete CSS layout & styling
│   └── app.js                          # Frontend SPA logic & DOM rendering
│
├── robot_framework/                    # 🤖 ROBOT FRAMEWORK RPA AUTOMATION SUITE
│   ├── tasks/                          # 🎯 Reusable Robot Framework Workflows
│   │   ├── process_document.robot      # Main RPA Orchestrator task (Ingestion, Classification, Routing)
│   │   ├── process_invoice.robot       # Dedicated Invoice Processing Robot Task
│   │   ├── process_dataset.robot       # Dedicated Dataset Processing Robot Task
│   │   └── validate_document.robot    # Dedicated Document Validation Robot Task
│   │
│   ├── resources/                      # 🧱 Reusable Robot Keywords & Modules
│   │   ├── common.resource             # Common variables & global keywords
│   │   ├── invoice.resource            # Invoice extraction & verification keywords
│   │   ├── dataset.resource            # Dataset quality & column keywords
│   │   ├── mongodb.resource            # Database persistence keywords
│   │   ├── logging.resource            # Automation log formatting keywords
│   │   └── invoice_keywords.resource   # Legacy keyword compatibility suite
│   │
│   ├── libraries/                      # 🐍 Custom Python Keyword Libraries
│   │   ├── DocumentLibrary.py          # File type detection & document classification
│   │   ├── InvoiceLibrary.py           # Invoice validation, confidence score & tier mapping
│   │   ├── DatasetLibrary.py           # Tabular dataset parsing & quality scoring
│   │   └── DatabaseLibrary.py          # PyMongo direct database driver & audit log trace
│   │
│   ├── api_tests.robot                 # Automated API test suite
│   ├── rpa_tasks.robot                 # RPA automation workflow suite
│   └── results/                        # Generated HTML execution logs & reports
│
├── run_robot.py                        # Python launcher for Robot Framework suites
├── create_test_pdf.py                  # Benchmark test PDF generator
├── test_extraction.js                  # Verification test for PDF extractor
├── test_spreadsheet_csv.js             # Verification test suite for Excel/CSV
└── multipage_pdf_payload.json          # Sample base64 API payload
```
│
├── big_demo_invoice_usd.pdf            # Benchmark PDF invoice (36 line items)
├── demo_invoice.xlsx                   # Benchmark Excel invoice (INR currency)
├── demo_invoice_xlsx_orbit_eur.xlsx    # Benchmark Excel invoice (EUR currency)
│
└── test_files/                         # Test CSV files
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

#### 📄 [`package.json`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/package.json)
**Purpose:** Node.js project manifest defining project metadata, scripts, and runtime dependencies.

| Field | Value | Description |
|-------|-------|-------------|
| `name` | `smart-invoice-automation-system` | Project package identifier |
| `version` | `1.0.0` | Current application version |
| `main` | `server.js` | Entry point script |

**NPM Scripts:**
| Script | Command | Purpose |
|--------|---------|---------|
| `npm start` | `node server.js` | Launches Express web server |
| `npm run train:model` | `node train_model.js` | Executes AI model training pipeline |
| `npm run rpa:robot` | `python run_robot.py rpa` | Runs Robot Framework RPA automation tasks |
| `npm run test:robot` | `python run_robot.py api` | Runs Robot Framework API test suite |

**Key Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `bcryptjs` | `^3.0.3` | Password hashing for user authentication |
| `cors` | `^2.8.6` | Cross-Origin Resource Sharing middleware |
| `express` | `^4.22.2` | Core web server framework |
| `mongoose` | `^9.9.2` | MongoDB ODM for schema modeling |
| `pdf-parse` | `^2.4.5` | Native PDF text extraction library |
| `xlsx` | `^0.18.5` | SheetJS spreadsheet parser for Excel & CSV |

---

#### 📄 [`.gitignore`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/.gitignore)
**Purpose:** Excludes temporary files, binary dependencies, logs, and sensitive environment configs from Git tracking (`node_modules/`, `.env`, Python bytecodes `*.pyc`, Robot Framework test logs).

---

#### 📄 [`README.md`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/README.md)
**Purpose:** High-level project documentation providing feature overviews, tech stack summary, installation instructions, default user credentials, API endpoints, and test execution commands.

---

### 4.2 Server & Backend ([`server.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/server.js))

**File:** [`server.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/server.js) | **Size:** 620 lines | 21.5 KB  
**Purpose:** The central backend application server. Handles MongoDB database connection, default database seeding, REST API routing, authentication verification, and document ingestion orchestration.

#### Key Functions & Endpoints:

1. **Database Connection & Automatic Seeding (`seedDatabase()`):**
   - Connects to MongoDB (`mongodb://127.0.0.1:27017/smart_invoice_db`).
   - If user collection is empty, seeds default accounts:
     - `admin@invoice.com` / `admin123` (`ADMIN`)
     - `manager@invoice.com` / `admin123` (`FINANCE_MANAGER`)
     - `user@invoice.com` / `user123` (`AP_CLERK`)
   - If invoice collection is empty, seeds benchmark invoice record from [`big_demo_invoice_usd.pdf`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/big_demo_invoice_usd.pdf).

2. **Ingestion Engine Orchestrator (`runProcessingEngine()`):**
   - Receives document payloads (`SINGLE_PDF`, `MULTIPLE_PDF`, `SINGLE_EXCEL`, `SINGLE_CSV`, `DATASET_CSV`).
   - Invokes [`documentExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/documentExtractor.js) to parse data and perform arithmetic audit validation.
   - Saves processed invoices to MongoDB and writes audit trail records to `AuditLog`.

3. **REST API Endpoint Specification:**

| Endpoint | Method | Role Access | Purpose |
|----------|--------|-------------|---------|
| `/api/auth/signup` | POST | Public | Register new user account |
| `/api/auth/login` | POST | Public | Authenticate user & return session |
| `/api/users` | GET | Admin | List all registered users with metrics |
| `/api/invoices` | GET | All Roles | Retrieve all invoice records |
| `/api/stats` | GET | All Roles | Fetch system statistics & database status |
| `/api/process` | POST | All Roles | Ingest document & run extraction pipeline |
| `/api/invoices/:id/download` | GET | All Roles | Download base64 source file |
| `/api/approve` | POST | Manager/Admin | Approve single invoice |
| `/api/approve-bulk` | POST | Manager/Admin | Bulk approve invoices with confidence ≥95% |
| `/api/reject` | POST | Manager/Admin | Reject invoice with custom reason |
| `/api/reset` | POST | Admin | Purge all invoices and reset state |
| `/api/train` | POST | Admin | Trigger AI model retraining |

---

### 4.3 Mongoose Data Models (`models/`)

---

#### 📄 [`models/User.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/User.js)
**Size:** 32 lines  
**Fields:** `name` (String), `email` (String, Unique), `password` (String, Bcrypt hashed), `role` (Enum: `AP_CLERK`, `FINANCE_MANAGER`, `ADMIN`), `createdAt` (Date).

---

#### 📄 [`models/Invoice.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/Invoice.js)
**Size:** 170 lines  
**Purpose:** Complete invoice schema featuring embedded sub-schemas:
- **Main Fields:** `id`, `invoiceNumber`, `inputType`, `filename`, `vendor`, `vendorEmail`, `date`, `dueDate`, `currency`, `poNumber`, `paymentTerms`, `subtotal`, `tax`, `shipping`, `total`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `FLAGGED`, `EXTRACTION_FAILED`), `confidenceScore`, `createdBy`, `fileDataUrl`.
- **Embedded Sub-Schemas:**
  - `lineItemSchema`: `lineNumber`, `description`, `quantity`, `unitPrice`, `discountPercent`, `amount`, `total`.
  - `extractionSchema`: `fileType`, `method`, `sheetName`, `rowCount`, `ocrUsed`, `pageCount`.
  - `validationSchema`: `subtotalMatch`, `taxMatch`, `totalMatch`, `status`, `errors[]`, `warnings[]`.
  - `fieldConfidenceSchema`: `vendor`, `invoiceNumber`, `date`, `dueDate`, `lineItems`, `totals`.

---

#### 📄 [`models/AuditLog.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/AuditLog.js)
**Size:** 17 lines  
**Fields:** `timestamp` (Date), `action` (String, e.g. `USER_LOGIN`, `INVOICE_APPROVED`, `RESET`), `details` (String), `userEmail` (String).

---

#### 📄 [`models/trained_invoice_model.json`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/trained_invoice_model.json)
**Size:** 206 lines | 4.2 KB  
**Purpose:** Serialized JSON model containing compiled vendor signatures, keyword frequency weights, optimized regex rules, and scoring weights loaded dynamically at server boot.

---

### 4.4 Document Extraction Pipeline

#### 📄 [`documentExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/documentExtractor.js)
**Size:** 138 lines  
**Purpose:** Routing facade. Inspects input payloads, determines MIME type and binary signatures (`detectFileType()`), delegates processing to format extractors, and passes output to [`invoiceNormalizer.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/invoiceNormalizer.js).

---

#### 📄 [`extractors/pdfExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/pdfExtractor.js)
**Size:** 422 lines | 14.3 KB  
**Purpose:** Multi-stage PDF extraction engine:
1. Native text parsing via `pdf-parse` with fallback object stream regex extraction.
2. Tabular line-item extraction supporting full and simplified table formats.
3. Metadata pattern extraction (vendor signatures, email regex, date formats, PO numbers, currency symbols).
4. Financial totals extraction (Subtotal, Tax, Shipping, Total Amount).

---

#### 📄 [`extractors/excelExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/excelExtractor.js)
**Size:** 528 lines | 18.4 KB  
**Purpose:** Excel spreadsheet parser utilizing SheetJS:
1. Keyword-density sheet relevance scoring to select the primary invoice sheet.
2. Label-mapping engine searching horizontal and vertical cell layouts for metadata.
3. Dynamic line-item grid scanning with percentage discount calculation.
4. Auto-detection of cell formatting, dates, and currency symbols.

---

#### 📄 [`extractors/csvExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/csvExtractor.js)
**Size:** 430 lines | 14.5 KB  
**Purpose:** RFC-compliant CSV parser:
1. Delimiter auto-detection testing `,`, `;`, `|`, and `\t`.
2. Quotes and escaped character handling for complex descriptions.
3. Header row detection and metadata key-value parsing.

---

#### 📄 [`extractors/invoiceNormalizer.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/invoiceNormalizer.js)
**Size:** 169 lines | 6.3 KB  
**Purpose:** Field normalization, arithmetic validation, and confidence score calculation:
- Verifies line item amounts and totals equality: `Subtotal + Tax + Shipping = Grand Total`.
- Calculates 0–100% confidence score based on field presence and validation integrity.
- Resolves invoice status (`PENDING`, `FLAGGED`, `EXTRACTION_FAILED`).

---

### 4.5 AI Model Training Engine

#### 📄 [`train_model.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/train_model.js)
**Size:** 193 lines | 5.6 KB  
**Purpose:** Compiles ML vendor signatures and regex rules from training corpus templates. Tokenizes text to derive token frequency weights and serializes parameters to `models/trained_invoice_model.json`.

---

### 4.6 Frontend Web Application (`public/`)

---

#### 📄 [`public/index.html`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/public/index.html)
**Size:** 824 lines | 37.2 KB  
**Purpose:** Single Page Application HTML markup. Contains authentication screen (login/signup overlay with demo credential fill buttons) and 3 role-based dashboards:
- **USER Dashboard**: Upload zones for PDF, Excel, and CSV with personal history table.
- **MANAGEMENT Dashboard**: Approval desk grid, bulk approval triggers, and vendor distribution charts.
- **ADMIN Dashboard**: User inspection panel, RPA engine log console, model trainer card, and raw MongoDB collection table.

---

#### 📄 [`public/app.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/public/app.js)
**Size:** 1,578 lines | 64.2 KB  
**Purpose:** Complete frontend application logic:
- User session state management (`initAuth`, `handleLoginSubmit`, `handleLogout`).
- Drag-and-drop file readers converting uploads to base64.
- API communication functions (`fetchInvoices`, `approveInvoice`, `rejectInvoice`, `executeBulkApproval`, `triggerModelTraining`).
- Dynamic DOM table rendering, modal views, and chart visualizations.

---

#### 📄 [`public/style.css`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/public/style.css)
**Size:** 2,836 lines | 51.0 KB  
**Purpose:** Modern layout styling featuring glassmorphism, CSS Grid, color-coded status badges, custom scrollbars, pipeline visual animations, and responsive breakpoints.

---

### 4.7 Robot Framework (RPA & Testing)

---

#### 📄 [`robot_framework/api_tests.robot`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/api_tests.robot)
**Size:** 62 lines  
**Purpose:** Automated API test suite testing server state, single PDF ingestion, batch ingestion, CSV processing, approval/rejection workflows, and system reset.

---

#### 📄 [`robot_framework/rpa_tasks.robot`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/rpa_tasks.robot)
**Size:** 56 lines  
**Purpose:** Automated RPA workflow executing multi-format document ingestion, confidence-tier classification (`HIGH`, `MEDIUM`, `LOW`), auto-approval of high-confidence items, and execution summary logging.

---

#### 📄 [`robot_framework/resources/invoice_keywords.resource`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/resources/invoice_keywords.resource)
**Size:** 92 lines  
**Purpose:** Reusable Robot Framework keywords wrapping REST API calls (`Fetch All Invoices`, `Approve Invoice By ID`, `Reject Invoice By ID`, `Reset Database State`).

---

#### 📄 [`robot_framework/libraries/InvoiceLibrary.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/libraries/InvoiceLibrary.py)
**Size:** 67 lines  
**Purpose:** Custom Python helper library for Robot Framework. Features arithmetic verification, mock payload generation, and confidence tier evaluation keywords.

---

#### 📄 [`run_robot.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/run_robot.py)
**Size:** 39 lines  
**Purpose:** Python launcher for running `rpa_tasks.robot` or `api_tests.robot` and outputting reports to `robot_framework/results/`.

---

### 4.8 Test Scripts & Data Files

- 📄 [`test_extraction.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/test_extraction.js) (127 lines) — Verifies PDF extraction accuracy against [`big_demo_invoice_usd.pdf`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/big_demo_invoice_usd.pdf) across 13 assertions.
- 📄 [`test_spreadsheet_csv.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/test_spreadsheet_csv.js) (234 lines) — Tests 7 spreadsheet and CSV ingestion test cases.
- 📄 [`create_test_pdf.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/create_test_pdf.py) (238 lines) — Generates the demo 2-page invoice PDF with 36 line items.
- 📁 `test_files/` — Directory containing test CSV datasets (`csv_metadata_items.csv`, `csv_semicolon.csv`, etc.).

---

## 5. System Workflow & Data Flow

```
1. INGESTION PHASE:
   User Upload (Browser) ──> Base64 Encoding (app.js) ──> POST /api/process (server.js)

2. EXTRACTION PHASE:
   server.js ──> documentExtractor.js ──> Format Extractor (PDF/Excel/CSV)

3. NORMALIZATION & AUDIT PHASE:
   Format Extractor ──> invoiceNormalizer.js ──> Arithmetic Check & Confidence Calculation

4. PERSISTENCE PHASE:
   Normalized Invoice ──> MongoDB Invoice.create() ──> AuditLog Entry Created

5. WORKFLOW APPROVAL PHASE:
   Finance Manager ──> POST /api/approve or /api/approve-bulk ──> Status = APPROVED
```

---

## 6. Role-Based Access Control (RBAC)

| Permission / Feature | AP Clerk (`AP_CLERK`) | Finance Manager (`FINANCE_MANAGER`) | System Admin (`ADMIN`) |
|----------------------|:---------------------:|:----------------------------------:|:----------------------:|
| Document Upload | ✅ | ❌ | ❌ |
| Personal Submission History | ✅ | ❌ | ❌ |
| Pending Invoices Review | ❌ | ✅ | ✅ |
| Approve Single Invoice | ❌ | ✅ | ✅ |
| Bulk Approve (≥95% Conf) | ❌ | ✅ | ✅ |
| Reject Invoice with Note | ❌ | ✅ | ✅ |
| User Inspection Grid | ❌ | ❌ | ✅ |
| Engine Diagnostics & Logs | ❌ | ❌ | ✅ |
| AI Model Retraining | ❌ | ❌ | ✅ |
| Database Reset / Purge | ❌ | ❌ | ✅ |

---

## 7. API Endpoints Reference

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/signup` | Public | Register new user account |
| POST | `/api/auth/login` | Public | Authenticate user credentials |
| GET | `/api/users` | Admin | Fetch user list with metrics |
| GET | `/api/invoices` | Any User | Fetch all invoice records |
| GET | `/api/stats` | Any User | Fetch dashboard metrics & DB status |
| POST | `/api/process` | Any User | Ingest & extract document |
| GET | `/api/invoices/:id/download` | Any User | Download original source file |
| POST | `/api/approve` | Manager / Admin | Approve single invoice |
| POST | `/api/approve-bulk` | Manager / Admin | Bulk approve high-confidence invoices |
| POST | `/api/reject` | Manager / Admin | Reject invoice with note |
| POST | `/api/reset` | Admin | Clear all invoices & audit logs |
| POST | `/api/train` | Admin | Retrain AI extraction model |

---

## 8. How to Run the Project

### Prerequisites:
- **Node.js** v18+
- **MongoDB** running locally on port `27017`
- **Python 3** (for Robot Framework testing)

### Step-by-Step Instructions:

```bash
# 1. Install dependencies
npm install

# 2. Train the AI model
npm run train:model

# 3. Start the server
npm start
# Server available at http://localhost:3000

# 4. Run automated extraction unit tests
node test_extraction.js
node test_spreadsheet_csv.js

# 5. Run Robot Framework RPA & API test suites
npm run rpa:robot
npm run test:robot
```

---

> **Document Version:** 2.0.0  
> **System Architecture:** Smart Invoice Automation Engine  
> **Total Files:** 30+ project files  
